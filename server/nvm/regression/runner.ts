// Narrative Regression Runner (Wave 29) — runs all invariants against the full
// StoryCommit ledger and produces a graded RegressionReport.
//
// Grade is computed from (pass + 0.5*warning) / (pass + warning + fail):
//   A ≥ 90  B ≥ 75  C ≥ 60  D ≥ 40  F < 40

import type { StoryCommit } from '../state/StoryCommit.ts';
import { ALL_INVARIANTS } from './invariants.ts';
import type { InvariantResult, InvariantCategory } from './invariants.ts';

export type RegressionGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface RegressionReport {
  results: InvariantResult[];
  totalScenes: number;
  pass: number;
  fail: number;
  warning: number;
  na: number;
  score: number;       // 0–100
  grade: RegressionGrade;
  byCategory: Record<InvariantCategory, { pass: number; fail: number; warning: number; na: number }>;
}

function computeGrade(score: number): RegressionGrade {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export function runNarrativeRegression(commits: StoryCommit[]): RegressionReport {
  const activeCommits = commits.filter(c => !c.reverted);

  const results: InvariantResult[] = ALL_INVARIANTS.map(inv => inv.check(activeCommits));

  let pass = 0, fail = 0, warning = 0, na = 0;
  for (const r of results) {
    if (r.status === 'pass')    pass++;
    else if (r.status === 'fail')    fail++;
    else if (r.status === 'warning') warning++;
    else                             na++;
  }

  const denominator = pass + fail + warning;
  const score = denominator === 0 ? 0
    : Math.round(((pass + 0.5 * warning) / denominator) * 100);

  const byCategory: RegressionReport['byCategory'] = {
    structure: { pass: 0, fail: 0, warning: 0, na: 0 },
    character: { pass: 0, fail: 0, warning: 0, na: 0 },
    clues:     { pass: 0, fail: 0, warning: 0, na: 0 },
    tension:   { pass: 0, fail: 0, warning: 0, na: 0 },
    theme:     { pass: 0, fail: 0, warning: 0, na: 0 },
  };
  for (const r of results) {
    byCategory[r.category][r.status]++;
  }

  const totalScenes = activeCommits.length > 0
    ? Math.max(...activeCommits.map(c => c.sceneIdx)) + 1
    : 0;

  return { results, totalScenes, pass, fail, warning, na, score, grade: computeGrade(score), byCategory };
}
