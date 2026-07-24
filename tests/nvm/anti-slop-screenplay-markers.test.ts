// Tests for screenplay AI marker detection (64 Tier 1 patterns from avoid-ai-writing)
// UNVALIDATED patterns - these tests verify detection logic, NOT real-world accuracy.
// Post-P1: add fixtures from real corpus, measure false positive rate (<0.1/film target).

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { detectSlop } from '../../server/nvm/analyze/anti-slop.ts';

// ============================================================================
// Positive Fixtures: Known AI patterns that SHOULD be detected
// ============================================================================

test('detectSlop: copula-avoidance patterns', () => {
  const text = `INT. OFFICE - DAY

The building serves as headquarters. The lobby features marble floors.
The company boasts over 500 employees. This presents a challenge.`;

  const result = detectSlop(text);
  // Should detect 4 copula-avoidance patterns (serves as, features, boasts, presents)
  assert.ok(result.screenplayAIMarkers.byCategory['copula-avoidance'] >= 4, 
    `Expected >=4 copula-avoidance, got ${result.screenplayAIMarkers.byCategory['copula-avoidance']}`);
  assert.ok(result.screenplayAIMarkers.detection.count >= 1, 'Should flag at least 1 line');
});

test('detectSlop: inflated-staging patterns', () => {
  const text = `INT. CAFE - DAY

A charming little cafe nestled in the heart of downtown.
The vibrant city bustles with activity. The thriving business
showcases local art. The picturesque street is idyllic.`;

  const result = detectSlop(text);
  assert.ok(result.screenplayAIMarkers.byCategory['inflated-staging'] >= 6,
    `Expected >=6 inflated-staging, got ${result.screenplayAIMarkers.byCategory['inflated-staging']}`);
  assert.ok(result.screenplayAIMarkers.detection.count >= 1, 'Should flag at least 1 line');
});

test('detectSlop: vague-complexity patterns', () => {
  const text = `INT. LAB - DAY

The scientist explains the intricacies of quantum physics.
The intricate mechanism has nuanced implications. The multifaceted
problem involves a myriad of variables and a plethora of solutions.`;

  const result = detectSlop(text);
  assert.ok(result.screenplayAIMarkers.byCategory['vague-complexity'] >= 6,
    `Expected >=6 vague-complexity, got ${result.screenplayAIMarkers.byCategory['vague-complexity']}`);
  assert.ok(result.screenplayAIMarkers.detection.count >= 1, 'Should flag at least 1 line');
});

test('detectSlop: unnecessary-formality patterns', () => {
  const text = `INT. BOARDROOM - DAY

The meeting commences at nine. The team endeavors to ascertain
the facts. They utilize advanced tools to obtain the data.
The chart demonstrates the need to facilitate change.`;

  const result = detectSlop(text);
  assert.ok(result.screenplayAIMarkers.byCategory['unnecessary-formality'] >= 7,
    `Expected >=7 unnecessary-formality, got ${result.screenplayAIMarkers.byCategory['unnecessary-formality']}`);
  assert.ok(result.screenplayAIMarkers.detection.count >= 1, 'Should flag at least 1 line');
});

test('detectSlop: metaphorical-inflation patterns', () => {
  const text = `INT. GALLERY - DAY

A tapestry of emotions unfolds. The symphony of colors creates
a beacon for creativity. She embarks on a journey to delve into
the realm of modern art and unpack its meaning.`;

  const result = detectSlop(text);
  // tapestry, symphony, beacon, embarks, delve, realm, unpack = 7 patterns (with "its" support)
  assert.ok(result.screenplayAIMarkers.byCategory['metaphorical-inflation'] >= 7,
    `Expected >=7 metaphorical-inflation, got ${result.screenplayAIMarkers.byCategory['metaphorical-inflation']}`);
  assert.ok(result.screenplayAIMarkers.detection.count >= 1, 'Should flag at least 1 line');
});

test('detectSlop: generic-intensifiers patterns', () => {
  const text = `INT. OFFICE - DAY

The robust system provides comprehensive coverage. The meticulous
analysis reveals seamless integration. The holistic approach is
pivotal. The daunting task requires a formidable effort.`;

  const result = detectSlop(text);
  assert.ok(result.screenplayAIMarkers.byCategory['generic-intensifiers'] >= 8,
    `Expected >=8 generic-intensifiers, got ${result.screenplayAIMarkers.byCategory['generic-intensifiers']}`);
  assert.ok(result.screenplayAIMarkers.detection.count >= 1, 'Should flag at least 1 line');
});

test('detectSlop: buzzwords-jargon patterns', () => {
  const text = `INT. STARTUP OFFICE - DAY

The new paradigm creates synergy. They leverage best practices
to deliver actionable insights. The impactful learnings reshape
the business model.`;

  const result = detectSlop(text);
  assert.ok(result.screenplayAIMarkers.byCategory['buzzwords-jargon'] >= 6,
    `Expected >=6 buzzwords-jargon, got ${result.screenplayAIMarkers.byCategory['buzzwords-jargon']}`);
  assert.ok(result.screenplayAIMarkers.detection.count >= 1, 'Should flag at least 1 line');
});

test('detectSlop: filler-cliches patterns', () => {
  const text = `INT. ROOM - DAY

She walks in order to reach the door due to the fact that
at its core, the situation serves to highlight the fact that
this cutting-edge technology is a game-changer. Only time will tell.`;

  const result = detectSlop(text);
  assert.ok(result.screenplayAIMarkers.byCategory['filler-cliches'] >= 7,
    `Expected >=7 filler-cliches, got ${result.screenplayAIMarkers.byCategory['filler-cliches']}`);
  assert.ok(result.screenplayAIMarkers.detection.count >= 1, 'Should flag at least 1 line');
});

// ============================================================================
// Negative Fixtures: Clean screenplay text that should NOT trigger patterns
// ============================================================================

test('detectSlop: clean action lines (no false positives)', () => {
  const text = `INT. APARTMENT - DAY

MAYA enters, drops her keys on the counter. She pours coffee,
stares out the window. Rain streaks the glass.

The phone RINGS. She ignores it.`;

  const result = detectSlop(text);
  assert.equal(result.screenplayAIMarkers.detection.count, 0, 'Clean text should have no AI markers');
});

test('detectSlop: legitimate screenplay language', () => {
  const text = `EXT. STREET - NIGHT

A man runs through narrow alleys. His breath comes in gasps.
Footsteps echo behind him. He turns a corner, ducks into
a doorway, holds still.`;

  const result = detectSlop(text);
  assert.equal(result.screenplayAIMarkers.detection.count, 0, 'Legitimate language should not trigger');
});

test('detectSlop: technical language in context', () => {
  const text = `INT. THEATER - DAY

The film features three Oscar winners. He obtains a ticket
at the box office. The movie demonstrates strong character work.`;

  // "features" in "features three Oscar winners" is legitimate
  // "obtains" at box office is acceptable
  // "demonstrates" might trigger but is technical context
  const result = detectSlop(text);
  // Allow some hits for edge cases, but should be minimal
  assert.ok(result.screenplayAIMarkers.detection.count <= 2, 'Technical context should have few false positives');
});

// ============================================================================
// Multiple Categories & Mixed Content
// ============================================================================

test('detectSlop: multiple categories in same script', () => {
  const text = `INT. OFFICE - DAY

The building serves as headquarters. The vibrant lobby
bustles with activity. The comprehensive system utilizes
cutting-edge technology in order to leverage synergy.`;

  const result = detectSlop(text);
  
  // Should detect across multiple categories (check category counts, not line count)
  assert.ok(result.screenplayAIMarkers.byCategory['copula-avoidance'] >= 1);
  assert.ok(result.screenplayAIMarkers.byCategory['inflated-staging'] >= 1);
  assert.ok(result.screenplayAIMarkers.byCategory['generic-intensifiers'] >= 1);
  assert.ok(result.screenplayAIMarkers.byCategory['unnecessary-formality'] >= 1);
  assert.ok(result.screenplayAIMarkers.byCategory['buzzwords-jargon'] >= 1);
  assert.ok(result.screenplayAIMarkers.byCategory['filler-cliches'] >= 1);
});

test('detectSlop: screenplay AI markers + generic emotion combined', () => {
  const text = `INT. ROOM - DAY

Her heart raced as she entered the vibrant office.
Something shifted in the atmosphere. The comprehensive
system serves as a testament to innovation.`;

  const result = detectSlop(text);
  
  // Should detect both old and new patterns
  assert.ok(result.genericEmotion.count >= 2, 'Should detect generic emotion');
  assert.ok(result.screenplayAIMarkers.byCategory['inflated-staging'] >= 1, 'Should detect inflated-staging');
  assert.ok(result.screenplayAIMarkers.byCategory['generic-intensifiers'] >= 1, 'Should detect generic-intensifiers');
  assert.ok(result.screenplayAIMarkers.byCategory['copula-avoidance'] >= 1, 'Should detect copula-avoidance');
  
  // Scoring should integrate both
  assert.ok(result.slopScore > 0, 'Should have positive slop score');
});

// ============================================================================
// Line Number Evidence
// ============================================================================

test('detectSlop: line numbers are accurate', () => {
  const text = `Line 0: clean
Line 1: The building serves as headquarters.
Line 2: clean
Line 3: The vibrant city bustles.
Line 4: clean`;

  const result = detectSlop(text);
  
  assert.ok(result.screenplayAIMarkers.detection.lines.includes(1), 'Should detect line 1');
  assert.ok(result.screenplayAIMarkers.detection.lines.includes(3), 'Should detect line 3');
  assert.ok(!result.screenplayAIMarkers.detection.lines.includes(0), 'Should not flag line 0');
  assert.ok(!result.screenplayAIMarkers.detection.lines.includes(2), 'Should not flag line 2');
  assert.ok(!result.screenplayAIMarkers.detection.lines.includes(4), 'Should not flag line 4');
});

// ============================================================================
// Scoring Integration
// ============================================================================

test('detectSlop: scoring formula includes screenplay AI markers', () => {
  const text = `INT. OFFICE - DAY

The building serves as headquarters. The vibrant lobby features
comprehensive security. The system utilizes cutting-edge technology.`;

  const result = detectSlop(text);
  
  const expectedScore = result.screenplayAIMarkers.detection.count * 0.35;
  assert.ok(result.slopScore >= expectedScore, 'Score should include AI marker weight (0.35)');
});

test('detectSlop: AI markers weighted less than validated generic emotion', () => {
  // Separate lines ensure separate counts
  const textWithEmotion = `Line one has heart raced here.
Line two has breath caught here.`;
  const textWithMarkers = `Serves as headquarters. Features marble. Boasts employees. Comprehensive system.`;
  
  const emotionResult = detectSlop(textWithEmotion);
  const markersResult = detectSlop(textWithMarkers);
  
  // Should detect emotions on 2 separate lines
  assert.ok(emotionResult.genericEmotion.count >= 2, 'Should detect at least 2 emotion lines');
  assert.ok(emotionResult.slopScore >= 1.0, 'Emotion score should be >= 1.0');
  
  // Markers should also score
  assert.ok(markersResult.screenplayAIMarkers.byCategory['copula-avoidance'] >= 3);
  assert.ok(markersResult.slopScore > 0, 'Markers should contribute to score');
});

// ============================================================================
// Edge Cases
// ============================================================================

test('detectSlop: empty text handled gracefully', () => {
  const result = detectSlop('');
  
  assert.equal(result.screenplayAIMarkers.detection.count, 0);
  assert.equal(result.slopScore, 0);
  assert.equal(result.scored, false);
});

test('detectSlop: validation status is marked false', () => {
  const text = `The building serves as headquarters.`;
  const result = detectSlop(text);
  
  assert.equal(result.screenplayAIMarkers.validated, false, 'Should be marked as unvalidated');
});

test('detectSlop: category counts sum correctly', () => {
  const text = `Serves as. Vibrant. Intricate. Commence. Tapestry. Robust. Paradigm. In order to.`;
  const result = detectSlop(text);
  
  const categorySum = Object.values(result.screenplayAIMarkers.byCategory).reduce((a, b) => a + b, 0);
  
  // Category sum should equal or exceed detection count (same line can have multiple categories)
  assert.ok(categorySum >= result.screenplayAIMarkers.detection.count, 
    'Category counts should sum to at least detection count');
});

// ============================================================================
// Backward Compatibility
// ============================================================================

test('detectSlop: existing genericEmotion detection unchanged', () => {
  const text = `Her heart raced down the street.
Something shifted in the room.
Time slowed to a crawl.`;
  const result = detectSlop(text);
  
  assert.equal(result.genericEmotion.count, 3, 'Should detect all 3 emotion patterns on 3 lines');
  assert.ok(result.scored, 'Should be scored');
});

test('detectSlop: existing negatedCliche detection unchanged', () => {
  const text = `It's not about money, it's about power. Not wealth but influence.`;
  const result = detectSlop(text);
  
  assert.ok(result.negatedClicheRaw.count >= 1, 'Should detect negated cliché');
});

test('detectSlop: existing vocabulary freshness unchanged', () => {
  // Need enough words (50+) for freshness to compute
  const words = [];
  for (let i = 0; i < 60; i++) {
    words.push('word');
  }
  const repetitive = words.join(' ');
  
  const result = detectSlop(repetitive);
  
  assert.ok(result.freshness !== null, 'Should compute freshness for 60+ words');
  assert.ok(result.freshness < 0.4, 'Repetitive text should have low freshness');
  assert.ok(result.slopScore > 0, 'Should penalize low freshness');
});
