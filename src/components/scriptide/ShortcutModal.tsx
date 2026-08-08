import React from 'react';
import { motion } from 'motion/react';
import { Keyboard, X } from 'lucide-react';

interface Props {
  onClose: () => void;
}

export default function ShortcutModal({ onClose }: Props) {
  const shortcuts = [
    { key: "Ctrl + /", action: "Toggle Keyboard Shortcut Cheat Sheet" },
    { key: "Tab / Enter", action: "Fountain Smart Formatting & Block Transitions" },
    { key: "Ctrl + S", action: "Save Script Draft to Server & Local Storage" },
    { key: "Ctrl + Shift + F", action: "Toggle Typewriter Focus Mode (Center Active Line)" },
    { key: "Alt + Shift + D", action: "Toggle Dark / CRT Vintage / Print Theme" },
    { key: "Cmd/Ctrl + Shift + C", action: "Open Script Doctor Coverage Panel" },
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-[var(--sm-panel)] border-2 border-[var(--sm-ink)] shadow-[var(--sm-shadow-lg)] font-mono text-[var(--sm-ink)] p-5 rounded"
      >
        <div className="flex justify-between items-center border-b border-[var(--sm-hair)] pb-3">
          <div className="flex items-center gap-2 font-bold uppercase text-xs tracking-wider">
            <Keyboard className="w-4 h-4 text-[var(--sm-ink-mute)]" />
            <span>Keyboard Shortcuts</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[var(--sm-ink-mute)] hover:text-[var(--sm-ink)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {shortcuts.map((sc, i) => (
            <div key={i} className="flex justify-between items-center p-2 rounded bg-[var(--sm-panel-2)] border border-[var(--sm-hair)] text-xs">
              <span className="font-semibold text-[var(--sm-ink-soft)]">{sc.action}</span>
              <kbd className="px-2 py-1 bg-[var(--sm-paper)] border border-[var(--sm-hair)] rounded text-[10px] font-bold text-[var(--sm-ink)]">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-3 border-t border-[var(--sm-hair)] flex justify-end">
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
