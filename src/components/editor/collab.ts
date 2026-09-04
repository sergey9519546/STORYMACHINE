// ── Real-time collaboration extension (P4) ───────────────────────────────────
// Wraps y-codemirror.next + a y-websocket provider into a single CM6 Extension
// plus a lifecycle handle. The editor's text is bound to a shared Y.Text so
// every connected client sees edits and remote cursors live.
//
// The WebSocket connects to /collab/<room> on the same origin/port as the app;
// the server (server/collab/yjs-server.ts) speaks the standard y-protocols
// sync + awareness framing, so the stock y-websocket provider is compatible.

// yjs/y-websocket/y-codemirror.next are NOT imported statically here — they
// pull in a real-time-CRDT stack (~150KB+ minified) that's only ever needed
// by the ~1-in-N writer who actually opens a collaboration room, never by
// first paint or by local (non-collab) typing. A static import here would
// bundle straight into FountainEditor's (eager, must-stay-fast) chunk since
// FountainEditor imports createCollabSession unconditionally. Instead the
// three packages are dynamic-imported inside createCollabSession() below,
// which Rollup then splits into their own lazily-fetched chunk — loaded only
// when `collabRoom` is actually set (see FountainEditor.tsx's effect). Every
// other export in this file (createCollabRoom, share-link helpers,
// roomIdFromLocation) stays a normal top-level export: those ARE needed
// synchronously at mount (e.g. reading `?collab=` from the URL) and carry no
// heavy dependency of their own.
import type { Extension } from '@codemirror/state';
import type * as Y from 'yjs';
import type { WebsocketProvider } from 'y-websocket';

export interface CollabSession {
  /** The CM6 extension to include in the editor's state. */
  extension: Extension;
  /** Tear down the provider + doc (call on unmount or when leaving the room). */
  destroy(): void;
  /** The underlying provider, exposed for status listeners. */
  provider: WebsocketProvider;
  /** The shared Y.Text bound to the document. */
  ytext: Y.Text;
}

export interface CollabOptions {
  /**
   * Server-minted room id (POST /api/collab/rooms). This is the CAPABILITY:
   * anyone holding it can read and write the shared document, so it is never
   * writer-typed and never derived from the draft's title — see
   * createCollabRoom() below.
   */
  roomId: string;
  /** Display name shown on this user's remote cursor. */
  userName?: string;
  /** Cursor color (CSS color). A stable per-user color is recommended. */
  userColor?: string;
  /**
   * Seed text used ONLY when this client is the first to populate an empty
   * shared doc — prevents a blank doc from clobbering an existing draft. May be
   * a getter, resolved at sync time, so the freshest editor content (not a stale
   * mount-time snapshot) seeds the shared doc.
   */
  initialText?: string | (() => string);
}

// A small palette of distinct, legible cursor colors.
const CURSOR_COLORS = [
  '#FF4444', '#22C55E', '#3B82F6', '#A855F7',
  '#F59E0B', '#EC4899', '#14B8A6', '#8B5CF6',
];

/** Deterministically pick a cursor color from a name so it stays stable. */
export function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
}

/** Build the WebSocket base URL for the collab endpoint on the current origin. */
export function collabWsBase(): string {
  if (typeof window === 'undefined') return 'ws://localhost/collab';
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}/collab`;
}

/** Query parameter carrying a room id in a share link. */
export const COLLAB_QUERY_PARAM = 'collab';

/**
 * Ask the server to mint a new room. The id comes back from the server and is
 * never chosen here: a client-chosen (writer-typed) room name was the hole
 * that let any anonymous caller pull down an unpublished draft — see
 * server/routes/collab.ts and docs/AUTH.md's "Collaboration rooms".
 */
export async function createCollabRoom(): Promise<string> {
  const res = await fetch('/api/collab/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (!res.ok) throw new Error(`Failed to create collaboration room: ${res.status}`);
  const { roomId } = await res.json() as { roomId: string };
  if (!roomId) throw new Error('Server did not return a room id.');
  return roomId;
}

/** The link to hand a collaborator. Anyone holding it can read and write. */
export function collabShareUrl(roomId: string): string {
  if (typeof window === 'undefined') return roomId;
  const url = new URL(window.location.href);
  url.searchParams.set(COLLAB_QUERY_PARAM, roomId);
  url.hash = '';
  return url.toString();
}

/**
 * Pull a room id out of a pasted share link (or accept a bare id). Returns
 * null when the input contains nothing that could be a room id, so the caller
 * can refuse rather than opening a socket for a typo.
 */
export function parseShareInput(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const bare = /^[A-Za-z0-9_-]{1,64}$/;
  if (bare.test(text)) return text;
  try {
    const parsed = new URL(text, typeof window === 'undefined' ? 'http://localhost' : window.location.href);
    const id = parsed.searchParams.get(COLLAB_QUERY_PARAM);
    return id && bare.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Read the room id a share link put in the current URL, if any. */
export function roomIdFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const id = new URLSearchParams(window.location.search).get(COLLAB_QUERY_PARAM);
  return id && /^[A-Za-z0-9_-]{1,64}$/.test(id) ? id : null;
}

/**
 * Fetch a short-lived token authorizing a join to this room (server/collab/
 * yjs-server.ts rejects any /collab/<room> WebSocket upgrade without one —
 * see server/lib/collab-auth.ts). Throws if the server rejects the request,
 * which now includes "that room does not exist" — an id the server never
 * minted, or one whose room has since expired, is refused rather than
 * conjured into existence on demand.
 */
async function fetchCollabToken(roomId: string): Promise<string> {
  const res = await fetch('/api/collab/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId }),
  });
  if (!res.ok) throw new Error(`Failed to fetch collab token: ${res.status}`);
  const { token } = await res.json() as { token: string };
  return token;
}

/**
 * Create a collaboration session for a room. Returns the CM6 extension plus a
 * destroy() to release the socket and shared doc.
 *
 * Async because it fetches a room-scoped auth token before opening the socket
 * (see fetchCollabToken above) — callers can no longer construct the session
 * synchronously inline with the rest of editor setup; see FountainEditor.tsx's
 * use of a Compartment to hot-swap the extension in once this resolves.
 */
export async function createCollabSession(opts: CollabOptions): Promise<CollabSession> {
  // Deferred until a room is actually being joined — see the header comment
  // above. All three settle before any of their exports are used; a rejected
  // token fetch below (the more common failure) still has to run in
  // parallel with this since neither depends on the other's result.
  const [{ Doc }, { WebsocketProvider: WSProvider }, { yCollab }] = await Promise.all([
    import('yjs'),
    import('y-websocket'),
    import('y-codemirror.next'),
  ]);

  const doc = new Doc();
  const ytext = doc.getText('script');

  let token: string;
  try {
    token = await fetchCollabToken(opts.roomId);
  } catch (err) {
    // Nothing downstream has a reference to `doc` yet (the promise rejects
    // here), so it must be torn down before rethrowing or it leaks.
    doc.destroy();
    throw err;
  }
  // y-websocket appends `/<room>` to the base url; our server parses /collab/<room>.
  // `params` is serialized as a query string by y-websocket, landing after the
  // room segment (…/collab/<room>?token=…), which the server parses separately
  // from the room path — see parseRoomId/parseToken in yjs-server.ts.
  const provider = new WSProvider(collabWsBase(), opts.roomId, doc, { params: { token } });

  const name = opts.userName ?? 'Writer';
  provider.awareness.setLocalStateField('user', {
    name,
    color: opts.userColor ?? colorForName(name),
  });

  // Seed only an empty shared doc, and only after the initial sync, so we never
  // overwrite content another collaborator already loaded. initialText is
  // resolved HERE (at sync time), not captured earlier, so a getter returns the
  // live editor content rather than a stale mount-time value.
  if (opts.initialText) {
    provider.once('sync', (isSynced: boolean) => {
      const seed = typeof opts.initialText === 'function' ? opts.initialText() : opts.initialText;
      if (isSynced && ytext.length === 0 && seed) {
        ytext.insert(0, seed);
      }
    });
  }

  const extension = yCollab(ytext, provider.awareness);

  return {
    extension,
    provider,
    ytext,
    destroy() {
      try { provider.destroy(); } catch { /* already torn down */ }
      try { doc.destroy(); } catch { /* already torn down */ }
    },
  };
}
