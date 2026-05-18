import React from "react";

interface Note {
  id: string;
  title: string;
  content: string;
}

interface ResearchNotesProps {
  notes: Note[];
  onAddNote: () => void;
  onUpdateNote: (id: string, field: "title" | "content", value: string) => void;
  onDeleteNote: (id: string) => void;
}

function exportNotesAsText(notes: Note[]): void {
  if (notes.length === 0) return;
  const text = notes.map(n => `# ${n.title}\n\n${n.content}`).join('\n\n---\n\n');
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'research-notes.txt';
  a.click();
  URL.revokeObjectURL(url);
}

export default function ResearchNotes({
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
}: ResearchNotesProps) {
  return (
    <div className="space-y-6 bg-[#f4f4f0] dark:bg-zinc-900 dark:text-white h-full overflow-y-auto">
      <div className="flex justify-between items-center gap-2">
        <h2 className="text-sm font-bold uppercase tracking-widest">
          Research Codex
        </h2>
        <div className="flex gap-2">
          {notes.length > 0 && (
            <button
              onClick={() => exportNotesAsText(notes)}
              aria-label="Export research notes as text file"
              className="border-2 border-black px-3 py-1 text-[10px] font-bold uppercase hover:bg-gray-100 transition-colors"
            >
              Export
            </button>
          )}
          <button
            onClick={onAddNote}
            aria-label="Add new research note"
            className="bg-black text-white px-3 py-1 text-[10px] font-bold uppercase brutal-border"
          >
            Add Note
          </button>
        </div>
      </div>
      <div className="grid gap-4">
        {notes.map((note) => (
          <div
            key={note.id}
            className="bg-white dark:bg-zinc-800 p-4 brutal-border-thick brutal-shadow"
          >
            <input
              value={note.title}
              onChange={(e) => onUpdateNote(note.id, "title", e.target.value)}
              aria-label="Research note title"
              className="w-full bg-transparent font-bold uppercase text-xs mb-2 outline-none border-b border-black dark:border-white"
            />
            <textarea
              value={note.content}
              onChange={(e) => onUpdateNote(note.id, "content", e.target.value)}
              aria-label="Research note content"
              className="w-full bg-gray-50 dark:bg-zinc-700 text-xs p-2 outline-none h-24 resize-none font-mono"
              placeholder="Enter research, links, or inspiration..."
            />
            <button
              onClick={() => onDeleteNote(note.id)}
              aria-label={`Delete research note: ${note.title}`}
              className="text-[10px] text-red-500 mt-2 font-bold uppercase"
            >
              Delete
            </button>
          </div>
        ))}
        {notes.length === 0 && (
          <div className="p-8 text-center border-4 border-dashed border-gray-300 dark:border-zinc-600 text-gray-400 font-mono text-xs uppercase">
            No research notes yet. Add one to get started.
          </div>
        )}
      </div>
    </div>
  );
}
