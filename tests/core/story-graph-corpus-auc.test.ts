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

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';

const CORPUS_DIR = process.env.STORY_GRAPH_CORPUS_DIR;

describe('Story Graph Position-Sensitivity Regression', () => {
  if (!CORPUS_DIR || !existsSync(CORPUS_DIR)) {
    console.log('  ⚠ STORY_GRAPH_CORPUS_DIR not set or invalid, skipping position-sensitivity tests');
    console.log('    Set to merged-fountain corpus path to enable (e.g., from corpus-pipeline)');
    return;
  }

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
    
    const files = readdirSync(CORPUS_DIR)
      .filter(f => f.endsWith('.fountain.txt'))
      .slice(0, maxScripts * 2); // Sample more, filter later
    
    const goods: number[] = [];
    const bads: number[] = [];
    const skipped: string[] = [];
    
    for (const file of files) {
      if (goods.length >= maxScripts) break;
      
      try {
        const fountain = readFileSync(path.join(CORPUS_DIR, file), 'utf8');
        
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
        skipped.push(`${file} (error: ${err.message})`);
      }
    }
    
    const auc = computeAUC(goods, bads);
    const meanGood = goods.reduce((a, b) => a + b, 0) / goods.length;
    const meanBad = bads.reduce((a, b) => a + b, 0) / bads.length;
    const separation = meanGood - meanBad;
    
    return { auc, goods, bads, meanGood, meanBad, separation, skipped, n: goods.length };
  }
  
  it('forwardEdgeRatio: detects backward causality in act-swapped scripts (AUC ≥0.70)', async () => {
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
  
  it('arcCoherence: detects tension-position disruption in act-swapped scripts (AUC ≥0.70)', async () => {
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
  
  it('graphHealth: composite metric detects structural disruption in act-swapped scripts (AUC ≥0.70)', async () => {
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
  
  it('escalationMonotonicity: act-to-act tension rise disrupted by act-swap (informational)', async () => {
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
    
    // Informational only, no hard assertion
  });
});
