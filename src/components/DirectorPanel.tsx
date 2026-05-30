import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import { GameState, Choice, DefenseMechanism } from "../types";
import type { OutlineBeat } from "../../server/engine/types";
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
  GitBranch,
  X,
  Shield,
  Hash,
  BookOpen,
} from "lucide-react";

// ─── Mini sparkline ───────────────────────────────────────────────────────────

function SparkLine({
  data,
  color,
  height = 40,
}: {
  data: number[];
  color: string;
  height?: number;
}) {
  if (data.length < 2) {
    return (
      <div
        className="w-full border-b-2 border-gray-200"
        style={{ height }}
        aria-hidden="true"
      />
    );
  }
  const max = Math.max(...data, 1);
  const w = 200;
  const pts = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = height - (v / max) * height;
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${w} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_DEFENSE_MECHS: DefenseMechanism[] = [
  "rationalization",
  "intellectualization",
  "projection",
  "displacement",
  "denial",
  "dissociation",
  "repression",
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface DirectorPanelProps {
  state: GameState;
  onUpdateState: (newState: GameState) => void;
  onClose?: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DirectorPanel({
  state,
  onUpdateState,
  onClose,
}: DirectorPanelProps) {
  const { protagonist, directorState, currentScene } = state;

  // ── Updaters ─────────────────────────────────────────────────────────────

  const updateProtagonist = (field: keyof typeof protagonist, value: string) => {
    onUpdateState({ ...state, protagonist: { ...protagonist, [field]: value } });
  };

  const updateArcMeter = (field: keyof typeof directorState.arcMeter, value: number) => {
    onUpdateState({
      ...state,
      directorState: { ...directorState, arcMeter: { ...directorState.arcMeter, [field]: value } },
    });
  };

  const updatePlayerModel = (field: keyof typeof directorState.playerModel, value: string | number) => {
    onUpdateState({
      ...state,
      directorState: { ...directorState, playerModel: { ...directorState.playerModel, [field]: value } },
    });
  };

  const updateBigFive = (field: keyof typeof directorState.playerModel.bigFive, value: number) => {
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

  const updateComposition = (field: keyof typeof currentScene.composition, value: string) => {
    onUpdateState({
      ...state,
      currentScene: { ...currentScene, composition: { ...currentScene.composition, [field]: value } },
    });
  };

  const updateQuality = (field: keyof typeof directorState.qualityValidation, value: string | boolean) => {
    onUpdateState({
      ...state,
      directorState: {
        ...directorState,
        qualityValidation: { ...directorState.qualityValidation, [field]: value },
      },
    });
  };

  const updateMemory = (field: keyof typeof directorState.memory, value: string) => {
    onUpdateState({
      ...state,
      directorState: {
        ...directorState,
        memory: { ...directorState.memory, [field]: value.split("\n").filter((s) => s.trim() !== "") },
      },
    });
  };

  const updateScene = (field: keyof typeof currentScene, value: string) => {
    onUpdateState({ ...state, currentScene: { ...currentScene, [field]: value } });
  };

  const updateChoice = (index: number, field: keyof Choice, value: string) => {
    const newChoices = [...currentScene.choices];
    newChoices[index] = { ...newChoices[index], [field]: value };
    onUpdateState({ ...state, currentScene: { ...currentScene, choices: newChoices } });
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
    onUpdateState({ ...state, currentScene: { ...currentScene, choices: newChoices } });
  };

  const toggleDefenseMech = (mech: DefenseMechanism) => {
    const active = protagonist.psychology.defenseMechanisms.includes(mech);
    const mechs = active
      ? protagonist.psychology.defenseMechanisms.filter((m) => m !== mech)
      : [...protagonist.psychology.defenseMechanisms, mech];
    onUpdateState({
      ...state,
      protagonist: {
        ...protagonist,
        psychology: { ...protagonist.psychology, defenseMechanisms: mechs },
      },
    });
  };

  const setDefenseLevel = (level: typeof protagonist.psychology.currentDefenseLevel) => {
    onUpdateState({
      ...state,
      protagonist: {
        ...protagonist,
        psychology: { ...protagonist.psychology, currentDefenseLevel: level },
      },
    });
  };

  const updateQbnQuality = (key: string, value: number) => {
    onUpdateState({
      ...state,
      directorState: {
        ...directorState,
        qbnQualities: { ...(directorState.qbnQualities ?? {}), [key]: value },
      },
    });
  };

  const removeQbnQuality = (key: string) => {
    const { [key]: _removed, ...rest } = directorState.qbnQualities ?? {};
    onUpdateState({ ...state, directorState: { ...directorState, qbnQualities: rest } });
  };

  // ── Local state ───────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState<string>("scene");
  const [availableIndices, setAvailableIndices] = useState<Set<number>>(
    new Set(currentScene.choices.map((_, i) => i))
  );
  const [newQualityKey, setNewQualityKey] = useState("");
  const [newQualityValue, setNewQualityValue] = useState("0");
  const [outlineBeats, setOutlineBeats] = useState<OutlineBeat[]>([]);
  const [outlineSaved, setOutlineSaved] = useState<boolean | null>(null);
  const [pacingTarget, setPacingTarget] = useState<'slow' | 'medium' | 'fast'>('medium');
  const [pacingSaved, setPacingSaved] = useState<boolean | null>(null);
  const [storyStructure, setStoryStructure] = useState<string>('');
  const [emotionalArc, setEmotionalArc] = useState<string>('');
  const [directorStyle, setDirectorStyle] = useState<string>('');
  const [expectedTurns, setExpectedTurns] = useState<number>(20);
  const [presetSaved, setPresetSaved] = useState<boolean | null>(null);
  const [applyingPreset, setApplyingPreset] = useState(false);
  const [confirmClearBeats, setConfirmClearBeats] = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────

  const filterRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const tensionHistoryRef = useRef<Array<{ tension: number; menace: number }>>([]);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const choicesKey = JSON.stringify(currentScene.choices);
  const qualitiesKey = JSON.stringify(directorState.qbnQualities);

  // ── Track tension history ─────────────────────────────────────────────────

  useEffect(() => {
    tensionHistoryRef.current = [
      ...tensionHistoryRef.current.slice(-29),
      { tension: directorState.tensionLevel ?? 0, menace: directorState.menaceGauge ?? 0 },
    ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directorState.tensionLevel, directorState.menaceGauge]);

  // ── Load saved outline + story config from engine on mount ──────────────

  useEffect(() => {
    fetch("/api/outline")
      .then(r => r.ok ? r.json() as Promise<{ beats: OutlineBeat[] }> : { beats: [] })
      .then(data => { if (data.beats.length > 0) setOutlineBeats(data.beats); })
      .catch(() => {});
    fetch("/api/story-config")
      .then(r => r.ok ? r.json() as Promise<{
        structure: string | null; emotional_arc: string | null;
        director_style: string | null; expected_turns: number; pacing_target: string | null;
      }> : null)
      .then(data => {
        if (!data) return;
        if (data.structure) setStoryStructure(data.structure);
        if (data.emotional_arc) setEmotionalArc(data.emotional_arc);
        if (data.director_style) setDirectorStyle(data.director_style);
        if (data.expected_turns) setExpectedTurns(data.expected_turns);
        if (data.pacing_target) setPacingTarget(data.pacing_target as 'slow' | 'medium' | 'fast');
      })
      .catch(() => {});
  }, []);

  // ── Escape key ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!onClose) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── QBN filter choices ────────────────────────────────────────────────────

  useEffect(() => {
    if (filterRef.current) clearTimeout(filterRef.current);
    abortRef.current?.abort();
    filterRef.current = setTimeout(() => {
      const choices = currentScene.choices;
      if (choices.length === 0) {
        setAvailableIndices(new Set());
        return;
      }
      const controller = new AbortController();
      abortRef.current = controller;
      fetch("/api/qbn/filter-choices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choices, qualities: directorState.qbnQualities ?? {} }),
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((data: { available: Choice[] }) => {
          const availTexts = new Set((data.available ?? []).map((c) => c.text));
          setAvailableIndices(
            new Set(choices.map((c, i) => (availTexts.has(c.text) ? i : -1)).filter((i) => i >= 0))
          );
        })
        .catch((err) => {
          if (err.name !== "AbortError") setAvailableIndices(new Set(choices.map((_, i) => i)));
        });
    }, 400);
    return () => {
      if (filterRef.current) clearTimeout(filterRef.current);
      abortRef.current?.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [choicesKey, qualitiesKey]);

  useEffect(() => () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); }, []);

  // ── Sub-components ────────────────────────────────────────────────────────

  const SegmentedMeter = ({
    value,
    onChange,
    max = 100,
    segments = 10,
  }: {
    value: number;
    onChange: (v: number) => void;
    max?: number;
    segments?: number;
  }) => {
    const filledSegments = Math.round((value / max) * segments);
    return (
      <div
        className="flex gap-1 w-full cursor-pointer h-6"
        role="slider"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          onChange(Math.round(percentage * max));
        }}
      >
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className={`flex-1 border-2 border-black transition-colors ${
              i < filledSegments ? "bg-[#FF4444]" : "bg-transparent hover:bg-gray-200"
            }`}
          />
        ))}
      </div>
    );
  };

  // ── Styles ────────────────────────────────────────────────────────────────

  const inputClass =
    "w-full bg-white brutal-border-thick px-3 py-2 mt-1 text-black focus:outline-none focus:ring-0 focus:bg-gray-50 font-mono text-sm brutal-shadow-focus";
  const textareaClass =
    "w-full bg-white brutal-border-thick px-3 py-2 mt-1 text-black focus:outline-none focus:ring-0 focus:bg-gray-50 min-h-[80px] resize-y font-mono text-sm brutal-shadow-focus";

  const saveOutline = useCallback(async () => {
    try {
      const res = await fetch("/api/outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beats: outlineBeats }),
      });
      setOutlineSaved(res.ok);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setOutlineSaved(null), 2000);
    } catch { setOutlineSaved(false); }
  }, [outlineBeats]);

  const savePacingTarget = useCallback(async (target: 'slow' | 'medium' | 'fast') => {
    setPacingTarget(target);
    try {
      const res = await fetch("/api/pacing-target", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });
      setPacingSaved(res.ok);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setPacingSaved(null), 1500);
    } catch { setPacingSaved(false); }
  }, []);

  const applyStructurePreset = useCallback(async () => {
    if (!storyStructure) return;
    setApplyingPreset(true);
    try {
      const res = await fetch("/api/outline/apply-preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ structure: storyStructure, expectedTurns }),
      });
      if (res.ok) {
        const data = await res.json() as { beats: OutlineBeat[] };
        setOutlineBeats(data.beats);
        setPresetSaved(true);
      } else { setPresetSaved(false); }
    } catch { setPresetSaved(false); }
    setApplyingPreset(false);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setPresetSaved(null), 2000);
  }, [storyStructure, expectedTurns]);

  const saveEmotionalArc = useCallback(async (arc: string) => {
    setEmotionalArc(arc);
    await fetch("/api/emotional-arc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ arc }),
    }).catch(() => {});
  }, []);

  const saveDirectorStyle = useCallback(async (style: string) => {
    setDirectorStyle(style);
    await fetch("/api/director-style", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ style }),
    }).catch(() => {});
  }, []);

  const addOutlineBeat = () => {
    setOutlineBeats(prev => [...prev, {
      phase: "Setup",
      turn_start: 0,
      turn_end: 10,
      goal: "",
      constraint: "",
      avoid: "",
    }]);
  };

  const updateOutlineBeat = (idx: number, field: keyof OutlineBeat, value: string | number) => {
    setOutlineBeats(prev => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b));
  };

  const removeOutlineBeat = (idx: number) => {
    setOutlineBeats(prev => prev.filter((_, i) => i !== idx));
  };

  const tabs = [
    { id: "scene",       label: "Scene",      icon: Clapperboard },
    { id: "metrics",     label: "Metrics",    icon: BarChart },
    { id: "commentary",  label: "Commentary", icon: MessageSquare },
    { id: "throughlines",label: "Throughlines",icon: GitBranch },
    { id: "character",   label: "Character",  icon: Eye },
    { id: "psychology",  label: "Psychology", icon: Brain },
    { id: "arc",         label: "Arc",        icon: Activity },
    { id: "player",      label: "Player",     icon: Heart },
    { id: "quality",     label: "Quality",    icon: ShieldCheck },
    { id: "memory",      label: "Memory",     icon: Zap },
    { id: "qbn",         label: "QBN",        icon: Hash },
    { id: "outline",     label: "Outline",    icon: BookOpen },
  ];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="director-panel-title"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed top-0 right-0 w-[500px] h-screen bg-white brutal-border-thick text-black p-8 overflow-y-auto font-mono text-sm z-50 brutal-shadow"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 pb-4 border-b-[8px] border-black">
        <Brain className="w-8 h-8 text-black shrink-0" />
        <h2
          id="director-panel-title"
          className="text-2xl font-display uppercase tracking-widest text-black flex-1"
        >
          AI Director State
        </h2>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close Director panel"
            className="p-2 brutal-border hover:bg-black hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            aria-pressed={activeTab === tab.id}
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

        {/* ── Scene ── */}
        {activeTab === "scene" && (
          <section className="space-y-4">
            <div className="bg-white p-6 brutal-border-thick brutal-shadow space-y-5">
              <div>
                <label className="text-black font-bold uppercase tracking-wider text-xs">Narrative Text:</label>
                <textarea value={currentScene.narrativeText} onChange={(e) => updateScene("narrativeText", e.target.value)} className={textareaClass} rows={4} />
              </div>
              <div>
                <label className="text-black font-bold uppercase tracking-wider text-xs">Image Prompt:</label>
                <textarea value={currentScene.imagePrompt} onChange={(e) => updateScene("imagePrompt", e.target.value)} className={textareaClass} rows={3} />
              </div>
              <div>
                <label className="text-black font-bold uppercase tracking-wider text-xs">Audio Dialogue:</label>
                <textarea value={currentScene.audioDialogue} onChange={(e) => updateScene("audioDialogue", e.target.value)} className={textareaClass} rows={2} />
              </div>
              <div>
                <label className="text-black font-bold uppercase tracking-wider text-xs">Beat:</label>
                <input type="text" value={currentScene.beat} onChange={(e) => updateScene("beat", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-black font-bold uppercase tracking-wider text-xs">Information Position:</label>
                <select value={currentScene.informationPosition || "parity"} onChange={(e) => updateScene("informationPosition", e.target.value)} className={inputClass}>
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
                  Comedy Misdirection: {currentScene.comedyMisdirection.replace("_", " ")}
                </div>
              )}
              <div>
                <label className="text-black font-bold uppercase tracking-wider text-xs">Composition:</label>
                <div className="space-y-3 mt-2">
                  {(["cameraAngle", "shotType", "lighting", "colorPalette"] as const).map((field) => (
                    <div key={field}>
                      <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">
                        {field.replace(/([A-Z])/g, " $1")}
                      </label>
                      <input type="text" value={currentScene.composition[field]} onChange={(e) => updateComposition(field, e.target.value)} className={inputClass} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t-[4px] border-black">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-black font-bold uppercase tracking-wider text-xs">Choices:</label>
                  <button onClick={addChoice} className="px-3 py-2 bg-black text-white brutal-border-thick hover:bg-white hover:text-black transition-colors uppercase font-bold tracking-widest text-xs brutal-shadow-hover">
                    + Add
                  </button>
                </div>
                <div className="space-y-4">
                  {currentScene.choices.map((choice, idx) => (
                    <div key={`choice-${choice.text.slice(0, 20)}-${idx}`} className={`bg-white p-4 brutal-border-thick brutal-shadow relative ${!availableIndices.has(idx) ? "opacity-60" : ""}`}>
                      {!availableIndices.has(idx) && (
                        <span
                          className="absolute top-2 left-2 bg-[#FF4444] text-white text-[8px] px-2 py-0.5 font-bold uppercase tracking-widest cursor-help"
                          title={choice.qbnRequirements && Object.keys(choice.qbnRequirements).length > 0
                            ? `Requires: ${Object.entries(choice.qbnRequirements).map(([k, v]) => `${k} ≥ ${v}`).join(', ')} — current values: ${Object.entries(choice.qbnRequirements).map(([k, v]) => `${k}=${directorState.qbnQualities?.[k] ?? 0}/${v}`).join(', ')}`
                            : 'Locked by QBN quality requirements — check QBN tab for current values'}
                        >
                          LOCKED
                        </span>
                      )}
                      <button onClick={() => removeChoice(idx)} aria-label={`Remove choice ${idx + 1}`} className="absolute top-2 right-2 text-black hover:text-gray-500 font-bold text-2xl leading-none">×</button>
                      <div className="mb-3 pr-6">
                        <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Text</label>
                        <input type="text" value={choice.text} onChange={(e) => updateChoice(idx, "text", e.target.value)} className={inputClass} />
                      </div>
                      <div>
                        <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Intent</label>
                        <input type="text" value={choice.intent} onChange={(e) => updateChoice(idx, "intent", e.target.value)} className={inputClass} />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Scope</label>
                          <select value={choice.consequenceScope} onChange={(e) => updateChoice(idx, "consequenceScope", e.target.value)} className={inputClass}>
                            <option value="micro">Micro</option>
                            <option value="macro">Macro</option>
                            <option value="crisis">Crisis</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Taxonomy</label>
                          <select value={choice.taxonomy || "exploratory"} onChange={(e) => updateChoice(idx, "taxonomy", e.target.value)} className={inputClass}>
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

        {/* ── Character ── */}
        {activeTab === "character" && (
          <section className="space-y-4">
            <div className="bg-white p-6 brutal-border-thick brutal-shadow space-y-5">
              {(["name", "ghost", "lie", "want", "need"] as const).map((field) => (
                <div key={field}>
                  <label className="text-black font-bold uppercase tracking-wider text-xs">{field}:</label>
                  {field === "name" ? (
                    <input type="text" value={protagonist[field]} onChange={(e) => updateProtagonist(field, e.target.value)} className={inputClass} />
                  ) : (
                    <textarea value={protagonist[field]} onChange={(e) => updateProtagonist(field, e.target.value)} className={textareaClass} />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Psychology ── */}
        {activeTab === "psychology" && (
          <section className="space-y-4">
            <div className="bg-white p-6 brutal-border-thick brutal-shadow space-y-6">
              <h3 className="font-display text-xl uppercase tracking-widest border-b-[4px] border-black pb-2">Dark Triad</h3>
              {(["machiavellianism", "narcissism", "psychopathy"] as const).map((trait) => (
                <div key={trait}>
                  <div className="flex justify-between mb-2 font-bold uppercase tracking-widest text-xs">
                    <label>{trait}</label>
                    <span>{protagonist.psychology.darkTriad?.[trait] || 0}%</span>
                  </div>
                  <SegmentedMeter
                    value={protagonist.psychology.darkTriad?.[trait] || 0}
                    onChange={(v) =>
                      onUpdateState({
                        ...state,
                        protagonist: {
                          ...protagonist,
                          psychology: {
                            ...protagonist.psychology,
                            darkTriad: { ...protagonist.psychology.darkTriad, [trait]: v },
                          },
                        },
                      })
                    }
                  />
                </div>
              ))}

              <h3 className="font-display text-xl uppercase tracking-widest border-b-[4px] border-black pb-2 mt-8">Core Profile</h3>

              <div>
                <label className="text-black font-bold uppercase tracking-wider text-xs">Attachment Style:</label>
                <select
                  value={protagonist.psychology.attachmentStyle || "secure"}
                  onChange={(e) =>
                    onUpdateState({
                      ...state,
                      protagonist: {
                        ...protagonist,
                        psychology: {
                          ...protagonist.psychology,
                          attachmentStyle: e.target.value as typeof protagonist.psychology.attachmentStyle,
                        },
                      },
                    })
                  }
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
                  onChange={(e) =>
                    onUpdateState({
                      ...state,
                      protagonist: {
                        ...protagonist,
                        psychology: { ...protagonist.psychology, formativeWound: e.target.value },
                      },
                    })
                  }
                  className={textareaClass}
                  rows={2}
                />
              </div>

              {/* Defense mechanisms */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4" />
                  <label className="text-black font-bold uppercase tracking-wider text-xs">Defense Mechanisms:</label>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {ALL_DEFENSE_MECHS.map((mech) => {
                    const active = protagonist.psychology.defenseMechanisms.includes(mech);
                    return (
                      <button
                        key={mech}
                        onClick={() => toggleDefenseMech(mech)}
                        aria-pressed={active}
                        className={`px-2 py-1 text-[10px] font-bold uppercase brutal-border transition-colors ${
                          active ? "bg-black text-white" : "bg-white text-gray-400 border-gray-300 hover:border-black hover:text-black"
                        }`}
                      >
                        {mech}
                      </button>
                    );
                  })}
                </div>
                <div>
                  <label className="text-black font-bold uppercase tracking-wider text-xs">Defense Level:</label>
                  <div className="flex gap-2 mt-2">
                    {(["low", "medium", "high", "breaking_point"] as const).map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setDefenseLevel(lvl)}
                        aria-pressed={protagonist.psychology.currentDefenseLevel === lvl}
                        className={`flex-1 py-1.5 text-[9px] font-bold uppercase brutal-border transition-colors ${
                          protagonist.psychology.currentDefenseLevel === lvl
                            ? lvl === "breaking_point"
                              ? "bg-[#FF4444] text-white"
                              : lvl === "high"
                              ? "bg-orange-500 text-white"
                              : lvl === "medium"
                              ? "bg-yellow-400 text-black"
                              : "bg-green-500 text-white"
                            : "bg-white text-gray-400 border-gray-300 hover:border-black hover:text-black"
                        }`}
                      >
                        {lvl.replace("_", " ")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Arc ── */}
        {activeTab === "arc" && (
          <section className="space-y-4">
            <div className="bg-white p-6 brutal-border-thick brutal-shadow space-y-6">
              <div>
                <label className="text-black font-bold uppercase tracking-wider text-xs">Structural Node:</label>
                <input
                  type="text"
                  value={directorState.structuralNode || ""}
                  onChange={(e) => onUpdateState({ ...state, directorState: { ...directorState, structuralNode: e.target.value } })}
                  className={inputClass}
                />
              </div>

              {(
                [
                  ["tensionLevel", "Tension Level"],
                  ["menaceGauge", "Menace Gauge"],
                  ["tensionSpace", "Tension Space"],
                  ["unreliableNarratorScore", "Unreliable Narrator Score"],
                ] as const
              ).map(([field, label]) => (
                <div key={field}>
                  <div className="flex justify-between mb-2 font-bold uppercase tracking-widest text-xs">
                    <label>{label}</label>
                    <span>{directorState[field] ?? 0}%</span>
                  </div>
                  <SegmentedMeter
                    value={directorState[field] ?? 0}
                    onChange={(v) => onUpdateState({ ...state, directorState: { ...directorState, [field]: v } })}
                  />
                </div>
              ))}

              {/* Live tension/menace sparkline */}
              {tensionHistoryRef.current.length >= 2 && (
                <div className="pt-4 border-t-[4px] border-black">
                  <span className="text-black font-bold uppercase tracking-wider text-xs block mb-2">Tension History</span>
                  <div className="bg-gray-50 brutal-border p-2 space-y-2">
                    <SparkLine data={tensionHistoryRef.current.map((d) => d.tension)} color="#FF4444" height={36} />
                    <SparkLine data={tensionHistoryRef.current.map((d) => d.menace)} color="#000000" height={24} />
                    <div className="flex gap-4 text-[9px] font-mono text-gray-500">
                      <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-[#FF4444] inline-block" />tension</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-black inline-block" />menace</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t-[4px] border-black">
                {(
                  [
                    ["lieBelief", "Lie Belief"],
                    ["needAwareness", "Need Awareness"],
                    ["internalConflict", "Internal Conflict"],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field} className="mb-4">
                    <div className="flex justify-between mb-2 font-bold uppercase tracking-widest text-xs">
                      <label>{label}</label>
                      <span>{directorState.arcMeter[field]}%</span>
                    </div>
                    <SegmentedMeter value={directorState.arcMeter[field]} onChange={(v) => updateArcMeter(field, v)} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Metrics ── */}
        {activeTab === "metrics" && currentScene.metrics && (
          <section className="space-y-4">
            <div className="bg-white p-6 brutal-border-thick brutal-shadow space-y-4">
              {(
                [
                  ["pivotStrength", "Pivot Strength"],
                  ["cliffhangerStrength", "Cliffhanger Strength"],
                  ["twistImpact", "Twist Impact"],
                  ["surprise", "Surprise"],
                  ["suspense", "Suspense"],
                ] as const
              ).map(([field, label]) => (
                <div key={field} className="flex justify-between items-center">
                  <span className="font-bold text-xs uppercase tracking-widest">{label}</span>
                  <span className="font-mono bg-black text-white px-2 py-1">{currentScene.metrics[field]?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Commentary ── */}
        {activeTab === "commentary" && currentScene.commentary && (
          <section className="space-y-4">
            <div className="bg-white p-6 brutal-border-thick brutal-shadow space-y-4">
              {(
                [
                  ["tensionRationale", "Tension Rationale"],
                  ["informationPositionRationale", "Information Position Rationale"],
                  ["defenseMechanismRationale", "Defense Mechanism Rationale"],
                  ["throughlineRationale", "Throughline Rationale"],
                ] as const
              ).map(([field, label]) => (
                <div key={field}>
                  <span className="font-bold text-xs uppercase tracking-widest block mb-1">{label}</span>
                  <p className="text-sm">{currentScene.commentary[field]}</p>
                </div>
              ))}

              <div className="pt-4 border-t-[4px] border-black">
                <span className="font-bold text-xs uppercase tracking-widest block mb-3">Evaluator Scores</span>
                {(
                  [
                    ["ego", "Ego"],
                    ["superego", "Superego"],
                    ["narrator", "Narrator"],
                    ["audience", "Audience"],
                    ["storymind", "Storymind"],
                  ] as const
                ).map(([key, label]) => {
                  const score = currentScene.commentary.evaluatorScores?.[key] ?? 0;
                  return (
                    <div key={key} className="mb-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
                        <span>{label}</span>
                        <span>{score}</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 border border-gray-300">
                        <div className="h-full bg-black transition-all" style={{ width: `${Math.min(100, score)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* ── Throughlines ── */}
        {activeTab === "throughlines" && directorState.throughlines && (
          <section className="space-y-4">
            <div className="bg-white p-6 brutal-border-thick brutal-shadow space-y-4">
              {(
                [
                  ["objectiveStory", "Objective Story (They)"],
                  ["mainCharacter", "Main Character (I)"],
                  ["influenceCharacter", "Influence Character (You)"],
                  ["relationshipStory", "Relationship Story (We)"],
                ] as const
              ).map(([field, label]) => {
                const active = directorState.throughlines.activeThroughlines?.includes(field as "objectiveStory");
                return (
                  <div key={field} className={`p-3 border-2 border-black ${active ? "bg-black text-white" : "bg-white text-black"}`}>
                    <span className="font-bold text-xs uppercase tracking-widest block mb-1">{label}</span>
                    <p className="text-sm">{directorState.throughlines[field as keyof typeof directorState.throughlines] as string}</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Player ── */}
        {activeTab === "player" && (
          <section className="space-y-4">
            <div className="bg-white p-6 brutal-border-thick brutal-shadow space-y-5">
              <div>
                <label className="text-black font-bold uppercase tracking-wider text-xs">Inferred Intent:</label>
                <input type="text" value={directorState.playerModel.inferredIntent} onChange={(e) => updatePlayerModel("inferredIntent", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="text-black font-bold uppercase tracking-wider text-xs">Detected Emotion:</label>
                <input type="text" value={directorState.playerModel.detectedEmotion} onChange={(e) => updatePlayerModel("detectedEmotion", e.target.value)} className={inputClass} />
              </div>
              <div>
                <div className="flex justify-between mb-2 mt-4 font-bold uppercase tracking-widest text-xs">
                  <label>Engagement Level</label>
                  <span>{directorState.playerModel.engagementLevel}%</span>
                </div>
                <SegmentedMeter value={directorState.playerModel.engagementLevel} onChange={(v) => updatePlayerModel("engagementLevel", v)} />
              </div>

              <div className="pt-4 border-t-[4px] border-black">
                <label className="text-black font-bold uppercase tracking-wider text-xs mb-4 block">Big Five Personality:</label>
                <div className="space-y-4">
                  {(["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"] as const).map((trait) => (
                    <div key={trait}>
                      <div className="flex justify-between mb-2">
                        <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">{trait}</label>
                        <span className="text-[10px] font-bold">{directorState.playerModel.bigFive?.[trait] || 0}%</span>
                      </div>
                      <SegmentedMeter value={directorState.playerModel.bigFive?.[trait] || 0} onChange={(v) => updateBigFive(trait, v)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Quality ── */}
        {activeTab === "quality" && (
          <section className="space-y-4">
            <div className="bg-white p-6 brutal-border-thick brutal-shadow space-y-5">
              <div className="flex items-center gap-3">
                <label className="text-black font-bold uppercase tracking-wider text-xs">Status (Passed):</label>
                <input type="checkbox" checked={directorState.qualityValidation.passed} onChange={(e) => updateQuality("passed", e.target.checked)} className="w-5 h-5 accent-black" />
              </div>
              <div>
                <label className="text-black font-bold uppercase tracking-wider text-xs">Sin Check:</label>
                <textarea value={directorState.qualityValidation.sinCheck} onChange={(e) => updateQuality("sinCheck", e.target.value)} className={textareaClass} />
              </div>
              <div>
                <label className="text-black font-bold uppercase tracking-wider text-xs">Horizon Check:</label>
                <textarea value={directorState.qualityValidation.horizonCheck} onChange={(e) => updateQuality("horizonCheck", e.target.value)} className={textareaClass} />
              </div>
              <div className="flex items-center gap-3 mt-4">
                <label className="text-black font-bold uppercase tracking-wider text-xs">Subtext Gap (On The Nose?):</label>
                <input type="checkbox" checked={directorState.qualityValidation.subtextGap} onChange={(e) => updateQuality("subtextGap", e.target.checked)} className="w-5 h-5 accent-black cursor-pointer" />
              </div>
            </div>
          </section>
        )}

        {/* ── Memory ── */}
        {activeTab === "memory" && (
          <section className="space-y-4">
            <div className="bg-white p-6 brutal-border-thick brutal-shadow space-y-5">
              {(["episodic", "semantic", "procedural"] as const).map((field) => (
                <div key={field}>
                  <label className="text-black font-bold uppercase tracking-wider text-xs block mb-2">
                    {field} (one per line):
                  </label>
                  <textarea
                    value={directorState.memory[field].join("\n")}
                    onChange={(e) => updateMemory(field, e.target.value)}
                    className={textareaClass}
                    rows={4}
                  />
                </div>
              ))}

              <div className="pt-4 border-t-[4px] border-black">
                <label className="text-black font-bold uppercase tracking-wider text-xs block mb-2">Active Secrets:</label>
                <div className="space-y-2">
                  {directorState.activeSecrets?.map((secret, idx) => (
                    <div key={`secret-${secret.owner}-${idx}`} className="p-3 border-2 border-black bg-gray-50 flex flex-col gap-1">
                      <span className="font-bold text-xs uppercase">{secret.owner}</span>
                      <span className="text-sm">{secret.content}</span>
                      <span className={`text-[10px] uppercase font-bold ${secret.revealed ? "text-red-600" : "text-green-600"}`}>
                        {secret.revealed ? "REVEALED" : "HIDDEN"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t-[4px] border-black">
                <label className="text-black font-bold uppercase tracking-wider text-xs block mb-2">NPCs:</label>
                <div className="space-y-2">
                  {directorState.npcs?.map((npc, idx) => (
                    <div key={`npc-${npc.name}-${npc.role}-${idx}`} className="p-3 border-2 border-black bg-gray-50 flex flex-col gap-1">
                      <span className="font-bold text-xs uppercase">{npc.name} ({npc.role})</span>
                      <span className="text-sm">Agenda: {npc.agenda}</span>
                      <span className="text-[10px] uppercase font-bold text-gray-500">Trust: {npc.trustworthiness}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Outline ── */}
        {activeTab === "outline" && (
          <section className="space-y-4">

            {/* ── Story Architecture ── */}
            <div className="bg-white p-6 brutal-border-thick brutal-shadow space-y-4">
              <span className="font-bold text-xs uppercase tracking-widest block">Story Architecture</span>
              <p className="text-[10px] font-mono text-gray-500 uppercase leading-relaxed">
                Select a narrative structure to auto-populate the beat sheet below. Choose an emotional arc so the engine steers tension toward the right curve. Set a cinematic style to modulate agent tone and director pressure.
              </p>

              {/* Structure preset */}
              <div>
                <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest block mb-1">Narrative Structure</label>
                <select
                  value={storyStructure}
                  onChange={e => setStoryStructure(e.target.value)}
                  className={inputClass}
                >
                  <option value="">— None —</option>
                  <option value="save_the_cat">Save the Cat (15 beats)</option>
                  <option value="dan_harmon">Dan Harmon Story Circle (8)</option>
                  <option value="john_yorke">John Yorke 5 Acts</option>
                  <option value="freytag">Freytag's Pyramid (5)</option>
                  <option value="sequence">Sequence Approach (8)</option>
                  <option value="kishotenketsu">Kishōtenketsu (4)</option>
                </select>
              </div>

              {/* Expected turns + apply */}
              {storyStructure && (
                <div className="space-y-2">
                  <div>
                    <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest block mb-1">Expected Total Turns</label>
                    <input
                      type="number"
                      min={4}
                      max={200}
                      value={expectedTurns}
                      onChange={e => setExpectedTurns(Math.max(4, Number(e.target.value)))}
                      className={inputClass}
                    />
                    <p className="text-[9px] text-gray-400 mt-1 font-mono uppercase">Beat turn ranges will be scaled to this session length.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={applyStructurePreset}
                      disabled={applyingPreset}
                      className="flex-1 py-2 bg-black text-white brutal-border-thick hover:bg-[#FF4444] transition-colors uppercase font-bold tracking-widest text-xs brutal-shadow-hover disabled:opacity-40"
                    >
                      {applyingPreset ? 'Applying…' : 'Apply Preset → Beats'}
                    </button>
                    {presetSaved === true && <span className="text-green-600 font-bold uppercase text-[10px] tracking-widest shrink-0">Applied ✓</span>}
                    {presetSaved === false && <span className="text-[#FF4444] font-bold uppercase text-[10px] tracking-widest shrink-0">Error ✗</span>}
                  </div>
                </div>
              )}

              {/* Emotional arc */}
              <div>
                <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest block mb-1">Emotional Arc</label>
                <select
                  value={emotionalArc}
                  onChange={e => saveEmotionalArc(e.target.value)}
                  className={inputClass}
                >
                  <option value="">— None (no tension curve) —</option>
                  <option value="rags_to_riches">Rags to Riches (steady rise)</option>
                  <option value="riches_to_rags">Riches to Rags (tragic fall)</option>
                  <option value="man_in_a_hole">Man in a Hole (fall → rise)</option>
                  <option value="icarus">Icarus (rise → fall)</option>
                  <option value="cinderella">Cinderella (rise → fall → rise)</option>
                  <option value="oedipus">Oedipus (fall → rise → fall)</option>
                </select>
                {emotionalArc && (
                  <p className="text-[9px] text-gray-400 mt-1 font-mono uppercase">Engine will emit ESCALATE/COOL pressure when tension deviates &gt;22pts from the curve.</p>
                )}
              </div>

              {/* Emotional arc tension curve visualization */}
              {emotionalArc && (() => {
                const CURVES: Record<string, number[]> = {
                  rags_to_riches:  [10, 20, 30, 45, 58, 68, 78, 88],
                  riches_to_rags:  [80, 72, 63, 54, 44, 33, 22, 12],
                  man_in_a_hole:   [48, 36, 24, 16, 28, 46, 64, 80],
                  icarus:          [18, 32, 52, 68, 80, 84, 62, 36],
                  cinderella:      [28, 52, 72, 80, 52, 32, 58, 88],
                  oedipus:         [72, 56, 42, 52, 68, 52, 35, 18],
                };
                const curve = CURVES[emotionalArc];
                if (!curve) return null;
                const W = 200; const H = 48;
                const pts = curve.map((v, i) => `${(i / (curve.length - 1)) * W},${H - (v / 100) * H}`).join(' ');
                return (
                  <div className="bg-gray-50 border-2 border-black p-2">
                    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-label={`Tension curve for ${emotionalArc}`}>
                      <polyline points={pts} fill="none" stroke="#FF4444" strokeWidth="2.5" strokeLinejoin="round" />
                      <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="#ccc" strokeWidth="1" strokeDasharray="4,4" />
                    </svg>
                    <div className="flex justify-between text-[9px] font-mono text-gray-400 uppercase mt-0.5">
                      <span>start</span><span>middle</span><span>end</span>
                    </div>
                  </div>
                );
              })()}

              {/* Director style */}
              <div>
                <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest block mb-1">Cinematic Style</label>
                <select
                  value={directorStyle}
                  onChange={e => saveDirectorStyle(e.target.value)}
                  className={inputClass}
                >
                  <option value="">— None —</option>
                  <option value="hitchcock">Hitchcock — Voyeuristic Suspense</option>
                  <option value="fincher">Fincher — Procedural & Cynical</option>
                  <option value="nolan">Nolan — Cerebral & Non-Linear</option>
                  <option value="villeneuve">Villeneuve — Atmospheric Dread</option>
                  <option value="aster">Aster — Grief Horror</option>
                  <option value="lynch">Lynch — Surreal Nightmare</option>
                </select>
                {directorStyle && (
                  <p className="text-[9px] text-gray-400 mt-1 font-mono uppercase">Injected into every agent's character prompt and modulates Director pressure tone.</p>
                )}
              </div>
            </div>

            {/* Pacing Target */}
            <div className="bg-white p-6 brutal-border-thick brutal-shadow space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-widest">Pacing Target</span>
                {pacingSaved === true && <span className="text-green-600 font-bold uppercase text-[10px] tracking-widest">Saved ✓</span>}
                {pacingSaved === false && <span className="text-[#FF4444] font-bold uppercase text-[10px] tracking-widest">Error ✗</span>}
              </div>
              <p className="text-[10px] font-mono text-gray-500 uppercase leading-relaxed">
                Controls how aggressively the Pacing Controller fires pressure. "Fast" forces urgency; "slow" allows contemplation; "medium" fires only when clearly adrift.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(['slow', 'medium', 'fast'] as const).map(opt => (
                  <button
                    key={opt}
                    onClick={() => savePacingTarget(opt)}
                    className={`py-2 brutal-border-thick uppercase font-bold tracking-widest text-xs transition-colors ${
                      pacingTarget === opt
                        ? 'bg-black text-white'
                        : 'bg-white text-black hover:bg-gray-100'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 brutal-border-thick brutal-shadow space-y-5">
              <p className="text-[10px] font-mono text-gray-500 uppercase leading-relaxed">
                Author beats that override Director prompts when the engine enters the matching phase and turn range. Saved beats persist across room rounds.
              </p>

              <button
                onClick={addOutlineBeat}
                className="w-full py-2 bg-black text-white brutal-border-thick hover:bg-[#FF4444] transition-colors uppercase font-bold tracking-widest text-xs brutal-shadow-hover"
              >
                + Add Beat
              </button>

              {outlineBeats.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-gray-300 text-gray-400 font-mono text-xs uppercase">
                  No beats. Add one above or let the Director improvise.
                </div>
              ) : (
                <div className="space-y-4">
                  {outlineBeats.map((beat, idx) => (
                    <div key={`beat-${beat.phase ?? ''}-${beat.turn_start ?? ''}-${beat.turn_end ?? ''}-${idx}`} className="bg-gray-50 p-4 brutal-border-thick brutal-shadow relative space-y-3">
                      <button
                        onClick={() => removeOutlineBeat(idx)}
                        aria-label={`Remove beat ${idx + 1}`}
                        className="absolute top-3 right-3 text-gray-400 hover:text-[#FF4444] font-bold text-xl leading-none transition-colors"
                      >
                        ×
                      </button>

                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 pr-6">
                        <BookOpen className="w-3 h-3" />
                        <span>Beat {idx + 1}</span>
                      </div>

                      {/* Phase + turn range row */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Phase</label>
                          <select
                            value={beat.phase}
                            onChange={(e) => updateOutlineBeat(idx, "phase", e.target.value)}
                            className={inputClass}
                          >
                            <option value="Setup">Setup</option>
                            <option value="Turn">Turn</option>
                            <option value="Prestige">Prestige</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Turn start</label>
                          <input
                            type="number"
                            min={0}
                            value={beat.turn_start}
                            onChange={(e) => updateOutlineBeat(idx, "turn_start", Number(e.target.value))}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Turn end</label>
                          <input
                            type="number"
                            min={0}
                            value={beat.turn_end}
                            onChange={(e) => updateOutlineBeat(idx, "turn_end", Number(e.target.value))}
                            className={inputClass}
                          />
                        </div>
                      </div>

                      {/* Goal */}
                      <div>
                        <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Goal (what must happen)</label>
                        <textarea
                          value={beat.goal}
                          onChange={(e) => updateOutlineBeat(idx, "goal", e.target.value)}
                          className={textareaClass}
                          rows={2}
                          placeholder="e.g. Alice discovers the letter hidden in the study"
                        />
                      </div>

                      {/* Constraint */}
                      <div>
                        <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Constraint (how it must happen)</label>
                        <textarea
                          value={beat.constraint}
                          onChange={(e) => updateOutlineBeat(idx, "constraint", e.target.value)}
                          className={textareaClass}
                          rows={2}
                          placeholder="e.g. Without direct confrontation — she must infer it"
                        />
                      </div>

                      {/* Avoid */}
                      <div>
                        <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Avoid (forbidden paths)</label>
                        <textarea
                          value={beat.avoid}
                          onChange={(e) => updateOutlineBeat(idx, "avoid", e.target.value)}
                          className={textareaClass}
                          rows={2}
                          placeholder="e.g. Do not let Bob speak; keep the setting indoors"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Save button */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={saveOutline}
                  className="flex-1 py-2 bg-black text-white brutal-border-thick hover:bg-[#FF4444] transition-colors uppercase font-bold tracking-widest text-xs brutal-shadow-hover"
                >
                  Save to Engine
                </button>
                {outlineSaved === true && (
                  <span className="text-green-600 font-bold uppercase text-[10px] tracking-widest">Saved ✓</span>
                )}
                {outlineSaved === false && (
                  <span className="text-[#FF4444] font-bold uppercase text-[10px] tracking-widest">Error ✗</span>
                )}
              </div>

              {outlineBeats.length > 0 && (
                confirmClearBeats ? (
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        await fetch("/api/outline", { method: "DELETE" });
                        setOutlineBeats([]);
                        setConfirmClearBeats(false);
                      }}
                      className="flex-1 py-1.5 bg-[#FF4444] text-white brutal-border hover:bg-red-700 transition-colors uppercase font-bold tracking-widest text-[10px]"
                    >
                      Confirm Clear
                    </button>
                    <button
                      onClick={() => setConfirmClearBeats(false)}
                      className="flex-1 py-1.5 bg-white text-black brutal-border hover:bg-gray-100 transition-colors uppercase font-bold tracking-widest text-[10px]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClearBeats(true)}
                    className="w-full py-1.5 bg-white text-gray-400 brutal-border hover:text-[#FF4444] hover:border-[#FF4444] transition-colors uppercase font-bold tracking-widest text-[10px]"
                  >
                    Clear All Beats
                  </button>
                )
              )}
            </div>
          </section>
        )}

        {/* ── QBN Qualities ── */}
        {activeTab === "qbn" && (
          <section className="space-y-4">
            <div className="bg-white p-6 brutal-border-thick brutal-shadow space-y-5">
              <p className="text-[10px] font-mono text-gray-500 uppercase leading-relaxed">
                Quality-Based Narrative values used to gate choices. Edit directly or add new qualities below.
              </p>

              {/* Add new quality */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Name</label>
                  <input
                    type="text"
                    value={newQualityKey}
                    onChange={(e) => setNewQualityKey(e.target.value)}
                    placeholder="e.g. CLUE_COUNT"
                    className={inputClass}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newQualityKey.trim()) {
                        updateQbnQuality(newQualityKey.trim(), Number(newQualityValue));
                        setNewQualityKey("");
                        setNewQualityValue("0");
                      }
                    }}
                  />
                </div>
                <div className="w-24">
                  <label className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Value</label>
                  <input
                    type="number"
                    value={newQualityValue}
                    onChange={(e) => setNewQualityValue(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <button
                  onClick={() => {
                    if (!newQualityKey.trim()) return;
                    updateQbnQuality(newQualityKey.trim(), Number(newQualityValue));
                    setNewQualityKey("");
                    setNewQualityValue("0");
                  }}
                  className="px-3 py-2 bg-black text-white brutal-border-thick hover:bg-[#FF4444] transition-colors uppercase font-bold text-xs brutal-shadow-hover shrink-0"
                >
                  Add
                </button>
              </div>

              {/* Existing qualities */}
              {Object.keys(directorState.qbnQualities ?? {}).length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-gray-300 text-gray-400 font-mono text-xs uppercase">
                  No qualities set. Add one above.
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(directorState.qbnQualities ?? {}).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-2 bg-gray-50 p-2 brutal-border">
                      <span className="flex-1 font-mono text-xs font-bold uppercase truncate" title={key}>{key}</span>
                      <input
                        type="number"
                        value={val}
                        onChange={(e) => updateQbnQuality(key, Number(e.target.value))}
                        aria-label={`Value for quality ${key}`}
                        className="w-20 bg-white brutal-border px-2 py-1 text-xs font-mono text-right focus:outline-none"
                      />
                      <button
                        onClick={() => removeQbnQuality(key)}
                        aria-label={`Remove quality ${key}`}
                        className="text-gray-400 hover:text-[#FF4444] font-bold text-xl leading-none transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Active secrets with QBN context */}
              {currentScene.isQBNMode && (
                <div className="pt-4 border-t-[4px] border-black">
                  <div className="bg-black text-white p-3 font-bold uppercase tracking-widest text-xs">
                    QBN Mode Active — {Object.keys(directorState.qbnQualities ?? {}).length} qualities governing {currentScene.choices.length} choices
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

      </div>
    </motion.div>
  );
}
