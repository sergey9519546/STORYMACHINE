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
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { isDraftStale, decideWriteBack } from "../../src/lib/coverage-staleness.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf8");

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

// KNOWN GAP CLOSE: draftTextGenRef (the counter these helpers key off of) was
// bumped ONLY in handleScriptChange. Every other path that mutates the draft
// (submitActionModal, handleApplySuggestion, snapshot restore, fdx/converted-
// fountain load, the sample-install callback, server-conflict resolution...)
// called setScriptText directly and left the counter untouched, so a Script
// Doctor report was not marked stale after e.g. an action-modal insert. Fix:
// every mutation routes through a single mutateDraft(text) wrapper that both
// writes the draft and bumps the counter. These are source-level assertions
// (this repo's sanctioned pattern for component logic — no React render
// harness) rather than a render test.
describe("G0-02 gap close — every ScriptIDE draft mutation bumps draftTextGenRef", () => {
  const scriptIde = read("../../src/components/ScriptIDE.tsx");

  it("defines a single mutateDraft wrapper that writes the draft and bumps draftTextGenRef together", () => {
    assert.match(
      scriptIde,
      /const mutateDraft = useCallback\(\(text: string\) => \{[\s\S]{0,200}?setScriptText\(text\);[\s\S]{0,200}?draftTextGenRef\.current \+= 1;[\s\S]{0,200}?\}, \[\]\);/,
      "ScriptIDE.tsx must define a mutateDraft(text) wrapper that both calls setScriptText(text) and bumps draftTextGenRef.current",
    );
  });

  it("has no raw setScriptText( call site left in ScriptIDE.tsx outside the mutateDraft wrapper (or an explicitly exempt comment)", () => {
    // Strip the wrapper's own internal call (the one legitimate raw usage),
    // then any site explicitly marked exempt via a same-line/prior-line
    // "G0-02-STALENESS-EXEMPT" comment, then assert nothing raw remains. A
    // raw setScriptText( bypasses the staleness counter entirely, letting a
    // later-resolving stale coverage/fix report silently write back over a
    // draft that was mutated through that uncounted path.
    const withoutWrapperDef = scriptIde.replace(
      /const mutateDraft = useCallback\(\(text: string\) => \{[\s\S]{0,400}?\}, \[\]\);/,
      "",
    );
    const withoutExemptSites = withoutWrapperDef.replace(
      /\/\/[^\n]*G0-02-STALENESS-EXEMPT[^\n]*\n[^\n]*setScriptText\(/g,
      "",
    );
    const rawCallSites = withoutExemptSites.match(/\bsetScriptText\(/g) ?? [];
    assert.equal(
      rawCallSites.length,
      0,
      `found ${rawCallSites.length} raw setScriptText( call site(s) in ScriptIDE.tsx outside mutateDraft — route through mutateDraft(text) so draftTextGenRef stays authoritative`,
    );
  });
});
