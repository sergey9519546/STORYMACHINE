import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GameState, Choice, CinematicComposition } from "../types";
import { Volume2, VolumeX, Loader2, Activity, EyeOff, ChevronDown, ChevronUp } from "lucide-react";
import EngineVisualizer from "./EngineVisualizer";

const getCinematicStyles = (composition: CinematicComposition) => {
  let filter = "grayscale(100%) contrast(125%)"; // default base
  let transform = "scale(1)";
  
  const palette = composition.colorPalette.toLowerCase();
  if (palette.includes("neon") || palette.includes("vibrant")) filter = "saturate(150%) contrast(120%)";
  else if (palette.includes("muted") || palette.includes("desaturated")) filter = "grayscale(50%) contrast(110%) sepia(20%)";
  else if (palette.includes("monochromatic")) filter = "grayscale(100%) contrast(150%)";
  else if (palette.includes("warm")) filter = "sepia(40%) contrast(110%) saturate(120%)";
  
  const lighting = composition.lighting.toLowerCase();
  if (lighting.includes("chiaroscuro") || lighting.includes("harsh") || lighting.includes("dark")) filter += " brightness(0.8) contrast(140%)";
  else if (lighting.includes("natural") || lighting.includes("soft")) filter += " brightness(1.05) contrast(100%)";

  const angle = composition.cameraAngle.toLowerCase();
  if (angle.includes("dutch")) transform = "rotate(-3deg) scale(1.05)";
  else if (angle.includes("low")) transform = "scale(1.05) translateY(-2%)";
  else if (angle.includes("high")) transform = "scale(1.05) translateY(2%)";

  return { filter, transform };
};

interface StoryScreenProps {
  state: GameState;
  onChoice: (choice: Choice, deliberationTimeMs: number) => void;
  isGenerating: boolean;
}

export default function StoryScreen({
  state,
  onChoice,
  isGenerating,
}: StoryScreenProps) {
  const { currentScene, directorState } = state;
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSubtext, setShowSubtext] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sceneStartTimeRef = useRef<number>(Date.now());

  // Reset timer when scene changes
  useEffect(() => {
    sceneStartTimeRef.current = Date.now();
  }, [currentScene.narrativeText]);

  useEffect(() => {
    if (currentScene.audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(currentScene.audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
      // Auto-play might be blocked by browser, so we don't force it.
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [currentScene.audioUrl]);

  const toggleAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleChoiceClick = (choice: Choice) => {
    const deliberationTimeMs = Date.now() - sceneStartTimeRef.current;
    onChoice(choice, deliberationTimeMs);
  };

  const getScopeColor = (scope: string) => {
    switch (scope) {
      case "crisis": return "text-red-600 border-red-600";
      case "macro": return "text-orange-600 border-orange-600";
      default: return "text-gray-500 border-gray-500";
    }
  };

  // Map state to EngineVisualizer props
  const menaceGaugeData = {
    current: directorState.menaceGauge || 0,
    target: directorState.tensionLevel || 50
  };

  const trinityStateData = {
    id: currentScene.commentary?.evaluatorScores?.narrator || 0.3,
    ego: currentScene.commentary?.evaluatorScores?.ego || 0.6,
    superego: currentScene.commentary?.evaluatorScores?.superego || 0.4,
    activeDefense: state.protagonist.psychology.defenseMechanisms?.[0] || 'rationalization'
  };

  const contextStateData = {
    activeCodexEntries: directorState.activeCodexEntries || [],
    activeRules: ["Show, don't tell", "Maintain epistemic dissonance", "No inner monologue"]
  };

  const graphStateData = {
    currentNode: directorState.structuralNode || 'Inciting Incident',
    isBottleneck: true,
    availablePaths: currentScene.choices.map(c => c.text)
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white text-black font-sans">
      {/* Engine Visualizer Overlay */}
      <EngineVisualizer 
        menaceGauge={menaceGaugeData}
        trinityState={trinityStateData}
        contextState={contextStateData}
        graphState={graphStateData}
        cognitiveIllusionRationale={currentScene.commentary?.cognitiveIllusionRationale}
        cognitiveIllusionPhase={currentScene.commentary?.cognitiveIllusionPhase}
      />

      {/* Cognitive Dashboard HUD */}
      <div className="w-full bg-black text-white z-50 flex items-center justify-between px-4 md:px-6 py-3 font-mono text-[10px] md:text-xs uppercase tracking-widest border-b-[8px] border-black shrink-0 relative">
        <div className="absolute inset-0 bg-[#FF4444] h-1 bottom-0 top-auto"></div>
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 hidden sm:inline">Node:</span>
            <span className="font-bold text-[#FF4444]">{directorState.structuralNode || "UNKNOWN"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 hidden sm:inline">Tension Space:</span>
            <span className="font-bold">{directorState.tensionSpace?.toFixed(2) || "0.00"}</span>
          </div>
          {currentScene.commentary?.cognitiveIllusionPhase && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 hidden sm:inline">Phase:</span>
              <span className={`font-bold ${currentScene.commentary.cognitiveIllusionPhase === 'Prestige' ? 'text-[#FF4444]' : currentScene.commentary.cognitiveIllusionPhase === 'Turn' ? 'text-yellow-500' : 'text-blue-500'}`}>
                {currentScene.commentary.cognitiveIllusionPhase}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 hidden md:inline">Menace Gauge</span>
          <div className="w-16 sm:w-24 md:w-32 h-3 bg-white border-2 border-black">
            <div 
              className="h-full bg-[#FF4444] transition-all duration-500 border-r-2 border-black" 
              style={{ width: `${directorState.menaceGauge || 0}%` }}
            />
          </div>
          <span className="font-bold text-[#FF4444]">{directorState.menaceGauge || 0}%</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Visual Engine Output */}
        <div className="w-full md:w-1/2 h-1/2 md:h-full relative border-b-[8px] md:border-b-0 md:border-r-[8px] border-black">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScene.imageUrl || "loading"}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ 
              opacity: 1, 
              scale: getCinematicStyles(currentScene.composition).transform.includes("scale(1.05)") ? 1.05 : 1,
              rotate: getCinematicStyles(currentScene.composition).transform.includes("rotate") ? -3 : 0,
              y: getCinematicStyles(currentScene.composition).transform.includes("translateY(2%)") ? "2%" : getCinematicStyles(currentScene.composition).transform.includes("translateY(-2%)") ? "-2%" : "0%"
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url(${currentScene.imageUrl || "https://picsum.photos/seed/dark/1920/1080?blur=10"})`,
              filter: getCinematicStyles(currentScene.composition).filter,
            }}
          />
        </AnimatePresence>

        {/* Brutalist Overlay */}
        <div className="absolute inset-0 bg-black/5 mix-blend-multiply" />
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #000 2px, transparent 2px)', backgroundSize: '32px 32px', opacity: 0.1 }}></div>

        {/* Audio Control */}
        {currentScene.audioUrl && (
          <button
            onClick={toggleAudio}
            className="absolute top-8 right-8 p-4 bg-white brutal-border-thick brutal-shadow brutal-shadow-hover transition-all text-black z-10"
          >
            {isPlaying ? (
              <Volume2 className="w-8 h-8" />
            ) : (
              <VolumeX className="w-8 h-8" />
            )}
          </button>
        )}

        {/* Beat Indicator */}
        <div className="absolute top-8 left-8 flex flex-col gap-4 z-10">
          <div className="px-6 py-3 bg-white brutal-border-thick brutal-shadow font-mono text-base uppercase tracking-widest text-black font-bold">
            Beat: {currentScene.beat}
          </div>
          <div className="px-6 py-3 bg-white brutal-border-thick brutal-shadow font-mono text-sm uppercase tracking-widest text-black flex items-center gap-2">
            <Activity className="w-4 h-4" /> Tension: {directorState.tensionLevel ?? 0}%
          </div>
          {directorState.unreliableNarratorScore > 50 && (
            <div className="px-6 py-3 bg-black text-white brutal-border-thick brutal-shadow font-mono text-sm uppercase tracking-widest flex items-center gap-2">
              <EyeOff className="w-4 h-4" /> Unreliable
            </div>
          )}
        </div>
      </div>

      {/* Narrative & Choices */}
      <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col p-10 md:p-16 overflow-y-auto relative bg-white">
        <div className="flex-1 max-w-3xl mx-auto w-full space-y-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentScene.narrativeText}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              className="bg-white brutal-border-thick p-8 md:p-12 brutal-shadow font-serif text-xl md:text-3xl text-black leading-relaxed whitespace-pre-wrap space-y-4"
            >
              {currentScene.narrativeText}
            </motion.div>
          </AnimatePresence>

          {/* Subtext Analysis (if dialogue exists) */}
          {currentScene.dialogue && currentScene.dialogue.length > 0 && (
            <div className="mt-8 bg-white brutal-border-thick brutal-shadow">
              <button
                onClick={() => setShowSubtext(!showSubtext)}
                className="w-full p-4 flex justify-between items-center font-mono font-bold uppercase tracking-widest text-xs hover:bg-black hover:text-white transition-colors"
              >
                <span>Subtext Analysis</span>
                {showSubtext ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              <AnimatePresence>
                {showSubtext && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t-4 border-black"
                  >
                    <div className="p-6 space-y-6">
                      {currentScene.dialogue.map((line, idx) => (
                        <div key={idx} className="space-y-2 text-xs font-mono">
                          <div className="font-bold uppercase text-lg bg-black text-white inline-block px-2 py-1">{line.speaker}</div>
                          <div className="text-black text-base border-l-4 border-[#FF4444] pl-4 py-1">"<span className="italic">{line.surfaceText}</span>"</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 bg-gray-100 p-4 brutal-border">
                            <div><span className="font-bold text-gray-500 block mb-1">INTENTION</span> {line.intention}</div>
                            <div><span className="font-bold text-gray-500 block mb-1">BARRIER</span> {line.barrier}</div>
                            <div className="md:col-span-2"><span className="font-bold text-gray-500 block mb-1">SUBTEXT</span> {line.subtextField}</div>
                            <div className="md:col-span-2"><span className="font-bold text-gray-500 block mb-1">POWER DYNAMIC</span> {line.powerDynamic}</div>
                          </div>
                          {idx < currentScene.dialogue.length - 1 && <div className="border-b-4 border-black my-6" />}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Choices */}
          <div className="space-y-8 pt-16 border-t-[8px] border-black">
            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-16 space-y-8 text-black brutal-border-thick p-8 brutal-shadow">
                <Loader2 className="w-16 h-16 animate-spin" />
                <p className="font-display text-4xl uppercase tracking-widest">
                  Processing...
                </p>
              </div>
            ) : (
              currentScene.choices.map((choice, idx) => (
                <motion.button
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => handleChoiceClick(choice)}
                  className="w-full text-left p-8 bg-white brutal-border-thick brutal-shadow brutal-shadow-hover transition-all group relative overflow-hidden flex flex-col gap-2 hover:bg-black"
                >
                  <div className="relative z-10 flex justify-between items-start">
                    <div className="flex flex-col gap-4">
                      <p className="font-mono text-xl md:text-2xl uppercase text-black group-hover:text-white transition-colors duration-200 flex items-start gap-3">
                        <span className="text-[#FF4444] opacity-0 group-hover:opacity-100 transition-opacity">&gt;</span>
                        <span>{choice.text}</span>
                        <span className="inline-block w-3 h-6 bg-[#FF4444] opacity-0 group-hover:animate-blink ml-1 align-middle"></span>
                      </p>
                      {choice.taxonomy && (
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-1 border-2 ${
                            choice.taxonomy === 'didactic' ? 'border-blue-500 text-blue-600 group-hover:border-blue-400 group-hover:text-blue-400' :
                            choice.taxonomy === 'reflective' ? 'border-[#FF4444] text-[#FF4444] group-hover:border-[#FF4444] group-hover:text-[#FF4444]' :
                            'border-green-500 text-green-600 group-hover:border-green-400 group-hover:text-green-400'
                          }`}>
                            {choice.taxonomy}
                          </span>
                        </div>
                      )}
                    </div>
                    <span className={`text-xs font-mono uppercase tracking-widest border-2 px-2 py-1 ${getScopeColor(choice.consequenceScope)} group-hover:border-white group-hover:text-white transition-colors shrink-0`}>
                      {choice.consequenceScope || "micro"}
                    </span>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
