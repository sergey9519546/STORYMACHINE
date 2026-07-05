// Run 14, Deliverable 2 — unit tests for the pure breakdown module: slug
// parsing (INT/EXT stripped, time-of-day split out), CSV escaping edge cases,
// and the scene/character tally that both the breakdown CSV and the pitch
// kit's character map read. Conventions: node:test + assert/strict, matching
// tests/core/fountain-analyzer.test.ts.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSlug, buildBreakdownRows, breakdownRowsToCsv, escapeCsvField, analyzeSceneCharacters,
} from '../../server/lib/breakdown.ts';

describe('parseSlug — INT/EXT, location, time-of-day', () => {
  it('splits a standard INT. slugline', () => {
    assert.deepEqual(parseSlug('INT. KITCHEN - DAY'), { intExt: 'INT', location: 'KITCHEN', timeOfDay: 'DAY' });
  });

  it('splits a standard EXT. slugline', () => {
    assert.deepEqual(parseSlug('EXT. HIGHWAY - NIGHT'), { intExt: 'EXT', location: 'HIGHWAY', timeOfDay: 'NIGHT' });
  });

  it('handles an INT./EXT. combined slugline', () => {
    const result = parseSlug('INT./EXT. CAR - CONTINUOUS');
    assert.equal(result.intExt, 'INT/EXT');
    assert.equal(result.location, 'CAR');
    assert.equal(result.timeOfDay, 'CONTINUOUS');
  });

  it('handles a multi-word time-of-day ("MOMENTS LATER")', () => {
    const result = parseSlug('INT. WAREHOUSE - MOMENTS LATER');
    assert.equal(result.location, 'WAREHOUSE');
    assert.equal(result.timeOfDay, 'MOMENTS LATER');
  });

  it('handles a location with an internal dash by splitting at the LAST separator', () => {
    const result = parseSlug('INT. SUB-BASEMENT - LOCKER ROOM - NIGHT');
    assert.equal(result.location, 'SUB-BASEMENT - LOCKER ROOM');
    assert.equal(result.timeOfDay, 'NIGHT');
  });

  it('falls back to N/A for a heading with no time-of-day separator', () => {
    const result = parseSlug('INT. KITCHEN');
    assert.equal(result.location, 'KITCHEN');
    assert.equal(result.timeOfDay, 'N/A');
  });

  it('falls back to N/A intExt for a slugline with no INT/EXT prefix', () => {
    const result = parseSlug('UNTITLED SCENE');
    assert.equal(result.intExt, 'N/A');
    assert.equal(result.location, 'UNTITLED SCENE');
  });
});

describe('escapeCsvField — RFC 4180 escaping', () => {
  it('leaves a plain field untouched', () => {
    assert.equal(escapeCsvField('KITCHEN'), 'KITCHEN');
  });

  it('quotes and doubles internal quotes for a comma-and-quote value', () => {
    assert.equal(escapeCsvField('INT. "THE LAIR", NIGHT'), '"INT. ""THE LAIR"", NIGHT"');
  });

  it('quotes a value containing a newline', () => {
    assert.equal(escapeCsvField('line one\nline two'), '"line one\nline two"');
  });

  it('does not quote a field with no special characters', () => {
    assert.equal(escapeCsvField('JAX;MARA'), 'JAX;MARA');
  });
});

const MULTI_SCENE_FOUNTAIN = [
  'INT. WAREHOUSE - NIGHT',
  '',
  'Rain hammers the tin roof. JAX crouches behind crates, a gun in his hand.',
  '',
  'JAX',
  "She said midnight. It's already past that.",
  '',
  'MARA',
  "We wait. If they're not here by dawn, we run.",
  '',
  'EXT. "THE LOT", SIDE STREET - DAWN',
  '',
  'A truck sweeps across the gravel lot.',
  '',
  'MARA',
  'Someone\'s here. Get down.',
  '',
  'INT. WAREHOUSE - MOMENTS LATER',
  '',
  'The door bursts open.',
  '',
  'STRANGER',
  'I know what you did.',
  '',
  'JAX',
  "That's not true.",
].join('\n');

describe('buildBreakdownRows + breakdownRowsToCsv — end to end', () => {
  it('builds one row per scene with the expected fields', () => {
    const rows = buildBreakdownRows(MULTI_SCENE_FOUNTAIN);
    assert.equal(rows.length, 3);

    assert.equal(rows[0].sceneNumber, 1);
    assert.equal(rows[0].slug, 'INT. WAREHOUSE - NIGHT');
    assert.equal(rows[0].intExt, 'INT');
    assert.equal(rows[0].location, 'WAREHOUSE');
    assert.equal(rows[0].timeOfDay, 'NIGHT');
    assert.deepEqual(rows[0].speakingCharacters, ['JAX', 'MARA']);
    assert.ok(rows[0].wordCount > 0);

    assert.equal(rows[1].slug, 'EXT. "THE LOT", SIDE STREET - DAWN');
    assert.equal(rows[1].intExt, 'EXT');
    assert.deepEqual(rows[1].speakingCharacters, ['MARA']);
  });

  it('returns an empty array for empty input', () => {
    assert.deepEqual(buildBreakdownRows(''), []);
    assert.deepEqual(buildBreakdownRows('   '), []);
  });

  it('CSV output has a header row plus one row per scene, and escapes a comma-and-quote slug', () => {
    const rows = buildBreakdownRows(MULTI_SCENE_FOUNTAIN);
    const csv = breakdownRowsToCsv(rows);
    const lines = csv.split('\r\n');

    assert.equal(lines.length, rows.length + 1, 'header + one line per scene');
    assert.match(lines[0], /^Scene Number,Slug,Location/);

    // Scene 2's slug contains both a comma and double quotes — must be
    // wrapped in quotes with the internal quotes doubled, not silently
    // stripped or leaked unescaped into the CSV structure.
    const scene2Line = lines[2];
    assert.match(scene2Line, /"EXT\. ""THE LOT"", SIDE STREET - DAWN"/);
  });

  it('semicolon-joins multiple speaking characters in one CSV field', () => {
    const rows = buildBreakdownRows(MULTI_SCENE_FOUNTAIN);
    const csv = breakdownRowsToCsv(rows);
    assert.match(csv, /JAX;MARA/);
  });
});

describe('analyzeSceneCharacters — per-scene speaker + dialogue-line tally', () => {
  it('counts dialogue lines per speaker and lists speakers in first-appearance order', () => {
    const tallies = analyzeSceneCharacters(MULTI_SCENE_FOUNTAIN);
    assert.equal(tallies.length, 3);
    assert.deepEqual(tallies[0].speakers, ['JAX', 'MARA']);
    assert.equal(tallies[0].dialogueLineCounts['JAX'], 1);
    assert.equal(tallies[0].dialogueLineCounts['MARA'], 1);
  });

  it('never counts a character cue with no dialogue text as speaking', () => {
    // GHOST's cue is followed by a parenthetical, never a dialogue block —
    // parseFountain still tags it 'character' (a cue immediately followed by
    // a blank line instead parses as plain 'action', per fountain.ts's own
    // heuristic), so this is the genuine "cue but never speaks" case.
    const fountain = [
      'INT. ROOM - DAY',
      '',
      'A quiet room.',
      '',
      'GHOST',
      '(beat)',
      '',
      'LIVING',
      'Is someone there?',
    ].join('\n');
    const tallies = analyzeSceneCharacters(fountain);
    assert.deepEqual(tallies[0].speakers, ['LIVING']);
  });

  it('returns an empty array for empty input', () => {
    assert.deepEqual(analyzeSceneCharacters(''), []);
  });
});
