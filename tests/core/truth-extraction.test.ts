// Truth Extraction — tests for the deterministic screenplay -> TruthFact[]
// feeder for truth-ledger.ts (see server/nvm/analyze/truth-extraction.ts's
// header for the scope decision this test suite exercises: life status
// only, with character presence / object possession / dialogue-claims
// explicitly rejected).
//
// Conventions: node:test + assert/strict, matching
// tests/core/fountain-analyzer.test.ts and tests/core/core-01.test.ts.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  extractTruthFacts,
  detectTruthContradictions,
} from '../../server/nvm/analyze/truth-extraction.ts';
import { REFERENCE_CORPUS } from '../../server/nvm/analyze/calibration/corpus.ts';

// A death cue only registers for a character the extractor has independently
// observed speaking (file header §1) — every fixture below that needs a
// death cue to fire gives Mara an earlier speaking scene for this reason.
const MARA_INTRO = ['INT. OFFICE - DAY', '', 'Mara reviews the file.', '', 'MARA', 'This changes everything.'];

function fountain(...scenes: string[][]): string {
  return scenes.map(s => s.join('\n')).join('\n\n');
}

describe('truth-extraction — fact extraction', () => {
  it('extracts one alive fact per on-screen speaking (character, scene) pair', () => {
    const text = fountain(['INT. KITCHEN - DAY', '', 'Mara pours coffee.', '', 'MARA', 'Morning.']);
    const facts = extractTruthFacts(text);
    assert.equal(facts.length, 1);
    assert.equal(facts[0].subject, 'mara');
    assert.equal(facts[0].object, 'alive');
    assert.equal(facts[0].predicate, 'life_status');
    assert.equal(facts[0].sceneIdx, 0);
    assert.equal(facts[0].validFromStep, 0);
    assert.equal(facts[0].validUntilStep, 0);
  });

  it('extracts a dead fact from an explicit, unhedged death cue on a known character', () => {
    const text = fountain(
      MARA_INTRO,
      ['INT. WAREHOUSE - NIGHT', '', 'COMPANION watches in horror as MARA collapses. MARA is dead.'],
    );
    const facts = extractTruthFacts(text);
    const dead = facts.filter(f => f.object === 'dead');
    assert.equal(dead.length, 1);
    assert.equal(dead[0].subject, 'mara');
    assert.equal(dead[0].sceneIdx, 1);
    assert.equal(dead[0].validFromStep, 2); // scene AFTER the death scene, not the death scene itself
    assert.equal(dead[0].validUntilStep, null); // irreversible — open interval
  });

  it('does not create any fact for an unnamed/non-speaking character mentioned in action', () => {
    const text = fountain(
      MARA_INTRO,
      ['INT. WAREHOUSE - NIGHT', '', 'A stranger in the corner is dead, has been for days.'],
    );
    const facts = extractTruthFacts(text);
    assert.equal(facts.filter(f => f.object === 'dead').length, 0);
  });

  it('is deterministic — repeated calls on the same text produce identical facts', () => {
    const text = fountain(
      MARA_INTRO,
      ['INT. WAREHOUSE - NIGHT', '', 'COMPANION watches in horror as MARA collapses. MARA is dead.'],
      ['INT. PRECINCT - DAY', '', 'Jonah sits alone.', '', 'JONAH', 'She would have wanted this closed.'],
    );
    assert.deepEqual(extractTruthFacts(text), extractTruthFacts(text));
  });
});

describe('truth-extraction — contradiction detection (positive fixture)', () => {
  it('flags a character speaking on-screen after their established death', () => {
    const text = fountain(
      MARA_INTRO,
      ['INT. WAREHOUSE - NIGHT', '', 'COMPANION watches in horror as MARA collapses. MARA is dead.', '', 'COMPANION', 'No...'],
      ['INT. PRECINCT - DAY', '', 'Mara sits across the interrogation table, very much alive.', '', 'MARA', "You'll never prove any of this."],
    );
    const { contradictions, facts } = detectTruthContradictions(text);
    assert.equal(contradictions.length, 1, JSON.stringify({ facts, contradictions }));
    assert.equal(contradictions[0].subject, 'mara');
    assert.equal(contradictions[0].predicate, 'life_status');
    assert.deepEqual([...contradictions[0].overlappingInterval], [2, 2]);
  });
});

describe('truth-extraction — negative fixtures (precision guards)', () => {
  it('fires nothing on ordinary dialogue with no death anywhere', () => {
    const text = fountain(
      ['INT. KITCHEN - DAY', '', 'Mara pours coffee. Jonah reads the paper.', '', 'MARA', 'Coffee?', '', 'JONAH', 'Please.'],
      ['EXT. GARDEN - DAY', '', 'They sit together in the morning light.', '', 'MARA', 'Nice out here.'],
    );
    const { contradictions, facts } = detectTruthContradictions(text);
    assert.equal(contradictions.length, 0);
    assert.equal(facts.filter(f => f.object === 'dead').length, 0);
  });

  it('does not treat a spoken threat as a death cue (dialogue is never scanned for cues)', () => {
    const text = fountain(
      MARA_INTRO,
      ['INT. OFFICE - DAY', '', 'Mara paces.', '', 'MARA', 'I will kill you if you touch that file.'],
      ['INT. LOBBY - DAY', '', 'Mara waits by the elevator.', '', 'MARA', 'Still here.'],
    );
    const { contradictions, facts } = detectTruthContradictions(text);
    assert.equal(contradictions.length, 0);
    assert.equal(facts.filter(f => f.object === 'dead').length, 0);
  });

  it('does not fire on a hedged/speculative death cue ("if Mara dies")', () => {
    const text = fountain(
      MARA_INTRO,
      ['INT. WAREHOUSE - NIGHT', '', 'Jonah paces. If Mara dies before the deposition, the case collapses.', '', 'JONAH', 'We need her alive.'],
      ['INT. PRECINCT - DAY', '', 'Mara sits across the interrogation table.', '', 'MARA', "You'll never prove any of this."],
    );
    const { contradictions, facts } = detectTruthContradictions(text);
    assert.equal(facts.filter(f => f.object === 'dead').length, 0);
    assert.equal(contradictions.length, 0);
  });

  it('does not fire when the death cue is inside a FLASHBACK-marked scene', () => {
    const text = fountain(
      MARA_INTRO,
      ['INT. WAREHOUSE - NIGHT - FLASHBACK', '', 'COMPANION watches in horror as MARA collapses. MARA is dead.'],
      ['INT. PRECINCT - DAY', '', 'Mara sits across the interrogation table.', '', 'MARA', "You'll never prove any of this."],
    );
    const { contradictions, facts } = detectTruthContradictions(text);
    assert.equal(facts.filter(f => f.object === 'dead').length, 0);
    assert.equal(contradictions.length, 0);
  });

  it('does not treat V.O. dialogue as alive-evidence after a death', () => {
    const text = fountain(
      MARA_INTRO,
      ['INT. WAREHOUSE - NIGHT', '', 'COMPANION watches in horror as MARA collapses. MARA is dead.'],
      ['INT. PRECINCT - DAY', '', "Jonah sits alone. Mara's voice drifts over the scene, remembered.", '', 'MARA (V.O.)', 'I always knew it would end here.'],
    );
    const { contradictions, facts } = detectTruthContradictions(text);
    assert.equal(contradictions.length, 0, JSON.stringify(facts));
  });

  it('does not fire on last words in the SAME scene as the death', () => {
    const text = fountain(
      MARA_INTRO,
      ['INT. WAREHOUSE - NIGHT', '', 'Mara staggers, bleeding.', '', 'MARA', 'Tell them... tell them I tried.', '', 'Mara collapses. Mara is dead.'],
    );
    const { contradictions } = detectTruthContradictions(text);
    assert.equal(contradictions.length, 0);
  });
});

describe('truth-extraction — order sensitivity (small controlled fixture)', () => {
  it('reordering the death scene before the character\'s other dialogue creates contradictions the original order does not have', () => {
    const office = ['INT. OFFICE - DAY', '', 'Mara reviews the file.', '', 'MARA', 'This changes everything.'];
    const lobby = ['INT. LOBBY - DAY', '', 'Mara waits by the elevator.', '', 'MARA', 'Still here.'];
    const death = ['INT. WAREHOUSE - NIGHT', '', 'COMPANION watches in horror as MARA collapses. MARA is dead.', '', 'COMPANION', 'No...'];

    const original = fountain(office, lobby, death);
    const { contradictions: cleanContra } = detectTruthContradictions(original);
    assert.equal(cleanContra.length, 0);

    // Move the death scene to the front: Mara's two other speaking scenes now
    // fall AFTER her own death in presentation order.
    const reordered = fountain(death, office, lobby);
    const { contradictions: reorderedContra } = detectTruthContradictions(reordered);
    assert.equal(reorderedContra.length, 2);
  });
});

describe('truth-extraction — real-corpus false-positive rate', () => {
  it('reports zero contradictions across the CC0 sample, structural-form-experiment, and calibration corpora', () => {
    const dirs = [
      path.resolve('data/screenplays'),
      path.resolve('tests/fixtures/structural-form-experiment'),
    ];
    const texts: string[] = [];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      for (const f of fs.readdirSync(dir)) {
        if (!f.endsWith('.fountain')) continue;
        texts.push(fs.readFileSync(path.join(dir, f), 'utf-8'));
      }
    }
    for (const s of REFERENCE_CORPUS) texts.push(s.fountain);
    assert.ok(texts.length >= 20, `expected a real corpus, found ${texts.length} scripts`);

    let totalContradictions = 0;
    for (const text of texts) {
      const { contradictions } = detectTruthContradictions(text);
      totalContradictions += contradictions.length;
    }
    assert.equal(
      totalContradictions,
      0,
      'extractor should be false-positive-free on this corpus (see scripts/probe-truth-order-sensitivity.mjs Section A)',
    );
  });
});
