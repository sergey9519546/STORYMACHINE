// Character interiority analysis tests - deterministic scoring of WANT/FEAR/WOUND cues.
// Conventions: node:test + assert/strict, matching tests/core/ patterns.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeInteriority } from '../../server/nvm/analyze/interiority.ts';

describe('analyzeInteriority - character interiority scoring', () => {
  it('extracts named characters from dialogue cues and returns non-empty perCharacter', () => {
    const fountain = `INT. ROOM - DAY

ALICE
Hello there.

BOB
Hey Alice.

ALICE
How are you?
`;
    const report = analyzeInteriority(fountain);
    assert.ok(report.scored);
    assert.ok(report.perCharacter.length > 0);
    const chars = report.perCharacter.map(c => c.character).sort();
    assert.deepEqual(chars, ['ALICE', 'BOB']);
  });

  it('character with stated want scores higher interiority than blank character', () => {
    const fountain = `INT. ROOM - DAY

ALICE
I want to win.

ALICE
I must succeed.

BOB
Hello there.

BOB
How are you today?

BOB
Nice weather.
`;
    const report = analyzeInteriority(fountain);
    const alice = report.perCharacter.find(c => c.character === 'ALICE');
    const bob = report.perCharacter.find(c => c.character === 'BOB');
    assert.ok(alice);
    assert.ok(bob);
    assert.ok(alice.interiorityScore > bob.interiorityScore);
    assert.ok(alice.wantCues > 0);
    assert.equal(bob.wantCues, 0);
  });

  it('counts dialogue blocks per character', () => {
    const fountain = `INT. ROOM - DAY

ALICE
First line.

BOB
Bob speaks.

ALICE
Second block.

ALICE
Third block.
`;
    const report = analyzeInteriority(fountain);
    const alice = report.perCharacter.find(c => c.character === 'ALICE');
    assert.ok(alice);
    assert.equal(alice.dialogueBlocks, 3);
  });

  it('counts want cues in character dialogue', () => {
    const fountain = `INT. ROOM - DAY

ALICE
I want to go home. I must succeed.

ALICE
I need to find the truth.
`;
    const report = analyzeInteriority(fountain);
    const alice = report.perCharacter.find(c => c.character === 'ALICE');
    assert.ok(alice);
    assert.ok(alice.wantCues >= 3);
  });

  it('counts fear cues in character dialogue', () => {
    const fountain = `INT. ROOM - DAY

ALICE
I am afraid of the dark.

ALICE
I am terrified!
`;
    const report = analyzeInteriority(fountain);
    const alice = report.perCharacter.find(c => c.character === 'ALICE');
    assert.ok(alice);
    assert.ok(alice.fearCues >= 2);
  });

  it('counts wound cues in character dialogue', () => {
    const fountain = `INT. ROOM - DAY

ALICE
I used to be happy. Years ago.

ALICE
After what happened, I changed.
`;
    const report = analyzeInteriority(fountain);
    const alice = report.perCharacter.find(c => c.character === 'ALICE');
    assert.ok(alice);
    assert.ok(alice.woundCues >= 3);
  });

  it('charactersOpaque counts characters with >=3 blocks and zero cues', () => {
    const fountain = `INT. ROOM - DAY

ALICE
I want to leave.

ALICE
I must go.

ALICE
Goodbye.

BOB
Hello.

BOB
How are you?

BOB
Nice day.

CHARLIE
Hi there.

CHARLIE
Yes.

CHARLIE
OK.
`;
    const report = analyzeInteriority(fountain);
    assert.equal(report.charactersOpaque, 2);
  });

  it('charactersOpaque is capped at 8 even with many opaque characters', () => {
    let fountain = 'INT. ROOM - DAY\n\n';
    for (let i = 0; i < 50; i++) {
      const char = `CHAR${i}`;
      fountain += `${char}\nLine one.\n\n${char}\nLine two.\n\n${char}\nLine three.\n\n`;
    }
    const report = analyzeInteriority(fountain);
    assert.equal(report.charactersOpaque, 8);
  });

  it('minor characters (less than 3 dialogue blocks) do not count as opaque', () => {
    const fountain = `INT. ROOM - DAY

ALICE
Just one line.

ALICE
Two lines total.

BOB
One line only.

BOB
Two lines.

BOB
Three lines.

BOB
Four lines.
`;
    const report = analyzeInteriority(fountain);
    assert.equal(report.charactersOpaque, 1);
  });

  it('charactersWithWant counts characters with any want cue', () => {
    const fountain = `INT. ROOM - DAY

ALICE
I want to win.

BOB
I need to leave.

CHARLIE
Hello there.
`;
    const report = analyzeInteriority(fountain);
    assert.equal(report.charactersWithWant, 2);
  });

  it('wantNeedOppositionPresent is true when >=2 characters have want cues', () => {
    const fountain = `INT. ROOM - DAY

ALICE
I want to go.

BOB
I need to stay.
`;
    const report = analyzeInteriority(fountain);
    assert.ok(report.wantNeedOppositionPresent);
  });

  it('wantNeedOppositionPresent is false when only <=1 character has want cues', () => {
    const fountain = `INT. ROOM - DAY

ALICE
I want to go.

BOB
Hello there.

CHARLIE
Nice day.
`;
    const report = analyzeInteriority(fountain);
    assert.equal(report.charactersWithWant, 1);
    assert.equal(report.wantNeedOppositionPresent, false);
  });

  it('returns scored=true when characters are found', () => {
    const fountain = `INT. ROOM - DAY

ALICE
Hello.
`;
    const report = analyzeInteriority(fountain);
    assert.equal(report.scored, true);
  });

  it('returns scored=false when no characters are found', () => {
    const fountain = 'INT. ROOM - DAY\n\nSome action text.';
    const report = analyzeInteriority(fountain);
    assert.equal(report.scored, false);
  });

  it('interiority score is 0..1 and higher for characters with more cues', () => {
    const fountain = `INT. ROOM - DAY

ALICE
I want to win. I must succeed. I am afraid. Years ago I used to be happy.

BOB
Hello.
`;
    const report = analyzeInteriority(fountain);
    const alice = report.perCharacter.find(c => c.character === 'ALICE');
    const bob = report.perCharacter.find(c => c.character === 'BOB');
    assert.ok(alice);
    assert.ok(bob);
    assert.ok(alice.interiorityScore >= 0 && alice.interiorityScore <= 1);
    assert.ok(bob.interiorityScore >= 0 && bob.interiorityScore <= 1);
    assert.ok(alice.interiorityScore > bob.interiorityScore);
  });

  it('handles multi-line dialogue blocks correctly', () => {
    const fountain = `INT. ROOM - DAY

ALICE
I want to leave.
I need to find the truth.
I am afraid of what's out there.

ALICE
But I must go anyway.
`;
    const report = analyzeInteriority(fountain);
    const alice = report.perCharacter.find(c => c.character === 'ALICE');
    assert.ok(alice);
    assert.ok(alice.wantCues >= 2);
    assert.ok(alice.fearCues >= 1);
  });

  it('ignores sluglines and transitions as dialogue cues', () => {
    const fountain = `INT. ROOM - DAY

ALICE
Hello.

FADE TO:

EXT. STREET - NIGHT

BOB
How are you?
`;
    const report = analyzeInteriority(fountain);
    const chars = report.perCharacter.map(c => c.character).sort();
    assert.deepEqual(chars, ['ALICE', 'BOB']);
  });

  it('is deterministic across multiple runs', () => {
    const fountain = `INT. ROOM - DAY

ALICE
I want to win.

BOB
I am afraid.
`;
    const report1 = analyzeInteriority(fountain);
    const report2 = analyzeInteriority(fountain);
    assert.deepEqual(report1, report2);
  });

  it('handles ALL-CAPS character names with spaces and apostrophes', () => {
    const fountain = `INT. ROOM - DAY

JAMES O'BRIEN
Hello there.

MARY SMITH
Hi.
`;
    const report = analyzeInteriority(fountain);
    const chars = report.perCharacter.map(c => c.character).sort();
    assert.ok(chars.length >= 1);
  });

  it('complex scene with mixed characters and cues', () => {
    const fountain = `INT. COFFEE SHOP - MORNING

ALEX
I want to propose to her.

ALEX
But I am terrified. After what happened with Jessica.

JORDAN
You look nervous.

JORDAN
What's wrong?

JORDAN
Come on, tell me.

CASEY
Oh hey!

CASEY
Haven't seen you in years.
Years ago we were best friends.

CASEY
I used to call you all the time.
`;
    const report = analyzeInteriority(fountain);
    assert.ok(report.scored);
    const alex = report.perCharacter.find(c => c.character === 'ALEX');
    const jordan = report.perCharacter.find(c => c.character === 'JORDAN');
    const casey = report.perCharacter.find(c => c.character === 'CASEY');

    assert.ok(alex);
    assert.ok(jordan);
    assert.ok(casey);

    assert.ok(alex.wantCues >= 1);
    assert.ok(alex.fearCues >= 1);
    assert.ok(alex.woundCues >= 1);

    assert.equal(jordan.wantCues, 0);
    assert.equal(jordan.fearCues, 0);
    assert.equal(jordan.woundCues, 0);
    assert.equal(jordan.dialogueBlocks, 3);

    assert.ok(casey.woundCues >= 2);

    assert.equal(report.charactersWithWant, 1);

    assert.equal(report.charactersOpaque, 1);
  });
});
