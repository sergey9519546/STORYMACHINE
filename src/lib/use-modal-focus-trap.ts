import { useEffect, type RefObject } from "react";

// ─── Pure decision core (unit-testable without a DOM) ──────────────────────
// This repo has no jsdom/browser test harness (see CLAUDE.md), so the only
// slice of a focus trap that can be given real, runnable test coverage is
// the wraparound DECISION itself — everything else here is a thin DOM
// binding around it. Kept generic (over `T`, not `HTMLElement`) specifically
// so tests can exercise it with plain tokens instead of real DOM nodes.

export type TrapFocusAction = "focus-first" | "focus-last" | "allow-default";

/**
 * Given the ordered list of focusable elements inside a trapped dialog,
 * which one (if any) currently has focus, and whether Shift is held, decide
 * what a Tab keydown handler should do next.
 *
 * `focusable` must be non-empty — callers handle the zero-focusable-elements
 * case themselves (focus the dialog container instead of any item in it).
 */
export function decideTabFocusAction<T>(
  focusable: readonly T[],
  active: T | null,
  opts: { shiftKey: boolean; activeIsInsideContainer: boolean },
): TrapFocusAction {
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (!opts.activeIsInsideContainer) {
    // Focus landed outside the dialog by some other means (e.g. a stray
    // click on the non-inert background — see this module's doc comment
    // below on that residual gap). Pull it back in at the end nearest the
    // direction of travel rather than leaving it stranded.
    return opts.shiftKey ? "focus-last" : "focus-first";
  }
  if (opts.shiftKey) {
    return active === first ? "focus-last" : "allow-default";
  }
  return active === last ? "focus-first" : "allow-default";
}

// ─── DOM binding ────────────────────────────────────────────────────────────

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    // offsetParent is null for display:none elements/ancestors (e.g. the
    // hidden native <input type="file">) — a coarse but dependency-free
    // visibility check that avoids a getComputedStyle call per element on
    // every Tab press.
    (el) => el.offsetParent !== null,
  );
}

// ─── "Recently meaningfully-focused elements" tracker ──────────────────────
// WHY THIS EXISTS (found live with scripts/verify-focus-traps.mjs, not from
// source review): every dialog in this app is opened by flipping a boolean
// that swaps two mutually-exclusive sibling JSX blocks under one parent —
// e.g. clicking CoverageSummary's "Full report" button unmounts CoverageSummary
// (removing the button) in the SAME commit that mounts ScriptDoctorPanel; a
// dropdown-menu item (StoryMachine's "Inspect" menu, which opens WhatIf/
// Interview/Revision/Room) unmounts even more directly — the click handler
// closes the whole menu in the same state update that opens the dialog. DOM
// node removal synchronously blurs focus to <body> per spec — and every one
// of these dialogs is also `React.lazy`-loaded behind a `Suspense` boundary,
// so the *real* panel component doesn't even render synchronously in that
// commit; React commits the loading fallback first and mounts the real panel
// only after the dynamic import's promise resolves, at least one tick later.
// By the time ANY code inside the panel runs — render body or `useEffect`,
// doesn't matter — `document.activeElement` has already settled on `<body>`.
// Reading it there (what this file used to do) makes "restore focus to the
// trigger" restore to `<body>` instead, every time, for every dialog.
//
// The fix has to observe focus continuously, from outside React's
// render/commit/lazy-load timeline entirely: a single document-level
// `focusin` listener, registered once at module scope, remembers a short
// history of elements that received focus — but only real focus targets.
// `<body>`/`<html>` are explicitly excluded, because the only way they
// normally receive a `focusin` here is the synchronous "focus reverted after
// the previously-focused node was removed" case above — accepting that
// update would reproduce the exact bug this exists to avoid.
//
// A *history*, not just the single most-recent target: the immediate
// trigger (a menu item, say) is very often exactly the element that's about
// to be unmounted along with the rest of its menu, so it alone is not always
// restorable. Keeping a short backlog lets restore-on-close fall back to the
// next-most-recent still-attached control — typically the persistent button
// that opened the menu in the first place — rather than giving up and
// leaving focus on <body>.
const FOCUS_HISTORY_LIMIT = 8;
const focusHistory: HTMLElement[] = [];
if (typeof document !== "undefined") {
  document.addEventListener(
    "focusin",
    (e) => {
      const target = e.target as HTMLElement | null;
      if (!target || target === document.body || target === document.documentElement) return;
      if (focusHistory[focusHistory.length - 1] !== target) {
        focusHistory.push(target);
        if (focusHistory.length > FOCUS_HISTORY_LIMIT) focusHistory.shift();
      }
    },
    true,
  );
}

/**
 * Minimal modal focus management for a `role="dialog" aria-modal="true"`
 * panel: moves focus into the dialog when it mounts, traps Tab/Shift+Tab
 * within its focusable descendants while mounted, and restores focus to
 * whatever had focus immediately before mount (typically the control that
 * opened the dialog) when it unmounts.
 *
 * `containerRef` must point at the dialog's own root element, which must
 * carry `tabIndex={-1}` so it is a valid `.focus()` target even when (rare,
 * but possible) it currently contains no focusable descendant.
 *
 * SCOPE / KNOWN LIMITATION: this traps the Tab key only. It does not mark
 * surrounding content `inert`/`aria-hidden`, so a mouse click — or a screen
 * reader's virtual-cursor/browse-mode navigation, which does not go through
 * Tab at all — can still reach content behind the dialog. Closing that gap
 * fully means making the rest of the app inert while the dialog is open,
 * which is a change to the HOST tree (ScriptIDE.tsx), not this component;
 * out of scope for this pass. Keyboard Tab-cycling — the reported defect
 * ("keyboard ... users can Tab straight out of a supposedly modal dialog")
 * — is fully closed by this hook.
 */
export function useModalFocusTrap(containerRef: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // See the `focusHistory` tracker above for why this is not
    // `document.activeElement` — by the time this effect runs (after commit,
    // and after this Suspense-lazy panel's own async mount), that has
    // already settled on `<body>`. Snapshotting the whole history here (not
    // just its last entry) is what lets restore-on-close fall back past an
    // immediate trigger that turned out to be unmountable too (e.g. a
    // dropdown menu item) to the next-most-recent control that's still real.
    const priorFocusHistory = focusHistory.slice();

    const initial = getFocusableElements(container)[0];
    (initial ?? container).focus({ preventScroll: true });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const focusable = getFocusableElements(container);
      if (focusable.length === 0) {
        e.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }
      const active = document.activeElement as HTMLElement | null;
      const action = decideTabFocusAction(focusable, active, {
        shiftKey: e.shiftKey,
        activeIsInsideContainer: active !== null && container.contains(active),
      });
      if (action === "allow-default") return;
      e.preventDefault();
      (action === "focus-first" ? focusable[0] : focusable[focusable.length - 1]).focus({ preventScroll: true });
    };

    // Attached to the container (not document): Tab keydowns bubble up from
    // whichever descendant is focused, so this reliably intercepts every Tab
    // press as long as focus stays inside — which the trap itself guarantees
    // for keyboard-only navigation. Scoping here (rather than document) also
    // means this can never interfere with unrelated document-level listeners
    // (e.g. this app's Escape handlers), since none of them act on Tab.
    container.addEventListener("keydown", onKeyDown);
    return () => {
      container.removeEventListener("keydown", onKeyDown);
      // Restore focus to the most recent pre-dialog control that's still
      // actually in the document — walking backward from the immediate
      // trigger through the snapshot taken at mount. Excludes anything
      // inside this dialog itself (tabbing around while it was open landed
      // fresh focusin events in the GLOBAL history too; those aren't valid
      // restore targets for "focus before this dialog opened"). A trigger
      // that was itself removed while the dialog was open, with nothing
      // else attached in its recent history either, has nowhere safe to
      // send focus back to; calling .focus() on a detached node is a silent
      // no-op in every browser, so finding nothing here is just
      // documentation, not a behavior change.
      const restoreTarget = [...priorFocusHistory]
        .reverse()
        .find((el) => document.contains(el) && !container.contains(el));
      restoreTarget?.focus({ preventScroll: true });
    };
    // containerRef is a ref object with stable identity across renders (one
    // ref per dialog instance) — this intentionally runs once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef]);
}
