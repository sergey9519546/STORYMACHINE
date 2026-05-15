import type { ActionLogEntry, CharacterSheet, Location, BeatTrace } from '../engine/types.ts';

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
        const destination = entry.target_char_id ?? entry.content ?? 'another room';
        lines.push(`${agent?.name ?? agentName} moves toward ${destination}.`);
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
    ghost: `Hidden motive: ${a.hidden_motive}`,
    lie: a.public_mask,
    want: a.hidden_motive,
    need: 'Unknown — to be determined by the writer',
  }));
}
