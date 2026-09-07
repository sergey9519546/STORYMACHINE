// ORPHAN_CLUE's proper-noun / title / location guard (2026-09-07).
//
// MEASURED DEFECT (branch scoring/feature-length-defects, on a 139-scene
// document): 8 of the 10 top priorities were ORPHAN_CLUE and every one of
// them was a character's full name or the script's own title. Retitling the
// same body `ZEBRA PANCAKE QUANTUM` made
// *Clue "zebra-pancake-quantum" was planted in Scene 1 but never paid off*
// the first thing the writer and the producer were told to fix.
//
// Both directions are covered here, because a guard that only ever excludes
// is indistinguishable from deleting the rule: a genuine planted prop must
// still fire.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { analyzeFountainText } from '../../server/nvm/analyze/fountain-analyzer.ts';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';
import { stapledShortsText } from '../../evals/scoring/runner/metamorphic-cases.ts';

/** Every clue id the analyzer SEEDS, across every scene. This is the
 *  bookkeeping ORPHAN_CLUE and ORPHAN_CLUE_PERVASIVE read
 *  (`records[].seededClueIds` / `unresolvedClues`), asserted directly rather
 *  than through the payoff pass's own gating — a guard that merely pushed
 *  names below a pass threshold would look fixed at the issue level while
 *  changing nothing about what the engine believes is a plant. */
function seededClueIds(fountain: string): string[] {
  const analysis = analyzeFountainText(fountain);
  return analysis.records.flatMap(r => r.seededClueIds ?? []);
}

/** Every clue id ORPHAN_CLUE names in the whole report — the writer-facing
 *  end of the same bookkeeping. */
async function orphanClueIds(fountain: string): Promise<string[]> {
  const report = await runScriptDoctor(fountain);
  const ids: string[] = [];
  for (const pass of report.passes) {
    for (const issue of pass.issues) {
      if (issue.rule !== 'ORPHAN_CLUE') continue;
      const m = /Clue "([^"]+)"/.exec(issue.description ?? '');
      if (m) ids.push(m[1]);
    }
  }
  return ids;
}

const BODY = `INT. RIVERSIDE MOTEL - NIGHT

MARA VOSS, 30s, unlatches the door. A hidden BRASS KEY glints under the mat.

MARA
Somebody was here before me.

DESK CLERK
Checkout is at eleven.

INT. RIVERSIDE MOTEL - CONTINUOUS

Mara sets her bag down. The room smells of bleach.

MARA
Who had this room last week?

DESK CLERK
Nobody I remember.

EXT. RIVERSIDE MOTEL - MORNING

DETECTIVE RAY BELLWEATHER, 50s, waits by the ice machine.

RAY
You called it in.

MARA
I called it in.

INT. DINER - DAY

Mara pushes a plate around.

MARA
He knew the room number.

RAY
Or he guessed it.

INT. RIVERSIDE MOTEL - LATER

Mara checks behind the mirror. Nothing.

MARA
Nothing here either.

RAY
Then we look somewhere else.

EXT. PARKING LOT - NIGHT

Ray waits in the car. Mara gets in.

MARA
Drive.

RAY
Where?
`;

const WITH_TITLE = `Title: THE LONG WAY DOWN
Author: A Writer

${BODY}`;

const RETITLED = `Title: ZEBRA PANCAKE QUANTUM
Author: A Writer

${BODY}`;

describe('ORPHAN_CLUE proper-noun / title / location guard', () => {
  it('the fixture genuinely contains the shapes this guard is about (or the test is vacuous)', () => {
    assert.match(WITH_TITLE, /Title: THE LONG WAY DOWN/);
    assert.match(BODY, /MARA VOSS, 30s/, 'an inline caps character introduction must be present');
    assert.match(BODY, /DETECTIVE RAY BELLWEATHER, 50s/, 'a multi-word introduction whose cue is a single word must be present');
    assert.match(BODY, /INT\. RIVERSIDE MOTEL - NIGHT/, 'a repeated location must be present');
    assert.match(BODY, /BRASS KEY/, 'a genuine planted prop must be present');
  });

  it('no-fire: the script title is not a clue', () => {
    const ids = seededClueIds(WITH_TITLE);
    assert.ok(!ids.includes('long-way'), `the title must not be a planted clue; got ${JSON.stringify(ids)}`);
    assert.ok(!ids.includes('the-long-way'), `the title must not be a planted clue; got ${JSON.stringify(ids)}`);
    assert.ok(!ids.includes('down'), `a title word must not be a planted clue; got ${JSON.stringify(ids)}`);
  });

  it('no-fire: a character name is not a clue, including the parts of it that are not the cue', () => {
    const ids = seededClueIds(WITH_TITLE);
    for (const name of ['mara-voss', 'ray-bellweather', 'detective-ray-bellweather', 'voss', 'bellweather', 'desk-clerk']) {
      assert.ok(!ids.includes(name), `"${name}" is a character, not a planted clue; got ${JSON.stringify(ids)}`);
    }
  });

  it('no-fire: a location out of a scene heading is not a clue', () => {
    const ids = seededClueIds(WITH_TITLE);
    for (const place of ['riverside-motel', 'riverside', 'motel', 'parking-lot']) {
      assert.ok(!ids.includes(place), `"${place}" is a location, not a planted clue; got ${JSON.stringify(ids)}`);
    }
  });

  it('FIRES: a genuine planted prop is still seeded as a clue', () => {
    const ids = seededClueIds(WITH_TITLE);
    assert.ok(
      ids.some(id => id.includes('brass') || id.includes('key')),
      `the guard must exclude proper nouns, not the rule: BRASS KEY is planted in scene 1 and never paid off; got ${JSON.stringify(ids)}`,
    );
  });

  it('the title page cannot change which clues are reported (the controlled experiment)', () => {
    const withTitle = seededClueIds(WITH_TITLE).sort();
    const retitled = seededClueIds(RETITLED).sort();
    const untitled = seededClueIds(BODY).sort();
    assert.deepEqual(retitled, withTitle, 'renaming the script must not change one clue');
    assert.deepEqual(untitled, withTitle, 'removing the title page must not change one clue');
    assert.ok(
      !retitled.some(id => id.includes('zebra') || id.includes('pancake') || id.includes('quantum')),
      `the new title must not become a critical finding; got ${JSON.stringify(retitled)}`,
    );
  });

  // The writer-facing end, at the length the defect was measured at. The
  // stapled twelve (139 scenes, 55 characters) is the only feature-scale
  // document this repository has; on `main @ 9b199b72` its ORPHAN_CLUE tier
  // read ["dispatcher-nell-arceo", "ramon-delgado", "detective-osei",
  // "ray-bellweather", "rosalind-kane", "imogen-kane", "victor-prieto",
  // "dispatcher"] — eight of eight, every one a character.
  it('at feature scale the ORPHAN_CLUE tier is no longer character names', async () => {
    const body = stapledShortsText();
    const report = await runScriptDoctor(`Title: THE LONG WAY DOWN\nAuthor: A Writer\n\n${body}`);
    const names = new Set(report.characters.map(c => c.toLowerCase()));
    const orphanIds: string[] = [];
    for (const issue of report.topPriorities) {
      if (issue.rule !== 'ORPHAN_CLUE') continue;
      const m = /Clue "([^"]+)"/.exec(issue.description ?? '');
      if (m) orphanIds.push(m[1]);
    }
    assert.ok(orphanIds.length > 0, 'the fixture must still produce ORPHAN_CLUE findings, or this assertion is vacuous');
    for (const id of orphanIds) {
      for (const word of id.split('-')) {
        assert.ok(
          !names.has(word),
          `top-10 ORPHAN_CLUE "${id}" contains the character name "${word}"; got ${JSON.stringify(orphanIds)}`,
        );
      }
      assert.ok(!/long|way|down/.test(id), `top-10 ORPHAN_CLUE "${id}" is a word from the title`);
    }
  });

  it('at feature scale the priority tier does not move when the title does', async () => {
    const body = stapledShortsText();
    const a = await runScriptDoctor(`Title: THE LONG WAY DOWN\n\n${body}`);
    const b = await runScriptDoctor(`Title: ZEBRA PANCAKE QUANTUM\n\n${body}`);
    assert.deepEqual(
      b.topPriorities.map(i => i.description),
      a.topPriorities.map(i => i.description),
      'renaming a 139-scene script must not change one line of the priority tier',
    );
  });
});
