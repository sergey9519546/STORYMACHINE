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

// —— Degraded band: structural-destruction AUC (Step 5 / north-star metric) ——
// Deterministic degradation of each corpus script (seeded scene shuffle +
// every 3rd scene dropped) creates a matched BAD band from the same prose:
// surface craft identical, global structure destroyed. FIRST MEASUREMENT
// (2026-07-10, 12-script subset): meanGood 92.3 vs meanBad 91.1, AUC 0.677
// — the rule set is largely LOCAL and barely notices wholesale structural
// scrambling at feature length (Bee Movie's shuffle scored HIGHER).
// UPDATED (2026-07-10, same subset, after widening SCENE_CONTINUITY_COLLAPSE
// with a location-run corroboration axis — see structure.ts's header at that
// rule): AUC 0.684. The wider gate was swept over all 69 intact/degraded
// corpus pairs and holds zero false positives on every intact script while
// catching 29/42 floor-eligible degraded scripts (up from 20/42 at the
// original single-axis threshold); the 12-script AUC subset moves less
// because several of its scripts don't meet the rule's floors.
//
// AUC-CONVERSION WAVE (2026-07-10, same day, follow-on): the above widening
// grew DETECTION (29/42 catches) but not SEPARATION — doctor.ts's structural
// deduction was still capped at the old 0.5-per-instance/12-point-cap design,
// so a script racking up a dozen corroborated SCENE_CONTINUITY_COLLAPSE cuts
// lost the same handful of points as one carrying a single cut. Full-corpus
// instrumentation (all 71 scripts, not just the 12-script AUC subset) found
// AUC-71 = 0.603 at that design — close to a coin flip once averaged past
// the 12 best-behaved scripts. doctor.ts's structural deduction was
// re-tuned (weight 0.5—>2.0, cap 12—>20 on the SCENE_CONTINUITY_COLLAPSE
// instance count; see its own comment for the full measurement and the
// PERVASIVE-gated candidate that was tried and rejected as a measured
// no-op for this corpus) purely by reconstructing baseHealth from the
// already-measured data and grid-searching (weight, cap) pairs — zero
// pipeline reruns needed for the search itself. Re-measured against the
// real doctor after shipping: AUC-12 0.684—>0.712, AUC-24 (this wave's new
// wider subset, see SUBSET below) 0.622—>0.672, AUC-71 0.603—>0.652. Every
// one of the 71 intact scripts' health is BYTE-IDENTICAL before/after
// (diffed against this file's own MANIFEST — structuralDeduction only
// changes when SCENE_CONTINUITY_COLLAPSE/PERVASIVE fire, which never
// happens on an intact script by the gate's own zero-intact-FP design).
// Recorded here as the new ratchet floor: the hard floor below asserts we
// never regress below AUC-24's measured value minus a small margin; the
// todo still names the 0.9 target that feature-scale structural detectors
// (setup-before-payoff ordering, act shape, escalation coherence) must
// reach. This is the north-star separation metric made executable.
describe('real-script corpus — structural-degradation AUC', { skip: !CORPUS_DIR && 'REAL_SCRIPT_CORPUS_DIR not set' }, () => {
  const SUBSET = 24; // grown from 12 (AUC-conversion wave, 2026-07-10)
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
  // Floor = measured-minus-0.05, never below 0.6 (per this wave's own brief).
  // Measured AUC-24 after the deduction re-tune: 0.672 —> floor 0.622.
  it('AUC hard floor: never regress below the measured baseline (0.622)', async () => {
    measured = await measure();
    assert.ok(measured.auc >= 0.622,
      `structural-degradation AUC ${measured.auc.toFixed(3)} fell below the 0.622 ratchet — a change made the doctor MORE structure-blind`);
  });
  it('AUC target: intact features should dominate their scrambled selves (>= 0.9)', { todo: 'measured 0.672 (24-script subset) after the AUC-conversion deduction re-tune — still needs feature-scale structural detectors (see header)' }, async () => {
    const m = measured ?? await measure();
    assert.ok(m.auc >= 0.9, `AUC ${m.auc.toFixed(3)} < 0.9 target`);
  });
});

// —— Second degradation recipe: act-swap (thirds reordered, no scene drop) ——
// A DIFFERENT kind of structural damage from the shuffle-drop recipe above:
// the script is cut into three contiguous thirds (by scene count) and
// reordered 3rd-1st-2nd — every scene keeps its immediate neighbors (local
// adjacency, character continuity, day/night runs are ALL preserved within
// each third), but the GLOBAL arc is destroyed (the climax now opens the
// document, the setup now closes it). This is close to a structural
// opposite of the shuffle-drop recipe, which preserves nothing local but
// leaves scene count/density intact; act-swap preserves everything local
// SCENE_CONTINUITY_COLLAPSE actually reads (adjacent-character continuity,
// day/night thrash, location runs) and only breaks the thing no current
// rule measures: which third of the document a scene's content belongs in.
//
// HONEST BASELINE (2026-07-10, no hard floor by design): measured AUC-12
// 0.455, AUC-24 0.477, AUC-71 0.494 — statistically indistinguishable from
// chance across every subset size. This is the expected, correctly-diagnosed
// result: doctor.ts has no detector for act-level/global-arc ordering (the
// gap this file's own header names as the 0.9-target's remaining work), and
// SCENE_CONTINUITY_COLLAPSE's whole gate is local-adjacency-based by
// construction, so it structurally CANNOT see this recipe's damage. Recorded
// as a todo-only regression guard (not a hard floor — an AUC this close to
// 0.5 would make a floor either meaningless or immediately flapping) so a
// future feature-scale structural detector (act shape, setup-before-payoff
// ordering) has an honest, already-measured baseline to improve against
// instead of discovering this gap cold.
describe('real-script corpus — act-swap-degradation AUC (second recipe)', { skip: !CORPUS_DIR && 'REAL_SCRIPT_CORPUS_DIR not set' }, () => {
  const SUBSET = 24;
  function actSwap(t: string): string {
    const parts = t.split(/^(?=INT\.|EXT\.)/mi);
    const head = /^(INT\.|EXT\.)/i.test(parts[0]) ? '' : parts.shift() ?? '';
    const scenes = parts.filter(x => /^(INT\.|EXT\.)/i.test(x));
    const n = scenes.length;
    const a = Math.ceil(n / 3);
    const b = Math.ceil((n / 3) * 2);
    const thirds = [scenes.slice(0, a), scenes.slice(a, b), scenes.slice(b)];
    return head + [...thirds[2], ...thirds[0], ...thirds[1]].join('');
  }
  async function measure() {
    const files = MANIFEST.slice(0, SUBSET).map(m => m.file);
    const goods: number[] = [], bads: number[] = [];
    for (const f of files) {
      const t = readFileSync(path.join(CORPUS_DIR, f), 'utf8');
      goods.push((await runScriptDoctor(t)).health);
      bads.push((await runScriptDoctor(actSwap(t))).health);
    }
    let wins = 0, ties = 0;
    for (const g of goods) for (const b of bads) { if (g > b) wins++; else if (g === b) ties++; }
    return { auc: (wins + ties / 2) / (goods.length * bads.length) };
  }
  it("AUC baseline (todo, no hard floor — act-swap damage is invisible to today's local-adjacency-based structural gate)", {
    todo: "measured 0.477 (24-script subset) — act-swap preserves everything SCENE_CONTINUITY_COLLAPSE reads (local adjacency, day/night runs) and only breaks global act ordering, which no current rule measures",
  }, async () => {
    const m = await measure();
    assert.ok(m.auc >= 0.9, `AUC ${m.auc.toFixed(3)} < 0.9 target (informational until a global-arc detector exists)`);
  });
});
