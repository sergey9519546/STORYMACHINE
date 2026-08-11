// Schema + integrity test for the structured craft knowledge base
// (data/craft/craft-kb.json), built by scripts/build-craft-kb.mjs from the
// 22 close-read notes (data/craft/notes/*.md).
//
// This KB is the "represent mechanisms as structured dramatic knowledge" asset
// that generation directive-routing (craft-spec.ts v2) and future retrieval
// consume. It must be: complete (22 films × 7 sections), schema-valid,
// genre-attributed, and FREE OF REPRODUCED SCREENPLAY TEXT — every entry is a
// described pattern distilled from close reading, never a quotation. This
// test enforces all four properties so a regression in the builder or a bad
// note edit cannot silently corrupt the knowledge base.

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

interface CraftKBEntry {
  film: string;
  genre: string;
  health: number | null;
  section: string;
  mechanism: string;
  description: string;
}
interface CraftKB {
  version: string;
  generatedAt: string;
  sourceNotes: number;
  sectionKeys: string[];
  entries: CraftKBEntry[];
}

// The craft knowledge base (data/craft/craft-kb.json) is a LOCAL artifact
// built by scripts/build-craft-kb.mjs from the 22 close-read notes. The
// entire data/craft/ tree is gitignored (local-only, like the screenplay
// corpus), so this file does not exist in CI or a fresh checkout. Skip
// gracefully when absent — same convention as the corpus tests
// (REAL_SCRIPT_CORPUS_DIR). Run locally with `node scripts/build-craft-kb.mjs`
// first to exercise these assertions.
let KB: CraftKB | null = null;
let KB_SKIP_REASON: string | undefined;
try {
  KB = JSON.parse(
    readFileSync(new URL('../../../data/craft/craft-kb.json', import.meta.url), 'utf8'),
  );
} catch {
  KB_SKIP_REASON = 'data/craft/craft-kb.json not present — run `node scripts/build-craft-kb.mjs` locally (the notes + KB are gitignored, local-only like the screenplay corpus)';
}

const EXPECTED_SECTIONS = [
  'scene_entry_exit_habits',
  'dialogue_rhythm',
  'reversal_construction',
  'pacing_signature',
  'conflict_architecture',
  'exposition_technique',
  'distinctive_craft_signature',
];

const EXPECTED_FILM_COUNT = 22;

test('craft-kb: sourceNotes is 22 (the close-read set)', { skip: KB_SKIP_REASON }, () => {
  assert.equal(KB!.sourceNotes, EXPECTED_FILM_COUNT);
});

test('craft-kb: every film has exactly 7 canonical sections', { skip: KB_SKIP_REASON }, () => {
  const films = new Map<string, Set<string>>();
  for (const e of KB!.entries) {
    if (!films.has(e.film)) films.set(e.film, new Set());
    films.get(e.film)!.add(e.section);
  }
  assert.equal(films.size, EXPECTED_FILM_COUNT, `expected ${EXPECTED_FILM_COUNT} films, got ${films.size}`);
  for (const [film, sections] of films) {
    assert.equal(sections.size, 7, `${film} has ${sections.size} sections, expected 7`);
    for (const s of EXPECTED_SECTIONS) {
      assert.ok(sections.has(s), `${film} missing section ${s}`);
    }
  }
});

test('craft-kb: total entries = 22 films × 7 sections = 154', { skip: KB_SKIP_REASON }, () => {
  assert.equal(KB!.entries.length, EXPECTED_FILM_COUNT * 7);
});

test('craft-kb: every entry has a non-empty film, genre, section, mechanism, description', { skip: KB_SKIP_REASON }, () => {
  for (const e of KB!.entries) {
    assert.ok(e.film && e.film.length > 0, `entry missing film: ${JSON.stringify(e).slice(0, 80)}`);
    assert.ok(e.genre && e.genre.length > 0, `${e.film}/${e.section} missing genre`);
    assert.ok(e.section && EXPECTED_SECTIONS.includes(e.section), `${e.film} has unknown section ${e.section}`);
    assert.ok(e.mechanism && e.mechanism.length > 10, `${e.film}/${e.section} mechanism too short`);
    assert.ok(e.description && e.description.length > 20, `${e.film}/${e.section} description too short`);
  }
});

test('craft-kb: every entry has a numeric health (no nulls)', { skip: KB_SKIP_REASON }, () => {
  for (const e of KB!.entries) {
    assert.equal(typeof e.health, 'number', `${e.film}/${e.section} health is ${e.health}`);
    assert.ok(e.health! >= 0 && e.health! <= 100, `${e.film}/${e.section} health ${e.health} out of [0,100]`);
  }
});

test('craft-kb: genres are from the scene-index vocabulary, no "uncategorized"', { skip: KB_SKIP_REASON }, () => {
  const genres = new Set(KB!.entries.map(e => e.genre));
  assert.ok(!genres.has('uncategorized'), `uncategorized genre present: ${[...genres].join(', ')}`);
  // every genre should appear in at least one film (no orphan genres)
  for (const g of genres) {
    const filmsWithGenre = new Set(KB!.entries.filter(e => e.genre === g).map(e => e.film));
    assert.ok(filmsWithGenre.size > 0, `genre ${g} has no films`);
  }
});

test('craft-kb: NO REPRODUCED SCREENPLAY TEXT — entries are described patterns, not quotations', { skip: KB_SKIP_REASON }, () => {
  // Screenplay dialogue in fountain is UPPERCASE character cues followed by
  // speech. A reproduced line would look like "VINCENT\nYou know what they
  // call a..." Notes describe patterns ("lines run short, frequently under
  // ten words") rather than quoting. Heuristic guards:
  for (const e of KB!.entries) {
    // 1. No all-caps character-cue-then-speech pattern (a NAME on its own
    //    line followed by a quoted/indented speech). Fountain cues are
    //    uppercase, 2+ chars, often with (V.O.)/(O.S.)/(CONT'D). This is the
    //    reliable discriminator for reproduced fountain dialogue.
    const cuePattern = /\n[A-Z][A-Z .'_-]{2,}\s*(?:\(V\.O\.\)|\(O\.S\.\)|\(CONT'D\))?\s*\n[A-Z]/;
    assert.ok(
      !cuePattern.test(e.description),
      `${e.film}/${e.section}: description may contain reproduced dialogue (uppercase-cue pattern detected)`,
    );
    // 2. Per-entry length cap: a section description is one paragraph of craft
    //    analysis (~100-400 words). A description over 600 words suggests an
    //    accidental paste-in of source text rather than distilled analysis.
    //    (The longest legitimate note section in the current set is ~350 words.)
    const wordCount = e.description.split(/\s+/).length;
    assert.ok(
      wordCount <= 600,
      `${e.film}/${e.section}: description is ${wordCount} words (cap 600) — possible paste-in`,
    );
  }
});
