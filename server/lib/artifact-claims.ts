// THE CLAIMS AN EXPORTED ARTIFACT CARRIES — one definition, written by both
// exporters and read by both verifiers.
//
// ── Why this exists (2026-09-12, adversarial finding BUG-1) ──────────────────
//
// The producer tier (server/lib/reader-tier.ts, 2026-09-11) put a scene count, a
// word count, an estimated page/minute figure, a per-finding page reference, a
// priorities heading that states a count, a percentile READING and the reference
// bounds on the one page a producer is told to trust — and every exported
// report's own verify block tells that producer to run `npm run verify-report`
// to confirm the document "was produced by the engine — not hand-edited".
//
// None of those numbers was in the claim set. `server/lib/verify-compare.ts`
// checked contentHash / health / verdict / totalIssues / healthPercentile /
// engineCommit / rulebookCount and nothing else, and the route's own zod schema
// had no field for a scene count, so even a caller who wanted to check one
// could not. Measured on `data/screenplays/chain-of-custody.fountain` (13
// scenes, 824 words, ~4 pages, one finding at p. 2): a hand edit to
// "9,999 scenes · 999,999 words · ~500 pages / ~500 min (est.)", a page
// reference moved to "p. 999" and a priorities heading changed to "The 9 things
// to fix first" printed `VERIFIED — authentic and reproducible under this
// engine.` at exit 0 in the HTML report, in the letter and in the raw report
// JSON.
//
// ── The rule this module enforces ───────────────────────────────────────────
//
// A claim cannot exist on the page without being in the verify block, because
// the page is rendered FROM this object. `buildReaderTier` builds an
// `ArtifactClaims` and then formats its own Length line out of it
// (`formatLengthLine` below); both exporters publish `tier.claims` through
// `claimRowsFor`; both verifiers read the same rows back through
// `decodeClaimRows` and recompute the same object from the script text. One
// label table, one encoder, one parser, one comparator.
//
// EVERY NUMBER HERE IS RECOMPUTED, NOT TRUSTED. The page references in
// particular are re-resolved through the same paginator the PDF export uses
// (server/lib/page-refs.ts -> src/lib/screenplay-layout.ts), so "is a number
// present" is never the check — "is it the page that number points at" is.
//
// Pure: no I/O, no clock, no randomness. NOT on the scoring path (nothing
// reachable from server/nvm/analyze/doctor.ts imports this module; it is a
// consumer of ScriptDoctorReport's shape, the same posture
// server/lib/verify-compare.ts's header documents for itself).

import type { CoverageVerdict, ScriptDoctorReport } from '../nvm/analyze/types.ts';
import { percentileCellFor } from '../../src/lib/percentile-copy.ts';

/** One finding's page reference, as a CLAIM: which leading finding it is (1-based,
 *  the order the tier prints), which rule produced it, its stable aggregation id
 *  when the report carries one, and the page its earliest implicated scene starts
 *  on (`null` for a finding with no resolvable page — omitted on the page, stated
 *  as "no page" here, never guessed).
 *
 *  `rule` AND `id` are both carried because they fail differently: `rule` is what
 *  a reader can see beside the finding, and `id` (doctor.ts's aggregation hash of
 *  pass + rule + normalized scene span) is what survives a relabeled location. A
 *  forger who moves a page number keeps both; a forger who swaps one finding's
 *  page for another's changes neither, which is exactly why the ORDINAL is part of
 *  the claim too. */
export interface ArtifactPageRef {
  ordinal: number;
  rule: string;
  id?: string;
  page: number | null;
}

/**
 * Everything an exported artifact states as a number or as a discrete reading.
 *
 * The first seven fields are the pre-2026-09-12 claim set (unchanged, same
 * labels, so every report exported before this change still parses). The rest
 * are the producer tier's, added by BUG-1.
 *
 * Optional means "this artifact shape does not state it", never "unchecked by
 * choice": a field absent from the block is absent from `checked` and the CLI
 * says so out loud (see scripts/verify-report.mjs's --help and the
 * tier-without-claims hard failure there — a document that RENDERS a producer
 * tier whose numbers its block does not publish is refused, not waved through).
 */
export interface ArtifactClaims {
  contentHash?: string;
  health: number;
  verdict?: CoverageVerdict;
  totalIssues: number;
  healthPercentile?: number;
  engineCommit?: string;
  rulebookCount?: number;

  /** The tier's Length line, as numbers. */
  sceneCount: number;
  wordCount: number;
  /** From ScriptDoctorReport.pageEstimate — absent on a report that carries none. */
  estimatedPages?: number;
  estimatedRuntimeMinutes?: number;

  /** The count the priorities heading states ("The 3 things to fix first" -> 3,
   *  "Fix this first" -> 1, "Nothing urgent surfaced" -> 0). */
  prioritiesListed: number;

  /** The DISCRETE reading: a band ("top 10%") or "not comparable". Not the raw
   *  percentile — the tier deliberately never prints an exact ordinal (D5 false
   *  precision, src/lib/percentile-copy.ts), so the claim is the reading the
   *  document actually makes. Absent when the report carries no percentile. */
  percentileReading?: string;

  /** "20 samples / 9–10 scenes / 256–337 words" — the frame the percentile is
   *  measured against, stated on the page either as its own line or inside the
   *  not-comparable sentence's parenthetical (reader-tier.ts's rule 4). */
  referenceBounds: string;

  /** Whether the document states a logline or states that none was derived.
   *  Absent when the artifact was rendered with neither a logline nor the script
   *  text to derive one from — in which case the page says exactly that. */
  loglineState?: LoglineState;

  /** One entry per leading finding, in the order the tier prints them. Absent
   *  when the artifact was rendered without the script text (no pagination is
   *  possible, and the page states that too). */
  pageRefs?: ArtifactPageRef[];
}

export type LoglineState = 'derived' | 'not derived';

/** The tier's Length line, formatted from the claims it states.
 *
 *  THE FORMATTER AND THE PARSER LIVE TOGETHER, deliberately: `parseLengthLine`
 *  below is the verifier's inverse of this function, and
 *  tests/core/artifact-claims.test.ts round-trips every shape through both. A
 *  formatter in reader-tier.ts and a regex in the CLI is the two-implementations-
 *  drift-apart pattern that let the 2026-09-11 verdict-stamp scrape silently stop
 *  firing when the stamp's tag changed. */
export function formatLengthLine(claims: Pick<
  ArtifactClaims, 'sceneCount' | 'wordCount' | 'estimatedPages' | 'estimatedRuntimeMinutes'
>): string {
  const pageEstimate = typeof claims.estimatedPages === 'number'
    && typeof claims.estimatedRuntimeMinutes === 'number'
    ? ` · ~${formatCount(claims.estimatedPages)} page${claims.estimatedPages === 1 ? '' : 's'}`
      + ` / ~${formatCount(claims.estimatedRuntimeMinutes)} min (est.)`
    : '';
  return `${formatCount(claims.sceneCount)} scene${claims.sceneCount === 1 ? '' : 's'}`
    + ` · ${formatCount(claims.wordCount)} word${claims.wordCount === 1 ? '' : 's'}${pageEstimate}`;
}

function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

/** Digits with optional thousands separators, back to a number. Returns NaN for
 *  anything else INCLUDING the empty string — `Number('')` is 0, which would turn
 *  a deleted claim value into a confident "0 scenes" mismatch instead of the
 *  honest "this claim is unreadable" failure the 2026-09-06 NaN review installed. */
export function parseCount(raw: string | undefined | null): number {
  if (typeof raw !== 'string') return NaN;
  const trimmed = raw.trim();
  if (trimmed === '' || !/^-?\d[\d,]*(?:\.\d+)?$/.test(trimmed)) return NaN;
  return Number(trimmed.replace(/,/g, ''));
}

const LENGTH_LINE_RE = new RegExp(
  '(\\d[\\d,]*) scenes? \\u00b7 (\\d[\\d,]*) words?'
  + '(?: \\u00b7 ~(\\d[\\d,]*) pages? / ~(\\d[\\d,]*) min \\(est\\.\\))?',
);

export interface ParsedLengthLine {
  sceneCount: number;
  wordCount: number;
  estimatedPages?: number;
  estimatedRuntimeMinutes?: number;
}

/** The inverse of `formatLengthLine` — reads the Length line out of any artifact
 *  body (the HTML tier's `<span class="tier-key">Length</span> …`, the letter's
 *  `**Length.** …`/`Length: …`, and the letter's own headline, which restates the
 *  same three numbers in the same format). `null` when no Length line is present. */
export function parseLengthLine(text: string): ParsedLengthLine | null {
  const m = text.match(LENGTH_LINE_RE);
  if (!m) return null;
  const parsed: ParsedLengthLine = {
    sceneCount: parseCount(m[1]),
    wordCount: parseCount(m[2]),
  };
  if (m[3] !== undefined) parsed.estimatedPages = parseCount(m[3]);
  if (m[4] !== undefined) parsed.estimatedRuntimeMinutes = parseCount(m[4]);
  return parsed;
}

// ── The verdict word, and the health line ────────────────────────────────────
// ONE map, and ONE formatter/parser pair, because the producer tier is a SECOND
// rendering of the verdict and health the report already states — and on 2026-09-12
// investigator A proved that second rendering was not checked by anything: a letter
// whose page-one line was edited to `**Verdict.** RECOMMEND · Health 94.6 / 100`
// printed VERIFIED at exit 0 (docs/audits/2026-09-12-adversarial/writer-loop.md
// finding 2). The CLI's letter parser read `**Verdict:`(colon) and
// `Health 74.6/100`(no spaces); the tier writes `**Verdict.**` and
// `Health 74.6 / 100`. Neither matched, and the forgery guard covered the header's
// health-number, the stamp and the plainSummary sentence — not the tier.
//
// The word map had THREE hand-copies at that point (coverage-html.ts's
// VERDICT_STYLE.label, coverage-letter.ts's VERDICT_LABEL, reader-tier.ts's
// VERDICT_WORD) and the CLI carried a fourth as an inverse. All four now come from
// here, so a rendering cannot be added or reworded without the scraper's own
// round-trip test (tests/core/artifact-claims.test.ts) following it.

/** The verdict word a reader sees. PASS carries its parenthetical because "PASS"
 *  reads as approval to anyone outside coverage culture — the single most commonly
 *  misread word in a coverage document, so the parenthetical is load-bearing, not
 *  decor. */
export const VERDICT_WORD: Record<CoverageVerdict, string> = {
  RECOMMEND: 'RECOMMEND',
  CONSIDER: 'CONSIDER',
  PASS: 'PASS (decline)',
};

/** What every surface prints for a report with no verdict at all. */
export const UNKNOWN_VERDICT_WORD = 'N/A';

/** The inverse of `VERDICT_WORD`: the enum a printed word means, or `null` for a
 *  word that is not one of the three (including 'N/A'). Accepts the bare enum name
 *  as well as the reader-facing word, because the machine-readable claim row prints
 *  `CONSIDER` while the page prints `PASS (decline)`. */
export function verdictFromWord(word: string): CoverageVerdict | null {
  const trimmed = word.trim();
  for (const [verdict, label] of Object.entries(VERDICT_WORD)) {
    if (trimmed === label || trimmed === verdict) return verdict as CoverageVerdict;
  }
  return null;
}

/** "Health 76.3 / 100" — the tier's headline reading, stated once. */
export function formatHealthLine(health: number): string {
  return `Health ${health.toFixed(1)} / 100`;
}

/** The inverse: the health figure the TIER's reading states, or `null`.
 *
 *  The spaces around the slash are what distinguish this rendering from the
 *  coverage letter's headline (`Health 66.7/100 (Fair) · …`), which is a different
 *  rendering with its own scrape — and getting that distinction wrong in the
 *  other direction is exactly how the tier's reading went unchecked. */
export function parseHealthLine(text: string): number | null {
  const m = text.match(/Health (\d+(?:\.\d+)?) \/ 100/);
  return m ? Number(m[1]) : null;
}

/** The verdict word and the health figure the TIER states, read back out of either
 *  letter renderer's combined line (`**Verdict.** CONSIDER · Health 76.3 / 100` in
 *  markdown, `Verdict: …` in plain text). `null` when the line is absent.
 *
 *  The HTML tier states the same two facts as a stamp plus the same health reading,
 *  so the CLI reads its verdict from the stamp it already scrapes and its health
 *  through `parseHealthLine` — see scripts/verify-report.mjs. */
export function parseLetterTierVerdictLine(
  tierText: string,
): { verdictWord: string; health: number | null } | null {
  const m = tierText.match(/^(?:\*\*Verdict\.\*\* |Verdict: )(.+?) \u00b7 (Health .+)$/m);
  if (!m) return null;
  return { verdictWord: m[1].trim(), health: parseHealthLine(m[2]) };
}

/** The percentile READING stated in a body of text: "not comparable", or the band
 *  out of `healthPercentileSentence`. `null` when the text states neither.
 *
 *  Pinned by a round-trip test over every band `percentileBand` can produce, so a
 *  reworded sentence fails CI here rather than silently disabling this scrape. */
export function percentileReadingFromText(text: string): string | null {
  if (/not comparable/.test(text)) return 'not comparable';
  const m = text.match(/Health percentile:\s*((?:top|bottom) \d+%)/);
  return m ? m[1] : null;
}

/** The reference bounds stated in a body of text — as its own "Reference bounds:"
 *  line OR inside the not-comparable sentence's parenthetical, which is the same
 *  string either way (reader-tier.ts's rule 4 is what guarantees exactly one of
 *  the two renders). `null` when neither is present. */
export function referenceBoundsFromText(text: string): string | null {
  const m = text.match(/(\d+ samples \/ \d+(?:–\d+)? scenes \/ \d+(?:–\d+)? words)/);
  return m ? m[1] : null;
}

// ── Page-reference encoding ──────────────────────────────────────────────────
// One line of text, because the claim has to survive a `<dd><code>` in an HTML
// report AND a plain `Label: value` line in a markdown/plain-text letter. The
// shape is deliberately readable — a producer reading the block should be able to
// see which finding points at which page without a decoder ring:
//
//   1 NO_REVERSALS_LONG_STORY#9bed77ed917160b0 no page; 2 WEAK_MIDPOINT#db08… p. 2
//
// `#<id>` is omitted for a finding with no aggregation id (a legacy report shape).
// Rules are UPPER_SNAKE constants and ids are hex, so neither can contain the
// '; ' separator, the '#', or a space.

export const PAGE_REFS_UNAVAILABLE = 'unavailable (rendered without the script text)';

export function encodePageRefs(refs: readonly ArtifactPageRef[]): string {
  if (refs.length === 0) return 'none';
  return refs
    .map(r => `${r.ordinal} ${r.rule}${r.id ? `#${r.id}` : ''} ${r.page === null ? 'no page' : `p. ${r.page}`}`)
    .join('; ');
}

const PAGE_REF_RE = /^(\d+) ([^\s#]+)(?:#([^\s#]+))? (?:p\. (\d+)|no page)$/;

/** The inverse of `encodePageRefs`. Returns `null` for a value that is not a
 *  well-formed encoding at all (so the caller reports an unreadable claim rather
 *  than silently checking nothing), and an empty array for the explicit "none".
 *  A malformed PAGE inside an otherwise well-formed entry comes back as NaN so
 *  the zod schema refuses it — never as 0 or as "no page". */
export function decodePageRefs(raw: string): ArtifactPageRef[] | null {
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === PAGE_REFS_UNAVAILABLE) return null;
  if (trimmed === 'none') return [];
  const out: ArtifactPageRef[] = [];
  for (const entry of trimmed.split(';')) {
    const m = entry.trim().match(PAGE_REF_RE);
    if (!m) return null;
    const ref: ArtifactPageRef = {
      ordinal: parseCount(m[1]),
      rule: m[2],
      page: m[4] === undefined ? null : parseCount(m[4]),
    };
    if (m[3] !== undefined) ref.id = m[3];
    out.push(ref);
  }
  return out;
}

/** The pages, in order, that a document BODY points its findings at — the HTML
 *  tier's `<span class="tier-page">p. 4</span>` run, or the letter's
 *  `— p. 4` suffixes. Only resolved pages render on the page (an unresolved
 *  reference is omitted, never printed as "p. ?"), so this is the ordered list of
 *  NON-NULL pages, which is what `resolvedPages` below produces from the claim for
 *  comparison. */
export function resolvedPages(refs: readonly ArtifactPageRef[]): number[] {
  return refs.filter(r => r.page !== null).map(r => r.page as number);
}

// ── The claim rows an artifact publishes ─────────────────────────────────────
// ONE label table. The first four and the last two labels are verbatim what
// coverage-html.ts's verify block published before 2026-09-12 — changing one
// would make every report exported before today unparseable, which is the
// back-compatibility the 2026-09-11 verdict-stamp fix already paid for once.

export type ClaimFieldKind = 'hash' | 'fixed1' | 'verdict' | 'int' | 'text' | 'logline' | 'pageRefs';

export interface ClaimRowSpec {
  label: string;
  field: keyof ArtifactClaims;
  kind: ClaimFieldKind;
}

export const CLAIM_ROW_SPECS: readonly ClaimRowSpec[] = [
  { label: 'Script-text hash (SHA-256, full)', field: 'contentHash', kind: 'hash' },
  { label: 'Health', field: 'health', kind: 'fixed1' },
  { label: 'Verdict', field: 'verdict', kind: 'verdict' },
  { label: 'Total issues', field: 'totalIssues', kind: 'int' },
  { label: 'Scenes', field: 'sceneCount', kind: 'int' },
  { label: 'Words', field: 'wordCount', kind: 'int' },
  { label: 'Estimated pages', field: 'estimatedPages', kind: 'int' },
  { label: 'Estimated runtime (minutes)', field: 'estimatedRuntimeMinutes', kind: 'int' },
  { label: 'Priorities listed', field: 'prioritiesListed', kind: 'int' },
  { label: 'Health percentile reading', field: 'percentileReading', kind: 'text' },
  { label: 'Reference bounds', field: 'referenceBounds', kind: 'text' },
  { label: 'Logline', field: 'loglineState', kind: 'logline' },
  { label: 'Page references', field: 'pageRefs', kind: 'pageRefs' },
  { label: 'Engine commit', field: 'engineCommit', kind: 'text' },
  { label: 'Rulebook count', field: 'rulebookCount', kind: 'int' },
];

/** The labels that only a producer-tier artifact publishes. A document that
 *  RENDERS a tier must publish all of these (see `TIER_CLAIM_LABELS`'s use in
 *  scripts/verify-report.mjs): a tier with no tier claims is a report whose
 *  reader-facing numbers cannot be checked, and is refused rather than verified
 *  on the strength of the claims that happen to remain. */
export const TIER_CLAIM_LABELS: readonly string[] = [
  'Scenes', 'Words', 'Priorities listed', 'Reference bounds', 'Page references',
];

/** The claims the coverage LETTER states in its own prose footer instead of as a
 *  labelled row — see `claimRowsFor`'s `omit`. Named here rather than spelled at
 *  the call site so the letter's parser and the letter's renderer agree about which
 *  rows to expect. */
export const LETTER_PROSE_CLAIMS: ReadonlyArray<keyof ArtifactClaims> = [
  'contentHash', 'engineCommit', 'rulebookCount',
];

/**
 * WHAT THE VERIFIER CHECKS, AND WHAT IT DOES NOT — stated on the artifact itself,
 * in both exported shapes, and restated verbatim in `npm run verify-report
 * --help`.
 *
 * The 2026-09-12 finding was not only that the tier's numbers went unchecked: it
 * was that NOTHING said so. "Anyone with the original script text can confirm it
 * was produced by the engine — not hand-edited" was printed beside a page of
 * numbers a hand edit could move freely, and no file in the repository — not the
 * CLI, not the comparator, not either brain Surface note — recorded a single field
 * as deliberately unchecked. A gap that is written down is a scope; a gap that is
 * not is a false promise. This sentence is the scope.
 *
 * The exclusions are all one kind of thing: text a human supplied rather than the
 * engine derived (the title, the author, the draft-rank line), or the engine's own
 * PROSE, which a verifier re-running the engine can compare only by recomputing
 * the same sentences — something the recomputation does do for the numbers
 * underneath every one of those sentences (health, verdict, totals, counts,
 * readings, pages), which is what makes a forged description a forgery with no
 * number behind it to move.
 */
export const VERIFY_SCOPE_SENTENCE =
  'What is checked: every value listed above, recomputed from the script text you supply — '
  + 'including each finding’s page reference, re-resolved through the same paginator that lays '
  + 'out the PDF, and the counts and readings on the reader summary page. What is not checked: '
  + 'wording — the prose of this report, the finding descriptions, the logline’s text (only '
  + 'whether one was derived), the title and author, and the draft-rank line, all of which are '
  + 'supplied by whoever exported this report rather than derived by the engine.';

export interface ClaimRow { label: string; value: string }

/**
 * The rows an artifact publishes for these claims, in table order, skipping every
 * field the artifact does not state.
 *
 * `omit` exists for the coverage LETTER, which already states three of these in its
 * own prose footer and has since before this module existed: the script-text hash
 * (`Script-text hash (SHA-256): <64 hex>`) and the engine identity
 * (`Engine commit: <sha> · Rulebook: <n> rule concepts.`). Printing them again here
 * would be the same fact twice a centimetre apart — the exact rule the producer
 * tier exists to enforce — and the CLI's letter parser already reads both from
 * those lines. The letter and the HTML report therefore publish the same CLAIMS;
 * only the markup differs, which is the one difference two renderers over one data
 * object are allowed (see coverage-letter.ts's own LetterData note).
 */
export function claimRowsFor(
  claims: ArtifactClaims,
  opts: { omit?: ReadonlyArray<keyof ArtifactClaims> } = {},
): ClaimRow[] {
  const omit = new Set<string>(opts.omit ?? []);
  const rows: ClaimRow[] = [];
  for (const spec of CLAIM_ROW_SPECS) {
    if (omit.has(spec.field)) continue;
    const value = claims[spec.field];
    if (value === undefined || value === null) {
      // The one claim whose ABSENCE is itself stated rather than omitted: a
      // report rendered without the script text resolves no page references at
      // all, and the tier says so on the page (reader-tier.ts's
      // NO_PAGE_REFS_NOTE). The block must say the same thing, or a forger could
      // delete the row and claim the document never referenced a page.
      if (spec.field === 'pageRefs') rows.push({ label: spec.label, value: PAGE_REFS_UNAVAILABLE });
      continue;
    }
    rows.push({ label: spec.label, value: formatClaimValue(spec, value) });
  }
  return rows;
}

function formatClaimValue(spec: ClaimRowSpec, value: unknown): string {
  switch (spec.kind) {
    case 'fixed1': return (value as number).toFixed(1);
    case 'int': return String(value as number);
    case 'pageRefs': return encodePageRefs(value as ArtifactPageRef[]);
    default: return String(value);
  }
}

/**
 * The inverse: a label -> raw-string map scraped out of an artifact, decoded into
 * a `VerifyExpected`-shaped object of typed fields.
 *
 * Every numeric field comes back as NaN rather than 0/undefined when its printed
 * value is not a readable number (including the empty string), so
 * `validateVerifyExpected`'s zod pass refuses it and the caller reports "claim
 * unreadable" — the 2026-09-06 round-2 finding that `Math.abs(NaN - x) >
 * tolerance` is `false`, and therefore an unreadable claim read as a PASSING one,
 * applies to every field added here, not only to health.
 */
export function decodeClaimRows(rows: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const spec of CLAIM_ROW_SPECS) {
    const raw = rows[spec.label];
    if (raw === undefined) continue;
    switch (spec.kind) {
      case 'hash':
      case 'verdict':
      case 'text':
      case 'logline':
        out[spec.field] = raw.trim();
        break;
      case 'fixed1':
      case 'int':
        out[spec.field] = parseCount(raw);
        break;
      case 'pageRefs': {
        if (raw.trim() === PAGE_REFS_UNAVAILABLE) break; // states "no page refs" — nothing to check
        const decoded = decodePageRefs(raw);
        // A value that is present but not decodable must NOT vanish: hand back the
        // raw string so zod rejects it as an unreadable pageRefs claim.
        out[spec.field] = decoded === null ? raw.trim() : decoded;
        break;
      }
    }
  }
  return out;
}

// ── Building the claims ──────────────────────────────────────────────────────

export interface ArtifactClaimsInput {
  /** The count the priorities heading states — the number of findings the tier
   *  actually leads with, after suppression and the TIER_PRIORITY_COUNT cap. */
  prioritiesListed: number;
  /** null when the artifact was rendered with neither a logline nor the script
   *  text to derive one from. */
  loglineState: LoglineState | null;
  /** null when the artifact was rendered without the script text. */
  pageRefs: ArtifactPageRef[] | null;
  /** The bounds line the page states (server/lib/reference-bounds.ts's derived
   *  value — passed in rather than imported here so this module stays free of the
   *  1,900-line calibration corpus import). */
  referenceBounds: string;
}

/**
 * Assemble the full claim set from the report and the tier's own rendered values.
 *
 * Called from exactly one place: `buildReaderTier` (server/lib/reader-tier.ts),
 * which then formats its Length line out of the result. That is what makes the
 * block and the page one statement rather than two.
 */
export function buildArtifactClaims(
  report: ScriptDoctorReport,
  input: ArtifactClaimsInput,
): ArtifactClaims {
  const claims: ArtifactClaims = {
    health: report.health,
    totalIssues: report.totalIssues,
    sceneCount: report.sceneCount,
    wordCount: report.wordCount,
    prioritiesListed: input.prioritiesListed,
    referenceBounds: input.referenceBounds,
  };
  if (report.contentHash) claims.contentHash = report.contentHash;
  if (report.verdict) claims.verdict = report.verdict;
  if (typeof report.healthPercentile === 'number') {
    claims.healthPercentile = report.healthPercentile;
    claims.percentileReading = percentileCellFor(
      report.healthPercentile, report.sceneCount, report.wordCount,
    );
  }
  if (report.pageEstimate) {
    claims.estimatedPages = report.pageEstimate.pages;
    claims.estimatedRuntimeMinutes = report.pageEstimate.runtimeMinutes;
  }
  if (report.provenance) {
    claims.engineCommit = report.provenance.engineCommit;
    claims.rulebookCount = report.provenance.rulebookCount;
  }
  if (input.loglineState !== null) claims.loglineState = input.loglineState;
  if (input.pageRefs !== null) claims.pageRefs = input.pageRefs;
  return claims;
}
