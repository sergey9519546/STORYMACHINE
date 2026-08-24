// Script Doctor perf budget — the CI regression guard for lane W2.
//
// ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
// The 2026-08-14 engine-truth audit measured runScriptDoctor scaling worse
// than quadratically: 26 scenes 208ms, 62 scenes 9.3s, 120 scenes 42s, 240
// scenes 4.5min, ~350 scenes never returned. Nothing in the suite noticed,
// because every fixture the repo owns is 9-14 scenes — the entire test corpus
// lived on the flat part of the curve, below the point where the defect
// exists. A green suite was compatible with a product that hangs for 22
// minutes on a feature-length draft.
//
// So this file tests the one thing the rest of the suite structurally cannot:
// runtime at FEATURE SCALE, on a script big enough for a super-linear pass to
// show itself. The root cause (auditTemporalConsistency's path-consistency
// propagation) is fixed in server/nvm/analyze/temporal-consistency.ts; this is
// what stops the next one from shipping unnoticed.
//
// ── HOW THE BUDGET WAS CHOSEN ───────────────────────────────────────────────
// Post-fix measurements on the development host (Node 22, synthetic
// concatenations of data/screenplays/*.fountain):
//
//     scenes    before        after
//        26       208ms        119ms
//        62       9,300ms      206ms
//       120      42,000ms      386ms
//       244     ~270,000ms   1,178ms
//       306      never       1,695ms
//       351      never       1,854ms
//
// The budgets below are deliberately ~15-30x the measured time, not ~2x. This
// is a REGRESSION detector, not a benchmark: CI runners are shared, throttled
// and wildly variable, and a tight budget would produce flaky failures that
// teach everyone to ignore the file — which is worse than no test. At 15s for
// a 150-scene script, the assertion still fails loudly on any return to the
// pre-fix curve (which spent 42s at 120 scenes) while tolerating an order of
// magnitude of machine-to-machine noise.
//
// PERF_BUDGET_SKIP=1 opts out entirely, for the rare environment where even
// that is not enough.
//
// ── A LIMIT OF THE SYNTHETIC SCRIPT, MEASURED ───────────────────────────────
// buildSyntheticScript concatenates 20 unrelated short screenplays, so the
// result has no global emotional arc to destroy. Measured 2026-08-24: at 150
// scenes the concatenation scores health 86.4 (arcHealth 0.868), and
// act-swapping its three thirds scores 89.1 (arcHealth 1.455) — the scramble
// scores HIGHER, because the "intact" reference was never coherent. So this
// file's script is the right material for a perf budget and the WRONG material
// for a discrimination assertion. Feature-scale discrimination is pinned on
// purpose-built committed fixtures instead, in
// tests/core/feature-scale-discrimination.test.ts. (Also measured: appending
// 130 filler scenes to those 21-scene fixtures collapses the act-swap health
// delta from 9.7 to 0.1 — the arc term does not survive dilution, which is
// worth knowing before anyone tries to scale a discrimination fixture by
// padding it.)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runScriptDoctor, clearDoctorCache } from '../../server/nvm/analyze/doctor.ts';
import { analyzeFountainText, ANALYZER_SCENE_CEILING } from '../../server/nvm/analyze/fountain-analyzer.ts';
import { auditTemporalConsistencyReport } from '../../server/nvm/analyze/temporal-consistency.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENPLAY_DIR = path.resolve(__dirname, '../../data/screenplays');

const SKIP = process.env.PERF_BUDGET_SKIP === '1';

/** Real fixture bodies, used as the raw material for synthetic scale. Built
 *  from actual screenplays rather than `"INT. A - DAY\nA.\n"` repetitions
 *  (which analyzer-dos.test.ts already covers) because the passes that blow
 *  up are the ones that do real work per scene — a trivial scene exercises
 *  none of them. */
function fixtureBodies(): string[] {
  return readdirSync(SCREENPLAY_DIR)
    .filter(f => f.endsWith('.fountain'))
    .sort()
    .map(f => readFileSync(path.join(SCREENPLAY_DIR, f), 'utf8').trim());
}

function countScenes(text: string): number {
  return (text.match(/^(INT\.|EXT\.|INT\/EXT|EXT\/INT|I\/E)/gm) ?? []).length;
}

/** Concatenate fixtures until the target scene count is reached, uniquifying
 *  sluglines on each repeat so the result is a plausible long script rather
 *  than N identical copies (which several passes would dedupe away, hiding
 *  exactly the cross-scene cost this file is measuring). */
function buildSyntheticScript(targetScenes: number): string {
  const bodies = fixtureBodies();
  assert.ok(bodies.length > 0, 'no .fountain fixtures found — perf budget cannot be measured');
  const sceneCounts = bodies.map(countScenes);
  const parts: string[] = [];
  let total = 0;
  let i = 0;
  let repeat = 0;
  while (total < targetScenes) {
    const idx = i % bodies.length;
    if (i > 0 && idx === 0) repeat++;
    parts.push(
      repeat === 0
        ? bodies[idx]
        : bodies[idx].replace(/^(INT\.|EXT\.)(.*)$/gm, (_m, head: string, rest: string) => `${head}${rest} [${repeat}]`),
    );
    total += sceneCounts[idx];
    i++;
  }
  return parts.join('\n\n');
}

describe('Script Doctor perf budget (lane W2 regression guard)', () => {
  it('analyzes a ~150-scene feature-length script well inside the request budget', { skip: SKIP }, async () => {
    const fountain = buildSyntheticScript(150);
    const sceneCount = analyzeFountainText(fountain).sceneCount;
    assert.ok(sceneCount >= 150, `synthetic script should reach feature scale, got ${sceneCount} scenes`);

    clearDoctorCache();
    const started = performance.now();
    const report = await runScriptDoctor(fountain);
    const elapsed = performance.now() - started;

    assert.equal(report.sceneCount, sceneCount);

    // ── SCORE behaviour, not just wall-clock ────────────────────────────────
    // Until 2026-08-24 this file's eight assertions were ALL about time: a
    // 150-scene doctor run could return health: NaN, verdict: undefined or a
    // saturated 100 and every one of them still passed. These four cost no
    // extra work — the report is already in hand — and they are the only place
    // in the suite where a report produced at feature scale is inspected at
    // all. Direction of the feature-scale deductions is pinned separately, on
    // committed fixtures, in tests/core/feature-scale-discrimination.test.ts.
    assert.ok(
      Number.isFinite(report.health) && report.health > 0 && report.health <= 100,
      `feature-scale health must be a real score, got ${report.health}`,
    );
    assert.ok(
      report.verdict !== undefined && (['RECOMMEND', 'CONSIDER', 'PASS'] as const).includes(report.verdict),
      `feature-scale verdict must be a real tier, got ${String(report.verdict)}`,
    );
    // The arc signal must actually be COMPUTED at this scale. doctor.ts gates
    // arcIncoherenceDeduction on sceneCount >= 15 and on this arc being
    // `scored`; a 150-scene script that returns an unscored arc means the term
    // is silently inert on exactly the inputs it was built for.
    assert.ok(
      report.emotionalArc?.scored === true,
      'the emotional arc must be scored on a 150-scene script — arcIncoherenceDeduction ' +
      'reads it, and an unscored arc means that deduction is dead at feature scale',
    );
    assert.ok(
      Number.isFinite(report.emotionalArc.arcHealth),
      `arcHealth must be finite at feature scale, got ${report.emotionalArc.arcHealth}`,
    );

    assert.ok(
      elapsed < 15_000,
      `${sceneCount}-scene analysis took ${Math.round(elapsed)}ms, budget 15000ms. ` +
      'Pre-W2 this shape took ~42s at 120 scenes — a failure here means a ' +
      'super-linear pass is back. Profile aggregateReport first: it, not the ' +
      '14 diagnostic passes, held 99.7% of the original runtime.',
    );
  });

  it('stays inside budget at the analyzer scene ceiling — the worst legitimate input', { skip: SKIP }, async () => {
    // The ceiling is the product's promise about the largest script it will
    // score as one story. If the worst case ALLOWED by the ceiling is not
    // affordable, the ceiling is dishonest — that was exactly the 1000-scene
    // situation lane W1 corrected.
    const fountain = buildSyntheticScript(ANALYZER_SCENE_CEILING);
    clearDoctorCache();
    const started = performance.now();
    const report = await runScriptDoctor(fountain);
    const elapsed = performance.now() - started;

    assert.ok(report.sceneCount >= ANALYZER_SCENE_CEILING - 20);

    // ── SCORE behaviour at the ceiling ──────────────────────────────────────
    // buildSyntheticScript adds whole screenplays until it REACHES the target,
    // so it overshoots: measured 2026-08-24 it lands at 405 scenes against a
    // 400-scene ceiling, analyzeFountainText sets truncatedForAnalysis, and
    // doctor.ts's analysisComplete gate then WITHHOLDS the score (health 0,
    // verdict undefined) rather than reporting a number derived from a
    // truncated document. That withholding is the correct behaviour and worth
    // pinning — a regression that silently scored the first 400 scenes as if
    // they were the whole script would be a trust bug, not a perf bug.
    // Both branches are asserted so this stays true whichever side of the
    // ceiling the fixture corpus happens to put us on.
    if (report.analysisComplete) {
      assert.ok(
        Number.isFinite(report.health) && report.health > 0 && report.health <= 100,
        `ceiling-scale health must be a real score when the analysis completed, got ${report.health}`,
      );
      assert.ok(
        report.verdict !== undefined && (['RECOMMEND', 'CONSIDER', 'PASS'] as const).includes(report.verdict),
        `ceiling-scale verdict must be a real tier when the analysis completed, got ${String(report.verdict)}`,
      );
    } else {
      assert.equal(
        report.health, 0,
        'a truncated analysis must withhold the score, not publish a partial one',
      );
      assert.equal(
        report.verdict, undefined,
        'a truncated analysis must withhold the verdict, not publish a partial one',
      );
    }

    assert.ok(
      elapsed < 30_000,
      `${report.sceneCount}-scene (ceiling) analysis took ${Math.round(elapsed)}ms, budget 30000ms.`,
    );
  });

  it('scales sub-quadratically from 60 to 240 scenes', { skip: SKIP }, async () => {
    // A budget alone can be satisfied by a fast machine running quadratic
    // code. This asserts the SHAPE of the curve: 4x the scenes must not cost
    // 16x the time. Pre-fix this ratio was ~29x (9.3s -> 270s); post-fix it
    // measures ~5.7x. The 12x bound sits between them with room for noise.
    const small = buildSyntheticScript(60);
    const large = buildSyntheticScript(240);

    clearDoctorCache();
    const smallStart = performance.now();
    await runScriptDoctor(small);
    const smallMs = Math.max(1, performance.now() - smallStart);

    clearDoctorCache();
    const largeStart = performance.now();
    await runScriptDoctor(large);
    const largeMs = performance.now() - largeStart;

    const ratio = largeMs / smallMs;
    assert.ok(
      ratio < 12,
      `4x the scenes cost ${ratio.toFixed(1)}x the time (${Math.round(smallMs)}ms -> ` +
      `${Math.round(largeMs)}ms). Quadratic-or-worse growth has returned.`,
    );
  });

  it('temporal-consistency propagation — the measured root cause — stays near-linear', { skip: SKIP }, async () => {
    // Pinned at the exact function the audit's curve turned out to be:
    // auditTemporalConsistency was 158ms / 7.5s / 43.4s at 26 / 62 / 120
    // scenes, i.e. 99.7% of the whole doctor. Guarding it directly makes a
    // regression report the cause, not just the symptom.
    const records = analyzeFountainText(buildSyntheticScript(240)).records;
    const started = performance.now();
    const report = auditTemporalConsistencyReport(records);
    const elapsed = performance.now() - started;

    assert.equal(typeof report.consistent, 'boolean');
    assert.ok(
      elapsed < 8_000,
      `temporal audit over ${records.length} scenes took ${Math.round(elapsed)}ms, budget 8000ms ` +
      '(pre-W2: ~270s at this scale).',
    );
  });
});
