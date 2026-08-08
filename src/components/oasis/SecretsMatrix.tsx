import React from 'react';
import { Eye, EyeOff, ShieldAlert, KeyRound } from 'lucide-react';

export interface SecretItem {
  id: string;
  fact: string;
  holderCharName: string;
  targetCharName: string;
  isRevealed: boolean;
  dramaticTensionScore: number;
}

interface Props {
  secrets: SecretItem[];
  onToggleReveal?: (secretId: string) => void;
}

export default function SecretsMatrix({ secrets, onToggleReveal }: Props) {
  if (!secrets.length) {
    return (
      <div className="p-4 rounded border border-[var(--sm-hair)] bg-[var(--sm-panel-2)] text-xs text-[var(--sm-ink-mute)] font-mono italic">
        No active character secrets or motive conflicts detected.
      </div>
    );
  }

  return (
    <div className="sm-card border-[var(--sm-hair)] bg-[var(--sm-panel)] p-4 rounded font-mono text-xs text-[var(--sm-ink)] flex flex-col gap-3">
      <div className="flex justify-between items-center border-b border-[var(--sm-hair)] pb-2">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-amber-400" />
          <h3 className="font-bold uppercase tracking-wider text-[11px]">Secrets & Motive Conflict Matrix</h3>
        </div>
        <span className="text-[10px] text-[var(--sm-ink-mute)]">
          {secrets.filter((s) => s.isRevealed).length}/{secrets.length} Revealed
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {secrets.map((sec) => (
          <div
            key={sec.id}
            className={`p-3 rounded border flex items-center justify-between gap-3 ${
              sec.isRevealed
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-[var(--sm-panel-2)] border-[var(--sm-hair)] text-[var(--sm-ink)]'
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-xs">{sec.holderCharName}</span>
                <span className="text-[10px] text-[var(--sm-ink-mute)]">holds secret about</span>
                <span className="font-bold text-xs">{sec.targetCharName}</span>
              </div>
              <p className="text-xs text-[var(--sm-ink-soft)] italic">"{sec.fact}"</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] block text-[var(--sm-ink-mute)]">Tension</span>
                <span className="font-bold text-xs text-amber-400">{sec.dramaticTensionScore}</span>
              </div>

              {onToggleReveal && (
                <button
                  type="button"
                  onClick={() => onToggleReveal(sec.id)}
                  className="p-1.5 rounded border border-[var(--sm-hair)] hover:bg-[var(--sm-paper)] transition-colors"
                  title={sec.isRevealed ? 'Mark Unrevealed' : 'Reveal Secret'}
                >
                  {sec.isRevealed ? (
                    <EyeOff className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-emerald-400" />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
