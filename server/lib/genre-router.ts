// Wave 60 — Genre-Aware Prompt Routing (P8)
// Maps StoryGenre → a prompt modifier pack: tonal register, vocabulary
// constraints, forbidden clichés, and emotional pitch.  Composes orthogonally
// with the director-style modifiers in structure-presets.ts (STYLE_MODIFIERS):
// director style = HOW it's shot; genre = WHAT emotional contract the audience
// signed up for.  Both are injected into every agent + ScriptIDE prompt.
//
// Wave 128 — P8 Synergy Compositor:
// Added composePromptModifiers(genre, directorStyle) which merges both modifier
// packs and applies one of 14 high-value synergy overrides when a cinematically
// productive combination is detected.  Use this instead of the two separate
// styleBlock + genreBlock injection pattern.

import type { StoryGenre, DirectorStyle } from '../engine/types.ts';
import { STYLE_MODIFIERS } from './structure-presets.ts';

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

// ── Genre × Director Synergy Overrides ───────────────────────────────────────
// When a high-value genre+director combination is detected, replace the
// separate genre and director blocks with a single unified instruction that
// captures the emergent voice of that specific pairing.
// 14 overrides covering the most cinematically productive combinations.

export interface SynergyModifier {
  /** Single unified instruction replacing the separate genre + director blocks. */
  combinedInstruction: string;
}

// Key format: `${genre}_${directorStyle}`
export const SYNERGY_OVERRIDES: Partial<Record<string, SynergyModifier>> = {

  thriller_hitchcock: {
    combinedInstruction: `SYNERGY — THRILLER × HITCHCOCK: This is the apex of suspense cinema. The audience holds a secret the characters are dying to uncover — or dying because they can't. Information is weaponised, not merely withheld. Every object in this scene has a second function: the MacGuffin, the planted bomb, the letter that must not be opened. Plant something now that will explode in a later scene. Let the audience squirm with what they know while the characters remain blind. Withhold the key detail until the last possible moment, then make its revelation feel inevitable. Register: lean, propulsive, controlled dread building to one precise release. Forbidden: cheap reversals, unmotivated reveals, villains who explain themselves before they are caught.`,
  },

  horror_aster: {
    combinedInstruction: `SYNERGY — HORROR × ARI ASTER: The horror here is a grief that has become a haunting. Something was lost — a person, a belief, an innocence — and the loss has colonised everything. The monster is not external; it grew from within the family, the community, the self. Politeness is the most terrifying sound in this scene. When a character says something kind, something must be implied beneath it that is unspeakable. The ritual is wrong. The ceremony is wrong. The food looks wrong. Normalcy is the mask the horror wears to stay in the room. Every scene escalates what should not be happening while all parties maintain the fiction that everything is fine. Register: uncanny social precision, performed normalcy that barely holds, the domestic as a site of unprocessed violence. Forbidden: external monsters that arrive from outside, jump-scares, resolutions, catharsis.`,
  },

  horror_lynch: {
    combinedInstruction: `SYNERGY — HORROR × DAVID LYNCH: This is dreamtime horror — the logic is inverted and the threat lives in the textures. The monster has already been here; it left traces in the wallpaper, in the way the light hits, in the sentence that ended wrong. A character will say something perfectly pleasant that means something else entirely. There is a room beyond this room. Something in the corner is not breathing correctly. The uncanny is everywhere and nobody mentions it because everybody knows. A word will be used that doesn't belong in this sentence. The horror is not what the dream shows — it is what the dream refuses to explain. Register: oblique, fragmented, mundane-grotesque. Forbidden: explicit threats with clear causes, any line that explains what is wrong.`,
  },

  mystery_hitchcock: {
    combinedInstruction: `SYNERGY — MYSTERY × HITCHCOCK: The audience is the only true detective here. Every character knows something the others don't — and the audience knows something the detective doesn't yet suspect. The clue has been in plain sight since scene one; someone is now trying to move it. Plant an object this scene. Have someone almost ask the right question, then flinch. The solution is not intelligence — it is nerve: who has the nerve to look directly at what they know? The investigation is a map of everyone's complicity. Register: observational, controlled, a single pivot of attention that reorganises everything. Forbidden: last-minute evidence, characters withholding for no narrative reason, convenient witnesses who appear only to deliver exposition.`,
  },

  mystery_fincher: {
    combinedInstruction: `SYNERGY — MYSTERY × FINCHER: The crime scene is a document. Read it. Every inconsistency is intentional — someone constructed this scene for an audience of one: you. The wrong object is in the wrong place. The timeline doesn't fit. A detail that seems insignificant is the entire key. Someone in this room is cataloguing your responses. The investigation reveals not just the culprit but the sickness underneath: the system's rot, the institution's complicity, the silence everyone agreed to keep. The detective is not solving the crime — they are being forced to see what the crime was built to make them see. Register: obsessive, precise, methodical to the point of violence. Every sentence either advances the case or conceals it. Forbidden: emotional outbursts, untraceable hunches, theatrical reveals, loose ends that serve atmosphere rather than argument.`,
  },

  noir_hitchcock: {
    combinedInstruction: `SYNERGY — NOIR × HITCHCOCK: The compromised world of noir meets the master of information control. Everyone here is guilty of something — the detective included — and everyone knows everyone else's price. The real antagonist is the secret the protagonist is actively choosing not to look at. Suspense here is not "what will happen" but "when will they stop pretending they don't know." Plant the incriminating detail. Watch who avoids looking at it. The MacGuffin is complicity itself: everyone wants it, nobody will say what it is. Register: shadowed, wry, the cold precision of someone who has seen this particular trap before. Forbidden: clean heroes, simple motives, exits that lead anywhere other than deeper in.`,
  },

  noir_lynch: {
    combinedInstruction: `SYNERGY — NOIR × DAVID LYNCH: This city has a dream that nobody consented to. The corruption is not criminal — it is ontological. You can't follow the money because the money leads to a room that shouldn't exist. Someone in this conversation is speaking from a script they don't remember receiving. The diner is open all night and the coffee is always perfect and something is deeply, cosmically wrong. Moral fog, yes — but this fog has a texture, a smell, a sound like a fly at a window. The femme fatale is real and also a projection of a wound you can't name. Register: hard-boiled voice-over narrating a dream that keeps changing its rules. Trust nothing, especially your own memory of what just happened. Forbidden: resolution, clean causality, exits that lead out of the dream.`,
  },

  drama_villeneuve: {
    combinedInstruction: `SYNERGY — DRAMA × VILLENEUVE: Human intimacy under geological pressure. The relationship in this scene is the smallest thing in the largest frame — and yet it is everything. Silence is the primary language. What is left unsaid does not hover in the air; it settles into the architecture, into the bodies, into the space between chairs. The stakes are dignity, love, self-knowledge — but they are rendered at the scale of irreversibility. Someone is making a decision in this scene that they will spend the rest of their life inside. Let the weight of it be felt without being named. The environment is not backdrop — it is argument: this is what you are now inside of. Register: slow, precise, earned. The camera holds. No one flinches before they should. Forbidden: explanatory dialogue, rushed resolutions, emotional shortcuts, anything that arrives before it has been fully earned.`,
  },

  drama_aster: {
    combinedInstruction: `SYNERGY — DRAMA × ARI ASTER: This is family drama as psychological haunting. The wound is not being discussed — it is being performed around, accommodated, elaborated. Every polite exchange in this scene is a negotiation about who gets to be the wound-carrier and who gets to pretend they've healed. Someone is smiling too carefully. Someone has rehearsed this conversation in the mirror. The love here is real and the damage is real and they are the same thing. The horror is recognisable: it is just a family at a table. Register: precise social observation, performed normalcy, the domestic as uncanny. Forbidden: catharsis, the moment of honest declaration that finally clears the air — it won't clear, and a scene that ends in understanding is a scene that ended too early.`,
  },

  sci_fi_nolan: {
    combinedInstruction: `SYNERGY — SCIENCE FICTION × NOLAN: The premise is time, or something isomorphic to it — recursion, causality loops, parallel states, the architecture of memory. The character in this scene may already know the outcome; may have caused it; may be in the loop that creates the very thing they are trying to prevent. Speak in implications. Reference events that haven't happened yet in this timeline but that this character somehow anticipates. The architecture of the dialogue matters as much as its content — a sentence that opens a paradox, a question that already contains its answer. Register: cerebral, controlled, the feeling of a trap that is also a door. Forbidden: exposition of the rules, characters who explain the mechanism to each other, endings that untangle the paradox rather than completing it.`,
  },

  sci_fi_villeneuve: {
    combinedInstruction: `SYNERGY — SCIENCE FICTION × VILLENEUVE: The premise reshapes what it means to be human — and this character is standing at the threshold of that reshaping. The technology or the alien or the new world is indifferent, immense, and patient. The human drama is rendered in the gap between the old self — who had assumptions, language, loved ones — and the new reality that has no place for those things. Speak slowly. The wonder and the grief are inseparable. Something irreversible is being learned. Register: spare, luminous, weight carried in restraint. The scale of what surrounds the character is always present, pressing. Forbidden: technobabble, action as a substitute for confronting what has changed, endings that resolve the transformation into comfort.`,
  },

  thriller_fincher: {
    combinedInstruction: `SYNERGY — THRILLER × FINCHER: Every scene is a trap. The evidence has been arranged, the timeline constructed, the frame built with methodical intelligence that predates this moment by weeks. Someone in this scene is two moves ahead — and they have been since before the story started. Information has been withheld not for drama but for architecture: when it lands, it reorganises everything that came before. Short sentences. The gap between what is known and what is stated is the entire thriller. Register: clinical, procedural, the sensation of inevitability that reads as acceleration. The protagonist is catching up to something that has been planned for them. Forbidden: improvised threats, monologuing antagonists, any information delivered before it has maximum structural impact.`,
  },

  comedy_lynch: {
    combinedInstruction: `SYNERGY — COMEDY × DAVID LYNCH: This is absurdist comedy — the humor lives in the gap between total normalcy and total wrongness, played with complete deadpan sincerity. The scene obeys dream logic: the non-sequitur is the punchline and also the truth. A character will say something completely mundane that is also completely inexplicable, and no one will acknowledge that anything unusual happened. The comedy is not in jokes — it is in the unflappable commitment of all parties to the reality of what is clearly, cosmically not happening. Register: deadpan, precise, deeply strange beneath a surface of cheerful normality. The funniest line is the one delivered with the most sincerity. Forbidden: winking at the camera, explaining the joke, resolving the absurdity into sense.`,
  },

  romance_villeneuve: {
    combinedInstruction: `SYNERGY — ROMANCE × VILLENEUVE: Love as the one human force that contests the scale of everything. The two people in this scene are the smallest objects in the largest possible frame — and they are all that matters. Proximity is charged not with heat but with gravity: being in the same room as this person changes the air pressure. What is felt cannot be said yet — but it is felt completely, and the silence is not empty, it is full. The stakes of this moment — saying nothing, saying too much, leaving, staying — are rendered at the scale of geological change. Let the space between them do the work. Register: slow, precise, luminous restraint. Forbidden: declarations, direct statements of feeling, the moment of confession arrived at too easily, any shortcut to intimacy.`,
  },
};

// ── Composed modifier output ──────────────────────────────────────────────────

export interface ComposedModifiers {
  /** Full combined prompt block ready for injection into agent/generation prompts. */
  block: string;
  /** True when a synergy override fired for this genre+director combination. */
  hasSynergy: boolean;
}

/**
 * Compose genre and director style into a single prompt modifier block.
 *
 * When a high-value synergy override exists for the (genre, directorStyle) pair,
 * the override replaces both the genre and director blocks with a single unified
 * instruction.  When no synergy override exists, the director instruction and
 * genre block are concatenated in order: style (HOW) then genre (WHAT).
 *
 * Use this everywhere instead of the old two-block pattern:
 *   const styleBlock = …STYLE_MODIFIERS[style]?.agentInstruction…
 *   const genreBlock = …genrePromptBlock(genre)…
 * Replace with:
 *   const { block } = composePromptModifiers(genre, style);
 */
export function composePromptModifiers(
  genre: StoryGenre | undefined,
  directorStyle: DirectorStyle | undefined,
): ComposedModifiers {
  const synergyKey = genre && directorStyle ? `${genre}_${directorStyle}` : null;
  const synergy = synergyKey ? SYNERGY_OVERRIDES[synergyKey] : null;

  if (synergy) {
    return { block: synergy.combinedInstruction, hasSynergy: true };
  }

  const parts: string[] = [];
  if (directorStyle) {
    const sm = STYLE_MODIFIERS[directorStyle];
    if (sm?.agentInstruction) parts.push(sm.agentInstruction);
  }
  const g = genre ? genrePromptBlock(genre) : '';
  if (g) parts.push(g);

  return { block: parts.join('\n\n'), hasSynergy: false };
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

// ── Wave 1184 additions (Program v2, Type 3 — genre-conditioned) ────────────
// GENRE_MODIFIERS above feeds prompt text (HOW to write). This table feeds
// revision-pass THRESHOLDS (WHAT counts as a defect) for a small set of
// high-firing generic rules where a genre legitimately moves the bar — never
// to quiet a rule for everyone, only to make the guard fire on genuinely
// different craft expectations. Each numeric field is OPTIONAL per genre: a
// genre with no live modifier for a given rule (or no entry in this table at
// all) falls through to that rule's own generic constant, so
// storyContext.genre being absent, unknown, or simply not listed here is
// always byte-identical to the pre-Wave-1184 behavior. Consuming pass files
// look this up via `GENRE_RULE_MODIFIERS[genre]?.<field> ?? <generic default>`
// — see server/nvm/revision/passes/pacing.ts (ENERGY_MONOTONE,
// PACING_PLATEAU) and structure.ts (DARK_NIGHT_ABSENT) for the call sites and
// the one-sentence craft argument behind each threshold.
export interface GenreRuleThresholds {
  /** ENERGY_MONOTONE (pacing.ts): the scene-length coefficient-of-variation
   *  cutoff below which the story is flagged as rhythmically monotone.
   *  Generic default 0.35 (lower CoV = more uniform = more likely to fire). */
  energyMonotoneCoV?: number;
  /** PACING_PLATEAU (pacing.ts): the max/min length ratio a 4-scene window
   *  may span and still count as a "flat" plateau. Generic default 1.2
   *  (a smaller ratio makes the plateau check fire on tighter windows). */
  pacingPlateauRatio?: number;
  /** DARK_NIGHT_ABSENT (structure.ts): the suspenseDelta a negative-
   *  emotional-shift scene in the pre-climax zone must clear to count as the
   *  story's "all is lost" beat. Generic default 1 (a higher floor makes the
   *  beat harder to satisfy, so absence fires more readily). */
  darkNightSuspenseFloor?: number;
}

export const GENRE_RULE_MODIFIERS: Partial<Record<StoryGenre, GenreRuleThresholds>> = {
  // Thriller's contract is forward momentum in every scene (see
  // GENRE_MODIFIERS.thriller: "no scene ends in the same place it began"), so
  // even moderate scene-length uniformity already reads as a stall — both
  // rhythm checks tighten (fire more readily) for thriller.
  thriller: {
    energyMonotoneCoV: 0.45,
    pacingPlateauRatio: 1.3,
  },
  // Drama's register is grounded restraint (GENRE_MODIFIERS.drama: "silence
  // and restraint do heavy lifting"), so a sustained, deliberately uniform
  // cadence is a legitimate stylistic choice, not a defect — both rhythm
  // checks loosen (fire less readily) for drama.
  drama: {
    energyMonotoneCoV: 0.25,
    pacingPlateauRatio: 1.1,
  },
  // Comedy's low point is measured in dignity and embarrassment, not survival
  // dread (GENRE_MODIFIERS.comedy: "let characters keep their dignity stakes
  // even when the situation is absurd"), so a milder suspense dip still
  // legitimately counts as the "all is lost" beat — the floor loosens.
  comedy: {
    darkNightSuspenseFloor: 0.5,
  },
  // Horror's low point must carry genuine dread, not a passing dip
  // (GENRE_MODIFIERS.horror: "creeping unease curdling into terror"), so the
  // beat needs a higher suspense floor to count as earned — the floor tightens.
  horror: {
    darkNightSuspenseFloor: 1.5,
  },
};
