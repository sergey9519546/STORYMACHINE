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

// ── ROUND 2 (2026-09-11, item 3): the three shapes an independent reviewer
// measured as DEFECTS, each as a fixture. Every one of them was a genuine prop
// the guard suppressed, so every assertion below is in the FIRES direction —
// and the header's own claim ("`BRASS KEY` beside a character called KEY stays
// a clue") was asserted in three places in the tree and tested in none, because
// this file's FIRES case never put a character called KEY in the script.

/** Shape (i). The reviewer's counterexample: a character whose cue IS one word
 *  of the prop. On the round-1 tree the full-name learning pass read the caps
 *  run "BRASS KEY", found the already-known cue word `key` in it, added `brass`
 *  to nameWords, and the prop was excluded — `seededClueIds` returned
 *  ["mara-voss"] and no brass-key at all. */
const CUE_SHARES_A_PROP_WORD = WITH_TITLE
  .replace('DESK CLERK\nCheckout is at eleven.', 'KEY\nCheckout is at eleven.')
  .replace('DESK CLERK\nNobody I remember.', 'KEY\nNobody I remember.');

/** Shape (ii)a. A script titled after its own central object. Measured on the
 *  round-1 tree: ["key-title"] — the real prop suppressed and a nonsense
 *  cluster id admitted in its place. */
const TITLED_AFTER_THE_PROP = `Title: THE BRASS KEY
Author: A Writer

${BODY}`;

/** Shape (ii)b. A one-word, real-word title that is also the prop. Measured on
 *  the round-1 tree: [] — the whole channel silenced. */
const REAL_WORD_TITLE_IS_THE_PROP = `Title: LEVERAGE
Author: A Writer

${BODY.replace('A hidden BRASS KEY glints under the mat.', 'A hidden LEVERAGE glints under the mat.')}`;

/** Shape (iii). One step of outward chaining into a prop. The guard's comment
 *  claimed "the set cannot chain outward through unrelated props"; a caps phrase
 *  putting a cue name next to a prop taught the prop's word as a name word and
 *  deleted it. Measured on the round-1 tree: [] for the body below, against
 *  ["revolver"] for the control that differs only in those two caps words. */
const PROP_BODY = BODY
  .replace(
    'MARA VOSS, 30s, unlatches the door. A hidden BRASS KEY glints under the mat.',
    'MARA VOSS, 30s, unlatches the door. MARA REVOLVER sits on the nightstand.\n\nShe lifts the REVOLVER and checks it.',
  )
  .replace('Mara checks behind the mirror. Nothing.', 'Mara checks behind the mirror. The REVOLVER is gone.');
const CUE_ADJACENT_PROP = `Title: THE LONG WAY DOWN\nAuthor: A Writer\n\n${PROP_BODY}`;
const CUE_ADJACENT_PROP_CONTROL = `Title: THE LONG WAY DOWN\nAuthor: A Writer\n\n${
  PROP_BODY.replace('MARA REVOLVER sits on the nightstand.', 'A heavy REVOLVER sits on the nightstand.')}`;

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

  // ── The three reviewer shapes (round 2, item 3) ──────────────────────────
  it('FIRES: `BRASS KEY` beside a character called KEY stays a clue — the claim the guard is sold on', () => {
    // The premise, so this cannot pass vacuously: KEY really is a speaking cue.
    assert.match(CUE_SHARES_A_PROP_WORD, /^KEY$/m, 'the fixture must contain a cue line reading exactly KEY');
    assert.match(CUE_SHARES_A_PROP_WORD, /BRASS KEY/, 'and the prop must still be planted');
    const ids = seededClueIds(CUE_SHARES_A_PROP_WORD);
    assert.ok(
      ids.includes('brass-key'),
      `the header's own example: "brass" is not a name word, so BRASS KEY is a prop. Measured ["mara-voss"] `
      + `on the round-1 tree; got ${JSON.stringify(ids)}`,
    );
    // ...and KEY the character is still excluded, which is the other half.
    assert.ok(!ids.includes('key'), `the character KEY must not be a clue; got ${JSON.stringify(ids)}`);
  });

  it('FIRES: a script titled after its own central object keeps that object', () => {
    const ids = seededClueIds(TITLED_AFTER_THE_PROP);
    assert.ok(
      ids.includes('brass-key'),
      `a screenplay named THE BRASS KEY still plants a BRASS KEY. Measured ["key-title"] on the round-1 `
      + `tree — the prop suppressed and a nonsense id admitted; got ${JSON.stringify(ids)}`,
    );
    assert.ok(!ids.includes('key-title'), `"key-title" is an artefact, not a plant; got ${JSON.stringify(ids)}`);
  });

  it('FIRES: a one-word real-word title does not silence the channel', () => {
    const ids = seededClueIds(REAL_WORD_TITLE_IS_THE_PROP);
    assert.ok(
      ids.includes('leverage'),
      `title LEVERAGE + prop LEVERAGE measured [] on the round-1 tree — the whole channel silenced; `
      + `got ${JSON.stringify(ids)}`,
    );
  });

  it('FIRES: a prop that happens to sit beside a cue name in one caps phrase survives it', () => {
    const ids = seededClueIds(CUE_ADJACENT_PROP);
    const control = seededClueIds(CUE_ADJACENT_PROP_CONTROL);
    assert.ok(
      control.includes('revolver'),
      `the control must seed the prop, or this pair proves nothing; got ${JSON.stringify(control)}`,
    );
    assert.ok(
      ids.includes('revolver'),
      `the ONLY difference from the control is the two caps words "MARA REVOLVER". Measured [] on the `
      + `round-1 tree against ["revolver"] for the control; got ${JSON.stringify(ids)}`,
    );
  });

  it('NO-FIRE: the introduction convention still teaches the parts of a name that are not the cue', () => {
    // The capability the round-2 narrowing had to keep. `DETECTIVE RAY
    // BELLWEATHER, 50s,` carries the convention (a comma and a descriptor), so
    // `detective` and `bellweather` are still learned from a cue of RAY.
    const ids = seededClueIds(WITH_TITLE);
    for (const name of ['ray-bellweather', 'detective-ray-bellweather', 'bellweather', 'mara-voss', 'voss']) {
      assert.ok(!ids.includes(name), `"${name}" is a character, not a plant; got ${JSON.stringify(ids)}`);
    }
  });

  // The residual the narrowed guard still has, recorded as a `todo` with the
  // measured id list rather than as a claim that it cannot happen. A caps run
  // that IS followed by the introduction marker and DOES contain a cue word
  // still teaches its other words, so a prop written line-initially and
  // comma-continued, beside a character sharing one of its words, is still
  // suppressed. It needs all three conditions at once.
  it('the remaining suppression: a comma-continued prop sharing a word with a cue name', { todo: true }, () => {
    const body = BODY
      .replace(
        'MARA VOSS, 30s, unlatches the door. A hidden BRASS KEY glints under the mat.',
        'MARA VOSS, 30s, unlatches the door.\n\nBRASS KEY, still warm, lies under the mat.',
      );
    const text = `Title: THE LONG WAY DOWN\nAuthor: A Writer\n\n${body}`
      .replace('DESK CLERK\nCheckout is at eleven.', 'KEY\nCheckout is at eleven.')
      .replace('DESK CLERK\nNobody I remember.', 'KEY\nNobody I remember.');
    const ids = seededClueIds(text);
    assert.ok(ids.includes('brass-key'), `measured without brass-key: ${JSON.stringify(ids)}`);
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
