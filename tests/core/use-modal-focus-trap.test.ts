// ScriptDoctorPanel declares role="dialog" aria-modal="true" (the P0 golden
// path's full-report panel — StartScreen -> "Try sample coverage" ->
// CoverageSummary -> ScriptDoctorPanel) with NO real focus management: focus
// never moved into the panel on open, nothing trapped Tab within it, and
// nothing restored focus to the trigger on close — a WCAG 2.1.1/2.4.3
// violation on a panel a P0 participant reaches one click after the sample
// CTA. src/lib/use-modal-focus-trap.ts fixes this for ScriptDoctorPanel only.
//
// This repo has no jsdom/browser test harness (see CLAUDE.md), so actual
// focus movement/DOM behavior cannot be exercised here. Two things ARE
// verified directly:
//   1. decideTabFocusAction — the pure wraparound decision at the heart of
//      the trap — is DOM-free and genuinely unit-testable; real logic
//      coverage, not a placeholder.
//   2. The wiring into ScriptDoctorPanel.tsx (ref on the dialog root,
//      tabIndex={-1} so it's a valid programmatic focus target, and the
//      useModalFocusTrap(panelRef) call) is present via source assertions —
//      this repo's established pattern for component logic that cannot be
//      rendered (see e.g. tests/core/coverage-staleness.test.ts).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { decideTabFocusAction } from "../../src/lib/use-modal-focus-trap.ts";

describe("decideTabFocusAction — pure Tab-trap wraparound logic", () => {
  const items = ["upload", "export", "rerun", "close"] as const;

  it("Tab from the last focusable element wraps to the first", () => {
    assert.equal(
      decideTabFocusAction(items, "close", { shiftKey: false, activeIsInsideContainer: true }),
      "focus-first",
    );
  });

  it("Shift+Tab from the first focusable element wraps to the last", () => {
    assert.equal(
      decideTabFocusAction(items, "upload", { shiftKey: true, activeIsInsideContainer: true }),
      "focus-last",
    );
  });

  it("Tab from a middle element allows the browser's default (native) behavior", () => {
    assert.equal(
      decideTabFocusAction(items, "export", { shiftKey: false, activeIsInsideContainer: true }),
      "allow-default",
    );
    assert.equal(
      decideTabFocusAction(items, "rerun", { shiftKey: true, activeIsInsideContainer: true }),
      "allow-default",
    );
  });

  it("Tab is a no-op default when nothing inside is active yet and it isn't first/last", () => {
    // active === null and activeIsInsideContainer === false together model
    // "nothing focused inside the container" — must pull focus IN, not let
    // Tab escape to whatever the browser would otherwise do next.
    assert.equal(
      decideTabFocusAction(items, null, { shiftKey: false, activeIsInsideContainer: false }),
      "focus-first",
    );
    assert.equal(
      decideTabFocusAction(items, null, { shiftKey: true, activeIsInsideContainer: false }),
      "focus-last",
    );
  });

  it("focus that somehow escaped the container is pulled back in on the next Tab", () => {
    // e.g. a mouse click landed on background content (see the module's
    // documented residual gap: background isn't marked inert/aria-hidden).
    // The very next Tab press must still re-enter the dialog rather than
    // continuing to wander the page.
    assert.equal(
      decideTabFocusAction(items, "some-background-element" as unknown as (typeof items)[number], {
        shiftKey: false,
        activeIsInsideContainer: false,
      }),
      "focus-first",
    );
  });

  it("a single-item dialog wraps Tab and Shift+Tab back onto itself", () => {
    const single = ["only-button"] as const;
    assert.equal(
      decideTabFocusAction(single, "only-button", { shiftKey: false, activeIsInsideContainer: true }),
      "focus-first",
    );
    assert.equal(
      decideTabFocusAction(single, "only-button", { shiftKey: true, activeIsInsideContainer: true }),
      "focus-last",
    );
  });
});

// ── Wiring into ScriptDoctorPanel.tsx (source-level — no render harness) ───
const SCRIPT_DOCTOR_PANEL_SRC = path.resolve(
  import.meta.dirname,
  "../../src/components/scriptide/ScriptDoctorPanel.tsx",
);

describe("ScriptDoctorPanel wires the focus trap onto its dialog root", () => {
  const source = fs.readFileSync(SCRIPT_DOCTOR_PANEL_SRC, "utf8");

  it("imports useModalFocusTrap", () => {
    assert.match(
      source,
      /import\s*\{\s*useModalFocusTrap\s*\}\s*from\s*["']\.\.\/\.\.\/lib\/use-modal-focus-trap\.ts["']/,
    );
  });

  it("declares a panelRef and calls useModalFocusTrap(panelRef)", () => {
    assert.match(source, /const panelRef = useRef<HTMLDivElement \| null>\(null\);/);
    assert.match(source, /useModalFocusTrap\(panelRef\);/);
  });

  it("attaches panelRef and tabIndex={-1} to the dialog's root motion.div", () => {
    // Anchor on the role="dialog" declaration itself and look at the JSX
    // immediately around it, so this fails loudly if the trap is ever wired
    // to some OTHER element than the actual ARIA dialog root.
    const idx = source.indexOf('role="dialog"');
    assert.ok(idx > -1, "expected ScriptDoctorPanel.tsx to declare role=\"dialog\"");
    const around = source.slice(Math.max(0, idx - 400), idx + 100);
    assert.match(around, /ref=\{panelRef\}/, "the dialog root must carry ref={panelRef}");
    assert.match(
      around,
      /tabIndex=\{-1\}/,
      "the dialog root must carry tabIndex={-1} so it is a valid .focus() target",
    );
  });

  it("still closes on Escape and restores/traps focus independently of that handler", () => {
    // Regression guard: the pre-existing Escape-to-close effect (CoverageSummary's
    // sibling pattern) must survive this change untouched.
    assert.match(
      source,
      /if\s*\(\s*e\.key\s*===\s*"Escape"\s*\)\s*onClose\(\);/,
    );
  });
});
