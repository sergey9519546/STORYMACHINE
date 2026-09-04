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
import { setTimeout as sleep } from 'node:timers/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { assertKeylessAiConfig, keylessBrowserServerEnv } from './keyless-browser-certification.mjs';

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
  console.log(`[${logPrefix}] booting keyless server on port ${port}...`);
  const serverProc = spawn(process.execPath, ['--experimental-strip-types', 'server.ts'], {
    cwd,
    env: { ...keylessBrowserServerEnv(process.env, port), ...(extraEnv ?? {}) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let booted = false;
  const bootTimeout = new Promise((_, rej) => setTimeout(() => rej(new Error('server boot timeout (30s)')), 30000));
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
  const deadline = Date.now() + timeoutMs;
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
