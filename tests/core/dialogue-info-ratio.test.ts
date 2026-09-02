import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeDialogueInfoRatio,
  DIALOGUE_INFO_RATIO_MIN_TURNS,
} from '../../server/nvm/analyze/dialogue-info-ratio.ts';

function makeInfoDumpScene(): string {
  return 'INT. HEADQUARTERS - DAY\n\nCOMMANDER\nI am sending you to Krakatoa to meet Agent Novak.\n\nASSISTANT\nKrakatoa? Who is Agent Novak?\n\nCOMMANDER\nThe encrypted files are in the vault with blueprints for Olympus Station.\n\nASSISTANT\nWhat is Olympus Station?\n\n';
}

function makeNaturalDialogue(): string {
  return 'INT. ROOM - DAY\n\nROSA\nHey, what is going on?\n\nDEV\nI do not know. Something happened.\n\nROSA\nWhat do you mean, something? Tell me.\n\nDEV\nI cannot explain it yet. But we need to go.\n\nROSA\nGo? Go where? Why do we need to go?\n\nDEV\nAway from here. That is all I know.\n\n';
}

function makeTinyDialogue(): string {
  return 'INT. ROOM - DAY\n\nALEX\nHello there.\n\n';
}

function makeNoDialogue(): string {
  return 'INT. EMPTY ROOM - DAY\n\nThe room is silent.\n\n';
}

function makeMultiSceneScripts(): string[] {
  return [
    'INT. BUILDING - DAY\n\nGUIDE\nWelcome to the International Astronomical Society. This facility houses the largest radio telescope.\n\n',
    'INT. OFFICE - DAY\n\nSCIENTIST\nDid you understand what the guide explained?\n\nVISITOR\nYes, it was very clear.\n\nSCIENTIST\nGood. Now let us discuss the project.\n\nVISITOR\nWhat project?\n\nSCIENTIST\nThe one we discussed yesterday. Remember?\n\n',
  ];
}

describe('analyzeDialogueInfoRatio — dialogue exposition detection', () => {
  it('flags a pure info-dump line as exposition-risk (high ratio)', () => {
    const result = analyzeDialogueInfoRatio([makeInfoDumpScene()]);
    assert.strictEqual(result.scored, true);
    assert(result.turns.length > 0, 'should parse at least one turn');

    const infoDumpTurn = result.turns[0];
    assert(infoDumpTurn.ratio > 0.55, `expected ratio > 0.55, got ${infoDumpTurn.ratio}`);
    assert.strictEqual(infoDumpTurn.expositionRisk, true);
  });

  // BEHAVIOURAL (2026-09-02 vacuous-test sweep): `nonRiskCount > 0` is satisfied
  // by any output with a single unflagged turn, so the test could not tell
  // natural dialogue from the info-dump. Pinning the real numbers exposed that
  // it currently CANNOT — see KNOWN WEAKNESS below. The test now records the
  // measured behaviour rather than implying a separation that does not exist.
  it('scores natural dialogue with a mix of risk and non-risk turns (does NOT separate it from the info-dump)', () => {
    const natural = analyzeDialogueInfoRatio([makeNaturalDialogue()]);
    assert.strictEqual(natural.scored, true);
    assert.strictEqual(natural.turns.length, 6, 'should parse 6 dialogue turns');

    const nonRiskCount = natural.turns.filter(t => !t.expositionRisk).length;
    const riskCount = natural.turns.filter(t => t.expositionRisk).length;
    assert.strictEqual(nonRiskCount, 2, 'the two closing turns reuse established words');
    assert.strictEqual(riskCount, 4);

    // KNOWN WEAKNESS: the ratio is a NEW-CONTENT-WORD rate, not an exposition
    // rate, so short question-and-answer dialogue that keeps introducing fresh
    // nouns outscores a deliberate info-dump. On these two fixtures the natural
    // scene's meanRatio (11/18 ≈ 0.611) is HIGHER than the info-dump's (0.5),
    // and BOTH scenes are reported as exposition-heavy. A correct
    // implementation would weight proper nouns / unasked-for world facts, or
    // discount content introduced in answer to an on-screen question, so that
    // the info-dump scores strictly above conversational dialogue. Asserted as
    // measured; changing the formula is a scoring-path change and needs a
    // measure-real receipt, so it is not done here.
    const infoDump = analyzeDialogueInfoRatio([makeInfoDumpScene()]);
    assert.ok(natural.meanRatio > infoDump.meanRatio,
      'measured, not desired: natural dialogue currently scores HIGHER than the info-dump '
      + `(natural=${natural.meanRatio}, infoDump=${infoDump.meanRatio}) — see KNOWN WEAKNESS above`);
    assert.deepStrictEqual(natural.expositionHeavyScenes, [0],
      'measured, not desired: the natural scene is also flagged exposition-heavy');
  });

  it('abstains on input below minimum turn threshold', () => {
    const result = analyzeDialogueInfoRatio([makeTinyDialogue()]);
    assert.strictEqual(result.scored, false, 'should abstain on too-few turns');
  });

  it('abstains on scene with no dialogue', () => {
    const result = analyzeDialogueInfoRatio([makeNoDialogue()]);
    assert.strictEqual(result.scored, false, 'should abstain on no-dialogue input');
    assert.strictEqual(result.turns.length, 0, 'should parse zero turns');
  });

  // BEHAVIOURAL (2026-09-02 vacuous-test sweep): this test's only assertion sat
  // inside two nested `if`s with no `else`, so it silently skipped whenever the
  // analyzer abstained or flagged nothing — i.e. exactly when it was broken. It
  // now asserts the positive AND a negative scene that must NOT be flagged.
  it('identifies exposition-heavy scenes when majority of turns are exposition-risk', () => {
    const heavy = analyzeDialogueInfoRatio([makeInfoDumpScene()]);
    assert.strictEqual(heavy.scored, true, 'the info-dump fixture must be scored, not abstained on');
    assert.ok(heavy.turns.some(t => t.expositionRisk), 'at least one info-dump turn is exposition-risk');
    assert.deepStrictEqual(heavy.expositionHeavyScenes, [0],
      'the single info-dump scene must be reported by index, so the writer knows WHERE to look');

    // Negative half: a scene whose turns mostly reuse already-seen content is
    // below the majority bar and must not appear in expositionHeavyScenes.
    const light = analyzeDialogueInfoRatio([
      'INT. ROOM - DAY\n\nALICE\nThe book is on the table.\n\nBOB\nI like the book too.\n\nALICE\nYes, the book is special.\n\n',
    ]);
    assert.strictEqual(light.scored, true, 'the negative fixture must also be scored — an abstain would prove nothing');
    assert.deepStrictEqual(light.expositionHeavyScenes, [],
      'a scene with a minority of exposition-risk turns must not be flagged exposition-heavy');
  });

  // BEHAVIOURAL (2026-09-02 vacuous-test sweep): the mean-vs-manual equality was
  // wrapped in `if (result.scored)` — an abstaining analyzer skipped it. The
  // manual average is also re-derived from the same array the assertion reads,
  // so it cannot catch a wrong DENOMINATOR; pin the literal value too.
  it('computes meanRatio across all turns', () => {
    const result = analyzeDialogueInfoRatio([makeNaturalDialogue()]);
    assert.strictEqual(result.scored, true);
    assert.strictEqual(result.turns.length, 6, 'the natural-dialogue fixture parses 6 turns');
    const manual = result.turns.reduce((s, t) => s + t.ratio, 0) / result.turns.length;
    assert.strictEqual(result.meanRatio, manual, 'meanRatio should equal average of all turn ratios');
    // 1 + 1 + 2/3 + 1 + 0 + 0 over 6 turns.
    assert.ok(Math.abs(result.meanRatio - 11 / 18) < 1e-12,
      `meanRatio should be 11/18 for this fixture, got ${result.meanRatio}`);
  });

  it('attributes turns to correct scene index (multi-scene input)', () => {
    const scenes = makeMultiSceneScripts();
    const result = analyzeDialogueInfoRatio(scenes);
    assert.strictEqual(result.scored, true);

    const scene0Turns = result.turns.filter(t => t.sceneIdx === 0);
    assert(scene0Turns.length > 0, 'should parse scene 0 dialogue');
    assert(scene0Turns.every(t => t.sceneIdx === 0), 'all scene 0 turns should have sceneIdx=0');

    const scene1Turns = result.turns.filter(t => t.sceneIdx === 1);
    assert(scene1Turns.length > 0, 'should parse scene 1 dialogue');
    assert(scene1Turns.every(t => t.sceneIdx === 1), 'all scene 1 turns should have sceneIdx=1');
  });

  it('is deterministic across multiple runs', () => {
    const scene = makeNaturalDialogue();
    const run1 = analyzeDialogueInfoRatio([scene]);
    const run2 = analyzeDialogueInfoRatio([scene]);
    assert.deepStrictEqual(run1, run2, 'same input should produce identical output');
  });

  it('applies genre-tuned threshold correctly', () => {
    const scene = makeInfoDumpScene();
    const resultDefault = analyzeDialogueInfoRatio([scene], null, 0.60);
    const resultStrict = analyzeDialogueInfoRatio([scene], null, 0.75);

    assert.strictEqual(resultDefault.turns.length, resultStrict.turns.length);

    const defaultRiskCount = resultDefault.turns.filter(t => t.expositionRisk).length;
    const strictRiskCount = resultStrict.turns.filter(t => t.expositionRisk).length;
    assert(strictRiskCount <= defaultRiskCount, 'stricter threshold should not increase exposition-risk count');
  });

  it('handles mixed all-caps and lowercase dialogue cues', () => {
    const mixedCue = 'INT. ROOM - DAY\n\nCOMMANDER\nFirst statement here.\n\nassistant\nSecond statement lowercase.\n\nCEO\nThird statement here.\n\n';
    const result = analyzeDialogueInfoRatio([mixedCue]);
    assert(result.turns.length >= 1, 'should parse at least uppercase dialogue cues');
  });

  // BEHAVIOURAL (2026-09-02 vacuous-test sweep): "every ratio is in [0,1]" is
  // true of any frozen constant and was additionally guarded by `if
  // (result.scored)`. Stopword filtering is now proved by DISCRIMINATION: two
  // scenes with an identical opening turn, differing only in whether the reply
  // is made of stopwords or of unseen content words.
  it('correctly filters stopwords from content', () => {
    const opening = 'INT. ROOM - DAY\n\nPERSON\nI am going to the store because it is nice and beautiful and good.\n\n';
    const stopwordReply = analyzeDialogueInfoRatio([opening + 'OTHER\nYes, I think so too.\n\n']);
    const contentReply = analyzeDialogueInfoRatio([opening + 'OTHER\nThe helicopter carried plutonium northward.\n\n']);

    assert.strictEqual(stopwordReply.scored, true);
    assert.strictEqual(contentReply.scored, true);
    assert.strictEqual(stopwordReply.turns.length, 2);
    assert.strictEqual(contentReply.turns.length, 2);

    // The shared opening turn must score identically in both — otherwise the
    // difference below could come from anywhere.
    assert.strictEqual(stopwordReply.turns[0].ratio, contentReply.turns[0].ratio,
      'the identical opening turn must score identically in both scenes');

    // "Yes, I think so too." is entirely stopwords: after filtering there is no
    // content left, so the turn carries no new information.
    assert.strictEqual(stopwordReply.turns[1].ratio, 0,
      'an all-stopword reply must contribute zero new-information ratio');
    assert.ok(contentReply.turns[1].ratio > stopwordReply.turns[1].ratio,
      'a reply of unseen content words must out-score an all-stopword reply');
  });

  // BEHAVIOURAL (2026-09-02 vacuous-test sweep): the ordering assertion was
  // guarded by `if (result.scored && result.turns.length >= 3)`, so a parser
  // that produced two turns made the test vanish rather than fail. The guard is
  // now an assertion, and the accumulation is pinned to exact ratios.
  it('accumulates seen words across turns correctly', () => {
    const repeatingDialogue = 'INT. ROOM - DAY\n\nALICE\nThe book is on the table.\n\nBOB\nI like the book too.\n\nALICE\nYes, the book is special.\n\n';
    const result = analyzeDialogueInfoRatio([repeatingDialogue]);
    assert.strictEqual(result.scored, true);
    assert.strictEqual(result.turns.length, 3, 'three dialogue turns must be parsed');
    assert.strictEqual(result.turns[0].ratio, 1, 'the first turn is all-new content by definition');
    assert.ok(result.turns[0].ratio > result.turns[2].ratio,
      'later turns with repeated words should have lower ratio');
    // "book" is already seen by turn 3, "special" is not: half the content is new.
    assert.strictEqual(result.turns[2].ratio, 0.5,
      'the third turn reuses "book" and introduces "special" — exactly half new');
  });
});
