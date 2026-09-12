// Shared comparator behind the determinism badge: POST /api/export/verify
// (server/routes/export.ts) and the offline `npm run verify-report` CLI
// (scripts/verify-report.mjs) both need to answer the exact same question —
// "does this report's claimed hash/score/engine-identity match what the
// engine actually computes for this script text, right now" — with the
// exact same tolerance and the exact same hard/soft mismatch classification.
// Before this file existed that logic lived inline in the route handler; the
// CLI would otherwise have had to re-type the 0.05 tolerance and the
// engine-identity soft-mismatch carve-out as a second copy, which is exactly
// the "a second implementation of a threshold is a defect" pattern
// docs/LANE_STANDARD.md §1 names. Extracted verbatim (no behavior change) —
// server/routes/export.ts's own tests (tests/routes/export-verify.test.ts)
// are the receipt that the extraction didn't move anything.
//
// NOT on the doctor.ts import graph in the reverse direction: this module is
// a CONSUMER of ScriptDoctorReport's shape (imported by the route and by the
// CLI), never imported BY server/nvm/analyze/doctor.ts itself, so it carries
// no scoring-receipt obligation (scripts/check-scoring-receipt.mjs classifies
// by reachability FROM doctor.ts, and nothing reachable from doctor.ts
// imports this file).
import type { CoverageVerdict, ScriptDoctorReport } from '../nvm/analyze/types.ts';
import { VerifyExpectedSchema } from './validation.ts';
import { buildReaderTier } from './reader-tier.ts';
import {
  encodePageRefs, resolvedPages,
  type ArtifactClaims, type ArtifactPageRef, type LoglineState,
} from './artifact-claims.ts';

export interface VerifyExpected {
  contentHash: string;
  health?: number;
  verdict?: CoverageVerdict;
  totalIssues?: number;
  healthPercentile?: number;
  engineCommit?: string;
  rulebookCount?: number;
  // The producer tier's claims (2026-09-12, BUG-1) — every number and discrete
  // reading server/lib/reader-tier.ts puts on the first page. Same optionality
  // rule as every field above: present in `expected` means the artifact stated
  // it, so it is checked; absent means the artifact's shape does not state it.
  sceneCount?: number;
  wordCount?: number;
  estimatedPages?: number;
  estimatedRuntimeMinutes?: number;
  prioritiesListed?: number;
  percentileReading?: string;
  referenceBounds?: string;
  loglineState?: LoglineState;
  pageRefs?: ArtifactPageRef[];
}

/** `detail` (2026-09-12) carries the one extra sentence a list-valued mismatch
 *  needs — "finding 2 (WEAK_MIDPOINT) claims p. 999, the engine resolves p. 2" —
 *  which `expected`/`actual` alone cannot say for a page-reference list without
 *  making a reader diff two encoded strings by eye. Optional and additive: every
 *  scalar field still reports exactly as it did. */
export interface VerifyMismatch { field: string; expected: unknown; actual: unknown; detail?: string }

export type MismatchKind = 'content_mismatch' | 'score_mismatch' | 'engine_mismatch' | null;

export interface VerifyRecomputed {
  contentHash: string;
  health?: number;
  verdict?: CoverageVerdict;
  totalIssues?: number;
  healthPercentile?: number;
  engineCommit?: string;
  rulebookCount?: number;
  sceneCount?: number;
  wordCount?: number;
  estimatedPages?: number;
  estimatedRuntimeMinutes?: number;
  prioritiesListed?: number;
  percentileReading?: string;
  referenceBounds?: string;
  loglineState?: LoglineState;
  pageRefs?: ArtifactPageRef[];
  structuralSignals?: { meanAbsDialogueShareDelta: number; actionSentenceCvOverall: number };
}

export interface VerifyCompareResult {
  verified: boolean;
  mismatchKind: MismatchKind;
  message?: string;
  checked: string[];
  mismatches: VerifyMismatch[];
  recomputed: VerifyRecomputed;
}

// health/healthPercentile are displayed and typically re-typed/re-serialized
// as one-decimal numbers (coverage-html.ts's `.toFixed(1)`, doctor.ts's
// Math.round(x*10)/10 for health; healthPercentile is unrounded but derived
// from the same one-decimal-rounded inputs upstream) — a caller quoting a
// number back from a printed/exported report, or whose own JSON round-trip
// reformatted a float, can legitimately differ from the freshly computed
// value by less than one full unit in the last decimal place. 0.05 is half of
// that one-decimal step: it accepts any difference explainable purely by
// display/round-trip rounding while still catching a genuinely wrong number.
export const VERIFY_FLOAT_TOLERANCE = 0.05;

// engineCommit/rulebookCount are the ONLY two `expected` fields that describe
// the ENGINE rather than the script's content or score. A mismatch confined
// to this set — the content hash matched, and every content/score field that
// WAS checked also matched — means the report is authentic for this script
// but was produced by a different build of the engine than is running now: a
// soft, advisory outcome ("re-run to confirm under the current engine"),
// never a sign of tampering. Any mismatch outside this set is a hard failure
// regardless of what else does or doesn't match.
export const ENGINE_IDENTITY_FIELDS = new Set(['engineCommit', 'rulebookCount']);

export const ENGINE_MISMATCH_MESSAGE =
  'The engine has moved since this report was produced. The script content and score both still ' +
  'check out — re-run this verification to confirm under the current engine.';

export interface ClaimValidationFailure { field: string; message: string }

/**
 * Validates a parsed `expected` claims object against the SAME zod schema
 * `POST /api/export/verify` enforces via `validate(VerifyBodySchema)`
 * BEFORE its handler (and therefore `checkContentHash`/`compareVerifyClaims`
 * below) ever runs. The route is safe from a malformed claim by construction
 * — zod already ran. A caller that assembles `expected` by hand from a
 * rendered artifact (the verify-report CLI, scraping HTML/markdown with
 * regexes, or `JSON.parse`) has no such gate in front of it, and needs one:
 * round-2 review finding 1 (2026-09-06) — a health claim the CLI's regex
 * parser could not read as a number (`Number('OUTSTANDING')` is `NaN`, and
 * so is `Number('6.5.0')` matched by a `[\d.]+` capture) reached
 * `compareVerifyClaims` unvalidated. `Math.abs(NaN - report.health) >
 * VERIFY_FLOAT_TOLERANCE` evaluates to `false` — every comparison against
 * `NaN` does — so the mismatch that could not be computed was silently
 * treated as no mismatch at all, and the CLI printed `VERIFIED`, exit 0, on
 * a report whose health claim was not even readable. Importing this schema
 * (not re-declaring a second one) is what guarantees the CLI rejects
 * exactly what this route would reject with 400 — the same `z.number()`
 * already refuses `NaN` and any out-of-range value; the same `z.enum(...)`
 * already refuses a verdict string that isn't one of the three real values.
 * Returns `null` when every present field validates; otherwise the first
 * failing field (by schema declaration order) and zod's own message.
 */
export function validateVerifyExpected(candidate: Record<string, unknown>): ClaimValidationFailure | null {
  const result = VerifyExpectedSchema.safeParse(candidate);
  if (result.success) return null;
  const issue = result.error.issues[0];
  const field = issue.path.length > 0 ? String(issue.path[0]) : '(unknown field)';
  return { field, message: issue.message };
}

/**
 * Cheap-first content-hash check, shared by the route (which must decide
 * whether to pay for a doctor run BEFORE running it) and the CLI (which
 * reports "authentic: no" without needing to reason about score fields at
 * all when the text itself doesn't match). Returns a full content_mismatch
 * VerifyCompareResult when the hashes disagree, or `null` when they match
 * (the caller should proceed to run the doctor and call compareVerifyClaims
 * below). Deliberately does not touch `report` — the whole point is that no
 * report field is even meaningful to compare once the text itself is wrong.
 */
export function checkContentHash(actualContentHash: string, expected: VerifyExpected): VerifyCompareResult | null {
  if (actualContentHash === expected.contentHash) return null;
  return {
    verified: false,
    mismatchKind: 'content_mismatch',
    checked: ['contentHash'],
    mismatches: [{ field: 'contentHash', expected: expected.contentHash, actual: actualContentHash }],
    recomputed: { contentHash: actualContentHash },
  };
}

/**
 * The full field-by-field comparison, run once a doctor pass exists for the
 * submitted text. Assumes the caller already confirmed
 * `report.contentHash === expected.contentHash` (via checkContentHash above)
 * — 'contentHash' is unconditionally reported as checked-and-matching here,
 * exactly as the route's inline version did before this extraction.
 */
export function compareVerifyClaims(
  report: ScriptDoctorReport,
  expected: VerifyExpected,
  /** The script text the hash already matched. REQUIRED in practice — both
   *  callers hold it (the route has the submitted body, the CLI has the file) —
   *  and it is what makes the producer tier's claims checkable at all: the page
   *  references are re-resolved through the real paginator and the logline state
   *  is re-derived from the text, neither of which a report object alone can
   *  supply. Defaulted to '' so an old two-argument call still type-checks and
   *  still checks every pre-2026-09-12 field; the tier claims then recompute as
   *  ABSENT, which reports as a mismatch rather than as a silent pass. */
  fountain: string = '',
): VerifyCompareResult {
  const checked: string[] = ['contentHash'];
  const mismatches: VerifyMismatch[] = [];

  // The tier's claims, RECOMPUTED — not read off the report. buildReaderTier is
  // the same function both exporters render the first page from, called here with
  // only the script text, so the scene/word/page-estimate figures, the priorities
  // count, the percentile reading, the reference bounds, the logline state and
  // every per-finding page reference come back exactly as a genuine export would
  // have stated them. Page references in particular go through
  // server/lib/page-refs.ts -> src/lib/screenplay-layout.ts, the same paginator
  // src/lib/pdf.ts lays the PDF out with.
  const actualClaims = recomputeArtifactClaims(report, fountain);

  if (expected.health !== undefined) {
    checked.push('health');
    if (Math.abs(expected.health - report.health) > VERIFY_FLOAT_TOLERANCE) {
      mismatches.push({ field: 'health', expected: expected.health, actual: report.health });
    }
  }
  if (expected.verdict !== undefined) {
    checked.push('verdict');
    if (expected.verdict !== report.verdict) {
      mismatches.push({ field: 'verdict', expected: expected.verdict, actual: report.verdict });
    }
  }
  if (expected.totalIssues !== undefined) {
    checked.push('totalIssues');
    if (expected.totalIssues !== report.totalIssues) {
      mismatches.push({ field: 'totalIssues', expected: expected.totalIssues, actual: report.totalIssues });
    }
  }
  if (expected.healthPercentile !== undefined) {
    checked.push('healthPercentile');
    const actualPercentile = report.healthPercentile;
    if (actualPercentile === undefined || Math.abs(expected.healthPercentile - actualPercentile) > VERIFY_FLOAT_TOLERANCE) {
      mismatches.push({ field: 'healthPercentile', expected: expected.healthPercentile, actual: actualPercentile });
    }
  }
  // ── The producer tier's claims (2026-09-12, BUG-1) ────────────────────────
  // Exact comparisons, all of them: these are integers, discrete readings and a
  // fixed bounds string, so the 0.05 display-rounding tolerance that health and
  // healthPercentile need has no business here — a scene count is never "13.04".
  compareExact('sceneCount', expected.sceneCount, actualClaims.sceneCount);
  compareExact('wordCount', expected.wordCount, actualClaims.wordCount);
  compareExact('estimatedPages', expected.estimatedPages, actualClaims.estimatedPages);
  compareExact('estimatedRuntimeMinutes', expected.estimatedRuntimeMinutes, actualClaims.estimatedRuntimeMinutes);
  compareExact('prioritiesListed', expected.prioritiesListed, actualClaims.prioritiesListed);
  compareExact('percentileReading', expected.percentileReading, actualClaims.percentileReading);
  compareExact('referenceBounds', expected.referenceBounds, actualClaims.referenceBounds);
  compareExact('loglineState', expected.loglineState, actualClaims.loglineState);

  if (expected.pageRefs !== undefined) {
    checked.push('pageRefs');
    const detail = pageRefsDisagreement(expected.pageRefs, actualClaims.pageRefs);
    if (detail !== null) {
      mismatches.push({
        field: 'pageRefs',
        expected: encodePageRefs(expected.pageRefs),
        actual: actualClaims.pageRefs ? encodePageRefs(actualClaims.pageRefs) : undefined,
        detail,
      });
    }
  }

  // engineCommit/rulebookCount, checked the same way as every field above
  // (exact string / exact int — no float tolerance needed), but kept out of
  // `hardMismatches` below so a difference confined to these two fields
  // reports as the soft engine_mismatch outcome, never as a content or score
  // failure.
  if (expected.engineCommit !== undefined) {
    checked.push('engineCommit');
    const actualEngineCommit = report.provenance?.engineCommit;
    if (actualEngineCommit === undefined || expected.engineCommit !== actualEngineCommit) {
      mismatches.push({ field: 'engineCommit', expected: expected.engineCommit, actual: actualEngineCommit });
    }
  }
  if (expected.rulebookCount !== undefined) {
    checked.push('rulebookCount');
    const actualRulebookCount = report.provenance?.rulebookCount;
    if (actualRulebookCount === undefined || expected.rulebookCount !== actualRulebookCount) {
      mismatches.push({ field: 'rulebookCount', expected: expected.rulebookCount, actual: actualRulebookCount });
    }
  }

  function compareExact<T>(field: string, expectedValue: T | undefined, actualValue: T | undefined): void {
    if (expectedValue === undefined) return;
    checked.push(field);
    if (expectedValue !== actualValue) {
      mismatches.push({ field, expected: expectedValue, actual: actualValue });
    }
  }

  const hardMismatches = mismatches.filter((m) => !ENGINE_IDENTITY_FIELDS.has(m.field));
  const engineMismatches = mismatches.filter((m) => ENGINE_IDENTITY_FIELDS.has(m.field));
  const mismatchKind: MismatchKind = hardMismatches.length > 0
    ? 'score_mismatch'
    : engineMismatches.length > 0
      ? 'engine_mismatch'
      : null;

  return {
    // `verified` reflects content/score correctness ONLY — an engine-only
    // mismatch does not flip it false, because the report IS authentic for
    // this script and this score; `mismatchKind`/`mismatches` still surface
    // the engine difference for a caller that cares.
    verified: hardMismatches.length === 0,
    mismatchKind,
    ...(mismatchKind === 'engine_mismatch' ? { message: ENGINE_MISMATCH_MESSAGE } : {}),
    checked,
    mismatches,
    recomputed: {
      contentHash: report.contentHash ?? expected.contentHash,
      health: report.health,
      verdict: report.verdict,
      totalIssues: report.totalIssues,
      healthPercentile: report.healthPercentile,
      engineCommit: report.provenance?.engineCommit,
      rulebookCount: report.provenance?.rulebookCount,
      // The recomputed tier claims, always reported (not only when a caller
      // claimed them) so an HTTP caller that scraped nothing can still SEE what
      // the engine says the first page should read — the same posture
      // structuralSignals below already takes, except that these fields ARE
      // checkable and every one of them can move `verified`.
      sceneCount: actualClaims.sceneCount,
      wordCount: actualClaims.wordCount,
      ...(actualClaims.estimatedPages !== undefined ? { estimatedPages: actualClaims.estimatedPages } : {}),
      ...(actualClaims.estimatedRuntimeMinutes !== undefined
        ? { estimatedRuntimeMinutes: actualClaims.estimatedRuntimeMinutes } : {}),
      prioritiesListed: actualClaims.prioritiesListed,
      ...(actualClaims.percentileReading !== undefined ? { percentileReading: actualClaims.percentileReading } : {}),
      referenceBounds: actualClaims.referenceBounds,
      ...(actualClaims.loglineState !== undefined ? { loglineState: actualClaims.loglineState } : {}),
      ...(actualClaims.pageRefs !== undefined ? { pageRefs: actualClaims.pageRefs } : {}),
      // Same two document aggregates ScriptDoctorPanel.tsx's "Shape &
      // Rhythm" section and both coverage exports already show, recomputed
      // here for parity with every other surface. PURELY INFORMATIONAL:
      // VerifyExpected carries no structuralSignals field, so this block can
      // never be `checked` and can never produce a mismatch or move
      // `verified` — see tests/routes/export-verify.test.ts's "an edited
      // structuralSignals aggregate does not affect verified" for the proof.
      // Omitted entirely when the report carries no scored structuralSignals
      // block, matching every other optional field's presence-gated render.
      ...(report.structuralSignals?.scored ? {
        structuralSignals: {
          meanAbsDialogueShareDelta: report.structuralSignals.meanAbsDialogueShareDelta,
          actionSentenceCvOverall: report.structuralSignals.actionSentenceCvOverall,
        },
      } : {}),
    },
  };
}

/**
 * The claim set a GENUINE export of this script would have published — recomputed
 * from the script text alone, through the same function both exporters render the
 * producer tier from (server/lib/reader-tier.ts's buildReaderTier).
 *
 * Deliberately passes NO logline: a verifier must not be handed the value it is
 * checking. buildReaderTier derives the engine's own logline from the text when
 * none is supplied, so `loglineState` here is the engine's answer, not the
 * artifact's. The same is true of every page reference — resolved here through
 * server/lib/page-refs.ts, which calls src/lib/screenplay-layout.ts's
 * layoutScreenplay, the paginator src/lib/pdf.ts lays the real PDF out with.
 *
 * With an empty `fountain` there is no text to paginate or derive from, so
 * `pageRefs`/`loglineState` come back absent and a claim about either reports as a
 * mismatch. That is the honest outcome for a caller that supplied no script: it is
 * not "checked and fine".
 */
export function recomputeArtifactClaims(report: ScriptDoctorReport, fountain: string): ArtifactClaims {
  return buildReaderTier(report, { fountain }).claims;
}

/**
 * Why the claimed page-reference list disagrees with the recomputed one, or `null`
 * when they agree.
 *
 * Compares the WHOLE list, positionally: how many findings the summary leads with,
 * which rule each one is (and its aggregation id when both sides carry one), and
 * which page each points at. That is what makes the three separate forgeries
 * distinguishable — moving one page number, swapping two findings' pages, and
 * deleting a finding from the list all change this list in different places, and a
 * check of "is a number present" catches none of them.
 */
export function pageRefsDisagreement(
  expectedRefs: readonly ArtifactPageRef[],
  actualRefs: readonly ArtifactPageRef[] | undefined,
): string | null {
  if (actualRefs === undefined) {
    return 'this report claims page references, but none can be resolved for the script text supplied '
      + '(no text, or no scene heading the paginator could locate)';
  }
  if (expectedRefs.length !== actualRefs.length) {
    return `this report claims ${expectedRefs.length} page reference`
      + `${expectedRefs.length === 1 ? '' : 's'}, the engine resolves ${actualRefs.length}`;
  }
  for (let i = 0; i < expectedRefs.length; i++) {
    const claimed = expectedRefs[i];
    const actual = actualRefs[i];
    const where = `reference ${i + 1}`;
    if (claimed.ordinal !== actual.ordinal) {
      return `${where} is numbered ${claimed.ordinal} in this report and ${actual.ordinal} by the engine`;
    }
    if (claimed.rule !== actual.rule) {
      return `${where} names rule ${claimed.rule} in this report and ${actual.rule} by the engine`;
    }
    // The id is compared only when BOTH sides carry one: a report exported before
    // doctor.ts assigned finding ids publishes no id, and a missing id is not a
    // disagreement — the rule and the ordinal still pin which finding it is.
    if (claimed.id !== undefined && actual.id !== undefined && claimed.id !== actual.id) {
      return `${where} (${claimed.rule}) carries finding id ${claimed.id} in this report and ${actual.id} by the engine`;
    }
    if (claimed.page !== actual.page) {
      return `${where} (${claimed.rule}) points at ${claimed.page === null ? 'no page' : `p. ${claimed.page}`}`
        + ` in this report and ${actual.page === null ? 'no page' : `p. ${actual.page}`} by the engine`;
    }
  }
  return null;
}

/**
 * The pages a document BODY points at, compared against the pages its verify block
 * claims — the body-versus-block half of the check, for the one claim whose body
 * rendering is a LIST rather than a single value.
 *
 * Only resolved references render on the page (reader-tier.ts omits an unresolved
 * one rather than printing "p. ?"), so the body's ordered run of `p. N` labels is
 * compared against the block's resolved pages in the same order. Returns a
 * human-readable disagreement or `null`.
 */
export function bodyPageRefsDisagreement(
  bodyPages: readonly number[],
  claimedRefs: readonly ArtifactPageRef[],
): string | null {
  const claimedPages = resolvedPages(claimedRefs);
  if (bodyPages.length !== claimedPages.length) {
    return `the summary prints ${bodyPages.length} page reference${bodyPages.length === 1 ? '' : 's'}, `
      + `but this report's verify block claims ${claimedPages.length}`;
  }
  for (let i = 0; i < bodyPages.length; i++) {
    if (bodyPages[i] !== claimedPages[i]) {
      return `page reference ${i + 1} reads p. ${bodyPages[i]} on the page, `
        + `but this report's verify block claims p. ${claimedPages[i]}`;
    }
  }
  return null;
}
