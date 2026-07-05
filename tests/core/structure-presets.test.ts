// Wave Program v2 — B1-e: exhaustive story-structure / emotional-arc /
// character-arc-mode / director-style axes. Tests cover: per-axis
// completeness (shape + non-empty craft content), expectedTensionAt()
// interpolation correctness, and name-constant/object-key parity (no drift
// between the exported "names" tables and the underlying data tables).
// Conventions: node:test + assert/strict, matching tests/core/breakdown.test.ts.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { CharacterArcModeDefinition, StyleModifier } from '../../server/lib/structure-presets.ts';
import {
  STRUCTURE_BEATS,
  STRUCTURE_NAMES,
  ARC_TENSION_CURVES,
  CHARACTER_ARC_MODES,
  STYLE_MODIFIERS,
  instantiatePreset,
  expectedTensionAt,
} from '../../server/lib/structure-presets.ts';

const VALID_VALENCE: Set<CharacterArcModeDefinition['valenceExpectation']> = new Set([
  'rising', 'falling', 'fall_then_rise', 'rise_then_fall', 'oscillating', 'flat',
]);

// ── Structures ────────────────────────────────────────────────────────────
describe('STRUCTURE_BEATS — completeness', () => {
  const keys = Object.keys(STRUCTURE_BEATS);

  it('has at least 20 structures (blueprint exhaustive set)', () => {
    assert.ok(keys.length >= 20, `expected >=20 structures, got ${keys.length}`);
  });

  for (const key of keys) {
    describe(`structure "${key}"`, () => {
      const beats = STRUCTURE_BEATS[key];

      it('has at least 4 beats', () => {
        assert.ok(beats.length >= 4, `${key} has only ${beats.length} beats`);
      });

      it('starts at pct 0 and ends at pct 100', () => {
        assert.equal(beats[0].pct_start, 0, `${key} first beat must start at 0`);
        assert.equal(beats[beats.length - 1].pct_end, 100, `${key} last beat must end at 100`);
      });

      it('has strictly ascending, contiguous, non-overlapping positions', () => {
        for (let i = 0; i < beats.length; i++) {
          assert.ok(beats[i].pct_start < beats[i].pct_end,
            `${key} beat "${beats[i].name}" has pct_start >= pct_end`);
          if (i > 0) {
            assert.equal(beats[i].pct_start, beats[i - 1].pct_end,
              `${key} beat "${beats[i].name}" does not pick up where "${beats[i - 1].name}" left off`);
          }
        }
      });

      it('has non-empty name/goal/constraint/avoid on every beat', () => {
        for (const b of beats) {
          assert.ok(b.name && b.name.trim().length > 0, `${key} has a beat with empty name`);
          assert.ok(b.goal && b.goal.trim().length > 10, `${key} beat "${b.name}" has a trivial/empty goal`);
          assert.ok(b.constraint && b.constraint.trim().length > 10, `${key} beat "${b.name}" has a trivial/empty constraint`);
          assert.ok(b.avoid && b.avoid.trim().length > 10, `${key} beat "${b.name}" has a trivial/empty avoid`);
        }
      });
    });
  }

  it('instantiatePreset() produces a matching beat count and ascending turn ranges for every structure', () => {
    for (const key of keys) {
      const beats = instantiatePreset(key, 1000);
      assert.equal(beats.length, STRUCTURE_BEATS[key].length, `${key}: instantiated beat count mismatch`);
      for (let i = 1; i < beats.length; i++) {
        assert.ok(beats[i].turn_start >= beats[i - 1].turn_start,
          `${key}: turn_start not ascending between beats ${i - 1} and ${i}`);
      }
      for (const b of beats) {
        assert.ok(b.turn_end > b.turn_start, `${key}: beat has turn_end <= turn_start`);
      }
    }
  });
});

describe('STRUCTURE_NAMES — key parity with STRUCTURE_BEATS (no drift)', () => {
  it('has exactly the same key set as STRUCTURE_BEATS', () => {
    const beatKeys = Object.keys(STRUCTURE_BEATS).sort();
    const nameKeys = Object.keys(STRUCTURE_NAMES).sort();
    assert.deepEqual(nameKeys, beatKeys);
  });

  it('has a non-empty display name for every structure', () => {
    for (const [key, name] of Object.entries(STRUCTURE_NAMES)) {
      assert.ok(typeof name === 'string' && name.trim().length > 0, `${key} has an empty display name`);
    }
  });

  // Spot-check a representative slice of the newly added blueprint structures.
  for (const key of [
    'three_act', 'syd_field', 'rashomon', 'non_linear', 'circular', 'hyperlink',
    'fichtean_curve', 'in_media_res', 'snowflake', 'mystery_box', 'closed_circle',
    'procedural_case', 'heist_structure', 'trial_structure', 'survival_structure',
    'hero_journey',
  ]) {
    it(`includes the new structure "${key}"`, () => {
      assert.ok(STRUCTURE_BEATS[key], `missing STRUCTURE_BEATS.${key}`);
      assert.ok((STRUCTURE_NAMES as Record<string, string>)[key], `missing STRUCTURE_NAMES.${key}`);
    });
  }

  it('hero_journey has the full 12-stage Campbell/Vogler monomyth', () => {
    assert.equal(STRUCTURE_BEATS.hero_journey.length, 12);
    const names = STRUCTURE_BEATS.hero_journey.map(b => b.name);
    assert.ok(names.some(n => /Ordinary World/.test(n)));
    assert.ok(names.some(n => /Ordeal/.test(n)));
    assert.ok(names.some(n => /Return/.test(n)));
  });
});

// ── Emotional arcs (tension curves) ─────────────────────────────────────────
describe('ARC_TENSION_CURVES — completeness', () => {
  const keys = Object.keys(ARC_TENSION_CURVES);

  it('has at least 10 arcs (6 original + 4 new blueprint/completions)', () => {
    assert.ok(keys.length >= 10, `expected >=10 arcs, got ${keys.length}`);
  });

  for (const key of keys) {
    it(`"${key}" is an 8-waypoint array of finite values in [0, 100]`, () => {
      const curve = (ARC_TENSION_CURVES as Record<string, number[]>)[key];
      assert.equal(curve.length, 8, `${key} curve must have exactly 8 waypoints`);
      for (const v of curve) {
        assert.ok(Number.isFinite(v), `${key} has a non-finite waypoint`);
        assert.ok(v >= 0 && v <= 100, `${key} waypoint ${v} out of [0,100]`);
      }
    });
  }

  it('includes flat_tension_baseline and sine_wave (blueprint set)', () => {
    assert.ok(ARC_TENSION_CURVES.flat_tension_baseline);
    assert.ok(ARC_TENSION_CURVES.sine_wave);
  });

  it('flat_tension_baseline stays within a tight band (near-constant, not shaped)', () => {
    const curve = ARC_TENSION_CURVES.flat_tension_baseline;
    const min = Math.min(...curve);
    const max = Math.max(...curve);
    assert.ok(max - min <= 10, `flat_tension_baseline range ${max - min} is too wide to read as a baseline`);
  });

  it('sine_wave genuinely oscillates (at least two direction reversals)', () => {
    const curve = ARC_TENSION_CURVES.sine_wave;
    let reversals = 0;
    for (let i = 1; i < curve.length - 1; i++) {
      const risingBefore = curve[i] > curve[i - 1];
      const risingAfter = curve[i + 1] > curve[i];
      if (risingBefore !== risingAfter) reversals++;
    }
    assert.ok(reversals >= 2, `sine_wave has only ${reversals} direction reversals`);
  });

  it('double_man_in_a_hole has two distinct troughs (a true two-dip shape)', () => {
    const curve = ARC_TENSION_CURVES.double_man_in_a_hole;
    // Local minima: points lower than both neighbors.
    const troughs = [];
    for (let i = 1; i < curve.length - 1; i++) {
      if (curve[i] < curve[i - 1] && curve[i] < curve[i + 1]) troughs.push(i);
    }
    assert.ok(troughs.length >= 2, `double_man_in_a_hole has ${troughs.length} local minima, expected >= 2`);
    // Ends higher than it starts, matching the "man in a hole" net-recovery convention.
    assert.ok(curve[curve.length - 1] > curve[0], 'double_man_in_a_hole should end higher than it starts');
  });

  it('tragedy_spiral ends in unrecovered catastrophe, lower than every prior trough', () => {
    const curve = ARC_TENSION_CURVES.tragedy_spiral;
    const last = curve[curve.length - 1];
    for (let i = 0; i < curve.length - 1; i++) {
      assert.ok(last <= curve[i], `tragedy_spiral final value ${last} is not the lowest point (index ${i} = ${curve[i]})`);
    }
  });
});

describe('expectedTensionAt — interpolation correctness', () => {
  it('sine_wave: position 0 returns the first waypoint exactly', () => {
    assert.equal(expectedTensionAt('sine_wave', 0), ARC_TENSION_CURVES.sine_wave[0]);
  });

  it('sine_wave: position 1 returns the last waypoint exactly', () => {
    assert.equal(expectedTensionAt('sine_wave', 1), ARC_TENSION_CURVES.sine_wave[7]);
  });

  it('sine_wave: position 0.5 matches the hand-computed midpoint interpolation', () => {
    // scaled = 0.5 * 7 = 3.5 -> lo=3 (15), hi=4 (50) -> 15 + 0.5*(50-15) = 32.5 -> round -> 33
    assert.equal(expectedTensionAt('sine_wave', 0.5), 33);
  });

  it('tragedy_spiral: position 0 and 1 return the first/last waypoints exactly', () => {
    const curve = ARC_TENSION_CURVES.tragedy_spiral;
    assert.equal(expectedTensionAt('tragedy_spiral', 0), curve[0]);
    assert.equal(expectedTensionAt('tragedy_spiral', 1), curve[curve.length - 1]);
  });

  it('clamps out-of-range positions into [0,1]', () => {
    const curve = ARC_TENSION_CURVES.flat_tension_baseline;
    assert.equal(expectedTensionAt('flat_tension_baseline', -5), curve[0]);
    assert.equal(expectedTensionAt('flat_tension_baseline', 5), curve[curve.length - 1]);
  });

  it('returns null for an unknown arc name', () => {
    assert.equal(expectedTensionAt('not_a_real_arc', 0.5), null);
  });
});

// ── Character arc modes ──────────────────────────────────────────────────────
describe('CHARACTER_ARC_MODES — completeness', () => {
  const EXPECTED_MODES = [
    'hero_journey', 'tragedy', 'comedy', 'redemption', 'descent', 'corruption',
    'rebirth', 'disillusionment', 'martyrdom', 'liberation', 'obsession', 'integration',
  ] as const;

  it('has exactly the 12 blueprint modes', () => {
    assert.deepEqual(Object.keys(CHARACTER_ARC_MODES).sort(), [...EXPECTED_MODES].sort());
  });

  for (const key of EXPECTED_MODES) {
    it(`"${key}" has name/description/promptInstruction and a valid valenceExpectation`, () => {
      const mode = CHARACTER_ARC_MODES[key];
      assert.ok(mode, `missing CHARACTER_ARC_MODES.${key}`);
      assert.ok(mode.name && mode.name.trim().length > 0, `${key} missing name`);
      assert.ok(mode.description && mode.description.trim().length > 20, `${key} description too short/empty`);
      assert.ok(mode.promptInstruction && mode.promptInstruction.trim().length > 20, `${key} promptInstruction too short/empty`);
      assert.ok(VALID_VALENCE.has(mode.valenceExpectation), `${key} has invalid valenceExpectation "${mode.valenceExpectation}"`);
    });
  }

  it('uses every valenceExpectation category at least once (genuine axis coverage)', () => {
    const used = new Set(Object.values(CHARACTER_ARC_MODES).map(m => m.valenceExpectation));
    for (const v of VALID_VALENCE) {
      assert.ok(used.has(v), `no character-arc mode uses valenceExpectation "${v}"`);
    }
  });
});

// ── Director styles ──────────────────────────────────────────────────────────
describe('STYLE_MODIFIERS — completeness', () => {
  const keys = Object.keys(STYLE_MODIFIERS);

  // Range is derived from the file's pre-existing entries (villeneuve: -10, aster: 25).
  const EXISTING_MIN = -10;
  const EXISTING_MAX = 25;

  it('has at least 24 director styles (6 original + ~18 new blueprint entries)', () => {
    assert.ok(keys.length >= 24, `expected >=24 styles, got ${keys.length}`);
  });

  for (const key of keys) {
    describe(`style "${key}"`, () => {
      const style = (STYLE_MODIFIERS as Record<string, StyleModifier>)[key];

      it('has a non-empty agentInstruction and pacingHintSuffix', () => {
        assert.ok(style.agentInstruction && style.agentInstruction.trim().length > 20, `${key} agentInstruction too short/empty`);
        assert.ok(style.pacingHintSuffix && style.pacingHintSuffix.trim().length > 5, `${key} pacingHintSuffix too short/empty`);
      });

      it('has a numeric beliefEdgeIntensityBoost within the observed existing range', () => {
        assert.equal(typeof style.beliefEdgeIntensityBoost, 'number', `${key} beliefEdgeIntensityBoost is not a number`);
        assert.ok(style.beliefEdgeIntensityBoost >= EXISTING_MIN && style.beliefEdgeIntensityBoost <= EXISTING_MAX,
          `${key} boost ${style.beliefEdgeIntensityBoost} outside observed range [${EXISTING_MIN}, ${EXISTING_MAX}]`);
      });

      it('confrontationHintOverride, if present, is a non-empty string', () => {
        if (style.confrontationHintOverride !== undefined) {
          assert.ok(style.confrontationHintOverride.trim().length > 10, `${key} confrontationHintOverride is trivial/empty`);
        }
      });
    });
  }

  // Spot-check a representative slice of the newly added directors.
  for (const key of [
    'kubrick', 'tarantino', 'scorsese', 'coen_brothers', 'wes_anderson', 'spielberg',
    'kurosawa', 'leone', 'malick', 'michael_mann', 'edgar_wright', 'refn', 'eggers',
    'bong_joon_ho', 'del_toro', 'gerwig', 'chazelle', 'pta', 'claire_denis',
    'almodovar', 'park_chan_wook', 'miyazaki',
  ]) {
    it(`includes the new director style "${key}"`, () => {
      assert.ok((STYLE_MODIFIERS as Record<string, StyleModifier>)[key], `missing STYLE_MODIFIERS.${key}`);
    });
  }

  it('preserves the six original entries byte-identical on key fields', () => {
    assert.equal(STYLE_MODIFIERS.villeneuve.beliefEdgeIntensityBoost, -10);
    assert.equal(STYLE_MODIFIERS.aster.beliefEdgeIntensityBoost, 25);
    assert.ok(!('confrontationHintOverride' in STYLE_MODIFIERS.fincher));
  });
});

// ── Existing-entry preservation (no-fire regression guard) ─────────────────
describe('existing presets are preserved byte-identical', () => {
  it('save_the_cat keeps its original 15 beats', () => {
    assert.equal(STRUCTURE_BEATS.save_the_cat.length, 15);
    assert.equal(STRUCTURE_BEATS.save_the_cat[0].name, 'Opening Image');
    assert.equal(STRUCTURE_BEATS.save_the_cat[14].name, 'Final Image');
  });

  it('original tension curves are unchanged', () => {
    assert.deepEqual(ARC_TENSION_CURVES.man_in_a_hole, [48, 36, 24, 16, 28, 46, 64, 80]);
    assert.deepEqual(ARC_TENSION_CURVES.oedipus, [72, 56, 42, 52, 68, 52, 35, 18]);
  });

  it('original director styles are unchanged', () => {
    assert.equal(
      STYLE_MODIFIERS.hitchcock.agentInstruction,
      'CINEMATIC STYLE — HITCHCOCK: You are in a Hitchcockian drama. The audience knows more than the characters. Withhold information strategically — the power is in what you DON\'T say. Prefer EXAMINE over SPEAK. Plant objects and details that will matter later. Let others dig their own graves.',
    );
  });
});
