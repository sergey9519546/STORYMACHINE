// doctor-calibration-under-tsx.test.ts — the calibration layer must survive
// the PRODUCTION loader, in every thread the doctor runs on.
//
// WHAT THIS PINS. Every real deployment runs the server through tsx
// (Dockerfile CMD `npx tsx server.ts`; `npm start` / `npm run dev` are `tsx
// server.ts`), while `npm test` and `bootKeylessServer()` (the browser gates'
// dev server) run `node --experimental-strip-types`. The two loaders do not
// produce the same JavaScript: tsx transforms through esbuild with
// `keepNames: true`, which injects a module-level `var __name = …` helper at
// the top of every module and wraps every NAMED function expression in a
// call to it (`const sig = /* @__PURE__ */ __name((x) => …, "sig")`). Native
// type stripping injects nothing.
//
// That helper is a plain `var`, so inside the doctor.ts <-> calibration/
// reference.ts import cycle it is hoisted but UNINITIALISED until doctor.ts's
// own module body runs — and reference.ts's top-level `await
// buildDistribution()` scores the calibration corpus through doctor.ts's
// `computeRawCraftScore` BEFORE that body runs (doctor.ts is the cycle's entry
// whenever the doctor is loaded first, which is exactly what
// doctor-worker.ts's `import('./doctor.ts')` does on every pool thread). Any
// named function expression on that call path therefore throws `TypeError:
// __name is not a function`, reference.ts's `catch` swallows it into the
// empty distribution, and every report the process ever produces ships with
// no `percentile`, no `percentileDescriptor` and no `healthPercentile` —
// under tsx only, so the test suite and the dev server never see it.
//
// MEASURED (2026-09-21, on the candidate before the fix, this checkout): the
// production server had an empty distribution on its main thread and on
// both worker threads under Node 24.21.0 (CI's and the Dockerfile's
// version); under Node 22.22.2 the main thread was empty and the workers
// built the distribution. `verify:production` §5 caught the Node 24 case as
// `first differing top-level key: "dimensions"`. Under
// `--experimental-strip-types` every thread builds it on both versions, which
// is why nothing in `npm test` failed. This test therefore spawns the REAL
// tsx loader as a child — the same `tsx/dist/cli.mjs` the Dockerfile CMD
// resolves — rather than importing the doctor into the test process, where
// the defect is invisible by construction.
//
// The same class of hazard is why every formula constant in doctor.ts is
// function-local (CLAUDE.md's TDZ gotcha, densityPenalty's own comment); this
// is its function-expression twin, and it was invisible for the same reason:
// the failure is swallowed by a fallback that exists so calibration can never
// take the doctor down.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { REFERENCE_CORPUS } from '../../server/nvm/analyze/calibration/corpus.ts';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(import.meta.url);

/** The same resolution scripts/verify-production-build.mjs uses: tsx's own
 *  CLI entry, run under this process's node, so the child uses the loader
 *  production uses and no platform-specific `.bin` shim. */
function tsxCli(): string {
  return join(dirname(require.resolve('tsx/package.json')), 'dist', 'cli.mjs');
}

/** The probe the child runs. It loads doctor.ts FIRST — the order
 *  doctor-worker.ts uses on every pool thread — runs the doctor in-thread,
 *  clears the coordinator-side cache (runScriptDoctorOffThread ADOPTS worker
 *  results into doctor.ts's cache, and an in-thread run after the pool would
 *  otherwise read the worker's report back instead of computing its own),
 *  then runs the same script through the pool, and prints what each thread
 *  saw. Absolute `file:` URLs so the probe can live in a temp directory on
 *  any platform. */
function probeSource(): string {
  const url = (rel: string) => pathToFileURL(join(REPO, ...rel.split('/'))).href;
  return [
    `const doctor = await import(${JSON.stringify(url('server/nvm/analyze/doctor.ts'))});`,
    `const reference = await import(${JSON.stringify(url('server/nvm/analyze/calibration/reference.ts'))});`,
    `const pool = await import(${JSON.stringify(url('server/nvm/analyze/doctor-pool.ts'))});`,
    `const script = ${JSON.stringify(PROBE_SCRIPT)};`,
    'const mainThreadDistribution = reference.getReferenceDistribution().health.length;',
    'const inThread = await doctor.runScriptDoctor(script);',
    'doctor.clearDoctorCache();',
    'const viaPool = await pool.runScriptDoctorOffThread(script);',
    'const status = pool.doctorPoolStatus();',
    'await pool.shutdownDoctorPool();',
    'process.stdout.write(JSON.stringify({ mainThreadDistribution, inThread, viaPool, workerRuns: status.workerRuns, inProcessRuns: status.inProcessRuns }));',
  ].join('\n');
}

/** Three scenes, two speakers — the shape verify:production's §5 sends. */
const PROBE_SCRIPT = [
  'Title: Calibration Under tsx',
  'Author: doctor-calibration-under-tsx.test',
  '',
  'INT. CONTROL ROOM - NIGHT',
  '',
  'A bank of monitors. LARSEN watches a signal degrade.',
  '',
  'LARSEN',
  'We lost the uplink again.',
  '',
  'TECH',
  'Same window as last time. Ninety seconds and it comes back.',
  '',
  'EXT. RELAY TOWER - CONTINUOUS',
  '',
  'Rain sheets across a dish antenna. A warning light blinks out.',
  '',
  'INT. CONTROL ROOM - LATER',
  '',
  'The signal is gone. LARSEN stares at a dead monitor.',
  '',
  "LARSEN (CONT'D)",
  'Get me the backup line. Now.',
].join('\n');

interface ProbeOutput {
  mainThreadDistribution: number;
  inThread: Record<string, unknown>;
  viaPool: Record<string, unknown>;
  workerRuns: number;
  inProcessRuns: number;
}

function runProbeUnderTsx(): Promise<{ out: ProbeOutput; stderr: string }> {
  const dir = mkdtempSync(join(tmpdir(), 'doctor-calibration-under-tsx-'));
  const probe = join(dir, 'probe.mjs');
  writeFileSync(probe, probeSource());
  return new Promise((resolvePromise, reject) => {
    execFile(
      process.execPath,
      [tsxCli(), probe],
      {
        cwd: REPO,
        // The production shape: NODE_ENV=production is what the Dockerfile
        // runs under, and it also disables the pool's test-only overrides so
        // the worker is the real one. No prewarm — the probe drives the pool
        // itself.
        env: { ...process.env, NODE_ENV: 'production', DOCTOR_POOL_PREWARM: '0' },
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        timeout: 180_000,
      },
      (err, stdout, stderr) => {
        rmSync(dir, { recursive: true, force: true });
        if (err) {
          reject(new Error(`tsx probe failed: ${err.message}\n--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`));
          return;
        }
        try {
          resolvePromise({ out: JSON.parse(stdout) as ProbeOutput, stderr: String(stderr) });
        } catch (parseErr) {
          reject(new Error(`tsx probe printed no JSON: ${(parseErr as Error).message}\n--- stdout ---\n${stdout}\n--- stderr ---\n${stderr}`));
        }
      },
    );
  });
}

function stripVolatile(report: Record<string, unknown>): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(report)) as Record<string, unknown>;
  delete clone.analyzedAt;
  return clone;
}

function assertCalibrated(report: Record<string, unknown>, where: string): void {
  assert.equal(typeof report.healthPercentile, 'number', `${where}: healthPercentile is absent — the reference distribution was empty in that thread`);
  const dimensions = report.dimensions as Array<Record<string, unknown>>;
  assert.ok(Array.isArray(dimensions) && dimensions.length === 5, `${where}: five dimensions`);
  for (const dim of dimensions) {
    assert.equal(typeof dim.percentile, 'number', `${where}: dimension "${String(dim.key)}" has no percentile`);
    assert.equal(typeof dim.percentileDescriptor, 'string', `${where}: dimension "${String(dim.key)}" has no percentileDescriptor`);
  }
}

describe('calibration under the production loader (tsx)', () => {
  it('builds the reference distribution and reports percentiles on the main thread AND on a pool worker, and the two reports are byte-identical', async () => {
    const { out, stderr } = await runProbeUnderTsx();

    assert.ok(!/__name is not a function/.test(stderr), `esbuild's keepNames helper was called before doctor.ts initialised:\n${stderr}`);

    // The main thread — where a pool-disabled deployment (and the in-process
    // fallback) runs the doctor.
    assert.equal(
      out.mainThreadDistribution, REFERENCE_CORPUS.length,
      `main thread: reference distribution holds ${out.mainThreadDistribution} of ${REFERENCE_CORPUS.length} corpus samples — buildDistribution() threw and was swallowed into emptyDistribution()`,
    );
    assertCalibrated(out.inThread, 'in-thread report');

    // The worker — where every real request runs. The probe must actually
    // have reached one, or this half proves nothing.
    assert.equal(out.inProcessRuns, 0, 'the pool ran nothing in-process');
    assert.equal(out.workerRuns, 1, 'exactly one worker run served the pooled request');
    assertCalibrated(out.viaPool, 'pooled report');

    // Determinism across threads: what the worker computed is what the main
    // thread computed, byte for byte, once the clock field is excluded.
    assert.deepEqual(stripVolatile(out.viaPool), stripVolatile(out.inThread), 'the pooled report differs from the in-thread report');
  });
});
