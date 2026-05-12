import React, { useState, useMemo } from 'react';
import { Ghost, Crosshair, Target, Heart, PlusCircle, List, Users, Search, ChevronRight } from 'lucide-react';
import { parseFountain } from '../lib/fountain';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Character {
  id: string;
  name: string;
  ghost: string;
  lie: string;
  want: string;
  need: string;
}

interface SidebarProps {
  characters: Character[];
  onAddCharacter: () => void;
  onUpdateCharacter: (id: string, field: keyof Character, value: string) => void;
  scriptText: string;
  onNavigate: (lineIndex: number) => void;
}

export default function Sidebar({ characters, onAddCharacter, onUpdateCharacter, scriptText, onNavigate }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'scenes' | 'characters'>('scenes');
  const [searchQuery, setSearchQuery] = useState('');

  const scenes = useMemo(() => {
    const blocks = parseFountain(scriptText);
    return blocks
      .map((b, i) => ({ ...b, index: i }))
      .filter(b => b.type === 'scene_heading');
  }, [scriptText]);

  const filteredScenes = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return scenes.filter(s =>
      s.text.toLowerCase().includes(query)
    );
  }, [scenes, searchQuery]);

  const filteredCharacters = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return characters.filter(c =>
      c.name.toLowerCase().includes(query)
    );
  }, [characters, searchQuery]);

  return (
    <div className="w-80 bg-white dark:bg-zinc-950 text-black dark:text-white flex flex-col h-full border-r-4 border-black dark:border-zinc-800 shrink-0">
      <div className="flex bg-black text-white shrink-0">
        <button 
          onClick={() => setActiveTab('scenes')}
          className={cn(
            "flex-1 p-3 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors",
            activeTab === 'scenes' ? "bg-[#FF4444]" : "hover:bg-zinc-900"
          )}
        >
          <List className="w-3 h-3" /> Scenes
        </button>
        <button 
          onClick={() => setActiveTab('characters')}
          className={cn(
            "flex-1 p-3 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors",
            activeTab === 'characters' ? "bg-[#FF4444]" : "hover:bg-zinc-900"
          )}
        >
          <Users className="w-3 h-3" /> Characters
        </button>
      </div>

      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400" />
          <input 
            type="text"
            placeholder="SEARCH..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-100 dark:bg-zinc-900 p-2 pl-8 text-[10px] font-mono outline-none brutal-border"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f4f4f0] dark:bg-zinc-900/50">
        {activeTab === 'scenes' ? (
          <div className="space-y-1">
            {filteredScenes.map((scene) => (
              <button
                key={scene.index}
                onClick={() => onNavigate(scene.index)}
                className="w-full text-left p-2 hover:bg-white dark:hover:bg-zinc-800 transition-colors group flex items-center justify-between brutal-border-thin bg-transparent"
              >
                <span className="text-[10px] font-bold uppercase truncate pr-2">{scene.text}</span>
                <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
            {filteredScenes.length === 0 && (
              <div className="text-center py-8 text-[10px] font-mono opacity-40 uppercase">No scenes found</div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <button 
              onClick={onAddCharacter}
              className="w-full p-2 bg-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#FF4444] transition-colors brutal-border flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-3 h-3" /> Add Character
            </button>

            {filteredCharacters.map(char => (
              <div key={char.id} className="bg-white dark:bg-zinc-800 p-4 brutal-border-thick brutal-shadow">
                <input
                  type="text"
                  value={char.name}
                  onChange={(e) => onUpdateCharacter(char.id, 'name', e.target.value)}
                  className="bg-transparent text-sm font-bold outline-none w-full mb-4 border-b-2 border-black dark:border-zinc-700 pb-1 focus:border-[#FF4444] transition-colors uppercase tracking-widest"
                  placeholder="CHARACTER NAME"
                />
                
                <div className="space-y-4">
                  {[
                    { icon: Ghost, label: 'Ghost', field: 'ghost', placeholder: 'What haunts them?' },
                    { icon: Crosshair, label: 'Lie', field: 'lie', placeholder: 'What lie do they believe?' },
                    { icon: Target, label: 'Want', field: 'want', placeholder: 'What do they want?' },
                    { icon: Heart, label: 'Need', field: 'need', placeholder: 'What do they need?' },
                  ].map(item => (
                    <div key={item.field} className="flex items-start gap-3">
                      <item.icon className="w-3 h-3 text-black dark:text-white mt-1 shrink-0" />
                      <div className="flex-1">
                        <label className="text-[8px] font-bold uppercase tracking-widest text-black dark:text-zinc-400 block mb-1">{item.label}</label>
                        <textarea
                          value={char[item.field as keyof Character]}
                          onChange={(e) => onUpdateCharacter(char.id, item.field as keyof Character, e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-900 text-[10px] outline-none resize-none h-12 p-2 brutal-border focus:border-[#FF4444] font-mono"
                          placeholder={item.placeholder}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {filteredCharacters.length === 0 && (
              <div className="text-center py-8 text-[10px] font-mono opacity-40 uppercase">No characters found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
