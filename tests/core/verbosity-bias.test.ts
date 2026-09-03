// Verbosity-bias regression suite (lane R5, 2026-09-03).
//
// WHAT THIS GUARDS. Until 2026-09-03 the health formula normalized issue
// density by wordCount^0.7, so appending stateless filler prose — words that
// change no state, introduce no character and answer no question — made the
// denominator grow faster than the findings did and RAISED health. Measured
// on evals/scoring/metamorphic/base.fountain: 60.9 -> 66.3, across the
// CONSIDER/PASS verdict boundary. The defect was held as a known-failing
// metamorphic witness for seven weeks (docs/scoring/VERBOSITY_BIAS_2026-07-11.md)
// because fixing it was believed to break the calibration bands.
// docs/scoring/VERBOSITY_BIAS_FIX_2026-09-03.md is the fix write-up.
//
// WHY A NODE TEST TOO, when evals/scoring/runner/run-metamorphic.ts already
// carries `empty_verbosity` as a hard case: the metamorphic runner is a
// separate npm script (`npm run test:metamorphic`) with its own CI step. A
// witness this expensive to win back belongs in the suite that runs on every
// `npm test` as well, and the assertions here are stronger than the runner's
// single scalar comparison — they pin down WHERE the delta is allowed to come
// from, not just its sign.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runScriptDoctor, computeHealthScore } from '../../server/nvm/analyze/doctor.ts';
import type { CoverageVerdict } from '../../server/nvm/analyze/types.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = readFileSync(
  path.join(HERE, '../../evals/scoring/metamorphic/base.fountain'),
  'utf8',
);

/** The exact filler the standing metamorphic witness uses. Three sentences
 *  that state nothing: no new character, no new question, no state change. */
const FILLER = 'The wind continues. Nothing else happens. Time passes without event.\n\n';

/** Same scene split the metamorphic runner uses, so this suite and that one
 *  are testing the identical transformation. */
function splitScenes(text: string): { head: string; scenes: string[] } {
  const parts = text.split(/^(?=INT\.|EXT\.)/mi);
  const head = /^(INT\.|EXT\.)/i.test(parts[0]) ? '' : parts.shift() ?? '';
  return { head, scenes: parts.filter(x => /^(INT\.|EXT\.)/i.test(x)) };
}

/** Filler appended INSIDE each existing scene: more words, more action
 *  paragraphs, no new scene — the transformation that used to raise health. */
function padWithProse(text: string): string {
  const { head, scenes } = splitScenes(text);
  return head + scenes.map(s => s + FILLER).join('');
}

/** The same filler, but each paragraph carries its own scene heading — filler
 *  that DOES add the one unit the denominator reads. */
function padWithScenes(text: string): string {
  const { head, scenes } = splitScenes(text);
  return head + scenes.map((s, i) => `${s}INT. FILLER ROOM ${i + 1} - NIGHT\n\n${FILLER}`).join('');
}

const SCARCITY_SCALE = 140; // doctor.ts's scarcityPenalty, mirrored for the bound below

describe('verbosity bias — appended prose cannot buy health (lane R5)', () => {
  it('appending stateless filler prose does not raise health', async () => {
    const [base, padded] = await Promise.all([
      runScriptDoctor(BASE),
      runScriptDoctor(padWithProse(BASE)),
    ]);

    // Fixture sanity: we really did pad, and we really did NOT add scenes —
    // otherwise "health did not rise" would be true for the wrong reason.
    assert.ok(
      padded.wordCount > base.wordCount * 1.25,
      `filler must materially lengthen the script: ${base.wordCount} -> ${padded.wordCount}`,
    );
    assert.equal(padded.sceneCount, base.sceneCount, 'prose-only filler must not add scenes');

    assert.ok(
      padded.health <= base.health,
      `appending ${padded.wordCount - base.wordCount} words of stateless filler raised health ` +
      `${base.health} -> ${padded.health}. This is the 2026-07-11 verbosity bias; see ` +
      'docs/scoring/VERBOSITY_BIAS_FIX_2026-09-03.md.',
    );
  });

  it('the whole delta is explained by the findings the filler drew — prose volume is not an input', async () => {
    const [base, padded] = await Promise.all([
      runScriptDoctor(BASE),
      runScriptDoctor(padWithProse(BASE)),
    ]);

    // The strong form of the invariant. health is now a function of exactly
    // two things — the severity mix and the scene count — so recomputing the
    // padded script's health from the BASE script's scene count must land on
    // the padded number exactly. Under the old word-denominator formula this
    // identity was false by construction: the same severity mix scored
    // differently at a different word count, which IS the bias.
    assert.equal(
      computeHealthScore(padded.bySeverity, base.sceneCount),
      padded.health,
      'health must be reproducible from (bySeverity, sceneCount) alone — no residual word-count channel',
    );
    assert.equal(
      computeHealthScore(base.bySeverity, padded.sceneCount),
      base.health,
      'and symmetrically: the base score must not depend on how long the prose is',
    );

    // The filler is not free of findings — the pipeline legitimately flags it
    // (measured: 54 -> 71 minors). That is why health FALLS rather than
    // staying flat, and why this suite asserts no lower bound on the delta:
    // demanding "filler must not lower health" would be demanding the score
    // ignore detections it genuinely made.
    assert.ok(
      padded.bySeverity.minor > base.bySeverity.minor,
      'fixture sanity: the filler should itself draw findings, which is why the delta is negative',
    );
  });

  it('does not let filler upgrade the coverage verdict', async () => {
    // The product-level statement of the same defect: the historical witness
    // moved 66.4 -> 72.9 across a verdict tier, so a writer could pad a draft
    // into a better-sounding industry verdict without changing the story.
    const rank = (v: CoverageVerdict | undefined): number =>
      v === 'RECOMMEND' ? 2 : v === 'CONSIDER' ? 1 : 0;
    const [base, padded] = await Promise.all([
      runScriptDoctor(BASE),
      runScriptDoctor(padWithProse(BASE)),
    ]);
    assert.ok(
      rank(padded.verdict) <= rank(base.verdict),
      `filler upgraded the verdict ${base.verdict} -> ${padded.verdict}`,
    );
  });

  it('filler that DOES add opportunities may only be rewarded up to the scarcity relief it buys', async () => {
    // The other half of the invariant. Adding scene headings adds the one
    // unit the denominator reads, so health is ALLOWED to move up — but only
    // as far as the scene-scarcity term relaxes (SCARCITY_SCALE/sceneCount is
    // the sole term that falls when scenes are added; the density term can
    // only be diluted by scenes that carry fewer findings than the script's
    // own average). Anything beyond that bound would mean filler scenes are
    // being scored as craft.
    const [base, padded] = await Promise.all([
      runScriptDoctor(BASE),
      runScriptDoctor(padWithScenes(BASE)),
    ]);

    assert.ok(padded.sceneCount > base.sceneCount, 'fixture sanity: this variant must add scenes');

    const scarcityRelief =
      SCARCITY_SCALE / base.sceneCount - SCARCITY_SCALE / padded.sceneCount;
    assert.ok(
      padded.health - base.health <= scarcityRelief + 0.05,
      `filler scenes moved health ${base.health} -> ${padded.health} (+${(padded.health - base.health).toFixed(1)}), ` +
      `beyond the ${scarcityRelief.toFixed(1)}-point scene-scarcity relief they buy`,
    );
  });
});
