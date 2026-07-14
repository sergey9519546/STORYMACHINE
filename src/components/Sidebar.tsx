import React, { useState, useMemo } from 'react';
import { Ghost, Crosshair, Target, Heart, PlusCircle, List, Users, Search, ChevronRight, X } from 'lucide-react';
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
  /**
   * Mobile drawer mode. When true (and the viewport is below md), the Sidebar
   * renders as a left-sliding overlay with a dismiss button and backdrop,
   * instead of a permanent 320px column. On md+ the prop is ignored — the
   * Sidebar always docks. See ScriptIDE's responsive shell.
   */
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
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
          "bg-transparent text-sm font-bold outline-none w-full border-b-2 pb-1 focus:border-[#FF4444] transition-colors uppercase tracking-widest",
          errorMsg ? "border-red-500 dark:border-red-400" : "border-black dark:border-zinc-700"
        )}
        placeholder="CHARACTER NAME"
        aria-invalid={!!errorMsg}
        aria-describedby={errorMsg ? `name-error-${charId}` : undefined}
      />
      {errorMsg && (
        <p id={`name-error-${charId}`} className="text-red-600 dark:text-red-400 text-[10px] font-mono mt-1" role="alert">
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
        className="w-full bg-zinc-50 dark:bg-zinc-900 text-[10px] outline-none resize-none h-12 p-2 brutal-border focus:border-[#FF4444] font-mono"
        placeholder={placeholder}
        maxLength={LONG_FIELD_MAX}
        aria-describedby={nearLimit ? `count-${charId}-${String(field)}` : undefined}
      />
      {nearLimit && (
        <p
          id={`count-${charId}-${String(field)}`}
          className={cn(
            "text-[9px] font-mono text-right mt-0.5",
            count >= LONG_FIELD_MAX ? "text-red-500 dark:text-red-400" : "text-yellow-600 dark:text-yellow-400"
          )}
        >
          {count}/{LONG_FIELD_MAX}
        </p>
      )}
    </div>
  );
}

export default function Sidebar({ characters, onAddCharacter, onUpdateCharacter, scriptText, parsedBlocks, onNavigate, mobileOpen = false, onCloseMobile }: SidebarProps) {
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

  // Navigate to a scene and, on mobile, dismiss the drawer so the editor is
  // revealed again. On desktop onCloseMobile is undefined and this is a no-op.
  const handleNavigate = (lineIndex: number) => {
    onNavigate(lineIndex);
    onCloseMobile?.();
  };

  return (
    <>
      {/* Mobile backdrop — only renders when the drawer is open on < md. */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          aria-hidden="true"
          onClick={onCloseMobile}
        />
      )}
      <aside
        // On md+ this is a static 320px flex column (shrink-0). On < md it
        // becomes a left-sliding overlay drawer: fixed, full height, translated
        // off-screen when closed. The `md:` static rules win at the breakpoint
        // so the drawer mechanics never affect desktop layout.
        className={cn(
          "bg-white dark:bg-zinc-950 text-black dark:text-white flex flex-col h-full border-r-4 border-black dark:border-zinc-800",
          "md:w-80 md:shrink-0 md:static md:translate-x-0",
          "fixed top-0 left-0 z-50 w-[85vw] max-w-xs h-dvh transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        aria-label="Scenes and characters"
        aria-hidden={!mobileOpen}
      >
      <div role="navigation" className="flex bg-black text-white shrink-0">
        <button
          onClick={() => setActiveTab('scenes')}
          aria-selected={activeTab === 'scenes'}
          className={cn(
            "flex-1 p-3 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors",
            activeTab === 'scenes' ? "bg-[#FF4444]" : "hover:bg-zinc-900"
          )}
        >
          <List className="w-3 h-3" /> Scenes
        </button>
        <button
          onClick={() => setActiveTab('characters')}
          aria-selected={activeTab === 'characters'}
          className={cn(
            "flex-1 p-3 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-colors",
            activeTab === 'characters' ? "bg-[#FF4444]" : "hover:bg-zinc-900"
          )}
        >
          <Users className="w-3 h-3" /> Characters
        </button>
        {/* Mobile-only dismiss — closes the drawer to reveal the editor. */}
        <button
          onClick={onCloseMobile}
          aria-label="Close sidebar"
          className="md:hidden p-3 text-white hover:bg-zinc-900 transition-colors"
        >
          <X className="w-4 h-4" />
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
            aria-label="Search scenes or characters"
            className="w-full bg-zinc-100 dark:bg-zinc-900 p-2 pl-8 text-[10px] font-mono focus:outline-none focus:ring-2 focus:ring-[#FF4444] brutal-border"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f4f4f0] dark:bg-zinc-900/50">
        {activeTab === 'scenes' ? (
          <div className="space-y-1">
            {filteredScenes.map((scene) => (
              <button
                key={scene.index}
                onClick={() => handleNavigate(scene.index)}
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
                      <item.icon className="w-3 h-3 text-black dark:text-white mt-1 shrink-0" />
                      <div className="flex-1">
                        <label className="text-[8px] font-bold uppercase tracking-widest text-black dark:text-zinc-400 block mb-1">{item.label}</label>
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
      </aside>
    </>
  );
}
