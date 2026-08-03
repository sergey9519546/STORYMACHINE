// CoverageSummary.tsx had no Escape-to-close, while its sibling
// ScriptDoctorPanel (same coverage flow, one click deeper) does — inconsistent
// keyboard behavior on the P0 golden path (StartScreen -> "Try sample
// coverage" -> CoverageSummary -> ScriptDoctorPanel).
//
// It is not merely a consistency nit: ScriptIDE.tsx's document-level Escape
// ladder already closes the coverage tool slot generically, but that generic
// branch does not reset doctorAutoSample the way this panel's own onClose
// prop does (see ScriptIDE.tsx's coverage-close callback). Without a local
// Escape handler that calls onClose() directly, pressing Escape left
// doctorAutoSample stuck true, so the NEXT time Coverage was opened it
// silently re-ran the sample instead of the writer's actual draft.
//
// No render harness in this repo (see CLAUDE.md) — source-level assertions,
// matching this repo's established pattern (e.g. coverage-staleness.test.ts).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const COVERAGE_SUMMARY_SRC = path.resolve(
  import.meta.dirname,
  "../../src/components/scriptide/CoverageSummary.tsx",
);
const SCRIPT_DOCTOR_PANEL_SRC = path.resolve(
  import.meta.dirname,
  "../../src/components/scriptide/ScriptDoctorPanel.tsx",
);

function extractEscapeEffect(source: string): string {
  const idx = source.indexOf('e.key === "Escape"');
  assert.ok(idx > -1, "expected an Escape-key check in this file");
  return source.slice(Math.max(0, idx - 200), idx + 250);
}

describe("CoverageSummary — Escape closes the panel, matching ScriptDoctorPanel", () => {
  const coverageSummary = fs.readFileSync(COVERAGE_SUMMARY_SRC, "utf8");
  const scriptDoctorPanel = fs.readFileSync(SCRIPT_DOCTOR_PANEL_SRC, "utf8");

  it("registers a keydown listener that calls onClose() on Escape", () => {
    const around = extractEscapeEffect(coverageSummary);
    assert.match(around, /if\s*\(\s*e\.key\s*===\s*"Escape"\s*\)\s*onClose\(\);/);
    assert.match(around, /document\.addEventListener\("keydown", handler\)/);
    assert.match(around, /document\.removeEventListener\("keydown", handler\)/);
  });

  it("the effect depends on onClose (so it always calls the current prop, not a stale one)", () => {
    const idx = coverageSummary.indexOf('e.key === "Escape"');
    const after = coverageSummary.slice(idx, idx + 400);
    assert.match(after, /\}, \[onClose\]\);/);
  });

  it("matches ScriptDoctorPanel's own Escape-handler shape exactly (same pattern, not a divergent one)", () => {
    const oursBody = extractEscapeEffect(coverageSummary)
      .replace(/\s+/g, " ")
      .trim();
    const theirsBody = extractEscapeEffect(scriptDoctorPanel)
      .replace(/\s+/g, " ")
      .trim();
    // Both must contain the identical minimal handler shape: a keydown
    // listener that checks Escape and calls the panel's own close callback.
    const shape = /const handler = \(e: KeyboardEvent\) => \{ if \(e\.key === "Escape"\) onClose\(\); \};/;
    assert.match(oursBody, shape, "CoverageSummary's handler should match ScriptDoctorPanel's shape");
    assert.match(theirsBody, shape, "sanity: ScriptDoctorPanel's own handler should match its documented shape");
  });
});
