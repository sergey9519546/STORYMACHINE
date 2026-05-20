// Mechanism schema loader (CLEVER_MOVES §5) — mechanisms are *.mech.json data
// files, not code. The compiler auto-discovers every file in this directory;
// adding a mechanism is dropping a file, with zero code change.

import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// 10 mechanism kinds (CLEVER_MOVES §23.3). The 3 MVP kinds ship as .mech.json;
// the other 7 are the Phase 2 roadmap.
export type MechanismKind =
  | 'object_burden' | 'legitimacy_split' | 'relationship_externalization'  // Phase 1 (MVP)
  | 'ritual_law' | 'canon_rebellion' | 'false_purpose' | 'clue_cascade'
  | 'ability_psychology' | 'identity_performance' | 'predatory_wish_trap';  // Phase 2

export interface MechanismTransitionRule {
  from: string;
  to: string;
  condition: string;
}

export interface MechanismSchema {
  id: string;
  kind: MechanismKind;
  themeClaimTemplate: string;
  physicalCarrier: { type: string; required: boolean };
  lifecycleStates: string[];
  transitionRules: MechanismTransitionRule[];
  climaxProofPredicate: string;
  endingProofPredicate: string;
  invariants: string[];
}

const MECHANISM_DIR = dirname(fileURLToPath(import.meta.url));

function isMechanismSchema(v: unknown): v is MechanismSchema {
  if (!v || typeof v !== 'object') return false;
  const m = v as Record<string, unknown>;
  return typeof m.id === 'string'
    && typeof m.kind === 'string'
    && typeof m.themeClaimTemplate === 'string'
    && Array.isArray(m.lifecycleStates) && m.lifecycleStates.length > 0
    && Array.isArray(m.transitionRules)
    && Array.isArray(m.invariants)
    && typeof m.climaxProofPredicate === 'string'
    && typeof m.endingProofPredicate === 'string';
}

// Reads and validates every *.mech.json in `dir` (defaults to this directory).
export function loadMechanisms(dir: string = MECHANISM_DIR): Map<string, MechanismSchema> {
  const out = new Map<string, MechanismSchema>();
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.mech.json')) continue;
    const parsed: unknown = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    if (!isMechanismSchema(parsed)) {
      throw new Error(`Invalid mechanism schema: ${file}`);
    }
    out.set(parsed.id, parsed);
  }
  return out;
}

let _cache: Map<string, MechanismSchema> | null = null;

// Memoized — mechanism files are static at runtime.
export function loadMechanismsCached(): Map<string, MechanismSchema> {
  if (!_cache) _cache = loadMechanisms();
  return _cache;
}
