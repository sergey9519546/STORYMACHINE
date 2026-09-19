// Story Graph Position-Sensitivity Regression Guard
//
// Structural property test: proves graph-native metrics are NOT position-blind
// by measuring discrimination between intact scripts and act-swapped corruption.
// Target AUC ≥0.70 ensures metrics detect large-scale scene-order scrambling.
//
// IMPORTANT: This is a REGRESSION GUARD for position-sensitivity, not a craft
// discrimination test. P1 requires independent human judgment on real writing;
// this synthetic corruption test does not satisfy that requirement.
//
// Env-gated (like real-script-corpus): set STORY_GRAPH_CORPUS_DIR to enable.
// Uses merged-fountain corpus from corpus-pipeline (364 screenplays).
//
// SKIP, NOT SILENCE (2026-09-19, harness-honesty lane). This file used to
// `return` from inside `describe()` when the env var was unset — which
// registers ZERO tests. `node:test` then has nothing to report: not a
// failure, not even a skip count, just an empty suite that looks identical
// to "the corpus was there and everything passed" at a glance and identical
// to "this file is empty" in a `# skipped` tally. The four AUC assertions
// below were invisible to `npm test`'s own skip count on every CI run.
// `tests/core/real-script-corpus.test.ts` solves this correctly: it always
// registers every test, marking each with node:test's own `{ skip: reason }`
// so the run reports `# skipped N` with the reason named, and it fails
// loudly (rather than skipping) when the env var is SET but points at a
// path that doesn't exist — a typo'd path used to read as a silent, and
// therefore invisible, skip. This file now follows the same three-state
// shape (unset / broken / valid) and the same fail-loud-on-broken test, so
// "match the sibling" is not just prose — the sibling's exact pattern is
// reused, not re-derived.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';

const CORPUS_DIR = process.env.STORY_GRAPH_CORPUS_DIR ?? '';

// Three distinct states, kept distinct on purpose (mirrors
// tests/core/real-script-corpus.test.ts) so a misconfigured path reads as a
// hard failure rather than a silent skip that looks like a pass:
//   1. unset      → the copyright/local-only skip (honest, expected in CI).
//   2. set-broken → the env var points at a path that doesn't exist or isn't
//                   a directory — almost always a typo. Fail once, loudly,
//                   naming the path, instead of the old silent `return`.
//   3. set-valid  → run the assertions below.
const CORPUS_DIR_STATE: 'unset' | 'broken' | 'valid' = !CORPUS_DIR
  ? 'unset'
  : (existsSync(CORPUS_DIR) && statSync(CORPUS_DIR).isDirectory() ? 'valid' : 'broken');
const SKIP_REASON = CORPUS_DIR_STATE === 'unset'
  ? 'STORY_GRAPH_CORPUS_DIR not set — corpus text is local-only (set to a merged-fountain corpus path, e.g. from corpus-pipeline)'
  : false;
// The four corpus-reading tests below also skip on a BROKEN path — the
// dedicated integrity test above is what fails loudly for that case, so
// these four don't pile on with a confusing readdirSync-on-a-missing-dir
// error of their own.
const CORPUS_TEST_SKIP = CORPUS_DIR_STATE === 'valid'
  ? false
  : (SKIP_REASON || `STORY_GRAPH_CORPUS_DIR is set to "${CORPUS_DIR}" but is not a valid directory — see the integrity test above`);

describe('Story Graph Position-Sensitivity Regression', () => {
  it('corpus dir integrity: set path must exist and be a directory', { skip: CORPUS_DIR_STATE !== 'broken' && 'only runs when STORY_GRAPH_CORPUS_DIR is set to a bad path' }, () => {
    assert.fail(`STORY_GRAPH_CORPUS_DIR is set to "${CORPUS_DIR}" but that path does not exist or is not a directory — fix the path, or unset it to skip the copyright-gated corpus`);
  });

  // Read once at module-eval time regardless of state; only used inside test
  // bodies that are themselves skipped unless CORPUS_DIR_STATE === 'valid'.
  const corpusDir: string = CORPUS_DIR;

  // Act-swap recipe: reorder acts 1-2-3 → 3-1-2
  function actSwap(fountain: string): string {
    const parts = fountain.split(/^(?=INT\.|EXT\.)/mi);
    const head = /^(INT\.|EXT\.)/i.test(parts[0]) ? '' : parts.shift() ?? '';
    const scenes = parts.filter(x => /^(INT\.|EXT\.)/i.test(x));
    const n = scenes.length;
    if (n < 3) return fountain; // Too short to swap
    
    const a = Math.ceil(n / 3);
    const b = Math.ceil((n / 3) * 2);
    const thirds = [scenes.slice(0, a), scenes.slice(a, b), scenes.slice(b)];
    return head + [...thirds[2], ...thirds[0], ...thirds[1]].join('');
  }
  
  // Compute AUC from paired scores
  function computeAUC(goods: number[], bads: number[]): number {
    let wins = 0, ties = 0;
    for (const g of goods) {
      for (const b of bads) {
        if (g > b) wins++;
        else if (g === b) ties++;
      }
    }
    return (wins + ties / 2) / (goods.length * bads.length);
  }
  
  async function measureCorpusAUC(
    metricExtractor: (report: Awaited<ReturnType<typeof runScriptDoctor>>) => number,
    options: { maxScripts?: number; minScenes?: number } = {}
  ) {
    const { maxScripts = 50, minScenes = 10 } = options;
    
    const files = readdirSync(corpusDir)
      .filter(f => f.endsWith('.fountain.txt'))
      .slice(0, maxScripts * 2); // Sample more, filter later
    
    const goods: number[] = [];
    const bads: number[] = [];
    const skipped: string[] = [];
    
    for (const file of files) {
      if (goods.length >= maxScripts) break;
      
      try {
        const fountain = readFileSync(path.join(corpusDir, file), 'utf8');
        
        // Skip very short scripts (not enough structure for act-swap)
        const sceneCount = (fountain.match(/^(INT\.|EXT\.)/gim) || []).length;
        if (sceneCount < minScenes) {
          skipped.push(`${file} (${sceneCount} scenes, need ≥${minScenes})`);
          continue;
        }
        
        const intact = await runScriptDoctor(fountain);
        const swapped = await runScriptDoctor(actSwap(fountain));
        
        const intactMetric = metricExtractor(intact);
        const swappedMetric = metricExtractor(swapped);
        
        // Skip if metric extraction failed
        if (typeof intactMetric !== 'number' || typeof swappedMetric !== 'number') {
          skipped.push(`${file} (metric extraction failed)`);
          continue;
        }
        
        goods.push(intactMetric);
        bads.push(swappedMetric);
        
        if (goods.length % 10 === 0) {
          console.log(`  Processed ${goods.length}/${maxScripts} scripts...`);
        }
      } catch (err) {
        skipped.push(`${file} (error: ${err instanceof Error ? err.message : String(err)})`);
      }
    }
    
    const auc = computeAUC(goods, bads);
    const meanGood = goods.reduce((a, b) => a + b, 0) / goods.length;
    const meanBad = bads.reduce((a, b) => a + b, 0) / bads.length;
    const separation = meanGood - meanBad;
    
    return { auc, goods, bads, meanGood, meanBad, separation, skipped, n: goods.length };
  }
  
  it('forwardEdgeRatio: detects backward causality in act-swapped scripts (AUC ≥0.70)', { skip: CORPUS_TEST_SKIP }, async () => {
    console.log('\n  Testing forwardEdgeRatio position-sensitivity (target: AUC ≥0.70)...');
    
    const result = await measureCorpusAUC(
      report => report.storyGraph?.graph.forwardEdgeRatio ?? 0.5,
      { maxScripts: 50, minScenes: 15 }
    );
    
    console.log(`\n  Results (n=${result.n}):`);
    console.log(`    AUC:         ${result.auc.toFixed(3)}`);
    console.log(`    Mean intact: ${result.meanGood.toFixed(3)}`);
    console.log(`    Mean swapped: ${result.meanBad.toFixed(3)}`);
    console.log(`    Separation:  ${result.separation.toFixed(3)}`);
    console.log(`    Skipped:     ${result.skipped.length} scripts`);
    
    assert.ok(
      result.auc >= 0.70,
      `forwardEdgeRatio AUC ${result.auc.toFixed(3)} < 0.70 target — ` +
      `position-sensitive causality metric should detect backward edges in scrambled structure`
    );
  });
  
  it('arcCoherence: detects tension-position disruption in act-swapped scripts (AUC ≥0.70)', { skip: CORPUS_TEST_SKIP }, async () => {
    console.log('\n  Testing arcCoherence position-sensitivity (target: AUC ≥0.70)...');
    
    const result = await measureCorpusAUC(
      report => {
        if (!report.storyGraph) return 0.5;
        // Normalize from [-1, 1] to [0, 1]
        return (report.storyGraph.graph.arcCoherence + 1) / 2;
      },
      { maxScripts: 50, minScenes: 15 }
    );
    
    console.log(`\n  Results (n=${result.n}):`);
    console.log(`    AUC:         ${result.auc.toFixed(3)}`);
    console.log(`    Mean intact: ${result.meanGood.toFixed(3)}`);
    console.log(`    Mean swapped: ${result.meanBad.toFixed(3)}`);
    console.log(`    Separation:  ${result.separation.toFixed(3)}`);
    console.log(`    Skipped:     ${result.skipped.length} scripts`);
    
    assert.ok(
      result.auc >= 0.70,
      `arcCoherence AUC ${result.auc.toFixed(3)} < 0.70 target — ` +
      `position-aware tension correlation should detect scrambled narrative structure`
    );
  });
  
  it('graphHealth: composite metric detects structural disruption in act-swapped scripts (AUC ≥0.70)', { skip: CORPUS_TEST_SKIP }, async () => {
    console.log('\n  Testing graphHealth composite position-sensitivity (target: AUC ≥0.70)...');
    
    const result = await measureCorpusAUC(
      report => report.storyGraph?.graphHealth ?? 50,
      { maxScripts: 50, minScenes: 15 }
    );
    
    console.log(`\n  Results (n=${result.n}):`);
    console.log(`    AUC:         ${result.auc.toFixed(3)}`);
    console.log(`    Mean intact: ${result.meanGood.toFixed(3)}`);
    console.log(`    Mean swapped: ${result.meanBad.toFixed(3)}`);
    console.log(`    Separation:  ${result.separation.toFixed(3)}`);
    console.log(`    Skipped:     ${result.skipped.length} scripts`);
    
    assert.ok(
      result.auc >= 0.70,
      `graphHealth AUC ${result.auc.toFixed(3)} < 0.70 target — ` +
      `composite graph metric should detect large-scale structural scrambling`
    );
  });
  
  it('escalationMonotonicity: act-to-act tension rise disrupted by act-swap (informational)', { skip: CORPUS_TEST_SKIP }, async () => {
    console.log('\n  Testing escalationMonotonicity position-sensitivity (informational)...');
    
    const result = await measureCorpusAUC(
      report => report.storyGraph?.graph.escalationMonotonicity ?? 0.5,
      { maxScripts: 30, minScenes: 15 }
    );
    
    console.log(`\n  Results (n=${result.n}):`);
    console.log(`    AUC:         ${result.auc.toFixed(3)}`);
    console.log(`    Mean intact: ${result.meanGood.toFixed(3)}`);
    console.log(`    Mean swapped: ${result.meanBad.toFixed(3)}`);
    console.log(`    Separation:  ${result.separation.toFixed(3)}`);

    // BEHAVIOURAL (2026-09-02 vacuous-test sweep): this test had NO assertion at
    // all, so a measurement harness that silently produced nothing — zero
    // scripts, NaN AUC — reported clean. The AUC VALUE stays informational (no
    // floor is claimed for escalationMonotonicity), but the MEASUREMENT must be
    // valid or the printed numbers above are noise.
    assert.ok(result.n > 0,
      'the measurement must actually cover scripts; n=0 means the corpus filter excluded everything');
    assert.ok(Number.isFinite(result.auc) && result.auc >= 0 && result.auc <= 1,
      `AUC must be a real probability, got ${result.auc}`);
    assert.ok(Number.isFinite(result.meanGood) && Number.isFinite(result.meanBad),
      `both means must be finite, got intact=${result.meanGood} swapped=${result.meanBad}`);
    assert.ok(Math.abs(result.separation - (result.meanGood - result.meanBad)) < 1e-9,
      'separation must equal meanGood - meanBad, or the printed report is internally inconsistent');
  });
});
