import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Settings, FileText, X, ChevronRight, ChevronLeft, Cpu, Upload } from "lucide-react";
import { StoryConfig } from "../types";
import { EXPLAINERS } from "./startscreen/explainers.config";
import { ExplainerCard } from "./startscreen/ExplainerCard";
import { StoryConfigForm, UploadedFile } from "./startscreen/StoryConfigForm";

interface StartScreenProps {
  onStart: (config: StoryConfig) => void;
  isGenerating: boolean;
  onOpenStoryMachine?: () => void;
}

// A minimal default config for the two "skip the wizard entirely" entry
// points below (open editor directly / open a script file). Intentionally
// duplicated rather than imported from App.tsx's DEFAULT_STORY_CONFIG: App
// lazy-imports StartScreen, so a reverse static import here would form an
// import cycle; this object is tiny and has no behavior to drift out of sync.
const DEFAULT_STORY_CONFIG: StoryConfig = {
  theme: "Untitled Story",
  backstory: "",
  format: "film",
  structure: "save_the_cat",
  directorStyle: "fincher",
  emotionalArc: "man_in_a_hole",
};

// Journey-audit finding D/C: "open a script file" support. Only .fountain/.txt
// can be dropped straight into the editor as Fountain source; .fdx is Final
// Draft XML and this app has no client-side .fdx→Fountain converter (src/lib/
// fdx.ts only exports the reverse direction, Fountain→FDX — the only .fdx
// *import* conversion lives server-side, in ScriptDoctorPanel's upload flow).
const OPEN_FILE_EXTS = /\.(fountain|txt|fdx)$/i;
const MAX_OPEN_FILE_SIZE = 5 * 1024 * 1024; // 5 MB — generous for a feature-length script

export default function StartScreen({
  onStart,
  isGenerating,
  onOpenStoryMachine,
}: StartScreenProps) {
  const [theme, setTheme] = useState("");
  const [backstory, setBackstory] = useState("");
  const [format, setFormat] = useState<StoryConfig["format"]>("film");
  const [structure, setStructure] = useState<StoryConfig["structure"]>("save_the_cat");
  const [directorStyle, setDirectorStyle] = useState<StoryConfig["directorStyle"]>("fincher");
  const [emotionalArc, setEmotionalArc] = useState<StoryConfig["emotionalArc"]>("man_in_a_hole");
  const [step, setStep] = useState(1);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // "Open a script file" (finding D): a second, always-available entry point
  // on step 1 that goes straight into the editor — distinct from the
  // "Ingested Files" uploads above, which only ever become hidden AI context.
  const [openFileError, setOpenFileError] = useState<string | null>(null);
  const openFileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // H3: Read dropped files (previously a no-op stub).
  // Accepts .txt / .fountain / .fdx / text-like files; reads as text via FileReader.
  const ALLOWED_EXTS = /\.(txt|fountain|fdx|md|htm|html)$/i;
  const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB per file

  const inferDropCategory = (filename: string): typeof uploadedFiles[number]['category'] => {
    const ext = filename.toLowerCase().split('.').pop() ?? '';
    if (ext === 'fountain' || ext === 'fdx') return 'Plot';
    if (ext === 'json' || ext === 'csv') return 'Rules';
    return 'Lore';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f =>
      ALLOWED_EXTS.test(f.name) && f.size <= MAX_FILE_SIZE
    );
    droppedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result;
        if (typeof text === 'string') {
          setUploadedFiles(prev => [
            ...prev,
            { name: file.name, content: text, size: file.size, category: inferDropCategory(file.name) },
          ]);
        }
      };
      reader.readAsText(file);
    });
  };

  // Opens an uploaded script file straight into ScriptIDE, skipping the
  // wizard. .fountain/.txt content becomes the editor's initial draft by
  // writing the exact localStorage key ScriptIDE's lsGet("script_draft")
  // reads on mount (see ScriptIDE.tsx). .fdx has no client-side converter, so
  // it's handed off via sessionStorage for ScriptIDE to surface as a toast
  // pointing at Script Doctor's server-side conversion instead of silently
  // dumping raw Final Draft XML into the Fountain editor.
  const handleOpenScriptFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (openFileInputRef.current) openFileInputRef.current.value = "";
    if (!file) return;
    setOpenFileError(null);

    if (!OPEN_FILE_EXTS.test(file.name)) {
      setOpenFileError(`"${file.name}" isn't a .fountain, .txt, or .fdx file.`);
      return;
    }
    if (file.size === 0) {
      setOpenFileError(`"${file.name}" is empty — there's nothing to open.`);
      return;
    }
    if (file.size > MAX_OPEN_FILE_SIZE) {
      setOpenFileError(`"${file.name}" is over the 5 MB limit for a single script.`);
      return;
    }

    const isFdx = /\.fdx$/i.test(file.name);
    const reader = new FileReader();
    reader.onerror = () => {
      setOpenFileError(`Couldn't read "${file.name}" — try re-saving it and uploading again.`);
    };
    reader.onload = (ev) => {
      const text = ev.target?.result;
      if (typeof text !== "string" || text.trim() === "") {
        setOpenFileError(`"${file.name}" is empty — there's nothing to open.`);
        return;
      }
      try {
        if (isFdx) {
          sessionStorage.setItem("sm_fdx_import_pending", file.name);
        } else {
          localStorage.setItem("script_draft", text);
        }
      } catch {
        setOpenFileError(`Couldn't open "${file.name}" — your browser is blocking local storage (private mode?).`);
        return;
      }
      onStart(DEFAULT_STORY_CONFIG);
    };
    reader.readAsText(file);
  };

  const handleStart = () => {
    const combinedBackstory = [
      backstory ? `--- MANUAL CONTEXT ---\n${backstory}` : "",
      ...uploadedFiles.map(f => `--- ${f.category.toUpperCase()} DOCUMENT: ${f.name} ---\n${f.content}`)
    ].filter(Boolean).join("\n\n");

    onStart({
      theme: theme || "A psychological thriller about betrayal",
      backstory: combinedBackstory,
      format,
      structure,
      directorStyle,
      emotionalArc,
    });
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 5));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Brutalist Grid Background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #000 2px, transparent 2px)', backgroundSize: '32px 32px' }}></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="z-10 max-w-4xl w-full space-y-8 py-12"
      >
        <div className="space-y-6 border-b-[8px] border-black pb-8">
          <h1 className="text-5xl md:text-7xl font-display uppercase tracking-tighter text-black leading-[0.85]">
            STORY MACHINE
          </h1>
          <div className="flex items-center justify-between">
            <p className="text-lg md:text-xl text-black font-semibold tracking-tight max-w-2xl leading-snug">
              Step {step} of 5
            </p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`h-4 w-10 border-4 border-black transition-all duration-300 ${i <= step ? 'bg-[#FF4444] shadow-[2px_2px_0px_0px_#000000]' : 'bg-transparent'}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white brutal-border-thick brutal-shadow p-8 md:p-12 min-h-[500px] flex flex-col">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-10 flex-1"
              >
                <StoryConfigForm
                  theme={theme}
                  onThemeChange={setTheme}
                  backstory={backstory}
                  onBackstoryChange={setBackstory}
                  uploadedFiles={uploadedFiles}
                  onUploadedFilesChange={setUploadedFiles}
                  onPreviewFile={setPreviewFile}
                  isGenerating={isGenerating}
                  isDragging={isDragging}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                />

                {/* Finding C/D: the wizard is mandatory for nobody. Both paths
                    below skip straight to the editor with a default config —
                    Next (below) stays theme-gated for the wizard itself, but
                    these are always available regardless of theme. */}
                <div className="pt-2 border-t-4 border-black flex flex-col sm:flex-row gap-4">
                  <button
                    type="button"
                    onClick={() => onStart(DEFAULT_STORY_CONFIG)}
                    disabled={isGenerating}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white text-black brutal-border-thick hover:bg-gray-100 font-bold uppercase tracking-widest brutal-shadow-hover disabled:opacity-50 disabled:pointer-events-none text-sm"
                  >
                    <FileText className="w-4 h-4" /> I Have A Script — Open The Editor
                  </button>
                  <button
                    type="button"
                    onClick={() => openFileInputRef.current?.click()}
                    disabled={isGenerating}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-white text-black brutal-border-thick hover:bg-gray-100 font-bold uppercase tracking-widest brutal-shadow-hover disabled:opacity-50 disabled:pointer-events-none text-sm"
                  >
                    <Upload className="w-4 h-4" /> Open A Script File
                  </button>
                  <input
                    type="file"
                    accept=".fountain,.txt,.fdx"
                    ref={openFileInputRef}
                    onChange={handleOpenScriptFile}
                    className="hidden"
                  />
                </div>
                {openFileError && (
                  <div className="text-xs font-mono text-red-600 border-2 border-red-600 bg-red-50 px-3 py-2 flex items-center justify-between gap-3">
                    <span>{openFileError}</span>
                    <button
                      onClick={() => setOpenFileError(null)}
                      aria-label="Dismiss"
                      className="font-bold leading-none hover:opacity-70"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1"
              >
                <ExplainerCard
                  title="Format"
                  icon={Settings}
                  options={EXPLAINERS.format}
                  selectedValue={format}
                  onSelect={(val) => setFormat(val as StoryConfig["format"])}
                />
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1"
              >
                <ExplainerCard
                  title="Structure"
                  icon={Settings}
                  options={EXPLAINERS.structure}
                  selectedValue={structure}
                  onSelect={(val) => setStructure(val as StoryConfig["structure"])}
                />
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1"
              >
                <ExplainerCard
                  title="Director Style"
                  icon={Settings}
                  options={EXPLAINERS.directorStyle}
                  selectedValue={directorStyle}
                  onSelect={(val) => setDirectorStyle(val as StoryConfig["directorStyle"])}
                />
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1"
              >
                <ExplainerCard
                  title="Emotional Arc"
                  icon={Settings}
                  options={EXPLAINERS.emotionalArc}
                  selectedValue={emotionalArc}
                  onSelect={(val) => setEmotionalArc(val as StoryConfig["emotionalArc"])}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-between items-center mt-12 pt-8 border-t-[8px] border-black">
            {step > 1 ? (
              <button
                onClick={prevStep}
                disabled={isGenerating}
                className="flex items-center gap-2 px-6 py-4 bg-white text-black brutal-border-thick hover:bg-gray-100 font-bold uppercase tracking-widest brutal-shadow-hover disabled:opacity-50 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-5 h-5" /> Back
              </button>
            ) : (
              <div></div>
            )}

            {step < 5 ? (
              <button
                onClick={nextStep}
                disabled={isGenerating || (step === 1 && !theme)}
                className="flex items-center gap-2 px-8 py-4 bg-black text-white brutal-border-thick hover:bg-[#FF4444] hover:border-[#FF4444] disabled:opacity-50 font-bold uppercase tracking-widest brutal-shadow-hover disabled:pointer-events-none"
              >
                Next <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={isGenerating}
                className="flex items-center gap-2 px-8 py-4 bg-black text-white brutal-border-thick hover:bg-[#FF4444] hover:border-[#FF4444] disabled:opacity-50 font-bold uppercase tracking-widest brutal-shadow-hover disabled:pointer-events-none"
              >
                {isGenerating ? (
                  <>
                    <Sparkles className="w-5 h-5 animate-spin" />
                    Initializing...
                  </>
                ) : (
                  <>
                    Begin Sequence <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="text-sm md:text-base text-black font-mono uppercase tracking-widest space-y-2 border-t-[8px] border-black pt-8 flex flex-col items-center">
          <button
            onClick={() => onOpenStoryMachine?.()}
            className="mb-8 px-6 py-2 bg-black text-white font-mono text-sm uppercase tracking-widest hover:bg-[#FF4444] transition-colors brutal-border-thick brutal-shadow-hover flex items-center gap-2"
          >
            <Cpu className="w-4 h-4" /> Open OASIS Story Machine
          </button>
          <p className="font-bold">Powered by Gemini 2.5 Pro</p>
          <p className="text-gray-600">
            Experience Management • Dynamic Generation • Psychological Modeling
          </p>
        </div>
      </motion.div>

      {/* File Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewFile(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white brutal-border-thick brutal-shadow w-full max-w-3xl max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b-4 border-black bg-gray-50">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-[#FF4444]" />
                  <h3 className="font-bold uppercase tracking-widest text-sm truncate max-w-[300px]">{previewFile.name}</h3>
                  <span className="text-[10px] font-mono bg-black text-white px-2 py-1 uppercase">{previewFile.category}</span>
                </div>
                <button onClick={() => setPreviewFile(null)} className="p-1 hover:bg-gray-200 transition-colors brutal-border">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto font-mono text-sm whitespace-pre-wrap text-gray-800 flex-1">
                {previewFile.content}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
