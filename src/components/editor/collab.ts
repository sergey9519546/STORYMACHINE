// ── Real-time collaboration extension (P4) ───────────────────────────────────
// Wraps y-codemirror.next + a y-websocket provider into a single CM6 Extension
// plus a lifecycle handle. The editor's text is bound to a shared Y.Text so
// every connected client sees edits and remote cursors live.
//
// The WebSocket connects to /collab/<room> on the same origin/port as the app;
// the server (server/collab/yjs-server.ts) speaks the standard y-protocols
// sync + awareness framing, so the stock y-websocket provider is compatible.

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { yCollab } from 'y-codemirror.next';
import type { Extension } from '@codemirror/state';

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
  /** Room id — collaborators sharing this id edit the same document. */
  room: string;
  /** Display name shown on this user's remote cursor. */
  userName?: string;
  /** Cursor color (CSS color). A stable per-user color is recommended. */
  userColor?: string;
  /**
   * Seed text used ONLY when this client is the first to populate an empty
   * shared doc — prevents a blank doc from clobbering an existing draft.
   */
  initialText?: string;
}

// A small palette of distinct, legible cursor colors.
const CURSOR_COLORS = [
  '#c1301c', '#22C55E', '#3B82F6', '#A855F7',
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

/**
 * Fetch a short-lived token authorizing a join to this room (server/collab/
 * yjs-server.ts rejects any /collab/<room> WebSocket upgrade without one —
 * see server/lib/collab-auth.ts). Throws if the server rejects the request.
 */
async function fetchCollabToken(room: string): Promise<string> {
  const res = await fetch('/api/collab/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ room }),
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
  const doc = new Y.Doc();
  const ytext = doc.getText('script');

  const token = await fetchCollabToken(opts.room);
  // y-websocket appends `/<room>` to the base url; our server parses /collab/<room>.
  // `params` is serialized as a query string by y-websocket, landing after the
  // room segment (…/collab/<room>?token=…), which the server parses separately
  // from the room path — see parseRoomId/parseToken in yjs-server.ts.
  const provider = new WebsocketProvider(collabWsBase(), opts.room, doc, { params: { token } });

  const name = opts.userName ?? 'Writer';
  provider.awareness.setLocalStateField('user', {
    name,
    color: opts.userColor ?? colorForName(name),
  });

  // Seed only an empty shared doc, and only after the initial sync, so we never
  // overwrite content another collaborator already loaded.
  if (opts.initialText) {
    provider.once('sync', (isSynced: boolean) => {
      if (isSynced && ytext.length === 0 && opts.initialText) {
        ytext.insert(0, opts.initialText);
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
