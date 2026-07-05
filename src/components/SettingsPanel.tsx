import React, { useState, useEffect } from "react";

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

type Tab = "llm" | "image" | "tts" | "embeddings";

const TAB_LABELS: Record<Tab, string> = {
  llm:        "Text LLM",
  image:      "Image",
  tts:        "TTS",
  embeddings: "Embeddings",
};

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
                ? "bg-black text-white border-black"
                : "bg-white text-black border-black hover:bg-gray-100"
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

// ── Main panel ────────────────────────────────────────────────────────────────

export default function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("llm");
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
      <div className="bg-white brutal-border brutal-shadow w-full max-w-xl max-h-[90vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b-4 border-black">
          <h2 className="text-lg font-bold uppercase tracking-widest">AI Provider Settings</h2>
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
                      ? "bg-black text-white"
                      : "bg-white text-black hover:bg-gray-100"
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>

            {/* Tab body */}
            <div className="flex-1 overflow-y-auto p-6">
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
            </div>

            {/* Footer */}
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
                  className="bg-black text-white px-6 py-2 font-bold uppercase tracking-wider text-sm brutal-border brutal-shadow-hover hover:bg-[#FF4444] transition-colors disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
