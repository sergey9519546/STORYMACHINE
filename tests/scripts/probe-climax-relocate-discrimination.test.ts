import assert from 'node:assert/strict';
import { test } from 'node:test';

import { computeProbeStats } from '../../scripts/lib/climax-probe-stats.mjs';

test('climax relocation probe selects the latest equal suspense peak', () => {
  const result = computeProbeStats({
    records: [
      { suspenseDelta: 0 },
      { suspenseDelta: 3 },
      { suspenseDelta: 1 },
      { suspenseDelta: 2 },
      { suspenseDelta: 3 },
    ],
  });

  assert.ok(result);
  assert.equal(result.suspPeakPos, 80);
});
