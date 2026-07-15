// Movies-guide style graph ops on the in-memory Story Graph (no Neo4j).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  clearGraph,
  createEmptyGraph,
  createNode,
  createRelationship,
  matchNodes,
  matchPatterns,
  recommend,
  seedTutorialGraph,
  shortestPath,
  fromStoryGraph,
} from '../../server/nvm/analyze/story-graph-ops.ts';
import { buildStoryGraph } from '../../server/nvm/analyze/story-graph.ts';
import type { FountainAnalysis } from '../../server/nvm/analyze/types.ts';
import type { ScreenplaySceneRecord } from '../../server/nvm/screenplay/memory.ts';

function emptyRecord(sceneIdx: number, slug: string, overrides: Partial<ScreenplaySceneRecord> = {}): ScreenplaySceneRecord {
  return {
    commitId: `c${sceneIdx}`,
    sceneIdx,
    slug,
    purpose: 'complicate',
    dramaticTurn: 'nothing',
    revelation: null,
    emotionalShift: 'neutral',
    visualBeats: [],
    dialogueHighlights: [],
    unresolvedClues: [],
    seededClueIds: [],
    payoffSetupIds: [],
    clockRaised: false,
    clockDelta: 0,
    suspenseDelta: 1,
    curiosityDelta: 0,
    relationshipShifts: [],
    createdAt: sceneIdx,
    ...overrides,
  };
}

describe('Story Graph Ops — Movies guide mapping', () => {
  it('CREATE nodes and relationships', () => {
    let g = createEmptyGraph();
    g = createNode(g, {
      id: 'scene-0', type: 'scene', sceneIdx: 0, label: 'INT. A - DAY',
      metadata: { slug: 'INT. A - DAY' },
    });
    g = createNode(g, {
      id: 'character-maya', type: 'character', label: 'Maya',
      metadata: { characterName: 'Maya' },
    });
    g = createRelationship(g, 'character-maya', 'scene-0', 'character-arc', 0.9);
    assert.equal(g.nodes.length, 2);
    assert.equal(g.edges.length, 1);
    assert.throws(() => createNode(g, g.nodes[0]), /already exists/);
  });

  it('MATCH nodes with conditions', () => {
    const g = seedTutorialGraph();
    const scenes = matchNodes(g, { type: 'scene' });
    assert.equal(scenes.length, 3);
    const maya = matchNodes(g, { characterName: 'Maya' });
    assert.equal(maya.length, 1);
    assert.equal(maya[0].id, 'character-maya');
    const diner = matchNodes(g, { labelContains: 'DINER' });
    assert.equal(diner.length, 1);
  });

  it('MATCH patterns (a)-[:TYPE]->(b)', () => {
    const g = seedTutorialGraph();
    const actedIn = matchPatterns(g, {
      sourceType: 'character',
      targetType: 'scene',
      edgeType: 'character-arc',
    });
    assert.ok(actedIn.length >= 5, `expected several character→scene links, got ${actedIn.length}`);
    const causal = matchPatterns(g, { edgeType: 'causal' });
    assert.equal(causal.length, 1);
    assert.equal(causal[0].source.id, 'promise-setup-key');
    assert.equal(causal[0].target.id, 'promise-payoff-key');
  });

  it('shortest path (Bacon path analogue) between two characters', () => {
    const g = seedTutorialGraph();
    // Maya and Vince co-act via Cole / shared scenes
    const path = shortestPath(g, 'character-maya', 'character-vince');
    assert.equal(path.found, true);
    assert.ok(path.length >= 1);
    assert.equal(path.path[0], 'character-maya');
    assert.equal(path.path[path.path.length - 1], 'character-vince');
  });

  it('shortest path along promise/causal chain', () => {
    const g = seedTutorialGraph();
    const path = shortestPath(g, 'scene-0', 'scene-2', {
      directed: true,
      edgeTypes: ['promise-link', 'causal'],
    });
    assert.equal(path.found, true);
    assert.deepEqual(path.path, [
      'scene-0',
      'promise-setup-key',
      'promise-payoff-key',
      'scene-2',
    ]);
  });

  it('recommend nodes by shared neighbors', () => {
    const g = seedTutorialGraph();
    // Vince and Maya both connect into scene-2; recommendations for Vince
    // should surface people/scenes in Cole/Maya neighborhood.
    const recs = recommend(g, 'character-vince', { limit: 5 });
    assert.ok(recs.length > 0, 'should recommend at least one node');
    assert.ok(recs.every(r => r.score > 0));
    assert.ok(recs.every(r => r.node.id !== 'character-vince'));
    // Sorted by score desc
    for (let i = 1; i < recs.length; i++) {
      assert.ok(recs[i - 1].score >= recs[i].score);
    }
  });

  it('DELETE ALL clears the graph', () => {
    const g = seedTutorialGraph();
    assert.ok(g.nodes.length > 0);
    const empty = clearGraph(g);
    assert.equal(empty.nodes.length, 0);
    assert.equal(empty.edges.length, 0);
  });

  it('fromStoryGraph adapts doctor-built graphs into ops API', () => {
    const records = [
      emptyRecord(0, 'INT. A - DAY', { seededClueIds: ['clue-1'] }),
      emptyRecord(1, 'INT. B - DAY'),
      emptyRecord(2, 'INT. C - DAY', { payoffSetupIds: ['clue-1'] }),
    ];
    const analysis = {
      records,
      annotations: [],
      structure: {
        actPosition: 'act2a',
        completionPercent: 50,
        avgSuspensePerScene: 1,
        escalating: true,
        reversalCount: 0,
        reversalDensity: 0,
        approachingClimax: false,
        openClues: 0,
        revelationCount: 0,
        midpointPressure: 0,
        totalClockPressure: 0,
        tightestScene: null,
      },
      characters: [],
      sceneCount: 3,
      dialogueLineCount: 0,
      actionLineCount: 0,
      wordCount: 50,
    } as FountainAnalysis;

    const built = buildStoryGraph(analysis);
    const g = fromStoryGraph(built);
    assert.ok(g.nodes.some(n => n.type === 'scene'));
    const scenes = matchNodes(g, { type: 'scene' });
    assert.equal(scenes.length, 3);
    const path = shortestPath(g, 'scene-0', 'scene-2');
    assert.equal(path.found, true);
  });
});
