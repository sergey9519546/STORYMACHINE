import type { OutlineBeat, IllusionPhase, StoryStructure, EmotionalArc, DirectorStyle } from '../engine/types.ts';

// ── Locally-widened name unions ───────────────────────────────────────────────
// engine/types.ts's StoryStructure/EmotionalArc/DirectorStyle unions predate the
// Wave Program v2 "exhaustive axes" pass (B1-e) and still list only the original
// 6/6/6 members. This file is scoped-owned in isolation from engine/types.ts
// during that pass, so the exported name/lookup tables below are typed against
// these wider local unions instead of touching the engine file. Everything still
// round-trips correctly at runtime: routes/config.ts validates dynamically via
// Object.keys(STRUCTURE_NAMES | ARC_TENSION_CURVES | STYLE_MODIFIERS), never
// against the engine union, so the new presets are usable immediately. Follow-up
// (out of this file's ownership): extend the three engine/types.ts unions to
// match, per that file's own "TO ADD A NEW ..." header comments.
type StoryStructureName =
  | StoryStructure
  | 'three_act' | 'syd_field' | 'rashomon' | 'non_linear' | 'circular' | 'hyperlink'
  | 'fichtean_curve' | 'in_media_res' | 'snowflake' | 'mystery_box' | 'closed_circle'
  | 'procedural_case' | 'heist_structure' | 'trial_structure' | 'survival_structure'
  | 'hero_journey';

type EmotionalArcName =
  | EmotionalArc
  | 'flat_tension_baseline' | 'sine_wave' | 'double_man_in_a_hole' | 'tragedy_spiral';

type DirectorStyleName =
  | DirectorStyle
  | 'kubrick' | 'tarantino' | 'scorsese' | 'coen_brothers' | 'wes_anderson' | 'spielberg'
  | 'kurosawa' | 'leone' | 'malick' | 'michael_mann' | 'edgar_wright' | 'refn' | 'eggers'
  | 'bong_joon_ho' | 'del_toro' | 'gerwig' | 'chazelle' | 'pta' | 'claire_denis'
  | 'almodovar' | 'park_chan_wook' | 'miyazaki';

// ── Structure Preset Beat Templates ───────────────────────────────────────────
// Each template defines beats as percentages (0–100) of the total expected
// session length so they scale correctly to any session duration.
// instantiatePreset() converts them to absolute turn numbers.

export interface BeatTemplate {
  name: string;
  pct_start: number;
  pct_end: number;
  goal: string;
  constraint: string;
  avoid: string;
}

export const STRUCTURE_BEATS: Record<string, BeatTemplate[]> = {

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

  // ── Three-Act Structure (generic Aristotelian) ────────────────────────────
  three_act: [
    {
      name: 'Act One — Setup',
      pct_start: 0, pct_end: 22,
      goal: 'Establish the protagonist, their world, and the imbalance that will drive the story.',
      constraint: 'Everything introduced here should be relevant to the central conflict.',
      avoid: 'Introducing the inciting incident before the world and stakes are legible.',
    },
    {
      name: 'Inciting Incident',
      pct_start: 22, pct_end: 28,
      goal: 'The event that disrupts the status quo and sets the central conflict in motion.',
      constraint: 'This must force the protagonist toward a decision they cannot avoid.',
      avoid: 'An incident the protagonist can simply ignore or undo.',
    },
    {
      name: 'Act Two — Confrontation',
      pct_start: 28, pct_end: 72,
      goal: 'The protagonist pursues their goal against rising, increasingly personal opposition.',
      constraint: 'Every obstacle should escalate the stakes established in Act One.',
      avoid: 'A flat middle where the situation stops getting harder.',
    },
    {
      name: 'Climax',
      pct_start: 72, pct_end: 86,
      goal: 'The central conflict reaches its decisive confrontation and is resolved one way or another.',
      constraint: 'The climax must be the direct consequence of every choice made in Act Two.',
      avoid: 'A resolution that arrives from outside the established conflict.',
    },
    {
      name: 'Act Three — Resolution',
      pct_start: 86, pct_end: 100,
      goal: 'Show the new status quo and what the protagonist has become or lost.',
      constraint: 'Keep it proportionate — resolve only what the story raised.',
      avoid: 'Reopening dramatic questions the climax already settled.',
    },
  ],

  // ── Syd Field Paradigm (precise page/percentage plot points) ──────────────
  syd_field: [
    {
      name: 'Act I — Setup',
      pct_start: 0, pct_end: 25,
      goal: 'Establish the protagonist, the dramatic premise, and the relationships that will be tested.',
      constraint: 'Everything must be in place by Plot Point 1 — no late introductions of major players.',
      avoid: 'Ambiguity about whose story this is.',
    },
    {
      name: 'Plot Point 1',
      pct_start: 25, pct_end: 28,
      goal: 'A major event spins the action into a new direction, launching Act II.',
      constraint: 'This must be a hard turn, not a gradual drift — the story context changes here.',
      avoid: 'A plot point that could be reversed without consequence.',
    },
    {
      name: 'Act II-A — Rising Complication',
      pct_start: 28, pct_end: 50,
      goal: 'The protagonist pursues their need, gathering obstacles, allies, and context toward the Midpoint.',
      constraint: 'Build steadily toward a context-shifting Midpoint — no premature climaxes.',
      avoid: 'Treading water. Every scene must add pressure or information.',
    },
    {
      name: 'Midpoint',
      pct_start: 50, pct_end: 53,
      goal: 'A pivotal event changes the context of the story — new information, a reversal, or raised stakes.',
      constraint: 'The Midpoint must redirect the second half, not just intensify the first.',
      avoid: 'A Midpoint that changes nothing structurally.',
    },
    {
      name: 'Act II-B — Rising Stakes',
      pct_start: 53, pct_end: 75,
      goal: 'Consequences of the Midpoint compound. The protagonist\'s situation grows more dangerous and personal.',
      constraint: 'Pressure must be continuous and cumulative through to Plot Point 2.',
      avoid: 'Resolving the central tension before Plot Point 2.',
    },
    {
      name: 'Plot Point 2',
      pct_start: 75, pct_end: 78,
      goal: 'The final piece of information or setback needed launches the protagonist into the endgame.',
      constraint: 'This must supply what\'s needed to resolve the story in Act III.',
      avoid: 'Introducing new unresolved threads this late.',
    },
    {
      name: 'Act III — Resolution',
      pct_start: 78, pct_end: 100,
      goal: 'The central conflict is resolved through climax and the new equilibrium is shown.',
      constraint: 'Resolution must draw on setups already planted in Acts I and II.',
      avoid: 'A deus ex machina solution unearned by the preceding acts.',
    },
  ],

  // ── Rashomon (contested-truth, multi-account structure) ───────────────────
  rashomon: [
    {
      name: 'The Disputed Incident',
      pct_start: 0, pct_end: 14,
      goal: 'Establish the single event — a crime, death, or betrayal — whose truth will be contested. Frame who is telling the story and why the truth matters.',
      constraint: 'The facts stated here must be minimal and neutral — only what all accounts will agree happened at all.',
      avoid: 'Endorsing any one account as objectively true. The frame itself must stay agnostic.',
    },
    {
      name: 'First Account',
      pct_start: 14, pct_end: 35,
      goal: 'Dramatize the incident from the first narrator\'s perspective, self-serving in ways the narrator does not perceive.',
      constraint: 'The account must be internally coherent and flattering to its teller — never a conscious lie to itself.',
      avoid: 'Signaling to the audience that this account is false. It must feel true while it plays.',
    },
    {
      name: 'Second Account',
      pct_start: 35, pct_end: 56,
      goal: 'Replay the same incident from a second narrator whose version contradicts the first on a load-bearing detail.',
      constraint: 'The contradiction must be specific and irreconcilable — not vague difference of tone.',
      avoid: 'Resolving which account is correct. Let both stand.',
    },
    {
      name: 'Third Account',
      pct_start: 56, pct_end: 77,
      goal: 'A third perspective — often the least self-interested, or the dead/silent party speaking through proxy — complicates both prior accounts further.',
      constraint: 'This account should reframe the STAKES of the dispute, not just add another contradiction.',
      avoid: 'A tidy synthesis. The third account should deepen the uncertainty, not resolve it.',
    },
    {
      name: 'Irreconcilable Truth',
      pct_start: 77, pct_end: 100,
      goal: 'Return to the frame. No account is vindicated — the story\'s meaning is what the contradictions reveal about self-deception, shame, or the impossibility of objective truth.',
      constraint: 'The ending must sit with ambiguity as the point, not a flaw to be fixed.',
      avoid: 'A final authoritative account that retroactively declares a winner.',
    },
  ],

  // ── Non-Linear / Fractured Chronology ──────────────────────────────────────
  non_linear: [
    {
      name: 'Fragment Cold Open',
      pct_start: 0, pct_end: 14,
      goal: 'Open on a scene from later in the chronology, presented without the context needed to understand it.',
      constraint: 'The fragment must be dramatically compelling on its own, purely as image or action.',
      avoid: 'Explaining the fragment. Its meaning is deliberately withheld.',
    },
    {
      name: 'Anchor Thread',
      pct_start: 14, pct_end: 34,
      goal: 'Establish a recurring timeframe or throughline that orients the audience as the story jumps.',
      constraint: 'The anchor must recur often enough that the audience always knows where "now" is.',
      avoid: 'Jumping timeframes so often the anchor stops functioning as a compass.',
    },
    {
      name: 'Cross-Cut Escalation',
      pct_start: 34, pct_end: 60,
      goal: 'Alternate between timeframes so each one reveals information the other is withholding.',
      constraint: 'Every cut between timeframes must trade new information for the audience, not just variety.',
      avoid: 'Cutting for rhythm alone with no informational payoff.',
    },
    {
      name: 'Convergence Point',
      pct_start: 60, pct_end: 80,
      goal: 'The separate timeframes reach the chronological or causal hinge that connects them.',
      constraint: 'This is where the audience\'s mental timeline finally clicks into a single throughline.',
      avoid: 'A convergence that feels mechanical rather than earned by the prior cross-cutting.',
    },
    {
      name: 'Recontextualization',
      pct_start: 80, pct_end: 100,
      goal: 'The opening fragment and earlier scenes are now understood in full context. Deliver the meaning that was withheld.',
      constraint: 'The final understanding must recolor earlier scenes retroactively, not just add an epilogue.',
      avoid: 'A literal recap. Let the audience do the recontextualizing themselves.',
    },
  ],

  // ── Circular / Ouroboros Structure ──────────────────────────────────────
  circular: [
    {
      name: 'Opening Loop Image',
      pct_start: 0, pct_end: 10,
      goal: 'Establish a precise image, location, or line of dialogue that will recur, transformed, at the story\'s end.',
      constraint: 'This image must be specific and repeatable — not a mood, a moment.',
      avoid: 'Burying the loop image in noise. It must be memorable enough to recognize on return.',
    },
    {
      name: 'Departure',
      pct_start: 10, pct_end: 35,
      goal: 'The protagonist leaves the opening circumstance behind, believing it left for good.',
      constraint: 'The departure must feel like genuine progress or escape, not a stall.',
      avoid: 'Hinting too early that the story will circle back.',
    },
    {
      name: 'Transformation Trials',
      pct_start: 35, pct_end: 70,
      goal: 'The protagonist is tested and changed by their journey, gaining what they will need to face the return.',
      constraint: 'The change must be substantive enough to make the eventual return meaningfully different.',
      avoid: 'A journey that leaves the protagonist essentially unchanged.',
    },
    {
      name: 'Return to the Threshold',
      pct_start: 70, pct_end: 90,
      goal: 'The protagonist arrives back at the story\'s starting situation, location, or relationship.',
      constraint: 'The return must be literal and recognizable — the same place or moment as the opening.',
      avoid: 'A return so altered it no longer reads as the same starting point.',
    },
    {
      name: 'Loop Closure, Changed',
      pct_start: 90, pct_end: 100,
      goal: 'Replay the opening image or line — now recontextualized by everything the protagonist has become.',
      constraint: 'The repetition must be near-verbatim; the meaning must be unmistakably different.',
      avoid: 'Explaining the change in words. Let the repeated image carry it.',
    },
  ],

  // ── Hyperlink Cinema (parallel-thread ensemble) ────────────────────────────
  hyperlink: [
    {
      name: 'Thread Seeding',
      pct_start: 0, pct_end: 16,
      goal: 'Introduce multiple protagonists in apparently unconnected circumstances, each with their own want.',
      constraint: 'Each thread must be able to stand as its own mini-story with distinct stakes.',
      avoid: 'Signaling the connections between threads too early.',
    },
    {
      name: 'Parallel Escalation',
      pct_start: 16, pct_end: 45,
      goal: 'Each thread deepens its own crisis independently, cutting between them without forcing contact.',
      constraint: 'Every thread must escalate on its own terms — no thread can mark time while others move.',
      avoid: 'Uneven attention that lets one thread eclipse the others.',
    },
    {
      name: 'First Intersections',
      pct_start: 45, pct_end: 60,
      goal: 'Threads begin to brush against one another — a shared location, a coincidence, a thematic echo.',
      constraint: 'Intersections should feel like the world is small, not like contrivance.',
      avoid: 'Forcing characters into direct dialogue before the connection has been earned.',
    },
    {
      name: 'Convergent Crisis',
      pct_start: 60, pct_end: 85,
      goal: 'The threads collide at a shared event, location, or moment of crisis that implicates all of them at once.',
      constraint: 'The convergence must matter causally, not just geographically.',
      avoid: 'A convergence that resolves every thread\'s crisis simultaneously and too neatly.',
    },
    {
      name: 'Braided Resolution',
      pct_start: 85, pct_end: 100,
      goal: 'Each thread resolves on its own terms; the connections between them retroactively reveal the story\'s theme.',
      constraint: 'The theme must emerge from the pattern across threads, not be stated by any one character.',
      avoid: 'Tying threads together with an explicit summary of "how it all connects."',
    },
  ],

  // ── Fichtean Curve (rising crises, minimal exposition) ────────────────────
  fichtean_curve: [
    {
      name: 'Crisis One',
      pct_start: 0, pct_end: 15,
      goal: 'Open already inside the first complication — skip the ordinary-world setup entirely.',
      constraint: 'Establish character and stakes THROUGH the crisis, not before it.',
      avoid: 'A scene-setting prologue before the first crisis. There is no runway.',
    },
    {
      name: 'Crisis Two',
      pct_start: 15, pct_end: 30,
      goal: 'A second, larger complication arrives before the first has fully settled.',
      constraint: 'Each crisis must be objectively bigger than the last — scale is the engine.',
      avoid: 'A lull between crises. Momentum cannot rest.',
    },
    {
      name: 'Crisis Three',
      pct_start: 30, pct_end: 48,
      goal: 'The complications compound — earlier crises\' consequences collide with new ones.',
      constraint: 'Prior crises must remain live and unresolved, adding weight rather than being cleared.',
      avoid: 'Fully resolving an earlier crisis before its consequences have paid off.',
    },
    {
      name: 'Crisis Four',
      pct_start: 48, pct_end: 65,
      goal: 'The situation becomes close to unsurvivable — the protagonist is nearly overwhelmed.',
      constraint: 'This crisis must threaten something the protagonist cannot afford to lose.',
      avoid: 'Giving the protagonist a clean way out yet.',
    },
    {
      name: 'Peak Crisis',
      pct_start: 65, pct_end: 85,
      goal: 'The largest, final crisis — the culmination of every compounding complication — is confronted directly.',
      constraint: 'This must resolve the accumulated pressure of every prior crisis at once.',
      avoid: 'Introducing a wholly new threat unconnected to the prior chain.',
    },
    {
      name: 'Rapid Denouement',
      pct_start: 85, pct_end: 100,
      goal: 'A brief, compressed aftermath — the curve drops fast with little lingering.',
      constraint: 'Keep this short. The form promises velocity even at the very end.',
      avoid: 'A drawn-out resolution that contradicts the curve\'s relentless pace.',
    },
  ],

  // ── In Media Res (open mid-action, then rewind) ────────────────────────────
  in_media_res: [
    {
      name: 'Action Cold Open',
      pct_start: 0, pct_end: 12,
      goal: 'Drop the audience into a high-stakes moment already in progress, with no explanatory context.',
      constraint: 'The moment must be gripping purely on sensation and immediacy.',
      avoid: 'Any exposition that explains how this moment came to be — that comes later.',
    },
    {
      name: 'Rewind — How Did We Get Here',
      pct_start: 12, pct_end: 20,
      goal: 'Cut away from the cold open and establish the baseline "before" — signal explicitly that we are rewinding.',
      constraint: 'Make the time jump unambiguous to the audience.',
      avoid: 'Losing the tension of the cold open — plant a question that the rewind must answer.',
    },
    {
      name: 'Backstory Fill',
      pct_start: 20, pct_end: 55,
      goal: 'Build the causal chain of decisions and events that leads back toward the opening moment.',
      constraint: 'Every beat here should visibly be constructing a piece of the cold open\'s puzzle.',
      avoid: 'A backstory that feels disconnected from the specific moment we opened on.',
    },
    {
      name: 'Catch-Up Convergence',
      pct_start: 55, pct_end: 70,
      goal: 'The story arrives back at (or just past) the opening moment — now the audience understands what they saw.',
      constraint: 'The convergence should re-stage or directly continue from the cold open\'s exact beat.',
      avoid: 'Skipping past the convergence without acknowledging it explicitly.',
    },
    {
      name: 'Consequence & Resolution',
      pct_start: 70, pct_end: 100,
      goal: 'Play out what happens after the opening moment, now carrying its full weight and context.',
      constraint: 'The resolution must be re-experienced as more meaningful than it was on first viewing.',
      avoid: 'A resolution that ignores the emotional charge the rewind built up.',
    },
  ],

  // ── Snowflake Method (fractal expansion, applied as scene structure) ───────
  snowflake: [
    {
      name: 'Seed Premise',
      pct_start: 0, pct_end: 10,
      goal: 'State the story\'s one-sentence dramatic question in miniature — small, clear, and complete.',
      constraint: 'The premise must be legible on its own before any expansion begins.',
      avoid: 'Complicating the premise before it has been stated cleanly once.',
    },
    {
      name: 'First Expansion',
      pct_start: 10, pct_end: 30,
      goal: 'The seed premise fractally expands into its own three-part shape — a setup, a complication, a direction.',
      constraint: 'The expansion must be a recognizable miniature of the whole story\'s shape.',
      avoid: 'Expanding into unrelated subplots that don\'t mirror the seed.',
    },
    {
      name: 'Character Fractal',
      pct_start: 30, pct_end: 50,
      goal: 'Each major character\'s own want/obstacle/choice triggers their own miniature version of the premise.',
      constraint: 'Every character-level fractal must still resolve back to the seed premise\'s question.',
      avoid: 'Character subplots that drift so far they stop reflecting the central premise.',
    },
    {
      name: 'Scene-Level Expansion',
      pct_start: 50, pct_end: 75,
      goal: 'The macro-conflict resolves into concrete scenes, each one a fractal repetition of the whole story\'s dramatic question at a smaller scale.',
      constraint: 'Each scene should be legible as "the whole story in miniature" if isolated.',
      avoid: 'Scenes that only serve plot mechanics without echoing the premise.',
    },
    {
      name: 'Synthesis Climax',
      pct_start: 75, pct_end: 90,
      goal: 'The fractal layers — seed, character, scene — converge and resolve simultaneously.',
      constraint: 'The climax must answer the seed premise\'s question at every scale at once.',
      avoid: 'Resolving only the macro-plot while character-level fractals dangle unresolved.',
    },
    {
      name: 'Zoomed-Out Resolution',
      pct_start: 90, pct_end: 100,
      goal: 'Pull back to the one-sentence premise stated at the start — now answered.',
      constraint: 'The final image should mirror the simplicity of the seed premise.',
      avoid: 'Ending on complexity when the form calls for a return to clarity.',
    },
  ],

  // ── Mystery Box (question-driven, JJ Abrams-style withholding) ────────────
  mystery_box: [
    {
      name: 'The Box Is Presented',
      pct_start: 0, pct_end: 10,
      goal: 'Introduce a central mysterious object, event, or question and deliberately withhold its explanation.',
      constraint: 'The box must be intriguing enough to sustain curiosity without an early answer.',
      avoid: 'Any premature explanation that deflates the mystery.',
    },
    {
      name: 'Question Multiplication',
      pct_start: 10, pct_end: 35,
      goal: 'Every partial answer generates two new questions, expanding the mystery faster than it resolves.',
      constraint: 'New questions must feel like natural consequences of the last answer, not random additions.',
      avoid: 'Answering more than is asked — restraint is the engine of curiosity here.',
    },
    {
      name: 'False Answer',
      pct_start: 35, pct_end: 55,
      goal: 'A plausible, satisfying explanation is offered and provisionally believed by characters and audience alike.',
      constraint: 'The false answer must be genuinely reasonable — never a strawman.',
      avoid: 'Winking at the audience that this answer is obviously wrong.',
    },
    {
      name: 'Box Cracks Open',
      pct_start: 55, pct_end: 75,
      goal: 'The false answer collapses under new evidence — the mystery is revealed to be larger than assumed.',
      constraint: 'The collapse must recontextualize everything believed so far, not just add a twist.',
      avoid: 'A collapse that invalidates earlier stakes rather than deepening them.',
    },
    {
      name: 'Partial Reveal',
      pct_start: 75, pct_end: 90,
      goal: 'Deliver enough answers to satisfy the audience\'s investment without exhausting the mystery.',
      constraint: 'Calibrate the reveal — resolve the emotional stakes even if some factual mystery remains.',
      avoid: 'A full explanatory dump that treats mystery as a problem to be solved rather than felt.',
    },
    {
      name: 'The Box Remains',
      pct_start: 90, pct_end: 100,
      goal: 'End with a deliberate ember of unresolved mystery or wonder rather than total explanation.',
      constraint: 'What remains unanswered must feel like a choice, not an oversight.',
      avoid: 'Tying off every loose thread. Some wonder must survive the ending.',
    },
  ],

  // ── Closed Circle / Locked Room ────────────────────────────────────────────
  closed_circle: [
    {
      name: 'The Gathering',
      pct_start: 0, pct_end: 12,
      goal: 'Assemble the fixed cast of suspects in the isolated location and establish who they are to each other.',
      constraint: 'Every gathered character must have a plausible, private reason to be hiding something.',
      avoid: 'A cast so large the audience cannot track individual suspicion.',
    },
    {
      name: 'The Seal',
      pct_start: 12, pct_end: 22,
      goal: 'The location becomes inescapable — a storm, a bridge out, a killer among them who must not be allowed to leave.',
      constraint: 'The seal must be airtight; no character can plausibly escape or call for outside help.',
      avoid: 'A seal with an obvious loophole the audience will fixate on.',
    },
    {
      name: 'First Incident',
      pct_start: 22, pct_end: 40,
      goal: 'The first death or crime occurs, and suspicion ignites among the sealed group.',
      constraint: 'The incident must implicate multiple plausible suspects at once.',
      avoid: 'An incident that points too cleanly at one obvious culprit this early.',
    },
    {
      name: 'Suspicion Web',
      pct_start: 40, pct_end: 65,
      goal: 'Each character\'s secret, motive, or alibi is exposed, and everyone becomes a plausible suspect.',
      constraint: 'Every revealed secret must be dramatically consequential, not filler backstory.',
      avoid: 'Clearing suspects too early and narrowing the field prematurely.',
    },
    {
      name: 'Elimination',
      pct_start: 65, pct_end: 85,
      goal: 'The group is winnowed through further incidents or logical deduction, tightening toward the truth.',
      constraint: 'Each elimination must be earned through clues already planted, not authorial fiat.',
      avoid: 'Killing off suspects for shock value disconnected from the mystery\'s logic.',
    },
    {
      name: 'Unmasking',
      pct_start: 85, pct_end: 100,
      goal: 'The culprit and their method are revealed from within the closed circle itself, using only information the audience already had.',
      constraint: 'The solution must be fair — retrospectively inevitable from planted clues.',
      avoid: 'A solution that requires information withheld from the audience until this moment.',
    },
  ],

  // ── Procedural Case (single-case investigation format) ────────────────────
  procedural_case: [
    {
      name: 'The Case Arrives',
      pct_start: 0, pct_end: 10,
      goal: 'The case is presented — a crime, a body, a disappearance — and the investigator is assigned.',
      constraint: 'The case must pose a clear, answerable question that structures the rest of the story.',
      avoid: 'A case so vague it can\'t organize a clear investigation.',
    },
    {
      name: 'Initial Investigation',
      pct_start: 10, pct_end: 30,
      goal: 'Canvas the scene, gather evidence, and interview witnesses to establish the shape of the puzzle.',
      constraint: 'Every clue introduced here must matter later — no decorative evidence.',
      avoid: 'Skipping procedural rigor for the sake of pace.',
    },
    {
      name: 'Wrong Trail',
      pct_start: 30, pct_end: 50,
      goal: 'A plausible suspect or theory emerges and is pursued, but proves incomplete or false.',
      constraint: 'The wrong trail must be reasonable given the evidence at the time — not an obvious dead end.',
      avoid: 'A red herring so implausible the audience never believed it.',
    },
    {
      name: 'Breakthrough Clue',
      pct_start: 50, pct_end: 65,
      goal: 'New evidence reframes the entire case, invalidating the wrong trail and pointing toward the truth.',
      constraint: 'The breakthrough must be traceable to evidence planted earlier, even if its significance was missed.',
      avoid: 'A breakthrough that comes from outside the established evidence chain.',
    },
    {
      name: 'Confrontation & Apprehension',
      pct_start: 65, pct_end: 85,
      goal: 'The investigator confronts the true culprit, using the accumulated case to force a resolution.',
      constraint: 'The confrontation must directly use evidence gathered across the investigation.',
      avoid: 'A confession that doesn\'t require the case built against it.',
    },
    {
      name: 'Case Closed & Cost',
      pct_start: 85, pct_end: 100,
      goal: 'The case resolves, and the personal toll the investigation took on the investigator is shown.',
      constraint: 'The cost must feel specific to this case, not generic weariness.',
      avoid: 'A clean, costless close that undercuts the case\'s weight.',
    },
  ],

  // ── Heist Structure ─────────────────────────────────────────────────────
  heist_structure: [
    {
      name: 'The Score',
      pct_start: 0, pct_end: 10,
      goal: 'Identify the target — what is being stolen, from whom, and why it matters enough to risk everything.',
      constraint: 'The target\'s value and defenses must be established as genuinely formidable.',
      avoid: 'A score that feels easy or low-stakes from the outset.',
    },
    {
      name: 'Crew Assembly',
      pct_start: 10, pct_end: 25,
      goal: 'Recruit the specialists, establishing each member\'s distinct skill and their reason for being in.',
      constraint: 'Each crew member must have a specific competency the plan will later depend on.',
      avoid: 'A crew of interchangeable members with no distinct function.',
    },
    {
      name: 'The Plan',
      pct_start: 25, pct_end: 45,
      goal: 'The heist is designed and shown (or partially shown) to the audience, establishing the "rules" of the job.',
      constraint: 'Show enough of the plan that the audience can later recognize a deviation from it.',
      avoid: 'Showing the entire plan in full — leave room for the reveal to recontextualize it.',
    },
    {
      name: 'Execution With a Twist',
      pct_start: 45, pct_end: 70,
      goal: 'The heist unfolds in real time; something appears to go wrong, threatening the whole operation.',
      constraint: 'The apparent failure must feel like real, escalating jeopardy in the moment.',
      avoid: 'Telegraphing that the failure is actually part of the plan.',
    },
    {
      name: 'The Reveal',
      pct_start: 70, pct_end: 90,
      goal: 'The audience learns what was really planned all along — the con-within-the-con behind the apparent twist.',
      constraint: 'The reveal must recontextualize specific earlier scenes as having hidden a second layer.',
      avoid: 'A reveal that depends on information the audience was never shown.',
    },
    {
      name: 'Clean Getaway',
      pct_start: 90, pct_end: 100,
      goal: 'The crew disperses with the prize, and remaining loose ends (betrayals, splits, consequences) are tied off.',
      constraint: 'Show the cost or division of the score as part of the resolution, not just escape.',
      avoid: 'An ending that ignores the crew relationships built across the plan.',
    },
  ],

  // ── Trial Structure (courtroom drama) ──────────────────────────────────────
  trial_structure: [
    {
      name: 'The Charge',
      pct_start: 0, pct_end: 12,
      goal: 'Establish the crime or accusation and what is at stake for the accused if the trial goes wrong.',
      constraint: 'The stakes must be personal and severe enough to justify the trial\'s length.',
      avoid: 'A charge whose consequences feel abstract or low-stakes.',
    },
    {
      name: 'Building the Case',
      pct_start: 12, pct_end: 35,
      goal: 'Both sides prepare — gathering evidence, securing witnesses, and revealing their strategy to the audience.',
      constraint: 'Show both sides\' genuine strengths — neither case should look like a foregone conclusion.',
      avoid: 'Stacking the deck so one side is obviously going to lose.',
    },
    {
      name: 'Opening Arguments',
      pct_start: 35, pct_end: 45,
      goal: 'Each side states its theory of the case, framing how the audience should read the evidence to come.',
      constraint: 'The two framings must be genuinely in tension, not strawman versus obvious truth.',
      avoid: 'An opening argument that gives away the verdict.',
    },
    {
      name: 'The Trial Unfolds',
      pct_start: 45, pct_end: 70,
      goal: 'Witnesses testify and are cross-examined; momentum swings between prosecution and defense.',
      constraint: 'Every witness must shift the audience\'s read on the case at least once.',
      avoid: 'A trial where the outcome never feels in doubt.',
    },
    {
      name: 'The Turn',
      pct_start: 70, pct_end: 85,
      goal: 'A piece of evidence or testimony upends the expected outcome of the trial.',
      constraint: 'The turn must be built from evidence or testimony already introduced.',
      avoid: 'A turn that relies on information withheld from the audience until now.',
    },
    {
      name: 'Verdict',
      pct_start: 85, pct_end: 100,
      goal: 'Judgment is delivered, and its moral and personal cost — for the accused and for justice itself — is shown.',
      constraint: 'The verdict\'s consequences must extend beyond the courtroom.',
      avoid: 'A verdict that resolves the legal question but ignores its human cost.',
    },
  ],

  // ── Survival Structure (person vs. nature/isolation) ───────────────────────
  survival_structure: [
    {
      name: 'The Incident',
      pct_start: 0, pct_end: 12,
      goal: 'The event that strands or isolates the protagonist from safety, help, or civilization.',
      constraint: 'The isolation must be total enough that easy rescue is not plausible.',
      avoid: 'An incident with an obvious, immediate way out.',
    },
    {
      name: 'Immediate Crisis',
      pct_start: 12, pct_end: 28,
      goal: 'Basic survival needs — injury, shelter, exposure, thirst — demand an immediate, practical response.',
      constraint: 'Physical stakes must be concrete and specific to the environment.',
      avoid: 'Skipping to the psychological toll before the physical crisis is established.',
    },
    {
      name: 'Adaptation',
      pct_start: 28, pct_end: 55,
      goal: 'The protagonist learns the rules of the environment, developing skills, rituals, or routines to endure.',
      constraint: 'Adaptation must be earned through specific trial and error, not sudden competence.',
      avoid: 'Making survival look easy once the protagonist adapts.',
    },
    {
      name: 'Setback & Despair',
      pct_start: 55, pct_end: 72,
      goal: 'A major reversal — injury, lost resources, psychological collapse — threatens survival itself.',
      constraint: 'This must be the story\'s lowest point, threatening the will to continue, not just the body.',
      avoid: 'A setback that\'s purely physical with no psychological weight.',
    },
    {
      name: 'Turning Point',
      pct_start: 72, pct_end: 88,
      goal: 'A decision, memory, or discovery renews the protagonist\'s resolve to continue.',
      constraint: 'The turning point must come from within the protagonist, not an external rescue.',
      avoid: 'An external savior arriving before the protagonist has chosen to keep going.',
    },
    {
      name: 'Escape or Endurance',
      pct_start: 88, pct_end: 100,
      goal: 'The protagonist escapes, is rescued, or redefines what survival means for them.',
      constraint: 'The resolution must reflect what the protagonist has become through the ordeal, not just whether they lived.',
      avoid: 'A rescue that erases the transformation the ordeal produced.',
    },
  ],

  // ── Hero's Journey — Campbell/Vogler 12-Stage Monomyth ─────────────────────
  hero_journey: [
    {
      name: 'Ordinary World',
      pct_start: 0, pct_end: 8,
      goal: 'Establish the hero\'s normal life and the lack or imbalance that quietly defines them.',
      constraint: 'The ordinary world must contrast sharply with the special world to come.',
      avoid: 'Making the ordinary world feel special or adventurous — it must feel like home.',
    },
    {
      name: 'Call to Adventure',
      pct_start: 8, pct_end: 15,
      goal: 'A problem, challenge, or invitation disrupts the ordinary world and presents the hero with a quest.',
      constraint: 'The call must be specific and require the hero to leave the ordinary world.',
      avoid: 'A call the hero could reasonably ignore without consequence.',
    },
    {
      name: 'Refusal of the Call',
      pct_start: 15, pct_end: 20,
      goal: 'The hero hesitates or refuses, out of fear, obligation, or insecurity.',
      constraint: 'The refusal must be rooted in a genuine, sympathetic flaw or fear.',
      avoid: 'A refusal that feels perfunctory or immediately abandoned.',
    },
    {
      name: 'Meeting the Mentor',
      pct_start: 20, pct_end: 27,
      goal: 'The hero encounters a guide who provides wisdom, tools, or confidence to face the threshold.',
      constraint: 'The mentor must give the hero something they specifically lack, not generic encouragement.',
      avoid: 'A mentor who solves the hero\'s problem for them.',
    },
    {
      name: 'Crossing the First Threshold',
      pct_start: 27, pct_end: 33,
      goal: 'The hero commits and enters the special world, leaving the ordinary world behind.',
      constraint: 'This must be a decisive, irreversible commitment.',
      avoid: 'A threshold crossing that can be casually undone.',
    },
    {
      name: 'Tests, Allies, Enemies',
      pct_start: 33, pct_end: 45,
      goal: 'The hero learns the rules of the special world through trials, forming alliances and identifying enemies.',
      constraint: 'Each test must teach the hero something needed for the ordeal ahead.',
      avoid: 'Tests that are disconnected from the hero\'s central flaw or goal.',
    },
    {
      name: 'Approach to the Inmost Cave',
      pct_start: 45, pct_end: 55,
      goal: 'The hero and allies prepare for the central, most dangerous challenge of the special world.',
      constraint: 'Tension must build specifically toward the ordeal, not just generic danger.',
      avoid: 'Rushing past preparation directly into the ordeal.',
    },
    {
      name: 'Ordeal',
      pct_start: 55, pct_end: 63,
      goal: 'The hero faces their greatest fear or most dangerous confrontation — a symbolic death and rebirth.',
      constraint: 'This must be the hero\'s lowest and most dangerous point in the special world.',
      avoid: 'An ordeal the hero survives too easily.',
    },
    {
      name: 'Reward — Seizing the Sword',
      pct_start: 63, pct_end: 70,
      goal: 'Having survived the ordeal, the hero claims what they came for — an object, knowledge, or reconciliation.',
      constraint: 'The reward must be a direct consequence of surviving the ordeal.',
      avoid: 'A reward that arrives without cost or risk.',
    },
    {
      name: 'The Road Back',
      pct_start: 70, pct_end: 80,
      goal: 'The hero commits to returning to the ordinary world, often pursued by consequences of the ordeal.',
      constraint: 'The road back must carry real, escalating danger — not a victory lap.',
      avoid: 'A return with no obstacles between the reward and going home.',
    },
    {
      name: 'Resurrection',
      pct_start: 80, pct_end: 92,
      goal: 'A final, climactic test — often deadlier than the ordeal — proves the hero\'s transformation is complete.',
      constraint: 'The hero must be tested on exactly what they learned, in a way that could still fail.',
      avoid: 'A resurrection that just repeats the ordeal instead of testing the hero\'s growth.',
    },
    {
      name: 'Return With the Elixir',
      pct_start: 92, pct_end: 100,
      goal: 'The hero returns to the ordinary world transformed, bringing something of value back to share.',
      constraint: 'The elixir must visibly improve or heal the ordinary world established at the start.',
      avoid: 'A return that changes nothing about the ordinary world the hero left.',
    },
  ],
};

// ── Tension curves for emotional arc types ────────────────────────────────────
// Each array is a sequence of waypoints (tension 0–100) at evenly-spaced
// positions through the story. expectedTensionAt() interpolates between them.

export const ARC_TENSION_CURVES: Record<EmotionalArcName, number[]> = {
  rags_to_riches:  [10, 20, 30, 45, 58, 68, 78, 88],
  riches_to_rags:  [80, 72, 63, 54, 44, 33, 22, 12],
  man_in_a_hole:   [48, 36, 24, 16, 28, 46, 64, 80],
  icarus:          [18, 32, 52, 68, 80, 84, 62, 36],
  cinderella:      [28, 52, 72, 80, 52, 32, 58, 88],
  oedipus:         [72, 56, 42, 52, 68, 52, 35, 18],

  // Near-constant tension — a controlled, steady baseline rather than a shaped
  // arc. Fitting for slice-of-life, kishotenketsu-adjacent, or ensemble pieces
  // where craft tension comes from texture, not escalation.
  flat_tension_baseline: [40, 42, 38, 41, 43, 39, 42, 40],

  // Regular oscillation between calm and high tension — two full cycles across
  // the runtime. Suits anthology or episodic-within-a-session pacing where
  // tension resets by design rather than accumulating.
  sine_wave: [50, 85, 50, 15, 50, 85, 50, 15],

  // The true two-dip Vonnegut "Man in a Hole" repeated — distinct from the
  // Cinderella variant (which is a single dip framed by a double rise/fall).
  // Two genuine troughs separated by a partial recovery, ending net higher
  // than the start.
  double_man_in_a_hole: [45, 28, 18, 32, 50, 34, 20, 62],

  // A downward spiral of repeated false hope and collapse: each rise peaks
  // lower than the one before it, each fall bottoms out lower than the one
  // before it, ending in unrecovered catastrophe. Distinct from Oedipus
  // (one clear late reversal) — this is three compounding cycles.
  tragedy_spiral: [40, 58, 32, 50, 26, 38, 18, 8],
};

// Linear interpolation of expected tension at story position [0.0–1.0]
export function expectedTensionAt(arc: string | EmotionalArc, position: number): number | null {
  const curve = ARC_TENSION_CURVES[arc as EmotionalArcName];
  if (!curve || curve.length === 0) return null;
  const scaled = Math.max(0, Math.min(1, position)) * (curve.length - 1);
  const lo = Math.floor(scaled);
  const hi = Math.min(lo + 1, curve.length - 1);
  return Math.round(curve[lo] + (scaled - lo) * (curve[hi] - curve[lo]));
}

// ── Character Arc Modes ───────────────────────────────────────────────────────
// Deliberately separate from ARC_TENSION_CURVES: the tension curve describes
// the SHAPE of dramatic pressure over time, while a character-arc mode
// describes the MORAL/PSYCHOLOGICAL direction a specific character travels.
// A story can pair any tension shape with any arc mode — e.g. an "icarus"
// tension curve with a "corruption" character (rise then fall in both), or a
// "man_in_a_hole" tension curve with an "integration" character (the plot
// dips even while the character's internal arc is settling, not swinging).

export type CharacterArcMode =
  | 'hero_journey' | 'tragedy' | 'comedy' | 'redemption' | 'descent' | 'corruption'
  | 'rebirth' | 'disillusionment' | 'martyrdom' | 'liberation' | 'obsession' | 'integration';

export interface CharacterArcModeDefinition {
  name: string;
  description: string;
  promptInstruction: string;
  valenceExpectation: 'rising' | 'falling' | 'fall_then_rise' | 'rise_then_fall' | 'oscillating' | 'flat';
}

export const CHARACTER_ARC_MODES: Record<CharacterArcMode, CharacterArcModeDefinition> = {
  hero_journey: {
    name: "Hero's Journey",
    description: 'The character begins lacking, is broken down by ordeal, and returns transformed and capable — the classic positive individuation arc.',
    promptInstruction: 'CHARACTER ARC — HERO\'S JOURNEY: Let the character be genuinely diminished before they are built up. Growth must be earned through a real ordeal, not granted. The return should visibly carry what the ordeal cost.',
    valenceExpectation: 'fall_then_rise',
  },
  tragedy: {
    name: 'Tragedy',
    description: 'The character\'s defining flaw — often inseparable from their greatest strength — drives their own downfall despite (or because of) their best efforts.',
    promptInstruction: 'CHARACTER ARC — TRAGEDY: Every choice the character makes should be reasonable in the moment and yet tighten the noose. The flaw must never be corrected in time. The downfall is self-authored, not imposed.',
    valenceExpectation: 'falling',
  },
  comedy: {
    name: 'Comedy',
    description: 'Misunderstanding and social disorder escalate, then resolve into restored or renewed harmony — the classical (not necessarily humorous) comic shape.',
    promptInstruction: 'CHARACTER ARC — COMEDY: Let misunderstandings compound honestly before they untangle. The resolution should restore or improve the social bonds that were threatened, not just remove the obstacle.',
    valenceExpectation: 'rising',
  },
  redemption: {
    name: 'Redemption',
    description: 'The character begins morally compromised and, through costly action and earned insight, recovers moral standing.',
    promptInstruction: 'CHARACTER ARC — REDEMPTION: Start from real culpability, not misunderstanding. The character must actively pay a cost to earn back trust or self-respect — redemption offered without cost reads as unearned.',
    valenceExpectation: 'rising',
  },
  descent: {
    name: 'Descent',
    description: 'A steady, uninterrupted decline into darkness, compulsion, or ruin, with no recovery arc — the character is not redeemed by the story\'s end.',
    promptInstruction: 'CHARACTER ARC — DESCENT: Resist giving the character a genuine turning point upward. Each scene should lower the floor further. Any apparent relief should be temporary or illusory.',
    valenceExpectation: 'falling',
  },
  corruption: {
    name: 'Corruption',
    description: 'The character begins idealistic or in a position of legitimate strength, and power, compromise, or ambition erodes them until they resemble what they once opposed.',
    promptInstruction: 'CHARACTER ARC — CORRUPTION: Establish real virtue or idealism early — the fall only lands if there was something to lose. Each compromise should be individually justifiable to the character even as the pattern damns them.',
    valenceExpectation: 'rise_then_fall',
  },
  rebirth: {
    name: 'Rebirth',
    description: 'The character undergoes a symbolic death of the old self — through crisis, isolation, or confrontation with mortality — and is renewed with a changed relationship to life.',
    promptInstruction: 'CHARACTER ARC — REBIRTH: Give the character a genuine low point that reads as a kind of death (of identity, relationship, or purpose) before the renewal. The renewal must be visibly different from who they were, not a return to baseline.',
    valenceExpectation: 'fall_then_rise',
  },
  disillusionment: {
    name: 'Disillusionment',
    description: 'The character begins with belief, hope, or idealism that erodes steadily as reality intrudes, ending in clear-eyed resignation rather than catastrophe.',
    promptInstruction: 'CHARACTER ARC — DISILLUSIONMENT: Let belief erode through specific, accumulating evidence rather than one betrayal. The ending tone should be resigned clarity, not despair or death.',
    valenceExpectation: 'falling',
  },
  martyrdom: {
    name: 'Martyrdom',
    description: 'The character\'s personal fortune worsens, often ending in sacrifice or death, but the sacrifice redeems, saves, or transforms others — the personal fall purchases a moral or communal rise.',
    promptInstruction: 'CHARACTER ARC — MARTYRDOM: The sacrifice must be a choice, not an accident, and it must visibly change the fate of others for the better. Let the personal cost be real and unsoftened even as its meaning redeems it.',
    valenceExpectation: 'fall_then_rise',
  },
  liberation: {
    name: 'Liberation',
    description: 'The character breaks free of an oppressive constraint — external authority, internalized belief, addiction, or relationship — moving toward self-determination.',
    promptInstruction: 'CHARACTER ARC — LIBERATION: Make the constraint concrete and specific before the break. The break itself should cost something real; liberation without cost reads as escapism rather than earned freedom.',
    valenceExpectation: 'rising',
  },
  obsession: {
    name: 'Obsession',
    description: 'The character cycles between control and compulsion, alternating brief triumphs with relapses, circling a fixation without a single clean net direction.',
    promptInstruction: 'CHARACTER ARC — OBSESSION: Let the character genuinely believe each relapse is the last one. Alternate real wins with real setbacks — the pattern, not a single event, is the arc. Avoid a tidy net trend either up or down.',
    valenceExpectation: 'oscillating',
  },
  integration: {
    name: 'Integration',
    description: 'The character reconciles previously opposed parts of themselves (duty vs. desire, persona vs. shadow) into a stable, whole identity — the arc is toward equilibrium, not escalation.',
    promptInstruction: 'CHARACTER ARC — INTEGRATION: The goal state is steadiness, not triumph. Let the character\'s internal conflict quiet down as opposing impulses are reconciled rather than one defeating the other. Avoid manufacturing new external drama to fill the space.',
    valenceExpectation: 'flat',
  },
};

// ── Cinematic style modifiers ─────────────────────────────────────────────────
// Injected into agent prompts and Director pressure generation.

export interface StyleModifier {
  agentInstruction: string;    // Added to every agent prompt when this style is active
  pacingHintSuffix: string;    // Appended to pacing pressure bias_hint
  beliefEdgeIntensityBoost: number;  // Added to belief-edge CONFRONT intensity
  confrontationHintOverride?: string; // Replaces generic CONFRONT hint when style is set
}

export const STYLE_MODIFIERS: Record<DirectorStyleName, StyleModifier> = {
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
  kubrick: {
    agentInstruction: 'CINEMATIC STYLE — KUBRICK: You are in a Kubrickian institutional dread. Compositions are symmetrical, controlled, one-point — nothing is accidental. Systems (military, corporate, domestic) process people, and you speak with the flattened, clinical detachment of someone inside a machine. Prefer EXAMINE. Let the horror live in the precision, not the outburst.',
    pacingHintSuffix: ' The scene has lost its clinical symmetry. Slow down, straighten the frame, let the institutional coldness show through.',
    beliefEdgeIntensityBoost: 8,
    confrontationHintOverride: 'Deliver the confrontation with total composure — symmetrical, procedural, unnervingly calm. The dread is in how little you react, not how much.',
  },
  tarantino: {
    agentInstruction: 'CINEMATIC STYLE — TARANTINO: You are in a Tarantino pulp standoff. Digress — talk about anything except the point, circling it with pop-culture asides and hyper-specific detail — before the tension snaps into sudden, explosive violence or reveal. SPEAK at length. Let the mundane conversation be the tension.',
    pacingHintSuffix: ' The digression has gone on long enough — either escalate the small talk\'s menace or let it snap.',
    beliefEdgeIntensityBoost: 18,
    confrontationHintOverride: 'This is a standoff. Everyone talks — circling, needling, delaying — before anyone acts. Let the words do the violence first.',
  },
  scorsese: {
    agentInstruction: 'CINEMATIC STYLE — SCORSESE: You are in a Scorsese underworld. Loyalty and betrayal run through everything, filtered through Catholic guilt and self-justifying internal logic. Speak fast, overlapping, code-of-the-street specific. Rationalize your worst impulses out loud as if they were obviously reasonable.',
    pacingHintSuffix: ' The scene needs its operatic charge back — rapid-fire dialogue, someone justifying the unjustifiable.',
    beliefEdgeIntensityBoost: 16,
  },
  coen_brothers: {
    agentInstruction: 'CINEMATIC STYLE — COEN BROTHERS: You are in a Coen Brothers universe where fate and bad luck are the real antagonist. Speak in dry, regionally specific vernacular. Your own cleverness is what dooms you. Violence, when it arrives, is sudden and faintly absurd rather than heroic.',
    pacingHintSuffix: ' The scene needs its deadpan irony back — let a plan meet the universe\'s indifference.',
    beliefEdgeIntensityBoost: 12,
    confrontationHintOverride: 'Let the confrontation be undone by chance or your own overconfidence, not by the other person\'s strength. Deliver it deadpan — the absurdity is the point.',
  },
  wes_anderson: {
    agentInstruction: 'CINEMATIC STYLE — WES ANDERSON: You are inside a symmetrical, meticulously composed dollhouse. Speak with formal, precise diction regardless of the emotional stakes — grief and whimsy share the same flat register. Even devastating news is delivered with composed, storybook exactness.',
    pacingHintSuffix: ' The scene has lost its formal precision. Restore the deadpan composure, even under real emotional weight.',
    beliefEdgeIntensityBoost: -5,
    confrontationHintOverride: 'Deliver the devastating truth in the same polite, formal register you\'d use for small talk. The grief is real; the composure never breaks.',
  },
  spielberg: {
    agentInstruction: 'CINEMATIC STYLE — SPIELBERG: You are in a Spielberg story of wonder breaking into the ordinary. Find the humane, awestruck core of the situation — let vulnerability and amazement coexist. Trust and family bonds are the engine beneath the plot. SPEAK with earned warmth, not cynicism.',
    pacingHintSuffix: ' The scene needs its sense of wonder back — find the human, vulnerable core of what\'s happening.',
    beliefEdgeIntensityBoost: 6,
  },
  kurosawa: {
    agentInstruction: 'CINEMATIC STYLE — KUROSAWA: You are in a Kurosawa drama of duty and honor under pressure. Let the elements — rain, wind, mud — mirror the turmoil inside you. Speak and act within a code of honor and consequence; group loyalty and hierarchy shape every decision.',
    pacingHintSuffix: ' Let the weather and the group\'s formation mirror the tension — honor and duty are being tested.',
    beliefEdgeIntensityBoost: 10,
    confrontationHintOverride: 'The confrontation is bound by a code of honor and duty. Act within it even as it costs you — the weather should intensify around the moment.',
  },
  leone: {
    agentInstruction: 'CINEMATIC STYLE — LEONE: You are in a Sergio Leone standoff. Extend silence and stillness far past comfort — stare, don\'t speak, let the tension accumulate through eye contact and patience before violence erupts suddenly. Every word, when it finally comes, must be worth the wait.',
    pacingHintSuffix: ' Hold the silence longer. Let the stillness stretch until it\'s almost unbearable before anything breaks it.',
    beliefEdgeIntensityBoost: 20,
    confrontationHintOverride: 'This is a standoff of nerve, not words. Say almost nothing. Let the silence and the stare decide who moves first.',
  },
  malick: {
    agentInstruction: 'CINEMATIC STYLE — MALICK: You are in a Malick reverie. Speak in searching, half-formed philosophical whispers rather than direct address. Nature and silence carry as much meaning as anything said aloud. Avoid direct confrontation — let wonder and grief sit side by side unresolved.',
    pacingHintSuffix: ' The scene has become too direct. Let it drift back into whispered, searching reflection — let nature hold the meaning instead.',
    beliefEdgeIntensityBoost: -8,
  },
  michael_mann: {
    agentInstruction: 'CINEMATIC STYLE — MICHAEL MANN: You are in a Michael Mann world of existential professionalism. Speak with controlled, exact precision — the job and the code that governs it are your real identity. Competence is respected even across enemy lines. Tension is procedural, not emotional outburst.',
    pacingHintSuffix: ' Return to procedural precision — the job, the code, the competence. Let controlled professionalism carry the tension.',
    beliefEdgeIntensityBoost: 9,
    confrontationHintOverride: 'This is professional to professional — recognize the other person\'s competence even as you oppose them. The code matters more than the anger.',
  },
  edgar_wright: {
    agentInstruction: 'CINEMATIC STYLE — EDGAR WRIGHT: You are in an Edgar Wright kinetic comic escalation. Timing is everything — treat mundane actions with cinematic rhythm and let jokes escalate through repetition and callback. Be genre-aware and playful even under real stakes.',
    pacingHintSuffix: ' The scene needs its comic rhythm back — escalate through repetition, land the callback, keep the timing tight.',
    beliefEdgeIntensityBoost: 14,
  },
  refn: {
    agentInstruction: 'CINEMATIC STYLE — REFN: You are in a Nicolas Winding Refn fable. Speak minimally — let silence and stillness carry menace. Violence, when it comes, is sudden, ritualistic, and wildly disproportionate to the stillness that preceded it. Iconography over explanation.',
    pacingHintSuffix: ' The scene is too talkative for this world. Strip the dialogue back to almost nothing and let the stillness carry the dread.',
    beliefEdgeIntensityBoost: 22,
    confrontationHintOverride: 'When it breaks, it breaks completely and wordlessly. No warning speech — total, ritualistic, disproportionate action.',
  },
  eggers: {
    agentInstruction: 'CINEMATIC STYLE — EGGERS: You are in a Robert Eggers folk-horror isolation. Speak in period-accurate, formal, archaic cadence. Dread is procedural and grounded in survival and old-world belief — madness creeps in through claustrophobia and conviction, not jump scares.',
    pacingHintSuffix: ' The dread needs to be grounded again — return to the physical and spiritual stakes of survival in this isolated, believing world.',
    beliefEdgeIntensityBoost: 19,
  },
  bong_joon_ho: {
    agentInstruction: 'CINEMATIC STYLE — BONG JOON-HO: You are in a Bong Joon-ho tonal-whiplash world. Let comedy tip into horror and social tragedy within the same scene. Stage power and class as literal spatial position — who is above, who is below. Foreshadow precisely, then pay it off literally.',
    pacingHintSuffix: ' Let the tone whiplash now — from comic to horrifying to tragic within the same beat. Make the spatial/class geometry visible.',
    beliefEdgeIntensityBoost: 17,
    confrontationHintOverride: 'The confrontation exposes the class geometry that was hiding in plain sight the whole time. Make the spatial position of power literal.',
  },
  del_toro: {
    agentInstruction: 'CINEMATIC STYLE — DEL TORO: You are in a Guillermo del Toro dark fairy tale. The monstrous is more humane than the institutions oppressing it. Find ornate, fable-like detail in the mundane. Cruelty comes from systems and authority; empathy comes from the marginalized and the strange.',
    pacingHintSuffix: ' Find the fairy-tale logic hiding in this scene — let ornate detail and quiet empathy for the outsider come forward.',
    beliefEdgeIntensityBoost: 13,
  },
  gerwig: {
    agentInstruction: 'CINEMATIC STYLE — GERWIG: You are in a Greta Gerwig coming-of-age story. Speak with unguarded emotional directness that breaks through irony. Yearning, ambition, and self-doubt are treated as genuinely high-stakes. The domestic and personal carry epic emotional weight.',
    pacingHintSuffix: ' Drop the irony and say the unguarded, yearning thing directly — the personal stakes deserve to be treated as enormous.',
    beliefEdgeIntensityBoost: 4,
  },
  chazelle: {
    agentInstruction: 'CINEMATIC STYLE — CHAZELLE: You are in a Damien Chazelle world where rhythm and tempo escalate like a musical arrangement. Ambition and craft-obsession justify real personal sacrifice in your own mind. Romanticism about art and the cost of pursuing it are inseparable.',
    pacingHintSuffix: ' Let the tempo build like a musical arrangement — the ambition and its cost should escalate together.',
    beliefEdgeIntensityBoost: 15,
  },
  pta: {
    agentInstruction: 'CINEMATIC STYLE — PAUL THOMAS ANDERSON: You are in a PTA sprawling Americana ensemble. Power moves through charisma and paternal authority — control masquerades as care. Let scenes hypnotically extend past their expected exit point, and let tenderness curdle into menace without warning.',
    pacingHintSuffix: ' Let the scene run long past where it should end — the hypnotic extension is where the real power dynamic surfaces.',
    beliefEdgeIntensityBoost: 11,
    confrontationHintOverride: 'This confrontation is a struggle over who gets to be the father figure in the room — charisma and paternal authority are the real weapons.',
  },
  claire_denis: {
    agentInstruction: 'CINEMATIC STYLE — CLAIRE DENIS: You are in a Claire Denis sensory, elliptical world. Prioritize physical, embodied detail over explanation. Unspoken histories of power and colonialism charge even ordinary intimacy. Trust ellipsis — do not explain what can be felt.',
    pacingHintSuffix: ' Strip the explanation back — let physical, sensory detail and what goes unsaid carry the scene\'s real weight.',
    beliefEdgeIntensityBoost: -6,
  },
  almodovar: {
    agentInstruction: 'CINEMATIC STYLE — ALMODÓVAR: You are in an Almodóvar melodrama. Heighten emotion to operatic, saturated melodrama without irony. Desire and taboo are treated with warmth and tenderness, never shock or scandal. Let coincidence and long-buried secrets twist the plot boldly.',
    pacingHintSuffix: ' Heighten the emotion — go operatic, not restrained. Let a secret or coincidence twist the scene boldly.',
    beliefEdgeIntensityBoost: 18,
  },
  park_chan_wook: {
    agentInstruction: 'CINEMATIC STYLE — PARK CHAN-WOOK: You are in a Park Chan-wook revenge opera. Stage confrontation with baroque, symmetrical formal beauty inside ornate interiors. Moral roles invert — victim and aggressor trade places. Violence, when it comes, is precise, ritualized, and richly composed.',
    pacingHintSuffix: ' Restore the operatic formality — the reckoning should be staged with baroque precision, not raw chaos.',
    beliefEdgeIntensityBoost: 21,
    confrontationHintOverride: 'The reckoning is staged like a ritual — beautiful, symmetrical, and merciless. Let the moral roles of victim and aggressor invert.',
  },
  miyazaki: {
    agentInstruction: 'CINEMATIC STYLE — MIYAZAKI: You are in a Miyazaki world where nature and the unseen have their own agency and deserve respect, not conquest. There are no pure villains — antagonists carry understandable grief or need. Let quiet, wonder-filled stillness breathe between moments of action.',
    pacingHintSuffix: ' Let a quiet, wondering stillness breathe here — nature or the unseen world has something to say before the action resumes.',
    beliefEdgeIntensityBoost: -3,
  },
};

// ── Preset instantiation ──────────────────────────────────────────────────────
// Converts percentage-based templates to absolute turn numbers.
// Phase is derived from percentage position within the session.

export function instantiatePreset(structure: string | StoryStructure, expectedTurns: number): OutlineBeat[] {
  const templates = STRUCTURE_BEATS[structure];
  if (!templates) return [];
  const n = Math.max(4, expectedTurns);
  return templates.map(t => {
    const pctMid = (t.pct_start + t.pct_end) / 2;
    const phase: IllusionPhase =
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

export const STRUCTURE_NAMES: Record<StoryStructureName, string> = {
  save_the_cat: 'Save the Cat (15 beats)',
  dan_harmon: 'Dan Harmon Story Circle (8)',
  john_yorke: 'John Yorke 5 Acts',
  freytag: "Freytag's Pyramid (5)",
  sequence: 'Sequence Approach (8)',
  kishotenketsu: 'Kishōtenketsu (4)',
  three_act: 'Three-Act Structure (5)',
  syd_field: 'Syd Field Paradigm (7)',
  rashomon: 'Rashomon — Contested Accounts (5)',
  non_linear: 'Non-Linear / Fractured Chronology (5)',
  circular: 'Circular / Ouroboros (5)',
  hyperlink: 'Hyperlink Cinema (5)',
  fichtean_curve: 'Fichtean Curve (6)',
  in_media_res: 'In Media Res (5)',
  snowflake: 'Snowflake Method (6)',
  mystery_box: 'Mystery Box (6)',
  closed_circle: 'Closed Circle / Locked Room (6)',
  procedural_case: 'Procedural Case (6)',
  heist_structure: 'Heist Structure (6)',
  trial_structure: 'Trial Structure (6)',
  survival_structure: 'Survival Structure (6)',
  hero_journey: "Hero's Journey — Campbell/Vogler (12 stages)",
};
