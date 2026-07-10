// Record-parity harness — the contract test that keeps ScreenplaySceneRecord's
// two producers from silently drifting apart.
//
// ScreenplaySceneRecord has two independent builders:
//   1. OPS-DERIVED  — server/nvm/screenplay/memory.ts's buildScreenplayMemory/
//      annotateCommit, reading a StoryCommit ledger (the path simulation/
//      converge stories take).
//   2. TEXT-DERIVED — server/nvm/analyze/fountain-analyzer.ts's
//      analyzeFountainText, reconstructing records heuristically from raw
//      Fountain (the path uploaded scripts take).
// The bridge between them is server/nvm/screenplay/compile.ts's
// compileScreenplay: it renders a StoryCommit ledger to Fountain text, which
// can then be fed back through the text-derived path. This file authors
// GOLDEN STORIES as StoryOp sequences, runs both paths, and asserts an
// explicit, tiered PARITY MATRIX between the two record sets.
//
// ── THE CENTRAL DISCOVERY THAT SHAPES THIS FILE ─────────────────────────────
// (UPDATED — Run 17-B, "compiler richness".) Until Run 17-B, compile.ts's
// projectFountain (server/nvm/project/index.ts) was a LOSSY renderer: of the
// 14 StoryOp kinds, only THREE ever produced Fountain text — UPDATE_BELIEF (as
// a character-cue + "(believing) <proposition>" dialogue block),
// SHIFT_RELATIONSHIP (as an action-line sentence built from `reason`), and
// RECORD_VISUAL_FACT (as an ALL-CAPS action line). RAISE_CLOCK, SEED_CLUE,
// PAYOFF_SETUP, UPDATE_READER_STATE, APPRAISE_EMOTION, ADD_FACT and the rest
// rendered NOTHING, so the *only* way the text-derived path could ever see a
// signal the ops-derived path recorded was for the co-authored belief/reason
// prose to carry it lexically. Run 17-B closed that gap: projectFountain now
// renders all 14 op kinds as craft-plausible Fountain prose (see
// server/nvm/project/index.ts's renderFountainOp and
// tests/core/projection-richness.test.ts's per-op fire/no-fire tests), and
// several of those renderings deliberately reuse fountain-analyzer.ts's own
// lexicon terms (deadline vocabulary for RAISE_CLOCK, a quoted token for
// SEED_CLUE/PAYOFF_SETUP, valence words for APPRAISE_EMOTION, danger/relief/
// mystery words for UPDATE_READER_STATE) — see the "compiler-richness
// capability" probe below, which demonstrates these PRESENCE-tier signals now
// survive WITHOUT any co-authored belief text at all. The golden stories
// below still co-author matching lexicon into their belief/reason prose
// (that discipline was never wrong — a real author's dialogue independently
// reinforces the same signals a rendered op now also carries), so every
// number pinned below was RE-MEASURED after Run 17-B's rendering changes,
// not merely assumed unchanged: the suspenseDelta/curiosityDelta/
// emotionalShift sign-agreement rates below are IDENTICAL to their pre-Run-
// 17-B values (19/19, 16/19, 19/19) — richer rendering was designed to
// reinforce the existing lexicon-agreement signal, not duplicate or
// contradict it, and that design goal was verified by measurement, not
// assumed (an earlier draft of the richer renderer picked mood-line
// vocabulary that accidentally collided with RELIEF_WORDS and briefly
// regressed suspenseDelta agreement to 13/19 during authoring — fixed before
// landing; see server/nvm/project/index.ts's readerStateBeat comment).
//
// Every number pinned below was MEASURED first (see the comment above each
// threshold) then set with headroom, per the standing instruction to measure
// before pinning.
//
// Wave 1192 additions: betrayalSignal (SIGN), powerDynamicsIntensity
// (PRESENCE), ironyMarkerCount (KNOWN_ASYMMETRY_TEXT_ONLY) — matrix 26 → 29;
// see the "Wave 1192 lexicon signals" describe at the bottom for the measured
// golden-story baselines and the BETRAYAL_PROBE/POWER_PROBE capability probes.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { buildScreenplayMemory, type ScreenplaySceneRecord } from '../../server/nvm/screenplay/memory.ts';
import { compileScreenplay } from '../../server/nvm/screenplay/compile.ts';
import { analyzeStructure } from '../../server/nvm/screenplay/structure.ts';
import { analyzeFountainText } from '../../server/nvm/analyze/fountain-analyzer.ts';
import { applyStoryOps } from '../../server/nvm/ops/dispatcher.ts';
import { emptyState } from '../../server/nvm/state/NarrativeState.ts';
import { summarizeOps } from '../../server/nvm/state/StoryCommit.ts';
import type { StoryOp } from '../../server/nvm/ops/StoryOp.ts';
import type { StoryCommit } from '../../server/nvm/state/StoryCommit.ts';
import type { Belief, EmotionState } from '../../server/engine/types.ts';

// ── Fixture builders ─────────────────────────────────────────────────────────

let beliefCounter = 0;
/** Minimal valid Belief. `source` drives nothing in the compiled Fountain
 *  (projectFountain renders every UPDATE_BELIEF identically regardless of
 *  source) but does drive the ops-path's own revelation/dialogueHighlights
 *  detection (witnessed → revelation candidate; told → dialogueHighlight
 *  candidate), which is why the golden stories pick sources deliberately. */
function belief(proposition: string, source: Belief['source'] = 'inferred'): Belief {
  beliefCounter++;
  return {
    id: `bel-${beliefCounter}`,
    proposition,
    confidence: source === 'witnessed' ? 1.0 : source === 'told' ? 0.7 : 0.4,
    source,
    acquired_at: beliefCounter,
    contradicts: [],
  };
}

function emotion(overrides: Partial<EmotionState>): EmotionState {
  return {
    joy: 0, distress: 0, anger: 0, fear: 0, pride: 0, shame: 0,
    dominant: 'neutral', intensity: 0, last_updated_at: 0,
    ...overrides,
  };
}

/** One StoryCommit per scene-ops array, in order, none reverted. */
function makeCommits(scenes: StoryOp[][]): StoryCommit[] {
  return scenes.map((ops, idx) => ({
    commitId: `commit-${idx}`,
    parentId: idx === 0 ? null : `commit-${idx - 1}`,
    sceneIdx: idx,
    ops,
    deltaSummary: summarizeOps(ops),
    reverted: false,
    createdAt: 1_700_000_000_000 + idx,
  }));
}

interface ProducerPair {
  commits: StoryCommit[];
  opsRecords: ScreenplaySceneRecord[];
  fountain: string;
  textRecords: ScreenplaySceneRecord[];
}

/** Runs BOTH producer paths over the same authored ops, per the bridge this
 *  file exists to test: commits → buildScreenplayMemory → opsRecords; and
 *  commits → compileScreenplay → fountain → analyzeFountainText → textRecords. */
function runBothPaths(scenes: StoryOp[][], title: string): ProducerPair {
  const commits = makeCommits(scenes);
  const opsRecords = buildScreenplayMemory(commits);
  const state = applyStoryOps(emptyState(), commits.flatMap(c => c.ops));
  const structure = analyzeStructure(opsRecords, commits);
  const compiled = compileScreenplay(commits, state, opsRecords, structure, title);
  const textRecords = analyzeFountainText(compiled.fountain).records;
  return { commits, opsRecords, fountain: compiled.fountain, textRecords };
}

function sign(n: number): -1 | 0 | 1 {
  return n > 0 ? 1 : n < 0 ? -1 : 0;
}

function flatten<K extends keyof ScreenplaySceneRecord>(
  records: ScreenplaySceneRecord[], field: K,
): NonNullable<ScreenplaySceneRecord[K]> extends Array<infer E> ? E[] : never {
  return records.flatMap(r => (r[field] as unknown as unknown[]) ?? []) as never;
}

/** pairKey is built by [a,b].sort().join('|') on BOTH paths, but the ops path
 *  uses whatever charId casing the author chose (e.g. 'alice') while the text
 *  path always uses the Fountain character-cue casing, which projectFountain
 *  renders as `charId.toUpperCase()` (e.g. 'ALICE'). Lowercasing before
 *  comparing is the documented normalization for this field (mirrors the
 *  slug case/whitespace normalization called for by the parity spec). */
function normalizePairKey(pairKey: string): string {
  return pairKey.toLowerCase();
}

// ── GOLDEN STORY A — "The Brass Key" (10 scenes) ────────────────────────────
// Exercises: suspense sign both ways, curiosity sign both ways (incl. the
// documented negative-curiosity asymmetry), a seeded+paid clue, an unresolved
// clue, two clock raises, a witnessed revelation, one positive and one
// negative relationship shift, and varied purposes.
const STORY_A_SCENES: StoryOp[][] = [
  // Scene 0 — establish_world. Relief lexicon ('calm','peaceful','quiet') →
  // negative suspense on both paths.
  [
    { op: 'UPDATE_BELIEF', charId: 'alice', belief: belief('The apartment feels calm and peaceful this quiet morning.') },
    { op: 'UPDATE_READER_STATE', delta: { suspense: -1, curiosity: 0 } },
  ],
  // Scene 1 — SEED_CLUE 'clue-key'. The clue itself renders nothing; the
  // quoted phrase "the brass key" in the accompanying belief is what the
  // text path's extractDistinctiveTokens (QUOTE_RE) actually sees. Danger
  // lexicon ('dangerous','dark') carries positive suspense to the text path.
  [
    { op: 'SEED_CLUE', clueId: 'clue-key', carrier: 'object' },
    { op: 'UPDATE_BELIEF', charId: 'alice', belief: belief('She mentioned "the brass key" was missing again, and something dangerous stirred in the dark hallway.') },
    { op: 'UPDATE_READER_STATE', delta: { suspense: 1, curiosity: 1 } },
  ],
  // Scene 2 — SEED_CLUE 'clue-photo', deliberately NEVER paid off (unresolved
  // clue). The quoted phrase "a torn photograph" appears exactly once in the
  // whole document, so detectClueLifecycle flags it unresolved on the text
  // path too. Mystery lexicon + a literal '?' drive positive curiosity.
  [
    { op: 'SEED_CLUE', clueId: 'clue-photo', carrier: 'object' },
    { op: 'UPDATE_BELIEF', charId: 'bob', belief: belief('Why would anyone hide "a torn photograph" like this? It felt like such a strange, hidden secret.') },
    { op: 'UPDATE_READER_STATE', delta: { suspense: 1, curiosity: 2 } },
  ],
  // Scene 3 — RAISE_CLOCK 'clock-heist'. Deadline lexicon ('midnight') plus
  // danger lexicon ('trapped','danger') in the SAME scene's belief text gives
  // the text path both clockRaised and a matching positive suspense sign.
  [
    { op: 'RAISE_CLOCK', clockId: 'clock-heist', amount: 2 },
    { op: 'UPDATE_BELIEF', charId: 'bob', belief: belief('He warned her the deal ends at midnight, no more chances, or she would be trapped and in danger.') },
    { op: 'UPDATE_READER_STATE', delta: { suspense: 2, curiosity: 0 } },
  ],
  // Scene 4 — PAYOFF_SETUP 'clue-key', 3 scenes after the seed (>= the text
  // path's 2-scene minimum gap). Re-mentioning the exact quoted phrase is
  // what promotes it from "seeded" to "paid off" on the text path too.
  // curiosity intentionally negative here (a released-tension beat) — see
  // the "known asymmetry" test below: the text path's curiosity formula is
  // structurally non-negative, so this is an EXPECTED, documented mismatch.
  [
    { op: 'PAYOFF_SETUP', setupId: 'clue-key', payoffEventId: 'evt-key-found' },
    { op: 'UPDATE_BELIEF', charId: 'alice', belief: belief('At last she found "the brass key" exactly where he said it would be.') },
    { op: 'UPDATE_READER_STATE', delta: { suspense: 0, curiosity: -1 } },
  ],
  // Scene 5 — the revelation. A WITNESSED belief containing the literal
  // REVEAL_PATTERNS phrase "the truth is" makes the text path's
  // detectRevelation fire on the exact same scene as the ops path's
  // witnessed-belief revelation. "nowhere left to run" adds a danger-lexicon
  // hit ('run') so suspense sign also agrees.
  [
    { op: 'UPDATE_BELIEF', charId: 'alice', belief: belief('The truth is she orchestrated the whole heist herself, and now there was nowhere left to run.', 'witnessed') },
    { op: 'UPDATE_READER_STATE', delta: { suspense: 1, curiosity: 1 } },
  ],
  // Scene 6 — POSITIVE relationship shift (alice/bob). Both characters must
  // "speak" (i.e. each needs an UPDATE_BELIEF, since SHIFT_RELATIONSHIP's
  // rendered reason is action prose with no speaker) with enough combined
  // positive-valence lexicon hits (grateful/joy/hope/warmth/reunited = 5,
  // clears the text path's threshold of 2) to register a shift there too.
  // Relief words ('safe','quiet','stillness') separately push suspense
  // negative, matching the ops-path delta's sign.
  [
    { op: 'UPDATE_BELIEF', charId: 'alice', belief: belief('She said she was so grateful and full of joy to see him again.', 'told') },
    { op: 'UPDATE_BELIEF', charId: 'bob', belief: belief('He admitted he felt hope and warmth being reunited with her, safe now in the quiet stillness of the room.', 'told') },
    { op: 'SHIFT_RELATIONSHIP', pair: ['alice', 'bob'], delta: { dimension: 'trust', amount: 0.3, reason: 'renewed warmth between them' } },
    { op: 'APPRAISE_EMOTION', charId: 'alice', emotion: emotion({ dominant: 'joy', joy: 60, intensity: 60 }) },
    { op: 'UPDATE_READER_STATE', delta: { suspense: -1, curiosity: 0 } },
  ],
  // Scene 7 — second clock raise, same clock. "running out of time"/"last
  // chance" are both DEADLINE_TERMS; "running" is also DANGER_TENSION lexicon.
  [
    { op: 'RAISE_CLOCK', clockId: 'clock-heist', amount: 1.5 },
    { op: 'UPDATE_BELIEF', charId: 'bob', belief: belief('They were running out of time and the vault would seal at the last chance he had.') },
    { op: 'UPDATE_READER_STATE', delta: { suspense: 2, curiosity: 0 } },
  ],
  // Scene 8 — NEGATIVE relationship shift (carla/dan). Combined negative-
  // valence hits (betrayed/anger/hurt/resentment/pain/cold = 6) clear the
  // text path's threshold with a negative sum, matching the ops-path's
  // negative delta sign. APPRAISE_EMOTION distress → negative emotionalShift
  // on the ops path; the same negative-valence prose drives it on the text
  // path too.
  [
    { op: 'UPDATE_BELIEF', charId: 'carla', belief: belief('She said he betrayed her and now she feels nothing but anger and hurt.', 'told') },
    { op: 'UPDATE_BELIEF', charId: 'dan', belief: belief('He admitted the resentment and pain between them was real and cold.', 'told') },
    { op: 'SHIFT_RELATIONSHIP', pair: ['carla', 'dan'], delta: { dimension: 'resentment', amount: -0.4, reason: 'the betrayal fractured their trust' } },
    { op: 'APPRAISE_EMOTION', charId: 'carla', emotion: emotion({ dominant: 'distress', distress: 55, intensity: 55 }) },
    { op: 'UPDATE_READER_STATE', delta: { suspense: 0, curiosity: 0 } },
  ],
  // Scene 9 — climax. Dense danger lexicon (gun/blood/running/panic) drives
  // high positive suspense on both paths; fear/hurt are also NEGATIVE_VALENCE
  // words, agreeing with APPRAISE_EMOTION's dominant 'fear'. curiosity
  // intentionally negative again (second instance of the documented
  // known asymmetry, deliberately exercising "both signs" per spec).
  [
    { op: 'UPDATE_BELIEF', charId: 'alice', belief: belief('She screamed as the gun went off, blood on the floor, everyone running in fear and hurt and panic.') },
    { op: 'APPRAISE_EMOTION', charId: 'alice', emotion: emotion({ dominant: 'fear', fear: 80, intensity: 80 }) },
    { op: 'UPDATE_READER_STATE', delta: { suspense: 4, curiosity: -1 } },
  ],
];

// ── GOLDEN STORY B — "The Wedding Ring" (9 scenes) ──────────────────────────
// Same design principles as Story A, different vocabulary/characters, so the
// measured sign-agreement stats below are pooled over a broader sample than
// one story alone would give.
const STORY_B_SCENES: StoryOp[][] = [
  [
    { op: 'UPDATE_BELIEF', charId: 'erin', belief: belief('The lake house was calm, quiet, and peaceful at dawn.') },
    { op: 'UPDATE_READER_STATE', delta: { suspense: -1, curiosity: 0 } },
  ],
  [
    { op: 'SEED_CLUE', clueId: 'clue-ring', carrier: 'object' },
    { op: 'UPDATE_BELIEF', charId: 'erin', belief: belief('Why was "a wedding ring" hidden in the strange, secret drawer?') },
    { op: 'UPDATE_READER_STATE', delta: { suspense: 0, curiosity: 2 } },
  ],
  [
    { op: 'RAISE_CLOCK', clockId: 'clock-storm', amount: 2 },
    { op: 'UPDATE_BELIEF', charId: 'frank', belief: belief('The storm would hit before dawn, and they would be trapped with nowhere to run.') },
    { op: 'UPDATE_READER_STATE', delta: { suspense: 2, curiosity: 0 } },
  ],
  // clue-letter is seeded here and NEVER paid off — the second unresolved-clue
  // example in the corpus.
  [
    { op: 'SEED_CLUE', clueId: 'clue-letter', carrier: 'line' },
    { op: 'UPDATE_BELIEF', charId: 'grace', belief: belief('She kept "an old letter" folded in her coat, and never spoke of its strange secret again.') },
    { op: 'UPDATE_READER_STATE', delta: { suspense: 0, curiosity: 1 } },
  ],
  // Payoff of clue-ring, gap of 3 scenes (>= the 2-scene minimum).
  [
    { op: 'PAYOFF_SETUP', setupId: 'clue-ring', payoffEventId: 'evt-ring-found' },
    { op: 'UPDATE_BELIEF', charId: 'erin', belief: belief('There it was again — "a wedding ring" — proof of everything she feared.') },
    { op: 'UPDATE_READER_STATE', delta: { suspense: 1, curiosity: -1 } },
  ],
  // Positive relationship shift (erin/frank).
  [
    { op: 'UPDATE_BELIEF', charId: 'erin', belief: belief('She said she felt such relief, gratitude, and joy at his kindness.', 'told') },
    { op: 'UPDATE_BELIEF', charId: 'frank', belief: belief('He admitted he felt trust and warmth, grateful to be forgiven.', 'told') },
    { op: 'SHIFT_RELATIONSHIP', pair: ['erin', 'frank'], delta: { dimension: 'trust', amount: 0.25, reason: 'a quiet reconciliation' } },
    { op: 'APPRAISE_EMOTION', charId: 'erin', emotion: emotion({ dominant: 'joy', joy: 55, intensity: 55 }) },
    { op: 'UPDATE_READER_STATE', delta: { suspense: -1, curiosity: 0 } },
  ],
  [
    { op: 'RAISE_CLOCK', clockId: 'clock-storm', amount: 1.5 },
    { op: 'UPDATE_BELIEF', charId: 'frank', belief: belief('This was their last chance before the bridge collapsed and they were trapped with the water rising.') },
    { op: 'UPDATE_READER_STATE', delta: { suspense: 2, curiosity: 0 } },
  ],
  // Negative relationship shift (grace/henry).
  [
    { op: 'UPDATE_BELIEF', charId: 'grace', belief: belief('She said she felt only anger and betrayed, hurt beyond repair.', 'told') },
    { op: 'UPDATE_BELIEF', charId: 'henry', belief: belief('He admitted his resentment and grief had made him cold and distant.', 'told') },
    { op: 'SHIFT_RELATIONSHIP', pair: ['grace', 'henry'], delta: { dimension: 'resentment', amount: -0.35, reason: 'years of resentment surfaced' } },
    { op: 'APPRAISE_EMOTION', charId: 'grace', emotion: emotion({ dominant: 'distress', distress: 50, intensity: 50 }) },
    { op: 'UPDATE_READER_STATE', delta: { suspense: 0, curiosity: 0 } },
  ],
  // Revelation + climax combined.
  [
    { op: 'UPDATE_BELIEF', charId: 'frank', belief: belief('The truth is the ring never belonged to her at all — she had been betrayed, and felt nothing but fear and hurt as the dark truth closed in around her.', 'witnessed') },
    { op: 'APPRAISE_EMOTION', charId: 'frank', emotion: emotion({ dominant: 'fear', fear: 70, intensity: 70 }) },
    { op: 'UPDATE_READER_STATE', delta: { suspense: 3, curiosity: 1 } },
  ],
];

const A = runBothPaths(STORY_A_SCENES, 'THE BRASS KEY');
const B = runBothPaths(STORY_B_SCENES, 'THE WEDDING RING');

// ── Small targeted probe: the relationshipShifts KNOWN LIMITATION ──────────
// A SHIFT_RELATIONSHIP with no accompanying UPDATE_BELIEF from either party in
// the same scene: the ops path still records the shift; the text path can't,
// because its detectRelationshipShifts requires two CO-SPEAKING characters
// (a Fountain character-cue block) in the scene, and SHIFT_RELATIONSHIP's
// rendered `reason` is bare action prose with no speaker attached. This is
// the general-case gap the two golden stories above deliberately paper over
// by also authoring valence-bearing dialogue for both parties.
const PROBE = runBothPaths(
  [
    [{ op: 'UPDATE_BELIEF', charId: 'ivy', belief: belief('The warehouse sat empty near the docks tonight.') }],
    [{ op: 'SHIFT_RELATIONSHIP', pair: ['ivy', 'jack'], delta: { dimension: 'trust', amount: 0.5, reason: 'logistics of the handoff went smoothly' } }],
  ],
  'PROBE',
);

// ── The parity matrix ─────────────────────────────────────────────────────────
// Every ScreenplaySceneRecord field, classified into exactly one tier. This
// object is typed Record<keyof ScreenplaySceneRecord, ParityTier> — the
// compile-time-checked list the spec calls for: `npm run lint` (tsc --noEmit)
// fails if memory.ts ever adds a field without a corresponding entry here,
// exactly like STORY_OP_KINDS in ops/StoryOp.ts guards op exhaustiveness.
type ParityTier =
  | 'STRUCTURAL_EXACT'              // identical on both paths, no tolerance
  | 'STRUCTURAL_DIVERGENT'          // documented finding: genuinely never equal
  | 'PRESENCE'                      // existence/co-occurrence, not identity
  | 'SIGN'                          // categorical/sign agreement, measured rate
  | 'KNOWN_ASYMMETRY_TEXT_ONLY'     // text-path-only field; ops path omits it
  | 'NOT_COMPARED_IDENTIFIER'       // bookkeeping id/timestamp, not a signal
  | 'NOT_COMPARED_FREEFORM';        // free-text/categorical, no parity contract

const PARITY_MATRIX: Record<keyof ScreenplaySceneRecord, ParityTier> = {
  commitId: 'NOT_COMPARED_IDENTIFIER',        // 'commit-N' vs 'fountain-scene-N' — different id schemes by design
  sceneIdx: 'STRUCTURAL_EXACT',
  slug: 'STRUCTURAL_DIVERGENT',               // for THESE golden stories (no commit carries an ADD_FACT 'moves_to' fact); Run 17-B's sceneSlug (project/index.ts) now renders the SAME location-aware template memory.ts's deriveSlug uses, so a commit that DOES carry a relocation fact gets a byte-identical (STRUCTURAL_EXACT) slug on both paths — see the "location-aware slug" describe block below, which is the positive case. Neither golden story exercises a relocation fact, so the tier pinned here (documenting the placeholder-fallback case) is unchanged.
  purpose: 'NOT_COMPARED_FREEFORM',           // ops purpose keys off ops directly; text purpose keys off content/position heuristics — independently derived, no contract
  dramaticTurn: 'NOT_COMPARED_FREEFORM',      // ops-path dramaticTurn is pulled from ADD_FACT/belief text that compile.ts never renders verbatim
  revelation: 'PRESENCE',
  emotionalShift: 'SIGN',
  visualBeats: 'NOT_COMPARED_FREEFORM',
  dialogueHighlights: 'NOT_COMPARED_FREEFORM', // ops-path pulls raw belief.proposition; text-path pulls raw dialogue lines (incl. the "(believing) " prefix) — never textually equal
  unresolvedClues: 'PRESENCE',
  seededClueIds: 'PRESENCE',
  payoffSetupIds: 'PRESENCE',
  clockRaised: 'PRESENCE',                    // ±1 scene tolerance — RAISE_CLOCK itself renders no text; only an adjacent belief/reason carries the deadline lexicon
  clockDelta: 'NOT_COMPARED_FREEFORM',        // magnitude, not classified into SIGN/PRESENCE — no spec requirement to compare it numerically
  suspenseDelta: 'SIGN',
  curiosityDelta: 'SIGN',                     // KNOWN ASYMMETRY folded into this tier: text-path formula is structurally non-negative (see below)
  relationshipShifts: 'PRESENCE',             // KNOWN LIMITATION when dialogue lacks co-speaking valence lexicon — see PROBE above
  questionsRaised: 'KNOWN_ASYMMETRY_TEXT_ONLY',
  questionsResolved: 'KNOWN_ASYMMETRY_TEXT_ONLY',
  questionsResolvedSameScene: 'KNOWN_ASYMMETRY_TEXT_ONLY',
  questionsUnresolved: 'KNOWN_ASYMMETRY_TEXT_ONLY',
  // Wave 1186 (Program v2, Type 1 signal channel): power-balance shifts.
  // text-path-only, same tier as the questionsRaised family above — the
  // ops-derived path has no raw dialogue text to score for imperatives,
  // interruptions, or accusatory phrasing, so annotateCommit never populates
  // these (see memory.ts's Wave 1186 field comment).
  powerHolder: 'KNOWN_ASYMMETRY_TEXT_ONLY',
  powerBalance: 'KNOWN_ASYMMETRY_TEXT_ONLY',
  powerFlipped: 'KNOWN_ASYMMETRY_TEXT_ONLY',
  // Wave 1190 (Program v2, Type 1 signal channel #3): speaking-character count
  // per scene. text-path-only, same tier as the powerHolder/questionsRaised
  // families above — the ops-derived path carries no raw dialogue text or
  // speaker attribution to count distinct speakers against (UPDATE_BELIEF's
  // charId is the belief-holder, not necessarily who spoke), so annotateCommit
  // never populates this (see memory.ts's Wave 1190 field comment).
  speakingCharacterCount: 'KNOWN_ASYMMETRY_TEXT_ONLY',
  // Wave 1192 (Program v2, Type 1 signal channel, cycle 3): the three Wave
  // E1-c lexicon signals, wired onto the record. Tiers MEASURED against the
  // two golden stories (see the "Wave 1192 lexicon signals" describe below
  // for the pinned per-scene numbers and the capability probes):
  //
  // betrayalSignal — SIGN. Both paths emit (text: BETRAYAL−LOYALTY lexicon
  // hits; ops: −trust-shift amount + jealousy/rivalry-shift amount), and the
  // BETRAYAL_PROBE below demonstrates sign agreement in both directions when
  // the shift's reason prose carries the matching lexicon (exactly the
  // relationshipShifts co-authoring discipline). MEASURED golden-story
  // reality, pinned rather than papered over: the two paths' nonzero scenes
  // are DISJOINT on these fixtures — the ops path lights up where trust
  // shifts (A s6, B s5; loyalty-ward, negative) while the text path lights up
  // where 'betrayed' appears in prose whose op-shift dimension is resentment,
  // which the ops derivation deliberately does not read (A s8; B s7, s8).
  // The SIGN contract therefore applies to jointly-nonzero scenes (probe-
  // demonstrated), with the golden disjointness documented as the honest
  // baseline, same structure as curiosityDelta's folded asymmetry above.
  betrayalSignal: 'SIGN',
  // powerDynamicsIntensity — PRESENCE. Text path counts dominance/submission
  // verbs; ops path sums |amount| over respect/rivalry/dependency/obligation
  // shifts. MEASURED: both paths are 0 on every scene of both golden stories
  // (neither fixture stages a control contest — trivially agreeing), and the
  // POWER_PROBE below demonstrates nonzero/nonzero presence agreement when a
  // respect-dimension shift's reason carries dominance lexicon. Magnitudes
  // are never compared (float |amount| sums vs integer verb counts).
  powerDynamicsIntensity: 'PRESENCE',
  // ironyMarkerCount — text-path-only, same tier as questionsRaised/
  // powerHolder/speakingCharacterCount above: StoryOps carry no tonal stance
  // (a belief proposition records WHAT is believed, not whether the line
  // delivering it is sincere or sarcastic), so annotateCommit never populates
  // it — see memory.ts's Wave 1192 field comment.
  ironyMarkerCount: 'KNOWN_ASYMMETRY_TEXT_ONLY',
  createdAt: 'NOT_COMPARED_IDENTIFIER',       // ops path = real epoch ms; text path = scene index integer — never comparable
};

// ── TIER: STRUCTURAL EXACT / DIVERGENT ──────────────────────────────────────

describe('record parity — structural (scene count exact; slug divergence documented)', () => {
  for (const [label, pair, sceneCount] of [
    ['Story A', A, STORY_A_SCENES.length],
    ['Story B', B, STORY_B_SCENES.length],
  ] as const) {
    it(`${label}: scene count is exactly equal on both paths (${sceneCount} scenes)`, () => {
      assert.equal(pair.opsRecords.length, sceneCount);
      assert.equal(pair.textRecords.length, sceneCount);
      assert.equal(pair.opsRecords.length, pair.textRecords.length);
    });

    it(`${label}: sceneIdx sequence is 0..n-1 and identical on both paths`, () => {
      const expected = Array.from({ length: sceneCount }, (_, i) => i);
      assert.deepEqual(pair.opsRecords.map(r => r.sceneIdx), expected);
      assert.deepEqual(pair.textRecords.map(r => r.sceneIdx), expected);
    });

    // FINDING (UPDATED — Run 17-B): slug remains classified STRUCTURAL_DIVERGENT
    // for THESE golden stories specifically because neither authors an
    // ADD_FACT 'moves_to' fact — but the underlying gap this test originally
    // contracted (projectFountain silently discarding location info) is now
    // PARTIALLY closed. project/index.ts's sceneSlug renders the exact same
    // template memory.ts's deriveSlug uses (`INT. ${LOCATION} — SCENE
    // ${idx+1}`) whenever a commit DOES carry a relocation fact — see the
    // "location-aware slug" describe block immediately below for the positive
    // case, which is now STRUCTURAL_EXACT. The placeholder fallback asserted
    // here (`INT. SCENE ${idx} - CONTINUOUS` vs memory.ts's
    // `INT. UNKNOWN — SCENE ${idx+1}`) is deliberately UNCHANGED rather than
    // also unified: tests/core/core-01.test.ts's "fountain output contains
    // title and scene headers" check asserts `artifact.content.includes('INT.
    // SCENE')` verbatim against a canon with no relocation fact, which is
    // outside this wave's file ownership — so the no-location fallback is
    // intentionally left exactly as it was rather than invented into a
    // divergence with a test this wave doesn't own.
    it(`${label}: slug text genuinely diverges when no commit carries location info (documented, not normalized)`, () => {
      for (let i = 0; i < sceneCount; i++) {
        assert.notEqual(
          pair.opsRecords[i].slug, pair.textRecords[i].slug,
          `expected divergence at scene ${i}: ops="${pair.opsRecords[i].slug}" text="${pair.textRecords[i].slug}"`,
        );
      }
    });
  }
});

// ── TIER: STRUCTURAL EXACT — location-aware slug (Run 17-B) ────────────────
// The positive case the finding above points to: a commit that DOES carry an
// ADD_FACT 'moves_to' fact now renders a slug that matches memory.ts's
// deriveSlug BYTE-FOR-BYTE, because project/index.ts's sceneSlug (Run 17-B)
// mirrors deriveSlug's exact template rather than inventing its own.
describe('record parity — location-aware slug is STRUCTURAL_EXACT when a commit carries location info', () => {
  const LOCATION_PROBE = runBothPaths(
    [[
      { op: 'ADD_FACT', fact: { factId: 'f-reloc', subject: 'nora', predicate: 'moves_to', object: 'the docks', addedAtTurn: 0, validFrom: 0, validTo: null } },
    ]],
    'LOCATION PROBE',
  );

  it('ops-derived and text-derived slugs are byte-identical for a commit with an ADD_FACT moves_to fact', () => {
    assert.equal(LOCATION_PROBE.opsRecords[0].slug, LOCATION_PROBE.textRecords[0].slug);
    assert.equal(LOCATION_PROBE.opsRecords[0].slug, 'INT. THE DOCKS — SCENE 1');
  });
});

// ── TIER: PRESENCE ───────────────────────────────────────────────────────────

describe('record parity — presence (clues, clock, revelation, relationship shifts)', () => {
  it('Story A: clue-key is seeded then paid off on the ops path, and its exact quoted phrase is seeded then paid off on the text path', () => {
    assert.ok(flatten(A.opsRecords, 'seededClueIds').includes('clue-key'));
    assert.ok(flatten(A.opsRecords, 'payoffSetupIds').includes('clue-key'));
    assert.ok(flatten(A.textRecords, 'seededClueIds').includes('the-brass-key'));
    assert.ok(flatten(A.textRecords, 'payoffSetupIds').includes('the-brass-key'));
  });

  it('Story A: clue-photo is seeded and never paid off (unresolved) on both paths', () => {
    assert.ok(flatten(A.opsRecords, 'seededClueIds').includes('clue-photo'));
    assert.ok(flatten(A.opsRecords, 'unresolvedClues').includes('clue-photo'));
    assert.ok(!flatten(A.opsRecords, 'payoffSetupIds').includes('clue-photo'));
    assert.ok(flatten(A.textRecords, 'seededClueIds').includes('a-torn-photograph'));
    assert.ok(flatten(A.textRecords, 'unresolvedClues').includes('a-torn-photograph'));
  });

  it('Story B: clue-ring is seeded then paid off on both paths', () => {
    assert.ok(flatten(B.opsRecords, 'seededClueIds').includes('clue-ring'));
    assert.ok(flatten(B.opsRecords, 'payoffSetupIds').includes('clue-ring'));
    assert.ok(flatten(B.textRecords, 'seededClueIds').includes('a-wedding-ring'));
    assert.ok(flatten(B.textRecords, 'payoffSetupIds').includes('a-wedding-ring'));
  });

  it('Story B: clue-letter is seeded and never paid off (unresolved) on both paths', () => {
    assert.ok(flatten(B.opsRecords, 'seededClueIds').includes('clue-letter'));
    assert.ok(flatten(B.opsRecords, 'unresolvedClues').includes('clue-letter'));
    assert.ok(flatten(B.textRecords, 'seededClueIds').includes('an-old-letter'));
    assert.ok(flatten(B.textRecords, 'unresolvedClues').includes('an-old-letter'));
  });

  // ±1 SCENE TOLERANCE, commented why: RAISE_CLOCK renders no Fountain text of
  // its own — clockRaised on the text path depends entirely on an adjacent
  // belief/relationship-reason carrying a DEADLINE_TERMS word, which a real
  // compiled draft might place one scene off from where the ledger raised the
  // clock. Our fixture happens to land the deadline word in the identical
  // scene both times (measured below), but the tolerance is the honest
  // general contract, not an artifact of this particular fixture.
  for (const [label, pair] of [['Story A', A], ['Story B', B]] as const) {
    it(`${label}: every ops-path clock raise has a clockRaised text-path scene within ±1`, () => {
      const opsClockScenes = pair.opsRecords.filter(r => r.clockRaised).map(r => r.sceneIdx);
      assert.ok(opsClockScenes.length >= 2, `${label} fixture must raise the clock at least twice, got ${opsClockScenes.length}`);
      for (const idx of opsClockScenes) {
        const nearby = [idx - 1, idx, idx + 1].some(j => pair.textRecords[j]?.clockRaised === true);
        assert.ok(nearby, `${label} scene ${idx}: no clockRaised text-path scene within ±1 (text clock scenes: ${pair.textRecords.filter(r => r.clockRaised).map(r => r.sceneIdx)})`);
      }
      // MEASURED: in both golden stories the deadline lexicon was co-authored
      // into the exact same scene as the RAISE_CLOCK op, so exact-scene match
      // (the strictest case the ±1 window allows) is what's actually observed.
      for (const idx of opsClockScenes) {
        assert.equal(pair.textRecords[idx]?.clockRaised, true, `${label} scene ${idx}: exact-scene match (measured, not required)`);
      }
    });
  }

  // Revelation: no scene tolerance in the spec for this field — a witnessed
  // belief containing a REVEAL_PATTERNS phrase renders into the SAME Fountain
  // scene, so detectRevelation and the ops-path's witnessed-belief check see
  // it in the same scene.
  it('Story A: revelation is non-null in scene 5 on both paths', () => {
    assert.notEqual(A.opsRecords[5].revelation, null);
    assert.notEqual(A.textRecords[5].revelation, null);
  });
  it('Story B: revelation is non-null in scene 8 on both paths', () => {
    assert.notEqual(B.opsRecords[8].revelation, null);
    assert.notEqual(B.textRecords[8].revelation, null);
  });

  // Relationship shifts: PRESENCE + sign, pairKey normalized case-insensitive
  // (see normalizePairKey doc comment — casing differs by construction, not
  // by bug). Both a positive and a negative shift are exercised per story.
  function findShift(records: ScreenplaySceneRecord[], sceneIdx: number, pairKeyLower: string) {
    return (records[sceneIdx].relationshipShifts ?? []).find(s => normalizePairKey(s.pairKey) === pairKeyLower);
  }

  it('Story A: positive shift (alice/bob, scene 6) present with agreeing sign on both paths', () => {
    const opsShift = findShift(A.opsRecords, 6, 'alice|bob');
    const textShift = findShift(A.textRecords, 6, 'alice|bob');
    assert.ok(opsShift, 'ops-path shift present');
    assert.ok(textShift, 'text-path shift present');
    assert.equal(sign(opsShift!.amount), 1);
    assert.equal(sign(textShift!.amount), 1);
  });
  it('Story A: negative shift (carla/dan, scene 8) present with agreeing sign on both paths', () => {
    const opsShift = findShift(A.opsRecords, 8, 'carla|dan');
    const textShift = findShift(A.textRecords, 8, 'carla|dan');
    assert.ok(opsShift, 'ops-path shift present');
    assert.ok(textShift, 'text-path shift present');
    assert.equal(sign(opsShift!.amount), -1);
    assert.equal(sign(textShift!.amount), -1);
  });
  it('Story B: positive shift (erin/frank, scene 5) present with agreeing sign on both paths', () => {
    const opsShift = findShift(B.opsRecords, 5, 'erin|frank');
    const textShift = findShift(B.textRecords, 5, 'erin|frank');
    assert.ok(opsShift, 'ops-path shift present');
    assert.ok(textShift, 'text-path shift present');
    assert.equal(sign(opsShift!.amount), 1);
    assert.equal(sign(textShift!.amount), 1);
  });
  it('Story B: negative shift (grace/henry, scene 7) present with agreeing sign on both paths', () => {
    const opsShift = findShift(B.opsRecords, 7, 'grace|henry');
    const textShift = findShift(B.textRecords, 7, 'grace|henry');
    assert.ok(opsShift, 'ops-path shift present');
    assert.ok(textShift, 'text-path shift present');
    assert.equal(sign(opsShift!.amount), -1);
    assert.equal(sign(textShift!.amount), -1);
  });

  // KNOWN LIMITATION, contracted rather than silently skipped: a
  // SHIFT_RELATIONSHIP with no co-speaking valence dialogue in the same scene
  // is invisible to the text path. Demonstrated directly via PROBE (see its
  // definition above for the mechanism). This is a real product gap — a
  // relationship shift authored purely through the mechanism (not through
  // character dialogue) never survives the ops→Fountain→text round trip —
  // worth a ROADMAP follow-up to either (a) have compile.ts render the shift
  // as a character-attributed line, or (b) have the text-path heuristic fall
  // back to scanning action-prose valence when no two characters co-speak.
  it('KNOWN LIMITATION: a relationship shift with no co-speaking dialogue is present on the ops path but absent on the text path', () => {
    assert.equal(PROBE.opsRecords[1].relationshipShifts?.length, 1, 'ops path records the shift from the SHIFT_RELATIONSHIP op alone');
    assert.equal(PROBE.textRecords[1].relationshipShifts?.length, 0, 'documented gap: text path requires two co-speaking characters, which this scene has none of — see comment above');
  });
});

// ── TIER: PRESENCE — compiler-richness capability (Run 17-B) ───────────────
// Before Run 17-B, the ONLY reason seededClueIds/payoffSetupIds/clockRaised
// ever matched on the text path was that every golden-story scene ABOVE also
// carries a co-authored UPDATE_BELIEF whose prose happens to repeat the
// clue's quoted phrase or a deadline word (see the file-header comment). That
// discipline demonstrates a real author's dialogue CAN carry these signals,
// but it never proved the *compiler* carries them — a story whose SEED_CLUE/
// PAYOFF_SETUP/RAISE_CLOCK/UPDATE_READER_STATE ops have no such accompanying
// belief text would previously have compiled to Fountain with NO trace of
// them at all. This probe is deliberately belief-text-free (its filler
// UPDATE_BELIEF scenes are lexically inert — no clue phrase, no deadline
// word, no valence) so every PRESENCE-tier signal recovered below is
// attributable to the op's OWN rendering (server/nvm/project/index.ts's
// renderFountainOp), not to co-authored prose.
const RICHNESS_PROBE = runBothPaths(
  [
    [{ op: 'SEED_CLUE', clueId: 'clue-locket', carrier: 'object' }],
    [{ op: 'UPDATE_BELIEF', charId: 'filler', belief: belief('Nothing of note happens in this scene.') }],
    [{ op: 'UPDATE_BELIEF', charId: 'filler', belief: belief('Still nothing of note happens here.') }],
    [{ op: 'PAYOFF_SETUP', setupId: 'clue-locket', payoffEventId: 'evt-locket' }],
    [{ op: 'RAISE_CLOCK', clockId: 'clock-fuse', amount: 1 }],
    [{ op: 'UPDATE_READER_STATE', delta: { suspense: 2, curiosity: 0 } }],
  ],
  'RICHNESS PROBE',
);

describe('record parity — compiler-richness capability: PRESENCE fields now survive WITHOUT co-authored belief lexicon', () => {
  it('SEED_CLUE alone (no accompanying belief text) is recoverable as a seeded clue on the text path', () => {
    assert.ok(flatten(RICHNESS_PROBE.textRecords, 'seededClueIds').includes('locket'));
  });
  it('PAYOFF_SETUP alone, 3 scenes later (no accompanying belief text), is recoverable as a paid-off clue on the text path', () => {
    assert.ok(flatten(RICHNESS_PROBE.textRecords, 'payoffSetupIds').includes('locket'));
  });
  it('RAISE_CLOCK alone (no accompanying deadline belief) sets clockRaised on the text path', () => {
    assert.equal(RICHNESS_PROBE.textRecords[4].clockRaised, true);
  });
  it('UPDATE_READER_STATE alone (no accompanying belief text) yields a matching-sign suspenseDelta on the text path', () => {
    assert.equal(sign(RICHNESS_PROBE.opsRecords[5].suspenseDelta), 1);
    assert.equal(sign(RICHNESS_PROBE.textRecords[5].suspenseDelta), 1);
  });
});

// ── TIER: SIGN / DIRECTION ───────────────────────────────────────────────────

describe('record parity — sign/direction (measured agreement, pinned with headroom)', () => {
  const allOps = [...A.opsRecords, ...B.opsRecords];
  const allText = [...A.textRecords, ...B.textRecords];
  const n = allOps.length; // 19 (10 + 9)

  function agreementRate(field: 'suspenseDelta' | 'curiosityDelta'): number {
    let agree = 0;
    for (let i = 0; i < n; i++) if (sign(allOps[i][field]) === sign(allText[i][field])) agree++;
    return agree / n;
  }

  // MEASURED (see /tmp scratch harness used during authoring, reproduced by
  // this very computation): 19/19 scenes agree in suspenseDelta sign once the
  // golden stories' prose was co-designed with matching danger/relief
  // lexicon. Pinned at 0.90 — comfortably below the measured 1.0, leaving
  // headroom so a future wave's lexicon tweak doesn't make this test flaky
  // over noise while still catching real regressions.
  const SUSPENSE_SIGN_THRESHOLD = 0.90;
  it(`suspenseDelta sign agreement is >= ${SUSPENSE_SIGN_THRESHOLD} across both golden stories (measured 19/19 = 1.00 at authoring time)`, () => {
    const rate = agreementRate('suspenseDelta');
    assert.ok(rate >= SUSPENSE_SIGN_THRESHOLD, `suspenseDelta sign agreement ${rate.toFixed(3)} fell below pinned threshold ${SUSPENSE_SIGN_THRESHOLD}`);
  });

  // MEASURED: 16/19 = 0.842. The 3 disagreements are ALL the deliberate
  // negative-curiosity ops scenes (Story A scenes 4 & 9, Story B scene 4) —
  // see the KNOWN ASYMMETRY test below, which contracts those exact 3 cases.
  // Every OTHER scene agrees (16/16 = 1.00), so 0.842 is the honest ceiling
  // for this corpus, not an undershoot to paper over. Pinned at 0.75.
  const CURIOSITY_SIGN_THRESHOLD = 0.75;
  it(`curiosityDelta sign agreement is >= ${CURIOSITY_SIGN_THRESHOLD} across both golden stories (measured 16/19 = 0.842 at authoring time)`, () => {
    const rate = agreementRate('curiosityDelta');
    assert.ok(rate >= CURIOSITY_SIGN_THRESHOLD, `curiosityDelta sign agreement ${rate.toFixed(3)} fell below pinned threshold ${CURIOSITY_SIGN_THRESHOLD}`);
  });

  // KNOWN ASYMMETRY, contracted explicitly (not folded silently into the
  // aggregate rate above): detectCuriosityDelta's formula
  // (questionMarks*0.8 + mysteryHits*1.2, clamped to [-2,5]) has NO term that
  // can go negative — both addends are counts, never negative. So ANY
  // ops-path scene with a negative UPDATE_READER_STATE curiosity delta is
  // structurally guaranteed to disagree with the text path, which floors at
  // 0. This is not a lexicon-authoring gap to fix; it's a formula-shape
  // asymmetry. Both golden stories deliberately include such scenes (per the
  // task's "both signs" requirement) specifically so this asymmetry is
  // exercised and pinned, not accidentally avoided.
  it('KNOWN ASYMMETRY: every ops-path negative curiosityDelta scene has a non-negative (never negative) text-path curiosityDelta', () => {
    const negativeOpsScenes = allOps
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.curiosityDelta < 0);
    assert.ok(negativeOpsScenes.length >= 3, `fixture must exercise negative curiosityDelta at least 3 times, got ${negativeOpsScenes.length}`);
    for (const { i } of negativeOpsScenes) {
      assert.ok(allText[i].curiosityDelta >= 0, `text-path curiosityDelta at pooled index ${i} was negative — the structural floor assumption broke`);
    }
  });

  // MEASURED: 19/19 = 1.00. Every APPRAISE_EMOTION-bearing scene was
  // co-authored with matching valence lexicon in its rendered belief/reason
  // text. Pinned at 0.90.
  const EMOTION_AGREEMENT_THRESHOLD = 0.90;
  it(`emotionalShift categorical agreement is >= ${EMOTION_AGREEMENT_THRESHOLD} across both golden stories (measured 19/19 = 1.00 at authoring time)`, () => {
    let agree = 0;
    for (let i = 0; i < n; i++) if (allOps[i].emotionalShift === allText[i].emotionalShift) agree++;
    const rate = agree / n;
    assert.ok(rate >= EMOTION_AGREEMENT_THRESHOLD, `emotionalShift agreement ${rate.toFixed(3)} fell below pinned threshold ${EMOTION_AGREEMENT_THRESHOLD}`);
  });
});

// ── TIER: KNOWN ASYMMETRY (text-only fields) ────────────────────────────────

describe('record parity — known asymmetry: question-answer latency fields are text-only', () => {
  // Per memory.ts's own field doc comment: "Optional only so legacy/test
  // fixtures and the ops-derived path (StoryOps carry no raw dialogue text to
  // lex-match against) still typecheck; consumers should treat absence as 0."
  // Contracted here so a future wave can't accidentally start populating one
  // side without updating the other, or silently drop the field from the
  // text path, without a test noticing.
  const QUESTION_FIELDS = ['questionsRaised', 'questionsResolved', 'questionsResolvedSameScene', 'questionsUnresolved'] as const;

  for (const [label, pair] of [['Story A', A], ['Story B', B]] as const) {
    it(`${label}: ops-path records never populate any question-latency field`, () => {
      for (const r of pair.opsRecords) {
        for (const field of QUESTION_FIELDS) {
          assert.equal(r[field], undefined, `ops-path scene ${r.sceneIdx} unexpectedly set ${field}`);
        }
      }
    });

    it(`${label}: text-path records always populate all four question-latency fields as numbers`, () => {
      for (const r of pair.textRecords) {
        for (const field of QUESTION_FIELDS) {
          assert.equal(typeof r[field], 'number', `text-path scene ${r.sceneIdx} did not populate ${field} as a number`);
        }
      }
    });
  }
});

// ── DRIFT TRIPWIRE ───────────────────────────────────────────────────────────

describe('record parity — drift tripwire', () => {
  it('every field either producer actually emits is classified in PARITY_MATRIX', () => {
    const observed = new Set<string>();
    for (const r of [...A.opsRecords, ...A.textRecords, ...B.opsRecords, ...B.textRecords, ...PROBE.opsRecords, ...PROBE.textRecords]) {
      for (const k of Object.keys(r)) observed.add(k);
    }
    const classified = new Set(Object.keys(PARITY_MATRIX));
    for (const key of observed) {
      assert.ok(classified.has(key), `classify new field ${key} in the parity matrix`);
    }
  });

  it('every PARITY_MATRIX entry corresponds to a field at least one producer actually emits (no stale entries)', () => {
    const observed = new Set<string>();
    for (const r of [...A.opsRecords, ...A.textRecords, ...B.opsRecords, ...B.textRecords]) {
      for (const k of Object.keys(r)) observed.add(k);
    }
    for (const key of Object.keys(PARITY_MATRIX)) {
      assert.ok(observed.has(key), `parity matrix entry "${key}" no longer appears on either producer — remove or update it`);
    }
  });

  it('PARITY_MATRIX classifies all 26 known ScreenplaySceneRecord fields (sanity count)', () => {
    // Not a substitute for the compile-time Record<keyof ScreenplaySceneRecord, ParityTier>
    // check above (that's what actually fails `npm run lint` on a new field) —
    // this just guards against someone hand-editing PARITY_MATRIX's runtime
    // shape independently of the type. 22 through Wave 1182, +3 for Wave
    // 1186's powerHolder/powerBalance/powerFlipped, +1 for Wave 1190's
    // speakingCharacterCount, +3 for Wave 1192's betrayalSignal/
    // powerDynamicsIntensity/ironyMarkerCount.
    assert.equal(Object.keys(PARITY_MATRIX).length, 29);
  });
});

// ── TIER: SIGN / PRESENCE / KNOWN ASYMMETRY — Wave 1192 lexicon signals ─────
// betrayalSignal (SIGN), powerDynamicsIntensity (PRESENCE), ironyMarkerCount
// (KNOWN_ASYMMETRY_TEXT_ONLY). Every number below was MEASURED against the
// golden stories before pinning, per this file's standing discipline. The
// probes exist because the golden stories were authored before this channel
// and (measured, honestly documented below) never light BOTH paths up on the
// same scene — the probes demonstrate the agreement contract on inputs that
// actually exercise it, exactly like PROBE/RICHNESS_PROBE above.

// SHIFT_RELATIONSHIP renders its `reason` as an action-line sentence
// (project/index.ts), so a reason co-authored with the matching lexicon is
// visible to the text path with no accompanying belief text — the same
// mechanism the compiler-richness probe relies on.
const BETRAYAL_PROBE = runBothPaths(
  [
    [{ op: 'UPDATE_BELIEF', charId: 'filler', belief: belief('Nothing of note happens in this scene.') }],
    // Betrayal-ward: trust falls (ops: -(-0.5) = +0.5) and the reason names
    // the betrayal (text: 'betrayed' + 'traitor' = +2 betrayal hits).
    [{ op: 'SHIFT_RELATIONSHIP', pair: ['mara', 'joss'], delta: { dimension: 'trust', amount: -0.5, reason: 'she betrayed him and turned traitor' } }],
    // Loyalty-ward: trust rises (ops: -(+0.5) = -0.5) and the reason affirms
    // the bond (text: 'loyal' + 'faithful' = -2, loyalty-dominant).
    [{ op: 'SHIFT_RELATIONSHIP', pair: ['mara', 'joss'], delta: { dimension: 'trust', amount: 0.5, reason: 'they stayed loyal and faithful to each other' } }],
  ],
  'BETRAYAL PROBE',
);

const POWER_PROBE = runBothPaths(
  [
    [{ op: 'UPDATE_BELIEF', charId: 'filler', belief: belief('Nothing of note happens in this scene.') }],
    // Control-charged: a respect-dimension shift (ops: |−0.4| = 0.4 > 0) whose
    // reason carries dominance lexicon (text: 'overpowered' + 'dictated' = 2 > 0).
    [{ op: 'SHIFT_RELATIONSHIP', pair: ['mara', 'joss'], delta: { dimension: 'respect', amount: -0.4, reason: 'he overpowered her objections and dictated the terms' } }],
  ],
  'POWER PROBE',
);

describe('record parity — Wave 1192 lexicon signals (betrayalSignal SIGN, powerDynamicsIntensity PRESENCE, ironyMarkerCount text-only)', () => {
  // ── betrayalSignal: SIGN, probe-demonstrated in both directions ──────────
  it('BETRAYAL_PROBE: betrayal-ward scene agrees in sign (+) on both paths', () => {
    assert.equal(sign(BETRAYAL_PROBE.opsRecords[1].betrayalSignal ?? 0), 1);
    assert.equal(sign(BETRAYAL_PROBE.textRecords[1].betrayalSignal ?? 0), 1);
  });
  it('BETRAYAL_PROBE: loyalty-ward scene agrees in sign (−) on both paths', () => {
    assert.equal(sign(BETRAYAL_PROBE.opsRecords[2].betrayalSignal ?? 0), -1);
    assert.equal(sign(BETRAYAL_PROBE.textRecords[2].betrayalSignal ?? 0), -1);
  });
  it('BETRAYAL_PROBE: the inert filler scene is 0 on both paths (no noise)', () => {
    assert.equal(BETRAYAL_PROBE.opsRecords[0].betrayalSignal, 0);
    assert.equal(BETRAYAL_PROBE.textRecords[0].betrayalSignal, 0);
  });

  // MEASURED golden-story baseline, pinned as the honest finding it is: the
  // two paths' nonzero scenes are DISJOINT on these fixtures. The ops path is
  // nonzero exactly where a trust shift lands (A s6: -(+0.3) = -0.3; B s5:
  // -(+0.25) = -0.25 — both loyalty-ward, since both fixtures' trust shifts
  // are positive) and reads 0 at A s8 / B s7 (those shifts are on the
  // 'resentment' dimension, which the derivation deliberately excludes —
  // resentment is generic hostility, not violated trust). The text path is
  // nonzero exactly where 'betrayed' appears in rendered prose (A s8, B s7,
  // B s8) and reads 0 at A s6 / B s5 (their warm prose uses valence
  // vocabulary — grateful/warmth/trust — none of which is in LOYALTY_WORDS).
  // No scene is nonzero on both paths, so the SIGN contract is exercised by
  // the probe above, not the golden stories — pinned so any future fixture
  // or lexicon change that closes this gap shows up as a failing assertion
  // to re-measure, not silent drift.
  it('golden stories (measured): ops-path betrayalSignal is nonzero exactly at the trust-shift scenes, loyalty-ward', () => {
    const opsNonzeroA = A.opsRecords.filter(r => (r.betrayalSignal ?? 0) !== 0);
    const opsNonzeroB = B.opsRecords.filter(r => (r.betrayalSignal ?? 0) !== 0);
    assert.deepEqual(opsNonzeroA.map(r => r.sceneIdx), [6]);
    assert.deepEqual(opsNonzeroB.map(r => r.sceneIdx), [5]);
    assert.equal(sign(opsNonzeroA[0].betrayalSignal ?? 0), -1);
    assert.equal(sign(opsNonzeroB[0].betrayalSignal ?? 0), -1);
  });
  it('golden stories (measured): text-path betrayalSignal is nonzero exactly at the betrayal-prose scenes, betrayal-ward, disjoint from the ops-path scenes', () => {
    const textNonzeroA = A.textRecords.filter(r => (r.betrayalSignal ?? 0) !== 0);
    const textNonzeroB = B.textRecords.filter(r => (r.betrayalSignal ?? 0) !== 0);
    assert.deepEqual(textNonzeroA.map(r => r.sceneIdx), [8]);
    assert.deepEqual(textNonzeroB.map(r => r.sceneIdx), [7, 8]);
    for (const r of [...textNonzeroA, ...textNonzeroB]) {
      assert.equal(sign(r.betrayalSignal ?? 0), 1, `scene ${r.sceneIdx} should be betrayal-ward`);
    }
    // The disjointness itself, asserted directly:
    for (const pair of [A, B]) {
      for (let i = 0; i < pair.opsRecords.length; i++) {
        assert.ok(
          !((pair.opsRecords[i].betrayalSignal ?? 0) !== 0 && (pair.textRecords[i].betrayalSignal ?? 0) !== 0),
          `scene ${i} became jointly nonzero — the documented disjointness closed; re-measure and upgrade this block to a rate-pinned SIGN test`,
        );
      }
    }
  });

  // ── powerDynamicsIntensity: PRESENCE ─────────────────────────────────────
  it('POWER_PROBE: a respect-shift scene with dominance-lexicon reason is nonzero on both paths; the filler scene is 0 on both', () => {
    assert.ok((POWER_PROBE.opsRecords[1].powerDynamicsIntensity ?? 0) > 0, 'ops path: |respect shift| registers');
    assert.ok((POWER_PROBE.textRecords[1].powerDynamicsIntensity ?? 0) > 0, 'text path: dominance verbs register');
    assert.equal(POWER_PROBE.opsRecords[0].powerDynamicsIntensity, 0);
    assert.equal(POWER_PROBE.textRecords[0].powerDynamicsIntensity, 0);
  });
  it('golden stories (measured): powerDynamicsIntensity is 0 on every scene of both paths — neither fixture stages a control contest (trivially agreeing presence)', () => {
    for (const pair of [A, B]) {
      for (let i = 0; i < pair.opsRecords.length; i++) {
        assert.equal(pair.opsRecords[i].powerDynamicsIntensity, 0, `ops scene ${i}`);
        assert.equal(pair.textRecords[i].powerDynamicsIntensity, 0, `text scene ${i}`);
      }
    }
  });

  // ── ironyMarkerCount: KNOWN_ASYMMETRY_TEXT_ONLY ──────────────────────────
  for (const [label, pair] of [['Story A', A], ['Story B', B]] as const) {
    it(`${label}: ops-path records never populate ironyMarkerCount; text-path records always populate it as a number`, () => {
      for (const r of pair.opsRecords) {
        assert.equal(r.ironyMarkerCount, undefined, `ops-path scene ${r.sceneIdx} unexpectedly set ironyMarkerCount`);
      }
      for (const r of pair.textRecords) {
        assert.equal(typeof r.ironyMarkerCount, 'number', `text-path scene ${r.sceneIdx} did not populate ironyMarkerCount`);
      }
    });
  }
});
