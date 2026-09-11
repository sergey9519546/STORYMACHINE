// The health percentile reads 100 for every real draft — and the fix has to hold
// on EVERY surface at once.
//
// ── The defect (2026-09-06 product discovery, #12) ──────────────────────────
//
// Every percentile in this product is a rank against the calibration reference
// set: twenty hand-authored samples of 9-10 scenes and 256-337 words each, a band
// the corpus's own header explains is deliberate (controlled richness, so craft is
// the only variable). A real screenplay is four to sixty times longer, lands at
// the top of that distribution for being longer, and the number stops being a
// reading about craft.
//
// ── The defect the FIRST fix introduced, which this file exists to pin ──────
//
// The gate was applied per surface, and one surface applied half of it — the
// scene count only. data/screenplays/runoff.fountain is 9 scenes (INSIDE the band)
// and 1,448 words (four times over it), so it read "top 30%" in the Versions list
// and "not comparable" everywhere else, for one draft, in one session.
//
// So: ONE function, symmetric over both dimensions, and these tests drive the
// REAL runoff report through every renderer that shows the number.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  percentileIsComparable, percentileSentenceFor, compactPercentileNoteFor,
  exactRankTooltipFor, percentileCellFor, healthPercentileSentence,
  notComparableSentence, compactNotComparableNote, percentileBand,
} from '../../src/lib/percentile-copy.ts';
import { renderCoverageHtml } from '../../server/lib/coverage-html.ts';
import { renderCoverageLetter } from '../../server/lib/coverage-letter.ts';
import { buildReaderTier } from '../../server/lib/reader-tier.ts';
import { buildSlateEntry, rankSlate, renderSlateHtml } from '../../server/lib/slate.ts';
import { snapshotTrend } from '../../src/lib/snapshot-trend.ts';
import { SnapshotSchema } from '../../server/lib/validation.ts';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';
import type { Snapshot } from '../../src/components/scriptide/SnapshotManager.tsx';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RUNOFF = readFileSync(path.join(REPO_ROOT, 'data/screenplays/runoff.fountain'), 'utf8');

describe('runoff.fountain — the fixture the asymmetry was found on', () => {
  it('is 9 scenes (inside the reference band) and far over its word ceiling', async () => {
    const report = await runScriptDoctor(RUNOFF);
    assert.equal(report.sceneCount, 9, 'the scene count is INSIDE the reference band');
    assert.ok(report.wordCount > 337 * 3, `${report.wordCount} words must be far over the band`);
    // The exact shape that made a scene-count-only gate say "comparable".
    assert.equal(percentileIsComparable(report.sceneCount, undefined), false);
    assert.equal(percentileIsComparable(report.sceneCount, report.wordCount), false);
  });

  it('reads NOT COMPARABLE on every renderer that shows the number', async () => {
    const report = await runScriptDoctor(RUNOFF);
    assert.equal(typeof report.healthPercentile, 'number', 'sanity: runoff is scored and ranked');
    const expectedSentence = notComparableSentence();

    // 1. the producer tier
    const tier = buildReaderTier(report, { fountain: RUNOFF });
    assert.equal(tier.percentileLine, expectedSentence);

    // 2. the exported coverage HTML (both the tier and the health section)
    const html = renderCoverageHtml(report, 'Runoff', { fountain: RUNOFF });
    assert.ok(html.includes(expectedSentence));
    assert.ok(!html.includes(healthPercentileSentence(report.healthPercentile!)));
    assert.ok(!html.includes('Exact rank:'), 'no exact ordinal against a set it cannot be compared to');

    // 3. the coverage letter, in both renderings
    const letter = renderCoverageLetter(report, { title: 'Runoff', fountain: RUNOFF });
    assert.ok(letter.markdown.includes(expectedSentence));
    assert.ok(letter.text.includes(expectedSentence));

    // 4. the exported slate table
    const slateHtml = renderSlateHtml(
      rankSlate([buildSlateEntry('Runoff', report, report.contentHash ?? 'hash')]), 0,
    );
    assert.ok(slateHtml.includes('not comparable'), 'the slate cell must say so too');
    assert.ok(!/\d+th pct/.test(slateHtml), 'and must not render the old hardcoded-"th" ordinal');

    // 5. the Versions list, through the real snapshot -> trend path
    const snapshot: Snapshot = {
      id: 's1', name: 'v1', text: RUNOFF, date: '2026-09-11',
      health: report.health, verdict: report.verdict, sceneCount: report.sceneCount,
      wordCount: report.wordCount, healthPercentile: report.healthPercentile,
    };
    const [entry] = snapshotTrend([snapshot]);
    assert.equal(entry.wordCount, report.wordCount, 'the trend entry carries the word count');
    assert.equal(
      compactPercentileNoteFor(entry.healthPercentile!, entry.sceneCount, entry.wordCount),
      compactNotComparableNote(),
      'the Versions row must read not comparable — this is the exact cell that read "top 30%"',
    );
    assert.equal(exactRankTooltipFor(entry.healthPercentile!, entry.sceneCount, entry.wordCount), undefined);
  });
});

describe('an in-band draft still gets a real reading — the gate is not a blanket off switch', () => {
  it('every helper returns the band form for a sample-shaped draft', () => {
    assert.equal(percentileSentenceFor(42, 10, 300), healthPercentileSentence(42));
    assert.equal(compactPercentileNoteFor(42, 10, 300), `top 60% of a 20-sample, hand-authored synthetic reference set`);
    assert.equal(percentileCellFor(42, 10, 300), percentileBand(42));
    assert.ok(exactRankTooltipFor(42, 10, 300)?.startsWith('Exact rank:'));
  });
});

describe('legacy snapshots — absent wordCount degrades to not comparable, never to a stale band', () => {
  it('a snapshot saved before the field existed carries null and reads not comparable', () => {
    const legacy = {
      id: 's0', name: 'old', text: 'INT. ROOM - DAY\n\nAction.', date: '2026-08-01',
      health: 70, sceneCount: 10, healthPercentile: 90,
    } as Snapshot;
    const [entry] = snapshotTrend([legacy]);
    assert.equal(entry.wordCount, null, 'absent means null, not 0');
    assert.equal(
      compactPercentileNoteFor(entry.healthPercentile!, entry.sceneCount, entry.wordCount),
      compactNotComparableNote(),
    );
  });

  it('the zod schema ACCEPTS an absent wordCount', () => {
    const parsed = SnapshotSchema.safeParse({ id: 'a', text: 'x', health: 70, sceneCount: 10 });
    assert.equal(parsed.success, true);
  });

  it('the zod schema REJECTS a malformed wordCount rather than storing it', () => {
    for (const bad of ['1200', -5, 12.5, null, {}, NaN]) {
      const parsed = SnapshotSchema.safeParse({ id: 'a', text: 'x', wordCount: bad });
      assert.equal(parsed.success, false, `wordCount ${JSON.stringify(bad)} must be rejected`);
    }
  });

  it('the zod schema accepts a well-formed one', () => {
    const parsed = SnapshotSchema.safeParse({ id: 'a', text: 'x', wordCount: 1448 });
    assert.equal(parsed.success, true);
  });
});

describe('no surface keeps its own comparability decision', () => {
  // Source-text proof, matching the convention of
  // tests/core/percentile-copy-consistency.test.ts: every percentile-showing
  // surface must call a gated helper, and none may call the raw band formatter for
  // the HEADLINE percentile. percentileBand itself stays legitimate for the
  // per-DIMENSION percentiles (ScriptDoctorPanel's dimension rows), which rank
  // against the same set's per-dimension distributions.
  const SURFACES: Array<[string, string]> = [
    ['server/lib/coverage-html.ts', 'percentileSentenceFor'],
    ['server/lib/coverage-letter.ts', 'percentileSentenceFor'],
    ['server/lib/reader-tier.ts', 'percentileSentenceFor'],
    ['server/lib/slate.ts', 'percentileCellFor'],
    ['src/components/SlatePanel.tsx', 'percentileCellFor'],
    ['src/components/WhatIfPanel.tsx', 'compactPercentileNoteFor'],
    ['src/components/scriptide/SnapshotManager.tsx', 'compactPercentileNoteFor'],
    ['src/components/scriptide/ScriptDoctorPanel.tsx', 'percentileSentenceFor'],
  ];

  for (const [file, expected] of SURFACES) {
    it(`${file} decides through ${expected}, not its own condition`, () => {
      const src = readFileSync(path.join(REPO_ROOT, file), 'utf8');
      assert.ok(src.includes(expected), `${file} must call ${expected}`);
      assert.ok(
        !/percentileIsComparable\(/.test(src),
        `${file} re-implements the comparability branch instead of calling the gated helper`,
      );
    });
  }
});
