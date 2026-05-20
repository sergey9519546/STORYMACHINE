// NVM Sidecar Schema (Wave 12 closeout — _CLEVER_MOVES §21).
// A sidecar packages the NVM quality snapshot alongside any deliverable (e.g.
// a Fountain screenplay). The sidecar JSON travels with the artifact and lets
// downstream tools (script editors, CI pipelines) query story health without
// re-running the full engine.
//
// Usage:
//   import { buildSidecar } from './sidecar.ts';
//   const sidecar = buildSidecar(canon);   // pure, no I/O
//   fs.writeFileSync('story.nvm.json', JSON.stringify(sidecar, null, 2));

import type { Canon } from './index.ts';
import type { ProppStage } from '../quality/index.ts';
import { runQualityEngine, proppMorphology, burrowsDelta } from '../quality/index.ts';
import { deriveTensionLedger, momentumScore } from '../valuation/futures.ts';
import { emptyState } from '../state/NarrativeState.ts';
import { randomUUID } from 'node:crypto';

// ── Sidecar schema ────────────────────────────────────────────────────────────

export interface NVMSidecar {
  /** Schema version. Increment when shape changes. */
  nvmVersion: '12';
  sidecarId: string;
  generatedAt: number;
  title: string;
  // Quality snapshot
  qualityScore: number;       // 0–100
  arcDebt: string[];
  revealReady: boolean;
  specificity: number;        // 0–1
  burrowsDelta: number;       // 0–1 (0 = distinct voices)
  necessityScore: number;     // 0–1
  repairGaps: string[];
  // Propp morphology
  proppPresent: ProppStage[];
  proppAbsent: ProppStage[];
  proppCoverage: number;      // 0–1
  // Tension & momentum
  totalTension: number;
  openPositions: number;
  momentum: number;           // 0–100 rolling high-value-op rate
  // Story structure
  commitCount: number;
  revertedCount: number;
  themeArgument: Array<{ claimId: string; move: string }>;
  payoffs: Array<{ setupId: string; payoffEventId: string }>;
  clues: Array<{ clueId: string; carrier: string }>;
  // Character knowledge snapshot
  beliefCounts: Record<string, number>;    // charId → belief count
  emotionSnapshot: Record<string, { dominant: string; intensity: number }>;
  /** Per-character quality warnings from dialogue validators. */
  perCharacterWarnings: Record<string, string[]>;
}

// ── Regression snapshot ───────────────────────────────────────────────────────
// A regression snapshot captures a quality score baseline for a named scenario.
// Check-in the snapshot; CI runs buildSidecar and asserts no metric regresses.

export interface RegressionSnapshot {
  scenarioId: string;
  capturedAt: number;
  baselineQualityScore: number;
  baselineTension: number;
  baselineProppCoverage: number;
  baselineMomentum: number;
  commitHash?: string;  // git SHA when snapshot was taken
}

export function captureRegressionSnapshot(
  sidecar: NVMSidecar,
  scenarioId: string,
  commitHash?: string,
): RegressionSnapshot {
  return {
    scenarioId,
    capturedAt: sidecar.generatedAt,
    baselineQualityScore: sidecar.qualityScore,
    baselineTension: sidecar.totalTension,
    baselineProppCoverage: sidecar.proppCoverage,
    baselineMomentum: sidecar.momentum,
    commitHash,
  };
}

export interface RegressionResult {
  passed: boolean;
  regressions: Array<{ metric: string; baseline: number; actual: number; delta: number }>;
}

export function checkRegression(
  snapshot: RegressionSnapshot,
  current: NVMSidecar,
  tolerance = 0.1,   // 10% regression threshold
): RegressionResult {
  const checks: Array<{ metric: string; baseline: number; actual: number }> = [
    { metric: 'qualityScore',    baseline: snapshot.baselineQualityScore,    actual: current.qualityScore },
    { metric: 'totalTension',    baseline: snapshot.baselineTension,         actual: current.totalTension },
    { metric: 'proppCoverage',   baseline: snapshot.baselineProppCoverage,   actual: current.proppCoverage },
    { metric: 'momentum',        baseline: snapshot.baselineMomentum,        actual: current.momentum },
  ];

  const regressions = checks
    .filter(c => c.baseline > 0 && c.actual < c.baseline * (1 - tolerance))
    .map(c => ({ ...c, delta: c.actual - c.baseline }));

  return { passed: regressions.length === 0, regressions };
}

// ── Build sidecar from Canon ──────────────────────────────────────────────────

export function buildSidecar(canon: Canon): NVMSidecar {
  const state = canon.state;
  const activeCommits = canon.commits.filter(c => !c.reverted);

  // Quality — run engine on a synthetic IR from the last commit's ops (if any)
  let qualityScore = 100;
  let arcDebt: string[] = [];
  let revealReady = false;
  let specificity = 1;
  let bDelta = 0;
  let necessityS = 1;
  let repairGaps: string[] = [];
  let proppPresent: ProppStage[] = [];
  let proppAbsent: ProppStage[] = ['preparation', 'complication', 'mediation', 'departure', 'ordeal', 'consequence', 'resolution'];
  let proppCoverage = 0;
  let perCharWarnings: Record<string, string[]> = {};

  if (activeCommits.length > 0) {
    const lastCommit = activeCommits[activeCommits.length - 1];
    const lastOps = lastCommit.ops;
    const syntheticIR = {
      transitionId: `sidecar_${lastCommit.commitId}`,
      sceneIdx: lastCommit.sceneIdx,
      sceneFunction: 'advance_plot' as const,
      activeMechanisms: [],
      beforeStateHash: 'sidecar',
      ops: lastOps,
      preconditions: [],
      postconditions: [],
      provenance: { origin: 'user_authored' as const, createdAt: lastCommit.createdAt },
    };

    const report = runQualityEngine(syntheticIR, state);
    qualityScore = report.score;
    arcDebt = report.arcDebt;
    revealReady = report.revealReady;
    specificity = report.specificity;
    bDelta = report.burrowsDelta;
    necessityS = report.necessityScore;
    repairGaps = report.repairGaps;
    proppPresent = report.proppAnalysis.present;
    proppAbsent = report.proppAnalysis.absent;
    proppCoverage = report.proppAnalysis.coverage;

    // Per-character warnings
    for (const w of report.warnings) {
      if (w.opIdx !== null) {
        const op = lastOps[w.opIdx];
        const charId = op && 'charId' in op ? (op as { charId: string }).charId : 'scene';
        perCharWarnings[charId] = [...(perCharWarnings[charId] ?? []), w.rule];
      }
    }

    // Burrows's delta across all commits
    const allOps = activeCommits.flatMap(c => c.ops);
    bDelta = burrowsDelta(allOps);
  }

  // Tension & momentum
  const ledger = deriveTensionLedger(state, activeCommits.length);
  const momentum = momentumScore(activeCommits);

  // Belief counts & emotion snapshot
  const beliefCounts: Record<string, number> = {};
  for (const [charId, beliefs] of Object.entries(state.characterBeliefs)) {
    beliefCounts[charId] = beliefs.length;
  }
  const emotionSnapshot: Record<string, { dominant: string; intensity: number }> = {};
  for (const [charId, emo] of Object.entries(state.characterEmotions)) {
    emotionSnapshot[charId] = { dominant: emo.dominant, intensity: emo.intensity };
  }

  return {
    nvmVersion: '12',
    sidecarId: randomUUID(),
    generatedAt: Date.now(),
    title: canon.title ?? 'untitled',
    qualityScore,
    arcDebt,
    revealReady,
    specificity,
    burrowsDelta: bDelta,
    necessityScore: necessityS,
    repairGaps,
    proppPresent,
    proppAbsent,
    proppCoverage,
    totalTension: ledger.totalTension,
    openPositions: ledger.positions.length,
    momentum,
    commitCount: activeCommits.length,
    revertedCount: canon.commits.filter(c => c.reverted).length,
    themeArgument: state.themeArgument,
    payoffs: state.payoffs,
    clues: state.clues,
    beliefCounts,
    emotionSnapshot,
    perCharacterWarnings: perCharWarnings,
  };
}
