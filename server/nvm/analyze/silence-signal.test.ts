import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectSilence } from './silence-signal.ts';

// Helper: build a substantial action-only scene body (>= 25 words).
function substantialAction(sentence: string, repeat: number): string {
  return Array.from({ length: repeat }, () => sentence).join(' ');
}

function dialogueScene(slug: string, character: string, lines: string[]): string {
  const body = lines.map(l => `${character}\n${l}\n`).join('\n');
  return `${slug}\nShe walks in and looks around the room quietly.\n\n${body}\n`;
}

function actionScene(slug: string, wordCount: number): string {
  const text = substantialAction('He crosses the empty room and stares out the window in silence.', Math.ceil(wordCount / 11));
  return `${slug}\n${text}\n`;
}

function thinActionScene(slug: string): string {
  return `${slug}\nHe waits.\n`;
}

function buildScript(scenes: string[]): string {
  return scenes.join('\n\n');
}

test('crafted substantial action-only scene at opening position fires', () => {
  const scenes = [
    actionScene('INT. APARTMENT - DAY', 40), // scene 0 -> open
    dialogueScene('INT. KITCHEN - DAY', 'ANNA', ['I need to talk to you.', 'This is important.']),
    dialogueScene('INT. HALL - DAY', 'BEN', ['What is going on?', 'Tell me now.']),
    dialogueScene('INT. OFFICE - DAY', 'ANNA', ['I got the job.', 'We are moving.']),
    dialogueScene('EXT. STREET - DAY', 'BEN', ['I cannot believe this.', 'Why now?']),
    dialogueScene('INT. CAR - DAY', 'ANNA', ['Just trust me.', 'Please.']),
  ];
  const script = buildScript(scenes);
  const report = detectSilence(script);

  assert.equal(report.scored, true);
  assert.equal(report.craftedSilentBeatCount, 1);
  const beat = report.silentBeats[0];
  assert.equal(beat.sceneIndex, 0);
  assert.equal(beat.position, 'open');
  assert.ok(beat.actionWords >= 25);
  assert.ok(report.strength > 0);
});

test('one-line action fragment does NOT fire (too thin)', () => {
  const scenes = [
    thinActionScene('INT. APARTMENT - DAY'), // too thin, would-be open position
    dialogueScene('INT. KITCHEN - DAY', 'ANNA', ['I need to talk to you.', 'This is important.']),
    dialogueScene('INT. HALL - DAY', 'BEN', ['What is going on?', 'Tell me now.']),
    dialogueScene('INT. OFFICE - DAY', 'ANNA', ['I got the job.', 'We are moving.']),
    dialogueScene('EXT. STREET - DAY', 'BEN', ['I cannot believe this.', 'Why now?']),
    dialogueScene('INT. CAR - DAY', 'ANNA', ['Just trust me.', 'Please.']),
  ];
  const script = buildScript(scenes);
  const report = detectSilence(script);

  assert.equal(report.scored, true);
  assert.equal(report.craftedSilentBeatCount, 0);
  assert.equal(report.strength, 0);
});

test('dialogue-heavy scene does NOT fire even at meaningful position', () => {
  const scenes = [
    dialogueScene('INT. APARTMENT - DAY', 'ANNA', ['I need to talk to you.', 'This is important.']),
    dialogueScene('INT. KITCHEN - DAY', 'ANNA', ['I need to talk to you.', 'This is important.']),
    dialogueScene('INT. HALL - DAY', 'BEN', ['What is going on?', 'Tell me now.']),
    dialogueScene('INT. OFFICE - DAY', 'ANNA', ['I got the job.', 'We are moving.']),
    dialogueScene('EXT. STREET - DAY', 'BEN', ['I cannot believe this.', 'Why now?']),
    dialogueScene('INT. CAR - DAY', 'ANNA', ['Just trust me.', 'Please.']),
  ];
  const script = buildScript(scenes);
  const report = detectSilence(script);

  assert.equal(report.scored, true);
  assert.equal(report.craftedSilentBeatCount, 0);
  assert.equal(report.strength, 0);
});

test('all-action document abstains (scored:false)', () => {
  const scenes = Array.from({ length: 8 }, (_, i) => actionScene(`INT. ROOM ${i} - DAY`, 40));
  const script = buildScript(scenes);
  const report = detectSilence(script);

  assert.equal(report.scored, false);
  assert.deepEqual(report.silentBeats, []);
  assert.equal(report.strength, 0);
});

test('too-short script (few scenes) abstains', () => {
  const scenes = [
    actionScene('INT. APARTMENT - DAY', 40),
    dialogueScene('INT. KITCHEN - DAY', 'ANNA', ['I need to talk to you.', 'This is important.']),
    dialogueScene('INT. HALL - DAY', 'BEN', ['What is going on?', 'Tell me now.']),
  ];
  const script = buildScript(scenes);
  const report = detectSilence(script);

  assert.equal(report.scored, false);
  assert.deepEqual(report.silentBeats, []);
});

test('empty input abstains without throwing', () => {
  const report = detectSilence('');
  assert.equal(report.scored, false);
  assert.deepEqual(report.silentBeats, []);
  assert.equal(report.craftedSilentBeatCount, 0);
  assert.equal(report.ratio, 0);
  assert.equal(report.strength, 0);
});

test('whitespace-only input abstains without throwing', () => {
  const report = detectSilence('   \n\n   ');
  assert.equal(report.scored, false);
});

test('single scene (no headings match count) abstains', () => {
  const report = detectSilence('Just some prose with no scene headings at all, no INT or EXT markers.');
  assert.equal(report.scored, false);
});

test('crafted mid-position and closing silent beats both fire and outweigh a body-position silent scene', () => {
  const scenes = [
    dialogueScene('INT. APARTMENT - DAY', 'ANNA', ['I need to talk to you.', 'This is important.']),
    dialogueScene('INT. KITCHEN - DAY', 'BEN', ['What is going on?', 'Tell me now.']),
    actionScene('INT. HALL - DAY', 40), // roughly mid position (index 2 of 6, frac 0.4)
    dialogueScene('INT. OFFICE - DAY', 'ANNA', ['I got the job.', 'We are moving.']),
    actionScene('EXT. STREET - DAY', 40), // body-ish position, should still be judged by frac
    actionScene('INT. CAR - DAY', 40), // close position (last scene)
  ];
  const script = buildScript(scenes);
  const report = detectSilence(script);

  assert.equal(report.scored, true);
  // Closing scene (last index) should always be credited.
  const closing = report.silentBeats.find(b => b.sceneIndex === 5);
  assert.ok(closing);
  assert.equal(closing!.position, 'close');
  assert.ok(report.strength > 0);
  assert.ok(report.strength <= 1);
});

test('random dialogue-only scenes do not inflate strength (no-fire baseline)', () => {
  const scenes = Array.from({ length: 10 }, (_, i) =>
    dialogueScene(`INT. ROOM ${i} - DAY`, 'CHAR', ['Random line one.', 'Random line two.'])
  );
  const script = buildScript(scenes);
  const report = detectSilence(script);

  assert.equal(report.scored, true);
  assert.equal(report.craftedSilentBeatCount, 0);
  assert.equal(report.strength, 0);
  assert.equal(report.ratio, 0);
});
