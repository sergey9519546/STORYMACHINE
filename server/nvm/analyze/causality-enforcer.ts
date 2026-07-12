// Causality Enforcer -- STORY GOD SG5. Deterministic, no LLM.
//
// Great plots are causal ("this happens THEREFORE that happens"), not merely
// episodic ("this happens AND THEN that happens"). This module inspects a
// typed, ordered scene-link sequence and reports how causally connected the
// plot is, flagging both episodic beats (no backward causal link) and broken
// causal-logic claims (a cause pointing forward, at itself, or nowhere).
//
// Support-state mapping (per server/nvm/proof/surfacing.ts's SupportState):
//   - Any brokenLinks entry (a causal-logic VIOLATION, not mere absence of
//     causality) -> CONTRADICTED. The representation actively asserts an
//     impossible cause, so the negative fact is established, not merely
//     unknown.
//   - No broken links and causalRatio >= CAUSAL_RATIO_ENTAILED_THRESHOLD
//     -> ENTAILED. Enough of the plot is causally chained that "the plot is
//     causal" is established by the evidence.
//   - No broken links and causalRatio below threshold -> UNKNOWN. Episodic
//     beats are not proof of causal failure -- absence is not a negative
//     fact (surfacing.ts's first-class UNKNOWN principle) -- so we abstain
//     rather than assert CONTRADICTED for merely-episodic structure.
//   - Empty or single-scene input -> UNKNOWN (nothing to entail or
//     contradict; abstain).

import type { SupportState } from '../proof/surfacing.ts';

/** Threshold at/above which an unbroken causal chain counts as ENTAILED.
    Documented per the guarantee doc's "measure before threshold" norm: this
    is a conservative engineering default (matches surfacing.ts's causal_gap
    tauN=0.7 order of magnitude, chosen slightly below it because this ratio
    measures presence of causal links directly rather than a proof-graph
    necessity score). */
export const CAUSAL_RATIO_ENTAILED_THRESHOLD = 0.6;

/** One scene's causal-link declaration. causeSceneIndex, when present, names
    the (intended) prior scene that causes this one. causedByPriorScene is an
    optional explicit flag; when omitted it is inferred from the presence of
    a valid backward causeSceneIndex. */
export interface CausalScene {
  readonly sceneIndex: number;
  readonly causedByPriorScene?: boolean;
  readonly causeSceneIndex?: number;
}

export type BrokenLinkReason = 'forward-cause' | 'self-cause' | 'dangling-cause';

export interface BrokenLink {
  readonly sceneIndex: number;
  readonly reason: BrokenLinkReason;
}

export interface CausalityReport {
  readonly causalLinks: number;
  readonly episodicScenes: number[];
  readonly causalRatio: number;
  readonly brokenLinks: BrokenLink[];
  readonly support: SupportState;
}

function abstain(): CausalityReport {
  return {
    causalLinks: 0,
    episodicScenes: [],
    causalRatio: 0,
    brokenLinks: [],
    support: 'UNKNOWN',
  };
}

/** Assess causal connectivity of an ordered scene list.
    Guards: empty input, single scene, out-of-order sceneIndex values, and
    duplicate sceneIndex values all degrade gracefully to UNKNOWN/abstain
    (out-of-order or duplicate indices make "prior scene" ill-defined, so we
    do not attempt causal inference over a corrupt ordering). */
export function assessCausality(scenes: readonly CausalScene[]): CausalityReport {
  if (!Array.isArray(scenes) || scenes.length === 0) return abstain();
  if (scenes.length === 1) return abstain();

  // Guard: sceneIndex must be strictly increasing (ordered, no duplicates).
  for (let i = 1; i < scenes.length; i++) {
    if (scenes[i].sceneIndex <= scenes[i - 1].sceneIndex) return abstain();
  }

  const knownIndices = new Set(scenes.map((s) => s.sceneIndex));
  const episodicScenes: number[] = [];
  const brokenLinks: BrokenLink[] = [];
  let causalLinks = 0;

  // First scene has no prior scene by definition; it is never episodic and
  // never causally broken -- there is nothing for it to cause-link to.
  for (let i = 1; i < scenes.length; i++) {
    const scene = scenes[i];
    const hasCauseIndex = typeof scene.causeSceneIndex === 'number';
    const claimsCaused = scene.causedByPriorScene === true || hasCauseIndex;

    if (!claimsCaused) {
      episodicScenes.push(scene.sceneIndex);
      continue;
    }

    if (!hasCauseIndex) {
      // causedByPriorScene asserted true but no causeSceneIndex given: we
      // cannot verify direction, so treat as an unverified (episodic) beat
      // rather than fabricate a broken link.
      episodicScenes.push(scene.sceneIndex);
      continue;
    }

    const causeIndex = scene.causeSceneIndex as number;

    if (causeIndex === scene.sceneIndex) {
      brokenLinks.push({ sceneIndex: scene.sceneIndex, reason: 'self-cause' });
      continue;
    }
    if (!knownIndices.has(causeIndex)) {
      brokenLinks.push({ sceneIndex: scene.sceneIndex, reason: 'dangling-cause' });
      continue;
    }
    if (causeIndex >= scene.sceneIndex) {
      brokenLinks.push({ sceneIndex: scene.sceneIndex, reason: 'forward-cause' });
      continue;
    }

    // Valid backward causal link.
    causalLinks++;
  }

  const denominator = scenes.length - 1;
  const causalRatio = denominator > 0 ? causalLinks / denominator : 0;

  let support: SupportState;
  if (brokenLinks.length > 0) {
    support = 'CONTRADICTED';
  } else if (causalRatio >= CAUSAL_RATIO_ENTAILED_THRESHOLD) {
    support = 'ENTAILED';
  } else {
    support = 'UNKNOWN';
  }

  return { causalLinks, episodicScenes, causalRatio, brokenLinks, support };
}
