# Story Graph Phase 3 & 4 — Hybrid Implementation Design

**Date:** 2026-07-15  
**Status:** Design Complete, Ready for Implementation  
**Strategy:** Pattern-Matching MVP + LLM-Ready Architecture

---

## Executive Summary

**Challenge**: Phase 3 (Question Graph) and Phase 4 (Thematic Graph) ideally require LLM extraction for maximum accuracy. However, LLM integration is expensive, adds complexity, and shouldn't be done until user value is proven.

**Solution**: Hybrid approach
- **Ship now**: Pattern-matching detection (lightweight, zero cost, no new dependencies)
- **Upgrade later**: LLM extraction layer (after proving user value)
- **Architecture**: Design for LLM from day one, implement pattern-matching first

**Benefits**:
- Proves user value before expensive LLM commitment
- Gets feedback on structure/UX before committing to approach
- Allows A/B testing: pattern-matching vs LLM accuracy
- Follows "demand before rigor" principle

---

## Phase 3: Question Graph

### What Are Dramatic Questions?

Questions that drive narrative engagement:
- **Dramatic**: Will the hero survive? Will they fall in love?
- **Mystery**: Who killed him? What's in the briefcase?
- **Curiosity**: How will they escape? What happens next?
- **Thematic**: Is revenge justified? Can love conquer all?

### Question Lifecycle

1. **Posed**: Question is raised (explicitly or implicitly)
2. **Deepened**: Question becomes more complex/urgent
3. **Deferred**: Answer is delayed (suspense technique)
4. **Answered**: Question is resolved
5. **Abandoned**: Question is forgotten/dropped (BAD)

### Detection Methods

#### Method 1: Explicit Questions (Pattern Matching - MVP)

**Signals**:
- Question marks in dialogue: "Who killed him?"
- Question marks in action lines: "What will happen next?"
- Question words: who, what, when, where, why, how, will, can, did

**Implementation**:
```typescript
function extractExplicitQuestions(scene: ScreenplaySceneRecord): QuestionNode[] {
  const questions: QuestionNode[] = [];
  const text = scene.slug + ' ' + (scene.rawText || '');
  
  // Find sentences with question marks
  const questionSentences = text.match(/[^.!?]+\?/g) || [];
  
  for (const sentence of questionSentences) {
    const category = categorizeQuestion(sentence);
    questions.push({
      id: `question-${scene.sceneIdx}-${questions.length}`,
      type: 'question',
      questionText: sentence.trim(),
      category,
      posedAt: scene.sceneIdx,
      extractionMethod: 'explicit'
    });
  }
  
  return questions;
}

function categorizeQuestion(text: string): QuestionCategory {
  if (/^(who|whose)/i.test(text)) return 'mystery';
  if (/^(why|how)/i.test(text)) return 'curiosity';
  if (/^(will|can|could|should)/i.test(text)) return 'dramatic';
  if (/\b(right|wrong|just|moral|ethical)\b/i.test(text)) return 'thematic';
  return 'dramatic';  // default
}
```

**Pros**: Fast, deterministic, zero cost  
**Cons**: Only catches explicit questions, misses implied questions

#### Method 2: Implicit Questions (Setup-Based - MVP)

**Signals**:
- `seededClueIds` → "What will happen with this setup?"
- Character goals (if tracked) → "Will they achieve X?"
- Unresolved conflicts → "Who will win?"

**Implementation**:
```typescript
function extractImplicitQuestions(scene: ScreenplaySceneRecord): QuestionNode[] {
  const questions: QuestionNode[] = [];
  
  // Each seeded clue creates an implicit question
  for (const clueId of scene.seededClueIds) {
    questions.push({
      id: `question-implicit-${clueId}`,
      type: 'question',
      questionText: `What will happen with "${clueId}"?`,
      category: 'mystery',
      posedAt: scene.sceneIdx,
      extractionMethod: 'implicit'
    });
  }
  
  return questions;
}
```

**Pros**: Leverages existing signals, no new detection needed  
**Cons**: Generic questions, not specific to actual narrative

#### Method 3: LLM Extraction (Future Enhancement)

**Prompt**:
```
Analyze this screenplay scene and identify dramatic questions it raises.

Scene: {scene text}

For each question, provide:
1. questionText: The specific question (e.g., "Will Sarah escape the killer?")
2. category: dramatic | mystery | curiosity | thematic
3. confidence: How certain are you? (0-1)

Return as JSON array.
```

**Implementation** (stub for future):
```typescript
async function extractQuestionsLLM(
  scene: ScreenplaySceneRecord,
  llmProvider: 'openai' | 'anthropic'
): Promise<QuestionNode[]> {
  // Future: Call LLM API
  // Parse response into QuestionNode[]
  // Merge with pattern-matching results
  // Return combined list
  throw new Error('LLM extraction not yet implemented - use pattern matching');
}
```

**Pros**: High accuracy, catches implicit questions  
**Cons**: Cost, latency, rate limits, complexity

### Question Answering Detection

**How to detect when a question is answered?**

**Method 1: Setup-Payoff Mapping (MVP)**
- If implicit question came from seededClueId
- And that clue has payoffSetupIds
- Then question is answered at payoff scene

**Method 2: Semantic Similarity (Future)**
- Compare question text to scene text via embeddings
- If similarity > threshold, question may be answered
- Requires manual verification or LLM confirmation

**Method 3: LLM (Future)**
- Ask: "Does this scene answer the question 'X'?"
- Binary yes/no + explanation

### Question Metrics

```typescript
interface QuestionMetrics {
  totalQuestions: number;
  answeredQuestions: number;
  answerRatio: number;  // answered / total
  openQuestionCurve: number[];  // questions open at each scene
  avgLifespan: number;  // average scenes from pose to answer
  abandonedQuestions: QuestionNode[];  // posed but never answered
  questionDensity: { act1: number; act2: number; act3: number };
}
```

### Question Diagnostics

**Unanswered Question** (Medium severity):
```typescript
{
  severity: 'medium',
  type: 'unanswered-question',
  sceneIdx: 12,
  message: 'Question "Who killed him?" raised but never answered',
  impact: 'Unanswered mysteries frustrate audiences and feel like plot holes',
  suggestions: [
    'Add answer scene in Act 2 or 3 before the climax',
    'If intentionally left open (sequel hook), signal this to audience',
    'Consider if this mystery is necessary to the main plot'
  ],
  relatedScenes: [12],  // Where question was posed
  confidence: 0.8
}
```

**Questions Answered Too Quickly** (Low severity):
```typescript
{
  severity: 'low',
  type: 'quick-answer',
  sceneIdx: 5,
  message: 'Question raised in Scene 4 and answered in Scene 5 (1 scene gap)',
  impact: 'Quick answers reduce suspense. Consider building more anticipation.',
  suggestions: [
    'Defer answer by 3-5 scenes to build suspense',
    'Add complications before revealing answer',
    'Ensure audience cares about the question before answering'
  ],
  sceneRange: [4, 5],
  confidence: 0.6
}
```

**Question Drought** (Low severity):
```typescript
{
  severity: 'low',
  type: 'question-drought',
  sceneRange: [20, 35],
  message: 'No new questions raised for 15 scenes (Scene 20-35)',
  impact: 'Long stretches without questions can reduce narrative drive',
  suggestions: [
    'Add new mystery or complication in this section',
    'Raise stakes with "Will they succeed?" question',
    'Deepen existing question with new information'
  ],
  confidence: 0.7
}
```

---

## Phase 4: Thematic Graph

### What Are Themes?

Abstract ideas explored through story:
- **Value Statements**: "Love conquers all", "Revenge is futile"
- **Recurring Motifs**: Objects/images that repeat (the ring, the gun, water)
- **Symbols**: Objects representing ideas (white dove = peace, red rose = love)
- **Value Conflicts**: Opposing principles (freedom vs security, love vs duty)
- **Philosophical Arguments**: Thesis → antithesis → synthesis

### Theme Types

1. **Explicit Themes**: Stated in dialogue ("Revenge is a dish best served cold")
2. **Implicit Themes**: Demonstrated through action (character sacrifices self → sacrifice theme)
3. **Motifs**: Recurring objects/images across multiple scenes
4. **Symbols**: Objects with metaphorical meaning
5. **Value Conflicts**: Opposing positions dramatized and resolved

### Detection Methods

#### Method 1: Keyword Tracking (Pattern Matching - MVP)

**Thematic Word Lists**:
- Love: love, passion, romance, affection, devotion
- Betrayal: betray, deceive, lie, cheat, backstab
- Sacrifice: sacrifice, give up, surrender, renounce
- Power: power, control, dominate, command, rule
- Freedom: freedom, liberty, escape, independent, free
- Justice: justice, fair, right, wrong, moral

**Implementation**:
```typescript
const THEME_KEYWORDS = {
  love: ['love', 'passion', 'romance', 'affection', 'devotion', 'heart'],
  betrayal: ['betray', 'deceive', 'lie', 'cheat', 'backstab', 'traitor'],
  sacrifice: ['sacrifice', 'give up', 'surrender', 'renounce', 'forfeit'],
  power: ['power', 'control', 'dominate', 'command', 'rule', 'authority'],
  freedom: ['freedom', 'liberty', 'escape', 'independent', 'free', 'break free'],
  justice: ['justice', 'fair', 'right', 'wrong', 'moral', 'ethical'],
  revenge: ['revenge', 'vengeance', 'retribution', 'payback', 'avenge'],
  redemption: ['redeem', 'atone', 'forgive', 'salvation', 'absolve']
};

function extractKeywordThemes(scene: ScreenplaySceneRecord): ThemeNode[] {
  const text = (scene.rawText || '').toLowerCase();
  const themes: ThemeNode[] = [];
  
  for (const [themeName, keywords] of Object.entries(THEME_KEYWORDS)) {
    const matches = keywords.filter(kw => text.includes(kw));
    if (matches.length > 0) {
      themes.push({
        id: `theme-${scene.sceneIdx}-${themeName}`,
        type: 'theme',
        themeText: themeName,
        category: 'value-statement',
        sceneIdx: scene.sceneIdx,
        extractionMethod: 'keyword',
        confidence: Math.min(matches.length / 2, 1.0)  // More keywords = higher confidence
      });
    }
  }
  
  return themes;
}
```

**Pros**: Fast, deterministic, catches common themes  
**Cons**: Keyword-only, misses subtle/implicit themes

#### Method 2: Motif Detection (Recurring Objects - MVP)

**Track Recurring Nouns**:
- Extract nouns from all scenes (gun, ring, photograph, letter)
- Count occurrences across scenes
- If noun appears 3+ times → motif

**Implementation**:
```typescript
function extractMotifs(analysis: FountainAnalysis): ThemeNode[] {
  const nounCounts = new Map<string, number[]>();  // noun → scene indices
  
  // Count noun occurrences
  for (const [idx, scene] of analysis.records.entries()) {
    const text = scene.rawText || '';
    const nouns = extractNouns(text);  // Simple heuristic or POS tagging
    
    for (const noun of nouns) {
      if (!nounCounts.has(noun)) nounCounts.set(noun, []);
      nounCounts.get(noun)!.push(idx);
    }
  }
  
  // Motifs are nouns appearing 3+ times
  const motifs: ThemeNode[] = [];
  for (const [noun, scenes] of nounCounts.entries()) {
    if (scenes.length >= 3) {
      motifs.push({
        id: `motif-${noun}`,
        type: 'theme',
        themeText: `Motif: ${noun}`,
        category: 'motif',
        sceneIdx: scenes[0],  // First appearance
        extractionMethod: 'pattern',
        metadata: { appearances: scenes, count: scenes.length }
      });
    }
  }
  
  return motifs;
}

function extractNouns(text: string): string[] {
  // Simplified: capitalized words that aren't at sentence start
  // Future: Use NLP library for proper POS tagging
  const words = text.split(/\s+/);
  const nouns = [];
  for (let i = 1; i < words.length; i++) {  // Skip first word
    const word = words[i].replace(/[^a-zA-Z]/g, '');
    if (word.length > 3 && /^[A-Z]/.test(word)) {
      nouns.push(word.toLowerCase());
    }
  }
  return nouns;
}
```

**Pros**: Finds recurring objects automatically  
**Cons**: Many false positives (character names, locations)

#### Method 3: Symbolic Colors/Numbers (Pattern Matching - MVP)

**Symbol Dictionary**:
- Red → passion, violence, danger
- White → purity, innocence, death
- Black → evil, mystery, mourning
- Three → completeness, trinity
- Seven → luck, perfection

**Implementation**:
```typescript
const SYMBOLIC_COLORS = {
  red: ['passion', 'violence', 'danger', 'love'],
  white: ['purity', 'innocence', 'death', 'peace'],
  black: ['evil', 'mystery', 'mourning', 'power'],
  blue: ['sadness', 'tranquility', 'truth', 'loyalty'],
  green: ['growth', 'envy', 'nature', 'renewal']
};

function extractSymbols(scene: ScreenplaySceneRecord): ThemeNode[] {
  const text = (scene.rawText || '').toLowerCase();
  const symbols: ThemeNode[] = [];
  
  for (const [color, meanings] of Object.entries(SYMBOLIC_COLORS)) {
    if (text.includes(color)) {
      symbols.push({
        id: `symbol-${scene.sceneIdx}-${color}`,
        type: 'theme',
        themeText: `Symbol: ${color} (${meanings.join(', ')})`,
        category: 'symbol',
        sceneIdx: scene.sceneIdx,
        extractionMethod: 'pattern',
        confidence: 0.5  // Low confidence for pattern-based symbols
      });
    }
  }
  
  return symbols;
}
```

**Pros**: Catches obvious symbolic elements  
**Cons**: Context-blind (red could just be a shirt color)

#### Method 4: LLM Extraction (Future Enhancement)

**Prompt**:
```
Analyze this screenplay scene and identify themes it explores.

Scene: {scene text}

For each theme, provide:
1. themeText: The theme or idea (e.g., "Revenge vs Forgiveness", "Sacrifice for love")
2. category: value-statement | motif | symbol | argument
3. evidence: Which line/action demonstrates this theme?
4. confidence: How certain are you? (0-1)

Return as JSON array.
```

**Implementation** (stub for future):
```typescript
async function extractThemesLLM(
  scene: ScreenplaySceneRecord,
  llmProvider: 'openai' | 'anthropic'
): Promise<ThemeNode[]> {
  // Future: Call LLM API
  // Parse response into ThemeNode[]
  // Return thematic analysis
  throw new Error('LLM extraction not yet implemented - use pattern matching');
}
```

**Pros**: Understands implicit themes, context-aware  
**Cons**: Cost, latency, rate limits

### Theme Edges

```typescript
interface ThemeEdge extends StoryGraphEdge {
  type: 'theme-echo' | 'theme-contradiction' | 'theme-development' | 'theme-synthesis';
}
```

**Echo**: Scene B reinforces same theme as scene A
**Contradiction**: Scene B presents opposite theme (thesis vs antithesis)
**Development**: Scene B deepens theme from A
**Synthesis**: Scene B resolves opposing themes

**Detection** (Pattern Matching):
- Same theme keywords in different scenes → echo
- Opposing themes (love/hate, freedom/control) → contradiction
- Increasing theme intensity → development

### Theme Metrics

```typescript
interface ThemeMetrics {
  totalThemes: number;
  themeEchoes: number;  // How many times themes repeat
  motifCount: number;
  thematicUnity: number;  // 0-1, how coherent are themes
  dominantThemes: Array<{theme: string; count: number}>;
  valueConflicts: Array<{
    thesis: string;
    antithesis: string;
    resolved: boolean;
    scenes: number[];
  }>;
}
```

### Theme Diagnostics

**Orphaned Theme** (Low severity):
```typescript
{
  severity: 'low',
  type: 'orphaned-theme',
  sceneIdx: 12,
  message: 'Theme "redemption" introduced once but never developed',
  impact: 'Underdeveloped themes feel like wasted potential',
  suggestions: [
    'Add 2-3 more scenes exploring this theme',
    'Connect to character arc: show character achieving redemption',
    'If not central to story, consider removing to focus on main themes'
  ],
  confidence: 0.7
}
```

**Theme Overload** (Medium severity):
```typescript
{
  severity: 'medium',
  type: 'theme-overload',
  message: '12 different themes detected - may dilute focus',
  impact: 'Too many themes can confuse audiences about the story\'s meaning',
  suggestions: [
    'Identify 2-3 core themes and emphasize those',
    'Merge related themes (love, passion, devotion → love)',
    'Cut tangential themes that don\'t serve the main story'
  ],
  confidence: 0.6
}
```

**Motif Repetition Success** (Strength):
```typescript
{
  severity: 'strength',
  type: 'motif-repetition',
  message: 'Motif "gun" appears 5 times across the story (rule of three)',
  impact: 'Recurring motifs create satisfying patterns audiences recognize',
  suggestions: [
    'Ensure final appearance pays off earlier setups',
    'Consider symbolic meaning of this motif'
  ],
  confidence: 0.85
}
```

---

## Implementation Architecture

### Unified Multi-Layer Graph

```typescript
interface StoryGraphV2 {
  // Existing (Phase 1-2)
  causalLayer: {
    nodes: StoryGraphNode[];
    edges: StoryGraphEdge[];
    metrics: CausalMetrics;
  };
  
  // NEW (Phase 3)
  questionLayer: {
    nodes: QuestionNode[];
    edges: QuestionEdge[];
    metrics: QuestionMetrics;
  };
  
  // NEW (Phase 4)
  themeLayer: {
    nodes: ThemeNode[];
    edges: ThemeEdge[];
    metrics: ThemeMetrics;
  };
  
  // Cross-layer connections
  crossLayerEdges: CrossLayerEdge[];
}

interface CrossLayerEdge {
  source: string;  // node id from any layer
  target: string;  // node id from any layer
  type: 'question-resolves-setup' | 'theme-reinforces-arc' | 'question-explores-theme';
}
```

### Extraction Pipeline

```typescript
export function buildMultiLayerGraph(analysis: FountainAnalysis): StoryGraphV2 {
  // Phase 1-2: Causal layer (existing)
  const causalLayer = buildCausalLayer(analysis);
  
  // Phase 3: Question layer (NEW)
  const questionLayer = buildQuestionLayer(analysis);
  
  // Phase 4: Theme layer (NEW)
  const themeLayer = buildThemeLayer(analysis);
  
  // Cross-layer connections
  const crossLayerEdges = findCrossLayerConnections(
    causalLayer,
    questionLayer,
    themeLayer
  );
  
  return {
    causalLayer,
    questionLayer,
    themeLayer,
    crossLayerEdges
  };
}

function buildQuestionLayer(analysis: FountainAnalysis): QuestionLayer {
  const nodes: QuestionNode[] = [];
  
  for (const scene of analysis.records) {
    // Extract explicit questions (MVP)
    nodes.push(...extractExplicitQuestions(scene));
    
    // Extract implicit questions from setups (MVP)
    nodes.push(...extractImplicitQuestions(scene));
    
    // Future: Extract via LLM
    // nodes.push(...await extractQuestionsLLM(scene));
  }
  
  // Match questions to answers
  const edges = matchQuestionsToAnswers(nodes, analysis);
  
  // Compute metrics
  const metrics = computeQuestionMetrics(nodes, edges, analysis);
  
  return { nodes, edges, metrics };
}

function buildThemeLayer(analysis: FountainAnalysis): ThemeLayer {
  const nodes: ThemeNode[] = [];
  
  for (const scene of analysis.records) {
    // Extract keyword themes (MVP)
    nodes.push(...extractKeywordThemes(scene));
    
    // Extract symbols (MVP)
    nodes.push(...extractSymbols(scene));
  }
  
  // Extract motifs (cross-scene analysis)
  nodes.push(...extractMotifs(analysis));
  
  // Future: Extract via LLM
  // nodes.push(...await extractThemesLLM(scene));
  
  // Find theme echoes and contradictions
  const edges = findThemeRelationships(nodes);
  
  // Compute metrics
  const metrics = computeThemeMetrics(nodes, edges, analysis);
  
  return { nodes, edges, metrics };
}
```

### Enhanced Diagnostics Integration

Add to existing diagnostic system:

```typescript
export function analyzeStoryGraph(analysis: FountainAnalysis): StoryGraphReport {
  const graph = buildMultiLayerGraph(analysis);
  
  // Existing causal diagnostics (Phase 1-2)
  const causalDiagnostics = generateCausalDiagnostics(graph.causalLayer, analysis);
  
  // NEW: Question diagnostics (Phase 3)
  const questionDiagnostics = generateQuestionDiagnostics(graph.questionLayer, analysis);
  
  // NEW: Theme diagnostics (Phase 4)
  const themeDiagnostics = generateThemeDiagnostics(graph.themeLayer, analysis);
  
  // Merge all diagnostics by severity
  const allDiagnostics = mergeAndRankDiagnostics([
    causalDiagnostics,
    questionDiagnostics,
    themeDiagnostics
  ]);
  
  return {
    graph,
    diagnostics: allDiagnostics,
    summary: computeOverallSummary(allDiagnostics)
  };
}
```

---

## Testing Strategy

### Phase 3 Tests

**Question Detection**:
- Explicit questions from dialogue
- Implicit questions from setups
- Question categorization (dramatic, mystery, curiosity, thematic)

**Question Matching**:
- Questions matched to answers via setup-payoff
- Question lifespan calculation
- Abandoned question detection

**Question Diagnostics**:
- Unanswered question warnings
- Questions answered too quickly
- Question drought detection

### Phase 4 Tests

**Theme Detection**:
- Keyword theme extraction
- Motif detection (recurring objects)
- Symbol detection (colors, numbers)

**Theme Relationships**:
- Theme echoes (repetition)
- Theme contradictions (oppositions)
- Value conflicts

**Theme Diagnostics**:
- Orphaned theme warnings
- Theme overload warnings
- Motif repetition strengths

---

## Migration Path to LLM

### Phase 3 LLM Upgrade

```typescript
// Add configuration flag
const USE_LLM_QUESTIONS = process.env.STORY_GRAPH_USE_LLM === 'true';

function buildQuestionLayer(analysis: FountainAnalysis): QuestionLayer {
  if (USE_LLM_QUESTIONS) {
    return buildQuestionLayerLLM(analysis);  // Future implementation
  } else {
    return buildQuestionLayerPatternMatching(analysis);  // Current MVP
  }
}
```

### Phase 4 LLM Upgrade

```typescript
const USE_LLM_THEMES = process.env.STORY_GRAPH_USE_LLM_THEMES === 'true';

function buildThemeLayer(analysis: FountainAnalysis): ThemeLayer {
  if (USE_LLM_THEMES) {
    return buildThemeLayerLLM(analysis);  // Future implementation
  } else {
    return buildThemeLayerPatternMatching(analysis);  // Current MVP
  }
}
```

### A/B Testing

Run both methods, compare results:

```typescript
async function compareExtractionMethods(analysis: FountainAnalysis) {
  const patternQuestions = buildQuestionLayerPatternMatching(analysis);
  const llmQuestions = await buildQuestionLayerLLM(analysis);
  
  console.log('Pattern matching found:', patternQuestions.nodes.length);
  console.log('LLM found:', llmQuestions.nodes.length);
  console.log('Overlap:', computeOverlap(patternQuestions, llmQuestions));
  
  // User preference: which results are more useful?
}
```

---

## Cost Analysis

### Pattern Matching (MVP)
- **Cost**: $0
- **Latency**: <10ms per script
- **Accuracy**: ~60-70% (explicit questions, keyword themes)
- **Scalability**: Unlimited

### LLM Extraction (Future)
- **Cost**: ~$0.01-0.10 per script (depending on length, model)
- **Latency**: 1-5 seconds per script
- **Accuracy**: ~85-95% (implicit questions, subtle themes)
- **Scalability**: Rate limited

### Hybrid (Best)
- Use pattern matching for fast/obvious detection
- Use LLM for ambiguous/implicit cases
- Cache LLM results
- Cost: ~$0.005 per script (5-10% of scenes need LLM)

---

## Implementation Timeline

**Phase 3 (Question Graph)**:
- Day 1: Explicit question detection + tests
- Day 2: Implicit question detection + metrics + diagnostics + tests
- Day 3: Integration with existing system + full test suite

**Phase 4 (Thematic Graph)**:
- Day 4: Keyword theme + motif + symbol detection + tests
- Day 5: Theme relationships + metrics + diagnostics + tests
- Day 6: Integration + full test suite + documentation

**Total**: 6 days for MVP pattern-matching versions of both phases

**LLM Upgrade** (future):
- Week 1: LLM prompt engineering + testing
- Week 2: Integration, A/B testing, cost optimization
- Week 3: User validation, accuracy measurement

---

## Success Criteria

### Phase 3 (Questions)
- ✅ Detects explicit questions with >90% precision
- ✅ Detects implicit questions from setups
- ✅ Categorizes questions correctly >80% of the time
- ✅ Matches questions to answers via setup-payoff
- ✅ All tests passing
- 📊 User validation: Writers find question tracking useful

### Phase 4 (Themes)
- ✅ Detects common themes via keywords >70% recall
- ✅ Finds recurring motifs (3+ appearances)
- ✅ Identifies theme echoes across scenes
- ✅ All tests passing
- 📊 User validation: Writers find theme analysis useful

---

## Next Steps

1. **Implement Phase 3** (Question Graph pattern-matching)
2. **Test Phase 3** on calibration corpus
3. **Implement Phase 4** (Thematic Graph pattern-matching)
4. **Test Phase 4** on calibration corpus
5. **User validation** (show to writers, collect feedback)
6. **If successful**: Plan LLM upgrade
7. **If not**: Iterate on pattern-matching accuracy

---

This hybrid design allows us to ship both phases quickly (6 days), prove user value, then decide if LLM investment is warranted based on real usage data.
