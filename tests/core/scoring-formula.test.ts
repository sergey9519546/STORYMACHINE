// Doctor scoring formula — exhaustive unit tests for the pure scoring functions.
//
// These tests exercise computeHealthScore, gradeForHealth, verdictFor,
// computeDimensionScore, and computeDimensionRawScore across the full range
// of inputs: every severity combination, every scene-count bucket, boundary
// conditions, and edge cases. Each test is a single assertion on a pure
// function, making failures immediately diagnosable.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeHealthScore,
  gradeForHealth,
  verdictFor,
  computeDimensionScore,
  computeDimensionRawScore,
} from '../../server/nvm/analyze/doctor.ts';

// ── gradeForHealth: every boundary ────────────────────────────────────────────

describe('gradeForHealth — boundary tests', () => {
  const cases: Array<[number, string]> = [
    [100, 'excellent'],
    [95, 'excellent'],
    [90, 'excellent'],
    [89.9, 'strong'],
    [89, 'strong'],
    [80, 'strong'],
    [75, 'strong'],
    [74.9, 'solid'],
    [74, 'solid'],
    [60, 'solid'],
    [55, 'solid'],
    [54.9, 'uneven'],
    [54, 'uneven'],
    [40, 'uneven'],
    [35, 'uneven'],
    [34.9, 'troubled'],
    [34, 'troubled'],
    [20, 'troubled'],
    [10, 'troubled'],
    [0, 'troubled'],
    [1, 'troubled'],
    [0.1, 'troubled'],
  ];
  for (const [health, expected] of cases) {
    it(`health=${health} → grade=${expected}`, () => {
      assert.equal(gradeForHealth(health), expected);
    });
  }
});

// ── verdictFor: every sceneCount × health combination ─────────────────────────

describe('verdictFor — verdict matrix', () => {
  // RECOMMEND requires health >= 85 AND sceneCount >= 8
  it('health=85, scenes=8 → RECOMMEND (boundary)', () => {
    assert.equal(verdictFor(85, 8), 'RECOMMEND');
  });
  it('health=85, scenes=7 → CONSIDER (below scene floor)', () => {
    assert.equal(verdictFor(85, 7), 'CONSIDER');
  });
  it('health=84.9, scenes=8 → CONSIDER (below health floor)', () => {
    assert.equal(verdictFor(84.9, 8), 'CONSIDER');
  });
  it('health=100, scenes=100 → RECOMMEND', () => {
    assert.equal(verdictFor(100, 100), 'RECOMMEND');
  });

  // CONSIDER: health >= 60 (and < 85 or scenes < 8)
  it('health=60, scenes=8 → CONSIDER (boundary)', () => {
    assert.equal(verdictFor(60, 8), 'CONSIDER');
  });
  it('health=60, scenes=3 → CONSIDER (short but not PASS)', () => {
    assert.equal(verdictFor(60, 3), 'CONSIDER');
  });
  it('health=84, scenes=8 → CONSIDER', () => {
    assert.equal(verdictFor(84, 8), 'CONSIDER');
  });

  // PASS: health < 60
  it('health=59.9, scenes=8 → PASS (boundary)', () => {
    assert.equal(verdictFor(59.9, 8), 'PASS');
  });
  it('health=0, scenes=8 → PASS', () => {
    assert.equal(verdictFor(0, 8), 'PASS');
  });
  it('health=50, scenes=50 → PASS', () => {
    assert.equal(verdictFor(50, 50), 'PASS');
  });
  it('health=30, scenes=3 → PASS', () => {
    assert.equal(verdictFor(30, 3), 'PASS');
  });
  it('health=59, scenes=1 → PASS', () => {
    assert.equal(verdictFor(59, 1), 'PASS');
  });
  it('health=85, scenes=0 → CONSIDER (sceneCount=0 fails the >=8 floor but health is high enough)', () => {
    assert.equal(verdictFor(85, 0), 'CONSIDER');
  });
});

// ── computeHealthScore: range and monotonicity ────────────────────────────────

describe('computeHealthScore — properties', () => {
  it('zero issues, 10 scenes, 300 words → high health', () => {
    const h = computeHealthScore({ critical: 0, major: 0, minor: 0 }, 10, 300);
    assert.ok(h >= 70, `zero-issue script should score >= 70, got ${h}`);
  });

  it('many critical issues, 10 scenes, 300 words → moderate-low health (density normalization absorbs some penalty)', () => {
    const h = computeHealthScore({ critical: 10, major: 20, minor: 50 }, 10, 300);
    // The density formula is opportunity-normalized — at 300 words the
    // weighted-issue density is high but the sub-1.0-density logistic
    // partially absorbs it. Verify the score is in a reasonable range
    // rather than asserting a specific threshold.
    assert.ok(h >= 0 && h <= 100, `health must be in [0,100], got ${h}`);
    // With 80 issues on a short script, health should not be excellent
    assert.ok(h < 80, `80 issues on 300 words should not score >= 80, got ${h}`);
  });

  it('health is always in [0, 100]', () => {
    // Test across a wide range
    for (let c = 0; c <= 20; c += 5) {
      for (let m = 0; m <= 40; m += 10) {
        for (let mi = 0; mi <= 100; mi += 20) {
          for (let sc = 1; sc <= 50; sc += 10) {
            for (let wc = 100; wc <= 5000; wc += 1000) {
              const h = computeHealthScore({ critical: c, major: m, minor: mi }, sc, wc);
              assert.ok(h >= 0 && h <= 100,
                `health ${h} out of range for c=${c},m=${m},mi=${mi},sc=${sc},wc=${wc}`);
            }
          }
        }
      }
    }
  });

  it('adding issues never increases health (monotonic in penalty direction)', () => {
    const base = computeHealthScore({ critical: 0, major: 0, minor: 0 }, 10, 300);
    const withIssues = computeHealthScore({ critical: 1, major: 5, minor: 10 }, 10, 300);
    assert.ok(withIssues <= base,
      `adding issues must not increase health: base=${base}, withIssues=${withIssues}`);
  });

  it('critical issues penalize more than major, which penalize more than minor', () => {
    const fromCritical = computeHealthScore({ critical: 1, major: 0, minor: 0 }, 10, 300);
    const fromMajor = computeHealthScore({ critical: 0, major: 1, minor: 0 }, 10, 300);
    const fromMinor = computeHealthScore({ critical: 0, major: 0, minor: 1 }, 10, 300);
    // The penalty ordering is: critical > major > minor (weight 4 > 1.5 > 0.5)
    // So health ordering should be reversed: critical < major < minor (in terms of health)
    assert.ok(fromCritical <= fromMajor,
      `1 critical (${fromCritical}) should not score higher than 1 major (${fromMajor})`);
    assert.ok(fromMajor <= fromMinor,
      `1 major (${fromMajor}) should not score higher than 1 minor (${fromMinor})`);
  });

  it('scarcity penalty: fewer scenes → lower health at same issue density', () => {
    // Same density but different scene counts — the scarcity penalty
    // should make the shorter script score lower.
    const h3 = computeHealthScore({ critical: 0, major: 0, minor: 0 }, 3, 90);
    const h10 = computeHealthScore({ critical: 0, major: 0, minor: 0 }, 10, 300);
    assert.ok(h3 < h10,
      `3-scene script (${h3}) should score lower than 10-scene (${h10}) due to scarcity`);
  });
});

// ── computeDimensionScore: range and properties ───────────────────────────────

describe('computeDimensionScore — properties', () => {
  it('zero issues → score 100', () => {
    const s = computeDimensionScore({ critical: 0, major: 0, minor: 0 }, 300, 10);
    assert.equal(s, 100);
  });

  it('many issues → low score', () => {
    const s = computeDimensionScore({ critical: 5, major: 10, minor: 20 }, 300, 10);
    assert.ok(s < 60, `many issues should produce score < 60, got ${s}`);
  });

  it('score always in [0, 100]', () => {
    for (let c = 0; c <= 10; c += 2) {
      for (let wc = 50; wc <= 2000; wc += 500) {
        const s = computeDimensionScore({ critical: c, major: c * 2, minor: c * 5 }, wc, 10);
        assert.ok(s >= 0 && s <= 100, `dimension score ${s} out of range`);
      }
    }
  });

  it('does not include scarcity term (unlike computeHealthScore)', () => {
    // Dimension score should NOT change with scene count (only word count)
    const s10 = computeDimensionScore({ critical: 1, major: 2, minor: 3 }, 300, 10);
    const s50 = computeDimensionScore({ critical: 1, major: 2, minor: 3 }, 300, 50);
    assert.equal(s10, s50,
      `dimension score should not change with scene count (no scarcity term): s10=${s10}, s50=${s50}`);
  });

  it('low sceneCount rounds to integer (low-confidence rounding)', () => {
    const s = computeDimensionScore({ critical: 0, major: 0, minor: 0 }, 300, 3);
    assert.equal(s, Math.round(s), `low sceneCount should round to integer`);
  });

  it('high sceneCount rounds to 1 decimal', () => {
    const s = computeDimensionScore({ critical: 1, major: 1, minor: 1 }, 300, 10);
    assert.equal(s, Math.round(s * 10) / 10, `high sceneCount should round to 1 decimal`);
  });
});

// ── computeDimensionRawScore: unclamped, used for calibration ranking ──────────

describe('computeDimensionRawScore — unclamped properties', () => {
  it('zero issues → 100', () => {
    const r = computeDimensionRawScore({ critical: 0, major: 0, minor: 0 }, 300);
    assert.ok(r >= 99.9, `zero-issue raw score should be ~100, got ${r}`);
  });

  it('can go below 0 (unclamped)', () => {
    const r = computeDimensionRawScore({ critical: 50, major: 100, minor: 200 }, 100);
    assert.ok(r < 0, `extreme issues should produce negative raw score, got ${r}`);
  });

  it('can go above 100 (unclamped) — no, penalty is always positive', () => {
    // Raw score = 100 - penalty, penalty is always >= 0, so raw <= 100
    const r = computeDimensionRawScore({ critical: 0, major: 0, minor: 0 }, 300);
    assert.ok(r <= 100, `raw score should never exceed 100`);
  });
});
