// G0-09 — report-honesty copy contract (Lever 3).
//
// The claim audit (docs/scoring/REPORT_CLAIM_AUDIT.md) found several
// writer-facing report strings overstated what the engine actually measures:
// verdict explainers framed as human-reader endorsements, an unqualified
// "reference set" percentile, and a "Verification hash"/"same verdict every
// time" footer that collapsed reproducibility into a correctness claim.
// These were reworded. This test locks the rewording at the source level so
// the report cannot regress to the dishonest phrasing. No React render
// harness exists in this repo, so — following g0-06/g0-07 — we assert on the
// component source directly with short, distinctive fragments (not snapshots).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(__dirname, rel), 'utf8');

const panel = read('../../src/components/scriptide/ScriptDoctorPanel.tsx');

describe('G0-09 — report honesty copy contract', () => {
  it('verdict explainers are engine tiers, not human-reader endorsements', () => {
    assert.doesNotMatch(
      panel,
      /rarest, strongest endorsement/i,
      'RECOMMEND explainer must not frame the verdict as a human-reader endorsement',
    );
    assert.doesNotMatch(
      panel,
      /endorsement a reader gives/i,
      'no verdict tier may be described as a reader endorsement',
    );
    // The reworded explainers attribute the verdict to the deterministic engine.
    assert.match(panel, /deterministic engine/i, 'explainers must attribute the verdict to the deterministic engine');
  });

  it('health percentile names the synthetic reference set, not an unqualified "reference set"', () => {
    // The old copy said only "Stronger than N% of the reference set" with no
    // signal that the reference set is 20 hand-authored synthetic samples.
    assert.doesNotMatch(
      panel,
      /stronger than \d+% of the reference set/i,
      'percentile must not present an unqualified reference-set comparison',
    );
    assert.match(
      panel,
      /synthetic reference set/i,
      'percentile must disclose that the reference set is synthetic',
    );
  });
});
