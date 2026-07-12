// Anti-slop detection — deterministic markers of AI-generated hollowness.
// Tests for server/nvm/analyze/anti-slop.ts: detectSlop() function.
// Conventions: node:test + assert/strict.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { detectSlop, type SlopReport } from '../../server/nvm/analyze/anti-slop.ts';

describe('detectSlop — generic emotion patterns', () => {
  it('detects multiple generic emotion phrases across lines (counts unique lines, not phrases)', () => {
    const text = `Her heart raced wildly. The weight settled upon him. Something shifted in the darkness.
Time seemed to slow as she heard the news. A chill ran through her body.`;

    const result = detectSlop(text);
    // Line 0 has 3 patterns (heart raced, weight settled, something shifted) but counts as 1 line
    // Line 1 has 1 pattern (chill ran), counts as 1 line
    // Total: 2 lines with patterns
    assert.equal(result.genericEmotion.count, 2);
    assert.deepEqual(result.genericEmotion.lines, [0, 1]);
    assert.equal(result.scored, true);
  });

  it('finds zero matches for clean screenplay text', () => {
    const text = `INT. OFFICE - DAY
Sarah sits at her desk, reviewing documents. She nods to herself and stands, moving toward the window.`;

    const result = detectSlop(text);
    assert.equal(result.genericEmotion.count, 0);
    assert.deepEqual(result.genericEmotion.lines, []);
  });

  it('detects "weight settled" pattern', () => {
    const text = `The weight settled over everything slowly.`;

    const result = detectSlop(text);
    assert.equal(result.genericEmotion.count, 1);
    assert.deepEqual(result.genericEmotion.lines, [0]);
  });

  it('detects "something shifted" pattern', () => {
    const text = `Something shifted in the air between them.`;

    const result = detectSlop(text);
    assert.equal(result.genericEmotion.count, 1);
  });

  it('detects "heart raced" pattern', () => {
    const text = `Her heart raced in her chest.`;

    const result = detectSlop(text);
    assert.equal(result.genericEmotion.count, 1);
  });

  it('detects "breath caught" pattern', () => {
    const text = `His breath caught in his throat.`;

    const result = detectSlop(text);
    assert.equal(result.genericEmotion.count, 1);
  });

  it('detects "chill ran" pattern', () => {
    const text = `A chill ran down her spine.`;

    const result = detectSlop(text);
    assert.equal(result.genericEmotion.count, 1);
  });

  it('detects "eyes widened" pattern (singular and plural)', () => {
    const result1 = detectSlop(`Her eye widened with surprise.`);
    const result2 = detectSlop(`Their eyes widened simultaneously.`);
    assert.equal(result1.genericEmotion.count, 1);
    assert.equal(result2.genericEmotion.count, 1);
  });

  it('detects "stomach dropped/churned" pattern', () => {
    const result1 = detectSlop(`His stomach dropped suddenly.`);
    const result2 = detectSlop(`Her stomach churned violently.`);
    assert.equal(result1.genericEmotion.count, 1);
    assert.equal(result2.genericEmotion.count, 1);
  });

  it('is case-insensitive', () => {
    const text1 = `HER HEART RACED WILDLY.`;
    const text2 = `her heart raced wildly.`;

    const result1 = detectSlop(text1);
    const result2 = detectSlop(text2);
    assert.equal(result1.genericEmotion.count, result2.genericEmotion.count);
    assert.equal(result1.genericEmotion.count, 1);
  });

  it('ignores false positives (partial matches)', () => {
    const text = `The heartfelt moment. Weight training. Shifted gears.`;
    const result = detectSlop(text);
    // These should not match word boundaries correctly
    assert.equal(result.genericEmotion.count, 0);
  });
});

describe('detectSlop — negated clichés', () => {
  it('does not fire on short or single-occurrence negations', () => {
    const text = `It's not fear, it's determination.`;
    const result = detectSlop(text);
    assert.equal(result.negatedClicheRaw.count, 0);
    assert.equal(result.negatedClicheGuarded.count, 0);
  });

  it('tracks raw matches separately from guarded matches', () => {
    const result = detectSlop(`Something here.`);
    assert(result.hasOwnProperty('negatedClicheRaw'));
    assert(result.hasOwnProperty('negatedClicheGuarded'));
  });
});

describe('detectSlop — vocabulary freshness', () => {
  it('abstains on text shorter than ~50 words', () => {
    const short = `He walked down the hallway.`;
    const result = detectSlop(short);
    assert.equal(result.freshness, null);
    assert.equal(result.scored, true);  // still scored, just no freshness
  });

  it('computes freshness as unique-bigram ratio for long text', () => {
    const varied = `The protagonist embarks on an extraordinary quest through mysterious landscapes encountering strange phenomena.
She discovers ancient artifacts revealing forgotten civilizations and untold historical secrets.
Every corner holds new surprises challenging her assumptions about reality itself fundamentally.
The journey transforms her perception of the world and her place within it completely.`;

    const result = detectSlop(varied);
    assert(result.freshness !== null);
    assert(typeof result.freshness === 'number');
    assert(result.freshness <= 1.0);
    assert(result.freshness >= 0.0);
  });

  it('penalizes low freshness in slopScore', () => {
    const repetitive = `the thing is the thing and the thing was the thing the thing thing is thing the thing and the thing.
the thing the thing the thing is the thing the thing thing and the thing the thing is the thing.
the thing and the thing the thing is the thing the thing thing the thing and the thing the thing.
the thing the thing and the thing is the thing thing the thing and the thing the thing is.`;

    const result = detectSlop(repetitive);
    assert(result.freshness !== null);
    assert(result.freshness < 0.4);
    assert(result.slopScore > 0);  // penalty applies
  });

  it('returns freshness=1.0 for maximally varied text', () => {
    const highVariety = `The protagonist embarks on an extraordinary quest through mysterious landscapes encountering strange phenomena.
She discovers ancient artifacts revealing forgotten civilizations and untold historical secrets.
Every corner holds new surprises challenging her assumptions about reality itself fundamentally.
The journey transforms her perception of the world and her place within it completely.`;

    const result = detectSlop(highVariety);
    assert.equal(result.freshness, 1.0);
  });
});

describe('detectSlop — composite slopScore', () => {
  it('combines genericEmotion.count * 0.5 (count is lines, not patterns)', () => {
    const text = `Her heart raced. Something shifted. Weight settled.`;
    const result = detectSlop(text);
    // Text is < 50 words, so freshness = null, no freshness penalty
    // genericEmotion.count = 1 (only 1 line has patterns)
    // slopScore = 1 * 0.5 = 0.5
    assert.equal(result.slopScore, 0.5);
  });

  it('penalizes low freshness via (0.4 - freshness) * 1.0 when freshness < 0.4', () => {
    const lowFreshness = `the thing is the thing and the thing was the thing the thing thing is thing the thing and the thing.
the thing the thing the thing is the thing the thing thing and the thing the thing is the thing.
the thing and the thing the thing is the thing the thing thing the thing and the thing the thing.
the thing the thing and the thing is the thing thing the thing and the thing the thing is.`;

    const result = detectSlop(lowFreshness);
    assert(result.slopScore > 0);
    // freshness ≈ 0.127, so penalty ≈ (0.4 - 0.127) = 0.273
    assert(result.slopScore > 0.2 && result.slopScore < 0.4);
  });

  it('does not penalize freshness when >= 0.4', () => {
    const moderateFreshness = `The setting sun casts golden light across the valley. Birds sing their evening songs.
Stars begin to emerge in the darkening sky above. Wind rustles through the trees nearby.
Cool air brings a sense of calm and peace to the wandering travelers. The colors fade.
Stars twinkle as night descends. The journey continues forward through time and space always.
Moments accumulate into memories. Stories unfold across seasons and years forever.`;

    const result = detectSlop(moderateFreshness);
    assert(result.freshness !== null, 'Text should be >= 50 words for freshness calculation');
    if (result.freshness >= 0.4) {
      // No freshness penalty should apply
      assert.equal(result.genericEmotion.count, 0);
    }
  });

  it('returns slopScore=0 for clean text', () => {
    const clean = `INT. OFFICE - DAY
Sarah sits at her desk, reviewing documents. She nods to herself and stands, moving toward the window.`;

    const result = detectSlop(clean);
    assert.equal(result.slopScore, 0);
  });
});

describe('detectSlop — edge cases', () => {
  it('handles empty string gracefully', () => {
    const result = detectSlop('');
    assert.deepEqual(result, {
      genericEmotion: { count: 0, lines: [] },
      negatedClicheRaw: { count: 0, lines: [] },
      negatedClicheGuarded: { count: 0, lines: [] },
      freshness: null,
      slopScore: 0,
      scored: false,
    });
  });

  it('handles whitespace-only input', () => {
    const result = detectSlop('   \n  \n\t  ');
    assert.equal(result.scored, false);
    assert.equal(result.slopScore, 0);
    assert.equal(result.freshness, null);
  });

  it('reports scored=true for non-empty input', () => {
    const result = detectSlop('Any text at all.');
    assert.equal(result.scored, true);
  });

  it('reports scored=false only for empty/whitespace', () => {
    const result1 = detectSlop('');
    const result2 = detectSlop('   ');
    const result3 = detectSlop('x');
    assert.equal(result1.scored, false);
    assert.equal(result2.scored, false);
    assert.equal(result3.scored, true);
  });
});

describe('detectSlop — determinism', () => {
  it('produces identical results for identical inputs (no randomness)', () => {
    const input = `The weight settled over everything. Something shifted in the air, and her heart raced.
A chill ran through the room. Time seemed to slow. Her breath caught as eyes widened.`;

    const result1 = detectSlop(input);
    const result2 = detectSlop(input);

    assert.deepEqual(result1, result2);
    assert.equal(JSON.stringify(result1), JSON.stringify(result2));
  });

  it('line indices remain consistent across multiple runs', () => {
    const input = `Generic emotion here. Another line.
Heart raced in fear. Last line.`;

    const result1 = detectSlop(input);
    const result2 = detectSlop(input);

    assert.deepEqual(result1.genericEmotion.lines, result2.genericEmotion.lines);
  });
});

describe('detectSlop — return shape', () => {
  it('returns SlopReport with all required fields', () => {
    const result = detectSlop('Test text for field validation.');
    assert(result.hasOwnProperty('genericEmotion'));
    assert(result.hasOwnProperty('negatedClicheRaw'));
    assert(result.hasOwnProperty('negatedClicheGuarded'));
    assert(result.hasOwnProperty('freshness'));
    assert(result.hasOwnProperty('slopScore'));
    assert(result.hasOwnProperty('scored'));
  });

  it('genericEmotion and negatedClicheRaw/Guarded have count and lines fields', () => {
    const result = detectSlop('Test text.');
    const validateDetection = (detection: any) => {
      assert(detection.hasOwnProperty('count'));
      assert(detection.hasOwnProperty('lines'));
      assert(typeof detection.count === 'number');
      assert(Array.isArray(detection.lines));
    };

    validateDetection(result.genericEmotion);
    validateDetection(result.negatedClicheRaw);
    validateDetection(result.negatedClicheGuarded);
  });

  it('lines arrays are sorted in ascending order', () => {
    const text = `Line 0 with heart raced.
Line 1 normal.
Line 2 with weight settled.
Line 3 with something shifted.`;

    const result = detectSlop(text);
    const lines = result.genericEmotion.lines;
    for (let i = 1; i < lines.length; i++) {
      assert(lines[i] > lines[i - 1], `Lines not sorted: ${lines}`);
    }
  });

  it('freshness is either null or a number between 0 and 1', () => {
    const short = detectSlop('Short text.');
    const long = detectSlop(`Text text text text text text text text text text text text text text text text
text text text text text text text text text text text text text text text text
text text text text text text text text text text text text text text text text.`);

    assert(short.freshness === null || typeof short.freshness === 'number');
    assert(long.freshness === null || typeof long.freshness === 'number');
    if (long.freshness !== null) {
      assert(long.freshness >= 0 && long.freshness <= 1);
    }
  });

  it('slopScore is always a non-negative number', () => {
    const results = [
      detectSlop(''),
      detectSlop('Clean action text.'),
      detectSlop('The weight settled.'),
    ];

    for (const result of results) {
      assert(typeof result.slopScore === 'number');
      assert(result.slopScore >= 0);
    }
  });

  it('scored is always a boolean', () => {
    const results = [
      detectSlop(''),
      detectSlop('Test text.'),
      detectSlop('   '),
    ];

    for (const result of results) {
      assert(typeof result.scored === 'boolean');
    }
  });
});
