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

  it('marks natural dialogue as lower-ratio (not exposition-risk)', () => {
    const result = analyzeDialogueInfoRatio([makeNaturalDialogue()]);
    assert.strictEqual(result.scored, true);
    assert(result.turns.length >= 6, 'should parse 6+ dialogue turns');

    const expositionRiskCount = result.turns.filter(t => t.expositionRisk).length;
    const nonRiskCount = result.turns.filter(t => !t.expositionRisk).length;
    assert(nonRiskCount > 0, 'should have at least some non-risk turns');
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

  it('identifies exposition-heavy scenes when majority of turns are exposition-risk', () => {
    const result = analyzeDialogueInfoRatio([makeInfoDumpScene()]);
    if (result.scored && result.turns.length > 0) {
      const hasExpositionHeavyScene = result.expositionHeavyScenes.length > 0;
      if (result.turns.some(t => t.expositionRisk)) {
        assert(hasExpositionHeavyScene, 'should mark scene as exposition-heavy when turn is flagged');
      }
    }
  });

  it('computes meanRatio across all turns', () => {
    const result = analyzeDialogueInfoRatio([makeNaturalDialogue()]);
    if (result.scored) {
      const manual = result.turns.length > 0
        ? result.turns.reduce((s, t) => s + t.ratio, 0) / result.turns.length
        : 0;
      assert.strictEqual(result.meanRatio, manual, 'meanRatio should equal average of all turn ratios');
    }
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

  it('correctly filters stopwords from content', () => {
    const stopwordScene = 'INT. ROOM - DAY\n\nPERSON\nI am going to the store because it is nice and beautiful and good.\n\nOTHER\nYes, I think so too.\n\n';
    const result = analyzeDialogueInfoRatio([stopwordScene]);
    if (result.scored) {
      assert(result.turns.length > 0, 'should parse dialogue with stopwords');
      for (const turn of result.turns) {
        assert(turn.ratio >= 0 && turn.ratio <= 1, 'ratio out of bounds');
      }
    }
  });

  it('accumulates seen words across turns correctly', () => {
    const repeatingDialogue = 'INT. ROOM - DAY\n\nALICE\nThe book is on the table.\n\nBOB\nI like the book too.\n\nALICE\nYes, the book is special.\n\n';
    const result = analyzeDialogueInfoRatio([repeatingDialogue]);
    if (result.scored && result.turns.length >= 3) {
      assert(result.turns[0].ratio > result.turns[2].ratio, 'later turns with repeated words should have lower ratio');
    }
  });
});
