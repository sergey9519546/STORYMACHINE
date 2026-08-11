// Calibration harness for the Narrative Stress Ledger.
//
// Reads dramatic annotations from the screenplay_training corpus, converts
// them to StoryOps, runs arc-tracker's analyzeArcCompletion, and cross-
// references the 7-account readings against quality scores.
//
// Usage:
//   node --experimental-strip-types scripts/calibrate-stress-ledger.ts
//
// Paths are configurable via env vars:
//   ANNOT_DIR  (default: the screenplay_training corpus dramatic annotations)
//   QUAL_DIR   (default: the screenplay_training corpus quality scores)

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { analyzeArcCompletion } from '../server/nvm/quality/arc-tracker.ts';
import type { StoryOp } from '../server/nvm/ops/StoryOp.ts';
import type { StressAccount } from '../server/nvm/quality/arc-tracker.ts';

// ── Annotation types (DIR 1 format) ──────────────────────────────────────────

interface DramaticScene {
  script_id: string;
  scene_id: string;
  act?: number;
  slugline?: string;
  function_tags?: string[];
  scene_purpose?: string;
  active_mechanism?: string;
  reversal?: string | { present?: boolean };
  thematic_function?: string;
  audience_information_advantage?: string;
  conflict?: string;
  before_state?: string;
  after_state?: string;
  tension_curve?: string;
  evidence?: {
    characters_present?: string[];
    first_line_no?: number;
    last_line_no?: number;
  };
}

interface QualityFile {
  script_id: string;
  composite_quality?: number;
  title_guess?: string;
}

// ── Annotation → StoryOps converter ──────────────────────────────────────────

function convertScene(scene: DramaticScene, sceneIdx: number, ctx: ConvertContext): StoryOp[] {
  const ops: StoryOp[] = [];
  const chars = scene.evidence?.characters_present ?? [];
  const sid = scene.scene_id ?? `scene_${sceneIdx}`;

  // Active mechanism → ops (annotation data uses: discovery, decision,
  // confrontation, test, reveal — NOT the schema's revelation/exposition/etc.)
  switch (scene.active_mechanism) {
    case 'reveal':
    case 'revelation':
      ops.push({ op: 'UPDATE_READER_STATE', delta: { knownFact: `${sid}:reveal` } } as StoryOp);
      // Pay off the oldest open clue (reveals resolve planted mysteries)
      if (ctx.openClues.length > 0) {
        const clueId = ctx.openClues.shift()!;
        ops.push({ op: 'PAYOFF_SETUP', setupId: clueId, payoffEventId: `${sid}:payoff` } as StoryOp);
      }
      // Reveals can resolve emotional distress (the truth comes out = catharsis)
      if (chars[0]) {
        ops.push({ op: 'APPRAISE_EMOTION', charId: chars[0], emotion: { joy: 40, distress: 0, anger: 0, fear: 0, pride: 30, shame: 0, dominant: 'joy', intensity: 40, last_updated_at: sceneIdx } } as StoryOp);
      }
      break;
    case 'discovery':
      ops.push({ op: 'UPDATE_READER_STATE', delta: { suspense: 5, curiosity: 3 } } as StoryOp);
      break;
    case 'confrontation':
      if (chars.length >= 2) {
        ops.push({ op: 'SHIFT_RELATIONSHIP', pair: [chars[0], chars[1]], delta: { dimension: 'trust', amount: -0.3, reason: 'confrontation' } } as StoryOp);
      }
      if (chars[0]) {
        // Intensity 76 crosses the EMOTIONAL_DEBT threshold (>= 75)
        ops.push({ op: 'APPRAISE_EMOTION', charId: chars[0], emotion: { joy: 0, distress: 50, anger: 76, fear: 0, pride: 0, shame: 0, dominant: 'anger', intensity: 76, last_updated_at: sceneIdx } } as StoryOp);
      }
      break;
    case 'test':
      // Character is tested — moderate relational strain
      if (chars.length >= 2) {
        ops.push({ op: 'SHIFT_RELATIONSHIP', pair: [chars[0], chars[1]], delta: { dimension: 'trust', amount: -0.15, reason: 'test' } } as StoryOp);
      }
      break;
    case 'loss':
    case 'consequence':
    case 'reversal_of_fortune':
      if (chars[0]) {
        ops.push({ op: 'APPRAISE_EMOTION', charId: chars[0], emotion: { joy: 0, distress: 78, anger: 0, fear: 50, pride: 0, shame: 0, dominant: 'distress', intensity: 78, last_updated_at: sceneIdx } } as StoryOp);
      }
      break;
    case 'decision_under_pressure':
      ops.push({ op: 'ADVANCE_OBJECT_ARC', objectId: `${sid}:decision`, toState: 'committed' } as StoryOp);
      if (chars[0]) {
        ops.push({ op: 'APPRAISE_EMOTION', charId: chars[0], emotion: { joy: 0, distress: 0, anger: 0, fear: 75, pride: 0, shame: 0, dominant: 'fear', intensity: 75, last_updated_at: sceneIdx } } as StoryOp);
      }
      break;
    case 'decision':
    case 'commitment':
      ops.push({ op: 'ADVANCE_OBJECT_ARC', objectId: `${sid}:decision`, toState: 'committed' } as StoryOp);
      break;
    case 'exposition':
    case 'set_piece':
      // Sensory texture only — NOT substantive. Triggers SCENE_DEAD_AIR if no
      // other dramatic signal (reversal, function tags, etc.) adds substance.
      ops.push({ op: 'RECORD_VISUAL_FACT', sceneId: sid, fact: 'setting' } as StoryOp);
      break;
  }

  // Reversal
  const hasReversal = scene.reversal === 'yes' ||
    (typeof scene.reversal === 'object' && scene.reversal?.present === true);
  if (hasReversal && chars.length >= 2) {
    ops.push({ op: 'SHIFT_RELATIONSHIP', pair: [chars[0], chars[1]], delta: { dimension: 'trust', amount: -0.5, reason: 'reversal' } } as StoryOp);
    if (chars[0]) {
      ops.push({ op: 'APPRAISE_EMOTION', charId: chars[0], emotion: { joy: 0, distress: 80, anger: 0, fear: 40, pride: 0, shame: 0, dominant: 'distress', intensity: 80, last_updated_at: sceneIdx } } as StoryOp);
    }
  }

  // Function tags
  const tags = scene.function_tags ?? [];
  if (tags.includes('setup') || tags.includes('plant')) {
    const clueId = `${sid}:clue`;
    ctx.openClues.push(clueId);
    ops.push({ op: 'SEED_CLUE', clueId, carrier: 'object' } as StoryOp);
  }
  if (tags.includes('inciting') || tags.includes('inciting_incident')) {
    ops.push({ op: 'RAISE_CLOCK', clockId: `${sid}:clock`, amount: 5 } as StoryOp);
  }
  if ((tags.includes('payoff') || tags.includes('resolution') || tags.includes('convergence') || tags.includes('climax_buildup')) && ctx.openClues.length > 0) {
    const clueId = ctx.openClues.shift()!;
    ops.push({ op: 'PAYOFF_SETUP', setupId: clueId, payoffEventId: `${sid}:payoff` } as StoryOp);
  }

  // Thematic function — only for scenes with explicit thematic content.
  // Use thematic_function as the claimId so different theme threads accumulate
  // independently. In the final act, generate 'resolve' instead of 'support'.
  const tf = scene.thematic_function;
  if (tf && !['tone_setting', 'world_introduction', 'opening'].includes(tf)) {
    const move = (tf === 'resolution' || ctx.isFinalAct) ? 'resolve' : 'support';
    ops.push({ op: 'ADVANCE_THEME_ARGUMENT', claimId: tf, move } as StoryOp);
  }

  // Audience information advantage → curiosity/suspense
  const adv = scene.audience_information_advantage ?? '';
  if (adv.includes('audience knows more') || adv.includes('audience knows slightly more')) {
    ops.push({ op: 'UPDATE_READER_STATE', delta: { curiosity: 3 } } as StoryOp);
  }

  return ops;
}

interface ConvertContext {
  openClues: string[];      // mutable — seeded clue IDs for payoff tracking
  isFinalAct: boolean;       // whether this scene is in the resolution window
}

function convertFilm(scenes: DramaticScene[]): { sceneIdx: number; ops: StoryOp[] }[] {
  const openClues: string[] = [];
  const total = scenes.length;
  return scenes.map((scene, idx) => {
    const isFinalAct = (scene.act !== undefined && scene.act >= 3) || idx >= total * 0.8;
    const ctx: ConvertContext = { openClues, isFinalAct };
    return { sceneIdx: idx, ops: convertScene(scene, idx, ctx) };
  });
}

// ── Calibration runner ───────────────────────────────────────────────────────

const ANNOT_DIR = process.env.ANNOT_DIR ??
  'C:\\Users\\serge\\.minimax-agent\\projects\\screenplay_training\\corpus\\05_dramatic_annotations';
const QUAL_DIR = process.env.QUAL_DIR ??
  'C:\\Users\\serge\\.minimax-agent\\projects\\screenplay_training\\corpus\\07_quality_scores';

const MIN_SCENES = 20; // filter films with too few parsed scenes

interface FilmResult {
  film: string;
  quality: number;
  sceneCount: number;
  debtScore: number;
  accounts: Record<StressAccount, { subtotal: number; openCount: number }>;
  fatigue: number;
  lockMode: string;
}

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  if (n < 3) return 0;
  const meanA = a.reduce((s, x) => s + x, 0) / n;
  const meanB = b.reduce((s, x) => s + x, 0) / n;
  let num = 0, dA = 0, dB = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - meanA) * (b[i] - meanB);
    dA += (a[i] - meanA) ** 2;
    dB += (b[i] - meanB) ** 2;
  }
  const den = Math.sqrt(dA * dB);
  return den > 0 ? num / den : 0;
}

// ── Main ─────────────────────────────────────────────────────────────────────

const filmDirs = readdirSync(ANNOT_DIR, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

const results: FilmResult[] = [];
const ACCOUNTS: StressAccount[] = ['systemic', 'relational', 'character', 'epistemic', 'thematic', 'scene', 'audience'];

for (const film of filmDirs) {
  const annotPath = join(ANNOT_DIR, film, 'dramatic.json');
  const qualPath = join(QUAL_DIR, `${film}.quality.json`);

  let scenes: DramaticScene[];
  let quality: number;
  try {
    scenes = JSON.parse(readFileSync(annotPath, 'utf8'));
    const qualFile: QualityFile = JSON.parse(readFileSync(qualPath, 'utf8'));
    quality = qualFile.composite_quality ?? 0;
  } catch {
    continue; // skip films missing data
  }

  if (scenes.length < MIN_SCENES) continue;

  const sceneOps = convertFilm(scenes);
  const report = analyzeArcCompletion(sceneOps);

  const accountSummary = Object.fromEntries(
    ACCOUNTS.map(a => [a, { subtotal: report.accounts[a].subtotal, openCount: report.accounts[a].openCount }]),
  ) as Record<StressAccount, { subtotal: number; openCount: number }>;

  results.push({
    film,
    quality,
    sceneCount: scenes.length,
    debtScore: report.debtScore,
    accounts: accountSummary,
    fatigue: report.temporalDynamics.fatigue,
    lockMode: report.temporalDynamics.lockMode,
  });
}

// Sort by quality descending
results.sort((a, b) => b.quality - a.quality);

// ── Report ───────────────────────────────────────────────────────────────────

console.log('\n=== STRESS LEDGER CALIBRATION ===');
console.log(`${results.length} films (≥ ${MIN_SCENES} scenes each)\n`);

// Per-film table
console.log('Film                          Qual  Debt   Sys  Rel  Chr  Epi  Thm  Scn  Aud  Fatigue Lock');
console.log('─'.repeat(115));
for (const r of results) {
  const fmt = (n: number) => n.toFixed(0).padStart(4);
  console.log(
    `${r.film.padEnd(30)} ${r.quality.toFixed(2).padStart(5)} ${fmt(r.debtScore)}` +
    ACCOUNTS.map(a => fmt(r.accounts[a].subtotal)).join(' ') + ' ' +
    ` ${r.fatigue.toFixed(2).padStart(6)} ${r.lockMode.padEnd(14)}`,
  );
}

// Correlation analysis
console.log('\n=== CORRELATION WITH QUALITY (Pearson r) ===\n');
const qualities = results.map(r => r.quality);
const correlations: Record<string, number> = {
  'debtScore (overall)': pearson(qualities, results.map(r => r.debtScore)),
};
for (const a of ACCOUNTS) {
  correlations[`account.${a}.subtotal`] = pearson(qualities, results.map(r => r.accounts[a].subtotal));
  correlations[`account.${a}.openCount`] = pearson(qualities, results.map(r => r.accounts[a].openCount));
}
correlations['fatigue'] = pearson(qualities, results.map(r => r.fatigue));

for (const [key, r] of Object.entries(correlations).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))) {
  const bar = '█'.repeat(Math.round(Math.abs(r) * 40));
  const sign = r >= 0 ? '+' : '-';
  console.log(`  ${key.padEnd(30)} ${r.toFixed(4).padStart(7)}  ${sign}${bar}`);
}

// Top/bottom quintile comparison
const quintileSize = Math.max(1, Math.floor(results.length / 5));
const top = results.slice(0, quintileSize);
const bottom = results.slice(-quintileSize);
console.log(`\n=== TOP QUINTILE (n=${top.length}) vs BOTTOM QUINTILE (n=${bottom.length}) ===\n`);
console.log('Metric                        Top (mean)   Bot (mean)   Δ');
console.log('─'.repeat(65));
const metrics: Array<[string, (r: FilmResult) => number]> = [
  ['quality', r => r.quality],
  ['debtScore', r => r.debtScore],
  ...ACCOUNTS.map(a => [`account.${a}.subtotal`, (r: FilmResult) => r.accounts[a].subtotal] as [string, (r: FilmResult) => number]),
  ['fatigue', r => r.fatigue],
];
for (const [label, fn] of metrics) {
  const topMean = top.reduce((s, r) => s + fn(r), 0) / top.length;
  const botMean = bottom.reduce((s, r) => s + fn(r), 0) / bottom.length;
  console.log(`  ${label.padEnd(30)} ${topMean.toFixed(2).padStart(10)} ${botMean.toFixed(2).padStart(12)} ${(topMean - botMean).toFixed(2).padStart(8)}`);
}

console.log('\n=== LOCK MODE DISTRIBUTION ===\n');
const lockCounts: Record<string, number> = {};
for (const r of results) {
  lockCounts[r.lockMode] = (lockCounts[r.lockMode] ?? 0) + 1;
}
for (const [mode, count] of Object.entries(lockCounts)) {
  console.log(`  ${mode.padEnd(20)} ${count} films`);
}
