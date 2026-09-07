// One jump affordance for every finding (discovery item #9) + one number,
// one word on a root-cause card (item #10).
//
// Both are decided in src/lib/finding-jump.ts so the panel, the Coverage
// summary and the browser gates read the SAME naming rule and the SAME count
// copy. These are the unit assertions for that module; the driven proof (a
// real jump from priority #3 on the 231-scene fixture, and the rendered
// control count) is scripts/verify-p2-p3-surfaces.mjs's P2-featurelen phase.
//
// Both directions throughout: a finding that resolves gets a control naming
// its destination, and a finding that does not gets the RIGHT reason — never
// nothing, and never the whole-draft sentence for a merely-unresolved note.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  sceneNumberForLine,
  jumpLabel,
  jumpTargetForSpan,
  indexLocatedIssuesByLocation,
  documentTierLocations,
  jumpTargetForIssueLocation,
  jumpTargetForFinding,
  jumpTargetForMemberRule,
  rootCauseCountSentence,
  rootCauseExpanderLabel,
  JUMP_CONTROL_NAME_RE,
  NO_LOCATION_DOCUMENT_REASON,
  NO_LOCATION_UNRESOLVED_REASON,
} from "../../src/lib/finding-jump.ts";
import { runScriptDoctor } from "../../server/nvm/analyze/doctor.ts";
import { locateIssues, sceneLineSpans } from "../../server/nvm/analyze/locate.ts";
import { clusterIssues } from "../../server/nvm/analyze/cluster.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE = resolve(__dirname, "../fixtures/feature-length/assembled-feature.fountain");

// Three scenes: lines 1-10, 11-25, 26-40.
const SPANS = [
  { startLine: 1, endLine: 10 },
  { startLine: 11, endLine: 25 },
  { startLine: 26, endLine: 40 },
];

describe("finding-jump — resolving a line to a scene", () => {
  it("maps a line inside a span to that scene's 1-based number", () => {
    assert.equal(sceneNumberForLine(1, SPANS), 1);
    assert.equal(sceneNumberForLine(10, SPANS), 1);
    assert.equal(sceneNumberForLine(11, SPANS), 2);
    assert.equal(sceneNumberForLine(40, SPANS), 3);
  });

  it("returns null rather than guessing when the line is outside every span", () => {
    assert.equal(sceneNumberForLine(41, SPANS), null);
    assert.equal(sceneNumberForLine(0, SPANS), null);
  });

  it("returns null when no spans were sent at all (an older report shape)", () => {
    assert.equal(sceneNumberForLine(12, undefined), null);
    assert.equal(sceneNumberForLine(12, []), null);
  });
});

describe("finding-jump — the naming rule (the anchor tier picks the word)", () => {
  it("names a scene-anchored finding by its SCENE", () => {
    assert.equal(jumpLabel(12, SPANS, "scene").label, "Jump to scene 2");
  });

  it("names a line-anchored finding by its LINE, even though a scene contains it", () => {
    // A 'lines' anchor means the pass named an explicit range; calling that
    // "scene 2" would be a downgrade of a more precise claim.
    assert.equal(jumpLabel(12, SPANS, "lines").label, "Jump to line 12");
  });

  it("names a character-anchored finding by its LINE (a first speaking line is a line, not a scene claim)", () => {
    assert.equal(jumpLabel(12, SPANS, "character").label, "Jump to line 12");
  });

  it("degrades a scene anchor to the line wording rather than inventing a scene number", () => {
    assert.equal(jumpLabel(99, SPANS, "scene").label, "Jump to line 99");
    assert.equal(jumpLabel(12, undefined, "scene").label, "Jump to line 12");
  });

  it("every label it can produce matches the regex the browser gates search by", () => {
    for (const [line, anchor] of [[12, "scene"], [12, "lines"], [99, "scene"], [7, "character"]] as const) {
      assert.match(jumpLabel(line, SPANS, anchor).label, JUMP_CONTROL_NAME_RE);
    }
  });
});

describe("finding-jump — a finding with no span gets a REASON, never silence", () => {
  it("returns the unresolved reason for a missing span by default", () => {
    const t = jumpTargetForSpan(undefined, SPANS);
    assert.equal(t.kind, "none");
    assert.equal(t.kind === "none" && t.reason, NO_LOCATION_UNRESOLVED_REASON);
  });

  it("distinguishes a whole-draft finding from an unresolved one", () => {
    const located = [
      { issue: { location: "Conflict layer", rule: "NO_REVERSALS" }, anchor: "document" as const },
      { issue: { location: "Scene 2 (INT. BAR)", rule: "ORPHAN_CLUE" }, anchor: "scene" as const, startLine: 11, endLine: 25 },
    ] as never[];
    const index = indexLocatedIssuesByLocation(located);
    const docOnly = documentTierLocations(located);
    assert.deepEqual([...docOnly], ["Conflict layer"]);

    const whole = jumpTargetForIssueLocation("Conflict layer", index, SPANS, docOnly);
    assert.equal(whole.kind === "none" && whole.reason, NO_LOCATION_DOCUMENT_REASON);

    const unknown = jumpTargetForIssueLocation("Something nobody located", index, SPANS, docOnly);
    assert.equal(unknown.kind === "none" && unknown.reason, NO_LOCATION_UNRESOLVED_REASON);

    const resolved = jumpTargetForIssueLocation("Scene 2 (INT. BAR)", index, SPANS, docOnly);
    assert.equal(resolved.kind, "jump");
    assert.equal(resolved.kind === "jump" && resolved.label, "Jump to scene 2");
  });

  it("a location that has BOTH a document-tier and an anchored entry counts as anchored, not whole-draft", () => {
    const located = [
      { issue: { location: "Scene 2 (INT. BAR)", rule: "A" }, anchor: "document" as const },
      { issue: { location: "Scene 2 (INT. BAR)", rule: "B" }, anchor: "scene" as const, startLine: 11, endLine: 25 },
    ] as never[];
    assert.deepEqual([...documentTierLocations(located)], []);
  });
});

describe("finding-jump — root-cause headline and member rules", () => {
  const finding = {
    sceneIdxs: [1, 2],
    startLine: 11,
    endLine: 40,
    memberRules: ["ORPHAN_CLUE", "FLAT_SCENE"],
  };

  it("names a scene-bearing root cause by its FIRST scene (1-based)", () => {
    const t = jumpTargetForFinding(finding, SPANS);
    assert.equal(t.kind === "jump" && t.label, "Jump to scene 2");
    assert.equal(t.kind === "jump" && t.startLine, 11);
    assert.equal(t.kind === "jump" && t.endLine, 40);
  });

  it("gives a document-family root cause (no span) the whole-draft reason", () => {
    const t = jumpTargetForFinding({ sceneIdxs: [], startLine: undefined, endLine: undefined }, SPANS);
    assert.equal(t.kind === "none" && t.reason, NO_LOCATION_DOCUMENT_REASON);
  });

  it("points a member rule at its occurrence INSIDE the finding, never outside it", () => {
    const located = [
      // Same rule, but this occurrence is in scene 1 — outside the finding.
      { issue: { location: "Scene 1", rule: "ORPHAN_CLUE" }, anchor: "scene" as const, startLine: 2, endLine: 9 },
      // …and this one is inside it.
      { issue: { location: "Scene 3", rule: "ORPHAN_CLUE" }, anchor: "scene" as const, startLine: 26, endLine: 40 },
    ] as never[];
    const t = jumpTargetForMemberRule("ORPHAN_CLUE", finding, located, SPANS);
    assert.equal(t.kind === "jump" && t.startLine, 26, "must pick the occurrence within the finding's span");
    assert.equal(t.kind === "jump" && t.label, "Jump to scene 3");
  });

  it("gives a member rule whose every occurrence is document-tier the whole-draft reason", () => {
    const located = [
      { issue: { location: "Conflict layer", rule: "FLAT_SCENE" }, anchor: "document" as const },
    ] as never[];
    const t = jumpTargetForMemberRule("FLAT_SCENE", finding, located, SPANS);
    assert.equal(t.kind === "none" && t.reason, NO_LOCATION_DOCUMENT_REASON);
  });

  it("gives a member rule that appears nowhere in locatedIssues the unresolved reason", () => {
    const t = jumpTargetForMemberRule("NEVER_FIRED", finding, [], SPANS);
    assert.equal(t.kind === "none" && t.reason, NO_LOCATION_UNRESOLVED_REASON);
  });

  it("falls back to the first anchored occurrence for a finding that has no envelope to violate", () => {
    const located = [
      { issue: { location: "Scene 1", rule: "ORPHAN_CLUE" }, anchor: "scene" as const, startLine: 2, endLine: 9 },
    ] as never[];
    const t = jumpTargetForMemberRule(
      "ORPHAN_CLUE",
      { startLine: undefined, endLine: undefined },
      located,
      SPANS,
    );
    assert.equal(t.kind === "jump" && t.startLine, 2);
  });
});

describe("root-cause counts — one number, one word (item #10)", () => {
  it("shows BOTH numbers when notes and rules differ", () => {
    assert.equal(rootCauseCountSentence(15, 12), "15 issues from 12 rules");
    assert.equal(rootCauseExpanderLabel(15, 12), "Show the 12 rules behind them");
  });

  it("shows one number when they agree (no redundant '14 issues from 14 rules')", () => {
    assert.equal(rootCauseCountSentence(14, 14), "14 issues");
    assert.equal(rootCauseExpanderLabel(14, 14), "Show the 14 rules behind them");
  });

  it("is singular where singular is correct", () => {
    assert.equal(rootCauseCountSentence(1, 1), "1 issue");
    assert.equal(rootCauseExpanderLabel(1, 1), "Show the 1 rule behind it");
    assert.equal(rootCauseCountSentence(3, 1), "3 issues from 1 rule");
  });

  it("never lets the headline and the expander name the same count with different words", () => {
    // The defect shape: "15 issues converge here" over "Show the 12
    // contributing notes". Whatever the two numbers are, the word attached to
    // memberCount must be "issue(s)" and the word attached to
    // memberRules.length must be "rule(s)" — in both sentences.
    for (const [members, rules] of [[15, 12], [14, 14], [1, 1], [9, 2]] as const) {
      const head = rootCauseCountSentence(members, rules);
      const expander = rootCauseExpanderLabel(members, rules);
      assert.match(head, new RegExp(`^${members} issues?\\b`), head);
      assert.match(expander, new RegExp(`\\b${rules} rules?\\b`), expander);
      assert.doesNotMatch(expander, /\bnotes?\b/, `the expander lists rules, so it must not call them notes: ${expander}`);
      if (members !== rules) assert.match(head, new RegExp(`\\b${rules} rules?\\b`), head);
    }
  });
});

// ── Over the real feature-length fixture ────────────────────────────────────
// The unit cases above are hand-built. This block runs the SAME resolver over
// the committed 231-scene fixture through the real doctor + locate + cluster
// path the route uses, so the counts are the product's own, not a mock's.
describe("finding-jump — over tests/fixtures/feature-length/assembled-feature.fountain", () => {
  const fountain = readFileSync(FIXTURE, "utf8");
  const report = runScriptDoctor(fountain);

  it("resolves a jump or an honest reason for EVERY top priority — never nothing", async () => {
    const r = await report;
    const issues = r.passes.flatMap((p) => p.issues.map((i) => ({ ...i, pass: p.pass })));
    const located = locateIssues(issues, fountain);
    const spans = sceneLineSpans(fountain);
    const index = indexLocatedIssuesByLocation(located);
    const docOnly = documentTierLocations(located);

    assert.ok(r.topPriorities.length > 0, "the fixture must produce top priorities to check");
    const targets = r.topPriorities.map((i) => jumpTargetForIssueLocation(i.location, index, spans, docOnly));
    assert.equal(targets.length, r.topPriorities.length);
    for (const t of targets) {
      if (t.kind === "jump") assert.match(t.label, JUMP_CONTROL_NAME_RE);
      else assert.ok(t.reason.length > 0, "an unlocatable finding must still carry a reason");
    }
    // Both directions are actually present in this fixture — a test where
    // every finding resolved would not prove the reason branch works.
    assert.ok(targets.some((t) => t.kind === "jump"), "some top priorities must resolve");
    assert.ok(targets.some((t) => t.kind === "none"), "some top priorities are honestly unlocatable");
  });

  it("resolves a jump for the large majority of located findings (the >=1 the panel used to offer is the bug)", async () => {
    const r = await report;
    const issues = r.passes.flatMap((p) => p.issues.map((i) => ({ ...i, pass: p.pass })));
    const located = locateIssues(issues, fountain);
    const spans = sceneLineSpans(fountain);
    const index = indexLocatedIssuesByLocation(located);
    const docOnly = documentTierLocations(located);
    const resolvable = issues.filter(
      (i) => jumpTargetForIssueLocation(i.location, index, spans, docOnly).kind === "jump",
    ).length;
    // Measured 554 of 899 on this fixture (2026-09-06). Asserted as a floor
    // well under the measurement so an ordinary rule-weight change doesn't
    // trip it, but far above the ONE control the panel offered before.
    assert.ok(resolvable >= 300, `only ${resolvable} of ${issues.length} pass issues resolved to a jump`);
  });

  it("root causes on this fixture really do disagree about their two counts — the case item #10 exists for", async () => {
    const r = await report;
    const issues = r.passes.flatMap((p) => p.issues.map((i) => ({ ...i, pass: p.pass })));
    const located = locateIssues(issues, fountain);
    const spans = sceneLineSpans(fountain);
    const causes = clusterIssues(located, spans);
    const mismatched = causes.filter((c) => c.memberCount !== c.memberRules.length);
    assert.ok(
      mismatched.length > 0,
      "the fixture must contain at least one root cause whose issue and rule counts differ, or this guard proves nothing",
    );
    for (const c of mismatched) {
      const head = rootCauseCountSentence(c.memberCount, c.memberRules.length);
      const expander = rootCauseExpanderLabel(c.memberCount, c.memberRules.length);
      // The headline states both numbers; the expander states the rule count
      // it is actually about. Neither can be read as contradicting the other.
      assert.match(head, new RegExp(`^${c.memberCount} issues? from ${c.memberRules.length} rules?$`));
      assert.match(expander, new RegExp(`^Show the ${c.memberRules.length} rules? behind (them|it)$`));
    }
  });

  it("the pair docs/CLAIMS_REGISTER.md row 80 quotes is one this fixture's panel actually renders", async () => {
    // Round-2 review finding 7: the row's headline column used to quote
    // "15 issues from 12 rules", which is the discovery's example from a
    // 146-scene assembly and is NOT a pair any card on the committed fixture
    // produces. The register's headline column quotes shipped strings
    // elsewhere, so it must here too — and this assertion is what keeps that
    // true if the clustering ever moves.
    const r = await report;
    const issues = r.passes.flatMap((p) => p.issues.map((i) => ({ ...i, pass: p.pass })));
    const located = locateIssues(issues, fountain);
    const spans = sceneLineSpans(fountain);
    const causes = clusterIssues(located, spans);
    const rendered = causes.map((c) => rootCauseCountSentence(c.memberCount, c.memberRules.length));
    const expanders = causes.map((c) => rootCauseExpanderLabel(c.memberCount, c.memberRules.length));
    const registerRow = readFileSync(resolve(__dirname, "../../docs/CLAIMS_REGISTER.md"), "utf8")
      .split("\n")
      .find((l) => l.startsWith("| 80 |"));
    assert.ok(registerRow, "claims register row 80 must exist");
    const quoted = registerRow.split("|")[2].trim();
    const [quotedHead, quotedExpander] = quoted.split(" / ").map((x) => x.trim());
    assert.ok(
      rendered.includes(quotedHead),
      `register row 80 quotes "${quotedHead}", which no root cause on this fixture renders. Rendered pairs include: ${[...new Set(rendered)].slice(0, 6).join(" | ")}`,
    );
    assert.ok(
      expanders.includes(quotedExpander),
      `register row 80 quotes expander "${quotedExpander}", which no root cause on this fixture renders`,
    );
  });

  it("every root cause gets a headline jump or a reason, and every member rule gets one too", async () => {
    const r = await report;
    const issues = r.passes.flatMap((p) => p.issues.map((i) => ({ ...i, pass: p.pass })));
    const located = locateIssues(issues, fountain);
    const spans = sceneLineSpans(fountain);
    const causes = clusterIssues(located, spans);
    assert.ok(causes.length > 0, "the fixture must produce root causes");
    let memberJumps = 0;
    let memberReasons = 0;
    for (const c of causes) {
      const head = jumpTargetForFinding(c, spans);
      if (head.kind === "jump") assert.match(head.label, JUMP_CONTROL_NAME_RE);
      else assert.ok(head.reason.length > 0);
      for (const rule of c.memberRules) {
        const t = jumpTargetForMemberRule(rule, c, located, spans);
        if (t.kind === "jump") { assert.match(t.label, JUMP_CONTROL_NAME_RE); memberJumps++; }
        else { assert.ok(t.reason.length > 0); memberReasons++; }
      }
    }
    // Both branches exercised on real data, not just asserted to be possible.
    assert.ok(memberJumps > 0, "no member rule resolved — the expander's new controls would never render");
    assert.ok(memberReasons > 0, "no member rule was unlocatable — the reason branch is untested");
  });
});
