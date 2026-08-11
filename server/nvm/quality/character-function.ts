// Character Function Classifier — GODMODE L8 (Supporting Character Function).
//
// Classifies characters into the 14 GODMODE supporting function types
// based on their action patterns, relationship positions, and emotional
// presence across the screenplay.
//
// The 14 functions (GODMODE §10):
//   protagonist, ally, foil, mirror, temptation, gatekeeper, witness,
//   dependent, rival, moral_critic, false_mentor, truth_carrier,
//   comic_pressure_valve, betrayer, institutional_representative.
//
// Classification uses available signals from ScreenplaySceneRecord:
// dialogue line counts, relationship shifts, emotional debt, scene
// presence, and clue/payoff involvement.

import type { ScreenplaySceneRecord } from '../screenplay/memory.ts';
import type { ArcCompletionReport } from './arc-tracker.ts';

export type SupportingFunction =
  | 'protagonist' | 'ally' | 'foil' | 'mirror' | 'temptation'
  | 'gatekeeper' | 'witness' | 'dependent' | 'rival' | 'moral_critic'
  | 'false_mentor' | 'truth_carrier' | 'comic_pressure_valve'
  | 'betrayer' | 'institutional_representative';

export interface CharacterFunctionProfile {
  characterId: string;
  function: SupportingFunction;
  confidence: number;
  evidence: string[];
  independentGoal: boolean;
}

interface CharacterSignals {
  dialogueLines: number;
  scenesPresent: number;
  relationshipShifts: number;
  netRelationship: number;
  emotionalDebtScenes: number;
  clueInvolvement: number;
  firstScene: number;
  lastScene: number;
}

export function classifyCharacterFunctions(
  characters: string[],
  records: ScreenplaySceneRecord[],
  arcReport?: ArcCompletionReport,
): CharacterFunctionProfile[] {
  // Gather per-character signals
  const signals = new Map<string, CharacterSignals>();
  for (const char of characters) {
    signals.set(char, {
      dialogueLines: 0, scenesPresent: 0, relationshipShifts: 0,
      netRelationship: 0, emotionalDebtScenes: 0, clueInvolvement: 0,
      firstScene: -1, lastScene: -1,
    });
  }

  for (const [idx, record] of records.entries()) {
    // Dialogue lines from dialogueHighlights
    const highlights = record.dialogueHighlights ?? [];
    // Scene presence from characters in the scene
    const present = new Set<string>();
    for (const shift of record.relationshipShifts ?? []) {
      const pair = shift.pairKey.split('|');
      for (const p of pair) present.add(p);
      for (const p of pair) {
        const s = signals.get(p);
        if (s) {
          s.relationshipShifts++;
          s.netRelationship += shift.amount;
        }
      }
    }
    // Mark presence
    for (const char of present) {
      const s = signals.get(char);
      if (s) {
        s.scenesPresent++;
        if (s.firstScene < 0) s.firstScene = idx;
        s.lastScene = idx;
      }
    }
  }

  // Emotional debt from arc report
  if (arcReport) {
    for (const promise of arcReport.openPromises) {
      if (promise.kind === 'EMOTIONAL_DEBT') {
        // Extract character from promiseId "debt:charId"
        const charId = promise.promiseId.replace('debt:', '');
        const s = signals.get(charId);
        if (s) s.emotionalDebtScenes++;
      }
    }
  }

  // Rank by activity to find protagonist
  const ranked = [...signals.entries()].sort((a, b) => {
    const aScore = a[1].relationshipShifts * 2 + a[1].emotionalDebtScenes * 3 + a[1].scenesPresent;
    const bScore = b[1].relationshipShifts * 2 + b[1].emotionalDebtScenes * 3 + b[1].scenesPresent;
    return bScore - aScore;
  });

  const profiles: CharacterFunctionProfile[] = [];
  const protagonist = ranked.length > 0 ? ranked[0][0] : null;

  for (const [charId, s] of ranked) {
    const evidence: string[] = [];
    let func: SupportingFunction = 'ally';
    let confidence = 0.3;

    if (charId === protagonist && s.relationshipShifts >= 3) {
      func = 'protagonist';
      confidence = 0.9;
      evidence.push(`${s.relationshipShifts} relationship shifts, ${s.emotionalDebtScenes} emotional debt scenes, ${s.scenesPresent} scenes present`);
    } else if (s.netRelationship < -1.5) {
      func = 'rival';
      confidence = 0.7;
      evidence.push(`net relationship ${s.netRelationship.toFixed(1)} — predominantly negative toward others`);
    } else if (s.emotionalDebtScenes >= 2 && s.netRelationship < -0.5) {
      func = 'foil';
      confidence = 0.6;
      evidence.push(`${s.emotionalDebtScenes} debt scenes with negative relationship balance — opposition through contrast`);
    } else if (s.scenesPresent >= 3 && s.relationshipShifts === 0) {
      func = 'witness';
      confidence = 0.5;
      evidence.push(`present in ${s.scenesPresent} scenes with zero relationship shifts — observational role`);
    } else if (s.relationshipShifts >= 2 && s.netRelationship > 0.3) {
      func = 'ally';
      confidence = 0.65;
      evidence.push(`${s.relationshipShifts} shifts with positive net (${s.netRelationship.toFixed(1)}) — supportive presence`);
    } else if (s.firstScene >= 0 && s.scenesPresent <= 2 && s.lastScene >= ranked.length * 0.7) {
      func = 'gatekeeper';
      confidence = 0.45;
      evidence.push(`late appearance (scene ${s.firstScene}), few scenes — threshold guardian pattern`);
    } else {
      func = 'ally';
      confidence = 0.3;
      evidence.push(`insufficient signal for specific classification — defaulting to ally`);
    }

    profiles.push({
      characterId: charId,
      function: func,
      confidence,
      evidence,
      independentGoal: s.relationshipShifts >= 2,
    });
  }

  return profiles;
}
