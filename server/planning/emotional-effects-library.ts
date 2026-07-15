// ── Emotional Effects Library ────────────────────────────────────────────────
// Pre-defined emotional effects for common dramatic actions.
// Maps action types to their emotional and audience effects.

import type {
  APDLAction,
  EmotionalEffect,
  EmotionalPrecondition,
  AudienceEffect,
} from './apdl';

/**
 * Template for an action's emotional profile.
 */
export interface EmotionalActionTemplate {
  /** Emotional effects on characters */
  effects: EmotionalEffect[];
  
  /** Emotional preconditions required */
  preconditions: EmotionalPrecondition[];
  
  /** Effects on audience state */
  audience_effects?: AudienceEffect[];
  
  /** Dramatic weight of this action */
  dramatic_weight?: number;
  
  /** Human-readable description */
  description: string;
}

/**
 * Library of emotional effects for common dramatic actions.
 * These can be applied to PDDL actions to create APDL actions.
 */
export const EMOTIONAL_EFFECTS_LIBRARY: Record<string, EmotionalActionTemplate> = {
  // ── Betrayal & Trust ───────────────────────────────────────────────────────
  
  betray: {
    description: 'Character betrays another\'s trust for their own gain',
    dramatic_weight: 9,
    effects: [
      { character: 'target', emotion: 'betrayed', delta: 0.9, decay_rate: 0.05 },
      { character: 'target', emotion: 'anger', delta: 0.7, decay_rate: 0.08 },
      { character: 'target', emotion: 'trust', delta: -0.8, decay_rate: 0.02 },
      { character: 'actor', emotion: 'guilt', delta: 0.5, decay_rate: 0.1 },
      { character: 'actor', emotion: 'pride', delta: 0.3, decay_rate: 0.15 },
    ],
    preconditions: [
      { character: 'target', emotion: 'trust', min_intensity: 0.4, reason: 'Cannot betray without established trust' },
    ],
    audience_effects: [
      { type: 'tension_increase', intensity: 0.8, description: 'Betrayal creates dramatic tension' },
    ],
  },

  reconcile: {
    description: 'Two characters resolve conflict and restore relationship',
    dramatic_weight: 7,
    effects: [
      { character: 'both', emotion: 'relief', delta: 0.6, decay_rate: 0.12 },
      { character: 'both', emotion: 'betrayed', delta: -0.4, decay_rate: 0.1 },
      { character: 'both', emotion: 'anger', delta: -0.5, decay_rate: 0.1 },
      { character: 'both', emotion: 'trust', delta: 0.3, decay_rate: 0.05 },
    ],
    preconditions: [
      { character: 'both', emotion: 'regret', min_intensity: 0.3, reason: 'Reconciliation requires acknowledgment of hurt' },
      { character: 'both', emotion: 'anger', max_intensity: 0.7, reason: 'Too much anger prevents reconciliation' },
    ],
    audience_effects: [
      { type: 'tension_release', intensity: 0.7, description: 'Cathartic resolution' },
    ],
  },

  build_trust: {
    description: 'Character performs an action that builds trust',
    dramatic_weight: 4,
    effects: [
      { character: 'target', emotion: 'trust', delta: 0.3, decay_rate: 0.05 },
      { character: 'target', emotion: 'admiration', delta: 0.2, decay_rate: 0.1 },
      { character: 'actor', emotion: 'pride', delta: 0.2, decay_rate: 0.12 },
    ],
    preconditions: [],
    audience_effects: [
      { type: 'engagement_boost', intensity: 0.4, description: 'Audience invests in relationship' },
    ],
  },

  // ── Secrets & Revelation ───────────────────────────────────────────────────

  reveal_secret: {
    description: 'Character reveals a hidden truth or secret',
    dramatic_weight: 8,
    effects: [
      { character: 'actor', emotion: 'vulnerable', delta: 0.7, decay_rate: 0.1 },
      { character: 'actor', emotion: 'relief', delta: 0.4, decay_rate: 0.15 },
      { character: 'target', emotion: 'shocked', delta: 0.8, decay_rate: 0.2 },
      { character: 'target', emotion: 'betrayed', delta: 0.3, decay_rate: 0.1, condition: 'secret was withheld maliciously' },
    ],
    preconditions: [
      { character: 'actor', emotion: 'trust', min_intensity: 0.3, reason: 'Requires minimum trust to be vulnerable' },
    ],
    audience_effects: [
      { type: 'irony_resolution', intensity: 0.9, description: 'Resolves dramatic irony if audience already knew' },
      { type: 'tension_increase', intensity: 0.6, description: 'Revelation creates new dramatic stakes' },
    ],
  },

  discover_secret: {
    description: 'Character uncovers a hidden truth they weren\'t meant to know',
    dramatic_weight: 7,
    effects: [
      { character: 'actor', emotion: 'shocked', delta: 0.7, decay_rate: 0.15 },
      { character: 'actor', emotion: 'fear', delta: 0.4, decay_rate: 0.1, condition: 'secret is dangerous' },
      { character: 'actor', emotion: 'betrayed', delta: 0.5, decay_rate: 0.08, condition: 'secret involves actor' },
      { character: 'target', emotion: 'fear', delta: 0.6, decay_rate: 0.1, condition: 'target learns of discovery' },
    ],
    preconditions: [],
    audience_effects: [
      { type: 'irony_creation', intensity: 0.8, description: 'Audience now knows more than other characters' },
      { type: 'tension_increase', intensity: 0.7, description: 'Dramatic stakes increase' },
    ],
  },

  keep_secret: {
    description: 'Character consciously withholds important information',
    dramatic_weight: 5,
    effects: [
      { character: 'actor', emotion: 'guilt', delta: 0.4, decay_rate: 0.05 },
      { character: 'actor', emotion: 'fear', delta: 0.3, decay_rate: 0.08 },
    ],
    preconditions: [],
    audience_effects: [
      { type: 'irony_creation', intensity: 0.6, description: 'Creates gap between audience and character knowledge' },
      { type: 'tension_increase', intensity: 0.5, description: 'Withheld information builds tension' },
    ],
  },

  // ── Confrontation & Conflict ───────────────────────────────────────────────

  confront: {
    description: 'Character directly challenges another about their actions',
    dramatic_weight: 8,
    effects: [
      { character: 'actor', emotion: 'anger', delta: 0.6, decay_rate: 0.12 },
      { character: 'actor', emotion: 'fear', delta: 0.3, decay_rate: 0.15 },
      { character: 'target', emotion: 'fear', delta: 0.5, decay_rate: 0.12 },
      { character: 'target', emotion: 'anger', delta: 0.4, decay_rate: 0.12 },
      { character: 'target', emotion: 'shame', delta: 0.4, decay_rate: 0.1, condition: 'confrontation is justified' },
    ],
    preconditions: [
      { character: 'actor', emotion: 'anger', min_intensity: 0.4, reason: 'Confrontation requires emotional fuel' },
      { character: 'actor', emotion: 'fear', max_intensity: 0.8, reason: 'Too much fear prevents confrontation' },
    ],
    audience_effects: [
      { type: 'tension_increase', intensity: 0.9, description: 'Direct conflict heightens drama' },
    ],
  },

  threaten: {
    description: 'Character makes explicit threats to coerce another',
    dramatic_weight: 7,
    effects: [
      { character: 'actor', emotion: 'anger', delta: 0.5, decay_rate: 0.1 },
      { character: 'target', emotion: 'fear', delta: 0.8, decay_rate: 0.1 },
      { character: 'target', emotion: 'anger', delta: 0.4, decay_rate: 0.12 },
      { character: 'target', emotion: 'trust', delta: -0.6, decay_rate: 0.05 },
    ],
    preconditions: [
      { character: 'actor', emotion: 'anger', min_intensity: 0.3, reason: 'Threats require emotional intensity' },
    ],
    audience_effects: [
      { type: 'tension_increase', intensity: 0.8, description: 'Explicit threats raise stakes' },
    ],
  },

  de_escalate: {
    description: 'Character attempts to calm a tense situation',
    dramatic_weight: 5,
    effects: [
      { character: 'all', emotion: 'anger', delta: -0.3, decay_rate: 0.15 },
      { character: 'all', emotion: 'fear', delta: -0.2, decay_rate: 0.15 },
      { character: 'actor', emotion: 'relief', delta: 0.3, decay_rate: 0.15 },
    ],
    preconditions: [
      { character: 'actor', emotion: 'anger', max_intensity: 0.5, reason: 'Cannot de-escalate while very angry' },
    ],
    audience_effects: [
      { type: 'tension_release', intensity: 0.4, description: 'Temporary relief from conflict' },
    ],
  },

  // ── Deception & Manipulation ───────────────────────────────────────────────

  lie: {
    description: 'Character deliberately deceives another',
    dramatic_weight: 6,
    effects: [
      { character: 'actor', emotion: 'guilt', delta: 0.4, decay_rate: 0.08, condition: 'actor has conscience' },
      { character: 'actor', emotion: 'fear', delta: 0.3, decay_rate: 0.1 },
      { character: 'actor', emotion: 'pride', delta: 0.2, decay_rate: 0.15, condition: 'lie is successful' },
    ],
    preconditions: [],
    audience_effects: [
      { type: 'irony_creation', intensity: 0.7, description: 'Audience knows the truth while character is deceived' },
      { type: 'tension_increase', intensity: 0.6, description: 'Deception creates dramatic tension' },
    ],
  },

  expose_lie: {
    description: 'Character reveals another\'s deception',
    dramatic_weight: 8,
    effects: [
      { character: 'actor', emotion: 'anger', delta: 0.6, decay_rate: 0.1 },
      { character: 'target', emotion: 'shame', delta: 0.7, decay_rate: 0.1 },
      { character: 'target', emotion: 'fear', delta: 0.5, decay_rate: 0.12 },
      { character: 'target', emotion: 'anger', delta: 0.4, decay_rate: 0.15 },
    ],
    preconditions: [
      { character: 'actor', emotion: 'betrayed', min_intensity: 0.3, reason: 'Requires sense of being wronged' },
    ],
    audience_effects: [
      { type: 'irony_resolution', intensity: 0.9, description: 'Truth revealed to all parties' },
      { type: 'tension_increase', intensity: 0.8, description: 'Exposed lies escalate conflict' },
    ],
  },

  manipulate: {
    description: 'Character subtly influences another for their own ends',
    dramatic_weight: 6,
    effects: [
      { character: 'actor', emotion: 'pride', delta: 0.3, decay_rate: 0.12 },
      { character: 'actor', emotion: 'guilt', delta: 0.2, decay_rate: 0.1, condition: 'actor has empathy' },
      { character: 'target', emotion: 'trust', delta: 0.2, decay_rate: 0.08, condition: 'manipulation is subtle' },
    ],
    preconditions: [],
    audience_effects: [
      { type: 'irony_creation', intensity: 0.6, description: 'Audience sees manipulation target doesn\'t' },
      { type: 'engagement_boost', intensity: 0.5, description: 'Audience anticipates consequences' },
    ],
  },

  // ── Vulnerability & Connection ─────────────────────────────────────────────

  confess_feelings: {
    description: 'Character admits romantic or deep emotional feelings',
    dramatic_weight: 7,
    effects: [
      { character: 'actor', emotion: 'vulnerable', delta: 0.8, decay_rate: 0.1 },
      { character: 'actor', emotion: 'fear', delta: 0.5, decay_rate: 0.15 },
      { character: 'actor', emotion: 'hope', delta: 0.6, decay_rate: 0.1 },
      { character: 'target', emotion: 'shocked', delta: 0.5, decay_rate: 0.2 },
      { character: 'target', emotion: 'love', delta: 0.4, decay_rate: 0.05, condition: 'feelings are mutual' },
    ],
    preconditions: [
      { character: 'actor', emotion: 'love', min_intensity: 0.5, reason: 'Must have strong feelings to confess' },
      { character: 'actor', emotion: 'trust', min_intensity: 0.3, reason: 'Requires minimum trust' },
    ],
    audience_effects: [
      { type: 'engagement_boost', intensity: 0.7, description: 'Vulnerable moments increase investment' },
      { type: 'tension_increase', intensity: 0.5, description: 'Outcome uncertain' },
    ],
  },

  offer_support: {
    description: 'Character provides emotional support or comfort',
    dramatic_weight: 4,
    effects: [
      { character: 'target', emotion: 'relief', delta: 0.4, decay_rate: 0.12 },
      { character: 'target', emotion: 'trust', delta: 0.3, decay_rate: 0.05 },
      { character: 'target', emotion: 'distress', delta: -0.3, decay_rate: 0.15 },
      { character: 'actor', emotion: 'pride', delta: 0.2, decay_rate: 0.15 },
    ],
    preconditions: [
      { character: 'target', emotion: 'distress', min_intensity: 0.3, reason: 'Support requires distress to address' },
    ],
    audience_effects: [
      { type: 'engagement_boost', intensity: 0.4, description: 'Compassion increases emotional investment' },
    ],
  },

  reject: {
    description: 'Character rebuffs another\'s emotional overture',
    dramatic_weight: 6,
    effects: [
      { character: 'target', emotion: 'shame', delta: 0.6, decay_rate: 0.1 },
      { character: 'target', emotion: 'disappointment', delta: 0.7, decay_rate: 0.1 },
      { character: 'target', emotion: 'anger', delta: 0.4, decay_rate: 0.12 },
      { character: 'actor', emotion: 'guilt', delta: 0.3, decay_rate: 0.1, condition: 'actor cares about target' },
    ],
    preconditions: [],
    audience_effects: [
      { type: 'tension_increase', intensity: 0.6, description: 'Rejection creates conflict' },
    ],
  },

  // ── Alliance & Loyalty ─────────────────────────────────────────────────────

  form_alliance: {
    description: 'Characters agree to work together toward common goal',
    dramatic_weight: 6,
    effects: [
      { character: 'both', emotion: 'trust', delta: 0.4, decay_rate: 0.08 },
      { character: 'both', emotion: 'hope', delta: 0.5, decay_rate: 0.1 },
      { character: 'both', emotion: 'relief', delta: 0.3, decay_rate: 0.15 },
    ],
    preconditions: [
      { character: 'both', emotion: 'trust', min_intensity: 0.2, reason: 'Minimum trust required for alliance' },
    ],
    audience_effects: [
      { type: 'engagement_boost', intensity: 0.5, description: 'New dynamics create interest' },
    ],
  },

  break_alliance: {
    description: 'Character abandons or betrays an alliance',
    dramatic_weight: 8,
    effects: [
      { character: 'target', emotion: 'betrayed', delta: 0.8, decay_rate: 0.06 },
      { character: 'target', emotion: 'anger', delta: 0.7, decay_rate: 0.1 },
      { character: 'actor', emotion: 'guilt', delta: 0.4, decay_rate: 0.1 },
      { character: 'actor', emotion: 'fear', delta: 0.3, decay_rate: 0.12 },
    ],
    preconditions: [
      { character: 'both', emotion: 'trust', min_intensity: 0.3, reason: 'Must have alliance to break' },
    ],
    audience_effects: [
      { type: 'tension_increase', intensity: 0.9, description: 'Alliance break is major dramatic turn' },
    ],
  },

  protect: {
    description: 'Character shields another from harm or danger',
    dramatic_weight: 7,
    effects: [
      { character: 'target', emotion: 'trust', delta: 0.5, decay_rate: 0.05 },
      { character: 'target', emotion: 'admiration', delta: 0.4, decay_rate: 0.1 },
      { character: 'target', emotion: 'relief', delta: 0.4, decay_rate: 0.15 },
      { character: 'actor', emotion: 'pride', delta: 0.3, decay_rate: 0.12 },
      { character: 'actor', emotion: 'fear', delta: 0.4, decay_rate: 0.15, condition: 'protection is risky' },
    ],
    preconditions: [],
    audience_effects: [
      { type: 'engagement_boost', intensity: 0.6, description: 'Selfless acts increase investment' },
      { type: 'tension_increase', intensity: 0.5, description: 'Danger to protector' },
    ],
  },

  // ── Achievement & Failure ──────────────────────────────────────────────────

  achieve_goal: {
    description: 'Character successfully accomplishes important objective',
    dramatic_weight: 7,
    effects: [
      { character: 'actor', emotion: 'joy', delta: 0.8, decay_rate: 0.12 },
      { character: 'actor', emotion: 'pride', delta: 0.6, decay_rate: 0.1 },
      { character: 'actor', emotion: 'relief', delta: 0.5, decay_rate: 0.15 },
    ],
    preconditions: [],
    audience_effects: [
      { type: 'tension_release', intensity: 0.7, description: 'Goal achievement provides catharsis' },
    ],
  },

  fail_goal: {
    description: 'Character\'s important objective is thwarted',
    dramatic_weight: 7,
    effects: [
      { character: 'actor', emotion: 'distress', delta: 0.7, decay_rate: 0.1 },
      { character: 'actor', emotion: 'shame', delta: 0.5, decay_rate: 0.1, condition: 'failure is public' },
      { character: 'actor', emotion: 'disappointment', delta: 0.6, decay_rate: 0.12 },
      { character: 'actor', emotion: 'anger', delta: 0.4, decay_rate: 0.15, condition: 'failure caused by another' },
    ],
    preconditions: [],
    audience_effects: [
      { type: 'tension_increase', intensity: 0.6, description: 'Failure raises stakes' },
    ],
  },

  sacrifice: {
    description: 'Character gives up something important for another',
    dramatic_weight: 9,
    effects: [
      { character: 'actor', emotion: 'pride', delta: 0.5, decay_rate: 0.08 },
      { character: 'actor', emotion: 'distress', delta: 0.6, decay_rate: 0.1 },
      { character: 'target', emotion: 'admiration', delta: 0.7, decay_rate: 0.08 },
      { character: 'target', emotion: 'trust', delta: 0.6, decay_rate: 0.05 },
      { character: 'target', emotion: 'guilt', delta: 0.4, decay_rate: 0.1, condition: 'target feels unworthy' },
    ],
    preconditions: [
      { character: 'actor', emotion: 'love', min_intensity: 0.4, reason: 'Sacrifice requires deep care' },
    ],
    audience_effects: [
      { type: 'engagement_boost', intensity: 0.9, description: 'Sacrifice is deeply moving' },
      { type: 'tension_release', intensity: 0.6, description: 'Noble sacrifice provides catharsis' },
    ],
  },
};

/**
 * Get an emotional template by action name.
 */
export function getEmotionalTemplate(actionName: string): EmotionalActionTemplate | undefined {
  return EMOTIONAL_EFFECTS_LIBRARY[actionName];
}

/**
 * Apply an emotional template to a base PDDL action to create an APDL action.
 */
export function enrichActionWithEmotions(
  baseAction: any,  // PDDLAction
  templateName: string
): APDLAction | null {
  const template = getEmotionalTemplate(templateName);
  if (!template) return null;
  
  return {
    ...baseAction,
    emotional_effects: template.effects,
    emotional_preconditions: template.preconditions,
    audience_effects: template.audience_effects,
    dramatic_weight: template.dramatic_weight,
  };
}

/**
 * Get all available emotional action templates.
 */
export function getAllEmotionalTemplates(): string[] {
  return Object.keys(EMOTIONAL_EFFECTS_LIBRARY);
}

/**
 * Find emotional templates by dramatic weight (sorted descending).
 */
export function getTemplatesByDramaticWeight(minWeight: number = 0): Array<[string, EmotionalActionTemplate]> {
  return Object.entries(EMOTIONAL_EFFECTS_LIBRARY)
    .filter(([, template]) => (template.dramatic_weight || 0) >= minWeight)
    .sort((a, b) => (b[1].dramatic_weight || 0) - (a[1].dramatic_weight || 0));
}
