# Story Graph Ops — Movies Guide Mapping

This is STORYMACHINE’s version of Neo4j’s **Movies graph** tutorial, taught on the
**in-memory Story Graph** (no Neo4j dependency — graph DBs are deferred at launch).

Module: `server/nvm/analyze/story-graph-ops.ts`  
Tests: `tests/core/story-graph-ops.test.ts`

## What you will learn

| Movies guide step | Story Graph op |
|---|---|
| Create nodes and relationships | `createNode`, `createRelationship` |
| Conditional matches | `matchNodes({ type, labelContains, … })` |
| Pattern matches | `matchPatterns({ edgeType, sourceType, … })` |
| Bacon / shortest path | `shortestPath(g, fromId, toId)` |
| Recommendation query | `recommend(g, seedId)` |
| Delete all data | `clearGraph()` |

## Domain mapping

| Movies | Story Machine |
|---|---|
| `Movie` | `scene` node |
| `Person` | `character` node |
| `ACTED_IN` | `character-arc` edge |
| Directed / produced | `causal` / `promise-link` edges |
| Kevin Bacon path | shortest path between character nodes |
| “Also starred with” | shared-neighbor `recommend` |

## 10-minute walkthrough

```ts
import {
  seedTutorialGraph,
  matchNodes,
  matchPatterns,
  shortestPath,
  recommend,
  clearGraph,
} from '../server/nvm/analyze/story-graph-ops.ts';

// 1. Seed a tiny tutorial graph (CREATE …)
const g = seedTutorialGraph();

// 2. Conditional MATCH
matchNodes(g, { type: 'character' });
matchNodes(g, { labelContains: 'DINER' });

// 3. Pattern MATCH (a)-[:character-arc]->(b)
matchPatterns(g, {
  sourceType: 'character',
  targetType: 'scene',
  edgeType: 'character-arc',
});

// 4. Bacon path
shortestPath(g, 'character-maya', 'character-vince');

// 5. Recommendation
recommend(g, 'character-vince', { limit: 3 });

// 6. DELETE ALL
clearGraph(g);
```

## Using a real doctor graph

```ts
import { analyzeFountainText } from '../server/nvm/analyze/fountain-analyzer.ts';
import { buildStoryGraph } from '../server/nvm/analyze/story-graph.ts';
import { fromStoryGraph, shortestPath } from '../server/nvm/analyze/story-graph-ops.ts';

const analysis = analyzeFountainText(fountain);
const storyGraph = buildStoryGraph(analysis);
const g = fromStoryGraph(storyGraph);
shortestPath(g, 'scene-0', 'scene-5');
```

## Why not Neo4j?

Project research intake defers graph databases at launch. JSON/in-memory graphs
win below a measured complexity threshold. This module teaches the same Cypher
*ideas* against the production story graph without adding a new operational dependency.
