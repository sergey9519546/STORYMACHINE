import React from "react";
import { motion } from "motion/react";
import { GameState } from "../types";
import { GitCommit, GitMerge, X } from "lucide-react";

interface StoryMapProps {
  state: GameState;
  onClose: () => void;
}

export default function StoryMap({ state, onClose }: StoryMapProps) {
  const allScenes = [...state.history, state.currentScene];

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 z-50 bg-white/95 backdrop-blur-sm p-8 md:p-16 overflow-y-auto font-mono text-black"
    >
      <button
        onClick={onClose}
        className="absolute top-8 right-8 p-4 bg-black text-white brutal-border-thick brutal-shadow-hover transition-all"
      >
        <X className="w-8 h-8" />
      </button>

      <div className="max-w-4xl mx-auto space-y-12">
        <div className="border-b-[8px] border-black pb-8">
          <h2 className="text-4xl md:text-6xl font-display uppercase tracking-widest text-black">
            Narrative Topology
          </h2>
          <p className="text-lg font-bold mt-4 uppercase tracking-widest text-gray-500">
            Branched Visualization
          </p>
        </div>

        <div className="relative border-l-4 border-black ml-8 space-y-16 py-8">
          {allScenes.map((scene, index) => (
            <div key={index} className="relative pl-12 group">
              {/* Node Marker */}
              <div className="absolute -left-[14px] top-0 w-6 h-6 bg-white border-4 border-black rounded-full group-hover:bg-[#FF4444] group-hover:border-[#FF4444] transition-colors" />
              
              {/* Content */}
              <div className="bg-white brutal-border-thick brutal-shadow p-6 space-y-4">
                <div className="flex justify-between items-start border-b-2 border-black pb-4">
                  <div>
                    <span className="font-bold text-xs uppercase tracking-widest text-gray-500 block mb-1">
                      Scene {index + 1}
                    </span>
                    <h3 className="text-xl font-bold uppercase tracking-wider">
                      {scene.beat}
                    </h3>
                  </div>
                  {scene.metrics && (
                    <div className="text-right">
                      <span className="font-bold text-[10px] uppercase tracking-widest text-gray-500 block mb-1">
                        Tension
                      </span>
                      <span className="font-mono bg-black text-white px-2 py-1 text-xs">
                        {scene.metrics.suspense?.toFixed(0) || 0}
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-sm line-clamp-3 text-gray-700">
                  {scene.narrativeText}
                </p>

                {/* Choice that led here (if not first scene) */}
                {index > 0 && state.history[index - 1]?.selectedChoice && (
                  <div className="pt-4 border-t border-gray-200 mt-4">
                    <span className="font-bold text-[10px] uppercase tracking-widest text-gray-500 block mb-2 flex items-center gap-2">
                      <GitCommit className="w-3 h-3" /> Path Taken
                    </span>
                    <p className="text-xs bg-gray-100 p-2 border border-gray-300 italic">
                      {state.history[index - 1].selectedChoice!.text}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Current Node Pulse */}
          <div className="absolute -left-[14px] bottom-0 w-6 h-6 bg-[#FF4444] rounded-full animate-ping" />
        </div>
      </div>
    </motion.div>
  );
}
