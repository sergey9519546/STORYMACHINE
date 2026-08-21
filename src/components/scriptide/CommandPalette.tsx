// Command palette (E5, docs/PATH_TO_EXCELLENCE.md) — Cmd/Ctrl+K opens a
// fuzzy-searchable list of the real actions a writer has in the desk.
// Every action's `run` is a handler ScriptIDE.tsx already wires to a
// visible button (see command-palette.ts's PaletteAction doc comment) —
// this component only searches, highlights, and dispatches; it never
// re-implements what an action does.
//
// Accessibility: an ARIA 1.2 combobox-listbox pattern, not a list of real
// buttons — the search <input> keeps DOM focus for the entire interaction
// (useModalFocusTrap's mount-focus lands here, since it's the only real
// focusable descendant) and `aria-activedescendant` tracks the highlighted
// row instead of moving focus onto it. This is deliberate: mixing
// independently-tabbable option rows with arrow-key highlighting is the
// classic broken combobox anti-pattern (two competing "what's selected"
// mechanisms). Escape is handled by ScriptIDE's existing "topmost layer"
// escape ladder, not locally here — see the paletteOpen branch added to
// that effect — so this component only needs to expose `onClose` for the
// ladder (and the Escape-ladder ordering) to call.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { Search, CornerDownLeft, ArrowUp, ArrowDown } from "lucide-react";
import { useModalFocusTrap } from "../../lib/use-modal-focus-trap.ts";
import { filterPaletteActions, type PaletteAction } from "../../lib/command-palette.ts";

interface CommandPaletteProps {
  actions: PaletteAction[];
  onClose: () => void;
}

export default function CommandPalette({ actions, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  useModalFocusTrap(dialogRef);

  const filtered = useMemo(() => filterPaletteActions(actions, query), [actions, query]);

  // Reset the highlight whenever the visible list changes shape (a new
  // query narrowed or widened it) so it never points at a row that no
  // longer exists or, worse, silently stays on a stale index that now
  // belongs to an unrelated action.
  useEffect(() => {
    setHighlighted(0);
  }, [filtered.length, query]);

  const runAt = (index: number) => {
    const action = filtered[index];
    if (!action || action.disabled) return;
    action.run();
    onClose();
  };

  const moveHighlight = (delta: 1 | -1) => {
    if (filtered.length === 0) return;
    setHighlighted((prev) => {
      // Skip disabled rows — landing the highlight on a row Enter can't
      // actually run would be a dead end for a keyboard-only writer.
      let next = prev;
      for (let i = 0; i < filtered.length; i++) {
        next = (next + delta + filtered.length) % filtered.length;
        if (!filtered[next]?.disabled) return next;
      }
      return prev;
    });
  };

  const highlightedId = filtered[highlighted] ? `command-palette-option-${filtered[highlighted].id}` : undefined;

  // Group headers: only meaningful in the unfiltered, curated registry
  // order — once the writer is actively searching, results are ranked by
  // match quality and may legitimately interleave groups, so headers would
  // misleadingly suggest the list is still grouped.
  const showGroupHeaders = query.trim() === "";
  let lastGroup: string | null = null;

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center bg-black/60 backdrop-blur-sm px-4 pt-[12vh]">
      <motion.div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        initial={{ opacity: 0, scale: 0.97, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -8 }}
        transition={{ duration: 0.14 }}
        className="w-full max-w-lg bg-[var(--sm-panel)] border-2 border-[var(--sm-ink)] shadow-[var(--sm-shadow-lg)] font-mono text-[var(--sm-ink)] rounded overflow-hidden"
      >
        <div className="flex items-center gap-2 border-b border-[var(--sm-hair)] px-4 py-3">
          <Search className="w-4 h-4 shrink-0 text-[var(--sm-ink-mute)]" aria-hidden="true" />
          <input
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-listbox"
            aria-autocomplete="list"
            aria-activedescendant={highlightedId}
            aria-label="Search actions"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Run a command, jump to a scene…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-[var(--sm-ink-faint)]"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                moveHighlight(1);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                moveHighlight(-1);
              } else if (e.key === "Enter") {
                e.preventDefault();
                runAt(highlighted);
              }
              // Escape is intentionally NOT handled here — see this file's
              // header comment. ScriptIDE's escape ladder calls onClose().
            }}
          />
        </div>

        <div
          id="command-palette-listbox"
          role="listbox"
          aria-label="Actions"
          ref={listRef}
          className="max-h-[52vh] overflow-y-auto py-1"
        >
          {filtered.length === 0 && (
            <p className="px-4 py-6 text-center text-xs text-[var(--sm-ink-faint)] uppercase tracking-wider">
              No matching actions{query.trim() ? ` for "${query.trim()}"` : ""}.
            </p>
          )}
          {filtered.map((action, i) => {
            const isNewGroup = showGroupHeaders && action.group !== lastGroup;
            if (isNewGroup) lastGroup = action.group;
            const isHighlighted = i === highlighted;
            return (
              <React.Fragment key={action.id}>
                {isNewGroup && (
                  <div className="px-4 pt-2.5 pb-1 text-[9px] font-bold uppercase tracking-widest text-[var(--sm-ink-faint)]">
                    {action.group}
                  </div>
                )}
                <div
                  id={`command-palette-option-${action.id}`}
                  role="option"
                  aria-selected={isHighlighted}
                  aria-disabled={action.disabled || undefined}
                  onMouseEnter={() => setHighlighted(i)}
                  // mousedown (not click): fires before the input blurs, so
                  // focus stays on the input for the whole interaction
                  // rather than bouncing to <body> — same reasoning as
                  // ARIA-APG combobox examples for pointer selection.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    runAt(i);
                  }}
                  className={`mx-1 flex items-center justify-between gap-3 rounded px-3 py-2 text-xs cursor-pointer ${
                    action.disabled
                      ? "opacity-40 cursor-not-allowed"
                      : isHighlighted
                        ? "bg-[var(--sm-ink)] text-[var(--sm-paper)]"
                        : "text-[var(--sm-ink)]"
                  }`}
                >
                  <span className="flex flex-col gap-0.5 min-w-0">
                    <span className="truncate font-semibold">{action.label}</span>
                    {action.hint && (
                      <span
                        className={`truncate text-[10px] ${isHighlighted ? "opacity-80" : "text-[var(--sm-ink-mute)]"}`}
                      >
                        {action.hint}
                      </span>
                    )}
                  </span>
                  {action.shortcut && (
                    <kbd
                      className={`shrink-0 px-1.5 py-0.5 border rounded text-[9px] font-bold ${
                        isHighlighted
                          ? "border-[var(--sm-paper)]/40"
                          : "border-[var(--sm-hair)] text-[var(--sm-ink-mute)]"
                      }`}
                    >
                      {action.shortcut}
                    </kbd>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div className="flex items-center gap-4 border-t border-[var(--sm-hair)] px-4 py-2 text-[9px] uppercase tracking-wider text-[var(--sm-ink-faint)]">
          <span className="flex items-center gap-1">
            <ArrowUp className="w-3 h-3" aria-hidden="true" />
            <ArrowDown className="w-3 h-3" aria-hidden="true" />
            Navigate
          </span>
          <span className="flex items-center gap-1">
            <CornerDownLeft className="w-3 h-3" aria-hidden="true" />
            Select
          </span>
          <span className="ml-auto">Esc close</span>
        </div>
      </motion.div>
    </div>
  );
}
