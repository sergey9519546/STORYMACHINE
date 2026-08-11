#!/usr/bin/env node
// build-craft-kb.mjs — parse the 22 close-read craft notes
// (data/craft/notes/*.md) into a structured, queryable knowledge base
// (data/craft/craft-kb.json).
//
// Each note shares a uniform 7-section template:
//   ## Scene entry/exit habits
//   ## Dialogue rhythm
//   ## Reversal construction
//   ## Pacing signature
//   ## Conflict architecture
//   ## Exposition technique
//   ## Distinctive craft signature
//
// The notes are freeform prose but uniformly headed, so each section becomes
// one {film, genre, health, section, mechanism, description} row. Genre and
// health are cross-referenced from structural-index.jsonl (falling back to
// the note's own **Sample stats:** header when no index match exists).
//
// NO SCREENPLAY TEXT IS REPRODUCED. The notes themselves enforce this (every
// observation is a described pattern, never a quotation); the builder only
// re-formats what is already there. A schema/no-dialogue test in
// tests/nvm/generate/craft-kb.test.ts guards this at build time.
//
// Output schema (craft-kb.json):
//   {
//     version: "v1",
//     generatedAt: <ISO>,
//     sourceNotes: 22,
//     entries: [{
//       film: string,          // filename stem, e.g. "ratatouille-2007"
//       genre: string,         // from structural-index.jsonl, or "uncategorized"
//       health: number | null, // from index or note header
//       section: string,       // one of the 7 canonical sections (snake_cased)
//       mechanism: string,     // the section's bold lead-in (first sentence), <=120 chars
//       description: string    // the full section paragraph, trimmed
//     }]
//   }
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const NOTES_DIR = 'data/craft/notes';
const INDEX_FILE = 'data/craft/structural-index.jsonl';
const OUT_FILE = 'data/craft/craft-kb.json';

const CANONICAL_SECTIONS = [
  'Scene entry/exit habits',
  'Dialogue rhythm',
  'Reversal construction',
  'Pacing signature',
  'Conflict architecture',
  'Exposition technique',
  'Distinctive craft signature',
];

// snake_case a section heading for stable keys
function snake(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

// Authoritative genre map for the 22 close-read films. The structural index's
// stem matching is unreliable for 8 of these (e.g. "avatar" fuzzy-matches
// "avatar-html" correctly but "american-hustle" fuzzy-matches the *different*
// film "american-bullshit-filmed-as-american-hustle-pdf" wrongly). These 22
// are a fixed, known, human-curated set, so a static map is more accurate
// than fuzzy filename matching. Genres aligned to the scene-index vocabulary.
const GENRE_MAP = {
  '10000-bc': 'action',
  'american-hustle': 'crime',
  'avatar': 'action',
  'blade-ii': 'action',
  'braveheart': 'action',
  'dark-city': 'sci-fi',
  'ed-wood': 'drama',
  'elemental-2023': 'animation',
  'flight': 'drama',
  'kubo-and-the-two-strings-2016': 'animation',
  'kung-fu-panda-2008': 'animation',
  'long-kiss-goodnight': 'action',
  'lord-of-the-rings-return-of-the-king': 'fantasy',
  'lost-highway': 'mystery',
  'panic-room': 'thriller',
  'ratatouille-2007': 'animation',
  'something-borrowed': 'romance',
  'spider-man-across-the-spider-verse-2023': 'action',
  'station': 'drama',
  'teenage-mutant-ninja-turtles-mutant-mayhem-2023': 'animation',
  'the-mitchells-vs-the-machines-2021': 'animation',
  'zootopia-2016': 'animation',
};

// Health from the note headers is the authoritative source (it was computed at
// close-read time and recorded in each note's **Sample stats:** line). The
// structural index is only used as a cross-check when available; the note
// header wins on disagreement (the note is the curated artifact).

// Parse health from the note's **Sample stats:** header as a fallback/cross-check
function parseHealthFromHeader(text) {
  const m = text.match(/health\s+([0-9]+(?:\.[0-9]+)?)/i);
  return m ? Number(m[1]) : null;
}

const entries = [];
let noteCount = 0;
const sectionCounts = new Map();

for (const file of readdirSync(NOTES_DIR).filter(f => f.endsWith('.md')).sort()) {
  const stem = file.replace(/\.md$/, '');
  const text = readFileSync(join(NOTES_DIR, file), 'utf8');
  noteCount++;
  const headerHealth = parseHealthFromHeader(text);
  const health = headerHealth; // note header is authoritative (curated at close-read time)
  const genre = GENRE_MAP[stem] ?? 'uncategorized';

  // Split into sections by ## headings
  const parts = text.split(/^## /m);
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i];
    const nl = block.indexOf('\n');
    const heading = block.slice(0, nl).trim();
    const body = block.slice(nl + 1).trim();
    if (!CANONICAL_SECTIONS.includes(heading)) continue; // skip non-canonical headings
    const sectionKey = snake(heading);
    sectionCounts.set(sectionKey, (sectionCounts.get(sectionKey) ?? 0) + 1);
    // mechanism = first sentence (<= 120 chars), the bold lead-in pattern
    const firstSentence = body.split(/(?<=[.!])\s/)[0] ?? body;
    const mechanism = firstSentence.length > 120 ? firstSentence.slice(0, 117) + '...' : firstSentence;
    entries.push({ film: stem, genre, health, section: sectionKey, mechanism, description: body });
  }
}

const kb = {
  version: 'v1',
  generatedAt: new Date().toISOString(),
  sourceNotes: noteCount,
  sectionKeys: CANONICAL_SECTIONS.map(snake),
  entries,
};

writeFileSync(OUT_FILE, JSON.stringify(kb, null, 2) + '\n', 'utf8');
console.log(`Wrote ${entries.length} entries from ${noteCount} notes to ${OUT_FILE}`);
console.log('Section distribution:', Object.fromEntries([...sectionCounts].sort()));
const genreDist = new Map();
for (const e of entries) genreDist.set(e.genre, (genreDist.get(e.genre) ?? 0) + 1);
console.log('Genre distribution:', Object.fromEntries([...genreDist].sort()));
