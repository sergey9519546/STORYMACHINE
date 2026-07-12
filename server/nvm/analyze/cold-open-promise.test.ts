import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectColdOpenPromise, COLD_OPEN_PROMISE_MIN_SCENES } from './cold-open-promise.ts';

// --- Scene building blocks ---------------------------------------------

// Plants a concrete promise: proper-noun token "Vault" + cue word "bomb".
const PROMISE_SCENE =
  `INT. VAULT ROOM - NIGHT\n\n` +
  `A guard checks the panel. There is a bomb inside the Vault. He says, "The bomb will explode unless we stop it."\n\n`;

// Filler scenes that carry an unrelated proper noun ("Sarah") but no promise
// payoff later.
const FILLER_SCENE_B =
  `INT. KITCHEN - DAY\n\n` +
  `Sarah pours coffee. Sarah reads the newspaper quietly.\n\n`;

const FILLER_SCENE_C =
  `EXT. STREET - DAY\n\n` +
  `A man walks past a bakery. Traffic hums in the distance.\n\n`;

const FILLER_SCENE_D =
  `INT. OFFICE - DAY\n\n` +
  `A clerk files paperwork. Nothing of note happens here.\n\n`;

const FILLER_SCENE_E =
  `EXT. PARK - DAY\n\n` +
  `Children play near a fountain. A dog barks once.\n\n`;

// Payoff scene: pays off the Vault/bomb promise with meaningful recurrence.
const PAYOFF_SCENE_F =
  `INT. VAULT ROOM - NIGHT\n\n` +
  `They found the Vault. The Vault held the bomb. The bomb was finally defused.\n\n`;

// No-payoff variant of the closing scene: same slugline, unrelated content.
const NO_PAYOFF_SCENE_F =
  `INT. ROOFTOP - NIGHT\n\n` +
  `The team watches the city lights. Nothing more is said.\n\n`;

// Bare scene with no capitalized content and no cue words at all.
const BARE_SCENE = (n: number) =>
  `INT. ROOM ${n} - DAY\n\na person sits quietly and says nothing of consequence.\n\n`;

const orderedScript = [
  PROMISE_SCENE,
  FILLER_SCENE_B,
  FILLER_SCENE_C,
  FILLER_SCENE_D,
  FILLER_SCENE_E,
  PAYOFF_SCENE_F,
].join('');

// Same six scenes, but the promise-planting scene is buried in the middle
// instead of sitting at the front — pure reordering, same content.
const shuffledScript = [
  FILLER_SCENE_B,
  FILLER_SCENE_C,
  FILLER_SCENE_D,
  PROMISE_SCENE,
  FILLER_SCENE_E,
  PAYOFF_SCENE_F,
].join('');

const unpaidScript = [
  PROMISE_SCENE,
  FILLER_SCENE_B,
  FILLER_SCENE_C,
  FILLER_SCENE_D,
  FILLER_SCENE_E,
  NO_PAYOFF_SCENE_F,
].join('');

const noPromiseScript = [
  BARE_SCENE(1),
  BARE_SCENE(2),
  BARE_SCENE(3),
  BARE_SCENE(4),
  BARE_SCENE(5),
  BARE_SCENE(6),
].join('');

test('fires with real strength when the opening plants a promise later paid off', () => {
  const report = detectColdOpenPromise(orderedScript);
  assert.equal(report.scored, true);
  assert.ok(report.promiseTokens.length > 0, 'expected candidate promise tokens');
  assert.ok(report.keptTokens.includes('vault'), 'expected "vault" to be kept');
  assert.ok(report.keptTokens.includes('bomb'), 'expected "bomb" to be kept');
  assert.equal(report.plantedAtFront, true);
  assert.ok(report.strength > 0.3, `expected material strength, got ${report.strength}`);
});

test('shuffle-sensitivity: burying the promise scene mid-document drops strength', () => {
  const orderedReport = detectColdOpenPromise(orderedScript);
  const shuffledReport = detectColdOpenPromise(shuffledScript);

  assert.equal(orderedReport.scored, true);
  assert.equal(shuffledReport.scored, true);
  assert.ok(
    shuffledReport.strength < orderedReport.strength,
    `expected shuffled strength (${shuffledReport.strength}) < ordered strength (${orderedReport.strength})`,
  );
  // The buried version's opening no longer carries the payoff tokens.
  assert.equal(shuffledReport.keptTokens.length, 0);
});

test('abstains when the opening plants no candidate promise tokens', () => {
  const report = detectColdOpenPromise(noPromiseScript);
  assert.equal(report.scored, false);
  assert.equal(report.strength, 0);
  assert.deepEqual(report.promiseTokens, []);
});

test('promise planted but never paid off scores low/zero strength', () => {
  const report = detectColdOpenPromise(unpaidScript);
  assert.equal(report.scored, true);
  assert.ok(report.promiseTokens.length > 0);
  assert.equal(report.keptTokens.length, 0);
  assert.ok(report.strength < 0.15, `expected low strength, got ${report.strength}`);
});

test('edge case: empty input abstains', () => {
  const report = detectColdOpenPromise('');
  assert.equal(report.scored, false);
  assert.equal(report.strength, 0);
  assert.equal(report.plantedAtFront, false);
});

test('edge case: whitespace-only input abstains', () => {
  const report = detectColdOpenPromise('   \n\n   ');
  assert.equal(report.scored, false);
});

test('edge case: no scene headings at all abstains', () => {
  const report = detectColdOpenPromise('Just some prose with no fountain sluglines at all, nothing structured here.');
  assert.equal(report.scored, false);
});

test('edge case: fewer than the minimum scene count abstains', () => {
  const tooFew = [PROMISE_SCENE, FILLER_SCENE_B, PAYOFF_SCENE_F].join('');
  const report = detectColdOpenPromise(tooFew);
  assert.ok(3 < COLD_OPEN_PROMISE_MIN_SCENES);
  assert.equal(report.scored, false);
});

test('edge case: single scene abstains', () => {
  const report = detectColdOpenPromise(PROMISE_SCENE);
  assert.equal(report.scored, false);
});
