// An UNAPPLIED deduction is never rendered as an applied one — adversarial
// finding #11.
//
// `server/nvm/analyze/types.ts:403-405`, verbatim: "`graphDeduction` is a
// potential 0-15 point value, NOT part of health/verdict until repaired graph
// extraction passes real-writing calibration."
//
// Two surfaces said otherwise about the same field:
//
//   src/components/scriptide/ScriptDoctorPanel.tsx   `37/100 −9hp`, the −9hp in
//       stamp red, in the same "hp" unit as the headline health
//   server/lib/coverage-html.ts                      `→ Health deduction  −9`
//
// On the product's demo script the second sits in a document whose headline is
// Health 78. A reader has no way to know nine points were not taken off.
//
// WHAT THIS ASSERTS:
//
//  1. The shared copy (src/lib/diagnostic-copy.ts) never produces a signed
//     figure, for any input including the hostile ones.
//  2. The exported coverage HTML, rendered from a REAL doctor run on a script
//     whose graph deduction actually fires, carries the diagnostic label and the
//     diagnostic sentence, and contains no "Health deduction" label and no
//     `−<n>` beside the graph score anywhere in the Structural Analysis section.
//  3. The panel source renders the field through the shared function and not
//     through a hand-written `−{…}hp` (source-level, so it RUNS on the pre-fix
//     tree and fails there).
//  4. The coverage LETTER states no graph deduction at all — it renders no such
//     row, and this pins that a future edit cannot add an unlabelled one.
//  5. The VERIFIER'S CLAIM SET does not treat the graph diagnostic as a health
//     component: `buildArtifactClaims` publishes no graph field, and no claim
//     row's value equals the deduction. The raw report JSON still carries
//     `graphHealth.graphDeduction` — that is the engine's own output shape and
//     changing it is a scoring-path edit — so what is guarded here is that no
//     verifier, and no exported claim, ever reads it as health.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  UNAPPLIED_DEDUCTION_LABEL, unappliedDeductionReading, unappliedDeductionLine,
  DIAGNOSTIC_NOT_IN_HEALTH_LABEL, diagnosticNotInHealthSentence,
} from '../../src/lib/diagnostic-copy.ts';
import { renderCoverageHtml } from '../../server/lib/coverage-html.ts';
import { renderCoverageLetter } from '../../server/lib/coverage-letter.ts';
import { buildArtifactClaims, claimRowsFor } from '../../server/lib/artifact-claims.ts';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const PANEL = join(REPO, 'src', 'components', 'scriptide', 'ScriptDoctorPanel.tsx');

describe('diagnostic-copy: an unapplied deduction is never signed', () => {
  it('the reading states the magnitude, the conditional, and the fact it is not applied', () => {
    assert.equal(unappliedDeductionReading(9), 'up to 9 pts — not applied');
    assert.equal(unappliedDeductionReading(1), 'up to 1 pt — not applied');
    assert.equal(unappliedDeductionReading(0), 'up to 0 pts — not applied');
  });

  it('no input produces a minus sign or the headline health unit', () => {
    for (const n of [0, 1, 9, 15, 100, -3, -0.4, Number.NaN, Number.POSITIVE_INFINITY]) {
      const line = unappliedDeductionLine(n);
      assert.ok(!/[−-]\d/.test(line), `"${line}" renders a signed figure`);
      assert.ok(!/\d\s*hp\b/i.test(line), `"${line}" borrows the headline's hp unit`);
      assert.ok(!/NaN|Infinity/.test(line), `"${line}" leaks a non-finite value`);
    }
  });

  it('the label is conditional by construction — "would", never "did"', () => {
    assert.match(UNAPPLIED_DEDUCTION_LABEL, /^Would deduct\b/);
    assert.ok(!/^Health deduction/i.test(UNAPPLIED_DEDUCTION_LABEL));
  });
});

describe('the exported coverage HTML states what the graph diagnostic is', () => {
  // A real run, because the deduction only fires on real graph extraction — a
  // hand-built report would let the section render with graphHealth absent and
  // every assertion below pass vacuously.
  async function renderReal(relPath: string, title: string) {
    const fountain = readFileSync(join(REPO, relPath), 'utf8');
    const report = await runScriptDoctor(fountain);
    return { report, html: renderCoverageHtml(report, title, { fountain }), fountain };
  }

  it('dead-frequency (the demo script): the deduction fires, and the export says it is not applied', async () => {
    const { report, html } = await renderReal('data/screenplays/dead-frequency.fountain', 'Dead Frequency');

    assert.ok(report.graphHealth, 'the fixture must carry a graphHealth block');
    assert.ok(report.graphHealth.graphDeduction > 0,
      'the fixture must actually produce a nonzero deduction, or this test proves nothing');

    const section = html.slice(html.indexOf('<h2>Structural Analysis'));
    const sectionEnd = section.indexOf('</section>');
    const structural = section.slice(0, sectionEnd);

    assert.ok(structural.includes(DIAGNOSTIC_NOT_IN_HEALTH_LABEL),
      'the section heading carries the shared diagnostic badge');
    assert.ok(structural.includes(diagnosticNotInHealthSentence('Graph Health')),
      'the card carries the shared diagnostic sentence');
    assert.ok(structural.includes(UNAPPLIED_DEDUCTION_LABEL),
      'the deduction row carries the shared conditional label');
    assert.ok(structural.includes(unappliedDeductionReading(report.graphHealth.graphDeduction)),
      'the deduction row carries the shared unsigned reading');

    assert.ok(!/Health deduction/i.test(structural),
      'the row must not claim the points came off the health');
    assert.ok(!new RegExp(`[−-]\\s*${report.graphHealth.graphDeduction}\\b`).test(structural),
      'no signed figure for the deduction anywhere in the section');
  });

  it('runoff: the same, on a second real script', async () => {
    const { report, html } = await renderReal('data/screenplays/runoff.fountain', 'Runoff');
    assert.ok(report.graphHealth);
    const structural = html.slice(html.indexOf('<h2>Structural Analysis'));
    assert.ok(structural.includes(DIAGNOSTIC_NOT_IN_HEALTH_LABEL));
    assert.ok(structural.includes(diagnosticNotInHealthSentence('Graph Health')));
    assert.ok(!/Health deduction/i.test(structural));
  });
});

describe('the coverage letter states no graph deduction', () => {
  it('neither renderer prints the graph diagnostic, so neither can print it unlabelled', async () => {
    const fountain = readFileSync(join(REPO, 'data/screenplays/dead-frequency.fountain'), 'utf8');
    const report = await runScriptDoctor(fountain);
    assert.ok((report.graphHealth?.graphDeduction ?? 0) > 0);
    const { markdown, text } = renderCoverageLetter(report, { title: 'Dead Frequency', fountain });
    for (const [name, doc] of [['markdown', markdown], ['text', text]] as const) {
      assert.ok(!/Graph Health/i.test(doc), `the ${name} letter prints a graph health row`);
      assert.ok(!/Health deduction/i.test(doc), `the ${name} letter prints a health deduction`);
      assert.ok(!new RegExp(`[−-]${report.graphHealth!.graphDeduction}hp`).test(doc),
        `the ${name} letter prints a signed deduction`);
    }
  });
});

describe('the claim set does not treat the graph diagnostic as a health component', () => {
  it('no published claim carries the graph score or its deduction', async () => {
    const fountain = readFileSync(join(REPO, 'data/screenplays/dead-frequency.fountain'), 'utf8');
    const report = await runScriptDoctor(fountain);
    const gh = report.graphHealth;
    assert.ok(gh && gh.graphDeduction > 0);

    const claims = buildArtifactClaims(report, {
      prioritiesListed: 3, loglineState: 'derived', pageRefs: null, referenceBounds: '',
    });
    assert.equal(claims.health, report.health, 'the one health claim is the report health');
    assert.notEqual(claims.health, gh.graphHealthScore);
    assert.notEqual(claims.health, report.health - gh.graphDeduction,
      'the claimed health is not the health minus an unapplied deduction');

    for (const key of Object.keys(claims)) {
      assert.ok(!/graph/i.test(key), `the claim set publishes a graph field: ${key}`);
    }
    for (const row of claimRowsFor(claims)) {
      assert.ok(!/graph/i.test(row.label), `a claim row names the graph diagnostic: ${row.label}`);
      assert.notEqual(row.value, String(gh.graphDeduction),
        `a claim row publishes the unapplied deduction as a value: ${row.label}`);
    }
  });
});

describe('the panel renders the field through the shared function', () => {
  // Source-level on purpose: this RUNS on the pre-fix tree (the module it reads
  // is just text there) and fails, which is what makes it a fail-first guard
  // rather than a test that could not have caught the bug.
  const src = readFileSync(PANEL, 'utf8');

  it('no hand-written signed hp figure survives in the panel', () => {
    assert.ok(!/−\{report\.graphHealth\.graphDeduction\}hp/.test(src),
      'the panel still hand-writes −{graphDeduction}hp');
    assert.ok(!/sm-stamp-on-light[^>]*>−/.test(src),
      'the panel still prints a deduction in stamp red');
  });

  it('the panel calls the shared unapplied-deduction copy', () => {
    assert.ok(src.includes('unappliedDeductionLine'),
      'the panel must render the deduction through src/lib/diagnostic-copy.ts');
    assert.ok(src.includes('data-unapplied-deduction'),
      'the rendered slot carries a stable hook for the browser suite');
  });
});
