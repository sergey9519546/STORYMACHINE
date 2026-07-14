import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SCRIPTIDE_DRAFT_KEY,
  importScriptText,
  loadScriptIDEDraft,
  readScriptIDEDraft,
  updateScriptIDEDraft,
  writeScriptIDEDraft,
  type ScriptIDEDraftEnvelope,
} from '../../src/lib/scriptide-draft-store.ts';

function memoryStorage(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  return {
    read: (key: string) => values.get(key) ?? null,
    write: (key: string, value: string) => {
      values.set(key, value);
      return true;
    },
    values,
  };
}

const envelope: ScriptIDEDraftEnvelope = {
  schemaVersion: 1,
  scriptText: 'INT. ROOM - DAY',
  snapshots: [{ id: 's1' }],
  characters: [{ id: 'c1' }],
  researchNotes: [{ id: 'r1' }],
  isDarkMode: true,
  contentUpdatedAt: 123,
  serverRevision: 100,
  dirty: false,
};

describe('scriptide draft store', () => {
  it('roundtrips a valid versioned envelope atomically', () => {
    const storage = memoryStorage();
    assert.equal(writeScriptIDEDraft(storage.write, envelope), true);
    assert.deepEqual(readScriptIDEDraft(storage.read), envelope);
    assert.equal(storage.values.size, 1);
  });

  it('rejects malformed and unknown-version envelopes', () => {
    const malformed = memoryStorage({ [SCRIPTIDE_DRAFT_KEY]: '{bad' });
    assert.equal(readScriptIDEDraft(malformed.read), null);

    const future = memoryStorage({
      [SCRIPTIDE_DRAFT_KEY]: JSON.stringify({ ...envelope, schemaVersion: 2 }),
    });
    assert.equal(readScriptIDEDraft(future.read), null);
  });

  it('migrates every legacy draft field', () => {
    const storage = memoryStorage({
      script_draft: 'LOCAL',
      script_snapshots: JSON.stringify([{ id: 's1' }]),
      script_characters: JSON.stringify([{ id: 'c1' }]),
      research_notes: JSON.stringify([{ id: 'r1' }]),
      theme: 'dark',
      script_draft_updated_at: '456',
    });
    assert.deepEqual(loadScriptIDEDraft(storage.read), {
      schemaVersion: 1,
      scriptText: 'LOCAL',
      snapshots: [{ id: 's1' }],
      characters: [{ id: 'c1' }],
      researchNotes: [{ id: 'r1' }],
      isDarkMode: true,
      contentUpdatedAt: 456,
      serverRevision: null,
      dirty: true,
    });
  });

  it('reports an atomic storage write failure', () => {
    assert.equal(writeScriptIDEDraft(() => false, envelope), false);
  });

  it('updates local content while preserving the server base revision', () => {
    const next = updateScriptIDEDraft(envelope, {
      scriptText: '',
      snapshots: [],
      characters: [],
      researchNotes: [],
      isDarkMode: false,
    }, 999);
    assert.equal(next.serverRevision, 100);
    assert.equal(next.contentUpdatedAt, 999);
    assert.equal(next.dirty, true);
    assert.equal(next.scriptText, '');
    assert.deepEqual(next.characters, []);
  });

  it('imports script text without discarding metadata or the server base', () => {
    const next = importScriptText(envelope, 'EXT. ROAD - NIGHT', 1000);
    assert.equal(next.scriptText, 'EXT. ROAD - NIGHT');
    assert.deepEqual(next.characters, envelope.characters);
    assert.equal(next.serverRevision, 100);
    assert.equal(next.dirty, true);
  });
});
