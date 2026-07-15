import React, { useState, useMemo, useEffect } from 'react';
import { Ghost, Crosshair, Target, Heart, PlusCircle, List, Users, Search, ChevronRight, X } from 'lucide-react';
import { FountainBlock } from '../lib/fountain';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function useIsMdUp() {
  const [md, setMd] = useState(true);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(min-width: 768px)');
    const apply = () => setMd(mq.matches);
    apply();
    if (mq.addEventListener) mq.addEventListener('change', apply);
    else mq.addListener(apply);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', apply);
      else mq.removeListener(apply);
    };
  }, []);
  return md;
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
          "w-full border-b-2 bg-transparent pb-1 text-sm font-bold uppercase tracking-widest outline-none transition-colors focus:border-[var(--sm-stamp)]",
          errorMsg ? "border-[var(--sm-stamp)]" : "border-[var(--sm-ink)]"
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
        className="h-12 w-full resize-none border-[1.5px] border-[var(--sm-ink)] bg-[var(--sm-panel-2)] p-2 font-mono text-[10px] text-[var(--sm-ink)] outline-none focus:ring-2 focus:ring-[var(--sm-stamp)]"
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
      .filter(b => b.type === 'scene_heading')
      .map((b, sceneOrdinal) => {
        // Parse a slugline into its production parts so the rail reads as a
        // marked-up index rather than a flat text list. Format is typically
        // "INT. LOCATION - TIME" (or EXT./INT-EXT). Anything that doesn't match
        // degrades gracefully to the raw heading in `location`.
        const raw = b.text.trim();
        const prefixMatch = raw.match(/^(INT\.?\/EXT\.?|EXT\.?\/INT\.?|I\.?\/E\.?|INT\.?|EXT\.?|EST\.?)\s*/i);
        const prefix = prefixMatch ? prefixMatch[1].replace(/\.$/, '').toUpperCase() : '';
        let rest = prefixMatch ? raw.slice(prefixMatch[0].length) : raw;
        // Time-of-day is the trailing segment after the last " - ".
        let time = '';
        const dashIdx = rest.lastIndexOf(' - ');
        if (dashIdx !== -1) {
          time = rest.slice(dashIdx + 3).trim();
          rest = rest.slice(0, dashIdx).trim();
        }
        return {
          ...b,
          sceneNumber: sceneOrdinal + 1,
          prefix,
          location: rest || raw,
          time,
        };
      });
  }, [parsedBlocks]);

  const filteredScenes = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return scenes.filter(s => s.text.toLowerCase().includes(query));
  }, [scenes, searchQuery]);

  const filteredCharacters = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return characters.filter(c => c.name.toLowerCase().includes(query));
  }, [characters, searchQuery]);

  const isMdUp = useIsMdUp();
  // Off-canvas only on small screens; desktop rail is always present.
  const drawerHidden = !isMdUp && !mobileOpen;

  // Navigate to a scene and, on mobile, dismiss the drawer so the editor is
  // revealed again. On desktop onCloseMobile is undefined and this is a no-op.
  const handleNavigate = (lineIndex: number) => {
    onNavigate(lineIndex);
    onCloseMobile?.();
  };

  return (
    <>
      {/* Mobile backdrop — only renders when the drawer is open on < md. */}
      {mobileOpen && !isMdUp && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          aria-hidden="true"
          onClick={onCloseMobile}
        />
      )}
      <aside
        // On md+ this is a static rail. On < md it is a left drawer.
        className={cn(
          "flex h-full flex-col border-r-[1.5px] border-[var(--sm-ink)] bg-[var(--sm-panel)] text-[var(--sm-ink)]",
          "md:w-72 md:shrink-0 md:static md:translate-x-0",
          "fixed top-0 left-0 z-50 h-dvh w-[85vw] max-w-xs transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        aria-label="Scenes and characters"
        aria-hidden={drawerHidden || undefined}
        inert={drawerHidden || undefined}
      >
      <div role="navigation" className="sm-pagetop shrink-0 gap-0 p-0">
        <button
          onClick={() => setActiveTab('scenes')}
          aria-selected={activeTab === 'scenes'}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 px-3 py-3 font-[family-name:var(--sm-font-mono)] text-[10px] font-bold uppercase tracking-[0.14em] transition-colors",
            activeTab === 'scenes'
              ? "bg-[var(--sm-cream)] text-[var(--sm-ink)]"
              : "text-[var(--sm-cream)]/70 hover:text-[var(--sm-cream)]"
          )}
        >
          <List className="w-3 h-3" /> Scenes
        </button>
        <button
          onClick={() => setActiveTab('characters')}
          aria-selected={activeTab === 'characters'}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 px-3 py-3 font-[family-name:var(--sm-font-mono)] text-[10px] font-bold uppercase tracking-[0.14em] transition-colors",
            activeTab === 'characters'
              ? "bg-[var(--sm-cream)] text-[var(--sm-ink)]"
              : "text-[var(--sm-cream)]/70 hover:text-[var(--sm-cream)]"
          )}
        >
          <Users className="w-3 h-3" /> Characters
        </button>
        <button
          onClick={onCloseMobile}
          aria-label="Close sidebar"
          className="p-3 text-[var(--sm-cream)]/70 hover:text-[var(--sm-cream)] md:hidden"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="shrink-0 border-b border-[var(--sm-hair)] p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--sm-ink-faint)]" />
          <input
            type="text"
            placeholder="Search…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search scenes or characters"
            className="w-full border-[1.5px] border-[var(--sm-ink)] bg-[var(--sm-panel-2)] py-2 pl-8 pr-2 font-[family-name:var(--sm-font-mono)] text-[10px] uppercase tracking-wider text-[var(--sm-ink)] outline-none focus:ring-2 focus:ring-[var(--sm-stamp)]"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[var(--sm-paper)]">
        {activeTab === 'scenes' ? (
          <div>
            <div className="flex items-center justify-between border-b border-[var(--sm-hair)] px-3 py-2">
              <span className="font-[family-name:var(--sm-font-mono)] text-[9px] font-bold uppercase tracking-[0.16em] text-[var(--sm-ink-faint)]">
                Scene Index
              </span>
              <span className="font-[family-name:var(--sm-font-mono)] text-[9px] tabular-nums text-[var(--sm-ink-faint)]">
                {filteredScenes.length}
              </span>
            </div>
            <ol className="divide-y divide-[var(--sm-hair)]">
              {filteredScenes.map((scene) => (
                <li key={scene.index}>
                  <button
                    onClick={() => handleNavigate(scene.index)}
                    className="group relative flex w-full items-start gap-3 py-2.5 pl-3 pr-2 text-left transition-colors hover:bg-[var(--sm-panel)]"
                  >
                    {/* stamp left-edge cue on hover, echoing sm-card--sel */}
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 w-[3px] bg-[var(--sm-stamp)] opacity-0 transition-opacity group-hover:opacity-100"
                    />
                    <span className="mt-0.5 w-5 shrink-0 font-[family-name:var(--sm-font-mono)] text-[10px] tabular-nums text-[var(--sm-ink-faint)]">
                      {String(scene.sceneNumber).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-[family-name:var(--sm-font-mono)] text-[11px] font-bold uppercase tracking-wide text-[var(--sm-ink)]">
                        {scene.location}
                      </span>
                      {(scene.prefix || scene.time) && (
                        <span className="mt-0.5 flex items-center gap-1.5">
                          {scene.prefix && (
                            <span className="border border-[var(--sm-hair)] px-1 py-px font-[family-name:var(--sm-font-mono)] text-[8px] font-bold uppercase tracking-wider text-[var(--sm-ink-mute)]">
                              {scene.prefix}
                            </span>
                          )}
                          {scene.time && (
                            <span className="truncate font-[family-name:var(--sm-font-mono)] text-[9px] uppercase tracking-wider text-[var(--sm-ink-faint)]">
                              {scene.time}
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                    <ChevronRight className="mt-1 h-3 w-3 shrink-0 text-[var(--sm-ink-faint)] opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                </li>
              ))}
            </ol>
            {filteredScenes.length === 0 && (
              <div className="p-3">
                <div className="sm-ph py-10">
                  {searchQuery ? 'No scenes match' : 'No scenes yet'}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={onAddCharacter}
              className="sm-btn sm-btn--ink w-full"
            >
              <PlusCircle className="w-3 h-3" /> Add Character
            </button>

            {filteredCharacters.map(char => (
              <div key={char.id} className="sm-card border-[var(--sm-ink)] bg-[var(--sm-panel)] p-3">
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
                        <label className="sm-h mb-1 block">{item.label}</label>
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
              <div className="sm-ph py-10">No characters yet</div>
            )}
          </div>
        )}
      </div>
      </aside>
    </>
  );
}
