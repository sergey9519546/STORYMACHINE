import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from "react";
import { EngineState, StoryConfig, DirectorState } from "../types";
import { analyzeScriptBlock } from "../services/director";
import { parseFountain, FountainBlock } from "../lib/fountain";
import { layoutScreenplay } from "../lib/screenplay-layout";
import { buildScenarioFromScript } from "../lib/scenario-from-script";
// fdx/pdf/docx exporters are dynamic-imported at their call sites below
// (exportFDX/exportPDF/exportDOCX) — each is a one-shot user action (a
// toolbar button click), never needed for first paint or typing latency.
import { safeJsonParse } from "../lib/json";
import {
  resolveDraftConflict,
  saveStatusLabel as formatSaveStatus,
  type SaveStatus,
} from "../lib/draft-persistence";
import {
  acknowledgeScriptIDESave,
  shouldStartScriptIDESave,
} from "../lib/scriptide-autosave";
import {
  applyServerScriptIDEDraft,
  decideScriptIDERestore,
  loadScriptIDEDraft,
  readScriptIDEDraft,
  scriptIDEDraftStatesEqual,
  updateScriptIDEDraft,
  writeScriptIDEDraft,
  type ScriptIDEDraftEnvelope,
  type ScriptIDEDraftState,
  type ScriptIDEServerSnapshot,
} from "../lib/scriptide-draft-store";
import {
  Loader2,
  BookOpen,
  Film,
  Mic,
  Activity,
  Sparkles,
  Camera,
  Layers,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Sidebar from "./Sidebar";

// Sub-components
import FountainEditor, { FountainEditorHandle } from "./editor/FountainEditor";
import SnapshotManager from "./scriptide/SnapshotManager";
import ResearchNotes from "./scriptide/ResearchNotes";
import Toolbar, { type IdeTask, type IdeToolSlot } from "./scriptide/Toolbar";
import { ScriptCharacter } from "./scriptide/CharacterManager";

// Lazy-loaded — each is a conditionally-rendered tab/overlay, never needed on
// first paint. AIPanel/AnalysisPanel render only behind their respective
// activeTab; DirectorPanel/ScriptDoctorPanel render only behind their showX
// booleans inside AnimatePresence (React.lazy + Suspense compose fine there —
// AnimatePresence tracks exit via React context down through the tree, not by
// requiring a motion component as its *direct* child, so nesting a Suspense
// boundary in between doesn't break enter/exit animations; the fallback below
// mimics each drawer's own shell so there's no layout jump on first open).
const AIPanel = lazy(() => import("./AIPanel"));
const DirectorPanel = lazy(() => import("./DirectorPanel"));
const AnalysisPanel = lazy(() => import("./scriptide/AnalysisPanel"));
const ScriptDoctorPanel = lazy(() => import("./scriptide/ScriptDoctorPanel"));
const CoverageSummary = lazy(() => import("./scriptide/CoverageSummary"));
const SlatePanel = lazy(() => import("./SlatePanel"));

// Matches the DirectorPanel/ScriptDoctorPanel shell (fixed right-side drawer,
// same brutal-border/white-bg idiom) so first-open doesn't flash blank space
// before sliding in.
const DrawerPanelFallback = () => (
  <div className="fixed top-0 right-0 w-[500px] max-w-[94vw] h-dvh bg-white brutal-border-thick text-black p-8 flex items-center justify-center font-mono text-sm z-50 brutal-shadow">
    <span className="uppercase tracking-widest text-xs animate-pulse">Loading…</span>
  </div>
);

// SlatePanel is wider than the other drawers (it hosts a comparison table),
// so its fallback matches SlatePanel's own w-[880px] shell rather than
// DrawerPanelFallback's 500px — a mismatched fallback width would flash a
// narrower box for a moment before the real panel snaps wider.
const SlatePanelFallback = () => (
  <div className="fixed top-0 right-0 w-[880px] max-w-[96vw] h-dvh bg-white brutal-border-thick text-black p-8 flex items-center justify-center font-mono text-sm z-50 brutal-shadow">
    <span className="uppercase tracking-widest text-xs animate-pulse">Loading…</span>
  </div>
);

// Matches the plain in-sidebar tab content idiom used elsewhere in this file
// (e.g. the Codex tab's "No Knowledge Ingested Yet" placeholder).
const TabPanelFallback = () => (
  <div className="p-8 text-center border-4 border-dashed border-gray-400 text-gray-400 font-mono text-xs uppercase animate-pulse">
    Loading…
  </div>
);

// ─── Types ───────────────────────────────────────────────────────────────────

type ScriptIDEServerDraft = ScriptIDEServerSnapshot;

interface ScriptIDEProps {
  initialConfig: StoryConfig;
  onOpenStoryMachine?: () => void;
  /** Fountain text exported from Story Machine — applied once then cleared */
  importedScript?: string;
  importedCharacters?: Array<{
    name: string;
    ghost: string;
    lie: string;
    want: string;
    need: string;
  }>;
  onImportConsumed?: () => void;
  /** Sends the user back to the setup wizard, clearing the persisted config (App.tsx). */
  onNewStory?: () => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SCRIPT_ELEMENTS = {
  HEADING: /^((INT|EXT|INT\/EXT)\.?\s+.*)/i,
  CHARACTER: /^([A-Z][A-Z\s0-9]+)$/,
  PARENTHETICAL: /^(\(.*\))$/,
  TRANSITION: /^(CUT TO:|FADE IN:|FADE OUT:|DISSOLVE TO:)$/i,
};

/** Stable decorative bar heights — avoids Math.random() in render path */
const TENSION_BARS = [
  42, 67, 31, 88, 55, 23, 76, 44, 91, 38, 62, 17, 84, 50, 29, 73, 46, 95, 33,
  60,
];

// ─── Syntax highlighting ─────────────────────────────────────────────────────

// renderHighlightedText removed — CM6 FountainEditor handles syntax highlighting via
// decorations (fountain-highlight.ts). The old textarea + overlay pattern is gone.

// ─── localStorage helpers ────────────────────────────────────────────────────

const lsGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  }
};

/** Returns true when the write succeeded. */
const lsSet = (key: string, val: string): boolean => {
  try {
    localStorage.setItem(key, val);
    return true;
  } catch {
    // localStorage quota exceeded / private mode — caller surfaces save-failed
    return false;
  }
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ScriptIDE({
  initialConfig,
  onOpenStoryMachine,
  importedScript,
  importedCharacters,
  onImportConsumed,
  onNewStory,
}: ScriptIDEProps) {
  const initialDraftRef = useRef<ScriptIDEDraftEnvelope | null>(null);
  const hadVersionedDraftRef = useRef(false);
  if (!initialDraftRef.current) {
    const stored = readScriptIDEDraft(lsGet);
    hadVersionedDraftRef.current = stored !== null;
    initialDraftRef.current = stored ?? loadScriptIDEDraft(lsGet);
  }
  const initialDraft = initialDraftRef.current;

  // ── Core state ──────────────────────────────────────────────────────────────
  const [engineState, setEngineState] = useState<EngineState | null>(null);
  const [scriptText, setScriptText] = useState<string>(initialDraft.scriptText);
  const [activeTab, setActiveTab] = useState<
    | "production"
    | "analysis"
    | "codex"
    | "storyEngine"
    | "research"
    | "titlePage"
    | "versions"
  >("production");
  // Task-first shell: one task mode + one exclusive right tool slot.
  // Keep structure stable; only emphasis/occupancy changes.
  const [task, setTask] = useState<IdeTask>("write");
  const [toolSlot, setToolSlot] = useState<IdeToolSlot>("none");
  // Mobile sidebar drawer: the Sidebar is a permanent 320px column on md+ but
  // slides in as an overlay on < md (see Sidebar.tsx). This toggles that drawer.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // In-app confirm for "New Story" — replaces window.confirm (QA P1-5: native
  // confirms block the thread, are unstyleable, and can't be dismissed by Esc).
  const [newStoryConfirm, setNewStoryConfirm] = useState(false);
  // StartScreen's "Try the sample script" handoff (sessionStorage flag, same
  // idiom as sm_fdx_import_pending below): when set, the doctor overlay opens
  // on mount and auto-runs the built-in sample through its own loadSample
  // flow, preserving "sample" provenance end to end.
  const [doctorAutoSample, setDoctorAutoSample] = useState(false);
  // Coverage freshness: after user edits, diagnosis is considered stale until
  // they re-open Coverage / re-run doctor (quiet intelligence, not a nag stack).
  const [coverageStale, setCoverageStale] = useState(false);
  /** Progressive depth: summary first; full Script Doctor is opt-in. */
  const [coverageFull, setCoverageFull] = useState(false);
  /** Current cursor line (1-based) for sidebar scene highlighting. */
  const [currentLine, setCurrentLine] = useState(1);
  const currentLineRef = useRef(1);
  const [prefsOpen, setPrefsOpen] = useState<"none" | "copilot" | "collab">("none");
  const [directorsLayer, setDirectorsLayer] = useState(false);
  // Live Notes ("ESLint for screenplays") — off by default: a writer drafting
  // a first pass doesn't want squiggles until they ask for them.
  const [liveDiagnostics, setLiveDiagnostics] = useState(
    () => lsGet("live_diagnostics") === "1"
  );
  // Theme preference: atomic local draft + server ScriptIDE_State.is_dark_mode.
  const [isDarkMode, setIsDarkMode] = useState(initialDraft.isDarkMode);
  const [isTypewriterSound, setIsTypewriterSound] = useState(() => lsGet("typewriter_sound") !== "off");
  const [snapshots, setSnapshots] = useState<
    { id: string; name: string; text: string; date: string }[]
  >(initialDraft.snapshots as { id: string; name: string; text: string; date: string }[]);
  const [titlePage, setTitlePage] = useState({
    title: "UNTITLED SCRIPT",
    author: "AUTHOR NAME",
    contact: "CONTACT INFO",
  });
  const [researchNotes, setResearchNotes] = useState<
    { id: string; title: string; content: string }[]
  >(initialDraft.researchNotes as { id: string; title: string; content: string }[]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveConflict, setSaveConflict] = useState<(ScriptIDEDraftState & { updatedAt: number }) | null>(null);
  // Persistence starts only after the mount-time server/local conflict has been
  // resolved. This prevents StrictMode cleanup and slow loads from saving stale
  // local state over a newer server revision.
  const [persistenceReady, setPersistenceReady] = useState(false);
  const [snapshotModal, setSnapshotModal] = useState<{
    open: boolean;
    name: string;
  }>({ open: false, name: "" });
  const [restoreModal, setRestoreModal] = useState<{
    open: boolean;
    text: string;
  }>({ open: false, text: "" });
  const [actionModal, setActionModal] = useState<{
    show: boolean;
    charName: string;
    cursor: number;
  }>({ show: false, charName: "", cursor: 0 });
  const [actionInput, setActionInput] = useState("");
  const [characters, setCharacters] = useState<ScriptCharacter[]>(
    initialDraft.characters as ScriptCharacter[],
  );
  const [isCleaning, setIsCleaning] = useState<number | null>(null);
  const [cleanError, setCleanError] = useState<string | null>(null);
  const cleanErrTimerRef = useRef<NodeJS.Timeout | null>(null);
  // "Simulate this script" — seeds an OASIS scenario from scriptText + characters
  // (src/lib/scenario-from-script.ts), then opens Story Machine onto it. Mirrors
  // StoryMachine.tsx's submitScenario() reset→init sequence exactly.
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulateStatus, setSimulateStatus] = useState<{ type: "success" | "warning" | "error"; message: string } | null>(null);
  const simulateStatusTimerRef = useRef<NodeJS.Timeout | null>(null);
  // P9: inline copilot persona (custom ghost-text voice/specialty).
  const [copilotPersona, setCopilotPersona] = useState<string>(() => lsGet("copilot_persona") || "default");
  const [personaList, setPersonaList] = useState<Array<{ id: string; name: string; description: string }>>([]);
  // P4: real-time collaboration room.
  const [collabRoom, setCollabRoom] = useState<string | undefined>(undefined);
  const [collabUserName, setCollabUserName] = useState<string>(() => lsGet("collab_username") || "Writer");
  const [collabInput, setCollabInput] = useState("");
  const [collabNameInput, setCollabNameInput] = useState("");
  // Keyless-honesty banner (finding E): whether generation-dependent features
  // (copilot, simulation turns, rewriting) have an AI key behind them.
  // null = not yet fetched; the banner only ever renders once we know for
  // sure, so first paint never flashes a false "no key" warning.
  const [llmReady, setLlmReady] = useState<boolean | null>(null);
  const [llmBannerDismissed, setLlmBannerDismissed] = useState(
    () => lsGet("llmready_banner_dismissed_scriptide") === "1"
  );
  // "Open a script file" → .fdx handoff (finding D): StartScreen can't convert
  // .fdx client-side, so it hands off the filename via sessionStorage and
  // lets the user land in the editor anyway, with this notice explaining why
  // their file isn't sitting in the draft and pointing at Script Doctor.
  const [fdxImportNotice, setFdxImportNotice] = useState<string | null>(null);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<FountainEditorHandle>(null);
  // highlightRef removed — CM6 editor manages syntax highlighting internally
  const audioCtxRef = useRef<AudioContext | null>(null);
  const panelToggleCountRef = useRef(0);
  const keystrokeTimesRef = useRef<number[]>([]);
  const analysisGenerationRef = useRef<number>(0);
  const analysisAbortRef  = useRef<AbortController | null>(null);
  const cleanActionAbortRef = useRef<AbortController | null>(null);
  // Always-current ref so async callbacks (triggerAnalysis) see the latest engineState
  // rather than a stale closure from 2 s ago.
  const engineStateRef = useRef<EngineState | null>(null);
  // Always-current characters ref so the 2s debounced analysis sees the latest roster.
  // Without this, adding a character during the debounce window would use the old list.
  const charactersRef = useRef(characters);
  // Always-current draft payload for mount-stable server autosave (must NOT be
  // recreated on every keystroke — that starved the previous 30s interval).
  const draftRef = useRef<ScriptIDEDraftState>({ scriptText, snapshots, characters, researchNotes, isDarkMode });
  const draftEnvelopeRef = useRef(initialDraft);
  const draftGenerationRef = useRef(0);
  const persistedGenerationRef = useRef(initialDraft.dirty ? -1 : 0);
  const persistenceReadyRef = useRef(false);
  const saveConflictRef = useRef<ScriptIDEServerDraft | null>(null);
  const requestServerSaveRef = useRef<(opts?: { updateStatus: boolean; keepalive?: boolean }) => void>(() => {});
  const skipNextLocalWriteRef = useRef(true);
  // Prevent setState-after-unmount from the flush-on-cleanup save path.
  const mountedRef = useRef(true);
  draftRef.current = { scriptText, snapshots, characters, researchNotes, isDarkMode };

  // Sync document class for Tailwind `dark:` variants + CodeMirror theme.
  // Theme storage is mirrored from the draft envelope write path only.
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [isDarkMode]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Persist to localStorage ──────────────────────────────────────────────────
  // Update the in-memory envelope immediately on a real edit, then debounce its
  // single atomic storage write. Mounting and server restore are not edits.
  useEffect(() => {
    const state = draftRef.current;
    if (skipNextLocalWriteRef.current) {
      skipNextLocalWriteRef.current = false;
      return;
    }
    if (scriptIDEDraftStatesEqual(draftEnvelopeRef.current, state)) return;

    draftEnvelopeRef.current = updateScriptIDEDraft(draftEnvelopeRef.current, state);
    const generation = ++draftGenerationRef.current;
    setSaveStatus(saveConflictRef.current ? "save-conflict" : "saving-local");

    // A writer may type while the initial server load is still pending. Persist
    // that edit immediately so the restore decision sees it and navigation
    // cannot lose it. Server-applied state sets skipNextLocalWriteRef above.
    if (!persistenceReady) {
      const ok = writeScriptIDEDraft(lsSet, draftEnvelopeRef.current);
      setSaveStatus(ok ? "saved-local" : "save-failed");
      return;
    }

    const debounceTimer = setTimeout(() => {
      const ok = writeScriptIDEDraft(lsSet, draftEnvelopeRef.current);
      if (!mountedRef.current) return;
      if (ok) {
        if (draftGenerationRef.current === generation && !saveConflictRef.current) {
          setSaveStatus("saved-local");
        }
      } else {
        setSaveStatus("save-failed");
      }
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [persistenceReady, scriptText, snapshots, characters, researchNotes, isDarkMode]);

  // ── Server-side persistence ────────────────────────────────────────────────
  // Versioned drafts compare opaque server revisions. Legacy drafts use the old
  // timestamp/length rule once, then migrate into the envelope.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/scriptide/load')
      .then(r => r.ok ? r.json() : null)
      .then((data: ({ status: string } & Partial<ScriptIDEServerDraft>) | null) => {
        if (cancelled || !data) return;
        if (data.status === 'empty') {
          writeScriptIDEDraft(lsSet, draftEnvelopeRef.current);
          return;
        }
        if (
          typeof data.scriptText !== 'string' ||
          !Array.isArray(data.snapshots) ||
          !Array.isArray(data.characters) ||
          !Array.isArray(data.researchNotes) ||
          typeof data.isDarkMode !== 'boolean' ||
          typeof data.updatedAt !== 'number'
        ) return;

        const server: ScriptIDEServerDraft = {
          scriptText: data.scriptText,
          snapshots: data.snapshots,
          characters: data.characters,
          researchNotes: data.researchNotes,
          isDarkMode: data.isDarkMode,
          updatedAt: data.updatedAt,
        };
        const local = draftEnvelopeRef.current;
        const legacyDecision = resolveDraftConflict(
          { text: local.scriptText, updatedAt: local.contentUpdatedAt },
          { text: server.scriptText, updatedAt: server.updatedAt },
        );
        const decision = decideScriptIDERestore(local, server, {
          hadVersionedDraft: hadVersionedDraftRef.current,
          legacySource: legacyDecision.source,
        });

        if (decision.action === 'conflict') {
          saveConflictRef.current = decision.server;
          setSaveConflict(decision.server);
          setSaveStatus('save-conflict');
          return;
        }
        if (decision.action === 'use-server') {
          const cleanEnvelope = applyServerScriptIDEDraft(decision.server);
          draftEnvelopeRef.current = cleanEnvelope;
          skipNextLocalWriteRef.current = true;
          persistedGenerationRef.current = draftGenerationRef.current;
          setScriptText(decision.server.scriptText);
          setSnapshots(decision.server.snapshots as { id: string; name: string; text: string; date: string }[]);
          setCharacters(decision.server.characters as typeof characters);
          setResearchNotes(decision.server.researchNotes as typeof researchNotes);
          setIsDarkMode(decision.server.isDarkMode);
          writeScriptIDEDraft(lsSet, cleanEnvelope);
          return;
        }

        if (decision.action === 'keep-local') {
          draftEnvelopeRef.current = {
            ...local,
            serverRevision: decision.serverRevision,
            // Legacy multi-key imports must still server-save after migration.
            dirty: local.dirty || hadVersionedDraftRef.current === false,
          };
          writeScriptIDEDraft(lsSet, draftEnvelopeRef.current);
        }
      })
      .catch(() => { /* non-critical — continue with local envelope */ })
      .finally(() => {
        if (cancelled) return;
        persistenceReadyRef.current = true;
        setPersistenceReady(true);
      });
    return () => { cancelled = true; };
  }, []); // mount only

  // Auto-save to server every 30s from refs so continuous typing cannot starve it.
  // A trigger during an in-flight request queues one trailing save of the newest
  // generation. Only the generation actually acknowledged may claim success.
  useEffect(() => {
    if (!persistenceReady) return;
    let inFlight = false;
    let trailingRequested = false;
    let disposed = false;

    const saveToServer = (opts: { updateStatus: boolean; keepalive?: boolean } = { updateStatus: true }) => {
      if (!persistenceReadyRef.current) return;
      if (inFlight) {
        trailingRequested = true;
        return;
      }
      if (!shouldStartScriptIDESave(draftEnvelopeRef.current, saveConflictRef.current !== null, inFlight)) return;

      const generation = draftGenerationRef.current;
      const payload = draftRef.current;
      const expectedUpdatedAt = draftEnvelopeRef.current.serverRevision;
      inFlight = true;
      if (opts.updateStatus && mountedRef.current) setSaveStatus("saving-server");
      fetch('/api/scriptide/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, expectedUpdatedAt }),
        keepalive: opts.keepalive === true,
      })
        .then(async (r) => {
          const data = await r.json() as {
            status?: string;
            updatedAt?: number;
            server?: ScriptIDEServerDraft;
          };
          if (r.status === 409 && data.status === 'conflict' && data.server) {
            saveConflictRef.current = data.server;
            if (mountedRef.current) {
              setSaveConflict(data.server);
              setSaveStatus('save-conflict');
            }
            return;
          }
          if (!r.ok || data.status !== 'saved' || typeof data.updatedAt !== 'number') {
            throw new Error(`save ${r.status}`);
          }

          const transition = acknowledgeScriptIDESave(
            draftEnvelopeRef.current,
            generation,
            draftGenerationRef.current,
            data.updatedAt,
          );
          draftEnvelopeRef.current = transition.envelope;
          persistedGenerationRef.current = Math.max(persistedGenerationRef.current, generation);
          const localWriteOk = writeScriptIDEDraft(lsSet, transition.envelope);
          if (transition.needsTrailingSave) trailingRequested = true;
          if (opts.updateStatus && mountedRef.current && transition.acknowledgedCurrentDraft) {
            setSaveStatus(localWriteOk ? "saved-server" : "save-failed");
          }
        })
        .catch(() => {
          if (opts.updateStatus && mountedRef.current) setSaveStatus("save-failed");
        })
        .finally(() => {
          inFlight = false;
          if (trailingRequested && !disposed && !saveConflictRef.current) {
            trailingRequested = false;
            saveToServer({ updateStatus: true });
          }
        });
    };
    requestServerSaveRef.current = saveToServer;
    const syncLocalEnvelope = () => {
      if (!scriptIDEDraftStatesEqual(draftEnvelopeRef.current, draftRef.current)) {
        draftEnvelopeRef.current = updateScriptIDEDraft(draftEnvelopeRef.current, draftRef.current);
        draftGenerationRef.current += 1;
      }
      return writeScriptIDEDraft(lsSet, draftEnvelopeRef.current);
    };
    const interval = setInterval(() => saveToServer({ updateStatus: true }), 30_000);
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        syncLocalEnvelope();
        saveToServer({ updateStatus: true, keepalive: true });
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
      syncLocalEnvelope();
      saveToServer({ updateStatus: false, keepalive: true });
      requestServerSaveRef.current = () => {};
      disposed = true;
    };
  }, [persistenceReady]);

  // Keep both refs in sync so async callbacks always read the latest values.
  useEffect(() => {
    charactersRef.current = characters;
  }, [characters]);

  // Keep engineStateRef in sync so triggerAnalysis always reads the latest state (F3).
  useEffect(() => {
    engineStateRef.current = engineState;
  }, [engineState]);

  // Cleanup typing timeout and AudioContext on unmount (F2a, F2b).
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      analysisAbortRef.current?.abort();
      cleanActionAbortRef.current?.abort();
      if (simulateStatusTimerRef.current) clearTimeout(simulateStatusTimerRef.current);
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => { /* ignore */ });
        audioCtxRef.current = null;
      }
    };
  }, []);

  // ── Consume imported Fountain script ────────────────────────────────────────
  useEffect(() => {
    if (!importedScript) return;
    setScriptText(importedScript);
    setActiveTab("production");

    if (importedCharacters && importedCharacters.length > 0) {
      setCharacters((prev) => {
        const existingNames = new Set(prev.map((c) => c.name.toLowerCase()));
        const newChars: ScriptCharacter[] = importedCharacters
          .filter((c) => !existingNames.has(c.name.toLowerCase()))
          .map((c) => ({ id: crypto.randomUUID(), ...c }));
        return [...prev, ...newChars];
      });
    }

    onImportConsumed?.();
  // importedCharacters is stable (array literal from parent memo) — safe to omit.
  // onImportConsumed must be in deps so we always call the current prop version.
  }, [importedScript, onImportConsumed]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Initialize engine state ──────────────────────────────────────────────────
  useEffect(() => {
    // Restore any DirectorPanel edits (throughlines, player model, QBN qualities)
    // persisted from a previous session so they survive a page reload.
    const savedDirector = safeJsonParse<Partial<DirectorState> | null>(
      lsGet("director_state"),
      null,
    );
    setEngineState({
      config: initialConfig,
      protagonist: {
        name: "Protagonist",
        ghost: "Unknown",
        lie: "Unknown",
        want: "Unknown",
        need: "Unknown",
        visualAnchor: "Average build",
        psychology: {
          attachmentStyle: "secure",
          darkTriad: {
            machiavellianism: 50,
            narcissism: 50,
            psychopathy: 50,
          },
          formativeWound: "Unknown",
          defenseMechanisms: [],
          currentDefenseLevel: "low",
        },
        speechPattern: { vocabulary: "Standard", underPressure: "Stutters" },
      },
      directorState: {
        arcMeter: { lieBelief: 100, needAwareness: 0, internalConflict: 0 },
        memory: { episodic: [], semantic: [], procedural: [] },
        playerModel: {
          inferredIntent: "Writing",
          engagementLevel: 100,
          detectedEmotion: "Neutral",
          bigFive: {
            openness: 50,
            conscientiousness: 50,
            extraversion: 50,
            agreeableness: 50,
            neuroticism: 50,
          },
          biometrics: {
            readTimeTrend: "stable",
            choiceDeliberationTime: 0,
            panelToggleFrequency: 0,
          },
        },
        qualityValidation: {
          passed: true,
          sinCheck: "None",
          horizonCheck: "Clear",
          subtextGap: false,
        },
        tensionLevel: 0,
        menaceGauge: 0,
        tensionSpace: 0,
        structuralNode: "Opening Image",
        unreliableNarratorScore: 0,
        activeSecrets: [],
        npcs: [],
        throughlines: {
          objectiveStory: "",
          mainCharacter: "",
          influenceCharacter: "",
          relationshipStory: "",
          activeThroughlines: [],
        },
        qbnQualities: {},
        ...(savedDirector ?? {}),
      },
      scriptBlocks: [],
      isAnalyzing: false,
      isGeneratingMedia: false,
    });
  }, [initialConfig]);

  // Persist directorState so DirectorPanel edits survive a page reload.
  useEffect(() => {
    if (engineState?.directorState) {
      lsSet("director_state", JSON.stringify(engineState.directorState));
    }
  }, [engineState?.directorState]);

  // ── Panel toggle biometrics ──────────────────────────────────────────────────
  useEffect(() => {
    panelToggleCountRef.current += 1;
    setEngineState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        directorState: {
          ...prev.directorState,
          playerModel: {
            ...prev.directorState.playerModel,
            biometrics: {
              ...prev.directorState.playerModel.biometrics,
              panelToggleFrequency: panelToggleCountRef.current,
            },
          },
        },
      };
    });
  }, [toolSlot]);

  // ── Memos ────────────────────────────────────────────────────────────────────
  const parsedBlocks = useMemo(() => parseFountain(scriptText), [scriptText]);
  // highlightedText removed — CM6 FountainEditor extension handles syntax highlighting

  const stats = useMemo(() => {
    const blocks = parsedBlocks;
    const charCounts: Record<string, number> = {};
    const locCounts: Record<string, number> = {};
    let dialogueLines = 0;
    let actionLines = 0;
    // Zero-allocation word count: `.trim().split(/\s+/)` allocates a full
    // intermediate array on every keystroke-driven recompute (this useMemo
    // reruns on every scriptText change), which shows up as real GC pressure
    // on feature-length (90-120pp) scripts. A single char-code scan needs no
    // intermediate array and has no empty-string special case to get wrong.
    let wordCount = 0;
    let inWord = false;
    for (let i = 0; i < scriptText.length; i++) {
      if (scriptText.charCodeAt(i) > 32) {
        if (!inWord) { wordCount++; inWord = true; }
      } else {
        inWord = false;
      }
    }

    blocks.forEach((block) => {
      if (block.type === "character") {
        const name = block.text.trim().toUpperCase();
        charCounts[name] = (charCounts[name] || 0) + 1;
      } else if (block.type === "scene_heading") {
        const loc = block.text.trim().toUpperCase();
        locCounts[loc] = (locCounts[loc] || 0) + 1;
      } else if (block.type === "dialogue") {
        dialogueLines++;
      } else if (block.type === "action") {
        actionLines++;
      }
    });

    const charData = Object.entries(charCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
    const locData = Object.entries(locCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const estimatedMinutes = Math.ceil(wordCount / 250);

    return {
      charData,
      locData,
      dialogueLines,
      actionLines,
      wordCount,
      estimatedMinutes,
    };
  }, [scriptText, parsedBlocks]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live page count — same layoutScreenplay() the PDF exporter uses, so the
  // Toolbar number always matches what .PDF actually produces. Debounced
  // (like the AI-analysis trigger below, just shorter) rather than run in
  // the `stats` memo above: layoutScreenplay re-parses AND paginates the
  // whole script, which is unnecessary work on every single keystroke.
  const [pageCount, setPageCount] = useState(1);
  useEffect(() => {
    const timer = setTimeout(() => {
      setPageCount(layoutScreenplay(scriptText).length);
    }, 300);
    return () => clearTimeout(timer);
  }, [scriptText]);

  // handleScroll removed — CM6 editor manages its own scroll internally

  // ── AI analysis ──────────────────────────────────────────────────────────────
  const triggerAnalysis = async (text: string) => {
    const currentEngineState = engineStateRef.current;
    if (!text.trim() || !currentEngineState) return;

    // Cancel any in-flight analysis so a stale response can't overwrite newer state.
    analysisAbortRef.current?.abort();
    const abort = new AbortController();
    analysisAbortRef.current = abort;

    const currentGeneration = ++analysisGenerationRef.current;
    setEngineState((prev) => (prev ? { ...prev, isAnalyzing: true } : null));

    try {
      // Use charactersRef.current so we always see the latest character roster,
      // even if characters changed during the 2s debounce window.
      const newState = await analyzeScriptBlock(currentEngineState, text, charactersRef.current, abort.signal);
      if (currentGeneration === analysisGenerationRef.current) {
        setEngineState(newState);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      if (currentGeneration === analysisGenerationRef.current) {
        setEngineState((prev) => prev ? { ...prev, isAnalyzing: false } : null);
      }
    }
  };

  // ── Script change handler ────────────────────────────────────────────────────
  // handleUserEdit: fires on every CM6 doc change (typewriter sound + keystroke biometrics)
  const handleUserEdit = useCallback(() => {
    const now = performance.now();
    keystrokeTimesRef.current.push(now);
    if (keystrokeTimesRef.current.length > 20) keystrokeTimesRef.current.shift();
    if (keystrokeTimesRef.current.length >= 6) {
      const times = keystrokeTimesRef.current;
      const gaps = times.slice(1).map((t, i) => t - times[i]);
      const firstHalf = gaps.slice(0, Math.floor(gaps.length / 2));
      const secondHalf = gaps.slice(Math.floor(gaps.length / 2));
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      let trend: 'accelerating' | 'decelerating' | 'stable' = 'stable';
      if (avgSecond < avgFirst * 0.85) trend = 'accelerating';
      else if (avgSecond > avgFirst * 1.15) trend = 'decelerating';
      setEngineState((prev) => {
        if (!prev) return prev;
        const bm = prev.directorState.playerModel.biometrics;
        if (bm.readTimeTrend === trend) return prev;
        return {
          ...prev,
          directorState: {
            ...prev.directorState,
            playerModel: { ...prev.directorState.playerModel, biometrics: { ...bm, readTimeTrend: trend } },
          },
        };
      });
    }
    if (isTypewriterSound) {
      try {
        if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
        const ctx = audioCtxRef.current;
        const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.04), ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.008));
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const gain = ctx.createGain();
        gain.gain.value = 0.18;
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start();
      } catch { /* audio context unavailable */ }
    }
  }, [isTypewriterSound]);

  // P9: load the available copilot personas once for the picker.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/scriptide/personas")
      .then(r => (r.ok ? r.json() : Promise.reject(new Error("personas_fetch_failed"))))
      .then((data: { personas?: Array<{ id: string; name: string; description: string }> }) => {
        if (!cancelled && Array.isArray(data.personas)) setPersonaList(data.personas);
      })
      .catch(() => { /* picker falls back to the default-only list */ });
    return () => { cancelled = true; };
  }, []);

  // Finding E: fetch AI readiness once on mount so first-time users learn up
  // front what works keyless (analysis, exports) vs what needs a key
  // (generation). Non-fatal on failure — the banner simply never shows if we
  // can't determine readiness, rather than guessing wrong.
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

  // StartScreen's "Open a script file" hands off a pending .fdx filename via
  // sessionStorage when it couldn't convert the file client-side. Surface it
  // once, then clear the flag so it never reappears on a later reload.
  useEffect(() => {
    try {
      const pendingFdx = sessionStorage.getItem("sm_fdx_import_pending");
      if (pendingFdx) {
        setFdxImportNotice(
          `"${pendingFdx}" is a Final Draft (.fdx) file — this app converts .fdx server-side. Open Script Doctor (below) and use its "Upload script" button to bring it in as Fountain.`
        );
        sessionStorage.removeItem("sm_fdx_import_pending");
      }
      const pendingSample = sessionStorage.getItem("sm_sample_pending");
      if (pendingSample) {
        sessionStorage.removeItem("sm_sample_pending");
        setDoctorAutoSample(true);
        setTask("coverage");
        setToolSlot("coverage");
      }
    } catch { /* sessionStorage unavailable — notice just never appears */ }
  }, []);

  // Persist persona selection so it survives reloads.
  useEffect(() => { lsSet("copilot_persona", copilotPersona); }, [copilotPersona]);

  // Persist the Live Notes toggle so it survives reloads (same idiom as
  // typewriter sound's on/off flag).
  useEffect(() => {
    lsSet("live_diagnostics", liveDiagnostics ? "1" : "0");
  }, [liveDiagnostics]);

  // Dismissing the keyless-readiness banner is remembered per-app (finding E
  // asks for "dismissible, non-nagging" — StoryMachine.tsx tracks its own key
  // separately since the two apps are shown/dismissed independently).
  const dismissLlmBanner = () => {
    setLlmBannerDismissed(true);
    lsSet("llmready_banner_dismissed_scriptide", "1");
  };

  /** Exclusive right tool slot — only one deep tool surface at a time. */
  const openToolSlot = useCallback((slot: IdeToolSlot) => {
    setToolSlot((prev) => {
      const next = prev === slot ? "none" : slot;
      if (next === "coverage") {
        setTask("coverage");
        setCoverageStale(false);
      } else if (next === "studio") {
        setTask((t) => (t === "ship" ? "ship" : "write"));
      } else if (next === "none") {
        setTask((t) => (t === "coverage" || t === "ship" ? "write" : t));
      }
      return next;
    });
  }, []);

  const handleTaskChange = useCallback((next: IdeTask) => {
    setTask(next);
    if (next === "write") {
      setToolSlot("none");
      setCoverageFull(false);
    } else if (next === "coverage") {
      setToolSlot("coverage");
      setCoverageFull(false);
      setCoverageStale(false);
    } else if (next === "ship") {
      setToolSlot("studio");
      setActiveTab("versions");
      setCoverageFull(false);
    }
  }, []);

  // Escape ladder: prefs → tool slot → mobile sidebar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (prefsOpen !== "none") {
        setPrefsOpen("none");
        return;
      }
      if (toolSlot === "coverage" && coverageFull) {
        setCoverageFull(false);
        return;
      }
      if (toolSlot !== "none") {
        setToolSlot("none");
        setCoverageFull(false);
        if (task === "coverage" || task === "ship") setTask("write");
        return;
      }
      if (sidebarOpen) setSidebarOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [prefsOpen, toolSlot, task, sidebarOpen, coverageFull]);

  // Poll the editor cursor at ~250ms to highlight the active scene in the sidebar.
  // Uses requestAnimationFrame-gated interval to avoid re-render storm.
  useEffect(() => {
    let raf: number;
    const poll = () => {
      const view = editorRef.current?.getView();
      if (view) {
        const line = view.state.doc.lineAt(view.state.selection.main.head).number;
        if (line !== currentLineRef.current) {
          currentLineRef.current = line;
          setCurrentLine(line);
        }
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleScriptChange = (text: string) => {
    setScriptText(text);
    setCoverageStale(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      triggerAnalysis(text);
    }, 2000);
  };

  // handleKeyDown removed — i/e/Tab/Enter handling now lives in the CM6 fountainKeymap
  // extension. The action modal is triggered via FountainEditor's onCharacterEnter prop.

  // ── Action modal ─────────────────────────────────────────────────────────────
  const submitActionModal = (skip = false) => {
    const { cursor } = actionModal;
    const textBefore = scriptText.substring(0, cursor);
    const textAfter = scriptText.substring(cursor);

    let insertion = "\n";
    if (!skip && actionInput.trim()) {
      insertion = `\n(${actionInput.trim()})\n`;
    }

    const newText = textBefore + insertion + textAfter;
    setScriptText(newText);
    setActionModal({ show: false, charName: "", cursor: 0 });
    triggerAnalysis(newText);

    // CM6: focus and place cursor via the EditorView
    setTimeout(() => {
      const view = editorRef.current?.getView();
      if (!view) return;
      view.focus();
      const newPos = Math.min(cursor + insertion.length, view.state.doc.length);
      view.dispatch({ selection: { anchor: newPos }, scrollIntoView: true });
    }, 50);
  };

  // ── Navigation ───────────────────────────────────────────────────────────────
  const handleNavigate = useCallback((lineIndex: number) => {
    // CM6 editor handles scroll and cursor placement natively via FountainEditorHandle
    editorRef.current?.navigateTo(lineIndex + 1); // lineIndex is 0-indexed, navigateTo is 1-indexed
  }, []);

  // ── Character handlers ───────────────────────────────────────────────────────
  const handleAddCharacter = () => {
    const newChar: ScriptCharacter = {
      id: Date.now().toString(),
      name: "",
      ghost: "",
      lie: "",
      want: "",
      need: "",
    };
    setCharacters([...characters, newChar]);
  };

  const handleUpdateCharacter = (id: string, field: string, value: string) => {
    setCharacters(
      characters.map((char) =>
        char.id === id ? { ...char, [field]: value } : char
      )
    );
  };

  // ── AI suggestion apply ──────────────────────────────────────────────────────
  const handleApplySuggestion = (suggestion: string) => {
    const cursor = editorRef.current?.getView()?.state.selection.main.head ?? scriptText.length;
    const textBefore = scriptText.substring(0, cursor);
    const textAfter = scriptText.substring(cursor);
    const newText = `${textBefore}\n${suggestion}\n${textAfter}`;
    setScriptText(newText);
    triggerAnalysis(newText);
  };

  // ── Export ───────────────────────────────────────────────────────────────────
  const exportFountain = () => {
    // Prepend a Fountain title page if the script doesn't already have one.
    // Sourced from the `titlePage` state the "Title" tab actually edits — a
    // local `const titlePage = ...` here previously SHADOWED that state and
    // silently hardcoded "Untitled Script"/"Author" on every export, no matter
    // what the user typed into the Title tab's title/author/contact fields.
    let content = scriptText;
    if (!content.trimStart().startsWith('Title:')) {
      const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const titleStr = titlePage.title.trim() || 'Untitled Script';
      const authorStr = titlePage.author.trim() || 'Author';
      const contactStr = titlePage.contact.trim() ? `\nContact: ${titlePage.contact.trim()}` : '';
      const titlePageBlock = `Title: ${titleStr}\nCredit: Written by\nAuthor: ${authorStr}\nDraft date: ${today}${contactStr}\n\n`;
      content = titlePageBlock + content;
    }
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "script.fountain";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Exporters are dynamic-imported at their call sites — each is a one-shot
  // user action (toolbar button click), never needed until the user asks for
  // that specific format, so there's no reason to pay for fdx.ts/pdf.ts/
  // docx.ts (plus pdf.ts's screenplay-layout.ts and docx.ts's zip.ts) on
  // first paint.
  const exportFDX = async () => {
    const { fountainToFdx } = await import("../lib/fdx");
    const fdx = fountainToFdx(scriptText);
    const blob = new Blob([fdx], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "script.fdx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    // Industry-standard PDF: US Letter, Courier 12pt, standard margins/indents.
    const { fountainToPdf } = await import("../lib/pdf");
    const bytes = fountainToPdf(scriptText);
    // Copy into a fresh ArrayBuffer so the Blob owns a clean, correctly-typed buffer.
    const buf = bytes.slice().buffer;
    const blob = new Blob([buf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "script.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportDOCX = async () => {
    // Word-compatible .docx: OOXML parts zipped (store method), Courier styles.
    const { fountainToDocx } = await import("../lib/docx");
    const bytes = fountainToDocx(scriptText);
    const buf = bytes.slice().buffer;
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "script.docx";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Clean action AI ──────────────────────────────────────────────────────────
  const handleCleanAction = async (index: number, text: string) => {
    cleanActionAbortRef.current?.abort();
    const abort = new AbortController();
    cleanActionAbortRef.current = abort;
    setIsCleaning(index);
    try {
      const response = await fetch("/api/scriptide/clean-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: abort.signal,
      });
      if (!response.ok) throw new Error(`Clean action failed: ${response.status}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const newText = data.result;
      const blocks = parsedBlocks;
      const updatedBlocks = [...blocks];
      updatedBlocks[index] = { ...updatedBlocks[index], text: newText };
      const newScript = updatedBlocks.map((b) => b.text).join("\n");
      setScriptText(newScript);
      triggerAnalysis(newScript);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      if (cleanErrTimerRef.current) clearTimeout(cleanErrTimerRef.current);
      setCleanError((err as Error).message ?? 'Clean action failed');
      cleanErrTimerRef.current = setTimeout(() => setCleanError(null), 5000);
    } finally {
      setIsCleaning(null);
    }
  };

  // ── Simulate this script ─────────────────────────────────────────────────────
  const showSimulateStatus = useCallback((type: "success" | "warning" | "error", message: string) => {
    setSimulateStatus({ type, message });
    if (simulateStatusTimerRef.current) clearTimeout(simulateStatusTimerRef.current);
    simulateStatusTimerRef.current = setTimeout(() => setSimulateStatus(null), 8000);
  }, []);

  const handleSimulateScript = useCallback(async () => {
    if (isSimulating) return;
    setIsSimulating(true);
    try {
      const { payload, warnings } = buildScenarioFromScript(scriptText, characters);
      if (payload.agents.length === 0) {
        showSimulateStatus("error", warnings[0] ?? "Nothing to simulate — add characters or dialogue first.");
        return;
      }

      // Mirrors StoryMachine.tsx's submitScenario(): reset first so a new
      // scenario never inherits stale agents/ledger from a prior session,
      // then init with the built payload.
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

      const castMsg = `Cast of ${payload.agents.length} seeded into ${payload.nodes.length} location${payload.nodes.length === 1 ? "" : "s"}.`;
      showSimulateStatus(
        warnings.length > 0 ? "warning" : "success",
        warnings.length > 0 ? `${castMsg} ${warnings.join(" ")}` : castMsg,
      );
      onOpenStoryMachine?.();
    } catch (err) {
      showSimulateStatus("error", (err as Error).message || "Failed to seed simulation. Check the server.");
    } finally {
      setIsSimulating(false);
    }
  }, [scriptText, characters, isSimulating, onOpenStoryMachine, showSimulateStatus]);

  // ── Snapshot handlers ────────────────────────────────────────────────────────
  const takeSnapshot = () => {
    setSnapshotModal({ open: true, name: `Version ${snapshots.length + 1}` });
  };

  const confirmSnapshot = () => {
    if (snapshotModal.name.trim()) {
      const newSnapshot = {
        id: crypto.randomUUID(),
        name: snapshotModal.name.trim(),
        text: scriptText,
        date: new Date().toLocaleString('en-US'),
      };
      setSnapshots([newSnapshot, ...snapshots].slice(0, 20));
    }
    setSnapshotModal({ open: false, name: "" });
  };

  const restoreSnapshot = (text: string) => {
    setRestoreModal({ open: true, text });
  };

  const confirmRestore = () => {
    setScriptText(restoreModal.text);
    triggerAnalysis(restoreModal.text);
    setRestoreModal({ open: false, text: "" });
  };

  const deleteSnapshot = (id: string) => {
    setSnapshots(snapshots.filter((s) => s.id !== id));
  };

  // ── Research note handlers ────────────────────────────────────────────────────
  const handleAddNote = () => {
    setResearchNotes([
      { id: Date.now().toString(), title: "New Note", content: "" },
      ...researchNotes,
    ]);
  };

  const handleUpdateNote = (
    id: string,
    field: "title" | "content",
    value: string
  ) => {
    setResearchNotes(
      researchNotes.map((n) => (n.id === id ? { ...n, [field]: value } : n))
    );
  };

  const handleDeleteNote = (id: string) => {
    setResearchNotes(researchNotes.filter((n) => n.id !== id));
  };

  const useServerConflictDraft = () => {
    const server = saveConflictRef.current;
    if (!server) return;
    const cleanEnvelope = applyServerScriptIDEDraft(server);
    draftEnvelopeRef.current = cleanEnvelope;
    skipNextLocalWriteRef.current = true;
    persistedGenerationRef.current = draftGenerationRef.current;
    saveConflictRef.current = null;
    setSaveConflict(null);
    setScriptText(server.scriptText);
    setSnapshots(server.snapshots as typeof snapshots);
    setCharacters(server.characters as typeof characters);
    setResearchNotes(server.researchNotes as typeof researchNotes);
    setIsDarkMode(server.isDarkMode);
    setSaveStatus("saved-server");
    writeScriptIDEDraft(lsSet, cleanEnvelope);
  };

  const keepLocalConflictDraft = () => {
    const server = saveConflictRef.current;
    if (!server) return;
    draftEnvelopeRef.current = {
      ...draftEnvelopeRef.current,
      serverRevision: server.updatedAt,
      dirty: true,
    };
    saveConflictRef.current = null;
    setSaveConflict(null);
    setSaveStatus("saving-server");
    writeScriptIDEDraft(lsSet, draftEnvelopeRef.current);
    requestServerSaveRef.current({ updateStatus: true });
  };

  // renderAnalysis() removed — dead code (never called; superseded by the
  // "analysis" tab's <AnalysisPanel/>, which has no recharts dependency).
  // Removing it drops recharts entirely from the bundle: it was the only
  // remaining import site in the whole src tree.

  // ── Title page ───────────────────────────────────────────────────────────────
  const renderTitlePage = () => (
    <div className="p-12 bg-white dark:bg-zinc-900 dark:text-white h-full flex flex-col items-center justify-center text-center font-courier">
      <div className="w-full max-w-md space-y-12">
        <input
          value={titlePage.title}
          onChange={(e) =>
            setTitlePage({ ...titlePage, title: e.target.value.toUpperCase() })
          }
          aria-label="Script title"
          className="w-full bg-transparent text-3xl font-bold text-center outline-none border-b-2 border-dashed border-black dark:border-white py-4"
          placeholder="TITLE"
        />
        <div className="space-y-4">
          <p className="text-sm italic">written by</p>
          <input
            value={titlePage.author}
            onChange={(e) =>
              setTitlePage({ ...titlePage, author: e.target.value })
            }
            aria-label="Script author"
            className="w-full bg-transparent text-xl text-center outline-none border-b border-black dark:border-white"
            placeholder="AUTHOR"
          />
        </div>
        <div className="pt-24">
          <textarea
            value={titlePage.contact}
            onChange={(e) =>
              setTitlePage({ ...titlePage, contact: e.target.value })
            }
            aria-label="Contact information"
            className="w-full bg-transparent text-sm text-center outline-none h-32 resize-none"
            placeholder="CONTACT INFORMATION"
          />
        </div>
      </div>
    </div>
  );

  // ── Guard ────────────────────────────────────────────────────────────────────
  if (!engineState) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-[#f4f4f0] font-mono text-sm uppercase tracking-widest text-black">
        <div className="flex items-center gap-3 border-2 border-black bg-white px-6 py-4">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Opening script desk…
        </div>
      </div>
    );
  }

  const isEmptyDraft = scriptText.trim().length === 0;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex h-dvh w-full overflow-hidden bg-[var(--sm-paper)] font-sans text-[var(--sm-ink)]"
    >
      <Sidebar
        characters={characters}
        onAddCharacter={handleAddCharacter}
        onUpdateCharacter={handleUpdateCharacter}
        scriptText={scriptText}
        parsedBlocks={parsedBlocks}
        onNavigate={handleNavigate}
        currentLine={currentLine}
        mobileOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      {/* CENTER: page stage — primary visual weight */}
      {/* min-w-0: without it this flex-1 column refuses to shrink below the
          toolbar's intrinsic (non-wrapping) width. */}
      <div className="relative flex h-full min-w-0 flex-1 flex-col border-r-[1.5px] border-[var(--sm-ink)] bg-[var(--sm-panel)]">
        {cleanError && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-xs font-bold px-3 py-1.5 border-2 border-black flex items-center gap-2">
            {cleanError}
            <button onClick={() => setCleanError(null)} aria-label="Dismiss error" className="ml-1 leading-none hover:opacity-70">✕</button>
          </div>
        )}
        {fdxImportNotice && (
          <div className="absolute top-2 right-2 z-50 max-w-sm bg-amber-500 text-black text-xs font-bold px-3 py-1.5 border-2 border-black flex items-start gap-2">
            <span>{fdxImportNotice}</span>
            <button onClick={() => setFdxImportNotice(null)} className="ml-1 leading-none hover:opacity-70 shrink-0" aria-label="Dismiss">✕</button>
          </div>
        )}
        {saveConflict && (
          <div
            className="z-30 flex flex-wrap items-center gap-2 border-b-[1.5px] border-[var(--sm-ink)] bg-[var(--sm-warn)] px-3 py-2 font-[family-name:var(--sm-font-mono)] text-[11px] text-[var(--sm-ink)]"
            role="alert"
          >
            <span className="mr-auto font-bold uppercase tracking-wider">
              This draft changed in another tab.
            </span>
            <button
              type="button"
              onClick={useServerConflictDraft}
              className="min-h-8 border border-[var(--sm-ink)] bg-[var(--sm-panel)] px-3 font-bold uppercase"
            >
              Use server
            </button>
            <button
              type="button"
              onClick={keepLocalConflictDraft}
              className="min-h-8 bg-[var(--sm-ink)] px-3 font-bold uppercase text-[var(--sm-cream)]"
            >
              Keep mine
            </button>
          </div>
        )}
        <Toolbar
          title={titlePage.title || initialConfig.theme || "Untitled Script"}
          task={task}
          toolSlot={toolSlot}
          saveStatusLabel={formatSaveStatus(saveStatus)}
          isAnalyzing={engineState.isAnalyzing}
          directorsLayer={directorsLayer}
          liveDiagnostics={liveDiagnostics}
          wordCount={stats.wordCount}
          pageCount={pageCount}
          isTypewriterSound={isTypewriterSound}
          isSimulating={isSimulating}
          coverageStale={coverageStale}
          provenance={doctorAutoSample ? "sample" : "user"}
          onTaskChange={handleTaskChange}
          onToggleDirectorsLayer={() => setDirectorsLayer((v) => !v)}
          onOpenDirector={() => openToolSlot("director")}
          onOpenSlate={() => openToolSlot("slate")}
          onOpenStudio={() => openToolSlot("studio")}
          onToggleLiveDiagnostics={() => setLiveDiagnostics((prev) => !prev)}
          onToggleTypewriterSound={() => {
            setIsTypewriterSound((prev) => {
              lsSet("typewriter_sound", prev ? "off" : "on");
              return !prev;
            });
          }}
          onExportFountain={exportFountain}
          onExportFDX={exportFDX}
          onExportPDF={exportPDF}
          onExportDOCX={exportDOCX}
          onSimulateScript={handleSimulateScript}
          onOpenStoryMachine={onOpenStoryMachine}
          onNewStory={onNewStory ? () => setNewStoryConfirm(true) : undefined}
          onGoHome={onNewStory ? () => setNewStoryConfirm(true) : undefined}
          onToggleSidebar={() => setSidebarOpen(true)}
          onOpenCollab={() => {
            setCollabNameInput(collabUserName);
            setPrefsOpen("collab");
          }}
          onOpenCopilot={() => setPrefsOpen("copilot")}
        />

        {/* Action strip — director's slate: one context, one dominant CTA, right-aligned */}
        <div className="flex min-h-[44px] items-center gap-3 border-b-[1.5px] border-[var(--sm-ink)] bg-[var(--sm-bar)] px-4 py-2.5 font-[family-name:var(--sm-font-mono)] text-[11px] text-[var(--sm-ink)]">
          {simulateStatus ? (
            <>
              <span
                className={
                  simulateStatus.type === "error"
                    ? "text-[var(--sm-stamp)]"
                    : simulateStatus.type === "warning"
                      ? "text-[var(--sm-warn)]"
                      : "text-[var(--sm-ok)]"
                }
              >
                {simulateStatus.message}
              </span>
              <button type="button" onClick={() => setSimulateStatus(null)} className="sm-btn ml-auto py-1.5">
                Dismiss
              </button>
            </>
          ) : collabRoom ? (
            <>
              <span className="sm-live"><i /> Live · {collabRoom}</span>
              <span className="text-[var(--sm-ink-mute)]">{collabUserName}</span>
              <button type="button" onClick={() => setCollabRoom(undefined)} className="sm-btn ml-auto py-1.5">
                Leave
              </button>
            </>
          ) : isEmptyDraft && task === "write" ? (
            <>
              <span className="sm-slug">Empty page</span>
              <button
                type="button"
                onClick={() => {
                  setDoctorAutoSample(true);
                  handleTaskChange("coverage");
                }}
                className="sm-btn sm-btn--stamp py-1.5"
              >
                Sample coverage
              </button>
              <span className="text-[var(--sm-ink-faint)]">or type FADE IN:</span>
            </>
          ) : coverageStale && !isEmptyDraft ? (
            <>
              <span className="sm-slug">Coverage outdated</span>
              <button type="button" onClick={() => handleTaskChange("coverage")} className="sm-btn sm-btn--stamp py-1.5">
                Re-run coverage
              </button>
            </>
          ) : task === "coverage" ? (
            <>
              <span className="sm-slug">
                {coverageFull
                  ? "Full report · Esc → summary"
                  : toolSlot === "coverage"
                    ? "Next fix in panel"
                    : "Diagnose this draft"}
              </span>
              {toolSlot === "coverage" && !coverageFull && (
                <button type="button" onClick={() => setCoverageFull(true)} className="sm-btn py-1.5">
                  Full report
                </button>
              )}
              {toolSlot === "coverage" && coverageFull && (
                <button type="button" onClick={() => setCoverageFull(false)} className="sm-btn py-1.5">
                  Summary
                </button>
              )}
              {toolSlot !== "coverage" && (
                <button type="button" onClick={() => openToolSlot("coverage")} className="sm-btn sm-btn--ink py-1.5">
                  Open coverage
                </button>
              )}
            </>
          ) : task === "ship" ? (
            <>
              <span className="sm-title">Ship</span>
              <button type="button" onClick={exportPDF} disabled={isEmptyDraft} className="sm-btn sm-btn--stamp py-1.5 disabled:opacity-40">
                PDF
              </button>
              <button type="button" onClick={exportFountain} disabled={isEmptyDraft} className="sm-btn py-1.5 disabled:opacity-40">
                Fountain
              </button>
              <button type="button" onClick={takeSnapshot} disabled={isEmptyDraft} className="sm-btn py-1.5 disabled:opacity-40">
                Snapshot
              </button>
              <button
                type="button"
                onClick={handleSimulateScript}
                disabled={isSimulating || isEmptyDraft}
                className="sm-btn py-1.5 disabled:opacity-40"
              >
                {isSimulating ? "…" : "Simulate"}
              </button>
            </>
          ) : (
            <>
              <span className="sm-slug">Write on the page</span>
              {!isEmptyDraft && (
                <button type="button" onClick={() => handleTaskChange("coverage")} className="sm-btn py-1.5">
                  Run coverage
                </button>
              )}
            </>
          )}

          {llmReady === false && !llmBannerDismissed && (
            <button
              type="button"
              onClick={dismissLlmBanner}
              className="ml-auto text-[10px] uppercase tracking-wider text-[var(--sm-ink-faint)] underline hover:text-[var(--sm-ink)]"
              title="Analysis works without a key; generation needs Settings"
            >
              No AI key · analysis ok
            </button>
          )}
        </div>

        {/* Progressive depth: prefs only when requested from overflow */}
        {prefsOpen === "copilot" && (
          <div className="flex flex-wrap items-center gap-2 border-b border-black/15 bg-white px-3 py-2">
            <label htmlFor="copilot-persona" className="font-mono text-[10px] font-bold uppercase tracking-widest text-black/60">
              Copilot
            </label>
            <select
              id="copilot-persona"
              value={copilotPersona}
              onChange={(e) => setCopilotPersona(e.target.value)}
              className="border border-black bg-white px-2 py-1 font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-black"
            >
              {(personaList.length > 0
                ? personaList
                : [{ id: "default", name: "Staff Writer", description: "" }]
              ).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setPrefsOpen("none")}
              className="ml-auto font-mono text-[10px] uppercase tracking-wider underline"
            >
              Done
            </button>
          </div>
        )}
        {prefsOpen === "collab" && !collabRoom && (
          <div className="flex flex-wrap items-center gap-2 border-b border-black/15 bg-white px-3 py-2">
            <input
              value={collabNameInput}
              onChange={(e) => setCollabNameInput(e.target.value)}
              placeholder="Your name"
              aria-label="Collaborator name"
              className="border border-black px-2 py-1 font-mono text-[11px] focus:outline-none"
            />
            <input
              value={collabInput}
              onChange={(e) => setCollabInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && collabInput.trim()) {
                  const name = collabNameInput.trim() || collabUserName;
                  lsSet("collab_username", name);
                  setCollabUserName(name);
                  setCollabRoom(collabInput.trim());
                  setPrefsOpen("none");
                  setCollabInput("");
                }
              }}
              placeholder="Room ID"
              aria-label="Collaboration room id"
              className="border border-black px-2 py-1 font-mono text-[11px] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                if (!collabInput.trim()) return;
                const name = collabNameInput.trim() || collabUserName;
                lsSet("collab_username", name);
                setCollabUserName(name);
                setCollabRoom(collabInput.trim());
                setPrefsOpen("none");
                setCollabInput("");
              }}
              className="border border-black bg-black px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white"
            >
              Join
            </button>
            <button
              type="button"
              onClick={() => setPrefsOpen("none")}
              className="font-mono text-[10px] uppercase tracking-wider underline"
            >
              Cancel
            </button>
          </div>
        )}

        <div
          className={`relative flex-1 overflow-hidden bg-[var(--sm-paper)] sm-stage-transition ${
            task === "ship" ? "bg-[#f0ebe0]" : task === "coverage" ? "bg-[#f2ede3]" : "bg-[var(--sm-paper)]"
          }`}
          aria-busy={engineState.isAnalyzing ? "true" : "false"}
        >
          {/* CodeMirror 6 editor — replaces the textarea + syntax-highlight overlay.
              Syntax highlighting, inline AI ghost-text, and Fountain keybindings
              are all handled as CM6 extensions inside FountainEditor. */}
          <FountainEditor
            ref={editorRef}
            value={scriptText}
            onChange={handleScriptChange}
            onUserEdit={handleUserEdit}
            characters={characters.map(c => c.name)}
            completionCtx={{
              directorStyle: initialConfig?.directorStyle,
              characters: characters.map(c => c.name),
              persona: copilotPersona,
            }}
            collabRoom={collabRoom}
            collabUserName={collabUserName}
            isDarkMode={isDarkMode}
            liveDiagnostics={liveDiagnostics}
          />

          {/* Page furniture — quiet manuscript metadata in the right gutter */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-3 right-5 z-10 hidden items-end gap-2 font-[family-name:var(--sm-font-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--sm-ink-faint)]/60 md:flex"
          >
            <span className="tabular-nums">{stats.wordCount}w</span>
            <span className="text-[var(--sm-ink-faint)]/30">·</span>
            <span className="tabular-nums">{pageCount} {pageCount === 1 ? "page" : "pages"}</span>
          </div>

          {/* Empty draft coach — Write mode only; disappears on first keystroke */}
          {isEmptyDraft && task === "write" && toolSlot === "none" && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center pt-[16%] sm:pt-[12%]">
              <div className="pointer-events-auto mx-4 max-w-[42ch] text-center">
                <p className="font-[family-name:var(--sm-font-hand)] text-lg text-[var(--sm-ink-faint)]">
                  the page is yours
                </p>
                <h2 className="mt-2 font-[family-name:var(--sm-font-display)] text-3xl uppercase leading-none tracking-[0.04em] text-[var(--sm-ink)]">
                  Start writing
                </h2>
                <p className="mt-3 font-[family-name:var(--sm-font-mono)] text-[11px] uppercase tracking-[0.2em] text-[var(--sm-ink-mute)]">
                  Type FADE IN: to begin, or load the sample.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDoctorAutoSample(true);
                      handleTaskChange("coverage");
                    }}
                    className="sm-btn sm-btn--stamp min-h-[44px]"
                  >
                    Sample coverage
                  </button>
                  <button
                    type="button"
                    onClick={() => editorRef.current?.getView()?.focus()}
                    className="sm-btn min-h-[44px]"
                  >
                    Focus editor
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Action Prompt Modal */}
          <AnimatePresence>
            {actionModal.show && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                role="dialog"
                aria-modal="true"
                aria-label="Action required"
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  className="bg-white border-4 border-black p-6 brutal-shadow max-w-md w-full"
                >
                  <h2 className="font-bold uppercase tracking-widest text-xl mb-2 border-b-4 border-black pb-2">
                    Action Required
                  </h2>
                  <p className="text-sm font-mono mb-4">
                    What is{" "}
                    <span className="font-bold text-red-600">
                      {actionModal.charName}
                    </span>{" "}
                    doing right now?
                  </p>

                  <input
                    type="text"
                    autoFocus
                    value={actionInput}
                    onChange={(e) => setActionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitActionModal(false);
                      if (e.key === "Escape") submitActionModal(true);
                    }}
                    aria-label="Character action description"
                    placeholder="e.g., pacing the room, lighting a cigarette..."
                    className="w-full border-2 border-black p-3 font-mono text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => submitActionModal(true)}
                      className="px-4 py-2 border-2 border-black font-bold uppercase text-xs hover:bg-gray-100 transition-colors"
                    >
                      Skip (Dialogue)
                    </button>
                    <button
                      onClick={() => submitActionModal(false)}
                      className="px-4 py-2 bg-black text-white font-bold uppercase text-xs hover:bg-red-600 transition-colors brutal-border"
                    >
                      Insert Action
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* New Story confirm modal — replaces window.confirm (QA P1-5). */}
      <AnimatePresence>
        {newStoryConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-story-confirm-title"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white border-4 border-black p-6 brutal-shadow max-w-md w-full mx-4"
            >
              <h2 id="new-story-confirm-title" className="font-bold uppercase tracking-widest text-lg mb-3 border-b-4 border-black pb-2">
                Start a new story?
              </h2>
              <p className="text-sm font-mono mb-5 text-gray-700">
                This returns you to the setup wizard — your current draft stays saved.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setNewStoryConfirm(false)}
                  className="px-4 py-2 border-2 border-black font-bold uppercase text-xs hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setNewStoryConfirm(false); onNewStory?.(); }}
                  className="px-4 py-2 bg-black text-white font-bold uppercase text-xs hover:bg-red-600 transition-colors brutal-border"
                >
                  New Story
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* RIGHT SLOT: exclusive studio surface */}
      {toolSlot === "studio" && (
        <>
          {/* Mobile backdrop for the panels drawer. */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50"
            aria-hidden="true"
            onClick={() => openToolSlot("studio")}
          />
          {/* On md+ this is a static 400px column (shrink-0). On < md it
              becomes a right-side overlay drawer so it doesn't consume the
              whole narrow viewport alongside the editor. */}
          <div className="w-full md:w-[400px] md:shrink-0 h-full flex flex-col bg-[#e8e8e3] overflow-y-auto fixed md:static top-0 right-0 z-50 md:z-auto">
            {/* Mobile-only close for the panels drawer. */}
            <button
              onClick={() => openToolSlot("studio")}
              aria-label="Close studio panel"
              className="md:hidden absolute top-2 right-2 z-10 p-2 brutal-border bg-white text-black hover:bg-black hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
        <div className="flex bg-black text-white overflow-x-auto">
          {(
            [
              { id: "production", icon: Film, label: "Production" },
              { id: "analysis", icon: null, label: "Analysis" },
              { id: "storyEngine", icon: Sparkles, label: "Engine" },
              { id: "codex", icon: BookOpen, label: "Codex" },
              { id: "research", icon: Layers, label: "Research" },
              { id: "titlePage", icon: Film, label: "Title" },
              { id: "versions", icon: null, label: "Versions" },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              aria-pressed={activeTab === id}
              className={`px-3 py-3 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 transition-colors whitespace-nowrap ${
                activeTab === id
                  ? "bg-[#e8e8e3] text-black"
                  : "hover:bg-gray-800"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-6">
          {/* ── STORY ENGINE TAB ── */}
          {activeTab === "storyEngine" && (
            <div className="space-y-6">
              <Suspense fallback={<TabPanelFallback />}>
                <AIPanel
                  script={scriptText}
                  characters={characters}
                  onApplySuggestion={handleApplySuggestion}
                />
              </Suspense>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="bg-white dark:bg-zinc-900 border-4 border-black p-6 brutal-shadow">
                  <h2 className="font-bold uppercase tracking-widest text-sm mb-6 border-b-4 border-black pb-2 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#FF4444]" /> Story Engine
                    Diagnostics
                  </h2>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-bold uppercase opacity-50">
                        Narrative Tension
                      </h3>
                      <div className="h-40 flex items-end gap-1 bg-zinc-50 dark:bg-zinc-950 p-2 brutal-border">
                        {TENSION_BARS.map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-black dark:bg-white"
                            style={{ height: `${h}%`, opacity: 0.1 + i * 0.04 }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[10px] font-bold uppercase opacity-50">
                        Structural Integrity
                      </h3>
                      <div className="space-y-2">
                        {[
                          "Inciting Incident",
                          "Plot Point 1",
                          "Midpoint",
                          "All is Lost",
                          "Climax",
                        ].map((beat) => (
                          <div
                            key={beat}
                            className="flex items-center justify-between text-[10px] font-mono p-2 bg-zinc-100 dark:bg-zinc-800 brutal-border-thin"
                          >
                            <span>{beat}</span>
                            <span className="text-green-600 font-bold">
                              LOCKED
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 p-4 bg-black text-white brutal-border">
                    <p className="text-[10px] font-mono leading-relaxed">
                      SYSTEM STATUS: THE STORY MIND IS ACTIVE. NARRATIVE
                      COHESION AT 94%. DETECTED THEME:{" "}
                      <span className="text-[#FF4444]">
                        {engineState.config.theme.toUpperCase()}
                      </span>
                      . DIRECTOR STYLE:{" "}
                      <span className="text-[#FF4444]">
                        {engineState.config.directorStyle.toUpperCase()}
                      </span>
                      .
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border-4 border-black p-6 brutal-shadow">
                  <h2 className="font-bold uppercase tracking-widest text-sm mb-4">
                    Active Throughlines
                  </h2>
                  <div className="space-y-3">
                    {engineState.directorState.throughlines.activeThroughlines.map(
                      (t) => (
                        <div
                          key={t}
                          className="p-3 border-2 border-black dark:border-zinc-700 flex items-center justify-between"
                        >
                          <span className="text-xs font-bold uppercase">
                            {t.replace(/([A-Z])/g, " $1")}
                          </span>
                          <div className="w-24 h-2 bg-zinc-200 dark:bg-zinc-800">
                            <div
                              className="h-full bg-[#FF4444]"
                              style={{ width: "65%" }}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* ── PRODUCTION TAB ── */}
          {activeTab === "production" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {directorsLayer && (
                <div className="bg-white border-4 border-black p-4 brutal-shadow">
                  <h2 className="font-bold uppercase tracking-widest text-xs mb-4 border-b-2 border-black pb-2 flex items-center gap-2 text-purple-600">
                    <Camera className="w-4 h-4" /> Director&apos;s Shot List
                  </h2>
                  {(() => {
                    const shotBlocks = parsedBlocks.filter(
                      (b) => b.type === "shot"
                    );

                    if (shotBlocks.length === 0) {
                      return (
                        <p className="text-[10px] font-mono text-gray-500 uppercase">
                          No explicit shots defined.
                        </p>
                      );
                    }

                    return (
                      <ul className="space-y-2">
                        {shotBlocks.map((shot, i) => (
                          <li
                            key={i}
                            className="text-xs font-mono bg-purple-50 text-purple-900 p-2 border-l-4 border-purple-500"
                          >
                            {shot.text}
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
              )}

              {/* MEDIA PRODUCTION */}
              <div
                className="bg-white border-4 border-black p-4 brutal-shadow"
                aria-busy={engineState.isGeneratingMedia ? "true" : "false"}
              >
                <h2 className="font-bold uppercase tracking-widest text-xs mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
                  <Film className="w-4 h-4" /> Storyboard &amp; Composition
                </h2>
                {engineState.isGeneratingMedia ? (
                  <div className="h-48 flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-400">
                    <Loader2
                      className="w-8 h-8 animate-spin text-gray-500"
                      aria-hidden="true"
                    />
                  </div>
                ) : engineState.currentAnalysis?.imageUrl ? (
                  <img
                    src={engineState.currentAnalysis.imageUrl}
                    alt="AI-generated storyboard frame"
                    className="w-full h-auto border-2 border-black filter grayscale contrast-125"
                  />
                ) : (
                  <div className="h-48 flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-400 text-gray-500 font-mono text-sm uppercase">
                    Awaiting Scene Data...
                  </div>
                )}

                {engineState.currentAnalysis?.composition && (
                  <div
                    className="mt-4 grid grid-cols-2 gap-2 font-mono text-xs uppercase"
                    role="status"
                    aria-live="polite"
                    aria-label="Composition details"
                  >
                    <div>
                      <span className="font-bold">Camera:</span>{" "}
                      {engineState.currentAnalysis.composition.cameraAngle}
                    </div>
                    <div>
                      <span className="font-bold">Shot:</span>{" "}
                      {engineState.currentAnalysis.composition.shotType}
                    </div>
                    <div>
                      <span className="font-bold">Lighting:</span>{" "}
                      {engineState.currentAnalysis.composition.lighting}
                    </div>
                    <div>
                      <span className="font-bold">Palette:</span>{" "}
                      {engineState.currentAnalysis.composition.colorPalette}
                    </div>
                  </div>
                )}
              </div>

              {/* AUDIO PRODUCTION */}
              <div
                className="bg-white border-4 border-black p-4 brutal-shadow"
                aria-busy={engineState.isGeneratingMedia ? "true" : "false"}
              >
                <h2 className="font-bold uppercase tracking-widest text-xs mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
                  <Mic className="w-4 h-4" /> Table Read (TTS)
                </h2>
                {engineState.isGeneratingMedia ? (
                  <div className="p-4 flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-400">
                    <Loader2
                      className="w-6 h-6 animate-spin text-gray-500"
                      aria-hidden="true"
                    />
                  </div>
                ) : engineState.currentAnalysis?.audioUrl ? (
                  <audio
                    controls
                    src={engineState.currentAnalysis.audioUrl}
                    className="w-full"
                    aria-label="Table read audio"
                  />
                ) : (
                  <div className="p-4 flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-400 text-gray-500 font-mono text-sm uppercase">
                    Awaiting Dialogue...
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ── ANALYSIS TAB ── */}
          {activeTab === "analysis" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <Suspense fallback={<TabPanelFallback />}>
                <AnalysisPanel
                  engineState={engineState}
                  scriptText={scriptText}
                  parsedBlocks={parsedBlocks}
                  isCleaning={isCleaning}
                  onCleanAction={handleCleanAction}
                />
              </Suspense>
            </motion.div>
          )}

          {/* ── CODEX TAB ── */}
          {activeTab === "codex" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <h2 className="font-bold uppercase tracking-widest text-xs mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Ingested Knowledge (Codex)
              </h2>
              {engineState.directorState.activeCodexEntries?.length ? (
                engineState.directorState.activeCodexEntries.map((entry, i) => (
                  <div
                    key={i}
                    className="bg-white border-4 border-black p-3 brutal-shadow"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold uppercase text-xs">
                        {entry.title}
                      </h3>
                      <span className="bg-black text-white px-2 py-0.5 text-[8px] uppercase">
                        {entry.category}
                      </span>
                    </div>
                    <p className="font-mono text-[10px] leading-tight">
                      {entry.content}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center border-4 border-dashed border-gray-400 text-gray-400 font-mono text-xs uppercase">
                  No Knowledge Ingested Yet.
                </div>
              )}
            </motion.div>
          )}

          {/* ── RESEARCH TAB (accessed via keyboard / external nav) ── */}
          {activeTab === "research" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <ResearchNotes
                notes={researchNotes}
                onAddNote={handleAddNote}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
              />
            </motion.div>
          )}

          {/* ── TITLE PAGE TAB (accessed via keyboard / external nav) ── */}
          {activeTab === "titlePage" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {renderTitlePage()}
            </motion.div>
          )}

          {activeTab === "versions" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <SnapshotManager
                snapshots={snapshots}
                snapshotModal={snapshotModal}
                restoreModal={restoreModal}
                onTakeSnapshot={takeSnapshot}
                onConfirmSnapshot={confirmSnapshot}
                onRestoreSnapshot={restoreSnapshot}
                onConfirmRestore={confirmRestore}
                onDeleteSnapshot={deleteSnapshot}
                onSetSnapshotModal={setSnapshotModal}
                onSetRestoreModal={setRestoreModal}
              />
            </motion.div>
          )}
        </div>
          </div>
        </>
      )}

      {/* ── DIRECTOR HUD — exclusive tool slot ── */}
      <AnimatePresence>
        {toolSlot === "director" && engineState && (
          <Suspense fallback={<DrawerPanelFallback />}><DirectorPanel
            onClose={() => openToolSlot("director")}
            state={{
              config: engineState.config,
              protagonist: engineState.protagonist,
              directorState: engineState.directorState,
              currentScene: {
                narrativeText: scriptText,
                dialogue: [],
                imagePrompt: "",
                beat: engineState.directorState.structuralNode,
                composition: engineState.currentAnalysis?.composition || {
                  cameraAngle: "Eye level",
                  shotType: "Medium",
                  lighting: "Natural",
                  colorPalette: "Standard",
                },
                choices: [],
                informationPosition:
                  engineState.currentAnalysis?.informationPosition || "parity",
                metrics: engineState.currentAnalysis?.metrics || {
                  pivotStrength: 0,
                  cliffhangerStrength: 0,
                  twistImpact: 0,
                  surprise: 0,
                  suspense: 0,
                },
                commentary: engineState.currentAnalysis?.commentary || {
                  tensionRationale: "",
                  informationPositionRationale: "",
                  defenseMechanismRationale: "",
                  comicReliefRationale: "",
                  throughlineRationale: "",
                  evaluatorScores: {
                    ego: 0,
                    superego: 0,
                    narrator: 0,
                    audience: 0,
                    storymind: 0,
                  },
                },
                audioDialogue: "",
              },
              history: [],
            }}
            onUpdateState={(newState) => {
              setEngineState((prev) => {
                if (!prev) return null;
                return {
                  ...prev,
                  config: newState.config,
                  protagonist: newState.protagonist,
                  directorState: newState.directorState,
                };
              });
            }}
          /></Suspense>
        )}
      </AnimatePresence>

      {/* ── COVERAGE — summary first; full doctor is progressive depth ── */}
      <AnimatePresence>
        {toolSlot === "coverage" && !coverageFull && (
          <Suspense fallback={<DrawerPanelFallback />}>
            <CoverageSummary
              fountain={scriptText}
              title={titlePage.title}
              autoLoadSample={doctorAutoSample}
              onFreshReport={() => setCoverageStale(false)}
              onLoadSampleIntoEditor={(text) => {
                setScriptText(text);
                setCoverageStale(false);
                triggerAnalysis(text);
              }}
              onJumpToLine={(line1) => {
                editorRef.current?.navigateTo(line1);
                // Keep coverage open; user is deciding/acting on the page
              }}
              onOpenFullReport={() => setCoverageFull(true)}
              onClose={() => {
                setDoctorAutoSample(false);
                setCoverageFull(false);
                setToolSlot("none");
                if (task === "coverage") setTask("write");
              }}
            />
          </Suspense>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toolSlot === "coverage" && coverageFull && (
          <Suspense fallback={<DrawerPanelFallback />}><ScriptDoctorPanel
            fountain={scriptText}
            title={titlePage.title}
            onLoadFountain={(text) => {
              setScriptText(text);
              setCoverageStale(false);
              triggerAnalysis(text);
            }}
            autoLoadSample={false}
            onClose={() => {
              // Back one depth to summary, not all the way to write
              setCoverageFull(false);
            }}
          /></Suspense>
        )}
      </AnimatePresence>

      {/* ── SLATE — exclusive tool slot ── */}
      <AnimatePresence>
        {toolSlot === "slate" && (
          <Suspense fallback={<SlatePanelFallback />}>
            <SlatePanel onClose={() => openToolSlot("slate")} />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Snapshot modals when Versions tab is not mounting the full manager */}
      {!(toolSlot === "studio" && activeTab === "versions") && (
        <SnapshotManager
          snapshots={snapshots}
          snapshotModal={snapshotModal}
          restoreModal={restoreModal}
          onTakeSnapshot={takeSnapshot}
          onConfirmSnapshot={confirmSnapshot}
          onRestoreSnapshot={restoreSnapshot}
          onConfirmRestore={confirmRestore}
          onDeleteSnapshot={deleteSnapshot}
          onSetSnapshotModal={setSnapshotModal}
          onSetRestoreModal={setRestoreModal}
          hideList
        />
      )}
    </div>
  );
}
