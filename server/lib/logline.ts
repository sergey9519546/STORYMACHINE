// Pitch-content builder — the deterministic, keyless source of the "actual
// pitch content" the Pitch Kit and coverage exports were missing (adversarial
// finding: health score + tension curve + a bare character list is not a
// pitch). Two independent responsibilities live here:
//
//   1. Title-page extraction (extractTitlePage) — a small, deterministic
//      parser for the leading `Key: Value` block Fountain's spec calls the
//      title page (Title/Credit/Author/...). src/lib/fountain.ts's
//      parseFountain() does NOT expose these as a distinct block type (every
//      leading `Key: Value` line currently falls through to plain 'action'
//      blocks — confirmed by reading that file read-only before writing
//      this), so this is the "write a small extractor" branch of that
//      decision, not a duplicate of something the parser already does.
//
//   2. Pitch content (buildLogline / buildGenreLine / buildSynopsis /
//      buildCompsSlot, composed by buildPitchContent) — a logline, a
//      genre/tone line, a factual synopsis, and a labeled comps placeholder,
//      assembled ONLY from signals already present in a ScriptDoctorReport +
//      its ScreenplaySceneRecord[] (server/nvm/analyze/*, read-only from
//      here) plus the raw Fountain text for one narrowly-scoped need
//      (attributing a dialogue line to the protagonist by name — no report/
//      record shape carries per-line speaker attribution). Every builder is
//      documented at its definition with exactly which inputs it reads and
//      exactly what it degrades to when a signal is absent. The one hard
//      rule threaded through all of them: a missing signal omits its clause
//      or the whole field — it is never papered over with invented story
//      content. Connective scaffolding words ("When", "must", "before") are
//      not story content and are used freely; only claims about THIS
//      script's plot/characters must trace back to an extracted signal.
//
// Pure functions throughout: no I/O, no Date.now(), no randomness, no
// external requests — same discipline as coverage-html.ts/pitchkit-html.ts,
// which are this module's only two callers (via server/routes/export.ts).

import { parseFountain, type FountainBlock } from '../../src/lib/fountain.ts';
import type { ScriptDoctorReport } from '../nvm/analyze/types.ts';
import type { ScreenplaySceneRecord } from '../nvm/screenplay/memory.ts';

// ── Title page extraction ────────────────────────────────────────────────────

export interface TitlePageInfo {
  title: string | null;
  author: string | null;
  credit: string | null;
}

const EMPTY_TITLE_PAGE: TitlePageInfo = { title: null, author: null, credit: null };

// A title-page key: an alpha-leading run of letters/digits/spaces/dashes/
// underscores, followed by a colon. Deliberately excludes '.', which keeps
// this from ever matching a scene heading like "INT. HOUSE - DAY" (no colon
// immediately follows a valid key run there) or a transition like "CUT TO:"
// (all-caps single-word-ish transitions are extremely unlikely to collide
// with the small known key set below, and even if one did, requiring the
// FIRST line of the document to match is what actually gates this — a
// mid-document "CUT TO:" is never reachable since the block ends at the
// first blank line).
const TITLE_PAGE_KEY_RE = /^([A-Za-z][A-Za-z0-9 _-]*):\s*(.*)$/;

/** Strip Fountain emphasis markup (*italic*, **bold**, ***bold italic***,
 *  _underline_) from a title-page value — screenwriters commonly wrap the
 *  Title: value in these, e.g. `Title: _**BRICK & STEEL**_`, and a reader
 *  expects the plain string, not the markup. */
function stripFountainEmphasis(value: string): string {
  return value.replace(/\*{1,3}/g, '').replace(/^_+|_+$/g, '').trim();
}

/**
 * Parse the leading `Key: Value` title-page block (Fountain spec) from raw
 * screenplay text. Only Title/Author(s)/Credit are extracted — the three
 * keys this codebase has an actual fallback use for; other recognized keys
 * (Source, Draft date, Contact, ...) are intentionally left unparsed since
 * nothing consumes them.
 *
 * Degradation: the whole title page is optional. If the FIRST line of the
 * document isn't a `Key: Value` line, there is no title page at all and
 * every field comes back null (a screenplay that opens straight on
 * "FADE IN:" or a scene heading is completely normal Fountain). A value
 * spanning multiple lines (an indented continuation, e.g. a two-line Title)
 * is joined with a single space. The block ends at the first blank line or
 * the first non-continuation line, whichever comes first — exactly where
 * the Fountain spec says the title page ends.
 */
export function extractTitlePage(fountain: string): TitlePageInfo {
  if (!fountain) return EMPTY_TITLE_PAGE;
  const lines = fountain.split('\n');
  if (lines.length === 0) return EMPTY_TITLE_PAGE;

  const values: Record<string, string[]> = {};
  let currentKey: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') break; // blank line terminates the title-page block

    const m = line.match(TITLE_PAGE_KEY_RE);
    if (m) {
      currentKey = m[1].trim().toLowerCase();
      const val = m[2].trim();
      values[currentKey] = val ? [val] : [];
      continue;
    }

    if (currentKey && /^\s+\S/.test(line)) {
      // Indented continuation of the current key's value.
      values[currentKey].push(line.trim());
      continue;
    }

    // First line wasn't a Key: Value line at all -> no title page present.
    if (i === 0) return EMPTY_TITLE_PAGE;
    // A later non-continuation, non-key line ends the block early.
    break;
  }

  const title = values['title']?.join(' ').trim();
  const author = (values['author'] ?? values['authors'])?.join(' ').trim();
  const credit = values['credit']?.join(' ').trim();

  return {
    title: title ? stripFountainEmphasis(title) : null,
    author: author ? stripFountainEmphasis(author) : null,
    credit: credit || null,
  };
}

// ── Small shared helpers ─────────────────────────────────────────────────────

function truncate(text: string, maxLen: number): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1).trimEnd()}…`;
}

function capitalizeFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function ensureSentence(text: string): string {
  const t = capitalizeFirst(text.trim());
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

function stripTrailingPunctuation(text: string): string {
  return text.trim().replace(/[.!?]+$/, '');
}

// Strip Fountain character-cue decorations, matching fountain-analyzer.ts's
// own normalizeCharacterName exactly (deliberate small duplication — see
// server/lib/breakdown.ts's file header for the established precedent: two
// deliberately independent consumers reading the same block shape, rather
// than exposing an internal fountain-analyzer.ts helper across the nvm/**
// import-only boundary this file must respect).
function normalizeCueName(raw: string): string {
  return raw
    .replace(/\^\s*$/, '')
    .replace(/\(\s*V\.O\.\s*\)/gi, '')
    .replace(/\(\s*O\.S\.\s*\)/gi, '')
    .replace(/\(\s*CONT'?D\s*\)/gi, '')
    .trim();
}

// ── Logline ───────────────────────────────────────────────────────────────────

const MAX_CLAUSE_LEN = 140;

/** Lexicon of first-person want/need phrasing screenwriters actually write
 *  into dialogue. Deliberately narrow and literal (no inference) — a hit
 *  here means the character SAID something in this shape, not that the
 *  builder inferred a want from context. */
const WANT_PATTERNS: RegExp[] = [
  /\bI need to\b/i,
  /\bI'?ve got to\b/i,
  /\bI have got to\b/i,
  /\bI have to\b/i,
  /\bI want\b/i,
  /\ball I want\b/i,
  /\bI'?m going to\b/i,
  /\bmy only (?:chance|choice|hope)\b/i,
  /\bno choice but to\b/i,
  /\bI'?m not (?:leaving|going)\b/i,
];

/** GOAL/WANT — scans the protagonist's own dialogue lines, in document
 *  order, for the first line matching WANT_PATTERNS. Requires the raw
 *  Fountain text because no report/record shape attributes dialogue lines
 *  to a speaker; this is the one place that text is read directly rather
 *  than through analyzeFountainText's records.
 *  Degradation: no dialogue block is ever attributed to `protagonist`, or
 *  none of their lines match the want lexicon -> null (omit the goal
 *  clause entirely; never invent a want the character didn't voice). */
export function findApparentGoal(fountain: string, protagonist: string): string | null {
  if (!fountain || !protagonist) return null;
  const blocks: FountainBlock[] = parseFountain(fountain);
  let currentSpeaker = '';

  for (const b of blocks) {
    const text = b.text.trim();
    if (!text) continue;

    if (b.type === 'character' || b.type === 'dual_dialogue') {
      currentSpeaker = normalizeCueName(text);
    } else if (b.type === 'dialogue') {
      if (currentSpeaker !== protagonist) continue;
      if (WANT_PATTERNS.some(re => re.test(text))) {
        return truncate(text, MAX_CLAUSE_LEN);
      }
    }
  }
  return null;
}

/** INCITING INCIDENT — the opening scene's dramaticTurn (preferred) or
 *  revelation, preferring the scene the purpose heuristic actually tagged
 *  'introduce_conflict' (a cold open) and falling back to scene 0 whatever
 *  its purpose (usually 'establish_world') — either way this is a real
 *  detected beat from the opening of the actual script, not an invented
 *  "once upon a time" framing.
 *  Degradation: no records at all, or the chosen scene has neither a
 *  detected dramaticTurn nor a revelation -> null (omit the "When ..."
 *  clause). */
export function findIncitingIncident(records: ScreenplaySceneRecord[]): string | null {
  if (records.length === 0) return null;
  const scene = records.find(r => r.purpose === 'introduce_conflict') ?? records[0];
  const text = scene.dramaticTurn || scene.revelation;
  return text ? truncate(text, MAX_CLAUSE_LEN) : null;
}

/** CENTRAL OBSTACLE — three-tier fallback, checked in order, each reading a
 *  different existing signal channel:
 *   (a) Relationship shifts: sum every scene's relationshipShifts by pair
 *       across the whole script; if the protagonist's worst (most negative
 *       = most trust-eroding) pair total is negative, the obstacle is that
 *       fracturing relationship.
 *   (b) Antagonist signals: the scene with the highest betrayalSignal whose
 *       powerHolder is a different, named character becomes the obstacle
 *       ("opposition from X") — betrayal-dominant + someone else holding
 *       control is exactly what "antagonist signals" means in this report
 *       shape (there is no literal antagonist field).
 *   (c) Dominant conflict: the climax-purpose scene's dramaticTurn/
 *       revelation, or (if no scene was tagged 'climax') the single
 *       highest-suspenseDelta scene's, used as-is.
 *  Degradation: if none of the three tiers finds anything, null (omit the
 *  "before ..." clause). */
export function findCentralObstacle(records: ScreenplaySceneRecord[], protagonist: string): string | null {
  if (records.length === 0 || !protagonist) return null;

  // Tier (a) — relationship shifts.
  const netByPair = new Map<string, number>();
  for (const r of records) {
    for (const shift of r.relationshipShifts ?? []) {
      netByPair.set(shift.pairKey, (netByPair.get(shift.pairKey) ?? 0) + shift.amount);
    }
  }
  let worstPair: string | null = null;
  let worstAmount = 0;
  for (const [pairKey, amount] of netByPair) {
    if (!pairKey.split('|').includes(protagonist)) continue;
    if (amount < worstAmount) { worstAmount = amount; worstPair = pairKey; }
  }
  if (worstPair) {
    const other = worstPair.split('|').find(n => n !== protagonist);
    if (other) return `a fracturing bond with ${other}`;
  }

  // Tier (b) — antagonist signals (betrayal + a distinct power-holder).
  let bestBetrayal = 0;
  let antagonist: string | null = null;
  for (const r of records) {
    const betrayal = r.betrayalSignal ?? 0;
    if (betrayal > bestBetrayal && r.powerHolder && r.powerHolder !== protagonist) {
      bestBetrayal = betrayal;
      antagonist = r.powerHolder;
    }
  }
  if (antagonist) return `opposition from ${antagonist}`;

  // Tier (c) — dominant conflict: climax scene, else the single
  // highest-suspense scene (only if it actually raises tension).
  const climax = records.find(r => r.purpose === 'climax');
  const climaxText = climax?.dramaticTurn || climax?.revelation;
  if (climaxText) return truncate(climaxText, MAX_CLAUSE_LEN);

  const peak = records.reduce((a, b) => (b.suspenseDelta > a.suspenseDelta ? b : a));
  if (peak.suspenseDelta > 0) {
    const peakText = peak.dramaticTurn || peak.revelation;
    if (peakText) return truncate(peakText, MAX_CLAUSE_LEN);
  }

  return null;
}

/** Assembles the four possible clauses into one sentence. Every branch uses
 *  only real extracted data plus fixed connective English — no branch
 *  invents plot content. `sceneCount` is only used by the fully-degraded
 *  branch (no goal, no obstacle), where it is the one true fact left to
 *  state about the script. */
function assembleLogline(
  protagonist: string, sceneCount: number,
  inciting: string | null, goal: string | null, obstacle: string | null,
): string {
  const incitingClause = inciting ? `When ${stripTrailingPunctuation(inciting)}, ` : '';

  if (goal && obstacle) {
    return `${incitingClause}${protagonist} must contend with “${stripTrailingPunctuation(goal)}” before ${stripTrailingPunctuation(obstacle)}.`;
  }
  if (goal) {
    return `${incitingClause}${protagonist} must contend with “${stripTrailingPunctuation(goal)}”.`;
  }
  if (obstacle) {
    return `${incitingClause}${protagonist} must face ${stripTrailingPunctuation(obstacle)}.`;
  }
  return `${incitingClause}${protagonist} is the central figure across ${sceneCount} scene${sceneCount === 1 ? '' : 's'}.`;
}

/**
 * Build the logline. Inputs: report.characters[0] (already ordered by
 * total dialogue-line count descending — see FountainAnalysis.characters'
 * own doc comment — so index 0 IS the protagonist by the report's own
 * definition, no re-derivation needed), `records` for the inciting/obstacle
 * signals, and the raw `fountain` text for the goal/want dialogue scan.
 * Degradation: report.characters is empty (nobody speaks at all, e.g. an
 * action-only or zero-scene submission) -> null, the one case where there
 * is no honest subject for the sentence at all. Every other missing signal
 * degrades one clause at a time via assembleLogline above.
 */
export function buildLogline(
  report: ScriptDoctorReport, records: ScreenplaySceneRecord[], fountain: string,
): string | null {
  const protagonist = report.characters?.[0];
  if (!protagonist) return null;

  const inciting = findIncitingIncident(records);
  const goal = findApparentGoal(fountain, protagonist);
  const obstacle = findCentralObstacle(records, protagonist);

  return assembleLogline(protagonist, report.sceneCount, inciting, goal, obstacle);
}

// ── Genre / tone ──────────────────────────────────────────────────────────────

/**
 * Genre/tone line. ScriptDoctorReport (server/nvm/analyze/types.ts, read
 * read-only) carries no genre field today — genre only exists as an
 * optional StoryContext argument to runScriptDoctor, which is never
 * threaded back into the report it returns. `genre` here is therefore
 * always undefined from every current caller; the parameter exists so this
 * builder is already correct the day a report DOES carry a configured
 * genre, instead of requiring a second wave to add the check.
 * Degradation: no genre -> null (omit the whole line/section — never guess
 * a genre from content).
 */
export function buildGenreLine(genre?: string | null): string | null {
  if (!genre || !genre.trim()) return null;
  return `Genre: ${genre.trim()}`;
}

// ── Synopsis ──────────────────────────────────────────────────────────────────

/**
 * 2-3 factual sentences built from up to three act-structure beats:
 *   - setup: the 'introduce_conflict' scene, else 'establish_world', else
 *     scene 0 — the same "real opening beat" precedent as
 *     findIncitingIncident.
 *   - midpoint turn: the scene tagged 'turning_point' by the purpose
 *     heuristic (positionFrac 0.4-0.6 AND a detected dramaticTurn — see
 *     fountain-analyzer.ts's detectPurpose, read-only).
 *   - climax: the scene tagged 'climax'.
 * Each beat contributes one sentence (its dramaticTurn, else its
 * revelation) ONLY if that scene exists and has non-empty text — a beat
 * with no textual signal is skipped, not padded. Degradation: zero
 * qualifying beats -> null (omit the synopsis entirely).
 */
export function buildSynopsis(records: ScreenplaySceneRecord[]): string | null {
  if (records.length === 0) return null;

  const setup = records.find(r => r.purpose === 'introduce_conflict')
    ?? records.find(r => r.purpose === 'establish_world')
    ?? records[0];
  const midpoint = records.find(r => r.purpose === 'turning_point');
  const climax = records.find(r => r.purpose === 'climax');

  const sentences: string[] = [];
  for (const scene of [setup, midpoint, climax]) {
    if (!scene) continue;
    const text = scene.dramaticTurn || scene.revelation;
    if (text) sentences.push(ensureSentence(truncate(text, 200)));
  }

  return sentences.length > 0 ? sentences.slice(0, 3).join(' ') : null;
}

// ── Comps slot ────────────────────────────────────────────────────────────────

/** A labeled placeholder, never a fabricated comparable title — comps
 *  require human market judgment this deterministic engine has no basis
 *  for. Always present, never conditional, so the pitch document names the
 *  gap instead of silently omitting a section a producer expects to see. */
export const COMPS_PLACEHOLDER = 'Comparable titles: ___';

export function buildCompsSlot(): string {
  return COMPS_PLACEHOLDER;
}

// ── Combined builder ──────────────────────────────────────────────────────────

export interface PitchContent {
  logline: string | null;
  genreLine: string | null;
  synopsis: string | null;
  comps: string;
}

/** Runs all four builders over one shared (report, records, fountain, genre)
 *  input set. Convenience for callers (server/routes/export.ts) that want
 *  every pitch-content field at once; each field's own degradation rule is
 *  documented at its individual builder above. */
export function buildPitchContent(
  report: ScriptDoctorReport, records: ScreenplaySceneRecord[], fountain: string,
  genre?: string | null,
): PitchContent {
  return {
    logline: buildLogline(report, records, fountain),
    genreLine: buildGenreLine(genre),
    synopsis: buildSynopsis(records),
    comps: buildCompsSlot(),
  };
}
