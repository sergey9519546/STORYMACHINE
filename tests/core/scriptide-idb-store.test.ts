import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  readScriptIDEDraftIDB,
  wipeScriptIDEIDB,
  writeScriptIDEDraftIDB,
} from '../../src/lib/scriptide-idb-store.ts';
import type { ScriptIDEDraftEnvelope } from '../../src/lib/scriptide-draft-store.ts';

// ── Minimal in-process fake IndexedDB ───────────────────────────────────────
// This repo has no jsdom/browser test harness (CLAUDE.md) and the task calls
// for no new runtime dependency, so this is a purpose-built shim covering
// only the exact surface src/lib/scriptide-idb-store.ts uses: indexedDB.open
// (with onupgradeneeded/onsuccess/onerror/onblocked), indexedDB.deleteDatabase,
// and one object store's transaction/put/get with oncomplete/onerror/onabort.
// It is intentionally NOT a general IndexedDB polyfill — every callback fires
// asynchronously (via queueMicrotask) to stay honest about the real API's
// async contract, which is the one thing a naive synchronous fake would get
// wrong in a way that could hide a bug in the module under test.

type Handler = (() => void) | null;

class FakeRequest<T = unknown> {
  result: T = undefined as unknown as T;
  error: Error | null = null;
  onsuccess: Handler = null;
  onerror: Handler = null;
  onblocked: Handler = null;
  _succeed(result: T) {
    this.result = result;
    queueMicrotask(() => this.onsuccess?.());
  }
  _fail(error: Error) {
    this.error = error;
    queueMicrotask(() => this.onerror?.());
  }
  _block() {
    queueMicrotask(() => this.onblocked?.());
  }
}

class FakeObjectStore {
  store: Map<string, unknown>;
  constructor(store: Map<string, unknown>) {
    this.store = store;
  }
  put(value: unknown, key: string) {
    const req = new FakeRequest<undefined>();
    this.store.set(key, value);
    req._succeed(undefined);
    return req;
  }
  get(key: string) {
    const req = new FakeRequest<unknown>();
    req._succeed(this.store.get(key));
    return req;
  }
}

class FakeTransaction {
  oncomplete: Handler = null;
  onerror: Handler = null;
  onabort: Handler = null;
  store: Map<string, unknown>;
  failMode: 'none' | 'error' | 'abort';
  constructor(store: Map<string, unknown>, failMode: 'none' | 'error' | 'abort' = 'none') {
    this.store = store;
    this.failMode = failMode;
    if (this.failMode === 'none') {
      // Real IndexedDB fires oncomplete after the microtask queue drains for
      // every request issued against this transaction — approximate that by
      // deferring one microtask past object-store operations (which already
      // resolve via their own queueMicrotask above).
      queueMicrotask(() => queueMicrotask(() => this.oncomplete?.()));
    } else if (this.failMode === 'error') {
      queueMicrotask(() => queueMicrotask(() => this.onerror?.()));
    } else {
      queueMicrotask(() => queueMicrotask(() => this.onabort?.()));
    }
  }
  objectStore(_name: string) {
    return new FakeObjectStore(this.store);
  }
}

class FakeDatabase {
  objectStoreNames = { contains: (_name: string) => true };
  closed = false;
  stores: Map<string, Map<string, unknown>>;
  failMode: 'none' | 'error' | 'abort';
  constructor(stores: Map<string, Map<string, unknown>>, failMode: 'none' | 'error' | 'abort' = 'none') {
    this.stores = stores;
    this.failMode = failMode;
  }
  createObjectStore(_name: string) { /* pre-seeded in the registry below */ }
  transaction(name: string, _mode: 'readonly' | 'readwrite') {
    let store = this.stores.get(name);
    if (!store) { store = new Map(); this.stores.set(name, store); }
    return new FakeTransaction(store, this.failMode);
  }
  close() { this.closed = true; }
}

interface FakeIndexedDBOptions {
  /** When true, indexedDB.open itself resolves but every subsequent
   *  transaction on the returned db fails — simulates a mid-operation error
   *  without pretending the whole browser has no IndexedDB. */
  transactionFailMode?: 'none' | 'error' | 'abort';
  /** When true, indexedDB.open itself fails/blocks — simulates the
   *  "no usable IndexedDB at all" case (private browsing, disabled storage). */
  openFailMode?: 'none' | 'error' | 'blocked';
}

function makeFakeIndexedDB(opts: FakeIndexedDBOptions = {}) {
  const databases = new Map<string, Map<string, Map<string, unknown>>>();
  return {
    open(name: string, _version: number) {
      const req = new FakeRequest<FakeDatabase>();
      if (opts.openFailMode === 'error') {
        req._fail(new Error('fake open error'));
        return req;
      }
      if (opts.openFailMode === 'blocked') {
        req._block();
        return req;
      }
      let stores = databases.get(name);
      if (!stores) { stores = new Map(); databases.set(name, stores); }
      const db = new FakeDatabase(stores, opts.transactionFailMode ?? 'none');
      // Real indexedDB.open fires onupgradeneeded before onsuccess on first
      // creation; the module under test only uses it to create the store,
      // which this fake pre-creates lazily in transaction(), so it is safe
      // to skip onupgradeneeded entirely and go straight to onsuccess.
      req._succeed(db);
      return req;
    },
    deleteDatabase(name: string) {
      const req = new FakeRequest<undefined>();
      databases.delete(name);
      req._succeed(undefined);
      return req;
    },
  };
}

const envelope: ScriptIDEDraftEnvelope = {
  schemaVersion: 2,
  scriptText: 'INT. ROOM - DAY',
  snapshots: [{ id: 's1' }],
  characters: [{ id: 'c1' }],
  researchNotes: [{ id: 'r1' }],
  isDarkMode: true,
  titlePage: { title: 'THE LEDGER', author: 'J. Author', contact: 'j@example.com' },
  contentUpdatedAt: 123,
  serverRevision: 100,
  dirty: false,
};

describe('scriptide-idb-store', () => {
  beforeEach(() => {
    delete (globalThis as { indexedDB?: unknown }).indexedDB;
  });

  it('read resolves null when indexedDB is entirely unavailable', async () => {
    assert.equal(await readScriptIDEDraftIDB(), null);
  });

  it('write resolves false when indexedDB is entirely unavailable', async () => {
    assert.equal(await writeScriptIDEDraftIDB(envelope), false);
  });

  it('wipe resolves false when indexedDB is entirely unavailable', async () => {
    assert.equal(await wipeScriptIDEIDB(), false);
  });

  it('round-trips a written envelope', async () => {
    (globalThis as { indexedDB?: unknown }).indexedDB = makeFakeIndexedDB();
    assert.equal(await writeScriptIDEDraftIDB(envelope), true);
    const read = await readScriptIDEDraftIDB();
    assert.deepEqual(read, envelope);
  });

  it('a second write overwrites the first (single fixed-key record)', async () => {
    (globalThis as { indexedDB?: unknown }).indexedDB = makeFakeIndexedDB();
    await writeScriptIDEDraftIDB(envelope);
    const updated = { ...envelope, scriptText: 'REVISED DRAFT', contentUpdatedAt: 999 };
    await writeScriptIDEDraftIDB(updated);
    assert.deepEqual(await readScriptIDEDraftIDB(), updated);
  });

  it('read resolves null before any write has ever happened', async () => {
    (globalThis as { indexedDB?: unknown }).indexedDB = makeFakeIndexedDB();
    assert.equal(await readScriptIDEDraftIDB(), null);
  });

  it('read resolves null for a stored value that no longer matches the envelope shape', async () => {
    const fake = makeFakeIndexedDB();
    (globalThis as { indexedDB?: unknown }).indexedDB = fake;
    // Simulate a value written by a schema this build no longer understands
    // by writing raw garbage directly through the fake's own put, bypassing
    // writeScriptIDEDraftIDB's typed envelope parameter entirely.
    const db = await new Promise<FakeDatabase>((resolve) => {
      const req = fake.open('storymachine_scriptide_v1', 1);
      req.onsuccess = () => resolve(req.result);
    });
    const tx = db.transaction('draft', 'readwrite');
    tx.objectStore('draft').put({ not: 'a valid envelope' }, 'current');
    await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); });
    assert.equal(await readScriptIDEDraftIDB(), null);
  });

  it('write resolves false when the transaction errors', async () => {
    (globalThis as { indexedDB?: unknown }).indexedDB = makeFakeIndexedDB({ transactionFailMode: 'error' });
    assert.equal(await writeScriptIDEDraftIDB(envelope), false);
  });

  it('write resolves false when the transaction aborts', async () => {
    (globalThis as { indexedDB?: unknown }).indexedDB = makeFakeIndexedDB({ transactionFailMode: 'abort' });
    assert.equal(await writeScriptIDEDraftIDB(envelope), false);
  });

  it('read resolves null when the transaction errors', async () => {
    (globalThis as { indexedDB?: unknown }).indexedDB = makeFakeIndexedDB({ transactionFailMode: 'error' });
    assert.equal(await readScriptIDEDraftIDB(), null);
  });

  it('read/write resolve null/false when opening the database itself fails', async () => {
    (globalThis as { indexedDB?: unknown }).indexedDB = makeFakeIndexedDB({ openFailMode: 'error' });
    assert.equal(await readScriptIDEDraftIDB(), null);
    assert.equal(await writeScriptIDEDraftIDB(envelope), false);
  });

  it('read/write resolve null/false when opening the database is blocked', async () => {
    (globalThis as { indexedDB?: unknown }).indexedDB = makeFakeIndexedDB({ openFailMode: 'blocked' });
    assert.equal(await readScriptIDEDraftIDB(), null);
    assert.equal(await writeScriptIDEDraftIDB(envelope), false);
  });

  it('wipe deletes the database — a subsequent read sees nothing', async () => {
    (globalThis as { indexedDB?: unknown }).indexedDB = makeFakeIndexedDB();
    await writeScriptIDEDraftIDB(envelope);
    assert.notEqual(await readScriptIDEDraftIDB(), null);
    assert.equal(await wipeScriptIDEIDB(), true);
    assert.equal(await readScriptIDEDraftIDB(), null);
  });

  it('wipe is idempotent — wiping an already-empty database still resolves true', async () => {
    (globalThis as { indexedDB?: unknown }).indexedDB = makeFakeIndexedDB();
    assert.equal(await wipeScriptIDEIDB(), true);
    assert.equal(await wipeScriptIDEIDB(), true);
  });
});
