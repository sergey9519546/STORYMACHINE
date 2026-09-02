// Tests for L37 (Deliberate Rule-Breaking) and L38 (Cross-Script Comparison).
// Positive fixtures construct scripts whose violations ARE compensated
// (should read as deliberate); negative fixtures construct uncompensated
// violations (must NOT be protected) or clean scripts (nothing to check).

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeRuleBreaking } from '../../server/nvm/quality/rule-breaking.ts';
import { compareScripts, summarizeScript } from '../../server/nvm/quality/cross-script.ts';
import type { FountainAnalysis } from '../../server/nvm/analyze/types.ts';
import type { ScreenplaySceneRecord } from '../../server/nvm/screenplay/memory.ts';

function scene(idx: number, overrides: Partial<ScreenplaySceneRecord> = {}): ScreenplaySceneRecord {
  return {
    sceneIdx: idx,
    slug: `INT. S${idx}`,
    purpose: 'complicate',
    dramaticTurn: '',
    revelation: null,
    emotionalShift: 'neutral',
    clockRaised: false,
    clockDelta: 0,
    suspenseDelta: 1,
    curiosityDelta: 0,
    seededClueIds: [],
    payoffSetupIds: [],
    unresolvedClues: [],
    recurringImageryIds: [],
    speakingCharacterCount: 2,
    ...overrides,
  } as ScreenplaySceneRecord;
}

function analysis(records: ScreenplaySceneRecord[]): FountainAnalysis {
  return {
    records,
    annotations: [],
    structure: { currentAct: 1, actBreaks: [], sceneCount: records.length } as never,
    characters: ['a', 'b'],
    sceneCount: records.length,
    dialogueLineCount: 0,
    actionLineCount: 0,
    wordCount: 1000,
  } as FountainAnalysis;
}

// ── L37: Rule-Breaking ────────────────────────────────────────────────────────

describe('L37 rule-breaking', () => {
  test('POSITIVE: passive protagonist with late-agency climax reads as deliberate', () => {
    // 12 scenes: no turns in first 8 (observational), 3 turns in last 4 (climax),
    // curiosity RISES into the finale (second compensation).
    const records = [
      ...Array.from({ length: 8 }, (_, i) => scene(i, { dramaticTurn: '', suspenseDelta: 1, curiosityDelta: 0.2 })),
      scene(8, { dramaticTurn: 'she finally refuses', suspenseDelta: 4, curiosityDelta: 2 }),
      scene(9, { dramaticTurn: 'and walks out', suspenseDelta: 5, curiosityDelta: 2 }),
      scene(10, { dramaticTurn: 'the confrontation lands', suspenseDelta: 5, curiosityDelta: 2 }),
      scene(11, { suspenseDelta: 3, curiosityDelta: 2 }),
    ];
    const report = analyzeRuleBreaking(analysis(records));
    const passive = report.findings.find(f => f.convention === 'passive_protagonist');
    assert.ok(passive, 'compensated passivity should be flagged as deliberate');
    assert.equal(passive!.readsAsDeliberate, true);
    assert.ok(passive!.confidence >= 0.65);
    assert.ok(passive!.preserveNotice.length > 0);
    assert.ok(passive!.compensations.length >= 2);
  });

  test('NEGATIVE: active protagonist (turns throughout) is not flagged', () => {
    const records = Array.from({ length: 12 }, (_, i) =>
      scene(i, { dramaticTurn: i % 2 === 0 ? 'move happens' : '', suspenseDelta: 2 }));
    const report = analyzeRuleBreaking(analysis(records));
    assert.equal(report.findings.filter(f => f.convention === 'passive_protagonist').length, 0);
  });

  test('NEGATIVE: passive protagonist with NO compensation is not protected', () => {
    // No turns anywhere, no curiosity rise — the passivity is just inert.
    const records = Array.from({ length: 12 }, (_, i) => scene(i, { dramaticTurn: '', suspenseDelta: 0 }));
    const report = analyzeRuleBreaking(analysis(records));
    assert.equal(report.findings.filter(f => f.convention === 'passive_protagonist').length, 0,
      'uncompensated violation is an ordinary flaw, not a protected choice');
  });

  test('POSITIVE: minimal dialogue compensated by visual density reads as deliberate', () => {
    const records = Array.from({ length: 10 }, (_, i) =>
      scene(i, {
        speakingCharacterCount: 0,                    // sparse dialogue
        visualBeats: ['x', 'y'],  // dense visuals
        revelation: i % 3 === 0 ? 'discovery beat' : null,
      }));
    const report = analyzeRuleBreaking(analysis(records));
    const minimal = report.findings.find(f => f.convention === 'minimal_dialogue');
    assert.ok(minimal, 'visually-compensated silence should be protected');
    assert.equal(minimal!.readsAsDeliberate, true);
  });

  test('NEGATIVE: sparse dialogue with no visual compensation is not protected', () => {
    const records = Array.from({ length: 10 }, (_, i) =>
      scene(i, { speakingCharacterCount: 0, visualBeats: [], revelation: null }));
    const report = analyzeRuleBreaking(analysis(records));
    assert.equal(report.findings.filter(f => f.convention === 'minimal_dialogue').length, 0);
  });

  test('POSITIVE: escalating repetition reads as deliberate dread engine', () => {
    const records = [
      ...Array.from({ length: 5 }, (_, i) => scene(i, { purpose: 'raise_stakes', suspenseDelta: 1 })),
      ...Array.from({ length: 5 }, (_, i) => scene(5 + i, { purpose: 'raise_stakes', suspenseDelta: 4 })),
    ];
    const report = analyzeRuleBreaking(analysis(records));
    const rep = report.findings.find(f => f.convention === 'repetitive_scene_shape');
    assert.ok(rep, 'escalating repetition should be protected');
    assert.equal(rep!.readsAsDeliberate, true);
  });

  test('NEGATIVE: flat repetition (no escalation) is not protected', () => {
    const records = Array.from({ length: 10 }, (_, i) =>
      scene(i, { purpose: 'raise_stakes', suspenseDelta: 1 }));
    const report = analyzeRuleBreaking(analysis(records));
    assert.equal(report.findings.filter(f => f.convention === 'repetitive_scene_shape').length, 0);
  });

  test('GUARD: empty script returns unscored', () => {
    const report = analyzeRuleBreaking(analysis([]));
    assert.equal(report.scored, false);
    assert.equal(report.findings.length, 0);
  });

  test('CHECKED list excludes fired conventions', () => {
    const records = [
      ...Array.from({ length: 8 }, (_, i) => scene(i, { dramaticTurn: '' })),
      scene(8, { dramaticTurn: 'turn' }), scene(9, { dramaticTurn: 'turn' }), scene(10, { dramaticTurn: 'turn' }), scene(11),
    ];
    const report = analyzeRuleBreaking(analysis(records));
    // BEHAVIOURAL (2026-09-02 vacuous-test sweep): the only assertion sat inside
    // `if (findings.some(...))`, so an analyzer that stopped firing
    // passive_protagonist skipped the test rather than failing it. Assert the
    // trigger fires, then the exclusion it implies — and prove the invariant
    // holds for EVERY fired convention, not just this one.
    assert.ok(report.findings.some(f => f.convention === 'passive_protagonist'),
      'eight turn-less scenes must fire passive_protagonist; without it the exclusion below is vacuous');
    assert.ok(!report.checked.includes('passive_protagonist'),
      'a convention that FIRED must not also be listed as merely CHECKED');
    for (const finding of report.findings) {
      assert.ok(!report.checked.includes(finding.convention),
        `${finding.convention} appears in both findings and the CHECKED list`);
    }
    assert.ok(report.checked.length > 0,
      'some conventions must still be reported as checked-and-clean, or the exclusion is trivially true');
  });
});

// ── L38: Cross-Script Comparison ──────────────────────────────────────────────

describe('L38 cross-script comparison', () => {
  test('summarizeScript computes correct densities', () => {
    const records = [
      scene(0, { purpose: 'raise_stakes', speakingCharacterCount: 0, suspenseDelta: 2 }),
      scene(1, { purpose: 'raise_stakes', speakingCharacterCount: 2, suspenseDelta: 4 }),
      scene(2, { purpose: 'climax', speakingCharacterCount: 2, suspenseDelta: 5 }),
      scene(3, { purpose: 'breather', speakingCharacterCount: 2, suspenseDelta: 0 }),
    ];
    const s = summarizeScript('test', analysis(records));
    assert.equal(s.sceneCount, 4);
    assert.equal(s.topPurpose, 'raise_stakes');
    assert.equal(s.topPurposeShare, 0.5);
    assert.equal(s.dialogueDensity, 0.75);
    assert.equal(s.suspensePeakPosition, 2 / 3);
  });

  test('POSITIVE: shared scene functions across 2 scripts produce a comparative record', () => {
    const scriptA = analysis([
      scene(0, { purpose: 'revelation', revelation: 'truth', speakingCharacterCount: 2 }),
      scene(1, { purpose: 'complicate' }),
      scene(2, { purpose: 'complicate' }),
    ]);
    const scriptB = analysis([
      scene(0, { purpose: 'complicate' }),
      scene(1, { purpose: 'revelation', revelation: 'truth', speakingCharacterCount: 0 }),
      scene(2, { purpose: 'revelation', revelation: 'again', speakingCharacterCount: 0 }),
    ]);
    const report = compareScripts([
      { label: 'A', analysis: scriptA },
      { label: 'B', analysis: scriptB },
    ]);
    assert.equal(report.scored, true);
    const shared = report.sharedFunctions.find(f => f.sharedFunction.includes('revelation'));
    assert.ok(shared, 'revelation appears in both scripts — comparative record expected');
    assert.equal(shared!.implementations.length, 2);
    assert.ok(shared!.invariant.length > 0);
    assert.ok(shared!.variables.length > 0);
  });

  test('NEGATIVE: functions in only ONE script produce no comparative record', () => {
    const scriptA = analysis([scene(0, { purpose: 'breather' }), scene(1, { purpose: 'complicate' })]);
    const scriptB = analysis([scene(0, { purpose: 'climax' }), scene(1, { purpose: 'complicate' })]);
    const report = compareScripts([
      { label: 'A', analysis: scriptA },
      { label: 'B', analysis: scriptB },
    ]);
    assert.equal(report.sharedFunctions.find(f => f.sharedFunction.includes('breather')), undefined);
    assert.equal(report.sharedFunctions.find(f => f.sharedFunction.includes('climax')), undefined);
    // advance_plot IS shared
    assert.ok(report.sharedFunctions.find(f => f.sharedFunction.includes('complicate')));
  });

  test('similarity pairs: identical scripts = 1.0, sorted descending', () => {
    const records = [
      scene(0, { purpose: 'raise_stakes', suspenseDelta: 2 }),
      scene(1, { purpose: 'climax', suspenseDelta: 5 }),
    ];
    const a = analysis(records);
    const a2 = analysis([...records]);
    const report = compareScripts([{ label: 'x', analysis: a }, { label: 'y', analysis: a2 }]);
    assert.equal(report.similarityPairs.length, 1);
    assert.ok(Math.abs(report.similarityPairs[0].similarity - 1.0) < 0.001,
      `identical structure should be ~1.0, got ${report.similarityPairs[0].similarity}`);
  });

  test('GUARD: fewer than 2 scripts returns unscored', () => {
    const report = compareScripts([{ label: 'only', analysis: analysis([scene(0)]) }]);
    assert.equal(report.scored, false);
    assert.equal(report.summaries.length, 0);
  });

  test('GUARD: empty analyses are filtered out before comparison', () => {
    const report = compareScripts([
      { label: 'empty', analysis: analysis([]) },
      { label: 'real', analysis: analysis([scene(0), scene(1)]) },
    ]);
    assert.equal(report.scored, false, 'only one non-empty script — nothing to compare');
  });
});
