#!/usr/bin/env node
// Score every row of a corpus manifest with ONE tree's doctor, and write the
// numbers as JSON. This is the data `npm run owner:measure`'s manifest re-lock
// needs and the data `--corpus-fixture=public` needs to build its throwaway
// manifest.
//
// WHY IT IS A SEPARATE PROCESS. The doctor being asked is the one on the TREE
// UNDER MEASUREMENT — a branch's own scoring code, not the orchestrator's.
// Importing several branches' doctors into one process would put several
// versions of the same module graph (and their content-hash memoisation) in
// one heap; running each in its own process with `--tree=<worktree>` keeps the
// answer unambiguous: these numbers came from that tree.
//
// WHY IT DOES NOT PRINT. Every row it reads is a corpus file. It writes JSON to
// `--out=<path>` (a local artifact outside the repository, chosen by the
// caller) and prints nothing but counts. The JSON carries hashes and numbers —
// never a title, never a line of text.
//
// RUN (the orchestrator does this; it is not an owner-facing command):
//   node --experimental-strip-types scripts/lib/score-corpus-rows.mjs \
//     --tree=<worktree> --corpus-dir=<corpus> --manifest=<path> --out=<path>

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

function arg(name) {
  const hit = process.argv.slice(2).find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
}

const tree = arg('tree');
const corpusDir = arg('corpus-dir');
const manifestPath = arg('manifest');
const outPath = arg('out');
for (const [flag, value] of [['tree', tree], ['corpus-dir', corpusDir], ['manifest', manifestPath], ['out', outPath]]) {
  if (!value) {
    console.error(`score-corpus-rows: --${flag}=<path> is required`);
    process.exit(2);
  }
}

const doctorPath = path.join(tree, 'server/nvm/analyze/doctor.ts');
if (!existsSync(doctorPath)) {
  console.error(`score-corpus-rows: ${doctorPath} does not exist — is --tree a checkout of this repository?`);
  process.exit(2);
}
const { runScriptDoctor } = await import(pathToFileURL(doctorPath).href);

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const rows = [];
for (let i = 0; i < manifest.length; i++) {
  const entry = manifest[i];
  const full = path.join(corpusDir, entry.file);
  if (!existsSync(full)) {
    // Reported by content hash, never by name: on the private corpus the
    // filename is a screenplay title.
    console.error(`score-corpus-rows: row ${i} (contentHash ${String(entry.contentHash).slice(0, 8)}) is not present in the corpus dir`);
    process.exit(1);
  }
  const report = await runScriptDoctor(readFileSync(full, 'utf8'));
  rows.push({
    index: i,
    contentHash: report.contentHash ?? '',
    health: report.health,
    verdict: report.verdict ?? '',
    sceneCount: report.sceneCount,
  });
}

writeFileSync(outPath, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
console.log(`score-corpus-rows: ${rows.length} rows scored`);
