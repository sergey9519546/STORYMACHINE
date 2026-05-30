// Wave 60 — Genre-Aware Prompt Routing (P8)
// Maps StoryGenre → a prompt modifier pack: tonal register, vocabulary
// constraints, forbidden clichés, and emotional pitch.  Composes orthogonally
// with the director-style modifiers in structure-presets.ts (STYLE_MODIFIERS):
// director style = HOW it's shot; genre = WHAT emotional contract the audience
// signed up for.  Both are injected into every agent + ScriptIDE prompt.

import type { StoryGenre } from '../engine/types.ts';

export interface GenreModifier {
  /** One-line tonal instruction injected into agent + generation prompts. */
  toneInstruction: string;
  /** Vocabulary / register guidance ("clipped and procedural", "lush and sensory"). */
  register: string;
  /** Clichés the model must actively avoid for this genre. */
  forbiddenCliches: string[];
  /** Where the emotional needle should sit by default (dread, warmth, wit…). */
  emotionalRegister: string;
}

export const GENRE_MODIFIERS: Record<StoryGenre, GenreModifier> = {
  thriller: {
    toneInstruction: 'GENRE — THRILLER: Every scene tightens a screw. Information is currency; someone always knows more than they admit. Keep the audience one step ahead of one character and one step behind another. Forward momentum is mandatory — no scene ends in the same place it began.',
    register: 'Lean, propulsive, present-tense urgency. Short declaratives under pressure.',
    forbiddenCliches: ['"We need to talk"', 'the villain monologuing their full plan', 'a convenient phone battery dying', '"It was all a dream"', 'the protagonist tripping while fleeing'],
    emotionalRegister: 'controlled dread escalating to panic',
  },
  horror: {
    toneInstruction: 'GENRE — HORROR: The threat is felt before it is seen. Dread accrues through wrongness in ordinary detail. What is withheld terrifies more than what is shown. Bodies and spaces betray their occupants. The violation is as much psychological as physical.',
    register: 'Sensory, tactile, slow-burn. Long uneasy beats punctured by sharp shocks.',
    forbiddenCliches: ['a cat jumping out for a fake scare', 'the lights conveniently failing', '"Is anyone there?"', 'a character investigating a noise alone for no reason', 'the monster fully revealed too early'],
    emotionalRegister: 'creeping unease curdling into terror',
  },
  drama: {
    toneInstruction: 'GENRE — DRAMA: The conflict is internal and relational. Stakes are measured in dignity, love, and self-knowledge, not survival. Subtext carries the weight; people rarely say the thing they most need to say. Change is earned slowly and costs something real.',
    register: 'Grounded, specific, emotionally precise. Silence and restraint do heavy lifting.',
    forbiddenCliches: ['a tidy redemptive speech', 'rain during the breakup', 'a deathbed confession that resolves everything', 'characters articulating their own arc out loud', 'a montage standing in for actual change'],
    emotionalRegister: 'aching restraint with rare, earned release',
  },
  comedy: {
    toneInstruction: 'GENRE — COMEDY: Character is the engine of the funny — people pursuing wants with misplaced confidence. Escalate through logic, not randomness: each beat is the inevitable-yet-surprising consequence of the last. Let characters keep their dignity stakes even when the situation is absurd.',
    register: 'Crisp timing, specificity over generality, rhythm built on setups and turns.',
    forbiddenCliches: ['breaking the fourth wall to explain a joke', 'a slip on a banana peel', 'random non-sequitur as a substitute for a real joke', 'a sassy best friend who only quips', 'mistaken identity that any sentence would resolve'],
    emotionalRegister: 'buoyant wit grounded in real desire',
  },
  romance: {
    toneInstruction: 'GENRE — ROMANCE: The central question is whether two people can risk being truly seen. Tension lives in proximity, restraint, and the gap between what is wanted and what is said. Obstacles must be internal (fear, history, self-protection), not merely external misunderstandings.',
    register: 'Warm, intimate, charged. Attention to gesture, glance, the unsaid.',
    forbiddenCliches: ['a love triangle resolved by one person being secretly awful', 'a misunderstanding that a single conversation would fix', 'running through an airport', '"I was a fool"', 'a makeover revealing hidden beauty'],
    emotionalRegister: 'yearning under self-protective wit',
  },
  sci_fi: {
    toneInstruction: 'GENRE — SCIENCE FICTION: One rigorously-applied premise reshapes human behavior; follow it to its honest consequences. The technology is a lens on a human question, never set dressing. Ground the speculative in lived, specific detail so the wonder feels inhabited.',
    register: 'Precise, grounded, unshowy about its own invention. Concrete over abstract.',
    forbiddenCliches: ['exposition dumps about how the tech works', 'a self-aware AI that just wants to be human', 'a chosen one prophecy', 'technobabble resolving the climax', 'the scientist who ignores an obvious warning'],
    emotionalRegister: 'awe disciplined by consequence',
  },
  noir: {
    toneInstruction: 'GENRE — NOIR: Everyone is compromised; the question is only the price. Moral fog, not moral clarity. The protagonist is pulled deeper by their own appetites and blind spots. The city, money, and desire are the real antagonists. Endings cost more than they pay.',
    register: 'Hard-boiled, shadowed, wry. Voice-thick narration; cynicism over sentiment.',
    forbiddenCliches: ['a femme fatale with no interiority', '"This city..." opening narration', 'a clean-handed hero', 'the case wrapping up with a tidy confession', 'venetian-blind shadows as the only mood'],
    emotionalRegister: 'fatalistic cool over buried longing',
  },
  mystery: {
    toneInstruction: 'GENRE — MYSTERY: Play fair — every clue the detective sees, the audience sees. The solution must be surprising yet inevitable in hindsight. Red herrings arise from character, not authorial trickery. The investigation reveals the world and its people, not just the culprit.',
    register: 'Observant, controlled, detail-forward. Withholding without cheating.',
    forbiddenCliches: ['a last-minute suspect introduced in the final act', 'the detective explaining everything to a gathered room with zero pushback', 'a twin nobody mentioned', 'the butler did it', 'a clue that was hidden from the audience'],
    emotionalRegister: 'cool curiosity sharpening to revelation',
  },
};

/**
 * Build a compact genre instruction block for prompt injection.
 * Returns an empty string when no genre is set (neutral default).
 */
export function genrePromptBlock(genre: StoryGenre | undefined): string {
  if (!genre) return '';
  const m = GENRE_MODIFIERS[genre];
  if (!m) return '';
  return [
    m.toneInstruction,
    `REGISTER: ${m.register}`,
    `EMOTIONAL DEFAULT: ${m.emotionalRegister}`,
    `AVOID THESE ${genre.toUpperCase()} CLICHÉS: ${m.forbiddenCliches.join('; ')}.`,
  ].join('\n');
}

export const GENRE_NAMES: Record<StoryGenre, string> = {
  thriller: 'Thriller',
  horror:   'Horror',
  drama:    'Drama',
  comedy:   'Comedy',
  romance:  'Romance',
  sci_fi:   'Science Fiction',
  noir:     'Noir',
  mystery:  'Mystery',
};
