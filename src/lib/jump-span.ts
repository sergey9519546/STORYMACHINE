// Jump-to-line span resolution — shared by CoverageSummary's "Jump to line"
// button (Retrospective #10, "tighter jump highlight").
//
// Extracted to a pure function so the tightening logic (prefer a
// line-precise member span over a root cause's own wider envelope) is
// unit-testable without mounting the component.
//
// ── A SPAN BELONGS TO A FINDING (2026-09-12, adversarial finding #5) ────────
//
// `computeJumpSpan` used to return a bare `{startLine, endLine}` whose ORIGIN
// the caller could not see, and it fell through ACROSS finding boundaries: when
// the top priority had no span of its own, step 2 returned the first ROOT
// CAUSE's line-anchored members' envelope, and CoverageSummary rendered that as
// the top priority's location. On tests/fixtures/feature-length/
// assembled-feature.fountain the top priority is "Conflict layer — An 8+ scene
// story with zero suspense-dip reversals detected", which
// server/nvm/analyze/locate.ts honestly anchors at tier `document` with no
// line; the card nonetheless offered "JUMP TO LINE 137" and flashed lines
// 137–2709 of a 2,927-line file. Line 137 is NELL's dialogue in scene 8,
// belonging to a QUESTION_DODGE member of an unrelated root cause ("Recurring
// zero entropy scene trouble in Scenes 2–12"). At short length the same finding
// correctly showed NO LOCATION, so the affordance lied only at the one length
// where a writer cannot check it by eye.
//
// The fix is structural. Each resolver below reads exactly ONE finding's
// anchors; every span carries the `owner` that produced it; and a caller
// rendering a finding's card accepts only a span that finding owns. The
// composite `computeJumpSpan` is kept — a caller that genuinely wants "the
// report's best span, whatever it belongs to" still has it — but it can no
// longer hand back a foreign span anonymously.

import type { LocatedIssue, RootCauseFinding } from "../../server/nvm/analyze/types.ts";

/** Which finding's anchors produced a span. `top-priority` is the card-leading
 *  priority's own location (resolved through the server's `locatedIssues`, or
 *  parsed out of its prose as a last resort); `root-cause` is the root cause's,
 *  whether from its line-precise members or from its own envelope. */
export type JumpSpanOwner = "top-priority" | "root-cause";

export interface JumpSpan {
  startLine: number;
  endLine: number;
  /** The finding this span came from. A card must not render a span it does
   *  not own — that is the whole of finding #5. */
  owner: JumpSpanOwner;
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
 * The TOP PRIORITY's own span, and nothing else.
 *
 * Two sources, both belonging to that one finding:
 *   1. its located-issue match — whatever anchor tier the server already
 *      resolved it to ('lines' is already as tight as it gets, 'scene' is the
 *      honest answer when the issue IS scene-level);
 *   2. a last-resort regex parse of "Lines N-M" out of the location string
 *      itself, for a report shape that predates `locatedIssues`.
 *
 * Returns undefined for a finding the server left on the 'document' tier —
 * which is the honest answer, and the one src/lib/finding-jump.ts's
 * NO_LOCATION_DOCUMENT_REASON exists to say. It never consults the root cause:
 * a whole-draft finding has no line, and borrowing another finding's is the
 * defect this module's header records.
 */
export function computeTopPriorityJumpSpan({
  topLocation,
  locatedIssues,
}: Pick<ComputeJumpSpanInput, "topLocation" | "locatedIssues">): JumpSpan | undefined {
  if (typeof topLocation !== "string") return undefined;

  const located = locatedIssues?.find(
    (l) => l.issue.location === topLocation && l.startLine !== undefined && l.endLine !== undefined,
  );
  if (located) {
    return { startLine: located.startLine!, endLine: located.endLine!, owner: "top-priority" };
  }

  const m = topLocation.match(/Lines?\s+~?(\d+)(?:\s*[-–—]\s*~?(\d+))?/i);
  if (!m) return undefined;
  const start = Number(m[1]);
  const end = m[2] ? Number(m[2]) : start;
  return { startLine: Math.min(start, end), endLine: Math.max(start, end), owner: "top-priority" };
}

/**
 * The ROOT CAUSE's own span, and nothing else.
 *
 * Retrospective #10: a root cause's `startLine`/`endLine` is the MIN/MAX
 * ENVELOPE across every member issue's span (server/nvm/analyze/cluster.ts) —
 * one scene-anchored member drags the whole highlight out to that scene's full
 * range even when other members carry a genuinely line-precise ('lines' tier)
 * anchor that would have been enough on its own. When at least one member has
 * that precise anchor, this returns the envelope of JUST those precise members
 * instead — by construction never wider than the root's own span (a subset's
 * min/max can only be <= the full set's), so this can only tighten, never
 * widen. With no line-precise member, the root's own (possibly scene-wide) span
 * is used.
 */
export function computeRootCauseJumpSpan({
  root,
  locatedIssues,
}: Pick<ComputeJumpSpanInput, "root" | "locatedIssues">): JumpSpan | undefined {
  if (root && root.memberRules.length > 0 && locatedIssues) {
    const memberSet = new Set(root.memberRules);
    const linedMembers = locatedIssues.filter(
      (l) => l.anchor === "lines" && memberSet.has(l.issue.rule) && l.startLine !== undefined && l.endLine !== undefined,
    );
    if (linedMembers.length > 0) {
      return {
        startLine: Math.min(...linedMembers.map((l) => l.startLine!)),
        endLine: Math.max(...linedMembers.map((l) => l.endLine!)),
        owner: "root-cause",
      };
    }
  }

  if (root?.startLine != null) {
    return { startLine: root.startLine, endLine: root.endLine ?? root.startLine, owner: "root-cause" };
  }

  return undefined;
}

/**
 * The report's best available span, WITH the finding it belongs to.
 *
 * Priority order is unchanged in spirit (the top priority's own anchors first,
 * the root cause's second); what changed is that the result says which finding
 * produced it, so a caller rendering the top priority's card can require
 * `owner === "top-priority"` and never present a root cause's lines as the
 * priority's location.
 *
 * One ordering detail did move, deliberately: the "Lines N-M" parse of the top
 * priority's OWN location string now runs before the root-cause fallback rather
 * than after it. It is the top priority's own anchor, so it outranks another
 * finding's by the same rule the rest of this change enforces.
 *
 * Returns undefined when neither finding yields a span (a genuinely
 * document/act-level report with nothing to jump to).
 */
export function computeJumpSpan({ topLocation, root, locatedIssues }: ComputeJumpSpanInput): JumpSpan | undefined {
  return (
    computeTopPriorityJumpSpan({ topLocation, locatedIssues })
    ?? computeRootCauseJumpSpan({ root, locatedIssues })
  );
}
