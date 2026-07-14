import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  acknowledgeScriptIDESave,
  shouldStartScriptIDESave,
} from '../../src/lib/scriptide-autosave.ts';
import type { ScriptIDEDraftEnvelope } from '../../src/lib/scriptide-draft-store.ts';

const dirtyDraft: ScriptIDEDraftEnvelope = {
  schemaVersion: 1,
  scriptText: 'LOCAL',
  snapshots: [],
  characters: [],
  researchNotes: [],
  isDarkMode: false,
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
});
