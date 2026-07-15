// Research Platform Types — V5.0 Research Infrastructure
//
// Defines the type system for using V5.0 as a research platform to prototype
// and validate narrative theories. All experiments, theories, and results use
// these shared types for consistency and composability.

import type { FountainAnalysis, ScriptDoctorReport } from '../analyze/types.ts';
import type { ScreenplaySceneRecord } from '../screenplay/memory.ts';
import type { StoryGraph } from '../analyze/story-graph.ts';
import type { QuantumStoryState } from '../quantum/types.ts';

// ── Core Research Types ───────────────────────────────────────────────────────

/** A narrative theory implementation that can analyze screenplays */
export interface NarrativeTheory {
  /** Unique identifier for the theory */
  id: string;
  
  /** Display name (e.g., "Campbell's Hero's Journey") */
  name: string;
  
  /** Short description of the theory */
  description: string;
  
  /** Reference citation (book, paper, etc.) */
  source?: string;
  
  /** Analyze a screenplay according to this theory */
  analyze(screenplay: FountainAnalysis): Promise<TheoryAnalysisResult>;
  
  /** Validate that a screenplay follows this theory's structure */
  validate(screenplay: FountainAnalysis): Promise<TheoryValidationResult>;
}

/** Result of analyzing a screenplay through a theory's lens */
export interface TheoryAnalysisResult {
  theoryId: string;
  theoryName: string;
  
  /** 0-100 adherence score to the theory */
  adherenceScore: number;
  
  /** Detected stages/phases of the theory */
  stages: TheoryStage[];
  
  /** Overall narrative shape according to theory */
  shape: string;
  
  /** Observations specific to this theory */
  observations: string[];
  
  /** Computed metrics */
  metrics: Record<string, number>;
  
  analyzedAt: number;
}

/** A stage/phase identified by a theory */
export interface TheoryStage {
  name: string;
  startSceneIdx: number;
  endSceneIdx: number;
  confidence: number;  // 0-1
  description?: string;
}

/** Validation result for theory compliance */
export interface TheoryValidationResult {
  isValid: boolean;
  adherenceScore: number;
  missingElements: string[];
  presentElements: string[];
  suggestions: string[];
}

// ── Experiment Types ──────────────────────────────────────────────────────────

/** A research experiment that tests a hypothesis */
export interface NarrativeExperiment {
  /** Unique identifier */
  id: string;
  
  /** Experiment name */
  name: string;
  
  /** Research hypothesis being tested */
  hypothesis: string;
  
  /** Detailed methodology description */
  methodology: string;
  
  /** Expected outcome if hypothesis is true */
  expectedOutcome: string;
  
  /** Run the experiment on a screenplay */
  run(screenplay: FountainAnalysis): Promise<ExperimentResult>;
  
  /** Run on a corpus of screenplays */
  runOnCorpus(corpus: FountainAnalysis[]): Promise<CorpusExperimentResult>;
}

/** Result of running an experiment on a single screenplay */
export interface ExperimentResult {
  experimentId: string;
  experimentName: string;
  
  /** Was the hypothesis supported? */
  hypothesisSupported: boolean;
  
  /** Confidence level 0-1 */
  confidence: number;
  
  /** Measured values */
  measurements: Record<string, number>;
  
  /** Observations and findings */
  findings: string[];
  
  /** Raw data for further analysis */
  rawData: Record<string, unknown>;
  
  executedAt: number;
}

/** Result of running an experiment on multiple screenplays */
export interface CorpusExperimentResult {
  experimentId: string;
  experimentName: string;
  
  /** Number of screenplays analyzed */
  sampleSize: number;
  
  /** Overall hypothesis support rate */
  supportRate: number;
  
  /** Aggregate statistics */
  statistics: {
    mean: number;
    median: number;
    stdDev: number;
    min: number;
    max: number;
  };
  
  /** Per-screenplay results */
  individualResults: ExperimentResult[];
  
  /** Correlation analysis */
  correlations?: Record<string, number>;
  
  /** Statistical significance */
  pValue?: number;
  
  /** Summary and interpretation */
  summary: string;
  
  executedAt: number;
}

// ── Theory Comparison ─────────────────────────────────────────────────────────

/** Compare multiple theories on the same screenplay */
export interface TheoryComparison {
  screenplay: {
    title: string;
    sceneCount: number;
    wordCount: number;
  };
  
  /** Results from each theory */
  theoryResults: TheoryAnalysisResult[];
  
  /** Which theory best explains this screenplay */
  bestFit: {
    theoryId: string;
    theoryName: string;
    adherenceScore: number;
    reason: string;
  };
  
  /** Areas of agreement between theories */
  agreements: string[];
  
  /** Areas of disagreement */
  disagreements: string[];
  
  comparedAt: number;
}

// ── Hypothesis Validation ─────────────────────────────────────────────────────

/** A testable hypothesis about narrative structure */
export interface NarrativeHypothesis {
  id: string;
  statement: string;
  
  /** What to measure */
  measurements: string[];
  
  /** Expected value or range */
  expectedValue: number | [number, number];
  
  /** How to test this hypothesis */
  testFunction: (screenplay: FountainAnalysis) => Promise<HypothesisTest>;
}

/** Result of testing a hypothesis */
export interface HypothesisTest {
  hypothesisId: string;
  statement: string;
  
  /** Observed value(s) */
  observed: number | number[];
  
  /** Expected value(s) */
  expected: number | [number, number];
  
  /** Is the hypothesis validated? */
  validated: boolean;
  
  /** Confidence level */
  confidence: number;
  
  /** Statistical details */
  statistics?: {
    chiSquare?: number;
    tTest?: number;
    pValue?: number;
  };
  
  testedAt: number;
}

/** Validate hypothesis across a corpus */
export interface HypothesisValidation {
  hypothesisId: string;
  statement: string;
  
  /** Number of samples */
  sampleSize: number;
  
  /** Validation rate */
  validationRate: number;
  
  /** Individual tests */
  tests: HypothesisTest[];
  
  /** Overall verdict */
  verdict: 'VALIDATED' | 'REJECTED' | 'INCONCLUSIVE';
  
  /** Supporting evidence */
  evidence: string[];
  
  /** Counter-evidence */
  counterEvidence: string[];
  
  validatedAt: number;
}

// ── Dataset Management ────────────────────────────────────────────────────────

/** A collection of screenplays for research */
export interface ScreenplayCorpus {
  id: string;
  name: string;
  description: string;
  
  /** Screenplay metadata */
  screenplays: ScreenplayMetadata[];
  
  /** Total size */
  count: number;
  
  /** Corpus-level statistics */
  statistics: CorpusStatistics;
  
  createdAt: number;
}

export interface ScreenplayMetadata {
  id: string;
  title: string;
  author?: string;
  genre?: string;
  year?: number;
  
  /** Path to Fountain file */
  fountainPath: string;
  
  /** Pre-computed analysis (cached) */
  analysis?: FountainAnalysis;
  
  /** Pre-computed doctor report (cached) */
  doctorReport?: ScriptDoctorReport;
}

export interface CorpusStatistics {
  totalScenes: number;
  totalWords: number;
  avgScenesPerScreenplay: number;
  avgWordsPerScreenplay: number;
  
  /** Genre breakdown */
  genreDistribution?: Record<string, number>;
  
  /** Health score distribution */
  healthDistribution?: {
    excellent: number;  // >= 90
    strong: number;     // >= 75
    solid: number;      // >= 55
    uneven: number;     // >= 35
    troubled: number;   // < 35
  };
}

// ── Research Session ──────────────────────────────────────────────────────────

/** A research session that can run multiple experiments/theories */
export interface ResearchSession {
  id: string;
  name: string;
  description: string;
  
  /** Experiments run in this session */
  experiments: ExperimentResult[];
  
  /** Theory analyses */
  theories: TheoryAnalysisResult[];
  
  /** Comparisons performed */
  comparisons: TheoryComparison[];
  
  /** Hypothesis validations */
  validations: HypothesisValidation[];
  
  /** Session notes */
  notes: string[];
  
  createdAt: number;
  updatedAt: number;
}

// ── Research Export ───────────────────────────────────────────────────────────

/** Exportable research results for publication/sharing */
export interface ResearchExport {
  session: ResearchSession;
  
  /** Generated visualizations */
  visualizations?: {
    charts: ChartData[];
    graphs: GraphData[];
  };
  
  /** Statistical tables */
  tables?: Record<string, TableData>;
  
  /** Formatted for academic paper */
  academicFormat?: {
    abstract: string;
    methodology: string;
    results: string;
    discussion: string;
    references: string[];
  };
  
  exportedAt: number;
}

export interface ChartData {
  type: 'line' | 'bar' | 'scatter' | 'histogram';
  title: string;
  data: Array<{ x: number | string; y: number }>;
  xLabel?: string;
  yLabel?: string;
}

export interface GraphData {
  type: 'network' | 'tree' | 'flow';
  nodes: Array<{ id: string; label: string; value?: number }>;
  edges: Array<{ source: string; target: string; weight?: number }>;
}

export interface TableData {
  headers: string[];
  rows: Array<(string | number)[]>;
}
