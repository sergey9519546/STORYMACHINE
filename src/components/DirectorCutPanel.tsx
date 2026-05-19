// Director's Cut Panel — Writer Cockpit: inject custom StoryOps into the canon
// mid-simulation. The writer pauses the AI-driven sim and authors one or more
// ops directly — a narrative directive that becomes a user_authored StoryCommit.
// This is how the director's vision overrides the emergent story without
// breaking the NVM proof chain.

import React, { useState } from 'react';
import { Scissors, Plus, X, Check, AlertCircle } from 'lucide-react';

type OpKind =
  | 'UPDATE_BELIEF'
  | 'APPRAISE_EMOTION'
  | 'SHIFT_RELATIONSHIP'
  | 'ADVANCE_THEME_ARGUMENT'
  | 'ADD_FACT'
  | 'SEED_CLUE'
  | 'RAISE_CLOCK';

interface DirectorCutPanelProps {
  onClose: () => void;
  onInjected?: (commitId: string) => void;
}

const OP_META: Record<OpKind, { label: string; description: string; color: string }> = {
  UPDATE_BELIEF:          { label: 'Belief Update', description: 'Plant or shift what a character believes', color: 'blue' },
  APPRAISE_EMOTION:       { label: 'Emotion', description: "Set a character's emotional state", color: 'pink' },
  SHIFT_RELATIONSHIP:     { label: 'Relationship', description: "Alter the bond between two characters", color: 'purple' },
  ADVANCE_THEME_ARGUMENT: { label: 'Theme', description: 'Push the story\'s thematic argument', color: 'yellow' },
  ADD_FACT:               { label: 'World Fact', description: 'Assert an objective truth in the story world', color: 'green' },
  SEED_CLUE:              { label: 'Seed Clue', description: 'Plant a mystery clue for the audience', color: 'orange' },
  RAISE_CLOCK:            { label: 'Raise Clock', description: 'Tick a dramatic deadline forward', color: 'red' },
};

const EMOTION_TYPES = ['joy', 'distress', 'anger', 'fear', 'pride', 'shame'];
const THEME_MOVES = ['support', 'attack', 'undercut', 'complicate', 'resolve'];
const CLUE_CARRIERS = ['object', 'line', 'gesture', 'location', 'absence', 'behavior', 'camera', 'sound'];
const REL_DIMENSIONS = ['love', 'trust', 'intimacy', 'admiration', 'resentment', 'fear', 'contempt', 'guilt', 'obligation', 'dependency'];

function buildOp(kind: OpKind, fields: Record<string, string>): unknown {
  switch (kind) {
    case 'UPDATE_BELIEF': return {
      op: 'UPDATE_BELIEF',
      charId: fields.charId ?? 'char_1',
      belief: {
        id: `b_cut_${Date.now()}`,
        proposition: fields.proposition ?? '',
        confidence: parseFloat(fields.confidence ?? '0.8'),
        source: (fields.source ?? 'witnessed') as 'witnessed' | 'told' | 'inferred',
        source_event_id: `cut_${Date.now()}`,
        acquired_at: Date.now(),
      },
    };
    case 'APPRAISE_EMOTION': {
      const dominant = fields.dominant ?? 'distress';
      const intensity = parseInt(fields.intensity ?? '70');
      const emo = { joy: 0, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0 };
      if (dominant in emo) (emo as Record<string, number>)[dominant] = intensity;
      return {
        op: 'APPRAISE_EMOTION',
        charId: fields.charId ?? 'char_1',
        emotion: { ...emo, dominant, intensity, last_updated_at: Date.now() },
      };
    }
    case 'SHIFT_RELATIONSHIP': return {
      op: 'SHIFT_RELATIONSHIP',
      pair: [fields.charA ?? 'char_1', fields.charB ?? 'char_2'],
      delta: {
        dimension: fields.dimension ?? 'trust',
        amount: parseFloat(fields.amount ?? '0.3'),
        reason: fields.reason ?? '',
      },
    };
    case 'ADVANCE_THEME_ARGUMENT': return {
      op: 'ADVANCE_THEME_ARGUMENT',
      claimId: fields.claimId ?? 'main_theme',
      move: fields.move ?? 'support',
    };
    case 'ADD_FACT': return {
      op: 'ADD_FACT',
      fact: {
        factId: `fact_cut_${Date.now()}`,
        subject: fields.subject ?? '',
        predicate: fields.predicate ?? '',
        object: fields.object ?? '',
        addedAtTurn: 0,
        validFrom: 0,
        validTo: null,
      },
    };
    case 'SEED_CLUE': return {
      op: 'SEED_CLUE',
      clueId: `clue_cut_${Date.now()}`,
      carrier: fields.carrier ?? 'object',
    };
    case 'RAISE_CLOCK': return {
      op: 'RAISE_CLOCK',
      clockId: fields.clockId ?? 'main_clock',
      amount: parseInt(fields.amount ?? '1'),
    };
  }
}

export default function DirectorCutPanel({ onClose, onInjected }: DirectorCutPanelProps) {
  const [selectedOp, setSelectedOp] = useState<OpKind>('UPDATE_BELIEF');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [label, setLabel] = useState('director_cut');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ commitId: string; newStateHash: string; ops: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setField = (k: string, v: string) => setFields(f => ({ ...f, [k]: v }));

  const inject = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const op = buildOp(selectedOp, fields);
      const res = await fetch('/api/nvm/inject-ops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ops: [op], label }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { commitId: string; newStateHash: string; ops: number };
      setResult(data);
      onInjected?.(data.commitId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const colorClass = (c: string) => ({
    blue: 'border-blue-500 bg-blue-900/20 text-blue-300',
    pink: 'border-pink-500 bg-pink-900/20 text-pink-300',
    purple: 'border-purple-500 bg-purple-900/20 text-purple-300',
    yellow: 'border-yellow-500 bg-yellow-900/20 text-yellow-300',
    green: 'border-green-500 bg-green-900/20 text-green-300',
    orange: 'border-orange-500 bg-orange-900/20 text-orange-300',
    red: 'border-red-500 bg-red-900/20 text-red-300',
  }[c] ?? 'border-gray-500');

  const inp = (className = '') =>
    `bg-[#111] border border-[#333] rounded px-2 py-1 text-white text-xs font-mono placeholder-gray-600 focus:outline-none focus:border-purple-500 ${className}`;

  const sel = (className = '') =>
    `bg-[#111] border border-[#333] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-purple-500 ${className}`;

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#1a1a2e] border border-[#333] rounded-xl w-full max-w-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#333]">
          <div className="flex items-center gap-2">
            <Scissors className="w-5 h-5 text-yellow-400" />
            <h2 className="text-white font-semibold text-lg">Director's Cut</h2>
            <span className="text-xs text-gray-500 ml-2">inject custom StoryOps mid-sim</span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Op type selector */}
          <div>
            <label className="text-gray-400 text-xs font-medium block mb-2">Op Type</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {(Object.keys(OP_META) as OpKind[]).map(k => (
                <button
                  key={k}
                  onClick={() => { setSelectedOp(k); setFields({}); }}
                  className={`text-left rounded-lg border p-2 transition-all text-xs ${
                    selectedOp === k ? colorClass(OP_META[k].color) : 'border-[#333] text-gray-500 hover:border-[#555]'
                  }`}
                >
                  <div className="font-medium">{OP_META[k].label}</div>
                </button>
              ))}
            </div>
            <p className="text-gray-500 text-xs mt-1">{OP_META[selectedOp].description}</p>
          </div>

          {/* Op-specific fields */}
          <div className="space-y-2">
            {selectedOp === 'UPDATE_BELIEF' && (
              <>
                <div className="flex gap-2">
                  <div className="flex-1"><label className="text-gray-500 text-xs">Character ID</label><input className={inp('w-full mt-0.5')} value={fields.charId ?? ''} onChange={e => setField('charId', e.target.value)} placeholder="char_1" /></div>
                  <div className="w-28"><label className="text-gray-500 text-xs">Confidence</label><input className={inp('w-full mt-0.5')} value={fields.confidence ?? ''} onChange={e => setField('confidence', e.target.value)} placeholder="0.8" type="number" min="0" max="1" step="0.1" /></div>
                </div>
                <div><label className="text-gray-500 text-xs">Proposition</label><input className={inp('w-full mt-0.5')} value={fields.proposition ?? ''} onChange={e => setField('proposition', e.target.value)} placeholder="Character believes that…" /></div>
                <div className="flex gap-2">
                  <div className="flex-1"><label className="text-gray-500 text-xs">Source</label>
                    <select className={sel('w-full mt-0.5')} value={fields.source ?? 'witnessed'} onChange={e => setField('source', e.target.value)}>
                      <option value="witnessed">witnessed</option><option value="told">told</option><option value="inferred">inferred</option>
                    </select>
                  </div>
                </div>
              </>
            )}

            {selectedOp === 'APPRAISE_EMOTION' && (
              <div className="flex gap-2">
                <div className="flex-1"><label className="text-gray-500 text-xs">Character ID</label><input className={inp('w-full mt-0.5')} value={fields.charId ?? ''} onChange={e => setField('charId', e.target.value)} placeholder="char_1" /></div>
                <div className="flex-1"><label className="text-gray-500 text-xs">Emotion</label>
                  <select className={sel('w-full mt-0.5')} value={fields.dominant ?? 'distress'} onChange={e => setField('dominant', e.target.value)}>
                    {EMOTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="w-24"><label className="text-gray-500 text-xs">Intensity 0–100</label><input className={inp('w-full mt-0.5')} value={fields.intensity ?? ''} onChange={e => setField('intensity', e.target.value)} placeholder="70" type="number" min="0" max="100" /></div>
              </div>
            )}

            {selectedOp === 'SHIFT_RELATIONSHIP' && (
              <>
                <div className="flex gap-2">
                  <div className="flex-1"><label className="text-gray-500 text-xs">Character A</label><input className={inp('w-full mt-0.5')} value={fields.charA ?? ''} onChange={e => setField('charA', e.target.value)} placeholder="char_1" /></div>
                  <div className="flex-1"><label className="text-gray-500 text-xs">Character B</label><input className={inp('w-full mt-0.5')} value={fields.charB ?? ''} onChange={e => setField('charB', e.target.value)} placeholder="char_2" /></div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1"><label className="text-gray-500 text-xs">Dimension</label>
                    <select className={sel('w-full mt-0.5')} value={fields.dimension ?? 'trust'} onChange={e => setField('dimension', e.target.value)}>
                      {REL_DIMENSIONS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="w-28"><label className="text-gray-500 text-xs">Amount -1…1</label><input className={inp('w-full mt-0.5')} value={fields.amount ?? ''} onChange={e => setField('amount', e.target.value)} placeholder="0.3" type="number" min="-1" max="1" step="0.1" /></div>
                </div>
                <div><label className="text-gray-500 text-xs">Reason</label><input className={inp('w-full mt-0.5')} value={fields.reason ?? ''} onChange={e => setField('reason', e.target.value)} placeholder="why this shift happened" /></div>
              </>
            )}

            {selectedOp === 'ADVANCE_THEME_ARGUMENT' && (
              <div className="flex gap-2">
                <div className="flex-1"><label className="text-gray-500 text-xs">Claim ID</label><input className={inp('w-full mt-0.5')} value={fields.claimId ?? ''} onChange={e => setField('claimId', e.target.value)} placeholder="main_theme" /></div>
                <div className="w-36"><label className="text-gray-500 text-xs">Move</label>
                  <select className={sel('w-full mt-0.5')} value={fields.move ?? 'support'} onChange={e => setField('move', e.target.value)}>
                    {THEME_MOVES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            )}

            {selectedOp === 'ADD_FACT' && (
              <div className="flex gap-2">
                <div className="flex-1"><label className="text-gray-500 text-xs">Subject</label><input className={inp('w-full mt-0.5')} value={fields.subject ?? ''} onChange={e => setField('subject', e.target.value)} placeholder="krogstad" /></div>
                <div className="flex-1"><label className="text-gray-500 text-xs">Predicate</label><input className={inp('w-full mt-0.5')} value={fields.predicate ?? ''} onChange={e => setField('predicate', e.target.value)} placeholder="forged" /></div>
                <div className="flex-1"><label className="text-gray-500 text-xs">Object</label><input className={inp('w-full mt-0.5')} value={fields.object ?? ''} onChange={e => setField('object', e.target.value)} placeholder="the document" /></div>
              </div>
            )}

            {selectedOp === 'SEED_CLUE' && (
              <div className="flex gap-2">
                <div className="flex-1"><label className="text-gray-500 text-xs">Carrier</label>
                  <select className={sel('w-full mt-0.5')} value={fields.carrier ?? 'object'} onChange={e => setField('carrier', e.target.value)}>
                    {CLUE_CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            )}

            {selectedOp === 'RAISE_CLOCK' && (
              <div className="flex gap-2">
                <div className="flex-1"><label className="text-gray-500 text-xs">Clock ID</label><input className={inp('w-full mt-0.5')} value={fields.clockId ?? ''} onChange={e => setField('clockId', e.target.value)} placeholder="main_clock" /></div>
                <div className="w-28"><label className="text-gray-500 text-xs">Amount</label><input className={inp('w-full mt-0.5')} value={fields.amount ?? ''} onChange={e => setField('amount', e.target.value)} placeholder="1" type="number" min="1" /></div>
              </div>
            )}
          </div>

          {/* Label */}
          <div>
            <label className="text-gray-400 text-xs font-medium">Commit label (optional)</label>
            <input className={inp('w-full mt-0.5')} value={label} onChange={e => setLabel(e.target.value)} placeholder="director_cut" />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={inject}
              disabled={loading}
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black font-bold px-4 py-2 rounded text-sm transition-colors"
            >
              <Scissors className="w-4 h-4" />
              {loading ? 'Injecting…' : 'Inject Op'}
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-sm transition-colors">Cancel</button>
          </div>

          {/* Result */}
          {result && (
            <div className="flex items-start gap-2 bg-green-900/20 border border-green-700 rounded-lg p-3 text-xs">
              <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
              <div>
                <div className="text-green-300 font-medium mb-0.5">Op injected as StoryCommit</div>
                <div className="text-gray-400 font-mono">ID: {result.commitId}</div>
                <div className="text-gray-400 font-mono">State hash: {result.newStateHash}</div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-red-900/20 border border-red-700 rounded-lg p-3 text-xs">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-300">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
