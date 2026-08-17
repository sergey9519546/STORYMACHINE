// W4 — "Full report" must receive the already-computed report.
//
// Before this fix, clicking "Full report" inside CoverageSummary unmounted it
// and mounted ScriptDoctorPanel cold (autoLoadSample={false}), discarding the
// ScriptDoctorReport CoverageSummary had already computed and forcing the
// writer to re-pay the whole 14-pass diagnosis via an idle "Run Diagnosis"
// button. The fix threads the report through ScriptIDE.tsx as
// ThreadedCoverageReport (src/lib/coverage-staleness.ts): CoverageSummary
// hands it up via onReportComputed, ScriptIDE lifts it into `coverageReport`
// state, and ScriptDoctorPanel hydrates its success state from the
// `initialReport` prop at mount instead of calling the API again — UNLESS the
// draft generation has moved since the report was measured, in which case it
// must show the existing "Coverage outdated" state rather than a
// fresh-looking stale report (G0-02).
//
// No React render harness in this repo (see CLAUDE.md) — source-level
// assertions, matching the established pattern (coverage-staleness.test.ts,
// coverage-summary-escape.test.ts).

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (rel: string) => fs.readFileSync(path.resolve(import.meta.dirname, rel), "utf8");

const coverageSummary = read("../../src/components/scriptide/CoverageSummary.tsx");
const scriptDoctorPanel = read("../../src/components/scriptide/ScriptDoctorPanel.tsx");
const scriptIde = read("../../src/components/ScriptIDE.tsx");
const coverageStalenessLib = read("../../src/lib/coverage-staleness.ts");

describe("W4 — CoverageSummary -> ScriptDoctorPanel 'Full report' handoff", () => {
  it("coverage-staleness.ts defines the shared ThreadedCoverageReport payload shape", () => {
    assert.match(coverageStalenessLib, /export interface ThreadedCoverageReport \{/);
    assert.match(coverageStalenessLib, /report: ScriptDoctorReport;/);
    assert.match(coverageStalenessLib, /generation: number;/);
    assert.match(coverageStalenessLib, /fountain: string;/);
    assert.match(coverageStalenessLib, /isSample: boolean;/);
  });

  describe("CoverageSummary hands the computed report up", () => {
    it("accepts an onReportComputed prop typed against the shared payload", () => {
      assert.match(
        coverageSummary,
        /onReportComputed\?:\s*\(payload: ThreadedCoverageReport\) => void;/,
      );
    });

    it("fires onReportComputed under the SAME freshness gate as onFreshReport", () => {
      // Both calls must live after the `if (stale) return;` early-out, so a
      // response CoverageSummary itself treats as stale (edits made mid-flight,
      // or the panel torn down) is never handed up as if it were current.
      const idx = coverageSummary.indexOf("if (stale) return;");
      const freshIdx = coverageSummary.indexOf("onFreshReport?.();");
      const computedIdx = coverageSummary.indexOf("onReportComputed?.({");
      assert.ok(idx > -1, "expected the stale-response early return in CoverageSummary's run()");
      assert.ok(freshIdx > idx, "onFreshReport?.() must come after the stale early-return");
      assert.ok(computedIdx > idx, "onReportComputed?.() must come after the stale early-return");
    });

    it("fires onReportComputed AFTER the sample-install branch, reading generation fresh", () => {
      // installDraft's mutateDraft() bumps the shared draft generation the
      // instant a sample is written into the editor (every real content
      // mutation must, per ScriptIDE.tsx's mutateDraft contract) — reusing
      // the PRE-install startDraftGen would make a report that is
      // byte-identical to what's now on screen look stale the instant it
      // lands, a false "Coverage outdated" on the P0 golden path
      // (StartScreen -> "Try sample coverage" -> Full report). onReportComputed
      // must therefore fire after onLoadSampleIntoEditor, not before it.
      const installIdx = coverageSummary.indexOf("onLoadSampleIntoEditor(override.fountain);");
      const reportComputedIdx = coverageSummary.indexOf("onReportComputed?.({");
      assert.ok(installIdx > -1 && reportComputedIdx > -1);
      assert.ok(
        reportComputedIdx > installIdx,
        "onReportComputed must fire after the sample-install branch, not before it",
      );
    });

    it("threads a freshly-read generation, title, fountain, and sample provenance", () => {
      const idx = coverageSummary.indexOf("onReportComputed?.({");
      assert.ok(idx > -1);
      const block = coverageSummary.slice(idx, idx + 300);
      assert.match(block, /report:\s*data,/);
      // Read fresh (not the pre-request startDraftGen snapshot) — see the
      // ordering test above for why: for a sample run, startDraftGen predates
      // the install that just wrote this exact content into the shared draft.
      // For a non-sample run this is provably equal to startDraftGen anyway
      // (the `stale` check already returned above if the writer edited
      // mid-flight), so this is a safe read either way.
      assert.match(block, /generation:\s*getDraftGeneration\?\.\(\) \?\? startDraftGen,/);
      assert.match(block, /title:\s*override\?\.title \?\? title \?\? "Untitled",/);
      assert.match(block, /fountain:\s*override\?\.fountain \?\? fountain,/);
      assert.match(block, /isSample:\s*!!override\?\.sample,/);
    });

    it("declares onReportComputed as a dependency of the run() callback (always the current prop)", () => {
      assert.match(coverageSummary, /\[fountain, title, onFreshReport, onReportComputed, onLoadSampleIntoEditor, getDraftGeneration\]/);
    });
  });

  describe("ScriptIDE lifts the computed report and threads it into the full panel", () => {
    it("declares coverageReport state typed as ThreadedCoverageReport | null", () => {
      assert.match(
        scriptIde,
        /const \[coverageReport, setCoverageReport\] = useState<ThreadedCoverageReport \| null>\(null\);/,
      );
    });

    it("wires CoverageSummary's onReportComputed straight to setCoverageReport", () => {
      assert.match(scriptIde, /onReportComputed=\{setCoverageReport\}/);
    });

    it("passes coverageReport into ScriptDoctorPanel as initialReport", () => {
      const idx = scriptIde.indexOf("<ScriptDoctorPanel");
      assert.ok(idx > -1);
      const block = scriptIde.slice(idx, idx + 400);
      assert.match(block, /initialReport=\{coverageReport\}/);
    });
  });

  describe("ScriptDoctorPanel hydrates from initialReport instead of re-running cold", () => {
    it("declares an initialReport prop on ScriptDoctorPanelProps", () => {
      assert.match(scriptDoctorPanel, /initialReport\?:\s*ThreadedCoverageReport \| null;/);
    });

    it("consumes initialReport exactly once at mount, ref-gated against re-renders", () => {
      assert.match(scriptDoctorPanel, /const initialReportHydratedRef = useRef\(false\);/);
      assert.match(
        scriptDoctorPanel,
        /if \(initialReportHydratedRef\.current\) return;\s*\n\s*initialReportHydratedRef\.current = true;/,
      );
    });

    it("a fresh handoff hydrates report/status/history WITHOUT any network call", () => {
      const idx = scriptDoctorPanel.indexOf("const isFresh = currentGen");
      assert.ok(idx > -1, "expected the freshness check in the initialReport hydration effect");
      const block = scriptDoctorPanel.slice(idx, idx + 1700);
      assert.match(block, /setReport\(initialReport\.report\);/);
      assert.match(block, /reportDraftGenRef\.current = initialReport\.generation;/, "must set the G0-02 write-back guard exactly as a fresh run would");
      assert.match(block, /setActiveReportTitle\(initialReport\.title\);/);
      assert.match(block, /setAnalyzedIsSample\(initialReport\.isSample\);/);
      assert.match(block, /setStatus\("success"\);/);
      assert.match(block, /recordDoctorHistory\(/, "must record draft-over-draft history the same as a fresh runDiagnosis()");
      assert.doesNotMatch(block, /fetch\(/, "the fresh-hydration branch must never call the network");
    });

    it("a stale handoff (draft moved since the report was measured) does NOT show it as a fresh report", () => {
      const idx = scriptDoctorPanel.indexOf("if (!isFresh) {");
      assert.ok(idx > -1);
      const blockEnd = scriptDoctorPanel.indexOf("setReport(initialReport.report)", idx);
      assert.ok(blockEnd > idx, "expected the fresh-hydration branch to follow the !isFresh block");
      const block = scriptDoctorPanel.slice(idx, blockEnd);
      assert.match(block, /setHandoffOutdated\(true\);/);
      assert.doesNotMatch(block, /setStatus\("success"\)/, "a stale report must never be marked success");
      assert.doesNotMatch(block, /setReport\(/, "a stale report's numbers must never be displayed");
    });

    it("isFresh is computed via the shared isDraftStale primitive (same contract as every other G0-02 caller)", () => {
      assert.match(
        scriptDoctorPanel,
        /const isFresh = currentGen !== undefined && !isDraftStale\(initialReport\.generation, currentGen\);/,
      );
      assert.match(scriptDoctorPanel, /import \{ decideWriteBack, isDraftStale, type ThreadedCoverageReport \} from "\.\.\/\.\.\/lib\/coverage-staleness\.ts";/);
    });

    it("renders a dismissible 'Coverage outdated' banner for handoffOutdated, distinct from staleWriteBackNotice", () => {
      assert.match(scriptDoctorPanel, /\{handoffOutdated && \(/);
      assert.match(
        scriptDoctorPanel,
        /Coverage outdated — your draft changed since that report ran\. Run a fresh diagnosis for current results\./,
      );
      assert.match(scriptDoctorPanel, /onClick=\{\(\) => setHandoffOutdated\(false\)\}/);
    });

    it("skips the autoLoadSample effect when an initialReport is present (the two entry points can't race)", () => {
      assert.match(
        scriptDoctorPanel,
        /if \(autoLoadSample && !autoSampleFiredRef\.current && !initialReport\) \{/,
      );
    });
  });
});
