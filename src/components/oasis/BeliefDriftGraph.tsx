import React from 'react';
import { TrendingUp, Activity, Brain } from 'lucide-react';

export interface CharacterBeliefPoint {
  turn: number;
  charId: string;
  charName: string;
  suspicionScore: number;
  emotionalEntropy: number; // 0 (calm) to 1.0 (volatile)
  activeBelief: string;
}

interface Props {
  dataPoints: CharacterBeliefPoint[];
}

export default function BeliefDriftGraph({ dataPoints }: Props) {
  if (!dataPoints.length) {
    return (
      <div className="p-4 rounded border border-[var(--sm-hair)] bg-[var(--sm-panel-2)] text-xs text-[var(--sm-ink-mute)] font-mono italic">
        No simulation belief drift data points recorded yet.
      </div>
    );
  }

  // Group by character
  const characters = Array.from(new Set(dataPoints.map((d) => d.charName)));

  return (
    <div className="sm-card border-[var(--sm-hair)] bg-[var(--sm-panel)] p-4 rounded font-mono text-xs text-[var(--sm-ink)] flex flex-col gap-3">
      <div className="flex justify-between items-center border-b border-[var(--sm-hair)] pb-2">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <h3 className="font-bold uppercase tracking-wider text-[11px]">Belief Drift & Emotional Entropy Graph</h3>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-[var(--sm-ink-mute)]">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Suspicion
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> Entropy
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 my-1">
        {characters.map((charName) => {
          const charPoints = dataPoints.filter((d) => d.charName === charName);
          const latest = charPoints[charPoints.length - 1];

          return (
            <div key={charName} className="p-3 rounded bg-[var(--sm-panel-2)] border border-[var(--sm-hair)]">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-xs">{charName}</span>
                <span className="text-[10px] text-[var(--sm-ink-mute)]">
                  Latest: "{latest?.activeBelief ?? 'Neutral'}"
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-2">
                <div>
                  <div className="flex justify-between text-[10px] text-[var(--sm-ink-mute)] mb-1">
                    <span>Suspicion</span>
                    <span>{latest?.suspicionScore ?? 0}/100</span>
                  </div>
                  <div className="w-full bg-[var(--sm-paper)] h-2 rounded overflow-hidden border border-[var(--sm-hair)]">
                    <div
                      className="bg-amber-400 h-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, latest?.suspicionScore ?? 0))}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[10px] text-[var(--sm-ink-mute)] mb-1">
                    <span>Emotional Entropy</span>
                    <span>{Math.round((latest?.emotionalEntropy ?? 0) * 100)}%</span>
                  </div>
                  <div className="w-full bg-[var(--sm-paper)] h-2 rounded overflow-hidden border border-[var(--sm-hair)]">
                    <div
                      className="bg-rose-400 h-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, (latest?.emotionalEntropy ?? 0) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
