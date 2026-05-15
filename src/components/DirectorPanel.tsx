import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "motion/react";
import { GameState, Choice } from "../types";
import {
  Brain,
  Heart,
  Activity,
  ShieldCheck,
  Eye,
  Zap,
  Clapperboard,
  BarChart,
  MessageSquare,
  GitBranch
} from "lucide-react";

interface DirectorPanelProps {
  state: GameState;
  onUpdateState: (newState: GameState) => void;
}

export default function DirectorPanel({
  state,
  onUpdateState,
}: DirectorPanelProps) {
  const { protagonist, directorState, currentScene } = state;

  const updateProtagonist = (
    field: keyof typeof protagonist,
    value: string,
  ) => {
    onUpdateState({
      ...state,
      protagonist: { ...protagonist, [field]: value },
    });
  };

  const updateArcMeter = (
    field: keyof typeof directorState.arcMeter,
    value: number,
  ) => {
    onUpdateState({
      ...state,
      directorState: {
        ...directorState,
        arcMeter: { ...directorState.arcMeter, [field]: value },
      },
    });
  };

  const updatePlayerModel = (
    field: keyof typeof directorState.playerModel,
    value: string | number,
  ) => {
    onUpdateState({
      ...state,
      directorState: {
        ...directorState,
        playerModel: { ...directorState.playerModel, [field]: value },
      },
    });
  };

  const updateBigFive = (
    field: keyof typeof directorState.playerModel.bigFive,
    value: number,
  ) => {
    onUpdateState({
      ...state,
      directorState: {
        ...directorState,
        playerModel: {
          ...directorState.playerModel,
          bigFive: { ...directorState.playerModel.bigFive, [field]: value },
        },
      },
    });
  };

  const updateComposition = (
    field: keyof typeof currentScene.composition,
    value: string,
  ) => {
    onUpdateState({
      ...state,
      currentScene: {
        ...currentScene,
        composition: { ...currentScene.composition, [field]: value },
      },
    });
  };

  const updateQuality = (
    field: keyof typeof directorState.qualityValidation,
    value: string | boolean,
  ) => {
    onUpdateState({
      ...state,
      directorState: {
        ...directorState,
        qualityValidation: {
          ...directorState.qualityValidation,
          [field]: value,
        },
      },
    });
  };

  const updateMemory = (
    field: keyof typeof directorState.memory,
    value: string,
  ) => {
    onUpdateState({
      ...state,
      directorState: {
        ...directorState,
        memory: {
          ...directorState.memory,
          [field]: value.split("\n").filter((s) => s.trim() !== ""),
        },
      },
    });
  };

  const updateScene = (field: keyof typeof currentScene, value: string) => {
    onUpdateState({
      ...state,
      currentScene: {
        ...currentScene,
        [field]: value,
      },
    });
  };

  const updateChoice = (index: number, field: keyof Choice, value: string) => {
    const newChoices = [...currentScene.choices];
    newChoices[index] = { ...newChoices[index], [field]: value };
    onUpdateState({
      ...state,
      currentScene: {
        ...currentScene,
        choices: newChoices,
      },
    });
  };

  const addChoice = () => {
    onUpdateState({
      ...state,
      currentScene: {
        ...currentScene,
        choices: [
          ...currentScene.choices,
          { text: "New Choice", intent: "New Intent", consequenceScope: "micro", taxonomy: "exploratory" },
        ],
      },
    });
  };

  const removeChoice = (index: number) => {
    const newChoices = [...currentScene.choices];
    newChoices.splice(index, 1);
    onUpdateState({
      ...state,
      currentScene: {
        ...currentScene,
        choices: newChoices,
      },
    });
  };

  const [activeTab, setActiveTab] = useState<string>("scene");
  const [availableIndices, setAvailableIndices] = useState<Set<number>>(new Set(currentScene.choices.map((_, i) => i)));
  const filterRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const choicesKey = useMemo(() => JSON.stringify(currentScene.choices), [currentScene.choices]);
  const qualitiesKey = useMemo(() => JSON.stringify(directorState.qbnQualities), [directorState.qbnQualities]);

  useEffect(() => {
    if (filterRef.current) clearTimeout(filterRef.current);
    abortRef.current?.abort();
    filterRef.current = setTimeout(() => {
      const choices = currentScene.choices;
      if (choices.length === 0) { setAvailableIndices(new Set()); return; }
      const controller = new AbortController();
      abortRef.current = controller;
      fetch('/api/qbn/filter-choices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choices, qualities: directorState.qbnQualities ?? {} }),
        signal: controller.signal,
      })
        .then(r => r.json())
        .then((data: { available: Choice[] }) => {
          const availTexts = new Set((data.available ?? []).map(c => c.text));
          setAvailableIndices(new Set(choices.map((c, i) => availTexts.has(c.text) ? i : -1).filter(i => i >= 0)));
        })
        .catch(err => { if (err.name !== 'AbortError') setAvailableIndices(new Set(choices.map((_, i) => i))); });
    }, 400);
    return () => {
      if (filterRef.current) clearTimeout(filterRef.current);
      abortRef.current?.abort();
    };
  }, [choicesKey, qualitiesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const SegmentedMeter = ({ value, onChange, max = 100, segments = 10 }: { value: number, onChange: (v: number) => void, max?: number, segments?: number }) => {
    const filledSegments = Math.round((value / max) * segments);
    return (
      <div className="flex gap-1 w-full cursor-pointer h-6" onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        onChange(Math.round(percentage * max));
      }}>
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 border-2 border-black transition-colors ${i < filledSegments ? 'bg-[#FF4444]' : 'bg-transparent hover:bg-gray-200'}`}
          />
        ))}
      </div>
    );
  };

  const inputClass =
    "w-full bg-white brutal-border-thick px-3 py-2 mt-1 text-black focus:outline-none focus:ring-0 focus:bg-gray-50 font-mono text-sm brutal-shadow-focus";
  const textareaClass =
    "w-full bg-white brutal-border-thick px-3 py-2 mt-1 text-black focus:outline-none focus:ring-0 focus:bg-gray-50 min-h-[80px] resize-y font-mono text-sm brutal-shadow-focus";

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed top-0 right-0 w-[500px] h-screen bg-white brutal-border-thick text-black p-8 overflow-y-auto font-mono text-sm z-50 brutal-shadow"
    >
      <div className="flex items-center gap-4 mb-6 pb-4 border-b-[8px] border-black">
        <Brain className="w-8 h-8 text-black" />
        <h2 className="text-2xl font-display uppercase tracking-widest text-black">
          AI Director State
        </h2>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {[
          { id: "scene", label: "Scene", icon: Clapperboard },
          { id: "metrics", label: "Metrics", icon: BarChart },
          { id: "commentary", label: "Commentary", icon: MessageSquare },
          { id: "throughlines", label: "Throughlines", icon: GitBranch },
          { id: "character", label: "Character", icon: Eye },
          { id: "psychology", label: "Psychology", icon: Brain },
          { id: "arc", label: "Arc", icon: Activity },
          { id: "player", label: "Player", icon: Heart },
          { id: "quality", label: "Quality", icon: ShieldCheck },
          { id: "memory", label: "Memory", icon: Zap },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-xs font-bold uppercase tracking-widest brutal-border-thick transition-colors flex items-center gap-2 brutal-shadow-hover ${
              activeTab === tab.id
                ? "bg-[#FF4444] text-white border-[#FF4444]"
                : "bg-white text-black hover:bg-gray-100"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-12 pb-24">
        {/* Current Scene */}
        {activeTab === "scene" && (
        <section className="space-y-4">
          <div className="bg-white p-6 brutal-border-thick brutal-shadow space-y-5">
            <div>
              <label className="text-black font-bold uppercase tracking-wider text-xs">Narrative Text:</label>
              <textarea
                value={currentScene.narrativeText}
                onChange={(e) => updateScene("narrativeText", e.target.value)}
                className={textareaClass}
                rows={4}
              />
            </div>
            <div>
              <label className="text-black font-bold uppercase tracking-wider text-xs">Image Prompt:</label>
              <textarea
                value={currentScene.imagePrompt}
                onChange={(e) => updateScene("imagePrompt", e.target.value)}
                className={textareaClass}
                rows={3}
              />
            </div>
            <div>
              <label className="text-black font-bold uppercase tracking-wider text-xs">Audio Dialogue:</label>
              <textarea
                value={currentScene.audioDialogue}
                onChange={(e) => updateScene("audioDialogue", e.target.value)}
                className={textareaClass}
                rows={2}
              />
            </div>
            <div>
              <label className="text-black font-bold uppercase tracking-wider text-xs">Beat:</label>
              <input
                type="text"
                value={currentScene.beat}
                onChange={(e) => updateScene("beat", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-black font-bold uppercase tracking-wider text-xs">Information Position:</label>
              <select
                value={currentScene.informationPosition || "parity"}
                onChange={(e) => updateScene("informationPosition", e.target.value)}
                className={inputClass}
              >
                <option value="superior">Superior (Audience knows more)</option>
                <option value="inferior">Inferior (Characters know more)</option>
                <option value="parity">Parity (Audience = Characters)</option>
              </select>
            </div>
            {currentScene.isQBNMode && (
              <div className="bg-black text-white p-3 brutal-border-thick font-bold uppercase tracking-widest text-xs">
                QBN Mode Active (Investigation)
              </div>
            )}
            {currentScene.comedyMisdirection && (
              <div className="bg-yellow-400 text-black p-3 brutal-border-thick font-bold uppercase tracking-widest text-xs">
                Comedy Misdirection: {currentScene.comedyMisdirection.replace('_', ' ')}
              </div>
            )}
            <div>
              <label className="text-black font-bold uppercase tracking-wider text-xs">Composition:</label>
              <div className="space-y-3 mt-2">
                <div>
                  <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                    Camera Angle
                  </label>
                  <input
                    type="text"
                    value={currentScene.composition.cameraAngle}
                    onChange={(e) =>
                      updateComposition("cameraAngle", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                    Shot Type
                  </label>
                  <input
                    type="text"
                    value={currentScene.composition.shotType}
                    onChange={(e) =>
                      updateComposition("shotType", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                    Lighting
                  </label>
                  <input
                    type="text"
                    value={currentScene.composition.lighting}
                    onChange={(e) =>
                      updateComposition("lighting", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                    Color Palette
                  </label>
                  <input
                    type="text"
                    value={currentScene.composition.colorPalette}
                    onChange={(e) =>
                      updateComposition("colorPalette", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t-[4px] border-black">
              <div className="flex justify-between items-center mb-4">
                <label className="text-black font-bold uppercase tracking-wider text-xs">Choices:</label>
                <button
                  onClick={addChoice}
                  className="px-3 py-2 bg-black text-white brutal-border-thick hover:bg-white hover:text-black transition-colors uppercase font-bold tracking-widest text-xs brutal-shadow-hover"
                >
                  + Add
                </button>
              </div>
              <div className="space-y-4">
                {currentScene.choices.map((choice, idx) => (
                  <div
                    key={idx}
                    className={`bg-white p-4 brutal-border-thick brutal-shadow relative ${!availableIndices.has(idx) ? 'opacity-60' : ''}`}
                  >
                    {!availableIndices.has(idx) && (
                      <span className="absolute top-2 left-2 bg-[#FF4444] text-white text-[8px] px-2 py-0.5 font-bold uppercase tracking-widest">LOCKED</span>
                    )}
                    <button
                      onClick={() => removeChoice(idx)}
                      className="absolute top-2 right-2 text-black hover:text-gray-500 font-bold text-2xl leading-none"
                    >
                      ×
                    </button>
                    <div className="mb-3 pr-6">
                      <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                        Text
                      </label>
                      <input
                        type="text"
                        value={choice.text}
                        onChange={(e) =>
                          updateChoice(idx, "text", e.target.value)
                        }
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                        Intent
                      </label>
                      <input
                        type="text"
                        value={choice.intent}
                        onChange={(e) =>
                          updateChoice(idx, "intent", e.target.value)
                        }
                        className={inputClass}
                      />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                          Scope
                        </label>
                        <select
                          value={choice.consequenceScope}
                          onChange={(e) =>
                            updateChoice(idx, "consequenceScope", e.target.value)
                          }
                          className={inputClass}
                        >
                          <option value="micro">Micro</option>
                          <option value="macro">Macro</option>
                          <option value="crisis">Crisis</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                          Taxonomy
                        </label>
                        <select
                          value={choice.taxonomy || "exploratory"}
                          onChange={(e) =>
                            updateChoice(idx, "taxonomy", e.target.value)
                          }
                          className={inputClass}
                        >
                          <option value="didactic">Didactic</option>
                          <option value="reflective">Reflective</option>
                          <option value="exploratory">Exploratory</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        )}

        {/* Protagonist Profile */}
        {activeTab === "character" && (
        <section className="space-y-4">
          <div className="bg-white p-6 brutal-border-thick brutal-shadow space-y-5">
            <div>
              <label className="text-black font-bold uppercase tracking-wider text-xs">Name:</label>
              <input
                type="text"
                value={protagonist.name}
                onChange={(e) => updateProtagonist("name", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-black font-bold uppercase tracking-wider text-xs">Ghost:</label>
              <textarea
                value={protagonist.ghost}
                onChange={(e) => updateProtagonist("ghost", e.target.value)}
                className={textareaClass}
              />
            </div>
            <div>
              <label className="text-black font-bold uppercase tracking-wider text-xs">Lie:</label>
              <textarea
                value={protagonist.lie}
                onChange={(e) => updateProtagonist("lie", e.target.value)}
                className={textareaClass}
              />
            </div>
            <div>
              <label className="text-black font-bold uppercase tracking-wider text-xs">Want:</label>
              <textarea
                value={protagonist.want}
                onChange={(e) => updateProtagonist("want", e.target.value)}
                className={textareaClass}
              />
            </div>
            <div>
              <label className="text-black font-bold uppercase tracking-wider text-xs">Need:</label>
              <textarea
                value={protagonist.need}
                onChange={(e) => updateProtagonist("need", e.target.value)}
                className={textareaClass}
              />
            </div>
          </div>
        </section>
        )}

        {/* Psychology */}
        {activeTab === "psychology" && (
          <section className="space-y-4">
            <div className="bg-white p-6 brutal-border-thick brutal-shadow space-y-6">
              <h3 className="font-display text-xl uppercase tracking-widest border-b-[4px] border-black pb-2">
                Dark Triad
              </h3>
              
              <div>
                <div className="flex justify-between mb-2 font-bold uppercase tracking-widest text-xs">
                  <label>Machiavellianism</label>
                  <span>{protagonist.psychology.darkTriad?.machiavellianism || 0}%</span>
                </div>
                <SegmentedMeter
                  value={protagonist.psychology.darkTriad?.machiavellianism || 0}
                  onChange={(v) => onUpdateState({
                    ...state,
                    protagonist: {
                      ...protagonist,
                      psychology: {
                        ...protagonist.psychology,
                        darkTriad: { ...protagonist.psychology.darkTriad, machiavellianism: v }
                      }
                    }
                  })}
                />
              </div>

              <div>
                <div className="flex justify-between mb-2 font-bold uppercase tracking-widest text-xs">
                  <label>Narcissism</label>
                  <span>{protagonist.psychology.darkTriad?.narcissism || 0}%</span>
                </div>
                <SegmentedMeter
                  value={protagonist.psychology.darkTriad?.narcissism || 0}
                  onChange={(v) => onUpdateState({
                    ...state,
                    protagonist: {
                      ...protagonist,
                      psychology: {
                        ...protagonist.psychology,
                        darkTriad: { ...protagonist.psychology.darkTriad, narcissism: v }
                      }
                    }
                  })}
                />
              </div>

              <div>
                <div className="flex justify-between mb-2 font-bold uppercase tracking-widest text-xs">
                  <label>Psychopathy</label>
                  <span>{protagonist.psychology.darkTriad?.psychopathy || 0}%</span>
                </div>
                <SegmentedMeter
                  value={protagonist.psychology.darkTriad?.psychopathy || 0}
                  onChange={(v) => onUpdateState({
                    ...state,
                    protagonist: {
                      ...protagonist,
                      psychology: {
                        ...protagonist.psychology,
                        darkTriad: { ...protagonist.psychology.darkTriad, psychopathy: v }
                      }
                    }
                  })}
                />
              </div>

              <h3 className="font-display text-xl uppercase tracking-widest border-b-[4px] border-black pb-2 mt-8">
                Core Profile
              </h3>

              <div>
                <label className="text-black font-bold uppercase tracking-wider text-xs">Attachment Style:</label>
                <select
                  value={protagonist.psychology.attachmentStyle || "secure"}
                  onChange={(e) => onUpdateState({
                    ...state,
                    protagonist: {
                      ...protagonist,
                      psychology: { ...protagonist.psychology, attachmentStyle: e.target.value as 'secure' | 'anxious' | 'avoidant' | 'anxious_avoidant' }
                    }
                  })}
                  className={inputClass}
                >
                  <option value="secure">Secure</option>
                  <option value="anxious">Anxious-Preoccupied</option>
                  <option value="avoidant">Dismissive-Avoidant</option>
                  <option value="anxious_avoidant">Fearful-Avoidant</option>
                </select>
              </div>

              <div>
                <label className="text-black font-bold uppercase tracking-wider text-xs">Formative Wound:</label>
                <textarea
                  value={protagonist.psychology.formativeWound || ""}
                  onChange={(e) => onUpdateState({
                    ...state,
                    protagonist: {
                      ...protagonist,
                      psychology: { ...protagonist.psychology, formativeWound: e.target.value }
                    }
                  })}
                  className={textareaClass}
                  rows={2}
                />
              </div>

            </div>
          </section>
        )}

        {/* Arc Meter & Tension */}
        {activeTab === "arc" && (
        <section className="space-y-4">
          <div className="bg-white p-6 brutal-border-thick brutal-shadow space-y-6">
            <div>
              <label className="text-black font-bold uppercase tracking-wider text-xs">Structural Node:</label>
              <input
                type="text"
                value={directorState.structuralNode || ""}
                onChange={(e) =>
                  onUpdateState({
                    ...state,
                    directorState: { ...directorState, structuralNode: e.target.value },
                  })
                }
                className={inputClass}
              />
            </div>
            <div>
              <div className="flex justify-between mb-2 font-bold uppercase tracking-widest text-xs">
                <label>Tension Level</label>
                <span>{directorState.tensionLevel ?? 0}%</span>
              </div>
              <SegmentedMeter
                value={directorState.tensionLevel ?? 0}
                onChange={(v) =>
                  onUpdateState({
                    ...state,
                    directorState: { ...directorState, tensionLevel: v },
                  })
                }
              />
            </div>
            <div>
              <div className="flex justify-between mb-2 font-bold uppercase tracking-widest text-xs">
                <label>Menace Gauge</label>
                <span>{directorState.menaceGauge ?? 0}%</span>
              </div>
              <SegmentedMeter
                value={directorState.menaceGauge ?? 0}
                onChange={(v) =>
                  onUpdateState({
                    ...state,
                    directorState: { ...directorState, menaceGauge: v },
                  })
                }
              />
            </div>
            <div>
              <div className="flex justify-between mb-2 font-bold uppercase tracking-widest text-xs">
                <label>Tension Space</label>
                <span>{directorState.tensionSpace ?? 0}%</span>
              </div>
              <SegmentedMeter
                value={directorState.tensionSpace ?? 0}
                onChange={(v) =>
                  onUpdateState({
                    ...state,
                    directorState: { ...directorState, tensionSpace: v },
                  })
                }
              />
            </div>
            <div>
              <div className="flex justify-between mb-2 font-bold uppercase tracking-widest text-xs">
                <label>Unreliable Narrator Score</label>
                <span>{directorState.unreliableNarratorScore ?? 0}%</span>
              </div>
              <SegmentedMeter
                value={directorState.unreliableNarratorScore ?? 0}
                onChange={(v) =>
                  onUpdateState({
                    ...state,
                    directorState: { ...directorState, unreliableNarratorScore: v },
                  })
                }
              />
            </div>
            <div className="pt-4 border-t-[4px] border-black">
              <div className="flex justify-between mb-2 font-bold uppercase tracking-widest text-xs">
                <label>Lie Belief</label>
                <span>{directorState.arcMeter.lieBelief}%</span>
              </div>
              <SegmentedMeter
                value={directorState.arcMeter.lieBelief}
                onChange={(v) => updateArcMeter("lieBelief", v)}
              />
            </div>
            <div>
              <div className="flex justify-between mb-2 font-bold uppercase tracking-widest text-xs">
                <label>Need Awareness</label>
                <span>{directorState.arcMeter.needAwareness}%</span>
              </div>
              <SegmentedMeter
                value={directorState.arcMeter.needAwareness}
                onChange={(v) => updateArcMeter("needAwareness", v)}
              />
            </div>
            <div>
              <div className="flex justify-between mb-2 font-bold uppercase tracking-widest text-xs">
                <label>Internal Conflict</label>
                <span>{directorState.arcMeter.internalConflict}%</span>
              </div>
              <SegmentedMeter
                value={directorState.arcMeter.internalConflict}
                onChange={(v) => updateArcMeter("internalConflict", v)}
              />
            </div>
          </div>
        </section>
        )}

        {/* Narrative Metrics */}
        {activeTab === "metrics" && currentScene.metrics && (
          <section className="space-y-4">
            <div className="bg-white p-6 brutal-border-thick brutal-shadow space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs uppercase tracking-widest">Pivot Strength</span>
                <span className="font-mono bg-black text-white px-2 py-1">{currentScene.metrics.pivotStrength?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs uppercase tracking-widest">Cliffhanger Strength</span>
                <span className="font-mono bg-black text-white px-2 py-1">{currentScene.metrics.cliffhangerStrength?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs uppercase tracking-widest">Twist Impact</span>
                <span className="font-mono bg-black text-white px-2 py-1">{currentScene.metrics.twistImpact?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs uppercase tracking-widest">Surprise</span>
                <span className="font-mono bg-black text-white px-2 py-1">{currentScene.metrics.surprise?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs uppercase tracking-widest">Suspense</span>
                <span className="font-mono bg-black text-white px-2 py-1">{currentScene.metrics.suspense?.toFixed(2)}</span>
              </div>
            </div>
          </section>
        )}

        {/* Director Commentary */}
        {activeTab === "commentary" && currentScene.commentary && (
          <section className="space-y-4">
            <div className="bg-white p-6 brutal-border-thick brutal-shadow space-y-4">
              <div>
                <span className="font-bold text-xs uppercase tracking-widest block mb-1">Tension Rationale</span>
                <p className="text-sm">{currentScene.commentary.tensionRationale}</p>
              </div>
              <div>
                <span className="font-bold text-xs uppercase tracking-widest block mb-1">Information Position Rationale</span>
                <p className="text-sm">{currentScene.commentary.informationPositionRationale}</p>
              </div>
              <div>
                <span className="font-bold text-xs uppercase tracking-widest block mb-1">Defense Mechanism Rationale</span>
                <p className="text-sm">{currentScene.commentary.defenseMechanismRationale}</p>
              </div>
              <div>
                <span className="font-bold text-xs uppercase tracking-widest block mb-1">Throughline Rationale</span>
                <p className="text-sm">{currentScene.commentary.throughlineRationale}</p>
              </div>
              
              <div className="pt-4 border-t-[4px] border-black">
                <span className="font-bold text-xs uppercase tracking-widest block mb-3">Evaluator Scores</span>
                <div className="grid grid-cols-2 gap-2 text-xs font-bold uppercase">
                  <div className="flex justify-between"><span>Ego:</span> <span>{currentScene.commentary.evaluatorScores?.ego}</span></div>
                  <div className="flex justify-between"><span>Superego:</span> <span>{currentScene.commentary.evaluatorScores?.superego}</span></div>
                  <div className="flex justify-between"><span>Narrator:</span> <span>{currentScene.commentary.evaluatorScores?.narrator}</span></div>
                  <div className="flex justify-between"><span>Audience:</span> <span>{currentScene.commentary.evaluatorScores?.audience}</span></div>
                  <div className="flex justify-between col-span-2"><span>Storymind:</span> <span>{currentScene.commentary.evaluatorScores?.storymind}</span></div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Throughlines */}
        {activeTab === "throughlines" && directorState.throughlines && (
          <section className="space-y-4">
            <div className="bg-white p-6 brutal-border-thick brutal-shadow space-y-4">
              <div className={`p-3 border-2 border-black ${directorState.throughlines.activeThroughlines?.includes("objectiveStory") ? "bg-black text-white" : "bg-white text-black"}`}>
                <span className="font-bold text-xs uppercase tracking-widest block mb-1">Objective Story (They)</span>
                <p className="text-sm">{directorState.throughlines.objectiveStory}</p>
              </div>
              <div className={`p-3 border-2 border-black ${directorState.throughlines.activeThroughlines?.includes("mainCharacter") ? "bg-black text-white" : "bg-white text-black"}`}>
                <span className="font-bold text-xs uppercase tracking-widest block mb-1">Main Character (I)</span>
                <p className="text-sm">{directorState.throughlines.mainCharacter}</p>
              </div>
              <div className={`p-3 border-2 border-black ${directorState.throughlines.activeThroughlines?.includes("influenceCharacter") ? "bg-black text-white" : "bg-white text-black"}`}>
                <span className="font-bold text-xs uppercase tracking-widest block mb-1">Influence Character (You)</span>
                <p className="text-sm">{directorState.throughlines.influenceCharacter}</p>
              </div>
              <div className={`p-3 border-2 border-black ${directorState.throughlines.activeThroughlines?.includes("relationshipStory") ? "bg-black text-white" : "bg-white text-black"}`}>
                <span className="font-bold text-xs uppercase tracking-widest block mb-1">Relationship Story (We)</span>
                <p className="text-sm">{directorState.throughlines.relationshipStory}</p>
              </div>
            </div>
          </section>
        )}

        {/* Player Model */}
        {activeTab === "player" && (
        <section className="space-y-4">
          <div className="bg-white p-6 brutal-border-thick brutal-shadow space-y-5">
            <div>
              <label className="text-black font-bold uppercase tracking-wider text-xs">Inferred Intent:</label>
              <input
                type="text"
                value={directorState.playerModel.inferredIntent}
                onChange={(e) =>
                  updatePlayerModel("inferredIntent", e.target.value)
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-black font-bold uppercase tracking-wider text-xs">Detected Emotion:</label>
              <input
                type="text"
                value={directorState.playerModel.detectedEmotion}
                onChange={(e) =>
                  updatePlayerModel("detectedEmotion", e.target.value)
                }
                className={inputClass}
              />
            </div>
            <div>
              <div className="flex justify-between mb-2 mt-4 font-bold uppercase tracking-widest text-xs">
                <label>Engagement Level</label>
                <span>{directorState.playerModel.engagementLevel}%</span>
              </div>
              <SegmentedMeter
                value={directorState.playerModel.engagementLevel}
                onChange={(v) => updatePlayerModel("engagementLevel", v)}
              />
            </div>

            <div className="pt-4 border-t-[4px] border-black">
              <label className="text-black font-bold uppercase tracking-wider text-xs mb-4 block">
                Big Five Personality:
              </label>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                      Openness
                    </label>
                    <span className="text-[10px] font-bold">
                      {directorState.playerModel.bigFive?.openness || 0}%
                    </span>
                  </div>
                  <SegmentedMeter
                    value={directorState.playerModel.bigFive?.openness || 0}
                    onChange={(v) => updateBigFive("openness", v)}
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                      Conscientiousness
                    </label>
                    <span className="text-[10px] font-bold">
                      {directorState.playerModel.bigFive?.conscientiousness ||
                        0}
                      %
                    </span>
                  </div>
                  <SegmentedMeter
                    value={directorState.playerModel.bigFive?.conscientiousness || 0}
                    onChange={(v) => updateBigFive("conscientiousness", v)}
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                      Extraversion
                    </label>
                    <span className="text-[10px] font-bold">
                      {directorState.playerModel.bigFive?.extraversion || 0}%
                    </span>
                  </div>
                  <SegmentedMeter
                    value={directorState.playerModel.bigFive?.extraversion || 0}
                    onChange={(v) => updateBigFive("extraversion", v)}
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                      Agreeableness
                    </label>
                    <span className="text-[10px] font-bold">
                      {directorState.playerModel.bigFive?.agreeableness || 0}%
                    </span>
                  </div>
                  <SegmentedMeter
                    value={directorState.playerModel.bigFive?.agreeableness || 0}
                    onChange={(v) => updateBigFive("agreeableness", v)}
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                      Neuroticism
                    </label>
                    <span className="text-[10px] font-bold">
                      {directorState.playerModel.bigFive?.neuroticism || 0}%
                    </span>
                  </div>
                  <SegmentedMeter
                    value={directorState.playerModel.bigFive?.neuroticism || 0}
                    onChange={(v) => updateBigFive("neuroticism", v)}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* Quality Validation */}
        {activeTab === "quality" && (
        <section className="space-y-4">
          <div className="bg-white p-6 brutal-border-thick brutal-shadow space-y-5">
            <div className="flex items-center gap-3">
              <label className="text-black font-bold uppercase tracking-wider text-xs">Status (Passed):</label>
              <input
                type="checkbox"
                checked={directorState.qualityValidation.passed}
                onChange={(e) => updateQuality("passed", e.target.checked)}
                className="w-5 h-5 accent-black"
              />
            </div>
            <div>
              <label className="text-black font-bold uppercase tracking-wider text-xs">Sin Check:</label>
              <textarea
                value={directorState.qualityValidation.sinCheck}
                onChange={(e) => updateQuality("sinCheck", e.target.value)}
                className={textareaClass}
              />
            </div>
            <div>
              <label className="text-black font-bold uppercase tracking-wider text-xs">Horizon Check:</label>
              <textarea
                value={directorState.qualityValidation.horizonCheck}
                onChange={(e) => updateQuality("horizonCheck", e.target.value)}
                className={textareaClass}
              />
            </div>
            <div className="flex items-center gap-3 mt-4">
              <label className="text-black font-bold uppercase tracking-wider text-xs">Subtext Gap (Is On The Nose?):</label>
              <input
                type="checkbox"
                checked={!directorState.qualityValidation.subtextGap}
                readOnly
                className="w-5 h-5 accent-black"
              />
            </div>
          </div>
        </section>
        )}

        {/* Memory System */}
        {activeTab === "memory" && (
        <section className="space-y-4">
          <div className="bg-white p-6 brutal-border-thick brutal-shadow space-y-5">
            <div>
              <label className="text-black font-bold uppercase tracking-wider text-xs block mb-2">
                Episodic (One per line):
              </label>
              <textarea
                value={directorState.memory.episodic.join("\n")}
                onChange={(e) => updateMemory("episodic", e.target.value)}
                className={textareaClass}
                rows={4}
              />
            </div>
            <div>
              <label className="text-black font-bold uppercase tracking-wider text-xs block mb-2">
                Semantic (One per line):
              </label>
              <textarea
                value={directorState.memory.semantic.join("\n")}
                onChange={(e) => updateMemory("semantic", e.target.value)}
                className={textareaClass}
                rows={4}
              />
            </div>
            <div>
              <label className="text-black font-bold uppercase tracking-wider text-xs block mb-2">
                Procedural (One per line):
              </label>
              <textarea
                value={directorState.memory.procedural.join("\n")}
                onChange={(e) => updateMemory("procedural", e.target.value)}
                className={textareaClass}
                rows={4}
              />
            </div>
            
            <div className="pt-4 border-t-[4px] border-black">
              <label className="text-black font-bold uppercase tracking-wider text-xs block mb-2">
                Active Secrets:
              </label>
              <div className="space-y-2">
                {directorState.activeSecrets?.map((secret, idx) => (
                  <div key={idx} className="p-3 border-2 border-black bg-gray-50 flex flex-col gap-1">
                    <span className="font-bold text-xs uppercase">{secret.owner}</span>
                    <span className="text-sm">{secret.content}</span>
                    <span className={`text-[10px] uppercase font-bold ${secret.revealed ? 'text-red-600' : 'text-green-600'}`}>
                      {secret.revealed ? 'REVEALED' : 'HIDDEN'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t-[4px] border-black">
              <label className="text-black font-bold uppercase tracking-wider text-xs block mb-2">
                NPCs:
              </label>
              <div className="space-y-2">
                {directorState.npcs?.map((npc, idx) => (
                  <div key={idx} className="p-3 border-2 border-black bg-gray-50 flex flex-col gap-1">
                    <span className="font-bold text-xs uppercase">{npc.name} ({npc.role})</span>
                    <span className="text-sm">Agenda: {npc.agenda}</span>
                    <span className="text-[10px] uppercase font-bold text-gray-500">
                      Trust: {npc.trustworthiness}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        )}
      </div>
    </motion.div>
  );
}
