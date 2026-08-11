// Belief contradiction detection in arc-tracker — the first genuinely new
// epistamic signal beyond clue payoff tracking. A character who holds both
// a witnessed and a told belief at the same proposition stem holds
// contradictory knowledge: dramatic pressure that demands reconciliation.
//
// Reuses the stem-match heuristic from belief-revision.ts:reviseBelief.

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeArcCompletion } from '../../server/nvm/quality/arc-tracker.ts';
import type { Belief } from '../../server/engine/types.ts';
import type { StoryOp } from '../../server/nvm/ops/StoryOp.ts';

function belief(id: string, proposition: string, source: Belief['source'], acquiredAt: number): Belief {
  return { id, proposition, confidence: 0.7, source, acquired_at: acquiredAt };
}

function updateBelief(charId: string, b: Belief): StoryOp {
  return { op: 'UPDATE_BELIEF', charId, belief: b };
}
function visualFact(sceneId: string, fact: string): StoryOp {
  return { op: 'RECORD_VISUAL_FACT', sceneId, fact };
}
function sonicFact(sceneId: string, fact: string): StoryOp {
  return { op: 'RECORD_SONIC_FACT', sceneId, fact };
}
function shiftRelationship(a: string, b: string, amount: number): StoryOp {
  return { op: 'SHIFT_RELATIONSHIP', pair: [a, b], delta: { dimension: 'trust', amount, reason: 'test' } };
}

describe('BELIEF_CONFLICT detection', () => {
  test('fires when a character holds witnessed + told beliefs at the same stem', () => {
    const scenes = [
      { sceneIdx: 0, ops: [
        updateBelief('nora', belief('b1', 'The warehouse key was under the mat', 'witnessed', 0)),
      ] },
      { sceneIdx: 1, ops: [
        updateBelief('nora', belief('b2', 'The warehouse key was under the mat', 'told', 1)),
      ] },
    ];
    const report = analyzeArcCompletion(scenes);
    const conflicts = report.openPromises.filter(p => p.kind === 'BELIEF_CONFLICT');
    assert.equal(conflicts.length, 1, 'exactly one belief conflict should be open');
    assert.match(conflicts[0].description, /nora/, 'description should name the character');
    assert.equal(conflicts[0].suggestedOp, 'UPDATE_BELIEF');
    // Should land in the epistemic account
    assert.ok(
      report.accounts.epistemic.promises.some(p => p.kind === 'BELIEF_CONFLICT'),
      'BELIEF_CONFLICT should appear in the epistemic account',
    );
  });

  test('does NOT fire for two witnessed beliefs at the same stem', () => {
    const scenes = [
      { sceneIdx: 0, ops: [
        updateBelief('nora', belief('b1', 'The warehouse key was under the mat', 'witnessed', 0)),
        updateBelief('nora', belief('b2', 'The warehouse key was under the mat', 'witnessed', 1)),
      ] },
    ];
    const report = analyzeArcCompletion(scenes);
    const conflicts = report.openPromises.filter(p => p.kind === 'BELIEF_CONFLICT');
    assert.equal(conflicts.length, 0, 'two same-source beliefs should not conflict');
  });

  test('does NOT fire for witnessed + inferred (only witnessed/told asymmetry triggers)', () => {
    const scenes = [
      { sceneIdx: 0, ops: [
        updateBelief('nora', belief('b1', 'The warehouse key was under the mat', 'witnessed', 0)),
      ] },
      { sceneIdx: 1, ops: [
        updateBelief('nora', belief('b2', 'The warehouse key was under the mat', 'inferred', 1)),
      ] },
    ];
    const report = analyzeArcCompletion(scenes);
    const conflicts = report.openPromises.filter(p => p.kind === 'BELIEF_CONFLICT');
    assert.equal(conflicts.length, 0, 'witnessed + inferred should not trigger (heuristic is witnessed/told only)');
  });

  test('resolves when a contradictory belief is replaced with a different stem', () => {
    const scenes = [
      { sceneIdx: 0, ops: [
        updateBelief('nora', belief('b1', 'The warehouse key was under the mat', 'witnessed', 0)),
      ] },
      { sceneIdx: 1, ops: [
        updateBelief('nora', belief('b2', 'The warehouse key was under the mat', 'told', 1)),
      ] },
      // Replace b2 with a different proposition — stem changes, conflict resolves
      { sceneIdx: 2, ops: [
        updateBelief('nora', belief('b2', 'The key was actually in the flower pot', 'told', 2)),
      ] },
    ];
    const report = analyzeArcCompletion(scenes);
    const conflicts = report.openPromises.filter(p => p.kind === 'BELIEF_CONFLICT');
    assert.equal(conflicts.length, 0, 'conflict should be resolved after belief replacement');
    assert.ok(report.resolvedCount >= 1, 'resolvedCount should include the closed conflict');
  });

  test('tracks conflicts independently per character', () => {
    const scenes = [
      { sceneIdx: 0, ops: [
        updateBelief('nora', belief('n1', 'The warehouse key was under the mat', 'witnessed', 0)),
        updateBelief('leo', belief('l1', 'The gun was in the drawer', 'witnessed', 0)),
      ] },
      { sceneIdx: 1, ops: [
        updateBelief('nora', belief('n2', 'The warehouse key was under the mat', 'told', 1)),
        updateBelief('leo', belief('l2', 'The gun was in the drawer', 'told', 1)),
      ] },
    ];
    const report = analyzeArcCompletion(scenes);
    const conflicts = report.openPromises.filter(p => p.kind === 'BELIEF_CONFLICT');
    assert.equal(conflicts.length, 2, 'each character should have their own conflict');
    const charIds = conflicts.map(c => c.description).join(' ');
    assert.match(charIds, /nora/);
    assert.match(charIds, /leo/);
  });
});

describe('Account decomposition', () => {
  test('scene account is empty when the scene has substantive action', () => {
    const scenes = [{ sceneIdx: 0, ops: [shiftRelationship('a', 'b', 0.3)] }];
    const report = analyzeArcCompletion(scenes);
    assert.equal(report.accounts.scene.openCount, 0);
  });

  test('EMOTIONAL_DEBT lands in the character account', () => {
    const scenes = [
      { sceneIdx: 0, ops: [{
        op: 'APPRAISE_EMOTION' as const,
        charId: 'nora',
        emotion: { joy: 0, distress: 90, anger: 0, fear: 0, pride: 0, shame: 0, dominant: 'distress' as const, intensity: 90, last_updated_at: 0 },
      }] },
    ];
    const report = analyzeArcCompletion(scenes);
    assert.ok(
      report.accounts.character.promises.some(p => p.kind === 'EMOTIONAL_DEBT'),
      'EMOTIONAL_DEBT should appear in the character account',
    );
    assert.ok(report.accounts.character.openCount >= 1);
  });
});

describe('AUDIENCE_QUESTION detection', () => {
  function readerState(delta: Record<string, unknown>): StoryOp {
    return { op: 'UPDATE_READER_STATE', delta } as StoryOp;
  }

  test('fires when suspense is raised but never answered by a knownFact', () => {
    const scenes = [
      { sceneIdx: 0, ops: [readerState({ suspense: 10 })] },
      { sceneIdx: 1, ops: [readerState({ curiosity: 5 })] },
    ];
    const report = analyzeArcCompletion(scenes);
    const questions = report.openPromises.filter(p => p.kind === 'AUDIENCE_QUESTION');
    assert.equal(questions.length, 1, 'one consolidated audience-question promise');
    assert.match(questions[0].description, /2 audience question/);
    assert.ok(report.accounts.audience.openCount >= 1, 'should land in audience account');
  });

  test('does NOT fire when raised suspense is answered by a knownFact', () => {
    const scenes = [
      { sceneIdx: 0, ops: [readerState({ suspense: 10 })] },
      { sceneIdx: 1, ops: [readerState({ knownFact: 'The butler did it' })] },
    ];
    const report = analyzeArcCompletion(scenes);
    const questions = report.openPromises.filter(p => p.kind === 'AUDIENCE_QUESTION');
    assert.equal(questions.length, 0, 'knownFact should answer the question');
  });

  test('does NOT fire when no suspense or curiosity is raised', () => {
    const scenes = [
      { sceneIdx: 0, ops: [readerState({ investment: 5 })] },
    ];
    const report = analyzeArcCompletion(scenes);
    const questions = report.openPromises.filter(p => p.kind === 'AUDIENCE_QUESTION');
    assert.equal(questions.length, 0, 'investment alone should not pose a question');
  });
});

describe('SCENE_DEAD_AIR detection', () => {
  test('fires when consecutive scenes have only sensory ops (no substance)', () => {
    const scenes = [
      { sceneIdx: 0, ops: [visualFact('s0', 'rain')] },
      { sceneIdx: 1, ops: [sonicFact('s1', 'thunder')] },
    ];
    const report = analyzeArcCompletion(scenes);
    const deadAir = report.openPromises.filter(p => p.kind === 'SCENE_DEAD_AIR');
    assert.equal(deadAir.length, 1);
    assert.match(deadAir[0].description, /scene 0/);
    assert.ok(report.accounts.scene.openCount >= 1, 'should land in scene account');
  });

  test('does NOT fire when a scene has substantive ops', () => {
    const scenes = [
      { sceneIdx: 0, ops: [shiftRelationship('nora', 'leo', -0.5)] },
    ];
    const report = analyzeArcCompletion(scenes);
    const deadAir = report.openPromises.filter(p => p.kind === 'SCENE_DEAD_AIR');
    assert.equal(deadAir.length, 0, 'a substantive scene should not trigger dead air');
  });

  test('resolves when a substantive scene breaks the dead-air streak', () => {
    const scenes = [
      { sceneIdx: 0, ops: [visualFact('s0', 'rain')] },
      { sceneIdx: 1, ops: [shiftRelationship('nora', 'leo', -0.5)] },
      { sceneIdx: 2, ops: [visualFact('s2', 'sunset')] },
    ];
    const report = analyzeArcCompletion(scenes);
    const deadAir = report.openPromises.filter(p => p.kind === 'SCENE_DEAD_AIR');
    assert.equal(deadAir.length, 1, 'one open streak (scene 2)');
    assert.match(deadAir[0].description, /scene 2/);
    assert.ok(report.resolvedCount >= 1, 'resolvedCount should include the broken streak');
  });

  test('does NOT fire on empty scenes list', () => {
    const report = analyzeArcCompletion([]);
    const deadAir = report.openPromises.filter(p => p.kind === 'SCENE_DEAD_AIR');
    assert.equal(deadAir.length, 0);
  });
});
