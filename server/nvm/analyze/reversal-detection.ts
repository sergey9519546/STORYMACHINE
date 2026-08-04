// Reversal detection — P1, 2026-08-04, responds to detector defect D3.
//
// ── What this is ─────────────────────────────────────────────────────────
// docs/p1-benchmark/DETECTOR_DEFECTS_2026-08-03.md D3: `structure.reversalCount`
// (server/nvm/screenplay/structure.ts) is defined ONLY as scenes with
// `suspenseDelta < -1` — a magnitude dip in the danger/relief lexicon. A
// revelation-type reversal (the detective is the mole; the ally was the
// betrayer) never registers on that channel, so NO_REVERSALS_LONG_STORY
// (server/nvm/revision/passes/conflict.ts) and NO_REVERSALS
// (server/nvm/revision/passes/structure.ts) can both fire CRITICAL on a
// script whose ending IS a reversal by any craft definition — D3's own
// worked example is demo/corpus/sample-script.fountain ("The Second Key"):
// the engine's own `revelation` extraction (memory.ts / fountain-analyzer.ts)
// correctly identifies Vance's "Turns out Holloway signed my transfer papers
// six years ago" line as the climax revelation and the logline builder
// (server/lib/logline.ts) already uses it, while `reversalCount` on that same
// script is 0. Two subsystems disagree about the same beat.
//
// The ledger's candidate fix shape: "a reversal detector consuming the
// already-extracted `revelation` channel plus allegiance/role flips." This
// module is that detector, built exactly to that shape and no further.
//
// ── What this is NOT ─────────────────────────────────────────────────────
// - NOT wired into health, verdict, grade, reversalCount, or any other
//   user-visible or production-path output. `detectReversals` and
//   `computeReversalDelta` are exported and computed but nothing in
//   server/nvm/analyze/doctor.ts, server/nvm/screenplay/structure.ts, or any
//   revision pass calls them. structure.reversalCount is untouched.
// - NOT measured on the 761-script real-writing corpus. This module ships
//   with fixtures only (tests/core/reversal-detection.test.ts) plus an
//   opt-in diagnostic flag on scripts/measure-auc-split.mjs
//   (--with-reversal-detection / REV_DETECTION=1) for a maintainer to run
//   locally — see that script's header for the exact contract.
// - NOT a wiring decision, and unlike question-latency-deduction.ts (the
//   sibling P1 module this one follows structurally), there is not yet even
//   an agreed DEDUCTION SHAPE to gate a wiring decision on. The question this
//   module's diagnostic flag answers first is narrower: does detection
//   disagree with legacy on real writing at all, and in which direction? A
//   deduction/rule design is future work, contingent on that answer, and any
//   such future work is a scoring change requiring the full P1 evidence
//   protocol (positive/negative fixtures, corpus-measured before/after) and
//   respects the AUC-24 >= 0.622 ratchet in tests/core/real-script-corpus.
//   test.ts. See CLAUDE.md's "Which floor, exactly" section. This file does
//   not update docs/p1-benchmark/DETECTOR_DEFECTS_2026-08-03.md itself —
//   that ledger update is the orchestrator's job, after measurement.
//
// ── The deterministic boundary (read this before trusting any output) ─────
// This module reads ONLY fields already on ScreenplaySceneRecord (memory.ts)
// — no LLM call, per the project constitution (server-side deterministic
// analysis only; see CLAUDE.md's gotcha on the analysis-only boot mode). Two
// independent channels, each documented with exactly what it CAN and CANNOT
// see:
//
// CHANNEL 1 — revelation-text allegiance/identity inversion.
//   CAN see: a scene whose `revelation` field is non-null (memory.ts: "Any
//   revelation (new belief surfaced to audience)" — populated on the
//   ops-derived path by a witnessed UPDATE_BELIEF, and on the text-derived
//   path by fountain-analyzer.ts's detectRevelation, itself gated to an
//   explicit on-page disclosure pattern: REVEAL_PATTERNS — "the truth is",
//   "i know", "it was you", "turns out", "been lying", "i'm the", etc.)
//   whose revelation text ALSO matches this module's own allegiance/identity
//   vocabulary (role nouns — mole, traitor, double agent, inside man/woman,
//   turncoat, informant, snitch, spy, sleeper agent — or phrase patterns for
//   a bought/planted/switched-sides disclosure — "signed my", "on the
//   payroll", "paid ... off", "never really been on your side", "been
//   playing you", "it was ... all along"). Requiring BOTH gates (already a
//   disclosure per REVEAL_PATTERNS, AND allegiance-specific per this
//   module's own lexicon) is a deliberate precision-over-recall choice: a
//   generic revelation ("the truth is the vault code was 4471") does not
//   fire just because it is a revelation.
//   CANNOT see: an allegiance/identity reversal conveyed WITHOUT any of
//   REVEAL_PATTERNS' disclosure markers (revelation stays null and this
//   channel never even looks at the scene); a reversal conveyed only through
//   staging/visual action with no line matching this module's own allegiance
//   vocabulary (a silent unmasking); wording outside both lexicons' coverage
//   (any fixed lexicon has this ceiling — see fountain-analyzer.ts's own
//   header for the same tradeoff on every other lexicon-backed signal in
//   this codebase); whether a textually-matched "reveal" is actually TRUE
//   within the story (a character LYING about being the mole reads
//   identically to a genuine reveal — this module has no truth-tracking of
//   its own, unlike server/nvm/analyze/truth-extraction.ts's narrower
//   life-status ledger); revelations on the ops-derived path whose
//   `belief.proposition` text (memory.ts's `revelation` field) simply
//   doesn't happen to phrase the inversion in vocabulary this module covers,
//   since StoryOps propositions are free text authored by whatever built the
//   commit, not a controlled vocabulary.
//
// CHANNEL 2 — relationship-shift sign flip against an established pair.
//   CAN see: a pairKey (memory.ts's `relationshipShifts`, sorted-name-pair +
//   signed amount) whose ROLLING signed sum, accumulated scene-by-scene in
//   document order up to and NOT including the current scene, has reached at
//   least ESTABLISHED_THRESHOLD in one direction (an "established"
//   affinity/trust reading), followed by a single-scene shift for that same
//   pair of at least SWING_THRESHOLD magnitude in the OPPOSITE direction — a
//   large, sudden reversal of a previously-settled relationship, independent
//   of any revelation text. This is genuinely order-sensitive: reordering
//   scenes changes which shifts are "prior" to which, exactly like the
//   question-latency channel documented in question-latency-deduction.ts.
//   CANNOT see: a reversal on a pair that never accumulated an established
//   reading in the first place (a relationship introduced already-hostile
//   has no positive baseline to invert FROM); a gradual erosion that never
//   clears SWING_THRESHOLD in any single scene (a slow-burn betrayal spread
//   across many small shifts is invisible to this channel by construction —
//   it looks for a SUDDEN swing, not a trend); any relationship the SHIFT_
//   RELATIONSHIP-derived channel never populates in the first place — the
//   ops path only records what a SHIFT_RELATIONSHIP op says, and the text
//   path's detectRelationshipShifts only fires for characters who both speak
//   in a scene, over a POSITIVE/NEGATIVE_VALENCE lexicon (generic warmth,
//   not allegiance specifically) — so a wordless betrayal (an action-only
//   scene) cannot register here even if it clearly reads as one on the page.
//
// ── Field contract this reads ────────────────────────────────────────────
// revelation: string | null (memory.ts ~line 72, always populated — null is
// the well-formed "no revelation this scene" case, not an absent-field
// case). relationshipShifts: optional array of {pairKey, dimension, amount}
// (memory.ts ~line 97); per that field's own documented precedent, absence
// is treated as [] (`?? []`), matching every other optional per-scene
// channel in this codebase.
//
// ── sceneIdx contract ─────────────────────────────────────────────────────
// Every sceneIdx returned by this module is 0-based, taken directly from the
// input record's own `sceneIdx` field — per CLAUDE.md and the codebase-wide
// convention, 1-based numbering is a DISPLAY-layer concern (see
// tests/core/scene-label-consistency.test.ts) and this module, like memory.ts
// and structure.ts before it, never performs that conversion itself.

import type { ScreenplaySceneRecord } from '../screenplay/memory.ts';

export type ReversalKind = 'revelation_allegiance' | 'relationship_swing';

export interface ReversalCandidate {
  /** 0-based, matches ScreenplaySceneRecord.sceneIdx exactly (see file header). */
  sceneIdx: number;
  kind: ReversalKind;
  /** Human-readable justification: the matched revelation text (channel 1) or
   *  a description of the pair/amounts that swung (channel 2). Not used for
   *  scoring — purely so a maintainer reading a diagnostic run can see WHY. */
  evidence: string;
}

export interface ReversalDetectionResult {
  reversals: ReversalCandidate[];
  /** Count of DISTINCT scenes carrying at least one reversal candidate — NOT
   *  the total candidate count. A single scene can produce candidates on both
   *  channels (a revelation scene that is also the pair's relationship-swing
   *  scene); counting it once keeps this number directly comparable to
   *  legacyCount's "one scene = at most one contribution" shape (see
   *  computeReversalDelta below), rather than letting a busy scene inflate
   *  the comparison. */
  reversalCount: number;
}

export interface ReversalDeltaResult {
  /** Reproduces structure.ts's reversalCountEarly / conflict.ts's
   *  reversalCount210 definition EXACTLY: `suspenseDelta < -1`, one count per
   *  scene, no allegiance/identity awareness. This is the CURRENT production
   *  definition (structure.reversalCount) — see legacySuspenseDipCount below
   *  for why it is reproduced rather than imported. */
  legacyCount: number;
  /** detectReversals(records).reversalCount — see that function. */
  detectedCount: number;
  /** detectedCount - legacyCount. Positive means this module finds reversals
   *  the legacy channel misses entirely (D3's exact failure mode); negative
   *  would mean the legacy magnitude-dip channel catches something this
   *  module's two narrower channels do not (also possible and equally worth
   *  knowing — a magnitude dip with no revelation and no established pair to
   *  invert is a real case this module is not built to see, per the CHANNEL
   *  2 boundary above). */
  delta: number;
}

/** Role nouns that name an allegiance/identity inversion directly — a
 *  character IS one of these, revealed. Precompiled at module load (not
 *  per-call), matching fountain-analyzer.ts's own buildLexiconRegex
 *  precedent — this list is a fixed lexicon, not a numeric formula constant,
 *  so it carries none of doctor.ts's documented TDZ risk (that gotcha is
 *  specific to doctor.ts<->reference.ts's circular import) and module-level
 *  precompilation is the same performance-motivated choice fountain-
 *  analyzer.ts already makes for every one of its own lexicons. */
const ALLEGIANCE_ROLE_RE =
  /\b(?:the\s+)?(?:inside\s+(?:man|woman|source|contact)|mole|double[\s-]?agent|turncoat|sleeper\s+agent|informant|snitch|traitor)\b/i;

/** Phrase patterns for a bought/planted/switched-sides disclosure that don't
 *  reduce to a single role noun (e.g. "signed my transfer papers" — D3's own
 *  worked example, demo/corpus/sample-script.fountain — never says "mole" or
 *  "traitor" at all, but plainly discloses the detective was on the
 *  antagonist's payroll). Kept as a separate array (rather than folded into
 *  one giant regex) so each pattern's rationale stays legible and testable
 *  in isolation. */
const ALLEGIANCE_PHRASE_PATTERNS: RegExp[] = [
  // Financial/employment allegiance disclosed after the fact.
  /\bsigned\s+(?:my|his|her|their|our)\b/i,
  /\bon\s+(?:his|her|their|the)\s+payroll\b/i,
  /\b(?:bought|paid)\s+(?:me|him|her|them|us)\s*(?:off)?\b/i,
  // Explicit continuity-of-allegiance admission ("we've never really
  // stopped working together" — the second half of the D3 worked example).
  /\b(?:never|always)\s+(?:really\s+)?(?:been|stopped)\s+working\s+(?:for|with|together)\b/i,
  // "It was me/him/her/them all along" — the stock unmasking line.
  /\bit\s+was\s+(?:me|him|her|them)\s+all\s+along\b/i,
  // First/third-person admission of sustained deception or working against.
  /\b(?:i(?:'ve| have)|he(?:'s| has)|she(?:'s| has)|they(?:'ve| have))\s+been\s+(?:lying|playing\s+(?:you|him|her|them)|using\s+(?:you|him|her|them)|working\s+against\s+(?:you|him|her|them))\b/i,
  // Direct negation of a previously-assumed loyalty.
  /\bnever\s+(?:really\s+|actually\s+)?(?:been|was|were)\s+on\s+(?:your|our|his|her|their)\s+side\b/i,
];

/** channel 1: a scene whose revelation text matches EITHER the role-noun
 *  lexicon or one of the phrase patterns. Both gates share the same
 *  precision-over-recall rationale documented in the file header. */
function isAllegianceRevelation(revelation: string): boolean {
  if (ALLEGIANCE_ROLE_RE.test(revelation)) return true;
  return ALLEGIANCE_PHRASE_PATTERNS.some(re => re.test(revelation));
}

/** channel 2 threshold: the pair's ROLLING signed sum (accumulated strictly
 *  before the current scene) must have reached at least this magnitude to
 *  count as "established." Set one point above detectRelationshipShifts'
 *  own RELATIONSHIP_SHIFT_THRESHOLD (2, fountain-analyzer.ts) — "established"
 *  should mean more than a single scene barely clearing the bare minimum
 *  shift threshold; it should reflect an accumulated reading. Function-local
 *  per CLAUDE.md's doctor.ts TDZ-gotcha discipline, applied here as cheap
 *  insurance even though this module has no circular import today — the same
 *  choice question-latency-deduction.ts already made for its own thresholds. */
function establishedThreshold(): number {
  return 3;
}

/** channel 2 threshold: the CURRENT scene's single shift for that pair must
 *  be at least this large, in the opposite direction, to count as a "swing"
 *  rather than an ordinary continuation. Chosen just below the text path's
 *  own per-scene cap of 5 (detectRelationshipShifts: `Math.sign(sum) *
 *  Math.min(Math.abs(sum), 5)`) so a maximal single-scene reversal on the
 *  text path always qualifies, while a scene at that path's bare minimum (2)
 *  does not — the same "clears the floor but isn't yet a swing" reasoning
 *  establishedThreshold uses. */
function swingThreshold(): number {
  return 4;
}

/**
 * Detect reversal candidates from the fields already on
 * ScreenplaySceneRecord — see the file header for the exact deterministic
 * boundary of each of the two channels. UNWIRED: see file header.
 */
export function detectReversals(records: ScreenplaySceneRecord[]): ReversalDetectionResult {
  const ESTABLISHED = establishedThreshold();
  const SWING = swingThreshold();

  const candidates: ReversalCandidate[] = [];

  // ── Channel 1: revelation-text allegiance/identity inversion ────────────
  for (const r of records) {
    if (!r.revelation) continue;
    if (isAllegianceRevelation(r.revelation)) {
      candidates.push({
        sceneIdx: r.sceneIdx,
        kind: 'revelation_allegiance',
        evidence: r.revelation,
      });
    }
  }

  // ── Channel 2: relationship-shift sign flip against an established pair ──
  // cumulative[pairKey] tracks the ROLLING signed sum strictly BEFORE the
  // scene currently being examined — updated only after that scene's own
  // shifts have been checked against it, so a scene's own shift can never
  // count as its own "established prior."
  const cumulative = new Map<string, number>();
  for (const r of records) {
    for (const shift of r.relationshipShifts ?? []) {
      const prior = cumulative.get(shift.pairKey) ?? 0;
      const priorSign = Math.sign(prior);
      const shiftSign = Math.sign(shift.amount);
      if (
        Math.abs(prior) >= ESTABLISHED &&
        Math.abs(shift.amount) >= SWING &&
        shiftSign !== 0 &&
        shiftSign !== priorSign
      ) {
        candidates.push({
          sceneIdx: r.sceneIdx,
          kind: 'relationship_swing',
          evidence: `pair ${shift.pairKey} (${shift.dimension}): established ${priorSign > 0 ? 'positive' : 'negative'} reading (rolling sum ${prior}), swings ${shift.amount} this scene`,
        });
      }
      cumulative.set(shift.pairKey, prior + shift.amount);
    }
  }

  const distinctScenes = new Set(candidates.map(c => c.sceneIdx));
  return { reversals: candidates, reversalCount: distinctScenes.size };
}

/** Reproduces structure.ts's `reversalCountEarly` / conflict.ts's
 *  `reversalCount210` definition exactly (`suspenseDelta < -1`, one count per
 *  scene). Deliberately duplicated here rather than imported from
 *  structure.ts: that module doesn't export a standalone function for this
 *  one-line predicate (it's inlined at both call sites), and importing
 *  structure.ts here for a single filter predicate would create a needless
 *  coupling from an unwired diagnostic module into the live scoring path
 *  this module explicitly does not touch. If the legacy definition ever
 *  changes, this line and both structure.ts/conflict.ts call sites must
 *  change together — there is no single source of truth for it today, which
 *  is a pre-existing property of the codebase this module inherits rather
 *  than introduces. */
function legacySuspenseDipCount(records: ScreenplaySceneRecord[]): number {
  return records.filter(r => r.suspenseDelta < -1).length;
}

/**
 * Bounded comparison stat (NOT a rule, NOT a deduction — three numbers) so a
 * measurement run can show exactly where the legacy suspense-dip definition
 * and this module's detector agree or disagree on a given script. UNWIRED:
 * see file header.
 */
export function computeReversalDelta(records: ScreenplaySceneRecord[]): ReversalDeltaResult {
  const legacyCount = legacySuspenseDipCount(records);
  const { reversalCount: detectedCount } = detectReversals(records);
  return { legacyCount, detectedCount, delta: detectedCount - legacyCount };
}
