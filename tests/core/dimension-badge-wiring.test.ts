// The Craft Dimensions badge must be rendered through the shared, GATED copy.
//
// ── The defect (2026-09-12 adversarial audit, findings #4 and #14) ──────────
//
// `src/components/scriptide/ScriptDoctorPanel.tsx` rendered
// `{percentileBand(dim.percentile)}` — the UNGATED band — for each of the five
// dimension badges, while the headline health percentile 227 lines above went
// through the gated `percentileSentenceFor`. One scrolling report therefore said
// "Health percentile: not comparable — this draft is outside the bounds of the
// hand-authored synthetic reference set" and, further down, "STRUCTURE & PACING
// TOP 10% · CHARACTER TOP 10% · DIALOGUE & VOICE TOP 10% · PLOT LOGIC & PAYOFF
// TOP 10% · THEME & ORIGINALITY TOP 10%". And `percentileBand(20)` returns "top
// 80%", which reads as praise on a bottom-quartile dimension.
//
// This file is SOURCE-ONLY and imports nothing new, so it RUNS — and fails — on
// the unfixed tree. The functions' own behaviour is covered by
// tests/core/dimension-percentile-badge.test.ts.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('ScriptDoctorPanel renders the shared functions, not its own copy', () => {
  const panel = readFileSync(
    path.resolve(import.meta.dirname, '../../src/components/scriptide/ScriptDoctorPanel.tsx'),
    'utf8',
  );

  it('imports all three', () => {
    assert.match(
      panel,
      /dimensionPercentileBadgeFor, dimensionPercentileTooltipFor, dimensionPercentileCaptionFor,/,
    );
  });

  it('no longer calls the ungated percentileBand for a dimension badge', () => {
    assert.doesNotMatch(panel, /\{percentileBand\(dim\.percentile\)\}/);
    assert.match(panel, /\{dimensionPercentileBadgeFor\(/);
    assert.match(panel, /title=\{dimensionPercentileTooltipFor\(/);
  });

  it('passes the draft\'s OWN scene and word counts into the gate', () => {
    const badge = panel.slice(
      panel.indexOf('data-dimension-percentile-caption'),
      panel.indexOf('aria-label={`${dim.label} score`}'),
    );
    assert.ok(badge.length > 0, 'the Craft Dimensions badge block was not found');
    assert.equal(
      (badge.match(/report\.sceneCount,\s*\n\s*report\.wordCount,/g) ?? []).length,
      2,
      'both the badge and its tooltip must be gated on this report\'s own counts',
    );
    assert.match(panel, /\{dimensionPercentileCaptionFor\(report\.sceneCount, report\.wordCount\)\}/);
  });
});
