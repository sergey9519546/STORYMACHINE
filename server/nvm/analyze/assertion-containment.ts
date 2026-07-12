// Assertion-containment ledger — OWNE O3, Wave Program v2 (root-cause / defect
// bookkeeping layer). Deterministic, no LLM.
//
// A script often makes explicit factual ASSERTIONS about its own world ("the
// door is locked", "no one can leave the island", "she has never lied"). This
// module is a typed bookkeeping layer over such assertions: given an ORDERED
// list of them, it detects when a LATER assertion CONTRADICTS an EARLIER one
// (same subject + predicate, opposite polarity) without the contradiction
// being acknowledged as a deliberate reversal (a character revealed a lie, a
// world-state legitimately changed, etc.) — an unflagged integrity leak.
//
// This module does NOT extract assertions from raw prose semantically; the
// caller supplies a typed list. `buildAssertionLedger` below is an explicitly
// SHALLOW cue-pattern heuristic seed (documented as such) — the real
// deliverable is the containment logic itself plus its test coverage.
//
// support (SupportState, per server/nvm/proof/surfacing.ts's open-world
// contract):
//   - contained, with ≥1 assertion considered   → ENTAILED   (the ledger
//     positively establishes no unacknowledged contradiction — this is a
//     closed-world check over an explicit, caller-supplied assertion list,
//     not an absence-of-evidence claim, so ENTAILED rather than UNKNOWN is
//     correct here).
//   - any unacknowledged contradiction found     → CONTRADICTED
//   - no assertions to check (empty or a single assertion with nothing to
//     compare against) → UNKNOWN — there is nothing for the ledger to
//     entail or contradict; absence of assertions is not itself a fact
//     about containment (mirrors surfacing.ts's "absence is not a negative
//     fact" discipline).

import type { SupportState } from '../proof/surfacing.ts';

export type AssertionPolarity = 'affirm' | 'negate';

export interface Assertion {
  /** Caller-assigned unique identifier. Must be unique within the list. */
  id: string;
  /** Normalized-ish subject the assertion is about, e.g. "the door", "she". */
  subject: string;
  /** Normalized-ish predicate, e.g. "is locked", "has lied". */
  predicate: string;
  polarity: AssertionPolarity;
  /** 0-based scene index the assertion is made in. Must be a finite integer ≥ 0. */
  sceneIndex: number;
  /** True when THIS assertion is a deliberate, acknowledged reversal of an
   *  earlier one on the same subject+predicate (a reveal, a state change the
   *  script owns) rather than an unflagged contradiction. */
  acknowledgedReversal?: boolean;
}

export interface ContainmentViolation {
  subject: string;
  predicate: string;
  earlierScene: number;
  laterScene: number;
  reason: string;
}

export interface AssertionContainmentResult {
  contained: boolean;
  violations: ContainmentViolation[];
  support: SupportState;
}

/** Normalize a subject/predicate string for grouping: trim + lowercase +
 *  collapse internal whitespace. Guards against case/spacing false negatives
 *  without doing any semantic normalization. */
function normKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

function isValidAssertion(a: unknown): a is Assertion {
  if (!a || typeof a !== 'object') return false;
  const r = a as Record<string, unknown>;
  return (
    typeof r.id === 'string' && r.id.length > 0 &&
    typeof r.subject === 'string' && r.subject.trim().length > 0 &&
    typeof r.predicate === 'string' && r.predicate.trim().length > 0 &&
    (r.polarity === 'affirm' || r.polarity === 'negate') &&
    typeof r.sceneIndex === 'number' && Number.isFinite(r.sceneIndex) && r.sceneIndex >= 0 &&
    (r.acknowledgedReversal === undefined || typeof r.acknowledgedReversal === 'boolean')
  );
}

/**
 * Assess an ordered list of assertions for unacknowledged self-contradiction.
 *
 * Input guards: non-array / null → treated as empty. Malformed entries
 * (missing fields, wrong types, negative/non-finite sceneIndex) are dropped
 * silently — a defensive filter, not a validation error surface. Duplicate
 * ids are tolerated (later occurrence just re-processed on its own terms;
 * ids are not load-bearing for the containment logic itself, only for
 * caller-side identification).
 *
 * Ordering: assertions are processed in ARRAY order groupwise by
 * subject+predicate, sorted by sceneIndex ascending within each group so
 * "earlier"/"later" reflect story position even if the input array isn't
 * globally sceneIndex-sorted. Ties (same sceneIndex) are resolved by array
 * order (stable sort).
 */
export function assessAssertionContainment(
  assertions: readonly unknown[] | null | undefined,
): AssertionContainmentResult {
  const clean: Assertion[] = Array.isArray(assertions)
    ? assertions.filter(isValidAssertion)
    : [];

  if (clean.length === 0) {
    return { contained: true, violations: [], support: 'UNKNOWN' };
  }

  // Group by normalized subject+predicate.
  const groups = new Map<string, Assertion[]>();
  for (const a of clean) {
    const key = `${normKey(a.subject)}${normKey(a.predicate)}`;
    const g = groups.get(key);
    if (g) g.push(a); else groups.set(key, [a]);
  }

  if ([...groups.values()].every(g => g.length < 2)) {
    // Nothing comparable — every subject+predicate is a singleton mention.
    return { contained: true, violations: [], support: 'UNKNOWN' };
  }

  const violations: ContainmentViolation[] = [];

  for (const group of groups.values()) {
    if (group.length < 2) continue;
    // Stable sort by sceneIndex, preserving original relative order on ties.
    const ordered = group
      .map((a, idx) => ({ a, idx }))
      .sort((x, y) => x.a.sceneIndex - y.a.sceneIndex || x.idx - y.idx)
      .map(x => x.a);

    // Walk pairwise: track the "current standing" polarity as established by
    // the most recent non-contradicting (or acknowledged) assertion, and
    // flag any later assertion that flips polarity without acknowledgement.
    let standing = ordered[0];
    for (let i = 1; i < ordered.length; i++) {
      const cur = ordered[i];
      if (cur.polarity === standing.polarity) {
        // Same-polarity repeat — reaffirms, no violation. Standing unchanged.
        continue;
      }
      // Polarity differs from standing.
      if (cur.acknowledgedReversal === true) {
        // Deliberate, owned reversal — not a violation. It becomes the new
        // standing state going forward.
        standing = cur;
        continue;
      }
      violations.push({
        subject: standing.subject,
        predicate: standing.predicate,
        earlierScene: standing.sceneIndex,
        laterScene: cur.sceneIndex,
        reason:
          `"${standing.subject} ${standing.predicate}" was asserted as ` +
          `${standing.polarity === 'affirm' ? 'true' : 'false'} in scene ` +
          `${standing.sceneIndex}, then contradicted (asserted ` +
          `${cur.polarity === 'affirm' ? 'true' : 'false'}) in scene ` +
          `${cur.sceneIndex} without an acknowledged reversal.`,
      });
      // The contradicting assertion becomes the new standing state so a
      // subsequent flip back is judged against IT, not the original —
      // each unacknowledged flip is its own violation.
      standing = cur;
    }
  }

  const contained = violations.length === 0;
  const support: SupportState = contained ? 'ENTAILED' : 'CONTRADICTED';
  return { contained, violations, support };
}

// ---------------------------------------------------------------------------
// Shallow heuristic seed. Documented as approximate: cue-pattern matching
// over raw scene text, not semantic assertion extraction. Intended only to
// give a caller a starting ledger to hand-refine or feed illustratively —
// the containment logic above is the real, exact deliverable.
// ---------------------------------------------------------------------------

const NEGATION_CUES = /\b(never|no one can|cannot|can't|isn't|is not|are not|aren't|won't|doesn't|does not)\b/i;
const AFFIRM_CUES = /\b(always|is|are|can|has|have)\b/i;

/**
 * Seed a small assertion ledger from ordered Fountain scene texts using
 * shallow lexical cues ("is/are", "never", "always", "can't", ...). This is
 * NOT semantic extraction — it will both over- and under-generate compared
 * to a human reading. Subject/predicate are derived crudely (subject = first
 * few words before the cue, predicate = the cue phrase onward), so callers
 * needing precision should construct `Assertion[]` directly instead.
 */
export function buildAssertionLedger(sceneTexts: readonly string[] | null | undefined): Assertion[] {
  if (!Array.isArray(sceneTexts)) return [];
  const out: Assertion[] = [];
  let counter = 0;

  sceneTexts.forEach((scene, sceneIndex) => {
    if (typeof scene !== 'string' || !scene.trim()) return;
    for (const raw of scene.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.length > 200) continue;
      const isNegation = NEGATION_CUES.test(line);
      const isAffirm = !isNegation && AFFIRM_CUES.test(line);
      if (!isNegation && !isAffirm) continue;

      const cueRe = isNegation ? NEGATION_CUES : AFFIRM_CUES;
      const m = cueRe.exec(line);
      if (!m) continue;
      const subject = line.slice(0, m.index).trim().replace(/^[-—,.]+/, '');
      const predicate = line.slice(m.index).trim();
      if (!subject || !predicate) continue;

      out.push({
        id: `seed-${sceneIndex}-${counter++}`,
        subject,
        predicate,
        polarity: isNegation ? 'negate' : 'affirm',
        sceneIndex,
      });
    }
  });

  return out;
}
