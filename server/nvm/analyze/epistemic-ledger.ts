// Character-epistemic ledger (ULTRAPLAN Phase 3, minimal deterministic layer).
//
// Pre-Flight §7.2 "character epistemic ledger": what a character could know at a
// given story point. This deterministic layer tracks scene PRESENCE and
// COMMUNICATION PATHS (co-presence) — enough to answer knowledge-legality as an
// open-world support state feeding the surfacing gate (subtype knowledge_path).
// The semantic "which fact" layer stays LLM-gated (deferred); this substrate is
// deterministic, no LLM. Returns UNKNOWN (not a negative) when no path is found —
// absence is not a negative fact.
import type { SupportState } from '../proof/surfacing.ts';

const SLUG = /^\s*(?:INT|EXT|INT\.?\/EXT|I\/E|EST)[.\s]/i;
const TRANS = /^\s*(?:CUT TO:|FADE (?:IN|OUT)|DISSOLVE TO:|SMASH CUT|MATCH CUT|BACK TO)/i;
const CUE = /^\s{0,}([A-Z][A-Z0-9 .'\-]{0,30})\s*(?:\(.*\))?\s*$/;

export interface EpistemicLedger {
  /** scene index → set of present character names (from dialogue cues) */
  presenceByScene: Array<Set<string>>;
  characters: string[];
  scored: boolean;
}

/** Build the presence ledger from ordered Fountain scene texts. Deterministic. */
export function buildEpistemicLedger(sceneTexts: readonly string[]): EpistemicLedger {
  const presenceByScene: Array<Set<string>> = [];
  const all = new Set<string>();
  for (const scene of sceneTexts) {
    const present = new Set<string>();
    for (const raw of scene.split('\n')) {
      const line = raw.trim();
      if (!line || SLUG.test(line) || TRANS.test(line)) continue;
      const m = CUE.exec(line);
      if (m && m[1].split(/\s+/).length <= 4) {
        const name = m[1].trim();
        present.add(name); all.add(name);
      }
    }
    presenceByScene.push(present);
  }
  return { presenceByScene, characters: [...all].sort(), scored: presenceByScene.length >= 2 };
}

/** Could `character` know a fact established at `factScene`, by the time of
 *  `atScene`? Open-world: ENTAILED via direct presence or a co-presence
 *  communication path; else UNKNOWN. CONTRADICTED is reserved for the semantic
 *  layer (a fact that could not have propagated). */
export function canKnow(
  ledger: EpistemicLedger, character: string, factScene: number, atScene: number,
): SupportState {
  if (!ledger.scored) return 'UNKNOWN';
  if (factScene < 0 || atScene < factScene || atScene >= ledger.presenceByScene.length) return 'UNKNOWN';
  // Direct: present when the fact was established.
  if (ledger.presenceByScene[factScene]?.has(character)) return 'ENTAILED';
  // Communication path: someone present at factScene later shares a scene (≤ atScene)
  // with the character. BFS over "informed" set across scenes in order.
  const informed = new Set<string>(ledger.presenceByScene[factScene] ?? []);
  for (let s = factScene + 1; s <= atScene; s++) {
    const here = ledger.presenceByScene[s];
    if (!here) continue;
    const anyInformedHere = [...here].some(c => informed.has(c));
    if (anyInformedHere) {
      for (const c of here) informed.add(c);         // co-present ⇒ could be told
      if (informed.has(character)) return 'ENTAILED';
    }
  }
  return 'UNKNOWN';
}
