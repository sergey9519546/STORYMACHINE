// DIMENSION HONESTY AUDIT — does each dimension LABEL match what that
// dimension's SCORE actually responds to?
//
// ── Why this exists ────────────────────────────────────────────────────────
// probe-paired-discrimination.mjs showed the health score is blind to
// three structural degradations (scene shuffle, midpoint drop, climax
// relocate) but responds strongly to dialogue flatten. That was at the
// WHOLE-SCORE level. The report a writer sees is per-DIMENSION: Structure &
// Pacing, Character, Dialogue & Voice, Plot Logic & Payoff, Theme &
// Originality. A writer reading "Structure & Pacing = 68/100 — most of the
// trouble is around revelation drought" reasonably believes the engine
// read their STRUCTURE. If the Structure & Pacing score doesn't move when
// the structure is destroyed (scenes shuffled, climax relocated), that
// label is misleading regardless of what the underlying rule families
// technically measure.
//
// This probe extends the discrimination harness to per-dimension deltas.
// For each degradation, it prints how much EACH dimension's score moved.
// The honesty matrix is then: which labels move under which damage?
//
// Key claim to falsify: the sample report says "The climax is where it
// belongs — the story's single most intense scene lands in the final
// stretch" (sample-coverage-report.html line 376). If CLIMAX_RELOCATE
// (moving the final scene to position 2) does not drop the Structure &
// Pacing dimension, the engine cannot support that claim.
//
// This is a MEASUREMENT INSTRUMENT. It does not modify the engine.
//
// ── Run ────────────────────────────────────────────────────────────────────
//   node scripts/probe-dimension-honesty.mjs [--real-script <file>] [--src-dir <dir>]
// Output: scripts/output/dimension-honesty.csv + stdout table.
//
// De-identification note: this used to hardcode one real corpus title as a
// fixed second cross-check script. The sample-report script (synthetic,
// ships in-repo) always runs; the real-corpus cross-check is now opt-in via
// --real-script so re-running this probe never re-introduces a title into
// scripts/output/dimension-honesty.csv on its own.

import fs from 'node:fs';
import path from 'node:path';
import { runScriptDoctor } from '../server/nvm/analyze/doctor.ts';
import { normalizeScreenplay } from '../server/nvm/analyze/screenplay-normalizer.ts';
import { parseFountain } from '../src/lib/fountain.ts';

const OUT_DIR = 'scripts/output';
const OUT_FILE = path.join(OUT_DIR, 'dimension-honesty.csv');

function parseArgs(argv) {
  let realScript = null;
  let srcDir = 'data/screenplays';
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--real-script') realScript = argv[++i];
    else if (argv[i] === '--src-dir') srcDir = argv[++i];
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log('Usage: node scripts/probe-dimension-honesty.mjs [--real-script <file>] [--src-dir <dir>]');
      console.log('Always runs the in-repo synthetic sample report script. Pass --real-script to additionally');
      console.log('cross-check against a real corpus script (read from --src-dir, default data/screenplays/);');
      console.log('its output label is derived from the filename, not a hardcoded title.');
      process.exit(0);
    }
  }
  return { realScript, srcDir };
}

const { realScript, srcDir: SRC_DIR } = parseArgs(process.argv.slice(2));

// The sample script is what P0 writers actually see; a --real-script arg
// adds a real produced feature for external validity (opt-in, see note above).
const TEST_SCRIPTS = [{ file: '__SAMPLE__', label: 'sample-report-script' }];
if (realScript) {
  const label = `${path.basename(realScript).replace(/\.[a-z0-9.]+$/i, '')} (real)`;
  TEST_SCRIPTS.push({ file: realScript, label });
}

// ── Seeded PRNG ────────────────────────────────────────────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const HEADING_RE = /^(INT\.|EXT\.|EST\.|INT\/EXT\.)/;
const DOT_HEADING_RE = /^\./; // forced-heading form

function segmentScenes(text) {
  const lines = text.split(/\r?\n/);
  const scenes = [];
  let current = null;
  let preamble = [];
  for (const line of lines) {
    const t = line.trim();
    if (HEADING_RE.test(t) || DOT_HEADING_RE.test(t)) {
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

// ── Degradations (same set as paired-discrimination) ──────────────────────
function degradeShuffle(text) {
  const { preamble, scenes } = segmentScenes(text);
  if (scenes.length < 3) return text;
  const rng = mulberry32(42);
  const shuffled = scenes.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return reassemble(preamble, shuffled);
}

function degradeMidpointDrop(text) {
  const { preamble, scenes } = segmentScenes(text);
  const n = scenes.length;
  if (n < 5) return text;
  const start = Math.floor(n * 0.4);
  const end = Math.floor(n * 0.6);
  const kept = scenes.slice(0, start).concat(scenes.slice(end));
  return reassemble(preamble, kept);
}

function degradeClimaxRelocate(text) {
  const { preamble, scenes } = segmentScenes(text);
  if (scenes.length < 3) return text;
  const last = scenes.pop();
  scenes.splice(1, 0, last);
  return reassemble(preamble, scenes);
}

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
  const out = lines.map((line, idx) =>
    dialogueLineNumbers.has(idx + 1) ? 'Hello.' : line
  );
  return out.join('\n');
}

function degradeSceneMerge(text) {
  const lines = text.split(/\r?\n/);
  const out = lines.filter((l) => {
    const t = l.trim();
    return !HEADING_RE.test(t) && !DOT_HEADING_RE.test(t);
  });
  return out.join('\n');
}

const DEGRADATIONS = [
  { id: 'SCENE_SHUFFLE', fn: degradeShuffle, channel: 'global arc / position' },
  { id: 'MIDPOINT_DROP', fn: degradeMidpointDrop, channel: '3-act structure' },
  { id: 'CLIMAX_RELOCATE', fn: degradeClimaxRelocate, channel: 'climax ordering' },
  { id: 'DIALOGUE_FLATTEN', fn: degradeDialogueFlatten, channel: 'character/voice/dialogue' },
  { id: 'SCENE_MERGE', fn: degradeSceneMerge, channel: 'scene boundaries' },
];

// ── Load sample script ────────────────────────────────────────────────────
async function loadSample() {
  const mod = await import('../src/lib/sample-script.ts');
  // The sample is exported as a Fountain string; find the export.
  const exported = Object.values(mod)[0];
  return typeof exported === 'string' ? exported : exported?.fountain ?? String(exported);
}

// ── Main ───────────────────────────────────────────────────────────────────
fs.mkdirSync(OUT_DIR, { recursive: true });
const blankCtx = { theme: '', genre: '', directorStyle: '', characters: [] };

const csvRows = [];

for (const { file, label } of TEST_SCRIPTS) {
  const orig = file === '__SAMPLE__'
    ? await loadSample()
    : fs.readFileSync(path.join(SRC_DIR, file), 'utf-8');

  const base = await runScriptDoctor(orig, blankCtx, 'quick');
  const baseDims = {};
  for (const d of base.dimensions) baseDims[d.label] = d.score;

  console.log(`\n=== ${label} (baseline H=${base.health}) ===`);
  console.log('  baseline dimensions:', JSON.stringify(baseDims));

  for (const deg of DEGRADATIONS) {
    const degraded = deg.fn(orig);
    const rep = await runScriptDoctor(degraded, blankCtx, 'quick');
    const dimDeltas = {};
    for (const d of rep.dimensions) {
      const before = baseDims[d.label];
      if (before !== undefined) dimDeltas[d.label] = +(d.score - before).toFixed(1);
    }
    const hDelta = +(rep.health - base.health).toFixed(1);
    console.log(
      `  ${deg.id.padEnd(18)} H Δ=${(hDelta >= 0 ? '+' : '') + String(hDelta).padStart(6)}  | per-dim:`,
      JSON.stringify(dimDeltas)
    );
    csvRows.push([
      label, deg.id, deg.channel,
      base.health, rep.health, (hDelta >= 0 ? '+' : '') + hDelta,
      JSON.stringify(baseDims), JSON.stringify(dimDeltas),
    ].join(','));
  }
}

const header = 'script,degradation,channel,baseHealth,degradedHealth,healthDelta,baseDimensions,dimDeltas';
fs.writeFileSync(OUT_FILE, header + '\n' + csvRows.join('\n') + '\n', 'utf-8');
console.log(`\nWrote ${csvRows.length} rows to ${OUT_FILE}`);
