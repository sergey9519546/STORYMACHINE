import React from "react";
import { BookOpen } from "lucide-react";
// G0-07: the multi-file lore uploader was inert (its output, config.backstory,
// is read by no pipeline). The UI is removed; uploaded-files.ts stays a shared
// primitive and its types are still re-exported for StartScreen's state.
import type { FileCategory, UploadedFile } from "../../lib/uploaded-files";

export type { FileCategory, UploadedFile };

type UploadedFilesUpdater = UploadedFile[] | ((prev: UploadedFile[]) => UploadedFile[]);

interface StoryConfigFormProps {
  theme: string;
  onThemeChange: (value: string) => void;
  backstory: string;
  onBackstoryChange: (value: string) => void;
  uploadedFiles: UploadedFile[];
  /** Accepts a value or functional updater (StartScreen passes setUploadedFiles). */
  onUploadedFilesChange: (update: UploadedFilesUpdater) => void;
  onPreviewFile: (file: UploadedFile) => void;
  isGenerating: boolean;
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}

export function StoryConfigForm({
  theme,
  onThemeChange,
  backstory,
  onBackstoryChange,
  isGenerating,
}: StoryConfigFormProps) {
  return (
    <div className="space-y-10 flex-1">
      <div className="space-y-6 text-left">
        <label className="text-xl font-bold text-ink uppercase tracking-widest flex items-center gap-3">
          <BookOpen className="w-8 h-8" />
          Narrative Theme
        </label>
        <input
          type="text"
          value={theme}
          onChange={(e) => onThemeChange(e.target.value)}
          placeholder="e.g., A detective haunted by a cold case in a neon city..."
          className="w-full bg-panel border-[2px] border-[var(--sm-ink)] px-8 py-6 text-ink placeholder-faint focus:outline-none focus:ring-0 focus:bg-panel2 font-mono text-xl shadow-[var(--sm-shadow)]-focus"
          disabled={isGenerating}
        />
        <p className="text-sm font-mono text-faint mt-2">
          The core idea or logline of your story. Keep it concise.
        </p>
      </div>

      <div className="space-y-6 text-left border-t-4 border-ink pt-8">
        <label className="text-xl font-bold text-ink uppercase tracking-widest flex items-center gap-3">
          <BookOpen className="w-8 h-8" />
          Notes (for your reference)
        </label>
        <textarea
          value={backstory}
          onChange={(e) => onBackstoryChange(e.target.value)}
          placeholder="Optional notes — character motivations, specific plot points, world rules..."
          className="w-full bg-panel border-[2px] border-[var(--sm-ink)] px-6 py-4 text-ink placeholder-faint focus:outline-none focus:ring-0 focus:bg-panel2 font-mono text-sm min-h-[200px] resize-y shadow-[var(--sm-shadow)]-focus"
          disabled={isGenerating}
        />
        <p className="text-sm font-mono text-faint">
          Optional. Kept alongside your draft for your own reference.
        </p>
      </div>
    </div>
  );
}
