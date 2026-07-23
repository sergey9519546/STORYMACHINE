// Story Graph Ops — Movies-guide style Cypher patterns on the in-memory Story Graph.
//
// Maps Neo4j's Movies tutorial operations onto STORYMACHINE's narrative graph
// without a graph database (NORTH_STAR / research intake: defer Neo4j at launch).
//
// Movies guide  →  Story Machine
// ─────────────────────────────────────────────────
// Movie/Person  →  scene / character / promise nodes
// ACTED_IN      →  character-arc / promise-link edges
// DIRECTED      →  causal edges (setup → payoff)
// Bacon path    →  shortest path between two nodes
// Recommend     →  shared-neighbor recommendation
// DELETE ALL    →  clearGraph()
//
// Pure functions only — no I/O, no Neo4j driver, no Math.random.

import type { StoryGraph, StoryGraphNode, StoryGraphEdge } from './story-graph.ts';

// ── Mutable working graph (tutorial-style create/delete) ─────────────────────

export interface MutableStoryGraph {
  nodes: StoryGraphNode[];
  edges: StoryGraphEdge[];
}

export function createEmptyGraph(): MutableStoryGraph {
  return { nodes: [], edges: [] };
}

export function fromStoryGraph(graph: StoryGraph): MutableStoryGraph {
  return {
    nodes: graph.nodes.map(n => ({ ...n, metadata: { ...n.metadata } })),
    edges: graph.edges.map(e => ({ ...e, metadata: e.metadata ? { ...e.metadata } : undefined })),
  };
}

/** CREATE (n:Type {id, label, ...}) */
export function createNode(
  g: MutableStoryGraph,
  node: StoryGraphNode,
): MutableStoryGraph {
  if (g.nodes.some(n => n.id === node.id)) {
    throw new Error(`Node already exists: ${node.id}`);
  }
  return { nodes: [...g.nodes, node], edges: g.edges };
}

/** CREATE (a)-[:TYPE {weight}]->(b) */
export function createRelationship(
  g: MutableStoryGraph,
  source: string,
  target: string,
  type: StoryGraphEdge['type'],
  weight = 1.0,
  metadata?: StoryGraphEdge['metadata'],
): MutableStoryGraph {
  if (!g.nodes.some(n => n.id === source)) throw new Error(`Missing source node: ${source}`);
  if (!g.nodes.some(n => n.id === target)) throw new Error(`Missing target node: ${target}`);
  return {
    nodes: g.nodes,
    edges: [...g.edges, { source, target, type, weight, metadata }],
  };
}

/** MATCH (n) WHERE n.id = $id / n.type = $type / n.label CONTAINS $q */
export function matchNodes(
  g: MutableStoryGraph,
  where: {
    id?: string;
    type?: StoryGraphNode['type'];
    labelContains?: string;
    sceneIdx?: number;
    characterName?: string;
  } = {},
): StoryGraphNode[] {
  return g.nodes.filter(n => {
    if (where.id !== undefined && n.id !== where.id) return false;
    if (where.type !== undefined && n.type !== where.type) return false;
    if (where.sceneIdx !== undefined && n.sceneIdx !== where.sceneIdx) return false;
    if (where.characterName !== undefined && n.metadata.characterName !== where.characterName) return false;
    if (where.labelContains !== undefined) {
      const q = where.labelContains.toLowerCase();
      if (!n.label.toLowerCase().includes(q) && !n.id.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

/** MATCH (a)-[r:TYPE]->(b) pattern finder */
export function matchPatterns(
  g: MutableStoryGraph,
  pattern: {
    sourceType?: StoryGraphNode['type'];
    targetType?: StoryGraphNode['type'];
    edgeType?: StoryGraphEdge['type'];
    sourceId?: string;
    targetId?: string;
  } = {},
): Array<{ source: StoryGraphNode; edge: StoryGraphEdge; target: StoryGraphNode }> {
  const byId = new Map(g.nodes.map(n => [n.id, n]));
  const out: Array<{ source: StoryGraphNode; edge: StoryGraphEdge; target: StoryGraphNode }> = [];
  for (const edge of g.edges) {
    if (pattern.edgeType && edge.type !== pattern.edgeType) continue;
    if (pattern.sourceId && edge.source !== pattern.sourceId) continue;
    if (pattern.targetId && edge.target !== pattern.targetId) continue;
    const source = byId.get(edge.source);
    const target = byId.get(edge.target);
    if (!source || !target) continue;
    if (pattern.sourceType && source.type !== pattern.sourceType) continue;
    if (pattern.targetType && target.type !== pattern.targetType) continue;
    out.push({ source, edge, target });
  }
  return out;
}

export interface ShortestPathResult {
  found: boolean;
  path: string[];          // node ids
  length: number;          // hop count
  edges: StoryGraphEdge[]; // edges along the path
}

/**
 * Shortest path (BFS) — the "Bacon path" of the Movies guide.
 * Undirected by default so character co-presence works either way.
 */
export function shortestPath(
  g: MutableStoryGraph,
  fromId: string,
  toId: string,
  opts: { directed?: boolean; edgeTypes?: StoryGraphEdge['type'][] } = {},
): ShortestPathResult {
  if (fromId === toId) {
    return { found: true, path: [fromId], length: 0, edges: [] };
  }
  if (!g.nodes.some(n => n.id === fromId) || !g.nodes.some(n => n.id === toId)) {
    return { found: false, path: [], length: -1, edges: [] };
  }

  const adj = new Map<string, Array<{ to: string; edge: StoryGraphEdge }>>();
  const add = (a: string, b: string, edge: StoryGraphEdge) => {
    if (!adj.has(a)) adj.set(a, []);
    adj.get(a)!.push({ to: b, edge });
  };
  for (const edge of g.edges) {
    if (opts.edgeTypes && !opts.edgeTypes.includes(edge.type)) continue;
    add(edge.source, edge.target, edge);
    if (!opts.directed) add(edge.target, edge.source, edge);
  }

  const prev = new Map<string, { from: string; edge: StoryGraphEdge }>();
  const q: string[] = [fromId];
  const seen = new Set<string>([fromId]);
  while (q.length) {
    const cur = q.shift()!;
    for (const { to, edge } of adj.get(cur) ?? []) {
      if (seen.has(to)) continue;
      seen.add(to);
      prev.set(to, { from: cur, edge });
      if (to === toId) {
        // reconstruct
        const path: string[] = [toId];
        const edges: StoryGraphEdge[] = [];
        let walk = toId;
        while (walk !== fromId) {
          const step = prev.get(walk)!;
          edges.unshift(step.edge);
          path.unshift(step.from);
          walk = step.from;
        }
        return { found: true, path, length: edges.length, edges };
      }
      q.push(to);
    }
  }
  return { found: false, path: [], length: -1, edges: [] };
}

export interface Recommendation {
  node: StoryGraphNode;
  score: number;
  reason: string;
  sharedNeighbors: string[];
}

/**
 * Basic recommendation query (Movies guide "people who acted with X also acted with Y").
 * For a seed node, rank other nodes by shared neighbors (collaborative filtering).
 */
export function recommend(
  g: MutableStoryGraph,
  seedId: string,
  opts: { limit?: number; nodeType?: StoryGraphNode['type'] } = {},
): Recommendation[] {
  const limit = opts.limit ?? 5;
  const byId = new Map(g.nodes.map(n => [n.id, n]));
  if (!byId.has(seedId)) return [];

  const neighbors = (id: string): Set<string> => {
    const s = new Set<string>();
    for (const e of g.edges) {
      if (e.source === id) s.add(e.target);
      if (e.target === id) s.add(e.source);
    }
    return s;
  };

  const seedNeighbors = neighbors(seedId);
  const scores: Recommendation[] = [];

  for (const node of g.nodes) {
    if (node.id === seedId) continue;
    if (opts.nodeType && node.type !== opts.nodeType) continue;
    if (seedNeighbors.has(node.id)) continue; // already connected — not a "new" rec
    const theirs = neighbors(node.id);
    const shared: string[] = [];
    for (const n of seedNeighbors) {
      if (theirs.has(n)) shared.push(n);
    }
    if (shared.length === 0) continue;
    scores.push({
      node,
      score: shared.length,
      reason: `Shares ${shared.length} connection(s) with ${seedId}`,
      sharedNeighbors: shared,
    });
  }

  scores.sort((a, b) => b.score - a.score || a.node.id.localeCompare(b.node.id));
  return scores.slice(0, limit);
}

/** MATCH (n) DETACH DELETE n  — clear the working graph */
export function clearGraph(_g?: MutableStoryGraph): MutableStoryGraph {
  return createEmptyGraph();
}

/**
 * Tutorial seed: a mini "movies-style" narrative graph used for teaching ops.
 * Characters co-appear in scenes; promises link setup→payoff (like acted_in / directed).
 */
export function seedTutorialGraph(): MutableStoryGraph {
  let g = createEmptyGraph();
  const scene = (i: number, label: string): StoryGraphNode => ({
    id: `scene-${i}`,
    type: 'scene',
    sceneIdx: i,
    label,
    metadata: { slug: label, purpose: i === 0 ? 'establish_world' : i === 2 ? 'climax' : 'complicate' },
  });
  const character = (name: string): StoryGraphNode => ({
    id: `character-${name.toLowerCase()}`,
    type: 'character',
    label: name,
    metadata: { characterName: name },
  });

  for (const n of [
    scene(0, 'INT. DINER - DAY'),
    scene(1, 'EXT. ALLEY - NIGHT'),
    scene(2, 'INT. WAREHOUSE - NIGHT'),
    character('Maya'),
    character('Cole'),
    character('Vince'),
    {
      id: 'promise-setup-key',
      type: 'promise' as const,
      label: 'Setup: key',
      metadata: { promiseType: 'setup' as const, clueId: 'key' },
    },
    {
      id: 'promise-payoff-key',
      type: 'promise' as const,
      label: 'Payoff: key',
      metadata: { promiseType: 'payoff' as const, clueId: 'key' },
    },
  ]) {
    g = createNode(g, n);
  }

  // Temporal spine (scene order)
  g = createRelationship(g, 'scene-0', 'scene-1', 'temporal', 0.5);
  g = createRelationship(g, 'scene-1', 'scene-2', 'temporal', 0.5);

  // Characters "act in" scenes (Movies: ACTED_IN)
  g = createRelationship(g, 'character-maya', 'scene-0', 'character-arc', 0.8);
  g = createRelationship(g, 'character-cole', 'scene-0', 'character-arc', 0.8);
  g = createRelationship(g, 'character-cole', 'scene-1', 'character-arc', 0.9);
  g = createRelationship(g, 'character-vince', 'scene-1', 'character-arc', 0.7);
  g = createRelationship(g, 'character-maya', 'scene-2', 'character-arc', 1.0);
  g = createRelationship(g, 'character-cole', 'scene-2', 'character-arc', 1.0);
  g = createRelationship(g, 'character-vince', 'scene-2', 'character-arc', 0.6);

  // Promise path (Movies: DIRECTED / produced)
  g = createRelationship(g, 'scene-0', 'promise-setup-key', 'promise-link', 1.0);
  g = createRelationship(g, 'promise-setup-key', 'promise-payoff-key', 'causal', 1.0, { distance: 2 });
  g = createRelationship(g, 'promise-payoff-key', 'scene-2', 'promise-link', 1.0);

  return g;
}
