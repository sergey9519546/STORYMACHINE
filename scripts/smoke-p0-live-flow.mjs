#!/usr/bin/env node
// smoke-p0-live-flow.mjs — P0 live-flow smoke check (referenced by RUN_DEMO.md).
//
// WHY: P0_OPERATING_KIT.md's pre-session checklist requires "confirm the
// sample loads correctly" before every LIVE-FLOW session. The prior
// certification (PHASE_TRACKER.md "Browser DOM smoke") used a throwaway
// Playwright harness under .playwright-cli/. This makes that check
// repeatable: boot the server keyless on an isolated port, drive the exact
// flow a moderator would (StartScreen → "Try sample coverage" → report),
// and exit 0 only if the deterministic report renders with the expected
// verdict/health and ZERO genuine browser console errors.
//
// This is P0-enablement tooling, not engine code: it boots the existing
// server and clicks the existing UI. It adds no routes, rules, or scoring.
//
// THIS RUNS IN CI (2026-09-02). `playwright` is a pinned devDependency and
// the `browser` job in .github/workflows/ci.yml runs
// `npx playwright install --with-deps chromium` before `npm run verify:browser`,
// so this suite gates every push and blocks `publish` in release.yml. It was
// previously described as un-CI-able; that was a self-imposed limitation, and
// it cost real rot (the SSE migration broke the report wait in three suites
// and nobody noticed for days because nothing ran them).
//
// Prereqs: Node >= 22.6; `npm ci` (brings Playwright) plus a Chromium binary
// — `npx playwright install chromium`, or point PW_CHROMIUM_PATH at a browser
// provisioned outside Playwright's cache (this container:
// /opt/pw-browsers/chromium). Run from the repo root:
//   node scripts/smoke-p0-live-flow.mjs
//
// The shared boot/launch/console-capture/report-wait machinery lives in
// scripts/lib/browser-verify.mjs — change it there, not here.
//
// Exit codes: 0 = live flow certified; 1 = a real problem (do not field a
// live session on this — fall back to the static report exposure mode).

import { spawn } from 'node:child_process';
import {
  bootKeylessServer,
  getTiming,
  launchChromium,
  pickFreePort,
  shutdown,
  waitForDomQuiet,
  waitForRenderedText,
  wireConsoleCapture,
} from './lib/browser-verify.mjs';

const REPO = process.cwd();
const ISOLATED_PORT = await pickFreePort();
const BASE = `http://127.0.0.1:${ISOLATED_PORT}`;

// Expected deterministic facts for "Dead Frequency" (regenerate-verified;
// must match docs/user-validation/P0_QUICK_START.md provenance). Re-locked
// 2026-08-04 for the stimulus swap ("The Second Key" -> "Dead Frequency",
// see src/lib/sample-script.ts's header) — measured health is 78.3, and the
// live-flow UI rounds it to an integer for display, hence 78 here (the same
// rounding relationship the prior EXPECT.health: 69 had to the old exported
// 68.9).
const EXPECT = { verdict: 'CONSIDER', health: 78, minScenes: 12 };

// The honest draft-rank line the panel must render for the built-in sample
// instead of ranking a demo among the writer's own drafts (B-6, 2026-09-05).
// Kept verbatim here so a copy edit that quietly drops the line fails this
// gate rather than passing unnoticed.
const SAMPLE_NOT_RANKED = 'The sample is not ranked against your drafts';

// Step 3e (Decision #7, 2026-09-06): the stable half of the one registered
// sentence a writer meets when the Script Doctor's per-analysis wall-clock
// budget stops a run (docs/CLAIMS_REGISTER.md row 72,
// server/lib/doctor-budget.ts's doctorAnalysisBudgetSentence). The
// parenthesised budget itself is deliberately NOT matched here — this step
// stubs the budget to 1 ms, so the deployment default (30s) would not appear;
// the wording either side of it is what the writer actually reads and what a
// copy edit must not silently drop.
const BUDGET_SENTENCE = "took longer to analyze than this server's per-analysis budget";

let serverProc = null;
let budgetServerProc = null;
let browser = null;
const genuineErrors = [];

async function main() {
  // Read the load-derived timing policy FIRST — before the server boots or
  // Chromium launches — so VERIFY_MAX_LOAD_PER_CPU can refuse the whole run
  // without paying for either. See scripts/lib/browser-verify.mjs.
  const timing = getTiming({ logPrefix: 'smoke' });

  // 1. Boot the server keyless on the isolated port, neutralizing inherited
  // provider configuration as well as Gemini's direct environment key.
  serverProc = await bootKeylessServer({
    repo: REPO,
    port: ISOLATED_PORT,
    baseUrl: BASE,
    logPrefix: 'smoke',
  });

  // 2. Drive the live flow with headless Chromium.
  browser = await launchChromium();
  const page = await browser.newPage();
  wireConsoleCapture(page, genuineErrors);

  // B-4/B-5/B-6 golden-path provenance guards (2026-09-05). Every POST to the
  // doctor's streaming route is counted here, before the first click, because
  // the two defects this gate now blocks are both invisible in the rendered
  // report: the sample used to be analysed TWICE (a second, unflagged run
  // fired from CoverageSummary's effect once `doctorAutoSample` flipped
  // false), and that second run's report carried `isSample: false` — which
  // planted the demo in the writer's real Draft History and unlocked
  // "Verify my rewrite" on a script that is not theirs. Counting requests and
  // reading localStorage is the only way to see either from the outside.
  const doctorStreamPosts = [];
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/scriptide/doctor/stream')) {
      doctorStreamPosts.push(req.url());
    }
  });

  console.log(`[smoke] loading ${BASE} ...`);
  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });

  // StartScreen → "Try sample coverage"
  const sampleCta = await page.getByRole('button', { name: /try sample coverage/i }).first();
  await sampleCta.click({ timeout: timing.ms(15000) });
  console.log('[smoke] clicked "Try sample coverage"; waiting for report...');

  // Wait for the report to RENDER, not for the route to answer — see
  // waitForRenderedText's comment in scripts/lib/browser-verify.mjs for the
  // SSE race this exists to defeat.
  const body = await waitForRenderedText(page, EXPECT.verdict);

  // 3. Assert the report rendered with expected verdict + health.
  const okVerdict = body.includes(EXPECT.verdict);
  const okHealth = body.includes(String(EXPECT.health));
  if (!okVerdict) throw new Error(`report did not render verdict "${EXPECT.verdict}"`);
  if (!okHealth) throw new Error(`report did not render health ~${EXPECT.health}`);
  console.log(`[smoke] report rendered: verdict=${EXPECT.verdict}, health~${EXPECT.health}.`);

  // 3b. The golden-path COLD-PANEL hole (2026-09-05, docs/audits mistake
  // hunt + provenance-review.md's "pre-existing hole"): clicking "Full
  // report" at the EARLIEST instant it exists in the DOM — while the
  // sample run kicked off by "Try sample coverage" is still in flight —
  // used to unmount CoverageSummary mid-flight before the sample was ever
  // installed, so ScriptDoctorPanel opened cold ("write some script
  // content"/"Try a sample script") with ZERO doctor POSTs ever
  // completing. Proven live to fail on the pre-fix tree
  // (/tmp/claude-0/.../scratchpad/reviews/provenance-review.md's prov4.mjs,
  // and this lane's own probe-earliest-click2.mjs before the fix: toggle
  // `disabled` read `false` at its earliest `attached` instant and the
  // click that followed opened a cold dialog with "Try a sample script").
  // Own page/context — must not share `page`'s doctorStreamPosts count or
  // Draft History checks below, which are about the ONE real run.
  const earlyContext = await browser.newContext();
  const earlyPage = await earlyContext.newPage();
  wireConsoleCapture(earlyPage, genuineErrors);
  await earlyPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  await earlyPage.getByRole('button', { name: /try sample coverage/i }).first().click({ timeout: timing.ms(15000) });
  // Round-2 review fix (2026-09-05, item 3): the toolbar toggle now carries
  // its OWN distinct accessible name ("Open full report", via `aria-label`)
  // apart from CoverageSummary's own sticky-footer "Full report" button —
  // both used to share the exact accessible name "Full report", which is
  // why this locator needed an `xpath=…not(ancestor::aside)` to disambiguate
  // before; a plain role+name query is now unambiguous.
  const earlyToggle = earlyPage.getByRole('button', { name: 'Open full report' }).first();
  await earlyToggle.waitFor({ state: 'attached', timeout: timing.ms(15000) });
  // Round-2 review fix (2026-09-05, item 2): the comment below justifying
  // `force: true` now has the assertion it always claimed to — the toggle
  // must measure `disabled: true` at this instant, not just fail to open a
  // dialog for some other reason (a slow click, a mis-targeted locator).
  const earlyDisabled = await earlyToggle.isDisabled();
  if (!earlyDisabled) {
    throw new Error(
      'golden-path regression: "Open full report" was NOT disabled at the earliest instant — a real '
      + '(non-force) click would reach it before the sample run resolves',
    );
  }
  // `force: true`: the point of this assertion is that the toggle must be
  // DISABLED (or otherwise a no-op) at this instant — proven directly above
  // via the disabled check — not that Playwright's own actionability wait
  // happens to stall long enough for the run to finish first.
  await earlyToggle.click({ force: true, timeout: timing.ms(5000) }).catch(() => { /* a genuinely disabled button can refuse the dispatch itself */ });
  await earlyPage.waitForTimeout(timing.ms(300));
  const earlyDialogCount = await earlyPage.locator('[role="dialog"]').count();
  if (earlyDialogCount > 0) {
    const earlyDialogText = (await earlyPage.locator('[role="dialog"]').first().innerText().catch(() => '')) ?? '';
    throw new Error(
      'golden-path cold-panel regression: clicking "Full report" at the earliest instant it exists opened '
      + `a dialog before the sample run resolved (text starts: ${JSON.stringify(earlyDialogText.slice(0, 120))})`,
    );
  }
  console.log('[smoke] earliest-instant "Full report" click did not cold-open the full report.');
  await earlyContext.close();

  // 3c. Round-2 review item 1 (BLOCKING, 2026-09-05): "Coverage is still
  // running…" used to stay on the toolbar toggle FOREVER after a Cancel,
  // because nothing cleared `doctorAutoSample` on that transition —
  // reproduced live by the reviewer, kept here as a permanent regression
  // gate. Fresh context: clicks "Try sample coverage" then clicks "Cancel
  // this coverage run" WHILE the run is still genuinely in flight. The
  // built-in sample analyses fast enough (well under a second, no LLM
  // calls) that a plain click-then-click race loses more often than it
  // wins — route-delays the real request so the window to click Cancel is
  // reliable, not a hope. The request is not stubbed (unlike 3d below): it
  // reaches the real server exactly as it would for a writer, just later
  // than it otherwise would, which only changes WHEN the response arrives,
  // never what CoverageSummary's own Cancel/abort logic does with it.
  const cancelContext = await browser.newContext();
  const cancelPage = await cancelContext.newPage();
  wireConsoleCapture(cancelPage, genuineErrors);
  await cancelPage.route('**/api/scriptide/doctor/stream', async (route) => {
    await new Promise((resolve) => { setTimeout(resolve, timing.ms(4000)); });
    await route.continue();
  });
  await cancelPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  await cancelPage.getByRole('button', { name: /try sample coverage/i }).first().click({ timeout: timing.ms(15000) });
  const cancelBtn = cancelPage.getByRole('button', { name: 'Cancel this coverage run' }).first();
  await cancelBtn.waitFor({ state: 'visible', timeout: timing.ms(10000) });
  await cancelBtn.click({ timeout: timing.ms(5000) });
  // Give the abort + the child's own status transition (loading -> idle) a
  // moment to reach the parent — the pre-fix bug was that this sentence
  // never clears, not that it takes a moment to clear, so polling here
  // would mask exactly the regression this step exists to catch. A single
  // read after a fixed settle window is the correct check.
  await cancelPage.waitForTimeout(timing.ms(800));
  const cancelToggle = cancelPage.getByRole('button', { name: 'Open full report' }).first();
  const cancelToggleTitle = await cancelToggle.getAttribute('title');
  const cancelToggleDisabled = await cancelToggle.isDisabled();
  if (cancelToggleTitle && /still running/i.test(cancelToggleTitle)) {
    throw new Error(
      'golden-path regression: after Cancelling a coverage run, the toolbar toggle still reads '
      + `"${cancelToggleTitle}" — a run that was cancelled is not "still running"`,
    );
  }
  console.log(
    `[smoke] after Cancel, "Open full report" toggle: disabled=${cancelToggleDisabled}, `
    + `title=${JSON.stringify(cancelToggleTitle)} (no longer claims to be "still running").`,
  );
  await cancelContext.close();

  // 3d. Round-2 review item 1 (BLOCKING, continued): the SAME "still
  // running" sentence used to survive a FAILED run too — two controls on
  // one screen contradicting each other (the panel says COVERAGE FAILED,
  // the toolbar says still running). Fresh context, route-stubbed:
  // intercepts POST /api/scriptide/doctor/stream and fulfills it with a 500
  // before the sample click ever fires the request.
  const errorContext = await browser.newContext();
  const errorPage = await errorContext.newPage();
  // This page's own sink, NOT `genuineErrors` — the route-stubbed 500 below
  // is a deliberate injected failure, not a genuine app-code error, and
  // Chrome logs its own "Failed to load resource: … 500" line for any
  // non-2xx response regardless of how gracefully the app handles it (this
  // one is handled gracefully — that's the whole point of this step). The
  // real-run steps above/below correctly still use the shared sink.
  const errorPageErrors = [];
  wireConsoleCapture(errorPage, errorPageErrors);
  await errorPage.route('**/api/scriptide/doctor/stream', (route) => {
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'boom' }),
    });
  });
  await errorPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  await errorPage.getByRole('button', { name: /try sample coverage/i }).first().click({ timeout: timing.ms(15000) });
  await errorPage.getByText(/coverage failed/i).first().waitFor({ timeout: timing.ms(15000) });
  const errorToggle = errorPage.getByRole('button', { name: 'Open full report' }).first();
  const errorToggleTitle = await errorToggle.getAttribute('title');
  const errorToggleDisabled = await errorToggle.isDisabled();
  if (errorToggleTitle && /still running/i.test(errorToggleTitle)) {
    throw new Error(
      'golden-path regression: after a FAILED coverage run, the toolbar toggle reads '
      + `"${errorToggleTitle}" while the panel itself says the run failed — two controls on one screen `
      + 'contradicting each other',
    );
  }
  if (!errorToggleDisabled || !errorToggleTitle || !/failed/i.test(errorToggleTitle)) {
    throw new Error(
      `golden-path regression: after a FAILED coverage run, expected the toolbar toggle disabled with a `
      + `"failed" sentence, got disabled=${errorToggleDisabled} title=${JSON.stringify(errorToggleTitle)}`,
    );
  }
  console.log(`[smoke] after a failed run, "Open full report" toggle: title=${JSON.stringify(errorToggleTitle)}.`);
  await errorContext.close();

  // 3e. Decision #7 (2026-09-06): the Script Doctor's per-analysis
  // wall-clock budget. A SECOND keyless server is booted with
  // DOCTOR_ANALYSIS_BUDGET_MS=1, which makes every analysis cross the budget
  // — the same branch a genuinely ~14 s draft would take on a 30 s
  // deployment, reached in milliseconds instead of by shipping a
  // 14-second fixture into a CI gate. A second server, not a route stub,
  // because the thing under test is the SERVER's behaviour: the pool
  // terminating the worker, the route framing the error, and the panel
  // rendering it — a stubbed response would prove only the last of those.
  //
  // Two assertions, and the second is the one that makes this a live check
  // rather than a string match: the writer must (a) read the honest,
  // registered sentence instead of a bare "Coverage failed", and (b) still
  // be able to get a report afterwards — the panel is not wedged, and the
  // tool works again the moment it is pointed at a server with the shipped
  // budget.
  const budgetPort = await pickFreePort();
  const budgetBase = `http://127.0.0.1:${budgetPort}`;
  budgetServerProc = await bootKeylessServer({
    repo: REPO,
    port: budgetPort,
    baseUrl: budgetBase,
    logPrefix: 'smoke-budget',
    extraEnv: { DOCTOR_ANALYSIS_BUDGET_MS: '1' },
  });
  const budgetContext = await browser.newContext();
  const budgetPage = await budgetContext.newPage();
  // This page's own sink: a deliberately stopped analysis is an injected
  // failure, not a genuine app-code error — the same separation step 3d
  // above makes for its injected 500.
  const budgetPageErrors = [];
  wireConsoleCapture(budgetPage, budgetPageErrors);
  await budgetPage.goto(budgetBase, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  await budgetPage.getByRole('button', { name: /try sample coverage/i }).first().click({ timeout: timing.ms(15000) });
  await budgetPage.getByText(/coverage failed/i).first().waitFor({ timeout: timing.ms(20000) });
  const budgetPanelText = (await budgetPage.textContent('body')) ?? '';
  if (!budgetPanelText.includes(BUDGET_SENTENCE)) {
    throw new Error(
      'per-analysis budget regression: a run stopped by the budget did not render the registered sentence '
      + `("${BUDGET_SENTENCE}") — the writer sees only a bare failure. Panel text around the failure: `
      + JSON.stringify(budgetPanelText.slice(Math.max(0, budgetPanelText.search(/coverage failed/i) - 40), 400)),
    );
  }
  const budgetRetry = budgetPage.getByRole('button', { name: /^retry$/i }).first();
  if ((await budgetRetry.count()) === 0 || (await budgetRetry.isDisabled())) {
    throw new Error('per-analysis budget regression: the panel offers no enabled Retry after a stopped run');
  }
  console.log(
    `[smoke] budget-stopped run renders the registered sentence, with an enabled Retry `
    + `(${budgetPageErrors.length} console error(s) on this page, expected for an injected failure).`,
  );

  // Recovery: the same browser, pointed at the server with the shipped
  // budget, still produces a real report.
  await budgetPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: timing.ms(20000) });
  await budgetPage.getByRole('button', { name: /try sample coverage/i }).first().click({ timeout: timing.ms(15000) });
  const recoveredBody = await waitForRenderedText(budgetPage, EXPECT.verdict, { timeoutMs: 30000 });
  if (!recoveredBody.includes(EXPECT.verdict)) {
    throw new Error(`per-analysis budget regression: no report after recovering from a stopped run (expected verdict "${EXPECT.verdict}")`);
  }
  console.log('[smoke] recovered after a budget-stopped run: report rendered against the shipped budget.');
  await budgetContext.close();
  await shutdown({ serverProc: budgetServerProc, graceMs: 500 });
  budgetServerProc = null;

  // 4. The golden path continues into the full report — the door 100% of
  // first-time writers use. Everything below is asserted on THAT panel.
  const fullReport = page.getByRole('button', { name: 'Full report', exact: true }).first();
  await fullReport.click({ timeout: timing.ms(15000) });
  await page.waitForSelector('[role="dialog"]', { timeout: timing.ms(15000) });
  // Returns the body whether or not the line appears; 4c below reports its absence.
  await waitForRenderedText(page, SAMPLE_NOT_RANKED, { timeoutMs: 20000 });
  await waitForDomQuiet(page, { quietMs: 400, timeoutMs: timing.ms(8000) });
  const panelText = (await page.textContent('body')) ?? '';

  // Every provenance assertion below is COLLECTED rather than thrown one at a
  // time: these failures share one root cause (a second, unflagged run of the
  // sample), and whoever debugs a red gate needs to see all of them in one
  // run, not peel them off one build at a time.
  const problems = [];

  // 4a. The demo must never be written into the writer's own Draft History.
  const storedHistory = await page.evaluate(() => {
    try {
      return localStorage.getItem('sm_doctor_history_v1');
    } catch {
      return 'ERR';
    }
  });
  const historyEntries = (() => {
    if (!storedHistory || storedHistory === 'ERR') return [];
    try {
      const parsed = JSON.parse(storedHistory);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();
  if (historyEntries.length !== 0) {
    problems.push(
      `the built-in sample was recorded into Draft History (sm_doctor_history_v1 holds ${historyEntries.length}: `
      + `${historyEntries.map((e) => `${e && e.title}@${e && e.health}`).join(', ')}) - it is a demo, not the writer's draft`,
    );
  } else {
    console.log('[smoke] Draft History is empty after the sample golden path (sm_doctor_history_v1 unset).');
  }

  // 4b. One analysis, not two.
  if (doctorStreamPosts.length !== 1) {
    problems.push(
      `the sample was analysed ${doctorStreamPosts.length} time(s) on the golden path; exactly 1 POST `
      + '/api/scriptide/doctor/stream is expected (a second run re-pays the whole 14-pass analysis and '
      + "overwrites the report's sample provenance)",
    );
  } else {
    console.log('[smoke] exactly one POST /api/scriptide/doctor/stream on the golden path.');
  }

  // 4c. The sample is never ranked among the writer's own drafts, and says so
  // rather than silently omitting the line.
  if (!panelText.includes(SAMPLE_NOT_RANKED)) {
    problems.push(`the sample report does not carry the honest draft-rank line ("${SAMPLE_NOT_RANKED}")`);
  }
  if (/Rank among your drafts:/.test(panelText)) {
    problems.push("the sample report ranks the demo among the writer's own drafts");
  }
  if (panelText.includes(SAMPLE_NOT_RANKED) && !/Rank among your drafts:/.test(panelText)) {
    console.log(`[smoke] draft-rank line on the sample: "${SAMPLE_NOT_RANKED}".`);
  }

  // 4d. "Verify my rewrite" is withheld on the sample from THIS entry point
  // too (the panel-loaded sample already withheld it; the threaded one did
  // not, because the guard read `uploadedFile`, which is null here).
  const verifyBtn = page.getByRole('button', { name: /verify my rewrite/i }).first();
  if ((await verifyBtn.count()) > 0) {
    if (!(await verifyBtn.isDisabled())) {
      problems.push('"Verify my rewrite" is offered on the built-in sample (StartScreen entry point)');
    } else if (!/built-in sample script, not your draft/.test(panelText)) {
      problems.push('"Verify my rewrite" is withheld on the sample without saying why');
    } else {
      console.log('[smoke] "Verify my rewrite" is withheld on the sample, with a reason.');
    }
  }

  if (problems.length > 0) {
    throw new Error(`${problems.length} golden-path provenance failure(s):\n  - ` + problems.join('\n  - '));
  }

  // 5. Console-error gate.
  if (genuineErrors.length > 0) {
    throw new Error(`${genuineErrors.length} genuine console error(s):\n  - ` + genuineErrors.slice(0, 5).join('\n  - '));
  }

  console.log('[smoke] PASS — live flow certified (keyless, zero genuine console errors).');
  console.log(`[smoke] commit: ${await gitSha()}`);
}

function gitSha() {
  return new Promise((resolve) => {
    const g = spawn('git', ['rev-parse', 'HEAD'], { cwd: REPO, stdio: ['ignore', 'pipe', 'ignore'] });
    let out = '';
    g.stdout.on('data', (d) => { out += d; });
    g.on('close', () => resolve(out.trim()));
  });
}

const teardown = async () => {
  await shutdown({ browser, serverProc, graceMs: 800 });
  // Step 3e's second server, if a failure landed before it was shut down.
  if (budgetServerProc) await shutdown({ serverProc: budgetServerProc, graceMs: 500 });
};

try {
  await main();
  await teardown();
  process.exit(0);
} catch (e) {
  console.error(`[smoke] FAIL — ${e.message}`);
  if (genuineErrors.length) console.error('[smoke] genuine errors captured:', genuineErrors);
  await teardown();
  process.exit(1);
}
