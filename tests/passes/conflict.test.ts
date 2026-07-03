// Extracted from the former monolithic test.ts (audit M2.1 — split for maintainability).
// conflictPass revision-rule tests. Shared imports/helpers below are duplicated verbatim across every split
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


  // ── conflict CLOCK_WITHOUT_CONFRONTATION uses magnitude ───────────────────

  it('conflictPass does NOT fire CLOCK_WITHOUT_CONFRONTATION for minor clock raises (delta <= 1)', async () => {
    const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
    const makeStructureC = () => ({
      actPosition: 'act2a' as const, completionPercent: 40, totalClockPressure: 10,
      midpointPressure: 5, reversalCount: 0, tightestScene: null,
      avgSuspensePerScene: 3, escalating: true, reversalDensity: 0,
      approachingClimax: false, openClues: 0, revelationCount: 0,
    });
    // Three scenes each with clockDelta = 0.5 (minor raises) and no reversals
    const records = Array.from({ length: 6 }, (_, i) =>
      makeRecord79({ sceneIdx: i, clockRaised: true, clockDelta: 0.5 }),
    );
    const stub = {
      fountain: Array.from({ length: 6 }, (_, i) => `INT. SCENE${i} - DAY\n\nAction.`).join('\n\n'),
      original: '', annotations: [], approvedSpans: [],
      structure: makeStructureC(),
      records,
    };
    const result = await conflictPass(stub as import('../../server/nvm/revision/passes/types.ts').PassInput);
    assert.ok(!result.issues.some(i => i.rule === 'CLOCK_WITHOUT_CONFRONTATION'),
      'Should NOT fire when clock raises are minor (delta <= 1)');
  });


  it('conflictPass fires CLOCK_WITHOUT_CONFRONTATION for significant clock raises (delta > 1)', async () => {
    const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
    const makeStructureC = () => ({
      actPosition: 'act2b' as const, completionPercent: 60, totalClockPressure: 20,
      midpointPressure: 8, reversalCount: 0, tightestScene: null,
      avgSuspensePerScene: 3, escalating: true, reversalDensity: 0,
      approachingClimax: false, openClues: 0, revelationCount: 0,
    });
    const records = Array.from({ length: 6 }, (_, i) =>
      makeRecord79({ sceneIdx: i, clockRaised: true, clockDelta: 3 }),
    );
    const stub = {
      fountain: Array.from({ length: 6 }, (_, i) => `INT. SCENE${i} - DAY\n\nAction.`).join('\n\n'),
      original: '', annotations: [], approvedSpans: [],
      structure: makeStructureC(),
      records,
    };
    const result = await conflictPass(stub as import('../../server/nvm/revision/passes/types.ts').PassInput);
    assert.ok(result.issues.some(i => i.rule === 'CLOCK_WITHOUT_CONFRONTATION'),
      'Should fire when multiple significant clock raises have no reversal');
  });


  // ── Wave 144 additions: escalation & confrontation quality ──────────────────

  it('conflictPass detects ESCALATION_PLATEAU when suspense peaks mid-story then drops', async () => {
    const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
    const makeRec = (idx: number, suspense: number): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `SC${idx}`, purpose: 'dialogue',
      dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
      emotionalShift: 'neutral', suspenseDelta: suspense,
      dialogueHighlights: [], unresolvedClues: [],
      seededClueIds: [], payoffSetupIds: [],
      readerStateAnnotation: null,
      relationshipShifts: [],
    });
    const records = [
      makeRec(0, 1), makeRec(1, 1.5), makeRec(2, 2), makeRec(3, 3.5), // first half peaks at 3.5
      makeRec(4, 2), makeRec(5, 1.5), makeRec(6, 1), makeRec(7, 0.8), // second half averages ~1.3
    ];
    const result = await conflictPass({
      fountain: Array.from({ length: 8 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
      original: Array.from({ length: 8 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
      records: records as unknown as Parameters<typeof conflictPass>[0]['records'],
      structure: { actPosition: 'act2b' as const, completionPercent: 60, totalClockPressure: 10, midpointPressure: 3, reversalCount: 0, tightestScene: 3, avgSuspensePerScene: 1.5, escalating: false, reversalDensity: 0, approachingClimax: false, openClues: 0, revelationCount: 0 } as unknown as Parameters<typeof conflictPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const plateau = result.issues.filter(i => i.rule === 'ESCALATION_PLATEAU');
    assert.ok(plateau.length >= 1, 'Should detect ESCALATION_PLATEAU for suspense peak mid-story');
    assert.ok(plateau[0].severity === 'major');
  });


  it('conflictPass detects CONFRONTATION_AVOIDANCE when conflict exists but no direct scene', async () => {
    const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
    const makeRec = (idx: number, hasShift: boolean, hasDialogue: boolean): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `SC${idx}`, purpose: 'dialogue',
      dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
      emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: hasDialogue ? ['alice: hello'] : [],
      unresolvedClues: [],
      seededClueIds: [], payoffSetupIds: [],
      readerStateAnnotation: null,
      relationshipShifts: hasShift ? [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -1.5 }] : [],
    });
    const records = [
      makeRec(0, false, true),
      makeRec(1, true, false), // conflict without dialogue
      makeRec(2, true, false), // conflict without dialogue
      makeRec(3, false, true),
      makeRec(4, false, true),
    ];
    const result = await conflictPass({
      fountain: Array.from({ length: 5 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
      original: Array.from({ length: 5 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
      records: records as unknown as Parameters<typeof conflictPass>[0]['records'],
      structure: { actPosition: 'act2b' as const, completionPercent: 60, totalClockPressure: 5, midpointPressure: 2, reversalCount: 0, tightestScene: 1, avgSuspensePerScene: 1, escalating: false, reversalDensity: 0, approachingClimax: false, openClues: 0, revelationCount: 0 } as unknown as Parameters<typeof conflictPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const avoid = result.issues.filter(i => i.rule === 'CONFRONTATION_AVOIDANCE');
    assert.ok(avoid.length >= 1, 'Should detect CONFRONTATION_AVOIDANCE when conflict lacks direct scene');
    assert.ok(avoid[0].severity === 'major');
  });


  it('conflictPass detects CONFLICT_FATIGUE for 3 reversals in quick succession', async () => {
    const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
    const makeRec = (idx: number, suspense: number): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `SC${idx}`, purpose: 'dialogue',
      dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
      emotionalShift: 'neutral', suspenseDelta: suspense,
      dialogueHighlights: [], unresolvedClues: [],
      seededClueIds: [], payoffSetupIds: [],
      readerStateAnnotation: null,
      relationshipShifts: [],
    });
    const records = [
      makeRec(0, 2), makeRec(1, 2.5),
      makeRec(2, -1.5), // reversal
      makeRec(3, -1.2), // reversal
      makeRec(4, -1.5), // reversal (3rd → fires)
      makeRec(5, 1.5), makeRec(6, 1.5),
      makeRec(7, 2), makeRec(8, 2),
    ];
    const result = await conflictPass({
      fountain: Array.from({ length: 9 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
      original: Array.from({ length: 9 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
      records: records as unknown as Parameters<typeof conflictPass>[0]['records'],
      structure: { actPosition: 'act2b' as const, completionPercent: 60, totalClockPressure: 10, midpointPressure: 3, reversalCount: 3, tightestScene: 4, avgSuspensePerScene: 1.5, escalating: false, reversalDensity: 0.33, approachingClimax: false, openClues: 1, revelationCount: 0 } as unknown as Parameters<typeof conflictPass>[0]['structure'],
      annotations: [],
      approvedSpans: [],
    });
    const fatigue = result.issues.filter(i => i.rule === 'CONFLICT_FATIGUE');
    assert.ok(fatigue.length >= 1, 'Should detect CONFLICT_FATIGUE for 3 quick reversals');
    assert.ok(fatigue[0].severity === 'minor');
  });


  // ── Wave 169: Conflict pass enhancements ──────────────────────────────────
  describe('Wave 169 — conflictPass: deadline absence, low-stakes conflict, interpersonal peak timing', async () => {
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
    const baseStructure = {
      completionPercent: 50, actPosition: 'act2a' as const,
      escalating: true, avgSuspensePerScene: 1, openClues: 0,
      reversalDensity: 1, approachingClimax: false,
    };

    // ── CONFLICT_WITHOUT_DEADLINE ─────────────────────────────────────────────
    it('conflictPass detects CONFLICT_WITHOUT_DEADLINE when 5+ conflicts but no clock raised', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // 6 records; 5 have negative relationship shifts (conflict scenes); none have clockRaised
      const records = Array.from({ length: 6 }, (_, i) =>
        makeRec(i, {
          relationshipShifts: i < 5
            ? [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -0.5 }]
            : [],
          clockRaised: false,
        }),
      );
      const result = await conflictPass({
        fountain: blankFountain(6), original: blankFountain(6),
        records: records as any, structure: baseStructure as any,
        annotations: [], approvedSpans: [],
      });
      const deadline = result.issues.filter(i => i.rule === 'CONFLICT_WITHOUT_DEADLINE');
      assert.ok(deadline.length >= 1, `Expected CONFLICT_WITHOUT_DEADLINE; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(deadline[0].severity === 'minor');
    });

    it('conflictPass does NOT fire CONFLICT_WITHOUT_DEADLINE when at least one clock is raised', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      const records = Array.from({ length: 6 }, (_, i) =>
        makeRec(i, {
          relationshipShifts: i < 5
            ? [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -0.5 }]
            : [],
          clockRaised: i === 2,  // one clock raised
        }),
      );
      const result = await conflictPass({
        fountain: blankFountain(6), original: blankFountain(6),
        records: records as any, structure: baseStructure as any,
        annotations: [], approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'CONFLICT_WITHOUT_DEADLINE'),
        'Should NOT fire when at least one scene raises a clock',
      );
    });

    // ── LOW_STAKES_CONFLICT ───────────────────────────────────────────────────
    it('conflictPass detects LOW_STAKES_CONFLICT when all shift magnitudes are below 0.4', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // All 4 shifts have small magnitudes (< 0.4)
      const records = [
        makeRec(0, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.1 }] }),
        makeRec(1, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -0.2 }] }),
        makeRec(2, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.15 }] }),
        makeRec(3, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -0.3 }] }),
        makeRec(4), makeRec(5),
      ];
      const result = await conflictPass({
        fountain: blankFountain(6), original: blankFountain(6),
        records: records as any, structure: baseStructure as any,
        annotations: [], approvedSpans: [],
      });
      const low = result.issues.filter(i => i.rule === 'LOW_STAKES_CONFLICT');
      assert.ok(low.length >= 1, `Expected LOW_STAKES_CONFLICT; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(low[0].severity === 'major');
    });

    it('conflictPass does NOT fire LOW_STAKES_CONFLICT when at least one shift has high magnitude', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      const records = [
        makeRec(0, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.1 }] }),
        makeRec(1, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -0.6 }] }),  // high magnitude
        makeRec(2, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.15 }] }),
        makeRec(3, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -0.2 }] }),
        makeRec(4), makeRec(5),
      ];
      const result = await conflictPass({
        fountain: blankFountain(6), original: blankFountain(6),
        records: records as any, structure: baseStructure as any,
        annotations: [], approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'LOW_STAKES_CONFLICT'),
        'Should NOT fire when at least one shift has magnitude ≥ 0.4',
      );
    });

    // ── INTERPERSONAL_PEAK_TOO_EARLY ──────────────────────────────────────────
    it('conflictPass detects INTERPERSONAL_PEAK_TOO_EARLY when worst shift occurs before 60%', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // 8 scenes; climaxZone = floor(8*0.6) = 4; worst shift at scene 1 (before 4)
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, {
          relationshipShifts: i === 1
            ? [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -0.8 }]  // peak early
            : i === 5
            ? [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -0.3 }]
            : i === 6
            ? [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -0.3 }]
            : [],
        }),
      );
      const result = await conflictPass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: baseStructure as any,
        annotations: [], approvedSpans: [],
      });
      const peak = result.issues.filter(i => i.rule === 'INTERPERSONAL_PEAK_TOO_EARLY');
      assert.ok(peak.length >= 1, `Expected INTERPERSONAL_PEAK_TOO_EARLY; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(peak[0].severity === 'major');
    });

    it('conflictPass does NOT fire INTERPERSONAL_PEAK_TOO_EARLY when worst shift is in the climax zone', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // 8 scenes; worst shift at scene 5 (>= climaxZone 4)
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, {
          relationshipShifts: i === 1
            ? [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -0.3 }]
            : i === 5
            ? [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -0.8 }]  // peak late
            : i === 6
            ? [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -0.4 }]
            : [],
        }),
      );
      const result = await conflictPass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: baseStructure as any,
        annotations: [], approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'INTERPERSONAL_PEAK_TOO_EARLY'),
        'Should NOT fire when the worst relationship shift is in or near the climax zone',
      );
    });
  });


  describe('Wave 183 — conflictPass: reversal vacuum, Act 1 conflict absent, convergence absent', async () => {
    const makeRec = (idx: number, override: Partial<any> = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'dialogue', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
      ...override,
    });
    const baseStructure = {
      escalating: true, reversalDensity: 0.1, openClues: 0, completionPercent: 50,
      avgSuspensePerScene: 1, approachingClimax: false, actPosition: 'act2a' as const,
      midpointPressure: 2, tightestScene: null, reversalCount: 1,
    };

    // REVERSAL_WITHOUT_CONSEQUENCE — fires
    it('REVERSAL_WITHOUT_CONSEQUENCE fires when reversal is followed by two flat scenes', async () => {
      const records = [
        makeRec(0), makeRec(1), makeRec(2),
        makeRec(3, { suspenseDelta: -2 }), // reversal
        makeRec(4), // flat aftermath
        makeRec(5), // flat aftermath
        makeRec(6), makeRec(7),
      ];
      const original = records.map((_, i) => `INT. SC${i} - DAY\nA.\n`).join('');
      const result = await conflictPass({ fountain: original, records, original, structure: baseStructure as any, annotations: [], approvedSpans: [] });
      assert.ok(
        result.issues.some(i => i.rule === 'REVERSAL_WITHOUT_CONSEQUENCE'),
        `Expected REVERSAL_WITHOUT_CONSEQUENCE, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // REVERSAL_WITHOUT_CONSEQUENCE — no-fire
    it('REVERSAL_WITHOUT_CONSEQUENCE does not fire when reversal triggers an emotional reaction', async () => {
      const records = [
        makeRec(0), makeRec(1), makeRec(2),
        makeRec(3, { suspenseDelta: -2 }), // reversal
        makeRec(4, { emotionalShift: 'negative' }), // reaction — not flat
        makeRec(5), makeRec(6), makeRec(7),
      ];
      const original = records.map((_, i) => `INT. SC${i} - DAY\nA.\n`).join('');
      const result = await conflictPass({ fountain: original, records, original, structure: baseStructure as any, annotations: [], approvedSpans: [] });
      assert.ok(
        !result.issues.some(i => i.rule === 'REVERSAL_WITHOUT_CONSEQUENCE'),
        `Expected no REVERSAL_WITHOUT_CONSEQUENCE, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // CONFLICT_ACT1_ABSENT — fires
    it('CONFLICT_ACT1_ABSENT fires when no conflict signal exists in Act 1', async () => {
      // n=12: act1 = scenes 0-2 (floor(12*0.25)=3)
      const records = Array.from({ length: 12 }, (_, i) => makeRec(i));
      const original = records.map((_, i) => `INT. SC${i} - DAY\nA.\n`).join('');
      const result = await conflictPass({ fountain: original, records, original, structure: baseStructure as any, annotations: [], approvedSpans: [] });
      assert.ok(
        result.issues.some(i => i.rule === 'CONFLICT_ACT1_ABSENT'),
        `Expected CONFLICT_ACT1_ABSENT, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // CONFLICT_ACT1_ABSENT — no-fire
    it('CONFLICT_ACT1_ABSENT does not fire when Act 1 has a clock hook', async () => {
      const records = Array.from({ length: 12 }, (_, i) => makeRec(i, {
        clockRaised: i === 1,
      }));
      const original = records.map((_, i) => `INT. SC${i} - DAY\nA.\n`).join('');
      const result = await conflictPass({ fountain: original, records, original, structure: baseStructure as any, annotations: [], approvedSpans: [] });
      assert.ok(
        !result.issues.some(i => i.rule === 'CONFLICT_ACT1_ABSENT'),
        `Expected no CONFLICT_ACT1_ABSENT, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // CONFLICT_CONVERGENCE_ABSENT — fires
    it('CONFLICT_CONVERGENCE_ABSENT fires when relational conflicts and clock never share a scene', async () => {
      const records = Array.from({ length: 12 }, (_, i) => makeRec(i, {
        relationshipShifts:
          i === 2 ? [{ pairKey: 'alice|bob', dimension: 'trust', amount: -0.5 }] :
          i === 4 ? [{ pairKey: 'carol|dan', dimension: 'power', amount: -0.6 }] : [],
        clockRaised: i === 7,
      }));
      const original = records.map((_, i) => `INT. SC${i} - DAY\nA.\n`).join('');
      const result = await conflictPass({ fountain: original, records, original, structure: baseStructure as any, annotations: [], approvedSpans: [] });
      assert.ok(
        result.issues.some(i => i.rule === 'CONFLICT_CONVERGENCE_ABSENT'),
        `Expected CONFLICT_CONVERGENCE_ABSENT, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // CONFLICT_CONVERGENCE_ABSENT — no-fire
    it('CONFLICT_CONVERGENCE_ABSENT does not fire when a scene contains both clock and neg shift', async () => {
      const records = Array.from({ length: 12 }, (_, i) => makeRec(i, {
        relationshipShifts:
          i === 2 ? [{ pairKey: 'alice|bob', dimension: 'trust', amount: -0.5 }] :
          i === 4 ? [{ pairKey: 'carol|dan', dimension: 'power', amount: -0.6 }] : [],
        // Scene 7 has BOTH clock and neg shift → convergence
        clockRaised: i === 7,
      })).map((r, i) => i === 7
        ? { ...r, clockRaised: true, relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: -0.4 }] }
        : r,
      );
      const original = records.map((_, i) => `INT. SC${i} - DAY\nA.\n`).join('');
      const result = await conflictPass({ fountain: original, records, original, structure: baseStructure as any, annotations: [], approvedSpans: [] });
      assert.ok(
        !result.issues.some(i => i.rule === 'CONFLICT_CONVERGENCE_ABSENT'),
        `Expected no CONFLICT_CONVERGENCE_ABSENT, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });
  });


  describe('Wave 229 — conflictPass: reversal tempo flatline, telegraphed antagonist, positive resolution too early', async () => {
    const makeRec229 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, dialogueHighlights: [],
      revelation: null, purpose: 'development', dramaticTurn: '',
      seededClueIds: [], payoffSetupIds: [], relationshipShifts: [],
      ...overrides,
    });

    it('REVERSAL_TEMPO_FLATLINE fires when conflict events are spaced too far apart', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // 10 scenes; conflict events only at scenes 0 and 8 → gap of 8 scenes, threshold 10*0.4=4
      const records229a = [
        makeRec229(0, { suspenseDelta: -2 }),
        makeRec229(1), makeRec229(2), makeRec229(3), makeRec229(4),
        makeRec229(5), makeRec229(6), makeRec229(7),
        makeRec229(8, { suspenseDelta: -2 }),
        makeRec229(9),
      ];
      const result = await conflictPass({
        fountain: records229a.map(r => `INT. SC${r.sceneIdx} - DAY\nAction line.`).join('\n'),
        original: '', records: records229a,
        structure: { escalating: true, avgSuspensePerScene: 0, reversalDensity: 2, openClues: 0, completionPercent: 90, approachingClimax: false } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'REVERSAL_TEMPO_FLATLINE');
      assert.ok(match.length >= 1, `Expected REVERSAL_TEMPO_FLATLINE, got: ${JSON.stringify(result.issues.map((i:any)=>i.rule))}`);
    });

    it('REVERSAL_TEMPO_FLATLINE does NOT fire when conflict events are closely spaced', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // 10 scenes; conflict events at 1,3,5,7 → average gap of 2, threshold 4
      const records229b = Array.from({ length: 10 }, (_, i) =>
        makeRec229(i, { suspenseDelta: [1, 3, 5, 7].includes(i) ? -2 : 0 }),
      );
      const result = await conflictPass({
        fountain: records229b.map(r => `INT. SC${r.sceneIdx} - DAY\nAction line.`).join('\n'),
        original: '', records: records229b,
        structure: { escalating: true, avgSuspensePerScene: 1, reversalDensity: 4, openClues: 0, completionPercent: 90, approachingClimax: false } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'REVERSAL_TEMPO_FLATLINE');
      assert.strictEqual(match.length, 0, 'Should NOT fire when conflict events are closely spaced');
    });

    it('ANTAGONIST_TELEGRAPHED fires when every deep reversal follows a clock raise', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // 10 scenes; reversals at 3 and 7, both preceded by clockRaised at 2 and 6
      const records229c = [
        makeRec229(0), makeRec229(1),
        makeRec229(2, { clockRaised: true }),
        makeRec229(3, { suspenseDelta: -3 }),
        makeRec229(4), makeRec229(5),
        makeRec229(6, { clockRaised: true }),
        makeRec229(7, { suspenseDelta: -3 }),
        makeRec229(8), makeRec229(9),
      ];
      const result = await conflictPass({
        fountain: records229c.map(r => `INT. SC${r.sceneIdx} - DAY\nAction line.`).join('\n'),
        original: '', records: records229c,
        structure: { escalating: true, avgSuspensePerScene: 0.5, reversalDensity: 2, openClues: 0, completionPercent: 80, approachingClimax: false } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'ANTAGONIST_TELEGRAPHED');
      assert.ok(match.length >= 1, `Expected ANTAGONIST_TELEGRAPHED, got: ${JSON.stringify(result.issues.map((i:any)=>i.rule))}`);
    });

    it('ANTAGONIST_TELEGRAPHED does NOT fire when at least one reversal is unpredicted', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // 10 scenes; reversal at 3 (preceded by clock), reversal at 7 (NOT preceded by clock)
      const records229d = [
        makeRec229(0), makeRec229(1),
        makeRec229(2, { clockRaised: true }),
        makeRec229(3, { suspenseDelta: -3 }),
        makeRec229(4), makeRec229(5), makeRec229(6),
        makeRec229(7, { suspenseDelta: -3 }),  // no preceding clockRaised
        makeRec229(8), makeRec229(9),
      ];
      const result = await conflictPass({
        fountain: records229d.map(r => `INT. SC${r.sceneIdx} - DAY\nAction line.`).join('\n'),
        original: '', records: records229d,
        structure: { escalating: true, avgSuspensePerScene: 0.5, reversalDensity: 2, openClues: 0, completionPercent: 80, approachingClimax: false } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'ANTAGONIST_TELEGRAPHED');
      assert.strictEqual(match.length, 0, 'Should NOT fire when at least one reversal is unpredicted');
    });

    it('POSITIVE_RESOLUTION_TOO_EARLY fires when the biggest positive shift is before 60%', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // 8 scenes; ≥3 positive shifts; biggest (+0.8) at scene 3 (recIdx=3, 37% of 8) — before 60% mark (recIdx 4)
      const records229e = [
        makeRec229(0, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.4 }] }),
        makeRec229(1),
        makeRec229(2, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.5 }] }),
        makeRec229(3, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.8 }] }),
        makeRec229(4),
        makeRec229(5, { emotionalShift: 'negative' }),
        makeRec229(6, { emotionalShift: 'negative' }),
        makeRec229(7, { emotionalShift: 'negative' }),
      ];
      const result = await conflictPass({
        fountain: records229e.map(r => `INT. SC${r.sceneIdx} - DAY\nAction line.`).join('\n'),
        original: '', records: records229e,
        structure: { escalating: false, avgSuspensePerScene: 0, reversalDensity: 0, openClues: 0, completionPercent: 90, approachingClimax: false } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'POSITIVE_RESOLUTION_TOO_EARLY');
      assert.ok(match.length >= 1, `Expected POSITIVE_RESOLUTION_TOO_EARLY, got: ${JSON.stringify(result.issues.map((i:any)=>i.rule))}`);
    });

    it('POSITIVE_RESOLUTION_TOO_EARLY does NOT fire when biggest positive shift is after 60%', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // 8 scenes; biggest positive shift at scene 6 (recIdx=6, 75%) — after 60% mark
      const records229f = [
        makeRec229(0, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.4 }] }),
        makeRec229(1),
        makeRec229(2, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.4 }] }),
        makeRec229(3, { emotionalShift: 'negative' }),
        makeRec229(4, { emotionalShift: 'negative' }),
        makeRec229(5, { emotionalShift: 'negative' }),
        makeRec229(6, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.9 }] }),
        makeRec229(7, { emotionalShift: 'positive' }),
      ];
      const result = await conflictPass({
        fountain: records229f.map(r => `INT. SC${r.sceneIdx} - DAY\nAction line.`).join('\n'),
        original: '', records: records229f,
        structure: { escalating: true, avgSuspensePerScene: 0.5, reversalDensity: 1, openClues: 0, completionPercent: 90, approachingClimax: false } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'POSITIVE_RESOLUTION_TOO_EARLY');
      assert.strictEqual(match.length, 0, 'Should NOT fire when biggest positive shift is in the resolution zone');
    });
  });


  describe('Wave 380 — conflictPass: Act 2a void, second-half monopoly, revelation decoupled', async () => {
    const makeRec380 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF380 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };
    const rupture380 = (amount: number) => [{ pairKey: 'A|B', amount, dimension: 'trust' }];

    it('CONFLICT_ACT2A_VOID fires when no rupture lands in the 25-50% zone while conflict exists elsewhere', async () => {
      // n=12 → Act 2a scenes 3,4,5; ruptures only at 1 and 9 (outside Act 2a)
      const recs380a = Array.from({ length: 12 }, (_, i) =>
        makeRec380(i, { relationshipShifts: [1, 9].includes(i) ? rupture380(-0.5) : [] }),
      );
      const res = await runCF380(recs380a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_ACT2A_VOID'), 'CONFLICT_ACT2A_VOID should fire');
    });

    it('CONFLICT_ACT2A_VOID does not fire when a rupture lands in Act 2a', async () => {
      // rupture at scene 4 (within Act 2a)
      const recs380an = Array.from({ length: 12 }, (_, i) =>
        makeRec380(i, { relationshipShifts: [1, 4, 9].includes(i) ? rupture380(-0.5) : [] }),
      );
      const res = await runCF380(recs380an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_ACT2A_VOID'), 'CONFLICT_ACT2A_VOID should not fire');
    });

    it('CONFLICT_SECOND_HALF_MONOPOLY fires when >70% of ruptures fall in the second half', async () => {
      // n=10 → mid=5; ruptures at 2 (first half) and 6,7,8 (second half) → 3/4 = 75%
      const recs380m = Array.from({ length: 10 }, (_, i) =>
        makeRec380(i, { relationshipShifts: [2, 6, 7, 8].includes(i) ? rupture380(-0.5) : [] }),
      );
      const res = await runCF380(recs380m);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_SECOND_HALF_MONOPOLY'), 'CONFLICT_SECOND_HALF_MONOPOLY should fire');
    });

    it('CONFLICT_SECOND_HALF_MONOPOLY does not fire when ruptures are balanced across halves', async () => {
      // ruptures at 1,3 (first half) and 6,8 (second half) → 2/4 = 50%
      const recs380mn = Array.from({ length: 10 }, (_, i) =>
        makeRec380(i, { relationshipShifts: [1, 3, 6, 8].includes(i) ? rupture380(-0.5) : [] }),
      );
      const res = await runCF380(recs380mn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_SECOND_HALF_MONOPOLY'), 'CONFLICT_SECOND_HALF_MONOPOLY should not fire');
    });

    it('CONFLICT_REVELATION_DECOUPLED fires when ruptures and revelations never share a scene', async () => {
      // ruptures at 2,4; revelations at 5,7 — no overlap
      const recs380r = Array.from({ length: 10 }, (_, i) =>
        makeRec380(i, {
          relationshipShifts: [2, 4].includes(i) ? rupture380(-0.5) : [],
          revelation: [5, 7].includes(i) ? 'the hidden truth' : null,
        }),
      );
      const res = await runCF380(recs380r);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_REVELATION_DECOUPLED'), 'CONFLICT_REVELATION_DECOUPLED should fire');
    });

    it('CONFLICT_REVELATION_DECOUPLED does not fire when a rupture scene also carries a revelation', async () => {
      // scene 4 has both a rupture and a revelation
      const recs380rn = Array.from({ length: 10 }, (_, i) =>
        makeRec380(i, {
          relationshipShifts: [2, 4].includes(i) ? rupture380(-0.5) : [],
          revelation: [4, 7].includes(i) ? 'the hidden truth' : null,
        }),
      );
      const res = await runCF380(recs380rn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_REVELATION_DECOUPLED'), 'CONFLICT_REVELATION_DECOUPLED should not fire');
    });
  });


  describe('Wave 366 — conflictPass: peak dramatic turn absent, peak clock absent, late first rupture', async () => {
    const makeRec366 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF366 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };
    const rupture366 = (amount: number) => [{ pairKey: 'A|B', amount, dimension: 'trust' }];

    it('CONFLICT_PEAK_DRAMATIC_TURN_ABSENT fires when the heaviest rupture carries no dramatic turn', async () => {
      const recs366dt = Array.from({ length: 8 }, (_, i) =>
        makeRec366(i,
          i === 5 ? { relationshipShifts: rupture366(-0.4) } :
          i === 6 ? { relationshipShifts: rupture366(-0.9), dramaticTurn: 'nothing' } : {})
      );
      const res = await runCF366(recs366dt);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_PEAK_DRAMATIC_TURN_ABSENT'), 'CONFLICT_PEAK_DRAMATIC_TURN_ABSENT should fire');
    });

    it('CONFLICT_PEAK_DRAMATIC_TURN_ABSENT does not fire when the heaviest rupture is a dramatic turn', async () => {
      const recs366dtni = Array.from({ length: 8 }, (_, i) =>
        makeRec366(i,
          i === 5 ? { relationshipShifts: rupture366(-0.4) } :
          i === 6 ? { relationshipShifts: rupture366(-0.9), dramaticTurn: 'reversal' } : {})
      );
      const res = await runCF366(recs366dtni);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_PEAK_DRAMATIC_TURN_ABSENT'), 'CONFLICT_PEAK_DRAMATIC_TURN_ABSENT should not fire');
    });

    it('CONFLICT_PEAK_CLOCK_ABSENT fires when the heaviest rupture raises no clock while clocks exist elsewhere', async () => {
      const recs366ck = Array.from({ length: 8 }, (_, i) =>
        makeRec366(i,
          i === 1 || i === 2 ? { clockRaised: true } :
          i === 5 ? { relationshipShifts: rupture366(-0.4) } :
          i === 6 ? { relationshipShifts: rupture366(-0.9), clockRaised: false } : {})
      );
      const res = await runCF366(recs366ck);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_PEAK_CLOCK_ABSENT'), 'CONFLICT_PEAK_CLOCK_ABSENT should fire');
    });

    it('CONFLICT_PEAK_CLOCK_ABSENT does not fire when the heaviest rupture raises a clock', async () => {
      const recs366ckni = Array.from({ length: 8 }, (_, i) =>
        makeRec366(i,
          i === 1 || i === 2 ? { clockRaised: true } :
          i === 5 ? { relationshipShifts: rupture366(-0.4) } :
          i === 6 ? { relationshipShifts: rupture366(-0.9), clockRaised: true } : {})
      );
      const res = await runCF366(recs366ckni);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_PEAK_CLOCK_ABSENT'), 'CONFLICT_PEAK_CLOCK_ABSENT should not fire');
    });

    it('CONFLICT_LATE_FIRST_RUPTURE fires when the first rupture lands at or past the midpoint', async () => {
      // n=10 → mid=5; ruptures only at scenes 6 and 8
      const recs366lf = Array.from({ length: 10 }, (_, i) =>
        makeRec366(i, [6, 8].includes(i) ? { relationshipShifts: rupture366(-0.5) } : {})
      );
      const res = await runCF366(recs366lf);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_LATE_FIRST_RUPTURE'), 'CONFLICT_LATE_FIRST_RUPTURE should fire');
    });

    it('CONFLICT_LATE_FIRST_RUPTURE does not fire when a rupture lands in the first half', async () => {
      // rupture at scene 2 (first half) and scene 8
      const recs366lfni = Array.from({ length: 10 }, (_, i) =>
        makeRec366(i, [2, 8].includes(i) ? { relationshipShifts: rupture366(-0.5) } : {})
      );
      const res = await runCF366(recs366lfni);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_LATE_FIRST_RUPTURE'), 'CONFLICT_LATE_FIRST_RUPTURE should not fire');
    });
  });


  describe('Wave 352 — conflictPass: peak suspense absent, peak emotion absent, peak curiosity absent', async () => {
    const makeRec352 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'negative', suspenseDelta: 1, curiosityDelta: 1,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF352 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };
    const rupture = (amount: number) => [{ pairs: ['A', 'B'], amount, dimension: 'trust' }];

    it('CONFLICT_PEAK_SUSPENSE_ABSENT fires when the heaviest rupture has suspenseDelta ≤ 0', async () => {
      const recs352s = Array.from({ length: 8 }, (_, i) =>
        makeRec352(i,
          i === 5 ? { relationshipShifts: rupture(-0.4) } :
          i === 6 ? { relationshipShifts: rupture(-0.9), suspenseDelta: 0 } : {})
      );
      const res = await runCF352(recs352s);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_PEAK_SUSPENSE_ABSENT'), 'CONFLICT_PEAK_SUSPENSE_ABSENT should fire');
    });

    it('CONFLICT_PEAK_SUSPENSE_ABSENT does not fire when the heaviest rupture raises suspense', async () => {
      const recs352sn = Array.from({ length: 8 }, (_, i) =>
        makeRec352(i,
          i === 5 ? { relationshipShifts: rupture(-0.4) } :
          i === 6 ? { relationshipShifts: rupture(-0.9), suspenseDelta: 1.5 } : {})
      );
      const res = await runCF352(recs352sn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_PEAK_SUSPENSE_ABSENT'), 'CONFLICT_PEAK_SUSPENSE_ABSENT should not fire');
    });

    it('CONFLICT_PEAK_EMOTION_ABSENT fires when the heaviest rupture is emotionally neutral', async () => {
      const recs352e = Array.from({ length: 8 }, (_, i) =>
        makeRec352(i,
          i === 5 ? { relationshipShifts: rupture(-0.4) } :
          i === 6 ? { relationshipShifts: rupture(-0.9), emotionalShift: 'neutral' } : {})
      );
      const res = await runCF352(recs352e);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_PEAK_EMOTION_ABSENT'), 'CONFLICT_PEAK_EMOTION_ABSENT should fire');
    });

    it('CONFLICT_PEAK_EMOTION_ABSENT does not fire when the heaviest rupture carries emotion', async () => {
      const recs352en = Array.from({ length: 8 }, (_, i) =>
        makeRec352(i,
          i === 5 ? { relationshipShifts: rupture(-0.4) } :
          i === 6 ? { relationshipShifts: rupture(-0.9), emotionalShift: 'negative' } : {})
      );
      const res = await runCF352(recs352en);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_PEAK_EMOTION_ABSENT'), 'CONFLICT_PEAK_EMOTION_ABSENT should not fire');
    });

    it('CONFLICT_PEAK_CURIOSITY_ABSENT fires when the heaviest rupture has curiosityDelta ≤ 0', async () => {
      const recs352c = Array.from({ length: 8 }, (_, i) =>
        makeRec352(i,
          i === 5 ? { relationshipShifts: rupture(-0.4) } :
          i === 6 ? { relationshipShifts: rupture(-0.9), curiosityDelta: 0 } : {})
      );
      const res = await runCF352(recs352c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_PEAK_CURIOSITY_ABSENT'), 'CONFLICT_PEAK_CURIOSITY_ABSENT should fire');
    });

    it('CONFLICT_PEAK_CURIOSITY_ABSENT does not fire when the heaviest rupture raises curiosity', async () => {
      const recs352cn = Array.from({ length: 8 }, (_, i) =>
        makeRec352(i,
          i === 5 ? { relationshipShifts: rupture(-0.4) } :
          i === 6 ? { relationshipShifts: rupture(-0.9), curiosityDelta: 1 } : {})
      );
      const res = await runCF352(recs352cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_PEAK_CURIOSITY_ABSENT'), 'CONFLICT_PEAK_CURIOSITY_ABSENT should not fire');
    });
  });


  describe('Wave 338 — conflictPass: clock decoupled, dramatic turn void, first-half monopoly', async () => {
    const makeRec338 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'negative', suspenseDelta: 0.5, curiosityDelta: 0.5,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF338 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };
    const neg338 = [{ pairs: ['A', 'B'], amount: -0.5, dimension: 'trust' }];

    it('CONFLICT_CLOCK_DECOUPLED fires when clock scenes carry no relational conflict', async () => {
      const recs338cd = [
        ...Array.from({ length: 6 }, (_, i) => makeRec338(i)),
        makeRec338(6, { clockRaised: true, clockDelta: 1, relationshipShifts: [] }),
        makeRec338(7, { clockRaised: true, clockDelta: 1, relationshipShifts: [] }),
      ];
      const res = await runCF338(recs338cd);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_CLOCK_DECOUPLED'), 'CONFLICT_CLOCK_DECOUPLED should fire');
    });

    it('CONFLICT_CLOCK_DECOUPLED does not fire when a clock scene carries conflict', async () => {
      const recs338cdnw = [
        ...Array.from({ length: 6 }, (_, i) => makeRec338(i)),
        makeRec338(6, { clockRaised: true, clockDelta: 1, relationshipShifts: neg338 }),
        makeRec338(7, { clockRaised: true, clockDelta: 1, relationshipShifts: [] }),
      ];
      const res = await runCF338(recs338cdnw);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_CLOCK_DECOUPLED'), 'CONFLICT_CLOCK_DECOUPLED should not fire');
    });

    it('CONFLICT_DRAMATIC_TURN_VOID fires when turn scenes carry no relational conflict', async () => {
      const recs338dt = [
        ...Array.from({ length: 7 }, (_, i) => makeRec338(i)),
        makeRec338(7, { dramaticTurn: 'reversal', relationshipShifts: [] }),
        makeRec338(8, { dramaticTurn: 'recognition', relationshipShifts: [] }),
        makeRec338(9, { dramaticTurn: 'reversal', relationshipShifts: [] }),
      ];
      const res = await runCF338(recs338dt);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_DRAMATIC_TURN_VOID'), 'CONFLICT_DRAMATIC_TURN_VOID should fire');
    });

    it('CONFLICT_DRAMATIC_TURN_VOID does not fire when a turn scene cracks a bond', async () => {
      const recs338dtnw = [
        ...Array.from({ length: 7 }, (_, i) => makeRec338(i)),
        makeRec338(7, { dramaticTurn: 'reversal', relationshipShifts: neg338 }),
        makeRec338(8, { dramaticTurn: 'recognition', relationshipShifts: [] }),
        makeRec338(9, { dramaticTurn: 'reversal', relationshipShifts: [] }),
      ];
      const res = await runCF338(recs338dtnw);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_DRAMATIC_TURN_VOID'), 'CONFLICT_DRAMATIC_TURN_VOID should not fire');
    });

    it('CONFLICT_FIRST_HALF_MONOPOLY fires when >70% of conflict scenes are in the first half', async () => {
      const recs338fh = [
        makeRec338(0, { relationshipShifts: neg338 }),
        makeRec338(1, { relationshipShifts: [] }),
        makeRec338(2, { relationshipShifts: neg338 }),
        makeRec338(3, { relationshipShifts: [] }),
        makeRec338(4, { relationshipShifts: neg338 }),
        makeRec338(5, { relationshipShifts: [] }),
        makeRec338(6, { relationshipShifts: [] }),
        makeRec338(7, { relationshipShifts: neg338 }),
        makeRec338(8, { relationshipShifts: [] }),
        makeRec338(9, { relationshipShifts: [] }),
      ];
      // 4 conflict scenes: 3 in first half (0,2,4) + 1 in second half (7) = 75%
      const res = await runCF338(recs338fh);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_FIRST_HALF_MONOPOLY'), 'CONFLICT_FIRST_HALF_MONOPOLY should fire');
    });

    it('CONFLICT_FIRST_HALF_MONOPOLY does not fire when conflict is evenly distributed', async () => {
      const recs338fhnw = [
        makeRec338(0, { relationshipShifts: neg338 }),
        makeRec338(1, { relationshipShifts: [] }),
        makeRec338(2, { relationshipShifts: [] }),
        makeRec338(3, { relationshipShifts: [] }),
        makeRec338(4, { relationshipShifts: [] }),
        makeRec338(5, { relationshipShifts: neg338 }),
        makeRec338(6, { relationshipShifts: neg338 }),
        makeRec338(7, { relationshipShifts: neg338 }),
        makeRec338(8, { relationshipShifts: [] }),
        makeRec338(9, { relationshipShifts: [] }),
      ];
      // 4 conflict scenes: 1 in first half (0) + 3 in second half (5,6,7) = 25%
      const res = await runCF338(recs338fhnw);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_FIRST_HALF_MONOPOLY'), 'CONFLICT_FIRST_HALF_MONOPOLY should not fire');
    });
  });


  describe('Wave 313 — conflictPass: curiosity decoupled, magnitude peak early, relentless run', async () => {
    const makeRec313 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0.5,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF313 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CONFLICT_CURIOSITY_DECOUPLED fires when conflict scenes average curiosityDelta ≤ 0', async () => {
      const recs313cd = Array.from({ length: 8 }, (_, i) =>
        makeRec313(i, {
          relationshipShifts: [1, 3, 5].includes(i) ? [{ pairKey: 'A|B', dimension: 'trust', amount: -0.5 }] : [],
          curiosityDelta: [1, 3, 5].includes(i) ? -0.5 : 0.5,
        })
      );
      const res = await runCF313(recs313cd);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_CURIOSITY_DECOUPLED'), 'CONFLICT_CURIOSITY_DECOUPLED should fire');
    });

    it('CONFLICT_CURIOSITY_DECOUPLED does not fire when conflict scenes raise curiosity', async () => {
      const recs313ncd = Array.from({ length: 8 }, (_, i) =>
        makeRec313(i, {
          relationshipShifts: [1, 3, 5].includes(i) ? [{ pairKey: 'A|B', dimension: 'trust', amount: -0.5 }] : [],
          curiosityDelta: [1, 3, 5].includes(i) ? 2 : 0.5,
        })
      );
      const res = await runCF313(recs313ncd);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_CURIOSITY_DECOUPLED'), 'CONFLICT_CURIOSITY_DECOUPLED should not fire');
    });

    it('CONFLICT_MAGNITUDE_PEAK_EARLY fires when the heaviest distributed conflict is in the first half', async () => {
      // 12 scenes; conflict at 1 (0.6 — the peak, first half), 7 (0.4), 9 (0.4). total=1.4? need >=1.5.
      // Use 1 (0.6), 7 (0.5), 9 (0.5) → total 1.6, peak 0.6 < 0.6*1.6=0.96, peakIdx 1 < 6 → fire
      const recs313mp = Array.from({ length: 12 }, (_, i) =>
        makeRec313(i, {
          relationshipShifts:
            i === 1 ? [{ pairKey: 'A|B', dimension: 'trust', amount: -0.6 }]
            : i === 7 ? [{ pairKey: 'A|B', dimension: 'trust', amount: -0.5 }]
            : i === 9 ? [{ pairKey: 'C|D', dimension: 'trust', amount: -0.5 }]
            : [],
        })
      );
      const res = await runCF313(recs313mp);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_MAGNITUDE_PEAK_EARLY'), 'CONFLICT_MAGNITUDE_PEAK_EARLY should fire');
    });

    it('CONFLICT_MAGNITUDE_PEAK_EARLY does not fire when the heaviest conflict is in the second half', async () => {
      const recs313nmp = Array.from({ length: 12 }, (_, i) =>
        makeRec313(i, {
          relationshipShifts:
            i === 1 ? [{ pairKey: 'A|B', dimension: 'trust', amount: -0.4 }]
            : i === 7 ? [{ pairKey: 'A|B', dimension: 'trust', amount: -0.4 }]
            : i === 10 ? [{ pairKey: 'C|D', dimension: 'trust', amount: -0.8 }]
            : [],
        })
      );
      const res = await runCF313(recs313nmp);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_MAGNITUDE_PEAK_EARLY'), 'CONFLICT_MAGNITUDE_PEAK_EARLY should not fire');
    });

    it('CONFLICT_RELENTLESS_RUN fires when 4+ consecutive scenes carry a negative shift', async () => {
      const recs313rr = Array.from({ length: 8 }, (_, i) =>
        makeRec313(i, {
          relationshipShifts: [2, 3, 4, 5].includes(i) ? [{ pairKey: 'A|B', dimension: 'trust', amount: -0.5 }] : [],
        })
      );
      const res = await runCF313(recs313rr);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_RELENTLESS_RUN'), 'CONFLICT_RELENTLESS_RUN should fire');
    });

    it('CONFLICT_RELENTLESS_RUN does not fire when conflict runs are broken by respite', async () => {
      const recs313nrr = Array.from({ length: 8 }, (_, i) =>
        makeRec313(i, {
          relationshipShifts: [2, 3, 5, 6].includes(i) ? [{ pairKey: 'A|B', dimension: 'trust', amount: -0.5 }] : [],
        })
      );
      const res = await runCF313(recs313nrr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_RELENTLESS_RUN'), 'CONFLICT_RELENTLESS_RUN should not fire');
    });
  });


  describe('Wave 884 — conflictPass: conflict climax zone imbalance, conflict establish world zone imbalance, conflict resolution zone imbalance', async () => {
    const makeRec884 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF884 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // CONFLICT_CLIMAX_ZONE_IMBALANCE fire:
    // n=10, 4 zones (Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}); climax at 0,1,2,8,9 →
    // Z0 has 3/5=60% (bloat, >=50%), Z1 and Z2 are empty.
    it('CONFLICT_CLIMAX_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of climax-purposed scenes', async () => {
      const recs884a = Array.from({ length: 10 }, (_, i) =>
        makeRec884(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'climax' : 'development' }),
      );
      const res = await runCF884(recs884a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_CLIMAX_ZONE_IMBALANCE'), 'CONFLICT_CLIMAX_ZONE_IMBALANCE should fire');
    });

    it('CONFLICT_CLIMAX_ZONE_IMBALANCE does not fire when climax-purposed scenes touch every zone', async () => {
      const recs884an = Array.from({ length: 10 }, (_, i) =>
        makeRec884(i, { purpose: [0, 3, 5, 8].includes(i) ? 'climax' : 'development' }),
      );
      const res = await runCF884(recs884an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_CLIMAX_ZONE_IMBALANCE'), 'CONFLICT_CLIMAX_ZONE_IMBALANCE should not fire');
    });

    // CONFLICT_ESTABLISH_WORLD_ZONE_IMBALANCE fire: same zone geometry as above.
    it('CONFLICT_ESTABLISH_WORLD_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of world-establishing scenes', async () => {
      const recs884b = Array.from({ length: 10 }, (_, i) =>
        makeRec884(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'establish_world' : 'development' }),
      );
      const res = await runCF884(recs884b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_ESTABLISH_WORLD_ZONE_IMBALANCE'), 'CONFLICT_ESTABLISH_WORLD_ZONE_IMBALANCE should fire');
    });

    it('CONFLICT_ESTABLISH_WORLD_ZONE_IMBALANCE does not fire when world-establishing scenes touch every zone', async () => {
      const recs884bn = Array.from({ length: 10 }, (_, i) =>
        makeRec884(i, { purpose: [0, 3, 5, 8].includes(i) ? 'establish_world' : 'development' }),
      );
      const res = await runCF884(recs884bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_ESTABLISH_WORLD_ZONE_IMBALANCE'), 'CONFLICT_ESTABLISH_WORLD_ZONE_IMBALANCE should not fire');
    });

    // CONFLICT_RESOLUTION_ZONE_IMBALANCE fire: same zone geometry as above.
    it('CONFLICT_RESOLUTION_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of resolution-purposed scenes', async () => {
      const recs884c = Array.from({ length: 10 }, (_, i) =>
        makeRec884(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'resolution' : 'development' }),
      );
      const res = await runCF884(recs884c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_RESOLUTION_ZONE_IMBALANCE'), 'CONFLICT_RESOLUTION_ZONE_IMBALANCE should fire');
    });

    it('CONFLICT_RESOLUTION_ZONE_IMBALANCE does not fire when resolution-purposed scenes touch every zone', async () => {
      const recs884cn = Array.from({ length: 10 }, (_, i) =>
        makeRec884(i, { purpose: [0, 3, 5, 8].includes(i) ? 'resolution' : 'development' }),
      );
      const res = await runCF884(recs884cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_RESOLUTION_ZONE_IMBALANCE'), 'CONFLICT_RESOLUTION_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 870 — conflictPass: conflict resolution drought run, conflict complicate zone cluster, conflict complicate drought run', async () => {
    const makeRec870 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF870 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // CONFLICT_RESOLUTION_DROUGHT_RUN fire:
    // n=10; resolution at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('CONFLICT_RESOLUTION_DROUGHT_RUN fires when a long run has no resolution-purposed scene', async () => {
      const recs870a = Array.from({ length: 10 }, (_, i) =>
        makeRec870(i, { purpose: [0, 1, 2].includes(i) ? 'resolution' : 'development' }),
      );
      const res = await runCF870(recs870a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_RESOLUTION_DROUGHT_RUN'), 'CONFLICT_RESOLUTION_DROUGHT_RUN should fire');
    });

    it('CONFLICT_RESOLUTION_DROUGHT_RUN does not fire when resolution-purposed scenes are evenly spread', async () => {
      const recs870an = Array.from({ length: 10 }, (_, i) =>
        makeRec870(i, { purpose: [0, 3, 6, 9].includes(i) ? 'resolution' : 'development' }),
      );
      const res = await runCF870(recs870an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_RESOLUTION_DROUGHT_RUN'), 'CONFLICT_RESOLUTION_DROUGHT_RUN should not fire');
    });

    // CONFLICT_COMPLICATE_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; complicate scenes at 0,1,2 → 100% opening third
    it('CONFLICT_COMPLICATE_ZONE_CLUSTER fires when >75% of complicating scenes cluster in one third', async () => {
      const recs870b = Array.from({ length: 9 }, (_, i) =>
        makeRec870(i, { purpose: [0, 1, 2].includes(i) ? 'complicate' : 'development' }),
      );
      const res = await runCF870(recs870b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_COMPLICATE_ZONE_CLUSTER'), 'CONFLICT_COMPLICATE_ZONE_CLUSTER should fire');
    });

    it('CONFLICT_COMPLICATE_ZONE_CLUSTER does not fire when complicating scenes spread across thirds', async () => {
      const recs870bn = Array.from({ length: 9 }, (_, i) =>
        makeRec870(i, { purpose: [0, 4, 8].includes(i) ? 'complicate' : 'development' }),
      );
      const res = await runCF870(recs870bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_COMPLICATE_ZONE_CLUSTER'), 'CONFLICT_COMPLICATE_ZONE_CLUSTER should not fire');
    });

    // CONFLICT_COMPLICATE_DROUGHT_RUN fire:
    // n=10; complicate at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('CONFLICT_COMPLICATE_DROUGHT_RUN fires when a long run has no complicating scene', async () => {
      const recs870c = Array.from({ length: 10 }, (_, i) =>
        makeRec870(i, { purpose: [0, 1, 2].includes(i) ? 'complicate' : 'development' }),
      );
      const res = await runCF870(recs870c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_COMPLICATE_DROUGHT_RUN'), 'CONFLICT_COMPLICATE_DROUGHT_RUN should fire');
    });

    it('CONFLICT_COMPLICATE_DROUGHT_RUN does not fire when complicating scenes are evenly spread', async () => {
      const recs870cn = Array.from({ length: 10 }, (_, i) =>
        makeRec870(i, { purpose: [0, 3, 6, 9].includes(i) ? 'complicate' : 'development' }),
      );
      const res = await runCF870(recs870cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_COMPLICATE_DROUGHT_RUN'), 'CONFLICT_COMPLICATE_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 856 — conflictPass: conflict climax drought run, conflict establish world drought run, conflict resolution zone cluster', async () => {
    const makeRec856 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF856 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // CONFLICT_CLIMAX_DROUGHT_RUN fire:
    // n=10; climax at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('CONFLICT_CLIMAX_DROUGHT_RUN fires when a long run has no climax-purposed scene', async () => {
      const recs856a = Array.from({ length: 10 }, (_, i) => makeRec856(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'climax' } : {}
      ));
      const res = await runCF856(recs856a);
      assert.ok(res.issues.some((is: any) => is.rule === 'CONFLICT_CLIMAX_DROUGHT_RUN'), 'CONFLICT_CLIMAX_DROUGHT_RUN should fire');
    });

    it('CONFLICT_CLIMAX_DROUGHT_RUN does not fire when climax-purposed scenes are evenly spread', async () => {
      const recs856an = Array.from({ length: 10 }, (_, i) => makeRec856(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { purpose: 'climax' } : {}
      ));
      const res = await runCF856(recs856an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'CONFLICT_CLIMAX_DROUGHT_RUN'), 'CONFLICT_CLIMAX_DROUGHT_RUN should not fire');
    });

    // CONFLICT_ESTABLISH_WORLD_DROUGHT_RUN fire:
    // n=10; establish_world at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('CONFLICT_ESTABLISH_WORLD_DROUGHT_RUN fires when a long run has no world-building', async () => {
      const recs856b = Array.from({ length: 10 }, (_, i) => makeRec856(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'establish_world' } : {}
      ));
      const res = await runCF856(recs856b);
      assert.ok(res.issues.some((is: any) => is.rule === 'CONFLICT_ESTABLISH_WORLD_DROUGHT_RUN'), 'CONFLICT_ESTABLISH_WORLD_DROUGHT_RUN should fire');
    });

    it('CONFLICT_ESTABLISH_WORLD_DROUGHT_RUN does not fire when world-establishing scenes are evenly spread', async () => {
      const recs856bn = Array.from({ length: 10 }, (_, i) => makeRec856(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { purpose: 'establish_world' } : {}
      ));
      const res = await runCF856(recs856bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'CONFLICT_ESTABLISH_WORLD_DROUGHT_RUN'), 'CONFLICT_ESTABLISH_WORLD_DROUGHT_RUN should not fire');
    });

    // CONFLICT_RESOLUTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; resolution scenes at 0,1,2 → 100% opening third
    it('CONFLICT_RESOLUTION_ZONE_CLUSTER fires when >75% of resolution-purposed scenes cluster in one third', async () => {
      const recs856c = Array.from({ length: 9 }, (_, i) => makeRec856(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'resolution' } : {}
      ));
      const res = await runCF856(recs856c);
      assert.ok(res.issues.some((is: any) => is.rule === 'CONFLICT_RESOLUTION_ZONE_CLUSTER'), 'CONFLICT_RESOLUTION_ZONE_CLUSTER should fire');
    });

    it('CONFLICT_RESOLUTION_ZONE_CLUSTER does not fire when resolution-purposed scenes spread across thirds', async () => {
      const recs856cn = Array.from({ length: 9 }, (_, i) => makeRec856(i,
        (i === 0 || i === 4 || i === 8) ? { purpose: 'resolution' } : {}
      ));
      const res = await runCF856(recs856cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'CONFLICT_RESOLUTION_ZONE_CLUSTER'), 'CONFLICT_RESOLUTION_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 842 — conflictPass: conflict positive emotion drought run, conflict establish world zone cluster, conflict climax zone cluster', async () => {
    const makeRec842 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF842 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // CONFLICT_POSITIVE_EMOTION_DROUGHT_RUN fire:
    // n=10; positive-emotion at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('CONFLICT_POSITIVE_EMOTION_DROUGHT_RUN fires when a long run has no positive-emotion charge', async () => {
      const recs842a = Array.from({ length: 10 }, (_, i) => makeRec842(i,
        (i === 0 || i === 1 || i === 2) ? { emotionalShift: 'positive' } : {}
      ));
      const res = await runCF842(recs842a);
      assert.ok(res.issues.some((is: any) => is.rule === 'CONFLICT_POSITIVE_EMOTION_DROUGHT_RUN'), 'CONFLICT_POSITIVE_EMOTION_DROUGHT_RUN should fire');
    });

    it('CONFLICT_POSITIVE_EMOTION_DROUGHT_RUN does not fire when positive-emotion scenes are evenly spread', async () => {
      const recs842an = Array.from({ length: 10 }, (_, i) => makeRec842(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { emotionalShift: 'positive' } : {}
      ));
      const res = await runCF842(recs842an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'CONFLICT_POSITIVE_EMOTION_DROUGHT_RUN'), 'CONFLICT_POSITIVE_EMOTION_DROUGHT_RUN should not fire');
    });

    // CONFLICT_ESTABLISH_WORLD_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; establish_world scenes at 0,1,2 → 100% opening third
    it('CONFLICT_ESTABLISH_WORLD_ZONE_CLUSTER fires when >75% of world-establishing scenes cluster in one third', async () => {
      const recs842b = Array.from({ length: 9 }, (_, i) => makeRec842(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'establish_world' } : {}
      ));
      const res = await runCF842(recs842b);
      assert.ok(res.issues.some((is: any) => is.rule === 'CONFLICT_ESTABLISH_WORLD_ZONE_CLUSTER'), 'CONFLICT_ESTABLISH_WORLD_ZONE_CLUSTER should fire');
    });

    it('CONFLICT_ESTABLISH_WORLD_ZONE_CLUSTER does not fire when world-establishing scenes spread across thirds', async () => {
      const recs842bn = Array.from({ length: 9 }, (_, i) => makeRec842(i,
        (i === 0 || i === 4 || i === 8) ? { purpose: 'establish_world' } : {}
      ));
      const res = await runCF842(recs842bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'CONFLICT_ESTABLISH_WORLD_ZONE_CLUSTER'), 'CONFLICT_ESTABLISH_WORLD_ZONE_CLUSTER should not fire');
    });

    // CONFLICT_CLIMAX_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; climax scenes at 0,1,2 → 100% opening third
    it('CONFLICT_CLIMAX_ZONE_CLUSTER fires when >75% of climax-purposed scenes cluster in one third', async () => {
      const recs842c = Array.from({ length: 9 }, (_, i) => makeRec842(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'climax' } : {}
      ));
      const res = await runCF842(recs842c);
      assert.ok(res.issues.some((is: any) => is.rule === 'CONFLICT_CLIMAX_ZONE_CLUSTER'), 'CONFLICT_CLIMAX_ZONE_CLUSTER should fire');
    });

    it('CONFLICT_CLIMAX_ZONE_CLUSTER does not fire when climax-purposed scenes spread across thirds', async () => {
      const recs842cn = Array.from({ length: 9 }, (_, i) => makeRec842(i,
        (i === 0 || i === 4 || i === 8) ? { purpose: 'climax' } : {}
      ));
      const res = await runCF842(recs842cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'CONFLICT_CLIMAX_ZONE_CLUSTER'), 'CONFLICT_CLIMAX_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 828 — conflictPass: conflict turning point zone cluster, conflict turning point drought run, conflict positive emotion zone cluster', async () => {
    const makeRec828 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF828 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // CONFLICT_TURNING_POINT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; turning_point scenes at 0,1,2 → 100% opening third
    it('CONFLICT_TURNING_POINT_ZONE_CLUSTER fires when >75% of turning-point scenes cluster in one third', async () => {
      const recs828a = Array.from({ length: 9 }, (_, i) => makeRec828(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'turning_point' } : {}
      ));
      const res = await runCF828(recs828a);
      assert.ok(res.issues.some((is: any) => is.rule === 'CONFLICT_TURNING_POINT_ZONE_CLUSTER'), 'CONFLICT_TURNING_POINT_ZONE_CLUSTER should fire');
    });

    it('CONFLICT_TURNING_POINT_ZONE_CLUSTER does not fire when turning-point scenes spread across thirds', async () => {
      const recs828an = Array.from({ length: 9 }, (_, i) => makeRec828(i,
        (i === 0 || i === 4 || i === 8) ? { purpose: 'turning_point' } : {}
      ));
      const res = await runCF828(recs828an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'CONFLICT_TURNING_POINT_ZONE_CLUSTER'), 'CONFLICT_TURNING_POINT_ZONE_CLUSTER should not fire');
    });

    // CONFLICT_TURNING_POINT_DROUGHT_RUN fire:
    // n=10; turning_point at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('CONFLICT_TURNING_POINT_DROUGHT_RUN fires when a long run has no turning point', async () => {
      const recs828b = Array.from({ length: 10 }, (_, i) => makeRec828(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'turning_point' } : {}
      ));
      const res = await runCF828(recs828b);
      assert.ok(res.issues.some((is: any) => is.rule === 'CONFLICT_TURNING_POINT_DROUGHT_RUN'), 'CONFLICT_TURNING_POINT_DROUGHT_RUN should fire');
    });

    it('CONFLICT_TURNING_POINT_DROUGHT_RUN does not fire when turning points are evenly spread', async () => {
      const recs828bn = Array.from({ length: 10 }, (_, i) => makeRec828(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { purpose: 'turning_point' } : {}
      ));
      const res = await runCF828(recs828bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'CONFLICT_TURNING_POINT_DROUGHT_RUN'), 'CONFLICT_TURNING_POINT_DROUGHT_RUN should not fire');
    });

    // CONFLICT_POSITIVE_EMOTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; positive-emotion scenes at 0,1,2 → 100% opening third
    it('CONFLICT_POSITIVE_EMOTION_ZONE_CLUSTER fires when >75% of positive-emotion scenes cluster in one third', async () => {
      const recs828c = Array.from({ length: 9 }, (_, i) => makeRec828(i,
        (i === 0 || i === 1 || i === 2) ? { emotionalShift: 'positive' } : {}
      ));
      const res = await runCF828(recs828c);
      assert.ok(res.issues.some((is: any) => is.rule === 'CONFLICT_POSITIVE_EMOTION_ZONE_CLUSTER'), 'CONFLICT_POSITIVE_EMOTION_ZONE_CLUSTER should fire');
    });

    it('CONFLICT_POSITIVE_EMOTION_ZONE_CLUSTER does not fire when positive-emotion scenes spread across thirds', async () => {
      const recs828cn = Array.from({ length: 9 }, (_, i) => makeRec828(i,
        (i === 0 || i === 4 || i === 8) ? { emotionalShift: 'positive' } : {}
      ));
      const res = await runCF828(recs828cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'CONFLICT_POSITIVE_EMOTION_ZONE_CLUSTER'), 'CONFLICT_POSITIVE_EMOTION_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 814 — conflictPass: conflict introduce conflict drought run, conflict character moment zone cluster, conflict character moment drought run', async () => {
    const makeRec814 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF814 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // CONFLICT_INTRODUCE_CONFLICT_DROUGHT_RUN fire:
    // n=10; introduce_conflict at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('CONFLICT_INTRODUCE_CONFLICT_DROUGHT_RUN fires when a long run has no new conflict introduced', async () => {
      const recs814a = Array.from({ length: 10 }, (_, i) => makeRec814(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'introduce_conflict' } : {}
      ));
      const res = await runCF814(recs814a);
      assert.ok(res.issues.some((is: any) => is.rule === 'CONFLICT_INTRODUCE_CONFLICT_DROUGHT_RUN'), 'CONFLICT_INTRODUCE_CONFLICT_DROUGHT_RUN should fire');
    });

    it('CONFLICT_INTRODUCE_CONFLICT_DROUGHT_RUN does not fire when conflict-introducing scenes are evenly spread', async () => {
      const recs814an = Array.from({ length: 10 }, (_, i) => makeRec814(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { purpose: 'introduce_conflict' } : {}
      ));
      const res = await runCF814(recs814an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'CONFLICT_INTRODUCE_CONFLICT_DROUGHT_RUN'), 'CONFLICT_INTRODUCE_CONFLICT_DROUGHT_RUN should not fire');
    });

    // CONFLICT_CHARACTER_MOMENT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; character_moment scenes at 0,1,2 → 100% opening third
    it('CONFLICT_CHARACTER_MOMENT_ZONE_CLUSTER fires when >75% of character-moment scenes cluster in one third', async () => {
      const recs814b = Array.from({ length: 9 }, (_, i) => makeRec814(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'character_moment' } : {}
      ));
      const res = await runCF814(recs814b);
      assert.ok(res.issues.some((is: any) => is.rule === 'CONFLICT_CHARACTER_MOMENT_ZONE_CLUSTER'), 'CONFLICT_CHARACTER_MOMENT_ZONE_CLUSTER should fire');
    });

    it('CONFLICT_CHARACTER_MOMENT_ZONE_CLUSTER does not fire when character-moment scenes spread across thirds', async () => {
      const recs814bn = Array.from({ length: 9 }, (_, i) => makeRec814(i,
        (i === 0 || i === 4 || i === 8) ? { purpose: 'character_moment' } : {}
      ));
      const res = await runCF814(recs814bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'CONFLICT_CHARACTER_MOMENT_ZONE_CLUSTER'), 'CONFLICT_CHARACTER_MOMENT_ZONE_CLUSTER should not fire');
    });

    // CONFLICT_CHARACTER_MOMENT_DROUGHT_RUN fire:
    // n=10; character_moment at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('CONFLICT_CHARACTER_MOMENT_DROUGHT_RUN fires when a long run has no character moment', async () => {
      const recs814c = Array.from({ length: 10 }, (_, i) => makeRec814(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'character_moment' } : {}
      ));
      const res = await runCF814(recs814c);
      assert.ok(res.issues.some((is: any) => is.rule === 'CONFLICT_CHARACTER_MOMENT_DROUGHT_RUN'), 'CONFLICT_CHARACTER_MOMENT_DROUGHT_RUN should fire');
    });

    it('CONFLICT_CHARACTER_MOMENT_DROUGHT_RUN does not fire when character moments are evenly spread', async () => {
      const recs814cn = Array.from({ length: 10 }, (_, i) => makeRec814(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { purpose: 'character_moment' } : {}
      ));
      const res = await runCF814(recs814cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'CONFLICT_CHARACTER_MOMENT_DROUGHT_RUN'), 'CONFLICT_CHARACTER_MOMENT_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 800 — conflictPass: conflict negative emotion zone cluster, conflict negative emotion drought run, conflict introduce conflict zone cluster', async () => {
    const makeRec800 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF800 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // CONFLICT_NEGATIVE_EMOTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; negative-emotion scenes at 0,1,2 → 100% opening third
    it('CONFLICT_NEGATIVE_EMOTION_ZONE_CLUSTER fires when >75% of negative-emotion scenes cluster in one third', async () => {
      const recs800a = Array.from({ length: 9 }, (_, i) => makeRec800(i,
        (i === 0 || i === 1 || i === 2) ? { emotionalShift: 'negative' } : {}
      ));
      const res = await runCF800(recs800a);
      assert.ok(res.issues.some((is: any) => is.rule === 'CONFLICT_NEGATIVE_EMOTION_ZONE_CLUSTER'), 'CONFLICT_NEGATIVE_EMOTION_ZONE_CLUSTER should fire');
    });

    it('CONFLICT_NEGATIVE_EMOTION_ZONE_CLUSTER does not fire when negative-emotion scenes spread across thirds', async () => {
      const recs800an = Array.from({ length: 9 }, (_, i) => makeRec800(i,
        (i === 0 || i === 4 || i === 8) ? { emotionalShift: 'negative' } : {}
      ));
      const res = await runCF800(recs800an);
      assert.ok(!res.issues.some((is: any) => is.rule === 'CONFLICT_NEGATIVE_EMOTION_ZONE_CLUSTER'), 'CONFLICT_NEGATIVE_EMOTION_ZONE_CLUSTER should not fire');
    });

    // CONFLICT_NEGATIVE_EMOTION_DROUGHT_RUN fire:
    // n=10; negative-emotion at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('CONFLICT_NEGATIVE_EMOTION_DROUGHT_RUN fires when a long run has no negative-emotion charge', async () => {
      const recs800b = Array.from({ length: 10 }, (_, i) => makeRec800(i,
        (i === 0 || i === 1 || i === 2) ? { emotionalShift: 'negative' } : {}
      ));
      const res = await runCF800(recs800b);
      assert.ok(res.issues.some((is: any) => is.rule === 'CONFLICT_NEGATIVE_EMOTION_DROUGHT_RUN'), 'CONFLICT_NEGATIVE_EMOTION_DROUGHT_RUN should fire');
    });

    it('CONFLICT_NEGATIVE_EMOTION_DROUGHT_RUN does not fire when negative-emotion scenes are evenly spread', async () => {
      const recs800bn = Array.from({ length: 10 }, (_, i) => makeRec800(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { emotionalShift: 'negative' } : {}
      ));
      const res = await runCF800(recs800bn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'CONFLICT_NEGATIVE_EMOTION_DROUGHT_RUN'), 'CONFLICT_NEGATIVE_EMOTION_DROUGHT_RUN should not fire');
    });

    // CONFLICT_INTRODUCE_CONFLICT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; introduce_conflict scenes at 0,1,2 → 100% opening third
    it('CONFLICT_INTRODUCE_CONFLICT_ZONE_CLUSTER fires when >75% of conflict-introducing scenes cluster in one third', async () => {
      const recs800c = Array.from({ length: 9 }, (_, i) => makeRec800(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'introduce_conflict' } : {}
      ));
      const res = await runCF800(recs800c);
      assert.ok(res.issues.some((is: any) => is.rule === 'CONFLICT_INTRODUCE_CONFLICT_ZONE_CLUSTER'), 'CONFLICT_INTRODUCE_CONFLICT_ZONE_CLUSTER should fire');
    });

    it('CONFLICT_INTRODUCE_CONFLICT_ZONE_CLUSTER does not fire when conflict-introducing scenes spread across thirds', async () => {
      const recs800cn = Array.from({ length: 9 }, (_, i) => makeRec800(i,
        (i === 0 || i === 4 || i === 8) ? { purpose: 'introduce_conflict' } : {}
      ));
      const res = await runCF800(recs800cn);
      assert.ok(!res.issues.some((is: any) => is.rule === 'CONFLICT_INTRODUCE_CONFLICT_ZONE_CLUSTER'), 'CONFLICT_INTRODUCE_CONFLICT_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 786 — conflictPass: conflict emotion drought run, conflict turn zone cluster, conflict turn drought run', async () => {
    const makeRec786 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF786 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // CONFLICT_EMOTION_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 carry an emotional charge (>=3 present overall); scenes 3-9 (7 scenes) have none
    it('CONFLICT_EMOTION_DROUGHT_RUN fires when the longest no-emotional-charge run reaches 6', async () => {
      const recs786a = Array.from({ length: 10 }, (_, i) => makeRec786(i,
        (i === 0 || i === 1 || i === 2) ? { emotionalShift: 'negative' } : {}
      ));
      const res = await runCF786(recs786a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_EMOTION_DROUGHT_RUN'), 'CONFLICT_EMOTION_DROUGHT_RUN should fire');
    });

    it('CONFLICT_EMOTION_DROUGHT_RUN does not fire when emotional charges are evenly spread', async () => {
      const recs786an = Array.from({ length: 10 }, (_, i) => makeRec786(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { emotionalShift: 'negative' } : {}
      ));
      const res = await runCF786(recs786an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_EMOTION_DROUGHT_RUN'), 'CONFLICT_EMOTION_DROUGHT_RUN should not fire');
    });

    // CONFLICT_TURN_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; turn scenes at 0,1,2 → 100% opening third
    it('CONFLICT_TURN_ZONE_CLUSTER fires when >75% of turn scenes cluster in one third', async () => {
      const recs786b = Array.from({ length: 9 }, (_, i) => makeRec786(i,
        (i === 0 || i === 1 || i === 2) ? { dramaticTurn: 'reversal' } : {}
      ));
      const res = await runCF786(recs786b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_TURN_ZONE_CLUSTER'), 'CONFLICT_TURN_ZONE_CLUSTER should fire');
    });

    it('CONFLICT_TURN_ZONE_CLUSTER does not fire when turn scenes spread across thirds', async () => {
      const recs786bn = Array.from({ length: 9 }, (_, i) => makeRec786(i,
        (i === 0 || i === 4 || i === 8) ? { dramaticTurn: 'reversal' } : {}
      ));
      const res = await runCF786(recs786bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_TURN_ZONE_CLUSTER'), 'CONFLICT_TURN_ZONE_CLUSTER should not fire');
    });

    // CONFLICT_TURN_DROUGHT_RUN fire:
    // n=10; dramaticTurn present at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('CONFLICT_TURN_DROUGHT_RUN fires when a long run has no dramatic turn', async () => {
      const recs786c = Array.from({ length: 10 }, (_, i) => makeRec786(i,
        (i === 0 || i === 1 || i === 2) ? { dramaticTurn: 'reversal' } : {}
      ));
      const res = await runCF786(recs786c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_TURN_DROUGHT_RUN'), 'CONFLICT_TURN_DROUGHT_RUN should fire');
    });

    it('CONFLICT_TURN_DROUGHT_RUN does not fire when dramatic turns are evenly spread', async () => {
      const recs786cn = Array.from({ length: 10 }, (_, i) => makeRec786(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { dramaticTurn: 'reversal' } : {}
      ));
      const res = await runCF786(recs786cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_TURN_DROUGHT_RUN'), 'CONFLICT_TURN_DROUGHT_RUN should not fire');
    });
  });


  describe('Wave 772 — conflictPass: conflict stakes zone cluster, conflict revelation peak uncaused, conflict emotion zone cluster', async () => {
    const makeRec772 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF772 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // CONFLICT_STAKES_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; stakes-raising scenes at 0,1,2 → 100% opening third
    it('CONFLICT_STAKES_ZONE_CLUSTER fires when >75% of stakes-raising scenes cluster in one third', async () => {
      const recs772a = Array.from({ length: 9 }, (_, i) => makeRec772(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'raise_stakes' } : {}
      ));
      const res = await runCF772(recs772a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_STAKES_ZONE_CLUSTER'), 'CONFLICT_STAKES_ZONE_CLUSTER should fire');
    });

    it('CONFLICT_STAKES_ZONE_CLUSTER does not fire when stakes-raising scenes spread across thirds', async () => {
      const recs772an = Array.from({ length: 9 }, (_, i) => makeRec772(i,
        (i === 0 || i === 4 || i === 8) ? { purpose: 'raise_stakes' } : {}
      ));
      const res = await runCF772(recs772an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_STAKES_ZONE_CLUSTER'), 'CONFLICT_STAKES_ZONE_CLUSTER should not fire');
    });

    // CONFLICT_REVELATION_PEAK_UNCAUSED fire:
    // 8 scenes; revelations at 2 (peak, earliest) and 5; no dramaticTurn at 0 or 1 (2-scene
    // lookback of the peak at index 2).
    it('CONFLICT_REVELATION_PEAK_UNCAUSED fires when the peak revelation scene has no dramatic turn nearby', async () => {
      const recs772b = Array.from({ length: 8 }, (_, i) => makeRec772(i));
      recs772b[2] = makeRec772(2, { revelation: 'truth revealed' });
      recs772b[5] = makeRec772(5, { revelation: 'second truth revealed' });
      const res = await runCF772(recs772b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_REVELATION_PEAK_UNCAUSED'), 'CONFLICT_REVELATION_PEAK_UNCAUSED should fire');
    });

    it('CONFLICT_REVELATION_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak revelation', async () => {
      const recs772bn = Array.from({ length: 8 }, (_, i) => makeRec772(i));
      recs772bn[2] = makeRec772(2, { revelation: 'truth revealed' });
      recs772bn[5] = makeRec772(5, { revelation: 'second truth revealed' });
      recs772bn[1] = makeRec772(1, { dramaticTurn: 'reversal' });
      const res = await runCF772(recs772bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_REVELATION_PEAK_UNCAUSED'), 'CONFLICT_REVELATION_PEAK_UNCAUSED should not fire');
    });

    // CONFLICT_EMOTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; emotionally charged scenes at 0,1,2 → 100% opening third
    it('CONFLICT_EMOTION_ZONE_CLUSTER fires when >75% of emotionally charged scenes cluster in one third', async () => {
      const recs772c = Array.from({ length: 9 }, (_, i) => makeRec772(i,
        (i === 0 || i === 1 || i === 2) ? { emotionalShift: 'negative' } : {}
      ));
      const res = await runCF772(recs772c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_EMOTION_ZONE_CLUSTER'), 'CONFLICT_EMOTION_ZONE_CLUSTER should fire');
    });

    it('CONFLICT_EMOTION_ZONE_CLUSTER does not fire when emotionally charged scenes spread across thirds', async () => {
      const recs772cn = Array.from({ length: 9 }, (_, i) => makeRec772(i,
        (i === 0 || i === 4 || i === 8) ? { emotionalShift: 'negative' } : {}
      ));
      const res = await runCF772(recs772cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_EMOTION_ZONE_CLUSTER'), 'CONFLICT_EMOTION_ZONE_CLUSTER should not fire');
    });
  });


  describe('Wave 758 — conflictPass: conflict curiosity drought run, conflict revelation zone cluster, conflict stakes drought run', async () => {
    const makeRec758 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF758 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // CONFLICT_CURIOSITY_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 have rising curiosity (>=3 present overall); scenes 3-9 (7 scenes) have none
    it('CONFLICT_CURIOSITY_DROUGHT_RUN fires when the longest no-rising-curiosity run reaches 6', async () => {
      const recs758a = Array.from({ length: 10 }, (_, i) => makeRec758(i,
        (i === 0 || i === 1 || i === 2) ? { curiosityDelta: 1 } : {}
      ));
      const res = await runCF758(recs758a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_CURIOSITY_DROUGHT_RUN'), 'CONFLICT_CURIOSITY_DROUGHT_RUN should fire');
    });

    // CONFLICT_CURIOSITY_DROUGHT_RUN no-fire:
    // rising-curiosity scenes spread out so no gap reaches 6 consecutive scenes
    it('CONFLICT_CURIOSITY_DROUGHT_RUN does not fire when rising curiosity is spread through the story', async () => {
      const recs758an = Array.from({ length: 10 }, (_, i) => makeRec758(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { curiosityDelta: 1 } : {}
      ));
      const res = await runCF758(recs758an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_CURIOSITY_DROUGHT_RUN'), 'CONFLICT_CURIOSITY_DROUGHT_RUN should not fire');
    });

    // CONFLICT_REVELATION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; revelation scenes at 0,1,2 → 100% opening third
    it('CONFLICT_REVELATION_ZONE_CLUSTER fires when >75% of revelation scenes cluster in one third', async () => {
      const recs758b = Array.from({ length: 9 }, (_, i) => makeRec758(i,
        (i === 0 || i === 1 || i === 2) ? { revelation: 'a truth surfaces' } : {}
      ));
      const res = await runCF758(recs758b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_REVELATION_ZONE_CLUSTER'), 'CONFLICT_REVELATION_ZONE_CLUSTER should fire');
    });

    // CONFLICT_REVELATION_ZONE_CLUSTER no-fire:
    // revelation scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('CONFLICT_REVELATION_ZONE_CLUSTER does not fire when revelation scenes are distributed across thirds', async () => {
      const recs758bn = Array.from({ length: 9 }, (_, i) => makeRec758(i,
        (i === 0 || i === 4 || i === 7) ? { revelation: 'a truth surfaces' } : {}
      ));
      const res = await runCF758(recs758bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_REVELATION_ZONE_CLUSTER'), 'CONFLICT_REVELATION_ZONE_CLUSTER should not fire');
    });

    // CONFLICT_STAKES_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 purposed to raise stakes (>=3 present overall); scenes 3-9 (7 scenes) purposed otherwise
    it('CONFLICT_STAKES_DROUGHT_RUN fires when the longest no-stakes-raise run reaches 6', async () => {
      const recs758c = Array.from({ length: 10 }, (_, i) => makeRec758(i,
        (i === 0 || i === 1 || i === 2) ? { purpose: 'raise_stakes' } : {}
      ));
      const res = await runCF758(recs758c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_STAKES_DROUGHT_RUN'), 'CONFLICT_STAKES_DROUGHT_RUN should fire');
    });

    // CONFLICT_STAKES_DROUGHT_RUN no-fire:
    // stakes-raising scenes spread out so no gap reaches 6 consecutive scenes
    it('CONFLICT_STAKES_DROUGHT_RUN does not fire when stakes-raising scenes are spread through the story', async () => {
      const recs758cn = Array.from({ length: 10 }, (_, i) => makeRec758(i,
        (i === 0 || i === 3 || i === 6 || i === 9) ? { purpose: 'raise_stakes' } : {}
      ));
      const res = await runCF758(recs758cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_STAKES_DROUGHT_RUN'), 'CONFLICT_STAKES_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 744 — conflictPass: conflict relationship zone cluster, conflict clock drought run, conflict curiosity peak uncaused', async () => {
    const makeRec744 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF744 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // CONFLICT_RELATIONSHIP_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; relationship-shift scenes at 0,1,2 → 100% opening third
    it('CONFLICT_RELATIONSHIP_ZONE_CLUSTER fires when >75% of relationship-shift scenes cluster in one third', async () => {
      const recs744a = Array.from({ length: 9 }, (_, i) => makeRec744(i,
        (i === 0 || i === 1 || i === 2) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {}
      ));
      const res = await runCF744(recs744a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_RELATIONSHIP_ZONE_CLUSTER'), 'CONFLICT_RELATIONSHIP_ZONE_CLUSTER should fire');
    });

    // CONFLICT_RELATIONSHIP_ZONE_CLUSTER no-fire:
    // relationship-shift scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('CONFLICT_RELATIONSHIP_ZONE_CLUSTER does not fire when relationship-shift scenes are distributed across thirds', async () => {
      const recs744an = Array.from({ length: 9 }, (_, i) => makeRec744(i,
        (i === 0 || i === 4 || i === 7) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {}
      ));
      const res = await runCF744(recs744an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_RELATIONSHIP_ZONE_CLUSTER'), 'CONFLICT_RELATIONSHIP_ZONE_CLUSTER should not fire');
    });

    // CONFLICT_CLOCK_DROUGHT_RUN fire:
    // 10 scenes; clockRaised at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('CONFLICT_CLOCK_DROUGHT_RUN fires when the longest no-clock-raised run is ≥6', async () => {
      const recs744b = Array.from({ length: 10 }, (_, i) => makeRec744(i,
        (i === 0 || i === 1 || i === 2 || i === 9) ? { clockRaised: true } : {}
      ));
      const res = await runCF744(recs744b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_CLOCK_DROUGHT_RUN'), 'CONFLICT_CLOCK_DROUGHT_RUN should fire');
    });

    // CONFLICT_CLOCK_DROUGHT_RUN no-fire:
    // clockRaised at 0, 4, 9 → longest drought run = 4 (scenes 5-8) < 6
    it('CONFLICT_CLOCK_DROUGHT_RUN does not fire when clock raises are distributed without a long drought', async () => {
      const recs744bn = Array.from({ length: 10 }, (_, i) => makeRec744(i,
        (i === 0 || i === 4 || i === 9) ? { clockRaised: true } : {}
      ));
      const res = await runCF744(recs744bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_CLOCK_DROUGHT_RUN'), 'CONFLICT_CLOCK_DROUGHT_RUN should not fire');
    });

    // CONFLICT_CURIOSITY_PEAK_UNCAUSED fire:
    // 8 scenes; curiosity spikes at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('CONFLICT_CURIOSITY_PEAK_UNCAUSED fires when the peak curiosity-spike scene has no dramatic turn or revelation nearby', async () => {
      const recs744c = Array.from({ length: 8 }, (_, i) => makeRec744(i,
        i === 2 ? { curiosityDelta: 1 }
        : i === 6 ? { curiosityDelta: 5 }
        : {}
      ));
      const res = await runCF744(recs744c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_CURIOSITY_PEAK_UNCAUSED'), 'CONFLICT_CURIOSITY_PEAK_UNCAUSED should fire');
    });

    // CONFLICT_CURIOSITY_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('CONFLICT_CURIOSITY_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs744cn = Array.from({ length: 8 }, (_, i) => makeRec744(i,
        i === 2 ? { curiosityDelta: 1 }
        : i === 5 ? { dramaticTurn: 'reversal' }
        : i === 6 ? { curiosityDelta: 5 }
        : {}
      ));
      const res = await runCF744(recs744cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_CURIOSITY_PEAK_UNCAUSED'), 'CONFLICT_CURIOSITY_PEAK_UNCAUSED should not fire');
    });
  });

  describe('Wave 730 — conflictPass: conflict payoff zone cluster, conflict relationship peak uncaused, conflict clock delta zone cluster', async () => {
    const makeRec730 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF730 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // CONFLICT_PAYOFF_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; payoff scenes at 0,1,2 → 100% opening third
    it('CONFLICT_PAYOFF_ZONE_CLUSTER fires when >75% of payoff scenes cluster in one third', async () => {
      const recs730a = Array.from({ length: 9 }, (_, i) => makeRec730(i,
        (i === 0 || i === 1 || i === 2) ? { payoffSetupIds: ['thread-a'] } : {}
      ));
      const res = await runCF730(recs730a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_PAYOFF_ZONE_CLUSTER'), 'CONFLICT_PAYOFF_ZONE_CLUSTER should fire');
    });

    // CONFLICT_PAYOFF_ZONE_CLUSTER no-fire:
    // payoff scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('CONFLICT_PAYOFF_ZONE_CLUSTER does not fire when payoff scenes are distributed across thirds', async () => {
      const recs730an = Array.from({ length: 9 }, (_, i) => makeRec730(i,
        (i === 0 || i === 4 || i === 7) ? { payoffSetupIds: ['thread-a'] } : {}
      ));
      const res = await runCF730(recs730an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_PAYOFF_ZONE_CLUSTER'), 'CONFLICT_PAYOFF_ZONE_CLUSTER should not fire');
    });

    // CONFLICT_RELATIONSHIP_PEAK_UNCAUSED fire:
    // 8 scenes; relationship shifts at 2 (1 shift) and 6 (5 shifts, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('CONFLICT_RELATIONSHIP_PEAK_UNCAUSED fires when the peak relationship-shift scene has no dramatic turn or revelation nearby', async () => {
      const recs730b = Array.from({ length: 8 }, (_, i) => makeRec730(i,
        i === 2 ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] }
        : i === 6 ? { relationshipShifts: [
            { pairKey: 'a|b', dimension: 'trust', amount: 1 },
            { pairKey: 'a|c', dimension: 'trust', amount: 1 },
            { pairKey: 'a|d', dimension: 'trust', amount: 1 },
            { pairKey: 'a|e', dimension: 'trust', amount: 1 },
            { pairKey: 'a|f', dimension: 'trust', amount: 1 },
          ] }
        : {}
      ));
      const res = await runCF730(recs730b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_RELATIONSHIP_PEAK_UNCAUSED'), 'CONFLICT_RELATIONSHIP_PEAK_UNCAUSED should fire');
    });

    // CONFLICT_RELATIONSHIP_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('CONFLICT_RELATIONSHIP_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs730bn = Array.from({ length: 8 }, (_, i) => makeRec730(i,
        i === 2 ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] }
        : i === 5 ? { dramaticTurn: 'reversal' }
        : i === 6 ? { relationshipShifts: [
            { pairKey: 'a|b', dimension: 'trust', amount: 1 },
            { pairKey: 'a|c', dimension: 'trust', amount: 1 },
            { pairKey: 'a|d', dimension: 'trust', amount: 1 },
            { pairKey: 'a|e', dimension: 'trust', amount: 1 },
            { pairKey: 'a|f', dimension: 'trust', amount: 1 },
          ] }
        : {}
      ));
      const res = await runCF730(recs730bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_RELATIONSHIP_PEAK_UNCAUSED'), 'CONFLICT_RELATIONSHIP_PEAK_UNCAUSED should not fire');
    });

    // CONFLICT_CLOCK_DELTA_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; clock-advancing scenes at 0,1,2 → 100% opening third
    it('CONFLICT_CLOCK_DELTA_ZONE_CLUSTER fires when >75% of clock-advancing scenes cluster in one third', async () => {
      const recs730c = Array.from({ length: 9 }, (_, i) => makeRec730(i,
        (i === 0 || i === 1 || i === 2) ? { clockDelta: 1 } : {}
      ));
      const res = await runCF730(recs730c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_CLOCK_DELTA_ZONE_CLUSTER'), 'CONFLICT_CLOCK_DELTA_ZONE_CLUSTER should fire');
    });

    // CONFLICT_CLOCK_DELTA_ZONE_CLUSTER no-fire:
    // clock-advancing scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('CONFLICT_CLOCK_DELTA_ZONE_CLUSTER does not fire when clock-advancing scenes are distributed across thirds', async () => {
      const recs730cn = Array.from({ length: 9 }, (_, i) => makeRec730(i,
        (i === 0 || i === 4 || i === 7) ? { clockDelta: 1 } : {}
      ));
      const res = await runCF730(recs730cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_CLOCK_DELTA_ZONE_CLUSTER'), 'CONFLICT_CLOCK_DELTA_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 716 — conflictPass: conflict seed peak uncaused, conflict payoff drought run, conflict clock delta drought run', async () => {
    const makeRec716 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF716 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // CONFLICT_SEED_PEAK_UNCAUSED fire:
    // 8 scenes; seeds at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('CONFLICT_SEED_PEAK_UNCAUSED fires when the peak seed scene has no dramatic turn or revelation nearby', async () => {
      const recs716a = Array.from({ length: 8 }, (_, i) => makeRec716(i,
        i === 2 ? { seededClueIds: ['clue-a'] }
        : i === 6 ? { seededClueIds: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runCF716(recs716a);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'CONFLICT_SEED_PEAK_UNCAUSED'), 'CONFLICT_SEED_PEAK_UNCAUSED should fire');
    });

    // CONFLICT_SEED_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('CONFLICT_SEED_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs716an = Array.from({ length: 8 }, (_, i) => makeRec716(i,
        i === 2 ? { seededClueIds: ['clue-a'] }
        : i === 5 ? { dramaticTurn: 'reversal' }
        : i === 6 ? { seededClueIds: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runCF716(recs716an);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'CONFLICT_SEED_PEAK_UNCAUSED'), 'CONFLICT_SEED_PEAK_UNCAUSED should not fire');
    });

    // CONFLICT_PAYOFF_DROUGHT_RUN fire:
    // 10 scenes; payoffs at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('CONFLICT_PAYOFF_DROUGHT_RUN fires when the longest no-payoff run is ≥6', async () => {
      const recs716b = Array.from({ length: 10 }, (_, i) => makeRec716(i,
        (i === 0 || i === 1 || i === 2 || i === 9) ? { payoffSetupIds: ['thread-a'] } : {}
      ));
      const res = await runCF716(recs716b);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'CONFLICT_PAYOFF_DROUGHT_RUN'), 'CONFLICT_PAYOFF_DROUGHT_RUN should fire');
    });

    // CONFLICT_PAYOFF_DROUGHT_RUN no-fire:
    // payoffs at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('CONFLICT_PAYOFF_DROUGHT_RUN does not fire when payoffs are distributed without a long drought', async () => {
      const recs716bn = Array.from({ length: 10 }, (_, i) => makeRec716(i,
        (i === 0 || i === 4 || i === 9) ? { payoffSetupIds: ['thread-a'] } : {}
      ));
      const res = await runCF716(recs716bn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'CONFLICT_PAYOFF_DROUGHT_RUN'), 'CONFLICT_PAYOFF_DROUGHT_RUN should not fire');
    });

    // CONFLICT_CLOCK_DELTA_DROUGHT_RUN fire:
    // 10 scenes; clock advances at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('CONFLICT_CLOCK_DELTA_DROUGHT_RUN fires when the longest no-clock-advance run is ≥6', async () => {
      const recs716c = Array.from({ length: 10 }, (_, i) => makeRec716(i,
        (i === 0 || i === 1 || i === 2 || i === 9) ? { clockDelta: 1 } : {}
      ));
      const res = await runCF716(recs716c);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'CONFLICT_CLOCK_DELTA_DROUGHT_RUN'), 'CONFLICT_CLOCK_DELTA_DROUGHT_RUN should fire');
    });

    // CONFLICT_CLOCK_DELTA_DROUGHT_RUN no-fire:
    // clock advances at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('CONFLICT_CLOCK_DELTA_DROUGHT_RUN does not fire when clock advances are distributed without a long drought', async () => {
      const recs716cn = Array.from({ length: 10 }, (_, i) => makeRec716(i,
        (i === 0 || i === 4 || i === 9) ? { clockDelta: 1 } : {}
      ));
      const res = await runCF716(recs716cn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'CONFLICT_CLOCK_DELTA_DROUGHT_RUN'), 'CONFLICT_CLOCK_DELTA_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 702 — conflictPass: conflict open thread peak uncaused, conflict clock zone cluster, conflict relationship drought run', async () => {
    const makeRec702 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF702 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // CONFLICT_OPEN_THREAD_PEAK_UNCAUSED fire:
    // 8 scenes; open threads at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('CONFLICT_OPEN_THREAD_PEAK_UNCAUSED fires when the peak open-thread scene has no dramatic turn or revelation nearby', async () => {
      const recs702a = Array.from({ length: 8 }, (_, i) => makeRec702(i,
        i === 2 ? { unresolvedClues: ['a'] }
        : i === 6 ? { unresolvedClues: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runCF702(recs702a);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'CONFLICT_OPEN_THREAD_PEAK_UNCAUSED'), 'CONFLICT_OPEN_THREAD_PEAK_UNCAUSED should fire');
    });

    // CONFLICT_OPEN_THREAD_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('CONFLICT_OPEN_THREAD_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs702an = Array.from({ length: 8 }, (_, i) => makeRec702(i,
        i === 2 ? { unresolvedClues: ['a'] }
        : i === 5 ? { dramaticTurn: 'reversal' }
        : i === 6 ? { unresolvedClues: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runCF702(recs702an);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'CONFLICT_OPEN_THREAD_PEAK_UNCAUSED'), 'CONFLICT_OPEN_THREAD_PEAK_UNCAUSED should not fire');
    });

    // CONFLICT_CLOCK_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; clock-raised scenes at 0,1,2 → 100% opening third
    it('CONFLICT_CLOCK_ZONE_CLUSTER fires when >75% of clock-raised scenes cluster in one third', async () => {
      const recs702b = Array.from({ length: 9 }, (_, i) => makeRec702(i,
        (i === 0 || i === 1 || i === 2) ? { clockRaised: true } : {}
      ));
      const res = await runCF702(recs702b);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'CONFLICT_CLOCK_ZONE_CLUSTER'), 'CONFLICT_CLOCK_ZONE_CLUSTER should fire');
    });

    // CONFLICT_CLOCK_ZONE_CLUSTER no-fire:
    // clock-raised scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('CONFLICT_CLOCK_ZONE_CLUSTER does not fire when clock-raised scenes are distributed across thirds', async () => {
      const recs702bn = Array.from({ length: 9 }, (_, i) => makeRec702(i,
        (i === 0 || i === 4 || i === 7) ? { clockRaised: true } : {}
      ));
      const res = await runCF702(recs702bn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'CONFLICT_CLOCK_ZONE_CLUSTER'), 'CONFLICT_CLOCK_ZONE_CLUSTER should not fire');
    });

    // CONFLICT_RELATIONSHIP_DROUGHT_RUN fire:
    // 10 scenes; shifts at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('CONFLICT_RELATIONSHIP_DROUGHT_RUN fires when the longest no-shift run is ≥6', async () => {
      const recs702c = Array.from({ length: 10 }, (_, i) => makeRec702(i,
        (i === 0 || i === 1 || i === 2 || i === 9) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] } : {}
      ));
      const res = await runCF702(recs702c);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'CONFLICT_RELATIONSHIP_DROUGHT_RUN'), 'CONFLICT_RELATIONSHIP_DROUGHT_RUN should fire');
    });

    // CONFLICT_RELATIONSHIP_DROUGHT_RUN no-fire:
    // shifts at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('CONFLICT_RELATIONSHIP_DROUGHT_RUN does not fire when shifts are distributed without a long drought', async () => {
      const recs702cn = Array.from({ length: 10 }, (_, i) => makeRec702(i,
        (i === 0 || i === 4 || i === 9) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] } : {}
      ));
      const res = await runCF702(recs702cn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'CONFLICT_RELATIONSHIP_DROUGHT_RUN'), 'CONFLICT_RELATIONSHIP_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 688 — conflictPass: conflict highlight peak uncaused, conflict seed zone cluster, conflict staging drought run', async () => {
    const makeRec688 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF688 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // CONFLICT_HIGHLIGHT_PEAK_UNCAUSED fire:
    // 8 scenes; highlights at 2 (1 line) and 6 (5 lines, the peak); no dramaticTurn or revelation
    // at 6, 5, or 4
    it('CONFLICT_HIGHLIGHT_PEAK_UNCAUSED fires when the peak highlighted-dialogue scene has no dramatic turn or revelation nearby', async () => {
      const recs688a = Array.from({ length: 8 }, (_, i) => makeRec688(i,
        i === 2 ? { dialogueHighlights: ['line-a'] }
        : i === 6 ? { dialogueHighlights: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runCF688(recs688a);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'CONFLICT_HIGHLIGHT_PEAK_UNCAUSED'), 'CONFLICT_HIGHLIGHT_PEAK_UNCAUSED should fire');
    });

    // CONFLICT_HIGHLIGHT_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('CONFLICT_HIGHLIGHT_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs688an = Array.from({ length: 8 }, (_, i) => makeRec688(i,
        i === 2 ? { dialogueHighlights: ['line-a'] }
        : i === 5 ? { dramaticTurn: 'reversal' }
        : i === 6 ? { dialogueHighlights: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runCF688(recs688an);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'CONFLICT_HIGHLIGHT_PEAK_UNCAUSED'), 'CONFLICT_HIGHLIGHT_PEAK_UNCAUSED should not fire');
    });

    // CONFLICT_SEED_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; seed scenes at 0,1,2 → 100% opening third
    it('CONFLICT_SEED_ZONE_CLUSTER fires when >75% of seed scenes cluster in one third', async () => {
      const recs688b = Array.from({ length: 9 }, (_, i) => makeRec688(i,
        (i === 0 || i === 1 || i === 2) ? { seededClueIds: ['clue-a'] } : {}
      ));
      const res = await runCF688(recs688b);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'CONFLICT_SEED_ZONE_CLUSTER'), 'CONFLICT_SEED_ZONE_CLUSTER should fire');
    });

    // CONFLICT_SEED_ZONE_CLUSTER no-fire:
    // seed scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('CONFLICT_SEED_ZONE_CLUSTER does not fire when seed scenes are distributed across thirds', async () => {
      const recs688bn = Array.from({ length: 9 }, (_, i) => makeRec688(i,
        (i === 0 || i === 4 || i === 7) ? { seededClueIds: ['clue-a'] } : {}
      ));
      const res = await runCF688(recs688bn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'CONFLICT_SEED_ZONE_CLUSTER'), 'CONFLICT_SEED_ZONE_CLUSTER should not fire');
    });

    // CONFLICT_STAGING_DROUGHT_RUN fire:
    // 10 scenes; visual beats at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('CONFLICT_STAGING_DROUGHT_RUN fires when the longest no-visual-beat run is ≥6', async () => {
      const recs688c = Array.from({ length: 10 }, (_, i) => makeRec688(i,
        (i === 0 || i === 1 || i === 2 || i === 9) ? { visualBeats: ['a beat'] } : {}
      ));
      const res = await runCF688(recs688c);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'CONFLICT_STAGING_DROUGHT_RUN'), 'CONFLICT_STAGING_DROUGHT_RUN should fire');
    });

    // CONFLICT_STAGING_DROUGHT_RUN no-fire:
    // visual beats at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('CONFLICT_STAGING_DROUGHT_RUN does not fire when visual beats are distributed without a long drought', async () => {
      const recs688cn = Array.from({ length: 10 }, (_, i) => makeRec688(i,
        (i === 0 || i === 4 || i === 9) ? { visualBeats: ['a beat'] } : {}
      ));
      const res = await runCF688(recs688cn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'CONFLICT_STAGING_DROUGHT_RUN'), 'CONFLICT_STAGING_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 674 — conflictPass: conflict clock delta peak uncaused, conflict highlight drought run, conflict open thread zone cluster', async () => {
    const makeRec674 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF674 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // CONFLICT_CLOCK_DELTA_PEAK_UNCAUSED fire:
    // 8 scenes; clockDelta at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('CONFLICT_CLOCK_DELTA_PEAK_UNCAUSED fires when the peak clockDelta scene has no dramatic turn or revelation nearby', async () => {
      const recs674a = Array.from({ length: 8 }, (_, i) => makeRec674(i,
        i === 2 ? { clockDelta: 1 }
        : i === 6 ? { clockDelta: 5 }
        : {}
      ));
      const res = await runCF674(recs674a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_CLOCK_DELTA_PEAK_UNCAUSED'), 'CONFLICT_CLOCK_DELTA_PEAK_UNCAUSED should fire');
    });

    // CONFLICT_CLOCK_DELTA_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('CONFLICT_CLOCK_DELTA_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs674an = Array.from({ length: 8 }, (_, i) => makeRec674(i,
        i === 2 ? { clockDelta: 1 }
        : i === 5 ? { dramaticTurn: 'reversal' }
        : i === 6 ? { clockDelta: 5 }
        : {}
      ));
      const res = await runCF674(recs674an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_CLOCK_DELTA_PEAK_UNCAUSED'), 'CONFLICT_CLOCK_DELTA_PEAK_UNCAUSED should not fire');
    });

    // CONFLICT_HIGHLIGHT_DROUGHT_RUN fire:
    // 10 scenes; highlights at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('CONFLICT_HIGHLIGHT_DROUGHT_RUN fires when the longest no-highlighted-dialogue run is ≥6', async () => {
      const recs674b = Array.from({ length: 10 }, (_, i) => makeRec674(i,
        (i === 0 || i === 1 || i === 2 || i === 9) ? { dialogueHighlights: ['line-x'] } : {}
      ));
      const res = await runCF674(recs674b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_HIGHLIGHT_DROUGHT_RUN'), 'CONFLICT_HIGHLIGHT_DROUGHT_RUN should fire');
    });

    // CONFLICT_HIGHLIGHT_DROUGHT_RUN no-fire:
    // highlights at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('CONFLICT_HIGHLIGHT_DROUGHT_RUN does not fire when highlighted dialogue is distributed without a long drought', async () => {
      const recs674bn = Array.from({ length: 10 }, (_, i) => makeRec674(i,
        (i === 0 || i === 4 || i === 9) ? { dialogueHighlights: ['line-x'] } : {}
      ));
      const res = await runCF674(recs674bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_HIGHLIGHT_DROUGHT_RUN'), 'CONFLICT_HIGHLIGHT_DROUGHT_RUN should not fire');
    });

    // CONFLICT_OPEN_THREAD_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; open-thread scenes at 0,1,2 → 100% opening third
    it('CONFLICT_OPEN_THREAD_ZONE_CLUSTER fires when >75% of open-thread scenes cluster in one third', async () => {
      const recs674c = Array.from({ length: 9 }, (_, i) => makeRec674(i,
        (i === 0 || i === 1 || i === 2) ? { unresolvedClues: ['a'] } : {}
      ));
      const res = await runCF674(recs674c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_OPEN_THREAD_ZONE_CLUSTER'), 'CONFLICT_OPEN_THREAD_ZONE_CLUSTER should fire');
    });

    // CONFLICT_OPEN_THREAD_ZONE_CLUSTER no-fire:
    // open-thread scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('CONFLICT_OPEN_THREAD_ZONE_CLUSTER does not fire when open-thread scenes are distributed across thirds', async () => {
      const recs674cn = Array.from({ length: 9 }, (_, i) => makeRec674(i,
        (i === 0 || i === 4 || i === 7) ? { unresolvedClues: ['a'] } : {}
      ));
      const res = await runCF674(recs674cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_OPEN_THREAD_ZONE_CLUSTER'), 'CONFLICT_OPEN_THREAD_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 660 — conflictPass: conflict payoff peak uncaused, conflict seed drought run, conflict staging zone cluster', async () => {
    const makeRec660 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF660 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // CONFLICT_PAYOFF_PEAK_UNCAUSED fire:
    // 8 scenes; payoffs at 2 (1 thread) and 6 (5 threads, the peak); no dramaticTurn or revelation
    // at 6, 5, or 4
    it('CONFLICT_PAYOFF_PEAK_UNCAUSED fires when the peak payoff scene has no dramatic turn or revelation nearby', async () => {
      const recs660a = Array.from({ length: 8 }, (_, i) => makeRec660(i,
        i === 2 ? { payoffSetupIds: ['thread-a'] }
        : i === 6 ? { payoffSetupIds: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runCF660(recs660a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_PAYOFF_PEAK_UNCAUSED'), 'CONFLICT_PAYOFF_PEAK_UNCAUSED should fire');
    });

    // CONFLICT_PAYOFF_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('CONFLICT_PAYOFF_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs660an = Array.from({ length: 8 }, (_, i) => makeRec660(i,
        i === 2 ? { payoffSetupIds: ['thread-a'] }
        : i === 5 ? { dramaticTurn: 'reversal' }
        : i === 6 ? { payoffSetupIds: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runCF660(recs660an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_PAYOFF_PEAK_UNCAUSED'), 'CONFLICT_PAYOFF_PEAK_UNCAUSED should not fire');
    });

    // CONFLICT_SEED_DROUGHT_RUN fire:
    // 10 scenes; seeded at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('CONFLICT_SEED_DROUGHT_RUN fires when the longest no-seed run is ≥6', async () => {
      const recs660b = Array.from({ length: 10 }, (_, i) => makeRec660(i,
        (i === 0 || i === 1 || i === 2 || i === 9) ? { seededClueIds: ['clue-x'] } : {}
      ));
      const res = await runCF660(recs660b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_SEED_DROUGHT_RUN'), 'CONFLICT_SEED_DROUGHT_RUN should fire');
    });

    // CONFLICT_SEED_DROUGHT_RUN no-fire:
    // seeded at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('CONFLICT_SEED_DROUGHT_RUN does not fire when seeding is distributed without a long drought', async () => {
      const recs660bn = Array.from({ length: 10 }, (_, i) => makeRec660(i,
        (i === 0 || i === 4 || i === 9) ? { seededClueIds: ['clue-x'] } : {}
      ));
      const res = await runCF660(recs660bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_SEED_DROUGHT_RUN'), 'CONFLICT_SEED_DROUGHT_RUN should not fire');
    });

    // CONFLICT_STAGING_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; visually dense scenes (visualBeats≥2) at 0,1,2 → 100% opening
    // third
    it('CONFLICT_STAGING_ZONE_CLUSTER fires when >75% of visually dense scenes cluster in one third', async () => {
      const recs660c = Array.from({ length: 9 }, (_, i) => makeRec660(i,
        (i === 0 || i === 1 || i === 2) ? { visualBeats: ['a', 'b'] } : {}
      ));
      const res = await runCF660(recs660c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_STAGING_ZONE_CLUSTER'), 'CONFLICT_STAGING_ZONE_CLUSTER should fire');
    });

    // CONFLICT_STAGING_ZONE_CLUSTER no-fire:
    // visually dense scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('CONFLICT_STAGING_ZONE_CLUSTER does not fire when visually dense scenes are distributed across thirds', async () => {
      const recs660cn = Array.from({ length: 9 }, (_, i) => makeRec660(i,
        (i === 0 || i === 4 || i === 7) ? { visualBeats: ['a', 'b'] } : {}
      ));
      const res = await runCF660(recs660cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_STAGING_ZONE_CLUSTER'), 'CONFLICT_STAGING_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 646 — conflictPass: conflict staging peak uncaused, conflict open thread drought run, conflict highlight zone cluster', async () => {
    const makeRec646 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF646 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // CONFLICT_STAGING_PEAK_UNCAUSED fire:
    // 8 scenes; staging at 2 (1 beat) and 6 (5 beats, the peak); no dramaticTurn or revelation at
    // 6, 5, or 4
    it('CONFLICT_STAGING_PEAK_UNCAUSED fires when the peak physical-staging scene has no dramatic turn or revelation nearby', async () => {
      const recs646a = Array.from({ length: 8 }, (_, i) => makeRec646(i,
        i === 2 ? { visualBeats: ['glances at the clock'] }
        : i === 6 ? { visualBeats: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runCF646(recs646a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_STAGING_PEAK_UNCAUSED'), 'CONFLICT_STAGING_PEAK_UNCAUSED should fire');
    });

    // CONFLICT_STAGING_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('CONFLICT_STAGING_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs646an = Array.from({ length: 8 }, (_, i) => makeRec646(i,
        i === 2 ? { visualBeats: ['glances at the clock'] }
        : i === 5 ? { dramaticTurn: 'reversal' }
        : i === 6 ? { visualBeats: ['a', 'b', 'c', 'd', 'e'] }
        : {}
      ));
      const res = await runCF646(recs646an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_STAGING_PEAK_UNCAUSED'), 'CONFLICT_STAGING_PEAK_UNCAUSED should not fire');
    });

    // CONFLICT_OPEN_THREAD_DROUGHT_RUN fire:
    // 10 scenes; debt at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('CONFLICT_OPEN_THREAD_DROUGHT_RUN fires when the longest no-debt run is ≥6', async () => {
      const recs646b = Array.from({ length: 10 }, (_, i) => makeRec646(i,
        i === 0 || i === 1 || i === 2 || i === 9 ? { unresolvedClues: ['a'] } : {}
      ));
      const res = await runCF646(recs646b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_OPEN_THREAD_DROUGHT_RUN'), 'CONFLICT_OPEN_THREAD_DROUGHT_RUN should fire');
    });

    // CONFLICT_OPEN_THREAD_DROUGHT_RUN no-fire:
    // debt at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('CONFLICT_OPEN_THREAD_DROUGHT_RUN does not fire when debt is distributed without a long drought', async () => {
      const recs646bn = Array.from({ length: 10 }, (_, i) => makeRec646(i,
        i === 0 || i === 4 || i === 9 ? { unresolvedClues: ['a'] } : {}
      ));
      const res = await runCF646(recs646bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_OPEN_THREAD_DROUGHT_RUN'), 'CONFLICT_OPEN_THREAD_DROUGHT_RUN should not fire');
    });

    // CONFLICT_HIGHLIGHT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; highlighted-dialogue scenes at 0,1,2 → 100% opening third
    it('CONFLICT_HIGHLIGHT_ZONE_CLUSTER fires when >75% of highlighted-dialogue scenes cluster in one third', async () => {
      const recs646c = Array.from({ length: 9 }, (_, i) => makeRec646(i,
        i === 0 || i === 1 || i === 2 ? { dialogueHighlights: ['line-a'] } : {}
      ));
      const res = await runCF646(recs646c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_HIGHLIGHT_ZONE_CLUSTER'), 'CONFLICT_HIGHLIGHT_ZONE_CLUSTER should fire');
    });

    // CONFLICT_HIGHLIGHT_ZONE_CLUSTER no-fire:
    // highlighted-dialogue scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('CONFLICT_HIGHLIGHT_ZONE_CLUSTER does not fire when highlighted-dialogue scenes are distributed across thirds', async () => {
      const recs646cn = Array.from({ length: 9 }, (_, i) => makeRec646(i,
        i === 0 || i === 4 || i === 7 ? { dialogueHighlights: ['line-a'] } : {}
      ));
      const res = await runCF646(recs646cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_HIGHLIGHT_ZONE_CLUSTER'), 'CONFLICT_HIGHLIGHT_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 632 — conflictPass: conflict highlight open thread decoupled, conflict open thread staging aftermath void, conflict dialogue highlight zone imbalance', async () => {
    const makeRec632 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF632 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // CONFLICT_HIGHLIGHT_OPEN_THREAD_DECOUPLED fire:
    // n=6; highlights at 0,1 (no debt); debt at 4,5 (no highlight) → zero overlap → fires
    it('CONFLICT_HIGHLIGHT_OPEN_THREAD_DECOUPLED fires when dialogue-highlight scenes and open-thread scenes never overlap', async () => {
      const recs632a = Array.from({ length: 6 }, (_, i) => makeRec632(i,
        i === 0 || i === 1 ? { dialogueHighlights: ['line-a'] }
        : i === 4 || i === 5 ? { unresolvedClues: ['unpaid-clue'] }
        : {}
      ));
      const res = await runCF632(recs632a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_HIGHLIGHT_OPEN_THREAD_DECOUPLED'), 'CONFLICT_HIGHLIGHT_OPEN_THREAD_DECOUPLED should fire');
    });

    // CONFLICT_HIGHLIGHT_OPEN_THREAD_DECOUPLED no-fire:
    // scene 0 carries BOTH a highlight and open debt → overlap exists
    it('CONFLICT_HIGHLIGHT_OPEN_THREAD_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs632an = Array.from({ length: 6 }, (_, i) => makeRec632(i,
        i === 0 ? { dialogueHighlights: ['line-a'], unresolvedClues: ['unpaid-clue'] }
        : i === 1 ? { dialogueHighlights: ['line-b'] }
        : i === 5 ? { unresolvedClues: ['unpaid-clue'] }
        : {}
      ));
      const res = await runCF632(recs632an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_HIGHLIGHT_OPEN_THREAD_DECOUPLED'), 'CONFLICT_HIGHLIGHT_OPEN_THREAD_DECOUPLED should not fire');
    });

    // CONFLICT_OPEN_THREAD_STAGING_AFTERMATH_VOID fire:
    // n=8, window=2; heavy clue-debt triggers at 0,1; their windows {1,2} and {2,3} carry no
    // visually dense scene; staged scenes exist elsewhere at 5,6,7 → fires
    it('CONFLICT_OPEN_THREAD_STAGING_AFTERMATH_VOID fires when heavy clue-debt scenes are never followed by a visually dense scene', async () => {
      const recs632b = Array.from({ length: 8 }, (_, i) => makeRec632(i,
        i === 0 || i === 1 ? { unresolvedClues: ['c1', 'c2', 'c3'] }
        : i === 5 || i === 6 || i === 7 ? { visualBeats: ['slams the fist', 'kicks the table'] }
        : {}
      ));
      const res = await runCF632(recs632b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_OPEN_THREAD_STAGING_AFTERMATH_VOID'), 'CONFLICT_OPEN_THREAD_STAGING_AFTERMATH_VOID should fire');
    });

    // CONFLICT_OPEN_THREAD_STAGING_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries staging → that trigger's aftermath
    // is no longer void
    it('CONFLICT_OPEN_THREAD_STAGING_AFTERMATH_VOID does not fire when a trigger window contains a visually dense scene', async () => {
      const recs632bn = Array.from({ length: 8 }, (_, i) => makeRec632(i,
        i === 0 || i === 1 ? { unresolvedClues: ['c1', 'c2', 'c3'] }
        : i === 3 || i === 5 || i === 6 || i === 7 ? { visualBeats: ['slams the fist', 'kicks the table'] }
        : {}
      ));
      const res = await runCF632(recs632bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_OPEN_THREAD_STAGING_AFTERMATH_VOID'), 'CONFLICT_OPEN_THREAD_STAGING_AFTERMATH_VOID should not fire');
    });

    // CONFLICT_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); highlights at 6,7,8,9; zone 2 (6-8)=3, zone 3 (9)=1, total=4;
    // zones 0,1 empty; bloatZoneIdx=zone2, 3/4=75% ≥ 50% → fires
    it('CONFLICT_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE fires when one zone is empty of dialogue highlights while another is bloated', async () => {
      const recs632c = Array.from({ length: 12 }, (_, i) => makeRec632(i, {
        dialogueHighlights: (i === 6 || i === 7 || i === 8 || i === 9) ? ['line'] : [],
      }));
      const res = await runCF632(recs632c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE'), 'CONFLICT_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE should fire');
    });

    // CONFLICT_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE no-fire:
    // one highlight per zone (1,4,7,10) → no zone is empty
    it('CONFLICT_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE does not fire when highlights are spread across all zones', async () => {
      const recs632cn = Array.from({ length: 12 }, (_, i) => makeRec632(i, {
        dialogueHighlights: (i === 1 || i === 4 || i === 7 || i === 10) ? ['line'] : [],
      }));
      const res = await runCF632(recs632cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE'), 'CONFLICT_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 618 — conflictPass: conflict payoff staging decoupled, conflict payoff zone imbalance, conflict turn staging aftermath void', async () => {
    const makeRec618 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF618 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // CONFLICT_PAYOFF_STAGING_DECOUPLED fire:
    // n=6; payoffs at 0,1 (no staging); staged at 4,5 (no payoff) → zero overlap → fires
    it('CONFLICT_PAYOFF_STAGING_DECOUPLED fires when payoff scenes and visually-staged scenes never overlap', async () => {
      const recs618a = Array.from({ length: 6 }, (_, i) => makeRec618(i,
        i === 0 || i === 1 ? { payoffSetupIds: ['thread-a'] }
        : i === 4 || i === 5 ? { visualBeats: ['throws the punch', 'wipes the blood'] }
        : {}
      ));
      const res = await runCF618(recs618a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_PAYOFF_STAGING_DECOUPLED'), 'CONFLICT_PAYOFF_STAGING_DECOUPLED should fire');
    });

    // CONFLICT_PAYOFF_STAGING_DECOUPLED no-fire:
    // scene 0 carries BOTH a payoff and visual staging → overlap exists
    it('CONFLICT_PAYOFF_STAGING_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs618an = Array.from({ length: 6 }, (_, i) => makeRec618(i,
        i === 0 ? { payoffSetupIds: ['thread-a'], visualBeats: ['throws the punch', 'wipes the blood'] }
        : i === 1 ? { payoffSetupIds: ['thread-b'] }
        : i === 5 ? { visualBeats: ['throws the punch', 'wipes the blood'] }
        : {}
      ));
      const res = await runCF618(recs618an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_PAYOFF_STAGING_DECOUPLED'), 'CONFLICT_PAYOFF_STAGING_DECOUPLED should not fire');
    });

    // CONFLICT_PAYOFF_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); payoffs at 6,7,8,9; zones 0 (0-2) and 1 (3-5) are empty;
    // zone 3 holds (7,8,9 wait) — zone 2 (6,7,8)=3, zone 3 (9)=1, bloatZoneIdx=zone2, 3/4=75%
    it('CONFLICT_PAYOFF_ZONE_IMBALANCE fires when one zone is empty of payoffs while another is bloated', async () => {
      const recs618b = Array.from({ length: 12 }, (_, i) => makeRec618(i, {
        payoffSetupIds: (i === 6 || i === 7 || i === 8 || i === 9) ? ['thread'] : [],
      }));
      const res = await runCF618(recs618b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_PAYOFF_ZONE_IMBALANCE'), 'CONFLICT_PAYOFF_ZONE_IMBALANCE should fire');
    });

    // CONFLICT_PAYOFF_ZONE_IMBALANCE no-fire:
    // one payoff per zone (1,4,7,10) → no zone is empty
    it('CONFLICT_PAYOFF_ZONE_IMBALANCE does not fire when payoffs are spread across all zones', async () => {
      const recs618bn = Array.from({ length: 12 }, (_, i) => makeRec618(i, {
        payoffSetupIds: (i === 1 || i === 4 || i === 7 || i === 10) ? ['thread'] : [],
      }));
      const res = await runCF618(recs618bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_PAYOFF_ZONE_IMBALANCE'), 'CONFLICT_PAYOFF_ZONE_IMBALANCE should not fire');
    });

    // CONFLICT_TURN_STAGING_AFTERMATH_VOID fire:
    // n=8, window=2; turn triggers at 0,1; their windows {1,2} and {2,3} carry no visually dense
    // scene; staged scenes exist elsewhere at 5,6,7 → fires
    it('CONFLICT_TURN_STAGING_AFTERMATH_VOID fires when no dramatic turn is followed by a visually dense scene within 2 scenes', async () => {
      const recs618c = Array.from({ length: 8 }, (_, i) => makeRec618(i,
        i === 0 || i === 1 ? { dramaticTurn: 'reversal' }
        : i === 5 || i === 6 || i === 7 ? { visualBeats: ['throws the punch', 'wipes the blood'] }
        : {}
      ));
      const res = await runCF618(recs618c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_TURN_STAGING_AFTERMATH_VOID'), 'CONFLICT_TURN_STAGING_AFTERMATH_VOID should fire');
    });

    // CONFLICT_TURN_STAGING_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries staging → that trigger's aftermath
    // is no longer void
    it('CONFLICT_TURN_STAGING_AFTERMATH_VOID does not fire when a trigger window contains a visually dense scene', async () => {
      const recs618cn = Array.from({ length: 8 }, (_, i) => makeRec618(i,
        i === 0 || i === 1 ? { dramaticTurn: 'reversal' }
        : i === 3 || i === 5 || i === 6 || i === 7 ? { visualBeats: ['throws the punch', 'wipes the blood'] }
        : {}
      ));
      const res = await runCF618(recs618cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_TURN_STAGING_AFTERMATH_VOID'), 'CONFLICT_TURN_STAGING_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 604 — conflictPass: open thread rupture decoupled, visual conflict zone imbalance, open thread repair aftermath void', async () => {
    const makeRec604 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], visualBeats: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF604 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // OPEN_THREAD_RUPTURE_DECOUPLED fire:
    // n=8; open threads at 0,1 (no rupture); ruptures at 2,3 (no open thread) → zero overlap → fires
    it('OPEN_THREAD_RUPTURE_DECOUPLED fires when open-thread scenes and rupture scenes never overlap', async () => {
      const recs604a = Array.from({ length: 8 }, (_, i) => makeRec604(i,
        i === 0 || i === 1 ? { unresolvedClues: ['unpaid-clue'] }
        : i === 2 || i === 3 ? { relationshipShifts: [{ pairKey: 'alice|bob', amount: -0.5 }] }
        : {}
      ));
      const res = await runCF604(recs604a);
      assert.ok(res.issues.some((i: any) => i.rule === 'OPEN_THREAD_RUPTURE_DECOUPLED'), 'OPEN_THREAD_RUPTURE_DECOUPLED should fire');
    });

    // OPEN_THREAD_RUPTURE_DECOUPLED no-fire:
    // scene 2 carries BOTH an open thread and a rupture → overlap exists
    it('OPEN_THREAD_RUPTURE_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs604an = Array.from({ length: 8 }, (_, i) => makeRec604(i,
        i === 0 || i === 1 ? { unresolvedClues: ['unpaid-clue'] }
        : i === 2 ? { unresolvedClues: ['unpaid-clue'], relationshipShifts: [{ pairKey: 'alice|bob', amount: -0.5 }] }
        : i === 3 ? { relationshipShifts: [{ pairKey: 'alice|bob', amount: -0.5 }] }
        : {}
      ));
      const res = await runCF604(recs604an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'OPEN_THREAD_RUPTURE_DECOUPLED'), 'OPEN_THREAD_RUPTURE_DECOUPLED should not fire');
    });

    // VISUAL_CONFLICT_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); visually dense scenes (visualBeats≥2) at 6,9,10,11;
    // zones 0 (0-2) and 1 (3-5) are empty; zone 3 (9-11) holds 3/4 = 75% ≥ 50% → fires
    it('VISUAL_CONFLICT_ZONE_IMBALANCE fires when one zone is empty of visually dense scenes while another is bloated', async () => {
      const recs604b = Array.from({ length: 12 }, (_, i) => makeRec604(i, {
        visualBeats: (i === 6 || i === 9 || i === 10 || i === 11) ? ['draws a weapon', 'lunges forward'] : [],
      }));
      const res = await runCF604(recs604b);
      assert.ok(res.issues.some((i: any) => i.rule === 'VISUAL_CONFLICT_ZONE_IMBALANCE'), 'VISUAL_CONFLICT_ZONE_IMBALANCE should fire');
    });

    // VISUAL_CONFLICT_ZONE_IMBALANCE no-fire:
    // one visually dense scene per zone (1,4,7,10) → no zone is empty
    it('VISUAL_CONFLICT_ZONE_IMBALANCE does not fire when every zone has a visually dense scene', async () => {
      const recs604bn = Array.from({ length: 12 }, (_, i) => makeRec604(i, {
        visualBeats: (i === 1 || i === 4 || i === 7 || i === 10) ? ['draws a weapon', 'lunges forward'] : [],
      }));
      const res = await runCF604(recs604bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VISUAL_CONFLICT_ZONE_IMBALANCE'), 'VISUAL_CONFLICT_ZONE_IMBALANCE should not fire');
    });

    // OPEN_THREAD_REPAIR_AFTERMATH_VOID fire:
    // n=8, window=2; heavy clue-debt triggers at 0,1; their windows {1,2} and {2,3} carry no
    // repair; repairs exist elsewhere at 5,6,7 → fires
    it('OPEN_THREAD_REPAIR_AFTERMATH_VOID fires when heavy clue-debt scenes are never followed by a repair', async () => {
      const recs604c = Array.from({ length: 8 }, (_, i) => makeRec604(i,
        i === 0 || i === 1 ? { unresolvedClues: ['c1', 'c2', 'c3'] }
        : i === 5 || i === 6 || i === 7 ? { relationshipShifts: [{ pairKey: 'alice|bob', amount: 0.5 }] }
        : {}
      ));
      const res = await runCF604(recs604c);
      assert.ok(res.issues.some((i: any) => i.rule === 'OPEN_THREAD_REPAIR_AFTERMATH_VOID'), 'OPEN_THREAD_REPAIR_AFTERMATH_VOID should fire');
    });

    // OPEN_THREAD_REPAIR_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries a repair → that trigger's aftermath
    // is no longer void
    it('OPEN_THREAD_REPAIR_AFTERMATH_VOID does not fire when a trigger window contains a repair', async () => {
      const recs604cn = Array.from({ length: 8 }, (_, i) => makeRec604(i,
        i === 0 || i === 1 ? { unresolvedClues: ['c1', 'c2', 'c3'] }
        : i === 3 || i === 5 || i === 6 || i === 7 ? { relationshipShifts: [{ pairKey: 'alice|bob', amount: 0.5 }] }
        : {}
      ));
      const res = await runCF604(recs604cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'OPEN_THREAD_REPAIR_AFTERMATH_VOID'), 'OPEN_THREAD_REPAIR_AFTERMATH_VOID should not fire');
    });
  });


  describe('Wave 590 — conflictPass: seed suspense aftermath void, clock turn aftermath void, rupture drought run', async () => {
    const makeRec590 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF590 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    it('CONFLICT_SEED_SUSPENSE_AFTERMATH_VOID fires when no seed is followed by suspense within 2 scenes', async () => {
      // 9 scenes; seeds at 1,4 (qualifying pos<8); suspense at 7,8 (beyond windows [2,3] and [5,6])
      const recs590a = Array.from({ length: 9 }, (_, i) => makeRec590(i));
      recs590a[1] = makeRec590(1, { seededClueIds: ['clue1'] });
      recs590a[4] = makeRec590(4, { seededClueIds: ['clue2'] });
      recs590a[7] = makeRec590(7, { suspenseDelta: 1 });
      recs590a[8] = makeRec590(8, { suspenseDelta: 1 });
      const res = await runCF590(recs590a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_SEED_SUSPENSE_AFTERMATH_VOID'), 'CONFLICT_SEED_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('CONFLICT_SEED_SUSPENSE_AFTERMATH_VOID does not fire when a seed is followed by suspense within 2 scenes', async () => {
      // seed at 1 with suspense at 2 (off=1, within window) → every() fails → no fire
      const recs590a = Array.from({ length: 9 }, (_, i) => makeRec590(i));
      recs590a[1] = makeRec590(1, { seededClueIds: ['clue1'] });
      recs590a[2] = makeRec590(2, { suspenseDelta: 1 });
      recs590a[4] = makeRec590(4, { seededClueIds: ['clue2'] });
      recs590a[7] = makeRec590(7, { suspenseDelta: 1 });
      const res = await runCF590(recs590a);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_SEED_SUSPENSE_AFTERMATH_VOID'), 'CONFLICT_SEED_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    it('CONFLICT_CLOCK_TURN_AFTERMATH_VOID fires when no clock is followed by a dramatic turn within 2 scenes', async () => {
      // clocks at 1,4 (windows: [2,3] and [5,6]); turns at 7,8 — outside both windows
      const recs590b = Array.from({ length: 9 }, (_, i) => makeRec590(i));
      recs590b[1] = makeRec590(1, { clockRaised: true });
      recs590b[4] = makeRec590(4, { clockRaised: true });
      recs590b[7] = makeRec590(7, { dramaticTurn: 'reversal' });
      recs590b[8] = makeRec590(8, { dramaticTurn: 'revelation' });
      const res = await runCF590(recs590b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_CLOCK_TURN_AFTERMATH_VOID'), 'CONFLICT_CLOCK_TURN_AFTERMATH_VOID should fire');
    });

    it('CONFLICT_CLOCK_TURN_AFTERMATH_VOID does not fire when a clock is followed by a dramatic turn within 2 scenes', async () => {
      // clock at 1 with turn at 2 (off=1, within window) → every() fails → no fire
      const recs590b = Array.from({ length: 9 }, (_, i) => makeRec590(i));
      recs590b[1] = makeRec590(1, { clockRaised: true });
      recs590b[2] = makeRec590(2, { dramaticTurn: 'reversal' });
      recs590b[4] = makeRec590(4, { clockRaised: true });
      recs590b[7] = makeRec590(7, { dramaticTurn: 'revelation' });
      const res = await runCF590(recs590b);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_CLOCK_TURN_AFTERMATH_VOID'), 'CONFLICT_CLOCK_TURN_AFTERMATH_VOID should not fire');
    });

    it('CONFLICT_RUPTURE_DROUGHT_RUN fires when ≥7 consecutive scenes have no rupture', async () => {
      // 10 scenes; ruptures at 0 and 8; non-rupture run 1-7 = 7 consecutive scenes
      const recs590c = Array.from({ length: 10 }, (_, i) => makeRec590(i));
      recs590c[0] = makeRec590(0, { relationshipShifts: [{ pairKey: 'alice|bob', amount: -0.5 }] });
      recs590c[8] = makeRec590(8, { relationshipShifts: [{ pairKey: 'alice|bob', amount: -0.5 }] });
      const res = await runCF590(recs590c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_RUPTURE_DROUGHT_RUN'), 'CONFLICT_RUPTURE_DROUGHT_RUN should fire');
    });

    it('CONFLICT_RUPTURE_DROUGHT_RUN does not fire when ruptures are distributed without a long drought', async () => {
      // ruptures at 0,4,9 → max non-rupture run = 4 scenes (scenes 5-8) < 7
      const recs590c = Array.from({ length: 10 }, (_, i) => makeRec590(i));
      recs590c[0] = makeRec590(0, { relationshipShifts: [{ pairKey: 'alice|bob', amount: -0.5 }] });
      recs590c[4] = makeRec590(4, { relationshipShifts: [{ pairKey: 'alice|bob', amount: -0.5 }] });
      recs590c[9] = makeRec590(9, { relationshipShifts: [{ pairKey: 'alice|bob', amount: -0.5 }] });
      const res = await runCF590(recs590c);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_RUPTURE_DROUGHT_RUN'), 'CONFLICT_RUPTURE_DROUGHT_RUN should not fire');
    });
  });


  describe('Wave 576 — conflictPass: curiosity zone cluster, turn aftermath suspense void, revelation drought run', async () => {
    const makeRec576 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF576 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    it('CONFLICT_CURIOSITY_ZONE_CLUSTER fires when >75% of curiosity spikes cluster in one third', async () => {
      // 9 scenes; thirds=[0-2],[3-5],[6-8]; curiosity at 6,7,8 → 100% in closing third
      const recs576a = Array.from({ length: 9 }, (_, i) => makeRec576(i));
      recs576a[6] = makeRec576(6, { curiosityDelta: 1 });
      recs576a[7] = makeRec576(7, { curiosityDelta: 1 });
      recs576a[8] = makeRec576(8, { curiosityDelta: 1 });
      const res = await runCF576(recs576a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_CURIOSITY_ZONE_CLUSTER'), 'CONFLICT_CURIOSITY_ZONE_CLUSTER should fire');
    });

    it('CONFLICT_CURIOSITY_ZONE_CLUSTER does not fire when curiosity is distributed across thirds', async () => {
      // one curiosity spike per third (1, 4, 7) → maxZone/total = 1/3
      const recs576a = Array.from({ length: 9 }, (_, i) => makeRec576(i));
      recs576a[1] = makeRec576(1, { curiosityDelta: 1 });
      recs576a[4] = makeRec576(4, { curiosityDelta: 1 });
      recs576a[7] = makeRec576(7, { curiosityDelta: 1 });
      const res = await runCF576(recs576a);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_CURIOSITY_ZONE_CLUSTER'), 'CONFLICT_CURIOSITY_ZONE_CLUSTER should not fire');
    });

    it('CONFLICT_TURN_AFTERMATH_SUSPENSE_VOID fires when no turn is followed by suspense within 2 scenes', async () => {
      // n=9; turns at pos 1,4; suspense at 7 (not within 2 of 1 or 4)
      const recs576b = Array.from({ length: 9 }, (_, i) => makeRec576(i));
      recs576b[1] = makeRec576(1, { dramaticTurn: 'reversal' });
      recs576b[4] = makeRec576(4, { dramaticTurn: 'revelation' });
      recs576b[7] = makeRec576(7, { suspenseDelta: 1 });
      recs576b[8] = makeRec576(8, { suspenseDelta: 1 });
      const res = await runCF576(recs576b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_TURN_AFTERMATH_SUSPENSE_VOID'), 'CONFLICT_TURN_AFTERMATH_SUSPENSE_VOID should fire');
    });

    it('CONFLICT_TURN_AFTERMATH_SUSPENSE_VOID does not fire when a turn is followed by suspense within 2 scenes', async () => {
      // turn at 1; suspense at 2 (within 1 scene) → condition satisfied → no fire
      const recs576b = Array.from({ length: 9 }, (_, i) => makeRec576(i));
      recs576b[1] = makeRec576(1, { dramaticTurn: 'reversal' });
      recs576b[2] = makeRec576(2, { suspenseDelta: 1 });
      recs576b[4] = makeRec576(4, { dramaticTurn: 'revelation' });
      recs576b[7] = makeRec576(7, { suspenseDelta: 1 });
      const res = await runCF576(recs576b);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_TURN_AFTERMATH_SUSPENSE_VOID'), 'CONFLICT_TURN_AFTERMATH_SUSPENSE_VOID should not fire');
    });

    it('CONFLICT_REVELATION_DROUGHT_RUN fires when ≥7 consecutive scenes have no revelation', async () => {
      // 10 scenes; revelations at 0 and 8; non-revelation run 1-7 = 7 consecutive
      const recs576c = Array.from({ length: 10 }, (_, i) => makeRec576(i));
      recs576c[0] = makeRec576(0, { revelation: 'She knew the truth.' });
      recs576c[8] = makeRec576(8, { revelation: 'He was lying all along.' });
      const res = await runCF576(recs576c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_REVELATION_DROUGHT_RUN'), 'CONFLICT_REVELATION_DROUGHT_RUN should fire');
    });

    it('CONFLICT_REVELATION_DROUGHT_RUN does not fire when revelations are distributed without a long drought', async () => {
      // revelations at 0,4,8 → max non-revelation run = 3 scenes < 7
      const recs576c = Array.from({ length: 10 }, (_, i) => makeRec576(i));
      recs576c[0] = makeRec576(0, { revelation: 'Discovery A.' });
      recs576c[4] = makeRec576(4, { revelation: 'Discovery B.' });
      recs576c[8] = makeRec576(8, { revelation: 'Discovery C.' });
      const res = await runCF576(recs576c);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_REVELATION_DROUGHT_RUN'), 'CONFLICT_REVELATION_DROUGHT_RUN should not fire');
    });
  });


  describe('Wave 562 — conflictPass: repair drought run, repair emotion decoupled, repair curiosity aftermath void', async () => {
    const rep562 = (amount: number) => [{ pairKey: 'A|B', dimension: 'trust', amount }];
    const makeRec562 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF562 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // CONFLICT_REPAIR_DROUGHT_RUN fire:
    // n=12; repairs at idx 0,1 (+0.5); idx 2-11 no repair → run of 10 ≥6 → fires
    it('CONFLICT_REPAIR_DROUGHT_RUN fires when a run of 6+ consecutive scenes has no bond repair', async () => {
      const recs562a = Array.from({ length: 12 }, (_, i) =>
        makeRec562(i, { relationshipShifts: [0, 1].includes(i) ? rep562(0.5) : [] }),
      );
      const res = await runCF562(recs562a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_REPAIR_DROUGHT_RUN'), 'CONFLICT_REPAIR_DROUGHT_RUN should fire');
    });

    // CONFLICT_REPAIR_DROUGHT_RUN no-fire:
    // n=12; repairs at idx 0,5,11 → longest non-repair run is idx 6..10 (5) < 6 → no fire
    it('CONFLICT_REPAIR_DROUGHT_RUN does not fire when no non-repair run reaches 6 scenes', async () => {
      const recs562anr = Array.from({ length: 12 }, (_, i) =>
        makeRec562(i, { relationshipShifts: [0, 5, 11].includes(i) ? rep562(0.5) : [] }),
      );
      const res = await runCF562(recs562anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_REPAIR_DROUGHT_RUN'), 'CONFLICT_REPAIR_DROUGHT_RUN should not fire');
    });

    // CONFLICT_REPAIR_EMOTION_DECOUPLED fire:
    // n=8; repairs at idx 1,3,5 all neutral; non-repair scenes idx 0 (positive), idx 2 (negative) carry emotion → fires
    it('CONFLICT_REPAIR_EMOTION_DECOUPLED fires when all repair scenes are emotionally neutral while emotion exists elsewhere', async () => {
      const recs562b = Array.from({ length: 8 }, (_, i) =>
        makeRec562(i, {
          relationshipShifts: [1, 3, 5].includes(i) ? rep562(0.5) : [],
          emotionalShift: i === 0 ? 'positive' : i === 2 ? 'negative' : 'neutral',
        }),
      );
      const res = await runCF562(recs562b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_REPAIR_EMOTION_DECOUPLED'), 'CONFLICT_REPAIR_EMOTION_DECOUPLED should fire');
    });

    // CONFLICT_REPAIR_EMOTION_DECOUPLED no-fire:
    // same but repair scene idx 3 carries emotion (positive) → not all repairs neutral → no fire
    it('CONFLICT_REPAIR_EMOTION_DECOUPLED does not fire when a repair scene carries emotion', async () => {
      const recs562bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec562(i, {
          relationshipShifts: [1, 3, 5].includes(i) ? rep562(0.5) : [],
          emotionalShift: i === 0 ? 'positive' : i === 2 ? 'negative' : i === 3 ? 'positive' : 'neutral',
        }),
      );
      const res = await runCF562(recs562bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_REPAIR_EMOTION_DECOUPLED'), 'CONFLICT_REPAIR_EMOTION_DECOUPLED should not fire');
    });

    // CONFLICT_REPAIR_CURIOSITY_AFTERMATH_VOID fire:
    // n=8; repairs at idx 1,3 (not last); curiosity at idx 6,7 (≥2 globally, outside aftermath windows) → all void → fires
    it('CONFLICT_REPAIR_CURIOSITY_AFTERMATH_VOID fires when no repair is followed by a curiosity rise within 2 scenes', async () => {
      const recs562c = Array.from({ length: 8 }, (_, i) =>
        makeRec562(i, {
          relationshipShifts: [1, 3].includes(i) ? rep562(0.5) : [],
          curiosityDelta: [6, 7].includes(i) ? 2 : 0,
        }),
      );
      const res = await runCF562(recs562c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_REPAIR_CURIOSITY_AFTERMATH_VOID'), 'CONFLICT_REPAIR_CURIOSITY_AFTERMATH_VOID should fire');
    });

    // CONFLICT_REPAIR_CURIOSITY_AFTERMATH_VOID no-fire:
    // n=8; repairs at idx 1,3; curiosity at idx 2 (in aftermath of repair at idx 1) and idx 7 → not all void → no fire
    it('CONFLICT_REPAIR_CURIOSITY_AFTERMATH_VOID does not fire when a repair aftermath raises curiosity', async () => {
      const recs562cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec562(i, {
          relationshipShifts: [1, 3].includes(i) ? rep562(0.5) : [],
          curiosityDelta: [2, 7].includes(i) ? 2 : 0,
        }),
      );
      const res = await runCF562(recs562cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_REPAIR_CURIOSITY_AFTERMATH_VOID'), 'CONFLICT_REPAIR_CURIOSITY_AFTERMATH_VOID should not fire');
    });
  });


  describe('Wave 548 — conflictPass: peak repair uncaused, closing clock absent, seed repair decoupled', async () => {
    const rup548 = (amount: number) => [{ pairKey: 'A|B', dimension: 'trust', amount }];
    const makeRec548 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF548 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    it('CONFLICT_PEAK_REPAIR_UNCAUSED fires when the peak repair has no cause in prior 2 scenes', async () => {
      // n=8; repairs at idx 4 (+0.8) and idx 6 (+0.4); peak=idx 4.
      // Prior scenes 2 and 3: no rupture, no revelation, no turn, no clock → uncaused → fires.
      const recs548a = Array.from({ length: 8 }, (_, i) =>
        makeRec548(i, {
          relationshipShifts: i === 4 ? rup548(0.8) : i === 6 ? rup548(0.4) : [],
        }),
      );
      const res = await runCF548(recs548a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_PEAK_REPAIR_UNCAUSED'), 'CONFLICT_PEAK_REPAIR_UNCAUSED should fire');
    });

    it('CONFLICT_PEAK_REPAIR_UNCAUSED does not fire when peak repair has a revelation in prior scene', async () => {
      // n=8; peak repair at idx 5 (+0.8); prior scene idx 4 has revelation → caused → no fire.
      const recs548an = Array.from({ length: 8 }, (_, i) =>
        makeRec548(i, {
          relationshipShifts: i === 5 ? rup548(0.8) : i === 7 ? rup548(0.4) : [],
          revelation: i === 4 ? 'they knew all along' : null,
        }),
      );
      const res = await runCF548(recs548an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_PEAK_REPAIR_UNCAUSED'), 'CONFLICT_PEAK_REPAIR_UNCAUSED should not fire');
    });

    it('CONFLICT_CLOSING_CLOCK_ABSENT fires when ≥2 clocks in first two-thirds and none in final third', async () => {
      // n=9; third=3; clocks at idx 1 and 3 (both in first two-thirds 0-5); none in 6-8 → fires.
      const recs548b = Array.from({ length: 9 }, (_, i) =>
        makeRec548(i, { clockRaised: i === 1 || i === 3 }),
      );
      const res = await runCF548(recs548b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_CLOSING_CLOCK_ABSENT'), 'CONFLICT_CLOSING_CLOCK_ABSENT should fire');
    });

    it('CONFLICT_CLOSING_CLOCK_ABSENT does not fire when a clock is raised in the final third', async () => {
      // n=9; third=3; clocks at idx 1, 3 (opening two-thirds) and idx 7 (final third, idx≥6) → no fire.
      const recs548bn = Array.from({ length: 9 }, (_, i) =>
        makeRec548(i, { clockRaised: i === 1 || i === 3 || i === 7 }),
      );
      const res = await runCF548(recs548bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_CLOSING_CLOCK_ABSENT'), 'CONFLICT_CLOSING_CLOCK_ABSENT should not fire');
    });

    it('CONFLICT_SEED_REPAIR_DECOUPLED fires when seed and repair never share a scene', async () => {
      // n=8; seeds at idx 1 and 3; repairs (positive shifts) at idx 5 and 6 — zero overlap → fires.
      const recs548c = Array.from({ length: 8 }, (_, i) =>
        makeRec548(i, {
          seededClueIds: i === 1 || i === 3 ? ['clue1'] : [],
          relationshipShifts: i === 5 || i === 6 ? rup548(0.5) : [],
        }),
      );
      const res = await runCF548(recs548c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_SEED_REPAIR_DECOUPLED'), 'CONFLICT_SEED_REPAIR_DECOUPLED should fire');
    });

    it('CONFLICT_SEED_REPAIR_DECOUPLED does not fire when one scene has both seed and repair', async () => {
      // n=8; seed and repair co-occur at idx 3 (seededClueIds + positive shift); seed at idx 1, repair at idx 5 → overlap → no fire.
      const recs548cn = Array.from({ length: 8 }, (_, i) =>
        makeRec548(i, {
          seededClueIds: i === 1 || i === 3 ? ['clue1'] : [],
          relationshipShifts: i === 3 || i === 5 ? rup548(0.5) : [],
        }),
      );
      const res = await runCF548(recs548cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_SEED_REPAIR_DECOUPLED'), 'CONFLICT_SEED_REPAIR_DECOUPLED should not fire');
    });
  });


  describe('Wave 534 — conflictPass: clock rupture decoupled, rupture curiosity void, curiosity front-loaded', async () => {
    const rup534 = (amount: number) => [{ pairKey: 'A|B', dimension: 'trust', amount }];
    const makeRec534 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF534 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    it('CONFLICT_CLOCK_RUPTURE_DECOUPLED fires when clock and rupture scenes never overlap', async () => {
      // 8 scenes: clock at pos 0,1 (no rupture); rupture at pos 4,6 (no clock) → no overlap → fires
      const recs534a = Array.from({ length: 8 }, (_, i) =>
        makeRec534(i, {
          clockRaised: [0, 1].includes(i),
          relationshipShifts: [4, 6].includes(i) ? rup534(-0.5) : [],
        })
      );
      const res = await runCF534(recs534a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_CLOCK_RUPTURE_DECOUPLED'), 'CONFLICT_CLOCK_RUPTURE_DECOUPLED should fire');
    });

    it('CONFLICT_CLOCK_RUPTURE_DECOUPLED does not fire when a clock scene also has a rupture', async () => {
      // Same but pos 1 has both clockRaised AND rupture → overlap → no fire
      const recs534anr = Array.from({ length: 8 }, (_, i) =>
        makeRec534(i, {
          clockRaised: [0, 1].includes(i),
          relationshipShifts: [1, 4, 6].includes(i) ? rup534(-0.5) : [],
        })
      );
      const res = await runCF534(recs534anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_CLOCK_RUPTURE_DECOUPLED'), 'CONFLICT_CLOCK_RUPTURE_DECOUPLED should not fire');
    });

    it('CONFLICT_RUPTURE_CURIOSITY_VOID fires when all rupture scenes have curiosityDelta ≤ 0', async () => {
      // 8 scenes: ruptures at pos 2,5 (curiosityDelta=0); curiosity scenes at pos 0,3 (curiosityDelta=1)
      // → no rupture has curiosity → fires
      const recs534b = Array.from({ length: 8 }, (_, i) =>
        makeRec534(i, {
          relationshipShifts: [2, 5].includes(i) ? rup534(-0.4) : [],
          curiosityDelta: [0, 3].includes(i) ? 1 : 0,
        })
      );
      const res = await runCF534(recs534b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_RUPTURE_CURIOSITY_VOID'), 'CONFLICT_RUPTURE_CURIOSITY_VOID should fire');
    });

    it('CONFLICT_RUPTURE_CURIOSITY_VOID does not fire when a rupture scene has positive curiosityDelta', async () => {
      // Same but pos 2 (rupture) now has curiosityDelta=1 → anyRuptureHasCuriosity=true → no fire
      const recs534bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec534(i, {
          relationshipShifts: [2, 5].includes(i) ? rup534(-0.4) : [],
          curiosityDelta: [0, 2, 3].includes(i) ? 1 : 0,
        })
      );
      const res = await runCF534(recs534bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_RUPTURE_CURIOSITY_VOID'), 'CONFLICT_RUPTURE_CURIOSITY_VOID should not fire');
    });

    it('CONFLICT_CURIOSITY_FRONT_LOADED fires when >70% of curiosity scenes are in first half', async () => {
      // 10 scenes; half=5; curiosityDelta>0 at pos 0,1,2,8 → frontCount=3, backCount=1; 3/4=75% > 70% → fires
      const recs534c = Array.from({ length: 10 }, (_, i) =>
        makeRec534(i, { curiosityDelta: [0, 1, 2, 8].includes(i) ? 1 : 0 })
      );
      const res = await runCF534(recs534c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_CURIOSITY_FRONT_LOADED'), 'CONFLICT_CURIOSITY_FRONT_LOADED should fire');
    });

    it('CONFLICT_CURIOSITY_FRONT_LOADED does not fire when curiosity is spread across both halves', async () => {
      // 10 scenes; half=5; curiosityDelta>0 at pos 0,1,6,7 → frontCount=2, backCount=2; 2/4=50% ≤ 70% → no fire
      const recs534cnr = Array.from({ length: 10 }, (_, i) =>
        makeRec534(i, { curiosityDelta: [0, 1, 6, 7].includes(i) ? 1 : 0 })
      );
      const res = await runCF534(recs534cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_CURIOSITY_FRONT_LOADED'), 'CONFLICT_CURIOSITY_FRONT_LOADED should not fire');
    });
  });


  describe('Wave 520 — conflictPass: rupture payoff aftermath void, repair front-loaded, curiosity closing zone absent', async () => {
    const rup520 = (amount: number) => [{ pairKey: 'A|B', dimension: 'trust', amount }];
    const makeRec520 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF520 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    it('CONFLICT_RUPTURE_PAYOFF_AFTERMATH_VOID fires when every rupture aftermath has no payoff', async () => {
      // 10 scenes: ruptures at 1,3; payoffs at 6,8 — no payoff in 2-scene windows after ruptures
      const recs520a = Array.from({ length: 10 }, (_, i) =>
        makeRec520(i, {
          relationshipShifts: [1, 3].includes(i) ? rup520(-0.5) : [],
          payoffSetupIds: [6, 8].includes(i) ? ['setup1'] : [],
        }),
      );
      const res = await runCF520(recs520a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_RUPTURE_PAYOFF_AFTERMATH_VOID'), 'CONFLICT_RUPTURE_PAYOFF_AFTERMATH_VOID should fire');
    });

    it('CONFLICT_RUPTURE_PAYOFF_AFTERMATH_VOID does not fire when a payoff follows a rupture', async () => {
      // 10 scenes: rupture at 2; payoff at 3 (one scene after) — aftermath contains a payoff
      const recs520an = Array.from({ length: 10 }, (_, i) =>
        makeRec520(i, {
          relationshipShifts: [2, 5].includes(i) ? rup520(-0.5) : [],
          payoffSetupIds: [3, 8].includes(i) ? ['setup1'] : [],
        }),
      );
      const res = await runCF520(recs520an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_RUPTURE_PAYOFF_AFTERMATH_VOID'), 'CONFLICT_RUPTURE_PAYOFF_AFTERMATH_VOID should not fire');
    });

    it('CONFLICT_REPAIR_FRONT_LOADED fires when >70% of repairs are in the first half', async () => {
      // 10 scenes: repairs at 0,1,2,3 (first half) and 8 (second half) — 4/5 = 80% front-loaded
      const recs520b = Array.from({ length: 10 }, (_, i) =>
        makeRec520(i, {
          relationshipShifts: [0, 1, 2, 3, 8].includes(i) ? rup520(0.5) : [],
        }),
      );
      const res = await runCF520(recs520b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_REPAIR_FRONT_LOADED'), 'CONFLICT_REPAIR_FRONT_LOADED should fire');
    });

    it('CONFLICT_REPAIR_FRONT_LOADED does not fire when repairs are spread across both halves', async () => {
      // 10 scenes: repairs at 1,2,6,7 — 2/4 = 50%, not front-loaded
      const recs520bn = Array.from({ length: 10 }, (_, i) =>
        makeRec520(i, {
          relationshipShifts: [1, 2, 6, 7].includes(i) ? rup520(0.5) : [],
        }),
      );
      const res = await runCF520(recs520bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_REPAIR_FRONT_LOADED'), 'CONFLICT_REPAIR_FRONT_LOADED should not fire');
    });

    it('CONFLICT_CURIOSITY_CLOSING_ZONE_ABSENT fires when ≥3 curiosity scenes exist but none in the final third', async () => {
      // 9 scenes: curiosity at 0,2,4 — final third is scenes 6-8, no curiosity there
      const recs520c = Array.from({ length: 9 }, (_, i) =>
        makeRec520(i, { curiosityDelta: [0, 2, 4].includes(i) ? 1 : 0 }),
      );
      const res = await runCF520(recs520c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_CURIOSITY_CLOSING_ZONE_ABSENT'), 'CONFLICT_CURIOSITY_CLOSING_ZONE_ABSENT should fire');
    });

    it('CONFLICT_CURIOSITY_CLOSING_ZONE_ABSENT does not fire when a curiosity scene exists in the final third', async () => {
      // 9 scenes: curiosity at 0,2,7 — scene 7 is in the final third (6-8)
      const recs520cn = Array.from({ length: 9 }, (_, i) =>
        makeRec520(i, { curiosityDelta: [0, 2, 7].includes(i) ? 1 : 0 }),
      );
      const res = await runCF520(recs520cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_CURIOSITY_CLOSING_ZONE_ABSENT'), 'CONFLICT_CURIOSITY_CLOSING_ZONE_ABSENT should not fire');
    });
  });


  describe('Wave 506 — conflictPass: rupture seed aftermath void, revelation repair decoupled, repair closing absent', async () => {
    const rup506 = (amount: number) => [{ pairKey: 'A|B', dimension: 'trust', amount }];
    const makeRec506 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runC506 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CONFLICT_RUPTURE_SEED_AFTERMATH_VOID fires when all ruptures are followed by 2 seed-free scenes', async () => {
      // n=10; ruptures at pos 1,4; seeds at pos 6,8; no seed in 2-scene windows after 1 (2,3) or 4 (5,6)
      // Wait: pos 6 is in window after 4 (off=1→5, off=2→6). Pos 6 has seed! So need to adjust.
      // Use ruptures at 1,4; seeds at 7,9 (windows after 1: 2,3; after 4: 5,6 — no seeds there) → fire
      const recs506a = Array.from({ length: 10 }, (_, i) =>
        makeRec506(i, {
          relationshipShifts: [1, 4].includes(i) ? rup506(-0.5) : [],
          seededClueIds: [7, 9].includes(i) ? ['clue-A'] : [],
        }),
      );
      const res = await runC506(recs506a);
      assert.ok(res.issues.some((is: any) => is.rule === 'CONFLICT_RUPTURE_SEED_AFTERMATH_VOID'), 'CONFLICT_RUPTURE_SEED_AFTERMATH_VOID should fire');
    });

    it('CONFLICT_RUPTURE_SEED_AFTERMATH_VOID does not fire when a rupture is followed by a seed within 2 scenes', async () => {
      // n=10; ruptures at 1,4; seed at 2 (1 scene after rupture at 1) → not all void → no fire
      const recs506anr = Array.from({ length: 10 }, (_, i) =>
        makeRec506(i, {
          relationshipShifts: [1, 4].includes(i) ? rup506(-0.5) : [],
          seededClueIds: i === 2 ? ['clue-B'] : [],
        }),
      );
      const res = await runC506(recs506anr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'CONFLICT_RUPTURE_SEED_AFTERMATH_VOID'), 'CONFLICT_RUPTURE_SEED_AFTERMATH_VOID should not fire');
    });

    it('CONFLICT_REVELATION_REPAIR_DECOUPLED fires when no scene has both revelation and positive shift', async () => {
      // n=10; revelations at 2,5; repairs at 7,9 — zero overlap → fire
      const recs506b = Array.from({ length: 10 }, (_, i) =>
        makeRec506(i, {
          revelation: [2, 5].includes(i) ? 'The truth comes out.' : null,
          relationshipShifts: [7, 9].includes(i) ? rup506(0.5) : [],
        }),
      );
      const res = await runC506(recs506b);
      assert.ok(res.issues.some((is: any) => is.rule === 'CONFLICT_REVELATION_REPAIR_DECOUPLED'), 'CONFLICT_REVELATION_REPAIR_DECOUPLED should fire');
    });

    it('CONFLICT_REVELATION_REPAIR_DECOUPLED does not fire when a revelation coincides with a repair', async () => {
      // n=10; scene 5 has both revelation and positive shift → anyRevRepair=true → no fire
      const recs506bnr = Array.from({ length: 10 }, (_, i) =>
        makeRec506(i, {
          revelation: [2, 5].includes(i) ? 'Truth surfaces.' : null,
          relationshipShifts: [5, 9].includes(i) ? rup506(0.5) : [],
        }),
      );
      const res = await runC506(recs506bnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'CONFLICT_REVELATION_REPAIR_DECOUPLED'), 'CONFLICT_REVELATION_REPAIR_DECOUPLED should not fire');
    });

    it('CONFLICT_REPAIR_CLOSING_ABSENT fires when no repair scene falls in the final third', async () => {
      // n=9; third=3; repairs at pos 0,2 (zone1) — none at pos 6,7,8 → fire
      const recs506c = Array.from({ length: 9 }, (_, i) =>
        makeRec506(i, { relationshipShifts: [0, 2].includes(i) ? rup506(0.5) : [] }),
      );
      const res = await runC506(recs506c);
      assert.ok(res.issues.some((is: any) => is.rule === 'CONFLICT_REPAIR_CLOSING_ABSENT'), 'CONFLICT_REPAIR_CLOSING_ABSENT should fire');
    });

    it('CONFLICT_REPAIR_CLOSING_ABSENT does not fire when a repair scene exists in the final third', async () => {
      // n=9; third=3; repairs at pos 0,7 (zone1 and zone3=2*3=6 → pos 7 >= 6) → inFinal=true → no fire
      const recs506cnr = Array.from({ length: 9 }, (_, i) =>
        makeRec506(i, { relationshipShifts: [0, 7].includes(i) ? rup506(0.5) : [] }),
      );
      const res = await runC506(recs506cnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'CONFLICT_REPAIR_CLOSING_ABSENT'), 'CONFLICT_REPAIR_CLOSING_ABSENT should not fire');
    });
  });


  describe('Wave 492 — conflictPass: dramatic-turn repair decoupled, closing suspense void, calm stretch', async () => {
    const rup492 = (amount: number) => [{ pairKey: 'A|B', dimension: 'trust', amount }];
    const makeRec492 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runC492 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // CONFLICT_DRAMATIC_TURN_REPAIR_DECOUPLED fire:
    // n=8; turn scenes at 1,3 (no repair); repair scenes at 5,6 (no turn) — zero overlap
    it('CONFLICT_DRAMATIC_TURN_REPAIR_DECOUPLED fires when turn and repair scenes never overlap', async () => {
      const recs492a: any[] = Array.from({ length: 8 }, (_, i) => makeRec492(i, {
        dramaticTurn: [1, 3].includes(i) ? 'reversal' : 'nothing',
        relationshipShifts: [5, 6].includes(i) ? rup492(0.5) : [],
      }));
      const res = await runC492(recs492a);
      assert.ok(res.issues.some((x: any) => x.rule === 'CONFLICT_DRAMATIC_TURN_REPAIR_DECOUPLED'), 'CONFLICT_DRAMATIC_TURN_REPAIR_DECOUPLED should fire');
    });

    // CONFLICT_DRAMATIC_TURN_REPAIR_DECOUPLED no-fire:
    // scene 3 is both a dramatic turn AND has a repair — overlap exists
    it('CONFLICT_DRAMATIC_TURN_REPAIR_DECOUPLED does not fire when a turn scene also repairs a bond', async () => {
      const recs492an: any[] = Array.from({ length: 8 }, (_, i) => makeRec492(i, {
        dramaticTurn: [1, 3].includes(i) ? 'reversal' : 'nothing',
        relationshipShifts: [3, 6].includes(i) ? rup492(0.5) : [],
      }));
      const res = await runC492(recs492an);
      assert.ok(!res.issues.some((x: any) => x.rule === 'CONFLICT_DRAMATIC_TURN_REPAIR_DECOUPLED'), 'CONFLICT_DRAMATIC_TURN_REPAIR_DECOUPLED should not fire');
    });

    // CONFLICT_CLOSING_SUSPENSE_VOID fire:
    // n=9; third=3; closing=[6,7,8]; suspense scenes at 0,2,4 (opening+middle only); closing has 0
    it('CONFLICT_CLOSING_SUSPENSE_VOID fires when closing third has no positive suspenseDelta', async () => {
      const recs492b: any[] = Array.from({ length: 9 }, (_, i) => makeRec492(i, {
        suspenseDelta: [0, 2, 4].includes(i) ? 1 : 0,
      }));
      const res = await runC492(recs492b);
      assert.ok(res.issues.some((x: any) => x.rule === 'CONFLICT_CLOSING_SUSPENSE_VOID'), 'CONFLICT_CLOSING_SUSPENSE_VOID should fire');
    });

    // CONFLICT_CLOSING_SUSPENSE_VOID no-fire:
    // scene 7 (in closing third) has positive suspenseDelta — closing not void
    it('CONFLICT_CLOSING_SUSPENSE_VOID does not fire when closing third has a positive suspenseDelta scene', async () => {
      const recs492bn: any[] = Array.from({ length: 9 }, (_, i) => makeRec492(i, {
        suspenseDelta: [0, 2, 7].includes(i) ? 1 : 0,
      }));
      const res = await runC492(recs492bn);
      assert.ok(!res.issues.some((x: any) => x.rule === 'CONFLICT_CLOSING_SUSPENSE_VOID'), 'CONFLICT_CLOSING_SUSPENSE_VOID should not fire');
    });

    // CONFLICT_CALM_STRETCH fire:
    // n=12; conflict at 0,1,10,11; scenes 2–9 are all calm — 8 consecutive non-conflict scenes
    it('CONFLICT_CALM_STRETCH fires when ≥5 consecutive non-conflict scenes exist', async () => {
      const recs492c: any[] = Array.from({ length: 12 }, (_, i) => makeRec492(i, {
        relationshipShifts: [0, 1, 10, 11].includes(i) ? rup492(-0.5) : [],
      }));
      const res = await runC492(recs492c);
      assert.ok(res.issues.some((x: any) => x.rule === 'CONFLICT_CALM_STRETCH'), 'CONFLICT_CALM_STRETCH should fire');
    });

    // CONFLICT_CALM_STRETCH no-fire:
    // n=12; conflict scenes at 0,3,6,9 — max gap is 2 consecutive calm scenes, below threshold
    it('CONFLICT_CALM_STRETCH does not fire when no non-conflict run reaches 5 consecutive scenes', async () => {
      const recs492cn: any[] = Array.from({ length: 12 }, (_, i) => makeRec492(i, {
        relationshipShifts: [0, 3, 6, 9].includes(i) ? rup492(-0.5) : [],
      }));
      const res = await runC492(recs492cn);
      assert.ok(!res.issues.some((x: any) => x.rule === 'CONFLICT_CALM_STRETCH'), 'CONFLICT_CALM_STRETCH should not fire');
    });
  });


  describe('Wave 478 — conflictPass: rupture temporal cluster, positive emotion aftermath void, repair uncaused', async () => {
    const rup478 = (amount: number) => [{ pairKey: 'A|B', dimension: 'trust', amount }];
    const makeRec478 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runConf478 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CONFLICT_RUPTURE_TEMPORAL_CLUSTER fires when >75% of ruptures fall in a single third', async () => {
      // n=12; ruptures at 0,1,2,3 (all in first third, floor(12/3)=4 → positions 0-3); 4/4=100% > 75%
      const recs478a = Array.from({ length: 12 }, (_, i) =>
        makeRec478(i, { relationshipShifts: [0, 1, 2, 3].includes(i) ? rup478(-0.4) : [] }),
      );
      const res = await runConf478(recs478a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_RUPTURE_TEMPORAL_CLUSTER'), 'CONFLICT_RUPTURE_TEMPORAL_CLUSTER should fire');
    });

    it('CONFLICT_RUPTURE_TEMPORAL_CLUSTER does not fire when ruptures spread across thirds', async () => {
      // n=12; ruptures at 0,4,8,11 → first:1, mid:1, last:2 → max=2/4=50% ≤ 75%
      const recs478anr = Array.from({ length: 12 }, (_, i) =>
        makeRec478(i, { relationshipShifts: [0, 4, 8, 11].includes(i) ? rup478(-0.4) : [] }),
      );
      const res = await runConf478(recs478anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_RUPTURE_TEMPORAL_CLUSTER'), 'CONFLICT_RUPTURE_TEMPORAL_CLUSTER should not fire');
    });

    it('CONFLICT_POSITIVE_EMOTION_AFTERMATH_VOID fires when no major rupture aftermath has a positive emotional beat', async () => {
      // n=8; major ruptures at 1,3,5 (≤-0.3); aftermaths 2-3, 4-5, 6-7 all neutral → fires
      const recs478b = Array.from({ length: 8 }, (_, i) =>
        makeRec478(i, { relationshipShifts: [1, 3, 5].includes(i) ? rup478(-0.5) : [] }),
      );
      const res = await runConf478(recs478b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_POSITIVE_EMOTION_AFTERMATH_VOID'), 'CONFLICT_POSITIVE_EMOTION_AFTERMATH_VOID should fire');
    });

    it('CONFLICT_POSITIVE_EMOTION_AFTERMATH_VOID does not fire when a rupture aftermath carries a positive beat', async () => {
      // n=8; major ruptures at 1,3,5; scene 2 (aftermath of rupture@1) is emotionally positive → no fire
      const recs478bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec478(i, {
          relationshipShifts: [1, 3, 5].includes(i) ? rup478(-0.5) : [],
          emotionalShift: i === 2 ? 'positive' : 'neutral',
        }),
      );
      const res = await runConf478(recs478bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_POSITIVE_EMOTION_AFTERMATH_VOID'), 'CONFLICT_POSITIVE_EMOTION_AFTERMATH_VOID should not fire');
    });

    it('CONFLICT_REPAIR_UNCAUSED fires when every positive-shift scene has no causal driver in prior 2 scenes', async () => {
      // n=8; positive shifts at 3,6 (pos≥2); priors (1,2 for scene 3) and (4,5 for scene 6) have no rupture/revelation/turn
      const recs478c = Array.from({ length: 8 }, (_, i) =>
        makeRec478(i, { relationshipShifts: [3, 6].includes(i) ? rup478(0.4) : [] }),
      );
      const res = await runConf478(recs478c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_REPAIR_UNCAUSED'), 'CONFLICT_REPAIR_UNCAUSED should fire');
    });

    it('CONFLICT_REPAIR_UNCAUSED does not fire when a positive shift is preceded by a rupture', async () => {
      // n=8; positive shifts at 3,6; scene 2 (1 scene before repair@3) has a major rupture → caused → no fire
      const recs478cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec478(i, {
          relationshipShifts: i === 3 || i === 6 ? rup478(0.4) : i === 2 ? rup478(-0.5) : [],
        }),
      );
      const res = await runConf478(recs478cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_REPAIR_UNCAUSED'), 'CONFLICT_REPAIR_UNCAUSED should not fire');
    });
  });


  describe('Wave 464 — conflictPass: rupture revelation aftermath void, rupture dramatic-turn aftermath void, peak rupture uncaused', async () => {
    const rup464 = (amount: number, pairKey = 'A|B') => [{ pairKey, dimension: 'trust', amount }];
    const makeRec464 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runConf464 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CONFLICT_RUPTURE_REVELATION_AFTERMATH_VOID fires when no rupture is followed by a revelation', async () => {
      // n=10; ruptures at 1,5; revelations at 0,9 (outside both aftermath windows 2-3 and 6-7) → fires
      const recs464a = Array.from({ length: 10 }, (_, i) =>
        makeRec464(i, {
          relationshipShifts: [1, 5].includes(i) ? rup464(-0.5) : [],
          revelation: [0, 9].includes(i) ? `Truth ${i}` : null,
        }),
      );
      const res = await runConf464(recs464a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_RUPTURE_REVELATION_AFTERMATH_VOID'), 'CONFLICT_RUPTURE_REVELATION_AFTERMATH_VOID should fire');
    });

    it('CONFLICT_RUPTURE_REVELATION_AFTERMATH_VOID does NOT fire when a revelation follows a rupture', async () => {
      // n=10; ruptures at 1,5; revelations at 2,9 — scene 2 is in rupture@1 aftermath → no fire
      const recs464anr = Array.from({ length: 10 }, (_, i) =>
        makeRec464(i, {
          relationshipShifts: [1, 5].includes(i) ? rup464(-0.5) : [],
          revelation: [2, 9].includes(i) ? `Truth ${i}` : null,
        }),
      );
      const res = await runConf464(recs464anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_RUPTURE_REVELATION_AFTERMATH_VOID'), 'CONFLICT_RUPTURE_REVELATION_AFTERMATH_VOID should not fire');
    });

    it('CONFLICT_RUPTURE_DRAMATIC_TURN_AFTERMATH_VOID fires when no rupture is followed by a dramatic turn', async () => {
      // n=10; ruptures at 1,5; turns at 0,9 (outside aftermath windows) → fires
      const recs464b = Array.from({ length: 10 }, (_, i) =>
        makeRec464(i, {
          relationshipShifts: [1, 5].includes(i) ? rup464(-0.5) : [],
          dramaticTurn: [0, 9].includes(i) ? 'reversal' : 'nothing',
        }),
      );
      const res = await runConf464(recs464b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_RUPTURE_DRAMATIC_TURN_AFTERMATH_VOID'), 'CONFLICT_RUPTURE_DRAMATIC_TURN_AFTERMATH_VOID should fire');
    });

    it('CONFLICT_RUPTURE_DRAMATIC_TURN_AFTERMATH_VOID does NOT fire when a turn follows a rupture', async () => {
      // n=10; ruptures at 1,5; turns at 2,9 — scene 2 is in rupture@1 aftermath → no fire
      const recs464bnr = Array.from({ length: 10 }, (_, i) =>
        makeRec464(i, {
          relationshipShifts: [1, 5].includes(i) ? rup464(-0.5) : [],
          dramaticTurn: [2, 9].includes(i) ? 'reversal' : 'nothing',
        }),
      );
      const res = await runConf464(recs464bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_RUPTURE_DRAMATIC_TURN_AFTERMATH_VOID'), 'CONFLICT_RUPTURE_DRAMATIC_TURN_AFTERMATH_VOID should not fire');
    });

    it('CONFLICT_PEAK_RUPTURE_UNCAUSED fires when the heaviest rupture has no driver in the prior 2 scenes', async () => {
      // n=8; ruptures at 1 (-0.4) and 4 (-0.8 = peak); scenes 2,3 (prior to peak) are clean → fires
      const recs464c = Array.from({ length: 8 }, (_, i) =>
        makeRec464(i, { relationshipShifts: i === 1 ? rup464(-0.4) : i === 4 ? rup464(-0.8) : [] }),
      );
      const res = await runConf464(recs464c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_PEAK_RUPTURE_UNCAUSED'), 'CONFLICT_PEAK_RUPTURE_UNCAUSED should fire');
    });

    it('CONFLICT_PEAK_RUPTURE_UNCAUSED does NOT fire when the heaviest rupture is preceded by escalation', async () => {
      // n=8; ruptures at 1 (-0.4) and 4 (-0.8 = peak); scene 3 has suspenseDelta=1 (escalation) → cause present → no fire
      const recs464cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec464(i, {
          relationshipShifts: i === 1 ? rup464(-0.4) : i === 4 ? rup464(-0.8) : [],
          suspenseDelta: i === 3 ? 1 : 0,
        }),
      );
      const res = await runConf464(recs464cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_PEAK_RUPTURE_UNCAUSED'), 'CONFLICT_PEAK_RUPTURE_UNCAUSED should not fire');
    });
  });


  describe('Wave 450 — conflictPass: clock aftermath void, positive emotion rupture, rupture clock aftermath void', async () => {
    const rup450 = (amount: number, pairKey = 'A|B') => [{ pairKey, dimension: 'trust', amount }];
    const makeRec450 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runConf450 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CONFLICT_CLOCK_AFTERMATH_VOID fires when every clock scene is followed by 2 silent scenes', async () => {
      // n=10, clocks at 1 and 5; aftermath scenes 2,3 and 6,7 all have no conflict signal → fires
      const recs450a = Array.from({ length: 10 }, (_, i) => makeRec450(i));
      recs450a[1] = makeRec450(1, { clockRaised: true });
      recs450a[5] = makeRec450(5, { clockRaised: true });
      const res = await runConf450(recs450a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_CLOCK_AFTERMATH_VOID'), 'CONFLICT_CLOCK_AFTERMATH_VOID should fire');
    });

    it('CONFLICT_CLOCK_AFTERMATH_VOID does not fire when a clock scene is followed by a reversal', async () => {
      // n=10, clocks at 1 and 5; scene 2 has suspenseDelta=-2 (reversal) → no fire
      const recs450anr = Array.from({ length: 10 }, (_, i) => makeRec450(i));
      recs450anr[1] = makeRec450(1, { clockRaised: true });
      recs450anr[2] = makeRec450(2, { suspenseDelta: -2 });
      recs450anr[5] = makeRec450(5, { clockRaised: true });
      const res = await runConf450(recs450anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_CLOCK_AFTERMATH_VOID'), 'CONFLICT_CLOCK_AFTERMATH_VOID should not fire');
    });

    it('CONFLICT_POSITIVE_EMOTION_RUPTURE fires when all conflict scenes have positive emotional shift', async () => {
      // n=10, 4 rupture scenes all with emotionalShift='positive' → fires
      const recs450b = Array.from({ length: 10 }, (_, i) => makeRec450(i));
      recs450b[1] = makeRec450(1, { relationshipShifts: rup450(-0.5), emotionalShift: 'positive' });
      recs450b[3] = makeRec450(3, { relationshipShifts: rup450(-0.4), emotionalShift: 'positive' });
      recs450b[6] = makeRec450(6, { relationshipShifts: rup450(-0.6), emotionalShift: 'positive' });
      recs450b[8] = makeRec450(8, { relationshipShifts: rup450(-0.3), emotionalShift: 'positive' });
      const res = await runConf450(recs450b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_POSITIVE_EMOTION_RUPTURE'), 'CONFLICT_POSITIVE_EMOTION_RUPTURE should fire');
    });

    it('CONFLICT_POSITIVE_EMOTION_RUPTURE does not fire when at least one conflict scene is not positive', async () => {
      // n=10, 3 rupture scenes: 2 positive + 1 neutral → no fire
      const recs450bnr = Array.from({ length: 10 }, (_, i) => makeRec450(i));
      recs450bnr[1] = makeRec450(1, { relationshipShifts: rup450(-0.5), emotionalShift: 'positive' });
      recs450bnr[3] = makeRec450(3, { relationshipShifts: rup450(-0.4), emotionalShift: 'positive' });
      recs450bnr[6] = makeRec450(6, { relationshipShifts: rup450(-0.6), emotionalShift: 'neutral' });
      const res = await runConf450(recs450bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_POSITIVE_EMOTION_RUPTURE'), 'CONFLICT_POSITIVE_EMOTION_RUPTURE should not fire');
    });

    it('CONFLICT_RUPTURE_CLOCK_AFTERMATH_VOID fires when every rupture aftermath has no clock raise', async () => {
      // n=10, ruptures at 1 and 5; clocks at 0 and 9 (not in aftermath of ruptures) → fires
      const recs450c = Array.from({ length: 10 }, (_, i) => makeRec450(i));
      recs450c[0] = makeRec450(0, { clockRaised: true });
      recs450c[1] = makeRec450(1, { relationshipShifts: rup450(-0.5) });
      recs450c[5] = makeRec450(5, { relationshipShifts: rup450(-0.4) });
      recs450c[9] = makeRec450(9, { clockRaised: true });
      const res = await runConf450(recs450c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_RUPTURE_CLOCK_AFTERMATH_VOID'), 'CONFLICT_RUPTURE_CLOCK_AFTERMATH_VOID should fire');
    });

    it('CONFLICT_RUPTURE_CLOCK_AFTERMATH_VOID does not fire when a rupture is followed by a clock raise', async () => {
      // n=10, ruptures at 1 and 5; clocks at 0, 2 (aftermath of rupture at 1), and 9 → no fire
      const recs450cnr = Array.from({ length: 10 }, (_, i) => makeRec450(i));
      recs450cnr[0] = makeRec450(0, { clockRaised: true });
      recs450cnr[1] = makeRec450(1, { relationshipShifts: rup450(-0.5) });
      recs450cnr[2] = makeRec450(2, { clockRaised: true });
      recs450cnr[5] = makeRec450(5, { relationshipShifts: rup450(-0.4) });
      recs450cnr[9] = makeRec450(9, { clockRaised: true });
      const res = await runConf450(recs450cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_RUPTURE_CLOCK_AFTERMATH_VOID'), 'CONFLICT_RUPTURE_CLOCK_AFTERMATH_VOID should not fire');
    });
  });


  describe('Wave 436 — conflictPass: positive spiral, rupture suspense void, breathing room absent', async () => {
    const rup436 = (amount: number, pairKey = 'A|B') => [{ pairKey, dimension: 'trust', amount }];
    const makeRec436 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runConf436 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CONFLICT_POSITIVE_SPIRAL fires when ≥3 consecutive positive-shift scenes exist alongside ≥2 ruptures', async () => {
      // n=8, ruptures at 0 and 6; positive shifts at 2, 3, 4 (run of 3) → fires
      const recs436a = Array.from({ length: 8 }, (_, i) => makeRec436(i));
      recs436a[0] = makeRec436(0, { relationshipShifts: rup436(-0.5) });
      recs436a[2] = makeRec436(2, { relationshipShifts: rup436(0.4) });
      recs436a[3] = makeRec436(3, { relationshipShifts: rup436(0.3) });
      recs436a[4] = makeRec436(4, { relationshipShifts: rup436(0.2) });
      recs436a[6] = makeRec436(6, { relationshipShifts: rup436(-0.4) });
      const res = await runConf436(recs436a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_POSITIVE_SPIRAL'), 'CONFLICT_POSITIVE_SPIRAL should fire');
    });

    it('CONFLICT_POSITIVE_SPIRAL does not fire when positive run is only 2 scenes long', async () => {
      // n=8, ruptures at 0 and 6; positive shifts at 2 and 3 only (run of 2) → no fire
      const recs436anr = Array.from({ length: 8 }, (_, i) => makeRec436(i));
      recs436anr[0] = makeRec436(0, { relationshipShifts: rup436(-0.5) });
      recs436anr[2] = makeRec436(2, { relationshipShifts: rup436(0.4) });
      recs436anr[3] = makeRec436(3, { relationshipShifts: rup436(0.3) });
      recs436anr[6] = makeRec436(6, { relationshipShifts: rup436(-0.4) });
      const res = await runConf436(recs436anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_POSITIVE_SPIRAL'), 'CONFLICT_POSITIVE_SPIRAL should not fire');
    });

    it('CONFLICT_RUPTURE_SUSPENSE_VOID fires when every rupture aftermath has no suspense rise', async () => {
      // n=8, ruptures at 2 and 5; scenes 3,4 and 6,7 all have suspenseDelta=0 → fires
      const recs436b = Array.from({ length: 8 }, (_, i) => makeRec436(i));
      recs436b[2] = makeRec436(2, { relationshipShifts: rup436(-0.5) });
      recs436b[5] = makeRec436(5, { relationshipShifts: rup436(-0.4) });
      const res = await runConf436(recs436b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_RUPTURE_SUSPENSE_VOID'), 'CONFLICT_RUPTURE_SUSPENSE_VOID should fire');
    });

    it('CONFLICT_RUPTURE_SUSPENSE_VOID does not fire when suspense rises after a rupture', async () => {
      // n=8, ruptures at 2 and 5; scene 3 has suspenseDelta=1 → no fire
      const recs436bnr = Array.from({ length: 8 }, (_, i) => makeRec436(i));
      recs436bnr[2] = makeRec436(2, { relationshipShifts: rup436(-0.5) });
      recs436bnr[3] = makeRec436(3, { suspenseDelta: 1 });
      recs436bnr[5] = makeRec436(5, { relationshipShifts: rup436(-0.4) });
      const res = await runConf436(recs436bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_RUPTURE_SUSPENSE_VOID'), 'CONFLICT_RUPTURE_SUSPENSE_VOID should not fire');
    });

    it('CONFLICT_BREATHING_ROOM_ABSENT fires when 4+ ruptures are always ≤1 scene apart', async () => {
      // n=10, ruptures at 0, 2, 4, 6 → gaps all =1 → maxGap=1 → fires
      const recs436c = Array.from({ length: 10 }, (_, i) => makeRec436(i));
      recs436c[0] = makeRec436(0, { relationshipShifts: rup436(-0.5) });
      recs436c[2] = makeRec436(2, { relationshipShifts: rup436(-0.4) });
      recs436c[4] = makeRec436(4, { relationshipShifts: rup436(-0.5) });
      recs436c[6] = makeRec436(6, { relationshipShifts: rup436(-0.4) });
      const res = await runConf436(recs436c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_BREATHING_ROOM_ABSENT'), 'CONFLICT_BREATHING_ROOM_ABSENT should fire');
    });

    it('CONFLICT_BREATHING_ROOM_ABSENT does not fire when ruptures have ≥2 clear scenes between them', async () => {
      // n=10, ruptures at 0, 2, 5, 8 → gaps: 1, 2, 2 → maxGap=2 > 1 → no fire
      const recs436cnr = Array.from({ length: 10 }, (_, i) => makeRec436(i));
      recs436cnr[0] = makeRec436(0, { relationshipShifts: rup436(-0.5) });
      recs436cnr[2] = makeRec436(2, { relationshipShifts: rup436(-0.4) });
      recs436cnr[5] = makeRec436(5, { relationshipShifts: rup436(-0.5) });
      recs436cnr[8] = makeRec436(8, { relationshipShifts: rup436(-0.4) });
      const res = await runConf436(recs436cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_BREATHING_ROOM_ABSENT'), 'CONFLICT_BREATHING_ROOM_ABSENT should not fire');
    });
  });


  describe('Wave 422 — conflictPass: rupture cause void, aftermath curiosity void, pair shift imbalance', async () => {
    const rup422 = (amount: number, pairKey = 'A|B') => [{ pairKey, dimension: 'trust', amount }];
    const makeRec422 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runConf422 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CONFLICT_RUPTURE_CAUSE_VOID fires when no conflict scene has an upstream cause', async () => {
      // n=8, ruptures at 3 and 6, no causes anywhere → fires
      const recs422a = Array.from({ length: 8 }, (_, i) => makeRec422(i));
      recs422a[3] = makeRec422(3, { relationshipShifts: rup422(-0.5) });
      recs422a[6] = makeRec422(6, { relationshipShifts: rup422(-0.4) });
      const res = await runConf422(recs422a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_RUPTURE_CAUSE_VOID'), 'CONFLICT_RUPTURE_CAUSE_VOID should fire');
    });

    it('CONFLICT_RUPTURE_CAUSE_VOID does not fire when a rupture has a cause', async () => {
      // n=8, ruptures at 3 and 6, scene 3 has a revelation (self-cause) → no fire
      const recs422anr = Array.from({ length: 8 }, (_, i) => makeRec422(i));
      recs422anr[3] = makeRec422(3, { relationshipShifts: rup422(-0.5), revelation: 'The secret comes out.' });
      recs422anr[6] = makeRec422(6, { relationshipShifts: rup422(-0.4) });
      const res = await runConf422(recs422anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_RUPTURE_CAUSE_VOID'), 'CONFLICT_RUPTURE_CAUSE_VOID should not fire');
    });

    it('CONFLICT_AFTERMATH_CURIOSITY_VOID fires when every rupture aftermath has no curiosity rise', async () => {
      // n=8, ruptures at 2 and 5; scenes 3,4 and 6,7 have curiosityDelta=0 → fires
      const recs422b = Array.from({ length: 8 }, (_, i) => makeRec422(i));
      recs422b[2] = makeRec422(2, { relationshipShifts: rup422(-0.5) });
      recs422b[5] = makeRec422(5, { relationshipShifts: rup422(-0.4) });
      const res = await runConf422(recs422b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_AFTERMATH_CURIOSITY_VOID'), 'CONFLICT_AFTERMATH_CURIOSITY_VOID should fire');
    });

    it('CONFLICT_AFTERMATH_CURIOSITY_VOID does not fire when curiosity rises after a rupture', async () => {
      // n=8, ruptures at 2 and 5; scene 3 has curiosityDelta=1 → no fire
      const recs422bnr = Array.from({ length: 8 }, (_, i) => makeRec422(i));
      recs422bnr[2] = makeRec422(2, { relationshipShifts: rup422(-0.5) });
      recs422bnr[3] = makeRec422(3, { curiosityDelta: 1 });
      recs422bnr[5] = makeRec422(5, { relationshipShifts: rup422(-0.4) });
      const res = await runConf422(recs422bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_AFTERMATH_CURIOSITY_VOID'), 'CONFLICT_AFTERMATH_CURIOSITY_VOID should not fire');
    });

    it('CONFLICT_PAIR_SHIFT_IMBALANCE fires when one pair dominates total conflict magnitude', async () => {
      // n=8, pair A|B: -0.8,-0.7,-0.6 = mag 2.1; pair C|D: -0.2; pair E|F: -0.2; total=2.5; A|B=84% → fires
      const recs422c = Array.from({ length: 8 }, (_, i) => makeRec422(i));
      recs422c[1] = makeRec422(1, { relationshipShifts: rup422(-0.8, 'A|B') });
      recs422c[3] = makeRec422(3, { relationshipShifts: rup422(-0.7, 'A|B') });
      recs422c[4] = makeRec422(4, { relationshipShifts: rup422(-0.2, 'C|D') });
      recs422c[5] = makeRec422(5, { relationshipShifts: rup422(-0.6, 'A|B') });
      recs422c[7] = makeRec422(7, { relationshipShifts: rup422(-0.2, 'E|F') });
      const res = await runConf422(recs422c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_PAIR_SHIFT_IMBALANCE'), 'CONFLICT_PAIR_SHIFT_IMBALANCE should fire');
    });

    it('CONFLICT_PAIR_SHIFT_IMBALANCE does not fire when conflict is distributed across pairs', async () => {
      // n=8, three pairs each with similar magnitude: A|B=-1.0, C|D=-1.0, E|F=-1.0; each=33% → no fire
      const recs422cnr = Array.from({ length: 8 }, (_, i) => makeRec422(i));
      recs422cnr[1] = makeRec422(1, { relationshipShifts: rup422(-0.5, 'A|B') });
      recs422cnr[2] = makeRec422(2, { relationshipShifts: rup422(-0.5, 'C|D') });
      recs422cnr[3] = makeRec422(3, { relationshipShifts: rup422(-0.5, 'E|F') });
      recs422cnr[5] = makeRec422(5, { relationshipShifts: rup422(-0.5, 'A|B') });
      recs422cnr[6] = makeRec422(6, { relationshipShifts: rup422(-0.5, 'C|D') });
      recs422cnr[7] = makeRec422(7, { relationshipShifts: rup422(-0.5, 'E|F') });
      const res = await runConf422(recs422cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_PAIR_SHIFT_IMBALANCE'), 'CONFLICT_PAIR_SHIFT_IMBALANCE should not fire');
    });
  });


  describe('Wave 408 — conflictPass: peak revelation absent, peak payoff absent, peak seed absent', async () => {
    const rup408 = (amount: number) => [{ pairKey: 'A|B', dimension: 'trust', amount }];
    const makeRec408 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF408 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({ fountain: '', original: '', records, structure: { escalating: true, avgSuspensePerScene: 0, openClues: 0, reversalDensity: 1, approachingClimax: false } as any, annotations: [], approvedSpans: [] });
    };

    it('CONFLICT_PEAK_REVELATION_ABSENT fires when the heaviest rupture discloses nothing', async () => {
      const recs408r = Array.from({ length: 8 }, (_, i) => makeRec408(i));
      recs408r[2] = makeRec408(2, { relationshipShifts: rup408(-0.4) });
      recs408r[5] = makeRec408(5, { relationshipShifts: rup408(-0.85) }); // peak, no revelation
      recs408r[1] = makeRec408(1, { revelation: 'Truth one.' });
      recs408r[3] = makeRec408(3, { revelation: 'Truth two.' });
      const res = await runCF408(recs408r);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_PEAK_REVELATION_ABSENT'), 'CONFLICT_PEAK_REVELATION_ABSENT should fire');
    });

    it('CONFLICT_PEAK_REVELATION_ABSENT does NOT fire when the heaviest rupture reveals a truth', async () => {
      const recs408rNF = Array.from({ length: 8 }, (_, i) => makeRec408(i));
      recs408rNF[2] = makeRec408(2, { relationshipShifts: rup408(-0.4) });
      recs408rNF[5] = makeRec408(5, { relationshipShifts: rup408(-0.85), revelation: 'The big secret.' }); // peak has revelation
      recs408rNF[1] = makeRec408(1, { revelation: 'Truth one.' });
      const res = await runCF408(recs408rNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_PEAK_REVELATION_ABSENT'), 'CONFLICT_PEAK_REVELATION_ABSENT should not fire');
    });

    it('CONFLICT_PEAK_PAYOFF_ABSENT fires when the heaviest rupture pays off no setup', async () => {
      const recs408p = Array.from({ length: 8 }, (_, i) => makeRec408(i));
      recs408p[2] = makeRec408(2, { relationshipShifts: rup408(-0.4) });
      recs408p[5] = makeRec408(5, { relationshipShifts: rup408(-0.85) }); // peak, no payoff
      recs408p[1] = makeRec408(1, { payoffSetupIds: ['p1'] });
      recs408p[3] = makeRec408(3, { payoffSetupIds: ['p2'] });
      const res = await runCF408(recs408p);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_PEAK_PAYOFF_ABSENT'), 'CONFLICT_PEAK_PAYOFF_ABSENT should fire');
    });

    it('CONFLICT_PEAK_PAYOFF_ABSENT does NOT fire when the heaviest rupture delivers a payoff', async () => {
      const recs408pNF = Array.from({ length: 8 }, (_, i) => makeRec408(i));
      recs408pNF[2] = makeRec408(2, { relationshipShifts: rup408(-0.4) });
      recs408pNF[5] = makeRec408(5, { relationshipShifts: rup408(-0.85), payoffSetupIds: ['p3'] }); // peak has payoff
      recs408pNF[1] = makeRec408(1, { payoffSetupIds: ['p1'] });
      const res = await runCF408(recs408pNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_PEAK_PAYOFF_ABSENT'), 'CONFLICT_PEAK_PAYOFF_ABSENT should not fire');
    });

    it('CONFLICT_PEAK_SEED_ABSENT fires when the heaviest rupture seeds no clue', async () => {
      const recs408s = Array.from({ length: 8 }, (_, i) => makeRec408(i));
      recs408s[2] = makeRec408(2, { relationshipShifts: rup408(-0.4) });
      recs408s[5] = makeRec408(5, { relationshipShifts: rup408(-0.85) }); // peak, no seed
      recs408s[1] = makeRec408(1, { seededClueIds: ['c1'] });
      recs408s[3] = makeRec408(3, { seededClueIds: ['c2'] });
      const res = await runCF408(recs408s);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_PEAK_SEED_ABSENT'), 'CONFLICT_PEAK_SEED_ABSENT should fire');
    });

    it('CONFLICT_PEAK_SEED_ABSENT does NOT fire when the heaviest rupture seeds a clue', async () => {
      const recs408sNF = Array.from({ length: 8 }, (_, i) => makeRec408(i));
      recs408sNF[2] = makeRec408(2, { relationshipShifts: rup408(-0.4) });
      recs408sNF[5] = makeRec408(5, { relationshipShifts: rup408(-0.85), seededClueIds: ['c3'] }); // peak seeds a clue
      recs408sNF[1] = makeRec408(1, { seededClueIds: ['c1'] });
      const res = await runCF408(recs408sNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_PEAK_SEED_ABSENT'), 'CONFLICT_PEAK_SEED_ABSENT should not fire');
    });
  });


  describe('Wave 394 — conflictPass: clue decoupled, payoff decoupled, rupture aftermath void', async () => {
    const makeRec394 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF394 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({ fountain: '', original: '', records, structure: { escalating: true, avgSuspensePerScene: 0, openClues: 0, reversalDensity: 1, approachingClimax: false } as any, annotations: [], approvedSpans: [] });
    };

    it('CONFLICT_CLUE_DECOUPLED fires when conflict scenes never seed a clue', async () => {
      // scenes 1,3,5 carry conflict; scenes 6,7 seed clues but have no conflict — decoupled
      const recs394cd = Array.from({ length: 8 }, (_, i) =>
        makeRec394(i, {
          relationshipShifts: [1, 3, 5].includes(i) ? [{ pairKey: 'A|B', dimension: 'trust', amount: -0.5 }] : [],
          seededClueIds: [6, 7].includes(i) ? ['clue1'] : [],
        }),
      );
      const res = await runCF394(recs394cd);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_CLUE_DECOUPLED'), 'CONFLICT_CLUE_DECOUPLED should fire');
    });

    it('CONFLICT_CLUE_DECOUPLED does not fire when a conflict scene also seeds a clue', async () => {
      // scene 3 has both conflict and a seeded clue
      const recs394cdn = Array.from({ length: 8 }, (_, i) =>
        makeRec394(i, {
          relationshipShifts: [1, 3, 5].includes(i) ? [{ pairKey: 'A|B', dimension: 'trust', amount: -0.5 }] : [],
          seededClueIds: [3, 6].includes(i) ? ['clue1'] : [],
        }),
      );
      const res = await runCF394(recs394cdn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_CLUE_DECOUPLED'), 'CONFLICT_CLUE_DECOUPLED should not fire');
    });

    it('CONFLICT_PAYOFF_DECOUPLED fires when payoff scenes never coincide with a rupture', async () => {
      // scenes 1,4 carry conflict; scenes 5,6 deliver payoffs — no overlap
      const recs394pd = Array.from({ length: 8 }, (_, i) =>
        makeRec394(i, {
          relationshipShifts: [1, 4].includes(i) ? [{ pairKey: 'A|B', dimension: 'trust', amount: -0.5 }] : [],
          payoffSetupIds: [5, 6].includes(i) ? ['setup1'] : [],
        }),
      );
      const res = await runCF394(recs394pd);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_PAYOFF_DECOUPLED'), 'CONFLICT_PAYOFF_DECOUPLED should fire');
    });

    it('CONFLICT_PAYOFF_DECOUPLED does not fire when a payoff scene coincides with a rupture', async () => {
      // scene 5 has both a payoff and a conflict rupture
      const recs394pdn = Array.from({ length: 8 }, (_, i) =>
        makeRec394(i, {
          relationshipShifts: [1, 5].includes(i) ? [{ pairKey: 'A|B', dimension: 'trust', amount: -0.5 }] : [],
          payoffSetupIds: [5, 6].includes(i) ? ['setup1'] : [],
        }),
      );
      const res = await runCF394(recs394pdn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_PAYOFF_DECOUPLED'), 'CONFLICT_PAYOFF_DECOUPLED should not fire');
    });

    it('CONFLICT_RUPTURE_AFTERMATH_VOID fires when a major rupture has 2 silent aftermath scenes for the same pair', async () => {
      // scene 2 ruptures A|B (−0.6); scenes 3 & 4 have no A|B shift and are emotionally neutral
      const recs394rav = Array.from({ length: 8 }, (_, i) =>
        makeRec394(i, {
          relationshipShifts: i === 2 ? [{ pairKey: 'A|B', dimension: 'trust', amount: -0.6 }] : [],
        }),
      );
      const res = await runCF394(recs394rav);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_RUPTURE_AFTERMATH_VOID'), 'CONFLICT_RUPTURE_AFTERMATH_VOID should fire');
    });

    it('CONFLICT_RUPTURE_AFTERMATH_VOID does not fire when aftermath contains a follow-up shift for the pair', async () => {
      // scene 2 ruptures A|B; scene 3 carries a follow-up A|B shift — not a void aftermath
      const recs394ravn = Array.from({ length: 8 }, (_, i) =>
        makeRec394(i, {
          relationshipShifts: [2, 3].includes(i)
            ? [{ pairKey: 'A|B', dimension: 'trust', amount: i === 2 ? -0.6 : -0.2 }]
            : [],
        }),
      );
      const res = await runCF394(recs394ravn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_RUPTURE_AFTERMATH_VOID'), 'CONFLICT_RUPTURE_AFTERMATH_VOID should not fire');
    });
  });


  describe('Wave 299 — conflictPass: conflict emotion decoupled, stakes label unbacked, eleventh hour conflict', async () => {
    const makeRec299 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF299 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CONFLICT_EMOTION_DECOUPLED fires when all conflict scenes are emotionally neutral', async () => {
      const recs299ed = Array.from({ length: 8 }, (_, i) =>
        makeRec299(i, {
          relationshipShifts: [1, 3, 5].includes(i) ? [{ pairKey: 'A|B', dimension: 'trust', amount: -0.5 }] : [],
        })
      );
      const res = await runCF299(recs299ed);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_EMOTION_DECOUPLED'), 'CONFLICT_EMOTION_DECOUPLED should fire');
    });

    it('CONFLICT_EMOTION_DECOUPLED does not fire when a conflict scene moves someone emotionally', async () => {
      const recs299ned = Array.from({ length: 8 }, (_, i) =>
        makeRec299(i, {
          relationshipShifts: [1, 3, 5].includes(i) ? [{ pairKey: 'A|B', dimension: 'trust', amount: -0.5 }] : [],
          emotionalShift: i === 3 ? 'negative' : 'neutral',
        })
      );
      const res = await runCF299(recs299ned);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_EMOTION_DECOUPLED'), 'CONFLICT_EMOTION_DECOUPLED should not fire');
    });

    it('STAKES_LABEL_UNBACKED fires when raise_stakes scenes have no conflict markers', async () => {
      const recs299sl = Array.from({ length: 8 }, (_, i) =>
        makeRec299(i, {
          purpose: [2, 5].includes(i) ? 'raise_stakes' : 'development',
          suspenseDelta: [2, 5].includes(i) ? 0 : 0.5,
        })
      );
      const res = await runCF299(recs299sl);
      assert.ok(res.issues.some((i: any) => i.rule === 'STAKES_LABEL_UNBACKED'), 'STAKES_LABEL_UNBACKED should fire');
    });

    it('STAKES_LABEL_UNBACKED does not fire when a raise_stakes scene is backed by a clock', async () => {
      const recs299nsl = Array.from({ length: 8 }, (_, i) =>
        makeRec299(i, {
          purpose: [2, 5].includes(i) ? 'raise_stakes' : 'development',
          suspenseDelta: [2, 5].includes(i) ? 0 : 0.5,
          clockRaised: i === 2,
        })
      );
      const res = await runCF299(recs299nsl);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STAKES_LABEL_UNBACKED'), 'STAKES_LABEL_UNBACKED should not fire');
    });

    it('ELEVENTH_HOUR_CONFLICT fires when a new conflict pair first appears in the final 10%', async () => {
      // 10 scenes: A|B conflicts early (1,4); C|D first conflict at scene 9 (final 10%)
      const recs299eh = Array.from({ length: 10 }, (_, i) =>
        makeRec299(i, {
          relationshipShifts:
            [1, 4].includes(i) ? [{ pairKey: 'A|B', dimension: 'trust', amount: -0.5 }]
            : i === 9 ? [{ pairKey: 'C|D', dimension: 'trust', amount: -0.5 }]
            : [],
        })
      );
      const res = await runCF299(recs299eh);
      assert.ok(res.issues.some((i: any) => i.rule === 'ELEVENTH_HOUR_CONFLICT'), 'ELEVENTH_HOUR_CONFLICT should fire');
    });

    it('ELEVENTH_HOUR_CONFLICT does not fire when all conflict pairs are established earlier', async () => {
      const recs299neh = Array.from({ length: 10 }, (_, i) =>
        makeRec299(i, {
          relationshipShifts:
            [1, 4].includes(i) ? [{ pairKey: 'A|B', dimension: 'trust', amount: -0.5 }]
            : i === 5 ? [{ pairKey: 'C|D', dimension: 'trust', amount: -0.5 }]
            : i === 9 ? [{ pairKey: 'A|B', dimension: 'trust', amount: -0.5 }]
            : [],
        })
      );
      const res = await runCF299(recs299neh);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ELEVENTH_HOUR_CONFLICT'), 'ELEVENTH_HOUR_CONFLICT should not fire');
    });
  });


  describe('Wave 285 — conflictPass: conflict suspense decoupled, negative spiral unbroken, conflict resolution premature', async () => {
    const makeRec285 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runCF285 = async (records: any[]) => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      return conflictPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CONFLICT_SUSPENSE_DECOUPLED fires when conflict scenes have avg suspenseDelta ≤ 0', async () => {
      const recs285csd = Array.from({ length: 8 }, (_, i) =>
        makeRec285(i, {
          suspenseDelta: -0.5,
          relationshipShifts: i < 3 ? [{ pairKey: 'A-B', dimension: 'trust', amount: -0.5 }] : [],
        })
      );
      const res = await runCF285(recs285csd);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_SUSPENSE_DECOUPLED'), 'CONFLICT_SUSPENSE_DECOUPLED should fire');
    });

    it('CONFLICT_SUSPENSE_DECOUPLED does not fire when conflict scenes have positive avg suspenseDelta', async () => {
      const recs285ncsd = Array.from({ length: 8 }, (_, i) =>
        makeRec285(i, {
          suspenseDelta: 1.5,
          relationshipShifts: i < 3 ? [{ pairKey: 'A-B', dimension: 'trust', amount: -0.5 }] : [],
        })
      );
      const res = await runCF285(recs285ncsd);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_SUSPENSE_DECOUPLED'), 'CONFLICT_SUSPENSE_DECOUPLED should not fire');
    });

    it('NEGATIVE_SPIRAL_UNBROKEN fires when ≥4 consecutive scenes have negative emotionalShift', async () => {
      const recs285nsu = Array.from({ length: 8 }, (_, i) =>
        makeRec285(i, { emotionalShift: i >= 2 && i <= 5 ? 'negative' : 'neutral' })
      );
      const res = await runCF285(recs285nsu);
      assert.ok(res.issues.some((i: any) => i.rule === 'NEGATIVE_SPIRAL_UNBROKEN'), 'NEGATIVE_SPIRAL_UNBROKEN should fire');
    });

    it('NEGATIVE_SPIRAL_UNBROKEN does not fire when negative runs are broken by neutral/positive', async () => {
      const recs285nnsu = Array.from({ length: 8 }, (_, i) =>
        makeRec285(i, { emotionalShift: i % 2 === 0 ? 'negative' : 'neutral' })
      );
      const res = await runCF285(recs285nnsu);
      assert.ok(!res.issues.some((i: any) => i.rule === 'NEGATIVE_SPIRAL_UNBROKEN'), 'NEGATIVE_SPIRAL_UNBROKEN should not fire');
    });

    it('CONFLICT_RESOLUTION_PREMATURE fires when dominant conflict pair has no events in final quarter', async () => {
      // 8 scenes: final quarter = sceneIdx >= 6; dominant pair has 4 events all in first 6 scenes
      const recs285crp = Array.from({ length: 8 }, (_, i) =>
        makeRec285(i, {
          relationshipShifts: i < 4 ? [{ pairKey: 'X-Y', dimension: 'trust', amount: -0.5 }] : [],
        })
      );
      const res = await runCF285(recs285crp);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_RESOLUTION_PREMATURE'), 'CONFLICT_RESOLUTION_PREMATURE should fire');
    });

    it('CONFLICT_RESOLUTION_PREMATURE does not fire when dominant pair has events in final quarter', async () => {
      // 8 scenes: dominant pair has events at indices 1,2,3,7 (4 events, one in final quarter)
      const recs285ncrp = Array.from({ length: 8 }, (_, i) =>
        makeRec285(i, {
          relationshipShifts: [1, 2, 3, 7].includes(i) ? [{ pairKey: 'X-Y', dimension: 'trust', amount: -0.5 }] : [],
        })
      );
      const res = await runCF285(recs285ncrp);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_RESOLUTION_PREMATURE'), 'CONFLICT_RESOLUTION_PREMATURE should not fire');
    });
  });


  describe('Wave 271 — conflictPass: conflict Act 2b void, interpersonal conflict only, pair density gap', async () => {
    const makeRec271 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput271 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: '...',
      records: records as any, structure: {} as any,
      storyContext: {} as any, annotations: records.map(() => null) as any,
      approvedSpans: [],
    });
    const negShift271 = (pairKey: string, amount = -0.5) => ({ pairKey, dimension: 'trust', amount });

    it('CONFLICT_ACT2B_VOID fires when Act 2b (50-75%) has no conflict while other zones do', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // 12 scenes; act2b = slice(6,9) = scenes 6,7,8; conflict at 1, 3, 10, 11; none in 6-8
      const records271a = [
        makeRec271(0),
        makeRec271(1, { suspenseDelta: -1.5 }),
        makeRec271(2),
        makeRec271(3, { relationshipShifts: [negShift271('alice-bob')] }),
        makeRec271(4), makeRec271(5), makeRec271(6), makeRec271(7), makeRec271(8),
        makeRec271(9),
        makeRec271(10, { suspenseDelta: -2 }),
        makeRec271(11, { relationshipShifts: [negShift271('alice-bob')] }),
      ];
      const result271a = await conflictPass(makeInput271(records271a));
      const void271 = result271a.issues.filter((i: any) => i.rule === 'CONFLICT_ACT2B_VOID');
      assert.ok(void271.length >= 1, `Should detect CONFLICT_ACT2B_VOID, got: ${JSON.stringify(result271a.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(void271[0].severity, 'minor');
    });

    it('CONFLICT_ACT2B_VOID does NOT fire when conflict exists in Act 2b', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // 12 scenes; conflict at scene 7 (in act2b = 6..8) → no fire
      const records271b = [
        makeRec271(0),
        makeRec271(1, { suspenseDelta: -1.5 }),
        makeRec271(2), makeRec271(3), makeRec271(4), makeRec271(5), makeRec271(6),
        makeRec271(7, { suspenseDelta: -1.8 }),
        makeRec271(8), makeRec271(9),
        makeRec271(10, { suspenseDelta: -2 }),
        makeRec271(11),
      ];
      const result271b = await conflictPass(makeInput271(records271b));
      const void271 = result271b.issues.filter((i: any) => i.rule === 'CONFLICT_ACT2B_VOID');
      assert.strictEqual(void271.length, 0, 'Should NOT fire when conflict exists in Act 2b');
    });

    it('INTERPERSONAL_CONFLICT_ONLY fires when all conflict is interpersonal with no tension reversals', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // 6 scenes; 3 neg rel shifts, suspenseDelta all 0 (no reversal < -1)
      const records271c = [
        makeRec271(0, { relationshipShifts: [negShift271('alice-bob')] }),
        makeRec271(1),
        makeRec271(2, { relationshipShifts: [negShift271('alice-carol')] }),
        makeRec271(3),
        makeRec271(4, { relationshipShifts: [negShift271('bob-carol')] }),
        makeRec271(5),
      ];
      const result271c = await conflictPass(makeInput271(records271c));
      const ico = result271c.issues.filter((i: any) => i.rule === 'INTERPERSONAL_CONFLICT_ONLY');
      assert.ok(ico.length >= 1, `Should detect INTERPERSONAL_CONFLICT_ONLY, got: ${JSON.stringify(result271c.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(ico[0].severity, 'minor');
    });

    it('INTERPERSONAL_CONFLICT_ONLY does NOT fire when at least one tension reversal exists', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // 6 scenes; 3 neg rel shifts AND one suspenseDelta < -1
      const records271d = [
        makeRec271(0, { relationshipShifts: [negShift271('alice-bob')] }),
        makeRec271(1, { suspenseDelta: -1.5 }),
        makeRec271(2, { relationshipShifts: [negShift271('alice-carol')] }),
        makeRec271(3),
        makeRec271(4, { relationshipShifts: [negShift271('bob-carol')] }),
        makeRec271(5),
      ];
      const result271d = await conflictPass(makeInput271(records271d));
      const ico = result271d.issues.filter((i: any) => i.rule === 'INTERPERSONAL_CONFLICT_ONLY');
      assert.strictEqual(ico.length, 0, 'Should NOT fire when at least one tension reversal exists');
    });

    it('CONFLICT_PAIR_DENSITY_GAP fires when one pair has 3x more conflict events than others', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // 6 scenes; alice-bob: 3 neg events, alice-carol: 1, bob-carol: 1 → 3×
      const records271e = [
        makeRec271(0, { relationshipShifts: [negShift271('alice-bob'), negShift271('alice-carol')] }),
        makeRec271(1, { relationshipShifts: [negShift271('alice-bob')] }),
        makeRec271(2, { relationshipShifts: [negShift271('alice-bob'), negShift271('bob-carol')] }),
        makeRec271(3), makeRec271(4), makeRec271(5),
      ];
      const result271e = await conflictPass(makeInput271(records271e));
      const pdg = result271e.issues.filter((i: any) => i.rule === 'CONFLICT_PAIR_DENSITY_GAP');
      assert.ok(pdg.length >= 1, `Should detect CONFLICT_PAIR_DENSITY_GAP, got: ${JSON.stringify(result271e.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(pdg[0].severity, 'minor');
    });

    it('CONFLICT_PAIR_DENSITY_GAP does NOT fire when conflict is evenly distributed across pairs', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // 6 scenes; alice-bob: 2 events, alice-carol: 2, bob-carol: 1 → 2× (not 3×)
      const records271f = [
        makeRec271(0, { relationshipShifts: [negShift271('alice-bob'), negShift271('alice-carol')] }),
        makeRec271(1, { relationshipShifts: [negShift271('alice-bob'), negShift271('alice-carol')] }),
        makeRec271(2, { relationshipShifts: [negShift271('bob-carol')] }),
        makeRec271(3), makeRec271(4), makeRec271(5),
      ];
      const result271f = await conflictPass(makeInput271(records271f));
      const pdg = result271f.issues.filter((i: any) => i.rule === 'CONFLICT_PAIR_DENSITY_GAP');
      assert.strictEqual(pdg.length, 0, 'Should NOT fire when conflict is evenly distributed across pairs');
    });
  });


  describe('Wave 257 — conflictPass: conflict Act 3 absent, reconciliation absent, conflict opening void', async () => {
    const makeRec257 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput257 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: '...',
      records: records as any, structure: {} as any,
      storyContext: {} as any, annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('CONFLICT_ACT3_ABSENT fires when Act 3 has no conflict but earlier acts do', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // 8 records; act3Start = floor(8*0.75)=6; conflict in scenes 1,3 (negative shifts), none at 6,7
      const records257a = [
        makeRec257(0),
        makeRec257(1, { relationshipShifts: [{ pairKey: 'A|B', dimension: 'trust', amount: -0.5 }] }),
        makeRec257(2),
        makeRec257(3, { suspenseDelta: -2 }),
        makeRec257(4), makeRec257(5),
        makeRec257(6), makeRec257(7),
      ];
      const result257a = await conflictPass(makeInput257(records257a));
      const abs = result257a.issues.filter((i: any) => i.rule === 'CONFLICT_ACT3_ABSENT');
      assert.ok(abs.length >= 1, `Should detect CONFLICT_ACT3_ABSENT, got: ${JSON.stringify(result257a.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(abs[0].severity, 'major');
    });

    it('CONFLICT_ACT3_ABSENT does NOT fire when Act 3 carries conflict', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      const records257b = [
        makeRec257(0),
        makeRec257(1, { relationshipShifts: [{ pairKey: 'A|B', dimension: 'trust', amount: -0.5 }] }),
        makeRec257(2),
        makeRec257(3, { suspenseDelta: -2 }),
        makeRec257(4), makeRec257(5),
        makeRec257(6, { suspenseDelta: -2 }),
        makeRec257(7),
      ];
      const result257b = await conflictPass(makeInput257(records257b));
      const abs = result257b.issues.filter((i: any) => i.rule === 'CONFLICT_ACT3_ABSENT');
      assert.strictEqual(abs.length, 0, 'Should NOT fire when Act 3 carries conflict');
    });

    it('RECONCILIATION_ABSENT fires when 2+ broken pairs never recover', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // pairs A|B and C|D both rupture (≤ -0.4), neither ever gets a positive shift later
      const records257c = [
        makeRec257(0),
        makeRec257(1, { relationshipShifts: [{ pairKey: 'A|B', dimension: 'trust', amount: -0.5 }] }),
        makeRec257(2, { relationshipShifts: [{ pairKey: 'C|D', dimension: 'power', amount: -0.6 }] }),
        makeRec257(3, { relationshipShifts: [{ pairKey: 'A|B', dimension: 'trust', amount: -0.2 }] }),
        makeRec257(4), makeRec257(5),
        makeRec257(6, { suspenseDelta: -2 }),
        makeRec257(7),
      ];
      const result257c = await conflictPass(makeInput257(records257c));
      const rec = result257c.issues.filter((i: any) => i.rule === 'RECONCILIATION_ABSENT');
      assert.ok(rec.length >= 1, `Should detect RECONCILIATION_ABSENT, got: ${JSON.stringify(result257c.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(rec[0].severity, 'minor');
    });

    it('RECONCILIATION_ABSENT does NOT fire when a broken pair reconciles', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // A|B ruptures then recovers (+0.4); C|D ruptures and stays broken → at least one reconciled
      const records257d = [
        makeRec257(0),
        makeRec257(1, { relationshipShifts: [{ pairKey: 'A|B', dimension: 'trust', amount: -0.5 }] }),
        makeRec257(2, { relationshipShifts: [{ pairKey: 'C|D', dimension: 'power', amount: -0.6 }] }),
        makeRec257(3),
        makeRec257(4, { relationshipShifts: [{ pairKey: 'A|B', dimension: 'trust', amount: 0.4 }] }),
        makeRec257(5),
        makeRec257(6, { suspenseDelta: -2 }),
        makeRec257(7),
      ];
      const result257d = await conflictPass(makeInput257(records257d));
      const rec = result257d.issues.filter((i: any) => i.rule === 'RECONCILIATION_ABSENT');
      assert.strictEqual(rec.length, 0, 'Should NOT fire when at least one broken pair reconciles');
    });

    it('CONFLICT_OPENING_VOID fires when Act 1 is frictionless but conflict exists later', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // 8 records; act1End = floor(8*0.25)=2; scenes 0,1 frictionless; conflict at scene 3
      const records257e = [
        makeRec257(0),
        makeRec257(1),
        makeRec257(2, { relationshipShifts: [{ pairKey: 'A|B', dimension: 'trust', amount: -0.5 }] }),
        makeRec257(3, { suspenseDelta: -2 }),
        makeRec257(4), makeRec257(5),
        makeRec257(6, { suspenseDelta: -2 }),
        makeRec257(7),
      ];
      const result257e = await conflictPass(makeInput257(records257e));
      const voidIss = result257e.issues.filter((i: any) => i.rule === 'CONFLICT_OPENING_VOID');
      assert.ok(voidIss.length >= 1, `Should detect CONFLICT_OPENING_VOID, got: ${JSON.stringify(result257e.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(voidIss[0].severity, 'minor');
    });

    it('CONFLICT_OPENING_VOID does NOT fire when Act 1 carries conflict', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      const records257f = [
        makeRec257(0, { suspenseDelta: -2 }),
        makeRec257(1),
        makeRec257(2, { relationshipShifts: [{ pairKey: 'A|B', dimension: 'trust', amount: -0.5 }] }),
        makeRec257(3, { suspenseDelta: -2 }),
        makeRec257(4), makeRec257(5),
        makeRec257(6, { suspenseDelta: -2 }),
        makeRec257(7),
      ];
      const result257f = await conflictPass(makeInput257(records257f));
      const voidIss = result257f.issues.filter((i: any) => i.rule === 'CONFLICT_OPENING_VOID');
      assert.strictEqual(voidIss.length, 0, 'Should NOT fire when Act 1 carries conflict');
    });
  });


  describe('Wave 243 — conflictPass: conflict recovery too fast, single pair conflict, conflict purpose monotone', async () => {
    const makeRec243 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput243 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: '...',
      records: records as any, structure: {} as any,
      storyContext: {} as any,
      annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('CONFLICT_RECOVERY_TOO_FAST fires when all deep reversals recover within 2 scenes', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // 8 records; 2 deep reversals each immediately followed by positive recovery
      const records243a = [
        makeRec243(0),
        makeRec243(1, { suspenseDelta: -2.0 }),
        makeRec243(2, { suspenseDelta: 1.5 }),
        makeRec243(3),
        makeRec243(4, { suspenseDelta: -2.5 }),
        makeRec243(5, { suspenseDelta: 1.2 }),
        makeRec243(6), makeRec243(7),
      ];
      const result = await conflictPass(makeInput243(records243a));
      assert.ok(result.issues.some((i: any) => i.rule === 'CONFLICT_RECOVERY_TOO_FAST'), `Expected CONFLICT_RECOVERY_TOO_FAST, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('CONFLICT_RECOVERY_TOO_FAST does NOT fire when at least one reversal lingers', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // Scene 1 deep reversal; scenes 2,3 neutral (no recovery within 2); scene 4 deep reversal; scene 5 recovery
      const records243b = [
        makeRec243(0),
        makeRec243(1, { suspenseDelta: -2.0 }),
        makeRec243(2, { suspenseDelta: 0 }),
        makeRec243(3, { suspenseDelta: 0 }),
        makeRec243(4, { suspenseDelta: -2.5 }),
        makeRec243(5, { suspenseDelta: 1.5 }),
        makeRec243(6), makeRec243(7),
      ];
      const result = await conflictPass(makeInput243(records243b));
      assert.ok(!result.issues.some((i: any) => i.rule === 'CONFLICT_RECOVERY_TOO_FAST'), 'Should NOT fire when at least one reversal is allowed to linger');
    });

    it('SINGLE_PAIR_CONFLICT fires when only one pair carries all negative relationship shifts', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // 2 pairs; only ALICE|BOB has negative shift; CAROL|DAN has positive only
      const records243c = [
        makeRec243(0), makeRec243(1),
        makeRec243(2, { relationshipShifts: [{ pairKey: 'ALICE|BOB', dimension: 'trust', amount: -0.5 }] }),
        makeRec243(3, { relationshipShifts: [{ pairKey: 'CAROL|DAN', dimension: 'affinity', amount: 0.4 }] }),
        makeRec243(4), makeRec243(5), makeRec243(6), makeRec243(7),
      ];
      const result = await conflictPass(makeInput243(records243c));
      assert.ok(result.issues.some((i: any) => i.rule === 'SINGLE_PAIR_CONFLICT'), `Expected SINGLE_PAIR_CONFLICT, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('SINGLE_PAIR_CONFLICT does NOT fire when multiple pairs carry negative shifts', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // Both pairs have negative shifts
      const records243d = [
        makeRec243(0), makeRec243(1),
        makeRec243(2, { relationshipShifts: [{ pairKey: 'ALICE|BOB', dimension: 'trust', amount: -0.5 }] }),
        makeRec243(3, { relationshipShifts: [{ pairKey: 'CAROL|DAN', dimension: 'affinity', amount: -0.4 }] }),
        makeRec243(4), makeRec243(5), makeRec243(6), makeRec243(7),
      ];
      const result = await conflictPass(makeInput243(records243d));
      assert.ok(!result.issues.some((i: any) => i.rule === 'SINGLE_PAIR_CONFLICT'), 'Should NOT fire when multiple pairs have negative shifts');
    });

    it('CONFLICT_PURPOSE_MONOTONE fires when all conflict scenes share the same purpose label', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // 3 conflict scenes (suspenseDelta < -1), all purpose='confrontation'
      const records243e = [
        makeRec243(0),
        makeRec243(1, { suspenseDelta: -2, purpose: 'confrontation' }),
        makeRec243(2),
        makeRec243(3, { suspenseDelta: -1.5, purpose: 'confrontation' }),
        makeRec243(4),
        makeRec243(5, { suspenseDelta: -2.5, purpose: 'confrontation' }),
        makeRec243(6), makeRec243(7),
      ];
      const result = await conflictPass(makeInput243(records243e));
      assert.ok(result.issues.some((i: any) => i.rule === 'CONFLICT_PURPOSE_MONOTONE'), `Expected CONFLICT_PURPOSE_MONOTONE, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('CONFLICT_PURPOSE_MONOTONE does NOT fire when conflict scenes have varied purposes', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      const records243f = [
        makeRec243(0),
        makeRec243(1, { suspenseDelta: -2, purpose: 'confrontation' }),
        makeRec243(2),
        makeRec243(3, { suspenseDelta: -1.5, purpose: 'revelation' }),
        makeRec243(4),
        makeRec243(5, { suspenseDelta: -2.5, purpose: 'crisis' }),
        makeRec243(6), makeRec243(7),
      ];
      const result = await conflictPass(makeInput243(records243f));
      assert.ok(!result.issues.some((i: any) => i.rule === 'CONFLICT_PURPOSE_MONOTONE'), 'Should NOT fire when conflict scenes have different purposes');
    });
  });


  describe('Wave 214 — conflictPass: unrelieved tension ascent, conflict concentration spike, reversal magnitude decay (conflict-dynamics physics)', async () => {
    const makeRec214 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 1,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput214 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: 'INT. SC - DAY\nAction line.\n',
      records: records as any, structure: {} as any,
      storyContext: {} as any, annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('UNRELIEVED_TENSION_ASCENT fires on a long run of escalation with no release valve', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // n=10; every scene adds external pressure (default suspenseDelta=1>0), none releases
      // → run of 10 ≥ 6 → fires
      const records = Array.from({ length: 10 }, (_, i) => makeRec214(i));
      const result = await conflictPass(makeInput214(records));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'UNRELIEVED_TENSION_ASCENT'),
        'Should fire when 6+ consecutive scenes escalate with no release beat',
      );
    });

    it('UNRELIEVED_TENSION_ASCENT does not fire when release valves break the run', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // Two release beats (suspenseDelta=-2) at scenes 3 and 7 split the runs to ≤3 each → no fire
      const records = Array.from({ length: 10 }, (_, i) => makeRec214(i));
      records[3].suspenseDelta = -2;
      records[7].suspenseDelta = -2;
      const result = await conflictPass(makeInput214(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'UNRELIEVED_TENSION_ASCENT'),
        'Should NOT fire when release valves keep every escalation run under 6 scenes',
      );
    });

    it('CONFLICT_CONCENTRATION_SPIKE fires when one scene holds the majority of conflict mass', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // n=10; calm scenes (suspenseDelta=0) except scene5 detonates: huge suspense + a
      // severe relationship rupture → scene5 mass dominates ≥60% of the total
      const records = Array.from({ length: 10 }, (_, i) => makeRec214(i, { suspenseDelta: 0 }));
      records[5] = makeRec214(5, {
        suspenseDelta: 12,
        relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: -1.0 }],
      });
      const result = await conflictPass(makeInput214(records));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'CONFLICT_CONCENTRATION_SPIKE'),
        'Should fire when a single scene carries 60%+ of total conflict mass',
      );
    });

    it('CONFLICT_CONCENTRATION_SPIKE does not fire when conflict mass is distributed', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // Conflict spread across scenes 2,4,6,8 (suspenseDelta=3 each) → max share 25% < 60%
      const records = Array.from({ length: 10 }, (_, i) => makeRec214(i, { suspenseDelta: 0 }));
      for (const i of [2, 4, 6, 8]) records[i].suspenseDelta = 3;
      const result = await conflictPass(makeInput214(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'CONFLICT_CONCENTRATION_SPIKE'),
        'Should NOT fire when conflict mass is spread evenly across multiple scenes',
      );
    });

    it('REVERSAL_MAGNITUDE_DECAY fires when reversals shrink toward the climax', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // n=10, thirds at 3; big early reversal (scene1, |8|), small late reversal (scene8, |2|)
      // firstMax=8 ≥ 2*lastMax=4 → fires
      const records = Array.from({ length: 10 }, (_, i) => makeRec214(i));
      records[1].suspenseDelta = -8;
      records[8].suspenseDelta = -2;
      const result = await conflictPass(makeInput214(records));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'REVERSAL_MAGNITUDE_DECAY'),
        'Should fire when the largest early reversal is ≥2× the largest late reversal',
      );
    });

    it('REVERSAL_MAGNITUDE_DECAY does not fire when reversals grow toward the climax', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // Escalating stakes: small early reversal (scene1, |3|), big late reversal (scene8, |8|)
      // firstMax=3 < 2*lastMax=16 → no fire
      const records = Array.from({ length: 10 }, (_, i) => makeRec214(i));
      records[1].suspenseDelta = -3;
      records[8].suspenseDelta = -8;
      const result = await conflictPass(makeInput214(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'REVERSAL_MAGNITUDE_DECAY'),
        'Should NOT fire when late reversals are as large or larger than early ones',
      );
    });
  });


  describe('Wave 210 — conflictPass: positive spiral trap, reversal symmetry break, antagonist force only', async () => {
    const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');

    const baseConf210 = {
      actPosition: 'act3' as const, completionPercent: 90, totalClockPressure: 6,
      midpointPressure: 2, reversalCount: 2, tightestScene: null,
      avgSuspensePerScene: 2, escalating: true, reversalDensity: 0.15,
      approachingClimax: false, openClues: 0, revelationCount: 2,
    };
    const makeRec210 = (idx: number, extra: Partial<any> = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'action', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 2,
      seededClueIds: [], payoffSetupIds: [], dialogueHighlights: [],
      relationshipShifts: [], unresolvedClues: [],
      ...extra,
    });
    const blankF210 = (n: number) =>
      Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join('');

    it('POSITIVE_SPIRAL_TRAP fires when 4+ consecutive scenes all have positive emotional shifts', async () => {
      // Scenes 4–7 all positive (run of 4). Reversal at scene 2 and clock at scene 0/5
      // prevent other checks from firing.
      const records210a = [
        makeRec210(0, { clockRaised: true }),
        makeRec210(1, {}),
        makeRec210(2, { suspenseDelta: -2, emotionalShift: 'negative' }),
        makeRec210(3, {}),
        makeRec210(4, { emotionalShift: 'positive', clockRaised: true }),
        makeRec210(5, { emotionalShift: 'positive' }),
        makeRec210(6, { emotionalShift: 'positive' }),
        makeRec210(7, { emotionalShift: 'positive' }),
      ];
      const result210a = await conflictPass({
        fountain: blankF210(8), original: blankF210(8),
        records: records210a as any, structure: baseConf210 as any, annotations: [], approvedSpans: [],
      });
      assert.ok(
        result210a.issues.some(i => i.rule === 'POSITIVE_SPIRAL_TRAP'),
        'Should fire POSITIVE_SPIRAL_TRAP when 4 consecutive scenes all carry positive emotional shifts',
      );
    });

    it('POSITIVE_SPIRAL_TRAP does NOT fire when the positive run is broken at 3 consecutive scenes', async () => {
      // Scenes 4–6 positive (run of 3), scene 7 neutral — max run = 3 < 4.
      const records210b = [
        makeRec210(0, { clockRaised: true }),
        makeRec210(1, {}),
        makeRec210(2, { suspenseDelta: -2, emotionalShift: 'negative' }),
        makeRec210(3, {}),
        makeRec210(4, { emotionalShift: 'positive', clockRaised: true }),
        makeRec210(5, { emotionalShift: 'positive' }),
        makeRec210(6, { emotionalShift: 'positive' }),
        makeRec210(7, { emotionalShift: 'neutral' }),
      ];
      const result210b = await conflictPass({
        fountain: blankF210(8), original: blankF210(8),
        records: records210b as any, structure: baseConf210 as any, annotations: [], approvedSpans: [],
      });
      assert.ok(
        !result210b.issues.some(i => i.rule === 'POSITIVE_SPIRAL_TRAP'),
        'Should NOT fire when the longest positive run is exactly 3 (< 4)',
      );
    });

    it('REVERSAL_SYMMETRY_BREAK fires when Act 2a has 2+ reversals but Act 2b has none', async () => {
      // n=10; Act 2a=[2,3,4] has reversals at 2 and 4; Act 2b=[5,6] has none.
      const records210c = [
        makeRec210(0,  { clockRaised: true }),
        makeRec210(1,  {}),
        makeRec210(2,  { suspenseDelta: -2, emotionalShift: 'negative' }),
        makeRec210(3,  { emotionalShift: 'negative' }),
        makeRec210(4,  { suspenseDelta: -2 }),
        makeRec210(5,  {}),
        makeRec210(6,  { clockRaised: true, relationshipShifts: [{ pairKey: 'AB', dimension: 'trust', amount: -0.3 }] }),
        makeRec210(7,  { suspenseDelta: 3.5 }),
        makeRec210(8,  { suspenseDelta: -1.5, emotionalShift: 'negative' }),
        makeRec210(9,  { emotionalShift: 'positive' }),
      ];
      const result210c = await conflictPass({
        fountain: blankF210(10), original: blankF210(10),
        records: records210c as any, structure: baseConf210 as any, annotations: [], approvedSpans: [],
      });
      assert.ok(
        result210c.issues.some(i => i.rule === 'REVERSAL_SYMMETRY_BREAK'),
        'Should fire REVERSAL_SYMMETRY_BREAK when Act 2a has ≥2 reversals but Act 2b has zero',
      );
    });

    it('REVERSAL_SYMMETRY_BREAK does NOT fire when Act 2b also contains a reversal', async () => {
      // Same setup but scene 6 changed to include a reversal (suspenseDelta=-1.5).
      const records210d = [
        makeRec210(0,  { clockRaised: true }),
        makeRec210(1,  {}),
        makeRec210(2,  { suspenseDelta: -2, emotionalShift: 'negative' }),
        makeRec210(3,  { emotionalShift: 'negative' }),
        makeRec210(4,  { suspenseDelta: -2 }),
        makeRec210(5,  {}),
        makeRec210(6,  { clockRaised: true, suspenseDelta: -1.5, relationshipShifts: [{ pairKey: 'AB', dimension: 'trust', amount: -0.3 }] }),
        makeRec210(7,  { suspenseDelta: 3.5 }),
        makeRec210(8,  { suspenseDelta: -1.5, emotionalShift: 'negative' }),
        makeRec210(9,  { emotionalShift: 'positive' }),
      ];
      const result210d = await conflictPass({
        fountain: blankF210(10), original: blankF210(10),
        records: records210d as any, structure: baseConf210 as any, annotations: [], approvedSpans: [],
      });
      assert.ok(
        !result210d.issues.some(i => i.rule === 'REVERSAL_SYMMETRY_BREAK'),
        'Should NOT fire when Act 2b contains at least one reversal',
      );
    });

    it('ANTAGONIST_FORCE_ONLY fires when 2+ reversals exist but no negative relationship shifts', async () => {
      // Reversals at scenes 2 and 4; no relationship shifts anywhere.
      const records210e = [
        makeRec210(0, { clockRaised: true }),
        makeRec210(1, {}),
        makeRec210(2, { suspenseDelta: -2, emotionalShift: 'negative' }),
        makeRec210(3, { emotionalShift: 'negative' }),
        makeRec210(4, { suspenseDelta: -1.5 }),
        makeRec210(5, { clockRaised: true }),
        makeRec210(6, { suspenseDelta: 3 }),
        makeRec210(7, { suspenseDelta: 4, clockRaised: true }),
      ];
      const result210e = await conflictPass({
        fountain: blankF210(8), original: blankF210(8),
        records: records210e as any, structure: baseConf210 as any, annotations: [], approvedSpans: [],
      });
      assert.ok(
        result210e.issues.some(i => i.rule === 'ANTAGONIST_FORCE_ONLY'),
        'Should fire ANTAGONIST_FORCE_ONLY when 2+ reversals exist but zero scenes carry a negative relationship shift',
      );
    });

    it('ANTAGONIST_FORCE_ONLY does NOT fire when at least one scene carries a negative relationship shift', async () => {
      // Same setup but scene 5 adds a negative relationship shift.
      const records210f = [
        makeRec210(0, { clockRaised: true }),
        makeRec210(1, {}),
        makeRec210(2, { suspenseDelta: -2, emotionalShift: 'negative' }),
        makeRec210(3, { emotionalShift: 'negative' }),
        makeRec210(4, { suspenseDelta: -1.5 }),
        makeRec210(5, { clockRaised: true, relationshipShifts: [{ pairKey: 'AB', dimension: 'trust', amount: -0.4 }] }),
        makeRec210(6, { suspenseDelta: 3 }),
        makeRec210(7, { suspenseDelta: 4, clockRaised: true }),
      ];
      const result210f = await conflictPass({
        fountain: blankF210(8), original: blankF210(8),
        records: records210f as any, structure: baseConf210 as any, annotations: [], approvedSpans: [],
      });
      assert.ok(
        !result210f.issues.some(i => i.rule === 'ANTAGONIST_FORCE_ONLY'),
        'Should NOT fire when at least one scene has a negative relationship shift (interpersonal conflict exists)',
      );
    });
  });


  describe('Wave 195 — conflictPass: midpoint absent, act3 deflation, frequency drop', async () => {
    const makeRec195 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 1,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      ...overrides,
    });
    const baseStructure195 = {
      escalating: true, reversalDensity: 0.1, openClues: 0,
      approachingClimax: false, avgSuspensePerScene: 1,
    };
    const makeInput195 = (records: any[]) => ({
      fountain: 'INT. TEST - DAY\nA.\n', original: 'INT. TEST - DAY\nA.\n',
      records: records as any, structure: baseStructure195 as any,
      storyContext: {} as any, annotations: [], approvedSpans: [],
    });

    it('CONFLICT_MIDPOINT_ABSENT fires when midpoint zone has no conflict signal', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // 8 records: only records 0 and 7 have clock (act1 hook + second-half coverage)
      // midpoint window [3,4,5] has no clock, no reversal, no negative shift
      const records = [
        makeRec195(0, { clockRaised: true }),
        makeRec195(1), makeRec195(2), makeRec195(3),
        makeRec195(4), makeRec195(5), makeRec195(6),
        makeRec195(7, { clockRaised: true }),
      ];
      const result = await conflictPass(makeInput195(records));
      assert.ok(result.issues.some((i: any) => i.rule === 'CONFLICT_MIDPOINT_ABSENT'),
        'Should fire when midpoint ±1 window carries no conflict signal');
    });

    it('CONFLICT_MIDPOINT_ABSENT does not fire when midpoint scene has a conflict signal', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // midpoint scene (record 4) has clockRaised — conflict signal present
      const records = [
        makeRec195(0, { clockRaised: true }),
        makeRec195(1), makeRec195(2), makeRec195(3),
        makeRec195(4, { clockRaised: true }),
        makeRec195(5), makeRec195(6),
        makeRec195(7, { clockRaised: true }),
      ];
      const result = await conflictPass(makeInput195(records));
      assert.ok(!result.issues.some((i: any) => i.rule === 'CONFLICT_MIDPOINT_ABSENT'),
        'Should NOT fire when midpoint zone carries a conflict signal');
    });

    it('CONFLICT_ACT3_DEFLATION fires when act3 suspense drops far below late act2', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // 8 records: act2b (records 4-5) high suspense, act3 (records 6-7) near zero
      const records = [
        makeRec195(0, { clockRaised: true, suspenseDelta: 1 }),
        makeRec195(1, { suspenseDelta: 1 }),
        makeRec195(2, { suspenseDelta: 1 }),
        makeRec195(3, { suspenseDelta: 1 }),
        makeRec195(4, { suspenseDelta: 4, clockRaised: true }),
        makeRec195(5, { suspenseDelta: 4 }),
        makeRec195(6, { suspenseDelta: 0 }),
        makeRec195(7, { suspenseDelta: 0 }),
      ];
      const result = await conflictPass(makeInput195(records));
      assert.ok(result.issues.some((i: any) => i.rule === 'CONFLICT_ACT3_DEFLATION'),
        'Should fire when act3 suspense is <60% of late act2 average');
    });

    it('CONFLICT_ACT3_DEFLATION does not fire when act3 suspense meets or exceeds act2b', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // act2b low, act3 high — conflict escalates into finale
      const records = [
        makeRec195(0, { clockRaised: true, suspenseDelta: 1 }),
        makeRec195(1, { suspenseDelta: 1 }),
        makeRec195(2, { suspenseDelta: 1 }),
        makeRec195(3, { suspenseDelta: 1 }),
        makeRec195(4, { clockRaised: true, suspenseDelta: 1 }),
        makeRec195(5, { suspenseDelta: 1 }),
        makeRec195(6, { suspenseDelta: 4 }),
        makeRec195(7, { suspenseDelta: 4 }),
      ];
      const result = await conflictPass(makeInput195(records));
      assert.ok(!result.issues.some((i: any) => i.rule === 'CONFLICT_ACT3_DEFLATION'),
        'Should NOT fire when act3 suspense is high relative to act2b');
    });

    it('CONFLICT_FREQUENCY_DROP fires when conflict events cluster in the opening third', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // 9 records: first third (0-2) all reversals, last third (6-8) calm except record 7
      const records = [
        makeRec195(0, { suspenseDelta: -2, clockRaised: true }),
        makeRec195(1, { suspenseDelta: -2 }),
        makeRec195(2, { suspenseDelta: -2 }),
        makeRec195(3),
        makeRec195(4, { clockRaised: true }),
        makeRec195(5),
        makeRec195(6),
        makeRec195(7, { suspenseDelta: -2 }),
        makeRec195(8),
      ];
      const result = await conflictPass(makeInput195(records));
      assert.ok(result.issues.some((i: any) => i.rule === 'CONFLICT_FREQUENCY_DROP'),
        'Should fire when first-third conflict frequency far exceeds last-third frequency');
    });

    it('CONFLICT_FREQUENCY_DROP does not fire when conflict events increase toward the end', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // 9 records: first third calm, last third all reversals — escalating pattern
      const records = [
        makeRec195(0, { clockRaised: true }),
        makeRec195(1),
        makeRec195(2),
        makeRec195(3),
        makeRec195(4, { clockRaised: true }),
        makeRec195(5),
        makeRec195(6, { suspenseDelta: -2 }),
        makeRec195(7, { suspenseDelta: -2 }),
        makeRec195(8, { suspenseDelta: -2 }),
      ];
      const result = await conflictPass(makeInput195(records));
      assert.ok(!result.issues.some((i: any) => i.rule === 'CONFLICT_FREQUENCY_DROP'),
        'Should NOT fire when conflict events escalate toward the finale');
    });
  });


  describe('Wave 158 — conflictPass: threat amnesia, antagonist vanish, single-register conflict', async () => {
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

    it('conflictPass detects THREAT_AMNESIA when clock set in Act 1 disappears from second half', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // 8 scenes: act1Zone=2, secondHalfStart=4
      // clockRaised only in scene 1 (Act 1), not in scenes 4-7
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, { clockRaised: i === 1, suspenseDelta: 1 }),
      );
      const result = await conflictPass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any,
        structure: { escalating: true, reversalCount: 1, reversalDensity: 0.1, openClues: 0, approachingClimax: false, avgSuspensePerScene: 1 } as any,
        annotations: noAnnotations(8), approvedSpans: [],
      });
      const amnesia = result.issues.filter(i => i.rule === 'THREAT_AMNESIA');
      assert.ok(amnesia.length >= 1, `Should detect THREAT_AMNESIA; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(amnesia[0].severity === 'major');
    });

    it('conflictPass does NOT fire THREAT_AMNESIA when clock continues in second half', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, { clockRaised: i === 1 || i === 5, suspenseDelta: 1 }),
      );
      const result = await conflictPass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any,
        structure: { escalating: true, reversalCount: 1, reversalDensity: 0.1, openClues: 0, approachingClimax: false, avgSuspensePerScene: 1 } as any,
        annotations: noAnnotations(8), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'THREAT_AMNESIA'),
        'Should NOT fire when clock appears in second half',
      );
    });

    it('conflictPass detects ANTAGONIST_VANISH when reversals disappear after 60% mark', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      // 10 scenes: splitPoint=6. Reversals at scenes 1 and 3, none at 6-9.
      const records = Array.from({ length: 10 }, (_, i) =>
        makeRec(i, { suspenseDelta: (i === 1 || i === 3) ? -2 : 1 }),
      );
      const result = await conflictPass({
        fountain: blankFountain(10), original: blankFountain(10),
        records: records as any,
        structure: { escalating: true, reversalCount: 2, reversalDensity: 0.2, openClues: 0, approachingClimax: false, avgSuspensePerScene: 1 } as any,
        annotations: noAnnotations(10), approvedSpans: [],
      });
      const vanish = result.issues.filter(i => i.rule === 'ANTAGONIST_VANISH');
      assert.ok(vanish.length >= 1, `Should detect ANTAGONIST_VANISH; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(vanish[0].severity === 'major');
    });

    it('conflictPass does NOT fire ANTAGONIST_VANISH when reversals continue in final 40%', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      const records = Array.from({ length: 10 }, (_, i) =>
        makeRec(i, { suspenseDelta: (i === 1 || i === 3 || i === 7) ? -2 : 1 }),
      );
      const result = await conflictPass({
        fountain: blankFountain(10), original: blankFountain(10),
        records: records as any,
        structure: { escalating: true, reversalCount: 3, reversalDensity: 0.3, openClues: 0, approachingClimax: false, avgSuspensePerScene: 1 } as any,
        annotations: noAnnotations(10), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'ANTAGONIST_VANISH'),
        'Should NOT fire when a reversal exists in the final 40%',
      );
    });

    it('conflictPass detects SINGLE_REGISTER_CONFLICT when all shifts use same dimension', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      const records = Array.from({ length: 6 }, (_, i) =>
        makeRec(i, {
          relationshipShifts: i < 4
            ? [{ pairKey: 'alice|bob', dimension: 'trust', amount: i % 2 === 0 ? 0.3 : -0.3 }]
            : [],
        }),
      );
      const result = await conflictPass({
        fountain: blankFountain(6), original: blankFountain(6),
        records: records as any,
        structure: { escalating: true, reversalCount: 0, reversalDensity: 0, openClues: 0, approachingClimax: false, avgSuspensePerScene: 1 } as any,
        annotations: noAnnotations(6), approvedSpans: [],
      });
      const single = result.issues.filter(i => i.rule === 'SINGLE_REGISTER_CONFLICT');
      assert.ok(single.length >= 1, `Should detect SINGLE_REGISTER_CONFLICT; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(single[0].severity === 'minor');
    });

    it('conflictPass does NOT fire SINGLE_REGISTER_CONFLICT when shifts use multiple dimensions', async () => {
      const { conflictPass } = await import('../../server/nvm/revision/passes/conflict.ts');
      const records = Array.from({ length: 6 }, (_, i) =>
        makeRec(i, {
          relationshipShifts: i < 4
            ? [{ pairKey: 'alice|bob', dimension: i < 2 ? 'trust' : 'power', amount: 0.3 }]
            : [],
        }),
      );
      const result = await conflictPass({
        fountain: blankFountain(6), original: blankFountain(6),
        records: records as any,
        structure: { escalating: true, reversalCount: 0, reversalDensity: 0, openClues: 0, approachingClimax: false, avgSuspensePerScene: 1 } as any,
        annotations: noAnnotations(6), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'SINGLE_REGISTER_CONFLICT'),
        'Should NOT fire when multiple relationship dimensions are present',
      );
    });
  });