import React from 'react';
import { MessageSquare, CheckCircle2, Clock } from 'lucide-react';

interface DebateEntry {
  turn: number;
  criticName: string;
  comment: string;
  resolved: boolean;
}

interface Props {
  timeline: DebateEntry[];
}

export default function DebateTimeline({ timeline }: Props) {
  if (!timeline.length) return null;

  return (
    <div className="sm-card border-[var(--sm-hair)] bg-[var(--sm-panel-2)] p-3 rounded font-mono text-xs my-3">
      <div className="flex items-center gap-2 border-b border-[var(--sm-hair)] pb-2 mb-2 font-bold text-[10px] uppercase tracking-wider text-[var(--sm-ink-mute)]">
        <MessageSquare className="w-3.5 h-3.5" />
        <span>Writers' Room Debate Timeline</span>
      </div>

      <div className="flex flex-col gap-2">
        {timeline.map((entry) => (
          <div key={entry.turn} className="flex items-start gap-2 text-xs">
            <span className="text-[10px] font-bold text-[var(--sm-ink-mute)]">#{entry.turn}</span>
            <div className="flex-1">
              <span className="font-bold text-[var(--sm-ink)]">{entry.criticName}: </span>
              <span className="text-[var(--sm-ink-soft)]">{entry.comment}</span>
            </div>
            {entry.resolved ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
