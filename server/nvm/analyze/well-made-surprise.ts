// Well-made-surprise detector (Wave Program v2 -- excellence detector, STORY GOD SG1).
//
// Complements belief-movement.ts: that module tracks an AGENT's belief
// reversal (a character learns they were wrong). This module scores AUDIENCE
// surprise -- the Aristotle/Hitchcock gold standard of a twist that is BOTH
// unexpected (the audience was misdirected) AND, in retrospect, inevitable
// (the setup was present all along, just pointed elsewhere).
//
// Deterministic, no LLM: callers supply a typed, ordered list of surprise
// events (id, reveal scene, setup scenes, whether misdirection was present).
// This file does not extract surprises from prose -- same substrate
// discipline as belief-movement.ts: guarded inputs, UNKNOWN/abstain rather
// than false positives, never-padded excellence scoring.

import type { SupportState } from '../proof/surfacing.ts';

export interface SurpriseEvent {
  id: string;
  /** Scene index where the surprise is revealed to the audience. */
  revealSceneIndex: number;
  /** Scene indices where the surprise's setup/seed was planted. */
  setupSceneIndices: number[];
  /** True when the audience was actively pointed elsewhere (misdirection). */
  misdirectionPresent: boolean;
}

export interface SurpriseAssessment {
  id: string;
  /** Setup existed strictly before the reveal -- the seed was planted. */
  inevitable: boolean;
  /** Misdirection was present -- the audience was pointed elsewhere. */
  unexpected: boolean;
  /** inevitable AND unexpected -- surprising yet earned. */
  wellMade: boolean;
}

export interface WellMadeSurpriseReport {
  surprises: SurpriseAssessment[];
  wellMadeCount: number;
  /** Unexpected but with no prior setup -- a deus ex machina / unearned twist. */
  cheapSurpriseCount: number;
  strength: number;
  support: SupportState;
}

const EMPTY_REPORT: WellMadeSurpriseReport = {
  surprises: [],
  wellMadeCount: 0,
  cheapSurpriseCount: 0,
  strength: 0,
  support: 'UNKNOWN',
};

/** Guard + normalize a raw event: valid types, non-negative indices, no
 *  duplicate setup indices, reveal index present. Returns null when the
 *  event is too malformed to assess. */
function cleanEvent(e: SurpriseEvent): SurpriseEvent | null {
  if (!e || typeof e.id !== 'string' || e.id.trim().length === 0) return null;
  if (typeof e.revealSceneIndex !== 'number' || !Number.isFinite(e.revealSceneIndex)) return null;
  if (e.revealSceneIndex < 0) return null;
  if (!Array.isArray(e.setupSceneIndices)) return null;
  if (typeof e.misdirectionPresent !== 'boolean') return null;

  const setupSceneIndices = Array.from(
    new Set(
      e.setupSceneIndices.filter(
        (i): i is number => typeof i === 'number' && Number.isFinite(i) && i >= 0,
      ),
    ),
  );

  return {
    id: e.id,
    revealSceneIndex: e.revealSceneIndex,
    setupSceneIndices,
    misdirectionPresent: e.misdirectionPresent,
  };
}

/**
 * Assess audience surprises for "surprising yet inevitable" craft.
 * Deterministic, input-guarded. Abstains (support UNKNOWN, strength 0) when
 * there are no valid events to assess.
 */
export function assessWellMadeSurprise(
  events: readonly SurpriseEvent[] | null | undefined,
): WellMadeSurpriseReport {
  if (!events || events.length === 0) return { ...EMPTY_REPORT };

  const seenIds = new Set<string>();
  const clean: SurpriseEvent[] = [];
  for (const raw of events) {
    const c = cleanEvent(raw);
    if (!c) continue;
    if (seenIds.has(c.id)) continue; // drop duplicate ids -- keep first occurrence
    seenIds.add(c.id);
    clean.push(c);
  }

  if (clean.length === 0) return { ...EMPTY_REPORT };

  const surprises: SurpriseAssessment[] = clean.map(e => {
    // Inevitable requires a setup STRICTLY before the reveal -- setup at or
    // after the reveal scene does not count as a planted seed.
    const inevitable = e.setupSceneIndices.some(s => s < e.revealSceneIndex);
    const unexpected = e.misdirectionPresent === true;
    const wellMade = inevitable && unexpected;
    return { id: e.id, inevitable, unexpected, wellMade };
  });

  const wellMadeCount = surprises.filter(s => s.wellMade).length;
  const cheapSurpriseCount = surprises.filter(s => s.unexpected && !s.inevitable).length;

  // Strength rises with well-made surprises, is penalized by cheap surprises.
  // Bounded [0,1]; never-padded -- a rule this generous would reward
  // deus-ex-machina twists, which is the exact defect it exists to catch.
  const raw = wellMadeCount * 0.35 - cheapSurpriseCount * 0.3;
  const strength = Math.max(0, Math.min(1, raw));

  // Support per surfacing.ts SupportState discipline:
  //  - any cheap (unearned) surprise CONTRADICTS the well-made-surprise claim.
  //  - all surprises well-made ENTAILS it.
  //  - setups present but no misdirection anywhere is merely predictable --
  //    neither earned craft nor a defect -- so we abstain (UNKNOWN).
  let support: SupportState;
  if (cheapSurpriseCount > 0) {
    support = 'CONTRADICTED';
  } else if (wellMadeCount > 0 && wellMadeCount === surprises.length) {
    support = 'ENTAILED';
  } else {
    support = 'UNKNOWN';
  }

  return {
    surprises,
    wellMadeCount,
    cheapSurpriseCount,
    strength,
    support,
  };
}
