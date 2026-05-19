// NarrativeModule — the 5-method pluggable contract every content engine
// implements (HYBRID_DECISION §6, decision 2). DirectorNode, Agent, and the
// ~18 other engines from the archive all collapse onto this interface.
// Locked here as a type only; no module is implemented in Wave 1.

import type { NarrativeState } from '../state/NarrativeState.ts';
import type { NarrativeTransitionIR } from '../ir/NarrativeTransitionIR.ts';
import type { ProofFinding, RepairSuggestion } from '../proof/contract.ts';

export interface ModulePressure {
  moduleId: string;
  urgency: number;             // 0–1
  readiness: number;           // 0–1
  riskIfIgnored: number;       // 0–1
  riskIfAdvancedNow: number;   // 0–1
  expectedPayoff: number;      // 0–1
  recommendedSceneFunctions: string[];
  explanation: string;
}

export interface ModuleProof {
  moduleId: string;
  pass: boolean;
  findings: ProofFinding[];
}

export interface ExplanationPanel {
  objectId: string;
  title: string;
  lines: string[];
}

export interface NarrativeModule {
  readonly id: string;
  inspect(state: NarrativeState): ModulePressure[];
  propose(state: NarrativeState, pressure: ModulePressure): NarrativeTransitionIR[];
  validate(transition: NarrativeTransitionIR, state: NarrativeState): ModuleProof;
  repair(finding: ProofFinding, state: NarrativeState): RepairSuggestion[];
  explain(objectId: string, state: NarrativeState): ExplanationPanel;
}
