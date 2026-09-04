import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { wipeAllScriptIDEData, postWipeUrl, type ScriptIDEWipeDeps } from '../../src/lib/scriptide-wipe.ts';

function callLog() {
  const calls: string[] = [];
  return { calls, record: (name: string) => calls.push(name) };
}

describe('wipeAllScriptIDEData', () => {
  it('calls all four steps and reports success when every step succeeds', async () => {
    const { calls, record } = callLog();
    const deps: ScriptIDEWipeDeps = {
      deleteServerSession: async () => { record('server'); return true; },
      clearLocalStorage: () => { record('local'); return true; },
      clearSessionStorage: () => { record('session'); return true; },
      wipeIndexedDB: async () => { record('idb'); return true; },
    };
    const result = await wipeAllScriptIDEData(deps);
    assert.deepEqual(result, {
      serverDeleted: true,
      indexedDBWiped: true,
      localStorageCleared: true,
      sessionStorageCleared: true,
    });
    assert.deepEqual(calls, ['server', 'idb', 'local', 'session']);
  });

  it('calls the server BEFORE clearing localStorage — the current session id must still resolve at delete time', async () => {
    // src/lib/session.ts stores the session id itself in localStorage; if
    // localStorage were cleared first, deleteServerSession's fetch would
    // race a freshly-minted (and therefore empty) session id, silently
    // deleting nothing.
    const order: string[] = [];
    const deps: ScriptIDEWipeDeps = {
      deleteServerSession: async () => { order.push('server'); return true; },
      clearLocalStorage: () => { order.push('local'); return true; },
      clearSessionStorage: () => { order.push('session'); return true; },
      wipeIndexedDB: async () => { order.push('idb'); return true; },
    };
    await wipeAllScriptIDEData(deps);
    assert.ok(order.indexOf('server') < order.indexOf('local'), 'server delete must run before localStorage clear');
  });

  it('a failing server delete still runs every local step (best-effort, independent failures)', async () => {
    const { calls, record } = callLog();
    const deps: ScriptIDEWipeDeps = {
      deleteServerSession: async () => { record('server'); return false; },
      clearLocalStorage: () => { record('local'); return true; },
      clearSessionStorage: () => { record('session'); return true; },
      wipeIndexedDB: async () => { record('idb'); return true; },
    };
    const result = await wipeAllScriptIDEData(deps);
    assert.equal(result.serverDeleted, false);
    assert.equal(result.localStorageCleared, true);
    assert.equal(result.sessionStorageCleared, true);
    assert.equal(result.indexedDBWiped, true);
    assert.deepEqual(calls, ['server', 'idb', 'local', 'session']);
  });

  it('a throwing localStorage clear does not stop sessionStorage from being cleared', async () => {
    const { calls, record } = callLog();
    const deps: ScriptIDEWipeDeps = {
      deleteServerSession: async () => { record('server'); return true; },
      clearLocalStorage: () => { record('local'); throw new Error('quota/private-mode'); },
      clearSessionStorage: () => { record('session'); return true; },
      wipeIndexedDB: async () => { record('idb'); return true; },
    };
    const result = await wipeAllScriptIDEData(deps);
    assert.equal(result.localStorageCleared, false);
    assert.equal(result.sessionStorageCleared, true);
    assert.deepEqual(calls, ['server', 'idb', 'local', 'session']);
  });

  it('a rejecting deleteServerSession promise resolves to false rather than throwing', async () => {
    const deps: ScriptIDEWipeDeps = {
      deleteServerSession: async () => { throw new Error('network down'); },
      clearLocalStorage: () => true,
      clearSessionStorage: () => true,
      wipeIndexedDB: async () => true,
    };
    const result = await wipeAllScriptIDEData(deps);
    assert.equal(result.serverDeleted, false);
    assert.equal(result.localStorageCleared, true);
  });

  it('a rejecting wipeIndexedDB promise resolves to false and still lets local clears run', async () => {
    const deps: ScriptIDEWipeDeps = {
      deleteServerSession: async () => true,
      clearLocalStorage: () => true,
      clearSessionStorage: () => true,
      wipeIndexedDB: async () => { throw new Error('blocked'); },
    };
    const result = await wipeAllScriptIDEData(deps);
    assert.equal(result.indexedDBWiped, false);
    assert.equal(result.localStorageCleared, true);
    assert.equal(result.sessionStorageCleared, true);
  });

  it('every step failing still resolves a well-formed all-false result, not a rejection', async () => {
    const deps: ScriptIDEWipeDeps = {
      deleteServerSession: async () => false,
      clearLocalStorage: () => false,
      clearSessionStorage: () => false,
      wipeIndexedDB: async () => false,
    };
    await assert.doesNotReject(wipeAllScriptIDEData(deps));
    const result = await wipeAllScriptIDEData(deps);
    assert.deepEqual(result, {
      serverDeleted: false,
      indexedDBWiped: false,
      localStorageCleared: false,
      sessionStorageCleared: false,
    });
  });
});

describe('postWipeUrl — the URL the app must land on after a wipe', () => {
  // A collaboration room id lives in the URL (?collab=<id>) because the share
  // LINK is the capability (src/components/editor/collab.ts). Reloading the
  // current URL after a wipe therefore re-enters the room the writer just
  // deleted everything for — and since the local draft is now empty while the
  // shared Y.Doc is not, a surviving participant's copy would sync the
  // supposedly deleted text straight back into the editor.
  it('strips the collaboration share parameter', () => {
    assert.equal(
      postWipeUrl('https://example.test/app?collab=AbC-123_xyz'),
      'https://example.test/app',
    );
  });

  it('keeps every other query parameter — this is not a URL reset', () => {
    const out = new URL(postWipeUrl('https://example.test/app?keep=1&collab=room9&also=2'));
    assert.equal(out.searchParams.get('collab'), null);
    assert.equal(out.searchParams.get('keep'), '1');
    assert.equal(out.searchParams.get('also'), '2');
  });

  it('drops the hash route so a wipe lands on the entrance, not #privacy', () => {
    assert.equal(postWipeUrl('https://example.test/#privacy'), 'https://example.test/');
    assert.equal(postWipeUrl('https://example.test/?collab=r#verify'), 'https://example.test/');
  });

  it('is a no-op on a URL that carries neither', () => {
    assert.equal(postWipeUrl('http://127.0.0.1:5173/'), 'http://127.0.0.1:5173/');
  });

  it('returns the input unchanged rather than throwing on something unparseable', () => {
    // The caller uses this as the final step of the wipe. Throwing there would
    // leave the writer looking at a panel that says the delete succeeded on a
    // page that never reloads; a reload to an unchanged URL is strictly better.
    assert.equal(postWipeUrl('not a url'), 'not a url');
    assert.equal(postWipeUrl(''), '');
  });
});
