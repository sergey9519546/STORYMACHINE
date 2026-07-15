import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, MessageSquare, Activity, Loader2, User } from 'lucide-react';
import { motion } from 'motion/react';
// The ScriptIDE character type (simpler than the full game Character in types.ts)
interface ScriptCharacter {
  id: string;
  name: string;
  ghost: string;
  lie: string;
  want: string;
  need: string;
}

interface AIPanelProps {
  script: string;
  characters: ScriptCharacter[];
  onApplySuggestion: (suggestion: string) => void;
}

export default function AIPanel({ script, characters, onApplySuggestion }: AIPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'world' | 'dialogue' | 'tension' | 'character'>('world');
  const [selectedChar, setSelectedChar] = useState<string>('');
  const [input, setInput] = useState('');
  
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const runPrompt = async (endpoint: string, payload: Record<string, unknown>) => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(`/api/scriptide/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json() as { result?: string; error?: string };
      if (!mountedRef.current) return;
      if (data.error) throw new Error(data.error);
      setResult(data.result ?? null);
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="sm-panel p-4">
        <h2 className="sm-title mb-4 border-b border-[var(--sm-ink)] pb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> Story Engine
        </h2>

        <div className="flex border-b border-[var(--sm-ink)] mb-4">
          <button
            onClick={() => setActiveTab('world')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'world' ? 'bg-[var(--sm-ink)] text-[var(--sm-cream)]' : 'bg-[var(--sm-panel)] text-[var(--sm-ink)] hover:bg-[var(--sm-panel-2)]'}`}
          >
            World
          </button>
          <button
            onClick={() => setActiveTab('dialogue')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors border-l border-[var(--sm-ink)] ${activeTab === 'dialogue' ? 'bg-[var(--sm-ink)] text-[var(--sm-cream)]' : 'bg-[var(--sm-panel)] text-[var(--sm-ink)] hover:bg-[var(--sm-panel-2)]'}`}
          >
            Dialogue
          </button>
          <button
            onClick={() => setActiveTab('tension')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors border-l border-[var(--sm-ink)] ${activeTab === 'tension' ? 'bg-[var(--sm-ink)] text-[var(--sm-cream)]' : 'bg-[var(--sm-panel)] text-[var(--sm-ink)] hover:bg-[var(--sm-panel-2)]'}`}
          >
            Tension
          </button>
          <button
            onClick={() => setActiveTab('character')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors border-l border-[var(--sm-ink)] ${activeTab === 'character' ? 'bg-[var(--sm-ink)] text-[var(--sm-cream)]' : 'bg-[var(--sm-panel)] text-[var(--sm-ink)] hover:bg-[var(--sm-panel-2)]'}`}
          >
            Character
          </button>
        </div>

        <div className="space-y-4">
          {activeTab === 'world' && (
            <>
              <p className="text-xs font-[family-name:var(--sm-font-mono)] text-[var(--sm-ink-mute)]">Generate a visceral scene description from a simple beat.</p>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="E.g., John enters the abandoned warehouse, looking for the stolen briefcase."
                className="w-full h-32 p-3 border border-[var(--sm-ink)] bg-[var(--sm-panel-2)] text-sm outline-none focus:border-[var(--sm-stamp)] resize-none font-[family-name:var(--sm-font-mono)]"
              />
              <button
                onClick={() => runPrompt('world-build', { beat: input, scriptContext: script, profiles: characters })}
                disabled={loading || !input}
                className="sm-btn sm-btn--ink w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate Scene
              </button>
            </>
          )}

          {activeTab === 'dialogue' && (
            <>
              <p className="text-xs font-[family-name:var(--sm-font-mono)] text-[var(--sm-ink-mute)]">Refine dialogue to add subtext and distinct character voices.</p>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste dialogue here to refine..."
                className="w-full h-32 p-3 border border-[var(--sm-ink)] bg-[var(--sm-panel-2)] text-sm outline-none focus:border-[var(--sm-stamp)] resize-none font-[family-name:var(--sm-font-mono)]"
              />
              <button
                onClick={() => runPrompt('refine-dialogue', { dialogue: input, profiles: characters, scriptContext: script })}
                disabled={loading || !input}
                className="sm-btn sm-btn--ink w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                Subtextify
              </button>
            </>
          )}

          {activeTab === 'tension' && (
            <>
              <p className="text-xs font-[family-name:var(--sm-font-mono)] text-[var(--sm-ink-mute)]">Analyze a scene for pacing, stakes, and psychological tension.</p>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste scene text here to analyze..."
                className="w-full h-32 p-3 border border-[var(--sm-ink)] bg-[var(--sm-panel-2)] text-sm outline-none focus:border-[var(--sm-stamp)] resize-none font-[family-name:var(--sm-font-mono)]"
              />
              <button
                onClick={() => runPrompt('analyze-tension', { scene: input, scriptContext: script, profiles: characters })}
                disabled={loading || !input}
                className="sm-btn sm-btn--ink w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                Analyze Tension
              </button>
            </>
          )}
          {activeTab === 'character' && (
            <>
              <p className="text-xs font-[family-name:var(--sm-font-mono)] text-[var(--sm-ink-mute)]">Generate a visceral physical description based on a character's psychological profile.</p>
              <select
                value={selectedChar}
                onChange={(e) => setSelectedChar(e.target.value)}
                className="w-full p-3 border border-[var(--sm-ink)] bg-[var(--sm-panel-2)] text-xs font-[family-name:var(--sm-font-mono)] outline-none focus:border-[var(--sm-stamp)]"
              >
                <option value="">Select a Character...</option>
                {characters.map((char, i) => (
                  <option key={i} value={char.name}>{char.name}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  const char = characters.find(c => c.name === selectedChar);
                  if (char) runPrompt('character-profile', { profile: char });
                }}
                disabled={loading || !selectedChar}
                className="sm-btn sm-btn--ink w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
                Generate Profile
              </button>
            </>
          )}
        </div>
      </div>

      {result && (
        <div className="sm-panel p-4">
          <h3 className="sm-title mb-2 text-[var(--sm-stamp)]">Result</h3>
          <div className="bg-[var(--sm-panel-2)] p-3 border border-[var(--sm-ink)] text-xs font-[family-name:var(--sm-font-mono)] whitespace-pre-wrap text-[var(--sm-ink)] max-h-64 overflow-y-auto">
            {result}
          </div>
          <button
            onClick={() => onApplySuggestion(result)}
            className="sm-btn sm-btn--stamp mt-4 w-full py-2"
          >
            Insert into Script
          </button>
        </div>
      )}
    </motion.div>
  );
}
