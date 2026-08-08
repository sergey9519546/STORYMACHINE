import React from 'react';
import type { CriticSuggestion } from '../../../server/critics/types';
import { Check, X, ArrowRight } from 'lucide-react';

interface Props {
  suggestions: CriticSuggestion[];
  onApply: (suggestion: CriticSuggestion) => void;
  onReject: (suggestionId: string) => void;
}

export default function CriticDiffInspector({ suggestions, onApply, onReject }: Props) {
  if (!suggestions.length) return null;

  return (
    <div className="flex flex-col gap-3 my-3 font-mono text-xs">
      <h4 className="font-bold text-[11px] uppercase tracking-wider text-[var(--sm-ink-mute)]">
        Critic Suggestions & Diffs ({suggestions.length})
      </h4>

      {suggestions.map((sugg) => (
        <div key={sugg.id} className="p-3 rounded bg-[var(--sm-panel-2)] border border-[var(--sm-hair)] flex flex-col gap-2">
          <div className="flex justify-between items-center text-[10px] text-[var(--sm-ink-mute)]">
            <span>Line {sugg.targetLine}</span>
            <span className="italic">{sugg.rationale}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs p-2 rounded bg-[var(--sm-paper)] border border-[var(--sm-hair)]">
            <div className="bg-red-500/10 text-red-700 p-1.5 rounded line-through">
              {sugg.originalText}
            </div>
            <div className="bg-green-500/10 text-green-700 p-1.5 rounded font-bold">
              {sugg.proposedText}
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-1">
            <button
              type="button"
              onClick={() => onReject(sugg.id)}
              className="px-2 py-1 text-[10px] border border-[var(--sm-hair)] text-[var(--sm-ink-mute)] hover:text-[var(--sm-ink)]"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={() => onApply(sugg)}
              className="px-3 py-1 text-[10px] font-bold bg-[var(--sm-ink)] text-[var(--sm-paper)] rounded hover:opacity-90 flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> Apply Diff
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
