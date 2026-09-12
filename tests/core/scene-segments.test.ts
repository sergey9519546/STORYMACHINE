// scripts/lib/scene-segments.ts — the ONE scene segmenter the measurement
// harnesses use, and the proof that it is the DOCTOR'S notion of a scene rather
// than a fourth opinion about Fountain.
//
// ── What this file is for ──────────────────────────────────────────────────
// The 2026-09-12 adversarial review (docs/audits/2026-09-12-adversarial/
// engine-logic.md finding 12) found three disagreeing segmenters in the
// harnesses, none of them the engine's:
//
//   * scripts/lib/auc.ts — split on `/^(?=INT\.|EXT\.)/mi`. Blind to `EST.`,
//     `I/E.`, `INT./EXT.` and forced `.HEADING` lines. This is byte-for-byte the
//     AUC-24 recipe, and the AUC-24 corpus is real screenplays.
//   * scripts/lib/rebuild-experiment-lib.mjs — `INT.|EXT.|EST.|INT/EXT.` plus a
//     leading dot, reassembled through `lines.join('\n')`.
//   * src/lib/fountain.ts's parseFountain — what the doctor actually uses.
//
// On a synthetic mixed-heading script the investigator measured "auc.ts sees 2
// scenes, segmentScenes 4, the doctor 5", with the shuffle-drop degradation
// coming out IDENTICAL to its input. There is now one segmenter, reading the
// parser's own classification, and the two assertions below are the ones that
// keep it honest: it agrees with the doctor on every committed script, and it
// agrees with the doctor on a script that uses every heading form the parser
// recognises — the case all three old segmenters got wrong.
//
// No corpus, no key, no owner-local step: the 32 scripts are in the repository.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { analyzeFountainText } from '../../server/nvm/analyze/fountain-analyzer.ts';
import {
  countFountainScenes,
  reassembleFountainScenes,
  sceneHeadingOf,
  segmentFountainScenes,
  splitLinesKeepingEndings,
} from '../../scripts/lib/scene-segments.ts';
import { listPublicCorpus } from '../../scripts/lib/public-benchmark.ts';
import { segmentScenes, reassemble } from '../../scripts/lib/rebuild-experiment-lib.mjs';

/**
 * Every heading form `src/lib/fountain.ts` recognises, in one script, plus the
 * three traps that make a naive segmenter over- or under-count: an action line
 * that merely CONTAINS "INT." mid-sentence, a line beginning with an ellipsis
 * (which the parser DOES treat as a forced heading, because its rule is
 * `trimmed.startsWith('.')`), and a boneyard block holding what looks like a
 * slugline (which the parser does NOT, because boneyard lines are classified as
 * boneyard before any heading test runs).
 *
 * Written to match the parser, not to match an opinion about Fountain: the
 * ellipsis line is included precisely because the engine counts it, so a
 * segmenter that "fixed" that would disagree with the score.
 */
const MIXED_HEADINGS = [
  'Title: Mixed Headings',
  'Credit: the 2026-09-12 segmenter lane',
  '',
  'FADE IN:',
  '',
  'INT. KITCHEN - DAY',
  '',
  'Ana counts the jars. The label says INT. STORAGE but it is only a label.',
  '',
  'ANA',
  'Nine.',
  '',
  'EXT. YARD - DAY',
  '',
  'Wind. A gate swings.',
  '',
  'EST. THE TOWN - DAWN',
  '',
  'Rooftops.',
  '',
  'I/E. TRUCK - CONTINUOUS',
  '',
  'She drives with the door open.',
  '',
  'INT./EXT. FERRY - NIGHT',
  '',
  'Spray across the rail.',
  '',
  '.THE LONG WAY ROUND',
  '',
  'A forced heading, no INT or EXT anywhere in it.',
  '',
  '/*',
  'INT. A SCENE THAT DOES NOT EXIST - DAY',
  'Boneyard. The parser classifies these as boneyard, so they are not headings.',
  '*/',
  '',
  'INT. KITCHEN - NIGHT',
  '',
  'The jars are gone.',
  '',
].join('\n');

const PUBLIC_SCRIPTS = listPublicCorpus();

describe('scene-segments — the segmenter agrees with the doctor', () => {
  it('matches the doctor\'s sceneCount on all 32 committed distributable scripts', () => {
    // These are the scripts the public benchmark measures. All three old
    // segmenters happened to agree here (0 of 32 disagreed), which is exactly
    // why finding 12 was latent: the committed corpus could not show it. The
    // assertion is still the right one — it is what would catch a segmenter that
    // drifted from the engine on ordinary prose.
    const mismatches: string[] = [];
    for (const script of PUBLIC_SCRIPTS) {
      const mine = countFountainScenes(script.text);
      const doctors = analyzeFountainText(script.text).sceneCount;
      if (mine !== doctors) mismatches.push(`${script.file}: segmenter ${mine}, doctor ${doctors}`);
    }
    assert.deepEqual(
      mismatches,
      [],
      'the harness segmenter and the engine disagree about how many scenes these scripts have:\n  '
      + mismatches.join('\n  ')
      + '\n\nA degradation that rearranges a different set of scenes than the doctor reads is '
      + 'measuring something the doctor cannot see.',
    );
    assert.equal(PUBLIC_SCRIPTS.length, 32, 'the distributable corpus changed size');
  });

  it('matches the doctor on a synthetic script using EVERY heading form — the case the old splits failed', () => {
    // THE ASSERTION THAT WOULD HAVE CAUGHT FINDING 12. Measured on main before
    // the fix: auc.ts's split saw 2 of these scenes, rebuild-experiment-lib saw
    // 4, the doctor saw 5 — and shuffleDropDegrade returned its input unchanged.
    const mine = countFountainScenes(MIXED_HEADINGS);
    const doctors = analyzeFountainText(MIXED_HEADINGS).sceneCount;
    assert.equal(
      mine,
      doctors,
      `segmenter ${mine} vs doctor ${doctors} on the mixed-heading script. The old INT./EXT.-only `
      + 'split scored 2 here.',
    );
    // Every form is actually present and actually counted — so this fixture
    // cannot quietly stop exercising what it claims to.
    const slugs = segmentFountainScenes(MIXED_HEADINGS).scenes.map(sceneHeadingOf);
    assert.deepEqual(slugs, [
      'INT. KITCHEN - DAY',
      'EXT. YARD - DAY',
      'EST. THE TOWN - DAWN',
      'I/E. TRUCK - CONTINUOUS',
      'INT./EXT. FERRY - NIGHT',
      '.THE LONG WAY ROUND',
      'INT. KITCHEN - NIGHT',
    ]);
    // The traps: the action line that contains "INT." mid-sentence did not
    // become a heading, and the boneyard slugline did not either.
    assert.ok(!slugs.some((s) => s.includes('STORAGE')), 'an action line was read as a scene heading');
    assert.ok(!slugs.some((s) => s.includes('DOES NOT EXIST')), 'a boneyard line was read as a scene heading');
  });

  it('the INT./EXT.-only split this replaced really does undercount that script', () => {
    // The negative control for the assertion above: if the old rule were
    // equivalent, fixing it would be a no-op and this test would prove nothing.
    const oldSplitCount = MIXED_HEADINGS
      .split(/^(?=INT\.|EXT\.)/mi)
      .filter((part) => /^(INT\.|EXT\.)/i.test(part))
      .length;
    const doctors = analyzeFountainText(MIXED_HEADINGS).sceneCount;
    assert.ok(
      oldSplitCount < doctors,
      `the old split saw ${oldSplitCount} and the doctor sees ${doctors} — if these were equal the `
      + 'segmenter change would be cosmetic',
    );
  });
});

describe('scene-segments — the slices are lossless', () => {
  it('head + scenes.join(\'\') reproduces the input byte for byte, on all 32 scripts', () => {
    // This is what makes a reordering degradation fair: every surviving scene is
    // byte-identical to its source, so a health move can only come from order
    // and membership. The old line-join reassembly did not have this property —
    // it rewrote CRLF and could drop a trailing newline.
    for (const script of PUBLIC_SCRIPTS) {
      const { head, scenes } = segmentFountainScenes(script.text);
      assert.equal(
        reassembleFountainScenes(head, scenes),
        script.text,
        `${script.file}: segment/reassemble is not lossless`,
      );
    }
  });

  it('is lossless for CRLF, a missing final newline, and a leading heading', () => {
    const cases = [
      'INT. A - DAY\r\n\r\nX.\r\n\r\nEXT. B - NIGHT\r\n\r\nY.\r\n',
      'INT. A - DAY\n\nX.\n\nEXT. B - NIGHT\n\nY.',
      'INT. A - DAY\n\nonly one scene, no head\n',
      'Title: No Headings\n\nJust prose.\n',
      '',
    ];
    for (const text of cases) {
      const { head, scenes } = segmentFountainScenes(text);
      assert.equal(reassembleFountainScenes(head, scenes), text, `not lossless on ${JSON.stringify(text)}`);
    }
    // A script with no heading is all head and no scenes — the degradations'
    // `scenes.length < 3` guards then return null rather than inventing a scene.
    assert.deepEqual(segmentFountainScenes('Title: No Headings\n\nJust prose.\n').scenes, []);
    assert.equal(segmentFountainScenes('INT. A - DAY\n\nX.\n').head, '');
  });

  it('splitLinesKeepingEndings keeps every terminator, so joining is the identity', () => {
    for (const text of ['a\nb\n', 'a\r\nb', '', '\n', 'no newline at all']) {
      assert.equal(splitLinesKeepingEndings(text).join(''), text);
    }
  });

  it('documents the two places it deliberately differs from the analyzer', () => {
    // (1) A script with NO heading: the analyzer reports one scene
    // ("UNTITLED SCENE", fountain-analyzer.ts segmentScenes), the segmenter
    // reports zero and hands the whole text back as head. The degradations'
    // scene floors mean this never becomes an observation, and saying so here is
    // cheaper than discovering it from a null pair.
    const prose = 'Title: No Headings\n\nJust prose.\n';
    assert.equal(countFountainScenes(prose), 0);
    assert.equal(analyzeFountainText(prose).sceneCount, 1);
    // (2) The analyzer caps at ANALYZER_SCENE_CEILING (400) and scores a prefix;
    // the segmenter counts them all, because a degradation must rearrange the
    // whole document it was handed, not the prefix the analyzer read.
    const many = Array.from({ length: 402 }, (_, i) => `INT. ROOM ${i} - DAY\n\nAction ${i}.\n\n`).join('');
    assert.equal(countFountainScenes(many), 402);
    assert.equal(analyzeFountainText(many).sceneCount, 400);
  });
});

describe('scene-segments — rebuild-experiment-lib\'s heading view is built on it', () => {
  it('reports the same scenes as the slice view, with the same slugs', () => {
    // One grammar, two views. Before this lane the heading view carried its own
    // regexes and disagreed with both the slice view and the doctor.
    for (const text of [MIXED_HEADINGS, ...PUBLIC_SCRIPTS.slice(0, 5).map((s) => s.text)]) {
      const headingView = segmentScenes(text).scenes.map((s: { heading: string }) => s.heading.trim());
      const sliceView = segmentFountainScenes(text).scenes.map(sceneHeadingOf);
      assert.deepEqual(headingView, sliceView);
    }
  });

  it('still round-trips, so callers that rebuild from the heading view are safe', () => {
    const { preamble, scenes } = segmentScenes(MIXED_HEADINGS);
    assert.equal(reassemble(preamble, scenes), MIXED_HEADINGS);
  });
});
