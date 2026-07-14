// Pure helpers for ScriptIDE local/server draft conflict resolution.
// Prefer newer timestamps; length is only a tie-break when timestamps match.

export type DraftSource = 'local' | 'server' | 'none';

export interface DraftCandidate {
  text: string;
  updatedAt: number | null | undefined;
}

/**
 * Choose which draft wins when both local and server copies exist.
 * - empty loses to non-empty
 * - higher updatedAt wins
 * - equal/missing timestamps → longer text (legacy-compatible tie-break)
 */
export function resolveDraftConflict(
  local: DraftCandidate,
  server: DraftCandidate,
): { source: DraftSource; text: string; updatedAt: number | null } {
  const localText = local.text ?? '';
  const serverText = server.text ?? '';
  const localEmpty = localText.trim().length === 0;
  const serverEmpty = serverText.trim().length === 0;

  if (localEmpty && serverEmpty) {
    return { source: 'none', text: '', updatedAt: null };
  }
  if (localEmpty) {
    return {
      source: 'server',
      text: serverText,
      updatedAt: typeof server.updatedAt === 'number' ? server.updatedAt : null,
    };
  }
  if (serverEmpty) {
    return {
      source: 'local',
      text: localText,
      updatedAt: typeof local.updatedAt === 'number' ? local.updatedAt : null,
    };
  }

  const localTs = typeof local.updatedAt === 'number' ? local.updatedAt : 0;
  const serverTs = typeof server.updatedAt === 'number' ? server.updatedAt : 0;

  if (serverTs > localTs) {
    return { source: 'server', text: serverText, updatedAt: serverTs };
  }
  if (localTs > serverTs) {
    return { source: 'local', text: localText, updatedAt: localTs };
  }

  // Equal timestamps (or both missing → both 0): longer wins as a stable tie-break.
  if (serverText.length > localText.length) {
    return { source: 'server', text: serverText, updatedAt: serverTs || null };
  }
  return { source: 'local', text: localText, updatedAt: localTs || null };
}

export type SaveStatus =
  | 'idle'
  | 'saving-local'
  | 'saved-local'
  | 'saving-server'
  | 'saved-server'
  | 'save-failed'
  | 'save-conflict';

export function saveStatusLabel(status: SaveStatus): string {
  switch (status) {
    case 'idle': return '';
    case 'saving-local': return 'Saving locally…';
    case 'saved-local': return 'Saved locally';
    case 'saving-server': return 'Saving to server…';
    case 'saved-server': return 'Saved to server';
    case 'save-failed': return 'Save failed';
    case 'save-conflict': return 'Save conflict';
  }
}
