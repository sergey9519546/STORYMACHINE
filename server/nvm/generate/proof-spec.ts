// Proof-Driven Generation (G9) — proofs are the spec, not the filter.
// Instead of generating freely and filtering afterward, failing proofs become
// explicit constraints fed back to the LLM as generation requirements.
// The LLM compiles against the proof contract; rejection is a compile error.

import type { NarrativeState } from '../state/NarrativeState.ts';
import type { ProofResult } from '../proof/contract.ts';
import type { NarrativeTransitionIR } from '../ir/NarrativeTransitionIR.ts';
import type { SceneFunction } from '../ir/NarrativeTransitionIR.ts';
import { sanitizeForPrompt } from '../../lib/prompt-utils.ts';
import { genrePromptBlock } from '../../lib/genre-router.ts';

export interface SceneTarget {
  sceneIdx: number;
  sceneFunction: SceneFunction;
  activeMechanisms: string[];
  tensionTarget: number;   // 0–100 desired tension after this scene
  qualityTarget?: number;  // 0–100 minimum quality score (default 60)
  themeHint?: string;      // nudge toward a theme argument
}

export interface GenerationConstraint {
  kind:
    | 'must_introduce_character'
    | 'must_add_fact'
    | 'must_seed_clue'
    | 'must_declare_precondition'
    | 'must_use_mechanism'
    | 'must_verify_causal_link'
    | 'must_earn_reveal'
    | 'must_reach_tension'
    | 'free_form';
  description: string;
  detail?: string;  // e.g. charId to introduce, factId to add, clue description
}

export interface GenerationSpec {
  state: NarrativeState;
  target: SceneTarget;
  constraints: GenerationConstraint[];
  // LLM-ready: a system prompt preamble that encodes the proof constraints
  systemPreamble: string;
}

// Convert failing proofs + scene target into LLM constraints.
// This is the G9 inversion: proof failures become spec, not rejections.
export function proofsToConstraints(
  state: NarrativeState,
  target: SceneTarget,
  failures: ProofResult[],
): GenerationConstraint[] {
  const constraints: GenerationConstraint[] = [];

  // Always: declare at least one precondition (causal grounding)
  if (target.sceneIdx > 0) {
    constraints.push({
      kind: 'must_declare_precondition',
      description: 'Declare at least one precondition (causal predecessor) for this scene',
    });
  }

  // Always: use the target mechanisms
  for (const m of target.activeMechanisms) {
    const safeM = sanitizeForPrompt(m, 128);
    constraints.push({ kind: 'must_use_mechanism', description: `Activate mechanism: ${safeM}`, detail: safeM });
  }

  // From failures
  for (const result of failures) {
    for (const finding of result.findings) {
      const safeSubj = sanitizeForPrompt(finding.subjectId ?? '', 128);
      const safeMsg  = sanitizeForPrompt(finding.message   ?? '', 300);
      switch (result.proof) {
        case 'IntentionalProof':
          constraints.push({
            kind: 'must_introduce_character',
            description: `Introduce character "${safeSubj}" with an UPDATE_BELIEF op before referencing them`,
            detail: safeSubj,
          });
          break;
        case 'TemporalProof':
          constraints.push({
            kind: 'must_add_fact',
            description: `ADD_FACT for "${safeSubj}" must precede any EXPIRE_FACT referencing it`,
            detail: safeSubj,
          });
          break;
        case 'EarnedRevealProof':
          constraints.push({
            kind: 'must_earn_reveal',
            description: `SEED_CLUE "${safeSubj}" must appear before the PAYOFF_SETUP fires`,
            detail: safeSubj,
          });
          break;
        case 'EpistemicProof':
          constraints.push({
            kind: 'free_form',
            description: `Epistemic constraint: ${safeMsg}`,
          });
          break;
        case 'CausalProof':
          constraints.push({
            kind: 'must_verify_causal_link',
            description: safeMsg,
            detail: safeSubj,
          });
          break;
        // Tier 2 quality-gate failures — translated to free-form guidance
        case 'NecessityProof':
          constraints.push({
            kind: 'free_form',
            description: 'Remove redundant ops. Every op must shift a belief, emotion, relationship, or fact in a new direction.',
          });
          break;
        case 'SpecificityProof':
          constraints.push({
            kind: 'free_form',
            description: 'Replace vague placeholders with concrete names: specific charIds, factIds, clueIds. No "event" or "thing" generics.',
          });
          break;
        case 'DialogueProof':
          constraints.push({
            kind: 'free_form',
            description: `Dialogue violation: ${safeMsg}. Fix before generating.`,
          });
          break;
        case 'PolarityProof':
          constraints.push({
            kind: 'free_form',
            description: 'Add an emotional polarity reversal: use APPRAISE_EMOTION to shift at least one established character from negative to positive valence (or vice versa). A scene where all emotion ops reinforce the same existing register is emotionally stagnant.',
          });
          break;
        case 'ReincorporationProof':
          constraints.push({
            kind: 'free_form',
            description: 'Reference prior story material: include at least one op with an existing charId (from state.characterBeliefs or state.characterEmotions), an existing clockId (from state.clocks), or an existing clueId (from state.clues). A scene that introduces only new identifiers is disconnected from the story.',
          });
          break;
        default:
          constraints.push({ kind: 'free_form', description: safeMsg });
      }
    }
  }

  // Tension target constraint
  if (target.tensionTarget > 0) {
    constraints.push({
      kind: 'must_reach_tension',
      description: `Scene must raise dramatic tension to approximately ${target.tensionTarget}/100`,
      detail: String(target.tensionTarget),
    });
  }

  return constraints;
}

// Build the system preamble that encodes constraints as LLM instructions.
// Includes a rich snapshot of current story state so the generator has full
// emotional, structural, and relational context — not just a character list.
export function buildSystemPreamble(constraints: GenerationConstraint[], state: NarrativeState): string {
  const knownChars = Object.keys(state.characterBeliefs)
    .map(id => sanitizeForPrompt(id, 64))
    .join(', ') || 'none yet';
  const activeFacts = state.objectiveReality.length;

  // ── Emotional landscape ────────────────────────────────────────────────────
  const emotionLines = Object.entries(state.characterEmotions)
    .filter(([, e]) => typeof e.intensity === 'number' && isFinite(e.intensity) && e.intensity > 0 && e.dominant)
    .sort((a, b) => b[1].intensity - a[1].intensity)
    .slice(0, 6)
    .map(([id, e]) => `${sanitizeForPrompt(id, 48)}: ${e.dominant}@${Math.round(e.intensity)}`);
  const emotionBlock = emotionLines.length > 0
    ? `Character emotions: ${emotionLines.join(', ')}.`
    : '';

  // ── Audience state ─────────────────────────────────────────────────────────
  const { suspense, curiosity, investment } = state.audienceState;
  const safeSuspense = Math.round(isFinite(suspense) ? suspense : 0);
  const safeCuriosity = Math.round(isFinite(curiosity) ? curiosity : 0);
  const safeInvestment = Math.round(isFinite(investment) ? investment : 0);
  // Prescriptive directive: tell the LLM how to calibrate op intensity based on
  // the current audience state, not just what the numbers are.
  let audienceDirective = '';
  if (safeSuspense >= 85 && safeInvestment >= 85) {
    audienceDirective = 'CLIMAX CONDITIONS: suspense and investment both near ceiling — drive toward payoff resolution (PAYOFF_SETUP, ADVANCE_THEME_ARGUMENT resolve) rather than further escalation; the audience is primed for the culminating event.';
  } else if (safeSuspense < 30 && safeCuriosity < 30) {
    audienceDirective = 'The audience is disengaged — prioritise curiosity hooks (SEED_CLUE, ADD_FACT) over resolution.';
  } else if (safeSuspense >= 70) {
    audienceDirective = 'Suspense is high — escalate pressure: add a RAISE_CLOCK or SHIFT_RELATIONSHIP consequence.';
  } else if (safeCuriosity >= 70 && safeSuspense < 40) {
    audienceDirective = 'Curiosity is high but tension is low — plant a reveal or complication via ADD_FACT or PAYOFF_SETUP.';
  } else if (safeInvestment >= 70) {
    audienceDirective = 'Audience investment is high — threaten what they care about: introduce cost or complication.';
  }
  const audienceBlock = (safeSuspense > 0 || safeCuriosity > 0 || audienceDirective)
    ? [`Audience: suspense=${safeSuspense}, curiosity=${safeCuriosity}, investment=${safeInvestment}.`, audienceDirective].filter(Boolean).join(' ')
    : '';

  // ── Active clocks (urgency) ────────────────────────────────────────────────
  const clockEntries = Object.entries(state.clocks)
    .filter(([, v]) => typeof v === 'number' && isFinite(v) && v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([id, v]) => `${sanitizeForPrompt(id, 48)}=${v}`);
  const clockBlock = clockEntries.length > 0
    ? `Active clocks (highest first): ${clockEntries.join(', ')}.`
    : '';

  // ── Relationship heat ──────────────────────────────────────────────────────
  // Sort by absolute NET cumulative delta so the most dramatically charged
  // relationships appear first, not the ones with the most update events.
  const relEntries = Object.entries(state.relationships)
    .filter(([, deltas]) => deltas.length > 0)
    .map(([key, deltas]) => {
      const net = deltas.reduce((s, d) => s + (isFinite(d.amount) ? d.amount : 0), 0);
      return { key, net };
    })
    .filter(({ net }) => isFinite(net))
    .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
    .slice(0, 4)
    .map(({ key, net }) => {
      const sign = (net >= 0 ? '+' : '') + net.toFixed(1);
      return `${sanitizeForPrompt(key.replace('|', '↔'), 64)} (net: ${sign})`;
    });
  const relBlock = relEntries.length > 0
    ? `Relationship heat: ${relEntries.join('; ')}.`
    : '';

  // ── Character beliefs (psychographic context) ─────────────────────────────
  // Surface top-confidence beliefs per character so the LLM knows what each
  // character believes about the world — essential for writing belief-motivated ops.
  const beliefLines = Object.entries(state.characterBeliefs)
    .flatMap(([charId, beliefs]) => {
      const top = beliefs
        .filter(b => b.confidence > 0.5)
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 2);
      return top.map(b =>
        `${sanitizeForPrompt(charId, 40)} believes: "${sanitizeForPrompt(b.proposition, 80)}" (${(b.confidence * 100).toFixed(0)}% conf, ${b.source})`,
      );
    })
    .slice(0, 8); // cap at 8 to avoid context bloat
  const beliefBlock = beliefLines.length > 0
    ? `Character beliefs: ${beliefLines.join('; ')}.`
    : '';

  // ── Open clues and planted payoffs ────────────────────────────────────────
  // Give the LLM the actual clue IDs so it can reference them in PAYOFF_SETUP ops.
  const openClueIds = state.clues.slice(0, 5).map(c => sanitizeForPrompt(c.clueId, 48));
  const openPayoffSetups = state.payoffs.slice(0, 4).map(p => sanitizeForPrompt(p.setupId, 48));
  const cluePayoffBlock = (openClueIds.length > 0 || openPayoffSetups.length > 0)
    ? [
        openClueIds.length > 0 ? `Open clues: ${openClueIds.join(', ')}.` : '',
        openPayoffSetups.length > 0 ? `Pending payoffs: ${openPayoffSetups.join(', ')}.` : '',
      ].filter(Boolean).join(' ')
    : '';

  // ── Theme direction ────────────────────────────────────────────────────────
  const themeBlock = state.authorIntent.theme
    ? `Theme: "${sanitizeForPrompt(state.authorIntent.theme, 120)}".`
    : '';
  const lastThemeMove = state.themeArgument.length > 0
    ? state.themeArgument[state.themeArgument.length - 1]
    : null;
  const themeMoveBlock = lastThemeMove
    ? `Last theme move: ${lastThemeMove.move} on claim "${sanitizeForPrompt(lastThemeMove.claimId, 64)}".`
    : '';

  // ── Object arc states ─────────────────────────────────────────────────────
  // Show which props/objects are in active use vs consumed/destroyed so the LLM
  // doesn't reference an object that has already been resolved or destroyed.
  const objectArcEntries = Object.entries(state.objectArcs)
    .filter(([, s]) => typeof s === 'string' && s.trim())
    .slice(0, 6)
    .map(([id, s]) => `${sanitizeForPrompt(id, 40)}→${sanitizeForPrompt(s, 30)}`);
  const objectArcBlock = objectArcEntries.length > 0
    ? `Object arcs: ${objectArcEntries.join(', ')}.`
    : '';

  const stateLines = [emotionBlock, beliefBlock, audienceBlock, clockBlock, cluePayoffBlock, relBlock, objectArcBlock, themeBlock, themeMoveBlock]
    .filter(Boolean)
    .join(' ');

  // Genre register: inject tone/vocabulary/cliché guidance when a genre is set.
  // This ensures every candidate generation call respects the story's genre contract.
  const genreBlock = genrePromptBlock(state.authorIntent.genre);

  const constraintLines = constraints
    .map((c, i) => `${i + 1}. [${c.kind}] ${sanitizeForPrompt(c.description, 400)}`)
    .join('\n');

  return [
    'You are a story compiler generating a NarrativeTransitionIR.',
    `Known characters: ${knownChars}. Active facts: ${activeFacts}.`,
    stateLines,
    genreBlock,
    '',
    'PROOF CONSTRAINTS (your output must satisfy all of these):',
    constraintLines,
    '',
    'Return ONLY valid JSON matching the NarrativeTransitionIR schema.',
    'Every op must be grounded in the constraints above.',
  ].filter(Boolean).join('\n');
}

// Compose the full GenerationSpec from state, target, and failures.
export function buildGenerationSpec(
  state: NarrativeState,
  target: SceneTarget,
  failures: ProofResult[] = [],
): GenerationSpec {
  if (target.sceneIdx < 0) throw new Error('buildGenerationSpec: sceneIdx must be >= 0');
  if (!target.sceneFunction) throw new Error('buildGenerationSpec: sceneFunction is required');
  const constraints = proofsToConstraints(state, target, failures);
  const systemPreamble = buildSystemPreamble(constraints, state);
  return { state, target, constraints, systemPreamble };
}

// Async stub: generate N candidate IRs from a spec.
// In production this calls the LLM provider; in tests a mock provider is injected.
export type CandidateGenerator = (
  spec: GenerationSpec,
  n: number,
) => Promise<NarrativeTransitionIR[]>;
