// Tests for the six writers'-room critics added in E1-a (pacing-editor,
// dialogue-specialist, theme-auditor, genre-gatekeeper, audience-proxy,
// production-realist — server/nvm/room/critics/*.ts) and for the
// hard-objection severity tier added to the room orchestrator
// (server/nvm/room/room.ts). Each critic gets a fire test (a fixture built
// to trip its target defect, asserted via runWritersRoom's aggregated
// critiques[] filtered to that criticId) and a no-fire test (an otherwise
// equivalent clean fixture producing zero critiques from that critic — the
// never-padded discipline). This file is self-contained; it does not depend
// on or extend tests/core/core-01.test.ts, which already has its own
// Writers' Room (G2) suite for the original 6 critics.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runWritersRoom } from '../../server/nvm/room/room.ts';
import { emptyState } from '../../server/nvm/state/NarrativeState.ts';
import type { NarrativeState } from '../../server/nvm/state/NarrativeState.ts';
import type { NarrativeTransitionIR } from '../../server/nvm/ir/NarrativeTransitionIR.ts';
import type { StoryOp } from '../../server/nvm/ops/StoryOp.ts';
import { buildNoraWarehouseIR } from '../../server/nvm/__tests__/m1.5-harness.ts';

function makeIR(overrides: Partial<NarrativeTransitionIR> & { ops: StoryOp[] }): NarrativeTransitionIR {
  return {
    transitionId: 'test-ir',
    sceneIdx: 3,
    sceneFunction: 'advance_plot',
    activeMechanisms: [],
    beforeStateHash: 'irrelevant-for-critic-unit-tests',
    preconditions: [],
    postconditions: ['something changed'],
    provenance: { origin: 'user_authored', createdAt: 0 },
    ...overrides,
  };
}

function makeState(overrides: Partial<NarrativeState> = {}): NarrativeState {
  return { ...emptyState(), ...overrides };
}

function critiquesFor(criticId: string, ir: NarrativeTransitionIR, state: NarrativeState) {
  return runWritersRoom(ir, state).critiques.filter(c => c.criticId === criticId);
}

describe('NVM — Writers\' Room roster expansion (E1-a): 6 new critics', () => {

  // ── pacing-editor ──────────────────────────────────────────────────────────
  describe('pacing-editor', () => {
    it('fires on a dead stretch: an urgency-required scene with only 1 op', () => {
      const ir = makeIR({
        sceneFunction: 'build_tension',
        ops: [{ op: 'RAISE_CLOCK', clockId: 'bomb', amount: 10 }],
      });
      const cs = critiquesFor('pacing_editor', ir, makeState());
      assert.ok(cs.length >= 1, 'expected pacing_editor to object to a 1-op build_tension scene');
      assert.ok(cs.some(c => c.objection.includes('no pulse')), `objection should be grounded in the beat's thinness: ${JSON.stringify(cs)}`);
    });

    it('does not fire on a build_tension scene with real, varied material', () => {
      const ir = makeIR({
        sceneFunction: 'build_tension',
        ops: [
          { op: 'RAISE_CLOCK', clockId: 'bomb', amount: 20 },
          { op: 'SHIFT_RELATIONSHIP', pair: ['a', 'b'], delta: { dimension: 'trust', amount: 0.1, reason: 'shared risk' } },
        ],
      });
      const cs = critiquesFor('pacing_editor', ir, makeState());
      assert.equal(cs.length, 0, `expected 0 pacing_editor critiques, got: ${JSON.stringify(cs)}`);
    });
  });

  // ── dialogue-specialist ─────────────────────────────────────────────────────
  describe('dialogue-specialist', () => {
    const emo = (charId: string, dominant: 'joy' | 'fear', intensity: number): StoryOp => ({
      op: 'APPRAISE_EMOTION', charId,
      emotion: { joy: 0, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0, dominant, intensity, last_updated_at: 1 },
    });

    it('fires when two different characters register the identical emotional note', () => {
      const ir = makeIR({ ops: [emo('nora', 'fear', 70), emo('bob', 'fear', 70)] });
      const cs = critiquesFor('dialogue_specialist', ir, makeState());
      assert.ok(cs.length >= 1, 'expected dialogue_specialist to flag indistinguishable voices');
      assert.ok(cs.some(c => c.objection.includes('nora') && c.objection.includes('bob')), `objection should name both characters: ${JSON.stringify(cs)}`);
    });

    it('does not fire when characters register distinct emotional registers and dialogue carries subtext', () => {
      const ir = makeIR({
        ops: [
          emo('nora', 'fear', 70),
          emo('bob', 'joy', 30),
          { op: 'RECORD_SONIC_FACT', sceneId: 's1', fact: 'the phone rings twice before he finally picks it up' },
        ],
      });
      const cs = critiquesFor('dialogue_specialist', ir, makeState());
      assert.equal(cs.length, 0, `expected 0 dialogue_specialist critiques, got: ${JSON.stringify(cs)}`);
    });
  });

  // ── theme-auditor ────────────────────────────────────────────────────────────
  describe('theme-auditor', () => {
    it('fires when a claim repeats the identical move already on record', () => {
      const ir = makeIR({ ops: [{ op: 'ADVANCE_THEME_ARGUMENT', claimId: 'trust-earned', move: 'support' }] });
      const state = makeState({ themeArgument: [{ claimId: 'trust-earned', move: 'support' }] });
      const cs = critiquesFor('theme_auditor', ir, state);
      assert.ok(cs.length >= 1, 'expected theme_auditor to flag a restated move');
      assert.ok(cs.some(c => c.objection.includes('trust-earned')), `objection should name the claim: ${JSON.stringify(cs)}`);
    });

    it('does not fire when the argument advances with a genuinely new move', () => {
      const ir = makeIR({
        sceneIdx: 2,
        ops: [{ op: 'ADVANCE_THEME_ARGUMENT', claimId: 'trust-earned', move: 'complicate' }],
      });
      const state = makeState({
        authorIntent: { theme: 'trust must be earned' },
        themeArgument: [{ claimId: 'trust-earned', move: 'support' }],
      });
      const cs = critiquesFor('theme_auditor', ir, state);
      assert.equal(cs.length, 0, `expected 0 theme_auditor critiques, got: ${JSON.stringify(cs)}`);
    });
  });

  // ── genre-gatekeeper ─────────────────────────────────────────────────────────
  describe('genre-gatekeeper', () => {
    it('fires (hard) on an unearned payoff that violates the genre\'s forbidden-shortcut contract', () => {
      const ir = makeIR({
        sceneIdx: 1,
        ops: [{ op: 'PAYOFF_SETUP', setupId: 'reveal-1', payoffEventId: 'evt1' }],
      });
      const state = makeState({ authorIntent: { genre: 'thriller' } });
      const cs = critiquesFor('genre_gatekeeper', ir, state);
      assert.ok(cs.length >= 1, 'expected genre_gatekeeper to veto an unearned payoff under thriller rules');
      assert.ok(cs.some(c => c.hard === true), `expected at least one hard genre veto: ${JSON.stringify(cs)}`);
      assert.ok(cs.some(c => c.objection.includes('thriller')), `objection should name the genre: ${JSON.stringify(cs)}`);
    });

    it('does not fire when the payoff has a planted setup and no other genre rule is violated', () => {
      const ir = makeIR({
        sceneIdx: 1,
        ops: [
          { op: 'SEED_CLUE', clueId: 'reveal-1', carrier: 'object' },
          { op: 'PAYOFF_SETUP', setupId: 'reveal-1', payoffEventId: 'evt1' },
        ],
      });
      const state = makeState({ authorIntent: { genre: 'thriller' } });
      const cs = critiquesFor('genre_gatekeeper', ir, state);
      assert.equal(cs.length, 0, `expected 0 genre_gatekeeper critiques, got: ${JSON.stringify(cs)}`);
    });

    it('does not fire at all when no genre is configured', () => {
      const ir = makeIR({ ops: [{ op: 'PAYOFF_SETUP', setupId: 'reveal-1', payoffEventId: 'evt1' }] });
      const cs = critiquesFor('genre_gatekeeper', ir, makeState());
      assert.equal(cs.length, 0, 'genre_gatekeeper must no-op with no genre configured');
    });
  });

  // ── audience-proxy ───────────────────────────────────────────────────────────
  describe('audience-proxy', () => {
    it('fires on a pileup of 3 brand-new names in one scene', () => {
      const ir = makeIR({
        ops: [
          { op: 'UPDATE_BELIEF', charId: 'zed', belief: { id: 'b1', proposition: 'p', confidence: 0.8, source: 'witnessed', acquired_at: 1 } },
          { op: 'UPDATE_BELIEF', charId: 'yara', belief: { id: 'b2', proposition: 'p2', confidence: 0.8, source: 'witnessed', acquired_at: 1 } },
          { op: 'APPRAISE_EMOTION', charId: 'wex', emotion: { joy: 0, distress: 0, anger: 0, fear: 40, pride: 0, shame: 0, dominant: 'fear', intensity: 40, last_updated_at: 1 } },
        ],
      });
      const cs = critiquesFor('audience_proxy', ir, makeState());
      assert.ok(cs.length >= 1, 'expected audience_proxy to flag a new-name pileup');
      assert.ok(cs.some(c => c.objection.includes('zed') && c.objection.includes('yara') && c.objection.includes('wex')), `objection should list the new names: ${JSON.stringify(cs)}`);
    });

    it('does not fire when the same characters are already established', () => {
      const belief = { id: 'b1', proposition: 'p', confidence: 0.8, source: 'witnessed' as const, acquired_at: 1 };
      const ir = makeIR({
        ops: [
          { op: 'UPDATE_BELIEF', charId: 'zed', belief },
          { op: 'UPDATE_BELIEF', charId: 'yara', belief },
          { op: 'APPRAISE_EMOTION', charId: 'wex', emotion: { joy: 0, distress: 0, anger: 0, fear: 40, pride: 0, shame: 0, dominant: 'fear', intensity: 40, last_updated_at: 1 } },
        ],
      });
      const state = makeState({ characterBeliefs: { zed: [belief], yara: [belief], wex: [belief] } });
      const cs = critiquesFor('audience_proxy', ir, state);
      assert.equal(cs.length, 0, `expected 0 audience_proxy critiques, got: ${JSON.stringify(cs)}`);
    });
  });

  // ── production-realist ───────────────────────────────────────────────────────
  describe('production-realist', () => {
    it('fires on an unshootable visual fact', () => {
      const ir = makeIR({
        ops: [{ op: 'RECORD_VISUAL_FACT', sceneId: 's1', fact: 'we feel the montage of grief settling over the house' }],
      });
      const cs = critiquesFor('production_realist', ir, makeState());
      assert.ok(cs.length >= 1, 'expected production_realist to flag an unshootable visual fact');
      assert.ok(cs.some(c => c.objection.includes('montage')), `objection should quote the offending fact: ${JSON.stringify(cs)}`);
    });

    it('does not fire on a concrete, physical, filmable action line', () => {
      const ir = makeIR({
        ops: [{ op: 'RECORD_VISUAL_FACT', sceneId: 's1', fact: 'he slams the door and drops the keys on the counter' }],
      });
      const cs = critiquesFor('production_realist', ir, makeState());
      assert.equal(cs.length, 0, `expected 0 production_realist critiques, got: ${JSON.stringify(cs)}`);
    });
  });

  // ── aggregation: hard objections surface distinctly ─────────────────────────
  describe('aggregation — severity tiers', () => {
    it('a hard genre veto is surfaced in hardObjections/hasHardObjection, not just buried in critiques[]', () => {
      const ir = makeIR({
        sceneIdx: 1,
        ops: [{ op: 'PAYOFF_SETUP', setupId: 'reveal-1', payoffEventId: 'evt1' }],
      });
      const state = makeState({ authorIntent: { genre: 'thriller' } });
      const result = runWritersRoom(ir, state);

      assert.ok(result.hasHardObjection === true, 'expected hasHardObjection to be true');
      assert.ok(result.hardObjections.length >= 1, 'expected at least one hard objection');
      assert.ok(result.hardObjections.every(c => c.hard === true), 'every entry in hardObjections must have hard === true');
      assert.ok(
        result.hardObjections.some(c => c.criticId === 'genre_gatekeeper'),
        `expected the genre veto in hardObjections: ${JSON.stringify(result.hardObjections)}`,
      );
      // Every hard objection must also be present in the full critiques[] —
      // hardObjections is a filtered view, not a separate parallel track.
      for (const h of result.hardObjections) {
        assert.ok(result.critiques.includes(h), 'hardObjections entries must be the same objects as in critiques[]');
      }
      assert.ok(result.transcript.includes('⚠ VETO'), 'transcript should mark hard objections distinctly');
      assert.ok(/hardObjections=\d+/.test(result.transcript), 'transcript summary line should report the hard-objection count');
    });

    it('hasHardObjection is false and hardObjections is empty when nothing hard fires', () => {
      // The M1.5 Nora/Bob warehouse fixture is the shared harness's known-good
      // IR — tests/core/core-01.test.ts already asserts it draws 0 continuity
      // critiques against an empty prior state — and no genre is configured,
      // so genre_gatekeeper (the only other hard-capable critic) no-ops too.
      // This isolates the E1-a severity-tier plumbing rather than incidentally
      // exercising the pre-existing continuity critic's own proof failures.
      const result = runWritersRoom(buildNoraWarehouseIR(), emptyState());
      assert.equal(result.hasHardObjection, false, `expected no hard objections, got: ${JSON.stringify(result.hardObjections)}`);
      assert.deepEqual(result.hardObjections, []);
    });
  });
});
