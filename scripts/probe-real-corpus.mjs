// Score every screenplay under data/screenplays/ through the real Script
// Doctor pipeline and emit a CSV table: name, sceneCount, wordCount, health,
// grade, verdict, totalIssues. Output is written to
// scripts/output/real-corpus-scores.csv and echoed to stdout.
//
// Purpose: replace the P0 human-validation gate with a runnable
// discrimination probe over REAL produced screenplays. This answers the
// empirical question the P0 gate is really asking — does the score produce
// defensible distinctions on real writing? — without requiring recruiter
// access to 5+ screenwriters.
//
// Run:  node scripts/probe-real-corpus.mjs [--force]
//
// Safety: this probe used to write scripts/output/real-corpus-scores.csv
// unconditionally, even when data/screenplays/ had only a handful of local
// sample scripts instead of the full private corpus — silently overwriting
// the committed evidence file with a near-empty result (see
// scripts/lib/output-guard.mjs header for the incident). It now refuses to
// run against a missing/empty corpus dir and refuses to shrink the
// committed CSV by more than half, unless --force is passed.
import fs from 'node:fs';
import path from 'node:path';
import { runScriptDoctor } from '../server/nvm/analyze/doctor.ts';
import { requireCorpus, guardedWrite } from './lib/output-guard.mjs';

const SRC_DIR = 'data/screenplays';
const OUT_DIR = 'scripts/output';
const OUT_FILE = path.join(OUT_DIR, 'real-corpus-scores.csv');

fs.mkdirSync(OUT_DIR, { recursive: true });

if (!fs.existsSync(SRC_DIR)) {
  console.error(`ERROR: ${SRC_DIR} does not exist — refusing to run.`);
  console.error('This probe requires the private research corpus locally (see MEASUREMENT_RUNBOOK.md). Nothing was written.');
  process.exit(1);
}

function walkDir(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walkDir(fullPath));
    } else if (entry.name.endsWith('.fountain') || entry.name.endsWith('.fountain.txt')) {
      results.push(fullPath);
    }
  }
  return results;
}

const filePaths = walkDir(SRC_DIR).sort();

requireCorpus(filePaths.length, {
  label: `${SRC_DIR} (.fountain/.fountain.txt files)`,
  hint: 'This probe requires the private research corpus locally (see MEASUREMENT_RUNBOOK.md).',
});

const rows = [];
for (const fullPath of filePaths) {
  const file = path.relative(SRC_DIR, fullPath).replace(/\\/g, '/');
  const text = fs.readFileSync(fullPath, 'utf-8');
  const r = await runScriptDoctor(
    text,
    { theme: '', genre: '', directorStyle: '', characters: [] },
    'quick'
  );
  rows.push({
    file,
    sceneCount: r.sceneCount,
    wordCount: r.wordCount,
    health: r.health,
    grade: r.grade,
    verdict: r.verdict,
    totalIssues: r.totalIssues,
    critical: r.issues?.filter((i) => i.severity === 'critical').length ?? 0,
    major: r.issues?.filter((i) => i.severity === 'major').length ?? 0,
    minor: r.issues?.filter((i) => i.severity === 'minor').length ?? 0,
  });
  console.log(
    `${file.padEnd(52)} sc=${String(r.sceneCount).padStart(4)} wc=${String(
      r.wordCount
    ).padStart(6)} H=${String(r.health).padStart(5)} ${r.grade?.padEnd(
      10
    )} ${r.verdict?.padEnd(10)} issues=${r.totalIssues}`
  );
}

const header =
  'file,sceneCount,wordCount,health,grade,verdict,totalIssues,critical,major,minor';
const body = rows
  .map((r) =>
    [
      r.file,
      r.sceneCount,
      r.wordCount,
      r.health,
      r.grade,
      r.verdict,
      r.totalIssues,
      r.critical,
      r.major,
      r.minor,
    ].join(',')
  )
  .join('\n');

guardedWrite(OUT_FILE, header + '\n' + body + '\n', { rowCount: rows.length });
