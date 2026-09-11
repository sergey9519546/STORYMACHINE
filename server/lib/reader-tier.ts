// THE PRODUCER TIER — one printed page that answers "what is this, and what is
// wrong with it", above the full coverage report.
//
// ── Why this exists (2026-09-11, producer-tier discovery #11) ────────────────
//
// The shareable coverage report measured 760 KB of roughly 817 notes on a
// feature-length draft. Everything a reader needs is in there; nothing tells
// them where to start. A producer does not read 817 notes. They read one page
// and decide whether to read the script.
//
// So the exported report now opens with this tier, then a divider, then the
// complete report unchanged. Nothing is removed: the tier is a front page, not
// a replacement, and every number it states is also stated in full below it.
//
// ── The rules this module holds ─────────────────────────────────────────────
//
// 1. ONE PAGE. The HTML tier breaks the page after itself, so the full report
//    starts on sheet two. tests/core/reader-tier.test.ts pins a line budget
//    derived from the measured Chromium print geometry, so an edit that doubles
//    the tier's length fails in CI without needing a browser.
// 2. NO FACT TWICE ON THE FIRST PAGE. The report header identifies the document
//    (masthead, title, byline, date); the tier states the findings (logline,
//    length, verdict, health, percentile, what to fix). Before this change the
//    header carried the logline, the scene/word/page line AND the verdict stamp,
//    all of which the tier has to state — so they moved, rather than being
//    printed twice a centimetre apart.
// 3. EVERY FINDING CARRIES A PAGE NUMBER. "Scene 58" is useless to someone
//    holding a PDF. server/lib/page-refs.ts resolves it through the same
//    paginator the PDF export uses; an unresolved reference is omitted, never
//    guessed.
// 4. THE CONFIDENCE LINE IS ALWAYS PRESENT. A percentile against a 20-sample
//    reference set of 9-10-scene samples is not a reading about a feature, and
//    the tier says so rather than printing a reassuring band (see
//    src/lib/percentile-copy.ts's percentileIsComparable).
//
// Pure: no I/O, no clock of its own (analyzedAt comes off the report), no
// randomness — the same report plus the same script text renders byte-identical
// output. NOT on the scoring path.

import type { ScriptDoctorReport, CoverageVerdict } from '../nvm/analyze/types.ts';
import type { PassName, RevisionIssue } from '../nvm/revision/passes/types.ts';
import { locateIssues, sceneLineSpans, type SceneLineSpan } from '../nvm/analyze/locate.ts';
import { suppressContradictoryFindings } from '../nvm/analyze/prioritize.ts';
import { scenePageNumbers, pageRefLabel } from './page-refs.ts';
import { derivedReferenceBoundsLine } from './reference-bounds.ts';
import {
  healthPercentileSentence, notComparableSentence, percentileIsComparable,
} from '../../src/lib/percentile-copy.ts';
import { prioritiesHeadingFor } from '../../src/lib/priorities-copy.ts';

/** How many findings the tier leads with.
 *
 *  THREE. Not a round number picked for looks: the tier has to fit one printed
 *  page alongside a logline, a length line, a verdict, a health reading, a
 *  percentile and a confidence line, and three findings at full description
 *  length is what fits with margin (measured: see tests/core/reader-tier.test.ts
 *  and the print-geometry measurement in scripts/measure-reader-tier-page.mjs).
 *  The full list is immediately below the divider, so this is a reading order,
 *  not a cap on what the document contains. */
export const TIER_PRIORITY_COUNT = 3;

export interface ReaderTierFinding {
  severity: RevisionIssue['severity'];
  /** The issue's own location string, e.g. "Scene 9 (INT. BAR)". */
  location: string;
  description: string;
  /** "p. 47", or '' when this finding has no resolvable page. */
  pageRef: string;
}

export interface ReaderTierData {
  /** The deterministic logline, or null when the script has no protagonist to
   *  write one about (server/lib/logline.ts's dialogue-share gate). */
  logline: string | null;
  /** "231 scenes · 19,293 words · ~79 pages / ~79 min (est.)" */
  lengthLine: string;
  verdict: CoverageVerdict | null;
  verdictLabel: string;
  /** "Health 84.4 / 100" — the headline number, stated once. */
  healthLine: string;
  /** The percentile BAND, or the not-comparable sentence. One of the two is
   *  always present when the report carries a percentile at all. */
  percentileLine: string | null;
  /** "20 samples / 9–10 scenes / 256–337 words" — always present. */
  boundsLine: string;
  prioritiesHeading: string;
  priorities: ReaderTierFinding[];
  /** True when no script text was supplied, so no page references could be
   *  resolved — stated in the tier rather than silently omitted. */
  pageRefsUnavailable: boolean;
}

/** The verdict word a reader sees. PASS carries its parenthetical because
 *  "PASS" reads as approval to anyone outside coverage culture — the same
 *  decision coverage-html.ts's VERDICT_STYLE and coverage-letter.ts's
 *  VERDICT_LABEL already made, restated here rather than imported because
 *  neither module exports it. */
const VERDICT_WORD: Record<CoverageVerdict, string> = {
  RECOMMEND: 'RECOMMEND',
  CONSIDER: 'CONSIDER',
  PASS: 'PASS (decline)',
};

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

/** Which scene contains a 1-based line number, or -1. The spans are sorted and
 *  non-overlapping (locate.ts's computeSceneSpans), so a linear walk is exact. */
function sceneIdxForLine(line: number, spans: readonly SceneLineSpan[]): number {
  for (let i = 0; i < spans.length; i++) {
    if (spans[i].startLine <= line && line <= spans[i].endLine) return i;
  }
  return -1;
}

/**
 * Build the tier's data from a report and, when available, the script text the
 * report was produced from.
 *
 * `fountain` is OPTIONAL and the degradation is honest rather than silent: with
 * no text there are no scene spans and no pagination, so every page reference is
 * omitted and `pageRefsUnavailable` is true, which the renderers state. Callers
 * that have the text (both export routes and the sample generator) always pass
 * it.
 */
export function buildReaderTier(
  report: ScriptDoctorReport,
  opts: { logline?: string | null; fountain?: string } = {},
): ReaderTierData {
  const fountain = opts.fountain ?? '';

  const pageEstimate = report.pageEstimate
    ? ` · ~${formatNumber(report.pageEstimate.pages)} page${report.pageEstimate.pages === 1 ? '' : 's'}`
      + ` / ~${formatNumber(report.pageEstimate.runtimeMinutes)} min (est.)`
    : '';
  const lengthLine = `${formatNumber(report.sceneCount)} scene${report.sceneCount === 1 ? '' : 's'}`
    + ` · ${formatNumber(report.wordCount)} word${report.wordCount === 1 ? '' : 's'}${pageEstimate}`;

  // The percentile line: a BAND when the draft sits inside the reference set's
  // bounds, the not-comparable sentence when it does not, and nothing at all
  // when the report carries no percentile (an incomplete or legacy report).
  // Never an ordinal — see src/lib/percentile-copy.ts.
  const percentileLine = typeof report.healthPercentile === 'number'
    ? (percentileIsComparable(report.sceneCount, report.wordCount)
      ? healthPercentileSentence(report.healthPercentile)
      : notComparableSentence())
    : null;

  // The same list, filtered the same way, that the full report's own priorities
  // section shows — suppressContradictoryFindings at the render boundary, so the
  // tier can never lead with a finding the section below it suppressed.
  const suppressed = suppressContradictoryFindings(report.topPriorities ?? []);
  const leading = suppressed.slice(0, TIER_PRIORITY_COUNT);

  const spans = fountain ? sceneLineSpans(fountain) : [];
  const scenePages = fountain ? scenePageNumbers(fountain) : [];
  const located = fountain
    ? locateIssues(leading as Array<RevisionIssue & { pass: PassName }>, fountain)
    : [];

  const priorities: ReaderTierFinding[] = leading.map((issue, i) => {
    const anchorLine = located[i]?.startLine;
    const sceneIdx = typeof anchorLine === 'number' ? sceneIdxForLine(anchorLine, spans) : -1;
    const page = sceneIdx >= 0 ? scenePages[sceneIdx] ?? null : null;
    return {
      severity: issue.severity,
      location: issue.location,
      description: issue.description,
      pageRef: pageRefLabel(page),
    };
  });

  return {
    logline: opts.logline?.trim() ? opts.logline.trim() : null,
    lengthLine,
    verdict: report.verdict ?? null,
    verdictLabel: report.verdict ? VERDICT_WORD[report.verdict] : 'N/A',
    healthLine: `Health ${report.health.toFixed(1)} / 100`,
    percentileLine,
    boundsLine: derivedReferenceBoundsLine(),
    prioritiesHeading: prioritiesHeadingFor(priorities.length),
    priorities,
    pageRefsUnavailable: fountain === '',
  };
}

// ── Renderers ────────────────────────────────────────────────────────────────
// Two, over ONE data object, for the same reason coverage-letter.ts builds its
// LetterData once: the HTML report and the letter cannot then disagree about a
// number or a wording, only about markup.

/** The line a finding renders as, identically in both renderers: severity,
 *  location, page reference. Kept here so "MAJOR — Scene 9 (INT. BAR) — p. 6"
 *  has one assembly. */
export function tierFindingHeadline(finding: ReaderTierFinding): string {
  const page = finding.pageRef ? ` — ${finding.pageRef}` : '';
  return `${finding.severity.toUpperCase()} — ${finding.location}${page}`;
}

/** The honest note for the no-script-text case, stated rather than leaving a
 *  reader to wonder why the findings carry no page numbers. */
export const NO_PAGE_REFS_NOTE =
  'Page numbers are unavailable for this report (it was rendered without the script text).';

/** The tier's own caption, naming what the document is and what is below it.
 *  ONE sentence, shared by both renderers. */
export const TIER_CAPTION =
  'One page for a reader deciding whether to read the script. The complete report follows.';

export function renderReaderTierMarkdown(data: ReaderTierData): string {
  const lines: string[] = [];
  lines.push('## Reader summary');
  lines.push('');
  lines.push(`*${TIER_CAPTION}*`);
  lines.push('');
  if (data.logline) lines.push(`**Logline.** ${data.logline}`);
  else lines.push('**Logline.** Not derived — no single speaker holds enough of this script’s dialogue for one.');
  lines.push('');
  lines.push(`**Length.** ${data.lengthLine}`);
  lines.push('');
  lines.push(`**Verdict.** ${data.verdictLabel} · ${data.healthLine}`);
  if (data.percentileLine) {
    lines.push('');
    lines.push(data.percentileLine);
  }
  lines.push('');
  lines.push(`*Reference bounds: ${data.boundsLine}.*`);
  lines.push('');
  lines.push(`### ${data.prioritiesHeading}`);
  lines.push('');
  if (data.priorities.length === 0) {
    lines.push('Nothing urgent surfaced — there is no priority fix to flag right now.');
  } else {
    data.priorities.forEach((finding, i) => {
      lines.push(`${i + 1}. **${tierFindingHeadline(finding)}** — ${finding.description}`);
    });
    if (data.pageRefsUnavailable) {
      lines.push('');
      lines.push(`*${NO_PAGE_REFS_NOTE}*`);
    }
  }
  return lines.join('\n');
}

export function renderReaderTierText(data: ReaderTierData): string {
  const lines: string[] = [];
  lines.push('READER SUMMARY');
  lines.push('--------------');
  lines.push(TIER_CAPTION);
  lines.push('');
  lines.push(data.logline
    ? `Logline: ${data.logline}`
    : 'Logline: not derived — no single speaker holds enough of this script’s dialogue for one.');
  lines.push(`Length: ${data.lengthLine}`);
  lines.push(`Verdict: ${data.verdictLabel} · ${data.healthLine}`);
  if (data.percentileLine) lines.push(data.percentileLine);
  lines.push(`Reference bounds: ${data.boundsLine}.`);
  lines.push('');
  lines.push(data.prioritiesHeading.toUpperCase());
  lines.push('-'.repeat(data.prioritiesHeading.length));
  if (data.priorities.length === 0) {
    lines.push('Nothing urgent surfaced — there is no priority fix to flag right now.');
  } else {
    data.priorities.forEach((finding, i) => {
      lines.push(`${i + 1}. ${tierFindingHeadline(finding)} — ${finding.description}`);
    });
    if (data.pageRefsUnavailable) lines.push(NO_PAGE_REFS_NOTE);
  }
  return lines.join('\n');
}

/** HTML for the exported coverage report. `escape` is passed in rather than
 *  duplicated: coverage-html.ts owns the ONE escaping path every interpolation
 *  in that document takes (see its SECURITY header), and this module must not
 *  introduce a second one. */
export function renderReaderTierHtml(
  data: ReaderTierData,
  escape: (value: string) => string,
  /** The document's own verdict stamp markup. Passed in for the same reason
   *  `escape` is: the coverage report's stamp (its colours, its PASS
   *  parenthetical, its border) is coverage-html.ts's VERDICT_STYLE, and the
   *  verdict moved from the header into this tier so the first page states it
   *  ONCE. Re-implementing the stamp here would have meant two stamps that drift
   *  apart. Omitted (the letter's case, and any caller that wants no graphic) and
   *  the verdict renders as the plain label instead. */
  verdictStamp?: (verdict: CoverageVerdict | null) => string,
): string {
  const severityChip = (sev: RevisionIssue['severity']) =>
    `<span class="chip chip-${sev}">${sev.toUpperCase()}</span>`;

  const items = data.priorities.map(finding => `
      <li class="tier-item">
        <div class="tier-item-head">
          ${severityChip(finding.severity)}
          <span class="tier-item-where">${escape(finding.location)}</span>
          ${finding.pageRef ? `<span class="tier-page">${escape(finding.pageRef)}</span>` : ''}
        </div>
        <div class="tier-item-body">${escape(finding.description)}</div>
      </li>`).join('\n');

  const prioritiesBlock = data.priorities.length === 0
    ? '<p class="tier-empty">Nothing urgent surfaced &mdash; there is no priority fix to flag right now.</p>'
    : `<ol class="tier-list">${items}
    </ol>${data.pageRefsUnavailable ? `
    <p class="tier-bounds">${escape(NO_PAGE_REFS_NOTE)}</p>` : ''}`;

  // NOTE on `logline-line`: that class is the coverage report's existing logline
  // style, and it is used here deliberately rather than replaced by a tier-
  // specific one. The logline MOVED out of the header into this tier; reusing the
  // class means the document still has exactly one definition of how a logline
  // looks, and it means the rule did not become dead CSS that a later reader
  // would have to decide whether to delete. Pinned by
  // tests/core/coverage-html.test.ts's dead-selector case.
  return `
  <section class="reader-tier">
    <div class="tier-label">READER SUMMARY</div>
    <p class="tier-caption">${escape(TIER_CAPTION)}</p>
    <p class="logline-line">${data.logline
      ? escape(data.logline)
      : 'No logline was derived &mdash; no single speaker holds enough of this script&rsquo;s dialogue for one.'}</p>
    <div class="tier-facts">
      <div><span class="tier-key">Length</span> ${escape(data.lengthLine)}</div>
      <div><span class="tier-key">Verdict</span> ${verdictStamp
        ? verdictStamp(data.verdict)
        : escape(data.verdictLabel)} &middot; ${escape(data.healthLine)}</div>
    </div>${data.percentileLine ? `
    <p class="tier-bounds">${escape(data.percentileLine)}</p>` : ''}
    <p class="tier-bounds">Reference bounds: ${escape(data.boundsLine)}.</p>
    <h2 class="tier-heading">${escape(data.prioritiesHeading)}</h2>
    ${prioritiesBlock}
  </section>
  <hr class="tier-divider" />`;
}
