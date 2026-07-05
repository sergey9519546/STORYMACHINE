// Adversarial Writers' Room (G2) — 12 NarrativeModule critics argue about
// every candidate IR. Showrunner drives coherence, Skeptic pokes holes,
// Continuity is the proof kernel, Character-Advocate protects psychology,
// Studio-Note enforces commercial viability, Dramaturge ensures structure.
// Pacing-Editor watches rhythm, Dialogue-Specialist watches voice,
// Theme-Auditor watches whether the thematic argument moves or restates,
// Genre-Gatekeeper enforces the configured genre's structural contract,
// Audience-Proxy distinguishes confusion from mystery, and
// Production-Realist watches shootability and physical-production load.
//
// Critics bid "attention" on scenes (urgency×expectedPayoff). A scene no
// critic bids on is boring. A contested scene is the spine.
//
// Severity tiers: most critiques are soft craft notes, scored purely by
// `severity`. A critique may additionally set `hard: true` — a genre-contract
// or continuity veto that must never be averaged away or buried among softer
// notes. WritersRoomResult surfaces those separately as `hardObjections` /
// `hasHardObjection` so a caller can gate on them directly instead of reading
// the full critiques[] looking for outliers.
//
// Output: Critique[] + argument transcript the writer can read.

import type { NarrativeTransitionIR } from '../ir/NarrativeTransitionIR.ts';
import type { NarrativeState } from '../state/NarrativeState.ts';
import type { MutationOperator } from '../converge/operators.ts';

export interface Critique {
  criticId: string;
  severity: number;          // 0–100: how strongly the critic objects
  targetOpIdx: number | null; // which op triggered the objection (null = whole IR)
  objection: string;
  suggestedOperator: MutationOperator | null;
  attentionBid: number;      // 0–100: how much this critic wants to own this scene
  /**
   * Optional severity tier. true = a hard veto (continuity contradiction,
   * genre forbidden-shortcut violation) that must be surfaced distinctly and
   * never silently folded into an averaged/consensus view. Omitted or false
   * = an ordinary soft craft note. Additive field — existing critics that
   * never set it are unaffected and read as soft.
   */
  hard?: boolean;
}

export interface WritersRoomResult {
  critiques: Critique[];
  consensus: number;     // 0–100: how much critics agree (100 = unanimous)
  transcript: string;    // human-readable argument log
  dominantCritic: string; // critic with highest total attentionBid
  suggestedOperator: MutationOperator | null; // majority-vote operator suggestion
  /** Every critique with `hard: true`, highest severity first — the vetoes. */
  hardObjections: Critique[];
  /** true iff hardObjections is non-empty — cheap gate for callers. */
  hasHardObjection: boolean;
}

// Load all 12 critics
import { showrunnerCritic } from './critics/showrunner.ts';
import { skepticCritic } from './critics/skeptic.ts';
import { continuityCritic } from './critics/continuity.ts';
import { characterAdvocateCritic } from './critics/character-advocate.ts';
import { studioNoteCritic } from './critics/studio-note.ts';
import { dramaturgeCritic } from './critics/dramaturge.ts';
import { pacingEditorCritic } from './critics/pacing-editor.ts';
import { dialogueSpecialistCritic } from './critics/dialogue-specialist.ts';
import { themeAuditorCritic } from './critics/theme-auditor.ts';
import { genreGatekeeperCritic } from './critics/genre-gatekeeper.ts';
import { audienceProxyCritic } from './critics/audience-proxy.ts';
import { productionRealistCritic } from './critics/production-realist.ts';
import { logger } from '../../lib/logger.ts';

export type CriticFn = (
  ir: NarrativeTransitionIR,
  state: NarrativeState,
) => Critique[];

const CRITICS: Array<{ id: string; fn: CriticFn }> = [
  { id: 'showrunner',           fn: showrunnerCritic },
  { id: 'skeptic',              fn: skepticCritic },
  { id: 'continuity',           fn: continuityCritic },
  { id: 'character_advocate',   fn: characterAdvocateCritic },
  { id: 'studio_note',          fn: studioNoteCritic },
  { id: 'dramaturge',           fn: dramaturgeCritic },
  { id: 'pacing_editor',        fn: pacingEditorCritic },
  { id: 'dialogue_specialist',  fn: dialogueSpecialistCritic },
  { id: 'theme_auditor',        fn: themeAuditorCritic },
  { id: 'genre_gatekeeper',     fn: genreGatekeeperCritic },
  { id: 'audience_proxy',       fn: audienceProxyCritic },
  { id: 'production_realist',   fn: productionRealistCritic },
];

export function runWritersRoom(
  ir: NarrativeTransitionIR,
  state: NarrativeState,
): WritersRoomResult {
  const allCritiques: Critique[] = [];

  // Each critic inspects and bids — isolated so one crash can't silence others
  for (const { id, fn } of CRITICS) {
    try {
      const c = fn(ir, state);
      allCritiques.push(...c);
    } catch (err) {
      logger.error('critics_error', { criticId: id, error: (err as Error).message });
    }
  }

  // De-duplicate: if two critics raise the same objection text, keep only the
  // highest-severity one to avoid inflating scores and confusing transcripts.
  const seenObjections = new Map<string, number>();
  const dedupedCritiques: Critique[] = [];
  for (const c of allCritiques) {
    const key = c.objection.slice(0, 120);
    const idx = seenObjections.get(key);
    if (idx === undefined) {
      seenObjections.set(key, dedupedCritiques.length);
      dedupedCritiques.push(c);
    } else if (c.severity > (dedupedCritiques[idx]?.severity ?? 0)) {
      dedupedCritiques[idx] = c; // replace with higher-severity version
    }
  }
  allCritiques.length = 0;
  allCritiques.push(...dedupedCritiques);

  // Consensus: 100 if all critics agree (all same severity bucket), 0 if maximally opposed.
  // Use spread only when array is non-empty — the empty case is already handled by the ternary.
  // Adding 0 to Math.min/max would artificially anchor minSev at 0, making unanimous high-severity
  // critiques look like low consensus (e.g., all at 70 → range 70 → consensus 30 instead of 100).
  const severities = allCritiques.map(c => c.severity);
  const maxSev = severities.length > 0 ? Math.max(...severities) : 0;
  const minSev = severities.length > 0 ? Math.min(...severities) : 0;
  const consensus = allCritiques.length === 0 ? 100 : Math.max(0, Math.round(100 - (maxSev - minSev)));

  // Dominant critic: highest total attentionBid
  const bidsBycritic = new Map<string, number>();
  for (const c of allCritiques) {
    bidsBycritic.set(c.criticId, (bidsBycritic.get(c.criticId) ?? 0) + c.attentionBid);
  }
  const dominantCritic = [...bidsBycritic.entries()]
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'none';

  // Majority operator vote
  const opVotes = new Map<MutationOperator, number>();
  for (const c of allCritiques) {
    if (c.suggestedOperator) {
      opVotes.set(c.suggestedOperator, (opVotes.get(c.suggestedOperator) ?? 0) + c.severity);
    }
  }
  const suggestedOperator = [...opVotes.entries()]
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Hard objections (severity tier): vetoes must be surfaced distinctly, not
  // buried inside the consensus/dominant/suggestedOperator aggregates above —
  // those aggregates still run over the full critiques[] unchanged, but a
  // caller that only checks hasHardObjection never has to reconstruct this
  // filter itself or risk missing a veto among dozens of soft notes.
  const hardObjections = allCritiques
    .filter(c => c.hard === true)
    .sort((a, b) => b.severity - a.severity);
  const hasHardObjection = hardObjections.length > 0;

  // Argument transcript
  const lines: string[] = [
    `=== Writers' Room — scene ${ir.sceneIdx} (${ir.sceneFunction}) ===`,
    `Mechanisms: ${ir.activeMechanisms.join(', ')}`,
    `Ops: ${ir.ops.length}`,
    '',
  ];
  for (const c of allCritiques.sort((a, b) => b.severity - a.severity)) {
    const opRef = c.targetOpIdx !== null ? ` [op${c.targetOpIdx}]` : '';
    const opSug = c.suggestedOperator ? ` → suggest: ${c.suggestedOperator}` : '';
    const hardTag = c.hard ? ' ⚠ VETO' : '';
    lines.push(`[${c.criticId.toUpperCase()}${opRef}]${hardTag} sev=${c.severity} bid=${c.attentionBid} | ${c.objection}${opSug}`);
  }
  if (allCritiques.length === 0) lines.push('(no objections — scene passes unanimously)');
  lines.push(
    '',
    `consensus=${consensus}  dominant=${dominantCritic}  operator=${suggestedOperator ?? 'none'}  hardObjections=${hardObjections.length}`,
  );

  return {
    critiques: allCritiques,
    consensus,
    transcript: lines.join('\n'),
    dominantCritic,
    suggestedOperator,
    hardObjections,
    hasHardObjection,
  };
}
