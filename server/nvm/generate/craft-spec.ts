// Craft Spec v1 — injectable screenwriting-mechanism guidance for the
// generative shell (LLM SENSE/GENERATE surface only).
//
// LLMs may SENSE and GENERATE in this codebase but never SCORE — this module
// is pure prompt-construction data/string-building. It must never be
// imported by, or influence, the deterministic doctor/scoring path
// (server/nvm/analyze/doctor.ts and friends). It only shapes what generation
// prompts ask the model to attempt; it never touches how a script is judged.
//
// Source: data/craft/CRAFT_SPEC_V1.md, distilled from close reading of 22
// professional screenplays (8 animation, 14 live-action). That document
// states directives only — no screenplay text is reproduced there or here.
//
// Integration note: this module was added as a user-directed, explicitly
// approved exception to the ROADMAP P0 "validate with real writers before
// new engine work" gate (see NORTH_STAR / ROADMAP). It is scoped narrowly to
// prompt construction and does not touch scoring, validation, or the public
// API surface.

export interface CraftSection {
  title: string;
  directives: string[];
}

export const CRAFT_SPEC_VERSION = 'v1';

export interface CraftSpec {
  sceneConstruction: CraftSection;
  dialogue: CraftSection;
  reversals: CraftSection;
  pacing: CraftSection;
  exposition: CraftSection;
  conflictArchitecture: CraftSection;
  animation: CraftSection;
  failureModes: CraftSection;
}

export const CRAFT_SPEC: CraftSpec = {
  sceneConstruction: {
    title: 'Scene Construction',
    directives: [
      'Enter late, in motion, mid-consequence — open on a detail, a sound, or a fragment of motion, never a static establishing description.',
      'When a scene must establish a new space, do it through a character moving through and using the space, not a description block.',
      'Exit on rupture, not resolution — end scenes on an interruption, an unresolved question, or a shock; cut one line earlier than the comfortable, settled button.',
      'Fragment a single continuous physical event into many micro-sluglines (location-within-location) when momentum and geography both matter — fast action, farce, sieges.',
    ],
  },
  dialogue: {
    title: 'Dialogue Craft',
    directives: [
      'Default to short lines (roughly under ten words) with real interruption; reserve long uninterrupted speeches for deliberate effect, never the ordinary register.',
      'Give every character a distinct default register. Register contrast — mythic vs vernacular, formal vs profane, earnest vs deflecting — is a primary characterization tool; do not let every character in a scene share a cadence.',
      'Withhold sincerity, then drop irony entirely for the beat that needs it — strip wit and one-liners so a real-stakes moment reads as a shift by contrast with the surrounding voice.',
      'Deliver exposition-heavy dialogue adversarially, under duress, or overheard — never as a calm two-person briefing scene.',
      'Let withholding a direct answer BE the dialogue — a character deflecting or circling a question generates tension by delaying the answer, not the question.',
    ],
  },
  reversals: {
    title: 'Reversal & Setup/Payoff Mechanics',
    directives: [
      'Plant reversals through behavior and objects, not lines. If a reversal requires a character to explain what it means, the setup was insufficient — fix the setup, not the payoff line.',
      'Prefer long-range setup (multiple sequences, sometimes acts, before payoff) over short-range setup. Distance between setup and payoff is a craft strength, not a risk to minimize; a same-scene payoff reads as a twist, not an earned turn.',
      'Convert an established flaw or weakness into the literal mechanism of victory rather than introducing a new, unearned capability at the climax.',
      'Let a reversal be confirmed by a reaction shot or a consequence, not narrated — avoid a character or the narration explaining the twist to the audience.',
      'Withholding the expected capitulation at the exact expected moment is a valid climax mechanic, but only when the expectation was rigorously primed in the preceding sequence.',
    ],
  },
  pacing: {
    title: 'Pacing & Sequence Rhythm',
    directives: [
      'Vary scene length deliberately — alternate extended, unbroken sequences against short, hard-cut connective scenes. Flat, uniform scene length reads as under-crafted.',
      'Name montage explicitly on the page to compress skill acquisition, courtship, or procedural setup — do not bury compressed time inside a vague scene description.',
      'Escalate cut frequency toward the climax; tie cutting rhythm to narrative urgency rather than holding a constant rhythm throughout.',
      'Use ensemble/parallel cross-cutting as a climax engine only when the story has genuinely earned ensemble scale, not as a default.',
      'A frame device can slow-release its own payoff across the entire runtime — use it deliberately, not as an unplanned frame that never pays off.',
    ],
  },
  exposition: {
    title: 'Exposition Discipline',
    directives: [
      'Show the rule in action, then let characters disagree about what it means, rather than a single explainer scene that establishes the rule once and never returns to it.',
      'Front-load myth/historical context in one compact framing passage; reserve later exposition for procedural or tactical information the plot actually needs scene-by-scene.',
      'Route plot information through conflict, evidence, or eavesdropping — never a character calmly explaining backstory to another character with no other function in the scene.',
      'Prefer visual and behavioral worldbuilding — staging, signage, ritual, blocking — over a line of dialogue whenever the world\'s rules can be shown instead of told.',
    ],
  },
  conflictArchitecture: {
    title: 'Conflict Architecture',
    directives: [
      'Layer at least two, usually three, concurrent obstacle types — internal/identity, interpersonal/relational, external/institutional or antagonist — active together by end of act one. Single-track conflict is a failure mode.',
      'Make the external antagonist mirror or amplify the protagonist\'s internal flaw or desire at a different scale, rather than running an unrelated track that happens to resolve at the same time.',
      'Escalate by widening scope (individual to institutional to civilizational) or by narrowing safety margin — not simply by raising the danger of the same-scale threat repeatedly.',
      'Choose a deliberate relationship between trust erosion and threat escalation — lockstep or inverse — and hold it consistent; do not let interpersonal trust drift independently of plot stakes.',
    ],
  },
  animation: {
    title: 'Animation-Specific Technique',
    directives: [
      'Treat visual-gag grammar as load-bearing structure, not garnish — freeze-frame captions, genre-parody narration, and physically impossible sight gags can carry plot weight, not just punctuate a joke.',
      'Hold sincerity and irony in the same scene rather than segregating them by scene type — a joke-adjacent register can run directly underneath a sincere moment without pausing for either.',
      'Write a deliberate kid+adult dual register: state the child-legible version of a scene plainly in action/dialogue, and let a second, adult-legible layer live in subtext, staging, or a supporting character\'s aside — never require cutting the child-legible surface.',
      'Physicalize emotion as a literal mechanic (a device standing in for trust, an incompatibility standing in for forbidden connection) before reaching for voice-over or a quiet confessional dialogue scene.',
      'Do not import live-action\'s "let the silence do the work" restraint into an animated register without deliberately choosing to break form — animation in this sample almost never withholds through silence, even at its darkest beats.',
    ],
  },
  failureModes: {
    title: 'Common Failure Modes to Avoid',
    directives: [
      'A scene that opens with a static establishing description before any character acts or speaks.',
      'A dialogue exchange where every character shares the same register and vocabulary.',
      'A reversal explained by a character stating what it means immediately after it happens.',
      'Uniform scene length across a script, with no deliberate variance by sequence function.',
      'A calm two-person sit-down scene whose only function is delivering backstory.',
      'Sincerity and comedy occupying identical register throughout a scene with no shift (unless deliberately sustained via the animation dual-register technique above).',
      'An external antagonist whose motivation is unrelated to the protagonist\'s internal arc.',
      'Setup and payoff occurring within the same scene, or the immediately following one.',
    ],
  },
};

const FOUR_STEP_FRAMING = [
  'Apply this craft spec in four steps for every scene you write or revise:',
  '  1. RECOGNIZE — identify which mechanisms this beat needs, given its story function, act position, and the scenes around it.',
  '  2. CONSTRUCT — write (or revise) the scene using those mechanisms as load-bearing structure, not decoration layered on afterward.',
  '  3. TEST — check the result against the failure-mode list below; a hit means a mechanism was named but not actually built.',
  '  4. REWRITE — if a failure mode fires, rebuild the specific mechanism that failed. Do not patch around it with an extra line of dialogue.',
].join('\n');

const OUTPUT_DISCIPLINE =
  'OUTPUT DISCIPLINE: apply these as reusable dramatic MECHANISMS — entry/exit pattern, register contrast, ' +
  'setup/payoff distance, escalation shape — never as resemblance to any specific existing scene, character, or line ' +
  'from the screenplays this spec was distilled from. Generate wholly original content; do not quote, paraphrase, or ' +
  'reconstruct scenes from the sampled scripts.';

function renderSection(section: CraftSection, compact: boolean): string {
  const bullets = compact ? section.directives.slice(0, 2) : section.directives;
  return [`${section.title}:`, ...bullets.map(d => `- ${d}`)].join('\n');
}

export interface CraftPromptOptions {
  /** Include the animation-specific section. Default false (no reliable
   *  animation signal exists on most call sites; pass true when the caller
   *  knows the project targets animation). */
  animation?: boolean;
  /** Render only the first 2 directives per section, to control prompt
   *  length in budget-sensitive call sites. Default false (full spec). */
  compact?: boolean;
  /** Force on/off regardless of the env escape hatch. Primarily for tests;
   *  production call sites should leave this unset and rely on
   *  craftSpecEnabled(). */
  enabled?: boolean;
}

/** Escape hatch: set STORYMACHINE_DISABLE_CRAFT_SPEC=1 (or "true") to opt a
 *  deployment out of craft-spec injection entirely, without adding a new
 *  user-facing toggle. Default is ON. */
const DISABLE_ENV_VAR = 'STORYMACHINE_DISABLE_CRAFT_SPEC';

export function craftSpecEnabled(): boolean {
  const raw = process.env[DISABLE_ENV_VAR];
  return !(raw === '1' || raw === 'true');
}

/** Best-effort heuristic for "this project targets animation" from a free-text
 *  genre string — the engine's genre roster has no dedicated animation/format
 *  field. Callers with a more reliable signal should pass `animation` directly
 *  to buildCraftPromptSection() instead of relying on this. */
export function looksLikeAnimationGenre(genre?: string | null): boolean {
  if (!genre || typeof genre !== 'string') return false;
  return /animat/i.test(genre);
}

/**
 * Render the craft spec as a prompt block for injection into a generation
 * system/context prompt. Returns '' when disabled (env escape hatch or
 * explicit opts.enabled = false) so callers can splice the result directly
 * into a joined prompt array without conditional branching.
 */
export function buildCraftPromptSection(opts: CraftPromptOptions = {}): string {
  const enabled = opts.enabled ?? craftSpecEnabled();
  if (!enabled) return '';

  const { animation = false, compact = false } = opts;

  const sections: CraftSection[] = [
    CRAFT_SPEC.sceneConstruction,
    CRAFT_SPEC.dialogue,
    CRAFT_SPEC.reversals,
    CRAFT_SPEC.pacing,
    CRAFT_SPEC.exposition,
    CRAFT_SPEC.conflictArchitecture,
    ...(animation ? [CRAFT_SPEC.animation] : []),
  ];

  const body = sections.map(s => renderSection(s, compact)).join('\n\n');
  const failureModes = renderSection(CRAFT_SPEC.failureModes, false);

  return [
    `CRAFT SPEC (${CRAFT_SPEC_VERSION}) — professional screenwriting mechanisms distilled from 22 produced screenplays.`,
    FOUR_STEP_FRAMING,
    '',
    body,
    '',
    failureModes,
    '',
    OUTPUT_DISCIPLINE,
  ].join('\n');
}
