// Script Doctor — tests for locate.ts, the "resolve a RevisionIssue.location
// string to a concrete line span" bridge module. Conventions: node:test +
// assert/strict, matching tests/core/fountain-analyzer.test.ts and
// tests/passes/*.test.ts.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { locateIssues } from '../../server/nvm/analyze/locate.ts';
import { analyzeFountainText } from '../../server/nvm/analyze/fountain-analyzer.ts';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';
import { REFERENCE_CORPUS } from '../../server/nvm/analyze/calibration/corpus.ts';
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
  // Scene labels are 1-based post-migration (the writer-facing "Scene 1" is
  // the first scene / sceneIdx 0) — fixtures below use the 1-based label for
  // whichever physical scene the test means; SCENE_RE's own "-1" decode maps
  // it back to the 0-based sceneSpans index.
  it('resolves "Scene N" to the exact 1-based span fountain-analyzer.ts assigns that scene', () => {
    // Sanity check the fixture against the real analyzer first — this test is
    // only meaningful if the scene indices genuinely line up.
    const analysis = analyzeFountainText(THREE_SCENE_FOUNTAIN);
    assert.equal(analysis.sceneCount, 3);
    assert.deepEqual(analysis.records.map(r => r.sceneIdx), [0, 1, 2]);

    const [scene0, scene1, scene2] = locateIssues(
      [issue('Scene 1 (INT. KITCHEN)'), issue('Scene 2 (INT. GARAGE)'), issue('Scene 3 (EXT. HIGHWAY)')],
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
    const [located] = locateIssues([issue('scene 2 (INT. GARAGE)')], THREE_SCENE_FOUNTAIN);
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

  it('resolves "Scene 1" against a headingless single-implicit-scene document', () => {
    const headingless = 'Just some action.\n\nCHARACTER\nHello there, how are you.';
    const analysis = analyzeFountainText(headingless);
    assert.equal(analysis.sceneCount, 1);

    const [located] = locateIssues([issue('Scene 1')], headingless);
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

// ── Scene-range grammar (lane A1, 2026-09-03) ───────────────────────────────
// Eight scenes of exactly four lines each (heading, blank, action, blank), so
// every span in the assertions below is hand-checkable: scene i (0-based) runs
// lines 4i+1 .. 4i+4, and the last scene runs to EOF (line 32). Cross-checked
// against the real analyzer in the first test, exactly as THREE_SCENE_FOUNTAIN
// is above — the point of these tests is that the grammar agrees with
// fountain-analyzer.ts's scene indices, not that it agrees with itself.
const EIGHT_SCENE_FOUNTAIN = [
  'INT. ONE - DAY', '', 'A door opens.', '',            //  1– 4  scene 1
  'INT. TWO - DAY', '', 'A door closes.', '',           //  5– 8  scene 2
  'INT. THREE - DAY', '', 'Rain starts.', '',           //  9–12  scene 3
  'INT. FOUR - DAY', '', 'Rain stops.', '',             // 13–16  scene 4
  'INT. FIVE - DAY', '', 'A phone rings.', '',          // 17–20  scene 5
  'INT. SIX - DAY', '', 'Nobody answers.', '',          // 21–24  scene 6
  'INT. SEVEN - DAY', '', 'A car leaves.', '',          // 25–28  scene 7
  'INT. EIGHT - DAY', '', 'The lights go out.', '',     // 29–32  scene 8
].join('\n');

describe('locateIssues — scene ranges', () => {
  it('agrees with fountain-analyzer.ts about the fixture it measures against', () => {
    const analysis = analyzeFountainText(EIGHT_SCENE_FOUNTAIN);
    assert.equal(analysis.sceneCount, 8);
    assert.equal(EIGHT_SCENE_FOUNTAIN.split('\n').length, 32);
  });

  it('resolves a bare "Scenes N–M" range to the first scene\'s start through the last scene\'s end', () => {
    const [located] = locateIssues([issue('Scenes 3–5')], EIGHT_SCENE_FOUNTAIN);
    assert.equal(located.anchor, 'scene');
    assert.deepEqual([located.startLine, located.endLine], [9, 20]);
  });

  it('resolves a range embedded in an act label ("Act 3 (Scenes 7–8)")', () => {
    const [located] = locateIssues([issue('Act 3 (Scenes 7–8)')], EIGHT_SCENE_FOUNTAIN);
    assert.equal(located.anchor, 'scene');
    assert.deepEqual([located.startLine, located.endLine], [25, 32]);
  });

  it('resolves a lower-case, parenthesised zone label ("Climax zone (scenes 6–8)")', () => {
    const [located] = locateIssues([issue('Climax zone (scenes 6–8)')], EIGHT_SCENE_FOUNTAIN);
    assert.equal(located.anchor, 'scene');
    assert.deepEqual([located.startLine, located.endLine], [21, 32]);
  });

  it('resolves the "Opening scenes (N–M)" shape, where the paren follows the word', () => {
    const [located] = locateIssues([issue('Opening scenes (1–3) — no tension')], EIGHT_SCENE_FOUNTAIN);
    assert.equal(located.anchor, 'scene');
    assert.deepEqual([located.startLine, located.endLine], [1, 12]);
  });

  it('accepts an ASCII hyphen as well as an en dash', () => {
    const [located] = locateIssues([issue('Scenes 2-4')], EIGHT_SCENE_FOUNTAIN);
    assert.equal(located.anchor, 'scene');
    assert.deepEqual([located.startLine, located.endLine], [5, 16]);
  });

  it('resolves an open-ended "Scenes N+" range to the end of the script', () => {
    const [located] = locateIssues(
      [issue('Final quarter (Scenes 7+) — curiosity flatline')],
      EIGHT_SCENE_FOUNTAIN,
    );
    assert.equal(located.anchor, 'scene');
    assert.deepEqual([located.startLine, located.endLine], [25, 32]);
  });

  it('resolves an approximate "Scene ~N" to that one scene', () => {
    const [located] = locateIssues([issue('End of Act 2 (Scene ~6)')], EIGHT_SCENE_FOUNTAIN);
    assert.equal(located.anchor, 'scene');
    assert.deepEqual([located.startLine, located.endLine], [21, 24]);
  });

  it('clamps a range that overshoots the end but keeps an out-of-range START on document', () => {
    const [over] = locateIssues([issue('Act 3 (Scenes 7–14)')], EIGHT_SCENE_FOUNTAIN);
    assert.equal(over.anchor, 'scene');
    assert.deepEqual([over.startLine, over.endLine], [25, 32]);

    const [past] = locateIssues([issue('Scenes 11–14')], EIGHT_SCENE_FOUNTAIN);
    assert.equal(past.anchor, 'document');
    assert.equal(past.startLine, undefined);
  });

  it('keeps the single-scene form resolving to the identical span it always did', () => {
    const [located] = locateIssues([issue('Scene 4 (INT. FOUR)')], EIGHT_SCENE_FOUNTAIN);
    assert.equal(located.anchor, 'scene');
    assert.deepEqual([located.startLine, located.endLine], [13, 16]);
  });

  it('does NOT read a scene COUNT as a scene POSITION', () => {
    // Every one of these is a real location string from the 2026-09-03
    // fixture capture. Each puts a number BEFORE the word "scene(s)", where it
    // means a length or a window size — never a position — so each must stay
    // on the document tier.
    const counts = [
      'longest stretch with no clue seeded: 6 consecutive scenes',
      '2 heavy clue-debt scene(s) — no curiosity rise within 2 scenes of any',
      'Act 1 (2 scenes) vs Act 3 (3 scenes)',
      'Revelation distribution — longest revelation-free run: 7 scenes',
      'Consecutive curiosity scenes — run of 6',
    ];
    for (const location of counts) {
      const [located] = locateIssues([issue(location)], EIGHT_SCENE_FOUNTAIN);
      assert.equal(located.anchor, 'document', `expected document tier for ${JSON.stringify(location)}`);
      assert.equal(located.startLine, undefined);
    }
  });
});

describe('locateIssues — structural zones stated as percentages', () => {
  // The expected spans below are the passes' OWN arithmetic on n = 8:
  // intention.ts's quarters are Math.floor((i / 8) * 4), so Act 1 = scenes
  // 0–1, Act 2a = 2–3, Act 2b = 4–5, Act 3 = 6–7; structure.ts's thirds are
  // sceneIdx >= 8*0.25 && < 8*0.75, so Act 2 = scenes 2–5.
  it('resolves each quarter to exactly the scenes that quarter contains', () => {
    const cases: Array<[string, number, number]> = [
      ['Act 1 (0–25%)', 1, 8],
      ['Act 2a (25–50%)', 9, 16],
      ['Act 2b (50–75%)', 17, 24],
      ['Act 3 (75–100%)', 25, 32],
    ];
    for (const [location, startLine, endLine] of cases) {
      const [located] = locateIssues([issue(location)], EIGHT_SCENE_FOUNTAIN);
      assert.equal(located.anchor, 'scene', `expected a scene anchor for ${location}`);
      assert.deepEqual([located.startLine, located.endLine], [startLine, endLine], location);
    }
  });

  it('resolves the three-act partition and a leading-% spelling', () => {
    const [act2] = locateIssues([issue('Act 2 (25%–75%)')], EIGHT_SCENE_FOUNTAIN);
    assert.equal(act2.anchor, 'scene');
    assert.deepEqual([act2.startLine, act2.endLine], [9, 24]);

    const [act1] = locateIssues([issue('Act 1 (0%–25%)')], EIGHT_SCENE_FOUNTAIN);
    assert.equal(act1.anchor, 'scene');
    assert.deepEqual([act1.startLine, act1.endLine], [1, 8]);
  });

  it('anchors a multi-zone location to the FIRST zone it names — the deficient one', () => {
    // Verbatim from the fixture capture (PROACTIVE_ZONE_IMBALANCE and its
    // siblings): the empty zones are named first, the bloated one last.
    const [located] = locateIssues(
      [issue('Act 2a (25–50%), Act 3 (75–100%) empty; Act 1 (0–25%) has 2/4 stakes-raising scenes')],
      EIGHT_SCENE_FOUNTAIN,
    );
    assert.equal(located.anchor, 'scene');
    assert.deepEqual([located.startLine, located.endLine], [9, 16], 'expected the Act 2a span, not Act 1');
  });

  it('leaves an act label with no percentage window on the document tier', () => {
    for (const location of ['Act 1 pacing', 'Act 1 relationships', 'Mid-story conflict', 'Overall structure']) {
      const [located] = locateIssues([issue(location)], EIGHT_SCENE_FOUNTAIN);
      assert.equal(located.anchor, 'document', location);
    }
  });

  it('does not mistake a parenthesised non-percentage range for a zone', () => {
    const [located] = locateIssues(
      [issue('opening 25% of action lines (first 5 of 21): no medium-length lines (5–11 words)')],
      EIGHT_SCENE_FOUNTAIN,
    );
    assert.equal(located.anchor, 'document');
  });

  it('falls back to document when the window contains no whole scene', () => {
    // 25–50% of a 3-scene script: ceil(3*0.25) = 1, ceil(3*0.5) - 1 = 1 — one
    // scene, so it DOES resolve. 75–100% of a 1-scene script resolves to that
    // scene. The empty case needs a zero-scene document.
    const [located] = locateIssues([issue('Act 2a (25–50%)')], '   \n  ');
    assert.equal(located.anchor, 'document');
  });
});

describe('locateIssues — document-anchor share on the calibration corpus', () => {
  // Regression guard for the whole point of the range grammar. Measured over
  // all 20 REFERENCE_CORPUS samples through the real doctor, 2026-09-03:
  //   before this lane: 1728 / 2191 issues on the document tier = 78.87%
  //   after  this lane:  923 / 2191                             = 42.13%
  // The 60% ceiling below sits between the two with room on both sides: the
  // pre-lane grammar fails it by 19 points, and the current grammar clears it
  // by 18, so ordinary pass churn cannot flip the result either way. It is a
  // CEILING, not a target — a future lane that anchors more is welcome to
  // tighten it, and none of the four range forms may be removed without this
  // failing first.
  it('keeps the share of unanchored findings below 60% across all 20 corpus samples', async () => {
    let total = 0;
    let documentTier = 0;
    for (const sample of REFERENCE_CORPUS) {
      const report = await runScriptDoctor(sample.fountain);
      const issuesWithPass = report.passes.flatMap(p => p.issues.map(i => ({ ...i, pass: p.pass })));
      for (const located of locateIssues(issuesWithPass, sample.fountain)) {
        total++;
        if (located.anchor === 'document') documentTier++;
      }
    }
    assert.ok(total > 0, 'sanity: the corpus must produce issues to measure');
    const share = documentTier / total;
    assert.ok(
      share < 0.60,
      `document-anchor share ${(share * 100).toFixed(2)}% (${documentTier}/${total}) must stay below 60%`,
    );
  });
});

describe('locateIssues — determinism', () => {
  // Scene labels are 1-based post-migration — see the "scene anchor" describe
  // above for the decode rule; fixtures here follow the same convention.
  it('produces identical output across two calls on the same input', () => {
    const issues = [
      issue('Scene 2 (INT. GARAGE)'),
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

    const [located] = locateIssues([issue('Scene 1')], '   \n  ');
    assert.equal(located.anchor, 'document');
  });
});
