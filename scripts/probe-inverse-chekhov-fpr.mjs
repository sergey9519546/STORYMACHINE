// False-positive-rate probe for INVERSE_CHEKHOV_GUN (causality.ts, added
// 2026-08-07 in response to the pilot session's Chet's-blade miss — see
// pilot-session-2026-08-07/PILOT_SESSION_REPORT.md §5).
//
// Runs every script in REAL_SCRIPT_CORPUS_DIR through the full doctor
// pipeline and reports, per script, whether INVERSE_CHEKHOV_GUN fired. A
// detector firing on a large fraction of professionally produced features
// (which should have very few genuine unearned climax payoffs) is measuring
// noise, not craft. Reports the number honestly per CLAUDE.md's
// measure-before-threshold discipline.
//
// Run:  REAL_SCRIPT_CORPUS_DIR=<path> node scripts/probe-inverse-chekhov-fpr.mjs
import fs from 'node:fs';
import path from 'node:path';
import { runScriptDoctor } from '../server/nvm/analyze/doctor.ts';

const CORPUS_DIR = process.env.REAL_SCRIPT_CORPUS_DIR;
if (!CORPUS_DIR) {
  console.error('ERROR: REAL_SCRIPT_CORPUS_DIR is not set. Nothing was run.');
  process.exit(1);
}
if (!fs.existsSync(CORPUS_DIR) || !fs.statSync(CORPUS_DIR).isDirectory()) {
  console.error(`ERROR: REAL_SCRIPT_CORPUS_DIR="${CORPUS_DIR}" does not exist or is not a directory.`);
  process.exit(1);
}

const files = fs.readdirSync(CORPUS_DIR)
  .filter(f => f.endsWith('.fountain') || f.endsWith('.fountain.txt'))
  .sort();

if (files.length === 0) {
  console.error(`ERROR: no .fountain/.fountain.txt files found in ${CORPUS_DIR}.`);
  process.exit(1);
}

let fireCount = 0;
const fired = [];
const rows = [];

for (const file of files) {
  const fullPath = path.join(CORPUS_DIR, file);
  const text = fs.readFileSync(fullPath, 'utf-8');
  const report = await runScriptDoctor(text, { theme: '', genre: '', directorStyle: '', characters: [] }, 'quick');
  // NOTE: ScriptDoctorReport has NO flat top-level `issues` array — issues
  // live per-pass under `report.passes[].issues` (see server/nvm/analyze/
  // types.ts's ScriptDoctorReport). INVERSE_CHEKHOV_GUN only ever fires from
  // the 'causality' pass (server/nvm/revision/passes/causality.ts).
  const causalityPass = (report.passes ?? []).find(p => p.pass === 'causality');
  const hits = (causalityPass?.issues ?? []).filter(i => i.rule === 'INVERSE_CHEKHOV_GUN');
  const didFire = hits.length > 0;
  if (didFire) { fireCount++; fired.push(file); }
  rows.push({ file, sceneCount: report.sceneCount, fired: didFire, detail: hits[0]?.description ?? '' });
  console.log(`${file.padEnd(55)} sc=${String(report.sceneCount).padStart(4)} INVERSE_CHEKHOV_GUN=${didFire ? 'FIRED' : 'no'}${didFire ? `  -> ${hits[0].description}` : ''}`);
}

console.log('');
console.log(`Total scripts: ${files.length}`);
console.log(`Fired on: ${fireCount} (${((fireCount / files.length) * 100).toFixed(1)}%)`);
if (fired.length > 0) {
  console.log('Fired scripts:');
  for (const f of fired) console.log(`  - ${f}`);
}

const OUT_DIR = 'scripts/output';
fs.mkdirSync(OUT_DIR, { recursive: true });
const outFile = path.join(OUT_DIR, 'inverse-chekhov-fpr.csv');
const header = 'file,sceneCount,fired,detail';
const body = rows.map(r => [r.file, r.sceneCount, r.fired, JSON.stringify(r.detail)].join(',')).join('\n');
fs.writeFileSync(outFile, header + '\n' + body + '\n');
console.log(`\nWrote ${outFile}`);
