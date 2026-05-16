import type { ActionLogEntry, CharacterSheet, Location, BeatTrace } from '../engine/types.ts';

// ── Syuzhet Reconstruction ───────────────────────────────────────────────────
// Reorders the action log from chronological (fabula) to information-reveal
// order (syuzhet):
//   Act I   — opens on the highest-drama beat (revelation / turning_point)
//   Act II  — flashes back to show buried cause (up to and including inciting action)
//   Act III — "hidden middle": what happened between the inciting cause and the climax
// Falls back to simple two-act (climax first, then full flashback) when no
// inciting_action beat is available.
export function syuzhetSort(
  log: ActionLogEntry[],
  beatTraces: BeatTrace[],
): ActionLogEntry[] {
  if (log.length < 4 || beatTraces.length === 0) return log;

  const PRIORITY: Record<string, number> = {
    revelation: 4, turning_point: 3, contradiction_discovered: 2, inciting_action: 1,
  };

  // Pick the highest-drama beat as the opening pivot
  const sortedBeats = beatTraces
    .filter(b => b.beat_type in PRIORITY)
    .sort((a, b) => (PRIORITY[b.beat_type] ?? 0) - (PRIORITY[a.beat_type] ?? 0) || b.turn_index - a.turn_index);

  const mainPivot = sortedBeats.find(b => b.beat_type !== 'inciting_action');
  if (!mainPivot) return log;

  const pivotIdx = log.findIndex(e => e.action_id === mainPivot.trigger_event_id);
  if (pivotIdx <= 0) return log;

  const afterPivot = log.slice(pivotIdx);

  // Find the buried cause (inciting_action must be earlier in the log)
  const inciting = beatTraces.find(b => b.beat_type === 'inciting_action');
  const incitingIdx = inciting
    ? log.findIndex(e => e.action_id === inciting.trigger_event_id)
    : -1;

  if (incitingIdx > 0 && incitingIdx < pivotIdx - 1) {
    const buriedCause   = log.slice(0, incitingIdx + 1);
    const hiddenMiddle  = log.slice(incitingIdx + 1, pivotIdx);
    // Three-act: climax → buried cause → hidden middle
    return [...afterPivot, ...buriedCause, ...hiddenMiddle];
  }

  // Two-act fallback: climax first → full flashback
  return [...afterPivot, ...log.slice(0, pivotIdx)];
}

// Wraps a Fountain draft with FLASHBACK section markers.
// For a two-act sort (one pivot) it inserts one FLASHBACK header.
// For a three-act sort (pivot + inciting act) it inserts two.
export function wrapSyuzhetFountain(fountain: string, wasSorted: boolean): string {
  if (!wasSorted) return fountain;

  const fadeLine = 'FADE OUT.\n\nTHE END';

  // Collect positions of all INT./EXT. scene headings
  const positions: number[] = [];
  let search = 0;
  for (;;) {
    const next = fountain.indexOf('INT. ', search);
    if (next === -1) break;
    positions.push(next);
    search = next + 5;
  }
  if (positions.length < 2) return fountain;

  // Insert FLASHBACK header before the second scene (start of flashback)
  const before2   = fountain.slice(0, positions[1]);
  let   rest      = '\n\nFLASHBACK — EARLIER\n\n' + fountain.slice(positions[1]);

  // If there is a third scene, insert FLASHBACK — CONTINUED before it
  if (positions.length >= 3) {
    const shift   = '\n\nFLASHBACK — EARLIER\n\n'.length;
    const third   = positions[2] + shift;
    rest          = rest.slice(0, third) + '\n\nFLASHBACK — CONTINUED\n\n' + rest.slice(third);
  }

  return (before2 + rest).replace(fadeLine, '\n\nEND FLASHBACK\n\n' + fadeLine);
}

// Converts a Story Machine action log into Fountain screenplay format.
// LIE actions appear as normal dialogue to the script reader (surface text)
// but are annotated with a Fountain note for the production team.

export function transcriptToFountain(
  log: ActionLogEntry[],
  agents: CharacterSheet[],
  locations: Location[],
  metadata?: { title?: string; author?: string },
  beatTraces?: BeatTrace[],
): string {
  if (log.length === 0) return 'Title: Empty Draft\n\n// No actions were recorded.\n';

  const agentMap = new Map(agents.map(a => [a.char_id, a]));
  const locationMap = new Map(locations.map(l => [l.location_id, l]));

  const lines: string[] = [];

  // ── Title page ──
  lines.push(`Title: ${metadata?.title ?? 'Story Machine Draft'}`);
  lines.push(`Credit: Written by`);
  lines.push(`Author: ${metadata?.author ?? 'STORYMACHINE'}`);
  lines.push(`Draft date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`);
  lines.push(`Contact: Generated via OASIS Architecture`);
  lines.push('');

  // Index beat traces by trigger_event_id for O(1) lookup
  const beatByEvent = new Map<string, BeatTrace[]>();
  for (const beat of beatTraces ?? []) {
    const list = beatByEvent.get(beat.trigger_event_id) ?? [];
    list.push(beat);
    beatByEvent.set(beat.trigger_event_id, list);
  }

  let currentLocationId = '';
  let sceneNumber = 1;

  for (const entry of log) {
    const agent = agentMap.get(entry.char_id);
    const agentName = (agent?.name ?? entry.char_id).toUpperCase();
    const location = locationMap.get(entry.location_id);
    const locationName = (location?.name ?? entry.location_id).toUpperCase();

    // ── Scene heading on location change ──
    if (entry.location_id !== currentLocationId) {
      const timing = currentLocationId === '' ? 'DAY' : 'CONTINUOUS';
      lines.push('');
      lines.push(`INT. ${locationName} - ${timing}`);
      lines.push('');

      if (location?.description) {
        // Wrap description to 60 chars for proper action line formatting
        const words = location.description.split(' ');
        const wrapped: string[] = [];
        let current = '';
        for (const word of words) {
          if ((current + ' ' + word).trim().length <= 60) {
            current = (current + ' ' + word).trim();
          } else {
            if (current) wrapped.push(current);
            current = word;
          }
        }
        if (current) wrapped.push(current);
        lines.push(...wrapped);
        lines.push('');
      }

      currentLocationId = entry.location_id;
      sceneNumber++;
    }

    // Emit beat-trace notes immediately before the triggering action
    const beatsForEntry = beatByEvent.get(entry.action_id) ?? [];
    for (const beat of beatsForEntry) {
      lines.push(`[[BEAT (${beat.beat_type}): ${beat.fountain_hint}]]`);
      lines.push('');
    }

    switch (entry.action_type) {
      case 'SPEAK': {
        lines.push(agentName);
        if (entry.target_char_id) {
          const target = agentMap.get(entry.target_char_id);
          if (target) lines.push(`(to ${target.name})`);
        }
        lines.push(entry.content);
        lines.push('');
        break;
      }

      case 'LIE': {
        // Surface text: normal dialogue (the character is speaking)
        // Director's note: flags it as a lie for the production team
        lines.push(agentName);
        lines.push('(carefully)');
        lines.push(entry.content);
        lines.push('');
        // Fountain note — appears in script but not on screen
        lines.push(`[[DIRECTOR: The above is a deliberate lie by ${agent?.name ?? agentName}.]]\n`);
        break;
      }

      case 'EXAMINE': {
        const target = entry.target_char_id
          ? (agentMap.get(entry.target_char_id)?.name ?? entry.target_char_id)
          : 'the room';
        lines.push(`${agent?.name ?? agentName} examines ${target}.`);
        if (entry.content) lines.push(entry.content);
        lines.push('');
        break;
      }

      case 'RELOCATE': {
        // content is recorded as "→ LocationName" by the Orchestrator
        const destination = entry.content.startsWith('→ ')
          ? entry.content.slice(2)
          : entry.target_char_id ?? entry.content ?? 'another room';
        lines.push(`${agent?.name ?? agentName} moves to ${destination}.`);
        lines.push('');
        break;
      }
    }
  }

  lines.push('');
  lines.push('FADE OUT.');
  lines.push('');
  lines.push('THE END');

  return lines.join('\n');
}

// Extracts character names from an action log (useful for auto-populating Script IDE characters)
export function extractCharactersFromLog(
  agents: CharacterSheet[],
): Array<{ name: string; ghost: string; lie: string; want: string; need: string }> {
  return agents.map(a => ({
    name: a.name,
    ghost: '',
    lie: a.public_mask,
    want: a.hidden_motive,
    need: '',
  }));
}
