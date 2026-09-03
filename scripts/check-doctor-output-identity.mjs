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
// ---------------------------------------------------------------------------
// --ignore-keys <comma list> / --require-added <comma list>  (added 2026-09-03)
// ---------------------------------------------------------------------------
// A pure-performance change proves FULL byte identity (the plain --compare
// above). An ADDITIVE schema change — a new report field nothing previously
// depended on — cannot prove that (every fixture's JSON necessarily gains
// bytes), but it CAN prove the strictly weaker, still falsifiable claim
// "identity modulo the keys I am deliberately adding/changing": every OTHER
// byte in every report is unchanged, and the listed keys behave exactly as
// claimed.
//
//   --ignore-keys a,b,c        top-level report keys (dotted paths like
//                              `provenance.structuralReliabilityNote` are
//                              supported too — cheap plain-object nesting
//                              only, not a general JSON Pointer) excluded
//                              from the identity check. The compare still
//                              PRINTS, per ignored key, how many of the N
//                              compared reports actually differ in that key —
//                              an ignore list is a claim ("only these moved"),
//                              and the count is what makes the claim
//                              falsifiable rather than a place to hide an
//                              unrelated regression. Every byte outside the
//                              ignored keys must still be identical or the
//                              compare FAILS.
//
//   --require-added x,y        the compare FAILS unless every listed key is
//                              present in every AFTER report and ABSENT from
//                              every BEFORE report. This is what stops
//                              --ignore-keys from being used to launder a
//                              removed or reshaped field as a "no-op" diff —
//                              an ignored key must actually be a clean
//                              addition, not a field that quietly changed
//                              shape or disappeared.
//
// Typical additive-schema run:
//   node scripts/check-doctor-output-identity.mjs --compare before after \
//     --ignore-keys provenance,plainSummary --require-added provenance
//
// Deliberately NOT a test file in its --tree/--out form: it needs two
// checkouts of the repo to be meaningful, which `npm test` cannot provide.
// The permanent regression guard that DOES live in CI is
// tests/core/doctor-perf-budget.test.ts (runtime) plus the existing
// report-shape suites (content). The --compare comparison LOGIC (the ignore/
// require-added semantics above) is pure and IS unit-tested, against small
// synthetic snapshot dirs, in tests/scripts/check-doctor-output-identity.test.ts.

import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL, fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
function flag(name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

/** "a, b ,c" -> ['a','b','c']; undefined/'' -> []. Shared by both new flags. */
export function parseKeyList(raw) {
  return (raw ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

/** Stable stringify: sorts object keys so key-insertion order (which is NOT
 *  part of the report's meaning) can't produce a false difference, while array
 *  order (which very much IS part of it) is preserved exactly. */
export function canonical(value) {
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

/** Read a dotted path ('a.b.c') out of a plain JSON object/array-free value.
 *  Returns {present, value}. Only walks plain objects — a segment that hits
 *  an array or a primitive before the path ends is treated as absent. That's
 *  the "cheap" dotted-path support the header promises: a real JSON Pointer
 *  implementation (array indices, escaping) is not needed for the report
 *  shape this harness inspects, and pretending otherwise would be unused
 *  complexity nobody could exercise. */
export function getAtPath(obj, dottedPath) {
  const parts = dottedPath.split('.');
  let cur = obj;
  for (const part of parts) {
    if (cur === null || typeof cur !== 'object' || Array.isArray(cur) || !(part in cur)) {
      return { present: false, value: undefined };
    }
    cur = cur[part];
  }
  return { present: true, value: cur };
}

/** Non-destructive: returns a NEW object with the dotted path removed,
 *  cloning only the spine of objects actually on the path. A path that does
 *  not resolve (missing key, or passes through a non-object) is a no-op —
 *  omitting an already-absent key must never throw, since a BEFORE snapshot
 *  legitimately lacks a key an AFTER snapshot adds. */
export function omitAtPath(obj, dottedPath) {
  const [head, ...rest] = dottedPath.split('.');
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj) || !(head in obj)) return obj;
  if (rest.length === 0) {
    const { [head]: _drop, ...remainder } = obj;
    return remainder;
  }
  const nested = obj[head];
  if (nested === null || typeof nested !== 'object' || Array.isArray(nested)) return obj;
  return { ...obj, [head]: omitAtPath(nested, rest.join('.')) };
}

const safeName = (name) => name.replace(/[^A-Za-z0-9._-]+/g, '__');

/**
 * Pure comparison over two already-written snapshot directories (see
 * snapshotTree above for the format: `_index.json` + one `<safeName>.json`
 * per fixture). No process.exit, no direct stdout — a caller (the CLI
 * dispatch below, or a test) reads the returned structure and/or feeds it to
 * renderCompareReport(). With `ignoreKeys`/`requireAdded` both empty this is
 * byte-for-byte the same identity check the harness has always run.
 *
 * @param {string} beforeDir
 * @param {string} afterDir
 * @param {{ ignoreKeys?: string[], requireAdded?: string[] }} [opts]
 */
export function computeCompare(beforeDir, afterDir, opts = {}) {
  const ignoreKeys = opts.ignoreKeys ?? [];
  const requireAdded = opts.requireAdded ?? [];

  const readIndex = (dir) => JSON.parse(readFileSync(path.join(dir, '_index.json'), 'utf8'));
  const before = readIndex(beforeDir);
  const after = readIndex(afterDir);
  const byNameBefore = new Map(before.map((e) => [e.name, e]));
  const byNameAfter = new Map(after.map((e) => [e.name, e]));
  // Preserve the original script's iteration order: AFTER's order first
  // (which is also SNAPSHOT order, since --tree writes both dirs from the
  // same fixture list), then any BEFORE-only leftovers at the end.
  const orderedNames = [
    ...after.map((e) => e.name),
    ...before.map((e) => e.name).filter((n) => !byNameAfter.has(n)),
  ];

  const fixtures = [];
  const ignoredKeyDiffCounts = Object.fromEntries(ignoreKeys.map((k) => [k, 0]));
  const requireAddedViolations = [];
  let totalCompared = 0;

  for (const name of orderedNames) {
    const b = byNameBefore.get(name);
    const a = byNameAfter.get(name);
    if (!b) { fixtures.push({ name, status: 'onlyAfter' }); continue; }
    if (!a) { fixtures.push({ name, status: 'onlyBefore' }); continue; }
    totalCompared++;

    const safe = safeName(name);
    const beforeRaw = readFileSync(path.join(beforeDir, `${safe}.json`), 'utf8');
    const afterRaw = readFileSync(path.join(afterDir, `${safe}.json`), 'utf8');

    // require-added: only meaningful for a fixture present on both sides —
    // an onlyAfter/onlyBefore fixture is already a hard difference by itself.
    if (requireAdded.length > 0 || ignoreKeys.length > 0) {
      const beforeObj = JSON.parse(beforeRaw);
      const afterObj = JSON.parse(afterRaw);

      for (const key of requireAdded) {
        if (getAtPath(beforeObj, key).present) {
          requireAddedViolations.push({ key, fixture: name, reason: 'present in BEFORE (must only exist after the change)' });
        }
        if (!getAtPath(afterObj, key).present) {
          requireAddedViolations.push({ key, fixture: name, reason: 'absent from AFTER (must be added by the change)' });
        }
      }

      for (const key of ignoreKeys) {
        const bv = getAtPath(beforeObj, key);
        const av = getAtPath(afterObj, key);
        if (bv.present !== av.present || JSON.stringify(bv.value) !== JSON.stringify(av.value)) {
          ignoredKeyDiffCounts[key] += 1;
        }
      }

      if (b.sha256 !== a.sha256) {
        let strippedBefore = beforeObj;
        let strippedAfter = afterObj;
        for (const key of ignoreKeys) {
          strippedBefore = omitAtPath(strippedBefore, key);
          strippedAfter = omitAtPath(strippedAfter, key);
        }
        if (JSON.stringify(strippedBefore) === JSON.stringify(strippedAfter)) {
          fixtures.push({ name, status: 'identicalModuloIgnored' });
          continue;
        }
        fixtures.push({ name, status: 'differs', diffLines: diffLines(beforeRaw, afterRaw) });
        continue;
      }
      fixtures.push({ name, status: 'identical' });
      continue;
    }

    // No flags: the original, cheapest path — sha256 alone decides.
    if (b.sha256 === a.sha256) {
      fixtures.push({ name, status: 'identical' });
    } else {
      fixtures.push({ name, status: 'differs', diffLines: diffLines(beforeRaw, afterRaw) });
    }
  }

  const contentDifferences = fixtures.filter(
    (f) => f.status === 'differs' || f.status === 'onlyAfter' || f.status === 'onlyBefore',
  ).length;
  const exitCode = contentDifferences === 0 && requireAddedViolations.length === 0 ? 0 : 1;

  return {
    fixtures,
    ignoreKeys,
    ignoredKeyDiffCounts,
    requireAdded,
    requireAddedViolations,
    totalCompared,
    contentDifferences,
    exitCode,
  };
}

function diffLines(beforeRaw, afterRaw) {
  const a = beforeRaw.split('\n');
  const b = afterRaw.split('\n');
  const out = [];
  for (let i = 0; i < Math.max(a.length, b.length) && out.length < 6; i++) {
    if (a[i] !== b[i]) out.push({ line: i + 1, before: a[i] ?? '<eof>', after: b[i] ?? '<eof>' });
  }
  return out;
}

/** Renders a computeCompare() result as the text the CLI prints — pulled out
 *  as its own pure function so tests can assert on the report text without
 *  spawning a subprocess. */
export function renderCompareReport(result) {
  const lines = [];
  for (const f of result.fixtures) {
    if (f.status === 'onlyAfter') { lines.push(`  + ${f.name} (present only after)`); continue; }
    if (f.status === 'onlyBefore') { lines.push(`  - ${f.name} (present only before)`); continue; }
    if (f.status !== 'differs') continue; // identical / identicalModuloIgnored: silent, same as always
    lines.push(`  ! ${f.name}: report differs`);
    for (const d of f.diffLines) {
      lines.push(`      line ${d.line}\n        before: ${d.before}\n        after:  ${d.after}`);
    }
  }

  if (result.ignoreKeys.length > 0) {
    lines.push('', `Ignored keys (excluded from the identity check, over ${result.totalCompared} compared reports):`);
    for (const key of result.ignoreKeys) {
      lines.push(`  "${key}": differs in ${result.ignoredKeyDiffCounts[key]}/${result.totalCompared} reports`);
    }
  }

  if (result.requireAdded.length > 0) {
    lines.push('');
    if (result.requireAddedViolations.length === 0) {
      lines.push(
        `Required-added keys confirmed present in every AFTER report and absent from every ` +
        `BEFORE report: ${result.requireAdded.join(', ')}`,
      );
    } else {
      lines.push('REQUIRE-ADDED FAILURES:');
      for (const v of result.requireAddedViolations) lines.push(`  - "${v.key}" in ${v.fixture}: ${v.reason}`);
    }
  }

  lines.push('');
  if (result.exitCode === 0) {
    const modulo = result.ignoreKeys.length > 0 ? ` modulo the ignored key(s) [${result.ignoreKeys.join(', ')}]` : '';
    lines.push(
      `OUTPUT IDENTITY: PASS — all ${result.totalCompared} reports are byte-identical${modulo} ` +
      `(analyzedAt excluded).`,
    );
  } else {
    const requireAddedNote = result.requireAddedViolations.length > 0
      ? `, ${result.requireAddedViolations.length} require-added violation(s)`
      : '';
    lines.push(`OUTPUT IDENTITY: FAIL — ${result.contentDifferences} fixture(s) differ${requireAddedNote}.`);
  }
  return `${lines.join('\n')}\n`;
}

async function main() {
  const compareArg = args.indexOf('--compare');
  if (compareArg >= 0) {
    const result = computeCompare(args[compareArg + 1], args[compareArg + 2], {
      ignoreKeys: parseKeyList(flag('--ignore-keys')),
      requireAdded: parseKeyList(flag('--require-added')),
    });
    process.stdout.write(renderCompareReport(result));
    process.exit(result.exitCode);
  } else {
    const tree = flag('--tree') ?? '.';
    const out = flag('--out');
    if (!out) {
      process.stderr.write('usage: check-doctor-output-identity.mjs --tree <dir> --out <dir>\n');
      process.stderr.write(
        '       check-doctor-output-identity.mjs --compare <beforeDir> <afterDir> ' +
        '[--ignore-keys a,b] [--require-added x,y]\n',
      );
      process.exit(2);
    }
    if (existsSync(out)) rmSync(out, { recursive: true, force: true });
    await snapshotTree(tree, out);
  }
}

// Run only when invoked directly, so tests can import the pure pieces above
// (computeCompare, renderCompareReport, getAtPath, omitAtPath, canonical)
// without triggering a real snapshot/compare run.
const invokedDirectly = Boolean(process.argv[1])
  && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) await main();
