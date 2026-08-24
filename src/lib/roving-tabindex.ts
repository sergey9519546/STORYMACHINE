/**
 * Roving tabindex — the keyboard half of the WAI-ARIA tabs pattern.
 *
 * A tab strip is ONE stop in the page's Tab order, not one stop per tab: Tab
 * moves into the strip and straight back out again, and Left/Right (plus
 * Home/End) choose among the tabs once you are there. That means exactly one
 * tab carries `tabIndex={0}` at a time — the "roving" part — and the arrow
 * keys move both focus and the selection.
 *
 * This file is the DECISION half only: which index an arrow key should land
 * on, given where focus is now. It is pure and DOM-free on purpose — this
 * repo has no jsdom harness (see CLAUDE.md), so the only way this logic gets
 * real runnable coverage is by keeping it out of the component. The component
 * (src/components/SettingsPanel.tsx) does the two DOM things left over: set
 * tabIndex from `activeIndex`, and call .focus() on whatever index this
 * returns.
 *
 * Automatic activation (arrow = move focus AND select) rather than manual
 * (arrow = move focus, Enter/Space = select): APG recommends it when showing
 * a panel is cheap, which it is here — every Settings panel is already
 * mounted-on-demand local state with no fetch of its own.
 */

/** Keys this handles. Anything else returns null so the caller leaves the
 *  event alone — never preventDefault a key you did not act on. */
export type RovingKey = "ArrowRight" | "ArrowLeft" | "Home" | "End";

/**
 * The index an arrow/Home/End keypress should move to in a horizontal strip
 * of `count` items, or null when the key is not one this pattern owns (in
 * which case the caller must not intercept it).
 *
 * Arrows wrap in both directions — APG's tabs pattern says a tab list SHOULD
 * wrap, and wrapping is what makes Left from the first tab reach the last one
 * without arrowing across the whole strip.
 *
 * `current` is clamped rather than trusted: a strip whose active item was
 * removed between render and keypress must still move somewhere sane instead
 * of computing an index off the end.
 */
export function nextRovingIndex(key: string, current: number, count: number): number | null {
  if (count <= 0) return null;
  const last = count - 1;
  const from = Math.max(0, Math.min(current, last));
  switch (key) {
    case "ArrowRight":
      return from === last ? 0 : from + 1;
    case "ArrowLeft":
      return from === 0 ? last : from - 1;
    case "Home":
      return 0;
    case "End":
      return last;
    default:
      return null;
  }
}
