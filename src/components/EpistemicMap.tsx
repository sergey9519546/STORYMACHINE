// Epistemic Map — Writer Cockpit: live SVG visualization of character belief
// states. Each character is a node; belief-edges connect them when one character
// holds a belief about another. Edge color encodes source (told vs witnessed)
// and opacity encodes confidence. A live window into the story's information
// asymmetry — who knows what, who's been deceived, where dramatic irony lives.

import React, { useState, useEffect, useCallback } from 'react';
import { Brain, RefreshCw, X } from 'lucide-react';

interface BeliefEdgeData {
  from_char: string;
  to_char: string;
  proposition: string;
  confidence: number;
  source: 'witnessed' | 'told' | 'inferred';
  belief_id: string;
}

interface CharacterState {
  char_id: string;
  name: string;
}

interface EpistemicMapProps {
  onClose: () => void;
}

// Stable positions in a circle layout
function circleLayout(count: number, cx: number, cy: number, r: number): Array<{ x: number; y: number }> {
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });
}

export default function EpistemicMap({ onClose }: EpistemicMapProps) {
  const [edges, setEdges] = useState<BeliefEdgeData[]>([]);
  const [agents, setAgents] = useState<CharacterState[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEdge, setSelectedEdge] = useState<BeliefEdgeData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [edgeRes, stateRes] = await Promise.all([
        fetch('/api/belief-edges'),
        fetch('/api/state'),
      ]);
      if (edgeRes.ok) setEdges(await edgeRes.json() as BeliefEdgeData[]);
      if (stateRes.ok) {
        const data = await stateRes.json() as { agents: CharacterState[] };
        setAgents(data.agents ?? []);
      }
    } catch { setErrorMsg('Failed to load epistemic data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const WIDTH = 520;
  const HEIGHT = 400;
  const CX = WIDTH / 2;
  const CY = HEIGHT / 2;
  const R = Math.min(CX, CY) - 55;

  const positions = circleLayout(agents.length, CX, CY, R);
  const posMap = new Map(agents.map((a, i) => [a.char_id, positions[i] ?? { x: CX, y: CY }]));

  const sourceColor = (src: string) => {
    if (src === 'witnessed') return '#34d399';
    if (src === 'told') return '#f87171';
    return '#93c5fd';
  };

  const agentInitials = (name: string) =>
    (name.match(/\S+/g) || []).map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-[#1a1a2e] border border-[#333] rounded-xl w-full max-w-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#333]">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-cyan-400" />
            <h2 className="text-white font-semibold text-lg">Epistemic Map</h2>
            <span className="text-xs text-gray-500 ml-2">who knows what</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              disabled={loading}
              className="text-gray-400 hover:text-white transition-colors disabled:opacity-40"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-5 py-2 border-b border-[#222] text-xs text-gray-400">
          <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded" style={{ background: '#34d399', display: 'inline-block' }} />witnessed</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded" style={{ background: '#f87171', display: 'inline-block' }} />told (may be false)</div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded" style={{ background: '#93c5fd', display: 'inline-block' }} />inferred</div>
          <div className="ml-auto text-gray-500">opacity = confidence</div>
        </div>

        {/* SVG graph */}
        {errorMsg ? (
          <p className="text-red-400 text-sm text-center py-10">{errorMsg}</p>
        ) : (
          <div className="p-4">
            <svg
              width={WIDTH}
              height={HEIGHT}
              className="w-full"
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            >
              <defs>
                {['witnessed', 'told', 'inferred'].map(src => (
                  <marker
                    key={src}
                    id={`arrow-${src}`}
                    viewBox="0 0 6 6"
                    refX="5"
                    refY="3"
                    markerWidth="4"
                    markerHeight="4"
                    orient="auto"
                  >
                    <path d="M0,0 L6,3 L0,6 z" fill={sourceColor(src)} />
                  </marker>
                ))}
              </defs>

              {/* Edges */}
              {edges.map((e, idx) => {
                const from = posMap.get(e.from_char);
                const to = posMap.get(e.to_char);
                if (!from || !to) return null;
                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const nx = dx / len;
                const ny = dy / len;
                const nodeR = 20;
                const x1 = from.x + nx * nodeR;
                const y1 = from.y + ny * nodeR;
                const x2 = to.x - nx * (nodeR + 4);
                const y2 = to.y - ny * (nodeR + 4);
                const color = sourceColor(e.source);
                const isSelected = selectedEdge?.belief_id === e.belief_id;
                return (
                  <g key={idx} onClick={() => setSelectedEdge(isSelected ? null : e)} className="cursor-pointer">
                    <line
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke={color}
                      strokeOpacity={isSelected ? 1 : e.confidence * 0.8 + 0.15}
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      markerEnd={`url(#arrow-${e.source})`}
                    />
                    {isSelected && (
                      <title>{e.proposition}</title>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {agents.map((a, i) => {
                const pos = positions[i];
                if (!pos) return null;
                return (
                  <g key={a.char_id}>
                    <circle
                      cx={pos.x} cy={pos.y} r={20}
                      fill="#1e3a5f" stroke="#3b82f6" strokeWidth={1.5}
                    />
                    <text
                      x={pos.x} y={pos.y}
                      textAnchor="middle" dominantBaseline="central"
                      className="text-xs font-bold fill-blue-200"
                      fontSize="11"
                      fill="#93c5fd"
                    >
                      {agentInitials(a.name)}
                    </text>
                    <text
                      x={pos.x}
                      y={pos.y + 30}
                      textAnchor="middle"
                      fontSize="9"
                      fill="#6b7280"
                    >
                      {a.name.indexOf(' ') !== -1 ? a.name.slice(0, a.name.indexOf(' ')) : a.name}
                    </text>
                  </g>
                );
              })}

              {agents.length === 0 && !loading && (
                <text x={CX} y={CY} textAnchor="middle" fill="#4b5563" fontSize="13">
                  No characters — start a simulation
                </text>
              )}
            </svg>
          </div>
        )}

        {/* Selected edge detail */}
        {selectedEdge && (
          <div className="border-t border-[#333] px-5 py-3">
            <div className="text-xs text-gray-400 mb-1">
              <span className="text-white font-medium">{selectedEdge.from_char}</span>
              {' believes about '}
              <span className="text-white font-medium">{selectedEdge.to_char}</span>
              {' · source: '}
              <span style={{ color: sourceColor(selectedEdge.source) }}>{selectedEdge.source}</span>
              {' · confidence: '}<span className="text-white">{(selectedEdge.confidence * 100).toFixed(0)}%</span>
            </div>
            <p className="text-gray-300 text-sm italic">"{selectedEdge.proposition}"</p>
          </div>
        )}

        {loading && (
          <div className="border-t border-[#333] px-5 py-3 text-center text-gray-500 text-xs">
            Loading belief graph…
          </div>
        )}
      </div>
    </div>
  );
}
