import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectSceneValueShift, SCENE_VALUE_SHIFT_MIN_SCENES } from './scene-value-shift.ts';

const NEG_WORDS = ['afraid', 'scared', 'terrified', 'alone', 'lonely', 'sad', 'hurt', 'pain', 'dread', 'fear'];
const POS_WORDS = ['hope', 'relief', 'safe', 'happy', 'joy', 'love', 'warmth', 'grateful', 'proud', 'free'];

function shiftScene(heading: string): string {
  return `${heading}\n${NEG_WORDS.join(' ')} ${POS_WORDS.join(' ')}\n\n`;
}

function flatScene(heading: string): string {
  return `${heading}\nThe room is quiet. The table is wooden. The chair is empty. The window is closed. The floor is grey.\n\n`;
}

function coolButWrongScene(heading: string): string {
  const beats = ['explodes', 'crashes', 'gunfire', 'shatters', 'slams', 'blasts', 'fire', 'speed'];
  const chained = beats.map(b => `it ${b}`).join(' and then ');
  return `${heading}\n${chained} and then nothing.\n\n`;
}

function heading(i: number): string {
  return `INT. LOCATION ${i} - DAY`;
}

function buildFountain(scenes: string[]): string {
  return scenes.join('');
}

test('scene with clear valence flip is marked shifted', () => {
  const scenes = [
    shiftScene(heading(1)),
    flatScene(heading(2)),
    flatScene(heading(3)),
    flatScene(heading(4)),
    flatScene(heading(5)),
    flatScene(heading(6)),
  ];
  const result = detectSceneValueShift(buildFountain(scenes));
  assert.equal(result.scored, true);
  assert.equal(result.scenes.length, 6);
  assert.equal(result.scenes[0].shifted, true);
  assert.ok(result.scenes[0].openingValence < 0);
  assert.ok(result.scenes[0].closingValence > 0);
});

test('flat no-change scene is flagged boring-but-correct', () => {
  const scenes = [
    shiftScene(heading(1)),
    shiftScene(heading(2)),
    flatScene(heading(3)),
    shiftScene(heading(4)),
    shiftScene(heading(5)),
    shiftScene(heading(6)),
  ];
  const result = detectSceneValueShift(buildFountain(scenes));
  assert.equal(result.scored, true);
  assert.equal(result.scenes[2].shifted, false);
  assert.ok(result.boringButCorrect.includes(2));
});

test('spectacle scene without causal connective or value shift is flagged cool-but-wrong', () => {
  const scenes = [
    shiftScene(heading(1)),
    shiftScene(heading(2)),
    coolButWrongScene(heading(3)),
    shiftScene(heading(4)),
    shiftScene(heading(5)),
    shiftScene(heading(6)),
  ];
  const result = detectSceneValueShift(buildFountain(scenes));
  assert.equal(result.scored, true);
  assert.equal(result.scenes[2].shifted, false);
  assert.ok(result.coolButWrong.includes(2));
  assert.ok(!result.boringButCorrect.includes(2), 'a spectacle scene should not double-count as boring-but-correct');
});

test('a flat scene with no spectacle markers does not trip cool-but-wrong', () => {
  const scenes = [
    flatScene(heading(1)),
    flatScene(heading(2)),
    flatScene(heading(3)),
    flatScene(heading(4)),
    flatScene(heading(5)),
    flatScene(heading(6)),
  ];
  const result = detectSceneValueShift(buildFountain(scenes));
  assert.equal(result.scored, true);
  assert.equal(result.coolButWrong.length, 0);
  assert.equal(result.boringButCorrect.length, 6);
});

test('strength rises with shiftRatio', () => {
  const allFlat = buildFountain([1, 2, 3, 4, 5, 6].map(i => flatScene(heading(i))));
  const allShifted = buildFountain([1, 2, 3, 4, 5, 6].map(i => shiftScene(heading(i))));
  const halfShifted = buildFountain([
    shiftScene(heading(1)),
    flatScene(heading(2)),
    shiftScene(heading(3)),
    flatScene(heading(4)),
    shiftScene(heading(5)),
    flatScene(heading(6)),
  ]);

  const low = detectSceneValueShift(allFlat);
  const mid = detectSceneValueShift(halfShifted);
  const high = detectSceneValueShift(allShifted);

  assert.equal(low.shiftRatio, 0);
  assert.equal(high.shiftRatio, 1);
  assert.ok(mid.shiftRatio > low.shiftRatio && mid.shiftRatio < high.shiftRatio);
  assert.ok(low.strength <= mid.strength);
  assert.ok(mid.strength <= high.strength);
  assert.ok(low.strength < high.strength);
});

test('abstains (scored:false) on fewer than SCENE_VALUE_SHIFT_MIN_SCENES scenes', () => {
  assert.equal(SCENE_VALUE_SHIFT_MIN_SCENES, 6);
  const scenes = [heading(1), heading(2), heading(3)].map((h, i) => shiftScene(h));
  const result = detectSceneValueShift(buildFountain(scenes));
  assert.equal(result.scored, false);
  assert.equal(result.scenes.length, 0);
  assert.equal(result.shiftRatio, 0);
  assert.deepEqual(result.boringButCorrect, []);
  assert.deepEqual(result.coolButWrong, []);
});

test('guards empty input', () => {
  const result = detectSceneValueShift('');
  assert.equal(result.scored, false);
  assert.deepEqual(result.scenes, []);

  // @ts-expect-error deliberate non-string input guard
  const resultNull = detectSceneValueShift(null);
  assert.equal(resultNull.scored, false);
});

test('guards input with no INT./EXT. headings', () => {
  const result = detectSceneValueShift('Just some prose with no scene headings at all, repeated several times over.');
  assert.equal(result.scored, false);
  assert.deepEqual(result.scenes, []);
});

test('guards single-scene input', () => {
  const result = detectSceneValueShift(shiftScene(heading(1)));
  assert.equal(result.scored, false);
  assert.equal(result.scenes.length, 0);
});
