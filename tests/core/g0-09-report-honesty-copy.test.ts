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
const startScreen = read('../../src/components/StartScreen.tsx');
const whatIfPanel = read('../../src/components/WhatIfPanel.tsx');
// 2026-09-12 (adversarial findings #4/#14): the panel's percentile copy moved
// into the ONE module that owns it. The disclosure is therefore asserted at the
// panel (it renders only the shared, gated helpers) AND in that module (the
// helpers carry the qualifier), rather than as a string literal in the
// component — which is where it had been hand-written beside an UNGATED
// dimension badge that contradicted the headline's own "not comparable"
// sentence in the same scrolling document.
const percentileCopy = read('../../src/lib/percentile-copy.ts');

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
    assert.doesNotMatch(
      percentileCopy,
      /stronger than \$\{clamped\}% of the reference set/i,
      'the shared copy module must not present an unqualified reference-set comparison either',
    );
    assert.match(
      percentileCopy,
      /synthetic reference set/i,
      'percentile must disclose that the reference set is synthetic',
    );
    // …and the panel must reach that disclosure through the shared, GATED
    // helpers rather than a hand-written literal of its own. A literal here is
    // exactly how the dimension badges came to say "TOP 10%" 227 lines under a
    // headline reading "not comparable" (findings #4/#14).
    assert.match(panel, /percentileSentenceFor\(/, 'the headline percentile must use the gated helper');
    assert.match(
      panel,
      /dimensionPercentileBadgeFor\(/,
      'the dimension badges must use the gated helper, not percentileBand',
    );
    assert.match(panel, /dimensionPercentileCaptionFor\(/, 'the section caption must be gated too');
    assert.doesNotMatch(
      panel,
      /\{percentileBand\(dim\.percentile\)\}/,
      'the ungated band must not be rendered for a dimension badge',
    );
  });

  it('describes the default sample as built-in rather than professional', () => {
    assert.match(startScreen, /built-in sample screenplay/i);
    assert.doesNotMatch(startScreen, /professional screenplay/i);
  });

  it('describes Labs branches as an experimental composite ranking with Tier-1 checks included', () => {
    assert.match(whatIfPanel, /experimental composite ranking with Tier-1 checks included/i);
    assert.doesNotMatch(whatIfPanel, /\bconsistency-checked\b/i);
    assert.doesNotMatch(whatIfPanel, /\bbest-first\b/i);
  });
});
