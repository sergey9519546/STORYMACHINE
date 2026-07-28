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

  it('uses the shared fail-closed whole-draft predicate before showing a score', () => {
    assert.match(
      src,
      /isWholeDraftAnalysisComplete\(report\)/,
      'CoverageSummary must use the shared completeness predicate before showing a score',
    );
    assert.match(
      src,
      /!reportIsComplete/,
      'CoverageSummary must route incomplete or malformed reports to the withheld branch',
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

  it('buildSlateEntry holds a scene-truncated report out of the scored ranking', () => {
    const entry = buildSlateEntry(
      'Partial',
      mkReport({ analysisComplete: true, truncatedForAnalysis: true, totalSceneCount: 1_001 }),
      'hashPartial',
    );
    assert.equal(entry.analysisComplete, false);
    assert.equal(entry.totalSceneCount, 1_001);
    assert.equal(entry.topDimension, undefined);
    assert.equal(entry.weakestDimension, undefined);
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

  it('renderSlateHtml discloses the analyzed prefix for a scene-truncated entry', () => {
    const partial = buildSlateEntry(
      'Partial',
      mkReport({ analysisComplete: false, truncatedForAnalysis: true, totalSceneCount: 1_001, sceneCount: 1_000 }),
      'partial-hash',
    );
    const html = renderSlateHtml([partial], 0);
    assert.match(html, /1,000 of 1,001 scenes analyzed/i);
    assert.doesNotMatch(html, /N\/A/, 'incomplete rows must not expose prefix-derived dimension labels');
  });
});

describe('G0-05 (c) ScriptDoctorPanel — incomplete reports cannot create false actions or deltas', () => {
  const src = readFileSync(
    resolve(__dirname, '../../src/components/scriptide/ScriptDoctorPanel.tsx'),
    'utf8',
  );

  it('uses the shared predicate for display, history, fix, and scored exports', () => {
    assert.match(src, /isWholeDraftAnalysisComplete\(report\)/);
    assert.match(src, /if \(!isWholeDraftAnalysisComplete\(report\)\) return/);
    assert.match(src, /if \(!report \|\| !reportIsComplete\) return/);
    assert.match(src, /if \(!reportIsComplete\) return/);
    assert.match(src, /reportIsComplete && previousEntry && report\.contentHash/);
    assert.match(src, /entry\.wholeDraftAnalysisComplete === true/);
    assert.match(src, /wholeDraftAnalysisComplete: true/);
  });
});

describe('G0-05 (d) Topology — no fabricated arc for zero data', () => {
  it('computeTopology([]) returns dominantArc null', () => {
    const report = computeTopology([]);
    assert.equal(report.dominantArc, null);
  });
});
