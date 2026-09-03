import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  acknowledgeScriptIDESave,
  classifyScriptIDESaveFailure,
  isScriptIDEScriptNearCap,
  SCRIPTIDE_SCRIPT_TEXT_SERVER_CAP,
  SCRIPTIDE_SCRIPT_TEXT_WARN_THRESHOLD,
  shouldStartScriptIDESave,
} from '../../src/lib/scriptide-autosave.ts';
import type { ScriptIDEDraftEnvelope } from '../../src/lib/scriptide-draft-store.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dirtyDraft: ScriptIDEDraftEnvelope = {
  schemaVersion: 2,
  scriptText: 'LOCAL',
  snapshots: [],
  characters: [],
  researchNotes: [],
  isDarkMode: false,
  titlePage: { title: 'UNTITLED SCRIPT', author: 'AUTHOR NAME', contact: 'CONTACT INFO' },
  contentUpdatedAt: 10,
  serverRevision: 5,
  dirty: true,
};

describe('scriptide autosave transitions', () => {
  it('marks the current generation clean after an acknowledgement', () => {
    const result = acknowledgeScriptIDESave(dirtyDraft, 3, 3, 6);
    assert.equal(result.acknowledgedCurrentDraft, true);
    assert.equal(result.needsTrailingSave, false);
    assert.equal(result.envelope.dirty, false);
    assert.equal(result.envelope.serverRevision, 6);
  });

  it('advances the base revision but keeps a newer local generation dirty', () => {
    const result = acknowledgeScriptIDESave(dirtyDraft, 3, 4, 6);
    assert.equal(result.acknowledgedCurrentDraft, false);
    assert.equal(result.needsTrailingSave, true);
    assert.equal(result.envelope.dirty, true);
    assert.equal(result.envelope.serverRevision, 6);
    assert.equal(result.envelope.scriptText, 'LOCAL');
  });

  it('only starts saves for dirty, conflict-free, idle drafts', () => {
    assert.equal(shouldStartScriptIDESave(dirtyDraft, false, false), true);
    assert.equal(shouldStartScriptIDESave({ ...dirtyDraft, dirty: false }, false, false), false);
    assert.equal(shouldStartScriptIDESave(dirtyDraft, true, false), false);
    assert.equal(shouldStartScriptIDESave(dirtyDraft, false, true), false);
  });

  // ── Finding 2: stop the 30s retry loop for a 4xx validation failure, but
  // only until the writer actually edits again ─────────────────────────────
  describe('shouldStartScriptIDESave — validation-block generation gate', () => {
    it('with no blockedGeneration supplied, behaves exactly as before (back-compat, 3-arg call sites)', () => {
      assert.equal(shouldStartScriptIDESave(dirtyDraft, false, false), true);
    });

    it('refuses to start while the current generation still equals the blocked generation', () => {
      assert.equal(shouldStartScriptIDESave(dirtyDraft, false, false, 7, 7), false);
    });

    it('starts again once the draft has moved on to a newer generation (the writer edited)', () => {
      assert.equal(shouldStartScriptIDESave(dirtyDraft, false, false, 7, 8), true);
    });

    it('a null blockedGeneration never blocks, regardless of currentGeneration', () => {
      assert.equal(shouldStartScriptIDESave(dirtyDraft, false, false, null, 7), true);
    });

    it('conflict and in-flight still take priority over an unblocked generation match', () => {
      assert.equal(shouldStartScriptIDESave(dirtyDraft, true, false, 7, 8), false);
      assert.equal(shouldStartScriptIDESave(dirtyDraft, false, true, 7, 8), false);
    });
  });
});

describe('classifyScriptIDESaveFailure', () => {
  it('classifies a 400 (validation) as validation and surfaces the server message verbatim', () => {
    const failure = classifyScriptIDESaveFailure(400, 'scriptText: String must contain at most 500000 character(s)');
    assert.equal(failure.kind, 'validation');
    assert.equal(failure.message, 'scriptText: String must contain at most 500000 character(s)');
  });

  it('classifies any 4xx as validation, not just 400', () => {
    assert.equal(classifyScriptIDESaveFailure(413, 'too big').kind, 'validation');
    assert.equal(classifyScriptIDESaveFailure(422, 'nope').kind, 'validation');
  });

  it('falls back to the generic message when a 4xx response carried no error text', () => {
    const failure = classifyScriptIDESaveFailure(400, undefined);
    assert.equal(failure.kind, 'validation');
    assert.equal(failure.message, 'Failed to save - your work may be at risk');
  });

  it('classifies a 5xx as network (retryable), always with the generic message even if one came back', () => {
    const failure = classifyScriptIDESaveFailure(500, 'internal error');
    assert.equal(failure.kind, 'network');
    assert.equal(failure.message, 'Failed to save - your work may be at risk');
  });

  it('classifies status 0 (fetch-level failure, no HTTP response at all) as network', () => {
    const failure = classifyScriptIDESaveFailure(0, undefined);
    assert.equal(failure.kind, 'network');
  });
});

describe('scriptText size-cap client/server sync', () => {
  it('SCRIPTIDE_SCRIPT_TEXT_SERVER_CAP matches server/lib/validation.ts\'s literal cap exactly', () => {
    // Reads the SERVER file's source text and extracts the exact numeric
    // literal from ScriptideSaveBodySchema's `scriptText: z.string().max(...)`
    // — asserted against the client-side constant rather than importing the
    // server module (which would pull zod/server-only code into a client
    // test's import graph, the same reason scriptide-autosave.ts itself
    // never imports from server/**). This is the guardrail the audit asked
    // for: if either cap ever changes without updating the other, this test
    // fails instead of the two silently drifting apart.
    const validationSource = fs.readFileSync(
      path.join(__dirname, '../../server/lib/validation.ts'),
      'utf-8',
    );
    const match = validationSource.match(/scriptText:\s*z\.string\(\)\.max\((\d[\d_]*)\)/);
    assert.ok(match, 'expected to find scriptText: z.string().max(<N>) in server/lib/validation.ts');
    const serverCap = Number(match![1].replace(/_/g, ''));
    assert.equal(SCRIPTIDE_SCRIPT_TEXT_SERVER_CAP, serverCap);
  });

  it('isScriptIDEScriptNearCap fires only within the top 5% below the cap, not earlier', () => {
    assert.equal(isScriptIDEScriptNearCap(0), false);
    assert.equal(isScriptIDEScriptNearCap(SCRIPTIDE_SCRIPT_TEXT_WARN_THRESHOLD - 1), false);
    assert.equal(isScriptIDEScriptNearCap(SCRIPTIDE_SCRIPT_TEXT_WARN_THRESHOLD), true);
    assert.equal(isScriptIDEScriptNearCap(SCRIPTIDE_SCRIPT_TEXT_SERVER_CAP), true);
    assert.equal(isScriptIDEScriptNearCap(SCRIPTIDE_SCRIPT_TEXT_SERVER_CAP + 10), true);
  });

  it('the warn threshold is within 5% of the cap', () => {
    assert.ok(SCRIPTIDE_SCRIPT_TEXT_WARN_THRESHOLD <= SCRIPTIDE_SCRIPT_TEXT_SERVER_CAP);
    assert.ok(SCRIPTIDE_SCRIPT_TEXT_SERVER_CAP - SCRIPTIDE_SCRIPT_TEXT_WARN_THRESHOLD <= SCRIPTIDE_SCRIPT_TEXT_SERVER_CAP * 0.05);
  });
});
