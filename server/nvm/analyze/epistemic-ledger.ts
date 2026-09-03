// Character-epistemic ledger (ULTRAPLAN Phase 3, minimal deterministic layer).
//
// Pre-Flight §7.2 "character epistemic ledger": what a character could know at a
// given story point. This deterministic layer tracks scene PRESENCE and
// COMMUNICATION PATHS (co-presence) — enough to answer knowledge-legality as an
// open-world support state feeding the surfacing gate (subtype knowledge_path).
// The semantic "which fact" layer stays LLM-gated (deferred); this substrate is
// deterministic, no LLM. Returns UNKNOWN (not a negative) when no path is found —
// absence is not a negative fact.
//
// ── Status (2026-08-03 wiring audit) ── KEEP AS REFERENCE / INTEGRATE LATER
// Zero importers anywhere in the repo except its own test
// (tests/core/epistemic-ledger.test.ts). Order-sensitive BY DESIGN:
// `presenceByScene: Array<Set<string>>` is indexed by scene, and `canKnow`
// (the query function) necessarily asks "was there a co-presence path
// BEFORE this point" — a position question, not a content one. Unlike most
// of this cluster, the EXTRACTOR here (`buildEpistemicLedger`) is not the
// blocker: it takes raw scene texts directly and uses the same character-cue
// regex this directory already trusts elsewhere (cluster.ts, doctor.ts's
// live import graph). The real gap is that this module exposes a QUERY
// primitive (`canKnow(ledger, character, fact, sceneIdx)`-shaped), not a
// whole-script REPORT — there is no "scan the whole script and list
// knowledge violations" entry point the way disclosure-ledger.ts's
// assessFairReveal or temporal-consistency.ts's auditTemporalConsistency
// are. What would unblock it: (1) a `fact` layer to query knowledge OF
// (this ledger alone answers "who could have been told," not "who knows
// what" — it needs pairing with a fact/reveal source, plausibly disclosure-
// ledger.ts's DisclosureEvent once THAT module's cross-scene identity gap
// is fixed); (2) a report-building wrapper analogous to
// auditTemporalConsistencyReport that runs canKnow across every
// character/fact pair and collects violations, which is new aggregation
// logic, not just a wiring change.

import type { SupportState } from '../proof/surfacing.ts';

const SLUG = /^\s*(?:INT|EXT|INT\.?\/EXT|I\/E|EST)[.\s]/i;
const TRANS = /^\s*(?:CUT TO:|FADE (?:IN|OUT)|DISSOLVE TO:|SMASH CUT|MATCH CUT|BACK TO)/i;
const CUE = /^\s{0,}([\p{Lu}\p{Lt}][\p{Lu}\p{Lt}\p{M}0-9 .'\-]{0,30})\s*(?:\(.*\))?\s*$/u;

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
