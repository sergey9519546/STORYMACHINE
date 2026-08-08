import React, { useState } from 'react';
import BeliefDriftGraph, { CharacterBeliefPoint } from './BeliefDriftGraph.tsx';
import SecretsMatrix, { SecretItem } from './SecretsMatrix.tsx';
import ReplayInspector, { SimulationEventLog } from './ReplayInspector.tsx';
import { Play, Sparkles, AlertCircle, ShieldAlert } from 'lucide-react';

interface Props {
  onIntervene?: (charId: string, customPrompt: string) => void;
}

export default function SimulationSandbox({ onIntervene }: Props) {
  const [beliefPoints, setBeliefPoints] = useState<CharacterBeliefPoint[]>([
    { turn: 1, charId: 'mara', charName: 'MARA', suspicionScore: 35, emotionalEntropy: 0.25, activeBelief: 'Eli is hiding money' },
    { turn: 2, charId: 'eli', charName: 'ELI', suspicionScore: 60, emotionalEntropy: 0.55, activeBelief: 'Mara knows about the ledger' },
    { turn: 3, charId: 'mara', charName: 'MARA', suspicionScore: 78, emotionalEntropy: 0.85, activeBelief: 'Eli destroyed the evidence' },
  ]);

  const [secrets, setSecrets] = useState<SecretItem[]>([
    { id: 'sec-1', fact: 'Keeps off-shore account ledger under desk floorboard', holderCharName: 'ELI', targetCharName: 'MARA', isRevealed: false, dramaticTensionScore: 92 },
    { id: 'sec-2', fact: 'Contacted the federal prosecutor yesterday', holderCharName: 'MARA', targetCharName: 'ELI', isRevealed: true, dramaticTensionScore: 84 },
  ]);

  const [events, setEvents] = useState<SimulationEventLog[]>([
    { turn: 1, timestamp: '10:00', charId: 'mara', charName: 'MARA', actionType: 'SPEAK', payload: 'Where were you last night?', audible: true },
    { turn: 2, timestamp: '10:01', charId: 'eli', charName: 'ELI', actionType: 'LIE', payload: 'Working late at the office.', audible: true },
    { turn: 3, timestamp: '10:02', charId: 'mara', charName: 'MARA', actionType: 'EXAMINE', payload: 'Notices mud on Eli\'s boots.', audible: false },
  ]);

  const [interveneTarget, setInterveneTarget] = useState<string>('mara');
  const [intervenePrompt, setIntervenePrompt] = useState<string>('');

  const handleTriggerIntervention = () => {
    if (!intervenePrompt.trim()) return;
    onIntervene?.(interveneTarget, intervenePrompt);

    // Append mock event for deterministic live feedback
    const newTurn = events.length + 1;
    setEvents((prev) => [
      ...prev,
      {
        turn: newTurn,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        charId: interveneTarget,
        charName: interveneTarget.toUpperCase(),
        actionType: 'INTERVENE',
        payload: `Writer directive: ${intervenePrompt}`,
        audible: true,
      },
    ]);

    setIntervenePrompt('');
  };

  return (
    <div className="flex flex-col gap-4 font-mono text-xs text-[var(--sm-ink)]">
      <div className="sm-card border-[var(--sm-hair)] bg-[var(--sm-panel)] p-4 rounded flex justify-between items-center">
        <div>
          <h2 className="font-bold text-sm uppercase tracking-wider">OASIS World Model & Agent Simulation</h2>
          <p className="text-[11px] text-[var(--sm-ink-mute)]">Multi-character probabilistic sandbox & live intervention engine</p>
        </div>
        <div className="px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 font-bold text-[10px] border border-purple-500/30 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" /> OASIS Active
        </div>
      </div>

      {/* Writer Intervention Bar */}
      <div className="p-3 rounded bg-[var(--sm-panel-2)] border border-[var(--sm-hair)] flex items-center gap-2">
        <span className="font-bold text-[10px] uppercase text-[var(--sm-ink-mute)] shrink-0">Intervene:</span>
        <select
          value={interveneTarget}
          onChange={(e) => setInterveneTarget(e.target.value)}
          className="bg-[var(--sm-paper)] text-[var(--sm-ink)] border border-[var(--sm-hair)] rounded px-2 py-1 text-xs shrink-0"
        >
          <option value="mara">MARA</option>
          <option value="eli">ELI</option>
        </select>
        <input
          type="text"
          value={intervenePrompt}
          onChange={(e) => setIntervenePrompt(e.target.value)}
          placeholder="Inject character impulse or directive (e.g. Confront about the ledger)..."
          className="flex-1 bg-[var(--sm-paper)] text-[var(--sm-ink)] border border-[var(--sm-hair)] rounded px-3 py-1 text-xs"
        />
        <button
          type="button"
          onClick={handleTriggerIntervention}
          className="px-3 py-1 rounded bg-[var(--sm-ink)] text-[var(--sm-paper)] font-bold text-xs hover:opacity-90 shrink-0"
        >
          Inject Directive
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <BeliefDriftGraph dataPoints={beliefPoints} />
        <SecretsMatrix
          secrets={secrets}
          onToggleReveal={(id) =>
            setSecrets((prev) => prev.map((s) => (s.id === id ? { ...s, isRevealed: !s.isRevealed } : s)))
          }
        />
      </div>

      <ReplayInspector events={events} />
    </div>
  );
}
