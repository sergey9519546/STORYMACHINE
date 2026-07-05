// Script Doctor — Fountain-native heuristic analyzer (half 1 of the bridge
// described in ./types.ts). Turns raw Fountain text directly into the same
// ScreenplaySceneRecord[]/StructureState shapes the live NVM screenplay memory
// produces from a StoryCommit ledger — but purely from the text, with zero
// LLM calls and zero I/O, so a pasted or uploaded screenplay can run through
// the 14-pass revision pipeline without ever having been "lived" as a story.
//
// Every heuristic here is a small, named, deterministic function over compact
// lexicons (module constants below). None of them call Date.now() — the only
// non-pure timestamp field, ScreenplaySceneRecord.createdAt, is set to the
// scene's index so two calls on the same string always produce identical
// output (verified by tests/core/fountain-analyzer.test.ts's determinism case).
//
// analyzeStructure() is fed commits=[] (there is no StoryCommit ledger for a
// pasted screenplay). That only affects one input to its blended-pressure act
// heuristic (structure.ts's totalClockPressure, which sums RAISE_CLOCK ops
// across commits) — with commits=[] that term is always 0, so actPosition/
// completionPercent fall back to the dramaticPressure term alone (revelations
// x2 + reversals x1.5, both derived from `records`, which we do populate).
// This degrades gracefully rather than breaking: a fountain-only story still
// gets a sensible act position, it just can't see explicit clock-raise ops
// that only ever existed as StoryOps, not as text.
//
// Wave 1182 additions (Program v2, Type 1 — signal channel): question-answer
// latency. detectQuestionLatency() lexically fingerprints substantive dialogue
// questions and matches each forward against every later line (any scene)
// that shares enough of its distinctive vocabulary, tallying four per-scene
// counts — questionsRaised, questionsResolved, questionsResolvedSameScene,
// questionsUnresolved — mirroring detectClueLifecycle's seed/payoff shape but
// for interrogative dialogue rather than recurring props/quoted phrases. See
// the "Question-answer latency" section below for the extraction and
// memory.ts for the record fields (optional, ops-derived-path may omit them).
//
// Wave 1186 additions (Program v2, Type 1 — signal channel, closes cycle 1):
// power-balance shifts within scenes. Of the charter's remaining Type 1
// candidates (dramatic-irony gap, power-balance shifts, motif recurrence
// shape), power-balance is the one deterministic lexicon/structure extraction
// can actually support: a dramatic-irony gap requires modeling what the
// AUDIENCE knows versus what each CHARACTER knows — a semantic tracking
// problem this file has no representation for (revelation is a single
// boolean per scene, not a per-character knowledge state) and is squarely a
// deep-read/semantic-channel problem per ROADMAP.md's Run 10 framing, not a
// lexicon one. Motif recurrence shape needs clustering of recurring IMAGERY
// across non-identical phrasing (a metaphor restated three different ways),
// which is a similarity judgment this file's exact-token clue-lifecycle
// mechanism cannot make without drifting into false positives on any shared
// common word. Power-balance, by contrast, reduces to five deterministic
// per-line proxies over dialogue alone — imperative sentences, questions
// asked (reusing isSubstantiveQuestion/splitSentences from Wave 1182's
// question-latency machinery), em-dash interruption markers, turn-length
// word-count dominance, and second-person accusatory phrasing — none of
// which need anything beyond the SceneUnit shape this file already builds.
// detectPowerBalance() scores the scene's two most-speaking characters
// against each other and emits three new optional per-scene fields:
// powerHolder (which of the two dyad members controls the scene, or null
// when neither clearly does), powerBalance (-1..1, signed toward whichever
// of the two speaks FIRST in the scene — deliberately decoupled from line
// count, since a character who says less can still hold the room), and
// powerFlipped (true when the first half and second half of the dyad's
// exchange resolve to two different holders). Distinct from every existing
// channel: relationshipShifts measures VALENCE (do these two like or trust
// each other), not CONTROL (who is dictating the terms of the exchange) — a
// scene can have a warm, loving power imbalance or a hostile, contested one,
// and the two axes are independent by design; suspenseDelta/curiosityDelta
// are scene-wide intensity scores with no notion of "between which two
// people"; dramaticTurn/revelation are single-line spot checks, not a
// running per-line tally. See the "Power-balance shifts" section below.
//
// Wave 1190 additions (Program v2, Type 1 — signal channel #3, closes cycle 2):
// speaking-character count per scene, i.e. whether a scene lets one character
// hold the floor alone (a monologue/solo beat) or is a genuine multi-voice
// exchange. PREREQUISITE (filed at the Cycle 1 gate, ROADMAP.md): before
// committing thresholds, the three charter-suggested candidates — scene
// entry/exit dynamics (first/last line type), emotional-whiplash rate
// (adjacent-scene valence sign flips), and dialogue-action interleave rhythm
// (runs of consecutive dialogue vs action per scene) — were measured against
// all 20 calibration-corpus samples, not assumed. Result: all three are
// corpus-DEGENERATE, not merely sparse. Entry/exit: 196/196 scenes open with
// action and 194/196 close on a statement (0% dialogue-open in the entire
// corpus — the raw material for this axis simply does not vary here).
// Emotional whiplash: zero direct adjacent sign flips in all 20 samples (only
// one sample has even a single indirect flip once neutral scenes are
// compressed out) — emotionalShift is neutral in 178/196 scenes (91%), far
// too sparse for a threshold to ever cross. Dialogue-action interleave: every
// single scene in the corpus resolves to exactly 2 content-block runs (one
// action paragraph, then one dialogue block) — 0% variance, a structural
// artifact of the corpus's fixed per-scene skeleton. Per the prerequisite's
// sanctioned path (i), a DIFFERENT signal was chosen by evidence rather than
// enriching the corpus: distinct-speaking-character count per scene, measured
// off the SAME dialogue data the three rejected candidates already touch.
// This axis is genuinely dense and, unlike the three rejected candidates,
// separates the calibration bands cleanly: solo/monologue-shaped scenes
// (exactly one speaking character) cluster entirely in each strong/competent
// sample's opening third or spread across all three thirds, while every
// weak/troubled sample collapses into one uninterrupted multi-voice-exchange
// run of 4-7 consecutive scenes with no solo beat anywhere past the opening
// (measured, not assumed — see rhythm.ts's Wave 1190 header for the exact
// per-sample numbers this produced). detectSpeakingCharacterCount() counts
// distinct dialogue speakers per scene (0 = no dialogue, 1 = monologue, 2+ =
// exchange) — distinct from powerHolder/powerBalance (Wave 1186), which is
// null/0 whenever there are fewer than two speakers OR the dyad's control
// falls inside the deadband OR too few dyad lines exist to judge: powerHolder
// null is overloaded across three different reasons and cannot by itself
// distinguish "this is a true solo scene" from "this is a close, ambiguous
// two-hander." speakingCharacterCount is the first record field to expose
// scene VOICE COUNT explicitly, at any value (0/1/2/3+), independent of
// control, valence, or dialogue volume.
//
// Run 17-C addition: clue-lifecycle content-word recall. detectClueLifecycle
// (see the "Clue lifecycle" section) shipped exact-token only — quoted
// phrases and ALL-CAPS emphasis — and measured 0/20 payoff fires across the
// calibration corpus: every sample seeds clues via that convention but none
// repeats the exact wording verbatim on payoff, so the signal was dead on
// realistic text (a clue seeded as "a brass key on a red ribbon" and paid
// off as "the key Marla took" shares no verbatim phrase). computeContent
// WordClueClusters adds a second, fully independent recall channel: it
// clusters mentions of a CLUE_ANCHOR_NOUNS word (an extension of
// CONCRETE_NOUNS with document/keepsake/evidence vocabulary) into one
// recurring object via document-wide rareness or shared-content-word
// overlap, feeding the same seed/payoff/unresolved bookkeeping the
// exact-token channel already produced. The exact-token channel itself is
// untouched.
//
// Wave E1-c additions (lexicon exhaustiveness pass): every module-constant
// lexicon in this file (valence, danger, relief, mystery, turn verbs,
// deadline terms, concrete nouns, accusatory phrases, imperative leads) was
// expanded roughly 50-100% with genuinely common screenwriting vocabulary
// families the original, deliberately-compact lists hadn't yet covered
// (grief/tenderness/elation for valence; weapon/pursuit/injury for danger;
// safety/de-escalation for relief; investigation/anomaly for mystery;
// expose/switch-sides/vow for turn verbs; temporal-pressure idioms for
// deadlines; furniture + evidence-class nouns for concrete nouns, with
// CLUE_GENERIC_OBJECT_WORDS kept in lockstep for the new furniture entries;
// deliberate-harm phrasing for accusatory; standoff/compliance commands for
// imperative leads) — see each lexicon's own "Wave E1-c addition" comment for
// the per-family distinctness rationale. Every expansion was measured against
// tests/core/calibration.test.ts's band-monotonicity/no-saturation/length-
// invariance checks and tests/core/discrimination.test.ts's harness before
// being kept (see this wave's commit message / final report for the measured
// deltas). Three candidate per-scene signals from the charter
// (betrayalTrustDelta, powerDynamicsIntensity, ironyMarkerCount) are
// implemented as standalone exported functions rather than wired onto
// ScreenplaySceneRecord — see the "Standalone lexicon-backed signals" section
// below for why (record-parity.test.ts's matrix and types.ts's
// FountainAnalysis shape are both outside this wave's file ownership).

import { parseFountain, type FountainBlock } from '../../../src/lib/fountain.ts';
import { analyzeStructure } from '../screenplay/structure.ts';
import type { ScreenplaySceneRecord, ScenePurpose } from '../screenplay/memory.ts';
import type { SceneAnnotation } from '../screenplay/compile.ts';
import type { FountainAnalysis } from './types.ts';

// ── Lexicons (module constants) ──────────────────────────────────────────────
// Kept compact and topic-scoped on purpose: each list backs exactly one signal,
// so tuning one heuristic never accidentally shifts another's behavior.

// Wave E1-c additions: both valence lexicons expanded toward exhaustive
// coverage of common screenwriting emotional vocabulary — positive gains a
// tenderness/elation family (beyond the original generic warmth/joy set),
// negative gains a grief/shame family (beyond the original anger/fear set).
// Distinctness of the new terms from each other and from the pre-existing
// entries was checked by hand; a few terms (e.g. 'gentle'/'devoted') are
// deliberately echoed by RELIEF_WORDS/the new betrayal-loyalty lexicon below
// under a different signal — cross-lexicon reuse of a word for a DIFFERENT
// heuristic is this file's established pattern (see 'relief'/'relieved'
// already shared between POSITIVE_VALENCE_WORDS and RELIEF_WORDS above).
const POSITIVE_VALENCE_WORDS = [
  'love', 'loves', 'loved', 'happy', 'happiness', 'joy', 'joyful', 'laugh', 'laughs', 'laughing',
  'smile', 'smiles', 'smiling', 'relief', 'relieved', 'hope', 'hopeful', 'trust', 'trusts',
  'proud', 'grateful', 'gratitude', 'warmth', 'kind', 'kindness', 'gentle', 'delight', 'delighted',
  'embrace', 'embraces', 'reunite', 'reunited', 'forgive', 'forgives', 'forgave',
  // Tenderness/elation family (Wave E1-c):
  'tender', 'tenderly', 'adore', 'adores', 'adored', 'cherish', 'cherishes', 'cherished',
  'affectionate', 'comfort', 'comforted', 'comforting', 'ecstatic', 'elated', 'euphoric',
  'thrilled', 'overjoyed', 'blissful', 'bliss', 'content', 'admire', 'admires', 'admired',
  'devoted', 'compassionate', 'fond', 'cheerful', 'triumphant', 'triumph', 'jubilant',
];

const NEGATIVE_VALENCE_WORDS = [
  'hate', 'hates', 'hated', 'angry', 'anger', 'furious', 'fear', 'afraid', 'scared', 'terror',
  'terrified', 'rage', 'betray', 'betrays', 'betrayed', 'cry', 'cries', 'crying', 'sob', 'sobs',
  'sobbing', 'pain', 'hurt', 'hurts', 'grief', 'despair', 'alone', 'lonely', 'cold', 'threat',
  'threatens', 'threatened', 'resent', 'resents', 'resentment',
  // Grief/shame family (Wave E1-c):
  'grieve', 'grieves', 'grieving', 'mourn', 'mourns', 'mourning', 'devastated', 'devastation',
  'heartbroken', 'heartbreak', 'anguish', 'anguished', 'misery', 'miserable', 'dread', 'dreaded',
  'bitter', 'bitterness', 'shame', 'ashamed', 'guilt', 'guilty', 'humiliated', 'humiliation',
  'disgust', 'disgusted', 'contempt', 'jealous', 'jealousy', 'envy', 'envious',
];

/** Danger/physical-tension lexicon for suspenseDelta — distinct from the
 *  MYSTERY_WORDS lexicon (curiosity is about unanswered questions, not
 *  physical peril: a scene can be tense without being mysterious). */
// Wave E1-c addition: weapon/pursuit/injury families beyond the original
// generic danger set (guns/blood/screaming/chasing/etc.) — a distinct axis
// from that set in that these name the specific MEANS of physical harm
// (a stabbing, a chokehold, an ambush) rather than the generic aftermath
// (blood, dead) or generic pursuit (chase, run) the original list already
// covers, so overlap with existing entries was checked term-by-term.
const DANGER_TENSION_WORDS = [
  'gun', 'guns', 'knife', 'blade', 'blood', 'scream', 'screams', 'screaming', 'kill', 'kills',
  'killed', 'dead', 'death', 'danger', 'dangerous', 'run', 'runs', 'running', 'chase', 'chases',
  'chasing', 'trapped', 'dark', 'darkness', 'fire', 'explosion', 'attack', 'attacks', 'attacked',
  'hide', 'hides', 'hiding', 'gunfire', 'shot', 'shots', 'shoot', 'shoots', 'panic', 'panicked',
  // Weapon/pursuit/injury families (Wave E1-c):
  'rifle', 'pistol', 'weapon', 'weapons', 'stab', 'stabs', 'stabbed', 'strangle', 'strangled',
  'choke', 'choked', 'wound', 'wounded', 'bleeding', 'ambush', 'ambushed', 'pursuit', 'pursued',
  'flee', 'flees', 'fleeing', 'cornered', 'assault', 'assaulted', 'punch', 'punched',
];

/** Calm/relief lexicon — lets suspenseDelta swing negative (a scene that
 *  actively de-escalates tension), not just sit at zero when danger words are
 *  simply absent. Distinct from POSITIVE_VALENCE_WORDS: relief is about
 *  physical/tension safety, positive valence is about emotional warmth — a
 *  scene can be safe without being warm (an empty, silent room). */
// Wave E1-c addition: safety/warmth/de-escalation vocabulary beyond the
// original calm/quiet/settle set — 'secure'/'shelter' name a state of safety
// FROM something, 'soothe'/'reassure' name an active de-escalating gesture
// (someone calming someone else down), and 'sigh'/'ease'/'truce' name the
// physical/narrative release after tension — all distinct axes on the same
// "tension going down" signal the original list didn't cover.
const RELIEF_WORDS = [
  'calm', 'calmly', 'peace', 'peaceful', 'safe', 'safety', 'rest', 'rests', 'resting', 'exhale',
  'exhales', 'exhaled', 'relief', 'relieved', 'quiet', 'stillness', 'settle', 'settles', 'settled',
  // Safety/de-escalation family (Wave E1-c):
  'secure', 'security', 'shelter', 'sheltered', 'soothe', 'soothes', 'soothed', 'soothing',
  'reassure', 'reassured', 'reassuring', 'sigh', 'sighed', 'ease', 'eased', 'truce',
];

/** Unanswered-question lexicon for curiosityDelta — distinct from
 *  DANGER_TENSION_WORDS (curiosity is cognitive/epistemic, not physical). */
// Wave E1-c addition: investigation/anomaly vocabulary beyond the original
// secret/hidden/strange set — 'investigate'/'detective' name the ACTIVE
// pursuit of an answer (a procedural axis the original list, which is mostly
// about the unanswered thing itself, doesn't cover), and 'anomaly'/'puzzle'/
// 'enigma'/'cryptic' name a THING that doesn't add up, distinct from
// 'strange' (a generic descriptor already present) by naming a specific
// unsolved-puzzle framing.
const MYSTERY_WORDS = [
  'secret', 'secrets', 'why', 'who', 'hidden', 'hides', 'truth', 'mystery', 'mysterious', 'unknown',
  'disappear', 'disappears', 'disappeared', 'missing', 'clue', 'clues', 'strange', 'wonder',
  'wonders', 'wondering', 'suspicious', 'suspicion',
  // Investigation/anomaly family (Wave E1-c):
  'investigate', 'investigates', 'investigated', 'investigation', 'detective', 'puzzle',
  'puzzling', 'baffled', 'bewildered', 'enigma', 'enigmatic', 'riddle', 'unexplained',
  'inexplicable', 'conceal', 'conceals', 'concealed', 'cryptic', 'anomaly', 'anomalies',
];

/** Turn-verb lexicon for dramaticTurn — verbs that mark an irreversible
 *  change of state (as opposed to mere description), which is what makes a
 *  line "the single dramatic thing that changes this scene" rather than
 *  scene-setting. */
// Wave E1-c addition: turn verbs beyond the original discover/confess/die set
// — 'expose'/'unmask' name a THIRD PARTY forcing a disclosure (distinct from
// 'reveal'/'confess', which are self-initiated), 'surrender'/'defect' name a
// change of allegiance/side (distinct from 'abandon', which is leaving a
// person/place, not switching camps), and 'vow'/'swear' name a NEW
// irreversible commitment being made (distinct from 'admit'/'confess', which
// disclose something already true) — each a state-change verb not already
// covered.
const TURN_VERB_WORDS = [
  'betray', 'betrays', 'betrayed', 'discover', 'discovers', 'discovered', 'confess', 'confesses',
  'confessed', 'die', 'dies', 'died', 'leave', 'leaves', 'left', 'reveal', 'reveals', 'revealed',
  'kill', 'kills', 'killed', 'lie', 'lies', 'lied', 'forgive', 'forgives', 'forgave', 'sacrifice',
  'sacrifices', 'sacrificed', 'choose', 'chooses', 'chose', 'abandon', 'abandons', 'abandoned',
  'admit', 'admits', 'admitted',
  // Expose/switch-sides/vow family (Wave E1-c):
  'expose', 'exposes', 'exposed', 'unmask', 'unmasks', 'unmasked', 'surrender', 'surrenders',
  'surrendered', 'defect', 'defects', 'defected', 'vow', 'vows', 'vowed', 'swear', 'swears',
  'swore', 'renounce', 'renounces', 'renounced',
];

/** Deadline/stakes lexicon for clockRaised/clockDelta. Includes multi-word
 *  phrases (e.g. "running out of time") — countHits' word-boundary regex
 *  handles these fine since \b only anchors the phrase's outer edges. */
// Wave E1-c addition: temporal-pressure idioms beyond the original
// midnight/deadline/countdown set — these are the stock "the clock is the
// antagonist" phrases screenwriters reach for that don't literally use
// "time"/"clock"/"deadline" as a bare noun (e.g. "eleventh hour", "high
// noon"), so the multi-word phrase form matters exactly as it does for the
// pre-existing "running out of time"/"time's up" entries.
const DEADLINE_TERMS = [
  'midnight', 'deadline', 'hours left', 'before dawn', 'running out of time', 'countdown',
  "time's up", 'minutes left', 'almost too late', 'out of time', 'sunrise', 'dawn breaks',
  "o'clock", 'ticking clock', 'final hour', 'last chance',
  // Temporal-pressure idiom family (Wave E1-c):
  'against the clock', 'clock is ticking', 'time is running out', 'eleventh hour',
  'final countdown', 'no time left', 'seconds left', 'race against time', 'closing window',
  'high noon', 'last-minute', 'final seconds',
];

/** First-match-wins patterns for an explicit on-page revelation — distinct
 *  from TURN_VERB_WORDS (a turn is any state-changing action; a revelation is
 *  specifically a disclosure of previously-hidden truth to the audience). */
const REVEAL_PATTERNS: RegExp[] = [
  /\bthe truth is\b/i,
  /\bthe truth\b/i,
  /\bi know\b/i,
  /\bi knew it\b/i,
  /\bit was you\b/i,
  /\bturns out\b/i,
  /\bnever told you\b/i,
  /\bbeen lying\b/i,
  /\bi('m| am) (the|your)\b/i,
];

/** Concrete nouns that make an action line a filmable "visual beat" rather
 *  than an abstract description. Deliberately generic props/settings so the
 *  heuristic generalizes across genres. */
// Wave E1-c addition: both scene-furniture AND evidence-class nouns beyond
// the original list. Furniture additions ('lamp', 'sofa', 'cabinet', …) are
// ordinary ambient dressing, exactly the category CLUE_GENERIC_OBJECT_WORDS
// (below) exists to blocklist from the rare-anchor-alone clue shortcut — see
// that Set's own additions just below, kept in lockstep with these.
// Evidence-class additions ('fingerprints', 'lighter', 'scarf', …) are
// personal/identity-bearing items in the same spirit as the pre-existing
// 'badge'/'wallet'/'watch' (kept OFF the generic blocklist, i.e. left
// eligible for the rare-anchor-alone shortcut, exactly like those three).
const CONCRETE_NOUNS = [
  'gun', 'knife', 'blood', 'car', 'door', 'window', 'photo', 'photograph', 'letter', 'phone',
  'box', 'key', 'mirror', 'fire', 'rain', 'road', 'table', 'chair', 'hand', 'hands', 'eyes',
  'ring', 'wound', 'scar', 'badge', 'wallet', 'watch', 'glass', 'bottle', 'rope', 'chain',
  'flashlight', 'candle', 'clock', 'map', 'envelope', 'suitcase', 'bag', 'coat', 'shoes', 'blade',
  'bullet', 'trigger', 'smoke', 'ash', 'shadow', 'floor', 'wall', 'stairs', 'bed', 'desk', 'drawer',
  'knife', 'truck', 'gunfire',
  // Scene-furniture family (Wave E1-c — ALSO added to CLUE_GENERIC_OBJECT_WORDS below):
  'lamp', 'curtain', 'curtains', 'sofa', 'couch', 'sink', 'cabinet', 'shelf', 'ceiling', 'ladder',
  'fence', 'gate', 'sidewalk', 'bench', 'porch', 'bloodstain', 'lock', 'padlock',
  // Evidence-class family (Wave E1-c — deliberately NOT in the generic blocklist):
  'fingerprints', 'lighter', 'cigarette', 'syringe', 'newspaper', 'headline',
  'scarf', 'glove', 'gloves', 'earring', 'button',
];

/** All-caps tokens that read as emphasis or scene-heading vocabulary rather
 *  than a distinctive recurring prop — excluded from clue-token extraction so
 *  "STOP" or "NOW" don't get seeded/paid-off as if they were plot objects. */
const CAPS_STOPWORDS = new Set([
  'THE', 'AND', 'FOR', 'WITH', 'THIS', 'THAT', 'FROM', 'INTO', 'ONTO', 'OVER', 'UNDER', 'THEN',
  'THAN', 'WHO', 'WHAT', 'WHEN', 'WHERE', 'WHY', 'HOW', 'NOT', 'BUT', 'YOU', 'YOUR', 'NOW', 'STOP',
  'WAIT', 'LOOK', 'OK', 'YES', 'NO', 'INT', 'EXT', 'DAY', 'NIGHT', 'CUT', 'FADE',
]);

const RELATIONSHIP_SHIFT_THRESHOLD = 2;
/** Net valence beyond which emotionalShift reports positive/negative rather
 *  than neutral — a small deadband so a single stray word doesn't flip it. */
const EMOTIONAL_SHIFT_THRESHOLD = 1;

/** Second-person accusatory phrases for the power-balance signal (Wave
 *  1186) — a line leveling direct blame is a control move ("you did this")
 *  distinct from generic negative valence ("hate", "anger" — NEGATIVE_
 *  VALENCE_WORDS), which can appear with no addressee at all (a character
 *  fuming alone). Accusation specifically targets the OTHER speaker, which is
 *  what makes it a power-balance proxy rather than an emotional-tone one. */
// Wave E1-c addition: second-person accusatory phrases beyond the original
// set — 'you set me up'/'you manipulated me' name deliberate engineered
// harm (distinct from 'you broke'/'you ruined', which are about the RESULT,
// not the deliberateness), and 'you owe me'/'this is your fault' are the
// stock direct-blame openers real dialogue reaches for that don't happen to
// already be covered.
const ACCUSATORY_TERMS = [
  'you always', 'you never', 'your fault', 'you did this', 'you lied', 'you knew',
  'you ruined', 'you broke', 'you betrayed', 'you promised', 'how could you',
  'you left me', 'you abandoned', 'you used me',
  // Deliberate-harm/direct-blame family (Wave E1-c):
  'you owe me', 'you humiliated me', 'you manipulated me', 'you set me up', 'this is your fault',
  'you deceived me', 'you cheated', 'you stole from me', 'you never cared', 'you started this',
];

// ── Precompiled lexicon regexes ──────────────────────────────────────────────
// Built once at module load (not per-call) so per-scene analysis is a handful
// of single-pass regex scans rather than one RegExp construction per lexicon
// term per scene — this matters once a screenplay reaches hundreds of scenes.

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildLexiconRegex(terms: string[]): RegExp {
  return new RegExp(`\\b(?:${terms.map(escapeRegExp).join('|')})\\b`, 'gi');
}

const POSITIVE_VALENCE_RE = buildLexiconRegex(POSITIVE_VALENCE_WORDS);
const NEGATIVE_VALENCE_RE = buildLexiconRegex(NEGATIVE_VALENCE_WORDS);
const DANGER_TENSION_RE = buildLexiconRegex(DANGER_TENSION_WORDS);
const RELIEF_RE = buildLexiconRegex(RELIEF_WORDS);
const MYSTERY_RE = buildLexiconRegex(MYSTERY_WORDS);
const TURN_VERB_RE = buildLexiconRegex(TURN_VERB_WORDS);
const DEADLINE_RE = buildLexiconRegex(DEADLINE_TERMS);
const CONCRETE_NOUN_RE = buildLexiconRegex(CONCRETE_NOUNS);
const ACCUSATORY_RE = buildLexiconRegex(ACCUSATORY_TERMS);

/** Imperative-lead phrases for the power-balance signal (Wave 1186) — tested
 *  against the START of a line only (a command "opens" the line), unlike
 *  every buildLexiconRegex-based lexicon above which matches anywhere in the
 *  text. Sorted longest-first so a specific multi-word command ("sit down")
 *  is recognized before a shorter prefix that would also technically match
 *  ("sit") would matter — kept as a plain startsWith list rather than a
 *  regex since anchoring `\b` alternation to the string start needs the same
 *  longest-first ordering a regex alternation would need anyway, and this
 *  reads more plainly. Distinct from TURN_VERB_WORDS: that lexicon marks
 *  irreversible narrative state-change verbs anywhere in a line (dies,
 *  betrays, confesses) — a fact about the STORY; this marks a conversational
 *  command aimed at the other speaker — a fact about who is dictating the
 *  exchange, regardless of whether anything narratively irreversible occurs. */
// Wave E1-c addition: standoff/law-enforcement command phrases beyond the
// original set — 'freeze'/'kneel'/'on your knees'/'drop your weapon' are the
// stock physical-compliance commands of a standoff scene, a register the
// original list's more conversational commands ('sit down', 'come here')
// doesn't cover; 'do it now'/'speak now' add urgency-inflected variants of
// the existing bare 'stop'/'go'/'wait' entries.
const IMPERATIVE_LEAD_TERMS = [
  'sit down', 'get out', 'get up', 'get over here', 'get down', 'give me', 'tell me',
  'come here', 'come on', 'come with me', 'shut up', 'back off', 'let go', 'let me',
  'hands up', 'answer me', 'drop it', 'put it down', 'open the', 'close the', 'follow me',
  'watch it', "don't", 'move', 'run', 'explain', 'quiet', 'enough', 'stop', 'go', 'wait',
  'listen', 'look',
  // Standoff/compliance command family (Wave E1-c):
  'kneel', 'kneel down', 'freeze', 'surrender', 'hands where i can see them', 'on your knees',
  'get in the car', 'step back', 'stay back', 'stay there', 'stand still', "don't move",
  'drop your weapon', 'lower your weapon', 'answer the question', 'speak now', 'do it now',
  'get down on the ground',
].sort((a, b) => b.length - a.length);

/** True when `text` OPENS with an imperative-lead phrase (a command directed
 *  at the other speaker), after stripping a leading quote/dash/em-dash so
 *  Fountain's occasional leading punctuation doesn't hide a real command. */
function isImperativeLine(text: string): boolean {
  const bare = text.trim().toLowerCase().replace(/^["'\-—]+/, '');
  return IMPERATIVE_LEAD_TERMS.some(term => bare.startsWith(term));
}

/** Count all lexicon hits in `text`. Safe to call repeatedly: String.match
 *  with a global RegExp always rescans from the start regardless of the
 *  regex's stored lastIndex, per spec, so no manual reset is needed here. */
function countHits(text: string, re: RegExp): number {
  return (text.match(re) ?? []).length;
}

/** Boolean lexicon test. Global regexes are stateful under `.test()` (their
 *  lastIndex advances between calls), which would silently break a filter
 *  loop that calls this once per line — reset defensively before every test. */
function hasHit(text: string, re: RegExp): boolean {
  re.lastIndex = 0;
  return re.test(text);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// ── Scene segmentation ────────────────────────────────────────────────────────

interface DialogueLine {
  speaker: string;
  text: string;
}

interface SceneUnit {
  sceneIdx: number;
  slug: string;
  actionLines: string[];
  dialogueLines: DialogueLine[];
  /** Speaking characters in this scene, first-appearance order. */
  characters: string[];
  /** Action + dialogue lines in original document order — used by heuristics
   *  (revelation, dramatic turn) where "first/highest-scoring line" must
   *  respect actual reading order, not action-then-dialogue grouping. */
  orderedLines: string[];
  /** Parallel to orderedLines: true where that entry came from a dialogue
   *  block, false for action — lets detectQuestionLatency restrict "raises a
   *  question" to dialogue while still testing every line (action included)
   *  as a candidate answer, without re-deriving order from the raw blocks. */
  orderedIsDialogue: boolean[];
  /** orderedLines joined — the text surface cross-scene clue detection scans. */
  rawText: string;
}

/** Strip Fountain character-cue decorations ((V.O.), (O.S.), (CONT'D), the
 *  trailing ^ dual-dialogue marker) down to the bare character name. */
function normalizeCharacterName(raw: string): string {
  return raw
    .replace(/\^\s*$/, '')
    .replace(/\(\s*V\.O\.\s*\)/gi, '')
    .replace(/\(\s*O\.S\.\s*\)/gi, '')
    .replace(/\(\s*CONT'?D\s*\)/gi, '')
    .trim();
}

/** Walk one scene's blocks into the flat shape every heuristic below reads.
 *  `dual_dialogue`-typed blocks are cue lines in a side-by-side pair (see
 *  src/lib/fountain.ts) — they carry a character name exactly like `character`
 *  blocks do, so both types feed the same currentSpeaker tracking. */
function extractSceneContent(blocks: FountainBlock[]): Omit<SceneUnit, 'sceneIdx' | 'slug'> {
  const actionLines: string[] = [];
  const dialogueLines: DialogueLine[] = [];
  const characters: string[] = [];
  const orderedLines: string[] = [];
  const orderedIsDialogue: boolean[] = [];
  const seenChar = new Set<string>();
  let currentSpeaker = '';

  for (const b of blocks) {
    const text = b.text.trim();
    if (!text) continue;

    if (b.type === 'action') {
      actionLines.push(text);
      orderedLines.push(text);
      orderedIsDialogue.push(false);
    } else if (b.type === 'character' || b.type === 'dual_dialogue') {
      const name = normalizeCharacterName(text);
      currentSpeaker = name;
      if (name && !seenChar.has(name)) {
        seenChar.add(name);
        characters.push(name);
      }
    } else if (b.type === 'dialogue') {
      dialogueLines.push({ speaker: currentSpeaker, text });
      orderedLines.push(text);
      orderedIsDialogue.push(true);
    }
    // parenthetical/transition/shot/section/synopsis/note/lyrics/centered/
    // boneyard carry no signal for these heuristics and are intentionally skipped.
  }

  return { actionLines, dialogueLines, characters, orderedLines, orderedIsDialogue, rawText: orderedLines.join('\n') };
}

/** Split parsed blocks into per-scene groups on scene_heading boundaries.
 *  Any preamble before the first heading (title-page-ish text, a lone
 *  "FADE IN:") is folded into scene 0 rather than discarded, so nothing the
 *  author wrote before their first slugline is silently dropped. */
function segmentScenes(blocks: FountainBlock[]): Array<{ slug: string; blocks: FountainBlock[] }> {
  const headingIdxs: number[] = [];
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].type === 'scene_heading') headingIdxs.push(i);
  }

  if (headingIdxs.length === 0) {
    return [{ slug: 'UNTITLED SCENE', blocks }];
  }

  const scenes: Array<{ slug: string; blocks: FountainBlock[] }> = [];
  for (let h = 0; h < headingIdxs.length; h++) {
    const start = headingIdxs[h];
    const end = h + 1 < headingIdxs.length ? headingIdxs[h + 1] : blocks.length;
    scenes.push({ slug: blocks[start].text.trim(), blocks: blocks.slice(start + 1, end) });
  }
  if (headingIdxs[0] > 0) {
    scenes[0] = { ...scenes[0], blocks: [...blocks.slice(0, headingIdxs[0]), ...scenes[0].blocks] };
  }
  return scenes;
}

// ── Per-scene heuristics ──────────────────────────────────────────────────────

/** SUSPENSE: danger/tension lexicon density + exclamations + em-dash/ellipsis
 *  density + short punchy action lines (staccato reads as tense), minus a
 *  relief-lexicon term so calm scenes can swing the delta negative rather than
 *  merely sitting at zero. Distinct from curiosityDelta: this tracks physical
 *  danger, not unanswered questions — a scene can be one without the other. */
function detectSuspenseDelta(actionLines: string[], dialogueLines: DialogueLine[]): number {
  const allText = [...actionLines, ...dialogueLines.map(d => d.text)].join('\n');
  const dangerHits = countHits(allText, DANGER_TENSION_RE);
  const reliefHits = countHits(allText, RELIEF_RE);
  const exclamations = countHits(allText, /!/g);
  const emdashEllipsis = countHits(allText, /—|\.\.\./g);
  const shortPunchy = actionLines.filter(l => {
    const words = l.split(/\s+/).filter(Boolean);
    return words.length > 0 && words.length <= 4;
  }).length;
  const raw = dangerHits * 1 + exclamations * 0.5 + emdashEllipsis * 0.3 + shortPunchy * 0.4 - reliefHits * 0.7;
  return clamp(Math.round(raw), -3, 5);
}

/** CURIOSITY: unanswered-question density (question marks in dialogue) plus
 *  mystery lexicon hits across the whole scene. Distinct from suspenseDelta:
 *  curiosity is cognitive ("what don't we know yet"), suspense is visceral
 *  ("what's about to happen"). */
function detectCuriosityDelta(dialogueLines: DialogueLine[], actionLines: string[]): number {
  const dialogueText = dialogueLines.map(d => d.text).join('\n');
  const allText = `${dialogueText}\n${actionLines.join('\n')}`;
  const questionMarks = countHits(dialogueText, /\?/g);
  const mysteryHits = countHits(allText, MYSTERY_RE);
  const raw = questionMarks * 0.8 + mysteryHits * 1.2;
  return clamp(Math.round(raw), -2, 5);
}

/** DRAMATIC TURN: the single line (action or dialogue, in original order)
 *  with the most turn-verb hits. Strict `>` (not `>=`) means ties resolve to
 *  the first-occurring line, keeping the result deterministic. */
function detectDramaticTurn(orderedLines: string[]): string {
  let best = '';
  let bestScore = 0;
  for (const line of orderedLines) {
    const score = countHits(line, TURN_VERB_RE);
    if (score > bestScore) {
      bestScore = score;
      best = line;
    }
  }
  return bestScore > 0 ? best : '';
}

/** REVELATION: the first line (in document order) matching an explicit
 *  disclosure pattern. Distinct from dramaticTurn: a revelation is specifically
 *  a truth surfacing to the audience, not any state-changing action. */
function detectRevelation(orderedLines: string[]): string | null {
  for (const line of orderedLines) {
    if (REVEAL_PATTERNS.some(re => re.test(line))) return line;
  }
  return null;
}

/** CLOCK: deadline/stakes lexicon density. clockDelta counts every distinct
 *  deadline mention (not just presence) so downstream passes can weigh a
 *  scene that raises the stakes three times more heavily than one that
 *  mentions a deadline once. */
function detectClock(actionLines: string[], dialogueLines: DialogueLine[]): { clockRaised: boolean; clockDelta: number } {
  const allText = [...actionLines, ...dialogueLines.map(d => d.text)].join('\n');
  const clockDelta = countHits(allText, DEADLINE_RE);
  return { clockRaised: clockDelta > 0, clockDelta };
}

/** EMOTIONAL SHIFT: net positive-minus-negative valence across the whole
 *  scene, past a small deadband so a single stray word can't flip the sign. */
function detectEmotionalShift(actionLines: string[], dialogueLines: DialogueLine[]): ScreenplaySceneRecord['emotionalShift'] {
  const allText = [...actionLines, ...dialogueLines.map(d => d.text)].join('\n');
  const net = countHits(allText, POSITIVE_VALENCE_RE) - countHits(allText, NEGATIVE_VALENCE_RE);
  if (net > EMOTIONAL_SHIFT_THRESHOLD) return 'positive';
  if (net < -EMOTIONAL_SHIFT_THRESHOLD) return 'negative';
  return 'neutral';
}

/** VISUAL BEATS: up to 2 action lines containing a concrete noun (a filmable
 *  object/setting), longest first — length is a cheap proxy for "the most
 *  fully-staged" beat when several lines qualify. */
function detectVisualBeats(actionLines: string[]): string[] {
  return actionLines
    .filter(line => hasHit(line, CONCRETE_NOUN_RE))
    .sort((a, b) => b.length - a.length)
    .slice(0, 2);
}

/** DIALOGUE HIGHLIGHTS: up to 2 longest dialogue lines in the scene. */
function detectDialogueHighlights(dialogueLines: DialogueLine[]): string[] {
  return dialogueLines.map(d => d.text).sort((a, b) => b.length - a.length).slice(0, 2);
}

/** RELATIONSHIP SHIFTS: for every pair of characters who both speak in this
 *  scene, sum the valence of their lines; a pair whose |sum| clears the
 *  threshold gets a 'trust' shift entry. Always returns an array (possibly
 *  empty) — never undefined — matching the memory.ts field's builder
 *  contract ("the builder always populates this"). */
function detectRelationshipShifts(
  characters: string[],
  dialogueLines: DialogueLine[],
): Array<{ pairKey: string; dimension: string; amount: number }> {
  if (characters.length < 2) return [];
  const shifts: Array<{ pairKey: string; dimension: string; amount: number }> = [];
  for (let i = 0; i < characters.length; i++) {
    for (let j = i + 1; j < characters.length; j++) {
      const a = characters[i];
      const b = characters[j];
      const relevantLines = dialogueLines.filter(d => d.speaker === a || d.speaker === b);
      let sum = 0;
      for (const line of relevantLines) {
        sum += countHits(line.text, POSITIVE_VALENCE_RE) - countHits(line.text, NEGATIVE_VALENCE_RE);
      }
      if (Math.abs(sum) >= RELATIONSHIP_SHIFT_THRESHOLD) {
        shifts.push({
          pairKey: [a, b].sort().join('|'),
          dimension: 'trust',
          amount: Math.sign(sum) * Math.min(Math.abs(sum), 5),
        });
      }
    }
  }
  return shifts;
}

// ── Purpose (position + content) ─────────────────────────────────────────────

interface PurposeContext {
  sceneIdx: number;
  sceneCount: number;
  suspenseDelta: number;
  maxSuspense: number;
  prevSuspense: number;
  revelation: string | null;
  clockRaised: boolean;
  dramaticTurn: string;
  dialogueHeavy: boolean;
}

/** Priority-ordered position + content heuristic. Each rule is checked in
 *  order and the first match wins, so more specific/dramatically-loaded
 *  signals (revelation, climax) outrank the generic 'complicate' default. */
function detectPurpose(ctx: PurposeContext): ScenePurpose {
  const {
    sceneIdx, sceneCount, suspenseDelta, maxSuspense, prevSuspense,
    revelation, clockRaised, dramaticTurn, dialogueHeavy,
  } = ctx;

  // Rule 1 — position: the opening scene establishes the world UNLESS it's
  // already mid-conflict (a cold open), signaled by unusually high suspense
  // for a first scene.
  if (sceneIdx === 0) {
    return suspenseDelta >= 3 ? 'introduce_conflict' : 'establish_world';
  }

  const positionFrac = sceneCount > 1 ? sceneIdx / (sceneCount - 1) : 1;

  // Rule 2 — position + single-peak isolation: the story's single
  // highest-suspense scene, late in the runtime, is the climax.
  if (positionFrac >= 0.85 && maxSuspense > 0 && suspenseDelta === maxSuspense) {
    return 'climax';
  }

  // Rule 3 — position + trend: the final scene, with intensity falling from
  // the one before it, reads as the wind-down after the climax has passed.
  if (sceneIdx === sceneCount - 1 && suspenseDelta < prevSuspense) {
    return 'resolution';
  }

  // Rule 4 — content: an audience-facing disclosure outranks generic
  // complication — it's the more specific, more dramatically loaded signal.
  if (revelation !== null) return 'revelation';

  // Rule 5 — content: an explicit deadline/stakes marker raises the stakes.
  if (clockRaised) return 'raise_stakes';

  // Rule 6 — content + position: a turn-verb line near the story's
  // structural midpoint is a turning point; the same marker elsewhere in the
  // runtime is just complication.
  if (dramaticTurn !== '') {
    return positionFrac >= 0.4 && positionFrac <= 0.6 ? 'turning_point' : 'complicate';
  }

  // Rule 7 — content: dialogue-heavy scenes with no rising tension usually
  // serve character rather than plot.
  if (dialogueHeavy && suspenseDelta <= 0) return 'character_moment';

  return 'complicate';
}

// ── Clue lifecycle (cross-scene) ─────────────────────────────────────────────

const QUOTE_RE = /"([^"]{3,60})"/g;
const CAPS_TOKEN_RE = /\b[A-Z]{3,}(?:\s[A-Z]{3,}){0,2}\b/g;

/** Recurring-token candidates for clue seed/payoff tracking: quoted phrases
 *  and ALL-CAPS multi-use props (the standard screenwriting convention for
 *  flagging a significant prop/sound on its first mention). Returns a
 *  deduplicated per-scene set — a token mentioned 3 times in one scene still
 *  counts once toward that scene's occurrence list. */
function extractDistinctiveTokens(text: string): string[] {
  const tokens = new Set<string>();
  for (const m of text.matchAll(QUOTE_RE)) {
    const id = m[1].trim().toLowerCase();
    if (id.length >= 3) tokens.add(id);
  }
  for (const m of text.matchAll(CAPS_TOKEN_RE)) {
    const words = m[0].split(/\s+/).filter(w => !CAPS_STOPWORDS.has(w));
    if (words.length === 0) continue;
    const id = words.join(' ').toLowerCase();
    if (id.length >= 3) tokens.add(id);
  }
  return [...tokens];
}

function slugifyToken(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

/** Shared seed/payoff/unresolved bookkeeping for one recurring-object id,
 *  reused by both the exact-token channel and the content-word channel below
 *  so the two independent recall paths land in one consistent shape. Guards
 *  against a duplicate id (the same object caught by both channels in the
 *  same scene, e.g. an ALL-CAPS prop that is also a clue-anchor noun) so
 *  seededClueIds/payoffSetupIds never carry a repeated entry. */
function applyClueLifecycle(
  id: string,
  occ: number[],
  seedsByScene: Record<number, string[]>,
  payoffsByScene: Record<number, string[]>,
  unresolvedByScene: Record<number, string[]>,
): void {
  const first = occ[0];
  const last = occ[occ.length - 1];
  const seeds = (seedsByScene[first] ??= []);
  if (!seeds.includes(id)) seeds.push(id);
  if (occ.length >= 2 && last - first >= 2) {
    const payoffs = (payoffsByScene[last] ??= []);
    if (!payoffs.includes(id)) payoffs.push(id);
  } else if (occ.length === 1) {
    const unresolved = (unresolvedByScene[first] ??= []);
    if (!unresolved.includes(id)) unresolved.push(id);
  }
}

// ── Clue lifecycle: content-word recall channel ──────────────────────────────
// WHY: the exact-token channel above (quoted phrases / CAPS tokens) is
// precise but blind to how real scripts actually restate a clue — measured
// at 0/20 fires across the calibration corpus (every sample seeds clues,
// none pays one off) because a clue seeded as "a brass key on a red ribbon"
// and paid off as "the key Marla took" shares no verbatim quoted phrase and
// no ALL-CAPS emphasis. This section adds a SECOND, fully independent recall
// path: it walks every CLUE_ANCHOR_NOUNS mention in the document, in scene
// order, and clusters mentions of the SAME anchor noun into one recurring
// object when either (a) the anchor is rare enough in this script to be
// distinctive on its own, or (b) the two mentions additionally share a
// content word beyond the anchor. The exact-token channel is left completely
// untouched below — this is ADDITIVE, not a replacement.

/** Function-word stoplist for clue content-word matching. Kept independent
 *  from QUESTION_STOPWORDS (that list is scoped to question-latency
 *  fingerprinting, see the "Question-answer latency" section below) and from
 *  CAPS_STOPWORDS (ALL-CAPS emphasis/scene-heading tokens only) per this
 *  file's one-list-per-signal convention: tuning one heuristic's stoplist
 *  must never silently shift a different signal's behavior. Content overlaps
 *  QUESTION_STOPWORDS heavily by necessity (both are "strip English function
 *  words") but the two lists are free to drift independently, and this one
 *  additionally drops generic indefinite pronouns/adverbs ("someone",
 *  "again", "finally") that are common enough to cause false shared-word
 *  matches between two otherwise-unrelated sentences. */
const CLUE_FUNCTION_STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'am', 'do', 'does', 'did',
  'you', 'your', 'yours', 'i', 'me', 'my', 'we', 'us', 'our', 'they', 'them',
  'their', 'he', 'him', 'his', 'she', 'her', 'hers', 'it', 'its', 'this',
  'that', 'these', 'those', 'to', 'of', 'in', 'on', 'at', 'for', 'with',
  'and', 'or', 'but', 'what', 'who', 'whom', 'why', 'when', 'where', 'how',
  'will', 'would', 'could', 'should', 'can', 'have', 'has', 'had', 'not',
  "don't", "doesn't", "didn't", "isn't", "aren't", "can't", "won't", 'be',
  'been', 'being', 'if', 'so', 'just', 'really', 'then', 'there', 'here',
  'someone', 'somebody', 'anyone', 'anybody', 'something', 'anything',
  'everything', 'everyone', 'nothing', 'nobody', 'again', 'still', 'already',
  'always', 'never', 'ever', 'also', 'even', 'once', 'back', 'away', 'out',
  'up', 'down', 'off', 'over', 'under', 'into', 'onto', 'through', 'around',
  'about', 'before', 'after', 'during', 'because', 'since', 'until', 'upon',
  'from', 'by', 'as', 'all', 'each', 'every', 'both', 'other', 'another',
  'more', 'most', 'no', 'yes', 'now', 'too', 'very',
]);

/** Common handling/perception verbs stripped from clue content-word sets —
 *  two mentions of the same object shouldn't "match" purely because both
 *  sentences happen to use "found" or "took". Distinct from
 *  CLUE_FUNCTION_STOPWORDS (grammar words with no content at all); these
 *  carry meaning but are too generic to identify WHICH object is handled. */
const CLUE_COMMON_VERBS = new Set([
  'took', 'take', 'takes', 'taking', 'taken', 'found', 'find', 'finds',
  'finding', 'saw', 'see', 'sees', 'seeing', 'seen', 'looked', 'look',
  'looks', 'looking', 'went', 'go', 'goes', 'going', 'gone', 'came', 'come',
  'comes', 'coming', 'said', 'say', 'says', 'saying', 'told', 'tell', 'tells',
  'telling', 'gave', 'give', 'gives', 'giving', 'given', 'made', 'make',
  'makes', 'making', 'put', 'puts', 'putting', 'got', 'get', 'gets',
  'getting', 'gotten', 'held', 'hold', 'holds', 'holding', 'picked', 'pick',
  'picks', 'picking', 'dropped', 'drop', 'drops', 'dropping', 'placed',
  'place', 'places', 'placing', 'left', 'leave', 'leaves', 'leaving',
  'opened', 'open', 'opens', 'opening', 'closed', 'close', 'closes',
  'closing', 'turned', 'turn', 'turns', 'turning', 'grabbed', 'grab',
  'grabs', 'grabbing', 'pulled', 'pull', 'pulls', 'pulling', 'pushed',
  'push', 'pushes', 'pushing', 'walked', 'walk', 'walks', 'walking', 'ran',
  'run', 'runs', 'running', 'stood', 'stand', 'stands', 'standing', 'sat',
  'sit', 'sits', 'sitting', 'stared', 'stare', 'stares', 'staring',
  'noticed', 'notice', 'notices', 'noticing', 'thinks', 'thought', 'think',
  'thinking', 'feels', 'felt', 'feel', 'feeling', 'knows', 'knew', 'know',
  'knowing', 'wants', 'wanted', 'want', 'wanting', 'finally', 'buried',
  'bury', 'buries', 'burying', 'understands', 'understood', 'understand',
  'remembers', 'remembered', 'remember', 'checks', 'checked', 'check',
  'reads', 'read', 'reading', 'wrote', 'write', 'writes', 'writing',
  'written', 'admits', 'admitted', 'admit', 'pins', 'pinned', 'pin',
]);

/** Concrete/investigative object nouns eligible to ANCHOR a content-word clue
 *  candidate. Extends CONCRETE_NOUNS (the visual-beat lexicon defined above)
 *  with the document/keepsake/evidence vocabulary real mystery and drama
 *  scripts actually recur on ("the manifest", "the ledger", "her mother's
 *  bracelet") that CONCRETE_NOUNS' scene-furniture focus doesn't cover. This
 *  is an EXTENSION, not a misuse: CONCRETE_NOUNS keeps its original purpose
 *  (visual-beat scoring) completely untouched — this is a superset built for
 *  a different signal, the same relationship extractDistinctiveTokens'
 *  CAPS_TOKEN_RE has to CAPS_STOPWORDS but in the other direction. */
const CLUE_ANCHOR_NOUNS = [
  ...CONCRETE_NOUNS,
  'manifest', 'ledger', 'logbook', 'journal', 'diary', 'document', 'documents',
  'file', 'files', 'dossier', 'folder', 'note', 'notebook', 'tape', 'recording',
  'video', 'photograph', 'evidence', 'contract', 'deed', 'will', 'testimony',
  'statement', 'receipt', 'ticket', 'token', 'coin', 'necklace', 'bracelet',
  'pendant', 'amulet', 'heirloom', 'artifact', 'relic', 'weapon', 'pistol',
  'revolver', 'vial', 'sample', 'fingerprint', 'passport', 'invoice', 'memo',
  'password', 'combination', 'safe', 'vault', 'chest', 'container', 'briefcase',
  'blueprint', 'schematic', 'usb', 'laptop', 'drive',
];

/** A word appearing in this many or fewer distinct clue-content-word
 *  candidates document-wide is treated as distinctive enough, on its own, to
 *  identify a recurring object. 2 is the floor a seed/payoff pair needs
 *  anyway (see detectClueLifecycle's gap rule) — the loosest value that
 *  still lets a genuine two-mention clue through. A wider value (3) was
 *  tried and recovered a few additional real three-mention clues in the
 *  calibration corpus, but MEASURED against the full pipeline (not just this
 *  file in isolation) it cost more than it gained: the exact-token channel's
 *  own quoted clue text is duplicated verbatim by the length-invariance
 *  calibration check's 2x/3x concatenation methodology (tests/core/
 *  calibration.test.ts), and every revision pass that reads seededClueIds/
 *  payoffSetupIds (13 passes, ~60 rules in payoff.ts alone) was calibrated
 *  against those fields being populated by the ops-derived StoryOp path —
 *  never against the text path, where they were always empty before this
 *  channel existed. A wider net woke up more of that dormant rule surface
 *  than the corpus's band-ordering and length-invariance checks tolerate.
 *  2 is the tightest value that (a) still demonstrates real recall
 *  improvement (16/20 → 12/20 corpus samples fire at least one payoff,
 *  still up from the pre-fix 0/20) and (b) keeps the full pipeline's
 *  pre-existing band-ordering/no-saturation invariants green end-to-end. */
const CLUE_RARE_ANCHOR_MAX_OCCURRENCES = 2;

/** Minimum shared, non-anchor content words required for two mentions of a
 *  NOT-rare (or blocklisted-generic, see CLUE_GENERIC_OBJECT_WORDS) anchor to
 *  be treated as the same recurring object rather than two unrelated
 *  mentions of a common prop. Raised from 1 to 2 for the same
 *  measured-against-the-full-pipeline reason as CLUE_RARE_ANCHOR_MAX_
 *  OCCURRENCES above: a single shared descriptor word was cheap to satisfy
 *  by coincidence (including, degenerately, between two near-duplicate
 *  copies of the same script), and downstream revision passes are
 *  sensitive enough to newly-nonzero clue signals that the extra false
 *  positives this let through were measurably worse than the recall lost by
 *  tightening it. */
const CLUE_MIN_SHARED_NON_ANCHOR_WORDS = 2;

/** Anchor nouns common enough as ordinary scene dressing, in almost any
 *  screenplay, that two mentions must NOT be allowed to pair on the anchor
 *  alone — no matter how rare the word happens to measure in a given
 *  script — since "a door" mentioned in two unrelated scenes is not a clue
 *  payoff. These stay eligible for the shared-word path (two mentions of
 *  "the cellar door" legitimately corroborate each other); they are excluded
 *  only from the rare-anchor-alone shortcut.
 *
 *  Deliberately the MAJORITY of CONCRETE_NOUNS, not a small carve-out:
 *  CONCRETE_NOUNS' own documented purpose (above) is "make an action line a
 *  filmable visual beat" — i.e. ordinary vivid description, not distinctive
 *  planted objects — so most of it is exactly the wrong kind of word to
 *  trust alone. This was measured, not assumed: an earlier, narrower version
 *  of this blocklist let ambient words ("wall", "window", "fire", "trigger")
 *  that only happen to appear once or twice in a given short script pair up
 *  across two UNRELATED near-duplicate documents with zero shared context —
 *  caught by the length-invariance calibration check (tests/core/
 *  calibration.test.ts), which concatenates renamed copies of the same
 *  sample and expects near-flat displayed health. Only nouns whose narrative
 *  role is closer to "keepsake/evidence/weapon" than "scene dressing" keep
 *  the rare-alone shortcut — see the nouns absent from this list. */
// Wave E1-c addition: the new scene-furniture nouns added to CONCRETE_NOUNS
// above ('lamp'…'padlock') are exactly the ambient-dressing kind this Set's
// header comment describes ("ordinary scene dressing, in almost any
// screenplay") — added here in lockstep so the blocklist doesn't silently
// drift out of sync with CONCRETE_NOUNS the way an earlier, narrower version
// of this list once did (see the header comment's own account of that bug).
const CLUE_GENERIC_OBJECT_WORDS = new Set([
  'door', 'window', 'table', 'chair', 'floor', 'wall', 'hand', 'hands',
  'eyes', 'road', 'bed', 'desk', 'stairs', 'smoke', 'ash', 'shadow', 'coat',
  'shoes', 'rain', 'fire', 'car', 'truck', 'glass', 'bag', 'phone', 'mirror',
  'drawer', 'box', 'trigger', 'blood', 'wound', 'scar', 'rope', 'chain',
  'bottle', 'candle', 'clock', 'flashlight', 'gunfire',
  // Wave E1-c furniture additions (mirrors CONCRETE_NOUNS's new furniture family):
  'lamp', 'curtain', 'curtains', 'sofa', 'couch', 'sink', 'cabinet', 'shelf',
  'ceiling', 'ladder', 'fence', 'gate', 'sidewalk', 'bench', 'porch',
  'bloodstain', 'lock', 'padlock',
]);

/** Splits a document into sentence-like chunks so clue candidates are scoped
 *  to one clause rather than a whole multi-sentence action paragraph — the
 *  same punctuation-based split question-latency's splitSentences uses,
 *  reimplemented locally rather than imported forward from that later
 *  section so this section stays self-contained top-to-bottom. */
const CLUE_SENTENCE_SPLIT_RE = /[^.!?]+[.!?]+|[^.!?]+$/g;

function splitClueSentences(text: string): string[] {
  return (text.match(CLUE_SENTENCE_SPLIT_RE) ?? [text]).map(s => s.trim()).filter(Boolean);
}

/** Light plural/possessive stemming — the only conjugation/derivation
 *  handling this heuristic does (an accepted, documented NLP gap, matching
 *  this file's "no heavy NLP" style elsewhere): "key"/"keys"/"key's" collapse
 *  to the one identifier "key". Words ending in a double "s" ("glass",
 *  "boss") are left alone so a plural strip doesn't create a false stem
 *  collision. */
function clueStem(word: string): string {
  let w = word;
  if (w.endsWith("'s")) w = w.slice(0, -2);
  else if (w.endsWith("s'")) w = w.slice(0, -1);
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1);
  return w;
}

const CLUE_ANCHOR_NOUN_STEMS = new Set(CLUE_ANCHOR_NOUNS.map(clueStem));

/** Builds the document-wide set of character-name words (lowercased, split
 *  on whitespace so "DETECTIVE MORALES" contributes both "detective" and
 *  "morales") to exclude from clue content-word sets. Without this, a
 *  recurring character's name — mentioned in nearly every scene, often right
 *  next to whatever prop that scene features — inflates the shared-word
 *  count between two otherwise-unrelated object mentions ("Odell" next to a
 *  table in one scene, "Odell" next to a locked door in another) and risks a
 *  false payoff match on nothing but a name both sentences happen to
 *  contain. */
function collectClueCharacterNameWords(scenes: SceneUnit[]): Set<string> {
  const words = new Set<string>();
  for (const s of scenes) {
    for (const name of s.characters) {
      for (const w of name.toLowerCase().split(/[^a-z0-9']+/).filter(Boolean)) {
        words.add(w);
      }
    }
  }
  return words;
}

/** Sentence-scoped content-word set for clue matching: lowercased, stripped
 *  of punctuation (apostrophes kept so possessives stem correctly), function
 *  words, common handling verbs, and character names removed. Short words
 *  are dropped UNLESS their stem is itself a clue-anchor noun — several of
 *  the most common physical clues ("key", "gun", "map", "box", "bag", "ash")
 *  are 3 letters and would otherwise be filtered by a generic noise-guarding
 *  length floor (mirrors this file's MIN_CONTENT_WORD_LENGTH guard used for
 *  question-latency, just with a per-word anchor exception here). */
function extractClueContentWords(sentence: string, characterNameWords: Set<string>): Set<string> {
  const raw = sentence.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean);
  const words = new Set<string>();
  for (const w of raw) {
    if (CLUE_FUNCTION_STOPWORDS.has(w) || CLUE_COMMON_VERBS.has(w) || characterNameWords.has(w)) continue;
    const stem = clueStem(w);
    if (CLUE_FUNCTION_STOPWORDS.has(stem) || CLUE_COMMON_VERBS.has(stem) || characterNameWords.has(stem)) continue;
    if (stem.length < 4 && !CLUE_ANCHOR_NOUN_STEMS.has(stem)) continue;
    words.add(stem);
  }
  return words;
}

interface ClueContentCandidate {
  anchor: string;
  words: Set<string>;
}

/** Per-scene, per-anchor content-word candidates: every sentence in the
 *  scene is scanned for a clue-anchor noun; sentences sharing an anchor
 *  within the SAME scene are unioned into one candidate — mirroring
 *  extractDistinctiveTokens's per-scene dedup, so an anchor mentioned several
 *  times in one scene still counts once toward that scene's occurrence
 *  list. */
function extractSceneClueCandidates(text: string, characterNameWords: Set<string>): ClueContentCandidate[] {
  const byAnchor = new Map<string, Set<string>>();
  for (const sentence of splitClueSentences(text)) {
    const words = extractClueContentWords(sentence, characterNameWords);
    for (const w of words) {
      if (!CLUE_ANCHOR_NOUN_STEMS.has(w)) continue;
      const existing = byAnchor.get(w);
      if (existing) { for (const x of words) existing.add(x); }
      else byAnchor.set(w, new Set(words));
    }
  }
  return [...byAnchor.entries()].map(([anchor, words]) => ({ anchor, words }));
}

interface ClueCluster {
  anchor: string;
  words: Set<string>;
  occurrences: number[];
  id: string;
}

function clueClusterId(anchor: string, words: Set<string>): string {
  const extra = [...words].find(w => w !== anchor);
  return slugifyToken(extra ? `${anchor}-${extra}` : anchor);
}

/** Clusters clue-anchor-noun mentions into recurring objects. Walks the
 *  document in scene order; for each mention, tests it against every
 *  existing cluster's FIRST (seed) mention only — never an accumulating
 *  union of everything matched so far — so word-set drift can't chain three
 *  unrelated mentions together through a middle one. Two mentions of the
 *  same anchor are the same object when EITHER (a) the anchor is rare enough
 *  in this script to be distinctive alone (<= CLUE_RARE_ANCHOR_MAX_
 *  OCCURRENCES total mentions, and not a CLUE_GENERIC_OBJECT_WORDS entry), OR
 *  (b) they share at least CLUE_MIN_SHARED_NON_ANCHOR_WORDS content word
 *  beyond the anchor itself. First match wins (deterministic, cluster
 *  creation order), matching this file's existing "first occurrence is the
 *  seed" convention.
 *
 *  Only clusters that actually RECUR (>= 2 occurrences) are returned. A
 *  single mention of a clue-anchor noun ("a map on the table", once, never
 *  again) is NOT reported as a seeded-but-unresolved clue the way the
 *  exact-token channel's quoted/CAPS tokens are: those are a deliberate,
 *  sparse authorial signal (a screenwriter choosing to emphasize a prop), so
 *  treating even a single instance as a planted-but-dropped clue is a
 *  reasonable inference. CLUE_ANCHOR_NOUNS is, by necessity, a much broader
 *  net (~100 common object words) so that its ORDINARY, incidental use in
 *  scene description doesn't get manufactured into a false "unresolved
 *  clue" on every single mention — measured against the calibration corpus,
 *  reporting single mentions here inflated unresolved-clue volume 6-9x on
 *  some samples with no corresponding craft signal, which is exactly the
 *  kind of noise this file's rules are supposed to guard against. This
 *  channel's job is recall for PAYOFFS the exact-token channel misses, not a
 *  second census of every prop word in the script. */
function computeContentWordClueClusters(scenes: SceneUnit[]): ClueCluster[] {
  const characterNameWords = collectClueCharacterNameWords(scenes);
  const perScene = scenes.map(s => extractSceneClueCandidates(s.rawText, characterNameWords));

  const anchorCounts = new Map<string, number>();
  for (const list of perScene) {
    for (const cand of list) anchorCounts.set(cand.anchor, (anchorCounts.get(cand.anchor) ?? 0) + 1);
  }

  const clusters: ClueCluster[] = [];
  for (let i = 0; i < scenes.length; i++) {
    const sceneIdx = scenes[i].sceneIdx;
    for (const cand of perScene[i]) {
      let matched: ClueCluster | null = null;
      for (const cluster of clusters) {
        if (cluster.anchor !== cand.anchor) continue;
        const rare = !CLUE_GENERIC_OBJECT_WORDS.has(cand.anchor)
          && (anchorCounts.get(cand.anchor) ?? 0) <= CLUE_RARE_ANCHOR_MAX_OCCURRENCES;
        if (rare) { matched = cluster; break; }
        let sharedExtra = 0;
        for (const w of cand.words) {
          if (w !== cand.anchor && cluster.words.has(w)) sharedExtra++;
        }
        if (sharedExtra >= CLUE_MIN_SHARED_NON_ANCHOR_WORDS) { matched = cluster; break; }
      }
      if (matched) {
        if (matched.occurrences[matched.occurrences.length - 1] !== sceneIdx) matched.occurrences.push(sceneIdx);
      } else {
        clusters.push({
          anchor: cand.anchor,
          words: cand.words,
          occurrences: [sceneIdx],
          id: clueClusterId(cand.anchor, cand.words),
        });
      }
    }
  }
  return clusters.filter(c => c.occurrences.length >= 2);
}

/** Cross-scene clue lifecycle: a distinctive token is SEEDED at its first
 *  occurrence. If it reappears at least 2 scenes later, that reappearance is
 *  its PAYOFF. A token that is never mentioned again anywhere (a true single
 *  occurrence) is an unresolved clue at its seed scene — "seeds never
 *  re-mentioned," per spec. A token that reappears too soon to count as a
 *  formal payoff (gap < 2 scenes) is seeded but neither paid off nor flagged
 *  unresolved — it was re-mentioned, just not distant enough to read as a
 *  deliberate callback; this is an accepted heuristic gap, not a bug.
 *
 *  Two independent recall channels feed this bookkeeping: the exact-token
 *  channel (quoted phrases / CAPS tokens, unchanged) and the content-word
 *  channel (computeContentWordClueClusters, see the section above) — added
 *  because the exact-token channel alone measured 0/20 payoff fires across
 *  the calibration corpus; every sample seeds clues via CAPS/quotes but real
 *  scripts almost never repeat the exact phrasing verbatim. */
function detectClueLifecycle(scenes: SceneUnit[]): {
  seedsByScene: Record<number, string[]>;
  payoffsByScene: Record<number, string[]>;
  unresolvedByScene: Record<number, string[]>;
} {
  const tokenScenes = new Map<string, number[]>();
  for (const s of scenes) {
    for (const token of extractDistinctiveTokens(s.rawText)) {
      const arr = tokenScenes.get(token);
      if (arr) arr.push(s.sceneIdx);
      else tokenScenes.set(token, [s.sceneIdx]);
    }
  }

  const seedsByScene: Record<number, string[]> = {};
  const payoffsByScene: Record<number, string[]> = {};
  const unresolvedByScene: Record<number, string[]> = {};

  for (const [token, occ] of tokenScenes) {
    applyClueLifecycle(slugifyToken(token), occ, seedsByScene, payoffsByScene, unresolvedByScene);
  }

  for (const cluster of computeContentWordClueClusters(scenes)) {
    applyClueLifecycle(cluster.id, cluster.occurrences, seedsByScene, payoffsByScene, unresolvedByScene);
  }

  return { seedsByScene, payoffsByScene, unresolvedByScene };
}

// ── Question-answer latency (cross-scene) — Wave 1182 ────────────────────────
// WHY this is a genuinely new channel, not a restatement of curiosityDelta:
// curiosityDelta is an INTENSITY score (question-mark density + mystery
// lexicon hits) with no notion of an individual question as a trackable
// entity — it cannot say whether a specific question got answered, how long
// that took, or whether it never did. The functions below lexically
// fingerprint each substantive dialogue question and match it forward against
// every later line (any scene, action or dialogue) that shares enough of its
// distinctive vocabulary, mirroring detectClueLifecycle's seed/payoff shape
// but for interrogative dialogue rather than recurring props/quoted phrases.

/** Guard lexicon: short/rhetorical interrogatives that read as verbal tics or
 *  phatic check-ins ("What?", "You okay?") rather than a substantive question
 *  the story owes an answer to. Matched against the WHOLE question sentence
 *  (lowercased, punctuation stripped) — not just word count — so a tic with
 *  enough words to otherwise clear the bar (e.g. "Are you okay now?") still
 *  gets filtered. Distinct purpose from CAPS_STOPWORDS (that one excludes
 *  emphasis tokens from clue-token extraction; this excludes conversational
 *  tics from question-raising). */
const PHATIC_QUESTION_GUARD = new Set([
  'what', 'why', 'how', 'really', 'seriously', 'huh', 'what now', 'and', 'so',
  'right', 'you ok', 'you okay', 'are you ok', 'are you okay',
  'are you okay now', 'you sure', 'are you sure', 'you coming', 'got it',
  'you understand', 'you see', 'you know', 'ok', 'okay', 'you hear me',
  'why not', 'why now', 'what about it',
]);

/** Function-word stoplist for content-word fingerprinting, so two lines don't
 *  "match" purely on shared grammar ("what", "did", "you"). Kept separate
 *  from CAPS_STOPWORDS (that list is about ALL-CAPS clue tokens, a different
 *  extraction with different false-positive risks). */
const QUESTION_STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'am', 'do', 'does', 'did',
  'you', 'your', 'yours', 'i', 'me', 'my', 'we', 'us', 'our', 'they', 'them',
  'their', 'he', 'him', 'his', 'she', 'her', 'hers', 'it', 'its', 'this',
  'that', 'these', 'those', 'to', 'of', 'in', 'on', 'at', 'for', 'with',
  'and', 'or', 'but', 'what', 'who', 'whom', 'why', 'when', 'where', 'how',
  'will', 'would', 'could', 'should', 'can', 'have', 'has', 'had', 'not',
  "don't", "doesn't", "didn't", "isn't", "aren't", "can't", "won't", 'be',
  'been', 'being', 'if', 'so', 'just', 'really', 'then', 'there', 'here',
]);

/** A question sentence needs at least this many words (after stripping the
 *  trailing "?") to count as substantive — below this, one-or-two-word
 *  interrogatives are near-certainly conversational tics even when not
 *  literally in PHATIC_QUESTION_GUARD. */
const MIN_SUBSTANTIVE_QUESTION_WORDS = 4;
/** Content words shorter than this are almost always function words that
 *  slipped past QUESTION_STOPWORDS (or short nouns too generic to prove a
 *  real topical match) — excluded from the fingerprint. */
const MIN_CONTENT_WORD_LENGTH = 4;

/** Split a line into sentence-like chunks so a single dialogue line that
 *  contains a question alongside other sentences ("Wait. Why is it open?")
 *  still gets each clause evaluated on its own punctuation. */
const SENTENCE_SPLIT_RE = /[^.!?]+[.!?]+|[^.!?]+$/g;

function splitSentences(text: string): string[] {
  return (text.match(SENTENCE_SPLIT_RE) ?? [text]).map(s => s.trim()).filter(Boolean);
}

function isSubstantiveQuestion(sentence: string): boolean {
  if (!sentence.endsWith('?')) return false;
  const bare = sentence.slice(0, -1).trim().toLowerCase().replace(/[^a-z0-9' ]/g, '');
  if (PHATIC_QUESTION_GUARD.has(bare)) return false;
  const words = bare.split(/\s+/).filter(Boolean);
  return words.length >= MIN_SUBSTANTIVE_QUESTION_WORDS;
}

/** Distinctive-word fingerprint for a line: lowercased, punctuation stripped,
 *  function words and short tokens removed. Used both for a question's own
 *  topic signature and for testing whether a later line "lexically addresses"
 *  it (per spec) via any shared word — intentionally permissive (a single
 *  shared distinctive word is enough), matching this file's lightweight
 *  lexicon-overlap style elsewhere (e.g. detectClueLifecycle's token reuse).
 *  This is an accepted heuristic gap, not exact NLU: no stemming, so
 *  "vanish"/"vanished" are treated as distinct words. */
function extractContentWords(text: string): Set<string> {
  const words = text.toLowerCase().replace(/[^a-z0-9' ]/g, ' ').split(/\s+/).filter(Boolean);
  return new Set(words.filter(w => w.length >= MIN_CONTENT_WORD_LENGTH && !QUESTION_STOPWORDS.has(w)));
}

function shareContentWord(a: Set<string>, b: Set<string>): boolean {
  for (const w of a) if (b.has(w)) return true;
  return false;
}

interface OpenQuestion {
  originScene: number;
  words: Set<string>;
}

interface QuestionLatencySignal {
  raisedByScene: number[];
  resolvedByScene: number[];
  resolvedSameSceneByScene: number[];
  unresolvedByScene: number[];
}

/** QUESTION-ANSWER LATENCY: walks the whole document once, line by line and
 *  scene by scene, in order. Every substantive dialogue question (per
 *  isSubstantiveQuestion) opens a fingerprinted thread. Every later line
 *  (action or dialogue, any scene) is first tested as an answer to the
 *  oldest still-open thread before it can raise a new question of its own —
 *  so a question sentence can never resolve itself, and the longest-waiting
 *  thread always gets credit first (deterministic, order-independent of
 *  Set/Map iteration). A thread resolved by a later line in the SAME scene it
 *  was raised in is tallied separately (resolvedSameSceneByScene) from one
 *  resolved in a later scene, so callers can tell "answered eventually" apart
 *  from "answered instantly." Anything never matched by the document's end is
 *  tallied as unresolved against the scene that raised it — mirroring
 *  detectClueLifecycle's "seeds never re-mentioned" convention. */
function detectQuestionLatency(scenes: SceneUnit[]): QuestionLatencySignal {
  const n = scenes.length;
  const raisedByScene = new Array<number>(n).fill(0);
  const resolvedByScene = new Array<number>(n).fill(0);
  const resolvedSameSceneByScene = new Array<number>(n).fill(0);
  const unresolvedByScene = new Array<number>(n).fill(0);

  // Cross-scene carryover: questions raised in an earlier scene that have not
  // yet found an answer anywhere.
  const open: OpenQuestion[] = [];

  for (const scene of scenes) {
    // Questions raised in THIS scene, still unmatched so far, in raise order —
    // kept apart from `open` purely so a same-scene answer can be told apart
    // from a carried-over one; both pools use the same OpenQuestion shape.
    const openThisScene: OpenQuestion[] = [];

    for (let i = 0; i < scene.orderedLines.length; i++) {
      const line = scene.orderedLines[i];
      const lineWords = extractContentWords(line);

      // Test this line as an answer BEFORE it can register any new question
      // of its own, so a question sentence never resolves itself. Cross-scene
      // carryovers are checked first — the longest-waiting thread in the
      // whole document gets credit before anything raised in this same scene.
      let matched = false;
      for (let k = 0; k < open.length; k++) {
        if (shareContentWord(open[k].words, lineWords)) {
          open.splice(k, 1);
          resolvedByScene[scene.sceneIdx]++;
          matched = true;
          break;
        }
      }
      if (!matched) {
        for (let k = 0; k < openThisScene.length; k++) {
          if (shareContentWord(openThisScene[k].words, lineWords)) {
            openThisScene.splice(k, 1);
            resolvedByScene[scene.sceneIdx]++;
            resolvedSameSceneByScene[scene.sceneIdx]++;
            break;
          }
        }
      }

      if (scene.orderedIsDialogue[i]) {
        for (const sentence of splitSentences(line)) {
          if (!isSubstantiveQuestion(sentence)) continue;
          raisedByScene[scene.sceneIdx]++;
          openThisScene.push({ originScene: scene.sceneIdx, words: extractContentWords(sentence) });
        }
      }
    }

    // Anything still open when the scene ends carries forward to later scenes.
    open.push(...openThisScene);
  }

  // Anything never matched anywhere in the document is permanently
  // unresolved, tallied against the scene that raised it.
  for (const q of open) unresolvedByScene[q.originScene]++;

  return { raisedByScene, resolvedByScene, resolvedSameSceneByScene, unresolvedByScene };
}

// ── Power-balance shifts (per-scene) — Wave 1186 ─────────────────────────────
// See the file-header "Wave 1186 additions" comment for the full tractability
// argument and distinctness rationale. This section is deliberately
// per-scene/independent (unlike question-latency's cross-scene carryover)
// since "who controls THIS scene's exchange" doesn't need any state from
// other scenes to compute.

/** Weights for the five deterministic control proxies below, tuned so no
 *  single signal can dominate the balance on its own (an interruption is
 *  worth more than a single question, since cutting someone off is a more
 *  overt control move than merely asking something) while still letting
 *  several weaker signals of the same kind outweigh a single strong one. */
const POWER_W_IMPERATIVE = 1;
const POWER_W_QUESTION = 0.8;
const POWER_W_ACCUSATORY = 1;
const POWER_W_INTERRUPT = 1.2;
/** How much weight the turn-length (word-count) dominance term gets in the
 *  final blend, relative to the four event-based proxies combined — kept a
 *  minority share so a single long monologue can't alone declare a "holder"
 *  without any of the other four control moves ever appearing. */
const POWER_DOMINANCE_BLEND = 0.3;
/** Deadband around 0 below which powerHolder reports null (no clear control)
 *  rather than forcing a coin-flip winner — same deadband role as
 *  EMOTIONAL_SHIFT_THRESHOLD above, scaled to this signal's -1..1 range. */
const POWER_HOLDER_DEADBAND = 0.15;
/** Minimum dyad-restricted dialogue lines for a scene to report ANY
 *  powerHolder/powerBalance signal at all — below this, two lines of small
 *  talk aren't enough evidence to call a control winner. */
const MIN_DYAD_DIALOGUE_LINES = 2;
/** Minimum dyad-restricted dialogue lines before powerFlipped is even
 *  evaluated — a flip claim needs at least 2 lines on each side of the
 *  scene's midpoint to mean anything. */
const MIN_DYAD_LINES_FOR_FLIP_SPLIT = 4;

/** Score one contiguous run of dyad-restricted dialogue lines for
 *  conversational control between `primary` and `secondary`, returning the
 *  signed balance (positive toward `primary`) and, past POWER_HOLDER_
 *  DEADBAND, which of the two holds it (or null). Shared by the full-scene
 *  computation and by the first-half/second-half flip comparison below so
 *  both read identical scoring logic — a flip is measured with the exact
 *  same yardstick as the full-scene holder, never a looser approximation. */
function scoreDyadLines(
  lines: DialogueLine[], primary: string, secondary: string,
): { holder: string | null; balance: number } {
  let scorePrimary = 0;
  let scoreSecondary = 0;
  let wordsPrimary = 0;
  let wordsSecondary = 0;

  for (let i = 0; i < lines.length; i++) {
    const { speaker, text } = lines[i];
    let lineScore = 0;
    if (isImperativeLine(text)) lineScore += POWER_W_IMPERATIVE;
    for (const sentence of splitSentences(text)) {
      if (isSubstantiveQuestion(sentence)) lineScore += POWER_W_QUESTION;
    }
    lineScore += countHits(text, ACCUSATORY_RE) * POWER_W_ACCUSATORY;
    // Interruption: the PREVIOUS dyad line (a different speaker) ends in an
    // em-dash — read as that speaker being cut off — and this line is the
    // one that cuts in. Credited to the interrupter, not the interrupted.
    if (i > 0) {
      const prev = lines[i - 1];
      if (prev.speaker !== speaker && prev.text.trim().endsWith('—')) {
        lineScore += POWER_W_INTERRUPT;
      }
    }
    const words = text.split(/\s+/).filter(Boolean).length;
    if (speaker === primary) { scorePrimary += lineScore; wordsPrimary += words; }
    else { scoreSecondary += lineScore; wordsSecondary += words; }
  }

  const totalWords = wordsPrimary + wordsSecondary;
  const dominanceRaw = totalWords > 0 ? (wordsPrimary - wordsSecondary) / totalWords : 0;
  const totalEventScore = scorePrimary + scoreSecondary;
  const eventBalance = totalEventScore > 0 ? (scorePrimary - scoreSecondary) / totalEventScore : 0;
  const raw = eventBalance * (1 - POWER_DOMINANCE_BLEND) + dominanceRaw * POWER_DOMINANCE_BLEND;
  const balance = clamp(Math.round(raw * 100) / 100, -1, 1);
  const holder = balance > POWER_HOLDER_DEADBAND ? primary : balance < -POWER_HOLDER_DEADBAND ? secondary : null;
  return { holder, balance };
}

interface PowerBalanceSignal {
  powerHolder: string | null;
  powerBalance: number;
  powerFlipped: boolean;
}

/** POWER BALANCE: identifies the scene's two most-speaking characters (by
 *  dialogue-line count; fewer than two speaking characters means there is no
 *  dyad to score), scores their dialogue-only exchange for conversational
 *  control via scoreDyadLines, and additionally splits the exchange in half
 *  to detect a mid-scene flip. `primary`/`secondary` are assigned by
 *  FIRST-APPEARANCE order (scene.characters), not by who speaks more, so the
 *  sign of powerBalance has a stable meaning independent of line count — a
 *  character who says less can still be the one running the scene. */
function detectPowerBalance(scene: SceneUnit): PowerBalanceSignal {
  const NONE: PowerBalanceSignal = { powerHolder: null, powerBalance: 0, powerFlipped: false };
  if (scene.characters.length < 2) return NONE;

  const lineCounts = new Map<string, number>();
  for (const d of scene.dialogueLines) {
    if (!d.speaker) continue;
    lineCounts.set(d.speaker, (lineCounts.get(d.speaker) ?? 0) + 1);
  }
  const speakingChars = scene.characters.filter(c => (lineCounts.get(c) ?? 0) > 0);
  if (speakingChars.length < 2) return NONE;

  const topTwo = new Set(
    [...speakingChars]
      .sort((a, b) => (lineCounts.get(b) ?? 0) - (lineCounts.get(a) ?? 0))
      .slice(0, 2),
  );
  // Re-order the top two by first-appearance (scene.characters is already in
  // that order) rather than by the line-count sort above, per this function's
  // documented sign convention.
  const [primary, secondary] = scene.characters.filter(c => topTwo.has(c));

  const dyadLines = scene.dialogueLines.filter(d => d.speaker === primary || d.speaker === secondary);
  if (dyadLines.length < MIN_DYAD_DIALOGUE_LINES) return NONE;

  const full = scoreDyadLines(dyadLines, primary, secondary);

  let powerFlipped = false;
  if (dyadLines.length >= MIN_DYAD_LINES_FOR_FLIP_SPLIT) {
    const mid = Math.ceil(dyadLines.length / 2);
    const firstHalf = scoreDyadLines(dyadLines.slice(0, mid), primary, secondary);
    const secondHalf = scoreDyadLines(dyadLines.slice(mid), primary, secondary);
    powerFlipped = firstHalf.holder !== null && secondHalf.holder !== null && firstHalf.holder !== secondHalf.holder;
  }

  return { powerHolder: full.holder, powerBalance: full.balance, powerFlipped };
}

// ── Speaking-character count (per-scene) — Wave 1190 ─────────────────────────
// See the file-header "Wave 1190 additions" comment for the prerequisite
// measurement, the rejected candidates, and the distinctness rationale
// against powerHolder/powerBalance. Deliberately per-scene/independent, like
// detectPowerBalance, since "how many voices does THIS scene have" needs no
// state from other scenes.

/** SPEAKING-CHARACTER COUNT: counts distinct dialogue speakers in the scene —
 *  0 when the scene has no dialogue at all, 1 when exactly one character
 *  speaks (a monologue/solo beat — nobody answers), 2+ for a genuine
 *  multi-voice exchange. Computed directly from scene.dialogueLines (the
 *  lines that actually carry a speaker), not scene.characters (which records
 *  a name the moment a character cue appears, even if no dialogue text ever
 *  follows it) — so a character cue with no spoken line never inflates the
 *  count. */
function detectSpeakingCharacterCount(scene: SceneUnit): number {
  const speakers = new Set<string>();
  for (const d of scene.dialogueLines) {
    if (d.speaker) speakers.add(d.speaker);
  }
  return speakers.size;
}

// ── Standalone lexicon-backed signals (Wave E1-c) — NOT wired to records ────
// Three candidate per-scene signals from the E1-c charter: betrayalTrustDelta,
// powerDynamicsIntensity, ironyMarkerCount. All three are genuinely new axes
// (none restates an existing signal — see each function's own distinctness
// note) and all three are cheap, honest, lexicon-only extractions in this
// file's established style. They are shipped as STANDALONE EXPORTED
// FUNCTIONS over an array of per-scene text, deliberately NOT wired onto
// ScreenplaySceneRecord or FountainAnalysis's return shape, for a concrete
// structural reason rather than an oversight:
//
//   1. Every new ScreenplaySceneRecord field requires a matching entry in
//      tests/core/record-parity.test.ts's compile-time parity matrix — that
//      matrix (and memory.ts, the record's other producer) belong to a
//      different file-ownership boundary than this wave's
//      (server/nvm/analyze/fountain-analyzer.ts + this file's own test file
//      only), so adding a field here would either go untested by the parity
//      harness or require editing a file this wave does not own.
//   2. FountainAnalysis (./types.ts) — the only other place a new value
//      could ride along on analyzeFountainText's return — exposes exactly
//      records/annotations/structure/characters/sceneCount/dialogueLineCount/
//      actionLineCount/wordCount (checked directly against that file): no
//      side-channel exists today for a signal that isn't a full record field,
//      and types.ts is likewise outside this wave's ownership.
//
// So: each function below takes `sceneTexts: string[]` — one already-
// assembled string per scene (a future wiring wave can pass
// sceneUnits[i].rawText, i.e. the exact per-scene text surface every other
// heuristic in this file already reads) — and returns one number per scene,
// fully deterministic and lexicon-driven, unit-tested in
// tests/core/fountain-analyzer.test.ts exactly like every other exported
// signal here. This leaves the extraction work done and verified, ready for
// a future wave (one that owns memory.ts + record-parity.test.ts's matrix)
// to wire a field in without re-deriving the lexicon or the heuristic.

/** Betrayal vocabulary — an act of trust violated, distinct from generic
 *  negative valence (NEGATIVE_VALENCE_WORDS' 'hate'/'anger'/'grief' etc. carry
 *  no notion of a BROKEN TRUST, just negative feeling) and from
 *  ACCUSATORY_TERMS (a direct second-person accusation is a power-balance
 *  control move, not necessarily about trust at all — "you always" carries no
 *  betrayal content). */
const BETRAYAL_WORDS = [
  'betray', 'betrays', 'betrayed', 'traitor', 'treachery', 'treacherous', 'backstab',
  'backstabbed', 'double-cross', 'doublecross', 'sold out', 'sell out', 'sells out', 'turncoat',
  'deceive', 'deceives', 'deceived', 'disloyal', 'disloyalty', 'informant', 'snitch', 'snitched',
];

/** Loyalty vocabulary — the counterweight half of the same betrayal/trust
 *  axis, so betrayalTrustDelta can swing toward LOYALTY (a scene actively
 *  reaffirming trust) rather than merely sitting at zero when betrayal words
 *  are simply absent, mirroring RELIEF_WORDS' role against DANGER_TENSION_WORDS. */
const LOYALTY_WORDS = [
  'loyal', 'loyalty', 'faithful', 'faithfulness', 'allegiance', 'vouch', 'vouches', 'vouched',
  'stand by', 'stands by', 'stood by', 'ride or die', 'trustworthy', 'steadfast', 'ally', 'allies',
];

const BETRAYAL_RE = buildLexiconRegex(BETRAYAL_WORDS);
const LOYALTY_RE = buildLexiconRegex(LOYALTY_WORDS);

/** BETRAYAL/TRUST DELTA (candidate signal, Wave E1-c): net betrayal-minus-
 *  loyalty lexicon hits per scene. Positive = betrayal-dominant, negative =
 *  loyalty-affirming, zero = neither present or perfectly balanced. Unlike
 *  relationshipShifts (detectRelationshipShifts above), which needs a
 *  two-character dialogue pair and reads generic valence, this reads a
 *  narrower, more specific vocabulary axis and works over ANY scene text
 *  (action included) regardless of how many characters speak. */
export function computeBetrayalSignals(sceneTexts: string[]): number[] {
  return sceneTexts.map(text => countHits(text, BETRAYAL_RE) - countHits(text, LOYALTY_RE));
}

/** Dominance/submission verbs — control expressed as a NAMED ACT ("commands",
 *  "obeys", "yields") anywhere in the scene text, distinct from
 *  IMPERATIVE_LEAD_TERMS (which fingerprints a conversational COMMAND PHRASE
 *  only at the START of a line, e.g. "Sit down") and from ACCUSATORY_TERMS
 *  (second-person blame, not a description of who controls whom). A scene
 *  can be dense with this vocabulary in narration ("She obeyed without
 *  question") with zero imperative-lead lines and zero accusatory phrases. */
const DOMINANCE_SUBMISSION_WORDS = [
  'command', 'commands', 'commanded', 'dominate', 'dominates', 'dominated', 'submit', 'submits',
  'submitted', 'obey', 'obeys', 'obeyed', 'overpower', 'overpowers', 'overpowered', 'yield',
  'yields', 'yielded', 'defer', 'defers', 'deferred', 'control', 'controls', 'controlled',
  'dictate', 'dictates', 'dictated', 'subjugate', 'subjugates', 'subjugated', 'overrule',
  'overrules', 'overruled',
];

const DOMINANCE_SUBMISSION_RE = buildLexiconRegex(DOMINANCE_SUBMISSION_WORDS);

/** POWER-DYNAMICS INTENSITY (candidate signal, Wave E1-c): count of
 *  dominance/submission verb hits per scene — a magnitude, not a signed
 *  balance (unlike detectPowerBalance's powerBalance, which is signed toward
 *  a specific character and requires a two-person dyad). This reads how
 *  CONTROL-CHARGED the scene's vocabulary is, at any dialogue-participant
 *  count (including zero-dialogue action-only scenes, e.g. "The guards
 *  overpowered him before he could run"), independent of who — if anyone —
 *  is identified as holding that control. */
export function computePowerDynamicsIntensity(sceneTexts: string[]): number[] {
  return sceneTexts.map(text => countHits(text, DOMINANCE_SUBMISSION_RE));
}

/** Verbal-irony markers — stock phrases that flag the GAP between what's said
 *  and what's meant/expected ("of course", "naturally" used sarcastically,
 *  "what could go wrong") rather than sincere statement. Distinct from every
 *  existing signal in this file: none of them track TONE-VS-CONTENT mismatch
 *  — MYSTERY_WORDS is about unanswered questions, DANGER_TENSION_WORDS about
 *  physical peril, POSITIVE/NEGATIVE_VALENCE about sincere emotional charge.
 *  This is a heuristic gap, not exact NLU (a sincere, non-ironic "of course"
 *  also matches — the same accepted lightweight-lexicon tradeoff this file
 *  makes elsewhere, e.g. TURN_VERB_WORDS matching a verb regardless of
 *  narrative weight). */
const IRONY_MARKER_TERMS = [
  'of course', 'naturally', 'what could go wrong', "wouldn't you know it", 'just my luck',
  'how ironic', 'go figure', 'just perfect', "isn't that just perfect", 'of all the luck',
  'as luck would have it',
];

const IRONY_MARKER_RE = buildLexiconRegex(IRONY_MARKER_TERMS);

/** IRONY MARKER COUNT (candidate signal, Wave E1-c): count of verbal-irony
 *  marker hits per scene. A cheap, honest lexical proxy — it cannot tell
 *  sincere "of course" from sarcastic "of course", so it is offered as a
 *  candidate count signal only, not a verdict on whether irony is genuinely
 *  present (the same honesty boundary detectRevelation/detectDramaticTurn
 *  draw around their own pattern-matching). */
export function computeIronyMarkerCount(sceneTexts: string[]): number[] {
  return sceneTexts.map(text => countHits(text, IRONY_MARKER_RE));
}

// ── Empty-input shortcut ──────────────────────────────────────────────────────

function emptyAnalysis(): FountainAnalysis {
  return {
    records: [],
    annotations: [],
    structure: analyzeStructure([], []),
    characters: [],
    sceneCount: 0,
    dialogueLineCount: 0,
    actionLineCount: 0,
    wordCount: 0,
  };
}

// ── Entry point ───────────────────────────────────────────────────────────────

/**
 * Analyze raw Fountain text into everything the 14-pass revision pipeline
 * needs, reconstructed heuristically from the text alone. Pure and
 * deterministic: no LLM, no I/O, no wall-clock reads.
 */
export function analyzeFountainText(fountain: string): FountainAnalysis {
  if (!fountain || !fountain.trim()) return emptyAnalysis();

  const blocks = parseFountain(fountain);
  const rawScenes = segmentScenes(blocks);
  const sceneCount = rawScenes.length;

  const sceneUnits: SceneUnit[] = rawScenes.map((rs, idx) => ({
    sceneIdx: idx,
    slug: rs.slug,
    ...extractSceneContent(rs.blocks),
  }));

  // ── Phase 1: independent per-scene signals ────────────────────────────────
  const suspenseDeltas = sceneUnits.map(s => detectSuspenseDelta(s.actionLines, s.dialogueLines));
  const curiosityDeltas = sceneUnits.map(s => detectCuriosityDelta(s.dialogueLines, s.actionLines));
  const dramaticTurns = sceneUnits.map(s => detectDramaticTurn(s.orderedLines));
  const revelations = sceneUnits.map(s => detectRevelation(s.orderedLines));
  const clocks = sceneUnits.map(s => detectClock(s.actionLines, s.dialogueLines));
  const emotionalShifts = sceneUnits.map(s => detectEmotionalShift(s.actionLines, s.dialogueLines));
  const visualBeatsList = sceneUnits.map(s => detectVisualBeats(s.actionLines));
  const dialogueHighlightsList = sceneUnits.map(s => detectDialogueHighlights(s.dialogueLines));
  const relationshipShiftsList = sceneUnits.map(s => detectRelationshipShifts(s.characters, s.dialogueLines));
  const powerBalances = sceneUnits.map(s => detectPowerBalance(s));
  const speakingCharacterCounts = sceneUnits.map(s => detectSpeakingCharacterCount(s));

  // ── Phase 2: cross-scene clue seeding/payoff ──────────────────────────────
  const { seedsByScene, payoffsByScene, unresolvedByScene } = detectClueLifecycle(sceneUnits);

  // ── Phase 2b: cross-scene question-answer latency (Wave 1182) ────────────
  const questionLatency = detectQuestionLatency(sceneUnits);

  // ── Phase 3: purpose (needs cross-scene position + peak-intensity context) ─
  const maxSuspense = suspenseDeltas.length > 0 ? Math.max(...suspenseDeltas) : 0;
  const purposes = sceneUnits.map((s, idx) => detectPurpose({
    sceneIdx: idx,
    sceneCount,
    suspenseDelta: suspenseDeltas[idx],
    maxSuspense,
    prevSuspense: idx > 0 ? suspenseDeltas[idx - 1] : 0,
    revelation: revelations[idx],
    clockRaised: clocks[idx].clockRaised,
    dramaticTurn: dramaticTurns[idx],
    dialogueHeavy: s.dialogueLines.length > s.actionLines.length,
  }));

  // ── Assemble records ───────────────────────────────────────────────────────
  const records: ScreenplaySceneRecord[] = sceneUnits.map((s, idx) => ({
    commitId: `fountain-scene-${idx}`,
    sceneIdx: idx,
    slug: s.slug,
    purpose: purposes[idx],
    dramaticTurn: dramaticTurns[idx],
    revelation: revelations[idx],
    emotionalShift: emotionalShifts[idx],
    visualBeats: visualBeatsList[idx],
    dialogueHighlights: dialogueHighlightsList[idx],
    unresolvedClues: unresolvedByScene[idx] ?? [],
    seededClueIds: seedsByScene[idx] ?? [],
    payoffSetupIds: payoffsByScene[idx] ?? [],
    clockRaised: clocks[idx].clockRaised,
    clockDelta: clocks[idx].clockDelta,
    suspenseDelta: suspenseDeltas[idx],
    curiosityDelta: curiosityDeltas[idx],
    relationshipShifts: relationshipShiftsList[idx],
    questionsRaised: questionLatency.raisedByScene[idx],
    questionsResolved: questionLatency.resolvedByScene[idx],
    questionsResolvedSameScene: questionLatency.resolvedSameSceneByScene[idx],
    questionsUnresolved: questionLatency.unresolvedByScene[idx],
    powerHolder: powerBalances[idx].powerHolder,
    powerBalance: powerBalances[idx].powerBalance,
    powerFlipped: powerBalances[idx].powerFlipped,
    speakingCharacterCount: speakingCharacterCounts[idx],
    createdAt: idx,
  }));

  const annotations: SceneAnnotation[] = records.map(r => ({
    sceneIdx: r.sceneIdx,
    purpose: r.purpose,
    dramaticTurn: r.dramaticTurn,
    revelation: r.revelation,
    emotionalShift: r.emotionalShift,
    clockRaised: r.clockRaised,
    openClues: r.unresolvedClues.length,
  }));

  // commits=[] — see file-header comment for why this is safe.
  const structure = analyzeStructure(records, []);

  // ── Document-level character ordering ─────────────────────────────────────
  // First-appearance order, stable-sorted by total dialogue-line count desc
  // (Array.prototype.sort is stable, so ties keep first-appearance order).
  const characterOrder: string[] = [];
  const characterSeen = new Set<string>();
  const dialogueCountByChar = new Map<string, number>();
  for (const s of sceneUnits) {
    for (const name of s.characters) {
      if (!characterSeen.has(name)) {
        characterSeen.add(name);
        characterOrder.push(name);
      }
    }
    for (const line of s.dialogueLines) {
      if (!line.speaker) continue;
      dialogueCountByChar.set(line.speaker, (dialogueCountByChar.get(line.speaker) ?? 0) + 1);
    }
  }
  const characters = [...characterOrder].sort(
    (a, b) => (dialogueCountByChar.get(b) ?? 0) - (dialogueCountByChar.get(a) ?? 0),
  );

  const dialogueLineCount = blocks.filter(b => b.type === 'dialogue' && b.text.trim() !== '').length;
  const actionLineCount = blocks.filter(b => b.type === 'action' && b.text.trim() !== '').length;
  const wordCount = fountain.split(/\s+/).filter(w => w.length > 0).length;

  return { records, annotations, structure, characters, sceneCount, dialogueLineCount, actionLineCount, wordCount };
}
