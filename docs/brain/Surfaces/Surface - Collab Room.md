---
type: surface
updated: 2026-09-05
sources: [server/routes/collab.ts, server/collab/yjs-server.ts, server/lib/collab-rooms.ts, tests/collab/room-purge.test.ts]
status: active
---

# Surface — Collab Room

**Files:** `server/routes/collab.ts` (`POST /api/collab/rooms` mints a
server-generated 128-bit unguessable room id; `POST /api/collab/token`
mints a short-lived join token for an existing id), `server/lib/collab-rooms.ts`
(room lifecycle, `COLLAB_ROOM_TTL_MS` default 24h), `server/collab/yjs-server.ts`
(the CRDT sync server, in-memory only, no persistence). Distinct from
`server/critics/critics-engine.ts`'s "Room" panel
(`src/components/RoomPanel.tsx` — "Twelve critics debate the current story
state — deterministic, no AI key required," `docs/CLAIMS_REGISTER.md`
row 13), which is a different feature sharing the "Room" name.

**What it shows / stores:** "if you open a share link, the server also
holds the shared copy of that document in memory for as long as the room
lives (a day at most, sooner if the server restarts)" (row 28). Delete
Everything on the owning session "closes and drops any share-link rooms
this session created" (row 26).

**Browser suite:** `tests/collab/room-purge.test.ts`;
`scripts/verify-e4-local-safety-net.mjs` §4 covers the Delete-Everything
interaction with a live room.

## Sources

- `server/routes/collab.ts`; `server/lib/collab-rooms.ts`; `server/collab/yjs-server.ts`
- `tests/collab/room-purge.test.ts`
- `docs/CLAIMS_REGISTER.md` rows 13, 26, 28
