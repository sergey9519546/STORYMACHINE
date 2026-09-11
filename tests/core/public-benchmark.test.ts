// The public benchmark: a discrimination number computed on EVERY CI run.
//
// ── What this file is, in one paragraph ────────────────────────────────────
// Until this test existed, every discrimination statistic in the repository
// was unavailable to CI. The AUC-24 ratchet is env-gated on
// REAL_SCRIPT_CORPUS_DIR and the corpus is local-only for copyright reasons,
// so tests/core/real-script-corpus.test.ts SKIPS on every run;
// tests/core/auc24-table.test.ts would recompute the same statistic from a
// committed table of numbers, but that table can only be produced by the
// owner and is not committed, so it SKIPS too. The only always-on signal was
// tests/core/blind-pairs-discrimination.test.ts, which records a FAILING
// craft result (1 of 6 pairs ordered) and asserts no floor. This file closes
// that gap on the one axis that needs no corpus: the 32 distributable
// .fountain files are IN the repository, so CI can run the whole measurement
// end to end — intact health, degraded health, AUC, seeded bootstrap
// interval, pre-registered split — and assert a floor against it.
//
// ── It asserts three different things, deliberately ────────────────────────
//   1. THE FIXTURE LOCK. tests/fixtures/public-corpus-manifest.json holds 32
//      rows of {file, sha256, sceneCount, words, health, verdict}. Any scoring
//      change that moves a number on real distributable prose now shows up as
//      a reviewable numeric diff — which the project has today only for a
//      corpus CI cannot read (tests/fixtures/real-corpus-manifest.json).
//   2. THE PRE-REGISTERED SPLIT. Every row of
//      tests/fixtures/public-benchmark-split.json must equal what the rule
//      recomputes from the file's own bytes. A hand-edit fails here.
//   3. THE RATCHET. Six floors in scripts/lib/auc.ts — three degradations
//      times two statistics.
//   4. THE POSITIVE CONTROL. Added round 2, and it is what makes (3)
//      readable at all: see below.
//
// ── The measurement floors are near chance, and the messages below say so ──
// Measured on this tree 2026-09-12, matched-pair (PRIMARY) / all-pairs:
// shuffle-drop 0.5313 / 0.5586 (unchanged from 2026-09-06); climax-relocate
// 0.4063 / 0.4443 (was 0.4219 / 0.4673 — the relocation now actually moves the
// final scene to position one; adversarial finding 12). All four of
// those 95% intervals contain 0.5. These floors are a ratchet against getting
// WORSE at something the engine is already bad at on this corpus — the
// current truth, not a target, and a future change that raises one has to
// raise it FROM a rerun. See docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md.
//
// ── Why there is a control, and why the primary statistic changed ──────────
// Two round-2 review findings, both about how a reader would be misled:
//
//   * With only null readings, nothing here separated "the score is blind to
//     mechanical damage" from "this harness never worked". DIALOGUE_FLATTEN
//     is the manipulation the score demonstrably DOES catch — 32 of 32, zero
//     ties — so the other two readings are the score's, not the instrument's.
//   * Round 1 floored only the all-pairs statistic, which is the HIGHER of
//     the two computed in 7 of the 8 cells measured across main and the three
//     scoring branches. A paired design's honest estimator is the matched-pair
//     one; it is now primary, and both are floored, so a regression visible in
//     only one of them cannot pass.
//
// ── Runtime ────────────────────────────────────────────────────────────────
// 128 doctor runs (32 intact + 32 shuffle-drop + 32 climax-relocate + 32
// dialogue-flatten) plus three 2000-resample bootstraps: 3.75s measured
// (`npm run benchmark:public -- --json` reports elapsedMs; the control added
// ~0.7s). The measurement runs ONCE at module load and every assertion below
// reads that one result, so adding an assertion costs nothing.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { PUBLIC_FLOORS, PUBLIC_FLOOR_MARGIN } from '../../scripts/lib/auc.ts';
import {
  MISSING_VERDICT,
  PUBLIC_CORPUS_SETS,
  PUBLIC_CORPUS_SIZE,
  PUBLIC_LOCK_COMMAND,
  PUBLIC_MANIFEST_PATH,
  PUBLIC_SPLIT_PATH,
  PUBLIC_SPLIT_RULE,
  REPO_ROOT,
  floorFor,
  listPublicCorpus,
  measurePublicBenchmark,
  partitionFor,
  relockFloorSource,
  type ScriptRow,
} from '../../scripts/lib/public-benchmark.ts';

const MEASUREMENT_DOC = 'docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md';

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(REPO_ROOT, relativePath), 'utf8')) as T;
}

interface Manifest {
  schemaVersion: number;
  lockCommand: string;
  scriptCount: number;
  scripts: ScriptRow[];
}

interface Split {
  schemaVersion: number;
  rule: string;
  counts: { total: number; exploration: number; holdout: number };
  assignments: { file: string; set: string; sha256: string; partition: string }[];
}

const manifest = readJson<Manifest>(PUBLIC_MANIFEST_PATH);
const split = readJson<Split>(PUBLIC_SPLIT_PATH);

// ONE measurement, shared by every assertion in the file.
const result = await measurePublicBenchmark();
const byId = new Map(result.degradations.map((d) => [d.id, d]));
const shuffleDrop = byId.get('SHUFFLE_DROP')!;
const climaxRelocate = byId.get('CLIMAX_RELOCATE')!;
const dialogueFlatten = byId.get('DIALOGUE_FLATTEN')!;

/** Print the measurement into the CI log. A benchmark whose number only
 *  appears when it FAILS is a benchmark nobody watches drift. */
process.stdout.write(
  '\nPUBLIC BENCHMARK (always-on, no corpus mount; matched-pair is the PRIMARY statistic)\n'
  + result.degradations
    .map(
      (d) =>
        `  ${d.id.padEnd(16)} ${(d.role === 'control' ? '[CONTROL]' : '[measure]')} N=${d.n}  `
        + `paired ${d.aucPaired.toFixed(4)} [${d.ciPaired.lo.toFixed(4)}, ${d.ciPaired.hi.toFixed(4)}]  `
        + `all-pairs ${d.aucAllPairs.toFixed(4)} [${d.ciAllPairs.lo.toFixed(4)}, ${d.ciAllPairs.hi.toFixed(4)}]  `
        + `gap ${d.meanGap.toFixed(2)}  ordered/inverted/tied ${d.ordered}/${d.inverted}/${d.tied}  `
        + `bootstrap ${d.bootstrapIterations}@seed ${d.bootstrapSeed}`,
    )
    .join('\n')
  + '\n',
);

/**
 * MACHINE-READABLE FLOOR LIVENESS, one line per floor constant.
 *
 * WHY (2026-09-12, adversarial review finding 7). `npm run gates` printed
 * `[RAN] tests/core/public-benchmark.test.ts` on the strength of this suite
 * exiting 0 — and a suite whose six floor assertions have been replaced by
 * `Number.isFinite(...)` also exits 0. The reporter no longer reads only the
 * exit code: it PARSES these lines (the finding's option (a)) and requires one
 * per `PUBLIC_*_FLOOR` constant it finds in `scripts/lib/auc.ts`, carrying the
 * same floor value and a measured value at or above it. Keep the shape
 * `FLOOR <CONSTANT> measured=<n> floor=<n> verdict=PASS|FAIL primary=yes|no`
 * on ONE line — `scripts/report-unverified-gates.mjs` matches exactly that, and
 * `tests/scripts/report-unverified-gates.test.ts` fails if the two drift.
 *
 * Reporting a number is not asserting it, and this block alone would be
 * satisfied by a suite that prints and asserts nothing. The liveness half is
 * the finding's option (b): the reporter re-runs this suite with one floor
 * constant raised above its measured value and requires the matching
 * `not ok … clears <CONSTANT> = <raised>` line. That is why the floor
 * assertions below build their titles from `floor.constant` and `floor.value`
 * instead of hardcoding either — the title is the liveness signal.
 */
process.stdout.write(
  '\nFLOOR LIVENESS (parsed by scripts/report-unverified-gates.mjs — one line per floor constant)\n'
  + PUBLIC_FLOORS
    .map((floor) => {
      const d = byId.get(floor.degradation)!;
      const measured = floor.statistic === 'paired' ? d.aucPaired : d.aucAllPairs;
      return `  FLOOR ${floor.constant} measured=${measured.toFixed(4)} floor=${floor.value} `
        + `verdict=${measured >= floor.value ? 'PASS' : 'FAIL'} primary=${floor.primary ? 'yes' : 'no'}`;
    })
    .join('\n')
  + '\n',
);

describe('public benchmark — the corpus is the one CI can actually read', () => {
  it(`holds exactly ${PUBLIC_CORPUS_SIZE} distributable .fountain files from two declared sets`, () => {
    const scripts = listPublicCorpus();
    assert.equal(
      scripts.length,
      PUBLIC_CORPUS_SIZE,
      'the distributable corpus changed size. That is allowed — but it must happen in a diff that '
      + `also moves PUBLIC_CORPUS_SIZE and re-locks both fixtures: \`${PUBLIC_LOCK_COMMAND}\`.`,
    );
    for (const set of PUBLIC_CORPUS_SETS) {
      assert.ok(
        scripts.some((s) => s.file.startsWith(`${set.dir}/`)),
        `set ${set.id} (${set.dir}) contributed no scripts`,
      );
      // Provenance is transcribed from a file that must exist — a licence
      // claim with no licence file behind it is the thing this asserts away.
      assert.ok(
        readFileSync(path.join(REPO_ROOT, set.provenanceFile), 'utf8').length > 0,
        `${set.id}: provenance file ${set.provenanceFile} is missing or empty`,
      );
    }
  });

  it('excludes the calibration corpus from every measured number', () => {
    // RULE_CHANNEL_EVIDENCE_2026-08-24 §0 finding 3: the calibration bands are
    // ordered ENTIRELY by the weighted-rule channel, because those samples were
    // authored from the rules' own lexicons. Including them would let the
    // engine's recognition of its own vocabulary inflate a benchmark whose
    // whole purpose is independence from it. `npm run benchmark:public --
    // --control` scores them separately, labelled.
    for (const row of manifest.scripts) {
      assert.ok(
        !row.file.includes('calibration'),
        `${row.file} is in the scored manifest but looks like calibration material`,
      );
    }
    assert.equal(result.calibrationControl, null, 'the default measurement must not include the control');
  });
});

describe('public benchmark — the manifest lock', () => {
  it(`has one row per script, in corpus order, and no screenplay text`, () => {
    assert.equal(manifest.scriptCount, PUBLIC_CORPUS_SIZE);
    assert.equal(manifest.scripts.length, PUBLIC_CORPUS_SIZE);
    assert.deepEqual(
      manifest.scripts.map((r) => r.file),
      listPublicCorpus().map((s) => s.file),
      'manifest rows must be the corpus, in the corpus\'s own stable order (set order, then filename)',
    );
    for (const row of manifest.scripts) {
      assert.match(row.sha256, /^[0-9a-f]{64}$/, `${row.file}: sha256 must be a bare hex digest`);
      assert.equal(
        new Set(Object.keys(row)).size,
        6,
        `${row.file}: a manifest row is {file, sha256, sceneCount, words, health, verdict} and nothing else`,
      );
      // ScriptDoctorReport.verdict is optional (types.ts:329). The harness
      // records its absence as MISSING_VERDICT rather than an empty cell, so
      // "the doctor stopped producing verdicts" cannot be locked in looking
      // like a normal row.
      assert.notEqual(
        row.verdict,
        MISSING_VERDICT,
        `${row.file}: the doctor returned no verdict for this script — that is a real change, not a blank`,
      );
    }
  });

  it('every locked row still reproduces — sha256, sceneCount, words, health, verdict', () => {
    const locked = new Map(manifest.scripts.map((r) => [r.file, r]));
    const drift: string[] = [];
    for (const script of listPublicCorpus()) {
      const row = locked.get(script.file);
      if (!row) {
        drift.push(`${script.file}: present on disk, absent from the manifest`);
        continue;
      }
      if (row.sha256 !== script.sha256) {
        drift.push(`${script.file}: file bytes changed (sha256 ${row.sha256} -> ${script.sha256})`);
      }
    }
    for (const row of result.scripts) {
      const lockedRow = locked.get(row.file);
      if (!lockedRow) continue;
      for (const key of ['sceneCount', 'words', 'health', 'verdict'] as const) {
        if (lockedRow[key] !== row[key]) {
          drift.push(`${row.file}: ${key} ${JSON.stringify(lockedRow[key])} -> ${JSON.stringify(row[key])}`);
        }
      }
    }
    assert.deepEqual(
      drift,
      [],
      'the locked public-corpus manifest no longer reproduces on this tree:\n  '
      + drift.join('\n  ')
      + '\n\nThis is the intended behaviour of a lock, not a bug: a scoring change that moves a '
      + 'number on real distributable prose is supposed to be visible. Read the list, confirm '
      + `every move is one you meant, then re-lock: \`${PUBLIC_LOCK_COMMAND}\` and commit the diff.`,
    );
  });
});

describe('public benchmark — the pre-registered split', () => {
  it('records the rule it was generated by', () => {
    assert.equal(split.rule, PUBLIC_SPLIT_RULE, 'the committed split records a different rule than the code implements');
    assert.equal(split.assignments.length, PUBLIC_CORPUS_SIZE);
  });

  it('every assignment is what the rule recomputes from that file\'s own bytes', () => {
    // The property that makes this a PRE-registration rather than a snapshot:
    // nobody chose it, so nobody can un-choose it for a script that scored
    // inconveniently. A hand-edit to the JSON fails right here.
    const wrong: string[] = [];
    const onDisk = new Map(listPublicCorpus().map((s) => [s.file, s]));
    for (const a of split.assignments) {
      const script = onDisk.get(a.file);
      if (!script) {
        wrong.push(`${a.file}: assigned a partition but not present on disk`);
        continue;
      }
      if (a.sha256 !== script.sha256) wrong.push(`${a.file}: recorded sha256 does not match the file`);
      const expected = partitionFor(script.sha256);
      if (a.partition !== expected) {
        wrong.push(`${a.file}: recorded ${a.partition}, rule says ${expected}`);
      }
    }
    assert.deepEqual(wrong, [], `split assignments disagree with the rule:\n  ${wrong.join('\n  ')}`);
  });

  it('both partitions are non-empty, and the counts match the assignments', () => {
    const exploration = split.assignments.filter((a) => a.partition === 'exploration').length;
    const holdout = split.assignments.filter((a) => a.partition === 'holdout').length;
    assert.equal(split.counts.exploration, exploration);
    assert.equal(split.counts.holdout, holdout);
    assert.equal(split.counts.total, split.assignments.length);
    assert.ok(holdout > 0, 'a held-out partition with nothing in it is not a held-out partition');
    assert.ok(exploration > 0);
    // The rule targets ~30% holdout; on these 32 files it drew 5 (15.6%). That
    // is the draw. Re-tuning the threshold after seeing the assignment is
    // exactly the hand-picking the rule exists to prevent, so the number is
    // reported (docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md) and not
    // fixed. This assertion only guards the range in which the holdout is
    // still worth reporting at all.
    assert.ok(
      holdout >= 3 && holdout <= PUBLIC_CORPUS_SIZE - 3,
      `holdout is ${holdout} of ${PUBLIC_CORPUS_SIZE} — too degenerate to report a partition AUC from`,
    );
  });
});

describe('public benchmark — the three degradations', () => {
  it('CLIMAX_RELOCATE\'s N is no longer frozen — the density pin is gone, so the ties are too', () => {
    // INVERTED 2026-09-07 (branch scoring/feature-length-defects), which is
    // what this assertion's own failure message asked for: "If the density
    // cap stopped pinning scripts, that is a real scoring change and the
    // interval means something different now."
    //
    // Round-2 review finding 6.7 recorded the opposite state and it was
    // right about it: ten of the 32 intact scripts sat at exactly health 76.0
    // (the sub-1 density penalty at its 10-point saturation plus a 14.0
    // scarcity term), so 11 of 32 CLIMAX_RELOCATE pairs were EXACT ties
    // contributing 0.5 apiece by construction, and the channel's narrow
    // interval was pinning rather than precision. The sub-1 curve's steepness
    // moved 50 -> 2 and that saturation is gone: measured now, 1 tie of 32
    // and 0 scripts at exactly 76.0. The assertion is inverted rather than
    // deleted, so a change that REINTRODUCES the pin fails here.
    const pinnedAt76 = result.scripts.filter((s) => s.health === 76.0).length;
    assert.ok(
      climaxRelocate.tied <= 3,
      `${climaxRelocate.tied} of ${climaxRelocate.n} CLIMAX_RELOCATE pairs are exact ties (was 11 before the `
      + 'density recalibration, 1 after). A rising tie count means a saturation came back and the interval is '
      + 'narrowing on pinning again — read the doc\'s tie discussion before trusting the AUC.',
    );
    assert.ok(
      pinnedAt76 <= 2,
      `${pinnedAt76} scripts sit at exactly health 76.0 (was 10 before the density recalibration, 0 after) — `
      + 'the saturation that froze a third of this channel is back',
    );
    assert.equal(
      climaxRelocate.ordered + climaxRelocate.inverted + climaxRelocate.tied,
      climaxRelocate.n,
      'the sign counts must partition N',
    );
  });

  it('SHUFFLE_DROP has no ties, so its wider interval is real spread and not the same artifact', () => {
    assert.equal(shuffleDrop.tied, 0);
    assert.equal(shuffleDrop.ordered + shuffleDrop.inverted, shuffleDrop.n);
  });

  it('CLIMAX_RELOCATE preserves scene count on every script, so the scarcity term cancels', () => {
    // This is the assertion that earns the phrase "isolates order-sensitivity".
    // scarcityPenalty = 140/sceneCount (doctor.ts:465-467) is the doctor's
    // highest-AUC term; if this degradation moved scene count even on one
    // script, the second number would be measuring the same artifact as the
    // first and the comparison between them would be worthless.
    const moved = climaxRelocate.pairs.filter((p) => p.intactScenes !== p.degradedScenes);
    assert.deepEqual(
      moved.map((p) => `${p.file}: ${p.intactScenes} -> ${p.degradedScenes}`),
      [],
      'the scene-count-preserving degradation changed a scene count',
    );
    assert.equal(climaxRelocate.n, PUBLIC_CORPUS_SIZE, 'every script must produce a pair');
    assert.deepEqual(climaxRelocate.skipped, [], 'no script may be silently dropped from the measurement');
  });

  it('SHUFFLE_DROP does change scene count — the two degradations are genuinely different', () => {
    const unchanged = shuffleDrop.pairs.filter((p) => p.intactScenes === p.degradedScenes);
    assert.deepEqual(
      unchanged.map((p) => p.file),
      [],
      'the AUC-24 recipe drops every third scene; a script whose count did not move was not degraded',
    );
    assert.equal(shuffleDrop.n, PUBLIC_CORPUS_SIZE);
    assert.deepEqual(shuffleDrop.skipped, []);
  });

  it('reports a seeded bootstrap interval for both statistics, on a fixed seed', () => {
    for (const d of result.degradations) {
      assert.equal(d.bootstrapSeed, 42, `${d.id}: the bootstrap seed must be fixed, or the interval is not reproducible`);
      assert.equal(d.bootstrapIterations, 2000, `${d.id}: iteration count must be stated and stable`);
      for (const [name, ci] of [['all-pairs', d.ciAllPairs], ['matched-pair', d.ciPaired]] as const) {
        assert.ok(Number.isFinite(ci.lo) && Number.isFinite(ci.hi), `${d.id} ${name}: interval is not finite`);
        assert.ok(ci.lo <= ci.hi, `${d.id} ${name}: interval is inverted`);
      }
      assert.ok(
        d.ciAllPairs.lo <= d.aucAllPairs && d.aucAllPairs <= d.ciAllPairs.hi,
        `${d.id}: the point estimate ${d.aucAllPairs} falls outside its own 95% interval`,
      );
    }
  });
});

describe('public benchmark — the positive control', () => {
  // WHY THIS SUITE EXISTS (round-2 review finding 6.1). Both measurement
  // channels read chance. Given only those two numbers, a reader cannot tell
  // "the score is blind to mechanical damage" from "this harness never
  // worked" — and every null reading in the artifact depends on that
  // distinction. DIALOGUE_FLATTEN is the manipulation the score must catch;
  // if it stops catching it, the harness is what broke.
  it('the harness is demonstrably able to separate intact from damaged — 32 of 32, zero ties', () => {
    assert.equal(dialogueFlatten.role, 'control', 'DIALOGUE_FLATTEN is a control, and must be labelled one');
    assert.equal(dialogueFlatten.n, PUBLIC_CORPUS_SIZE);
    assert.deepEqual(dialogueFlatten.skipped, []);
    assert.equal(
      dialogueFlatten.inverted,
      0,
      `${dialogueFlatten.inverted} script(s) scored HIGHER after every line of dialogue was replaced with `
      + '"Hello." The positive control is the one manipulation this engine is built to catch; an inversion '
      + 'here means the harness, not the score, is the thing to look at first.',
    );
    assert.equal(
      dialogueFlatten.tied,
      0,
      'the control must be unambiguous — a tie here weakens the only evidence that the instrument reads anything',
    );
    assert.ok(
      dialogueFlatten.meanGap > 20,
      `control mean health gap is only ${dialogueFlatten.meanGap.toFixed(2)} points (was +29.30 when this was `
      + 'written). The control is losing its grip; treat every near-chance reading in this file as suspect '
      + 'until it is understood.',
    );
  });

  it('the control exercises a scoring channel the other two degradations do not touch', () => {
    // Measured: of the control's 29.30-point mean gap, 16.71 points on
    // average are removed AFTER computeHealthScore — i.e. by the dedicated
    // dialogue-degradation deduction, not by density or scarcity. Both
    // measurement channels move health only through that formula. So this
    // control also checks that the harness reaches past it, into the rest of
    // the engine, which is what makes it a liveness check on the instrument
    // rather than a second reading of the same term.
    assert.ok(
      dialogueFlatten.sceneCountPreserving,
      'the control must not change scene count, or its gap is contaminated by the scarcity term',
    );
    const movedScenes = dialogueFlatten.pairs.filter((p) => p.intactScenes !== p.degradedScenes);
    assert.deepEqual(movedScenes.map((p) => p.file), [], 'dialogue flattening changed a scene count');
  });
});

describe('public benchmark — the ratchet (six floors: three degradations x two statistics)', () => {
  // PRIMARY is the matched-pair statistic. This is a paired design — every
  // script against a degraded copy of itself — and all-pairs folds
  // between-script variance back into a comparison the pairing controls.
  // Round 1 floored only all-pairs, which is the HIGHER of the two in 7 of
  // the 8 cells this benchmark has measured, so a regression visible only in
  // the paired statistic would have passed CI. Both are floored now.
  for (const floor of PUBLIC_FLOORS) {
    const d = byId.get(floor.degradation)!;
    const measured = floor.statistic === 'paired' ? d.aucPaired : d.aucAllPairs;
    const ci = floor.statistic === 'paired' ? d.ciPaired : d.ciAllPairs;

    it(`${floor.degradation} ${floor.statistic} AUC clears ${floor.constant} = ${floor.value}${floor.primary ? ' (PRIMARY)' : ''}`, () => {
      assert.ok(
        measured >= floor.value,
        `${floor.degradation} ${floor.statistic} AUC ${measured.toFixed(4)} `
        + `(95% CI [${ci.lo.toFixed(4)}, ${ci.hi.toFixed(4)}], N=${d.n}) fell below ${floor.constant} = `
        + `${floor.value}.\nReproduce: npm run benchmark:public\n`
        + (d.role === 'control'
          ? 'THIS IS THE POSITIVE CONTROL. It is the manipulation the score is built to catch, so a drop '
            + 'here is evidence about the HARNESS before it is evidence about the score — check that the '
            + 'degradation still produces damaged text at all before reading anything into the two '
            + 'measurement channels.'
          : 'READ THIS BEFORE RAISING THE FLOOR. The measurement channels were 0.5313/0.5586 '
            + '(shuffle-drop) and 0.4063/0.4443 (climax-relocate) when these floors were set, and all '
            + 'four of those 95% intervals contain 0.5. These are NOT good scores — they are the current '
            + 'truth, ratcheted so they cannot quietly get worse. They are also not the AUC-24 >= 0.622 '
            + 'ratchet and must never be compared to it: different corpus, different script length, '
            + 'different denominator.'),
      );
    });
  }

  it('every floor sits a stated margin below a real measurement, not at a round number', () => {
    // The failure this prevents: a floor "adjusted" downward to make a red
    // suite green. Every floor is round4(measured - PUBLIC_FLOOR_MARGIN), so a
    // floor further than the margin below today's measurement means either the
    // score improved (re-lock it) or somebody moved the number by hand.
    for (const floor of PUBLIC_FLOORS) {
      const d = byId.get(floor.degradation)!;
      const auc = floor.statistic === 'paired' ? d.aucPaired : d.aucAllPairs;
      assert.ok(
        floor.value <= auc,
        `${floor.constant}: floor ${floor.value} is above the measured ${auc.toFixed(4)} — an aspiration, not a ratchet`,
      );
      assert.ok(
        auc - floor.value < 4 * PUBLIC_FLOOR_MARGIN,
        `${floor.constant}: measured ${auc.toFixed(4)} is ${(auc - floor.value).toFixed(4)} above floor `
        + `${floor.value}, more than 4x the ${PUBLIC_FLOOR_MARGIN} margin. Either the score improved — `
        + 're-lock with `npm run benchmark:public -- --lock` and record the run — or the floor was lowered by hand.',
      );
    }
  });

  it('`--lock` rewrites every floor from the measurement, and only those lines', () => {
    // Driven on a STRING, not on the real scripts/lib/auc.ts — that is why
    // relockFloorSource lives in the harness rather than in the CLI. The CLI
    // does the file I/O and the exit code; the decision is testable here with
    // no I/O at all.
    const src = readFileSync(path.join(REPO_ROOT, 'scripts/lib/auc.ts'), 'utf8');
    const relock = relockFloorSource(src, result.degradations);
    assert.equal(relock.ok, true, `relock refused on a healthy tree: ${relock.missing.join('; ')}`);
    assert.deepEqual(relock.missing, []);
    assert.equal(relock.lines.length, PUBLIC_FLOORS.length, 'one before -> after line per floor');
    for (const floor of PUBLIC_FLOORS) {
      const d = byId.get(floor.degradation)!;
      const measured = floor.statistic === 'paired' ? d.aucPaired : d.aucAllPairs;
      assert.match(
        relock.source,
        new RegExp(`export const ${floor.constant} = ${floorFor(measured)};`),
        `${floor.constant} was not rewritten to round4(measured - margin)`,
      );
    }
    // Idempotent on a correctly locked tree: the floors already equal
    // round4(measured - margin), so re-locking changes nothing. If this ever
    // fails, the committed floors and the current measurement have diverged.
    assert.equal(relock.source, src, 'a re-lock on an up-to-date tree must be a no-op');
  });

  it('`--lock` REFUSES, writes nothing, and reports why when a constant is reshaped', () => {
    // The failure the CLI turns into a non-zero exit (round 3). A partial
    // re-lock — some floors from this run, some from an older one — is the one
    // state nobody can reason about afterwards, so a single missing constant
    // must abandon the whole rewrite rather than apply the five it did find.
    const src = readFileSync(path.join(REPO_ROOT, 'scripts/lib/auc.ts'), 'utf8');
    const reshaped = src.replace(
      'export const PUBLIC_ORDER_FLOOR = ',
      'export const PUBLIC_ORDER_FLOOR =\n  ',
    );
    assert.notEqual(reshaped, src, 'the fixture edit must actually change the source');
    const relock = relockFloorSource(reshaped, result.degradations);
    assert.equal(relock.ok, false);
    assert.equal(relock.source, reshaped, 'a refused relock must return the input untouched');
    assert.deepEqual(relock.lines, [], 'a refused relock reports no before -> after lines');
    assert.equal(relock.missing.length, 1);
    assert.match(relock.missing[0], /PUBLIC_ORDER_FLOOR/);
    assert.match(relock.missing[0], /single-line/);
  });

  it('`--lock` REFUSES when a degradation is missing from the run entirely', () => {
    // The other way it can fail: the harness stopped producing a channel a
    // floor guards. Rewriting the rest would leave that floor asserting an old
    // measurement with nothing left to compare it against.
    const src = readFileSync(path.join(REPO_ROOT, 'scripts/lib/auc.ts'), 'utf8');
    const relock = relockFloorSource(src, result.degradations.filter((d) => d.id !== 'DIALOGUE_FLATTEN'));
    assert.equal(relock.ok, false);
    assert.equal(relock.source, src);
    assert.equal(relock.missing.length, 2, 'both DIALOGUE_FLATTEN floors must be reported');
    for (const m of relock.missing) assert.match(m, /no DIALOGUE_FLATTEN result in this run/);
  });

  it('the floor constants are still in the one-line shape `--lock` rewrites', () => {
    // `npm run benchmark:public -- --lock` rewrites these six lines with a
    // regex on `export const NAME = <number>;`. A refactor that reshapes them
    // (a computed value, a multi-line literal, a re-export) would make the
    // re-lock command silently stop moving that floor — which is exactly the
    // "instruction that fails when followed" this round was sent back to fix.
    const src = readFileSync(path.join(REPO_ROOT, 'scripts/lib/auc.ts'), 'utf8');
    for (const floor of PUBLIC_FLOORS) {
      const match = new RegExp(`export const ${floor.constant} = (-?[0-9.]+);`).exec(src);
      assert.ok(
        match,
        `${floor.constant} is no longer a single-line \`export const NAME = <number>;\` in scripts/lib/auc.ts, `
        + 'so `npm run benchmark:public -- --lock` can no longer re-lock it. Restore the shape, or teach '
        + 'relockFloors() in scripts/benchmark-public.ts the new one.',
      );
      assert.equal(
        Number(match![1]),
        floor.value,
        `${floor.constant}'s source literal and its exported value disagree`,
      );
    }
  });
});

describe('public benchmark — the numbers in the docs are the numbers the code produces', () => {
  /** Every measured statistic and every floor, as the strings a doc must quote. */
  const quotable = [
    ...PUBLIC_FLOORS.map((f) => String(f.value)),
    ...result.degradations.flatMap((d) => [d.aucPaired.toFixed(4), d.aucAllPairs.toFixed(4)]),
  ];

  it('the measurement doc quotes all six floors and all six measured AUCs verbatim', () => {
    const doc = readFileSync(path.join(REPO_ROOT, MEASUREMENT_DOC), 'utf8');
    const missing = quotable.filter((needle) => !doc.includes(needle));
    assert.deepEqual(
      missing,
      [],
      `${MEASUREMENT_DOC} does not contain: ${missing.join(', ')}. A measurement doc that has drifted from `
      + 'the measurement is worse than no doc — re-run `npm run benchmark:public` and update it. (`--lock` '
      + 'rewrites the constants and the fixtures; the prose is yours.)',
    );
  });

  it('scripts/lib/auc.ts\'s own narrative quotes the values its floors were locked from', () => {
    // The floors' explanatory block names the measured numbers. `--lock`
    // rewrites the constants and NOT the prose, so without this check a
    // re-lock leaves the file explaining its floors with the previous
    // measurement's figures — the same drift the manifest lock exists to
    // prevent, one file over.
    const src = readFileSync(path.join(REPO_ROOT, 'scripts/lib/auc.ts'), 'utf8');
    const missing = result.degradations
      .flatMap((d) => [d.aucPaired.toFixed(4), d.aucAllPairs.toFixed(4)])
      .filter((needle) => !src.includes(needle));
    assert.deepEqual(
      missing,
      [],
      `scripts/lib/auc.ts's PUBLIC-BENCHMARK FLOORS block no longer quotes: ${missing.join(', ')}. `
      + 'Update the narrative in the same commit as the re-lock.',
    );
  });

  it('the receipts ledger carries a PUBLIC-CORPUS section naming the reproducible command', () => {
    const receipts = readFileSync(path.join(REPO_ROOT, 'docs/p1-benchmark/MEASUREMENT_RECEIPTS.md'), 'utf8');
    assert.match(
      receipts,
      /PUBLIC-CORPUS/,
      'MEASUREMENT_RECEIPTS.md must carry a PUBLIC-CORPUS section — this benchmark is reproducible by '
      + 'anyone and is therefore NOT an attestation, which is exactly why it needs its own entry kind '
      + 'rather than being filed next to the AUC-24 receipts.',
    );
    assert.match(receipts, /npm run benchmark:public/);
  });
});
