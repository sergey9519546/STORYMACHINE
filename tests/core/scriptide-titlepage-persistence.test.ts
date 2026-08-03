// Defect: ScriptIDE.tsx initialized titlePage to hardcoded placeholders
// ("UNTITLED SCRIPT" / "AUTHOR NAME" / "CONTACT INFO") instead of reading
// initialDraft.titlePage — unlike isDarkMode, snapshots, and researchNotes in
// the SAME component, which correctly seed their useState from initialDraft.
// A writer's title/author/contact therefore silently vanished on reload or a
// fresh export, even though exportFountain() already read the LIVE titlePage
// state correctly (the bug was purely in how that state got seeded).
//
// The fix extends the draft-envelope persistence
// (src/lib/scriptide-draft-store.ts, covered directly in
// scriptide-draft-store.test.ts — round trip + pre-change-draft migration)
// to include titlePage, then wires ScriptIDE.tsx to actually read/write it
// through that envelope the same way isDarkMode/snapshots/researchNotes
// already do.
//
// ScriptIDE.tsx cannot be rendered under this repo's test harness (no
// jsdom/browser — see CLAUDE.md), so this file asserts on the component
// SOURCE, matching the established pattern for component logic elsewhere in
// this repo (e.g. coverage-staleness.test.ts, g0-04-programmatic-install-gate.test.ts).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(import.meta.dirname, "../../src/components/ScriptIDE.tsx");

describe("ScriptIDE.tsx — titlePage round-trips through the draft envelope", () => {
  const source = fs.readFileSync(SRC, "utf8");

  it("seeds titlePage state from initialDraft.titlePage, not a hardcoded literal", () => {
    assert.match(
      source,
      /const \[titlePage, setTitlePage\] = useState\(initialDraft\.titlePage\);/,
      "titlePage must be seeded the same way isDarkMode/snapshots/researchNotes already are",
    );
    // The regression this guards against: a hardcoded placeholder object
    // passed directly to useState, ignoring the persisted envelope entirely.
    assert.doesNotMatch(
      source,
      /useState\(\{\s*title:\s*"UNTITLED SCRIPT"/,
      "titlePage must not be re-hardcoded into useState's initializer",
    );
  });

  it("isDarkMode, snapshots, and researchNotes still seed from initialDraft (the pattern titlePage now matches)", () => {
    assert.match(source, /const \[isDarkMode, setIsDarkMode\] = useState\(initialDraft\.isDarkMode\);/);
    assert.match(source, /useState<[\s\S]{0,80}>\(initialDraft\.snapshots as/);
    assert.match(source, /useState<[\s\S]{0,80}>\(initialDraft\.researchNotes as/);
  });

  it("the mount-stable draftRef (initial value AND the always-current assignment) includes titlePage", () => {
    assert.match(
      source,
      /const draftRef = useRef<ScriptIDEDraftState>\(\{ scriptText, snapshots, characters, researchNotes, isDarkMode, titlePage \}\);/,
    );
    assert.match(
      source,
      /draftRef\.current = \{ scriptText, snapshots, characters, researchNotes, isDarkMode, titlePage \};/,
    );
  });

  it("the local-persistence effect's dependency array includes titlePage (else a title-only edit never saves)", () => {
    const idx = source.indexOf("Update the in-memory envelope immediately on a real edit");
    assert.ok(idx > -1, "expected the local-persistence effect's doc comment");
    const body = source.slice(idx, idx + 1800);
    assert.match(
      body,
      /\}, \[persistenceReady, scriptText, snapshots, characters, researchNotes, isDarkMode, titlePage\]\);/,
    );
  });

  it("both applyServerScriptIDEDraft call sites pass a titlePage argument (server has no titlePage of its own)", () => {
    const calls = source.match(/applyServerScriptIDEDraft\([^)]*\)/g) ?? [];
    assert.ok(calls.length >= 2, `expected at least 2 applyServerScriptIDEDraft call sites, found ${calls.length}`);
    for (const call of calls) {
      assert.match(
        call,
        /,\s*(draftEnvelopeRef\.current\.titlePage|titlePage)\)$/,
        `applyServerScriptIDEDraft call must pass titlePage explicitly: ${call}`,
      );
    }
  });

  it("the mount-only server-load effect reads titlePage off the ref, not the (stale-by-then) closed-over state", () => {
    // That effect has an empty dependency array ([] — mount only), so
    // closing over the `titlePage` variable directly would freeze it at its
    // initial-render value; draftEnvelopeRef.current stays live because the
    // local-persistence effect updates it synchronously on every edit.
    const idx = source.indexOf("if (decision.action === 'use-server')");
    assert.ok(idx > -1);
    const body = source.slice(idx, idx + 900);
    assert.match(body, /applyServerScriptIDEDraft\(decision\.server, draftEnvelopeRef\.current\.titlePage\)/);
  });

  it("exportFountain still reads the live titlePage state (unchanged — already correct)", () => {
    const idx = source.indexOf("const exportFountain = ()");
    assert.ok(idx > -1);
    const body = source.slice(idx, idx + 900);
    assert.match(body, /titlePage\.title\.trim\(\)/);
    assert.match(body, /titlePage\.author\.trim\(\)/);
    assert.match(body, /titlePage\.contact\.trim\(\)/);
  });
});
