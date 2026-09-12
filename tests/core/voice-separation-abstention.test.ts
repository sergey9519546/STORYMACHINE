// When the voice channel abstains, both surfaces say WHY — adversarial finding
// #17, tooltip half.
//
// THE DEFECT. On the 231-scene feature fixture the Coverage panel showed
// `VOICE SEPARATION — N/A` beside an `i` tooltip reading "Character pairs whose
// dialogue is statistically distinguishable (Burrows's Delta) out of every pair
// with enough dialogue to test. Higher is better…" — an instruction for reading
// a number that is not there. The exported coverage report did not mention the
// channel at all, so a producer holding the document had neither the reading nor
// the fact that there was none to have.
//
// MEASURED HERE, not narrated: the four committed inputs below are run through
// the real doctor, and the abstention is asserted to actually happen at feature
// length and not to happen on the shorts. If the engine's behaviour changes,
// this test says so rather than quietly asserting copy for a state that no
// longer occurs.
//
// WHAT IS DELIBERATELY NOT DONE. server/nvm/analyze/voice-delta.ts records no
// reason for either of its two abstention branches, and adding one is a
// scoring-path change (it is reachable from doctor.ts). The scoring half of
// finding #17 — per-character abstention, so the channel can report at feature
// length — is on the owner-gated branch and is untouched. So the copy states
// both conditions rather than guessing which one fired, except in the one case
// the report alone settles (fewer than two named characters).

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  VOICE_SEPARATION_LABEL, VOICE_SEPARATION_DEFINITION, VOICE_SEPARATION_ABSTAINED_VALUE,
  voiceSeparationValue, voiceSeparationShortValue,
  voiceSeparationAbstentionReason, voiceSeparationTooltip,
} from '../../src/lib/voice-separation-copy.ts';
import { renderCoverageHtml } from '../../server/lib/coverage-html.ts';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const SUMMARY = join(REPO, 'src', 'components', 'scriptide', 'CoverageSummary.tsx');

const SCORED = { scored: true, pairs: [{ swapRisk: false }, { swapRisk: true }] };
const ABSTAINED = { scored: false, pairs: [] as Array<{ swapRisk: boolean }> };

describe('voice-separation-copy: two states, two sentences', () => {
  it('a scored channel gets the reading instruction and no reason', () => {
    assert.equal(voiceSeparationValue(SCORED), '1/2 Pairs');
    assert.equal(voiceSeparationShortValue(SCORED), '1/2 Pairs');
    assert.equal(voiceSeparationAbstentionReason(SCORED, 5), null);
    assert.equal(voiceSeparationTooltip(SCORED, 5), VOICE_SEPARATION_DEFINITION);
  });

  it('an abstaining channel gets a reason, never the reading instruction', () => {
    for (const chars of [0, 1, 2, 5, 81]) {
      const tooltip = voiceSeparationTooltip(ABSTAINED, chars);
      assert.notEqual(tooltip, VOICE_SEPARATION_DEFINITION,
        `${chars} characters: the tooltip still explains a number that is not there`);
      assert.match(tooltip, /^Not measured:/);
      assert.ok(!/Higher is better/.test(tooltip));
      assert.equal(voiceSeparationValue(ABSTAINED), null);
      assert.equal(voiceSeparationShortValue(ABSTAINED), VOICE_SEPARATION_ABSTAINED_VALUE);
    }
  });

  it('the one branch the report settles is stated specifically', () => {
    assert.match(voiceSeparationAbstentionReason(ABSTAINED, 0)!, /names none/);
    assert.match(voiceSeparationAbstentionReason(ABSTAINED, 1)!, /names one/);
    // Two or more NAMED characters is not evidence that two of them speak, so
    // the copy states both conditions rather than picking one.
    const many = voiceSeparationAbstentionReason(ABSTAINED, 81)!;
    assert.match(many, /at least two characters with dialogue/);
    assert.match(many, /enough\s+dialogue from each one/);
  });

  it('a report with no voiceAnalysis at all is treated as an abstention, not a crash', () => {
    assert.equal(voiceSeparationShortValue(undefined), VOICE_SEPARATION_ABSTAINED_VALUE);
    assert.equal(voiceSeparationShortValue(null), VOICE_SEPARATION_ABSTAINED_VALUE);
    assert.match(voiceSeparationTooltip(undefined, 4), /^Not measured:/);
    assert.match(voiceSeparationTooltip(ABSTAINED, Number.NaN)!, /^Not measured:/);
  });
});

describe('the engine really does abstain at feature length', () => {
  const CASES: Array<{ path: string; scored: boolean }> = [
    { path: 'tests/fixtures/feature-length/assembled-feature.fountain', scored: false },
    { path: 'data/screenplays/runoff.fountain', scored: true },
    { path: 'data/screenplays/dead-frequency.fountain', scored: true },
    { path: 'data/screenplays/chain-of-custody.fountain', scored: true },
  ];

  for (const c of CASES) {
    it(`${c.path.split('/').pop()}: scored=${c.scored}, and the export states the matching state`, async () => {
      const fountain = readFileSync(join(REPO, c.path), 'utf8');
      const report = await runScriptDoctor(fountain);
      assert.equal(
        report.voiceAnalysis?.scored ?? false, c.scored,
        'the measured abstention this finding is about has changed — re-measure before editing the copy',
      );

      const html = renderCoverageHtml(report, 'X', { fountain });
      const section = html.slice(html.indexOf('<h2>Structural Analysis'));
      // Entity-decoded, because the shared sentences contain an apostrophe
      // ("Burrows's Delta") that escapeHtml writes as &#39; — comparing the raw
      // markup against the module's string would fail for a reason that has
      // nothing to do with what the document says.
      const structural = section.slice(0, section.indexOf('</section>'))
        .replace(/&#39;/g, "'").replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

      assert.ok(structural.includes(VOICE_SEPARATION_LABEL),
        'the export must carry the channel in both states');

      const reason = voiceSeparationAbstentionReason(
        report.voiceAnalysis, report.characters?.length ?? 0,
      );
      if (c.scored) {
        assert.ok(structural.includes(voiceSeparationValue(report.voiceAnalysis)!),
          'a scored channel prints its pair count');
        assert.ok(structural.includes(VOICE_SEPARATION_DEFINITION),
          'a scored channel prints the reading instruction beside the number');
        assert.equal(reason, null);
      } else {
        assert.ok(structural.includes('not measured'),
          'an abstaining channel says so rather than printing a value');
        assert.ok(structural.includes(reason!),
          'an abstaining channel prints WHY, from the shared module');
        assert.ok(!structural.includes(VOICE_SEPARATION_DEFINITION),
          'an abstaining channel must not print the reading instruction for an absent number');
      }
    });
  }
});

describe('the Coverage tile asks the shared module which sentence its state deserves', () => {
  // Source-level, so it RUNS on the pre-fix tree and fails there.
  const src = readFileSync(SUMMARY, 'utf8');

  it('the tooltip is state-dependent, not a fixed definition', () => {
    assert.ok(
      src.includes('description={voiceSeparationTooltip(report.voiceAnalysis, report.characters?.length ?? 0)}'),
      'the tile must pass its own state to the shared tooltip function',
    );
    assert.ok(!/voiceSeparation:\s*\n?\s*"Character pairs/.test(src),
      'the hand-written definition must no longer be the tile\'s only tooltip');
  });

  it('the value comes from the shared module too, so N/A and the pair count cannot drift', () => {
    assert.ok(src.includes('voiceSeparationShortValue(report.voiceAnalysis)'));
    assert.ok(!/report\.voiceAnalysis\?\.scored \?\s*`\$\{report\.voiceAnalysis\.pairs/.test(src),
      'the tile still hand-builds the pair count');
  });

  it('one import of the shared module, carrying every symbol the tile uses', () => {
    const block = src.match(/import \{([\s\S]*?)\} from "\.\.\/\.\.\/lib\/voice-separation-copy\.ts";/);
    assert.ok(block, 'the tile must import its copy from src/lib/voice-separation-copy.ts');
    for (const symbol of ['VOICE_SEPARATION_LABEL', 'voiceSeparationShortValue', 'voiceSeparationTooltip']) {
      assert.ok(block[1].includes(symbol), `missing ${symbol}`);
    }
  });
});

// ── One wording for the abstention, in one place ─────────────────────────────
//
// 2026-09-12 (review round 2, non-blocking 2). The export hand-typed
// `'not measured'` at its metric row while the panel read
// `VOICE_SEPARATION_ABSTAINED_VALUE` ('N/A') from the shared module, so one
// fact was stated in two words from two places — inside a lane whose own brief
// item 4/14 is "call the shared function, add no second formatter". The
// export's wording was the better one and is now the module's
// (`VOICE_SEPARATION_NOT_MEASURED_VALUE`); which of the two a surface uses is a
// layout decision, and the WORDS belong to one file.

describe('the abstention has one wording, and it lives in the copy module', () => {
  const SURFACES = [
    'server/lib/coverage-html.ts',
    'src/components/scriptide/CoverageSummary.tsx',
  ];

  it('the module owns both values, and they are different lengths for different room', async () => {
    const mod = await import('../../src/lib/voice-separation-copy.ts');
    assert.equal(mod.VOICE_SEPARATION_ABSTAINED_VALUE, 'N/A');
    assert.equal(mod.VOICE_SEPARATION_NOT_MEASURED_VALUE, 'not measured');
    assert.equal(mod.voiceSeparationLongValue({ pairs: [], scored: false }), 'not measured');
    assert.equal(mod.voiceSeparationLongValue({ pairs: [{ swapRisk: false }], scored: true }), '1/1 Pairs');
    assert.equal(mod.voiceSeparationShortValue({ pairs: [], scored: false }), 'N/A');
  });

  for (const surface of SURFACES) {
    it(`${surface} states the abstention through the module, never in its own words`, () => {
      const code = readFileSync(join(REPO, surface), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^[ \t]*\/\/.*$/gm, '');
      // The literal, in quotes, anywhere in live code is the second copy.
      assert.ok(!/'not measured'|"not measured"|`not measured`/.test(code),
        `${surface} hand-types the abstention value instead of reading it from the copy module`);
      assert.ok(/voiceSeparation(Long|Short)Value\(/.test(code),
        `${surface} must take the value from the shared module`);
    });
  }

  it('the rendered export prints the module\'s word, on a report that really abstains', async () => {
    const src = readFileSync(join(REPO, 'tests/fixtures/feature-length/assembled-feature.fountain'), 'utf8');
    const report = await runScriptDoctor(src);
    assert.equal(report.voiceAnalysis?.scored, false, 'this fixture must still abstain, or the case proves nothing');
    const html = renderCoverageHtml(report, 'abstention');
    assert.ok(html.includes('>not measured<'), 'the export must print the module\'s abstention value');
    assert.ok(!html.includes('>N/A<'), 'the badge-width value has no business in a row with room for words');
  });
});
