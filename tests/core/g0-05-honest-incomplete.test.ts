// G0-05 — No sentinel scores; incomplete / no-data states must render honestly.
// These tests assert the HONEST behavior (they fail against the pre-fix code).
//   (a) CoverageSummary success-state must not render a raw health number for
//       an analysisComplete:false report — it must show an "incomplete" branch.
//   (b) Slate: buildSlateEntry threads analysisComplete; rankSlate keeps
//       incomplete entries out of the scored ranking; renderSlateHtml badges
//       them "incomplete" instead of showing a sentinel health number.
//   (d) computeTopology([]) must not fabricate a dominant arc.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { buildSlateEntry, rankSlate, renderSlateHtml } from '../../server/lib/slate.ts';
import { computeTopology } from '../../server/nvm/valuation/topology.ts';
import type { ScriptDoctorReport } from '../../server/nvm/analyze/types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

function mkReport(over: Partial<ScriptDoctorReport>): ScriptDoctorReport {
  return {
    health: 50,
    grade: 'solid',
    totalIssues: 0,
    bySeverity: { critical: 0, major: 0, minor: 0 },
    passes: [],
    sceneHeatmap: [],
    topPriorities: [],
    structure: {} as ScriptDoctorReport['structure'],
    characters: [],
    sceneCount: 8,
    wordCount: 4000,
    dimensions: [],
    ...over,
  } as unknown as ScriptDoctorReport;
}

describe('G0-05 (a) CoverageSummary — no raw score for incomplete analysis', () => {
  const src = readFileSync(
    resolve(__dirname, '../../src/components/scriptide/CoverageSummary.tsx'),
    'utf8',
  );

  it('guards the success state on analysisComplete === false', () => {
    assert.match(
      src,
      /analysisComplete\s*===\s*false/,
      'CoverageSummary must branch on analysisComplete === false before showing a score',
    );
  });

  it('shows an incomplete / withheld indicator instead of a score', () => {
    assert.match(
      src,
      /incomplete|withheld/i,
      'CoverageSummary must present an incomplete-analysis message for degraded reports',
    );
  });
});

describe('G0-05 (b) Slate — incomplete entries are not scored', () => {
  it('buildSlateEntry threads analysisComplete === false', () => {
    const entry = buildSlateEntry('Broken', mkReport({ health: 0, analysisComplete: false }), 'hashA');
    assert.equal(entry.analysisComplete, false);
  });

  it('buildSlateEntry marks a complete report analysisComplete !== false', () => {
    const entry = buildSlateEntry('Fine', mkReport({ health: 60, analysisComplete: true }), 'hashB');
    assert.notEqual(entry.analysisComplete, false);
  });

  it('rankSlate keeps every incomplete entry after every scored entry', () => {
    const incomplete = buildSlateEntry('Broken', mkReport({ health: 0, analysisComplete: false }), 'h0');
    const low = buildSlateEntry('Low', mkReport({ health: 12, analysisComplete: true }), 'h1');
    const high = buildSlateEntry('High', mkReport({ health: 71, analysisComplete: true }), 'h2');

    const ranked = rankSlate([incomplete, low, high]);
    const firstIncomplete = ranked.findIndex((e) => e.analysisComplete === false);
    assert.notEqual(firstIncomplete, -1, 'incomplete entry must be present');
    assert.ok(
      ranked.slice(0, firstIncomplete).every((e) => e.analysisComplete !== false),
      'no scored entry may appear after an incomplete one',
    );
    // scored entries keep health-desc order
    assert.equal(ranked[0].title, 'High');
    assert.equal(ranked[1].title, 'Low');
    assert.equal(ranked[2].title, 'Broken');
  });

  it('renderSlateHtml badges incomplete entries instead of a sentinel health number', () => {
    const incomplete = buildSlateEntry('Broken', mkReport({ health: 0, analysisComplete: false }), 'h0');
    const scored = buildSlateEntry('High', mkReport({ health: 71, analysisComplete: true }), 'h2');
    const html = renderSlateHtml(rankSlate([scored, incomplete]), 0);
    assert.match(html, /incomplete/i, 'HTML export must label incomplete entries');
  });
});

describe('G0-05 (d) Topology — no fabricated arc for zero data', () => {
  it('computeTopology([]) returns dominantArc null', () => {
    const report = computeTopology([]);
    assert.equal(report.dominantArc, null);
  });
});
