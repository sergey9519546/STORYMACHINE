import React, { useMemo } from 'react';
import { parseFountain, FountainBlock } from '../lib/fountain';
import { AlertCircle } from 'lucide-react';

interface EditorProps {
  script: string;
  onChange: (script: string) => void;
}

export default function Editor({ script, onChange }: EditorProps) {
  // ⚡ Bolt: Use useMemo for derived state to eliminate unnecessary double-render cycle
  // This replaces a useState + useEffect combo that caused re-renders on every keystroke
  const blocks = useMemo(() => parseFountain(script), [script]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#E4E3E0] overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-10">
        <h2 className="text-sm font-semibold tracking-widest uppercase text-gray-500">Script Editor</h2>
        <div className="flex gap-2 text-xs">
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded">Fountain Parsed</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-8 flex justify-center">
        <div className="w-full max-w-3xl bg-white shadow-xl min-h-[1056px] p-16 font-mono text-[14px] leading-relaxed relative">
          {/* Overlay for syntax highlighting and linting */}
          <div className="absolute inset-16 pointer-events-none whitespace-pre-wrap break-words">
            {blocks.map((block, idx) => (
              <div 
                key={block.id} 
                className={`relative group
                  ${block.type === 'scene_heading' ? 'font-bold uppercase text-blue-800 bg-blue-100' : ''}
                  ${block.type === 'character' ? 'font-bold uppercase text-red-800 bg-red-100' : ''}
                  ${block.type === 'dialogue' ? 'text-black' : ''}
                  ${block.type === 'parenthetical' ? 'italic text-gray-600' : ''}
                  ${block.type === 'transition' ? 'font-bold uppercase text-gray-500 bg-gray-200' : ''}
                  ${block.text.trim().startsWith('[ACTION:') ? 'font-mono text-green-800 bg-green-100' : ''}
                `}
              >
                {block.text || ' '}
                {block.lintErrors && (
                  <div className="absolute left-full ml-4 top-0 w-48 bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50 flex gap-2 items-start">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      {block.lintErrors.map((err, i) => <div key={i}>{err}</div>)}
                    </div>
                  </div>
                )}
                {block.lintErrors && (
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-yellow-400 opacity-50"></div>
                )}
              </div>
            ))}
          </div>

          {/* Actual textarea for typing */}
          <textarea
            value={script}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-16 w-[calc(100%-8rem)] h-[calc(100%-8rem)] resize-none outline-none bg-transparent text-transparent caret-black whitespace-pre-wrap break-words"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
