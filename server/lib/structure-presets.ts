import type { OutlineBeat } from '../engine/types.ts';

// ── Structure Preset Beat Templates ───────────────────────────────────────────
// Each template defines beats as percentages (0–100) of the total expected
// session length so they scale correctly to any session duration.
// instantiatePreset() converts them to absolute turn numbers.

interface BeatTemplate {
  name: string;
  pct_start: number;
  pct_end: number;
  goal: string;
  constraint: string;
  avoid: string;
}

const STRUCTURE_BEATS: Record<string, BeatTemplate[]> = {

  // ── Save the Cat (Blake Snyder, 15 beats) ─────────────────────────────────
  save_the_cat: [
    {
      name: 'Opening Image',
      pct_start: 0, pct_end: 5,
      goal: 'Establish the protagonist\'s flawed status quo. The world before the story begins.',
      constraint: 'No plot movement yet. This is pure atmosphere and character imprint.',
      avoid: 'Conflict, reveals, or any hint of the central problem.',
    },
    {
      name: 'Theme Stated',
      pct_start: 5, pct_end: 10,
      goal: 'Someone states — obliquely — what the story is ultimately about. The hero doesn\'t understand it yet.',
      constraint: 'The theme must be implicit, not a lecture. It should feel like casual conversation.',
      avoid: 'Making the protagonist agree with the theme. They must resist or miss the point entirely.',
    },
    {
      name: 'Set-up',
      pct_start: 10, pct_end: 22,
      goal: 'Introduce all A-story characters. Establish the six things that need fixing in the protagonist\'s world.',
      constraint: 'Plant everything that will pay off later. Nothing is wasted.',
      avoid: 'Major revelations or irreversible decisions.',
    },
    {
      name: 'Catalyst',
      pct_start: 22, pct_end: 26,
      goal: 'The inciting incident. Something happens that disrupts the status quo permanently.',
      constraint: 'This event must be external — it happens TO the protagonist.',
      avoid: 'Internal epiphanies. The protagonist must be acted upon, not self-starting.',
    },
    {
      name: 'Debate',
      pct_start: 26, pct_end: 35,
      goal: 'The protagonist resists the call. The dramatic question is raised: will they accept the challenge?',
      constraint: 'The protagonist must seriously consider NOT going on the journey.',
      avoid: 'Easy commitment. The debate must feel genuine and costly.',
    },
    {
      name: 'Break Into Two',
      pct_start: 35, pct_end: 38,
      goal: 'The protagonist makes a decisive choice. They leave safety behind and enter Act 2\'s world.',
      constraint: 'This is a point of no return. The protagonist initiates — not reacts.',
      avoid: 'Passive acceptance. The protagonist must CHOOSE.',
    },
    {
      name: 'B Story',
      pct_start: 38, pct_end: 44,
      goal: 'A new character or relationship emerges that carries the theme more explicitly than the A story.',
      constraint: 'This relationship must be the emotional heart of the story.',
      avoid: 'Making the B story feel like a subplot distraction from the main action.',
    },
    {
      name: 'Fun & Games',
      pct_start: 44, pct_end: 57,
      goal: 'Deliver the promise of the premise. Early wins — but with hidden costs. The audience sees the hero in their new world.',
      constraint: 'The protagonist should appear to be succeeding.',
      avoid: 'The all-is-lost moment. This is the fun section — real danger comes later.',
    },
    {
      name: 'Midpoint',
      pct_start: 57, pct_end: 61,
      goal: 'False victory OR false defeat. Something major is revealed. Stakes double.',
      constraint: 'This must meaningfully raise the consequence of failure.',
      avoid: 'A midpoint that doesn\'t change the fundamental dynamic of the story.',
    },
    {
      name: 'Bad Guys Close In',
      pct_start: 61, pct_end: 72,
      goal: 'The antagonistic forces regroup. Internal team conflict emerges. The hero\'s plan begins to fail.',
      constraint: 'Both external pressure AND internal disintegration must occur.',
      avoid: 'Easy victories or premature confrontations with the main antagonist.',
    },
    {
      name: 'All Is Lost',
      pct_start: 72, pct_end: 76,
      goal: 'The worst-case scenario. The protagonist hits rock bottom. Something dies — literally or symbolically.',
      constraint: 'This must feel genuinely unrecoverable. Hope must appear extinguished.',
      avoid: 'Cushioning the blow. If it doesn\'t hurt, it won\'t work.',
    },
    {
      name: 'Dark Night of the Soul',
      pct_start: 76, pct_end: 83,
      goal: 'The protagonist wallows in misery. They dig deeper than they\'ve ever gone. The answer is found in the B story.',
      constraint: 'No action yet. This is pure interior reckoning.',
      avoid: 'Easy epiphanies. The protagonist must earn their breakthrough.',
    },
    {
      name: 'Break Into Three',
      pct_start: 83, pct_end: 86,
      goal: 'The protagonist finds the solution that synthesizes the A story and B story lessons.',
      constraint: 'The solution must emerge from character transformation, not external luck.',
      avoid: 'A plan that could have been executed in Act 1.',
    },
    {
      name: 'Finale',
      pct_start: 86, pct_end: 97,
      goal: 'The protagonist executes the plan, defeats the antagonist, and transforms the world.',
      constraint: 'Execute the plan in sequence: Gather the team → Execute → Dig deep → High tower moment → New status quo.',
      avoid: 'Deus ex machina. Every victory must be earned through character growth.',
    },
    {
      name: 'Final Image',
      pct_start: 97, pct_end: 100,
      goal: 'Mirror image of the Opening Image. Show what has changed.',
      constraint: 'The contrast with the opening must be unmistakable.',
      avoid: 'Exposition about what changed. Show it.',
    },
  ],

  // ── Dan Harmon Story Circle (8 steps) ─────────────────────────────────────
  dan_harmon: [
    {
      name: 'You',
      pct_start: 0, pct_end: 12,
      goal: 'Establish the protagonist in their comfort zone. Show their identity and what they need.',
      constraint: 'The world must feel genuinely comfortable, even if flawed.',
      avoid: 'Introducing the need explicitly. It should be felt, not stated.',
    },
    {
      name: 'Need',
      pct_start: 12, pct_end: 25,
      goal: 'Something is wrong. A lack or desire is identified that disrupts the status quo.',
      constraint: 'The need must feel urgent and personal.',
      avoid: 'Resolving the need prematurely.',
    },
    {
      name: 'Go',
      pct_start: 25, pct_end: 38,
      goal: 'The protagonist crosses the threshold. They enter an unfamiliar world to pursue the need.',
      constraint: 'Crossing must feel like a genuine act of courage or desperation.',
      avoid: 'Returning to the comfort zone before completing the journey.',
    },
    {
      name: 'Search',
      pct_start: 38, pct_end: 50,
      goal: 'The protagonist adapts to the unfamiliar world. Encounters allies, obstacles, and temptations.',
      constraint: 'Progress must be hard-won — no easy answers.',
      avoid: 'Giving the protagonist exactly what they need. Make them work for it.',
    },
    {
      name: 'Find',
      pct_start: 50, pct_end: 62,
      goal: 'The protagonist gets what they wanted. A moment of apparent success — but something feels wrong.',
      constraint: 'The victory must be real, but incomplete.',
      avoid: 'Making the cost of the victory immediately apparent. Let hope linger briefly.',
    },
    {
      name: 'Take',
      pct_start: 62, pct_end: 75,
      goal: 'The protagonist takes the prize but pays a heavy price. The cost of the journey is revealed.',
      constraint: 'The price must be proportional to what was gained.',
      avoid: 'Minimizing the sacrifice. This is the darkest moment.',
    },
    {
      name: 'Return',
      pct_start: 75, pct_end: 88,
      goal: 'The protagonist returns to the familiar world, changed. They bring back what they found.',
      constraint: 'The return must feel genuinely transformed — not just physically changed.',
      avoid: 'A triumphant return that glosses over the cost.',
    },
    {
      name: 'Change',
      pct_start: 88, pct_end: 100,
      goal: 'The protagonist demonstrates their fundamental change through action. The circle is complete.',
      constraint: 'The change must be shown, not explained.',
      avoid: 'Reverting to the old self even under pressure.',
    },
  ],

  // ── John Yorke 5 Acts ─────────────────────────────────────────────────────
  john_yorke: [
    {
      name: 'Act 1 — The Ordinary World',
      pct_start: 0, pct_end: 20,
      goal: 'Establish the protagonist\'s ordinary world. Plant their central flaw — the mirror to the antagonist. End with the inciting incident.',
      constraint: 'The flaw must be structural, not superficial — it\'s what the story is really about.',
      avoid: 'Introducing the antagonist before the protagonist\'s flaw is legible.',
    },
    {
      name: 'Act 2 — Confronting the Problem',
      pct_start: 20, pct_end: 40,
      goal: 'Protagonist pursues their goal with incomplete self-knowledge. The antagonist mirrors and escalates their flaw.',
      constraint: 'The protagonist must not yet understand what the antagonist represents about themselves.',
      avoid: 'Premature self-awareness. The protagonist must still be wrong about themselves.',
    },
    {
      name: 'Act 3 — The Midpoint Crisis',
      pct_start: 40, pct_end: 60,
      goal: 'The protagonist\'s flaw is exposed in a moment of crisis. They face the defining choice of the story.',
      constraint: 'This is the fulcrum. Everything before leads here; everything after follows from it.',
      avoid: 'A choice that doesn\'t cost the protagonist something essential.',
    },
    {
      name: 'Act 4 — The Consequence',
      pct_start: 60, pct_end: 80,
      goal: 'The protagonist faces the consequence of their flaw and the midpoint choice. Dark night of the soul.',
      constraint: 'Consequences must feel earned and inevitable, not punitive.',
      avoid: 'Rescuing the protagonist from consequences they created.',
    },
    {
      name: 'Act 5 — Transformation',
      pct_start: 80, pct_end: 100,
      goal: 'The protagonist either defeats their flaw (comedy/drama) or is consumed by it (tragedy). The world is changed.',
      constraint: 'The resolution must emerge from the same flaw that was established in Act 1.',
      avoid: 'External salvation. The protagonist must resolve their own internal contradiction.',
    },
  ],

  // ── Freytag's Pyramid (5 acts, symmetric) ────────────────────────────────
  freytag: [
    {
      name: 'Exposition',
      pct_start: 0, pct_end: 18,
      goal: 'Establish the world, key characters, and the circumstances that precede the conflict.',
      constraint: 'The inciting incident should appear near the end of this act.',
      avoid: 'Rushing to conflict. The exposition establishes why the conflict matters.',
    },
    {
      name: 'Rising Action',
      pct_start: 18, pct_end: 45,
      goal: 'Complication upon complication. The protagonist moves toward their goal against escalating opposition.',
      constraint: 'Each obstacle must be more complex than the last.',
      avoid: 'Premature resolution. Every solved problem must reveal a larger one.',
    },
    {
      name: 'Climax',
      pct_start: 45, pct_end: 55,
      goal: 'The decisive moment. All forces collide. The outcome of the central conflict is determined.',
      constraint: 'The climax must feel like the inevitable culmination of everything before it.',
      avoid: 'Pulling punches. The climax must be the most intense, consequential scene.',
    },
    {
      name: 'Falling Action',
      pct_start: 55, pct_end: 80,
      goal: 'The consequences of the climax unfold. The protagonist\'s new fate is made clear.',
      constraint: 'No reversals or new major conflicts. The trajectory is now fixed.',
      avoid: 'Introducing new hope or plot complications that undo the climax\'s verdict.',
    },
    {
      name: 'Dénouement',
      pct_start: 80, pct_end: 100,
      goal: 'The final resolution. The new status quo is established. What has been destroyed and what survives.',
      constraint: 'Keep it brief. The story\'s essential truth has already been delivered.',
      avoid: 'Reopening questions the climax answered.',
    },
  ],

  // ── Sequence Approach (8 sequences of escalating self-contained arcs) ─────
  sequence: [
    {
      name: 'Sequence 1 — Status Quo Disrupted',
      pct_start: 0, pct_end: 13,
      goal: 'Establish the protagonist in their world. End with a disruption that poses the first dramatic question.',
      constraint: 'The disruption must require an immediate response.',
      avoid: 'Resolving the dramatic question within this sequence.',
    },
    {
      name: 'Sequence 2 — First Decision',
      pct_start: 13, pct_end: 25,
      goal: 'The protagonist commits to a course of action. The Act 1 stakes are fully established.',
      constraint: 'The commitment must feel irreversible.',
      avoid: 'Easy access to resources or allies. Make the protagonist work.',
    },
    {
      name: 'Sequence 3 — New World',
      pct_start: 25, pct_end: 38,
      goal: 'Protagonist pursues goal in the new world with apparent success. The premise is delivered.',
      constraint: 'Progress must feel real, even if fragile.',
      avoid: 'Revealing the hidden cost yet. Let the wins land.',
    },
    {
      name: 'Sequence 4 — Midpoint Crisis',
      pct_start: 38, pct_end: 50,
      goal: 'False victory or false defeat. The original plan encounters its first serious obstacle.',
      constraint: 'The protagonist must adapt — the old approach no longer works.',
      avoid: 'A midpoint that the protagonist could have anticipated.',
    },
    {
      name: 'Sequence 5 — Deterioration',
      pct_start: 50, pct_end: 63,
      goal: 'The situation deteriorates. Allies may turn. New urgency is injected.',
      constraint: 'Every new development must make the situation objectively worse.',
      avoid: 'Convenient rescues or coincidences that relieve pressure.',
    },
    {
      name: 'Sequence 6 — All Is Lost',
      pct_start: 63, pct_end: 75,
      goal: 'The protagonist hits their darkest moment. The original goal seems unachievable.',
      constraint: 'This must be earned — the result of specific bad choices, not bad luck.',
      avoid: 'Softening the blow with irony or distance.',
    },
    {
      name: 'Sequence 7 — Final Plan',
      pct_start: 75, pct_end: 88,
      goal: 'The protagonist rallies with new understanding. A final plan is formed. The confrontation approaches.',
      constraint: 'The plan must feel risky and genuinely uncertain.',
      avoid: 'Telegraphing the outcome of the final confrontation.',
    },
    {
      name: 'Sequence 8 — Climax & Aftermath',
      pct_start: 88, pct_end: 100,
      goal: 'The final confrontation. Decisive action. Show the new world that results.',
      constraint: 'The resolution must answer every dramatic question posed in the preceding sequences.',
      avoid: 'Leaving unresolved threads that feel like omissions, not mysteries.',
    },
  ],

  // ── Kishōtenketsu (4 acts, non-conflict-driven) ───────────────────────────
  kishotenketsu: [
    {
      name: 'Ki — Introduction',
      pct_start: 0, pct_end: 25,
      goal: 'Establish characters, setting, and circumstances with clarity and care. Build a world the audience inhabits.',
      constraint: 'No antagonism. Establish elements that will become meaningful later, without conflict.',
      avoid: 'Conflict as the driving force. Exploration and atmosphere are the engine here.',
    },
    {
      name: 'Shō — Development',
      pct_start: 25, pct_end: 50,
      goal: 'Deepen the established elements. Introduce complications from within — revelations, not confrontations.',
      constraint: 'Complications must feel like natural growth from the Ki, not external impositions.',
      avoid: 'An antagonist or villain. Tension comes from discovery, not opposition.',
    },
    {
      name: 'Ten — Twist',
      pct_start: 50, pct_end: 75,
      goal: 'Introduce an unexpected element that recontextualizes everything established in Ki and Shō. The surprise must feel both shocking AND inevitable in retrospect.',
      constraint: 'The twist must come from outside the established conflict axis — a third perspective or dimension.',
      avoid: 'Resolving the twist through conflict or confrontation. Let the juxtaposition do the work.',
    },
    {
      name: 'Ketsu — Reconciliation',
      pct_start: 75, pct_end: 100,
      goal: 'All elements — including the Ten twist — are harmonized into a new understanding. Resolution through synthesis, not victory.',
      constraint: 'No winners and losers. The resolution must feel like a natural convergence.',
      avoid: 'Closing on defeat, triumph, or moral judgment. Aim for resonance, not verdict.',
    },
  ],
};

// ── Tension curves for emotional arc types ────────────────────────────────────
// Each array is a sequence of waypoints (tension 0–100) at evenly-spaced
// positions through the story. expectedTensionAt() interpolates between them.

export const ARC_TENSION_CURVES: Record<string, number[]> = {
  rags_to_riches:  [10, 20, 30, 45, 58, 68, 78, 88],
  riches_to_rags:  [80, 72, 63, 54, 44, 33, 22, 12],
  man_in_a_hole:   [48, 36, 24, 16, 28, 46, 64, 80],
  icarus:          [18, 32, 52, 68, 80, 84, 62, 36],
  cinderella:      [28, 52, 72, 80, 52, 32, 58, 88],
  oedipus:         [72, 56, 42, 52, 68, 52, 35, 18],
};

// Linear interpolation of expected tension at story position [0.0–1.0]
export function expectedTensionAt(arc: string, position: number): number | null {
  const curve = ARC_TENSION_CURVES[arc];
  if (!curve || curve.length === 0) return null;
  const scaled = Math.max(0, Math.min(1, position)) * (curve.length - 1);
  const lo = Math.floor(scaled);
  const hi = Math.min(lo + 1, curve.length - 1);
  return Math.round(curve[lo] + (scaled - lo) * (curve[hi] - curve[lo]));
}

// ── Cinematic style modifiers ─────────────────────────────────────────────────
// Injected into agent prompts and Director pressure generation.

export interface StyleModifier {
  agentInstruction: string;    // Added to every agent prompt when this style is active
  pacingHintSuffix: string;    // Appended to pacing pressure bias_hint
  beliefEdgeIntensityBoost: number;  // Added to belief-edge CONFRONT intensity
  confrontationHintOverride?: string; // Replaces generic CONFRONT hint when style is set
}

export const STYLE_MODIFIERS: Record<string, StyleModifier> = {
  hitchcock: {
    agentInstruction: 'CINEMATIC STYLE — HITCHCOCK: You are in a Hitchcockian drama. The audience knows more than the characters. Withhold information strategically — the power is in what you DON\'T say. Prefer EXAMINE over SPEAK. Plant objects and details that will matter later. Let others dig their own graves.',
    pacingHintSuffix: ' Let the audience see the bomb under the table. Give them something to know that the others don\'t.',
    beliefEdgeIntensityBoost: 15,
    confrontationHintOverride: 'You know something they don\'t. The power is in the withholding. Don\'t confront — let them incriminate themselves. Watch. Wait. The truth will surface on its own.',
  },
  fincher: {
    agentInstruction: 'CINEMATIC STYLE — FINCHER: You are in a Fincher procedural. Obsessive. Methodical. Sickly and precise. Every detail matters — the wrong pen, the hesitation before answering, the one inconsistency in an otherwise perfect story. Prefer EXAMINE. Speak in short, controlled bursts. You are always watching, cataloguing, building your case.',
    pacingHintSuffix: ' The scene is losing its procedural edge. Return to the evidence. Something in the details is wrong — find it.',
    beliefEdgeIntensityBoost: 10,
  },
  nolan: {
    agentInstruction: 'CINEMATIC STYLE — NOLAN: You are in a Nolan cerebral thriller. Time is non-linear — your past and future are present in this moment. Speak in paradoxes and implications. The architecture of what you say matters as much as its content. Reference what hasn\'t happened yet. Reveal information in fragments that only make sense in retrospect.',
    pacingHintSuffix: ' The timeline is collapsing into itself. Say something that will only make sense later.',
    beliefEdgeIntensityBoost: 20,
    confrontationHintOverride: 'The contradiction isn\'t just about them — it\'s about the structure of time itself. What they said earlier contradicts what you know about what comes next. Act on the architecture of the deception, not just its content.',
  },
  villeneuve: {
    agentInstruction: 'CINEMATIC STYLE — VILLENEUVE: You are in a Villeneuve existential drama. The scale is overwhelming. Speak slowly, with the weight of something immovable behind every word. Let silences do the work of sentences. The environment presses down on everyone — brutalist, indifferent, larger than any one person. Emotional restraint is not suppression — it is the only sane response to what surrounds you.',
    pacingHintSuffix: ' The scene has lost its existential weight. Slow down. Let the space between words breathe.',
    beliefEdgeIntensityBoost: -10,
    confrontationHintOverride: 'The revelation lands like a geological fact — impersonal, inevitable, crushing. You don\'t need to react. The weight of what you\'ve discovered is self-evident. Speak it plainly, without theater. The enormity will carry itself.',
  },
  aster: {
    agentInstruction: 'CINEMATIC STYLE — ARI ASTER: You are in an Aster grief horror. Something has been lost and the loss is not being processed — it is metastasizing. Everything said in this room is about the grief underneath, not the surface topic. Violence lives just below the politeness. When someone says something kind, something terrible is implied. SPEAK with the uncanny precision of someone trying very hard to seem normal.',
    pacingHintSuffix: ' The grief is surfacing. Something is not okay here and everyone knows it. Force it to the surface.',
    beliefEdgeIntensityBoost: 25,
    confrontationHintOverride: 'The confrontation is not just about this moment — it\'s about everything that has been unspoken since the loss. Say it. All of it. The horror is in the honesty.',
  },
  lynch: {
    agentInstruction: 'CINEMATIC STYLE — DAVID LYNCH: You are in a Lynch dream. The logic of this scene is the logic of the unconscious. Non sequiturs are not mistakes — they are the truth leaking through. Speak in oblique fragments. Reference things that aren\'t in this room. The mundane and the terrifying share the same register. EXAMINE things that seem insignificant. The uncanny is everywhere.',
    pacingHintSuffix: ' Dream logic demands a non-sequitur. Something must enter this scene that has no rational explanation.',
    beliefEdgeIntensityBoost: 5,
    confrontationHintOverride: 'The contradiction is real but it obeys dream logic. Speak to it sideways. Reference something that has nothing to do with the situation — and watch it become exactly relevant.',
  },
};

// ── Preset instantiation ──────────────────────────────────────────────────────
// Converts percentage-based templates to absolute turn numbers.
// Phase is derived from percentage position within the session.

export function instantiatePreset(structure: string, expectedTurns: number): OutlineBeat[] {
  const templates = STRUCTURE_BEATS[structure];
  if (!templates) return [];
  const n = Math.max(4, expectedTurns);
  return templates.map(t => {
    const pctMid = (t.pct_start + t.pct_end) / 2;
    const phase: 'Setup' | 'Turn' | 'Prestige' =
      pctMid < 33 ? 'Setup' : pctMid < 66 ? 'Turn' : 'Prestige';
    return {
      phase,
      turn_start: Math.round((t.pct_start / 100) * n),
      turn_end: Math.max(Math.round((t.pct_end / 100) * n), Math.round((t.pct_start / 100) * n) + 1),
      goal: `[${t.name}] ${t.goal}`,
      constraint: t.constraint,
      avoid: t.avoid,
    };
  });
}

export const STRUCTURE_NAMES: Record<string, string> = {
  save_the_cat: 'Save the Cat (15 beats)',
  dan_harmon: 'Dan Harmon Story Circle (8)',
  john_yorke: 'John Yorke 5 Acts',
  freytag: "Freytag's Pyramid (5)",
  sequence: 'Sequence Approach (8)',
  kishotenketsu: 'Kishōtenketsu (4)',
};
