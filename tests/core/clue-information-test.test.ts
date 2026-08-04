// The information test (D4) and observed setup→payoff order (D6) —
// docs/p1-benchmark/DETECTOR_DEFECTS_2026-08-03.md, fixed 2026-08-04.
//
// D4: computeContentWordClueClusters certified content-word co-occurrences as
// "planted clues" on noun recurrence alone, and its >= 2-occurrence floor made
// a genuinely-open content-word clue unrepresentable. The fix requires the
// information test — introduced as unknown/marked, resolved as knowledge —
// with everything that recurs but fails the test demoted to recurringImagery,
// a reported (not deleted) category.
//
// D6: applyClueLifecycle DEFINED seed as first occurrence and payoff as last,
// in scan order. The fix places the seed at the introduction and detects
// resolution-before-introduction as an inversion (payoffScene < seedScene).
//
// Two regressions found during integration are pinned here so they cannot
// return:
//   - channel-overlap dedup: "a strange BRASS KEY" must yield ONE clue id,
//     not an exact-token id plus a same-scene content-word duplicate;
//   - the lone-mention marker bar: "A knife flashes!" (indefinite article +
//     rare noun, no marker word) is an action beat, not an open thread.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { analyzeFountainText } from '../../server/nvm/analyze/fountain-analyzer.ts';

const scenes = (...bodies: string[]): string =>
  bodies.map((b, i) => `INT. SCENE ${i} - DAY\n\n${b}`).join('\n\n');

const allSeeds = (a: ReturnType<typeof analyzeFountainText>) =>
  a.records.flatMap(r => r.seededClueIds);
const allPayoffs = (a: ReturnType<typeof analyzeFountainText>) =>
  a.records.flatMap(r => r.payoffSetupIds);
const allUnresolved = (a: ReturnType<typeof analyzeFountainText>) =>
  a.records.flatMap(r => r.unresolvedClues ?? []);

describe('D4 — the information test on the content-word channel', () => {
  it('demotes the ledger\'s own worked example (photograph/table co-occurrence) to recurring imagery, not clues', () => {
    // The two sentences D4 quotes verbatim: noun recurrence with handling
    // vocabulary only ("sealed" is deliberately not an introduction marker).
    const a = analyzeFountainText(scenes(
      'Marcus spreads photographs of the estate across a cluttered table.',
      'An ordinary conversation happens in a hallway.',
      'A second ordinary conversation happens in a kitchen.',
      'June sits across an empty table, the photographs sealed in an evidence bag.',
    ));
    const seeds = allSeeds(a);
    assert.equal(seeds.some(id => /photograph|table/.test(id)), false,
      `photograph/table must not be certified as clues, got seeds: ${seeds.join(', ')}`);
    const imagery = (a.recurringImagery ?? []).map(r => r.anchor);
    assert.ok(imagery.some(anchor => /photograph|table/.test(anchor)),
      `the recurrence is real and must be REPORTED as imagery, got: ${imagery.join(', ')}`);
  });

  it('a marked-then-used object passes the information test end to end', () => {
    const a = analyzeFountainText(scenes(
      'Nora finds a mysterious ledger wedged behind the radiator.',
      'An ordinary errand happens.',
      'Another ordinary errand happens.',
      'Nora studies the ledger and finally recognizes the handwriting.',
    ));
    const seeds = allSeeds(a);
    assert.ok(seeds.some(id => id.includes('ledger')), `expected a ledger clue, got: ${seeds.join(', ')}`);
    assert.ok(allPayoffs(a).some(id => id.includes('ledger')), 'the later use must register as its payoff');
  });

  it('a genuinely dropped thread is reportable: marked once, never again -> unresolved (the old floor made this impossible)', () => {
    const a = analyzeFountainText(scenes(
      'A hidden chest sits beneath the floorboards.',
      'An ordinary errand happens.',
      'Another ordinary errand happens.',
      'The story ends with the chest never mentioned again... in fact nothing is mentioned.',
    ));
    // NOTE: the chest recurs in scene 3's prose here, so use a true
    // single-occurrence variant to pin the lone-mention case exactly:
    const lone = analyzeFountainText(scenes(
      'A hidden chest sits beneath the floorboards.',
      'An ordinary errand happens.',
      'Another ordinary errand happens.',
      'The story ends quietly.',
    ));
    assert.ok(allUnresolved(lone).some(id => id.includes('chest')),
      `a marked, distinctive, never-repeated object must be an open thread, got: ${allUnresolved(lone).join(', ')}`);
    assert.ok(allSeeds(a).some(id => id.includes('chest')), 'the recurring variant still seeds');
  });

  it('LONE-MENTION MARKER BAR (regression): "A knife flashes!" — indefinite article + rare noun, no marker — is not an open thread', () => {
    const a = analyzeFountainText(scenes(
      'A knife flashes! Jordan ducks, stabbed but victorious!',
      'An ordinary errand happens.',
      'Another ordinary errand happens.',
      'The story ends quietly.',
    ));
    assert.equal(allSeeds(a).some(id => id.includes('knife')), false,
      `an action beat must not become a planted clue, got seeds: ${allSeeds(a).join(', ')}`);
    assert.equal(allUnresolved(a).some(id => id.includes('knife')), false,
      'and it must not be reported as an unpaid promise');
  });

  it('CHANNEL-OVERLAP DEDUP (regression): one marked CAPS object yields exactly one clue id, not a content-word twin', () => {
    const a = analyzeFountainText(scenes(
      'Sarah notices a strange BRASS KEY glinting under the mat.',
      'An ordinary errand happens.',
      'Another ordinary errand happens.',
      'The story ends quietly.',
    ));
    const keySeeds = allSeeds(a).filter(id => id.includes('key'));
    assert.deepEqual(keySeeds, ['brass-key'],
      `the exact-token channel owns the object; got: ${allSeeds(a).join(', ')}`);
  });
});

describe('D6 — setup->payoff is observed, not assigned', () => {
  it('INVERSION: resolution language before the introduction places payoff < seed (representable at last)', () => {
    const a = analyzeFountainText(scenes(
      'Rhea confidently deciphers the blueprint and reads out the answer.',
      'An ordinary errand happens.',
      'Another ordinary errand happens.',
      'A mysterious blueprint is first properly shown, unexplained, on the desk.',
    ));
    const seedScene = a.records.findIndex(r => r.seededClueIds.some(id => id.includes('blueprint')));
    const payoffScene = a.records.findIndex(r => r.payoffSetupIds.some(id => id.includes('blueprint')));
    assert.ok(seedScene >= 0, `expected a blueprint seed, seeds: ${allSeeds(a).join(', ')}`);
    assert.ok(payoffScene >= 0, 'expected the earlier resolution to register as the payoff');
    assert.ok(payoffScene < seedScene,
      `inversion must be representable: payoff scene ${payoffScene} should precede seed scene ${seedScene}`);
  });

  it('normal order still reads normally: introduction seeds, later use pays off, seed < payoff', () => {
    const a = analyzeFountainText(scenes(
      'A mysterious blueprint sits unexplained on the desk.',
      'An ordinary errand happens.',
      'Another ordinary errand happens.',
      'Rhea finally deciphers the blueprint.',
    ));
    const seedScene = a.records.findIndex(r => r.seededClueIds.some(id => id.includes('blueprint')));
    const payoffScene = a.records.findIndex(r => r.payoffSetupIds.some(id => id.includes('blueprint')));
    assert.ok(seedScene >= 0 && payoffScene >= 0);
    assert.ok(seedScene < payoffScene);
  });
});

describe('the vault-scene script (the ledger\'s canonical stimulus) under the new semantics', () => {
  const fixture = path.resolve(import.meta.dirname, '../fixtures/reversal-detection/the-second-key.fountain');

  it('D4\'s false clues are gone from the canonical script; the real clue survives', () => {
    const a = analyzeFountainText(fs.readFileSync(fixture, 'utf8'));
    const seeds = allSeeds(a);
    assert.equal(seeds.some(id => /photograph|table/.test(id)), false,
      `photograph-spread/table-spread must no longer be clues, got: ${seeds.join(', ')}`);
    assert.ok(seeds.some(id => id.includes('key')),
      `the actual planted key must survive the tightening, got: ${seeds.join(', ')}`);
  });
});
