import React, { useRef } from 'react';
import { motion } from 'motion/react';
import { Keyboard, X } from 'lucide-react';
import { useModalFocusTrap } from '../../lib/use-modal-focus-trap.ts';

interface Props {
  onClose: () => void;
}

interface ShortcutRow {
  key: string;
  action: string;
}

interface ShortcutGroup {
  title: string;
  rows: ShortcutRow[];
}

// E5 (docs/PATH_TO_EXCELLENCE.md): this list is audited against the actual
// keydown handlers, not aspirational — every row below is verified real as
// of this pass:
//   - "Global" rows: ScriptIDE.tsx's Ctrl+/ effect and its consolidated
//     Cmd/Ctrl+K · Cmd/Ctrl+S · Alt+Shift+D · Ctrl+Shift+F effect.
//   - "Editor" rows: fountain-keymap.ts's Enter-commit, Tab/Shift-Tab
//     element-cycling, and Escape/Ctrl-m bindings (see that file's header
//     for the full reasoning); CM6's autocompletion() extension's own
//     Enter/click acceptance; and @codemirror/search's searchKeymap
//     (FountainEditor.tsx), styled in search-panel-theme.ts.
//   - "Script Doctor" row: ScriptDoctorPanel.tsx's Cmd/Ctrl+Enter effect.
//   - "Command palette" rows: CommandPalette.tsx's own input onKeyDown.
// Three earlier rows here (Ctrl+S as a manual-save no-op, "Ctrl+Shift+F —
// Typewriter Focus Mode (Center Active Line)" claiming a feature with zero
// wiring, "Alt+Shift+D — Toggle Dark / CRT Vintage / Print Theme" claiming
// three theme states that don't exist in this codebase) were FALSE — no
// keydown handler anywhere matched them, confirmed by grepping the whole
// src tree before this pass. Per this project's "remove nothing; correct
// anything stale" rule, none of those three rows were deleted: Ctrl+S now
// really does force an immediate save, Ctrl+Shift+F now really does toggle
// a (narrower, honestly-described) Typewriter Focus, and Alt+Shift+D now
// really does toggle dark/light mode — see FountainEditor.tsx's
// isTypewriterFocus prop doc comment for exactly what shipped vs. what the
// old claim overstated. A LATER pass (item 3/4, upgrade-exports-editor) bound
// Tab and Cmd/Ctrl+F, which the "Tab is never intercepted" / no find-replace
// rows here used to correctly (at the time) describe — those rows are
// updated below to match, not deleted, for the same reason.
const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Global',
    rows: [
      { key: 'Cmd/Ctrl + K', action: 'Open the command palette' },
      { key: 'Cmd/Ctrl + /', action: 'Toggle this keyboard shortcuts panel' },
      { key: 'Cmd/Ctrl + S', action: 'Save now (forces an immediate save — autosave already runs continuously)' },
      { key: 'Escape', action: 'Close the topmost open panel or dialog' },
    ],
  },
  {
    title: 'Editor',
    rows: [
      { key: 'Enter', action: "Commit auto-uppercase (scene headings, transitions, character cues) — or accept an open autocomplete suggestion" },
      { key: 'Tab', action: 'On an empty new-paragraph line: cycle action → character → parenthetical → dialogue → transition (previewed live). Elsewhere: insert a normal indent' },
      { key: 'Shift + Tab', action: 'Cycle the element type backward, or outdent — the reverse of Tab' },
      { key: 'Escape, then Tab', action: 'Leave the editor and move focus to the next control (Tab is otherwise captured — see above)' },
      { key: 'Ctrl + M', action: 'Toggle whether Tab is captured for element-cycling at all, vs. always moving focus' },
      { key: 'Cmd/Ctrl + F', action: 'Open find/replace (case-sensitive, whole-word, and regexp toggles; replace and replace all)' },
      { key: 'F3 / Cmd/Ctrl + G', action: 'Find next match (Shift for previous) — while find/replace is open' },
      { key: 'Alt + Shift + D', action: 'Toggle dark / light mode' },
      { key: 'Cmd/Ctrl + Shift + F', action: "Typewriter Focus — keep the cursor's line centered as you type" },
    ],
  },
  {
    title: 'Script Doctor',
    rows: [
      { key: 'Cmd/Ctrl + Enter', action: "Re-run diagnosis (while its panel is open)" },
    ],
  },
  {
    title: 'Command palette',
    rows: [
      { key: '↑ / ↓', action: 'Move the highlighted action' },
      { key: 'Enter', action: 'Run the highlighted action' },
      { key: 'Escape', action: 'Close the palette — focus returns to where you were' },
    ],
  },
];

export default function ShortcutModal({ onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  useModalFocusTrap(dialogRef);

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-modal-title"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-[var(--sm-panel)] border-2 border-[var(--sm-ink)] shadow-[var(--sm-shadow-lg)] font-mono text-[var(--sm-ink)] p-5 rounded max-h-[85vh] flex flex-col"
      >
        <div className="flex justify-between items-center border-b border-[var(--sm-hair)] pb-3 shrink-0">
          {/* a11y pass: this was a plain <div> — not a heading at all — so
              axe's heading-order rule saw the group labels below (<h3>) as
              the first heading inside this dialog, skipping straight past
              h2 from whatever h1 preceded it in the document (Toolbar's
              title). A real <h2>, same visual styling, is both the correct
              dialog-title semantics and the fix for the skipped level. */}
          <h2 id="shortcut-modal-title" className="flex items-center gap-2 font-bold uppercase text-xs tracking-wider">
            <Keyboard className="w-4 h-4 text-[var(--sm-ink-mute)]" aria-hidden="true" />
            <span>Keyboard Shortcuts</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close keyboard shortcuts"
            className="p-1 text-[var(--sm-ink-mute)] hover:text-[var(--sm-ink)]"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* a11y pass: a scrollable region (overflow-y-auto, real overflow
            once every group renders) with no other way to receive focus —
            tabIndex=0 is the standard fix so a screen-reader/keyboard user
            can actually reach and scroll it. */}
        <div className="mt-4 flex flex-col gap-4 overflow-y-auto" tabIndex={0}>
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--sm-ink-faint)]">
                {group.title}
              </h3>
              {group.rows.map((sc, i) => (
                <div key={i} className="flex justify-between items-center gap-3 p-2 rounded bg-[var(--sm-panel-2)] border border-[var(--sm-hair)] text-xs">
                  <span className="font-semibold text-[var(--sm-ink-soft)]">{sc.action}</span>
                  <kbd className="shrink-0 px-2 py-1 bg-[var(--sm-paper)] border border-[var(--sm-hair)] rounded text-[10px] font-bold text-[var(--sm-ink)]">
                    {sc.key}
                  </kbd>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-5 pt-3 border-t border-[var(--sm-hair)] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 border border-[var(--sm-ink)] bg-[var(--sm-ink)] text-[var(--sm-paper)] text-xs font-bold uppercase hover:bg-[var(--sm-paper)] hover:text-[var(--sm-ink)] transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
