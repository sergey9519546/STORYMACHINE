// Finding identity for the draft-over-draft delta (src/lib/finding-identity.ts).
//
// The bug this file guards against is not hypothetical: E2's delta matched
// findings by the pass's raw `location` string, and roughly a third of those
// strings are absolute line numbers. Insert one line near the top of a draft
// and every later finding is renamed, so the counter reported a script nobody
// had touched as "N cleared · N new".
//
// Two kinds of coverage below, deliberately:
//   1. Unit — each normalization rule, plus every fallback (no index, line
//      above the first slugline, scene number past the end), because a
//      "content-anchored identity" that silently swallowed unresolvable
//      locations would be worse than the raw string it replaced.
//   2. End-to-end against the REAL doctor — run the actual 14 passes over a
//      real script and its one-line-inserted successor, and measure the churn
//      both ways. This is the assertion that would have caught the original
//      defect, and it is the one that fails if a future change re-introduces
//      line sensitivity anywhere in the chain.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFindingSceneIndex,
  pairFindingSceneIndexes,
  normalizeFindingLocation,
  findingIdentity,
  collectFindingIdentities,
  diffFindingIdentities,
} from '../../src/lib/finding-identity.ts';
import { runScriptDoctor, clearDoctorCache } from '../../server/nvm/analyze/doctor.ts';

// A small, ordinary-looking script with two scenes. Line numbers are 1-based;
// "INT. BAR - NIGHT" is line 1 and "EXT. ROAD - DAY" is line 9.
const TWO_SCENES = [
  'INT. BAR - NIGHT',                       // 1
  '',                                       // 2
  'Rain on the window. MARA nurses a drink.', // 3
  '',                                       // 4
  'MARA',                                   // 5
  'You said you would come alone.',         // 6
  '',                                       // 7
  'She does not look up.',                  // 8
  'EXT. ROAD - DAY',                        // 9
  '',                                       // 10
  'The car sits crooked on the shoulder.',  // 11
  '',                                       // 12
  'DEL',                                    // 13
  'It was never about the money.',          // 14
].join('\n');

describe('buildFindingSceneIndex', () => {
  it('indexes every scene heading with its 1-based line', () => {
    const index = buildFindingSceneIndex(TWO_SCENES);
    assert.ok(index);
    assert.deepEqual(index.startLines, [1, 9]);
    assert.deepEqual(index.headings, ['INT. BAR - NIGHT', 'EXT. ROAD - DAY']);
  });

  it('normalizes heading whitespace and case, so a re-typed slugline is the same place', () => {
    const index = buildFindingSceneIndex('int.   bar  -  night\n\nRain.\n');
    assert.deepEqual(index?.headings, ['INT. BAR - NIGHT']);
  });

  it('returns null when there is nothing to anchor to', () => {
    assert.equal(buildFindingSceneIndex(''), null);
    assert.equal(buildFindingSceneIndex('   \n\n'), null);
    assert.equal(buildFindingSceneIndex(null), null);
    assert.equal(buildFindingSceneIndex(undefined), null);
    // Prose with no sluglines at all: no scene to name, so no anchoring.
    assert.equal(buildFindingSceneIndex('Just some action lines.\nAnd another.\n'), null);
  });
});

describe('pairFindingSceneIndexes', () => {
  it('anchors both sides when both have scene headings', () => {
    const [prev, curr] = pairFindingSceneIndexes(TWO_SCENES, TWO_SCENES);
    assert.ok(prev && curr);
  });

  it('falls back to raw on BOTH sides when either side cannot be anchored', () => {
    // The dangerous case: one side anchored and the other raw would match
    // nothing at all, and the delta would report the entire draft as cleared
    // and new at once.
    assert.deepEqual(pairFindingSceneIndexes(TWO_SCENES, null), [null, null]);
    assert.deepEqual(pairFindingSceneIndexes(null, TWO_SCENES), [null, null]);
    assert.deepEqual(pairFindingSceneIndexes('no sluglines here', TWO_SCENES), [null, null]);
  });

  it('the fallback still matches an unchanged finding — it is old behavior, not broken behavior', () => {
    const [prev, curr] = pairFindingSceneIndexes(null, TWO_SCENES);
    const passes = [{ pass: 'dialogue', issues: [{ rule: 'ON_THE_NOSE', location: 'Line 6 (MARA)' }] }];
    assert.deepEqual(
      diffFindingIdentities(
        collectFindingIdentities(passes, prev),
        collectFindingIdentities(passes, curr),
      ),
      { cleared: 0, added: 0 },
    );
  });
});

describe('normalizeFindingLocation', () => {
  const index = buildFindingSceneIndex(TWO_SCENES)!;

  it('resolves a line span to the scene it falls in', () => {
    assert.equal(normalizeFindingLocation('Lines 5-6', index), 'at[INT. BAR - NIGHT]');
    assert.equal(normalizeFindingLocation('Line 13 (DEL)', index), 'at[EXT. ROAD - DAY] (DEL)');
  });

  it('handles the number-run shapes the passes actually emit', () => {
    // En-dash range, comma list, and the "~" the approximate-span passes use.
    assert.equal(normalizeFindingLocation('Lines 3–6', index), 'at[INT. BAR - NIGHT]');
    assert.equal(normalizeFindingLocation('Lines 3, 5, 6', index), 'at[INT. BAR - NIGHT]');
    assert.equal(normalizeFindingLocation('Lines ~3–8', index), 'at[INT. BAR - NIGHT]');
    // A span that genuinely crosses a scene boundary names both places.
    assert.equal(normalizeFindingLocation('Lines 6-11', index), 'at[INT. BAR - NIGHT + EXT. ROAD - DAY]');
  });

  it('resolves a scene reference to its heading, so renumbering does not rename it', () => {
    assert.equal(normalizeFindingLocation('Scene 2', index), 'scene[EXT. ROAD - DAY]');
    assert.equal(
      normalizeFindingLocation('Scene 1 (INT. BAR - NIGHT)', index),
      'scene[INT. BAR - NIGHT] (INT. BAR - NIGHT)',
    );
  });

  it('leaves locations with no line or scene reference exactly as the pass wrote them', () => {
    for (const raw of ['Action line adverbs', 'Revelation distribution', 'Act 1 pacing', 'Character: MARA']) {
      assert.equal(normalizeFindingLocation(raw, index), raw);
    }
  });

  it('falls back to the raw location when a reference cannot be resolved', () => {
    // No index at all (older report shape / text the client never received).
    assert.equal(normalizeFindingLocation('Lines 5-6', null), 'Lines 5-6');
    // A scene number past the end of the script.
    assert.equal(normalizeFindingLocation('Scene 9', index), 'Scene 9');
    // A line above the first slugline has no owning scene.
    const withPreamble = buildFindingSceneIndex('FADE IN:\n\nINT. BAR - NIGHT\n\nRain.\n')!;
    assert.equal(normalizeFindingLocation('Line 1', withPreamble), 'Line 1');
  });

  it('never re-scans text it just inserted (a heading containing digits is safe)', () => {
    const numbered = buildFindingSceneIndex('INT. ROOM 12 - DAY\n\nHe waits.\n')!;
    // The inserted heading carries "12"; the result must not then be re-read
    // as another reference.
    assert.equal(normalizeFindingLocation('Line 3', numbered), 'at[INT. ROOM 12 - DAY]');
  });
});

describe('findingIdentity — line drift', () => {
  const before = TWO_SCENES;
  // The upstream edit: one extra action line inside scene 1. Every line
  // number below it shifts by one; not one word of scene 2 changed.
  const after = TWO_SCENES.replace(
    'She does not look up.',
    'She does not look up.\nThe door stays shut.',
  );

  const beforeIndex = buildFindingSceneIndex(before)!;
  const afterIndex = buildFindingSceneIndex(after)!;

  it('matches an untouched finding across an edit that shifted its line numbers', () => {
    // The same finding in scene 2, reported at line 13 before the edit and
    // line 14 after it.
    const idBefore = findingIdentity('dialogue', { rule: 'ON_THE_NOSE', location: 'Line 13 (DEL)' }, beforeIndex);
    const idAfter = findingIdentity('dialogue', { rule: 'ON_THE_NOSE', location: 'Line 14 (DEL)' }, afterIndex);
    assert.equal(idBefore, idAfter);

    // And the identity this replaced would NOT have matched — the churn this
    // whole module exists to remove.
    assert.notEqual('dialogue::ON_THE_NOSE::Line 13 (DEL)', 'dialogue::ON_THE_NOSE::Line 14 (DEL)');
  });

  it('still reports a finding that genuinely moved to another scene', () => {
    const stayed = findingIdentity('dialogue', { rule: 'ON_THE_NOSE', location: 'Line 6' }, beforeIndex);
    const moved = findingIdentity('dialogue', { rule: 'ON_THE_NOSE', location: 'Line 14' }, afterIndex);
    assert.notEqual(stayed, moved);
  });

  it('still reports a finding whose scene heading was rewritten', () => {
    const renamed = buildFindingSceneIndex(TWO_SCENES.replace('EXT. ROAD - DAY', 'EXT. RIVERBANK - DUSK'))!;
    assert.notEqual(
      findingIdentity('pacing', { rule: 'SLOW', location: 'Scene 2' }, beforeIndex),
      findingIdentity('pacing', { rule: 'SLOW', location: 'Scene 2' }, renamed),
    );
  });
});

describe('collectFindingIdentities', () => {
  const index = buildFindingSceneIndex(TWO_SCENES)!;

  it('keeps repeats of one rule in one place distinguishable', () => {
    const ids = collectFindingIdentities(
      [{ pass: 'dialogue', issues: [
        { rule: 'ON_THE_NOSE', location: 'Line 5' },
        { rule: 'ON_THE_NOSE', location: 'Line 6' },
      ] }],
      index,
    );
    assert.equal(ids.size, 2, 'two findings in one scene must not collapse into one');
    assert.ok(ids.has('dialogue::ON_THE_NOSE::at[INT. BAR - NIGHT]'));
    assert.ok(ids.has('dialogue::ON_THE_NOSE::at[INT. BAR - NIGHT]#2'));
  });

  it('reports a scene that gained a second copy of the same note as one new finding', () => {
    const passesBefore = [{ pass: 'dialogue', issues: [{ rule: 'ON_THE_NOSE', location: 'Line 5' }] }];
    const passesAfter = [{ pass: 'dialogue', issues: [
      { rule: 'ON_THE_NOSE', location: 'Line 5' },
      { rule: 'ON_THE_NOSE', location: 'Line 6' },
    ] }];
    const delta = diffFindingIdentities(
      collectFindingIdentities(passesBefore, index),
      collectFindingIdentities(passesAfter, index),
    );
    assert.deepEqual(delta, { cleared: 0, added: 1 });
  });

  it('is order-stable: the same report always yields the same set', () => {
    const passes = [{ pass: 'pacing', issues: [
      { rule: 'SLOW', location: 'Scene 1 (INT. BAR - NIGHT)' },
      { rule: 'SLOW', location: 'Scene 2' },
    ] }];
    assert.deepEqual(
      [...collectFindingIdentities(passes, index)].sort(),
      [...collectFindingIdentities(passes, index)].sort(),
    );
  });

  it('degrades to raw-location identities when there is no index', () => {
    const ids = collectFindingIdentities(
      [{ pass: 'dialogue', issues: [{ rule: 'ON_THE_NOSE', location: 'Lines 40-42' }] }],
      null,
    );
    assert.deepEqual([...ids], ['dialogue::ON_THE_NOSE::Lines 40-42']);
  });
});

describe('diffFindingIdentities', () => {
  it('counts both directions and nothing else', () => {
    assert.deepEqual(
      diffFindingIdentities(new Set(['a', 'b', 'c']), new Set(['b', 'c', 'd'])),
      { cleared: 1, added: 1 },
    );
    assert.deepEqual(diffFindingIdentities(new Set(), new Set()), { cleared: 0, added: 0 });
    assert.deepEqual(diffFindingIdentities(new Set(['a']), new Set(['a'])), { cleared: 0, added: 0 });
  });
});

// ── The measurement that would have caught the original defect ──────────────
// Everything above is fixture-shaped. This runs the REAL 14-pass doctor over a
// real script and its one-line-inserted successor and compares the churn the
// old identity would have reported against the churn the new one does.
describe('real doctor run — an upstream insertion must not churn later findings', () => {
  // Four scenes of deliberately on-the-nose dialogue: enough for the
  // dialogue pass to report line-anchored findings ("Line 6 (MARA)"), which
  // is the shape that drifts. A uniform filler script would not exercise this
  // at all — its findings are almost entirely scene- and act-level, so it
  // would pass whether or not the fix worked.
  const SCENES: string[][] = [
    ['INT. BAR - NIGHT', '', 'Rain hammers the window. MARA nurses a flat beer.', '',
      'MARA', 'I am angry at you because you left me alone at the end of the day.', '',
      'DEL', 'I feel guilty about what I did to your brother last winter.', '',
      'She does not look up from the glass.'],
    ['EXT. ROAD - DAY', '', 'The car sits crooked on the gravel shoulder.', '',
      'DEL', 'You know that I have always loved you, deep down inside my heart.', '',
      'MARA', 'I am afraid that you will leave me again, just like my father did.', '',
      'He kicks the tire and looks away.'],
    ['INT. KITCHEN - MORNING', '', 'Steam on the window. A kettle screams.', '',
      'MARA', 'At the end of the day, we both know this marriage is over now.', '',
      'DEL', 'I am sad because you never once believed a single word I said.', '',
      'The kettle keeps screaming.'],
    ['EXT. FIELD - DUSK', '', 'Long grass. A tree line black against the sky.', '',
      'DEL', 'I am leaving because I cannot stand the way you look at me.', '',
      'MARA', 'Time heals all wounds, or so my mother always used to tell me.', '',
      'She watches him go.'],
  ];
  const lines = SCENES.flatMap((s) => [...s, '']);
  const original = lines.join('\n');
  // The upstream edit: one extra action line in the FIRST scene. Every line
  // number after it moves by one; scenes 2-4 are untouched, word for word.
  const edited = [
    ...lines.slice(0, 3),
    'He pours the last of the coffee and sets the pot down hard.',
    ...lines.slice(3),
  ].join('\n');

  const idsOf = (
    report: { passes: Array<{ pass: string; issues: Array<{ rule: string; location: string }> }> },
    text: string | null,
  ) =>
    collectFindingIdentities(
      report.passes.map((p) => ({ pass: p.pass, issues: p.issues })),
      // null index === exactly the old behavior: compare raw location strings.
      text === null ? null : buildFindingSceneIndex(text),
    );

  it('reports less churn than the raw-location identity did, and none at all for the drifting findings', async () => {
    clearDoctorCache();
    const before = await runScriptDoctor(original);
    clearDoctorCache();
    const after = await runScriptDoctor(edited);

    const rawBefore = idsOf(before, null);
    const rawAfter = idsOf(after, null);
    const anchoredBefore = idsOf(before, original);
    const anchoredAfter = idsOf(after, edited);

    const rawDelta = diffFindingIdentities(rawBefore, rawAfter);
    const anchoredDelta = diffFindingIdentities(anchoredBefore, anchoredAfter);
    const rawChurn = rawDelta.cleared + rawDelta.added;
    const anchoredChurn = anchoredDelta.cleared + anchoredDelta.added;

    // Fixture sanity: if the raw identity did not churn on this edit, the
    // comparison below proves nothing and the fixture needs fixing, not the
    // assertion.
    const rawDrifted = [...rawBefore].filter((id) => !rawAfter.has(id) && id.includes('::Line '));
    assert.ok(
      rawDrifted.length > 0,
      'fixture problem: expected at least one line-anchored finding to drift under the raw identity',
    );

    // The actual claim: those same findings are matched now.
    const anchoredMoved = [
      ...[...anchoredBefore].filter((id) => !anchoredAfter.has(id)),
      ...[...anchoredAfter].filter((id) => !anchoredBefore.has(id)),
    ];
    for (const id of anchoredMoved) {
      assert.ok(
        !id.includes('at[EXT. ROAD - DAY]') &&
          !id.includes('at[INT. KITCHEN - MORNING]') &&
          !id.includes('at[EXT. FIELD - DUSK]'),
        `a finding in an untouched scene still churned: ${id}`,
      );
    }

    assert.ok(
      anchoredChurn < rawChurn,
      `expected less churn with content anchoring (raw ${rawChurn}, anchored ${anchoredChurn})`,
    );
  });
});
