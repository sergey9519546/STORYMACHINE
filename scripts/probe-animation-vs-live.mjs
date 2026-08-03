// ANIMATION VS LIVE-ACTION DIALOGUE DELTA — confirm the hypothesis that the
// previous 0.906 dialogue AUC was an artifact of the animation-heavy corpus.
// Animation scripts have dense dialogue (many short scenes, many characters);
// live-action features have proportionally more action. We compare the
// DIALOGUE_FLATTEN delta distribution across the two groups.
//
// ============================================================================
// DEPENDENCY FLAG — READ BEFORE TRUSTING THE ORIGIN SPLIT BELOW
// ============================================================================
// This probe used to classify a script as "live-action" vs "animation" purely
// from its corpus-split.json path: `crawl/` prefix => live-action crawl
// corpus, no prefix (root-level) => the original animation-heavy corpus. The
// corpus de-identification effort (docs/p1-benchmark/CORPUS_IDENTIFICATION.md,
// owned by a sibling change) flattens/renames corpus files to opaque
// `SM-<8 hex>` ids, which destroys that path-prefix signal — a de-identified
// entry has no `crawl/` prefix to test.
//
// The sibling migration (scripts/migrate-corpus-ids.mjs) adds an `origin`
// field to each corpus-split.json entry ('crawl' | 'root') plus a `genre`
// field, specifically so this probe's classification survives migration —
// confirmed by reading that script's own "genre / origin extraction" comment
// and `classify()` function (search "FIELD NAME CHOSEN" in
// migrate-corpus-ids.mjs). AS OF THIS EDIT the migration had been written
// but not yet RUN — corpus-split.json on disk still only carries
// {file, sceneCount, wordCount} (pre-migration shape), and
// docs/p1-benchmark/CORPUS_IDENTIFICATION.md did not exist yet. ORIGIN_FIELD
// below is therefore not a guess, just not yet exercised against real data.
//
// What this script does, so it keeps working today AND upgrades itself
// automatically once the migration has actually been run:
//   1. If an entry has the field named by ORIGIN_FIELD below ('origin'), use
//      its value directly ('crawl' => live-action group, anything else =>
//      animation/legacy group).
//   2. Otherwise, fall back to the legacy `file.startsWith('crawl/')` check
//      (today's pre-migration behavior, unchanged).
//   3. If NEITHER is present on an entry, ABORT LOUDLY — do not silently
//      misclassify a script's genre origin, since the whole point of this
//      probe is comparing exactly that split.
// ============================================================================
//
// Usage:
//   node scripts/probe-animation-vs-live.mjs [--split scripts/output/corpus-split.json] [--corpus-dir data/screenplays]
import fs from 'node:fs';
import path from 'node:path';
import { runScriptDoctor } from '../server/nvm/analyze/doctor.ts';
import { normalizeScreenplay } from '../server/nvm/analyze/screenplay-normalizer.ts';
import { parseFountain } from '../src/lib/fountain.ts';

// See the DEPENDENCY FLAG above. Update this once the real field name lands.
const ORIGIN_FIELD = 'origin';

function parseArgs(argv) {
  const args = { split: 'scripts/output/corpus-split.json', corpusDir: 'data/screenplays' };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--split') args.split = argv[++i];
    else if (argv[i] === '--corpus-dir') args.corpusDir = argv[++i];
    else if (argv[i] === '--help' || argv[i] === '-h') {
      console.log('Usage: node scripts/probe-animation-vs-live.mjs [--split <path>] [--corpus-dir <path>]');
      process.exit(0);
    }
  }
  return args;
}

function classifyOrigin(entry) {
  if (Object.prototype.hasOwnProperty.call(entry, ORIGIN_FIELD)) {
    return entry[ORIGIN_FIELD] === 'crawl' ? 'live' : 'animation';
  }
  if (typeof entry.file === 'string') {
    return entry.file.startsWith('crawl/') ? 'live' : 'animation';
  }
  throw new Error(
    `Cannot classify origin for split entry ${JSON.stringify(entry)}: neither "${ORIGIN_FIELD}" nor a legacy ` +
    `"file" path with a crawl/ prefix is present. Update ORIGIN_FIELD in this script once ` +
    `docs/p1-benchmark/CORPUS_IDENTIFICATION.md defines the real field name.`
  );
}

const args = parseArgs(process.argv.slice(2));
const split = JSON.parse(fs.readFileSync(args.split, 'utf-8'));
const entries = split.train;

function flattenDialogue(normalized) {
  const blocks = parseFountain(normalized);
  const out = [];
  for (const b of blocks) {
    if (b.type === 'dialogue' || b.type === 'parenthetical') out.push('Hello.');
    else out.push(b.text);
  }
  return out.join('\n');
}

const ctx = { theme: '', genre: '', directorStyle: '', characters: [] };
const animationDeltas = [];
const liveDeltas = [];

let processed = 0;
for (const entry of entries) {
  processed++;
  if (processed % 50 === 0) console.error(`  ...${processed}/${entries.length}`);
  const fullPath = path.join(args.corpusDir, entry.file);
  let raw;
  try {
    raw = fs.readFileSync(fullPath, 'utf-8');
  } catch {
    continue; // corpus text not present locally (expected outside a maintainer's machine)
  }
  const normalized = normalizeScreenplay(raw);
  const degraded = flattenDialogue(normalized);

  let realRep, degRep;
  try {
    realRep = await runScriptDoctor(raw, ctx, 'quick');
    degRep = await runScriptDoctor(degraded, ctx, 'quick');
  } catch { continue; }
  const delta = realRep.health - degRep.health;

  const origin = classifyOrigin(entry);
  if (origin === 'live') liveDeltas.push(delta);
  else animationDeltas.push(delta);
}

function stats(arr, label) {
  if (arr.length === 0) return;
  const sorted = [...arr].sort((a, b) => a - b);
  const mean = arr.reduce((s, d) => s + d, 0) / arr.length;
  const inversions = arr.filter(d => d < 0).length;
  const nearZero = arr.filter(d => Math.abs(d) < 2).length;
  // Approximate AUC: fraction of pairs where delta > 0, ties = 0.5
  const positive = arr.filter(d => d > 0).length;
  const tied = arr.filter(d => d === 0).length;
  const auc = (positive + tied * 0.5) / arr.length;
  console.log(`=== ${label} (n=${arr.length}) ===`);
  console.log(`  mean delta: ${mean.toFixed(2)}`);
  console.log(`  median delta: ${sorted[Math.floor(sorted.length / 2)].toFixed(2)}`);
  console.log(`  inversions (delta<0): ${inversions} (${(inversions / arr.length * 100).toFixed(0)}%)`);
  console.log(`  near-zero (|delta|<2): ${nearZero} (${(nearZero / arr.length * 100).toFixed(0)}%)`);
  console.log(`  approximate AUC (delta>0 fraction): ${auc.toFixed(3)}`);
  console.log('');
}

if (animationDeltas.length === 0 && liveDeltas.length === 0) {
  console.log('No corpus text found under', args.corpusDir, '— this probe requires the private corpus locally (see MEASUREMENT_RUNBOOK.md). Nothing to compare.');
} else {
  stats(animationDeltas, 'ANIMATION / LEGACY ORIGIN');
  stats(liveDeltas, 'LIVE-ACTION / CRAWL ORIGIN');
}
