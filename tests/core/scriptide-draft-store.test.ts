import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TITLE_PAGE,
  SCRIPTIDE_DRAFT_KEY,
  applyServerScriptIDEDraft,
  decideScriptIDELocalRestore,
  decideScriptIDERestore,
  importScriptText,
  loadScriptIDEDraft,
  readScriptIDEDraft,
  scriptIDEDraftStatesEqual,
  updateScriptIDEDraft,
  writeScriptIDEDraft,
  type ScriptIDEDraftEnvelope,
} from '../../src/lib/scriptide-draft-store.ts';

function memoryStorage(seed: Record<string, string> = {}) {
  const values = new Map(Object.entries(seed));
  return {
    read: (key: string) => values.get(key) ?? null,
    write: (key: string, value: string) => {
      values.set(key, value);
      return true;
    },
    values,
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

const server = {
  scriptText: 'SERVER DRAFT',
  snapshots: [],
  characters: [],
  researchNotes: [],
  isDarkMode: false,
  titlePage: null,
  updatedAt: 200,
};

describe('scriptide draft store', () => {
  it('roundtrips a valid versioned envelope (including titlePage) and mirrors theme', () => {
    const storage = memoryStorage();
    assert.equal(writeScriptIDEDraft(storage.write, envelope), true);
    assert.deepEqual(readScriptIDEDraft(storage.read), envelope);
    assert.deepEqual(readScriptIDEDraft(storage.read)?.titlePage, {
      title: 'THE LEDGER',
      author: 'J. Author',
      contact: 'j@example.com',
    });
    assert.equal(storage.values.get('theme'), 'dark');
    assert.equal(storage.values.size, 2);
  });

  it('rejects malformed and unknown-version envelopes', () => {
    const malformed = memoryStorage({ [SCRIPTIDE_DRAFT_KEY]: '{bad' });
    assert.equal(readScriptIDEDraft(malformed.read), null);

    // A version newer than anything this build understands (NOT the
    // pre-titlePage v1 shape below, which is a recognized migration case,
    // not a rejection case) must still be refused rather than trusted as-is.
    const future = memoryStorage({
      [SCRIPTIDE_DRAFT_KEY]: JSON.stringify({ ...envelope, schemaVersion: 3 }),
    });
    assert.equal(readScriptIDEDraft(future.read), null);
  });

  // ── Pre-change draft migration (schemaVersion 1, no titlePage) ───────────
  // Every draft saved before titlePage was added to the envelope has this
  // exact shape: valid content fields, schemaVersion 1, no titlePage key at
  // all. Reading it must upgrade it in place — never crash, and never fall
  // through to the flat pre-envelope legacy keys (which would silently
  // discard real scriptText/snapshots/characters/researchNotes).
  describe('migrates a pre-titlePage (schemaVersion 1) envelope on read', () => {
    const legacyV1Envelope = {
      schemaVersion: 1,
      scriptText: 'INT. OLD DRAFT - DAY\n\nSaved before titlePage existed.',
      snapshots: [{ id: 'snap-1', name: 'v1', text: 'x', date: '2026-01-01' }],
      characters: [{ id: 'char-1', name: 'ADA' }],
      researchNotes: [{ id: 'note-1', title: 'Theme', content: 'Betrayal' }],
      isDarkMode: true,
      contentUpdatedAt: 555,
      serverRevision: 42,
      dirty: true,
    };

    it('upgrades schemaVersion and backfills the default title page', () => {
      const storage = memoryStorage({ [SCRIPTIDE_DRAFT_KEY]: JSON.stringify(legacyV1Envelope) });
      const upgraded = readScriptIDEDraft(storage.read);
      assert.ok(upgraded, 'expected a v1 envelope to be recognized and upgraded, not rejected');
      assert.equal(upgraded!.schemaVersion, 2);
      assert.deepEqual(upgraded!.titlePage, DEFAULT_TITLE_PAGE);
    });

    it('does not crash and does not clobber any pre-existing content field', () => {
      const storage = memoryStorage({ [SCRIPTIDE_DRAFT_KEY]: JSON.stringify(legacyV1Envelope) });
      assert.doesNotThrow(() => readScriptIDEDraft(storage.read));
      const upgraded = readScriptIDEDraft(storage.read)!;
      assert.equal(upgraded.scriptText, legacyV1Envelope.scriptText);
      assert.deepEqual(upgraded.snapshots, legacyV1Envelope.snapshots);
      assert.deepEqual(upgraded.characters, legacyV1Envelope.characters);
      assert.deepEqual(upgraded.researchNotes, legacyV1Envelope.researchNotes);
      assert.equal(upgraded.isDarkMode, legacyV1Envelope.isDarkMode);
      assert.equal(upgraded.contentUpdatedAt, legacyV1Envelope.contentUpdatedAt);
      assert.equal(upgraded.serverRevision, legacyV1Envelope.serverRevision);
      assert.equal(upgraded.dirty, legacyV1Envelope.dirty);
    });

    it('loadScriptIDEDraft also returns the upgraded envelope (not the flat-key fallback)', () => {
      // Seed BOTH the v1 envelope AND stale flat legacy keys, to prove the v1
      // envelope wins — falling through to migrateLegacyScriptIDEDraft here
      // would silently replace real saved content with whatever (possibly
      // empty/stale) flat keys happen to exist.
      const storage = memoryStorage({
        [SCRIPTIDE_DRAFT_KEY]: JSON.stringify(legacyV1Envelope),
        script_draft: 'STALE FLAT-KEY DRAFT — SHOULD NEVER WIN',
      });
      const loaded = loadScriptIDEDraft(storage.read);
      assert.equal(loaded.scriptText, legacyV1Envelope.scriptText);
      assert.equal(loaded.schemaVersion, 2);
      assert.deepEqual(loaded.titlePage, DEFAULT_TITLE_PAGE);
    });

    it('a migrated draft round-trips cleanly through a subsequent write', () => {
      const storage = memoryStorage({ [SCRIPTIDE_DRAFT_KEY]: JSON.stringify(legacyV1Envelope) });
      const upgraded = readScriptIDEDraft(storage.read)!;
      assert.equal(writeScriptIDEDraft(storage.write, upgraded), true);
      assert.deepEqual(readScriptIDEDraft(storage.read), upgraded);
    });
  });

  it('migrates every legacy (pre-envelope, flat-key) draft field, including a default title page', () => {
    const storage = memoryStorage({
      script_draft: 'LOCAL',
      script_snapshots: JSON.stringify([{ id: 's1' }]),
      script_characters: JSON.stringify([{ id: 'c1' }]),
      research_notes: JSON.stringify([{ id: 'r1' }]),
      theme: 'dark',
      script_draft_updated_at: '456',
    });
    assert.deepEqual(loadScriptIDEDraft(storage.read), {
      schemaVersion: 2,
      scriptText: 'LOCAL',
      snapshots: [{ id: 's1' }],
      characters: [{ id: 'c1' }],
      researchNotes: [{ id: 'r1' }],
      isDarkMode: true,
      titlePage: DEFAULT_TITLE_PAGE,
      contentUpdatedAt: 456,
      serverRevision: null,
      dirty: true,
    });
  });

  it('returns false and skips the legacy mirror when the authoritative write returns false', () => {
    const writes: string[] = [];
    const result = writeScriptIDEDraft((key) => {
      writes.push(key);
      return false;
    }, envelope);

    assert.equal(result, false);
    assert.deepEqual(writes, [SCRIPTIDE_DRAFT_KEY]);
  });

  it('returns false and skips the legacy mirror when the authoritative write throws', () => {
    const writes: string[] = [];
    const result = writeScriptIDEDraft((key) => {
      writes.push(key);
      throw new Error('draft store unavailable');
    }, envelope);

    assert.equal(result, false);
    assert.deepEqual(writes, [SCRIPTIDE_DRAFT_KEY]);
  });

  it('returns false without invoking storage when draft serialization fails', () => {
    const writes: string[] = [];
    const unserializable = {
      ...envelope,
      snapshots: [1n],
    };
    const result = writeScriptIDEDraft((key) => {
      writes.push(key);
      return true;
    }, unserializable);

    assert.equal(result, false);
    assert.deepEqual(writes, []);
  });

  it('reports success when the authoritative envelope is stored but the legacy theme mirror returns false', () => {
    const writes: string[] = [];
    const result = writeScriptIDEDraft((key) => {
      writes.push(key);
      return key === SCRIPTIDE_DRAFT_KEY;
    }, envelope);

    assert.equal(result, true);
    assert.deepEqual(writes, [SCRIPTIDE_DRAFT_KEY, 'theme']);
  });

  it('reports success when the authoritative envelope is stored but the legacy theme mirror throws', () => {
    const writes: string[] = [];
    const result = writeScriptIDEDraft((key) => {
      writes.push(key);
      if (key === 'theme') {
        throw new Error('legacy mirror unavailable');
      }
      return true;
    }, envelope);

    assert.equal(result, true);
    assert.deepEqual(writes, [SCRIPTIDE_DRAFT_KEY, 'theme']);
  });

  it('updates local content (including titlePage) while preserving the server base revision', () => {
    const next = updateScriptIDEDraft(envelope, {
      scriptText: '',
      snapshots: [],
      characters: [],
      researchNotes: [],
      isDarkMode: false,
      titlePage: { title: 'NEW TITLE', author: '', contact: '' },
    }, 999);
    assert.equal(next.serverRevision, 100);
    assert.equal(next.contentUpdatedAt, 999);
    assert.equal(next.dirty, true);
    assert.equal(next.scriptText, '');
    assert.deepEqual(next.characters, []);
    assert.deepEqual(next.titlePage, { title: 'NEW TITLE', author: '', contact: '' });
  });

  it('imports script text without discarding metadata, titlePage, or the server base', () => {
    const next = importScriptText(envelope, 'EXT. ROAD - NIGHT', 1000);
    assert.equal(next.scriptText, 'EXT. ROAD - NIGHT');
    assert.deepEqual(next.characters, envelope.characters);
    assert.deepEqual(next.titlePage, envelope.titlePage);
    assert.equal(next.serverRevision, 100);
    assert.equal(next.dirty, true);
  });

  describe('scriptIDEDraftStatesEqual', () => {
    it('detects a titlePage-only change as a real difference', () => {
      // This is what gates the ScriptIDE.tsx local-save effect — if titlePage
      // were excluded here, editing ONLY the title/author/contact fields
      // would never trigger a save, reproducing the original silent-loss bug
      // one layer down.
      const withDifferentTitle = { ...envelope, titlePage: { ...envelope.titlePage, title: 'DIFFERENT' } };
      assert.equal(scriptIDEDraftStatesEqual(envelope, withDifferentTitle), false);
    });

    it('treats two states with identical titlePage content (different object identity) as equal', () => {
      const clone = { ...envelope, titlePage: { ...envelope.titlePage } };
      assert.equal(scriptIDEDraftStatesEqual(envelope, clone), true);
    });
  });
});

describe('decideScriptIDERestore', () => {
  it('returns empty when the server has no draft', () => {
    assert.deepEqual(
      decideScriptIDERestore(envelope, null, { hadVersionedDraft: true }),
      { action: 'empty' },
    );
  });

  it('conflicts when a versioned dirty local draft has a different server base', () => {
    const local = { ...envelope, dirty: true, serverRevision: 100 };
    assert.deepEqual(
      decideScriptIDERestore(local, server, { hadVersionedDraft: true }),
      { action: 'conflict', server, reason: 'diverged' },
    );
  });

  it('uses server when a clean versioned local draft is out of date (forward — server genuinely newer)', () => {
    const local = { ...envelope, dirty: false, serverRevision: 100 };
    assert.deepEqual(
      decideScriptIDERestore(local, server, { hadVersionedDraft: true }),
      { action: 'use-server', server },
    );
  });

  // ── Finding 1: server-side rollback must never silently overwrite a
  // clean, newer local draft (was: `use-server` for ANY serverChanged, with
  // no ordering check — see repro-restore-rollback.mjs and the audit). ──────
  describe('server rollback (server.updatedAt older than local.serverRevision)', () => {
    it('does NOT use-server when the server row is older than the last acknowledged local revision (clean local)', () => {
      const local = { ...envelope, dirty: false, serverRevision: 2000 };
      const rolledBackServer = { ...server, updatedAt: 1000 }; // older than 2000, content differs
      const decision = decideScriptIDERestore(local, rolledBackServer, { hadVersionedDraft: true });
      assert.notEqual(decision.action, 'use-server');
      assert.deepEqual(decision, { action: 'conflict', server: rolledBackServer, reason: 'server-rolled-back' });
    });

    it('does NOT use-server when the server row is older than the last acknowledged local revision (dirty local, content differs)', () => {
      const local = { ...envelope, dirty: true, serverRevision: 2000 };
      const rolledBackServer = { ...server, updatedAt: 1000 };
      const decision = decideScriptIDERestore(local, rolledBackServer, { hadVersionedDraft: true });
      assert.notEqual(decision.action, 'use-server');
      assert.deepEqual(decision, { action: 'conflict', server: rolledBackServer, reason: 'server-rolled-back' });
    });

    it('reconciles silently (not conflict, not use-server) when the rolled-back row happens to match local content exactly', () => {
      const rolledBackMatching = {
        scriptText: envelope.scriptText,
        snapshots: envelope.snapshots,
        characters: envelope.characters,
        researchNotes: envelope.researchNotes,
        isDarkMode: envelope.isDarkMode,
        titlePage: null,
        updatedAt: 1000, // older than local.serverRevision (2000)
      };
      const local = { ...envelope, dirty: false, serverRevision: 2000 };
      assert.deepEqual(
        decideScriptIDERestore(local, rolledBackMatching, { hadVersionedDraft: true }),
        { action: 'reconciled', server: rolledBackMatching },
      );
    });

    it('forward case still uses server unconditionally (server genuinely newer than local.serverRevision)', () => {
      const local = { ...envelope, dirty: false, serverRevision: 100 };
      const newerServer = { ...server, updatedAt: 200 };
      assert.deepEqual(
        decideScriptIDERestore(local, newerServer, { hadVersionedDraft: true }),
        { action: 'use-server', server: newerServer },
      );
    });

    it('equal revisions still no-op to keep-local (unaffected by the ordering check)', () => {
      const local = { ...envelope, dirty: false, serverRevision: 200 };
      assert.deepEqual(
        decideScriptIDERestore(local, server, { hadVersionedDraft: true }),
        { action: 'keep-local', serverRevision: 200 },
      );
    });

    it('a never-synced local draft (serverRevision null) is not treated as a regression, even against an "old" server timestamp', () => {
      const local = { ...envelope, dirty: false, serverRevision: null };
      const oldServer = { ...server, updatedAt: 1 };
      assert.deepEqual(
        decideScriptIDERestore(local, oldServer, { hadVersionedDraft: true }),
        { action: 'use-server', server: oldServer },
      );
    });
  });

  it('keeps a dirty versioned local draft with the same server base', () => {
    const local = { ...envelope, dirty: true, serverRevision: 200, scriptText: 'LOCAL EDIT' };
    assert.deepEqual(
      decideScriptIDERestore(local, server, { hadVersionedDraft: true }),
      { action: 'keep-local', serverRevision: 200 },
    );
  });

  it('conflicts a dirty versioned draft that never acquired a server base', () => {
    const local = { ...envelope, dirty: true, serverRevision: null };
    assert.deepEqual(
      decideScriptIDERestore(local, server, { hadVersionedDraft: true }),
      { action: 'conflict', server, reason: 'diverged' },
    );
  });

  // ── W3: false "Save Conflict" on a same-session reload ──────────────────
  // Repro: paste → autosave fires a keepalive POST to /api/scriptide/save as
  // the tab is torn down by reload → the server persists it (that's what
  // keepalive is for) but the response's `.then()` never runs in the old
  // page, so localStorage still says dirty/no-server-revision. The reload
  // then fetches back EXACTLY what it just saved. There was never a second
  // writer — the content on both sides is identical — so this must reconcile
  // silently, never show the conflict banner.
  describe('W3 — reconciles a lost-ack save instead of a false conflict', () => {
    it('reconciles when a dirty local draft with no server base matches the server byte-for-byte', () => {
      const matchingServer = {
        scriptText: envelope.scriptText,
        snapshots: envelope.snapshots,
        characters: envelope.characters,
        researchNotes: envelope.researchNotes,
        isDarkMode: envelope.isDarkMode,
        titlePage: null,
        updatedAt: 999,
      };
      const local = { ...envelope, dirty: true, serverRevision: null };
      assert.deepEqual(
        decideScriptIDERestore(local, matchingServer, { hadVersionedDraft: true }),
        { action: 'reconciled', server: matchingServer },
      );
    });

    it('reconciles when a dirty local draft has an older server base but identical content', () => {
      const matchingServer = {
        scriptText: envelope.scriptText,
        snapshots: envelope.snapshots,
        characters: envelope.characters,
        researchNotes: envelope.researchNotes,
        isDarkMode: envelope.isDarkMode,
        titlePage: null,
        updatedAt: 555, // != local.serverRevision (100), simulating the lost ack
      };
      const local = { ...envelope, dirty: true, serverRevision: 100 };
      assert.deepEqual(
        decideScriptIDERestore(local, matchingServer, { hadVersionedDraft: true }),
        { action: 'reconciled', server: matchingServer },
      );
    });

    it('still conflicts when content genuinely differs, even with no server base (real two-writer case)', () => {
      // Same shape as the reconciliation tests above, but the server's
      // scriptText is NOT what local has — a genuine second writer, or a
      // save that never actually reached the server. Must still show the
      // conflict UI.
      const local = { ...envelope, dirty: true, serverRevision: null };
      assert.deepEqual(
        decideScriptIDERestore(local, server, { hadVersionedDraft: true }),
        { action: 'conflict', server, reason: 'diverged' },
      );
    });

    it('still conflicts on a snapshots/characters/researchNotes/isDarkMode mismatch, not just scriptText', () => {
      const local = { ...envelope, dirty: true, serverRevision: 100 };
      const almostMatching = {
        scriptText: envelope.scriptText,
        snapshots: envelope.snapshots,
        characters: envelope.characters,
        researchNotes: envelope.researchNotes,
        isDarkMode: !envelope.isDarkMode, // the one field that differs
        titlePage: null,
        updatedAt: 200,
      };
      assert.deepEqual(
        decideScriptIDERestore(local, almostMatching, { hadVersionedDraft: true }),
        { action: 'conflict', server: almostMatching, reason: 'diverged' },
      );
    });
  });

  it('uses the legacy source once for multi-key migration', () => {
    const local = { ...envelope, dirty: true, serverRevision: null };
    assert.deepEqual(
      decideScriptIDERestore(local, server, {
        hadVersionedDraft: false,
        legacySource: 'server',
      }),
      { action: 'use-server', server },
    );
    assert.deepEqual(
      decideScriptIDERestore(local, server, {
        hadVersionedDraft: false,
        legacySource: 'local',
      }),
      { action: 'keep-local', serverRevision: 200 },
    );
  });

  it('applies a clean server envelope with empty arrays intact, preserving the supplied titlePage', () => {
    const currentTitlePage = { title: 'KEPT LOCALLY', author: 'Me', contact: 'me@example.com' };
    const applied = applyServerScriptIDEDraft(server, currentTitlePage);
    assert.equal(applied.dirty, false);
    assert.equal(applied.serverRevision, 200);
    assert.deepEqual(applied.characters, []);
    assert.equal(applied.isDarkMode, false);
    // The server has no titlePage of its own — "server wins" for content
    // must never be read as "reset the title page too."
    assert.deepEqual(applied.titlePage, currentTitlePage);
  });

  it('applies a clean server envelope even when the caller has no local titlePage yet (falls back to defaults)', () => {
    const applied = applyServerScriptIDEDraft(server, DEFAULT_TITLE_PAGE);
    assert.deepEqual(applied.titlePage, DEFAULT_TITLE_PAGE);
  });

  // Retrospective finding #12: ScriptIDE_State grew a title_page_json column,
  // so a server snapshot CAN now carry a real titlePage (not just null for
  // pre-migration rows). Once it does, it wins like every other field — the
  // fallback above exists only for the null case, not as a permanent
  // "server never has an opinion on this" rule.
  it('prefers the server\'s own titlePage over the caller-supplied fallback once the server has one', () => {
    const serverWithTitlePage = { ...server, titlePage: { title: 'FROM SERVER', author: 'Server Author', contact: '' } };
    const applied = applyServerScriptIDEDraft(serverWithTitlePage, { title: 'STALE LOCAL', author: '', contact: '' });
    assert.deepEqual(applied.titlePage, { title: 'FROM SERVER', author: 'Server Author', contact: '' });
  });
});

// ── E4: decideScriptIDELocalRestore (localStorage vs. IndexedDB mirror) ────
// IndexedDB exists purely as capacity backup for drafts that outgrow
// localStorage's ~5MB quota — it must only ever win the reconciliation when
// it demonstrably holds content localStorage's own last successful write
// does not (see the function's own doc comment in scriptide-draft-store.ts).
describe('decideScriptIDELocalRestore', () => {
  it('keeps local when there is no IndexedDB copy at all', () => {
    assert.deepEqual(decideScriptIDELocalRestore(envelope, null), { action: 'keep-local' });
  });

  it('keeps local when the IndexedDB copy is identical content (even a different object)', () => {
    const idbClone: ScriptIDEDraftEnvelope = { ...envelope, snapshots: [{ id: 's1' }] };
    assert.deepEqual(decideScriptIDELocalRestore(envelope, idbClone), { action: 'keep-local' });
  });

  it('keeps local when IndexedDB differs but is NOT strictly newer (equal contentUpdatedAt)', () => {
    const idb: ScriptIDEDraftEnvelope = { ...envelope, scriptText: 'IDB DIFFERS BUT SAME TIMESTAMP' };
    assert.deepEqual(decideScriptIDELocalRestore(envelope, idb), { action: 'keep-local' });
  });

  it('keeps local when IndexedDB differs but is OLDER than local', () => {
    const idb: ScriptIDEDraftEnvelope = {
      ...envelope,
      scriptText: 'STALE IDB COPY',
      contentUpdatedAt: envelope.contentUpdatedAt - 1,
    };
    assert.deepEqual(decideScriptIDELocalRestore(envelope, idb), { action: 'keep-local' });
  });

  it('uses IndexedDB when it is strictly newer than local — the quota-failure recovery case', () => {
    const idb: ScriptIDEDraftEnvelope = {
      ...envelope,
      scriptText: 'THE REAL DRAFT — LOCALSTORAGE.SETITEM SILENTLY FAILED ON THIS ONE',
      contentUpdatedAt: envelope.contentUpdatedAt + 1,
    };
    assert.deepEqual(decideScriptIDELocalRestore(envelope, idb), { action: 'use-indexeddb', envelope: idb });
  });

  it('uses IndexedDB when only titlePage differs and IndexedDB is newer', () => {
    const idb: ScriptIDEDraftEnvelope = {
      ...envelope,
      titlePage: { ...envelope.titlePage, title: 'NEWER TITLE FROM IDB' },
      contentUpdatedAt: envelope.contentUpdatedAt + 1,
    };
    assert.deepEqual(decideScriptIDELocalRestore(envelope, idb), { action: 'use-indexeddb', envelope: idb });
  });

  // writer #9 (upgrade-writer-experience discovery) — "score over revisions".
  // This store treats `snapshots` as `unknown[]` (line 27 above): it never
  // interprets snapshot shape, only round-trips whatever ScriptIDE.tsx hands
  // it. So the only thing worth proving here is that the NEW optional
  // health/verdict/sceneCount/analyzedAt fields survive the same
  // localStorage JSON round trip a bare {id,name,text,date} snapshot already
  // does — nothing in this module needs to change for that to hold, but a
  // regression that started dropping unknown object keys somewhere in the
  // read/write path would be a real, silent data-loss bug for this feature.
  describe('score-over-revisions fields (writer #9) round-trip through localStorage', () => {
    it('a snapshot with health/verdict/sceneCount/analyzedAt survives a write + read round trip byte-exact', () => {
      const scoredSnapshot = {
        id: 'snap-scored',
        name: 'v2',
        text: 'INT. SCORED DRAFT - DAY',
        date: '2026-09-03T00:00:00.000Z',
        health: 72.5,
        verdict: 'CONSIDER',
        sceneCount: 6,
        analyzedAt: 1_787_279_939_609,
      };
      const withScoredSnapshot: ScriptIDEDraftEnvelope = {
        ...envelope,
        snapshots: [scoredSnapshot],
      };
      const storage = memoryStorage();
      assert.equal(writeScriptIDEDraft(storage.write, withScoredSnapshot), true);
      assert.deepEqual(readScriptIDEDraft(storage.read)?.snapshots, [scoredSnapshot]);
    });

    it('an old snapshot with no score fields at all still round-trips (older data keeps loading)', () => {
      const legacySnapshot = { id: 'snap-legacy', name: 'v1', text: 'INT. OLD DRAFT - DAY', date: '2026-01-01' };
      const withLegacySnapshot: ScriptIDEDraftEnvelope = {
        ...envelope,
        snapshots: [legacySnapshot],
      };
      const storage = memoryStorage();
      assert.equal(writeScriptIDEDraft(storage.write, withLegacySnapshot), true);
      assert.deepEqual(readScriptIDEDraft(storage.read)?.snapshots, [legacySnapshot]);
    });

    it('a mix of scored and unscored snapshots in one envelope round-trips both shapes intact', () => {
      const mixed = [
        { id: 'new', name: 'v2', text: 'NEW', date: 'd2', health: 40.1, verdict: 'PASS', sceneCount: 90, analyzedAt: 5 },
        { id: 'old', name: 'v1', text: 'OLD', date: 'd1' },
      ];
      const withMixed: ScriptIDEDraftEnvelope = { ...envelope, snapshots: mixed };
      const storage = memoryStorage();
      assert.equal(writeScriptIDEDraft(storage.write, withMixed), true);
      assert.deepEqual(readScriptIDEDraft(storage.read)?.snapshots, mixed);
    });
  });
});
