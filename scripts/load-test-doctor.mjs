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
//   --routes=<a,b,...>     Which doctor-consuming POST routes to load, as a
//                          comma-separated list of paths (default
//                          /api/scriptide/doctor). Every route in ROUTE_BODIES
//                          below re-runs the doctor on the submitted script,
//                          so every one of them is a candidate event-loop
//                          hog; each named route gets its OWN load phase and
//                          its OWN /health summary, which is what makes a
//                          per-route before/after comparison possible.
//                          `--routes=all` selects every entry.
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
// ── RESULTS (2026-09-04, security review finding #1: the export routes were
//    analysing on the MAIN thread) — same container (4 CPUs, 2 workers),
//    keyless, PERSIST_SESSIONS disabled, measured BEFORE and AFTER routing
//    server/routes/export.ts and server/routes/coverage-letter.ts through the
//    pool. Identical invocation both times:
//
//   node scripts/load-test-doctor.mjs --routes=all --concurrency=4 --rounds=2 \
//        --scenes=150 --health-interval=100
//
//   GET /health p95 (ms) WHILE the route is under load — the number that says
//   what every OTHER user experiences:
//
//     route                        before    after
//     /api/scriptide/doctor           218      165   (control: already pooled)
//     /api/export/coverage-letter   1,794       15
//     /api/export/coverage          1,875      122
//     /api/export/pitchkit          1,749      104
//     /api/export/slate             3,939       11
//     /api/export/verify            1,567        7
//
//   The probe COUNTS tell the same story from the other side: /health answered
//   3-5 times during a pre-fix export phase (each probe was stuck waiting) and
//   23-58 times during the same phase after. Slate was the worst before and is
//   the best after, which is exactly right — it analyses every script in the
//   slate, so it held the loop the longest.
//
// ── RESULTS (2026-09-04, the SECOND half of security review finding #1: the
//    comparative-analysis route) — same container (4 CPUs, 2 workers),
//    keyless, PERSIST_SESSIONS disabled. data/screenplays/.vectors was DELETED
//    before each of the two runs, so both start from the identical cold state
//    a fresh checkout is always in (data/ is gitignored, so that cache never
//    ships) and both therefore include the corpus build. Identical invocation
//    both times:
//
//   rm -rf data/screenplays/.vectors
//   node scripts/load-test-doctor.mjs \
//        --routes=/api/nvm/analyze/compare,/api/scriptide/doctor \
//        --concurrency=4 --rounds=2 --scenes=150 --health-interval=100
//
//     route                        /health p95   probes answered
//     /api/nvm/analyze/compare     2,420 → 51 ms      19 → 43
//     /api/scriptide/doctor           20 → 21 ms      39 → 18   (control)
//
//   The control moved by 1 ms, which is what says the compare-route number is
//   the change and not the weather. (Its probe COUNT fell only because the
//   phase itself got shorter: the same 8 requests finished in 706 ms mean
//   instead of 1,734 ms, so there was less wall-clock to probe during.)
//
//   The compare route's own latency improved too — mean 3,509 → 2,461 ms —
//   because the fix removed a whole analysis rather than merely relocating
//   one: the route used to run the doctor over the submitted draft twice, once
//   itself and once inside vectorizeScript.
//
//   WHAT IS STILL ON THE MAIN THREAD HERE, stated plainly because a p95 alone
//   would hide it: /health p99 in the compare phase is 460 ms. That is
//   clusterCorpus + alignVectors + findNearestNeighbors — k-means over the
//   corpus plus the query, four requests deep. It is bounded by the CORPUS
//   (20 tracked screenplays) and by the rule-index size, NOT by the submitted
//   script, so it cannot be grown by a user: the unbounded-in-user-input work
//   is what moved off-thread. Measured directly on this container at 464
//   dimensions: clusterCorpus(21 vectors, k=5) = 10.0 ms, findNearestNeighbors
//   = 1.4 ms, against 613 ms for one doctor run on the same draft.
//
// Re-run and update this block (and docs/PATH_TO_EXCELLENCE.md's Phase S
// notes, if present) after any change to doctor-pool.ts, doctor.ts's
// aggregation path, the pool sizing env vars (DOCTOR_WORKER_POOL /
// DOCTOR_WORKER_POOL_SIZE), or which routes analyse off-thread.

import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { keylessBrowserServerEnv, assertKeylessAiConfig } from './lib/keyless-browser-certification.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const SCREENPLAY_DIR = path.join(REPO, 'data', 'screenplays');

// ── The doctor-consuming routes this script can load ─────────────────────
// Every entry here re-runs runScriptDoctor on the submitted script, so every
// entry is a candidate for the failure mode this script measures: a route that
// analyses on the MAIN thread holds the event loop for the whole run and
// stalls every other user's request, /health included. The 2026-09-04 security
// review found exactly that on the export routes (coverage-letter, coverage,
// pitchkit, slate, verify) while /api/scriptide/doctor — already pool-backed —
// stayed responsive throughout. They are all listed side by side here for that
// reason: the same load against the same server, one route at a time, is what
// makes the difference measurable instead of arguable.
//
// `body` builds the request payload for one script; `expectJson: false` only
// says how to drain the response (several of these return HTML, not JSON).
const ROUTE_BODIES = {
  '/api/scriptide/doctor': { body: (fountain) => ({ fountain }) },
  '/api/export/coverage-letter': { body: (fountain) => ({ fountain, title: 'Load Test' }) },
  '/api/export/coverage': { body: (fountain) => ({ fountain, title: 'Load Test' }), expectJson: false },
  '/api/export/pitchkit': { body: (fountain) => ({ fountain, title: 'Load Test' }), expectJson: false },
  // SlateBodySchema requires at least 2 scripts, and a slate analyses every
  // one of them — so a slate request is deliberately ~2x the compute of the
  // single-script routes above. The second entry gets its own boneyard note
  // so it cannot be answered from the first one's cache entry.
  '/api/export/slate': {
    body: (fountain) => ({
      scripts: [
        { title: 'Load Test A', fountain },
        { title: 'Load Test B', fountain: `${fountain}\n\n/* slate second entry */` },
      ],
    }),
  },
  // /verify exits cheaply — before the doctor ever runs — on a content-hash
  // mismatch, so the expected hash has to be the REAL one. Otherwise this
  // would time the early-return path and report a reassuring number about a
  // route it never actually exercised.
  '/api/export/verify': {
    body: (fountain) => ({
      fountain,
      expected: { contentHash: createHash('sha256').update(fountain.trim()).digest('hex') },
    }),
  },
  // The comparative-analysis route. It is not an export, but it belongs in this
  // list for the same reason the exports do: it analyses the submitted script.
  // It is also the HEAVIEST entry here, because one request can run the doctor
  // over more than the submitted draft — on a cold vector cache
  // (data/screenplays/.vectors, absent in every fresh checkout because data/ is
  // gitignored) loadCorpusVectors vectorizes all 20 tracked corpus screenplays,
  // and vectorizing runs the doctor. Delete that directory before a run to
  // measure the cold path a fresh install actually takes; leave it to measure
  // the warm steady state.
  '/api/nvm/analyze/compare': { body: (fountain) => ({ scriptText: fountain }) },
};

// ── CLI args ─────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const opts = {
    concurrency: 10, rounds: 3, scenes: 250, healthIntervalMs: 200, base: null,
    routes: ['/api/scriptide/doctor'],
  };
  for (const arg of argv) {
    const m = /^--([a-z-]+)=(.+)$/.exec(arg);
    if (!m) continue;
    const [, key, value] = m;
    if (key === 'base') opts.base = value;
    else if (key === 'concurrency') opts.concurrency = Math.max(1, parseInt(value, 10));
    else if (key === 'rounds') opts.rounds = Math.max(1, parseInt(value, 10));
    else if (key === 'scenes') opts.scenes = Math.max(10, parseInt(value, 10));
    else if (key === 'health-interval') opts.healthIntervalMs = Math.max(50, parseInt(value, 10));
    else if (key === 'routes') {
      opts.routes = value === 'all'
        ? Object.keys(ROUTE_BODIES)
        : value.split(',').map((r) => r.trim()).filter(Boolean);
      for (const route of opts.routes) {
        if (!ROUTE_BODIES[route]) {
          throw new Error(`unknown --routes entry "${route}" — known routes: ${Object.keys(ROUTE_BODIES).join(', ')}`);
        }
      }
    }
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
async function fireDoctorRequest(base, route, fountain, label) {
  const spec = ROUTE_BODIES[route];
  const started = performance.now();
  try {
    const res = await fetch(new URL(route, base), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(spec.body(fountain)),
    });
    const elapsed = performance.now() - started;
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, elapsed, error: `${label}: HTTP ${res.status} ${text.slice(0, 200)}` };
    }
    // Drain the body either way: an undrained response can hold the socket
    // and skew the next request's timing.
    const body = spec.expectJson === false ? await res.text() : await res.json();
    return { ok: true, elapsed, sceneCount: typeof body === 'object' ? body?.sceneCount : undefined };
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

    let requestSeq = 0;
    let allPassed = true;

    // One load phase PER ROUTE, never interleaved: /health latency is the
    // measurement, and a probe stalled by route A while route B is also in
    // flight would be attributable to neither.
    for (const route of opts.routes) {
      console.log(`\n[load-test] ══ ${route} ══`);

      // Health probing runs continuously in the background for this route's
      // whole load phase, independent of the request rounds below.
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

      for (let round = 0; round < opts.rounds; round++) {
        console.log(`[load-test] round ${round + 1}/${opts.rounds}: firing ${opts.concurrency} concurrent requests...`);
        const requests = Array.from({ length: opts.concurrency }, () => {
          requestSeq += 1;
          // Unique boneyard note per request so the doctor's LRU cache
          // (server/nvm/analyze/doctor.ts) can never turn a later round — or a
          // later ROUTE — into a free cache hit and understate real concurrent
          // compute cost.
          const fountain = `${baseScript}\n\n/* load-test request ${requestSeq} */`;
          return fireDoctorRequest(base, route, fountain, `round ${round + 1} request ${requestSeq}`);
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

      const doctorSummary = summarize(`Doctor requests (POST ${route})`, doctorLatencies, doctorFailures);
      const healthSummary = summarize('Health probes (GET /health, concurrent with the load above)', healthLatencies, healthFailures);

      if (!(doctorSummary.failures === 0 && healthSummary.failures === 0 && doctorSummary.count > 0)) allPassed = false;
    }

    console.log(`\nVERDICT: ${allPassed ? 'PASS' : 'FAIL'} — ${
      allPassed
        ? 'every request and every health probe succeeded; the server stayed responsive throughout.'
        : 'at least one request or health probe failed — see the failures above.'
    }`);

    process.exitCode = allPassed ? 0 : 1;
  } finally {
    stopServer();
  }
}

main().catch((err) => {
  console.error('[load-test] fatal error:', err);
  process.exitCode = 1;
});
