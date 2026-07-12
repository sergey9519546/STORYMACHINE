import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeSceneEconomy,
  detectSceneEconomy,
  scenesFromFountain,
  SCENE_ECONOMY_MIN_SCENES,
  BLOAT_MIN_WORDS,
  BLOAT_ECONOMY_THRESHOLD,
} from './scene-economy.ts';

function sceneHeading(i: number): string {
  return `INT. LOCATION ${i} - DAY\n`;
}

// --- Fixture: a script whose scene 0 is short + information-dense, and
// whose last scene is long + repeats only already-seen words (bloated). ---
const denseScene =
  'Zara calibrates the xenon reactor beside doctor Volkov and captain Reyes discussing the kessler array anomaly urgently.';
const scene1 = 'Meadow whispered softly under the willow tree near hollow creek village.';
const scene2 = 'Marcus paced through the abandoned observatory clutching a tarnished brass telescope.';
const scene3 = 'Priya adjusted the frequency dial while commander Ashworth monitored the seismic readings.';
const scene4 = 'Nadia traced the coastline map searching for the lighthouse keeper cottage.';
// Reuses only words already introduced above (zara, calibrates, reactor, near,
// array, doctor, volkov, captain, reyes, discussing, anomaly, beside) so its
// new-info count is ~0 despite being long.
const bloatedUnit =
  'Zara calibrates the reactor near the array. Doctor Volkov and captain Reyes discussing the anomaly beside the reactor. ';
const bloatedScene = bloatedUnit.repeat(6);

const fixtureFountain = [
  sceneHeading(0) + denseScene,
  sceneHeading(1) + scene1,
  sceneHeading(2) + scene2,
  sceneHeading(3) + scene3,
  sceneHeading(4) + scene4,
  sceneHeading(5) + bloatedScene,
].join('\n\n');

test('scene-economy: fires on a short information-dense scene -> high economy', () => {
  const result = detectSceneEconomy(fixtureFountain);
  assert.equal(result.scored, true);
  const dense = result.scenes[0];
  assert.ok(dense, 'expected scene 0 to be scored');
  assert.ok(dense.newInfo >= 10, `expected dense scene to introduce many new terms, got ${dense.newInfo}`);
  assert.ok(dense.economy > 1, `expected dense scene economy > 1, got ${dense.economy}`);
});

test('scene-economy: fires on a long scene repeating known nouns -> flagged bloated', () => {
  const result = detectSceneEconomy(fixtureFountain);
  assert.equal(result.scored, true);
  const bloated = result.scenes[5];
  assert.ok(bloated, 'expected scene 5 to be scored');
  assert.ok(bloated.words >= BLOAT_MIN_WORDS, `expected bloated scene words >= ${BLOAT_MIN_WORDS}, got ${bloated.words}`);
  assert.ok(bloated.economy <= BLOAT_ECONOMY_THRESHOLD, `expected low economy, got ${bloated.economy}`);
  assert.ok(result.bloatedScenes.includes(5), `expected scene 5 in bloatedScenes, got ${JSON.stringify(result.bloatedScenes)}`);
  // The dense scene must NOT be flagged bloated (no-fire on a good scene).
  assert.ok(!result.bloatedScenes.includes(0), 'dense scene should not be flagged bloated');
});

test('scene-economy: no-fire - a short filler scene under the length floor is never bloated even at low economy', () => {
  // A tiny scene reusing only already-seen stopword-only content has near-zero
  // economy but is well under BLOAT_MIN_WORDS, so it must not be flagged.
  const sceneTexts = [
    'Alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima.',
    'Mike november oscar papa quebec romeo sierra tango uniform victor whiskey.',
    'Xray yankee zulu apple banana cherry date elder fig grape honeydew.',
    'Iris jasmine kiwi lemon mango nectar olive peach quince raisin.',
    'Sage thyme umber violet willow xenia yarrow zinnia acorn birch.',
    'The the the the the the.',
  ];
  const result = computeSceneEconomy(sceneTexts);
  assert.equal(result.scored, true);
  const tiny = result.scenes[5];
  assert.ok(tiny.words < BLOAT_MIN_WORDS, `expected tiny scene under floor, got ${tiny.words} words`);
  assert.equal(tiny.economy, 0);
  assert.ok(!result.bloatedScenes.includes(5), 'tiny low-economy scene must not be flagged bloated (below length floor)');
});

test('scene-economy: median math is computed correctly across scenes with known new-info counts', () => {
  // Each scene i (1..6) introduces exactly i unique never-repeated content
  // words padded with stopwords to a fixed 10-word length, so:
  //   rawEconomy = i/10, normalized = (i/10) / (1/7) = 0.7*i
  const sceneLetters = ['a', 'b', 'c', 'd', 'e', 'f'];
  const sceneTexts: string[] = [];
  for (let i = 1; i <= 6; i++) {
    const prefix = sceneLetters[i - 1];
    const uniqueWords = Array.from({ length: i }, (_, k) => `unique${prefix}word${String.fromCharCode(97 + k)}`);
    const padding = Array.from({ length: 10 - i }, () => 'the');
    sceneTexts.push([...uniqueWords, ...padding].join(' '));
  }
  const result = computeSceneEconomy(sceneTexts);
  assert.equal(result.scored, true);
  assert.equal(result.scenes.length, 6);

  const expectedEconomies = [1, 2, 3, 4, 5, 6].map(i => 0.7 * i);
  result.scenes.forEach((s, idx) => {
    assert.ok(
      Math.abs(s.economy - expectedEconomies[idx]) < 1e-9,
      `scene ${idx}: expected economy ${expectedEconomies[idx]}, got ${s.economy}`,
    );
  });

  const sorted = [...expectedEconomies].sort((a, b) => a - b);
  const expectedMedian = (sorted[2] + sorted[3]) / 2;
  assert.ok(
    Math.abs(result.medianEconomy - expectedMedian) < 1e-9,
    `expected median ${expectedMedian}, got ${result.medianEconomy}`,
  );
});

test('scene-economy: abstains (scored=false) when fewer than the minimum scene count', () => {
  const sceneTexts = [
    'Alpha bravo charlie delta echo.',
    'Foxtrot golf hotel india juliet.',
    'Kilo lima mike november oscar.',
    'Papa quebec romeo sierra tango.',
    'Uniform victor whiskey xray yankee.',
  ];
  assert.ok(sceneTexts.length < SCENE_ECONOMY_MIN_SCENES);
  const result = computeSceneEconomy(sceneTexts);
  assert.equal(result.scored, false);
  assert.deepEqual(result.scenes, []);
  assert.equal(result.medianEconomy, 0);
  assert.deepEqual(result.bloatedScenes, []);
  assert.equal(result.strength, 0);
});

test('scene-economy: abstains on empty input', () => {
  const result = detectSceneEconomy('');
  assert.equal(result.scored, false);
  assert.deepEqual(result.scenes, []);
});

test('scene-economy: abstains on whitespace-only input', () => {
  const result = detectSceneEconomy('   \n\n\t  ');
  assert.equal(result.scored, false);
});

test('scene-economy: abstains on a fountain with no INT./EXT. headings at all', () => {
  const noHeadings = 'Just some prose with no scene headings whatsoever, page after page of narration.';
  const result = detectSceneEconomy(noHeadings);
  assert.equal(result.scored, false);
  assert.deepEqual(scenesFromFountain(noHeadings), []);
});

test('scene-economy: abstains on a single-scene document', () => {
  const single = sceneHeading(0) + denseScene;
  const result = detectSceneEconomy(single);
  assert.equal(result.scored, false);
});

test('scene-economy: strength rewards a high median economy and stays within [0,1]', () => {
  const result = detectSceneEconomy(fixtureFountain);
  assert.equal(result.scored, true);
  assert.ok(result.strength >= 0 && result.strength <= 1, `strength out of range: ${result.strength}`);
  assert.ok(result.strength > 0.1, `expected non-trivial strength, got ${result.strength}`);
});

test('scene-economy: guards a scene with zero words without throwing (division-by-zero safe)', () => {
  const sceneTexts = ['', '', '', '', '', ''];
  const result = computeSceneEconomy(sceneTexts);
  assert.equal(result.scored, true);
  for (const s of result.scenes) {
    assert.equal(s.words, 0);
    assert.equal(s.newInfo, 0);
    assert.equal(s.economy, 0);
  }
  assert.equal(result.medianEconomy, 0);
  assert.deepEqual(result.bloatedScenes, []);
});
