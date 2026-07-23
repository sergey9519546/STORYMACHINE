# Using V5.0 for Research

V5.0 Research Platform: Infrastructure for prototyping and validating narrative theories.

## Overview

The V5.0 Research Platform transforms StoryMachine into a testbed for narrative theory research. It provides:

- **Experiment Framework**: Run reproducible experiments on screenplays
- **Theory Implementations**: Test narrative theories (Campbell, Freytag, etc.)
- **Hypothesis Testing**: Validate assumptions about narrative structure
- **Corpus Analysis**: Run experiments across multiple screenplays
- **Research Sessions**: Track and export research findings

## Architecture

```
server/nvm/research/
├── types.ts              # Core type definitions
├── api.ts                # Research API layer
├── dashboard.ts          # CLI interface
├── index.ts              # Main exports
├── experiments/          # Narrative experiments
│   ├── setup-payoff-distance.ts
│   ├── quantum-branching.ts
│   └── trinity-gate-precision.ts
├── theories/             # Theory implementations
│   ├── campbell-hero-journey.ts
│   └── freytag-pyramid.ts
├── datasets/             # Screenplay corpora (your data)
└── results/              # Experiment outputs (generated)
```

## Quick Start

### 1. Initialize the Platform

```typescript
import { initializeResearchPlatform } from './server/nvm/research';

// Register all experiments and theories
initializeResearchPlatform();
```

### 2. Run an Experiment

```typescript
import { researchAPI } from './server/nvm/research';
import type { FountainAnalysis } from './server/nvm/analyze/types';

// Analyze a screenplay
const screenplay: FountainAnalysis = await analyzeFountainText(fountainContent);

// Run experiment
const result = await researchAPI.runExperiment(
  'setup-payoff-distance',
  screenplay
);

console.log(`Hypothesis: ${result.hypothesisSupported ? 'SUPPORTED' : 'NOT SUPPORTED'}`);
console.log(`Confidence: ${result.confidence}`);
console.log(`Findings:`, result.findings);
```

### 3. Compare Theories

```typescript
const comparison = await researchAPI.compareTheories(
  ['campbell-hero-journey', 'freytag-pyramid'],
  screenplay
);

console.log(`Best fit: ${comparison.bestFit.theoryName}`);
console.log(`Adherence: ${comparison.bestFit.adherenceScore}%`);
```

### 4. Validate Hypothesis Across Corpus

```typescript
// Register a corpus
researchAPI.registerCorpus({
  id: 'thriller-corpus',
  name: 'Thriller Screenplays',
  description: '50 produced thriller screenplays',
  screenplays: [...], // Your screenplay metadata
  count: 50,
  statistics: {...},
  createdAt: Date.now(),
});

// Run hypothesis validation
const validation = await researchAPI.validateHypothesis(
  'setup-payoff-optimal-distance',
  'thriller-corpus'
);

console.log(`Verdict: ${validation.verdict}`);
console.log(`Validation rate: ${validation.validationRate * 100}%`);
```

## Included Experiments

### Experiment 1: Setup/Payoff Distance

**Hypothesis**: Optimal distance between setup and payoff is 15-30 scenes

**Method**:
1. Extract setup→payoff pairs from screenplay
2. Calculate scene distance for each pair
3. Correlate distance with screenplay health
4. Test if mean distance falls in 15-30 range

**Use Case**: Determine optimal setup/payoff spacing for different genres

```typescript
const result = await researchAPI.runExperiment(
  'setup-payoff-distance',
  screenplay
);
```

### Experiment 2: Quantum Branching Utility

**Hypothesis**: Writers pick highest-probability branch 70% of time

**Method**:
1. Identify key decision points in screenplay
2. Generate quantum branches with Trinity Gate probabilities
3. Compare actual screenplay choices to probability rankings
4. Measure correlation

**Use Case**: Validate that Quantum Field probabilities align with writer intuition

```typescript
const result = await researchAPI.runExperiment(
  'quantum-branching-utility',
  screenplay
);
```

### Experiment 3: Trinity Gate Precision by Genre

**Hypothesis**: False positive rate correlates with genre

**Method**:
1. Classify screenplay by genre
2. Run Trinity Gate validation
3. Calculate precision (true positives / total)
4. Compare precision across genres

**Use Case**: Understand where Trinity Gate needs genre-specific tuning

```typescript
const result = await researchAPI.runExperiment(
  'trinity-gate-precision',
  screenplay
);
```

## Included Theories

### Theory 1: Campbell's Hero's Journey

**Structure**: 12-stage monomyth (Departure, Initiation, Return)

**Stages**:
1. Ordinary World
2. Call to Adventure
3. Refusal of the Call
4. Meeting the Mentor
5. Crossing the First Threshold
6. Tests, Allies, and Enemies
7. Approach to the Inmost Cave
8. Ordeal
9. Reward
10. The Road Back
11. Resurrection
12. Return with the Elixir

**Use Case**: Detect Hero's Journey structure, measure adherence

```typescript
const theory = researchAPI.getTheory('campbell-hero-journey');
const analysis = await theory.analyze(screenplay);

console.log(`Adherence: ${analysis.adherenceScore}%`);
console.log(`Shape: ${analysis.shape}`);
console.log(`Stages detected:`, analysis.stages);
```

### Theory 2: Freytag's Pyramid

**Structure**: 5-part dramatic arc with central climax

**Parts**:
1. Exposition
2. Rising Action
3. Climax (at midpoint)
4. Falling Action
5. Dénouement (Resolution)

**Use Case**: Detect classic dramatic structure, measure pyramid symmetry

```typescript
const theory = researchAPI.getTheory('freytag-pyramid');
const analysis = await theory.analyze(screenplay);

console.log(`Climax position: ${analysis.metrics.climaxPosition * 100}%`);
console.log(`Pyramid symmetry: ${analysis.metrics.pyramidSymmetry}`);
```

## Creating Custom Experiments

```typescript
import type { NarrativeExperiment, ExperimentResult } from './server/nvm/research';

const myExperiment: NarrativeExperiment = {
  id: 'my-experiment',
  name: 'My Narrative Experiment',
  hypothesis: 'State your hypothesis',
  methodology: 'Describe your method',
  expectedOutcome: 'What you expect to find',
  
  async run(screenplay: FountainAnalysis): Promise<ExperimentResult> {
    // Your analysis logic
    const measurements = {
      // Your measurements
    };
    
    const hypothesisSupported = /* your test */;
    
    return {
      experimentId: 'my-experiment',
      experimentName: 'My Narrative Experiment',
      hypothesisSupported,
      confidence: 0.8,
      measurements,
      findings: ['Finding 1', 'Finding 2'],
      rawData: {},
      executedAt: Date.now(),
    };
  },
  
  async runOnCorpus(corpus: FountainAnalysis[]): Promise<CorpusExperimentResult> {
    // Corpus-level analysis
  },
};

// Register it
researchAPI.registerExperiment(myExperiment);
```

## Creating Custom Theories

```typescript
import type { NarrativeTheory, TheoryAnalysisResult } from './server/nvm/research';

const myTheory: NarrativeTheory = {
  id: 'my-theory',
  name: 'My Narrative Theory',
  description: 'Description of the theory',
  source: 'Citation',
  
  async analyze(screenplay: FountainAnalysis): Promise<TheoryAnalysisResult> {
    // Detect stages
    const stages = [
      {
        name: 'Stage 1',
        startSceneIdx: 0,
        endSceneIdx: 10,
        confidence: 0.8,
        description: 'Description',
      },
      // ... more stages
    ];
    
    const adherenceScore = /* calculate score */;
    
    return {
      theoryId: 'my-theory',
      theoryName: 'My Narrative Theory',
      adherenceScore,
      stages,
      shape: 'Narrative shape description',
      observations: ['Observation 1', 'Observation 2'],
      metrics: {},
      analyzedAt: Date.now(),
    };
  },
  
  async validate(screenplay: FountainAnalysis): Promise<TheoryValidationResult> {
    // Validation logic
  },
};

// Register it
researchAPI.registerTheory(myTheory);
```

## Research Sessions

Track multiple analyses in a session:

```typescript
// Create session
const session = researchAPI.createSession(
  'Genre Structure Study',
  'Comparing thriller vs drama structure patterns'
);

// Run analyses
const result1 = await researchAPI.runExperiment('setup-payoff-distance', screenplay1);
researchAPI.addToSession(session.id, result1);

const result2 = await researchAPI.runExperiment('setup-payoff-distance', screenplay2);
researchAPI.addToSession(session.id, result2);

// Add notes
researchAPI.addNote(session.id, 'Thrillers show tighter setup/payoff spacing');

// Export session
const exportData = researchAPI.exportSession(session.id);
```

## CLI Dashboard

Use the built-in CLI for interactive research:

```typescript
import { 
  listAvailableCommand,
  runExperimentCommand,
  compareTheoriesCommand,
  analyzeWithTheoryCommand,
} from './server/nvm/research';

// List all resources
listAvailableCommand();

// Run experiment
await runExperimentCommand('setup-payoff-distance', screenplay);

// Compare theories
await compareTheoriesCommand(
  ['campbell-hero-journey', 'freytag-pyramid'],
  screenplay
);

// Detailed theory analysis
await analyzeWithTheoryCommand('campbell-hero-journey', screenplay);
```

## Data Requirements

### For Experiments

Experiments work with `FountainAnalysis` objects from the Script Doctor's analyzer:

```typescript
import { analyzeFountainText } from './server/nvm/analyze/fountain-analyzer';

const fountainText = await fs.readFile('screenplay.fountain', 'utf-8');
const analysis = await analyzeFountainText(fountainText);

// Now ready for experiments
const result = await researchAPI.runExperiment('setup-payoff-distance', analysis);
```

### For Corpus Studies

Create a corpus from multiple screenplays:

```typescript
const corpus: ScreenplayCorpus = {
  id: 'my-corpus',
  name: 'Study Corpus',
  description: '100 produced screenplays',
  screenplays: [
    {
      id: 'script-1',
      title: 'The Matrix',
      genre: 'sci-fi',
      year: 1999,
      fountainPath: './datasets/the-matrix.fountain',
      analysis: await analyzeFountainText(...),
    },
    // ... more screenplays
  ],
  count: 100,
  statistics: {
    totalScenes: 5000,
    totalWords: 1000000,
    avgScenesPerScreenplay: 50,
    avgWordsPerScreenplay: 10000,
  },
  createdAt: Date.now(),
};

researchAPI.registerCorpus(corpus);
```

## Best Practices

### 1. Version Your Experiments

Track changes to experiment logic:

```typescript
const setupPayoffDistanceV2: NarrativeExperiment = {
  id: 'setup-payoff-distance-v2',
  name: 'Setup/Payoff Distance Analysis v2',
  // ... updated logic
};
```

### 2. Cache Corpus Analyses

Pre-compute expensive analyses:

```typescript
// Cache analyses to disk
const cachedAnalysis = {
  ...metadata,
  analysis: await analyzeFountainText(fountainText),
  doctorReport: await runScriptDoctor(fountainText),
};

await fs.writeFile(
  `./datasets/cache/${metadata.id}.json`,
  JSON.stringify(cachedAnalysis)
);
```

### 3. Document Expected Outcomes

Always state your hypothesis clearly:

```typescript
const myExperiment = {
  hypothesis: 'Specific, testable statement',
  expectedOutcome: 'If hypothesis is true, we expect X',
  // ...
};
```

### 4. Export Session Data

Save results for publication:

```typescript
const exportData = researchAPI.exportSession(sessionId);
await fs.writeFile(
  `./results/session-${sessionId}.json`,
  JSON.stringify(exportData, null, 2)
);
```

## Example Workflow

Complete research workflow from data to publication:

```typescript
// 1. Initialize
initializeResearchPlatform();

// 2. Load corpus
const corpus = await loadCorpusFromDirectory('./datasets/thrillers');
researchAPI.registerCorpus(corpus);

// 3. Create session
const session = researchAPI.createSession(
  'Thriller Structure Study',
  'Analyzing narrative patterns in thriller screenplays'
);

// 4. Run experiments
for (const screenplay of corpus.screenplays) {
  const result = await researchAPI.runExperiment(
    'setup-payoff-distance',
    screenplay.analysis
  );
  researchAPI.addToSession(session.id, result);
}

// 5. Compare theories
for (const screenplay of corpus.screenplays.slice(0, 10)) {
  const comparison = await researchAPI.compareTheories(
    ['campbell-hero-journey', 'freytag-pyramid'],
    screenplay.analysis
  );
  researchAPI.addToSession(session.id, comparison);
}

// 6. Validate hypothesis
const validation = await researchAPI.validateHypothesis(
  'setup-payoff-optimal-distance',
  corpus.id
);
researchAPI.addToSession(session.id, validation);

// 7. Export for publication
const exportData = researchAPI.exportSession(session.id);
await fs.writeFile(
  `./results/thriller-study-${Date.now()}.json`,
  JSON.stringify(exportData, null, 2)
);

console.log('✓ Research complete');
```

## Next Steps

1. **Add More Experiments**: Implement experiments for your specific hypotheses
2. **Add More Theories**: Implement other narrative theories (Snyder, Truby, etc.)
3. **Build Visualizations**: Create charts from experiment results
4. **Statistical Analysis**: Add correlation, regression, significance testing
5. **Integration Testing**: Validate theories against known successful screenplays

## Questions?

The research platform is designed to be extended. See `types.ts` for the complete type system, or examine the included experiments and theories for implementation patterns.
