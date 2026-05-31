// ── Yjs real-time collaboration server (P4) ──────────────────────────────────
// A minimal, dependency-light Yjs WebSocket sync backend. It attaches to the
// existing HTTP server via the 'upgrade' event on the /collab path, so it shares
// the same port as Express — no separate process or port.
//
// Protocol: the standard y-protocols sync + awareness framing used by
// y-codemirror.next on the client. Each "room" (a document id, e.g. the ScriptIDE
// session) gets one shared Y.Doc held in memory; clients in the same room are
// kept in sync and their awareness (cursors/selections) is relayed.
//
// In-memory only: documents live for the lifetime of the process. Persistence
// to SQLite can be layered on later by snapshotting Y.Doc updates — out of scope
// for the first cut, which delivers live multi-cursor editing.

import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer, IncomingMessage } from 'http';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { logger } from '../lib/logger.ts';

// y-protocols message type tags (wire constants).
const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;

const MAX_ROOMS = Number(process.env.COLLAB_MAX_ROOMS ?? 200);
// A room id must be a safe, bounded token (it comes from the URL).
const ROOM_RE = /^[a-zA-Z0-9_-]{1,64}$/;

interface Room {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Set<WebSocket>;
}

const rooms = new Map<string, Room>();

function getRoom(name: string): Room | null {
  let room = rooms.get(name);
  if (room) return room;
  if (rooms.size >= MAX_ROOMS) {
    // Evict an empty room if we are at capacity; refuse if none are empty.
    const emptyId = [...rooms.entries()].find(([, r]) => r.conns.size === 0)?.[0];
    if (emptyId) destroyRoom(emptyId);
    else return null;
  }
  const doc = new Y.Doc();
  const awareness = new awarenessProtocol.Awareness(doc);
  room = { doc, awareness, conns: new Set() };

  // Broadcast document updates to every other connection in the room.
  doc.on('update', (update: Uint8Array, origin: unknown) => {
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MESSAGE_SYNC);
    syncProtocol.writeUpdate(enc, update);
    const msg = encoding.toUint8Array(enc);
    for (const c of room!.conns) {
      if (c !== origin && c.readyState === WebSocket.OPEN) c.send(msg);
    }
  });

  // Relay awareness (cursor/selection) changes to the whole room.
  awareness.on('update', ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, origin: unknown) => {
    const changed = added.concat(updated, removed);
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(enc, awarenessProtocol.encodeAwarenessUpdate(awareness, changed));
    const msg = encoding.toUint8Array(enc);
    for (const c of room!.conns) {
      if (c !== origin && c.readyState === WebSocket.OPEN) c.send(msg);
    }
  });

  rooms.set(name, room);
  return room;
}

function destroyRoom(name: string): void {
  const room = rooms.get(name);
  if (!room) return;
  room.awareness.destroy();
  room.doc.destroy();
  rooms.delete(name);
}

function onMessage(conn: WebSocket, room: Room, data: Uint8Array): void {
  const decoder = decoding.createDecoder(data);
  const encoder = encoding.createEncoder();
  const messageType = decoding.readVarUint(decoder);

  switch (messageType) {
    case MESSAGE_SYNC: {
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      // readSyncMessage applies the incoming step and may write a reply step.
      syncProtocol.readSyncMessage(decoder, encoder, room.doc, conn);
      if (encoding.length(encoder) > 1) {
        if (conn.readyState === WebSocket.OPEN) conn.send(encoding.toUint8Array(encoder));
      }
      break;
    }
    case MESSAGE_AWARENESS: {
      awarenessProtocol.applyAwarenessUpdate(
        room.awareness,
        decoding.readVarUint8Array(decoder),
        conn,
      );
      break;
    }
    default:
      // Unknown message types are ignored — forward compatibility.
      break;
  }
}

function setupConnection(conn: WebSocket, room: Room): void {
  conn.binaryType = 'arraybuffer';
  room.conns.add(conn);

  conn.on('message', (message: ArrayBuffer | Buffer) => {
    try {
      const bytes = message instanceof ArrayBuffer
        ? new Uint8Array(message)
        : new Uint8Array(message.buffer, message.byteOffset, message.byteLength);
      onMessage(conn, room, bytes);
    } catch (err) {
      logger.warn('collab_message_error', { error: (err as Error).message });
    }
  });

  const closeConn = () => {
    room.conns.delete(conn);
    // Drop this client's awareness state so other cursors disappear cleanly.
    awarenessProtocol.removeAwarenessStates(
      room.awareness,
      [room.doc.clientID],
      conn,
    );
    if (room.conns.size === 0) {
      // Keep the doc briefly in case of quick reconnects; evicted lazily under load.
    }
  };
  conn.on('close', closeConn);
  conn.on('error', closeConn);

  // ── Step 1 of the sync handshake: send our state vector so the client can
  //    compute and send back the missing updates. ──
  {
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(enc, room.doc);
    conn.send(encoding.toUint8Array(enc));
  }

  // ── Send current awareness state so the new client sees existing cursors. ──
  const states = room.awareness.getStates();
  if (states.size > 0) {
    const enc = encoding.createEncoder();
    encoding.writeVarUint(enc, MESSAGE_AWARENESS);
    encoding.writeVarUint8Array(
      enc,
      awarenessProtocol.encodeAwarenessUpdate(room.awareness, [...states.keys()]),
    );
    conn.send(encoding.toUint8Array(enc));
  }
}

/**
 * Parse the room id out of a /collab/<room> WebSocket URL. Returns null for
 * non-collab paths or malformed/oversized room ids.
 */
export function parseRoomId(url: string | undefined): string | null {
  if (!url) return null;
  const path = url.split('?')[0];
  const m = path.match(/^\/collab\/([^/]+)\/?$/);
  if (!m) return null;
  const room = decodeURIComponent(m[1]);
  return ROOM_RE.test(room) ? room : null;
}

/** Current number of live collaboration rooms (for /health and tests). */
export function collabRoomCount(): number {
  return rooms.size;
}

/**
 * Attach the Yjs collaboration server to an existing HTTP server. Handles the
 * WebSocket upgrade for /collab/<room> paths and leaves all other upgrades alone.
 */
export function attachCollabServer(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (conn: WebSocket, _req: IncomingMessage, room: Room) => {
    setupConnection(conn, room);
  });

  server.on('upgrade', (req: IncomingMessage, socket, head) => {
    const roomId = parseRoomId(req.url);
    if (roomId === null) {
      // Not a collab path (or invalid) — let other upgrade handlers (e.g. Vite HMR)
      // deal with it. We must not destroy the socket here.
      return;
    }
    const room = getRoom(roomId);
    if (!room) {
      socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (conn) => {
      wss.emit('connection', conn, req, room);
    });
  });

  logger.info('collab_server_attached', { path: '/collab/:room', maxRooms: MAX_ROOMS });
  return wss;
}
