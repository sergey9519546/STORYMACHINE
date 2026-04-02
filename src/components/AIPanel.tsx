import React, { useState } from 'react';
import { Sparkles, MessageSquare, Activity, Loader2, User } from 'lucide-react';
import { motion } from 'motion/react';

interface AIPanelProps {
  script: string;
  characters: any[];
  onApplySuggestion: (suggestion: string) => void;
}

export default function AIPanel({ script, characters, onApplySuggestion }: AIPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'world' | 'dialogue' | 'tension' | 'character'>('world');
  const [selectedChar, setSelectedChar] = useState<string>('');
  const [input, setInput] = useState('');

  const runPrompt = async (endpoint: string, payload: any) => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(`/api/scriptide/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setResult(data.result);
    } catch (err: any) {
      setResult(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="bg-white border-4 border-black p-4 brutal-shadow">
        <h2 className="font-bold uppercase tracking-widest text-xs mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> Story Engine
        </h2>
        
        <div className="flex border-b-2 border-black mb-4">
          <button 
            onClick={() => setActiveTab('world')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${activeTab === 'world' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
          >
            World
          </button>
          <button 
            onClick={() => setActiveTab('dialogue')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors border-l-2 border-black ${activeTab === 'dialogue' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
          >
            Dialogue
          </button>
          <button 
            onClick={() => setActiveTab('tension')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors border-l-2 border-black ${activeTab === 'tension' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
          >
            Tension
          </button>
          <button 
            onClick={() => setActiveTab('character')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors border-l-2 border-black ${activeTab === 'character' ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
          >
            Character
          </button>
        </div>

        <div className="space-y-4">
          {activeTab === 'world' && (
            <>
              <p className="text-xs font-mono text-gray-600">Generate a visceral scene description from a simple beat.</p>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="E.g., John enters the abandoned warehouse, looking for the stolen briefcase."
                className="w-full h-32 p-3 border-2 border-black bg-gray-50 text-sm outline-none focus:border-[#FF4444] resize-none font-mono"
              />
              <button
                onClick={() => runPrompt('world-build', { beat: input })}
                disabled={loading || !input}
                className="w-full bg-black text-white py-3 text-xs font-bold uppercase tracking-wider hover:bg-[#FF4444] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 brutal-border brutal-shadow-hover disabled:pointer-events-none"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate Scene
              </button>
            </>
          )}

          {activeTab === 'dialogue' && (
            <>
              <p className="text-xs font-mono text-gray-600">Refine dialogue to add subtext and distinct character voices.</p>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste dialogue here to refine..."
                className="w-full h-32 p-3 border-2 border-black bg-gray-50 text-sm outline-none focus:border-[#FF4444] resize-none font-mono"
              />
              <button
                onClick={() => runPrompt('refine-dialogue', { dialogue: input, profiles: characters })}
                disabled={loading || !input}
                className="w-full bg-black text-white py-3 text-xs font-bold uppercase tracking-wider hover:bg-[#FF4444] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 brutal-border brutal-shadow-hover disabled:pointer-events-none"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                Subtextify
              </button>
            </>
          )}

          {activeTab === 'tension' && (
            <>
              <p className="text-xs font-mono text-gray-600">Analyze a scene for pacing, stakes, and psychological tension.</p>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Paste scene text here to analyze..."
                className="w-full h-32 p-3 border-2 border-black bg-gray-50 text-sm outline-none focus:border-[#FF4444] resize-none font-mono"
              />
              <button
                onClick={() => runPrompt('analyze-tension', { scene: input })}
                disabled={loading || !input}
                className="w-full bg-black text-white py-3 text-xs font-bold uppercase tracking-wider hover:bg-[#FF4444] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 brutal-border brutal-shadow-hover disabled:pointer-events-none"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                Analyze Tension
              </button>
            </>
          )}
          {activeTab === 'character' && (
            <>
              <p className="text-xs font-mono text-gray-600">Generate a visceral physical description based on a character's psychological profile.</p>
              <select
                value={selectedChar}
                onChange={(e) => setSelectedChar(e.target.value)}
                className="w-full p-3 border-2 border-black bg-gray-50 text-xs font-mono outline-none focus:border-[#FF4444]"
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
                className="w-full bg-black text-white py-3 text-xs font-bold uppercase tracking-wider hover:bg-[#FF4444] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 brutal-border brutal-shadow-hover disabled:pointer-events-none"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
                Generate Profile
              </button>
            </>
          )}
        </div>
      </div>

      {result && (
        <div className="bg-white border-4 border-black p-4 brutal-shadow">
          <h3 className="font-bold uppercase tracking-widest text-xs mb-2 text-[#FF4444]">Result</h3>
          <div className="bg-gray-50 p-3 border-2 border-black text-xs font-mono whitespace-pre-wrap text-black max-h-64 overflow-y-auto">
            {result}
          </div>
          {activeTab === 'world' && (
            <button
              onClick={() => onApplySuggestion(result)}
              className="mt-4 w-full bg-white text-black py-2 text-[10px] font-bold uppercase tracking-wider hover:bg-[#FF4444] hover:text-white transition-colors brutal-border brutal-shadow-hover"
            >
              Insert into Script
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
