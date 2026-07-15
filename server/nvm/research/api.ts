// Research API — V5.0 Research Platform Interface
//
// Provides high-level API for running narrative experiments, comparing theories,
// and validating hypotheses. This is the main entry point for research workflows.

import type {
  NarrativeTheory,
  NarrativeExperiment,
  NarrativeHypothesis,
  TheoryAnalysisResult,
  TheoryComparison,
  ExperimentResult,
  CorpusExperimentResult,
  HypothesisValidation,
  ScreenplayCorpus,
  ResearchSession,
  ResearchExport,
} from './types.ts';
import type { FountainAnalysis } from '../analyze/types.ts';
import { randomUUID } from 'node:crypto';

// ── Research API ──────────────────────────────────────────────────────────────

export class ResearchAPI {
  private theories: Map<string, NarrativeTheory> = new Map();
  private experiments: Map<string, NarrativeExperiment> = new Map();
  private hypotheses: Map<string, NarrativeHypothesis> = new Map();
  private corpora: Map<string, ScreenplayCorpus> = new Map();
  private sessions: Map<string, ResearchSession> = new Map();

  // ── Theory Management ─────────────────────────────────────────────────────────

  /**
   * Register a narrative theory implementation
   */
  registerTheory(theory: NarrativeTheory): void {
    this.theories.set(theory.id, theory);
  }

  /**
   * Get all registered theories
   */
  getTheories(): NarrativeTheory[] {
    return Array.from(this.theories.values());
  }

  /**
   * Get a specific theory by ID
   */
  getTheory(theoryId: string): NarrativeTheory | undefined {
    return this.theories.get(theoryId);
  }

  // ── Experiment Management ─────────────────────────────────────────────────────

  /**
   * Register an experiment
   */
  registerExperiment(experiment: NarrativeExperiment): void {
    this.experiments.set(experiment.id, experiment);
  }

  /**
   * Get all registered experiments
   */
  getExperiments(): NarrativeExperiment[] {
    return Array.from(this.experiments.values());
  }

  /**
   * Get a specific experiment by ID
   */
  getExperiment(experimentId: string): NarrativeExperiment | undefined {
    return this.experiments.get(experimentId);
  }

  // ── Hypothesis Management ─────────────────────────────────────────────────────

  /**
   * Register a hypothesis
   */
  registerHypothesis(hypothesis: NarrativeHypothesis): void {
    this.hypotheses.set(hypothesis.id, hypothesis);
  }

  /**
   * Get all registered hypotheses
   */
  getHypotheses(): NarrativeHypothesis[] {
    return Array.from(this.hypotheses.values());
  }

  // ── Core Research Operations ──────────────────────────────────────────────────

  /**
   * Run a narrative experiment on a screenplay
   */
  async runExperiment(
    experimentId: string,
    screenplay: FountainAnalysis
  ): Promise<ExperimentResult> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    return await experiment.run(screenplay);
  }

  /**
   * Run an experiment on a corpus
   */
  async runExperimentOnCorpus(
    experimentId: string,
    corpusId: string
  ): Promise<CorpusExperimentResult> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    const corpus = this.corpora.get(corpusId);
    if (!corpus) {
      throw new Error(`Corpus not found: ${corpusId}`);
    }

    // Load all screenplays
    const screenplays: FountainAnalysis[] = [];
    for (const meta of corpus.screenplays) {
      if (meta.analysis) {
        screenplays.push(meta.analysis);
      }
    }

    return await experiment.runOnCorpus(screenplays);
  }

  /**
   * Compare multiple theories on the same screenplay
   */
  async compareTheories(
    theoryIds: string[],
    screenplay: FountainAnalysis
  ): Promise<TheoryComparison> {
    const results: TheoryAnalysisResult[] = [];

    for (const theoryId of theoryIds) {
      const theory = this.theories.get(theoryId);
      if (!theory) {
        throw new Error(`Theory not found: ${theoryId}`);
      }

      const result = await theory.analyze(screenplay);
      results.push(result);
    }

    // Find best fit
    const sorted = [...results].sort((a, b) => b.adherenceScore - a.adherenceScore);
    const bestFit = sorted[0];

    // Find agreements and disagreements
    const agreements: string[] = [];
    const disagreements: string[] = [];

    // Simple heuristic: if theories have similar adherence scores, they agree
    const scoreTolerance = 15;
    for (let i = 0; i < results.length - 1; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const diff = Math.abs(results[i].adherenceScore - results[j].adherenceScore);
        if (diff < scoreTolerance) {
          agreements.push(
            `${results[i].theoryName} and ${results[j].theoryName} both rate this screenplay similarly (scores within ${diff.toFixed(1)} points)`
          );
        } else {
          disagreements.push(
            `${results[i].theoryName} scores ${results[i].adherenceScore.toFixed(1)}, but ${results[j].theoryName} scores ${results[j].adherenceScore.toFixed(1)}`
          );
        }
      }
    }

    return {
      screenplay: {
        title: 'Analyzed Screenplay',
        sceneCount: screenplay.sceneCount,
        wordCount: screenplay.wordCount,
      },
      theoryResults: results,
      bestFit: {
        theoryId: bestFit.theoryId,
        theoryName: bestFit.theoryName,
        adherenceScore: bestFit.adherenceScore,
        reason: `Highest adherence score among ${theoryIds.length} theories tested`,
      },
      agreements,
      disagreements,
      comparedAt: Date.now(),
    };
  }

  /**
   * Validate a hypothesis across a corpus
   */
  async validateHypothesis(
    hypothesisId: string,
    corpusId: string
  ): Promise<HypothesisValidation> {
    const hypothesis = this.hypotheses.get(hypothesisId);
    if (!hypothesis) {
      throw new Error(`Hypothesis not found: ${hypothesisId}`);
    }

    const corpus = this.corpora.get(corpusId);
    if (!corpus) {
      throw new Error(`Corpus not found: ${corpusId}`);
    }

    // Test hypothesis on each screenplay
    const tests = [];
    for (const meta of corpus.screenplays) {
      if (meta.analysis) {
        const test = await hypothesis.testFunction(meta.analysis);
        tests.push(test);
      }
    }

    // Calculate validation rate
    const validatedCount = tests.filter(t => t.validated).length;
    const validationRate = validatedCount / tests.length;

    // Determine verdict
    let verdict: 'VALIDATED' | 'REJECTED' | 'INCONCLUSIVE';
    if (validationRate >= 0.7) {
      verdict = 'VALIDATED';
    } else if (validationRate <= 0.3) {
      verdict = 'REJECTED';
    } else {
      verdict = 'INCONCLUSIVE';
    }

    // Gather evidence
    const evidence = tests
      .filter(t => t.validated)
      .slice(0, 5)
      .map(t => `Observed ${t.observed}, expected ${t.expected}`);

    const counterEvidence = tests
      .filter(t => !t.validated)
      .slice(0, 5)
      .map(t => `Observed ${t.observed}, expected ${t.expected}`);

    return {
      hypothesisId,
      statement: hypothesis.statement,
      sampleSize: tests.length,
      validationRate,
      tests,
      verdict,
      evidence,
      counterEvidence,
      validatedAt: Date.now(),
    };
  }

  // ── Corpus Management ─────────────────────────────────────────────────────────

  /**
   * Register a screenplay corpus
   */
  registerCorpus(corpus: ScreenplayCorpus): void {
    this.corpora.set(corpus.id, corpus);
  }

  /**
   * Get all registered corpora
   */
  getCorpora(): ScreenplayCorpus[] {
    return Array.from(this.corpora.values());
  }

  /**
   * Get a specific corpus by ID
   */
  getCorpus(corpusId: string): ScreenplayCorpus | undefined {
    return this.corpora.get(corpusId);
  }

  // ── Session Management ────────────────────────────────────────────────────────

  /**
   * Create a new research session
   */
  createSession(name: string, description: string): ResearchSession {
    const session: ResearchSession = {
      id: randomUUID(),
      name,
      description,
      experiments: [],
      theories: [],
      comparisons: [],
      validations: [],
      notes: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.sessions.set(session.id, session);
    return session;
  }

  /**
   * Get a research session
   */
  getSession(sessionId: string): ResearchSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Add result to session
   */
  addToSession(
    sessionId: string,
    result: ExperimentResult | TheoryAnalysisResult | TheoryComparison | HypothesisValidation
  ): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    if ('experimentId' in result && 'hypothesisSupported' in result) {
      session.experiments.push(result as ExperimentResult);
    } else if ('theoryId' in result && 'adherenceScore' in result) {
      session.theories.push(result as TheoryAnalysisResult);
    } else if ('theoryResults' in result) {
      session.comparisons.push(result as TheoryComparison);
    } else if ('validationRate' in result) {
      session.validations.push(result as HypothesisValidation);
    }

    session.updatedAt = Date.now();
  }

  /**
   * Add note to session
   */
  addNote(sessionId: string, note: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.notes.push(note);
    session.updatedAt = Date.now();
  }

  /**
   * Export session results
   */
  exportSession(sessionId: string): ResearchExport {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return {
      session,
      exportedAt: Date.now(),
    };
  }

  // ── Utility Methods ───────────────────────────────────────────────────────────

  /**
   * Get research platform statistics
   */
  getStats(): {
    theories: number;
    experiments: number;
    hypotheses: number;
    corpora: number;
    sessions: number;
  } {
    return {
      theories: this.theories.size,
      experiments: this.experiments.size,
      hypotheses: this.hypotheses.size,
      corpora: this.corpora.size,
      sessions: this.sessions.size,
    };
  }
}

// ── Singleton Instance ────────────────────────────────────────────────────────

export const researchAPI = new ResearchAPI();
