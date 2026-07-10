// Genre-Gatekeeper critic — a studio genre exec's voice. Reads the session's
// configured genre from genre-router.ts's genreRules (read-only — this
// critic never mutates or extends the genre table) and checks the material
// against that genre's structural contract: required behaviors and
// forbidden shortcuts. A forbidden-shortcut violation is a genre-contract
// veto (marked `hard: true`) rather than an ordinary craft note.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { Critique } from '../room.ts';
import { relationshipKey } from '../../state/NarrativeState.ts';
import { GENRE_MODIFIERS } from '../../../lib/genre-router.ts';

const NEGATIVE_FRICTION_DIMENSIONS = new Set(['resentment', 'fear', 'contempt', 'guilt']);
const POSITIVE_RECONCILE_DIMENSIONS = new Set(['love', 'trust', 'admiration']);

export function genreGatekeeperCritic(ir: NarrativeTransitionIR, state: NarrativeState): Critique[] {
  const critiques: Critique[] = [];

  const genre = state.authorIntent.genre;
  if (!genre) return critiques; // no genre configured yet — nothing to gate

  const modifier = GENRE_MODIFIERS[genre];
  if (!modifier) return critiques;
  const rules = modifier.genreRules;

  // Gate 1 (HARD): forbidden shortcut — an unearned payoff. Only genres whose
  // forbiddenShortcuts text explicitly calls out missing setup/groundwork are
  // gated here; this is the genre's own contract being broken, not a generic
  // structural complaint (the dramaturge critic already covers that angle).
  const forbidsUnearnedPayoff = rules.forbiddenShortcuts.some(s => /setup|planted|groundwork|buildup/i.test(s));
  if (forbidsUnearnedPayoff) {
    ir.ops.forEach((op, i) => {
      if (op.op === 'PAYOFF_SETUP') {
        const setupInState = state.payoffs.some(p => p.setupId === op.setupId);
        const setupInThisIR = ir.ops.slice(0, i).some(prev => prev.op === 'SEED_CLUE' && prev.clueId === op.setupId);
        if (!setupInState && !setupInThisIR) {
          const violatedRule = rules.forbiddenShortcuts.find(s => /setup|planted|groundwork|buildup/i.test(s));
          critiques.push({
            criticId: 'genre_gatekeeper', severity: 80, targetOpIdx: i, hard: true,
            objection: `[${genre}] forbidden shortcut violated — "${violatedRule}" — PAYOFF_SETUP "${op.setupId}" fires with no planted groundwork`,
            suggestedOperator: 'invert_expectation',
            attentionBid: 85,
          });
        }
      }
    });
  }

  // Gate 2: required behavior — an informationPositionDefault of 'superior'
  // means the genre promises the audience sits ahead of at least one
  // character. If that dramatic-irony posture has never once been delivered
  // by scene 2, the genre's information contract is unmet.
  if (rules.informationPositionDefault === 'superior' && ir.sceneIdx >= 2) {
    const hasKnownFactThisScene = ir.ops.some(op => op.op === 'UPDATE_READER_STATE' && !!op.delta.knownFact);
    const hasKnownFactEver = state.audienceState.knownFacts.length > 0;
    if (!hasKnownFactThisScene && !hasKnownFactEver) {
      critiques.push({
        criticId: 'genre_gatekeeper', severity: 40, targetOpIdx: null,
        objection: `[${genre}] requires the audience to sit ahead of at least one character (dramatic irony) but no UPDATE_READER_STATE has ever recorded a knownFact — the audience knows nothing the characters don't`,
        suggestedOperator: 'inject_irony',
        attentionBid: 40,
      });
    }
  }

  // Gate 3: required behavior — genres whose requiredBehaviors demand change
  // "cost something real" are violated by a clean reconciliation with no
  // prior negative friction on record for that pair.
  const requiresCost = rules.requiredBehaviors.some(b => /cost/i.test(b));
  if (requiresCost) {
    ir.ops.forEach((op, i) => {
      if (op.op === 'SHIFT_RELATIONSHIP' && POSITIVE_RECONCILE_DIMENSIONS.has(op.delta.dimension) && op.delta.amount > 0.3) {
        const key = relationshipKey(op.pair[0], op.pair[1]);
        const priorFriction = (state.relationships[key] ?? []).some(
          d => NEGATIVE_FRICTION_DIMENSIONS.has(d.dimension) && d.amount < 0,
        );
        if (!priorFriction) {
          critiques.push({
            criticId: 'genre_gatekeeper', severity: 35, targetOpIdx: i,
            objection: `[${genre}] requires change to cost something real, but ${op.pair[0]}/${op.pair[1]} reconcile (${op.delta.dimension} +${op.delta.amount.toFixed(2)}) with no prior friction on record for this pair`,
            suggestedOperator: 'deepen_wound',
            attentionBid: 35,
          });
        }
      }
    });
  }

  return critiques;
}
