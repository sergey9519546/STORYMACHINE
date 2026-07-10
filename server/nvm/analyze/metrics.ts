// server/nvm/analyze/metrics.ts — Deterministic Narrative Metrics (blueprint
// §27). Pure functions over ScreenplaySceneRecord[] — no LLM, no
// Math.random(), no Date.now() in any computation path (the keyless
// deterministic core is the product's front door, per CLAUDE.md). Records
// come from either producer (screenplay/memory.ts's ops-derived path or
// analyze/fountain-analyzer.ts's text-derived path) — this module reads the
// shared ScreenplaySceneRecord contract only, read-only, and never assumes a
// field beyond what ARCHITECTURE.md's "two record producers" section
// documents as commonly populated. Every optional field (relationshipShifts,
// questionsRaised/Resolved/ResolvedSameScene/Unresolved, powerHolder/
// powerBalance/powerFlipped) is treated as absent-means-zero/null, matching
// the precedent set at each field's declaration in screenplay/memory.ts.
//
// Per-scene metrics:
//   pivotStrength              (0-100)       — composite reversal signal
//   cliffhangerStrength        (0-100)       — how strongly the scene leaves
//                                              threads open, most meaningful
//                                              read at the scene-final and
//                                              script-final positions
//   twistImpact                (0-100)       — revelation recontextualization
//   surpriseProxy               (0-100)       — rarity of this scene's signal
//                                              combination vs the RUNNING
//                                              distribution of every earlier
//                                              scene (a proxy, NOT a true
//                                              -logP information measure —
//                                              see its own header for why)
//   informationAsymmetryStrength (0-100)      — audience-shown-vs-character-
//                                              acted-on gap proxy
//   pacingFit                   (0-100 | null) — measured vs. expected
//                                              tension at this scene's
//                                              position on the session's
//                                              configured emotional_arc;
//                                              null when no arc is
//                                              configured (honest, not a
//                                              fabricated neutral score)
//
// Whole-script metrics:
//   suspenseEntropy      (0-100)        — rise-and-fall shape reward
//   momentumConsistency  (0-100)        — absence of dead stretches
//   finalCliffhangerStrength (0-100)    — last scene's cliffhangerStrength
//   pacingFit            (0-100 | null) — mean per-scene pacingFit; null
//                                         under the same honest condition
//   narrativeCohesion    (0-100)        — inverse orphan-scene rate
//   emotionalImpactRange {peak, spread} — magnitude spread across the script
//   tensionMeasures      {lexical, structural, rhythmic, asymmetric} — the
//                                         same "how much tension" question
//                                         read four independent ways (see
//                                         its own header — NOT all four are
//                                         normalized to the same 0-100 scale,
//                                         each field documents its own range)
//
// Deliberately SKIPPED (named per the exhaustiveness bar, not silently
// dropped):
//   subtextGapProxy    — true subtext is a SECOND, divergent meaning beneath
//     a line of dialogue. ScreenplaySceneRecord's dialogueHighlights/
//     visualBeats/revelation fields tell us which CHANNEL delivered a fact
//     (told vs. shown/witnessed), never whether what was told conceals a
//     meaning other than its surface content — that would require a
//     per-utterance (surface-text, true-intent) pair this record shape does
//     not carry anywhere. A told/shown channel-balance ratio is measurable,
//     but labeling that "subtext" would be dishonest relabeling, not a
//     proxy, so it is skipped rather than shipped under a misleading name.
//   thematicResonance  — the ops model has real per-scene theme-argument
//     signal (StoryOp's ADVANCE_THEME_ARGUMENT: claimId + a 5-way ThemeMove),
//     but screenplay/memory.ts (the only record builder, out of this
//     module's file-ownership boundary) folds its mere PRESENCE into the
//     derived `purpose` enum ('turning_point') and discards claimId/move —
//     exactly the continuity data (which claim, which move, sustained across
//     how many scenes) a resonance metric needs. Nothing in
//     ScreenplaySceneRecord recovers it, and this module may not add a field
//     to memory.ts to expose it (out of scope for agent B1-c). Skipped —
//     genuinely unsupported by the current record contract.
//   psychologicalRealism — per-character trait modeling (DarkTriad/BigFive/
//     attachment style/defense mechanisms) lives in server/engine/types.ts's
//     CharacterSheet, a completely different subsystem with no
//     representation anywhere in ScreenplaySceneRecord. There is no
//     defensible proxy for it in this record shape at all. Skipped.
//
// Every formula's inputs/range/craft meaning are documented at its own
// function. All numeric composites are built from clamp01()-guarded
// fractions so no formula can produce NaN or escape its documented range,
// even on empty/all-zero/single-scene input — see the guard notes inline.
// Stability: every metric that reads cross-scene or positional information
// (twistImpact, surpriseProxy, suspenseEntropy, momentumConsistency,
// narrativeCohesion, emotionalImpactRange, tensionMeasures, pacingFit) works
// off a COPY of the input sorted ascending by sceneIdx before computing
// anything position-dependent — the result is therefore stable under
// permutation of the INPUT ARRAY's order (same set of records, any
// insertion order, same output), which is the sense in which "stable under
// record-order permutation" is meaningful here; sceneIdx order itself is the
// narrative order and is never invariant to permutation by design (that
// would defeat the metric).

import type { ScreenplaySceneRecord } from '../screenplay/memory.ts';
import type { EmotionalArc } from '../../engine/types.ts';
import { expectedTensionAt } from '../../lib/structure-presets.ts';

// ── Small numeric guards ─────────────────────────────────────────────────────

/** Clamp to [0, 1], mapping NaN/undefined defensively to 0 so a malformed
 *  upstream field (e.g. a non-finite delta slipping through a hand-built
 *  fixture) can never propagate into a metric as NaN. */
function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/** Divide, guarding a zero (or non-finite) denominator to a safe fallback
 *  instead of NaN/Infinity — every ratio in this module goes through this. */
function safeDiv(numerator: number, denominator: number, fallback = 0): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return fallback;
  return numerator / denominator;
}

/** Round a [0,1] fraction to an integer 0-100 score. */
function toScore(fraction: number): number {
  return Math.round(clamp01(fraction) * 100);
}

// ── Content-word extraction (local to this module — twistImpact's
//    revelation/centrality overlap is the only consumer, so it is not worth
//    coupling to fountain-analyzer.ts's own extractContentWords, which is
//    unexported and scoped to question-latency's lexicon) ───────────────────

/** Function words stripped before overlap comparisons. Deliberately a small,
 *  generic English stopword list (not scoped to questions or clues like
 *  fountain-analyzer.ts's QUESTION_STOPWORDS/CLUE_FUNCTION_STOPWORDS) since
 *  twistImpact compares arbitrary narrative prose, not dialogue questions or
 *  quoted clue phrases. */
const METRIC_STOPWORDS = new Set([
  'the', 'and', 'that', 'this', 'with', 'from', 'have', 'has', 'had', 'was',
  'were', 'been', 'are', 'not', 'but', 'for', 'you', 'your', 'they', 'them',
  'his', 'her', 'she', 'him', 'who', 'what', 'when', 'where', 'why', 'how',
  'will', 'would', 'could', 'should', 'about', 'into', 'over', 'after',
  'before', 'then', 'than', 'there', 'their', 'here', 'just', 'only', 'also',
  'still', 'never', 'ever', 'because', 'while', 'again', 'more', 'most',
  'some', 'such', 'each', 'other', 'these', 'those', 'itself', 'himself',
  'herself', 'being', 'does', 'did', 'doing', 'said', 'says', 'into', 'onto',
]);

/** Content words shorter than this are almost always function words that
 *  slipped past METRIC_STOPWORDS (or too generic to prove overlap on their
 *  own) — same threshold fountain-analyzer.ts uses for its own lexicons. */
const MIN_METRIC_WORD_LENGTH = 4;

/** Lowercase, tokenize, and strip stopwords/short tokens. Pure string→Set
 *  transform, deterministic for identical input. */
function extractMetricContentWords(text: string): Set<string> {
  const words = (text.toLowerCase().match(/[a-z']+/g) ?? []);
  return new Set(words.filter(w => w.length >= MIN_METRIC_WORD_LENGTH && !METRIC_STOPWORDS.has(w)));
}

/** All narrative-prose text this module ever compares a scene by: the
 *  dramatic turn, revelation (if any), told dialogue highlights, and visual
 *  beats. Deliberately excludes `slug` (a location label, not narrative
 *  content) and `unresolvedClues`/id fields (identifiers, not prose). */
function sceneCorpusText(record: ScreenplaySceneRecord): string {
  const parts: string[] = [record.dramaticTurn ?? ''];
  if (record.revelation) parts.push(record.revelation);
  if (record.dialogueHighlights) parts.push(...record.dialogueHighlights);
  if (record.visualBeats) parts.push(...record.visualBeats);
  return parts.join(' ');
}

// ── Shared: sort a copy of the records ascending by sceneIdx ─────────────────

function sortedBySceneIdx(records: ScreenplaySceneRecord[]): ScreenplaySceneRecord[] {
  return [...records].sort((a, b) => a.sceneIdx - b.sceneIdx);
}

// ── pivotStrength (per scene, 0-100) ─────────────────────────────────────────
//
// Inputs (all read from the scene's OWN record only — no cross-scene lookup,
// so this metric is trivially stable under any reordering of sibling
// records): emotionalShift, powerFlipped, relationshipShifts, questionsRaised
// + questionsResolved.
//
// Four equally-weighted components, each normalized to [0,1] and averaged:
//   1. emotionComponent      — 1 when emotionalShift is 'positive'/'negative'
//      (a real shift happened), 0 when 'neutral'. The field is categorical,
//      not scalar, so presence-of-shift IS the magnitude proxy the record
//      exposes.
//   2. powerComponent        — 1 when powerFlipped is true (the scene's
//      control of the exchange changed hands), else 0. powerHolder is read
//      only implicitly: powerFlipped is already false/undefined whenever
//      powerHolder was null for lack of a judgeable dyad, so no separate
//      null-check is needed to avoid double-counting an ungraded scene.
//   3. relationshipComponent — count of relationshipShifts (not magnitude —
//      "relationship shifts count" per spec), saturating at
//      RELATIONSHIP_SHIFT_SATURATION (a scene that reshapes 3+ relationship
//      pairs at once is already reading as a maximal ensemble reversal;
//      more than that doesn't make the scene "more of a pivot").
//   4. questionComponent     — (questionsResolved + questionsRaised),
//      saturating at QUESTION_STATE_SATURATION (4): a scene that both closes
//      out and opens several dialogue threads is reshaping what the
//      audience is owed, which is exactly the "question-state change" this
//      channel measures.
//
// High (near 100): the scene flips emotional valence, control of the
// exchange, several relationships, and the open-question ledger all at
// once — an unambiguous turning point. Low (near 0): none of the four
// signals fired — a flat, static beat. All-zero/absent-field input safely
// yields 0, never NaN.
const RELATIONSHIP_SHIFT_SATURATION = 3;
const QUESTION_STATE_SATURATION = 4;
const PIVOT_COMPONENT_WEIGHT = 0.25;

export function computePivotStrength(record: ScreenplaySceneRecord): number {
  const emotionComponent = record.emotionalShift === 'neutral' ? 0 : 1;
  const powerComponent = record.powerFlipped === true ? 1 : 0;
  const relationshipComponent = clamp01(
    safeDiv(record.relationshipShifts?.length ?? 0, RELATIONSHIP_SHIFT_SATURATION),
  );
  const questionComponent = clamp01(
    safeDiv((record.questionsRaised ?? 0) + (record.questionsResolved ?? 0), QUESTION_STATE_SATURATION),
  );
  const composite =
    PIVOT_COMPONENT_WEIGHT * emotionComponent +
    PIVOT_COMPONENT_WEIGHT * powerComponent +
    PIVOT_COMPONENT_WEIGHT * relationshipComponent +
    PIVOT_COMPONENT_WEIGHT * questionComponent;
  return toScore(composite);
}

// ── cliffhangerStrength (per scene, 0-100) ───────────────────────────────────
//
// Inputs (again all self-contained to the scene's own record — the analyzer
// already carries the cross-scene bookkeeping into questionsUnresolved, so
// no second array pass is needed here): questionsRaised,
// questionsResolvedSameScene, suspenseDelta, unresolvedClues, clockRaised,
// questionsUnresolved.
//
// Four positive components (equally weighted, summed) minus a confusion
// penalty:
//   1. carriedOpenComponent  — (questionsRaised - questionsResolvedSameScene),
//      i.e. threads this scene raised that did NOT get closed before the
//      scene ended — the literal "open questions carried out of the scene."
//      Always >= 0 given detectQuestionLatency's invariant
//      (resolvedSameScene <= raised, see fountain-analyzer.ts's header), but
//      clamped defensively for hand-built fixtures that violate it.
//   2. suspensePositiveComponent — max(0, suspenseDelta), i.e. only a RISE in
//      suspense reads as cliffhanger fuel; a scene that closes suspense down
//      contributes 0 here (not a negative penalty — that's what
//      confusionPenalty is for, on a different axis).
//   3. cluePressureComponent — unresolvedClues.length: clues seeded but not
//      yet paid off are unresolved narrative pressure carried forward.
//   4. clockComponent        — 1 when clockRaised, else 0: a ticking clock is
//      a textbook cliffhanger engine regardless of its magnitude.
// confusionPenalty — proportional to questionsUnresolved, i.e. threads this
//   scene raised that are NEVER answered ANYWHERE in the document (not just
//   "not yet" — detectQuestionLatency already resolves that ambiguity for
//   us: questionsUnresolved is precisely "raised here, matched nowhere,
//   ever"). This is the most literal, already-computed implementation of
//   "questionsRaised greatly exceeds every later resolution" the record
//   exposes — reconstructing an equivalent from aggregate downstream
//   resolvedByScene sums would be a strictly noisier proxy for the same
//   fact, since questionsUnresolved is scoped to THIS scene's own raised
//   questions while resolvedByScene is not attributable back to an origin
//   scene at the record level.
//
// High (near 100): the scene ends with real suspense rising, live clues,
// a ticking clock, and open threads that DO eventually pay off (low
// questionsUnresolved). Low (near 0): the scene closes everything out
// (all its questions resolved same-scene, no clues left hanging, no clock,
// falling/flat suspense) — a clean stopping point, not a hook. A scene that
// merely dumps many unanswerable questions without ever paying them off is
// held down by the confusion penalty rather than scored as a strong hook.
const QUESTION_CARRY_SATURATION = 3;
const SUSPENSE_POSITIVE_SATURATION = 2;
const CLUE_PRESSURE_SATURATION = 3;
const CLIFFHANGER_COMPONENT_WEIGHT = 0.25;
const CLIFFHANGER_CONFUSION_WEIGHT = 0.4;

export function computeCliffhangerStrength(record: ScreenplaySceneRecord): number {
  const carriedOpenComponent = clamp01(
    safeDiv(Math.max(0, (record.questionsRaised ?? 0) - (record.questionsResolvedSameScene ?? 0)), QUESTION_CARRY_SATURATION),
  );
  const suspensePositiveComponent = clamp01(
    safeDiv(Math.max(0, record.suspenseDelta ?? 0), SUSPENSE_POSITIVE_SATURATION),
  );
  const cluePressureComponent = clamp01(
    safeDiv(record.unresolvedClues?.length ?? 0, CLUE_PRESSURE_SATURATION),
  );
  const clockComponent = record.clockRaised ? 1 : 0;

  const positiveComposite =
    CLIFFHANGER_COMPONENT_WEIGHT * carriedOpenComponent +
    CLIFFHANGER_COMPONENT_WEIGHT * suspensePositiveComponent +
    CLIFFHANGER_COMPONENT_WEIGHT * cluePressureComponent +
    CLIFFHANGER_COMPONENT_WEIGHT * clockComponent;

  const confusionPenalty = CLIFFHANGER_CONFUSION_WEIGHT * clamp01(
    safeDiv(record.questionsUnresolved ?? 0, QUESTION_CARRY_SATURATION),
  );

  return toScore(positiveComposite - confusionPenalty);
}

// ── twistImpact (per scene, 0-100) ───────────────────────────────────────────
//
// Inputs: this scene's `revelation` text, every EARLIER scene's corpus text
// (dramaticTurn/revelation/dialogueHighlights/visualBeats), and the whole
// script's top content words (frequency-ranked vocabulary, computed once per
// script — see buildGlobalTopWords below).
//
// twistImpact is 0 whenever there is no revelation, no earlier scenes to
// recontextualize, or the revelation's text carries no content words at all
// (a revelation string that is empty/all-stopwords cannot be measured to
// overlap anything) — every one of these is an explicit guard, not an
// accidental division.
//
// Otherwise:
//   recontextualizedFraction = (# earlier scenes whose corpus text shares at
//     least one content word with the revelation) / (# earlier scenes total)
//     — "the more prior scenes recontextualized, the higher."
//   centrality = |revelationWords ∩ scriptTopWords| / TOP_WORDS_K — how much
//     of the revelation's vocabulary sits inside the script's own most
//     frequent (i.e. most thematically central) content words.
//   centralityScale = CENTRALITY_FLOOR + (1 - CENTRALITY_FLOOR) * centrality
//     — "scaled by how central the revelation is": a multiplicative
//     modulator (per the spec's literal "scaled by" wording), not an
//     additive term, so a revelation that recontextualizes many earlier
//     scenes but touches none of the script's central vocabulary is damped
//     rather than zeroed (CENTRALITY_FLOOR keeps a real recontextualization
//     signal from being wiped out entirely by an off-theme word choice).
//   twistImpact = recontextualizedFraction * centralityScale
//
// High (near 100): the revelation's vocabulary threads through nearly every
// earlier scene AND sits squarely in the script's central vocabulary — a
// twist that recasts the whole story, not a local surprise. Low (near 0):
// no revelation, or a revelation that shares no vocabulary with anything
// that came before (reads as a non sequitur, not a twist).
const TOP_WORDS_K = 12;
const CENTRALITY_FLOOR = 0.3;

/** Script-wide top content words by frequency across every scene's corpus
 *  text, ties broken by first-appearance order in sceneIdx-ascending scan
 *  (Array.prototype.sort is a stable sort per spec, and `sorted` below is
 *  already sceneIdx-ordered) — deterministic and independent of the input
 *  array's original order. */
function buildGlobalTopWords(sorted: ScreenplaySceneRecord[]): Set<string> {
  const freq = new Map<string, number>();
  for (const record of sorted) {
    for (const word of extractMetricContentWords(sceneCorpusText(record))) {
      freq.set(word, (freq.get(word) ?? 0) + 1);
    }
  }
  const ranked = [...freq.entries()].sort((a, b) => b[1] - a[1]);
  return new Set(ranked.slice(0, TOP_WORDS_K).map(([word]) => word));
}

function computeTwistImpactAt(
  sorted: ScreenplaySceneRecord[],
  index: number,
  topWords: Set<string>,
): number {
  const record = sorted[index];
  if (!record.revelation) return 0;
  if (index === 0) return 0; // no earlier scenes exist to recontextualize

  const revelationWords = extractMetricContentWords(record.revelation);
  if (revelationWords.size === 0) return 0;

  let recontextualizedCount = 0;
  for (let i = 0; i < index; i++) {
    const earlierWords = extractMetricContentWords(sceneCorpusText(sorted[i]));
    let shares = false;
    for (const w of revelationWords) {
      if (earlierWords.has(w)) { shares = true; break; }
    }
    if (shares) recontextualizedCount++;
  }
  const recontextualizedFraction = clamp01(safeDiv(recontextualizedCount, index));

  let centralOverlap = 0;
  for (const w of revelationWords) if (topWords.has(w)) centralOverlap++;
  const centrality = clamp01(safeDiv(centralOverlap, TOP_WORDS_K));
  const centralityScale = CENTRALITY_FLOOR + (1 - CENTRALITY_FLOOR) * centrality;

  return toScore(recontextualizedFraction * centralityScale);
}

// ── suspenseEntropy (whole script, 0-100) ────────────────────────────────────
//
// Inputs: every scene's suspenseDelta, in sceneIdx order.
//
// A variance-decomposition formulation over the suspenseDelta sequence:
// fit an ordinary-least-squares linear trend against scene position, then
// split total variance into trend-explained variance and residual
// (oscillation) variance. The residual share is exactly `1 - R²` of the
// linear fit — the fraction of the suspense signal's spread that a single
// monotone ramp CANNOT explain. A pure monotone ramp (steadily escalating or
// steadily draining suspense) has R² ≈ 1 and therefore a residual share near
// 0; a flat line has zero total variance and is guarded to 0 directly
// (nothing to decompose); a genuine rise-and-fall pattern fits a straight
// line poorly and has a HIGH residual share.
//
// That alone rewards "not monotone" but not yet "rise-and-fall" specifically
// (e.g. a single symmetric hump also has a high residual share while
// visiting only one reversal). A second, order-sensitive term — the
// direction-reversal rate — is blended in: the fraction of interior points
// at which the sign of the first difference flips relative to the previous
// first difference (a local peak or trough). This directly rewards
// alternation and escalating-peak shapes over a single hump.
//
//   suspenseEntropy = 100 * (RESIDUAL_WEIGHT * residualShare
//                            + REVERSAL_WEIGHT * reversalRate)
//
// High (near 100): suspense genuinely rises and falls across the script,
// with multiple direction changes a straight-line fit cannot capture — the
// "variated rise-and-fall, escalating peaks" the spec asks to reward. Low
// (near 0): suspenseDelta is flat (no variance at all) or ramps in one
// direction the whole way (high R², near-zero residual, zero reversals).
// Guarded to 0 for fewer than 3 scenes (a reversal needs 3 points to define,
// and 2 points always fit a line perfectly) and for all-zero/constant input
// (zero total variance — nothing to decompose).
const SUSPENSE_ENTROPY_RESIDUAL_WEIGHT = 0.6;
const SUSPENSE_ENTROPY_REVERSAL_WEIGHT = 0.4;

/** Ordinary least squares slope+intercept of y against index 0..n-1. */
function linearFit(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  const meanX = (n - 1) / 2;
  const meanY = values.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - meanX) * (values[i] - meanY);
    den += (i - meanX) * (i - meanX);
  }
  const slope = safeDiv(num, den, 0);
  const intercept = meanY - slope * meanX;
  return { slope, intercept };
}

export function computeSuspenseEntropy(records: ScreenplaySceneRecord[]): number {
  const sorted = sortedBySceneIdx(records);
  const values = sorted.map(r => r.suspenseDelta ?? 0);
  const n = values.length;
  if (n < 3) return 0;

  const mean = values.reduce((s, v) => s + v, 0) / n;
  const totalVariance = values.reduce((s, v) => s + (v - mean) * (v - mean), 0) / n;
  if (totalVariance === 0) return 0;

  const { slope, intercept } = linearFit(values);
  const residualVariance = values.reduce((s, v, i) => {
    const predicted = slope * i + intercept;
    return s + (v - predicted) * (v - predicted);
  }, 0) / n;
  const residualShare = clamp01(safeDiv(residualVariance, totalVariance));

  const diffs: number[] = [];
  for (let i = 1; i < n; i++) diffs.push(values[i] - values[i - 1]);
  let reversals = 0;
  let interiorPoints = 0;
  for (let i = 1; i < diffs.length; i++) {
    if (diffs[i - 1] === 0 || diffs[i] === 0) continue; // a flat step is not a reversal either way
    interiorPoints++;
    if (Math.sign(diffs[i]) !== Math.sign(diffs[i - 1])) reversals++;
  }
  const reversalRate = clamp01(safeDiv(reversals, interiorPoints));

  return toScore(
    SUSPENSE_ENTROPY_RESIDUAL_WEIGHT * residualShare + SUSPENSE_ENTROPY_REVERSAL_WEIGHT * reversalRate,
  );
}

// ── momentumConsistency (whole script, 0-100) ────────────────────────────────
//
// Inputs: every scene's suspenseDelta + curiosityDelta + clockDelta, in
// sceneIdx order — the three numeric "forward pressure" channels the record
// exposes (distinct from suspenseEntropy, which reads suspenseDelta ALONE
// for its shape; momentumConsistency instead asks whether SOME combination
// of forward-pressure signals keeps firing scene over scene, regardless of
// shape).
//
// perSceneMomentum_i = suspenseDelta_i + curiosityDelta_i + clockDelta_i.
// A scene is a "stall" when |momentum_i| <= STALL_EPSILON — no meaningful
// forward or backward narrative pressure registered at all. The metric is
// 100 minus the longest run of consecutive stall scenes, scaled by script
// length:
//
//   momentumConsistency = 100 * (1 - longestStallRun / n)
//
// High (near 100): the script never goes dead for more than a scene or two
// at a time — every stretch is doing SOME work on the reader, even if that
// work isn't dramatic in shape (that's suspenseEntropy's job). Low (near 0):
// a long unbroken stretch (up to the whole script) where nothing moves the
// needle — the "dead middle" pattern this metric exists to catch. All-zero
// signals across every scene collapse to a single stall run spanning the
// entire script, so the guard-required all-zero case correctly yields 0
// (not NaN, not a false 100).
const STALL_EPSILON = 1e-9;

export function computeMomentumConsistency(records: ScreenplaySceneRecord[]): number {
  const sorted = sortedBySceneIdx(records);
  const n = sorted.length;
  if (n === 0) return 0;

  const momentum = sorted.map(r => (r.suspenseDelta ?? 0) + (r.curiosityDelta ?? 0) + (r.clockDelta ?? 0));

  let longestStallRun = 0;
  let currentRun = 0;
  for (const m of momentum) {
    if (Math.abs(m) <= STALL_EPSILON) {
      currentRun++;
      longestStallRun = Math.max(longestStallRun, currentRun);
    } else {
      currentRun = 0;
    }
  }

  return toScore(1 - safeDiv(longestStallRun, n));
}

// ── surpriseProxy (per scene, 0-100) ─────────────────────────────────────────
//
// Inputs: this scene's own record, discretized into a "signal-combination
// fingerprint" (emotionalShift × clockRaised × powerFlipped × revelation
// presence × purpose), plus every EARLIER scene's fingerprint.
//
// True surprise (in an information-theoretic sense) is -log(P(event)) under
// a model of what the story "should" do next. This module has no learned or
// authored model of story continuation to compute a real probability
// against — what it DOES have is the running empirical distribution of
// fingerprints the script has shown so far. surpriseProxy therefore reports
// the COMPLEMENT of that fingerprint's running frequency share:
//
//   surpriseProxy_i = 1 - (# earlier scenes sharing this fingerprint)
//                         / (# earlier scenes total)
//
// This is monotonic in the same direction a true -logP would be (rarer so
// far ⇒ higher score) but is explicitly NOT a probability-calibrated
// information measure — with only a handful of earlier scenes to build a
// distribution from, a real -logP would be extremely noisy at small counts,
// while a frequency-complement stays bounded and interpretable at any script
// length. Documented here as a proxy for exactly that reason.
//
// High (near 100): this scene's combination of emotional direction, clock
// activity, power flip, revelation, and purpose has not appeared in this
// exact combination anywhere earlier in the script — a formally "unprecedented"
// beat. Low (near 0): the script has already shown this exact combination
// repeatedly. Guarded to 0 for the first scene (index 0 — no earlier
// distribution exists to be rare against, not a 0-magnitude surprise).
function sceneFingerprint(record: ScreenplaySceneRecord): string {
  return [
    record.emotionalShift,
    record.clockRaised ? 'clock' : 'noclock',
    record.powerFlipped === true ? 'flip' : 'noflip',
    record.revelation ? 'reveal' : 'noreveal',
    record.purpose,
  ].join('|');
}

function computeSurpriseProxyAt(sorted: ScreenplaySceneRecord[], index: number): number {
  if (index === 0) return 0; // no preceding distribution to be rare against
  const fingerprint = sceneFingerprint(sorted[index]);
  let priorMatches = 0;
  for (let i = 0; i < index; i++) {
    if (sceneFingerprint(sorted[i]) === fingerprint) priorMatches++;
  }
  const freqShare = clamp01(safeDiv(priorMatches, index));
  return toScore(1 - freqShare);
}

/** Standalone entry point (records need not be pre-sorted) — mirrors the
 *  whole-array export shape of suspenseEntropy/momentumConsistency above,
 *  for direct testing and any caller that wants this metric without the
 *  full computeNarrativeMetrics() report. Returned in sceneIdx-ascending
 *  order (see the module header's permutation-stability note). */
export function computeSurpriseProxy(records: ScreenplaySceneRecord[]): number[] {
  const sorted = sortedBySceneIdx(records);
  return sorted.map((_, i) => computeSurpriseProxyAt(sorted, i));
}

// ── informationAsymmetryStrength (per scene, 0-100) ──────────────────────────
//
// Inputs (self-contained to the scene's own record): revelation presence,
// unresolvedClues, questionsRaised/questionsResolvedSameScene.
//
// A proxy for dramatic irony's audience-knows-vs-characters-act-on gap,
// built from the three record fields that most directly bear on "the
// audience has been shown something the story hasn't caught the characters
// up on yet": a revelation just surfaced to the audience (revelationComponent),
// clues seeded but not yet paid off — planted information sitting unused
// (cluePressureComponent, reusing CLUE_PRESSURE_SATURATION from
// cliffhangerStrength above since both read the same field for the same
// "live unresolved plant" meaning), and dialogue questions this scene raised
// that it did not answer before ending (openQuestionComponent, reusing
// QUESTION_CARRY_SATURATION). This is explicitly a LEXICAL proxy: it cannot
// see per-character belief state the way /api/nvm/epistemic's ironyPairs
// computation can (that route reads state.characterBeliefs from a full
// NarrativeState, which this module — deliberately scoped to
// ScreenplaySceneRecord alone — does not have access to). Equal-weighted
// average of the three components, each already a documented [0,1] fraction.
//
// High (near 100): the scene just revealed something to the audience while
// simultaneously leaving clues unpaid and questions open — maximal gap
// between what the reader now knows/wonders and what the story has
// resolved. Low (near 0): nothing revealed, no live clues, no open
// questions — reader and story are in lockstep.
export function computeInformationAsymmetryStrength(record: ScreenplaySceneRecord): number {
  const revelationComponent = record.revelation ? 1 : 0;
  const cluePressureComponent = clamp01(
    safeDiv(record.unresolvedClues?.length ?? 0, CLUE_PRESSURE_SATURATION),
  );
  const openQuestionComponent = clamp01(
    safeDiv(Math.max(0, (record.questionsRaised ?? 0) - (record.questionsResolvedSameScene ?? 0)), QUESTION_CARRY_SATURATION),
  );
  return toScore((revelationComponent + cluePressureComponent + openQuestionComponent) / 3);
}

// ── pacingFit (per scene + whole script, 0-100 | null) ───────────────────────
//
// Inputs: every scene's suspenseDelta (to build a measured tension
// trajectory) and the session's configured `emotional_arc` (an
// EmotionalArc, e.g. 'man_in_a_hole' — NOT read from this module, which
// stays a pure function of its arguments; the ROUTE reads
// stage.getIllusionState().emotional_arc and passes it in).
//
// Honest by construction: when no arc string is passed (nothing configured
// for the session) — or the arc string is unrecognized by
// expectedTensionAt/ARC_TENSION_CURVES — every pacingFit value is `null`,
// never a fabricated neutral number. This mirrors CLAUDE.md's "degrades
// honestly" principle for the whole product: an unconfigured feature reports
// its own absence, it does not silently default.
//
// When an arc IS configured:
//  1. measuredTensionTrajectory — the running CUMULATIVE SUM of
//     suspenseDelta across the script, min-max normalized to [0, 100] so it
//     sits on the same scale as ARC_TENSION_CURVES's 0-100 waypoints. This
//     is an honest proxy, not the full multi-signal tension ledger
//     (valuation/futures.ts's deriveTensionLedger, which needs a whole
//     NarrativeState this module does not have) — documented as such. A
//     perfectly flat suspense trajectory (zero variance) has no min-max
//     range to normalize against and is guarded to a constant midpoint (50)
//     rather than dividing by zero.
//  2. expected tension at this scene's position (index / (n-1), 0 for a
//     single-scene script) via expectedTensionAt(arc, position) — the same
//     interpolation DirectorNode.ts's live arc-deviation check already uses,
//     so a pacingFit reading is directly comparable in spirit to that
//     runtime check.
//  3. per-scene fit = 100 − |measured − expected| (both already 0-100, so
//     the absolute difference is itself already bounded to [0, 100] —
//     clamped defensively anyway).
//  4. whole-script pacingFit = the mean of every non-null per-scene fit.
//
// High (near 100): the story's measured suspense trajectory tracks its
// chosen arc's expected shape closely at every position. Low (near 0): the
// measured trajectory and the arc's expectation diverge sharply (running far
// hotter or far cooler than the chosen arc calls for at that point in the
// story) — the same "running too calm"/"running too hot" condition
// DirectorNode.ts's live check corrects for, surfaced here as a deterministic
// post-hoc read instead of a live nudge.
function buildMeasuredTensionTrajectory(sorted: ScreenplaySceneRecord[]): number[] {
  const n = sorted.length;
  if (n === 0) return [];
  let running = 0;
  const cumulative: number[] = [];
  for (const record of sorted) {
    running += record.suspenseDelta ?? 0;
    cumulative.push(running);
  }
  const min = Math.min(...cumulative);
  const max = Math.max(...cumulative);
  if (max === min) return cumulative.map(() => 50); // flat trajectory — neutral midpoint, not a divide-by-zero
  return cumulative.map(v => ((v - min) / (max - min)) * 100);
}

export interface PacingFitResult {
  perScene: Array<number | null>;
  script: number | null;
}

export function computePacingFit(
  records: ScreenplaySceneRecord[],
  emotionalArc?: EmotionalArc | string,
): PacingFitResult {
  const sorted = sortedBySceneIdx(records);
  const n = sorted.length;
  if (!emotionalArc || n === 0) {
    return { perScene: sorted.map(() => null), script: null };
  }

  const trajectory = buildMeasuredTensionTrajectory(sorted);
  const perScene: Array<number | null> = [];
  for (let i = 0; i < n; i++) {
    const position = n > 1 ? i / (n - 1) : 0;
    const expected = expectedTensionAt(emotionalArc, position);
    if (expected === null) { perScene.push(null); continue; }
    const diff = Math.abs(trajectory[i] - expected);
    perScene.push(toScore(1 - clamp01(diff / 100)));
  }

  const valid = perScene.filter((f): f is number => f !== null);
  const script = valid.length > 0 ? Math.round(valid.reduce((s, v) => s + v, 0) / valid.length) : null;
  return { perScene, script };
}

// ── narrativeCohesion (whole script, 0-100) ──────────────────────────────────
//
// Inputs: every scene's corpus text (for shared content words — this also
// covers shared question-thread vocabulary, since dialogueHighlights already
// carries told dialogue lines into sceneCorpusText; the analyzer exposes no
// per-question cross-scene identifier at the record level, only the
// aggregate questionsRaised/Resolved counts used elsewhere in this module,
// so lexical overlap is the only honestly available "question thread"
// connectivity signal) and seededClueIds/payoffSetupIds (for shared clue
// identity — a clue seeded in one scene and paid off, or re-seeded, in
// another is an explicit, ID-level connection, stronger evidence than
// lexical overlap alone).
//
// A scene is "connected" when it shares at least one content word OR at
// least one clue id with AT LEAST ONE other scene anywhere in the script
// (not necessarily adjacent). narrativeCohesion is the fraction of scenes
// that are connected — the orphan-scene rate, inverted:
//
//   narrativeCohesion = 100 * (# connected scenes) / (# scenes)
//
// High (near 100): every scene threads back into the rest of the script
// through recurring vocabulary or clue payoffs — nothing is narratively
// isolated. Low (near 0): most scenes share nothing lexical or evidentiary
// with any other scene — a symptom of disconnected, episodic material.
// Guarded to 100 for 0 or 1 scenes (mirrors this file's own
// analysis.ts-route precedent of defaulting a zero-population rate to 100,
// e.g. `/api/nvm/health`'s proofPassRate: nothing exists to be disconnected
// from, so the vacuous case reads as fully cohesive, not as a failure).
function scenesShareConnection(a: ScreenplaySceneRecord, b: ScreenplaySceneRecord): boolean {
  const wordsA = extractMetricContentWords(sceneCorpusText(a));
  if (wordsA.size > 0) {
    const wordsB = extractMetricContentWords(sceneCorpusText(b));
    for (const w of wordsA) if (wordsB.has(w)) return true;
  }
  const idsA = new Set([...(a.seededClueIds ?? []), ...(a.payoffSetupIds ?? [])]);
  if (idsA.size > 0) {
    for (const id of b.seededClueIds ?? []) if (idsA.has(id)) return true;
    for (const id of b.payoffSetupIds ?? []) if (idsA.has(id)) return true;
  }
  return false;
}

export function computeNarrativeCohesion(records: ScreenplaySceneRecord[]): number {
  const sorted = sortedBySceneIdx(records);
  const n = sorted.length;
  if (n <= 1) return 100;

  let connectedCount = 0;
  for (let i = 0; i < n; i++) {
    let connected = false;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      if (scenesShareConnection(sorted[i], sorted[j])) { connected = true; break; }
    }
    if (connected) connectedCount++;
  }
  return toScore(safeDiv(connectedCount, n));
}

// ── emotionalImpactRange (whole script, {peak, spread}, both 0-100) ─────────
//
// Inputs: every scene's suspenseDelta + emotionalShift.
//
// Per-scene magnitude = |suspenseDelta| + (EMOTIONAL_SHIFT_BONUS when
// emotionalShift is non-neutral) — combining the one numeric intensity
// signal the record carries with the one categorical valence signal,
// exactly the two fields the spec names ("emotionalShift/suspense
// magnitudes"). EMOTIONAL_SHIFT_BONUS (1) is set to the same order of
// magnitude as a typical single suspenseDelta swing (see the
// cliffhangerStrength header's note on typical -1..1 per-scene deltas), so a
// categorical shift with no numeric suspense movement still registers as a
// real, but not dominant, magnitude.
//
//   peak   = max magnitude across the script, saturating at
//            EMOTIONAL_PEAK_SATURATION
//   spread = (max magnitude − min magnitude) across the script, saturating
//            at EMOTIONAL_SPREAD_SATURATION (spread has twice the dynamic
//            range of a single peak by construction, so its saturation
//            constant is set proportionally higher)
//
// High peak: the script has at least one scene of real emotional/suspense
// intensity. High spread: the script visits both very quiet and very
// intense scenes — a wide dynamic range. Low/low: a flat, low-intensity
// script throughout. Guarded to {peak: 0, spread: 0} for an empty script.
const EMOTIONAL_SHIFT_BONUS = 1;
const EMOTIONAL_PEAK_SATURATION = 3;
const EMOTIONAL_SPREAD_SATURATION = 4;

export interface EmotionalImpactRange {
  peak: number;
  spread: number;
}

export function computeEmotionalImpactRange(records: ScreenplaySceneRecord[]): EmotionalImpactRange {
  const sorted = sortedBySceneIdx(records);
  if (sorted.length === 0) return { peak: 0, spread: 0 };

  const magnitudes = sorted.map(r =>
    Math.abs(r.suspenseDelta ?? 0) + (r.emotionalShift && r.emotionalShift !== 'neutral' ? EMOTIONAL_SHIFT_BONUS : 0),
  );
  const peak = Math.max(...magnitudes);
  const spread = peak - Math.min(...magnitudes);
  return {
    peak: toScore(safeDiv(peak, EMOTIONAL_PEAK_SATURATION)),
    spread: toScore(safeDiv(spread, EMOTIONAL_SPREAD_SATURATION)),
  };
}

// ── tensionMeasures (whole script) — the same question, four ways ───────────
//
// Inputs: every scene's suspenseDelta, clockRaised, questionsRaised/
// questionsResolvedSameScene, visualBeats/dialogueHighlights counts, plus
// this module's own informationAsymmetryStrength per scene.
//
// Deliberately NOT a single normalized number — the spec asks for "tension
// four different ways" so a user can see where they disagree, so each field
// keeps its own natural range, documented individually:
//
//   lexical    — the raw mean of suspenseDelta across all scenes, rounded to
//     2 decimals. UNBOUNDED/signed (typically small, e.g. -2..2 given
//     per-scene deltas usually fall in -1..1): positive means the script's
//     dialogue/action-derived suspense signal net-rises over its course,
//     negative means it net-drains. This is literally "mean suspenseDelta",
//     the most direct lexical reading of tension the records expose.
//   structural — 0-100. Blends the share of scenes with a live ticking clock
//     (clockRaised) and the share of "carried-open-question" pressure (reusing
//     cliffhangerStrength's carriedOpenComponent shape), equally weighted.
//     High: the script keeps structural pressure (deadlines, unclosed
//     threads) alive across most of its scenes.
//   rhythmic   — 0-100, centered at 50 (no trend). A content-density proxy
//     (visualBeats.length + dialogueHighlights.length per scene — NOT true
//     word/line count, since ScreenplaySceneRecord carries no per-scene
//     length field at all; dialogueHighlights is additionally capped at 3
//     items by memory.ts's builder, so this undercounts dialogue-heavy
//     scenes — a directional trend reading only, not an absolute one) fit
//     with the same OLS linear-trend helper suspenseEntropy uses. A
//     NEGATIVE slope (density shrinking scene-over-scene, i.e. scenes
//     compressing as the script moves on) maps toward 100; a positive slope
//     (scenes expanding) maps toward 0; a flat trend sits at 50. Guarded to
//     50 for fewer than 2 scenes (no trend is definable).
//   asymmetric — 0-100. Mean of computeInformationAsymmetryStrength across
//     every scene — "how much dramatic-irony-style gap, on average, does
//     this script sustain" (the "irony-driven" tension reading).
//
// All four are guarded to their own neutral/zero value for an empty script
// (0 for lexical, 50 for rhythmic, 0 for structural/asymmetric).
const RHYTHMIC_SLOPE_SATURATION = 1;

export interface TensionMeasures {
  lexical: number;
  structural: number;
  rhythmic: number;
  asymmetric: number;
}

export function computeTensionMeasures(records: ScreenplaySceneRecord[]): TensionMeasures {
  const sorted = sortedBySceneIdx(records);
  const n = sorted.length;
  if (n === 0) return { lexical: 0, structural: 0, rhythmic: 50, asymmetric: 0 };

  const lexical = Math.round(
    (sorted.reduce((s, r) => s + (r.suspenseDelta ?? 0), 0) / n) * 100,
  ) / 100;

  const clockShare = sorted.reduce((s, r) => s + (r.clockRaised ? 1 : 0), 0) / n;
  const questionShare = sorted.reduce((s, r) => s + clamp01(
    safeDiv(Math.max(0, (r.questionsRaised ?? 0) - (r.questionsResolvedSameScene ?? 0)), QUESTION_CARRY_SATURATION),
  ), 0) / n;
  const structural = toScore(0.5 * clamp01(clockShare) + 0.5 * clamp01(questionShare));

  let rhythmic = 50;
  if (n >= 2) {
    const density = sorted.map(r => (r.visualBeats?.length ?? 0) + (r.dialogueHighlights?.length ?? 0));
    const { slope } = linearFit(density);
    const normalizedSlope = Math.max(-1, Math.min(1, safeDiv(-slope, RHYTHMIC_SLOPE_SATURATION)));
    rhythmic = toScore((normalizedSlope + 1) / 2);
  }

  const asymmetric = Math.round(
    sorted.reduce((s, r) => s + computeInformationAsymmetryStrength(r), 0) / n,
  );

  return { lexical, structural, rhythmic, asymmetric };
}

// ── Public shapes + entry point ──────────────────────────────────────────────

export interface SceneNarrativeMetrics {
  sceneIdx: number;
  slug: string;
  pivotStrength: number;
  cliffhangerStrength: number;
  twistImpact: number;
  surpriseProxy: number;
  informationAsymmetryStrength: number;
  /** null exactly when no emotionalArc was passed to computeNarrativeMetrics
   *  (or the arc string is unrecognized) — an honest absence, never a
   *  fabricated neutral score. See computePacingFit's header. */
  pacingFit: number | null;
}

export interface ScriptNarrativeMetrics {
  sceneCount: number;
  suspenseEntropy: number;
  momentumConsistency: number;
  /** cliffhangerStrength of the last scene by sceneIdx — the "script-final"
   *  reading called out in the spec (how strongly the whole piece ends on a
   *  hook). 0 for an empty script (guarded, matches the per-scene default). */
  finalCliffhangerStrength: number;
  /** Mean of every non-null per-scene pacingFit; null under the same honest
   *  no-arc-configured condition as the per-scene field. */
  pacingFit: number | null;
  narrativeCohesion: number;
  emotionalImpactRange: EmotionalImpactRange;
  tensionMeasures: TensionMeasures;
}

export interface NarrativeMetricsReport {
  perScene: SceneNarrativeMetrics[];
  script: ScriptNarrativeMetrics;
}

/** Compute every metric in this module for a full script's records.
 *  `emotionalArc` is optional and purely a plain argument (this function
 *  stays a pure function of its inputs) — pass
 *  stage.getIllusionState().emotional_arc from the route when a session has
 *  one configured; omit it to get honest `null` pacingFit throughout.
 *  Returns perScene sorted ascending by sceneIdx (see the module header's
 *  permutation note). Empty input yields an empty perScene array and an
 *  all-zero/neutral script summary — never throws, never NaNs. */
export function computeNarrativeMetrics(
  records: ScreenplaySceneRecord[],
  emotionalArc?: EmotionalArc | string,
): NarrativeMetricsReport {
  const sorted = sortedBySceneIdx(records);
  const topWords = buildGlobalTopWords(sorted);
  const pacingFit = computePacingFit(sorted, emotionalArc);

  const perScene: SceneNarrativeMetrics[] = sorted.map((record, index) => ({
    sceneIdx: record.sceneIdx,
    slug: record.slug,
    pivotStrength: computePivotStrength(record),
    cliffhangerStrength: computeCliffhangerStrength(record),
    twistImpact: computeTwistImpactAt(sorted, index, topWords),
    surpriseProxy: computeSurpriseProxyAt(sorted, index),
    informationAsymmetryStrength: computeInformationAsymmetryStrength(record),
    pacingFit: pacingFit.perScene[index],
  }));

  const finalCliffhangerStrength = perScene.length > 0
    ? perScene[perScene.length - 1].cliffhangerStrength
    : 0;

  return {
    perScene,
    script: {
      sceneCount: sorted.length,
      suspenseEntropy: computeSuspenseEntropy(sorted),
      momentumConsistency: computeMomentumConsistency(sorted),
      finalCliffhangerStrength,
      pacingFit: pacingFit.script,
      narrativeCohesion: computeNarrativeCohesion(sorted),
      emotionalImpactRange: computeEmotionalImpactRange(sorted),
      tensionMeasures: computeTensionMeasures(sorted),
    },
  };
}
