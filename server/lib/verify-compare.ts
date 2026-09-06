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

export interface VerifyExpected {
  contentHash: string;
  health?: number;
  verdict?: CoverageVerdict;
  totalIssues?: number;
  healthPercentile?: number;
  engineCommit?: string;
  rulebookCount?: number;
}

export interface VerifyMismatch { field: string; expected: unknown; actual: unknown }

export type MismatchKind = 'content_mismatch' | 'score_mismatch' | 'engine_mismatch' | null;

export interface VerifyRecomputed {
  contentHash: string;
  health?: number;
  verdict?: CoverageVerdict;
  totalIssues?: number;
  healthPercentile?: number;
  engineCommit?: string;
  rulebookCount?: number;
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
export function compareVerifyClaims(report: ScriptDoctorReport, expected: VerifyExpected): VerifyCompareResult {
  const checked: string[] = ['contentHash'];
  const mismatches: VerifyMismatch[] = [];

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
