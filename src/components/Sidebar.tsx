import React, { useState, useMemo } from 'react';
import { Ghost, Crosshair, Target, Heart, PlusCircle, List, Users, Search, ChevronRight } from 'lucide-react';
import { FountainBlock } from '../lib/fountain';
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
  parsedBlocks: FountainBlock[];
  onNavigate: (lineIndex: number) => void;
}

const LONG_FIELD_MAX = 500;
const LONG_FIELD_WARN_THRESHOLD = 450;

function CharacterNameField({
  charId,
  value,
  onUpdate,
}: {
  charId: string;
  value: string;
  onUpdate: (id: string, field: keyof Character, value: string) => void;
}) {
  const [touched, setTouched] = useState(false);

  const errorMsg = touched
    ? value.trim() === ''
      ? 'Name cannot be empty.'
      : value.length > 100
      ? 'Name must be 100 characters or fewer.'
      : null
    : null;

  return (
    <div className="mb-4">
      <input
        type="text"
        value={value}
        onChange={(e) => onUpdate(charId, 'name', e.target.value)}
        onBlur={() => setTouched(true)}
        className={cn(
          "bg-transparent text-sm font-bold outline-none w-full border-b-2 pb-1 focus:border-stamp transition-colors uppercase tracking-widest",
          errorMsg ? "border-stamp" : "border-black"
        )}
        placeholder="CHARACTER NAME"
        aria-invalid={!!errorMsg}
        aria-describedby={errorMsg ? `name-error-${charId}` : undefined}
      />
      {errorMsg && (
        <p id={`name-error-${charId}`} className="text-stamp text-[10px] font-mono mt-1" role="alert">
          {errorMsg}
        </p>
      )}
    </div>
  );
}

function LongTextField({
  charId,
  field,
  value,
  placeholder,
  onUpdate,
}: {
  charId: string;
  field: keyof Character;
  value: string;
  placeholder: string;
  onUpdate: (id: string, field: keyof Character, value: string) => void;
}) {
  const displayValue = value.slice(0, LONG_FIELD_MAX);
  const count = displayValue.length;
  const nearLimit = count >= LONG_FIELD_WARN_THRESHOLD;

  return (
    <div className="flex-1 relative">
      <textarea
        value={displayValue}
        onChange={(e) => {
          const capped = e.target.value.slice(0, LONG_FIELD_MAX);
          onUpdate(charId, field, capped);
        }}
        className="w-full bg-panel2 text-[10px] outline-none resize-none h-12 p-2 brutal-border focus:border-stamp font-mono"
        placeholder={placeholder}
        maxLength={LONG_FIELD_MAX}
        aria-describedby={nearLimit ? `count-${charId}-${String(field)}` : undefined}
      />
      {nearLimit && (
        <p
          id={`count-${charId}-${String(field)}`}
          className={cn(
            "text-[9px] font-mono text-right mt-0.5",
            count >= LONG_FIELD_MAX ? "text-stamp" : "text-warn"
          )}
        >
          {count}/{LONG_FIELD_MAX}
        </p>
      )}
    </div>
  );
}

export default function Sidebar({ characters, onAddCharacter, onUpdateCharacter, scriptText, parsedBlocks, onNavigate }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'scenes' | 'characters'>('scenes');
  const [searchQuery, setSearchQuery] = useState('');

  const scenes = useMemo(() => {
    const blocks = parsedBlocks;
    return blocks
      .map((b, i) => ({ ...b, index: i }))
      .filter(b => b.type === 'scene_heading');
  }, [parsedBlocks]);

  const filteredScenes = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return scenes.filter(s => s.text.toLowerCase().includes(query));
  }, [scenes, searchQuery]);

  const filteredCharacters = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return characters.filter(c => c.name.toLowerCase().includes(query));
  }, [characters, searchQuery]);

  return (
    <div className="w-80 bg-panel text-ink flex flex-col h-full border-r-4 border-black shrink-0">
      <div role="navigation" className="flex bg-ink text-cream shrink-0">
        <button
          onClick={() => setActiveTab('scenes')}
          aria-selected={activeTab === 'scenes'}
          className={cn(
            "flex-1 p-3 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors",
            activeTab === 'scenes' ? "bg-stamp" : "hover:bg-night"
          )}
        >
          <List className="w-3 h-3" /> Scenes
        </button>
        <button
          onClick={() => setActiveTab('characters')}
          aria-selected={activeTab === 'characters'}
          className={cn(
            "flex-1 p-3 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors",
            activeTab === 'characters' ? "bg-stamp" : "hover:bg-night"
          )}
        >
          <Users className="w-3 h-3" /> Characters
        </button>
      </div>

      <div className="p-3 border-b border-hair shrink-0">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-faint" />
          <input
            type="text"
            placeholder="SEARCH..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search scenes or characters"
            className="w-full bg-panel2 p-2 pl-8 text-[10px] font-mono outline-none brutal-border"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-paper">
        {activeTab === 'scenes' ? (
          <div className="space-y-1">
            {filteredScenes.map((scene) => (
              <button
                key={scene.index}
                onClick={() => onNavigate(scene.index)}
                className="w-full text-left p-2 hover:bg-panel transition-colors group flex items-center justify-between brutal-border-thin bg-transparent"
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
              className="w-full p-2 bg-ink text-cream text-[10px] font-bold uppercase tracking-widest hover:bg-stamp transition-colors brutal-border flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-3 h-3" /> Add Character
            </button>

            {filteredCharacters.map(char => (
              <div key={char.id} className="bg-panel p-4 brutal-border-thick brutal-shadow">
                <CharacterNameField
                  charId={char.id}
                  value={char.name}
                  onUpdate={onUpdateCharacter}
                />

                <div className="space-y-4">
                  {[
                    { icon: Ghost, label: 'Ghost', field: 'ghost' as keyof Character, placeholder: 'What haunts them?' },
                    { icon: Crosshair, label: 'Lie', field: 'lie' as keyof Character, placeholder: 'What lie do they believe?' },
                    { icon: Target, label: 'Want', field: 'want' as keyof Character, placeholder: 'What do they want?' },
                    { icon: Heart, label: 'Need', field: 'need' as keyof Character, placeholder: 'What do they need?' },
                  ].map(item => (
                    <div key={item.field} className="flex items-start gap-3">
                      <item.icon className="w-3 h-3 text-ink mt-1 shrink-0" />
                      <div className="flex-1">
                        <label className="text-[8px] font-bold uppercase tracking-widest text-ink block mb-1">{item.label}</label>
                        <LongTextField
                          charId={char.id}
                          field={item.field}
                          value={char[item.field]}
                          placeholder={item.placeholder}
                          onUpdate={onUpdateCharacter}
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
