import React, { useState } from "react";
import { motion } from "motion/react";
import type { CharacterSheet, Location, AttachmentStyle } from "../../../server/engine/types";
import { X, Plus, Trash2, Play, Sparkles, MapPin, User } from "lucide-react";

// ── Scenario Builder ──────────────────────────────────────────────────────────
// A modal for defining custom locations and agents, replacing the hardcoded
// Vance/Eleanor scenario. The hardcoded scenario remains available as a one-click
// "Load Example" preset.

interface BuilderLocation {
  name: string;
  description: string;
  adjacency: string; // comma-separated location names
}

interface BuilderAgent {
  name: string;
  public_mask: string;
  hidden_motive: string;
  knowledge: string; // newline-separated facts
  startLocationIdx: number;
  machiavellianism: number;
  narcissism: number;
  psychopathy: number;
  attachmentStyle: AttachmentStyle;
}

const blankLocation = (): BuilderLocation => ({ name: "", description: "", adjacency: "" });
const blankAgent = (): BuilderAgent => ({
  name: "", public_mask: "", hidden_motive: "", knowledge: "",
  startLocationIdx: 0, machiavellianism: 50, narcissism: 50, psychopathy: 50,
  attachmentStyle: "secure",
});

interface ScenarioBuilderProps {
  onSubmit: (payload: { nodes: Location[]; agents: CharacterSheet[] }) => void;
  onLoadExample: () => void;
  onClose: () => void;
  busy: boolean;
}

const inputClass =
  "w-full bg-white border-2 border-black px-3 py-2 text-black focus:outline-none focus:border-[#FF4444] font-mono text-xs";
const labelClass = "text-gray-500 text-[10px] uppercase font-bold tracking-widest block mb-1";

export default function ScenarioBuilder({ onSubmit, onLoadExample, onClose, busy }: ScenarioBuilderProps) {
  const [locations, setLocations] = useState<BuilderLocation[]>([
    { name: "The Study", description: "A dimly lit study with a heavy desk.", adjacency: "" },
  ]);
  const [agents, setAgents] = useState<BuilderAgent[]>([blankAgent(), blankAgent()]);
  const [error, setError] = useState<string | null>(null);

  // ── Location mutators ──
  const addLocation = () => setLocations(prev => [...prev, blankLocation()]);
  const removeLocation = (idx: number) => {
    setLocations(prev => prev.filter((_, i) => i !== idx));
    // Keep agent start-location references valid after a removal.
    setAgents(prev => prev.map(a => ({
      ...a,
      startLocationIdx: a.startLocationIdx > idx ? a.startLocationIdx - 1
        : a.startLocationIdx === idx ? 0 : a.startLocationIdx,
    })));
  };
  const updateLocation = (idx: number, field: keyof BuilderLocation, value: string) =>
    setLocations(prev => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));

  // ── Agent mutators ──
  const addAgent = () => setAgents(prev => [...prev, blankAgent()]);
  const removeAgent = (idx: number) => setAgents(prev => prev.filter((_, i) => i !== idx));
  const updateAgent = (idx: number, field: keyof BuilderAgent, value: string | number) =>
    setAgents(prev => prev.map((a, i) => (i === idx ? { ...a, [field]: value } : a)));

  // ── Submit ──
  const handleSubmit = () => {
    if (locations.length === 0) { setError("Add at least one location."); return; }
    if (locations.some(l => !l.name.trim())) { setError("Every location needs a name (or remove the empty row)."); return; }
    const namedAgents = agents.filter(a => a.name.trim() && a.public_mask.trim() && a.hidden_motive.trim());
    if (namedAgents.length < 2) {
      setError("Add at least two agents, each with a name, public mask, and hidden motive.");
      return;
    }

    const nameToIdx = new Map(locations.map((l, i) => [l.name.trim().toLowerCase(), i]));
    const nodes: Location[] = locations.map((l, i) => ({
      location_id: `loc_${i}`,
      name: l.name.trim(),
      description: l.description.trim() || "An unremarkable space.",
      adjacent_locations: l.adjacency
        .split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
        .map(n => nameToIdx.get(n))
        .filter((idx): idx is number => idx !== undefined && idx !== i)
        .map(idx => `loc_${idx}`),
    }));

    const builtAgents: CharacterSheet[] = namedAgents.map((a, i) => ({
      char_id: `agent_${i}`,
      name: a.name.trim(),
      public_mask: a.public_mask.trim(),
      hidden_motive: a.hidden_motive.trim(),
      knowledge_vector: a.knowledge.split("\n").map(s => s.trim()).filter(Boolean),
      suspicion_score: 10,
      current_location_id: `loc_${Math.min(Math.max(0, a.startLocationIdx), locations.length - 1)}`,
      is_alive: true,
      darkTriad: {
        machiavellianism: a.machiavellianism,
        narcissism: a.narcissism,
        psychopathy: a.psychopathy,
      },
      attachmentStyle: a.attachmentStyle,
    }));

    setError(null);
    onSubmit({ nodes, agents: builtAgents });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-[#f4f4f0] brutal-border-thick brutal-shadow w-full max-w-3xl max-h-[90vh] overflow-y-auto p-8 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b-4 border-black">
          <Sparkles className="w-6 h-6 shrink-0" />
          <h2 className="text-2xl font-bold uppercase tracking-widest flex-1">Scenario Builder</h2>
          <button
            onClick={onLoadExample}
            disabled={busy}
            className="text-[10px] px-3 py-2 bg-white text-black brutal-border hover:bg-black hover:text-white transition-colors uppercase font-bold tracking-widest disabled:opacity-40"
          >
            Load Example
          </button>
          <button
            onClick={onClose}
            aria-label="Close scenario builder"
            className="p-2 brutal-border hover:bg-black hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Locations ── */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4" />
            <h3 className="font-bold uppercase tracking-widest text-sm flex-1">Locations</h3>
            <button
              onClick={addLocation}
              className="text-[10px] px-2 py-1 bg-black text-white brutal-border hover:bg-[#FF4444] transition-colors uppercase font-bold tracking-widest flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <div className="space-y-3">
            {locations.map((loc, idx) => (
              <div key={idx} className="bg-white brutal-border p-3 space-y-2 relative">
                {locations.length > 1 && (
                  <button
                    onClick={() => removeLocation(idx)}
                    aria-label={`Remove location ${idx + 1}`}
                    className="absolute top-2 right-2 text-gray-400 hover:text-[#FF4444] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <div className="grid grid-cols-2 gap-2 pr-6">
                  <div>
                    <label className={labelClass}>Name</label>
                    <input
                      value={loc.name}
                      onChange={(e) => updateLocation(idx, "name", e.target.value)}
                      placeholder="The Study"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Connected to (location names, comma-separated)</label>
                    <input
                      value={loc.adjacency}
                      onChange={(e) => updateLocation(idx, "adjacency", e.target.value)}
                      placeholder="Main Hallway, Conservatory"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Description</label>
                  <input
                    value={loc.description}
                    onChange={(e) => updateLocation(idx, "description", e.target.value)}
                    placeholder="A dimly lit study with a heavy mahogany desk."
                    className={inputClass}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Agents ── */}
        <section className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4" />
            <h3 className="font-bold uppercase tracking-widest text-sm flex-1">Agents</h3>
            <button
              onClick={addAgent}
              className="text-[10px] px-2 py-1 bg-black text-white brutal-border hover:bg-[#FF4444] transition-colors uppercase font-bold tracking-widest flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          </div>
          <div className="space-y-4">
            {agents.map((agent, idx) => (
              <div key={idx} className="bg-white brutal-border p-3 space-y-2 relative">
                {agents.length > 2 && (
                  <button
                    onClick={() => removeAgent(idx)}
                    aria-label={`Remove agent ${idx + 1}`}
                    className="absolute top-2 right-2 text-gray-400 hover:text-[#FF4444] transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <div className="grid grid-cols-2 gap-2 pr-6">
                  <div>
                    <label className={labelClass}>Name</label>
                    <input
                      value={agent.name}
                      onChange={(e) => updateAgent(idx, "name", e.target.value)}
                      placeholder="Detective Vance"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Starting Location</label>
                    <select
                      value={Math.min(agent.startLocationIdx, locations.length - 1)}
                      onChange={(e) => updateAgent(idx, "startLocationIdx", Number(e.target.value))}
                      className={inputClass}
                    >
                      {locations.map((l, i) => (
                        <option key={i} value={i}>{l.name.trim() || `Location ${i + 1}`}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Public Mask (the persona others see)</label>
                  <textarea
                    value={agent.public_mask}
                    onChange={(e) => updateAgent(idx, "public_mask", e.target.value)}
                    placeholder="A world-weary, cynical detective who speaks in clipped sentences."
                    rows={2}
                    className={`${inputClass} resize-y`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Hidden Motive (the secret goal driving every action)</label>
                  <textarea
                    value={agent.hidden_motive}
                    onChange={(e) => updateAgent(idx, "hidden_motive", e.target.value)}
                    placeholder="Find the torn letter before anyone else to bury a past mistake."
                    rows={2}
                    className={`${inputClass} resize-y`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Starting Knowledge (one fact per line)</label>
                  <textarea
                    value={agent.knowledge}
                    onChange={(e) => updateAgent(idx, "knowledge", e.target.value)}
                    placeholder={"The victim was poisoned\nThe study was the last known location"}
                    rows={2}
                    className={`${inputClass} resize-y`}
                  />
                </div>
                {/* Dark Triad sliders */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {([
                    ["machiavellianism", "Machiavellianism"],
                    ["narcissism", "Narcissism"],
                    ["psychopathy", "Psychopathy"],
                  ] as const).map(([field, label]) => (
                    <div key={field}>
                      <label className={labelClass}>{label}: {agent[field]}</label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={agent[field]}
                        onChange={(e) => updateAgent(idx, field, Number(e.target.value))}
                        className="w-full accent-[#FF4444]"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <label className={labelClass}>Attachment Style</label>
                  <select
                    value={agent.attachmentStyle}
                    onChange={(e) => updateAgent(idx, "attachmentStyle", e.target.value)}
                    className={inputClass}
                  >
                    <option value="secure">Secure</option>
                    <option value="anxious">Anxious</option>
                    <option value="avoidant">Avoidant</option>
                    <option value="anxious_avoidant">Anxious-Avoidant</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <div className="mb-4 px-3 py-2 bg-[#FF4444] text-white text-xs font-bold uppercase tracking-widest">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={busy}
          className="w-full py-3 bg-black text-white brutal-border-thick hover:bg-[#FF4444] transition-colors uppercase font-bold tracking-widest text-sm brutal-shadow-hover disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <Play className="w-4 h-4" />
          {busy ? "Initializing…" : "Start Custom Scenario"}
        </button>
      </motion.div>
    </motion.div>
  );
}
