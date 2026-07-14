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
  return write(SCRIPTIDE_DRAFT_KEY, JSON.stringify(draft));
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
