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
// 4. THE REFERENCE BOUNDS ARE STATED, AND STATED ONCE. A percentile against a
//    20-sample reference set of 9-10-scene samples is not a reading about a
//    feature, so the tier prints the bounds the percentile is measured against
//    rather than a reassuring band (see src/lib/percentile-copy.ts's
//    percentileIsComparable). ONCE, though: the not-comparable sentence already
//    carries the bounds in its own parenthetical, so a separate "Reference
//    bounds:" line beside it put the same string on the producer's first page
//    twice — which is rule 2 broken by the code that implements rule 4. Round 2
//    (2026-09-11) makes `boundsLine` null in exactly that case. It is never
//    absent from the page: when the percentile line states the bounds, that IS
//    the statement; when there is no percentile line at all (a legacy or
//    incomplete report), the bounds line renders, so the reference frame is
//    stated either way. MEASURED: 0 of the 20 CC0 shorts are inside the band, so
//    the doubled path was the one every real draft took.
//
// Pure: no I/O, no clock of its own (analyzedAt comes off the report), no
// randomness — the same report plus the same script text renders byte-identical
// output. NOT on the scoring path.

import type { ScriptDoctorReport, CoverageVerdict } from '../nvm/analyze/types.ts';
import type { RevisionIssue } from '../nvm/revision/passes/types.ts';
import { locateIssues, sceneLineSpans, type SceneLineSpan } from '../nvm/analyze/locate.ts';
import { suppressContradictoryFindings } from '../nvm/analyze/prioritize.ts';
import { scenePageNumbers, pageRefLabel } from './page-refs.ts';
import { derivedReferenceBoundsLine } from './reference-bounds.ts';
import { analyzeFountainText } from '../nvm/analyze/fountain-analyzer.ts';
import { buildLogline } from './logline.ts';
import {
  buildArtifactClaims, formatLengthLine, type ArtifactClaims, type ArtifactPageRef,
  type LoglineState,
} from './artifact-claims.ts';
import { percentileSentenceFor } from '../../src/lib/percentile-copy.ts';
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
  /** The rule that produced this finding, and its stable aggregation id when the
   *  report carries one (doctor.ts's aggregateReport). Not rendered — carried so
   *  the page reference beside this finding can be published as a CHECKABLE claim
   *  (server/lib/artifact-claims.ts's ArtifactPageRef) rather than as a bare
   *  number a verifier could only confirm the presence of. */
  rule: string;
  id?: string;
}

export interface ReaderTierData {
  /** The deterministic logline; null when the dialogue-share gate refused one
   *  (server/lib/logline.ts), and UNDEFINED when this tier has no basis to say
   *  either way — a caller that passed neither a logline nor the script text to
   *  derive one from.
   *
   *  THREE STATES, NOT TWO (2026-09-12). It used to be two, and the null branch's
   *  copy — "no single speaker holds enough of this script's dialogue for one" —
   *  was printed for BOTH the gate firing and a caller simply not supplying a
   *  logline, which is a statement about the script that the second case has no
   *  evidence for. Both export routes always supply one, so the false sentence
   *  only ever reached callers inside this repository; it is still a sentence the
   *  document cannot support, and the verify block now publishes this state as a
   *  claim, so "don't know" has to be distinguishable from "no". */
  logline: string | null | undefined;
  /** "231 scenes · 19,293 words · ~79 pages / ~79 min (est.)" */
  lengthLine: string;
  verdict: CoverageVerdict | null;
  verdictLabel: string;
  /** "Health 84.4 / 100" — the headline number, stated once. */
  healthLine: string;
  /** The percentile BAND, or the not-comparable sentence. One of the two is
   *  always present when the report carries a percentile at all. */
  percentileLine: string | null;
  /** "20 samples / 9–10 scenes / 256–337 words", or null when `percentileLine`
   *  already carries the same string in its own parenthetical (the
   *  not-comparable case, which is every real draft). Exactly one of the two
   *  states the bounds — see rule 4 in this file's header. */
  boundsLine: string | null;
  prioritiesHeading: string;
  priorities: ReaderTierFinding[];
  /** True when no script text was supplied, so no page references could be
   *  resolved — stated in the tier rather than silently omitted. */
  pageRefsUnavailable: boolean;
  /** EVERY number and discrete reading on this page, as the checkable claim set
   *  both exporters publish in their verify block and both verifiers read back
   *  (server/lib/artifact-claims.ts). The tier's own Length line is formatted FROM
   *  this object, which is what makes "a claim cannot exist on the page without
   *  being in the block" a property of the code rather than a convention. */
  claims: ArtifactClaims;
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

  // THE LOGLINE, IN THREE STATES (2026-09-12). A caller that supplies one is
  // believed (both export routes, the sample generator and the print-geometry
  // measurement all pass server/lib/logline.ts's buildLogline output, the same
  // trust posture opts.title/opts.author already had). A caller that supplies
  // NOTHING but does supply the script text gets the engine's own deterministic
  // logline derived here rather than a sentence claiming the script has no
  // protagonist — which is what the old two-state fallback printed, and is a claim
  // about the script that "the caller didn't pass one" is no evidence for. With
  // neither, the state is genuinely unknown: `undefined`, stated as such on the
  // page and published as no claim at all.
  //
  // Deriving it here also makes the claim CHECKABLE: a verifier holding only the
  // script text recomputes this exact state through this exact function
  // (server/lib/verify-compare.ts's recomputeArtifactClaims), with no access to
  // whatever the original caller passed.
  const supplied = opts.logline === undefined && fountain
    ? buildLogline(report, analyzeFountainText(fountain).records, fountain)
    : opts.logline;
  const logline: string | null | undefined = supplied === undefined
    ? undefined
    : (supplied?.trim() ? supplied.trim() : null);

  // The percentile line: a BAND when the draft sits inside the reference set's
  // bounds, the not-comparable sentence when it does not, and nothing at all
  // when the report carries no percentile (an incomplete or legacy report).
  // Never an ordinal — see src/lib/percentile-copy.ts.
  const percentileLine = typeof report.healthPercentile === 'number'
    ? percentileSentenceFor(report.healthPercentile, report.sceneCount, report.wordCount)
    : null;

  // The same list, filtered the same way, that the full report's own priorities
  // section shows — suppressContradictoryFindings at the render boundary, so the
  // tier can never lead with a finding the section below it suppressed.
  const suppressed = suppressContradictoryFindings(report.topPriorities ?? []);
  const leading = suppressed.slice(0, TIER_PRIORITY_COUNT);

  const spans = fountain ? sceneLineSpans(fountain) : [];
  const scenePages = fountain ? scenePageNumbers(fountain) : [];
  // No cast: ScriptDoctorReport.topPriorities is already
  // Array<RevisionIssue & { pass: PassName }>, which is exactly what locateIssues
  // takes, and suppressContradictoryFindings is generic over that element type.
  const located = fountain ? locateIssues(leading, fountain) : [];

  const priorities: ReaderTierFinding[] = leading.map((issue, i) => {
    const anchorLine = located[i]?.startLine;
    const sceneIdx = typeof anchorLine === 'number' ? sceneIdxForLine(anchorLine, spans) : -1;
    const page = sceneIdx >= 0 ? scenePages[sceneIdx] ?? null : null;
    return {
      severity: issue.severity,
      location: issue.location,
      description: issue.description,
      pageRef: pageRefLabel(page),
      rule: issue.rule,
      ...(issue.id ? { id: issue.id } : {}),
    };
  });

  // The page references as CLAIMS — same resolution, same order, one entry per
  // leading finding INCLUDING the ones with no resolvable page (`null`, printed as
  // "no page" in the block). `null` for the whole list, not an empty one, when
  // there was no script text to paginate: "this report resolved no references
  // because it never had the text" and "this report's three findings all point at
  // nothing" are different statements and the block makes both.
  const pageRefs: ArtifactPageRef[] | null = fountain
    ? priorities.map((finding, i) => ({
      ordinal: i + 1,
      rule: finding.rule,
      ...(finding.id ? { id: finding.id } : {}),
      page: pageFromLabel(finding.pageRef),
    }))
    : null;

  // ONE statement of the bounds on this page. The not-comparable sentence ends in
  // "(20 samples / 9-10 scenes / 256-337 words)", so a "Reference bounds:" line
  // under it is the identical string twice, a centimetre apart — exactly the
  // render-a-fact-once rule this tier exists to enforce. Decided by STRING
  // CONTAINMENT rather than by re-asking percentileIsComparable, so the two can
  // never disagree about whether the bounds are already on the page: if a future
  // edit takes the parenthetical out of that sentence, this line comes back by
  // itself.
  const boundsLine = derivedReferenceBoundsLine();
  const boundsAlreadyStated = percentileLine !== null && percentileLine.includes(boundsLine);

  const loglineState: LoglineState | null = logline === undefined
    ? null
    : (logline === null ? 'not derived' : 'derived');

  const claims = buildArtifactClaims(report, {
    prioritiesListed: priorities.length,
    loglineState,
    pageRefs,
    referenceBounds: boundsLine,
  });

  return {
    logline,
    // Formatted FROM the claim set, not beside it — see artifact-claims.ts's
    // formatLengthLine. A forged Length line and a genuine Scenes/Words claim are
    // therefore two edits, and the CLI's body-versus-block check catches either
    // one alone.
    lengthLine: formatLengthLine(claims),
    verdict: report.verdict ?? null,
    verdictLabel: report.verdict ? VERDICT_WORD[report.verdict] : 'N/A',
    healthLine: `Health ${report.health.toFixed(1)} / 100`,
    percentileLine,
    boundsLine: boundsAlreadyStated ? null : boundsLine,
    prioritiesHeading: prioritiesHeadingFor(priorities.length),
    priorities,
    pageRefsUnavailable: fountain === '',
    claims,
  };
}

/** "p. 47" -> 47, '' -> null. The inverse of page-refs.ts's pageRefLabel, kept
 *  here beside its only use rather than exported from there: the label is what the
 *  tier renders and the number is what the claim publishes, and they must come
 *  from the same resolution rather than from two independent lookups of
 *  `scenePages`. */
function pageFromLabel(label: string): number | null {
  const m = label.match(/^p\. (\d+)$/);
  return m ? Number(m[1]) : null;
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

/** The gate fired: server/lib/logline.ts decided no single speaker holds enough of
 *  this script's dialogue to be its subject. A statement ABOUT THE SCRIPT, so it is
 *  only ever printed when the gate actually ran — see buildReaderTier's three
 *  logline states. */
export const NO_LOGLINE_NOTE =
  'Not derived \u2014 no single speaker holds enough of this script\u2019s dialogue for one.';

/** The same sentence with the HTML report's own sentence case (it opens the page as
 *  a standalone paragraph rather than following a "Logline." label). */
export const NO_LOGLINE_NOTE_HTML =
  'No logline was derived \u2014 no single speaker holds enough of this script\u2019s dialogue for one.';

/** Neither a logline NOR the script text to derive one from: the tier has no basis
 *  for either statement, and says so rather than printing the gate's sentence on no
 *  evidence. */
export const LOGLINE_UNKNOWN_NOTE =
  'Unavailable for this report (it was rendered without the script text).';

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
  else if (data.logline === null) lines.push(`**Logline.** ${NO_LOGLINE_NOTE}`);
  else lines.push(`**Logline.** ${LOGLINE_UNKNOWN_NOTE}`);
  lines.push('');
  lines.push(`**Length.** ${data.lengthLine}`);
  lines.push('');
  lines.push(`**Verdict.** ${data.verdictLabel} · ${data.healthLine}`);
  if (data.percentileLine) {
    lines.push('');
    lines.push(data.percentileLine);
  }
  if (data.boundsLine) {
    lines.push('');
    lines.push(`*Reference bounds: ${data.boundsLine}.*`);
  }
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
  lines.push(`Logline: ${data.logline
    ? data.logline
    : (data.logline === null ? NO_LOGLINE_NOTE : LOGLINE_UNKNOWN_NOTE)}`);
  lines.push(`Length: ${data.lengthLine}`);
  lines.push(`Verdict: ${data.verdictLabel} · ${data.healthLine}`);
  if (data.percentileLine) lines.push(data.percentileLine);
  if (data.boundsLine) lines.push(`Reference bounds: ${data.boundsLine}.`);
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
      : escape(data.logline === null ? NO_LOGLINE_NOTE_HTML : LOGLINE_UNKNOWN_NOTE)}</p>
    <div class="tier-facts">
      <div><span class="tier-key">Length</span> ${escape(data.lengthLine)}</div>
      <div><span class="tier-key">Verdict</span> ${verdictStamp
        ? verdictStamp(data.verdict)
        : escape(data.verdictLabel)} &middot; ${escape(data.healthLine)}</div>
    </div>${data.percentileLine ? `
    <p class="tier-bounds">${escape(data.percentileLine)}</p>` : ''}
${data.boundsLine ? `
    <p class="tier-bounds">Reference bounds: ${escape(data.boundsLine)}.</p>` : ''}
    <h2 class="tier-heading">${escape(data.prioritiesHeading)}</h2>
    ${prioritiesBlock}
  </section>
  <hr class="tier-divider" />`;
}
