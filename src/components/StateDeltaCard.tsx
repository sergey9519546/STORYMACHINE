import React from 'react';
import { motion } from 'motion/react';
export interface StateDeltaCardType {
  action: string;
  dialogue?: string;
  effects: string[];
  requiresConfirmation: boolean;
}

interface Props {
  card: StateDeltaCardType;
  onConfirm: () => void;
  onEdit: () => void;
  onReject: () => void;
  disabled?: boolean;
}

export function StateDeltaCard({ card, onConfirm, onEdit, onReject, disabled }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`bg-[var(--sm-panel)] border-[2px] ${
        card.requiresConfirmation ? 'border-[#c1301c]' : 'border-[var(--sm-ink)]'
      } p-5 shadow-[var(--sm-shadow-lg)] w-[400px] font-mono text-[var(--sm-ink)] flex flex-col gap-4`}
    >
      <div className="flex justify-between items-start">
        <h3 className="font-bold uppercase tracking-widest text-sm flex items-center gap-2">
          {card.requiresConfirmation && (
            <span className="w-2 h-2 rounded-full bg-[#c1301c] animate-pulse" />
          )}
          State Delta Proposal
        </h3>
        <button
          onClick={onReject}
          disabled={disabled}
          className="text-[var(--sm-ink-mute)] hover:text-[var(--sm-ink)]"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>

      <div className="bg-[var(--sm-panel-2)] p-3 border border-[var(--sm-night-line)] text-sm">
        <div className="mb-2">
          <span className="text-[var(--sm-ink-mute)] text-xs uppercase tracking-widest">Action:</span>
          <div className="mt-1 font-bold">{card.action}</div>
        </div>
        {card.dialogue && (
          <div className="mb-2">
            <span className="text-[var(--sm-ink-mute)] text-xs uppercase tracking-widest">Dialogue:</span>
            <div className="mt-1 italic">"{card.dialogue}"</div>
          </div>
        )}
      </div>

      {card.effects.length > 0 && (
        <div>
          <span className="text-[var(--sm-ink-mute)] text-xs uppercase tracking-widest mb-2 block">
            Predicted Effects:
          </span>
          <ul className="list-disc pl-5 text-sm space-y-1">
            {card.effects.map((effect, idx) => (
              <li key={idx} className={card.requiresConfirmation ? 'text-[#c1301c]' : ''}>
                {effect}
              </li>
            ))}
          </ul>
        </div>
      )}

      {card.requiresConfirmation && (
        <div className="text-xs bg-[#c1301c]/10 text-[#c1301c] p-2 border border-[#c1301c]/20">
          <strong>IRREVERSIBLE:</strong> Please confirm or edit this choice before proceeding.
        </div>
      )}

      <div className="flex gap-2 justify-end mt-2">
        <button
          onClick={onEdit}
          disabled={disabled}
          className="px-3 py-1.5 border-[2px] border-[var(--sm-ink)] text-xs font-bold uppercase hover:bg-[var(--sm-ink)] hover:text-[var(--sm-paper)] transition-colors"
        >
          Edit
        </button>
        <button
          onClick={onConfirm}
          disabled={disabled}
          className={`px-3 py-1.5 border-[2px] text-xs font-bold uppercase transition-colors ${
            card.requiresConfirmation
              ? 'bg-[#c1301c] border-[#c1301c] text-white hover:bg-white hover:text-[#c1301c]'
              : 'bg-[var(--sm-ink)] border-[var(--sm-ink)] text-[var(--sm-paper)] hover:bg-[var(--sm-paper)] hover:text-[var(--sm-ink)]'
          }`}
        >
          Confirm
        </button>
      </div>
    </motion.div>
  );
}
