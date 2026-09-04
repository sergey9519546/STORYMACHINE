// Does the engine order a BLIND author's matched excellent/bad pairs?
//
// WHY THIS EXISTS. The calibration corpus
// (server/nvm/analyze/calibration/corpus.ts) separates its four bands, and
// that separation underwrites the percentile, the band-monotonicity tests in
// tests/core/calibration.test.ts, and the "stronger than N% of the reference
// set" copy the product shows a writer. The 2026-09-04 advice-quality audit
// raised the obvious objection: the corpus's own header says the troubled
// band "leans hard on the on-the-nose/cliche lexicon dialogue.ts and
// originality.ts already flag" and names the literal strings it uses. A
// corpus authored FROM the rules cannot test the rules.
//
// So twelve short screenplays were written blind — six matched pairs, one
// intended-excellent and one intended-bad each, sharing a premise, a
// ten-scene skeleton, a cast and a word budget within five percent — by an
// author who had read no rule, lexicon, revision pass, calibration sample or
// prior discrimination number at the time of writing. The write-first order
// is a fact in the git history: the fixtures land in their own commit ahead
// of this file, and they were not edited afterwards. See
// tests/fixtures/blind-pairs/README.md and
// docs/p1-benchmark/BLIND_PAIRS_2026-09-04.md.
//
// WHAT THIS FILE ASSERTS, in two tiers:
//
//   HARD — the experimental design itself. Twelve fixtures, ten scenes each,
//   per-pair word budgets matched within five percent. These are properties
//   of the stimulus, not of the engine; if one breaks, the comparison below
//   stops being controlled and every number in the doc is void.
//
//   KNOWN-FAILING — the engine orders all six pairs (excellent health > bad
//   health). Measured 2026-09-04: it orders ONE of six, mean health gap
//   -0.02, mean top-ten rule overlap 8.0 of 10. On the calibration corpus's
//   own strong-vs-troubled samples, scored on identical statistics, it orders
//   FIVE of five with a mean gap of 25.32.
//
// The known-failing tier follows the disposition this repository already uses
// for a real defect it refuses to hide — evals/scoring/runner/
// metamorphic-cases.ts's `disposition: 'known-failing'` (empty_verbosity),
// whose runner prints a standing witness rather than deleting the case, and
// whose header says to "flip them to HARD after confirming recalibration"
// once they pass. `knownFailing` below makes that flip MANDATORY: while the
// documented failure reproduces, the test passes and prints the witness, so
// `npm test` stays at zero failures; the day the engine starts ordering the
// pairs, the test FAILS with an instruction to promote it. A known failure
// that quietly starts passing is how a fixed defect goes unnoticed, and how a
// stale one outlives its own fix.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DIR = path.join(REPO, 'tests', 'fixtures', 'blind-pairs');

/** The six premises, each with an `-excellent` and a `-bad` member. */
const PAIRS = ['night-shift', 'low-tide', 'the-deposit', 'the-ledger', 'signal-drift', 'fence-line'] as const;

/** Declared design tolerances (see the fixtures' README). */
const REQUIRED_SCENES = 10;
const MAX_WORD_RATIO = 1.05;

function read(pair: string, variant: 'excellent' | 'bad'): string {
  return readFileSync(path.join(DIR, `${pair}-${variant}.fountain`), 'utf8');
}

/** Screenplay body only: the `/* *\/` provenance boneyard is not the drama and
 *  must not count toward a word budget (the reason it is a boneyard at all —
 *  see tests/core/fixture-provenance-comment-guard.test.ts). */
function bodyWords(text: string): number {
  const out: string[] = [];
  let inBoneyard = false;
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (t.startsWith('/*')) inBoneyard = true;
    if (inBoneyard) {
      if (t.includes('*/')) inBoneyard = false;
      continue;
    }
    out.push(line);
  }
  return out.join('\n').split(/\s+/).filter(Boolean).length;
}

function sceneHeadings(text: string): number {
  return text.split('\n').filter(l => /^(INT|EXT|EST|I\/E)[. ]/i.test(l.trim())).length;
}

/** Run the assertion, but invert its disposition: a documented, reproducing
 *  failure is the expected state and passes with a printed witness; a PASS is
 *  the event we must not miss and fails loudly with the promotion
 *  instruction. Mirrors metamorphic-lib's known-failing / unexpected-pass
 *  split, made blocking in both directions. */
function knownFailing(reason: string, fn: () => void): void {
  let threw: Error | undefined;
  try {
    fn();
  } catch (e) {
    threw = e as Error;
  }
  if (threw) {
    // The documented state. Reproduce it, record it, do not fail the build.
    process.stdout.write(`\nKNOWN FAILING (registered ${'2026-09-04'}): ${reason}\n  witness: ${threw.message.split('\n')[0]}\n`);
    return;
  }
  assert.fail(
    `KNOWN-FAILING ASSERTION NOW PASSES — ${reason}\n` +
      'This is good news and it must not be absorbed silently. Promote this to a hard\n' +
      'assertion (delete the knownFailing wrapper), re-run the measurement in\n' +
      'docs/p1-benchmark/BLIND_PAIRS_2026-09-04.md, and record what changed. Until then\n' +
      'the suite deliberately fails, because a known failure that quietly starts passing\n' +
      'is how a real improvement goes unnoticed.',
  );
}

describe('blind matched pairs — the stimulus is a controlled experiment', () => {
  it('all twelve fixtures are present and parse as ten-scene screenplays', () => {
    for (const pair of PAIRS) {
      for (const variant of ['excellent', 'bad'] as const) {
        const text = read(pair, variant);
        assert.equal(
          sceneHeadings(text),
          REQUIRED_SCENES,
          `${pair}-${variant}: the pairs share one ten-scene skeleton by design`,
        );
      }
    }
  });

  it('each pair is matched on word budget within five percent', () => {
    for (const pair of PAIRS) {
      const good = bodyWords(read(pair, 'excellent'));
      const bad = bodyWords(read(pair, 'bad'));
      const ratio = Math.max(good, bad) / Math.min(good, bad);
      assert.ok(
        ratio <= MAX_WORD_RATIO,
        `${pair}: excellent ${good} words vs bad ${bad} words (ratio ${ratio.toFixed(3)}) — ` +
          'length is the confound this design exists to remove; see the corpus richness ' +
          'finding in docs/p1-benchmark/BLIND_PAIRS_2026-09-04.md',
      );
    }
  });
});

describe('blind matched pairs — does the engine order them?', () => {
  it('orders every pair excellent-over-bad on health', { timeout: 600_000 }, async () => {
    const rows: Array<{ pair: string; good: number; bad: number }> = [];
    for (const pair of PAIRS) {
      const good = await runScriptDoctor(read(pair, 'excellent'));
      const bad = await runScriptDoctor(read(pair, 'bad'));
      rows.push({ pair, good: good.health, bad: bad.health });
    }

    const wrong = rows.filter(r => !(r.good > r.bad));
    const detail = rows
      .map(r => `${r.pair}: ${r.good.toFixed(1)} vs ${r.bad.toFixed(1)} (${(r.good - r.bad).toFixed(1)})`)
      .join('; ');

    knownFailing(
      'the engine does not order a blind author\'s matched excellent/bad pairs. ' +
        'Measured 2026-09-04: 1 of 6 ordered, mean gap -0.02, mean top-ten overlap 8.0/10, ' +
        'against 5 of 5 and a 25.32 gap on the calibration corpus\'s own strong-vs-troubled samples.',
      () => {
        assert.deepEqual(
          wrong.map(r => r.pair),
          [],
          `pairs not ordered excellent-over-bad — ${detail}`,
        );
      },
    );
  });
});
