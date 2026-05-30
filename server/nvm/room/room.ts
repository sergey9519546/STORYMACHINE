// Adversarial Writers' Room (G2) — 6 NarrativeModule critics argue about
// every candidate IR. Showrunner drives coherence, Skeptic pokes holes,
// Continuity is the proof kernel, Character-Advocate protects psychology,
// Studio-Note enforces commercial viability, Dramaturge ensures structure.
//
// Critics bid "attention" on scenes (urgency×expectedPayoff). A scene no
// critic bids on is boring. A contested scene is the spine.
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
}

export interface WritersRoomResult {
  critiques: Critique[];
  consensus: number;     // 0–100: how much critics agree (100 = unanimous)
  transcript: string;    // human-readable argument log
  dominantCritic: string; // critic with highest total attentionBid
  suggestedOperator: MutationOperator | null; // majority-vote operator suggestion
}

// Load all 6 critics
import { showrunnerCritic } from './critics/showrunner.ts';
import { skepticCritic } from './critics/skeptic.ts';
import { continuityCritic } from './critics/continuity.ts';
import { characterAdvocateCritic } from './critics/character-advocate.ts';
import { studioNoteCritic } from './critics/studio-note.ts';
import { dramaturgeCritic } from './critics/dramaturge.ts';
import { logger } from '../../lib/logger.ts';

export type CriticFn = (
  ir: NarrativeTransitionIR,
  state: NarrativeState,
) => Critique[];

const CRITICS: Array<{ id: string; fn: CriticFn }> = [
  { id: 'showrunner',         fn: showrunnerCritic },
  { id: 'skeptic',            fn: skepticCritic },
  { id: 'continuity',         fn: continuityCritic },
  { id: 'character_advocate', fn: characterAdvocateCritic },
  { id: 'studio_note',        fn: studioNoteCritic },
  { id: 'dramaturge',         fn: dramaturgeCritic },
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
  // Clamped to [0, 100] to guard against edge-case arithmetic.
  const severities = allCritiques.map(c => c.severity);
  const maxSev = Math.max(...severities, 0);
  const minSev = Math.min(...severities, 0);
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
    lines.push(`[${c.criticId.toUpperCase()}${opRef}] sev=${c.severity} bid=${c.attentionBid} | ${c.objection}${opSug}`);
  }
  if (allCritiques.length === 0) lines.push('(no objections — scene passes unanimously)');
  lines.push('', `consensus=${consensus}  dominant=${dominantCritic}  operator=${suggestedOperator ?? 'none'}`);

  return { critiques: allCritiques, consensus, transcript: lines.join('\n'), dominantCritic, suggestedOperator };
}
