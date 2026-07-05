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
  const seenChar = new Set<string>();
  let currentSpeaker = '';

  for (const b of blocks) {
    const text = b.text.trim();
    if (!text) continue;

    if (b.type === 'action') {
      actionLines.push(text);
      orderedLines.push(text);
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
    }
    // parenthetical/transition/shot/section/synopsis/note/lyrics/centered/
    // boneyard carry no signal for these heuristics and are intentionally skipped.
  }

  return { actionLines, dialogueLines, characters, orderedLines, rawText: orderedLines.join('\n') };
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

  // ── Phase 2: cross-scene clue seeding/payoff ──────────────────────────────
  const { seedsByScene, payoffsByScene, unresolvedByScene } = detectClueLifecycle(sceneUnits);

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
