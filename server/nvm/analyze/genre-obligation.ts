// STORY GOD SG2 — Genre-obligation engine (excellence/coverage detector).
//
// Every genre owes its audience certain obligatory beats — a thriller that
// never confronts its threat, a mystery that never reveals its answer, is
// not doing its job regardless of prose quality elsewhere. This module
// checks, deterministically and lexically/structurally, whether a script
// contains evidence that a DECLARED genre's obligations were paid.
//
// Aligns to the genre model already owned by server/lib/genre-router.ts:
// GenreId (= StoryGenre, the 47-genre roster) is the single source of truth
// for "what genre means" in this codebase — this module does not invent a
// parallel genre taxonomy, it only adds a small, modest obligation table for
// a HANDFUL of core genres where a defensible lexical/structural cue exists.
// Unsupported genres abstain (scored:false) rather than fabricate an
// obligation list — see OBLIGATION_TABLE below for the exact supported set.
//
// Scene splitting is re-derived locally (INT./EXT. boundaries), matching the
// convention already used by emotional-arc.ts's scenesFromFountain — kept
// local rather than imported so this module has no coupling to that file's
// diagnostic-only surface.
//
// NEVER-PADDED: a modest cue-word/structure test per obligation, not an
// exhaustive NLP model. Each obligation is intentionally small and
// defensible, not exhaustive — see WAVE_QUALITY_GUARANTEE.md's excellence
// detector discipline (same guard rigor as defect rules).

import type { GenreId } from '../../lib/genre-router.ts';

export interface GenreObligation {
  /** Short obligation name, e.g. "threat established". */
  name: string;
  /** True when the obligation's evidence was found in the script. */
  met: boolean;
  /** 0-based scene indices where the obligation's evidence occurred. */
  evidenceScenes: number[];
}

export interface GenreObligationReport {
  genre: string;
  obligations: GenreObligation[];
  metCount: number;
  totalCount: number;
  /** metCount / totalCount, in [0,1]. 0 when totalCount is 0 (unscored). */
  completeness: number;
  /** false when genre is unknown/unsupported or the script has < 6 scenes — abstain rather than fabricate. */
  scored: boolean;
}

const MIN_SCENES = 6;

/** Split raw Fountain into ordered scene texts (INT./EXT. boundaries). */
function scenesFromFountain(fountain: string): string[] {
  const parts = fountain.split(/^(?=(?:INT|EXT)\.)/mi);
  return parts.filter(p => /^(?:INT|EXT)\./i.test(p));
}

interface ObligationDef {
  name: string;
  /** Returns true if this scene's text satisfies the obligation's cue test. */
  test: (sceneText: string) => boolean;
}

// Each cue set is a modest, defensible lexical/structural test — not
// exhaustive. Kept small and legible so false-positive risk stays low; an
// obligation is "met" only on an explicit cue match, never on vibes.
const THREAT_CUES = /\b(threat|danger|kill|die|dead|gun|weapon|bomb|deadline|hunt(?:ing|ed)?|chas(?:e|ing)|stalk(?:ing|er)?|attack(?:s|ed|ing)?|explos(?:ion|ive)|hostage|clock is ticking|running out of time|before it's too late)\b/i;
const CONFRONTATION_CUES = /\b(confront(?:s|ed|ation)?|face(?:s)? (?:him|her|them|it)|standoff|showdown|fight(?:s)?|final battle|shoot(?:s|out)?|struggle(?:s)?|square(?:s)? off)\b/i;
const QUESTION_CUES = /\b(who (?:did|killed|took|stole)|what happened|why (?:did|would)|mystery|missing|disappeared|unsolved|unknown)\b/i;
const INVESTIGATION_CUES = /\b(investigat(?:e|es|ing|ion)|clue(?:s)?|evidence|suspect(?:s)?|search(?:es|ing)?|question(?:s|ed|ing)?|interview(?:s|ed)?|alibi|witness(?:es)?)\b/i;
const REVEAL_CUES = /\b(reveal(?:s|ed|ation)?|it was|the truth (?:is|was)|confess(?:es|ed|ion)?|turns out|the answer (?:is|was)|unmask(?:s|ed)?)\b/i;
const MEETING_CUES = /\b(meet(?:s|ing)?|introduc(?:e|es|ed)|first (?:time|saw|met)|encounter(?:s|ed)?|bump(?:s|ed)? into)\b/i;
const OBSTACLE_CUES = /\b(can't|can not|won't work|impossible|forbidden|afraid|scared|rival|ex-(?:wife|husband|boyfriend|girlfriend)|engaged|married|distance|misunderstand(?:ing)?|betray(?:al|ed)?)\b/i;
const REUNION_CUES = /\b(together (?:again|at last)|come(?:s)? back|forgive(?:s|n)?|reunite(?:d|s)?|choose(?:s)? (?:him|her|them)|finally (?:together|kiss|says)|i love you)\b/i;
const ISOLATION_CUES = /\b(alone|isolated|no signal|no phone|trapped|no one (?:can hear|to help)|stranded|locked (?:in|out)|cut off|abandoned (?:house|cabin|building))\b/i;
const SCARE_ESCALATION_CUES = /\b(scream(?:s|ed|ing)?|shriek(?:s|ed)?|blood|scratch(?:ing|es)?|whisper(?:s|ed|ing)?|shadow(?:s)? (?:move|moved|moving)|footsteps|behind (?:her|him|them)|jump(?:s|ed)? (?:out|at)|terror|horrif(?:ic|ied))\b/i;
const ESCALATION_CUES = /\b(worse|escalat(?:e|es|ed|ing)|spiral(?:s|ed|ing)? out of control|chaos|disaster|ruin(?:ed|s)?|catastroph(?:e|ic))\b/i;
const REVERSAL_CUES = /\b(but then|however|suddenly|turns out|instead|backfire(?:s|d)?|didn't expect|plot twist|to (?:his|her|their) surprise)\b/i;

const OBLIGATION_TABLE: Partial<Record<GenreId, ObligationDef[]>> = {
  thriller: [
    { name: 'threat established', test: s => THREAT_CUES.test(s) },
    { name: 'confrontation', test: s => CONFRONTATION_CUES.test(s) },
  ],
  mystery: [
    { name: 'question posed', test: s => QUESTION_CUES.test(s) },
    { name: 'investigation', test: s => INVESTIGATION_CUES.test(s) },
    { name: 'reveal', test: s => REVEAL_CUES.test(s) },
  ],
  romance: [
    { name: 'meeting', test: s => MEETING_CUES.test(s) },
    { name: 'obstacle', test: s => OBSTACLE_CUES.test(s) },
    { name: 'reunion', test: s => REUNION_CUES.test(s) },
  ],
  horror: [
    { name: 'threat', test: s => THREAT_CUES.test(s) },
    { name: 'isolation', test: s => ISOLATION_CUES.test(s) },
    { name: 'scare escalation', test: s => SCARE_ESCALATION_CUES.test(s) },
  ],
  comedy: [
    { name: 'escalation', test: s => ESCALATION_CUES.test(s) },
    { name: 'reversal', test: s => REVERSAL_CUES.test(s) },
  ],
};

function emptyReport(genre: string): GenreObligationReport {
  return { genre, obligations: [], metCount: 0, totalCount: 0, completeness: 0, scored: false };
}

/**
 * Assess whether a script pays its declared genre's obligatory beats.
 * Deterministic, no LLM. Abstains (scored:false) on empty input, unknown or
 * unsupported genre, or fewer than MIN_SCENES scenes — never fabricates an
 * obligation list for a genre this module does not model.
 */
export function assessGenreObligations(fountain: string, genre: string | null | undefined): GenreObligationReport {
  const genreKey = typeof genre === 'string' ? genre.trim() : '';
  if (!genreKey) return emptyReport(genreKey);
  if (typeof fountain !== 'string' || !fountain.trim()) return emptyReport(genreKey);

  const defs = OBLIGATION_TABLE[genreKey as GenreId];
  if (!defs || defs.length === 0) return emptyReport(genreKey);

  const scenes = scenesFromFountain(fountain);
  if (scenes.length < MIN_SCENES) return emptyReport(genreKey);

  const obligations: GenreObligation[] = defs.map(def => {
    const evidenceScenes: number[] = [];
    scenes.forEach((sceneText, i) => {
      if (def.test(sceneText)) evidenceScenes.push(i);
    });
    return { name: def.name, met: evidenceScenes.length > 0, evidenceScenes };
  });

  const metCount = obligations.filter(o => o.met).length;
  const totalCount = obligations.length;
  const completeness = totalCount > 0 ? metCount / totalCount : 0;

  return { genre: genreKey, obligations, metCount, totalCount, completeness, scored: true };
}
