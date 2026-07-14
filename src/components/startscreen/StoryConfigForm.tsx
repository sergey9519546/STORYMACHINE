import React, { useRef } from "react";
import { BookOpen, Database, Upload, FileText, Eye, Trash2, UploadCloud, Info, AlertTriangle } from "lucide-react";

type FileCategory = 'Lore' | 'Character' | 'Plot' | 'Rules' | 'Other';

export interface UploadedFile {
  name: string;
  content: string;
  size: number;
  category: FileCategory;
}

interface StoryConfigFormProps {
  theme: string;
  onThemeChange: (value: string) => void;
  backstory: string;
  onBackstoryChange: (value: string) => void;
  uploadedFiles: UploadedFile[];
  onUploadedFilesChange: (files: UploadedFile[]) => void;
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
  uploadedFiles,
  onUploadedFilesChange,
  onPreviewFile,
  isGenerating,
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
}: StoryConfigFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const inferCategory = (filename: string): FileCategory => {
    const ext = filename.toLowerCase().split('.').pop() ?? '';
    if (ext === 'fountain' || ext === 'fdx') return 'Plot';
    if (ext === 'json' || ext === 'csv') return 'Rules';
    return 'Lore';
  };

  const processFiles = (files: File[]) => {
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result;
        if (typeof text === 'string') {
          onUploadedFilesChange([...uploadedFiles, { name: file.name, content: text, size: file.size, category: inferCategory(file.name) }]);
        }
      };
      reader.readAsText(file);
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    onUploadedFilesChange(uploadedFiles.filter((_, i) => i !== index));
  };

  const updateFileCategory = (index: number, category: FileCategory) => {
    const newFiles = [...uploadedFiles];
    newFiles[index] = { ...newFiles[index], category };
    onUploadedFilesChange(newFiles);
  };

  const estimatedTokens = Math.round((backstory.length + uploadedFiles.reduce((acc, f) => acc + f.content.length, 0)) / 4);
  const maxSafeTokens = 100000;
  const percentage = Math.min(100, (estimatedTokens / maxSafeTokens) * 100);
  let barColor = "bg-stamp";
  if (percentage > 90) barColor = "bg-stamp animate-pulse";
  else if (percentage > 70) barColor = "bg-warn";

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
          className="w-full bg-panel brutal-border-thick px-8 py-6 text-ink placeholder-faint focus:outline-none focus:ring-0 focus:bg-panel2 font-mono text-xl brutal-shadow-focus"
          disabled={isGenerating}
        />
        <p className="text-sm font-mono text-faint mt-2">
          The core idea or logline of your story. Keep it concise.
        </p>
      </div>

      <div
        className={`space-y-6 text-left border-t-4 border-black pt-8 relative transition-colors duration-300 ${isDragging ? 'bg-panel2' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 z-50 bg-panel/80 backdrop-blur-sm border-4 border-dashed border-stamp flex flex-col items-center justify-center pointer-events-none">
            <UploadCloud className="w-16 h-16 text-stamp mb-4 animate-bounce" />
            <p className="text-2xl font-display uppercase tracking-widest text-stamp">Drop files to ingest</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <label className="text-xl font-bold text-ink uppercase tracking-widest flex items-center gap-3">
            <Database className="w-8 h-8" />
            Lore & Knowledge Base
          </label>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 bg-ink text-cream px-4 py-2 font-mono text-sm uppercase tracking-wider hover:bg-stamp brutal-border-thick brutal-shadow-hover"
            disabled={isGenerating}
          >
            <Upload className="w-4 h-4" /> Upload Documents
          </button>
          <input
            type="file"
            accept=".txt,.md,.csv,.json,.fountain,.fdx,.htm,.html"
            multiple
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-2">
            <textarea
              value={backstory}
              onChange={(e) => onBackstoryChange(e.target.value)}
              placeholder="Type manual context here... (e.g., character motivations, specific plot points, world rules)"
              className="w-full bg-panel brutal-border-thick px-6 py-4 text-ink placeholder-faint focus:outline-none focus:ring-0 focus:bg-panel2 font-mono text-sm min-h-[200px] resize-y brutal-shadow-focus"
              disabled={isGenerating}
            />
          </div>

          <div className="bg-panel2 brutal-border-thick p-4 flex flex-col h-[200px] overflow-y-auto">
            <h4 className="font-bold uppercase tracking-widest text-xs border-b-2 border-black pb-2 mb-3 flex justify-between items-center">
              <span>Ingested Files</span>
              <div className="flex items-center gap-3">
                {uploadedFiles.length > 0 && (
                  <button onClick={() => onUploadedFilesChange([])} className="text-[10px] hover:text-stamp transition-colors uppercase font-bold">Clear All</button>
                )}
                <span className="bg-ink text-cream px-2 py-0.5">{uploadedFiles.length}</span>
              </div>
            </h4>

            {uploadedFiles.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-faint space-y-2 text-center">
                <FileText className="w-8 h-8 opacity-50" />
                <p className="text-xs font-mono">No files attached.<br />Drag &amp; drop .txt or .md</p>
              </div>
            ) : (
              <div className="space-y-2">
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="flex flex-col gap-2 bg-panel brutal-border p-2 group hover:border-stamp brutal-shadow-hover">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileText className="w-3 h-3 flex-shrink-0 text-stamp" />
                        <span className="text-xs font-mono truncate" title={file.name}>{file.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-mono text-faint">{Math.round(file.size / 1024)}kb</span>
                        <button onClick={() => onPreviewFile(file)} className="text-faint hover:text-ink transition-colors" title="Preview">
                          <Eye className="w-3 h-3" />
                        </button>
                        <button onClick={() => removeFile(idx)} className="text-faint hover:text-stamp transition-colors" title="Remove">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <select
                      value={file.category}
                      onChange={(e) => updateFileCategory(idx, e.target.value as FileCategory)}
                      className="text-[10px] font-mono p-1 brutal-border bg-panel2 focus:outline-none cursor-pointer w-full"
                    >
                      <option value="Lore">Lore / Worldbuilding</option>
                      <option value="Character">Character Sheet</option>
                      <option value="Plot">Plot Outline</option>
                      <option value="Rules">Rules / Constraints</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Context Size Indicator */}
        <div className="flex items-center gap-2 bg-ink text-cream p-2 brutal-border-thick w-full max-w-[200px] ml-auto">
          <div className="flex-1">
            <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest mb-1">
              <span className="opacity-0 w-0 overflow-hidden">Context Volume</span>
              <span className={percentage > 90 ? "text-stamp" : ""}>
                ~{estimatedTokens.toLocaleString()} Tokens
              </span>
            </div>
            <div className="h-1 w-full bg-ink2">
              <div
                className={`h-full ${barColor} transition-all duration-500`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
          {percentage > 90 ? (
            <AlertTriangle className="w-3 h-3 text-stamp" aria-label="Approaching context limit" />
          ) : (
            <Info className="w-3 h-3 text-cream/80" aria-label="Estimated token count for AI context" />
          )}
        </div>
      </div>
    </div>
  );
}
