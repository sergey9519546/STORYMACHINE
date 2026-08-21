// E5 (docs/PATH_TO_EXCELLENCE.md): source-assertion coverage for the
// command palette's React wiring — this repo has no jsdom/browser harness
// (see CLAUDE.md and tests/core/use-modal-focus-trap.test.ts's header), so
// component-level behavior that can't be rendered gets verified at the
// source level instead, the same established pattern
// tests/core/modal-focus-trap-wirings.test.ts uses.
//
// What this file actually proves:
//   1. ScriptIDE.tsx's palette action registry dispatches through the SAME
//      named callbacks the visible Toolbar/panel buttons call — not a
//      parallel re-implementation — by asserting each `run:` reads one of
//      those exact identifiers.
//   2. The Escape-ladder checks paletteOpen FIRST (topmost-layer-only close).
//   3. Cmd/Ctrl+K, Cmd/Ctrl+S, Alt+Shift+D, and Ctrl+Shift+F are really
//      bound, and Alt+Shift+D / Ctrl+Shift+F really call the same
//      toggleDarkMode/toggleTypewriterFocus functions the palette rows use.
//   4. CommandPalette.tsx itself is wired into useModalFocusTrap correctly
//      (ref + tabIndex={-1} + role="dialog") — same check
//      modal-focus-trap-wirings.test.ts runs for the other 9 dialogs.
//   5. ShortcutModal.tsx's inventory has no row left over from the pre-E5
//      version that this pass proved false (grepped against the whole src
//      tree — see the browser-proof script's own note and
//      ShortcutModal.tsx's header comment for the audit trail).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SRC = path.resolve(import.meta.dirname, "../../src");
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), "utf8");

describe("ScriptIDE.tsx — command palette registry dispatches through real handlers", () => {
  const source = read("components/ScriptIDE.tsx");

  it("imports CommandPalette and the PaletteAction type", () => {
    assert.match(source, /import CommandPalette from ["']\.\/scriptide\/CommandPalette["']/);
    assert.match(source, /import type \{ PaletteAction \} from ["']\.\.\/lib\/command-palette["']/);
  });

  it("declares paletteOpen state and renders <CommandPalette> gated on it", () => {
    assert.match(source, /const \[paletteOpen, setPaletteOpen\] = useState\(false\);/);
    assert.match(source, /\{paletteOpen && \(\s*<CommandPalette actions=\{paletteActions\} onClose=\{\(\) => setPaletteOpen\(false\)\}/);
  });

  it("builds paletteActions as PaletteAction[]", () => {
    assert.match(source, /const paletteActions: PaletteAction\[\] = \[/);
  });

  // Every `run:` in the registry must be one of these EXACT expressions —
  // each one is either a named callback ALSO passed as a Toolbar prop
  // elsewhere in this file, or a direct call to a stable useCallback
  // (handleTaskChange/openToolSlot/handleNavigate) that Toolbar/Sidebar
  // call the exact same way. Anything else in a `run:` position would mean
  // the palette re-implemented dispatch instead of reusing it.
  // No trailing comma/brace on any pattern — the extraction below strips
  // that punctuation from every captured expression (one-line and
  // multi-line registry entries format it differently, so normalizing both
  // down to "just the expression" is simpler than encoding two shapes).
  const ALLOWED_RUN_PATTERNS: RegExp[] = [
    /^run: \(\) => handleTaskChange\("write"\)$/,
    /^run: \(\) => handleTaskChange\("coverage"\)$/,
    /^run: \(\) => handleTaskChange\("ship"\)$/,
    /^run: \(\) => handleNavigate\(index\)$/,
    /^run: exportPDF$/,
    /^run: exportFountain$/,
    /^run: exportFDX$/,
    /^run: exportDOCX$/,
    /^run: takeSnapshot$/,
    /^run: \(\) => setShowShortcutModal\(true\)$/,
    /^run: openSettingsPanel$/,
    /^run: toggleDarkMode$/,
    /^run: toggleTypewriterFocus$/,
    /^run: toggleLiveDiagnostics$/,
    /^run: toggleAutoAnalysis$/,
    /^run: toggleTypewriterSound$/,
    /^run: forceSaveNow$/,
    /^run: openCollabPrompt$/,
    /^run: \(\) => openToolSlot\("studio"\)$/,
    /^run: \(\) => openToolSlot\("director"\)$/,
    /^run: \(\) => openToolSlot\("slate"\)$/,
    /^run: handleSimulateScript$/,
    /^run: \(\) => setNewStoryConfirm\(true\)$/,
  ];

  it("every `run:` in the registry matches an expected, pre-existing handler expression", () => {
    // Some registry entries are single-line object literals (e.g.
    // `{ id: "x", ..., run: openSettingsPanel },`), so a `run:` capture can
    // trail into that object's own closing `}` and the array's separating
    // `,` before hitting a real line break. Stripping all trailing
    // `}`/`,`/whitespace lets one-line and multi-line entries compare the
    // same way against the allow-list above.
    const runLines = [...source.matchAll(/run:\s*[^,\n]+,?/g)].map((m) => m[0].trim().replace(/[\s,}]+$/, ""));
    // sceneActions' own `run:` (inside the .map() that builds it, not the
    // literal registry array) uses the same `handleNavigate(index)` call —
    // already covered by ALLOWED_RUN_PATTERNS above, so no separate carve-out
    // needed; this just confirms we found a realistic number of them (the
    // static registry alone has ~19, sceneActions contributes exactly one
    // more distinct expression already in the allow-list).
    assert.ok(runLines.length >= 19, `expected at least 19 run: expressions, found ${runLines.length}`);
    for (const line of runLines) {
      const matches = ALLOWED_RUN_PATTERNS.some((re) => re.test(line));
      assert.ok(matches, `unexpected run: expression not in the allow-list: ${line}`);
    }
  });

  it("toggleDarkMode/toggleTypewriterFocus/etc. are declared ONCE as named useCallbacks (not re-implemented inline for the palette)", () => {
    for (const name of [
      "toggleDarkMode",
      "toggleTypewriterFocus",
      "toggleLiveDiagnostics",
      "toggleAutoAnalysis",
      "toggleTypewriterSound",
      "openSettingsPanel",
      "openCollabPrompt",
      "forceSaveNow",
    ]) {
      const declarations = source.match(new RegExp(`const ${name} = useCallback\\(`, "g")) ?? [];
      assert.equal(declarations.length, 1, `expected exactly one useCallback declaration of ${name}, found ${declarations.length}`);
    }
  });

  it("Toolbar's onOpenSettings/onOpenCollab/onToggle* props reference the SAME named callbacks (not a second inline copy)", () => {
    assert.match(source, /onOpenSettings=\{openSettingsPanel\}/);
    assert.match(source, /onOpenCollab=\{openCollabPrompt\}/);
    assert.match(source, /onToggleLiveDiagnostics=\{toggleLiveDiagnostics\}/);
    assert.match(source, /onToggleAutoAnalysis=\{toggleAutoAnalysis\}/);
    assert.match(source, /onToggleTypewriterSound=\{toggleTypewriterSound\}/);
  });
});

describe("ScriptIDE.tsx — escape ladder puts the command palette on top", () => {
  const source = read("components/ScriptIDE.tsx");

  it("checks paletteOpen, then prefsOpen, then showShortcutModal, before toolSlot/sidebar in the escape-ladder effect", () => {
    const ladderMatch = source.match(/\/\/ Escape ladder:[\s\S]*?\n  \}, \[paletteOpen, prefsOpen, showShortcutModal, toolSlot, task, sidebarOpen, coverageFull\]\);/);
    assert.ok(ladderMatch, "expected to find the escape-ladder effect with paletteOpen/showShortcutModal in its dependency array");
    const ladderBody = ladderMatch![0];
    const paletteIdx = ladderBody.indexOf("if (paletteOpen)");
    const prefsIdx = ladderBody.indexOf('if (prefsOpen !== "none")');
    const shortcutIdx = ladderBody.indexOf("if (showShortcutModal)");
    assert.ok(
      paletteIdx !== -1 && prefsIdx !== -1 && shortcutIdx !== -1 && paletteIdx < prefsIdx && prefsIdx < shortcutIdx,
      "expected order: paletteOpen branch, then prefsOpen branch, then showShortcutModal branch",
    );
  });
});

describe("ScriptIDE.tsx — global shortcut bindings are real", () => {
  const source = read("components/ScriptIDE.tsx");

  it("binds Cmd/Ctrl+K to toggle paletteOpen", () => {
    assert.match(source, /e\.key\.toLowerCase\(\) === "k"/);
    assert.match(source, /setPaletteOpen\(\(prev\) => !prev\);/);
  });

  it("binds Cmd/Ctrl+S to forceSaveNow, with preventDefault (never the browser Save dialog)", () => {
    const sBlock = source.match(/if \(mod && !e\.shiftKey && !e\.altKey && e\.key\.toLowerCase\(\) === "s"\) \{[\s\S]*?\n {6}\}/);
    assert.ok(sBlock, "expected the Cmd/Ctrl+S branch");
    assert.match(sBlock![0], /e\.preventDefault\(\);/);
    assert.match(sBlock![0], /forceSaveNow\(\);/);
  });

  it("binds Alt+Shift+D to toggleDarkMode", () => {
    const dBlock = source.match(/if \(e\.altKey && e\.shiftKey && e\.key\.toLowerCase\(\) === "d"\) \{[\s\S]*?\n {6}\}/);
    assert.ok(dBlock, "expected the Alt+Shift+D branch");
    assert.match(dBlock![0], /toggleDarkMode\(\);/);
  });

  it("binds Cmd/Ctrl+Shift+F to toggleTypewriterFocus", () => {
    const fBlock = source.match(/if \(mod && e\.shiftKey && !e\.altKey && e\.key\.toLowerCase\(\) === "f"\) \{[\s\S]*?\n {6}\}/);
    assert.ok(fBlock, "expected the Cmd/Ctrl+Shift+F branch");
    assert.match(fBlock![0], /toggleTypewriterFocus\(\);/);
  });
});

describe("CommandPalette.tsx — dialog wiring", () => {
  const source = read("components/scriptide/CommandPalette.tsx");

  it("imports useModalFocusTrap and filterPaletteActions", () => {
    assert.match(source, /import \{ useModalFocusTrap \} from ["']\.\.\/\.\.\/lib\/use-modal-focus-trap\.ts["']/);
    assert.match(source, /import \{ filterPaletteActions, type PaletteAction \} from ["']\.\.\/\.\.\/lib\/command-palette\.ts["']/);
  });

  it("declares dialogRef and calls useModalFocusTrap(dialogRef)", () => {
    assert.match(source, /const dialogRef = useRef<HTMLDivElement \| null>\(null\);/);
    assert.match(source, /useModalFocusTrap\(dialogRef\);/);
  });

  it("the role=\"dialog\" element carries ref={dialogRef} and tabIndex={-1}", () => {
    const idx = source.indexOf('role="dialog"');
    assert.ok(idx !== -1);
    const around = source.slice(Math.max(0, idx - 200), idx + 40);
    assert.match(around, /ref=\{dialogRef\}/);
    assert.match(around, /tabIndex=\{-1\}/);
  });

  it("uses the ARIA combobox/listbox pattern (aria-activedescendant, not focusable option rows)", () => {
    assert.match(source, /role="combobox"/);
    assert.match(source, /aria-activedescendant=\{highlightedId\}/);
    assert.match(source, /role="listbox"/);
    assert.match(source, /role="option"/);
  });

  it("does NOT register its own Escape handler — the caller's escape ladder owns it", () => {
    assert.doesNotMatch(source, /addEventListener\(["']keydown["'].*Escape/s);
    assert.doesNotMatch(source, /e\.key === ["']Escape["']/);
  });
});

describe("FountainEditor.tsx — Typewriter Focus is really wired (not a dead prop)", () => {
  const source = read("components/editor/FountainEditor.tsx");

  it("destructures isTypewriterFocus with a default and holds a dedicated compartment", () => {
    assert.match(source, /isTypewriterFocus = false,/);
    assert.match(source, /const typewriterFocusCompartment = useRef\(new Compartment\(\)\);/);
  });

  it("includes the compartment in the initial extensions AND hot-swaps it on prop change", () => {
    assert.match(source, /typewriterFocusCompartment\.current\.of\(isTypewriterFocus \? \[typewriterFocusListener\] : \[\]\)/);
    assert.match(source, /typewriterFocusCompartment\.current\.reconfigure\(\s*isTypewriterFocus \? \[typewriterFocusListener\] : \[\],?\s*\)/);
  });
});

describe("ShortcutModal.tsx — inventory has no leftover false claim", () => {
  const source = read("components/scriptide/ShortcutModal.tsx");
  // Scoped to the actual displayed data, not the file's prose explaining
  // (accurately, in past tense) what used to be claimed and was fixed —
  // that explanation legitimately needs to name the old false claims.
  const dataBlock = source.slice(source.indexOf("const SHORTCUT_GROUPS"), source.indexOf("export default function"));

  it("does not claim a 3/4-state theme cycle that doesn't exist in this codebase", () => {
    assert.doesNotMatch(dataBlock, /CRT/);
    assert.doesNotMatch(dataBlock, /Vintage/i);
  });

  it("does not claim Tab performs Fountain block-transition formatting (Tab is unbound — see FountainEditor.tsx)", () => {
    assert.doesNotMatch(dataBlock, /Tab \/ Enter/);
  });

  it("documents the real Cmd/Ctrl+K, Cmd/Ctrl+S, Alt+Shift+D, and Ctrl+Shift+F bindings", () => {
    assert.match(source, /Cmd\/Ctrl \+ K/);
    assert.match(source, /Cmd\/Ctrl \+ S/);
    assert.match(source, /Alt \+ Shift \+ D/);
    assert.match(source, /Cmd\/Ctrl \+ Shift \+ F/);
  });

  it("carries a real dialog role and its own focus trap", () => {
    assert.match(source, /role="dialog"/);
    assert.match(source, /useModalFocusTrap\(dialogRef\);/);
  });
});

describe("SettingsPanel.tsx — modal semantics and label associations", () => {
  const source = read("components/SettingsPanel.tsx");

  it("the panel surface carries role=\"dialog\" aria-modal=\"true\" with a real focus trap", () => {
    assert.match(source, /role="dialog"/);
    assert.match(source, /aria-modal="true"/);
    assert.match(source, /const dialogRef = useRef<HTMLDivElement \| null>\(null\);/);
    assert.match(source, /useModalFocusTrap\(dialogRef\);/);
  });

  it("Field/AxisSelect associate their <label> with their control via useId(), not a bare sibling", () => {
    assert.match(source, /const id = useId\(\);/);
    assert.match(source, /<label htmlFor=\{id\}/);
    assert.match(source, /<input\s*\n\s*id=\{id\}/);
    assert.match(source, /<select\s*\n\s*id=\{id\}/);
  });

  it("the settings tab strip uses real ARIA tablist/tab/tabpanel roles", () => {
    assert.match(source, /role="tablist"/);
    assert.match(source, /role="tab"/);
    assert.match(source, /aria-selected=\{activeTab === tab\}/);
    assert.match(source, /role="tabpanel"/);
  });
});

describe("StartScreen.tsx — file preview dialog has real modal semantics", () => {
  const source = read("components/StartScreen.tsx");

  it("extracts a FilePreviewDialog component (mount/unmount must line up with useModalFocusTrap's effect)", () => {
    assert.match(source, /function FilePreviewDialog\(/);
    assert.match(source, /const dialogRef = useRef<HTMLDivElement \| null>\(null\);/);
    assert.match(source, /useModalFocusTrap\(dialogRef\);/);
  });

  it("the dialog root carries role=\"dialog\" aria-modal=\"true\" ref={dialogRef} tabIndex={-1}", () => {
    const idx = source.indexOf('role="dialog"');
    assert.ok(idx !== -1);
    const around = source.slice(Math.max(0, idx - 200), idx + 60);
    assert.match(around, /ref=\{dialogRef\}/);
    assert.match(around, /tabIndex=\{-1\}/);
    assert.match(around, /aria-modal="true"/);
  });

  it("has its own local Escape handler (StartScreen has no shared escape ladder)", () => {
    assert.match(source, /if \(e\.key === "Escape"\) onClose\(\);/);
  });
});
