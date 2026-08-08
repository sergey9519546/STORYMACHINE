import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Download, Upload, Clock, ListFilter } from 'lucide-react';

export interface SimulationEventLog {
  turn: number;
  timestamp: string;
  charId: string;
  charName: string;
  actionType: string;
  payload: string;
  audible: boolean;
}

interface Props {
  events: SimulationEventLog[];
  onStepReplay?: (step: number) => void;
  onExportState?: () => void;
  onImportState?: (jsonText: string) => void;
}

export default function ReplayInspector({ events, onStepReplay, onExportState, onImportState }: Props) {
  const [currentTurn, setCurrentTurn] = useState<number>(events.length ? events[events.length - 1].turn : 0);
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const actionTypes = ['ALL', ...Array.from(new Set(events.map((e) => e.actionType)))];

  const filteredEvents = events.filter((e) => filterAction === 'ALL' || e.actionType === filterAction);

  return (
    <div className="sm-card border-[var(--sm-hair)] bg-[var(--sm-panel)] p-4 rounded font-mono text-xs text-[var(--sm-ink)] flex flex-col gap-3">
      <div className="flex justify-between items-center border-b border-[var(--sm-hair)] pb-2">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-400" />
          <h3 className="font-bold uppercase tracking-wider text-[11px]">Deterministic Replay & Event Log</h3>
        </div>

        <div className="flex items-center gap-2">
          {onExportState && (
            <button
              type="button"
              onClick={onExportState}
              className="px-2.5 py-1 rounded bg-[var(--sm-panel-2)] border border-[var(--sm-hair)] text-[10px] hover:text-[var(--sm-ink)] flex items-center gap-1"
            >
              <Download className="w-3 h-3" /> Export State
            </button>
          )}
        </div>
      </div>

      {/* Scrub Controls */}
      <div className="p-3 rounded bg-[var(--sm-panel-2)] border border-[var(--sm-hair)] flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            const next = Math.max(0, currentTurn - 1);
            setCurrentTurn(next);
            onStepReplay?.(next);
          }}
          className="px-2 py-1 rounded bg-[var(--sm-paper)] border border-[var(--sm-hair)] font-bold text-xs"
        >
          -1 Turn
        </button>

        <div className="flex-1 flex flex-col gap-1">
          <div className="flex justify-between text-[10px] text-[var(--sm-ink-mute)]">
            <span>Replay Scrub</span>
            <span>Turn {currentTurn} / {events.length}</span>
          </div>
          <input
            type="range"
            min={0}
            max={events.length}
            value={currentTurn}
            onChange={(e) => {
              const val = Number(e.target.value);
              setCurrentTurn(val);
              onStepReplay?.(val);
            }}
            className="w-full accent-[var(--sm-ink)] cursor-pointer"
          />
        </div>

        <button
          type="button"
          onClick={() => {
            const next = Math.min(events.length, currentTurn + 1);
            setCurrentTurn(next);
            onStepReplay?.(next);
          }}
          className="px-2 py-1 rounded bg-[var(--sm-paper)] border border-[var(--sm-hair)] font-bold text-xs"
        >
          +1 Turn
        </button>
      </div>

      {/* Action Type Filter */}
      <div className="flex items-center gap-2 text-[10px]">
        <ListFilter className="w-3.5 h-3.5 text-[var(--sm-ink-mute)]" />
        <span className="text-[var(--sm-ink-mute)]">Filter Action:</span>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="bg-[var(--sm-paper)] text-[var(--sm-ink)] border border-[var(--sm-hair)] rounded px-2 py-0.5"
        >
          {actionTypes.map((act) => (
            <option key={act} value={act}>
              {act}
            </option>
          ))}
        </select>
      </div>

      {/* Event Timeline Log */}
      <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5 p-2 rounded bg-[var(--sm-paper)] border border-[var(--sm-hair)]">
        {filteredEvents.length === 0 ? (
          <p className="text-[10px] text-[var(--sm-ink-mute)] italic p-2">No matching events logged.</p>
        ) : (
          filteredEvents.map((evt, idx) => (
            <div
              key={idx}
              className={`p-2 rounded border text-xs flex justify-between items-center gap-2 ${
                evt.turn <= currentTurn
                  ? 'bg-[var(--sm-panel-2)] border-[var(--sm-hair)] text-[var(--sm-ink)]'
                  : 'opacity-40 bg-transparent border-dashed border-[var(--sm-hair)] text-[var(--sm-ink-mute)]'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-[10px] text-[var(--sm-ink-mute)]">T{evt.turn}</span>
                <span className="font-bold text-xs">{evt.charName}</span>
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[9px] uppercase font-bold">
                  {evt.actionType}
                </span>
                <span className="text-xs text-[var(--sm-ink-soft)]">{evt.payload}</span>
              </div>

              {evt.audible && (
                <span className="text-[9px] px-1 bg-amber-500/20 text-amber-300 rounded">Audible</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
