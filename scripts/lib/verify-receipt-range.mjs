#!/usr/bin/env node
// VERIFY A RECEIPT RANGE WITH THE GATE'S OWN FUNCTIONS, IN THE TREE THAT OWNS
// THEM.
//
// `npm run owner:measure` checks its receipt conversion BEFORE committing, by
// running `addedReceiptLines` + `extractEntries` + `validateEntry` — the gate's
// own exports, never a second copy of the scans. Two details make that a
// separate process rather than an import:
//
//  1. `scripts/check-scoring-receipt.mjs` captures `ROOT = process.cwd()` at
//     module load, and every `git` call it makes runs there. Imported into the
//     orchestrator, it would diff the ORCHESTRATOR's checkout — and the first
//     version of this check did exactly that, reporting "0 entries, 0
//     problems" for a conversion it had never looked at. A check that verifies
//     nothing is worse than no check.
//  2. The gate that should judge a branch's receipt is that BRANCH's gate, the
//     same copy the CLI will run a moment later.
//
// `addedReceiptLines(<single ref>)` diffs that commit against the WORKING TREE,
// which is what makes this a pre-commit check: the conversion is on disk and
// not yet committed, and this is the same diff shape the CLI will see after it
// is.
//
// Output: one JSON object on stdout, `{ entries, headings, problems }`. Exit 0
// always unless something broke — the caller decides what an entry count of
// zero means (it means the check saw nothing, and the caller refuses).
//
// It is called TWICE per range. Before the conversion, for `headings`: the set
// of entries the RANGE ADDS, which is the only set the converter may rewrite
// (the CLI never validates merged history, and `pendingReason` flags entries
// in it that nothing reports). After the conversion, for `problems`.

import path from 'node:path';
import { pathToFileURL } from 'node:url';

function arg(name) {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

const tree = arg('tree');
const base = arg('base');
if (!tree || !base) {
  console.error('verify-receipt-range: --tree=<worktree> --base=<sha> are both required');
  process.exit(2);
}
if (path.resolve(process.cwd()) !== path.resolve(tree)) {
  console.error(`verify-receipt-range: must run with cwd=${tree} (the gate reads process.cwd()); cwd is ${process.cwd()}`);
  process.exit(2);
}

const gate = await import(pathToFileURL(path.join(tree, 'scripts/check-scoring-receipt.mjs')).href);
const added = gate.addedReceiptLines(base);
const entries = gate.extractEntries(added);
const problems = [];
for (const entry of entries) {
  for (const p of gate.validateEntry(entry)) problems.push(`${entry.heading}\n      ${p}`);
}
console.log(JSON.stringify({ entries: entries.length, headings: entries.map((e) => e.heading), problems }));
