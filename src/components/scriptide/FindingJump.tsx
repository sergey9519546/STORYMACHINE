// FindingJump — the ONE jump affordance every finding gets.
//
// Discovery item #9 (2026-09-06): a 231-scene draft produced 899 findings, 554
// of them with a resolvable span, and the writer could reach exactly one of
// them from the Coverage panel. The findings that DID carry a control in the
// full report carried it under a different accessible name than the Coverage
// panel's, and the 345 honestly-unlocatable ones rendered nothing at all — so
// "this note has no line" and "we forgot to wire this one up" looked identical.
//
// This component is the single rendering of both halves:
//   * a resolvable finding gets a button whose accessible name IS the
//     destination — "Jump to scene 12" / "Jump to line 340", from
//     src/lib/finding-jump.ts's one naming rule;
//   * an unlocatable one gets a keyboard-reachable "no location" note whose
//     hover/focus text says WHY (whole-draft finding vs. unresolved), instead
//     of nothing.
//
// Both branches occupy the same slot, so the row's shape does not change and
// a writer scanning a list never has to wonder whether a missing button means
// "nowhere to go" or "not built yet".

import React from "react";
import { ArrowRight, MapPinOff } from "lucide-react";
import type { JumpTarget } from "../../lib/finding-jump.ts";

// ── The two colour conventions this control has to live under ──────────────
// Kept as four self-consistent, single-convention strings rather than one
// ternary inside className: tests/core/theme-convention.test.ts reads the raw
// source of a className attribute, and a ternary that spells BOTH conventions
// in one expression reads (correctly, given what a scanner can see) as
// invariant ink composited with a dark: background. One string, one
// convention, is also just easier to check by eye.
//
// THEMED — for a surface that actually darkens (`bg-gray-50 dark:bg-zinc-800`,
// i.e. every card in ScriptDoctorPanel). Measured 4.8:1 light / 6.4:1 dark.
const JUMP_BTN_THEMED =
  "inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-black dark:text-gray-100 border border-black/20 dark:border-white/20 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black focus-visible:bg-black focus-visible:text-white dark:focus-visible:bg-white dark:focus-visible:text-black transition-colors shrink-0";
const NO_LOCATION_THEMED =
  "inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 border border-dashed border-black/20 dark:border-white/20 shrink-0 cursor-help";
// INVARIANT — for a `--sm-*` token surface that is the SAME light cream in
// both themes (CoverageSummary's cards). A `dark:` text variant there is the
// exact bug the 2026-09-04/09-06 a11y passes kept finding, and the one
// scripts/verify-a11y.mjs's dark sweep caught in this component's first cut:
// in dark mode `text-gray-400` landed on light cream at 2.2:1.
const JUMP_BTN_INVARIANT =
  "inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[var(--sm-ink)] border border-[var(--sm-ink)]/30 hover:bg-[var(--sm-ink)] hover:text-[var(--sm-cream)] transition-colors shrink-0";
const NO_LOCATION_INVARIANT =
  "inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[var(--sm-ink-mute)] border border-dashed border-[var(--sm-ink)]/30 shrink-0 cursor-help";

export function FindingJump({
  target,
  onJump,
  className = "",
  surface = "themed",
}: {
  target: JumpTarget;
  /** Absent when no host is listening for navigation (the panel can render
   *  standalone). The control then degrades to the same honest note as an
   *  unlocatable finding rather than a dead button. */
  onJump?: (startLine: number, endLine: number) => void;
  className?: string;
  /**
   * Which KIND of background this control sits on — the distinction
   * scripts/verify-a11y.mjs's dark-theme sweep exists for, and which this
   * component got wrong on its first cut (a serious 2.2:1 color-contrast
   * violation, caught by that sweep before merge):
   *
   *   "themed"    — a real Tailwind surface that actually darkens
   *                 (`bg-gray-50 dark:bg-zinc-800`), i.e. every card in
   *                 ScriptDoctorPanel. A `text-gray-500 dark:text-gray-400`
   *                 pair is correct there and reads 4.8:1 / 6.4:1.
   *   "invariant" — a `--sm-*` token surface that is the SAME light cream in
   *                 both themes (CoverageSummary's cards). A `dark:` text
   *                 variant on that background is exactly the bug the
   *                 2026-09-04/09-06 a11y passes kept finding: in dark mode
   *                 `text-gray-400` lands on light cream at 2.2:1. The
   *                 invariant ink tokens are the only correct choice.
   */
  surface?: "themed" | "invariant";
}) {
  const invariant = surface === "invariant";
  if (target.kind === "jump" && onJump) {
    return (
      <button
        type="button"
        onClick={() => onJump(target.startLine, target.endLine)}
        aria-label={target.label}
        title={`${target.label} — scrolls the editor there and flashes the lines`}
        className={`${invariant ? JUMP_BTN_INVARIANT : JUMP_BTN_THEMED} ${className}`}
      >
        {target.label}
        <ArrowRight className="w-2.5 h-2.5" aria-hidden="true" />
      </button>
    );
  }

  const reason =
    target.kind === "none"
      ? target.reason
      : "No location — this view has no editor to jump into.";

  return (
    // tabIndex={0} deliberately: the reason must be reachable by keyboard and
    // by a screen reader, not only by a mouse hover. role="note" (rather than
    // a bare focusable span) is what keeps it announced as explanatory text
    // instead of an interactive control the writer would try to activate.
    <span
      tabIndex={0}
      role="note"
      data-no-location=""
      aria-label={reason}
      title={reason}
      className={`${invariant ? NO_LOCATION_INVARIANT : NO_LOCATION_THEMED} ${className}`}
    >
      <MapPinOff className="w-2.5 h-2.5" aria-hidden="true" />
      No location
    </span>
  );
}

export default FindingJump;
