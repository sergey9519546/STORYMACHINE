import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  detectStorySpine,
  STORY_SPINE_MIN_SCENES,
  STORY_SPINE_COHERENCE_THRESHOLD,
} from './story-spine.ts';

// --- Coherent-spine script -----------------------------------------------
// Single protagonist (Maria) pursuing a single goal (the treasure), planted
// in the opening 25% and referenced across most later scenes.

const coherentScript = [
  `INT. HOUSE - DAY\n\nMaria decides to find the treasure. The treasure is hidden somewhere close.\n\n`,
  `EXT. FOREST - DAY\n\nMaria walks toward the treasure map, checking every landmark twice.\n\n`,
  `INT. CAVE - NIGHT\n\nMaria searches for the treasure deep inside the cave.\n\n`,
  `EXT. RIVER - DAY\n\nSam fishes quietly, unaware of anything happening elsewhere.\n\n`,
  `INT. CAVE - DAY\n\nMaria finds a clue near the old chest.\n\n`,
  `EXT. MOUNTAIN - DAY\n\nMaria climbs higher, determined to keep going.\n\n`,
  `INT. TOWN - NIGHT\n\nThe treasure was stolen by thieves long ago, or so the story goes.\n\n`,
  `EXT. CAVE - DAY\n\nMaria opens the treasure chest at last.\n\n`,
].join('');

// --- Scattered script -----------------------------------------------------
// Eight different characters, each appearing once, no recurring goal tokens
// in the opening — nothing serves a shared throughline.

const scatteredScript = [
  `INT. A - DAY\n\nAlice waters plants in the morning light.\n\n`,
  `EXT. B - DAY\n\nBob drives a car down a quiet road.\n\n`,
  `INT. C - DAY\n\nCarol paints a wall a soft shade of blue.\n\n`,
  `EXT. D - DAY\n\nDavid reads a book beneath a tree.\n\n`,
  `INT. E - DAY\n\nEllen sings a song to an empty room.\n\n`,
  `EXT. F - DAY\n\nFrank bakes bread before the sun comes up.\n\n`,
  `INT. G - DAY\n\nGrace plants flowers along the fence.\n\n`,
  `EXT. H - DAY\n\nHenry fixes a bike in the garage.\n\n`,
].join('');

// --- No-protagonist script -------------------------------------------------
// Eight scenes, all lowercase body text, no proper-noun-like tokens anywhere.

const noProtagonistScript = Array.from({ length: 8 }, (_, i) =>
  `INT. ROOM ${i + 1} - DAY\n\na person sits quietly and says nothing of consequence here.\n\n`
).join('');

test('detectStorySpine: fires on a script with a single protagonist and recurring goal', () => {
  const report = detectStorySpine(coherentScript);
  assert.equal(report.scored, true);
  assert.equal(report.protagonist, 'maria');
  assert.ok(report.spineTokens.includes('treasure'));
  assert.equal(report.sceneCount, 8);
  assert.ok(report.spineCoverage >= STORY_SPINE_COHERENCE_THRESHOLD);
  assert.equal(report.hasCoherentSpine, true);
  assert.ok(report.strength > 0.6);
});

test('detectStorySpine: does not fire on a scattered script with no shared throughline', () => {
  const report = detectStorySpine(scatteredScript);
  assert.equal(report.scored, true);
  assert.equal(report.sceneCount, 8);
  assert.ok(report.spineCoverage < STORY_SPINE_COHERENCE_THRESHOLD);
  assert.equal(report.hasCoherentSpine, false);
});

test('detectStorySpine: abstains when fewer than STORY_SPINE_MIN_SCENES scenes', () => {
  const shortScript = [
    `INT. HOUSE - DAY\n\nMaria decides to find the treasure.\n\n`,
    `EXT. FOREST - DAY\n\nMaria walks toward the treasure.\n\n`,
  ].join('');
  const report = detectStorySpine(shortScript);
  assert.equal(report.scored, false);
  assert.equal(report.hasCoherentSpine, false);
  assert.equal(report.protagonist, null);
});

test('detectStorySpine: abstains when no protagonist proxy can be found', () => {
  const report = detectStorySpine(noProtagonistScript);
  assert.equal(report.scored, false);
  assert.equal(report.protagonist, null);
  assert.deepEqual(report.spineTokens, []);
});

test('detectStorySpine: abstains on empty input', () => {
  const report = detectStorySpine('');
  assert.equal(report.scored, false);
  assert.equal(report.sceneCount, 0);
});

test('detectStorySpine: abstains when there are no scene headings at all', () => {
  const report = detectStorySpine('Just some prose with no sluglines whatsoever, Maria included.');
  assert.equal(report.scored, false);
});

test('detectStorySpine: guards non-string input without throwing', () => {
  // @ts-expect-error deliberate bad input for the runtime guard
  const report = detectStorySpine(null);
  assert.equal(report.scored, false);
});

test('STORY_SPINE_MIN_SCENES is 8', () => {
  assert.equal(STORY_SPINE_MIN_SCENES, 8);
});
