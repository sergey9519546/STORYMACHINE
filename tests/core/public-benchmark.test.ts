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
//   3. THE RATCHET. Both AUCs against floors in scripts/lib/auc.ts.
//
// ── The floors are near chance, and the messages below say so ──────────────
// Measured on this tree 2026-09-06: shuffle-drop 0.5586 (95% CI
// [0.4219, 0.6973]); climax-relocate 0.4673 (95% CI [0.4014, 0.5264]). Both
// intervals contain 0.5. These floors are a ratchet against getting WORSE at
// something the engine is already bad at on this corpus — they are the
// current truth, not a target, and a future change that raises either one has
// to raise it FROM a rerun, not toward an aspiration. See
// docs/p1-benchmark/PUBLIC_BENCHMARK_2026-09-06.md.
//
// ── Runtime ────────────────────────────────────────────────────────────────
// 96 doctor runs (32 intact + 32 shuffle-drop + 32 climax-relocate) plus two
// 2000-resample bootstraps: 3.05s measured on this machine
// (`npm run benchmark:public -- --json` reports elapsedMs). The measurement
// runs ONCE at module load and every assertion below reads that one result,
// so adding an assertion costs nothing.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  PUBLIC_FLOOR_MARGIN,
  PUBLIC_ORDER_FLOOR,
  PUBLIC_SHUFFLE_DROP_FLOOR,
} from '../../scripts/lib/auc.ts';
import {
  MISSING_VERDICT,
  PUBLIC_CORPUS_SETS,
  PUBLIC_CORPUS_SIZE,
  PUBLIC_LOCK_COMMAND,
  PUBLIC_MANIFEST_PATH,
  PUBLIC_SPLIT_PATH,
  PUBLIC_SPLIT_RULE,
  REPO_ROOT,
  listPublicCorpus,
  measurePublicBenchmark,
  partitionFor,
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

/** Print the measurement into the CI log. A benchmark whose number only
 *  appears when it FAILS is a benchmark nobody watches drift. */
process.stdout.write(
  '\nPUBLIC BENCHMARK (always-on, no corpus mount)\n'
  + result.degradations
    .map(
      (d) =>
        `  ${d.id.padEnd(16)} N=${d.n}  AUC(all-pairs) ${d.aucAllPairs.toFixed(4)} `
        + `95% CI [${d.ciAllPairs.lo.toFixed(4)}, ${d.ciAllPairs.hi.toFixed(4)}]  `
        + `AUC(matched-pair) ${d.aucPaired.toFixed(4)} `
        + `95% CI [${d.ciPaired.lo.toFixed(4)}, ${d.ciPaired.hi.toFixed(4)}]  `
        + `mean gap ${d.meanGap.toFixed(2)}  bootstrap ${d.bootstrapIterations}@seed ${d.bootstrapSeed}`,
    )
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

describe('public benchmark — the two degradations', () => {
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

describe('public benchmark — the ratchet', () => {
  it(`SHUFFLE_DROP AUC clears the ${PUBLIC_SHUFFLE_DROP_FLOOR} floor`, () => {
    assert.ok(
      shuffleDrop.aucAllPairs >= PUBLIC_SHUFFLE_DROP_FLOOR,
      `shuffle-drop AUC ${shuffleDrop.aucAllPairs.toFixed(4)} (95% CI [${shuffleDrop.ciAllPairs.lo.toFixed(4)}, `
      + `${shuffleDrop.ciAllPairs.hi.toFixed(4)}], N=${shuffleDrop.n}) fell below PUBLIC_SHUFFLE_DROP_FLOOR = `
      + `${PUBLIC_SHUFFLE_DROP_FLOOR}. A change made the doctor less able to tell an intact script from `
      + 'a shuffled-and-thinned copy of itself, on committed text anyone can re-run.\n'
      + 'Reproduce: npm run benchmark:public\n'
      + 'READ THIS BEFORE RAISING THE FLOOR: this number was 0.5586 when the floor was set, and its own '
      + '95% interval contains 0.5. It is NOT a good score — it is the current truth, ratcheted so it '
      + 'cannot quietly get worse. It is also not the AUC-24 >= 0.622 ratchet and must never be compared '
      + 'to it: different corpus, different script length, different denominator.',
    );
  });

  it(`CLIMAX_RELOCATE AUC clears the ${PUBLIC_ORDER_FLOOR} floor (which is near chance, on purpose)`, () => {
    assert.ok(
      climaxRelocate.aucAllPairs >= PUBLIC_ORDER_FLOOR,
      `order-preserving AUC ${climaxRelocate.aucAllPairs.toFixed(4)} (95% CI `
      + `[${climaxRelocate.ciAllPairs.lo.toFixed(4)}, ${climaxRelocate.ciAllPairs.hi.toFixed(4)}], `
      + `N=${climaxRelocate.n}) fell below PUBLIC_ORDER_FLOOR = ${PUBLIC_ORDER_FLOOR}.\n`
      + 'WHAT THIS FLOOR IS. With scene count held constant the doctor cannot detect reordering: measured '
      + '0.4673 here, and doctor.ts:2092-2093 records ~0.48 for the same recipe on the private corpus, '
      + 'and the P1 baseline reports CLIMAX_RELOCATE 0.523 on its 153-script test partition. The floor is '
      + 'that near-chance number minus a margin. This is the CURRENT TRUTH, NOT A TARGET: the assertion '
      + 'exists so the engine cannot get worse at order-sensitivity without anyone noticing, not because '
      + '0.4673 is acceptable.\n'
      + 'Reproduce: npm run benchmark:public',
    );
  });

  it('both floors sit a stated margin below a real measurement, not at a round number', () => {
    // The failure this prevents: a floor "adjusted" downward to make a red
    // suite green. Every floor here is measured-minus-PUBLIC_FLOOR_MARGIN, so
    // a floor further than the margin below today's measurement means either
    // the score improved (re-lock it) or somebody moved the number by hand.
    for (const [name, auc, floor] of [
      ['SHUFFLE_DROP', shuffleDrop.aucAllPairs, PUBLIC_SHUFFLE_DROP_FLOOR],
      ['CLIMAX_RELOCATE', climaxRelocate.aucAllPairs, PUBLIC_ORDER_FLOOR],
    ] as const) {
      assert.ok(
        floor <= auc,
        `${name}: floor ${floor} is above the measured ${auc.toFixed(4)} — an aspiration, not a ratchet`,
      );
      assert.ok(
        auc - floor < 4 * PUBLIC_FLOOR_MARGIN,
        `${name}: measured ${auc.toFixed(4)} is ${(auc - floor).toFixed(4)} above floor ${floor}, more than `
        + `4x the ${PUBLIC_FLOOR_MARGIN} margin. Either the score improved — re-lock the floor at `
        + `${(auc - PUBLIC_FLOOR_MARGIN).toFixed(4)} and record the run — or the floor was lowered by hand.`,
      );
    }
  });
});

describe('public benchmark — the numbers in the docs are the numbers the code produces', () => {
  const doc = readFileSync(path.join(REPO_ROOT, MEASUREMENT_DOC), 'utf8');

  it('the measurement doc quotes both floors and both measured AUCs verbatim', () => {
    for (const needle of [
      String(PUBLIC_SHUFFLE_DROP_FLOOR),
      String(PUBLIC_ORDER_FLOOR),
      shuffleDrop.aucAllPairs.toFixed(4),
      climaxRelocate.aucAllPairs.toFixed(4),
    ]) {
      assert.ok(
        doc.includes(needle),
        `${MEASUREMENT_DOC} does not contain "${needle}". A measurement doc that has drifted from the `
        + 'measurement is worse than no doc: re-run `npm run benchmark:public` and update it.',
      );
    }
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
