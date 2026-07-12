import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessGenreObligations } from './genre-obligation.ts';

function scene(heading: string, body: string): string {
  return `${heading}\n${body}\n\n`;
}

// Six scenes, all lexically thin except two which supply the thriller cues.
function sixScenes(overrides: Record<number, string> = {}): string {
  const bodies = [
    'Sarah walks into the kitchen and pours coffee.',
    'John reads the newspaper quietly at the table.',
    'A dog barks somewhere down the street.',
    'The rain falls softly on the window.',
    'Maria waters the plants on the balcony.',
    'The clock on the wall ticks in the silence.',
  ];
  return Array.from({ length: 6 }, (_, i) => {
    const body = overrides[i] ?? bodies[i];
    return scene(i % 2 === 0 ? `INT. ROOM ${i} - DAY` : `EXT. STREET ${i} - NIGHT`, body);
  }).join('');
}

test('thriller with threat + confrontation cues: both obligations met', () => {
  const fountain = sixScenes({
    1: 'A gunman raises the weapon, the deadline for the ransom is running out.',
    4: 'They finally confront him in the alley, a tense standoff before the fight.',
  });
  const report = assessGenreObligations(fountain, 'thriller');
  assert.equal(report.scored, true);
  assert.equal(report.genre, 'thriller');
  assert.equal(report.totalCount, 2);
  const threat = report.obligations.find(o => o.name === 'threat established');
  const confront = report.obligations.find(o => o.name === 'confrontation');
  assert.ok(threat);
  assert.ok(confront);
  assert.equal(threat!.met, true);
  assert.ok(threat!.evidenceScenes.includes(1));
  assert.equal(confront!.met, true);
  assert.ok(confront!.evidenceScenes.includes(4));
  assert.equal(report.metCount, 2);
  assert.equal(report.completeness, 1);
});

test('thriller missing confrontation cues: that obligation is NOT met (fire/no-fire)', () => {
  const fountain = sixScenes({
    1: 'A gunman raises the weapon, the deadline for the ransom is running out.',
    // no scene supplies confrontation cues
  });
  const report = assessGenreObligations(fountain, 'thriller');
  assert.equal(report.scored, true);
  const threat = report.obligations.find(o => o.name === 'threat established');
  const confront = report.obligations.find(o => o.name === 'confrontation');
  assert.equal(threat!.met, true);
  assert.equal(confront!.met, false);
  assert.deepEqual(confront!.evidenceScenes, []);
  assert.equal(report.metCount, 1);
  assert.equal(report.totalCount, 2);
  assert.equal(report.completeness, 0.5);
});

test('unknown/unsupported genre: abstains (scored:false), no fabricated obligations', () => {
  const fountain = sixScenes();
  const report = assessGenreObligations(fountain, 'not_a_real_genre');
  assert.equal(report.scored, false);
  assert.equal(report.obligations.length, 0);
  assert.equal(report.totalCount, 0);
  assert.equal(report.completeness, 0);
});

test('supported genre with too-few scenes (< 6): abstains', () => {
  const fountain = [
    scene('INT. ROOM - DAY', 'A gunman raises a weapon.'),
    scene('EXT. STREET - NIGHT', 'They confront him in a standoff.'),
    scene('INT. HALL - DAY', 'Nothing much happens.'),
  ].join('');
  const report = assessGenreObligations(fountain, 'thriller');
  assert.equal(report.scored, false);
  assert.equal(report.obligations.length, 0);
});

test('mystery genre: completeness math correct across three obligations, one unmet', () => {
  const fountain = sixScenes({
    0: 'Who killed the old man? Nobody knows what happened that night.',
    2: 'Detectives investigate the scene, gathering evidence and questioning witnesses.',
    // no reveal cue anywhere
  });
  const report = assessGenreObligations(fountain, 'mystery');
  assert.equal(report.scored, true);
  assert.equal(report.totalCount, 3);
  assert.equal(report.metCount, 2);
  assert.equal(report.completeness, 2 / 3);
  const reveal = report.obligations.find(o => o.name === 'reveal');
  assert.equal(reveal!.met, false);
});

test('romance genre: all three obligations met yields completeness 1', () => {
  const fountain = sixScenes({
    0: 'They meet for the first time at the cafe, an encounter neither expected.',
    2: "She is scared, and he's already engaged to someone else, an impossible situation.",
    5: 'They finally choose each other, together at last, and she says I love you.',
  });
  const report = assessGenreObligations(fountain, 'romance');
  assert.equal(report.scored, true);
  assert.equal(report.metCount, 3);
  assert.equal(report.totalCount, 3);
  assert.equal(report.completeness, 1);
});

test('edge case: empty fountain string abstains', () => {
  const report = assessGenreObligations('', 'thriller');
  assert.equal(report.scored, false);
  assert.equal(report.completeness, 0);
});

test('edge case: whitespace-only fountain abstains', () => {
  const report = assessGenreObligations('   \n\n   ', 'thriller');
  assert.equal(report.scored, false);
});

test('edge case: fountain with no scene headings abstains regardless of genre', () => {
  const fountain = 'This is just prose with no INT. or EXT. headings anywhere in it at all.';
  const report = assessGenreObligations(fountain, 'horror');
  assert.equal(report.scored, false);
  assert.equal(report.obligations.length, 0);
});

test('edge case: null/undefined genre abstains without throwing', () => {
  const fountain = sixScenes();
  const reportNull = assessGenreObligations(fountain, null);
  const reportUndef = assessGenreObligations(fountain, undefined);
  assert.equal(reportNull.scored, false);
  assert.equal(reportUndef.scored, false);
});

test('edge case: empty-string genre abstains', () => {
  const fountain = sixScenes();
  const report = assessGenreObligations(fountain, '');
  assert.equal(report.scored, false);
});

test('horror genre: threat + isolation met, scare escalation not met (fire/no-fire)', () => {
  const fountain = sixScenes({
    0: 'A dark shape moves outside, a real danger lurking near the house.',
    3: 'She is alone, trapped, cut off with no signal to call for help.',
  });
  const report = assessGenreObligations(fountain, 'horror');
  assert.equal(report.scored, true);
  const scare = report.obligations.find(o => o.name === 'scare escalation');
  assert.equal(scare!.met, false);
  assert.equal(report.metCount, 2);
  assert.equal(report.totalCount, 3);
});
