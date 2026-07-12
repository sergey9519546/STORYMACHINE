import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectPatternEstablishment } from './pattern-establishment.ts';

function scene(heading: string, body: string): string {
  return `${heading}\n${body}\n`;
}

function joinScenes(scenes: string[]): string {
  return scenes.join('\n');
}

function fillerScene(n: number): string {
  return scene(
    `INT. HALLWAY ${n} - DAY`,
    `A quiet corridor stretches ahead. Nothing much happens here today.\nJOE\nJust another ordinary hallway moment.`,
  );
}

test('distinctive phrase recurring 3x across 3 distinct scenes fires as a motif', () => {
  const scenes = [
    scene('INT. KITCHEN - DAY', 'Martha holds the silver key up to the light, studying it closely.'),
    fillerScene(1),
    scene('INT. ATTIC - NIGHT', 'Dust everywhere. She finds the silver key again, tucked in a drawer.'),
    fillerScene(2),
    scene('EXT. GARDEN - DUSK', 'Under the old oak she buries the silver key one final time.'),
    fillerScene(3),
  ];
  const report = detectPatternEstablishment(joinScenes(scenes));
  assert.equal(report.scored, true);
  assert.ok(report.motifCount >= 1, 'expected at least one motif');
  const found = report.motifs.find(m => m.token.includes('silver') || m.token.includes('key'));
  assert.ok(found, `expected a silver/key motif, got ${JSON.stringify(report.motifs)}`);
  assert.ok(found!.occurrences >= 3);
  assert.ok(found!.sceneSpread >= 3);
  assert.ok(report.strength > 0);
});

test('token repeated 3x all within ONE scene does NOT fire (spread guard)', () => {
  const scenes = [
    scene(
      'INT. KITCHEN - DAY',
      'She whispers moonflower softly. Then moonflower again, and once more, moonflower, under her breath.',
    ),
    fillerScene(1),
    fillerScene(2),
    fillerScene(3),
    fillerScene(4),
    fillerScene(5),
  ];
  const report = detectPatternEstablishment(joinScenes(scenes));
  assert.equal(report.scored, true);
  const found = report.motifs.find(m => m.token.includes('moonflower'));
  assert.equal(found, undefined, 'single-scene clustered repetition must not count as a motif');
});

test('a repeated character NAME does not count as a motif', () => {
  const scenes = [
    scene('INT. OFFICE - DAY', 'HARRIGAN\nWe need to talk about the numbers right now.'),
    fillerScene(1),
    scene('INT. HALL - NIGHT', 'HARRIGAN\nThe numbers still do not add up, does not add up at all.'),
    fillerScene(2),
    scene('EXT. STREET - DAY', 'HARRIGAN\nEveryone remembers Harrigan from the old days downtown.'),
    fillerScene(3),
  ];
  const report = detectPatternEstablishment(joinScenes(scenes));
  assert.equal(report.scored, true);
  const found = report.motifs.find(m => m.token === 'harrigan');
  assert.equal(found, undefined, 'a recurring character name must be excluded as a motif');
});

test('common stop-words never fire as a motif regardless of repetition', () => {
  const bodyStopwordy = 'The the and the but the with the from the as the into the up the down.';
  const scenes = [
    scene('INT. ROOM ONE - DAY', bodyStopwordy),
    scene('INT. ROOM TWO - DAY', bodyStopwordy),
    scene('INT. ROOM THREE - DAY', bodyStopwordy),
    scene('INT. ROOM FOUR - DAY', bodyStopwordy),
    scene('INT. ROOM FIVE - DAY', bodyStopwordy),
    scene('INT. ROOM SIX - DAY', bodyStopwordy),
  ];
  const report = detectPatternEstablishment(joinScenes(scenes));
  assert.equal(report.scored, true);
  assert.equal(report.motifCount, 0, 'stop-word-only repetition must never qualify');
  assert.equal(report.strength, 0);
});

test('strength saturates and stays bounded within [0,1] for a heavily repeated motif', () => {
  const scenes: string[] = [];
  for (let i = 0; i < 12; i++) {
    scenes.push(
      scene(
        `INT. ROOM ${i} - DAY`,
        `The clockwork raven perches on the windowsill, watching silently as the clockwork raven always does.`,
      ),
    );
  }
  const report = detectPatternEstablishment(joinScenes(scenes));
  assert.equal(report.scored, true);
  assert.ok(report.strength <= 1);
  assert.ok(report.strength > 0);
  const found = report.motifs.find(m => m.token.includes('raven'));
  assert.ok(found);
  assert.ok(found!.occurrences >= 10);
});

test('abstains (scored:false) on empty input', () => {
  const report = detectPatternEstablishment('');
  assert.equal(report.scored, false);
  assert.equal(report.motifCount, 0);
  assert.equal(report.strength, 0);
  assert.deepEqual(report.motifs, []);
});

test('abstains (scored:false) on fewer than 6 scenes', () => {
  const scenes = [
    scene('INT. KITCHEN - DAY', 'Martha holds the silver key up to the light.'),
    scene('INT. ATTIC - NIGHT', 'She finds the silver key again.'),
    scene('EXT. GARDEN - DUSK', 'She buries the silver key one final time.'),
  ];
  const report = detectPatternEstablishment(joinScenes(scenes));
  assert.equal(report.scored, false);
  assert.equal(report.motifCount, 0);
});

test('abstains on non-string / whitespace-only input without throwing', () => {
  // @ts-expect-error deliberate bad input for guard testing
  const bad = detectPatternEstablishment(null);
  assert.equal(bad.scored, false);

  const whitespace = detectPatternEstablishment('   \n\n   ');
  assert.equal(whitespace.scored, false);
});

test('abstains on a single unparseable scene (no INT/EXT heading)', () => {
  const report = detectPatternEstablishment('Just some prose with no scene headings at all, repeated repeated repeated.');
  assert.equal(report.scored, false);
});
