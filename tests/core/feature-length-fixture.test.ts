// The repository's one FEATURE-LENGTH stimulus.
//
// Until 2026-09-06 the largest committed Fountain file was 12 scenes
// (tests/fixtures/feature-scale-discrimination/intact.fountain, 10,861 B).
// Every browser suite, every fixture and the calibration corpus ran on short
// form, and four defects that only appear at feature length shipped as a
// direct consequence — the infinite render loop this repo now guards in
// tests/core/scriptide-render-loop-guard.test.ts among them. See
// docs/brain/Patterns.md ("no fixture at product length").
//
// This file guards three things about the fixture:
//   1. it is byte-identical to a fresh run of its deterministic assembler, so
//      a source screenplay edited without regenerating fails here rather than
//      silently changing what "feature length" means in every suite that
//      loads it;
//   2. it is actually feature length AND actually parses — a fixture that
//      quietly degraded to 12 scenes would keep every gate green while
//      testing nothing;
//   3. its provenance and its "this is not a story" warning are present, in a
//      boneyard, where the parser cannot score them.
//
// What it deliberately does NOT assert: any health/verdict/grade value. The
// fixture is twenty unrelated shorts concatenated; its score is a property of
// a concatenation, not of writing, and pinning it here would invite exactly
// the misreading the fixture's own header forbids.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { assembleFeatureFixture, OUTPUT_PATH } from "../../scripts/build-feature-length-fixture.mjs";
import { parseFountain } from "../../src/lib/fountain.ts";
import { analyzeFountainText } from "../../server/nvm/analyze/fountain-analyzer.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..", "..");
const committed = readFileSync(resolve(REPO, OUTPUT_PATH), "utf8");

describe("feature-length fixture — deterministic and regenerable", () => {
  it("is byte-identical to a fresh run of scripts/build-feature-length-fixture.mjs", () => {
    const assembled = assembleFeatureFixture(REPO);
    assert.equal(
      committed,
      assembled,
      `${OUTPUT_PATH} has drifted from its assembler — re-run \`node scripts/build-feature-length-fixture.mjs\` (a source screenplay changed, or the file was hand-edited)`,
    );
  });

  it("assembles identically twice in a row (no clock, no randomness, no readdir-order dependence)", () => {
    assert.equal(assembleFeatureFixture(REPO), assembleFeatureFixture(REPO));
  });
});

describe("feature-length fixture — is actually at product length", () => {
  const analysis = analyzeFountainText(committed);

  it("carries at least 140 scenes (the length the four shipped defects needed to appear)", () => {
    assert.ok(
      analysis.sceneCount >= 140,
      `expected >= 140 scenes at product length, got ${analysis.sceneCount}`,
    );
  });

  it("is an order of magnitude past the previous largest committed script (12 scenes / 10,861 B)", () => {
    assert.ok(analysis.sceneCount > 12 * 5, `only ${analysis.sceneCount} scenes`);
    assert.ok(committed.length > 10_861 * 5, `only ${committed.length} B`);
  });

  it("parses cleanly — real scene headings, real dialogue, no truncation", () => {
    assert.ok(analysis.dialogueLineCount > 500, `dialogue lines: ${analysis.dialogueLineCount}`);
    assert.ok(analysis.actionLineCount > 200, `action lines: ${analysis.actionLineCount}`);
    assert.ok(analysis.characters.length > 20, `characters: ${analysis.characters.length}`);
    assert.notEqual(analysis.truncatedForAnalysis, true, "the analyzer truncated the fixture");
  });
});

describe("feature-length fixture — provenance and honesty", () => {
  const blocks = parseFountain(committed);
  const boneyard = blocks.filter((b) => b.type === "boneyard").map((b) => b.text).join("\n");
  const scored = blocks.filter((b) => b.type !== "boneyard" && b.type !== "empty").map((b) => b.text).join("\n");

  it("declares CC0 and names EVERY source file, inside a boneyard", () => {
    assert.match(boneyard, /\bCC0 1\.0\b/);
    assert.match(boneyard, /LICENSE-live-action\.md/);
    const named = [...boneyard.matchAll(/data\/screenplays\/([a-z0-9-]+\.fountain)/g)].map((m) => m[1]);
    assert.equal(new Set(named).size, 20, `expected all 20 CC0 sources named, found ${new Set(named).size}`);
  });

  it("states in the file itself that it is a deliberately incoherent assembly, not a story", () => {
    assert.match(boneyard, /DELIBERATELY INCOHERENT/);
    assert.match(boneyard, /DO NOT read craft meaning off this file/);
    assert.match(boneyard, /must never be quoted as a discrimination measurement/);
  });

  it("keeps every provenance marker OUT of the scored text (the 2026-09-04 corpus-integrity rule)", () => {
    // The same rule tests/core/fixture-provenance-comment-guard.test.ts
    // enforces corpus-wide, asserted here too because this fixture's header
    // is generated: a change to the assembler's TITLE_PAGE could reintroduce
    // the defect in a file that guard would then correctly fail on. Failing
    // in BOTH places names the cause faster.
    assert.doesNotMatch(scored, /\bCC0\b/i);
    assert.doesNotMatch(scored, /STORYMACHINE/i);
    assert.doesNotMatch(scored, /public domain dedication/i);
    assert.equal(committed.split("\n").filter((l) => l.startsWith("//")).length, 0);
  });

  it("points at its own assembler so a reader can reproduce it", () => {
    assert.match(boneyard, /scripts\/build-feature-length-fixture\.mjs/);
  });
});
