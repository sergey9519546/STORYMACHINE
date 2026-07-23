// Anti-slop screenplayAIMarkers — false-positive gate on REAL produced screenplays.
//
// WHY THIS EXISTS: anti-slop.ts's 64 screenplayAIMarkers patterns shipped with a
// header claiming a "<0.1 false positives/film" target that was never measured.
// The first measurement (scripts/measure-slop-discrimination.ts over 261
// professionally produced screenplays) found the REAL false-positive rate is
// mean 3.84 marker-lines/film — ~38x the fabricated target. Human screenwriters
// legitimately write "robust", "commence", "in order to", "serves as". The
// patterns fire on ordinary screenplay English, so the honest claim is a
// bounded, MEASURED false-positive rate, not a near-zero one.
//
// This test locks that measured baseline as a regression ceiling: any future
// pattern edit that makes real human writing fire markedly MORE fails here,
// before it can inflate slopScore on real drafts. This is the "runnable
// discrimination evidence on real writing" CLAUDE.md's quality bar requires
// for a scoring change — the negative-control half of it.
//
// WHAT IT IS NOT: this is the false-positive floor only. Full AUC separation
// (do AI-generated screenplays fire MORE than human ones?) needs an AI-generated
// positive class, which is not in the corpus yet. See the discrimination script's
// --ai mode and docs/p1-benchmark for the open positive-class work.
//
// COPYRIGHT BOUNDARY (same rule as real-script-corpus.test.ts): the screenplay
// text is local-only. Point REAL_SLOP_CORPUS_DIR (or REAL_SCRIPT_CORPUS_DIR) at
// a directory of *.fountain.txt / *.txt files. When unset (e.g. CI), every
// assertion skips with an honest note rather than silently passing.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { detectSlop } from '../../server/nvm/analyze/anti-slop.ts';

const CORPUS_DIR = process.env.REAL_SLOP_CORPUS_DIR ?? process.env.REAL_SCRIPT_CORPUS_DIR ?? '';
const MIN_LINES = 50; // skip fragments/stubs

// Measured baselines (261 produced screenplays, 2026-07-22 — see
// scripts/measure-slop-discrimination.ts). Ceilings carry ~1.6x head-room so
// honest human writing never flaps the gate; they still catch a systemic jump.
const MEAN_MARKER_LINES_PER_FILM = 3.84;
const CEIL_MEAN_MARKER_LINES = 6.1;   // observed 3.84
const CEIL_P90_DENSITY_PER_1K = 2.02; // observed 1.26
// Per-category mean/film observed max is generic-intensifiers at 0.839; a 2x
// ceiling catches any single pattern class exploding without flapping.
const CEIL_CATEGORY_MEAN_PER_FILM = 1.7;

const CORPUS_STATE: 'unset' | 'broken' | 'valid' = !CORPUS_DIR
  ? 'unset'
  : existsSync(CORPUS_DIR) && statSync(CORPUS_DIR).isDirectory() ? 'valid' : 'broken';
const SKIP_REASON = CORPUS_STATE === 'unset'
  ? 'REAL_SLOP_CORPUS_DIR not set — corpus text is local-only (copyright)'
  : false;

function pct(sorted: number[], p: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
}

interface Measured {
  n: number;
  meanMarkerLines: number;
  p90Density: number;
  catMeanPerFilm: Record<string, number>;
}

function measureCorpus(): Measured {
  const files = readdirSync(CORPUS_DIR).filter(f => f.endsWith('.fountain.txt') || f.endsWith('.txt'));
  let markerTotal = 0;
  const densities: number[] = [];
  const catTotals: Record<string, number> = {};
  let n = 0;
  for (const f of files) {
    let text: string;
    try {
      text = readFileSync(path.join(CORPUS_DIR, f), 'utf8');
    } catch {
      continue;
    }
    const lines = text.split('\n').length;
    if (lines < MIN_LINES) continue;
    n++;
    const m = detectSlop(text).screenplayAIMarkers;
    markerTotal += m.detection.count;
    densities.push((m.detection.count / lines) * 1000);
    for (const [k, v] of Object.entries(m.byCategory)) catTotals[k] = (catTotals[k] ?? 0) + v;
  }
  densities.sort((a, b) => a - b);
  const catMeanPerFilm: Record<string, number> = {};
  // n===0 (valid dir, but every file was <50 lines or unreadable): return zeros
  // so the dedicated "enough screenplays" test reports the real cause, instead of
  // the ceiling tests failing on NaN/undefined and masking it.
  if (n === 0) return { n: 0, meanMarkerLines: 0, p90Density: 0, catMeanPerFilm };
  for (const [k, v] of Object.entries(catTotals)) catMeanPerFilm[k] = v / n;
  return { n, meanMarkerLines: markerTotal / n, p90Density: pct(densities, 0.9), catMeanPerFilm };
}

// Memoized: the corpus scan (read + detectSlop over every file) is identical
// across all assertions, so compute it once instead of once per it-block.
let _measured: Measured | undefined;
function corpus(): Measured {
  return (_measured ??= measureCorpus());
}

describe('anti-slop screenplayAIMarkers — false-positive gate on real screenplays', () => {
  it('corpus dir integrity: set path must exist and be a directory', {
    skip: CORPUS_STATE !== 'broken' && 'only runs when REAL_SLOP_CORPUS_DIR points at a bad path',
  }, () => {
    assert.fail(`REAL_SLOP_CORPUS_DIR="${CORPUS_DIR}" does not exist or is not a directory — fix the path or unset it`);
  });

  it('enough real screenplays to make the measurement meaningful', { skip: SKIP_REASON }, () => {
    const { n } = corpus();
    assert.ok(n >= 30, `only ${n} eligible screenplays (>= ${MIN_LINES} lines) — need >= 30 for a stable baseline`);
  });

  it(`mean marker-lines/film stays under the measured ceiling (${CEIL_MEAN_MARKER_LINES})`, { skip: SKIP_REASON }, () => {
    const { meanMarkerLines, n } = corpus();
    assert.ok(
      meanMarkerLines <= CEIL_MEAN_MARKER_LINES,
      `mean ${meanMarkerLines.toFixed(2)} marker-lines/film over ${n} produced screenplays exceeds ceiling ${CEIL_MEAN_MARKER_LINES} ` +
        `(measured baseline ${MEAN_MARKER_LINES_PER_FILM}) — a pattern change made human writing fire more; re-measure with scripts/measure-slop-discrimination.ts`,
    );
  });

  it(`p90 marker density/1k stays under the measured ceiling (${CEIL_P90_DENSITY_PER_1K})`, { skip: SKIP_REASON }, () => {
    const { p90Density } = corpus();
    assert.ok(
      p90Density <= CEIL_P90_DENSITY_PER_1K,
      `p90 density ${p90Density.toFixed(2)}/1k exceeds ceiling ${CEIL_P90_DENSITY_PER_1K} — false positives concentrated in the worst-hit real scripts`,
    );
  });

  it('no single pattern category explodes on real writing', { skip: SKIP_REASON }, () => {
    const { catMeanPerFilm } = corpus();
    for (const [cat, mean] of Object.entries(catMeanPerFilm)) {
      assert.ok(
        mean <= CEIL_CATEGORY_MEAN_PER_FILM,
        `category "${cat}" fires ${mean.toFixed(2)}/film on real writing (ceiling ${CEIL_CATEGORY_MEAN_PER_FILM}) — that pattern class is too broad`,
      );
    }
  });
});
