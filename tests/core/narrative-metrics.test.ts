// Unit tests for server/nvm/analyze/metrics.ts — the deterministic narrative
// metrics module (blueprint §27, agent B1-c). Conventions: node:test +
// assert/strict, hand-built ScreenplaySceneRecord fixtures (matching
// tests/core/fountain-analyzer.test.ts / tests/passes/*.test.ts's fixture
// style), no Math.random anywhere — every varied fixture below is derived
// deterministically from its index so a failure is always reproducible.
//
// Every expected number below was cross-checked against a live run of the
// module before being hardcoded (not hand-derived from the formula alone),
// so these assertions double as a regression pin, not just a shape check.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computePivotStrength,
  computeCliffhangerStrength,
  computeSuspenseEntropy,
  computeMomentumConsistency,
  computeSurpriseProxy,
  computeInformationAsymmetryStrength,
  computePacingFit,
  computeNarrativeCohesion,
  computeEmotionalImpactRange,
  computeTensionMeasures,
  computeNarrativeMetrics,
} from '../../server/nvm/analyze/metrics.ts';
import type { ScreenplaySceneRecord } from '../../server/nvm/screenplay/memory.ts';

// ── Fixture factory ───────────────────────────────────────────────────────────

function makeRecord(sceneIdx: number, overrides: Partial<ScreenplaySceneRecord> = {}): ScreenplaySceneRecord {
  return {
    commitId: `c${sceneIdx}`,
    sceneIdx,
    slug: `INT. ROOM ${sceneIdx} - DAY`,
    purpose: 'complicate',
    dramaticTurn: 'nothing much happens',
    revelation: null,
    emotionalShift: 'neutral',
    visualBeats: [],
    dialogueHighlights: [],
    unresolvedClues: [],
    seededClueIds: [],
    payoffSetupIds: [],
    clockRaised: false,
    clockDelta: 0,
    suspenseDelta: 0,
    curiosityDelta: 0,
    relationshipShifts: [],
    createdAt: 0,
    ...overrides,
  };
}

// ── pivotStrength ─────────────────────────────────────────────────────────────

describe('computePivotStrength', () => {
  it('fires near-maximal on a scene that flips valence, control, relationships, and questions at once', () => {
    const score = computePivotStrength(makeRecord(0, {
      emotionalShift: 'positive',
      powerFlipped: true,
      relationshipShifts: [
        { pairKey: 'a|b', dimension: 'affinity', amount: 1 },
        { pairKey: 'a|c', dimension: 'affinity', amount: 1 },
        { pairKey: 'b|c', dimension: 'affinity', amount: 1 },
      ],
      questionsRaised: 2,
      questionsResolved: 2,
    }));
    assert.equal(score, 100);
  });

  it('does not fire on a flat, static talky scene (no-fire)', () => {
    const score = computePivotStrength(makeRecord(0));
    assert.equal(score, 0);
  });

  it('stays in range and non-NaN when only some signals are present', () => {
    const score = computePivotStrength(makeRecord(0, { emotionalShift: 'negative', powerFlipped: false }));
    assert.ok(Number.isFinite(score));
    assert.ok(score >= 0 && score <= 100);
    assert.equal(score, 25); // only the emotion component fires (1 of 4 quarters)
  });
});

// ── cliffhangerStrength ───────────────────────────────────────────────────────

describe('computeCliffhangerStrength', () => {
  it('fires near-maximal on a clock+open-question+live-clue ending (fire)', () => {
    const score = computeCliffhangerStrength(makeRecord(0, {
      questionsRaised: 3,
      questionsResolvedSameScene: 0,
      suspenseDelta: 2,
      unresolvedClues: ['a', 'b', 'c'],
      clockRaised: true,
      questionsUnresolved: 0,
    }));
    assert.equal(score, 100);
  });

  it('scores 0 on a scene that closes every question it raised (no-fire)', () => {
    const score = computeCliffhangerStrength(makeRecord(0, {
      questionsRaised: 2,
      questionsResolvedSameScene: 2,
      suspenseDelta: -1,
    }));
    assert.equal(score, 0);
  });

  it('applies the confusion penalty when raised questions are never resolved anywhere', () => {
    const lowUnresolved = computeCliffhangerStrength(makeRecord(0, {
      questionsRaised: 3, questionsResolvedSameScene: 0, questionsUnresolved: 0,
    }));
    const highUnresolved = computeCliffhangerStrength(makeRecord(0, {
      questionsRaised: 3, questionsResolvedSameScene: 0, questionsUnresolved: 3,
    }));
    assert.equal(lowUnresolved, 25);
    assert.equal(highUnresolved, 0);
    assert.ok(highUnresolved < lowUnresolved);
  });
});

// ── twistImpact ───────────────────────────────────────────────────────────────

describe('twistImpact (via computeNarrativeMetrics)', () => {
  const sharedRevelation = 'the locket reveals everything about her past';

  it('recontextualizing 4 earlier scenes beats recontextualizing 0', () => {
    const recontextualizesAll: ScreenplaySceneRecord[] = [
      makeRecord(0, { dramaticTurn: 'the locket gleams in candlelight' }),
      makeRecord(1, { dramaticTurn: 'someone mentions the locket again' }),
      makeRecord(2, { dramaticTurn: 'the locket is hidden away' }),
      makeRecord(3, { dramaticTurn: 'a locket falls from her pocket' }),
      makeRecord(4, { revelation: sharedRevelation }),
    ];
    const recontextualizesNone: ScreenplaySceneRecord[] = [
      makeRecord(0, { dramaticTurn: 'kitchen argument brews' }),
      makeRecord(1, { dramaticTurn: 'harbor storm gathers' }),
      makeRecord(2, { dramaticTurn: 'attic silence lingers' }),
      makeRecord(3, { dramaticTurn: 'garden gate creaks' }),
      makeRecord(4, { revelation: sharedRevelation }),
    ];

    const allImpact = computeNarrativeMetrics(recontextualizesAll).perScene[4].twistImpact;
    const noneImpact = computeNarrativeMetrics(recontextualizesNone).perScene[4].twistImpact;
    assert.equal(allImpact, 36);
    assert.equal(noneImpact, 0);
    assert.ok(allImpact > noneImpact);
  });

  it('scales monotonically with how many earlier scenes are recontextualized (1 of 4 < 4 of 4)', () => {
    const recontextualizesOne: ScreenplaySceneRecord[] = [
      makeRecord(0, { dramaticTurn: 'kitchen argument brews' }),
      makeRecord(1, { dramaticTurn: 'harbor storm gathers' }),
      makeRecord(2, { dramaticTurn: 'attic silence lingers' }),
      makeRecord(3, { dramaticTurn: 'a locket falls from her pocket' }),
      makeRecord(4, { revelation: sharedRevelation }),
    ];
    const oneImpact = computeNarrativeMetrics(recontextualizesOne).perScene[4].twistImpact;
    assert.equal(oneImpact, 9);
    assert.ok(oneImpact > 0 && oneImpact < 36);
  });

  it('scores 0 with no revelation at all (no-fire)', () => {
    const records = [makeRecord(0, { dramaticTurn: 'setup scene' }), makeRecord(1)];
    assert.equal(computeNarrativeMetrics(records).perScene[1].twistImpact, 0);
  });

  it('scores 0 for a revelation in the very first scene (no earlier scenes to recontextualize)', () => {
    const records = [makeRecord(0, { revelation: sharedRevelation }), makeRecord(1)];
    assert.equal(computeNarrativeMetrics(records).perScene[0].twistImpact, 0);
  });
});

// ── suspenseEntropy ────────────────────────────────────────────────────────────

describe('computeSuspenseEntropy', () => {
  it('rewards a variated rise-and-fall pattern (fire)', () => {
    const alternating = [1, -1, 1, -1, 1, -1].map((v, i) => makeRecord(i, { suspenseDelta: v }));
    const score = computeSuspenseEntropy(alternating);
    assert.equal(score, 95);
  });

  it('does not reward a monotone ramp (no-fire)', () => {
    const ramp = [1, 2, 3, 4, 5, 6].map((v, i) => makeRecord(i, { suspenseDelta: v }));
    assert.equal(computeSuspenseEntropy(ramp), 0);
  });

  it('scores 0 on a flat line (zero variance, guarded not to divide by zero)', () => {
    const flat = [1, 1, 1, 1].map((v, i) => makeRecord(i, { suspenseDelta: v }));
    assert.equal(computeSuspenseEntropy(flat), 0);
  });

  it('scores 0 for fewer than 3 scenes (a reversal needs 3 points to define)', () => {
    assert.equal(computeSuspenseEntropy([]), 0);
    assert.equal(computeSuspenseEntropy([makeRecord(0, { suspenseDelta: 1 })]), 0);
    assert.equal(computeSuspenseEntropy([1, 2].map((v, i) => makeRecord(i, { suspenseDelta: v }))), 0);
  });
});

// ── momentumConsistency ────────────────────────────────────────────────────────

describe('computeMomentumConsistency', () => {
  it('scores high when every scene carries some forward pressure (fire)', () => {
    const steady = [1, 1, 1, 1, 1].map((v, i) => makeRecord(i, { suspenseDelta: v }));
    assert.equal(computeMomentumConsistency(steady), 100);
  });

  it('scores lower across a long dead stretch (no-fire)', () => {
    const stalled = [0, 0, 0, 0, 1].map((v, i) => makeRecord(i, { suspenseDelta: v }));
    assert.equal(computeMomentumConsistency(stalled), 20);
  });

  it('returns exactly 0 (never NaN) when every signal is zero for every scene', () => {
    const allZero = [0, 0, 0, 0, 0].map((v, i) => makeRecord(i, { suspenseDelta: v }));
    const score = computeMomentumConsistency(allZero);
    assert.equal(score, 0);
    assert.ok(Number.isFinite(score));
  });

  it('returns 0 for an empty script', () => {
    assert.equal(computeMomentumConsistency([]), 0);
  });
});

// ── surpriseProxy ──────────────────────────────────────────────────────────────

describe('computeSurpriseProxy', () => {
  it('scores 0 for the first scene (no preceding distribution to be rare against)', () => {
    const records = [makeRecord(0), makeRecord(1)];
    assert.equal(computeSurpriseProxy(records)[0], 0);
  });

  it('scores 0 for a repeat of the only fingerprint seen so far, and 100 for a genuinely novel one', () => {
    const records = [
      makeRecord(0, { emotionalShift: 'neutral' }),
      makeRecord(1, { emotionalShift: 'neutral' }),
      makeRecord(2, { emotionalShift: 'positive', clockRaised: true, powerFlipped: true, revelation: 'x', purpose: 'climax' }),
    ];
    const scores = computeSurpriseProxy(records);
    assert.deepEqual(scores, [0, 0, 100]);
  });
});

// ── informationAsymmetryStrength ───────────────────────────────────────────────

describe('computeInformationAsymmetryStrength', () => {
  it('fires high when a revelation, unpaid clues, and open questions all coincide', () => {
    const score = computeInformationAsymmetryStrength(makeRecord(0, {
      revelation: 'x', unresolvedClues: ['a', 'b', 'c'], questionsRaised: 3, questionsResolvedSameScene: 0,
    }));
    assert.equal(score, 100);
  });

  it('scores 0 when nothing is withheld from the audience (no-fire)', () => {
    assert.equal(computeInformationAsymmetryStrength(makeRecord(0)), 0);
  });
});

// ── pacingFit ──────────────────────────────────────────────────────────────────

describe('computePacingFit', () => {
  const rising = [1, 2, 3, 4, 5, 6, 7, 8].map((_, i) => makeRecord(i, { suspenseDelta: 1 }));

  it('scores a rising trajectory a better fit against a rising arc than a falling arc', () => {
    const risingArcFit = computePacingFit(rising, 'rags_to_riches');
    const fallingArcFit = computePacingFit(rising, 'riches_to_rags');
    assert.equal(risingArcFit.script, 95);
    assert.equal(fallingArcFit.script, 52);
    assert.ok((risingArcFit.script as number) > (fallingArcFit.script as number));
    for (const f of risingArcFit.perScene) assert.ok(f !== null && f >= 0 && f <= 100);
  });

  it('returns null honestly (not a fabricated neutral score) when no arc is configured', () => {
    const result = computePacingFit(rising);
    assert.equal(result.script, null);
    assert.ok(result.perScene.every(f => f === null));
  });

  it('returns null honestly for an unrecognized arc string', () => {
    const result = computePacingFit(rising, 'not_a_real_arc');
    assert.equal(result.script, null);
    assert.ok(result.perScene.every(f => f === null));
  });

  it('is surfaced through computeNarrativeMetrics with the same honest-null behavior', () => {
    const report = computeNarrativeMetrics(rising);
    assert.equal(report.script.pacingFit, null);
    for (const s of report.perScene) assert.equal(s.pacingFit, null);
  });
});

// ── narrativeCohesion ──────────────────────────────────────────────────────────

describe('computeNarrativeCohesion', () => {
  it('scores 100 when every scene shares vocabulary with another (fire)', () => {
    const connected = [0, 1, 2].map(i => makeRecord(i, { dramaticTurn: 'the silver coin gleams' }));
    assert.equal(computeNarrativeCohesion(connected), 100);
  });

  it('scores 0 when no scene shares anything with any other (no-fire, all orphans)', () => {
    const disconnected = [
      makeRecord(0, { dramaticTurn: 'kitchen argument brews' }),
      makeRecord(1, { dramaticTurn: 'harbor storm gathers' }),
      makeRecord(2, { dramaticTurn: 'attic silence lingers' }),
    ];
    assert.equal(computeNarrativeCohesion(disconnected), 0);
  });

  it('treats clue-id overlap as a connection even with disjoint prose', () => {
    const connectedByClue = [
      makeRecord(0, { dramaticTurn: 'kitchen argument brews', seededClueIds: ['clue-1'] }),
      makeRecord(1, { dramaticTurn: 'harbor storm gathers', payoffSetupIds: ['clue-1'] }),
    ];
    assert.equal(computeNarrativeCohesion(connectedByClue), 100);
  });

  it('defaults to 100 for a degenerate 0- or 1-scene script (vacuously cohesive)', () => {
    assert.equal(computeNarrativeCohesion([]), 100);
    assert.equal(computeNarrativeCohesion([makeRecord(0)]), 100);
  });
});

// ── emotionalImpactRange ───────────────────────────────────────────────────────

describe('computeEmotionalImpactRange', () => {
  it('reports a nonzero peak and spread across a wide-dynamic-range script (fire)', () => {
    const wideRange = [0, 3].map((v, i) => makeRecord(i, { suspenseDelta: v }));
    const { peak, spread } = computeEmotionalImpactRange(wideRange);
    assert.equal(peak, 100);
    assert.equal(spread, 75);
  });

  it('reports {peak: 0, spread: 0} for a flat, low-intensity script (no-fire)', () => {
    const flat = [0, 0].map((v, i) => makeRecord(i, { suspenseDelta: v }));
    assert.deepEqual(computeEmotionalImpactRange(flat), { peak: 0, spread: 0 });
  });

  it('guards to {peak: 0, spread: 0} for an empty script', () => {
    assert.deepEqual(computeEmotionalImpactRange([]), { peak: 0, spread: 0 });
  });
});

// ── tensionMeasures ────────────────────────────────────────────────────────────

describe('computeTensionMeasures', () => {
  it('reads structural pressure high when clocks and open questions are live everywhere (fire)', () => {
    const pressured = [0, 1, 2].map(i => makeRecord(i, { clockRaised: true, questionsRaised: 3, questionsResolvedSameScene: 0 }));
    const measures = computeTensionMeasures(pressured);
    assert.equal(measures.structural, 100);
  });

  it('reads structural pressure at 0 with no clocks or open questions anywhere (no-fire)', () => {
    const quiet = [0, 1, 2].map(i => makeRecord(i));
    assert.equal(computeTensionMeasures(quiet).structural, 0);
  });

  it('reads rhythmic above 50 for a compressing (shrinking) scene-density trend', () => {
    const compressing = [
      makeRecord(0, { visualBeats: ['a', 'b', 'c'] }),
      makeRecord(1, { visualBeats: ['a', 'b'] }),
      makeRecord(2, { visualBeats: ['a'] }),
    ];
    assert.equal(computeTensionMeasures(compressing).rhythmic, 100);
  });

  it('reads rhythmic below 50 for an expanding scene-density trend', () => {
    const expanding = [
      makeRecord(0, { visualBeats: ['a'] }),
      makeRecord(1, { visualBeats: ['a', 'b'] }),
      makeRecord(2, { visualBeats: ['a', 'b', 'c'] }),
    ];
    assert.equal(computeTensionMeasures(expanding).rhythmic, 0);
  });

  it('centers rhythmic at 50 (no trend definable) for fewer than 2 scenes or an empty script', () => {
    assert.equal(computeTensionMeasures([]).rhythmic, 50);
    assert.equal(computeTensionMeasures([makeRecord(0)]).rhythmic, 50);
  });

  it('reads lexical as the signed raw mean of suspenseDelta (unbounded, not clamped to 0-100)', () => {
    const rising = [1, 2, 3].map((v, i) => makeRecord(i, { suspenseDelta: v }));
    const draining = [-1, -2, -3].map((v, i) => makeRecord(i, { suspenseDelta: v }));
    assert.equal(computeTensionMeasures(rising).lexical, 2);
    assert.equal(computeTensionMeasures(draining).lexical, -2);
  });

  it('reads asymmetric as the mean of computeInformationAsymmetryStrength across scenes', () => {
    const records = [0, 1, 2].map(i => makeRecord(i, { clockRaised: true, questionsRaised: 3, questionsResolvedSameScene: 0 }));
    const expected = Math.round(
      records.reduce((s, r) => s + computeInformationAsymmetryStrength(r), 0) / records.length,
    );
    assert.equal(computeTensionMeasures(records).asymmetric, expected);
  });

  it('guards every field to a finite, non-NaN default for an empty script', () => {
    const measures = computeTensionMeasures([]);
    assert.deepEqual(measures, { lexical: 0, structural: 0, rhythmic: 50, asymmetric: 0 });
    for (const v of Object.values(measures)) assert.ok(Number.isFinite(v));
  });
});

// ── computeNarrativeMetrics — integration + edge cases ────────────────────────

describe('computeNarrativeMetrics — edge cases', () => {
  it('handles an empty records array without throwing, returning an all-neutral summary', () => {
    const report = computeNarrativeMetrics([]);
    assert.deepEqual(report.perScene, []);
    assert.equal(report.script.sceneCount, 0);
    assert.equal(report.script.suspenseEntropy, 0);
    assert.equal(report.script.momentumConsistency, 0);
    assert.equal(report.script.finalCliffhangerStrength, 0);
    assert.equal(report.script.pacingFit, null);
    assert.equal(report.script.narrativeCohesion, 100);
    assert.deepEqual(report.script.emotionalImpactRange, { peak: 0, spread: 0 });
    assert.deepEqual(report.script.tensionMeasures, { lexical: 0, structural: 0, rhythmic: 50, asymmetric: 0 });
  });

  it('handles a single-scene script without throwing or producing NaN', () => {
    const report = computeNarrativeMetrics([makeRecord(0)]);
    assert.equal(report.perScene.length, 1);
    for (const v of Object.values(report.perScene[0])) {
      if (typeof v === 'number') assert.ok(Number.isFinite(v));
    }
    assert.equal(report.perScene[0].twistImpact, 0);
    assert.equal(report.script.narrativeCohesion, 100);
  });

  it('returns every field as 0 (never NaN) when every scene has every signal at zero/absent', () => {
    const allZero = [makeRecord(0), makeRecord(1), makeRecord(2)];
    const report = computeNarrativeMetrics(allZero);
    for (const scene of report.perScene) {
      assert.equal(scene.pivotStrength, 0);
      assert.equal(scene.cliffhangerStrength, 0);
      assert.equal(scene.twistImpact, 0);
      assert.equal(scene.informationAsymmetryStrength, 0);
    }
    assert.equal(report.script.suspenseEntropy, 0);
    assert.equal(report.script.momentumConsistency, 0);
  });

  it('stays within documented ranges on a deterministically-varied multi-scene fixture (index-derived, no Math.random)', () => {
    const varied: ScreenplaySceneRecord[] = [];
    for (let i = 0; i < 15; i++) {
      varied.push(makeRecord(i, {
        emotionalShift: (['neutral', 'positive', 'negative'] as const)[i % 3],
        powerFlipped: i % 4 === 0,
        relationshipShifts: i % 2 === 0 ? [{ pairKey: 'a|b', dimension: 'affinity', amount: (i % 5) - 2 }] : [],
        questionsRaised: i % 4,
        questionsResolved: i % 3,
        questionsResolvedSameScene: i % 2,
        questionsUnresolved: i % 5,
        suspenseDelta: Math.sin(i) * 2,
        curiosityDelta: Math.cos(i),
        clockRaised: i % 3 === 0,
        clockDelta: (i % 2) - 0.5,
        unresolvedClues: i % 2 === 0 ? [`clue${i}`] : [],
        revelation: i % 5 === 0 ? `revelation about topic${i} and secret${i}` : null,
        dramaticTurn: `event${i} happens with topic${i}`,
        visualBeats: i % 2 === 0 ? [`beat${i}`] : [],
        dialogueHighlights: i % 3 === 0 ? [`said${i}`] : [],
      }));
    }

    const report = computeNarrativeMetrics(varied, 'man_in_a_hole');

    for (const scene of report.perScene) {
      for (const key of ['pivotStrength', 'cliffhangerStrength', 'twistImpact', 'surpriseProxy', 'informationAsymmetryStrength'] as const) {
        const v = scene[key];
        assert.ok(Number.isFinite(v), `${key} must be finite`);
        assert.ok(v >= 0 && v <= 100, `${key}=${v} out of [0,100]`);
      }
      if (scene.pacingFit !== null) {
        assert.ok(scene.pacingFit >= 0 && scene.pacingFit <= 100);
      }
    }

    for (const key of ['suspenseEntropy', 'momentumConsistency', 'finalCliffhangerStrength', 'narrativeCohesion'] as const) {
      const v = report.script[key];
      assert.ok(Number.isFinite(v), `${key} must be finite`);
      assert.ok(v >= 0 && v <= 100, `${key}=${v} out of [0,100]`);
    }
    if (report.script.pacingFit !== null) {
      assert.ok(report.script.pacingFit >= 0 && report.script.pacingFit <= 100);
    }
    for (const key of ['peak', 'spread'] as const) {
      const v = report.script.emotionalImpactRange[key];
      assert.ok(Number.isFinite(v) && v >= 0 && v <= 100);
    }
    for (const key of ['structural', 'rhythmic', 'asymmetric'] as const) {
      const v = report.script.tensionMeasures[key];
      assert.ok(Number.isFinite(v) && v >= 0 && v <= 100, `${key}=${v} out of [0,100]`);
    }
    assert.ok(Number.isFinite(report.script.tensionMeasures.lexical));
  });

  it('is stable under permutation of the input array order (same records, different insertion order)', () => {
    const records = [makeRecord(0, { revelation: 'x' }), makeRecord(1), makeRecord(2, { suspenseDelta: 2 })];
    const shuffled = [records[2], records[0], records[1]];
    const a = computeNarrativeMetrics(records);
    const b = computeNarrativeMetrics(shuffled);
    assert.deepEqual(a, b);
  });
});
