// Shareable coverage-report export — the studio-coverage-style HTML document
// writers download from the Script Doctor, print to PDF, and hand to
// producers. Every exported report is effectively an advertisement for the
// tool, so this renders a complete, self-contained, print-quality page: no
// external requests, no JS required to view, screenplay-culture typography
// (monospace header/data, serif prose).
//
// Pure function over an already-computed ScriptDoctorReport (server/nvm/
// analyze/types.ts) — no I/O, no Date.now(), no randomness, so the same
// report renders byte-for-byte identical HTML every time. The caller (POST
// /api/export/coverage in server/routes/export.ts) is responsible for
// running the doctor and, since ScriptDoctorReport.contentHash isn't
// populated by runScriptDoctor yet, for attaching it before calling in here.
//
// SECURITY: report content (title, scene slugs, issue text, summaries) is
// screenplay text supplied by whoever ran the doctor — untrusted input, not
// developer-authored strings. Every single interpolation below goes through
// escapeHtml(); there is no raw-interpolation path anywhere in this file.

import type {
  ScriptDoctorReport, DimensionScore, SceneDiagnostics, CoverageVerdict, RootCauseFinding,
} from '../nvm/analyze/types.ts';
import type { RevisionIssue, PassName } from '../nvm/revision/passes/types.ts';
import { isWholeDraftAnalysisComplete } from './analysis-completeness.ts';
import { computeStructuralReliabilityNote } from './structural-reliability.ts';
import { isNamedRootCause } from '../nvm/analyze/cluster.ts';
// ONE selection of "the things to fix first" (2026-09-12, adversarial finding
// #8): this section used to call suppressContradictoryFindings itself, the
// producer tier called it and sliced to three, and the coverage letter's body
// applied an anchored-first re-sort with no suppression at all — so one letter
// printed two different lists under one heading and disagreed with the HTML
// exported from the same contentHash. See server/lib/priority-selection.ts.
import { orderedPriorities } from './priority-selection.ts';
// ONE root-cause wording (2026-09-11) — see server/lib/root-cause-pipeline.ts.
import { rootCauseStatements } from './root-cause-pipeline.ts';
// The producer tier (2026-09-11) — one printed page above the full report; see
// server/lib/reader-tier.ts.
import { buildReaderTier, renderReaderTierHtml } from './reader-tier.ts';
// ONE definition of the claims an exported artifact carries, shared with the
// coverage letter and with both verifiers — see server/lib/artifact-claims.ts.
import {
  claimRowsFor, UNKNOWN_VERDICT_WORD, VERDICT_WORD, VERIFY_SCOPE_SENTENCE,
  type ArtifactClaims,
} from './artifact-claims.ts';
// ONE priorities heading across the panel, this export, the letter and the tier.
import { prioritiesHeadingFor } from '../../src/lib/priorities-copy.ts';
// ONE title and caption for the checks-that-found-nothing section, shared with
// the coverage letter and the in-app panel — see server/lib/strengths-copy.ts.
import { STRENGTHS_SECTION_TITLE, STRENGTHS_SECTION_CAPTION } from './strengths-copy.ts';
// Shared percentile copy (2026-09-04 review — consolidates what used to be
// four independent hand-copies of ordinal()/percentileBand() across the
// panel, this file, SnapshotManager.tsx and SlatePanel.tsx into one
// implementation; see src/lib/percentile-copy.ts's own header). Server files
// in this codebase already import directly from src/lib — see
// server/routes/export.ts's imports of fountain.ts/fdx.ts/docx.ts — so this
// is an established pattern, not a new one; it does not touch the scoring
// path (no import edge to/from doctor.ts either direction).
import { percentileSentenceFor, exactRankTooltipFor } from '../../src/lib/percentile-copy.ts';
// Shared draft-rank copy (2026-09-05 migration — this file's buildDraftRankLine
// was added by the cross-surface-parity lane BEFORE src/lib/draft-rank-copy.ts
// existed (see that module's own header: the panel and the coverage LETTER
// drifted on this exact denominator noun, "your own saved drafts of this
// script" vs. "runs and saved drafts of this script") and was never migrated
// once the shared helpers landed, so this export quietly kept rendering the
// pre-fix wording while the panel and the letter moved on — a live
// cross-surface-parity regression between two lanes that landed the same day.
// Now calls the single draftRankSentence() implementation directly (2026-09-05
// follow-up, client-hunter B-12) rather than re-composing the granular
// helpers itself; see tests/core/percentile-copy-consistency.test.ts and
// tests/core/draft-rank-copy-consistency.test.ts for the cross-surface proof.
import { draftRankSentence, type DraftRankExportPayload } from '../../src/lib/draft-rank-copy.ts';
import { ACTION_PROSE_VARIATION_LABEL_LOWER, formatSignalValue } from '../../src/lib/structural-signals-copy.ts';

// ── Escaping ──────────────────────────────────────────────────────────────────
// The one and only path any user/screenplay-derived string takes into the
// document. Order matters: '&' must be replaced first or it would re-escape
// the entities produced by the later replacements.
function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Small deterministic formatters ───────────────────────────────────────────
// Fixed locale + explicit UTC timezone so the same analyzedAt timestamp
// renders identically regardless of the host machine's locale/TZ — required
// for this to stay a pure function (same input -> same output, always).
function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC',
  });
}

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

// ── Health/grade color bands ──────────────────────────────────────────────────
// Mirrors the 90/75/55/35 thresholds documented on ScriptDoctorReport.grade
// in types.ts (excellent/strong/solid/uneven/troubled). Duplicated as a tiny,
// self-contained lookup rather than importing gradeForHealth from doctor.ts —
// that module pulls in the full analyzer + all 14 revision passes, which
// this pure presentation layer has no business paying for just to bucket a
// 0-100 number into a color.
function healthBandColor(score: number): { fg: string; bg: string } {
  if (score >= 90) return { fg: '#14532d', bg: '#1a7f37' };
  if (score >= 75) return { fg: '#14532d', bg: '#2f855a' };
  if (score >= 55) return { fg: '#78350f', bg: '#b45309' };
  if (score >= 35) return { fg: '#7c2d12', bg: '#c2410c' };
  return { fg: '#7f1d1d', bg: '#b91c1c' };
}

// The COLOURS are this document's own; the LABEL is artifact-claims.ts's
// VERDICT_WORD (2026-09-12). It used to be a fourth hand-copy of the same three
// strings — including the load-bearing "PASS (decline)" parenthetical, without
// which "PASS" reads as approval to anyone outside coverage culture — and the
// verify CLI carried a fifth as an inverse. One map now, so a reworded verdict
// cannot leave the scraper reading a word no renderer emits.
const VERDICT_STYLE: Record<CoverageVerdict, { bg: string; border: string; text: string; label: string }> = {
  RECOMMEND: { bg: '#eafaf1', border: '#1a7f37', text: '#14532d', label: VERDICT_WORD.RECOMMEND },
  CONSIDER:  { bg: '#fffaf0', border: '#b45309', text: '#78350f', label: VERDICT_WORD.CONSIDER },
  PASS:      { bg: '#fef2f2', border: '#b91c1c', text: '#7f1d1d', label: VERDICT_WORD.PASS },
};
const UNKNOWN_VERDICT_STYLE = {
  bg: '#f1f5f9', border: '#64748b', text: '#334155', label: UNKNOWN_VERDICT_WORD,
};

function severityChip(sev: RevisionIssue['severity']): string {
  const label = sev.toUpperCase();
  return `<span class="chip chip-${sev}">${label}</span>`;
}

// ── Percentile / draft-rank copy (2026-09-04 honesty-matrix fix) ────────────
// ScriptDoctorPanel.tsx and this module render the SAME sentence because
// both call the SAME function — src/lib/percentile-copy.ts's
// healthPercentileSentence/exactRankTooltip (imported above), not two
// independent hand-copies. See that module's header for why four
// independent copies existed before this and why that was a defect, not a
// convenience.
//
// 2026-09-11 (producer-tier discovery #12): also gated on COMPARABILITY. The
// percentile read 100 for every real draft because the reference set is twenty
// samples of 9-10 scenes and 256-337 words, so a longer script ranks top for
// being longer. Outside those bounds this renders the not-comparable sentence
// instead of a band — and the exact-rank tooltip goes with it, because an exact
// ordinal against a set the draft cannot be compared to is the false precision
// twice over. The producer tier at the top of the same document applies the same
// gate through the same function, so the two cannot disagree.
function buildHealthPercentileLine(report: ScriptDoctorReport): string {
  if (typeof report.healthPercentile !== 'number') return '';
  const sentence = percentileSentenceFor(report.healthPercentile, report.sceneCount, report.wordCount);
  const tooltip = exactRankTooltipFor(report.healthPercentile, report.sceneCount, report.wordCount);
  return tooltip
    ? `<div class="health-percentile" title="${escapeHtml(tooltip)}">${sentence}</div>`
    : `<div class="health-percentile">${sentence}</div>`;
}

/** Draft-rank line — "rank among the writer's OWN saved drafts of this
 *  script" (src/lib/snapshot-trend.ts's computeDraftRank), the same second,
 *  honest denominator the coverage LETTER's opts.draftRank already renders
 *  (coverage-letter.ts's buildCaveats) and ScriptDoctorPanel.tsx's
 *  DraftRankLine already shows in-app. Computed CLIENT-SIDE and passed
 *  through CoverageHtmlOptions.draftRank exactly like that letter option —
 *  this module never recomputes or trusts it as a score claim, only as
 *  display copy the writer's own client attests to about their own saved
 *  history. Omitted entirely when opts carries no draftRank (older callers,
 *  or nothing yet to rank), same "purely additive" contract every other
 *  optional CoverageHtmlOptions field already follows.
 *
 *  2026-09-05 migration: this used to hand-write its own "your own saved
 *  drafts of this script" / "your next save" copy, which drifted from the
 *  panel and the letter once those two moved to the shared
 *  draft-rank-copy.ts helpers (that module's own header tells the drift
 *  story).
 *
 *  2026-09-05 follow-up (client-hunter B-12): now calls the single
 *  draftRankSentence(draftRank, 'union') implementation directly rather than
 *  re-composing ordinal()/draftRankDenominatorLabel()/
 *  draftRankNextOpportunityLabel()/unrankedDraftsNote() itself — the exact
 *  re-composition that had ALREADY drifted once between this file and the
 *  panel (this module's own denominator/next-opportunity history above),
 *  and that a second, independent re-composition (SnapshotManager.tsx's
 *  'saved'-scope badge) drifted again on the tied prefix and the unranked
 *  note. Byte-identical to ScriptDoctorPanel.tsx's DraftRankLine for every
 *  DraftRank state this schema can carry (ranked, tied, with an
 *  unranked-drafts note, or first-draft) — see
 *  tests/core/draft-rank-copy-consistency.test.ts. */
function buildDraftRankLine(draftRank: DraftRankExportPayload | undefined): string {
  if (!draftRank) return '';
  return `<div class="health-percentile">${draftRankSentence(draftRank, 'union')}</div>`;
}

// ── Section builders ──────────────────────────────────────────────────────────

/** The document's verdict stamp. Extracted from buildHeaderSection (2026-09-11)
 *  because the verdict MOVED: the producer tier states it, so printing it in the
 *  header too would put the same fact twice on the reader's first page. The
 *  stamp itself is unchanged — same VERDICT_STYLE colours, same PASS
 *  parenthetical, same markup — it is simply rendered where the tier asks for it
 *  (renderReaderTierHtml's `verdictStamp` argument) instead of in the header. */
function verdictStampHtml(verdict: CoverageVerdict | null): string {
  const style = verdict ? VERDICT_STYLE[verdict] : UNKNOWN_VERDICT_STYLE;
  return `<span class="stamp" style="background:${style.bg}; border-color:${style.border}; color:${style.text};">${escapeHtml(style.label)}</span>`;
}

/** IDENTIFICATION ONLY (2026-09-11, producer-tier discovery #11).
 *
 *  This header used to carry the logline, the scene/word/page length line AND
 *  the verdict stamp. All three are findings, and all three are what the producer
 *  tier immediately below it exists to state — so the reader's first page said
 *  each of them twice, centimetres apart. The header now answers only "what
 *  document is this": masthead, title, byline, date, and the excerpt note that
 *  qualifies what the document covers.
 *
 *  Nothing was deleted. The logline, the length line and the stamp all render in
 *  the tier (server/lib/reader-tier.ts), the stamp through this file's own
 *  verdictStampHtml so its markup has one implementation. */
function buildHeaderSection(
  report: ScriptDoctorReport, safeTitle: string, safeAuthor: string | null,
): string {
  const analyzedAt = typeof report.analyzedAt === 'number' ? report.analyzedAt : Date.now();
  const byline = safeAuthor ? `<div class="byline">Written by ${safeAuthor}</div>` : '';

  return `
  <header class="report-header">
    <div class="header-main">
      <div class="masthead">SCRIPT COVERAGE &mdash; STORYMACHINE</div>
      <h1 class="title">${safeTitle}</h1>
      ${byline}
      <div class="meta-line">
        ${formatDate(analyzedAt)}
      </div>${report.excerptNote ? `
      <div class="meta-line" style="font-style:italic;">${escapeHtml(report.excerptNote)}</div>` : ''}
    </div>
  </header>`;
}

/** `percentileLine`/`draftRankLine` are already-built (possibly empty)
 *  strings — see buildHealthPercentileLine/buildDraftRankLine — passed in
 *  rather than recomputed here so renderCoverageHtml's `needsHealthTextBlock`
 *  decision (which also gates the CSS block, in <style>) can never drift
 *  from what this function actually renders: ONE boolean, computed once,
 *  drives both the markup and the styles. */
function buildHealthSection(report: ScriptDoctorReport, percentileLine: string, draftRankLine: string): string {
  const band = healthBandColor(report.health);
  const gradeLabel = report.grade ? titleCase(report.grade) : 'Unknown';
  const summary = report.plainSummary
    ? escapeHtml(report.plainSummary)
    : 'No summary is available for this report.';

  // Byte-identity fix (2026-09-04 review): a report/opts pair that carries
  // NEITHER field must render EXACTLY what this section rendered before
  // percentile/draftRank existed — no wrapper div, no extra blank
  // interpolation lines. The `health-text-block` wrapper (needed so the two
  // new lines sit under `.plain-summary` instead of becoming siblings of
  // `.health-score-block` in the flex row) is therefore emitted ONLY when at
  // least one of the two lines actually has content — never unconditionally.
  // tests/core/coverage-html.test.ts pins this against a committed fixture
  // string captured from the pre-this-change renderer, so a probe that
  // injects markup into this section (as the review's REVIEWER-PROBE did)
  // fails that comparison instead of passing silently.
  const textBlock = (percentileLine || draftRankLine)
    ? `<div class="health-text-block">
      <p class="plain-summary">${summary}</p>
      ${percentileLine}
      ${draftRankLine}
    </div>`
    : `<p class="plain-summary">${summary}</p>`;

  return `
  <section class="section health-section">
    <div class="health-score-block">
      <div class="health-number" style="color:${band.bg};">${report.health.toFixed(1)}</div>
      <div class="health-outof">/ 100</div>
      <div class="health-grade" style="background:${band.bg}; color:#fff;">${escapeHtml(gradeLabel)}</div>
    </div>
    ${textBlock}
  </section>`;
}

function buildDimensionsSection(dimensions: DimensionScore[]): string {
  if (dimensions.length === 0) {
    return `
  <section class="section">
    <h2>Craft Dimensions</h2>
    <p class="empty-note">Dimension scoring is not available for this report.</p>
  </section>`;
  }

  const rows = dimensions.map(dim => {
    const band = healthBandColor(dim.score);
    const width = Math.max(0, Math.min(100, dim.score));
    // D5 (docs/p1-benchmark/DETECTOR_DEFECTS_2026-08-03.md) false-precision
    // fix: a 0-100 score built from 2-4 passes' worth of issues is not the
    // same evidentiary claim as the headline health (all 14 passes). Name
    // the basis so the number reads as scoped rather than absolute — no
    // score changes, this only adds the already-computed issueCount/passes
    // fields (types.ts's DimensionScore) that were previously silent.
    const passList = dim.passes.map(titleCase).join(', ');
    const basis = `Based on ${formatNumber(dim.issueCount)} issue${dim.issueCount === 1 ? '' : 's'} `
      + `across ${dim.passes.length} pass${dim.passes.length === 1 ? '' : 'es'} (${escapeHtml(passList)}).`;
    return `
    <div class="dim-row">
      <div class="dim-label">${escapeHtml(dim.label)}</div>
      <div class="dim-bar-track">
        <div class="dim-bar-fill" style="width:${width}%; background:${band.bg};"></div>
      </div>
      <div class="dim-score">${Math.round(dim.score)}/100</div>
      <div class="dim-summary">${escapeHtml(dim.summary)}</div>
      <div class="dim-basis">${basis}</div>
    </div>`;
  }).join('\n');

  return `
  <section class="section">
    <h2>Craft Dimensions</h2>
    <div class="dim-list">
      ${rows}
    </div>
  </section>`;
}

// 2026-09-11 (producer-tier discovery #8, the half it is safe to fix on main).
//
// THE DEFECT: the overall score and the five dimension scores contradict each
// other in the same paragraph — a draft can read "overall score 84/100" with a
// dimension at 0/100 — and directly underneath, a section headed "What's
// Working" listed earned strengths, which a reader takes as the report
// ARGUING that the draft is working. It is not: doctor.ts's buildStrengths emits
// one entry per CHECK THAT DID NOT FIRE. "No scene runs over its length budget"
// is the absence of a finding, not praise.
//
// The contradiction itself lives in buildPlainSummary/buildStrengths, both in
// server/nvm/analyze/doctor.ts — the SCORING PATH, which this lane stops at by
// instruction (the fix is on scoring/feature-length-defects, commit efc1899d,
// and needs the owner's measurement). plainSummary is therefore interpolated
// here exactly as before, byte for byte.
//
// What IS fixed on main is the framing: the section is titled what the list
// actually is, and carries a one-line caption saying so. The caption sits BELOW
// the decline line (the verdict sentence that opens plainSummary, rendered in
// buildHealthSection above this section), so every byte above it is unchanged.
// Every entry is kept.
function buildStrengthsSection(strengths: string[]): string {
  // Guard: strengths are earned, never padded (doctor.ts's contract) — an
  // empty array means nothing was genuinely earned, so the whole section is
  // omitted rather than rendered with a hollow "no strengths found" filler.
  if (strengths.length === 0) return '';

  const items = strengths.map(s => `<li>${escapeHtml(s)}</li>`).join('\n');
  return `
  <section class="section">
    <h2>${escapeHtml(STRENGTHS_SECTION_TITLE)}</h2>
    <p class="dim-basis" style="margin:0 0 12px;">${STRENGTHS_SECTION_CAPTION}</p>
    <ul class="checklist">
      ${items}
    </ul>
  </section>`;
}

// a11y fix (2026-09-05, client-hunter B-15): the major-severity cell's white
// scene-number text measured 3.19:1 on #d97706 — under the 4.5:1 AA text
// minimum (the cell's own font-size is 11px, not the large-text exception).
// #b45309 is the same amber semantic this file already uses for CONSIDER
// (VERDICT_STYLE) and the "solid" health band (healthBandColor) — reusing it
// here keeps one amber across the document instead of adding a second, and
// white-on-it measures 5.02:1.
function heatmapCellColor(cell: SceneDiagnostics): { bg: string; fg: string } {
  if (cell.critical > 0) return { bg: '#b91c1c', fg: '#fff' };
  if (cell.major > 0) return { bg: '#b45309', fg: '#fff' };
  if (cell.minor > 0) return { bg: '#fde68a', fg: '#78350f' };
  return { bg: '#1a7f37', fg: '#fff' };
}

function buildHeatmapSection(heatmap: SceneDiagnostics[]): string {
  if (heatmap.length === 0) {
    return `
  <section class="section">
    <h2>Scene Heatmap</h2>
    <p class="empty-note">No scenes were analyzed for this report.</p>
  </section>`;
  }

  const cells = heatmap.map(cell => {
    const color = heatmapCellColor(cell);
    const tooltip = escapeHtml(
      `${cell.slug} — ${cell.issueCount} issue${cell.issueCount === 1 ? '' : 's'}`,
    );
    return `<div class="heat-cell" style="background:${color.bg}; color:${color.fg};" title="${tooltip}">${cell.sceneIdx + 1}</div>`;
  }).join('\n');

  return `
  <section class="section heatmap-section">
    <h2>Scene Heatmap</h2>
    <div class="heat-row">
      ${cells}
    </div>
  </section>`;
}

function buildTopPrioritiesSection(topPrioritiesIn: Array<RevisionIssue & { pass: PassName }>): string {
  // Audit item 10 (.../scratchpad/advice-quality-audit.md, R8): a reader
  // should never see two top-ten findings that cannot both be true about the
  // same script. Filtered here, at the render boundary, so every caller of
  // renderCoverageHtml (the live /coverage export, the PDF route, the P0
  // sample report generator) gets the suppression regardless of whether the
  // route that built this report already applied it — see
  // prioritize.ts's suppressContradictoryFindings for the table and the
  // reasoning behind each kept/dropped rule.
  //
  // 2026-09-12: through server/lib/priority-selection.ts, which is also what the
  // producer tier slices its leading three from and what the coverage letter's
  // body now renders in full — one list, four surfaces.
  const topPriorities = orderedPriorities(topPrioritiesIn);
  // 2026-09-11: the heading comes from the ONE shared implementation
  // (src/lib/priorities-copy.ts's prioritiesHeadingFor) that the coverage
  // letter, the in-app panel and the producer tier also use. "Top Priorities"
  // was plural no matter how many items followed, so a draft with exactly one —
  // which the 1-scene inert draft in this repository has — promised a list and
  // delivered a line.
  if (topPriorities.length === 0) {
    return `
  <section class="section">
    <h2>${escapeHtml(prioritiesHeadingFor(0))}</h2>
    <p class="empty-note">Nothing urgent surfaced &mdash; there is no priority fix to flag right now.</p>
  </section>`;
  }

  const items = topPriorities.map(issue => {
    const fix = issue.suggestedFix
      ? `<div class="issue-fix"><strong>Suggested fix:</strong> ${escapeHtml(issue.suggestedFix)}</div>`
      : '';
    return `
    <li class="priority-item">
      <div class="priority-head">
        ${severityChip(issue.severity)}
        <span class="issue-location">${escapeHtml(issue.location)}</span>
        <span class="issue-pass">${escapeHtml(titleCase(issue.pass))}</span>
      </div>
      <div class="issue-description">${escapeHtml(issue.description)}</div>
      ${fix}
    </li>`;
  }).join('\n');

  return `
  <section class="section">
    <h2>${escapeHtml(prioritiesHeadingFor(topPriorities.length))}</h2>
    <ol class="priority-list">
      ${items}
    </ol>
  </section>`;
}

// Pilot session 2026-08-07 finding #3 (PILOT_SESSION_REPORT.md §0.3, §6, §9.3):
// the API report (POST /api/scriptide/doctor) carries a root-causes synthesis
// that collapses the raw issue list into named underlying problems — exactly
// the "bounded deduction, not issue-count density" collapsing CLAUDE.md's
// standing task calls for — but the exported coverage.html previously jumped
// straight from Top Priorities to the raw 181-item Full Pass Appendix, so the
// most reader-friendly layer of the system was computed and never shown to
// the person receiving the static report (one of the two documented P0
// exposure modes).
//
// 2026-09-04 (advice-quality audit item 1): that single section is now TWO.
// The audit found the hand-written, evidence-backed NAMED templates/families
// in cluster.ts ("The middle has no engine — Two independent checks agree
// that Scene 6 is the story's dead center… That's not two problems, it's one
// missing pivot") are the best writing in the product and the one layer
// measured to actually discriminate a deliberately excellent script from a
// deliberately bad one — yet they rendered BELOW Top Priorities, sorted below
// generic 13-15-member auto-titled clusters of the same severity (fixed
// separately in cluster.ts's comparator; see isNamedRootCause there). Named
// findings are split out and rendered ABOVE Top Priorities, under the "Root
// Causes" heading the pilot session's fix originally gave the combined list;
// the generic auto-titled clusters are NOT deleted — see
// buildClusterFindingsSection below — they stay, ranked below, in the
// original Top-Priorities-then-appendix position.
// 2026-09-11 (producer-tier discovery defect #2): both reader-facing facts on
// this line — how many issues/rules the cluster stands for, and which scenes it
// is in — now come from server/lib/root-cause-pipeline.ts's
// rootCauseStatements(), the same statements the in-app panel renders.
//
// What changed and why:
//   * the count used to be a local `Subsumes N issue(s)` while the panel said
//     `15 issues from 12 rules` (src/lib/finding-jump.ts's
//     rootCauseCountSentence, registered in docs/CLAIMS_REGISTER.md) — one
//     cluster, two sentences, and only one of them mentioned the rule count the
//     `rules:` list immediately after it enumerates. The shared sentence is now
//     the object of this document's own verb ("Subsumes ..."), so where the two
//     counts agree the bytes are unchanged and where they differ the export
//     stops hiding it.
//   * the scene list used to be `rc.sceneIdxs.map(i => 'Scene ' + (i+1))` — one
//     entry per scene, which on the feature fixture rendered a 1,231-character
//     run of "Scene N, " for a single finding. formatSceneList
//     (server/lib/scene-ranges.ts) collapses contiguous stretches and leaves
//     scattered sets explicit: 1,231 characters -> 28, nothing dropped.
// The empty-scene case still drops this document's own em-dash separator rather
// than rendering a hollow phrase — see formatSceneList's contract.
function rootCauseListItems(rootCauses: RootCauseFinding[]): string {
  return rootCauseStatements(rootCauses).map(st => {
    const memberLine = `Subsumes ${st.countSentence}`
      + (st.sceneList ? ` &mdash; ${escapeHtml(st.sceneList)}` : '')
      + (st.memberRules.length > 0 ? ` &mdash; rules: ${escapeHtml(st.memberRules.join(', '))}` : '');
    return `
    <li class="priority-item">
      <div class="priority-head">
        ${severityChip(st.severity)}
        <span class="issue-location">${escapeHtml(st.title)}</span>
      </div>
      <div class="issue-description">${escapeHtml(st.explanation)}</div>
      <div class="issue-fix">${memberLine}</div>
    </li>`;
  }).join('\n');
}

/** The hand-written, evidence-backed named diagnoses only (isNamedRootCause)
 *  — rendered ABOVE Top Priorities, since these are the findings the audit
 *  showed a writer should read first. Omitted entirely (not a hollow
 *  section, matching buildStrengthsSection's convention) whenever
 *  clustering produced no named finding for this report — most reports,
 *  since named templates require a specific, audited rule co-occurrence. */
function buildNamedRootCausesSection(rootCauses: RootCauseFinding[] | undefined): string {
  if (!rootCauses) return '';
  const named = rootCauses.filter(isNamedRootCause);
  if (named.length === 0) return '';

  return `
  <section class="section">
    <h2>Root Causes</h2>
    <p class="dim-basis" style="margin:0 0 12px;">The ${formatNumber(named.length)} finding${named.length === 1 ? '' : 's'} below name the specific underlying craft problem behind several issues at once &mdash; read these first.</p>
    <ol class="priority-list">
      ${rootCauseListItems(named)}
    </ol>
  </section>`;
}

/** The generic, auto-titled convergence clusters ("Recurring X trouble in
 *  Scene N" / "Widespread X concerns") — kept (never deleted, per the audit's
 *  explicit instruction), but ranked below Top Priorities, in the position
 *  the combined Root Causes section held before this split. */
function buildClusterFindingsSection(rootCauses: RootCauseFinding[] | undefined): string {
  // Guard: only render when the report actually carries a synthesis — an
  // absent rootCauses means the caller never attached one (this field is
  // optional on ScriptDoctorReport), not that clustering ran and found nothing
  // to group.
  //
  // CORRECTED 2026-09-11: this used to say "only the /doctor, /doctor/deep, and
  // /doctor/pdf routes attach it today", which stopped being true the day the
  // coverage export and the coverage letter started attaching it — and which was
  // the same blind spot that let those two routes attach it with the scene-span
  // argument missing for as long as they did. All eight call sites now go through
  // server/lib/root-cause-pipeline.ts; see its header for the list.
  if (!rootCauses) return '';
  const generic = rootCauses.filter(rc => !isNamedRootCause(rc));
  if (generic.length === 0) return '';

  return `
  <section class="section">
    <h2>Recurring Issue Clusters</h2>
    <p class="dim-basis" style="margin:0 0 12px;">The ${formatNumber(generic.length)} finding${generic.length === 1 ? '' : 's'} below cluster the detailed issue list by where they land in the script &mdash; read after Top Priorities, alongside the full appendix.</p>
    <ol class="priority-list">
      ${rootCauseListItems(generic)}
    </ol>
  </section>`;
}

function buildAppendixSection(passes: ScriptDoctorReport['passes']): string {
  // Degenerate case (e.g. a zero-scene submission): no passes ran at all,
  // which is a different fact from "14 passes ran and found nothing" — say
  // so precisely rather than reusing the clean-report message.
  if (passes.length === 0) {
    return `
  <section class="section">
    <h2>Full Pass Appendix</h2>
    <p class="empty-note">No revision passes were run for this report.</p>
  </section>`;
  }

  const withIssues = passes.filter(p => p.issues.length > 0);
  if (withIssues.length === 0) {
    return `
  <section class="section">
    <h2>Full Pass Appendix</h2>
    <p class="empty-note">No issues surfaced in any of the ${passes.length} revision passes.</p>
  </section>`;
  }

  const passBlocks = withIssues.map(pass => {
    const issueItems = pass.issues.map(issue => {
      const fix = issue.suggestedFix
        ? `<div class="issue-fix"><strong>Suggested fix:</strong> ${escapeHtml(issue.suggestedFix)}</div>`
        : '';
      return `
      <li class="appendix-item">
        <div class="priority-head">
          ${severityChip(issue.severity)}
          <span class="issue-location">${escapeHtml(issue.location)}</span>
        </div>
        <div class="issue-description">${escapeHtml(issue.description)}</div>
        ${fix}
      </li>`;
    }).join('\n');

    return `
    <div class="pass-block">
      <h3>${escapeHtml(titleCase(pass.pass))} &mdash; ${pass.issues.length} issue${pass.issues.length === 1 ? '' : 's'}</h3>
      <ul class="appendix-list">
        ${issueItems}
      </ul>
    </div>`;
  }).join('\n');

  return `
  <section class="section">
    <h2>Full Pass Appendix</h2>
    ${passBlocks}
  </section>`;
}

function buildFooterSection(report: ScriptDoctorReport, claims: ArtifactClaims): string {
  const analyzedAt = typeof report.analyzedAt === 'number' ? report.analyzedAt : Date.now();
  const hashLine = report.contentHash
    ? `<div class="footer-hash">Script-text hash (SHA-256, first 12 characters): <code>${escapeHtml(report.contentHash.slice(0, 12))}</code></div>`
    : '';

  // EVERY CLAIM ON THE PAGE, FROM THE OBJECT THE PAGE WAS RENDERED FROM
  // (2026-09-12, BUG-1). The rows below used to be six hand-written `<div><dt>`
  // literals reading straight off `report`, while the producer tier above stated a
  // scene count, a word count, a page/minute estimate, per-finding page
  // references and a priorities count that appeared in no row at all — so a hand
  // edit to any of those printed VERIFIED at exit 0. They now come from
  // server/lib/artifact-claims.ts's ONE label table, fed by `tier.claims`, read
  // back by the same table in scripts/verify-report.mjs and
  // POST /api/export/verify.
  //
  // P3 "verify this report" block: the footer hash is the anchor fact, but a
  // 12-char prefix can't anchor anything — collision resistance lives in the
  // full 64-hex digest. This block publishes the FULL hash alongside the
  // headline claims (health / verdict / totalIssues) so anyone holding the
  // original script text can re-attest every number in this document against
  // POST /api/export/verify on any Story Machine instance (route:
  // server/routes/export.ts; the engine is deterministic and LLM-free, so a
  // re-run on the same text always reproduces the same report). The in-app
  // verifier lives at the app's #verify hash route.
  const verifyBlock = report.contentHash
    ? `<div class="verify-block">
      <div class="verify-heading">Verify this report</div>
      <div class="verify-body">
        This report is reproducible. Anyone with the original script text can confirm
        it was produced by the engine &mdash; not hand-edited &mdash; by re-running the
        deterministic analysis:
      </div>
      <ol class="verify-steps">
        <li><strong>On your own machine</strong> (the script never leaves your computer): <code>npm run verify-report -- report.html script.fountain</code>.</li>
        <li><strong>Or, hosted:</strong> open any Story Machine instance and go to <code>#verify</code> (the &ldquo;Verify a report&rdquo; link on the start screen), or POST the script text to <code>/api/export/verify</code> &mdash; paste the original script text and the values below.</li>
        <li>Either way, the tool recomputes the hash and re-runs the analysis; every value must match.</li>
      </ol>
      <dl class="verify-claims">
${claimRowsFor(claims).map(row =>
      `        <div><dt>${escapeHtml(row.label)}</dt><dd><code>${escapeHtml(row.value)}</code></dd></div>`).join('\n')}
      </dl>
      <div class="verify-scope">${escapeHtml(VERIFY_SCOPE_SENTENCE)}</div>
    </div>`
    : '';

  // Category B honesty caveat (2026-07-28), now a CONSUMER of the same field
  // doctor.ts's aggregation populates on ScriptDoctorReport.provenance
  // (server/lib/structural-reliability.ts is the single source of truth for
  // both — see that file's header). Falls back to computing it locally only
  // for a report that predates the provenance field (an older cached/
  // reconstructed report shape reaching this pure function directly) so this
  // stays correct for ANY ScriptDoctorReport, not just ones a live doctor run
  // just produced.
  const structuralNote = report.provenance?.structuralReliabilityNote
    ?? computeStructuralReliabilityNote(report.sceneCount);
  const structuralCaveat = structuralNote
    ? `<div class="footer-caveat">${structuralNote}</div>`
    : '';

  return `
  <footer class="report-footer">
    <div class="footer-disclaimer">
      Deterministic analysis &mdash; no generative AI read or scored this script.
      Running this engine again on the same script text reproduces the same score and verdict.
    </div>
    ${structuralCaveat}
    ${hashLine}
    ${verifyBlock}
    <div class="footer-generated">Generated ${formatDateTime(analyzedAt)}</div>
  </footer>`;
}

// ── Document shell ────────────────────────────────────────────────────────────

const STYLES = `
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      background: #f4f2ec;
      color: #1a1a1a;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 14px;
      line-height: 1.55;
    }
    .page {
      max-width: 850px;
      margin: 0 auto;
      padding: 40px 48px 56px;
      background: #fffdf9;
    }
    .mono {
      font-family: 'Courier New', Courier, monospace;
    }
    /* ── Header ── */
    .report-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 24px;
      border-bottom: 3px double #1a1a1a;
      padding-bottom: 18px;
      margin-bottom: 28px;
    }
    /* The header's single remaining cell. It was one of two (the other held the
       verdict stamp, which moved into the producer tier on 2026-09-11) and had
       no rule of its own because the flex parent positioned it. It gets one now
       so the header's one child fills the row instead of leaving the old
       space-between gap on the right, and so no class in this document is
       rendered without a rule — see the "no dead class selectors" case in
       tests/core/coverage-html.test.ts, which checks both directions. */
    .header-main { flex: 1 1 auto; min-width: 0; }
    .masthead {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      letter-spacing: 0.12em;
      color: #52525b;
      margin-bottom: 6px;
    }
    .title {
      font-family: 'Courier New', Courier, monospace;
      font-size: 26px;
      font-weight: 700;
      margin: 0 0 8px;
      word-break: break-word;
    }
    .byline {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12.5px;
      color: #52525b;
      margin: 0 0 6px;
    }
    .meta-line {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12.5px;
      color: #3f3f46;
    }
    .logline-line {
      font-size: 14px;
      font-style: italic;
      color: #27272a;
      margin-top: 8px;
    }
    /* The .stamp-wrap rule lived here until 2026-09-11. It was the header's
       right-hand flex cell for the verdict stamp; the stamp moved into the
       producer tier (see verdictStampHtml / reader-tier.ts) and the header no
       longer emits the wrapper, so the rule had no element to style. Removed
       rather than left behind, with proof: the "no dead class selectors" case in
       tests/core/coverage-html.test.ts asserts that stamp-wrap appears in
       NEITHER the stylesheet nor any rendered report, and that every other
       header and tier class appears in BOTH. */
    .stamp {
      font-family: 'Courier New', Courier, monospace;
      font-weight: 700;
      font-size: 15px;
      letter-spacing: 0.08em;
      border: 3px solid;
      border-radius: 6px;
      padding: 10px 16px;
      transform: rotate(-7deg);
      white-space: nowrap;
      box-shadow: 0 1px 0 rgba(0,0,0,0.05);
    }
    /* ── Sections ── */
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .section h2 {
      font-family: 'Courier New', Courier, monospace;
      font-size: 14px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #1a1a1a;
      border-bottom: 1px solid #d4d4d8;
      padding-bottom: 6px;
      margin: 0 0 14px;
    }
    .empty-note {
      color: #71717a;
      font-style: italic;
      margin: 0;
    }
    /* ── Health ── */
    .health-section {
      display: flex;
      align-items: center;
      gap: 24px;
      background: #faf9f5;
      border: 1px solid #e4e2d8;
      border-radius: 8px;
      padding: 20px 24px;
    }
    .health-score-block {
      flex: 0 0 auto;
      text-align: center;
      min-width: 120px;
    }
    .health-number {
      font-family: 'Courier New', Courier, monospace;
      font-size: 48px;
      font-weight: 700;
      line-height: 1;
    }
    .health-outof {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      color: #71717a;
      margin-bottom: 8px;
    }
    .health-grade {
      display: inline-block;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 3px 10px;
      border-radius: 999px;
    }
    .plain-summary {
      margin: 0;
      font-size: 15px;
    }
    /* ── Dimensions ── */
    .dim-list { display: flex; flex-direction: column; gap: 14px; }
    .dim-row {
      display: grid;
      grid-template-columns: 150px 1fr 70px;
      grid-template-areas: "label bar score" "summary summary summary" "basis basis basis";
      row-gap: 4px;
      column-gap: 12px;
      align-items: center;
    }
    .dim-label { grid-area: label; font-weight: 700; font-size: 13px; }
    .dim-bar-track {
      grid-area: bar;
      background: #e4e4e7;
      border-radius: 999px;
      height: 10px;
      overflow: hidden;
    }
    .dim-bar-fill { height: 100%; border-radius: 999px; }
    .dim-score {
      grid-area: score;
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      text-align: right;
      color: #3f3f46;
    }
    .dim-summary { grid-area: summary; font-size: 13px; color: #3f3f46; }
    /* a11y fix (2026-09-05, client-hunter B-15): #a3a3a3 measured 2.25-2.48:1
       against every background this class actually renders on in this
       document (page #fffdf9, body #f4f2ec) — the WCAG AA text minimum is
       4.5:1. This class carries the report's provenance sentences ("Based
       on N issues across M passes…", "The N findings below…") — the exact
       lines ROADMAP P3's third-party-verifiability claim rests on, so an
       unreadable provenance line undercuts the whole point of a shareable
       report. #6b6b6b clears 4.5:1 on both backgrounds (4.76-5.25:1) while
       staying visually muted/secondary next to the primary #1a1a1a/#3f3f46
       ink this document uses for body text. */
    .dim-basis { grid-area: basis; font-size: 11px; color: #6b6b6b; }
    /* ── Checklist ── */
    .checklist { margin: 0; padding-left: 0; list-style: none; }
    /* a11y fix (2026-09-05): buildGodmodeSection's .issue-minor <li> rows
       now sit inside a real <ul> (axe's listitem rule); this only resets
       the default UA list margin/padding to sit flush with the
       .metric-row divs alongside it, since neither carried any spacing
       styling before. */
    .issue-minor-list { margin: 4px 0 8px; padding-left: 20px; }
    .checklist li {
      position: relative;
      padding-left: 26px;
      margin-bottom: 8px;
      font-size: 13.5px;
    }
    .checklist li::before {
      content: "\\2713";
      position: absolute;
      left: 0;
      color: #1a7f37;
      font-weight: 700;
      font-family: 'Courier New', Courier, monospace;
    }
    /* ── Heatmap ── */
    /* a11y/overflow fix (2026-09-05, client-hunter B-15): flex-wrap already
       keeps individual cells from forcing this row wider than its column —
       measured with 42 scenes, it never was the export's overflow source
       (see the .issue-fix fix below for what actually was). overflow-x:auto
       is added anyway as a defensive floor: if a future change ever grows
       .heat-cell past its column width, this row scrolls internally
       instead of taking the whole exported page sideways with it. */
    .heat-row { display: flex; flex-wrap: wrap; gap: 5px; overflow-x: auto; }
    .heat-cell {
      width: 30px;
      height: 30px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      font-weight: 700;
    }
    /* ── Structural-signal strip (unwired diagnostics) ── */
    /* Same defensive overflow-x:auto floor as .heat-row above, same reason. */
    .sig-row { display: flex; flex-wrap: wrap; gap: 4px; align-items: flex-end; overflow-x: auto; }
    .sig-cell {
      width: 26px;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      font-family: 'Courier New', Courier, monospace;
      font-size: 9px;
      color: #57606a;
    }
    .sig-bar { height: 40px; display: flex; flex-direction: column; justify-content: flex-end; border: 1px solid #d0d7de; border-radius: 3px; overflow: hidden; }
    .sig-talk { background: #6e7781; }
    .sig-act { background: #d8dee4; flex: 1 1 auto; }
    .sig-idx { text-align: center; padding-top: 2px; }
    .sig-note { font-size: 11px; color: #57606a; margin: 8px 0 0; }
    .sig-legend { font-size: 11px; color: #57606a; margin: 0 0 10px; }
    /* ── Priorities / appendix ── */
    .priority-list, .appendix-list {
      margin: 0;
      padding-left: 20px;
    }
    .priority-item, .appendix-item {
      margin-bottom: 14px;
    }
    .priority-head {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
      flex-wrap: wrap;
    }
    .issue-location {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11.5px;
      color: #3f3f46;
    }
    .issue-pass {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .issue-description { font-size: 13.5px; }
    /* overflow fix (2026-09-05, client-hunter B-15): this class also carries
       the root-cause member-count / member-rules line, where each rule constant
       (ARC_REVELATION_RELATIONAL_AFTERMATH_VOID and friends) is one
       unbroken 30-45 character token with no space or hyphen for the
       browser to wrap on. Measured live on a real "Try sample coverage"
       report: one of these tokens alone forced this div — and every
       ancestor up through <body>/<html> — 91px wider than its column,
       which is the exact mechanism behind the exported report's 375px
       horizontal overflow (documentElement.scrollWidth 418 vs clientWidth
       375). overflow-wrap:anywhere lets a token break mid-word ONLY when it
       has nowhere else to break, so normal prose (the OTHER use of this
       class, suggested-fix text) is unaffected. */
    .issue-fix {
      font-size: 13px;
      color: #3f3f46;
      margin-top: 2px;
      overflow-wrap: anywhere;
    }
    .pass-block { margin-bottom: 20px; }
    .pass-block h3 {
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      margin: 0 0 8px;
    }
    /* ── Chips ── */
    .chip {
      display: inline-block;
      font-family: 'Courier New', Courier, monospace;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.05em;
      padding: 2px 8px;
      border-radius: 999px;
    }
    .chip-critical { background: #fef2f2; color: #b91c1c; }
    .chip-major { background: #fffbeb; color: #b45309; }
    .chip-minor { background: #eff6ff; color: #1d4ed8; }
    /* ── Footer ── */
    .report-footer {
      border-top: 1px solid #d4d4d8;
      margin-top: 36px;
      padding-top: 16px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      color: #52525b;
      text-align: center;
      line-height: 1.6;
    }
    .footer-hash code {
      background: #f4f4f5;
      padding: 1px 6px;
      border-radius: 3px;
    }
    .footer-caveat {
      margin: 8px 0;
      padding: 6px 10px;
      background: #fef9c3;
      border: 1px solid #fde68a;
      border-radius: 3px;
      color: #713f12;
    }
    /* ── Verify block (P3) ── */
    .verify-block {
      margin: 14px auto 0;
      max-width: 640px;
      padding: 12px 16px;
      border: 1px solid #d4d4d8;
      border-radius: 3px;
      background: #fafaf9;
      text-align: left;
    }
    .verify-heading {
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      margin-bottom: 6px;
      color: #1a1a1a;
    }
    .verify-body { margin-bottom: 8px; }
    .verify-steps {
      margin: 0 0 10px 18px;
      padding: 0;
    }
    .verify-steps li { margin-bottom: 3px; }
    .verify-claims {
      margin: 0;
      display: grid;
      grid-template-columns: 1fr;
      gap: 4px;
    }
    .verify-claims dt {
      display: inline;
      color: #52525b;
    }
    .verify-claims dd {
      display: inline;
      margin: 0 0 0 6px;
    }
    /* The scope sentence (2026-09-12): what the verifier checks and what it does
       not. Smaller and muted — it is a qualification of the block above it, not a
       claim of its own. */
    .verify-scope {
      margin-top: 8px;
      font-size: 0.92em;
      color: #52525b;
    }
    .verify-claims code, .verify-steps code {
      background: #f4f4f5;
      padding: 1px 6px;
      border-radius: 3px;
      word-break: break-all;
    }
    /* ── Producer tier (2026-09-11) ── one printed page above the full report */
    .reader-tier {
      border: 2px solid #18181b;
      padding: 18px 20px 20px;
      margin-bottom: 22px;
    }
    .tier-label {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.16em;
      color: #52525b;
    }
    .tier-caption {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11.5px;
      color: #52525b;
      margin: 4px 0 12px;
    }
    .tier-facts {
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      color: #18181b;
      display: grid;
      gap: 6px;
      margin: 12px 0 10px;
    }
    .tier-facts .stamp {
      font-size: 12px;
      padding: 3px 9px;
      border-width: 2px;
      transform: none;
      display: inline-block;
      vertical-align: middle;
    }
    .tier-key {
      display: inline-block;
      min-width: 72px;
      color: #52525b;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 11px;
    }
    .tier-bounds {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11.5px;
      color: #52525b;
      margin: 0 0 6px;
    }
    .tier-heading {
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border-bottom: 1px solid #d4d4d8;
      padding-bottom: 4px;
      margin: 14px 0 10px;
    }
    .tier-list {
      margin: 0;
      padding-left: 20px;
    }
    .tier-item { margin-bottom: 10px; }
    .tier-item-head {
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 3px;
    }
    .tier-item-where {
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      font-weight: 700;
    }
    .tier-page {
      font-family: 'Courier New', Courier, monospace;
      font-size: 11.5px;
      color: #52525b;
      white-space: nowrap;
    }
    .tier-item-body { font-size: 13px; }
    .tier-empty {
      font-size: 13px;
      color: #52525b;
      margin: 0;
    }
    .tier-divider {
      border: 0;
      border-top: 3px double #18181b;
      margin: 0 0 24px;
    }
    /* ── Print ── */
    @page {
      size: letter portrait;
      margin: 0.65in;
    }
    @media print {
      body { background: #fff; }
      .page { max-width: none; padding: 0; background: #fff; }
      .stamp { box-shadow: none; }
      .health-section { border: 1px solid #d4d4d8; }
      .section { page-break-inside: avoid; break-inside: avoid; }
      /* The tier is its own sheet: the full report starts on page two, so a
         producer who prints one page gets the whole summary and nothing half of
         it. The divider is then redundant in print and is hidden. */
      .reader-tier { break-after: page; page-break-after: always; break-inside: avoid; }
      .tier-divider { display: none; }
    }
`;

// Byte-identity fix (2026-09-04 review): these two rules back the
// `.health-text-block`/`.health-percentile` markup buildHealthSection emits
// ONLY when the report carries a healthPercentile or the caller passed a
// draftRank (see its own comment). Kept OUT of the static STYLES block above
// and appended to the document's <style> tag only in that same case, so a
// report/opts pair with neither field produces a <style> tag with exactly
// the same bytes STYLES alone always had — no unused CSS rules, no
// unconditional growth. tests/core/coverage-html.test.ts pins the
// no-fields case against a committed fixture captured from the pre-this-
// feature renderer; this const existing at all is what makes that pin
// possible without also asserting on unrelated future STYLES edits.
const HEALTH_TEXT_BLOCK_STYLES = `
    .health-text-block {
      flex: 1 1 auto;
      min-width: 0;
    }
    .health-percentile {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10.5px;
      color: #52525b;
      margin-top: 6px;
    }
`;

export interface CoverageHtmlOptions {
  /** Title parsed from the Fountain title page (server/lib/logline.ts's
   *  extractTitlePage), if any. Used ONLY when `title` is empty or the
   *  literal 'Untitled' placeholder — an explicit title always wins. */
  titlePageTitle?: string | null;
  /** Author parsed from the Fountain title page, if any. Purely additive
   *  (rendered as a byline under the title) — never a fallback for title. */
  titlePageAuthor?: string | null;
  /** Logline built by server/lib/logline.ts's buildLogline, if any — the
   *  one-line pitch the coverage report's header carries alongside the
   *  title. null when the builder degraded (no speaking character etc.). */
  logline?: string | null;
  /** 2026-09-04 — "rank among the writer's own saved drafts of this script"
   *  (src/lib/snapshot-trend.ts's computeDraftRank), the same client-computed
   *  value already threaded through the coverage LETTER export
   *  (coverage-letter.ts's CoverageLetterOptions.draftRank). See
   *  buildDraftRankLine's header for the trust posture. Purely additive —
   *  omitted, this renders byte-identical output to before this field
   *  existed.
   *
   *  2026-09-05 migration: widened from `{ rank; of }` to the full
   *  DraftRankExportPayload shape (adds optional `tied`/`unscored`) so this
   *  export can render the SAME tie-breaker and unranked-drafts note the
   *  panel and the letter already do for the same field — the narrower type
   *  was silently dropping both at the type level even though
   *  CoverageBodySchema (server/lib/validation.ts) has accepted them on the
   *  wire since the same round that added them there. */
  draftRank?: DraftRankExportPayload;
  /** The EXACT Fountain text this report was produced from (2026-09-11).
   *
   *  Used for one thing: resolving the producer tier's page references through
   *  the same paginator the PDF export uses (server/lib/page-refs.ts). This does
   *  NOT make the function impure — the same report plus the same text always
   *  renders the same bytes — and it is not re-analyzed: no score, verdict or
   *  finding is derived from it here.
   *
   *  OPTIONAL, and the degradation is stated rather than silent: omitted, the
   *  tier still renders every other fact and prints NO_PAGE_REFS_NOTE instead of
   *  page numbers it cannot resolve. Both export routes and the P0 sample
   *  generator pass it. */
  fountain?: string;
}

/** GODMODE analysis section — surfaces the new structural analysis layers
 *  (disclosure/epistemic, character functions, subplots, graph health) in
 *  the exported coverage report. Each subsection renders only when data
 *  is present, so reports from older runs don't break. */
/** Compact per-scene strip for the additive, UNWIRED structural-signal block
 *  (ScriptDoctorReport.structuralSignals). Each bar is one scene: its filled
 *  lower portion is the scene's dialogue-word share, the pale remainder is
 *  action. The hover title carries that scene's full row. Rendered as a
 *  clearly-labelled diagnostic, never as part of the verdict — nothing in
 *  this block feeds health, grade, or any priority. */
function buildStructuralSignalsSection(report: ScriptDoctorReport): string {
  const block = report.structuralSignals;
  if (!block) return '';
  // B-10 fix (2026-09-05 mistake hunt): a one-scene draft has `scored: false`
  // (structural-signals.ts's own MIN_SCENES_TO_SCORE — the cross-scene
  // aggregates below genuinely need >= 2 scenes to mean anything) but STILL
  // computes `actionSentenceCvOverall`, a document-wide reading that needs no
  // second scene at all. The section used to just vanish with no line saying
  // why, silently discarding a real computed value — say so instead, and
  // show the one aggregate that IS defined, the same honest-about-a-missing-
  // value convention this codebase uses everywhere else (an empty state is a
  // known fact, not an unknown). Never touches the scored/multi-scene render
  // path below, and never the STYLES block.
  if (!block.scored) {
    if (block.sceneCount === 0) return '';
    return `
  <section class="section">
    <h2>Structural Signals (new, unwired diagnostics)</h2>
    <p class="sig-note">Shape &amp; Rhythm needs at least two scenes; this draft has ${block.sceneCount}.</p>
    <p class="sig-note">${ACTION_PROSE_VARIATION_LABEL_LOWER} ${escapeHtml(formatSignalValue(block.actionSentenceCvOverall))}</p>
    <p class="sig-note">These readings are computed from document structure alone &mdash; word, line, sentence, turn and speaker counts &mdash; with no word list involved. They are <strong>diagnostic only and are not part of the score</strong>: no health, grade, verdict, dimension or priority above is derived from any number in this section.</p>
  </section>`;
  }
  if (block.scenes.length === 0) return '';

  const cells = block.scenes.map(scene => {
    const talkPct = Math.max(0, Math.min(100, Math.round(scene.dialogueShare * 100)));
    // Collapse whitespace: a slugline that wrapped in the source would
    // otherwise put a raw newline inside a title attribute.
    const tooltip = escapeHtml(
      `${scene.slug.replace(/\s+/g, ' ')} — ${scene.words} words (z ${scene.lengthZ.toFixed(2)}) · `
      + `dialogue ${talkPct}% (Δ ${scene.dialogueShareDelta >= 0 ? '+' : ''}${scene.dialogueShareDelta.toFixed(2)}) · `
      + `${scene.speakers} speaker(s), ${scene.speakerTurns} turn(s), ${scene.meanTurnWords.toFixed(1)} words/turn · `
      + `lead share ${Math.round(scene.leadShare * 100)}% · new pairings ${scene.newPairs} · `
      + `open/close shift ${scene.openCloseShift.toFixed(2)}`,
    );
    return `<div class="sig-cell" title="${tooltip}">`
      + `<div class="sig-bar"><div class="sig-act"></div><div class="sig-talk" style="height:${talkPct}%;"></div></div>`
      + `<div class="sig-idx">${scene.sceneIdx + 1}</div>`
      + '</div>';
  }).join('\n');

  const summary = [
    `scene-length variation ${block.sceneLengthCv.toFixed(2)}`,
    `mean talk/action swing ${formatSignalValue(block.meanAbsDialogueShareDelta)}`,
    `talk/action range ${block.dialogueShareRange.toFixed(2)}`,
    `new-pairing scenes ${Math.round(block.newPairSceneRate * 100)}%`,
    `mean words/turn ${block.meanTurnWords.toFixed(1)}`,
    `lead share ${Math.round(block.meanLeadShare * 100)}% (trend ${block.leadShareSlope >= 0 ? '+' : ''}${block.leadShareSlope.toFixed(2)})`,
    `${ACTION_PROSE_VARIATION_LABEL_LOWER} ${formatSignalValue(block.actionSentenceCvOverall)}`,
  ].map(escapeHtml).join(' &middot; ');

  return `
  <section class="section">
    <h2>Structural Signals (new, unwired diagnostics)</h2>
    <p class="sig-legend">One bar per scene. The filled lower portion is that scene&rsquo;s share of dialogue words; the pale remainder is action. Hover a bar for that scene&rsquo;s full reading.</p>
    <div class="sig-row">
${cells}
    </div>
    <p class="sig-note">${summary}</p>
    <p class="sig-note">These readings are computed from document structure alone &mdash; word, line, sentence, turn and speaker counts &mdash; with no word list involved. They are <strong>diagnostic only and are not part of the score</strong>: no health, grade, verdict, dimension or priority above is derived from any number in this section.</p>
  </section>`;
}

function buildGodmodeSection(report: ScriptDoctorReport): string {
  const parts: string[] = [];

  // a11y fix (2026-09-05, found auditing this export for client-hunter
  // B-15 — pre-existing, not one of B-11/B-14/B-15's own findings, but
  // real and in this same file): every `<li class="issue-minor">` below
  // used to be pushed bare into `parts`, a sibling of plain `<div>` rows
  // inside `.metrics-grid` — never inside a `<ul>`/`<ol>`. axe's `listitem`
  // rule (serious) correctly flags an `<li>` with no list-container parent;
  // this is the FIRST audit this exported document has ever had
  // (scripts/verify-a11y.mjs's "10c" step, added alongside the B-15 fix),
  // which is why it was never caught before. Each finding loop below now
  // wraps its own `<li>` run in one `<ul>` — no other markup changes.

  // Graph Health (L5)
  if (report.graphHealth) {
    const gh = report.graphHealth;
    const meter = '█'.repeat(Math.round(gh.graphHealthScore / 5));
    parts.push(`<div class="metric-row"><span class="metric-label">Graph Health</span><span class="metric-value">${gh.graphHealthScore}/100</span></div>`);
    if (gh.graphDeduction > 0) {
      parts.push(`<div class="metric-row sub"><span class="metric-label">→ Health deduction</span><span class="metric-value">−${gh.graphDeduction}</span></div>`);
    }
    if (gh.findings.length > 0) {
      parts.push('<ul class="issue-minor-list">');
      for (const finding of gh.findings) {
        parts.push(`<li class="issue-minor">${escapeHtml(finding)}</li>`);
      }
      parts.push('</ul>');
    }
  }

  // Disclosure & Epistemics (L4/L19)
  if (report.disclosureAnalysis?.scored) {
    const da = report.disclosureAnalysis;
    parts.push(`<div class="metric-row"><span class="metric-label">Disclosure Violations</span><span class="metric-value">${da.violationCount}</span></div>`);
    if (da.epistemicGaps.length > 0) {
      parts.push(`<div class="metric-row sub"><span class="metric-label">Epistemic gaps</span><span class="metric-value">${da.epistemicGaps.length}</span></div>`);
      parts.push('<ul class="issue-minor-list">');
      for (const gap of da.epistemicGaps.slice(0, 3)) {
        parts.push(`<li class="issue-minor">${escapeHtml(gap.description)}</li>`);
      }
      parts.push('</ul>');
    }
  }

  // Character Functions (L8)
  if (report.characterFunctions && report.characterFunctions.length > 0) {
    const funcs = report.characterFunctions.map(cf =>
      `${escapeHtml(cf.characterId)}: ${cf.function} (${(cf.confidence * 100).toFixed(0)}%)`,
    ).join(' · ');
    parts.push(`<div class="metric-row"><span class="metric-label">Character Functions</span><span class="metric-value">${funcs}</span></div>`);
  }

  // Subplots (L13)
  if (report.subplots && report.subplots.totalSubplots > 0) {
    const sp = report.subplots;
    parts.push(`<div class="metric-row"><span class="metric-label">Subplots</span><span class="metric-value">${sp.totalSubplots} (${sp.unresolvedSubplots} unresolved, ${sp.intersectionCount} intersections)</span></div>`);
    if (sp.subplots.length > 0) {
      parts.push('<ul class="issue-minor-list">');
      for (const subplot of sp.subplots.slice(0, 5)) {
        parts.push(`<li class="issue-minor">${escapeHtml(subplot.description)}</li>`);
      }
      parts.push('</ul>');
    }
  }

  // Deliberate Rule-Breaking (L37)
  if (report.ruleBreaking?.scored && report.ruleBreaking.findings.length > 0) {
    const rb = report.ruleBreaking;
    const deliberate = rb.findings.filter(f => f.readsAsDeliberate).length;
    parts.push(`<div class="metric-row"><span class="metric-label">Rule-Breaking</span><span class="metric-value">${rb.findings.length} findings (${deliberate} deliberate)</span></div>`);
    parts.push('<ul class="issue-minor-list">');
    for (const finding of rb.findings.slice(0, 4)) {
      const tag = finding.readsAsDeliberate ? 'PRESERVE' : 'CHECK';
      parts.push(
        `<li class="issue-minor"><strong>${escapeHtml(tag)}</strong> ${escapeHtml(finding.convention)} — ${escapeHtml(finding.preserveNotice)}</li>`,
      );
      for (const c of finding.compensations.slice(0, 2)) {
        parts.push(`<li class="issue-minor sub">${escapeHtml(c)}</li>`);
      }
    }
    parts.push('</ul>');
  }

  if (parts.length === 0) return '';

  return `<section class="section"><h2>Structural Analysis</h2><div class="metrics-grid">${parts.join('\n')}</div></section>`;
}

/**
 * Render a ScriptDoctorReport into a complete, standalone, print-quality
 * HTML document — the shareable coverage report writers download, print to
 * PDF, and hand to producers. Pure function: inline CSS only, zero external
 * requests, no JS required to view. Every value that could conceivably
 * contain screenplay-derived text (title, author, logline, scene slugs,
 * issue text, summaries, strengths) is escaped via escapeHtml() before
 * interpolation.
 */
export function renderCoverageHtml(report: ScriptDoctorReport, title: string, opts: CoverageHtmlOptions = {}): string {
  if (!isWholeDraftAnalysisComplete(report)) {
    throw new Error('Coverage export requires a complete whole-draft analysis.');
  }

  // Title fallback chain: explicit title > parsed title page > 'Untitled'.
  // An explicit 'Untitled' (the client's own default when no title field was
  // posted — see server/routes/export.ts) is treated the same as empty, so
  // a script with a real Title: page never displays the literal word
  // "Untitled" just because the caller didn't bother passing a title.
  const explicitTitle = title.trim();
  const resolvedTitle = (explicitTitle && explicitTitle !== 'Untitled')
    ? explicitTitle
    : (opts.titlePageTitle?.trim() || explicitTitle || 'Untitled');
  const safeTitle = escapeHtml(resolvedTitle);
  const safeAuthor = opts.titlePageAuthor?.trim() ? escapeHtml(opts.titlePageAuthor.trim()) : null;
  const dimensions = report.dimensions ?? [];
  const strengths = report.strengths ?? [];

  // Computed ONCE here (see buildHealthSection's own header comment): the
  // same two strings drive the health-text-block markup below AND the
  // needsHealthTextBlockStyles decision for the <style> tag, so the two can
  // never disagree about whether the wrapper/CSS should exist for this
  // report/opts pair.
  const healthPercentileLine = buildHealthPercentileLine(report);
  const draftRankLine = buildDraftRankLine(opts.draftRank);
  const needsHealthTextBlockStyles = Boolean(healthPercentileLine || draftRankLine);

  // The producer tier (2026-09-11, discovery #11): one printed page — logline,
  // length, verdict, what to fix first with page references, and the reference
  // bounds the percentile is measured against — then a divider, then the
  // complete report, unchanged. `opts.fountain` is what lets every finding carry
  // a page number; without it the tier still renders and says so (see
  // buildReaderTier's own degradation note).
  //
  // Built ONCE and kept: the footer's verify block is published from
  // `tier.claims` (server/lib/artifact-claims.ts), the same object this page is
  // rendered from, so a number cannot reach the producer's first page without
  // reaching the claim set a verifier checks. Before 2026-09-12 the tier was built
  // inline here and discarded, and the verify block was assembled separately from
  // `report` — which is how the tier's scene count, word count, page estimate,
  // page references and priorities count came to be unverifiable (BUG-1,
  // docs/audits/2026-09-12-adversarial/server-data-tests.md).
  const tier = buildReaderTier(report, { logline: opts.logline, fountain: opts.fountain });
  const readerTier = renderReaderTierHtml(tier, escapeHtml, verdictStampHtml);

  const body = [
    buildHeaderSection(report, safeTitle, safeAuthor),
    readerTier,
    buildHealthSection(report, healthPercentileLine, draftRankLine),
    buildDimensionsSection(dimensions),
    buildStrengthsSection(strengths),
    buildGodmodeSection(report),
    buildHeatmapSection(report.sceneHeatmap ?? []),
    buildStructuralSignalsSection(report),
    buildNamedRootCausesSection(report.rootCauses),
    buildTopPrioritiesSection(report.topPriorities ?? []),
    buildClusterFindingsSection(report.rootCauses),
    buildAppendixSection(report.passes ?? []),
    buildFooterSection(report, tier.claims),
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle} &mdash; Script Coverage</title>
<style>
${STYLES}${needsHealthTextBlockStyles ? HEALTH_TEXT_BLOCK_STYLES : ''}
</style>
</head>
<body>
  <div class="page">
${body}
  </div>
</body>
</html>`;

  // Generated reports are committed as reproducible artifacts. Keep blank
  // lines truly blank so a renderer run never needs manual whitespace cleanup.
  return html.replace(/[ \t]+(?=\r?\n|$)/g, '');
}
