import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from "react";
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
import { FileDown, Brain, Eye, AlertTriangle, GitBranch, Target, Zap, Smile, Shuffle, Settings, Scissors, MessageCircle, Users, ShieldCheck, Map as MapIcon, ListChecks, HeartPulse, RefreshCw, CheckCircle2, LineChart, Dna, PenLine, FileEdit, Upload, ChevronDown } from "lucide-react";
// HarvestPanel/CorpusPanel/ArcTimelinePanel stay eager: each is under 8KB
// source, no heavy deps, and not worth their own network round trip.
import { HarvestPanel } from "./HarvestPanel";
import { CorpusPanel } from "./CorpusPanel";
import { ArcTimelinePanel } from "./ArcTimelinePanel";
import { withSession } from "../lib/session.ts";

// Lazily loaded — every one of these is a conditionally-rendered overlay
// behind a showX boolean, never needed on first paint. This is what pushed
// the StoryMachine chunk to 340KB+: 25 panels' combined weight sitting in the
// critical path for a screen that, on first load, renders none of them.
// Splitting them here means opening e.g. "Revise" fetches RevisionPanel.tsx
// on demand instead of everyone paying for it up front.
const ScenarioBuilder = lazy(() => import("./storymachine/ScenarioBuilder"));
const SettingsPanel = lazy(() => import("./SettingsPanel"));
const WhatIfPanel = lazy(() => import("./WhatIfPanel"));
const EpistemicMap = lazy(() => import("./EpistemicMap"));
const DirectorCutPanel = lazy(() => import("./DirectorCutPanel"));
const ConvergePanel = lazy(() => import("./ConvergePanel").then(m => ({ default: m.ConvergePanel })));
const ArcPlannerPanel = lazy(() => import("./ArcPlannerPanel").then(m => ({ default: m.ArcPlannerPanel })));
const ProjectionGalleryPanel = lazy(() => import("./ProjectionGalleryPanel").then(m => ({ default: m.ProjectionGalleryPanel })));
const NarrativeAnalyticsPanel = lazy(() => import("./NarrativeAnalyticsPanel").then(m => ({ default: m.NarrativeAnalyticsPanel })));
const CausalTwinPanel = lazy(() => import("./CausalTwinPanel").then(m => ({ default: m.CausalTwinPanel })));
const FixedPointsPanel = lazy(() => import("./FixedPointsPanel").then(m => ({ default: m.FixedPointsPanel })));
const SelfPlayPanel = lazy(() => import("./SelfPlayPanel").then(m => ({ default: m.SelfPlayPanel })));
const ProofInspectorPanel = lazy(() => import("./ProofInspectorPanel").then(m => ({ default: m.ProofInspectorPanel })));
const QualityEnginesPanel = lazy(() => import("./QualityEnginesPanel").then(m => ({ default: m.QualityEnginesPanel })));
const EpistemicMapPanel = lazy(() => import("./EpistemicMapPanel").then(m => ({ default: m.EpistemicMapPanel })));
const ArcCompletionPanel = lazy(() => import("./ArcCompletionPanel").then(m => ({ default: m.ArcCompletionPanel })));
const StoryHealthPanel = lazy(() => import("./StoryHealthPanel").then(m => ({ default: m.StoryHealthPanel })));
const CharacterArcPanel = lazy(() => import("./CharacterArcPanel").then(m => ({ default: m.CharacterArcPanel })));
const RegressionPanel = lazy(() => import("./RegressionPanel").then(m => ({ default: m.RegressionPanel })));
const MomentumPanel = lazy(() => import("./MomentumPanel").then(m => ({ default: m.MomentumPanel })));
const VoiceDNAPanel = lazy(() => import("./VoiceDNAPanel").then(m => ({ default: m.VoiceDNAPanel })));
const LivePlayPanel = lazy(() => import("./LivePlayPanel").then(m => ({ default: m.LivePlayPanel })));
const RevisionPanel = lazy(() => import("./RevisionPanel").then(m => ({ default: m.RevisionPanel })));
const InterviewPanel = lazy(() => import("./InterviewPanel"));
const RoomPanel = lazy(() => import("./RoomPanel").then(m => ({ default: m.RoomPanel })));

// ── Lazy panel loading fallbacks ─────────────────────────────────────────────
// Two variants matching the two overlay idioms these panels already use:
// (1) panels that render their own full-screen dimmed backdrop (WhatIfPanel,
// EpistemicMap, DirectorCutPanel, ScenarioBuilder, SettingsPanel,
// RevisionPanel, InterviewPanel — each is `fixed inset-0 bg-black/80 z-50` at
// its own root) get a matching backdrop+box fallback so there's no flash of
// nothing between the button click and paint; (2) panels rendered inside the
// `position: fixed` centering wrapper divs below (no backdrop of their own,
// dark-HUD styling) get a small dark card matching that idiom instead.
const PanelLoadingOverlay = () => (
  <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
    <div className="bg-white text-black px-6 py-4 brutal-border-thick brutal-shadow font-mono text-xs font-bold uppercase tracking-widest animate-pulse">
      Loading…
    </div>
  </div>
);

const PanelLoadingInline = () => (
  <div
    style={{
      background: '#0f172a', color: '#e2e8f0', borderRadius: 8,
      padding: 20, fontFamily: 'monospace', fontSize: 13,
      border: '1px solid #334155',
    }}
  >
    Loading…
  </div>
);

// ── Emotion display helpers ───────────────────────────────────────────────────

const EMOTION_COLOR: Record<EmotionType, string> = {
  neutral:  'bg-[var(--sm-ink-faint)] text-white',
  joy:      'bg-[var(--sm-warn)] text-white',
  distress: 'bg-[var(--sm-ink-mute)] text-white',
  anger:    'bg-[var(--sm-stamp)] text-white',
  fear:     'bg-[var(--sm-cool)] text-white',
  pride:    'bg-[var(--sm-ok)] text-white',
  shame:    'bg-[var(--sm-ink-soft)] text-white',
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
  inciting_action:           'bg-[var(--sm-cool)]',
  contradiction_discovered: 'bg-[var(--sm-stamp)]',
  goal_mutated:              'bg-[var(--sm-warn)]',
  pressure_applied:          'bg-[var(--sm-ink-mute)]',
  revelation:                'bg-[var(--sm-cool)]',
  turning_point:             'bg-[var(--sm-ok)]',
};

// Covert set — mirrors SILENT_ACTION_TYPES in server/nvm/bridge/action-to-ops.ts.
// Nothing is spoken aloud for these, so the ledger row reads as concealment
// rather than open conflict (dashed border, muted background, EYE tag).
const COVERT_ACTION_TYPES = new Set<ActionLogEntry['action_type']>(['HIDE', 'OBSERVE', 'LISTEN', 'SEARCH']);

// Action types whose target_char_id is meaningful to surface as a "to X" label.
const TARGETED_ACTION_TYPES = new Set<ActionLogEntry['action_type']>([
  'SPEAK', 'LIE', 'OBSERVE', 'LISTEN', 'REVEAL', 'THREATEN', 'BETRAY', 'PROTECT', 'FORM_ALLIANCE',
]);

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
  const [showAnalytics, setShowAnalytics]       = useState(false);
  const [showVoiceDNA, setShowVoiceDNA]         = useState(false);
  const [showLivePlay, setShowLivePlay]         = useState(false);
  const [showRevision, setShowRevision]         = useState(false);
  const [showInterview, setShowInterview]       = useState(false);
  const [showRoom, setShowRoom]                 = useState(false);
  /** Expert tools live in Inspect ▾ — not as peer header buttons. */
  const [inspectOpen, setInspectOpen] = useState(false);
  const inspectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!inspectOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (inspectRef.current && !inspectRef.current.contains(e.target as Node)) {
        setInspectOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setInspectOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [inspectOpen]);

  // ── Overlay mutual exclusion ────────────────────────────────────────────────
  // QA finding P0-3: each tool owned its own `fixed inset-0 z-50` backdrop, and
  // all were mounted as siblings — so opening one while another was open meant
  // the new backdrop intercepted pointer events to the old one's buttons (4
  // flow timeouts in the browser QA matrix). openOverlay() closes every other
  // overlay before opening the requested one, so only one is ever mounted at a
  // time. Close handlers (setShowX(false)) are unaffected.
  const allOverlaySetters = useMemo(() => ({
    Builder: setShowBuilder, Settings: setShowSettings, DirectorCut: setShowDirectorCut,
    WhatIf: setShowWhatIf, Epistemic: setShowEpistemic, Harvest: setShowHarvest,
    Converge: setShowConverge, Corpus: setShowCorpus, Timeline: setShowTimeline,
    ArcPlanner: setShowArcPlanner, Projection: setShowProjection, CausalTwin: setShowCausalTwin,
    FixedPoints: setShowFixedPoints, SelfPlay: setShowSelfPlay, ProofInspector: setShowProofInspector,
    QualityEngines: setShowQualityEngines, EpistemicMap: setShowEpistemicMap, ArcCompletion: setShowArcCompletion,
    StoryHealth: setShowStoryHealth, CharacterArc: setShowCharacterArc, Regression: setShowRegression,
    Analytics: setShowAnalytics, Momentum: setShowMomentum, VoiceDNA: setShowVoiceDNA,
    LivePlay: setShowLivePlay, Revision: setShowRevision, Interview: setShowInterview, Room: setShowRoom,
  }), []);
  const openOverlay = useCallback((name: keyof typeof allOverlaySetters) => {
    Object.entries(allOverlaySetters).forEach(([key, setter]) => {
      setter(key === name);
    });
  }, [allOverlaySetters]);

  // Keyless-honesty banner (finding E): null until the readiness check
  // resolves, so the banner never flashes an incorrect "no key" warning on
  // first paint. Dismissal is remembered per-app, independently of ScriptIDE's
  // own banner (different localStorage key — the two apps are shown/hidden
  // independently and each has its own idiom for "don't nag again").
  const [llmReady, setLlmReady] = useState<boolean | null>(null);
  const [llmBannerDismissed, setLlmBannerDismissed] = useState(() => {
    try { return localStorage.getItem("sm_llmready_banner_dismissed_storymachine") === "1"; }
    catch { return false; }
  });
  const dismissLlmBanner = useCallback(() => {
    setLlmBannerDismissed(true);
    try { localStorage.setItem("sm_llmready_banner_dismissed_storymachine", "1"); } catch { /* best-effort */ }
  }, []);

  const fetchActivePressures = useCallback(async () => {
    try {
      const res = await fetch("/api/dramatic-pressure-all");
      if (res.ok && mountedRef.current) setActivePressures(await res.json() as Array<{ char_id: string; pressures: DramaticPressure[] }>);
    } catch (err) {
      if (mountedRef.current) showError(`Dramatic pressure fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [showError]);

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

  // Finding E: fetch AI readiness once on mount. Non-fatal on failure — the
  // banner just never renders if we can't determine readiness rather than
  // guessing wrong and nagging a user who's already configured a key.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/ai-config")
      .then(r => (r.ok ? r.json() : null))
      .then((data: { llmReady?: boolean } | null) => {
        if (!cancelled && data && typeof data.llmReady === "boolean") setLlmReady(data.llmReady);
      })
      .catch(() => { /* non-critical — banner stays hidden */ });
    return () => { cancelled = true; };
  }, []);

  // C5: unified fetch-failure notifier — shows a toast only when the component
  // is still mounted (suppresses spurious errors fired during unmount).
  const notifyFetchFailure = useCallback((endpoint: string, err: unknown) => {
    if (!mountedRef.current) return; // unmounting — not a user-visible error
    const msg = err instanceof Error ? err.message : String(err);
    showError(`Background fetch failed (${endpoint}): ${msg}`);
  }, [showError]);

  const fetchPersuasionLog = useCallback(async (agentIds: string[]) => {
    try {
      const entries = await Promise.all(
        agentIds.map(id =>
          fetch(`/api/persuasion/${id}`)
            .then(r => r.ok ? r.json() as Promise<PersuasionRecord[]> : [])
        )
      );
      if (!mountedRef.current) return;
      const map: Record<string, PersuasionRecord[]> = {};
      agentIds.forEach((id, i) => { map[id] = entries[i] ?? []; });
      setPersuasionLog(map);
    } catch (err) { notifyFetchFailure('/api/persuasion', err); }
  }, [notifyFetchFailure]);

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
    } catch (err) { notifyFetchFailure('/api/state', err); }
  };

  const fetchLedger = async () => {
    try {
      const res = await fetch("/api/ledger");
      if (!res.ok || !mountedRef.current) return;
      const data = await res.json() as ActionLogEntry[];
      setLedger(data);
    } catch (err) { notifyFetchFailure('/api/ledger', err); }
  };

  const fetchIllusionState = async () => {
    try {
      const res = await fetch("/api/simulation/illusion-state");
      if (!res.ok || !mountedRef.current) return;
      const data = await res.json() as IllusionState;
      setIllusionState(data);
    } catch (err) { notifyFetchFailure('/api/simulation/illusion-state', err); }
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
    } catch (err) { notifyFetchFailure('/api/beat-traces+edges+mutations', err); }
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
      // Clear stale client state immediately so the UI doesn't show prior session data
      // while the server is resetting.
      setPersuasionLog({});
      setActivePressures([]);
      setStreamLog([]);
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
      const res = await fetch("/api/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      // Finding A: this previously never checked res.ok, so a failed turn
      // (most commonly: no AI key configured) surfaced as silent nothing —
      // the UI just sat there with no feedback at all.
      if (!res.ok) {
        throw new Error(
          "Turn failed — if you haven't configured an AI key, generation is unavailable. Analysis features still work."
        );
      }
      await refreshAll();
    } catch (e) {
      showError((e as Error).message ?? 'Turn failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunRoom = async (nodeId: string) => {
    if (loading) return;  // prevent double-click from spawning concurrent SSE streams
    evtSourceRef.current?.close();
    setLoading(true);
    setStreamLog([]);
    try {
      const url = withSession(`/api/run-room-stream?nodeId=${encodeURIComponent(nodeId)}`);
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

  // P6: export a single character's full memory bundle (beliefs, relationships,
  // goal/arc history) as portable JSON for reuse across stories.
  const handleExportCharacter = useCallback(async (charId: string, name: string) => {
    try {
      const res = await fetch('/api/characters/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ charId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `Export failed: ${res.status}` }));
        throw new Error(body.error ?? `Export failed: ${res.status}`);
      }
      const bundle = await res.json();
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `character-${name.replace(/[^A-Za-z0-9_-]/g, '_') || charId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      showError((e as Error).message ?? 'Character export failed.');
    }
  }, [showError]);

  // P6: import a previously-exported character memory bundle into this story.
  const handleImportCharacter = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const bundle = JSON.parse(text);
      const res = await fetch('/api/characters/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundle }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `Import failed: ${res.status}` }));
        throw new Error(body.error ?? `Import failed: ${res.status}`);
      }
      await refreshAll();
    } catch (e) {
      showError((e as Error).message ?? 'Character import failed (invalid bundle?).');
    }
  }, [refreshAll, showError]);

  const illusionColor =
    illusionState?.phase === "Prestige" ? "var(--sm-stamp)"
      : illusionState?.phase === "Turn" ? "var(--sm-warn)"
      : "var(--sm-ok)";

  return (
    <div className="min-h-dvh bg-[var(--sm-paper)] p-6 font-sans text-[var(--sm-ink)] sm:p-8">
      {errorMsg && (
        <div
          role="alert"
          className="fixed left-1/2 top-4 z-50 flex -translate-x-1/2 items-center gap-3 border-[1.5px] border-[var(--sm-ink)] bg-[var(--sm-stamp)] px-5 py-3 font-[family-name:var(--sm-font-mono)] text-sm text-white shadow-[var(--sm-shadow)]"
        >
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} aria-label="Dismiss error" className="ml-2 font-bold leading-none hover:opacity-70">✕</button>
        </div>
      )}
      {/* Finding E: keyless-honesty banner — non-nagging (dismissible,
          remembered per-app) and only rendered once readiness is known. */}
      {llmReady === false && !llmBannerDismissed && (
        <div className="mb-6 flex items-center justify-between gap-4 border-[1.5px] border-[var(--sm-warn)] bg-[var(--sm-panel-2)] px-4 py-3 font-[family-name:var(--sm-font-mono)] text-xs text-[var(--sm-ink-soft)]">
          <span>
            Analysis &amp; exports work now. Generation (copilot, simulation turns, rewriting) needs an AI key — Settings explains.
          </span>
          <button onClick={dismissLlmBanner} className="sm-btn shrink-0 py-1">
            Dismiss
          </button>
        </div>
      )}
      <header className="sm-pagetop mb-8 flex-wrap gap-y-3">
        <div className="flex w-full flex-wrap items-start justify-between gap-4">
          <div>
            <p className="sm-h text-[var(--sm-cream)]/50">Simulate</p>
            <h1 className="font-[family-name:var(--sm-font-display)] text-3xl uppercase tracking-widest text-[var(--sm-cream)]">
              Story Machine
            </h1>
            <p className="mt-1 font-[family-name:var(--sm-font-mono)] text-xs uppercase tracking-wider text-[var(--sm-cream)]/60">
              Build · run · export
            </p>
          </div>
          {illusionState && (
            <div
              className="border-[1.5px] px-3 py-2 font-[family-name:var(--sm-font-mono)] text-[10px] font-bold uppercase tracking-widest"
              style={{ borderColor: illusionColor, color: illusionColor }}
            >
              Phase: {illusionState.phase} · {illusionState.total_turns} turns
            </div>
          )}
        </div>

        {/* Primary actions only — setup CTA lives in the Stage card until initialized. */}
        <div className="flex w-full flex-wrap items-center gap-2">
          {nodes.length > 0 && (
            <button
              onClick={() => openOverlay('Builder')}
              disabled={loading}
              className="sm-btn border-[var(--sm-cream)]/30 bg-transparent text-[var(--sm-cream)] hover:bg-[var(--sm-cream)] hover:text-[var(--sm-ink)] disabled:opacity-50"
            >
              Edit scenario
            </button>
          )}

          {ledger.length > 0 && (
            <>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="sm-btn sm-btn--stamp flex items-center gap-2 disabled:opacity-50"
              >
                <FileDown className="w-4 h-4" />
                {isExporting ? "Exporting…" : "Export to script"}
              </button>
              <button
                onClick={() => setSyuzhetMode(m => !m)}
                title="Reorder export by information-reveal priority"
                className={`sm-btn ${
                  syuzhetMode
                    ? "bg-[var(--sm-cream)] text-[var(--sm-ink)]"
                    : "border-[var(--sm-cream)]/30 bg-transparent text-[var(--sm-cream)] hover:bg-[var(--sm-cream)] hover:text-[var(--sm-ink)]"
                }`}
              >
                Syuzhet {syuzhetMode ? "on" : "off"}
              </button>
            </>
          )}

          <div className="relative" ref={inspectRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={inspectOpen}
              onClick={() => setInspectOpen((v) => !v)}
              className="sm-btn flex items-center gap-1 border-[var(--sm-cream)]/30 bg-transparent text-[var(--sm-cream)] hover:bg-[var(--sm-cream)] hover:text-[var(--sm-ink)]"
            >
              Inspect
              <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            {inspectOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full z-50 mt-1 max-h-[70vh] w-64 overflow-y-auto border-[1.5px] border-[var(--sm-ink)] bg-[var(--sm-panel)] py-1 text-[var(--sm-ink)] shadow-[var(--sm-shadow-sm)]"
              >
                {(
                  [
                    {
                      label: "Decide",
                      items: [
                        { key: "StoryHealth" as const, label: "Story health", icon: HeartPulse },
                        { key: "ProofInspector" as const, label: "Proofs", icon: ShieldCheck },
                        { key: "QualityEngines" as const, label: "Quality", icon: CheckCircle2 },
                        { key: "Regression" as const, label: "Regression", icon: RefreshCw },
                      ],
                    },
                    {
                      label: "Understand",
                      items: [
                        { key: "Epistemic" as const, label: "Beliefs", icon: Brain },
                        { key: "EpistemicMap" as const, label: "Epistemic map", icon: MapIcon },
                        { key: "CharacterArc" as const, label: "Character arcs", icon: Users },
                        { key: "Timeline" as const, label: "Arc timeline", icon: Target },
                        { key: "ArcCompletion" as const, label: "Open arcs", icon: ListChecks },
                        { key: "Momentum" as const, label: "Momentum", icon: LineChart },
                      ],
                    },
                    {
                      label: "Explore",
                      items: [
                        { key: "WhatIf" as const, label: "What-if", icon: GitBranch },
                        { key: "CausalTwin" as const, label: "Causal twin", icon: Zap },
                        { key: "Converge" as const, label: "Converge", icon: Shuffle },
                        { key: "Projection" as const, label: "Projection", icon: Target },
                        { key: "FixedPoints" as const, label: "Destiny", icon: Target },
                      ],
                    },
                    {
                      label: "Revise",
                      items: [
                        { key: "DirectorCut" as const, label: "Director cut", icon: Scissors },
                        { key: "Revision" as const, label: "Revision passes", icon: FileEdit },
                        { key: "LivePlay" as const, label: "Live author", icon: PenLine },
                        { key: "ArcPlanner" as const, label: "Arc compile", icon: Zap },
                        { key: "Interview" as const, label: "Interview", icon: MessageCircle },
                        { key: "Room" as const, label: "Writers' room", icon: Users },
                      ],
                    },
                    {
                      label: "Lab",
                      items: [
                        { key: "Analytics" as const, label: "Analytics", icon: LineChart },
                        { key: "VoiceDNA" as const, label: "Voice DNA", icon: Dna },
                        { key: "Harvest" as const, label: "Harvest", icon: FileDown },
                        { key: "Corpus" as const, label: "Policy corpus", icon: Shuffle },
                        { key: "SelfPlay" as const, label: "Self-play", icon: Zap },
                      ],
                    },
                  ] as const
                ).map((group) => (
                  <div key={group.label} role="none" className="border-b border-[var(--sm-hair)] last:border-b-0">
                    <p className="sm-h px-3 pb-1 pt-2">{group.label}</p>
                    {group.items.map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        role="menuitem"
                        className="flex w-full items-center gap-2 px-3 py-2 text-left font-[family-name:var(--sm-font-mono)] text-[11px] uppercase tracking-wider hover:bg-[var(--sm-ink)] hover:text-[var(--sm-cream)]"
                        onClick={() => {
                          openOverlay(item.key);
                          setInspectOpen(false);
                        }}
                      >
                        <item.icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        {item.label}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => openOverlay('Settings')}
            title="AI Provider Settings"
            aria-label="Settings"
            className="sm-btn border-[var(--sm-cream)]/30 bg-transparent p-2 text-[var(--sm-cream)] hover:bg-[var(--sm-cream)] hover:text-[var(--sm-ink)]"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="sm-btn ml-auto border-[var(--sm-cream)]/30 bg-transparent text-[var(--sm-cream)] hover:bg-[var(--sm-cream)] hover:text-[var(--sm-ink)]"
          >
            Back to script
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left: Agents & Nodes */}
        <div className="space-y-8">
          <section>
            <h2 className="mb-4 border-b-[1.5px] border-[var(--sm-ink)] pb-2 font-[family-name:var(--sm-font-display)] text-xl uppercase text-[var(--sm-ink)]">
              The Stage
            </h2>
            {nodes.length === 0 && (
              <div className="sm-panel">
                <div className="sm-panel-body">
                  <p className="sm-h">Setup</p>
                  <h3 className="font-[family-name:var(--sm-font-display)] text-lg uppercase tracking-wider text-[var(--sm-ink)]">
                    No scenario yet
                  </h3>
                  <p className="sm-sub">Build a scenario, then run dialogue on a location.</p>
                  <button
                    type="button"
                    onClick={() => openOverlay("Builder")}
                    disabled={loading}
                    className="sm-btn sm-btn--stamp mt-1 disabled:opacity-50"
                  >
                    Build scenario
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-4">
              {nodes.map((node) => {
                const here = agents.filter(a => a.current_location_id === node.location_id);
                return (
                  <div key={node.location_id} className="sm-panel">
                    <div className="sm-panel-body">
                      <h3 className="font-[family-name:var(--sm-font-display)] text-lg uppercase tracking-wider text-[var(--sm-ink)]">{node.name}</h3>
                      <p className="font-[family-name:var(--sm-font-mono)] text-sm text-[var(--sm-ink-soft)]">{node.description}</p>
                      <div className="sm-slug">
                        {here.length > 0 ? `Present: ${here.map(a => a.name).join(", ")}` : "Empty"}
                      </div>
                      <div className="border-t border-dashed border-[var(--sm-hair)] pt-1 font-[family-name:var(--sm-font-mono)] text-xs uppercase text-[var(--sm-ink-faint)]">
                        Connected: {node.adjacent_locations.join(", ")}
                      </div>
                      <button
                        onClick={() => handleRunRoom(node.location_id)}
                        disabled={loading}
                        className="sm-btn sm-btn--ink w-full disabled:opacity-50"
                      >
                        {loading ? "Running…" : "Run Dialogue Lock (5 Turns)"}
                      </button>
                      {loading && streamLog.length > 0 && (
                        <div className="max-h-24 overflow-y-auto border-[1.5px] border-[var(--sm-ink)] bg-[var(--sm-night)] p-2 font-[family-name:var(--sm-font-mono)] text-xs text-[var(--sm-ok)]">
                          {streamLog.map((line, i) => <div key={i}>{line}</div>)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-center justify-between border-b-[1.5px] border-[var(--sm-ink)] pb-2">
              <h2 className="font-[family-name:var(--sm-font-display)] text-xl uppercase text-[var(--sm-ink)]">
                Agents
              </h2>
              <label
                title="Import a character memory bundle (JSON) exported from another story"
                className="sm-btn cursor-pointer py-1"
              >
                <Upload className="mr-1 inline h-3 w-3" aria-hidden="true" /> Import Memory
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImportCharacter(f);
                    e.target.value = '';
                  }}
                />
              </label>
            </div>
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
                  <div key={agent.char_id} className="sm-panel p-4">
                    <div className="mb-3 flex items-start justify-between gap-3 border-b border-[var(--sm-hair)] pb-3">
                      <h3 className="font-[family-name:var(--sm-font-display)] text-lg uppercase tracking-wider text-[var(--sm-ink)]">
                        {agent.name}
                      </h3>
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {agentEdges.length > 0 && (
                          <span className="sm-chip sm-chip--stamp">
                            {agentEdges.length} contradiction{agentEdges.length !== 1 ? 's' : ''}
                          </span>
                        )}
                        <span className="sm-chip bg-[var(--sm-ink)] text-[var(--sm-cream)]">
                          {nodes.find(n => n.location_id === agent.current_location_id)?.name || agent.current_location_id}
                        </span>
                        <button
                          onClick={() => handleExportCharacter(agent.char_id, agent.name)}
                          title="Export character memory bundle"
                          aria-label={`Export ${agent.name} memory`}
                          className="sm-btn min-h-9 min-w-9 p-2"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setExpandedAgent(isExpanded ? null : agent.char_id)}
                          title="Toggle belief graph"
                          aria-label={`${isExpanded ? 'Hide' : 'Show'} ${agent.name} belief graph`}
                          className="sm-btn min-h-9 min-w-9 p-2"
                        >
                          <Brain className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs font-mono">
                      <p><span className="font-bold uppercase">Mask:</span> {agent.public_mask}</p>
                      <p><span className="font-bold uppercase">Shadow:</span> {agent.hidden_motive}</p>

                      <div>
                        <div className="mb-1 flex justify-between">
                          <span className="sm-h">Suspicion</span>
                          <span className={agent.suspicion_score > 60 ? "font-bold text-[var(--sm-stamp)]" : "text-[var(--sm-ink-mute)]"}>
                            {agent.suspicion_score}/100
                          </span>
                        </div>
                        <div className="sm-gauge h-2.5">
                          <i
                            style={{
                              width: `${agent.suspicion_score}%`,
                              background: agent.suspicion_score > 60
                                ? "var(--sm-stamp)"
                                : agent.suspicion_score > 30
                                  ? "var(--sm-warn)"
                                  : "var(--sm-ok)",
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
                            {agent.emotionState?.anger_target_id && (
                              <span className="text-[9px] font-bold uppercase text-[var(--sm-stamp)]">
                                → {agents.find(a => a.char_id === agent.emotionState?.anger_target_id)?.name ?? '?'}
                              </span>
                            )}
                            {/* mini emotion bars */}
                            <div className="flex gap-0.5 items-end h-3">
                              {(['joy','distress','anger','fear','pride','shame'] as const).map(k => (
                                <div
                                  key={k}
                                  title={`${k}: ${agent.emotionState![k]}`}
                                  className={`w-1.5 transition-all ${EMOTION_COLOR[k].split(' ')[0]}`}
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
                            <span className="sm-chip sm-chip--stamp">Psychopathic</span>
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
                                  <span className={`leading-tight text-[var(--sm-ink-soft)] ${(b.contradicts?.length ?? 0) > 0 ? 'text-[var(--sm-stamp)]' : ''}`}>
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
                              <GitBranch className="h-3 w-3 text-[var(--sm-stamp)]" />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--sm-stamp)]">
                                Contradiction Edges
                              </span>
                            </div>
                            <div className="space-y-1.5">
                              {agentEdges.slice(0, 4).map((edge) => (
                                <div key={edge.edge_id} className="text-[10px] font-mono bg-red-50 p-2 border border-red-200">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="font-bold uppercase text-[var(--sm-stamp)]">{edge.edge_type}</span>
                                    {edge.severity != null && (
                                      <span className="text-[8px] text-gray-500">sev {edge.severity}</span>
                                    )}
                                  </div>
                                  <div className="text-gray-500 text-[9px]">turn {edge.turn_index}</div>
                                  {edge.severity != null && (
                                    <div className="mt-1 w-full bg-gray-200 h-1 border border-gray-300">
                                      <div
                                        className="h-full bg-[var(--sm-stamp)]"
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
                      className="sm-btn mt-4 w-full disabled:opacity-50"
                    >
                      Force turn
                    </button>
                  </div>
                );
              })}
              {agents.length === 0 && (
                <div className="sm-ph py-8">Agents appear after setup</div>
              )}
            </div>
          </section>
        </div>

        {/* Right: Script Ledger — primary simulation artifact */}
        <div className="lg:col-span-2">
          <section className="flex h-full flex-col">
            <div className="mb-4 flex items-end justify-between gap-3 border-b-[1.5px] border-[var(--sm-ink)] pb-2">
              <div>
                <p className="sm-h">Current run</p>
                <h2 className="font-[family-name:var(--sm-font-display)] text-xl uppercase text-[var(--sm-ink)]">
                  Script Ledger
                </h2>
              </div>
              {ledger.length > 0 && (
                <span className="sm-chip">{ledger.length} actions</span>
              )}
            </div>
            <div className="sm-panel min-h-[600px] flex-1 space-y-5 overflow-y-auto p-5 font-[family-name:var(--sm-font-mono)] text-sm sm:p-6">
              {ledger.map((entry) => {
                const agent = agents.find(a => a.char_id === entry.char_id);
                const node = nodes.find(n => n.location_id === entry.location_id);
                const isLie = entry.action_type === "LIE";
                const isThreatOrBetray = entry.action_type === "THREATEN" || entry.action_type === "BETRAY";
                const isCovert = COVERT_ACTION_TYPES.has(entry.action_type);
                const rowClass = isLie || isThreatOrBetray
                  ? "border-[var(--sm-stamp)] bg-[color-mix(in_srgb,var(--sm-stamp)_5%,var(--sm-panel))]"
                  : isCovert
                    ? "border-dashed border-[var(--sm-ink-faint)] bg-[var(--sm-panel-2)]"
                    : "border-[var(--sm-ink)] bg-[var(--sm-panel)]";
                return (
                  <article key={entry.action_id} className={`border-l-[3px] py-2 pl-4 ${rowClass}`}>
                    <p className="sm-slug mb-2">
                      {new Date(entry.timestamp).toLocaleTimeString()} · {node?.name || entry.location_id}
                    </p>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <strong className="uppercase text-[var(--sm-ink)]">{agent?.name || entry.char_id}</strong>
                      <span className={`sm-chip ${isLie || isThreatOrBetray ? "sm-chip--stamp" : isCovert ? "" : "bg-[var(--sm-ink)] text-[var(--sm-cream)]"}`}>
                        {entry.action_type}
                      </span>
                      {(isLie || isThreatOrBetray) && (
                        <span className="sm-chip sm-chip--stamp">
                          <AlertTriangle className="h-3 w-3" />
                          {isLie ? "Lie" : entry.action_type === "THREATEN" ? "Threat" : "Betrayal"}
                        </span>
                      )}
                      {isCovert && (
                        <span className="sm-chip">
                          <Eye className="h-3 w-3" /> Covert
                        </span>
                      )}
                      {entry.target_char_id && TARGETED_ACTION_TYPES.has(entry.action_type) && (
                        <span className="font-bold uppercase text-[var(--sm-stamp)]">
                          to {agents.find(a => a.char_id === entry.target_char_id)?.name || entry.target_char_id}
                        </span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed text-[var(--sm-ink-soft)]">{entry.content}</p>
                  </article>
                );
              })}
              {ledger.length === 0 && (
                <div className="flex min-h-[420px] items-center justify-center">
                  <div className="max-w-xs text-center">
                    <p className="font-[family-name:var(--sm-font-hand)] text-2xl text-[var(--sm-ink-faint)]">The stage is silent…</p>
                    <p className="sm-sub mt-2">Build a scenario, then run dialogue from a location.</p>
                  </div>
                </div>
              )}
              <div ref={ledgerEndRef} />
            </div>

            {ledger.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setSyuzhetMode(m => !m)}
                  title="Reorder the export by information reveal"
                  className={`sm-btn ${syuzhetMode ? "sm-btn--ink" : ""}`}
                >
                  Syuzhet {syuzhetMode ? "on" : "off"}
                </button>
                <span className="sm-slug flex-1">
                  {syuzhetMode ? "Revelation-first ordering" : "Chronological order"}
                </span>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="sm-btn sm-btn--stamp flex items-center gap-2 disabled:opacity-50"
                >
                  <FileDown className="h-4 w-4" />
                  {isExporting ? "Converting…" : "Export to script"}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Causal Spine — supporting depth after a run */}
      {beatTraces.length > 0 && (
        <section className="mt-10">
          <div className="mb-4 flex flex-wrap items-end gap-3 border-b-[1.5px] border-[var(--sm-ink)] pb-3">
            <Zap className="h-5 w-5 text-[var(--sm-stamp)]" aria-hidden="true" />
            <div>
              <p className="sm-h">Supporting evidence</p>
              <h2 className="font-[family-name:var(--sm-font-display)] text-xl uppercase tracking-widest text-[var(--sm-ink)]">
                Causal Spine
              </h2>
            </div>
            <span className="sm-chip ml-auto">
              {beatTraces.length} beat{beatTraces.length !== 1 ? 's' : ''} ·{' '}
              {beliefEdges.length} contradiction{beliefEdges.length !== 1 ? 's' : ''} ·{' '}
              {goalMutations.length} mutation{goalMutations.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="relative">
            <div className="absolute bottom-0 left-[11px] top-0 w-px bg-[var(--sm-ink)]" />

            <div className="space-y-4 pl-8">
              {beatTraces.map((beat) => {
                const colorClass = BEAT_COLORS[beat.beat_type] ?? 'bg-gray-600';
                const infoPos = beat.information_position;
                const participants = beat.participants
                  .map(id => agents.find(a => a.char_id === id)?.name ?? id)
                  .join(', ');

                return (
                  <div key={beat.beat_id} className="relative">
                    <div className={`absolute -left-[25px] top-3 h-3 w-3 rounded-full border-2 border-[var(--sm-ink)] ${colorClass}`} />

                    <div className="sm-card border-[var(--sm-ink)] bg-[var(--sm-panel)] p-4">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <span className={`sm-chip border-transparent text-white ${colorClass}`}>
                          {beat.beat_type.replace(/_/g, ' ')}
                        </span>
                        {infoPos && (
                          <span className="sm-chip">{INFO_POS_LABEL[infoPos] ?? infoPos}</span>
                        )}
                        <span className="sm-slug">t{beat.turn_index}</span>
                        {participants && <span className="sm-slug">{participants}</span>}
                      </div>

                      <p className="font-[family-name:var(--sm-font-mono)] text-sm leading-snug text-[var(--sm-ink)]">
                        {beat.narrative_summary}
                      </p>

                      {beat.fountain_hint && (
                        <p className="mt-2 border-l-2 border-[var(--sm-hair)] pl-2 font-[family-name:var(--sm-font-mono)] text-[11px] italic text-[var(--sm-ink-mute)]">
                          {beat.fountain_hint}
                        </p>
                      )}

                      {beat.causal_chain.length > 1 && (
                        <div className="sm-slug mt-2 flex flex-wrap items-center gap-1">
                          <GitBranch className="h-2.5 w-2.5" />
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
        <Suspense fallback={<PanelLoadingOverlay />}>
          <ScenarioBuilder
            onSubmit={submitScenario}
            onLoadExample={loadExample}
            onClose={() => setShowBuilder(false)}
            busy={loading}
          />
        </Suspense>
      )}

      {showSettings && (
        <Suspense fallback={<PanelLoadingOverlay />}>
          <SettingsPanel onClose={() => setShowSettings(false)} />
        </Suspense>
      )}

      {showDirectorCut && (
        <Suspense fallback={<PanelLoadingOverlay />}>
          <DirectorCutPanel onClose={() => setShowDirectorCut(false)} />
        </Suspense>
      )}

      {showWhatIf && (
        <Suspense fallback={<PanelLoadingOverlay />}>
          <WhatIfPanel onClose={() => setShowWhatIf(false)} />
        </Suspense>
      )}

      {showEpistemic && (
        <Suspense fallback={<PanelLoadingOverlay />}>
          <EpistemicMap onClose={() => setShowEpistemic(false)} />
        </Suspense>
      )}

      {showHarvest && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 60 }}>
          <HarvestPanel onClose={() => setShowHarvest(false)} />
        </div>
      )}

      {showConverge && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <Suspense fallback={<PanelLoadingInline />}>
            <ConvergePanel onClose={() => setShowConverge(false)} />
          </Suspense>
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
          <Suspense fallback={<PanelLoadingInline />}>
            <ArcPlannerPanel onClose={() => setShowArcPlanner(false)} />
          </Suspense>
        </div>
      )}

      {showProjection && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <Suspense fallback={<PanelLoadingInline />}>
            <ProjectionGalleryPanel onClose={() => setShowProjection(false)} />
          </Suspense>
        </div>
      )}

      {showCausalTwin && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <Suspense fallback={<PanelLoadingInline />}>
            <CausalTwinPanel onClose={() => setShowCausalTwin(false)} />
          </Suspense>
        </div>
      )}

      {showFixedPoints && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <Suspense fallback={<PanelLoadingInline />}>
            <FixedPointsPanel onClose={() => setShowFixedPoints(false)} />
          </Suspense>
        </div>
      )}

      {showSelfPlay && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <Suspense fallback={<PanelLoadingInline />}>
            <SelfPlayPanel onClose={() => setShowSelfPlay(false)} />
          </Suspense>
        </div>
      )}

      {showProofInspector && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <Suspense fallback={<PanelLoadingInline />}>
            <ProofInspectorPanel onClose={() => setShowProofInspector(false)} />
          </Suspense>
        </div>
      )}

      {showQualityEngines && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <Suspense fallback={<PanelLoadingInline />}>
            <QualityEnginesPanel onClose={() => setShowQualityEngines(false)} />
          </Suspense>
        </div>
      )}

      {showEpistemicMap && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <Suspense fallback={<PanelLoadingInline />}>
            <EpistemicMapPanel onClose={() => setShowEpistemicMap(false)} />
          </Suspense>
        </div>
      )}

      {showArcCompletion && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <Suspense fallback={<PanelLoadingInline />}>
            <ArcCompletionPanel onClose={() => setShowArcCompletion(false)} />
          </Suspense>
        </div>
      )}

      {showStoryHealth && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <Suspense fallback={<PanelLoadingInline />}>
            <StoryHealthPanel onClose={() => setShowStoryHealth(false)} />
          </Suspense>
        </div>
      )}

      {showCharacterArc && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <Suspense fallback={<PanelLoadingInline />}>
            <CharacterArcPanel onClose={() => setShowCharacterArc(false)} />
          </Suspense>
        </div>
      )}

      {showRegression && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <Suspense fallback={<PanelLoadingInline />}>
            <RegressionPanel onClose={() => setShowRegression(false)} />
          </Suspense>
        </div>
      )}

      {showAnalytics && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <Suspense fallback={<PanelLoadingInline />}>
            <NarrativeAnalyticsPanel onClose={() => setShowAnalytics(false)} />
          </Suspense>
        </div>
      )}

      {showMomentum && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <Suspense fallback={<PanelLoadingInline />}>
            <MomentumPanel onClose={() => setShowMomentum(false)} />
          </Suspense>
        </div>
      )}

      {showVoiceDNA && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <Suspense fallback={<PanelLoadingInline />}>
            <VoiceDNAPanel onClose={() => setShowVoiceDNA(false)} />
          </Suspense>
        </div>
      )}

      {showLivePlay && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <Suspense fallback={<PanelLoadingInline />}>
            <LivePlayPanel onClose={() => setShowLivePlay(false)} />
          </Suspense>
        </div>
      )}

      {showRevision && (
        <Suspense fallback={<PanelLoadingOverlay />}>
          <RevisionPanel onClose={() => setShowRevision(false)} />
        </Suspense>
      )}

      {showInterview && (
        <Suspense fallback={<PanelLoadingOverlay />}>
          <InterviewPanel onClose={() => setShowInterview(false)} agents={agents} />
        </Suspense>
      )}

      {showRoom && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 70 }}>
          <Suspense fallback={<PanelLoadingInline />}>
            <RoomPanel onClose={() => setShowRoom(false)} />
          </Suspense>
        </div>
      )}
    </div>
  );
}
