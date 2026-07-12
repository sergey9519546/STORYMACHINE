import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeScreenplay, isCharacterCue } from './screenplay-normalizer.ts';
import { analyzeFountainText } from './fountain-analyzer.ts';
import { parseFountain } from '../../../src/lib/fountain.ts';

const dialogueBlockCount = (t: string) => parseFountain(t).filter(b => b.type === 'dialogue').length;
const sceneHeadingCount = (t: string) => parseFountain(t).filter(b => b.type === 'scene_heading').length;

// A double-spaced import: blank line after every line, including cues; dialogue
// hard-wrapped. This is the shape scraped-PDF corpus scripts arrive in.
const DOUBLE_SPACED = [
  'INT. KITCHEN - DAY', '',
  'A wide, gleaming kitchen. REMY watches from a vent.', '',
  'REMY', '',
  'This is not', '',
  'what I expected', '',
  'at all.', '',
  'EXT. STREET - NIGHT', '',
  'Rain falls.', '',
  'LINGUINI', '',
  'We have to fix this.', '',
].join('\n');

test('double-spaced import: dialogue is recognized after normalization (was action before)', () => {
  // Compare at the parseFountain layer directly — analyzeFountainText now
  // normalizes internally (Phase 2 wiring), so we probe the raw parser to show
  // the before/after difference the normalizer is responsible for.
  assert.equal(dialogueBlockCount(DOUBLE_SPACED), 0, 'raw double-spaced parses as zero dialogue (the bug)');
  assert.ok(dialogueBlockCount(normalizeScreenplay(DOUBLE_SPACED)) >= 2,
    `normalized recovers dialogue, got ${dialogueBlockCount(normalizeScreenplay(DOUBLE_SPACED))}`);
  // through the (now normalizing) analyzer the speakers are recovered end-to-end
  const after = analyzeFountainText(DOUBLE_SPACED);
  assert.ok(after.characters.includes('REMY') && after.characters.includes('LINGUINI'),
    `speakers recovered: ${after.characters.join(',')}`);
});

test('scene segmentation is preserved exactly (normalizer never changes scene count)', () => {
  // raw parseFountain scene headings vs normalized — must be identical.
  assert.equal(sceneHeadingCount(normalizeScreenplay(DOUBLE_SPACED)), sceneHeadingCount(DOUBLE_SPACED),
    'scene heading count must be identical before/after normalization');
});

test('wrapped dialogue fragments are joined into one line', () => {
  const norm = normalizeScreenplay(DOUBLE_SPACED);
  assert.match(norm, /This is not what I expected at all\./, 'wrapped dialogue joined');
});

test('idempotent: normalizing twice equals normalizing once', () => {
  const once = normalizeScreenplay(DOUBLE_SPACED);
  assert.equal(normalizeScreenplay(once), once);
});

test('clean single-spaced Fountain passes through unchanged (no double-spacing)', () => {
  const clean = 'INT. ROOM - DAY\n\nA table.\n\nBOB\nHello.\n\nEXT. PARK - DAY\n\nGrass.\n';
  assert.equal(normalizeScreenplay(clean), clean, 'clean input is returned verbatim');
});

test('forced (.) scene headings are preserved as scene boundaries', () => {
  const forced = ['.KITCHEN - DAY', '', 'Action.', '', 'REMY', '', 'Hi.', '', '.STREET - NIGHT', '', 'More.', ''].join('\n');
  const after = analyzeFountainText(normalizeScreenplay(forced));
  assert.equal(after.sceneCount, 2, 'both .-forced headings kept');
});

test('isCharacterCue: fires on bare names, not on headings/action/lyrics', () => {
  assert.ok(isCharacterCue('REMY'));
  assert.ok(isCharacterCue('T.V. NARRATOR (CONT\'D)'));
  assert.ok(isCharacterCue('YOUNG SIMBA'));
  assert.ok(!isCharacterCue('INT. KITCHEN - DAY'));      // heading
  assert.ok(!isCharacterCue('.KITCHEN'));                 // forced heading
  assert.ok(!isCharacterCue('CUT TO:'));                  // transition
  assert.ok(!isCharacterCue('THE DOOR BURSTS OPEN AND HE RUNS.'));  // sentence-like action
  assert.ok(!isCharacterCue('a lowercase line'));         // not caps
});

test('guards: empty / non-string input', () => {
  assert.equal(normalizeScreenplay(''), '');
  // @ts-expect-error deliberate bad input
  assert.equal(normalizeScreenplay(null), '');
});
