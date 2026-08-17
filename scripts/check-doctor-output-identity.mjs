#!/usr/bin/env node
// Doctor output-identity harness (lane W2, 2026-08-21).
//
// WHY THIS EXISTS. The W2 perf work is a PURE performance change: it must not
// move a single number, string, or array element in any ScriptDoctorReport.
// "Pure" is a claim, and the project's rule is that claims are measured, not
// asserted — but a measurement RECEIPT is the wrong instrument here, because a
// receipt records a discrimination statistic and a statistic can stay
// identical while individual reports drift. The right instrument for a pure
// refactor is a byte-level identity proof over every fixture the repo owns.
//
// WHAT IT DOES. Runs runScriptDoctor over the full deterministic fixture set —
//   * all 20 data/screenplays/*.fountain live-action fixtures,
//   * all 20 calibration REFERENCE_CORPUS samples
//     (server/nvm/analyze/calibration/corpus.ts),
//   * the P0 sample script (src/lib/sample-script.ts),
//   * the nonlinear-timeline fixtures under tests/fixtures/ if present,
// — in the tree given by --tree, and writes one canonical JSON snapshot per
// fixture to --out. `analyzedAt` is the only field stripped: it is a wall-clock
// stamp the doctor deliberately refreshes on every call (including cache hits),
// so it is noise by construction and nothing else in the report depends on it.
//
// Run it against a pristine baseline checkout and against the working tree,
// then diff the two snapshot directories. Any difference at all means the
// change under test is NOT pure and must be fixed or dropped.
//
// PICK THE BASELINE CAREFULLY. It must be the branch you are MERGING INTO,
// not the commit you branched FROM. If the target branch moved while the work
// was in flight, a snapshot of the old fork point mixes other people's report
// changes into the diff and the harness reports differences that have nothing
// to do with the change under test — which is worse than no proof, because it
// looks like one.
//
//   git archive origin/main | tar -x -C /tmp/baseline
//   ln -s "$PWD/node_modules" /tmp/baseline/node_modules
//   node scripts/check-doctor-output-identity.mjs --tree /tmp/baseline --out /tmp/before
//   node scripts/check-doctor-output-identity.mjs --tree .          --out /tmp/after
//   node scripts/check-doctor-output-identity.mjs --compare /tmp/before /tmp/after
//
// Deliberately NOT a test file: it needs two checkouts of the repo to be
// meaningful, which `npm test` cannot provide. The permanent regression guard
// that DOES live in CI is tests/core/doctor-perf-budget.test.ts (runtime) plus
// the existing report-shape suites (content).

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

/** Stable stringify: sorts object keys so key-insertion order (which is NOT
 *  part of the report's meaning) can't produce a false difference, while array
 *  order (which very much IS part of it) is preserved exactly. */
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canonical(value[key]);
    return out;
  }
  // JSON has no -0, NaN, or Infinity; surface them rather than silently
  // normalizing a real numeric difference away.
  if (typeof value === 'number' && !Number.isFinite(value)) return `#nonfinite:${String(value)}`;
  if (Object.is(value, -0)) return '#negzero';
  return value;
}

async function snapshotTree(treeArg, outDir) {
  const tree = path.resolve(treeArg);
  const load = (rel) => import(pathToFileURL(path.join(tree, rel)).href);

  const { runScriptDoctor, clearDoctorCache } = await load('server/nvm/analyze/doctor.ts');
  const { REFERENCE_CORPUS } = await load('server/nvm/analyze/calibration/corpus.ts');
  const { fountain: sampleFountain } = await load('src/lib/sample-script.ts');

  /** @type {Array<{ name: string, fountain: string }>} */
  const fixtures = [];

  const screenplayDir = path.join(tree, 'data/screenplays');
  if (existsSync(screenplayDir)) {
    for (const file of readdirSync(screenplayDir).filter(f => f.endsWith('.fountain')).sort()) {
      fixtures.push({
        name: `screenplay/${file}`,
        fountain: readFileSync(path.join(screenplayDir, file), 'utf8'),
      });
    }
  }

  for (const sample of REFERENCE_CORPUS) {
    fixtures.push({ name: `calibration/${sample.label}`, fountain: sample.fountain });
  }

  fixtures.push({ name: 'p0/sample-script', fountain: sampleFountain });

  const fixtureDir = path.join(tree, 'tests/fixtures');
  if (existsSync(fixtureDir)) {
    for (const file of readdirSync(fixtureDir).filter(f => f.endsWith('.fountain')).sort()) {
      fixtures.push({
        name: `fixture/${file}`,
        fountain: readFileSync(path.join(fixtureDir, file), 'utf8'),
      });
    }
  }

  // Synthetic concatenations at the scene counts the W2 profile measured, so
  // the identity proof covers the SCALE where the optimized code paths (the
  // universal-relation fast path, the bit-packed matrix) actually engage —
  // every real fixture above is under ~20 scenes.
  const bodies = fixtures
    .filter(f => f.name.startsWith('screenplay/'))
    .map(f => f.fountain.trim());
  const sceneCountOf = (t) => (t.match(/^(INT\.|EXT\.|INT\/EXT|EXT\/INT|I\/E)/gm) || []).length;
  for (const target of [60, 120, 240, 300]) {
    const parts = [];
    let total = 0;
    let i = 0;
    let repeat = 0;
    while (total < target && bodies.length > 0) {
      const idx = i % bodies.length;
      if (i > 0 && idx === 0) repeat++;
      const body = repeat > 0
        ? bodies[idx].replace(/^(INT\.|EXT\.)(.*)$/gm, (_m, a, b) => `${a}${b} [${repeat}]`)
        : bodies[idx];
      parts.push(body);
      total += sceneCountOf(bodies[idx]);
      i++;
    }
    fixtures.push({ name: `synthetic/${target}-scenes`, fountain: parts.join('\n\n') });
  }

  mkdirSync(outDir, { recursive: true });
  const index = [];
  for (const fixture of fixtures) {
    clearDoctorCache();
    const started = process.hrtime.bigint();
    const report = await runScriptDoctor(fixture.fountain);
    const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;
    const { analyzedAt: _ignored, ...stable } = report;
    const json = JSON.stringify(canonical(stable), null, 2);
    const safe = fixture.name.replace(/[^A-Za-z0-9._-]+/g, '__');
    writeFileSync(path.join(outDir, `${safe}.json`), json, 'utf8');
    index.push({
      name: fixture.name,
      sha256: createHash('sha256').update(json).digest('hex'),
      bytes: Buffer.byteLength(json, 'utf8'),
      sceneCount: report.sceneCount,
      elapsedMs: Math.round(elapsedMs),
    });
    process.stdout.write(
      `  ${fixture.name.padEnd(42)} scenes=${String(report.sceneCount).padStart(4)} ` +
      `${String(Math.round(elapsedMs)).padStart(7)}ms\n`,
    );
  }
  writeFileSync(
    path.join(outDir, '_index.json'),
    JSON.stringify(index.map(({ elapsedMs: _e, ...rest }) => rest), null, 2),
    'utf8',
  );
  writeFileSync(path.join(outDir, '_timings.json'), JSON.stringify(index, null, 2), 'utf8');
  process.stdout.write(`\nWrote ${index.length} report snapshots to ${outDir}\n`);
}

function compare(beforeDir, afterDir) {
  const read = (dir) => JSON.parse(readFileSync(path.join(dir, '_index.json'), 'utf8'));
  const before = read(beforeDir);
  const after = read(afterDir);
  const byName = new Map(before.map(e => [e.name, e]));
  let differences = 0;

  for (const entry of after) {
    const base = byName.get(entry.name);
    if (!base) {
      process.stdout.write(`  + ${entry.name} (present only after)\n`);
      differences++;
      continue;
    }
    byName.delete(entry.name);
    if (base.sha256 !== entry.sha256) {
      differences++;
      const safe = entry.name.replace(/[^A-Za-z0-9._-]+/g, '__');
      const a = readFileSync(path.join(beforeDir, `${safe}.json`), 'utf8').split('\n');
      const b = readFileSync(path.join(afterDir, `${safe}.json`), 'utf8').split('\n');
      process.stdout.write(`  ! ${entry.name}: report differs\n`);
      let shown = 0;
      for (let i = 0; i < Math.max(a.length, b.length) && shown < 6; i++) {
        if (a[i] !== b[i]) {
          process.stdout.write(`      line ${i + 1}\n        before: ${a[i] ?? '<eof>'}\n        after:  ${b[i] ?? '<eof>'}\n`);
          shown++;
        }
      }
    }
  }
  for (const missing of byName.keys()) {
    process.stdout.write(`  - ${missing} (present only before)\n`);
    differences++;
  }

  if (differences === 0) {
    process.stdout.write(
      `\nOUTPUT IDENTITY: PASS — all ${after.length} reports are byte-identical ` +
      `(analyzedAt excluded).\n`,
    );
    return 0;
  }
  process.stdout.write(`\nOUTPUT IDENTITY: FAIL — ${differences} fixture(s) differ.\n`);
  return 1;
}

const compareArg = args.indexOf('--compare');
if (compareArg >= 0) {
  process.exit(compare(args[compareArg + 1], args[compareArg + 2]));
} else {
  const tree = flag('--tree') ?? '.';
  const out = flag('--out');
  if (!out) {
    process.stderr.write('usage: check-doctor-output-identity.mjs --tree <dir> --out <dir>\n');
    process.stderr.write('       check-doctor-output-identity.mjs --compare <beforeDir> <afterDir>\n');
    process.exit(2);
  }
  if (existsSync(out)) rmSync(out, { recursive: true, force: true });
  await snapshotTree(tree, out);
}
