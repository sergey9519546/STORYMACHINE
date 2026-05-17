import type { Belief } from '../engine/types.ts';

// ── Memory retrieval ─────────────────────────────────────────────────────────
// Replaces naive "top-N by confidence" belief selection with a Generative-Agents
// style retrieval score: recency × importance × relevance. Pure and deterministic.

const STOPWORDS = new Set([
  'this', 'that', 'with', 'from', 'have', 'they', 'them', 'were', 'what',
  'when', 'will', 'your', 'about', 'there', 'their', 'would', 'could',
  'been', 'than', 'then', 'into', 'over', 'such', 'some', 'only', 'know',
]);

function contentWords(s: string): Set<string> {
  return new Set(
    (s.toLowerCase().match(/\b[a-z]{4,}\b/g) ?? []).filter(w => !STOPWORDS.has(w)),
  );
}

// Witnessed facts weigh more than hearsay weigh more than guesses.
const SOURCE_IMPORTANCE: Record<string, number> = {
  witnessed: 1.0,
  told:      0.7,
  inferred:  0.5,
};

// Retrieval score in [0,1] for a single belief against the current scene.
//   recency    — exponential decay over turns since the belief was acquired
//   importance — source reliability scaled by stated confidence
//   relevance  — content-word overlap with the current conversation context
export function scoreBelief(
  belief: Belief,
  currentTurn: number,
  contextWords: Set<string>,
): number {
  const age = Math.max(0, currentTurn - (belief.acquired_at ?? 0));
  const recency = Math.exp(-0.15 * age);

  const importance = (SOURCE_IMPORTANCE[belief.source] ?? 0.6)
    * Math.max(0, Math.min(1, belief.confidence));

  const bw = contentWords(belief.proposition);
  let shared = 0;
  for (const w of bw) if (contextWords.has(w)) shared++;
  const relevance = bw.size > 0 ? shared / bw.size : 0;

  return 0.35 * recency + 0.35 * importance + 0.30 * relevance;
}

// Ranks beliefs by retrieval score against the current scene and returns the
// top `limit`. `contextText` should be the recent conversation transcript so
// beliefs relevant to what is being discussed surface first.
export function retrieveBeliefs(
  beliefs: Belief[],
  currentTurn: number,
  contextText: string,
  limit = 10,
): Belief[] {
  if (beliefs.length <= limit) {
    // Still rank so the prompt lists the most pertinent beliefs first.
    const ctxSmall = contentWords(contextText);
    return [...beliefs].sort(
      (a, b) => scoreBelief(b, currentTurn, ctxSmall) - scoreBelief(a, currentTurn, ctxSmall),
    );
  }
  const ctx = contentWords(contextText);
  return beliefs
    .map(b => ({ b, score: scoreBelief(b, currentTurn, ctx) }))
    .sort((x, y) => y.score - x.score)
    .slice(0, limit)
    .map(x => x.b);
}
