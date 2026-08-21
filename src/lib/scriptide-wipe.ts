// E4 "delete everything" — the client-side orchestration for the destructive
// wipe control (src/components/SettingsPanel.tsx's Session tab). Pure
// orchestration over injected dependencies (same StorageReader/StorageWriter-
// style injection as scriptide-draft-store.ts) so the ORDER and BEST-EFFORT
// semantics are unit-testable without a DOM, fetch, or IndexedDB — the real
// browser primitives are wired in by the caller.
//
// Every step is independently best-effort: one store failing to clear must
// never stop the others from being attempted. The caller (SettingsPanel)
// surfaces which of the four succeeded so the confirmation copy stays honest
// even on a partial failure.

export interface ScriptIDEWipeDeps {
  /** Deletes this browser's session on the server (draft, snapshots,
   *  characters, research notes, and simulation state — a true SQLite-file
   *  wipe, not a soft reset; see server/lib/session-store.ts's
   *  destroySession). Resolves false on any non-2xx response or network
   *  failure. */
  deleteServerSession: () => Promise<boolean>;
  /** Clears every localStorage key for this origin. Returns false if the
   *  clear call itself throws (private browsing, storage disabled). */
  clearLocalStorage: () => boolean;
  /** Clears every sessionStorage key for this origin. Same failure contract
   *  as clearLocalStorage. */
  clearSessionStorage: () => boolean;
  /** Deletes the entire IndexedDB draft-mirror database
   *  (src/lib/scriptide-idb-store.ts's wipeScriptIDEIDB). Resolves false on
   *  any failure, including a browser with no IndexedDB at all. */
  wipeIndexedDB: () => Promise<boolean>;
}

export interface ScriptIDEWipeResult {
  serverDeleted: boolean;
  localStorageCleared: boolean;
  sessionStorageCleared: boolean;
  indexedDBWiped: boolean;
}

function safeSync(fn: () => boolean): boolean {
  try {
    return fn();
  } catch {
    return false;
  }
}

async function safeAsync(fn: () => Promise<boolean>): Promise<boolean> {
  try {
    return await fn();
  } catch {
    return false;
  }
}

/**
 * Runs the full wipe. The server call goes FIRST and is awaited before any
 * local store is touched: clearing localStorage also erases this browser's
 * session identity (src/lib/session.ts's sm_session_id_v1), and a fresh id
 * minted after that clear would point every subsequent request at a brand
 * new, still-empty session — silently no-op'ing the exact deletion the
 * writer asked for. Deleting on the server while the CURRENT id is still in
 * effect is what makes the deletion real.
 *
 * localStorage, sessionStorage, and IndexedDB are then cleared independently
 * of one another and of the server result — a failure in one must never
 * skip the others, since each is a genuinely separate store with its own
 * failure modes (quota, private browsing, browser policy).
 */
export async function wipeAllScriptIDEData(deps: ScriptIDEWipeDeps): Promise<ScriptIDEWipeResult> {
  const serverDeleted = await safeAsync(deps.deleteServerSession);
  const indexedDBWiped = await safeAsync(deps.wipeIndexedDB);
  const localStorageCleared = safeSync(deps.clearLocalStorage);
  const sessionStorageCleared = safeSync(deps.clearSessionStorage);
  return { serverDeleted, indexedDBWiped, localStorageCleared, sessionStorageCleared };
}
