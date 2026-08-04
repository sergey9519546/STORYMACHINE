// Agency signal detection — P1, 2026-08-04, responds to detector defects
// D1 and D2 (docs/p1-benchmark/DETECTOR_DEFECTS_2026-08-03.md).
//
// ── What this is ─────────────────────────────────────────────────────────
// D1 (PROTAGONIST_PASSIVITY_CLIMAX, server/nvm/revision/passes/structure.ts
// ~line 815) and D2 (PASSIVE_ACT3_INTENTION, server/nvm/revision/passes/
// intention.ts) share one mechanism: `isPassive = emotionalShift === 'neutral'
// && !clockRaised && seededClueIds.length === 0`. All three are lexicon
// signals about the SCENE's mood/stakes/clue traffic; none of them encodes
// "the protagonist performs an action." D1's own worked example is
// demo/corpus/sample-script.fountain ("The Second Key") scene 13
// (0-based sceneIdx 12, "INT. HOLLOWAY ESTATE - VAULT - CONTINUOUS"): June is
// the story's sole agent at its highest-suspense moment — "June turns the
// brass teeth in her palm ... and the vault door releases" — yet the legacy
// predicate calls the scene passive, because neutral emotion + no clock +
// no clue says nothing about who did what. D2 is the same blindness at act
// scale: "Across all 4 Act 3 scenes the protagonist initiates no action" is
// derived from the same two lexicon channels (clockRaised, seededClueIds)
// applied to every scene in the act, with the same hole.
//
// D1's own fix shape: "the passivity predicate needs an agency signal (e.g.
// protagonist-as-subject action lines, or dialogue-initiative), with
// fixtures: positive = genuinely spectator protagonists at the peak;
// negative = silent but decisive actors (this script is the canonical
// negative fixture)." This module is that agency signal, built exactly to
// that shape and no further.
//
// ── What this is NOT ─────────────────────────────────────────────────────
// - NOT wired into health, verdict, grade, or the PROTAGONIST_PASSIVITY_
//   CLIMAX / PASSIVE_ACT3_INTENTION rules themselves. Nothing in
//   server/nvm/analyze/doctor.ts, server/nvm/revision/passes/structure.ts,
//   server/nvm/revision/passes/intention.ts, or any other production path
//   imports this file. detectPeakAgency, detectAct3Agency,
//   computeD1AgencyDelta, and computeD2AgencyDelta are exported and computed
//   but consumed only by this module's own tests
//   (tests/core/agency-signal.test.ts) and by an opt-in diagnostic flag on
//   scripts/measure-auc-split.mjs (--with-agency-signal / AGENCY_SIGNAL=1)
//   for a maintainer to run locally — see that script's header for the exact
//   contract.
// - NOT measured on the 761-script real-writing corpus. This module ships
//   with fixtures plus a measured (not guessed) run over the 20 in-repo CC0
//   scripts under data/screenplays/ — see the test file's evidence table —
//   which is evidence of DISTRIBUTION (does this fire selectively, not
//   everywhere), not of DISCRIMINATION on labeled real writing. That
//   requires the maintainer's local corpus run.
// - NOT a wiring decision. There is not yet an agreed deduction/rule shape
//   to gate a wiring decision on — this module answers a narrower question
//   first: does an agency-aware read of the SAME peak/Act-3 scenes disagree
//   with the legacy neutral/clock/clue predicate at all, and in which
//   direction. A deduction/rule design is future work, contingent on that
//   answer, and any such future work is a scoring change requiring the full
//   P1 evidence protocol (positive/negative fixtures, corpus-measured
//   before/after) and respects the AUC-24 >= 0.622 ratchet in
//   tests/core/real-script-corpus.test.ts. See CLAUDE.md's "Which floor,
//   exactly" section. This file does not update
//   docs/p1-benchmark/DETECTOR_DEFECTS_2026-08-03.md itself — that ledger
//   update is the orchestrator's job, after this module exists (a dated
//   addendum stating "built unwired," per the standing instruction).
//
// ── The deterministic boundary (read this before trusting any output) ─────
// This module reads ONLY fields already on ScreenplaySceneRecord (memory.ts)
// — no LLM call, per the project constitution (server-side deterministic
// analysis only; see CLAUDE.md's gotcha on the analysis-only boot mode).
// Deliberately does NOT import server/nvm/analyze/fountain-analyzer.ts (the
// scoring-path file that BUILDS those records) even though it re-derives a
// small decisive/spectator-verb lexicon that could, in principle, be shared
// with that file's own lexicons — importing forward from an always-scoring
// file into an unwired diagnostic module would create exactly the needless
// coupling reversal-detection.ts's header already declined for
// structure.ts's reversalCount predicate. If TURN_VERB_WORDS or
// CONCRETE_NOUNS ever change shape in fountain-analyzer.ts, this module's own
// lexicons do not change with them — that is a deliberately accepted,
// pre-existing tradeoff (see reversal-detection.ts's identical note on
// legacySuspenseDipCount).
//
// Two things this module reads per scene, each with an honest CAN/CANNOT:
//
// SOURCE 1 — dramaticTurn (memory.ts: "the single line, action or dialogue,
//   in original document order, with the most turn-verb hits" — see
//   fountain-analyzer.ts's detectDramaticTurn) and visualBeats (memory.ts:
//   "up to 2 action lines containing a concrete noun" — see
//   fountain-analyzer.ts's detectVisualBeats).
//   CAN see: whichever action/dialogue text those two upstream heuristics
//   already selected as noteworthy, scanned for a clause where the named
//   protagonist sits at or near the start (the near-leading-subject
//   heuristic below) followed by a verb from this module's own decisive- or
//   spectator-action lexicon, with a passive-voice guard (a leading
//   was/were/is/are/been/being/gets/got between the name and the verb blocks
//   the match, so "June was shoved" does not credit June with shoving).
//   CANNOT see: an action line that never made it into dramaticTurn or
//   visualBeats in the first place — e.g. this module's own test corpus
//   shows the D1 worked example's ANTECHAMBER scene ("June eases past
//   [the sensor] into the dark") has an EMPTY visualBeats (no CONCRETE_NOUNS
//   hit: "sensor"/"dark" are not in that lexicon) and an empty dramaticTurn
//   (no TURN_VERB_WORDS hit), so June's decisive action there is invisible
//   to this module even though it is plainly on the page — a real, honestly
//   documented gap, not a rounding error; wording outside this module's own
//   decisive/spectator lexicon (any fixed lexicon has this ceiling, per
//   fountain-analyzer.ts's own header); the protagonist as a bare pronoun
//   ("she turns the key") rather than the literal name string passed in —
//   this module does no coreference resolution; a clause where the
//   protagonist's SECOND mention (not the first) is the true grammatical
//   subject — this module inspects only the clause's first name occurrence,
//   matching detectRevelation/detectDramaticTurn's own "first sufficient
//   match wins" precedent elsewhere in this codebase; and any passive
//   construction this module's own short auxiliary list doesn't cover (e.g.
//   "June found herself dragged toward the vault" has no was/were/is/are/
//   been/being/gets/got immediately after the name).
//
// SOURCE 2 — powerHolder (memory.ts, Wave 1186: "which of the scene's two
//   most-speaking characters holds conversational control" — see
//   fountain-analyzer.ts's detectPowerBalance).
//   CAN see: dialogue-initiative when the protagonist is identified as the
//   controlling half of a TWO-character speaking dyad (imperatives,
//   questions asked, em-dash interruptions, turn-length dominance,
//   second-person accusatory phrasing — see that field's own memory.ts
//   comment for the full extraction).
//   CANNOT see: dialogue initiative in a SOLO scene (fewer than two
//   speakers) — this module's own test corpus shows the D1/D2 worked
//   example's climax INTERROGATION-ROOM scene has June alone, delivering
//   three consecutive imperative lines ("Ask Marcus... Ask Vance... Don't
//   ask me..."), and powerHolder is null there purely because
//   detectPowerBalance requires a two-person dyad — a real initiative signal
//   this module cannot see through this channel, by the field's own
//   construction, not this module's choice; a near-balanced dyad inside
//   detectPowerBalance's own deadband (powerHolder null even with two
//   speakers).
//
// ── What this module does NOT attempt ────────────────────────────────────
// This is not a general "who is the protagonist" detector — the caller
// supplies `protagonist` (a character name string, matched case-insensitively
// against the same casing conventions memory.ts's characters/powerHolder
// fields already use). A reasonable caller-side default for an unattributed
// script is the most-frequently-speaking character
// (FountainAnalysis.characters[0], already sorted that way by
// fountain-analyzer.ts's analyzeFountainText) — this module does not import
// that sort itself (see the coupling note above) and leaves the choice to
// the caller, exactly as reversal-detection.ts leaves scoring-formula
// decisions to its own caller.
//
// ── sceneIdx contract ─────────────────────────────────────────────────────
// Every sceneIdx returned by this module is 0-based, taken directly from the
// input record's own `sceneIdx` field — per CLAUDE.md and the codebase-wide
// convention, 1-based numbering is a DISPLAY-layer concern (see
// tests/core/scene-label-consistency.test.ts) and this module, like
// memory.ts, structure.ts, and reversal-detection.ts before it, never
// performs that conversion itself.

import type { ScreenplaySceneRecord } from '../screenplay/memory.ts';

export type AgencyEvidenceKind = 'decisive_action' | 'dialogue_initiative' | 'spectator_verb' | null;

export interface AgencySceneSignal {
  /** 0-based, matches ScreenplaySceneRecord.sceneIdx exactly (see file header). */
  sceneIdx: number;
  /** True when the protagonist is the near-leading subject of a decisive
   *  action verb in dramaticTurn or visualBeats (SOURCE 1, decisive lexicon). */
  hasDecisiveAction: boolean;
  /** True when the scene's powerHolder field names the protagonist (SOURCE 2). */
  hasDialogueInitiative: boolean;
  /** True when the protagonist is the near-leading subject of a spectator/
   *  observational verb (watches, waits, stares, freezes, ...) and
   *  hasDecisiveAction is false — positive evidence of passivity, not just
   *  its absence. */
  hasSpectatorVerb: boolean;
  /** True when the protagonist's name appears anywhere in dramaticTurn or
   *  visualBeats text at all, regardless of subject position — lets a
   *  caller distinguish "protagonist absent from the scene's action text
   *  entirely" from "protagonist present but not as a decisive subject." */
  protagonistMentioned: boolean;
  /** First evidence kind found, in priority order decisive > dialogue
   *  initiative > spectator > none. Not used for scoring — purely so a
   *  maintainer reading a diagnostic run can see WHY. */
  evidenceKind: AgencyEvidenceKind;
  /** The matched clause/verb (channel 1/3) or "powerHolder: NAME" (channel 2)
   *  when evidenceKind is non-null; null otherwise. */
  evidence: string | null;
}

export interface PeakAgencyResult {
  /** 0-based sceneIdx(es) tied for this script's maximum suspenseDelta — the
   *  peak-intensity/"climax" scene(s) by the same proxy D1's own worked
   *  example uses ("Peak-intensity climax scene (suspense 3.0)"). Empty when
   *  records is empty. */
  peakSceneIdxs: number[];
  /** One signal per peak scene, same order as peakSceneIdxs. */
  signals: AgencySceneSignal[];
  /** True when AT LEAST ONE peak scene shows decisive action or dialogue
   *  initiative — D1's exact rebuttal shape ("the protagonist is NOT absent
   *  from their own story's highest moment"). */
  anyAgencyAtPeak: boolean;
  /** True when EVERY peak scene mentions the protagonist yet shows neither
   *  decisive action nor dialogue initiative (a genuine spectator read, not
   *  merely "protagonist absent from the text entirely"). False when
   *  peakSceneIdxs is empty. */
  allSpectatorAtPeak: boolean;
}

export interface Act3AgencyResult {
  /** 0-based sceneIdx(es) making up the "Act 3" window this call examined —
   *  the LAST `Math.max(minScenes, Math.ceil(records.length * fraction))`
   *  scenes in document order. */
  actSceneIdxs: number[];
  /** One signal per act-3 scene, same order as actSceneIdxs. */
  signals: AgencySceneSignal[];
  /** Count of act-3 scenes with decisive action or dialogue initiative. */
  initiativeCount: number;
  /** actSceneIdxs.length. */
  sceneCount: number;
  /** initiativeCount / sceneCount, or null when sceneCount is 0. */
  initiativeRate: number | null;
}

export interface D1AgencyDeltaResult {
  /** The legacy PROTAGONIST_PASSIVITY_CLIMAX predicate shape
   *  (structure.ts ~line 815: `emotionalShift === 'neutral' && !clockRaised
   *  && seededClueIds.length === 0`), reproduced exactly and evaluated
   *  across ALL peak scenes (true only if every peak scene matches the
   *  legacy shape). */
  legacyPassiveAtPeak: boolean;
  /** detectPeakAgency(records, protagonist).anyAgencyAtPeak. */
  detectedAgencyAtPeak: boolean;
  /** legacyPassiveAtPeak && detectedAgencyAtPeak — D1's exact failure mode:
   *  the legacy predicate calls the peak scene passive while this module
   *  finds the protagonist genuinely acting there. */
  disagreement: boolean;
}

export interface D2AgencyDeltaResult {
  /** The legacy predicate (same shape as D1's, per D2: "'initiates no
   *  action' is derived from clockRaised and seededClueIds only — the same
   *  two lexicon channels as D1, with the same hole") evaluated as true only
   *  when EVERY act-3 scene matches the legacy shape — reproducing D2's own
   *  "across all N Act 3 scenes" wording. */
  legacyAllPassiveAct3: boolean;
  /** detectAct3Agency(records, protagonist, opts).initiativeCount. */
  detectedInitiativeCount: number;
  /** detectAct3Agency(records, protagonist, opts).sceneCount. */
  act3SceneCount: number;
  /** legacyAllPassiveAct3 && detectedInitiativeCount > 0 — D2's exact
   *  failure mode: the legacy predicate calls every act-3 scene passive
   *  while this module finds the protagonist initiating in at least one. */
  disagreement: boolean;
}

// ── Lexicons ──────────────────────────────────────────────────────────────

/** Escape a literal string for use inside a RegExp — same helper every
 *  lexicon-backed module in this codebase carries locally (fountain-
 *  analyzer.ts's own escapeRegExp is not exported, so this is a small,
 *  intentional duplication rather than a coupling; see file header). */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Decisive, physically- or narratively-committing verbs — a protagonist
 *  performing one of these, as the clause's near-leading subject, is acting
 *  on the story rather than being acted upon or merely present. Deliberately
 *  narrower than fountain-analyzer.ts's TURN_VERB_WORDS (which marks
 *  irreversible STORY state-change regardless of who's the subject, e.g.
 *  "died," "was exposed") — this lexicon is about physical/decisive AGENCY
 *  specifically, including verbs (turns, opens, works, eases) that are
 *  narratively unremarkable but grammatically decisive, which is exactly
 *  the register D1's own worked example needs ("June turns the brass teeth
 *  ... and the vault door releases" — a silent, decisive heist-climax
 *  action with zero TURN_VERB_WORDS hits and zero DANGER_TENSION_WORDS
 *  hits, which is precisely why the legacy lexicon channels missed it). */
const DECISIVE_ACTION_VERBS = [
  'turns', 'turn', 'turned',
  'opens', 'open', 'opened',
  'grabs', 'grab', 'grabbed',
  'shoves', 'shove', 'shoved',
  'fires', 'fire', 'fired',
  'leaps', 'leap', 'leapt', 'leaped',
  'dives', 'dive', 'dove', 'dived',
  'slams', 'slam', 'slammed',
  'wrenches', 'wrench', 'wrenched',
  'forces', 'force', 'forced',
  'breaks', 'break', 'broke',
  'cuts', 'cut',
  'eases', 'ease', 'eased',
  'slips', 'slip', 'slipped',
  'ducks', 'duck', 'ducked',
  'kicks', 'kick', 'kicked',
  'throws', 'throw', 'threw',
  'pulls', 'pull', 'pulled',
  'pushes', 'push', 'pushed',
  'unlocks', 'unlock', 'unlocked',
  'disarms', 'disarm', 'disarmed',
  'tackles', 'tackle', 'tackled',
  'snatches', 'snatch', 'snatched',
  'yanks', 'yank', 'yanked',
  'hurls', 'hurl', 'hurled',
  'lunges', 'lunge', 'lunged',
  'sprints', 'sprint', 'sprinted',
  'dashes', 'dash', 'dashed',
  'seizes', 'seize', 'seized',
  'wrestles', 'wrestle', 'wrestled',
  'strikes', 'strike', 'struck',
  'stabs', 'stab', 'stabbed',
  'shoots', 'shoot', 'shot',
  'climbs', 'climb', 'climbed',
  'scales', 'scale', 'scaled',
  'vaults', 'vault', 'vaulted',
  'sneaks', 'sneak', 'sneaked', 'snuck',
  'crawls', 'crawl', 'crawled',
  'reaches', 'reach', 'reached',
  'presses', 'press', 'pressed',
  'flips', 'flip', 'flipped',
  'twists', 'twist', 'twisted',
  'jams', 'jam', 'jammed',
  'rips', 'rip', 'ripped',
  'tears', 'tear', 'tore',
  'drags', 'drag', 'dragged',
  'hauls', 'haul', 'hauled',
  'hoists', 'hoist', 'hoisted',
  'aims', 'aim', 'aimed',
  'triggers', 'trigger', 'triggered',
  'disables', 'disable', 'disabled',
  'decides', 'decide', 'decided',
  'chooses', 'choose', 'chose',
  'confronts', 'confront', 'confronted',
  'grips', 'grip', 'gripped',
  'works', 'work', 'worked',
];

/** Observational/passive-register verbs — a protagonist performing one of
 *  these, as the clause's near-leading subject, is watching the story
 *  happen rather than driving it. The counterweight lexicon to
 *  DECISIVE_ACTION_VERBS: positive evidence FOR the "genuinely spectator
 *  protagonist" fixture shape D1's fix note calls for, not merely the
 *  absence of a decisive-verb hit. */
const SPECTATOR_VERBS = [
  'watches', 'watch', 'watched',
  'waits', 'wait', 'waited',
  'stares', 'stare', 'stared',
  'freezes', 'freeze', 'froze',
  'observes', 'observe', 'observed',
  'listens', 'listen', 'listened',
  'stands', 'stand', 'stood',
  'sits', 'sit', 'sat',
  'looks on', 'look on', 'looked on',
];

/** Auxiliary tokens whose IMMEDIATE presence right after the named subject
 *  signals a passive construction ("June was shoved," "June gets grabbed")
 *  — matching one of these blocks a decisive/spectator-verb credit, so the
 *  protagonist being the grammatical OBJECT of someone else's action is not
 *  mistaken for the protagonist acting. Deliberately short (this module
 *  does no real parsing) — see the file header's CANNOT list for
 *  constructions this guard does not cover. */
const PASSIVE_AUX_RE = /^\s*(?:'s\s+)?(?:was|were|is|are|been|being|gets|got)\b/i;

/** How far past the protagonist's name (in characters) this module looks
 *  for a decisive/spectator verb within the same clause. Generous enough to
 *  span a short appositive or adverbial interruption ("June, badly shaken,
 *  still turns the key") without reaching so far that an unrelated verb
 *  attached to a DIFFERENT character sharing the same punctuation-free
 *  clause gets credited to the protagonist instead — a real, accepted
 *  residual risk documented in the file header's SOURCE 1 CANNOT list and
 *  exercised directly by this module's own "same clause, no punctuation
 *  separator" test fixture (tests/core/agency-signal.test.ts) rather than
 *  hidden. */
const VERB_SEARCH_WINDOW = 40;

/** How close to the START OF ITS OWN COMMA-DELIMITED SEGMENT the
 *  protagonist's name must appear to be treated as a plausible grammatical
 *  subject (a "near-leading" position). Measuring from the segment start
 *  (see commaSegmentStart below) rather than the whole clause start is what
 *  lets a fronted participial/prepositional phrase — "Cornered against the
 *  ledge, Kestrel grabs the rope" — still score Kestrel as the subject
 *  (she is near-leading WITHIN her own comma segment, "Kestrel grabs the
 *  rope") without also being fooled by "Silas grabs Kestrel and shoves her"
 *  (Kestrel sits mid-segment, far from ITS start, correctly scoring as the
 *  object). Allows a short leading quote/dash prefix too (a clause that
 *  begins mid-em-dash-split: '"June turns...'). This is a positional proxy
 *  for subject-hood, not real parsing — see the file header's CANNOT list. */
const SUBJECT_LEAD_WINDOW = 3;

/** Index just past the last comma before `nameIndex` in `clause`, or 0 if
 *  there is none — the start of the comma-delimited segment the name falls
 *  in. See SUBJECT_LEAD_WINDOW's comment for why this, not the whole
 *  clause's start, is the right reference point for "near-leading." */
function commaSegmentStart(clause: string, nameIndex: number): number {
  const lastComma = clause.lastIndexOf(',', nameIndex);
  return lastComma === -1 ? 0 : lastComma + 1;
}

function buildVerbRegex(verbs: string[]): RegExp {
  return new RegExp(`\\b(?:${verbs.map(escapeRegExp).join('|')})\\b`, 'i');
}

const DECISIVE_VERB_RE = buildVerbRegex(DECISIVE_ACTION_VERBS);
const SPECTATOR_VERB_RE = buildVerbRegex(SPECTATOR_VERBS);

/** Split a scene's action/turn text into clause-sized chunks so a
 *  multi-sentence action paragraph (D1's own vault-scene paragraph names
 *  BOTH June and Vance) doesn't let one character's verb get credited to
 *  the other just because they share a sentence. Splits on sentence-ending
 *  punctuation and on ` -- `/em-dash-delimited asides — the same
 *  punctuation-based approach fountain-analyzer.ts's own splitClueSentences
 *  and splitSentences use for the identical problem, reimplemented locally
 *  per this file's no-forward-import policy (see file header). */
function splitClauses(text: string): string[] {
  return text
    .split(/[.!?]+(?=\s|$)|\s+--\s+|—|;/g)
    .map(s => s.trim())
    .filter(Boolean);
}

/** Case-insensitive, word-boundary regex for the literal protagonist name
 *  string the caller supplied (see file header — this module does no
 *  protagonist inference or coreference resolution of its own). */
function buildNameRegex(protagonist: string): RegExp {
  return new RegExp(`\\b${escapeRegExp(protagonist.trim())}\\b`, 'gi');
}

/** Find the first clause where the protagonist sits near-leading and a verb
 *  matching `verbRe` appears within VERB_SEARCH_WINDOW chars afterward, with
 *  no immediate passive-voice auxiliary in between. Returns the matched
 *  clause text (evidence) or null. Only the clause's FIRST name occurrence
 *  is checked per clause (see file header's documented CANNOT). */
function findSubjectVerbEvidence(text: string, nameRe: RegExp, verbRe: RegExp): string | null {
  for (const clause of splitClauses(text)) {
    nameRe.lastIndex = 0;
    const nameMatch = nameRe.exec(clause);
    if (!nameMatch) continue;
    const segmentStart = commaSegmentStart(clause, nameMatch.index);
    if (nameMatch.index - segmentStart > SUBJECT_LEAD_WINDOW) continue;
    const afterName = clause.slice(nameMatch.index + nameMatch[0].length);
    if (PASSIVE_AUX_RE.test(afterName)) continue;
    const window = afterName.slice(0, VERB_SEARCH_WINDOW);
    if (verbRe.test(window)) return clause;
  }
  return null;
}

function textMentionsName(text: string, nameRe: RegExp): boolean {
  nameRe.lastIndex = 0;
  return nameRe.test(text);
}

/**
 * Per-scene agency read for one protagonist — the shared primitive both
 * detectPeakAgency and detectAct3Agency build on. UNWIRED: see file header.
 */
export function detectSceneAgency(
  record: ScreenplaySceneRecord,
  protagonist: string,
): AgencySceneSignal {
  const nameRe = buildNameRegex(protagonist);
  const actionText = [record.dramaticTurn, ...record.visualBeats].filter(Boolean).join(' • ');

  const decisiveEvidence = actionText ? findSubjectVerbEvidence(actionText, nameRe, DECISIVE_VERB_RE) : null;
  const hasDecisiveAction = decisiveEvidence !== null;

  const normalizedProtagonist = protagonist.trim().toLowerCase();
  const hasDialogueInitiative =
    typeof record.powerHolder === 'string' &&
    record.powerHolder.trim().toLowerCase() === normalizedProtagonist;

  const spectatorEvidence =
    !hasDecisiveAction && actionText ? findSubjectVerbEvidence(actionText, nameRe, SPECTATOR_VERB_RE) : null;
  const hasSpectatorVerb = spectatorEvidence !== null;

  const protagonistMentioned = actionText ? textMentionsName(actionText, nameRe) : false;

  let evidenceKind: AgencyEvidenceKind = null;
  let evidence: string | null = null;
  if (hasDecisiveAction) {
    evidenceKind = 'decisive_action';
    evidence = decisiveEvidence;
  } else if (hasDialogueInitiative) {
    evidenceKind = 'dialogue_initiative';
    evidence = `powerHolder: ${record.powerHolder}`;
  } else if (hasSpectatorVerb) {
    evidenceKind = 'spectator_verb';
    evidence = spectatorEvidence;
  }

  return {
    sceneIdx: record.sceneIdx,
    hasDecisiveAction,
    hasDialogueInitiative,
    hasSpectatorVerb,
    protagonistMentioned,
    evidenceKind,
    evidence,
  };
}

/** The scene(s), if any, tied for this script's maximum suspenseDelta — the
 *  same "peak-intensity climax" proxy D1's own worked example names. Returns
 *  [] for an empty record set. */
function findPeakSceneIdxs(records: ScreenplaySceneRecord[]): number[] {
  if (records.length === 0) return [];
  const maxSuspense = Math.max(...records.map(r => r.suspenseDelta));
  return records.filter(r => r.suspenseDelta === maxSuspense).map(r => r.sceneIdx);
}

/**
 * Agency read at the script's peak-suspense scene(s) — responds to D1.
 * UNWIRED: see file header.
 */
export function detectPeakAgency(
  records: ScreenplaySceneRecord[],
  protagonist: string,
): PeakAgencyResult {
  const peakSceneIdxs = findPeakSceneIdxs(records);
  const byIdx = new Map(records.map(r => [r.sceneIdx, r]));
  const signals = peakSceneIdxs
    .map(idx => byIdx.get(idx))
    .filter((r): r is ScreenplaySceneRecord => r !== undefined)
    .map(r => detectSceneAgency(r, protagonist));

  const anyAgencyAtPeak = signals.some(s => s.hasDecisiveAction || s.hasDialogueInitiative);
  const allSpectatorAtPeak =
    signals.length > 0 && signals.every(s => s.protagonistMentioned && !s.hasDecisiveAction && !s.hasDialogueInitiative);

  return { peakSceneIdxs, signals, anyAgencyAtPeak, allSpectatorAtPeak };
}

export interface Act3AgencyOptions {
  /** Fraction of the document's scene count, from the end, treated as
   *  "Act 3." Default 0.25: on D2's own 14-scene worked example,
   *  Math.ceil(14 * 0.25) === 4, exactly reproducing D2's "all 4 Act 3
   *  scenes" wording — not tuned to that script on purpose, it falls out of
   *  a plain quarter-of-the-document definition, matching the standard
   *  screenwriting rule of thumb that Act 3 is roughly the final quarter. */
  fraction?: number;
  /** Floor on the window size regardless of fraction, so a very short script
   *  still gets at least one "Act 3" scene rather than zero. */
  minScenes?: number;
}

function act3SceneWindow(records: ScreenplaySceneRecord[], opts?: Act3AgencyOptions): ScreenplaySceneRecord[] {
  if (records.length === 0) return [];
  const fraction = opts?.fraction ?? 0.25;
  const minScenes = opts?.minScenes ?? 1;
  const windowSize = Math.min(records.length, Math.max(minScenes, Math.ceil(records.length * fraction)));
  return records.slice(records.length - windowSize);
}

/**
 * Agency read across the script's final act-3-shaped scene window —
 * responds to D2. UNWIRED: see file header.
 */
export function detectAct3Agency(
  records: ScreenplaySceneRecord[],
  protagonist: string,
  opts?: Act3AgencyOptions,
): Act3AgencyResult {
  const act3Records = act3SceneWindow(records, opts);
  const signals = act3Records.map(r => detectSceneAgency(r, protagonist));
  const initiativeCount = signals.filter(s => s.hasDecisiveAction || s.hasDialogueInitiative).length;
  const sceneCount = act3Records.length;
  return {
    actSceneIdxs: act3Records.map(r => r.sceneIdx),
    signals,
    initiativeCount,
    sceneCount,
    initiativeRate: sceneCount > 0 ? initiativeCount / sceneCount : null,
  };
}

/** Reproduces structure.ts's PROTAGONIST_PASSIVITY_CLIMAX `isPassive` shape
 *  exactly (`emotionalShift === 'neutral' && !clockRaised &&
 *  seededClueIds.length === 0`, ~line 815). Deliberately duplicated here
 *  rather than imported: structure.ts (server/nvm/revision/passes/
 *  structure.ts) is itself part of the always-scoring path
 *  (ALWAYS_SCORING_DIR_PREFIXES in scripts/check-scoring-receipt.mjs
 *  includes server/nvm/revision/passes/**), and importing forward from it
 *  into this unwired module would be exactly the coupling the file header
 *  declines. If the legacy predicate ever changes, this line and both
 *  structure.ts/intention.ts call sites must change together — a
 *  pre-existing single-source-of-truth gap this module inherits, per
 *  reversal-detection.ts's identical note on legacySuspenseDipCount. */
function legacyIsPassive(record: ScreenplaySceneRecord): boolean {
  return record.emotionalShift === 'neutral' && !record.clockRaised && record.seededClueIds.length === 0;
}

/**
 * Bounded comparison stat (NOT a rule, NOT a deduction) for D1: does an
 * agency-aware read of the peak scene(s) disagree with the legacy
 * neutral/clock/clue predicate. UNWIRED: see file header.
 */
export function computeD1AgencyDelta(
  records: ScreenplaySceneRecord[],
  protagonist: string,
): D1AgencyDeltaResult {
  const peak = detectPeakAgency(records, protagonist);
  const peakRecords = records.filter(r => peak.peakSceneIdxs.includes(r.sceneIdx));
  const legacyPassiveAtPeak = peakRecords.length > 0 && peakRecords.every(legacyIsPassive);
  const detectedAgencyAtPeak = peak.anyAgencyAtPeak;
  return {
    legacyPassiveAtPeak,
    detectedAgencyAtPeak,
    disagreement: legacyPassiveAtPeak && detectedAgencyAtPeak,
  };
}

/**
 * Bounded comparison stat (NOT a rule, NOT a deduction) for D2: does an
 * agency-aware read of the Act-3 scene window disagree with "every Act 3
 * scene matches the legacy passive shape." UNWIRED: see file header.
 */
export function computeD2AgencyDelta(
  records: ScreenplaySceneRecord[],
  protagonist: string,
  opts?: Act3AgencyOptions,
): D2AgencyDeltaResult {
  const act3Records = act3SceneWindow(records, opts);
  const act3 = detectAct3Agency(records, protagonist, opts);
  const legacyAllPassiveAct3 = act3Records.length > 0 && act3Records.every(legacyIsPassive);
  return {
    legacyAllPassiveAct3,
    detectedInitiativeCount: act3.initiativeCount,
    act3SceneCount: act3.sceneCount,
    disagreement: legacyAllPassiveAct3 && act3.initiativeCount > 0,
  };
}
