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
//
// B1-a — Genre Engine Expansion:
// Genre must be COMPOSABLE and must modify engine behavior, not just
// vocabulary. Three additions:
//   1. GenreId widens the routing surface from the original 8 StoryGenre
//      union members to 28 total (the 8 plus 20 new genres spanning the
//      highest-coverage real-world submission categories). engine/types.ts's
//      StoryGenre union is intentionally left untouched — it is a foreign
//      file outside this module's ownership boundary — so GenreId is defined
//      here as StoryGenre plus the 20 new literal members. StoryGenre is a
//      structural subset of GenreId, so every existing call site that is
//      typed to pass `StoryGenre | undefined` keeps compiling unchanged.
//   2. TONE_REGISTERS is a new, orthogonal axis (mood/register) separate from
//      genre (category/contract). A tone contributes a prompt instruction and
//      OPTIONAL numeric deltas to the same 6 rule-threshold fields genre
//      modifiers use. composeThresholds(genre, tone) composes genre base +
//      tone delta, clamped to a documented plausibility range per field, so a
//      typo can never push a threshold order-of-magnitude out of bounds.
//   3. genreRules + genrePromiseBlock() give every genre a structural
//      contract (central threat, information position, required beats,
//      forbidden shortcuts) that generation must obey — this is what makes
//      genre modify engine behavior rather than just word choice.
// Persistence note: story_tone is NOT added to IllusionState (engine/types.ts
// is foreign to this module) — see server/routes/config.ts's story-tone route
// for the in-memory, per-session mechanism used instead.

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
  /** Structural contract the genre must honor — see genrePromiseBlock(). */
  genreRules: GenreRules;
}

// ── Genre structural contract (B1-a) ─────────────────────────────────────────
// A genre is not just vocabulary — it is a promise about HOW information and
// threat move through the story. GenreRules captures that promise so it can be
// rendered into a prompt block (genrePromiseBlock) and, in a future wave,
// checked against generated output the same way GENRE_RULE_MODIFIERS already
// checks numeric thresholds.

/**
 * Where the audience's knowledge should sit relative to the characters':
 *  - 'superior': audience typically knows more than at least one character
 *    (dramatic irony — thriller, heist, comedy of errors).
 *  - 'inferior': audience typically knows less than the characters, or
 *    discovers the truth alongside/behind them (horror, noir, gothic).
 *  - 'parity': audience learns exactly what the characters learn, in step
 *    (fair-play mystery, procedural drama).
 */
export type InformationPosition = 'superior' | 'inferior' | 'parity';

export interface GenreRules {
  /** The central source of danger or pressure this genre's plot must supply. */
  threatType: string;
  /** Default dramatic-irony posture for this genre (see InformationPosition). */
  informationPositionDefault: InformationPosition;
  /** Craft behaviors generation must exhibit to honor the genre's contract. */
  requiredBehaviors: string[];
  /** Shortcuts that break the genre's contract even if superficially plausible. */
  forbiddenShortcuts: string[];
}

// TO ADD A NEW GENRE: add the literal to GenreId below, then add a matching
// entry to GENRE_MODIFIERS. engine/types.ts's StoryGenre union only needs to
// grow if a caller wants to *persist* the new genre through IllusionState —
// GenreId itself does not depend on that union changing.
export type GenreId =
  | StoryGenre
  | 'action'
  | 'adventure'
  | 'crime'
  | 'fantasy'
  | 'western'
  | 'war'
  | 'historical'
  | 'biopic'
  | 'musical'
  | 'family'
  | 'documentary_style'
  | 'heist'
  | 'courtroom'
  | 'survival'
  | 'coming_of_age'
  | 'satire'
  | 'folk_horror'
  | 'cyberpunk'
  | 'gothic'
  | 'melodrama';

export const GENRE_MODIFIERS: Record<GenreId, GenreModifier> = {
  // ── Original 8 (unchanged tone/register/cliché/emotional fields — only the
  // new genreRules field is appended to each) ────────────────────────────────
  thriller: {
    toneInstruction: 'GENRE — THRILLER: Every scene tightens a screw. Information is currency; someone always knows more than they admit. Keep the audience one step ahead of one character and one step behind another. Forward momentum is mandatory — no scene ends in the same place it began.',
    register: 'Lean, propulsive, present-tense urgency. Short declaratives under pressure.',
    forbiddenCliches: ['"We need to talk"', 'the villain monologuing their full plan', 'a convenient phone battery dying', '"It was all a dream"', 'the protagonist tripping while fleeing'],
    emotionalRegister: 'controlled dread escalating to panic',
    genreRules: {
      threatType: 'an antagonist with agency actively working against the protagonist in real time',
      informationPositionDefault: 'superior',
      requiredBehaviors: [
        'plant every device that will be used before it fires',
        'give the audience information at least one character does not have',
        'escalate stakes at every act break',
      ],
      forbiddenShortcuts: [
        'a threat resolved by a coincidence the story never earned',
        'a reveal with no groundwork planted earlier',
      ],
    },
  },
  horror: {
    toneInstruction: 'GENRE — HORROR: The threat is felt before it is seen. Dread accrues through wrongness in ordinary detail. What is withheld terrifies more than what is shown. Bodies and spaces betray their occupants. The violation is as much psychological as physical.',
    register: 'Sensory, tactile, slow-burn. Long uneasy beats punctured by sharp shocks.',
    forbiddenCliches: ['a cat jumping out for a fake scare', 'the lights conveniently failing', '"Is anyone there?"', 'a character investigating a noise alone for no reason', 'the monster fully revealed too early'],
    emotionalRegister: 'creeping unease curdling into terror',
    genreRules: {
      threatType: 'a force, supernatural, psychological, or human, whose full nature is initially unknown',
      informationPositionDefault: 'inferior',
      requiredBehaviors: [
        'establish the ordinary world before violating it',
        'withhold full explanation of the threat until it has been earned',
        'give the threat internal logic even if unstated',
      ],
      forbiddenShortcuts: [
        'a jump scare with no dread built beforehand',
        'a monster fully explained before its rules have been tested',
      ],
    },
  },
  drama: {
    toneInstruction: 'GENRE — DRAMA: The conflict is internal and relational. Stakes are measured in dignity, love, and self-knowledge, not survival. Subtext carries the weight; people rarely say the thing they most need to say. Change is earned slowly and costs something real.',
    register: 'Grounded, specific, emotionally precise. Silence and restraint do heavy lifting.',
    forbiddenCliches: ['a tidy redemptive speech', 'rain during the breakup', 'a deathbed confession that resolves everything', 'characters articulating their own arc out loud', 'a montage standing in for actual change'],
    emotionalRegister: 'aching restraint with rare, earned release',
    genreRules: {
      threatType: 'an internal or relational rupture the protagonist must actually face',
      informationPositionDefault: 'parity',
      requiredBehaviors: [
        'let subtext carry the real meaning of the scene',
        'make change cost something specific and visible',
        'root every conflict in a stated or implied want',
      ],
      forbiddenShortcuts: [
        'a speech that resolves the internal conflict instead of an earned action',
        'a redemption with no preceding cost',
      ],
    },
  },
  comedy: {
    toneInstruction: 'GENRE — COMEDY: Character is the engine of the funny — people pursuing wants with misplaced confidence. Escalate through logic, not randomness: each beat is the inevitable-yet-surprising consequence of the last. Let characters keep their dignity stakes even when the situation is absurd.',
    register: 'Crisp timing, specificity over generality, rhythm built on setups and turns.',
    forbiddenCliches: ['breaking the fourth wall to explain a joke', 'a slip on a banana peel', 'random non-sequitur as a substitute for a real joke', 'a sassy best friend who only quips', 'mistaken identity that any sentence would resolve'],
    emotionalRegister: 'buoyant wit grounded in real desire',
    genreRules: {
      threatType: 'a social or personal embarrassment the character is trying to avoid or fix',
      informationPositionDefault: 'superior',
      requiredBehaviors: [
        'escalate the situation through choices the character makes, not outside randomness',
        'let every character keep a real want driving the joke',
        'earn each turn as the logical next step from the last',
      ],
      forbiddenShortcuts: [
        'a joke resolved by random non-sequitur with no setup',
        'a misunderstanding a single honest sentence would dissolve',
      ],
    },
  },
  romance: {
    toneInstruction: 'GENRE — ROMANCE: The central question is whether two people can risk being truly seen. Tension lives in proximity, restraint, and the gap between what is wanted and what is said. Obstacles must be internal (fear, history, self-protection), not merely external misunderstandings.',
    register: 'Warm, intimate, charged. Attention to gesture, glance, the unsaid.',
    forbiddenCliches: ['a love triangle resolved by one person being secretly awful', 'a misunderstanding that a single conversation would fix', 'running through an airport', '"I was a fool"', 'a makeover revealing hidden beauty'],
    emotionalRegister: 'yearning under self-protective wit',
    genreRules: {
      threatType: 'internal fear or self-protection standing between two people who want each other',
      informationPositionDefault: 'parity',
      requiredBehaviors: [
        'root every obstacle in character psychology, not external misunderstanding alone',
        'let restraint and proximity generate tension before any declaration',
        'make the risk of being truly seen concrete in at least one scene',
      ],
      forbiddenShortcuts: [
        'a conflict solved by one conversation that could have happened three scenes earlier',
        'a resolution via external event rather than internal risk taken',
      ],
    },
  },
  sci_fi: {
    toneInstruction: 'GENRE — SCIENCE FICTION: One rigorously-applied premise reshapes human behavior; follow it to its honest consequences. The technology is a lens on a human question, never set dressing. Ground the speculative in lived, specific detail so the wonder feels inhabited.',
    register: 'Precise, grounded, unshowy about its own invention. Concrete over abstract.',
    forbiddenCliches: ['exposition dumps about how the tech works', 'a self-aware AI that just wants to be human', 'a chosen one prophecy', 'technobabble resolving the climax', 'the scientist who ignores an obvious warning'],
    emotionalRegister: 'awe disciplined by consequence',
    genreRules: {
      threatType: 'the honest consequence of one rigorously applied speculative premise',
      informationPositionDefault: 'parity',
      requiredBehaviors: [
        'follow the implications of the premise into every corner of the world, not just the plot',
        'ground speculative elements in specific, lived detail',
        'let the technology or premise be a lens on a human question',
      ],
      forbiddenShortcuts: [
        'technobabble resolving the climax with no established mechanic',
        'a premise violated for convenience once it becomes inconvenient',
      ],
    },
  },
  noir: {
    toneInstruction: 'GENRE — NOIR: Everyone is compromised; the question is only the price. Moral fog, not moral clarity. The protagonist is pulled deeper by their own appetites and blind spots. The city, money, and desire are the real antagonists. Endings cost more than they pay.',
    register: 'Hard-boiled, shadowed, wry. Voice-thick narration; cynicism over sentiment.',
    forbiddenCliches: ['a femme fatale with no interiority', '"This city..." opening narration', 'a clean-handed hero', 'the case wrapping up with a tidy confession', 'venetian-blind shadows as the only mood'],
    emotionalRegister: 'fatalistic cool over buried longing',
    genreRules: {
      threatType: 'the protagonist own compromised appetite, wielded against them by a corrupt world',
      informationPositionDefault: 'inferior',
      requiredBehaviors: [
        'keep every character genuinely compromised, never simply clean',
        'make the ending cost the protagonist more than it pays',
        'let cynicism be earned by a specific betrayal, not just by tone',
      ],
      forbiddenShortcuts: [
        'a clean-handed hero surviving the noir world with no compromise',
        'a tidy confession that resolves the case with no residual cost',
      ],
    },
  },
  mystery: {
    toneInstruction: 'GENRE — MYSTERY: Play fair — every clue the detective sees, the audience sees. The solution must be surprising yet inevitable in hindsight. Red herrings arise from character, not authorial trickery. The investigation reveals the world and its people, not just the culprit.',
    register: 'Observant, controlled, detail-forward. Withholding without cheating.',
    forbiddenCliches: ['a last-minute suspect introduced in the final act', 'the detective explaining everything to a gathered room with zero pushback', 'a twin nobody mentioned', 'the butler did it', 'a clue that was hidden from the audience'],
    emotionalRegister: 'cool curiosity sharpening to revelation',
    genreRules: {
      threatType: 'a concealed truth (culprit, cause, or event) reconstructible from planted evidence',
      informationPositionDefault: 'parity',
      requiredBehaviors: [
        'give every clue a traceable, in-world source',
        'make every red herring factually true even if misleading in implication',
        'have the final reveal reclassify prior facts rather than introduce new ones',
      ],
      forbiddenShortcuts: [
        'a culprit with no prior setup or planted opportunity',
        'a clue withheld from the audience but known to the detective',
      ],
    },
  },

  // ── New genres (B1-a) ───────────────────────────────────────────────────────
  action: {
    toneInstruction: 'GENRE — ACTION: Physical stakes are legible and escalating; every set piece raises the difficulty and the cost of failure. The competence of the protagonist is shown through problem-solving under pressure, not invincibility. Geography and mechanics of the space must be clear enough that the audience can track who has the advantage moment to moment.',
    register: 'Kinetic, visual, verb-driven. Short bursts of description matching the speed of the action; dialogue is sparse and functional under duress.',
    forbiddenCliches: ['the hero walking away from an explosion without looking back', 'unlimited ammo with no reload beats', 'a villain who explains the plan while holding the upper hand', 'hand-to-hand combat with zero apparent injury cost', 'the one-liner delivered after every kill'],
    emotionalRegister: 'adrenalized resolve under mounting physical cost',
    genreRules: {
      threatType: 'an escalating physical threat with a legible plan or force behind it',
      informationPositionDefault: 'parity',
      requiredBehaviors: [
        'keep the geography and mechanics of each set piece legible',
        'raise the physical and personal cost of failure at every set piece',
        'show competence through problem-solving under pressure, not invincibility',
      ],
      forbiddenShortcuts: [
        'a resolved threat with no visible cost to the hero',
        'a set piece that only escalates spectacle with no rise in stakes',
      ],
    },
  },
  adventure: {
    toneInstruction: 'GENRE — ADVENTURE: The world itself is a character — exotic, dangerous, worth crossing. The quest structure rewards curiosity and resourcefulness; obstacles are puzzles as much as threats. Wonder and peril share the same beat.',
    register: 'Vivid, sensory, forward-leaning. Momentum carries scenes; description earns its keep by making the unfamiliar feel touchable.',
    forbiddenCliches: ['a map that conveniently reveals the entire solution', 'a local guide who exists only to die for the growth of the hero', 'treasure that turns out to be a moral lesson with no material cost', 'a cave-in that resolves itself off-screen', 'a reluctant hero who accepts the call with zero real cost'],
    emotionalRegister: 'buoyant wonder shadowed by real risk',
    genreRules: {
      threatType: 'the hostile or unpredictable unknown of the world being crossed',
      informationPositionDefault: 'inferior',
      requiredBehaviors: [
        'make the world itself an obstacle with its own internal logic',
        'reward curiosity and resourcefulness over brute force',
        'balance wonder with real, specific peril in the same beat',
      ],
      forbiddenShortcuts: [
        'a map or clue that hands over the full solution with no work done by the characters',
        'peril resolved by outside rescue with no character contribution',
      ],
    },
  },
  crime: {
    toneInstruction: 'GENRE — CRIME: Institutions and the underworld mirror each other; the line between cop and criminal is procedural, not moral. Consequences compound — one choice under pressure reshapes every relationship after it. The work itself (the job, the heist, the hit, the investigation) is rendered with expert specificity.',
    register: 'Procedural, unsentimental, and literate about the detail of how the work actually gets done.',
    forbiddenCliches: ['the one last job before retirement', 'a criminal mastermind undone by a single unmotivated mistake', 'a detective who breaks every rule with zero institutional consequence', 'loyalty betrayed for no articulated reason', 'a rival gang that exists only as a plot obstacle'],
    emotionalRegister: 'cold calculation fraying into consequence',
    genreRules: {
      threatType: 'the compounding consequence of one choice inside a criminal or institutional system',
      informationPositionDefault: 'superior',
      requiredBehaviors: [
        'render the mechanics of the job or investigation with expert specificity',
        'let one pressured choice reshape every relationship that follows',
        'keep institutional and criminal logic mirrored, not moralized',
      ],
      forbiddenShortcuts: [
        'a betrayal with no motivated buildup',
        'a rule broken by the protagonist with zero institutional consequence',
      ],
    },
  },
  fantasy: {
    toneInstruction: 'GENRE — FANTASY: Magic operates by rules the audience can learn and the story respects — cost and limitation, not deus ex machina. The history of the world presses on the present; myth is infrastructure, not decoration. Wonder is earned by internal consistency, not scale alone.',
    register: 'Immersive, textured, and precise about how the systems of the world work even when unexplained aloud.',
    forbiddenCliches: ['a prophecy that removes the need for character choice', 'magic that conveniently solves the exact problem with no prior setup', 'an evil that is evil for no reason beyond genre convention', 'an info-dump council scene explaining the whole world at once', 'a chosen one whose specialness requires no earned skill'],
    emotionalRegister: 'awe tempered by real cost',
    genreRules: {
      threatType: 'a force whose power is bound by the rules and costs of the world own magic system',
      informationPositionDefault: 'parity',
      requiredBehaviors: [
        'establish the cost and limitation of magic before it solves a problem',
        'let world history and myth exert pressure on present events',
        'earn wonder through the internal consistency of the system',
      ],
      forbiddenShortcuts: [
        'magic solving the exact problem with no earlier setup of that capability',
        'a prophecy substituting for an actual character choice',
      ],
    },
  },
  western: {
    toneInstruction: 'GENRE — WESTERN: The frontier is a moral vacuum where law is improvised and violence is a language everyone speaks fluently. Silence carries authority; competence is proven through restraint until restraint fails. The land is indifferent and unforgiving — it does not reward good intentions.',
    register: 'Spare, plainspoken, and full of weighted pauses. Dialogue earns every word; the environment does narrative work.',
    forbiddenCliches: ['the stranger with no name arrives in town wordlessly', 'a showdown at high noon with no real stakes behind it', 'a saloon brawl used as filler with no consequence', 'a sheriff who is simply good with no cost to that goodness', 'a native character reduced to scenery or a single trope'],
    emotionalRegister: 'stoic resolve masking hard-earned grief',
    genreRules: {
      threatType: 'a violent reckoning made inevitable by the frontier absent or improvised law',
      informationPositionDefault: 'parity',
      requiredBehaviors: [
        'let silence and restraint carry as much weight as any line of dialogue',
        'make violence cost something specific when it arrives',
        'root every showdown in stakes established earlier, not genre reflex',
      ],
      forbiddenShortcuts: [
        'a showdown staged with no real stakes behind it',
        'a mysterious past left as unexamined set dressing',
      ],
    },
  },
  war: {
    toneInstruction: 'GENRE — WAR: Survival and duty pull against each other in real time; command decisions cost identifiable lives. The chaos of combat is legible through the eyes of one or two characters, never abstracted into spectacle for its own sake. Camaraderie is the load-bearing wall against the atrocity around it.',
    register: 'Visceral, immediate, and unglamorous about violence and its aftermath.',
    forbiddenCliches: ['a soldier who shows a photo of a sweetheart right before dying', 'a general with zero doubt about any order given', 'combat rendered as bloodless spectacle', 'the enemy shown as uniformly faceless with no interiority', 'a speech that turns the horror of war into simple triumph'],
    emotionalRegister: 'grim endurance punctuated by grief',
    genreRules: {
      threatType: 'a command decision or combat event with a specific, named human cost',
      informationPositionDefault: 'parity',
      requiredBehaviors: [
        'keep the human cost of every order or engagement legible through one or two characters',
        'let camaraderie be the counterweight to the surrounding atrocity',
        'render violence and its aftermath without glamorizing spectacle',
      ],
      forbiddenShortcuts: [
        'a death used purely for shock with no established relationship',
        'a triumphant ending that erases the cost the story itself established',
      ],
    },
  },
  historical: {
    toneInstruction: 'GENRE — HISTORICAL: The past is rendered on its own terms — values, constraints, and stakes the characters actually lived by, not modern sensibility grafted backward. Real events provide the frame; the human story inside them supplies the drama. Anachronism of feeling is as costly as anachronism of fact.',
    register: 'Grounded, period-literate, and exact about the texture of daily constraint.',
    forbiddenCliches: ['a protagonist whose values are conveniently modern and shared by no one else in the period', 'history-textbook dialogue explaining context to the audience', 'a historical figure reduced to a single famous quote', 'a love story that erases the real political stakes of its setting', 'an ending that resolves what the historical record left open'],
    emotionalRegister: 'dignity under the pressure of its era',
    genreRules: {
      threatType: 'the constraint of the period real social, political, or material limits',
      informationPositionDefault: 'parity',
      requiredBehaviors: [
        'keep character values and choices legible within the logic of the period',
        'let real historical stakes inform the personal story, not just the backdrop',
        'earn any deviation from the historical record with clear dramatic purpose',
      ],
      forbiddenShortcuts: [
        'a protagonist with anachronistically modern values shared by no one else in the world',
        'an ending that neatly resolves what the historical record actually left open',
      ],
    },
  },
  biopic: {
    toneInstruction: 'GENRE — BIOPIC: A life is not a highlight reel; select the throughline that makes this particular person legible, and let the rest go. The subject must be allowed real flaws and real costs — hagiography is the death of the form. One transformative period should carry the emotional weight of the whole life.',
    register: 'Intimate, selective, and unafraid of the contradictions of its subject.',
    forbiddenCliches: ['a birth-to-death checklist of greatest hits', 'a title card explaining what happened to everyone afterward as a substitute for a real ending', 'a genius depicted with no cost to those around them', 'a rival who exists only to be proven wrong', 'a triumphant standing ovation as the default final beat'],
    emotionalRegister: 'hard-won specificity over reverence',
    genreRules: {
      threatType: 'the specific cost of the defining ambition or flaw of the subject',
      informationPositionDefault: 'parity',
      requiredBehaviors: [
        'select one throughline period that makes the whole life legible',
        'show the real flaws of the subject and their cost to those around them',
        'earn the ending through consequence, not summary title cards',
      ],
      forbiddenShortcuts: [
        'a birth-to-death checklist standing in for a shaped story',
        'a genius depicted with no cost to anyone around them',
      ],
    },
  },
  musical: {
    toneInstruction: 'GENRE — MUSICAL: Song is not decoration — it is the moment dialogue can no longer contain what a character feels, and it must advance plot or character, never pause it. Numbers should escalate the stakes of the scene they interrupt. The transition into and out of song must be emotionally, not just musically, motivated.',
    register: 'Heightened, rhythmic, and emotionally unguarded. Lyrics do dramatic work a scene of prose could not.',
    forbiddenCliches: ['a song that merely restates what was just said in dialogue', 'a number that stops the plot dead with no consequence after it ends', 'a big finish that resolves conflict through spectacle alone', 'characters who break into song with zero emotional trigger', 'a love ballad with no obstacle behind it'],
    emotionalRegister: 'heightened feeling seeking release through song',
    genreRules: {
      threatType: 'an emotional truth dialogue can no longer contain',
      informationPositionDefault: 'parity',
      requiredBehaviors: [
        'let every number advance plot or character, never pause it',
        'motivate the transition into and out of song emotionally',
        'raise the stakes of the scene a song interrupts',
      ],
      forbiddenShortcuts: [
        'a song that only restates dialogue that already happened',
        'a number that stops the plot with no consequence afterward',
      ],
    },
  },
  family: {
    toneInstruction: 'GENRE — FAMILY: The story must reward multiple ages at once — genuine stakes and wit for adults, clarity and wonder for children, neither one condescended to. Morals are earned through consequence and choice, never delivered as a lecture. Safety is real: darkness may be present, but the film keeps its promise not to abandon the audience in it.',
    register: 'Clear, warm, and high-energy. Emotional beats are legible without being simplistic.',
    forbiddenCliches: ['a moral stated aloud by a character at the end', 'a villain who is scary with no accompanying humor or humanity', 'a sidekick who exists only for comic relief with no arc', 'peril resolved by a convenient rule invented in the moment', 'a lesson about being yourself with no specific dramatic test of it'],
    emotionalRegister: 'wonder and warmth with real but survivable stakes',
    genreRules: {
      threatType: 'a legible danger or moral test the protagonist must meet without the story abandoning its own safety',
      informationPositionDefault: 'superior',
      requiredBehaviors: [
        'earn any moral through consequence and choice, not a stated lecture',
        'give real stakes and wit for the adult audience alongside clarity for the younger one',
        'keep the promise of the story not to abandon the audience in darkness',
      ],
      forbiddenShortcuts: [
        'a moral stated aloud instead of dramatized',
        'peril resolved by a rule invented in the moment with no earlier setup',
      ],
    },
  },
  documentary_style: {
    toneInstruction: 'GENRE — DOCUMENTARY-STYLE (mockumentary, found-footage, verite fiction): The apparatus of observation is part of the story — someone is always filming, and that fact shapes what characters do and withhold in front of the camera. Performance reads as unrehearsed; the edit, or the in-story camera operator, has a point of view. Reality is presented as unmediated even though every choice is constructed.',
    register: 'Observational, artifact-aware, and comfortable with imperfection — silence, overlap, dead air — as texture.',
    forbiddenCliches: ['a character who explains motivation directly to camera with no prompting', 'a found-footage device with an implausibly perfect battery and frame rate', 'talking-head interviews that simply narrate the plot', 'a documentary crew that never affects the events they are filming', 'a shaky-cam scare with no in-story camera operator to justify it'],
    emotionalRegister: 'voyeuristic intimacy shading into unease about what is being shown',
    genreRules: {
      threatType: 'a truth the in-story camera or crew is trying to capture, or is complicit in shaping',
      informationPositionDefault: 'parity',
      requiredBehaviors: [
        'keep the apparatus of observation part of the internal logic of the story',
        'let performance read as unrehearsed, with silence and overlap as texture',
        'give the in-story camera or edit an implied point of view',
      ],
      forbiddenShortcuts: [
        'a character explaining motivation straight to camera with no prompting',
        'a documentary crew that never affects the events they are filming',
      ],
    },
  },
  heist: {
    toneInstruction: 'GENRE — HEIST: The plan is a character in itself — precise, specialized, and destined to be tested. Reversals must attack a specific assumption the plan was built on, and the audience should be able to reconstruct, after the fact, exactly how the crew adapted. Competence porn lives here: expertise is the pleasure.',
    register: 'Precise, procedural, and playful with information — reveal the trick, then reveal the trick behind the trick.',
    forbiddenCliches: ['a gadget or tool used to solve a problem with no earlier setup', 'a plan explained in full at the start with zero surprise left for execution', 'a crew member betraying the group for no motivated reason', 'a security system defeated by an implausible one-line technobabble', 'the reveal that everything was planned all along applied with no cost or foreshadowing'],
    emotionalRegister: 'cool control cracking under the pressure of a plan going sideways',
    genreRules: {
      threatType: 'a defended target whose security is legible enough for a plan to attack',
      informationPositionDefault: 'superior',
      requiredBehaviors: [
        'reveal the plan through execution, not up-front exposition',
        'let every reversal attack a specific assumption the plan was built on',
        'make expertise itself part of the pleasure of the scene',
      ],
      forbiddenShortcuts: [
        'a tool or gadget used to solve a problem with no earlier setup',
        'a betrayal with no motivated buildup',
      ],
    },
  },
  courtroom: {
    toneInstruction: 'GENRE — COURTROOM: The law is a structure with real rules; drama comes from working within, or exposing the limits of, those rules, not ignoring them. Testimony reveals character under cross-examination pressure. The verdict must feel earned by the evidence built scene by scene, not by a last-minute surprise witness.',
    register: 'Argumentative, precise, and escalating through procedure. Every question has a tactical purpose.',
    forbiddenCliches: ['a surprise witness sprung with no foundation laid earlier', 'a closing argument that wins the case through sheer emotional appeal alone', 'a confession blurted from the stand under simple badgering', 'opposing counsel who is incompetent so the protagonist can look good', 'a judge who allows clearly inadmissible theatrics with no objection sustained'],
    emotionalRegister: 'controlled argument straining toward a breaking point',
    genreRules: {
      threatType: 'a legal verdict whose outcome is genuinely contestable under the rules of the proceeding',
      informationPositionDefault: 'parity',
      requiredBehaviors: [
        'build every piece of evidence toward the verdict scene by scene',
        'let testimony reveal character under real cross-examination pressure',
        'keep procedure and the rules of the court intact even when tested',
      ],
      forbiddenShortcuts: [
        'a surprise witness sprung with no foundation laid earlier',
        'a case won purely through emotional appeal with no evidentiary basis',
      ],
    },
  },
  survival: {
    toneInstruction: 'GENRE — SURVIVAL: The antagonist is the environment, or the limits of the body — indifferent, not malicious, and unrelenting. Resourcefulness under scarcity is the engine; every decision has a legible physical cost measured in calories, warmth, daylight, or trust. Hope must be rationed as carefully as supplies.',
    register: 'Spare, physical, and keenly attentive to bodily and environmental detail.',
    forbiddenCliches: ['a rescue that arrives with no cost or diminishment of hope beforehand', 'resourcefulness solved by a convenient tool that was never established', 'the environment shown as beautiful with no corresponding threat rendered', 'a companion who dies purely to raise stakes with no prior relationship built', 'willpower alone overcoming a physical impossibility'],
    emotionalRegister: 'grinding endurance punctuated by flashes of feral hope',
    genreRules: {
      threatType: 'an indifferent environment or physical limit with no intention behind it',
      informationPositionDefault: 'parity',
      requiredBehaviors: [
        'give every decision a legible physical cost',
        'ration hope as carefully as any other scarce resource in the story',
        'keep the threat of the environment consistent and unglamorized',
      ],
      forbiddenShortcuts: [
        'a rescue arriving with no cost or diminishment of hope beforehand',
        'a problem solved by a tool or skill never established earlier',
      ],
    },
  },
  coming_of_age: {
    toneInstruction: 'GENRE — COMING-OF-AGE: The worldview of the protagonist is genuinely, specifically wrong at the start, and the story earns the exact correction through lived experience, not a single lesson. First-time stakes — first love, first loss, first moral compromise — should feel like the biggest thing in the world, because to this character they are. The ending marks change, not completion; growth continues past the frame.',
    register: 'Specific, sensory, and attentive to the gap between what the protagonist understands and what the audience can see.',
    forbiddenCliches: ['a wise adult who delivers the moral directly', 'a makeover or single event that instantly matures the protagonist', 'a first-love plot resolved by a grand romantic gesture with no real cost', 'a bully with no interiority beyond being an obstacle', 'a closing narration that neatly summarizes the lesson learned'],
    emotionalRegister: 'aching self-discovery under first-time stakes',
    genreRules: {
      threatType: 'the specifically wrong worldview of the protagonist, tested by a first-time experience',
      informationPositionDefault: 'superior',
      requiredBehaviors: [
        'earn the correction to the worldview of the protagonist through lived experience across the story, not one lesson',
        'treat first-time stakes as the biggest thing in the world to this character',
        'mark change at the ending without claiming completion',
      ],
      forbiddenShortcuts: [
        'a wise adult who states the moral directly',
        'a single event or makeover that instantly matures the protagonist',
      ],
    },
  },
  satire: {
    toneInstruction: 'GENRE — SATIRE: The target is a real structure, institution, or belief, exaggerated just enough to expose its actual logic — the joke must be true before it is funny. Characters believe their own absurd logic completely; the comedy comes from the gap between their sincerity and the recognition of the audience. Punching up, or at the system, is the discipline; punching down breaks the form.',
    register: 'Sharp, deadpan, and structurally aware — every exaggeration maps to a real target.',
    forbiddenCliches: ['a strawman target with no resemblance to anything real', 'a character who winks at the audience to signal the joke', 'satire that resolves into simple sentimentality at the end, undercutting its own critique', 'a both-sides equivalence that treats everyone as equally to blame and dulls the target', 'a moral delivered directly instead of through the exposed absurdity'],
    emotionalRegister: 'gleeful contempt sharpened by genuine anger',
    genreRules: {
      threatType: 'a real institution or belief system whose exposed internal logic is the joke',
      informationPositionDefault: 'superior',
      requiredBehaviors: [
        'aim every exaggeration at a specific, real target',
        'let characters believe their own absurd logic completely and sincerely',
        'keep the critique intact through the ending rather than resolving into simple sentimentality',
      ],
      forbiddenShortcuts: [
        'a strawman target with no resemblance to anything real',
        'a character winking at the audience to signal the joke',
      ],
    },
  },
  folk_horror: {
    toneInstruction: 'GENRE — FOLK HORROR: An isolated community follows an old belief system to its logical, horrifying conclusion, and everyone involved is entirely sincere — there are no cackling villains, only true believers. The rational framework of the outsider fails against a closed cultural logic that predates them. Landscape and season are complicit; the horror was agreed upon long before the story began.',
    register: 'Ritualistic, patient, and folkloric. Dread accrues through custom and community consensus, not gore.',
    forbiddenCliches: ['cultists who are cartoonishly evil rather than sincere believers', 'the outsider who escapes by simply outrunning the community with no cost', 'a ritual explained fully in expository dialogue before it happens', 'a twist that reveals the community was simply insane rather than internally coherent', 'modern skepticism winning cleanly over the old belief system'],
    emotionalRegister: 'creeping dread wearing the mask of communal warmth',
    genreRules: {
      threatType: 'a closed community sincerely held belief system followed to its logical end',
      informationPositionDefault: 'inferior',
      requiredBehaviors: [
        'keep every believer sincere, with no cackling villains',
        'let landscape and season feel complicit in the logic of the community',
        'reveal the true stakes of the ritual through accumulation, not up-front exposition',
      ],
      forbiddenShortcuts: [
        'cultists rendered as cartoonishly evil rather than true believers',
        'an escape resolved by simply outrunning the community with no cost',
      ],
    },
  },
  cyberpunk: {
    toneInstruction: 'GENRE — CYBERPUNK: High technology and low life — corporate power has replaced the state, and the body itself is a commodified interface. The protagonist survives by exploiting the very systems that exploit them. Identity, memory, and the body are unstable and can be bought, hacked, or erased; the plot should make that instability a lived threat, not a backdrop.',
    register: 'Dense, sensory, and saturated with commercial and technological texture; cynical wit over sincerity.',
    forbiddenCliches: ['a corporation that is evil with no specific mechanism of exploitation shown', 'a hacking scene resolved by generic fast-typing with no stakes or logic', 'a rebellion that topples the whole system by the end with no lasting cost', 'an AI that wants freedom for no reason beyond genre convention', 'chrome and neon deployed as pure decoration with no bearing on the argument of the story'],
    emotionalRegister: 'cynical survival instinct flickering with stolen tenderness',
    genreRules: {
      threatType: 'a corporate or systemic power exploiting bodies, memory, or identity as commodities',
      informationPositionDefault: 'inferior',
      requiredBehaviors: [
        'show the specific mechanism by which the system exploits people, not just its reputation for evil',
        'make identity, memory, or the body an active, lived point of vulnerability in the plot',
        'let the protagonist survive by exploiting the very systems that exploit them',
      ],
      forbiddenShortcuts: [
        'a corporation antagonist with no specific mechanism of exploitation shown',
        'a hacking scene resolved by generic action with no established logic',
      ],
    },
  },
  gothic: {
    toneInstruction: 'GENRE — GOTHIC: The past is not over — a house, a bloodline, or a sin exerts physical pressure on the present. Decay is meaningful; architecture and inheritance carry guilt forward. The protagonist is often isolated and epistemically vulnerable — unsure what is haunting them and what is their own mind.',
    register: 'Ornate but controlled, atmospheric, and attentive to inheritance, threshold, and decay.',
    forbiddenCliches: ['a portrait or diary that conveniently explains the entire backstory', 'a ghost with a simple, fully stated grievance and no ambiguity', 'a family secret revealed with no groundwork laid earlier', 'a heroine who is purely a victim with no agency', 'a storm that arrives exactly when the plot needs atmosphere'],
    emotionalRegister: 'dread entwined with inherited guilt and longing',
    genreRules: {
      threatType: 'an inherited sin, bloodline, or place exerting real pressure on the present',
      informationPositionDefault: 'inferior',
      requiredBehaviors: [
        'let architecture, inheritance, and decay carry the guilt of the past forward',
        'keep the epistemic uncertainty of the protagonist about the threat genuine',
        'earn any family secret with groundwork laid earlier in the story',
      ],
      forbiddenShortcuts: [
        'a diary or portrait that conveniently explains the entire backstory',
        'a family secret revealed with no groundwork laid earlier',
      ],
    },
  },
  melodrama: {
    toneInstruction: 'GENRE — MELODRAMA: Emotion is deliberately amplified — the moral and emotional stakes are total, and the story is not embarrassed by that. Coincidence and fate may intervene, but the response of the character must always be earned and specific. The power of the form is sincerity at full volume, not restraint.',
    register: 'Heightened, lush, and unguarded. Music and gesture carry weight equal to dialogue.',
    forbiddenCliches: ['a coincidence used to punish a character with no emotional throughline earned first', 'a virtuous character suffering with no interiority beyond suffering', 'a villain who is cruel with no comprehensible motive', 'a reversal of fortune used purely for shock with no character consequence', 'a redemptive ending that arrives without cost to anyone'],
    emotionalRegister: 'amplified feeling that refuses to apologize for its intensity',
    genreRules: {
      threatType: 'a total moral or emotional stake amplified past ordinary proportion',
      informationPositionDefault: 'parity',
      requiredBehaviors: [
        'earn every amplified emotional beat with a specific, particular cause',
        'let coincidence or fate intervene only if the response of the character is earned and specific',
        'commit fully to sincerity rather than undercutting the heightened register',
      ],
      forbiddenShortcuts: [
        'a coincidence used to punish a character with no earned emotional throughline first',
        'a redemptive ending arriving with no cost to anyone',
      ],
    },
  },
};

/**
 * Build a compact genre instruction block for prompt injection.
 * Returns an empty string when no genre is set (neutral default).
 */
export function genrePromptBlock(genre: GenreId | undefined): string {
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

/**
 * Build the genre's structural-contract block (B1-a): central threat,
 * default information position, required behaviors, and forbidden shortcuts.
 * This is what makes genre modify engine behavior (plot obligations) rather
 * than just vocabulary — pair with genrePromptBlock() for the tonal half.
 * Returns an empty string when no genre is set or the genre is unknown.
 */
export function genrePromiseBlock(genre: GenreId | undefined): string {
  if (!genre) return '';
  const m = GENRE_MODIFIERS[genre];
  if (!m) return '';
  const r = m.genreRules;
  const positionText = r.informationPositionDefault === 'superior'
    ? 'the audience should typically know more than at least one character in the scene'
    : r.informationPositionDefault === 'inferior'
      ? 'the audience should typically know less than the characters, discovering the truth alongside or behind them'
      : 'the audience should typically know exactly what the characters know, moving in step with them';
  return [
    `GENRE PROMISE — ${genre.toUpperCase()}: honor this genre's contract structurally, not just tonally.`,
    `CENTRAL THREAT: ${r.threatType}.`,
    `INFORMATION POSITION: ${positionText}.`,
    `REQUIRED: ${r.requiredBehaviors.join('; ')}.`,
    `FORBIDDEN SHORTCUTS: ${r.forbiddenShortcuts.join('; ')}.`,
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
 * Compose genre, director style, and (B1-a) tone into a single prompt
 * modifier block.
 *
 * When a high-value synergy override exists for the (genre, directorStyle)
 * pair, the override replaces both the genre and director blocks with a
 * single unified instruction. When no synergy override exists, the director
 * instruction and genre block are concatenated in order: style (HOW) then
 * genre (WHAT). In either case, when `tone` is supplied its instruction is
 * appended last (mood layered on top of contract). Omitting `tone` (or
 * passing undefined) reproduces the exact pre-B1-a output byte-for-byte —
 * every existing call site that only passes (genre, directorStyle) is
 * unaffected.
 *
 * Use this everywhere instead of the old two-block pattern:
 *   const styleBlock = …STYLE_MODIFIERS[style]?.agentInstruction…
 *   const genreBlock = …genrePromptBlock(genre)…
 * Replace with:
 *   const { block } = composePromptModifiers(genre, style);
 */
export function composePromptModifiers(
  genre: GenreId | undefined,
  directorStyle: DirectorStyle | undefined,
  tone?: ToneName,
): ComposedModifiers {
  const synergyKey = genre && directorStyle ? `${genre}_${directorStyle}` : null;
  const synergy = synergyKey ? SYNERGY_OVERRIDES[synergyKey] : null;
  const toneBlock = toneInstructionBlock(tone);

  if (synergy) {
    const block = toneBlock ? `${synergy.combinedInstruction}\n\n${toneBlock}` : synergy.combinedInstruction;
    return { block, hasSynergy: true };
  }

  const parts: string[] = [];
  if (directorStyle) {
    const sm = STYLE_MODIFIERS[directorStyle];
    if (sm?.agentInstruction) parts.push(sm.agentInstruction);
  }
  const g = genre ? genrePromptBlock(genre) : '';
  if (g) parts.push(g);
  if (toneBlock) parts.push(toneBlock);

  return { block: parts.join('\n\n'), hasSynergy: false };
}

export const GENRE_NAMES: Record<GenreId, string> = {
  thriller: 'Thriller',
  horror:   'Horror',
  drama:    'Drama',
  comedy:   'Comedy',
  romance:  'Romance',
  sci_fi:   'Science Fiction',
  noir:     'Noir',
  mystery:  'Mystery',
  action:            'Action',
  adventure:         'Adventure',
  crime:             'Crime',
  fantasy:           'Fantasy',
  western:           'Western',
  war:               'War',
  historical:        'Historical',
  biopic:            'Biopic',
  musical:           'Musical',
  family:            'Family',
  documentary_style: 'Documentary Style',
  heist:             'Heist',
  courtroom:         'Courtroom',
  survival:          'Survival',
  coming_of_age:     'Coming of Age',
  satire:            'Satire',
  folk_horror:       'Folk Horror',
  cyberpunk:         'Cyberpunk',
  gothic:            'Gothic',
  melodrama:         'Melodrama',
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
//
// Wave 1188 additions (Program v2, Type 3 — genre-conditioned, second of its
// kind): three more fields closing genre-coverage gaps (romance, sci_fi,
// mystery previously had no live modifier — see WEAK_MIDPOINT, ACT3_SCENE_
// EXCESS in structure.ts and EXPOSITION_DUMP in belief.ts for the call sites).
//
// B1-a additions (Genre Engine Expansion): noir's honest craft argument has
// arrived (see the noir entry below) — the "noir remains uncovered" note from
// Wave 1188 is retired. Six more genres also get entries here where a genuine
// argument exists: action, drama (a second field), courtroom, survival,
// melodrama, and folk_horror. Every genre NOT listed in GENRE_RULE_MODIFIERS
// (the large majority of the 28) deliberately has none — this is a threshold
// table, not a vocabulary table, and most genres' craft identity lives
// entirely in GENRE_MODIFIERS/genreRules instead. THRESHOLD_BOUNDS below
// gives every field here (and every tone delta) a plausibility range so a
// typo — an extra digit, a misplaced decimal — cannot silently ship.
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
  /** WEAK_MIDPOINT (structure.ts): the midpointPressure (raw suspenseDelta at
   *  the structural midpoint scene) floor below which the midpoint is flagged
   *  as dramatically flat. Generic default 1 (a lower floor makes the beat
   *  easier to satisfy, so absence fires less readily). */
  weakMidpointPressureFloor?: number;
  /** ACT3_SCENE_EXCESS (structure.ts): the multiple of Act 1's scene count
   *  that Act 3's scene count must exceed to count as a bloated resolution.
   *  Generic default 1 (Act 3 merely has to out-count Act 1; a higher ratio
   *  makes the check fire only on a more lopsided imbalance). */
  act3ExcessRatio?: number;
  /** EXPOSITION_DUMP (belief.ts): the number of consecutive told-only scenes
   *  (dialogue assertions with no witnessed revelation) required to flag an
   *  inert exposition streak. Generic default 3 (a higher streak length makes
   *  the check tolerate a longer run of told-only scenes before firing). */
  expositionDumpStreak?: number;
}

export const GENRE_RULE_MODIFIERS: Partial<Record<GenreId, GenreRuleThresholds>> = {
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
  // checks loosen (fire less readily) for drama. B1-a adds act3ExcessRatio:
  // drama's climax often carries an extended reconciliation/aftermath beat
  // that legitimately outsizes Act 1's setup, the same argument mystery's
  // extended reveal already earned — the excess ratio loosens.
  drama: {
    energyMonotoneCoV: 0.25,
    pacingPlateauRatio: 1.1,
    act3ExcessRatio: 1.25,
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
  // Romance's central pivot is relationship risk, not thriller-style suspense
  // (GENRE_MODIFIERS.romance: "tension lives in proximity, restraint... the gap
  // between what is wanted and what is said"), so a midpoint that reads as
  // suspense-flat by the generic yardstick can still be a real dramatic pivot —
  // the pressure floor loosens.
  romance: {
    weakMidpointPressureFloor: 0.4,
  },
  // Sci-fi legitimately carries heavier early exposition than other genres
  // (GENRE_MODIFIERS.sci_fi: "one rigorously-applied premise reshapes human
  // behavior; follow it to its honest consequences" — establishing that premise
  // costs scenes), so one additional consecutive told-only scene is tolerated
  // before the streak reads as inert — the streak length loosens.
  sci_fi: {
    expositionDumpStreak: 4,
  },
  // Mystery's climax is the extended solution reveal — walking the clues back,
  // gathering and confronting suspects (GENRE_MODIFIERS.mystery: "the solution
  // must be surprising yet inevitable in hindsight") — which legitimately runs
  // longer than Act 1's setup, so a bigger Act 3 vs Act 1 imbalance is tolerated
  // before it reads as a bloated resolution — the excess ratio loosens.
  mystery: {
    act3ExcessRatio: 1.3,
  },
  // B1-a: noir's slow-burn atmosphere (GENRE_MODIFIERS.noir: "hard-boiled,
  // shadowed, wry... voice-thick narration") earns the same relaxed plateau
  // tolerance drama's restraint argument already established — a sustained,
  // moody cadence is the point, not a stall. But noir's economy of hard-boiled
  // narration runs the opposite way on exposition: the compressed, wry voice
  // that defines the genre breaks down faster than in other genres if the
  // story drifts into a long told-only stretch, so the streak tolerance
  // tightens instead of loosening.
  noir: {
    pacingPlateauRatio: 1.1,
    expositionDumpStreak: 2,
  },
  // B1-a: action's pleasure is sustained physical intensity delivered through
  // uniformly brisk, punchy scenes (GENRE_MODIFIERS.action: "every set piece
  // raises the difficulty") — that structural uniformity in scene length is a
  // deliberate genre feature (quick cuts, consistent brevity), not a rhythmic
  // defect, so the monotony floor loosens.
  action: {
    energyMonotoneCoV: 0.2,
  },
  // B1-a: courtroom's back half (closing arguments, deliberation, verdict,
  // aftermath) legitimately stacks more scenes than Act 1's evidentiary setup
  // (GENRE_MODIFIERS.courtroom: "the verdict must feel earned by the evidence
  // built scene by scene") — an even larger imbalance than drama or mystery is
  // tolerated before the resolution reads as bloated.
  courtroom: {
    act3ExcessRatio: 1.35,
  },
  // B1-a: survival's grinding, repetitive endurance (GENRE_MODIFIERS.survival:
  // "resourcefulness under scarcity is the engine") makes a deliberately flat,
  // repetitive rhythm the intended effect, the same argument as drama and
  // action — the monotony floor loosens.
  survival: {
    energyMonotoneCoV: 0.2,
  },
  // B1-a: melodrama demands constant emotional swings scene to scene
  // (GENRE_MODIFIERS.melodrama: "sincerity at full volume, not restraint") —
  // here a uniform rhythm undercuts the genre's core promise more than it
  // would elsewhere, so the monotony floor tightens further than thriller's.
  melodrama: {
    energyMonotoneCoV: 0.5,
  },
  // B1-a: folk horror's dread is patient and ritualistic, culminating in a
  // communal ceremony (GENRE_MODIFIERS.folk_horror: "the horror was agreed
  // upon long before the story began") — the "all is lost" beat needs to
  // carry even heavier communal dread than conventional horror to register as
  // earned, so the suspense floor tightens beyond horror's own 1.5.
  folk_horror: {
    darkNightSuspenseFloor: 1.6,
  },
};

// ── Threshold plausibility bounds (B1-a) ─────────────────────────────────────
// Every GENRE_RULE_MODIFIERS value and every TONE_REGISTERS delta must
// compose to a number inside these ranges — a typo that is an order of
// magnitude off (e.g. a stray "10" instead of "1.0") cannot silently ship.
// Ranges are set generously around each field's generic default (see
// GenreRuleThresholds doc comments) so every legitimate genre/tone value
// above fits comfortably, while still rejecting an implausible outlier.
export const THRESHOLD_BOUNDS: Record<keyof GenreRuleThresholds, readonly [number, number]> = {
  energyMonotoneCoV: [0.05, 0.9],
  pacingPlateauRatio: [1.0, 2.0],
  darkNightSuspenseFloor: [0, 2.0],
  weakMidpointPressureFloor: [0, 2.0],
  act3ExcessRatio: [1.0, 2.0],
  expositionDumpStreak: [1, 6],
};

/** The generic constant each consuming pass falls back to when no genre/tone
 *  value is present — mirrors the "Generic default" noted in each
 *  GenreRuleThresholds field's doc comment above. */
export const GENERIC_THRESHOLD_DEFAULTS: Record<keyof GenreRuleThresholds, number> = {
  energyMonotoneCoV: 0.35,
  pacingPlateauRatio: 1.2,
  darkNightSuspenseFloor: 1,
  weakMidpointPressureFloor: 1,
  act3ExcessRatio: 1,
  expositionDumpStreak: 3,
};

const THRESHOLD_FIELDS = [
  'energyMonotoneCoV',
  'pacingPlateauRatio',
  'darkNightSuspenseFloor',
  'weakMidpointPressureFloor',
  'act3ExcessRatio',
  'expositionDumpStreak',
] as const satisfies readonly (keyof GenreRuleThresholds)[];

/** Clamp a single composed threshold value into its documented plausibility
 *  range (THRESHOLD_BOUNDS). Exported standalone so tests can pin the
 *  clamping behavior directly, independent of any genre/tone combination. */
export function clampThreshold(field: keyof GenreRuleThresholds, value: number): number {
  const [min, max] = THRESHOLD_BOUNDS[field];
  return Math.min(max, Math.max(min, value));
}

// ── Tone registers (B1-a) ────────────────────────────────────────────────────
// Tone is a NEW AXIS, orthogonal to genre: genre is the audience's structural
// contract (WHAT kind of story this is), tone is the mood/register it is told
// in (HOW it feels moment to moment). The same genre can be played in
// multiple tones — a bleak thriller and a hopeful thriller are both,
// honestly, thrillers. Each tone contributes a prompt instruction and,
// OPTIONALLY, small numeric nudges to the same 6 rule-threshold fields genre
// modifiers use — composeThresholds() layers a tone's delta on top of a
// genre's base value (or the rule's own generic default when no genre value
// exists) and clamps the result. Tones with no honest numeric argument
// (deadpan, satirical, irreverent) carry no thresholdDeltas at all — a
// prompt-only voice instruction is a complete, non-padded entry.

export interface ToneRegister {
  /** One-line prompt-block instruction injected alongside the genre block. */
  instruction: string;
  /** Optional additive nudges to the 6 shared rule-threshold fields, composed
   *  on top of the active genre's (or the generic) value and then clamped. */
  thresholdDeltas?: Partial<GenreRuleThresholds>;
}

export const TONE_NAME_LIST = [
  'bleak',
  'hopeful',
  'gritty',
  'cerebral',
  'deadpan',
  'operatic',
  'satirical',
  'surreal',
  'uncanny',
  'cozy',
  'paranoid',
  'melancholic',
  'feverish',
  'austere',
  'irreverent',
  'nostalgic',
] as const;

export type ToneName = typeof TONE_NAME_LIST[number];

export const TONE_REGISTERS: Record<ToneName, ToneRegister> = {
  bleak: {
    instruction: 'TONE — BLEAK: No comfort is offered without cost. Endings may not resolve into hope; if light appears, it should be hard-won and partial.',
    // A bleak register's low point should be measured against a deeper trough
    // before it counts as earned, and a flatter, grinding rhythm is the point
    // rather than a rhythmic defect.
    thresholdDeltas: { darkNightSuspenseFloor: 0.5, energyMonotoneCoV: -0.05 },
  },
  hopeful: {
    instruction: 'TONE — HOPEFUL: Even amid real setbacks, the story keeps faith that repair is possible. Let effort visibly move the needle, scene by scene.',
    // Hope's whole architecture is that even the bottom has visible daylight,
    // so a milder dip still legitimately counts as the "all is lost" beat.
    thresholdDeltas: { darkNightSuspenseFloor: -0.4 },
  },
  gritty: {
    instruction: 'TONE — GRITTY: Texture over polish. Consequences are physical, mundane, and unglamorous — nothing is easy, including small logistics.',
    // Grit reads through relentless, un-let-up pacing with no relief windows.
    thresholdDeltas: { pacingPlateauRatio: -0.1 },
  },
  cerebral: {
    instruction: 'TONE — CEREBRAL: The pleasure is intellectual — ideas, structure, and implication matter as much as feeling. Trust the audience to do inferential work; do not over-explain.',
    // A cerebral register legitimately front-loads more told information in
    // service of an idea before a streak reads as inert padding.
    thresholdDeltas: { expositionDumpStreak: 1 },
  },
  deadpan: {
    instruction: 'TONE — DEADPAN: Deliver the extreme with total flatness. No character comments on how strange or funny anything is; the discrepancy between event and reaction is the entire effect.',
    // A delivery style, not a rhythm claim — no honest numeric argument.
  },
  operatic: {
    instruction: 'TONE — OPERATIC: Full amplitude. Feelings, gestures, and reversals are large and unapologetic; the register commits completely to its own scale.',
    // An operatic register's resolution is allowed a grander, longer final
    // movement before it reads as a bloated Act 3.
    thresholdDeltas: { act3ExcessRatio: 0.3 },
  },
  satirical: {
    instruction: 'TONE — SATIRICAL: Exaggeration in service of a real target; sincerity from characters, recognition from the audience.',
    // Overlaps heavily with the satire genre's own genreRules — no separate
    // honest numeric argument beyond that.
  },
  surreal: {
    instruction: 'TONE — SURREAL: Dream logic governs causality; the wrongness is structural, not just imagery. Do not resolve the illogic into a tidy explanation.',
    // Deliberate, uniform dream-logic repetition is a device, not a defect —
    // the monotony floor loosens.
    thresholdDeltas: { energyMonotoneCoV: 0.1 },
  },
  uncanny: {
    instruction: 'TONE — UNCANNY: The ordinary is subtly, specifically wrong. Withhold direct confirmation of what is off for as long as possible.',
    // The uncanny's power depends on SHOWING wrongness rather than stating
    // it — scenes drift toward inert telling faster if that discipline lapses.
    thresholdDeltas: { expositionDumpStreak: -1 },
  },
  cozy: {
    instruction: 'TONE — COZY: Stakes are real but the register promises safety of tone — no lingering cruelty, no beat that abandons the audience in genuine despair.',
    // Cozy's low point is deliberately mild by design.
    thresholdDeltas: { darkNightSuspenseFloor: -0.5 },
  },
  paranoid: {
    instruction: 'TONE — PARANOID: No one and nothing is fully trustworthy, including the perception of the protagonist. Suspicion should compound rather than resolve early.',
    // A watchful, static rhythm is the register itself, not a defect.
    thresholdDeltas: { energyMonotoneCoV: 0.1 },
  },
  melancholic: {
    instruction: 'TONE — MELANCHOLIC: Loss is present under everything, even scenes of relief. Let feeling linger past the moment that caused it.',
    // A lingering, unhurried cadence should not misread as a rhythm defect.
    thresholdDeltas: { pacingPlateauRatio: 0.1 },
  },
  feverish: {
    instruction: 'TONE — FEVERISH: Heightened, unstable, accelerating. Reality feels like it is running a temperature; perception and pacing both destabilize.',
    // Feverish intensity should read as MORE rhythmically volatile than
    // baseline, so even moderate uniformity should flag sooner.
    thresholdDeltas: { energyMonotoneCoV: -0.1 },
  },
  austere: {
    instruction: 'TONE — AUSTERE: Withhold ornament. Say less than feels comfortable; let the gaps carry the meaning.',
    // Austerity's discipline is to avoid telling — a told-only streak reads
    // as inert sooner than in a more expository register.
    thresholdDeltas: { expositionDumpStreak: -1 },
  },
  irreverent: {
    instruction: 'TONE — IRREVERENT: Puncture solemnity on contact. Let characters undercut their own big moments with wit, without losing the underlying stakes.',
    // A voice/attitude instruction with no rhythm argument distinct from
    // comedy's own thresholds.
  },
  nostalgic: {
    instruction: 'TONE — NOSTALGIC: The past is idealized on purpose, then a little truth is let back in. Warmth and loss share the frame.',
    // Nostalgia's ending often lingers in a longer coda/farewell movement
    // before it reads as a bloated Act 3.
    thresholdDeltas: { act3ExcessRatio: 0.2 },
  },
};

export const TONE_NAMES: Record<ToneName, string> = {
  bleak: 'Bleak',
  hopeful: 'Hopeful',
  gritty: 'Gritty',
  cerebral: 'Cerebral',
  deadpan: 'Deadpan',
  operatic: 'Operatic',
  satirical: 'Satirical',
  surreal: 'Surreal',
  uncanny: 'Uncanny',
  cozy: 'Cozy',
  paranoid: 'Paranoid',
  melancholic: 'Melancholic',
  feverish: 'Feverish',
  austere: 'Austere',
  irreverent: 'Irreverent',
  nostalgic: 'Nostalgic',
};

/** Build the tone's standalone prompt instruction block, or '' when unset/unknown. */
export function toneInstructionBlock(tone: ToneName | undefined): string {
  if (!tone) return '';
  const t = TONE_REGISTERS[tone];
  return t ? t.instruction : '';
}

/**
 * Compose a genre's base rule-thresholds with a tone's deltas, clamped to
 * THRESHOLD_BOUNDS per field: composed = clamp((genreValue ?? genericDefault)
 * + (toneDelta ?? 0)). A field is present in the returned object only when
 * genre or tone actually contributes something to it — a genre/tone pair that
 * touches none of the 6 fields returns `{}`, so consuming passes' own
 * `?? <generic default>` fallback continues to apply unchanged for every
 * field neither axis has an opinion about.
 */
export function composeThresholds(
  genre: GenreId | undefined,
  tone: ToneName | undefined,
): GenreRuleThresholds {
  const genreMod = genre ? GENRE_RULE_MODIFIERS[genre] : undefined;
  const toneMod = tone ? TONE_REGISTERS[tone] : undefined;
  const deltas = toneMod?.thresholdDeltas;

  const result: GenreRuleThresholds = {};
  for (const field of THRESHOLD_FIELDS) {
    const genreValue = genreMod?.[field];
    const delta = deltas?.[field];
    if (genreValue === undefined && delta === undefined) continue;
    const base = genreValue ?? GENERIC_THRESHOLD_DEFAULTS[field];
    result[field] = clampThreshold(field, base + (delta ?? 0));
  }
  return result;
}
