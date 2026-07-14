import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveDraftConflict, saveStatusLabel } from '../../src/lib/draft-persistence.ts';

describe('resolveDraftConflict', () => {
  it('prefers server when local is empty', () => {
    const r = resolveDraftConflict(
      { text: '', updatedAt: 100 },
      { text: 'SERVER', updatedAt: 50 },
    );
    assert.equal(r.source, 'server');
    assert.equal(r.text, 'SERVER');
  });

  it('prefers local when server is empty', () => {
    const r = resolveDraftConflict(
      { text: 'LOCAL', updatedAt: 10 },
      { text: '', updatedAt: 999 },
    );
    assert.equal(r.source, 'local');
    assert.equal(r.text, 'LOCAL');
  });

  it('prefers newer short local over older longer server', () => {
    const r = resolveDraftConflict(
      { text: 'short', updatedAt: 2000 },
      { text: 'a much longer older server draft that would win under length-only', updatedAt: 1000 },
    );
    assert.equal(r.source, 'local');
    assert.equal(r.text, 'short');
  });

  it('prefers newer server over older local', () => {
    const r = resolveDraftConflict(
      { text: 'local draft', updatedAt: 1000 },
      { text: 'server', updatedAt: 2000 },
    );
    assert.equal(r.source, 'server');
    assert.equal(r.text, 'server');
  });

  it('uses length as tie-break when timestamps match', () => {
    const r = resolveDraftConflict(
      { text: 'aa', updatedAt: 50 },
      { text: 'bbbb', updatedAt: 50 },
    );
    assert.equal(r.source, 'server');
    assert.equal(r.text, 'bbbb');
  });
});

describe('saveStatusLabel', () => {
  it('labels durable states honestly', () => {
    assert.equal(saveStatusLabel('saved-server'), 'Saved to server');
    assert.equal(saveStatusLabel('save-failed'), 'Save failed');
    assert.equal(saveStatusLabel('idle'), '');
  });
});
