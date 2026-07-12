import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  extractTheme,
  scenesFromFountain,
  THEME_EXTRACT_MIN_SCENES,
} from '../../server/nvm/analyze/theme-extract.ts';

test('scenesFromFountain: splits on INT./EXT. boundaries', () => {
  const fountain = `INT. KITCHEN - DAY
Action here.

EXT. OUTSIDE - MORNING
More action.

INT. BEDROOM - NIGHT
Final scene.`;

  const scenes = scenesFromFountain(fountain);
  assert.equal(scenes.length, 3, 'Should split into 3 scenes');
  assert.match(scenes[0], /^INT\./i, 'First scene starts with INT.');
  assert.match(scenes[1], /^EXT\./i, 'Second scene starts with EXT.');
  assert.match(scenes[2], /^INT\./i, 'Third scene starts with INT.');
});

test('scenesFromFountain: case-insensitive on INT/EXT', () => {
  const fountain = `int. LOWER - DAY
Text.

ext. LOWER - NIGHT
More text.`;

  const scenes = scenesFromFountain(fountain);
  assert.equal(scenes.length, 2, 'Should split on lowercase int/ext');
});

test('extractTheme: abstains (scored:false) on single scene', () => {
  const onScene = `INT. ROOM - DAY
A single scene about family and duty.`;

  const result = extractTheme(onScene);
  assert.equal(result.scored, false, 'Should not analyze single scene');
  assert.deepEqual(result.themeKeywords, [], 'Should have no theme keywords');
  assert.deepEqual(result.motifWords, [], 'Should have no motif words');
  assert.equal(result.confidence, 0, 'Confidence should be 0');
});

test('extractTheme: recurring words rank above one-offs', () => {
  // 8 scenes with 10 recurring words per scene (family, sacrifice, duty, honor,
  // legacy, strength, courage, wisdom, virtue, truth), plus "love" which appears
  // only once. The 10 recurring words should occupy all 8 top slots, pushing "love"
  // below the cutoff.
  const fountain = `INT. SCENE ONE - DAY
Family sacrifice duty honor legacy strength courage wisdom virtue truth.

INT. SCENE TWO - MORNING
Family sacrifice duty honor legacy strength courage wisdom virtue truth.

INT. SCENE THREE - AFTERNOON
Family sacrifice duty honor legacy strength courage wisdom virtue truth.

INT. SCENE FOUR - EVENING
Family sacrifice duty honor legacy strength courage wisdom virtue truth.

INT. SCENE FIVE - NIGHT
Family sacrifice duty honor legacy strength courage wisdom virtue truth.

EXT. SCENE SIX - DAWN
Family sacrifice duty honor legacy strength courage wisdom virtue truth.

INT. SCENE SEVEN - NOON
Family sacrifice duty honor legacy strength courage wisdom virtue truth.

INT. SCENE EIGHT - DUSK
Family sacrifice duty honor legacy strength courage wisdom virtue. He felt love once.`;

  const result = extractTheme(fountain);
  assert.equal(result.scored, true, 'Should analyze 8 scenes');
  
  // Recurring words should appear in themeKeywords
  assert.ok(
    result.themeKeywords.includes('family'),
    'Recurring "family" should be in themeKeywords',
  );
  
  assert.ok(
    result.themeKeywords.includes('sacrifice'),
    'Recurring "sacrifice" should be in themeKeywords',
  );
  
  // "love" appears only once (scene 8), so with 10 other recurring words
  // it should NOT be in the top 8 themeKeywords
  assert.ok(
    !result.themeKeywords.includes('love'),
    'One-off "love" should not rank in top 8 when outcompeted by recurring words',
  );
});

test('extractTheme: motifWords includes recurring words', () => {
  const fountain = `INT. SCENE ONE - DAY
The family gathers to discuss duty.

INT. SCENE TWO - NIGHT
The family reconvenes about duty and honor.`;

  const result = extractTheme(fountain);
  assert.equal(result.scored, true, 'Should analyze 2 scenes');
  
  // "family" appears in both scenes -> motifWord
  assert.ok(
    result.motifWords.includes('family'),
    'Recurring "family" should be in motifWords',
  );
});

test('extractTheme: deterministic output', () => {
  const fountain = `INT. SCENE ONE - DAY
Family and sacrifice matter deeply.

INT. SCENE TWO - NIGHT
The family reflects on sacrifice.`;

  const run1 = extractTheme(fountain);
  const run2 = extractTheme(fountain);

  assert.deepEqual(
    run1.themeKeywords,
    run2.themeKeywords,
    'themeKeywords should be identical on repeated calls',
  );
  assert.deepEqual(
    run1.motifWords,
    run2.motifWords,
    'motifWords should be identical on repeated calls',
  );
  assert.equal(
    run1.confidence,
    run2.confidence,
    'confidence should be identical on repeated calls',
  );
  assert.equal(
    run1.scored,
    run2.scored,
    'scored should be identical on repeated calls',
  );
});

test('extractTheme: confidence reflects charged word ratio', () => {
  // When all words are charged (recurring), confidence should be high
  const allCharged = `INT. SCENE ONE - DAY
Family sacrifice duty.

INT. SCENE TWO - NIGHT
Family sacrifice duty.`;

  const result = allCharged ? extractTheme(allCharged) : null;
  assert.ok(result, 'Should produce a result');
  assert.ok(
    result!.confidence > 0,
    'Confidence should be > 0 for charged content',
  );
});

test('extractTheme: at THEME_EXTRACT_MIN_SCENES boundary', () => {
  assert.equal(
    THEME_EXTRACT_MIN_SCENES,
    2,
    'Minimum scenes threshold is 2',
  );

  const oneBelowMin = `INT. ONLY - DAY
Text.`;
  const resultBelow = extractTheme(oneBelowMin);
  assert.equal(resultBelow.scored, false, 'Below min scenes should abstain');

  const exactlyMin = `INT. FIRST - DAY
Family matters.

INT. SECOND - NIGHT
Family endures.`;
  const resultExact = extractTheme(exactlyMin);
  assert.equal(resultExact.scored, true, 'At min scenes should analyze');
});

test('extractTheme: themeKeywords limited to 8', () => {
  // Create a fountain with many recurring words to test the 8-limit
  const fountain = `INT. SCENE ONE - DAY
Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda.

INT. SCENE TWO - NIGHT
Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda.

INT. SCENE THREE - DAWN
Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda.`;

  const result = extractTheme(fountain);
  assert.ok(
    result.themeKeywords.length <= 8,
    'themeKeywords should be capped at 8 items',
  );
});

test('extractTheme: filters stopwords', () => {
  // Common stopwords like "the", "and", "of" should be excluded
  const fountain = `INT. SCENE ONE - DAY
The and of a in is.

INT. SCENE TWO - NIGHT
The and of a in is.`;

  const result = extractTheme(fountain);
  
  // None of these stopwords should appear in keywords or motif words
  const allWords = [...result.themeKeywords, ...result.motifWords];
  const stopwords = ['the', 'and', 'of', 'a', 'in', 'is'];
  for (const word of stopwords) {
    assert.ok(
      !allWords.includes(word),
      `Stopword "${word}" should not appear in results`,
    );
  }
});
