import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectBonding, BONDING_MIN_SCENES } from './bonding-signal.ts';

function scene(heading: string, body: string): string {
  return `${heading}\n\n${body}\n\n`;
}

function padScenes(n: number, heading = 'INT. HALLWAY - DAY', body = 'ANNA\nWe walked down the hall.\n\nBEN\nIt was quiet.'): string {
  let out = '';
  for (let i = 0; i < n; i++) out += scene(heading, body);
  return out;
}

test('fires: two-channel bonding beat between two present characters', () => {
  const script =
    scene('INT. KITCHEN - DAY', 'MAYA\nWe\'ll get through this together.\n\nJAMES\nHe takes her hand and says nothing.') +
    padScenes(5);
  const report = detectBonding(script);
  assert.equal(report.scored, true);
  assert.equal(report.bondingBeatCount, 1);
  assert.equal(report.bondingBeats[0].channels.length >= 2, true);
  assert.deepEqual(new Set(report.bondingBeats[0].channels), new Set(['cooperation', 'closeness']));
  assert.deepEqual(new Set(report.bondingBeats[0].characters), new Set(['MAYA', 'JAMES']));
  assert.ok(report.strength > 0);
});

test('no-fire: single-channel scene does not fire (no convergence)', () => {
  const script =
    scene('INT. KITCHEN - DAY', 'MAYA\nWe\'ll do this together, as a team, together.\n\nJAMES\nTogether, yes.') +
    padScenes(5);
  const report = detectBonding(script);
  assert.equal(report.scored, true);
  assert.equal(report.bondingBeatCount, 0);
  assert.equal(report.strength, 0);
});

test('no-fire: cues with only one character present in the scene do not fire', () => {
  // Two channels present in the text, but only one speaking character cue in the scene.
  const script =
    scene('INT. KITCHEN - DAY', 'MAYA\nWe\'ll get through this together. He takes her hand.') +
    padScenes(5);
  const report = detectBonding(script);
  assert.equal(report.scored, true);
  assert.equal(report.bondingBeatCount, 0);
});

test('no-fire: random ordinary dialogue does not inflate strength', () => {
  const script =
    scene('INT. OFFICE - DAY', 'ANNA\nThe quarterly numbers are late again.\n\nBEN\nI noticed that too.') +
    scene('EXT. STREET - NIGHT', 'ANNA\nTraffic is bad tonight.\n\nBEN\nAlways is on Fridays.') +
    padScenes(4);
  const report = detectBonding(script);
  assert.equal(report.scored, true);
  assert.equal(report.bondingBeatCount, 0);
  assert.equal(report.strength, 0);
});

test('strength saturates: repeating one bonding-beat pair many times stays modestly bounded', () => {
  const beatScene = scene('INT. KITCHEN - DAY', 'MAYA\nWe\'ll get through this together.\n\nJAMES\nHe takes her hand and says nothing.');
  const script = beatScene.repeat(12);
  const report = detectBonding(script);
  assert.equal(report.scored, true);
  assert.equal(report.bondingBeatCount, 12);
  // Only two of the four channels ever appear, so diversity is capped —
  // strength should not approach the 1.0 ceiling despite many repeated beats.
  assert.ok(report.strength < 0.9, `expected saturated strength < 0.9, got ${report.strength}`);
  assert.ok(report.strength > 0.5);
});

test('abstain: fewer than the minimum scene count', () => {
  const script =
    scene('INT. KITCHEN - DAY', 'MAYA\nWe\'ll get through this together.\n\nJAMES\nHe takes her hand.') +
    padScenes(BONDING_MIN_SCENES - 2);
  const report = detectBonding(script);
  assert.equal(report.scored, false);
  assert.equal(report.bondingBeatCount, 0);
  assert.equal(report.strength, 0);
});

test('abstain: fewer than two distinct speaking characters in the whole script', () => {
  const soloBody = 'MAYA\nWe\'ll get through this together. He takes her hand.';
  const script = padScenes(8, 'INT. KITCHEN - DAY', soloBody);
  const report = detectBonding(script);
  assert.equal(report.scored, false);
});

test('abstain: empty input', () => {
  const report = detectBonding('');
  assert.equal(report.scored, false);
  assert.deepEqual(report.bondingBeats, []);
  assert.equal(report.ratio, 0);
});

test('abstain: no scene headings at all', () => {
  const report = detectBonding('MAYA\nWe walked together.\n\nJAMES\nYes we did.');
  assert.equal(report.scored, false);
});
