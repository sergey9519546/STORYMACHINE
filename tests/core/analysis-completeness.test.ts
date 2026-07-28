// Whole-draft analysis truth contract. A report can be computationally valid
// for the prefix it examined while still being unsafe to present as a score,
// verdict, ranking, export, or AI-fix baseline for the writer's full draft.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isWholeDraftAnalysisComplete } from '../../server/lib/analysis-completeness.ts';

describe('isWholeDraftAnalysisComplete', () => {
  it('accepts an explicitly complete, non-truncated report with no failed passes', () => {
    assert.equal(isWholeDraftAnalysisComplete({ analysisComplete: true, failedPasses: [] }), true);
  });

  it('keeps historical reports compatible when they carry no known incompleteness marker', () => {
    assert.equal(isWholeDraftAnalysisComplete({}), true);
  });

  it('rejects a report whose diagnostic pipeline failed', () => {
    assert.equal(isWholeDraftAnalysisComplete({ analysisComplete: false }), false);
    assert.equal(isWholeDraftAnalysisComplete({ analysisComplete: true, failedPasses: ['dialogue'] }), false);
  });

  it('rejects a report that covers only a scene-truncated prefix of the draft', () => {
    assert.equal(
      isWholeDraftAnalysisComplete({ analysisComplete: true, truncatedForAnalysis: true, totalSceneCount: 1_001 }),
      false,
    );
  });

  it('fails closed for a malformed failedPasses marker', () => {
    assert.equal(isWholeDraftAnalysisComplete({ failedPasses: 'not-an-array' as unknown as readonly unknown[] }), false);
  });

  it('fails closed for malformed completion markers from persisted or reconstructed reports', () => {
    assert.equal(
      isWholeDraftAnalysisComplete({ analysisComplete: 'true' as unknown as boolean }),
      false,
    );
    assert.equal(
      isWholeDraftAnalysisComplete({ truncatedForAnalysis: 'false' as unknown as boolean }),
      false,
    );
  });
});
