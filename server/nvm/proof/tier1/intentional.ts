// IntentionalProof (Tier 1) — every character an op acts on/through must be
// grounded in the narrative. An op referencing an unknown character is a puppet
// move. Deterministic.
//
// WHAT "GROUNDED" MEANS, AND WHY THERE ARE TWO ANSWERS (2026-09-19,
// cast-grounding lane). Until this change there was one: a character was
// grounded if state held a belief or an emotion for it, OR if the candidate
// under judgment carried an UPDATE_BELIEF for it. That second clause is
// SELF-GROUNDING — the IR being judged supplies half the evidence it is judged
// against — and it inverted the proof at exactly the moment it mattered:
//
//   * a candidate that INVENTS a character ("Char1", "PROTAGONIST") and also
//     emits an UPDATE_BELIEF for it PASSED, because it had grounded itself;
//   * a candidate that referenced a REAL cast member the state had not seen yet
//     (scene 0, or a member with no belief committed) was BLOCKED.
//
// The story bench's 17 Tier-1 blocks were the second case
// (docs/story-generation/STORY_BENCH_2026-09-13.md §4b; SESSION_REPORT_2026-09-19.md
// §4 row 10). Worse, server/nvm/generate/proof-spec.ts turned each block into
// "Introduce character X with an UPDATE_BELIEF op", which teaches the generator
// the self-grounding trick.
//
// The fix is not to delete self-grounding — nothing in the engine knows a
// story's cast, and every existing caller (the writers' room critic, selfplay
// corpus, branch scoring, the move bus, the analysis and debug routes) has only
// an IR and a state. It is to let a caller that DOES know the cast say so. When
// `opts.cast` is supplied, the cast is the ground truth, the IR grounds nothing
// by itself, and an UPDATE_BELIEF for a name outside the cast blocks exactly as
// an emotion or relationship op for that name already did. When it is not
// supplied the behaviour is byte-identical to what it was.

import type { NarrativeTransitionIR } from '../../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../../state/NarrativeState.ts';
import type { StoryOp } from '../../ops/StoryOp.ts';
import type { ProofResult, ProofFinding } from '../contract.ts';
import { passResult, failResult } from '../contract.ts';

/**
 * What the caller knows about this story's cast. Optional in every signature
 * that takes it; `undefined` means "I do not know the cast", which is the
 * pre-2026-09-19 contract and every existing caller's situation.
 */
export interface IntentionalGroundingOptions {
  /**
   * The character ids that exist in this story. Supplying it — INCLUDING as an
   * empty array — switches the proof out of self-grounding: `cast` plus the
   * characters already in state is the whole set of legal names.
   */
  cast?: readonly string[];
  /**
   * Names the CALLER asked this IR to introduce (the G9 inversion: a
   * `must_introduce_character` constraint in the spec the candidate was
   * generated against). An UPDATE_BELIEF for one of these grounds it, so a
   * candidate that did what the spec told it to do is not blocked for it.
   * Only read when `cast` is supplied; without a cast every UPDATE_BELIEF
   * already grounds its own charId. Never widens the set on its own: a name
   * here that the IR does not introduce with an UPDATE_BELIEF stays ungrounded.
   */
  allowIntroduce?: readonly string[];
}

/**
 * The character ids an op acts on or through.
 *
 * EXPORTED (2026-09-19, typesafe-cast-alignment lane) so the cast-alignment
 * step in server/nvm/converge/cast-alignment.ts walks ops with THIS definition
 * rather than a second copy of it. Behaviour unchanged.
 */
export function charsReferenced(op: StoryOp): string[] {
  if (op.op === 'UPDATE_BELIEF' || op.op === 'APPRAISE_EMOTION') return [op.charId];
  if (op.op === 'SHIFT_RELATIONSHIP') return [op.pair[0], op.pair[1]];
  return [];
}

/**
 * Every character this IR may legally reference.
 *
 * Without `opts.cast`: grounded in state (it holds a belief or an emotion), or
 * grounded BY this IR (an UPDATE_BELIEF anywhere in it — emotion and
 * relationship ops only reference, they do not introduce). Byte-identical to
 * the pre-2026-09-19 function.
 *
 * With `opts.cast`: state's characters plus the caller's cast, plus only those
 * `opts.allowIntroduce` names this IR actually introduces with an UPDATE_BELIEF.
 * The IR no longer grounds itself.
 *
 * EXPORTED (2026-09-19, typesafe-cast-alignment lane) for the same reason as
 * charsReferenced above: the alignment step's notion of "this name is not in the
 * cast" has to be the SAME set this proof blocks on, or the two drift and the
 * alignment starts rewriting names the proof was never going to block (or
 * leaving ones it will). It is a pure extraction — intentionalProof() below
 * calls it and its decision logic is byte-for-byte what it was.
 */
export function knownCharacters(
  ir: NarrativeTransitionIR,
  state: NarrativeState,
  opts?: IntentionalGroundingOptions,
): Set<string> {
  const known = new Set<string>([
    ...Object.keys(state.characterBeliefs),
    ...Object.keys(state.characterEmotions),
  ]);
  const cast = opts?.cast;
  if (cast === undefined) {
    // Pre-2026-09-19 path: the IR grounds itself.
    for (const op of ir.ops) {
      if (op.op === 'UPDATE_BELIEF') known.add(op.charId);
    }
    return known;
  }
  for (const id of cast) known.add(id);
  const allowIntroduce = new Set(opts?.allowIntroduce ?? []);
  if (allowIntroduce.size > 0) {
    for (const op of ir.ops) {
      if (op.op === 'UPDATE_BELIEF' && allowIntroduce.has(op.charId)) known.add(op.charId);
    }
  }
  return known;
}

export function intentionalProof(
  ir: NarrativeTransitionIR,
  state: NarrativeState,
  opts?: IntentionalGroundingOptions,
): ProofResult {
  const known = knownCharacters(ir, state, opts);

  const findings: ProofFinding[] = [];
  ir.ops.forEach((op, i) => {
    for (const charId of charsReferenced(op)) {
      if (!known.has(charId)) {
        findings.push({
          proof: 'IntentionalProof', severity: 'block',
          message: `op[${i}] ${op.op} references ungrounded character "${charId}"`,
          subjectId: charId,
          opIdx: i,  // M7: structured field — don't parse from message
        });
      }
    }
  });
  return findings.length
    ? failResult('IntentionalProof', 'an op acts on a character not in the narrative', findings)
    : passResult('IntentionalProof');
}
