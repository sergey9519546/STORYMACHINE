import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Settings, FileText, X, ChevronRight, ChevronLeft, Cpu } from "lucide-react";
import { StoryConfig } from "../types";
import { EXPLAINERS } from "./startscreen/explainers.config";
import { ExplainerCard } from "./startscreen/ExplainerCard";
import { StoryConfigForm, UploadedFile } from "./startscreen/StoryConfigForm";

interface StartScreenProps {
  onStart: (config: StoryConfig) => void;
  isGenerating: boolean;
  onOpenStoryMachine?: () => void;
}

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
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
