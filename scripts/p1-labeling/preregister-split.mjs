#!/usr/bin/env node
// PREREGISTER SPLIT — verifies scripts/split-corpus.mjs's existing
// train/val/test machinery against PRE_REGISTRATION_PROTOCOL.md §4's
// mechanical requirements, and documents the ONE gap it cannot close:
// quality-tier stratification.
//
// ============================================================================
// WHAT THIS SCRIPT IS (extends, does not duplicate, existing tooling)
// ============================================================================
// scripts/split-corpus.mjs ALREADY does the split-generation half of §4:
// fixed seed (CORPUS_SPLIT_SEED=42), 60/20/20, and a SHA-256 lock of the
// test-set file list, written to scripts/output/corpus-test-hash.txt and
// embedded in corpus-split.json's own testSetHash field. This script does
// NOT recompute or re-verify per-file content hashes against the corpus
// dir — that is scripts/verify-corpus-layout.mjs's job (deeper check,
// requires the corpus text). This script instead:
//
//   1. Checks the pre-registration CHECKLIST from §4 against what is
//      already committed (cheap, in-repo-only — no corpus dir needed).
//   2. Documents the STRATIFICATION GAP: PRE_REGISTRATION_PROTOCOL.md §4
//      and SPLIT_STRATEGY.md's "Quality Strata" both specify the 60/20/20
//      split should be stratified BY QUALITY TIER (A/B/C/D). But quality
//      labels do not exist until AFTER human labeling (Phase 2), and
//      split-corpus.mjs's committed split predates any labeling round — it
//      is a plain random split, not quality-stratified. This is a real,
//      pre-existing deviation from the pre-registered design, not
//      something this script can silently fix (rebalancing the split
//      after seeing labels would itself be a pre-registration violation —
//      see PRE_REGISTRATION_PROTOCOL.md §9's "no changes without
//      documented justification").
//   3. THE MISSING PIECE this script adds: once `--labels` (a
//      collect-labels.mjs aggregate) is available, reports the ACHIEVED
//      quality distribution per partition — informational only, never
//      used to change the split — so the deviation logged in
//      PRE_REGISTRATION_PROTOCOL.md §9 can cite real numbers instead of
//      "unknown."
//
// The TEST partition's achieved distribution is withheld by default (a
// deliberate friction point, matching MEASUREMENT_RUNBOOK.md §3.3's "test
// partition is single-use, hash-locked, untouchable" discipline) — pass
// --reveal-test only once, at final evaluation, exactly as documented
// there.
//
// ============================================================================
// USAGE
// ============================================================================
//   node scripts/p1-labeling/preregister-split.mjs \
//     [--split-file=scripts/output/corpus-split.json]   (default shown)
//     [--test-hash-file=scripts/output/corpus-test-hash.txt]  (default shown)
//     [--labels=data/p1-labeling/labels-aggregate.json] (optional — enables
//                                                        achieved-distribution reporting)
//     [--corpus-dir=<path>]  (only needed to join a PRE-migration split
//                             against id-keyed labels; see below)
//     [--reveal-test]        (see discipline note above)
//   node scripts/p1-labeling/preregister-split.mjs --help
//
// Exit code: 1 if any mechanical checklist item FAILS (hash mismatch, wrong
// seed/fracs), 0 otherwise. The stratification gap is reported but does
// NOT affect exit code — it is a documentation/decision item, not a broken
// invariant.

import fs from 'node:fs';
import path from 'node:path';
import { loadManifest } from './lib/manifest.mjs';
import { REPO_ROOT } from './lib/git-guard.mjs';

const DEFAULT_SPLIT_FILE = path.join(REPO_ROOT, 'scripts/output/corpus-split.json');
const DEFAULT_TEST_HASH_FILE = path.join(REPO_ROOT, 'scripts/output/corpus-test-hash.txt');
const EXPECTED_SEED = 42; // PRE_REGISTRATION_PROTOCOL.md §4 "Random Seed: Fixed seed CORPUS_SPLIT_SEED = 42"
const EXPECTED_FRACS = { train: 0.6, val: 0.2, test: 0.2 }; // §2 "Corpus Target"

const USAGE = `Usage: node scripts/p1-labeling/preregister-split.mjs [options]

Optional:
  --split-file=<path>      Default: scripts/output/corpus-split.json
  --test-hash-file=<path>  Default: scripts/output/corpus-test-hash.txt
  --labels=<path>          A collect-labels.mjs aggregate. If given, reports
                            the ACHIEVED quality-tier distribution per
                            partition (train/val always; test only with
                            --reveal-test). Never changes the split.
  --corpus-dir=<path>      Only needed to join a PRE-migration split (no
                            .id fields) against id-keyed labels — recomputes
                            ids the same way make-blind-bundles.mjs does.
                            Not needed for an already-migrated split.
  --reveal-test             Print the test partition's achieved quality
                            distribution. Off by default — see this file's
                            header for the discipline this enforces.
  --help                    Print this message and exit 0.
`;

function parseArgs(argv) {
  const out = { revealTest: false, help: false };
  for (const a of argv) {
    if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--reveal-test') out.revealTest = true;
    else if (a.startsWith('--split-file=')) out.splitFile = a.slice('--split-file='.length);
    else if (a.startsWith('--test-hash-file=')) out.testHashFile = a.slice('--test-hash-file='.length);
    else if (a.startsWith('--labels=')) out.labels = a.slice('--labels='.length);
    else if (a.startsWith('--corpus-dir=')) out.corpusDir = a.slice('--corpus-dir='.length);
    else {
      console.error(`Unknown argument: ${a}`);
      process.exit(2);
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(USAGE);
  process.exit(0);
}

const splitFile = path.resolve(args.splitFile ?? DEFAULT_SPLIT_FILE);
const testHashFile = path.resolve(args.testHashFile ?? DEFAULT_TEST_HASH_FILE);

console.log('═'.repeat(78));
console.log('PRE-REGISTRATION CHECK — scripts/split-corpus.mjs vs. PRE_REGISTRATION_PROTOCOL.md §4');
console.log('═'.repeat(78));

if (!fs.existsSync(splitFile)) {
  console.error(`\n[FAIL] ${splitFile} does not exist. Run scripts/split-corpus.mjs first (requires the private corpus locally — see MEASUREMENT_RUNBOOK.md).`);
  process.exit(1);
}
const split = JSON.parse(fs.readFileSync(splitFile, 'utf-8'));

const checklist = [];
const check = (label, pass, detail) => {
  checklist.push({ label, pass, detail });
  console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${label}${detail ? ' — ' + detail : ''}`);
};

console.log('\n── §4 mechanical checklist ──────────────────────────────────');

check(
  'Fixed seed (CORPUS_SPLIT_SEED = 42)',
  split.seed === EXPECTED_SEED,
  `split.seed=${split.seed}`
);

const fracsOk = split.fracs
  && Math.abs(split.fracs.train - EXPECTED_FRACS.train) < 1e-9
  && Math.abs(split.fracs.val - EXPECTED_FRACS.val) < 1e-9
  && Math.abs(split.fracs.test - EXPECTED_FRACS.test) < 1e-9;
check('60/20/20 fracs', fracsOk, JSON.stringify(split.fracs));

const countsSum = (split.counts?.train ?? 0) + (split.counts?.val ?? 0) + (split.counts?.test ?? 0);
check(
  'counts.valid = train + val + test',
  split.counts?.valid === countsSum,
  `valid=${split.counts?.valid}, train+val+test=${countsSum}`
);

const arrayLenOk =
  (split.train ?? []).length === split.counts?.train &&
  (split.val ?? []).length === split.counts?.val &&
  (split.test ?? []).length === split.counts?.test;
check('partition array lengths match counts', arrayLenOk);

check('testSetHash is present (SHA-256 hex)', typeof split.testSetHash === 'string' && /^[0-9a-f]{64}$/.test(split.testSetHash));

let testHashFileOk = false;
let testHashFileValue = null;
if (fs.existsSync(testHashFile)) {
  testHashFileValue = fs.readFileSync(testHashFile, 'utf-8').trim();
  testHashFileOk = testHashFileValue === split.testSetHash;
}
check(
  'corpus-test-hash.txt matches corpus-split.json\'s testSetHash (hash "published" — PRE_REGISTRATION_PROTOCOL.md §4 step 3)',
  testHashFileOk,
  fs.existsSync(testHashFile) ? `file=${testHashFileValue}, split.json=${split.testSetHash}` : `${testHashFile} not found`
);

// This script does NOT recompute the lock from the corpus dir (that
// requires the private corpus text and is verify-corpus-layout.mjs's job —
// see this file's header). It only proves internal consistency between the
// two committed artifacts above.
console.log('\n  NOTE: this does not re-verify the hash against actual corpus files.');
console.log('  For that, run: node scripts/verify-corpus-layout.mjs --corpus-dir=<path> --split-file=' + path.relative(REPO_ROOT, splitFile));

console.log('\n── §4 discipline items (not machine-checkable, printed as an attestation prompt) ──');
console.log('  [MANUAL] "Store test set in access-controlled location" — the corpus is local-only,');
console.log('           gitignored (CLAUDE.md: ".claude/ and data/ are gitignored"), never distributed.');
console.log('  [MANUAL] "Never look at test labels during development" — see MEASUREMENT_RUNBOOK.md §3');
console.log('           for the full iteration-discipline rules this script cannot enforce by itself.');

// ── Stratification gap (the documented deviation) ─────────────────────────
console.log('\n── Stratification gap (documented deviation — see PRE_REGISTRATION_PROTOCOL.md §9) ──');
console.log('  ADR-002 ("Why stratified split?") and SPLIT_STRATEGY.md ("Quality Strata") both');
console.log('  specify the 60/20/20 split should be stratified by quality tier (A/B/C/D), with');
console.log('  each tier split 60/20/20 independently. The committed split above is a PLAIN RANDOM');
console.log('  60/20/20 split (scripts/split-corpus.mjs uses mulberry32(42) over the whole valid');
console.log('  corpus, no tier grouping) — it necessarily predates quality labels, since labeling');
console.log('  (Phase 2) only produces those tiers, and the split (Phase 3) is downstream of it in');
console.log('  PRE_REGISTRATION_PROTOCOL.md\'s own timeline, but this split was generated before a');
console.log('  labeling round ran. This is a REAL, currently UNDOCUMENTED deviation from the');
console.log('  pre-registered design. It must be logged in PRE_REGISTRATION_PROTOCOL.md §9');
console.log('  (Deviations & Amendments) by the decision owner — this script surfaces it, it does');
console.log('  not resolve it, and it never silently rebalances the split to fix it (that would be');
console.log('  tuning the split against labels, itself a protocol violation).');

// ── Achieved distribution (informational only) ─────────────────────────────
if (args.labels) {
  const labelsPath = path.resolve(args.labels);
  if (!fs.existsSync(labelsPath)) {
    console.error(`\n[WARN] --labels="${labelsPath}" does not exist — skipping achieved-distribution report.`);
  } else {
    console.log('\n── Achieved quality distribution per partition (informational — never used to re-split) ──');
    const aggregate = JSON.parse(fs.readFileSync(labelsPath, 'utf-8'));

    // Determine the consensus tier per script: majority vote among non-ABSTAIN
    // ratings (PRE_REGISTRATION_PROTOCOL.md §3 "Conflict Resolution" — minor
    // disagreement resolves by majority vote; this script does not attempt
    // major-disagreement consensus resolution, it just reports "MIXED" for
    // scripts with no majority, since that resolution is a human step).
    const consensusByScript = {};
    for (const [id, entry] of Object.entries(aggregate.scripts ?? {})) {
      const tally = {};
      for (const r of entry.ratings ?? []) {
        if (r.tier === 'ABSTAIN') continue;
        tally[r.tier] = (tally[r.tier] ?? 0) + 1;
      }
      const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1]);
      if (ranked.length === 0) continue;
      const [topTier, topCount] = ranked[0];
      const isMajority = ranked.length === 1 || topCount > ranked[1][1];
      consensusByScript[id] = isMajority ? topTier : 'MIXED (no majority)';
    }

    // Need a manifest that carries .id to join against. If the split is
    // pre-migration, recompute ids the same way (requires --corpus-dir).
    let idsByPartition = null;
    if ((split.train?.[0] && 'id' in split.train[0]) || split.train?.length === 0) {
      idsByPartition = {
        train: (split.train ?? []).map((e) => e.id),
        val: (split.val ?? []).map((e) => e.id),
        test: (split.test ?? []).map((e) => e.id),
      };
    } else if (args.corpusDir) {
      const { entries } = loadManifest({ manifestPath: splitFile, corpusDir: path.resolve(args.corpusDir) });
      idsByPartition = { train: [], val: [], test: [] };
      for (const e of entries) if (idsByPartition[e.partition]) idsByPartition[e.partition].push(e.id);
    }

    if (!idsByPartition) {
      console.log('  [SKIPPED] corpus-split.json is pre-migration (no .id fields) and no --corpus-dir was');
      console.log('  given to recompute ids for the join. Run scripts/migrate-corpus-ids.mjs first, or');
      console.log('  re-run this command with --corpus-dir=<path>.');
    } else {
      const summarize = (ids) => {
        const dist = { A: 0, B: 0, C: 0, D: 0, 'MIXED (no majority)': 0, unlabeled: 0 };
        for (const id of ids) {
          const tier = consensusByScript[id];
          if (!tier) dist.unlabeled++;
          else dist[tier] = (dist[tier] ?? 0) + 1;
        }
        return dist;
      };
      for (const part of ['train', 'val']) {
        console.log(`  ${part}: ${JSON.stringify(summarize(idsByPartition[part]))}`);
      }
      if (args.revealTest) {
        console.log('\n  ⚠️  TEST PARTITION REVEALED — this must happen at most once, at final evaluation,');
        console.log('     per MEASUREMENT_RUNBOOK.md §3.3. Record that this happened, and when, alongside');
        console.log('     the P1 gate result.');
        console.log(`  test: ${JSON.stringify(summarize(idsByPartition.test))}`);
      } else {
        console.log('  test: [withheld — pass --reveal-test to view; see discipline note in this file\'s header]');
      }
    }
  }
} else {
  console.log('\n(pass --labels=<collect-labels.mjs aggregate> to also report the achieved quality');
  console.log(' distribution per partition once a labeling round has produced one)');
}

const allPass = checklist.every((c) => c.pass);
console.log('\n' + '═'.repeat(78));
console.log(allPass ? 'MECHANICAL CHECKLIST: ALL PASS' : 'MECHANICAL CHECKLIST: FAILURES ABOVE');
console.log('STRATIFICATION: documented deviation, requires decision-owner sign-off in PRE_REGISTRATION_PROTOCOL.md §9 (see above)');
console.log('═'.repeat(78));

process.exit(allPass ? 0 : 1);
