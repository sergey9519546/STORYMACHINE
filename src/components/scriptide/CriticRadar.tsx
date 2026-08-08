import React from 'react';
import type { WritersRoomConsensus, CriticCategory } from '../../../server/critics/types';
import { ShieldAlert, CheckCircle } from 'lucide-react';

interface Props {
  consensus: WritersRoomConsensus;
}

export default function CriticRadar({ consensus }: Props) {
  const categories: Array<{ key: CriticCategory; label: string }> = [
    { key: 'pacing', label: 'Pacing' },
    { key: 'character', label: 'Character' },
    { key: 'dialogue', label: 'Dialogue' },
    { key: 'structure', label: 'Structure' },
    { key: 'brevity', label: 'Brevity' },
  ];

  return (
    <div className="sm-card border-[var(--sm-ink)] bg-[var(--sm-panel)] p-4 rounded font-mono text-[var(--sm-ink)]">
      <div className="flex justify-between items-center border-b border-[var(--sm-hair)] pb-2 mb-3">
        <div>
          <h3 className="font-bold text-xs uppercase tracking-wider">Writers' Room Consensus</h3>
          <p className="text-[10px] text-[var(--sm-ink-mute)]">Agreement: {consensus.agreementRate}%</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold font-display">{consensus.overallScore}</span>
          <span className="text-[10px] text-[var(--sm-ink-mute)]">/100</span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 text-center my-3">
        {categories.map(cat => {
          const score = consensus.categoryScores[cat.key] ?? 80;
          return (
            <div key={cat.key} className="p-2 rounded bg-[var(--sm-panel-2)] border border-[var(--sm-hair)]">
              <p className="text-[9px] uppercase tracking-wider text-[var(--sm-ink-mute)]">{cat.label}</p>
              <p className="text-sm font-bold mt-1">{score}</p>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-[var(--sm-ink-soft)] leading-relaxed mt-2">{consensus.consensusSummary}</p>
    </div>
  );
}
