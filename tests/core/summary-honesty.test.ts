// The report's paragraph may not contradict the five numbers beside it.
//
// MEASURED DEFECT (2026-09-07, product-discovery item 8), reproduced directly
// on `main @ 9b199b72` and pinned here in both directions:
//
//   * A two-scene inert script scores health 30 and reads PASS — "scored in
//     the bottom band, below the decline line" — while all five dimensions
//     score 100. It emitted FIVE strengths, every one of them
//     "Nothing to fix in <dimension> — clean across all 2 scene(s)", and the
//     paragraph said nothing about what removed 70 points.
//   * A 139-scene assembled document scores health 80 and the paragraph
//     called Character "the lowest-scoring diagnostic dimension, at 82/100" —
//     a number ABOVE the overall it is quoted beside.
//
// Both come from one omission: `computeDimensionScore` is scarcity-free by
// construction (Wave 18-beta) while `health` carries the scene-count term on
// top, so the two are different statistics and the paragraph never said so.
//
// This file is deliberately about STRINGS. Nothing here asserts a health
// value; the identity receipt in
// docs/scoring/FEATURE_LENGTH_DEFECTS_2026-09-07.md §9 is what shows no
// number moved.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runScriptDoctor, buildStrengths } from '../../server/nvm/analyze/doctor.ts';
import type { DimensionScore } from '../../server/nvm/analyze/types.ts';
import type { StructureState } from '../../server/nvm/screenplay/structure.ts';
import { stapledShortsText } from '../../evals/scoring/runner/metamorphic-cases.ts';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** `plainSummary` is optional on the report contract (a degraded report can
 *  omit it). Every assertion below is ABOUT that string, so an absent one is
 *  a failure rather than a skip. */
function summaryOf(r: { plainSummary?: string }): string {
  assert.ok(typeof r.plainSummary === 'string' && r.plainSummary.length > 0, 'the report must carry a plainSummary');
  return r.plainSummary;
}

/** Two scenes in which nothing happens: enough to parse, far too little for
 *  any pass to flag anything, so every dimension reads 100 while the
 *  scene-count term removes 70 points. */
const INERT_TWO_SCENE = `INT. ROOM - DAY

A room. Nothing happens.

INT. HALL - DAY

A hall. Nothing happens here either.
`;

const SHORT = readFileSync(path.join(REPO, 'data/screenplays/mise.fountain'), 'utf8');
const SHORT_LOW = readFileSync(path.join(REPO, 'data/screenplays/room-12.fountain'), 'utf8');

/** A structurally inert StructureState — the shape buildStrengths reads, with
 *  every guard's condition switched off, so each unit test below turns on
 *  exactly the one field it is about. */
const FLAT_STRUCTURE: StructureState = {
  actPosition: 'act1', completionPercent: 10, avgSuspensePerScene: 0, escalating: false,
  reversalCount: 0, reversalDensity: 0, approachingClimax: false, openClues: 0,
  revelationCount: 0, midpointPressure: 0, tightestScene: 0,
};

describe('plainSummary cannot contradict the dimension scores', () => {
  it('FIRES on the inert two-scene script: names the scene-count term, and never calls a 100 the "lowest-scoring" problem', async () => {
    const r = await runScriptDoctor(INERT_TWO_SCENE);

    // The premise, asserted so this test cannot pass vacuously.
    assert.equal(r.verdict, 'PASS', 'the fixture must be bottom-band');
    assert.ok((r.dimensions ?? []).every(d => Math.round(d.score) === 100), 'every dimension must read 100 here');

    assert.match(
      summaryOf(r),
      /Every diagnostic dimension scores at or above the overall/,
      'the paragraph must say the dimensions sit above the overall',
    );
    assert.match(
      summaryOf(r),
      /adds the scene-count term — 70 point\(s\) at 2 scene\(s\)/,
      'the paragraph must name what actually drove the score, with the number',
    );
    // The gap is quoted too (round 2 item 6): on THIS document the term and
    // the gap coincide at 70, which is exactly why the old single-number
    // sentence looked sound here and was wrong on longer documents.
    assert.match(summaryOf(r), /lowest: [^)]*? at 100\/100, 70 point\(s\) above it\)/);
    assert.ok(
      !/lowest-scoring diagnostic dimension/.test(summaryOf(r)),
      `no dimension may be called "lowest-scoring" when every one is above the overall — got: ${summaryOf(r)}`,
    );
  });

  it('FIRES on the assembled feature: the lowest dimension (82) is above the overall (80), so it is not called the problem', async () => {
    const r = await runScriptDoctor(stapledShortsText());
    const shownHealth = Math.round(r.health);
    const shownLowest = Math.min(...(r.dimensions ?? []).map(d => Math.round(d.score)));

    assert.ok(shownLowest > shownHealth, `premise: the lowest dimension (${shownLowest}) must sit above the overall (${shownHealth})`);
    assert.match(summaryOf(r), /Every diagnostic dimension scores at or above the overall/);
    assert.match(summaryOf(r), /adds the scene-count term — 12 point\(s\) at 139 scene\(s\)/);
    assert.ok(!/lowest-scoring diagnostic dimension/.test(summaryOf(r)));

    // ROUND 2, item 6 — the regression this test could NOT catch before. The
    // sentence used to end "The gap is the length of the draft, not the
    // dimensions" and quoted the term as if it were the gap. Here the gap is
    // 4 displayed points and the term is 12: three times the thing it was
    // offered as the explanation of. So assert BOTH numbers, and assert that
    // the false causal clause is gone — on this document it is provably false.
    const quoted = /lowest: .*? at (\d+)\/100, (\d+) point\(s\) above it\)/.exec(summaryOf(r));
    assert.ok(quoted, `the sentence must quote the gap as well as the dimension; got: ${summaryOf(r)}`);
    assert.equal(Number(quoted![1]), shownLowest, 'the quoted lowest dimension must be the real one');
    assert.equal(Number(quoted![2]), shownLowest - shownHealth, 'the quoted gap must be the real displayed gap');
    const term = Number(/scene-count term — (\d+) point\(s\)/.exec(summaryOf(r))![1]);
    assert.ok(term > Number(quoted![2]) * 2, `premise of this regression: the term (${term}) must dwarf the gap (${quoted![2]}) here, or the fixture no longer exercises it`);
    assert.ok(
      !/The gap is the length of the draft/.test(summaryOf(r)),
      'the sentence may not assert that the gap IS the scene-count term on a document where it demonstrably is not',
    );
  });

  it('NO-FIRE on a short whose dimensions straddle the overall: the ordinary sentence is unchanged', async () => {
    const r = await runScriptDoctor(SHORT);
    const shownHealth = Math.round(r.health);
    const shownLowest = Math.min(...(r.dimensions ?? []).map(d => Math.round(d.score)));

    assert.ok(shownLowest <= shownHealth, `premise: the lowest dimension (${shownLowest}) must sit at or below the overall (${shownHealth})`);
    assert.match(
      summaryOf(r),
      /is the lowest-scoring diagnostic dimension, at \d+\/100 — most of the trouble is around /,
      'when the dimensions do explain the score, the paragraph must still point at the weakest one',
    );
    assert.ok(
      !/Every diagnostic dimension scores at or above the overall/.test(summaryOf(r)),
      'the disclosure sentence must not fire when there is nothing to disclose',
    );
  });

  it('NO-FIRE on a second short, so the no-fire case is not one lucky fixture', async () => {
    const r = await runScriptDoctor(SHORT_LOW);
    assert.match(summaryOf(r), /is the lowest-scoring diagnostic dimension/);
    assert.ok(!/Every diagnostic dimension scores at or above the overall/.test(summaryOf(r)));
  });

  it('the quoted "lowest" number, whenever the phrase is used, is at or below the quoted overall — across every committed screenplay', async () => {
    // The property, checked over the whole distributable corpus rather than
    // the three fixtures above: the phrase and the contradiction can never
    // co-occur.
    const dir = path.join(REPO, 'data/screenplays');
    const names = ['chain-of-custody', 'close-quarters', 'code-blue', 'counter-offer', 'dead-frequency',
      'high-voltage', 'mise', 'off-season', 'quiet-season', 'red-line', 'room-12', 'runoff',
      'same-page', 'soft-launch', 'the-defense-rests', 'the-detour', 'the-key-under-the-mat',
      'transfer-window', 'two-lane', 'undertow'];
    // WIDENED 2026-09-11 (round 2): this used to require that at least 10 of
    // the 20 take the "lowest-scoring" branch, which made the property
    // hostage to where the scarcity term happens to sit — the saturation move
    // from 15 to 12 scenes lowered every 13-14-scene script by 0.9-1.7 points
    // and flipped four of them to the disclosure branch, so the old floor
    // failed on a change that made nothing less honest. Every script now has
    // to take EXACTLY ONE of the two branches and satisfy that branch's own
    // invariant, so the property covers all 20 regardless of which way each
    // one falls.
    let phrase = 0;
    let disclosure = 0;
    for (const name of names) {
      const r = await runScriptDoctor(readFileSync(path.join(dir, `${name}.fountain`), 'utf8'));
      const summary = summaryOf(r);
      const m = /is the lowest-scoring diagnostic dimension, at (\d+)\/100/.exec(summary);
      const d = /Every diagnostic dimension scores at or above the overall \(lowest: .*? at (\d+)\/100, (\d+) point\(s\) above it\)/.exec(summary);
      assert.ok(
        (m === null) !== (d === null),
        `${name}: the paragraph must take exactly one of the two branches; got: ${summary}`,
      );
      if (m) {
        phrase++;
        assert.ok(
          Number(m[1]) <= Math.round(r.health),
          `${name}: paragraph quotes ${m[1]}/100 as the lowest dimension beside an overall of ${Math.round(r.health)}`,
        );
      } else {
        disclosure++;
        const shownLowest = Math.min(...(r.dimensions ?? []).map(x => Math.round(x.score)));
        assert.equal(Number(d![1]), shownLowest, `${name}: the disclosure must quote the real lowest dimension`);
        assert.equal(
          Number(d![2]), shownLowest - Math.round(r.health),
          `${name}: the disclosure must quote the real displayed gap`,
        );
        assert.ok(shownLowest > Math.round(r.health), `${name}: the disclosure fired while the dimensions do not sit above the overall`);
      }
    }
    assert.equal(phrase + disclosure, names.length, 'every script must be accounted for');
    assert.ok(phrase >= 1 && disclosure >= 1, `both branches must be exercised by the corpus: ${phrase} phrase / ${disclosure} disclosure`);
  });
});

describe('strengths cannot call a dimension clean under a bottom-band verdict', () => {
  it('FIRES: the inert two-scene script lists no strengths at all', async () => {
    const r = await runScriptDoctor(INERT_TWO_SCENE);
    assert.equal(r.verdict, 'PASS');
    assert.deepEqual(
      r.strengths,
      [],
      'a bottom-band report may not open with "Nothing to fix in <dimension>"',
    );
  });

  it('FIRES at the unit: the same dimensions produce five bullets at CONSIDER and none at PASS', () => {
    const dim = (key: DimensionScore['key'], label: string): DimensionScore => ({
      key, label, passes: [], score: 100, issueCount: 0, summary: 'clean', percentile: 100,
    });
    const dimensions: DimensionScore[] = [
      dim('structure-pacing', 'Structure & Pacing'),
      dim('character', 'Character'),
      dim('dialogue-voice', 'Dialogue & Voice'),
      dim('plot-logic', 'Plot Logic & Payoff'),
      dim('theme-originality', 'Theme & Originality'),
    ];
    const base = {
      structure: FLAT_STRUCTURE,
      anyClueSeeded: false,
      sceneCount: 2,
      bySeverity: { critical: 0, major: 0, minor: 0 },
      dimensions,
    };

    const atConsider = buildStrengths({ ...base, verdict: 'CONSIDER' });
    const atPass = buildStrengths({ ...base, verdict: 'PASS' });
    const withoutVerdict = buildStrengths(base);

    assert.equal(atConsider.length, 5, 'the guard must still fire when the verdict is not bottom-band');
    assert.deepEqual(atPass, [], 'the guard must not fire at PASS');
    assert.deepEqual(
      withoutVerdict,
      atConsider,
      'an absent verdict must behave exactly as before this change — every pre-2026-09-07 fixture depends on it',
    );
  });

  it('NO-FIRE: a bottom-band report keeps a structural strength it genuinely earned', () => {
    // The narrow rule is about DIMENSIONS. A draft that measurably escalates
    // has earned that sentence whatever band it lands in, and deleting it
    // would be a different dishonesty.
    const strengths = buildStrengths({
      verdict: 'PASS',
      structure: { ...FLAT_STRUCTURE, actPosition: 'act2b', completionPercent: 60, avgSuspensePerScene: 2, escalating: true },
      anyClueSeeded: false,
      sceneCount: 8,
      bySeverity: { critical: 2, major: 0, minor: 0 },
      dimensions: [{
        key: 'structure-pacing', label: 'Structure & Pacing', passes: [], score: 40, issueCount: 3,
        summary: 'three issues', percentile: 20,
      }],
    });
    assert.ok(
      strengths.some(s => /Tension rises on average/.test(s)),
      `a measured structural fact survives a bottom-band verdict; got ${JSON.stringify(strengths)}`,
    );
    assert.ok(
      !strengths.some(s => /Nothing to fix in/.test(s)),
      'no dimension bullet at PASS',
    );
  });

  it('the guarantee the exports "What\'s Working" block relies on: no strength names a dimension unless that dimension has zero issues AND the verdict is not bottom-band', async () => {
    for (const text of [INERT_TWO_SCENE, SHORT, SHORT_LOW, stapledShortsText()]) {
      const r = await runScriptDoctor(text);
      const cleanBullets = (r.strengths ?? []).filter(s => s.startsWith('Nothing to fix in '));
      if (r.verdict === 'PASS') {
        assert.deepEqual(cleanBullets, [], 'no dimension bullet may survive a bottom-band verdict');
        continue;
      }
      for (const bullet of cleanBullets) {
        const label = /^Nothing to fix in (.+?) — clean/.exec(bullet)?.[1];
        const dim = (r.dimensions ?? []).find(d => d.label === label);
        assert.ok(dim, `strength names "${label}", which is not one of this report's dimensions`);
        assert.equal(dim!.issueCount, 0, `"${label}" is called clean while carrying ${dim!.issueCount} issue(s)`);
      }
    }
  });
});
