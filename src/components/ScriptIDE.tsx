import React, { useState, useEffect, useRef, useMemo } from "react";
import { EngineState, StoryConfig, ScriptBlock } from "../types";
import { analyzeScriptBlock } from "../services/director";
import { parseFountain, FountainBlock } from "../lib/fountain";
import { safeJsonParse } from "../lib/json";
import { Loader2, Settings2, BookOpen, Film, Mic, Activity, Sparkles, ShieldAlert, Camera, Download, Layers, Save, Trash2, History, BarChart3, Users, Map as MapIcon } from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { motion, AnimatePresence } from "motion/react";
import Sidebar from "./Sidebar";
import AIPanel from "./AIPanel";
import DirectorPanel from "./DirectorPanel";

interface Character {
  id: string;
  name: string;
  ghost: string;
  lie: string;
  want: string;
  need: string;
}

interface ScriptIDEProps {
  initialConfig: StoryConfig;
  onOpenStoryMachine?: () => void;
  // Fountain text exported from Story Machine — applied once then cleared
  importedScript?: string;
  importedCharacters?: Array<{ name: string; ghost: string; lie: string; want: string; need: string }>;
  onImportConsumed?: () => void;
}

const SCRIPT_ELEMENTS = {
  HEADING: /^((INT|EXT|INT\/EXT)\.?\s+.*)/i,
  CHARACTER: /^([A-Z][A-Z\s0-9]+)$/,
  PARENTHETICAL: /^(\(.*\))$/,
  TRANSITION: /^(CUT TO:|FADE IN:|FADE OUT:|DISSOLVE TO:)$/i,
};

// Stable decorative bar heights — avoids Math.random() in render path
const TENSION_BARS = [42, 67, 31, 88, 55, 23, 76, 44, 91, 38, 62, 17, 84, 50, 29, 73, 46, 95, 33, 60];

const renderHighlightedText = (text: string) => {
  const lines = text.split('\n');
  const blocks = parseFountain(text);

  // Since we need exact 1:1 sync with textarea line breaks,
  // map formatting classes to each line index
  const lineClasses: Record<number, string> = {};
  let currentLineIdx = 0;

  blocks.forEach(block => {
    const blockLines = block.text.split('\n');
    blockLines.forEach((lineText, idx) => {
      let className = "";
      if (block.type === 'scene_heading') className = "font-bold text-blue-600 dark:text-blue-400";
      if (block.type === 'character') className = "font-bold text-purple-600 dark:text-purple-400";
      if (block.type === 'parenthetical') className = "italic text-zinc-500";
      if (block.type === 'dialogue') className = "text-zinc-800 dark:text-zinc-200";
      if (block.type === 'transition') className = "font-bold uppercase text-orange-500";
      if (block.type === 'lyrics') className = "italic text-zinc-500";

      lineClasses[currentLineIdx] = className;
      currentLineIdx++;
    });
  });

  return lines.map((line, i) => {
    // Return text as exactly typed, but wrapped in colored spans.
    // We add a trailing space or newline space if empty so empty lines have height.
    return (
      <span key={i} className={lineClasses[i] || ""}>
        {line || " "}
        {i < lines.length - 1 ? "\n" : ""}
      </span>
    );
  });
};

// Safe localStorage wrapper — private browsing or storage quota errors throw in some browsers
const lsGet = (key: string): string | null => { try { return localStorage.getItem(key); } catch { return null; } };
const lsSet = (key: string, val: string): void => { try { localStorage.setItem(key, val); } catch { /* quota exceeded or private mode */ } };

export default function ScriptIDE({ initialConfig, onOpenStoryMachine, importedScript, importedCharacters, onImportConsumed }: ScriptIDEProps) {
  const [engineState, setEngineState] = useState<EngineState | null>(null);
  const [scriptText, setScriptText] = useState<string>(() => lsGet('script_draft') || "");
  const [activeTab, setActiveTab] = useState<"production" | "analysis" | "codex" | "storyEngine" | "research" | "titlePage">("production");
  const [showDirectorHUD, setShowDirectorHUD] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => lsGet('theme') === 'dark');
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isTypewriterSound, setIsTypewriterSound] = useState(true);
  const [snapshots, setSnapshots] = useState<{ id: string; name: string; text: string; date: string }[]>(() => safeJsonParse(lsGet('script_snapshots'), []));
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [titlePage, setTitlePage] = useState({ title: "UNTITLED SCRIPT", author: "AUTHOR NAME", contact: "CONTACT INFO" });
  const [researchNotes, setResearchNotes] = useState<{ id: string; title: string; content: string }[]>(() => safeJsonParse(lsGet('research_notes'), []));
  const [isSaving, setIsSaving] = useState(false);
  const [snapshotModal, setSnapshotModal] = useState<{ open: boolean; name: string }>({ open: false, name: '' });
  const [restoreModal, setRestoreModal] = useState<{ open: boolean; text: string }>({ open: false, text: '' });

  const [actionModal, setActionModal] = useState<{ show: boolean; charName: string; cursor: number }>({ show: false, charName: "", cursor: 0 });
  const [actionInput, setActionInput] = useState("");
  const [characters, setCharacters] = useState<Character[]>(() => safeJsonParse(lsGet('script_characters'), []));
  const [directorsLayer, setDirectorsLayer] = useState(false);
  const [isCleaning, setIsCleaning] = useState<number | null>(null);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const panelToggleCountRef = useRef(0);
  const keystrokeTimesRef = useRef<number[]>([]);

  useEffect(() => {
    lsSet('script_draft', scriptText);
    lsSet('theme', isDarkMode ? 'dark' : 'light');
    lsSet('script_snapshots', JSON.stringify(snapshots));
    lsSet('script_characters', JSON.stringify(characters));
    lsSet('research_notes', JSON.stringify(researchNotes));
    
    setIsSaving(true);
    const timer = setTimeout(() => setIsSaving(false), 800);
    return () => clearTimeout(timer);
  }, [scriptText, isDarkMode, snapshots, characters, researchNotes]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Consume an imported Fountain script from Story Machine
  useEffect(() => {
    if (!importedScript) return;
    setScriptText(importedScript);
    setActiveTab('production');

    // Merge imported characters into the character list (avoid duplicates by name)
    if (importedCharacters && importedCharacters.length > 0) {
      setCharacters(prev => {
        const existingNames = new Set(prev.map(c => c.name.toLowerCase()));
        const newChars: Character[] = importedCharacters
          .filter(c => !existingNames.has(c.name.toLowerCase()))
          .map(c => ({ id: crypto.randomUUID(), ...c }));
        return [...prev, ...newChars];
      });
    }

    onImportConsumed?.();
  }, [importedScript]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Initialize empty state
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
          darkTriad: { machiavellianism: 50, narcissism: 50, psychopathy: 50 },
          formativeWound: "Unknown",
          defenseMechanisms: [],
          currentDefenseLevel: "low"
        },
        speechPattern: { vocabulary: "Standard", underPressure: "Stutters" }
      },
      directorState: {
        arcMeter: { lieBelief: 100, needAwareness: 0, internalConflict: 0 },
        memory: { episodic: [], semantic: [], procedural: [] },
        playerModel: {
          inferredIntent: "Writing",
          engagementLevel: 100,
          detectedEmotion: "Neutral",
          bigFive: { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 },
          biometrics: { readTimeTrend: "stable", choiceDeliberationTime: 0, panelToggleFrequency: 0 }
        },
        qualityValidation: { passed: true, sinCheck: "None", horizonCheck: "Clear", subtextGap: false },
        tensionLevel: 0,
        menaceGauge: 0,
        tensionSpace: 0,
        structuralNode: "Opening Image",
        unreliableNarratorScore: 0,
        activeSecrets: [],
        npcs: [],
        throughlines: { objectiveStory: "", mainCharacter: "", influenceCharacter: "", relationshipStory: "", activeThroughlines: [] },
        qbnQualities: {}
      },
      scriptBlocks: [],
      isAnalyzing: false,
      isGeneratingMedia: false
    });
  }, [initialConfig]);

  useEffect(() => {
    panelToggleCountRef.current += 1;
    setEngineState(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        directorState: {
          ...prev.directorState,
          playerModel: {
            ...prev.directorState.playerModel,
            biometrics: { ...prev.directorState.playerModel.biometrics, panelToggleFrequency: panelToggleCountRef.current }
          }
        }
      };
    });
  }, [showDirectorHUD]);

  const handleScroll = () => {
    if (editorRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = editorRef.current.scrollTop;
      highlightRef.current.scrollLeft = editorRef.current.scrollLeft;
    }
  };

  const highlightedText = useMemo(() => renderHighlightedText(scriptText), [scriptText]);
  const parsedBlocks = useMemo(() => parseFountain(scriptText), [scriptText]);

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
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      let trend: 'accelerating' | 'decelerating' | 'stable' = 'stable';
      if (avgSecond < avgFirst * 0.85) trend = 'accelerating';
      else if (avgSecond > avgFirst * 1.15) trend = 'decelerating';
      setEngineState(prev => {
        if (!prev) return prev;
        const bm = prev.directorState.playerModel.biometrics;
        if (bm.readTimeTrend === trend) return prev;
        return {
          ...prev,
          directorState: {
            ...prev.directorState,
            playerModel: {
              ...prev.directorState.playerModel,
              biometrics: { ...bm, readTimeTrend: trend }
            }
          }
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

    // Sync scroll
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.target.scrollTop;
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Debounce analysis by 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      triggerAnalysis(text);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const cursor = e.currentTarget.selectionStart;
    const textBeforeCursor = scriptText.substring(0, cursor);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines[lines.length - 1];

    // Auto-complete for Scene Headings
    if (e.key === 'i' || e.key === 'I') {
      if (currentLine === '') {
        e.preventDefault();
        const newText = scriptText.substring(0, cursor) + 'INT. ' + scriptText.substring(cursor);
        setScriptText(newText);
        setTimeout(() => {
          if (editorRef.current) {
            editorRef.current.selectionStart = cursor + 5;
            editorRef.current.selectionEnd = cursor + 5;
          }
        }, 0);
        return;
      }
    } else if (e.key === 'e' || e.key === 'E') {
      if (currentLine === '') {
        e.preventDefault();
        const newText = scriptText.substring(0, cursor) + 'EXT. ' + scriptText.substring(cursor);
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

    if (e.key === 'Enter') {
      if (SCRIPT_ELEMENTS.CHARACTER.test(currentLine.trim())) {
        e.preventDefault();
        setActionModal({ show: true, charName: currentLine.trim(), cursor });
        setActionInput('');
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      
      // Character Name Autocomplete logic
      const trimmedLine = currentLine.trim();
      if (trimmedLine.length > 0 && trimmedLine === trimmedLine.toUpperCase() && !trimmedLine.startsWith('INT') && !trimmedLine.startsWith('EXT')) {
        const matchingChar = characters.find(c => c.name.toUpperCase().startsWith(trimmedLine) && c.name.toUpperCase() !== trimmedLine);
        if (matchingChar) {
          const newText = scriptText.substring(0, cursor - trimmedLine.length) + matchingChar.name.toUpperCase() + scriptText.substring(cursor);
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

      // Standard screenplay indentation logic
      let newText = "";
      let newCursor = cursor;

      if (currentLine.trim() === '') {
        // Empty line, assume Character
        newText = scriptText.substring(0, cursor) + '          ' + scriptText.substring(cursor); // Indent for Character (approx)
        newCursor = cursor + 10;
      } else if (currentLine.startsWith('          ') && !currentLine.startsWith('            ')) {
        // Looks like a Character, change to Parenthetical
        newText = scriptText.substring(0, cursor - currentLine.length) + '            (' + currentLine.trim() + ')' + scriptText.substring(cursor);
        newCursor = cursor + 4; // Adjust cursor
      } else if (currentLine.startsWith('            (')) {
        // Looks like Parenthetical, change to Transition
        newText = scriptText.substring(0, cursor - currentLine.length) + '                                        ' + currentLine.replace(/[()]/g, '').trim() + ':' + scriptText.substring(cursor);
        newCursor = cursor + 30; // Adjust cursor
      } else {
        // Default tab behavior (insert 4 spaces)
        newText = scriptText.substring(0, cursor) + '    ' + scriptText.substring(cursor);
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

  const submitActionModal = (skip: boolean = false) => {
    if (!editorRef.current) return;
    const { cursor } = actionModal;
    const textBefore = scriptText.substring(0, cursor);
    const textAfter = scriptText.substring(cursor);
    
    let insertion = '\n';
    if (!skip && actionInput.trim()) {
      insertion = `\n(${actionInput.trim()})\n`;
    }

    const newText = textBefore + insertion + textAfter;
    setScriptText(newText);
    setActionModal({ show: false, charName: '', cursor: 0 });
    triggerAnalysis(newText);

    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
        const newCursorPos = cursor + insertion.length;
        editorRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleNavigate = (lineIndex: number) => {
    if (!editorRef.current) return;
    const lines = scriptText.split('\n');
    let charCount = 0;
    for (let i = 0; i < lineIndex; i++) {
      charCount += lines[i].length + 1;
    }
    editorRef.current.focus();
    editorRef.current.setSelectionRange(charCount, charCount);
    
    // Smooth scroll to the line
    const lineHeight = 24; // Approximate
    editorRef.current.scrollTop = lineIndex * lineHeight - 100;

    // Force scroll sync
    handleScroll();
  };

  const analysisGenerationRef = useRef<number>(0);

  const triggerAnalysis = async (text: string) => {
    if (!text.trim() || !engineState) return;
    
    const currentGeneration = ++analysisGenerationRef.current;
    setEngineState(prev => prev ? { ...prev, isAnalyzing: true } : null);
    
    try {
      const newState = await analyzeScriptBlock(engineState, text, characters);
      // Only apply state if this is still the latest analysis request
      if (currentGeneration === analysisGenerationRef.current) {
        setEngineState(newState);
      }
    } catch (error) {
      console.error("Analysis failed:", error);
      if (currentGeneration === analysisGenerationRef.current) {
        setEngineState(prev => prev ? { ...prev, isAnalyzing: false } : null);
      }
    }
  };

  const handleAddCharacter = () => {
    const newChar = {
      id: Date.now().toString(),
      name: '',
      ghost: '',
      lie: '',
      want: '',
      need: ''
    };
    setCharacters([...characters, newChar]);
  };

  const handleUpdateCharacter = (id: string, field: string, value: string) => {
    setCharacters(characters.map(char => char.id === id ? { ...char, [field]: value } : char));
  };

  const handleApplySuggestion = (suggestion: string) => {
    if (!editorRef.current) return;
    const cursor = editorRef.current.selectionStart;
    const textBefore = scriptText.substring(0, cursor);
    const textAfter = scriptText.substring(cursor);
    const newText = `${textBefore}\n${suggestion}\n${textAfter}`;
    setScriptText(newText);
    triggerAnalysis(newText);
  };

  const exportFountain = () => {
    const blob = new Blob([scriptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'script.fountain';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCleanAction = async (index: number, text: string) => {
    setIsCleaning(index);
    try {
      const response = await fetch('/api/scriptide/clean-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const newText = data.result;
      const blocks = parseFountain(scriptText);
      const updatedBlocks = [...blocks];
      updatedBlocks[index] = { ...updatedBlocks[index], text: newText };
      const newScript = updatedBlocks.map(b => b.text).join('\n');
      setScriptText(newScript);
      triggerAnalysis(newScript);
    } catch (err) {
      console.error("Failed to clean action:", err);
    } finally {
      setIsCleaning(null);
    }
  };

  const getScriptStats = () => {
    const blocks = parseFountain(scriptText);
    const charCounts: Record<string, number> = {};
    const locCounts: Record<string, number> = {};
    let dialogueLines = 0;
    let actionLines = 0;
    let wordCount = scriptText.trim().split(/\s+/).length;
    if (scriptText.trim() === "") wordCount = 0;

    blocks.forEach(block => {
      if (block.type === 'character') {
        const name = block.text.trim().toUpperCase();
        charCounts[name] = (charCounts[name] || 0) + 1;
      } else if (block.type === 'scene_heading') {
        const loc = block.text.trim().toUpperCase();
        locCounts[loc] = (locCounts[loc] || 0) + 1;
      } else if (block.type === 'dialogue') {
        dialogueLines++;
      } else if (block.type === 'action') {
        actionLines++;
      }
    });

    const charData = Object.entries(charCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
    const locData = Object.entries(locCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
    
    // 1 page is approx 250 words, 1 page is approx 1 minute
    const estimatedMinutes = Math.ceil(wordCount / 250);

    return { charData, locData, dialogueLines, actionLines, wordCount, estimatedMinutes };
  };

  const stats = useMemo(() => getScriptStats(), [scriptText]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setSnapshotModal({ open: false, name: '' });
  };

  const restoreSnapshot = (text: string) => {
    setRestoreModal({ open: true, text });
  };

  const confirmRestore = () => {
    setScriptText(restoreModal.text);
    triggerAnalysis(restoreModal.text);
    setRestoreModal({ open: false, text: '' });
  };

  const deleteSnapshot = (id: string) => {
    setSnapshots(snapshots.filter(s => s.id !== id));
  };

  const renderAnalysis = () => {
    const { charData, locData, dialogueLines, actionLines, wordCount, estimatedMinutes } = stats;
    const totalLines = dialogueLines + actionLines;
    const dialoguePercent = totalLines > 0 ? Math.round((dialogueLines / totalLines) * 100) : 0;
    const actionPercent = totalLines > 0 ? Math.round((actionLines / totalLines) * 100) : 0;

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
                      { name: 'Dialogue', value: dialogueLines },
                      { name: 'Action', value: actionLines }
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
                  <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
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

        <div className="bg-black text-white p-4 brutal-border-thick">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-2">Script Health Score</h3>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-[#FF4444]">
              {Math.min(100, Math.round((dialoguePercent > 30 && dialoguePercent < 70 ? 40 : 20) + (totalLines > 50 ? 30 : 10) + (charData.length > 2 ? 30 : 10)))}
            </div>
            <div className="text-[10px] font-mono opacity-70">
              Based on dialogue balance, character depth, and structural complexity.
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderResearch = () => (
    <div className="p-6 space-y-6 bg-[#f4f4f0] dark:bg-zinc-900 dark:text-white h-full overflow-y-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold uppercase tracking-widest">Research Codex</h2>
        <button 
          onClick={() => setResearchNotes([{ id: Date.now().toString(), title: 'New Note', content: '' }, ...researchNotes])}
          className="bg-black text-white px-3 py-1 text-[10px] font-bold uppercase brutal-border"
        >
          Add Note
        </button>
      </div>
      <div className="grid gap-4">
        {researchNotes.map(note => (
          <div key={note.id} className="bg-white dark:bg-zinc-800 p-4 brutal-border-thick brutal-shadow">
            <input 
              value={note.title}
              onChange={(e) => setResearchNotes(researchNotes.map(n => n.id === note.id ? { ...n, title: e.target.value } : n))}
              className="w-full bg-transparent font-bold uppercase text-xs mb-2 outline-none border-b border-black dark:border-white"
            />
            <textarea 
              value={note.content}
              onChange={(e) => setResearchNotes(researchNotes.map(n => n.id === note.id ? { ...n, content: e.target.value } : n))}
              className="w-full bg-gray-50 dark:bg-zinc-700 text-xs p-2 outline-none h-24 resize-none font-mono"
              placeholder="Enter research, links, or inspiration..."
            />
            <button 
              onClick={() => setResearchNotes(researchNotes.filter(n => n.id !== note.id))}
              className="text-[10px] text-red-500 mt-2 font-bold uppercase"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTitlePage = () => (
    <div className="p-12 bg-white dark:bg-zinc-900 dark:text-white h-full flex flex-col items-center justify-center text-center font-courier">
      <div className="w-full max-w-md space-y-12">
        <input 
          value={titlePage.title}
          onChange={(e) => setTitlePage({ ...titlePage, title: e.target.value.toUpperCase() })}
          className="w-full bg-transparent text-3xl font-bold text-center outline-none border-b-2 border-dashed border-black dark:border-white py-4"
          placeholder="TITLE"
        />
        <div className="space-y-4">
          <p className="text-sm italic">written by</p>
          <input 
            value={titlePage.author}
            onChange={(e) => setTitlePage({ ...titlePage, author: e.target.value })}
            className="w-full bg-transparent text-xl text-center outline-none border-b border-black dark:border-white"
            placeholder="AUTHOR"
          />
        </div>
        <div className="pt-24">
          <textarea 
            value={titlePage.contact}
            onChange={(e) => setTitlePage({ ...titlePage, contact: e.target.value })}
            className="w-full bg-transparent text-sm text-center outline-none h-32 resize-none"
            placeholder="CONTACT INFORMATION"
          />
        </div>
      </div>
    </div>
  );

  const renderCodex = () => (
    <div className="p-6 space-y-6 bg-[#f4f4f0] dark:bg-zinc-900 dark:text-white h-full overflow-y-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-bold uppercase tracking-widest">Script Snapshots</h2>
        <button 
          onClick={takeSnapshot}
          className="bg-black text-white px-3 py-1 text-[10px] font-bold uppercase brutal-border flex items-center gap-2"
        >
          <Save className="w-3 h-3" /> Save Version
        </button>
      </div>
      <div className="space-y-4">
        {snapshots.map(s => (
          <div key={s.id} className="bg-white dark:bg-zinc-800 p-4 brutal-border-thick brutal-shadow flex justify-between items-center">
            <div>
              <div className="font-bold uppercase text-xs">{s.name}</div>
              <div className="text-[10px] font-mono opacity-60">{s.date}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => restoreSnapshot(s.text)} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-700 rounded transition-colors">
                <History className="w-4 h-4" />
              </button>
              <button onClick={() => deleteSnapshot(s.id)} className="p-2 hover:bg-red-100 text-red-500 rounded transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {snapshots.length === 0 && (
          <div className="text-center p-8 border-2 border-dashed border-gray-300 text-gray-400 font-mono text-xs">
            No snapshots saved yet.
          </div>
        )}
      </div>
    </div>
  );

  if (!engineState) return <div className="p-8">Initializing Studio...</div>;

  return (
    <div className="flex h-screen w-full bg-[#f4f4f0] text-black font-sans overflow-hidden">
      <Sidebar 
        characters={characters} 
        onAddCharacter={handleAddCharacter} 
        onUpdateCharacter={handleUpdateCharacter} 
        scriptText={scriptText}
        onNavigate={handleNavigate}
      />

      {/* CENTER PANEL: INGEST (Script Editor) */}
      <div className="flex-1 h-full border-r-4 border-black flex flex-col bg-white relative">
        <div className="p-4 border-b-4 border-black bg-black text-white flex justify-between items-center z-20">
          <h1 className="font-bold uppercase tracking-widest text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> The Ingest Engine (Script)
          </h1>
          <div className="flex items-center gap-4">
            {isSaving && (
              <div className="text-[10px] font-bold text-yellow-400 animate-pulse uppercase tracking-widest">
                Auto-saving...
              </div>
            )}
            <div className="text-xs font-mono">
              {engineState.isAnalyzing ? (
                <span className="flex items-center gap-2 text-yellow-400"><Loader2 className="w-3 h-3 animate-spin" /> ANALYZING...</span>
              ) : (
                <span className="text-green-400">READY</span>
              )}
            </div>
            <button
              onClick={() => setShowDirectorHUD(!showDirectorHUD)}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors brutal-border flex items-center gap-2 ${showDirectorHUD ? 'bg-purple-600 text-white' : 'bg-white text-black hover:bg-gray-200'}`}
            >
              <Settings2 className="w-3 h-3" /> HUD
            </button>
            <button
              onClick={() => setDirectorsLayer(!directorsLayer)}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest transition-colors brutal-border flex items-center gap-2 ${directorsLayer ? 'bg-purple-600 text-white' : 'bg-white text-black hover:bg-gray-200'}`}
            >
              <Layers className="w-3 h-3" /> Director's Layer
            </button>
            <button
              onClick={exportFountain}
              className="bg-white text-black px-3 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-gray-200 transition-colors brutal-border flex items-center gap-2"
            >
              <Download className="w-3 h-3" /> Export .Fountain
            </button>
            <button
              onClick={onOpenStoryMachine}
              className="bg-[#FF4444] text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-colors brutal-border"
            >
              Launch Machine
            </button>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden bg-white">
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
            className="absolute inset-0 w-full h-full p-8 font-courier text-lg resize-none focus:outline-none leading-relaxed bg-transparent text-transparent caret-black whitespace-pre-wrap break-words z-10 selection:bg-blue-100 selection:text-transparent"
            placeholder="INT. STUDIO - DAY&#10;&#10;Start typing your script here..."
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
                    What is <span className="font-bold text-red-600">{actionModal.charName}</span> doing right now?
                  </p>
                  
                  <input
                    type="text"
                    autoFocus
                    value={actionInput}
                    onChange={e => setActionInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') submitActionModal(false);
                      if (e.key === 'Escape') submitActionModal(true);
                    }}
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
          <button 
            onClick={() => setActiveTab("production")}
            className={`px-3 py-3 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === "production" ? "bg-[#e8e8e3] text-black" : "hover:bg-gray-800"}`}
          >
            <Film className="w-3 h-3" /> Production
          </button>
          <button 
            onClick={() => setActiveTab("analysis")}
            className={`px-3 py-3 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === "analysis" ? "bg-[#e8e8e3] text-black" : "hover:bg-gray-800"}`}
          >
            <Settings2 className="w-3 h-3" /> Analysis
          </button>
          <button 
            onClick={() => setActiveTab("storyEngine")}
            className={`px-3 py-3 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === "storyEngine" ? "bg-[#e8e8e3] text-black" : "hover:bg-gray-800"}`}
          >
            <Sparkles className="w-3 h-3" /> Engine
          </button>
          <button 
            onClick={() => setActiveTab("codex")}
            className={`px-3 py-3 font-bold uppercase tracking-widest text-[10px] flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === "codex" ? "bg-[#e8e8e3] text-black" : "hover:bg-gray-800"}`}
          >
            <BookOpen className="w-3 h-3" /> Codex
          </button>
        </div>

        <div className="p-6 space-y-6">
          {activeTab === "storyEngine" && (
            <div className="space-y-6">
              <AIPanel 
                script={scriptText} 
                characters={characters} 
                onApplySuggestion={handleApplySuggestion} 
              />
              
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="bg-white dark:bg-zinc-900 border-4 border-black p-6 brutal-shadow">
                  <h2 className="font-bold uppercase tracking-widest text-sm mb-6 border-b-4 border-black pb-2 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#FF4444]" /> Story Engine Diagnostics
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-bold uppercase opacity-50">Narrative Tension</h3>
                      <div className="h-40 flex items-end gap-1 bg-zinc-50 dark:bg-zinc-950 p-2 brutal-border">
                        {TENSION_BARS.map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 bg-black dark:bg-white"
                            style={{ height: `${h}%`, opacity: 0.1 + (i * 0.04) }}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <h3 className="text-[10px] font-bold uppercase opacity-50">Structural Integrity</h3>
                      <div className="space-y-2">
                        {['Inciting Incident', 'Plot Point 1', 'Midpoint', 'All is Lost', 'Climax'].map(beat => (
                          <div key={beat} className="flex items-center justify-between text-[10px] font-mono p-2 bg-zinc-100 dark:bg-zinc-800 brutal-border-thin">
                            <span>{beat}</span>
                            <span className="text-green-600 font-bold">LOCKED</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 p-4 bg-black text-white brutal-border">
                    <p className="text-[10px] font-mono leading-relaxed">
                      SYSTEM STATUS: THE STORY MIND IS ACTIVE. NARRATIVE COHESION AT 94%. 
                      DETECTED THEME: <span className="text-[#FF4444]">{engineState.config.theme.toUpperCase()}</span>.
                      DIRECTOR STYLE: <span className="text-[#FF4444]">{engineState.config.directorStyle.toUpperCase()}</span>.
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border-4 border-black p-6 brutal-shadow">
                  <h2 className="font-bold uppercase tracking-widest text-sm mb-4">Active Throughlines</h2>
                  <div className="space-y-3">
                    {engineState.directorState.throughlines.activeThroughlines.map(t => (
                      <div key={t} className="p-3 border-2 border-black dark:border-zinc-700 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase">{t.replace(/([A-Z])/g, ' $1')}</span>
                        <div className="w-24 h-2 bg-zinc-200 dark:bg-zinc-800">
                          <div className="h-full bg-[#FF4444]" style={{ width: '65%' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
          {activeTab === "production" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* DIRECTOR'S SHOT LIST */}
              {directorsLayer && (
                <div className="bg-white border-4 border-black p-4 brutal-shadow">
                  <h2 className="font-bold uppercase tracking-widest text-xs mb-4 border-b-2 border-black pb-2 flex items-center gap-2 text-purple-600">
                    <Camera className="w-4 h-4" /> Director's Shot List
                  </h2>
                  {(() => {
                    const shotBlocks = parsedBlocks.filter(b => b.type === 'shot');
                    
                    if (shotBlocks.length === 0) {
                      return <p className="text-[10px] font-mono text-gray-500 uppercase">No explicit shots defined.</p>;
                    }

                    return (
                      <ul className="space-y-2">
                        {shotBlocks.map((shot, i) => (
                          <li key={i} className="text-xs font-mono bg-purple-50 text-purple-900 p-2 border-l-4 border-purple-500">
                            {shot.text}
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
              )}

              {/* MEDIA PRODUCTION */}
              <div className="bg-white border-4 border-black p-4 brutal-shadow">
                <h2 className="font-bold uppercase tracking-widest text-xs mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
                  <Film className="w-4 h-4" /> Storyboard & Composition
                </h2>
                {engineState.isGeneratingMedia ? (
                  <div className="h-48 flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
                  </div>
                ) : engineState.currentAnalysis?.imageUrl ? (
                  <img src={engineState.currentAnalysis.imageUrl} alt="Storyboard" className="w-full h-auto border-2 border-black filter grayscale contrast-125" />
                ) : (
                  <div className="h-48 flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-400 text-gray-500 font-mono text-sm uppercase">
                    Awaiting Scene Data...
                  </div>
                )}
                
                {engineState.currentAnalysis?.composition && (
                  <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-xs uppercase">
                    <div><span className="font-bold">Camera:</span> {engineState.currentAnalysis.composition.cameraAngle}</div>
                    <div><span className="font-bold">Shot:</span> {engineState.currentAnalysis.composition.shotType}</div>
                    <div><span className="font-bold">Lighting:</span> {engineState.currentAnalysis.composition.lighting}</div>
                    <div><span className="font-bold">Palette:</span> {engineState.currentAnalysis.composition.colorPalette}</div>
                  </div>
                )}
              </div>

              {/* AUDIO PRODUCTION */}
              <div className="bg-white border-4 border-black p-4 brutal-shadow">
                <h2 className="font-bold uppercase tracking-widest text-xs mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
                  <Mic className="w-4 h-4" /> Table Read (TTS)
                </h2>
                {engineState.isGeneratingMedia ? (
                  <div className="p-4 flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
                  </div>
                ) : engineState.currentAnalysis?.audioUrl ? (
                  <audio controls src={engineState.currentAnalysis.audioUrl} className="w-full" />
                ) : (
                  <div className="p-4 flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-400 text-gray-500 font-mono text-sm uppercase">
                    Awaiting Dialogue...
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === "analysis" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* SEMANTIC FIREWALL */}
              <div className="bg-white border-4 border-black p-4 brutal-shadow">
                <h2 className="font-bold uppercase tracking-widest text-xs mb-4 border-b-2 border-black pb-2 flex items-center gap-2 text-red-600">
                  <ShieldAlert className="w-4 h-4" /> Semantic Firewall
                </h2>
                {(() => {
                  const lintedBlocks = parsedBlocks.map((b, i) => ({...b, index: i})).filter(b => b.lintErrors && b.lintErrors.length > 0);
                  
                  if (lintedBlocks.length === 0) {
                    return <p className="text-[10px] font-mono text-green-600 uppercase font-bold">No camera bleed detected. Action is pure.</p>;
                  }

                  return (
                    <div className="space-y-4">
                      {lintedBlocks.map(block => (
                        <div key={block.id} className="bg-red-50 border-2 border-red-200 p-3">
                          <p className="text-[10px] font-bold text-red-600 uppercase mb-2">{block.lintErrors?.join(', ')}</p>
                          <p className="text-xs font-mono mb-3 text-black">{block.text}</p>
                          <button
                            onClick={() => handleCleanAction(block.index, block.text)}
                            disabled={isCleaning === block.index}
                            className="bg-black text-white text-[10px] px-3 py-2 uppercase font-bold hover:bg-[#FF4444] transition-colors brutal-border disabled:opacity-50 flex items-center gap-2"
                          >
                            {isCleaning === block.index ? <><Loader2 className="w-3 h-3 animate-spin"/> Purifying...</> : 'Clean with AI'}
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* DIALOGUE INCONSISTENCIES */}
              {engineState.currentAnalysis?.dialogueInconsistencies && engineState.currentAnalysis.dialogueInconsistencies.length > 0 && (
                <div className="bg-white border-4 border-black p-4 brutal-shadow">
                  <h2 className="font-bold uppercase tracking-widest text-xs mb-4 border-b-2 border-black pb-2 flex items-center gap-2 text-yellow-600">
                    <ShieldAlert className="w-4 h-4" /> Dialogue Inconsistencies
                  </h2>
                  <div className="space-y-4">
                    {engineState.currentAnalysis.dialogueInconsistencies.map((inc, i) => (
                      <div key={i} className="bg-yellow-50 border-2 border-yellow-200 p-3">
                        <p className="text-[10px] font-bold text-yellow-600 uppercase mb-2">{inc.character}</p>
                        <p className="text-xs font-mono mb-2 text-black italic">"{inc.dialogueText}"</p>
                        <p className="text-[10px] font-bold text-black mb-1">Issue: {inc.issue}</p>
                        <p className="text-[10px] font-bold text-red-600">Suggestion: {inc.suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DIRECTOR ANALYSIS */}
              <div className="bg-white border-4 border-black p-4 brutal-shadow">
                <h2 className="font-bold uppercase tracking-widest text-xs mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
                  <Settings2 className="w-4 h-4" /> Director Analysis
                </h2>
                <div className="space-y-4 font-mono text-sm">
                  <div>
                    <div className="flex justify-between mb-1 uppercase text-xs font-bold">
                      <span>Menace Gauge</span>
                      <span>{engineState.directorState.menaceGauge}%</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 border border-black">
                      <div className="bg-red-600 h-full transition-all duration-500" style={{ width: `${engineState.directorState.menaceGauge}%` }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1 uppercase text-xs font-bold">
                      <span>Tension Level</span>
                      <span>{engineState.directorState.tensionLevel}%</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 border border-black">
                      <div className="bg-black h-full transition-all duration-500" style={{ width: `${engineState.directorState.tensionLevel}%` }}></div>
                    </div>
                  </div>

                  {engineState.currentAnalysis?.commentary && (
                    <div className="mt-4 p-3 bg-gray-100 border-l-4 border-black text-xs leading-relaxed">
                      <p className="font-bold uppercase mb-1">Director's Notes:</p>
                      <p>{engineState.currentAnalysis.commentary.tensionRationale}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* NARRATIVE METRICS */}
              {engineState.currentAnalysis?.metrics && (
                <div className="bg-white border-4 border-black p-4 brutal-shadow">
                  <h2 className="font-bold uppercase tracking-widest text-xs mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Narrative Metrics
                  </h2>
                  <div className="grid grid-cols-2 gap-4 font-mono text-[10px] uppercase">
                    <div className="p-2 bg-gray-50 border border-black">
                      <span className="font-bold block mb-1">Pivot Strength</span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 border border-black">
                          <div className="h-full bg-blue-600" style={{ width: `${engineState.currentAnalysis.metrics.pivotStrength * 100}%` }}></div>
                        </div>
                        <span>{(engineState.currentAnalysis.metrics.pivotStrength * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="p-2 bg-gray-50 border border-black">
                      <span className="font-bold block mb-1">Twist Impact</span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 border border-black">
                          <div className="h-full bg-purple-600" style={{ width: `${engineState.currentAnalysis.metrics.twistImpact * 100}%` }}></div>
                        </div>
                        <span>{(engineState.currentAnalysis.metrics.twistImpact * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="p-2 bg-gray-50 border border-black">
                      <span className="font-bold block mb-1">Surprise</span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 border border-black">
                          <div className="h-full bg-yellow-600" style={{ width: `${engineState.currentAnalysis.metrics.surprise * 100}%` }}></div>
                        </div>
                        <span>{(engineState.currentAnalysis.metrics.surprise * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="p-2 bg-gray-50 border border-black">
                      <span className="font-bold block mb-1">Suspense</span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-200 border border-black">
                          <div className="h-full bg-red-600" style={{ width: `${engineState.currentAnalysis.metrics.suspense * 100}%` }}></div>
                        </div>
                        <span>{(engineState.currentAnalysis.metrics.suspense * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* THROUGHLINES */}
              <div className="bg-white border-4 border-black p-4 brutal-shadow">
                <h2 className="font-bold uppercase tracking-widest text-xs mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
                  <Activity className="w-4 h-4" /> Narrative Throughlines
                </h2>
                <div className="space-y-3 font-mono text-[10px] uppercase">
                  <div className="p-2 bg-gray-50 border border-black">
                    <span className="font-bold block mb-1 text-red-600">Objective Story:</span>
                    {engineState.directorState.throughlines.objectiveStory}
                  </div>
                  <div className="p-2 bg-gray-50 border border-black">
                    <span className="font-bold block mb-1 text-blue-600">Main Character:</span>
                    {engineState.directorState.throughlines.mainCharacter}
                  </div>
                  <div className="p-2 bg-gray-50 border border-black">
                    <span className="font-bold block mb-1 text-green-600">Influence Character:</span>
                    {engineState.directorState.throughlines.influenceCharacter}
                  </div>
                  <div className="p-2 bg-gray-50 border border-black">
                    <span className="font-bold block mb-1 text-purple-600">Relationship Story:</span>
                    {engineState.directorState.throughlines.relationshipStory}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "codex" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <h2 className="font-bold uppercase tracking-widest text-xs mb-4 border-b-2 border-black pb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Ingested Knowledge (Codex)
              </h2>
              {engineState.directorState.activeCodexEntries?.length ? (
                engineState.directorState.activeCodexEntries.map((entry, i) => (
                  <div key={i} className="bg-white border-4 border-black p-3 brutal-shadow">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold uppercase text-xs">{entry.title}</h3>
                      <span className="bg-black text-white px-2 py-0.5 text-[8px] uppercase">{entry.category}</span>
                    </div>
                    <p className="font-mono text-[10px] leading-tight">{entry.content}</p>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center border-4 border-dashed border-gray-400 text-gray-400 font-mono text-xs uppercase">
                  No Knowledge Ingested Yet.
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
      {/* DIRECTOR HUD OVERLAY */}
      <AnimatePresence>
        {showDirectorHUD && engineState && (
          <DirectorPanel 
            state={{
              config: engineState.config,
              protagonist: engineState.protagonist,
              directorState: engineState.directorState,
              currentScene: {
                narrativeText: scriptText,
                dialogue: [],
                imagePrompt: "",
                beat: engineState.directorState.structuralNode,
                composition: engineState.currentAnalysis?.composition || { cameraAngle: "Eye level", shotType: "Medium", lighting: "Natural", colorPalette: "Standard" },
                choices: [],
                informationPosition: engineState.currentAnalysis?.informationPosition || "parity",
                metrics: engineState.currentAnalysis?.metrics || { pivotStrength: 0, cliffhangerStrength: 0, twistImpact: 0, surprise: 0, suspense: 0 },
                commentary: engineState.currentAnalysis?.commentary || { tensionRationale: "", informationPositionRationale: "", defenseMechanismRationale: "", comicReliefRationale: "", throughlineRationale: "", evaluatorScores: { ego: 0, superego: 0, narrator: 0, audience: 0, storymind: 0 } },
                audioDialogue: ""
              },
              history: []
            }}
            onUpdateState={(newState) => {
              setEngineState(prev => {
                if (!prev) return null;
                return {
                  ...prev,
                  config: newState.config,
                  protagonist: newState.protagonist,
                  directorState: newState.directorState
                };
              });
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Snapshot name modal ── */}
      <AnimatePresence>
        {snapshotModal.open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60"
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white dark:bg-zinc-800 p-6 brutal-border-thick brutal-shadow w-80 space-y-4"
            >
              <h3 className="font-bold uppercase text-xs tracking-widest">Save Snapshot</h3>
              <input
                type="text"
                value={snapshotModal.name}
                onChange={e => setSnapshotModal(s => ({ ...s, name: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') confirmSnapshot(); if (e.key === 'Escape') setSnapshotModal({ open: false, name: '' }); }}
                autoFocus
                className="w-full border-2 border-black px-3 py-2 font-mono text-sm dark:bg-zinc-700 dark:text-white"
                placeholder="Version name…"
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setSnapshotModal({ open: false, name: '' })} className="px-4 py-2 text-xs font-bold uppercase border-2 border-black hover:bg-gray-100 dark:hover:bg-zinc-700">Cancel</button>
                <button onClick={confirmSnapshot} className="px-4 py-2 text-xs font-bold uppercase bg-black text-white hover:bg-gray-800">Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Restore confirm modal ── */}
      <AnimatePresence>
        {restoreModal.open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60"
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-white dark:bg-zinc-800 p-6 brutal-border-thick brutal-shadow w-80 space-y-4"
            >
              <h3 className="font-bold uppercase text-xs tracking-widest">Restore Snapshot?</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Current unsaved changes will be lost.</p>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setRestoreModal({ open: false, text: '' })} className="px-4 py-2 text-xs font-bold uppercase border-2 border-black hover:bg-gray-100 dark:hover:bg-zinc-700">Cancel</button>
                <button onClick={confirmRestore} className="px-4 py-2 text-xs font-bold uppercase bg-black text-white hover:bg-[#FF4444]">Restore</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
