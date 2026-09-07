// Feature-length defect #1 (2026-09-06) — typing a new scene into a
// feature-length draft after running coverage threw React error #185
// ("Maximum update depth exceeded") out of the editor's CodeMirror update
// listener (src/components/editor/FountainEditor.tsx:378-384).
//
// ── The cycle, exactly ─────────────────────────────────────────────────────
//
//   1. keystroke → FountainEditor's updateListener → onChange →
//      ScriptIDE.handleScriptChange → mutateDraft → setScriptText.
//      That puts a PENDING update on the ScriptIDE fiber.
//   2. the commit runs the localStorage persistence effect
//      (ScriptIDE.tsx's `// ── Persist to localStorage ──` effect, deps
//      [persistenceReady, scriptText, snapshots, characters, researchNotes,
//      isDarkMode, titlePage]), which calls setSaveStatus("saving-local").
//      From the second keystroke of a burst on, that is the value already
//      held — semantically a no-op.
//   3. React cannot absorb it. dispatchSetState's same-value bail-out is
//      gated on `fiber.lanes === 0 && (alternate === null ||
//      alternate.lanes === 0)`; step 1 just made that false. So the no-op
//      write schedules real default-lane work.
//   4. every keystroke's commit therefore ends with pending lanes, which is
//      the condition commitRootImpl increments nestedUpdateCount on
//      (`remainingLanes & 42`). Past 50 consecutive keystrokes with no gap
//      long enough for React to drain, the next setState throws.
//
// Feature length is what removes the gaps: on a 12-scene short each commit
// finishes between keystrokes and the counter resets. Measured with
// scripts/verify-p2-p3-surfaces.mjs's feature-length phase against
// tests/fixtures/feature-length/assembled-feature.fountain — 5/5 reproductions
// before, 0/5 after.
//
// ── What this file asserts ────────────────────────────────────────────────
//
// Source-level, this repo's sanctioned pattern for component logic (no React
// render harness — see tests/core/coverage-staleness.test.ts, which guards
// mutateDraft the same way). Two directions: the fix is present, AND the
// shape that caused the defect cannot come back.

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createIdempotentWriter } from "../../src/hooks/idempotent-state.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(__dirname, rel), "utf8");

describe("idempotent-state core — a repeat write never reaches the consumer", () => {
  it("forwards the first write and suppresses an identical repeat", () => {
    let current = "idle";
    const written: string[] = [];
    const set = createIdempotentWriter<string>({
      read: () => current,
      write: (v) => { current = v; written.push(v); },
    });
    assert.equal(set("saving-local"), true, "first write must reach the consumer");
    assert.equal(set("saving-local"), false, "an identical repeat must not");
    assert.deepEqual(written, ["saving-local"]);
  });

  it("collapses a whole typing burst to ONE write (the measured defect shape)", () => {
    // 140 keystrokes, the persistence effect writing "saving-local" after
    // each one — exactly what the instrumented browser trace recorded on the
    // unfixed tree (140 scheduled updates for one semantic transition).
    let current: string = "idle";
    let writes = 0;
    const set = createIdempotentWriter<string>({
      read: () => current,
      write: (v) => { current = v; writes++; },
    });
    for (let i = 0; i < 140; i++) set("saving-local");
    assert.equal(writes, 1, "140 identical writes must schedule exactly one update");
  });

  it("still forwards every genuine transition, including a return to a prior value", () => {
    // The negative direction: suppression must not swallow real status
    // changes. saving-local → saved-local → saving-local is the ordinary
    // autosave cycle and all three must land.
    let current = "idle";
    const written: string[] = [];
    const set = createIdempotentWriter<string>({
      read: () => current,
      write: (v) => { current = v; written.push(v); },
    });
    for (const v of ["saving-local", "saving-local", "saved-local", "saved-local", "saving-local"]) set(v);
    assert.deepEqual(written, ["saving-local", "saved-local", "saving-local"]);
  });

  it("uses Object.is semantics by default, so NaN is not treated as a change", () => {
    let current = Number.NaN;
    let writes = 0;
    const set = createIdempotentWriter<number>({
      read: () => current,
      write: (v) => { current = v; writes++; },
    });
    assert.equal(set(Number.NaN), false);
    assert.equal(set(1), true);
    assert.equal(writes, 1);
  });

  it("honours a custom equality so a caller can dedupe structurally", () => {
    let current = { a: 1 };
    let writes = 0;
    const set = createIdempotentWriter<{ a: number }>({
      read: () => current,
      write: (v) => { current = v; writes++; },
      equals: (x, y) => x.a === y.a,
    });
    assert.equal(set({ a: 1 }), false, "structurally equal must be suppressed");
    assert.equal(set({ a: 2 }), true);
    assert.equal(writes, 1);
  });
});

describe("ScriptIDE render-loop guard — save status never schedules a no-op update", () => {
  const scriptIde = read("../../src/components/ScriptIDE.tsx");

  it("declares saveStatus with useIdempotentState, not a raw useState", () => {
    assert.match(
      scriptIde,
      /const \[saveStatus, setSaveStatus\] = useIdempotentState<SaveStatus>\(/,
      'ScriptIDE.tsx must declare saveStatus via useIdempotentState — a raw useState reintroduces React #185 on a feature-length draft (see this file\'s header)',
    );
    assert.doesNotMatch(
      scriptIde,
      /const \[saveStatus, setSaveStatus\] = useState/,
      "saveStatus must not be a raw useState",
    );
  });

  it("imports the hook it claims to use", () => {
    assert.match(
      scriptIde,
      /import \{ useIdempotentState \} from "\.\.\/hooks\/useIdempotentState\.ts";/,
      "the guard above is only meaningful if the hook is actually imported",
    );
  });

  it("keeps the persistence effect's unconditional per-keystroke status write (the fix is the setter, not a new branch)", () => {
    // The effect SHOULD keep writing on every edit — that is what makes the
    // toolbar honest the instant a real transition happens. What changed is
    // that the write is now free when nothing changed. Asserting the write is
    // still there stops a future "optimization" from moving the guard into
    // the effect and quietly making the status stale instead.
    assert.match(
      scriptIde,
      /setSaveStatus\(saveConflictRef\.current \? "save-conflict" : "saving-local"\);/,
      "the persistence effect must still report status on every edit",
    );
  });

  it("routes the editor's per-keystroke path through mutateDraft only (no second state write added)", () => {
    // handleScriptChange is the hot path: one draft write, one staleness
    // flag, no third setState. A new unconditional setState here would put
    // the nested-update counter back on the same trajectory.
    const handler = scriptIde.match(/const handleScriptChange = \(text: string\) => \{[\s\S]*?\n  \};/);
    assert.ok(handler, "handleScriptChange must still exist in ScriptIDE.tsx");
    const setStateCalls = handler[0].match(/\bset[A-Z]\w*\(/g) ?? [];
    assert.deepEqual(
      [...new Set(setStateCalls)].sort(),
      ["setCoverageStale("],
      `handleScriptChange schedules ${setStateCalls.length} state write(s) beyond mutateDraft: ${[...new Set(setStateCalls)].join(", ")}`,
    );
  });
});
