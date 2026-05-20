// Quality-Aware Generation Spec (Wave 27) — converts quality engine warnings,
// arc-completion urgent promises, and Propp morphology gaps into GenerationConstraints
// that are fed back to the LLM. This closes the quality feedback loop:
//
//   generate → prove → quality → [quality warnings + arc debt → constraints] → generate
//
// Previously only proof failures became constraints; quality warnings were only
// used as a gate. Now low quality = compile error, not just a gate.

import type { GenerationConstraint } from './proof-spec.ts';
import type { QualityWarning, ProppAnalysis, ProppStage } from '../quality/index.ts';
import type { OpenPromise } from '../quality/arc-tracker.ts';

// ── Quality warning → constraint ──────────────────────────────────────────────

export function qualityConstraintsFromWarnings(
  warnings: QualityWarning[],
): GenerationConstraint[] {
  const seen = new Set<string>();
  const constraints: GenerationConstraint[] = [];

  for (const w of warnings) {
    // Deduplicate by rule so we don't spam the LLM with the same constraint.
    if (seen.has(w.rule)) continue;
    seen.add(w.rule);

    switch (w.rule) {
      case 'DV1_ON_THE_NOSE':
        constraints.push({ kind: 'free_form', description: 'Do NOT have a character confess a belief at full confidence (told source at >0.95). Use subtext: show the belief indirectly, obliquely, or via action rather than direct statement.' });
        break;
      case 'DV2_REDUNDANT_BELIEF':
        constraints.push({ kind: 'free_form', description: 'Avoid repeating a proposition a character already holds. Introduce NEW information or shift an existing belief in a new direction.' });
        break;
      case 'DV3_UNMOTIVATED_EMOTION':
        constraints.push({ kind: 'free_form', description: 'Every APPRAISE_EMOTION must follow a causal trigger (UPDATE_BELIEF, ADD_FACT, or SHIFT_RELATIONSHIP). Add the cause before the emotional response.' });
        break;
      case 'DV4_UNGROUNDED_RELATIONSHIP':
        constraints.push({ kind: 'free_form', description: 'SHIFT_RELATIONSHIP must be preceded by an emotional or belief change for at least one party. Ground the relationship shift in felt experience.' });
        break;
      case 'DV5_NO_HUMAN_PRESENCE':
        constraints.push({ kind: 'free_form', description: 'Include at least one character-level op: UPDATE_BELIEF, APPRAISE_EMOTION, or SHIFT_RELATIONSHIP. Scenes without characters are set dressing, not story.' });
        break;
      case 'DV6_CHARACTER_MONOLOGUE':
        constraints.push({ kind: 'free_form', description: 'Vary which character is active. No single character should dominate more than 2 consecutive ops. Distribute agency across characters.' });
        break;
      case 'DV7_UNMOTIVATED_TENSION_DROP':
        constraints.push({ kind: 'free_form', description: 'When a character\'s emotional intensity drops sharply, provide a positive SHIFT_RELATIONSHIP or explicit resolution event to motivate the change.' });
        break;
      case 'DV8_ABRUPT_RELATIONSHIP':
        constraints.push({ kind: 'free_form', description: 'A large relationship shift (|amount| > 0.5) requires an emotional event for at least one party first. Add an APPRAISE_EMOTION before the SHIFT_RELATIONSHIP.' });
        break;
      case 'DV9_UNGROUNDED_THEME':
        constraints.push({ kind: 'free_form', description: 'ADVANCE_THEME_ARGUMENT \'resolve\' or \'support\' requires prior ADD_FACT or UPDATE_BELIEF to ground the claim. Earn the theme through evidence.' });
        break;
      case 'DV10_STRUCTURAL_UNIFORMITY':
        constraints.push({ kind: 'free_form', description: 'Use at least 3 different op kinds in this scene. Structural variety creates rhythm: world fact → belief → emotion → relationship → theme.' });
        break;
      case 'LOW_SPECIFICITY':
        constraints.push({ kind: 'free_form', description: 'Replace vague terms (something, happened, felt, things) with concrete specifics: named objects, precise actions, sensory details. Every op should be unmistakably this story, not any story.' });
        break;
      case 'UNNECESSARY_OPS':
        constraints.push({ kind: 'free_form', description: 'Remove redundant ops. If an op does not change something new — a belief, emotion, relationship, or fact — cut it. Every op must earn its place.' });
        break;
      case 'VOICE_UNIFORMITY':
        constraints.push({ kind: 'free_form', description: 'Give each character a distinct vocabulary. Characters should believe and express things in different ways — one speaks in absolutes, another in conditionals, etc.' });
        break;
      default:
        if (w.penalty >= 15) {
          constraints.push({ kind: 'free_form', description: `Quality fix required: ${w.message}` });
        }
    }
  }

  return constraints;
}

// ── Arc-completion → constraint ───────────────────────────────────────────────

export function arcConstraintsFromTracker(
  promises: OpenPromise[],
  maxConstraints = 3,
): GenerationConstraint[] {
  const urgentPromises = promises
    .filter(p => p.urgency === 'overdue' || p.urgency === 'due_soon')
    .slice(0, maxConstraints);

  return urgentPromises.map(p => {
    const base = p.description;
    switch (p.kind) {
      case 'CLUE':
        return { kind: 'must_seed_clue' as const, description: `Resolve arc promise: ${base}. Use a PAYOFF_SETUP op.`, detail: p.promiseId.replace('clue:', '') };
      case 'CLOCK':
        return { kind: 'free_form' as const, description: `Resolve arc promise: ${base}. Add a RAISE_CLOCK with a negative amount to count it down.` };
      case 'REL':
        return { kind: 'free_form' as const, description: `Resolve arc promise: ${base}. Add a positive SHIFT_RELATIONSHIP to begin the recovery arc.` };
      case 'THEME':
        return { kind: 'free_form' as const, description: `Resolve arc promise: ${base}. Add an ADVANCE_THEME_ARGUMENT with move='resolve'.` };
      case 'OBJECT':
        return { kind: 'free_form' as const, description: `Resolve arc promise: ${base}. Advance the ADVANCE_OBJECT_ARC to a terminal state (destroyed, resolved, returned, complete, found).` };
    }
  });
}

// ── Propp → constraint ────────────────────────────────────────────────────────

export function proppConstraintsFromAnalysis(
  analysis: ProppAnalysis,
): GenerationConstraint[] {
  // Only push constraints for the 2 most narratively urgent missing stages.
  // We prefer complication > mediation > departure > ordeal > consequence > resolution.
  const PROPP_PRIORITY: ProppStage[] = [
    'complication', 'mediation', 'departure', 'ordeal', 'consequence', 'resolution', 'preparation',
  ];

  const urgentAbsent = PROPP_PRIORITY.filter(s => analysis.absent.includes(s)).slice(0, 2);

  const PROPP_GUIDANCE: Record<string, string> = {
    complication: 'Include a complication (APPRAISE_EMOTION with fear/distress OR RAISE_CLOCK) — the lack/villainy that drives the story.',
    mediation: 'Include a mediation beat: have a character receive information via a "told" UPDATE_BELIEF — the call to action.',
    departure: 'Include a departure beat: a character commits to a course of action via ADVANCE_OBJECT_ARC.',
    ordeal: 'Include an ordeal: a confrontation or setback via a negative SHIFT_RELATIONSHIP.',
    consequence: 'Include a consequence: a positive SHIFT_RELATIONSHIP or PAYOFF_SETUP — the result of the ordeal.',
    resolution: 'Include a resolution: advance the theme argument to "resolve" via ADVANCE_THEME_ARGUMENT.',
    preparation: 'Include a preparation beat: establish the world with ADD_FACT or RECORD_VISUAL_FACT.',
  };

  return urgentAbsent.map(stage => ({
    kind: 'free_form' as const,
    description: `Propp stage "${stage}" is absent — ${PROPP_GUIDANCE[stage]}`,
  }));
}

// ── Compose: proof failures + quality + arc + propp → full constraint list ────

export function buildQualityAwareConstraints(
  proofConstraints: GenerationConstraint[],
  qualityWarnings: QualityWarning[],
  openPromises: OpenPromise[],
  proppAnalysis: ProppAnalysis,
): GenerationConstraint[] {
  return [
    ...proofConstraints,
    ...qualityConstraintsFromWarnings(qualityWarnings),
    ...arcConstraintsFromTracker(openPromises, 2),
    ...proppConstraintsFromAnalysis(proppAnalysis),
  ];
}
