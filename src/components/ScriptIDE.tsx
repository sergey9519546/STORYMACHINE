import React, { useState, useEffect, useRef, useMemo } from "react";
import { EngineState, StoryConfig, DirectorState } from "../types";
import { analyzeScriptBlock } from "../services/director";
import { parseFountain, FountainBlock } from "../lib/fountain";
import { safeJsonParse } from "../lib/json";
import {
  Loader2,
  BookOpen,
  Film,
  Mic,
  Activity,
  Sparkles,
  Camera,
  Layers,
  BarChart3,
  Users,
  Map as MapIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { motion, AnimatePresence } from "motion/react";
import Sidebar from "./Sidebar";
import AIPanel from "./AIPanel";
import DirectorPanel from "./DirectorPanel";

// Sub-components
import AnalysisPanel from "./scriptide/AnalysisPanel";
import SnapshotManager from "./scriptide/SnapshotManager";
import ResearchNotes from "./scriptide/ResearchNotes";
import Toolbar from "./scriptide/Toolbar";
import { ScriptCharacter } from "./scriptide/CharacterManager";

// ─── Types ───────────────────────────────────────────────────────────────────

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

const renderHighlightedText = (_text: string, blocks: FountainBlock[]) => {
  // ⚡ Bolt Performance Optimization:
  // Refactored from a two-pass O(N) array allocation/dictionary build to a single-pass iteration.
  // We map directly over `blocks`, significantly reducing memory allocations for large scripts
  // and lowering UI render latency during keystrokes.

  const result: React.ReactNode[] = [];
  let lineIdx = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    let className = "";

    if (block.type === "scene_heading")
      className = "font-bold text-blue-600 dark:text-blue-400";
    else if (block.type === "character")
      className = "font-bold text-purple-600 dark:text-purple-400";
    else if (block.type === "parenthetical") className = "italic text-zinc-500";
    else if (block.type === "dialogue")
      className = "text-zinc-800 dark:text-zinc-200";
    else if (block.type === "transition")
      className = "font-bold uppercase text-orange-500";
    else if (block.type === "lyrics") className = "italic text-zinc-500";

    const blockLines = block.text.split("\n");
    for (let j = 0; j < blockLines.length; j++) {
      const lineText = blockLines[j];
      const isLastBlock = i === blocks.length - 1;
      const isLastLineInBlock = j === blockLines.length - 1;

      result.push(
        <span key={lineIdx} className={className || ""}>
          {lineText || " "}
          {!(isLastBlock && isLastLineInBlock) ? "\n" : ""}
        </span>
      );
      lineIdx++;
    }
  }

  return result;
};

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

const lsSet = (key: string, val: string): void => {
  try {
    localStorage.setItem(key, val);
  } catch {
    // localStorage quota exceeded — changes not persisted, continue silently
  }
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ScriptIDE({
  initialConfig,
  onOpenStoryMachine,
  importedScript,
  importedCharacters,
  onImportConsumed,
}: ScriptIDEProps) {
  // ── Core state ──────────────────────────────────────────────────────────────
  const [engineState, setEngineState] = useState<EngineState | null>(null);
  const [scriptText, setScriptText] = useState<string>(
    () => lsGet("script_draft") || ""
  );
  const [activeTab, setActiveTab] = useState<
    | "production"
    | "analysis"
    | "codex"
    | "storyEngine"
    | "research"
    | "titlePage"
  >("production");
  const [showDirectorHUD, setShowDirectorHUD] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => lsGet("theme") === "dark");
  const [isTypewriterSound, setIsTypewriterSound] = useState(() => lsGet("typewriter_sound") !== "off");
  const [snapshots, setSnapshots] = useState<
    { id: string; name: string; text: string; date: string }[]
  >(() => safeJsonParse(lsGet("script_snapshots"), []));
  const [titlePage, setTitlePage] = useState({
    title: "UNTITLED SCRIPT",
    author: "AUTHOR NAME",
    contact: "CONTACT INFO",
  });
  const [researchNotes, setResearchNotes] = useState<
    { id: string; title: string; content: string }[]
  >(() => safeJsonParse(lsGet("research_notes"), []));
  const [isSaving, setIsSaving] = useState(false);
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
  const [characters, setCharacters] = useState<ScriptCharacter[]>(() =>
    safeJsonParse(lsGet("script_characters"), [])
  );
  const [directorsLayer, setDirectorsLayer] = useState(false);
  const [isCleaning, setIsCleaning] = useState<number | null>(null);
  const [cleanError, setCleanError] = useState<string | null>(null);
  const cleanErrTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Refs ────────────────────────────────────────────────────────────────────
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const panelToggleCountRef = useRef(0);
  const keystrokeTimesRef = useRef<number[]>([]);
  const analysisGenerationRef = useRef<number>(0);
  const analysisAbortRef  = useRef<AbortController | null>(null);
  const cleanActionAbortRef = useRef<AbortController | null>(null);
  // Always-current ref so async callbacks (triggerAnalysis) see the latest engineState
  // rather than a stale closure from 2 s ago.
  const engineStateRef = useRef<EngineState | null>(null);

  // ── Persist to localStorage ──────────────────────────────────────────────────
  // H1: Split into two effects:
  // 1) isSaving indicator responds immediately to any change (good UX).
  // 2) Actual lsSet() calls are debounced at 500ms so rapid keystrokes only
  //    write once, preventing localStorage hammering on long scripts.
  useEffect(() => {
    // Write non-text settings immediately (they change rarely and aren't typed)
    lsSet("theme", isDarkMode ? "dark" : "light");

    // Show saving indicator immediately
    setIsSaving(true);
    const indicatorTimer = setTimeout(() => setIsSaving(false), 800);
    return () => clearTimeout(indicatorTimer);
  }, [scriptText, isDarkMode, snapshots, characters, researchNotes]);

  useEffect(() => {
    // Debounced write of heavy text data (script_draft may be hundreds of KB)
    const debounceTimer = setTimeout(() => {
      lsSet("script_draft", scriptText);
      lsSet("script_snapshots", JSON.stringify(snapshots));
      lsSet("script_characters", JSON.stringify(characters));
      lsSet("research_notes", JSON.stringify(researchNotes));
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [scriptText, snapshots, characters, researchNotes]);

  // ── Server-side persistence (H2) ────────────────────────────────────────────
  // Load from server on mount — if the server has a newer save (e.g. after cache
  // clear), prefer it over localStorage.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/scriptide/load')
      .then(r => r.ok ? r.json() : null)
      .then((data: { status: string; scriptText?: string; snapshots?: unknown[]; characters?: unknown[]; researchNotes?: unknown[]; isDarkMode?: boolean; updatedAt?: number | null } | null) => {
        if (cancelled || !data || data.status === 'empty') return;
        // Only overwrite local state if server has a non-trivial script.
        if (data.scriptText && data.scriptText.length > (scriptText?.length ?? 0)) {
          setScriptText(data.scriptText);
        }
        if (data.snapshots?.length) setSnapshots(data.snapshots as { id: string; name: string; text: string; date: string }[]);
        if (data.characters?.length) setCharacters(data.characters as typeof characters);
        if (data.researchNotes?.length) setResearchNotes(data.researchNotes as typeof researchNotes);
      })
      .catch(() => { /* non-critical — continue with localStorage */ });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount only

  // Auto-save to server every 30s (in addition to localStorage debounce).
  useEffect(() => {
    const saveToServer = () => {
      fetch('/api/scriptide/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptText, snapshots, characters, researchNotes, isDarkMode }),
      }).catch(() => { /* non-critical */ });
    };
    const interval = setInterval(saveToServer, 30_000);
    return () => clearInterval(interval);
  }, [scriptText, snapshots, characters, researchNotes, isDarkMode]);

  // ── Dark mode DOM sync ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

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
  }, [showDirectorHUD]);

  // ── Memos ────────────────────────────────────────────────────────────────────
  const parsedBlocks = useMemo(() => parseFountain(scriptText), [scriptText]);
  const highlightedText = useMemo(
    () => renderHighlightedText(scriptText, parsedBlocks),
    [scriptText, parsedBlocks]
  );

  const stats = useMemo(() => {
    const blocks = parsedBlocks;
    const charCounts: Record<string, number> = {};
    const locCounts: Record<string, number> = {};
    let dialogueLines = 0;
    let actionLines = 0;

    // ⚡ Bolt Performance Optimization:
    // Replaced scriptText.trim().split(/\s+/).length with a zero-allocation
    // character code loop. This avoids large intermediate array allocations
    // and garbage collection spikes during high-frequency keystroke renders.
    let wordCount = 0;
    let inWord = false;
    for (let i = 0; i < scriptText.length; i++) {
      if (scriptText.charCodeAt(i) > 32) {
        if (!inWord) {
          inWord = true;
          wordCount++;
        }
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

  // ── Scroll sync ──────────────────────────────────────────────────────────────
  const handleScroll = () => {
    if (editorRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = editorRef.current.scrollTop;
      highlightRef.current.scrollLeft = editorRef.current.scrollLeft;
    }
  };

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
      const newState = await analyzeScriptBlock(currentEngineState, text, characters, abort.signal);
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
  const handleScriptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setScriptText(text);

    const now = performance.now();
    keystrokeTimesRef.current.push(now);
    if (keystrokeTimesRef.current.length > 20) keystrokeTimesRef.current.shift();
    if (keystrokeTimesRef.current.length >= 6) {
      const times = keystrokeTimesRef.current;
      const gaps = times.slice(1).map((t, i) => t - times[i]);
      const firstHalf = gaps.slice(0, Math.floor(gaps.length / 2));
      const secondHalf = gaps.slice(Math.floor(gaps.length / 2));
      const avgFirst =
        firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond =
        secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      let trend: "accelerating" | "decelerating" | "stable" = "stable";
      if (avgSecond < avgFirst * 0.85) trend = "accelerating";
      else if (avgSecond > avgFirst * 1.15) trend = "decelerating";
      setEngineState((prev) => {
        if (!prev) return prev;
        const bm = prev.directorState.playerModel.biometrics;
        if (bm.readTimeTrend === trend) return prev;
        return {
          ...prev,
          directorState: {
            ...prev.directorState,
            playerModel: {
              ...prev.directorState.playerModel,
              biometrics: { ...bm, readTimeTrend: trend },
            },
          },
        };
      });
    }

    if (isTypewriterSound) {
      try {
        if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
        const ctx = audioCtxRef.current;
        const buf = ctx.createBuffer(
          1,
          Math.floor(ctx.sampleRate * 0.04),
          ctx.sampleRate
        );
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] =
            (Math.random() * 2 - 1) *
            Math.exp(-i / (ctx.sampleRate * 0.008));
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const gain = ctx.createGain();
        gain.gain.value = 0.18;
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start();
      } catch {
        /* audio context unavailable */
      }
    }

    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.target.scrollTop;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      triggerAnalysis(text);
    }, 2000);
  };

  // ── Key handler ──────────────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const cursor = e.currentTarget.selectionStart;
    const textBeforeCursor = scriptText.substring(0, cursor);
    const lines = textBeforeCursor.split("\n");
    const currentLine = lines[lines.length - 1];

    if (e.key === "i" || e.key === "I") {
      if (currentLine === "") {
        e.preventDefault();
        const newText =
          scriptText.substring(0, cursor) + "INT. " + scriptText.substring(cursor);
        setScriptText(newText);
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.selectionStart = cursor + 5;
            editorRef.current.selectionEnd = cursor + 5;
          }
        }, 0);
        return;
      }
    } else if (e.key === "e" || e.key === "E") {
      if (currentLine === "") {
        e.preventDefault();
        const newText =
          scriptText.substring(0, cursor) + "EXT. " + scriptText.substring(cursor);
        setScriptText(newText);
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.selectionStart = cursor + 5;
            editorRef.current.selectionEnd = cursor + 5;
          }
        }, 0);
        return;
      }
    }

    if (e.key === "Enter") {
      if (SCRIPT_ELEMENTS.CHARACTER.test(currentLine.trim())) {
        e.preventDefault();
        setActionModal({ show: true, charName: currentLine.trim(), cursor });
        setActionInput("");
      }
    } else if (e.key === "Tab") {
      e.preventDefault();

      const trimmedLine = currentLine.trim();
      if (
        trimmedLine.length > 0 &&
        trimmedLine === trimmedLine.toUpperCase() &&
        !trimmedLine.startsWith("INT") &&
        !trimmedLine.startsWith("EXT")
      ) {
        const matchingChar = characters.find(
          (c) =>
            c.name.toUpperCase().startsWith(trimmedLine) &&
            c.name.toUpperCase() !== trimmedLine
        );
        if (matchingChar) {
          const newText =
            scriptText.substring(0, cursor - trimmedLine.length) +
            matchingChar.name.toUpperCase() +
            scriptText.substring(cursor);
          setScriptText(newText);
          const newCursor = cursor + (matchingChar.name.length - trimmedLine.length);
          setTimeout(() => {
            if (editorRef.current) {
              editorRef.current.selectionStart = newCursor;
              editorRef.current.selectionEnd = newCursor;
            }
          }, 0);
          return;
        }
      }

      let newText = "";
      let newCursor = cursor;

      if (currentLine.trim() === "") {
        newText =
          scriptText.substring(0, cursor) +
          "          " +
          scriptText.substring(cursor);
        newCursor = cursor + 10;
      } else if (
        currentLine.startsWith("          ") &&
        !currentLine.startsWith("            ")
      ) {
        newText =
          scriptText.substring(0, cursor - currentLine.length) +
          "            (" +
          currentLine.trim() +
          ")" +
          scriptText.substring(cursor);
        newCursor = cursor + 4;
      } else if (currentLine.startsWith("            (")) {
        newText =
          scriptText.substring(0, cursor - currentLine.length) +
          "                                        " +
          currentLine.replace(/[()]/g, "").trim() +
          ":" +
          scriptText.substring(cursor);
        newCursor = cursor + 30;
      } else {
        newText =
          scriptText.substring(0, cursor) + "    " + scriptText.substring(cursor);
        newCursor = cursor + 4;
      }

      setScriptText(newText);
      setTimeout(() => {
        if (editorRef.current) {
          editorRef.current.selectionStart = newCursor;
          editorRef.current.selectionEnd = newCursor;
        }
      }, 0);
    }
  };

  // ── Action modal ─────────────────────────────────────────────────────────────
  const submitActionModal = (skip = false) => {
    if (!editorRef.current) return;
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

    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        const newCursorPos = cursor + insertion.length;
        editorRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // ── Navigation ───────────────────────────────────────────────────────────────
  const handleNavigate = (lineIndex: number) => {
    if (!editorRef.current) return;
    const lines = scriptText.split("\n");
    let charCount = 0;
    for (let i = 0; i < lineIndex; i++) {
      charCount += lines[i].length + 1;
    }
    editorRef.current.focus();
    editorRef.current.setSelectionRange(charCount, charCount);

    const lineHeight = 24;
    editorRef.current.scrollTop = lineIndex * lineHeight - 100;
    handleScroll();
  };

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
    if (!editorRef.current) return;
    const cursor = editorRef.current.selectionStart;
    const textBefore = scriptText.substring(0, cursor);
    const textAfter = scriptText.substring(cursor);
    const newText = `${textBefore}\n${suggestion}\n${textAfter}`;
    setScriptText(newText);
    triggerAnalysis(newText);
  };

  // ── Export ───────────────────────────────────────────────────────────────────
  const exportFountain = () => {
    // Prepend a Fountain title page if the script doesn't already have one.
    let content = scriptText;
    if (!content.trimStart().startsWith('Title:')) {
      const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const titlePage = `Title: Untitled Script\nCredit: Written by\nAuthor: Author\nDraft date: ${today}\n\n`;
      content = titlePage + content;
    }
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "script.fountain";
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

  // ── Snapshot handlers ────────────────────────────────────────────────────────
  const takeSnapshot = () => {
    setSnapshotModal({ open: true, name: `Version ${snapshots.length + 1}` });
  };

  const confirmSnapshot = () => {
    if (snapshotModal.name.trim()) {
      const newSnapshot = {
        id: Date.now().toString(),
        name: snapshotModal.name.trim(),
        text: scriptText,
        date: new Date().toLocaleString(),
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

  // ── Render analysis tab ──────────────────────────────────────────────────────
  const renderAnalysis = () => {
    const { charData, locData, dialogueLines, actionLines, wordCount } = stats;
    const totalLines = dialogueLines + actionLines;
    const dialoguePercent =
      totalLines > 0 ? Math.round((dialogueLines / totalLines) * 100) : 0;
    const actionPercent =
      totalLines > 0 ? Math.round((actionLines / totalLines) * 100) : 0;

    return (
      <div className="p-6 space-y-8 bg-[#f4f4f0] dark:bg-zinc-900 dark:text-white h-full overflow-y-auto">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-zinc-800 p-4 brutal-border-thick brutal-shadow">
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Dialogue vs Action
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Dialogue", value: dialogueLines },
                      { name: "Action", value: actionLines },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    <Cell fill="#FF4444" />
                    <Cell fill="#000000" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between mt-4 text-[10px] font-mono">
              <span>DIALOGUE: {dialoguePercent}%</span>
              <span>ACTION: {actionPercent}%</span>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-800 p-4 brutal-border-thick brutal-shadow">
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" /> Top Characters
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={80}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip />
                  <Bar dataKey="value" fill="#FF4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-800 p-4 brutal-border-thick brutal-shadow">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
            <MapIcon className="w-4 h-4" /> Top Locations
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#000000" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {(() => {
          // Real health score: weighted rubric across 5 axes
          const sceneCount = parsedBlocks.filter(b => b.type === 'scene_heading').length;
          const uniqueChars = charData.length;
          // 1. Dialogue balance (0–25): ideal 40-60% dialogue
          const balanceScore = dialoguePercent >= 40 && dialoguePercent <= 60 ? 25
            : dialoguePercent >= 30 && dialoguePercent <= 70 ? 18
            : dialoguePercent > 0 ? 10 : 0;
          // 2. Script length (0–20): sweet spot ≥ 90 lines for a short; 200+ for feature
          const lengthScore = totalLines >= 200 ? 20 : totalLines >= 90 ? 15 : totalLines >= 40 ? 10 : totalLines > 0 ? 5 : 0;
          // 3. Character depth (0–20): ≥3 named characters with ≥2 lines each
          const depthScore = uniqueChars >= 4 ? 20 : uniqueChars === 3 ? 15 : uniqueChars === 2 ? 10 : uniqueChars === 1 ? 5 : 0;
          // 4. Scene variety (0–20): ≥3 distinct scene headings signals structure
          const sceneScore = sceneCount >= 8 ? 20 : sceneCount >= 4 ? 15 : sceneCount >= 2 ? 10 : sceneCount === 1 ? 5 : 0;
          // 5. Character balance (0–15): top character should not speak >60% of lines
          const topShare = charData.length > 0 && dialogueLines > 0
            ? charData[0].value / dialogueLines : 0;
          const balChar = topShare < 0.4 ? 15 : topShare < 0.6 ? 10 : 5;

          const score = Math.min(100, balanceScore + lengthScore + depthScore + sceneScore + balChar);
          const grade = score >= 85 ? 'STRONG' : score >= 65 ? 'SOLID' : score >= 45 ? 'DEVELOPING' : score > 0 ? 'EARLY DRAFT' : 'EMPTY';
          const reasons: string[] = [];
          if (balanceScore < 18) reasons.push(`dialogue at ${dialoguePercent}% (target 40–60%)`);
          if (lengthScore < 15) reasons.push(`${totalLines} lines (target ≥ 90)`);
          if (depthScore < 15) reasons.push(`${uniqueChars} named character${uniqueChars !== 1 ? 's' : ''} (target ≥ 3)`);
          if (sceneScore < 15) reasons.push(`${sceneCount} scene${sceneCount !== 1 ? 's' : ''} (target ≥ 4)`);

          return (
            <div className="bg-black text-white p-4 brutal-border-thick">
              <h3 className="text-xs font-bold uppercase tracking-widest mb-2">
                Script Health Score
              </h3>
              <div className="flex items-center gap-4">
                <div className="text-4xl font-bold text-[#FF4444]">{score}</div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-[#FF4444]">{grade}</div>
                  <div className="text-[10px] font-mono opacity-70 mt-1">
                    {reasons.length > 0 ? `Improve: ${reasons.join(' · ')}` : 'Balance, length, characters, scenes — all looking good.'}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };

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
  if (!engineState) return <div className="p-8">Initializing Studio...</div>;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      className={`flex h-screen w-full bg-[#f4f4f0] text-black font-sans overflow-hidden ${isDarkMode ? "dark" : ""}`}
    >
      <Sidebar
        characters={characters}
        onAddCharacter={handleAddCharacter}
        onUpdateCharacter={handleUpdateCharacter}
        scriptText={scriptText}
        parsedBlocks={parsedBlocks}
        onNavigate={handleNavigate}
      />

      {/* CENTER PANEL: INGEST (Script Editor) */}
      <div className="flex-1 h-full border-r-4 border-black flex flex-col bg-white relative">
        {cleanError && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white text-xs font-bold px-3 py-1.5 border-2 border-black flex items-center gap-2">
            {cleanError}
            <button onClick={() => setCleanError(null)} className="ml-1 leading-none hover:opacity-70">✕</button>
          </div>
        )}
        <Toolbar
          isSaving={isSaving}
          isAnalyzing={engineState.isAnalyzing}
          showDirectorHUD={showDirectorHUD}
          directorsLayer={directorsLayer}
          wordCount={stats.wordCount}
          isTypewriterSound={isTypewriterSound}
          onToggleHUD={() => setShowDirectorHUD(!showDirectorHUD)}
          onToggleDirectorsLayer={() => setDirectorsLayer(!directorsLayer)}
          onToggleTypewriterSound={() => {
            setIsTypewriterSound(prev => {
              lsSet("typewriter_sound", prev ? "off" : "on");
              return !prev;
            });
          }}
          onExportFountain={exportFountain}
          onOpenStoryMachine={onOpenStoryMachine}
        />

        <div
          className="flex-1 relative overflow-hidden bg-white"
          aria-busy={engineState.isAnalyzing ? "true" : "false"}
        >
          {/* Syntax Highlighting Layer */}
          <div
            ref={highlightRef}
            className="absolute inset-0 p-8 font-courier text-lg leading-relaxed pointer-events-none whitespace-pre-wrap break-words overflow-hidden z-0"
            aria-hidden="true"
          >
            {highlightedText}
          </div>

          {/* Input Layer */}
          <textarea
            ref={editorRef}
            aria-label="Script editor"
            aria-multiline="true"
            className="absolute inset-0 w-full h-full p-8 font-courier text-lg resize-none focus:outline-none leading-relaxed bg-transparent text-transparent caret-black whitespace-pre-wrap break-words z-10 selection:bg-blue-100 selection:text-transparent"
            placeholder={"INT. STUDIO - DAY\n\nStart typing your script here..."}
            value={scriptText}
            onChange={handleScriptChange}
            onKeyDown={handleKeyDown}
            onScroll={handleScroll}
            spellCheck={false}
          />

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

      {/* RIGHT PANEL: VIRTUAL PRODUCTION & DIRECTOR DASHBOARD */}
      <div className="w-[400px] shrink-0 h-full flex flex-col bg-[#e8e8e3] overflow-y-auto">
        <div className="flex bg-black text-white overflow-x-auto">
          {(
            [
              { id: "production", icon: Film, label: "Production" },
              { id: "analysis", icon: null, label: "Analysis" },
              { id: "storyEngine", icon: Sparkles, label: "Engine" },
              { id: "codex", icon: BookOpen, label: "Codex" },
              { id: "research", icon: Layers, label: "Research" },
              { id: "titlePage", icon: Film, label: "Title" },
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
              <AIPanel
                script={scriptText}
                characters={characters}
                onApplySuggestion={handleApplySuggestion}
              />

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
              <AnalysisPanel
                engineState={engineState}
                scriptText={scriptText}
                parsedBlocks={parsedBlocks}
                isCleaning={isCleaning}
                onCleanAction={handleCleanAction}
              />
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
        </div>
      </div>

      {/* ── DIRECTOR HUD OVERLAY ── */}
      <AnimatePresence>
        {showDirectorHUD && engineState && (
          <DirectorPanel
            onClose={() => setShowDirectorHUD(false)}
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
          />
        )}
      </AnimatePresence>

      {/* ── Snapshot modals (delegated to SnapshotManager) ── */}
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
    </div>
  );
}
