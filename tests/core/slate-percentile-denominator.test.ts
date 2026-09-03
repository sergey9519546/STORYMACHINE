// Upgrade item #9 — percentile denominator disclosure. percentileDescriptor
// itself is templated in server/nvm/analyze/calibration/percentile.ts, which
// is always-scoring (calibration/**) and out of scope for this change to
// touch. Every place that DISPLAYS a percentile already named its 20-sample
// denominator except one: server/lib/slate.ts's renderSlateHtml (the Slate
// Triage HTML export) showed a bare "Nth pct" with no context on what it was
// ranked against — unlike ScriptDoctorPanel.tsx (which already captions
// "compare against the same 20-sample, hand-authored synthetic reference
// set" and tooltips "exact rank: Nth of 20 reference samples") and
// SlatePanel.tsx (already tooltips "Exact rank: Nth of 20 reference
// samples"). coverage-html.ts's buildDimensionsSection does not display a
// percentile at all, so there was nothing to fix there.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildSlateEntry, rankSlate, renderSlateHtml } from '../../server/lib/slate.ts';
import type { ScriptDoctorReport } from '../../server/nvm/analyze/types.ts';

function mkReport(over: Partial<ScriptDoctorReport>): ScriptDoctorReport {
  return {
    health: 50,
    grade: 'solid',
    totalIssues: 0,
    bySeverity: { critical: 0, major: 0, minor: 0 },
    passes: [],
    sceneHeatmap: [],
    topPriorities: [],
    structure: {} as ScriptDoctorReport['structure'],
    characters: [],
    sceneCount: 8,
    wordCount: 4000,
    dimensions: [],
    ...over,
  } as unknown as ScriptDoctorReport;
}

describe('slate.ts renderSlateHtml — percentile denominator is disclosed', () => {
  it('names the 20-sample reference set somewhere in the rendered page', () => {
    const entry = buildSlateEntry(
      'Strong Draft',
      mkReport({ health: 71, analysisComplete: true, healthPercentile: 80 }),
      'hash1',
    );
    const html = renderSlateHtml(rankSlate([entry]), 0);

    assert.match(html, /80th pct/, 'sanity: the percentile cell itself renders');
    assert.match(
      html, /20-sample/,
      'expected the rendered page to disclose the reference set size somewhere near the percentile',
    );
    assert.match(
      html, /not (against )?the other scripts in this slate/i,
      'expected the rendered page to clarify percentile is NOT ranked against the other slate entries',
    );
  });

  it('still renders an em-dash, not a bare percentile, for an entry with no healthPercentile', () => {
    const entry = buildSlateEntry('No Percentile', mkReport({ health: 40, analysisComplete: true }), 'hash2');
    const html = renderSlateHtml(rankSlate([entry]), 0);
    assert.doesNotMatch(html, /\d+th pct/);
  });
});
