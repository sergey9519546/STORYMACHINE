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
// contentHash, provenance — never a new claim invented for the letter, with
// one deliberate exception: opts.draftRank (2026-09-04) is caller-supplied
// display copy, not derived from the report, the same trust posture as
// opts.title/opts.author already had — see CoverageLetterOptions. The
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
// this module itself.
//
// ── THE CONTRACT THAT MAKES THAT TRUE, AND WHAT NOW ENFORCES IT ─────────────
// The output of this module is UNESCAPED text. A title of
// `Hamlet</p><script>alert(1)</script>` comes back verbatim as the letter's
// H1 (verified live, 2026-09-04 security review finding #4), which is
// harmless in a .md file the client only ever downloads — and live HTML/script
// injection the moment anything renders it through a Markdown pipeline with
// raw-HTML passthrough. In a collab room the person who plants that title is
// not the person who exports and shares the letter, so "the writer wrote it
// themselves" is not a defence.
//
// So the invariant is: NOTHING in src/ renders a coverage letter as HTML.
// That used to be a comment deferring the question to future consumers, with
// nothing checking it. tests/core/coverage-letter-no-renderer.test.ts now
// fails the build if a Markdown renderer or dangerouslySetInnerHTML appears in
// src/ while this module still emits unescaped text. If you are the change
// that introduces one: escape here (or route the letter through
// coverage-html.ts's escapeHtml) BEFORE landing it — do not relax that test.

import type {
  ScriptDoctorReport, CoverageVerdict, RootCauseFinding,
} from '../nvm/analyze/types.ts';
import type { RevisionIssue, PassName } from '../nvm/revision/passes/types.ts';
import { isWholeDraftAnalysisComplete } from './analysis-completeness.ts';
import { computeStructuralReliabilityNote } from './structural-reliability.ts';
// Shared percentile copy (2026-09-05 review follow-up) — this module was the
// LAST percentile-showing surface with its own hand-copy: a local ordinal()
// (used for the draftRank line) and a hardcoded "Nth percentile" for the
// healthPercentile line that always appended the literal suffix "th"
// (wrong for anything not ending in a "th" ordinal, e.g. "82th" instead of
// "82nd") — and, separately, that line had already dropped "synthetic" from
// "hand-authored ... reference set", the exact qualifier that keeps the
// percentile from reading as a comparison against real scripts (the same
// drift SnapshotManager.tsx's compact note was found to have, 2026-09-04
// review). Importing the shared ordinal()/REFERENCE_SET_SIZE/
// REFERENCE_SET_LABEL fixes both: one ordinal implementation everywhere, and
// the reference-set description worded identically to every other surface.
// Server files in this codebase already import directly from src/lib — see
// server/routes/export.ts's imports of fountain.ts/fdx.ts/docx.ts, and
// coverage-html.ts's/slate.ts's own percentile-copy.ts imports — so this is
// an established pattern, not a new one; it does not touch the scoring path
// (no import edge to/from doctor.ts either direction).
import { ordinal, REFERENCE_SET_SIZE, REFERENCE_SET_LABEL } from '../../src/lib/percentile-copy.ts';

export interface CoverageLetterOptions {
  title?: string;
  author?: string;
  /** 2026-09-04 — "rank among the writer's OWN saved drafts of this
   *  script" (src/lib/snapshot-trend.ts's computeDraftRank), a second,
   *  honest denominator rendered ADDITIVELY alongside the calibration
   *  reference-set percentile below — never a replacement for it. Computed
   *  client-side (the client holds the ScriptIDE editor's `snapshots`
   *  array; this module has no session and never sees them) and passed in
   *  the same way `title`/`author` are: display copy the caller attests to,
   *  not a value this module recomputes or verifies. Optional and additive
   *  — a call that omits it renders byte-identical output to before this
   *  field existed. */
  draftRank?: { rank: number; of: number };
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

/** Sentence-terminate without doubling: findings arrive both ways — some
 *  `description`s already end in a period, some do not, and the letter used
 *  to append one unconditionally ("...their own story's highest moment.."). */
function endWithPeriod(text: string): string {
  const trimmed = text.trim();
  if (trimmed === '') return trimmed;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function buildPriorities(topPriorities: Array<RevisionIssue & { pass: PassName }> | undefined): ListEntry[] {
  const list = topPriorities ?? [];
  if (list.length === 0) return [];
  const anchored = list.filter(i => ANCHORED_LOCATION_RE.test(i.location));
  const unanchored = list.filter(i => !ANCHORED_LOCATION_RE.test(i.location));
  const chosen = [...anchored, ...unanchored].slice(0, 3);

  return chosen.map(issue => {
    const fix = issue.suggestedFix ? ` Suggested fix: ${endWithPeriod(issue.suggestedFix)}` : '';
    return {
      heading: `${severityWord(issue.severity)} — ${issue.location}`,
      body: `${endWithPeriod(issue.description)}${fix}`,
    };
  });
}

function buildCaveats(report: ScriptDoctorReport, opts: CoverageLetterOptions): string[] {
  const caveats: string[] = [
    'This is a deterministic read: the engine scored this draft using rule-based analysis alone — '
    + 'no generative AI wrote or judged any part of it. Running the identical script text through the '
    + 'engine again reproduces the same score and verdict.',
  ];

  if (typeof report.healthPercentile === 'number') {
    caveats.push(
      `Health ranks in the ${ordinal(Math.round(report.healthPercentile))} percentile against a fixed, `
      + `${REFERENCE_SET_SIZE}-sample, ${REFERENCE_SET_LABEL} — not against other scripts you might send it, `
      + 'and not a market comparison.',
    );
  }

  // 2026-09-04 — a second, honest denominator alongside the reference-set
  // percentile above: rank among the WRITER'S OWN saved drafts of this
  // script (src/lib/snapshot-trend.ts's computeDraftRank). Purely additive:
  // a caller that omits opts.draftRank gets byte-identical output to before
  // this field existed.
  if (opts.draftRank) {
    const { rank, of } = opts.draftRank;
    caveats.push(
      of <= 1
        ? 'This is your first saved draft of this script — a rank among your own drafts will appear '
          + 'after your next save.'
        : `Among your own saved drafts of this script, this one ranks ${ordinal(rank)} of ${formatNumber(of)} `
          + 'by health — a comparison to your own history, not to the reference set above or to any '
          + 'other writer’s work.',
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

  // Additive, 2026-09-04. Gated on the field's PRESENCE so a report
  // serialized before the structural-signal block existed renders exactly the
  // letter it always did — report1.json/report2.json under
  // tests/fixtures/coverage-letter/ are such reports and stay byte-identical;
  // report3.json is a third fixture that carries the field, covering this
  // paragraph. Names the same two aggregates, in the same order, that
  // docs/scoring/STRUCTURAL_SIGNALS_2026-09-04.md §4 found ordering all three
  // separation sets it measured — the same pair ScriptDoctorPanel.tsx's
  // "Shape & Rhythm" section and the exported coverage HTML's strip surface.
  if (report.structuralSignals?.scored) {
    const { meanAbsDialogueShareDelta, actionSentenceCvOverall } = report.structuralSignals;
    caveats.push(
      'Shape and rhythm: the exported HTML report carries a new "Structural Signals" strip — scene '
      + 'length, talk-versus-action mix, speech turns, speaker pairings and action-prose variation, read '
      + 'from the shape of the document rather than from any word list. Two readings from it: the mean '
      + `scene-to-scene change in the dialogue/action word mix is ${meanAbsDialogueShareDelta.toFixed(2)}, `
      + `and the sentence-length variation across the draft's action lines is ${actionSentenceCvOverall.toFixed(2)}. `
      + 'Both are descriptive only — new and deliberately unwired: they are shown as diagnostics and no '
      + 'part of the score, grade, or verdict above is derived from them.',
    );
  }

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
    caveats: buildCaveats(report, opts),
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
