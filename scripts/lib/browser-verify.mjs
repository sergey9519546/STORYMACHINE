// browser-verify.mjs — the one implementation of the machinery every browser
// verification suite needs.
//
// WHY THIS EXISTS: six scripts (smoke-p0-live-flow, verify-focus-traps,
// verify-p2-p3-surfaces, verify-ui-polish-affordances, verify-e4-local-safety-net,
// verify-e5-command-palette) each carried their OWN copy of: pick a free port,
// boot the server keyless on it, resolve Playwright, launch Chromium, filter
// dev-only console noise, poll for the rendered verdict, and print a PASS/FAIL
// summary. Copies rot independently. Two concrete instances:
//
//   * The SSE migration (/api/scriptide/doctor/stream answers 200 at
//     connection-open, long before a report exists) broke the "wait for the
//     report" step in three scripts. It was fixed three times, in three
//     places, each fix noting it was the third — see the comment that used to
//     live above `renderDeadline` in verify-focus-traps.mjs.
//   * An ARIA role change broke a selector in a suite nobody was running.
//
// The suites stay six separate entry points (they assert six different
// things); what they share now lives here exactly once.
//
// BROWSER RESOLUTION. `playwright` is a pinned devDependency (package.json),
// so `npm ci` + `npx playwright install chromium` provisions everything a
// stock ubuntu-latest CI runner needs. PW_CHROMIUM_PATH remains an override
// for environments that pre-provision a browser outside Playwright's own
// cache (this development container puts one at /opt/pw-browsers/chromium).
// Unset -> Playwright's own resolution, which is the CI path.

import { spawn, execSync } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, readFileSync } from 'node:fs';
import os from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { assertKeylessAiConfig, keylessBrowserServerEnv } from './keyless-browser-certification.mjs';

// ═══════════════════════════════════════════════════════════════════════════
// SHARED TIMING POLICY — the fix for "passed alone, flaked under load."
//
// Measured history: on a 4-vCPU box with load average above ~7 (several
// agents running suites concurrently), the suites hit fixed
// waitForFunction/waitForSelector timeouts that were sized for an idle
// machine — Playwright itself was never slow, the CPU just wasn't free to
// schedule the server/renderer/GC work those waits are actually timing. The
// fix is not bigger constants (that only moves the flake threshold); it's
// ONE timing policy, read once per suite process and applied everywhere a
// timeout is handed to Playwright (or to a raw boot/HTTP wait), so a base
// value written for an idle machine still means the same thing under load.
//
// `getTiming()` reads `os.loadavg()[0]` (the 1-minute load average) divided
// by a CPU-COUNT DENOMINATOR exactly once per process — memoized, since
// every suite here is its own `node scripts/verify-*.mjs` invocation, so
// "once per process" already is "once per suite start" — and derives a
// scale: 1.0x at or below 1.0 load/cpu (an idle-to-normal machine gets the
// base values unchanged), growing linearly, capped at 4.0x (a pathologically
// loaded box gets waits stretched 4x, never unbounded). `timing.ms(base)`
// applies it; `timing.scale` is the raw factor for suites that need it
// directly (e.g. to inflate a raw socket timeout inline). There are now TWO
// possible log lines — the ordinary scaled one below, or "policy inactive"
// (see THE PLATFORM CHECK) — not one; whichever fires is the whole visible
// contract for that run.
//
// THE DENOMINATOR (2026-09-04 fix — audit `docs/audits/2026-09-04-evening-
// batch/AUDIT.md`, "getTiming load scale"). `os.cpus().length` alone is
// wrong in a CPU-quota-limited container: it reports the HOST's core count,
// not the cgroup's allowance, so a 4-cpu container on a 64-core host at load
// 28 (seven times over its real quota) computed 28/64 = 0.44/cpu and scaled
// 1.0x — indistinguishable in the log from an idle machine. The denominator
// is now `min(os.cpus().length, ceil(quota/period))`, reading the cgroup CPU
// allowance where present: v2 `cpu.max` ("max 100000" means unlimited;
// otherwise `quota period`), else v1 `cfs_quota_us` + `cfs_period_us` (a
// quota of `-1` means unlimited) — `readCgroupCpuQuota()` below resolves
// THIS PROCESS's own cgroup path (via `/proc/self/cgroup`) under each mount
// before falling back to the mount's hierarchy root, and its own doc comment
// explains why the root alone is not enough. Neither file present,
// unlimited, or unparseable -> the denominator is just `os.cpus().length`,
// unchanged from before.
//
// THE TRADE-OFF THIS DENOMINATOR CHANGE INTRODUCES (independent review
// 2026-09-04, not caught by the original brief): `os.loadavg()` reads
// `/proc/loadavg`, which is NOT namespaced per-container — it always reports
// the HOST's load, no matter how small the cgroup's own quota is. The new
// denominator, by contrast, IS container-scoped. So on a quota-limited
// container running on a busy SHARED host — a normal-looking host at, say,
// load 60 on 64 cores, with THIS container quota'd to 4 cpus — the ratio
// becomes 60/4 = 15/cpu, pinned at the 4.0x ceiling, even though the
// container itself is completely idle. Two real consequences: every timeout
// is stretched 4x (so a genuinely hung suite now takes 4x longer to fail,
// which weakens exactly the timing proof this policy exists to protect), and
// `VERIFY_MAX_LOAD_PER_CPU`, if set, can refuse to even START a run that
// should have been allowed to proceed. This is a straight trade against the
// bug the denominator change fixes (host-count-as-denominator silently
// UNDER-scaling on a quota-limited container) — it swaps under-scaling for
// over-scaling, not for "always correct." Fixing this for real needs a
// CONTAINER-SCOPED load signal instead of the host-wide `/proc/loadavg`:
// cgroup v2's `cpu.stat`'s `throttled_usec` (time this cgroup was actually
// throttled) or the kernel's PSI `cpu.pressure` file are both scoped to the
// cgroup itself and would settle this; neither is read here yet.
//
// THE PLATFORM CHECK. `os.loadavg()` returns `[0, 0, 0]` unconditionally on
// Windows — the maintainer's own machine, per CLAUDE.md's OneDrive gotcha —
// so the load policy was silently a permanent 1.0x there too, logged
// identically to a genuinely idle box. `getTiming()` now detects "the
// platform cannot report load" as `process.platform === 'win32'`, OR
// loadavg reading exactly `[0, 0, 0]` while `cpus > 0` AND a cheap 100ms
// CPU-time sample shows this process was NOT alone (preempted — real
// contention loadavg failed to report). In that state the base timeouts are
// used unscaled (scale 1.0, same numeric behavior as before) but the log
// line names the reason instead of claiming a measured 1.0x:
// `[verify] load policy inactive on this platform (loadavg unavailable) —
// fixed base timeouts`.
//
// VERIFY_MAX_LOAD_PER_CPU is the companion refuse-above-threshold mode:
// unset (the default) never refuses — scaling is the whole story. Set it and
// a suite that would start above that per-CPU load exits 3 WITHOUT launching
// Chromium or booting the server, naming the load in its message. This is
// for a caller who would rather fail fast and retry later than spend minutes
// producing a run so scaled it stops being a meaningful timing proof. When
// the load policy is inactive (see above), the refusal check is skipped
// entirely — there is no trustworthy per-CPU figure to compare against the
// threshold, and refusing on a fabricated 0.0 would be its own silent lie.
const MIN_SCALE = 1.0;
const MAX_SCALE = 4.0;

/**
 * Parses `/proc/self/cgroup` into THIS PROCESS's own controller-relative
 * path, per controller version: cgroup v2's single `0::<path>` line, and
 * cgroup v1's line whose comma-separated controller list contains `cpu`.
 * Either may come back `null` (that version's line absent, or the file
 * itself unreadable by the caller).
 * @param {string} raw
 * @returns {{ v2Path: string | null, v1Path: string | null }} */
function parseSelfCgroupPaths(raw) {
  let v2Path = null;
  let v1Path = null;
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const firstColon = trimmed.indexOf(':');
    const secondColon = trimmed.indexOf(':', firstColon + 1);
    if (firstColon < 0 || secondColon < 0) continue;
    const hierId = trimmed.slice(0, firstColon);
    const controllers = trimmed.slice(firstColon + 1, secondColon);
    const cgPath = trimmed.slice(secondColon + 1);
    if (hierId === '0' && controllers === '') {
      v2Path = cgPath;
    } else if (controllers.split(',').includes('cpu')) {
      v1Path = cgPath;
    }
  }
  return { v2Path, v1Path };
}

/** Joins a cgroup mount root with a controller-relative path from
 *  `/proc/self/cgroup`, without a double slash when that path is `/` (the
 *  common case for a process that IS its cgroup's namespace root, where the
 *  process-scoped path and the mount root coincide). */
function joinCgroupPath(root, cgPath) {
  return !cgPath || cgPath === '/' ? root : `${root}${cgPath}`;
}

/** Cgroup v2: `cpu.max`, one line `"$MAX_OR_QUOTA $PERIOD"`. Cgroup v1:
 *  `cpu.cfs_quota_us` (-1 = unlimited) and `cpu.cfs_period_us`, both in
 *  microseconds. Returns the whole-CPU quota (rounded up) or `null` when
 *  neither file is present/parseable/unlimited — callers fall back to the
 *  physical CPU count in that case.
 *
 *  RESOLVES THIS PROCESS'S OWN CGROUP PATH FIRST (independent review
 *  2026-09-04: the mount-root-only version of this function could never see
 *  a real quota on a cgroup v1 container without its own cgroup namespace —
 *  Docker's v1 default, and this very sandbox's own layout, where
 *  `/proc/self/cgroup` shows nested paths like
 *  `4:memory:/process_api/<id>/claude-code-bash` — because the v1 hierarchy
 *  ROOT's `cpu.cfs_quota_us` reads `-1` BY DEFINITION; only the process's
 *  own controller-relative subtree carries its real limit). `/proc/self/cgroup`
 *  is parsed for that path and tried under each mount before falling back
 *  to the mount's hierarchy root — which is also the correct behavior for a
 *  process that IS namespaced (root and process path coincide) and for
 *  platforms where `/proc/self/cgroup` itself does not exist.
 *
 *  `readFile` defaults to the real filesystem and is used for every path
 *  read here, `/proc/self/cgroup` included; tests inject a stub so both the
 *  parsing AND the path resolution are provable without a real cgroup v1
 *  container. @param {(path: string, encoding: 'utf8') => string} [readFile]
 * @returns {number | null} */
export function readCgroupCpuQuota(readFile = readFileSync) {
  let v2Path = null;
  let v1Path = null;
  try {
    ({ v2Path, v1Path } = parseSelfCgroupPaths(readFile('/proc/self/cgroup', 'utf8')));
  } catch { /* no /proc/self/cgroup (non-Linux, or cgroups unavailable here) */ }

  const v2Candidates = new Set([
    ...(v2Path ? [joinCgroupPath('/sys/fs/cgroup', v2Path)] : []),
    '/sys/fs/cgroup',
  ]);
  for (const root of v2Candidates) {
    try {
      const raw = readFile(`${root}/cpu.max`, 'utf8').trim();
      const [quotaStr, periodStr] = raw.split(/\s+/);
      if (quotaStr === 'max') return null;
      const quota = Number(quotaStr);
      const period = Number(periodStr);
      if (Number.isFinite(quota) && quota > 0 && Number.isFinite(period) && period > 0) {
        return Math.ceil(quota / period);
      }
    } catch { /* this candidate absent/unreadable — try the next */ }
  }

  const v1Candidates = new Set([
    ...(v1Path ? [joinCgroupPath('/sys/fs/cgroup/cpu', v1Path)] : []),
    '/sys/fs/cgroup/cpu',
  ]);
  for (const root of v1Candidates) {
    try {
      const quota = Number(readFile(`${root}/cpu.cfs_quota_us`, 'utf8').trim());
      const period = Number(readFile(`${root}/cpu.cfs_period_us`, 'utf8').trim());
      if (Number.isFinite(quota) && quota > 0 && Number.isFinite(period) && period > 0) {
        return Math.ceil(quota / period);
      }
    } catch { /* this candidate absent/unreadable — try the next */ }
  }

  return null;
}

/** Busy-waits `sampleMs` of wall-clock time and compares it against the CPU
 *  time this process actually got scheduled during that window
 *  (`process.cpuUsage()`). On an otherwise-idle machine a tight loop gets
 *  scheduled essentially continuously, so CPU time tracks wall time; under
 *  real contention the kernel preempts this process for other work and CPU
 *  time falls meaningfully short of wall time even though this process was
 *  never voluntarily idle. Used only to disambiguate a `[0,0,0]` loadavg
 *  reading (genuinely idle vs. a platform that cannot report load) — never
 *  used when loadavg itself is nonzero, since that is already a real
 *  signal. Injectable so tests never actually spin the CPU. */
export function sampleCpuContention(sampleMs = 100) {
  const startCpu = process.cpuUsage();
  const startHr = process.hrtime.bigint();
  while (Number(process.hrtime.bigint() - startHr) / 1e6 < sampleMs) { /* spin */ }
  const { user, system } = process.cpuUsage(startCpu);
  const cpuMs = (user + system) / 1000;
  const wallMs = Number(process.hrtime.bigint() - startHr) / 1e6;
  return cpuMs < wallMs * 0.8;
}

let cachedTiming = null;

/** Test-only: clears the memoized timing so a fresh `getTiming()` call
 *  recomputes from the (possibly re-injected) readers instead of returning
 *  the previous test's cached result. */
export function resetTimingCacheForTests() {
  cachedTiming = null;
}

/**
 * Read load once, log once, refuse once — memoized so every later call in
 * the same suite process (including the ones the shared helpers below make
 * internally) reuses the same scale without repeating the log line or the
 * refusal check. `logPrefix` only affects the FIRST call in a process (the
 * one that actually computes and logs); later calls ignore it.
 *
 * Every reader below defaults to the real OS/filesystem/process and is
 * overridable only for tests: `platform`, `loadavg()`, `cpuCount()`,
 * `readCgroupFile` (passed through to `readCgroupCpuQuota`), and
 * `isContended()` (replaces the real `sampleCpuContention` spin).
 *
 * @param {object} [options]
 * @param {string} [options.logPrefix]
 * @param {number} [options.maxLoadPerCpu]
 * @param {NodeJS.Platform} [options.platform]
 * @param {() => number[]} [options.loadavg]
 * @param {() => number} [options.cpuCount]
 * @param {(path: string, encoding: 'utf8') => string} [options.readCgroupFile]
 * @param {(sampleMs?: number) => boolean} [options.isContended]
 */
export function getTiming({
  logPrefix = 'verify',
  maxLoadPerCpu,
  platform = process.platform,
  loadavg = () => os.loadavg(),
  cpuCount = () => os.cpus().length || 1,
  readCgroupFile = readFileSync,
  isContended = sampleCpuContention,
} = {}) {
  if (cachedTiming) return cachedTiming;

  const la = loadavg();
  const load1 = la[0];
  const physicalCpus = cpuCount();
  const quota = readCgroupCpuQuota(readCgroupFile);
  const cpus = quota != null ? Math.min(physicalCpus, quota) : physicalCpus;

  const loadIsExactlyZero = la[0] === 0 && la[1] === 0 && la[2] === 0;
  const isWindows = platform === 'win32';
  const isContendedZero = !isWindows && loadIsExactlyZero && physicalCpus > 0 && isContended();
  const loadUnavailable = isWindows || isContendedZero;
  const unavailableReason = isWindows
    ? 'windows-loadavg-always-zero'
    : (isContendedZero ? 'loadavg-zero-under-contention' : null);

  let scale;
  let perCpu;
  if (loadUnavailable) {
    scale = MIN_SCALE;
    perCpu = null;
    console.log(`[${logPrefix}] load policy inactive on this platform (loadavg unavailable) — fixed base timeouts`);
  } else {
    perCpu = load1 / cpus;
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, perCpu));
    console.log(`[${logPrefix}] load ${load1.toFixed(1)}/${cpus} cpus → timeout scale ${scale.toFixed(1)}x`);
  }

  const envMax = maxLoadPerCpu ?? (
    process.env.VERIFY_MAX_LOAD_PER_CPU !== undefined && process.env.VERIFY_MAX_LOAD_PER_CPU !== ''
      ? Number(process.env.VERIFY_MAX_LOAD_PER_CPU)
      : undefined
  );
  if (!loadUnavailable && envMax !== undefined && Number.isFinite(envMax) && perCpu > envMax) {
    console.error(
      `[${logPrefix}] refusing to run: load ${perCpu.toFixed(2)}/cpu exceeds `
      + `VERIFY_MAX_LOAD_PER_CPU=${envMax} (loadavg=${load1.toFixed(2)}, cpus=${cpus}) — `
      + 'not launching Chromium or booting the server. Retry once load drops, '
      + 'or unset VERIFY_MAX_LOAD_PER_CPU to run scaled instead of refusing.',
    );
    process.exit(3);
  }

  cachedTiming = {
    scale,
    load1,
    cpus,
    perCpu,
    loadUnavailable,
    unavailableReason,
    cgroupQuotaCpus: quota,
    /** Scale one base millisecond value by the load-derived factor. */
    ms: (base) => Math.round(base * scale),
  };
  return cachedTiming;
}

/** An ephemeral free port on loopback, so concurrent suites never collide. */
export function pickFreePort() {
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

/**
 * Boot the real server keyless on `port`, waiting for its `server_started`
 * line, then assert /api/ai-config really reports llmReady:false.
 *
 * `extraEnv` is merged in AFTER the keyless overrides — the one intended use
 * is verify-production-build.mjs setting `NODE_ENV: 'production'` (and its
 * own SESSION_DB_DIR) to boot the SAME server this helper already knows how
 * to launch, but through app.ts's production static/CSP/compression branch
 * instead of Vite dev middleware. Every other caller omits it and keeps
 * today's dev-mode boot unchanged.
 *
 * Returns the ChildProcess. Callers keep it so they can hand it to
 * `shutdown()`.
 */
export async function bootKeylessServer({ repo, port, baseUrl, logPrefix = 'verify', extraEnv } = {}) {
  const cwd = repo ?? process.cwd();
  const base = baseUrl ?? `http://127.0.0.1:${port}`;
  const timing = getTiming({ logPrefix });
  console.log(`[${logPrefix}] booting keyless server on port ${port}...`);
  const serverProc = spawn(process.execPath, ['--experimental-strip-types', 'server.ts'], {
    cwd,
    env: { ...keylessBrowserServerEnv(process.env, port), ...(extraEnv ?? {}) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let booted = false;
  const bootTimeoutMs = timing.ms(30000);
  const bootTimeout = new Promise((_, rej) => setTimeout(() => rej(new Error(`server boot timeout (${bootTimeoutMs}ms)`)), bootTimeoutMs));
  const bootReady = new Promise((resolve) => {
    let buf = '';
    const sniff = (d) => { buf += d; if (buf.includes('server_started')) { booted = true; resolve(); } };
    serverProc.stdout.on('data', sniff);
    serverProc.stderr.on('data', sniff);
  });
  try {
    await Promise.race([bootReady, bootTimeout]);
  } catch (e) {
    throw new Error(`server did not report server_started: ${e.message}`);
  }
  if (!booted) throw new Error('server started without emitting server_started');
  await assertKeylessAiConfig(base);
  console.log(`[${logPrefix}] server booted (keyless).`);
  return serverProc;
}

/**
 * Resolve the `playwright` module: the project's own node_modules first (it is
 * a pinned devDependency, so this is the normal path both locally and in CI),
 * then the npm global root as a fallback for machines that only have a
 * system-wide install. On Windows an absolute path must become a file:// URL
 * before the ESM loader will take it.
 */
export async function resolvePlaywright() {
  const candidatePaths = [
    fileURLToPath(new URL('../../node_modules/playwright/index.mjs', import.meta.url)),
    fileURLToPath(new URL('../../node_modules/playwright/index.js', import.meta.url)),
  ];
  try {
    const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
    candidatePaths.push(`${globalRoot}/playwright/index.mjs`, `${globalRoot}/playwright/index.js`);
  } catch { /* npm unavailable — the project paths above are the real ones */ }
  const pwPath = candidatePaths.find((p) => p && existsSync(p));
  if (!pwPath) {
    throw new Error(
      'Playwright not found — it is a devDependency, so `npm ci` should provide it '
      + '(then `npx playwright install chromium` for the browser binary).',
    );
  }
  // CJS interop: named exports may land on .default for index.js.
  return await import(pathToFileURL(pwPath).href);
}

/**
 * Launch headless Chromium.
 *
 * PW_CHROMIUM_PATH points at a browser provisioned outside Playwright's own
 * cache (this container: /opt/pw-browsers/chromium). Unset -> Playwright
 * resolves the build it pins, which is what CI uses after
 * `npx playwright install chromium`.
 */
export async function launchChromium(launchOptions = {}) {
  const pw = await resolvePlaywright();
  const chromium = pw.chromium ?? pw.default?.chromium;
  if (!chromium) throw new Error('Playwright imported but `chromium` export not found.');
  return chromium.launch({
    headless: true,
    executablePath: process.env.PW_CHROMIUM_PATH || undefined,
    ...launchOptions,
  });
}

/**
 * The shared genuine-console-error filter. Dev-only Vite/HMR WebSocket noise
 * and the documented keyless 503 on the opt-in AI Director path are NOT
 * genuine errors; everything else of type `error` is.
 *
 * `sink` is the array each suite already keeps, so its own reporting is
 * unchanged.
 */
export function wireConsoleCapture(page, sink) {
  page.on('console', (msg) => {
    const t = msg.type();
    const txt = msg.text();
    const isHmr = /vite|hmr|websocket|24678/i.test(txt) || t === 'warning';
    const isKeyless503 = /503|analyze-script|model key|Failed to fetch/i.test(txt) && /analyze-script|503|key/i.test(txt);
    if (t === 'error' && !isHmr && !isKeyless503) sink.push(txt);
  });
  page.on('pageerror', (err) => {
    // Dev-only HMR WebSocket noise (Vite; never present in a prod build).
    if (/websocket|ws:\/\//i.test(err.message)) return;
    sink.push(`pageerror: ${err.message}`);
  });
  return sink;
}

/**
 * Poll the rendered page body until `needle` appears, or the deadline passes.
 *
 * THIS IS THE RACE THAT ROTTED THREE TIMES. The coverage card streams over SSE
 * (/api/scriptide/doctor/stream); its 200 arrives at connection-open, before
 * any report exists, so `waitForResponse` returned while "Running pass 1 of
 * 14…" was still on screen. (One copy also passed a RegExp to
 * `waitForSelector`, which takes a selector string — it threw instantly into a
 * `.catch`, so it never waited at all.) Polling the rendered text against a
 * real deadline is the fix, and it now exists once.
 *
 * Returns the last body text read — callers assert on it, so a timeout
 * surfaces as a failed assertion with the real page content, not an exception.
 */
export async function waitForRenderedText(page, needle, { timeoutMs = 45000, pollMs = 250 } = {}) {
  const scaledTimeoutMs = getTiming().ms(timeoutMs);
  const deadline = Date.now() + scaledTimeoutMs;
  let body = '';
  for (;;) {
    body = (await page.textContent('body')) ?? '';
    if (body.includes(needle)) break;
    if (Date.now() > deadline) break;
    await new Promise((r) => setTimeout(r, pollMs));
  }
  return body;
}

/**
 * Waits for the page's DOM to stop mutating — a real signal, not a sleep.
 * A MutationObserver on `document.documentElement` (attributes incl. `style`
 * — how Framer Motion's rAF-driven transforms/opacity actually land in the
 * DOM — plus childList/subtree/characterData) resets a `quietMs` timer on
 * every mutation; resolves once `quietMs` passes with nothing observed, or
 * `timeoutMs` elapses regardless (a hard cap so a page with some genuinely
 * continuous DOM churn — polling, a live region — can't hang a caller
 * forever). CSS-only animations (@keyframes opacity/transform, the common
 * case for decorative pulses/spinners) don't mutate the DOM and so don't
 * reset the timer — this only tracks JS-driven, DOM-visible change.
 *
 * Added for the 2026-09-04 a11y fix: `verify-a11y.mjs`'s axe sweep of the
 * landing page used to run the instant "Start fresh" attached to the DOM,
 * which is BEFORE the entrance's own ~1.2s typed intro and ~700ms fade/lift
 * reveal land at their rest state — Playwright's default `visible` wait
 * doesn't require opacity:1, only a non-empty box and no `visibility:hidden`.
 * An independent re-verification found this made that surface's axe PASS a
 * timing artifact: clean at the audit's own moment, 11 violating nodes ~1s
 * later mid-animation, 4 real ones once actually at rest — invisible to the
 * gate throughout. This helper is the fix's real-signal half (see
 * `StartScreen.tsx`'s `data-reveal-done` for the completion-signal half).
 */
export async function waitForDomQuiet(page, { quietMs = 250, timeoutMs = 4000 } = {}) {
  const timing = getTiming();
  const scaledQuietMs = timing.ms(quietMs);
  const scaledTimeoutMs = timing.ms(timeoutMs);
  await page.evaluate(
    ({ quietMs, timeoutMs }) => new Promise((resolve) => {
      let timer;
      let obs;
      const finish = () => {
        clearTimeout(timer);
        try { obs?.disconnect(); } catch { /* already disconnected */ }
        resolve();
      };
      const reset = () => {
        clearTimeout(timer);
        timer = setTimeout(finish, quietMs);
      };
      obs = new MutationObserver(reset);
      obs.observe(document.documentElement, {
        attributes: true,
        childList: true,
        subtree: true,
        characterData: true,
      });
      reset();
      setTimeout(finish, timeoutMs);
    }),
    { quietMs: scaledQuietMs, timeoutMs: scaledTimeoutMs },
  );
}

/**
 * PASS/FAIL bookkeeping + the shared summary block.
 *
 * `grouped: true`  -> record(group, assertion, pass, detail)  ("[PASS] g :: a")
 * `grouped: false` -> record(assertion, pass, detail)         ("[PASS] a")
 *
 * `groupKey` names the grouped field in the stored records so a suite's own
 * failure listing reads the way it always did ('dialog' vs 'phase').
 */
export function createRecorder({
  grouped = false,
  groupKey = 'group',
  logPrefix = 'verify',
  listFailures = false,
} = {}) {
  const results = [];

  function record(...args) {
    let entry;
    if (grouped) {
      const [group, assertion, pass, detail] = args;
      entry = { [groupKey]: group, assertion, pass, detail };
      console.log(`[${pass ? 'PASS' : 'FAIL'}] ${group} :: ${assertion}${detail ? ' — ' + detail : ''}`);
    } else {
      const [assertion, pass, detail] = args;
      entry = { assertion, pass, detail };
      console.log(`[${pass ? 'PASS' : 'FAIL'}] ${assertion}${detail ? ' — ' + detail : ''}`);
    }
    results.push(entry);
    return entry;
  }

  function failures() {
    return results.filter((r) => !r.pass);
  }

  /** Prints the summary block; returns true when every assertion passed. */
  function printSummary({ extraLines = [] } = {}) {
    const failed = failures();
    console.log('\n' + '='.repeat(72));
    console.log(`[${logPrefix}] ${results.length - failed.length}/${results.length} assertions passed.`);
    if (listFailures && failed.length > 0) {
      console.log(`[${logPrefix}] FAILED assertions:`);
      for (const f of failed) {
        const prefix = grouped ? `${f[groupKey]} :: ` : '';
        console.log(`  - ${prefix}${f.assertion}${f.detail ? ' — ' + f.detail : ''}`);
      }
    }
    for (const line of extraLines) console.log(line);
    console.log('='.repeat(72));
    return failed.length === 0;
  }

  return { results, record, failures, printSummary };
}

/**
 * Close the browser and stop the server, tolerating anything already gone.
 * `graceMs > 0` gives the server a SIGTERM window before SIGKILL (the pattern
 * the longer suites used); 0 sends a single kill (the pattern the shorter ones
 * used) — both are preserved so teardown timing is unchanged per suite.
 */
export async function shutdown({ browser, serverProc, graceMs = 0 } = {}) {
  try { if (browser) await browser.close(); } catch { /* already closed */ }
  try {
    if (serverProc) {
      if (graceMs > 0) {
        serverProc.kill('SIGTERM');
        await sleep(graceMs);
        if (!serverProc.killed) serverProc.kill('SIGKILL');
      } else {
        serverProc.kill();
      }
    }
  } catch { /* already exited */ }
}
