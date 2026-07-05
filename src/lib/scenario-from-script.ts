// Simulate this script — the missing bridge from writing to simulating.
//
// Pure mapping from a Fountain draft + the writer's Codex characters to the
// exact /api/init payload shape StoryMachine.tsx's submitScenario() already
// sends (see src/components/StoryMachine.tsx:~290 and
// src/components/storymachine/ScenarioBuilder.tsx). This is the reverse of
// the existing simulation→editor export (onExportToIDE / importedScript /
// importedCharacters in ScriptIDE.tsx) — that direction turns OASIS output
// into Fountain + character sheets; this direction turns Fountain + character
// sheets into an OASIS scenario.
//
// Field mapping (writer's model → OASIS CharacterSheet):
//   name  → name
//   lie   → public_mask       ("the front they maintain" — what other agents perceive)
//   want  → hidden_motive     (the secret goal driving every action)
//   ghost → knowledge_vector  (their haunted backstory, seeded as a known fact)
//   need  → goalStack.terminal (the internal truth reframed as the terminal goal
//                               the OASIS planner works toward; omitted when blank)
//
// Locations come from unique Fountain sluglines (INT./EXT. stripped, time-of-day
// stripped) in order of first appearance, deduped, capped at MAX_LOCATIONS.
// adjacent_locations is the screenplay's own traversal graph: two locations are
// linked whenever the script actually cuts from one to the other in consecutive
// scenes — not a fully-connected graph. This means RELOCATE only ever offers an
// agent paths the screenplay itself already established were reachable, rather
// than inventing connectivity the writer never implied.
//
// All numeric/length caps below mirror server/lib/validation.ts's InitBodySchema
// (LocationItemSchema / AgentItemSchema) so a built payload can never trip that
// schema's hard `.max()` validation and 400 the request outright.

import type { CharacterSheet, Location } from '../../server/engine/types.ts';
import { parseFountain } from './fountain.ts';
import type { ScriptCharacter } from '../components/scriptide/CharacterManager.tsx';

export interface ScenarioPayload {
  nodes: Location[];
  agents: CharacterSheet[];
}

export interface ScenarioBuildResult {
  payload: ScenarioPayload;
  warnings: string[];
}

// ── Caps — mirror server/lib/validation.ts exactly, so a built payload never
// trips the server's zod schema and gets rejected wholesale. ────────────────
const MAX_LOCATIONS = 12; // "sane count" per the brief; well under the server's nodes.max(50)
const MAX_ADJACENT = 10;  // LocationItemSchema: adjacent_locations.max(10)
const MAX_AGENTS = 50;    // InitBodySchema: agents.max(50)
const MAX_TEXT = 2000;    // AgentItemSchema: public_mask / hidden_motive .max(2000)
const MAX_FACT = 500;     // AgentItemSchema: each knowledge_vector entry truncated to 500 chars
const MAX_NAME = 256;     // AgentItemSchema/LocationItemSchema: name.max(256)
const MAX_ID = 64;        // char_id / location_id .max(64)
const MAX_GOAL_DESC = 500; // consistent with other narrative-field caps (OutlineBeatSchema)

const DEFAULT_LOCATION: Location = {
  location_id: 'default_location',
  name: 'Unspecified Location',
  description: 'No scene headings were found in the script — every character starts here.',
  adjacent_locations: [],
};

// ── String helpers ───────────────────────────────────────────────────────────

/** Lowercase, underscore-joined, ASCII-safe id — collision-resistant via uniqueSlug(). */
function slugify(text: string, fallback = 'x'): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return (slug || fallback).slice(0, MAX_ID);
}

/** Appends a numeric suffix until the candidate id is unique within `used`. */
function uniqueSlug(base: string, used: Set<string>): string {
  const safeBase = (base || 'x').slice(0, MAX_ID);
  let candidate = safeBase;
  let n = 2;
  while (used.has(candidate)) {
    candidate = `${safeBase}_${n}`.slice(0, MAX_ID);
    n++;
  }
  used.add(candidate);
  return candidate;
}

function titleCase(text: string): string {
  return text.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Strips a scene heading down to its location phrase: drops the forced-heading
 * leading dot or INT./EXT./EST./I-E prefix, then drops a trailing
 * " - TIME OF DAY" suffix (standard Fountain slugline shape is
 * "INT./EXT. LOCATION - TIME"), leaving just the location name.
 */
function extractLocationName(headingText: string): string {
  let s = headingText.trim();
  if (s.startsWith('.')) s = s.slice(1); // forced scene heading, no INT/EXT prefix
  s = s.replace(/^(INT\.?\/EXT\.?|EXT\.?\/INT\.?|I\/E\.?|INT\.?|EXT\.?|EST\.?)\s*/i, '');
  const dashIdx = s.indexOf(' - ');
  if (dashIdx !== -1) s = s.slice(0, dashIdx);
  s = s.trim().toUpperCase();
  return s || 'UNKNOWN LOCATION';
}

/** Strips a dual-dialogue `^` marker and a trailing cue extension like (V.O.)/(CONT'D). */
function cleanCharacterCue(raw: string): string {
  let s = raw.trim();
  s = s.replace(/\^\s*$/, '');
  s = s.replace(/\(.*?\)\s*$/, '');
  return s.trim();
}

// ── Main mapping ─────────────────────────────────────────────────────────────

export function buildScenarioFromScript(
  scriptText: string,
  characters: ScriptCharacter[],
): ScenarioBuildResult {
  const warnings: string[] = [];
  const blocks = parseFountain(scriptText ?? '');

  // ── Single pass: track the current location and each character's first
  // speaking location as we walk the script in order. ──
  let currentLocationKey: string | null = null;
  const sceneSequence: string[] = []; // one entry per scene heading, script order (not deduped)
  const firstSpeakLocationKey = new Map<string, string>(); // normalized cue -> location key
  const speakingOrder: string[] = []; // normalized cue, first-seen order
  const speakingDisplay = new Map<string, string>(); // normalized cue -> display name

  for (const block of blocks) {
    if (block.type === 'scene_heading') {
      currentLocationKey = extractLocationName(block.text);
      sceneSequence.push(currentLocationKey);
    } else if (block.type === 'character' || block.type === 'dual_dialogue') {
      const cleaned = cleanCharacterCue(block.text);
      if (!cleaned) continue;
      const key = cleaned.toUpperCase();
      if (!speakingDisplay.has(key)) {
        speakingDisplay.set(key, titleCase(cleaned));
        speakingOrder.push(key);
      }
      if (currentLocationKey !== null && !firstSpeakLocationKey.has(key)) {
        firstSpeakLocationKey.set(key, currentLocationKey);
      }
    }
  }

  // ── Locations: unique sluglines, in order of first appearance ──
  const seenLocations: string[] = [];
  const seenLocationSet = new Set<string>();
  for (const key of sceneSequence) {
    if (!seenLocationSet.has(key)) {
      seenLocationSet.add(key);
      seenLocations.push(key);
    }
  }

  let nodes: Location[];
  const locationIdByKey = new Map<string, string>();

  if (seenLocations.length === 0) {
    nodes = [DEFAULT_LOCATION];
  } else {
    let keptLocations = seenLocations;
    if (seenLocations.length > MAX_LOCATIONS) {
      keptLocations = seenLocations.slice(0, MAX_LOCATIONS);
      warnings.push(
        `Script has ${seenLocations.length} distinct locations; only the first ${MAX_LOCATIONS} ` +
        `(in order of first appearance) were seeded. Scene links to dropped locations were removed.`
      );
    }
    const keptSet = new Set(keptLocations);
    const usedIds = new Set<string>();
    nodes = keptLocations.map((key) => {
      const id = uniqueSlug(slugify(key, 'location'), usedIds);
      locationIdByKey.set(key, id);
      return {
        location_id: id,
        name: titleCase(key).slice(0, MAX_NAME),
        description: '',
        adjacent_locations: [],
      };
    });

    // Adjacency = the story's own traversal graph (see file header comment):
    // link A<->B whenever consecutive scenes cut between two different kept
    // locations. Built from the FULL scene sequence (not just kept locations)
    // so truncation only drops nodes, never mis-attributes an edge.
    const neighborSets = new Map<string, Set<string>>();
    keptLocations.forEach((key) => neighborSets.set(key, new Set()));
    for (let i = 0; i < sceneSequence.length - 1; i++) {
      const a = sceneSequence[i];
      const b = sceneSequence[i + 1];
      if (a === b) continue;
      if (!keptSet.has(a) || !keptSet.has(b)) continue;
      neighborSets.get(a)!.add(b);
      neighborSets.get(b)!.add(a);
    }

    let adjacencyTruncated = false;
    nodes = nodes.map((node, i) => {
      const key = keptLocations[i];
      const neighborKeys = Array.from(neighborSets.get(key) ?? []);
      if (neighborKeys.length > MAX_ADJACENT) adjacencyTruncated = true;
      return {
        ...node,
        adjacent_locations: neighborKeys.slice(0, MAX_ADJACENT).map((k) => locationIdByKey.get(k)!),
      };
    });
    if (adjacencyTruncated) {
      warnings.push(
        `Some locations connect to more than ${MAX_ADJACENT} others; extra links were dropped ` +
        `(the server caps adjacent_locations at ${MAX_ADJACENT}).`
      );
    }
  }

  const resolveLocationId = (key: string | undefined): string => {
    if (seenLocations.length === 0) return DEFAULT_LOCATION.location_id;
    if (key && locationIdByKey.has(key)) return locationIdByKey.get(key)!;
    // "Fall back to first location" — covers non-speaking characters and
    // characters whose only scene got dropped by the MAX_LOCATIONS cap.
    return nodes[0].location_id;
  };

  // ── Agents: managed Codex characters first, then unmanaged speaking
  // characters discovered straight from the script's own character cues. ──
  const usedCharIds = new Set<string>();
  const managedNames = new Set<string>();
  const agents: CharacterSheet[] = [];

  for (const char of characters) {
    const name = char.name.trim();
    if (!name) continue; // a blank Codex row has nothing to seed
    const key = name.toUpperCase();
    if (managedNames.has(key)) continue; // dedupe duplicate rows in the manager
    managedNames.add(key);

    const charId = uniqueSlug(slugify(name, 'character'), usedCharIds);
    const ghost = char.ghost.trim();
    const need = char.need.trim();

    agents.push({
      char_id: charId,
      name: name.slice(0, MAX_NAME),
      public_mask: char.lie.trim().slice(0, MAX_TEXT),
      hidden_motive: char.want.trim().slice(0, MAX_TEXT),
      knowledge_vector: ghost ? [ghost.slice(0, MAX_FACT)] : [],
      suspicion_score: 0,
      current_location_id: resolveLocationId(firstSpeakLocationKey.get(key)),
      is_alive: true,
      ...(need
        ? {
            goalStack: {
              terminal: {
                id: `${charId}_terminal`,
                description: need.slice(0, MAX_GOAL_DESC),
                value: 100,
                achieved: false,
              },
              instrumental: [],
              last_planned_at: 0,
            },
          }
        : {}),
    });
  }

  for (const key of speakingOrder) {
    if (managedNames.has(key)) continue; // already seeded from the Codex
    const display = speakingDisplay.get(key)!;
    const charId = uniqueSlug(slugify(display, 'character'), usedCharIds);
    agents.push({
      char_id: charId,
      name: display.slice(0, MAX_NAME),
      public_mask: '',
      hidden_motive: '',
      knowledge_vector: [],
      suspicion_score: 0,
      current_location_id: resolveLocationId(firstSpeakLocationKey.get(key)),
      is_alive: true,
    });
  }

  if (agents.length === 0) {
    warnings.push('No characters found — add characters in the Codex or give someone dialogue before simulating.');
  }

  let finalAgents = agents;
  if (agents.length > MAX_AGENTS) {
    finalAgents = agents.slice(0, MAX_AGENTS);
    warnings.push(`Script + Codex list ${agents.length} characters; only the first ${MAX_AGENTS} were seeded (server cap).`);
  }

  return {
    payload: { nodes, agents: finalAgents },
    warnings,
  };
}
