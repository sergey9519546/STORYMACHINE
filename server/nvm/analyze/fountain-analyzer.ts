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

import { parseFountain, type FountainBlock } from '../../../src/lib/fountain.ts';
import { analyzeStructure } from '../screenplay/structure.ts';
import type { ScreenplaySceneRecord, ScenePurpose } from '../screenplay/memory.ts';
import type { SceneAnnotation } from '../screenplay/compile.ts';
import type { FountainAnalysis } from './types.ts';

// ── Lexicons (module constants) ──────────────────────────────────────────────
// Kept compact and topic-scoped on purpose: each list backs exactly one signal,
// so tuning one heuristic never accidentally shifts another's behavior.

const POSITIVE_VALENCE_WORDS = [
  'love', 'loves', 'loved', 'happy', 'happiness', 'joy', 'joyful', 'laugh', 'laughs', 'laughing',
  'smile', 'smiles', 'smiling', 'relief', 'relieved', 'hope', 'hopeful', 'trust', 'trusts',
  'proud', 'grateful', 'gratitude', 'warmth', 'kind', 'kindness', 'gentle', 'delight', 'delighted',
  'embrace', 'embraces', 'reunite', 'reunited', 'forgive', 'forgives', 'forgave',
];

const NEGATIVE_VALENCE_WORDS = [
  'hate', 'hates', 'hated', 'angry', 'anger', 'furious', 'fear', 'afraid', 'scared', 'terror',
  'terrified', 'rage', 'betray', 'betrays', 'betrayed', 'cry', 'cries', 'crying', 'sob', 'sobs',
  'sobbing', 'pain', 'hurt', 'hurts', 'grief', 'despair', 'alone', 'lonely', 'cold', 'threat',
  'threatens', 'threatened', 'resent', 'resents', 'resentment',
];

/** Danger/physical-tension lexicon for suspenseDelta — distinct from the
 *  MYSTERY_WORDS lexicon (curiosity is about unanswered questions, not
 *  physical peril: a scene can be tense without being mysterious). */
const DANGER_TENSION_WORDS = [
  'gun', 'guns', 'knife', 'blade', 'blood', 'scream', 'screams', 'screaming', 'kill', 'kills',
  'killed', 'dead', 'death', 'danger', 'dangerous', 'run', 'runs', 'running', 'chase', 'chases',
  'chasing', 'trapped', 'dark', 'darkness', 'fire', 'explosion', 'attack', 'attacks', 'attacked',
  'hide', 'hides', 'hiding', 'gunfire', 'shot', 'shots', 'shoot', 'shoots', 'panic', 'panicked',
];

/** Calm/relief lexicon — lets suspenseDelta swing negative (a scene that
 *  actively de-escalates tension), not just sit at zero when danger words are
 *  simply absent. Distinct from POSITIVE_VALENCE_WORDS: relief is about
 *  physical/tension safety, positive valence is about emotional warmth — a
 *  scene can be safe without being warm (an empty, silent room). */
const RELIEF_WORDS = [
  'calm', 'calmly', 'peace', 'peaceful', 'safe', 'safety', 'rest', 'rests', 'resting', 'exhale',
  'exhales', 'exhaled', 'relief', 'relieved', 'quiet', 'stillness', 'settle', 'settles', 'settled',
];

/** Unanswered-question lexicon for curiosityDelta — distinct from
 *  DANGER_TENSION_WORDS (curiosity is cognitive/epistemic, not physical). */
const MYSTERY_WORDS = [
  'secret', 'secrets', 'why', 'who', 'hidden', 'hides', 'truth', 'mystery', 'mysterious', 'unknown',
  'disappear', 'disappears', 'disappeared', 'missing', 'clue', 'clues', 'strange', 'wonder',
  'wonders', 'wondering', 'suspicious', 'suspicion',
];

/** Turn-verb lexicon for dramaticTurn — verbs that mark an irreversible
 *  change of state (as opposed to mere description), which is what makes a
 *  line "the single dramatic thing that changes this scene" rather than
 *  scene-setting. */
const TURN_VERB_WORDS = [
  'betray', 'betrays', 'betrayed', 'discover', 'discovers', 'discovered', 'confess', 'confesses',
  'confessed', 'die', 'dies', 'died', 'leave', 'leaves', 'left', 'reveal', 'reveals', 'revealed',
  'kill', 'kills', 'killed', 'lie', 'lies', 'lied', 'forgive', 'forgives', 'forgave', 'sacrifice',
  'sacrifices', 'sacrificed', 'choose', 'chooses', 'chose', 'abandon', 'abandons', 'abandoned',
  'admit', 'admits', 'admitted',
];

/** Deadline/stakes lexicon for clockRaised/clockDelta. Includes multi-word
 *  phrases (e.g. "running out of time") — countHits' word-boundary regex
 *  handles these fine since \b only anchors the phrase's outer edges. */
const DEADLINE_TERMS = [
  'midnight', 'deadline', 'hours left', 'before dawn', 'running out of time', 'countdown',
  "time's up", 'minutes left', 'almost too late', 'out of time', 'sunrise', 'dawn breaks',
  "o'clock", 'ticking clock', 'final hour', 'last chance',
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
const CONCRETE_NOUNS = [
  'gun', 'knife', 'blood', 'car', 'door', 'window', 'photo', 'photograph', 'letter', 'phone',
  'box', 'key', 'mirror', 'fire', 'rain', 'road', 'table', 'chair', 'hand', 'hands', 'eyes',
  'ring', 'wound', 'scar', 'badge', 'wallet', 'watch', 'glass', 'bottle', 'rope', 'chain',
  'flashlight', 'candle', 'clock', 'map', 'envelope', 'suitcase', 'bag', 'coat', 'shoes', 'blade',
  'bullet', 'trigger', 'smoke', 'ash', 'shadow', 'floor', 'wall', 'stairs', 'bed', 'desk', 'drawer',
  'knife', 'truck', 'gunfire',
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
const ACCUSATORY_TERMS = [
  'you always', 'you never', 'your fault', 'you did this', 'you lied', 'you knew',
  'you ruined', 'you broke', 'you betrayed', 'you promised', 'how could you',
  'you left me', 'you abandoned', 'you used me',
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
const IMPERATIVE_LEAD_TERMS = [
  'sit down', 'get out', 'get up', 'get over here', 'get down', 'give me', 'tell me',
  'come here', 'come on', 'come with me', 'shut up', 'back off', 'let go', 'let me',
  'hands up', 'answer me', 'drop it', 'put it down', 'open the', 'close the', 'follow me',
  'watch it', "don't", 'move', 'run', 'explain', 'quiet', 'enough', 'stop', 'go', 'wait',
  'listen', 'look',
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

/** Cross-scene clue lifecycle: a distinctive token is SEEDED at its first
 *  occurrence. If it reappears at least 2 scenes later, that reappearance is
 *  its PAYOFF. A token that is never mentioned again anywhere (a true single
 *  occurrence) is an unresolved clue at its seed scene — "seeds never
 *  re-mentioned," per spec. A token that reappears too soon to count as a
 *  formal payoff (gap < 2 scenes) is seeded but neither paid off nor flagged
 *  unresolved — it was re-mentioned, just not distant enough to read as a
 *  deliberate callback; this is an accepted heuristic gap, not a bug. */
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
    const id = slugifyToken(token);
    const first = occ[0];
    const last = occ[occ.length - 1];
    (seedsByScene[first] ??= []).push(id);
    if (occ.length >= 2 && last - first >= 2) {
      (payoffsByScene[last] ??= []).push(id);
    } else if (occ.length === 1) {
      (unresolvedByScene[first] ??= []).push(id);
    }
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
