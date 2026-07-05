// Script Doctor — tests for the pure Fountain-native analyzer.
// Conventions: node:test + assert/strict, matching tests/core/core-01.test.ts
// and tests/passes/*.test.ts.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeFountainText,
  computeBetrayalSignals,
  computePowerDynamicsIntensity,
  computeIronyMarkerCount,
} from '../../server/nvm/analyze/fountain-analyzer.ts';

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

// Run 17-C — content-word recall channel for clue lifecycle. The exact-token
// path above (quoted phrases / CAPS tokens) measured 0/20 payoff fires across
// the calibration corpus: real scripts almost never repeat a clue's exact
// wording. These cases exercise the additive content-word channel
// (computeContentWordClueClusters) that recovers those payoffs via shared
// clue-anchor-noun content words rather than verbatim phrasing.
describe('analyzeFountainText — clue lifecycle content-word matching (fire)', () => {
  it('pairs a clue seeded in different words than its payoff ("a brass key..." / "turned the brass key")', () => {
    const fountain = [
      'INT. ATTIC - DAY',
      '',
      'Someone left a brass key on a red ribbon inside an old trunk.',
      '',
      'INT. KITCHEN - DAY',
      '',
      'Nothing much happens here today.',
      '',
      'INT. GARDEN - DAY',
      '',
      'Still nothing of note happens outside.',
      '',
      'INT. ATTIC - NIGHT',
      '',
      'She turned the brass key at last.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.sceneCount, 4);
    assert.ok(
      analysis.records[0].seededClueIds.some(id => id.startsWith('key')),
      'the brass key should be seeded at scene 0',
    );
    assert.ok(
      analysis.records[3].payoffSetupIds.some(id => id.startsWith('key')),
      'the brass key should be paid off at scene 3, despite no verbatim phrase reuse',
    );
  });

  it('collapses plural/possessive variants of the same anchor noun ("keys" seed / "key\'s" payoff)', () => {
    const fountain = [
      'INT. HALLWAY - DAY',
      '',
      'Someone hides three rusty keys behind the vent.',
      '',
      'INT. LOBBY - DAY',
      '',
      'Nothing happens in this scene either.',
      '',
      'INT. STUDY - DAY',
      '',
      'Nothing of consequence occurs here.',
      '',
      'INT. HALLWAY - NIGHT',
      '',
      "The key's teeth still match the old lock.",
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.ok(
      analysis.records[0].seededClueIds.some(id => id.startsWith('key')),
      'the plural "keys" mention should seed a key clue',
    );
    assert.ok(
      analysis.records[3].payoffSetupIds.some(id => id.startsWith('key')),
      'the possessive "key\'s" mention should pay off the same stemmed clue',
    );
  });

  it('matches on a single shared rare anchor word alone, with no other shared descriptor', () => {
    const fountain = [
      'INT. OFFICE - DAY',
      '',
      'The lawyer studies a battered ledger before the meeting.',
      '',
      'INT. STREET - DAY',
      '',
      'Nothing happens on this ordinary block.',
      '',
      'INT. PARK - DAY',
      '',
      'Nothing happens under these ordinary trees.',
      '',
      'INT. ARCHIVE - NIGHT',
      '',
      'Investigators finally locate the missing ledger.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.ok(
      analysis.records[0].seededClueIds.some(id => id.startsWith('ledger')),
      'the ledger should be seeded at scene 0',
    );
    assert.ok(
      analysis.records[3].payoffSetupIds.some(id => id.startsWith('ledger')),
      'a rare anchor word alone (no other shared descriptor between the two mentions) should still pay off',
    );
  });
});

describe('analyzeFountainText — clue lifecycle content-word matching (no-fire)', () => {
  it('does not pair two unrelated mentions of a common scene-furniture noun ("door")', () => {
    const fountain = [
      'INT. HOUSE ONE - DAY',
      '',
      'A neighbor slams the door after an argument.',
      '',
      'INT. STREET - DAY',
      '',
      'Nothing happens on this quiet afternoon.',
      '',
      'INT. YARD - DAY',
      '',
      'Nothing happens beneath the quiet sky.',
      '',
      'INT. HOUSE TWO - DAY',
      '',
      'A delivery driver knocks and waits by the door.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.ok(
      !analysis.records.some(r => r.payoffSetupIds.some(id => id.startsWith('door'))),
      'two unrelated "door" mentions must not manufacture a false clue payoff',
    );
  });

  it('does not cross-match unrelated mentions of a non-rare anchor with no shared descriptor ("watch")', () => {
    const fountain = [
      'INT. SHOP - DAY',
      '',
      'Dana sells an antique watch to a stranger.',
      '',
      'INT. STREET - DAY',
      '',
      'Nothing happens along this ordinary block.',
      '',
      'INT. OFFICE - DAY',
      '',
      'Priya checks her digital watch before the meeting.',
      '',
      'INT. CAFE - DAY',
      '',
      'Nothing happens over this quiet coffee.',
      '',
      'INT. STATION - DAY',
      '',
      'Malik forgets his silver watch on the counter.',
      '',
      'INT. DOCK - DAY',
      '',
      'Sana loses a broken watch near the water.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.ok(
      !analysis.records.some(r => r.payoffSetupIds.some(id => id.startsWith('watch'))),
      'four differently-described "watch" mentions (anchor common enough in-script to require a shared descriptor) must not pair up on the anchor alone',
    );
  });

  it('keeps two different clues sharing the same anchor noun from cross-matching each other', () => {
    const fountain = [
      'INT. GARAGE - DAY',
      '',
      'Dad grips the rusty attic key tightly.',
      '',
      'INT. STREET - DAY',
      '',
      'He spins the spare toolbox key on his finger.',
      '',
      'INT. PARK - DAY',
      '',
      'Nothing happens beneath these quiet trees.',
      '',
      'INT. HALLWAY - DAY',
      '',
      'Nothing of consequence occurs in this hallway.',
      '',
      'INT. GARAGE - NIGHT',
      '',
      'Dad finally finds the rusty attic key again.',
      '',
      'INT. STUDY - DAY',
      '',
      'Nothing of consequence occurs in this study.',
      '',
      'INT. DRIVEWAY - NIGHT',
      '',
      'He finally returns the spare toolbox key to its hook.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.sceneCount, 7);

    // The attic key: seeded at scene 0, paid off at scene 4.
    const atticSeedId = analysis.records[0].seededClueIds.find(id => id.startsWith('key'));
    assert.ok(atticSeedId, 'the attic key should be seeded at scene 0');
    assert.ok(analysis.records[4].payoffSetupIds.includes(atticSeedId!), 'the attic key should be paid off at scene 4');

    // The spare key: seeded at scene 1, paid off at scene 6 — a DIFFERENT clue
    // that happens to share the same "key" anchor.
    const spareSeedId = analysis.records[1].seededClueIds.find(id => id.startsWith('key'));
    assert.ok(spareSeedId, 'the spare key should be seeded at scene 1');
    assert.ok(analysis.records[6].payoffSetupIds.includes(spareSeedId!), 'the spare key should be paid off at scene 6');

    // Neither clue's payoff scene should ever cross-credit the other clue's id.
    assert.notEqual(atticSeedId, spareSeedId);
    assert.ok(!analysis.records[4].payoffSetupIds.includes(spareSeedId!), 'scene 4 should not pay off the spare key');
    assert.ok(!analysis.records[6].payoffSetupIds.includes(atticSeedId!), 'scene 6 should not pay off the attic key');
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

// Wave 1190 (Program v2, Type 1 signal channel #3, closes cycle 2) —
// speaking-character count per scene (monologue/solo beat vs multi-voice
// exchange). See fountain-analyzer.ts's Wave 1190 header comment for the
// corpus-density prerequisite measurement that led here.
describe('analyzeFountainText — speaking-character count (monologue vs exchange)', () => {
  it('a scene where only one character speaks reports speakingCharacterCount 1', () => {
    const fountain = [
      'INT. STUDY - NIGHT',
      '',
      'Whit stares at the cold fireplace.',
      '',
      'WHIT',
      'Nobody is coming back for this house.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].speakingCharacterCount, 1);
  });

  it('a scene where two characters each speak at least one line reports speakingCharacterCount 2', () => {
    const fountain = [
      'INT. STUDY - NIGHT',
      '',
      'Whit and Reyes face each other across the desk.',
      '',
      'WHIT',
      'You knew about the ledger the whole time.',
      '',
      'REYES',
      'I found out the same day you did.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].speakingCharacterCount, 2);
  });

  it('a scene with no dialogue at all reports speakingCharacterCount 0', () => {
    const fountain = [
      'EXT. DOCKS - DAWN',
      '',
      'Fog rolls over the empty pier. Nothing moves.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].speakingCharacterCount, 0);
  });

  it('a three-character scene reports speakingCharacterCount 3, and a repeated speaker is not double-counted', () => {
    const fountain = [
      'INT. BULLPEN - DAY',
      '',
      'The detectives crowd around the board.',
      '',
      'RAY',
      'Two sets of figures for one cargo load.',
      '',
      'VIC',
      'That much I already knew.',
      '',
      'RAY',
      'But did you know who signed off on it?',
      '',
      'CHIEF',
      'Enough. Both of you, with me.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].speakingCharacterCount, 3);
  });
});

// Wave E1-c — lexicon exhaustiveness pass. Each expanded lexicon gets one
// fire test (a newly-added word registers in the signal it backs) and one
// no-fire guard (a deliberately unadded, plausible-looking word does NOT
// register), proving the expansion is both real and bounded.

describe('analyzeFountainText — expanded POSITIVE_VALENCE_WORDS (tenderness/elation family)', () => {
  it('fires positive emotionalShift on newly-added tenderness/elation words ("elated", "triumphant")', () => {
    const fountain = [
      'INT. ARENA - NIGHT',
      '',
      'The team is elated and triumphant after the long, hard season.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].emotionalShift, 'positive');
  });

  it('does not fire on an ambiguous word deliberately left out of the lexicon ("sharp")', () => {
    const fountain = [
      'INT. KITCHEN - MORNING',
      '',
      'The morning air feels sharp, and the coffee tastes sharp too.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].emotionalShift, 'neutral');
  });
});

describe('analyzeFountainText — expanded NEGATIVE_VALENCE_WORDS (grief/shame family)', () => {
  it('fires negative emotionalShift on newly-added grief/shame words ("devastated", "heartbroken")', () => {
    const fountain = [
      'INT. HOSPITAL HALLWAY - NIGHT',
      '',
      'She is devastated and heartbroken by the news from the doctor.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].emotionalShift, 'negative');
  });

  it('does not fire on an ambiguous word deliberately left out of the lexicon ("blue")', () => {
    const fountain = [
      'INT. STUDIO - DAY',
      '',
      'The paint on the wall is blue, and the sky outside looks blue as well.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].emotionalShift, 'neutral');
  });
});

describe('analyzeFountainText — expanded DANGER_TENSION_WORDS (weapon/pursuit/injury family)', () => {
  it('fires positive suspenseDelta on a newly-added danger word ("ambushed")', () => {
    const fountain = [
      'INT. RAVINE - NIGHT',
      '',
      'Soldiers ambushed the convoy in the ravine.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.ok(analysis.records[0].suspenseDelta > 0, `expected positive suspenseDelta, got ${analysis.records[0].suspenseDelta}`);
  });

  it('does not fire on an ambiguous word deliberately left out of the lexicon ("sharp")', () => {
    const fountain = [
      'INT. WORKSHOP - DAY',
      '',
      'The old pencil looks sharp on the wooden desk.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].suspenseDelta, 0);
  });
});

describe('analyzeFountainText — expanded RELIEF_WORDS (safety/de-escalation family)', () => {
  it('lets suspenseDelta swing negative on newly-added relief words ("soothed", "reassured")', () => {
    const fountain = [
      'INT. NURSERY - NIGHT',
      '',
      'She finally soothed the frightened child and reassured him gently.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.ok(analysis.records[0].suspenseDelta < 0, `expected negative suspenseDelta, got ${analysis.records[0].suspenseDelta}`);
  });

  it('does not fire on an ambiguous word deliberately left out of the lexicon ("fine")', () => {
    const fountain = [
      'INT. LIVING ROOM - DAY',
      '',
      'Everything feels fine and normal around the house today.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].suspenseDelta, 0);
  });
});

describe('analyzeFountainText — expanded MYSTERY_WORDS (investigation/anomaly family)', () => {
  it('fires positive curiosityDelta on newly-added investigation/anomaly words', () => {
    const fountain = [
      'INT. PRECINCT - NIGHT',
      '',
      'The investigation revealed a puzzling anomaly nobody could explain.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.ok(analysis.records[0].curiosityDelta > 0, `expected positive curiosityDelta, got ${analysis.records[0].curiosityDelta}`);
  });

  it('does not fire on an ambiguous word deliberately left out of the lexicon ("odd")', () => {
    const fountain = [
      'INT. PORCH - DUSK',
      '',
      'Something felt odd about the odd afternoon light today.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].curiosityDelta, 0);
  });
});

describe('analyzeFountainText — expanded TURN_VERB_WORDS (expose/switch-sides/vow family)', () => {
  it('fires dramaticTurn on a newly-added turn verb ("surrendered")', () => {
    const fountain = [
      'INT. BUNKER - DAWN',
      '',
      'The general finally surrendered to the rebel forces.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.notEqual(analysis.records[0].dramaticTurn, '');
  });

  it('does not fire on an ambiguous word deliberately left out of the lexicon ("changed")', () => {
    const fountain = [
      'INT. BUNKER - DAWN',
      '',
      'The weather changed dramatically overnight.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].dramaticTurn, '');
  });
});

describe('analyzeFountainText — expanded DEADLINE_TERMS (temporal-pressure idiom family)', () => {
  it('fires clockRaised on a newly-added deadline idiom ("against the clock")', () => {
    const fountain = [
      'INT. CONTROL ROOM - NIGHT',
      '',
      'The team races against the clock to disarm the device.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].clockRaised, true);
    assert.ok(analysis.records[0].clockDelta >= 1, `expected clockDelta >= 1, got ${analysis.records[0].clockDelta}`);
  });

  it('does not fire on a phrase deliberately left out of the lexicon ("later this week")', () => {
    const fountain = [
      'INT. OFFICE - DAY',
      '',
      'They plan to meet again sometime later this week.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].clockRaised, false);
    assert.equal(analysis.records[0].clockDelta, 0);
  });
});

describe('analyzeFountainText — expanded CONCRETE_NOUNS (furniture + evidence-class families)', () => {
  it('selects an action line containing a newly-added furniture noun ("sofa") as a visual beat', () => {
    const fountain = [
      'INT. APARTMENT - NIGHT',
      '',
      'She collapses onto the old sofa.',
      '',
      'She sits quietly instead.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.ok(
      analysis.records[0].visualBeats.some(line => /sofa/.test(line)),
      `expected a visual beat mentioning "sofa", got ${JSON.stringify(analysis.records[0].visualBeats)}`,
    );
  });

  it('does not select an action line with no concrete noun, even one using an ambiguous word ("sharp")', () => {
    const fountain = [
      'INT. APARTMENT - NIGHT',
      '',
      'The room feels sharp and cold this morning.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.deepEqual(analysis.records[0].visualBeats, []);
  });
});

describe('analyzeFountainText — expanded ACCUSATORY_TERMS (deliberate-harm/direct-blame family)', () => {
  it('gives the speaker of newly-added accusatory phrases powerHolder, at matched dialogue length', () => {
    const fountain = [
      'INT. LOFT - NIGHT',
      '',
      'A',
      'You set me up and you manipulated me completely.',
      '',
      'B',
      'That is simply not accurate at all today.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].powerHolder, 'A');
    assert.ok((analysis.records[0].powerBalance ?? 0) > 0.15, `expected clearly positive balance, got ${analysis.records[0].powerBalance}`);
  });

  it('does not fire on a comparable negative-but-non-accusatory line of matched length', () => {
    const fountain = [
      'INT. LOFT - NIGHT',
      '',
      'A',
      'That situation really was not fair to anyone.',
      '',
      'B',
      'That is simply not accurate at all today.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].powerHolder, null);
  });
});

describe('analyzeFountainText — expanded IMPERATIVE_LEAD_TERMS (standoff/compliance command family)', () => {
  it('gives the speaker of a newly-added standoff command ("Freeze") powerHolder, at matched dialogue length', () => {
    const fountain = [
      'INT. ALLEY - NIGHT',
      '',
      'COP',
      'Freeze. Kneel down. Drop your weapon now.',
      '',
      'SUSPECT',
      'Okay, that seems fine to me.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].powerHolder, 'COP');
    assert.ok((analysis.records[0].powerBalance ?? 0) > 0.15, `expected clearly positive balance, got ${analysis.records[0].powerBalance}`);
  });

  it('does not fire on a comparable non-command line of matched length starting with an ambiguous word ("Sharp")', () => {
    const fountain = [
      'INT. ALLEY - NIGHT',
      '',
      'COP',
      'Sharp words rarely fix a real problem here.',
      '',
      'SUSPECT',
      'Okay, that seems fine to me.',
    ].join('\n');

    const analysis = analyzeFountainText(fountain);
    assert.equal(analysis.records[0].powerHolder, null);
  });
});

// Wave E1-c — three candidate standalone signal functions (not wired onto
// ScreenplaySceneRecord; see the "Standalone lexicon-backed signals" section
// of fountain-analyzer.ts for why). Each gets fire / no-fire / empty-input
// coverage, matching this file's per-signal convention.
describe('computeBetrayalSignals', () => {
  it('fires a positive delta on betrayal-dominant scene text', () => {
    const result = computeBetrayalSignals([
      'He was a traitor who betrayed everyone who ever trusted him.',
      'Nothing of note happens in this scene.',
    ]);
    assert.equal(result[0], 2);
    assert.equal(result[1], 0);
  });

  it('fires a negative delta on loyalty-dominant scene text (the other half of the same axis)', () => {
    const result = computeBetrayalSignals(['She remained faithful and loyal to her allies.']);
    assert.equal(result[0], -3);
  });

  it('does not fire on neutral scene text with neither betrayal nor loyalty vocabulary', () => {
    const result = computeBetrayalSignals(['The weather today is calm and unremarkable.']);
    assert.equal(result[0], 0);
  });

  it('returns an empty array for empty input', () => {
    assert.deepEqual(computeBetrayalSignals([]), []);
  });
});

describe('computePowerDynamicsIntensity', () => {
  it('fires a positive count on dominance/submission verb-dense scene text', () => {
    const result = computePowerDynamicsIntensity([
      'The soldiers overpowered the rebels and forced them to submit.',
    ]);
    assert.equal(result[0], 2);
  });

  it('does not fire on scene text with no dominance/submission vocabulary', () => {
    const result = computePowerDynamicsIntensity(['They walked through the quiet garden together.']);
    assert.equal(result[0], 0);
  });

  it('returns an empty array for empty input', () => {
    assert.deepEqual(computePowerDynamicsIntensity([]), []);
  });
});

describe('computeIronyMarkerCount', () => {
  it('fires a positive count on scene text dense with verbal-irony markers', () => {
    const result = computeIronyMarkerCount([
      'Of course the one day I forget my umbrella, it rains. Naturally.',
    ]);
    assert.equal(result[0], 2);
  });

  it('does not fire on plain, sincere scene text with no irony markers', () => {
    const result = computeIronyMarkerCount(['The weather today is calm and clear.']);
    assert.equal(result[0], 0);
  });

  it('returns an empty array for empty input', () => {
    assert.deepEqual(computeIronyMarkerCount([]), []);
  });
});
