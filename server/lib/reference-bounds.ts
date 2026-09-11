// The calibration reference set's SHAPE — how many samples it holds, and the
// scene-count and word-count band they occupy — derived from the corpus itself.
//
// ── Why this exists (2026-09-11, producer-tier discovery #11/#12) ────────────
//
// Every percentile this product shows is a rank against ONE set: the 20
// hand-authored synthetic samples in
// server/nvm/analyze/calibration/corpus.ts. Those samples are 9-10 scenes and
// 256-337 words each — deliberately so; corpus.ts's own header explains that
// band monotonicity is a property of a CONTROLLED-RICHNESS design in which every
// sample shares a scene and word budget so craft is the only variable.
//
// A real screenplay is nowhere near that band. data/screenplays/runoff.fountain
// is 9 scenes but 1,448 words; the committed feature assembly is 231 scenes and
// 19,293 words. Ranking either against this set puts it at the top of the
// distribution for being longer, not better — which is why the health percentile
// read 100 for every real draft. The producer tier therefore prints the bounds
// beside the reading, and src/lib/percentile-copy.ts's percentileIsComparable
// refuses a band outside them.
//
// DERIVED, NOT TYPED IN: the numbers come from REFERENCE_CORPUS at module load,
// counted with the same analyzer the doctor uses for sceneCount and the same
// fastWordCount it uses for wordCount, so a corpus edit moves them instead of
// making this file wrong. tests/core/reference-bounds.test.ts pins the derived
// values against the literals src/lib/percentile-copy.ts has to carry (the
// browser bundle cannot afford to import 1,900 lines of corpus prose), so a
// corpus edit fails CI rather than drifting those two apart.
//
// NOT on the scoring path: calibration/** IS always-scoring, but this module
// only READS it, and nothing reachable from doctor.ts imports this module.

import { REFERENCE_CORPUS } from '../nvm/analyze/calibration/corpus.ts';
import { analyzeFountainText } from '../nvm/analyze/fountain-analyzer.ts';
import { fastWordCount } from './string-utils.ts';
import { referenceBoundsLine } from '../../src/lib/percentile-copy.ts';

export interface ReferenceBounds {
  /** How many samples the reference set holds. */
  samples: number;
  minScenes: number;
  maxScenes: number;
  minWords: number;
  maxWords: number;
}

function deriveBounds(): ReferenceBounds {
  const scenes: number[] = [];
  const words: number[] = [];
  for (const sample of REFERENCE_CORPUS) {
    scenes.push(analyzeFountainText(sample.fountain).sceneCount);
    words.push(fastWordCount(sample.fountain));
  }
  return {
    samples: REFERENCE_CORPUS.length,
    minScenes: Math.min(...scenes),
    maxScenes: Math.max(...scenes),
    minWords: Math.min(...words),
    maxWords: Math.max(...words),
  };
}

/** Computed once at module load. The corpus is a module constant and
 *  analyzeFountainText is pure, so there is nothing to invalidate. */
export const REFERENCE_BOUNDS: ReferenceBounds = deriveBounds();

/**
 * The confidence line the producer tier prints under its percentile reading:
 *
 *   "20 samples / 9–10 scenes / 256–337 words"
 *
 * FORMATTED BY src/lib/percentile-copy.ts's referenceBoundsLine, not by a second
 * formatter here — that module has to carry the bounds as literals for the
 * browser bundle (see its header), and one of the two would otherwise end up
 * writing the en dash, the slashes or the word "samples" differently from the
 * other. This function supplies the DERIVED numbers to that single formatter.
 */
export function derivedReferenceBoundsLine(): string {
  return referenceBoundsLine(REFERENCE_BOUNDS);
}
