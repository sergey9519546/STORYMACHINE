// Script Doctor — tests for locate.ts, the "resolve a RevisionIssue.location
// string to a concrete line span" bridge module. Conventions: node:test +
// assert/strict, matching tests/core/fountain-analyzer.test.ts and
// tests/passes/*.test.ts.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { locateIssues } from '../../server/nvm/analyze/locate.ts';
import { analyzeFountainText } from '../../server/nvm/analyze/fountain-analyzer.ts';
import type { PassName, RevisionIssue } from '../../server/nvm/revision/passes/types.ts';

// Identical 3-scene fixture to fountain-analyzer.test.ts's "splits on 3
// sluglines" case, so this test can cross-check its hand-computed line spans
// directly against the SAME scene indices fountain-analyzer.ts assigns,
// rather than trusting two independent implementations to agree by luck.
const THREE_SCENE_FOUNTAIN = [
  'INT. KITCHEN - DAY',        //  1
  '',                          //  2
  'Sarah stares at the letter.', // 3
  '',                          //  4
  'SARAH',                     //  5
  "I can't believe this.",     //  6
  '',                          //  7
  'INT. GARAGE - NIGHT',       //  8
  '',                          //  9
  'The engine roars to life.', // 10
  '',                          // 11
  'JOHN',                      // 12
  'We need to go now.',        // 13
  '',                          // 14
  'EXT. HIGHWAY - NIGHT',      // 15
  '',                          // 16
  'The car speeds away into the distance.', // 17
].join('\n');

function issue(
  location: string,
  overrides: Partial<RevisionIssue> = {},
  pass: PassName = 'structure',
): RevisionIssue & { pass: PassName } {
  return {
    location,
    rule: 'TEST_RULE',
    description: 'a test issue',
    severity: 'minor',
    pass,
    ...overrides,
  };
}

describe('locateIssues — scene anchor', () => {
  it('resolves "Scene N" to the exact 1-based span fountain-analyzer.ts assigns that scene', () => {
    // Sanity check the fixture against the real analyzer first — this test is
    // only meaningful if the scene indices genuinely line up.
    const analysis = analyzeFountainText(THREE_SCENE_FOUNTAIN);
    assert.equal(analysis.sceneCount, 3);
    assert.deepEqual(analysis.records.map(r => r.sceneIdx), [0, 1, 2]);

    const [scene0, scene1, scene2] = locateIssues(
      [issue('Scene 0 (INT. KITCHEN)'), issue('Scene 1 (INT. GARAGE)'), issue('Scene 2 (EXT. HIGHWAY)')],
      THREE_SCENE_FOUNTAIN,
    );

    assert.equal(scene0.anchor, 'scene');
    assert.deepEqual([scene0.startLine, scene0.endLine], [1, 7]);

    assert.equal(scene1.anchor, 'scene');
    assert.deepEqual([scene1.startLine, scene1.endLine], [8, 14]);

    assert.equal(scene2.anchor, 'scene');
    // Last scene runs to EOF (17 lines total).
    assert.deepEqual([scene2.startLine, scene2.endLine], [15, 17]);
  });

  it('is case-insensitive on the "Scene" keyword', () => {
    const [located] = locateIssues([issue('scene 1 (INT. GARAGE)')], THREE_SCENE_FOUNTAIN);
    assert.equal(located.anchor, 'scene');
    assert.deepEqual([located.startLine, located.endLine], [8, 14]);
  });

  it('falls back to document for an out-of-range scene index', () => {
    const [located] = locateIssues([issue('Scene 99 (nonexistent)')], THREE_SCENE_FOUNTAIN);
    assert.equal(located.anchor, 'document');
    assert.equal(located.startLine, undefined);
    assert.equal(located.endLine, undefined);
  });

  it('does not mistake a plural "Scenes N-M" range for a single scene anchor', () => {
    const [located] = locateIssues([issue('Scenes 0-2 (whole script)')], THREE_SCENE_FOUNTAIN);
    assert.equal(located.anchor, 'document');
  });

  it('resolves "Scene 0" against a headingless single-implicit-scene document', () => {
    const headingless = 'Just some action.\n\nCHARACTER\nHello there, how are you.';
    const analysis = analyzeFountainText(headingless);
    assert.equal(analysis.sceneCount, 1);

    const [located] = locateIssues([issue('Scene 0')], headingless);
    assert.equal(located.anchor, 'scene');
    assert.equal(located.startLine, 1);
    assert.equal(located.endLine, 4);
  });
});

describe('locateIssues — lines anchor', () => {
  it('resolves an explicit "Lines N-M" range verbatim', () => {
    const [located] = locateIssues([issue('Lines 3-4')], THREE_SCENE_FOUNTAIN);
    assert.equal(located.anchor, 'lines');
    assert.deepEqual([located.startLine, located.endLine], [3, 4]);
  });

  it('resolves a singular "Line N" to a one-line span', () => {
    const [located] = locateIssues([issue('Line 5')], THREE_SCENE_FOUNTAIN);
    assert.equal(located.anchor, 'lines');
    assert.deepEqual([located.startLine, located.endLine], [5, 5]);
  });

  it('clamps an out-of-bounds line range to the document length', () => {
    const [located] = locateIssues([issue('Lines 900-905')], THREE_SCENE_FOUNTAIN);
    assert.equal(located.anchor, 'lines');
    // THREE_SCENE_FOUNTAIN is 17 lines long.
    assert.deepEqual([located.startLine, located.endLine], [17, 17]);
  });
});

describe('locateIssues — character anchor', () => {
  it('resolves "Character: NAME" to that character\'s first speaking line', () => {
    const [located] = locateIssues([issue('Character: SARAH')], THREE_SCENE_FOUNTAIN);
    assert.equal(located.anchor, 'character');
    assert.deepEqual([located.startLine, located.endLine], [5, 5]);
  });

  it('resolves a bare all-caps character-cue location to the same first line', () => {
    const [located] = locateIssues([issue('JOHN')], THREE_SCENE_FOUNTAIN);
    assert.equal(located.anchor, 'character');
    assert.deepEqual([located.startLine, located.endLine], [12, 12]);
  });

  it('is case-insensitive on the "Character:" prefix and the name itself', () => {
    const [located] = locateIssues([issue('character: sarah')], THREE_SCENE_FOUNTAIN);
    assert.equal(located.anchor, 'character');
    assert.equal(located.startLine, 5);
  });

  it('falls back to document for a character who never speaks', () => {
    const [located] = locateIssues([issue('Character: NOBODY')], THREE_SCENE_FOUNTAIN);
    assert.equal(located.anchor, 'document');
    assert.equal(located.startLine, undefined);
  });
});

describe('locateIssues — document fallback', () => {
  it('anchors act-level/thematic locations to document with no line span', () => {
    const [located] = locateIssues([issue('Act 1 pacing')], THREE_SCENE_FOUNTAIN);
    assert.equal(located.anchor, 'document');
    assert.equal(located.startLine, undefined);
    assert.equal(located.endLine, undefined);
  });

  it('does not mistake an all-caps act-level location for a character cue', () => {
    const [located] = locateIssues([issue('ACT ONE')], THREE_SCENE_FOUNTAIN);
    assert.equal(located.anchor, 'document');
  });

  it('preserves the original issue and pass alongside the resolved anchor', () => {
    const [located] = locateIssues(
      [issue('Act 1 pacing', { rule: 'PACING_FLAT', severity: 'major' }, 'pacing')],
      THREE_SCENE_FOUNTAIN,
    );
    assert.equal(located.pass, 'pacing');
    assert.equal(located.issue.rule, 'PACING_FLAT');
    assert.equal(located.issue.severity, 'major');
  });
});

describe('locateIssues — determinism', () => {
  it('produces identical output across two calls on the same input', () => {
    const issues = [
      issue('Scene 1 (INT. GARAGE)'),
      issue('Lines 3-4'),
      issue('Character: SARAH'),
      issue('Act 1 pacing'),
      issue('Scene 99'),
    ];
    const first = locateIssues(issues, THREE_SCENE_FOUNTAIN);
    const second = locateIssues(issues, THREE_SCENE_FOUNTAIN);
    assert.deepEqual(first, second);
  });

  it('treats whitespace-only fountain the same way analyzeFountainText treats it (zero scenes)', () => {
    const analysis = analyzeFountainText('   \n  ');
    assert.equal(analysis.sceneCount, 0);

    const [located] = locateIssues([issue('Scene 0')], '   \n  ');
    assert.equal(located.anchor, 'document');
  });
});
