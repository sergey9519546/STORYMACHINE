// Whole-draft truth must hold below the HTTP route too. Otherwise a future
// caller could create a vector for only the first 1,000 scenes while hashing
// and labeling it as the complete submitted screenplay.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { vectorizeScript } from '../../server/nvm/analyze/story-vector.ts';

function buildSceneTruncatedFountain(): string {
  return Array.from(
    { length: 1_001 },
    (_, index) => `INT. ROOM ${index} - DAY\n\nA person waits.`,
  ).join('\n\n');
}

describe('vectorizeScript whole-draft contract', () => {
  it('rejects a scene-truncated source rather than returning a prefix vector with a full-draft hash', async () => {
    await assert.rejects(
      vectorizeScript(buildSceneTruncatedFountain(), 'Partial Draft'),
      /complete whole-draft analysis/i,
    );
  });

  it('marks a vector from a complete draft with a whole-draft receipt', async () => {
    const vector = await vectorizeScript(
      'INT. ROOM - DAY\n\nA person waits.',
      'Complete Draft',
    );
    assert.equal(vector.metadata.wholeDraftAnalysisComplete, true);
  });
});
