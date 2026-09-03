// G0-01 — a sample script can NEVER overwrite draft text.
//
// The decision of whether a sample may be installed into the editor is
// extracted into a single pure guard (src/lib/sample-install-guard.ts) so it
// can be exercised directly and is shared by the real code paths in ScriptIDE
// (the sample auto-fire mount effect and the onLoadSampleIntoEditor
// write-back callback). If a non-empty draft would be clobbered, the guard
// MUST refuse — the draft has to survive byte-identical.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decideSampleInstall } from "../../src/lib/sample-install-guard.ts";

const SAMPLE = "INT. OFFICE - DAY\n\nA sample scene.\n";

describe("decideSampleInstall (G0-01 writer safety)", () => {
  it("refuses to install the sample when a differing non-empty draft exists", () => {
    const draft = "FADE IN:\n\nMy real work-in-progress.\n";
    const decision = decideSampleInstall({ currentDraft: draft, incomingSample: SAMPLE });
    assert.equal(decision.allow, false);
    assert.equal(decision.reason, "draft-present");
  });

  it("allows the sample into a truly empty draft", () => {
    const decision = decideSampleInstall({ currentDraft: "", incomingSample: SAMPLE });
    assert.equal(decision.allow, true);
  });

  it("treats a whitespace-only draft as empty (safe to install)", () => {
    const decision = decideSampleInstall({ currentDraft: "   \n\t\n", incomingSample: SAMPLE });
    assert.equal(decision.allow, true);
  });

  it("allows an idempotent re-install when draft already equals the sample", () => {
    const decision = decideSampleInstall({ currentDraft: SAMPLE, incomingSample: SAMPLE });
    assert.equal(decision.allow, true);
  });

  it("refuses even when the draft differs only by appended edits to the sample", () => {
    const draft = SAMPLE + "\nINT. NEW SCENE - NIGHT\n\nWork the writer added.\n";
    const decision = decideSampleInstall({ currentDraft: draft, incomingSample: SAMPLE });
    assert.equal(decision.allow, false);
    assert.equal(decision.reason, "draft-present");
  });

  // Retrospective #2 — the second data-loss path: sample loads, writer
  // select-all/deletes it back to an empty draft, then navigates away and
  // back to Coverage. A remount resets any local "already fired" ref, but
  // the draft's emptiness must NOT be read as "safe to auto-fill" once it is
  // known to have held the sample — "writer cleared it" must beat
  // "draft is empty."
  it("refuses to silently reinstall into a draft the writer emptied after it held the sample", () => {
    const decision = decideSampleInstall({
      currentDraft: "",
      incomingSample: SAMPLE,
      sampleAlreadyInstalled: true,
    });
    assert.equal(decision.allow, false);
    assert.equal(decision.reason, "cleared-by-writer");
  });

  it("still refuses a whitespace-only cleared draft the same way (not just byte-empty)", () => {
    const decision = decideSampleInstall({
      currentDraft: "   \n\t\n",
      incomingSample: SAMPLE,
      sampleAlreadyInstalled: true,
    });
    assert.equal(decision.allow, false);
    assert.equal(decision.reason, "cleared-by-writer");
  });

  it("allows a fresh explicit install into a never-touched empty draft (sampleAlreadyInstalled unset)", () => {
    const decision = decideSampleInstall({ currentDraft: "", incomingSample: SAMPLE });
    assert.equal(decision.allow, true);
    assert.equal(decision.reason, "empty-draft");
  });

  it("still allows an idempotent re-install when the draft already equals the sample, even if the flag is set", () => {
    const decision = decideSampleInstall({
      currentDraft: SAMPLE,
      incomingSample: SAMPLE,
      sampleAlreadyInstalled: true,
    });
    assert.equal(decision.allow, true);
    assert.equal(decision.reason, "identical");
  });
});
