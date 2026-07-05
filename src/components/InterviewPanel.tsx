// Character Interview Panel — talk to a character directly. Every answer is
// grounded in the character's real simulated psychology, and the receipts
// (beliefs, emotion, defense, attachment, speech pattern, goals) are shown
// beside every exchange so the interview is never a black box.
//
// Style idiom: dark-purple Tailwind overlay (matches WhatIfPanel.tsx /
// DirectorCutPanel.tsx) — self-contained fixed inset-0 backdrop, [#1a1a2e]
// card, purple/gray accents. Chosen over ConvergePanel's terminal idiom
// because this panel is a two-column chat + inspector surface, not a
// dashboard of tabular results — the WhatIf/DirectorCut idiom already
// establishes the "chat-adjacent form + card list" shape this needs.
//
// Keyless-honesty: the /api/game/interview contract (built in parallel) can
// return `usedLLM: false` with a `note` explaining why, and still ships full
// `receipts`. This panel treats that as first-class: the receipts card is
// the differentiator, not a fallback. The route itself may not exist yet
// (404) — handled as a distinct, honest empty state rather than a generic
// error.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import type { CharacterSheet } from '../../server/engine/types';

// ── Server contract types (server/routes not yet built — feature-detect all
// optional fields; nothing here assumes a field is present). ────────────────

interface InterviewReceipts {
  beliefs?: Array<{ proposition: string; confidence: number }>;
  emotion?: { dominant: string; intensity: number };
  defense?: string;
  attachment?: string;
  speechPattern?: string;
  goals?: string[];
  relationshipsInPlay?: Array<{ withCharId?: string; withName?: string; [k: string]: unknown }>;
}

interface InterviewResponse {
  answer?: string;
  receipts?: InterviewReceipts;
  usedLLM?: boolean;
  note?: string;
}

interface HistoryEntry { role: 'user' | 'character'; text: string; }

interface ChatMessage {
  id: string;
  role: 'user' | 'character';
  text: string;
  receipts?: InterviewReceipts;
  usedLLM?: boolean;
  note?: string;
  status: 'done' | 'loading' | 'error' | 'not-found';
  errorMessage?: string;
}

interface InterviewPanelProps {
  onClose: () => void;
  agents: CharacterSheet[];
}

const HISTORY_CAP = 20;

function uid(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── Small display helpers ───────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex-1 bg-[#111] rounded-full h-1.5 overflow-hidden">
        <div className="h-full bg-purple-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-500 font-mono w-8 text-right">{pct}%</span>
    </div>
  );
}

// The receipts card — the differentiator. Renders whatever fields are present
// (server contract is optional-tolerant), and never hides itself just because
// generation is keyless — psychology inspection works with or without an AI key.
function ReceiptsCard({ receipts, usedLLM, note }: { receipts?: InterviewReceipts; usedLLM?: boolean; note?: string }) {
  const [open, setOpen] = useState(false);
  if (!receipts) return null;

  const hasBeliefs = (receipts.beliefs?.length ?? 0) > 0;
  const hasGoals = (receipts.goals?.length ?? 0) > 0;
  const hasRelationships = (receipts.relationshipsInPlay?.length ?? 0) > 0;

  return (
    <div className="mt-2 border border-[#333] rounded-lg bg-[#14141f] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[#1a1a2e] transition-colors"
      >
        <span className="text-purple-300 text-xs font-medium flex items-center gap-1.5">
          Why they said this
          {usedLLM === false && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-900/40 text-yellow-300 font-normal">
              receipts-only
            </span>
          )}
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 text-xs">
          {note && (
            <p className="text-yellow-300/90 text-[11px] bg-yellow-900/10 border border-yellow-800/40 rounded px-2 py-1.5">
              {note}
            </p>
          )}

          {receipts.emotion && (
            <div>
              <div className="text-gray-500 text-[10px] uppercase tracking-wide mb-1">Dominant emotion</div>
              <div className="flex items-center gap-2">
                <span className="text-pink-300 font-medium">{receipts.emotion.dominant}</span>
                <span className="text-gray-500">·</span>
                <span className="text-gray-400">{receipts.emotion.intensity}/100</span>
              </div>
            </div>
          )}

          {(receipts.defense || receipts.attachment || receipts.speechPattern) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {receipts.defense && (
                <div>
                  <div className="text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">Defense</div>
                  <div className="text-blue-300">{receipts.defense}</div>
                </div>
              )}
              {receipts.attachment && (
                <div>
                  <div className="text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">Attachment</div>
                  <div className="text-teal-300">{receipts.attachment}</div>
                </div>
              )}
              {receipts.speechPattern && (
                <div>
                  <div className="text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">Speech pattern</div>
                  <div className="text-orange-300">{receipts.speechPattern}</div>
                </div>
              )}
            </div>
          )}

          {hasBeliefs && (
            <div>
              <div className="text-gray-500 text-[10px] uppercase tracking-wide mb-1.5">Beliefs cited</div>
              <div className="space-y-1.5">
                {receipts.beliefs!.map((b, i) => (
                  <div key={i}>
                    <div className="text-gray-300 mb-0.5">{b.proposition}</div>
                    <ConfidenceBar value={b.confidence} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasGoals && (
            <div>
              <div className="text-gray-500 text-[10px] uppercase tracking-wide mb-1">Live goals</div>
              <ul className="space-y-0.5">
                {receipts.goals!.map((g, i) => (
                  <li key={i} className="text-green-300 flex items-start gap-1.5">
                    <span className="text-gray-600 mt-0.5">▸</span><span>{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {hasRelationships && (
            <div>
              <div className="text-gray-500 text-[10px] uppercase tracking-wide mb-1">Relationships in play</div>
              <div className="flex flex-wrap gap-1.5">
                {receipts.relationshipsInPlay!.map((r, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-[#222] text-gray-300">
                    {r.withName ?? r.withCharId ?? 'unknown'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {!hasBeliefs && !receipts.emotion && !receipts.defense && !receipts.attachment &&
            !receipts.speechPattern && !hasGoals && !hasRelationships && (
            <p className="text-gray-500 italic">No receipts reported for this exchange.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function InterviewPanel({ onClose, agents }: InterviewPanelProps) {
  const [selectedId, setSelectedId] = useState<string>(agents[0]?.char_id ?? '');
  const [messagesByAgent, setMessagesByAgent] = useState<Record<string, ChatMessage[]>>({});
  const [question, setQuestion] = useState('');
  const [inFlight, setInFlight] = useState(false);
  const [routeMissing, setRouteMissing] = useState(false);
  const [llmReady, setLlmReady] = useState<boolean | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => {
    mountedRef.current = false;
    abortRef.current?.abort();
  }, []);

  // Reuse the /api/ai-config llmReady check (same endpoint/shape as
  // SettingsPanel/ScriptIDE) so the keyless banner is accurate on open,
  // independent of whether StoryMachine's own check has resolved yet.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/ai-config')
      .then(r => (r.ok ? r.json() : null))
      .then((data: { llmReady?: boolean } | null) => {
        if (!cancelled && data && typeof data.llmReady === 'boolean') setLlmReady(data.llmReady);
      })
      .catch(() => { /* non-critical — banner just stays hidden */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messagesByAgent, selectedId]);

  const selectedAgent = agents.find(a => a.char_id === selectedId);
  const messages = messagesByAgent[selectedId] ?? [];

  const send = useCallback(async () => {
    const q = question.trim();
    if (!q || !selectedAgent || inFlight) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const userMsg: ChatMessage = { id: uid(), role: 'user', text: q, status: 'done' };
    const pendingId = uid();
    const pendingMsg: ChatMessage = { id: pendingId, role: 'character', text: '', status: 'loading' };

    setMessagesByAgent(prev => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] ?? []), userMsg, pendingMsg],
    }));
    setQuestion('');
    setInFlight(true);
    setRouteMissing(false);

    // Rolling history, capped client-side at 20 entries (oldest dropped first),
    // built from this agent's own prior turns only.
    const priorHistory: HistoryEntry[] = (messagesByAgent[selectedId] ?? [])
      .filter(m => m.status === 'done')
      .map(m => ({ role: m.role, text: m.text }))
      .slice(-HISTORY_CAP);

    try {
      const res = await fetch('/api/game/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName: selectedAgent.name, question: q, history: priorHistory }),
        signal: controller.signal,
      });

      if (res.status === 404) {
        if (!mountedRef.current) return;
        setRouteMissing(true);
        setMessagesByAgent(prev => ({
          ...prev,
          [selectedId]: (prev[selectedId] ?? []).map(m =>
            m.id === pendingId
              ? { ...m, status: 'not-found', errorMessage: `${selectedAgent.name} isn't known to the interview route (or the route isn't live yet).` }
              : m
          ),
        }));
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(body.error ?? `Interview failed (${res.status})`);
      }

      const data = await res.json() as InterviewResponse;
      if (!mountedRef.current) return;

      setMessagesByAgent(prev => ({
        ...prev,
        [selectedId]: (prev[selectedId] ?? []).map(m =>
          m.id === pendingId
            ? {
                ...m,
                status: 'done',
                text: data.answer ?? '',
                receipts: data.receipts,
                usedLLM: data.usedLLM,
                note: data.note,
              }
            : m
        ),
      }));
    } catch (e) {
      if (controller.signal.aborted || !mountedRef.current) return;
      setMessagesByAgent(prev => ({
        ...prev,
        [selectedId]: (prev[selectedId] ?? []).map(m =>
          m.id === pendingId
            ? { ...m, status: 'error', errorMessage: e instanceof Error ? e.message : 'Interview request failed.' }
            : m
        ),
      }));
    } finally {
      if (mountedRef.current) setInFlight(false);
    }
  }, [question, selectedAgent, selectedId, inFlight, messagesByAgent]);

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#1a1a2e] border border-[#333] rounded-xl w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#333]">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-purple-400" />
            <h2 className="text-white font-semibold text-lg">Character Interview</h2>
            <span className="text-xs text-gray-500 ml-2">psychology, grounded and receipted</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {llmReady === false && (
          <div className="mx-5 mt-3 flex items-start gap-2 bg-yellow-900/20 border border-yellow-800/50 rounded-lg px-3 py-2 text-[11px] text-yellow-300">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>No AI key configured — add one to hear the character speak. Their beliefs, emotion, and goals still show up as receipts below.</span>
          </div>
        )}

        {agents.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-gray-500 text-sm text-center">no characters yet — build a scenario first</p>
          </div>
        ) : (
          <>
            {/* Agent picker */}
            <div className="px-5 pt-3 flex items-center gap-2 flex-wrap border-b border-[#333] pb-3">
              {agents.map(a => (
                <button
                  key={a.char_id}
                  onClick={() => setSelectedId(a.char_id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    selectedId === a.char_id
                      ? 'border-purple-500 bg-purple-900/30 text-purple-200'
                      : 'border-[#333] text-gray-400 hover:border-[#555] hover:text-gray-200'
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>

            {/* Chat surface */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {messages.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">
                  Ask {selectedAgent?.name ?? 'them'} something. Their answer — and why they gave it — will show up here.
                </p>
              )}
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div
                      className={`rounded-lg px-3 py-2 text-sm ${
                        m.role === 'user'
                          ? 'bg-purple-700/40 text-purple-50'
                          : m.status === 'error' || m.status === 'not-found'
                          ? 'bg-red-900/20 border border-red-800/50 text-red-300'
                          : 'bg-[#111] text-gray-200'
                      }`}
                    >
                      {m.status === 'loading' && (
                        <span className="text-gray-500 italic flex items-center gap-1">
                          <span className="animate-pulse">{selectedAgent?.name ?? 'Character'} is thinking…</span>
                        </span>
                      )}
                      {m.status === 'error' && <span>{m.errorMessage ?? 'Something went wrong.'}</span>}
                      {m.status === 'not-found' && <span>{m.errorMessage}</span>}
                      {m.status === 'done' && (
                        m.role === 'character' && !m.text
                          ? <span className="text-gray-500 italic">(no spoken answer — see receipts below)</span>
                          : <span className="whitespace-pre-wrap">{m.text}</span>
                      )}
                    </div>
                    {m.role === 'character' && m.status === 'done' && (
                      <div className="w-full">
                        <ReceiptsCard receipts={m.receipts} usedLLM={m.usedLLM} note={m.note} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {routeMissing && (
                <p className="text-[11px] text-gray-500 text-center">
                  The interview endpoint isn't available yet — this will start working once the server route ships.
                </p>
              )}
            </div>

            {/* Input */}
            <div className="px-5 pb-5 pt-2 border-t border-[#333] flex items-center gap-2">
              <input
                type="text"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                disabled={inFlight}
                placeholder={selectedAgent ? `Ask ${selectedAgent.name} a question…` : 'Select a character first'}
                className="flex-1 bg-[#111] border border-[#333] rounded px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500 disabled:opacity-50"
              />
              <button
                onClick={send}
                disabled={inFlight || !question.trim() || !selectedAgent}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm px-4 py-2 rounded font-medium transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                {inFlight ? '…' : 'Ask'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
