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
      // 2026-09-05 (B-4): provenance comes from the RUN's own claimed
      // identity, not from a second read of `override` at resolution time.
      // The old shape (`isSample: !!override?.sample`) was correct for the
      // call that made it and wrong for what happened next: once
      // `sampleFired` was set, a later evaluation of the mount effect fell
      // through to a plain `void run()` that re-analysed the sample text now
      // sitting in the editor and handed it up as `isSample: false`, planting
      // the demo in the writer's Draft History and unlocking "Verify my
      // rewrite" on it. `isSampleRun` is claimed before the request goes out;
      // see CoverageSummary's sampleRunRef.
      assert.match(block, /isSample:\s*isSampleRun,/);
      assert.match(coverageSummary, /const isSampleRun = !!override\?\.sample;/);
      assert.match(coverageSummary, /sampleRunRef\.current = isSampleRun;/);
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
      // Window widened 2600 -> 3600 on 2026-09-05: the hydration effect grew the
      // script-identity derivation (B-3) between these assertions' first and
      // last matches. Same assertions, same one effect body — the window must
      // still END inside that effect, which it does (the next declaration,
      // handleExportReport, sits well past it).
      const block = scriptDoctorPanel.slice(idx, idx + 3600);
      assert.match(block, /setReport\(initialReport\.report\);/);
      assert.match(block, /reportDraftGenRef\.current = initialReport\.generation;/, "must set the G0-02 write-back guard exactly as a fresh run would");
      // 2026-09-05 (B-3): the threaded report's title now goes through the
      // same script-identity helper every other path uses
      // (src/lib/doctor-history-identity.ts), so the panel's label, its export
      // and its Draft History row cannot disagree about what was analyzed. The
      // identity is still derived from `initialReport` alone — no new input.
      assert.match(block, /const threadedIdentity = analyzedScriptIdentity\(/);
      assert.match(block, /kind: "editor", hostTitle: initialReport\.title/);
      assert.match(block, /setActiveReportTitle\(threadedIdentity\.title\);/);
      assert.match(block, /setAnalyzedScript\(threadedIdentity\);/);
      assert.match(block, /setAnalyzedIsSample\(initialReport\.isSample\);/);
      assert.match(block, /setStatus\("success"\);/);
      assert.match(block, /recordDoctorHistory\(/, "must record draft-over-draft history the same as a fresh runDiagnosis()");
      assert.doesNotMatch(block, /fetch\(/, "the fresh-hydration branch must never call the network");
    });

    it("a fresh handoff fires the same P3/P4 instrumentation a real runDiagnosis() success would", () => {
      // P4-instrumentation regression guard: doctor_run / first_report (once
      // per session) are the ONLY signal behind the P3/P4 exit-gate metrics
      // ("% of Doctor runs that export is measured", time-to-first-report).
      // They live entirely inside trackDoctorRun() (src/lib/analytics.ts),
      // called only from a real runDiagnosis() success before this fix —
      // skipping it here would silently undercount every writer who reaches
      // Script Doctor via Coverage's "Full report", this product's primary
      // entry point, even though a real diagnosis (CoverageSummary's own
      // /api/scriptide/doctor call) is exactly what produced this report.
      const idx = scriptDoctorPanel.indexOf("const isFresh = currentGen");
      // Window widened 2600 -> 3600 on 2026-09-05: the hydration effect grew the
      // script-identity derivation (B-3) between these assertions' first and
      // last matches. Same assertions, same one effect body — the window must
      // still END inside that effect, which it does (the next declaration,
      // handleExportReport, sits well past it).
      const block = scriptDoctorPanel.slice(idx, idx + 3600);
      assert.match(
        block,
        /trackDoctorRun\(initialReport\.isSample \? "sample" : "draft"\);/,
        'must call trackDoctorRun with the report\'s own provenance (never "upload" — a threaded report is never sourced from one)',
      );
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
