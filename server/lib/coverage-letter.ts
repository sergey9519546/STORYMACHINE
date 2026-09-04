// Deterministic coverage LETTER — the one-to-two-page connected-prose sibling
// of server/lib/coverage-html.ts's dashboard-style export (upgrade-writer-
// experience discovery #7). A studio coverage report reads like a reader's
// memo, not a table of counts: a logline-level summary, a reader's comments
// (root causes and the priorities that follow from them), and a
// recommendation — so this renders paragraphs and short lists, never a
// heatmap or a raw per-pass appendix.
//
// Pure function over an already-computed ScriptDoctorReport (server/nvm/
// analyze/types.ts): no I/O, no Date.now(), no randomness, so the same report
// renders byte-identical output every time (tested). Every sentence is
// assembled from fields the report already carries — verdict, plainSummary,
// rootCauses, topPriorities, strengths, healthPercentile, sceneCount,
// contentHash, provenance — never a new claim invented for the letter. The
// deterministic-analysis disclaimer is this module's own wording, but the
// >40-scene structural-reliability note is a CONSUMER of
// report.provenance.structuralReliabilityNote (server/lib/structural-
// reliability.ts, falling back to computing it locally only for a report
// that predates the field) — the same single source of truth coverage-
// html.ts's footer caveat already reads, so the two exports can never
// disagree on that wording. The footer also republishes provenance's
// engineCommit/rulebookCount, mirroring the exported coverage HTML's own
// verify block.
//
// SECURITY: report content (title, author, scene text, issue descriptions,
// the plain-language summary) is screenplay text supplied by whoever ran the
// doctor — untrusted input. This module emits Markdown and plain text, not
// HTML, so there is no injection surface the way coverage-html.ts has; no
// escaping is needed here because nothing is ever interpreted as markup by
// this module itself. (A route that re-embeds this output into an HTML page
// must go through coverage-html.ts's own escaping — none does today.)

import type {
  ScriptDoctorReport, CoverageVerdict, RootCauseFinding,
} from '../nvm/analyze/types.ts';
import type { RevisionIssue, PassName } from '../nvm/revision/passes/types.ts';
import { isWholeDraftAnalysisComplete } from './analysis-completeness.ts';
import { computeStructuralReliabilityNote } from './structural-reliability.ts';

export interface CoverageLetterOptions {
  title?: string;
  author?: string;
}

export interface CoverageLetterResult {
  markdown: string;
  text: string;
}

// ── Deterministic formatting (mirrors coverage-html.ts's own helpers — kept
//    duplicated rather than imported since coverage-html.ts doesn't export
//    them and this module must stay independently pure) ─────────────────────
function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    timeZone: 'UTC', timeZoneName: 'short',
  });
}

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function titleCase(word: string): string {
  return word.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// Same vocabulary as coverage-html.ts's VERDICT_STYLE labels — in particular
// the PASS "(decline)" parenthetical, which that module's own tests require
// on every producer-facing export so PASS is never misread as affirmative.
const VERDICT_LABEL: Record<CoverageVerdict, string> = {
  RECOMMEND: 'RECOMMEND',
  CONSIDER: 'CONSIDER',
  PASS: 'PASS (decline)',
};

// A finding/priority is "scene- or lines-anchored" when its location string
// names a specific scene or line range rather than reading as a whole-draft
// generality like "Overall structure". Matches "Scene 4", "Scenes 1-3",
// "Scene ~5", and "Lines 40-42".
const ANCHORED_LOCATION_RE = /\b(scenes?|lines?)\s*~?\d/i;

function severityWord(sev: RevisionIssue['severity']): string {
  return sev.toUpperCase();
}

function severityRank(sev: RevisionIssue['severity']): number {
  return sev === 'critical' ? 0 : sev === 'major' ? 1 : 2;
}

// ── Intermediate data model ───────────────────────────────────────────────────
// Built once from the report; both renderers (markdown/text) format the same
// values, so the two outputs can never disagree on a number or a fact.

interface ListEntry {
  heading: string;
  body: string;
}

interface LetterData {
  title: string;
  author: string | null;
  verdictLine: string;
  headline: string;
  summary: string;
  excerptNote: string | null;
  strengths: string[];
  rootCauses: ListEntry[];
  priorities: ListEntry[];
  caveats: string[];
  hashLine: string | null;
  verifyLine: string;
  provenanceLine: string | null;
  generatedLine: string;
}

function buildHeadline(report: ScriptDoctorReport): string {
  const grade = report.grade ? titleCase(report.grade) : 'Unknown';
  const parts = [
    `Health ${report.health.toFixed(1)}/100 (${grade})`,
    `${formatNumber(report.sceneCount)} scene${report.sceneCount === 1 ? '' : 's'}`,
    `${formatNumber(report.wordCount)} word${report.wordCount === 1 ? '' : 's'}`,
  ];
  if (report.pageEstimate) {
    parts.push(
      `~${formatNumber(report.pageEstimate.pages)} page${report.pageEstimate.pages === 1 ? '' : 's'} `
      + `/ ~${formatNumber(report.pageEstimate.runtimeMinutes)} min (est.)`,
    );
  }
  return parts.join(' · ');
}

function buildRootCauses(rootCauses: RootCauseFinding[] | undefined): ListEntry[] {
  if (!rootCauses || rootCauses.length === 0) return [];
  const top = [...rootCauses]
    .sort((a, b) => severityRank(a.severity) - severityRank(b.severity) || b.memberCount - a.memberCount)
    .slice(0, 3);

  return top.map(rc => {
    const scenes = rc.sceneIdxs.length > 0
      ? ` (Scene${rc.sceneIdxs.length === 1 ? '' : 's'} ${rc.sceneIdxs.map(i => i + 1).join(', ')})`
      : '';
    const subsumes = `Subsumes ${formatNumber(rc.memberCount)} issue${rc.memberCount === 1 ? '' : 's'}.`;
    return {
      heading: `${severityWord(rc.severity)} — ${rc.title}${scenes}`,
      body: `${rc.explanation} ${subsumes}`,
    };
  });
}

function buildPriorities(topPriorities: Array<RevisionIssue & { pass: PassName }> | undefined): ListEntry[] {
  const list = topPriorities ?? [];
  if (list.length === 0) return [];
  const anchored = list.filter(i => ANCHORED_LOCATION_RE.test(i.location));
  const unanchored = list.filter(i => !ANCHORED_LOCATION_RE.test(i.location));
  const chosen = [...anchored, ...unanchored].slice(0, 3);

  return chosen.map(issue => {
    const fix = issue.suggestedFix ? ` Suggested fix: ${issue.suggestedFix}` : '';
    return {
      heading: `${severityWord(issue.severity)} — ${issue.location}`,
      body: `${issue.description}.${fix}`,
    };
  });
}

function buildCaveats(report: ScriptDoctorReport): string[] {
  const caveats: string[] = [
    'This is a deterministic read: the engine scored this draft using rule-based analysis alone — '
    + 'no generative AI wrote or judged any part of it. Running the identical script text through the '
    + 'engine again reproduces the same score and verdict.',
  ];

  if (typeof report.healthPercentile === 'number') {
    caveats.push(
      `Health ranks in the ${Math.round(report.healthPercentile)}th percentile against a fixed, `
      + '20-sample, hand-authored reference set — not against other scripts you might send it, '
      + 'and not a market comparison.',
    );
  }

  // Same field coverage-html.ts's buildFooterSection reads (Category B
  // honesty caveat, 2026-07-28) — this module is now a CONSUMER of
  // report.provenance.structuralReliabilityNote, not an independent
  // recomputation of the same claim, so the two exports can never drift on
  // wording the way this caveat once had (see structural-reliability.ts's
  // header: both need to say EXACTLY the same thing). Falls back to
  // computing it locally only for a report that predates the provenance
  // field, matching coverage-html.ts's own fallback.
  const structuralNote = report.provenance?.structuralReliabilityNote
    ?? computeStructuralReliabilityNote(report.sceneCount);
  if (structuralNote) caveats.push(structuralNote);

  caveats.push(
    'It does not read for market fit, casting, or budget — those require a human reader’s '
    + 'judgment this engine has no basis for.',
  );

  return caveats;
}

function buildLetterData(report: ScriptDoctorReport, opts: CoverageLetterOptions): LetterData {
  if (!isWholeDraftAnalysisComplete(report)) {
    throw new Error('Coverage letter requires a complete whole-draft analysis.');
  }

  const title = opts.title?.trim() || 'Untitled';
  const author = opts.author?.trim() || null;
  const analyzedAt = typeof report.analyzedAt === 'number' ? report.analyzedAt : Date.now();

  const verdictLine = report.verdict ? VERDICT_LABEL[report.verdict] : 'N/A';
  const summary = report.plainSummary?.trim() || 'No summary is available for this report.';
  const excerptNote = report.excerptNote?.trim() || null;
  const strengths = report.strengths ?? [];

  const hashLine = report.contentHash
    ? `Script-text hash (SHA-256): ${report.contentHash}`
    : null;
  const verifyLine = report.contentHash
    ? 'To verify this letter, run the identical script text through Story Machine’s Script Doctor '
      + 'again (the app’s #verify page, or POST /api/export/verify) and confirm the health, verdict, '
      + 'and hash above all match.'
    : 'This report has no verification hash attached and cannot be independently re-verified.';

  // Same two provenance fields the exported coverage HTML's verify block
  // publishes (coverage-html.ts's buildFooterSection dl: "Engine commit" /
  // "Rulebook count") — absent (never a placeholder like "unknown") on a
  // report that predates ScriptDoctorReport.provenance, same posture as that
  // dl's own conditional render.
  const provenanceLine = report.provenance
    ? `Engine commit: ${report.provenance.engineCommit} · Rulebook: ${formatNumber(report.provenance.rulebookCount)} rule concepts.`
    : null;

  return {
    title,
    author,
    verdictLine,
    headline: buildHeadline(report),
    summary,
    excerptNote,
    strengths,
    rootCauses: buildRootCauses(report.rootCauses),
    priorities: buildPriorities(report.topPriorities),
    caveats: buildCaveats(report),
    hashLine,
    verifyLine,
    provenanceLine,
    generatedLine: `Generated ${formatDateTime(analyzedAt)}`,
  };
}

// ── Renderers ──────────────────────────────────────────────────────────────

function renderMarkdown(d: LetterData): string {
  const lines: string[] = [];
  lines.push(`# ${d.title}`);
  if (d.author) lines.push(`*Written by ${d.author}*`);
  lines.push('');
  lines.push(`**Verdict: ${d.verdictLine}**`);
  lines.push('');
  lines.push(d.headline);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(d.summary);
  if (d.excerptNote) {
    lines.push('');
    lines.push(`*${d.excerptNote}*`);
  }

  if (d.strengths.length > 0) {
    lines.push('');
    lines.push('## What’s Working');
    lines.push('');
    for (const s of d.strengths) lines.push(`- ${s}`);
  }

  if (d.rootCauses.length > 0) {
    lines.push('');
    lines.push('## Root Causes');
    lines.push('');
    d.rootCauses.forEach((rc, i) => {
      lines.push(`${i + 1}. **${rc.heading}** — ${rc.body}`);
    });
  }

  if (d.priorities.length > 0) {
    lines.push('');
    lines.push('## Priorities to Address First');
    lines.push('');
    d.priorities.forEach((p, i) => {
      lines.push(`${i + 1}. **${p.heading}** — ${p.body}`);
    });
  }

  lines.push('');
  lines.push('## How to Read This Report');
  lines.push('');
  for (const c of d.caveats) lines.push(c);

  lines.push('');
  lines.push('---');
  if (d.hashLine) lines.push(d.hashLine);
  lines.push(d.verifyLine);
  if (d.provenanceLine) lines.push(d.provenanceLine);
  lines.push(d.generatedLine);

  return lines.join('\n');
}

function renderText(d: LetterData): string {
  const lines: string[] = [];
  lines.push(d.title.toUpperCase());
  if (d.author) lines.push(`Written by ${d.author}`);
  lines.push('');
  lines.push(`VERDICT: ${d.verdictLine}`);
  lines.push(d.headline);
  lines.push('');
  lines.push('SUMMARY');
  lines.push('-------');
  lines.push(d.summary);
  if (d.excerptNote) {
    lines.push('');
    lines.push(d.excerptNote);
  }

  if (d.strengths.length > 0) {
    lines.push('');
    lines.push('WHAT’S WORKING');
    lines.push('----------------');
    for (const s of d.strengths) lines.push(`- ${s}`);
  }

  if (d.rootCauses.length > 0) {
    lines.push('');
    lines.push('ROOT CAUSES');
    lines.push('-----------');
    d.rootCauses.forEach((rc, i) => {
      lines.push(`${i + 1}. ${rc.heading} — ${rc.body}`);
    });
  }

  if (d.priorities.length > 0) {
    lines.push('');
    lines.push('PRIORITIES TO ADDRESS FIRST');
    lines.push('----------------------------');
    d.priorities.forEach((p, i) => {
      lines.push(`${i + 1}. ${p.heading} — ${p.body}`);
    });
  }

  lines.push('');
  lines.push('HOW TO READ THIS REPORT');
  lines.push('------------------------');
  for (const c of d.caveats) lines.push(c);

  lines.push('');
  lines.push('----------------------------------------');
  if (d.hashLine) lines.push(d.hashLine);
  lines.push(d.verifyLine);
  if (d.provenanceLine) lines.push(d.provenanceLine);
  lines.push(d.generatedLine);

  return lines.join('\n');
}

/**
 * Render a ScriptDoctorReport into a shareable, one-to-two-page coverage
 * LETTER — connected prose (logline-level summary, comments, recommendation)
 * rather than a dashboard of counts. Pure function: same report + same opts
 * -> byte-identical markdown and text every time. Every sentence traces to a
 * field already on the report; nothing here is computed independently of it.
 */
export function renderCoverageLetter(
  report: ScriptDoctorReport,
  opts: CoverageLetterOptions = {},
): CoverageLetterResult {
  const data = buildLetterData(report, opts);
  return {
    markdown: renderMarkdown(data),
    text: renderText(data),
  };
}
