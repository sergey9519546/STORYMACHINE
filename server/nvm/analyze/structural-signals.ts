// Structural signals — dense, lexicon-free per-scene and per-report readings.
//
// ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
// The 2026-09-04 advice-quality audit measured the engine scoring a
// deliberately excellent 10-page script and a deliberately bad one at 76.0 vs
// 76.0, sharing 7 of 10 top notes. The mechanism it proved is not "not enough
// rules" — it is that nearly every note derives from four SPARSE LEXICON
// channels that read "absent" on the overwhelming majority of scenes:
// on the audit's own count over 42 scripts / 447 scenes, `emotionalShift` is
// 'neutral' on 92.8%, `clockRaised` fires on 7.4%, `revelation` on 6.9% (this
// module's own re-measurement over the 40 git-tracked scripts / 427 scenes
// reproduces that: 92.7%, 7.0%, 6.8%). A
// channel that is absent almost everywhere produces notes of the form "X is
// missing", and those notes fire on the excellent draft and the bad draft
// alike. Good writing carries reversal and urgency in BEHAVIOUR and FORM,
// which a word list cannot see.
//
// So this module adds no lexicon and no rule. It reads only the SHAPE of the
// document — how long scenes are relative to each other, how the talk/action
// mix moves scene to scene, how many people speak and which pairings are new,
// how long a speech turn runs, how varied the action prose is, whether a
// scene ends in a different register from the one it opened in. Every channel
// here is defined over counts of words, lines, sentences, turns and speakers.
// None of them can be defeated by choosing different vocabulary, and their
// whole point is DENSITY: measured over the 20 CC0 fixtures plus the 20
// calibration samples (427 scenes), the channels kept below are non-zero on
// 75-100% of scenes, against 6.8-7.3% for `revelation`/`emotionalShift` and
// 7.0% for `clockRaised` on those same scenes.
//
// Separation was measured on three sets with one statistic (rank-ordering
// count over cross-group pairs = Mann-Whitney AUC): the audit's own matched
// pair, the calibration corpus's strong-vs-troubled bands, and the six blind
// matched pairs in tests/fixtures/blind-pairs/ written by an author who had
// read none of this engine. Two channels order all three (or both real-prose
// sets perfectly); several registered priors are refuted, one channel reverses
// direction between sets, and the strongest channel carries an uncontrolled
// cast-size confound. That table, with its caveats, is the doc below.
//
// Two candidate channels were MEASURED AND DROPPED rather than shipped: a
// per-scene dialogue question-density channel (present on 14.7% of CC0 and
// 3.1% of calibration scenes — it fails the same density bar the lexicon
// channels fail) and a report-level mean-speech-turns aggregate (Spearman rho
// 0.87 against mean speakers per scene; it restates cast size). Both drops,
// and the per-signal separation numbers, are recorded with their evidence in
// docs/scoring/STRUCTURAL_SIGNALS_2026-09-04.md, reproducible via
// `node --experimental-strip-types scripts/measure-structural-signals.ts`.
//
// ── WHAT THIS IS NOT ─────────────────────────────────────────────────────────
// NOT wired into `health`, `verdict`, `grade`, `dimensions`, `topPriorities`,
// or any of the 14 revision passes. `doctor.ts` calls this once and hangs the
// result on the report as an additive, diagnostic-only key, exactly like
// `emotionalArc`, `antiSlop`, `silence` and `temporalConsistency` before it.
// Wiring ANY of these into the score is the owner's decision and its path is
// stated once, in that doc and in this comment, so nobody has to guess it:
// wire the candidate, run `npm run measure-real` on the local real corpus,
// compare AUC-24 against the >= 0.622 floor in `scripts/lib/auc.ts`, write the
// MEASUREMENT_RECEIPTS.md entry, then merge. Not before, and not by adding a
// rule that consumes this block.
//
// ── DETERMINISM ──────────────────────────────────────────────────────────────
// Pure: no LLM, no I/O, no clock. Same text in, byte-identical block out.
// Every emitted number is rounded to 4 decimals so JSON snapshots of two runs
// cannot differ in float noise.

import { parseFountain, type FountainBlock } from '../../../src/lib/fountain.ts';
import { normalizeScreenplay } from './screenplay-normalizer.ts';
import { fastWordCount } from '../../lib/string-utils.ts';

/** Scenes below this count cannot support the cross-scene channels (z-scores,
 *  scene-to-scene deltas, new-pairing events), so the block abstains rather
 *  than reporting a shape it cannot see. The per-scene rows are still emitted:
 *  they are true about each scene on its own. */
const MIN_SCENES_TO_SCORE = 2;

/** Fraction of a scene's ordered lines counted as its "opening" and its
 *  "closing" for the register-shift channel. A third each leaves a middle. */
const OPEN_CLOSE_BAND = 1 / 3;

export interface SceneStructuralSignals {
  sceneIdx: number;
  slug: string;
  /** Words in this scene's action + dialogue text (slugline excluded). */
  words: number;
  /** `words` as a z-score against this script's own per-scene word counts
   *  (population sd); 0 when every scene is the same length. */
  lengthZ: number;
  /** Dialogue words / (dialogue + action) words in this scene; 0 if empty. */
  dialogueShare: number;
  /** This scene's `dialogueShare` minus the previous scene's (signed); 0 at
   *  scene 0. A script that never changes its talk/action mix reads flat. */
  dialogueShareDelta: number;
  /** Speech turns: character cues in this scene that are actually followed by
   *  dialogue. Two consecutive cues for the same speaker count twice — an
   *  interrupted speaker really did take the floor twice. */
  speakerTurns: number;
  /** Dialogue words / `speakerTurns`; 0 when the scene has no turns. */
  meanTurnWords: number;
  /** Distinct speaking characters in this scene. */
  speakers: number;
  /** Unordered speaker pairs co-present in this scene that were co-present in
   *  no EARLIER scene. A new pairing is an event: two people who have not
   *  shared a scene now share one. */
  newPairs: number;
  /** Share of this scene's dialogue words spoken by the script's
   *  most-speaking character; 0 when the scene has no dialogue. */
  leadShare: number;
  /** sd/mean of this scene's ACTION sentence lengths in words (coefficient of
   *  variation); 0 when the scene has fewer than 2 action sentences. */
  actionSentenceCv: number;
  /** |mean words per line over the scene's first third − mean over its last
   *  third| / mean words per line over the scene. A scene that closes in a
   *  different register from the one it opened in is a scene that moved. */
  openCloseShift: number;
  /** True when the scene's first ordered line and its last are different
   *  modes (one action, one dialogue). DEGENERATE on the calibration corpus
   *  (true on 196/196 scenes — every sample opens on action and closes on a
   *  speech), but genuinely varying on the CC0 fixtures (64.1%). Kept, with
   *  that split stated, rather than deleted on one corpus's evidence. See
   *  docs/scoring/STRUCTURAL_SIGNALS_2026-09-04.md §3. */
  openCloseModeFlip: boolean;
}

export interface StructuralSignalsReport {
  /** False when the document has fewer than 2 scenes: the cross-scene
   *  aggregates below are not meaningful and are all 0. */
  scored: boolean;
  sceneCount: number;
  scenes: SceneStructuralSignals[];
  /** sd/mean of per-scene word counts — does this script vary scene length? */
  sceneLengthCv: number;
  /** Mean |dialogueShareDelta| over scenes 1..n-1 — how much the talk/action
   *  mix actually moves from scene to scene. */
  meanAbsDialogueShareDelta: number;
  /** max(dialogueShare) − min(dialogueShare) across scenes. */
  dialogueShareRange: number;
  /** Fraction of scenes that introduce at least one new speaker pairing. */
  newPairSceneRate: number;
  /** Position (0..1 of the script) of the last scene to introduce a new
   *  pairing; 0 when none ever does. */
  lastNewPairPosition: number;
  meanSpeakersPerScene: number;
  /** Mean words per speech turn across the whole script. */
  meanTurnWords: number;
  /** Mean per-scene `leadShare` over scenes that contain dialogue. */
  meanLeadShare: number;
  /** OLS slope of per-scene `leadShare` against normalized scene position
   *  (0..1), i.e. the lead's share at the end minus at the start along the
   *  fitted line. Signed: negative = the lead cedes the floor over the story. */
  leadShareSlope: number;
  /** Normalized Shannon entropy (0..1) of dialogue words across speaking
   *  characters — 1 = every character speaks equally, 0 = one voice only. */
  speakerEntropy: number;
  /** sd/mean of ALL action sentence lengths document-wide. */
  actionSentenceCvOverall: number;
  meanOpenCloseShift: number;
  /** Fraction of scenes whose first and last ordered lines differ in mode. */
  openCloseModeFlipRate: number;
}

/** One-line definition per emitted channel, plus the craft direction (if any)
 *  registered BEFORE the separation measurement in
 *  docs/scoring/STRUCTURAL_SIGNALS_2026-09-04.md. `direction: 'none'` means no
 *  defensible a-priori prior exists — such a channel is reported descriptively
 *  and is NOT scored as a hit or a miss, which is what keeps the measurement
 *  from becoming direction-fishing after the fact. Exported so the doc, the
 *  tests and the measurement script all read one list rather than three
 *  copies that drift. */
export const STRUCTURAL_SIGNAL_SPECS: ReadonlyArray<{
  key: keyof StructuralSignalsReport;
  definition: string;
  direction: 'higher' | 'lower' | 'none';
}> = [
  { key: 'sceneLengthCv', definition: 'sd/mean of per-scene word counts', direction: 'higher' },
  { key: 'meanAbsDialogueShareDelta', definition: 'mean scene-to-scene absolute change in dialogue-word share', direction: 'higher' },
  { key: 'dialogueShareRange', definition: 'max minus min per-scene dialogue-word share', direction: 'higher' },
  { key: 'newPairSceneRate', definition: 'fraction of scenes introducing a speaker pairing never co-present before', direction: 'higher' },
  { key: 'lastNewPairPosition', definition: 'normalized position of the last scene to introduce a new pairing', direction: 'none' },
  { key: 'meanSpeakersPerScene', definition: 'mean distinct speaking characters per scene', direction: 'none' },
  { key: 'meanTurnWords', definition: 'mean words per speech turn', direction: 'lower' },
  { key: 'meanLeadShare', definition: "mean per-scene share of dialogue words spoken by the script's lead", direction: 'none' },
  { key: 'leadShareSlope', definition: "OLS slope of the lead's per-scene dialogue share against scene position", direction: 'none' },
  { key: 'speakerEntropy', definition: 'normalized Shannon entropy of dialogue words across speakers', direction: 'none' },
  { key: 'actionSentenceCvOverall', definition: 'sd/mean of action-sentence lengths document-wide', direction: 'higher' },
  { key: 'meanOpenCloseShift', definition: 'mean normalized line-length difference between a scene’s first third and last third', direction: 'higher' },
  { key: 'openCloseModeFlipRate', definition: 'fraction of scenes whose first and last line differ in mode (action vs dialogue)', direction: 'none' },
];

// ── small numeric helpers ───────────────────────────────────────────────────

/** 4 decimals — enough resolution to separate scripts, few enough that two
 *  runs can never disagree on a trailing float bit. */
function r4(n: number): number {
  return Number.isFinite(n) ? Math.round(n * 10_000) / 10_000 : 0;
}

function mean(xs: number[]): number {
  return xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
}

/** Population standard deviation (the whole script IS the population here —
 *  there is no sampling from a larger set of its own scenes). */
function sd(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map(x => (x - m) ** 2)));
}

/** Coefficient of variation, guarded: 0 when there is nothing to vary. */
function cv(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  if (m <= 0) return 0;
  return sd(xs) / m;
}

/** Split prose into sentences on terminal punctuation. A trailing fragment
 *  with no terminator still counts as a sentence — screenplay action is full
 *  of them, and a one-word fragment IS the rhythm this channel measures. */
function splitIntoSentences(text: string): string[] {
  const out: string[] = [];
  for (const m of text.match(/[^.!?…]+[.!?…]*/g) ?? []) {
    const t = m.trim();
    if (t) out.push(t);
  }
  return out;
}

/** Strip Fountain cue decorations down to the bare name. Re-derived rather
 *  than imported: fountain-analyzer.ts's copy is private, and this module
 *  deliberately does not import that always-scoring file (same posture
 *  agency-signal.ts and reversal-detection.ts already take). */
function bareSpeakerName(raw: string): string {
  return raw
    .replace(/\^\s*$/, '')
    .replace(/\(\s*[^)]*\s*\)/g, '')
    .trim()
    .toUpperCase();
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}::${b}` : `${b}::${a}`;
}

// ── scene extraction ────────────────────────────────────────────────────────

interface SceneShape {
  slug: string;
  /** Action + dialogue text in document order, with its mode. */
  orderedLines: Array<{ text: string; dialogue: boolean }>;
  actionText: string[];
  dialogue: Array<{ speaker: string; text: string }>;
  /** Speech turns: cues actually followed by dialogue, in order. */
  turns: string[];
}

/** Segment normalized Fountain into per-scene shapes on scene_heading
 *  boundaries, folding any pre-heading preamble into the first scene — the
 *  same segmentation contract fountain-analyzer.ts uses, so `sceneCount` here
 *  matches `ScriptDoctorReport.sceneCount` on every non-truncated script. */
function shapeScenes(blocks: FountainBlock[]): SceneShape[] {
  const headingIdxs: number[] = [];
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].type === 'scene_heading') headingIdxs.push(i);
  }
  if (headingIdxs.length === 0) return [];

  const groups: Array<{ slug: string; blocks: FountainBlock[] }> = [];
  for (let h = 0; h < headingIdxs.length; h++) {
    const start = headingIdxs[h];
    const end = h + 1 < headingIdxs.length ? headingIdxs[h + 1] : blocks.length;
    groups.push({ slug: blocks[start].text.trim(), blocks: blocks.slice(start + 1, end) });
  }
  if (headingIdxs[0] > 0) {
    groups[0] = { ...groups[0], blocks: [...blocks.slice(0, headingIdxs[0]), ...groups[0].blocks] };
  }

  return groups.map(g => {
    const shape: SceneShape = {
      slug: g.slug,
      orderedLines: [],
      actionText: [],
      dialogue: [],
      turns: [],
    };
    let currentSpeaker = '';
    let turnOpen = false; // a cue is waiting for its first dialogue block

    for (const b of g.blocks) {
      const text = b.text.trim();
      if (!text) continue;
      if (b.type === 'action') {
        shape.actionText.push(text);
        shape.orderedLines.push({ text, dialogue: false });
      } else if (b.type === 'character' || b.type === 'dual_dialogue') {
        currentSpeaker = bareSpeakerName(text);
        turnOpen = currentSpeaker.length > 0;
      } else if (b.type === 'dialogue') {
        shape.dialogue.push({ speaker: currentSpeaker, text });
        shape.orderedLines.push({ text, dialogue: true });
        if (turnOpen) {
          shape.turns.push(currentSpeaker);
          turnOpen = false;
        }
      }
      // parenthetical / transition / shot / section / synopsis / note / lyrics
      // / centered / boneyard carry no structural count for these channels.
    }
    return shape;
  });
}

// ── entry point ─────────────────────────────────────────────────────────────

function emptyReport(): StructuralSignalsReport {
  return {
    scored: false,
    sceneCount: 0,
    scenes: [],
    sceneLengthCv: 0,
    meanAbsDialogueShareDelta: 0,
    dialogueShareRange: 0,
    newPairSceneRate: 0,
    lastNewPairPosition: 0,
    meanSpeakersPerScene: 0,
    meanTurnWords: 0,
    meanLeadShare: 0,
    leadShareSlope: 0,
    speakerEntropy: 0,
    actionSentenceCvOverall: 0,
    meanOpenCloseShift: 0,
    openCloseModeFlipRate: 0,
  };
}

/**
 * Compute the structural-signal block for a whole Fountain document.
 *
 * Pure and deterministic. Diagnostic only: nothing here reaches `health`,
 * `verdict`, `grade` or any revision pass — see this file's header for the
 * exact path an owner would take to wire any one of these channels into the
 * score.
 */
export function computeStructuralSignals(fountain: string): StructuralSignalsReport {
  if (!fountain || !fountain.trim()) return emptyReport();

  const scenes = shapeScenes(parseFountain(normalizeScreenplay(fountain)));
  if (scenes.length === 0) return emptyReport();

  // ── Document-level pre-pass: who the lead is, in dialogue words ──────────
  const dialogueWordsByChar = new Map<string, number>();
  for (const s of scenes) {
    for (const d of s.dialogue) {
      if (!d.speaker) continue;
      dialogueWordsByChar.set(d.speaker, (dialogueWordsByChar.get(d.speaker) ?? 0) + fastWordCount(d.text));
    }
  }
  // Ties resolve to the first character seen, so the lead is a deterministic
  // function of the text and not of Map iteration luck.
  let lead = '';
  let leadWords = -1;
  for (const [name, words] of dialogueWordsByChar) {
    if (words > leadWords) {
      lead = name;
      leadWords = words;
    }
  }

  // ── Per-scene pass ───────────────────────────────────────────────────────
  const seenPairs = new Set<string>();
  const sceneWords: number[] = [];
  const rows: Array<Omit<SceneStructuralSignals, 'lengthZ' | 'dialogueShareDelta'>> = [];
  const allActionSentenceLens: number[] = [];
  let totalTurns = 0;
  let totalDialogueWords = 0;

  scenes.forEach((s, idx) => {
    const actionWords = s.actionText.reduce((n, t) => n + fastWordCount(t), 0);
    const dialogueWords = s.dialogue.reduce((n, d) => n + fastWordCount(d.text), 0);
    const words = actionWords + dialogueWords;
    sceneWords.push(words);
    totalDialogueWords += dialogueWords;
    totalTurns += s.turns.length;

    const dialogueShare = words > 0 ? dialogueWords / words : 0;

    // Action-sentence length variation.
    const sceneActionSentenceLens: number[] = [];
    for (const line of s.actionText) {
      for (const sent of splitIntoSentences(line)) {
        const n = fastWordCount(sent);
        if (n > 0) {
          sceneActionSentenceLens.push(n);
          allActionSentenceLens.push(n);
        }
      }
    }

    // Speakers and new pairings.
    const speakerOrder: string[] = [];
    const speakerSeen = new Set<string>();
    for (const d of s.dialogue) {
      if (!d.speaker || speakerSeen.has(d.speaker)) continue;
      speakerSeen.add(d.speaker);
      speakerOrder.push(d.speaker);
    }
    let newPairs = 0;
    for (let a = 0; a < speakerOrder.length; a++) {
      for (let b = a + 1; b < speakerOrder.length; b++) {
        const key = pairKey(speakerOrder[a], speakerOrder[b]);
        if (!seenPairs.has(key)) {
          seenPairs.add(key);
          newPairs++;
        }
      }
    }

    const leadSceneWords = lead
      ? s.dialogue.reduce((n, d) => (d.speaker === lead ? n + fastWordCount(d.text) : n), 0)
      : 0;

    // Opening-vs-closing register: line lengths, not vocabulary.
    let openCloseShift = 0;
    let openCloseModeFlip = false;
    if (s.orderedLines.length >= 2) {
      const lineWords = s.orderedLines.map(l => fastWordCount(l.text));
      const band = Math.max(1, Math.floor(s.orderedLines.length * OPEN_CLOSE_BAND));
      const openMean = mean(lineWords.slice(0, band));
      const closeMean = mean(lineWords.slice(s.orderedLines.length - band));
      const overall = mean(lineWords);
      openCloseShift = overall > 0 ? Math.abs(openMean - closeMean) / overall : 0;
      openCloseModeFlip = s.orderedLines[0].dialogue !== s.orderedLines[s.orderedLines.length - 1].dialogue;
    }

    rows.push({
      sceneIdx: idx,
      slug: s.slug,
      words,
      dialogueShare: r4(dialogueShare),
      speakerTurns: s.turns.length,
      meanTurnWords: r4(s.turns.length > 0 ? dialogueWords / s.turns.length : 0),
      speakers: speakerOrder.length,
      newPairs,
      leadShare: r4(dialogueWords > 0 ? leadSceneWords / dialogueWords : 0),
      actionSentenceCv: r4(cv(sceneActionSentenceLens)),
      openCloseShift: r4(openCloseShift),
      openCloseModeFlip,
    });
  });

  // ── Cross-scene pass ─────────────────────────────────────────────────────
  const wordsMean = mean(sceneWords);
  const wordsSd = sd(sceneWords);
  const sceneRows: SceneStructuralSignals[] = rows.map((row, idx) => ({
    ...row,
    lengthZ: r4(wordsSd > 0 ? (row.words - wordsMean) / wordsSd : 0),
    dialogueShareDelta: r4(idx === 0 ? 0 : row.dialogueShare - rows[idx - 1].dialogueShare),
  }));

  const shares = sceneRows.map(s => s.dialogueShare);
  const absDeltas = sceneRows.slice(1).map(s => Math.abs(s.dialogueShareDelta));
  const newPairScenes = sceneRows.filter(s => s.newPairs > 0).length;
  const lastNewPairIdx = sceneRows.reduce((acc, s) => (s.newPairs > 0 ? s.sceneIdx : acc), -1);

  // Lead-share trajectory: OLS slope against normalized position, over scenes
  // that actually contain dialogue (a wordless scene has no share to report,
  // and feeding it a 0 would fabricate a plunge the writer did not write).
  const leadPoints = sceneRows
    .filter((_, idx) => scenes[idx].dialogue.length > 0)
    .map(s => ({ x: sceneRows.length > 1 ? s.sceneIdx / (sceneRows.length - 1) : 0, y: s.leadShare }));
  let leadShareSlope = 0;
  if (leadPoints.length >= 2) {
    const mx = mean(leadPoints.map(p => p.x));
    const my = mean(leadPoints.map(p => p.y));
    let num = 0;
    let den = 0;
    for (const p of leadPoints) {
      num += (p.x - mx) * (p.y - my);
      den += (p.x - mx) ** 2;
    }
    leadShareSlope = den > 0 ? num / den : 0;
  }

  // Speaker entropy over dialogue words.
  let speakerEntropy = 0;
  const charTotals = [...dialogueWordsByChar.values()].filter(n => n > 0);
  if (charTotals.length > 1) {
    const total = charTotals.reduce((a, b) => a + b, 0);
    let h = 0;
    for (const n of charTotals) {
      const p = n / total;
      h -= p * Math.log2(p);
    }
    speakerEntropy = h / Math.log2(charTotals.length);
  }

  const dialogueScenes = leadPoints.length;

  return {
    scored: scenes.length >= MIN_SCENES_TO_SCORE,
    sceneCount: scenes.length,
    scenes: sceneRows,
    sceneLengthCv: r4(cv(sceneWords)),
    meanAbsDialogueShareDelta: r4(mean(absDeltas)),
    dialogueShareRange: r4(shares.length > 0 ? Math.max(...shares) - Math.min(...shares) : 0),
    newPairSceneRate: r4(newPairScenes / sceneRows.length),
    lastNewPairPosition: r4(
      lastNewPairIdx >= 0 && sceneRows.length > 1 ? lastNewPairIdx / (sceneRows.length - 1) : 0,
    ),
    meanSpeakersPerScene: r4(mean(sceneRows.map(s => s.speakers))),
    meanTurnWords: r4(totalTurns > 0 ? totalDialogueWords / totalTurns : 0),
    meanLeadShare: r4(dialogueScenes > 0 ? mean(leadPoints.map(p => p.y)) : 0),
    leadShareSlope: r4(leadShareSlope),
    speakerEntropy: r4(speakerEntropy),
    actionSentenceCvOverall: r4(cv(allActionSentenceLens)),
    meanOpenCloseShift: r4(mean(sceneRows.map(s => s.openCloseShift))),
    openCloseModeFlipRate: r4(sceneRows.filter(s => s.openCloseModeFlip).length / sceneRows.length),
  };
}
