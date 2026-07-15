import React, { useState, useEffect, useRef } from "react";
import {
  GENRE_OPTIONS,
  TONE_OPTIONS,
  STRUCTURE_OPTIONS,
  EMOTIONAL_ARC_OPTIONS,
  DIRECTOR_STYLE_OPTIONS,
  CHARACTER_ARC_MODE_OPTIONS,
  type AxisOption,
} from "../lib/story-axes";
import { AIProviderSettings } from "./AIProviderSettings";
import { getLabsEnabled, setLabsEnabled } from "../lib/feature-flags";

type AiProviderName  = "gemini" | "openai-compat";
type AiMediaProvider = "gemini" | "openai-compat" | "none";

interface AiConfig {
  provider:    AiProviderName;
  baseUrl?:    string;
  model?:      string;
  fastModel?:  string;
  imgProvider: AiMediaProvider;
  imgBaseUrl?: string;
  imgModel?:   string;
  ttsProvider: AiMediaProvider;
  ttsBaseUrl?: string;
  ttsModel?:   string;
  ttsVoice?:   string;
  embProvider: AiMediaProvider;
  embBaseUrl?: string;
  embModel?:   string;
  keySet:    boolean;
  imgKeySet: boolean;
  ttsKeySet: boolean;
  embKeySet: boolean;
  /** True when EITHER GEMINI_API_KEY (env, default provider) OR the
   *  multi-provider key (keySet, above) is configured server-side. See
   *  server/routes/config.ts — the two are independent sources and keySet
   *  alone under-reports readiness for the (documented, default) Gemini path. */
  llmReady: boolean;
}

interface SettingsPanelProps {
  onClose: () => void;
}

type Tab = "llm" | "image" | "tts" | "embeddings" | "story" | "providers" | "labs";

const TAB_LABELS: Record<Tab, string> = {
  providers:  "Providers",
  llm:        "Text LLM",
  image:      "Image",
  tts:        "TTS",
  embeddings: "Embeddings",
  story:      "Story",
  labs:       "Labs",
};

// ── Story-axis config (server-persisted, saves immediately per control) ──────
// Mirrors GET /api/story-config's response shape (server/routes/config.ts).
// character_arc_mode is optional: the /api/character-arc-mode route (mirroring
// /api/emotional-arc) lands alongside this UI, so an older server response may
// simply omit the field — the selector then starts unset, which is correct.
interface StoryConfig {
  structure: string | null;
  emotional_arc: string | null;
  director_style: string | null;
  expected_turns: number;
  story_genre: string | null;
  story_tone: string | null;
  character_arc_mode?: string | null;
}

// ── Reusable field components ─────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "password" | "url";
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="border-2 border-black px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black w-full"
      />
    </div>
  );
}

function ProviderRadio<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{label}</span>
      <div className="flex gap-2 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider border-2 transition-colors ${
              value === opt.value
                ? "sm-btn--ink border-black"
                : "sm-btn border-black hover:bg-gray-100"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Tab content ───────────────────────────────────────────────────────────────

function LLMTab({
  cfg,
  apiKey,
  setApiKey,
  onCfgChange,
}: {
  cfg: AiConfig;
  apiKey: string;
  setApiKey: (v: string) => void;
  onCfgChange: (patch: Partial<AiConfig>) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <ProviderRadio<AiProviderName>
        label="Provider"
        value={cfg.provider}
        onChange={(v) => onCfgChange({ provider: v })}
        options={[
          { value: "gemini",       label: "Gemini" },
          { value: "openai-compat", label: "OpenAI-compatible" },
        ]}
      />

      {cfg.provider === "openai-compat" && (
        <>
          <Field
            label="Base URL"
            value={cfg.baseUrl ?? ""}
            onChange={(v) => onCfgChange({ baseUrl: v })}
            placeholder="https://openrouter.ai/api/v1"
            type="url"
          />
          <Field
            label={cfg.keySet ? "API Key (leave blank to keep current)" : "API Key"}
            value={apiKey}
            onChange={setApiKey}
            placeholder={cfg.keySet ? "●●●●●●●●●●●● (set)" : "sk-..."}
            type="password"
          />
          <Field
            label="Model (pro tier)"
            value={cfg.model ?? ""}
            onChange={(v) => onCfgChange({ model: v })}
            placeholder="openai/gpt-4o"
          />
          <Field
            label="Model (fast tier)"
            value={cfg.fastModel ?? ""}
            onChange={(v) => onCfgChange({ fastModel: v })}
            placeholder="openai/gpt-4o-mini"
          />
        </>
      )}

      {cfg.provider === "gemini" && (
        <p className="text-xs text-gray-500 font-mono">
          Using Gemini. Set <code>GEMINI_API_KEY</code> in your environment to configure the key.
          <br />
          {/* Finding E/A: live readiness from the server, not a guess — reflects
              GEMINI_API_KEY OR the multi-provider key, whichever is set. */}
          <span className={cfg.llmReady ? "text-green-700 font-bold" : "text-red-600 font-bold"}>
            Detected: {cfg.llmReady ? "ready" : "no key detected"}
          </span>
        </p>
      )}
    </div>
  );
}

function MediaTab({
  providerKey,
  baseUrlKey,
  modelKey,
  apiKeyLabel,
  keySetProp,
  extraFields,
  cfg,
  apiKey,
  setApiKey,
  onCfgChange,
  defaultModel,
  defaultUrl,
}: {
  providerKey: keyof AiConfig;
  baseUrlKey:  keyof AiConfig;
  modelKey:    keyof AiConfig;
  apiKeyLabel: string;
  keySetProp:  keyof AiConfig;
  extraFields?: React.ReactNode;
  cfg:         AiConfig;
  apiKey:      string;
  setApiKey:   (v: string) => void;
  onCfgChange: (patch: Partial<AiConfig>) => void;
  defaultModel: string;
  defaultUrl:   string;
}) {
  const provider = cfg[providerKey] as AiMediaProvider;
  return (
    <div className="flex flex-col gap-4">
      <ProviderRadio<AiMediaProvider>
        label="Provider"
        value={provider}
        onChange={(v) => onCfgChange({ [providerKey]: v } as Partial<AiConfig>)}
        options={[
          { value: "gemini",        label: "Gemini" },
          { value: "openai-compat", label: "OpenAI-compatible" },
          { value: "none",          label: "Disabled" },
        ]}
      />

      {provider === "openai-compat" && (
        <>
          <Field
            label="Base URL"
            value={(cfg[baseUrlKey] as string | undefined) ?? ""}
            onChange={(v) => onCfgChange({ [baseUrlKey]: v } as Partial<AiConfig>)}
            placeholder={defaultUrl}
            type="url"
          />
          <Field
            label={cfg[keySetProp] ? `${apiKeyLabel} (leave blank to keep current)` : apiKeyLabel}
            value={apiKey}
            onChange={setApiKey}
            placeholder={cfg[keySetProp] ? "●●●●●●●●●●●● (set)" : "sk-..."}
            type="password"
          />
          <Field
            label="Model"
            value={(cfg[modelKey] as string | undefined) ?? ""}
            onChange={(v) => onCfgChange({ [modelKey]: v } as Partial<AiConfig>)}
            placeholder={defaultModel}
          />
          {extraFields}
        </>
      )}

      {provider === "none" && (
        <p className="text-xs text-gray-500 font-mono">
          This capability is disabled. Scenes will have no generated media.
        </p>
      )}
      {provider === "gemini" && (
        <p className="text-xs text-gray-500 font-mono">
          Using Gemini for this capability.
        </p>
      )}
    </div>
  );
}

// ── Story tab ─────────────────────────────────────────────────────────────────
// Exposes the full server-side story axes: 47 genres, 24 tones, 22 structures,
// 10 emotional arcs, 28 director styles, 12 character-arc modes. Option lists
// are imported from src/lib/story-axes (which reads the server's own name
// tables), so they can never drift from what the routes accept. Unlike the AI
// tabs, every control here saves immediately on change — the same convention
// DirectorPanel's story-architecture controls use — so the footer Save button
// is hidden on this tab.

function AxisSelect({
  label,
  value,
  options,
  none,
  onChange,
  status,
  hint,
}: {
  label: string;
  value: string;
  options: AxisOption[];
  /** Label for the empty option ("— None —" style). */
  none: string;
  onChange: (v: string) => void;
  status?: { ok: boolean; msg: string } | null;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
          {label} <span className="text-gray-400 normal-case tracking-normal">({options.length})</span>
        </label>
        {status && (
          <span className={`text-[10px] font-bold ${status.ok ? "text-green-700" : "text-red-600"}`}>
            {status.msg}
          </span>
        )}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border-2 border-black px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black w-full bg-white"
      >
        <option value="">{none}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} title={opt.description}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && <p className="text-[10px] text-gray-400 font-mono">{hint}</p>}
    </div>
  );
}

type AxisKey = "genre" | "tone" | "structure" | "arc" | "style" | "mode";

function StoryTab() {
  const [story, setStory]     = useState<StoryConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed]   = useState(false);
  const [expectedTurns, setExpectedTurns] = useState(20);
  const [applying, setApplying] = useState(false);
  const [statuses, setStatuses] = useState<Partial<Record<AxisKey, { ok: boolean; msg: string }>>>({});
  const timersRef = useRef<Partial<Record<AxisKey, ReturnType<typeof setTimeout>>>>({});

  useEffect(() => {
    fetch("/api/story-config")
      .then((r) => (r.ok ? (r.json() as Promise<StoryConfig>) : Promise.reject(new Error(r.statusText))))
      .then((data) => {
        setStory(data);
        if (data.expected_turns) setExpectedTurns(data.expected_turns);
        setLoading(false);
      })
      .catch(() => { setFailed(true); setLoading(false); });
    const timers = timersRef.current;
    return () => { for (const t of Object.values(timers)) if (t) clearTimeout(t); };
  }, []);

  const setStatus = (key: AxisKey, status: { ok: boolean; msg: string } | null) => {
    setStatuses((prev) => ({ ...prev, [key]: status ?? undefined }));
    if (timersRef.current[key]) clearTimeout(timersRef.current[key]);
    if (status?.ok) {
      timersRef.current[key] = setTimeout(() => {
        setStatuses((prev) => ({ ...prev, [key]: undefined }));
      }, 2000);
    }
  };

  // Shared immediate-save POST: optimistic local patch, server 400s (invalid
  // value) and network failures surface inline next to the control.
  const save = async (
    key: AxisKey,
    endpoint: string,
    body: Record<string, unknown>,
    patch: Partial<StoryConfig>,
  ) => {
    setStory((prev) => (prev ? { ...prev, ...patch } : prev));
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
        setStatus(key, { ok: false, msg: err.error ?? "Save failed" });
        return;
      }
      setStatus(key, { ok: true, msg: "Saved ✓" });
    } catch (e) {
      setStatus(key, { ok: false, msg: (e as Error).message });
    }
  };

  const applyStructure = async (structure: string) => {
    if (!structure) return;
    setApplying(true);
    await save(
      "structure",
      "/api/outline/apply-preset",
      { structure, expectedTurns },
      { structure, expected_turns: expectedTurns },
    );
    setApplying(false);
  };

  if (loading) {
    return <div className="p-4 text-sm font-mono text-gray-500">Loading story config…</div>;
  }
  if (failed || !story) {
    return <div className="p-4 text-sm font-mono text-red-600">Failed to load story config.</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[10px] font-mono text-gray-500 uppercase leading-relaxed">
        Story axes are deterministic engine config — no AI key required. Every
        change saves immediately to the current session.
      </p>

      <AxisSelect
        label="Genre"
        value={story.story_genre ?? ""}
        options={GENRE_OPTIONS}
        none="— None —"
        status={statuses.genre}
        onChange={(genre) => {
          if (!genre) return;
          void save("genre", "/api/story-genre", { genre }, { story_genre: genre });
        }}
        hint="Sets tone register, structural contract, and genre-specific clichés to avoid."
      />

      <AxisSelect
        label="Tone"
        value={story.story_tone ?? ""}
        options={TONE_OPTIONS}
        none="— None —"
        status={statuses.tone}
        onChange={(tone) => {
          if (!tone) return;
          void save("tone", "/api/story-tone", { tone }, { story_tone: tone });
        }}
        hint="Mood register, orthogonal to genre — composes with it in every prompt."
      />

      <AxisSelect
        label="Character Arc Mode"
        value={story.character_arc_mode ?? ""}
        options={CHARACTER_ARC_MODE_OPTIONS}
        none="— None —"
        status={statuses.mode}
        onChange={(mode) => {
          if (!mode) return;
          void save("mode", "/api/character-arc-mode", { mode }, { character_arc_mode: mode });
        }}
        hint="The moral/psychological direction the protagonist travels — pairs freely with any tension curve."
      />

      <AxisSelect
        label="Emotional Arc"
        value={story.emotional_arc ?? ""}
        options={EMOTIONAL_ARC_OPTIONS}
        none="— None (no tension curve) —"
        status={statuses.arc}
        onChange={(arc) => {
          if (!arc) return;
          void save("arc", "/api/emotional-arc", { arc }, { emotional_arc: arc });
        }}
        hint="The engine steers tension pressure toward this curve's shape."
      />

      <AxisSelect
        label="Cinematic Style"
        value={story.director_style ?? ""}
        options={DIRECTOR_STYLE_OPTIONS}
        none="— None —"
        status={statuses.style}
        onChange={(style) => {
          if (!style) return;
          void save("style", "/api/director-style", { style }, { director_style: style });
        }}
        hint="Injected into every agent prompt and modulates Director pressure tone."
      />

      <div className="flex flex-col gap-2 border-t-2 border-black pt-4">
        <AxisSelect
          label="Narrative Structure"
          value={story.structure ?? ""}
          options={STRUCTURE_OPTIONS}
          none="— None —"
          status={statuses.structure}
          onChange={(structure) => void applyStructure(structure)}
          hint="Applying a structure regenerates the outline beat sheet, scaled to the expected turn count below."
        />
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Expected Total Turns
            </label>
            <input
              type="number"
              min={4}
              max={200}
              value={expectedTurns}
              onChange={(e) => setExpectedTurns(Math.max(4, Math.min(200, Number(e.target.value) || 4)))}
              className="border-2 border-black px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black w-full"
            />
          </div>
          <button
            onClick={() => story.structure && void applyStructure(story.structure)}
            disabled={applying || !story.structure}
            className="px-4 py-2 font-bold uppercase tracking-wider text-xs sm-btn--ink border-2 border-black hover:bg-[var(--sm-stamp)] transition-colors disabled:opacity-40"
          >
            {applying ? "Applying…" : "Re-apply"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Labs tab ──────────────────────────────────────────────────────────────────
// ROADMAP P2 requirement: Gate OASIS and research panels behind a Labs toggle.
// Default OFF — writers see Doctor + Editor only. Enabling Labs reveals
// experimental features like OASIS Story Machine and NVM research surfaces.

function LabsTab() {
  const [labsEnabled, setLabsEnabledState] = useState(getLabsEnabled());
  
  const handleToggle = (enabled: boolean) => {
    setLabsEnabled(enabled);
    setLabsEnabledState(enabled);
    // Immediate feedback — no page reload required, App.tsx checks on render
  };
  
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[10px] font-mono text-gray-500 uppercase leading-relaxed">
        Labs features are experimental research surfaces. Default experience is
        Doctor + Editor only (ROADMAP P2). Changes take effect immediately.
      </p>
      
      <div className="flex items-start gap-3 border-2 border-black p-4">
        <input
          type="checkbox"
          id="labs-toggle"
          checked={labsEnabled}
          onChange={(e) => handleToggle(e.target.checked)}
          className="mt-1 h-5 w-5 border-2 border-black focus:ring-2 focus:ring-black cursor-pointer"
        />
        <label htmlFor="labs-toggle" className="flex-1 cursor-pointer">
          <div className="font-bold text-sm uppercase tracking-wider mb-1">
            Enable Labs Features
          </div>
          <div className="text-xs text-gray-600 font-mono leading-relaxed">
            Unlocks OASIS Story Machine (multi-agent simulation) and NVM research
            panels (converge, twin, epistemic map, etc.). These are experimental
            surfaces not yet validated with users.
          </div>
        </label>
      </div>
      
      <div className="text-xs font-mono text-gray-500 border-l-4 border-black pl-3">
        <p className="font-bold mb-1">What's behind Labs:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>OASIS Story Machine — Multi-agent narrative simulation</li>
          <li>Research panels — NVM, converge, twin, room, etc.</li>
          <li>Experimental generation features</li>
        </ul>
      </div>
      
      <div className="text-xs font-mono text-gray-500 border-l-4 border-gray-300 pl-3">
        <p className="font-bold mb-1">Not affected by Labs:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Script Doctor — Always available</li>
          <li>Script IDE — Always available</li>
          <li>Coverage export — Always available</li>
          <li>Deterministic core — Always available</li>
        </ul>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("providers");
  const [cfg, setCfg]             = useState<AiConfig | null>(null);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [testing, setTesting]     = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);

  // Per-capability key inputs (never pre-filled for security)
  const [apiKey,    setApiKey]    = useState("");
  const [imgApiKey, setImgApiKey] = useState("");
  const [ttsApiKey, setTtsApiKey] = useState("");
  const [embApiKey, setEmbApiKey] = useState("");

  useEffect(() => {
    fetch("/api/ai-config")
      .then((r) => r.json())
      .then((data: AiConfig) => { setCfg(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const patchCfg = (patch: Partial<AiConfig>) => {
    setCfg((prev) => prev ? { ...prev, ...patch } : prev);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/ai-config/test", { method: "POST" });
      const data = await res.json() as { ok: boolean; response?: string; error?: string };
      setTestResult({ ok: data.ok, msg: data.ok ? `Connected (${data.response ?? "OK"})` : (data.error ?? "Failed") });
    } catch (e) {
      setTestResult({ ok: false, msg: (e as Error).message });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!cfg) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { ...cfg };
      // Only send keys if the user typed something
      if (apiKey)    body.apiKey    = apiKey;
      if (imgApiKey) body.imgApiKey = imgApiKey;
      if (ttsApiKey) body.ttsApiKey = ttsApiKey;
      if (embApiKey) body.embApiKey = embApiKey;
      // Never send keySet flags back
      delete body.keySet;
      delete body.imgKeySet;
      delete body.ttsKeySet;
      delete body.embKeySet;

      const res = await fetch("/api/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
        throw new Error(err.error ?? "Save failed");
      }
      const data = await res.json() as { config: AiConfig };
      setCfg(data.config);
      // Clear key inputs after save
      setApiKey(""); setImgApiKey(""); setTtsApiKey(""); setEmbApiKey("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white sm-btn shadow-[var(--sm-shadow)] w-full max-w-xl max-h-[90vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b-4 border-black">
          <h2 className="text-lg font-bold uppercase tracking-widest">Settings</h2>
          <button
            onClick={onClose}
            className="text-xl font-bold leading-none hover:opacity-60"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-8 text-sm font-mono text-gray-500">
            Loading…
          </div>
        ) : !cfg ? (
          <div className="flex-1 flex items-center justify-center p-8 text-sm font-mono text-red-600">
            Failed to load config.
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b-4 border-black">
              {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                    activeTab === tab
                      ? "sm-btn--ink"
                      : "sm-btn hover:bg-gray-100"
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>

            {/* Tab body */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === "providers" && <AIProviderSettings />}
              {activeTab === "llm" && (
                <LLMTab
                  cfg={cfg}
                  apiKey={apiKey}
                  setApiKey={setApiKey}
                  onCfgChange={patchCfg}
                />
              )}
              {activeTab === "image" && (
                <MediaTab
                  providerKey="imgProvider"
                  baseUrlKey="imgBaseUrl"
                  modelKey="imgModel"
                  apiKeyLabel="Image API Key"
                  keySetProp="imgKeySet"
                  cfg={cfg}
                  apiKey={imgApiKey}
                  setApiKey={setImgApiKey}
                  onCfgChange={patchCfg}
                  defaultModel="dall-e-3"
                  defaultUrl="https://api.openai.com/v1"
                />
              )}
              {activeTab === "tts" && (
                <MediaTab
                  providerKey="ttsProvider"
                  baseUrlKey="ttsBaseUrl"
                  modelKey="ttsModel"
                  apiKeyLabel="TTS API Key"
                  keySetProp="ttsKeySet"
                  cfg={cfg}
                  apiKey={ttsApiKey}
                  setApiKey={setTtsApiKey}
                  onCfgChange={patchCfg}
                  defaultModel="tts-1"
                  defaultUrl="https://api.openai.com/v1"
                  extraFields={
                    <Field
                      label="Voice"
                      value={cfg.ttsVoice ?? ""}
                      onChange={(v) => patchCfg({ ttsVoice: v })}
                      placeholder="alloy"
                    />
                  }
                />
              )}
              {activeTab === "embeddings" && (
                <MediaTab
                  providerKey="embProvider"
                  baseUrlKey="embBaseUrl"
                  modelKey="embModel"
                  apiKeyLabel="Embedding API Key"
                  keySetProp="embKeySet"
                  cfg={cfg}
                  apiKey={embApiKey}
                  setApiKey={setEmbApiKey}
                  onCfgChange={patchCfg}
                  defaultModel="text-embedding-3-small"
                  defaultUrl="https://api.openai.com/v1"
                />
              )}
              {activeTab === "story" && <StoryTab />}
              {activeTab === "labs" && <LabsTab />}
            </div>

            {/* Footer — AI-config actions only; the Story tab, Providers tab, and
                Labs tab save immediately, so Test/Save would be misleading there. */}
            {activeTab !== "story" && activeTab !== "providers" && activeTab !== "labs" && (
            <div className="px-6 py-4 border-t-4 border-black flex flex-col gap-2">
              {/* Status messages */}
              <div className="flex items-center min-h-[20px]">
                {error && (
                  <span className="text-xs text-red-600 font-mono truncate">{error}</span>
                )}
                {!error && saved && (
                  <span className="text-xs text-green-700 font-bold uppercase tracking-wider">
                    Saved ✓
                  </span>
                )}
                {!error && !saved && testResult && (
                  <span className={`text-xs font-mono truncate ${testResult.ok ? "text-green-700" : "text-red-600"}`}>
                    {testResult.msg}
                  </span>
                )}
              </div>
              {/* Buttons */}
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={handleTest}
                  disabled={testing || saving}
                  className="px-4 py-2 font-bold uppercase tracking-wider text-sm border-2 border-black hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  {testing ? "Testing…" : "Test Connection"}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="sm-btn--ink px-6 py-2 font-bold uppercase tracking-wider text-sm sm-btn  hover:bg-[var(--sm-stamp)] transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
