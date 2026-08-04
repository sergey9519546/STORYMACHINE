#!/usr/bin/env node
// check-scoring-receipt.mjs — required-receipt enforcement for the AUC floor.
//
// WHY THIS EXISTS: CLAUDE.md's AUC-24 >= 0.622 structural-degradation ratchet
// (tests/core/real-script-corpus.test.ts, env-gated on REAL_SCRIPT_CORPUS_DIR)
// CANNOT run in CI — the corpus is local-only and copyright-restricted, and
// mounting it via CI secrets was rejected: secrets are not a corpus transport,
// and uploading the screenplay text anywhere is the exact exposure the
// de-identification work (docs/p1-benchmark/CORPUS_IDENTIFICATION.md) exists
// to avoid. CI cannot verify the AUC VALUE. What it CAN do is make it
// impossible to silently ship a scoring change without SOMEONE having run the
// local measurement and recorded it — this script is that trip-wire.
//
// MECHANISM: given a git range, detect whether any file on the "scoring path"
// changed. If one did, the SAME range must also touch
// docs/p1-benchmark/MEASUREMENT_RECEIPTS.md with real added content (not a
// no-op touch) — the human step is CHECKED FOR, not hoped for. The AUC number
// itself is never re-verified; a fabricated receipt still gets past this
// script. That is a known, accepted boundary — see MEASUREMENT_RECEIPTS.md's
// own header.
//
// ---------------------------------------------------------------------------
// THE SCORING PATH — defined conservatively, reasoning documented inline.
// ---------------------------------------------------------------------------
// Two tiers:
//
// 1. ALWAYS-SCORING (matched by exact path or directory prefix, no further
//    analysis) — the paths CLAUDE.md and the maintainer named directly as the
//    core scoring surface:
//      - server/nvm/analyze/doctor.ts        (the score/verdict entrypoint)
//      - server/nvm/analyze/emotional-arc.ts (feeds doctor's structural
//                                              deduction directly)
//      - server/nvm/analyze/fountain-analyzer.ts (the base parse everything
//                                              else, including doctor, reads)
//      - server/nvm/analyze/calibration/**   (the reference distribution and
//                                              percentile math the score is
//                                              normalized against; corpus.ts
//                                              and discrimination-pairs.ts
//                                              live here and are NOT always
//                                              statically imported by doctor
//                                              — including the whole
//                                              directory is the "err toward
//                                              inclusion" call, since a
//                                              calibration-corpus edit can
//                                              shift every band's score
//                                              without doctor.ts itself
//                                              changing a line)
//      - server/nvm/revision/passes/**       (the live 14-pass pipeline;
//                                              CLAUDE.md: "the revision
//                                              pipeline's 14-pass execution
//                                              order is still live" — every
//                                              pass here can move health via
//                                              runRevisionPipeline)
//
// 2. REACHABILITY-GATED (everything else under server/nvm/analyze/** and
//    server/nvm/revision/**) — a file here counts as scoring-path ONLY if it
//    is statically reachable by following import/export/dynamic-import edges
//    outward from doctor.ts (server/nvm/analyze/doctor.ts), computed fresh
//    against the CURRENT on-disk tree every run (not against git history —
//    a file's wiring is a property of the checkout being tested, not of any
//    one commit). This is what keeps NEW unwired candidate files — the
//    QL-deduction (question-latency-deduction.ts), reversal-detection.ts,
//    truth-extraction.ts pattern CLAUDE.md and the maintainer named
//    explicitly — from tripping the guard: nothing in the scoring path
//    imports them, so they are not in the reachable set, so a change to (or
//    addition of) one of them is invisible to this script, exactly as it is
//    invisible to a real doctor run. The same walk also correctly excludes
//    dozens of other already-unwired analyze/** files (causality-enforcer.ts,
//    disclosure-ledger.ts, epistemic-ledger.ts, custody-ledger.ts,
//    belief-movement.ts, assertion-containment.ts, genre-obligation.ts,
//    integrity-rate.ts, mystery-fairness.ts, scene-economy.ts,
//    scene-value-shift.ts, well-made-surprise.ts, typed-promises.ts,
//    story-spine.ts, voice-delta.ts, inflection-tension.ts,
//    dialogue-info-ratio.ts, excellence-signals.ts, structural-genome.ts,
//    story-graph-ops.ts, fix.ts, canonical-fountain.ts, and more — verified
//    by hand against `grep -rl "from '.*<file>'" server` at the time this
//    script was written) while correctly including everything doctor.ts
//    actually imports transitively (deep-read.ts, anti-slop.ts,
//    theme-extract.ts, interiority.ts, mirror-scene.ts, silence-signal.ts,
//    bonding-signal.ts, cold-open-promise.ts, pattern-establishment.ts,
//    story-graph.ts, temporal-consistency.ts, metrics.ts,
//    calibration/percentile.ts, ../revision/pipeline.ts, ../revision/
//    rewrite.ts, and the pipeline's own imports of screenplay/compile.ts,
//    screenplay/structure.ts, screenplay/memory.ts, etc.).
//
//    Only files under server/nvm/analyze/** or server/nvm/revision/** are
//    reachability-gated at all — the walk itself does follow edges outside
//    those directories (e.g. into server/nvm/screenplay/**, server/lib/**,
//    src/lib/screenplay-layout.ts) to stay correct across re-export chains,
//    but files outside the two gated directories are never classified as
//    scoring-path even if visited, because editing e.g. src/lib/
//    screenplay-layout.ts's rendering code is not a scoring-formula change
//    (see the "outside the scoring-path directories" branch in classify()).
//
// A file this script does NOT catch: anything computing health/verdict from
// OUTSIDE server/nvm/analyze/** and server/nvm/revision/** entirely (there is
// no such file today — doctor.ts is the sole entrypoint). If one is ever
// added elsewhere, add its directory to REACHABILITY_GATED_PREFIXES (or its
// exact path to ALWAYS_SCORING_FILES) — erring toward inclusion, per the
// brief this script was built against.
// ---------------------------------------------------------------------------

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const RECEIPT_PATH = 'docs/p1-benchmark/MEASUREMENT_RECEIPTS.md';

const ALWAYS_SCORING_FILES = new Set([
  'server/nvm/analyze/doctor.ts',
  'server/nvm/analyze/emotional-arc.ts',
  'server/nvm/analyze/fountain-analyzer.ts',
]);
const ALWAYS_SCORING_DIR_PREFIXES = [
  'server/nvm/analyze/calibration/',
  'server/nvm/revision/passes/',
];
const REACHABILITY_GATED_PREFIXES = [
  'server/nvm/analyze/',
  'server/nvm/revision/',
];
const REACHABILITY_ROOTS = ['server/nvm/analyze/doctor.ts'];

// ---------------------------------------------------------------------------
// Git plumbing
// ---------------------------------------------------------------------------

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
}

function refExists(ref) {
  try {
    git(['rev-parse', '--verify', '--quiet', ref]);
    return true;
  } catch {
    return false;
  }
}

/** True for a bare/single-ref range ("origin/main"), false for a two-point
 *  range ("A..B" or "A...B"). Single-ref ranges diff against the working
 *  tree, so they get untracked files unioned in; two-point ranges are a pure
 *  historical comparison and should not pick up unrelated working-tree noise. */
function isSingleRefRange(range) {
  return !range.includes('..');
}

/** CI default: origin/main...HEAD (PR-shaped: only what HEAD added since it
 *  diverged from origin/main). Local default: diff against the merge-base
 *  with whichever of origin/main / main exists, so uncommitted work is
 *  included (a dev wants to know before committing, not after). Last resort:
 *  the previous commit. Returns null only when none of these resolve (e.g. a
 *  brand-new single-commit repo with no remote) — callers treat that as "no
 *  base to compare against, nothing to check" rather than an error. */
function resolveDefaultRange() {
  if (process.env.CI) {
    if (refExists('origin/main')) return 'origin/main...HEAD';
    // CI without a resolvable origin/main is a checkout misconfiguration
    // (shallow fetch, wrong ref) — fall through to the same local-style
    // fallback rather than crashing the whole job over it.
  }
  for (const base of ['origin/main', 'main']) {
    if (refExists(base)) return base;
  }
  if (refExists('HEAD~1')) return 'HEAD~1';
  return null;
}

function getChangedFiles(range) {
  let out;
  try {
    out = git(['diff', '--name-only', range]);
  } catch (err) {
    throw new Error(`git diff failed for range "${range}": ${err.message}`);
  }
  const files = out.split('\n').map((s) => s.trim()).filter(Boolean);
  if (isSingleRefRange(range)) {
    const status = git(['status', '--porcelain=v1', '--untracked-files=all']);
    for (const line of status.split('\n')) {
      if (line.startsWith('??')) files.push(line.slice(3).trim());
    }
  }
  return [...new Set(files)];
}

/** The receipt must gain content in this range, not merely appear in the
 *  diff — a whitespace-only or deletion-only touch doesn't count. Handles
 *  both a tracked modification (numstat insertions > 0) and a brand-new
 *  untracked receipt file in single-ref/local mode. */
function receiptWasMeaningfullyUpdated(range) {
  try {
    const out = git(['diff', '--numstat', range, '--', RECEIPT_PATH]).trim();
    if (out) {
      const added = Number(out.split('\n')[0].split('\t')[0]);
      if (Number.isFinite(added) && added > 0) return true;
    }
  } catch {
    // fall through to the untracked check below
  }
  if (isSingleRefRange(range)) {
    const status = git(['status', '--porcelain=v1', '--untracked-files=all']);
    for (const line of status.split('\n')) {
      if (line.startsWith('??') && line.slice(3).trim() === RECEIPT_PATH) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Reachability: static import graph rooted at doctor.ts
// ---------------------------------------------------------------------------

// Matches: `import ... from '...'`, `import type ... from '...'`,
// `export ... from '...'`, `import '...'`, and `import('...')`. Deliberately
// simple (regex, not a real parser) — this repo consistently writes relative
// imports with explicit extensions, and a missed edge only ever makes the
// reachable set SMALLER (erring away from inclusion would be the dangerous
// direction; see the resolveImport fallback below for how ambiguity is
// handled instead).
const IMPORT_RE = /(?:import|export)(?:\s+type)?\s+(?:[^'";]*?\bfrom\s+)?['"](\.[^'"]+)['"]|import\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g;

function resolveImport(fromRelFile, spec) {
  const base = path.normalize(path.join(path.dirname(fromRelFile), spec)).replace(/\\/g, '/');
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`];
  for (const c of candidates) {
    const abs = path.join(ROOT, c);
    if (existsSync(abs) && statSync(abs).isFile()) return c;
  }
  return null;
}

function computeReachableSet(rootRelFiles) {
  const seen = new Set();
  const queue = [...rootRelFiles];
  while (queue.length) {
    const rel = queue.shift();
    if (seen.has(rel)) continue;
    seen.add(rel);
    const abs = path.join(ROOT, rel);
    if (!existsSync(abs) || !statSync(abs).isFile()) continue;
    let src;
    try {
      src = readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    for (const m of src.matchAll(IMPORT_RE)) {
      const spec = m[1] ?? m[2];
      if (!spec) continue;
      const resolved = resolveImport(rel, spec);
      if (resolved && !seen.has(resolved)) queue.push(resolved);
    }
  }
  return seen;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

function classify(relPathRaw, reachable) {
  const p = relPathRaw.replace(/\\/g, '/');
  if (ALWAYS_SCORING_FILES.has(p)) {
    return { scoring: true, reason: 'core scoring entrypoint (always in scope)' };
  }
  const alwaysDir = ALWAYS_SCORING_DIR_PREFIXES.find((pre) => p.startsWith(pre));
  if (alwaysDir) {
    return { scoring: true, reason: `under ${alwaysDir} (always in scope, conservative)` };
  }
  const gatedDir = REACHABILITY_GATED_PREFIXES.find((pre) => p.startsWith(pre));
  if (gatedDir) {
    if (reachable.has(p)) {
      return { scoring: true, reason: "reachable from doctor.ts's import graph" };
    }
    return {
      scoring: false,
      reason: `under ${gatedDir} but not reachable from doctor.ts — unwired candidate, excluded`,
    };
  }
  return { scoring: false, reason: 'outside the scoring-path directories' };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const explicitRange = process.argv[2];
  const range = explicitRange || resolveDefaultRange();

  if (!range) {
    console.log('check-scoring-receipt: no base ref to diff against (no origin/main, main, or prior commit) — nothing to check.');
    process.exit(0);
  }

  const changed = getChangedFiles(range);
  const reachable = computeReachableSet(REACHABILITY_ROOTS);

  const scoringHits = [];
  for (const f of changed) {
    const c = classify(f, reachable);
    if (c.scoring) scoringHits.push({ file: f, reason: c.reason });
  }

  if (scoringHits.length === 0) {
    console.log(`check-scoring-receipt: range "${range}" — no scoring-path files changed. OK.`);
    process.exit(0);
  }

  const receiptOk = receiptWasMeaningfullyUpdated(range);

  console.log(`check-scoring-receipt: range "${range}" — ${scoringHits.length} scoring-path file(s) changed:`);
  for (const h of scoringHits) console.log(`  - ${h.file}  (${h.reason})`);

  if (receiptOk) {
    console.log(`\n${RECEIPT_PATH} was updated with added content in the same range. OK.`);
    process.exit(0);
  }

  console.error(
    [
      '',
      '='.repeat(72),
      'SCORING-PATH CHANGE WITHOUT A MEASUREMENT RECEIPT',
      '='.repeat(72),
      '',
      'A file on the scoring path changed in this range, but',
      `${RECEIPT_PATH} did not gain a new entry in the same range.`,
      '',
      'The CI corpus cannot verify the AUC value — it never has the corpus text',
      '(local-only, copyright-restricted). What it CAN verify is that a human ran',
      'the local measurement and recorded it. That step is missing here.',
      '',
      'Fix:',
      '  1. Run the local measurement against your corpus, e.g.:',
      '       REAL_SCRIPT_CORPUS_DIR=/path/to/corpus npm run measure-real',
      '     (or, for the full P1 partition sweep:',
      '       CORPUS_DIR=/path/to/corpus node scripts/measure-auc-split.mjs --partition=test)',
      `  2. Append a new entry to ${RECEIPT_PATH} using its §3 template —`,
      '     date, git SHA, exact command, measured AUC-24 (and any flag-run',
      '     AUCs), corpus fingerprint, and a runner attestation line.',
      '  3. Commit the receipt alongside the scoring change (same range).',
      '',
      'If this change does not actually affect scoring (a comment, a type-only',
      'refactor, a doc string), consider whether the touched file truly belongs',
      'on the scoring path — see the reasoning documented at the top of',
      'scripts/check-scoring-receipt.mjs before assuming this is a false positive.',
      '='.repeat(72),
      '',
    ].join('\n'),
  );
  process.exit(1);
}

main();
