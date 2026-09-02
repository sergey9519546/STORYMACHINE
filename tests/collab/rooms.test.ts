// Unit tests for the collaboration room registry (server/lib/collab-rooms.ts) —
// the module that turned collab from "any caller may have a token for any room
// NAME they type" into a real capability model. See
// docs/audits/2026-09-02-retrospective/RETROSPECTIVE.md §4 and docs/AUTH.md's
// "Collaboration rooms" section.
//
// The registry's ceiling is read from the environment at module load
// (boundedIntegerEnv), so it is set here BEFORE the dynamic import below — a
// static import would evaluate the module first and lock in the 2000 default,
// making the ceiling test either impossibly slow or untestable.
import { describe, it, before, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

process.env.COLLAB_MAX_TRACKED_ROOMS = '10';

type RoomsModule = typeof import('../../server/lib/collab-rooms.ts');
let rooms: RoomsModule;
let ROOM_RE: RegExp;

before(async () => {
  rooms = await import('../../server/lib/collab-rooms.ts');
  ({ ROOM_RE } = await import('../../server/collab/yjs-server.ts'));
});

beforeEach(() => {
  rooms.resetCollabRoomsForTesting();
});

describe('collab-rooms — minted ids', () => {
  it('mints ids that satisfy the WebSocket upgrade handler\'s ROOM_RE', () => {
    // If these two ever disagree, every freshly minted room would be
    // unjoinable (parseRoomId returns null for an id failing ROOM_RE) — a
    // total collab outage that no other test would catch.
    for (let i = 0; i < 50; i++) {
      // The ceiling is 10 in this file, so clear between mints — this test is
      // about the SHAPE of a minted id, not about capacity.
      rooms.resetCollabRoomsForTesting();
      const id = rooms.createCollabRoom('s1');
      assert.notEqual(id, null);
      assert.ok(ROOM_RE.test(id as string), `minted id ${id} fails ROOM_RE`);
    }
  });

  it('mints ids with real entropy — 22 base64url chars, never repeating', () => {
    // 16 CSPRNG bytes -> 22 base64url chars. The length assertion is what
    // stops a future "shorter ids are friendlier" change from silently
    // reopening the enumeration hole this module exists to close.
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      rooms.resetCollabRoomsForTesting();
      const id = rooms.createCollabRoom('s1') as string;
      assert.equal(id.length, 22, `expected 22 chars, got ${id.length} (${id})`);
      assert.equal(seen.has(id), false, `duplicate minted id ${id}`);
      seen.add(id);
    }
  });

  it('records the creating session without making it an access check', () => {
    const id = rooms.createCollabRoom('creator-session') as string;
    assert.equal(rooms.collabRoomCreator(id), 'creator-session');
    // Deliberately: a DIFFERENT session can still see the room exists. The id
    // is the capability; sharing it shares access, which is the product
    // behavior the UI states in words.
    assert.equal(rooms.collabRoomExists(id), true);
  });
});

describe('collab-rooms — existence is the whole access check', () => {
  it('an id that was never minted does not exist', () => {
    assert.equal(rooms.collabRoomExists('AAAAAAAAAAAAAAAAAAAAAA'), false);
  });

  it('a guessable room NAME does not exist — the old hole, closed', () => {
    // These are exactly the names the retired design accepted as room ids:
    // writer-typed free text. None of them can be joined now, because none of
    // them was ever minted.
    for (const guess of ['draft', 'script', 'my-movie', 'default', 'room-1']) {
      assert.equal(rooms.collabRoomExists(guess), false, `guessable name "${guess}" resolved`);
    }
  });

  it('a room stops existing once its TTL lapses since the last touch', () => {
    mock.timers.enable({ apis: ['Date'] });
    try {
      const id = rooms.createCollabRoom('s1') as string;
      assert.equal(rooms.collabRoomExists(id), true);

      // Just short of the TTL: still joinable.
      mock.timers.tick(rooms.COLLAB_ROOM_TTL_MS - 1);
      assert.equal(rooms.collabRoomExists(id), true);

      // A join extends it — a live session must not be dropped out from under
      // its collaborators mid-edit.
      rooms.touchCollabRoom(id);
      mock.timers.tick(rooms.COLLAB_ROOM_TTL_MS - 1);
      assert.equal(rooms.collabRoomExists(id), true);

      // Past the TTL with no further touch: gone, and dropped from the map.
      mock.timers.tick(2);
      assert.equal(rooms.collabRoomExists(id), false);
      assert.equal(rooms.collabRegistrySize(), 0);
    } finally {
      mock.timers.reset();
    }
  });

  it('touching an unknown id is a no-op, not a way to create one', () => {
    rooms.touchCollabRoom('AAAAAAAAAAAAAAAAAAAAAA');
    assert.equal(rooms.collabRoomExists('AAAAAAAAAAAAAAAAAAAAAA'), false);
    assert.equal(rooms.collabRegistrySize(), 0);
  });
});

describe('collab-rooms — registry ceiling', () => {
  it('refuses to mint past the ceiling rather than reusing or shortening ids', () => {
    // COLLAB_MAX_TRACKED_ROOMS is 10 for this file (set at the top).
    for (let i = 0; i < 10; i++) {
      assert.notEqual(rooms.createCollabRoom(`s${i}`), null, `mint ${i} should have succeeded`);
    }
    assert.equal(rooms.collabRegistrySize(), 10);
    // Null, not a fallback id: the route turns this into a 503. A "reuse the
    // oldest id" fallback would hand a new writer someone else's live room.
    assert.equal(rooms.createCollabRoom('s-overflow'), null);
  });

  it('expired rooms are pruned to make headroom at the ceiling', () => {
    mock.timers.enable({ apis: ['Date'] });
    try {
      for (let i = 0; i < 10; i++) rooms.createCollabRoom(`s${i}`);
      assert.equal(rooms.createCollabRoom('s-overflow'), null);
      mock.timers.tick(rooms.COLLAB_ROOM_TTL_MS + 1);
      const id = rooms.createCollabRoom('s-later');
      assert.notEqual(id, null);
      assert.equal(rooms.collabRegistrySize(), 1);
    } finally {
      mock.timers.reset();
    }
  });
});

describe('collab-rooms — per-session budgets', () => {
  it('room-creation budget exhausts for one session and not for another', () => {
    for (let i = 0; i < rooms.COLLAB_ROOMS_PER_SESSION_PER_MIN; i++) {
      assert.equal(rooms.spendRoomCreationBudget('noisy'), true, `spend ${i} should be affordable`);
    }
    assert.equal(rooms.spendRoomCreationBudget('noisy'), false);
    // The whole point of a PER-SESSION budget: one caller cannot spend
    // everyone else's. (gameLimiter already covers the per-IP dimension.)
    assert.equal(rooms.spendRoomCreationBudget('quiet'), true);
  });

  it('token budget exhausts independently of the room-creation budget', () => {
    for (let i = 0; i < rooms.COLLAB_TOKENS_PER_SESSION_PER_MIN; i++) {
      assert.equal(rooms.spendTokenBudget('s1'), true);
    }
    assert.equal(rooms.spendTokenBudget('s1'), false);
    // Separate counters — burning token mints must not block creating a room.
    assert.equal(rooms.spendRoomCreationBudget('s1'), true);
  });

  it('a budget refills once its one-minute window rolls over', () => {
    mock.timers.enable({ apis: ['Date'] });
    try {
      for (let i = 0; i < rooms.COLLAB_ROOMS_PER_SESSION_PER_MIN; i++) {
        rooms.spendRoomCreationBudget('s1');
      }
      assert.equal(rooms.spendRoomCreationBudget('s1'), false);
      mock.timers.tick(60_001);
      assert.equal(rooms.spendRoomCreationBudget('s1'), true);
    } finally {
      mock.timers.reset();
    }
  });

  it('resetCollabRoomsForTesting clears rooms and budgets together', () => {
    rooms.createCollabRoom('s1');
    for (let i = 0; i < rooms.COLLAB_ROOMS_PER_SESSION_PER_MIN; i++) {
      rooms.spendRoomCreationBudget('s1');
    }
    assert.equal(rooms.spendRoomCreationBudget('s1'), false);
    rooms.resetCollabRoomsForTesting();
    assert.equal(rooms.collabRegistrySize(), 0);
    assert.equal(rooms.spendRoomCreationBudget('s1'), true);
  });
});
