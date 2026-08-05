// Real-script discrimination evidence generator (Lever 2 of the active-work
// prompt). Runs the CURRENT Script Doctor over REAL produced screenplays and
// reports — WITHOUT CHANGING THE SCORE — what the score actually does on real
// writing. This is freeze-permitted evidence about the current score, not an
// engine change.
//
// WHY: through every prior wave the score has only been measured on synthetic
// fixtures and the 20 controlled calibration samples, plus the regression
// harness in tests/core/real-script-corpus.test.ts (which ASSERTS floors but
// prints nothing for a human to read). This script IS the runnable, human-
// readable version of that evidence: it prints the produced-class distribution,
// the two structural-degradation AUCs, and a manifest cross-check, then ends
// with an honest plain-language summary of what those numbers do and do NOT
// show.
//
// HONESTY BOUNDARY (project constitution — see SCREENPLAY_SOURCING_TODO.md
// Task 1): there is NO weak human-written contrast class. The corpus is the
// STRONG class only (produced features). Therefore this script does NOT and
// CANNOT claim "strong-vs-weak" discrimination. It reports exactly three
// honest things:
//   (a) PRODUCED-FLOOR: does the score stay sane (>= 80) on real produced
//       features, or does it collapse on real material the way the original
//       ORPHAN_CLUE flood did?
//   (b) DISTRIBUTION: what does the score's spread look like on real writing?
//   (c) DEGRADATION-DISCRIMINATION: does the score DROP when scenes are
//       shuffled/dropped (shuffle-drop) or acts reordered (act-swap)? i.e.
//       does it notice STRUCTURAL damage? This is a paired test (intact vs a
//       deterministically scrambled version of the SAME script), NOT a
//       strong-vs-weak test.
//
// COPYRIGHT BOUNDARY (identical rule to tests/core/real-script-corpus.test.ts
// and scripts/measure-slop-discrimination.ts): the screenplay text is local-
// only and NEVER committed. The corpus is pointed at by REAL_SCRIPT_CORPUS_DIR.
// When that env var is unset, this script SKIPS with an honest message and
// exit code 0 — exactly like the test harness does — so an unset env never
// masquerades as a pass or a fail. The committed artifact is this script plus
// the numbers it prints, both reproducible against any equivalent corpus.
//
// RUN:
//   REAL_SCRIPT_CORPUS_DIR="../real-script-corpus" npm run measure-real
//
// This is a measurement tool, not engine code: it adds no rules, touches no
// formula, and imports only the existing deterministic surface
// (runScriptDoctor + the seeded PRNG the regression harness already uses).

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runScriptDoctor } from '../server/nvm/analyze/doctor.ts';
import { makePrng, seedFromString, shuffle } from '../server/nvm/repro/seed.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Corpus gating (mirrors tests/core/real-script-corpus.test.ts exactly) ──
// Three distinct states, kept distinct so a misconfiguration reads as a clean
// skip with an honest message rather than a silent pass or a confusing crash:
//   1. unset     → the copyright-boundary skip (honest, expected in CI / when
//                  the corpus isn't on this machine).
//   2. set-broken→ the env var points at a path that doesn't exist or isn't a
//                  directory. Almost always a typo. Fail once, clearly.
//   3. set-valid → run the measurement below.
const CORPUS_DIR = process.env.REAL_SCRIPT_CORPUS_DIR ?? '';

function exitSkip(reason: string): never {
  console.log(`\n[SKIP] ${reason}`);
  console.log('  Set REAL_SCRIPT_CORPUS_DIR to a local directory of *.fountain.txt');
  console.log('  produced screenplays to run this measurement. The corpus is local-only');
  console.log('  (copyright) and is never committed; an unset env var is the expected state in CI.');
  process.exit(0);
}

if (!CORPUS_DIR) {
  exitSkip('REAL_SCRIPT_CORPUS_DIR not set — corpus text is local-only (copyright).');
}
if (!existsSync(CORPUS_DIR) || !statSync(CORPUS_DIR).isDirectory()) {
  // A set-but-broken path is almost certainly a typo; surface it loudly rather
  // than silently producing an empty report that could be mistaken for "the
  // score has nothing to say."
  console.error(`\n[FATAL] REAL_SCRIPT_CORPUS_DIR is set to "${CORPUS_DIR}" but that path does`);
  console.error('        not exist or is not a directory. Fix the path, or unset it to skip cleanly.');
  process.exit(2);
}

// ── Manifest (facts only, committed; same file the regression test locks) ──
interface ManifestEntry {
  name: string;
  file: string;
  contentHash: string;
  health: number;
  verdict: string;
  sceneCount: number;
}
const MANIFEST_PATH = path.join(__dirname, '../tests/fixtures/real-corpus-manifest.json');
const MANIFEST: ManifestEntry[] = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const MANIFEST_BY_FILE = new Map(MANIFEST.map(m => [m.file, m]));

/** Produced-feature floor — the same 80 the regression harness asserts. Every
 *  professionally produced, correctly extracted feature in the corpus scores
 *  >= 80 today; a produced script below the floor is, by this project's own
 *  premise, a systemic scoring bug until proven otherwise (the ORPHAN_CLUE
 *  flood that motivated the harness produced health 0, not 80). */
const PRODUCED_FLOOR = 80;
const MIN_LINES = 50; // skip < 50-line fragments/stubs (same cutoff as measure-slop)

// ── Discovery: every eligible screenplay in the corpus dir ──────────────────
interface CorpusFile {
  file: string;
  text: string;
  lines: number;
}
const corpusFiles: CorpusFile[] = [];

function walkCorpusDir(dir: string): string[] {
  let results: string[] = [];
  const list = readdirSync(dir, { withFileTypes: true });
  for (const entry of list) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(walkCorpusDir(fullPath));
    } else if (entry.name.endsWith('.fountain') || entry.name.endsWith('.fountain.txt') || entry.name.endsWith('.txt')) {
      results.push(fullPath);
    }
  }
  return results;
}

const discoveredFiles = walkCorpusDir(CORPUS_DIR).sort();
for (const full of discoveredFiles) {
  const f = path.relative(CORPUS_DIR, full).replace(/\\/g, '/');
  let text: string;
  try {
    text = readFileSync(full, 'utf8');
  } catch {
    continue;
  }
  const lines = text.split('\n').length;
  if (lines < MIN_LINES) continue;
  corpusFiles.push({ file: f, text, lines });
}
if (corpusFiles.length === 0) {
  console.error(`\n[FATAL] no eligible screenplays (>= ${MIN_LINES} lines, *.fountain/*.fountain.txt) in ${CORPUS_DIR}`);
  process.exit(1);
}

console.log('═'.repeat(78));
console.log('REAL-SCRIPT DISCRIMINATION EVIDENCE — current Script Doctor on produced features');
console.log('═'.repeat(78));
console.log(`corpus dir           : ${CORPUS_DIR}`);
console.log(`eligible scripts     : ${corpusFiles.length} (*.fountain.txt, >= ${MIN_LINES} lines)`);
console.log(`manifest entries     : ${MANIFEST.length}`);
console.log(`produced floor       : health >= ${PRODUCED_FLOOR}`);
console.log(`NOTE                 : corpus is the STRONG (produced) class only. There is NO weak`);
console.log(`                       human-written contrast class (see SCREENPLAY_SOURCING_TODO.md`);
console.log(`                       Task 1). Outputs below are produced-floor + degradation only,`);
console.log(`                       NOT strong-vs-weak discrimination.`);

// ── 1 + 2: run the doctor over every produced script, capture the report ───
interface Row {
  file: string;
  health: number;
  grade: string;
  verdict: string;
  sceneCount: number;
  wordCount: number;
  totalIssues: number;
  bySeverity: { critical: number; major: number; minor: number };
  contentHash: string;
  lines: number;
  dimensions: Array<{ key: string; label: string; score: number; issueCount: number }>;
}
const rows: Row[] = [];
const tStart = Date.now();
for (let i = 0; i < corpusFiles.length; i++) {
  const cf = corpusFiles[i];
  process.stdout.write(`\r  analyzing ${String(i + 1).padStart(2)}/${corpusFiles.length} scripts...`);
  const report = await runScriptDoctor(cf.text);
  rows.push({
    file: cf.file,
    health: report.health,
    grade: report.grade,
    verdict: report.verdict ?? '(none)',
    sceneCount: report.sceneCount,
    wordCount: report.wordCount,
    totalIssues: report.totalIssues,
    bySeverity: report.bySeverity,
    contentHash: report.contentHash ?? '',
    lines: cf.lines,
    dimensions: (report.dimensions ?? []).map(d => ({
      key: d.key, label: d.label, score: d.score, issueCount: d.issueCount,
    })),
  });
}
process.stdout.write('\r' + ' '.repeat(60) + '\r');
const elapsedMs = Date.now() - tStart;

// ── 3: produced-class distribution ─────────────────────────────────────────
const healths = rows.map(r => r.health).sort((a, b) => a - b);
const n = rows.length;
const mean = healths.reduce((a, b) => a + b, 0) / n;
const median = n % 2 === 1 ? healths[(n - 1) / 2] : (healths[n / 2 - 1] + healths[n / 2]) / 2;
const min = healths[0];
const max = healths[n - 1];
const belowFloor = rows.filter(r => r.health < PRODUCED_FLOOR).length;

function bucket(h: number): string {
  if (h < 60) return '00-59  (PASS band)';
  if (h < 70) return '60-69';
  if (h < 80) return '70-79';
  if (h < 85) return '80-84';
  if (h < 90) return '85-89';
  if (h < 95) return '90-94';
  return '95-100';
}
const hist = new Map<string, number>();
for (const r of rows) hist.set(bucket(r.health), (hist.get(bucket(r.health)) ?? 0) + 1);
const histOrder = ['00-59  (PASS band)', '60-69', '70-79', '80-84', '85-89', '90-94', '95-100'];

const verdictCounts = new Map<string, number>();
for (const r of rows) verdictCounts.set(r.verdict, (verdictCounts.get(r.verdict) ?? 0) + 1);
const gradeCounts = new Map<string, number>();
for (const r of rows) gradeCounts.set(r.grade, (gradeCounts.get(r.grade) ?? 0) + 1);

console.log('\n── 1. PRODUCED-CLASS HEALTH DISTRIBUTION ────────────────────────────────');
console.log(`scripts measured     : ${n}   (pipeline elapsed ${(elapsedMs / 1000).toFixed(1)}s)`);
console.log(`health mean          : ${mean.toFixed(2)}`);
console.log(`health median        : ${median.toFixed(2)}`);
console.log(`health min / max     : ${min.toFixed(1)} / ${max.toFixed(1)}`);
console.log(`below floor (< ${PRODUCED_FLOOR})  : ${belowFloor} / ${n}  ${belowFloor === 0 ? '— floor holds on every produced feature' : '— SEE MANIFEST NOTE, possible systemic issue'}`);
console.log('\nhealth histogram:');
const histMax = Math.max(...[...hist.values()]);
for (const b of histOrder) {
  const c = hist.get(b) ?? 0;
  const bar = c === 0 ? '' : '█'.repeat(Math.max(1, Math.round((c / histMax) * 40)));
  console.log(`  ${b.padEnd(20)} ${String(c).padStart(3)}  ${bar}`);
}
console.log('\nverdict breakdown (health + sceneCount thresholds):');
for (const v of ['RECOMMEND', 'CONSIDER', 'PASS', '(none)']) {
  const c = verdictCounts.get(v) ?? 0;
  if (c > 0) console.log(`  ${v.padEnd(12)} ${String(c).padStart(3)}   (${((c / n) * 100).toFixed(1)}%)`);
}
console.log('\ngrade breakdown:');
for (const g of ['excellent', 'strong', 'solid', 'uneven', 'troubled']) {
  const c = gradeCounts.get(g) ?? 0;
  if (c > 0) console.log(`  ${g.padEnd(12)} ${String(c).padStart(3)}   (${((c / n) * 100).toFixed(1)}%)`);
}
console.log(`\ntotal issues across corpus : ${rows.reduce((s, r) => s + r.totalIssues, 0)}`);
console.log(`  critical                 : ${rows.reduce((s, r) => s + r.bySeverity.critical, 0)}`);
console.log(`  major                    : ${rows.reduce((s, r) => s + r.bySeverity.major, 0)}`);
console.log(`  minor                    : ${rows.reduce((s, r) => s + r.bySeverity.minor, 0)}`);

// Per-dimension spread (informational — the 5 writer-facing sub-scores).
const dimKeys = rows[0]?.dimensions.map(d => d.key) ?? [];
if (dimKeys.length > 0) {
  console.log('\nper-dimension score spread (displayed DimensionScore, NOT overall health):');
  for (const key of dimKeys) {
    const scores = rows.map(r => r.dimensions.find(d => d.key === key)?.score ?? NaN).filter(s => !Number.isNaN(s));
    if (scores.length === 0) continue;
    scores.sort((a, b) => a - b);
    const dm = scores.reduce((a, b) => a + b, 0) / scores.length;
    const label = rows[0].dimensions.find(d => d.key === key)?.label ?? key;
    console.log(`  ${label.padEnd(24)} mean ${dm.toFixed(1).padStart(5)}  min ${scores[0].toFixed(1).padStart(5)}  max ${scores[scores.length - 1].toFixed(1).padStart(5)}`);
  }
}

// ── 4: shuffle-drop + act-swap AUC over the first 24 manifest files ────────
// Recipes copied VERBATIM from tests/core/real-script-corpus.test.ts so the
// numbers this script prints are the same numbers the regression harness
// ratchets against — no methodology drift between the two artifacts.
const AUC_SUBSET = 24;

function splitScenes(t: string): { head: string; scenes: string[] } {
  const parts = t.split(/^(?=INT\.|EXT\.)/mi);
  const head = /^(INT\.|EXT\.)/i.test(parts[0]) ? '' : parts.shift() ?? '';
  const scenes = parts.filter(x => /^(INT\.|EXT\.)/i.test(x));
  return { head, scenes };
}

/** Recipe 1 (shuffle-drop): seeded scene shuffle + every 3rd scene dropped.
 *  Surface craft (prose, dialogue, action lines) is byte-identical; GLOBAL
 *  structure (scene ORDER, continuity, density) is destroyed. */
function shuffleDrop(t: string, file: string): string {
  const { head, scenes } = splitScenes(t);
  const rng = makePrng(seedFromString(`degrade:${file}`));
  return head + shuffle(rng, scenes).filter((_, i) => i % 3 !== 2).join('');
}

/** Recipe 2 (act-swap): cut into three contiguous thirds by scene count,
 *  reordered 3rd-1st-2nd. Every scene KEEPS its immediate neighbors (local
 *  adjacency, character continuity, day/night runs all preserved within each
 *  third); only the GLOBAL arc is destroyed (the climax now opens the doc). */
function actSwap(t: string): string {
  const { head, scenes } = splitScenes(t);
  const n = scenes.length;
  const a = Math.ceil(n / 3);
  const b = Math.ceil((n / 3) * 2);
  const thirds = [scenes.slice(0, a), scenes.slice(a, b), scenes.slice(b)];
  return head + [...thirds[2], ...thirds[0], ...thirds[1]].join('');
}

/** Pairwise AUC: fraction of (good, bad) pairs where good > bad, with ties
 *  counted as half. 0.5 = coin flip (no separation), 1.0 = perfect separation,
 *  < 0.5 = the score is INVERTED (rates scrambled ABOVE intact). This is the
 *  same statistic the regression harness ratchets against. */
function auc(goods: number[], bads: number[]): number {
  let wins = 0, ties = 0;
  for (const g of goods) for (const b of bads) {
    if (g > b) wins++; else if (g === b) ties++;
  }
  return (wins + ties / 2) / (goods.length * bads.length);
}

// The AUC subset is the FIRST 24 manifest files (manifest order, not directory
// order) — same convention as the regression harness, so the two are directly
// comparable.
const aucFiles = MANIFEST.slice(0, AUC_SUBSET).map(m => m.file);
const presentAucFiles = aucFiles.filter(f => corpusFiles.some(c => c.file === f));
if (presentAucFiles.length < aucFiles.length) {
  console.log(`\n[AUC] note: ${aucFiles.length - presentAucFiles.length} of the first ${AUC_SUBSET} manifest`);
  console.log('       files are not present in the corpus dir; running AUC on the subset that is present.');
}
const aucSubset = presentAucFiles
  .map(f => corpusFiles.find(c => c.file === f)!)
  .filter(Boolean);

interface AucResult {
  name: string;
  auc: number;
  meanGood: number;
  meanBad: number;
  goods: number[];
  bads: number[];
}
async function measureAuc(
  name: string,
  degrade: (text: string, file: string) => string,
): Promise<AucResult> {
  const goods: number[] = [], bads: number[] = [];
  for (let i = 0; i < aucSubset.length; i++) {
    const cf = aucSubset[i];
    process.stdout.write(`\r  ${name}: ${String(i + 1).padStart(2)}/${aucSubset.length}`);
    goods.push((await runScriptDoctor(cf.text)).health);
    bads.push((await runScriptDoctor(degrade(cf.text, cf.file))).health);
  }
  process.stdout.write('\r' + ' '.repeat(60) + '\r');
  const meanGood = goods.reduce((a, b) => a + b, 0) / goods.length;
  const meanBad = bads.reduce((a, b) => a + b, 0) / bads.length;
  return { name, auc: auc(goods, bads), meanGood, meanBad, goods, bads };
}

console.log(`\n── 2. STRUCTURAL-DEGRADATION AUC (first ${AUC_SUBSET} manifest scripts, n=${aucSubset.length}) ──`);
console.log('Paired test: each script vs a deterministically SCRAMBLED version of itself.');
console.log('AUC 0.5 = coin flip (score does not notice the damage); 1.0 = perfect; < 0.5 = inverted.');
console.log('This tests whether the score DROPS when structure is destroyed — it is NOT strong-vs-weak.');

const shuffleResult = await measureAuc('shuffle-drop', shuffleDrop);
const actResult = await measureAuc('act-swap   ', actSwap);

function printAuc(r: AucResult, interpretation: string): void {
  console.log(`\n  ${r.name}`);
  console.log(`    AUC                  : ${r.auc.toFixed(3)}`);
  console.log(`    mean intact health   : ${r.meanGood.toFixed(2)}`);
  console.log(`    mean degraded health : ${r.meanBad.toFixed(2)}`);
  console.log(`    mean drop            : ${(r.meanGood - r.meanBad).toFixed(2)} pts`);
  console.log(`    what it means        : ${interpretation}`);
}

printAuc(shuffleResult,
  'Does the score DROP when scenes are shuffled and every 3rd scene is dropped? ' +
  'Surface craft (prose, dialogue) is identical; only global structure is destroyed. ' +
  'High AUC = the score notices wholesale structural scrambling.');
printAuc(actResult,
  'Does the score DROP when the script is cut into thirds and reordered 3rd-1st-2nd? ' +
  'Every scene keeps its immediate neighbors (local continuity preserved); only the ' +
  'global arc is destroyed. High AUC = the score notices global-arc / act-order damage.');

// ── 5: manifest cross-check (exact if hash matches, floor otherwise) ───────
console.log('\n── 3. MANIFEST CROSS-CHECK ─────────────────────────────────────────────');
console.log('(manifest = tests/fixtures/real-corpus-manifest.json, the locked expectations)');
console.log(' hash MATCH    → freshly computed health/verdict/sceneCount must match EXACTLY');
console.log(' hash MISMATCH → only the produced-floor (health >= ' + PRODUCED_FLOOR + ') must hold');
console.log();

let exactMatch = 0, hashMatch = 0, floorOnly = 0, floorHolds = 0;
const mismatches: Array<{ file: string; kind: string; detail: string }> = [];
let notInManifest = 0;

for (const r of rows) {
  const m = MANIFEST_BY_FILE.get(r.file);
  if (!m) {
    notInManifest++;
    continue;
  }
  const hashMatches = r.contentHash === m.contentHash;
  if (hashMatches) {
    hashMatch++;
    exactMatch++;
    if (r.health !== m.health) {
      mismatches.push({ file: r.file, kind: 'health (hash match)', detail: `got ${r.health}, manifest ${m.health}` });
    }
    if (r.verdict !== m.verdict) {
      mismatches.push({ file: r.file, kind: 'verdict (hash match)', detail: `got ${r.verdict}, manifest ${m.verdict}` });
    }
    if (r.sceneCount !== m.sceneCount) {
      mismatches.push({ file: r.file, kind: 'sceneCount (hash match)', detail: `got ${r.sceneCount}, manifest ${m.sceneCount}` });
    }
  } else {
    floorOnly++;
    if (r.health >= PRODUCED_FLOOR) floorHolds++;
    else mismatches.push({ file: r.file, kind: 'floor (hash mismatch)', detail: `health ${r.health} < floor ${PRODUCED_FLOOR}` });
  }
}
console.log(`in manifest           : ${rows.length - notInManifest} / ${rows.length} scripts`);
console.log(`  hash exact match    : ${hashMatch}  (byte-identical input → exact health/verdict/sceneCount)`);
console.log(`  floor-only          : ${floorOnly}  (hash differs; only health >= ${PRODUCED_FLOOR} required, holds on ${floorHolds})`);
console.log(`not in manifest       : ${notInManifest}  (computed but no locked expectation)`);
console.log(`mismatches            : ${mismatches.length}`);
if (mismatches.length > 0) {
  console.log('\n  MISMATCH DETAILS:');
  for (const mm of mismatches.slice(0, 30)) {
    console.log(`    ${mm.file.padEnd(50)} ${mm.kind.padEnd(22)} ${mm.detail}`);
  }
  if (mismatches.length > 30) console.log(`    ... and ${mismatches.length - 30} more`);
} else {
  console.log('  (every hash-matching script matches its manifest exactly; every hash-mismatch clears the floor)');
}

// ── 6: honest plain-language summary ───────────────────────────────────────
console.log('\n═'.repeat(78));
console.log('HONEST SUMMARY — what the current score does and does NOT show on real writing');
console.log('═'.repeat(78));
console.log(`
WHAT IT DOES SHOW (measured here, ${n} produced features):
  1. PRODUCED-FLOOR holds. ${belowFloor === 0
    ? `Every produced feature scored health >= ${PRODUCED_FLOOR} (range ${min.toFixed(1)}-${max.toFixed(1)}, mean ${mean.toFixed(1)}).`
    : `${belowFloor} of ${n} produced features fell BELOW the ${PRODUCED_FLOOR} floor — see the mismatch list above.`}
     This is the regression the corpus was built to catch: the original ORPHAN_CLUE
     flood saturated four produced features to health 0; the floor guarantees that
     class of systemic collapse is immediately visible.
  2. DEGRADATION-DISCRIMINATION:
     - shuffle-drop AUC ${shuffleResult.auc.toFixed(3)} (mean intact ${shuffleResult.meanGood.toFixed(1)} → degraded ${shuffleResult.meanBad.toFixed(1)}).
     - act-swap    AUC ${actResult.auc.toFixed(3)} (mean intact ${actResult.meanGood.toFixed(1)} → degraded ${actResult.meanBad.toFixed(1)}).
     These say whether the score DROPS when a script's structure is deterministically
     destroyed (scrambled scene order, or thirds reordered). AUC 1.0 = it always drops;
     0.5 = it is structure-blind on that recipe.

WHAT IT DOES NOT SHOW (the missing piece — do not over-claim):
  This is NOT "strong-vs-weak craft" discrimination. The corpus is the STRONG
  (produced-feature) class only. There is no weak human-written contrast class —
  docs/p1-benchmark/SCREENPLAY_SOURCING_TODO.md Task 1 documents this as the open
  gap. So nothing here proves the score ORDERS a genuinely weak human script below
  a genuinely strong one. The degradation AUCs are a paired structural-damage test
  (intact vs scrambled versions of the SAME produced script), not a craft-quality
  test across different scripts. Calling produced-floor "strong-vs-weak
  discrimination" would be the fabrication this project's constitution forbids.
`);
console.log('═'.repeat(78));
process.exit(0);
