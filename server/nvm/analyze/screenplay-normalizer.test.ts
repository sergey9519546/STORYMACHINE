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

// ── isDoubleSpaced root-cause regressions (2026-08-04 fix) ─────────────────
// The old heuristic (ratio of ALL non-blank lines followed by a blank,
// threshold 0.6) misfired on ordinary, spec-correct Fountain: the spec
// requires a blank line between every ELEMENT, so short-paragraph,
// dialogue-heavy scripts legitimately clear 60% with no import artifact
// present. Measured directly against data/screenplays/ (see the dated CC0
// addendum): 13 of the 20 CC0 corpus scripts tripped the old heuristic and
// were needlessly reflowed despite being clean. The fix keys off the one
// adjacency correctly-formatted Fountain can never produce — a blank line
// between a character CUE and its own dialogue.

test('ordinary multi-paragraph action + one dialogue exchange does NOT trip isDoubleSpaced (was a false positive: ratio 4/6 = 0.667 >= old 0.6 threshold)', () => {
  const ordinary = 'INT. KITCHEN - DAY\n\nMara pours coffee.\n\nJonah reads the paper.\n\nMARA\nMorning.\n\nJONAH\nMorning yourself.\n';
  assert.equal(normalizeScreenplay(ordinary), ordinary, 'ordinary Fountain must pass through byte-identical');
});

test('root cause reproduction A: two ordinary action paragraphs no longer get merged into one', () => {
  const text = 'INT. KITCHEN - DAY\n\nMara pours coffee.\n\nJonah reads the paper.\n\nMARA\nMorning.\n';
  const out = normalizeScreenplay(text);
  assert.equal(out, text, 'must pass through unchanged, not merge the two action paragraphs');
  assert.doesNotMatch(out, /Mara pours coffee\. Jonah reads the paper\./,
    'the two action paragraphs must stay separate, not get silently merged into one line');
});

test('root cause reproduction B: action text after a dialogue line (no intervening heading) no longer gets merged into the dialogue block', () => {
  // Mirrors the exact shape that produced a false MISS in
  // data/screenplays/red-line.fountain's first draft (see the CC0 addendum):
  // a death-cue action sentence sitting directly after dialogue, with only a
  // blank line (correct Fountain spacing) between them.
  const text = 'INT. WAREHOUSE - NIGHT\n\nCOMPANION\nNo...\n\nThe second shot kills Marcus before he can move another step.\n';
  const out = normalizeScreenplay(text);
  assert.equal(out, text, 'must pass through unchanged, not fold the action line into COMPANION\'s dialogue');
  assert.doesNotMatch(out, /No\.\.\. The second shot kills Marcus/,
    'the action sentence must not be merged into the preceding dialogue block');
});

test('genuinely double-spaced dialogue (blank line between cue and its own dialogue) is still detected and reflowed', () => {
  // Positive control for the new cue-adjacency signal: this is the one
  // shape correctly-formatted Fountain can never produce, so it must still
  // fire even though the coarse document-wide ratio is no longer primary.
  const text = 'INT. KITCHEN - DAY\n\nA table.\n\nMARA\n\nMorning.\n\nJONAH\n\nMorning yourself.\n';
  const out = normalizeScreenplay(text);
  assert.notEqual(out, text, 'a blank line between a cue and its dialogue must still trigger reflow');
  assert.match(out, /MARA\nMorning\./, 'cue is reattached directly to its own dialogue with no blank line');
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
