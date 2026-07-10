// Real-script regression corpus (Run 24 — the ground-truth harness).
//
// WHY: through wave 1193 every rule test ran on synthetic fixtures and the 20
// controlled calibration samples — no professionally produced screenplay had
// ever gone through the 14 passes in a test. The first real run found exactly
// the class of bug fixtures cannot: an unbounded per-clue loop emitted
// 556-1,077 CRITICAL ORPHAN_CLUE instances on four produced features and
// saturated their health to 0 (fixed the same day — see payoff.ts's
// ORPHAN_CLUE_DETAIL_CAP comment). This file locks that lesson in.
//
// COPYRIGHT BOUNDARY: the scripts themselves are copyrighted and are NOT in
// the repo. tests/fixtures/real-corpus-manifest.json (committed) carries only
// facts — filename, contentHash, expected health/verdict/sceneCount. The
// text lives in a local directory pointed at by REAL_SCRIPT_CORPUS_DIR; when
// that env var is unset (e.g. CI), every assertion is skipped with an honest
// note rather than silently passing.
//
// ASSERTION TIERS per script:
//  1. contentHash matches the manifest → the local file is byte-identical to
//     the one the expectations were locked against → health/verdict/sceneCount
//     must match EXACTLY (this is the determinism claim on real material).
//  2. hash differs (re-extracted PDF, different source) → floor assertions
//     only: a professionally produced feature must score health >= FLOOR and
//     verdict RECOMMEND. A produced script scoring below the floor is, by
//     this project's own premise, a product bug until proven otherwise.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MANIFEST = JSON.parse(
  readFileSync(path.join(__dirname, '../fixtures/real-corpus-manifest.json'), 'utf8'),
) as Array<{ name: string; file: string; contentHash: string; health: number; verdict: string; sceneCount: number }>;

const CORPUS_DIR = process.env.REAL_SCRIPT_CORPUS_DIR ?? '';
/** Produced-feature floor: every professionally produced, correctly extracted
 *  feature in the corpus scores >= 80 today (measured range 88.9-98.3);
 *  80 leaves honest headroom for future rule waves to add issues without
 *  flapping this test, while still catching any systemic collapse like the
 *  ORPHAN_CLUE flood (which produced health 0, not 80). */
const PRODUCED_FLOOR = 80;

describe('real-script corpus — produced features through the full doctor', () => {
  it('manifest sanity: at least 8 scripts, unique hashes', () => {
    assert.ok(MANIFEST.length >= 8, `manifest has ${MANIFEST.length} entries`);
    assert.equal(new Set(MANIFEST.map(m => m.contentHash)).size, MANIFEST.length);
  });

  for (const entry of MANIFEST) {
    it(`${entry.name}: exact when byte-identical, floor otherwise`, { skip: !CORPUS_DIR && 'REAL_SCRIPT_CORPUS_DIR not set — corpus text is local-only (copyright)' }, async () => {
      const file = path.join(CORPUS_DIR, entry.file);
      if (!existsSync(file)) {
        assert.fail(`REAL_SCRIPT_CORPUS_DIR is set but ${entry.file} is missing from it`);
      }
      const fountain = readFileSync(file, 'utf8');
      const report = await runScriptDoctor(fountain);
      if (report.contentHash === entry.contentHash) {
        assert.equal(report.health, entry.health, `${entry.name}: health drifted on byte-identical input`);
        assert.equal(report.verdict, entry.verdict, `${entry.name}: verdict drifted on byte-identical input`);
        assert.equal(report.sceneCount, entry.sceneCount, `${entry.name}: sceneCount drifted on byte-identical input`);
      } else {
        assert.ok(report.health >= PRODUCED_FLOOR,
          `${entry.name}: produced feature scored ${report.health} < ${PRODUCED_FLOOR} — systemic scoring bug until proven otherwise`);
        assert.equal(report.verdict, 'RECOMMEND', `${entry.name}: produced feature must verdict RECOMMEND`);
      }
    });
  }
});

// ── Degraded band: structural-destruction AUC (Step 5 / north-star metric) ──
// Deterministic degradation of each corpus script (seeded scene shuffle +
// every 3rd scene dropped) creates a matched BAD band from the same prose:
// surface craft identical, global structure destroyed. FIRST MEASUREMENT
// (2026-07-10, 12-script subset): meanGood 92.3 vs meanBad 91.1, AUC 0.677
// — the rule set is largely LOCAL and barely notices wholesale structural
// scrambling at feature length (Bee Movie's shuffle scored HIGHER). That is
// the honest state of the art, recorded here as a ratchet: the hard floor
// asserts we never get worse; the todo names the target (0.9) that
// feature-scale structural detectors (setup-before-payoff ordering, act
// shape, escalation coherence) must reach. This is the north-star
// separation metric made executable.
describe('real-script corpus — structural-degradation AUC', { skip: !CORPUS_DIR && 'REAL_SCRIPT_CORPUS_DIR not set' }, () => {
  const SUBSET = 12;
  async function measure() {
    const { makePrng, seedFromString, shuffle } = await import('../../server/nvm/repro/seed.ts');
    const files = MANIFEST.slice(0, SUBSET).map(m => m.file);
    const goods: number[] = [], bads: number[] = [];
    for (const f of files) {
      const t = readFileSync(path.join(CORPUS_DIR, f), 'utf8');
      const parts = t.split(/^(?=INT\.|EXT\.)/mi);
      const head = /^(INT\.|EXT\.)/i.test(parts[0]) ? '' : parts.shift() ?? '';
      const scenes = parts.filter(x => /^(INT\.|EXT\.)/i.test(x));
      const rng = makePrng(seedFromString(`degrade:${f}`));
      const degraded = head + shuffle(rng, scenes).filter((_, i) => i % 3 !== 2).join('');
      goods.push((await runScriptDoctor(t)).health);
      bads.push((await runScriptDoctor(degraded)).health);
    }
    let wins = 0, ties = 0;
    for (const g of goods) for (const b of bads) { if (g > b) wins++; else if (g === b) ties++; }
    return { auc: (wins + ties / 2) / (goods.length * bads.length), goods, bads };
  }
  let measured: { auc: number; goods: number[]; bads: number[] } | null = null;
  it('AUC hard floor: never regress below the measured baseline (0.6)', async () => {
    measured = await measure();
    assert.ok(measured.auc >= 0.6,
      `structural-degradation AUC ${measured.auc.toFixed(3)} fell below the 0.6 ratchet — a change made the doctor MORE structure-blind`);
  });
  it('AUC target: intact features should dominate their scrambled selves (>= 0.9)', { todo: 'measured 0.677 at introduction — needs feature-scale structural detectors (see header)' }, async () => {
    const m = measured ?? await measure();
    assert.ok(m.auc >= 0.9, `AUC ${m.auc.toFixed(3)} < 0.9 target`);
  });
});
