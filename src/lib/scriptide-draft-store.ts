export const SCRIPTIDE_DRAFT_KEY = 'scriptide_draft_v1';
export const SCRIPTIDE_DRAFT_SCHEMA_VERSION = 1;

export interface ScriptIDEDraftState {
  scriptText: string;
  snapshots: unknown[];
  characters: unknown[];
  researchNotes: unknown[];
  isDarkMode: boolean;
}

export interface ScriptIDEDraftEnvelope extends ScriptIDEDraftState {
  schemaVersion: 1;
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

export function isScriptIDEDraftEnvelope(value: unknown): value is ScriptIDEDraftEnvelope {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<ScriptIDEDraftEnvelope>;
  return draft.schemaVersion === SCRIPTIDE_DRAFT_SCHEMA_VERSION &&
    typeof draft.scriptText === 'string' &&
    Array.isArray(draft.snapshots) &&
    Array.isArray(draft.characters) &&
    Array.isArray(draft.researchNotes) &&
    typeof draft.isDarkMode === 'boolean' &&
    finiteTimestamp(draft.contentUpdatedAt) !== null &&
    (draft.serverRevision === null || finiteTimestamp(draft.serverRevision) !== null) &&
    typeof draft.dirty === 'boolean';
}

export function readScriptIDEDraft(read: StorageReader): ScriptIDEDraftEnvelope | null {
  const raw = read(SCRIPTIDE_DRAFT_KEY);
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return isScriptIDEDraftEnvelope(value) ? value : null;
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
  return write(SCRIPTIDE_DRAFT_KEY, JSON.stringify(draft)) &&
    write('theme', draft.isDarkMode ? 'dark' : 'light');
}

export type ScriptIDEServerSnapshot = ScriptIDEDraftState & { updatedAt: number };

export type ScriptIDERestoreDecision =
  | { action: 'empty' }
  | { action: 'use-server'; server: ScriptIDEServerSnapshot }
  | { action: 'keep-local'; serverRevision: number | null }
  | { action: 'conflict'; server: ScriptIDEServerSnapshot };

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

export function applyServerScriptIDEDraft(
  server: ScriptIDEServerSnapshot,
): ScriptIDEDraftEnvelope {
  return {
    schemaVersion: SCRIPTIDE_DRAFT_SCHEMA_VERSION,
    scriptText: server.scriptText,
    snapshots: server.snapshots,
    characters: server.characters,
    researchNotes: server.researchNotes,
    isDarkMode: server.isDarkMode,
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
    JSON.stringify(left.researchNotes) === JSON.stringify(right.researchNotes);
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
