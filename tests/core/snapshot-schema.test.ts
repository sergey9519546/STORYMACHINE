// server/lib/validation.ts's SnapshotSchema — the shape guard for one entry
// of POST /api/scriptide/save's `snapshots` array (writer #9,
// upgrade-writer-experience discovery: "score over revisions"). Every field
// is optional, including the original id/name/text/date — see the schema's
// own doc comment for why (real traffic through this exact route already
// posts partial snapshot objects). This file exercises the schema directly
// (node:test + zod's own safeParse), rather than only indirectly through an
// HTTP round trip, so a future tightening of the schema gets a fast, precise
// failure naming exactly which shape broke.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SnapshotSchema, ScriptideSaveBodySchema } from '../../server/lib/validation.ts';

describe('SnapshotSchema — old and new snapshot shapes', () => {
  it('accepts a full legacy snapshot (id/name/text/date, no score fields)', () => {
    const result = SnapshotSchema.safeParse({
      id: 'snap-1', name: 'v1', text: 'INT. ROOM - DAY', date: '2026-01-01',
    });
    assert.equal(result.success, true);
  });

  it('accepts a full new-shape snapshot with all four score fields', () => {
    const result = SnapshotSchema.safeParse({
      id: 'snap-2',
      name: 'v2',
      text: 'INT. ROOM - DAY',
      date: '2026-09-03',
      health: 72.5,
      verdict: 'CONSIDER',
      sceneCount: 6,
      analyzedAt: 1_787_279_939_609,
    });
    assert.equal(result.success, true);
  });

  it('accepts RECOMMEND and PASS verdicts, not just CONSIDER', () => {
    for (const verdict of ['RECOMMEND', 'CONSIDER', 'PASS']) {
      const result = SnapshotSchema.safeParse({ id: 's', verdict });
      assert.equal(result.success, true, `verdict ${verdict} must be accepted`);
    }
  });

  it('accepts a bare {id} object — real traffic through /api/scriptide/save sends this', () => {
    const result = SnapshotSchema.safeParse({ id: 's1' });
    assert.equal(result.success, true);
  });

  it('accepts a partial {id, text} object with no name/date — matches game-reset-persistence.test.ts traffic', () => {
    const result = SnapshotSchema.safeParse({ id: 'snapshot', text: 'POST-RESET SNAPSHOT' });
    assert.equal(result.success, true);
  });

  it('accepts an empty object — every field is optional', () => {
    const result = SnapshotSchema.safeParse({});
    assert.equal(result.success, true);
  });

  it('accepts an unrecognized extra field (passthrough) — a newer client stays forward-compatible', () => {
    const result = SnapshotSchema.safeParse({ id: 's1', futureField: 'not yet invented' });
    assert.equal(result.success, true);
    assert.equal((result as { success: true; data: Record<string, unknown> }).data.futureField, 'not yet invented');
  });

  it('rejects a malformed health (wrong type) rather than silently coercing it', () => {
    const result = SnapshotSchema.safeParse({ id: 's1', health: 'not-a-number' });
    assert.equal(result.success, false);
  });

  it('rejects a verdict outside the CoverageVerdict enum', () => {
    const result = SnapshotSchema.safeParse({ id: 's1', verdict: 'MAYBE' });
    assert.equal(result.success, false);
  });

  it('rejects a negative or non-integer sceneCount', () => {
    assert.equal(SnapshotSchema.safeParse({ id: 's1', sceneCount: -1 }).success, false);
    assert.equal(SnapshotSchema.safeParse({ id: 's1', sceneCount: 1.5 }).success, false);
  });

  // 2026-09-04 — draft-rank union fix: contentHash is stamped additively
  // (src/components/ScriptIDE.tsx's confirmSnapshot) so the client's
  // computeDraftRank can dedupe a snapshot exactly against the same run in
  // ScriptDoctorPanel's Draft History, instead of an approximate
  // health+timestamp match.
  it('accepts a snapshot carrying the new contentHash field', () => {
    const result = SnapshotSchema.safeParse({ id: 's1', health: 60, contentHash: 'a'.repeat(64) });
    assert.equal(result.success, true);
  });

  it('rejects a malformed contentHash (wrong type) rather than silently coercing it', () => {
    const result = SnapshotSchema.safeParse({ id: 's1', contentHash: 12345 });
    assert.equal(result.success, false);
  });
});

describe('ScriptideSaveBodySchema — snapshots array end to end', () => {
  it('accepts a save body mixing a legacy and a scored snapshot', () => {
    const result = ScriptideSaveBodySchema.safeParse({
      scriptText: 'INT. ROOM - DAY',
      snapshots: [
        { id: 'old', name: 'v1', text: 'x', date: '2026-01-01' },
        { id: 'new', name: 'v2', text: 'y', date: '2026-09-03', health: 40, verdict: 'PASS', sceneCount: 90, analyzedAt: 1 },
      ],
    });
    assert.equal(result.success, true);
  });

  it('rejects a snapshots array over the 20-entry cap, same as before this schema change', () => {
    const result = ScriptideSaveBodySchema.safeParse({
      scriptText: 'x',
      snapshots: Array.from({ length: 21 }, (_, i) => ({ id: `s${i}` })),
    });
    assert.equal(result.success, false);
  });

  it('still requires scriptText even when snapshots is fully valid', () => {
    const result = ScriptideSaveBodySchema.safeParse({ snapshots: [{ id: 's1' }] });
    assert.equal(result.success, false);
  });
});
