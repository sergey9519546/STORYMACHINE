// Jump-to-line span resolution — shared by CoverageSummary's "Jump to line"
// button (Retrospective #10, "tighter jump highlight").
//
// Extracted to a pure function so the tightening logic (prefer a
// line-precise member span over a root cause's own wider envelope) is
// unit-testable without mounting the component.

import type { LocatedIssue, RootCauseFinding } from "../../server/nvm/analyze/types.ts";

export interface JumpSpan {
  startLine: number;
  endLine: number;
}

export interface ComputeJumpSpanInput {
  /** The card-leading top priority's own free-form location string, if any. */
  topLocation?: string;
  /** The report's root-cause fallback, if the top priority didn't resolve. */
  root?: Pick<RootCauseFinding, "memberRules" | "startLine" | "endLine"> | null;
  /** The server's own per-issue anchor resolution (server/nvm/analyze/locate.ts). */
  locatedIssues?: Array<Pick<LocatedIssue, "issue" | "anchor" | "startLine" | "endLine">>;
}

/**
 * Resolve the span the "Jump to line" button should scroll to and highlight.
 * Three sources, in priority order:
 *   1. topLocation's own located-issue match (whatever anchor tier the
 *      server already resolved it to — 'lines' is already as tight as it
 *      gets, 'scene' is the honest answer when the issue IS scene-level).
 *   2. Retrospective #10: when the top priority didn't resolve, a root
 *      cause's own startLine/endLine is the MIN/MAX ENVELOPE across every
 *      member issue's span (server/nvm/analyze/cluster.ts) — one
 *      scene-anchored member drags the whole highlight out to that scene's
 *      full range even when other members carry a genuinely line-precise
 *      ('lines' tier) anchor that would have been enough on its own. When
 *      at least one member has that precise anchor, this returns the
 *      envelope of JUST those precise members instead — by construction
 *      never wider than the root's own span (a subset's min/max can only be
 *      <= the full set's), so this can only tighten, never widen.
 *   3. The root's own (possibly scene-wide) span, when no member carries a
 *      'lines' anchor.
 *   4. A last-resort regex parse of "Lines N-M" out of topLocation, for a
 *      report shape that predates locatedIssues.
 * Returns undefined when none of the above yields a span (a genuinely
 * document/act-level finding with nothing to jump to).
 */
export function computeJumpSpan({ topLocation, root, locatedIssues }: ComputeJumpSpanInput): JumpSpan | undefined {
  if (typeof topLocation === "string") {
    const located = locatedIssues?.find(
      (l) => l.issue.location === topLocation && l.startLine !== undefined && l.endLine !== undefined,
    );
    if (located) return { startLine: located.startLine!, endLine: located.endLine! };
  }

  if (root && root.memberRules.length > 0 && locatedIssues) {
    const memberSet = new Set(root.memberRules);
    const linedMembers = locatedIssues.filter(
      (l) => l.anchor === "lines" && memberSet.has(l.issue.rule) && l.startLine !== undefined && l.endLine !== undefined,
    );
    if (linedMembers.length > 0) {
      return {
        startLine: Math.min(...linedMembers.map((l) => l.startLine!)),
        endLine: Math.max(...linedMembers.map((l) => l.endLine!)),
      };
    }
  }

  if (root?.startLine != null) {
    return { startLine: root.startLine, endLine: root.endLine ?? root.startLine };
  }

  if (typeof topLocation !== "string") return undefined;
  const m = topLocation.match(/Lines?\s+~?(\d+)(?:\s*[-–—]\s*~?(\d+))?/i);
  if (!m) return undefined;
  const start = Number(m[1]);
  const end = m[2] ? Number(m[2]) : start;
  return { startLine: Math.min(start, end), endLine: Math.max(start, end) };
}
