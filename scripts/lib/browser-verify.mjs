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
import { existsSync } from 'node:fs';
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
// `getTiming()` reads `os.loadavg()[0] / os.cpus().length` (the 1-minute
// load average per logical CPU) exactly once per process — memoized, since
// every suite here is its own `node scripts/verify-*.mjs` invocation, so
// "once per process" already is "once per suite start" — and derives a
// scale: 1.0x at or below 1.0 load/cpu (an idle-to-normal machine gets the
// base values unchanged), growing linearly, capped at 4.0x (a pathologically
// loaded box gets waits stretched 4x, never unbounded). `timing.ms(base)`
// applies it; `timing.scale` is the raw factor for suites that need it
// directly (e.g. to inflate a raw socket timeout inline). The one log line
// this prints is the whole visible contract: `[verify] load L/cpus →
// timeout scale Sx`.
//
// VERIFY_MAX_LOAD_PER_CPU is the companion refuse-above-threshold mode:
// unset (the default) never refuses — scaling is the whole story. Set it and
// a suite that would start above that per-CPU load exits 3 WITHOUT launching
// Chromium or booting the server, naming the load in its message. This is
// for a caller who would rather fail fast and retry later than spend minutes
// producing a run so scaled it stops being a meaningful timing proof.
const MIN_SCALE = 1.0;
const MAX_SCALE = 4.0;

let cachedTiming = null;

/** Read load once, log once, refuse once — memoized so every later call in
 *  the same suite process (including the ones the shared helpers below make
 *  internally) reuses the same scale without repeating the log line or the
 *  refusal check. `logPrefix` only affects the FIRST call in a process (the
 *  one that actually computes and logs); later calls ignore it. */
export function getTiming({ logPrefix = 'verify', maxLoadPerCpu } = {}) {
  if (cachedTiming) return cachedTiming;
  const load1 = os.loadavg()[0];
  const cpus = os.cpus().length || 1;
  const perCpu = load1 / cpus;
  const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, perCpu));
  console.log(`[${logPrefix}] load ${load1.toFixed(1)}/${cpus} cpus → timeout scale ${scale.toFixed(1)}x`);

  const envMax = maxLoadPerCpu ?? (
    process.env.VERIFY_MAX_LOAD_PER_CPU !== undefined && process.env.VERIFY_MAX_LOAD_PER_CPU !== ''
      ? Number(process.env.VERIFY_MAX_LOAD_PER_CPU)
      : undefined
  );
  if (envMax !== undefined && Number.isFinite(envMax) && perCpu > envMax) {
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
