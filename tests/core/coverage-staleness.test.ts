// G0-02 — Coverage (and Script Doctor fix write-backs) must invalidate when
// the draft changed since the report was produced.
//
// The staleness decision is extracted into a single pure helper
// (src/lib/coverage-staleness.ts) shared by CoverageSummary (late-response
// guard, before onFreshReport / onLoadSampleIntoEditor) and ScriptDoctorPanel
// (acceptFix and "Load converted Fountain into editor" write-backs). A draft
// generation counter is captured when a request starts and compared against
// the live generation when the result lands; a mismatch means the writer
// typed during flight and the result must NOT be applied over their edits.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isDraftStale, decideWriteBack } from "../../src/lib/coverage-staleness.ts";

describe("coverage-staleness (G0-02 writer safety)", () => {
  it("flags a draft as stale when it advanced during a request's flight", () => {
    // captured gen 3 at request start, user typed → live gen 4 on resolution
    assert.equal(isDraftStale(3, 4), true);
  });

  it("does not flag staleness when the draft is unchanged", () => {
    assert.equal(isDraftStale(7, 7), false);
  });

  it("refuses a write-back whose report generation no longer matches the live draft", () => {
    const decision = decideWriteBack(2, 5);
    assert.equal(decision.allow, false);
    assert.equal(decision.reason, "draft-changed");
  });

  it("allows a write-back when the report was produced against the current draft", () => {
    const decision = decideWriteBack(9, 9);
    assert.equal(decision.allow, true);
    assert.equal(decision.reason, "current");
  });

  it("treats any generation drift, forward or backward, as a mismatch", () => {
    assert.equal(decideWriteBack(5, 4).allow, false);
    assert.equal(decideWriteBack(4, 5).allow, false);
  });
});
