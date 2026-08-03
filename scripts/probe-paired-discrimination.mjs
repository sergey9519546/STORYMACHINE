// PAIRED DISCRIMINATION HARNESS — does the Script Doctor health score
// separate a real produced screenplay from a mechanically degraded twin
// of the SAME script?
//
// ── Why this exists (read first) ───────────────────────────────────────────
// probe-real-corpus.mjs scored 48 real produced screenplays and found them
// all clustered in a 14-point band (84.6 – 98.9, sd 4.5): every real feature
// scores "RECOMMEND" or "CONSIDER," none "troubled." That alone cannot tell
// us whether the score DISCRIMINATES — every script in that corpus is
// genuinely good (all were greenlit, financed, and shipped), so a tight
// cluster is arguably the correct answer.
//
// This harness settles the question with a controlled experiment: take a
// real script, apply a MECHANICAL, REVERSIBLE degradation that no
// reasonable reader would dispute makes the script worse, and ask whether
// the score falls. If "shuffle every scene into random order" leaves the
// health score unchanged, the score is not reading structure. If "replace
// all dialogue with 'Hello.'" leaves it unchanged, it is not reading
// dialogue. Each degradation isolates one signal channel the doctor claims
// to measure (see DEGRADATIONS table below).
//
// This is a MEASUREMENT INSTRUMENT. It does not modify the engine, the
// score formula, any rule, or any detector — it runs the real, frozen,
// in-repo runScriptDoctor() pipeline on synthetic inputs derived from real
// scripts. It is therefore inside the P0 product/engine code freeze
// (ROADMAP: "Fix critical security issues" is the only allowed code change;
// measuring is not modifying). Output is evidence for the P0/P1 decision,
// not an engine change.
//
// ── The five degradations and the channel each isolates ────────────────────
//   1. SCENE_SHUFFLE     — randomize scene order           → global arc / position
//   2. MIDPOINT_DROP     — delete the middle 20% of scenes  → 3-act structure
//   3. CLIMAX_RELOCATE   — move final scene to position 2   → climax ordering
//   4. DIALOGUE_FLATTEN  — replace all dialogue w/ "Hello." → character/voice
//   5. SCENE_MERGE       — strip all scene headings         → scene boundaries
//
// Each is reversible and deterministic (seeded PRNG for shuffle). Each
// preserves total word count where possible so the result is not
// confounded by the 140/sceneCount scarcity term — except #2 (drop) and
// #5 (merge), which intentionally test exactly those channels (scarcity on
// drop; scene-count signal on merge).
//
// ── Run ────────────────────────────────────────────────────────────────────
//   node scripts/probe-paired-discrimination.mjs <file1.fountain> [file2.fountain ...]
// Output: scripts/output/paired-discrimination.csv + stdout table.
//
// De-identification note: this used to hardcode 5 specific corpus titles
// (curated to be >=40 scenes so the structural degradations have material
// to work on — keep that selection criterion in mind when choosing files to
// pass in). Filenames are read relative to data/screenplays/ (override with
// --src-dir) and now come from CLI arguments instead of hardcoded titles, so
// re-running this script never re-introduces titles into
// scripts/output/paired-discrimination.csv on its own.

// Safety: this probe used to write scripts/output/paired-discrimination.csv
// unconditionally, so a run given fewer/smaller files than a previous run
// silently shrank the committed evidence file (see
// scripts/lib/output-guard.mjs header for the incident this guards
// against). It now refuses to shrink the committed CSV by more than half
// unless --force is passed.
import fs from 'node:fs';
import path from 'node:path';
import { runScriptDoctor } from '../server/nvm/analyze/doctor.ts';
import { normalizeScreenplay } from '../server/nvm/analyze/screenplay-normalizer.ts';
import { parseFountain } from '../src/lib/fountain.ts';
import { guardedWrite } from './lib/output-guard.mjs';

const OUT_DIR = 'scripts/output';
const OUT_FILE = path.join(OUT_DIR, 'paired-discrimination.csv');

function parseArgs(argv) {
  const files = [];
  let srcDir = 'data/screenplays';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--src-dir') srcDir = argv[++i];
    else files.push(argv[i]);
  }
  return { files, srcDir };
}

const { files: TEST_SCRIPTS, srcDir: SRC_DIR } = parseArgs(process.argv.slice(2));
if (TEST_SCRIPTS.length === 0) {
  console.error('Usage: node scripts/probe-paired-discrimination.mjs [--src-dir <dir>] <file1.fountain> [file2.fountain ...]');
  console.error('Runs the 5 mechanical degradations against each given script (read from --src-dir, default data/screenplays/) and appends to scripts/output/paired-discrimination.csv.');
  console.error('Pick scripts with >=40 scenes so the structural degradations (MIDPOINT_DROP, CLIMAX_RELOCATE) have material to work on.');
  process.exit(1);
}

const missingFiles = TEST_SCRIPTS.filter((f) => !fs.existsSync(path.join(SRC_DIR, f)));
if (missingFiles.length > 0) {
  console.error(`ERROR: ${missingFiles.length} file(s) not found under ${SRC_DIR}:`);
  for (const f of missingFiles) console.error(`  ${path.join(SRC_DIR, f)}`);
  console.error('Refusing to run. Nothing was written.');
  process.exit(1);
}

// ── Seeded PRNG (mulberry32) so shuffle is reproducible ────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Fountain scene segmentation ────────────────────────────────────────────
// A scene is a heading line (INT./EXT./EST.) plus all lines until the next
// heading. Matches fountain-analyzer.ts's own segmentation logic.
const HEADING_RE = /^(INT\.|EXT\.|EST\.|INT\/EXT\.)/;

function segmentScenes(text) {
  const lines = text.split(/\r?\n/);
  const scenes = [];
  let current = null;
  let preamble = [];
  for (const line of lines) {
    if (HEADING_RE.test(line.trim())) {
      if (current) scenes.push(current);
      current = { heading: line, body: [] };
    } else if (current) {
      current.body.push(line);
    } else {
      preamble.push(line);
    }
  }
  if (current) scenes.push(current);
  return { preamble, scenes };
}

function reassemble(preamble, scenes) {
  const out = [...preamble];
  for (const s of scenes) {
    out.push(s.heading);
    out.push(...s.body);
  }
  return out.join('\n');
}

// ── The five degradations ──────────────────────────────────────────────────

// 1. SCENE_SHUFFLE — randomize scene order, keep preamble + every scene's
//    internal content intact. Tests whether position-carrying signals
//    (setup-before-payoff, escalation, arc) survive content preservation.
function degradeShuffle(text) {
  const { preamble, scenes } = segmentScenes(text);
  const rng = mulberry32(42);
  const shuffled = scenes.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return reassemble(preamble, shuffled);
}

// 2. MIDPOINT_DROP — delete the middle 20% of scenes. Tests 3-act spine.
function degradeMidpointDrop(text) {
  const { preamble, scenes } = segmentScenes(text);
  const n = scenes.length;
  const start = Math.floor(n * 0.4);
  const end = Math.floor(n * 0.6);
  const kept = scenes.slice(0, start).concat(scenes.slice(end));
  return reassemble(preamble, kept);
}

// 3. CLIMAX_RELOCATE — move the final scene to position 2 (right after the
//    opening). Tests climax-before-resolution ordering.
function degradeClimaxRelocate(text) {
  const { preamble, scenes } = segmentScenes(text);
  if (scenes.length < 3) return text;
  const last = scenes.pop();
  scenes.splice(1, 0, last);
  return reassemble(preamble, scenes);
}

// 4. DIALOGUE_FLATTEN — replace every dialogue block with "Hello." This is
//    the harshest test: if character/voice/subtext channels carry weight,
//    the score must crater. Preserves scene structure and action lines.
//
//    IMPORTANT: must operate on NORMALIZED text. analyzeFountainText calls
//    parseFountain(normalizeScreenplay(fountain)) internally, so the
//    dialogue blocks the engine actually sees are those in the normalized
//    text, not the raw input. Calling parseFountain on raw double-spaced
//    input yields zero dialogue blocks (a known issue the normalizer
//    exists to fix — see screenplay-normalizer.ts header). We normalize
//    first, parse the normalized text to find dialogue line numbers, then
//    flatten those lines in the normalized text and feed THAT to the
//    doctor — exactly the input the engine will analyze.
function degradeDialogueFlatten(text) {
  const normalized = normalizeScreenplay(text);
  const blocks = parseFountain(normalized);
  if (blocks.length === 0) return normalized;
  const dialogueLineNumbers = new Set(
    blocks
      .filter((b) => b.type === 'dialogue' || b.type === 'parenthetical')
      .map((b) => b.lineNumber)
  );
  const lines = normalized.split(/\r?\n/);
  const out = lines.map((line, idx) => {
    const ln = idx + 1;
    return dialogueLineNumbers.has(ln) ? 'Hello.' : line;
  });
  return out.join('\n');
}

// 5. SCENE_MERGE — strip every scene heading. All scenes collapse into one
//    undifferentiated blob. Tests whether scene-boundary detection carries
//    any signal beyond raw word count.
function degradeSceneMerge(text) {
  const lines = text.split(/\r?\n/);
  const out = lines.filter((l) => !HEADING_RE.test(l.trim()));
  return out.join('\n');
}

const DEGRADATIONS = [
  { id: 'SCENE_SHUFFLE', fn: degradeShuffle, channel: 'global arc / position' },
  { id: 'MIDPOINT_DROP', fn: degradeMidpointDrop, channel: '3-act structure' },
  { id: 'CLIMAX_RELOCATE', fn: degradeClimaxRelocate, channel: 'climax ordering' },
  { id: 'DIALOGUE_FLATTEN', fn: degradeDialogueFlatten, channel: 'character/voice/dialogue' },
  { id: 'SCENE_MERGE', fn: degradeSceneMerge, channel: 'scene boundaries' },
];

// ── Main ───────────────────────────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true });

const blankCtx = { theme: '', genre: '', directorStyle: '', characters: [] };

const csvRows = [];
const summary = [];

for (const file of TEST_SCRIPTS) {
  const orig = fs.readFileSync(path.join(SRC_DIR, file), 'utf-8');
  const baseReport = await runScriptDoctor(orig, blankCtx, 'quick');
  const baseHealth = baseReport.health;
  const baseScenes = baseReport.sceneCount;

  console.log(`\n=== ${file} (baseline H=${baseHealth}, ${baseScenes} scenes) ===`);

  for (const deg of DEGRADATIONS) {
    const degraded = deg.fn(orig);
    const report = await runScriptDoctor(degraded, blankCtx, 'quick');
    const delta = report.health - baseHealth;
    const verdict =
      delta <= -10 ? 'STRONG DROP' :
      delta <= -3  ? 'drop' :
      delta <= 3   ? 'NO CHANGE' :
                     'RISE';
    console.log(
      `  ${deg.id.padEnd(18)} H=${String(report.health).padStart(5)}  Δ=${(delta >= 0 ? '+' : '') + delta.toFixed(1).padStart(6)}  ${verdict}  [${deg.channel}]`
    );
    csvRows.push([
      file, deg.id, deg.channel,
      baseHealth, report.health,
      (delta >= 0 ? '+' : '') + delta.toFixed(1),
      baseScenes, report.sceneCount,
      report.wordCount, report.totalIssues, report.verdict,
    ].join(','));
    summary.push({ file, id: deg.id, delta, channel: deg.channel });
  }
}

// ── Aggregate verdict ──────────────────────────────────────────────────────
console.log('\n=== AGGREGATE (does the score discriminate?) ===');
const byDeg = {};
for (const s of summary) {
  if (!byDeg[s.id]) byDeg[s.id] = [];
  byDeg[s.id].push(s.delta);
}
console.log('degradation            | mean Δ   | min Δ    | max Δ    | verdict');
console.log('-----------------------|----------|----------|----------|---------------------------');
for (const deg of DEGRADATIONS) {
  const deltas = byDeg[deg.id];
  const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
  const min = Math.min(...deltas);
  const max = Math.max(...deltas);
  const verdict = mean <= -10 ? 'STRONG signal' : mean <= -3 ? 'real signal' : mean <= 3 ? 'BLIND — no signal' : 'INVERTED (worse scored better)';
  console.log(`${deg.id.padEnd(22)} | ${mean.toFixed(1).padStart(7)} | ${min.toFixed(1).padStart(7)} | ${max.toFixed(1).padStart(7)} | ${verdict}  [${deg.channel}]`);
}

const header = 'file,degradation,channel,baseHealth,degradedHealth,delta,baseScenes,degradedScenes,wordCount,totalIssues,verdict';
guardedWrite(OUT_FILE, header + '\n' + csvRows.join('\n') + '\n', { rowCount: csvRows.length });
