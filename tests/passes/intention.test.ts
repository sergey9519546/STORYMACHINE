// Extracted from the former monolithic test.ts (audit M2.1 — split for maintainability).
// intentionPass revision-rule tests. Shared imports/helpers below are duplicated verbatim across every split
// file (harmless — each file is its own module scope) so no unit here depends on
// anything outside this file.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { safeJsonParse } from '../../src/lib/json.ts';
import { withTimeout, generateContent, generateContentStream, setLLMProvider, resetLLMProvider, setEmbeddingProvider, setImageProvider, setTTSProvider, getEmbeddingProvider, getImageProvider, getTTSProvider, resetAllProviders, noopImageProvider, noopTTSProvider, noopEmbeddingProvider, getModel, modelForTask } from '../../server/engine/ai.ts';
import { analyzeSubtext } from '../../server/lib/subtext-meter.ts';
import { genrePromptBlock, GENRE_MODIFIERS, GENRE_NAMES } from '../../server/lib/genre-router.ts';
import { scoreBelief, retrieveBeliefs, consolidateBeliefs, decayBeliefConfidence } from '../../server/lib/memory.ts';
import { metrics } from '../../server/lib/metrics.ts';
import { actionBiasWeights, defenseActionBias, effectiveScore, attachmentActionBias } from '../../server/lib/personality.ts';
import { AppraisalEngine } from '../../server/engine/AppraisalEngine.ts';
import { validate, InitBodySchema, TurnBodySchema, RunRoomBodySchema, ImportBodySchema, AiConfigSchema } from '../../server/lib/validation.ts';
import { geminiSchemaToJsonSchema } from '../../server/lib/ai-providers/schema.ts';
import { makeOpenAICompatLLMProvider, makeOpenAICompatEmbeddingProvider } from '../../server/lib/ai-providers/openai-compat.ts';
import { applyConfig, getPublicConfig, initFromEnv } from '../../server/lib/ai-config.ts';
import type { GenerateContentParameters, GenerateContentResponse } from '@google/genai';
import {
  describeAttachment,
  selectActiveDefense,
  describeActionBias,
  deriveSpeechPattern,
  computeDefenseLevel,
  selectPersuasionStrategy,
  getReadyGoals,
} from '../../server/engine/agent/psychology.ts';
import { validatePersona, PERSONA_LIMITS } from '../../server/personas/types.ts';
import { renderTemplate, getPrompt, hasPrompt } from '../../server/lib/prompts.ts';
import { parseRoomId, collabRoomCount } from '../../server/collab/yjs-server.ts';
import {
  listPersonas,
  getPersona,
  registerUserPersona,
  personaPromptBlock,
  _resetUserPersonas,
} from '../../server/personas/registry.ts';
import { STORY_OP_KINDS } from '../../server/nvm/ops/StoryOp.ts';
import type { StoryOp } from '../../server/nvm/ops/StoryOp.ts';
import { PROOF_TIERS, passResult, failResult } from '../../server/nvm/proof/contract.ts';
import type { ProofName } from '../../server/nvm/proof/contract.ts';
import { emptyState, stateHash, relationshipKey } from '../../server/nvm/state/NarrativeState.ts';
import type { NarrativeState } from '../../server/nvm/state/NarrativeState.ts';
import { buildEnrichedState } from '../../server/nvm/state/enrichedState.ts';
import { applyStoryOp, applyStoryOps } from '../../server/nvm/ops/dispatcher.ts';
import { loadMechanisms, loadMechanismsCached } from '../../server/nvm/mechanisms/loader.ts';
import { runTier1, tier1Passes, runTier2, tier2Score, runTier3, tier3Rank, runTier4 } from '../../server/nvm/proof/kernel.ts';
import { runM15Harness, buildNoraWarehouseIR } from '../../server/nvm/__tests__/m1.5-harness.ts';
import { whatBreaksIfRemoved } from '../../server/nvm/query/whatBreaks.ts';
import { summarizeOps } from '../../server/nvm/state/StoryCommit.ts';
import type { StoryCommit } from '../../server/nvm/state/StoryCommit.ts';
import { makePrng, randInt, shuffle, seedFromString } from '../../server/nvm/repro/seed.ts';
import { buildManifest, replayManifest } from '../../server/nvm/repro/manifest.ts';
import { appendGhost, getGhosts, branchFromGhost } from '../../server/nvm/repro/ghost-ledger.ts';
import type { GhostCommit } from '../../server/nvm/repro/ghost-ledger.ts';
import { explainAction } from '../../server/nvm/debug/inspector.ts';
import { earnedRevealProof } from '../../server/nvm/proof/tier1/earnedReveal.ts';
import { causalProof as causalProofB2 } from '../../server/nvm/proof/tier1/causal.ts';
import { intentionalProof as intentionalProofB3 } from '../../server/nvm/proof/tier1/intentional.ts';
import { repair } from '../../server/nvm/proof/repair.ts';
import { lint } from '../../server/nvm/proof/lint.ts';
import type { RevealPlan } from '../../server/nvm/reveal/RevealPlan.ts';
import {
  openPosition, markToMarket as mtm, deriveTensionLedger, tensionMonotone,
} from '../../server/nvm/valuation/futures.ts';
import { redTeamVerdict } from '../../server/nvm/valuation/audience-redteam.ts';
import { twoReaderReport } from '../../server/nvm/valuation/two-reader.ts';
import { computeTopology, onTrackForArc, computeTrajectoryMomentum } from '../../server/nvm/valuation/topology.ts';
import {
  proofsToConstraints, buildGenerationSpec, buildSystemPreamble,
  type CandidateGenerator, type SceneTarget,
} from '../../server/nvm/generate/proof-spec.ts';
import { applyOperator, ALL_OPERATORS } from '../../server/nvm/converge/operators.ts';
import { convergeScene } from '../../server/nvm/converge/loop.ts';
import { runWritersRoom } from '../../server/nvm/room/room.ts';
import { buildSCM } from '../../server/nvm/twin/scm.ts';
import { doIntervention } from '../../server/nvm/twin/counterfactual.ts';
import { project, type Canon, type ProjectionTarget } from '../../server/nvm/project/index.ts';
import { buildSidecar, captureRegressionSnapshot, checkRegression } from '../../server/nvm/project/sidecar.ts';
import { planToward, type FixedPoint } from '../../server/nvm/author/fixed-points.ts';
import { backchain, scheduleToGoalBiases } from '../../server/nvm/author/backchain.ts';
import { runSelfPlay, type SimScenario } from '../../server/nvm/selfplay/corpus.ts';
import { mineCorpus, queryPolicy } from '../../server/nvm/selfplay/mine.ts';
import { extractGenome, diffGenomes, breedGenomes } from '../../server/nvm/selfplay/genome.ts';
import { TACTIC_TYPES, isDeceptive, isEmotional, tacticIronyWeight } from '../../server/nvm/ops/tactic-types.ts';
import { buildMetaBelief, getMetaBeliefsAbout, holderBelievesThatTargetBelieves, upsertMetaBelief } from '../../server/nvm/ops/meta-belief.ts';
import { contractBelief, reviseBelief, planContraction, initCredence, updateCredence, applyCredence } from '../../server/nvm/ops/belief-revision.ts';
import {
  runQualityEngine, specificityScore, computeArcDebt, revealReady, necessityScore,
  burrowsDelta, relationshipRepairGaps, buildCausalGraph, proppMorphology,
  dialogueWarnings,
} from '../../server/nvm/quality/index.ts';
import { momentumScore } from '../../server/nvm/valuation/futures.ts';
import { makeLLMCandidateGenerator } from '../../server/nvm/generate/llm-generator.ts';

// ── Causal-Epistemic Spine — one-lie vertical slice ──────────────────────────
// Alice lies to Bob. Bob finds contradictory evidence.
// Verifies: EventCard, sourced beliefs, BeliefEdge, GoalMutation,
//           DramaticPressure, BeatTrace, and Fountain [[BEAT:...]] output.

import { Stage } from '../../server/engine/Stage.ts';
import { exportCharacter, importCharacter, isCharacterMemoryBundle, CHARACTER_BUNDLE_SCHEMA_VERSION } from '../../server/engine/character-memory.ts';
import { CausalSpine } from '../../server/engine/CausalSpine.ts';
import { Orchestrator } from '../../server/engine/Orchestrator.ts';
import { transcriptToFountain } from '../../server/lib/fountain.ts';
import { parseFountain } from '../../src/lib/fountain.ts';
import { fountainToFdx } from '../../src/lib/fdx.ts';
import { layoutScreenplay, LINES_PER_PAGE } from '../../src/lib/screenplay-layout.ts';
import { fountainToPdf } from '../../src/lib/pdf.ts';
import { buildZip } from '../../src/lib/zip.ts';
import { fountainToDocx } from '../../src/lib/docx.ts';
import type { ActionLogEntry, Belief, CharacterSheet, Location } from '../../server/engine/types.ts';
import { ACTION_TYPES } from '../../server/engine/types.ts';

function makeStage(): Stage {
  const stage = new Stage(':memory:');
  const loc: Location = {
    location_id: 'room1',
    name: 'The Study',
    description: 'A dusty room.',
    adjacent_locations: [],
  };
  stage.addLocation(loc);

  const alice: CharacterSheet = {
    char_id: 'alice',
    name: 'Alice',
    public_mask: 'Librarian',
    hidden_motive: 'Steal the ledger',
    knowledge_vector: [],
    current_location_id: 'room1',
    suspicion_score: 10,
    is_alive: true,
    goalStack: {
      terminal: { id: 'g0', description: 'Get the ledger', value: 100, achieved: false },
      instrumental: [{ id: 'g1', description: 'Keep Bob distracted', value: 70, achieved: false }],
      last_planned_at: 0,
    },
  };

  const bob: CharacterSheet = {
    char_id: 'bob',
    name: 'Bob',
    public_mask: 'Detective',
    hidden_motive: 'Expose the thief',
    knowledge_vector: [],
    current_location_id: 'room1',
    suspicion_score: 5,
    is_alive: true,
    goalStack: {
      terminal: { id: 'g2', description: 'Identify the thief', value: 100, achieved: false },
      instrumental: [{ id: 'g3', description: 'Gather evidence', value: 60, achieved: false }],
      last_planned_at: 0,
    },
  };

  stage.addAgent(alice);
  stage.addAgent(bob);
  return stage;
}

// ──────────────────────────────────────────────────────────────────────────────
// NVM Wave 1 — substrate: StoryOp vocabulary, proof contract, dispatcher
// ──────────────────────────────────────────────────────────────────────────────

const sampleBelief = (id: string) => ({
  id, proposition: `prop-${id}`, confidence: 0.8,
  source: 'witnessed' as const, acquired_at: 1,
});

const sampleEmotion = () => ({
  joy: 0, distress: 50, anger: 0, fear: 0, pride: 0, shame: 0,
  dominant: 'distress' as const, intensity: 50, last_updated_at: 1,
});

// ── Wave 2: Bundle A — Reproducible Build ──────────────────────────────────

import { getCached, putCache } from '../../server/nvm/repro/llm-cache.ts';

import { analyzeArcCompletion } from '../../server/nvm/quality/arc-tracker.ts';

import {
  qualityConstraintsFromWarnings, arcConstraintsFromTracker,
  proppConstraintsFromAnalysis, buildQualityAwareConstraints,
} from '../../server/nvm/generate/quality-spec.ts';

// ── Wave 29 — Narrative Regression Suite ─────────────────────────────────────

import { ALL_INVARIANTS } from '../../server/nvm/regression/invariants.ts';
import { runNarrativeRegression } from '../../server/nvm/regression/runner.ts';

function makeCommit(sceneIdx: number, ops: StoryOp[]): StoryCommit {
  return { commitId: `c${sceneIdx}`, parentId: null, sceneIdx, ops, deltaSummary: summarizeOps(ops), reverted: false, createdAt: 1 };
}

function baseOp(): StoryOp {
  return { op: 'ADD_FACT', fact: { factId: 'f1', subject: 'world', predicate: 'is', object: 'real', addedAtTurn: 0, validFrom: 0, validTo: null } };
}

// ── Wave 30 — Narrative Momentum Dashboard ────────────────────────────────────

function makeMomentumCommit(sceneIdx: number, ops: StoryOp[]): StoryCommit {
  return { commitId: `m${sceneIdx}`, parentId: null, sceneIdx, ops, deltaSummary: summarizeOps(ops), reverted: false, createdAt: 1 };
}

function buildIR(commit: StoryCommit): import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR {
  return {
    transitionId: commit.commitId, sceneIdx: commit.sceneIdx,
    sceneFunction: 'advance_plot', activeMechanisms: [],
    beforeStateHash: 'test', ops: commit.ops,
    preconditions: [], postconditions: [],
    provenance: { origin: 'model_generated', createdAt: commit.createdAt },
  };
}

// ── Wave 31 — Voice DNA Analyzer ─────────────────────────────────────────────

function makeBeliefOp(charId: string, proposition: string): StoryOp {
  return { op: 'UPDATE_BELIEF', charId, belief: { id: `b-${charId}-${proposition.slice(0, 4)}`, proposition, confidence: 0.7, source: 'inferred', acquired_at: 0 } };
}

// ── Wave 32: Action↔StoryOp Bridge ───────────────────────────────────────────
import {
  entryToOps,
  epistemicUpdateToOps,
  buildTurnCommit,
} from '../../server/nvm/bridge/action-to-ops.ts';
import type { BridgeInput } from '../../server/nvm/bridge/action-to-ops.ts';
import type { EpistemicUpdate, EventCard, EventProposition } from '../../server/engine/types.ts';

function makeEntry(overrides: Partial<ActionLogEntry> = {}): ActionLogEntry {
  return {
    action_id: 'act-001',
    timestamp: Date.now(),
    char_id: 'alice',
    location_id: 'loc-01',
    action_type: 'SPEAK',
    target_char_id: 'bob',
    content: 'I know nothing about the money.',
    is_audible: true,
    ...overrides,
  };
}

function makeProp(overrides: Partial<EventProposition> = {}): EventProposition {
  return {
    proposition_id: 'prop-001',
    event_id: 'act-001',
    content: 'I know nothing about the money.',
    is_lie: false,
    asserted_by: 'alice',
    perceived_truth: true,
    ...overrides,
  };
}

function makeCard(entry: ActionLogEntry, props: EventProposition[] = []): EventCard {
  return {
    event_id: entry.action_id,
    char_id: entry.char_id,
    action_type: entry.action_type,
    content: entry.content,
    location_id: entry.location_id,
    turn_index: 5,
    propositions: props,
  };
}

function makeBelief(proposition: string, source: 'told' | 'witnessed' | 'inferred' = 'inferred'): Belief {
  return {
    id: `bel-${Math.random().toString(36).slice(2, 7)}`,
    proposition,
    confidence: source === 'witnessed' ? 1.0 : source === 'told' ? 0.7 : 0.4,
    source,
    // told beliefs must have source_agent_id for EpistemicProof; witnessed need source_event_id
    source_agent_id: source === 'told' ? 'narrator' : undefined,
    source_event_id: source === 'witnessed' ? 'evt-000' : undefined,
    acquired_at: 5,
    contradicts: [],
  };
}

function makeEpistemicUpdate(charId: string, beliefs: Belief[], contradiction = false): EpistemicUpdate {
  return {
    char_id: charId,
    new_beliefs: beliefs,
    contradiction_detected: contradiction,
    contradicted_propositions: contradiction ? ['something is wrong'] : [],
    source_event_id: 'act-001',
  };
}

// ── Wave 33: Author-Presence Move Bus ─────────────────────────────────────────
import { parseAuthorMove, buildAuthorCommit } from '../../server/nvm/live/move-bus.ts';
import type { AuthorCommitInput } from '../../server/nvm/live/move-bus.ts';

// ── Wave 34: Reactive Turn Cycle ──────────────────────────────────────────────
import { reactToCommit, advanceWorld } from '../../server/nvm/live/loop.ts';

// ── Wave 35: Forward Latent Branch Field ─────────────────────────────────────
import { generateBranchField } from '../../server/nvm/branch/field.ts';
import { scoreBranch } from '../../server/nvm/branch/score.ts';

// ── Wave 36: Conflict Orchestrator + Intention Registry ───────────────────────
import { buildIntentionRegistry } from '../../server/nvm/drama/intention-registry.ts';
import { computeConflicts } from '../../server/nvm/drama/conflict-orchestrator.ts';

// ── Wave 37: Live Screenplay Memory + Structure Tracking ─────────────────────
import { annotateCommit, buildScreenplayMemory } from '../../server/nvm/screenplay/memory.ts';
import { analyzeStructure } from '../../server/nvm/screenplay/structure.ts';

function makeScreenplayCommit(sceneIdx: number, ops: StoryOp[]): StoryCommit {
  return {
    commitId: `sp-${sceneIdx}`,
    parentId: sceneIdx > 0 ? `sp-${sceneIdx - 1}` : null,
    sceneIdx,
    ops,
    deltaSummary: summarizeOps(ops),
    reverted: false,
    createdAt: Date.now(),
  };
}

// ── Wave 38: End-Condition Detector + Screenplay Compiler ─────────────────────
import { detectEndCondition } from '../../server/nvm/screenplay/end-condition.ts';
import { compileScreenplay } from '../../server/nvm/screenplay/compile.ts';

// ── Wave 39: 12-Pass Revision Pipeline ────────────────────────────────────────

import { structurePass }    from '../../server/nvm/revision/passes/structure.ts';
import { causalityPass }    from '../../server/nvm/revision/passes/causality.ts';
import { intentionPass }    from '../../server/nvm/revision/passes/intention.ts';
import { beliefPass }       from '../../server/nvm/revision/passes/belief.ts';
import { conflictPass }     from '../../server/nvm/revision/passes/conflict.ts';
import { characterArcPass } from '../../server/nvm/revision/passes/character-arc.ts';
import { dialoguePass }     from '../../server/nvm/revision/passes/dialogue.ts';
import { rhythmPass }       from '../../server/nvm/revision/passes/rhythm.ts';
import { pacingPass }       from '../../server/nvm/revision/passes/pacing.ts';
import { originalityPass }  from '../../server/nvm/revision/passes/originality.ts';
import { payoffPass }       from '../../server/nvm/revision/passes/payoff.ts';
import { voicePass }        from '../../server/nvm/revision/passes/voice.ts';
import { runRevisionPipeline } from '../../server/nvm/revision/pipeline.ts';

/** Minimal fountain text for testing */
const SAMPLE_FOUNTAIN = `Title: TEST
Author: Test

INT. THE OFFICE - DAY

Alice looks around nervously. She takes a deep breath.

ALICE
We need to talk. I feel so angry.

BOB
Yes.

INT. THE WAREHOUSE - NIGHT

Bob stares into the distance. A single tear runs down his face.

ALICE
As you know, Bob, we discussed the plan.

BOB
Absolutely.
`;

/** Make a minimal PassInput with no records/structure */
/** Minimal StructureState for Wave 39 tests */
function makeStructureForRevision(act = 'act1', revelation = 0, clues = 0, escalating = false): import('../../server/nvm/screenplay/structure.ts').StructureState {
  return {
    actPosition: act as import('../../server/nvm/screenplay/structure.ts').ActPosition,
    completionPercent: act === 'act3' ? 80 : 20,
    avgSuspensePerScene: 2,
    escalating,
    reversalCount: 1,
    reversalDensity: 1,
    approachingClimax: act === 'act3',
    openClues: clues,
    revelationCount: revelation,
    midpointPressure: 2,
    tightestScene: null,
  };
}

function makePassInput(fountain = SAMPLE_FOUNTAIN): import('../../server/nvm/revision/passes/types.ts').PassInput {
  return {
    fountain,
    original: fountain,
    annotations: [],
    structure: makeStructureForRevision('act1', 0, 0, false),
    records: [],
    approvedSpans: [],
  };
}

/** Make a PassInput with rich records for more thorough tests */
function makeRichPassInput(): import('../../server/nvm/revision/passes/types.ts').PassInput {
  const commits = Array.from({ length: 6 }, (_, i) =>
    makeScreenplayCommit(i, [
      { op: 'UPDATE_READER_STATE', delta: { suspense: i % 2 === 0 ? 2 : -1 } },
      { op: 'SEED_CLUE', clueId: `clue_${i}`, carrier: 'object' },
    ])
  );
  const records = buildScreenplayMemory(commits);
  const structure = analyzeStructure(records, commits);
  const compiled = compileScreenplay(commits, emptyState(), records, structure, 'TEST');
  return {
    fountain: compiled.fountain,
    original: compiled.fountain,
    annotations: compiled.annotations,
    structure,
    records,
    approvedSpans: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Wave 40 — CRITICAL Fixes (C1–C6)
// Tests for: prompt injection sanitization, move validation, SSE cleanup,
// epistemic serialization, fetch error reporting, semantic contradiction safety.
// ─────────────────────────────────────────────────────────────────────────────

import { sanitizeForPrompt } from '../../server/lib/prompt-utils.ts';
import { temporalProof } from '../../server/nvm/proof/tier1/temporal.ts';
import { genericnessProof } from '../../server/nvm/proof/tier3/genericness.ts';
import { biasAuditProof } from '../../server/nvm/proof/tier4/bias-audit.ts';
import { parseAuthorMove as parseAuthorMoveW41 } from '../../server/nvm/live/move-bus.ts';

// ── Wave 68: NaN hardening, arc alignment, enhanced bible ────────────────────
import { buildIntentionRegistry as buildIntentionRegistryW68 } from '../../server/nvm/drama/intention-registry.ts';
import { computeConflicts as computeConflictsW68 } from '../../server/nvm/drama/conflict-orchestrator.ts';
import { buildStoryBibleSummary } from '../../server/nvm/bible/index.ts';

// ── Wave 70: rewrite.ts story context enrichment ─────────────────────────────
import { rewritePass } from '../../server/nvm/revision/rewrite.ts';
import type { StoryContext } from '../../server/nvm/revision/passes/types.ts';

// ── Wave 71: NaN guards for LLM confidence fields in Agent + mine.ts ─────────
import type { SimResult } from '../../server/nvm/selfplay/corpus.ts';
  function makeRecord79(
    overrides: Partial<import('../../server/nvm/screenplay/memory.ts').ScreenplaySceneRecord>,
  ): import('../../server/nvm/screenplay/memory.ts').ScreenplaySceneRecord {
    return {
      commitId: 'c0', sceneIdx: 0, slug: 'INT. TEST', purpose: 'character_moment',
      dramaticTurn: '', revelation: null, emotionalShift: 'neutral',
      visualBeats: [], dialogueHighlights: [], unresolvedClues: [],
      seededClueIds: [], payoffSetupIds: [], clockRaised: false, clockDelta: 0,
      suspenseDelta: 0, curiosityDelta: 0, createdAt: 0,
      ...overrides,
    };
  }

// ── Wave 104: emotional debt tracker, quality constraint gap, originality clichés ─

import { originalityProof } from '../../server/nvm/proof/tier3/originality.ts';

// ── Wave 106: attribution phantom refs, operator rotation, showrunner new checks ─

import { showrunnerCritic } from '../../server/nvm/room/critics/showrunner.ts';
import { attributionProof } from '../../server/nvm/proof/tier4/attribution.ts';

// ── Wave 107: necessity state-awareness, dramatic irony tension ─────────────────

import { necessityProof } from '../../server/nvm/proof/tier2/necessity.ts';

// ── Wave 123 — Quality Engine + Revision Pass improvements ──────────────────

/** Build a minimal valid NarrativeTransitionIR for Wave 123 unit tests */
function makeMinimalIR(sceneIdx: number, ops: StoryOp[]): import('../../server/nvm/ir/NarrativeTransitionIR.ts').NarrativeTransitionIR {
  return {
    transitionId: `w123-ir-${sceneIdx}`,
    sceneIdx,
    sceneFunction: 'build_tension',
    activeMechanisms: [],
    beforeStateHash: '',
    ops,
    preconditions: [],
    postconditions: [],
    provenance: { origin: 'model_generated' as const, createdAt: 0 },
  };
}

// ── Wave 128 ─────────────────────────────────────────────────────────────────

import { composePromptModifiers, SYNERGY_OVERRIDES } from '../../server/lib/genre-router.ts';

// ── Wave 129 — P2: Export pipeline (FDX, DOCX, print-HTML) ──────────────────
// (parseFountain already imported at top of test file)

const SAMPLE_FOUNTAIN_P2 = `Title: Test Story
Credit: Written by AI

INT. LIVING ROOM - DAY

JOHN sits quietly.

JOHN
Hello, world.
(smiling)
It's a good day.

CUT TO:

EXT. PARK - SUNSET

A WOMAN walks her dog.`;

// ── Wave 130 — Revision Engine Hardening + Theme Resonance Pass ──────────────

import { themePass } from '../../server/nvm/revision/passes/theme.ts';
import type { PassInput } from '../../server/nvm/revision/passes/types.ts';
import type { ScreenplaySceneRecord } from '../../server/nvm/screenplay/memory.ts';
import type { StructureState } from '../../server/nvm/screenplay/structure.ts';

// Complete ScreenplaySceneRecord factory — every required field present so the
// records typecheck under `tsc --noEmit`, not just under runtime strip-types.
function makeSceneRecord(over: Partial<ScreenplaySceneRecord> = {}): ScreenplaySceneRecord {
  return {
    commitId: `commit-${over.sceneIdx ?? 0}`,
    sceneIdx: 0,
    slug: 'INT. ROOM - DAY',
    purpose: 'establish_world',
    dramaticTurn: 'none',
    revelation: null,
    emotionalShift: 'neutral',
    visualBeats: [],
    dialogueHighlights: [],
    unresolvedClues: [],
    seededClueIds: [],
    payoffSetupIds: [],
    clockRaised: false,
    clockDelta: 0,
    suspenseDelta: 0,
    curiosityDelta: 0,
    createdAt: 0,
    ...over,
  };
}

function makeMinimalInput(overrides: Partial<PassInput> = {}): PassInput {
  return {
    fountain: 'INT. ROOM - DAY\n\nA person sits.\n',
    original: 'INT. ROOM - DAY\n\nA person sits.\n',
    annotations: [],
    structure: {
      actPosition: 'act1', escalating: false, reversalCount: 0,
      openClues: 0, completionPercent: 20, midpointPressure: 0,
      tightestScene: 0,
    } as StructureState,
    records: [makeSceneRecord()],
    approvedSpans: [],
    storyContext: {},
    ...overrides,
  };
}

// ── Wave 132 — Rewrite truncation guard ──────────────────────────────────────

import { evaluateRewrite, REWRITE_MIN_LENGTH_RATIO } from '../../server/nvm/revision/rewrite.ts';

// ── Wave 134 — Relationship Arc Pass (Pass 14) ───────────────────────────────

import { relationshipArcPass } from '../../server/nvm/revision/passes/relationship-arc.ts';


  describe('Wave 171 — intentionPass: goal inversion, passive act3 intention, misplaced entropy spike', async () => {
    const makeRec = (idx: number, override: Partial<any> = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'dialogue', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
      ...override,
    });
    const blankFountain = (n: number) =>
      Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join('');
    const noAnnotations = (n: number) => Array.from({ length: n }, () => ({ revelation: false } as any));

    // ── GOAL_INVERSION_ABSENT ─────────────────────────────────────────────────
    it('intentionPass detects GOAL_INVERSION_ABSENT when no proactive scene backfires', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 6 scenes; scenes 1 and 3 are proactive (clockRaised), none have negative
      // emotion or a negative relationship shift — the pursuit never bites back.
      const records = Array.from({ length: 6 }, (_, i) =>
        (i === 1 || i === 3)
          ? makeRec(i, { clockRaised: true, emotionalShift: 'positive' })
          : makeRec(i),
      );
      const result = await intentionPass({
        fountain: blankFountain(6), original: blankFountain(6),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(6), approvedSpans: [],
      });
      const inv = result.issues.filter(i => i.rule === 'GOAL_INVERSION_ABSENT');
      assert.ok(inv.length >= 1, `Should detect GOAL_INVERSION_ABSENT; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(inv[0].severity === 'major');
    });

    it('intentionPass does NOT fire GOAL_INVERSION_ABSENT when a proactive scene backfires', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // scene 3 is proactive AND damages a relationship — the goal bites back.
      const records = Array.from({ length: 6 }, (_, i) =>
        i === 1
          ? makeRec(i, { clockRaised: true, emotionalShift: 'positive' })
          : i === 3
          ? makeRec(i, { clockRaised: true, relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: -0.6 }] })
          : makeRec(i),
      );
      const result = await intentionPass({
        fountain: blankFountain(6), original: blankFountain(6),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(6), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'GOAL_INVERSION_ABSENT'),
        'Should NOT fire when a proactive scene produces a relationship loss',
      );
    });

    // ── PASSIVE_ACT3_INTENTION ────────────────────────────────────────────────
    it('intentionPass detects PASSIVE_ACT3_INTENTION when protagonist initiates nothing in Act 3', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 8 scenes: act3Start = floor(8*0.75) = 6, so Act 3 = scenes 6,7.
      // Earlier scenes are proactive; Act 3 has no clock raised, no clue planted.
      const records = Array.from({ length: 8 }, (_, i) =>
        i < 6
          ? makeRec(i, { clockRaised: true })
          : makeRec(i),
      );
      const result = await intentionPass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(8), approvedSpans: [],
      });
      const passive = result.issues.filter(i => i.rule === 'PASSIVE_ACT3_INTENTION');
      assert.ok(passive.length >= 1, `Should detect PASSIVE_ACT3_INTENTION; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(passive[0].severity === 'critical');
    });

    it('intentionPass does NOT fire PASSIVE_ACT3_INTENTION when protagonist acts in Act 3', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      const records = Array.from({ length: 8 }, (_, i) =>
        i < 6
          ? makeRec(i, { clockRaised: true })
          : i === 7
          ? makeRec(i, { seededClueIds: ['final_trap'] })
          : makeRec(i),
      );
      const result = await intentionPass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(8), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'PASSIVE_ACT3_INTENTION'),
        'Should NOT fire when the protagonist plants a clue in Act 3',
      );
    });

    // ── ENTROPY_SPIKE_MISPLACED ───────────────────────────────────────────────
    it('intentionPass detects ENTROPY_SPIKE_MISPLACED when peak momentum lands in Act 1', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 8 scenes: act1End = floor(8*0.25) = 2. Scene 0 has by far the highest
      // entropy (high suspense + relationship turbulence); rest are flat.
      const records = Array.from({ length: 8 }, (_, i) =>
        i === 0
          ? makeRec(i, { suspenseDelta: 5, relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.8 }] })
          : makeRec(i),
      );
      const result = await intentionPass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(8), approvedSpans: [],
      });
      const spike = result.issues.filter(i => i.rule === 'ENTROPY_SPIKE_MISPLACED');
      assert.ok(spike.length >= 1, `Should detect ENTROPY_SPIKE_MISPLACED; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(spike[0].severity === 'major');
    });

    it('intentionPass does NOT fire ENTROPY_SPIKE_MISPLACED when peak momentum lands near the climax', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // Peak entropy scene is index 6 (back half) — correctly placed.
      const records = Array.from({ length: 8 }, (_, i) =>
        i === 6
          ? makeRec(i, { suspenseDelta: 5, relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.8 }] })
          : makeRec(i),
      );
      const result = await intentionPass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(8), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'ENTROPY_SPIKE_MISPLACED'),
        'Should NOT fire when the entropy peak lands in the back half',
      );
    });
  });


  describe('Wave 188 — intentionPass: entropy arc flat, intention convergence, entropy cliff', async () => {
    const makeRec = (idx: number, override: Partial<any> = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'dialogue', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
      ...override,
    });
    const blankFountain = (n: number) =>
      Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join('');
    const intentInput = (records: any[]) => ({
      fountain: blankFountain(records.length), original: blankFountain(records.length),
      records: records as any, structure: {} as any, annotations: [], approvedSpans: [],
    });

    // ESCALATION_ENTROPY_FLAT — fires
    it('ESCALATION_ENTROPY_FLAT fires when Act 2b entropy is no higher than Act 2a', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // n=12: act2a=[3,4,5] suspense=2.0 (entropy=2.0), act2b=[6,7,8] suspense=0.8 (entropy=0.8)
      const records = Array.from({ length: 12 }, (_, i) => makeRec(i, {
        suspenseDelta: (i >= 3 && i < 6) ? 2.0 : (i >= 6 && i < 9) ? 0.8 : 1.0,
      }));
      const result = await intentionPass(intentInput(records));
      assert.ok(
        result.issues.some(i => i.rule === 'ESCALATION_ENTROPY_FLAT'),
        `Expected ESCALATION_ENTROPY_FLAT, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // ESCALATION_ENTROPY_FLAT — no-fire
    it('ESCALATION_ENTROPY_FLAT does not fire when Act 2b entropy exceeds Act 2a', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      const records = Array.from({ length: 12 }, (_, i) => makeRec(i, {
        suspenseDelta: (i >= 3 && i < 6) ? 2.0 : (i >= 6 && i < 9) ? 2.5 : 1.0,
      }));
      const result = await intentionPass(intentInput(records));
      assert.ok(
        !result.issues.some(i => i.rule === 'ESCALATION_ENTROPY_FLAT'),
        `Expected no ESCALATION_ENTROPY_FLAT, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // INTENTION_CONVERGENCE_ABSENT — fires
    it('INTENTION_CONVERGENCE_ABSENT fires when clues and clock never share a scene', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      const records = Array.from({ length: 10 }, (_, i) => makeRec(i, {
        seededClueIds: i === 2 ? ['clue1'] : [],
        clockRaised: i === 5,
      }));
      const result = await intentionPass(intentInput(records));
      assert.ok(
        result.issues.some(i => i.rule === 'INTENTION_CONVERGENCE_ABSENT'),
        `Expected INTENTION_CONVERGENCE_ABSENT, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // INTENTION_CONVERGENCE_ABSENT — no-fire
    it('INTENTION_CONVERGENCE_ABSENT does not fire when a scene has both clue and clock', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      const records = Array.from({ length: 10 }, (_, i) => makeRec(i, {
        seededClueIds: i === 3 ? ['clue1'] : [],
        clockRaised: i === 3 || i === 6, // scene 3 has both → convergence
      }));
      const result = await intentionPass(intentInput(records));
      assert.ok(
        !result.issues.some(i => i.rule === 'INTENTION_CONVERGENCE_ABSENT'),
        `Expected no INTENTION_CONVERGENCE_ABSENT, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // ENTROPY_CLIFF — fires
    it('ENTROPY_CLIFF fires when three high-entropy scenes drop to two zero-entropy scenes', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // records 0,1,2: entropy=3 (suspenseDelta=3)
      // records 3,4: entropy=0 (suspenseDelta=0, everything default/neutral)
      const records = Array.from({ length: 8 }, (_, i) => makeRec(i, {
        suspenseDelta: i < 3 ? 3 : i < 5 ? 0 : 1,
      }));
      const result = await intentionPass(intentInput(records));
      assert.ok(
        result.issues.some(i => i.rule === 'ENTROPY_CLIFF'),
        `Expected ENTROPY_CLIFF, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // ENTROPY_CLIFF — no-fire
    it('ENTROPY_CLIFF does not fire when the high-run transition stays above 0.5', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // records 0,1,2: entropy=3; records 3,4: entropy=1 (not <0.5 — no cliff)
      const records = Array.from({ length: 8 }, (_, i) => makeRec(i, {
        suspenseDelta: i < 3 ? 3 : 1,
      }));
      const result = await intentionPass(intentInput(records));
      assert.ok(
        !result.issues.some(i => i.rule === 'ENTROPY_CLIFF'),
        `Expected no ENTROPY_CLIFF, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });
  });


  describe('Wave 230 — intentionPass: secondary intention vacuum, proactive overclustering, reactive goal adoption', async () => {
    const makeRec230 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, dialogueHighlights: [],
      revelation: null, purpose: 'development', dramaticTurn: '',
      seededClueIds: [], payoffSetupIds: [], relationshipShifts: [],
      ...overrides,
    });

    it('SECONDARY_INTENTION_VACUUM fires when all highlights belong to one character', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 8 scenes; 3 proactive acts; 4 highlights all from 'alice'
      const records230a = [
        makeRec230(0, { clockRaised: true, dialogueHighlights: ['alice: wants the truth'] }),
        makeRec230(1, { dialogueHighlights: ['alice: fears exposure'] }),
        makeRec230(2, { seededClueIds: ['clue1'], dialogueHighlights: ['alice: plans to escape'] }),
        makeRec230(3),
        makeRec230(4, { clockRaised: true, dialogueHighlights: ['alice: resolves to fight'] }),
        makeRec230(5),
        makeRec230(6),
        makeRec230(7),
      ];
      const fountain230a = records230a.map(r => `INT. SC${r.sceneIdx} - DAY\nALICE\nLine.\nBOB\nOther line.`).join('\n');
      const result = await intentionPass({
        fountain: fountain230a, original: fountain230a,
        records: records230a,
        structure: { escalating: true, reversalCount: 1, actPosition: 'act2', reversalDensity: 1, revelationCount: 0, completionPercent: 60, approachingClimax: false } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'SECONDARY_INTENTION_VACUUM');
      assert.ok(match.length >= 1, `Expected SECONDARY_INTENTION_VACUUM, got: ${JSON.stringify(result.issues.map((i:any)=>i.rule))}`);
    });

    it('SECONDARY_INTENTION_VACUUM does NOT fire when a secondary has tracked intentions', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      const records230b = [
        makeRec230(0, { clockRaised: true, dialogueHighlights: ['alice: wants justice'] }),
        makeRec230(1, { dialogueHighlights: ['bob: fears discovery'] }),
        makeRec230(2, { seededClueIds: ['clue1'] }),
        makeRec230(3),
        makeRec230(4, { clockRaised: true }),
        makeRec230(5),
        makeRec230(6, { dialogueHighlights: ['alice: plans escape', 'bob: plans deception'] }),
        makeRec230(7),
      ];
      const fountain230b = records230b.map(r => `INT. SC${r.sceneIdx} - DAY\nALICE\nLine.\nBOB\nOther.`).join('\n');
      const result = await intentionPass({
        fountain: fountain230b, original: fountain230b,
        records: records230b,
        structure: { escalating: true, reversalCount: 1, actPosition: 'act2', reversalDensity: 1, revelationCount: 0, completionPercent: 60, approachingClimax: false } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'SECONDARY_INTENTION_VACUUM');
      assert.strictEqual(match.length, 0, 'Should NOT fire when secondary character has tracked intentions');
    });

    it('PROACTIVE_OVERCLUSTERING fires when all proactive acts are in a tight cluster', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 10 scenes; 3 proactive acts all in scenes 4,5,6 (span=2, 20% of 10=2.0 — span≤2 and passive=7/10=70%)
      const records230c = Array.from({ length: 10 }, (_, i) =>
        makeRec230(i, {
          clockRaised: [4, 5, 6].includes(i),
          seededClueIds: i === 5 ? ['clue1'] : [],
        }),
      );
      const fountain230c = records230c.map(r => `INT. SC${r.sceneIdx} - DAY\nALICE\nLine.`).join('\n');
      const result = await intentionPass({
        fountain: fountain230c, original: fountain230c,
        records: records230c,
        structure: { escalating: false, reversalCount: 0, actPosition: 'act2', reversalDensity: 0, revelationCount: 0, completionPercent: 70, approachingClimax: false } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'PROACTIVE_OVERCLUSTERING');
      assert.ok(match.length >= 1, `Expected PROACTIVE_OVERCLUSTERING, got: ${JSON.stringify(result.issues.map((i:any)=>i.rule))}`);
    });

    it('PROACTIVE_OVERCLUSTERING does NOT fire when proactive acts are spread out', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 10 scenes; proactive acts at 0, 4, 9 — span of 9 (90% of 10)
      const records230d = Array.from({ length: 10 }, (_, i) =>
        makeRec230(i, { clockRaised: [0, 4, 9].includes(i) }),
      );
      const fountain230d = records230d.map(r => `INT. SC${r.sceneIdx} - DAY\nALICE\nLine.`).join('\n');
      const result = await intentionPass({
        fountain: fountain230d, original: fountain230d,
        records: records230d,
        structure: { escalating: true, reversalCount: 1, actPosition: 'act2', reversalDensity: 1, revelationCount: 0, completionPercent: 80, approachingClimax: false } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'PROACTIVE_OVERCLUSTERING');
      assert.strictEqual(match.length, 0, 'Should NOT fire when proactive acts are spread across the arc');
    });

    it('REACTIVE_GOAL_ADOPTION fires when all proactive acts follow negative triggers', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 6 scenes; proactive acts at scenes 2 and 4, both preceded by negative-shift scenes
      const records230e = [
        makeRec230(0),
        makeRec230(1, { emotionalShift: 'negative' }),       // negative trigger
        makeRec230(2, { clockRaised: true }),                // proactive act after negative
        makeRec230(3, { suspenseDelta: -2 }),                // reversal trigger
        makeRec230(4, { seededClueIds: ['clue1'] }),         // proactive act after reversal
        makeRec230(5),
      ];
      const fountain230e = records230e.map(r => `INT. SC${r.sceneIdx} - DAY\nALICE\nLine.`).join('\n');
      const result = await intentionPass({
        fountain: fountain230e, original: fountain230e,
        records: records230e,
        structure: { escalating: false, reversalCount: 1, actPosition: 'act2', reversalDensity: 1, revelationCount: 0, completionPercent: 50, approachingClimax: false } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'REACTIVE_GOAL_ADOPTION');
      assert.ok(match.length >= 1, `Expected REACTIVE_GOAL_ADOPTION, got: ${JSON.stringify(result.issues.map((i:any)=>i.rule))}`);
    });

    it('REACTIVE_GOAL_ADOPTION does NOT fire when at least one proactive act is autonomous', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 6 scenes; proactive act at scene 1 (neutral prior) = autonomous
      const records230f = [
        makeRec230(0, { emotionalShift: 'neutral' }),
        makeRec230(1, { clockRaised: true }),                // autonomous proactive act
        makeRec230(2, { suspenseDelta: -2 }),
        makeRec230(3, { seededClueIds: ['clue1'] }),         // reactive proactive act
        makeRec230(4),
        makeRec230(5),
      ];
      const fountain230f = records230f.map(r => `INT. SC${r.sceneIdx} - DAY\nALICE\nLine.`).join('\n');
      const result = await intentionPass({
        fountain: fountain230f, original: fountain230f,
        records: records230f,
        structure: { escalating: true, reversalCount: 1, actPosition: 'act2', reversalDensity: 1, revelationCount: 0, completionPercent: 50, approachingClimax: false } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'REACTIVE_GOAL_ADOPTION');
      assert.strictEqual(match.length, 0, 'Should NOT fire when at least one proactive act is autonomous');
    });
  });


  describe('Wave 381 — intentionPass: proactive Act 2b void, proactive front-loaded, proactive revelation coincidence absent', async () => {
    const makeRec381 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0.5,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runI381 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('PROACTIVE_ACT2B_VOID fires when no proactive act lands in the 50-75% zone', async () => {
      // n=12 → Act 2b scenes 6,7,8; proactive at 1,3 and 10 (outside Act 2b)
      const recs381a = Array.from({ length: 12 }, (_, i) =>
        makeRec381(i, { seededClueIds: [1, 3, 10].includes(i) ? ['c'] : [] }),
      );
      const res = await runI381(recs381a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PROACTIVE_ACT2B_VOID'), 'PROACTIVE_ACT2B_VOID should fire');
    });

    it('PROACTIVE_ACT2B_VOID does not fire when a proactive act lands in Act 2b', async () => {
      // proactive at scene 7 (within Act 2b)
      const recs381an = Array.from({ length: 12 }, (_, i) =>
        makeRec381(i, { seededClueIds: [1, 3, 7].includes(i) ? ['c'] : [] }),
      );
      const res = await runI381(recs381an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PROACTIVE_ACT2B_VOID'), 'PROACTIVE_ACT2B_VOID should not fire');
    });

    it('PROACTIVE_FRONTLOADED fires when >70% of proactive acts fall in the first half', async () => {
      // n=10 → mid=5; proactive at 0,1,2 (first half) and 8 (second half) → 3/4 = 75%
      const recs381f = Array.from({ length: 10 }, (_, i) =>
        makeRec381(i, { seededClueIds: [0, 1, 2, 8].includes(i) ? ['c'] : [] }),
      );
      const res = await runI381(recs381f);
      assert.ok(res.issues.some((i: any) => i.rule === 'PROACTIVE_FRONTLOADED'), 'PROACTIVE_FRONTLOADED should fire');
    });

    it('PROACTIVE_FRONTLOADED does not fire when proactive acts are balanced across halves', async () => {
      // proactive at 1,2 (first half) and 7,8 (second half) → 2/4 = 50%
      const recs381fn = Array.from({ length: 10 }, (_, i) =>
        makeRec381(i, { seededClueIds: [1, 2, 7, 8].includes(i) ? ['c'] : [] }),
      );
      const res = await runI381(recs381fn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PROACTIVE_FRONTLOADED'), 'PROACTIVE_FRONTLOADED should not fire');
    });

    it('PROACTIVE_REVELATION_COINCIDENCE_ABSENT fires when no proactive scene is also a revelation', async () => {
      // proactive at 1,2,3 (seeded clues); revelations at 5,6 — no overlap
      const recs381r = Array.from({ length: 8 }, (_, i) =>
        makeRec381(i, {
          seededClueIds: [1, 2, 3].includes(i) ? ['c'] : [],
          revelation: [5, 6].includes(i) ? 'the hidden truth' : null,
        }),
      );
      const res = await runI381(recs381r);
      assert.ok(res.issues.some((i: any) => i.rule === 'PROACTIVE_REVELATION_COINCIDENCE_ABSENT'), 'PROACTIVE_REVELATION_COINCIDENCE_ABSENT should fire');
    });

    it('PROACTIVE_REVELATION_COINCIDENCE_ABSENT does not fire when a proactive scene is also a revelation', async () => {
      // scene 3 is both proactive (seeded clue) and a revelation
      const recs381rn = Array.from({ length: 8 }, (_, i) =>
        makeRec381(i, {
          seededClueIds: [1, 2, 3].includes(i) ? ['c'] : [],
          revelation: [3, 6].includes(i) ? 'the hidden truth' : null,
        }),
      );
      const res = await runI381(recs381rn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PROACTIVE_REVELATION_COINCIDENCE_ABSENT'), 'PROACTIVE_REVELATION_COINCIDENCE_ABSENT should not fire');
    });
  });


  describe('Wave 367 — intentionPass: proactive adversity absent, proactive backloaded, proactive payoff coincidence absent', async () => {
    const makeRec367 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0.5,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runI367 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('PROACTIVE_ADVERSITY_ABSENT fires when no negative-emotion scene is proactive', async () => {
      const recs367aa = Array.from({ length: 8 }, (_, i) =>
        makeRec367(i, {
          emotionalShift: [1, 2].includes(i) ? 'negative' : 'neutral',
          seededClueIds: i === 5 ? ['clue_x'] : [],
        }),
      );
      const res = await runI367(recs367aa);
      assert.ok(res.issues.some((i: any) => i.rule === 'PROACTIVE_ADVERSITY_ABSENT'), 'PROACTIVE_ADVERSITY_ABSENT should fire');
    });

    it('PROACTIVE_ADVERSITY_ABSENT does not fire when a negative-emotion scene is proactive', async () => {
      const recs367aani = Array.from({ length: 8 }, (_, i) =>
        makeRec367(i, {
          emotionalShift: [1, 2].includes(i) ? 'negative' : 'neutral',
          seededClueIds: i === 1 || i === 5 ? ['clue_x'] : [],
        }),
      );
      const res = await runI367(recs367aani);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PROACTIVE_ADVERSITY_ABSENT'), 'PROACTIVE_ADVERSITY_ABSENT should not fire');
    });

    it('PROACTIVE_BACKLOADED fires when >70% of proactive acts fall in the second half', async () => {
      // n=10 → mid=5; proactive at 2 (first half) and 6,7,8 (second half) → 3/4 = 75%
      const recs367bl = Array.from({ length: 10 }, (_, i) =>
        makeRec367(i, { seededClueIds: [2, 6, 7, 8].includes(i) ? ['c'] : [] }),
      );
      const res = await runI367(recs367bl);
      assert.ok(res.issues.some((i: any) => i.rule === 'PROACTIVE_BACKLOADED'), 'PROACTIVE_BACKLOADED should fire');
    });

    it('PROACTIVE_BACKLOADED does not fire when proactive acts are balanced across halves', async () => {
      // proactive at 2,3 (first half) and 7,8 (second half) → 2/4 = 50%
      const recs367blni = Array.from({ length: 10 }, (_, i) =>
        makeRec367(i, { seededClueIds: [2, 3, 7, 8].includes(i) ? ['c'] : [] }),
      );
      const res = await runI367(recs367blni);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PROACTIVE_BACKLOADED'), 'PROACTIVE_BACKLOADED should not fire');
    });

    it('PROACTIVE_PAYOFF_COINCIDENCE_ABSENT fires when no scene is both proactive and a payoff', async () => {
      const recs367pc = Array.from({ length: 8 }, (_, i) =>
        makeRec367(i, {
          seededClueIds: [1, 2, 3].includes(i) ? ['c'] : [],
          payoffSetupIds: [5, 6].includes(i) ? ['p'] : [],
        }),
      );
      const res = await runI367(recs367pc);
      assert.ok(res.issues.some((i: any) => i.rule === 'PROACTIVE_PAYOFF_COINCIDENCE_ABSENT'), 'PROACTIVE_PAYOFF_COINCIDENCE_ABSENT should fire');
    });

    it('PROACTIVE_PAYOFF_COINCIDENCE_ABSENT does not fire when a scene is both proactive and a payoff', async () => {
      // scene 3 is both proactive (seededClueIds) and a payoff (payoffSetupIds)
      const recs367pcni = Array.from({ length: 8 }, (_, i) =>
        makeRec367(i, {
          seededClueIds: [1, 2, 3].includes(i) ? ['c'] : [],
          payoffSetupIds: [3, 6].includes(i) ? ['p'] : [],
        }),
      );
      const res = await runI367(recs367pcni);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PROACTIVE_PAYOFF_COINCIDENCE_ABSENT'), 'PROACTIVE_PAYOFF_COINCIDENCE_ABSENT should not fire');
    });
  });


  describe('Wave 353 — intentionPass: proactive curiosity decoupled, proactive suspense peak decoupled, proactive curiosity peak decoupled', async () => {
    const makeRec353 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'negative', suspenseDelta: 0.5, curiosityDelta: 0.5,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runI353 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('PROACTIVE_CURIOSITY_DECOUPLED fires when proactive scenes avg curiosityDelta ≤ 0', async () => {
      const recs353cd = [
        ...Array.from({ length: 5 }, (_, i) => makeRec353(i)),
        makeRec353(5, { clockRaised: true, curiosityDelta: 0 }),
        makeRec353(6, { clockRaised: true, curiosityDelta: -0.3 }),
        makeRec353(7, { clockRaised: true, curiosityDelta: 0 }),
      ];
      const res = await runI353(recs353cd);
      assert.ok(res.issues.some((i: any) => i.rule === 'PROACTIVE_CURIOSITY_DECOUPLED'), 'PROACTIVE_CURIOSITY_DECOUPLED should fire');
    });

    it('PROACTIVE_CURIOSITY_DECOUPLED does not fire when proactive scenes raise curiosity', async () => {
      const recs353cdn = [
        ...Array.from({ length: 5 }, (_, i) => makeRec353(i)),
        makeRec353(5, { clockRaised: true, curiosityDelta: 1 }),
        makeRec353(6, { clockRaised: true, curiosityDelta: 0.8 }),
        makeRec353(7, { clockRaised: true, curiosityDelta: 0.5 }),
      ];
      const res = await runI353(recs353cdn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PROACTIVE_CURIOSITY_DECOUPLED'), 'PROACTIVE_CURIOSITY_DECOUPLED should not fire');
    });

    it('PROACTIVE_SUSPENSE_PEAK_DECOUPLED fires when the peak-suspense scene is not proactive', async () => {
      const recs353sp = Array.from({ length: 8 }, (_, i) =>
        makeRec353(i,
          i === 3 ? { suspenseDelta: 3 } :
          i === 6 ? { clockRaised: true } : {})
      );
      const res = await runI353(recs353sp);
      assert.ok(res.issues.some((i: any) => i.rule === 'PROACTIVE_SUSPENSE_PEAK_DECOUPLED'), 'PROACTIVE_SUSPENSE_PEAK_DECOUPLED should fire');
    });

    it('PROACTIVE_SUSPENSE_PEAK_DECOUPLED does not fire when the peak-suspense scene is proactive', async () => {
      const recs353spn = Array.from({ length: 8 }, (_, i) =>
        makeRec353(i,
          i === 3 ? { suspenseDelta: 3, clockRaised: true } :
          i === 6 ? { clockRaised: true } : {})
      );
      const res = await runI353(recs353spn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PROACTIVE_SUSPENSE_PEAK_DECOUPLED'), 'PROACTIVE_SUSPENSE_PEAK_DECOUPLED should not fire');
    });

    it('PROACTIVE_CURIOSITY_PEAK_DECOUPLED fires when the peak-curiosity scene is not proactive', async () => {
      const recs353cp = Array.from({ length: 8 }, (_, i) =>
        makeRec353(i,
          i === 3 ? { curiosityDelta: 3 } :
          i === 6 ? { clockRaised: true } : {})
      );
      const res = await runI353(recs353cp);
      assert.ok(res.issues.some((i: any) => i.rule === 'PROACTIVE_CURIOSITY_PEAK_DECOUPLED'), 'PROACTIVE_CURIOSITY_PEAK_DECOUPLED should fire');
    });

    it('PROACTIVE_CURIOSITY_PEAK_DECOUPLED does not fire when the peak-curiosity scene is proactive', async () => {
      const recs353cpn = Array.from({ length: 8 }, (_, i) =>
        makeRec353(i,
          i === 3 ? { curiosityDelta: 3, clockRaised: true } :
          i === 6 ? { clockRaised: true } : {})
      );
      const res = await runI353(recs353cpn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PROACTIVE_CURIOSITY_PEAK_DECOUPLED'), 'PROACTIVE_CURIOSITY_PEAK_DECOUPLED should not fire');
    });
  });


  describe('Wave 339 — intentionPass: proactive emotion decoupled, proactive revelation absent, proactive relationship void', async () => {
    const makeRec339 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'negative', suspenseDelta: 0.5, curiosityDelta: 0.5,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runI339 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('PROACTIVE_EMOTION_DECOUPLED fires when all proactive scenes are emotionally neutral', async () => {
      const recs339ed = [
        ...Array.from({ length: 5 }, (_, i) => makeRec339(i)),
        makeRec339(5, { clockRaised: true, emotionalShift: 'neutral' }),
        makeRec339(6, { clockRaised: true, emotionalShift: 'neutral' }),
        makeRec339(7, { clockRaised: true, emotionalShift: 'neutral' }),
      ];
      const res = await runI339(recs339ed);
      assert.ok(res.issues.some((i: any) => i.rule === 'PROACTIVE_EMOTION_DECOUPLED'), 'PROACTIVE_EMOTION_DECOUPLED should fire');
    });

    it('PROACTIVE_EMOTION_DECOUPLED does not fire when a proactive scene carries emotion', async () => {
      const recs339ednw = [
        ...Array.from({ length: 5 }, (_, i) => makeRec339(i)),
        makeRec339(5, { clockRaised: true, emotionalShift: 'negative' }),
        makeRec339(6, { clockRaised: true, emotionalShift: 'neutral' }),
        makeRec339(7, { clockRaised: true, emotionalShift: 'neutral' }),
      ];
      const res = await runI339(recs339ednw);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PROACTIVE_EMOTION_DECOUPLED'), 'PROACTIVE_EMOTION_DECOUPLED should not fire');
    });

    it('PROACTIVE_REVELATION_ABSENT fires when no proactive scene is followed by a revelation', async () => {
      const recs339ra = [
        makeRec339(0, { clockRaised: true }),
        makeRec339(1, { revelation: null }),
        makeRec339(2, { clockRaised: true }),
        makeRec339(3, { revelation: null }),
        makeRec339(4, { clockRaised: true }),
        makeRec339(5, { revelation: null }),
        makeRec339(6),
        makeRec339(7),
      ];
      const res = await runI339(recs339ra);
      assert.ok(res.issues.some((i: any) => i.rule === 'PROACTIVE_REVELATION_ABSENT'), 'PROACTIVE_REVELATION_ABSENT should fire');
    });

    it('PROACTIVE_REVELATION_ABSENT does not fire when a proactive act leads to a revelation', async () => {
      const recs339raNw = [
        makeRec339(0, { clockRaised: true }),
        makeRec339(1, { revelation: 'She was the informant all along' }),
        makeRec339(2, { clockRaised: true }),
        makeRec339(3, { revelation: null }),
        makeRec339(4, { clockRaised: true }),
        makeRec339(5, { revelation: null }),
        makeRec339(6),
        makeRec339(7),
      ];
      const res = await runI339(recs339raNw);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PROACTIVE_REVELATION_ABSENT'), 'PROACTIVE_REVELATION_ABSENT should not fire');
    });

    it('PROACTIVE_RELATIONSHIP_VOID fires when no proactive scene has a relationship shift', async () => {
      const recs339rv = [
        ...Array.from({ length: 5 }, (_, i) => makeRec339(i)),
        makeRec339(5, { clockRaised: true, relationshipShifts: [] }),
        makeRec339(6, { clockRaised: true, relationshipShifts: [] }),
        makeRec339(7, { clockRaised: true, relationshipShifts: [] }),
      ];
      const res = await runI339(recs339rv);
      assert.ok(res.issues.some((i: any) => i.rule === 'PROACTIVE_RELATIONSHIP_VOID'), 'PROACTIVE_RELATIONSHIP_VOID should fire');
    });

    it('PROACTIVE_RELATIONSHIP_VOID does not fire when a proactive scene moves a bond', async () => {
      const recs339rvnw = [
        ...Array.from({ length: 5 }, (_, i) => makeRec339(i)),
        makeRec339(5, { clockRaised: true, relationshipShifts: [{ pairs: ['A', 'B'], amount: 0.5, dimension: 'trust' }] }),
        makeRec339(6, { clockRaised: true, relationshipShifts: [] }),
        makeRec339(7, { clockRaised: true, relationshipShifts: [] }),
      ];
      const res = await runI339(recs339rvnw);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PROACTIVE_RELATIONSHIP_VOID'), 'PROACTIVE_RELATIONSHIP_VOID should not fire');
    });
  });


  describe('Wave 314 — intentionPass: proactive suspense decoupled, proactive global scarcity, stakes raised externally', async () => {
    const makeRec314 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runI314 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('PROACTIVE_SUSPENSE_DECOUPLED fires when proactive scenes average suspenseDelta ≤ 0', async () => {
      const recs314sd = Array.from({ length: 10 }, (_, i) =>
        makeRec314(i, {
          clockRaised: [2, 4, 6].includes(i),
          suspenseDelta: [2, 4, 6].includes(i) ? -0.5 : 0.5,
        })
      );
      const res = await runI314(recs314sd);
      assert.ok(res.issues.some((i: any) => i.rule === 'PROACTIVE_SUSPENSE_DECOUPLED'), 'PROACTIVE_SUSPENSE_DECOUPLED should fire');
    });

    it('PROACTIVE_SUSPENSE_DECOUPLED does not fire when proactive scenes raise suspense', async () => {
      const recs314nsd = Array.from({ length: 10 }, (_, i) =>
        makeRec314(i, {
          clockRaised: [2, 4, 6].includes(i),
          suspenseDelta: [2, 4, 6].includes(i) ? 2 : 0.5,
        })
      );
      const res = await runI314(recs314nsd);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PROACTIVE_SUSPENSE_DECOUPLED'), 'PROACTIVE_SUSPENSE_DECOUPLED should not fire');
    });

    it('PROACTIVE_GLOBAL_SCARCITY fires when under 15% of scenes are proactive', async () => {
      // 12 scenes, exactly 1 proactive (8%)
      const recs314gs = Array.from({ length: 12 }, (_, i) =>
        makeRec314(i, { clockRaised: i === 5 })
      );
      const res = await runI314(recs314gs);
      assert.ok(res.issues.some((i: any) => i.rule === 'PROACTIVE_GLOBAL_SCARCITY'), 'PROACTIVE_GLOBAL_SCARCITY should fire');
    });

    it('PROACTIVE_GLOBAL_SCARCITY does not fire when agency is well distributed', async () => {
      // 12 scenes, 4 proactive (33%)
      const recs314ngs = Array.from({ length: 12 }, (_, i) =>
        makeRec314(i, { clockRaised: [1, 4, 7, 10].includes(i) })
      );
      const res = await runI314(recs314ngs);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PROACTIVE_GLOBAL_SCARCITY'), 'PROACTIVE_GLOBAL_SCARCITY should not fire');
    });

    it('STAKES_RAISED_EXTERNALLY fires when raise_stakes scenes are never proactive', async () => {
      const recs314se = Array.from({ length: 10 }, (_, i) =>
        makeRec314(i, {
          purpose: [3, 6].includes(i) ? 'raise_stakes' : 'development',
          // proactive activity elsewhere, but NOT on the raise_stakes scenes
          clockRaised: i === 8,
        })
      );
      const res = await runI314(recs314se);
      assert.ok(res.issues.some((i: any) => i.rule === 'STAKES_RAISED_EXTERNALLY'), 'STAKES_RAISED_EXTERNALLY should fire');
    });

    it('STAKES_RAISED_EXTERNALLY does not fire when a stakes scene is proactive', async () => {
      const recs314nse = Array.from({ length: 10 }, (_, i) =>
        makeRec314(i, {
          purpose: [3, 6].includes(i) ? 'raise_stakes' : 'development',
          clockRaised: i === 3,
        })
      );
      const res = await runI314(recs314nse);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STAKES_RAISED_EXTERNALLY'), 'STAKES_RAISED_EXTERNALLY should not fire');
    });
  });


  describe('Wave 1123 — intentionPass: intention payoff-suspense aftermath void, intention turn-curiosity aftermath void, intention turn-relational aftermath void', async () => {
    const makeRec1123 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'establish_world', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN1123 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('INTENTION_PAYOFF_SUSPENSE_AFTERMATH_VOID fires when every payoff is followed by two scenes with no suspense rise', async () => {
      const recs1123a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1123(i, { payoffSetupIds: ['p1'] });
        if (i === 8 || i === 9) return makeRec1123(i, { suspenseDelta: 1 });
        return makeRec1123(i);
      });
      const res = await runIN1123(recs1123a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_PAYOFF_SUSPENSE_AFTERMATH_VOID'), 'INTENTION_PAYOFF_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('INTENTION_PAYOFF_SUSPENSE_AFTERMATH_VOID does not fire when a payoff is followed by a suspense rise within its window', async () => {
      const recs1123an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1123(i, { payoffSetupIds: ['p1'] });
        if (i === 1 || i === 9) return makeRec1123(i, { suspenseDelta: 1 });
        return makeRec1123(i);
      });
      const res = await runIN1123(recs1123an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_PAYOFF_SUSPENSE_AFTERMATH_VOID'), 'INTENTION_PAYOFF_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    it('INTENTION_TURN_CURIOSITY_AFTERMATH_VOID fires when every dramatic turn is followed by two scenes with no curiosity rise', async () => {
      const recs1123b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1123(i, { dramaticTurn: 'reversal' });
        if (i === 8 || i === 9) return makeRec1123(i, { curiosityDelta: 1 });
        return makeRec1123(i);
      });
      const res = await runIN1123(recs1123b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_TURN_CURIOSITY_AFTERMATH_VOID'), 'INTENTION_TURN_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('INTENTION_TURN_CURIOSITY_AFTERMATH_VOID does not fire when a dramatic turn is followed by a curiosity rise within its window', async () => {
      const recs1123bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1123(i, { dramaticTurn: 'reversal' });
        if (i === 1 || i === 9) return makeRec1123(i, { curiosityDelta: 1 });
        return makeRec1123(i);
      });
      const res = await runIN1123(recs1123bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_TURN_CURIOSITY_AFTERMATH_VOID'), 'INTENTION_TURN_CURIOSITY_AFTERMATH_VOID should not fire');
    });

    it('INTENTION_TURN_RELATIONAL_AFTERMATH_VOID fires when every dramatic turn is followed by two scenes with no relationship shift', async () => {
      const recs1123c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1123(i, { dramaticTurn: 'reversal' });
        if (i === 8 || i === 9) return makeRec1123(i, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
        return makeRec1123(i);
      });
      const res = await runIN1123(recs1123c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_TURN_RELATIONAL_AFTERMATH_VOID'), 'INTENTION_TURN_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('INTENTION_TURN_RELATIONAL_AFTERMATH_VOID does not fire when a dramatic turn is followed by a relationship shift within its window', async () => {
      const recs1123cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1123(i, { dramaticTurn: 'reversal' });
        if (i === 1 || i === 9) return makeRec1123(i, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
        return makeRec1123(i);
      });
      const res = await runIN1123(recs1123cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_TURN_RELATIONAL_AFTERMATH_VOID'), 'INTENTION_TURN_RELATIONAL_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1109 — intentionPass: intention payoff-emotional aftermath void, intention payoff-relational aftermath void, intention turn-emotional aftermath void', async () => {
    const makeRec1109 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'establish_world', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN1109 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('INTENTION_PAYOFF_EMOTIONAL_AFTERMATH_VOID fires when every payoff is followed by two scenes with no emotional shift', async () => {
      const recs1109a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1109(i, { payoffSetupIds: ['p1'] });
        if (i === 8 || i === 9) return makeRec1109(i, { emotionalShift: 'positive' });
        return makeRec1109(i);
      });
      const res = await runIN1109(recs1109a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_PAYOFF_EMOTIONAL_AFTERMATH_VOID'), 'INTENTION_PAYOFF_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('INTENTION_PAYOFF_EMOTIONAL_AFTERMATH_VOID does not fire when a payoff is followed by an emotional shift within its window', async () => {
      const recs1109an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1109(i, { payoffSetupIds: ['p1'] });
        if (i === 1 || i === 9) return makeRec1109(i, { emotionalShift: 'positive' });
        return makeRec1109(i);
      });
      const res = await runIN1109(recs1109an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_PAYOFF_EMOTIONAL_AFTERMATH_VOID'), 'INTENTION_PAYOFF_EMOTIONAL_AFTERMATH_VOID should not fire');
    });

    it('INTENTION_PAYOFF_RELATIONAL_AFTERMATH_VOID fires when every payoff is followed by two scenes with no relationship shift', async () => {
      const recs1109b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1109(i, { payoffSetupIds: ['p1'] });
        if (i === 8 || i === 9) return makeRec1109(i, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
        return makeRec1109(i);
      });
      const res = await runIN1109(recs1109b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_PAYOFF_RELATIONAL_AFTERMATH_VOID'), 'INTENTION_PAYOFF_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('INTENTION_PAYOFF_RELATIONAL_AFTERMATH_VOID does not fire when a payoff is followed by a relationship shift within its window', async () => {
      const recs1109bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1109(i, { payoffSetupIds: ['p1'] });
        if (i === 1 || i === 9) return makeRec1109(i, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
        return makeRec1109(i);
      });
      const res = await runIN1109(recs1109bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_PAYOFF_RELATIONAL_AFTERMATH_VOID'), 'INTENTION_PAYOFF_RELATIONAL_AFTERMATH_VOID should not fire');
    });

    it('INTENTION_TURN_EMOTIONAL_AFTERMATH_VOID fires when every dramatic turn is followed by two scenes with no emotional shift', async () => {
      const recs1109c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1109(i, { dramaticTurn: 'reversal' });
        if (i === 8 || i === 9) return makeRec1109(i, { emotionalShift: 'positive' });
        return makeRec1109(i);
      });
      const res = await runIN1109(recs1109c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_TURN_EMOTIONAL_AFTERMATH_VOID'), 'INTENTION_TURN_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('INTENTION_TURN_EMOTIONAL_AFTERMATH_VOID does not fire when a dramatic turn is followed by an emotional shift within its window', async () => {
      const recs1109cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1109(i, { dramaticTurn: 'reversal' });
        if (i === 1 || i === 9) return makeRec1109(i, { emotionalShift: 'positive' });
        return makeRec1109(i);
      });
      const res = await runIN1109(recs1109cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_TURN_EMOTIONAL_AFTERMATH_VOID'), 'INTENTION_TURN_EMOTIONAL_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1095 — intentionPass: intention open-thread-dialogue-highlight aftermath void, intention payoff-curiosity aftermath void, intention turn-suspense aftermath void', async () => {
    const makeRec1095 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'establish_world', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN1095 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('INTENTION_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when every heavy clue-debt scene is followed by two scenes with no highlighted dialogue', async () => {
      const recs1095a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1095(i, { unresolvedClues: ['c1', 'c2', 'c3'] });
        if (i === 8 || i === 9) return makeRec1095(i, { dialogueHighlights: ['a memorable line'] });
        return makeRec1095(i);
      });
      const res = await runIN1095(recs1095a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'INTENTION_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    it('INTENTION_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a heavy clue-debt scene is followed by highlighted dialogue within its window', async () => {
      const recs1095an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1095(i, { unresolvedClues: ['c1', 'c2', 'c3'] });
        if (i === 1 || i === 9) return makeRec1095(i, { dialogueHighlights: ['a memorable line'] });
        return makeRec1095(i);
      });
      const res = await runIN1095(recs1095an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'INTENTION_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });

    it('INTENTION_PAYOFF_CURIOSITY_AFTERMATH_VOID fires when every payoff is followed by two scenes with no curiosity rise', async () => {
      const recs1095b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1095(i, { payoffSetupIds: ['p1'] });
        if (i === 8 || i === 9) return makeRec1095(i, { curiosityDelta: 1 });
        return makeRec1095(i);
      });
      const res = await runIN1095(recs1095b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_PAYOFF_CURIOSITY_AFTERMATH_VOID'), 'INTENTION_PAYOFF_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('INTENTION_PAYOFF_CURIOSITY_AFTERMATH_VOID does not fire when a payoff is followed by a curiosity rise within its window', async () => {
      const recs1095bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1095(i, { payoffSetupIds: ['p1'] });
        if (i === 1 || i === 9) return makeRec1095(i, { curiosityDelta: 1 });
        return makeRec1095(i);
      });
      const res = await runIN1095(recs1095bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_PAYOFF_CURIOSITY_AFTERMATH_VOID'), 'INTENTION_PAYOFF_CURIOSITY_AFTERMATH_VOID should not fire');
    });

    it('INTENTION_TURN_SUSPENSE_AFTERMATH_VOID fires when every dramatic turn is followed by two scenes with no suspense rise', async () => {
      const recs1095c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1095(i, { dramaticTurn: 'reversal' });
        if (i === 8 || i === 9) return makeRec1095(i, { suspenseDelta: 1 });
        return makeRec1095(i);
      });
      const res = await runIN1095(recs1095c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_TURN_SUSPENSE_AFTERMATH_VOID'), 'INTENTION_TURN_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('INTENTION_TURN_SUSPENSE_AFTERMATH_VOID does not fire when a dramatic turn is followed by a suspense rise within its window', async () => {
      const recs1095cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1095(i, { dramaticTurn: 'reversal' });
        if (i === 1 || i === 9) return makeRec1095(i, { suspenseDelta: 1 });
        return makeRec1095(i);
      });
      const res = await runIN1095(recs1095cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_TURN_SUSPENSE_AFTERMATH_VOID'), 'INTENTION_TURN_SUSPENSE_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1081 — intentionPass: intention stakes-dialogue-highlight aftermath void, intention open-thread-relational aftermath void, intention open-thread-staging aftermath void', async () => {
    const makeRec1081 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'establish_world', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN1081 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('INTENTION_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when every stakes-raise is followed by two scenes with no highlighted dialogue', async () => {
      const recs1081a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1081(i, { purpose: 'raise_stakes' });
        if (i === 8 || i === 9) return makeRec1081(i, { dialogueHighlights: ['a memorable line'] });
        return makeRec1081(i);
      });
      const res = await runIN1081(recs1081a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'INTENTION_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    it('INTENTION_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a stakes-raise is followed by highlighted dialogue within its window', async () => {
      const recs1081an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1081(i, { purpose: 'raise_stakes' });
        if (i === 1 || i === 9) return makeRec1081(i, { dialogueHighlights: ['a memorable line'] });
        return makeRec1081(i);
      });
      const res = await runIN1081(recs1081an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'INTENTION_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });

    it('INTENTION_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID fires when every heavy clue-debt scene is followed by two scenes with no relationship shift', async () => {
      const recs1081b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1081(i, { unresolvedClues: ['c1', 'c2', 'c3'] });
        if (i === 8 || i === 9) return makeRec1081(i, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
        return makeRec1081(i);
      });
      const res = await runIN1081(recs1081b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID'), 'INTENTION_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('INTENTION_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID does not fire when a heavy clue-debt scene is followed by a relationship shift within its window', async () => {
      const recs1081bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1081(i, { unresolvedClues: ['c1', 'c2', 'c3'] });
        if (i === 1 || i === 9) return makeRec1081(i, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
        return makeRec1081(i);
      });
      const res = await runIN1081(recs1081bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID'), 'INTENTION_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID should not fire');
    });

    it('INTENTION_OPEN_THREAD_STAGING_AFTERMATH_VOID fires when every heavy clue-debt scene is followed by two scenes with no visually dense scene', async () => {
      const recs1081c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1081(i, { unresolvedClues: ['c1', 'c2', 'c3'] });
        if (i === 8 || i === 9) return makeRec1081(i, { visualBeats: ['beat one', 'beat two'] });
        return makeRec1081(i);
      });
      const res = await runIN1081(recs1081c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_OPEN_THREAD_STAGING_AFTERMATH_VOID'), 'INTENTION_OPEN_THREAD_STAGING_AFTERMATH_VOID should fire');
    });

    it('INTENTION_OPEN_THREAD_STAGING_AFTERMATH_VOID does not fire when a heavy clue-debt scene is followed by a visually dense scene within its window', async () => {
      const recs1081cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1081(i, { unresolvedClues: ['c1', 'c2', 'c3'] });
        if (i === 1 || i === 9) return makeRec1081(i, { visualBeats: ['beat one', 'beat two'] });
        return makeRec1081(i);
      });
      const res = await runIN1081(recs1081cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_OPEN_THREAD_STAGING_AFTERMATH_VOID'), 'INTENTION_OPEN_THREAD_STAGING_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1067 — intentionPass: intention seed-dialogue-highlight aftermath void, intention clock-dialogue-highlight aftermath void, intention stakes-staging aftermath void', async () => {
    const makeRec1067 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'establish_world', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN1067 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('INTENTION_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when every seed is followed by two scenes with no highlighted dialogue', async () => {
      const recs1067a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1067(i, { seededClueIds: ['c1'] });
        if (i === 8 || i === 9) return makeRec1067(i, { dialogueHighlights: ['a memorable line'] });
        return makeRec1067(i);
      });
      const res = await runIN1067(recs1067a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'INTENTION_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    it('INTENTION_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a seed is followed by highlighted dialogue within its window', async () => {
      const recs1067an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1067(i, { seededClueIds: ['c1'] });
        if (i === 1 || i === 9) return makeRec1067(i, { dialogueHighlights: ['a memorable line'] });
        return makeRec1067(i);
      });
      const res = await runIN1067(recs1067an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'INTENTION_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });

    it('INTENTION_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when every clock-raise is followed by two scenes with no highlighted dialogue', async () => {
      const recs1067b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1067(i, { clockRaised: true });
        if (i === 8 || i === 9) return makeRec1067(i, { dialogueHighlights: ['a memorable line'] });
        return makeRec1067(i);
      });
      const res = await runIN1067(recs1067b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'INTENTION_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    it('INTENTION_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a clock-raise is followed by highlighted dialogue within its window', async () => {
      const recs1067bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1067(i, { clockRaised: true });
        if (i === 1 || i === 9) return makeRec1067(i, { dialogueHighlights: ['a memorable line'] });
        return makeRec1067(i);
      });
      const res = await runIN1067(recs1067bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'INTENTION_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });

    it('INTENTION_STAKES_STAGING_AFTERMATH_VOID fires when every stakes-raise is followed by two scenes with no visually dense scene', async () => {
      const recs1067c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1067(i, { purpose: 'raise_stakes' });
        if (i === 8 || i === 9) return makeRec1067(i, { visualBeats: ['beat one', 'beat two'] });
        return makeRec1067(i);
      });
      const res = await runIN1067(recs1067c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_STAKES_STAGING_AFTERMATH_VOID'), 'INTENTION_STAKES_STAGING_AFTERMATH_VOID should fire');
    });

    it('INTENTION_STAKES_STAGING_AFTERMATH_VOID does not fire when a stakes-raise is followed by a visually dense scene within its window', async () => {
      const recs1067cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1067(i, { purpose: 'raise_stakes' });
        if (i === 1 || i === 9) return makeRec1067(i, { visualBeats: ['beat one', 'beat two'] });
        return makeRec1067(i);
      });
      const res = await runIN1067(recs1067cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_STAKES_STAGING_AFTERMATH_VOID'), 'INTENTION_STAKES_STAGING_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1053 — intentionPass: intention open-thread-suspense aftermath void, intention seed-relational aftermath void, intention clock-relational aftermath void', async () => {
    const makeRec1053 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'establish_world', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN1053 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('INTENTION_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID fires when every heavy clue-debt scene is followed by two scenes with no suspense rise', async () => {
      const recs1053a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1053(i, { unresolvedClues: ['c1', 'c2', 'c3'] });
        if (i === 8 || i === 9) return makeRec1053(i, { suspenseDelta: 1 });
        return makeRec1053(i);
      });
      const res = await runIN1053(recs1053a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID'), 'INTENTION_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('INTENTION_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID does not fire when a heavy clue-debt scene is followed by a suspense rise within its window', async () => {
      const recs1053an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1053(i, { unresolvedClues: ['c1', 'c2', 'c3'] });
        if (i === 1 || i === 9) return makeRec1053(i, { suspenseDelta: 1 });
        return makeRec1053(i);
      });
      const res = await runIN1053(recs1053an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID'), 'INTENTION_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    it('INTENTION_SEED_RELATIONAL_AFTERMATH_VOID fires when every seed is followed by two scenes with no relationship shift', async () => {
      const recs1053b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1053(i, { seededClueIds: ['c1'] });
        if (i === 8 || i === 9) return makeRec1053(i, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
        return makeRec1053(i);
      });
      const res = await runIN1053(recs1053b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_SEED_RELATIONAL_AFTERMATH_VOID'), 'INTENTION_SEED_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('INTENTION_SEED_RELATIONAL_AFTERMATH_VOID does not fire when a seed is followed by a relationship shift within its window', async () => {
      const recs1053bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1053(i, { seededClueIds: ['c1'] });
        if (i === 1 || i === 9) return makeRec1053(i, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
        return makeRec1053(i);
      });
      const res = await runIN1053(recs1053bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_SEED_RELATIONAL_AFTERMATH_VOID'), 'INTENTION_SEED_RELATIONAL_AFTERMATH_VOID should not fire');
    });

    it('INTENTION_CLOCK_RELATIONAL_AFTERMATH_VOID fires when every clock-raise is followed by two scenes with no relationship shift', async () => {
      const recs1053c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1053(i, { clockRaised: true });
        if (i === 8 || i === 9) return makeRec1053(i, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
        return makeRec1053(i);
      });
      const res = await runIN1053(recs1053c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_CLOCK_RELATIONAL_AFTERMATH_VOID'), 'INTENTION_CLOCK_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('INTENTION_CLOCK_RELATIONAL_AFTERMATH_VOID does not fire when a clock-raise is followed by a relationship shift within its window', async () => {
      const recs1053cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1053(i, { clockRaised: true });
        if (i === 1 || i === 9) return makeRec1053(i, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
        return makeRec1053(i);
      });
      const res = await runIN1053(recs1053cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_CLOCK_RELATIONAL_AFTERMATH_VOID'), 'INTENTION_CLOCK_RELATIONAL_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1039 — intentionPass: intention open-thread-emotional aftermath void, intention seed-suspense aftermath void, intention clock-suspense aftermath void', async () => {
    const makeRec1039 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'establish_world', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN1039 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('INTENTION_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID fires when every heavy clue-debt scene is followed by two scenes with no emotional shift', async () => {
      const recs1039a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1039(i, { unresolvedClues: ['c1', 'c2', 'c3'] });
        if (i === 8 || i === 9) return makeRec1039(i, { emotionalShift: 'positive' });
        return makeRec1039(i);
      });
      const res = await runIN1039(recs1039a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID'), 'INTENTION_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('INTENTION_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID does not fire when a heavy clue-debt scene is followed by an emotional shift within its window', async () => {
      const recs1039an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1039(i, { unresolvedClues: ['c1', 'c2', 'c3'] });
        if (i === 1 || i === 9) return makeRec1039(i, { emotionalShift: 'positive' });
        return makeRec1039(i);
      });
      const res = await runIN1039(recs1039an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID'), 'INTENTION_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID should not fire');
    });

    it('INTENTION_SEED_SUSPENSE_AFTERMATH_VOID fires when every seed is followed by two scenes with no suspense rise', async () => {
      const recs1039b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1039(i, { seededClueIds: ['c1'] });
        if (i === 8 || i === 9) return makeRec1039(i, { suspenseDelta: 1 });
        return makeRec1039(i);
      });
      const res = await runIN1039(recs1039b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_SEED_SUSPENSE_AFTERMATH_VOID'), 'INTENTION_SEED_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('INTENTION_SEED_SUSPENSE_AFTERMATH_VOID does not fire when a seed is followed by a suspense rise within its window', async () => {
      const recs1039bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1039(i, { seededClueIds: ['c1'] });
        if (i === 1 || i === 9) return makeRec1039(i, { suspenseDelta: 1 });
        return makeRec1039(i);
      });
      const res = await runIN1039(recs1039bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_SEED_SUSPENSE_AFTERMATH_VOID'), 'INTENTION_SEED_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    it('INTENTION_CLOCK_SUSPENSE_AFTERMATH_VOID fires when every clock-raise is followed by two scenes with no suspense rise', async () => {
      const recs1039c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1039(i, { clockRaised: true });
        if (i === 8 || i === 9) return makeRec1039(i, { suspenseDelta: 1 });
        return makeRec1039(i);
      });
      const res = await runIN1039(recs1039c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_CLOCK_SUSPENSE_AFTERMATH_VOID'), 'INTENTION_CLOCK_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('INTENTION_CLOCK_SUSPENSE_AFTERMATH_VOID does not fire when a clock-raise is followed by a suspense rise within its window', async () => {
      const recs1039cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1039(i, { clockRaised: true });
        if (i === 1 || i === 9) return makeRec1039(i, { suspenseDelta: 1 });
        return makeRec1039(i);
      });
      const res = await runIN1039(recs1039cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_CLOCK_SUSPENSE_AFTERMATH_VOID'), 'INTENTION_CLOCK_SUSPENSE_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1025 — intentionPass: intention stakes-emotional aftermath void, intention clock-curiosity aftermath void, intention seed-emotional aftermath void', async () => {
    const makeRec1025 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'establish_world', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN1025 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('INTENTION_STAKES_EMOTIONAL_AFTERMATH_VOID fires when every stakes-raise is followed by two scenes with no emotional shift', async () => {
      const recs1025a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1025(i, { purpose: 'raise_stakes' });
        if (i === 8 || i === 9) return makeRec1025(i, { emotionalShift: 'positive' });
        return makeRec1025(i);
      });
      const res = await runIN1025(recs1025a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_STAKES_EMOTIONAL_AFTERMATH_VOID'), 'INTENTION_STAKES_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('INTENTION_STAKES_EMOTIONAL_AFTERMATH_VOID does not fire when a stakes-raise is followed by an emotional shift within its window', async () => {
      const recs1025an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1025(i, { purpose: 'raise_stakes' });
        if (i === 1 || i === 9) return makeRec1025(i, { emotionalShift: 'positive' });
        return makeRec1025(i);
      });
      const res = await runIN1025(recs1025an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_STAKES_EMOTIONAL_AFTERMATH_VOID'), 'INTENTION_STAKES_EMOTIONAL_AFTERMATH_VOID should not fire');
    });

    it('INTENTION_CLOCK_CURIOSITY_AFTERMATH_VOID fires when every clock-raise is followed by two scenes with no new curiosity', async () => {
      const recs1025b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1025(i, { clockRaised: true });
        if (i === 8 || i === 9) return makeRec1025(i, { curiosityDelta: 1 });
        return makeRec1025(i);
      });
      const res = await runIN1025(recs1025b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_CLOCK_CURIOSITY_AFTERMATH_VOID'), 'INTENTION_CLOCK_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('INTENTION_CLOCK_CURIOSITY_AFTERMATH_VOID does not fire when a clock-raise is followed by new curiosity within its window', async () => {
      const recs1025bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1025(i, { clockRaised: true });
        if (i === 1 || i === 9) return makeRec1025(i, { curiosityDelta: 1 });
        return makeRec1025(i);
      });
      const res = await runIN1025(recs1025bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_CLOCK_CURIOSITY_AFTERMATH_VOID'), 'INTENTION_CLOCK_CURIOSITY_AFTERMATH_VOID should not fire');
    });

    it('INTENTION_SEED_EMOTIONAL_AFTERMATH_VOID fires when every seed is followed by two scenes with no emotional shift', async () => {
      const recs1025c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1025(i, { seededClueIds: ['c1'] });
        if (i === 8 || i === 9) return makeRec1025(i, { emotionalShift: 'positive' });
        return makeRec1025(i);
      });
      const res = await runIN1025(recs1025c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_SEED_EMOTIONAL_AFTERMATH_VOID'), 'INTENTION_SEED_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('INTENTION_SEED_EMOTIONAL_AFTERMATH_VOID does not fire when a seed is followed by an emotional shift within its window', async () => {
      const recs1025cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1025(i, { seededClueIds: ['c1'] });
        if (i === 1 || i === 9) return makeRec1025(i, { emotionalShift: 'positive' });
        return makeRec1025(i);
      });
      const res = await runIN1025(recs1025cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_SEED_EMOTIONAL_AFTERMATH_VOID'), 'INTENTION_SEED_EMOTIONAL_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1011 — intentionPass: intention open-thread-curiosity aftermath void, intention clock-emotional aftermath void, intention stakes-relational aftermath void', async () => {
    const makeRec1011 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'establish_world', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN1011 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('INTENTION_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID fires when every heavy clue-debt scene is followed by two scenes with no new curiosity', async () => {
      const recs1011a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1011(i, { unresolvedClues: ['c1', 'c2', 'c3'] });
        if (i === 8 || i === 9) return makeRec1011(i, { curiosityDelta: 1 });
        return makeRec1011(i);
      });
      const res = await runIN1011(recs1011a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID'), 'INTENTION_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('INTENTION_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID does not fire when a heavy clue-debt scene is followed by new curiosity within its window', async () => {
      const recs1011an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1011(i, { unresolvedClues: ['c1', 'c2', 'c3'] });
        if (i === 1 || i === 9) return makeRec1011(i, { curiosityDelta: 1 });
        return makeRec1011(i);
      });
      const res = await runIN1011(recs1011an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID'), 'INTENTION_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID should not fire');
    });

    it('INTENTION_CLOCK_EMOTIONAL_AFTERMATH_VOID fires when every clock-raise is followed by two scenes with no emotional shift', async () => {
      const recs1011b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1011(i, { clockRaised: true });
        if (i === 8 || i === 9) return makeRec1011(i, { emotionalShift: 'positive' });
        return makeRec1011(i);
      });
      const res = await runIN1011(recs1011b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_CLOCK_EMOTIONAL_AFTERMATH_VOID'), 'INTENTION_CLOCK_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('INTENTION_CLOCK_EMOTIONAL_AFTERMATH_VOID does not fire when a clock-raise is followed by an emotional shift within its window', async () => {
      const recs1011bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1011(i, { clockRaised: true });
        if (i === 1 || i === 9) return makeRec1011(i, { emotionalShift: 'positive' });
        return makeRec1011(i);
      });
      const res = await runIN1011(recs1011bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_CLOCK_EMOTIONAL_AFTERMATH_VOID'), 'INTENTION_CLOCK_EMOTIONAL_AFTERMATH_VOID should not fire');
    });

    it('INTENTION_STAKES_RELATIONAL_AFTERMATH_VOID fires when every stakes-raise is followed by two scenes with no relationship shift', async () => {
      const recs1011c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1011(i, { purpose: 'raise_stakes' });
        if (i === 8 || i === 9) return makeRec1011(i, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
        return makeRec1011(i);
      });
      const res = await runIN1011(recs1011c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_STAKES_RELATIONAL_AFTERMATH_VOID'), 'INTENTION_STAKES_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('INTENTION_STAKES_RELATIONAL_AFTERMATH_VOID does not fire when a stakes-raise is followed by a relationship shift within its window', async () => {
      const recs1011cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec1011(i, { purpose: 'raise_stakes' });
        if (i === 1 || i === 9) return makeRec1011(i, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
        return makeRec1011(i);
      });
      const res = await runIN1011(recs1011cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_STAKES_RELATIONAL_AFTERMATH_VOID'), 'INTENTION_STAKES_RELATIONAL_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 997 — intentionPass: revelation zone imbalance, intention stakes-suspense aftermath void, intention seed-curiosity aftermath void', async () => {
    const makeRec997 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'establish_world', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN997 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched → no-fire.
    it('REVELATION_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of revelation scenes', async () => {
      const recs997a = Array.from({ length: 10 }, (_, i) =>
        makeRec997(i, [0, 1, 2, 8, 9].includes(i) ? { revelation: 'a hidden truth surfaces' } : {}));
      const res = await runIN997(recs997a);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_ZONE_IMBALANCE'), 'REVELATION_ZONE_IMBALANCE should fire');
    });

    it('REVELATION_ZONE_IMBALANCE does not fire when revelation scenes touch every zone', async () => {
      const recs997an = Array.from({ length: 10 }, (_, i) =>
        makeRec997(i, [0, 3, 5, 8].includes(i) ? { revelation: 'a hidden truth surfaces' } : {}));
      const res = await runIN997(recs997an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_ZONE_IMBALANCE'), 'REVELATION_ZONE_IMBALANCE should not fire');
    });

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('INTENTION_STAKES_SUSPENSE_AFTERMATH_VOID fires when every stakes-raise is followed by two scenes with no rise in suspense', async () => {
      const recs997b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec997(i, { purpose: 'raise_stakes' });
        if (i === 8 || i === 9) return makeRec997(i, { suspenseDelta: 1 });
        return makeRec997(i);
      });
      const res = await runIN997(recs997b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_STAKES_SUSPENSE_AFTERMATH_VOID'), 'INTENTION_STAKES_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('INTENTION_STAKES_SUSPENSE_AFTERMATH_VOID does not fire when a stakes-raise is followed by rising suspense within its window', async () => {
      const recs997bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec997(i, { purpose: 'raise_stakes' });
        if (i === 1 || i === 9) return makeRec997(i, { suspenseDelta: 1 });
        return makeRec997(i);
      });
      const res = await runIN997(recs997bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_STAKES_SUSPENSE_AFTERMATH_VOID'), 'INTENTION_STAKES_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    it('INTENTION_SEED_CURIOSITY_AFTERMATH_VOID fires when every seed is followed by two scenes with no new curiosity', async () => {
      const recs997c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec997(i, { seededClueIds: ['c1'] });
        if (i === 8 || i === 9) return makeRec997(i, { curiosityDelta: 1 });
        return makeRec997(i);
      });
      const res = await runIN997(recs997c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_SEED_CURIOSITY_AFTERMATH_VOID'), 'INTENTION_SEED_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('INTENTION_SEED_CURIOSITY_AFTERMATH_VOID does not fire when a seed is followed by new curiosity within its window', async () => {
      const recs997cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec997(i, { seededClueIds: ['c1'] });
        if (i === 1 || i === 9) return makeRec997(i, { curiosityDelta: 1 });
        return makeRec997(i);
      });
      const res = await runIN997(recs997cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_SEED_CURIOSITY_AFTERMATH_VOID'), 'INTENTION_SEED_CURIOSITY_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 983 — intentionPass: intention clock zone imbalance, intention highlight zone imbalance, intention stakes-curiosity aftermath void', async () => {
    const makeRec983 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'establish_world', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN983 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched → no-fire.
    it('INTENTION_CLOCK_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of clock-raising scenes', async () => {
      const recs983a = Array.from({ length: 10 }, (_, i) =>
        makeRec983(i, [0, 1, 2, 8, 9].includes(i) ? { clockRaised: true } : {}));
      const res = await runIN983(recs983a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_CLOCK_ZONE_IMBALANCE'), 'INTENTION_CLOCK_ZONE_IMBALANCE should fire');
    });

    it('INTENTION_CLOCK_ZONE_IMBALANCE does not fire when clock-raising scenes touch every zone', async () => {
      const recs983an = Array.from({ length: 10 }, (_, i) =>
        makeRec983(i, [0, 3, 5, 8].includes(i) ? { clockRaised: true } : {}));
      const res = await runIN983(recs983an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_CLOCK_ZONE_IMBALANCE'), 'INTENTION_CLOCK_ZONE_IMBALANCE should not fire');
    });

    it('INTENTION_HIGHLIGHT_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of dialogue-highlight scenes', async () => {
      const recs983b = Array.from({ length: 10 }, (_, i) =>
        makeRec983(i, [0, 1, 2, 8, 9].includes(i) ? { dialogueHighlights: ['line'] } : {}));
      const res = await runIN983(recs983b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_HIGHLIGHT_ZONE_IMBALANCE'), 'INTENTION_HIGHLIGHT_ZONE_IMBALANCE should fire');
    });

    it('INTENTION_HIGHLIGHT_ZONE_IMBALANCE does not fire when dialogue-highlight scenes touch every zone', async () => {
      const recs983bn = Array.from({ length: 10 }, (_, i) =>
        makeRec983(i, [0, 3, 5, 8].includes(i) ? { dialogueHighlights: ['line'] } : {}));
      const res = await runIN983(recs983bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_HIGHLIGHT_ZONE_IMBALANCE'), 'INTENTION_HIGHLIGHT_ZONE_IMBALANCE should not fire');
    });

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: curiosity raised only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: curiosity raised at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('INTENTION_STAKES_CURIOSITY_AFTERMATH_VOID fires when every stakes-raise is followed by two scenes with no new curiosity', async () => {
      const recs983c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec983(i, { purpose: 'raise_stakes' });
        if (i === 8 || i === 9) return makeRec983(i, { curiosityDelta: 1 });
        return makeRec983(i);
      });
      const res = await runIN983(recs983c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_STAKES_CURIOSITY_AFTERMATH_VOID'), 'INTENTION_STAKES_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('INTENTION_STAKES_CURIOSITY_AFTERMATH_VOID does not fire when a stakes-raise is followed by new curiosity within its window', async () => {
      const recs983cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeRec983(i, { purpose: 'raise_stakes' });
        if (i === 1 || i === 9) return makeRec983(i, { curiosityDelta: 1 });
        return makeRec983(i);
      });
      const res = await runIN983(recs983cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_STAKES_CURIOSITY_AFTERMATH_VOID'), 'INTENTION_STAKES_CURIOSITY_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 969 — intentionPass: intention relationship zone imbalance, intention turn zone imbalance, intention clock delta zone imbalance', async () => {
    const makeRec969 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'establish_world', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN969 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched → no-fire.
    it('INTENTION_RELATIONSHIP_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of relationship-shift scenes', async () => {
      const recs969a = Array.from({ length: 10 }, (_, i) =>
        makeRec969(i, [0, 1, 2, 8, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {}));
      const res = await runIN969(recs969a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_RELATIONSHIP_ZONE_IMBALANCE'), 'INTENTION_RELATIONSHIP_ZONE_IMBALANCE should fire');
    });

    it('INTENTION_RELATIONSHIP_ZONE_IMBALANCE does not fire when relationship-shift scenes touch every zone', async () => {
      const recs969an = Array.from({ length: 10 }, (_, i) =>
        makeRec969(i, [0, 3, 5, 8].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {}));
      const res = await runIN969(recs969an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_RELATIONSHIP_ZONE_IMBALANCE'), 'INTENTION_RELATIONSHIP_ZONE_IMBALANCE should not fire');
    });

    it('INTENTION_TURN_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of dramatic-turn scenes', async () => {
      const recs969b = Array.from({ length: 10 }, (_, i) =>
        makeRec969(i, [0, 1, 2, 8, 9].includes(i) ? { dramaticTurn: 'reversal' } : {}));
      const res = await runIN969(recs969b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_TURN_ZONE_IMBALANCE'), 'INTENTION_TURN_ZONE_IMBALANCE should fire');
    });

    it('INTENTION_TURN_ZONE_IMBALANCE does not fire when dramatic-turn scenes touch every zone', async () => {
      const recs969bn = Array.from({ length: 10 }, (_, i) =>
        makeRec969(i, [0, 3, 5, 8].includes(i) ? { dramaticTurn: 'reversal' } : {}));
      const res = await runIN969(recs969bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_TURN_ZONE_IMBALANCE'), 'INTENTION_TURN_ZONE_IMBALANCE should not fire');
    });

    it('INTENTION_CLOCK_DELTA_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of clock-moving scenes', async () => {
      const recs969c = Array.from({ length: 10 }, (_, i) =>
        makeRec969(i, [0, 1, 2, 8, 9].includes(i) ? { clockDelta: 1 } : {}));
      const res = await runIN969(recs969c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_CLOCK_DELTA_ZONE_IMBALANCE'), 'INTENTION_CLOCK_DELTA_ZONE_IMBALANCE should fire');
    });

    it('INTENTION_CLOCK_DELTA_ZONE_IMBALANCE does not fire when clock-moving scenes touch every zone', async () => {
      const recs969cn = Array.from({ length: 10 }, (_, i) =>
        makeRec969(i, [0, 3, 5, 8].includes(i) ? { clockDelta: 1 } : {}));
      const res = await runIN969(recs969cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_CLOCK_DELTA_ZONE_IMBALANCE'), 'INTENTION_CLOCK_DELTA_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 955 — intentionPass: intention negative emotion zone imbalance, intention curiosity zone imbalance, intention seed zone imbalance', async () => {
    const makeRec955 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'establish_world', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN955 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched → no-fire.
    it('INTENTION_NEGATIVE_EMOTION_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of negative-shift scenes', async () => {
      const recs955a = Array.from({ length: 10 }, (_, i) =>
        makeRec955(i, [0, 1, 2, 8, 9].includes(i) ? { emotionalShift: 'negative' } : {}));
      const res = await runIN955(recs955a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_NEGATIVE_EMOTION_ZONE_IMBALANCE'), 'INTENTION_NEGATIVE_EMOTION_ZONE_IMBALANCE should fire');
    });

    it('INTENTION_NEGATIVE_EMOTION_ZONE_IMBALANCE does not fire when negative-shift scenes touch every zone', async () => {
      const recs955an = Array.from({ length: 10 }, (_, i) =>
        makeRec955(i, [0, 3, 5, 8].includes(i) ? { emotionalShift: 'negative' } : {}));
      const res = await runIN955(recs955an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_NEGATIVE_EMOTION_ZONE_IMBALANCE'), 'INTENTION_NEGATIVE_EMOTION_ZONE_IMBALANCE should not fire');
    });

    it('INTENTION_CURIOSITY_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of curiosity-raising scenes', async () => {
      const recs955b = Array.from({ length: 10 }, (_, i) =>
        makeRec955(i, [0, 1, 2, 8, 9].includes(i) ? { curiosityDelta: 1 } : {}));
      const res = await runIN955(recs955b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_CURIOSITY_ZONE_IMBALANCE'), 'INTENTION_CURIOSITY_ZONE_IMBALANCE should fire');
    });

    it('INTENTION_CURIOSITY_ZONE_IMBALANCE does not fire when curiosity-raising scenes touch every zone', async () => {
      const recs955bn = Array.from({ length: 10 }, (_, i) =>
        makeRec955(i, [0, 3, 5, 8].includes(i) ? { curiosityDelta: 1 } : {}));
      const res = await runIN955(recs955bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_CURIOSITY_ZONE_IMBALANCE'), 'INTENTION_CURIOSITY_ZONE_IMBALANCE should not fire');
    });

    it('INTENTION_SEED_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of seeding scenes', async () => {
      const recs955c = Array.from({ length: 10 }, (_, i) =>
        makeRec955(i, [0, 1, 2, 8, 9].includes(i) ? { seededClueIds: ['c1'] } : {}));
      const res = await runIN955(recs955c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_SEED_ZONE_IMBALANCE'), 'INTENTION_SEED_ZONE_IMBALANCE should fire');
    });

    it('INTENTION_SEED_ZONE_IMBALANCE does not fire when seeding scenes touch every zone', async () => {
      const recs955cn = Array.from({ length: 10 }, (_, i) =>
        makeRec955(i, [0, 3, 5, 8].includes(i) ? { seededClueIds: ['c1'] } : {}));
      const res = await runIN955(recs955cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_SEED_ZONE_IMBALANCE'), 'INTENTION_SEED_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 941 — intentionPass: intention positive emotion zone imbalance, intention suspense zone imbalance, intention payoff zone imbalance', async () => {
    const makeRec941 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'establish_world', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN941 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched → no-fire.
    it('INTENTION_POSITIVE_EMOTION_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of positive-shift scenes', async () => {
      const recs941a = Array.from({ length: 10 }, (_, i) =>
        makeRec941(i, [0, 1, 2, 8, 9].includes(i) ? { emotionalShift: 'positive' } : {}));
      const res = await runIN941(recs941a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_POSITIVE_EMOTION_ZONE_IMBALANCE'), 'INTENTION_POSITIVE_EMOTION_ZONE_IMBALANCE should fire');
    });

    it('INTENTION_POSITIVE_EMOTION_ZONE_IMBALANCE does not fire when positive-shift scenes touch every zone', async () => {
      const recs941an = Array.from({ length: 10 }, (_, i) =>
        makeRec941(i, [0, 3, 5, 8].includes(i) ? { emotionalShift: 'positive' } : {}));
      const res = await runIN941(recs941an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_POSITIVE_EMOTION_ZONE_IMBALANCE'), 'INTENTION_POSITIVE_EMOTION_ZONE_IMBALANCE should not fire');
    });

    it('INTENTION_SUSPENSE_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of suspense-raising scenes', async () => {
      const recs941b = Array.from({ length: 10 }, (_, i) =>
        makeRec941(i, [0, 1, 2, 8, 9].includes(i) ? { suspenseDelta: 1 } : {}));
      const res = await runIN941(recs941b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_SUSPENSE_ZONE_IMBALANCE'), 'INTENTION_SUSPENSE_ZONE_IMBALANCE should fire');
    });

    it('INTENTION_SUSPENSE_ZONE_IMBALANCE does not fire when suspense-raising scenes touch every zone', async () => {
      const recs941bn = Array.from({ length: 10 }, (_, i) =>
        makeRec941(i, [0, 3, 5, 8].includes(i) ? { suspenseDelta: 1 } : {}));
      const res = await runIN941(recs941bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_SUSPENSE_ZONE_IMBALANCE'), 'INTENTION_SUSPENSE_ZONE_IMBALANCE should not fire');
    });

    it('INTENTION_PAYOFF_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of payoff scenes', async () => {
      const recs941c = Array.from({ length: 10 }, (_, i) =>
        makeRec941(i, [0, 1, 2, 8, 9].includes(i) ? { payoffSetupIds: ['s1'] } : {}));
      const res = await runIN941(recs941c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_PAYOFF_ZONE_IMBALANCE'), 'INTENTION_PAYOFF_ZONE_IMBALANCE should fire');
    });

    it('INTENTION_PAYOFF_ZONE_IMBALANCE does not fire when payoff scenes touch every zone', async () => {
      const recs941cn = Array.from({ length: 10 }, (_, i) =>
        makeRec941(i, [0, 3, 5, 8].includes(i) ? { payoffSetupIds: ['s1'] } : {}));
      const res = await runIN941(recs941cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_PAYOFF_ZONE_IMBALANCE'), 'INTENTION_PAYOFF_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 927 — intentionPass: intention character moment zone imbalance, intention stakes zone imbalance, intention revelation purpose zone imbalance', async () => {
    const makeRec927 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'establish_world', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN927 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched → no-fire.
    it('INTENTION_CHARACTER_MOMENT_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of character-moment scenes', async () => {
      const recs927a = Array.from({ length: 10 }, (_, i) =>
        makeRec927(i, [0, 1, 2, 8, 9].includes(i) ? { purpose: 'character_moment' } : {}));
      const res = await runIN927(recs927a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_CHARACTER_MOMENT_ZONE_IMBALANCE'), 'INTENTION_CHARACTER_MOMENT_ZONE_IMBALANCE should fire');
    });

    it('INTENTION_CHARACTER_MOMENT_ZONE_IMBALANCE does not fire when character-moment scenes touch every zone', async () => {
      const recs927an = Array.from({ length: 10 }, (_, i) =>
        makeRec927(i, [0, 3, 5, 8].includes(i) ? { purpose: 'character_moment' } : {}));
      const res = await runIN927(recs927an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_CHARACTER_MOMENT_ZONE_IMBALANCE'), 'INTENTION_CHARACTER_MOMENT_ZONE_IMBALANCE should not fire');
    });

    it('INTENTION_STAKES_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of stakes-raising scenes', async () => {
      const recs927b = Array.from({ length: 10 }, (_, i) =>
        makeRec927(i, [0, 1, 2, 8, 9].includes(i) ? { purpose: 'raise_stakes' } : {}));
      const res = await runIN927(recs927b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_STAKES_ZONE_IMBALANCE'), 'INTENTION_STAKES_ZONE_IMBALANCE should fire');
    });

    it('INTENTION_STAKES_ZONE_IMBALANCE does not fire when stakes-raising scenes touch every zone', async () => {
      const recs927bn = Array.from({ length: 10 }, (_, i) =>
        makeRec927(i, [0, 3, 5, 8].includes(i) ? { purpose: 'raise_stakes' } : {}));
      const res = await runIN927(recs927bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_STAKES_ZONE_IMBALANCE'), 'INTENTION_STAKES_ZONE_IMBALANCE should not fire');
    });

    it('INTENTION_REVELATION_PURPOSE_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of revelation-purposed scenes', async () => {
      const recs927c = Array.from({ length: 10 }, (_, i) =>
        makeRec927(i, [0, 1, 2, 8, 9].includes(i) ? { purpose: 'revelation' } : {}));
      const res = await runIN927(recs927c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_REVELATION_PURPOSE_ZONE_IMBALANCE'), 'INTENTION_REVELATION_PURPOSE_ZONE_IMBALANCE should fire');
    });

    it('INTENTION_REVELATION_PURPOSE_ZONE_IMBALANCE does not fire when revelation-purposed scenes touch every zone', async () => {
      const recs927cn = Array.from({ length: 10 }, (_, i) =>
        makeRec927(i, [0, 3, 5, 8].includes(i) ? { purpose: 'revelation' } : {}));
      const res = await runIN927(recs927cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_REVELATION_PURPOSE_ZONE_IMBALANCE'), 'INTENTION_REVELATION_PURPOSE_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 913 — intentionPass: intention resolution zone imbalance, intention turning point zone imbalance, intention introduce conflict zone imbalance', async () => {
    const makeRec913 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'establish_world', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN913 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched →
    // no-fire. Default filler purpose 'establish_world' is not one of the tested values.
    it('INTENTION_RESOLUTION_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of resolution-purposed scenes', async () => {
      const recs913a = Array.from({ length: 10 }, (_, i) =>
        makeRec913(i, [0, 1, 2, 8, 9].includes(i) ? { purpose: 'resolution' } : {}));
      const res = await runIN913(recs913a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_RESOLUTION_ZONE_IMBALANCE'), 'INTENTION_RESOLUTION_ZONE_IMBALANCE should fire');
    });

    it('INTENTION_RESOLUTION_ZONE_IMBALANCE does not fire when resolution-purposed scenes touch every zone', async () => {
      const recs913an = Array.from({ length: 10 }, (_, i) =>
        makeRec913(i, [0, 3, 5, 8].includes(i) ? { purpose: 'resolution' } : {}));
      const res = await runIN913(recs913an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_RESOLUTION_ZONE_IMBALANCE'), 'INTENTION_RESOLUTION_ZONE_IMBALANCE should not fire');
    });

    it('INTENTION_TURNING_POINT_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of turning-point scenes', async () => {
      const recs913b = Array.from({ length: 10 }, (_, i) =>
        makeRec913(i, [0, 1, 2, 8, 9].includes(i) ? { purpose: 'turning_point' } : {}));
      const res = await runIN913(recs913b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_TURNING_POINT_ZONE_IMBALANCE'), 'INTENTION_TURNING_POINT_ZONE_IMBALANCE should fire');
    });

    it('INTENTION_TURNING_POINT_ZONE_IMBALANCE does not fire when turning-point scenes touch every zone', async () => {
      const recs913bn = Array.from({ length: 10 }, (_, i) =>
        makeRec913(i, [0, 3, 5, 8].includes(i) ? { purpose: 'turning_point' } : {}));
      const res = await runIN913(recs913bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_TURNING_POINT_ZONE_IMBALANCE'), 'INTENTION_TURNING_POINT_ZONE_IMBALANCE should not fire');
    });

    it('INTENTION_INTRODUCE_CONFLICT_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of conflict-introducing scenes', async () => {
      const recs913c = Array.from({ length: 10 }, (_, i) =>
        makeRec913(i, [0, 1, 2, 8, 9].includes(i) ? { purpose: 'introduce_conflict' } : {}));
      const res = await runIN913(recs913c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_INTRODUCE_CONFLICT_ZONE_IMBALANCE'), 'INTENTION_INTRODUCE_CONFLICT_ZONE_IMBALANCE should fire');
    });

    it('INTENTION_INTRODUCE_CONFLICT_ZONE_IMBALANCE does not fire when conflict-introducing scenes touch every zone', async () => {
      const recs913cn = Array.from({ length: 10 }, (_, i) =>
        makeRec913(i, [0, 3, 5, 8].includes(i) ? { purpose: 'introduce_conflict' } : {}));
      const res = await runIN913(recs913cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_INTRODUCE_CONFLICT_ZONE_IMBALANCE'), 'INTENTION_INTRODUCE_CONFLICT_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 899 — intentionPass: intention revelation purpose zone cluster, intention revelation purpose drought run, intention complicate zone imbalance', async () => {
    const makeRec899 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'complicate', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN899 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // INTENTION_REVELATION_PURPOSE_ZONE_CLUSTER fire: n=9, 3 thirds; revelation-purposed scenes
    // at 0,1,2 (all in opening third) → 3/3 = 100% > 75%.
    it('INTENTION_REVELATION_PURPOSE_ZONE_CLUSTER fires when >75% of revelation-purposed scenes cluster in one third', async () => {
      const recs899a = Array.from({ length: 9 }, (_, i) =>
        makeRec899(i, [0, 1, 2].includes(i) ? { purpose: 'revelation' } : {}),
      );
      const res = await runIN899(recs899a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_REVELATION_PURPOSE_ZONE_CLUSTER'), 'INTENTION_REVELATION_PURPOSE_ZONE_CLUSTER should fire');
    });

    it('INTENTION_REVELATION_PURPOSE_ZONE_CLUSTER does not fire when revelation-purposed scenes spread across thirds', async () => {
      const recs899an = Array.from({ length: 9 }, (_, i) =>
        makeRec899(i, [0, 4, 8].includes(i) ? { purpose: 'revelation' } : {}),
      );
      const res = await runIN899(recs899an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_REVELATION_PURPOSE_ZONE_CLUSTER'), 'INTENTION_REVELATION_PURPOSE_ZONE_CLUSTER should not fire');
    });

    // INTENTION_REVELATION_PURPOSE_DROUGHT_RUN fire: n=10, revelation-purposed scenes at 0, 8, 9
    // (minPresentCount 3 satisfied), leaving a 7-scene gap (indices 1-7) — run of 7 >= threshold 6.
    it('INTENTION_REVELATION_PURPOSE_DROUGHT_RUN fires when a long run has no revelation-purposed scene', async () => {
      const recs899b = Array.from({ length: 10 }, (_, i) =>
        makeRec899(i, [0, 8, 9].includes(i) ? { purpose: 'revelation' } : {}),
      );
      const res = await runIN899(recs899b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_REVELATION_PURPOSE_DROUGHT_RUN'), 'INTENTION_REVELATION_PURPOSE_DROUGHT_RUN should fire');
    });

    it('INTENTION_REVELATION_PURPOSE_DROUGHT_RUN does not fire when revelation-purposed scenes are evenly spread', async () => {
      const recs899bn = Array.from({ length: 10 }, (_, i) =>
        makeRec899(i, [0, 3, 6, 9].includes(i) ? { purpose: 'revelation' } : {}),
      );
      const res = await runIN899(recs899bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_REVELATION_PURPOSE_DROUGHT_RUN'), 'INTENTION_REVELATION_PURPOSE_DROUGHT_RUN should not fire');
    });

    // INTENTION_COMPLICATE_ZONE_IMBALANCE fire: n=10, 4 zones (Z0={0,1,2}, Z1={3,4}, Z2={5,6,7},
    // Z3={8,9}); complicate at 0,1,2,8,9 → Z0 has 3/5=60% (bloat, >=50%), Z1 and Z2 are empty.
    it('INTENTION_COMPLICATE_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of complicating scenes', async () => {
      const recs899c = Array.from({ length: 10 }, (_, i) =>
        makeRec899(i, [0, 1, 2, 8, 9].includes(i) ? { purpose: 'complicate' } : { purpose: 'establish_world' }),
      );
      const res = await runIN899(recs899c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_COMPLICATE_ZONE_IMBALANCE'), 'INTENTION_COMPLICATE_ZONE_IMBALANCE should fire');
    });

    it('INTENTION_COMPLICATE_ZONE_IMBALANCE does not fire when complicating scenes touch every zone', async () => {
      const recs899cn = Array.from({ length: 10 }, (_, i) =>
        makeRec899(i, [0, 3, 5, 8].includes(i) ? { purpose: 'complicate' } : { purpose: 'establish_world' }),
      );
      const res = await runIN899(recs899cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_COMPLICATE_ZONE_IMBALANCE'), 'INTENTION_COMPLICATE_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 885 — intentionPass: intention complicate drought run, intention climax zone imbalance, intention establish world zone imbalance', async () => {
    const makeRec885 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'complicate', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN885 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // INTENTION_COMPLICATE_DROUGHT_RUN fire:
    // n=10; complicate at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('INTENTION_COMPLICATE_DROUGHT_RUN fires when a long run has no complicating scene', async () => {
      const recs885a = Array.from({ length: 10 }, (_, i) => makeRec885(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'complicate' } : { purpose: 'establish_world' }
      ));
      const res = await runIN885(recs885a);
      assert.ok(res.issues.some((is: any) => is.rule === 'INTENTION_COMPLICATE_DROUGHT_RUN'), 'INTENTION_COMPLICATE_DROUGHT_RUN should fire');
    });

    it('INTENTION_COMPLICATE_DROUGHT_RUN does not fire when complicating scenes are evenly spread', async () => {
      const recs885an = Array.from({ length: 10 }, (_, i) => makeRec885(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { purpose: 'complicate' } : { purpose: 'establish_world' }
      ));
      const res = await runIN885(recs885an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'INTENTION_COMPLICATE_DROUGHT_RUN'), 'INTENTION_COMPLICATE_DROUGHT_RUN should not fire');
    });

    // INTENTION_CLIMAX_ZONE_IMBALANCE fire:
    // n=10, 4 zones (Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}); climax at 0,1,2,8,9 →
    // Z0 has 3/5=60% (bloat, >=50%), Z1 and Z2 are empty.
    it('INTENTION_CLIMAX_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of climax-purposed scenes', async () => {
      const recs885b = Array.from({ length: 10 }, (_, i) => makeRec885(i,
        [0, 1, 2, 8, 9].includes(i) ? { purpose: 'climax' } : {}
      ));
      const res = await runIN885(recs885b);
      assert.ok(res.issues.some((is: any) => is.rule === 'INTENTION_CLIMAX_ZONE_IMBALANCE'), 'INTENTION_CLIMAX_ZONE_IMBALANCE should fire');
    });

    it('INTENTION_CLIMAX_ZONE_IMBALANCE does not fire when climax-purposed scenes touch every zone', async () => {
      const recs885bn = Array.from({ length: 10 }, (_, i) => makeRec885(i,
        [0, 3, 5, 8].includes(i) ? { purpose: 'climax' } : {}
      ));
      const res = await runIN885(recs885bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'INTENTION_CLIMAX_ZONE_IMBALANCE'), 'INTENTION_CLIMAX_ZONE_IMBALANCE should not fire');
    });

    // INTENTION_ESTABLISH_WORLD_ZONE_IMBALANCE fire: same zone geometry as above.
    it('INTENTION_ESTABLISH_WORLD_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of world-establishing scenes', async () => {
      const recs885c = Array.from({ length: 10 }, (_, i) => makeRec885(i,
        [0, 1, 2, 8, 9].includes(i) ? { purpose: 'establish_world' } : {}
      ));
      const res = await runIN885(recs885c);
      assert.ok(res.issues.some((is: any) => is.rule === 'INTENTION_ESTABLISH_WORLD_ZONE_IMBALANCE'), 'INTENTION_ESTABLISH_WORLD_ZONE_IMBALANCE should fire');
    });

    it('INTENTION_ESTABLISH_WORLD_ZONE_IMBALANCE does not fire when world-establishing scenes touch every zone', async () => {
      const recs885cn = Array.from({ length: 10 }, (_, i) => makeRec885(i,
        [0, 3, 5, 8].includes(i) ? { purpose: 'establish_world' } : {}
      ));
      const res = await runIN885(recs885cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'INTENTION_ESTABLISH_WORLD_ZONE_IMBALANCE'), 'INTENTION_ESTABLISH_WORLD_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 871 — intentionPass: intention climax drought run, intention resolution drought run, intention complicate zone cluster', async () => {
    const makeRec871 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'complicate', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN871 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // INTENTION_CLIMAX_DROUGHT_RUN fire:
    // n=10; climax at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('INTENTION_CLIMAX_DROUGHT_RUN fires when a long run has no climax-purposed scene', async () => {
      const recs871a = Array.from({ length: 10 }, (_, i) => makeRec871(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'climax' } : {}
      ));
      const res = await runIN871(recs871a);
      assert.ok(res.issues.some((is: any) => is.rule === 'INTENTION_CLIMAX_DROUGHT_RUN'), 'INTENTION_CLIMAX_DROUGHT_RUN should fire');
    });

    it('INTENTION_CLIMAX_DROUGHT_RUN does not fire when climax-purposed scenes are evenly spread', async () => {
      const recs871an = Array.from({ length: 10 }, (_, i) => makeRec871(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { purpose: 'climax' } : {}
      ));
      const res = await runIN871(recs871an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'INTENTION_CLIMAX_DROUGHT_RUN'), 'INTENTION_CLIMAX_DROUGHT_RUN should not fire');
    });

    // INTENTION_RESOLUTION_DROUGHT_RUN fire:
    // n=10; resolution at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('INTENTION_RESOLUTION_DROUGHT_RUN fires when a long run has no resolution-purposed scene', async () => {
      const recs871b = Array.from({ length: 10 }, (_, i) => makeRec871(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'resolution' } : {}
      ));
      const res = await runIN871(recs871b);
      assert.ok(res.issues.some((is: any) => is.rule === 'INTENTION_RESOLUTION_DROUGHT_RUN'), 'INTENTION_RESOLUTION_DROUGHT_RUN should fire');
    });

    it('INTENTION_RESOLUTION_DROUGHT_RUN does not fire when resolution-purposed scenes are evenly spread', async () => {
      const recs871bn = Array.from({ length: 10 }, (_, i) => makeRec871(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { purpose: 'resolution' } : {}
      ));
      const res = await runIN871(recs871bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'INTENTION_RESOLUTION_DROUGHT_RUN'), 'INTENTION_RESOLUTION_DROUGHT_RUN should not fire');
    });

    // INTENTION_COMPLICATE_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; complicate scenes at 0,1,2 → 100% opening third
    it('INTENTION_COMPLICATE_ZONE_CLUSTER fires when >75% of complicating scenes cluster in one third', async () => {
      const recs871c = Array.from({ length: 9 }, (_, i) => makeRec871(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'complicate' } : { purpose: 'establish_world' }
      ));
      const res = await runIN871(recs871c);
      assert.ok(res.issues.some((is: any) => is.rule === 'INTENTION_COMPLICATE_ZONE_CLUSTER'), 'INTENTION_COMPLICATE_ZONE_CLUSTER should fire');
    });

    it('INTENTION_COMPLICATE_ZONE_CLUSTER does not fire when complicating scenes spread across thirds', async () => {
      const recs871cn = Array.from({ length: 9 }, (_, i) => makeRec871(i,
        (i === 0 || i === 4 || i === 8) ? { purpose: 'complicate' } : { purpose: 'establish_world' }
      ));
      const res = await runIN871(recs871cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'INTENTION_COMPLICATE_ZONE_CLUSTER'), 'INTENTION_COMPLICATE_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 857 — intentionPass: intention establish world drought run, intention climax zone cluster, intention resolution zone cluster', async () => {
    const makeRec857 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'complicate', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN857 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // INTENTION_ESTABLISH_WORLD_DROUGHT_RUN fire:
    // n=10; establish_world at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('INTENTION_ESTABLISH_WORLD_DROUGHT_RUN fires when a long run has no world-building', async () => {
      const recs857a = Array.from({ length: 10 }, (_, i) => makeRec857(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'establish_world' } : {}
      ));
      const res = await runIN857(recs857a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_ESTABLISH_WORLD_DROUGHT_RUN'), 'INTENTION_ESTABLISH_WORLD_DROUGHT_RUN should fire');
    });

    it('INTENTION_ESTABLISH_WORLD_DROUGHT_RUN does not fire when world-establishing scenes are evenly spread', async () => {
      const recs857an = Array.from({ length: 10 }, (_, i) => makeRec857(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { purpose: 'establish_world' } : {}
      ));
      const res = await runIN857(recs857an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_ESTABLISH_WORLD_DROUGHT_RUN'), 'INTENTION_ESTABLISH_WORLD_DROUGHT_RUN should not fire');
    });

    // INTENTION_CLIMAX_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; climax scenes at 0,1,2 → 100% opening third
    it('INTENTION_CLIMAX_ZONE_CLUSTER fires when >75% of climax-purposed scenes cluster in one third', async () => {
      const recs857b = Array.from({ length: 9 }, (_, i) => makeRec857(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'climax' } : {}
      ));
      const res = await runIN857(recs857b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_CLIMAX_ZONE_CLUSTER'), 'INTENTION_CLIMAX_ZONE_CLUSTER should fire');
    });

    it('INTENTION_CLIMAX_ZONE_CLUSTER does not fire when climax-purposed scenes spread across thirds', async () => {
      const recs857bn = Array.from({ length: 9 }, (_, i) => makeRec857(i,
        (i === 0 || i === 4 || i === 8) ? { purpose: 'climax' } : {}
      ));
      const res = await runIN857(recs857bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_CLIMAX_ZONE_CLUSTER'), 'INTENTION_CLIMAX_ZONE_CLUSTER should not fire');
    });

    // INTENTION_RESOLUTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; resolution scenes at 0,1,2 → 100% opening third
    it('INTENTION_RESOLUTION_ZONE_CLUSTER fires when >75% of resolution-purposed scenes cluster in one third', async () => {
      const recs857c = Array.from({ length: 9 }, (_, i) => makeRec857(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'resolution' } : {}
      ));
      const res = await runIN857(recs857c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_RESOLUTION_ZONE_CLUSTER'), 'INTENTION_RESOLUTION_ZONE_CLUSTER should fire');
    });

    it('INTENTION_RESOLUTION_ZONE_CLUSTER does not fire when resolution-purposed scenes spread across thirds', async () => {
      const recs857cn = Array.from({ length: 9 }, (_, i) => makeRec857(i,
        (i === 0 || i === 4 || i === 8) ? { purpose: 'resolution' } : {}
      ));
      const res = await runIN857(recs857cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_RESOLUTION_ZONE_CLUSTER'), 'INTENTION_RESOLUTION_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 843 — intentionPass: intention introduce conflict drought run, intention negative emotion drought run, intention establish world zone cluster', async () => {
    const makeRec843 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'complicate', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN843 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // INTENTION_INTRODUCE_CONFLICT_DROUGHT_RUN fire:
    // n=10; introduce_conflict at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('INTENTION_INTRODUCE_CONFLICT_DROUGHT_RUN fires when a long run has no new conflict', async () => {
      const recs843a = Array.from({ length: 10 }, (_, i) => makeRec843(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'introduce_conflict' } : {}
      ));
      const res = await runIN843(recs843a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_INTRODUCE_CONFLICT_DROUGHT_RUN'), 'INTENTION_INTRODUCE_CONFLICT_DROUGHT_RUN should fire');
    });

    it('INTENTION_INTRODUCE_CONFLICT_DROUGHT_RUN does not fire when conflict-introducing scenes are evenly spread', async () => {
      const recs843an = Array.from({ length: 10 }, (_, i) => makeRec843(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { purpose: 'introduce_conflict' } : {}
      ));
      const res = await runIN843(recs843an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_INTRODUCE_CONFLICT_DROUGHT_RUN'), 'INTENTION_INTRODUCE_CONFLICT_DROUGHT_RUN should not fire');
    });

    // INTENTION_NEGATIVE_EMOTION_DROUGHT_RUN fire:
    // n=10; negative-emotion at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('INTENTION_NEGATIVE_EMOTION_DROUGHT_RUN fires when a long run has no negative-emotion charge', async () => {
      const recs843b = Array.from({ length: 10 }, (_, i) => makeRec843(i,
        (i === 0 || i === 1 || i === 2) ? { emotionalShift: 'negative' } : {}
      ));
      const res = await runIN843(recs843b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_NEGATIVE_EMOTION_DROUGHT_RUN'), 'INTENTION_NEGATIVE_EMOTION_DROUGHT_RUN should fire');
    });

    it('INTENTION_NEGATIVE_EMOTION_DROUGHT_RUN does not fire when negative-emotion scenes are evenly spread', async () => {
      const recs843bn = Array.from({ length: 10 }, (_, i) => makeRec843(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { emotionalShift: 'negative' } : {}
      ));
      const res = await runIN843(recs843bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_NEGATIVE_EMOTION_DROUGHT_RUN'), 'INTENTION_NEGATIVE_EMOTION_DROUGHT_RUN should not fire');
    });

    // INTENTION_ESTABLISH_WORLD_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; establish_world scenes at 0,1,2 → 100% opening third
    it('INTENTION_ESTABLISH_WORLD_ZONE_CLUSTER fires when >75% of world-establishing scenes cluster in one third', async () => {
      const recs843c = Array.from({ length: 9 }, (_, i) => makeRec843(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'establish_world' } : {}
      ));
      const res = await runIN843(recs843c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_ESTABLISH_WORLD_ZONE_CLUSTER'), 'INTENTION_ESTABLISH_WORLD_ZONE_CLUSTER should fire');
    });

    it('INTENTION_ESTABLISH_WORLD_ZONE_CLUSTER does not fire when world-establishing scenes spread across thirds', async () => {
      const recs843cn = Array.from({ length: 9 }, (_, i) => makeRec843(i,
        (i === 0 || i === 4 || i === 8) ? { purpose: 'establish_world' } : {}
      ));
      const res = await runIN843(recs843cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_ESTABLISH_WORLD_ZONE_CLUSTER'), 'INTENTION_ESTABLISH_WORLD_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 829 — intentionPass: intention turning point drought run, intention introduce conflict zone cluster, intention negative emotion zone cluster', async () => {
    const makeRec829 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'complicate', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN829 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // INTENTION_TURNING_POINT_DROUGHT_RUN fire:
    // n=10; turning_point at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('INTENTION_TURNING_POINT_DROUGHT_RUN fires when a long run has no turning point', async () => {
      const recs829a = Array.from({ length: 10 }, (_, i) => makeRec829(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'turning_point' } : {}
      ));
      const res = await runIN829(recs829a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_TURNING_POINT_DROUGHT_RUN'), 'INTENTION_TURNING_POINT_DROUGHT_RUN should fire');
    });

    it('INTENTION_TURNING_POINT_DROUGHT_RUN does not fire when turning points are evenly spread', async () => {
      const recs829an = Array.from({ length: 10 }, (_, i) => makeRec829(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { purpose: 'turning_point' } : {}
      ));
      const res = await runIN829(recs829an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_TURNING_POINT_DROUGHT_RUN'), 'INTENTION_TURNING_POINT_DROUGHT_RUN should not fire');
    });

    // INTENTION_INTRODUCE_CONFLICT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; introduce_conflict scenes at 0,1,2 → 100% opening third
    it('INTENTION_INTRODUCE_CONFLICT_ZONE_CLUSTER fires when >75% of conflict-introducing scenes cluster in one third', async () => {
      const recs829b = Array.from({ length: 9 }, (_, i) => makeRec829(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'introduce_conflict' } : {}
      ));
      const res = await runIN829(recs829b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_INTRODUCE_CONFLICT_ZONE_CLUSTER'), 'INTENTION_INTRODUCE_CONFLICT_ZONE_CLUSTER should fire');
    });

    it('INTENTION_INTRODUCE_CONFLICT_ZONE_CLUSTER does not fire when conflict-introducing scenes spread across thirds', async () => {
      const recs829bn = Array.from({ length: 9 }, (_, i) => makeRec829(i,
        (i === 0 || i === 4 || i === 8) ? { purpose: 'introduce_conflict' } : {}
      ));
      const res = await runIN829(recs829bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_INTRODUCE_CONFLICT_ZONE_CLUSTER'), 'INTENTION_INTRODUCE_CONFLICT_ZONE_CLUSTER should not fire');
    });

    // INTENTION_NEGATIVE_EMOTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; negative-emotion scenes at 0,1,2 → 100% opening third
    it('INTENTION_NEGATIVE_EMOTION_ZONE_CLUSTER fires when >75% of negative-emotion scenes cluster in one third', async () => {
      const recs829c = Array.from({ length: 9 }, (_, i) => makeRec829(i,
        (i === 0 || i === 1 || i === 2) ? { emotionalShift: 'negative' } : {}
      ));
      const res = await runIN829(recs829c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_NEGATIVE_EMOTION_ZONE_CLUSTER'), 'INTENTION_NEGATIVE_EMOTION_ZONE_CLUSTER should fire');
    });

    it('INTENTION_NEGATIVE_EMOTION_ZONE_CLUSTER does not fire when negative-emotion scenes spread across thirds', async () => {
      const recs829cn = Array.from({ length: 9 }, (_, i) => makeRec829(i,
        (i === 0 || i === 4 || i === 8) ? { emotionalShift: 'negative' } : {}
      ));
      const res = await runIN829(recs829cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_NEGATIVE_EMOTION_ZONE_CLUSTER'), 'INTENTION_NEGATIVE_EMOTION_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 815 — intentionPass: intention character moment zone cluster, intention character moment drought run, intention turning point zone cluster', async () => {
    const makeRec815 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'complicate', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN815 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // INTENTION_CHARACTER_MOMENT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; character_moment scenes at 0,1,2 → 100% opening third
    it('INTENTION_CHARACTER_MOMENT_ZONE_CLUSTER fires when >75% of character-moment scenes cluster in one third', async () => {
      const recs815a = Array.from({ length: 9 }, (_, i) => makeRec815(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'character_moment' } : {}
      ));
      const res = await runIN815(recs815a);
      assert.ok(res.issues.some((is: any) => is.rule === 'INTENTION_CHARACTER_MOMENT_ZONE_CLUSTER'), 'INTENTION_CHARACTER_MOMENT_ZONE_CLUSTER should fire');
    });

    it('INTENTION_CHARACTER_MOMENT_ZONE_CLUSTER does not fire when character-moment scenes spread across thirds', async () => {
      const recs815an = Array.from({ length: 9 }, (_, i) => makeRec815(i,
        (i === 0 || i === 4 || i === 8) ? { purpose: 'character_moment' } : {}
      ));
      const res = await runIN815(recs815an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'INTENTION_CHARACTER_MOMENT_ZONE_CLUSTER'), 'INTENTION_CHARACTER_MOMENT_ZONE_CLUSTER should not fire');
    });

    // INTENTION_CHARACTER_MOMENT_DROUGHT_RUN fire:
    // n=10; character_moment at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('INTENTION_CHARACTER_MOMENT_DROUGHT_RUN fires when a long run has no character moment', async () => {
      const recs815b = Array.from({ length: 10 }, (_, i) => makeRec815(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'character_moment' } : {}
      ));
      const res = await runIN815(recs815b);
      assert.ok(res.issues.some((is: any) => is.rule === 'INTENTION_CHARACTER_MOMENT_DROUGHT_RUN'), 'INTENTION_CHARACTER_MOMENT_DROUGHT_RUN should fire');
    });

    it('INTENTION_CHARACTER_MOMENT_DROUGHT_RUN does not fire when character moments are evenly spread', async () => {
      const recs815bn = Array.from({ length: 10 }, (_, i) => makeRec815(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { purpose: 'character_moment' } : {}
      ));
      const res = await runIN815(recs815bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'INTENTION_CHARACTER_MOMENT_DROUGHT_RUN'), 'INTENTION_CHARACTER_MOMENT_DROUGHT_RUN should not fire');
    });

    // INTENTION_TURNING_POINT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; turning_point scenes at 0,1,2 → 100% opening third
    it('INTENTION_TURNING_POINT_ZONE_CLUSTER fires when >75% of turning-point scenes cluster in one third', async () => {
      const recs815c = Array.from({ length: 9 }, (_, i) => makeRec815(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'turning_point' } : {}
      ));
      const res = await runIN815(recs815c);
      assert.ok(res.issues.some((is: any) => is.rule === 'INTENTION_TURNING_POINT_ZONE_CLUSTER'), 'INTENTION_TURNING_POINT_ZONE_CLUSTER should fire');
    });

    it('INTENTION_TURNING_POINT_ZONE_CLUSTER does not fire when turning-point scenes spread across thirds', async () => {
      const recs815cn = Array.from({ length: 9 }, (_, i) => makeRec815(i,
        (i === 0 || i === 4 || i === 8) ? { purpose: 'turning_point' } : {}
      ));
      const res = await runIN815(recs815cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'INTENTION_TURNING_POINT_ZONE_CLUSTER'), 'INTENTION_TURNING_POINT_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 801 — intentionPass: intention suspense peak uncaused, intention curiosity peak uncaused, intention positive emotion drought run', async () => {
    const makeRec801 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN801 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // INTENTION_SUSPENSE_PEAK_UNCAUSED fire:
    // 8 scenes; suspenseDelta qualifying (>0) at 2 and 5; peak resolves to the first (idx 2, tie
    // on magnitude 3); no dramaticTurn/revelation at indices 0 or 1 (2-scene lookback).
    it('INTENTION_SUSPENSE_PEAK_UNCAUSED fires when the peak suspense scene has no preparing cause nearby', async () => {
      const recs801a = Array.from({ length: 8 }, (_, i) => makeRec801(i,
        (i === 2 || i === 5) ? { suspenseDelta: 3 } : {}
      ));
      const res = await runIN801(recs801a);
      assert.ok(res.issues.some((is: any) => is.rule === 'INTENTION_SUSPENSE_PEAK_UNCAUSED'), 'INTENTION_SUSPENSE_PEAK_UNCAUSED should fire');
    });

    it('INTENTION_SUSPENSE_PEAK_UNCAUSED does not fire when a preparing cause precedes the peak suspense scene', async () => {
      const recs801an = Array.from({ length: 8 }, (_, i) => makeRec801(i,
        i === 1 ? { dramaticTurn: 'reversal' } :
        (i === 2 || i === 5) ? { suspenseDelta: 3 } : {}
      ));
      const res = await runIN801(recs801an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'INTENTION_SUSPENSE_PEAK_UNCAUSED'), 'INTENTION_SUSPENSE_PEAK_UNCAUSED should not fire');
    });

    // INTENTION_CURIOSITY_PEAK_UNCAUSED fire:
    // 8 scenes; curiosityDelta qualifying (>0) at 2 and 5; peak resolves to the first (idx 2, tie
    // on magnitude 3); no dramaticTurn/revelation at indices 0 or 1 (2-scene lookback).
    it('INTENTION_CURIOSITY_PEAK_UNCAUSED fires when the peak curiosity scene has no preparing cause nearby', async () => {
      const recs801b = Array.from({ length: 8 }, (_, i) => makeRec801(i,
        (i === 2 || i === 5) ? { curiosityDelta: 3 } : {}
      ));
      const res = await runIN801(recs801b);
      assert.ok(res.issues.some((is: any) => is.rule === 'INTENTION_CURIOSITY_PEAK_UNCAUSED'), 'INTENTION_CURIOSITY_PEAK_UNCAUSED should fire');
    });

    it('INTENTION_CURIOSITY_PEAK_UNCAUSED does not fire when a preparing cause precedes the peak curiosity scene', async () => {
      const recs801bn = Array.from({ length: 8 }, (_, i) => makeRec801(i,
        i === 1 ? { dramaticTurn: 'reversal' } :
        (i === 2 || i === 5) ? { curiosityDelta: 3 } : {}
      ));
      const res = await runIN801(recs801bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'INTENTION_CURIOSITY_PEAK_UNCAUSED'), 'INTENTION_CURIOSITY_PEAK_UNCAUSED should not fire');
    });

    // INTENTION_POSITIVE_EMOTION_DROUGHT_RUN fire:
    // n=10; positive-emotion at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('INTENTION_POSITIVE_EMOTION_DROUGHT_RUN fires when a long run has no positive-emotion charge', async () => {
      const recs801c = Array.from({ length: 10 }, (_, i) => makeRec801(i,
        (i === 0 || i === 1 || i === 2) ? { emotionalShift: 'positive' } : {}
      ));
      const res = await runIN801(recs801c);
      assert.ok(res.issues.some((is: any) => is.rule === 'INTENTION_POSITIVE_EMOTION_DROUGHT_RUN'), 'INTENTION_POSITIVE_EMOTION_DROUGHT_RUN should fire');
    });

    it('INTENTION_POSITIVE_EMOTION_DROUGHT_RUN does not fire when positive-emotion scenes are evenly spread', async () => {
      const recs801cn = Array.from({ length: 10 }, (_, i) => makeRec801(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { emotionalShift: 'positive' } : {}
      ));
      const res = await runIN801(recs801cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'INTENTION_POSITIVE_EMOTION_DROUGHT_RUN'), 'INTENTION_POSITIVE_EMOTION_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 787 — intentionPass: intention suspense drought run, intention curiosity zone cluster, intention turn zone cluster', async () => {
    const makeRec787 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN787 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: { revelationCount: records.filter((r: any) => r.revelation).length } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // INTENTION_SUSPENSE_DROUGHT_RUN fire:
    // n=10; suspenseDelta>0 at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('INTENTION_SUSPENSE_DROUGHT_RUN fires when a long run has no rising suspense', async () => {
      const recs787a = Array.from({ length: 10 }, (_, i) =>
        makeRec787(i, { suspenseDelta: [0, 1, 2].includes(i) ? 2 : 0 }),
      );
      const res = await runIN787(recs787a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_SUSPENSE_DROUGHT_RUN'), 'INTENTION_SUSPENSE_DROUGHT_RUN should fire');
    });

    it('INTENTION_SUSPENSE_DROUGHT_RUN does not fire when suspense rises are evenly spread', async () => {
      const recs787an = Array.from({ length: 10 }, (_, i) =>
        makeRec787(i, { suspenseDelta: [0, 3, 6, 9].includes(i) ? 2 : 0 }),
      );
      const res = await runIN787(recs787an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_SUSPENSE_DROUGHT_RUN'), 'INTENTION_SUSPENSE_DROUGHT_RUN should not fire');
    });

    // INTENTION_CURIOSITY_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; curiosity-positive scenes at 0,1,2 → 100% opening third
    it('INTENTION_CURIOSITY_ZONE_CLUSTER fires when >75% of curiosity-positive scenes cluster in one third', async () => {
      const recs787b = Array.from({ length: 9 }, (_, i) =>
        makeRec787(i, { curiosityDelta: [0, 1, 2].includes(i) ? 2 : 0 }),
      );
      const res = await runIN787(recs787b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_CURIOSITY_ZONE_CLUSTER'), 'INTENTION_CURIOSITY_ZONE_CLUSTER should fire');
    });

    it('INTENTION_CURIOSITY_ZONE_CLUSTER does not fire when curiosity-positive scenes spread across thirds', async () => {
      const recs787bn = Array.from({ length: 9 }, (_, i) =>
        makeRec787(i, { curiosityDelta: [0, 4, 8].includes(i) ? 2 : 0 }),
      );
      const res = await runIN787(recs787bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_CURIOSITY_ZONE_CLUSTER'), 'INTENTION_CURIOSITY_ZONE_CLUSTER should not fire');
    });

    // INTENTION_TURN_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; turn scenes at 0,1,2 → 100% opening third
    it('INTENTION_TURN_ZONE_CLUSTER fires when >75% of turn scenes cluster in one third', async () => {
      const recs787c = Array.from({ length: 9 }, (_, i) =>
        makeRec787(i, { dramaticTurn: [0, 1, 2].includes(i) ? 'reversal' : 'nothing' }),
      );
      const res = await runIN787(recs787c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_TURN_ZONE_CLUSTER'), 'INTENTION_TURN_ZONE_CLUSTER should fire');
    });

    it('INTENTION_TURN_ZONE_CLUSTER does not fire when turn scenes spread across thirds', async () => {
      const recs787cn = Array.from({ length: 9 }, (_, i) =>
        makeRec787(i, { dramaticTurn: [0, 4, 8].includes(i) ? 'reversal' : 'nothing' }),
      );
      const res = await runIN787(recs787cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_TURN_ZONE_CLUSTER'), 'INTENTION_TURN_ZONE_CLUSTER should not fire');
    });
  });


  describe('Wave 773 — intentionPass: intention suspense zone cluster, intention curiosity drought run, intention turn drought run', async () => {
    const makeRec773 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN773 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: { revelationCount: records.filter((r: any) => r.revelation).length } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // INTENTION_SUSPENSE_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; suspense-positive scenes at 0,1,2 → 100% opening third
    it('INTENTION_SUSPENSE_ZONE_CLUSTER fires when >75% of suspense-positive scenes cluster in one third', async () => {
      const recs773a = Array.from({ length: 9 }, (_, i) =>
        makeRec773(i, { suspenseDelta: [0, 1, 2].includes(i) ? 2 : 0 }),
      );
      const res = await runIN773(recs773a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_SUSPENSE_ZONE_CLUSTER'), 'INTENTION_SUSPENSE_ZONE_CLUSTER should fire');
    });

    it('INTENTION_SUSPENSE_ZONE_CLUSTER does not fire when suspense-positive scenes spread across thirds', async () => {
      const recs773an = Array.from({ length: 9 }, (_, i) =>
        makeRec773(i, { suspenseDelta: [0, 4, 8].includes(i) ? 2 : 0 }),
      );
      const res = await runIN773(recs773an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_SUSPENSE_ZONE_CLUSTER'), 'INTENTION_SUSPENSE_ZONE_CLUSTER should not fire');
    });

    // INTENTION_CURIOSITY_DROUGHT_RUN fire:
    // n=10; curiosityDelta>0 at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('INTENTION_CURIOSITY_DROUGHT_RUN fires when a long run has no rising curiosity', async () => {
      const recs773b = Array.from({ length: 10 }, (_, i) =>
        makeRec773(i, { curiosityDelta: [0, 1, 2].includes(i) ? 2 : 0 }),
      );
      const res = await runIN773(recs773b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_CURIOSITY_DROUGHT_RUN'), 'INTENTION_CURIOSITY_DROUGHT_RUN should fire');
    });

    it('INTENTION_CURIOSITY_DROUGHT_RUN does not fire when curiosity rises are evenly spread', async () => {
      const recs773bn = Array.from({ length: 10 }, (_, i) =>
        makeRec773(i, { curiosityDelta: [0, 3, 6, 9].includes(i) ? 2 : 0 }),
      );
      const res = await runIN773(recs773bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_CURIOSITY_DROUGHT_RUN'), 'INTENTION_CURIOSITY_DROUGHT_RUN should not fire');
    });

    // INTENTION_TURN_DROUGHT_RUN fire:
    // n=10; dramaticTurn present at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('INTENTION_TURN_DROUGHT_RUN fires when a long run has no dramatic turn', async () => {
      const recs773c = Array.from({ length: 10 }, (_, i) =>
        makeRec773(i, { dramaticTurn: [0, 1, 2].includes(i) ? 'reversal' : 'nothing' }),
      );
      const res = await runIN773(recs773c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_TURN_DROUGHT_RUN'), 'INTENTION_TURN_DROUGHT_RUN should fire');
    });

    it('INTENTION_TURN_DROUGHT_RUN does not fire when dramatic turns are evenly spread', async () => {
      const recs773cn = Array.from({ length: 10 }, (_, i) =>
        makeRec773(i, { dramaticTurn: [0, 3, 6, 9].includes(i) ? 'reversal' : 'nothing' }),
      );
      const res = await runIN773(recs773cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_TURN_DROUGHT_RUN'), 'INTENTION_TURN_DROUGHT_RUN should not fire');
    });
  });


  describe('Wave 759 — intentionPass: intention clock delta zone cluster, intention revelation peak uncaused, intention stakes zone cluster', async () => {
    const makeRec759 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN759 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: { revelationCount: records.filter((r: any) => r.revelation).length } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // INTENTION_CLOCK_DELTA_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; clock-shifting scenes at 0,1,2 → 100% opening third
    it('INTENTION_CLOCK_DELTA_ZONE_CLUSTER fires when >75% of clock-shifting scenes cluster in one third', async () => {
      const recs759a = Array.from({ length: 9 }, (_, i) => makeRec759(i,
        (i === 0 || i === 1 || i === 2) ? { clockDelta: 1 } : {}
      ));
      const res = await runIN759(recs759a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_CLOCK_DELTA_ZONE_CLUSTER'), 'INTENTION_CLOCK_DELTA_ZONE_CLUSTER should fire');
    });

    // INTENTION_CLOCK_DELTA_ZONE_CLUSTER no-fire:
    // clock-shifting scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('INTENTION_CLOCK_DELTA_ZONE_CLUSTER does not fire when clock movement is distributed across thirds', async () => {
      const recs759an = Array.from({ length: 9 }, (_, i) => makeRec759(i,
        (i === 0 || i === 4 || i === 7) ? { clockDelta: 1 } : {}
      ));
      const res = await runIN759(recs759an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_CLOCK_DELTA_ZONE_CLUSTER'), 'INTENTION_CLOCK_DELTA_ZONE_CLUSTER should not fire');
    });

    // INTENTION_REVELATION_PEAK_UNCAUSED fire:
    // 8 scenes; revelations at 2 and 5 (magnitude ties at 1, so the peak resolves to the first
    // occurrence — scene 2); no dramaticTurn at 2, 1, or 0.
    it('INTENTION_REVELATION_PEAK_UNCAUSED fires when the peak revelation scene has no dramatic turn nearby', async () => {
      const recs759b = Array.from({ length: 8 }, (_, i) => makeRec759(i,
        (i === 2 || i === 5) ? { revelation: 'a truth surfaces' } : {}
      ));
      const res = await runIN759(recs759b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_REVELATION_PEAK_UNCAUSED'), 'INTENTION_REVELATION_PEAK_UNCAUSED should fire');
    });

    // INTENTION_REVELATION_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 1, within the peak's 2-scene lookback (2-1=1)
    it('INTENTION_REVELATION_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak revelation within the lookback', async () => {
      const recs759bn = Array.from({ length: 8 }, (_, i) => makeRec759(i,
        i === 1 ? { dramaticTurn: 'reversal' }
        : (i === 2 || i === 5) ? { revelation: 'a truth surfaces' }
        : {}
      ));
      const res = await runIN759(recs759bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_REVELATION_PEAK_UNCAUSED'), 'INTENTION_REVELATION_PEAK_UNCAUSED should not fire');
    });

    // INTENTION_STAKES_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; stakes-raising scenes at 0,1,2 → 100% opening third
    it('INTENTION_STAKES_ZONE_CLUSTER fires when >75% of stakes-raising scenes cluster in one third', async () => {
      const recs759c = Array.from({ length: 9 }, (_, i) => makeRec759(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'raise_stakes' } : {}
      ));
      const res = await runIN759(recs759c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_STAKES_ZONE_CLUSTER'), 'INTENTION_STAKES_ZONE_CLUSTER should fire');
    });

    // INTENTION_STAKES_ZONE_CLUSTER no-fire:
    // stakes-raising scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('INTENTION_STAKES_ZONE_CLUSTER does not fire when stakes-raising scenes are distributed across thirds', async () => {
      const recs759cn = Array.from({ length: 9 }, (_, i) => makeRec759(i,
        (i === 0 || i === 4 || i === 7) ? { purpose: 'raise_stakes' } : {}
      ));
      const res = await runIN759(recs759cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_STAKES_ZONE_CLUSTER'), 'INTENTION_STAKES_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 745 — intentionPass: intention relationship zone cluster, intention seed drought run, intention clock delta drought run', async () => {
    const makeRec745 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN745 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: { revelationCount: records.filter((r: any) => r.revelation).length } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // INTENTION_RELATIONSHIP_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; relationship-shift scenes at 0,1,2 → 100% opening third
    it('INTENTION_RELATIONSHIP_ZONE_CLUSTER fires when >75% of relationship-shift scenes cluster in one third', async () => {
      const recs745a = Array.from({ length: 9 }, (_, i) => makeRec745(i,
        (i === 0 || i === 1 || i === 2) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {}
      ));
      const res = await runIN745(recs745a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_RELATIONSHIP_ZONE_CLUSTER'), 'INTENTION_RELATIONSHIP_ZONE_CLUSTER should fire');
    });

    // INTENTION_RELATIONSHIP_ZONE_CLUSTER no-fire:
    // relationship-shift scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('INTENTION_RELATIONSHIP_ZONE_CLUSTER does not fire when relationship-shift scenes are distributed across thirds', async () => {
      const recs745an = Array.from({ length: 9 }, (_, i) => makeRec745(i,
        (i === 0 || i === 4 || i === 7) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {}
      ));
      const res = await runIN745(recs745an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_RELATIONSHIP_ZONE_CLUSTER'), 'INTENTION_RELATIONSHIP_ZONE_CLUSTER should not fire');
    });

    // INTENTION_SEED_DROUGHT_RUN fire:
    // 10 scenes; seed scenes at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('INTENTION_SEED_DROUGHT_RUN fires when the longest no-new-clues run is ≥6', async () => {
      const recs745b = Array.from({ length: 10 }, (_, i) => makeRec745(i,
        (i === 0 || i === 1 || i === 2 || i === 9) ? { seededClueIds: ['clue-a'] } : {}
      ));
      const res = await runIN745(recs745b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_SEED_DROUGHT_RUN'), 'INTENTION_SEED_DROUGHT_RUN should fire');
    });

    // INTENTION_SEED_DROUGHT_RUN no-fire:
    // seed scenes at 0, 4, 9 → longest drought run = 4 (scenes 5-8) < 6
    it('INTENTION_SEED_DROUGHT_RUN does not fire when new clues are seeded without a long drought', async () => {
      const recs745bn = Array.from({ length: 10 }, (_, i) => makeRec745(i,
        (i === 0 || i === 4 || i === 9) ? { seededClueIds: ['clue-a'] } : {}
      ));
      const res = await runIN745(recs745bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_SEED_DROUGHT_RUN'), 'INTENTION_SEED_DROUGHT_RUN should not fire');
    });

    // INTENTION_CLOCK_DELTA_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 shift the clock (>=3 present overall); scenes 3-9 (7 scenes) have none
    it('INTENTION_CLOCK_DELTA_DROUGHT_RUN fires when the longest no-clock-movement run reaches 6', async () => {
      const recs745c = Array.from({ length: 10 }, (_, i) => makeRec745(i,
        (i === 0 || i === 1 || i === 2) ? { clockDelta: 1 } : {}
      ));
      const res = await runIN745(recs745c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_CLOCK_DELTA_DROUGHT_RUN'), 'INTENTION_CLOCK_DELTA_DROUGHT_RUN should fire');
    });

    // INTENTION_CLOCK_DELTA_DROUGHT_RUN no-fire:
    // clock-shifting scenes spread out so no gap reaches 6 consecutive scenes
    it('INTENTION_CLOCK_DELTA_DROUGHT_RUN does not fire when clock movement is spread through the story', async () => {
      const recs745cn = Array.from({ length: 10 }, (_, i) => makeRec745(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { clockDelta: 1 } : {}
      ));
      const res = await runIN745(recs745cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_CLOCK_DELTA_DROUGHT_RUN'), 'INTENTION_CLOCK_DELTA_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 731 — intentionPass: intention staging zone cluster, intention seed zone cluster, intention relationship drought run', async () => {
    const makeRec731 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN731 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: { revelationCount: records.filter((r: any) => r.revelation).length } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // INTENTION_STAGING_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; visually dense scenes at 0,1,2 → 100% opening third
    it('INTENTION_STAGING_ZONE_CLUSTER fires when >75% of visually dense scenes cluster in one third', async () => {
      const recs731a = Array.from({ length: 9 }, (_, i) => makeRec731(i,
        (i === 0 || i === 1 || i === 2) ? { visualBeats: ['a', 'b'] } : {}
      ));
      const res = await runIN731(recs731a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_STAGING_ZONE_CLUSTER'), 'INTENTION_STAGING_ZONE_CLUSTER should fire');
    });

    // INTENTION_STAGING_ZONE_CLUSTER no-fire:
    // visually dense scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('INTENTION_STAGING_ZONE_CLUSTER does not fire when visually dense scenes are distributed across thirds', async () => {
      const recs731an = Array.from({ length: 9 }, (_, i) => makeRec731(i,
        (i === 0 || i === 4 || i === 7) ? { visualBeats: ['a', 'b'] } : {}
      ));
      const res = await runIN731(recs731an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_STAGING_ZONE_CLUSTER'), 'INTENTION_STAGING_ZONE_CLUSTER should not fire');
    });

    // INTENTION_SEED_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; seed scenes at 0,1,2 → 100% opening third
    it('INTENTION_SEED_ZONE_CLUSTER fires when >75% of seed scenes cluster in one third', async () => {
      const recs731b = Array.from({ length: 9 }, (_, i) => makeRec731(i,
        (i === 0 || i === 1 || i === 2) ? { seededClueIds: ['clue-a'] } : {}
      ));
      const res = await runIN731(recs731b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_SEED_ZONE_CLUSTER'), 'INTENTION_SEED_ZONE_CLUSTER should fire');
    });

    // INTENTION_SEED_ZONE_CLUSTER no-fire:
    // seed scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('INTENTION_SEED_ZONE_CLUSTER does not fire when seed scenes are distributed across thirds', async () => {
      const recs731bn = Array.from({ length: 9 }, (_, i) => makeRec731(i,
        (i === 0 || i === 4 || i === 7) ? { seededClueIds: ['clue-a'] } : {}
      ));
      const res = await runIN731(recs731bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_SEED_ZONE_CLUSTER'), 'INTENTION_SEED_ZONE_CLUSTER should not fire');
    });

    // INTENTION_RELATIONSHIP_DROUGHT_RUN fire:
    // 10 scenes; relationship shifts at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('INTENTION_RELATIONSHIP_DROUGHT_RUN fires when the longest no-relationship-shift run is ≥6', async () => {
      const recs731c = Array.from({ length: 10 }, (_, i) => makeRec731(i,
        (i === 0 || i === 1 || i === 2 || i === 9) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {}
      ));
      const res = await runIN731(recs731c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_RELATIONSHIP_DROUGHT_RUN'), 'INTENTION_RELATIONSHIP_DROUGHT_RUN should fire');
    });

    // INTENTION_RELATIONSHIP_DROUGHT_RUN no-fire:
    // relationship shifts at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('INTENTION_RELATIONSHIP_DROUGHT_RUN does not fire when relationship shifts are distributed without a long drought', async () => {
      const recs731cn = Array.from({ length: 10 }, (_, i) => makeRec731(i,
        (i === 0 || i === 4 || i === 9) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {}
      ));
      const res = await runIN731(recs731cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_RELATIONSHIP_DROUGHT_RUN'), 'INTENTION_RELATIONSHIP_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 717 — intentionPass: intention highlight zone cluster, intention open thread peak uncaused, intention payoff drought run', async () => {
    const makeRec717 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN717 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: { revelationCount: records.filter((r: any) => r.revelation).length } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // INTENTION_HIGHLIGHT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; highlighted-dialogue scenes at 0,1,2 → 100% opening third
    it('INTENTION_HIGHLIGHT_ZONE_CLUSTER fires when >75% of highlighted-dialogue scenes cluster in one third', async () => {
      const recs717a = Array.from({ length: 9 }, (_, i) => makeRec717(i,
        (i === 0 || i === 1 || i === 2) ? { dialogueHighlights: ['line-a'] } : {}
      ));
      const res = await runIN717(recs717a);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'INTENTION_HIGHLIGHT_ZONE_CLUSTER'), 'INTENTION_HIGHLIGHT_ZONE_CLUSTER should fire');
    });

    // INTENTION_HIGHLIGHT_ZONE_CLUSTER no-fire:
    // highlighted-dialogue scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('INTENTION_HIGHLIGHT_ZONE_CLUSTER does not fire when highlighted-dialogue scenes are distributed across thirds', async () => {
      const recs717an = Array.from({ length: 9 }, (_, i) => makeRec717(i,
        (i === 0 || i === 4 || i === 7) ? { dialogueHighlights: ['line-a'] } : {}
      ));
      const res = await runIN717(recs717an);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'INTENTION_HIGHLIGHT_ZONE_CLUSTER'), 'INTENTION_HIGHLIGHT_ZONE_CLUSTER should not fire');
    });

    // INTENTION_OPEN_THREAD_PEAK_UNCAUSED fire:
    // 8 scenes; open threads at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('INTENTION_OPEN_THREAD_PEAK_UNCAUSED fires when the peak open-thread scene has no dramatic turn or revelation nearby', async () => {
      const recs717b = Array.from({ length: 8 }, (_, i) => makeRec717(i,
        i === 2 ? { unresolvedClues: ['a'] }
        : i === 6 ? { unresolvedClues: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runIN717(recs717b);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'INTENTION_OPEN_THREAD_PEAK_UNCAUSED'), 'INTENTION_OPEN_THREAD_PEAK_UNCAUSED should fire');
    });

    // INTENTION_OPEN_THREAD_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('INTENTION_OPEN_THREAD_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs717bn = Array.from({ length: 8 }, (_, i) => makeRec717(i,
        i === 2 ? { unresolvedClues: ['a'] }
        : i === 5 ? { dramaticTurn: 'reversal' }
        : i === 6 ? { unresolvedClues: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runIN717(recs717bn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'INTENTION_OPEN_THREAD_PEAK_UNCAUSED'), 'INTENTION_OPEN_THREAD_PEAK_UNCAUSED should not fire');
    });

    // INTENTION_PAYOFF_DROUGHT_RUN fire:
    // 10 scenes; payoffs at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('INTENTION_PAYOFF_DROUGHT_RUN fires when the longest no-payoff run is ≥6', async () => {
      const recs717c = Array.from({ length: 10 }, (_, i) => makeRec717(i,
        (i === 0 || i === 1 || i === 2 || i === 9) ? { payoffSetupIds: ['thread-a'] } : {}
      ));
      const res = await runIN717(recs717c);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'INTENTION_PAYOFF_DROUGHT_RUN'), 'INTENTION_PAYOFF_DROUGHT_RUN should fire');
    });

    // INTENTION_PAYOFF_DROUGHT_RUN no-fire:
    // payoffs at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('INTENTION_PAYOFF_DROUGHT_RUN does not fire when payoffs are distributed without a long drought', async () => {
      const recs717cn = Array.from({ length: 10 }, (_, i) => makeRec717(i,
        (i === 0 || i === 4 || i === 9) ? { payoffSetupIds: ['thread-a'] } : {}
      ));
      const res = await runIN717(recs717cn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'INTENTION_PAYOFF_DROUGHT_RUN'), 'INTENTION_PAYOFF_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 703 — intentionPass: intention highlight peak uncaused, intention payoff peak uncaused, intention open thread drought run', async () => {
    const makeRec703 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN703 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: { revelationCount: records.filter((r: any) => r.revelation).length } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // INTENTION_HIGHLIGHT_PEAK_UNCAUSED fire:
    // 8 scenes; highlights at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('INTENTION_HIGHLIGHT_PEAK_UNCAUSED fires when the peak highlighted-dialogue scene has no dramatic turn or revelation nearby', async () => {
      const recs703a = Array.from({ length: 8 }, (_, i) => makeRec703(i,
        i === 2 ? { dialogueHighlights: ['line-a'] }
        : i === 6 ? { dialogueHighlights: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runIN703(recs703a);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'INTENTION_HIGHLIGHT_PEAK_UNCAUSED'), 'INTENTION_HIGHLIGHT_PEAK_UNCAUSED should fire');
    });

    // INTENTION_HIGHLIGHT_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('INTENTION_HIGHLIGHT_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs703an = Array.from({ length: 8 }, (_, i) => makeRec703(i,
        i === 2 ? { dialogueHighlights: ['line-a'] }
        : i === 5 ? { dramaticTurn: 'reversal' }
        : i === 6 ? { dialogueHighlights: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runIN703(recs703an);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'INTENTION_HIGHLIGHT_PEAK_UNCAUSED'), 'INTENTION_HIGHLIGHT_PEAK_UNCAUSED should not fire');
    });

    // INTENTION_PAYOFF_PEAK_UNCAUSED fire:
    // 8 scenes; payoffs at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('INTENTION_PAYOFF_PEAK_UNCAUSED fires when the peak payoff scene has no dramatic turn or revelation nearby', async () => {
      const recs703b = Array.from({ length: 8 }, (_, i) => makeRec703(i,
        i === 2 ? { payoffSetupIds: ['thread-a'] }
        : i === 6 ? { payoffSetupIds: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runIN703(recs703b);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'INTENTION_PAYOFF_PEAK_UNCAUSED'), 'INTENTION_PAYOFF_PEAK_UNCAUSED should fire');
    });

    // INTENTION_PAYOFF_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('INTENTION_PAYOFF_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs703bn = Array.from({ length: 8 }, (_, i) => makeRec703(i,
        i === 2 ? { payoffSetupIds: ['thread-a'] }
        : i === 5 ? { dramaticTurn: 'reversal' }
        : i === 6 ? { payoffSetupIds: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runIN703(recs703bn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'INTENTION_PAYOFF_PEAK_UNCAUSED'), 'INTENTION_PAYOFF_PEAK_UNCAUSED should not fire');
    });

    // INTENTION_OPEN_THREAD_DROUGHT_RUN fire:
    // 10 scenes; open threads at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('INTENTION_OPEN_THREAD_DROUGHT_RUN fires when the longest no-open-thread run is ≥6', async () => {
      const recs703c = Array.from({ length: 10 }, (_, i) => makeRec703(i,
        (i === 0 || i === 1 || i === 2 || i === 9) ? { unresolvedClues: ['a'] } : {}
      ));
      const res = await runIN703(recs703c);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'INTENTION_OPEN_THREAD_DROUGHT_RUN'), 'INTENTION_OPEN_THREAD_DROUGHT_RUN should fire');
    });

    // INTENTION_OPEN_THREAD_DROUGHT_RUN no-fire:
    // open threads at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('INTENTION_OPEN_THREAD_DROUGHT_RUN does not fire when open threads are distributed without a long drought', async () => {
      const recs703cn = Array.from({ length: 10 }, (_, i) => makeRec703(i,
        (i === 0 || i === 4 || i === 9) ? { unresolvedClues: ['a'] } : {}
      ));
      const res = await runIN703(recs703cn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'INTENTION_OPEN_THREAD_DROUGHT_RUN'), 'INTENTION_OPEN_THREAD_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 689 — intentionPass: intention seed peak uncaused, intention staging drought run, intention clock zone cluster', async () => {
    const makeRec689 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN689 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: { revelationCount: records.filter((r: any) => r.revelation).length } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // INTENTION_SEED_PEAK_UNCAUSED fire:
    // 8 scenes; seeds at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('INTENTION_SEED_PEAK_UNCAUSED fires when the peak seed scene has no dramatic turn or revelation nearby', async () => {
      const recs689a = Array.from({ length: 8 }, (_, i) => makeRec689(i,
        i === 2 ? { seededClueIds: ['clue-a'] }
        : i === 6 ? { seededClueIds: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runIN689(recs689a);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'INTENTION_SEED_PEAK_UNCAUSED'), 'INTENTION_SEED_PEAK_UNCAUSED should fire');
    });

    // INTENTION_SEED_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('INTENTION_SEED_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs689an = Array.from({ length: 8 }, (_, i) => makeRec689(i,
        i === 2 ? { seededClueIds: ['clue-a'] }
        : i === 5 ? { dramaticTurn: 'reversal' }
        : i === 6 ? { seededClueIds: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runIN689(recs689an);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'INTENTION_SEED_PEAK_UNCAUSED'), 'INTENTION_SEED_PEAK_UNCAUSED should not fire');
    });

    // INTENTION_STAGING_DROUGHT_RUN fire:
    // 10 scenes; visual beats at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('INTENTION_STAGING_DROUGHT_RUN fires when the longest no-visual-beat run is ≥6', async () => {
      const recs689b = Array.from({ length: 10 }, (_, i) => makeRec689(i,
        (i === 0 || i === 1 || i === 2 || i === 9) ? { visualBeats: ['a beat'] } : {}
      ));
      const res = await runIN689(recs689b);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'INTENTION_STAGING_DROUGHT_RUN'), 'INTENTION_STAGING_DROUGHT_RUN should fire');
    });

    // INTENTION_STAGING_DROUGHT_RUN no-fire:
    // visual beats at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('INTENTION_STAGING_DROUGHT_RUN does not fire when visual beats are distributed without a long drought', async () => {
      const recs689bn = Array.from({ length: 10 }, (_, i) => makeRec689(i,
        (i === 0 || i === 4 || i === 9) ? { visualBeats: ['a beat'] } : {}
      ));
      const res = await runIN689(recs689bn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'INTENTION_STAGING_DROUGHT_RUN'), 'INTENTION_STAGING_DROUGHT_RUN should not fire');
    });

    // INTENTION_CLOCK_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; clock-raised scenes at 0,1,2 → 100% opening third
    it('INTENTION_CLOCK_ZONE_CLUSTER fires when >75% of clock-raised scenes cluster in one third', async () => {
      const recs689c = Array.from({ length: 9 }, (_, i) => makeRec689(i,
        (i === 0 || i === 1 || i === 2) ? { clockRaised: true } : {}
      ));
      const res = await runIN689(recs689c);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'INTENTION_CLOCK_ZONE_CLUSTER'), 'INTENTION_CLOCK_ZONE_CLUSTER should fire');
    });

    // INTENTION_CLOCK_ZONE_CLUSTER no-fire:
    // clock-raised scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('INTENTION_CLOCK_ZONE_CLUSTER does not fire when clock-raised scenes are distributed across thirds', async () => {
      const recs689cn = Array.from({ length: 9 }, (_, i) => makeRec689(i,
        (i === 0 || i === 4 || i === 7) ? { clockRaised: true } : {}
      ));
      const res = await runIN689(recs689cn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'INTENTION_CLOCK_ZONE_CLUSTER'), 'INTENTION_CLOCK_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 675 — intentionPass: intention clock delta peak uncaused, intention stakes drought run, intention positive emotion zone cluster', async () => {
    const makeRec675 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN675 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: { revelationCount: records.filter((r: any) => r.revelation).length } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // INTENTION_CLOCK_DELTA_PEAK_UNCAUSED fire:
    // n=8; clockDelta at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('INTENTION_CLOCK_DELTA_PEAK_UNCAUSED fires when the peak clockDelta scene has no dramatic turn or revelation nearby', async () => {
      const recs675a = Array.from({ length: 8 }, (_, i) => makeRec675(i));
      recs675a[2] = makeRec675(2, { clockDelta: 1 });
      recs675a[6] = makeRec675(6, { clockDelta: 5 });
      const res = await runIN675(recs675a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_CLOCK_DELTA_PEAK_UNCAUSED'), 'INTENTION_CLOCK_DELTA_PEAK_UNCAUSED should fire');
    });

    // INTENTION_CLOCK_DELTA_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('INTENTION_CLOCK_DELTA_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs675an = Array.from({ length: 8 }, (_, i) => makeRec675(i));
      recs675an[2] = makeRec675(2, { clockDelta: 1 });
      recs675an[5] = makeRec675(5, { dramaticTurn: 'reversal' });
      recs675an[6] = makeRec675(6, { clockDelta: 5 });
      const res = await runIN675(recs675an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_CLOCK_DELTA_PEAK_UNCAUSED'), 'INTENTION_CLOCK_DELTA_PEAK_UNCAUSED should not fire');
    });

    // INTENTION_STAKES_DROUGHT_RUN fire:
    // 10 scenes; stakes-raising at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('INTENTION_STAKES_DROUGHT_RUN fires when the longest no-stakes-raising run is ≥6', async () => {
      const recs675b = Array.from({ length: 10 }, (_, i) => makeRec675(i));
      recs675b[0] = makeRec675(0, { purpose: 'raise_stakes' });
      recs675b[1] = makeRec675(1, { purpose: 'raise_stakes' });
      recs675b[2] = makeRec675(2, { purpose: 'raise_stakes' });
      recs675b[9] = makeRec675(9, { purpose: 'raise_stakes' });
      const res = await runIN675(recs675b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_STAKES_DROUGHT_RUN'), 'INTENTION_STAKES_DROUGHT_RUN should fire');
    });

    // INTENTION_STAKES_DROUGHT_RUN no-fire:
    // stakes-raising at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('INTENTION_STAKES_DROUGHT_RUN does not fire when stakes-raising scenes are distributed without a long drought', async () => {
      const recs675bn = Array.from({ length: 10 }, (_, i) => makeRec675(i));
      recs675bn[0] = makeRec675(0, { purpose: 'raise_stakes' });
      recs675bn[4] = makeRec675(4, { purpose: 'raise_stakes' });
      recs675bn[9] = makeRec675(9, { purpose: 'raise_stakes' });
      const res = await runIN675(recs675bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_STAKES_DROUGHT_RUN'), 'INTENTION_STAKES_DROUGHT_RUN should not fire');
    });

    // INTENTION_POSITIVE_EMOTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; positive-emotion scenes at 0,1,2 → 100% opening third
    it('INTENTION_POSITIVE_EMOTION_ZONE_CLUSTER fires when >75% of positive-emotion scenes cluster in one third', async () => {
      const recs675c = Array.from({ length: 9 }, (_, i) => makeRec675(i));
      recs675c[0] = makeRec675(0, { emotionalShift: 'positive' });
      recs675c[1] = makeRec675(1, { emotionalShift: 'positive' });
      recs675c[2] = makeRec675(2, { emotionalShift: 'positive' });
      const res = await runIN675(recs675c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_POSITIVE_EMOTION_ZONE_CLUSTER'), 'INTENTION_POSITIVE_EMOTION_ZONE_CLUSTER should fire');
    });

    // INTENTION_POSITIVE_EMOTION_ZONE_CLUSTER no-fire:
    // positive-emotion scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('INTENTION_POSITIVE_EMOTION_ZONE_CLUSTER does not fire when positive-emotion scenes are distributed across thirds', async () => {
      const recs675cn = Array.from({ length: 9 }, (_, i) => makeRec675(i));
      recs675cn[0] = makeRec675(0, { emotionalShift: 'positive' });
      recs675cn[4] = makeRec675(4, { emotionalShift: 'positive' });
      recs675cn[7] = makeRec675(7, { emotionalShift: 'positive' });
      const res = await runIN675(recs675cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_POSITIVE_EMOTION_ZONE_CLUSTER'), 'INTENTION_POSITIVE_EMOTION_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 661 — intentionPass: intention relationship peak uncaused, intention clock drought run, intention payoff zone cluster', async () => {
    const makeRec661 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN661 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: { revelationCount: records.filter((r: any) => r.revelation).length } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // INTENTION_RELATIONSHIP_PEAK_UNCAUSED fire:
    // 8 scenes; shifts at 2 (1 shift) and 6 (5 shifts, the peak); no dramaticTurn or revelation at
    // 6, 5, or 4
    it('INTENTION_RELATIONSHIP_PEAK_UNCAUSED fires when the peak relationship-shift scene has no dramatic turn or revelation nearby', async () => {
      const recs661a = Array.from({ length: 8 }, (_, i) => makeRec661(i));
      recs661a[2] = makeRec661(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs661a[6] = makeRec661(6, { relationshipShifts: [0, 1, 2, 3, 4].map(n => ({ pairKey: `a|${n}`, dimension: 'trust', amount: 0.2 })) });
      const res = await runIN661(recs661a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_RELATIONSHIP_PEAK_UNCAUSED'), 'INTENTION_RELATIONSHIP_PEAK_UNCAUSED should fire');
    });

    // INTENTION_RELATIONSHIP_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('INTENTION_RELATIONSHIP_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs661an = Array.from({ length: 8 }, (_, i) => makeRec661(i));
      recs661an[2] = makeRec661(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs661an[5] = makeRec661(5, { dramaticTurn: 'reversal' });
      recs661an[6] = makeRec661(6, { relationshipShifts: [0, 1, 2, 3, 4].map(n => ({ pairKey: `a|${n}`, dimension: 'trust', amount: 0.2 })) });
      const res = await runIN661(recs661an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_RELATIONSHIP_PEAK_UNCAUSED'), 'INTENTION_RELATIONSHIP_PEAK_UNCAUSED should not fire');
    });

    // INTENTION_CLOCK_DROUGHT_RUN fire:
    // 10 scenes; clock raised at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('INTENTION_CLOCK_DROUGHT_RUN fires when the longest no-clock run is ≥6', async () => {
      const recs661b = Array.from({ length: 10 }, (_, i) => makeRec661(i));
      recs661b[0] = makeRec661(0, { clockRaised: true });
      recs661b[1] = makeRec661(1, { clockRaised: true });
      recs661b[2] = makeRec661(2, { clockRaised: true });
      recs661b[9] = makeRec661(9, { clockRaised: true });
      const res = await runIN661(recs661b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_CLOCK_DROUGHT_RUN'), 'INTENTION_CLOCK_DROUGHT_RUN should fire');
    });

    // INTENTION_CLOCK_DROUGHT_RUN no-fire:
    // clock raised at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('INTENTION_CLOCK_DROUGHT_RUN does not fire when clock raises are distributed without a long drought', async () => {
      const recs661bn = Array.from({ length: 10 }, (_, i) => makeRec661(i));
      recs661bn[0] = makeRec661(0, { clockRaised: true });
      recs661bn[4] = makeRec661(4, { clockRaised: true });
      recs661bn[9] = makeRec661(9, { clockRaised: true });
      const res = await runIN661(recs661bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_CLOCK_DROUGHT_RUN'), 'INTENTION_CLOCK_DROUGHT_RUN should not fire');
    });

    // INTENTION_PAYOFF_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; payoff scenes at 0,1,2 → 100% opening third
    it('INTENTION_PAYOFF_ZONE_CLUSTER fires when >75% of payoff scenes cluster in one third', async () => {
      const recs661c = Array.from({ length: 9 }, (_, i) => makeRec661(i));
      recs661c[0] = makeRec661(0, { payoffSetupIds: ['thread-a'] });
      recs661c[1] = makeRec661(1, { payoffSetupIds: ['thread-b'] });
      recs661c[2] = makeRec661(2, { payoffSetupIds: ['thread-c'] });
      const res = await runIN661(recs661c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_PAYOFF_ZONE_CLUSTER'), 'INTENTION_PAYOFF_ZONE_CLUSTER should fire');
    });

    // INTENTION_PAYOFF_ZONE_CLUSTER no-fire:
    // payoff scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('INTENTION_PAYOFF_ZONE_CLUSTER does not fire when payoff scenes are distributed across thirds', async () => {
      const recs661cn = Array.from({ length: 9 }, (_, i) => makeRec661(i));
      recs661cn[0] = makeRec661(0, { payoffSetupIds: ['thread-a'] });
      recs661cn[4] = makeRec661(4, { payoffSetupIds: ['thread-b'] });
      recs661cn[7] = makeRec661(7, { payoffSetupIds: ['thread-c'] });
      const res = await runIN661(recs661cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_PAYOFF_ZONE_CLUSTER'), 'INTENTION_PAYOFF_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 647 — intentionPass: intention highlight drought run, intention open thread zone cluster, intention staging curiosity decoupled', async () => {
    const makeRec647 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN647 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: { revelationCount: records.filter((r: any) => r.revelation).length } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // INTENTION_HIGHLIGHT_DROUGHT_RUN fire:
    // 10 scenes; highlights at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('INTENTION_HIGHLIGHT_DROUGHT_RUN fires when the longest no-highlighted-dialogue run is ≥6', async () => {
      const recs647a = Array.from({ length: 10 }, (_, i) => makeRec647(i));
      recs647a[0] = makeRec647(0, { dialogueHighlights: ['line-a'] });
      recs647a[1] = makeRec647(1, { dialogueHighlights: ['line-b'] });
      recs647a[2] = makeRec647(2, { dialogueHighlights: ['line-c'] });
      recs647a[9] = makeRec647(9, { dialogueHighlights: ['line-d'] });
      const res = await runIN647(recs647a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_HIGHLIGHT_DROUGHT_RUN'), 'INTENTION_HIGHLIGHT_DROUGHT_RUN should fire');
    });

    // INTENTION_HIGHLIGHT_DROUGHT_RUN no-fire:
    // highlights at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('INTENTION_HIGHLIGHT_DROUGHT_RUN does not fire when highlighted dialogue is distributed without a long drought', async () => {
      const recs647an = Array.from({ length: 10 }, (_, i) => makeRec647(i));
      recs647an[0] = makeRec647(0, { dialogueHighlights: ['line-a'] });
      recs647an[4] = makeRec647(4, { dialogueHighlights: ['line-b'] });
      recs647an[9] = makeRec647(9, { dialogueHighlights: ['line-c'] });
      const res = await runIN647(recs647an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_HIGHLIGHT_DROUGHT_RUN'), 'INTENTION_HIGHLIGHT_DROUGHT_RUN should not fire');
    });

    // INTENTION_OPEN_THREAD_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; open-thread scenes at 0,1,2 → 100% opening third
    it('INTENTION_OPEN_THREAD_ZONE_CLUSTER fires when >75% of open-thread scenes cluster in one third', async () => {
      const recs647b = Array.from({ length: 9 }, (_, i) => makeRec647(i));
      recs647b[0] = makeRec647(0, { unresolvedClues: ['a'] });
      recs647b[1] = makeRec647(1, { unresolvedClues: ['b'] });
      recs647b[2] = makeRec647(2, { unresolvedClues: ['c'] });
      const res = await runIN647(recs647b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_OPEN_THREAD_ZONE_CLUSTER'), 'INTENTION_OPEN_THREAD_ZONE_CLUSTER should fire');
    });

    // INTENTION_OPEN_THREAD_ZONE_CLUSTER no-fire:
    // open-thread scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('INTENTION_OPEN_THREAD_ZONE_CLUSTER does not fire when open-thread scenes are distributed across thirds', async () => {
      const recs647bn = Array.from({ length: 9 }, (_, i) => makeRec647(i));
      recs647bn[0] = makeRec647(0, { unresolvedClues: ['a'] });
      recs647bn[4] = makeRec647(4, { unresolvedClues: ['b'] });
      recs647bn[7] = makeRec647(7, { unresolvedClues: ['c'] });
      const res = await runIN647(recs647bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_OPEN_THREAD_ZONE_CLUSTER'), 'INTENTION_OPEN_THREAD_ZONE_CLUSTER should not fire');
    });

    // INTENTION_STAGING_CURIOSITY_DECOUPLED fire:
    // n=6; staged at 0,1 (no curiosity rise); curiosity rises at 4,5 (no staging) → zero overlap → fires
    it('INTENTION_STAGING_CURIOSITY_DECOUPLED fires when visually-staged scenes and rising-curiosity scenes never overlap', async () => {
      const recs647c = Array.from({ length: 6 }, (_, i) => makeRec647(i));
      recs647c[0] = makeRec647(0, { visualBeats: ['grabs the phone'] });
      recs647c[1] = makeRec647(1, { visualBeats: ['checks the screen'] });
      recs647c[4] = makeRec647(4, { curiosityDelta: 1 });
      recs647c[5] = makeRec647(5, { curiosityDelta: 1 });
      const res = await runIN647(recs647c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_STAGING_CURIOSITY_DECOUPLED'), 'INTENTION_STAGING_CURIOSITY_DECOUPLED should fire');
    });

    // INTENTION_STAGING_CURIOSITY_DECOUPLED no-fire:
    // scene 0 carries BOTH visual staging and a curiosity rise → overlap exists
    it('INTENTION_STAGING_CURIOSITY_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs647cn = Array.from({ length: 6 }, (_, i) => makeRec647(i));
      recs647cn[0] = makeRec647(0, { visualBeats: ['grabs the phone'], curiosityDelta: 1 });
      recs647cn[1] = makeRec647(1, { visualBeats: ['checks the screen'] });
      recs647cn[5] = makeRec647(5, { curiosityDelta: 1 });
      const res = await runIN647(recs647cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_STAGING_CURIOSITY_DECOUPLED'), 'INTENTION_STAGING_CURIOSITY_DECOUPLED should not fire');
    });
  });

  describe('Wave 633 — intentionPass: intention highlight open thread decoupled, intention clock staging aftermath void, intention open thread zone imbalance', async () => {
    const makeRec633 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN633 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: { revelationCount: records.filter((r: any) => r.revelation).length } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // INTENTION_HIGHLIGHT_OPEN_THREAD_DECOUPLED fire:
    // n=6; highlights at 0,1 (no debt); debt at 4,5 (no highlight) → zero overlap → fires
    it('INTENTION_HIGHLIGHT_OPEN_THREAD_DECOUPLED fires when dialogue highlights and open-thread scenes never overlap', async () => {
      const recs633a = Array.from({ length: 6 }, (_, i) => makeRec633(i));
      recs633a[0] = makeRec633(0, { dialogueHighlights: ['line-a'] });
      recs633a[1] = makeRec633(1, { dialogueHighlights: ['line-b'] });
      recs633a[4] = makeRec633(4, { unresolvedClues: ['unpaid-clue'] });
      recs633a[5] = makeRec633(5, { unresolvedClues: ['unpaid-clue'] });
      const res = await runIN633(recs633a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_HIGHLIGHT_OPEN_THREAD_DECOUPLED'), 'INTENTION_HIGHLIGHT_OPEN_THREAD_DECOUPLED should fire');
    });

    // INTENTION_HIGHLIGHT_OPEN_THREAD_DECOUPLED no-fire:
    // scene 0 carries BOTH a highlight and open debt → overlap exists
    it('INTENTION_HIGHLIGHT_OPEN_THREAD_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs633an = Array.from({ length: 6 }, (_, i) => makeRec633(i));
      recs633an[0] = makeRec633(0, { dialogueHighlights: ['line-a'], unresolvedClues: ['unpaid-clue'] });
      recs633an[1] = makeRec633(1, { dialogueHighlights: ['line-b'] });
      recs633an[5] = makeRec633(5, { unresolvedClues: ['unpaid-clue'] });
      const res = await runIN633(recs633an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_HIGHLIGHT_OPEN_THREAD_DECOUPLED'), 'INTENTION_HIGHLIGHT_OPEN_THREAD_DECOUPLED should not fire');
    });

    // INTENTION_CLOCK_STAGING_AFTERMATH_VOID fire:
    // n=8, window=2; clock triggers at 0,1; their windows {1,2} and {2,3} carry no visually
    // dense scene; staged scenes exist elsewhere at 5,6,7 → fires
    it('INTENTION_CLOCK_STAGING_AFTERMATH_VOID fires when no clock-raising scene is followed by a visually dense scene within 2 scenes', async () => {
      const recs633b = Array.from({ length: 8 }, (_, i) => makeRec633(i));
      recs633b[0] = makeRec633(0, { clockRaised: true });
      recs633b[1] = makeRec633(1, { clockRaised: true });
      recs633b[5] = makeRec633(5, { visualBeats: ['grabs the bag', 'checks the exit'] });
      recs633b[6] = makeRec633(6, { visualBeats: ['grabs the bag', 'checks the exit'] });
      recs633b[7] = makeRec633(7, { visualBeats: ['grabs the bag', 'checks the exit'] });
      const res = await runIN633(recs633b);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_CLOCK_STAGING_AFTERMATH_VOID'), 'INTENTION_CLOCK_STAGING_AFTERMATH_VOID should fire');
    });

    // INTENTION_CLOCK_STAGING_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries staging → that trigger's aftermath
    // is no longer void
    it('INTENTION_CLOCK_STAGING_AFTERMATH_VOID does not fire when a trigger window contains a visually dense scene', async () => {
      const recs633bn = Array.from({ length: 8 }, (_, i) => makeRec633(i));
      recs633bn[0] = makeRec633(0, { clockRaised: true });
      recs633bn[1] = makeRec633(1, { clockRaised: true });
      recs633bn[3] = makeRec633(3, { visualBeats: ['grabs the bag', 'checks the exit'] });
      recs633bn[5] = makeRec633(5, { visualBeats: ['grabs the bag', 'checks the exit'] });
      recs633bn[6] = makeRec633(6, { visualBeats: ['grabs the bag', 'checks the exit'] });
      recs633bn[7] = makeRec633(7, { visualBeats: ['grabs the bag', 'checks the exit'] });
      const res = await runIN633(recs633bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_CLOCK_STAGING_AFTERMATH_VOID'), 'INTENTION_CLOCK_STAGING_AFTERMATH_VOID should not fire');
    });

    // INTENTION_OPEN_THREAD_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); debt at 6,7,8,9; zone 2 (6-8)=3, zone 3 (9)=1, total=4;
    // zones 0,1 empty; bloatZoneIdx=zone2, 3/4=75% ≥ 50% → fires
    it('INTENTION_OPEN_THREAD_ZONE_IMBALANCE fires when one zone is empty of open-thread scenes while another is bloated', async () => {
      const recs633c = Array.from({ length: 12 }, (_, i) => makeRec633(i));
      recs633c[6] = makeRec633(6, { unresolvedClues: ['a'] });
      recs633c[7] = makeRec633(7, { unresolvedClues: ['b'] });
      recs633c[8] = makeRec633(8, { unresolvedClues: ['c'] });
      recs633c[9] = makeRec633(9, { unresolvedClues: ['d'] });
      const res = await runIN633(recs633c);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_OPEN_THREAD_ZONE_IMBALANCE'), 'INTENTION_OPEN_THREAD_ZONE_IMBALANCE should fire');
    });

    // INTENTION_OPEN_THREAD_ZONE_IMBALANCE no-fire:
    // one open-thread scene per zone (1,4,7,10) → no zone is empty
    it('INTENTION_OPEN_THREAD_ZONE_IMBALANCE does not fire when open-thread scenes are spread across all zones', async () => {
      const recs633cn = Array.from({ length: 12 }, (_, i) => makeRec633(i));
      recs633cn[1] = makeRec633(1, { unresolvedClues: ['a'] });
      recs633cn[4] = makeRec633(4, { unresolvedClues: ['b'] });
      recs633cn[7] = makeRec633(7, { unresolvedClues: ['c'] });
      recs633cn[10] = makeRec633(10, { unresolvedClues: ['d'] });
      const res = await runIN633(recs633cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_OPEN_THREAD_ZONE_IMBALANCE'), 'INTENTION_OPEN_THREAD_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 619 — intentionPass: payoff physical staging decoupled, seed staging aftermath void, physical staging peak uncaused', async () => {
    const makeRec619 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN619 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: { revelationCount: records.filter((r: any) => r.revelation).length } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // PAYOFF_PHYSICAL_STAGING_DECOUPLED fire:
    // n=6; payoffs at 0,1 (no staging); staged at 4,5 (no payoff) → zero overlap → fires
    it('PAYOFF_PHYSICAL_STAGING_DECOUPLED fires when payoff scenes and visually-staged scenes never overlap', async () => {
      const recs619a = Array.from({ length: 6 }, (_, i) => makeRec619(i));
      recs619a[0] = makeRec619(0, { payoffSetupIds: ['thread-a'] });
      recs619a[1] = makeRec619(1, { payoffSetupIds: ['thread-b'] });
      recs619a[4] = makeRec619(4, { visualBeats: ['opens the box', 'reads the note'] });
      recs619a[5] = makeRec619(5, { visualBeats: ['opens the box', 'reads the note'] });
      const res = await runIN619(recs619a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_PHYSICAL_STAGING_DECOUPLED'), 'PAYOFF_PHYSICAL_STAGING_DECOUPLED should fire');
    });

    // PAYOFF_PHYSICAL_STAGING_DECOUPLED no-fire:
    // scene 0 carries BOTH a payoff and visual staging → overlap exists
    it('PAYOFF_PHYSICAL_STAGING_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs619an = Array.from({ length: 6 }, (_, i) => makeRec619(i));
      recs619an[0] = makeRec619(0, { payoffSetupIds: ['thread-a'], visualBeats: ['opens the box', 'reads the note'] });
      recs619an[1] = makeRec619(1, { payoffSetupIds: ['thread-b'] });
      recs619an[5] = makeRec619(5, { visualBeats: ['opens the box', 'reads the note'] });
      const res = await runIN619(recs619an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_PHYSICAL_STAGING_DECOUPLED'), 'PAYOFF_PHYSICAL_STAGING_DECOUPLED should not fire');
    });

    // SEED_STAGING_AFTERMATH_VOID fire:
    // n=8, window=2; seed triggers at 0,1; their windows {1,2} and {2,3} carry no visually dense
    // scene; staged scenes exist elsewhere at 5,6,7 → fires
    it('SEED_STAGING_AFTERMATH_VOID fires when no seed is followed by a visually dense scene within 2 scenes', async () => {
      const recs619b = Array.from({ length: 8 }, (_, i) => makeRec619(i));
      recs619b[0] = makeRec619(0, { seededClueIds: ['clue-a'] });
      recs619b[1] = makeRec619(1, { seededClueIds: ['clue-b'] });
      recs619b[5] = makeRec619(5, { visualBeats: ['opens the box', 'reads the note'] });
      recs619b[6] = makeRec619(6, { visualBeats: ['opens the box', 'reads the note'] });
      recs619b[7] = makeRec619(7, { visualBeats: ['opens the box', 'reads the note'] });
      const res = await runIN619(recs619b);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_STAGING_AFTERMATH_VOID'), 'SEED_STAGING_AFTERMATH_VOID should fire');
    });

    // SEED_STAGING_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries staging → that trigger's aftermath
    // is no longer void
    it('SEED_STAGING_AFTERMATH_VOID does not fire when a trigger window contains a visually dense scene', async () => {
      const recs619bn = Array.from({ length: 8 }, (_, i) => makeRec619(i));
      recs619bn[0] = makeRec619(0, { seededClueIds: ['clue-a'] });
      recs619bn[1] = makeRec619(1, { seededClueIds: ['clue-b'] });
      recs619bn[3] = makeRec619(3, { visualBeats: ['opens the box', 'reads the note'] });
      recs619bn[5] = makeRec619(5, { visualBeats: ['opens the box', 'reads the note'] });
      recs619bn[6] = makeRec619(6, { visualBeats: ['opens the box', 'reads the note'] });
      recs619bn[7] = makeRec619(7, { visualBeats: ['opens the box', 'reads the note'] });
      const res = await runIN619(recs619bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_STAGING_AFTERMATH_VOID'), 'SEED_STAGING_AFTERMATH_VOID should not fire');
    });

    // PHYSICAL_STAGING_PEAK_UNCAUSED fire:
    // 8 scenes; visualBeats present at 2 (1 beat) and 6 (5 beats, the peak); no revelation or
    // dramaticTurn at 6, 5, or 4
    it('PHYSICAL_STAGING_PEAK_UNCAUSED fires when the peak physical-staging scene has no revelation or dramatic turn nearby', async () => {
      const recs619c = Array.from({ length: 8 }, (_, i) => makeRec619(i));
      recs619c[2] = makeRec619(2, { visualBeats: ['glances outside'] });
      recs619c[6] = makeRec619(6, { visualBeats: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runIN619(recs619c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PHYSICAL_STAGING_PEAK_UNCAUSED'), 'PHYSICAL_STAGING_PEAK_UNCAUSED should fire');
    });

    // PHYSICAL_STAGING_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('PHYSICAL_STAGING_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs619cn = Array.from({ length: 8 }, (_, i) => makeRec619(i));
      recs619cn[2] = makeRec619(2, { visualBeats: ['glances outside'] });
      recs619cn[5] = makeRec619(5, { dramaticTurn: 'reversal' });
      recs619cn[6] = makeRec619(6, { visualBeats: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runIN619(recs619cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PHYSICAL_STAGING_PEAK_UNCAUSED'), 'PHYSICAL_STAGING_PEAK_UNCAUSED should not fire');
    });
  });

  describe('Wave 605 — intentionPass: open thread revelation decoupled, physical staging zone imbalance, open thread payoff aftermath void', async () => {
    const makeRec605 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [], visualBeats: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN605 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: { revelationCount: records.filter((r: any) => r.revelation).length } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // OPEN_THREAD_REVELATION_DECOUPLED fire:
    // n=8; open threads at 0,1 (no revelation); revelations at 2,3 (no open thread) → zero overlap → fires
    it('OPEN_THREAD_REVELATION_DECOUPLED fires when open-thread scenes and revelation scenes never overlap', async () => {
      const recs605a = Array.from({ length: 8 }, (_, i) => makeRec605(i));
      recs605a[0] = makeRec605(0, { unresolvedClues: ['unpaid-clue'] });
      recs605a[1] = makeRec605(1, { unresolvedClues: ['unpaid-clue'] });
      recs605a[2] = makeRec605(2, { revelation: 'The truth comes out' });
      recs605a[3] = makeRec605(3, { revelation: 'Another truth' });
      const res = await runIN605(recs605a);
      assert.ok(res.issues.some((i: any) => i.rule === 'OPEN_THREAD_REVELATION_DECOUPLED'), 'OPEN_THREAD_REVELATION_DECOUPLED should fire');
    });

    // OPEN_THREAD_REVELATION_DECOUPLED no-fire:
    // scene 2 carries BOTH an open thread and a revelation → overlap exists
    it('OPEN_THREAD_REVELATION_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs605an = Array.from({ length: 8 }, (_, i) => makeRec605(i));
      recs605an[0] = makeRec605(0, { unresolvedClues: ['unpaid-clue'] });
      recs605an[1] = makeRec605(1, { unresolvedClues: ['unpaid-clue'] });
      recs605an[2] = makeRec605(2, { unresolvedClues: ['unpaid-clue'], revelation: 'The truth comes out' });
      recs605an[3] = makeRec605(3, { revelation: 'Another truth' });
      const res = await runIN605(recs605an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'OPEN_THREAD_REVELATION_DECOUPLED'), 'OPEN_THREAD_REVELATION_DECOUPLED should not fire');
    });

    // PHYSICAL_STAGING_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); visually dense scenes (visualBeats≥2) at 6,9,10,11;
    // zones 0 (0-2) and 1 (3-5) are empty; zone 3 (9-11) holds 3/4 = 75% ≥ 50% → fires
    it('PHYSICAL_STAGING_ZONE_IMBALANCE fires when one zone is empty of visually dense scenes while another is bloated', async () => {
      const recs605b = Array.from({ length: 12 }, (_, i) => makeRec605(i, {
        visualBeats: (i === 6 || i === 9 || i === 10 || i === 11) ? ['opens the drawer', 'reads the letter'] : [],
      }));
      const res = await runIN605(recs605b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PHYSICAL_STAGING_ZONE_IMBALANCE'), 'PHYSICAL_STAGING_ZONE_IMBALANCE should fire');
    });

    // PHYSICAL_STAGING_ZONE_IMBALANCE no-fire:
    // one visually dense scene per zone (1,4,7,10) → no zone is empty
    it('PHYSICAL_STAGING_ZONE_IMBALANCE does not fire when every zone has a visually dense scene', async () => {
      const recs605bn = Array.from({ length: 12 }, (_, i) => makeRec605(i, {
        visualBeats: (i === 1 || i === 4 || i === 7 || i === 10) ? ['opens the drawer', 'reads the letter'] : [],
      }));
      const res = await runIN605(recs605bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PHYSICAL_STAGING_ZONE_IMBALANCE'), 'PHYSICAL_STAGING_ZONE_IMBALANCE should not fire');
    });

    // OPEN_THREAD_PAYOFF_AFTERMATH_VOID fire:
    // n=8, window=2; heavy clue-debt triggers at 0,1; their windows {1,2} and {2,3} carry no
    // payoff; payoffs exist elsewhere at 5,6,7 → fires
    it('OPEN_THREAD_PAYOFF_AFTERMATH_VOID fires when heavy clue-debt scenes are never followed by a payoff', async () => {
      const recs605c = Array.from({ length: 8 }, (_, i) => makeRec605(i));
      recs605c[0] = makeRec605(0, { unresolvedClues: ['c1', 'c2', 'c3'] });
      recs605c[1] = makeRec605(1, { unresolvedClues: ['c1', 'c2', 'c3'] });
      recs605c[5] = makeRec605(5, { payoffSetupIds: ['thread-a'] });
      recs605c[6] = makeRec605(6, { payoffSetupIds: ['thread-b'] });
      recs605c[7] = makeRec605(7, { payoffSetupIds: ['thread-c'] });
      const res = await runIN605(recs605c);
      assert.ok(res.issues.some((i: any) => i.rule === 'OPEN_THREAD_PAYOFF_AFTERMATH_VOID'), 'OPEN_THREAD_PAYOFF_AFTERMATH_VOID should fire');
    });

    // OPEN_THREAD_PAYOFF_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries a payoff → that trigger's aftermath
    // is no longer void
    it('OPEN_THREAD_PAYOFF_AFTERMATH_VOID does not fire when a trigger window contains a payoff', async () => {
      const recs605cn = Array.from({ length: 8 }, (_, i) => makeRec605(i));
      recs605cn[0] = makeRec605(0, { unresolvedClues: ['c1', 'c2', 'c3'] });
      recs605cn[1] = makeRec605(1, { unresolvedClues: ['c1', 'c2', 'c3'] });
      recs605cn[3] = makeRec605(3, { payoffSetupIds: ['thread-a'] });
      recs605cn[5] = makeRec605(5, { payoffSetupIds: ['thread-b'] });
      recs605cn[6] = makeRec605(6, { payoffSetupIds: ['thread-c'] });
      recs605cn[7] = makeRec605(7, { payoffSetupIds: ['thread-d'] });
      const res = await runIN605(recs605cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'OPEN_THREAD_PAYOFF_AFTERMATH_VOID'), 'OPEN_THREAD_PAYOFF_AFTERMATH_VOID should not fire');
    });
  });


  describe('Wave 591 — intentionPass: payoff relationship decoupled, revelation relationship decoupled, payoff zone imbalance', async () => {
    const makeRec591 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN591 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: { revelationCount: records.filter((r: any) => r.revelation).length } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    it('PAYOFF_RELATIONSHIP_DECOUPLED fires when no payoff scene has a relationship shift', async () => {
      // 8 scenes; payoffs at 1,3,5 (no relationship shifts); relational shifts at 6,7 (no payoffs)
      const recs591a = Array.from({ length: 8 }, (_, i) => makeRec591(i));
      recs591a[1] = makeRec591(1, { payoffSetupIds: ['clue-a'] });
      recs591a[3] = makeRec591(3, { payoffSetupIds: ['clue-b'] });
      recs591a[5] = makeRec591(5, { payoffSetupIds: ['clue-c'] });
      recs591a[6] = makeRec591(6, { relationshipShifts: [{ pairKey: 'alice|bob', amount: 0.5 }] });
      recs591a[7] = makeRec591(7, { relationshipShifts: [{ pairKey: 'alice|bob', amount: -0.4 }] });
      const res = await runIN591(recs591a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_RELATIONSHIP_DECOUPLED'), 'PAYOFF_RELATIONSHIP_DECOUPLED should fire');
    });

    it('PAYOFF_RELATIONSHIP_DECOUPLED does not fire when a payoff scene also has a relationship shift', async () => {
      // payoff at 1 also carries a relationship shift → overlap → no fire
      const recs591a = Array.from({ length: 8 }, (_, i) => makeRec591(i));
      recs591a[1] = makeRec591(1, { payoffSetupIds: ['clue-a'], relationshipShifts: [{ pairKey: 'alice|bob', amount: 0.5 }] });
      recs591a[3] = makeRec591(3, { payoffSetupIds: ['clue-b'] });
      recs591a[5] = makeRec591(5, { payoffSetupIds: ['clue-c'] });
      recs591a[6] = makeRec591(6, { relationshipShifts: [{ pairKey: 'alice|bob', amount: -0.4 }] });
      const res = await runIN591(recs591a);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_RELATIONSHIP_DECOUPLED'), 'PAYOFF_RELATIONSHIP_DECOUPLED should not fire');
    });

    it('REVELATION_RELATIONSHIP_DECOUPLED fires when no revelation scene has a relationship shift', async () => {
      // 8 scenes; revelations at 1,3,5 (no relationship shifts); relational shifts at 6,7 (no revelations)
      const recs591b = Array.from({ length: 8 }, (_, i) => makeRec591(i));
      recs591b[1] = makeRec591(1, { revelation: 'She was lying.' });
      recs591b[3] = makeRec591(3, { revelation: 'He knew all along.' });
      recs591b[5] = makeRec591(5, { revelation: 'The letter was a forgery.' });
      recs591b[6] = makeRec591(6, { relationshipShifts: [{ pairKey: 'alice|bob', amount: 0.5 }] });
      recs591b[7] = makeRec591(7, { relationshipShifts: [{ pairKey: 'alice|bob', amount: -0.4 }] });
      const res = await runIN591(recs591b);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_RELATIONSHIP_DECOUPLED'), 'REVELATION_RELATIONSHIP_DECOUPLED should fire');
    });

    it('REVELATION_RELATIONSHIP_DECOUPLED does not fire when a revelation scene also has a relationship shift', async () => {
      // revelation at 1 also carries a relationship shift → overlap → no fire
      const recs591b = Array.from({ length: 8 }, (_, i) => makeRec591(i));
      recs591b[1] = makeRec591(1, { revelation: 'She was lying.', relationshipShifts: [{ pairKey: 'alice|bob', amount: 0.5 }] });
      recs591b[3] = makeRec591(3, { revelation: 'He knew all along.' });
      recs591b[5] = makeRec591(5, { revelation: 'The letter was a forgery.' });
      recs591b[6] = makeRec591(6, { relationshipShifts: [{ pairKey: 'alice|bob', amount: -0.4 }] });
      const res = await runIN591(recs591b);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_RELATIONSHIP_DECOUPLED'), 'REVELATION_RELATIONSHIP_DECOUPLED should not fire');
    });

    it('PAYOFF_ZONE_IMBALANCE fires when one zone has zero payoffs and another has ≥50%', async () => {
      // 12 scenes, 4 zones of 3 each: [0-2]=Act1 [3-5]=Act2a [6-8]=Act2b [9-11]=Act3
      // payoffs at 6,7,8,9 (4 total): Act2b has 3/4=75%, Act1 has 0 → imbalance
      const recs591c = Array.from({ length: 12 }, (_, i) => makeRec591(i));
      recs591c[6] = makeRec591(6, { payoffSetupIds: ['a'] });
      recs591c[7] = makeRec591(7, { payoffSetupIds: ['b'] });
      recs591c[8] = makeRec591(8, { payoffSetupIds: ['c'] });
      recs591c[9] = makeRec591(9, { payoffSetupIds: ['d'] });
      const res = await runIN591(recs591c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_ZONE_IMBALANCE'), 'PAYOFF_ZONE_IMBALANCE should fire');
    });

    it('PAYOFF_ZONE_IMBALANCE does not fire when payoffs are spread across all zones', async () => {
      // one payoff per zone (12 scenes, zones of 3): 1,4,7,10 → no empty zone
      const recs591c = Array.from({ length: 12 }, (_, i) => makeRec591(i));
      recs591c[1] = makeRec591(1, { payoffSetupIds: ['a'] });
      recs591c[4] = makeRec591(4, { payoffSetupIds: ['b'] });
      recs591c[7] = makeRec591(7, { payoffSetupIds: ['c'] });
      recs591c[10] = makeRec591(10, { payoffSetupIds: ['d'] });
      const res = await runIN591(recs591c);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_ZONE_IMBALANCE'), 'PAYOFF_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 577 — intentionPass: seed zone cluster, clock revelation aftermath void, seed curiosity decoupled', async () => {
    const makeRec577 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN577 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
        original: '', records,
        structure: { revelationCount: records.filter((r: any) => r.revelation).length } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    it('SEED_ZONE_CLUSTER fires when >75% of seed scenes cluster in one structural third', async () => {
      // 9 scenes; thirds=[0-2],[3-5],[6-8]; seeds at 0,1,2 → 100% in opening third
      const recs577a = Array.from({ length: 9 }, (_, i) => makeRec577(i));
      recs577a[0] = makeRec577(0, { seededClueIds: ['clue-a'] });
      recs577a[1] = makeRec577(1, { seededClueIds: ['clue-b'] });
      recs577a[2] = makeRec577(2, { seededClueIds: ['clue-c'] });
      const res = await runIN577(recs577a);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_ZONE_CLUSTER'), 'SEED_ZONE_CLUSTER should fire');
    });

    it('SEED_ZONE_CLUSTER does not fire when seed scenes are distributed across thirds', async () => {
      // seeds at 0, 4, 7 (one per third) → maxZone/total = 1/3
      const recs577a = Array.from({ length: 9 }, (_, i) => makeRec577(i));
      recs577a[0] = makeRec577(0, { seededClueIds: ['clue-a'] });
      recs577a[4] = makeRec577(4, { seededClueIds: ['clue-b'] });
      recs577a[7] = makeRec577(7, { seededClueIds: ['clue-c'] });
      const res = await runIN577(recs577a);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_ZONE_CLUSTER'), 'SEED_ZONE_CLUSTER should not fire');
    });

    it('CLOCK_REVELATION_AFTERMATH_VOID fires when no clock scene is followed by a revelation within 2 scenes', async () => {
      // n=9; clocks at 1,4; revelation at 7 (not within 2 of 1 or 4)
      const recs577b = Array.from({ length: 9 }, (_, i) => makeRec577(i));
      recs577b[1] = makeRec577(1, { clockRaised: true });
      recs577b[4] = makeRec577(4, { clockRaised: true });
      recs577b[7] = makeRec577(7, { revelation: 'The plan was a trap.' });
      recs577b[8] = makeRec577(8, { revelation: 'She knew all along.' });
      const res = await runIN577(recs577b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_REVELATION_AFTERMATH_VOID'), 'CLOCK_REVELATION_AFTERMATH_VOID should fire');
    });

    it('CLOCK_REVELATION_AFTERMATH_VOID does not fire when a clock is followed by a revelation within 2 scenes', async () => {
      // clock at 1; revelation at 2 (within 1 scene) → satisfied → no fire
      const recs577b = Array.from({ length: 9 }, (_, i) => makeRec577(i));
      recs577b[1] = makeRec577(1, { clockRaised: true });
      recs577b[2] = makeRec577(2, { revelation: 'The truth surfaces.' });
      recs577b[4] = makeRec577(4, { clockRaised: true });
      recs577b[7] = makeRec577(7, { revelation: 'Another revelation.' });
      const res = await runIN577(recs577b);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_REVELATION_AFTERMATH_VOID'), 'CLOCK_REVELATION_AFTERMATH_VOID should not fire');
    });

    it('SEED_CURIOSITY_DECOUPLED fires when all seed scenes have curiosityDelta ≤ 0', async () => {
      // n=9; seeds at 1,3 (no curiosity); curiosity at 6,7 (no seeds) → fully decoupled
      const recs577c = Array.from({ length: 9 }, (_, i) => makeRec577(i));
      recs577c[1] = makeRec577(1, { seededClueIds: ['clue-a'] });
      recs577c[3] = makeRec577(3, { seededClueIds: ['clue-b'] });
      recs577c[6] = makeRec577(6, { curiosityDelta: 1 });
      recs577c[7] = makeRec577(7, { curiosityDelta: 1 });
      const res = await runIN577(recs577c);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_CURIOSITY_DECOUPLED'), 'SEED_CURIOSITY_DECOUPLED should fire');
    });

    it('SEED_CURIOSITY_DECOUPLED does not fire when a seed scene also raises curiosity', async () => {
      // seed at 1 with curiosityDelta=1 → overlap → no fire
      const recs577c = Array.from({ length: 9 }, (_, i) => makeRec577(i));
      recs577c[1] = makeRec577(1, { seededClueIds: ['clue-a'], curiosityDelta: 1 });
      recs577c[3] = makeRec577(3, { seededClueIds: ['clue-b'] });
      recs577c[6] = makeRec577(6, { curiosityDelta: 1 });
      const res = await runIN577(recs577c);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_CURIOSITY_DECOUPLED'), 'SEED_CURIOSITY_DECOUPLED should not fire');
    });
  });


  describe('Wave 563 — intentionPass: revelation drought run, revelation zone cluster, revelation clock aftermath void', async () => {
    const makeRec563 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN563 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, reversalCount: 0, revelationCount: records.filter((r: any) => r.revelation).length,
          openClues: 0, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // REVELATION_DROUGHT_RUN fire:
    // n=12; revelations at idx 0,1; idx 2-11 none → run of 10 ≥6 → fires
    it('REVELATION_DROUGHT_RUN fires when a run of 6+ consecutive scenes has no revelation', async () => {
      const recs563a = Array.from({ length: 12 }, (_, i) =>
        makeRec563(i, { revelation: [0, 1].includes(i) ? 'truth surfaced' : null }),
      );
      const res = await runIN563(recs563a);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_DROUGHT_RUN'), 'REVELATION_DROUGHT_RUN should fire');
    });

    // REVELATION_DROUGHT_RUN no-fire:
    // n=12; revelations at idx 0,5,11 → longest non-revelation run is idx 6..10 (5) < 6 → no fire
    it('REVELATION_DROUGHT_RUN does not fire when no non-revelation run reaches 6 scenes', async () => {
      const recs563anr = Array.from({ length: 12 }, (_, i) =>
        makeRec563(i, { revelation: [0, 5, 11].includes(i) ? 'truth surfaced' : null }),
      );
      const res = await runIN563(recs563anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_DROUGHT_RUN'), 'REVELATION_DROUGHT_RUN should not fire');
    });

    // REVELATION_ZONE_CLUSTER fire:
    // n=9; third=3; revelations at idx 3,4,5 (all middle third) → 3/3=100%>75% → fires
    it('REVELATION_ZONE_CLUSTER fires when >75% of revelations fall in a single structural third', async () => {
      const recs563b = Array.from({ length: 9 }, (_, i) =>
        makeRec563(i, { revelation: [3, 4, 5].includes(i) ? 'truth surfaced' : null }),
      );
      const res = await runIN563(recs563b);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_ZONE_CLUSTER'), 'REVELATION_ZONE_CLUSTER should fire');
    });

    // REVELATION_ZONE_CLUSTER no-fire:
    // n=9; revelations at idx 1,4,7 → one per third, max 1/3=33%≤75% → no fire
    it('REVELATION_ZONE_CLUSTER does not fire when revelations are spread across thirds', async () => {
      const recs563bnr = Array.from({ length: 9 }, (_, i) =>
        makeRec563(i, { revelation: [1, 4, 7].includes(i) ? 'truth surfaced' : null }),
      );
      const res = await runIN563(recs563bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_ZONE_CLUSTER'), 'REVELATION_ZONE_CLUSTER should not fire');
    });

    // REVELATION_CLOCK_AFTERMATH_VOID fire:
    // n=8; revelations at idx 1,3 (pos<7); clocks at idx 6,7 (≥2 globally, outside aftermath windows) → all void → fires
    it('REVELATION_CLOCK_AFTERMATH_VOID fires when no revelation is followed by a clock raise within 2 scenes', async () => {
      const recs563c = Array.from({ length: 8 }, (_, i) =>
        makeRec563(i, {
          revelation: [1, 3].includes(i) ? 'truth surfaced' : null,
          clockRaised: [6, 7].includes(i),
        }),
      );
      const res = await runIN563(recs563c);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_CLOCK_AFTERMATH_VOID'), 'REVELATION_CLOCK_AFTERMATH_VOID should fire');
    });

    // REVELATION_CLOCK_AFTERMATH_VOID no-fire:
    // n=8; revelations at idx 1,3; clock at idx 2 (aftermath of rev at idx 1) and idx 7 → not all void → no fire
    it('REVELATION_CLOCK_AFTERMATH_VOID does not fire when a revelation aftermath raises a clock', async () => {
      const recs563cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec563(i, {
          revelation: [1, 3].includes(i) ? 'truth surfaced' : null,
          clockRaised: [2, 7].includes(i),
        }),
      );
      const res = await runIN563(recs563cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_CLOCK_AFTERMATH_VOID'), 'REVELATION_CLOCK_AFTERMATH_VOID should not fire');
    });
  });


  describe('Wave 549 — intentionPass: revelation suspense flat, revelation emotion decoupled, revelation cause void', async () => {
    const makeRec549 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN549 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, reversalCount: 0, revelationCount: records.filter((r: any) => r.revelation).length,
          openClues: 0, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    it('REVELATION_SUSPENSE_FLAT fires when all revelation scenes have avg suspenseDelta ≤ 0', async () => {
      // n=8; revelations at idx 2, 4, 6 all with suspenseDelta=0 → avg=0 ≤ 0 → fires.
      const recs549a = Array.from({ length: 8 }, (_, i) =>
        makeRec549(i, {
          revelation: [2, 4, 6].includes(i) ? 'truth revealed' : null,
          suspenseDelta: 0,
        }),
      );
      const res = await runIN549(recs549a);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_SUSPENSE_FLAT'), 'REVELATION_SUSPENSE_FLAT should fire');
    });

    it('REVELATION_SUSPENSE_FLAT does not fire when revelation scenes have positive avg suspenseDelta', async () => {
      // n=8; revelations at idx 2, 4, 6 with suspenseDelta 1, 0, 1 → avg=0.67 > 0 → no fire.
      const recs549an = Array.from({ length: 8 }, (_, i) =>
        makeRec549(i, {
          revelation: [2, 4, 6].includes(i) ? 'truth revealed' : null,
          suspenseDelta: [2, 6].includes(i) ? 1 : 0,
        }),
      );
      const res = await runIN549(recs549an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_SUSPENSE_FLAT'), 'REVELATION_SUSPENSE_FLAT should not fire');
    });

    it('REVELATION_EMOTION_DECOUPLED fires when no revelation scene has non-neutral emotion', async () => {
      // n=8; revelations at 2,4,6 all neutral; emotional scenes at 1,5 (non-neutral) → zero overlap → fires.
      const recs549b = Array.from({ length: 8 }, (_, i) =>
        makeRec549(i, {
          revelation: [2, 4, 6].includes(i) ? 'truth revealed' : null,
          emotionalShift: [1, 5].includes(i) ? 'positive' : 'neutral',
        }),
      );
      const res = await runIN549(recs549b);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_EMOTION_DECOUPLED'), 'REVELATION_EMOTION_DECOUPLED should fire');
    });

    it('REVELATION_EMOTION_DECOUPLED does not fire when a revelation scene has non-neutral emotion', async () => {
      // n=8; revelation at 4 with emotionalShift 'positive'; revelations at 2,6 neutral; emotional at 1 → overlap at 4 → no fire.
      const recs549bn = Array.from({ length: 8 }, (_, i) =>
        makeRec549(i, {
          revelation: [2, 4, 6].includes(i) ? 'truth revealed' : null,
          emotionalShift: i === 4 || i === 1 ? 'positive' : 'neutral',
        }),
      );
      const res = await runIN549(recs549bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_EMOTION_DECOUPLED'), 'REVELATION_EMOTION_DECOUPLED should not fire');
    });

    it('REVELATION_CAUSE_VOID fires when all revelations have no upstream trigger', async () => {
      // n=8; revelations at 2, 4, 6 all with no proactive, no turn, no suspense rise in
      // themselves or prior scenes → all uncaused → fires.
      const recs549c = Array.from({ length: 8 }, (_, i) =>
        makeRec549(i, {
          revelation: [2, 4, 6].includes(i) ? 'truth revealed' : null,
          suspenseDelta: 0,
          clockRaised: false,
          seededClueIds: [],
          dramaticTurn: 'nothing',
        }),
      );
      const res = await runIN549(recs549c);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_CAUSE_VOID'), 'REVELATION_CAUSE_VOID should fire');
    });

    it('REVELATION_CAUSE_VOID does not fire when a revelation has a suspense rise in prior scene', async () => {
      // n=8; revelation at 2,4,6; prior scene idx 3 has suspenseDelta=1 (trigger for revelation at 4) → caused → no fire.
      const recs549cn = Array.from({ length: 8 }, (_, i) =>
        makeRec549(i, {
          revelation: [2, 4, 6].includes(i) ? 'truth revealed' : null,
          suspenseDelta: i === 3 ? 1 : 0,
        }),
      );
      const res = await runIN549(recs549cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_CAUSE_VOID'), 'REVELATION_CAUSE_VOID should not fire');
    });
  });


  describe('Wave 535 — intentionPass: payoff clock decoupled, payoff peak uncaused, payoff back-loaded', async () => {
    const makeRec535 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN535 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    it('PAYOFF_CLOCK_DECOUPLED fires when no payoff scene also has clockRaised', async () => {
      // 8 scenes: payoffs at pos 1,3,5 (no clock); clock at pos 0,6 (no payoff) → no overlap → fires
      const recs535a = Array.from({ length: 8 }, (_, i) =>
        makeRec535(i, {
          payoffSetupIds: [1, 3, 5].includes(i) ? ['setup-A'] : [],
          clockRaised: [0, 6].includes(i),
        })
      );
      const res = await runIN535(recs535a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_CLOCK_DECOUPLED'), 'PAYOFF_CLOCK_DECOUPLED should fire');
    });

    it('PAYOFF_CLOCK_DECOUPLED does not fire when a payoff scene also has clockRaised', async () => {
      // Same but pos 1 (payoff) now also has clockRaised → overlap → no fire
      const recs535anr = Array.from({ length: 8 }, (_, i) =>
        makeRec535(i, {
          payoffSetupIds: [1, 3, 5].includes(i) ? ['setup-A'] : [],
          clockRaised: [0, 1, 6].includes(i),
        })
      );
      const res = await runIN535(recs535anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_CLOCK_DECOUPLED'), 'PAYOFF_CLOCK_DECOUPLED should not fire');
    });

    it('PAYOFF_PEAK_UNCAUSED fires when the peak payoff scene has no cause in prior 2 scenes', async () => {
      // 8 scenes: payoffs at pos 2 (1 setup) and pos 5 (2 setups = peak, at pos≥2);
      // scenes 3,4 (prior to peak at 5) have no revelation/turn/suspense/clock → fires
      const recs535b = Array.from({ length: 8 }, (_, i) =>
        makeRec535(i, {
          payoffSetupIds: i === 2 ? ['setup-A'] : i === 5 ? ['setup-B', 'setup-C'] : [],
        })
      );
      const res = await runIN535(recs535b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_PEAK_UNCAUSED'), 'PAYOFF_PEAK_UNCAUSED should fire');
    });

    it('PAYOFF_PEAK_UNCAUSED does not fire when a prior scene provides a causal driver', async () => {
      // Same but scene 4 (prior to peak at 5) has suspenseDelta=1 → hasCause=true → no fire
      const recs535bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec535(i, {
          payoffSetupIds: i === 2 ? ['setup-A'] : i === 5 ? ['setup-B', 'setup-C'] : [],
          suspenseDelta: i === 4 ? 1 : 0,
        })
      );
      const res = await runIN535(recs535bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_PEAK_UNCAUSED'), 'PAYOFF_PEAK_UNCAUSED should not fire');
    });

    it('PAYOFF_BACK_LOADED fires when >70% of payoff scenes are in second half', async () => {
      // 10 scenes; half=5; payoffs at pos 1,5,6,7 → frontCount=1, backCount=3; 3/4=75% > 70% → fires
      const recs535c = Array.from({ length: 10 }, (_, i) =>
        makeRec535(i, { payoffSetupIds: [1, 5, 6, 7].includes(i) ? ['setup-A'] : [] })
      );
      const res = await runIN535(recs535c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_BACK_LOADED'), 'PAYOFF_BACK_LOADED should fire');
    });

    it('PAYOFF_BACK_LOADED does not fire when payoffs are distributed across both halves', async () => {
      // 10 scenes; half=5; payoffs at pos 1,2,6,7 → frontCount=2, backCount=2; 2/4=50% ≤ 70% → no fire
      const recs535cnr = Array.from({ length: 10 }, (_, i) =>
        makeRec535(i, { payoffSetupIds: [1, 2, 6, 7].includes(i) ? ['setup-A'] : [] })
      );
      const res = await runIN535(recs535cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_BACK_LOADED'), 'PAYOFF_BACK_LOADED should not fire');
    });
  });


  describe('Wave 521 — intentionPass: seed peak uncaused, seed front-loaded, payoff emotion decoupled', async () => {
    const makeRec521 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN521 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    it('SEED_PEAK_UNCAUSED fires when the densest seed scene has no cause in prior 2 scenes', async () => {
      // 8 scenes: scene 4 plants 2 seeds (the peak); scenes 2,3 have no revelation/turn/suspense/clock
      const recs521a = Array.from({ length: 8 }, (_, i) =>
        makeRec521(i, {
          seededClueIds: i === 0 ? ['c1'] : i === 4 ? ['c2', 'c3'] : [],
        }),
      );
      const res = await runIN521(recs521a);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_PEAK_UNCAUSED'), 'SEED_PEAK_UNCAUSED should fire');
    });

    it('SEED_PEAK_UNCAUSED does not fire when the peak seed scene is preceded by a suspense rise', async () => {
      // 8 scenes: scene 4 plants 2 seeds; scene 3 has suspenseDelta > 0 (causal event)
      const recs521an = Array.from({ length: 8 }, (_, i) =>
        makeRec521(i, {
          seededClueIds: i === 0 ? ['c1'] : i === 4 ? ['c2', 'c3'] : [],
          suspenseDelta: i === 3 ? 1 : 0,
        }),
      );
      const res = await runIN521(recs521an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_PEAK_UNCAUSED'), 'SEED_PEAK_UNCAUSED should not fire');
    });

    it('SEED_FRONTLOADED fires when >70% of seed scenes fall in the first half', async () => {
      // 10 scenes: seeds at 0,1,2,3 (first half) and 8 (second half) — 4/5 = 80% front
      const recs521b = Array.from({ length: 10 }, (_, i) =>
        makeRec521(i, { seededClueIds: [0, 1, 2, 3, 8].includes(i) ? ['c1'] : [] }),
      );
      const res = await runIN521(recs521b);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_FRONTLOADED'), 'SEED_FRONTLOADED should fire');
    });

    it('SEED_FRONTLOADED does not fire when seeds are spread across both halves', async () => {
      // 10 scenes: seeds at 1,2,6,7 — 2/4 = 50%, not front-loaded
      const recs521bn = Array.from({ length: 10 }, (_, i) =>
        makeRec521(i, { seededClueIds: [1, 2, 6, 7].includes(i) ? ['c1'] : [] }),
      );
      const res = await runIN521(recs521bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_FRONTLOADED'), 'SEED_FRONTLOADED should not fire');
    });

    it('PAYOFF_EMOTION_DECOUPLED fires when all payoff scenes are emotionally neutral', async () => {
      // 8 scenes: payoffs at 2,4,6 (all neutral); emotion at 1,3 (non-payoff)
      const recs521c = Array.from({ length: 8 }, (_, i) =>
        makeRec521(i, {
          payoffSetupIds: [2, 4, 6].includes(i) ? ['setup1'] : [],
          emotionalShift: [1, 3].includes(i) ? 'positive' : 'neutral',
        }),
      );
      const res = await runIN521(recs521c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_EMOTION_DECOUPLED'), 'PAYOFF_EMOTION_DECOUPLED should fire');
    });

    it('PAYOFF_EMOTION_DECOUPLED does not fire when at least one payoff scene has emotional charge', async () => {
      // 8 scenes: payoffs at 2,4,6; scene 4 is emotionally charged (positive)
      const recs521cn = Array.from({ length: 8 }, (_, i) =>
        makeRec521(i, {
          payoffSetupIds: [2, 4, 6].includes(i) ? ['setup1'] : [],
          emotionalShift: i === 4 ? 'positive' : 'neutral',
        }),
      );
      const res = await runIN521(recs521cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_EMOTION_DECOUPLED'), 'PAYOFF_EMOTION_DECOUPLED should not fire');
    });
  });


  describe('Wave 507 — intentionPass: payoff suspense aftermath void, revelation closing void, payoff seed decoupled', async () => {
    const makeRec507 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runI507 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('PAYOFF_SUSPENSE_AFTERMATH_VOID fires when avg post-payoff suspense is <= 0', async () => {
      // n=10; payoffs at pos 1,3,5 (not last); next scenes (2,4,6) all suspenseDelta=0 → avg=0 ≤ 0 → fire
      const recs507a = Array.from({ length: 10 }, (_, i) =>
        makeRec507(i, {
          payoffSetupIds: [1, 3, 5].includes(i) ? ['setup-A'] : [],
          suspenseDelta: 0,
        }),
      );
      const res = await runI507(recs507a);
      assert.ok(res.issues.some((is: any) => is.rule === 'PAYOFF_SUSPENSE_AFTERMATH_VOID'), 'PAYOFF_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('PAYOFF_SUSPENSE_AFTERMATH_VOID does not fire when avg post-payoff suspense is > 0', async () => {
      // n=10; payoffs at 1,3,5; scene 2 has suspenseDelta=3 (others 0) → avg=1 > 0 → no fire
      const recs507anr = Array.from({ length: 10 }, (_, i) =>
        makeRec507(i, {
          payoffSetupIds: [1, 3, 5].includes(i) ? ['setup-B'] : [],
          suspenseDelta: i === 2 ? 3 : 0,
        }),
      );
      const res = await runI507(recs507anr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'PAYOFF_SUSPENSE_AFTERMATH_VOID'), 'PAYOFF_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    it('REVELATION_CLOSING_VOID fires when no revelation falls in the final third', async () => {
      // n=9; third=3; revelations at pos 0,1,2 (all zone1); none at pos 6,7,8 → fire
      const recs507b = Array.from({ length: 9 }, (_, i) =>
        makeRec507(i, { revelation: [0, 1, 2].includes(i) ? 'A truth is revealed.' : null }),
      );
      const res = await runI507(recs507b);
      assert.ok(res.issues.some((is: any) => is.rule === 'REVELATION_CLOSING_VOID'), 'REVELATION_CLOSING_VOID should fire');
    });

    it('REVELATION_CLOSING_VOID does not fire when a revelation falls in the final third', async () => {
      // n=9; third=3; revelation at pos 7 (zone3: 7 >= 2*3=6) → anyRevInFinal=true → no fire
      const recs507bnr = Array.from({ length: 9 }, (_, i) =>
        makeRec507(i, { revelation: [0, 3, 7].includes(i) ? 'Truth emerges.' : null }),
      );
      const res = await runI507(recs507bnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'REVELATION_CLOSING_VOID'), 'REVELATION_CLOSING_VOID should not fire');
    });

    it('PAYOFF_SEED_DECOUPLED fires when no scene has both a payoff and a seed', async () => {
      // n=10; payoffs at 2,5; seeds at 3,7 — zero overlap → fire
      const recs507c = Array.from({ length: 10 }, (_, i) =>
        makeRec507(i, {
          payoffSetupIds: [2, 5].includes(i) ? ['setup-X'] : [],
          seededClueIds: [3, 7].includes(i) ? ['clue-Y'] : [],
        }),
      );
      const res = await runI507(recs507c);
      assert.ok(res.issues.some((is: any) => is.rule === 'PAYOFF_SEED_DECOUPLED'), 'PAYOFF_SEED_DECOUPLED should fire');
    });

    it('PAYOFF_SEED_DECOUPLED does not fire when a scene has both a payoff and a seed', async () => {
      // n=10; scene 5 has both payoffSetupIds and seededClueIds → anyPayoffSeed=true → no fire
      const recs507cnr = Array.from({ length: 10 }, (_, i) =>
        makeRec507(i, {
          payoffSetupIds: [2, 5].includes(i) ? ['setup-X'] : [],
          seededClueIds: [5, 7].includes(i) ? ['clue-Z'] : [],
        }),
      );
      const res = await runI507(recs507cnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'PAYOFF_SEED_DECOUPLED'), 'PAYOFF_SEED_DECOUPLED should not fire');
    });
  });


  describe('Wave 493 — intentionPass: payoff curiosity flat, seed Act 1 void, payoff run', async () => {
    const makeRec493 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runI493 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // PAYOFF_CURIOSITY_FLAT fire: n=8; payoffs at 2,4,6 with curiosityDelta=0 each → avg=0
    it('PAYOFF_CURIOSITY_FLAT fires when payoff scenes average curiosityDelta ≤ 0', async () => {
      const recs493a: any[] = Array.from({ length: 8 }, (_, i) => makeRec493(i, {
        payoffSetupIds: [2, 4, 6].includes(i) ? ['setup1'] : [],
        curiosityDelta: [2, 4, 6].includes(i) ? 0 : 0,
      }));
      const res = await runI493(recs493a);
      assert.ok(res.issues.some((x: any) => x.rule === 'PAYOFF_CURIOSITY_FLAT'), 'PAYOFF_CURIOSITY_FLAT should fire');
    });

    // PAYOFF_CURIOSITY_FLAT no-fire: payoff scene at idx 4 has curiosityDelta=1 → avg > 0
    it('PAYOFF_CURIOSITY_FLAT does not fire when at least one payoff scene has positive curiosityDelta', async () => {
      const recs493an: any[] = Array.from({ length: 8 }, (_, i) => makeRec493(i, {
        payoffSetupIds: [2, 4, 6].includes(i) ? ['setup1'] : [],
        curiosityDelta: i === 4 ? 1 : 0,
      }));
      const res = await runI493(recs493an);
      assert.ok(!res.issues.some((x: any) => x.rule === 'PAYOFF_CURIOSITY_FLAT'), 'PAYOFF_CURIOSITY_FLAT should not fire');
    });

    // SEED_ACT1_VOID fire: n=12; act1End=3; seeds at scenes 4,7 (none in 0-2)
    it('SEED_ACT1_VOID fires when no clue is seeded in the first quarter', async () => {
      const recs493b: any[] = Array.from({ length: 12 }, (_, i) => makeRec493(i, {
        seededClueIds: [4, 7].includes(i) ? ['clue1'] : [],
      }));
      const res = await runI493(recs493b);
      assert.ok(res.issues.some((x: any) => x.rule === 'SEED_ACT1_VOID'), 'SEED_ACT1_VOID should fire');
    });

    // SEED_ACT1_VOID no-fire: seed at scene 1 falls within Act 1 (first 25% of 12=0-2)
    it('SEED_ACT1_VOID does not fire when a seed exists in the first quarter', async () => {
      const recs493bn: any[] = Array.from({ length: 12 }, (_, i) => makeRec493(i, {
        seededClueIds: [1, 7].includes(i) ? ['clue1'] : [],
      }));
      const res = await runI493(recs493bn);
      assert.ok(!res.issues.some((x: any) => x.rule === 'SEED_ACT1_VOID'), 'SEED_ACT1_VOID should not fire');
    });

    // PAYOFF_RUN fire: n=8; payoffs at scenes 3,4,5 — 3 consecutive
    it('PAYOFF_RUN fires when 3 or more consecutive payoff scenes exist', async () => {
      const recs493c: any[] = Array.from({ length: 8 }, (_, i) => makeRec493(i, {
        payoffSetupIds: [3, 4, 5].includes(i) ? ['setup1'] : [],
      }));
      const res = await runI493(recs493c);
      assert.ok(res.issues.some((x: any) => x.rule === 'PAYOFF_RUN'), 'PAYOFF_RUN should fire');
    });

    // PAYOFF_RUN no-fire: payoffs at 2,4,6 — each separated by a non-payoff scene (max run=1)
    it('PAYOFF_RUN does not fire when no run of 3 consecutive payoff scenes exists', async () => {
      const recs493cn: any[] = Array.from({ length: 8 }, (_, i) => makeRec493(i, {
        payoffSetupIds: [2, 4, 6].includes(i) ? ['setup1'] : [],
      }));
      const res = await runI493(recs493cn);
      assert.ok(!res.issues.some((x: any) => x.rule === 'PAYOFF_RUN'), 'PAYOFF_RUN should not fire');
    });
  });


  describe('Wave 479 — intentionPass: revelation run, payoff final zone void, revelation curiosity flat', async () => {
    const makeRec479 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runInt479 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('REVELATION_RUN fires when 3 or more consecutive scenes each have a revelation', async () => {
      // n=10; revelations at scenes 3,4,5 (3 consecutive) → fires
      const recs479a = Array.from({ length: 10 }, (_, i) => makeRec479(i));
      recs479a[3] = makeRec479(3, { revelation: 'truth A' });
      recs479a[4] = makeRec479(4, { revelation: 'truth B' });
      recs479a[5] = makeRec479(5, { revelation: 'truth C' });
      const res = await runInt479(recs479a);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_RUN'), 'REVELATION_RUN should fire');
    });

    it('REVELATION_RUN does not fire when revelations are not in consecutive scenes', async () => {
      // n=10; revelations at scenes 1,4,7 (all separated) → no fire
      const recs479anr = Array.from({ length: 10 }, (_, i) => makeRec479(i));
      recs479anr[1] = makeRec479(1, { revelation: 'truth A' });
      recs479anr[4] = makeRec479(4, { revelation: 'truth B' });
      recs479anr[7] = makeRec479(7, { revelation: 'truth C' });
      const res = await runInt479(recs479anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_RUN'), 'REVELATION_RUN should not fire');
    });

    it('PAYOFF_FINAL_ZONE_VOID fires when 4+ payoffs exist but none fall in the final 25%', async () => {
      // n=12 (finalZone=9); 4 payoffs at scenes 1,3,5,7 — all before scene 9 → fires
      const recs479b = Array.from({ length: 12 }, (_, i) => makeRec479(i));
      recs479b[1] = makeRec479(1, { payoffSetupIds: ['s1'] });
      recs479b[3] = makeRec479(3, { payoffSetupIds: ['s2'] });
      recs479b[5] = makeRec479(5, { payoffSetupIds: ['s3'] });
      recs479b[7] = makeRec479(7, { payoffSetupIds: ['s4'] });
      const res = await runInt479(recs479b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_FINAL_ZONE_VOID'), 'PAYOFF_FINAL_ZONE_VOID should fire');
    });

    it('PAYOFF_FINAL_ZONE_VOID does not fire when at least one payoff falls in the final zone', async () => {
      // n=12 (finalZone=9); 4 payoffs — one at scene 10 (in final zone) → no fire
      const recs479bnr = Array.from({ length: 12 }, (_, i) => makeRec479(i));
      recs479bnr[1] = makeRec479(1, { payoffSetupIds: ['s1'] });
      recs479bnr[3] = makeRec479(3, { payoffSetupIds: ['s2'] });
      recs479bnr[5] = makeRec479(5, { payoffSetupIds: ['s3'] });
      recs479bnr[10] = makeRec479(10, { payoffSetupIds: ['s4'] });
      const res = await runInt479(recs479bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_FINAL_ZONE_VOID'), 'PAYOFF_FINAL_ZONE_VOID should not fire');
    });

    it('REVELATION_CURIOSITY_FLAT fires when revelation scenes average curiosityDelta <= 0', async () => {
      // n=10; 3 revelation scenes all with curiosityDelta=0 → avg=0 ≤ 0 → fires
      const recs479c = Array.from({ length: 10 }, (_, i) => makeRec479(i));
      recs479c[2] = makeRec479(2, { revelation: 'truth A', curiosityDelta: 0 });
      recs479c[5] = makeRec479(5, { revelation: 'truth B', curiosityDelta: -0.2 });
      recs479c[8] = makeRec479(8, { revelation: 'truth C', curiosityDelta: 0 });
      const res = await runInt479(recs479c);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_CURIOSITY_FLAT'), 'REVELATION_CURIOSITY_FLAT should fire');
    });

    it('REVELATION_CURIOSITY_FLAT does not fire when revelation scenes raise curiosity on average', async () => {
      // n=10; 3 revelation scenes with curiosityDelta 0.3, -0.1, 0.4 → avg=0.2 > 0 → no fire
      const recs479cnr = Array.from({ length: 10 }, (_, i) => makeRec479(i));
      recs479cnr[2] = makeRec479(2, { revelation: 'truth A', curiosityDelta: 0.3 });
      recs479cnr[5] = makeRec479(5, { revelation: 'truth B', curiosityDelta: -0.1 });
      recs479cnr[8] = makeRec479(8, { revelation: 'truth C', curiosityDelta: 0.4 });
      const res = await runInt479(recs479cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_CURIOSITY_FLAT'), 'REVELATION_CURIOSITY_FLAT should not fire');
    });
  });


  describe('Wave 465 — intentionPass: proactive clock aftermath absent, payoff drama decoupled, revelation frontloaded', async () => {
    const makeRec465 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runInt465 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('PROACTIVE_CLOCK_AFTERMATH_ABSENT fires when no proactive act is followed by a clock event within 2 scenes', async () => {
      // n=10, proactive acts at 1,4,7 (clockRaised); aftermath scenes 2-3, 5-6, 8-9 all clockless → fires
      const recs465a = Array.from({ length: 10 }, (_, i) => makeRec465(i));
      recs465a[1] = makeRec465(1, { clockRaised: true });
      recs465a[4] = makeRec465(4, { seededClueIds: ['c1'] });
      recs465a[7] = makeRec465(7, { clockRaised: true });
      const res = await runInt465(recs465a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PROACTIVE_CLOCK_AFTERMATH_ABSENT'), 'PROACTIVE_CLOCK_AFTERMATH_ABSENT should fire');
    });

    it('PROACTIVE_CLOCK_AFTERMATH_ABSENT does not fire when a proactive act is followed by a clockRaised scene', async () => {
      // n=10, proactive at 1,4,7; scene 5 has clockRaised=true (within 1 of proactive at 4) → no fire
      const recs465anr = Array.from({ length: 10 }, (_, i) => makeRec465(i));
      recs465anr[1] = makeRec465(1, { clockRaised: true });
      recs465anr[4] = makeRec465(4, { seededClueIds: ['c1'] });
      recs465anr[5] = makeRec465(5, { clockRaised: true });
      recs465anr[7] = makeRec465(7, { clockRaised: true });
      const res = await runInt465(recs465anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PROACTIVE_CLOCK_AFTERMATH_ABSENT'), 'PROACTIVE_CLOCK_AFTERMATH_ABSENT should not fire');
    });

    it('PAYOFF_DRAMA_DECOUPLED fires when payoff scenes and turn scenes never coincide', async () => {
      // n=10; payoffs at 2,6 (no turns); turns at 4,8 (no payoffs) → fires
      const recs465b = Array.from({ length: 10 }, (_, i) => makeRec465(i));
      recs465b[2] = makeRec465(2, { payoffSetupIds: ['s1'] });
      recs465b[4] = makeRec465(4, { dramaticTurn: 'reversal' });
      recs465b[6] = makeRec465(6, { payoffSetupIds: ['s2'] });
      recs465b[8] = makeRec465(8, { dramaticTurn: 'twist' });
      const res = await runInt465(recs465b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_DRAMA_DECOUPLED'), 'PAYOFF_DRAMA_DECOUPLED should fire');
    });

    it('PAYOFF_DRAMA_DECOUPLED does not fire when a payoff coincides with a dramatic turn', async () => {
      // n=10; scene 4 has both payoffSetupIds and a dramaticTurn → no fire
      const recs465bnr = Array.from({ length: 10 }, (_, i) => makeRec465(i));
      recs465bnr[2] = makeRec465(2, { payoffSetupIds: ['s1'] });
      recs465bnr[4] = makeRec465(4, { payoffSetupIds: ['s2'], dramaticTurn: 'reversal' });
      recs465bnr[7] = makeRec465(7, { dramaticTurn: 'twist' });
      const res = await runInt465(recs465bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_DRAMA_DECOUPLED'), 'PAYOFF_DRAMA_DECOUPLED should not fire');
    });

    it('REVELATION_FRONTLOADED fires when more than 70% of revelations fall in the first half', async () => {
      // n=12 (half=6); 5 revelations: 4 in scenes 0-5 (first half), 1 in scene 9 → 4/5=80% > 70% → fires
      const recs465c = Array.from({ length: 12 }, (_, i) => makeRec465(i));
      recs465c[1] = makeRec465(1, { revelation: 'truth A' });
      recs465c[2] = makeRec465(2, { revelation: 'truth B' });
      recs465c[3] = makeRec465(3, { revelation: 'truth C' });
      recs465c[5] = makeRec465(5, { revelation: 'truth D' });
      recs465c[9] = makeRec465(9, { revelation: 'truth E' });
      const res = await runInt465(recs465c);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_FRONTLOADED'), 'REVELATION_FRONTLOADED should fire');
    });

    it('REVELATION_FRONTLOADED does not fire when revelations are distributed across both halves', async () => {
      // n=12 (half=6); 5 revelations: 2 first half (scenes 1,3), 3 second half (scenes 7,9,11) → 2/5=40% ≤ 70% → no fire
      const recs465cnr = Array.from({ length: 12 }, (_, i) => makeRec465(i));
      recs465cnr[1] = makeRec465(1, { revelation: 'truth A' });
      recs465cnr[3] = makeRec465(3, { revelation: 'truth B' });
      recs465cnr[7] = makeRec465(7, { revelation: 'truth C' });
      recs465cnr[9] = makeRec465(9, { revelation: 'truth D' });
      recs465cnr[11] = makeRec465(11, { revelation: 'truth E' });
      const res = await runInt465(recs465cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_FRONTLOADED'), 'REVELATION_FRONTLOADED should not fire');
    });
  });


  describe('Wave 451 — intentionPass: proactive relationship aftermath absent, seed emotional decoupled, seed cause void', async () => {
    const makeRec451 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runInt451 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('PROACTIVE_RELATIONSHIP_AFTERMATH_ABSENT fires when all proactive acts have no relational aftermath', async () => {
      // n=10, proactive acts at 1, 4, 7 (clockRaised); aftermath scenes 2,3 / 5,6 / 8,9 have no rel shifts → fires
      const recs451a = Array.from({ length: 10 }, (_, i) => makeRec451(i));
      recs451a[1] = makeRec451(1, { clockRaised: true });
      recs451a[4] = makeRec451(4, { clockRaised: true });
      recs451a[7] = makeRec451(7, { clockRaised: true });
      const res = await runInt451(recs451a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PROACTIVE_RELATIONSHIP_AFTERMATH_ABSENT'), 'PROACTIVE_RELATIONSHIP_AFTERMATH_ABSENT should fire');
    });

    it('PROACTIVE_RELATIONSHIP_AFTERMATH_ABSENT does not fire when a proactive act is followed by a relationship shift', async () => {
      // n=10, proactive at 1; scene 2 has a relationship shift → no fire
      const recs451anr = Array.from({ length: 10 }, (_, i) => makeRec451(i));
      recs451anr[1] = makeRec451(1, { clockRaised: true });
      recs451anr[2] = makeRec451(2, { relationshipShifts: [{ pairKey: 'A|B', dimension: 'trust', amount: 0.4 }] });
      recs451anr[4] = makeRec451(4, { clockRaised: true });
      recs451anr[7] = makeRec451(7, { clockRaised: true });
      const res = await runInt451(recs451anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PROACTIVE_RELATIONSHIP_AFTERMATH_ABSENT'), 'PROACTIVE_RELATIONSHIP_AFTERMATH_ABSENT should not fire');
    });

    it('SEED_EMOTIONAL_DECOUPLED fires when all seed scenes are emotionally neutral', async () => {
      // n=10, 4 seed scenes all neutral → fires
      const recs451b = Array.from({ length: 10 }, (_, i) => makeRec451(i));
      recs451b[1] = makeRec451(1, { seededClueIds: ['c1'], emotionalShift: 'neutral' });
      recs451b[3] = makeRec451(3, { seededClueIds: ['c2'], emotionalShift: 'neutral' });
      recs451b[6] = makeRec451(6, { seededClueIds: ['c3'], emotionalShift: 'neutral' });
      recs451b[8] = makeRec451(8, { seededClueIds: ['c4'], emotionalShift: 'neutral' });
      const res = await runInt451(recs451b);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_EMOTIONAL_DECOUPLED'), 'SEED_EMOTIONAL_DECOUPLED should fire');
    });

    it('SEED_EMOTIONAL_DECOUPLED does not fire when at least one seed scene has an emotional charge', async () => {
      // n=10, 3 seed scenes: 2 neutral + 1 negative → no fire
      const recs451bnr = Array.from({ length: 10 }, (_, i) => makeRec451(i));
      recs451bnr[1] = makeRec451(1, { seededClueIds: ['c1'], emotionalShift: 'neutral' });
      recs451bnr[3] = makeRec451(3, { seededClueIds: ['c2'], emotionalShift: 'neutral' });
      recs451bnr[6] = makeRec451(6, { seededClueIds: ['c3'], emotionalShift: 'negative' });
      const res = await runInt451(recs451bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_EMOTIONAL_DECOUPLED'), 'SEED_EMOTIONAL_DECOUPLED should not fire');
    });

    it('SEED_CAUSE_VOID fires when all seed scenes have no upstream dramatic trigger', async () => {
      // n=10, 3 seed scenes at 2, 5, 8; all neutral, no turns, no revelation, no curiosity spike, prior scenes also inert → fires
      const recs451c = Array.from({ length: 10 }, (_, i) => makeRec451(i));
      recs451c[2] = makeRec451(2, { seededClueIds: ['c1'] });
      recs451c[5] = makeRec451(5, { seededClueIds: ['c2'] });
      recs451c[8] = makeRec451(8, { seededClueIds: ['c3'] });
      const res = await runInt451(recs451c);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_CAUSE_VOID'), 'SEED_CAUSE_VOID should fire');
    });

    it('SEED_CAUSE_VOID does not fire when a seed scene has a dramatic turn as upstream trigger', async () => {
      // n=10, 3 seed scenes; scene 5 has dramaticTurn='reversal' (self-trigger) → no fire
      const recs451cnr = Array.from({ length: 10 }, (_, i) => makeRec451(i));
      recs451cnr[2] = makeRec451(2, { seededClueIds: ['c1'] });
      recs451cnr[5] = makeRec451(5, { seededClueIds: ['c2'], dramaticTurn: 'reversal' });
      recs451cnr[8] = makeRec451(8, { seededClueIds: ['c3'] });
      const res = await runInt451(recs451cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_CAUSE_VOID'), 'SEED_CAUSE_VOID should not fire');
    });
  });


  describe('Wave 437 — intentionPass: seed run isolated, proactive zone imbalance, seed clockless', async () => {
    const makeRec437 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN437 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('SEED_RUN_ISOLATED fires when 3+ consecutive scenes each plant a clue', async () => {
      // n=8, ≥4 total seeds; scenes 2,3,4 consecutively seed → maxSeedRun=3 → fires
      const recs437a = Array.from({ length: 8 }, (_, i) => makeRec437(i));
      recs437a[0] = makeRec437(0, { seededClueIds: ['c1'] });
      recs437a[2] = makeRec437(2, { seededClueIds: ['c2'] });
      recs437a[3] = makeRec437(3, { seededClueIds: ['c3'] });
      recs437a[4] = makeRec437(4, { seededClueIds: ['c4'] });
      const res = await runIN437(recs437a);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_RUN_ISOLATED'), 'SEED_RUN_ISOLATED should fire');
    });

    it('SEED_RUN_ISOLATED does not fire when no 3 consecutive scenes seed clues', async () => {
      // n=8, ≥4 total seeds but max run=2 (scenes 2,3 then break) → no fire
      const recs437anr = Array.from({ length: 8 }, (_, i) => makeRec437(i));
      recs437anr[0] = makeRec437(0, { seededClueIds: ['c1'] });
      recs437anr[2] = makeRec437(2, { seededClueIds: ['c2'] });
      recs437anr[3] = makeRec437(3, { seededClueIds: ['c3'] });
      recs437anr[6] = makeRec437(6, { seededClueIds: ['c4'] });
      const res = await runIN437(recs437anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_RUN_ISOLATED'), 'SEED_RUN_ISOLATED should not fire');
    });

    it('PROACTIVE_ZONE_IMBALANCE fires when one zone has ≥50% of initiative while another is empty', async () => {
      // n=10; clockRaised at 0,1,2 (zone 0: 3 proactive) but zone 2 (indices 5-6) has none
      // zones: [0]=0-2→3, [1]=2-4→0, [2]=5-6→0, [3]=7-9→1; totalProactive=4; zone0=3/4=75% ≥50%; zone1 empty → fires
      const recs437b = Array.from({ length: 10 }, (_, i) => makeRec437(i));
      recs437b[0] = makeRec437(0, { clockRaised: true });
      recs437b[1] = makeRec437(1, { clockRaised: true });
      recs437b[2] = makeRec437(2, { clockRaised: true });
      recs437b[8] = makeRec437(8, { clockRaised: true });
      const res = await runIN437(recs437b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PROACTIVE_ZONE_IMBALANCE'), 'PROACTIVE_ZONE_IMBALANCE should fire');
    });

    it('PROACTIVE_ZONE_IMBALANCE does not fire when initiative is spread across all zones', async () => {
      // n=10; one proactive act in each zone: 0→zone0, 3→zone1, 6→zone2, 8→zone3; no zone empty → no fire
      const recs437bnr = Array.from({ length: 10 }, (_, i) => makeRec437(i));
      recs437bnr[0] = makeRec437(0, { clockRaised: true });
      recs437bnr[3] = makeRec437(3, { clockRaised: true });
      recs437bnr[6] = makeRec437(6, { clockRaised: true });
      recs437bnr[8] = makeRec437(8, { clockRaised: true });
      const res = await runIN437(recs437bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PROACTIVE_ZONE_IMBALANCE'), 'PROACTIVE_ZONE_IMBALANCE should not fire');
    });

    it('SEED_CLOCKLESS fires when all seed scenes lack clock pressure', async () => {
      // n=8, 3 seed scenes all with clockRaised=false, clockDelta=0 → fires
      const recs437c = Array.from({ length: 8 }, (_, i) => makeRec437(i));
      recs437c[1] = makeRec437(1, { seededClueIds: ['c1'], clockRaised: false, clockDelta: 0 });
      recs437c[4] = makeRec437(4, { seededClueIds: ['c2'], clockRaised: false, clockDelta: 0 });
      recs437c[6] = makeRec437(6, { seededClueIds: ['c3'], clockRaised: false, clockDelta: 0 });
      const res = await runIN437(recs437c);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_CLOCKLESS'), 'SEED_CLOCKLESS should fire');
    });

    it('SEED_CLOCKLESS does not fire when at least one seed scene has clock pressure', async () => {
      // n=8, 3 seed scenes; scene 4 has clockRaised=true → no fire
      const recs437cnr = Array.from({ length: 8 }, (_, i) => makeRec437(i));
      recs437cnr[1] = makeRec437(1, { seededClueIds: ['c1'], clockRaised: false, clockDelta: 0 });
      recs437cnr[4] = makeRec437(4, { seededClueIds: ['c2'], clockRaised: true, clockDelta: 0 });
      recs437cnr[6] = makeRec437(6, { seededClueIds: ['c3'], clockRaised: false, clockDelta: 0 });
      const res = await runIN437(recs437cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_CLOCKLESS'), 'SEED_CLOCKLESS should not fire');
    });
  });


  describe('Wave 423 — intentionPass: seed midpoint void, proactive aftermath curiosity absent, seed drama decoupled', async () => {
    const makeRec423 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN423 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({ fountain: '', original: '', records, structure: { escalating: false, reversalCount: 0, actPosition: 'act2', reversalDensity: 0, avgSuspensePerScene: 0, openClues: 0, approachingClimax: false } as any, annotations: [], approvedSpans: [] });
    };

    it('SEED_MIDPOINT_VOID fires when no seed falls in the 40%–60% midpoint zone', async () => {
      // n=10, midpoint=[4,5]; seeds at 1, 2, 8 (outside zone), none in [4,5] → fires
      const recs423a = Array.from({ length: 10 }, (_, i) => makeRec423(i));
      recs423a[1] = makeRec423(1, { seededClueIds: ['c1'] });
      recs423a[2] = makeRec423(2, { seededClueIds: ['c2'] });
      recs423a[8] = makeRec423(8, { seededClueIds: ['c3'] });
      const res = await runIN423(recs423a);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_MIDPOINT_VOID'), 'SEED_MIDPOINT_VOID should fire');
    });

    it('SEED_MIDPOINT_VOID does not fire when a seed lands in the midpoint zone', async () => {
      // n=10, midpoint=[4,5]; seed at 4 (inside zone) → no fire
      const recs423anr = Array.from({ length: 10 }, (_, i) => makeRec423(i));
      recs423anr[1] = makeRec423(1, { seededClueIds: ['c1'] });
      recs423anr[4] = makeRec423(4, { seededClueIds: ['c2'] });
      recs423anr[8] = makeRec423(8, { seededClueIds: ['c3'] });
      const res = await runIN423(recs423anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_MIDPOINT_VOID'), 'SEED_MIDPOINT_VOID should not fire');
    });

    it('PROACTIVE_AFTERMATH_CURIOSITY_ABSENT fires when no proactive act is followed by curiosity rise', async () => {
      // n=8; proactive at 1,3,5; all subsequent scenes have curiosityDelta=0 → fires
      const recs423b = Array.from({ length: 8 }, (_, i) => makeRec423(i));
      recs423b[1] = makeRec423(1, { seededClueIds: ['c1'] });
      recs423b[3] = makeRec423(3, { seededClueIds: ['c2'] });
      recs423b[5] = makeRec423(5, { seededClueIds: ['c3'] });
      const res = await runIN423(recs423b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PROACTIVE_AFTERMATH_CURIOSITY_ABSENT'), 'PROACTIVE_AFTERMATH_CURIOSITY_ABSENT should fire');
    });

    it('PROACTIVE_AFTERMATH_CURIOSITY_ABSENT does not fire when curiosity rises after a proactive act', async () => {
      // n=8; proactive at 1,3,5; scene 2 has curiosityDelta=1 → no fire
      const recs423bnr = Array.from({ length: 8 }, (_, i) => makeRec423(i));
      recs423bnr[1] = makeRec423(1, { seededClueIds: ['c1'] });
      recs423bnr[2] = makeRec423(2, { curiosityDelta: 1 });
      recs423bnr[3] = makeRec423(3, { seededClueIds: ['c2'] });
      recs423bnr[5] = makeRec423(5, { seededClueIds: ['c3'] });
      const res = await runIN423(recs423bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PROACTIVE_AFTERMATH_CURIOSITY_ABSENT'), 'PROACTIVE_AFTERMATH_CURIOSITY_ABSENT should not fire');
    });

    it('SEED_DRAMA_DECOUPLED fires when no seed scene coincides with a dramatic turn', async () => {
      // n=8; seeds at 1,3 (no turns); turns at 5,7 (no seeds) → fires
      const recs423c = Array.from({ length: 8 }, (_, i) => makeRec423(i));
      recs423c[1] = makeRec423(1, { seededClueIds: ['c1'] });
      recs423c[3] = makeRec423(3, { seededClueIds: ['c2'] });
      recs423c[5] = makeRec423(5, { dramaticTurn: 'reversal' });
      recs423c[7] = makeRec423(7, { dramaticTurn: 'twist' });
      const res = await runIN423(recs423c);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_DRAMA_DECOUPLED'), 'SEED_DRAMA_DECOUPLED should fire');
    });

    it('SEED_DRAMA_DECOUPLED does not fire when a seed scene coincides with a dramatic turn', async () => {
      // n=8; seed at 1 (also a turn), seeds at 3; turns at 5 → no fire
      const recs423cnr = Array.from({ length: 8 }, (_, i) => makeRec423(i));
      recs423cnr[1] = makeRec423(1, { seededClueIds: ['c1'], dramaticTurn: 'reversal' });
      recs423cnr[3] = makeRec423(3, { seededClueIds: ['c2'] });
      recs423cnr[5] = makeRec423(5, { dramaticTurn: 'twist' });
      const res = await runIN423(recs423cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_DRAMA_DECOUPLED'), 'SEED_DRAMA_DECOUPLED should not fire');
    });
  });


  describe('Wave 409 — intentionPass: proactive payoff peak decoupled, seed frontloaded, proactive suspense aftermath absent', async () => {
    const makeRec409 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN409 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({ fountain: '', original: '', records, structure: { escalating: false, reversalCount: 0, actPosition: 'act2', reversalDensity: 0, avgSuspensePerScene: 0, openClues: 0, approachingClimax: false } as any, annotations: [], approvedSpans: [] });
    };

    it('PROACTIVE_PAYOFF_PEAK_DECOUPLED fires when the biggest payoff is not proactive', async () => {
      const recs409p = Array.from({ length: 8 }, (_, i) => makeRec409(i));
      recs409p[1] = makeRec409(1, { seededClueIds: ['s1'], payoffSetupIds: ['p1'] }); // proactive + payoff
      recs409p[3] = makeRec409(3, { clockRaised: true, payoffSetupIds: ['p2'] });      // proactive + payoff
      recs409p[6] = makeRec409(6, { payoffSetupIds: ['p3', 'p4', 'p5'] });             // peak, NOT proactive
      const res = await runIN409(recs409p);
      assert.ok(res.issues.some((i: any) => i.rule === 'PROACTIVE_PAYOFF_PEAK_DECOUPLED'), 'PROACTIVE_PAYOFF_PEAK_DECOUPLED should fire');
    });

    it('PROACTIVE_PAYOFF_PEAK_DECOUPLED does NOT fire when the biggest payoff is proactive', async () => {
      const recs409pNF = Array.from({ length: 8 }, (_, i) => makeRec409(i));
      recs409pNF[1] = makeRec409(1, { seededClueIds: ['s1'], payoffSetupIds: ['p1'] });
      recs409pNF[3] = makeRec409(3, { clockRaised: true, payoffSetupIds: ['p2'] });
      recs409pNF[6] = makeRec409(6, { clockRaised: true, payoffSetupIds: ['p3', 'p4', 'p5'] }); // peak IS proactive
      const res = await runIN409(recs409pNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PROACTIVE_PAYOFF_PEAK_DECOUPLED'), 'PROACTIVE_PAYOFF_PEAK_DECOUPLED should not fire');
    });

    it('SEED_FRONTLOADED fires when all seeds fall in the first half', async () => {
      // n=8 → half=4; seeds at 1,2,3 (all first half)
      const recs409s = Array.from({ length: 8 }, (_, i) => makeRec409(i));
      [1, 2, 3].forEach(i => { recs409s[i] = makeRec409(i, { seededClueIds: [`c${i}`] }); });
      const res = await runIN409(recs409s);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_FRONTLOADED'), 'SEED_FRONTLOADED should fire');
    });

    it('SEED_FRONTLOADED does NOT fire when a seed falls in the second half', async () => {
      // n=8 → half=4; seeds at 1,2 (first half) and 5 (second half)
      const recs409sNF = Array.from({ length: 8 }, (_, i) => makeRec409(i));
      [1, 2, 5].forEach(i => { recs409sNF[i] = makeRec409(i, { seededClueIds: [`c${i}`] }); });
      const res = await runIN409(recs409sNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_FRONTLOADED'), 'SEED_FRONTLOADED should not fire');
    });

    it('PROACTIVE_SUSPENSE_AFTERMATH_ABSENT fires when no proactive act raises suspense downstream', async () => {
      const recs409a = Array.from({ length: 8 }, (_, i) => makeRec409(i));
      [1, 3, 5].forEach(i => { recs409a[i] = makeRec409(i, { clockRaised: true }); }); // proactive, no downstream spikes
      const res = await runIN409(recs409a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PROACTIVE_SUSPENSE_AFTERMATH_ABSENT'), 'PROACTIVE_SUSPENSE_AFTERMATH_ABSENT should fire');
    });

    it('PROACTIVE_SUSPENSE_AFTERMATH_ABSENT does NOT fire when a proactive act spikes suspense downstream', async () => {
      const recs409aNF = Array.from({ length: 8 }, (_, i) => makeRec409(i));
      [1, 3, 5].forEach(i => { recs409aNF[i] = makeRec409(i, { clockRaised: true }); });
      recs409aNF[2] = makeRec409(2, { suspenseDelta: 2 }); // downstream of scene 1
      const res = await runIN409(recs409aNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PROACTIVE_SUSPENSE_AFTERMATH_ABSENT'), 'PROACTIVE_SUSPENSE_AFTERMATH_ABSENT should not fire');
    });
  });


  describe('Wave 395 — intentionPass: proactive relationship peak absent, proactive emotional recoil absent, seed backloaded', async () => {
    const makeRec395 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runIN395 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({ fountain: '', original: '', records, structure: { escalating: false, reversalCount: 0, actPosition: 'act2', reversalDensity: 0, avgSuspensePerScene: 0, openClues: 0, approachingClimax: false } as any, annotations: [], approvedSpans: [] });
    };

    it('PROACTIVE_RELATIONSHIP_PEAK_ABSENT fires when the largest shift is not in a proactive scene', async () => {
      // scenes 1,3 proactive with small shifts; scene 6 has the peak shift but is NOT proactive
      const recs395rp = Array.from({ length: 8 }, (_, i) =>
        makeRec395(i, {
          clockRaised: [1, 3].includes(i),
          relationshipShifts: [1, 3].includes(i)
            ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.3 }]
            : i === 6
              ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.8 }]
              : [],
        }),
      );
      const res = await runIN395(recs395rp);
      assert.ok(res.issues.some((i: any) => i.rule === 'PROACTIVE_RELATIONSHIP_PEAK_ABSENT'), 'PROACTIVE_RELATIONSHIP_PEAK_ABSENT should fire');
    });

    it('PROACTIVE_RELATIONSHIP_PEAK_ABSENT does not fire when the peak shift is in a proactive scene', async () => {
      // scene 6 is now also proactive (clockRaised) — peak shift coincides with initiative
      const recs395rpn = Array.from({ length: 8 }, (_, i) =>
        makeRec395(i, {
          clockRaised: [1, 3, 6].includes(i),
          relationshipShifts: [1, 3].includes(i)
            ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.3 }]
            : i === 6
              ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.8 }]
              : [],
        }),
      );
      const res = await runIN395(recs395rpn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PROACTIVE_RELATIONSHIP_PEAK_ABSENT'), 'PROACTIVE_RELATIONSHIP_PEAK_ABSENT should not fire');
    });

    it('PROACTIVE_EMOTIONAL_RECOIL_ABSENT fires when no proactive act is followed by negative emotion in the next 2 scenes', async () => {
      // proactive at 1,3,5; all subsequent scenes neutral — no emotional recoil
      const recs395er = Array.from({ length: 8 }, (_, i) =>
        makeRec395(i, { clockRaised: [1, 3, 5].includes(i) }),
      );
      const res = await runIN395(recs395er);
      assert.ok(res.issues.some((i: any) => i.rule === 'PROACTIVE_EMOTIONAL_RECOIL_ABSENT'), 'PROACTIVE_EMOTIONAL_RECOIL_ABSENT should fire');
    });

    it('PROACTIVE_EMOTIONAL_RECOIL_ABSENT does not fire when a proactive act is followed by negative emotion', async () => {
      // proactive at 1,3,5; scene 2 (after scene 1) is negative → recoil exists
      const recs395ern = Array.from({ length: 8 }, (_, i) =>
        makeRec395(i, {
          clockRaised: [1, 3, 5].includes(i),
          emotionalShift: i === 2 ? 'negative' : 'neutral',
        }),
      );
      const res = await runIN395(recs395ern);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PROACTIVE_EMOTIONAL_RECOIL_ABSENT'), 'PROACTIVE_EMOTIONAL_RECOIL_ABSENT should not fire');
    });

    it('SEED_BACKLOADED fires when all clue seeds fall in the second half', async () => {
      // n=8, half=4; 3 seeds at scenes 4,5,6 — none in scenes 0-3
      const recs395sb = Array.from({ length: 8 }, (_, i) =>
        makeRec395(i, { seededClueIds: [4, 5, 6].includes(i) ? ['clue1'] : [] }),
      );
      const res = await runIN395(recs395sb);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_BACKLOADED'), 'SEED_BACKLOADED should fire');
    });

    it('SEED_BACKLOADED does not fire when at least one seed is in the first half', async () => {
      // seed at scene 1 (first half), plus scenes 4,5 (second half) — not all backloaded
      const recs395sbn = Array.from({ length: 8 }, (_, i) =>
        makeRec395(i, { seededClueIds: [1, 4, 5].includes(i) ? ['clue1'] : [] }),
      );
      const res = await runIN395(recs395sbn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_BACKLOADED'), 'SEED_BACKLOADED should not fire');
    });
  });


  describe('Wave 300 — intentionPass: curiosity without agency, turns undriven, seeding curiosity flat', async () => {
    const makeRec300 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runI300 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CURIOSITY_WITHOUT_AGENCY fires when no curiosity spike is tied to a proactive act', async () => {
      // spikes at 1,2,3; the only proactive act (clock) is at 6 with no spike at/after it
      const recs300ca = Array.from({ length: 8 }, (_, i) =>
        makeRec300(i, {
          curiosityDelta: [1, 2, 3].includes(i) ? 2 : 0,
          clockRaised: i === 6,
        })
      );
      const res = await runI300(recs300ca);
      assert.ok(res.issues.some((i: any) => i.rule === 'CURIOSITY_WITHOUT_AGENCY'), 'CURIOSITY_WITHOUT_AGENCY should fire');
    });

    it('CURIOSITY_WITHOUT_AGENCY does not fire when a spike follows a proactive act', async () => {
      // spike at 7 directly follows the proactive scene at 6
      const recs300nca = Array.from({ length: 8 }, (_, i) =>
        makeRec300(i, {
          curiosityDelta: [1, 2, 7].includes(i) ? 2 : 0,
          clockRaised: i === 6,
        })
      );
      const res = await runI300(recs300nca);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CURIOSITY_WITHOUT_AGENCY'), 'CURIOSITY_WITHOUT_AGENCY should not fire');
    });

    it('TURNS_UNDRIVEN fires when no dramatic turn is tied to a proactive act', async () => {
      const recs300tu = Array.from({ length: 8 }, (_, i) =>
        makeRec300(i, {
          dramaticTurn: [1, 2, 3].includes(i) ? 'reversal' : 'nothing',
          clockRaised: i === 6,
        })
      );
      const res = await runI300(recs300tu);
      assert.ok(res.issues.some((i: any) => i.rule === 'TURNS_UNDRIVEN'), 'TURNS_UNDRIVEN should fire');
    });

    it('TURNS_UNDRIVEN does not fire when a turn follows a proactive act', async () => {
      const recs300ntu = Array.from({ length: 8 }, (_, i) =>
        makeRec300(i, {
          dramaticTurn: [1, 2, 7].includes(i) ? 'reversal' : 'nothing',
          clockRaised: i === 6,
        })
      );
      const res = await runI300(recs300ntu);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TURNS_UNDRIVEN'), 'TURNS_UNDRIVEN should not fire');
    });

    it('SEEDING_CURIOSITY_FLAT fires when all clue-seeding scenes have curiosityDelta ≤ 0', async () => {
      const recs300sf = Array.from({ length: 8 }, (_, i) =>
        makeRec300(i, {
          seededClueIds: [1, 3, 5].includes(i) ? [`clue-${i}`] : [],
          curiosityDelta: 0,
        })
      );
      const res = await runI300(recs300sf);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEEDING_CURIOSITY_FLAT'), 'SEEDING_CURIOSITY_FLAT should fire');
    });

    it('SEEDING_CURIOSITY_FLAT does not fire when a seeding scene raises curiosity', async () => {
      const recs300nsf = Array.from({ length: 8 }, (_, i) =>
        makeRec300(i, {
          seededClueIds: [1, 3, 5].includes(i) ? [`clue-${i}`] : [],
          curiosityDelta: i === 3 ? 2 : 0,
        })
      );
      const res = await runI300(recs300nsf);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEEDING_CURIOSITY_FLAT'), 'SEEDING_CURIOSITY_FLAT should not fire');
    });
  });


  describe('Wave 286 — intentionPass: reactive climax, seed graveyard, purpose monotone', async () => {
    const makeRec286 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runI286 = async (records: any[]) => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      return intentionPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('INTENTION_REACTIVE_CLIMAX fires when climax has no proactive acts but earlier scenes do', async () => {
      // 8 scenes: proactive at 0,1; climax zone = last 2 scenes (6,7) — both passive
      const recs286rc = Array.from({ length: 8 }, (_, i) =>
        makeRec286(i, { clockRaised: i < 2 })
      );
      const res = await runI286(recs286rc);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_REACTIVE_CLIMAX'), 'INTENTION_REACTIVE_CLIMAX should fire');
    });

    it('INTENTION_REACTIVE_CLIMAX does not fire when climax zone has proactive acts', async () => {
      // 8 scenes: proactive at 0,1,7 — climax zone covered
      const recs286nrc = Array.from({ length: 8 }, (_, i) =>
        makeRec286(i, { clockRaised: i === 0 || i === 1 || i === 7 })
      );
      const res = await runI286(recs286nrc);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_REACTIVE_CLIMAX'), 'INTENTION_REACTIVE_CLIMAX should not fire');
    });

    it('INTENTION_SEED_GRAVEYARD fires when first-half has 3+ seeds and second-half has no payoffs', async () => {
      const recs286sg = Array.from({ length: 8 }, (_, i) =>
        makeRec286(i, {
          seededClueIds: i < 3 ? [`clue-${i}`] : [],
          payoffSetupIds: [],
        })
      );
      const res = await runI286(recs286sg);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_SEED_GRAVEYARD'), 'INTENTION_SEED_GRAVEYARD should fire');
    });

    it('INTENTION_SEED_GRAVEYARD does not fire when second half has payoffs', async () => {
      const recs286nsg = Array.from({ length: 8 }, (_, i) =>
        makeRec286(i, {
          seededClueIds: i < 3 ? [`clue-${i}`] : [],
          payoffSetupIds: i === 6 ? ['setup-6'] : [],
        })
      );
      const res = await runI286(recs286nsg);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_SEED_GRAVEYARD'), 'INTENTION_SEED_GRAVEYARD should not fire');
    });

    it('INTENTION_PURPOSE_MONOTONE fires when >70% of scenes share the same purpose', async () => {
      const recs286pm = Array.from({ length: 10 }, (_, i) =>
        makeRec286(i, { purpose: 'development' })
      );
      const res = await runI286(recs286pm);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENTION_PURPOSE_MONOTONE'), 'INTENTION_PURPOSE_MONOTONE should fire');
    });

    it('INTENTION_PURPOSE_MONOTONE does not fire when purposes are varied', async () => {
      const purposes = ['development', 'revelation', 'climax', 'development', 'transition', 'revelation', 'development', 'climax', 'transition', 'development'];
      const recs286npm = Array.from({ length: 10 }, (_, i) =>
        makeRec286(i, { purpose: purposes[i] })
      );
      const res = await runI286(recs286npm);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENTION_PURPOSE_MONOTONE'), 'INTENTION_PURPOSE_MONOTONE should not fire');
    });
  });


  describe('Wave 272 — intentionPass: proactive Act 2a void, proactive late surge, payoff without effort', async () => {
    const makeRec272 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput272 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: '...',
      records: records as any, structure: {} as any,
      storyContext: {} as any, annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('PROACTIVE_ACT2A_VOID fires when Act 2a (25-50%) has no proactive acts', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 12 scenes; act2a = slice(3,6) = scenes 3,4,5; proactive at 0, 7, 9 — none in 3-5
      const records272a = [
        makeRec272(0, { clockRaised: true }),
        makeRec272(1), makeRec272(2), makeRec272(3), makeRec272(4), makeRec272(5), makeRec272(6),
        makeRec272(7, { seededClueIds: ['clue-a'] }),
        makeRec272(8),
        makeRec272(9, { clockRaised: true }),
        makeRec272(10), makeRec272(11),
      ];
      const result272a = await intentionPass(makeInput272(records272a));
      const av = result272a.issues.filter((i: any) => i.rule === 'PROACTIVE_ACT2A_VOID');
      assert.ok(av.length >= 1, `Should detect PROACTIVE_ACT2A_VOID, got: ${JSON.stringify(result272a.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(av[0].severity, 'minor');
    });

    it('PROACTIVE_ACT2A_VOID does NOT fire when a proactive act exists in Act 2a', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 12 scenes; proactive at 0, 4 (scene 4 is in act2a = 3..5), 9
      const records272b = [
        makeRec272(0, { clockRaised: true }),
        makeRec272(1), makeRec272(2), makeRec272(3),
        makeRec272(4, { seededClueIds: ['clue-a'] }),
        makeRec272(5), makeRec272(6), makeRec272(7), makeRec272(8),
        makeRec272(9, { clockRaised: true }),
        makeRec272(10), makeRec272(11),
      ];
      const result272b = await intentionPass(makeInput272(records272b));
      const av = result272b.issues.filter((i: any) => i.rule === 'PROACTIVE_ACT2A_VOID');
      assert.strictEqual(av.length, 0, 'Should NOT fire when a proactive act exists in Act 2a');
    });

    it('PROACTIVE_LATE_SURGE fires when the first half is passive and second half has 3+ proactive acts', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 8 scenes; half=4; first half (0-3) passive; second half (4-7) has 3 proactive acts
      const records272c = [
        makeRec272(0), makeRec272(1), makeRec272(2), makeRec272(3),
        makeRec272(4, { clockRaised: true }),
        makeRec272(5, { seededClueIds: ['clue-a'] }),
        makeRec272(6, { clockRaised: true }),
        makeRec272(7, { seededClueIds: ['clue-b'] }),
      ];
      const result272c = await intentionPass(makeInput272(records272c));
      const ls = result272c.issues.filter((i: any) => i.rule === 'PROACTIVE_LATE_SURGE');
      assert.ok(ls.length >= 1, `Should detect PROACTIVE_LATE_SURGE, got: ${JSON.stringify(result272c.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(ls[0].severity, 'minor');
    });

    it('PROACTIVE_LATE_SURGE does NOT fire when a proactive act appears in the first half', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 8 scenes; proactive at scene 1 (in first half) and 5, 6, 7 → no fire
      const records272d = [
        makeRec272(0),
        makeRec272(1, { clockRaised: true }),
        makeRec272(2), makeRec272(3), makeRec272(4),
        makeRec272(5, { seededClueIds: ['clue-a'] }),
        makeRec272(6, { clockRaised: true }),
        makeRec272(7, { seededClueIds: ['clue-b'] }),
      ];
      const result272d = await intentionPass(makeInput272(records272d));
      const ls = result272d.issues.filter((i: any) => i.rule === 'PROACTIVE_LATE_SURGE');
      assert.strictEqual(ls.length, 0, 'Should NOT fire when a proactive act appears in the first half');
    });

    it('PAYOFF_WITHOUT_EFFORT fires when no payoff is preceded by a proactive act within 3 scenes', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 8 scenes; proactive at 0 only; payoffs at 5 and 7 (proactive at 0 is >3 scenes away from both)
      // payoff at 5: k ranges max(0,5-3)=2 to 5 → scenes 2,3,4,5 all non-proactive → not earned
      // payoff at 7: k ranges max(0,7-3)=4 to 7 → scenes 4,5,6,7 all non-proactive → not earned
      const records272e = [
        makeRec272(0, { clockRaised: true }),
        makeRec272(1), makeRec272(2), makeRec272(3), makeRec272(4),
        makeRec272(5, { payoffSetupIds: ['setup-a'] }),
        makeRec272(6),
        makeRec272(7, { payoffSetupIds: ['setup-b'] }),
      ];
      const result272e = await intentionPass(makeInput272(records272e));
      const pwe = result272e.issues.filter((i: any) => i.rule === 'PAYOFF_WITHOUT_EFFORT');
      assert.ok(pwe.length >= 1, `Should detect PAYOFF_WITHOUT_EFFORT, got: ${JSON.stringify(result272e.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(pwe[0].severity, 'minor');
    });

    it('PAYOFF_WITHOUT_EFFORT does NOT fire when at least one payoff is preceded by a proactive act', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 6 scenes; payoff at 4; proactive at 2 (within 3 scenes: k=2,3,4) → earned
      const records272f = [
        makeRec272(0), makeRec272(1),
        makeRec272(2, { clockRaised: true }),
        makeRec272(3),
        makeRec272(4, { payoffSetupIds: ['setup-a'] }),
        makeRec272(5, { payoffSetupIds: ['setup-b'] }),
      ];
      const result272f = await intentionPass(makeInput272(records272f));
      const pwe = result272f.issues.filter((i: any) => i.rule === 'PAYOFF_WITHOUT_EFFORT');
      assert.strictEqual(pwe.length, 0, 'Should NOT fire when at least one payoff is preceded by a proactive act');
    });
  });


  describe('Wave 258 — intentionPass: proactive midpoint void, proactive desert run, revelation without proactive', async () => {
    const makeRec258 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput258 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: '...',
      records: records as any, structure: {} as any,
      storyContext: {} as any, annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('PROACTIVE_MIDPOINT_VOID fires when the midpoint zone has no proactive act', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 10 records; midpoint = scenes 4-5 (floor(10*0.4)=4 .. floor(10*0.6)=6); proactive only at 0,8
      const records258a = Array.from({ length: 10 }, (_, i) => makeRec258(i, {
        clockRaised: i === 0 || i === 8,
      }));
      const result258a = await intentionPass(makeInput258(records258a));
      const voidIss = result258a.issues.filter((i: any) => i.rule === 'PROACTIVE_MIDPOINT_VOID');
      assert.ok(voidIss.length >= 1, `Should detect PROACTIVE_MIDPOINT_VOID, got: ${JSON.stringify(result258a.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(voidIss[0].severity, 'minor');
    });

    it('PROACTIVE_MIDPOINT_VOID does NOT fire when the midpoint has a proactive act', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      const records258b = Array.from({ length: 10 }, (_, i) => makeRec258(i, {
        clockRaised: i === 0 || i === 4 || i === 8,
      }));
      const result258b = await intentionPass(makeInput258(records258b));
      const voidIss = result258b.issues.filter((i: any) => i.rule === 'PROACTIVE_MIDPOINT_VOID');
      assert.strictEqual(voidIss.length, 0, 'Should NOT fire when the midpoint has a proactive act');
    });

    it('PROACTIVE_DESERT_RUN fires when 4+ consecutive scenes are passive in an active story', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 8 records; proactive at 0,7; scenes 1-6 passive (6-run > 4)
      const records258c = Array.from({ length: 8 }, (_, i) => makeRec258(i, {
        seededClueIds: (i === 0 || i === 7) ? ['c'] : [],
      }));
      const result258c = await intentionPass(makeInput258(records258c));
      const desert = result258c.issues.filter((i: any) => i.rule === 'PROACTIVE_DESERT_RUN');
      assert.ok(desert.length >= 1, `Should detect PROACTIVE_DESERT_RUN, got: ${JSON.stringify(result258c.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(desert[0].severity, 'minor');
    });

    it('PROACTIVE_DESERT_RUN does NOT fire when the protagonist initiates regularly', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 8 records; proactive every 3rd scene → no run of 4 passive
      const records258d = Array.from({ length: 8 }, (_, i) => makeRec258(i, {
        seededClueIds: (i % 3 === 0) ? ['c'] : [],
      }));
      const result258d = await intentionPass(makeInput258(records258d));
      const desert = result258d.issues.filter((i: any) => i.rule === 'PROACTIVE_DESERT_RUN');
      assert.strictEqual(desert.length, 0, 'Should NOT fire when there is no 4-scene passive run');
    });

    it('REVELATION_WITHOUT_PROACTIVE fires when no revelation is preceded by initiative', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 8 records; revelations at 5,7; proactive only at scene 0 (far from any revelation window)
      const records258e = [
        makeRec258(0, { clockRaised: true }),
        makeRec258(1), makeRec258(2), makeRec258(3), makeRec258(4),
        makeRec258(5, { revelation: 'the truth' }),
        makeRec258(6),
        makeRec258(7, { revelation: 'another truth' }),
      ];
      const result258e = await intentionPass(makeInput258(records258e));
      const unearned = result258e.issues.filter((i: any) => i.rule === 'REVELATION_WITHOUT_PROACTIVE');
      assert.ok(unearned.length >= 1, `Should detect REVELATION_WITHOUT_PROACTIVE, got: ${JSON.stringify(result258e.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(unearned[0].severity, 'minor');
    });

    it('REVELATION_WITHOUT_PROACTIVE does NOT fire when a revelation is earned by initiative', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // revelation at scene 5 preceded by proactive act at scene 4 (within 2 scenes)
      const records258f = [
        makeRec258(0), makeRec258(1), makeRec258(2), makeRec258(3),
        makeRec258(4, { seededClueIds: ['lead'] }),
        makeRec258(5, { revelation: 'the truth' }),
        makeRec258(6),
        makeRec258(7, { revelation: 'another truth' }),
      ];
      const result258f = await intentionPass(makeInput258(records258f));
      const unearned = result258f.issues.filter((i: any) => i.rule === 'REVELATION_WITHOUT_PROACTIVE');
      assert.strictEqual(unearned.length, 0, 'Should NOT fire when at least one revelation is preceded by a proactive act');
    });
  });


  describe('Wave 244 — intentionPass: proactive Act 3 void, intention discovery absent, goal pivot absent', async () => {
    const makeRec244 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput244 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: '...',
      records: records as any, structure: {} as any,
      storyContext: {} as any,
      annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('PROACTIVE_ACT3_VOID fires when Act 3 contains no proactive acts', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 8 records; Act3 = scenes 6-7; scenes 0-3 have proactive acts; 6,7 do not
      const records244a = Array.from({ length: 8 }, (_, i) => makeRec244(i, {
        clockRaised: i < 4 ? true : false,
        seededClueIds: [],
      }));
      const result = await intentionPass(makeInput244(records244a));
      assert.ok(result.issues.some((i: any) => i.rule === 'PROACTIVE_ACT3_VOID'), `Expected PROACTIVE_ACT3_VOID, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('PROACTIVE_ACT3_VOID does NOT fire when Act 3 has at least one proactive act', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // Scene 6 (Act 3) raises a clock
      const records244b = Array.from({ length: 8 }, (_, i) => makeRec244(i, { clockRaised: i === 6 }));
      const result = await intentionPass(makeInput244(records244b));
      assert.ok(!result.issues.some((i: any) => i.rule === 'PROACTIVE_ACT3_VOID'), 'Should NOT fire when Act 3 has a proactive act');
    });

    it('INTENTION_DISCOVERY_ABSENT fires when protagonist is proactive but Act 3 has no revelation', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 8 records; 3 proactive acts; no revelation in Act 3 (scenes 6-7)
      const records244c = Array.from({ length: 8 }, (_, i) => makeRec244(i, {
        clockRaised: i < 3,
        revelation: i === 2 ? 'the letter was forged' : null,
      }));
      const result = await intentionPass(makeInput244(records244c));
      assert.ok(result.issues.some((i: any) => i.rule === 'INTENTION_DISCOVERY_ABSENT'), `Expected INTENTION_DISCOVERY_ABSENT, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('INTENTION_DISCOVERY_ABSENT does NOT fire when Act 3 contains a revelation', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 3 proactive acts AND revelation in Act 3 (scene 6)
      const records244d = Array.from({ length: 8 }, (_, i) => makeRec244(i, {
        clockRaised: i < 3,
        revelation: i === 6 ? 'the answer was here all along' : null,
      }));
      const result = await intentionPass(makeInput244(records244d));
      assert.ok(!result.issues.some((i: any) => i.rule === 'INTENTION_DISCOVERY_ABSENT'), 'Should NOT fire when Act 3 has a revelation');
    });

    it('GOAL_PIVOT_ABSENT fires when all 4+ proactive acts use only one modality', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 10 records; 4 proactive acts all clockRaised=true, none with seededClueIds
      const records244e = Array.from({ length: 10 }, (_, i) => makeRec244(i, {
        clockRaised: i < 4,
        seededClueIds: [],
      }));
      const result = await intentionPass(makeInput244(records244e));
      assert.ok(result.issues.some((i: any) => i.rule === 'GOAL_PIVOT_ABSENT'), `Expected GOAL_PIVOT_ABSENT, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('GOAL_PIVOT_ABSENT does NOT fire when proactive acts mix both modalities', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 10 records; 4 proactive acts: 2 clock-raising, 2 clue-planting
      const records244f = Array.from({ length: 10 }, (_, i) => makeRec244(i, {
        clockRaised: i === 1 || i === 3,
        seededClueIds: i === 5 || i === 7 ? ['clue-x'] : [],
      }));
      const result = await intentionPass(makeInput244(records244f));
      assert.ok(!result.issues.some((i: any) => i.rule === 'GOAL_PIVOT_ABSENT'), 'Should NOT fire when both modalities are used');
    });
  });


  describe('Wave 216 — intentionPass: agency entropy collapse, agency without consequence, commitment ramp inversion (agency physics)', async () => {
    const makeRec216 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput216 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: 'INT. SC - DAY\nAction line.\n',
      records: records as any, structure: {} as any,
      storyContext: {} as any, annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('AGENCY_ENTROPY_COLLAPSE fires when one character carries nearly all tracked intention', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 10 intention-bearing lines: 9 alice, 1 bob → normalised entropy ≈ 0.47 < 0.5
      const records = Array.from({ length: 10 }, (_, i) =>
        makeRec216(i, { dialogueHighlights: [`${i === 9 ? 'bob' : 'alice'}: pursues a hidden goal`] }),
      );
      const result = await intentionPass(makeInput216(records));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'AGENCY_ENTROPY_COLLAPSE'),
        'Should fire when normalised agency entropy falls below 0.5',
      );
    });

    it('AGENCY_ENTROPY_COLLAPSE does not fire when intention is shared across characters', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 10 lines: 5 alice, 5 bob → normalised entropy 1.0
      const records = Array.from({ length: 10 }, (_, i) =>
        makeRec216(i, { dialogueHighlights: [`${i % 2 === 0 ? 'alice' : 'bob'}: pursues a hidden goal`] }),
      );
      const result = await intentionPass(makeInput216(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'AGENCY_ENTROPY_COLLAPSE'),
        'Should NOT fire when agency is distributed evenly across characters',
      );
    });

    it('AGENCY_WITHOUT_CONSEQUENCE fires when proactive beats produce no downstream effect', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 3 proactive scenes (seed clues at 1,3,5) never paid off; all scenes inert afterward
      const records = Array.from({ length: 10 }, (_, i) => makeRec216(i));
      records[1].seededClueIds = ['a'];
      records[3].seededClueIds = ['b'];
      records[5].seededClueIds = ['c'];
      const result = await intentionPass(makeInput216(records));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'AGENCY_WITHOUT_CONSEQUENCE'),
        'Should fire when 75%+ of proactive beats have no payoff and no downstream movement',
      );
    });

    it('AGENCY_WITHOUT_CONSEQUENCE does not fire when proactive beats land', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // Each proactive beat is answered: scene2 suspense rise, scene4 rel shift, scene6 revelation
      const records = Array.from({ length: 10 }, (_, i) => makeRec216(i));
      records[1].seededClueIds = ['a'];
      records[3].seededClueIds = ['b'];
      records[5].seededClueIds = ['c'];
      records[2].suspenseDelta = 2;
      records[4].relationshipShifts = [{ pairKey: 'alice|bob', dimension: 'trust', amount: -0.4 }];
      records[6].revelation = 'the consequence of the planted clue surfaces';
      const result = await intentionPass(makeInput216(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'AGENCY_WITHOUT_CONSEQUENCE'),
        'Should NOT fire when proactive beats are answered by downstream consequence',
      );
    });

    it('COMMITMENT_RAMP_INVERSION fires when proactive density decays toward the climax', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // n=12, thirds=4; opening third 3 proactive (density 0.75), final third 1 (density 0.25)
      const records = Array.from({ length: 12 }, (_, i) => makeRec216(i));
      records[0].seededClueIds = ['p0'];
      records[1].seededClueIds = ['p1'];
      records[2].seededClueIds = ['p2'];
      records[8].seededClueIds = ['p8'];
      const result = await intentionPass(makeInput216(records));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'COMMITMENT_RAMP_INVERSION'),
        'Should fire when final-third proactive density is below half the opening-third density',
      );
    });

    it('COMMITMENT_RAMP_INVERSION does not fire when proactive density rises toward the climax', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // Rising commitment: opening third 1 proactive (0.25), final third 3 (0.75)
      const records = Array.from({ length: 12 }, (_, i) => makeRec216(i));
      records[0].seededClueIds = ['p0'];
      records[9].seededClueIds = ['p9'];
      records[10].seededClueIds = ['p10'];
      records[11].seededClueIds = ['p11'];
      const result = await intentionPass(makeInput216(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'COMMITMENT_RAMP_INVERSION'),
        'Should NOT fire when the protagonist intensifies initiative toward the climax',
      );
    });
  });


  describe('Wave 205 — intentionPass: proactive opening absent, agency frontloaded, stakes never personal', async () => {
    const makeRec205 = (idx: number, override: Partial<any> = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'dialogue', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
      ...override,
    });
    const blankFountain205 = (n: number) =>
      Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join('');
    const intentInput205 = (records: any[]) => ({
      fountain: blankFountain205(records.length), original: blankFountain205(records.length),
      records: records as any, structure: {} as any,
      annotations: Array.from({ length: records.length }, () => ({ revelation: false } as any)),
      approvedSpans: [],
    });

    // ── PROACTIVE_OPENING_ABSENT ──────────────────────────────────────────────
    it('intentionPass detects PROACTIVE_OPENING_ABSENT when Act 1 has no proactive scenes', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // n=8, act1=[0,1]; both non-proactive. Later scenes proactive to avoid all-passive cross-checks.
      const records = Array.from({ length: 8 }, (_, i) =>
        (i === 4 || i === 6)
          ? makeRec205(i, { clockRaised: true })
          : makeRec205(i),
      );
      const result = await intentionPass(intentInput205(records));
      const issues = result.issues.filter(i => i.rule === 'PROACTIVE_OPENING_ABSENT');
      assert.ok(issues.length >= 1, `Should detect PROACTIVE_OPENING_ABSENT; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(issues[0].severity === 'major');
    });

    it('intentionPass does NOT fire PROACTIVE_OPENING_ABSENT when Act 1 has a proactive scene', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // n=8, scene 0 proactive (clockRaised) → act1 has agency
      const records = Array.from({ length: 8 }, (_, i) =>
        (i === 0 || i === 4 || i === 6)
          ? makeRec205(i, { clockRaised: true })
          : makeRec205(i),
      );
      const result = await intentionPass(intentInput205(records));
      assert.ok(
        !result.issues.some(i => i.rule === 'PROACTIVE_OPENING_ABSENT'),
        'Should NOT fire when Act 1 contains a proactive scene',
      );
    });

    // ── AGENCY_FRONTLOADED ────────────────────────────────────────────────────
    it('intentionPass detects AGENCY_FRONTLOADED when proactive scenes vanish in the second half', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // n=8, half=4. Scenes 1,2 proactive (first half); scenes 4-7 none.
      const records = Array.from({ length: 8 }, (_, i) =>
        (i === 1 || i === 2)
          ? makeRec205(i, { clockRaised: true })
          : makeRec205(i),
      );
      const result = await intentionPass(intentInput205(records));
      const issues = result.issues.filter(i => i.rule === 'AGENCY_FRONTLOADED');
      assert.ok(issues.length >= 1, `Should detect AGENCY_FRONTLOADED; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(issues[0].severity === 'minor');
    });

    it('intentionPass does NOT fire AGENCY_FRONTLOADED when proactive action continues in second half', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // n=8, proactive at 1,2 (first half) AND 5 (second half)
      const records = Array.from({ length: 8 }, (_, i) =>
        (i === 1 || i === 2 || i === 5)
          ? makeRec205(i, { clockRaised: true })
          : makeRec205(i),
      );
      const result = await intentionPass(intentInput205(records));
      assert.ok(
        !result.issues.some(i => i.rule === 'AGENCY_FRONTLOADED'),
        'Should NOT fire when the second half contains a proactive scene',
      );
    });

    // ── STAKES_NEVER_PERSONAL ─────────────────────────────────────────────────
    it('intentionPass detects STAKES_NEVER_PERSONAL when the clock never pairs with emotion or relationship', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // n=6, scene 2 raises a clock but stays emotionally neutral with no rel shift
      const records = Array.from({ length: 6 }, (_, i) =>
        i === 2 ? makeRec205(i, { clockRaised: true, emotionalShift: 'neutral' }) : makeRec205(i),
      );
      const result = await intentionPass(intentInput205(records));
      const issues = result.issues.filter(i => i.rule === 'STAKES_NEVER_PERSONAL');
      assert.ok(issues.length >= 1, `Should detect STAKES_NEVER_PERSONAL; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(issues[0].severity === 'minor');
    });

    it('intentionPass does NOT fire STAKES_NEVER_PERSONAL when a clock scene carries emotional weight', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // n=6, scene 2 raises a clock AND shifts emotion → stakes become personal
      const records = Array.from({ length: 6 }, (_, i) =>
        i === 2 ? makeRec205(i, { clockRaised: true, emotionalShift: 'negative' }) : makeRec205(i),
      );
      const result = await intentionPass(intentInput205(records));
      assert.ok(
        !result.issues.some(i => i.rule === 'STAKES_NEVER_PERSONAL'),
        'Should NOT fire when a clock-raising scene carries emotional weight',
      );
    });
  });


  describe('Wave 156 — intentionPass: reactive dominance, intention dropout, want/fear collision', async () => {
    const makeRec = (idx: number, override: Partial<any> = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'dialogue', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
      ...override,
    });
    const blankFountain = (n: number) =>
      Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join('');
    const noAnnotations = (n: number) => Array.from({ length: n }, () => ({ revelation: false } as any));

    it('intentionPass detects PROTAGONIST_REACTIVE_DOMINANCE when Act 2 is all reactive', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 8 scenes: Act 2 = scenes 2-5. All high suspense, none proactive.
      const records = Array.from({ length: 8 }, (_, i) =>
        i >= 2 && i <= 5
          ? makeRec(i, { suspenseDelta: 2.5 }) // high stakes, no clockRaised, no seededClueIds
          : makeRec(i),
      );
      const result = await intentionPass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(8), approvedSpans: [],
      });
      const reactive = result.issues.filter(i => i.rule === 'PROTAGONIST_REACTIVE_DOMINANCE');
      assert.ok(reactive.length >= 1, `Should detect PROTAGONIST_REACTIVE_DOMINANCE; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(reactive[0].severity === 'major');
    });

    it('intentionPass does NOT fire PROTAGONIST_REACTIVE_DOMINANCE when protagonist initiates in Act 2', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      const records = Array.from({ length: 8 }, (_, i) =>
        i >= 2 && i <= 5
          ? makeRec(i, { suspenseDelta: 2.5, ...(i === 3 ? { clockRaised: true } : {}) })
          : makeRec(i),
      );
      const result = await intentionPass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(8), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'PROTAGONIST_REACTIVE_DOMINANCE'),
        'Should NOT fire when protagonist raises a clock in Act 2',
      );
    });

    it('intentionPass detects INTENTION_DROPOUT for Act 1 character who vanishes', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 8 scenes: alice in scenes 0 and 1 (Act 1 = first 30% = scenes 0-1), absent from scenes 4-7
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, {
          dialogueHighlights: i === 0
            ? ['alice: wants to escape the city']
            : i === 1
            ? ['alice: is terrified of what she saw']
            : [],
        }),
      );
      const result = await intentionPass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(8), approvedSpans: [],
      });
      const dropout = result.issues.filter(i => i.rule === 'INTENTION_DROPOUT');
      assert.ok(dropout.length >= 1, `Should detect INTENTION_DROPOUT; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(dropout[0].severity === 'major');
    });

    it('intentionPass does NOT fire INTENTION_DROPOUT when Act 1 character reappears', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, {
          dialogueHighlights: i === 0
            ? ['alice: wants to escape the city']
            : i === 1
            ? ['alice: is terrified of what she saw']
            : i === 5
            ? ['alice: confronts her past'] // reappears after midpoint
            : [],
        }),
      );
      const result = await intentionPass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(8), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'INTENTION_DROPOUT'),
        'Should NOT fire when Act 1 character reappears in the second half',
      );
    });

    it('intentionPass detects WANT_FEAR_COLLISION_ABSENT when wants and fears never intersect', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      // 6 scenes. Relationship shifts exist, but never paired with opposite emotional shift.
      const records = [
        makeRec(0),
        makeRec(1, {
          emotionalShift: 'positive',
          relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.5 }],
        }), // both positive — no collision
        makeRec(2, {
          emotionalShift: 'negative',
          relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: -0.5 }],
        }), // both negative — no collision
        makeRec(3),
        makeRec(4),
        makeRec(5),
      ];
      const result = await intentionPass({
        fountain: blankFountain(6), original: blankFountain(6),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(6), approvedSpans: [],
      });
      const collision = result.issues.filter(i => i.rule === 'WANT_FEAR_COLLISION_ABSENT');
      assert.ok(collision.length >= 1, `Should detect WANT_FEAR_COLLISION_ABSENT; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(collision[0].severity === 'major');
    });

    it('intentionPass does NOT fire WANT_FEAR_COLLISION_ABSENT when a want/fear collision exists', async () => {
      const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
      const records = [
        makeRec(0),
        makeRec(1, {
          emotionalShift: 'positive', // protagonist wins emotionally...
          relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: -0.6 }], // ...but damages relationship
        }),
        makeRec(2),
        makeRec(3),
        makeRec(4),
        makeRec(5),
      ];
      const result = await intentionPass({
        fountain: blankFountain(6), original: blankFountain(6),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(6), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'WANT_FEAR_COLLISION_ABSENT'),
        'Should NOT fire when a want/fear collision scene exists',
      );
    });
  });


describe('Wave 130 — Intention pass expanded boring purposes', () => {

  it('flags REPEATED_PURPOSE for 3 consecutive character_moment scenes', async () => {
    const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
    const records: ScreenplaySceneRecord[] = Array.from({ length: 4 }, (_, i) =>
      makeSceneRecord({
        sceneIdx: i, slug: `INT. ROOM ${i}`,
        purpose: i < 3 ? 'character_moment' : 'climax',
      }));
    const input = makeMinimalInput({ records });
    const result = await intentionPass(input);
    assert.ok(
      result.issues.some(i => i.rule === 'REPEATED_PURPOSE'),
      'character_moment (low-momentum purpose) should be flagged',
    );
  });

  it('still flags 3 consecutive establish_world scenes', async () => {
    const { intentionPass } = await import('../../server/nvm/revision/passes/intention.ts');
    const records: ScreenplaySceneRecord[] = Array.from({ length: 3 }, (_, i) =>
      makeSceneRecord({ sceneIdx: i, slug: `INT. ROOM ${i}`, purpose: 'establish_world' }));
    const input = makeMinimalInput({ records });
    const result = await intentionPass(input);
    assert.ok(
      result.issues.some(i => i.rule === 'REPEATED_PURPOSE'),
      'establish_world still flagged as low-momentum',
    );
  });

});