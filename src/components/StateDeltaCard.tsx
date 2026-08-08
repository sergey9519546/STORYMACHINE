import React, { useState } from 'react';
import { motion } from 'motion/react';

export interface StateDeltaCardType {
  action: string;
  dialogue?: string;
  effects: string[];
  requiresConfirmation: boolean;
  confidenceScore?: number;
  dramaticIrony?: boolean;
  characterBeliefMap?: Record<string, string>;
  suggestionChips?: string[];
}

interface Props {
  card: StateDeltaCardType;
  onConfirm: (editedCard?: StateDeltaCardType) => void;
  onEdit?: () => void;
  onReject: () => void;
  disabled?: boolean;
}

export function StateDeltaCard({ card, onConfirm, onEdit, onReject, disabled }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [actionText, setActionText] = useState(card.action);
  const [dialogueText, setDialogueText] = useState(card.dialogue || '');

  const handleSelectChip = (chip: string) => {
    setActionText(chip);
    setIsEditing(true);
  };

  const handleSaveAndConfirm = () => {
    const updated: StateDeltaCardType = {
      ...card,
      action: actionText,
      dialogue: dialogueText ? dialogueText : undefined,
    };
    onConfirm(updated);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`bg-[var(--sm-panel)] border-[2px] ${
        card.requiresConfirmation ? 'border-[#c1301c]' : 'border-[var(--sm-ink)]'
      } p-5 shadow-[var(--sm-shadow-lg)] w-[440px] font-mono text-[var(--sm-ink)] flex flex-col gap-4 relative z-50`}
    >
      <div className="flex justify-between items-center border-b border-[var(--sm-hair)] pb-3">
        <h3 className="font-bold uppercase tracking-widest text-xs flex items-center gap-2">
          {card.requiresConfirmation && (
            <span className="w-2 h-2 rounded-full bg-[#c1301c] animate-pulse" />
          )}
          State Delta Proposal
        </h3>

        <div className="flex items-center gap-2">
          {typeof card.confidenceScore === 'number' && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--sm-panel-2)] border border-[var(--sm-hair)] font-semibold">
              {card.confidenceScore}% Certainty
            </span>
          )}
          <button
            onClick={onReject}
            disabled={disabled}
            className="text-[var(--sm-ink-mute)] hover:text-[var(--sm-ink)] p-1 text-sm leading-none"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>

      {card.dramaticIrony && (
        <div className="text-[11px] bg-amber-500/10 text-amber-700 dark:text-amber-300 p-2 border border-amber-500/30 rounded flex items-center gap-2">
          <span className="font-bold">🎭 Dramatic Irony:</span> Audience holds secret state unknown to in-scene characters.
        </div>
      )}

      <div className="bg-[var(--sm-panel-2)] p-3 border border-[var(--sm-night-line)] text-sm rounded">
        {isEditing ? (
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase text-[var(--sm-ink-mute)]">Action Description</label>
            <input
              type="text"
              value={actionText}
              onChange={(e) => setActionText(e.target.value)}
              className="bg-[var(--sm-paper)] border border-[var(--sm-hair)] p-1.5 text-xs font-mono w-full"
            />
            <label className="text-[10px] uppercase text-[var(--sm-ink-mute)] mt-1">Dialogue Line (Optional)</label>
            <input
              type="text"
              value={dialogueText}
              onChange={(e) => setDialogueText(e.target.value)}
              className="bg-[var(--sm-paper)] border border-[var(--sm-hair)] p-1.5 text-xs font-mono w-full"
            />
          </div>
        ) : (
          <>
            <div className="mb-2">
              <span className="text-[var(--sm-ink-mute)] text-[10px] uppercase tracking-widest block">Action:</span>
              <div className="mt-1 font-bold text-xs">{actionText}</div>
            </div>
            {dialogueText && (
              <div>
                <span className="text-[var(--sm-ink-mute)] text-[10px] uppercase tracking-widest block">Dialogue:</span>
                <div className="mt-1 italic text-xs">"{dialogueText}"</div>
              </div>
            )}
          </>
        )}
      </div>

      {card.characterBeliefMap && Object.keys(card.characterBeliefMap).length > 0 && (
        <div>
          <span className="text-[var(--sm-ink-mute)] text-[10px] uppercase tracking-widest mb-1.5 block">
            Belief Network Shifts:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(card.characterBeliefMap).map(([char, belief]) => (
              <span key={char} className="text-[10px] px-2 py-0.5 bg-[var(--sm-panel-2)] border border-[var(--sm-hair)] rounded">
                <strong>{char}:</strong> {belief}
              </span>
            ))}
          </div>
        </div>
      )}

      {card.effects.length > 0 && (
        <div>
          <span className="text-[var(--sm-ink-mute)] text-[10px] uppercase tracking-widest mb-1.5 block">
            Predicted Effects:
          </span>
          <ul className="list-disc pl-5 text-xs space-y-1">
            {card.effects.map((effect, idx) => (
              <li key={idx} className={card.requiresConfirmation ? 'text-[#c1301c]' : ''}>
                {effect}
              </li>
            ))}
          </ul>
        </div>
      )}

      {card.suggestionChips && card.suggestionChips.length > 0 && (
        <div>
          <span className="text-[var(--sm-ink-mute)] text-[10px] uppercase tracking-widest mb-1.5 block">
            Suggested Moves:
          </span>
          <div className="flex flex-wrap gap-1">
            {card.suggestionChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectChip(chip)}
                className="text-[10px] px-2 py-1 bg-[var(--sm-panel-2)] hover:bg-[var(--sm-ink)] hover:text-[var(--sm-paper)] border border-[var(--sm-hair)] rounded transition-colors text-left"
              >
                + {chip}
              </button>
            ))}
          </div>
        </div>
      )}

      {card.requiresConfirmation && (
        <div className="text-[11px] bg-[#c1301c]/10 text-[#c1301c] p-2 border border-[#c1301c]/20 rounded">
          <strong>IRREVERSIBLE:</strong> Please confirm or edit this choice before committing to the story ledger.
        </div>
      )}

      <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-[var(--sm-hair)]">
        {isEditing ? (
          <button
            onClick={() => setIsEditing(false)}
            className="px-3 py-1.5 border border-[var(--sm-ink-mute)] text-xs font-bold uppercase text-[var(--sm-ink-mute)] hover:text-[var(--sm-ink)]"
          >
            Cancel
          </button>
        ) : (
          <button
            onClick={() => {
              if (onEdit) onEdit();
              setIsEditing(true);
            }}
            disabled={disabled}
            className="px-3 py-1.5 border-[2px] border-[var(--sm-ink)] text-xs font-bold uppercase hover:bg-[var(--sm-ink)] hover:text-[var(--sm-paper)] transition-colors"
          >
            Edit
          </button>
        )}
        <button
          onClick={handleSaveAndConfirm}
          disabled={disabled}
          className={`px-4 py-1.5 border-[2px] text-xs font-bold uppercase transition-colors ${
            card.requiresConfirmation
              ? 'bg-[#c1301c] border-[#c1301c] text-white hover:bg-white hover:text-[#c1301c]'
              : 'bg-[var(--sm-ink)] border-[var(--sm-ink)] text-[var(--sm-paper)] hover:bg-[var(--sm-paper)] hover:text-[var(--sm-ink)]'
          }`}
        >
          {isEditing ? 'Save & Confirm' : 'Confirm'}
        </button>
      </div>
    </motion.div>
  );
}
