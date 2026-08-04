// Reversal detection — tests for the UNWIRED P1 candidate in
// server/nvm/analyze/reversal-detection.ts (see that file's header for the
// full disclaimer: not measured on the real corpus, not wired into
// health/verdict/grade/structure.reversalCount, responds to detector defect
// D3 in docs/p1-benchmark/DETECTOR_DEFECTS_2026-08-03.md).
//
// Conventions: node:test + assert/strict, matching
// tests/core/question-latency-deduction.test.ts (the sibling P1 module this
// one follows structurally) and tests/core/truth-extraction.test.ts (the
// fountain()-through-the-real-analyzer style for text-derived fixtures).
//
// Two fixture styles are used deliberately:
//   - Channel 1 (revelation-text allegiance/identity inversion) is exercised
//     through REAL fountain text run through analyzeFountainText, because
//     that channel's whole job is reading text-derived revelation strings —
//     a synthetic ScreenplaySceneRecord would just be hand-authoring the
//     exact string the module is supposed to classify, proving nothing about
//     whether the text pipeline actually produces that string in the first
//     place. The positive fixture reuses demo/corpus/sample-script.fountain
//     ("The Second Key") verbatim — the canonical D3 worked example from the
//     ledger itself (Vance's reveal, ~line 122), read-only, so this suite
//     stays byte-identical to the frozen demo corpus guarded by
//     tests/core/demo-corpus-freeze.test.ts.
//   - Channel 2 (relationship-shift sign flip) is exercised through
//     synthetic makeSceneRecord fixtures with explicit relationshipShifts,
//     because that channel's rolling-sum logic needs exact, unambiguous
//     amounts to test its threshold boundaries precisely — reproducing an
//     exact valence sum through real dialogue text would make the fixture's
//     intent illegible.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { detectReversals, computeReversalDelta } from '../../server/nvm/analyze/reversal-detection.ts';
import { analyzeFountainText } from '../../server/nvm/analyze/fountain-analyzer.ts';
import { makeSceneRecord } from '../passes/helpers.ts';
import type { ScreenplaySceneRecord } from '../../server/nvm/screenplay/memory.ts';

const demoCorpusDir = path.resolve(import.meta.dirname, '../../demo/corpus');

function fountain(...scenes: string[][]): string {
  return scenes.map(s => s.join('\n')).join('\n\n');
}

// ── Positive fixture: real betrayal-revelation script (channel 1) ─────────

describe('detectReversals — positive fixture: the canonical D3 betrayal-revelation script', () => {
  const text = fs.readFileSync(path.join(demoCorpusDir, 'sample-script.fountain'), 'utf8');
  const { records } = analyzeFountainText(text);

  it('legacy suspense-dip definition reports ZERO reversals on this script (reproduces D3 exactly)', () => {
    const delta = computeReversalDelta(records);
    assert.equal(delta.legacyCount, 0, 'D3 states structure.reversalCount === 0 on this exact script');
  });

  it('detectReversals finds the allegiance reveal the legacy channel misses', () => {
    const result = detectReversals(records);
    assert.ok(result.reversalCount >= 1, `expected >=1 detected reversal, got ${result.reversalCount}`);
    const allegiance = result.reversals.filter(r => r.kind === 'revelation_allegiance');
    assert.ok(allegiance.length >= 1, 'expected at least one revelation_allegiance candidate');
  });

  it('the flagged scene is the VAULT scene (0-based sceneIdx 12 — the 13th scene heading) with Vance\'s reveal as evidence', () => {
    const result = detectReversals(records);
    const hit = result.reversals.find(r => r.kind === 'revelation_allegiance');
    assert.ok(hit, 'expected a revelation_allegiance candidate to exist');
    assert.equal(hit!.sceneIdx, 12);
    assert.match(hit!.evidence, /signed my transfer papers/i);
  });

  it('computeReversalDelta reports a positive delta on this script (detected finds what legacy misses)', () => {
    const delta = computeReversalDelta(records);
    assert.equal(delta.legacyCount, 0);
    assert.ok(delta.detectedCount >= 1);
    assert.equal(delta.delta, delta.detectedCount - delta.legacyCount);
    assert.ok(delta.delta >= 1);
  });
});

// ── Negative fixture: linear, no-twist script (both channels agree on 0) ──

describe('detectReversals — negative fixture: linear no-twist heist, both channels agree on 0', () => {
  const text = fountain(
    ['INT. PAWNSHOP BACK ROOM - NIGHT', '', 'June counts a stack of bills at a folding table, patient, unhurried.', '', 'JUNE', 'Ten thousand even, same as always.'],
    ['INT. MARCUS\'S APARTMENT - NIGHT', '', 'Marcus spreads photographs of a quiet gallery across a cluttered table. June leans in the doorway, arms crossed, smiling.', '', 'MARCUS', 'Small job. In and out before midnight.', '', 'JUNE', 'You always say that.'],
    ['EXT. GALLERY - BACK ALLEY - NIGHT', '', 'June photographs the delivery door while Marcus times the guard\'s rounds against a stopwatch.', '', 'MARCUS', 'Same guard, same route, every forty minutes.', '', 'JUNE', 'Forty minutes is plenty.'],
    ['INT. GALLERY - STORAGE ROOM - NIGHT', '', 'June works the old lock while Marcus watches the hallway.', '', 'MARCUS', 'Almost there.', '', 'JUNE', 'Nearly done.'],
    ['INT. GALLERY - VAULT - CONTINUOUS', '', 'June lifts the small case free and the door swings open without resistance.', '', 'JUNE', 'That\'s the one.'],
    ['INT. MARCUS\'S APARTMENT - DAY', '', 'June and Marcus split the proceeds evenly across the table, laughing.', '', 'MARCUS', 'Same time next month?', '', 'JUNE', 'Same time next month.'],
  );
  const { records } = analyzeFountainText(text);

  it('legacy suspense-dip count is 0 (no magnitude dips in this text)', () => {
    const delta = computeReversalDelta(records);
    assert.equal(delta.legacyCount, 0);
  });

  it('detectReversals finds nothing (no allegiance revelation, no relationship swing)', () => {
    const result = detectReversals(records);
    assert.equal(result.reversalCount, 0);
    assert.deepEqual(result.reversals, []);
  });

  it('computeReversalDelta reports delta 0 — both channels genuinely agree, not by omission', () => {
    const delta = computeReversalDelta(records);
    assert.deepEqual(delta, { legacyCount: 0, detectedCount: 0, delta: 0 });
  });
});

// ── Negative fixture: suspense-dip-only script — legacy fires, detector doesn't double-count it ──

describe('detectReversals — negative fixture: a plain suspense dip (legacy fires, detector correctly does not)', () => {
  const text = fountain(
    ['INT. PAWNSHOP BACK ROOM - NIGHT', '', 'June counts a stack of bills at a folding table, patient, unhurried.', '', 'JUNE', 'Ten thousand even, same as always.'],
    ['INT. MARCUS\'S APARTMENT - NIGHT', '', 'Marcus spreads photographs of a quiet gallery across a cluttered table. June leans in the doorway, arms crossed, smiling.', '', 'MARCUS', 'Small job. In and out before midnight.', '', 'JUNE', 'You always say that.'],
    // The dip scene: heavy on RELIEF_WORDS, no DANGER_TENSION_WORDS, no
    // revelation-pattern text, no dialogue (so no relationshipShifts either)
    // — a pure magnitude de-escalation with no other signal at all.
    ['INT. SAFEHOUSE - NIGHT', '', 'Mira sits in stillness. The room is calm, the threat long past. She exhales, feels safe for the first time in days, and settles into the quiet.'],
    ['INT. GALLERY - STORAGE ROOM - NIGHT', '', 'June works the old lock while Marcus watches the hallway.', '', 'MARCUS', 'Almost there.', '', 'JUNE', 'Nearly done.'],
    ['INT. GALLERY - VAULT - CONTINUOUS', '', 'June lifts the small case free and the door swings open without resistance.', '', 'JUNE', 'That\'s the one.'],
    ['INT. MARCUS\'S APARTMENT - DAY', '', 'June and Marcus split the proceeds evenly across the table, laughing.', '', 'MARCUS', 'Same time next month?', '', 'JUNE', 'Same time next month.'],
  );
  const { records } = analyzeFountainText(text);

  it('legacy suspense-dip count is >= 1 (the safehouse scene clears suspenseDelta < -1)', () => {
    const delta = computeReversalDelta(records);
    assert.ok(delta.legacyCount >= 1, `expected legacy to fire on the relief-heavy scene, got legacyCount=${delta.legacyCount}`);
  });

  it('the dip scene itself carries no revelation and no relationship shifts (sanity check on the fixture)', () => {
    const dipScene = records.find(r => r.slug.includes('SAFEHOUSE'));
    assert.ok(dipScene, 'expected a SAFEHOUSE scene record');
    assert.equal(dipScene!.revelation, null);
    assert.deepEqual(dipScene!.relationshipShifts ?? [], []);
  });

  it('detectReversals does NOT fire on the magnitude dip alone — a dip is not, by itself, an allegiance or relationship reversal', () => {
    const result = detectReversals(records);
    assert.equal(result.reversalCount, 0, 'the two channels are narrower than the legacy magnitude-dip definition and must not treat a plain dip as a hit');
  });

  it('computeReversalDelta reports a NEGATIVE delta here — the one case where legacy catches something this module does not', () => {
    const delta = computeReversalDelta(records);
    assert.ok(delta.legacyCount >= 1);
    assert.equal(delta.detectedCount, 0);
    assert.ok(delta.delta < 0, 'delta should be negative: detected (0) minus legacy (>=1)');
  });
});

// ── Channel 2: relationship-shift sign flip, exercised via synthetic records ──

describe('detectReversals — channel 2: relationship-shift sign flip against an established pair', () => {
  it('an established positive pair with a large opposite-sign swing fires a relationship_swing candidate', () => {
    const records: ScreenplaySceneRecord[] = [
      makeSceneRecord(0, { relationshipShifts: [{ pairKey: 'ally|hero', dimension: 'trust', amount: 3 }] }),
      makeSceneRecord(1),
      makeSceneRecord(2, { relationshipShifts: [{ pairKey: 'ally|hero', dimension: 'trust', amount: -4 }] }),
    ];
    const result = detectReversals(records);
    const hit = result.reversals.find(r => r.kind === 'relationship_swing');
    assert.ok(hit, 'expected a relationship_swing candidate');
    assert.equal(hit!.sceneIdx, 2);
    assert.equal(result.reversalCount, 1);
  });

  it('an established negative pair with a large opposite-sign (positive) swing also fires', () => {
    const records: ScreenplaySceneRecord[] = [
      makeSceneRecord(0, { relationshipShifts: [{ pairKey: 'rival|hero', dimension: 'trust', amount: -3 }] }),
      makeSceneRecord(1, { relationshipShifts: [{ pairKey: 'rival|hero', dimension: 'trust', amount: 5 }] }),
    ];
    const result = detectReversals(records);
    const hit = result.reversals.find(r => r.kind === 'relationship_swing');
    assert.ok(hit);
    assert.equal(hit!.sceneIdx, 1);
  });

  it('a swing below SWING_THRESHOLD (4) does NOT fire, even against an established pair', () => {
    const records: ScreenplaySceneRecord[] = [
      makeSceneRecord(0, { relationshipShifts: [{ pairKey: 'ally|hero', dimension: 'trust', amount: 3 }] }),
      makeSceneRecord(1, { relationshipShifts: [{ pairKey: 'ally|hero', dimension: 'trust', amount: -3 }] }),
    ];
    const result = detectReversals(records);
    assert.equal(result.reversalCount, 0);
  });

  it('a large swing with NO established prior (pair introduced already at 0) does NOT fire', () => {
    const records: ScreenplaySceneRecord[] = [
      makeSceneRecord(0, { relationshipShifts: [{ pairKey: 'ally|hero', dimension: 'trust', amount: -5 }] }),
    ];
    const result = detectReversals(records);
    assert.equal(result.reversalCount, 0);
  });

  it('a same-sign continuation on an established pair does NOT fire (not a reversal, just more of the same)', () => {
    const records: ScreenplaySceneRecord[] = [
      makeSceneRecord(0, { relationshipShifts: [{ pairKey: 'ally|hero', dimension: 'trust', amount: 3 }] }),
      makeSceneRecord(1, { relationshipShifts: [{ pairKey: 'ally|hero', dimension: 'trust', amount: 4 }] }),
    ];
    const result = detectReversals(records);
    assert.equal(result.reversalCount, 0);
  });

  it('treats an absent relationshipShifts field as [] per the documented field contract', () => {
    const records: ScreenplaySceneRecord[] = [
      makeSceneRecord(0, { relationshipShifts: undefined }),
      makeSceneRecord(1, { relationshipShifts: undefined }),
    ];
    const result = detectReversals(records);
    assert.deepEqual(result, { reversals: [], reversalCount: 0 });
  });

  it('a scene contributing candidates on BOTH channels counts once toward reversalCount, not twice', () => {
    const records: ScreenplaySceneRecord[] = [
      makeSceneRecord(0, { relationshipShifts: [{ pairKey: 'ally|hero', dimension: 'trust', amount: 3 }] }),
      makeSceneRecord(1, {
        revelation: 'It was you all along. You were the mole the entire time.',
        relationshipShifts: [{ pairKey: 'ally|hero', dimension: 'trust', amount: -5 }],
      }),
    ];
    const result = detectReversals(records);
    assert.equal(result.reversals.length, 2, 'both channels should independently produce a candidate');
    assert.equal(result.reversalCount, 1, 'but they land on the same scene, so reversalCount counts it once');
  });
});

// ── Determinism ─────────────────────────────────────────────────────────

describe('detectReversals — determinism', () => {
  it('is deterministic: repeated calls on the same records produce identical results', () => {
    const text = fs.readFileSync(path.join(demoCorpusDir, 'sample-script.fountain'), 'utf8');
    const { records } = analyzeFountainText(text);
    assert.deepEqual(detectReversals(records), detectReversals(records));
    assert.deepEqual(computeReversalDelta(records), computeReversalDelta(records));
  });

  it('is deterministic on synthetic channel-2 fixtures too', () => {
    const records: ScreenplaySceneRecord[] = [
      makeSceneRecord(0, { relationshipShifts: [{ pairKey: 'ally|hero', dimension: 'trust', amount: 3 }] }),
      makeSceneRecord(1, { relationshipShifts: [{ pairKey: 'ally|hero', dimension: 'trust', amount: -4 }] }),
    ];
    assert.deepEqual(detectReversals(records), detectReversals(records));
  });
});

// ── 0-based sceneIdx contract ────────────────────────────────────────────

describe('detectReversals — sceneIdx contract (0-based, per record.sceneIdx, never array position or +1)', () => {
  it('reports the record\'s own sceneIdx verbatim, even when it does not match the record\'s array position', () => {
    // Deliberately mismatch array position vs. sceneIdx field (7 at index 0) to
    // prove detectReversals reads record.sceneIdx, not the array index, and
    // performs no 0-based -> 1-based conversion of its own (that is a
    // DISPLAY-layer concern per CLAUDE.md / scene-label-consistency.test.ts).
    const records: ScreenplaySceneRecord[] = [
      makeSceneRecord(7, { revelation: 'It was you all along. You were the mole the entire time.' }),
    ];
    const result = detectReversals(records);
    assert.equal(result.reversals.length, 1);
    assert.equal(result.reversals[0].sceneIdx, 7);
  });
});
