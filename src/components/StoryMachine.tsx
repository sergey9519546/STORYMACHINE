import React, { useState, useEffect, useRef } from "react";
import type {
  CharacterSheet,
  Location,
  ActionLogEntry,
} from "../../server/engine/types";

interface StoryMachineProps {
  onClose?: () => void;
}

export default function StoryMachine({ onClose }: StoryMachineProps) {
  const [agents, setAgents] = useState<CharacterSheet[]>([]);
  const [nodes, setNodes] = useState<Location[]>([]);
  const [ledger, setLedger] = useState<ActionLogEntry[]>([]);
  const ledgerEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchState();
    fetchLedger();
  }, []);

  const fetchState = async () => {
    const res = await fetch("/api/state");
    const data = await res.json();
    setAgents(data.agents);
    setNodes(data.nodes);
  };

  const fetchLedger = async () => {
    const res = await fetch("/api/ledger");
    const data = await res.json();
    setLedger(data);
  };

  useEffect(() => {
    ledgerEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ledger]);
  const handleInit = async () => {
    setLoading(true);
    const initialNodes: Location[] = [
      {
        location_id: "room_a",
        name: "The Study",
        description:
          "A dimly lit study with a large mahogany desk. Dust motes dance in the sliver of moonlight.",
        adjacent_locations: ["hallway"],
      },
      {
        location_id: "hallway",
        name: "Main Hallway",
        description:
          "A long, echoing hallway with portraits of stern ancestors.",
        adjacent_locations: ["room_a", "room_b"],
      },
      {
        location_id: "room_b",
        name: "The Conservatory",
        description:
          "A glass-walled room filled with overgrown, exotic plants. It smells of damp earth.",
        adjacent_locations: ["hallway"],
      },
    ];

    const initialAgents: CharacterSheet[] = [
      {
        char_id: "agent_1",
        name: "Detective Vance",
        public_mask:
          "A world-weary, cynical detective who speaks in short, clipped sentences.",
        hidden_motive:
          "Find the torn letter before anyone else does to protect a past mistake.",
        knowledge_vector: [
          "The victim was poisoned",
          "The study was the last known location",
        ],
        suspicion_score: 20,
        current_location_id: "room_a",
        is_alive: true,
      },
      {
        char_id: "agent_2",
        name: "Lady Eleanor",
        public_mask:
          "A grieving widow, elegant and softly spoken, prone to dramatic sighs.",
        hidden_motive:
          "Ensure Vance does not find the letter. Misdirect him to the Conservatory.",
        knowledge_vector: [
          "The letter is in the desk",
          "Vance is getting too close",
        ],
        suspicion_score: 10,
        current_location_id: "room_a",
        is_alive: true,
      },
    ];

    await fetch("/api/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodes: initialNodes, agents: initialAgents }),
    });

    await fetchState();
    await fetchLedger();
    setLoading(false);
  };

  const handleTurn = async (agentId: string) => {
    setLoading(true);
    await fetch("/api/turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId }),
    });
    await fetchState();
    await fetchLedger();
    setLoading(false);
  };

  const handleRunRoom = async (nodeId: string) => {
    setLoading(true);
    await fetch("/api/run-room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodeId }),
    });
    await fetchState();
    await fetchLedger();
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f4f4f0] text-black p-8 font-sans">
      <header className="mb-8 border-b-4 border-black pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-widest text-black">
            Story Machine
          </h1>
          <p className="text-gray-600 text-sm mt-1 font-mono uppercase">
            OASIS Architecture Prototype
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="bg-white text-black px-4 py-2 font-bold uppercase tracking-wider brutal-border brutal-shadow-hover hover:bg-gray-100 transition-colors"
          >
            Back to IDE
          </button>
          <button
            onClick={handleInit}
            disabled={loading}
            className="bg-[#FF4444] hover:bg-black text-white px-4 py-2 font-bold uppercase tracking-wider disabled:opacity-50 brutal-border brutal-shadow-hover transition-colors"
          >
            Initialize Scenario
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Agents & Nodes */}
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-bold mb-4 uppercase text-black border-b-2 border-black pb-2">
              The Stage
            </h2>
            <div className="space-y-4">
              {nodes.map((node) => (
                <div
                  key={node.location_id}
                  className="bg-white p-4 brutal-border-thick brutal-shadow"
                >
                  <h3 className="font-bold text-lg text-black uppercase tracking-wider">
                    {node.name}
                  </h3>
                  <p className="text-sm text-gray-700 mt-2 font-mono">
                    {node.description}
                  </p>
                  <div className="mt-4 text-xs text-gray-500 font-mono uppercase border-t-2 border-dashed border-gray-300 pt-2">
                    Connected: {node.adjacent_locations.join(", ")}
                  </div>
                  <button
                    onClick={() => handleRunRoom(node.location_id)}
                    disabled={loading}
                    className="mt-4 w-full bg-black hover:bg-[#FF4444] text-white py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50 brutal-border transition-colors"
                  >
                    Run Dialogue Lock (5 Turns)
                  </button>
                </div>
              ))}
              {nodes.length === 0 && (
                <p className="text-gray-500 italic font-mono text-sm">
                  No nodes initialized.
                </p>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold mb-4 uppercase text-black border-b-2 border-black pb-2">
              Agents
            </h2>
            <div className="space-y-4">
              {agents.map((agent) => (
                <div
                  key={agent.char_id}
                  className="bg-white p-4 brutal-border-thick brutal-shadow"
                >
                  <div className="flex justify-between items-start border-b-2 border-black pb-2 mb-2">
                    <h3 className="font-bold text-lg text-black uppercase tracking-wider">
                      {agent.name}
                    </h3>
                    <span className="text-[10px] bg-black text-white px-2 py-1 uppercase font-bold tracking-widest">
                      Loc:{" "}
                      {nodes.find(
                        (n) => n.location_id === agent.current_location_id,
                      )?.name || agent.current_location_id}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2 text-xs font-mono">
                    <p>
                      <span className="font-bold uppercase text-black">
                        Mask:
                      </span>{" "}
                      {agent.public_mask}
                    </p>
                    <p>
                      <span className="font-bold uppercase text-black">
                        Shadow:
                      </span>{" "}
                      {agent.hidden_motive}
                    </p>
                    <p>
                      <span className="font-bold uppercase text-black">
                        Suspicion:
                      </span>{" "}
                      <span
                        className={
                          agent.suspicion_score > 50
                            ? "text-[#FF4444] font-bold"
                            : "text-black"
                        }
                      >
                        {agent.suspicion_score}/100
                      </span>
                    </p>
                    <div className="border-t-2 border-dashed border-gray-300 pt-2 mt-2">
                      <span className="font-bold uppercase text-black">
                        Knowledge:
                      </span>
                      <ul className="list-disc list-inside pl-2 mt-1 text-gray-700">
                        {agent.knowledge_vector.map((k, i) => (
                          <li key={i}>{k}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTurn(agent.char_id)}
                    disabled={loading}
                    className="mt-4 w-full bg-white text-black hover:bg-black hover:text-white py-2 text-xs font-bold uppercase tracking-wider disabled:opacity-50 brutal-border transition-colors"
                  >
                    Force Turn
                  </button>
                </div>
              ))}
              {agents.length === 0 && (
                <p className="text-gray-500 italic font-mono text-sm">
                  No agents initialized.
                </p>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Script Ledger */}
        <div className="lg:col-span-2">
          <section className="h-full flex flex-col">
            <h2 className="text-xl font-bold mb-4 uppercase text-black border-b-2 border-black pb-2">
              Script Ledger
            </h2>
            <div className="flex-1 bg-white brutal-border-thick brutal-shadow p-6 overflow-y-auto font-mono text-sm space-y-6 min-h-[600px]">
              {ledger.map((entry) => {
                const agent = agents.find((a) => a.char_id === entry.char_id);
                const node = nodes.find(
                  (n) => n.location_id === entry.location_id,
                );
                return (
                  <div
                    key={entry.action_id}
                    className="border-l-4 border-black pl-4 py-2 bg-gray-50"
                  >
                    <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-widest font-bold">
                      [{new Date(entry.timestamp).toLocaleTimeString()}] @{" "}
                      {node?.name || entry.location_id}
                    </div>
                    <div className="flex items-start gap-2 mb-2">
                      <span className="font-bold text-black uppercase">
                        {agent?.name || entry.char_id}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 bg-black text-white uppercase font-bold tracking-widest">
                        {entry.action_type}
                      </span>
                      {entry.target_char_id &&
                        entry.action_type === "RELOCATE" && (
                          <span className="text-blue-600 font-bold uppercase text-xs mt-0.5">
                            →{" "}
                            {nodes.find(
                              (n) => n.location_id === entry.target_char_id,
                            )?.name || entry.target_char_id}
                          </span>
                        )}
                      {entry.target_char_id &&
                        entry.action_type === "SPEAK" && (
                          <span className="text-[#FF4444] font-bold uppercase text-xs mt-0.5">
                            to{" "}
                            {agents.find(
                              (a) => a.char_id === entry.target_char_id,
                            )?.name || entry.target_char_id}
                          </span>
                        )}
                    </div>
                    <div className="text-black whitespace-pre-wrap leading-relaxed">
                      {entry.content}
                    </div>
                  </div>
                );
              })}
              {ledger.length === 0 && (
                <p className="text-gray-500 italic">The stage is silent...</p>
              )}
              <div ref={ledgerEndRef} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
