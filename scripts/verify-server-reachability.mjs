#!/usr/bin/env node
// verify-server-reachability.mjs — dead-code tripwire for server/**.
//
// WHY THIS EXISTS. src/ has had a dead-UI tripwire since the P2 surface work
// (scripts/verify-p2-p3-surfaces.mjs's staticCrossCheck: BFS from App.tsx over
// src/components/**, with a named allowlist of deliberately-orphaned files, so
// an unlisted unreachable component fails). server/ had no counterpart — which
// is exactly why 78 non-test files / 24,722 LOC accumulated there without
// anyone noticing. This script is that counterpart: BFS from server.ts, fail on
// any NEW unreachable file.
//
// WHAT IT DOES NOT DO. It does not delete, quarantine, or recommend deleting
// anything. The 78 files that are unreachable today are listed below with the
// reason each one is there, and this script PASSES with all of them present.
// Its whole job is to stop the pile growing while the owner decides. See
// docs/proposals/DEAD_WEIGHT_REMOVAL_2026-08-24.md for the standing proposal.
//
// WHAT "REACHABLE" MEANS HERE. Statically reachable by following relative
// import / export-from / dynamic-import('literal') edges outward from
// server.ts, computed against the CURRENT on-disk tree. Same walk, same
// regex, and the same "a missed edge only ever makes the reachable set
// SMALLER" tradeoff as scripts/check-scoring-receipt.mjs — read that file's
// header for the reasoning behind the regex-not-a-parser choice.
//
// REACHABLE IS NOT THE SAME AS ALIVE, IN EITHER DIRECTION:
//   - A file can be reachable and still never execute (imported behind a flag
//     that is always off). This script does not claim otherwise.
//   - A file can be UNREACHABLE from server.ts and still be genuinely useful:
//     several of the entries below have real, passing unit tests and are
//     maintained candidate modules. Being on this list means "not wired into
//     the running server", nothing more.
// The one thing it does claim, and the thing worth having: nothing NEW can
// quietly join the list.
//
// TRAP THIS SCRIPT EXISTS TO AVOID REPEATING. server/nvm/kernel/ is NOT
// wholesale dead — server/engine/Stage.ts imports event-store.ts and
// adapters/commit-to-events.ts as live runtime values. An earlier CI console-
// grep excluded the whole kernel/ directory and hid that live closure from a
// shipped-code gate (see .github/workflows/ci.yml's own note). This script
// therefore allowlists dead kernel files BY NAME, never by directory, so the
// live closure inside a mostly-dead directory stays covered.
//
// Usage:  node scripts/verify-server-reachability.mjs   (npm run check-server-reachability)
// Exit:   0 = no unlisted unreachable files, allowlist clean.
//         1 = a new leak, or a stale/obsolete allowlist entry (both printed).

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

/** The running server's single entry point. `npm start` / `npm run dev` are
 *  both `tsx server.ts`; there is no second root. */
const ROOTS = ['server.ts'];

/** Universe under audit. Only server/** — src/** already has its own tripwire
 *  in verify-p2-p3-surfaces.mjs, and scripts/, evals/ and tests/ are tooling
 *  with their own entry points rather than a single import root. */
const AUDIT_DIR = 'server';

/** Test/bench files are excluded from the universe: they are entered by the
 *  test runner, not imported from server.ts, so "unreachable" says nothing
 *  about them. (Whether they RUN is a separate question — scripts/
 *  run-tests.mjs's TEST_ROOTS decides that, and several server test files sit
 *  outside it. That gap is reported in the proposal doc, not here.) */
const TEST_FILE_RE = /\.test\.tsx?$|\.bench\.tsx?$/;
const TEST_DIR_SEGMENT = '__tests__';

// ---------------------------------------------------------------------------
// KNOWN-UNREACHABLE ALLOWLIST
// ---------------------------------------------------------------------------
// Every file here was unreachable from server.ts on 2026-08-24, when this
// script was written. Listed BY EXACT PATH (never by directory prefix) so the
// tripwire stays armed for anything new — including a new file dropped into a
// directory that is otherwise entirely on this list.
//
// Removing an entry is how this list shrinks: wire the file up, or delete it
// under an owner decision, then delete its line. An entry that becomes
// reachable, or whose file disappears, FAILS this script rather than rotting
// silently.

const KNOWN_UNREACHABLE = new Set([
  // ── 1. tsconfig-quarantined v5.0 "narrative OS" subsystem (28 files) ─────
  // These four directories are excluded from tsconfig.json's compile (they
  // never type-checked: 241 tsc errors pre-quarantine) and dir-excluded from
  // CI's console.* grep. They are the merged-but-unfinished experimental
  // surface CLAUDE.md's standing task explicitly deprioritizes behind
  // demand-first validation. Preserved in the tree per the keep-as-reference
  // moratorium; not wired to anything.
  //
  // Known placeholder-value sites inside this group, recorded here so nobody
  // has to rediscover them: quantum/adaptive-pruning.ts returns a literal
  // 0.5 for genre novelty, 0.5 for thematic distance and 5 for genre count
  // (each marked "Placeholder"); infinity-gate/audience-simulation.ts's
  // calculateCulturalMatch returns a literal 0.7; planning/index.ts re-exports
  // OASISEmotionalValidator, whose three methods all throw "OASIS integration
  // not yet implemented".
  'server/nvm/quantum/adaptive-pruning.ts',
  'server/nvm/quantum/distributed-workers.ts',
  'server/nvm/quantum/entanglement.ts',
  'server/nvm/quantum/example.ts',
  'server/nvm/quantum/hierarchical-clustering.ts',
  'server/nvm/quantum/index.ts',
  'server/nvm/quantum/story-field.ts',
  'server/nvm/quantum/types.ts',
  'server/nvm/research/api.ts',
  'server/nvm/research/dashboard.ts',
  'server/nvm/research/examples.ts',
  'server/nvm/research/experiments/quantum-branching.ts',
  'server/nvm/research/experiments/setup-payoff-distance.ts',
  'server/nvm/research/experiments/trinity-gate-precision.ts',
  'server/nvm/research/index.ts',
  'server/nvm/research/theories/campbell-hero-journey.ts',
  'server/nvm/research/theories/freytag-pyramid.ts',
  'server/nvm/research/types.ts',
  'server/nvm/infinity-gate/audience-simulation.ts',
  'server/planning/apdl-planner.ts',
  'server/planning/apdl-validator.ts',
  'server/planning/apdl.ts',
  'server/planning/effect-targets.ts',
  'server/planning/emotional-effects-library.ts',
  'server/planning/examples.ts',
  'server/planning/index.ts',
  'server/planning/oasis-integration.ts',
  'server/planning/pddl-types.ts',

  // ── 2. Dead kernel files (13) ────────────────────────────────────────────
  // The v5.0 kernel experiment. Listed individually BECAUSE the directory is
  // mixed: event-store.ts and adapters/commit-to-events.ts are LIVE (imported
  // by server/engine/Stage.ts) and are deliberately absent from this list, so
  // they stay covered by the tripwire like any other shipped file. Each entry
  // below matches tsconfig.json's per-file quarantine of the same paths.
  'server/nvm/kernel/adapters.ts',
  'server/nvm/kernel/adapters/index.ts',
  'server/nvm/kernel/adapters/nlp-helpers.ts',
  'server/nvm/kernel/adapters/type-enrichment.ts',
  'server/nvm/kernel/index.ts',
  'server/nvm/kernel/integration.ts',
  'server/nvm/kernel/trinity-gate-demo.ts',
  'server/nvm/kernel/trinity-gate-example.ts',
  'server/nvm/kernel/trinity-gate.ts',
  'server/nvm/kernel/v5-examples.ts',
  'server/nvm/kernel/verifiers/owne-verifier.ts',
  'server/nvm/kernel/verifiers/preflight-auditor.ts',
  'server/nvm/kernel/verifiers/story-graph-verifier.ts',

  // ── 3. The v5 live loop (1) ──────────────────────────────────────────────
  // Also tsconfig-excluded by name. Writes the literal string 'To be analyzed'
  // as every branch's dramatic impact, which is the clearest single marker
  // that this loop was never finished.
  'server/nvm/live/v5-loop.ts',

  // ── 4. Unwired analyze/** candidate modules (27) ─────────────────────────
  // Analyzer modules that exist, mostly type-check, and in many cases have
  // passing unit tests under server/nvm/analyze/*.test.ts — but that nothing
  // in the doctor's import graph pulls in. scripts/check-scoring-receipt.mjs
  // already treats this exact class as "unwired candidate, excluded" and names
  // several of them in its header for the same reason. They are candidates,
  // not leaks; keeping them listed here means a NEW one still trips this
  // script instead of joining them silently.
  //
  // calibration/discrimination-pairs.ts is a deliberate special case: it lives
  // under the always-scoring calibration/ prefix for receipt purposes (a
  // calibration edit can move every band's score) yet is not statically
  // imported by doctor.ts. Both facts are true at once; it belongs here.
  'server/nvm/analyze/NarrativeState.ts',
  'server/nvm/analyze/agency-signal.ts',
  'server/nvm/analyze/assertion-containment.ts',
  'server/nvm/analyze/belief-movement.ts',
  'server/nvm/analyze/calibration/discrimination-pairs.ts',
  'server/nvm/analyze/canonical-fountain.ts',
  'server/nvm/analyze/causality-enforcer.ts',
  'server/nvm/analyze/custody-ledger.ts',
  'server/nvm/analyze/dialogue-info-ratio.ts',
  'server/nvm/analyze/epistemic-ledger.ts',
  'server/nvm/analyze/excellence-signals.ts',
  'server/nvm/analyze/genre-obligation.ts',
  'server/nvm/analyze/inflection-tension.ts',
  'server/nvm/analyze/integrity-rate.ts',
  'server/nvm/analyze/mystery-fairness.ts',
  'server/nvm/analyze/question-latency-deduction.ts',
  'server/nvm/analyze/reversal-detection.ts',
  'server/nvm/analyze/scene-economy.ts',
  'server/nvm/analyze/scene-value-shift.ts',
  'server/nvm/analyze/story-graph-ops.ts',
  'server/nvm/analyze/story-spine.ts',
  // structural-genome.ts lost its only live importer on 2026-08-24, when the
  // compare route stopped calling extractGenome() with an empty record list to
  // manufacture a constant "genome" it then presented as a measurement. The
  // module is kept and unit-tested (tests/core/story-vector.test.ts); wiring
  // it for real needs per-scene records the corpus cache does not store. See
  // Proposal A in docs/proposals/DEAD_WEIGHT_REMOVAL_2026-08-24.md.
  'server/nvm/analyze/structural-genome.ts',
  'server/nvm/analyze/temporal.ts',
  'server/nvm/analyze/truth-extraction.ts',
  'server/nvm/analyze/truth-ledger.ts',
  'server/nvm/analyze/typed-promises.ts',
  'server/nvm/analyze/well-made-surprise.ts',

  // ── 5. Assorted unwired modules elsewhere under server/ (9) ──────────────
  // No common story beyond "written, never connected". proof/acquittal.ts is
  // the notable one: it HAS a test that actually runs (server/nvm/proof is in
  // run-tests.mjs's TEST_ROOTS), so it is covered but not shipped.
  'server/nvm/benchmarks/index.ts',
  'server/nvm/generate/voice-constraint.ts',
  'server/nvm/module/NarrativeModule.ts',
  'server/nvm/ops/belief-revision.ts',
  'server/nvm/ops/meta-belief.ts',
  'server/nvm/ops/tactic-types.ts',
  'server/nvm/proof/acquittal.ts',
  'server/nvm/query/whatBreaks.ts',
  'server/nvm/repro/llm-cache.ts',
]);

// ---------------------------------------------------------------------------
// Static import graph
// ---------------------------------------------------------------------------

// Matches `import ... from '...'`, `import type ... from '...'`,
// `export ... from '...'`, `import '...'`, and `import('...')`, for relative
// specifiers only. Deliberately a regex, not a parser — see the header.
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

function listSourceFiles(dirRel, out = []) {
  for (const entry of readdirSync(path.join(ROOT, dirRel), { withFileTypes: true })) {
    const rel = `${dirRel}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name === TEST_DIR_SEGMENT) continue;
      listSourceFiles(rel, out);
    } else if (/\.tsx?$/.test(entry.name) && !TEST_FILE_RE.test(entry.name)) {
      out.push(rel);
    }
  }
  return out;
}

function countLines(rel) {
  try {
    return readFileSync(path.join(ROOT, rel), 'utf8').split('\n').length;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  for (const root of ROOTS) {
    if (!existsSync(path.join(ROOT, root))) {
      console.error(`verify-server-reachability: entry point "${root}" not found — run from the repo root.`);
      process.exit(1);
    }
  }

  const reachable = computeReachableSet(ROOTS);
  const allFiles = listSourceFiles(AUDIT_DIR).sort();
  const unreachable = allFiles.filter((f) => !reachable.has(f));

  const newLeaks = unreachable.filter((f) => !KNOWN_UNREACHABLE.has(f));
  const nowReachable = [...KNOWN_UNREACHABLE].filter((f) => reachable.has(f)).sort();
  const missingFiles = [...KNOWN_UNREACHABLE].filter((f) => !existsSync(path.join(ROOT, f))).sort();

  const deadLines = unreachable.reduce((sum, f) => sum + countLines(f), 0);
  console.log(`verify-server-reachability: BFS from ${ROOTS.join(', ')} over ${AUDIT_DIR}/**`);
  console.log(`  source files (non-test):   ${allFiles.length}`);
  console.log(`  reachable from entry:      ${allFiles.length - unreachable.length}`);
  console.log(`  unreachable:               ${unreachable.length}  (${deadLines} lines)`);
  console.log(`  allowlisted as known-dead: ${KNOWN_UNREACHABLE.size}`);

  let failed = false;

  if (newLeaks.length > 0) {
    failed = true;
    console.error('');
    console.error('='.repeat(72));
    console.error(`NEW UNREACHABLE FILE(S) UNDER ${AUDIT_DIR}/ — ${newLeaks.length}`);
    console.error('='.repeat(72));
    for (const f of newLeaks) console.error(`  ${f}  (${countLines(f)} lines)`);
    console.error('');
    console.error('Nothing imports these, directly or transitively, from server.ts, so');
    console.error('they cannot run in the shipped server. Do one of:');
    console.error('  1. Wire it up — import it from the route/module that needs it.');
    console.error('  2. Keep it deliberately — add it to KNOWN_UNREACHABLE in this');
    console.error('     script WITH a comment saying why, next to the group it belongs to.');
    console.error('An unexplained entry is the thing this tripwire exists to prevent.');
  }

  if (nowReachable.length > 0) {
    failed = true;
    console.error('');
    console.error('='.repeat(72));
    console.error(`ALLOWLIST OBSOLETE — ${nowReachable.length} entr(ies) are now reachable`);
    console.error('='.repeat(72));
    for (const f of nowReachable) console.error(`  ${f}`);
    console.error('');
    console.error('Good news, and a one-line fix: delete these from KNOWN_UNREACHABLE.');
    console.error('The allowlist is a ratchet — it must only ever shrink.');
  }

  if (missingFiles.length > 0) {
    failed = true;
    console.error('');
    console.error('='.repeat(72));
    console.error(`ALLOWLIST STALE — ${missingFiles.length} entr(ies) name a file that no longer exists`);
    console.error('='.repeat(72));
    for (const f of missingFiles) console.error(`  ${f}`);
    console.error('');
    console.error('Delete these lines from KNOWN_UNREACHABLE.');
  }

  if (failed) {
    process.exit(1);
  }

  console.log('');
  console.log(`verify-server-reachability: OK — every unreachable file under ${AUDIT_DIR}/ is a known, documented entry.`);
  process.exit(0);
}

main();
