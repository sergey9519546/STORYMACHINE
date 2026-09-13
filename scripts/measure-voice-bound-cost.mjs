#!/usr/bin/env node
// Calibrate MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT (server/lib/validation.ts) on
// the machine that is running this script — and say which machine that was.
//
// WHY THIS SCRIPT EXISTS
// ----------------------
// The bound is "the largest cast the Fountain shape guard will admit whose
// worst-case analysis still costs less than half the per-analysis budget". It
// was derived on 2026-09-12 from timings taken on an unnamed developer box
// (`server/lib/validation.ts`'s own comment says "this box"), and the
// derivation's own assertion — CPU under DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS / 2
// for the worst admitted shape — is enforced on every CI run, on a GitHub
// Actions runner nobody had measured. On 2026-09-13 the first real Actions run
// since 2026-09-02 (run 34736306670, attempt 2, ubuntu-latest) measured that
// shape at 19,713 ms of CPU against the 15,000 ms target and failed. The bound
// was not wrong about its own box; the record simply never said which box, and
// the box that enforces a bound is the one it has to hold on.
//
// So: this script measures the real `runScriptDoctor` cost of both shapes the
// bound is derived against, prints a markdown table with the machine stamped on
// it, and (with --json) writes the table that
// tests/fixtures/voice-bound-derivation.json is locked from. Run it under
// .github/workflows/calibrate-voice-bound.yml to get the runner's numbers.
//
// WHAT IT MEASURES, AND WHY TWICE
// -------------------------------
// The failing assertion does not run on an idle runner. It runs inside
// `npm test`, which is `node --test` over ~90 files at
// os.availableParallelism() - 1 concurrency. CPU time is immune to a busy box
// in the sense that another process's cycles are not billed to this one — but
// it is NOT immune to sharing a memory system and an SMT sibling with three
// other Node processes, and the doctor is allocation-heavy. So the sweep runs
// in two conditions and the table reports both:
//
//   idle    — nothing else of ours running.
//   loaded  — (parallelism - 1) CPU-bound sibling processes spinning for the
//             duration of each measurement, the same company the assertion
//             actually keeps under `npm test`.
//
// Derive from `loaded`. `idle` is there so the inflation factor is visible
// rather than assumed.
//
// MEASUREMENT HYGIENE
// -------------------
//   * One child process per measurement. The doctor memoizes on contentHash,
//     so a repeated identical payload in one process reads 0 ms (the 2026-09-12
//     reviewer hit this trap and said so); a fresh process also keeps one
//     measurement's heap out of the next one's GC.
//   * The guard is not consulted before measuring — the point is to measure
//     shapes on BOTH sides of the bound, including ones the guard rejects. The
//     guard's verdict for each row is reported alongside, so the table shows
//     where the current bound sits relative to what was measured.
//   * CPU is process.cpuUsage() deltas around the single runScriptDoctor call
//     (user + system), the exact quantity the security suite asserts. Wall is
//     reported too, because the product guarantee is wall-clock.
//
// USAGE
//   node --experimental-strip-types scripts/measure-voice-bound-cost.mjs
//   node --experimental-strip-types scripts/measure-voice-bound-cost.mjs \
//        --uniform-min=150 --max-admitted=60,80 --probe-cast=20,40 --repeats=3 \
//        --conditions=idle,loaded --json=tests/fixtures/voice-bound-derivation.json
//   --json=-  prints the lock file to stdout instead of writing it (how the
//             runner's table gets out of a CI log and into the repository).
//
// This script has no side effects beyond stdout unless --json is passed, and it
// is not scoring-path: it only generates text and times an existing analyzer.

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { machineFingerprint, formatMachineFingerprint } from './lib/machine-fingerprint.ts';
import { VOICE_BOUND_SHAPES, deriveCast, DERIVATION_MARGIN_FRACTION } from './lib/voice-bound.ts';

const HERE = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(HERE), '..');

/** Defaults: a grid fine enough to resolve the boundary at 10-cast steps over
 *  the whole range any plausible machine could land in, plus the realistic
 *  ensembles the bound must keep accepting (finding 10's own targets, the
 *  largest few-big cast the 2026-09-12 bound admitted at 44, and the 60 it
 *  newly rejected). */
const DEFAULT_UNIFORM_MIN = [150];
const DEFAULT_MAX_ADMITTED = [50, 60, 65, 70, 75, 80, 85, 90, 100];
const DEFAULT_PROBE_CAST = [20, 30, 40, 44];

function parseArgs(argv) {
  const opts = {
    uniformMin: DEFAULT_UNIFORM_MIN,
    maxAdmitted: DEFAULT_MAX_ADMITTED,
    probeCast: DEFAULT_PROBE_CAST,
    repeats: 2,
    conditions: ['idle', 'loaded'],
    json: null,
    child: null,
    lockFrom: null,
  };
  for (const arg of argv) {
    const [key, rawValue] = arg.startsWith('--') ? arg.slice(2).split('=') : [arg, undefined];
    const list = () => (rawValue ?? '').split(',').map((v) => Number(v.trim())).filter((n) => Number.isFinite(n) && n > 0);
    switch (key) {
      case 'uniform-min': opts.uniformMin = list(); break;
      case 'max-admitted': opts.maxAdmitted = list(); break;
      case 'probe-cast': opts.probeCast = list(); break;
      case 'repeats': opts.repeats = Math.max(1, Number(rawValue) || 1); break;
      case 'conditions': opts.conditions = (rawValue ?? '').split(',').map((c) => c.trim()).filter(Boolean); break;
      case 'json': opts.json = rawValue ?? ''; break;
      case 'measure': opts.child = rawValue ?? ''; break;
      case 'lock-from': opts.lockFrom = rawValue ?? ''; break;
      case 'help': opts.help = true; break;
      default:
        throw new Error(`unknown argument "${arg}" — see this file's USAGE header`);
    }
  }
  for (const c of opts.conditions) {
    if (c !== 'idle' && c !== 'loaded') throw new Error(`unknown condition "${c}" (expected idle or loaded)`);
  }
  return opts;
}

// ── child mode: one measurement, one JSON line ─────────────────────────────
// Kept in this same file (rather than a second script) so there is exactly one
// definition of what "the cost of shape X at N" means.
async function runChildMeasurement(spec) {
  const [shape, nRaw] = spec.split(':');
  const n = Number(nRaw);
  const build = VOICE_BOUND_SHAPES[shape];
  if (!build) throw new Error(`unknown shape "${shape}"`);
  const { runScriptDoctor } = await import('../server/nvm/analyze/doctor.ts');
  const { fountainShapeRejectionReason, realVoiceWordCountsForMeasurement, MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT } =
    await import('../server/lib/validation.ts');

  // The max-admitted shape is defined RELATIVE to the weight bound (it carries
  // as many words as that bound still allows at this cast), so the builder is
  // handed the live constant rather than a copy.
  const text = build(n, MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT);
  // The guard's OWN counts, from the production path — not a second
  // implementation, and not the retired legacy view, which disagrees with
  // production on documents this sweep deliberately builds.
  const eligible = realVoiceWordCountsForMeasurement(text);
  const pooledWords = [...eligible.values()].filter((w) => w > 0).reduce((a, b) => a + b, 0);
  const distinct = [...eligible.values()].filter((w) => w > 0).length;
  const reason = fountainShapeRejectionReason(text);

  const cpuStart = process.cpuUsage();
  const wallStart = Date.now();
  await runScriptDoctor(text);
  const wallMs = Date.now() - wallStart;
  const cpu = process.cpuUsage(cpuStart);

  process.stdout.write(`${JSON.stringify({
    shape,
    n,
    bytes: text.length,
    distinct,
    pooledWords,
    weight: distinct * pooledWords,
    guard: reason === null ? 'ACCEPT' : 'REJECT',
    guardReason: reason,
    cpuMs: Math.round((cpu.user + cpu.system) / 1000),
    wallMs,
  })}\n`);
}

// ── parent mode ────────────────────────────────────────────────────────────

/** A CPU-bound sibling, standing in for one of the other `node --test` file
 *  processes the real assertion shares the machine with. */
function spawnSpinner() {
  return spawn(process.execPath, ['-e', 'for(;;){Math.sqrt(Math.random());}'], {
    stdio: 'ignore',
    detached: false,
  });
}

function measureOnce(spec) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['--experimental-strip-types', '--no-warnings', HERE, `--measure=${spec}`],
      { cwd: REPO_ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let out = '', err = '';
    child.stdout.on('data', (d) => { out += d; });
    child.stderr.on('data', (d) => { err += d; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`measurement ${spec} exited ${code}\n${err}`));
      const line = out.trim().split('\n').filter(Boolean).pop();
      if (!line) return reject(new Error(`measurement ${spec} produced no result\n${err}`));
      try { resolve(JSON.parse(line)); } catch (e) { reject(new Error(`measurement ${spec}: ${e.message}\n${out}`)); }
    });
  });
}

function median(values) {
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

async function sweep(opts, condition, log) {
  const spinners = [];
  if (condition === 'loaded') {
    const siblings = Math.max(1, (os.availableParallelism?.() ?? os.cpus().length) - 1);
    log(`  starting ${siblings} CPU-bound sibling process(es) for the loaded sweep`);
    for (let i = 0; i < siblings; i++) spinners.push(spawnSpinner());
  }
  try {
    const specs = [
      ...opts.maxAdmitted.map((n) => `max-admitted:${n}`),
      ...opts.uniformMin.map((n) => `uniform-min:${n}`),
      ...opts.probeCast.map((n) => `probe-cast:${n}`),
    ];
    const rows = [];
    for (const spec of specs) {
      const samples = [];
      for (let r = 0; r < opts.repeats; r++) samples.push(await measureOnce(spec));
      const first = samples[0];
      // Deliberately NOT `...first`: the per-measurement `cpuMs`/`wallMs` of an
      // arbitrary sample next to the aggregates invites reading the wrong
      // number. Only the shape's identity is carried over; the timings are the
      // full sample list plus its median and max.
      rows.push({
        shape: first.shape,
        n: first.n,
        bytes: first.bytes,
        distinct: first.distinct,
        pooledWords: first.pooledWords,
        weight: first.weight,
        guard: first.guard,
        condition,
        repeats: samples.length,
        cpuMsSamples: samples.map((s) => s.cpuMs),
        wallMsSamples: samples.map((s) => s.wallMs),
        cpuMsMedian: median(samples.map((s) => s.cpuMs)),
        cpuMsMax: Math.max(...samples.map((s) => s.cpuMs)),
        wallMsMedian: median(samples.map((s) => s.wallMs)),
        wallMsMax: Math.max(...samples.map((s) => s.wallMs)),
      });
      log(`  ${spec.padEnd(18)} ${condition.padEnd(6)} cpu ${rows.at(-1).cpuMsSamples.join('/')} ms  wall ${rows.at(-1).wallMsSamples.join('/')} ms  guard ${first.guard}`);
    }
    return rows;
  } finally {
    // Kill by handle, never by name or pattern — other agents share this box.
    for (const s of spinners) s.kill('SIGKILL');
  }
}

function markdownTable(rows, budgetMs) {
  const head = '| shape | N | distinct | pooled words | weight | guard | CPU ms (samples) | CPU median | CPU max | wall median | % of half-budget (max) |';
  const sep = '|---|---|---|---|---|---|---|---|---|---|---|';
  const body = rows.map((r) => {
    const pct = ((r.cpuMsMax / (budgetMs / 2)) * 100).toFixed(0);
    return `| ${r.shape} | ${r.n} | ${r.distinct} | ${r.pooledWords.toLocaleString('en-US')} | ${r.weight.toLocaleString('en-US')} | ${r.guard} | ${r.cpuMsSamples.join(' / ')} | ${r.cpuMsMedian} | ${r.cpuMsMax} | ${r.wallMsMedian} | ${pct}% |`;
  });
  return [head, sep, ...body].join('\n');
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    process.stdout.write('See this file\'s USAGE header.\n');
    return;
  }
  if (opts.child !== null) return runChildMeasurement(opts.child);
  if (opts.lockFrom) {
    // Re-indent a lock file copied out of a CI log. Pure formatting: it parses
    // the file and writes the same object back with two-space indentation, so a
    // copied line becomes a reviewable diff.
    const target = path.resolve(REPO_ROOT, opts.lockFrom);
    const parsed = JSON.parse(readFileSync(target, 'utf8'));
    writeFileSync(target, `${JSON.stringify(parsed, null, 2)}\n`);
    process.stderr.write(`re-indented ${path.relative(REPO_ROOT, target)}\n`);
    return;
  }

  const { DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS } = await import('../server/lib/doctor-budget.ts');
  const { MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT } = await import('../server/lib/validation.ts');
  const machine = machineFingerprint();
  const log = (line) => process.stderr.write(`${line}\n`);

  log(`machine: ${formatMachineFingerprint(machine)}`);
  log(`budget: ${DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS} ms, half-budget target ${DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS / 2} ms`);
  log(`current bound: ${MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT}`);

  const byCondition = {};
  for (const condition of opts.conditions) {
    log(`sweeping (${condition})…`);
    byCondition[condition] = await sweep(opts, condition, log);
  }

  const lines = [];
  lines.push('## Voice-bound calibration');
  lines.push('');
  lines.push(`- machine: \`${formatMachineFingerprint(machine)}\``);
  lines.push(`- date (UTC): \`${new Date().toISOString()}\``);
  lines.push(`- analysis budget: \`${DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS}\` ms — half-budget target \`${DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS / 2}\` ms`);
  lines.push(`- bound in this tree: \`MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT = ${MAX_FOUNTAIN_VOICE_ELIGIBLE_WEIGHT}\``);
  lines.push(`- repeats per row: ${opts.repeats}`);
  lines.push('');
  for (const condition of opts.conditions) {
    lines.push(`### ${condition}`);
    lines.push('');
    lines.push(markdownTable(byCondition[condition], DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS));
    lines.push('');
    const d = deriveCast(byCondition[condition], DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS);
    lines.push(
      d.derivedCast === null
        ? `Derivation (${condition}): NO swept ${d.shape} cast clears ${d.ceilingMs} ms (half-budget less a ${(d.marginFraction * 100).toFixed(0)}% margin) — sweep lower.`
        : `Derivation (${condition}): largest ${d.shape} cast whose worst CPU sample stays at or under `
          + `${d.ceilingMs} ms (half-budget ${d.targetMs} ms less a ${(d.marginFraction * 100).toFixed(0)}% margin) is `
          + `**${d.derivedCast}** at ${d.derivedCpuMsMax} ms — the value MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT takes.`,
    );
    lines.push('');
  }
  process.stdout.write(`${lines.join('\n')}\n`);

  if (opts.json) {
    const primary = opts.conditions.includes('loaded') ? 'loaded' : opts.conditions[0];
    const payload = {
      _comment:
        'Locked by `node --experimental-strip-types scripts/measure-voice-bound-cost.mjs --json=…`. '
        + 'tests/core/voice-bound-derivation.test.ts re-derives MAX_FOUNTAIN_VOICE_ELIGIBLE_DISTINCT from these rows; '
        + 'editing the constant without a fresh table fails that test.',
      generatedAt: new Date().toISOString(),
      machine,
      budgetMs: DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS,
      marginFraction: DERIVATION_MARGIN_FRACTION,
      primaryCondition: primary,
      repeats: opts.repeats,
      conditions: Object.fromEntries(
        Object.entries(byCondition).map(([c, rows]) => [
          c,
          rows.map((row) => row),
        ]),
      ),
      derivation: deriveCast(byCondition[primary], DOCTOR_ANALYSIS_BUDGET_DEFAULT_MS),
    };
    const serialized = `${JSON.stringify(payload, null, 2)}\n`;
    if (opts.json === '-') {
      // `--json=-` prints the lock file to stdout instead of writing it. This
      // is how a runner's table reaches the repository: the sandbox that edits
      // the bound cannot run on a GitHub runner, and this workflow uploads no
      // artifacts, so the lock file has to be copyable verbatim out of the log.
      // COMPACT, on one line, deliberately: a CI log viewer stamps every line
      // with a timestamp, so a pretty-printed 900-line object cannot be copied
      // back out without stripping 900 prefixes by hand — which is a
      // transcription, which is the thing this flag exists to avoid.
      // `npm run measure-voice-bound -- --lock-from=<file>` re-indents it.
      process.stdout.write('\nLOCK-FILE (copy the single line below verbatim into tests/fixtures/voice-bound-derivation.json, then `npm run measure-voice-bound -- --lock-from=tests/fixtures/voice-bound-derivation.json` to re-indent it):\n');
      process.stdout.write(`${JSON.stringify(payload)}\n`);
    } else {
      const out = path.resolve(REPO_ROOT, opts.json);
      mkdirSync(path.dirname(out), { recursive: true });
      writeFileSync(out, serialized);
      log(`wrote ${path.relative(REPO_ROOT, out)}`);
    }
  }
}

await main();
