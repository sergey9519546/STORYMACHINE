import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { runSingleCritic, computeRoomConsensus, BUILTIN_CRITICS } from '../../server/critics/critics-engine.ts';

describe("Writers' Room & Multi-Agent Critique Infrastructure (Items 31–40)", () => {
  const sampleFountain = `
FADE IN:

EXT. CITY STREET - NIGHT

MARA (30s) walks briskly under flickering streetlights.

MARA
I am so angry at you right now for keeping that secret.

ELI (30s) follows behind, hedging his steps.

ELI
It was for your protection.
`;

  test('runSingleCritic executes single-critic mode on-demand', () => {
    const result = runSingleCritic(sampleFountain, 'dialogue');
    assert.equal(result.criticId, 'dialogue-doctor');
    assert.equal(typeof result.score, 'number');
    assert.ok(Array.isArray(result.suggestions));
  });

  test('computeRoomConsensus aggregates multi-critic evaluation', () => {
    const dialogue = runSingleCritic(sampleFountain, 'dialogue');
    const pacing = runSingleCritic(sampleFountain, 'pacing');
    const brevity = runSingleCritic(sampleFountain, 'brevity');

    const consensus = computeRoomConsensus([dialogue, pacing, brevity]);
    assert.equal(consensus.critics.length, 3);
    assert.ok(consensus.overallScore > 0);
    assert.ok(consensus.agreementRate >= 0);
    assert.ok(Array.isArray(consensus.debateTimeline));
  });
});
