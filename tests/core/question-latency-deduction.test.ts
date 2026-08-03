// Question-latency deduction — tests for the UNWIRED P1 candidate in
// server/nvm/analyze/question-latency-deduction.ts (see that file's header
// for the full disclaimer: not measured on the real corpus, not wired into
// health/verdict/grade, gated on a maintainer local measure-run per
// docs/p1-benchmark/STRUCTURAL_SIGNAL_SCREEN_2026-08-03.md).
//
// Every fixture here distributes its questionsRaised/Resolved/Unresolved
// totals onto a single scene record and pads the array out to the desired
// scene COUNT with zero-signal filler records (makeSceneRecord's defaults)
// — the deduction sums document-wide, so per-scene placement doesn't matter
// to the math, only records.length (the scene-count gate) and the summed
// totals (the question-count gate + rate) do.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeQuestionLatencyDeduction } from '../../server/nvm/analyze/question-latency-deduction.ts';
import { makeSceneRecord } from '../passes/helpers.ts';
import type { ScreenplaySceneRecord } from '../../server/nvm/screenplay/memory.ts';

/** sceneCount records total; the first carries the document-wide question
 *  totals, the rest are zero-signal filler (matching how real documents
 *  spread questions across only some scenes — the deduction is document-
 *  wide, not per-scene, so this is a faithful minimal fixture). */
function buildRecords(
  sceneCount: number,
  totals: { raised?: number; resolved?: number; resolvedSameScene?: number; unresolved?: number },
): ScreenplaySceneRecord[] {
  const records: ScreenplaySceneRecord[] = [];
  for (let i = 0; i < sceneCount; i++) {
    if (i === 0) {
      records.push(makeSceneRecord(i, {
        questionsRaised: totals.raised ?? 0,
        questionsResolved: totals.resolved ?? 0,
        questionsResolvedSameScene: totals.resolvedSameScene ?? 0,
        questionsUnresolved: totals.unresolved ?? 0,
      }));
    } else {
      records.push(makeSceneRecord(i));
    }
  }
  return records;
}

describe('computeQuestionLatencyDeduction', () => {
  // ── Fire fixtures ─────────────────────────────────────────────────────
  it('feature-scale script with a high unresolved-question rate -> nonzero deduction', () => {
    // 20 scenes (>= 15 floor), 10 raised (>= 6 floor), 8 unresolved -> rate 0.8.
    // deduction = min(15, 20 * (0.8 - 0.25)) = min(15, 11) = 11.
    const records = buildRecords(20, { raised: 10, resolved: 2, unresolved: 8 });
    const result = computeQuestionLatencyDeduction(records);
    assert.equal(result.raised, 10);
    assert.equal(result.resolved, 2);
    assert.equal(result.unresolvedRate, 0.8);
    assert.equal(result.gated, true);
    assert.ok(result.deduction > 0, `expected nonzero deduction, got ${result.deduction}`);
    assert.equal(Math.round(result.deduction * 1000) / 1000, 11);
  });

  it('unresolved rate scales the deduction linearly above the reference point', () => {
    // Same scale, milder rate (0.5): deduction = min(15, 20 * 0.25) = 5 — smaller
    // than the 11 above, proving the ramp is a function of rate, not a step.
    const records = buildRecords(20, { raised: 10, resolved: 5, unresolved: 5 });
    const result = computeQuestionLatencyDeduction(records);
    assert.equal(result.unresolvedRate, 0.5);
    assert.equal(result.deduction, 5);
  });

  // ── No-fire fixtures ──────────────────────────────────────────────────
  it('all questions resolved -> 0 deduction', () => {
    const records = buildRecords(20, { raised: 10, resolved: 10, unresolved: 0 });
    const result = computeQuestionLatencyDeduction(records);
    assert.equal(result.unresolvedRate, 0);
    assert.equal(result.gated, true);
    assert.equal(result.deduction, 0);
  });

  it('below the scene-count floor -> 0 deduction and gated=false, even with a catastrophic rate', () => {
    // 10 scenes (< 15 floor), rate 1.0 (worst possible) — still must be 0/false.
    const records = buildRecords(10, { raised: 10, resolved: 0, unresolved: 10 });
    const result = computeQuestionLatencyDeduction(records);
    assert.equal(result.unresolvedRate, 1);
    assert.equal(result.gated, false);
    assert.equal(result.deduction, 0);
  });

  it('below the question-count floor -> 0 deduction and gated=false, even with a catastrophic rate', () => {
    // 20 scenes (>= 15 floor), only 5 raised (< 6 floor), all unresolved.
    const records = buildRecords(20, { raised: 5, resolved: 0, unresolved: 5 });
    const result = computeQuestionLatencyDeduction(records);
    assert.equal(result.unresolvedRate, 1);
    assert.equal(result.gated, false);
    assert.equal(result.deduction, 0);
  });

  it('no questions raised anywhere -> unresolvedRate is null, not 0, and deduction is 0', () => {
    const records = buildRecords(20, {});
    const result = computeQuestionLatencyDeduction(records);
    assert.equal(result.raised, 0);
    assert.equal(result.unresolvedRate, null);
    assert.equal(result.gated, false);
    assert.equal(result.deduction, 0);
  });

  it('treats absent optional fields as 0, per the documented field contract', () => {
    // Records built with no questionsRaised/Resolved/Unresolved fields set at all
    // (undefined, not 0) — the module must read them via ?? 0, matching the
    // relationshipShifts/powerHolder precedent documented in memory.ts.
    const records: ScreenplaySceneRecord[] = Array.from({ length: 20 }, (_, i) => makeSceneRecord(i));
    const result = computeQuestionLatencyDeduction(records);
    assert.equal(result.raised, 0);
    assert.equal(result.resolved, 0);
    assert.equal(result.unresolvedRate, null);
    assert.equal(result.deduction, 0);
  });

  // ── Boundary cases at the exact floors ──────────────────────────────────
  it('exactly at the scene-count floor (15) -> gate passes', () => {
    const records = buildRecords(15, { raised: 10, resolved: 2, unresolved: 8 });
    const result = computeQuestionLatencyDeduction(records);
    assert.equal(result.gated, true);
    assert.ok(result.deduction > 0);
  });

  it('one scene below the scene-count floor (14) -> gate fails', () => {
    const records = buildRecords(14, { raised: 10, resolved: 2, unresolved: 8 });
    const result = computeQuestionLatencyDeduction(records);
    assert.equal(result.gated, false);
    assert.equal(result.deduction, 0);
  });

  it('exactly at the question-count floor (6 raised) -> gate passes', () => {
    const records = buildRecords(20, { raised: 6, resolved: 0, unresolved: 6 });
    const result = computeQuestionLatencyDeduction(records);
    assert.equal(result.gated, true);
    assert.ok(result.deduction > 0);
  });

  it('one below the question-count floor (5 raised) -> gate fails', () => {
    const records = buildRecords(20, { raised: 5, resolved: 0, unresolved: 5 });
    const result = computeQuestionLatencyDeduction(records);
    assert.equal(result.gated, false);
    assert.equal(result.deduction, 0);
  });

  it('unresolvedRate exactly at the reference point (0.25) -> 0 deduction, gate still passes', () => {
    // 20 raised, 5 unresolved -> rate exactly 0.25 == REF_RATE, so max(0, rate-REF) = 0.
    const records = buildRecords(20, { raised: 20, resolved: 15, unresolved: 5 });
    const result = computeQuestionLatencyDeduction(records);
    assert.equal(result.unresolvedRate, 0.25);
    assert.equal(result.gated, true);
    assert.equal(result.deduction, 0);
  });

  it('unresolvedRate just above the reference point -> a small positive deduction', () => {
    // 20 raised, 6 unresolved -> rate 0.30. deduction = 20 * 0.05 = 1.
    const records = buildRecords(20, { raised: 20, resolved: 14, unresolved: 6 });
    const result = computeQuestionLatencyDeduction(records);
    assert.equal(result.unresolvedRate, 0.3);
    assert.equal(Math.round(result.deduction * 1000) / 1000, 1);
  });

  // ── Cap enforcement ──────────────────────────────────────────────────────
  it('unresolvedRate = 1.0 (every raised question unresolved) lands exactly at the cap', () => {
    // 20 * (1 - 0.25) = 15 = CAP exactly, by construction (see module header).
    const records = buildRecords(20, { raised: 12, resolved: 0, unresolved: 12 });
    const result = computeQuestionLatencyDeduction(records);
    assert.equal(result.unresolvedRate, 1);
    assert.equal(result.deduction, 15);
  });

  it('an unresolvedRate beyond 1.0 (malformed/adversarial input) is still hard-capped at 15', () => {
    // Unresolved > raised should not occur from a real detectQuestionLatency run
    // (every raised question resolves to exactly one of resolved/unresolved), but
    // the cap must hold even against malformed records rather than trusting the
    // ratio to stay in [0,1] — proves Math.min actually binds, not just that the
    // formula happens to stay under 15 for well-formed inputs.
    const records = buildRecords(20, { raised: 6, resolved: 0, unresolved: 20 });
    const result = computeQuestionLatencyDeduction(records);
    assert.ok((result.unresolvedRate ?? 0) > 1);
    assert.equal(result.deduction, 15);
  });
});
