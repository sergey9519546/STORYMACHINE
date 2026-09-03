// Retrospective #10 ("Tighter jump highlight") — CoverageSummary's "Jump to
// line" span computation, extracted to a pure function so the tightening
// logic (prefer a line-precise member over a root cause's wider envelope)
// is directly testable.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeJumpSpan } from "../../src/lib/jump-span.ts";

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
    assert.deepEqual(span, { startLine: 200, endLine: 240 });
  });

  it("returns the top priority's line-precise span unchanged (already as tight as it gets)", () => {
    const span = computeJumpSpan({
      topLocation: "Lines 40-42",
      locatedIssues: [locatedIssue("RULE_A", "Lines 40-42", "lines", 40, 42)],
    });
    assert.deepEqual(span, { startLine: 40, endLine: 42 });
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
    assert.deepEqual(span, { startLine: 150, endLine: 152 });
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
    assert.deepEqual(span, { startLine: 20, endLine: 35 });
  });

  it("falls back to the root's own combined span when no member has a line-precise anchor", () => {
    const span = computeJumpSpan({
      root: { memberRules: ["RULE_SCENE_1", "RULE_SCENE_2"], startLine: 50, endLine: 120 },
      locatedIssues: [
        locatedIssue("RULE_SCENE_1", "Scene 2", "scene", 50, 90),
        locatedIssue("RULE_SCENE_2", "Scene 3", "scene", 91, 120),
      ],
    });
    assert.deepEqual(span, { startLine: 50, endLine: 120 });
  });

  it("falls back to the root's own span when locatedIssues is absent entirely", () => {
    const span = computeJumpSpan({
      root: { memberRules: ["RULE_A"], startLine: 5, endLine: 9 },
    });
    assert.deepEqual(span, { startLine: 5, endLine: 9 });
  });

  it("ignores a member whose rule matches but whose anchor is not 'lines'", () => {
    const span = computeJumpSpan({
      root: { memberRules: ["RULE_A"], startLine: 5, endLine: 9 },
      locatedIssues: [locatedIssue("RULE_A", "Character: JAX", "character", 7, 7)],
    });
    // No 'lines' member -> falls through to root's own span, unchanged.
    assert.deepEqual(span, { startLine: 5, endLine: 9 });
  });

  it("last resort: regex-parses 'Lines N-M' out of topLocation when nothing else resolves", () => {
    const span = computeJumpSpan({ topLocation: "Lines 12-14" });
    assert.deepEqual(span, { startLine: 12, endLine: 14 });
  });

  it("returns undefined for a genuinely document/act-level finding with nothing to jump to", () => {
    const span = computeJumpSpan({ topLocation: "Act 3 pacing" });
    assert.equal(span, undefined);
  });

  it("returns undefined when there is no top, no root, and nothing to fall back to", () => {
    assert.equal(computeJumpSpan({}), undefined);
  });
});
