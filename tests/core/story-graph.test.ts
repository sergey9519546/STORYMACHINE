// Story Graph tests — Wave SG-1
//
// Tests that the Story Graph layer correctly constructs causal-temporal graphs
// from existing scene signals and that graph-native metrics discriminate intact
// scripts from structurally degraded versions (act-swapped).
//
// Key discriminators:
// - forwardEdgeRatio: 1.0 while paid promises exist; falls to computeGraphMetrics'
//   0.5 no-data sentinel when a degradation strands the payoff before its setup.
//   It does NOT count reversed edges — see the act-swap block for why it cannot.
// - arcCoherence: intact scripts show tension rising with position; act-swapped
//   scripts ANTI-correlate with it. This is the metric that truly reads order.
// - promisePaymentRatio: setup/payoff closure — falls when a payoff is stranded
//
// The act-swap discrimination block below runs against the committed 21-scene
// fixture pair in tests/fixtures/feature-scale-discrimination/, not against
// 3-scene sketches. It previously ran on a 3-scene fixture and asserted only
// types and ranges; see that block's header for the full account.

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

describe('Story Graph — core construction', () => {
  it('builds graph from scene records with promises', async () => {
    const fountain = `
INT. OFFICE - DAY

Alice finds a locked briefcase.

She examines the lock closely.

INT. CAFE - DAY

Bob mentions he lost his key.

INT. OFFICE - NIGHT

Alice opens the briefcase with Bob's key.
    `.trim();
    
    const report = await runScriptDoctor(fountain);
    assert.ok(report.storyGraph, 'Story graph should be present');
    assert.ok(report.storyGraph.graph.nodes.length > 0, 'Should have nodes');
    assert.ok(report.storyGraph.graph.edges.length > 0, 'Should have edges');
    assert.strictEqual(report.storyGraph.graph.scored, true, 'Graph should be marked as scored');
  });
  
  it('handles scripts with no promises gracefully', async () => {
    const fountain = `
INT. ROOM - DAY

Character sits.

Character stands.
    `.trim();
    
    const report = await runScriptDoctor(fountain);
    assert.ok(report.storyGraph, 'Story graph should be present even with no promises');
    assert.strictEqual(report.storyGraph.graph.promisePaymentRatio, 1.0, 'Should default to 1.0 when no promises');
    assert.strictEqual(report.storyGraph.graph.unpaidPromises.length, 0, 'Should have zero unpaid promises');
  });
  
  it('computes promise-payment ratio correctly', async () => {
    const fountain = `
INT. A - DAY

Plant clue A.

Plant clue B.

INT. B - DAY

Resolve clue A.

INT. C - DAY

Nothing happens.
    `.trim();
    
    const report = await runScriptDoctor(fountain);
    assert.ok(report.storyGraph);
    
    // Note: This test may not work as expected because the fountain text above
    // doesn't use the actual signal format that fountain-analyzer.ts expects.
    // The analyzer looks for specific patterns in scene records, not raw text.
    // This is a placeholder that would need real SEED_CLUE/PAYOFF_SETUP signals
    // in the scene records, which come from ops in the full system.
    // For now, we test that the ratio is computed without errors.
    assert.ok(typeof report.storyGraph.graph.promisePaymentRatio === 'number');
    assert.ok(report.storyGraph.graph.promisePaymentRatio >= 0);
    assert.ok(report.storyGraph.graph.promisePaymentRatio <= 1);
  });
});

// ── Act-swap discrimination ────────────────────────────────────────────────
//
// WHAT THIS BLOCK USED TO BE, AND WHY IT CHANGED (2026-08-24):
//
// The test below was named 'intact scripts show higher forwardEdgeRatio than
// act-swapped versions'. It analysed a THREE-scene fixture and then asserted
// only `typeof === 'number'`, `>= 0` and `<= 1`. Replacing all three core
// story-graph metrics with the constant 0.5 left 13 of this file's 14 tests
// passing — the one test whose NAME made a discrimination claim could not
// detect the metrics being deleted, because it never compared the two scripts
// to each other. A sibling test, 'detects backward arcs in degraded scripts',
// had the same shape: it analysed a scrambled 3-scene fixture on its own and
// asserted a range.
//
// Both are now real comparisons, run on the committed 21-scene fixture pair in
// tests/fixtures/feature-scale-discrimination/. That pair is a pure
// permutation — identical scenes, identical word count, only the act order
// differs — so any metric difference is order-attributable. Measured:
//
//                          intact      act-swapped
//   forwardEdgeRatio         1.00         0.50
//   arcCoherence            +0.679       -0.646
//   promisePaymentRatio      0.167        0.00
//   graphHealth             64           25
//
// Each assertion below is a DIRECTION between those two columns, so stubbing
// any of the three metrics to a constant collapses the comparison and fails
// the test by name.
//
// ── AN HONEST NOTE ABOUT forwardEdgeRatio ──────────────────────────────────
// Its name suggests it counts causal edges that point backwards. It does not,
// and cannot. buildStoryGraph walks scenes in order and registers a payoff
// only when its setup is ALREADY in promiseMap, so a paid cross-scene promise
// always has seedIdx < payoffIdx and always counts as forward. The ratio can
// therefore only be 1.0 (paid promises exist, all necessarily forward) or the
// 0.5 SENTINEL that computeGraphMetrics returns when there are no paid
// promises at all. Act-swapping this fixture moves it 1.0 -> 0.5 not because
// edges reversed but because the payoff is lost: the fixture's ledger clue is
// introduced in Act I and resolved in Act III, so under the order III-I-II the
// resolution precedes the introduction, applyClueLifecycle represents that as
// payoffScene < seedScene, and buildStoryGraph drops the payoff on the floor.
// That is a genuine order signal and the direction is genuinely right — but it
// is a "the promise stopped being paid" signal, not a "the arrow flipped"
// signal, and the assertion below says so rather than pretending otherwise.
describe('Story Graph — act-swap discrimination', () => {
  it('intact scripts show higher forwardEdgeRatio than act-swapped versions', async () => {
    const intact = await runScriptDoctor(INTACT_FIXTURE);
    const swapped = await runScriptDoctor(ACT_SWAPPED_FIXTURE);

    assert.ok(intact.storyGraph && swapped.storyGraph, 'both reports should have story graphs');
    assert.equal(
      swapped.sceneCount, intact.sceneCount,
      'the pair must be a permutation, not a different script',
    );

    const intactRatio = intact.storyGraph.graph.forwardEdgeRatio;
    const swappedRatio = swapped.storyGraph.graph.forwardEdgeRatio;

    assert.ok(
      intactRatio > swappedRatio,
      `forwardEdgeRatio must be strictly higher on the intact cut ` +
      `(intact ${intactRatio}, act-swapped ${swappedRatio}). Measured 1.0 vs 0.5. ` +
      'Equal values mean the metric has stopped responding to scene order — which is ' +
      'what a constant stub looks like, and what this test failed to notice for its ' +
      'entire previous life.',
    );
    assert.equal(
      intactRatio, 1,
      'the intact cut pays its ledger promise forward, so every paid promise is forward',
    );
    assert.equal(
      swappedRatio, 0.5,
      'the act-swapped cut has NO paid promise left, so computeGraphMetrics returns its ' +
      '0.5 no-data sentinel — see the block comment: this is a lost payoff, not a ' +
      'reversed edge',
    );
  });

  it('act-swapping inverts arcCoherence — the metric that actually reads scene order', async () => {
    const intact = await runScriptDoctor(INTACT_FIXTURE);
    const swapped = await runScriptDoctor(ACT_SWAPPED_FIXTURE);
    assert.ok(intact.storyGraph && swapped.storyGraph);

    const intactArc = intact.storyGraph.graph.arcCoherence;
    const swappedArc = swapped.storyGraph.graph.arcCoherence;

    // arcCoherence is a Pearson correlation of tension against position, so it
    // is the one graph metric that is *defined* on order. Direction, not type.
    assert.ok(
      intactArc > 0,
      `a draft that builds should correlate tension with position (got ${intactArc.toFixed(3)}, measured +0.679)`,
    );
    assert.ok(
      swappedArc < 0,
      `the same scenes in the order III-I-II should ANTI-correlate (got ${swappedArc.toFixed(3)}, measured -0.646)`,
    );
    assert.ok(
      intactArc - swappedArc > 1.0,
      `the act-swap should open a wide gap in arcCoherence (intact ${intactArc.toFixed(3)}, ` +
      `swapped ${swappedArc.toFixed(3)}, gap ${(intactArc - swappedArc).toFixed(3)}, measured 1.325)`,
    );
  });

  it('act-swapping strands the promise it used to pay — promisePaymentRatio and graphHealth both fall', async () => {
    const intact = await runScriptDoctor(INTACT_FIXTURE);
    const swapped = await runScriptDoctor(ACT_SWAPPED_FIXTURE);
    assert.ok(intact.storyGraph && swapped.storyGraph);

    assert.ok(
      intact.storyGraph.graph.promisePaymentRatio > swapped.storyGraph.graph.promisePaymentRatio,
      `promisePaymentRatio must fall when the payoff is cut adrift from its setup ` +
      `(intact ${intact.storyGraph.graph.promisePaymentRatio}, ` +
      `swapped ${swapped.storyGraph.graph.promisePaymentRatio}; measured 0.167 vs 0)`,
    );
    assert.ok(
      swapped.storyGraph.graph.unpaidPromises.length > intact.storyGraph.graph.unpaidPromises.length,
      'the stranded promise must show up as unpaid, not vanish from the accounting',
    );
    assert.ok(
      intact.storyGraph.graphHealth > swapped.storyGraph.graphHealth + 20,
      `graphHealth composites the three metrics above, so it must drop hard on the swap ` +
      `(intact ${intact.storyGraph.graphHealth}, swapped ${swapped.storyGraph.graphHealth}; ` +
      'measured 64 vs 25)',
    );
  });

  it('detects backward arcs in degraded scripts', async () => {
    // The degraded script here is the committed act-swapped fixture, not a
    // 3-scene sketch: a backward arc needs enough scenes to HAVE an arc.
    const report = await runScriptDoctor(ACT_SWAPPED_FIXTURE);
    assert.ok(report.storyGraph);

    // A backward arc means tension falls as position rises. Assert the sign,
    // which is the claim the test's name makes — not the range, which every
    // possible value satisfies.
    assert.ok(
      report.storyGraph.graph.arcCoherence < 0,
      `a script whose acts run III-I-II should register a NEGATIVE arcCoherence, ` +
      `got ${report.storyGraph.graph.arcCoherence.toFixed(3)}`,
    );
    assert.ok(
      report.storyGraph.graph.escalationMonotonicity < 1,
      `escalation must not read as perfectly monotonic on a scrambled cut ` +
      `(got ${report.storyGraph.graph.escalationMonotonicity})`,
    );
  });
});

describe('Story Graph — findings generation', () => {
  it('generates findings for detected issues', async () => {
    const fountain = `
INT. ROOM - DAY

Scene with no connections.

INT. ANOTHER - DAY

Another isolated scene.
    `.trim();
    
    const report = await runScriptDoctor(fountain);
    assert.ok(report.storyGraph);
    
    // Phase 2: Enhanced diagnostics structure
    assert.ok(report.storyGraph.diagnostics);
    assert.ok(Array.isArray(report.storyGraph.diagnostics.critical));
    assert.ok(Array.isArray(report.storyGraph.diagnostics.medium));
    assert.ok(Array.isArray(report.storyGraph.diagnostics.low));
    assert.ok(Array.isArray(report.storyGraph.diagnostics.strengths));
    
    // Should have summary statistics
    assert.ok(report.storyGraph.summary);
    assert.ok(typeof report.storyGraph.summary.totalIssues === 'number');
    assert.ok(typeof report.storyGraph.summary.criticalCount === 'number');
    assert.ok(typeof report.storyGraph.summary.strengthCount === 'number');
    assert.ok(['strong', 'good', 'needs-work', 'weak'].includes(report.storyGraph.summary.overallAssessment));
  });
  
  it('computes graphHealth composite score', async () => {
    const fountain = `
INT. ROOM - DAY

A simple scene.
    `.trim();
    
    const report = await runScriptDoctor(fountain);
    assert.ok(report.storyGraph);
    assert.ok(typeof report.storyGraph.graphHealth === 'number');
    assert.ok(report.storyGraph.graphHealth >= 0);
    assert.ok(report.storyGraph.graphHealth <= 100);
  });
});

describe('Story Graph — metrics computation', () => {
  it('computes arcCoherence (tension vs position correlation)', async () => {
    const fountain = `
INT. A - DAY
Scene 1.

INT. B - DAY
Scene 2.

INT. C - DAY
Scene 3.
    `.trim();
    
    const report = await runScriptDoctor(fountain);
    assert.ok(report.storyGraph);
    
    // arcCoherence is Pearson correlation, range [-1, 1]
    assert.ok(typeof report.storyGraph.graph.arcCoherence === 'number');
    assert.ok(report.storyGraph.graph.arcCoherence >= -1);
    assert.ok(report.storyGraph.graph.arcCoherence <= 1);
  });
  
  it('computes escalationMonotonicity (tension rises across acts)', async () => {
    const fountain = `
= ACT 1
INT. A - DAY
Act 1 scene.

= ACT 2
INT. B - DAY
Act 2 scene.

= ACT 3
INT. C - DAY
Act 3 scene.
    `.trim();
    
    const report = await runScriptDoctor(fountain);
    assert.ok(report.storyGraph);
    
    // escalationMonotonicity is 0, 0.5, or 1.0 depending on act-to-act increases
    assert.ok(typeof report.storyGraph.graph.escalationMonotonicity === 'number');
    assert.ok(report.storyGraph.graph.escalationMonotonicity >= 0);
    assert.ok(report.storyGraph.graph.escalationMonotonicity <= 1);
  });
  
  it('computes causalDensity (edges per node)', async () => {
    const fountain = `
INT. A - DAY
First scene.

INT. B - DAY
Second scene.

INT. C - DAY
Third scene.
    `.trim();
    
    const report = await runScriptDoctor(fountain);
    assert.ok(report.storyGraph);

    // BEHAVIOURAL (2026-09-02 vacuous-test sweep): `typeof === 'number'` and
    // `>= 0` are satisfied by a hard-coded 0. causalDensity is DEFINED as
    // edges/nodes, so check it against the graph it was computed from, pin the
    // literal value for this fixture, and show it MOVES when the edge/node
    // ratio moves.
    const graph = report.storyGraph.graph;
    assert.strictEqual(graph.nodes.length, 3, 'three sluglines, three scene nodes, no promise nodes');
    assert.strictEqual(graph.edges.length, 2, 'two temporal edges chain the three scenes');
    assert.strictEqual(graph.causalDensity, graph.edges.length / graph.nodes.length);
    assert.ok(Math.abs(graph.causalDensity - 2 / 3) < 1e-12,
      `expected 2/3 for a 3-scene temporal chain, got ${graph.causalDensity}`);

    // Discrimination: a two-scene script is a 1/2 chain, so the metric must
    // report a different number rather than a constant.
    const shorter = await runScriptDoctor('INT. A - DAY\nFirst scene.\n\nINT. B - DAY\nSecond scene.');
    assert.ok(shorter.storyGraph);
    assert.strictEqual(shorter.storyGraph.graph.causalDensity, 0.5);
    assert.notStrictEqual(shorter.storyGraph.graph.causalDensity, graph.causalDensity);
  });
  
  it('identifies isolated scenes', async () => {
    const fountain = `
INT. A - DAY
First scene.

INT. B - DAY
Second scene.
    `.trim();
    
    const report = await runScriptDoctor(fountain);
    assert.ok(report.storyGraph);

    // BEHAVIOURAL (2026-09-02 vacuous-test sweep): `Array.isArray(...)` is true
    // of the empty array the metric always returned here, so the old test
    // proved only that a field exists. Assert the two sides of the documented
    // rule instead: sceneCount > 2 is required before anything is flagged.
    assert.deepStrictEqual(report.storyGraph.graph.isolatedScenes, [],
      'a two-scene script must flag nothing — the analyzer deliberately abstains below three scenes');

    const threeScenes = await runScriptDoctor(
      'INT. A - DAY\nFirst scene.\n\nINT. B - DAY\nSecond scene.\n\nINT. C - DAY\nThird scene.',
    );
    assert.ok(threeScenes.storyGraph);
    assert.deepStrictEqual(threeScenes.storyGraph.graph.isolatedScenes, [0, 1, 2],
      'once the three-scene floor is crossed, scenes with no causal/character-arc edge are named by index');

    // KNOWN WEAKNESS: isolatedScenes counts only `causal` and `character-arc`
    // edges (story-graph.ts:280-282). `causal` edges are ONLY ever emitted
    // between promise nodes (promise-setup-X → promise-payoff-X,
    // story-graph.ts:176-182), never between scene nodes, and `character-arc`
    // edges require two scenes to share a relationshipShift pairKey, which does
    // not fire on ordinary two-hander dialogue. The practical result is that
    // every scene of nearly every script over two scenes is reported as
    // "isolated", including the linked three-act fixtures in this file — the
    // metric does not discriminate connected scripts from disconnected ones. A
    // correct implementation would either count promise-link paths that pass
    // THROUGH a promise node as connecting the two scenes at its ends, or emit
    // scene→scene causal edges directly. story-graph.ts is reachable from
    // doctor.ts (scoring path), so fixing it needs a measure-real receipt and is
    // out of scope for this sweep; the assertions above record what it does.
  });
});

describe('Story Graph — edge cases', () => {
  it('handles empty script gracefully', async () => {
    const fountain = '';
    const report = await runScriptDoctor(fountain);
    
    // Empty scripts return null storyGraph
    assert.strictEqual(report.storyGraph, undefined);
  });
  
  it('handles single-scene script', async () => {
    const fountain = `
INT. ROOM - DAY
A single scene.
    `.trim();
    
    const report = await runScriptDoctor(fountain);
    assert.ok(report.storyGraph);
    assert.ok(report.storyGraph.graph.nodes.length >= 1);
  });
  
  it('handles very short scripts without errors', async () => {
    const fountain = `
INT. A - DAY
Scene 1.

INT. B - DAY
Scene 2.
    `.trim();
    
    const report = await runScriptDoctor(fountain);
    assert.ok(report.storyGraph);

    // BEHAVIOURAL (2026-09-02 vacuous-test sweep): two `typeof === 'number'`
    // checks pass for NaN, for -1, and for a frozen constant. "Safely" means
    // specific finite values, so pin them.
    const { graphHealth, graph } = report.storyGraph;
    assert.ok(Number.isFinite(graphHealth), `graphHealth must be finite, got ${graphHealth}`);
    assert.ok(graphHealth > 0 && graphHealth <= 100, `graphHealth out of range: ${graphHealth}`);
    assert.strictEqual(graphHealth, 70, 'a two-scene script with no unpaid promises scores 70');
    assert.strictEqual(graph.promisePaymentRatio, 1,
      'no promises seeded means none unpaid — the ratio is 1, not 0 or NaN');
    assert.deepStrictEqual(graph.unpaidPromises, [], 'nothing was promised, so nothing is outstanding');
    assert.strictEqual(graph.nodes.length, 2);
    assert.strictEqual(graph.scored, true);
  });
});
