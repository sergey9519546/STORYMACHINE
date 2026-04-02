import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Brain, Database, GitBranch, ChevronRight, ChevronDown, ShieldAlert, Target, EyeOff } from 'lucide-react';

import { ActiveCodexEntry } from '../types';

interface EngineVisualizerProps {
  menaceGauge: { current: number; target: number };
  trinityState: { id: number; ego: number; superego: number; activeDefense: string };
  contextState: { activeCodexEntries: ActiveCodexEntry[]; activeRules: string[] };
  graphState: { currentNode: string; isBottleneck: boolean; availablePaths: string[] };
  cognitiveIllusionRationale?: string;
  cognitiveIllusionPhase?: "Setup" | "Turn" | "Prestige";
}

export default function EngineVisualizer({
  menaceGauge,
  trinityState,
  contextState,
  graphState,
  cognitiveIllusionRationale,
  cognitiveIllusionPhase
}: EngineVisualizerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'menace' | 'trinity' | 'context' | 'graph' | 'illusion'>('menace');

  return (
    <div className={`fixed bottom-0 right-0 md:bottom-4 md:right-4 z-50 transition-all duration-300 ${isExpanded ? 'w-full md:w-96' : 'w-auto'}`}>
      {/* Header / Toggle */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full bg-white text-black p-4 flex items-center justify-between brutal-border-thick hover:bg-black hover:text-white transition-colors brutal-shadow-hover ${!isExpanded ? 'brutal-shadow' : ''}`}
      >
        <div className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest font-bold">
          <Activity className="w-5 h-5 text-[#FF4444]" />
          <span className="hidden sm:inline">Engine Telemetry</span>
        </div>
        {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white brutal-border-thick border-t-0 overflow-hidden flex flex-col max-h-[60vh] md:max-h-[500px] brutal-shadow"
          >
            {/* Tabs */}
            <div className="flex border-b-4 border-black bg-gray-100">
              <TabButton active={activeTab === 'menace'} onClick={() => setActiveTab('menace')} icon={Activity} label="Menace" />
              <TabButton active={activeTab === 'trinity'} onClick={() => setActiveTab('trinity')} icon={Brain} label="Trinity" />
              <TabButton active={activeTab === 'context'} onClick={() => setActiveTab('context')} icon={Database} label="Context" />
              <TabButton active={activeTab === 'graph'} onClick={() => setActiveTab('graph')} icon={GitBranch} label="Graph" />
              <TabButton active={activeTab === 'illusion'} onClick={() => setActiveTab('illusion')} icon={EyeOff} label="Illusion" />
            </div>

            {/* Tab Content */}
            <div className="p-4 overflow-y-auto flex-1 font-mono text-xs">
              
              {/* MENACE GAUGE */}
              {activeTab === 'menace' && (
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between mb-1 uppercase tracking-wider text-gray-500">
                      <span>Current Tension</span>
                      <span className="text-black font-bold">{Math.round(menaceGauge.current)}/100</span>
                    </div>
                    <div className="h-4 w-full bg-gray-200 border border-black relative">
                      <div 
                        className="h-full bg-[#FF4444] transition-all duration-500" 
                        style={{ width: `${menaceGauge.current}%` }}
                      />
                      {/* Target Marker */}
                      <div 
                        className="absolute top-0 bottom-0 w-1 bg-black z-10"
                        style={{ left: `${menaceGauge.target}%` }}
                        title={`Target Tension: ${Math.round(menaceGauge.target)}`}
                      >
                        <div className="absolute -top-3 -left-1.5 text-[8px] font-bold">TARGET</div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-4 border-4 border-black brutal-shadow">
                    <h4 className="uppercase font-bold mb-2 flex items-center gap-2 text-black">
                      <Target className="w-4 h-4" /> Director Delta
                    </h4>
                    <p className="text-black font-bold">
                      {menaceGauge.current < menaceGauge.target 
                        ? `Engine must ESCALATE tension by +${Math.round(menaceGauge.target - menaceGauge.current)} in the next scene.`
                        : `Engine must RELIEVE tension by -${Math.round(menaceGauge.current - menaceGauge.target)} in the next scene.`}
                    </p>
                  </div>
                </div>
              )}

              {/* TRINITY AGENT */}
              {activeTab === 'trinity' && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h4 className="uppercase font-bold text-gray-500 mb-2">Psychological Weights</h4>
                    <WeightBar label="Id (Primal)" value={trinityState.id} color="bg-red-500" />
                    <WeightBar label="Ego (Rational)" value={trinityState.ego} color="bg-blue-500" />
                    <WeightBar label="Superego (Moral)" value={trinityState.superego} color="bg-yellow-500" />
                  </div>

                  <div className="bg-white p-4 border-4 border-black brutal-shadow">
                    <h4 className="uppercase font-bold mb-2 flex items-center gap-2 text-black">
                      <ShieldAlert className="w-4 h-4 text-[#FF4444]" /> Active Defense
                    </h4>
                    <p className="text-[#FF4444] font-bold text-base uppercase">
                      {trinityState.activeDefense}
                    </p>
                    <p className="text-gray-500 mt-2 font-bold">
                      Triggered by current Menace Gauge level.
                    </p>
                  </div>
                </div>
              )}

              {/* CONTEXT ORCHESTRATOR */}
              {activeTab === 'context' && (
                <div className="space-y-4">
                  <div>
                    <h4 className="uppercase font-bold text-gray-500 mb-2">Injected Codex Entries (RAG)</h4>
                    {contextState.activeCodexEntries.length > 0 ? (
                      <ul className="space-y-2">
                        {contextState.activeCodexEntries.map((entry, i) => (
                          <li key={i} className="bg-white p-3 border-4 border-black brutal-shadow mb-4">
                            <div className="flex justify-between items-center mb-2 border-b-2 border-black pb-2">
                              <span className="font-bold text-sm">{entry.title}</span>
                              <span className="text-[10px] uppercase bg-black text-white px-2 py-1">{entry.category}</span>
                            </div>
                            <p className="text-black">{entry.content}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-400 italic">No specific lore injected for this scene.</p>
                    )}
                  </div>

                  <div className="bg-white p-4 border-4 border-black brutal-shadow">
                    <h4 className="uppercase font-bold text-black mb-3">Active Validation Rules</h4>
                    <ul className="list-none space-y-2 text-black font-bold">
                      {contextState.activeRules.map((rule, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-[#FF4444]">&gt;</span> {rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* GRAPH TOPOLOGY */}
              {activeTab === 'graph' && (
                <div className="space-y-4">
                  <div className="bg-black text-white p-4 brutal-shadow border-4 border-black">
                    <h4 className="uppercase text-gray-400 mb-2 font-bold">Current Node</h4>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-xl">{graphState.currentNode}</span>
                      {graphState.isBottleneck && (
                        <span className="bg-[#FF4444] text-white text-[10px] px-2 py-1 uppercase tracking-wider font-bold">
                          Bottleneck
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white p-4 border-4 border-black brutal-shadow">
                    <h4 className="uppercase font-bold text-black mb-3">Available Paths</h4>
                    <div className="flex flex-col gap-3">
                      {graphState.availablePaths.map((path, i) => (
                        <div key={i} className="border-2 border-black p-3 flex items-center justify-between hover:bg-black hover:text-white transition-colors cursor-default">
                          <span className="font-bold">{path}</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* COGNITIVE ILLUSION */}
              {activeTab === 'illusion' && (
                <div className="space-y-4">
                  <div className="bg-white p-4 border-4 border-black brutal-shadow">
                    <h4 className="uppercase font-bold mb-4 flex items-center gap-2 text-black border-b-4 border-black pb-2">
                      <EyeOff className="w-5 h-5" /> Cognitive Illusion Engine
                    </h4>
                    <div className="mb-4 bg-gray-100 p-2 border-2 border-black inline-block">
                      <span className="text-[10px] uppercase tracking-widest text-black font-bold mr-2">Phase:</span>
                      <span className={`font-bold uppercase ${cognitiveIllusionPhase === 'Prestige' ? 'text-[#FF4444]' : cognitiveIllusionPhase === 'Turn' ? 'text-yellow-600' : 'text-blue-600'}`}>
                        {cognitiveIllusionPhase || "Unknown"}
                      </span>
                    </div>
                    <p className="text-black font-bold leading-relaxed">
                      {cognitiveIllusionRationale || "No active cognitive illusion rationale provided by the Director for this scene."}
                    </p>
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors border-r-4 border-black last:border-r-0 brutal-shadow-hover ${
        active ? 'bg-black text-white' : 'text-black hover:bg-gray-200'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-[10px] uppercase font-bold tracking-wider">{label}</span>
    </button>
  );
}

function WeightBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold mb-1 text-black">
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <div className="h-4 w-full bg-white border-2 border-black">
        <div className={`h-full ${color} transition-all duration-500 border-r-2 border-black`} style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}
