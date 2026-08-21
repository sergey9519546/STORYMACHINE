// E4: IndexedDB mirror of the ScriptIDE draft envelope
// (src/lib/scriptide-draft-store.ts). Belt-and-suspenders alongside
// localStorage — IndexedDB's per-origin quota is typically hundreds of MB to
// low GB (browser- and free-disk-dependent), vs. localStorage's ~5MB, so a
// feature-length screenplay with a deep snapshot/version history that
// silently fails `localStorage.setItem` (QuotaExceededError — surfaced today
// as ScriptIDE.tsx's "save-failed" status) still has a real place to land.
//
// Every export here is promise-based and NEVER rejects: IndexedDB access can
// throw, be blocked, or be entirely unavailable (private browsing in some
// browsers, enterprise policy, disabled storage) and this module must
// degrade to "no mirror" silently rather than take down draft persistence,
// which already works via localStorage alone. Callers still wrap calls
// defensively (see ScriptIDE.tsx) as a second layer, per the hard rule that
// every IndexedDB access site is try/caught.
import {
  isScriptIDEDraftEnvelope,
  type ScriptIDEDraftEnvelope,
} from './scriptide-draft-store.ts';

const DB_NAME = 'storymachine_scriptide_v1';
const DB_VERSION = 1;
const STORE_NAME = 'draft';
// Single fixed record: this store mirrors exactly one draft, the same one
// localStorage's SCRIPTIDE_DRAFT_KEY holds. A per-key store would be over-
// engineering for a mirror with exactly one consumer and one shape.
const RECORD_KEY = 'current';

// Read at call time (not cached at module load) — a private-browsing tab or
// a browser with storage disabled by policy can make `indexedDB` undefined,
// and it must be re-checked on every call rather than assumed permanent for
// the life of the module.
function hasIndexedDB(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    // Some hardened browser configurations throw merely on referencing the
    // global rather than leaving it undefined.
    return false;
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDB()) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (err) {
      reject(err);
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'));
    // A version-change from a concurrent tab (or another future consumer of
    // this DB) blocking an open must fail this call rather than hang it —
    // every caller here already treats a rejected/unavailable mirror as "no
    // mirror this time", never as a hang.
    request.onblocked = () => reject(new Error('IndexedDB open blocked'));
  });
}

/**
 * Best-effort mirror write. Resolves `false` — never rejects — on any
 * failure: private windows, blocked storage, quota, a serialization
 * failure (structured-clone cannot represent the value), or a browser with
 * no IndexedDB at all.
 */
export async function writeScriptIDEDraftIDB(envelope: ScriptIDEDraftEnvelope): Promise<boolean> {
  let db: IDBDatabase;
  try {
    db = await openDB();
  } catch {
    return false;
  }
  return new Promise<boolean>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(envelope, RECORD_KEY);
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); resolve(false); };
      tx.onabort = () => { db.close(); resolve(false); };
    } catch {
      try { db.close(); } catch { /* already closed/unusable */ }
      resolve(false);
    }
  });
}

/**
 * Best-effort mirror read. Resolves `null` — never rejects — when IndexedDB
 * is unavailable, the record is absent, or the stored value no longer
 * matches the current envelope shape (`isScriptIDEDraftEnvelope`) — the same
 * defensive validation `readScriptIDEDraft` applies to localStorage's copy,
 * so a shape from a schema this build no longer understands is treated as
 * "nothing to restore" rather than trusted as-is.
 */
export async function readScriptIDEDraftIDB(): Promise<ScriptIDEDraftEnvelope | null> {
  let db: IDBDatabase;
  try {
    db = await openDB();
  } catch {
    return null;
  }
  return new Promise<ScriptIDEDraftEnvelope | null>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(RECORD_KEY);
      req.onsuccess = () => {
        db.close();
        const value: unknown = req.result;
        resolve(isScriptIDEDraftEnvelope(value) ? value : null);
      };
      req.onerror = () => { db.close(); resolve(null); };
    } catch {
      try { db.close(); } catch { /* already closed/unusable */ }
      resolve(null);
    }
  });
}

/**
 * Deletes the entire IndexedDB database backing the mirror — the IndexedDB
 * half of "delete everything" (E4). Resolves `false` — never rejects — on
 * failure, so a blocked or unavailable IndexedDB never stops the rest of the
 * wipe (localStorage clear + server session delete) from completing.
 */
export async function wipeScriptIDEIDB(): Promise<boolean> {
  if (!hasIndexedDB()) return false;
  return new Promise<boolean>((resolve) => {
    try {
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
      // A live connection elsewhere (e.g. a second tab mid-write) can block
      // deletion. Treat that as failure rather than hang the caller —
      // delete-everything is best-effort for IndexedDB the same way every
      // other function in this module is.
      request.onblocked = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}
