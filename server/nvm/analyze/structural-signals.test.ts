import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { computeStructuralSignals, STRUCTURAL_SIGNAL_SPECS } from './structural-signals.ts';
import { REFERENCE_CORPUS } from './calibration/corpus.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../..');

// ── Fixtures with a HAND-COUNTED answer ─────────────────────────────────────
// Every expectation below is derived by counting the words in the fixture, not
// by recording whatever the implementation happened to print. Where a value is
// an exact rational (2/6, 8/17) the test asserts the rounded rational, so a
// change in the formula fails rather than being absorbed.

/** Scene body with exactly `n` action words, written as one sentence. */
function actionWords(n: number): string {
  return `${Array.from({ length: n - 1 }, () => 'step').join(' ')} out.`;
}

test('dialogueShare is dialogue words over all scene words, hand-counted', () => {
  const script = [
    'INT. ROOM - DAY',
    '',
    'One two three four.', // 4 action words
    '',
    'BOB',
    'Five six.', // 2 dialogue words
    '',
    'INT. HALL - DAY',
    '',
    'Filler line here.',
    '',
  ].join('\n');

  const block = computeStructuralSignals(script);
  assert.equal(block.sceneCount, 2);
  assert.equal(block.scenes[0].words, 6);
  // 2 / 6 = 0.3333 to 4dp.
  assert.equal(block.scenes[0].dialogueShare, 0.3333);
  // Scene 2 is action only.
  assert.equal(block.scenes[1].dialogueShare, 0);
  // Signed delta: 0 - 0.3333.
  assert.equal(block.scenes[1].dialogueShareDelta, -0.3333);
  assert.equal(block.scenes[0].dialogueShareDelta, 0);
});

test('lengthZ is the population z-score of scene word count', () => {
  const script = [10, 20, 30]
    .map((n, i) => `INT. SCENE ${i + 1} - DAY\n\n${actionWords(n)}\n`)
    .join('\n');

  const block = computeStructuralSignals(script);
  assert.deepEqual(block.scenes.map(s => s.words), [10, 20, 30]);
  // mean 20, population sd sqrt(200/3) = 8.16497 -> z = -1.2247 / 0 / +1.2247
  assert.equal(block.scenes[0].lengthZ, -1.2247);
  assert.equal(block.scenes[1].lengthZ, 0);
  assert.equal(block.scenes[2].lengthZ, 1.2247);
});

test('equal-length scenes give a zero z-score, not NaN', () => {
  const script = [1, 2]
    .map(i => `INT. SCENE ${i} - DAY\n\n${actionWords(12)}\n`)
    .join('\n');
  const block = computeStructuralSignals(script);
  assert.deepEqual(block.scenes.map(s => s.lengthZ), [0, 0]);
  assert.equal(block.sceneLengthCv, 0);
});

test('speakerTurns counts cues followed by dialogue; meanTurnWords divides by them', () => {
  const script = [
    'INT. ROOM - DAY',
    '',
    'They face each other.',
    '',
    'BOB',
    'One two three.', // 3
    '',
    'ALICE',
    'Four five.', // 2
    '',
    'BOB',
    'Six.', // 1
    '',
    'INT. HALL - DAY',
    '',
    'Nothing happens here at all.',
    '',
  ].join('\n');

  const block = computeStructuralSignals(script);
  assert.equal(block.scenes[0].speakerTurns, 3);
  assert.equal(block.scenes[0].speakers, 2);
  // 6 dialogue words over 3 turns.
  assert.equal(block.scenes[0].meanTurnWords, 2);
  assert.equal(block.scenes[1].speakerTurns, 0);
  assert.equal(block.scenes[1].meanTurnWords, 0);
});

test('newPairs counts speaker pairings that never shared an earlier scene', () => {
  const scene = (slug: string, speakers: string[]): string =>
    [`INT. ${slug} - DAY`, '', 'Action beat.', '', ...speakers.flatMap(s => [s, 'A line.', ''])].join('\n');

  const script = [
    scene('ONE', ['ANA', 'BEN']), // A-B is new            -> 1
    scene('TWO', ['ANA', 'BEN']), // nothing new           -> 0
    scene('THREE', ['ANA', 'CAL']), // A-C is new          -> 1
    scene('FOUR', ['ANA', 'BEN', 'CAL']), // only B-C new  -> 1
  ].join('\n');

  const block = computeStructuralSignals(script);
  assert.deepEqual(block.scenes.map(s => s.newPairs), [1, 0, 1, 1]);
  // 3 of 4 scenes introduce a pairing.
  assert.equal(block.newPairSceneRate, 0.75);
  // Last one is scene index 3 of 4 -> 3/3 = 1.
  assert.equal(block.lastNewPairPosition, 1);
});

test('leadShare is the top speaker’s share of that scene’s dialogue words', () => {
  const script = [
    'INT. ROOM - DAY',
    '',
    'Action.',
    '',
    'ANA',
    'One two three four.', // ANA 4
    '',
    'BEN',
    'Five.', // BEN 1
    '',
    'INT. HALL - DAY',
    '',
    'Action.',
    '',
    'ANA',
    'Six two three.', // ANA 3
    '',
    'BEN',
    'Seven eight three.', // BEN 3
    '',
  ].join('\n');

  const block = computeStructuralSignals(script);
  // ANA speaks 7 words overall vs BEN's 4, so ANA is the lead.
  assert.equal(block.scenes[0].leadShare, 0.8); // 4/5
  assert.equal(block.scenes[1].leadShare, 0.5); // 3/6
  assert.equal(block.meanLeadShare, 0.65);
  // Share falls from 0.8 to 0.5 across a normalized span of 1.
  assert.equal(block.leadShareSlope, -0.3);
});

test('actionSentenceCv is sd/mean of action sentence lengths', () => {
  const script = [
    'INT. ROOM - DAY',
    '',
    'One two three. Four.', // sentence lengths 3 and 1
    '',
    'INT. HALL - DAY',
    '',
    'Alpha beta gamma delta.', // one sentence -> no variation to measure
    '',
  ].join('\n');

  const block = computeStructuralSignals(script);
  // mean 2, population sd 1 -> cv 0.5
  assert.equal(block.scenes[0].actionSentenceCv, 0.5);
  assert.equal(block.scenes[1].actionSentenceCv, 0);
  // Document-wide: lengths [3, 1, 4], mean 8/3, sd sqrt(((1/3)^2+(5/3)^2+(4/3)^2)/3)
  assert.equal(block.actionSentenceCvOverall, 0.4677);
});

test('openCloseShift compares the scene’s first third against its last third', () => {
  const script = [
    'INT. ROOM - DAY',
    '',
    'One two three four five six seven eight nine ten.', // 10 words
    '',
    'BOB',
    'One two three four five.', // 5 words
    '',
    'ALICE',
    'One two.', // 2 words
    '',
    'INT. HALL - DAY',
    '',
    'Filler.',
    '',
  ].join('\n');

  const block = computeStructuralSignals(script);
  // 3 ordered lines, band = 1: |10 - 2| / ((10+5+2)/3) = 8 / 5.6667 = 1.4118
  assert.equal(block.scenes[0].openCloseShift, 1.4118);
  // Opens on action, closes on dialogue.
  assert.equal(block.scenes[0].openCloseModeFlip, true);
});

test('speakerEntropy is 1 when two characters speak exactly as much', () => {
  const script = [
    'INT. ROOM - DAY',
    '',
    'Action.',
    '',
    'ANA',
    'One two three.',
    '',
    'BEN',
    'Four five six.',
    '',
    'INT. HALL - DAY',
    '',
    'Action.',
    '',
  ].join('\n');

  const block = computeStructuralSignals(script);
  assert.equal(block.speakerEntropy, 1);
});

test('a single-speaker script has zero speaker entropy', () => {
  const script = [
    'INT. ROOM - DAY',
    '',
    'Action.',
    '',
    'ANA',
    'Only voice here.',
    '',
    'INT. HALL - DAY',
    '',
    'Action.',
    '',
  ].join('\n');
  assert.equal(computeStructuralSignals(script).speakerEntropy, 0);
});

test('abstains on empty input and on a one-scene document', () => {
  const empty = computeStructuralSignals('');
  assert.equal(empty.scored, false);
  assert.equal(empty.sceneCount, 0);
  assert.deepEqual(empty.scenes, []);

  const prose = computeStructuralSignals('Just some prose with no slugline at all.');
  assert.equal(prose.scored, false);
  assert.equal(prose.sceneCount, 0);

  const one = computeStructuralSignals('INT. ROOM - DAY\n\nA single scene stands alone.\n');
  assert.equal(one.scored, false);
  assert.equal(one.sceneCount, 1);
  assert.equal(one.scenes.length, 1);
});

test('deterministic: the same text produces a byte-identical block', () => {
  const script = readFileSync(
    path.join(REPO_ROOT, 'data/screenplays/undertow.fountain'),
    'utf8',
  );
  const a = JSON.stringify(computeStructuralSignals(script));
  const b = JSON.stringify(computeStructuralSignals(script));
  assert.equal(a, b);
});

test('every emitted report channel carries a definition and a registered direction', () => {
  const block = computeStructuralSignals('INT. A - DAY\n\nOne.\n\nINT. B - DAY\n\nTwo three.\n');
  const specKeys = new Set(STRUCTURAL_SIGNAL_SPECS.map(s => String(s.key)));
  const emitted = Object.keys(block).filter(k => !['scored', 'sceneCount', 'scenes'].includes(k));
  for (const key of emitted) {
    assert.ok(specKeys.has(key), `report channel ${key} has no STRUCTURAL_SIGNAL_SPECS entry`);
  }
  for (const spec of STRUCTURAL_SIGNAL_SPECS) {
    assert.ok(spec.definition.length > 10, `${String(spec.key)} has no real definition`);
    assert.ok(emitted.includes(String(spec.key)), `${String(spec.key)} is specced but not emitted`);
  }
});

// ── The density claim, asserted rather than believed ─────────────────────────
// The whole premise of this module is that its channels are DENSE where the
// legacy lexicon channels are sparse. That is a measurement, so it is a test.
// The rates below come from
// `node --experimental-strip-types scripts/measure-structural-signals.ts`
// over the 20 CC0 fixtures plus the 20 calibration samples (427 scenes), and
// the two channels that FAIL the >50% bar are asserted to fail it — locking
// the honest finding so a later change cannot quietly claim they are dense.

function corpusScenes(): Array<ReturnType<typeof computeStructuralSignals>['scenes'][number]> {
  const rows: Array<ReturnType<typeof computeStructuralSignals>['scenes'][number]> = [];
  const dir = path.join(REPO_ROOT, 'data/screenplays');
  if (existsSync(dir)) {
    for (const f of readdirSync(dir).filter(n => n.endsWith('.fountain')).sort()) {
      rows.push(...computeStructuralSignals(readFileSync(path.join(dir, f), 'utf8')).scenes);
    }
  }
  for (const sample of REFERENCE_CORPUS) {
    rows.push(...computeStructuralSignals(sample.fountain).scenes);
  }
  return rows;
}

test('the kept per-scene channels are dense (> 50% of scenes non-zero)', () => {
  const rows = corpusScenes();
  assert.ok(rows.length > 300, `expected the in-repo corpora, got ${rows.length} scenes`);

  const rate = (hit: (r: (typeof rows)[number]) => boolean): number =>
    rows.filter(hit).length / rows.length;

  const dense: Array<[string, number]> = [
    ['words', rate(r => r.words > 0)],
    ['lengthZ', rate(r => r.lengthZ !== 0)],
    ['dialogueShare', rate(r => r.dialogueShare > 0)],
    ['dialogueShareDelta', rate(r => r.dialogueShareDelta !== 0)],
    ['speakerTurns', rate(r => r.speakerTurns > 0)],
    ['meanTurnWords', rate(r => r.meanTurnWords > 0)],
    ['speakers', rate(r => r.speakers > 0)],
    ['leadShare', rate(r => r.leadShare > 0)],
    ['openCloseShift', rate(r => r.openCloseShift > 0)],
    ['openCloseModeFlip', rate(r => r.openCloseModeFlip)],
  ];
  for (const [name, value] of dense) {
    assert.ok(value > 0.5, `${name} is non-zero on only ${(value * 100).toFixed(1)}% of scenes`);
  }
});

test('the two event-shaped channels are honestly SPARSE, and stay labelled that way', () => {
  const rows = corpusScenes();
  const newPairRate = rows.filter(r => r.newPairs > 0).length / rows.length;
  const actionCvRate = rows.filter(r => r.actionSentenceCv > 0).length / rows.length;
  // Both measured well under the bar (21.5% and 35.6% at the time of writing).
  // These assertions exist so nobody can later present either as a dense
  // channel without the number moving first.
  assert.ok(newPairRate < 0.5, `newPairs unexpectedly dense at ${(newPairRate * 100).toFixed(1)}%`);
  assert.ok(actionCvRate < 0.5, `actionSentenceCv unexpectedly dense at ${(actionCvRate * 100).toFixed(1)}%`);
  assert.ok(newPairRate > 0.05, 'newPairs fires somewhere — a dead channel would be a bug');
  assert.ok(actionCvRate > 0.05, 'actionSentenceCv fires somewhere — a dead channel would be a bug');
});

// ── The unwired guarantee, enforced structurally ─────────────────────────────

test('nothing on the scoring path reads structuralSignals', () => {
  const roots = [
    path.join(REPO_ROOT, 'server/nvm/revision'),
    path.join(REPO_ROOT, 'server/nvm/analyze'),
  ];
  const offenders: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.name.endsWith('.ts')) continue;
      const rel = path.relative(REPO_ROOT, full);
      // The module itself, its test, its type declaration, and the one
      // doctor.ts line that hangs the block on the report are the only places
      // this identifier is allowed to appear inside the deterministic core.
      if (
        rel.endsWith('analyze/structural-signals.ts')
        || rel.endsWith('analyze/structural-signals.test.ts')
        || rel.endsWith('analyze/types.ts')
        || rel.endsWith('analyze/doctor.ts')
      ) continue;
      if (readFileSync(full, 'utf8').includes('structuralSignals')) offenders.push(rel);
    }
  };
  for (const root of roots) walk(root);
  assert.deepEqual(offenders, [], `structuralSignals leaked into the scoring path: ${offenders.join(', ')}`);

  // doctor.ts may MENTION it exactly once (the additive report field) and must
  // never read it back into a score.
  const doctor = readFileSync(path.join(REPO_ROOT, 'server/nvm/analyze/doctor.ts'), 'utf8');
  const mentions = doctor.split('structuralSignals').length - 1;
  assert.equal(mentions, 1, `doctor.ts mentions structuralSignals ${mentions} times; exactly 1 (the report field) is allowed`);
});
