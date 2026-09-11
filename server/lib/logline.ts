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

/**
 * The share of all spoken dialogue lines the most-present speaker has to hold
 * before this module will write a logline about them at all.
 *
 * ── Why a gate exists (2026-09-11, producer-tier discovery defect #7) ───────
 *
 * buildLogline's subject is `report.characters[0]` — the speaker with the most
 * dialogue lines, by that field's own documented ordering. On a real screenplay
 * that speaker IS the protagonist. On a document that has no protagonist it is
 * merely whoever happens to lead a flat distribution, and the logline becomes a
 * confident sentence about a character who is not the subject of anything. The
 * producer's report opened with it.
 *
 * ── MEASURED (2026-09-11, keyless, on the 33 scripts committed to this repo:
 *    the 20 CC0 shorts in data/screenplays/, the 12 blind-pair fixtures in
 *    tests/fixtures/blind-pairs/, and tests/fixtures/feature-length/
 *    assembled-feature.fountain) ─────────────────────────────────────────────
 *
 *   most-present speaker's share of dialogue lines
 *     lowest on the 32 real shorts ....... 27.8%  (close-quarters.fountain)
 *     highest ............................ 62.1%  (signal-drift-bad.fountain)
 *     assembled-feature.fountain ..........  7.3%  (504 dialogue lines, 231
 *                                                  scenes, twenty unrelated
 *                                                  stories concatenated)
 *
 * The distribution has one clean gap — 7.3% to 27.8% — and the only thing on
 * the low side of it is the one document in the repository that genuinely has
 * no protagonist. The threshold is set inside that gap.
 *
 * ── THE COST, stated rather than hidden ─────────────────────────────────────
 *
 * Loglines derived: 33 of 33 before this gate, 32 of 33 after. The single loss
 * is the assembled feature, which is the intended loss: it is a concatenation,
 * and a logline about it was always a false claim. No real short loses its
 * logline, and the nearest real script to the threshold clears it by 7.8
 * points. Registered in docs/CLAIMS_REGISTER.md.
 *
 * If a future corpus puts a genuine single-protagonist script under 20%, this
 * gate costs that script its logline. That is the deliberate direction of the
 * error: a missing logline is an omission a reader can see, and a logline about
 * the wrong person is a claim they cannot check.
 */
export const PROTAGONIST_MIN_DIALOGUE_SHARE = 0.20;

export interface SpeakerShare {
  speaker: string;
  /** Dialogue BLOCKS attributed to this speaker (one per cue -> dialogue pair). */
  lines: number;
  /** `lines` as a fraction of every attributed dialogue block in the script. */
  share: number;
}

/** Dialogue-line share per speaker, ranked descending (ties broken by name so
 *  the result is deterministic). Counts the same cue -> dialogue block pairs
 *  findApparentGoal walks, with the same normalizeCueName treatment, so the two
 *  cannot disagree about who said how much.
 *
 *  Verified against `report.characters[0]` — the independently computed
 *  most-dialogue speaker this module takes as its subject — on all 33 committed
 *  scripts: 0 disagreements. The gate below therefore measures the share of the
 *  speaker the logline is actually about. */
export function dialogueShares(fountain: string): SpeakerShare[] {
  if (!fountain) return [];
  const counts = new Map<string, number>();
  let currentSpeaker = '';
  for (const b of parseFountain(fountain)) {
    const text = b.text.trim();
    if (!text) continue;
    if (b.type === 'character' || b.type === 'dual_dialogue') {
      currentSpeaker = normalizeCueName(text);
    } else if (b.type === 'dialogue' && currentSpeaker) {
      counts.set(currentSpeaker, (counts.get(currentSpeaker) ?? 0) + 1);
    }
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  if (total === 0) return [];
  return [...counts.entries()]
    .map(([speaker, lines]) => ({ speaker, lines, share: lines / total }))
    .sort((a, b) => b.lines - a.lines || a.speaker.localeCompare(b.speaker));
}

/** Does `speaker` hold enough of this script's dialogue for a logline about
 *  them to be a claim rather than an artifact of a flat distribution?
 *  A speaker who says nothing at all (or whom no dialogue block is attributed
 *  to) fails, which is the same answer as "no protagonist". */
export function hasProtagonistDialogueShare(fountain: string, speaker: string): boolean {
  if (!speaker) return false;
  const found = dialogueShares(fountain).find(s => s.speaker === speaker);
  return found !== undefined && found.share >= PROTAGONIST_MIN_DIALOGUE_SHARE;
}

/** Every dialogue block's text, per scene index, joined — the evidence
 *  frameSceneText checks a quoted line against.
 *
 *  Scene index is the count of scene headings parseFountain reports, which is
 *  the same 0-based indexing ScreenplaySceneRecord.sceneIdx uses (both segment
 *  the document at its scene headings), so `sceneDialogue[r.sceneIdx]` is that
 *  record's own scene and nobody else's. An out-of-range index resolves to
 *  undefined and is treated as "no dialogue evidence", never as a pass. */
export function dialogueTextByScene(fountain: string): string[] {
  const out: string[] = [];
  let sceneIdx = -1;
  for (const b of parseFountain(fountain)) {
    if (b.type === 'scene_heading') {
      sceneIdx += 1;
      out[sceneIdx] = '';
      continue;
    }
    if (sceneIdx < 0) continue;
    if (b.type === 'dialogue') out[sceneIdx] = `${out[sceneIdx] ?? ''}\n${b.text.trim()}`;
  }
  return out.map(t => (t ?? '').trim());
}

/** Collapse whitespace and case so a quoted line can be matched against the
 *  dialogue it is supposed to have come from without tripping over wrapping. */
function normalizeForQuoteMatch(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

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
      const wanted = wantSentence(text);
      if (wanted) return truncate(wanted, MAX_CLAUSE_LEN);
    }
  }
  return null;
}

/** ONE SENTENCE, and the RIGHT one — the sentence that actually voices the want.
 *
 *  ROUND 2 (2026-09-11). This channel used to return `truncate(block, 140)`: the
 *  whole dialogue BLOCK a want pattern appeared anywhere in, cut at 140
 *  characters. A screenplay speech is routinely several sentences, so the logline
 *  quoted a paragraph with its last word chopped in half. Shipped, as the first
 *  line of the producer tier for data/screenplays/runoff.fountain:
 *
 *    SARA must contend with “Creek Mile 14, Tuesday morning. Turbidity source
 *    appears to originate above the new construction pad at the tree line. The
 *    upstream contrac…”.
 *
 *  That is product-discovery finding #7 ("the producer's report opens with a
 *  machine-mangled logline") still firing after the round-1 fix, because round 1
 *  applied the one-sentence rule to findIncitingIncident and left its sibling
 *  here — one concept, two implementations, which is exactly the defect the rest
 *  of this lane is about.
 *
 *  WHY NOT `firstSentence`, the obvious symmetry: the want pattern is frequently
 *  NOT in the first sentence. dead-frequency.fountain's protagonist says "I got a
 *  call at the station. Three cars, this bridge, before sunrise. I want to know
 *  what you can see from here" — the want is the third sentence, so quoting the
 *  first would drop the only thing that made this block a goal at all and attribute
 *  a want to a line that does not voice one. This returns the sentence CONTAINING
 *  the earliest want match, which is the same "quote one sentence" rule applied to
 *  the signal this channel actually detects.
 *
 *  It can never lose a block the old code would have matched: the fallback is the
 *  whole block, for the case where a pattern straddles a sentence boundary.
 *  MEASURED on the 32 real committed scripts (keyless, 2026-09-11): 7 goal clauses
 *  before, 7 after — NONE LOST; 1 truncated mid-word before (runoff), 0 after; and
 *  6 of the 7 become a shorter, on-point quote instead of a multi-sentence speech.
 *  runoff's goes from the 140-character fragment above to "I'm going to need their
 *  discharge permit." — a want, from the same block, in one sentence.
 *  dead-frequency's goes from three sentences to "I want to know what you can see
 *  from here.", which is the sentence the detector fired on. */
function wantSentence(block: string): string | null {
  let earliest = -1;
  for (const re of WANT_PATTERNS) {
    const m = re.exec(block);
    if (m?.index !== undefined && (earliest < 0 || m.index < earliest)) earliest = m.index;
  }
  if (earliest < 0) return null;

  for (const { start, end, text } of sentenceSpans(block)) {
    if (earliest >= start && earliest < end) return text;
  }
  // A pattern that straddles a sentence boundary: keep the whole block rather
  // than drop a real signal. Never reached by any committed script.
  return block.trim();
}

/** Sentence spans of a block, with offsets, so a caller can ask which sentence a
 *  match landed in. Splits on sentence-final punctuation followed by whitespace —
 *  the SAME rule firstSentence uses, factored out here so the two cannot diverge
 *  (firstSentence is now this function's first entry). */
function sentenceSpans(text: string): Array<{ start: number; end: number; text: string }> {
  const out: Array<{ start: number; end: number; text: string }> = [];
  const re = /(.+?[.!?])(?:\s|$)/gs;
  let m: RegExpExecArray | null;
  let consumed = 0;
  while ((m = re.exec(text)) !== null) {
    out.push({ start: m.index, end: m.index + m[0].length, text: m[1].trim() });
    consumed = m.index + m[0].length;
    if (m[0].length === 0) break;
  }
  // Trailing text with no sentence-final punctuation is still a sentence.
  if (consumed < text.length) {
    const tail = text.slice(consumed);
    if (tail.trim()) out.push({ start: consumed, end: text.length, text: tail.trim() });
  }
  return out;
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
  if (!text) return null;
  // 2026-09-11: ONE SENTENCE, the same discipline frameSceneText applies to the
  // obstacle clause and wantSentence applies to the goal clause. `truncate` alone
  // let a two-sentence opening beat through and then cut it mid-word at 140
  // characters, so the assembled logline read
  //
  //   When Floor-to-ceiling glass over a city skyline gone dark except for the
  //   grid of streetlights below. A single TERM SHEET lies in the center of a…,
  //   WREN is the most-present speaker across 10 scenes.
  //
  // — a subordinate clause containing a sentence break and an ellipsis, then a
  // comma, then the main clause.
  //
  // MEASURED on the 32 real committed scripts, NARROWED TO THIS CHANNEL (round 2,
  // 2026-09-11 — the earlier wording quoted 4 before / 0 after as if it were the
  // whole logline, and it was not: a fifth script, runoff, was still shipping a
  // mid-word truncation from the GOAL channel, which is the defect wantSentence
  // fixes). This channel: 4 of 32 inciting clauses were truncated mid-word before
  // (code-blue, counter-offer, mise, the-ledger-bad), 0 after, none lost — every
  // beat that had text still has a first sentence. Across the WHOLE logline, both
  // channels together: 5 of 32 before, 0 after.
  //
  // KNOWN LIMIT, left undone deliberately and recorded rather than papered over:
  // this clause is still spliced in UNQUOTED after "When", and the beat it comes
  // from may be an action line rather than something a character says, so a
  // logline can still read "When <stage direction>, X is the most-present
  // speaker". The quote gate in frameSceneText is the fix pattern; applying it
  // here would need its own measurement of how many scripts lose the clause
  // entirely, which is a separate change with its own cost to state.
  return truncate(firstSentence(text), MAX_CLAUSE_LEN);
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
export function findCentralObstacle(
  records: ScreenplaySceneRecord[], protagonist: string, fountain = '',
): string | null {
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
  // The dialogue evidence tier (c)'s quote gate checks against — computed once
  // here rather than per candidate scene. An empty `fountain` (a caller that
  // predates this argument) yields no evidence, so no clause is ever quoted:
  // the gate fails CLOSED.
  const sceneDialogue = dialogueTextByScene(fountain);

  const climax = records.find(r => r.purpose === 'climax');
  if (climax) {
    const framed = frameSceneText(climax, sceneDialogue);
    if (framed) return framed;
  }

  const peak = records.reduce((a, b) => (b.suspenseDelta > a.suspenseDelta ? b : a));
  if (peak.suspenseDelta > 0) {
    const framed = frameSceneText(peak, sceneDialogue);
    if (framed) return framed;
  }

  return null;
}

/** Frames tier (c)'s raw scene text as a noun phrase.
 *
 *  Tiers (a) and (b) return grammatical noun phrases ("a fracturing bond with
 *  MARCUS", "opposition from VANCE") that slot cleanly into assembleLogline's
 *  "<protagonist> must face ___" and "... before ___". Tier (c) text does not:
 *  a dramaticTurn or revelation is a whole SENTENCE lifted from the script,
 *  usually a line of dialogue. Dropping one in unframed produced loglines like
 *
 *      JUNE must face Turns out Holloway signed my transfer papers six years
 *      ago. We've never really stopped working together.
 *
 *  — ungrammatical, two sentences deep, and misattributed: that is VANCE's
 *  dialogue, presented as if it were the protagonist's obstacle. It was the
 *  first line of the coverage report a reader saw.
 *
 *  The fix keeps the extracted signal but makes it grammatical and honest:
 *  label what the text is, quote it so it reads as lifted from the page (the
 *  same idiom assembleLogline already uses for `goal`), and keep one sentence,
 *  since a logline carries a single clause. No content is invented. */
function frameSceneText(r: ScreenplaySceneRecord, sceneDialogue: readonly string[]): string | null {
  // 2026-09-11 (producer-tier discovery defect #7b): the QUOTE GATE.
  //
  // `dramaticTurn` and `revelation` are both whole lines lifted verbatim from
  // the scene (fountain-analyzer.ts's detectDramaticTurn picks the line with the
  // most turn verbs; detectRevelation the first line matching a disclosure
  // pattern) — and the lines they scan are the scene's ACTION and DIALOGUE
  // together. So either can be a line of stage direction, and this function
  // wrapped it in quotation marks and handed it to a producer as something a
  // character faces. Reproduced on data/screenplays/runoff.fountain, which
  // rendered:
  //
  //     GUS must face the turn "The inspector nods, packs the binder, and leaves"
  //
  // That sentence is action, at runoff.fountain:146. Nobody says it. It is not a
  // turn GUS faces; it is a description of a third party leaving a room.
  //
  // THE RULE: a quoted clause must be locatable in a DIALOGUE block inside this
  // scene's own span. Both candidates are gated, not just the turn — a quotation
  // mark is a claim that somebody said the words, and the revelation channel
  // reads the same mixed line list. The turn is tried first and falls through to
  // the revelation so a real spoken signal is not lost when only the turn is
  // action; when neither is spoken in this scene, the function returns null and
  // assembleLogline drops the clause rather than quoting the page at a reader.
  const candidates: Array<{ label: string; raw: string }> = [];
  const turn = r.dramaticTurn?.trim();
  const revelation = r.revelation?.trim();
  if (turn) candidates.push({ label: 'the turn', raw: turn });
  if (revelation) candidates.push({ label: 'the revelation', raw: revelation });

  const spoken = normalizeForQuoteMatch(sceneDialogue[r.sceneIdx] ?? '');
  for (const { label, raw } of candidates) {
    if (spoken === '' || !spoken.includes(normalizeForQuoteMatch(raw))) continue;
    const clause = stripTrailingPunctuation(truncate(firstSentence(raw), MAX_CLAUSE_LEN));
    if (!clause) continue;
    return `${label} “${clause}”`;
  }
  return null;
}

/** First sentence only — tier (c) text is frequently a multi-sentence speech,
 *  and a logline states one thing. Splits on sentence-final punctuation
 *  followed by whitespace, so decimals and abbreviations mid-clause survive.
 *
 *  ROUND 2 (2026-09-11): delegates to sentenceSpans rather than carrying its own
 *  regex, so this module has ONE definition of where a sentence ends. The goal
 *  channel needs sentence OFFSETS (it has to find the sentence a want match landed
 *  in, which is not always the first — see wantSentence), and two splitters that
 *  disagreed about a boundary would put the two clauses of one logline on different
 *  rules. */
function firstSentence(text: string): string {
  const trimmed = text.trim();
  return sentenceSpans(trimmed)[0]?.text ?? trimmed;
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
  // 2026-09-11 (producer-tier discovery defect #7c): this said "is the central
  // figure", which claims narrative centrality. What the subject actually is, by
  // report.characters[0]'s own definition, is the speaker with the most dialogue
  // lines — and the two are not the same reading. MEASURED on the 32 real
  // committed scripts (20 CC0 shorts + 12 blind-pair fixtures): the character
  // who appears in the MOST SCENES is a different person from the
  // most-dialogue speaker on 4 of 32, and the engine's own modal power holder
  // (ScreenplaySceneRecord.powerHolder — who holds conversational control) is a
  // different person on 18 of 32. The sentence now states the metric it has.
  return `${incitingClause}${protagonist} is the most-present speaker across ${sceneCount} scene${sceneCount === 1 ? '' : 's'}.`;
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

  // 2026-09-11 (producer-tier discovery defect #7a): the dialogue-share gate.
  // Without a protagonist there is no logline to write — see
  // PROTAGONIST_MIN_DIALOGUE_SHARE for the measurement and the stated cost
  // (33 of 33 scripts derived a logline before, 32 of 33 after; the loss is the
  // 231-scene concatenation, which is the intended loss).
  if (!hasProtagonistDialogueShare(fountain, protagonist)) return null;

  const inciting = findIncitingIncident(records);
  const goal = findApparentGoal(fountain, protagonist);
  const obstacle = findCentralObstacle(records, protagonist, fountain);

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
 *  gap instead of silently omitting a section a producer expects to see.
 *
 *  2026-09-11 (producer-tier discovery defect #7d): the placeholder used to be
 *  the bare string `Comparable titles: ___`, which names a gap without saying
 *  whose gap it is. A producer reading a blank in an otherwise filled-in
 *  document cannot tell whether the engine failed, the analysis is still
 *  running, or the line is theirs to complete. It now says who fills it and
 *  why the engine will not. */
export const COMPS_PLACEHOLDER =
  'Comparable titles: ___ (yours to fill in — this is a deterministic engine with no '
  + 'market data, and it will not invent a comp)';

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
