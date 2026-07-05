// Run 14, Deliverable 2 — unit tests for the pure breakdown module: slug
// parsing (INT/EXT stripped, time-of-day split out), CSV escaping edge cases,
// and the scene/character tally that both the breakdown CSV and the pitch
// kit's character map read. Conventions: node:test + assert/strict, matching
// tests/core/fountain-analyzer.test.ts.
//
// E1-d additions below (after the original Deliverable-2 tests): the
// pre-production element fields (castCount, extrasSignal, props, vehicles,
// stunts, sfx, animals, weapons, nightExterior, pageEighths, continuityDay)
// and the whole-script BreakdownSummary roll-up.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSlug, parseContinuityDay, buildBreakdownRows, buildBreakdownSummary,
  breakdownRowsToCsv, escapeCsvField, analyzeSceneCharacters,
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

// ── E1-d — production-element fields ─────────────────────────────────────────

describe('parseContinuityDay — shooting-day-continuity hint', () => {
  it('extracts an explicit numbered day', () => {
    assert.equal(parseContinuityDay('DAY 2'), 'DAY 2');
    assert.equal(parseContinuityDay('DAY 14'), 'DAY 14');
  });

  it('flags CONTINUOUS', () => {
    assert.equal(parseContinuityDay('CONTINUOUS'), 'CONTINUOUS');
  });

  it('flags LATER, including as a suffix ("MOMENTS LATER")', () => {
    assert.equal(parseContinuityDay('LATER'), 'LATER');
    assert.equal(parseContinuityDay('MOMENTS LATER'), 'LATER');
  });

  it('flags SAME TIME', () => {
    assert.equal(parseContinuityDay('SAME TIME'), 'SAME TIME');
  });

  it('returns null for a plain daypart with no continuity signal', () => {
    assert.equal(parseContinuityDay('DAY'), null);
    assert.equal(parseContinuityDay('NIGHT'), null);
    assert.equal(parseContinuityDay('DAWN'), null);
  });
});

// A 7-scene fixture built specifically to fire (and deliberately NOT fire)
// every new per-scene field at least once, including the dialogue-vs-action
// scoping guard: scene 2's ACTION line genuinely crashes a car (fires
// stunts), while scene 2's AND scene 3's DIALOGUE both say "crash course" —
// scene 3 has no stunt vocabulary in its action line, so scene 3 is the
// clean no-fire proof that a dialogue mention alone never fires a category.
const PRODUCTION_FOUNTAIN = [
  'INT. WAREHOUSE - NIGHT',
  '',
  'JAX packs a suitcase and grabs a flashlight. A crowd gathers outside, chanting.',
  '',
  'JAX',
  'I need to move fast.',
  '',
  'EXT. HIGHWAY - NIGHT',
  '',
  'A truck swerves. JAX draws a gun as MARA fires back. The car crashes into a barrier and flames erupt. A dog barks nearby.',
  '',
  'MARA',
  'I took a crash course in defensive driving once.',
  '',
  'INT. OFFICE - DAY',
  '',
  'Papers are stacked neatly on a desk.',
  '',
  'STRANGER',
  'She took a crash course in first aid last summer.',
  '',
  'EXT. PARKING LOT - DAY 2',
  '',
  'The lot sits empty under a gray sky.',
  '',
  'INT. HOSPITAL - CONTINUOUS',
  '',
  'A nurse pushes a gurney down the hall.',
  '',
  'EXT. STREET - MOMENTS LATER',
  '',
  'Sirens wail in the distance.',
  '',
  'INT. BALLROOM - NIGHT',
  '',
  'A long action paragraph packed with description that stretches across many words to push this scene toward more eighths of a page than the short scenes above, giving the pageEighths sanity check a real, meaningfully longer scene to compare against, with plenty of texture and detail about the room, the chandeliers, the marble floor, and the guests milling about near the bar as the band tunes up before the night truly begins in earnest for everyone gathered here tonight under the glittering light.',
  '',
  'HOST',
  'Welcome, everyone.',
  '',
  'GUEST ONE',
  'Thank you for having us.',
  '',
  'GUEST TWO',
  'This place is stunning.',
].join('\n');

describe('buildBreakdownRows — E1-d production fields', () => {
  const rows = buildBreakdownRows(PRODUCTION_FOUNTAIN);

  it('parses the expected 7 scenes', () => {
    assert.equal(rows.length, 7);
  });

  it('castCount — matches speakingCharacters.length per scene', () => {
    assert.equal(rows[0].castCount, 1); // JAX
    assert.equal(rows[1].castCount, 1); // MARA (JAX is mentioned, not a speaker, in scene 2)
    assert.equal(rows[3].castCount, 0); // PARKING LOT scene has no dialogue at all
    assert.equal(rows[6].castCount, 3); // HOST, GUEST ONE, GUEST TWO
    for (const row of rows) assert.equal(row.castCount, row.speakingCharacters.length);
  });

  it('extrasSignal — fires on crowd vocabulary in an action line', () => {
    assert.equal(rows[0].extrasSignal, true); // "A crowd gathers outside"
  });

  it('extrasSignal — does not fire for a scene with no crowd vocabulary', () => {
    assert.equal(rows[1].extrasSignal, false);
    assert.equal(rows[3].extrasSignal, false);
  });

  it('props — fires and lists concrete hand-props mentioned in the action line', () => {
    assert.deepEqual(rows[0].props, ['SUITCASE', 'FLASHLIGHT']);
  });

  it('props — does not fire for a scene with no prop nouns in its action line', () => {
    assert.deepEqual(rows[3].props, []);
  });

  it('vehicles — fires and lists vehicle mentions from the action line', () => {
    assert.deepEqual(rows[1].vehicles, ['TRUCK', 'CAR']);
  });

  it('vehicles — does not fire for a scene with no vehicle mentions', () => {
    assert.deepEqual(rows[0].vehicles, []);
  });

  it('stunts — fires on a genuine on-screen crash in the action line', () => {
    assert.ok(rows[1].stunts.includes('CRASHES'));
  });

  it('stunts — does NOT fire on a dialogue-only "crash course" mention (scoping guard)', () => {
    // Scene 3's dialogue says "crash course" but its action line ("Papers
    // are stacked neatly on a desk.") has zero stunt vocabulary — proof the
    // extraction is scoped to action lines, not dialogue.
    assert.deepEqual(rows[2].stunts, []);
  });

  it('sfx — fires on practical-effects vocabulary in the action line', () => {
    assert.ok(rows[1].sfx.includes('FLAMES'));
  });

  it('sfx — does not fire for a scene with no practical-effects vocabulary', () => {
    assert.deepEqual(rows[0].sfx, []);
  });

  it('animals — fires on an animal mention in the action line', () => {
    assert.ok(rows[1].animals.includes('DOG'));
  });

  it('animals — does not fire for a scene with no animal mentions', () => {
    assert.deepEqual(rows[0].animals, []);
  });

  it('weapons — fires on a weapon mention in the action line', () => {
    assert.ok(rows[1].weapons.includes('GUN'));
  });

  it('weapons — does not fire for a scene with no weapon mentions', () => {
    assert.deepEqual(rows[0].weapons, []);
  });

  it('nightExterior — fires for EXT + a NIGHT-containing time-of-day', () => {
    assert.equal(rows[1].nightExterior, true); // EXT. HIGHWAY - NIGHT
  });

  it('nightExterior — does not fire for INT + NIGHT, or EXT without NIGHT', () => {
    assert.equal(rows[0].nightExterior, false); // INT. WAREHOUSE - NIGHT
    assert.equal(rows[5].nightExterior, false); // EXT. STREET - MOMENTS LATER
  });

  it('continuityDay — parses DAY N, CONTINUOUS, and LATER chains from the slug', () => {
    assert.equal(rows[3].continuityDay, 'DAY 2');   // EXT. PARKING LOT - DAY 2
    assert.equal(rows[4].continuityDay, 'CONTINUOUS'); // INT. HOSPITAL - CONTINUOUS
    assert.equal(rows[5].continuityDay, 'LATER');   // EXT. STREET - MOMENTS LATER
  });

  it('continuityDay — is null for a plain daypart with no continuity marker', () => {
    assert.equal(rows[0].continuityDay, null); // INT. WAREHOUSE - NIGHT
    assert.equal(rows[2].continuityDay, null); // INT. OFFICE - DAY
  });

  it('pageEighths — every scene gets at least 1 eighth, and a longer scene gets more', () => {
    for (const row of rows) assert.ok(row.pageEighths >= 1);
    // Scene 7 (BALLROOM) has a long action paragraph plus 3 dialogue
    // exchanges; scene 5 (HOSPITAL) is a single short action line with no
    // dialogue — the longer scene must produce strictly more eighths.
    assert.ok(rows[6].pageEighths > rows[4].pageEighths);
  });

  it('pageEighths — total across scenes matches the sum of the per-scene values', () => {
    const summary = buildBreakdownSummary(rows);
    const sum = rows.reduce((acc, row) => acc + row.pageEighths, 0);
    assert.equal(summary.totalPageEighths, sum);
  });
});

describe('buildBreakdownSummary — whole-script roll-up', () => {
  const rows = buildBreakdownRows(PRODUCTION_FOUNTAIN);
  const summary = buildBreakdownSummary(rows);

  it('sceneCount and uniqueLocationCount — 7 scenes, 7 distinct locations', () => {
    assert.equal(summary.sceneCount, 7);
    assert.equal(summary.uniqueLocationCount, 7);
  });

  it('intLocationCount / extLocationCount — split by INT/EXT presence', () => {
    // INT: WAREHOUSE, OFFICE, HOSPITAL, BALLROOM
    assert.equal(summary.intLocationCount, 4);
    // EXT: HIGHWAY, PARKING LOT, STREET
    assert.equal(summary.extLocationCount, 3);
  });

  it('nightExteriorSceneCount — counts only the one true night-exterior scene', () => {
    assert.equal(summary.nightExteriorSceneCount, 1);
  });

  it('totalCastCount — distinct speaking characters across the whole script', () => {
    // JAX, MARA, STRANGER, HOST, GUEST ONE, GUEST TWO
    assert.equal(summary.totalCastCount, 6);
  });

  it('biggestCastScene — identifies the scene with the most distinct speakers', () => {
    assert.ok(summary.biggestCastScene);
    assert.equal(summary.biggestCastScene?.sceneNumber, 7);
    assert.equal(summary.biggestCastScene?.castCount, 3);
  });

  it('per-category scene counts — one scene each for props/vehicles/stunts/sfx/animals/weapons', () => {
    assert.equal(summary.propSceneCount, 1);
    assert.equal(summary.vehicleSceneCount, 1);
    assert.equal(summary.stuntSceneCount, 1);
    assert.equal(summary.sfxSceneCount, 1);
    assert.equal(summary.animalSceneCount, 1);
    assert.equal(summary.weaponSceneCount, 1);
  });

  it('extrasSceneCount — counts every scene with crowd vocabulary, including a second hit in scene 7', () => {
    // Scene 1 ("crowd") and scene 7 ("guests", "gathered") both fire.
    assert.equal(summary.extrasSceneCount, 2);
  });

  it('estimatedPageCount — is totalPageEighths / 8', () => {
    assert.equal(summary.estimatedPageCount, summary.totalPageEighths / 8);
  });

  it('returns all-zero/empty roll-up for an empty script', () => {
    const empty = buildBreakdownSummary([]);
    assert.equal(empty.sceneCount, 0);
    assert.equal(empty.uniqueLocationCount, 0);
    assert.equal(empty.totalCastCount, 0);
    assert.equal(empty.biggestCastScene, null);
    assert.equal(empty.totalPageEighths, 0);
    assert.equal(empty.estimatedPageCount, 0);
  });
});

describe('breakdownRowsToCsv — E1-d CSV shape', () => {
  const rows = buildBreakdownRows(PRODUCTION_FOUNTAIN);
  const csv = breakdownRowsToCsv(rows);
  const lines = csv.split('\r\n').filter(Boolean);

  it('header keeps the original 9 columns first, in the same order, then appends 11 new ones', () => {
    const header = lines[0].split(',');
    assert.equal(header.length, 20);
    assert.deepEqual(header.slice(0, 9), [
      'Scene Number', 'Slug', 'Location', 'INT/EXT', 'Time of Day',
      'Speaking Characters', 'Word Count', 'Has Clock', 'Has Clue Seeded',
    ]);
    assert.deepEqual(header.slice(9), [
      'Cast Count', 'Extras Signal', 'Props', 'Vehicles', 'Stunts', 'SFX',
      'Animals', 'Weapons', 'Night Exterior', 'Page Eighths', 'Continuity Day',
    ]);
  });

  it('every data row has exactly one column per header entry', () => {
    for (const line of lines.slice(1)) {
      assert.equal(line.split(',').length, 20);
    }
  });

  it('semicolon-joins a multi-item category field (props)', () => {
    const scene1 = lines[1].split(',');
    assert.equal(scene1[11], 'SUITCASE;FLASHLIGHT'); // Props is column index 11
  });

  it('an empty continuityDay serializes as an empty (not "null") field', () => {
    const scene1 = lines[1].split(',');
    assert.equal(scene1[19], ''); // Continuity Day is the last column
  });

  it('a present continuityDay serializes as its string value', () => {
    const scene4 = lines[4].split(','); // EXT. PARKING LOT - DAY 2
    assert.equal(scene4[19], 'DAY 2');
  });
});
