// The start screen's Coverage card must show what the sample actually produces.
//
// ── The defect (2026-09-12 adversarial audit, finding #6) ───────────────────
//
// `src/components/StartScreen.tsx` rendered a report card in the product's own
// report styling — VERDICT Consider · HEALTH 76 · NEXT Climax engagement ·
// COUNTS 3 · 38 · 159 · LLM JUDGE None — directly beside a button reading "See
// it on the sample". Every number was a hardcoded literal, and the sample
// returns 78 and 2 · 32 · 139. Nothing labelled the panel as illustrative. For a
// product whose entire pitch is that its numbers are reproducible and
// inspectable, the first four numbers on the front door were stale fiction, and
// a curious visitor discovered that by clicking the button next to them.
//
// THE GUARD. `npm run generate-p0-sample` now also writes
// `src/lib/sample-coverage-facts.ts` from one run of the doctor on
// `src/lib/sample-script.ts`. This test calls the generator's OWN
// `buildSampleCoverageFacts` on a fresh report and compares it against the
// committed module — the same shape as tests/core/rulebook.test.ts (and
// tests/core/p0-sample-drift.test.ts, which guards the other artifact the same
// generator writes). A scoring change that moves the sample's health fails HERE,
// naming the command that fixes it, instead of leaving the front door stale.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { runScriptDoctor } from '../../server/nvm/analyze/doctor.ts';
import { fountain as sampleFountain, title as sampleTitle } from '../../src/lib/sample-script.ts';
import {
  buildSampleCoverageFacts,
  renderSampleCoverageFactsModule,
  FACTS_FILE,
} from '../../scripts/generate-p0-sample-report.ts';
import { SAMPLE_COVERAGE_FACTS } from '../../src/lib/sample-coverage-facts.ts';

const REPO = path.resolve(import.meta.dirname, '../..');

describe('the committed sample-coverage facts are what the sample produces today', async () => {
  const report = await runScriptDoctor(sampleFountain);
  const contentHash = report.contentHash
    ?? createHash('sha256').update(sampleFountain.trim()).digest('hex');
  const fresh = buildSampleCoverageFacts(report, contentHash);

  it('every field matches a fresh run (re-run `npm run generate-p0-sample` when this fails)', () => {
    assert.deepEqual(
      SAMPLE_COVERAGE_FACTS,
      fresh,
      'src/lib/sample-coverage-facts.ts has drifted from a fresh doctor run on '
        + 'src/lib/sample-script.ts. The start screen is showing numbers the sample no '
        + 'longer produces — exactly the defect finding #6 recorded. Fix: '
        + '`npm run generate-p0-sample`, then read the diff.',
    );
  });

  it('the committed module is byte-identical to what the generator would write', () => {
    const committed = readFileSync(FACTS_FILE, 'utf8');
    assert.equal(
      committed,
      renderSampleCoverageFactsModule(fresh),
      'the generated module on disk is not what the generator produces — hand-edited, '
        + 'or the emitter changed without a regeneration',
    );
    assert.equal(path.relative(REPO, FACTS_FILE), 'src/lib/sample-coverage-facts.ts');
  });

  it('the facts are substantive, not sentinels (a withheld report must not silently pass)', () => {
    assert.ok(SAMPLE_COVERAGE_FACTS.verdict.length > 0, 'the sample must produce a verdict');
    assert.ok(SAMPLE_COVERAGE_FACTS.health > 0 && SAMPLE_COVERAGE_FACTS.health <= 100);
    assert.equal(SAMPLE_COVERAGE_FACTS.health, Math.round(SAMPLE_COVERAGE_FACTS.healthExact));
    assert.ok(SAMPLE_COVERAGE_FACTS.sceneCount > 1);
    assert.ok(SAMPLE_COVERAGE_FACTS.nextFixLocation.length > 0);
    assert.equal(SAMPLE_COVERAGE_FACTS.title, sampleTitle);
    assert.match(SAMPLE_COVERAGE_FACTS.contentHash, /^[0-9a-f]{64}$/);
    // The deterministic surface is keyless by design (NORTH_STAR §1), so the
    // committed artifact must never claim an LLM read the sample.
    assert.equal(SAMPLE_COVERAGE_FACTS.llmJudge, 'None');
  });
});
