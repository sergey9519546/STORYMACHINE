import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Save, Trash2, History } from "lucide-react";

interface Snapshot {
  id: string;
  name: string;
  text: string;
  date: string;
}

interface SnapshotManagerProps {
  snapshots: Snapshot[];
  snapshotModal: { open: boolean; name: string };
  restoreModal: { open: boolean; text: string };
  onTakeSnapshot: () => void;
  onConfirmSnapshot: () => void;
  onRestoreSnapshot: (text: string) => void;
  onConfirmRestore: () => void;
  onDeleteSnapshot: (id: string) => void;
  onSetSnapshotModal: (modal: { open: boolean; name: string }) => void;
  onSetRestoreModal: (modal: { open: boolean; text: string }) => void;
  /** When true, only mount modals (list rendered elsewhere in studio Versions). */
  hideList?: boolean;
}

export default function SnapshotManager({
  snapshots,
  snapshotModal,
  restoreModal,
  onTakeSnapshot,
  onConfirmSnapshot,
  onRestoreSnapshot,
  onConfirmRestore,
  onDeleteSnapshot,
  onSetSnapshotModal,
  onSetRestoreModal,
  hideList = false,
}: SnapshotManagerProps) {
  return (
    <>
      {!hideList && (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-bold uppercase tracking-widest">
            Script Snapshots
          </h2>
          <button
            onClick={onTakeSnapshot}
            aria-label="Save new script version snapshot"
            className="sm-btn--ink px-3 py-1 text-[10px] font-bold uppercase sm-btn flex items-center gap-2"
          >
            <Save className="w-3 h-3" /> Save Version
          </button>
        </div>
        <div className="space-y-4">
          {snapshots.map((s) => (
            <div
              key={s.id}
              className="bg-white dark:bg-zinc-800 p-4 border-[2px] border-[var(--sm-ink)] shadow-[var(--sm-shadow)] flex justify-between items-center"
            >
              <div>
                <div className="font-bold uppercase text-xs">{s.name}</div>
                <div className="text-[10px] font-mono opacity-60">{s.date}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onRestoreSnapshot(s.text)}
                  aria-label={`Restore snapshot: ${s.name}`}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors"
                >
                  <History className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteSnapshot(s.id)}
                  aria-label={`Delete snapshot: ${s.name}`}
                  className="p-2 hover:bg-red-100 text-red-500 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {snapshots.length === 0 && (
            <div className="text-center p-8 border-2 border-dashed border-gray-300 text-gray-400 font-mono text-xs">
              No snapshots saved yet.
            </div>
          )}
        </div>
      </div>
      )}

      {/* Snapshot name modal */}
      <AnimatePresence>
        {snapshotModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white dark:bg-zinc-800 p-6 border-[2px] border-[var(--sm-ink)] shadow-[var(--sm-shadow)] w-80 space-y-4"
            >
              <h3 className="font-bold uppercase text-xs tracking-widest">
                Save Snapshot
              </h3>
              <input
                type="text"
                value={snapshotModal.name}
                onChange={(e) =>
                  onSetSnapshotModal({ ...snapshotModal, name: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") onConfirmSnapshot();
                  if (e.key === "Escape")
                    onSetSnapshotModal({ open: false, name: "" });
                }}
                autoFocus
                aria-label="Snapshot version name"
                className="w-full border-2 border-black px-3 py-2 font-mono text-sm dark:bg-zinc-700 dark:text-white"
                placeholder="Version name…"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => onSetSnapshotModal({ open: false, name: "" })}
                  className="px-4 py-2 text-xs font-bold uppercase border-2 border-black hover:bg-gray-100 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirmSnapshot}
                  className="px-4 py-2 text-xs font-bold uppercase sm-btn--ink hover:bg-gray-800"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Restore confirm modal */}
      <AnimatePresence>
        {restoreModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white dark:bg-zinc-800 p-6 border-[2px] border-[var(--sm-ink)] shadow-[var(--sm-shadow)] w-80 space-y-4"
            >
              <h3 className="font-bold uppercase text-xs tracking-widest">
                Restore Snapshot?
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Current unsaved changes will be lost.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => onSetRestoreModal({ open: false, text: "" })}
                  className="px-4 py-2 text-xs font-bold uppercase border-2 border-black hover:bg-gray-100 dark:hover:bg-zinc-700"
                >
                  Cancel
                </button>
                <button
                  onClick={onConfirmRestore}
                  className="px-4 py-2 text-xs font-bold uppercase sm-btn--ink hover:bg-[var(--sm-stamp)]"
                >
                  Restore
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
