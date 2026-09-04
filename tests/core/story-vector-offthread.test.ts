// Story-vector production across the worker boundary (2026-09-04, security
// review finding #1, second half).
//
// WHAT MOVED. POST /api/nvm/analyze/compare used to run TWO in-process Script
// Doctor analyses of the submitted draft — its own, and a second one hidden
// inside vectorizeScript — and then, whenever data/screenplays/.vectors was
// cold, up to twenty more inside loadCorpusVectors. All of it on Node's main
// thread. vectorizeScriptOffThread (server/nvm/analyze/story-vector.ts) runs
// the doctor half through doctor-pool.ts instead; vectorizeFromReport does the
// counting arithmetic on the coordinator, deliberately, so that RULE_INDEX —
// per-process mutable module state — keeps living in exactly one realm.
//
// WHAT THIS FILE PROVES, and why each half needs proving separately:
//
//   1. THE VECTOR IS THE SAME OBJECT IT WAS. The report now crosses a
//      structured-clone boundary before the vector is derived from it, and the
//      vector is mostly floating-point arithmetic over that report's issue
//      arrays. assert.deepEqual is not enough for that: it is happy with a
//      Float64Array where a plain array was, and it does not separate 0 from
//      -0. So the comparison below is explicit — same constructor, same
//      length, Object.is element by element, plus a whole-object
//      deepStrictEqual (which DOES use Object.is on primitives) and a JSON
//      round-trip, since the vector is also what gets written to the corpus
//      cache and serialized to the client.
//
//   2. IT ACTUALLY WENT OFF-THREAD. A vector built by a function that imported
//      the pool and then called the in-process doctor anyway would pass (1)
//      perfectly. So these tests watch the pool itself (doctorPoolStatus),
//      the same technique tests/routes/export-offthread.test.ts uses.
//
// tests/core/doctor-worker-pool.test.ts pins report-level identity across the
// same boundary; this file pins what the compare route builds ON TOP of a
// report.

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  vectorizeScript, vectorizeScriptOffThread, vectorizeFromReport, type StoryVector,
} from '../../server/nvm/analyze/story-vector.ts';
import { runScriptDoctor, clearDoctorCache } from '../../server/nvm/analyze/doctor.ts';
import { doctorPoolStatus, shutdownDoctorPool } from '../../server/nvm/analyze/doctor-pool.ts';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** A real tracked corpus screenplay — the same input the compare route's own
 *  corpus loader vectorizes, so the issue mix crossing the boundary is a real
 *  one rather than a three-scene toy that fires almost no rules. */
const FIXTURE = readFileSync(path.join(REPO, 'data', 'screenplays', 'mise.fountain'), 'utf8');

after(async () => { await shutdownDoctorPool(); });

/** The one field that legitimately differs between two runs over identical
 *  input: the wall-clock stamp vectorizeFromIssues writes. Same reasoning as
 *  the `analyzedAt` mask in scripts/check-doctor-output-identity.mjs — noise by
 *  construction, with nothing else in the vector derived from it. */
function withoutTimestamp(v: StoryVector): StoryVector {
  const { timestamp: _timestamp, ...metadata } = v.metadata;
  return { ...v, metadata: metadata as StoryVector['metadata'] };
}

/** deepStrictEqual compares primitives with Object.is, so it separates 0 from
 *  -0 and treats NaN as equal to NaN — but it says nothing about the CONTAINER.
 *  A Float64Array of the same numbers is a different thing to ship to a client
 *  and to write into the corpus cache, and it is exactly the kind of shape
 *  change a structured-clone hop can introduce, so check that explicitly. */
function assertVectorsIdentical(actual: StoryVector, expected: StoryVector, what: string): void {
  assert.equal(actual.dimensions.constructor, Array, `${what}: dimensions is no longer a plain Array`);
  assert.equal(
    actual.dimensions.length, expected.dimensions.length,
    `${what}: dimension count changed (${actual.dimensions.length} vs ${expected.dimensions.length})`,
  );
  for (let i = 0; i < expected.dimensions.length; i++) {
    assert.ok(
      Object.is(actual.dimensions[i], expected.dimensions[i]),
      `${what}: dimension ${i} differs — ${actual.dimensions[i]} vs ${expected.dimensions[i]} `
      + '(Object.is, so 0 and -0 are different values here)',
    );
  }
  assert.deepStrictEqual(actual.ruleKeys, expected.ruleKeys, `${what}: ruleKeys differ`);
  assert.deepStrictEqual(actual, expected, `${what}: the vectors differ outside dimensions/ruleKeys`);
  assert.equal(JSON.stringify(actual), JSON.stringify(expected), `${what}: serialized form differs`);
}

describe('story vector — off-thread production is byte-identical to in-process', () => {
  it('vectorizeScriptOffThread returns exactly what vectorizeScript returns', async () => {
    // Prime the rule index with this script's keys before either measured run,
    // so the comparison is about the boundary and not about which call
    // happened to extend RULE_INDEX first.
    clearDoctorCache();
    await vectorizeScript(FIXTURE, 'Mise', 'corpus');

    clearDoctorCache();
    const inProcess = await vectorizeScript(FIXTURE, 'Mise', 'corpus');

    // A coordinator cache hit would answer without dispatching anything and
    // prove nothing about the worker — this has to be a real analysis.
    clearDoctorCache();
    await shutdownDoctorPool();
    const offThread = await vectorizeScriptOffThread(FIXTURE, 'Mise', 'corpus');

    assertVectorsIdentical(withoutTimestamp(offThread), withoutTimestamp(inProcess), 'off-thread vs in-process');
    assert.ok(offThread.dimensions.length > 0, 'precondition: the fixture fires at least one rule');
    assert.equal(offThread.metadata.wholeDraftAnalysisComplete, true);
  });

  it('dispatched the analysis to a worker rather than running it here', async () => {
    await shutdownDoctorPool();
    clearDoctorCache();
    assert.equal(doctorPoolStatus().workers, 0, 'precondition: no pool workers before the call');

    await vectorizeScriptOffThread(FIXTURE, 'Mise', 'corpus');

    const status = doctorPoolStatus();
    if (status.disabled) return; // workers cannot run here; the in-process fallback is the contract
    assert.ok(status.workers >= 1, 'vectorizeScriptOffThread did not dispatch through the worker pool');
  });

  it('falls back in-process, with the same vector, when the pool is turned off', async () => {
    // doctor-pool.ts's "NEVER WORSE THAN BEFORE" property, exercised by hand:
    // an environment that cannot host workers must still produce a vector, and
    // the same one.
    clearDoctorCache();
    const pooled = await vectorizeScriptOffThread(FIXTURE, 'Mise', 'corpus');

    const previous = process.env.DOCTOR_WORKER_POOL;
    process.env.DOCTOR_WORKER_POOL = 'off';
    try {
      clearDoctorCache();
      const disabled = await vectorizeScriptOffThread(FIXTURE, 'Mise', 'corpus');
      assertVectorsIdentical(withoutTimestamp(disabled), withoutTimestamp(pooled), 'pool-off vs pooled');
    } finally {
      if (previous === undefined) delete process.env.DOCTOR_WORKER_POOL;
      else process.env.DOCTOR_WORKER_POOL = previous;
    }
  });

  it('cancels the analysis when the caller goes away', async () => {
    await shutdownDoctorPool();
    clearDoctorCache();
    const controller = new AbortController();
    const pending = vectorizeScriptOffThread(FIXTURE, 'Mise', 'corpus', { signal: controller.signal });
    setTimeout(() => controller.abort(), 5);
    await assert.rejects(pending, (err: Error) => err.name === 'AbortError');
  });
});

describe('story vector — vectorizeFromReport is the same derivation vectorizeScript always did', () => {
  it('produces the identical vector from a report the caller already holds', async () => {
    clearDoctorCache();
    const viaScript = await vectorizeScript(FIXTURE, 'Mise', 'corpus');

    // The route's path: one analysis, then the vector derived from its report.
    // Cache-cleared first so this is a real second analysis rather than the
    // same report object handed back twice.
    clearDoctorCache();
    const report = await runScriptDoctor(FIXTURE);
    const viaReport = await vectorizeFromReport(report, FIXTURE, 'Mise', 'corpus');

    assertVectorsIdentical(withoutTimestamp(viaReport), withoutTimestamp(viaScript), 'from-report vs from-text');
  });

  it('refuses a report that did not cover the whole draft', async () => {
    // The 422 the compare route returns depends on this: a prefix-only
    // analysis must never acquire a full-draft content hash.
    const truncated = Array.from(
      { length: 1_001 },
      (_, i) => `INT. ROOM ${i} - DAY\n\nA person waits.`,
    ).join('\n\n');
    clearDoctorCache();
    const report = await runScriptDoctor(truncated);
    await assert.rejects(
      vectorizeFromReport(report, truncated, 'Partial Draft'),
      /complete whole-draft analysis/i,
    );
  });
});
