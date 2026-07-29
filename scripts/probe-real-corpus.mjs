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
// Run:  node scripts/probe-real-corpus.mjs
import fs from 'node:fs';
import path from 'node:path';
import { runScriptDoctor } from '../server/nvm/analyze/doctor.ts';

const SRC_DIR = 'data/screenplays';
const OUT_DIR = 'scripts/output';
const OUT_FILE = path.join(OUT_DIR, 'real-corpus-scores.csv');

fs.mkdirSync(OUT_DIR, { recursive: true });

const files = fs
  .readdirSync(SRC_DIR)
  .filter((f) => f.endsWith('.fountain'))
  .sort();

const rows = [];
for (const file of files) {
  const text = fs.readFileSync(path.join(SRC_DIR, file), 'utf-8');
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

fs.writeFileSync(OUT_FILE, header + '\n' + body + '\n', 'utf-8');
console.log(`\nWrote ${rows.length} rows to ${OUT_FILE}`);
