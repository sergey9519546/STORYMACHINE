// Script Doctor — tests for the pure Fountain-native analyzer.
// Conventions: node:test + assert/strict, matching tests/core/core-01.test.ts
// and tests/passes/*.test.ts.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeFountainText } from '../../server/nvm/analyze/fountain-analyzer.ts';

describe('analyzeFountainText — scene segmentation', () => {
  it('splits on 3 sluglines into 3 records with the correct slugs', () => {
    const fountain = [
      'INT. KITCHEN - DAY',
      '',
      'Sarah stares at the letter.',
      '',
      'SARAH',
      "I can't believe this.",
      '',
      'INT. GARAGE - NIGHT',
      '',
      'The engine roars to life.',
      '',
      'JOHN',
      'We need to go now.',
      '',
      'EXT. HIGHWAY - NIGHT',
      '',
      'The car speeds away into the distance.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.sceneCount, 3);
    assert.equal(analysis.records.length, 3);
    assert.deepEqual(
      analysis.records.map(r => r.slug),
      ['INT. KITCHEN - DAY', 'INT. GARAGE - NIGHT', 'EXT. HIGHWAY - NIGHT'],
    );
    assert.deepEqual(analysis.records.map(r => r.sceneIdx), [0, 1, 2]);
    assert.deepEqual(analysis.records.map(r => r.commitId), [
      'fountain-scene-0', 'fountain-scene-1', 'fountain-scene-2',
    ]);
    assert.deepEqual(analysis.records.map(r => r.createdAt), [0, 1, 2]);
  });

  it('treats a headingless text as a single implicit scene', () => {
    const fountain = [
      'Just some action happening here in a plain room.',
      '',
      'CHARACTER',
      'Hello there, how have you been lately.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.sceneCount, 1);
    assert.equal(analysis.records.length, 1);
    assert.equal(analysis.records[0].slug, 'UNTITLED SCENE');
  });

  it('returns zero records/sceneCount for empty input', () => {
    const analysis = analyzeFountainText('');
    assert.deepEqual(analysis.records, []);
    assert.equal(analysis.sceneCount, 0);
    assert.equal(analysis.characters.length, 0);
    assert.equal(analysis.wordCount, 0);
    assert.equal(analysis.dialogueLineCount, 0);
    assert.equal(analysis.actionLineCount, 0);
  });

  it('returns zero records/sceneCount for whitespace-only input', () => {
    const analysis = analyzeFountainText('   \n\n\t  \n');
    assert.deepEqual(analysis.records, []);
    assert.equal(analysis.sceneCount, 0);
  });
});

describe('analyzeFountainText — determinism', () => {
  it('produces identical output across two calls on the same string', () => {
    const fountain = [
      'INT. WAREHOUSE - NIGHT',
      '',
      'A gun. Blood on the floor. He runs! Screams echo in the dark warehouse. Trapped!',
      '',
      'MAN',
      'Run! Now! Hurry!',
      '',
      'INT. STUDY - DAY',
      '',
      'A hidden drawer holds a secret note.',
      '',
      'DETECTIVE',
      "Who left this? Why is it hidden? What's the truth here?",
    ].join('\n');

    const first = analyzeFountainText(fountain);
    const second = analyzeFountainText(fountain);
    assert.deepEqual(first, second);
  });
});

describe('analyzeFountainText — suspenseDelta', () => {
  it('fires positive on a scene dense with danger lexicon + exclamations', () => {
    const fountain = [
      'INT. WAREHOUSE - NIGHT',
      '',
      'A gun. Blood on the floor. He runs! Screams echo in the dark warehouse. Trapped!',
      '',
      'MAN',
      'Run! Now! Hurry!',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.ok(analysis.records[0].suspenseDelta > 0, `expected positive suspenseDelta, got ${analysis.records[0].suspenseDelta}`);
  });

  it('does not fire on a neutral scene with no danger or relief lexicon', () => {
    const fountain = [
      'INT. LIVING ROOM - DAY',
      '',
      'Sarah reads a paperback novel on the couch this afternoon.',
      '',
      'SARAH',
      'I might make some tea later.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].suspenseDelta, 0);
  });
});

describe('analyzeFountainText — curiosityDelta', () => {
  it('fires positive on a scene dense with questions + mystery lexicon', () => {
    const fountain = [
      'INT. STUDY - DAY',
      '',
      'A hidden drawer holds a secret note.',
      '',
      'DETECTIVE',
      "Who left this? Why is it hidden? What's the truth here?",
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.ok(analysis.records[0].curiosityDelta > 0, `expected positive curiosityDelta, got ${analysis.records[0].curiosityDelta}`);
  });

  it('does not fire on a plain statement-only scene', () => {
    const fountain = [
      'INT. OFFICE - DAY',
      '',
      'John files paperwork at his desk.',
      '',
      'JOHN',
      'This report is complete.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].curiosityDelta, 0);
  });
});

describe('analyzeFountainText — clockRaised / clockDelta', () => {
  it('fires when deadline lexicon is present', () => {
    const fountain = [
      'INT. CONTROL ROOM - NIGHT',
      '',
      'The clock reads five minutes to midnight. The deadline is approaching fast.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].clockRaised, true);
    assert.ok(analysis.records[0].clockDelta >= 2, `expected clockDelta >= 2, got ${analysis.records[0].clockDelta}`);
  });

  it('does not fire when no deadline lexicon is present', () => {
    const fountain = [
      'INT. CONTROL ROOM - DAY',
      '',
      'The engineers review the schematics one more time.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].clockRaised, false);
    assert.equal(analysis.records[0].clockDelta, 0);
  });
});

describe('analyzeFountainText — emotionalShift', () => {
  it('fires positive on a scene dense with positive valence words', () => {
    const fountain = [
      'INT. REUNION HALL - DAY',
      '',
      'They laugh and embrace, full of joy and relief. Everyone is happy and grateful.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].emotionalShift, 'positive');
  });

  it('stays neutral on a scene with no valence words', () => {
    const fountain = [
      'INT. OFFICE - DAY',
      '',
      'John types a memo and files it in the cabinet.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].emotionalShift, 'neutral');
  });
});

describe('analyzeFountainText — relationshipShifts', () => {
  it('fires a trust shift for a pair with strong shared valence dialogue', () => {
    const fountain = [
      'INT. KITCHEN - DAY',
      '',
      'MARY',
      "I trust you completely, and I love how kind you've been.",
      '',
      'TOM',
      "I'm so grateful and happy too.",
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    const shifts = analysis.records[0].relationshipShifts ?? [];
    assert.ok(shifts.length > 0, 'expected at least one relationship shift');
    assert.equal(shifts[0].pairKey, ['MARY', 'TOM'].sort().join('|'));
    assert.equal(shifts[0].dimension, 'trust');
    assert.ok(shifts[0].amount > 0);
  });

  it('does not fire for a pair with neutral dialogue', () => {
    const fountain = [
      'INT. KITCHEN - DAY',
      '',
      'MARY',
      'The bus leaves at nine.',
      '',
      'TOM',
      'I have the schedule here.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.deepEqual(analysis.records[0].relationshipShifts, []);
  });
});

describe('analyzeFountainText — seed/payoff clue pairing', () => {
  it('pairs a recurring prop across a >=2-scene gap, and flags a one-off as unresolved', () => {
    const fountain = [
      'INT. ATTIC - DAY',
      '',
      'Emma finds an old LOCKET buried in the trunk. A police BADGE glints nearby too.',
      '',
      'EMMA',
      'What is this?',
      '',
      'INT. KITCHEN - DAY',
      '',
      'Emma makes breakfast, thinking about the day ahead.',
      '',
      'INT. GARDEN - DAY',
      '',
      'Nothing much happens outside today.',
      '',
      'INT. ATTIC - NIGHT',
      '',
      'Emma opens the LOCKET again and finally understands its secret.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.sceneCount, 4);

    // Fire: LOCKET reappears 3 scenes later (gap >= 2) — seeded at 0, paid off at 3.
    assert.ok(analysis.records[0].seededClueIds.includes('locket'));
    assert.ok(analysis.records[3].payoffSetupIds.includes('locket'));
    assert.ok(!analysis.records[0].unresolvedClues.includes('locket'), 'locket should be resolved, not unresolved');

    // No-fire: BADGE is mentioned exactly once anywhere — seeded but never paid off.
    assert.ok(analysis.records[0].seededClueIds.includes('badge'));
    assert.ok(analysis.records[0].unresolvedClues.includes('badge'));
    assert.ok(!analysis.records.some(r => r.payoffSetupIds.includes('badge')), 'badge should never be paid off');
  });
});

describe('analyzeFountainText — character ordering', () => {
  it('orders speaking characters by dialogue-line count, not first appearance', () => {
    const fountain = [
      'INT. ROOM - DAY',
      '',
      'ALICE',
      'Hi.',
      '',
      'BOB',
      'Hello there, how are you today.',
      '',
      'BOB',
      "I've been meaning to ask you something.",
      '',
      'BOB',
      'Actually never mind.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.deepEqual(analysis.characters, ['BOB', 'ALICE']);
  });
});

// Wave 1182 (Program v2, Type 1 signal channel) — question-answer latency.
describe('analyzeFountainText — question-answer latency (questionsRaised)', () => {
  it('counts a substantive dialogue question toward questionsRaised', () => {
    const fountain = [
      'INT. STUDY - DAY',
      '',
      'DETECTIVE',
      'Why did she vanish from the warehouse that night?',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].questionsRaised, 1);
  });

  it('does not count a short phatic interrogative toward questionsRaised, even one that clears the word-count floor', () => {
    const fountain = [
      'INT. STUDY - DAY',
      '',
      'DETECTIVE',
      'Are you okay now?',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].questionsRaised, 0);
  });
});

describe('analyzeFountainText — question-answer latency (cross-scene resolution)', () => {
  it('resolves a question raised in an earlier scene once a later scene shares its distinctive content words', () => {
    const fountain = [
      'INT. STUDY - DAY',
      '',
      'DETECTIVE',
      'Why did she vanish from the warehouse that night?',
      '',
      'INT. HALLWAY - DAY',
      '',
      'Nothing much happens here today.',
      '',
      'INT. WAREHOUSE - NIGHT',
      '',
      'The warehouse holds the answer everyone has been searching for.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.sceneCount, 3);
    assert.equal(analysis.records[0].questionsRaised, 1);
    assert.equal(analysis.records[2].questionsResolved, 1);
    assert.equal(analysis.records[0].questionsUnresolved, 0);
  });

  it('leaves a question unresolved at its origin scene when no later line ever shares its distinctive content words', () => {
    const fountain = [
      'INT. STUDY - DAY',
      '',
      'DETECTIVE',
      'Why did she vanish from the warehouse that night?',
      '',
      'INT. HALLWAY - DAY',
      '',
      'Nothing much happens here today.',
      '',
      'INT. KITCHEN - DAY',
      '',
      'John makes breakfast quietly this morning.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].questionsRaised, 1);
    assert.equal(analysis.records[0].questionsUnresolved, 1);
    assert.ok(analysis.records.every(r => (r.questionsResolved ?? 0) === 0), 'no scene should register a resolution');
  });
});

describe('analyzeFountainText — question-answer latency (same-scene resolution)', () => {
  it('counts a same-scene question/answer pair toward questionsResolvedSameScene', () => {
    const fountain = [
      'INT. STUDY - DAY',
      '',
      'DETECTIVE',
      'Why did she vanish from the warehouse that night?',
      '',
      'WITNESS',
      'She went to the warehouse alone after the argument.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].questionsResolved, 1);
    assert.equal(analysis.records[0].questionsResolvedSameScene, 1);
  });

  it('does not count a cross-scene resolution toward questionsResolvedSameScene', () => {
    const fountain = [
      'INT. STUDY - DAY',
      '',
      'DETECTIVE',
      'Why did she vanish from the warehouse that night?',
      '',
      'INT. HALLWAY - DAY',
      '',
      'Nothing much happens here today.',
      '',
      'INT. WAREHOUSE - NIGHT',
      '',
      'The warehouse holds the answer everyone has been searching for.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[2].questionsResolved, 1);
    assert.equal(analysis.records[2].questionsResolvedSameScene, 0);
  });
});

// Wave 1186 (Program v2, Type 1 signal channel, closes cycle 1) — power-balance
// shifts within scenes.
describe('analyzeFountainText — power-balance shifts (powerHolder / powerBalance)', () => {
  it('a scene of one-sided commands and accusations gives the commanding character powerHolder', () => {
    const fountain = [
      'INT. INTERROGATION ROOM - NIGHT',
      '',
      'DETECTIVE',
      'Sit down. Tell me where you were last night. Answer me now.',
      '',
      'SUSPECT',
      'I was home.',
      '',
      'DETECTIVE',
      "Don't lie to me. Give me the truth right now.",
      '',
      'SUSPECT',
      'Fine.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].powerHolder, 'DETECTIVE');
    assert.ok((analysis.records[0].powerBalance ?? 0) > 0.15, `expected a clearly positive balance, got ${analysis.records[0].powerBalance}`);
    assert.equal(analysis.records[0].powerFlipped, false);
  });

  it('a scene of even, uncommanding, equal-length dialogue gives no holder and a near-zero balance', () => {
    const fountain = [
      'INT. KITCHEN - DAY',
      '',
      'ALICE',
      'The weather today is nice and calm outside.',
      '',
      'BOB',
      'Yes it certainly is quite pleasant this afternoon.',
      '',
      'ALICE',
      'We should go for a walk sometime later.',
      '',
      'BOB',
      'That sounds like a really lovely idea indeed.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].powerHolder, null);
    assert.ok(Math.abs(analysis.records[0].powerBalance ?? 0) <= 0.15, `expected a near-zero balance, got ${analysis.records[0].powerBalance}`);
    assert.equal(analysis.records[0].powerFlipped, false);
  });

  it('a scene where control demonstrably changes hands mid-scene sets powerFlipped', () => {
    const fountain = [
      'INT. OFFICE - DAY',
      '',
      'BOSS',
      'Sit down. Get out your reports and tell me what happened.',
      '',
      'EMPLOYEE',
      'Yes sir.',
      '',
      'BOSS',
      'Explain yourself right now.',
      '',
      'EMPLOYEE',
      'Actually, you never read the memo I sent, did you? You never listen to anyone in this office.',
      '',
      'BOSS',
      'What memo?',
      '',
      'EMPLOYEE',
      'How could you forget something so important? You ruined the whole project because you never checked your email.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].powerFlipped, true);
    assert.equal(analysis.records[0].powerHolder, 'EMPLOYEE');
  });

  it('a scene with fewer than two speaking characters reports no holder, zero balance, no flip', () => {
    const fountain = [
      'INT. EMPTY ROOM - DAY',
      '',
      'A single figure stands alone in the dark, saying nothing.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].powerHolder, null);
    assert.equal(analysis.records[0].powerBalance, 0);
    assert.equal(analysis.records[0].powerFlipped, false);
  });
});
