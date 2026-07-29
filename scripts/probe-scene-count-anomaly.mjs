// Scene-count anomaly investigation: the signal probe showed sceneCount delta
// of +150 under SHUFFLE. That's impossible if shuffle preserves scene headings.
// Investigating whether the shuffle/drop degradations in the AUC harness are
// accidentally changing scene counts.
import fs from 'node:fs';
import path from 'node:path';
import { normalizeScreenplay } from '../server/nvm/analyze/screenplay-normalizer.ts';
import { parseFountain } from '../src/lib/fountain.ts';
import { analyzeFountainText } from '../server/nvm/analyze/fountain-analyzer.ts';

const file = 'data/screenplays/crawl/action/13-days.fountain';
const raw = fs.readFileSync(file, 'utf-8');

const a = analyzeFountainText(raw);
console.log('Original sceneCount (analyzeFountainText):', a.sceneCount);

// Now check what the AUC harness shuffle does
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function segmentScenes(blocks) {
  const scenes = [];
  let cur = [];
  for (const b of blocks) {
    cur.push(b);
    if (b.type === 'scene_heading' && cur.length > 1) { scenes.push(cur); cur = [b]; }
  }
  if (cur.length) scenes.push(cur);
  return scenes;
}

const normalized = normalizeScreenplay(raw);
const blocks = parseFountain(normalized);
const scenes = segmentScenes(blocks);
console.log('segmentScenes found:', scenes.length, 'scenes');

// The signal probe was using a.text (raw text), not the degraded text
// Let me check: the probe extracted signals from the RAW text, but the
// "degraded" signal came from the degraded text. The sceneCount delta
// of +150 was real.text vs deg.text sceneCount.
// BUT the probe was measuring extractSignals(degradedText) where
// degradedText = shuffle output. Let me check if the shuffle output
// changes scene count.

// Reconstruct what the probe did:
function shuffleScenes(text) {
  const normalized = normalizeScreenplay(text);
  const blocks = parseFountain(normalized);
  const scenes = segmentScenes(blocks);
  if (scenes.length < 3) return null;
  const rng = mulberry32(42);
  for (let i = scenes.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [scenes[i], scenes[j]] = [scenes[j], scenes[i]];
  }
  return scenes.flat().map(b => b.text).join('\n');
}

const shuffled = shuffleScenes(raw);
const aShuffled = analyzeFountainText(shuffled);
console.log('Shuffled sceneCount:', aShuffled.sceneCount);
console.log('Delta:', aShuffled.sceneCount - a.sceneCount);

// Check the blocks count in shuffled
const shuffledBlocks = parseFountain(normalizeScreenplay(shuffled));
const shuffledScenes = segmentScenes(shuffledBlocks);
console.log('Shuffled segmentScenes:', shuffledScenes.length);

// The issue might be that b.text includes the original line text WITH
// leading whitespace, and when joined, the scene headings are indented
// and parseFountain doesn't recognize them.
// Let me check: how many scene_heading blocks in original vs shuffled?
const origHeadings = blocks.filter(b => b.type === 'scene_heading').length;
const shuffledHeadings = shuffledBlocks.filter(b => b.type === 'scene_heading').length;
console.log('Original scene_heading blocks:', origHeadings);
console.log('Shuffled scene_heading blocks:', shuffledHeadings);
