// Extends tests/core/use-modal-focus-trap.test.ts's wiring-assertion pattern
// (source-level checks — this repo has no jsdom/browser harness, see
// CLAUDE.md) to the remaining eight role="dialog" aria-modal="true" panels
// that shared ScriptDoctorPanel.tsx's pre-fix defect: declared modal
// semantics, no real focus management. Each of these now wires
// useModalFocusTrap the same way ScriptDoctorPanel.tsx does: a ref +
// tabIndex={-1} on the exact element that carries role="dialog", and a
// useModalFocusTrap(ref) call.
//
// ScriptIDE.tsx is the one structural exception: its two dialogs (Action
// Required, Change setup confirm) are inline JSX conditionals inside the
// ever-mounted ScriptIDE component rather than a separately-mounted panel
// component, so useModalFocusTrap was wired inside two small local
// components (ActionRequiredModal, ChangeSetupConfirmModal) instead of
// directly in ScriptIDE — see the comment above those components in
// ScriptIDE.tsx for why that split is required for the hook's mount-based
// effect to actually fire on open/close, not just a stylistic choice.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const COMPONENTS_DIR = path.resolve(import.meta.dirname, "../../src/components");

function read(file: string): string {
  return fs.readFileSync(path.join(COMPONENTS_DIR, file), "utf8");
}

/** Asserts every `role="dialog"` JSX attribute in `source` (there may be
 *  more than one per file, e.g. ScriptIDE.tsx) has `ref={refName}` and
 *  `tabIndex={-1}` on the same element, by windowing on the text
 *  immediately preceding the match — same technique as
 *  use-modal-focus-trap.test.ts's ScriptDoctorPanel check. */
function assertDialogRootsWired(source: string, refName: string, expectedCount: number): void {
  // Find every REAL `role="dialog"` JSX attribute occurrence, filtering out
  // prose-comment mentions (some of these files' comments quote
  // `role="dialog"` inline while explaining the wiring — a plain
  // whole-file regex scan would double-count those, the same trap
  // use-modal-focus-trap.test.ts's ScriptDoctorPanel check documents).
  // Attribute position on the line varies across these files (some put it
  // first on its own line, others inline after ref/tabIndex on the same
  // line), so — unlike that anchor — this filters by whether the line
  // itself is a `//` comment, not by column position.
  const real = [...source.matchAll(/role="dialog"/g)].filter((m) => {
    const idx = m.index ?? 0;
    const lineStart = source.lastIndexOf("\n", idx) + 1;
    const linePrefix = source.slice(lineStart, idx).trim();
    return !linePrefix.startsWith("//");
  });
  assert.equal(
    real.length,
    expectedCount,
    `expected ${expectedCount} role="dialog" declaration(s), found ${real.length}`,
  );
  for (const m of real) {
    const idx = m.index ?? 0;
    const around = source.slice(Math.max(0, idx - 400), idx + 40);
    assert.match(
      around,
      new RegExp(`ref=\\{${refName}\\}`),
      `dialog root near index ${idx} must carry ref={${refName}}`,
    );
    assert.match(
      around,
      /tabIndex=\{-1\}/,
      `dialog root near index ${idx} must carry tabIndex={-1}`,
    );
  }
}

describe("Directly-wired panels — ref+hook on the same component as the dialog", () => {
  const cases: Array<{ file: string; refName: string }> = [
    { file: "WhatIfPanel.tsx", refName: "panelRef" },
    { file: "SlatePanel.tsx", refName: "panelRef" },
    { file: "RoomPanel.tsx", refName: "panelRef" },
    { file: "DirectorPanel.tsx", refName: "panelRef" },
    { file: "InterviewPanel.tsx", refName: "panelRef" },
    { file: "RevisionPanel.tsx", refName: "panelRef" },
  ];

  for (const { file, refName } of cases) {
    describe(file, () => {
      const source = read(file);

      it("imports useModalFocusTrap from src/lib/use-modal-focus-trap", () => {
        assert.match(
          source,
          /import\s*\{\s*useModalFocusTrap\s*\}\s*from\s*["']\.\.\/lib\/use-modal-focus-trap(?:\.ts)?["']/,
        );
      });

      it(`declares ${refName} and calls useModalFocusTrap(${refName})`, () => {
        assert.match(source, new RegExp(`const ${refName} = useRef<HTMLDivElement \\| null>\\(null\\);`));
        assert.match(source, new RegExp(`useModalFocusTrap\\(${refName}\\);`));
      });

      it("attaches the ref and tabIndex={-1} to the role=\"dialog\" element", () => {
        assertDialogRootsWired(source, refName, 1);
      });
    });
  }
});

describe("ScriptIDE.tsx — inline dialogs wired via local components", () => {
  const source = read("ScriptIDE.tsx");

  it("imports useModalFocusTrap from src/lib/use-modal-focus-trap", () => {
    assert.match(
      source,
      /import\s*\{\s*useModalFocusTrap\s*\}\s*from\s*["']\.\.\/lib\/use-modal-focus-trap["']/,
    );
  });

  it("defines ActionRequiredModal and ChangeSetupConfirmModal as their own function components", () => {
    assert.match(source, /function ActionRequiredModal\(/);
    assert.match(source, /function ChangeSetupConfirmModal\(/);
  });

  it("each local modal component declares its own dialogRef and calls useModalFocusTrap(dialogRef)", () => {
    // Both components use the same local variable name (dialogRef) inside
    // their own function scope — exactly two declarations/calls expected,
    // one per component, not a single shared ref.
    const refDeclarations = source.match(/const dialogRef = useRef<HTMLDivElement \| null>\(null\);/g) ?? [];
    const hookCalls = source.match(/useModalFocusTrap\(dialogRef\);/g) ?? [];
    assert.equal(refDeclarations.length, 2, "expected one dialogRef declaration per local modal component");
    assert.equal(hookCalls.length, 2, "expected one useModalFocusTrap(dialogRef) call per local modal component");
  });

  it("both dialog roots (Action Required, Change setup confirm) carry ref={dialogRef} and tabIndex={-1}", () => {
    assertDialogRootsWired(source, "dialogRef", 2);
  });

  it("the Action Required modal's input keeps its pre-existing autoFocus behavior", () => {
    // Regression guard: applying the trap must not have removed the
    // existing autoFocus on the character-action input.
    assert.match(source, /type="text"\s*\n\s*autoFocus/);
  });

  it("ScriptIDE itself renders the extracted components rather than the old inline JSX", () => {
    assert.match(source, /<ActionRequiredModal/);
    assert.match(source, /<ChangeSetupConfirmModal/);
  });
});
