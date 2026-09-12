// Retrospective #10 ("Tighter jump highlight") — CoverageSummary's "Jump to
// line" span computation, extracted to a pure function so the tightening
// logic (prefer a line-precise member over a root cause's wider envelope)
// is directly testable.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  computeJumpSpan,
  computeRootCauseJumpSpan,
  computeTopPriorityJumpSpan,
} from "../../src/lib/jump-span.ts";

// Minimal fixtures — only the fields computeJumpSpan actually reads.
function locatedIssue(rule: string, location: string, anchor: "scene" | "lines" | "character" | "document", startLine?: number, endLine?: number) {
  return { issue: { rule, location, description: "", severity: "minor" as const }, anchor, startLine, endLine };
}

describe("computeJumpSpan", () => {
  it("uses the top priority's own located-issue span when it matches", () => {
    const span = computeJumpSpan({
      topLocation: "Scene 9 (climax peak)",
      locatedIssues: [locatedIssue("RULE_A", "Scene 9 (climax peak)", "scene", 200, 240)],
    });
    assert.deepEqual(span, { startLine: 200, endLine: 240, owner: "top-priority" });
  });

  it("returns the top priority's line-precise span unchanged (already as tight as it gets)", () => {
    const span = computeJumpSpan({
      topLocation: "Lines 40-42",
      locatedIssues: [locatedIssue("RULE_A", "Lines 40-42", "lines", 40, 42)],
    });
    assert.deepEqual(span, { startLine: 40, endLine: 42, owner: "top-priority" });
  });

  // The core retrospective #10 fix.
  it("prefers a line-precise root-cause member's span over the root's own wider envelope", () => {
    const span = computeJumpSpan({
      topLocation: undefined,
      root: { memberRules: ["RULE_SCENE", "RULE_LINES"], startLine: 100, endLine: 260 }, // the coarse envelope
      locatedIssues: [
        locatedIssue("RULE_SCENE", "Scene 4 (INT. BAR)", "scene", 100, 260), // this member drags the envelope wide
        locatedIssue("RULE_LINES", "Lines 150-152", "lines", 150, 152), // the precise member
      ],
    });
    // Must use the tight member's span, NOT root's [100, 260] envelope.
    assert.deepEqual(span, { startLine: 150, endLine: 152, owner: "root-cause" });
  });

  it("unions multiple line-precise members when more than one qualifies", () => {
    const span = computeJumpSpan({
      root: { memberRules: ["A", "B", "C"], startLine: 10, endLine: 500 },
      locatedIssues: [
        locatedIssue("A", "Lines 20-22", "lines", 20, 22),
        locatedIssue("B", "Scene 1", "scene", 10, 500), // drags root's own envelope wide
        locatedIssue("C", "Lines 30-35", "lines", 30, 35),
      ],
    });
    assert.deepEqual(span, { startLine: 20, endLine: 35, owner: "root-cause" });
  });

  it("falls back to the root's own combined span when no member has a line-precise anchor", () => {
    const span = computeJumpSpan({
      root: { memberRules: ["RULE_SCENE_1", "RULE_SCENE_2"], startLine: 50, endLine: 120 },
      locatedIssues: [
        locatedIssue("RULE_SCENE_1", "Scene 2", "scene", 50, 90),
        locatedIssue("RULE_SCENE_2", "Scene 3", "scene", 91, 120),
      ],
    });
    assert.deepEqual(span, { startLine: 50, endLine: 120, owner: "root-cause" });
  });

  it("falls back to the root's own span when locatedIssues is absent entirely", () => {
    const span = computeJumpSpan({
      root: { memberRules: ["RULE_A"], startLine: 5, endLine: 9 },
    });
    assert.deepEqual(span, { startLine: 5, endLine: 9, owner: "root-cause" });
  });

  it("ignores a member whose rule matches but whose anchor is not 'lines'", () => {
    const span = computeJumpSpan({
      root: { memberRules: ["RULE_A"], startLine: 5, endLine: 9 },
      locatedIssues: [locatedIssue("RULE_A", "Character: JAX", "character", 7, 7)],
    });
    // No 'lines' member -> falls through to root's own span, unchanged.
    assert.deepEqual(span, { startLine: 5, endLine: 9, owner: "root-cause" });
  });

  it("last resort: regex-parses 'Lines N-M' out of topLocation when nothing else resolves", () => {
    const span = computeJumpSpan({ topLocation: "Lines 12-14" });
    assert.deepEqual(span, { startLine: 12, endLine: 14, owner: "top-priority" });
  });

  it("returns undefined for a genuinely document/act-level finding with nothing to jump to", () => {
    const span = computeJumpSpan({ topLocation: "Act 3 pacing" });
    assert.equal(span, undefined);
  });

  it("returns undefined when there is no top, no root, and nothing to fall back to", () => {
    assert.equal(computeJumpSpan({}), undefined);
  });
});

// ── A SPAN BELONGS TO A FINDING (2026-09-12, adversarial finding #5) ─────────
//
// `computeJumpSpan` fell through ACROSS finding boundaries: a top priority with
// no span of its own got the first ROOT CAUSE's line-anchored members' envelope
// back, anonymously, and CoverageSummary rendered it as the priority's own
// location. On the committed 231-scene fixture that produced a control labelled
// "JUMP TO LINE 137" for the whole-draft finding "Conflict layer — An 8+ scene
// story with zero suspense-dip reversals detected", flashing lines 137–2709 of a
// 2,927-line file.
describe("finding #5 — a span never crosses a finding boundary", () => {
  const documentTierTop = "Conflict layer"; // resolved to tier 'document': no line
  const foreignRootCause = {
    memberRules: ["QUESTION_DODGE"],
    startLine: 137,
    endLine: 2709,
  };
  const foreignMembers = [
    locatedIssue("QUESTION_DODGE", "Line 137 (NELL)", "lines", 137, 137),
    locatedIssue("QUESTION_DODGE", "Line 2709 (SARA)", "lines", 2709, 2709),
  ];

  it("computeTopPriorityJumpSpan refuses a document-tier priority instead of borrowing the root cause's lines", () => {
    assert.equal(
      computeTopPriorityJumpSpan({ topLocation: documentTierTop, locatedIssues: foreignMembers }),
      undefined,
      "a whole-draft finding has no line; the honest answer is no span",
    );
  });

  it("computeTopPriorityJumpSpan never reads the root cause at all", () => {
    // Even passed the full input shape, the top-priority resolver's own
    // signature cannot see `root` — this asserts the narrowing is real rather
    // than merely intended.
    const span = computeTopPriorityJumpSpan({
      topLocation: documentTierTop,
      // @ts-expect-error — `root` is deliberately not part of this resolver's input.
      root: foreignRootCause,
      locatedIssues: foreignMembers,
    });
    assert.equal(span, undefined);
  });

  it("computeRootCauseJumpSpan owns its own span, and says so", () => {
    const span = computeRootCauseJumpSpan({ root: foreignRootCause, locatedIssues: foreignMembers });
    assert.deepEqual(span, { startLine: 137, endLine: 2709, owner: "root-cause" });
  });

  it("the composite still resolves, but the owner is visible so a card can refuse it", () => {
    const span = computeJumpSpan({
      topLocation: documentTierTop,
      root: foreignRootCause,
      locatedIssues: foreignMembers,
    });
    assert.deepEqual(span, { startLine: 137, endLine: 2709, owner: "root-cause" });
    assert.notEqual(span?.owner, "top-priority", "the card's own finding did not produce this span");
  });

  it("a top priority's OWN parsed line beats a root cause's envelope", () => {
    // The one deliberate ordering change: the "Lines N-M" parse of the top
    // priority's own location string is that finding's own anchor, so it
    // outranks another finding's span.
    const span = computeJumpSpan({
      topLocation: "Line 1768 (SARA)",
      root: foreignRootCause,
      locatedIssues: foreignMembers,
    });
    assert.deepEqual(span, { startLine: 1768, endLine: 1768, owner: "top-priority" });
  });
});
