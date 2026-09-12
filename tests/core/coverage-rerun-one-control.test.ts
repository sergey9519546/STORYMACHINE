// "Re-run coverage" must re-run coverage — and only a COMPLETED run may
// retract the "Coverage outdated" warning.
//
// ── The defect this pins (2026-09-12 adversarial audit, finding #3) ─────────
//
// `src/components/ScriptIDE.tsx`'s action strip renders
//
//     <span>Coverage outdated</span>
//     <button onClick={() => handleTaskChange("coverage")}>Re-run coverage</button>
//
// The banner is reachable while the active task is ALREADY `coverage` (it is
// the branch directly above the `task === "coverage"` branch in the same
// ternary chain), so switching the task to `coverage` was a no-op: the audit
// measured ZERO `/api/scriptide/doctor/stream` requests after the click. Worse,
// `handleTaskChange("coverage")` ALSO called `setCoverageStale(false)` — so the
// click dismissed the one honest warning that the verdict on screen had been
// computed for text that no longer existed. The panel header's circular-arrow
// control (`CoverageSummary`'s own `run()`) did work: two controls, one name,
// one of them inert.
//
// The fix is structural, not cosmetic: there is ONE `run()` (CoverageSummary's),
// it is published to the host via `onRegisterRun`, and every re-run control
// invokes that same function object. The stale flag is cleared by
// `onFreshReport` — which fires only when a run resolves with a report that is
// still current — and by nothing else on any click path.
//
// Source-level assertions, this repository's convention for React wiring (no
// jsdom harness — see CLAUDE.md and tests/core/coverage-handoff.test.ts). The
// DRIVEN half lives in scripts/verify-p2-p3-surfaces.mjs's `P2-rerun` phase,
// which edits after a run, clicks this exact button, and asserts a doctor
// request happened and the verdict changed.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(import.meta.dirname, "../../src");
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8");

/** Line comments are stripped before the "does not contain" assertions below:
 *  the fix's own comments NAME the call they removed ("NOT
 *  setCoverageStale(false)"), and a naive substring search over the raw source
 *  would read that explanation as the call itself. Block comments are left
 *  alone — none of the regions sliced below contains one. */
const stripLineComments = (src: string) => src.replace(/^[ \t]*\/\/.*$/gm, "");

const scriptIde = stripLineComments(read("components/ScriptIDE.tsx"));
const coverageSummary = read("components/scriptide/CoverageSummary.tsx");

describe("CoverageSummary publishes its own run() to the host", () => {
  it("declares the onRegisterRun prop", () => {
    assert.match(coverageSummary, /onRegisterRun\?: \(run: \(\(\) => void\) \| null\) => void;/);
    assert.match(coverageSummary, /\n  onRegisterRun,\n/);
  });

  it("registers the SAME run the circular-arrow control calls, and deregisters on unmount", () => {
    assert.match(coverageSummary, /onRegisterRun\?\.\(\(\) => void run\(\)\);/);
    assert.match(coverageSummary, /return \(\) => onRegisterRun\?\.\(null\);/);
    // The panel's own header control is unchanged — same `run`, so "both
    // controls call the same run()" is literally one function object.
    assert.match(coverageSummary, /onClick=\{\(\) => void run\(\)\}[\s\S]{0,200}aria-label="Re-run coverage"/);
  });
});

describe("ScriptIDE — the outdated banner issues a real run", () => {
  it("holds the registered run and exposes ONE rerunCoverage handler", () => {
    assert.match(scriptIde, /const coverageRunRef = useRef<\(\(\) => void\) \| null>\(null\);/);
    assert.match(scriptIde, /const registerCoverageRun = useCallback\(\(run: \(\(\) => void\) \| null\) => \{\s*coverageRunRef\.current = run;/);
    assert.match(scriptIde, /const rerunCoverage = useCallback\(\(\) => \{/);
    // It invokes the registered run when the panel is mounted, and only falls
    // back to opening the panel (which runs on mount) when it is not.
    const handler = scriptIde.slice(
      scriptIde.indexOf("const rerunCoverage = useCallback"),
      scriptIde.indexOf("}, [handleTaskChange]);"),
    );
    assert.ok(handler.length > 0, "rerunCoverage handler not found");
    assert.match(handler, /const run = coverageRunRef\.current;/);
    assert.match(handler, /run\(\);/);
    assert.match(handler, /handleTaskChange\("coverage"\)/);
    assert.doesNotMatch(handler, /setCoverageStale/);
  });

  it("the banner's button calls rerunCoverage, not handleTaskChange", () => {
    const bannerStart = scriptIde.indexOf('<span className="sm-slug">Coverage outdated</span>');
    assert.ok(bannerStart > -1, "outdated banner not found");
    const banner = scriptIde.slice(bannerStart, scriptIde.indexOf("Re-run coverage", bannerStart) + 200);
    assert.ok(banner.length > 0, "outdated banner not found");
    assert.match(banner, /onClick=\{rerunCoverage\}/);
    assert.doesNotMatch(banner, /handleTaskChange\("coverage"\)/);
  });

  it("wires CoverageSummary's registration with a stable callback", () => {
    assert.match(scriptIde, /onRegisterRun=\{registerCoverageRun\}/);
  });
});

describe("the stale flag is retracted by a completed run, never by a click", () => {
  it("handleTaskChange no longer clears coverageStale", () => {
    const handler = scriptIde.slice(
      scriptIde.indexOf("const handleTaskChange = useCallback"),
      scriptIde.indexOf("/** Stable identity, so CoverageSummary's registration effect"),
    );
    assert.ok(handler.length > 0, "handleTaskChange not found");
    assert.doesNotMatch(
      handler,
      /setCoverageStale\(false\)/,
      "switching the active task is a request for a run, not proof one finished",
    );
  });

  it("openToolSlot no longer clears coverageStale", () => {
    const handler = scriptIde.slice(
      scriptIde.indexOf("const openToolSlot = useCallback"),
      scriptIde.indexOf("const handleTaskChange = useCallback"),
    );
    assert.ok(handler.length > 0, "openToolSlot not found");
    assert.doesNotMatch(handler, /setCoverageStale\(false\)/);
  });

  it("onFreshReport is still the path that clears it", () => {
    assert.match(scriptIde, /onFreshReport=\{\(\) => setCoverageStale\(false\)\}/);
    // …and CoverageSummary still refuses to fire onFreshReport for a response
    // the draft has moved past (G0-02's guard, which this change depends on).
    assert.match(coverageSummary, /if \(stale\) return;\s*\n\s*onFreshReport\?\.\(\);/);
  });
});
