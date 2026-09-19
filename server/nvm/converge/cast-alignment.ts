// Cast alignment (2026-09-19) — "select instead of generate", applied to the
// one finding the story bench actually produced about the MODEL.
//
// ── THE FINDING THIS EXISTS FOR ──────────────────────────────────────────────
// docs/story-generation/STORY_BENCH_2026-09-13.md §4b: on the v2 run the
// candidate generator invents characters — PROTAGONIST, Alex, Antagonist, Rila,
// Char1 — instead of using the cast it was given, and IntentionalProof
// (server/nvm/proof/tier1/intentional.ts) correctly blocks every op that
// references one. It blocked 17 of 29 scenes. The names are not nonsense: they
// are the model's placeholders FOR cast members it was told about. Nothing in
// the loop ever asks the cheap question "is PROTAGONIST here just ILKA?".
//
// ── WHY AN API THAT CANNOT WRITE ─────────────────────────────────────────────
// Asking a generative model to fix the names means generating more text and
// trusting it. TypeSafe's System One instead answers a CLOSED question: it picks
// one of the cast names this code hands it, or `none`, and reports a confidence.
// The answer is drawn from a set this file controls, so the worst case is a
// wrong pick from a legal set — never an invented character, never a new op.
// (server/lib/ai-providers/typesafe.ts.)
//
// ── WHAT THIS IS NOT ─────────────────────────────────────────────────────────
//   * NOT a quality judgment. No model verdict from here touches a health
//     score, a verdict or any user-visible number (NORTH_STAR.md §1). It renames
//     a charId, and IntentionalProof — unchanged — still decides what passes.
//   * NOT on by default. TYPESAFE_CAST_ALIGNMENT must be '1'.
//   * NOT allowed to succeed quietly when it fails. Every non-applied outcome
//     carries a REASON that travels with the candidate (ConvergeStep.castAlignment),
//     because this codebase's documented failure mode is fallbacks that look
//     like success (STORY_BENCH §1; the 2026-09-19 session report §4 rows 1–3).
//   * NOT a rescue for a candidate the proof would block for another reason: it
//     only ever rewrites an id, so a candidate that still references an
//     ungrounded character is blocked exactly as it is today.
//
// ── TRUST BOUNDARY ───────────────────────────────────────────────────────────
// The state this sends contains MODEL-GENERATED text (the candidate's op
// renderings), and adversarial text in a System One state can steer the answer.
// That is acceptable here and only here, because the blast radius of a steered
// answer is "an op is renamed to a cast member that was already in the cast",
// after which the deterministic Tier-1 proof runs normally. It would not be
// acceptable for anything that scored.

import type { NarrativeTransitionIR } from '../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../state/NarrativeState.ts';
import type { StoryOp } from '../ops/StoryOp.ts';
import type { SceneTarget } from '../generate/proof-spec.ts';
import {
  knownCharacters, charsReferenced,
  type IntentionalGroundingOptions,
} from '../proof/tier1/intentional.ts';
import { sanitizeForPrompt } from '../../lib/prompt-utils.ts';
import { logger } from '../../lib/logger.ts';
import {
  systemOne, typeSafeConfigured, redactSecrets,
  type TypeSafeQuestion, type TypeSafeAnswer,
} from '../../lib/ai-providers/typesafe.ts';

// ── Result type ──────────────────────────────────────────────────────────────

export type CastAlignmentReason = 'disabled' | 'no_key' | 'nothing_to_align' | 'error';

export interface CastAlignmentRename {
  /** The invented name the candidate used. */
  from: string;
  /** The cast member it was resolved to — always one of the names sent as options. */
  to: string;
  /** 0–2 on the relation ladder; only a value that ROUNDS TO 2 is applied. */
  relationScore: number;
  /** The choice question's confidence; only >= 0.6 is applied. */
  choiceConfidence: number;
}

export interface CastAlignment {
  /** True only when a System One call succeeded and its answers were read. */
  applied: boolean;
  /** Why nothing was applied. Absent when `applied` is true. */
  reason?: CastAlignmentReason;
  aligned: CastAlignmentRename[];
  /** Unknown names deliberately left alone — the proof will block them as before. */
  unresolved: string[];
  /** Redacted failure text when `reason === 'error'`. */
  error?: string;
}

export interface CastAlignmentOutcome {
  /**
   * The candidate to prove. The SAME OBJECT REFERENCE as the input whenever
   * nothing was rewritten — including every skip path — so a disabled feature
   * is provably a no-op.
   */
  ir: NarrativeTransitionIR;
  alignment: CastAlignment;
}

export interface CastAlignmentContext {
  /** The scene being generated; supplies the small amount of scene context sent. */
  target?: SceneTarget;
  /**
   * What IntentionalProof will treat as grounded for this candidate
   * (2026-09-19, cast-grounding lane). The caller passes the SAME object it
   * passes to runTier1, so the options this step offers are exactly the names
   * the proof accepts. Omitted, the set is what it always was: state's
   * characters plus the candidate's own UPDATE_BELIEF charIds — which at scene
   * 0 is nothing to align TO, and is why this step reported
   * `nothing_to_align` on precisely the scenes the bench lost.
   */
  grounding?: IntentionalGroundingOptions;
  /** Caller deadline, forwarded to the adapter alongside its own 10 s timeout. */
  signal?: AbortSignal;
}

// ── Thresholds (in code, deliberately, not in the prompt) ────────────────────
// System One reads instructions literally and cannot count; the decision of what
// counts as "resolved" is therefore made HERE, from two independent numbers, not
// delegated to the model. Both must agree:
//   * the score ladder must round to its top level ("clearly one of the cast"),
//   * and the choice must be a real cast member at >= MIN_CHOICE_CONFIDENCE.
// The reference probe (lane README) is why the second gate exists: on an
// invented PROTAGONIST with no evidence, the ladder answered 1.03 ("possibly")
// and the choice still named a cast member — at confidence 0.15. Either gate
// alone would have been wrong; together they leave it unresolved.
const RELATION_LEVELS = [
  'a different character not in the cast',
  'possibly one of the cast, unclear which',
  'clearly one of the cast members',
] as const;
const RESOLVED_LEVEL = RELATION_LEVELS.length - 1;   // 2
const MIN_CHOICE_CONFIDENCE = 0.6;
const NONE_OPTION = 'none';
/** Hard cap on names per request: keeps the state small (jaggedness) and bounded. */
const MAX_UNKNOWN_NAMES = 12;
/** Hard cap on rendered ops in the state, for the same reason. */
const MAX_RENDERED_OPS = 12;

export function castAlignmentEnabled(): boolean {
  return process.env.TYPESAFE_CAST_ALIGNMENT === '1';
}

// ── Candidate rendering (the smallest state that contains the answer) ────────

/** One short plain-text line per op that names a character. */
function renderOps(ir: NarrativeTransitionIR): string[] {
  const lines: string[] = [];
  for (const op of ir.ops) {
    if (lines.length >= MAX_RENDERED_OPS) break;
    if (op.op === 'UPDATE_BELIEF') {
      lines.push(`UPDATE_BELIEF ${op.charId}: "${sanitizeForPrompt(op.belief?.proposition ?? '', 160)}"`);
    } else if (op.op === 'APPRAISE_EMOTION') {
      lines.push(`APPRAISE_EMOTION ${op.charId}: ${sanitizeForPrompt(String(op.emotion?.dominant ?? 'unknown'), 40)}`);
    } else if (op.op === 'SHIFT_RELATIONSHIP') {
      lines.push(`SHIFT_RELATIONSHIP ${op.pair[0]} / ${op.pair[1]}: ${sanitizeForPrompt(String(op.delta?.dimension ?? ''), 40)} ${sanitizeForPrompt(String(op.delta?.reason ?? ''), 120)}`);
    }
  }
  return lines.map(l => sanitizeForPrompt(l, 240));
}

/**
 * Stable, collision-free question ids. The brief's shape is `<name>_relation` /
 * `<name>_which`, but a charId is model-authored text: it can contain anything,
 * and two different names can sanitise to the same token. So the id is the
 * sanitised name plus a disambiguating index, and the index -> name mapping is
 * kept in code rather than parsed back out of the id.
 */
function questionIds(names: string[]): Array<{ name: string; relation: string; which: string }> {
  const used = new Set<string>();
  return names.map((name, i) => {
    let slug = name.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 40) || 'name';
    if (used.has(slug)) slug = `${slug}_${i}`;
    used.add(slug);
    return { name, relation: `${slug}_relation`, which: `${slug}_which` };
  });
}

function answerOf(answers: Record<string, TypeSafeAnswer>, id: string): TypeSafeAnswer | undefined {
  return Object.prototype.hasOwnProperty.call(answers, id) ? answers[id] : undefined;
}

// ── Rewrite (never adds a character, never drops an op) ──────────────────────

function rewriteOps(ops: StoryOp[], renames: Map<string, string>): { ops: StoryOp[]; changed: boolean } {
  let changed = false;
  const out = ops.map((op): StoryOp => {
    if (op.op === 'UPDATE_BELIEF' || op.op === 'APPRAISE_EMOTION') {
      const to = renames.get(op.charId);
      if (!to) return op;
      changed = true;
      return { ...op, charId: to };
    }
    if (op.op === 'SHIFT_RELATIONSHIP') {
      const a = renames.get(op.pair[0]) ?? op.pair[0];
      const b = renames.get(op.pair[1]) ?? op.pair[1];
      if (a === op.pair[0] && b === op.pair[1]) return op;
      changed = true;
      return { ...op, pair: [a, b] };
    }
    return op;
  });
  return { ops: out, changed };
}

function skip(ir: NarrativeTransitionIR, reason: CastAlignmentReason, unresolved: string[], error?: string): CastAlignmentOutcome {
  // 'disabled' is a configuration state, not an event: logging it would put one
  // line per candidate into the server's structured stream on every deployment
  // that never enabled this. Everything else IS an event and is logged.
  if (reason !== 'disabled') {
    const data = { reason, sceneIdx: ir.sceneIdx, unresolved: unresolved.length, ...(error ? { error } : {}) };
    if (reason === 'error') logger.warn('typesafe_cast_alignment_skipped', data);
    else logger.debug('typesafe_cast_alignment_skipped', data);
  }
  return { ir, alignment: { applied: false, reason, aligned: [], unresolved, ...(error ? { error } : {}) } };
}

/**
 * Resolve model-invented character names in `ir` to members of the cast already
 * present in `state`, using one System One request per candidate.
 *
 * Returns the ORIGINAL ir object whenever nothing is rewritten. Never throws:
 * every failure becomes `applied: false` with a reason, and the candidate goes
 * on to Tier 1 exactly as it would have.
 */
export async function alignCandidateCast(
  ir: NarrativeTransitionIR,
  state: NarrativeState,
  ctx: CastAlignmentContext = {},
): Promise<CastAlignmentOutcome> {
  if (!castAlignmentEnabled()) return skip(ir, 'disabled', []);

  // The SAME set IntentionalProof blocks on — imported, not re-derived, and
  // given the same grounding options the proof will be given.
  const known = knownCharacters(ir, state, ctx.grounding);
  const unknown: string[] = [];
  for (const op of ir.ops) {
    for (const charId of charsReferenced(op)) {
      if (!known.has(charId) && !unknown.includes(charId)) unknown.push(charId);
    }
  }
  const cast = [...known].sort();
  // Nothing invented, or nothing to align TO: skip before spending a call.
  if (unknown.length === 0 || cast.length === 0) return skip(ir, 'nothing_to_align', unknown);
  if (!typeSafeConfigured()) return skip(ir, 'no_key', unknown);

  const names = unknown.slice(0, MAX_UNKNOWN_NAMES);
  const ids = questionIds(names);
  const choiceCriteria: Record<string, string | null> = {};
  for (const c of cast) choiceCriteria[c] = null;
  choiceCriteria[NONE_OPTION] = 'none of the cast members above';

  const questions: Record<string, TypeSafeQuestion> = {};
  for (const { name, relation, which } of ids) {
    questions[relation] = {
      type: 'score',
      instructions: `In the scene notes below, the name "${name}" appears. Is it one of the listed cast members under another label?`,
      criteria: [...RELATION_LEVELS],
    };
    questions[which] = {
      type: 'choice',
      instructions: `If "${name}" is one of the listed cast members, which one? Answer "${NONE_OPTION}" if it is not.`,
      criteria: choiceCriteria,
    };
  }

  const target = ctx.target;
  const stateDoc: Record<string, unknown> = {
    cast,
    names,
    scene: {
      function: target?.sceneFunction ?? ir.sceneFunction,
      tension: target?.tensionTarget ?? null,
      // themeHint is read HERE and nowhere else in the pipeline (it is an
      // unread field of SceneTarget). Wiring it into generation is a different
      // lane; this only borrows it as context when the caller supplied one.
      ...(target?.themeHint ? { theme: sanitizeForPrompt(target.themeHint, 240) } : {}),
    },
    candidate: renderOps(ir).join('\n'),
  };

  let answers: Record<string, TypeSafeAnswer>;
  try {
    const result = await systemOne({ state: stateDoc, questions, signal: ctx.signal });
    answers = result.answers;
  } catch (err) {
    return skip(ir, 'error', unknown, redactSecrets((err as Error).message ?? String(err)).slice(0, 300));
  }

  const renames = new Map<string, string>();
  const aligned: CastAlignmentRename[] = [];
  const unresolved: string[] = [];
  for (const { name, relation, which } of ids) {
    const rel = answerOf(answers, relation);
    const cho = answerOf(answers, which);
    const relationScore = typeof rel?.score === 'number' ? rel.score : NaN;
    const choice = typeof cho?.choice === 'string' ? cho.choice : NONE_OPTION;
    const choiceConfidence = typeof cho?.confidence === 'number' ? cho.confidence : 0;
    const resolved =
      Number.isFinite(relationScore) &&
      Math.round(relationScore) === RESOLVED_LEVEL &&
      choice !== NONE_OPTION &&
      cast.includes(choice) &&           // never accept an option we did not offer
      choiceConfidence >= MIN_CHOICE_CONFIDENCE;
    if (resolved) {
      renames.set(name, choice);
      aligned.push({ from: name, to: choice, relationScore, choiceConfidence });
    } else {
      unresolved.push(name);
    }
  }
  // Names beyond MAX_UNKNOWN_NAMES were never asked about — they are unresolved,
  // and saying so is the honest record.
  for (const name of unknown.slice(MAX_UNKNOWN_NAMES)) unresolved.push(name);

  if (renames.size === 0) {
    return { ir, alignment: { applied: true, aligned, unresolved } };
  }

  const { ops, changed } = rewriteOps(ir.ops, renames);
  // provenance is `{ origin, createdAt, model? }` (server/nvm/ir/NarrativeTransitionIR.ts)
  // — there is no field for an alignment record, and widening that type would
  // change a shape that is hashed into commits and the ghost ledger. So the
  // record lives on ConvergeStep.castAlignment only; see the lane README.
  const alignedIr: NarrativeTransitionIR = changed ? { ...ir, ops } : ir;
  logger.info('typesafe_cast_alignment_applied', {
    sceneIdx: ir.sceneIdx,
    aligned: aligned.length,
    unresolved: unresolved.length,
  });
  return { ir: alignedIr, alignment: { applied: true, aligned, unresolved } };
}
