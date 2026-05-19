// Proof-Driven Generation (G9) — proofs are the spec, not the filter.
// Instead of generating freely and filtering afterward, failing proofs become
// explicit constraints fed back to the LLM as generation requirements.
// The LLM compiles against the proof contract; rejection is a compile error.

import type { NarrativeState } from '../state/NarrativeState.ts';
import type { ProofResult } from '../proof/contract.ts';
import type { NarrativeTransitionIR } from '../ir/NarrativeTransitionIR.ts';
import type { SceneFunction } from '../ir/NarrativeTransitionIR.ts';

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
    constraints.push({ kind: 'must_use_mechanism', description: `Activate mechanism: ${m}`, detail: m });
  }

  // From failures
  for (const result of failures) {
    for (const finding of result.findings) {
      switch (result.proof) {
        case 'IntentionalProof':
          constraints.push({
            kind: 'must_introduce_character',
            description: `Introduce character "${finding.subjectId}" with an UPDATE_BELIEF op before referencing them`,
            detail: finding.subjectId,
          });
          break;
        case 'TemporalProof':
          constraints.push({
            kind: 'must_add_fact',
            description: `ADD_FACT for "${finding.subjectId}" must precede any EXPIRE_FACT referencing it`,
            detail: finding.subjectId,
          });
          break;
        case 'EarnedRevealProof':
          constraints.push({
            kind: 'must_earn_reveal',
            description: `SEED_CLUE "${finding.subjectId}" must appear before the PAYOFF_SETUP fires`,
            detail: finding.subjectId,
          });
          break;
        case 'EpistemicProof':
          constraints.push({
            kind: 'free_form',
            description: `Epistemic constraint: ${finding.message}`,
          });
          break;
        case 'CausalProof':
          constraints.push({
            kind: 'must_verify_causal_link',
            description: finding.message,
            detail: finding.subjectId,
          });
          break;
        default:
          constraints.push({ kind: 'free_form', description: finding.message });
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
export function buildSystemPreamble(constraints: GenerationConstraint[], state: NarrativeState): string {
  const knownChars = Object.keys(state.characterBeliefs).join(', ') || 'none yet';
  const activeFacts = state.objectiveReality.length;

  const constraintLines = constraints
    .map((c, i) => `${i + 1}. [${c.kind}] ${c.description}`)
    .join('\n');

  return [
    'You are a story compiler generating a NarrativeTransitionIR.',
    `Known characters: ${knownChars}. Active facts: ${activeFacts}.`,
    '',
    'PROOF CONSTRAINTS (your output must satisfy all of these):',
    constraintLines,
    '',
    'Return ONLY valid JSON matching the NarrativeTransitionIR schema.',
    'Every op must be grounded in the constraints above.',
  ].join('\n');
}

// Compose the full GenerationSpec from state, target, and failures.
export function buildGenerationSpec(
  state: NarrativeState,
  target: SceneTarget,
  failures: ProofResult[] = [],
): GenerationSpec {
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
