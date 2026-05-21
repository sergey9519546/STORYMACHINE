import React, { useState, useEffect, useRef, useCallback } from "react";
import type {
  CharacterSheet,
  Location,
  ActionLogEntry,
  IllusionState,
  Belief,
  BeatTrace,
  BeliefEdge,
  GoalMutation,
  EmotionType,
  PersuasionRecord,
  DramaticPressure,
} from "../../server/engine/types";
import { FileDown, Brain, Eye, AlertTriangle, GitBranch, Target, Zap, Smile, Shuffle, Settings, Scissors } from "lucide-react";
import ScenarioBuilder from "./storymachine/ScenarioBuilder";
import SettingsPanel from "./SettingsPanel";
import WhatIfPanel from "./WhatIfPanel";
import EpistemicMap from "./EpistemicMap";
import DirectorCutPanel from "./DirectorCutPanel";
import { HarvestPanel } from "./HarvestPanel";
import { ConvergePanel } from "./ConvergePanel";
import { CorpusPanel } from "./CorpusPanel";
import { ArcTimelinePanel } from "./ArcTimelinePanel";
import { ArcPlannerPanel } from "./ArcPlannerPanel";
import { ProjectionGalleryPanel } from "./ProjectionGalleryPanel";
import { CausalTwinPanel } from "./CausalTwinPanel";
import { FixedPointsPanel } from "./FixedPointsPanel";
import { SelfPlayPanel } from "./SelfPlayPanel";
import { ProofInspectorPanel } from "./ProofInspectorPanel";
import { QualityEnginesPanel } from "./QualityEnginesPanel";
import { EpistemicMapPanel } from "./EpistemicMapPanel";
import { ArcCompletionPanel } from "./ArcCompletionPanel";
import { StoryHealthPanel } from "./StoryHealthPanel";
import { CharacterArcPanel } from "./CharacterArcPanel";
import { RegressionPanel } from "./RegressionPanel";
import { MomentumPanel } from "./MomentumPanel";
import { VoiceDNAPanel } from "./VoiceDNAPanel";

// ── Emotion display helpers ───────────────────────────────────────────────────

const EMOTION_COLOR: Record<EmotionType, string> = {
  neutral:  'bg-gray-200 text-gray-600',
  joy:      'bg-green-500 text-white',
  distress: 'bg-red-800 text-white',
  anger:    'bg-[#FF4444] text-white',
  fear:     'bg-purple-600 text-white',
  pride:    'bg-yellow-400 text-black',
  shame:    'bg-gray-500 text-white',
};

const EMOTION_BG: Record<EmotionType, string> = {
  neutral:  'bg-gray-200',
  joy:      'bg-green-500',
  distress: 'bg-red-800',
  anger:    'bg-[#FF4444]',
  fear:     'bg-purple-600',
  pride:    'bg-yellow-400',
  shame:    'bg-gray-500',
};

const PERSUASION_BADGE: Record<string, string> = {
  logic:        'bg-blue-600 text-white',
  emotion:      'bg-pink-500 text-white',
  authority:    'bg-gray-800 text-white',
  reciprocity:  'bg-teal-600 text-white',
  social_proof: 'bg-orange-500 text-white',
};

interface StoryMachineProps {
  onClose?: () => void;
  onExportToIDE?: (fountain: string, characters: Array<{ name: string; ghost: string; lie: string; want: string; need: string }>) => void;
}

const BEAT_COLORS: Record<string, string> = {
  inciting_action:          'bg-blue-600',
  contradiction_discovered: 'bg-[#FF4444]',
  goal_mutated:             'bg-orange-500',
  pressure_applied:         'bg-purple-600',
  revelation:               'bg-yellow-500',
  turning_point:            'bg-green-600',
};

const INFO_POS_LABEL: Record<string, string> = {
  superior: 'AUD > CHARS',
  inferior: 'CHARS > AUD',
  parity:   'PARITY',
};

export default function StoryMachine({ onClose, onExportToIDE }: StoryMachineProps) {
  const [agents, setAgents] = useState<CharacterSheet[]>([]);
  const [nodes, setNodes] = useState<Location[]>([]);
  const [ledger, setLedger] = useState<ActionLogEntry[]>([]);
  const [illusionState, setIllusionState] = useState<IllusionState | null>(null);
  const [beatTraces, setBeatTraces] = useState<BeatTrace[]>([]);
  const [beliefEdges, setBeliefEdges] = useState<BeliefEdge[]>([]);
  const [goalMutations, setGoalMutations] = useState<GoalMutation[]>([]);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [syuzhetMode, setSyuzhetMode] = useState(false);
  const [persuasionLog, setPersuasionLog] = useState<Record<string, PersuasionRecord[]>>({});
  const [activePressures, setActivePressures] = useState<Array<{ char_id: string; pressures: DramaticPressure[] }>>([]);
  const ledgerEndRef = useRef<HTMLDivElement>(null);
  const evtSourceRef = useRef<EventSource | null>(null);
  const mountedRef   = useRef(true);
  const [loading, setLoading] = useState(false);
  const [streamLog, setStreamLog] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showError = useCallback((msg: string) => {
    setErrorMsg(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setErrorMsg(null), 6000);
  }, []);

  useEffect(() => () => { if (errorTimerRef.current) clearTimeout(errorTimerRef.current); }, []);
  const [showBuilder, setShowBuilder]   = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showWhatIf, setShowWhatIf]         = useState(false);
  const [showEpistemic, setShowEpistemic]   = useState(false);
  const [showDirectorCut, setShowDirectorCut] = useState(false);
  const [showHarvest, setShowHarvest]       = useState(false);
  const [showConverge, setShowConverge]     = useState(false);
  const [showCorpus, setShowCorpus]         = useState(false);
  const [showTimeline, setShowTimeline]     = useState(false);
  const [showArcPlanner, setShowArcPlanner] = useState(false);
  const [showProjection, setShowProjection] = useState(false);
  const [showCausalTwin, setShowCausalTwin] = useState(false);
  const [showFixedPoints, setShowFixedPoints] = useState(false);
  const [showSelfPlay, setShowSelfPlay]         = useState(false);
  const [showProofInspector, setShowProofInspector] = useState(false);
  const [showQualityEngines, setShowQualityEngines] = useState(false);
  const [showEpistemicMap, setShowEpistemicMap]   = useState(false);
  const [showArcCompletion, setShowArcCompletion] = useState(false);
  const [showStoryHealth, setShowStoryHealth]   = useState(false);
  const [showCharacterArc, setShowCharacterArc] = useState(false);
  const [showRegression, setShowRegression]     = useState(false);
  const [showMomentum, setShowMomentum]         = useState(false);
  const [showVoiceDNA, setShowVoiceDNA]         = useState(false);

  const fetchActivePressures = useCallback(async () => {
    try {
      const res = await fetch("/api/dramatic-pressure-all");
      if (res.ok && mountedRef.current) setActivePressures(await res.json() as Array<{ char_id: string; pressures: DramaticPressure[] }>);
    } catch { /* non-critical background fetch */ }
  }, []);

  // Close any in-flight SSE connection and mark unmounted
  useEffect(() => () => {
    mountedRef.current = false;
    evtSourceRef.current?.close();
  }, []);

  useEffect(() => {
    fetchState();
    fetchLedger();
    fetchIllusionState();
    fetchSpineData();
    fetchActivePressures();
  }, [fetchActivePressures]);

  const fetchPersuasionLog = useCallback(async (agentIds: string[]) => {
    const entries = await Promise.all(
      agentIds.map(id =>
        fetch(`/api/persuasion/${id}`).then(r => r.ok ? r.json() as Promise<PersuasionRecord[]> : [])
      )
    );
    if (!mountedRef.current) return;
    const map: Record<string, PersuasionRecord[]> = {};
    agentIds.forEach((id, i) => { map[id] = entries[i] ?? []; });
    setPersuasionLog(map);
  }, []);

  useEffect(() => {
    ledgerEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ledger]);

  const fetchState = async () => {
    try {
      const res = await fetch("/api/state");
      if (!res.ok || !mountedRef.current) return;
      const data = await res.json() as { agents: CharacterSheet[]; nodes: Location[] };
      setAgents(data.agents);
      setNodes(data.nodes);
      if (data.agents.length > 0) {
        fetchPersuasionLog(data.agents.map(a => a.char_id));
      }
    } catch { /* silent — background poll */ }
  };

  const fetchLedger = async () => {
    try {
      const res = await fetch("/api/ledger");
      if (!res.ok || !mountedRef.current) return;
      const data = await res.json() as ActionLogEntry[];
      setLedger(data);
    } catch { /* silent — background poll */ }
  };

  const fetchIllusionState = async () => {
    try {
      const res = await fetch("/api/simulation/illusion-state");
      if (!res.ok || !mountedRef.current) return;
      const data = await res.json() as IllusionState;
      setIllusionState(data);
    } catch { /* silent — background poll */ }
  };

  const fetchSpineData = async () => {
    try {
      const [beatsRes, edgesRes, mutationsRes] = await Promise.all([
        fetch("/api/beat-traces"),
        fetch("/api/belief-edges"),
        fetch("/api/goal-mutations"),
      ]);
      if (!mountedRef.current) return;
      if (beatsRes.ok)     setBeatTraces(await beatsRes.json() as BeatTrace[]);
      if (edgesRes.ok)     setBeliefEdges(await edgesRes.json() as BeliefEdge[]);
      if (mutationsRes.ok) setGoalMutations(await mutationsRes.json() as GoalMutation[]);
    } catch { /* silent — background poll */ }
  };

  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchState(), fetchLedger(), fetchIllusionState(), fetchSpineData(), fetchActivePressures(),
    ]).catch(() => { /* silent — background refresh */ });
  }, [fetchPersuasionLog, fetchActivePressures]);

  // Wipes any existing session, posts a fresh scenario, and refreshes all panels.
  const submitScenario = useCallback(async (payload: { nodes: Location[]; agents: CharacterSheet[] }) => {
    setShowBuilder(false);
    setLoading(true);
    try {
      // Reset first so a new scenario never inherits stale agents/ledger from a
      // prior session (sessions now persist to disk between server restarts).
      const resetRes = await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!resetRes.ok) throw new Error(`Reset failed: ${resetRes.status}`);
      const initRes = await fetch("/api/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!initRes.ok) throw new Error(`Init failed: ${initRes.status}`);
      await refreshAll();
    } catch (e) {
      showError((e as Error).message ?? 'Failed to start scenario. Check the server.');
    } finally {
      setLoading(false);
    }
  }, [refreshAll, showError]);

  // The original hardcoded scenario, now offered as a one-click preset.
  const loadExample = useCallback(() => {
    const initialNodes: Location[] = [
      {
        location_id: "room_a",
        name: "The Study",
        description: "A dimly lit study with a large mahogany desk. Dust motes dance in the sliver of moonlight.",
        adjacent_locations: ["hallway"],
      },
      {
        location_id: "hallway",
        name: "Main Hallway",
        description: "A long, echoing hallway with portraits of stern ancestors.",
        adjacent_locations: ["room_a", "room_b"],
      },
      {
        location_id: "room_b",
        name: "The Conservatory",
        description: "A glass-walled room filled with overgrown, exotic plants. It smells of damp earth.",
        adjacent_locations: ["hallway"],
      },
    ];

    const initialAgents: CharacterSheet[] = [
      {
        char_id: "agent_1",
        name: "Detective Vance",
        public_mask: "A world-weary, cynical detective who speaks in short, clipped sentences.",
        hidden_motive: "Find the torn letter before anyone else does to protect a past mistake.",
        knowledge_vector: ["The victim was poisoned", "The study was the last known location"],
        suspicion_score: 20,
        current_location_id: "room_a",
        is_alive: true,
        darkTriad: { machiavellianism: 65, narcissism: 40, psychopathy: 30 },
        bigFive: { openness: 60, conscientiousness: 85, extraversion: 35, agreeableness: 30, neuroticism: 55 },
        attachmentStyle: "avoidant",
        defenseMechanisms: ["rationalization", "intellectualization"],
      },
      {
        char_id: "agent_2",
        name: "Lady Eleanor",
        public_mask: "A grieving widow, elegant and softly spoken, prone to dramatic sighs.",
        hidden_motive: "Ensure Vance does not find the letter. Misdirect him to the Conservatory.",
        knowledge_vector: ["The letter is in the desk", "Vance is getting too close"],
        suspicion_score: 10,
        current_location_id: "room_a",
        is_alive: true,
        darkTriad: { machiavellianism: 80, narcissism: 60, psychopathy: 25 },
        bigFive: { openness: 70, conscientiousness: 60, extraversion: 65, agreeableness: 55, neuroticism: 70 },
        attachmentStyle: "anxious_avoidant",
        defenseMechanisms: ["projection", "displacement", "denial"],
      },
    ];

    submitScenario({ nodes: initialNodes, agents: initialAgents });
  }, [submitScenario]);

  const handleTurn = async (agentId: string) => {
    setLoading(true);
    try {
      await fetch("/api/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      await refreshAll();
    } catch (e) {
      showError((e as Error).message ?? 'Turn failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunRoom = async (nodeId: string) => {
    evtSourceRef.current?.close();
    setLoading(true);
    setStreamLog([]);
    try {
      const url = `/api/run-room-stream?nodeId=${encodeURIComponent(nodeId)}`;
      const evtSource = new EventSource(url);
      evtSourceRef.current = evtSource;
      await new Promise<void>((resolve, reject) => {
        evtSource.onmessage = (e) => {
          try {
            const event = JSON.parse(e.data) as {
              type: string; agentName?: string; action?: { action_type: string; content: string };
              round?: number; totalTurns?: number; stoppedBy?: string;
            };
            if (event.type === 'agent_action' && event.agentName && event.action) {
              setStreamLog(prev => [...prev, `${event.agentName}: [${event.action!.action_type}] ${event.action!.content.slice(0, 60)}…`]);
            } else if (event.type === 'round_complete') {
              setStreamLog(prev => [...prev, `— Round ${event.round} complete —`]);
            } else if (event.type === 'simulation_complete') {
              evtSource.close();
              evtSourceRef.current = null;
              resolve();
            }
          } catch { /* ignore parse errors */ }
        };
        evtSource.onerror = () => {
          evtSource.close();
          evtSourceRef.current = null;
          reject(new Error('SSE connection lost'));
        };
      });
      await refreshAll();
    } catch (e) {
      showError((e as Error).message ?? 'Room simulation failed.');
    } finally {
      setLoading(false);
      setStreamLog([]);
    }
  };

  const handleExport = useCallback(async () => {
    if (ledger.length === 0) return;
    setIsExporting(true);
    try {
      const res = await fetch(`/api/ledger/fountain?syuzhet=${syuzhetMode}`);
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      const data = await res.json() as {
        fountain: string;
        characters: Array<{ name: string; ghost: string; lie: string; want: string; need: string }>;
        turnCount: number;
      };
      if (onExportToIDE) {
        onExportToIDE(data.fountain, data.characters);
      } else {
        const blob = new Blob([data.fountain], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "storymachine-draft.fountain";
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      showError((e as Error).message ?? 'Export failed.');
    } finally {
      setIsExporting(false);
    }
  }, [ledger.length, onExportToIDE, syuzhetMode, showError]);

  const illusionColor =
    illusionState?.phase === "Prestige" ? "#FF4444"
      : illusionState?.phase === "Turn" ? "#FF8800"
      : "#22cc44";

  return (
    <div className="min-h-screen bg-[#f4f4f0] text-black p-8 font-sans">
      {errorMsg && (
        <div
          role="alert"
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-5 py-3 font-mono text-sm border-2 border-black shadow-lg flex items-center gap-3"
        >
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-2 font-bold leading-none hover:opacity-70">✕</button>
        </div>
      )}
      <header className="mb-8 border-b-4 border-black pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-widest text-black">
            Story Machine
          </h1>
          <p className="text-gray-600 text-sm mt-1 font-mono uppercase">
            OASIS Architecture — Perspective-Bounded Simulation
          </p>
        </div>
        <div className="flex gap-3 items-center flex-wrap justify-end">
          {illusionState && (
            <div
              className="text-[10px] font-bold uppercase tracking-widest px-3 py-2 brutal-border"
              style={{ background: illusionColor, color: "white" }}
            >
              Phase: {illusionState.phase} · {illusionState.total_turns} turns
            </div>
          )}
          {ledger.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSyuzhetMode(m => !m)}
                title="Syuzhet mode: reorders the screenplay by information-reveal priority (revelation first, then flashback)"
                className={`text-[10px] px-3 py-2 font-bold uppercase tracking-widest brutal-border brutal-shadow-hover transition-colors ${
                  syuzhetMode ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"
                }`}
              >
                Syuzhet {syuzhetMode ? "ON" : "OFF"}
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="bg-[#FF4444] hover:bg-black text-white px-4 py-2 font-bold uppercase tracking-wider disabled:opacity-50 brutal-border brutal-shadow-hover transition-colors flex items-center gap-2 text-xs"
              >
                <FileDown className="w-4 h-4" />
                {isExporting ? "Exporting…" : "Export to Script IDE"}
              </button>
            </div>
          )}
          <button
            onClick={() => setShowDirectorCut(true)}
            title="Director's Cut — inject ops mid-sim"
            className="bg-yellow-900 hover:bg-yellow-700 text-yellow-200 px-3 py-2 brutal-border brutal-shadow-hover transition-colors flex items-center gap-1 text-xs"
          >
            <Scissors className="w-4 h-4" />
            <span className="hidden sm:inline">Cut</span>
          </button>
          <button
            onClick={() => setShowWhatIf(true)}
            title="What-If / Ghost Commits"
            className="bg-purple-900 hover:bg-purple-700 text-purple-200 px-3 py-2 brutal-border brutal-shadow-hover transition-colors flex items-center gap-1 text-xs"
          >
            <GitBranch className="w-4 h-4" />
            <span className="hidden sm:inline">What-If</span>
          </button>
          <button
            onClick={() => setShowEpistemic(true)}
            title="Epistemic Map"
            className="bg-cyan-900 hover:bg-cyan-700 text-cyan-200 px-3 py-2 brutal-border brutal-shadow-hover transition-colors flex items-center gap-1 text-xs"
          >
            <Brain className="w-4 h-4" />
            <span className="hidden sm:inline">Beliefs</span>
          </button>
          <button
            onClick={() => setShowHarvest(true)}
            title="Harvest — quality metrics + sidecar download"
            className="bg-emerald-900 hover:bg-emerald-700 text-emerald-200 px-3 py-2 brutal-border brutal-shadow-hover transition-colors flex items-center gap-1 text-xs"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">Harvest</span>
          </button>
          <button
            onClick={() => setShowConverge(true)}
            title="Convergence Search — AlphaZero-for-drama"
            className="bg-rose-900 hover:bg-rose-700 text-rose-200 px-3 py-2 brutal-border brutal-shadow-hover transition-colors flex items-center gap-1 text-xs"
          >
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Converge</span>
          </button>
          <button
            onClick={() => setShowCorpus(true)}
            title="Director Policy — learned from self-play corpus"
            className="bg-violet-900 hover:bg-violet-700 text-violet-200 px-3 py-2 brutal-border brutal-shadow-hover transition-colors flex items-center gap-1 text-xs"
          >
            <Shuffle className="w-4 h-4" />
            <span className="hidden sm:inline">Policy</span>
          </button>
          <button
            onClick={() => setShowTimeline(true)}
            title="Arc Timeline — scene-by-scene proof/quality/tension view"
            className="bg-slate-700 hover:bg-slate-500 text-slate-200 px-3 py-2 brutal-border brutal-shadow-hover transition-colors flex items-center gap-1 text-xs"
          >
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Arc</span>
          </button>
          <button
            onClick={() => setShowArcPlanner(true)}
            title="Arc Compiler — multi-scene convergence planning"
            className="bg-fuchsia-900 hover:bg-fuchsia-700 text-fuchsia-200 px-3 py-2 brutal-border brutal-shadow-hover transition-colors flex items-center gap-1 text-xs"
          >
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Compile</span>
          </button>
          <button
            onClick={() => setShowProjection(true)}
            title="Projection Gallery — one canon, every format (G3)"
            className="bg-teal-900 hover:bg-teal-700 text-teal-200 px-3 py-2 brutal-border brutal-shadow-hover transition-colors flex items-center gap-1 text-xs"
          >
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Project</span>
          </button>
          <button
            onClick={() => setShowCausalTwin(true)}
            title="Causal Twin — Pearl's do()-calculus intervention (G4)"
            className="bg-orange-900 hover:bg-orange-700 text-orange-200 px-3 py-2 brutal-border brutal-shadow-hover transition-colors flex items-center gap-1 text-xs"
          >
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Twin</span>
          </button>
          <button
            onClick={() => setShowFixedPoints(true)}
            title="Fixed Points — temporal authoring, author destiny (G9)"
            className="bg-purple-900 hover:bg-purple-700 text-purple-200 px-3 py-2 brutal-border brutal-shadow-hover transition-colors flex items-center gap-1 text-xs"
          >
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Destiny</span>
          </button>
          <button
            onClick={() => setShowSelfPlay(true)}
            title="Self-Play — G13 corpus launcher, genome diff/breed"
            className="bg-emerald-900 hover:bg-emerald-700 text-emerald-200 px-3 py-2 brutal-border brutal-shadow-hover transition-colors flex items-center gap-1 text-xs"
          >
            <Zap className="w-4 h-4" />
            <span className="hidden sm:inline">Corpus</span>
          </button>
          <button
            onClick={() => setShowProofInspector(true)}
            title="Proof Inspector — 4-tier scene analysis + repair patches"
            className="bg-rose-900 hover:bg-rose-700 text-rose-200 px-3 py-2 brutal-border brutal-shadow-hover transition-colors flex items-center gap-1 text-xs"
          >
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">Prove</span>
          </button>
          <button
            onClick={() => setShowQualityEngines(true)}
            title="Quality Engines — 9 narrative quality signals per committed scene"
            className="bg-emerald-900 hover:bg-emerald-700 text-emerald-200 px-3 py-2 brutal-border brutal-shadow-hover transition-colors flex items-center gap-1 text-xs"
          >
            <span style={{ fontSize: 14 }}>◈</span>
            <span className="hidden sm:inline">Quality</span>
          </button>
          <button
            onClick={() => setShowEpistemicMap(true)}
            title="Epistemic Map — who believes what about whom, ToM² meta-layers, dramatic irony"
            className="bg-violet-900 hover:bg-violet-700 text-violet-200 px-3 py-2 brutal-border brutal-shadow-hover transition-colors flex items-center gap-1 text-xs"
          >
            <span style={{ fontSize: 14 }}>◎</span>
            <span className="hidden sm:inline">Epistemic</span>
          </button>
          <button
            onClick={() => setShowArcCompletion(true)}
            title="Arc Completion — track open narrative promises with pacing scores"
            className="bg-amber-900 hover:bg-amber-700 text-amber-200 px-3 py-2 brutal-border brutal-shadow-hover transition-colors flex items-center gap-1 text-xs"
          >
            <span style={{ fontSize: 14 }}>◷</span>
            <span className="hidden sm:inline">Arcs</span>
          </button>
          <button
            onClick={() => setShowStoryHealth(true)}
            title="Story Health — unified vitals: tension, quality, arcs, epistemic depth"
            className="bg-sky-900 hover:bg-sky-700 text-sky-200 px-3 py-2 brutal-border brutal-shadow-hover transition-colors flex items-center gap-1 text-xs"
          >
            <span style={{ fontSize: 14 }}>♥</span>
            <span className="hidden sm:inline">Health</span>
          </button>
          <button
            onClick={() => setShowCharacterArc(true)}
            title="Character Arc — per-character belief, emotion, relationship, and agency trajectories"
            className="bg-pink-900 hover:bg-pink-700 text-pink-200 px-3 py-2 brutal-border brutal-shadow-hover transition-colors flex items-center gap-1 text-xs"
          >
            <span style={{ fontSize: 14 }}>⟳</span>
            <span className="hidden sm:inline">Chars</span>
          </button>
          <button
            onClick={() => setShowRegression(true)}
            title="Narrative Regression Suite — 14 structural invariants graded like a CI test run"
            className="bg-violet-950 hover:bg-violet-800 text-violet-300 px-3 py-2 brutal-border brutal-shadow-hover transition-colors flex items-center gap-1 text-xs"
          >
            <span style={{ fontSize: 14 }}>✓</span>
            <span className="hidden sm:inline">Tests</span>
          </button>
          <button
            onClick={() => setShowMomentum(true)}
            title="Narrative Momentum — per-scene CI history of quality, regression, tension, and proofs"
            className="bg-emerald-950 hover:bg-emerald-800 text-emerald-300 px-3 py-2 brutal-border brutal-shadow-hover transition-colors flex items-center gap-1 text-xs"
          >
            <span style={{ fontSize: 14 }}>⚡</span>
            <span className="hidden sm:inline">Momentum</span>
          </button>
          <button
            onClick={() => setShowVoiceDNA(true)}
            title="Voice DNA — stylometric fingerprints, pairwise voice similarity matrix, acoustic twins"
            className="bg-indigo-950 hover:bg-indigo-800 text-indigo-300 px-3 py-2 brutal-border brutal-shadow-hover transition-colors flex items-center gap-1 text-xs"
          >
            <span style={{ fontSize: 14 }}>🧬</span>
            <span className="hidden sm:inline">Voice</span>
          </button>
          <button
            onClick={() => setShowSettings(true)}
            title="AI Provider Settings"
            className="bg-white text-black px-3 py-2 brutal-border brutal-shadow-hover hover:bg-gray-100 transition-colors flex items-center"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="bg-white text-black px-4 py-2 font-bold uppercase tracking-wider brutal-border brutal-shadow-hover hover:bg-gray-100 transition-colors"
          >
            Back to IDE
          </button>
          <button
            onClick={() => setShowBuilder(true)}
            disabled={loading}
            className="bg-black hover:bg-[#FF4444] text-white px-4 py-2 font-bold uppercase tracking-wider disabled:opacity-50 brutal-border brutal-shadow-hover transition-colors"
          >
            Build Scenario
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Agents & Nodes */}
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-4 uppercase text-black border-b-2 border-black pb-2">
              The Stage
            </h2>
            <div className="space-y-4">
              {nodes.map((node) => {
                const here = agents.filter(a => a.current_location_id === node.location_id);
                return (
                  <div key={node.location_id} className="bg-white p-4 brutal-border-thick brutal-shadow">
                    <h3 className="font-bold text-lg text-black uppercase tracking-wider">{node.name}</h3>
                    <p className="text-sm text-gray-700 mt-2 font-mono">{node.description}</p>
                    <div className="mt-2 text-xs text-gray-500 font-mono uppercase">
                      {here.length > 0 ? `Present: ${here.map(a => a.name).join(", ")}` : "Empty"}
                    </div>
                    <div className="mt-1 text-xs text-gray-400 font-mono uppercase border-t border-dashed border-gray-200 pt-1">
                      Connected: {node.adjacent_locations.join(", ")}
                    </div>
                    <button
                      onClick={() => handleRunRoom(node.location_id)}
                      disabled={loading}
                      className="mt-4 w-full bg-black hover:bg-[#FF4444] text-white py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50 brutal-border transition-colors"
                    >
                      {loading ? "Running…" : "Run Dialogue Lock (5 Turns)"}
                    </button>
                    {loading && streamLog.length > 0 && (
                      <div className="mt-2 bg-black text-green-400 font-mono text-xs p-2 max-h-24 overflow-y-auto brutal-border">
                        {streamLog.map((line, i) => <div key={i}>{line}</div>)}
                      </div>
                    )}
                  </div>
                );
              })}
              {nodes.length === 0 && (
                <p className="text-gray-500 italic font-mono text-sm">No nodes initialized.</p>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 uppercase text-black border-b-2 border-black pb-2">
              Agents
            </h2>
            <div className="space-y-4">
              {agents.map((agent) => {
                const isExpanded = expandedAgent === agent.char_id;
                const topBeliefs = (agent.beliefs ?? [])
                  .sort((a, b) => b.confidence - a.confidence)
                  .slice(0, 5);
                const tomEntries = Object.values(agent.theoryOfMind ?? {});
                const agentEdges = beliefEdges.filter(e => e.discovered_by === agent.char_id);
                const agentMutations = goalMutations.filter(m => m.char_id === agent.char_id);

                return (
                  <div key={agent.char_id} className="bg-white p-4 brutal-border-thick brutal-shadow">
                    <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-2">
                      <h3 className="font-bold text-lg text-black uppercase tracking-wider">
                        {agent.name}
                      </h3>
                      <div className="flex items-center gap-1">
                        {agentEdges.length > 0 && (
                          <span className="text-[9px] bg-[#FF4444] text-white px-1.5 py-0.5 font-bold uppercase">
                            {agentEdges.length} CONTRADICTION{agentEdges.length !== 1 ? 'S' : ''}
                          </span>
                        )}
                        <span className="text-[10px] bg-black text-white px-2 py-1 uppercase font-bold tracking-widest">
                          {nodes.find(n => n.location_id === agent.current_location_id)?.name || agent.current_location_id}
                        </span>
                        <button
                          onClick={() => setExpandedAgent(isExpanded ? null : agent.char_id)}
                          title="Toggle belief graph"
                          className="p-1 border-2 border-black hover:bg-black hover:text-white transition-colors"
                        >
                          <Brain className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      <p><span className="font-bold uppercase">Mask:</span> {agent.public_mask}</p>
                      <p><span className="font-bold uppercase">Shadow:</span> {agent.hidden_motive}</p>

                      <div>
                        <div className="flex justify-between mb-0.5">
                          <span className="font-bold uppercase">Suspicion</span>
                          <span className={agent.suspicion_score > 60 ? "text-[#FF4444] font-bold" : ""}>
                            {agent.suspicion_score}/100
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 border border-black">
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${agent.suspicion_score}%`,
                              background: agent.suspicion_score > 60 ? "#FF4444"
                                : agent.suspicion_score > 30 ? "#FF8800" : "#22cc44",
                            }}
                          />
                        </div>
                      </div>

                      {/* ── OCC Emotion state ── */}
                      {agent.emotionState && agent.emotionState.dominant !== 'neutral' && (
                        <div className="border-t border-dashed border-gray-200 pt-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Smile className="w-3 h-3 shrink-0" />
                            <span className={`text-[9px] px-1.5 py-0.5 font-bold uppercase ${EMOTION_COLOR[agent.emotionState.dominant]}`}>
                              {agent.emotionState.dominant} {agent.emotionState.intensity}/100
                            </span>
                            {agent.emotionState.anger_target_id && (
                              <span className="text-[9px] text-[#FF4444] font-bold uppercase">
                                → {agents.find(a => a.char_id === agent.emotionState!.anger_target_id)?.name ?? '?'}
                              </span>
                            )}
                            {/* mini emotion bars */}
                            <div className="flex gap-0.5 items-end h-3">
                              {(['joy','distress','anger','fear','pride','shame'] as const).map(k => (
                                <div
                                  key={k}
                                  title={`${k}: ${agent.emotionState![k]}`}
                                  className={`w-1.5 transition-all ${EMOTION_BG[k]}`}
                                  style={{ height: `${Math.max(2, (agent.emotionState![k] / 100) * 12)}px` }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ── Goal stack summary ── */}
                      {agent.goalStack && (
                        <div className="border-t border-dashed border-gray-200 pt-2">
                          <div className="flex items-start gap-1 mb-1">
                            <Target className="w-3 h-3 shrink-0 mt-0.5" />
                            <div>
                              <div className="text-[9px] font-bold uppercase text-gray-500 mb-0.5">Terminal</div>
                              <div className="text-[10px] font-mono text-black leading-tight">{agent.goalStack.terminal.description}</div>
                            </div>
                          </div>
                          {agent.goalStack.instrumental.filter(g => !g.achieved).slice(0, 2).map(g => (
                            <div key={g.id} className="text-[9px] font-mono text-orange-700 pl-4 flex items-center gap-1">
                              <span>▸</span><span className="truncate">{g.description}</span>
                            </div>
                          ))}
                          {agent.goalStack.instrumental.filter(g => g.achieved).length > 0 && (
                            <div className="text-[9px] text-green-600 pl-4 font-bold">
                              ✓ {agent.goalStack.instrumental.filter(g => g.achieved).length} achieved
                            </div>
                          )}
                        </div>
                      )}

                      {/* ── Persuasion strategies in use ── */}
                      {(persuasionLog[agent.char_id] ?? []).length > 0 && (
                        <div className="border-t border-dashed border-gray-200 pt-2">
                          <div className="flex items-center gap-1 mb-1">
                            <Shuffle className="w-3 h-3" />
                            <span className="text-[9px] font-bold uppercase text-gray-500">Persuasion</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {[...new Map((persuasionLog[agent.char_id] ?? []).map(r => [r.target_id, r])).values()]
                              .slice(0, 4)
                              .map(r => (
                                <span key={r.target_id} className={`text-[9px] px-1.5 py-0.5 font-bold uppercase ${PERSUASION_BADGE[r.strategy] ?? 'bg-gray-400 text-white'}`}>
                                  {r.strategy} → {agents.find(a => a.char_id === r.target_id)?.name ?? r.target_id}
                                </span>
                              ))
                            }
                          </div>
                        </div>
                      )}

                      {/* ── Dramatic Pressure queue ── */}
                      {(() => {
                        const pq = activePressures.find(p => p.char_id === agent.char_id)?.pressures ?? [];
                        if (pq.length === 0) return null;
                        return (
                          <div className="border-t border-dashed border-gray-200 pt-2">
                            <div className="flex items-center gap-1 mb-1">
                              <Zap className="w-3 h-3 text-purple-600" />
                              <span className="text-[9px] font-bold uppercase text-purple-600">{pq.length} pressure{pq.length !== 1 ? 's' : ''}</span>
                            </div>
                            <div className="space-y-0.5">
                              {pq.slice(0, 3).map(p => (
                                <div key={p.pressure_id} className="flex items-center gap-1.5 text-[9px] font-mono pl-1">
                                  <span className="px-1 py-0.5 bg-purple-100 text-purple-800 font-bold uppercase leading-none">{p.pressure_type.replace(/_/g, ' ')}</span>
                                  <span className="text-gray-400">{p.intensity}</span>
                                </div>
                              ))}
                              {pq.length > 3 && <div className="text-[9px] text-gray-400 pl-1">+{pq.length - 3} more…</div>}
                            </div>
                          </div>
                        );
                      })()}

                      {agent.darkTriad && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {agent.darkTriad.machiavellianism > 60 && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-gray-800 text-white font-bold uppercase">Machiavellian</span>
                          )}
                          {agent.darkTriad.narcissism > 60 && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-gray-700 text-white font-bold uppercase">Narcissist</span>
                          )}
                          {agent.darkTriad.psychopathy > 60 && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-[#FF4444] text-white font-bold uppercase">Psychopathic</span>
                          )}
                          {agent.attachmentStyle && agent.attachmentStyle !== "secure" && (
                            <span className="text-[9px] px-1.5 py-0.5 border border-black font-bold uppercase">{agent.attachmentStyle}</span>
                          )}
                        </div>
                      )}

                      <div className="border-t border-dashed border-gray-300 pt-2">
                        <span className="font-bold uppercase">Knowledge:</span>
                        <ul className="list-disc list-inside pl-2 mt-1 text-gray-700">
                          {agent.knowledge_vector.map((k, i) => <li key={i}>{k}</li>)}
                        </ul>
                      </div>
                    </div>

                    {/* Expanded: Beliefs + ToM + Contradictions + Goal Mutations */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t-2 border-black space-y-3">
                        {topBeliefs.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 mb-2">
                              <Eye className="w-3 h-3" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">Belief Graph</span>
                            </div>
                            <div className="space-y-1.5">
                              {topBeliefs.map((b: Belief, i) => (
                                <div key={i} className="flex items-start gap-2 text-[10px] font-mono">
                                  <div className="w-10 shrink-0 mt-1">
                                    <div className="w-full bg-gray-200 h-1.5 border border-gray-400">
                                      <div className="h-full bg-black" style={{ width: `${b.confidence * 100}%` }} />
                                    </div>
                                    <span className="text-[8px] text-gray-400">{Math.round(b.confidence * 100)}%</span>
                                  </div>
                                  <span className={`text-gray-800 leading-tight ${(b.contradicts?.length ?? 0) > 0 ? 'text-[#FF4444]' : ''}`}>
                                    {b.proposition}
                                    {(b.contradicts?.length ?? 0) > 0 && ' ⚡'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {agentEdges.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 mb-2">
                              <GitBranch className="w-3 h-3 text-[#FF4444]" />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF4444]">
                                Contradiction Edges
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {agentEdges.slice(0, 4).map((edge) => (
                                <div key={edge.edge_id} className="text-[10px] font-mono bg-red-50 p-2 border border-red-200">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="font-bold text-[#FF4444] uppercase">{edge.edge_type}</span>
                                    {edge.severity != null && (
                                      <span className="text-[8px] text-gray-500">sev {edge.severity}</span>
                                    )}
                                  </div>
                                  <div className="text-gray-500 text-[9px]">turn {edge.turn_index}</div>
                                  {edge.severity != null && (
                                    <div className="mt-1 w-full bg-gray-200 h-1 border border-gray-300">
                                      <div
                                        className="h-full bg-[#FF4444]"
                                        style={{ width: `${edge.severity}%` }}
                                      />
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {agentMutations.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 mb-2">
                              <Target className="w-3 h-3 text-orange-500" />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600">
                                Goal Mutations
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {agentMutations.slice(-4).map((m) => (
                                <div key={m.mutation_id} className="text-[10px] font-mono bg-orange-50 p-2 border border-orange-200">
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-orange-600 uppercase text-[9px]">
                                      {m.mutation_type.replace(/_/g, ' ')}
                                    </span>
                                    <span className="text-[8px] text-gray-400">t{m.turn_index}</span>
                                  </div>
                                  {m.new_subgoal && (
                                    <div className="text-gray-700 mt-0.5 italic">"{m.new_subgoal}"</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {tomEntries.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 mb-2">
                              <Brain className="w-3 h-3" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">Theory of Mind</span>
                            </div>
                            <div className="space-y-1.5">
                              {tomEntries.map((tom, i) => {
                                const subject = agents.find(a => a.char_id === tom.subject_id);
                                return (
                                  <div key={i} className="text-[10px] font-mono bg-gray-50 p-2 border border-gray-200">
                                    <span className="font-bold">{subject?.name ?? tom.subject_id}</span>
                                    <span className="text-gray-500"> trust: {Math.round(tom.trust_level * 100)}%</span>
                                    <div className="text-gray-600 italic mt-0.5">"{tom.believed_motive}"</div>
                                    {tom.believed_knowledge.length > 0 && (
                                      <div className="text-gray-400 mt-0.5">
                                        Knows: {tom.believed_knowledge.slice(0, 2).join("; ")}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {topBeliefs.length === 0 && tomEntries.length === 0 && agentEdges.length === 0 && agentMutations.length === 0 && (
                          <p className="text-[10px] text-gray-400 font-mono italic">
                            No epistemic data yet. Run a dialogue lock to populate.
                          </p>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => handleTurn(agent.char_id)}
                      disabled={loading}
                      className="mt-4 w-full bg-white text-black hover:bg-black hover:text-white py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50 brutal-border transition-colors"
                    >
                      Force Turn
                    </button>
                  </div>
                );
              })}
              {agents.length === 0 && (
                <p className="text-gray-500 italic font-mono text-sm">No agents initialized.</p>
              )}
            </div>
          </section>
        </div>

        {/* Right: Script Ledger */}
        <div className="lg:col-span-2">
          <section className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 border-b-2 border-black pb-2">
              <h2 className="text-xl font-bold uppercase text-black">Script Ledger</h2>
              {ledger.length > 0 && (
                <span className="text-xs font-mono text-gray-500">{ledger.length} actions recorded</span>
              )}
            </div>
            <div className="flex-1 bg-white brutal-border-thick brutal-shadow p-6 overflow-y-auto font-mono text-sm space-y-6 min-h-[600px]">
              {ledger.map((entry) => {
                const agent = agents.find(a => a.char_id === entry.char_id);
                const node = nodes.find(n => n.location_id === entry.location_id);
                const isLie = entry.action_type === "LIE";
                return (
                  <div
                    key={entry.action_id}
                    className={`border-l-4 pl-4 py-2 ${isLie ? "border-[#FF4444] bg-red-50" : "border-black bg-gray-50"}`}
                  >
                    <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest font-bold">
                      [{new Date(entry.timestamp).toLocaleTimeString()}] @ {node?.name || entry.location_id}
                    </div>
                    <div className="flex items-start gap-2 mb-2 flex-wrap">
                      <span className="font-bold text-black uppercase">{agent?.name || entry.char_id}</span>
                      <span className={`text-[10px] px-2 py-0.5 uppercase font-bold tracking-widest ${isLie ? "bg-[#FF4444] text-white" : "bg-black text-white"}`}>
                        {entry.action_type}
                      </span>
                      {isLie && (
                        <span className="text-[10px] flex items-center gap-1 text-[#FF4444] font-bold">
                          <AlertTriangle className="w-3 h-3" /> LIE
                        </span>
                      )}
                      {entry.target_char_id && (entry.action_type === "SPEAK" || entry.action_type === "LIE") && (
                        <span className="text-[#FF4444] font-bold uppercase text-xs">
                          to {agents.find(a => a.char_id === entry.target_char_id)?.name || entry.target_char_id}
                        </span>
                      )}
                    </div>
                    <div className="text-black whitespace-pre-wrap leading-relaxed">{entry.content}</div>
                  </div>
                );
              })}
              {ledger.length === 0 && (
                <p className="text-gray-500 italic">The stage is silent...</p>
              )}
              <div ref={ledgerEndRef} />
            </div>

            {ledger.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSyuzhetMode(m => !m)}
                    title="Syuzhet: reveal-order reconstruction. Opens on the highest-drama beat, then flashback to cause."
                    className={`text-[10px] px-3 py-2 font-bold uppercase tracking-widest brutal-border transition-colors ${
                      syuzhetMode ? "bg-black text-white" : "bg-white text-black border-black hover:bg-gray-100"
                    }`}
                  >
                    Syuzhet {syuzhetMode ? "ON" : "OFF"}
                  </button>
                  <span className="text-[9px] text-gray-400 font-mono flex-1">
                    {syuzhetMode ? "Revelation-first ordering" : "Chronological order"}
                  </span>
                </div>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="w-full bg-[#FF4444] hover:bg-black text-white py-3 text-xs font-bold uppercase tracking-wider disabled:opacity-50 brutal-border brutal-shadow-hover transition-colors flex items-center justify-center gap-2"
                >
                  <FileDown className="w-4 h-4" />
                  {isExporting ? "Converting to Fountain…" : `Export ${ledger.length} Actions → Script IDE`}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Causal Spine Panel */}
      {beatTraces.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center gap-3 mb-4 border-b-4 border-black pb-3">
            <Zap className="w-5 h-5" />
            <h2 className="text-xl font-bold uppercase text-black tracking-widest">Causal Spine</h2>
            <span className="text-xs font-mono text-gray-500">
              {beatTraces.length} beat{beatTraces.length !== 1 ? 's' : ''} ·{' '}
              {beliefEdges.length} contradiction{beliefEdges.length !== 1 ? 's' : ''} ·{' '}
              {goalMutations.length} mutation{goalMutations.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="relative">
            {/* Vertical timeline spine */}
            <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-black" />

            <div className="space-y-4 pl-8">
              {beatTraces.map((beat) => {
                const colorClass = BEAT_COLORS[beat.beat_type] ?? 'bg-gray-600';
                const infoPos = beat.information_position;
                const participants = beat.participants
                  .map(id => agents.find(a => a.char_id === id)?.name ?? id)
                  .join(', ');

                return (
                  <div key={beat.beat_id} className="relative">
                    {/* Timeline dot */}
                    <div className={`absolute -left-[25px] top-3 w-3 h-3 rounded-full border-2 border-black ${colorClass}`} />

                    <div className="bg-white brutal-border brutal-shadow p-4">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`text-[10px] px-2 py-0.5 text-white font-bold uppercase tracking-widest ${colorClass}`}>
                          {beat.beat_type.replace(/_/g, ' ')}
                        </span>
                        {infoPos && (
                          <span className="text-[9px] px-1.5 py-0.5 border border-black font-bold uppercase font-mono">
                            {INFO_POS_LABEL[infoPos] ?? infoPos}
                          </span>
                        )}
                        <span className="text-[9px] text-gray-400 font-mono">t{beat.turn_index}</span>
                        {participants && (
                          <span className="text-[9px] text-gray-500 font-mono uppercase">{participants}</span>
                        )}
                      </div>

                      <p className="text-sm font-mono text-black leading-snug">
                        {beat.narrative_summary}
                      </p>

                      {beat.fountain_hint && (
                        <p className="mt-2 text-[11px] text-gray-500 italic font-mono border-l-2 border-gray-300 pl-2">
                          {beat.fountain_hint}
                        </p>
                      )}

                      {beat.causal_chain.length > 1 && (
                        <div className="mt-2 text-[9px] font-mono text-gray-400 flex gap-1 flex-wrap items-center">
                          <GitBranch className="w-2.5 h-2.5" />
                          {beat.causal_chain.map((id, i) => (
                            <span key={id}>
                              {id.substring(0, 8)}…{i < beat.causal_chain.length - 1 && <span className="mx-0.5">→</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {showBuilder && (
        <ScenarioBuilder
          onSubmit={submitScenario}
          onLoadExample={loadExample}
          onClose={() => setShowBuilder(false)}
          busy={loading}
        />
      )}

      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}

      {showDirectorCut && (
        <DirectorCutPanel onClose={() => setShowDirectorCut(false)} />
      )}

      {showWhatIf && (
        <WhatIfPanel onClose={() => setShowWhatIf(false)} />
      )}

      {showEpistemic && (
        <EpistemicMap onClose={() => setShowEpistemic(false)} />
      )}

      {showHarvest && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 60 }}>
          <HarvestPanel onClose={() => setShowHarvest(false)} />
        </div>
      )}

      {showConverge && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <ConvergePanel onClose={() => setShowConverge(false)} />
        </div>
      )}

      {showCorpus && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <CorpusPanel onClose={() => setShowCorpus(false)} />
        </div>
      )}

      {showTimeline && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <ArcTimelinePanel onClose={() => setShowTimeline(false)} />
        </div>
      )}

      {showArcPlanner && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <ArcPlannerPanel onClose={() => setShowArcPlanner(false)} />
        </div>
      )}

      {showProjection && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <ProjectionGalleryPanel onClose={() => setShowProjection(false)} />
        </div>
      )}

      {showCausalTwin && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <CausalTwinPanel onClose={() => setShowCausalTwin(false)} />
        </div>
      )}

      {showFixedPoints && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <FixedPointsPanel onClose={() => setShowFixedPoints(false)} />
        </div>
      )}

      {showSelfPlay && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <SelfPlayPanel onClose={() => setShowSelfPlay(false)} />
        </div>
      )}

      {showProofInspector && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <ProofInspectorPanel onClose={() => setShowProofInspector(false)} />
        </div>
      )}

      {showQualityEngines && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <QualityEnginesPanel onClose={() => setShowQualityEngines(false)} />
        </div>
      )}

      {showEpistemicMap && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <EpistemicMapPanel onClose={() => setShowEpistemicMap(false)} />
        </div>
      )}

      {showArcCompletion && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <ArcCompletionPanel onClose={() => setShowArcCompletion(false)} />
        </div>
      )}

      {showStoryHealth && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <StoryHealthPanel onClose={() => setShowStoryHealth(false)} />
        </div>
      )}

      {showCharacterArc && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <CharacterArcPanel onClose={() => setShowCharacterArc(false)} />
        </div>
      )}

      {showRegression && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <RegressionPanel onClose={() => setShowRegression(false)} />
        </div>
      )}

      {showMomentum && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <MomentumPanel onClose={() => setShowMomentum(false)} />
        </div>
      )}

      {showVoiceDNA && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <VoiceDNAPanel onClose={() => setShowVoiceDNA(false)} />
        </div>
      )}
    </div>
  );
}
