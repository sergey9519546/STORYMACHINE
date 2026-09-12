// The start screen's Coverage card must not hold hardcoded numbers.
//
// ── The defect (2026-09-12 adversarial audit, finding #6) ───────────────────
//
// `src/components/StartScreen.tsx` rendered a report card in the product's own
// report styling — VERDICT Consider · HEALTH 76 · NEXT Climax engagement ·
// COUNTS 3 · 38 · 159 · LLM JUDGE None — directly beside a button reading "See
// it on the sample", and the sample returns 78 and 2 · 32 · 139. Nothing
// labelled the panel as illustrative.
//
// This file is SOURCE-ONLY and deliberately imports nothing from the generated
// artifact, so it runs — and FAILS — against the unfixed tree: on 412f23cb the
// four literals are present and no SAMPLE_COVERAGE_FACTS reference is. The
// numbers' own freshness is guarded separately by
// tests/core/sample-coverage-facts.test.ts, which compares the committed
// artifact against a fresh doctor run.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const REPO = path.resolve(import.meta.dirname, '../..');

describe('StartScreen renders the card from the artifact, not from literals', () => {
  const source = readFileSync(path.join(REPO, 'src/components/StartScreen.tsx'), 'utf8');
  const coverageSection = source.slice(
    source.indexOf('{/* L1 — coverage primary object */}'),
    source.indexOf('{/* L2 — OASIS explore */}'),
  );

  it('found the section under test', () => {
    assert.ok(coverageSection.length > 500, 'the coverage section of StartScreen was not found');
  });

  it('imports the generated facts', () => {
    assert.match(source, /import \{ SAMPLE_COVERAGE_FACTS \} from "\.\.\/lib\/sample-coverage-facts";/);
  });

  it('every number in the card comes from the artifact', () => {
    for (const field of ['health', 'verdict', 'critical', 'major', 'minor', 'nextFixLocation', 'llmJudge'] as const) {
      assert.match(
        coverageSection,
        new RegExp(`SAMPLE_COVERAGE_FACTS\\.${field}`),
        `the card must read ${field} from the artifact`,
      );
    }
  });

  it('the superseded literals are gone from that card', () => {
    // The exact four the audit measured. A literal anywhere in this section is
    // a number nothing can keep honest.
    for (const stale of ['>76<', 'Climax engagement', '3 · 38 · 159']) {
      assert.ok(
        !coverageSection.includes(stale),
        `the card still contains the hardcoded ${JSON.stringify(stale)}`,
      );
    }
  });

  it('the card says whose numbers these are', () => {
    assert.match(coverageSection, /data-sample-card-provenance/);
    assert.match(coverageSection, /The sample's own numbers/);
    assert.match(coverageSection, /run keyless by this build/);
  });
});
