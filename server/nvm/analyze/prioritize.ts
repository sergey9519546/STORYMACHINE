// Script Doctor — display ordering for "what should I fix first?".
//
// THE PROBLEM. `ScriptDoctorReport.topPriorities` (doctor.ts's
// buildTopPriorities) sorts by severity and then by PASS INSERTION ORDER —
// which pass happened to run first in the 14-pass pipeline. Pass order is an
// execution detail with no editorial meaning, so among issues of equal
// severity the list leads with whatever `structure` found, and on the five
// real fixtures measured on 2026-09-03 that was routinely a whole-script
// observation with no line anchor at all: the first thing the writer reads is
// the one thing they cannot go and look at.
//
// THE FIX, AND WHERE IT LIVES. This module produces a SECOND, differently
// ordered view and lives outside doctor.ts on purpose. doctor.ts is on the
// scoring path (scripts/check-scoring-receipt.mjs) and `topPriorities` is a
// published field of ScriptDoctorReport that other consumers, the
// output-identity harness, and the report snapshots all read; re-sorting it
// in place would move a published array for a purely presentational reason.
// So `topPriorities` is left exactly as it is — the severity-ordered record —
// and the routes attach `prioritized` beside it, the same way they already
// attach `rootCauses` and `locatedIssues` (see server/routes/scriptide.ts).
// Nothing here is imported by doctor.ts, so nothing here is scoring-path.
//
// THE ORDER, and why each key is where it is:
//
//   1. ANCHOR QUALITY — lines > scene > character > document. This is the
//      whole point: an issue you can open the editor to is actionable, and
//      one that says "Dialogue throughout" is not, however true it is. A
//      scene RANGE anchors at the 'scene' tier (locate.ts is explicit about
//      this), so a four-scene act observation correctly ranks below a
//      line-precise one.
//   2. SEVERITY — critical before major before minor, within an anchor tier.
//   3. CLUSTER MEMBERSHIP — an issue that a root-cause finding also claims is
//      corroborated by other issues in the same place; a lone one is a single
//      reading. Ties within that go to the larger cluster, since that is the
//      one where fixing once clears the most.
//   4. The issue's own index in the located list — a total, input-derived tie
//      break, so the ordering is deterministic with no wall-clock or hash
//      input.
//
// THE TRADE-OFF, stated plainly: ordering anchor BEFORE severity means an
// anchored minor issue can outrank an unanchored critical one. That is
// deliberate for a "work through these in order" list — an unlocatable
// finding cannot be worked — but it is also exactly why this is an ADDITIONAL
// view and not a replacement. `topPriorities` still reports the same issues
// severity-first, and `rootCauses` still leads with critical findings, so a
// critical whole-script problem is never hidden, only ordered differently in
// this one list.

import type { PassName, RevisionIssue } from '../revision/passes/types.ts';
import type { IssueAnchor, LocatedIssue, RootCauseFinding } from './types.ts';

/** How many entries `prioritized` carries. Matches buildTopPriorities' own
 *  slice(0, 10) so the two lists are the same size and directly comparable —
 *  "the ten most severe" beside "the ten to actually start with". */
const PRIORITIZED_LIMIT = 10;

const ANCHOR_RANK: Record<IssueAnchor, number> = {
  lines: 0,
  scene: 1,
  character: 2,
  document: 3,
};

const SEVERITY_RANK: Record<RevisionIssue['severity'], number> = {
  critical: 0,
  major: 1,
  minor: 2,
};

/** One entry of the actionable ordering: a LocatedIssue plus the root-cause
 *  finding (if any) that also claims it, so the panel can show "part of: <the
 *  wound>" without re-deriving the membership itself. */
export interface PrioritizedIssue {
  issue: RevisionIssue;
  pass: PassName;
  anchor: IssueAnchor;
  startLine?: number;
  endLine?: number;
  /** id of the RootCauseFinding this issue belongs to, when one claims it. */
  clusterId?: string;
  /** How many issues that finding subsumes; absent with clusterId. */
  clusterSize?: number;
}

/** Which root-cause finding, if any, claims a given located issue.
 *
 *  clusterIssues returns findings by rule + span, not by object identity, so
 *  membership is recovered the same way: an issue belongs to a finding when
 *  the finding lists its rule AND (for a spanned finding) the issue's own
 *  span lies inside the finding's. When several findings match, the smallest
 *  span wins — that is the most specific claim, and the one a reader means by
 *  "this is part of that". */
function findClaimingFinding(li: LocatedIssue, findings: RootCauseFinding[]): RootCauseFinding | undefined {
  let best: RootCauseFinding | undefined;
  let bestWidth = Number.POSITIVE_INFINITY;
  for (const f of findings) {
    if (!f.memberRules.includes(li.issue.rule)) continue;
    if (f.startLine !== undefined && f.endLine !== undefined) {
      if (li.startLine === undefined || li.endLine === undefined) continue;
      if (li.startLine < f.startLine || li.endLine > f.endLine) continue;
      const width = f.endLine - f.startLine;
      if (width < bestWidth) { best = f; bestWidth = width; }
      continue;
    }
    // A document-anchored finding has no span to contain anything, so rule
    // membership is the whole test — but it must never beat a spanned match.
    if (best === undefined) best = f;
  }
  return best;
}

/**
 * Order located issues by how actionable they are, most first, and return the
 * top PRIORITIZED_LIMIT. Pure and deterministic: every sort key is derived
 * from the inputs, and the final key is the issue's own input index, so the
 * result is stable regardless of the engine's sort implementation.
 */
export function buildPrioritizedIssues(
  locatedIssues: LocatedIssue[],
  rootCauses: RootCauseFinding[] = [],
): PrioritizedIssue[] {
  const ranked = locatedIssues.map((li, index) => {
    const finding = findClaimingFinding(li, rootCauses);
    return {
      li,
      index,
      finding,
      anchorRank: ANCHOR_RANK[li.anchor],
      severityRank: SEVERITY_RANK[li.issue.severity],
      clusterRank: finding ? 0 : 1,
      clusterSize: finding?.memberCount ?? 0,
    };
  });

  ranked.sort((a, b) =>
    a.anchorRank - b.anchorRank
    || a.severityRank - b.severityRank
    || a.clusterRank - b.clusterRank
    || b.clusterSize - a.clusterSize
    || a.index - b.index,
  );

  return ranked.slice(0, PRIORITIZED_LIMIT).map(({ li, finding }) => ({
    issue: li.issue,
    pass: li.pass,
    anchor: li.anchor,
    ...(li.startLine !== undefined ? { startLine: li.startLine } : {}),
    ...(li.endLine !== undefined ? { endLine: li.endLine } : {}),
    ...(finding ? { clusterId: finding.id, clusterSize: finding.memberCount } : {}),
  }));
}
