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
/**
 * The URL the app must land on after a wipe — the current one with the
 * collaboration share parameter and any hash route stripped.
 *
 * WHY THIS IS NOT JUST `location.reload()`. A collaboration room id lives in
 * the URL (`?collab=<id>`, src/components/editor/collab.ts's
 * COLLAB_QUERY_PARAM) because the share LINK is the capability. A plain
 * reload therefore re-enters the room the writer just deleted everything for:
 * the client re-fetches a join token, reconnects, and — since the wiped local
 * draft is now empty while the shared Y.Doc is not — pulls the supposedly
 * deleted text straight back into the editor from another participant's copy.
 * The server-side room and its Y.Doc are destroyed by POST
 * /api/session/delete, so the rejoin would fail today; keeping the id in the
 * URL would still leave a dead capability in history and in the address bar,
 * and would silently re-arm the whole path the moment a share link were ever
 * re-mintable. Leaving the room is part of leaving the data.
 *
 * The hash goes too: `#privacy` / `#verify` are the app's routes (App.tsx),
 * and a wipe should land on the entrance, not on whatever sub-view the
 * Settings panel happened to be opened over.
 *
 * Pure and string-in/string-out so it is testable without a DOM. Returns the
 * input unchanged if it cannot be parsed as a URL — a reload to a
 * still-collab-scoped URL is strictly better than throwing inside the wipe's
 * final step.
 */
export function postWipeUrl(href: string): string {
  try {
    const url = new URL(href);
    url.searchParams.delete('collab');
    url.hash = '';
    return url.toString();
  } catch {
    return href;
  }
}

export async function wipeAllScriptIDEData(deps: ScriptIDEWipeDeps): Promise<ScriptIDEWipeResult> {
  const serverDeleted = await safeAsync(deps.deleteServerSession);
  const indexedDBWiped = await safeAsync(deps.wipeIndexedDB);
  const localStorageCleared = safeSync(deps.clearLocalStorage);
  const sessionStorageCleared = safeSync(deps.clearSessionStorage);
  return { serverDeleted, indexedDBWiped, localStorageCleared, sessionStorageCleared };
}
