# STORYMACHINE — Design Backlog

Remaining visual/UX work after the ScriptIDE professional redesign (`c64c133`).
Sequenced by impact. Each item includes scope, source anchors, and acceptance criteria.

---

## 1. Visual Regression Tests (Playwright baselines)

**Why:** Every visual fix so far is unverified beyond a single desktop screenshot. Without
baselines, the next contributor can silently regress the manuscript stage, sidebar, or
action strip without detection.

**Scope:**
- Create a Playwright script that captures deterministic screenshots at defined viewports:
  - Desktop: 1440×900
  - Tablet: 768×1024
  - Mobile: 390×844
- States to capture:
  1. Empty Write mode
  2. Populated Write mode (sample script)
  3. Coverage summary open
  4. Ship mode
  5. Sidebar open (mobile)
  6. Coverage stale banner
  7. No-key banner
- Store PNGs under `output/playwright/baselines/` (gitignored except one commit per
  intentional change).
- Add a CI step (or local script) that re-runs the captures and diffs against baselines,
  failing on pixel-count delta above a threshold.

**Anchors:**
- Existing QA: `output/playwright/whole_site_qa.py:1-102` (needs update for new control names)
- Screenshot helper: `PWCLI` wrapper at `~/.codex/skills/playwright/scripts/playwright_cli.sh`

**Acceptance:**
- 7 baseline screenshots committed
- Script runs headless in < 60 seconds
- Fails CI if any screen changes by > 2% of pixel area

---

## 2. Coverage Summary — Deeper Page Shadow Treatment

**Why:** CoverageSummary currently renders as a flat right-drawer. It should share the
manuscript's materiality (graded edge, layered shadow, inner highlight) so it reads as a
production document beside the page, not a different app.

**Scope:**
- `src/components/scriptide/CoverageSummary.tsx`
  - Replace the flat `border-l-1.5px` root with the same layered-shadow recipe as
    `.cm-content` (tinted diffusion shadow, inner top highlight, 1px ink edge).
  - Add a subtle paper-grain overlay (fixed, `pointer-events-none`) inside the drawer body.
  - Give the verdict stamp a deeper raised treatment (shadow + slight inset).
  - Health numeral gets a subtle text-shadow for depth.
- Dark mode: match the night canvas treatment from `FountainEditor.tsx:124-137`.

**Anchors:**
- Current root: `CoverageSummary.tsx:127-133`
- Current verdict: `CoverageSummary.tsx:174-179`
- Reference materiality: `FountainEditor.tsx:93-112`

**Acceptance:**
- Coverage drawer reads as a paper document, not a flat panel
- Verdict stamp has visible raised depth
- Health number has text-shadow
- Dark mode matches manuscript depth
- No performance regression (grain on fixed layer only)

---

## 3. Mobile Page-Count Furniture

**Why:** The right-gutter page furniture (word/page count) added in `c64c133` is hidden
on mobile (`hidden md:flex`). Mobile users have no in-page metadata. On narrow screens the
furniture should move to a less obtrusive position.

**Scope:**
- `src/components/ScriptIDE.tsx`
  - On mobile, render page/word count as a fixed bottom-left chip above the action strip,
    or inside the action strip as a quiet label.
  - Use `flex-col-reverse` or absolute positioning to keep it above the keyboard-safe area.
  - Keep it `pointer-events-none` so it doesn't interfere with scrolling.
- Ensure the chip doesn't overlap the action strip's primary CTA.

**Anchors:**
- Current furniture: `ScriptIDE.tsx:1681-1690`
- Action strip: `ScriptIDE.tsx:1454-1570`

**Acceptance:**
- Mobile (390×844): word/page count visible without horizontal scroll
- Doesn't overlap primary CTA or action strip
- `pointer-events-none`
- Desktop: unchanged (right gutter furniture)

---

## 4. Deep Tool Panels Migration (Beyond ScriptDoctor)

**Why:** The ScriptIDE shell is now professional, but opening Director, WhatIf, Slate,
Revision, or any of the ~25 expert panels instantly breaks the visual identity. Each
panel re-introduces its own shell, color system, and typography.

**Priority order (by user-facing frequency):**

| Panel | Lines | Key issue | File |
|---|---|---|---|
| DirectorPanel | ~1500 | 62 brutal-*, navy shell, `#FF4444` accents | `DirectorPanel.tsx` |
| SlatePanel | ~600 | Separate brutal shell, 880px width | `SlatePanel.tsx` |
| WhatIfPanel | ~1085 | Navy modal, fixed split layout, clipped on mobile | `WhatIfPanel.tsx` |
| InterviewPanel | ~456 | Navy shell, no labels on inputs | `InterviewPanel.tsx` |
| RevisionPanel | ~918 | Zinc drawer, legacy shell | `RevisionPanel.tsx` |
| ScenarioBuilder | ~400 | Brutalist modal, separate from desk | `storymachine/ScenarioBuilder.tsx` |
| SettingsPanel | ~700 | Legacy card layout | `SettingsPanel.tsx` |

**Migration recipe (per panel):**
1. Replace root shell with `sm-panel` or `sm-panel--ink` + `sm-panel-body`.
2. Replace header chrome with `sm-pagetop` (if dark) or `sm-panel-top`.
3. Replace buttons with `sm-btn` / `sm-btn--stamp`.
4. Replace chips/tags with `sm-chip`.
5. Replace alerts with `sm-card` + `sm-stamp` (if stamp-colored).
6. Ensure mobile: full-width below `md`, stacked form rows, no fixed half-width columns.
7. Add `role="dialog"`, `aria-labelledby`, Escape handler, focus trap.
8. Remove `dark:*` variants; use explicit token surfaces.
9. Remove literal hex colors (except chart data).
10. Verify with lint + build + Playwright screenshot.

**Acceptance:**
- Opening any expert panel no longer visually breaks the product identity
- Each panel shares the same shell/chrome/typography as CoverageSummary
- Mobile: all panels stack below `md` breakpoint
- No horizontal overflow in any panel at 390px

---

## 5. Active Scene Highlight in Sidebar

**Why:** The scene navigator has hover cues but no persistent indicator showing which
scene is currently visible in the editor. Writers lose their place when scrolling.

**Scope:**
- Add a `currentLine` prop to `Sidebar` (1-based line number from the editor).
- Compare each scene's block start line to `currentLine` to determine the active scene.
- Active scene row gets: stamp left-edge marker (permanent, not just hover), slightly
  bolder text, subtle background wash.
- On mobile (drawer open): auto-scroll the active scene into view.

**Anchors:**
- Sidebar: `Sidebar.tsx:145-190` (scenes data)
- Editor navigation: `FountainEditor.tsx:176-192`
- Editor scroll detection: `EditorView.updateListener` at `FountainEditor.tsx:206-212`

**Implementation:**
- In `FountainEditor.tsx`, after each update, dispatch the current visible line back to
  the parent via a new `onVisibleLineChange` callback.
- In `ScriptIDE.tsx`, store the value in state and pass to `Sidebar`.
- In `Sidebar.tsx`, compare and apply the active class.

**Acceptance:**
- As you scroll through the manuscript, the active scene row updates in real-time
- Active row has a persistent stamp marker (not just hover)
- Mobile: active scene auto-scrolls into view when drawer opens
- Performance: debounce the visible-line callback to ~100ms

---

## 6. Typography Consistency Pass

**Why:** Despite having defined type roles (display/body/mono/hand), many surfaces still
use raw `font-mono` at inconsistent sizes. The Toolbar title was upgraded to display type
in `c64c133`, but other surfaces (empty state, action strip labels, sidebar metadata)
still use 9-11px mono in a flat hierarchy.

**Scope:**
- Audit all `text-[9px]`, `text-[10px]`, `text-[11px]` usages in:
  - `ScriptIDE.tsx`
  - `Toolbar.tsx`
  - `Sidebar.tsx`
  - `CoverageSummary.tsx`
- Apply the four type roles:
  - **Display** (`--sm-font-display`): page title, section headings only
  - **Body** (`--sm-font-body`): any prose longer than one phrase
  - **Mono** (`--sm-font-mono`): machine truth (counts, status, metadata)
  - **Hand** (`--sm-font-hand`): sparing annotations only
- Ensure minimum `text-[10px]` on all surfaces (no sub-10px for readability).

**Acceptance:**
- No raw `text-[9px]` remains in the ScriptIDE shell
- Body text uses `--sm-font-body` for any sentence-length content
- Display type only appears in page/section titles (not labels)

---

## 7. Focus Ring Audit

**Why:** The redesign improved touch targets (40-44px) but didn't add a consistent
visible focus ring to all interactive elements. Keyboard users can't see where focus is.

**Scope:**
- Add a shared focus ring utility to `design-system.css`:
  ```css
  .sm-focus:focus-visible {
    outline: 2px solid var(--sm-stamp);
    outline-offset: 2px;
  }
  ```
- Apply `sm-focus` (or `focus-visible:outline-[var(--sm-stamp)]` Tailwind) to:
  - All `sm-btn` variants
  - Scene rows in the sidebar
  - Action strip buttons
  - Toolbar task tabs
  - Coverage panel buttons
  - Export menu items
- Remove any existing `focus:outline-none` without replacement.

**Acceptance:**
- Every interactive element has a visible stamp-red focus ring on Tab
- Focus ring is 2px, offset 2px, stamp color
- Works on both light and dark surfaces

---

## 8. Page-Count Footer on Manuscript

**Why:** Real screenplays have page numbers. The manuscript currently has no pagination
indicator. While true WYSIWYG pagination is complex (see `screenplay-layout.ts`), a
nominal page count based on the existing toolbar calculation is a lightweight win.

**Scope:**
- Render a subtle page number below the manuscript (inside `.cm-content` padding area)
  using a CodeMirror widget decoration at the last line, or a CSS pseudo-element.
- Use the existing `pageCount` variable from `ScriptIDE.tsx:758-769`.
- Style: `9px mono`, `var(--sm-ink-faint)/40`, centered below the text column.
- Don't claim these match PDF page breaks (they don't — the live column is taller).

**Acceptance:**
- Nominal page number appears below the text column
- Styled subtly (not competing with the text)
- Disclaimer in the tooltip: "Approximate — PDF pagination may differ"

---

## 9. Reduced-Motion Polish

**Why:** The new tactile push (`translateY(1px)`) and stage-transition animations are
CSS transitions that should be suppressed for users with `prefers-reduced-motion: reduce`.

**Scope:**
- `src/styles/design-system.css` — add:
  ```css
  @media (prefers-reduced-motion: reduce) {
    .sm-btn:active { transform: none !important; }
    .sm-btn--stamp:active { transform: none !important; }
    .sm-card:active { transform: none !important; }
    .sm-stage-transition { transition: none !important; }
  }
  ```
- This is already partially handled globally (`index.css:209-228`), but explicit class
  guards prevent future regressions.

**Acceptance:**
- No translate/scale on `:active` when reduced-motion is on
- No background-color transition on stage
- Verified by inspecting CSS in browser devtools with reduced-motion emulation
