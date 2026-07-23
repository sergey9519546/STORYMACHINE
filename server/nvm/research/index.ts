// Research Platform Index — Main Exports
//
// Central export point for the V5.0 Research Platform

export { researchAPI, ResearchAPI } from './api.ts';
export { initializeResearchPlatform } from './dashboard.ts';
export * from './dashboard.ts';

// Types
export type {
  NarrativeTheory,
  NarrativeExperiment,
  NarrativeHypothesis,
  TheoryAnalysisResult,
  TheoryValidationResult,
  TheoryStage,
  ExperimentResult,
  CorpusExperimentResult,
  TheoryComparison,
  HypothesisTest,
  HypothesisValidation,
  ScreenplayCorpus,
  ScreenplayMetadata,
  CorpusStatistics,
  ResearchSession,
  ResearchExport,
  ChartData,
  GraphData,
  TableData,
} from './types.ts';

// Experiments
export { setupPayoffDistanceExperiment } from './experiments/setup-payoff-distance.ts';
export { quantumBranchingExperiment } from './experiments/quantum-branching.ts';
export { trinityGatePrecisionExperiment } from './experiments/trinity-gate-precision.ts';

// Theories
export { campbellHeroJourney } from './theories/campbell-hero-journey.ts';
export { freytagPyramid } from './theories/freytag-pyramid.ts';
