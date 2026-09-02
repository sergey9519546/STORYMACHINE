#!/usr/bin/env node
// load-test-doctor.mjs — S3 (docs/PATH_TO_EXCELLENCE.md Phase S). Fires N
// concurrent FEATURE-LENGTH POST /api/scriptide/doctor requests against a
// real running server and reports latency percentiles, while probing
// GET /health throughout to prove the server stays responsive under load —
// the concurrency validation W1 (doctor-pool.ts's worker-thread pool) and W2
// (the O(n^3)->near-linear temporal-consistency fix) exist to make possible.
//
// THIS IS A MANUALLY-RUN MEASUREMENT, NOT A CI TEST — and unlike the
// scripts/verify-*.mjs browser battery (which became a real CI gate on
// 2026-09-02: see the `browser` job in .github/workflows/ci.yml), it stays out
// of CI for a reason that is about this script, not about CI's capabilities:
// it reports latency percentiles, and a percentile measured on a shared,
// variably-loaded hosted runner is noise dressed as a threshold. It is
// deliberately not wired into `npm test`.
// The synthetic-script generator is the SAME pattern
// tests/core/doctor-perf-budget.test.ts uses (concatenate real
// data/screenplays/*.fountain fixtures, uniquifying sluglines per repeat) —
// read that file first if this one needs changing.
//
// Usage:
//   node scripts/load-test-doctor.mjs [options]
//
// Options (all optional):
//   --base=<url>          Target an already-running server instead of
//                          spawning a fresh keyless one (e.g.
//                          --base=http://localhost:3000 for `npm run dev`).
//   --concurrency=<N>      Concurrent in-flight doctor requests per round
//                          (default 10). Kept comfortably under gameLimiter's
//                          120/min ceiling — this measures doctor-pool
//                          concurrency, not the rate limiter.
//   --rounds=<N>           How many concurrent bursts to run back-to-back
//                          (default 3). Each request across all rounds gets a
//                          unique boneyard note appended so the doctor's LRU
//                          cache can never mask a later round's real cost.
//   --scenes=<N>           Target scene count per synthetic script (default
//                          250 — solidly feature-length, comfortably under
//                          ANALYZER_SCENE_CEILING's 400).
//   --health-interval=<ms> GET /health probe interval while the load runs
//                          (default 200).
//
// Exit codes: 0 = every doctor request AND every health probe succeeded.
// 1 = at least one failed, or the server could not be reached at all.
//
// ── RESULTS (2026-08-21, this development container: 4 CPUs, so
//    doctor-pool.ts's configuredPoolSize() = min(2, 4-1) = 2 worker threads;
//    PERSIST_SESSIONS disabled, keyless, DOCTOR_WORKER_POOL default/on) ─────
//
//   node scripts/load-test-doctor.mjs --concurrency=10 --rounds=3 --scenes=250 --health-interval=200
//
//   Synthetic script: 250 scenes, 120,777 chars.
//   Doctor requests: 30/30 succeeded (0 failed).
//   Doctor latency (ms):  min 1,137  p50 4,447  p90 6,849  p95 7,873
//                          p99 8,234  max 8,234  mean 4,235
//   Health probes during load: 92/92 succeeded (0 failed) — probed every
//   200ms for the full ~28s run.
//   Health latency (ms):  min 2  p50 2  p90 5  p95 29  p99 384  max 384
//   VERDICT: PASS — every one of 3 concurrent 10-wide bursts of
//   feature-length (250-scene) analyses succeeded, and /health answered
//   every single probe throughout — including the ones fired while all 10
//   requests of a burst were in flight against only 2 worker threads. The
//   one visible cost of that queueing pressure is health's own p99 (384ms
//   vs. a ~2ms baseline) during the heaviest contention window — a real,
//   honestly-reported latency bump, but still a fast, successful response,
//   not the 22-minute full-server freeze the pre-W1/W2 architecture produced
//   under a SINGLE feature-length request. That comparison is the point of
//   this file: this load (10-wide x 3 rounds) would have been un-survivable
//   before W1 moved doctor execution off the main thread and W2 fixed its
//   O(n^3) scaling.
//
// Re-run and update this block (and docs/PATH_TO_EXCELLENCE.md's Phase S
// notes, if present) after any change to doctor-pool.ts, doctor.ts's
// aggregation path, or the pool sizing env vars (DOCTOR_WORKER_POOL /
// DOCTOR_WORKER_POOL_SIZE).

import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { keylessBrowserServerEnv, assertKeylessAiConfig } from './lib/keyless-browser-certification.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const SCREENPLAY_DIR = path.join(REPO, 'data', 'screenplays');

// ── CLI args ─────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const opts = { concurrency: 10, rounds: 3, scenes: 250, healthIntervalMs: 200, base: null };
  for (const arg of argv) {
    const m = /^--([a-z-]+)=(.+)$/.exec(arg);
    if (!m) continue;
    const [, key, value] = m;
    if (key === 'base') opts.base = value;
    else if (key === 'concurrency') opts.concurrency = Math.max(1, parseInt(value, 10));
    else if (key === 'rounds') opts.rounds = Math.max(1, parseInt(value, 10));
    else if (key === 'scenes') opts.scenes = Math.max(10, parseInt(value, 10));
    else if (key === 'health-interval') opts.healthIntervalMs = Math.max(50, parseInt(value, 10));
  }
  return opts;
}

// ── Synthetic feature-length script (same pattern as
//    tests/core/doctor-perf-budget.test.ts's buildSyntheticScript) ─────────
function fixtureBodies() {
  return readdirSync(SCREENPLAY_DIR)
    .filter((f) => f.endsWith('.fountain'))
    .sort()
    .map((f) => readFileSync(path.join(SCREENPLAY_DIR, f), 'utf8').trim());
}

function countScenes(text) {
  return (text.match(/^(INT\.|EXT\.|INT\/EXT|EXT\/INT|I\/E)/gm) ?? []).length;
}

function buildSyntheticScript(targetScenes, bodies) {
  const sceneCounts = bodies.map(countScenes);
  const parts = [];
  let total = 0;
  let i = 0;
  let repeat = 0;
  while (total < targetScenes) {
    const idx = i % bodies.length;
    if (i > 0 && idx === 0) repeat++;
    parts.push(
      repeat === 0
        ? bodies[idx]
        : bodies[idx].replace(/^(INT\.|EXT\.)(.*)$/gm, (_m, head, rest) => `${head}${rest} [${repeat}]`),
    );
    total += sceneCounts[idx];
    i++;
  }
  return parts.join('\n\n');
}

// ── Server boot/teardown (adapted from scripts/verify-p2-p3-surfaces.mjs —
//    same keyless-env + server_started-log-line handshake, no browser needed
//    here since this script only ever speaks plain HTTP). ──────────────────
function pickFreePort() {
  return new Promise((resolve, reject) => {
    const s = createServer();
    s.unref();
    s.on('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

async function bootOwnServer() {
  const port = await pickFreePort();
  const base = `http://127.0.0.1:${port}`;
  console.log(`[load-test] booting an isolated keyless server on port ${port}...`);
  const proc = spawn(process.execPath, ['--experimental-strip-types', 'server.ts'], {
    cwd: REPO,
    env: keylessBrowserServerEnv(process.env, port),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let booted = false;
  const bootTimeout = new Promise((_, rej) => setTimeout(() => rej(new Error('server boot timeout (30s)')), 30_000));
  const bootReady = new Promise((resolve) => {
    let buf = '';
    const onData = (d) => { buf += d; if (buf.includes('server_started')) { booted = true; resolve(); } };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
  });
  try {
    await Promise.race([bootReady, bootTimeout]);
  } catch (e) {
    proc.kill();
    throw new Error(`server did not report server_started: ${e.message}`);
  }
  if (!booted) { proc.kill(); throw new Error('server started without emitting server_started'); }
  await assertKeylessAiConfig(base);
  console.log('[load-test] server booted (keyless, worker pool default).');
  return { base, stop: () => proc.kill() };
}

// ── Timing helpers ───────────────────────────────────────────────────────
function percentile(sortedMs, p) {
  if (sortedMs.length === 0) return NaN;
  const idx = Math.min(sortedMs.length - 1, Math.ceil((p / 100) * sortedMs.length) - 1);
  return sortedMs[Math.max(0, idx)];
}

function summarize(label, latenciesMs, failures) {
  const sorted = [...latenciesMs].sort((a, b) => a - b);
  const mean = sorted.length > 0 ? sorted.reduce((s, v) => s + v, 0) / sorted.length : NaN;
  console.log(`\n${label}:`);
  console.log(`  succeeded: ${sorted.length}, failed: ${failures.length}`);
  if (sorted.length > 0) {
    console.log(
      `  latency (ms): min ${Math.round(sorted[0])}  p50 ${Math.round(percentile(sorted, 50))}  `
      + `p90 ${Math.round(percentile(sorted, 90))}  p95 ${Math.round(percentile(sorted, 95))}  `
      + `p99 ${Math.round(percentile(sorted, 99))}  max ${Math.round(sorted[sorted.length - 1])}  `
      + `mean ${Math.round(mean)}`,
    );
  }
  if (failures.length > 0) {
    console.log(`  first failure: ${failures[0]}`);
  }
  return { count: sorted.length, failures: failures.length, mean, sorted };
}

// ── Load-generation ──────────────────────────────────────────────────────
async function fireDoctorRequest(base, fountain, label) {
  const started = performance.now();
  try {
    const res = await fetch(new URL('/api/scriptide/doctor', base), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fountain }),
    });
    const elapsed = performance.now() - started;
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, elapsed, error: `${label}: HTTP ${res.status} ${text.slice(0, 200)}` };
    }
    const body = await res.json();
    return { ok: true, elapsed, sceneCount: body?.sceneCount };
  } catch (err) {
    return { ok: false, elapsed: performance.now() - started, error: `${label}: ${err.message}` };
  }
}

async function probeHealth(base) {
  const started = performance.now();
  try {
    const res = await fetch(new URL('/health', base));
    const elapsed = performance.now() - started;
    return { ok: res.ok, elapsed, status: res.status };
  } catch (err) {
    return { ok: false, elapsed: performance.now() - started, error: err.message };
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  console.log('[load-test] options:', opts);

  let base = opts.base;
  let stopServer = () => {};
  if (!base) {
    const booted = await bootOwnServer();
    base = booted.base;
    stopServer = booted.stop;
  } else {
    console.log(`[load-test] targeting existing server at ${base}`);
  }

  try {
    const bodies = fixtureBodies();
    if (bodies.length === 0) throw new Error('no .fountain fixtures found under data/screenplays — cannot build a synthetic load script');
    const baseScript = buildSyntheticScript(opts.scenes, bodies);
    console.log(`[load-test] synthetic script targets ${opts.scenes} scenes, ${baseScript.length} chars.`);

    // Health probing runs continuously in the background for the whole load
    // run, independent of the doctor request rounds below.
    let probing = true;
    const healthResults = [];
    const healthLoop = (async () => {
      while (probing) {
        healthResults.push(await probeHealth(base));
        await new Promise((r) => setTimeout(r, opts.healthIntervalMs));
      }
    })();

    const doctorLatencies = [];
    const doctorFailures = [];
    let requestSeq = 0;

    for (let round = 0; round < opts.rounds; round++) {
      console.log(`[load-test] round ${round + 1}/${opts.rounds}: firing ${opts.concurrency} concurrent doctor requests...`);
      const requests = Array.from({ length: opts.concurrency }, () => {
        requestSeq += 1;
        // Unique boneyard note per request so the doctor's LRU cache
        // (server/nvm/analyze/doctor.ts) can never turn a later round into a
        // free cache hit and understate real concurrent compute cost.
        const fountain = `${baseScript}\n\n/* load-test request ${requestSeq} */`;
        return fireDoctorRequest(base, fountain, `round ${round + 1} request ${requestSeq}`);
      });
      const results = await Promise.all(requests);
      for (const r of results) {
        if (r.ok) doctorLatencies.push(r.elapsed);
        else doctorFailures.push(r.error);
      }
    }

    probing = false;
    await healthLoop;

    const healthLatencies = healthResults.filter((r) => r.ok).map((r) => r.elapsed);
    const healthFailures = healthResults.filter((r) => !r.ok).map((r) => r.error ?? `HTTP ${r.status}`);

    const doctorSummary = summarize('Doctor requests (POST /api/scriptide/doctor)', doctorLatencies, doctorFailures);
    const healthSummary = summarize('Health probes (GET /health, concurrent with the load above)', healthLatencies, healthFailures);

    const pass = doctorSummary.failures === 0 && healthSummary.failures === 0 && doctorSummary.count > 0;
    console.log(`\nVERDICT: ${pass ? 'PASS' : 'FAIL'} — ${
      pass
        ? 'every doctor request and every health probe succeeded; the server stayed responsive throughout.'
        : 'at least one doctor request or health probe failed — see the failures above.'
    }`);

    process.exitCode = pass ? 0 : 1;
  } finally {
    stopServer();
  }
}

main().catch((err) => {
  console.error('[load-test] fatal error:', err);
  process.exitCode = 1;
});
