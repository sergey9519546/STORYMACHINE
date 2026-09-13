#!/usr/bin/env node
// VITE CACHE ISOLATION — proof that two dev-middleware servers booted from two
// repository paths that SHARE ONE `node_modules` cannot collide in the
// dependency optimizer.
//
// ── WHAT IT REPRODUCES ─────────────────────────────────────────────────────
//
// Every lane in this repository works in a `git worktree` whose `node_modules`
// is a symlink to the main checkout's. Vite's default `cacheDir` is
// `<root>/node_modules/.vite`, so two worktrees running a browser gate at the
// same time were not using two caches — they were using ONE physical
// directory through two different path strings, with two optimizers writing
// `deps_temp_<hash>/` and renaming it onto `deps/` underneath each other.
//
// The consequence, measured on 2026-09-12: a `verify:p0-flow` run died on a
// missing "Try sample coverage" button with three console errors reading
// `504 (Outdated Optimize Dep)`
// (docs/audits/2026-09-12-adversarial/p0flow-lane-report.md:94, :217). The
// shared cache still held nine abandoned `deps_temp_*` directories.
//
// ── HOW IT MEASURES ────────────────────────────────────────────────────────
//
// Two shadow roots in a temp directory, each one a directory of symlinks into
// this repository — `node_modules`, `src`, `public`, `scripts`, `index.html`,
// `tsconfig.json`, `package.json` — plus a REAL COPY of the Vite config under
// test. They are two distinct repository paths sharing one dependency tree:
// the lane topology, with none of the cost of a second worktree.
//
// Each gets its own `scripts/lib/vite-dev-probe.mjs`, which boots Vite through
// the same call `server/app.ts:283-284` makes.
//
// The protocol is STAGED rather than raced, because a race is not evidence —
// it is a coin that sometimes lands on the bug. `504 (Outdated Optimize Dep)`
// is Vite's answer when a request carries a `?v=<browserHash>` its optimizer
// metadata no longer recognises, so the question that has a deterministic
// answer is: CAN ONE SERVER'S OPTIMIZER REWRITE ANOTHER SERVER'S CACHE?
//
//   1. Crawl both servers from `index.html` through `/src/**` and into every
//      optimized-dependency URL those modules import. Both optimize. Record,
//      per server, the exact dep URLs it handed out (`…/deps/x.js?v=<hash>`).
//   2. Fingerprint the IDLE server's cache directory (path + size + mtime of
//      every file, recursively).
//   3. Drive the OTHER server, alone, through a module importing a dependency
//      only it has — so only it re-optimizes, writing `deps_temp_<hash>/` and
//      renaming it onto `deps/`.
//   4. Re-fingerprint the idle server's cache. Unchanged, or its cache was
//      rewritten by a process that does not own it.
//   5. Re-request the idle server's step-1 dep URLs, verbatim — what a browser
//      holding the page would ask for. Any 504 or non-2xx here is the failure
//      the 2026-09-12 gate hit.
//   6. Repeat 2-5 with the roles swapped.
//
// A "dependency only it has" is not a contrivance: TWO WORKTREES ARE TWO
// BRANCHES. Lanes differ in source, so they differ in dependency sets, so
// their optimizer hashes differ — which is what makes one lane's optimizer run
// destructive to the other's rather than merely redundant.
//
// ── WHAT IS DETERMINISTIC HERE, AND WHAT IS NOT ────────────────────────────
//
// Step 4 is deterministic and is the assertion that actually separates the two
// configs. Measured on this tree, same command, only the config differing:
//
//   unfixed config: A's cache CHANGED (44 -> 46 files, +46/-44)
//                   B's cache CHANGED (46 -> 46 files, +46/-46)
//   fixed config:   A's cache unchanged (+0/-0), B's cache unchanged (+0/-0)
//
// Every file of a live server's optimizer cache, deleted and rewritten by a
// process that does not own it. That is the MECHANISM of the 504.
//
// Step 5 is the SYMPTOM, and the symptom is racy — the smoke-gate lane
// measured it at 1 red in 6 dev-mode runs
// (scripts/smoke-p0-live-flow.mjs's header). A 504 needs a request to land in
// the window between the rewrite and the holder noticing, so a staged run can
// legitimately see zero of them on a broken tree. Step 5 is therefore a guard
// that must never fire, not the proof that the fix works; step 4 is the proof.
// Reading it the other way round is how a passing run gets mistaken for a
// working cache. (It also has a trap worth knowing: a server that re-optimizes
// invalidates its OWN outstanding URLs, which is correct Vite behavior and not
// this defect — which is why each direction re-crawls the idle server first.)
//
// ── WHY IT STARTS COLD ─────────────────────────────────────────────────────
//
// A shared cache that is already WARM is quiet: both servers read the same
// finished `deps/` and never write. Measured — the first version of this
// harness ran the unfixed config against a warm cache and reported 0 bad
// responses while both servers pointed at one directory. So the harness boots
// once to learn where each config puts its cache, stops, clears `deps/` and
// `deps_temp_*` there, and boots again. `--warm` skips the reset. The reset
// REFUSES a cache directory inside the repository unless
// `--allow-repo-cache-reset` says so, which keeps a default run from touching
// a developer's `node_modules/.vite`; showing the unfixed config fail is the
// case that needs the flag, and it needs it precisely because the unfixed
// config is the one that puts the cache there.
//
// ── SHOWING IT FAIL ────────────────────────────────────────────────────────
//
// `--config=<path>` names the Vite config installed into both shadow roots, so
// the unfixed tree is a real input rather than a simulated one:
//
//   git show main:vite.config.ts > /tmp/unfixed.vite.config.ts
//   node scripts/verify-vite-cache-isolation.mjs \
//     --config=/tmp/unfixed.vite.config.ts --allow-repo-cache-reset
//     -> FAIL: both servers resolve one physical cache directory
//
//   node scripts/verify-vite-cache-isolation.mjs
//     -> PASS: two directories, neither writable by the other, zero 504s
//
// Exit code 0 only if every assertion holds.
//
// Usage:
//   node scripts/verify-vite-cache-isolation.mjs [--config=<path>] [--modules=N]
//                                                [--warm] [--keep]
//                                                [--allow-repo-cache-reset]

import { spawn } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { pickFreePort } from './lib/browser-verify.mjs';

const REPO = path.resolve(import.meta.dirname, '..');
const arg = (name, fallback) => {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return hit === undefined ? fallback : hit.slice(name.length + 3);
};
const flag = (name) => process.argv.slice(2).includes(`--${name}`);

const CONFIG = path.resolve(arg('config', path.join(REPO, 'vite.config.ts')));
const MODULE_BUDGET = Number(arg('modules', '500'));
const KEEP = flag('keep');
const COLD = !flag('warm');
const ALLOW_REPO_RESET = flag('allow-repo-cache-reset');

/** Files a shadow root links to, in the order Vite will want them. */
const LINKED = ['node_modules', 'src', 'public', 'scripts', 'index.html', 'tsconfig.json', 'package.json'];

/**
 * A dependency each shadow root imports and the other does not.
 *
 * Both are real dependencies of this package that NOTHING under `src/`
 * imports, so neither is in Vite's startup scan and each is a genuine late
 * discovery — which is what forces a SECOND optimizer run with a different
 * hash. `recharts` was deliberately dropped from the bundle (see
 * `vite.config.ts`'s manualChunks note) and `docx` is used only by the server
 * (`server/lib/session-store.ts`), which the client build never crawls.
 *
 * MEASURED, not assumed: `yjs` was the first choice for B and was a NO-OP,
 * because `collab.ts`'s dynamic import puts it in the startup scan already —
 * the B->A direction reported "cache unchanged" purely because B never
 * re-optimized. A divergent dependency that is not actually divergent makes
 * this harness pass for the wrong reason, so both entries here are checked
 * against `ls node_modules/.vite/deps` after a clean scan.
 */
const DIVERGENT_DEP = { 'worktree-a': 'recharts', 'worktree-b': 'docx' };

/** The module each shadow serves to force its own late optimizer run. */
const DIVERGENT_MODULE = 'vite-cache-probe-divergent.ts';

/**
 * A directory that behaves like a checkout of this repository, sharing the
 * real `node_modules` by symlink exactly as a lane worktree does.
 * @param {string} parent @param {'worktree-a' | 'worktree-b'} name
 */
function makeShadowRoot(parent, name) {
  const root = path.join(parent, name);
  mkdirSync(root, { recursive: true });
  for (const entry of LINKED) symlinkSync(path.join(REPO, entry), path.join(root, entry));
  // The config is COPIED, not linked: it is the variable under test, and
  // `__dirname` inside it must be this shadow root (that is how the fixed
  // config keys its cache) rather than the repository it came from.
  copyFileSync(CONFIG, path.join(root, 'vite.config.ts'));
  writeFileSync(
    path.join(root, DIVERGENT_MODULE),
    `import * as dep from '${DIVERGENT_DEP[name]}';\nexport default dep;\n`,
  );
  return root;
}

/**
 * Boot one probe and resolve once it reports itself listening.
 * @param {string} root @param {number} port @param {string} label
 */
async function bootProbe(root, port, label) {
  const proc = spawn(process.execPath, [path.join(REPO, 'scripts/lib/vite-dev-probe.mjs'), `--port=${port}`], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    // A probe must inherit no cache decision from the shell running the
    // harness, or the config under test is not what is being measured.
    env: Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'VITE_CACHE_DIR')),
  });
  const stderr = [];
  proc.stderr.on('data', (d) => stderr.push(String(d)));
  const ready = new Promise((resolve, reject) => {
    let buf = '';
    proc.stdout.on('data', (d) => {
      buf += d;
      const line = buf.split('\n').find((l) => l.trim().startsWith('{'));
      if (line) { try { resolve(JSON.parse(line)); } catch { /* keep reading */ } }
    });
    proc.on('exit', (code) => reject(new Error(`${label} probe exited (${code}) before listening:\n${stderr.join('')}`)));
  });
  const timeout = sleep(120000).then(() => { throw new Error(`${label} probe did not listen within 120s`); });
  const info = await Promise.race([ready, timeout]);
  return { proc, info, stderr };
}

/** Import specifiers a transformed Vite module asks the server for next. */
function serverUrlsIn(body) {
  const urls = new Set();
  // Vite rewrites every bare import to a server-absolute URL, so the only
  // shapes that matter are `"/…"` and `'/…'` inside import/export clauses and
  // dynamic `import("…")`. `/@fs/…` is one of those shapes — and it is the one
  // an out-of-root cacheDir produces, so it must not be special-cased away.
  for (const m of body.matchAll(/\bfrom\s*["'](\/[^"']+)["']/g)) urls.add(m[1]);
  for (const m of body.matchAll(/\bimport\s*\(\s*["'](\/[^"']+)["']\s*\)/g)) urls.add(m[1]);
  for (const m of body.matchAll(/\bimport\s*["'](\/[^"']+)["']/g)) urls.add(m[1]);
  return [...urls];
}

/** @param {string} label */
const newAcc = (label) => ({ label, failures: [], seen: new Set(), responses: 0, held: new Set() });

/**
 * Record one response, returning the body when it is worth following.
 * @param {ReturnType<typeof newAcc>} acc @param {string} url @param {string} base
 */
async function probe(acc, url, base) {
  let res;
  let body = '';
  try {
    res = await fetch(new URL(url, base));
    body = await res.text();
  } catch (err) {
    acc.failures.push({ label: acc.label, url, status: 'fetch-threw', outdated: false, detail: String(err) });
    return null;
  }
  acc.responses += 1;
  const outdated = res.status === 504 || /Outdated Optimize Dep|Outdated Dependency/i.test(body);
  if (outdated || !res.ok) {
    acc.failures.push({
      label: acc.label,
      url,
      status: res.status,
      outdated,
      detail: body.slice(0, 160).replace(/\s+/g, ' '),
    });
    return null;
  }
  // A URL stamped with an optimizer hash is one this server has COMMITTED to:
  // a browser holding the page will ask for it again. Step 5 replays these.
  if (/\/deps\/.+\?v=/.test(url)) acc.held.add(url);
  return body;
}

/**
 * Crawl one server breadth-first, recording every response.
 * @param {string} base @param {ReturnType<typeof newAcc>} acc @param {string[]} seeds
 */
async function crawl(base, acc, seeds = ['/']) {
  const queue = [...seeds];
  while (queue.length > 0 && acc.responses < MODULE_BUDGET) {
    const url = queue.shift();
    if (acc.seen.has(url)) continue;
    acc.seen.add(url);
    const body = await probe(acc, url, base);
    if (body === null) continue;
    if (url === '/') {
      for (const m of body.matchAll(/<script[^>]+src="([^"]+)"/g)) queue.push(m[1]);
      continue;
    }
    // Only JS modules have imports worth following; the optimized deps are
    // where a cache collision shows up, so they are followed too.
    if (/\.(?:tsx?|jsx?|mjs)(?:\?|$)/.test(url) || url.includes('/deps/') || url.includes('/node_modules/')) {
      for (const next of serverUrlsIn(body)) queue.push(next);
    }
  }
}

/** Directory listing that never throws — an absent cache dir is `[]`. */
const listing = (dir) => { try { return readdirSync(dir).sort(); } catch { return []; } };

/**
 * Empty one optimizer cache so the next boot has to build it.
 * Returns a one-line description of what it did, for the log.
 * @param {string} dir
 */
function resetOptimizerCache(dir) {
  const rel = path.relative(REPO, dir);
  const inRepo = rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
  if (inRepo && !ALLOW_REPO_RESET) {
    return `${dir} — NOT reset (inside the repository; pass --allow-repo-cache-reset to allow it)`;
  }
  const removed = listing(dir).filter((e) => e === 'deps' || e.startsWith('deps_temp'));
  for (const entry of removed) rmSync(path.join(dir, entry), { recursive: true, force: true });
  return `${dir} — removed ${removed.length} entr${removed.length === 1 ? 'y' : 'ies'} (${removed.join(', ') || 'none'})`;
}

/**
 * Path + size + mtime of every file under `dir`, recursively — a fingerprint
 * that changes if any process writes into this cache, including a rename that
 * happens to leave the file list identical.
 * @param {string} dir @returns {string[]}
 */
function fingerprint(dir) {
  const rows = [];
  const walk = (abs, rel) => {
    for (const entry of listing(abs)) {
      const full = path.join(abs, entry);
      const here = rel ? `${rel}/${entry}` : entry;
      let st;
      try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) walk(full, here);
      else rows.push(`${here} ${st.size} ${st.mtimeMs}`);
    }
  };
  walk(dir, '');
  return rows.sort();
}

/** What changed between two fingerprints, for the failure message. */
function fingerprintDelta(before, after) {
  const b = new Set(before);
  const a = new Set(after);
  return { added: after.filter((r) => !b.has(r)), removed: before.filter((r) => !a.has(r)) };
}

const scratch = mkdtempSync(path.join(tmpdir(), 'vite-cache-isolation-'));
const procs = [];
const ownCaches = new Set();
let exitCode = 0;
try {
  console.log('[vite-cache] VITE CACHE ISOLATION');
  console.log(`[vite-cache] config under test : ${CONFIG}`);
  console.log(`[vite-cache] shadow roots      : ${scratch}`);
  console.log(`[vite-cache] module budget     : ${MODULE_BUDGET} responses per crawl`);

  const rootA = makeShadowRoot(scratch, 'worktree-a');
  const rootB = makeShadowRoot(scratch, 'worktree-b');
  const [portA, portB] = [await pickFreePort(), await pickFreePort()];

  // PROBE BOOT: the only thing that can say where a config puts its cache is
  // Vite reading that config. Boot, read, stop — then reset and boot for real.
  if (COLD) {
    const [p1, p2] = await Promise.all([bootProbe(rootA, portA, 'A(probe)'), bootProbe(rootB, portB, 'B(probe)')]);
    for (const p of [p1, p2]) { try { p.proc.kill('SIGTERM'); } catch { /* already gone */ } }
    await sleep(800);
    for (const p of [p1, p2]) { try { p.proc.kill('SIGKILL'); } catch { /* already gone */ } }
    for (const dir of new Set([p1.info.cacheDirReal, p2.info.cacheDirReal])) {
      console.log(`[vite-cache] cold start: ${resetOptimizerCache(dir)}`);
    }
  }

  // CONCURRENTLY: two optimizers starting together is the lane topology, and
  // booting them in sequence would let the second read a finished cache.
  const [a, b] = await Promise.all([bootProbe(rootA, portA, 'A'), bootProbe(rootB, portB, 'B')]);
  procs.push(a.proc, b.proc);
  for (const info of [a.info, b.info]) {
    if (info.cacheDirReal.startsWith(path.join(tmpdir(), 'storymachine-vite'))) ownCaches.add(info.cacheDirReal);
  }
  console.log(`[vite-cache] A root ${a.info.root}`);
  console.log(`[vite-cache]   cacheDir ${a.info.cacheDir}`);
  console.log(`[vite-cache]   realpath ${a.info.cacheDirReal}`);
  console.log(`[vite-cache] B root ${b.info.root}`);
  console.log(`[vite-cache]   cacheDir ${b.info.cacheDir}`);
  console.log(`[vite-cache]   realpath ${b.info.cacheDirReal}`);

  if (a.info.cacheDirReal === b.info.cacheDirReal) {
    console.log('[vite-cache] FAIL — both servers resolved ONE physical cache directory:');
    console.log(`[vite-cache]   ${a.info.cacheDirReal}`);
    exitCode = 1;
  } else {
    console.log('[vite-cache] PASS — two distinct physical cache directories.');
  }

  const accA = newAcc('A');
  const accB = newAcc('B');
  const baseA = `http://127.0.0.1:${portA}`;
  const baseB = `http://127.0.0.1:${portB}`;

  // ── Step 1: both optimize, and both commit to a set of hashed dep URLs ────
  await Promise.all([crawl(baseA, accA), crawl(baseB, accB)]);
  console.log(
    `[vite-cache] step 1 — A: ${accA.responses} responses, ${accA.held.size} hashed dep URLs, `
    + `${accA.failures.length} bad | B: ${accB.responses} responses, ${accB.held.size} hashed dep URLs, `
    + `${accB.failures.length} bad`,
  );
  if (accA.held.size === 0 || accB.held.size === 0) {
    console.log('[vite-cache] FAIL — a crawl found no optimizer-hashed dependency URL, so there is nothing');
    console.log('[vite-cache]        to invalidate and the steps below would pass vacuously. The CRAWL is');
    console.log('[vite-cache]        what needs fixing (did Vite change how it serves optimized deps?).');
    exitCode = 1;
  }

  /**
   * Steps 2-5: one server idle, the other forced to re-optimize.
   * @param {{ info: any, acc: ReturnType<typeof newAcc>, base: string }} idle
   * @param {{ info: any, acc: ReturnType<typeof newAcc>, base: string }} mover
   */
  const crossContamination = async (idle, mover) => {
    // RE-CRAWL THE IDLE SERVER FIRST. Its held URLs must be the ones its
    // CURRENT metadata recognises, or this measures the wrong thing — measured
    // the hard way: the first version of this harness reused step 1's URL set
    // for both directions, so the server that re-optimized in direction one
    // replayed its own superseded hashes in direction two and answered 504.
    // That is correct Vite behavior (a re-optimize tells the browser to
    // reload), and it made the FIXED config look broken. A server invalidating
    // its own URLs is not the defect; a server having its URLs invalidated by
    // a process it has never heard of is.
    const refreshed = newAcc(`${idle.acc.label}-refresh`);
    await crawl(idle.base, refreshed);
    idle.acc.held = refreshed.held;
    const before = fingerprint(idle.info.cacheDirReal);
    const moverAcc = newAcc(`${mover.acc.label}-divergent`);
    await crawl(mover.base, moverAcc, [`/${DIVERGENT_MODULE}`]);
    // The optimizer writes `deps_temp_<hash>/` and renames it onto `deps/`
    // AFTER the response that triggered it was served, so settle before
    // reading the other server's cache.
    await sleep(3000);
    const after = fingerprint(idle.info.cacheDirReal);
    const delta = fingerprintDelta(before, after);
    const touched = delta.added.length > 0 || delta.removed.length > 0;
    console.log(
      `[vite-cache] ${mover.acc.label} re-optimized via /${DIVERGENT_MODULE} `
      + `(${DIVERGENT_DEP[path.basename(mover.info.root)]}; ${moverAcc.responses} responses, `
      + `${moverAcc.failures.length} bad) -> ${idle.acc.label}'s cache `
      + `${touched ? 'CHANGED' : 'unchanged'} (${before.length} -> ${after.length} files, `
      + `+${delta.added.length}/-${delta.removed.length})`,
    );
    if (touched) {
      exitCode = 1;
      for (const row of delta.removed.slice(0, 4)) console.log(`[vite-cache]   -${row}`);
      for (const row of delta.added.slice(0, 4)) console.log(`[vite-cache]   +${row}`);
    }
    // Step 5: replay, verbatim, what the idle server already handed out.
    const replay = newAcc(`${idle.acc.label}-replay`);
    for (const url of idle.acc.held) await probe(replay, url, idle.base);
    const outdated = replay.failures.filter((f) => f.outdated);
    console.log(
      `[vite-cache] ${idle.acc.label} replayed ${idle.acc.held.size} held dep URLs: `
      + `${outdated.length} x 504/Outdated-Optimize-Dep, ${replay.failures.length} bad in total`,
    );
    for (const f of replay.failures.slice(0, 6)) console.log(`[vite-cache]   ${f.status} ${f.url} — ${f.detail ?? ''}`);
    return [...refreshed.failures, ...moverAcc.failures, ...replay.failures];
  };

  const A = { info: a.info, acc: accA, base: baseA };
  const B = { info: b.info, acc: accB, base: baseB };
  const crossFailures = [
    ...await crossContamination(A, B),
    ...await crossContamination(B, A),
  ];

  const failures = [...accA.failures, ...accB.failures, ...crossFailures];
  const outdatedTotal = failures.filter((f) => f.outdated).length;
  console.log(`[vite-cache] total 504 / Outdated Optimize Dep responses: ${outdatedTotal}`);
  console.log(`[vite-cache] total bad responses (all causes): ${failures.length}`);
  for (const f of failures.slice(0, 12)) console.log(`[vite-cache]   ${f.label} ${f.status} ${f.url} — ${f.detail ?? ''}`);
  if (failures.length > 0) exitCode = 1;

  console.log(`[vite-cache] A cache contents: ${listing(a.info.cacheDirReal).join(', ') || '(empty)'}`);
  console.log(`[vite-cache] B cache contents: ${listing(b.info.cacheDirReal).join(', ') || '(empty)'}`);
  console.log(exitCode === 0
    ? '[vite-cache] PASS — two caches, neither writable by the other, zero 504s.'
    : '[vite-cache] FAIL — see the lines above.');
} catch (err) {
  console.error(`[vite-cache] FAIL — ${err.message}`);
  exitCode = 1;
} finally {
  for (const p of procs) { try { p.kill('SIGTERM'); } catch { /* already gone */ } }
  await sleep(400);
  for (const p of procs) { try { p.kill('SIGKILL'); } catch { /* already gone */ } }
  if (KEEP) {
    console.log(`[vite-cache] --keep: shadow roots left at ${scratch}`);
  } else {
    rmSync(scratch, { recursive: true, force: true });
    // The shadow roots were temp directories, so the caches the fixed config
    // keyed to them are temp directories too and nothing will use them again.
    // A harness that leaves a fresh cache behind on every run is a harness
    // nobody runs twice.
    for (const dir of ownCaches) rmSync(path.dirname(dir), { recursive: true, force: true });
  }
}
process.exit(exitCode);
