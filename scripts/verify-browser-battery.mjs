#!/usr/bin/env node
// verify-browser-battery.mjs — the shared runner behind `npm run
// verify:browser`. It used to be a plain `npm run a && npm run b && ...`
// chain in package.json; that's still exactly what it does by default (see
// below), but it is now a real script so it can offer one thing a shell `&&`
// chain cannot: an opt-in, human-invoked retry for a suite that fails on a
// loaded machine.
//
// USAGE: node scripts/verify-browser-battery.mjs [--retry-flaky N] <suite>...
// `<suite>...` are npm script names (e.g. `verify:p0-flow`), run via `npm
// run <suite>` in the order given — exactly the suites `verify:browser`
// lists in package.json, in the same order the old `&&` chain ran them.
//
// DEFAULT (`--retry-flaky` omitted -> N=0, what `npm run verify:browser`
// itself passes): each suite runs exactly once, in order. The first failure
// stops the battery immediately with that suite's own exit code — bit-for-
// bit the same semantics `&&` gave, because CI must see the same thing it
// always has (tests/core/ci-gates-intact.test.ts pins CI's step to `npm run
// verify:browser` with no flag, and this file does not change what that
// invocation does).
//
// `--retry-flaky N` (N>0, for a human re-running the battery on a machine
// under load, never CI): a suite that fails is re-run ALONE — no other
// suite runs while a retry is in flight — up to N more times. If a retry
// passes, the suite's outcome is reported as `flaky-pass`, NEVER as a plain
// `pass` — a suite that only survives on a second try is real information,
// not noise to swallow, and scripts/lib/browser-verify.mjs's load-scaled
// timeouts should mean this path is rarely hit; if it fires often anyway,
// that's a real suite bug to fix (base values, not this runner). BOTH the
// failing attempt's and the passing retry's full combined stdout+stderr are
// kept, under scripts/output/flaky-retries/ (gitignored, like the rest of
// scripts/output/) — the summary line names both files.
//
// A suite that still fails after using up its retries stops the battery,
// same as the N=0 path — retries buy a suite more chances, not a license to
// keep going past a suite that's genuinely broken.
//
// Exit codes: 0 = every suite passed (straight or flaky-pass). Non-zero =
// the exit code the first suite returned once it had used up its retries
// (or, at N=0, its one and only attempt).

import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const REPO = process.cwd();

function parseArgs(argv) {
  let retryFlaky = 0;
  const suites = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    let raw;
    if (arg === '--retry-flaky') {
      raw = argv[++i];
    } else if (arg.startsWith('--retry-flaky=')) {
      raw = arg.slice('--retry-flaky='.length);
    } else {
      suites.push(arg);
      continue;
    }
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 0) {
      console.error(`[verify-battery] --retry-flaky needs a non-negative integer, got ${JSON.stringify(raw)}`);
      process.exit(2);
    }
    retryFlaky = n;
  }
  return { retryFlaky, suites };
}

/** Runs one `npm run <suite>` to completion. Captures its combined
 *  stdout+stderr (so a failing/retry attempt's log can be kept to a file)
 *  while ALSO forwarding it live to this process's own stdout/stderr — a
 *  caller watching the run sees exactly what the old `&&` chain showed. */
function runSuiteOnce(suite) {
  return new Promise((resolve) => {
    let log = '';
    const child = spawn('npm', ['run', suite], { cwd: REPO, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', (d) => { log += d; process.stdout.write(d); });
    child.stderr.on('data', (d) => { log += d; process.stderr.write(d); });
    child.on('error', (err) => resolve({ code: 1, log: log + `\n[verify-battery] failed to spawn: ${err.message}\n` }));
    child.on('close', (code) => resolve({ code: code ?? 1, log }));
  });
}

function saveLog(suite, attempt, log) {
  const dir = join(REPO, 'scripts', 'output', 'flaky-retries');
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${suite.replace(/[:/]/g, '-')}-attempt${attempt}-${Date.now()}.log`);
  writeFileSync(file, log);
  return file;
}

const { retryFlaky, suites } = parseArgs(process.argv.slice(2));
if (suites.length === 0) {
  console.error('[verify-battery] no suites named on argv — nothing to run. Usage: node scripts/verify-browser-battery.mjs [--retry-flaky N] <suite>...');
  process.exit(2);
}

console.log(`[verify-battery] running ${suites.length} suite(s), --retry-flaky ${retryFlaky}`);

const outcomes = [];
let exitCode = 0;

for (const suite of suites) {
  console.log(`\n${'─'.repeat(72)}\n[verify-battery] ${suite} — attempt 1/${retryFlaky + 1}\n${'─'.repeat(72)}`);
  let attempt = 1;
  let result = await runSuiteOnce(suite);

  if (result.code === 0) {
    console.log(`[verify-battery] ${suite}: pass`);
    outcomes.push({ suite, status: 'pass', attempts: 1 });
    continue;
  }

  if (retryFlaky <= 0) {
    console.error(`[verify-battery] ${suite}: FAIL (exit ${result.code})`);
    outcomes.push({ suite, status: 'fail', attempts: 1 });
    exitCode = result.code;
    break;
  }

  const firstLogFile = saveLog(suite, attempt, result.log);
  let lastLogFile = firstLogFile;
  while (result.code !== 0 && attempt <= retryFlaky) {
    attempt += 1;
    console.log(`\n[verify-battery] ${suite} FAILED on attempt ${attempt - 1} — retrying ALONE (attempt ${attempt}/${retryFlaky + 1})`);
    result = await runSuiteOnce(suite);
    lastLogFile = saveLog(suite, attempt, result.log);
  }

  if (result.code === 0) {
    console.log(`[verify-battery] ${suite}: flaky-pass (failed attempt 1, passed attempt ${attempt}) — logs kept: ${firstLogFile} , ${lastLogFile}`);
    outcomes.push({ suite, status: 'flaky-pass', attempts: attempt });
    continue;
  }

  console.error(`[verify-battery] ${suite}: FAIL after ${attempt} attempts — logs kept: ${firstLogFile} , ${lastLogFile}`);
  outcomes.push({ suite, status: 'fail', attempts: attempt });
  exitCode = result.code;
  break;
}

console.log(`\n${'='.repeat(72)}\n[verify-battery] summary:`);
for (const o of outcomes) {
  console.log(`  ${o.status.toUpperCase().padEnd(10)} ${o.suite}${o.attempts > 1 ? ` (attempts: ${o.attempts})` : ''}`);
}
console.log('='.repeat(72));

process.exit(exitCode);
