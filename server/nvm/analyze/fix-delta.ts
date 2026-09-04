// Fix & Verify — the deterministic half, extracted so BOTH producers of a
// verification receipt compute it with the same code.
//
// WHY THIS FILE EXISTS (2026-09-04). POST /api/scriptide/fix has two ways to
// obtain a candidate draft:
//
//   1. GENERATED  — server/nvm/analyze/fix.ts's fixAndVerify() asks the model
//                   for a span rewrite (opt-in, needs a key, Labs-gated in the
//                   UI).
//   2. WRITER-SUPPLIED — the writer edits their own draft in the editor and
//                   POSTs it as `candidateFountain`. No key, no model, no
//                   generation. This is the path a keyless deploy — the
//                   product's front door — actually has.
//
// The RECEIPT is identical in both cases, and that is the whole point: the
// health/verdict movement and the cleared/introduced issue lists are the
// deterministic doctor's reading of two whole documents, never anything the
// model asserted about its own work. Before this file, the delta lived
// privately inside fix.ts, so path 2 could only have re-implemented it — and
// a second implementation of "what changed" is exactly the kind of drift that
// turns a receipt into a claim. There is one implementation; both paths call
// it.
//
// Nothing here runs the doctor. It takes two already-produced
// ScriptDoctorReports and compares them, so it is pure, cheap, and safe to
// import from a route without pulling the analyzer onto the main thread.
// It is not on the scoring path: doctor.ts does not import it (nor fix.ts),
// so `scripts/check-scoring-receipt.mjs`'s reachability walk correctly
// excludes it — see that script's tier-2 comment.

import type { CoverageVerdict, ScriptDoctorReport } from './types.ts';
import type { PassName, RevisionIssue } from '../revision/passes/types.ts';

export type TaggedIssue = RevisionIssue & { pass: PassName };

/** One side of the receipt's score movement. Shape-identical to
 *  FixVerifyResult's `before`/`after` (./types.ts) — that interface is the
 *  published contract; this is the builder that fills it. */
export interface VerifySide {
  health: number;
  verdict?: CoverageVerdict;
  contentHash: string;
}

export interface VerifyReceipt {
  before: VerifySide;
  after: VerifySide;
  cleared: TaggedIssue[];
  introduced: TaggedIssue[];
}

/** Every diagnosable issue in a report, tagged with the pass that raised it. */
export function flattenIssues(report: ScriptDoctorReport): TaggedIssue[] {
  return report.passes.flatMap(p => p.issues.map(issue => ({ ...issue, pass: p.pass })));
}

/** #5: prefer the STABLE id doctor.ts's aggregation assigns to every issue
 *  (a hash of pass + rule + a NORMALIZED scene span — immune to a
 *  location-text reword, e.g. a slugline edit between the baseline and
 *  candidate run). Falls back to the legacy (rule, location) STRING identity
 *  — deliberately NOT including `pass`, so two issues with the same rule and
 *  location are the same finding for delta purposes even if a future rename
 *  ever moved a rule between passes — only when `id` is absent (a report
 *  built before this field existed, or hand-constructed by a test). Matches
 *  types.ts's FixVerifyResult.cleared/introduced doc comment verbatim. */
export function issueKey(issue: RevisionIssue): string {
  return issue.id ?? `${issue.rule} ${issue.location}`;
}

/** Multiset diff: an issue present N times in baseline and M times in
 *  candidate contributes max(0, N-M) entries to `cleared` and max(0, M-N) to
 *  `introduced` — so fixing one of two identical (rule, location) issues
 *  reports exactly one cleared, not zero and not both. */
export function multisetDiff(
  baseline: TaggedIssue[],
  candidate: TaggedIssue[],
): { cleared: TaggedIssue[]; introduced: TaggedIssue[] } {
  const bucket = (issues: TaggedIssue[]): Map<string, TaggedIssue[]> => {
    const map = new Map<string, TaggedIssue[]>();
    for (const issue of issues) {
      const key = issueKey(issue);
      const arr = map.get(key);
      if (arr) arr.push(issue); else map.set(key, [issue]);
    }
    return map;
  };

  const baseByKey = bucket(baseline);
  const candByKey = bucket(candidate);
  const allKeys = new Set<string>([...baseByKey.keys(), ...candByKey.keys()]);

  const cleared: TaggedIssue[] = [];
  const introduced: TaggedIssue[] = [];
  for (const key of allKeys) {
    const baseArr = baseByKey.get(key) ?? [];
    const candArr = candByKey.get(key) ?? [];
    if (baseArr.length > candArr.length) cleared.push(...baseArr.slice(candArr.length));
    else if (candArr.length > baseArr.length) introduced.push(...candArr.slice(baseArr.length));
  }
  return { cleared, introduced };
}

/**
 * The whole receipt, from two whole-document reports: score movement plus the
 * whole-document issue delta. The comparison is over EVERY pass, not just the
 * region a writer (or a model) thought they were touching — an edit ripples,
 * and hiding ripples would make the receipt a lie. Regressions come back in
 * `introduced` and are rendered with the same prominence as wins.
 *
 * runScriptDoctor always populates `contentHash` on every report path
 * (doctor.ts), degenerate ones included, so the non-null reads below are safe
 * — the same pattern /api/scriptide/diagnose uses — and they are what makes
 * the receipt independently re-verifiable: POST either text to /doctor and
 * the numbers must match byte for byte.
 */
export function buildVerifyReceipt(
  baseline: ScriptDoctorReport,
  candidate: ScriptDoctorReport,
): VerifyReceipt {
  const { cleared, introduced } = multisetDiff(flattenIssues(baseline), flattenIssues(candidate));
  return {
    before: { health: baseline.health, verdict: baseline.verdict, contentHash: baseline.contentHash! },
    after: { health: candidate.health, verdict: candidate.verdict, contentHash: candidate.contentHash! },
    cleared,
    introduced,
  };
}
