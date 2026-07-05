// Run 14, Deliverable 2 — Production breakdown export. Pure module (no I/O,
// no Date.now(), no randomness): turns raw Fountain text into one row per
// scene (scene number, slug, parsed location/INT-EXT/time-of-day, speaking
// characters, word count, has-clock, has-clue-seeded) and serializes that to
// RFC 4180-ish CSV. Consumed by POST /api/export/breakdown
// (server/routes/export.ts) for the CSV attachment, and by
// server/lib/pitchkit-html.ts (via analyzeSceneCharacters) so the pitch kit's
// character-map SVG shares the exact same per-scene speaker/dialogue-line
// tally as the breakdown CSV, instead of re-deriving it a third way.
//
// Scene segmentation below intentionally MIRRORS server/nvm/analyze/
// fountain-analyzer.ts's segmentScenes()/normalizeCharacterName() (same
// preamble-folding rule: any blocks before the first scene_heading fold into
// scene 0 rather than being dropped; same no-heading fallback: a single
// 'UNTITLED SCENE'). It is a deliberate, small duplication rather than an
// import: those two helpers are not exported by fountain-analyzer.ts (it has
// no reason to expose them — its own callers only need the aggregated
// FountainAnalysis), and this run's constraints keep nvm/** as an
// import-only surface. Keeping the segmentation identical is what lets this
// file zip its own per-scene rows against analyzeFountainText()'s `records`
// array by plain index (records[idx].clockRaised / .seededClueIds) with no
// re-alignment logic — if the two segmentations ever produced a different
// scene count or order for the same input, that zip would silently
// misattribute clock/clue flags to the wrong scene, so any future edit to
// fountain-analyzer.ts's segmentScenes() must be mirrored here.

import { parseFountain, type FountainBlock } from '../../src/lib/fountain.ts';
import { analyzeFountainText } from '../nvm/analyze/fountain-analyzer.ts';

// ── Scene segmentation (mirrors fountain-analyzer.ts — see file header) ─────

interface RawScene {
  slug: string;
  blocks: FountainBlock[];
}

function segmentScenesLocal(blocks: FountainBlock[]): RawScene[] {
  const headingIdxs: number[] = [];
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].type === 'scene_heading') headingIdxs.push(i);
  }

  if (headingIdxs.length === 0) {
    return [{ slug: 'UNTITLED SCENE', blocks }];
  }

  const scenes: RawScene[] = [];
  for (let h = 0; h < headingIdxs.length; h++) {
    const start = headingIdxs[h];
    const end = h + 1 < headingIdxs.length ? headingIdxs[h + 1] : blocks.length;
    scenes.push({ slug: blocks[start].text.trim(), blocks: blocks.slice(start + 1, end) });
  }
  if (headingIdxs[0] > 0) {
    scenes[0] = { ...scenes[0], blocks: [...blocks.slice(0, headingIdxs[0]), ...scenes[0].blocks] };
  }
  return scenes;
}

function normalizeCharacterName(raw: string): string {
  return raw
    .replace(/\^\s*$/, '')
    .replace(/\(\s*V\.O\.\s*\)/gi, '')
    .replace(/\(\s*O\.S\.\s*\)/gi, '')
    .replace(/\(\s*CONT'?D\s*\)/gi, '')
    .trim();
}

// ── Per-scene word count ─────────────────────────────────────────────────────
// Every non-empty, non-boneyard/synopsis/note block's text contributes its
// whitespace-split word count — including the scene heading isn't meaningful
// (it's metadata, not screenplay prose the reader experiences), so
// segmentScenesLocal's `blocks` (which already excludes the heading itself)
// is exactly the right slice to sum over.
function sceneWordCount(blocks: FountainBlock[]): number {
  let words = 0;
  for (const b of blocks) {
    if (b.type === 'boneyard' || b.type === 'synopsis' || b.type === 'note') continue;
    const text = b.text.trim();
    if (!text) continue;
    words += text.split(/\s+/).filter(Boolean).length;
  }
  return words;
}

// ── Per-scene character/dialogue tally ───────────────────────────────────────

/** One scene's speaking characters (first-appearance order, "speaking" means
 *  they own at least one dialogue block — a bare character cue with no
 *  dialogue text following it never counts, matching fountain-analyzer.ts's
 *  detectSpeakingCharacterCount discipline) plus a per-character dialogue-
 *  line count for the pitch kit's character-map node sizing. */
export interface SceneCharacterTally {
  sceneIdx: number;
  /** First-appearance order of characters who speak at least once in this scene. */
  speakers: string[];
  /** Dialogue-line count per speaker, keyed by the same normalized name in `speakers`. */
  dialogueLineCounts: Record<string, number>;
}

function tallySceneCharacters(blocks: FountainBlock[]): { order: string[]; counts: Record<string, number> } {
  const order: string[] = [];
  const counts: Record<string, number> = {};
  let currentSpeaker = '';

  for (const b of blocks) {
    const text = b.text.trim();
    if (!text) continue;

    if (b.type === 'character' || b.type === 'dual_dialogue') {
      currentSpeaker = normalizeCharacterName(text);
    } else if (b.type === 'dialogue') {
      if (!currentSpeaker) continue;
      if (!(currentSpeaker in counts)) {
        counts[currentSpeaker] = 0;
        order.push(currentSpeaker);
      }
      counts[currentSpeaker]++;
    }
  }

  return { order, counts };
}

/** Per-scene speaker + dialogue-line-count tally for the whole document —
 *  the shared seam breakdown rows (speakingCharacters) and the pitch kit's
 *  character map (node size + co-scene edges) both read, so the two exports
 *  can never disagree about who spoke where. Pure/deterministic, same
 *  contract as analyzeFountainText. */
export function analyzeSceneCharacters(fountain: string): SceneCharacterTally[] {
  if (!fountain || !fountain.trim()) return [];
  const blocks = parseFountain(fountain);
  const rawScenes = segmentScenesLocal(blocks);
  return rawScenes.map((rs, idx) => {
    const { order, counts } = tallySceneCharacters(rs.blocks);
    return { sceneIdx: idx, speakers: order, dialogueLineCounts: counts };
  });
}

// ── Slug parsing: INT/EXT, location, time-of-day ─────────────────────────────

const INT_EXT_RE = /^(INT\.?\/EXT\.?|EXT\.?\/INT\.?|I\/E\.?|INT\.?|EXT\.?)\s*[.:\-]?\s*/i;

/** Split the trailing " - TIME-OF-DAY" (or en/em-dash variant) off a scene
 *  heading's location, at the LAST such separator — a location itself only
 *  rarely contains a bare hyphen, but "LOCATION - SUB-LOCATION - DAY" is
 *  plausible, and the time-of-day is always the final segment by
 *  screenplay convention. */
const DASH_SEPARATOR_RE = /\s[-–—]\s/;

export interface ParsedSlug {
  intExt: string;
  location: string;
  timeOfDay: string;
}

export function parseSlug(rawSlug: string): ParsedSlug {
  const slug = rawSlug.trim();
  const introMatch = slug.match(INT_EXT_RE);
  let intExt = 'N/A';
  let rest = slug;

  if (introMatch) {
    const raw = introMatch[1].toUpperCase().replace(/\./g, '');
    intExt = raw === 'I/E' ? 'INT/EXT' : raw;
    rest = slug.slice(introMatch[0].length).trim();
  }

  const parts = rest.split(DASH_SEPARATOR_RE);
  let location = rest;
  let timeOfDay = 'N/A';
  if (parts.length > 1) {
    timeOfDay = parts[parts.length - 1].trim() || 'N/A';
    location = parts.slice(0, -1).join(' - ').trim();
  }
  if (!location) location = rest || 'UNKNOWN';

  return { intExt, location, timeOfDay };
}

// ── Breakdown rows ────────────────────────────────────────────────────────────

export interface BreakdownRow {
  sceneNumber: number;
  slug: string;
  location: string;
  intExt: string;
  timeOfDay: string;
  speakingCharacters: string[];
  wordCount: number;
  hasClock: boolean;
  hasClueSeeded: boolean;
}

/** Build one row per scene from raw Fountain text. Deterministic: reruns
 *  analyzeFountainText (server/nvm/analyze/fountain-analyzer.ts) for the
 *  clockRaised/seededClueIds flags rather than trusting a caller-supplied
 *  report — same "recompute for authenticity" discipline as
 *  server/lib/coverage-html.ts's caller (POST /api/export/coverage). */
export function buildBreakdownRows(fountain: string): BreakdownRow[] {
  if (!fountain || !fountain.trim()) return [];

  const blocks = parseFountain(fountain);
  const rawScenes = segmentScenesLocal(blocks);
  const { records } = analyzeFountainText(fountain);

  return rawScenes.map((rs, idx) => {
    const { intExt, location, timeOfDay } = parseSlug(rs.slug);
    const { order } = tallySceneCharacters(rs.blocks);
    const record = records[idx];

    return {
      sceneNumber: idx + 1,
      slug: rs.slug,
      location,
      intExt,
      timeOfDay,
      speakingCharacters: order,
      wordCount: sceneWordCount(rs.blocks),
      hasClock: record?.clockRaised ?? false,
      hasClueSeeded: (record?.seededClueIds.length ?? 0) > 0,
    };
  });
}

// ── CSV serialization ─────────────────────────────────────────────────────────

const CSV_HEADER = [
  'Scene Number', 'Slug', 'Location', 'INT/EXT', 'Time of Day',
  'Speaking Characters', 'Word Count', 'Has Clock', 'Has Clue Seeded',
];

/** RFC 4180 field escaping: a field containing a comma, double quote, or any
 *  line break gets wrapped in double quotes, with every internal double
 *  quote doubled. Exported so its escaping edge cases (comma-and-quote
 *  slugs, embedded newlines) are directly unit-testable without building a
 *  whole BreakdownRow. */
export function escapeCsvField(value: string): string {
  if (/["\n\r,]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Serialize breakdown rows to a CSV document, header included. CRLF row
 *  separators per RFC 4180 (the format most spreadsheet tools assume). */
export function breakdownRowsToCsv(rows: BreakdownRow[]): string {
  const lines = [CSV_HEADER.map(escapeCsvField).join(',')];
  for (const row of rows) {
    lines.push([
      String(row.sceneNumber),
      row.slug,
      row.location,
      row.intExt,
      row.timeOfDay,
      row.speakingCharacters.join(';'),
      String(row.wordCount),
      row.hasClock ? 'true' : 'false',
      row.hasClueSeeded ? 'true' : 'false',
    ].map(escapeCsvField).join(','));
  }
  return lines.join('\r\n');
}
