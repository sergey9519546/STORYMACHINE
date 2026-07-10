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
import {
  extractTitlePage, findIncitingIncident, findApparentGoal, findCentralObstacle,
  buildLogline, buildSynopsis, buildGenreLine, buildCompsSlot, buildPitchContent,
  COMPS_PLACEHOLDER,
} from '../../server/lib/logline.ts';
import type { ScriptDoctorReport, DoctorGrade, CoverageVerdict } from '../../server/nvm/analyze/types.ts';
import type { ScreenplaySceneRecord } from '../../server/nvm/screenplay/memory.ts';
import type { StructureState } from '../../server/nvm/screenplay/structure.ts';
import type { SceneCharacterTally } from '../../server/lib/breakdown.ts';

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
    assert.equal(findCentralObstacle(records, 'ROSA'), 'The building collapses around them.');
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
    assert.equal(findCentralObstacle(records, 'ROSA'), 'Rosa faces the collapse alone.');
  });

  it('tier (c) fires: the climax scene\'s dramaticTurn when tiers (a)/(b) are absent', () => {
    const records = [
      makeRecord({ sceneIdx: 0 }),
      makeRecord({ sceneIdx: 1, purpose: 'climax', dramaticTurn: 'She confronts the man who killed her sister.' }),
    ];
    assert.equal(findCentralObstacle(records, 'ROSA'), 'She confronts the man who killed her sister.');
  });

  it('tier (c) falls back to the single highest-suspense scene when no scene is tagged climax', () => {
    const records = [
      makeRecord({ sceneIdx: 0, suspenseDelta: 1, dramaticTurn: 'A car passes by.' }),
      makeRecord({ sceneIdx: 1, suspenseDelta: 5, dramaticTurn: 'Gunfire erupts in the alley.' }),
    ];
    assert.equal(findCentralObstacle(records, 'ROSA'), 'Gunfire erupts in the alley.');
  });

  it('no-fire: no signal in any tier returns null', () => {
    const records = [makeRecord({ sceneIdx: 0, suspenseDelta: 0 })];
    assert.equal(findCentralObstacle(records, 'ROSA'), null);
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
    // fountain has no ROSA dialogue at all, so findApparentGoal degrades to null.
    const noGoalFountain = 'INT. DAM - DAY\n\nRosa watches the water rise.';
    const logline = buildLogline(report, records, noGoalFountain);
    assert.ok(logline);
    assert.match(logline!, /ROSA must face The dam finally breaks\.$/);
    assert.ok(!logline!.includes('contend with'), 'must not fabricate a goal clause');
  });

  it('degrades: neither goal nor obstacle found -> generic scene-count sentence', () => {
    const report = makeReport({ characters: ['ROSA'], sceneCount: 5 });
    const records = [makeRecord({ sceneIdx: 0 })];
    const bareFountain = 'INT. ROOM - DAY\n\nNothing much happens.';
    const logline = buildLogline(report, records, bareFountain);
    assert.equal(logline, 'ROSA is the central figure across 5 scenes.');
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
    assert.equal(buildCompsSlot(), 'Comparable titles: ___');
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
