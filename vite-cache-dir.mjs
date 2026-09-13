// vite-cache-dir.mjs — where Vite's dependency-optimizer cache lives, and why
// it is never `node_modules/.vite`.
//
// ── THE DEFECT THIS FILE EXISTS FOR ────────────────────────────────────────
//
// `server/app.ts` boots Vite in middlewareMode for every non-production run,
// and Vite's DEFAULT `cacheDir` is `<root>/node_modules/.vite`. Every lane in
// this repository works in a `git worktree` whose `node_modules` is a SYMLINK
// to the main checkout's (that is how a worktree gets a dependency tree at
// all — see docs/LANE_STANDARD.md §7 and every lane brief), so two worktrees
// running a browser gate at the same time were not using two caches. They
// were using ONE directory, through two different paths, with two dependency
// optimizers scanning, writing `deps_temp_<hash>/`, and renaming it onto
// `deps/` underneath each other.
//
// That is not a hypothesis. On 2026-09-12 it took a browser gate down: a
// `verify:p0-flow` run died on a missing "Try sample coverage" button with
// three console errors reading `504 (Outdated Optimize Dep)`
// (docs/audits/2026-09-12-adversarial/p0flow-lane-report.md:94, :217;
// p0flow-review.md:235 — "a per-worktree VITE_CACHE_DIR would fix it and is
// out of scope"). The evidence outlives the incident: the shared
// `node_modules/.vite` carried NINE abandoned `deps_temp_*` directories, one
// per optimizer run that was interrupted by another process renaming over it.
//
// ── THE RULE ───────────────────────────────────────────────────────────────
//
// One cache directory per (repository path, boot). Two halves, because the
// hazard has two halves:
//
//   * `resolveViteCacheDir()` — what `vite.config.ts` sets, so that EVERY
//     Vite in this repository (dev middleware, `npm run dev`, `vite build`,
//     a developer's editor) is keyed by the repository root it was started
//     from. Two worktrees sharing one `node_modules` no longer share a cache.
//   * `allocateViteCacheSlot()` — what `bootKeylessServer()` calls, so that
//     two gates booting from the SAME worktree at the same time do not share
//     one either. The repo key cannot separate those; a lock can.
//
// ── WHY THE DEFAULT LIVES IN `os.tmpdir()`, NOT IN THE REPOSITORY ──────────
//
// `<repo>/.vite-cache` was the other candidate and is rejected, for reasons
// that are all this repository's own:
//
//   1. It must then be `.gitignore`d, and an ignore rule is only as good as
//      the next person who copies the tree without it; a cache that lands in
//      `git status` is a cache that ends up in a diff. `os.tmpdir()` cannot.
//   2. `scripts/lib/browser-verify.mjs`'s `distStaleness()` decides whether
//      `dist/` is stale by walking build inputs — and it picks up ROOT-LEVEL
//      config BY PATTERN (`DIST_BUILD_CONFIG_RE`), not by list. A
//      high-churn directory at the repository root is one regex edit away
//      from making every gate rebuild `dist/` on every run. Outside the
//      repository it can never be a build input, and
//      tests/scripts/vite-cache-dir.test.ts pins that.
//   3. CLAUDE.md's OneDrive hazard: direct writes into the mounted repo
//      truncate files and inflate diffs with CRLF. The optimizer writes
//      hundreds of files per run. None of them belong in the mount.
//
// The cost of `os.tmpdir()` is that a reboot or a tmp sweep loses the cache,
// and Vite re-optimizes once. A dependency-optimizer cache is derived state —
// losing it costs seconds and nothing else. Losing a worktree to a 504 costs
// a gate run.

import { createHash } from 'node:crypto';
import { closeSync, mkdirSync, mkdtempSync, openSync, readFileSync, realpathSync, unlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** The environment variable an outer process uses to name the cache itself. */
export const VITE_CACHE_DIR_ENV = 'VITE_CACHE_DIR';

/** Directory under `os.tmpdir()` that holds every repository's caches. */
export const VITE_CACHE_NAMESPACE = 'storymachine-vite';

/**
 * How many lock-held slots a single repository hands out before falling back
 * to unpooled `mkdtemp` directories. The pool exists so that a lone gate run
 * gets slot 0 every time and keeps a WARM optimizer cache; the ceiling exists
 * so that a runaway caller cannot fill tmp with lock files. Both directions
 * are correct at any value — this is a tuning number, not a safety one.
 */
const MAX_POOLED_SLOTS = 64;

/**
 * A stable, filesystem-safe key for a repository root: its basename (so a
 * human can tell the directories apart) plus a hash of its RESOLVED path.
 *
 * `realpathSync` matters in both directions. Two worktrees are two real
 * paths and must key differently — they do. But a path reached through a
 * symlink (`/tmp/link-to-repo`) is the SAME tree as its target and must key
 * the same, or a developer gets two caches for one checkout. A path that is
 * not on disk yet keys off its resolved-but-not-real form rather than
 * throwing: naming a cache is not the place to fail.
 *
 * @param {string} repoRoot
 * @returns {string}
 */
export function repoCacheKey(repoRoot) {
  let resolved = path.resolve(repoRoot);
  try { resolved = realpathSync(resolved); } catch { /* not on disk — resolved path is the best key available */ }
  const digest = createHash('sha256').update(resolved).digest('hex').slice(0, 12);
  const label = path.basename(resolved).replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 40) || 'repo';
  return `${label}-${digest}`;
}

/**
 * The directory that holds every cache belonging to one repository root:
 * `<tmpdir>/storymachine-vite/<basename>-<hash>`. Callers get subdirectories
 * of this (`default`, `slot-0`, …) rather than this path itself, so the pool
 * bookkeeping (`slot-*.lock`) never sits inside a directory Vite owns.
 *
 * @param {{ repoRoot?: string }} [options]
 * @returns {string}
 */
export function repoCacheBase({ repoRoot } = {}) {
  return path.join(os.tmpdir(), VITE_CACHE_NAMESPACE, repoCacheKey(repoRoot ?? process.cwd()));
}

/**
 * The `cacheDir` for a Vite instance rooted at `repoRoot`. This is what
 * `vite.config.ts` sets, so it governs the dev middleware, `npm run dev`,
 * `vite build` and anything else that reads the config — they agree by
 * construction rather than by two copies of a path.
 *
 * `VITE_CACHE_DIR` wins when it is set to a non-blank string, so an outer
 * process (a gate, CI, a developer chasing an optimizer bug) can put the
 * cache wherever it likes. A relative value resolves against `repoRoot`, the
 * same way Vite resolves a relative `cacheDir` against its root.
 *
 * @param {{ repoRoot?: string, env?: Record<string, string | undefined> }} [options]
 * @returns {string} an absolute path
 */
export function resolveViteCacheDir({ repoRoot, env = process.env } = {}) {
  const root = path.resolve(repoRoot ?? process.cwd());
  const explicit = env?.[VITE_CACHE_DIR_ENV];
  if (typeof explicit === 'string' && explicit.trim() !== '') {
    return path.resolve(root, explicit.trim());
  }
  return path.join(repoCacheBase({ repoRoot: root }), 'default');
}

/**
 * Is the process that wrote `lockPath` still running?
 *
 * Every ambiguous answer is "yes". A lock whose contents cannot be read or
 * parsed, or that names something other than a plausible pid, is treated as
 * HELD — the cost of being wrong that way is one extra slot; the cost of
 * being wrong the other way is two live optimizers in one directory, which is
 * the entire defect this file exists to close.
 *
 * @param {string} lockPath
 * @returns {boolean}
 */
function lockHolderAlive(lockPath) {
  let raw;
  try { raw = readFileSync(lockPath, 'utf8'); } catch { return false; } // vanished between EEXIST and here
  let pid;
  try { pid = JSON.parse(raw).pid; } catch { return true; }
  if (!Number.isInteger(pid) || pid <= 0) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM: the process exists and belongs to another user. ESRCH: gone.
    return /** @type {NodeJS.ErrnoException} */ (err).code === 'EPERM';
  }
}

/**
 * Claim `lockPath` for this process, or report that someone else holds it.
 *
 * The claim itself is `open(…, 'wx')` — one atomic filesystem operation, so
 * two processes racing for the same slot cannot both win, no matter how the
 * scheduler interleaves them. Reclaiming a dead holder's lock is safe for the
 * same reason: the unlink may be lost to a racing reclaimer, but the `wx`
 * create that follows it can only succeed for one of them, and the loser
 * moves to the next slot.
 *
 * @param {string} lockPath
 * @returns {boolean}
 */
function claimLock(lockPath) {
  const write = () => {
    const fd = openSync(lockPath, 'wx');
    try { writeFileSync(fd, `${JSON.stringify({ pid: process.pid, at: new Date().toISOString() })}\n`); }
    finally { closeSync(fd); }
  };
  try {
    write();
    return true;
  } catch (err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code !== 'EEXIST') throw err;
  }
  if (lockHolderAlive(lockPath)) return false;
  try { unlinkSync(lockPath); } catch { /* a racing reclaimer got there first */ }
  try {
    write();
    return true;
  } catch (err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code !== 'EEXIST') throw err;
    return false;
  }
}

// ── Releasing a slot when the holder is killed ─────────────────────────────
//
// `process.on('exit')` covers a normal return and an uncaught throw. It does
// NOT run on SIGTERM or SIGINT unless something has installed a handler for
// them — Node's default disposition for those signals terminates the process
// without ever emitting `'exit'`. That matters here because SIGTERM is exactly
// how CI stops a hung gate, and it is the case a lane report claimed was
// covered. Measured before this existed: after `kill -TERM` on a holder,
// `slot-N.lock` was still on disk.
//
// Two mechanisms, and the second is the one that has always actually worked:
//
//   1. THIS. Release every slot this process holds when it exits, including
//      on SIGINT/SIGTERM/SIGHUP. After releasing we re-raise the signal so the
//      process still dies the way the sender asked (exit status 128+n) — but
//      only if nothing else was listening for it, because stealing another
//      component's graceful shutdown to tidy a cache directory would be a
//      worse bug than the litter.
//   2. `lockHolderAlive` on the NEXT allocation. A lock whose recorded pid is
//      no longer running is reclaimed by whoever wants the slot. This is the
//      real backstop: it covers SIGKILL, a power cut, and a sandbox rebuild,
//      none of which run any handler at all. Mechanism 1 only makes the lock
//      file disappear promptly instead of at the next allocation.
//
// So a slot is never held forever by a dead process, and after this change it
// is usually not even held briefly. What neither mechanism covers is a lock
// this process cannot parse — see `lockHolderAlive`.
//
// ── RE-INSTALLING AFTER A SIGNAL FIRES (2026-09-13, review round 2,
//    observation (c)) ─────────────────────────────────────────────────────
//
// Each handler below removes ITSELF once it runs (`process.off(signal,
// handler)`), because a listener left attached after re-raising the signal
// would receive its own re-raise. The first version of this file tracked
// "installed" as one boolean for the whole process, set once and never
// cleared, so that self-removal was permanent: a gate with its OWN SIGTERM
// handler that does not exit (the `own-handler` variant the test below
// drives) survives the first SIGTERM, is then free to allocate a SECOND
// slot — a real, legitimate case, not a hypothetical — and a second SIGTERM
// found no handler here at all. Measured: the second slot's lock file
// survived a second `kill -TERM` untouched. That is not a leak (mechanism 2
// still reclaims it once the process actually dies, the same backstop that
// already covers SIGKILL), but it is a hole in mechanism 1 for a case
// mechanism 1 exists to cover.
//
// So "installed" is tracked PER SIGNAL (`installedSignalHandlers`, signal
// name -> its handler), not by one flag for the whole process:
// `installExitHooks()` runs on every `allocateViteCacheSlot()` call and
// re-attaches exactly the signals whose handler most recently fired and
// removed itself, leaving signals that have not fired yet untouched (no
// duplicate listeners, no MaxListeners warning). A process that keeps
// legitimately running and keeps allocating slots stays covered across as
// many signals of the same kind as it survives, not only the first.

/** Release callbacks for every slot this process currently holds. */
const heldSlots = new Set();

/** Whether `process.once('exit', releaseHeldSlots)` is attached. The `'exit'`
 *  event fires at most once per process, so — unlike the per-signal handlers
 *  below — this needs no re-install: once attached it covers every normal
 *  return and uncaught throw for the rest of the process's life. */
let exitHookInstalled = false;

/** Signal name -> the handler currently attached for it, or absent when none
 *  is (never installed yet, or installed and already fired once). Per
 *  signal, not one flag for the whole process — see the note above. */
const installedSignalHandlers = new Map();

function releaseHeldSlots() {
  for (const release of [...heldSlots]) {
    try { release(); } catch { /* teardown is best-effort by definition */ }
  }
}

function installExitHooks() {
  if (!exitHookInstalled) {
    exitHookInstalled = true;
    process.once('exit', releaseHeldSlots);
  }
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    if (installedSignalHandlers.has(signal)) continue; // still attached from an earlier allocation
    const handler = () => {
      releaseHeldSlots();
      process.off(signal, handler);
      installedSignalHandlers.delete(signal); // re-installed on the NEXT allocateViteCacheSlot(), if any
      // Nobody else is listening, so Node's default disposition (terminate)
      // is what the sender expected: restore it by re-raising. If another
      // listener exists, it owns the shutdown and we stay out of its way —
      // and the process may go on to allocate again, which is exactly the
      // case this re-install exists for.
      if (process.listenerCount(signal) === 0) process.kill(process.pid, signal);
    };
    installedSignalHandlers.set(signal, handler);
    process.on(signal, handler);
  }
}

/**
 * @typedef {object} ViteCacheSlot
 * @property {string} dir            absolute cache directory for this boot
 * @property {'caller' | 'pooled' | 'overflow'} source  where `dir` came from
 * @property {number | null} slot    pool index, or null when not pooled
 * @property {() => void} release    idempotent; frees the slot for reuse
 */

/**
 * Reserve a Vite cache directory that no other live process is using, for the
 * duration of one server boot.
 *
 * Three outcomes, in order:
 *   'caller'   — `VITE_CACHE_DIR` is already set, so the caller has taken
 *                responsibility for isolation and this function must not
 *                second-guess it (a suite pinning a cache, CI, a debugger).
 *   'pooled'   — an exclusive lock on `<base>/slot-N.lock`. Slot 0 is free
 *                whenever nothing else is running, so the ordinary
 *                one-gate-at-a-time case reuses a warm cache instead of
 *                re-optimizing every dependency on every run.
 *   'overflow' — every pooled slot is held: `mkdtemp` a unique directory.
 *                Unshared by construction, at the cost of a cold optimize.
 *
 * @param {{ repoRoot?: string, env?: Record<string, string | undefined>, maxSlots?: number }} [options]
 * @returns {ViteCacheSlot}
 */
export function allocateViteCacheSlot({ repoRoot, env = process.env, maxSlots = MAX_POOLED_SLOTS } = {}) {
  const root = path.resolve(repoRoot ?? process.cwd());
  const explicit = env?.[VITE_CACHE_DIR_ENV];
  if (typeof explicit === 'string' && explicit.trim() !== '') {
    return { dir: path.resolve(root, explicit.trim()), source: 'caller', slot: null, release: () => {} };
  }
  const base = repoCacheBase({ repoRoot: root });
  mkdirSync(base, { recursive: true });
  for (let slot = 0; slot < maxSlots; slot += 1) {
    const lockPath = path.join(base, `slot-${slot}.lock`);
    if (!claimLock(lockPath)) continue;
    const dir = path.join(base, `slot-${slot}`);
    mkdirSync(dir, { recursive: true });
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      heldSlots.delete(release);
      try { unlinkSync(lockPath); } catch { /* already gone */ }
    };
    heldSlots.add(release);
    installExitHooks();
    return { dir, source: 'pooled', slot, release };
  }
  return { dir: mkdtempSync(path.join(base, 'overflow-')), source: 'overflow', slot: null, release: () => {} };
}
