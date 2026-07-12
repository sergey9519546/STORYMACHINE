import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectMirrorScenes } from './mirror-scene.ts';

function scene(heading: string, body = 'Something happens here.'): string {
  return `${heading}\n\n${body}\n\n`;
}

describe('detectMirrorScenes — location-bookend', () => {
  it('fires when the same location opens and (later, not middle) closes the script', () => {
    const fountain = [
      scene('INT. DINER - DAY'),
      scene('INT. APARTMENT - NIGHT'),
      scene('EXT. STREET - DAY'),
      scene('INT. OFFICE - DAY'),
      scene('EXT. PARK - DAY'),
      scene('INT. GARAGE - NIGHT'),
      scene('EXT. ALLEY - NIGHT'),
      scene('INT. HOSPITAL - DAY'),
      scene('INT. DINER - NIGHT'),
      scene('EXT. ROOFTOP - DAWN'),
    ].join('');

    const report = detectMirrorScenes(fountain);
    assert.equal(report.scored, true);
    assert.equal(report.hasBookend, true);
    const echo = report.echoes.find(e => e.location === 'diner');
    assert.ok(echo, 'expected a diner echo');
    assert.equal(echo!.kind, 'location-bookend');
    assert.equal(echo!.openingSceneIndex, 0);
    assert.equal(echo!.closingSceneIndex, 8);
    assert.ok(report.strength > 0 && report.strength <= 1);
  });

  it('does not fire for a random script with no positional echoes (no-fire)', () => {
    const fountain = [
      scene('INT. ALPHA - DAY'),
      scene('EXT. BETA - NIGHT'),
      scene('INT. GAMMA - DAY'),
      scene('EXT. DELTA - NIGHT'),
      scene('INT. EPSILON - DAY'),
      scene('EXT. ZETA - NIGHT'),
      scene('INT. ETA - DAY'),
      scene('EXT. THETA - NIGHT'),
      scene('INT. IOTA - DAY'),
      scene('EXT. KAPPA - NIGHT'),
    ].join('');

    const report = detectMirrorScenes(fountain);
    assert.equal(report.scored, true);
    assert.equal(report.hasBookend, false);
    assert.deepEqual(report.echoes, []);
    assert.equal(report.strength, 0);
  });
});

describe('detectMirrorScenes — return-to-open', () => {
  it('fires with higher strength when the final scene returns to the opening location', () => {
    const fountain = [
      scene('INT. HOUSE - DAY'),
      scene('EXT. STREET - DAY'),
      scene('INT. OFFICE - DAY'),
      scene('EXT. PARK - NIGHT'),
      scene('INT. CAR - DAY'),
      scene('EXT. BRIDGE - NIGHT'),
      scene('INT. STATION - DAY'),
      scene('INT. HOUSE - NIGHT'),
    ].join('');

    const report = detectMirrorScenes(fountain);
    assert.equal(report.scored, true);
    assert.equal(report.hasBookend, true);
    const echo = report.echoes.find(e => e.location === 'house');
    assert.ok(echo);
    assert.equal(echo!.kind, 'return-to-open');
    assert.equal(echo!.openingSceneIndex, 0);
    assert.equal(echo!.closingSceneIndex, 7);
    assert.ok(report.strength >= 0.45, `expected strong composite, got ${report.strength}`);
  });

  it('a plain location-bookend (non-return-to-open) scores lower strength than a return-to-open echo', () => {
    const bookendOnly = [
      scene('INT. DINER - DAY'),
      scene('INT. APARTMENT - NIGHT'),
      scene('EXT. STREET - DAY'),
      scene('INT. OFFICE - DAY'),
      scene('EXT. PARK - DAY'),
      scene('INT. GARAGE - NIGHT'),
      scene('EXT. ALLEY - NIGHT'),
      scene('INT. HOSPITAL - DAY'),
      scene('INT. DINER - NIGHT'),
      scene('EXT. ROOFTOP - DAWN'),
    ].join('');

    const returnToOpen = [
      scene('INT. HOUSE - DAY'),
      scene('EXT. STREET - DAY'),
      scene('INT. OFFICE - DAY'),
      scene('EXT. PARK - NIGHT'),
      scene('INT. CAR - DAY'),
      scene('EXT. BRIDGE - NIGHT'),
      scene('INT. STATION - DAY'),
      scene('INT. HOUSE - NIGHT'),
    ].join('');

    const a = detectMirrorScenes(bookendOnly);
    const b = detectMirrorScenes(returnToOpen);
    assert.ok(b.strength > a.strength);
  });
});

describe('detectMirrorScenes — recurring standing-set guard (no-fire)', () => {
  it('does not credit a location that also recurs through the middle third of the script', () => {
    const fountain = [
      scene('INT. ALPHA - DAY'),
      scene('INT. GYM - DAY'),
      scene('EXT. BETA - DAY'),
      scene('INT. GAMMA - NIGHT'),
      scene('EXT. DELTA - DAY'),
      scene('INT. EPSILON - NIGHT'),
      scene('INT. GYM - NIGHT'),
      scene('EXT. ZETA - DAY'),
      scene('INT. ETA - NIGHT'),
      scene('EXT. THETA - DAY'),
      scene('INT. IOTA - NIGHT'),
      scene('INT. GYM - DAY'),
      scene('EXT. KAPPA - NIGHT'),
    ].join('');

    const report = detectMirrorScenes(fountain);
    assert.equal(report.scored, true);
    assert.equal(report.hasBookend, false, 'GYM is a recurring standing set, not a bookend');
    assert.deepEqual(report.echoes, []);
    assert.equal(report.strength, 0);
  });
});

describe('detectMirrorScenes — abstain / edge cases', () => {
  it('abstains (scored:false) on an empty script', () => {
    const report = detectMirrorScenes('');
    assert.equal(report.scored, false);
    assert.deepEqual(report.echoes, []);
    assert.equal(report.hasBookend, false);
    assert.equal(report.strength, 0);
  });

  it('abstains (scored:false) on non-string input', () => {
    // @ts-expect-error deliberate bad input for the runtime guard
    const report = detectMirrorScenes(undefined);
    assert.equal(report.scored, false);
  });

  it('abstains (scored:false) on a script with no scene headings at all', () => {
    const report = detectMirrorScenes('Just some prose with no sluglines whatsoever.\nMore text.\n');
    assert.equal(report.scored, false);
  });

  it('abstains (scored:false) on a single scene', () => {
    const report = detectMirrorScenes(scene('INT. HOUSE - DAY'));
    assert.equal(report.scored, false);
  });

  it('abstains (scored:false) on a too-short script (< 8 scenes) even with a matching bookend', () => {
    const fountain = [
      scene('INT. HOUSE - DAY'),
      scene('EXT. STREET - DAY'),
      scene('INT. OFFICE - DAY'),
      scene('EXT. PARK - NIGHT'),
      scene('INT. HOUSE - NIGHT'),
    ].join('');
    const report = detectMirrorScenes(fountain);
    assert.equal(report.scored, false);
    assert.deepEqual(report.echoes, []);
  });

  it('abstains (scored:false) when headings lack recoverable locations', () => {
    const fountain = [
      scene('INT.'),
      scene('EXT.'),
      scene('INT.'),
      scene('EXT.'),
      scene('INT.'),
      scene('EXT.'),
      scene('INT.'),
      scene('EXT.'),
    ].join('');
    const report = detectMirrorScenes(fountain);
    assert.equal(report.scored, false);
  });
});
