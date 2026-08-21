export const SCRIPTIDE_DRAFT_KEY = 'scriptide_draft_v1';
export const SCRIPTIDE_DRAFT_SCHEMA_VERSION = 2;

// Pre-titlePage envelope shape (every draft saved before this change). Still
// RECOGNIZED on read so an existing writer's draft is upgraded in place
// rather than discarded — see readScriptIDEDraft. Never written; every save
// uses SCRIPTIDE_DRAFT_SCHEMA_VERSION (2).
const LEGACY_V1_SCHEMA_VERSION = 1;

export interface TitlePageState {
  title: string;
  author: string;
  contact: string;
}

/** Matches the placeholders ScriptIDE.tsx's Title tab has always shown for an
 *  untouched title page (its input `placeholder` attributes), so a brand-new
 *  draft and a just-migrated pre-titlePage draft render identically. */
export const DEFAULT_TITLE_PAGE: TitlePageState = {
  title: 'UNTITLED SCRIPT',
  author: 'AUTHOR NAME',
  contact: 'CONTACT INFO',
};

export interface ScriptIDEDraftState {
  scriptText: string;
  snapshots: unknown[];
  characters: unknown[];
  researchNotes: unknown[];
  isDarkMode: boolean;
  titlePage: TitlePageState;
}

export interface ScriptIDEDraftEnvelope extends ScriptIDEDraftState {
  schemaVersion: 2;
  contentUpdatedAt: number;
  serverRevision: number | null;
  dirty: boolean;
}

export type StorageReader = (key: string) => string | null;
export type StorageWriter = (key: string, value: string) => boolean;

function parseArray(raw: string | null): unknown[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function finiteTimestamp(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function isTitlePageState(value: unknown): value is TitlePageState {
  if (!value || typeof value !== 'object') return false;
  const t = value as Partial<TitlePageState>;
  return typeof t.title === 'string' && typeof t.author === 'string' && typeof t.contact === 'string';
}

/** Fields shared by BOTH the current envelope and the legacy (pre-titlePage)
 *  v1 envelope — everything except schemaVersion and titlePage themselves. */
function hasEnvelopeBaseFields(draft: Record<string, unknown>): boolean {
  return typeof draft.scriptText === 'string' &&
    Array.isArray(draft.snapshots) &&
    Array.isArray(draft.characters) &&
    Array.isArray(draft.researchNotes) &&
    typeof draft.isDarkMode === 'boolean' &&
    finiteTimestamp(draft.contentUpdatedAt) !== null &&
    (draft.serverRevision === null || finiteTimestamp(draft.serverRevision) !== null) &&
    typeof draft.dirty === 'boolean';
}

export function isScriptIDEDraftEnvelope(value: unknown): value is ScriptIDEDraftEnvelope {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<ScriptIDEDraftEnvelope> & Record<string, unknown>;
  return draft.schemaVersion === SCRIPTIDE_DRAFT_SCHEMA_VERSION &&
    hasEnvelopeBaseFields(draft) &&
    isTitlePageState(draft.titlePage);
}

/**
 * A draft saved before titlePage existed (schemaVersion 1): every other
 * field matches the current envelope shape, just without titlePage. Reading
 * one of these must upgrade it in place (see readScriptIDEDraft) rather than
 * falling through to migrateLegacyScriptIDEDraft's flat pre-envelope keys —
 * that would silently discard real scriptText/snapshots/characters/
 * researchNotes the writer already saved under the versioned envelope,
 * exactly the silent-data-loss failure mode this module exists to prevent.
 */
function isLegacyV1ScriptIDEEnvelope(
  value: unknown,
): value is Omit<ScriptIDEDraftEnvelope, 'schemaVersion' | 'titlePage'> {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Record<string, unknown>;
  return draft.schemaVersion === LEGACY_V1_SCHEMA_VERSION && hasEnvelopeBaseFields(draft);
}

export function readScriptIDEDraft(read: StorageReader): ScriptIDEDraftEnvelope | null {
  const raw = read(SCRIPTIDE_DRAFT_KEY);
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (isScriptIDEDraftEnvelope(value)) return value;
    if (isLegacyV1ScriptIDEEnvelope(value)) {
      // Upgrade in place: every existing field carries over byte-for-byte
      // (scriptText, snapshots, characters, researchNotes, isDarkMode,
      // contentUpdatedAt, serverRevision, dirty); only the new titlePage
      // field is backfilled with the same defaults an untouched Title tab
      // has always shown. Must not crash and must not clobber — this is the
      // migration path for every draft saved before this change.
      return { ...value, schemaVersion: SCRIPTIDE_DRAFT_SCHEMA_VERSION, titlePage: { ...DEFAULT_TITLE_PAGE } };
    }
    return null;
  } catch {
    return null;
  }
}

export function migrateLegacyScriptIDEDraft(read: StorageReader): ScriptIDEDraftEnvelope {
  const scriptText = read('script_draft') ?? '';
  const updatedAt = Number(read('script_draft_updated_at') ?? '0');
  const contentUpdatedAt = Number.isFinite(updatedAt) && updatedAt >= 0 ? updatedAt : 0;
  const hasLegacyContent = scriptText.length > 0 ||
    read('script_snapshots') !== null ||
    read('script_characters') !== null ||
    read('research_notes') !== null;

  return {
    schemaVersion: SCRIPTIDE_DRAFT_SCHEMA_VERSION,
    scriptText,
    snapshots: parseArray(read('script_snapshots')),
    characters: parseArray(read('script_characters')),
    researchNotes: parseArray(read('research_notes')),
    isDarkMode: read('theme') === 'dark',
    // The pre-envelope flat-key era never had a title-page concept at all
    // (ScriptIDE.tsx hardcoded these placeholders unconditionally), so there
    // is nothing to migrate FROM — default placeholders are the correct and
    // only honest value here.
    titlePage: { ...DEFAULT_TITLE_PAGE },
    contentUpdatedAt,
    serverRevision: null,
    dirty: hasLegacyContent,
  };
}

export function loadScriptIDEDraft(read: StorageReader): ScriptIDEDraftEnvelope {
  return readScriptIDEDraft(read) ?? migrateLegacyScriptIDEDraft(read);
}

export function writeScriptIDEDraft(
  write: StorageWriter,
  draft: ScriptIDEDraftEnvelope,
): boolean {
  // Envelope is authoritative. Mirror legacy `theme` so older readers stay aligned
  // without treating theme as a separate revision domain.
  try {
    if (!write(SCRIPTIDE_DRAFT_KEY, JSON.stringify(draft))) return false;
  } catch {
    return false;
  }

  try {
    write('theme', draft.isDarkMode ? 'dark' : 'light');
  } catch {
    // The compatibility mirror is best-effort after the authoritative write succeeds.
  }
  return true;
}

// The server-side ScriptIDE persistence route (server/routes/scriptide.ts)
// only ever reads/writes scriptText, snapshots, characters, researchNotes,
// and isDarkMode — titlePage has no server-side counterpart. A server
// snapshot therefore never carries titlePage; callers that build a full
// envelope FROM a server snapshot (applyServerScriptIDEDraft below) must
// supply the writer's current titlePage separately rather than have it
// reset by whatever the server returns.
export type ScriptIDEServerSnapshot = Omit<ScriptIDEDraftState, 'titlePage'> & { updatedAt: number };

export type ScriptIDERestoreDecision =
  | { action: 'empty' }
  | { action: 'use-server'; server: ScriptIDEServerSnapshot }
  | { action: 'keep-local'; serverRevision: number | null }
  | { action: 'conflict'; server: ScriptIDEServerSnapshot }
  | { action: 'reconciled'; server: ScriptIDEServerSnapshot };

/**
 * W3 root cause: true when a local draft's actual content already matches
 * what the server holds, even though their revision numbers disagree. This
 * is exactly what a same-session reload sees after ScriptIDE.tsx's
 * visibilitychange/unmount save path fires a `keepalive` POST to
 * /api/scriptide/save right as the page is torn down — the request reaches
 * the server and IS persisted (keepalive's whole purpose), but the response's
 * `.then()` (the one place that clears `dirty` and adopts the new
 * serverRevision in localStorage) never gets to run in the old page's JS
 * context. The next load reads a local envelope that still says "dirty,
 * unacknowledged" pointing at a server draft that is, in fact, this exact
 * content. Content equality is what tells that apart from a genuine second
 * writer, whose server draft would carry DIFFERENT content.
 */
function scriptIDEDraftMatchesServer(
  local: ScriptIDEDraftEnvelope,
  server: ScriptIDEServerSnapshot,
): boolean {
  return local.scriptText === server.scriptText &&
    local.isDarkMode === server.isDarkMode &&
    JSON.stringify(local.snapshots) === JSON.stringify(server.snapshots) &&
    JSON.stringify(local.characters) === JSON.stringify(server.characters) &&
    JSON.stringify(local.researchNotes) === JSON.stringify(server.researchNotes);
}

/**
 * Pure restore policy for mount-time local vs server drafts.
 * Versioned envelopes use dirty + serverRevision; legacy one-shot migration
 * still uses timestamp/length via the provided legacySource when needed.
 */
export function decideScriptIDERestore(
  local: ScriptIDEDraftEnvelope,
  server: ScriptIDEServerSnapshot | null,
  opts: {
    hadVersionedDraft: boolean;
    legacySource?: 'local' | 'server' | 'none';
  },
): ScriptIDERestoreDecision {
  if (!server) return { action: 'empty' };

  if (opts.hadVersionedDraft) {
    const serverChanged = local.serverRevision !== server.updatedAt;
    if (local.dirty && serverChanged) {
      // W3: an unacknowledged save whose content already landed on the
      // server is not a conflict — there was never a second writer, just a
      // lost ack (see scriptIDEDraftMatchesServer above). Reconcile the
      // bookkeeping silently instead of accusing a tab that never existed.
      if (scriptIDEDraftMatchesServer(local, server)) {
        return { action: 'reconciled', server };
      }
      return { action: 'conflict', server };
    }
    if (!local.dirty && serverChanged) {
      return { action: 'use-server', server };
    }
    // Same base revision: keep local (dirty or clean). Adopt serverRevision when known.
    return { action: 'keep-local', serverRevision: server.updatedAt };
  }

  // Legacy multi-key drafts: one-shot length/timestamp decision.
  if (opts.legacySource === 'server') {
    return { action: 'use-server', server };
  }
  return { action: 'keep-local', serverRevision: server.updatedAt };
}

/**
 * Builds a full local envelope from a server snapshot. `titlePage` must be
 * supplied by the caller (typically the writer's current local titlePage) —
 * the server has no titlePage of its own to contribute, so "the server draft
 * wins" must never be read as "reset the title page too."
 */
export function applyServerScriptIDEDraft(
  server: ScriptIDEServerSnapshot,
  titlePage: TitlePageState,
): ScriptIDEDraftEnvelope {
  return {
    schemaVersion: SCRIPTIDE_DRAFT_SCHEMA_VERSION,
    scriptText: server.scriptText,
    snapshots: server.snapshots,
    characters: server.characters,
    researchNotes: server.researchNotes,
    isDarkMode: server.isDarkMode,
    titlePage,
    contentUpdatedAt: server.updatedAt,
    serverRevision: server.updatedAt,
    dirty: false,
  };
}

export function scriptIDEDraftStatesEqual(
  left: ScriptIDEDraftState,
  right: ScriptIDEDraftState,
): boolean {
  return left.scriptText === right.scriptText &&
    left.isDarkMode === right.isDarkMode &&
    JSON.stringify(left.snapshots) === JSON.stringify(right.snapshots) &&
    JSON.stringify(left.characters) === JSON.stringify(right.characters) &&
    JSON.stringify(left.researchNotes) === JSON.stringify(right.researchNotes) &&
    JSON.stringify(left.titlePage) === JSON.stringify(right.titlePage);
}

export function updateScriptIDEDraft(
  current: ScriptIDEDraftEnvelope,
  state: ScriptIDEDraftState,
  contentUpdatedAt = Date.now(),
): ScriptIDEDraftEnvelope {
  return {
    ...state,
    schemaVersion: SCRIPTIDE_DRAFT_SCHEMA_VERSION,
    contentUpdatedAt,
    serverRevision: current.serverRevision,
    dirty: true,
  };
}

export function importScriptText(
  current: ScriptIDEDraftEnvelope,
  scriptText: string,
  contentUpdatedAt = Date.now(),
): ScriptIDEDraftEnvelope {
  return updateScriptIDEDraft(current, { ...current, scriptText }, contentUpdatedAt);
}
