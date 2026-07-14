import React from "react";
import { Users, PlusCircle } from "lucide-react";

export interface ScriptCharacter {
  id: string;
  name: string;
  ghost: string;
  lie: string;
  want: string;
  need: string;
}

interface CharacterManagerProps {
  characters: ScriptCharacter[];
  onAddCharacter: () => void;
  onUpdateCharacter: (id: string, field: string, value: string) => void;
  onDeleteCharacter: (id: string) => void;
}

/** Inline character editor used within the right-panel Codex or as a standalone panel. */
export default function CharacterManager({
  characters,
  onAddCharacter,
  onUpdateCharacter,
  onDeleteCharacter,
}: CharacterManagerProps) {
  return (
    <div className="space-y-4 bg-paper">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
          <Users className="w-4 h-4" /> Characters
        </h2>
        <button
          onClick={onAddCharacter}
          aria-label="Add new character"
          className="bg-ink text-cream px-3 py-1 text-[10px] font-bold uppercase brutal-border flex items-center gap-2"
        >
          <PlusCircle className="w-3 h-3" aria-hidden="true" /> Add
        </button>
      </div>

      {characters.length === 0 && (
        <div className="text-center p-8 border-2 border-dashed border-hair text-faint font-mono text-xs">
          No characters yet. Click &ldquo;Add&rdquo; to create one.
        </div>
      )}

      <div className="space-y-4">
        {characters.map((char) => (
          <div
            key={char.id}
            className="bg-panel p-4 brutal-border-thick brutal-shadow space-y-3"
          >
            <div className="flex justify-between items-center">
              <input
                value={char.name}
                onChange={(e) =>
                  onUpdateCharacter(char.id, "name", e.target.value)
                }
                placeholder="CHARACTER NAME"
                aria-label="Character name"
                className="flex-1 bg-transparent font-bold uppercase text-xs outline-none border-b border-ink mr-2"
              />
              <button
                onClick={() => onDeleteCharacter(char.id)}
                aria-label={`Delete character ${char.name || "unnamed"}`}
                className="text-[10px] text-red-500 font-bold uppercase shrink-0"
              >
                Delete
              </button>
            </div>

            {(
              [
                ["ghost", "Ghost (past wound)"],
                ["lie", "Lie (false belief)"],
                ["want", "Want (external goal)"],
                ["need", "Need (internal truth)"],
              ] as const
            ).map(([field, label]) => (
              <div key={field}>
                <label className="block text-[10px] font-bold uppercase text-faint mb-1">
                  {label}
                </label>
                <input
                  value={(char as unknown as Record<string, string>)[field] ?? ""}
                  onChange={(e) =>
                    onUpdateCharacter(char.id, field, e.target.value)
                  }
                  aria-label={`${char.name || "Character"} ${label}`}
                  className="w-full bg-panel2 text-xs p-2 outline-none font-mono brutal-border"
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
