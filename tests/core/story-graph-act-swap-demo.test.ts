// Story Graph Act-Swap Demonstration — Wave SG-1
//
// Demonstrates that Story Graph metrics discriminate intact scripts from
// act-swapped versions. This serves as a proof-of-concept before the full
// real-corpus AUC measurement (which requires REAL_SCRIPT_CORPUS_DIR to be
// set).
//
// CORRECTION (2026-08-24): it did not demonstrate that. The four
// discrimination tests below asserted `typeof value === 'number'` on both
// sides and never compared them, on a 6-scene fixture pair where all four
// metrics are measurably IDENTICAL between the intact and act-swapped cuts.
// They now compare the two sides on the committed 21-scene fixture pair in
// tests/fixtures/feature-scale-discrimination/, and the 6-scene pair's
// inertness is pinned as an explicit floor measurement. See the block comment
// above the first test for the numbers.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';

const FIXTURE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../fixtures/feature-scale-discrimination',
);
const INTACT_FIXTURE = readFileSync(path.join(FIXTURE_DIR, 'intact.fountain'), 'utf8');
const ACT_SWAPPED_FIXTURE = readFileSync(path.join(FIXTURE_DIR, 'act-swapped.fountain'), 'utf8');

describe('Story Graph — act-swap discrimination demonstration', () => {
  // A synthetic 3-act script with clear setup → payoff structure
  const intactScript = `
= ACT 1

INT. DETECTIVE OFFICE - DAY

Detective SARAH finds a cryptic note. "The key is under the bridge."

She examines it closely, suspicious.

EXT. CITY STREET - DAY

Sarah walks to the bridge, looking for clues.

= ACT 2

EXT. BRIDGE - DAY

Sarah finds a key hidden under the bridge.

She pockets it, determined.

INT. ABANDONED WAREHOUSE - NIGHT

Sarah uses the key to open a locked door.

Inside, she finds evidence of the crime.

= ACT 3

INT. POLICE STATION - DAY

Sarah presents the evidence to her captain.

The case is solved. Sarah feels triumphant.

EXT. CITY STREET - EVENING

Sarah walks home, the city lights reflecting her success.
  `.trim();

  // Act-swapped version: Act 3 → Act 1 → Act 2
  // Setup/payoff order is now broken (key used before it's found)
  const actSwappedScript = `
= ACT 3

INT. POLICE STATION - DAY

Sarah presents the evidence to her captain.

The case is solved. Sarah feels triumphant.

EXT. CITY STREET - EVENING

Sarah walks home, the city lights reflecting her success.

= ACT 1

INT. DETECTIVE OFFICE - DAY

Detective SARAH finds a cryptic note. "The key is under the bridge."

She examines it closely, suspicious.

EXT. CITY STREET - DAY

Sarah walks to the bridge, looking for clues.

= ACT 2

EXT. BRIDGE - DAY

Sarah finds a key hidden under the bridge.

She pockets it, determined.

INT. ABANDONED WAREHOUSE - NIGHT

Sarah uses the key to open a locked door.

Inside, she finds evidence of the crime.
  `.trim();

  // ── The four discrimination claims ────────────────────────────────────────
  //
  // These four tests are named 'intact script shows higher X than act-swapped
  // version'. Until 2026-08-24 all four asserted `typeof X === 'number'` on
  // both sides and printed the values to the console. They never compared
  // them. Measured on the 6-scene demo pair above:
  //
  //     metric                    intact    act-swapped
  //     forwardEdgeRatio            1.000       1.000
  //     arcCoherence                0.000       0.000
  //     escalationMonotonicity      0.000       0.000
  //     graphHealth                43          43
  //
  // Every value IDENTICAL. Four tests whose names claim discrimination were
  // green on a fixture where nothing discriminates, because `typeof` is true
  // of every possible number. The scripts above are only six scenes long —
  // arcCoherence needs a tension series to correlate against position, and
  // escalationMonotonicity needs acts with enough scenes to have a trend.
  //
  // So the claims now run against the committed 21-scene fixture pair in
  // tests/fixtures/feature-scale-discrimination/, which is a pure permutation
  // (identical scenes, identical word count, only the act order differs), and
  // the 6-scene pair is kept below as an explicit floor measurement.
  it('intact script shows higher forwardEdgeRatio than act-swapped version', async () => {
    const intact = await runScriptDoctor(INTACT_FIXTURE);
    const swapped = await runScriptDoctor(ACT_SWAPPED_FIXTURE);
    assert.ok(intact.storyGraph && swapped.storyGraph);

    const a = intact.storyGraph.graph.forwardEdgeRatio;
    const b = swapped.storyGraph.graph.forwardEdgeRatio;
    assert.ok(
      a > b,
      `forwardEdgeRatio must fall when the act-swap strands the payoff before its setup ` +
      `(intact ${a}, act-swapped ${b}; measured 1.0 vs the 0.5 no-paid-promise sentinel)`,
    );
  });

  it('intact script shows higher arcCoherence than act-swapped version', async () => {
    const intact = await runScriptDoctor(INTACT_FIXTURE);
    const swapped = await runScriptDoctor(ACT_SWAPPED_FIXTURE);
    assert.ok(intact.storyGraph && swapped.storyGraph);

    const a = intact.storyGraph.graph.arcCoherence;
    const b = swapped.storyGraph.graph.arcCoherence;
    assert.ok(
      a > b,
      `arcCoherence correlates tension against position, so scrambling the acts must lower it ` +
      `(intact ${a.toFixed(3)}, act-swapped ${b.toFixed(3)}; measured +0.679 vs -0.646)`,
    );
    assert.ok(a > 0 && b < 0, 'the intact cut should correlate and the swapped cut anti-correlate');
  });

  it('intact script shows higher escalationMonotonicity than act-swapped version', async () => {
    const intact = await runScriptDoctor(INTACT_FIXTURE);
    const swapped = await runScriptDoctor(ACT_SWAPPED_FIXTURE);
    assert.ok(intact.storyGraph && swapped.storyGraph);

    const a = intact.storyGraph.graph.escalationMonotonicity;
    const b = swapped.storyGraph.graph.escalationMonotonicity;
    assert.ok(
      a > b,
      `escalation must read as less monotonic once the acts are out of order ` +
      `(intact ${a}, act-swapped ${b}; measured 1.0 vs 0.5)`,
    );
  });

  it('intact script shows higher graphHealth than act-swapped version', async () => {
    const intact = await runScriptDoctor(INTACT_FIXTURE);
    const swapped = await runScriptDoctor(ACT_SWAPPED_FIXTURE);
    assert.ok(intact.storyGraph && swapped.storyGraph);

    const a = intact.storyGraph.graphHealth;
    const b = swapped.storyGraph.graphHealth;
    assert.ok(
      a > b + 20,
      `graphHealth composites promisePaymentRatio, forwardEdgeRatio and arcCoherence, so it ` +
      `must drop hard on the swap (intact ${a}, act-swapped ${b}; measured 64 vs 25)`,
    );
  });

  it('FLOOR: the 6-scene demo pair does NOT discriminate — the measurement that moved the four tests above', async () => {
    // This is the honest record of what the demo fixture can and cannot do. It
    // is asserted, not just commented, so the situation cannot quietly change
    // in either direction without somebody being told.
    const intact = await runScriptDoctor(intactScript);
    const swapped = await runScriptDoctor(actSwappedScript);
    assert.ok(intact.storyGraph && swapped.storyGraph);

    const same = (label: string, a: number, b: number) => assert.equal(
      a, b,
      `${label} differs between the 6-scene intact and act-swapped demo scripts (${a} vs ${b}). ` +
      'Measured 2026-08-24 they were identical, which is why the four discrimination tests ' +
      'above run on the 21-scene committed fixture pair instead. If this assertion fails ' +
      'because the story-graph extractor now separates at six scenes, that is an IMPROVEMENT: ' +
      'record the new numbers and consider whether the fixture can carry a real claim again.',
    );
    same('forwardEdgeRatio', intact.storyGraph.graph.forwardEdgeRatio, swapped.storyGraph.graph.forwardEdgeRatio);
    same('arcCoherence', intact.storyGraph.graph.arcCoherence, swapped.storyGraph.graph.arcCoherence);
    same('escalationMonotonicity', intact.storyGraph.graph.escalationMonotonicity, swapped.storyGraph.graph.escalationMonotonicity);
    same('graphHealth', intact.storyGraph.graphHealth, swapped.storyGraph.graphHealth);
  });
  it('demonstrates all story graph metrics are computed', async () => {
    const report = await runScriptDoctor(intactScript);
    
    assert.ok(report.storyGraph, 'Story graph should be present');
    const graph = report.storyGraph.graph;
    
    // Verify all metrics exist and are valid
    assert.ok(typeof graph.promisePaymentRatio === 'number');
    assert.ok(graph.promisePaymentRatio >= 0 && graph.promisePaymentRatio <= 1);
    
    assert.ok(typeof graph.forwardEdgeRatio === 'number');
    assert.ok(graph.forwardEdgeRatio >= 0 && graph.forwardEdgeRatio <= 1);
    
    assert.ok(typeof graph.arcCoherence === 'number');
    assert.ok(graph.arcCoherence >= -1 && graph.arcCoherence <= 1);
    
    assert.ok(typeof graph.escalationMonotonicity === 'number');
    assert.ok(graph.escalationMonotonicity >= 0 && graph.escalationMonotonicity <= 1);
    
    assert.ok(typeof graph.causalDensity === 'number');
    assert.ok(graph.causalDensity >= 0);
    
    assert.ok(Array.isArray(graph.isolatedScenes));
    assert.ok(Array.isArray(graph.unpaidPromises));

    // BEHAVIOURAL (2026-09-02 vacuous-test sweep): every assertion above is a
    // typeof or a range check, all of which a graph of hard-coded zeros
    // satisfies — so "all metrics are computed" was never actually tested.
    // Require the graph to be non-degenerate: real nodes, real edges, and a
    // composite health that is neither 0 nor 100.
    assert.ok(graph.nodes.length > 0, 'a computed graph must have nodes');
    assert.ok(graph.edges.length > 0, 'a computed graph must have edges');
    assert.equal(graph.scored, true, 'the graph must report itself as scored');
    assert.ok(Number.isFinite(report.storyGraph.graphHealth));
    assert.ok(report.storyGraph.graphHealth > 0 && report.storyGraph.graphHealth < 100,
      `graphHealth ${report.storyGraph.graphHealth} is pinned to a rail — that is not a computed composite`);
    assert.equal(graph.causalDensity, graph.edges.length / graph.nodes.length,
      'causalDensity must be derived from the graph it ships with, not stored independently');
    assert.ok(
      new Set([graph.promisePaymentRatio, graph.forwardEdgeRatio, graph.arcCoherence, graph.escalationMonotonicity]).size > 1,
      'all four ratio metrics returned the same value — they are not independently computed',
    );
  });
});
