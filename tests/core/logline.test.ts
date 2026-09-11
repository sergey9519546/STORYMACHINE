// Pitch-content builder tests (server/lib/logline.ts). Conventions: node:test
// + assert/strict, matching tests/core/coverage-html.test.ts and
// tests/core/breakdown.test.ts.
//
// Two halves, matching the module's two responsibilities:
//   1. extractTitlePage — the "Untitled" bug fix: a small deterministic
//      Fountain title-page parser (Title:/Author:/Credit:), fire + no-fire.
//   2. Pitch content builders (findIncitingIncident/findApparentGoal/
//      findCentralObstacle/buildLogline/buildSynopsis/buildGenreLine/
//      buildCompsSlot/buildPitchContent) — full-signal assembly plus every
//      documented degradation path (missing protagonist/goal/obstacle/
//      records), fire + no-fire for each.
//
// Record/report fixtures are hand-built (matching coverage-html.test.ts's
// own convention of a hand-built ScriptDoctorReport) rather than run
// through the real analyzer — this keeps each test isolated to exactly the
// signal it's checking, instead of depending on fountain-analyzer.ts's
// lexicon thresholds to indirectly produce the right record shape.
// findApparentGoal is the one exception: it reads raw Fountain dialogue
// directly (by design — no record shape carries per-line speaker
// attribution), so its tests use small hand-written Fountain snippets.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';
import { analyzeFountainText } from '../../server/nvm/analyze/fountain-analyzer.ts';
import {
  extractTitlePage, findIncitingIncident, findApparentGoal, findCentralObstacle,
  buildLogline, buildSynopsis, buildGenreLine, buildCompsSlot, buildPitchContent,
  COMPS_PLACEHOLDER, PROTAGONIST_MIN_DIALOGUE_SHARE, dialogueShares,
  hasProtagonistDialogueShare,
} from '../../server/lib/logline.ts';
import type { ScriptDoctorReport, DoctorGrade, CoverageVerdict } from '../../server/nvm/analyze/types.ts';
import type { ScreenplaySceneRecord } from '../../server/nvm/screenplay/memory.ts';
import type { StructureState } from '../../server/nvm/screenplay/structure.ts';
import type { SceneCharacterTally } from '../../server/lib/breakdown.ts';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// ── Fixtures ──────────────────────────────────────────────────────────────────

function baseStructure(): StructureState {
  return {
    actPosition: 'act2b',
    completionPercent: 50,
    avgSuspensePerScene: 1,
    escalating: true,
    reversalCount: 0,
    reversalDensity: 0,
    approachingClimax: false,
    openClues: 0,
    revelationCount: 0,
    midpointPressure: 0,
    tightestScene: 0,
  };
}

function makeReport(overrides: Partial<ScriptDoctorReport> = {}): ScriptDoctorReport {
  return {
    health: 70,
    grade: 'solid' as DoctorGrade,
    totalIssues: 0,
    bySeverity: { critical: 0, major: 0, minor: 0 },
    passes: [],
    sceneHeatmap: [],
    topPriorities: [],
    structure: baseStructure(),
    characters: ['ROSA', 'DEV'],
    sceneCount: 3,
    wordCount: 300,
    analyzedAt: Date.UTC(2026, 0, 1),
    verdict: 'CONSIDER' as CoverageVerdict,
    ...overrides,
  };
}

function makeRecord(overrides: Partial<ScreenplaySceneRecord> = {}): ScreenplaySceneRecord {
  return {
    commitId: 'fountain-scene-0',
    sceneIdx: 0,
    slug: 'INT. ROOM - DAY',
    purpose: 'complicate',
    dramaticTurn: '',
    revelation: null,
    emotionalShift: 'neutral',
    visualBeats: [],
    dialogueHighlights: [],
    unresolvedClues: [],
    seededClueIds: [],
    payoffSetupIds: [],
    clockRaised: false,
    clockDelta: 0,
    suspenseDelta: 0,
    curiosityDelta: 0,
    relationshipShifts: [],
    createdAt: 0,
    ...overrides,
  };
}

// ── extractTitlePage ──────────────────────────────────────────────────────────

describe('extractTitlePage — Fountain title-page parsing', () => {
  it('parses Title/Credit/Author from a standard title page', () => {
    const fountain = [
      'Title: BRICK & STEEL',
      'Credit: Written by',
      'Author: Stu Maschwitz',
      '',
      'FADE IN:',
      '',
      'INT. GARAGE - DAY',
    ].join('\n');

    const result = extractTitlePage(fountain);
    assert.equal(result.title, 'BRICK & STEEL');
    assert.equal(result.credit, 'Written by');
    assert.equal(result.author, 'Stu Maschwitz');
  });

  it('strips Fountain emphasis markup from the title', () => {
    const fountain = 'Title: _**BRICK & STEEL**_\nAuthor: Stu Maschwitz\n\nFADE IN:';
    const result = extractTitlePage(fountain);
    assert.equal(result.title, 'BRICK & STEEL');
  });

  it('joins a multi-line indented continuation value with a space', () => {
    const fountain = [
      'Title: The Long',
      '    Way Home',
      'Author: J. Smith',
      '',
      'INT. HOUSE - DAY',
    ].join('\n');
    const result = extractTitlePage(fountain);
    assert.equal(result.title, 'The Long Way Home');
  });

  it('accepts "Authors" (plural) as the author key', () => {
    const fountain = 'Title: Ensemble\nAuthors: A. One and B. Two\n\nFADE IN:';
    const result = extractTitlePage(fountain);
    assert.equal(result.author, 'A. One and B. Two');
  });

  it('returns all nulls when the script opens directly on a scene heading (no title page)', () => {
    const fountain = 'INT. GARAGE - DAY\n\nA mechanic works under a car.';
    const result = extractTitlePage(fountain);
    assert.deepEqual(result, { title: null, author: null, credit: null });
  });

  it('returns all nulls when the script opens directly on "FADE IN:" (no title page)', () => {
    const fountain = 'FADE IN:\n\nINT. GARAGE - DAY';
    const result = extractTitlePage(fountain);
    assert.deepEqual(result, { title: null, author: null, credit: null });
  });

  it('returns all nulls for empty input', () => {
    assert.deepEqual(extractTitlePage(''), { title: null, author: null, credit: null });
  });
});

// ── findIncitingIncident ──────────────────────────────────────────────────────

describe('findIncitingIncident', () => {
  it('fires: uses the introduce_conflict scene\'s dramaticTurn', () => {
    const records = [
      makeRecord({ sceneIdx: 0, purpose: 'introduce_conflict', dramaticTurn: 'Rosa discovers the body in the trunk.' }),
      makeRecord({ sceneIdx: 1 }),
    ];
    assert.equal(findIncitingIncident(records), 'Rosa discovers the body in the trunk.');
  });

  it('falls back to scene 0\'s revelation when dramaticTurn is empty', () => {
    const records = [
      makeRecord({ sceneIdx: 0, purpose: 'establish_world', dramaticTurn: '', revelation: 'The truth is nobody survived the crash.' }),
    ];
    assert.equal(findIncitingIncident(records), 'The truth is nobody survived the crash.');
  });

  it('no-fire: empty records array returns null', () => {
    assert.equal(findIncitingIncident([]), null);
  });

  it('no-fire: scene 0 has neither dramaticTurn nor revelation', () => {
    const records = [makeRecord({ sceneIdx: 0, purpose: 'establish_world', dramaticTurn: '', revelation: null })];
    assert.equal(findIncitingIncident(records), null);
  });
});

// ── findApparentGoal ──────────────────────────────────────────────────────────

describe('findApparentGoal', () => {
  it('fires: finds the protagonist\'s first want-lexicon dialogue line', () => {
    const fountain = [
      'INT. APARTMENT - NIGHT',
      '',
      'ROSA',
      'I need to get out of this town before they find me.',
      '',
      'DEV',
      'It is not that simple.',
    ].join('\n');
    assert.equal(findApparentGoal(fountain, 'ROSA'), 'I need to get out of this town before they find me.');
  });

  it('no-fire: only a NON-protagonist speaks a want line', () => {
    const fountain = [
      'INT. APARTMENT - NIGHT',
      '',
      'DEV',
      'I want to leave tonight.',
      '',
      'ROSA',
      'We should wait.',
    ].join('\n');
    assert.equal(findApparentGoal(fountain, 'ROSA'), null);
  });

  it('no-fire: protagonist speaks but never in the want-lexicon shape', () => {
    const fountain = [
      'INT. APARTMENT - NIGHT',
      '',
      'ROSA',
      'It is raining again.',
    ].join('\n');
    assert.equal(findApparentGoal(fountain, 'ROSA'), null);
  });

  it('no-fire: empty fountain or empty protagonist name', () => {
    assert.equal(findApparentGoal('', 'ROSA'), null);
    assert.equal(findApparentGoal('INT. ROOM - DAY\n\nROSA\nI need to go.', ''), null);
  });
});

// ── findCentralObstacle ────────────────────────────────────────────────────────

// ── findCentralObstacle ──────────────────────────────────────────────────────
//
// Tier (c) (the climax/peak-suspense text) is QUOTE-GATED since 2026-09-11: it
// may only quote a line that is locatable in a DIALOGUE block inside that
// scene's own span, because a quotation mark claims somebody said the words.
// Every tier-(c) case therefore supplies the Fountain evidence, and the cases
// below it prove the gate refuses action lines, refuses a line spoken in a
// DIFFERENT scene, and falls through from the turn to the revelation.
//
// `findCentralObstacle`'s third argument defaults to '' so the gate fails
// CLOSED for any caller that has not been given the script text.

/** Two scenes; `spoken` lands in scene 1's dialogue, `acted` in scene 1's
 *  action. Scene 0 is inert filler so scene indices are real. */
function twoSceneScript(opts: { spoken?: string; acted?: string } = {}): string {
  return [
    'INT. LOBBY - DAY',
    '',
    'Nothing happens here.',
    '',
    'INT. STAIRWELL - NIGHT',
    '',
    ...(opts.acted ? [opts.acted, ''] : []),
    ...(opts.spoken ? ['DEV', opts.spoken, ''] : []),
  ].join('\n');
}

describe('findCentralObstacle', () => {
  it('tier (a) fires: the protagonist\'s worst (most negative) relationship shift', () => {
    const records = [
      makeRecord({ sceneIdx: 0, relationshipShifts: [{ pairKey: 'DEV|ROSA', dimension: 'trust', amount: -3 }] }),
      makeRecord({ sceneIdx: 1, relationshipShifts: [{ pairKey: 'DEV|ROSA', dimension: 'trust', amount: -1 }] }),
    ];
    assert.equal(findCentralObstacle(records, 'ROSA'), 'a fracturing bond with DEV');
  });

  it('tier (a) ignores relationship shifts that don\'t involve the protagonist', () => {
    const records = [
      makeRecord({ sceneIdx: 0, relationshipShifts: [{ pairKey: 'DEV|MARIA', dimension: 'trust', amount: -5 }] }),
      makeRecord({ sceneIdx: 1, purpose: 'climax', dramaticTurn: 'The building collapses around them.' }),
    ];
    const script = twoSceneScript({ spoken: 'The building collapses around them.' });
    assert.equal(
      findCentralObstacle(records, 'ROSA', script),
      'the turn \u201cThe building collapses around them\u201d',
    );
  });

  it('tier (b) fires: highest-betrayal scene with a distinct power-holder, when tier (a) is absent', () => {
    const records = [
      makeRecord({ sceneIdx: 0, betrayalSignal: 2, powerHolder: 'DEV' }),
      makeRecord({ sceneIdx: 1, betrayalSignal: 1, powerHolder: 'ROSA' }),
    ];
    assert.equal(findCentralObstacle(records, 'ROSA'), 'opposition from DEV');
  });

  it('tier (b) ignores a betrayal scene whose power-holder IS the protagonist', () => {
    const records = [
      makeRecord({ sceneIdx: 0, betrayalSignal: 2, powerHolder: 'ROSA' }),
      makeRecord({ sceneIdx: 1, purpose: 'climax', dramaticTurn: 'Rosa faces the collapse alone.' }),
    ];
    const script = twoSceneScript({ spoken: 'Rosa faces the collapse alone.' });
    assert.equal(
      findCentralObstacle(records, 'ROSA', script),
      'the turn \u201cRosa faces the collapse alone\u201d',
    );
  });

  it('tier (c) fires: the climax scene\'s dramaticTurn when tiers (a)/(b) are absent', () => {
    const records = [
      makeRecord({ sceneIdx: 0 }),
      makeRecord({ sceneIdx: 1, purpose: 'climax', dramaticTurn: 'She confronts the man who killed her sister.' }),
    ];
    const script = twoSceneScript({ spoken: 'She confronts the man who killed her sister.' });
    assert.equal(
      findCentralObstacle(records, 'ROSA', script),
      'the turn \u201cShe confronts the man who killed her sister\u201d',
    );
  });

  it('tier (c) falls back to the single highest-suspense scene when no scene is tagged climax', () => {
    const records = [
      makeRecord({ sceneIdx: 0, suspenseDelta: 1, dramaticTurn: 'A car passes by.' }),
      makeRecord({ sceneIdx: 1, suspenseDelta: 5, dramaticTurn: 'Gunfire erupts in the alley.' }),
    ];
    const script = twoSceneScript({ spoken: 'Gunfire erupts in the alley.' });
    assert.equal(
      findCentralObstacle(records, 'ROSA', script),
      'the turn \u201cGunfire erupts in the alley\u201d',
    );
  });

  it('no-fire: no signal in any tier returns null', () => {
    const records = [makeRecord({ sceneIdx: 0, suspenseDelta: 0 })];
    assert.equal(findCentralObstacle(records, 'ROSA'), null);
  });

  // ── THE QUOTE GATE (2026-09-11, producer-tier discovery defect #7b) ────────
  //
  // REPRODUCTION: data/screenplays/runoff.fountain rendered
  //   GUS must face the turn "The inspector nods, packs the binder, and leaves"
  // That line is ACTION, at runoff.fountain:146. Nobody says it. It is a
  // description of a third party leaving a room, quoted to a producer as the
  // thing the protagonist faces.
  it('no-fire: an ACTION line in the climax scene is never quoted as "the turn"', () => {
    const records = [
      makeRecord({ sceneIdx: 0 }),
      makeRecord({
        sceneIdx: 1, purpose: 'climax',
        dramaticTurn: 'The inspector nods, packs the binder, and leaves.',
      }),
    ];
    const script = twoSceneScript({ acted: 'The inspector nods, packs the binder, and leaves.' });
    assert.equal(findCentralObstacle(records, 'ROSA', script), null);
  });

  it('fire: an action-line turn FALLS THROUGH to a spoken revelation rather than losing the signal', () => {
    const records = [
      makeRecord({ sceneIdx: 0 }),
      makeRecord({
        sceneIdx: 1, purpose: 'climax',
        dramaticTurn: 'The inspector nods, packs the binder, and leaves.',
        revelation: 'You signed the waiver yourself.',
      }),
    ];
    const script = twoSceneScript({
      acted: 'The inspector nods, packs the binder, and leaves.',
      spoken: 'You signed the waiver yourself.',
    });
    assert.equal(
      findCentralObstacle(records, 'ROSA', script),
      'the revelation \u201cYou signed the waiver yourself\u201d',
    );
  });

  it('no-fire: when NEITHER the turn nor the revelation is spoken, no clause is quoted', () => {
    const records = [
      makeRecord({
        sceneIdx: 1, purpose: 'climax',
        dramaticTurn: 'He closes the file.',
        revelation: 'The vault door swings shut.',
      }),
    ];
    const script = twoSceneScript({ acted: 'He closes the file. The vault door swings shut.' });
    assert.equal(findCentralObstacle(records, 'ROSA', script), null);
  });

  it('no-fire: the line is spoken in a DIFFERENT scene, so it is not this scene\'s evidence', () => {
    const records = [
      makeRecord({ sceneIdx: 1, purpose: 'climax', dramaticTurn: 'Gunfire erupts in the alley.' }),
    ];
    // Spoken in scene 0, while the climax record points at scene 1.
    const script = [
      'INT. LOBBY - DAY',
      '',
      'DEV',
      'Gunfire erupts in the alley.',
      '',
      'INT. STAIRWELL - NIGHT',
      '',
      'Silence.',
    ].join('\n');
    assert.equal(findCentralObstacle(records, 'ROSA', script), null);
  });

  it('no-fire: the gate fails CLOSED when no script text is supplied at all', () => {
    const records = [
      makeRecord({ sceneIdx: 0, purpose: 'climax', dramaticTurn: 'She confronts him.' }),
    ];
    assert.equal(findCentralObstacle(records, 'ROSA'), null);
  });

  // ── Regression: the "must face <raw dialogue>" defect ──────────────────────
  // The sample coverage report's logline read:
  //   JUNE must face Turns out Holloway signed my transfer papers six years
  //   ago. We've never really stopped working together.
  // Tier (c) returned the climax scene's text verbatim, so a whole line of
  // VANCE's dialogue landed in the protagonist's obstacle slot: ungrammatical,
  // two sentences deep, and misattributed. It was the first line of the report.
  it('tier (c) never emits raw multi-sentence text into the obstacle slot', () => {
    const speech = "Turns out Holloway signed my transfer papers six years ago. We've never really stopped working together.";
    const records = [makeRecord({ sceneIdx: 0, purpose: 'climax', dramaticTurn: speech })];
    const script = ['INT. OFFICE - NIGHT', '', 'VANCE', speech, ''].join('\n');
    const obstacle = findCentralObstacle(records, 'JUNE', script);
    assert.ok(obstacle, 'tier (c) should still produce an obstacle');
    // One sentence only — the trailing speech is dropped.
    assert.ok(!obstacle!.includes("We've never really stopped"),
      `obstacle carried a second sentence: ${obstacle}`);
    // Quoted and labeled, so it reads grammatically after "must face".
    assert.match(obstacle!, /^(the turn|the revelation) \u201c.+\u201d$/,
      `obstacle must be a labeled, quoted noun phrase, got: ${obstacle}`);
    // The assembled sentence must be grammatical: no bare capitalized sentence
    // immediately after "must face".
    assert.doesNotMatch(`JUNE must face ${obstacle}.`, /must face [A-Z][a-z]+ [a-z]/,
      'a raw sentence was spliced after "must face"');
  });

  it('tier (c) obstacles slot grammatically into both assembleLogline branches', () => {
    // Both templates consume the same obstacle string: "must face X" and
    // "... before X". Whatever tier (c) returns has to read correctly in both.
    const records = [
      makeRecord({ sceneIdx: 0, purpose: 'climax', revelation: 'The vault was empty all along.' }),
    ];
    const script = ['INT. BANK - DAY', '', 'DEV', 'The vault was empty all along.', ''].join('\n');
    const obstacle = findCentralObstacle(records, 'JUNE', script)!;
    assert.equal(obstacle, 'the revelation \u201cThe vault was empty all along\u201d');
    for (const sentence of [`JUNE must face ${obstacle}.`, `JUNE must contend with \u201cescape\u201d before ${obstacle}.`]) {
      assert.doesNotMatch(sentence, /\s{2,}/, 'no doubled spacing');
      assert.match(sentence, /\.$/, 'ends in a single period');
    }
  });

  it('no-fire: empty records or empty protagonist name', () => {
    assert.equal(findCentralObstacle([], 'ROSA'), null);
    assert.equal(findCentralObstacle([makeRecord()], ''), null);
  });
});

// ── buildLogline ────────────────────────────────────────────────────────────────

describe('buildLogline', () => {
  const fullFountain = [
    'INT. APARTMENT - NIGHT',
    '',
    'ROSA',
    'I need to get out of this town before they find me.',
  ].join('\n');

  it('assembles a full logline from complete signals (inciting + goal + obstacle)', () => {
    const report = makeReport({ characters: ['ROSA', 'DEV'], sceneCount: 3 });
    const records = [
      makeRecord({ sceneIdx: 0, purpose: 'introduce_conflict', dramaticTurn: 'Rosa finds the ledger hidden in the wall.' }),
      makeRecord({ sceneIdx: 1 }),
      makeRecord({
        sceneIdx: 2, purpose: 'climax',
        relationshipShifts: [{ pairKey: 'DEV|ROSA', dimension: 'trust', amount: -4 }],
      }),
    ];

    const logline = buildLogline(report, records, fullFountain);
    assert.ok(logline, 'a full-signal logline must not be null');
    assert.match(logline!, /^When Rosa finds the ledger hidden in the wall, ROSA must contend with/);
    assert.match(logline!, /I need to get out of this town before they find me/);
    assert.match(logline!, /before a fracturing bond with DEV\.$/);
  });

  it('degrades: no speaking character at all (empty report.characters) -> null', () => {
    const report = makeReport({ characters: [] });
    const records = [makeRecord()];
    assert.equal(buildLogline(report, records, fullFountain), null);
  });

  it('degrades: no goal found -> "must face {obstacle}" clause, no quoted want', () => {
    const report = makeReport({ characters: ['ROSA'] });
    const records = [
      makeRecord({ sceneIdx: 0, purpose: 'climax', dramaticTurn: 'The dam finally breaks.' }),
    ];
    // ROSA never speaks a want-lexicon line, so findApparentGoal degrades to
    // null — but she is still the only speaker, so the dialogue-share gate
    // passes, and the climax turn IS spoken, so the quote gate passes too.
    const noGoalFountain = [
      'INT. DAM - DAY',
      '',
      'Rosa watches the water rise.',
      '',
      'ROSA',
      'The dam finally breaks.',
    ].join('\n');
    const logline = buildLogline(report, records, noGoalFountain);
    assert.ok(logline);
    // Tier (c) text is a whole sentence from the script, so it is labeled and
    // quoted rather than spliced raw after "must face" — see frameSceneText.
    assert.match(logline!, /ROSA must face the turn “The dam finally breaks”\.$/);
    assert.ok(!logline!.includes('contend with'), 'must not fabricate a goal clause');
  });

  it('degrades: neither goal nor obstacle found -> a scene-count sentence naming the METRIC', () => {
    const report = makeReport({ characters: ['ROSA'], sceneCount: 5 });
    const records = [makeRecord({ sceneIdx: 0 })];
    // ROSA speaks one inert line: enough to clear the dialogue-share gate (she
    // is 100% of the dialogue) without supplying a want, a turn or a revelation.
    const bareFountain = ['INT. ROOM - DAY', '', 'ROSA', 'Mm.', ''].join('\n');
    const logline = buildLogline(report, records, bareFountain);
    // 2026-09-11: "most-present speaker", not "central figure" — the metric is
    // dialogue-line rank, and on 4 of the 32 committed scripts a different
    // character appears in more scenes (18 of 32 for the engine's own modal
    // power holder). See assembleLogline's comment for the measurement.
    assert.equal(logline, 'ROSA is the most-present speaker across 5 scenes.');
    assert.ok(!logline!.includes('central figure'), 'must not claim narrative centrality');
  });

  // ── THE DIALOGUE-SHARE GATE (2026-09-11, producer-tier discovery #7a) ───────
  it('no-fire: a speaker below PROTAGONIST_MIN_DIALOGUE_SHARE gets no logline at all', () => {
    const report = makeReport({ characters: ['ROSA'], sceneCount: 2 });
    const records = [makeRecord({ sceneIdx: 0 })];
    // ROSA holds 1 of 12 dialogue blocks — 8.3%, under the 20% threshold, the
    // shape of a document with no protagonist (see
    // tests/fixtures/feature-length/assembled-feature.fountain at 7.3%).
    const lines = ['INT. ROOM - DAY', '', 'ROSA', 'Mm.', ''];
    for (let i = 0; i < 11; i++) lines.push(`EXTRA${i}`, 'Words here.', '');
    assert.equal(buildLogline(report, records, lines.join('\n')), null);
  });

  it('fire: a speaker at or above the threshold still gets one — the gate is a floor, not a ban', () => {
    const report = makeReport({ characters: ['ROSA'], sceneCount: 2 });
    const records = [makeRecord({ sceneIdx: 0 })];
    // ROSA holds 1 of 4 dialogue blocks — 25%, above the 20% threshold.
    const lines = ['INT. ROOM - DAY', '', 'ROSA', 'Mm.', ''];
    for (let i = 0; i < 3; i++) lines.push(`EXTRA${i}`, 'Words here.', '');
    assert.equal(buildLogline(report, records, lines.join('\n')),
      'ROSA is the most-present speaker across 2 scenes.');
  });

  it('the threshold sits inside the measured gap between real scripts and a concatenation', () => {
    // 7.3% (assembled-feature.fountain) .. 20% (threshold) .. 27.8%
    // (close-quarters.fountain, the lowest of the 32 real committed scripts).
    assert.ok(PROTAGONIST_MIN_DIALOGUE_SHARE > 0.073, 'must exclude the 231-scene concatenation');
    assert.ok(PROTAGONIST_MIN_DIALOGUE_SHARE < 0.278, 'must not cost any real committed script its logline');
  });
});

describe('dialogueShares / hasProtagonistDialogueShare', () => {
  const script = [
    'INT. ROOM - DAY',
    '',
    'ROSA',
    'One.',
    '',
    'DEV',
    'Two.',
    '',
    'DEV',
    'Three.',
    '',
  ].join('\n');

  it('ranks speakers by dialogue-block count and reports honest shares', () => {
    const shares = dialogueShares(script);
    assert.deepEqual(shares.map(s => s.speaker), ['DEV', 'ROSA']);
    assert.deepEqual(shares.map(s => s.lines), [2, 1]);
    assert.equal(shares[0].share.toFixed(4), (2 / 3).toFixed(4));
  });

  it('no-fire: empty input, and a script with cues but no dialogue, yield no shares', () => {
    assert.deepEqual(dialogueShares(''), []);
    assert.deepEqual(dialogueShares('INT. ROOM - DAY\n\nJust action.'), []);
  });

  it('a speaker absent from the script fails the gate rather than throwing', () => {
    assert.equal(hasProtagonistDialogueShare(script, 'NOBODY'), false);
    assert.equal(hasProtagonistDialogueShare(script, ''), false);
    assert.equal(hasProtagonistDialogueShare('', 'ROSA'), false);
  });

  it('fire/no-fire either side of the threshold', () => {
    assert.equal(hasProtagonistDialogueShare(script, 'DEV'), true);
    assert.equal(hasProtagonistDialogueShare(script, 'ROSA'), true); // 33% > 20%
  });
});

// ── buildSynopsis ──────────────────────────────────────────────────────────────

describe('buildSynopsis', () => {
  it('fires: builds up to 3 sentences from setup/midpoint/climax beats', () => {
    const records = [
      makeRecord({ sceneIdx: 0, purpose: 'introduce_conflict', dramaticTurn: 'Rosa discovers the ledger.' }),
      makeRecord({ sceneIdx: 1, purpose: 'turning_point', dramaticTurn: 'Dev confesses his part in the theft.' }),
      makeRecord({ sceneIdx: 2, purpose: 'climax', dramaticTurn: 'Rosa exposes the whole operation.' }),
    ];
    const synopsis = buildSynopsis(records);
    assert.equal(
      synopsis,
      'Rosa discovers the ledger. Dev confesses his part in the theft. Rosa exposes the whole operation.',
    );
  });

  it('degrades: only the setup beat is present -> a single sentence', () => {
    const records = [makeRecord({ sceneIdx: 0, purpose: 'establish_world', dramaticTurn: 'A quiet town wakes up.' })];
    assert.equal(buildSynopsis(records), 'A quiet town wakes up.');
  });

  it('no-fire: no records at all -> null', () => {
    assert.equal(buildSynopsis([]), null);
  });

  it('no-fire: records exist but no beat has any dramaticTurn/revelation text -> null', () => {
    const records = [makeRecord({ sceneIdx: 0 }), makeRecord({ sceneIdx: 1, purpose: 'turning_point' })];
    assert.equal(buildSynopsis(records), null);
  });
});

// ── buildGenreLine / buildCompsSlot ──────────────────────────────────────────────

describe('buildGenreLine', () => {
  it('fires: formats a provided genre', () => {
    assert.equal(buildGenreLine('neo-noir thriller'), 'Genre: neo-noir thriller');
  });

  it('no-fire: undefined/empty genre omits the line', () => {
    assert.equal(buildGenreLine(undefined), null);
    assert.equal(buildGenreLine(null), null);
    assert.equal(buildGenreLine('   '), null);
  });
});

describe('buildCompsSlot', () => {
  it('always returns the labeled placeholder, never a fabricated comp', () => {
    assert.equal(buildCompsSlot(), COMPS_PLACEHOLDER);
    // 2026-09-11 (#7d): the blank now says WHOSE blank it is. A producer
    // reading "Comparable titles: ___" cannot tell whether the engine failed,
    // the analysis is unfinished, or the line is theirs to complete.
    assert.match(buildCompsSlot(), /^Comparable titles: ___ \(yours to fill in/);
    assert.match(buildCompsSlot(), /will not invent a comp\)$/);
  });
});

// ── buildPitchContent ─────────────────────────────────────────────────────────

describe('buildPitchContent', () => {
  it('combines all four builders over one shared input', () => {
    const report = makeReport({ characters: ['ROSA'], sceneCount: 2 });
    const records = [
      makeRecord({ sceneIdx: 0, purpose: 'introduce_conflict', dramaticTurn: 'Rosa finds the ledger.' }),
      makeRecord({ sceneIdx: 1, purpose: 'climax', dramaticTurn: 'Rosa exposes the operation.' }),
    ];
    const fountain = 'INT. ROOM - DAY\n\nROSA\nI need to get out before they find me.';

    const content = buildPitchContent(report, records, fountain, 'thriller');
    assert.ok(content.logline);
    assert.equal(content.genreLine, 'Genre: thriller');
    assert.ok(content.synopsis);
    assert.equal(content.comps, COMPS_PLACEHOLDER);
  });
});

// ── renderPitchKitHtml integration — pitch content actually reaches the doc ──
// Exercises the render path (server/lib/pitchkit-html.ts, also owned by this
// wave) end to end with buildPitchContent's output, so the "Pitch Kit is
// thin" finding is checked all the way to the rendered document, not just at
// the builder layer above.

describe('renderPitchKitHtml — pitch content markers', () => {
  it('refuses a pitch kit when the analysis is incomplete or scene-truncated', async () => {
    const { renderPitchKitHtml } = await import('../../server/lib/pitchkit-html.ts');
    const input = {
      title: 'Incomplete Draft',
      report: makeReport({ analysisComplete: false }),
      records: [],
      sceneCharacters: [],
    };
    assert.throws(() => renderPitchKitHtml(input), /complete whole-draft analysis/i);
    assert.throws(
      () => renderPitchKitHtml({ ...input, report: makeReport({ analysisComplete: true, truncatedForAnalysis: true }) }),
      /complete whole-draft analysis/i,
    );
  });

  it('renders logline, genre, synopsis, and comps sections, plus a cast table with role hints', async () => {
    const { renderPitchKitHtml } = await import('../../server/lib/pitchkit-html.ts');

    const report = makeReport({ characters: ['ROSA', 'DEV'], sceneCount: 2 });
    const records = [
      makeRecord({ sceneIdx: 0, purpose: 'introduce_conflict', dramaticTurn: 'Rosa finds the ledger.' }),
      makeRecord({ sceneIdx: 1, purpose: 'climax', dramaticTurn: 'Rosa exposes the operation.' }),
    ];
    const fountain = 'INT. ROOM - DAY\n\nROSA\nI need to get out before they find me.';
    const sceneCharacters: SceneCharacterTally[] = [
      { sceneIdx: 0, speakers: ['ROSA', 'DEV'], dialogueLineCounts: { ROSA: 5, DEV: 2 } },
      { sceneIdx: 1, speakers: ['ROSA'], dialogueLineCounts: { ROSA: 3 } },
    ];

    const pitchContent = buildPitchContent(report, records, fountain, 'thriller');
    const html = renderPitchKitHtml({
      title: 'Untitled',
      titlePageTitle: 'The Ledger',
      titlePageAuthor: 'J. Author',
      report, records, sceneCharacters, pitchContent,
    });

    // Title-page fallback reaches the rendered document too.
    assert.match(html, /<h1 class="title">The Ledger<\/h1>/);
    assert.match(html, /class="byline">Written by J\. Author/);

    // Logline / genre / synopsis / comps sections all present with real content.
    assert.match(html, /<h2>Logline<\/h2>/);
    assert.match(html, /class="logline-text">When Rosa finds the ledger/);
    assert.match(html, /<h2>Genre &amp; Tone<\/h2>/);
    assert.match(html, /Genre: thriller/);
    assert.match(html, /<h2>Synopsis<\/h2>/);
    assert.match(html, /class="synopsis-text">/);
    assert.match(html, /<h2>Comparable Titles<\/h2>/);
    assert.match(html, /Comparable titles: ___/);

    // Cast table: not a bare name list — line counts + role hints.
    assert.match(html, /<h2>Cast<\/h2>/);
    assert.match(html, /class="cast-name">ROSA<\/div>/);
    assert.match(html, /class="cast-role cast-role-protagonist">Protagonist<\/div>/);
    assert.match(html, /class="cast-role cast-role-supporting">Supporting<\/div>/);
    assert.match(html, /8 lines/); // ROSA: 5 + 3 across both scenes
  });

  it('omits the genre section entirely, and shows honest empty-notes, when pitchContent is absent', async () => {
    const { renderPitchKitHtml } = await import('../../server/lib/pitchkit-html.ts');
    const report = makeReport({ characters: [] });

    const html = renderPitchKitHtml({ title: 'No Signal', report, records: [], sceneCharacters: [] });

    assert.ok(!html.includes('<h2>Genre &amp; Tone</h2>'), 'genre section must be fully omitted when absent');
    assert.match(html, /No logline could be assembled/);
    assert.match(html, /No act-structure beats were detected/);
    assert.match(html, /Comparable titles: ___/, 'comps slot is always present, even with no signal');
  });
});

// ── Corpus-level proof (real scripts, real analyzer, real doctor) ────────────
//
// The three unit-level gates above are checked here against the writing they
// were derived from: the 20 CC0 shorts in data/screenplays/ and the 231-scene
// concatenation in tests/fixtures/feature-length/. Runs the real pipeline
// (runScriptDoctor + analyzeFountainText), not hand-built records, because the
// defect was in what the real detectors produce, not in what a fixture says
// they produce.

describe('buildLogline — corpus-level proof on the committed screenplays', () => {
  const SCREENPLAY_DIR = path.join(REPO_ROOT, 'data/screenplays');

  async function loglineFor(fountainPath: string): Promise<string | null> {
    const fountain = readFileSync(fountainPath, 'utf8');
    const report = await runScriptDoctor(fountain);
    const { records } = analyzeFountainText(fountain);
    return buildLogline(report, records, fountain);
  }

  it('runoff.fountain no longer quotes an ACTION line as "the turn"', async () => {
    // THE REPRODUCTION. Before the quote gate this rendered
    //   ... must face the turn "The inspector nods, packs the binder, and leaves"
    // and that sentence is action, at runoff.fountain:146.
    const logline = await loglineFor(path.join(SCREENPLAY_DIR, 'runoff.fountain'));
    assert.ok(logline, 'runoff still has a protagonist and must still get a logline');
    assert.ok(
      !logline!.includes('The inspector nods'),
      `runoff still quotes the action line: ${logline}`,
    );
    assert.ok(
      !/the turn \u201c/.test(logline!),
      `runoff still quotes a turn it has no spoken evidence for: ${logline}`,
    );
  });

  it('off-season.fountain KEEPS its turn — its climax turn is spoken dialogue', async () => {
    // The other direction: the gate must not be a blanket ban on quoting.
    const logline = await loglineFor(path.join(SCREENPLAY_DIR, 'off-season.fountain'));
    assert.ok(logline);
    assert.match(logline!, /the turn \u201c/, `off-season lost its spoken turn: ${logline}`);
  });

  it('all 20 CC0 shorts still derive a logline, and none claims a "central figure"', async () => {
    const files = readdirSync(SCREENPLAY_DIR).filter(f => f.endsWith('.fountain')).sort();
    assert.equal(files.length, 20, 'data/screenplays/ holds 20 CC0 live-action shorts');
    for (const file of files) {
      const logline = await loglineFor(path.join(SCREENPLAY_DIR, file));
      assert.ok(logline, `${file} lost its logline to the dialogue-share gate`);
      assert.ok(!logline!.includes('central figure'), `${file} still claims a central figure`);
      // No mid-clause ellipsis: the inciting clause is one sentence now.
      assert.ok(
        !/\u2026[^\u201d]*$|\u2026,/.test(logline!),
        `${file} carries a truncated clause mid-sentence: ${logline}`,
      );
    }
  });

  it('the 231-scene concatenation gets NO logline — it has no protagonist to write one about', async () => {
    const logline = await loglineFor(
      path.join(REPO_ROOT, 'tests/fixtures/feature-length/assembled-feature.fountain'),
    );
    assert.equal(logline, null);
  });
});
