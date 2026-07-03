// Extracted from the former monolithic test.ts (audit M2.1 — split for maintainability).
// beliefPass revision-rule tests. Shared imports/helpers below are duplicated verbatim across every split
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
// Aliased: this file already has its own local makeSceneRecord (below, a pre-existing
// single-argument factory used by earlier waves) — importing under the shared name would collide.
import { makeSceneRecord as makeSharedRecord } from './helpers.ts';

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


  // ── Wave 145: Belief pass enhancements ─────────────────────────────────────
  describe('Wave 145 — beliefPass: deception consequence and belief reversals', async () => {
    it('beliefPass detects DECEPTION_WITHOUT_CONSEQUENCE when lie is discovered but ignored', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      const makeRec = (idx: number, dialogueHighlights: string[], revelation: string | null, suspense: number, relationShifts: any[]): any => ({
        commitId: `c${idx}`, sceneIdx: idx, slug: `SC${idx}`, purpose: 'dialogue',
        dramaticTurn: 'nothing', clockRaised: false, clockDelta: 0,
        emotionalShift: suspense > 1 ? 'positive' : 'neutral',
        suspenseDelta: suspense,
        dialogueHighlights, revelation,
        unresolvedClues: [],
        seededClueIds: [], payoffSetupIds: [],
        visualBeats: [],
        relationshipShifts: relationShifts,
      });
      const records = [
        makeRec(0, ['alice: Michael never stole anything from anyone'], null, 1, []),
        makeRec(1, ['bob: right Michael would never steal'], null, 0.5, []),
        makeRec(2, [], 'Michael stole the diamonds from prison', 2.5, []), // contradiction revealed
        makeRec(3, ['charlie: what happens next'], null, 0.5, []), // no consequence
        makeRec(4, [], null, 0.5, []),
      ];
      const result = await beliefPass({
        fountain: Array.from({ length: 5 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
        original: Array.from({ length: 5 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
        records: records as unknown as Parameters<typeof beliefPass>[0]['records'],
        structure: {} as any,
        annotations: [],
        approvedSpans: [],
      });
      const deception = result.issues.filter(i => i.rule === 'DECEPTION_WITHOUT_CONSEQUENCE');
      assert.ok(deception.length >= 1, 'Should detect DECEPTION_WITHOUT_CONSEQUENCE when lie is discovered but creates no conflict');
      assert.ok(deception[0].severity === 'major');
    });

    it('beliefPass does NOT fire DECEPTION_WITHOUT_CONSEQUENCE when lie discovery has consequence', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      const makeRec = (idx: number, dialogueHighlights: string[], revelation: string | null, suspense: number, relationShifts: any[]): any => ({
        commitId: `c${idx}`, sceneIdx: idx, slug: `SC${idx}`, purpose: 'dialogue',
        dramaticTurn: 'nothing', clockRaised: false, clockDelta: 0,
        emotionalShift: suspense > 1 ? 'positive' : 'neutral',
        suspenseDelta: suspense,
        dialogueHighlights, revelation,
        unresolvedClues: [],
        seededClueIds: [], payoffSetupIds: [],
        visualBeats: [],
        relationshipShifts: relationShifts,
      });
      const records = [
        makeRec(0, ['alice: Michael never stole anything from anyone'], null, 1, []),
        makeRec(1, ['bob: right Michael would never steal'], null, 0.5, []),
        makeRec(2, [], 'Michael stole the diamonds from prison', 2.5, []), // contradiction revealed
        makeRec(3, ['charlie: you lied to everyone!'], null, 2, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -2 }]), // consequence: relationship shift
        makeRec(4, [], null, 0.5, []),
      ];
      const result = await beliefPass({
        fountain: Array.from({ length: 5 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
        original: Array.from({ length: 5 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
        records: records as unknown as Parameters<typeof beliefPass>[0]['records'],
        structure: {} as any,
        annotations: [],
        approvedSpans: [],
      });
      const deception = result.issues.filter(i => i.rule === 'DECEPTION_WITHOUT_CONSEQUENCE');
      assert.ok(deception.length === 0, 'Should NOT fire when lie discovery creates relationship consequence');
    });

    it('beliefPass detects BELIEF_REVERSAL_UNSUPPORTED when character mood flips without setup', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      const makeRec = (idx: number, emotionalShift: 'positive' | 'negative' | 'neutral', suspense: number, seededClues: string[]): any => ({
        commitId: `c${idx}`, sceneIdx: idx, slug: `SC${idx}`, purpose: 'dialogue',
        dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
        emotionalShift,
        suspenseDelta: suspense,
        dialogueHighlights: ['alice: hello'],
        unresolvedClues: [],
        seededClueIds: seededClues, payoffSetupIds: [],
        visualBeats: [],
        relationshipShifts: [],
      });
      const records = [
        makeRec(0, 'neutral', 1, []),
        makeRec(1, 'neutral', 0.5, []), // no setup
        makeRec(2, 'positive', 3, []), // big reversal without clue/revelation
        makeRec(3, 'positive', 1, []),
      ];
      const result = await beliefPass({
        fountain: Array.from({ length: 4 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
        original: Array.from({ length: 4 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
        records: records as unknown as Parameters<typeof beliefPass>[0]['records'],
        structure: {} as any,
        annotations: [],
        approvedSpans: [],
      });
      const reversal = result.issues.filter(i => i.rule === 'BELIEF_REVERSAL_UNSUPPORTED');
      assert.ok(reversal.length >= 1, 'Should detect BELIEF_REVERSAL_UNSUPPORTED when mood flips without evidence');
      assert.ok(reversal[0].severity === 'major');
    });

    it('beliefPass does NOT fire BELIEF_REVERSAL_UNSUPPORTED when reversal is supported by prior clue', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      const makeRec = (idx: number, emotionalShift: 'positive' | 'negative' | 'neutral', suspense: number, seededClues: string[]): any => ({
        commitId: `c${idx}`, sceneIdx: idx, slug: `SC${idx}`, purpose: 'dialogue',
        dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
        emotionalShift,
        suspenseDelta: suspense,
        dialogueHighlights: ['alice: hello'],
        unresolvedClues: [],
        seededClueIds: seededClues, payoffSetupIds: [],
        visualBeats: [],
        relationshipShifts: [],
      });
      const records = [
        makeRec(0, 'neutral', 1, []),
        makeRec(1, 'neutral', 0.5, ['clue_1']), // setup: clue planted
        makeRec(2, 'positive', 3, []), // reversal justified by prior clue
        makeRec(3, 'positive', 1, []),
      ];
      const result = await beliefPass({
        fountain: Array.from({ length: 4 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
        original: Array.from({ length: 4 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
        records: records as unknown as Parameters<typeof beliefPass>[0]['records'],
        structure: {} as any,
        annotations: [],
        approvedSpans: [],
      });
      const reversal = result.issues.filter(i => i.rule === 'BELIEF_REVERSAL_UNSUPPORTED');
      assert.ok(reversal.length === 0, 'Should NOT fire when reversal is supported by prior clue');
    });

    it('beliefPass detects BELIEF_ISOLATION when scene plants clues but has no dialogue', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      const makeRec = (idx: number, dialogueHighlights: string[], seededClues: string[]): any => ({
        commitId: `c${idx}`, sceneIdx: idx, slug: `SC${idx}`, purpose: 'dialogue',
        dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
        emotionalShift: 'neutral',
        suspenseDelta: 1,
        dialogueHighlights,
        unresolvedClues: [],
        seededClueIds: seededClues, payoffSetupIds: [],
        visualBeats: [],
        relationshipShifts: [],
      });
      const records = [
        makeRec(0, ['alice: setup'], []),
        makeRec(1, [], ['clue_1']), // plants clue but no dialogue
        makeRec(2, ['alice: hello'], []),
        makeRec(3, ['bob: thanks'], []),
        makeRec(4, ['charlie: yes'], []),
      ];
      const result = await beliefPass({
        fountain: Array.from({ length: 5 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
        original: Array.from({ length: 5 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
        records: records as unknown as Parameters<typeof beliefPass>[0]['records'],
        structure: {} as any,
        annotations: [],
        approvedSpans: [],
      });
      const isolation = result.issues.filter(i => i.rule === 'BELIEF_ISOLATION');
      assert.ok(isolation.length >= 1, 'Should detect BELIEF_ISOLATION when clues are planted silently');
      assert.ok(isolation[0].severity === 'major');
    });

    it('beliefPass does NOT fire BELIEF_ISOLATION when clue scene has dialogue', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      const makeRec = (idx: number, dialogueHighlights: string[], seededClues: string[]): any => ({
        commitId: `c${idx}`, sceneIdx: idx, slug: `SC${idx}`, purpose: 'dialogue',
        dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
        emotionalShift: 'neutral',
        suspenseDelta: 1,
        dialogueHighlights,
        unresolvedClues: [],
        seededClueIds: seededClues, payoffSetupIds: [],
        visualBeats: [],
        relationshipShifts: [],
      });
      const records = [
        makeRec(0, ['alice: setup'], []),
        makeRec(1, ['alice: I found the clue'], ['clue_1']), // plants clue WITH dialogue
        makeRec(2, ['alice: hello'], []),
        makeRec(3, ['bob: thanks'], []),
        makeRec(4, ['charlie: yes'], []),
      ];
      const result = await beliefPass({
        fountain: Array.from({ length: 5 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
        original: Array.from({ length: 5 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
        records: records as unknown as Parameters<typeof beliefPass>[0]['records'],
        structure: {} as any,
        annotations: [],
        approvedSpans: [],
      });
      const isolation = result.issues.filter(i => i.rule === 'BELIEF_ISOLATION');
      assert.ok(isolation.length === 0, 'Should NOT fire when clue scene has dialogue');
    });
  });


  describe('Wave 175 — beliefPass: revelation clustering, belief stagnation, single-scene overload', async () => {
    const makeRec = (idx: number, override: Partial<any> = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'dialogue', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
      ...override,
    });
    const beliefInput = (records: any[], n: number) => ({
      fountain: Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
      original: Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
      records: records as any, structure: {} as any, annotations: [], approvedSpans: [],
    });

    // ── REVELATION_CLUSTERING ─────────────────────────────────────────────────
    it('beliefPass detects REVELATION_CLUSTERING when 3 revelations land in a 3-scene window', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      const records = Array.from({ length: 8 }, (_, i) =>
        (i >= 2 && i <= 4)
          ? makeRec(i, { revelation: `discovery ${i}`, dialogueHighlights: [`alice: reacts ${i}`] })
          : makeRec(i),
      );
      const result = await beliefPass(beliefInput(records, 8));
      const cluster = result.issues.filter(i => i.rule === 'REVELATION_CLUSTERING');
      assert.ok(cluster.length >= 1, `Should detect REVELATION_CLUSTERING; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(cluster[0].severity === 'major');
    });

    it('beliefPass does NOT fire REVELATION_CLUSTERING when revelations are spaced out', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      const records = Array.from({ length: 8 }, (_, i) =>
        (i === 1 || i === 4 || i === 7)
          ? makeRec(i, { revelation: `discovery ${i}`, dialogueHighlights: [`alice: reacts ${i}`] })
          : makeRec(i, { dialogueHighlights: [`alice: line ${i}`] }),
      );
      const result = await beliefPass(beliefInput(records, 8));
      assert.ok(
        !result.issues.some(i => i.rule === 'REVELATION_CLUSTERING'),
        'Should NOT fire when revelations are spread across the story',
      );
    });

    // ── BELIEF_STAGNATION ─────────────────────────────────────────────────────
    it('beliefPass detects BELIEF_STAGNATION when no told belief is ever contradicted', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      const records = Array.from({ length: 6 }, (_, i) =>
        i < 4
          ? makeRec(i, { dialogueHighlights: ['alice: the weather is nice today'] })
          : i === 5
          ? makeRec(i, { revelation: 'completely different unrelated topic xyz' })
          : makeRec(i),
      );
      const result = await beliefPass(beliefInput(records, 6));
      const stagnation = result.issues.filter(i => i.rule === 'BELIEF_STAGNATION');
      assert.ok(stagnation.length >= 1, `Should detect BELIEF_STAGNATION; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(stagnation[0].severity === 'major');
    });

    it('beliefPass does NOT fire BELIEF_STAGNATION when a told belief is later contradicted', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      const records = Array.from({ length: 6 }, (_, i) =>
        i < 4
          ? makeRec(i, { dialogueHighlights: ['alice: the package is hidden safely'] })
          : i === 5
          ? makeRec(i, { revelation: 'the package is hidden no longer' })
          : makeRec(i),
      );
      const result = await beliefPass(beliefInput(records, 6));
      assert.ok(
        !result.issues.some(i => i.rule === 'BELIEF_STAGNATION'),
        'Should NOT fire when a later revelation contradicts an earlier belief',
      );
    });

    // ── SINGLE_SCENE_BELIEF_OVERLOAD ──────────────────────────────────────────
    it('beliefPass detects SINGLE_SCENE_BELIEF_OVERLOAD when one scene packs 5+ assertions', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      const records = Array.from({ length: 5 }, (_, i) =>
        i === 2
          ? makeRec(i, { dialogueHighlights: ['alice: a', 'bob: b', 'carol: c', 'dan: d', 'eve: e'] })
          : makeRec(i),
      );
      const result = await beliefPass(beliefInput(records, 5));
      const overload = result.issues.filter(i => i.rule === 'SINGLE_SCENE_BELIEF_OVERLOAD');
      assert.ok(overload.length >= 1, `Should detect SINGLE_SCENE_BELIEF_OVERLOAD; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(overload[0].severity === 'minor');
    });

    it('beliefPass does NOT fire SINGLE_SCENE_BELIEF_OVERLOAD when assertions are spread thin', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      const records = Array.from({ length: 5 }, (_, i) =>
        makeRec(i, { dialogueHighlights: ['alice: a', 'bob: b'] }),
      );
      const result = await beliefPass(beliefInput(records, 5));
      assert.ok(
        !result.issues.some(i => i.rule === 'SINGLE_SCENE_BELIEF_OVERLOAD'),
        'Should NOT fire when no scene exceeds four belief assertions',
      );
    });
  });


  describe('Wave 190 — beliefPass: cold open void, unresolved excess, back-weighted revelations', async () => {
    const makeRec = (idx: number, override: Partial<any> = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'dialogue', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
      ...override,
    });
    const beliefInput = (records: any[], n: number) => ({
      fountain: Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
      original: Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
      records: records as any, structure: {} as any, annotations: [], approvedSpans: [],
    });

    // ── COLD_OPEN_BELIEF_VOID ──────────────────────────────────────────────────
    it('beliefPass detects COLD_OPEN_BELIEF_VOID when first quarter has no belief content', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // records[0,1] are empty; records[2..7] have dialogue; revelation at 4 breaks exposition streak
      const records = Array.from({ length: 8 }, (_, i) =>
        i >= 2
          ? makeRec(i, { dialogueHighlights: [`alice: note ${i}`], revelation: i === 4 ? 'something discovered' : null })
          : makeRec(i),
      );
      const result = await beliefPass(beliefInput(records, 8));
      const cold = result.issues.filter(i => i.rule === 'COLD_OPEN_BELIEF_VOID');
      assert.ok(cold.length >= 1, `Should detect COLD_OPEN_BELIEF_VOID; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(cold[0].severity === 'minor');
    });

    it('beliefPass does NOT fire COLD_OPEN_BELIEF_VOID when Act 1 has belief content', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // records[0] already has a dialogueHighlight → Act 1 has belief content
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, {
          dialogueHighlights: [`alice: note ${i}`],
          revelation: i === 4 ? 'discovery' : null,
        }),
      );
      const result = await beliefPass(beliefInput(records, 8));
      assert.ok(
        !result.issues.some(i => i.rule === 'COLD_OPEN_BELIEF_VOID'),
        'Should NOT fire when Act 1 already carries belief assertions',
      );
    });

    // ── UNRESOLVED_BELIEF_EXCESS ───────────────────────────────────────────────
    it('beliefPass detects UNRESOLVED_BELIEF_EXCESS when 4+ told beliefs have no revelation', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 8 unique told beliefs; revelation at scene 7 with completely different vocabulary
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, {
          dialogueHighlights: [`alice: unique claim alpha bravo ${i}`],
          revelation: i === 7 ? 'something entirely unrelated xyz' : null,
        }),
      );
      const result = await beliefPass(beliefInput(records, 8));
      const excess = result.issues.filter(i => i.rule === 'UNRESOLVED_BELIEF_EXCESS');
      assert.ok(excess.length >= 1, `Should detect UNRESOLVED_BELIEF_EXCESS; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(excess[0].severity === 'major');
    });

    it('beliefPass does NOT fire UNRESOLVED_BELIEF_EXCESS when told beliefs are addressed', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // told beliefs about "treasure hidden underground"; revelation shares those words
      const records = Array.from({ length: 8 }, (_, i) =>
        i < 4
          ? makeRec(i, { dialogueHighlights: ['alice: the treasure is hidden underground'] })
          : makeRec(i, { revelation: i === 4 ? 'the treasure is hidden no longer underground' : null }),
      );
      const result = await beliefPass(beliefInput(records, 8));
      assert.ok(
        !result.issues.some(i => i.rule === 'UNRESOLVED_BELIEF_EXCESS'),
        'Should NOT fire when told beliefs are addressed by a revelation',
      );
    });

    // ── REVELATION_BACK_WEIGHTED ───────────────────────────────────────────────
    it('beliefPass detects REVELATION_BACK_WEIGHTED when all revelations are in the final quarter', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // finalQuarterStart=6; revelations at scenes 6,7 only → 100% in final quarter
      const records = Array.from({ length: 8 }, (_, i) =>
        i >= 6
          ? makeRec(i, { revelation: `discovery ${i}`, dialogueHighlights: [`alice: reacts ${i}`] })
          : makeRec(i, { dialogueHighlights: [`alice: belief ${i}`] }),
      );
      const result = await beliefPass(beliefInput(records, 8));
      const backWeighted = result.issues.filter(i => i.rule === 'REVELATION_BACK_WEIGHTED');
      assert.ok(backWeighted.length >= 1, `Should detect REVELATION_BACK_WEIGHTED; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(backWeighted[0].severity === 'minor');
    });

    it('beliefPass does NOT fire REVELATION_BACK_WEIGHTED when revelations are distributed', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // revelations at scenes 1, 4, 7 — only 1 of 3 in final quarter (33%) < 80%
      const records = Array.from({ length: 8 }, (_, i) =>
        i === 1 || i === 4 || i === 7
          ? makeRec(i, { revelation: `discovery ${i}`, dialogueHighlights: [`alice: reacts ${i}`] })
          : makeRec(i, { dialogueHighlights: [`alice: belief ${i}`] }),
      );
      const result = await beliefPass(beliefInput(records, 8));
      assert.ok(
        !result.issues.some(i => i.rule === 'REVELATION_BACK_WEIGHTED'),
        'Should NOT fire when revelations are distributed across the story',
      );
    });
  });


  describe('Wave 225 — beliefPass: deception setup void, front-loaded revelations, revelation aftermath absent', async () => {
    const makeRec225 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput225 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: '...',
      records: records as any, structure: {} as any,
      storyContext: {} as any, annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('beliefPass detects DECEPTION_SETUP_VOID when early told beliefs have no corresponding witnessed revelation', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 10 scenes; told beliefs about "money vault" at scenes 0,1,2 (first 40%=scenes 0-3)
      // No witnessed revelation about "money vault" anywhere → 3 early orphaned beliefs → fires
      const records225a = [
        makeRec225(0, { dialogueHighlights: ['alice: money missing from vault already'] }),
        makeRec225(1, { dialogueHighlights: ['bob: money never reached vault destination'] }),
        makeRec225(2, { dialogueHighlights: ['alice: vault money stolen by insider person'] }),
        makeRec225(3),
        makeRec225(4),
        makeRec225(5),
        makeRec225(6),
        makeRec225(7),
        makeRec225(8),
        makeRec225(9),
      ];
      const result225a = await beliefPass(makeInput225(records225a));
      const setupVoid = result225a.issues.filter(i => i.rule === 'DECEPTION_SETUP_VOID');
      assert.ok(setupVoid.length >= 1, 'Should detect DECEPTION_SETUP_VOID when early told beliefs are never addressed');
      assert.strictEqual(setupVoid[0].severity, 'major');
    });

    it('beliefPass does NOT fire DECEPTION_SETUP_VOID when early told beliefs are addressed by a revelation', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 10 scenes; told beliefs about "money vault" at scenes 0,1 → revelation about "money vault" at scene 6
      const records225b = [
        makeRec225(0, { dialogueHighlights: ['alice: money missing from vault already'] }),
        makeRec225(1, { dialogueHighlights: ['bob: money never reached vault destination'] }),
        makeRec225(2),
        makeRec225(3),
        makeRec225(4),
        makeRec225(5),
        makeRec225(6, { revelation: 'money was diverted from vault to offshore account' }),
        makeRec225(7),
        makeRec225(8),
        makeRec225(9),
      ];
      const result225b = await beliefPass(makeInput225(records225b));
      const setupVoid = result225b.issues.filter(i => i.rule === 'DECEPTION_SETUP_VOID');
      assert.strictEqual(setupVoid.length, 0, 'Should NOT fire when early told beliefs are addressed by a revelation');
    });

    it('beliefPass detects BELIEF_FRONT_LOADED_REVELATIONS when >70% of revelations land in the first half', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 10 scenes; revelations at scenes 1,2,3 (first half=0-4), none after midpoint → 3/3 = 100% > 70%
      const records225c = [
        makeRec225(0),
        makeRec225(1, { revelation: 'the killer was inside the house all along' }),
        makeRec225(2, { revelation: 'the safe was empty before robbery night' }),
        makeRec225(3, { revelation: 'witness lied about seeing anyone leave building' }),
        makeRec225(4),
        makeRec225(5),
        makeRec225(6),
        makeRec225(7),
        makeRec225(8),
        makeRec225(9),
      ];
      const result225c = await beliefPass(makeInput225(records225c));
      const frontLoaded = result225c.issues.filter(i => i.rule === 'BELIEF_FRONT_LOADED_REVELATIONS');
      assert.ok(frontLoaded.length >= 1, 'Should detect BELIEF_FRONT_LOADED_REVELATIONS when revelations are front-loaded');
      assert.strictEqual(frontLoaded[0].severity, 'major');
    });

    it('beliefPass does NOT fire BELIEF_FRONT_LOADED_REVELATIONS when revelations are distributed across both halves', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 10 scenes; revelations at scenes 1, 5, 8 → 1 in first half, 2 in second → 33% < 70%
      const records225d = [
        makeRec225(0),
        makeRec225(1, { revelation: 'the killer was seen leaving early' }),
        makeRec225(2),
        makeRec225(3),
        makeRec225(4),
        makeRec225(5, { revelation: 'the safe contained forged documents' }),
        makeRec225(6),
        makeRec225(7),
        makeRec225(8, { revelation: 'the witness was paid to stay silent' }),
        makeRec225(9),
      ];
      const result225d = await beliefPass(makeInput225(records225d));
      const frontLoaded = result225d.issues.filter(i => i.rule === 'BELIEF_FRONT_LOADED_REVELATIONS');
      assert.strictEqual(frontLoaded.length, 0, 'Should NOT fire when revelations are distributed across both halves');
    });

    it('beliefPass detects REVELATION_AFTERMATH_ABSENT when most revelations have no downstream reaction', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 10 scenes; revelations at scenes 2, 5, 7; none of the following scenes have reaction
      // scenes 3,4 → flat (no suspense, no relShifts, no clues)
      // scenes 6 → flat
      // scenes 8,9 → flat (but scene 7 is at idx 7, and 7 < 10-2=8, so it's checked)
      const records225e = [
        makeRec225(0), makeRec225(1),
        makeRec225(2, { revelation: 'the body was moved after midnight clearly' }),
        makeRec225(3, { suspenseDelta: 0, relationshipShifts: [] }),
        makeRec225(4, { suspenseDelta: 0 }),
        makeRec225(5, { revelation: 'fingerprints found on the murder weapon confirmed' }),
        makeRec225(6, { suspenseDelta: 0, relationshipShifts: [] }),
        makeRec225(7, { revelation: 'witness saw suspect near scene that night' }),
        makeRec225(8, { suspenseDelta: 0, relationshipShifts: [] }),
        makeRec225(9, { suspenseDelta: 0 }),
      ];
      const result225e = await beliefPass(makeInput225(records225e));
      const aftermath = result225e.issues.filter(i => i.rule === 'REVELATION_AFTERMATH_ABSENT');
      assert.ok(aftermath.length >= 1, 'Should detect REVELATION_AFTERMATH_ABSENT when revelations have no downstream reaction');
      assert.strictEqual(aftermath[0].severity, 'minor');
    });

    it('beliefPass does NOT fire REVELATION_AFTERMATH_ABSENT when revelations are followed by reactions', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // revelations at scenes 2 and 5; each followed by a reactive scene
      const records225f = [
        makeRec225(0), makeRec225(1),
        makeRec225(2, { revelation: 'the body was moved after midnight' }),
        makeRec225(3, { suspenseDelta: 2 }),                 // reaction: rising tension
        makeRec225(4),
        makeRec225(5, { revelation: 'fingerprints confirmed the suspect' }),
        makeRec225(6, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: -0.5 }] }), // reaction
        makeRec225(7), makeRec225(8), makeRec225(9),
      ];
      const result225f = await beliefPass(makeInput225(records225f));
      const aftermath = result225f.issues.filter(i => i.rule === 'REVELATION_AFTERMATH_ABSENT');
      assert.strictEqual(aftermath.length, 0, 'Should NOT fire when revelations are followed by reactive scenes');
    });
  });


  describe('Wave 309 — beliefPass: told belief drought, assertion void, revelation late first', async () => {
    const makeRec309 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runB309 = async (records: any[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('TOLD_BELIEF_DROUGHT fires when 5+ consecutive scenes have no assertion or revelation', async () => {
      // 12 scenes: belief activity at 0 and 11; scenes 1-10 all silent (run of 10)
      const recs309dr = Array.from({ length: 12 }, (_, i) =>
        makeRec309(i, {
          dialogueHighlights: i === 0 ? ['ALICE: I know the truth here'] : [],
          revelation: i === 11 ? 'the truth at last' : null,
        })
      );
      const res = await runB309(recs309dr);
      assert.ok(res.issues.some((i: any) => i.rule === 'TOLD_BELIEF_DROUGHT'), 'TOLD_BELIEF_DROUGHT should fire');
    });

    it('TOLD_BELIEF_DROUGHT does not fire when belief activity is well distributed', async () => {
      const recs309ndr = Array.from({ length: 12 }, (_, i) =>
        makeRec309(i, {
          dialogueHighlights: i % 3 === 0 ? ['ALICE: I believe this is true'] : [],
          revelation: i % 4 === 2 ? 'a discovery' : null,
        })
      );
      const res = await runB309(recs309ndr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TOLD_BELIEF_DROUGHT'), 'TOLD_BELIEF_DROUGHT should not fire');
    });

    it('ASSERTION_VOID fires when there are 4+ revelations but at most one told belief', async () => {
      const recs309av = Array.from({ length: 10 }, (_, i) =>
        makeRec309(i, { revelation: [2, 4, 6, 8].includes(i) ? `reveal-${i}` : null })
      );
      const res = await runB309(recs309av);
      assert.ok(res.issues.some((i: any) => i.rule === 'ASSERTION_VOID'), 'ASSERTION_VOID should fire');
    });

    it('ASSERTION_VOID does not fire when characters assert beliefs alongside revelations', async () => {
      const recs309nav = Array.from({ length: 10 }, (_, i) =>
        makeRec309(i, {
          revelation: [2, 4, 6, 8].includes(i) ? `reveal-${i}` : null,
          dialogueHighlights: [1, 3, 5].includes(i) ? ['BOB: I am certain of this'] : [],
        })
      );
      const res = await runB309(recs309nav);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ASSERTION_VOID'), 'ASSERTION_VOID should not fire');
    });

    it('REVELATION_LATE_FIRST fires when the first revelation arrives past the midpoint after early assertions', async () => {
      // 10 scenes: told beliefs at 1,2 (first half); first revelation at 7 (past midpoint 5)
      const recs309lf = Array.from({ length: 10 }, (_, i) =>
        makeRec309(i, {
          dialogueHighlights: [1, 2].includes(i) ? ['ALICE: I trust him completely'] : [],
          revelation: [7, 9].includes(i) ? `reveal-${i}` : null,
        })
      );
      const res = await runB309(recs309lf);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_LATE_FIRST'), 'REVELATION_LATE_FIRST should fire');
    });

    it('REVELATION_LATE_FIRST does not fire when a revelation arrives in the first half', async () => {
      const recs309nlf = Array.from({ length: 10 }, (_, i) =>
        makeRec309(i, {
          dialogueHighlights: [1, 2].includes(i) ? ['ALICE: I trust him completely'] : [],
          revelation: [3, 8].includes(i) ? `reveal-${i}` : null,
        })
      );
      const res = await runB309(recs309nlf);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_LATE_FIRST'), 'REVELATION_LATE_FIRST should not fire');
    });
  });


  describe('Wave 810 — beliefPass: belief stakes zone cluster, belief stakes drought run, belief turning point zone cluster', async () => {
    const runBF810 = async (records: ScreenplaySceneRecord[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // BELIEF_STAKES_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; raise_stakes scenes at 0,1,2 → 100% opening third
    it('BELIEF_STAKES_ZONE_CLUSTER fires when >75% of stakes-raising scenes cluster in one third', async () => {
      const recs810a = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'raise_stakes' : 'complicate' }),
      );
      const res = await runBF810(recs810a);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_STAKES_ZONE_CLUSTER'), 'BELIEF_STAKES_ZONE_CLUSTER should fire');
    });

    it('BELIEF_STAKES_ZONE_CLUSTER does not fire when stakes-raising scenes spread across thirds', async () => {
      const recs810an = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'raise_stakes' : 'complicate' }),
      );
      const res = await runBF810(recs810an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_STAKES_ZONE_CLUSTER'), 'BELIEF_STAKES_ZONE_CLUSTER should not fire');
    });

    // BELIEF_STAKES_DROUGHT_RUN fire:
    // n=10; raise_stakes at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('BELIEF_STAKES_DROUGHT_RUN fires when a long run has no stakes-raising scene', async () => {
      const recs810b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'raise_stakes' : 'complicate' }),
      );
      const res = await runBF810(recs810b);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_STAKES_DROUGHT_RUN'), 'BELIEF_STAKES_DROUGHT_RUN should fire');
    });

    it('BELIEF_STAKES_DROUGHT_RUN does not fire when stakes-raising scenes are evenly spread', async () => {
      const recs810bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'raise_stakes' : 'complicate' }),
      );
      const res = await runBF810(recs810bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_STAKES_DROUGHT_RUN'), 'BELIEF_STAKES_DROUGHT_RUN should not fire');
    });

    // BELIEF_TURNING_POINT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; turning_point scenes at 0,1,2 → 100% opening third
    it('BELIEF_TURNING_POINT_ZONE_CLUSTER fires when >75% of turning-point scenes cluster in one third', async () => {
      const recs810c = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'turning_point' : 'complicate' }),
      );
      const res = await runBF810(recs810c);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_TURNING_POINT_ZONE_CLUSTER'), 'BELIEF_TURNING_POINT_ZONE_CLUSTER should fire');
    });

    it('BELIEF_TURNING_POINT_ZONE_CLUSTER does not fire when turning-point scenes spread across thirds', async () => {
      const recs810cn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'turning_point' : 'complicate' }),
      );
      const res = await runBF810(recs810cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_TURNING_POINT_ZONE_CLUSTER'), 'BELIEF_TURNING_POINT_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 796 — beliefPass: belief revelation peak uncaused, belief negative emotion zone cluster, belief negative emotion drought run', async () => {
    const runBF796 = async (records: ScreenplaySceneRecord[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // BELIEF_REVELATION_PEAK_UNCAUSED fire:
    // 8 scenes; revelation-qualifying (magnitude 1) at 2 and 5; peak resolves to the first (idx 2);
    // no dramaticTurn at 0, 1, or 2 itself (2-scene lookback + the peak scene itself).
    it('BELIEF_REVELATION_PEAK_UNCAUSED fires when the revelation scene has no dramatic turn nearby', async () => {
      const recs796a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs796a[2] = makeSharedRecord(2, { revelation: 'truth revealed' });
      recs796a[5] = makeSharedRecord(5, { revelation: 'truth revealed' });
      const res = await runBF796(recs796a);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_REVELATION_PEAK_UNCAUSED'), 'BELIEF_REVELATION_PEAK_UNCAUSED should fire');
    });

    it('BELIEF_REVELATION_PEAK_UNCAUSED does not fire when a dramatic turn precedes the revelation scene', async () => {
      const recs796an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs796an[2] = makeSharedRecord(2, { revelation: 'truth revealed' });
      recs796an[5] = makeSharedRecord(5, { revelation: 'truth revealed' });
      recs796an[1] = makeSharedRecord(1, { dramaticTurn: 'reversal' });
      const res = await runBF796(recs796an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_REVELATION_PEAK_UNCAUSED'), 'BELIEF_REVELATION_PEAK_UNCAUSED should not fire');
    });

    // BELIEF_NEGATIVE_EMOTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; negative-emotion scenes at 0,1,2 → 100% opening third
    it('BELIEF_NEGATIVE_EMOTION_ZONE_CLUSTER fires when >75% of negative-emotion scenes cluster in one third', async () => {
      const recs796b = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runBF796(recs796b);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_NEGATIVE_EMOTION_ZONE_CLUSTER'), 'BELIEF_NEGATIVE_EMOTION_ZONE_CLUSTER should fire');
    });

    it('BELIEF_NEGATIVE_EMOTION_ZONE_CLUSTER does not fire when negative-emotion scenes spread across thirds', async () => {
      const recs796bn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 4, 8].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runBF796(recs796bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_NEGATIVE_EMOTION_ZONE_CLUSTER'), 'BELIEF_NEGATIVE_EMOTION_ZONE_CLUSTER should not fire');
    });

    // BELIEF_NEGATIVE_EMOTION_DROUGHT_RUN fire:
    // n=10; negative-emotion at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('BELIEF_NEGATIVE_EMOTION_DROUGHT_RUN fires when a long run has no negative-emotion charge', async () => {
      const recs796c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runBF796(recs796c);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_NEGATIVE_EMOTION_DROUGHT_RUN'), 'BELIEF_NEGATIVE_EMOTION_DROUGHT_RUN should fire');
    });

    it('BELIEF_NEGATIVE_EMOTION_DROUGHT_RUN does not fire when negative-emotion scenes are evenly spread', async () => {
      const recs796cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 3, 6, 9].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runBF796(recs796cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_NEGATIVE_EMOTION_DROUGHT_RUN'), 'BELIEF_NEGATIVE_EMOTION_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 782 — beliefPass: belief curiosity zone cluster, belief curiosity peak uncaused, belief clock raised zone cluster', async () => {
    const runBF782 = async (records: ScreenplaySceneRecord[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // BELIEF_CURIOSITY_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; curiosity-positive scenes at 0,1,2 → 100% opening third
    it('BELIEF_CURIOSITY_ZONE_CLUSTER fires when >75% of curiosity-positive scenes cluster in one third', async () => {
      const recs782a = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 1, 2].includes(i) ? 2 : 0 }),
      );
      const res = await runBF782(recs782a);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_CURIOSITY_ZONE_CLUSTER'), 'BELIEF_CURIOSITY_ZONE_CLUSTER should fire');
    });

    it('BELIEF_CURIOSITY_ZONE_CLUSTER does not fire when curiosity-positive scenes spread across thirds', async () => {
      const recs782an = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 4, 8].includes(i) ? 2 : 0 }),
      );
      const res = await runBF782(recs782an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_CURIOSITY_ZONE_CLUSTER'), 'BELIEF_CURIOSITY_ZONE_CLUSTER should not fire');
    });

    // BELIEF_CURIOSITY_PEAK_UNCAUSED fire:
    // 8 scenes; curiosityDelta qualifying (>0) at 2 and 5; peak resolves to the first (idx 2, tie
    // on magnitude 3); no dramaticTurn/revelation at indices 0 or 1 (2-scene lookback).
    it('BELIEF_CURIOSITY_PEAK_UNCAUSED fires when the peak curiosity scene has no preparing cause nearby', async () => {
      const recs782b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs782b[2] = makeSharedRecord(2, { curiosityDelta: 3 });
      recs782b[5] = makeSharedRecord(5, { curiosityDelta: 3 });
      const res = await runBF782(recs782b);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_CURIOSITY_PEAK_UNCAUSED'), 'BELIEF_CURIOSITY_PEAK_UNCAUSED should fire');
    });

    it('BELIEF_CURIOSITY_PEAK_UNCAUSED does not fire when a preparing cause precedes the peak curiosity scene', async () => {
      const recs782bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs782bn[2] = makeSharedRecord(2, { curiosityDelta: 3 });
      recs782bn[5] = makeSharedRecord(5, { curiosityDelta: 3 });
      recs782bn[1] = makeSharedRecord(1, { dramaticTurn: 'reversal' });
      const res = await runBF782(recs782bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_CURIOSITY_PEAK_UNCAUSED'), 'BELIEF_CURIOSITY_PEAK_UNCAUSED should not fire');
    });

    // BELIEF_CLOCK_RAISED_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; clockRaised scenes at 0,1,2 → 100% opening third
    it('BELIEF_CLOCK_RAISED_ZONE_CLUSTER fires when >75% of clock-raising scenes cluster in one third', async () => {
      const recs782c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs782c[0] = makeSharedRecord(0, { clockRaised: true });
      recs782c[1] = makeSharedRecord(1, { clockRaised: true });
      recs782c[2] = makeSharedRecord(2, { clockRaised: true });
      const res = await runBF782(recs782c);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_CLOCK_RAISED_ZONE_CLUSTER'), 'BELIEF_CLOCK_RAISED_ZONE_CLUSTER should fire');
    });

    it('BELIEF_CLOCK_RAISED_ZONE_CLUSTER does not fire when clock-raising scenes spread across thirds', async () => {
      const recs782cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs782cn[0] = makeSharedRecord(0, { clockRaised: true });
      recs782cn[4] = makeSharedRecord(4, { clockRaised: true });
      recs782cn[8] = makeSharedRecord(8, { clockRaised: true });
      const res = await runBF782(recs782cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_CLOCK_RAISED_ZONE_CLUSTER'), 'BELIEF_CLOCK_RAISED_ZONE_CLUSTER should not fire');
    });
  });


  describe('Wave 768 — beliefPass: belief relationship zone cluster, belief character moment drought run, belief suspense drought run', async () => {
    const runBF768 = async (records: ScreenplaySceneRecord[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // BELIEF_RELATIONSHIP_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; relationship-shift scenes at 0,1,2 → 100% opening third
    it('BELIEF_RELATIONSHIP_ZONE_CLUSTER fires when >75% of relationship-shift scenes cluster in one third', async () => {
      const mkShift768 = () => [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }];
      const recs768a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs768a[0] = makeSharedRecord(0, { relationshipShifts: mkShift768() });
      recs768a[1] = makeSharedRecord(1, { relationshipShifts: mkShift768() });
      recs768a[2] = makeSharedRecord(2, { relationshipShifts: mkShift768() });
      const res = await runBF768(recs768a);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_RELATIONSHIP_ZONE_CLUSTER'), 'BELIEF_RELATIONSHIP_ZONE_CLUSTER should fire');
    });

    it('BELIEF_RELATIONSHIP_ZONE_CLUSTER does not fire when relationship-shift scenes spread across thirds', async () => {
      const mkShift768 = () => [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }];
      const recs768an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs768an[0] = makeSharedRecord(0, { relationshipShifts: mkShift768() });
      recs768an[4] = makeSharedRecord(4, { relationshipShifts: mkShift768() });
      recs768an[8] = makeSharedRecord(8, { relationshipShifts: mkShift768() });
      const res = await runBF768(recs768an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_RELATIONSHIP_ZONE_CLUSTER'), 'BELIEF_RELATIONSHIP_ZONE_CLUSTER should not fire');
    });

    // BELIEF_CHARACTER_MOMENT_DROUGHT_RUN fire:
    // n=10; character_moment scenes at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('BELIEF_CHARACTER_MOMENT_DROUGHT_RUN fires when a long run has no character-moment scene', async () => {
      const recs768b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'character_moment' : 'complicate' }),
      );
      const res = await runBF768(recs768b);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_CHARACTER_MOMENT_DROUGHT_RUN'), 'BELIEF_CHARACTER_MOMENT_DROUGHT_RUN should fire');
    });

    it('BELIEF_CHARACTER_MOMENT_DROUGHT_RUN does not fire when character-moment scenes are evenly spread', async () => {
      const recs768bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'character_moment' : 'complicate' }),
      );
      const res = await runBF768(recs768bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_CHARACTER_MOMENT_DROUGHT_RUN'), 'BELIEF_CHARACTER_MOMENT_DROUGHT_RUN should not fire');
    });

    // BELIEF_SUSPENSE_DROUGHT_RUN fire:
    // n=10; suspenseDelta>0 at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('BELIEF_SUSPENSE_DROUGHT_RUN fires when a long run has no rising suspense', async () => {
      const recs768c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { suspenseDelta: [0, 1, 2].includes(i) ? 2 : 0 }),
      );
      const res = await runBF768(recs768c);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_SUSPENSE_DROUGHT_RUN'), 'BELIEF_SUSPENSE_DROUGHT_RUN should fire');
    });

    it('BELIEF_SUSPENSE_DROUGHT_RUN does not fire when suspense rises are evenly spread', async () => {
      const recs768cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { suspenseDelta: [0, 3, 6, 9].includes(i) ? 2 : 0 }),
      );
      const res = await runBF768(recs768cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_SUSPENSE_DROUGHT_RUN'), 'BELIEF_SUSPENSE_DROUGHT_RUN should not fire');
    });
  });


  describe('Wave 754 — beliefPass: belief relationship peak uncaused, belief turn drought run, belief suspense zone cluster', async () => {
    const runBF754 = async (records: ScreenplaySceneRecord[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // BELIEF_RELATIONSHIP_PEAK_UNCAUSED fire:
    // 8 scenes; relationship shifts at 2 (1 shift) and 6 (5 shifts, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('BELIEF_RELATIONSHIP_PEAK_UNCAUSED fires when the peak relationship-shift scene has no dramatic turn or revelation nearby', async () => {
      const recs754a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs754a[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      recs754a[6] = makeSharedRecord(6, {
        relationshipShifts: [
          { pairKey: 'a|b', dimension: 'trust', amount: 1 },
          { pairKey: 'a|c', dimension: 'trust', amount: 1 },
          { pairKey: 'a|d', dimension: 'trust', amount: 1 },
          { pairKey: 'a|e', dimension: 'trust', amount: 1 },
          { pairKey: 'a|f', dimension: 'trust', amount: 1 },
        ],
      });
      const res = await runBF754(recs754a);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_RELATIONSHIP_PEAK_UNCAUSED'), 'BELIEF_RELATIONSHIP_PEAK_UNCAUSED should fire');
    });

    // BELIEF_RELATIONSHIP_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('BELIEF_RELATIONSHIP_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs754an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs754an[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      recs754an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs754an[6] = makeSharedRecord(6, {
        relationshipShifts: [
          { pairKey: 'a|b', dimension: 'trust', amount: 1 },
          { pairKey: 'a|c', dimension: 'trust', amount: 1 },
          { pairKey: 'a|d', dimension: 'trust', amount: 1 },
          { pairKey: 'a|e', dimension: 'trust', amount: 1 },
          { pairKey: 'a|f', dimension: 'trust', amount: 1 },
        ],
      });
      const res = await runBF754(recs754an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_RELATIONSHIP_PEAK_UNCAUSED'), 'BELIEF_RELATIONSHIP_PEAK_UNCAUSED should not fire');
    });

    // BELIEF_TURN_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 carry a dramatic turn (>=3 present overall); scenes 3-9 (7 scenes) have none
    it('BELIEF_TURN_DROUGHT_RUN fires when the longest no-dramatic-turn run reaches 6', async () => {
      const recs754b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs754b[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs754b[1] = makeSharedRecord(1, { dramaticTurn: 'reversal' });
      recs754b[2] = makeSharedRecord(2, { dramaticTurn: 'reversal' });
      const res = await runBF754(recs754b);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_TURN_DROUGHT_RUN'), 'BELIEF_TURN_DROUGHT_RUN should fire');
    });

    // BELIEF_TURN_DROUGHT_RUN no-fire:
    // dramatic-turn scenes spread out so no gap reaches 6 consecutive scenes
    it('BELIEF_TURN_DROUGHT_RUN does not fire when dramatic turns are spread through the story', async () => {
      const recs754bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs754bn[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs754bn[3] = makeSharedRecord(3, { dramaticTurn: 'reversal' });
      recs754bn[6] = makeSharedRecord(6, { dramaticTurn: 'reversal' });
      recs754bn[9] = makeSharedRecord(9, { dramaticTurn: 'reversal' });
      const res = await runBF754(recs754bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_TURN_DROUGHT_RUN'), 'BELIEF_TURN_DROUGHT_RUN should not fire');
    });

    // BELIEF_SUSPENSE_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; suspense-positive scenes at 0,1,2 → 100% opening third
    it('BELIEF_SUSPENSE_ZONE_CLUSTER fires when >75% of suspense-positive scenes cluster in one third', async () => {
      const recs754c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs754c[0] = makeSharedRecord(0, { suspenseDelta: 1 });
      recs754c[1] = makeSharedRecord(1, { suspenseDelta: 1 });
      recs754c[2] = makeSharedRecord(2, { suspenseDelta: 1 });
      const res = await runBF754(recs754c);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_SUSPENSE_ZONE_CLUSTER'), 'BELIEF_SUSPENSE_ZONE_CLUSTER should fire');
    });

    // BELIEF_SUSPENSE_ZONE_CLUSTER no-fire:
    // suspense-positive scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('BELIEF_SUSPENSE_ZONE_CLUSTER does not fire when suspense-positive scenes are distributed across thirds', async () => {
      const recs754cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs754cn[0] = makeSharedRecord(0, { suspenseDelta: 1 });
      recs754cn[4] = makeSharedRecord(4, { suspenseDelta: 1 });
      recs754cn[7] = makeSharedRecord(7, { suspenseDelta: 1 });
      const res = await runBF754(recs754cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_SUSPENSE_ZONE_CLUSTER'), 'BELIEF_SUSPENSE_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 740 — beliefPass: belief clock delta drought run, belief open thread peak uncaused, belief staging drought run', async () => {
    const runBF740 = async (records: ScreenplaySceneRecord[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // BELIEF_CLOCK_DELTA_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 shift the clock (>=3 present overall); scenes 3-9 (7 scenes) have none
    it('BELIEF_CLOCK_DELTA_DROUGHT_RUN fires when the longest no-clock-movement run reaches 6', async () => {
      const recs740a = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs740a[0] = makeSharedRecord(0, { clockDelta: 1 });
      recs740a[1] = makeSharedRecord(1, { clockDelta: -1 });
      recs740a[2] = makeSharedRecord(2, { clockDelta: 1 });
      const res = await runBF740(recs740a);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_CLOCK_DELTA_DROUGHT_RUN'), 'BELIEF_CLOCK_DELTA_DROUGHT_RUN should fire');
    });

    // BELIEF_CLOCK_DELTA_DROUGHT_RUN no-fire:
    // clock-shifting scenes spread out so no gap reaches 6 consecutive scenes
    it('BELIEF_CLOCK_DELTA_DROUGHT_RUN does not fire when clock movement is spread through the story', async () => {
      const recs740an = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs740an[0] = makeSharedRecord(0, { clockDelta: 1 });
      recs740an[3] = makeSharedRecord(3, { clockDelta: -1 });
      recs740an[6] = makeSharedRecord(6, { clockDelta: 1 });
      recs740an[9] = makeSharedRecord(9, { clockDelta: -1 });
      const res = await runBF740(recs740an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_CLOCK_DELTA_DROUGHT_RUN'), 'BELIEF_CLOCK_DELTA_DROUGHT_RUN should not fire');
    });

    // BELIEF_OPEN_THREAD_PEAK_UNCAUSED fire:
    // 8 scenes; open threads at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('BELIEF_OPEN_THREAD_PEAK_UNCAUSED fires when the peak open-thread scene has no dramatic turn or revelation nearby', async () => {
      const recs740b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs740b[2] = makeSharedRecord(2, { unresolvedClues: ['clue-a'] });
      recs740b[6] = makeSharedRecord(6, { unresolvedClues: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runBF740(recs740b);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_OPEN_THREAD_PEAK_UNCAUSED'), 'BELIEF_OPEN_THREAD_PEAK_UNCAUSED should fire');
    });

    // BELIEF_OPEN_THREAD_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('BELIEF_OPEN_THREAD_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs740bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs740bn[2] = makeSharedRecord(2, { unresolvedClues: ['clue-a'] });
      recs740bn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs740bn[6] = makeSharedRecord(6, { unresolvedClues: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runBF740(recs740bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_OPEN_THREAD_PEAK_UNCAUSED'), 'BELIEF_OPEN_THREAD_PEAK_UNCAUSED should not fire');
    });

    // BELIEF_STAGING_DROUGHT_RUN fire:
    // 10 scenes; visual beats at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('BELIEF_STAGING_DROUGHT_RUN fires when the longest no-visual-beat run is ≥6', async () => {
      const recs740c = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs740c[0] = makeSharedRecord(0, { visualBeats: ['a beat'] });
      recs740c[1] = makeSharedRecord(1, { visualBeats: ['a beat'] });
      recs740c[2] = makeSharedRecord(2, { visualBeats: ['a beat'] });
      recs740c[9] = makeSharedRecord(9, { visualBeats: ['a beat'] });
      const res = await runBF740(recs740c);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_STAGING_DROUGHT_RUN'), 'BELIEF_STAGING_DROUGHT_RUN should fire');
    });

    // BELIEF_STAGING_DROUGHT_RUN no-fire:
    // visual beats at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('BELIEF_STAGING_DROUGHT_RUN does not fire when visual beats are distributed without a long drought', async () => {
      const recs740cn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs740cn[0] = makeSharedRecord(0, { visualBeats: ['a beat'] });
      recs740cn[4] = makeSharedRecord(4, { visualBeats: ['a beat'] });
      recs740cn[9] = makeSharedRecord(9, { visualBeats: ['a beat'] });
      const res = await runBF740(recs740cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_STAGING_DROUGHT_RUN'), 'BELIEF_STAGING_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 726 — beliefPass: belief clock delta zone cluster, belief staging peak uncaused, belief open thread zone cluster', async () => {
    const runBF726 = async (records: ScreenplaySceneRecord[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // BELIEF_CLOCK_DELTA_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; clock-advancing scenes at 0,1,2 → 100% opening third
    it('BELIEF_CLOCK_DELTA_ZONE_CLUSTER fires when >75% of clock-advancing scenes cluster in one third', async () => {
      const recs726a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs726a[0] = makeSharedRecord(0, { clockDelta: 1 });
      recs726a[1] = makeSharedRecord(1, { clockDelta: 1 });
      recs726a[2] = makeSharedRecord(2, { clockDelta: 1 });
      const res = await runBF726(recs726a);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_CLOCK_DELTA_ZONE_CLUSTER'), 'BELIEF_CLOCK_DELTA_ZONE_CLUSTER should fire');
    });

    // BELIEF_CLOCK_DELTA_ZONE_CLUSTER no-fire:
    // clock-advancing scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('BELIEF_CLOCK_DELTA_ZONE_CLUSTER does not fire when clock-advancing scenes are distributed across thirds', async () => {
      const recs726an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs726an[0] = makeSharedRecord(0, { clockDelta: 1 });
      recs726an[4] = makeSharedRecord(4, { clockDelta: 1 });
      recs726an[7] = makeSharedRecord(7, { clockDelta: 1 });
      const res = await runBF726(recs726an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_CLOCK_DELTA_ZONE_CLUSTER'), 'BELIEF_CLOCK_DELTA_ZONE_CLUSTER should not fire');
    });

    // BELIEF_STAGING_PEAK_UNCAUSED fire:
    // 8 scenes; visual beats at 2 (1 beat) and 6 (5 beats, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('BELIEF_STAGING_PEAK_UNCAUSED fires when the peak visual-beat scene has no dramatic turn or revelation nearby', async () => {
      const recs726b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs726b[2] = makeSharedRecord(2, { visualBeats: ['beat a'] });
      recs726b[6] = makeSharedRecord(6, { visualBeats: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runBF726(recs726b);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_STAGING_PEAK_UNCAUSED'), 'BELIEF_STAGING_PEAK_UNCAUSED should fire');
    });

    // BELIEF_STAGING_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('BELIEF_STAGING_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs726bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs726bn[2] = makeSharedRecord(2, { visualBeats: ['beat a'] });
      recs726bn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs726bn[6] = makeSharedRecord(6, { visualBeats: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runBF726(recs726bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_STAGING_PEAK_UNCAUSED'), 'BELIEF_STAGING_PEAK_UNCAUSED should not fire');
    });

    // BELIEF_OPEN_THREAD_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; open-thread scenes at 0,1,2 → 100% opening third
    it('BELIEF_OPEN_THREAD_ZONE_CLUSTER fires when >75% of open-thread scenes cluster in one third', async () => {
      const recs726c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs726c[0] = makeSharedRecord(0, { unresolvedClues: ['clue a'] });
      recs726c[1] = makeSharedRecord(1, { unresolvedClues: ['clue b'] });
      recs726c[2] = makeSharedRecord(2, { unresolvedClues: ['clue c'] });
      const res = await runBF726(recs726c);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_OPEN_THREAD_ZONE_CLUSTER'), 'BELIEF_OPEN_THREAD_ZONE_CLUSTER should fire');
    });

    // BELIEF_OPEN_THREAD_ZONE_CLUSTER no-fire:
    // open-thread scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('BELIEF_OPEN_THREAD_ZONE_CLUSTER does not fire when open-thread scenes are distributed across thirds', async () => {
      const recs726cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs726cn[0] = makeSharedRecord(0, { unresolvedClues: ['clue a'] });
      recs726cn[4] = makeSharedRecord(4, { unresolvedClues: ['clue b'] });
      recs726cn[7] = makeSharedRecord(7, { unresolvedClues: ['clue c'] });
      const res = await runBF726(recs726cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_OPEN_THREAD_ZONE_CLUSTER'), 'BELIEF_OPEN_THREAD_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 712 — beliefPass: belief payoff zone cluster, belief seed drought run, belief highlight drought run', async () => {
    const runBF712 = async (records: ScreenplaySceneRecord[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // BELIEF_PAYOFF_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; payoff scenes at 0,1,2 → 100% opening third
    it('BELIEF_PAYOFF_ZONE_CLUSTER fires when >75% of payoff scenes cluster in one third', async () => {
      const recs712a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs712a[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs712a[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs712a[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-c'] });
      const res = await runBF712(recs712a);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_PAYOFF_ZONE_CLUSTER'), 'BELIEF_PAYOFF_ZONE_CLUSTER should fire');
    });

    // BELIEF_PAYOFF_ZONE_CLUSTER no-fire:
    // payoff scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('BELIEF_PAYOFF_ZONE_CLUSTER does not fire when payoff scenes are distributed across thirds', async () => {
      const recs712an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs712an[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs712an[4] = makeSharedRecord(4, { payoffSetupIds: ['thread-b'] });
      recs712an[7] = makeSharedRecord(7, { payoffSetupIds: ['thread-c'] });
      const res = await runBF712(recs712an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_PAYOFF_ZONE_CLUSTER'), 'BELIEF_PAYOFF_ZONE_CLUSTER should not fire');
    });

    // BELIEF_SEED_DROUGHT_RUN fire:
    // 10 scenes; seeds at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('BELIEF_SEED_DROUGHT_RUN fires when the longest no-seed run is ≥6', async () => {
      const recs712b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs712b[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs712b[1] = makeSharedRecord(1, { seededClueIds: ['clue-b'] });
      recs712b[2] = makeSharedRecord(2, { seededClueIds: ['clue-c'] });
      recs712b[9] = makeSharedRecord(9, { seededClueIds: ['clue-d'] });
      const res = await runBF712(recs712b);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_SEED_DROUGHT_RUN'), 'BELIEF_SEED_DROUGHT_RUN should fire');
    });

    // BELIEF_SEED_DROUGHT_RUN no-fire:
    // seeds at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('BELIEF_SEED_DROUGHT_RUN does not fire when seeds are distributed without a long drought', async () => {
      const recs712bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs712bn[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs712bn[4] = makeSharedRecord(4, { seededClueIds: ['clue-b'] });
      recs712bn[9] = makeSharedRecord(9, { seededClueIds: ['clue-c'] });
      const res = await runBF712(recs712bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_SEED_DROUGHT_RUN'), 'BELIEF_SEED_DROUGHT_RUN should not fire');
    });

    // BELIEF_HIGHLIGHT_DROUGHT_RUN fire:
    // 10 scenes; highlights at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('BELIEF_HIGHLIGHT_DROUGHT_RUN fires when the longest no-highlighted-dialogue run is ≥6', async () => {
      const recs712c = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs712c[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs712c[1] = makeSharedRecord(1, { dialogueHighlights: ['line-b'] });
      recs712c[2] = makeSharedRecord(2, { dialogueHighlights: ['line-c'] });
      recs712c[9] = makeSharedRecord(9, { dialogueHighlights: ['line-d'] });
      const res = await runBF712(recs712c);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_HIGHLIGHT_DROUGHT_RUN'), 'BELIEF_HIGHLIGHT_DROUGHT_RUN should fire');
    });

    // BELIEF_HIGHLIGHT_DROUGHT_RUN no-fire:
    // highlights at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('BELIEF_HIGHLIGHT_DROUGHT_RUN does not fire when highlighted dialogue is distributed without a long drought', async () => {
      const recs712cn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs712cn[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs712cn[4] = makeSharedRecord(4, { dialogueHighlights: ['line-b'] });
      recs712cn[9] = makeSharedRecord(9, { dialogueHighlights: ['line-c'] });
      const res = await runBF712(recs712cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_HIGHLIGHT_DROUGHT_RUN'), 'BELIEF_HIGHLIGHT_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 698 — beliefPass: belief payoff drought run, belief seed peak uncaused, belief highlight zone cluster', async () => {
    const runBF698 = async (records: ScreenplaySceneRecord[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // BELIEF_PAYOFF_DROUGHT_RUN fire:
    // 10 scenes; payoffs at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('BELIEF_PAYOFF_DROUGHT_RUN fires when the longest no-payoff run is ≥6', async () => {
      const recs698a = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs698a[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs698a[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs698a[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-c'] });
      recs698a[9] = makeSharedRecord(9, { payoffSetupIds: ['thread-d'] });
      const res = await runBF698(recs698a);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_PAYOFF_DROUGHT_RUN'), 'BELIEF_PAYOFF_DROUGHT_RUN should fire');
    });

    // BELIEF_PAYOFF_DROUGHT_RUN no-fire:
    // payoffs at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('BELIEF_PAYOFF_DROUGHT_RUN does not fire when payoffs are distributed without a long drought', async () => {
      const recs698an = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs698an[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs698an[4] = makeSharedRecord(4, { payoffSetupIds: ['thread-b'] });
      recs698an[9] = makeSharedRecord(9, { payoffSetupIds: ['thread-c'] });
      const res = await runBF698(recs698an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_PAYOFF_DROUGHT_RUN'), 'BELIEF_PAYOFF_DROUGHT_RUN should not fire');
    });

    // BELIEF_SEED_PEAK_UNCAUSED fire:
    // 8 scenes; seeds at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('BELIEF_SEED_PEAK_UNCAUSED fires when the peak seed scene has no dramatic turn or revelation nearby', async () => {
      const recs698b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs698b[2] = makeSharedRecord(2, { seededClueIds: ['clue-a'] });
      recs698b[6] = makeSharedRecord(6, { seededClueIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runBF698(recs698b);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_SEED_PEAK_UNCAUSED'), 'BELIEF_SEED_PEAK_UNCAUSED should fire');
    });

    // BELIEF_SEED_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('BELIEF_SEED_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs698bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs698bn[2] = makeSharedRecord(2, { seededClueIds: ['clue-a'] });
      recs698bn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs698bn[6] = makeSharedRecord(6, { seededClueIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runBF698(recs698bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_SEED_PEAK_UNCAUSED'), 'BELIEF_SEED_PEAK_UNCAUSED should not fire');
    });

    // BELIEF_HIGHLIGHT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; highlighted-dialogue scenes at 0,1,2 → 100% opening third
    it('BELIEF_HIGHLIGHT_ZONE_CLUSTER fires when >75% of highlighted-dialogue scenes cluster in one third', async () => {
      const recs698c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs698c[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs698c[1] = makeSharedRecord(1, { dialogueHighlights: ['line-b'] });
      recs698c[2] = makeSharedRecord(2, { dialogueHighlights: ['line-c'] });
      const res = await runBF698(recs698c);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_HIGHLIGHT_ZONE_CLUSTER'), 'BELIEF_HIGHLIGHT_ZONE_CLUSTER should fire');
    });

    // BELIEF_HIGHLIGHT_ZONE_CLUSTER no-fire:
    // highlighted-dialogue scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('BELIEF_HIGHLIGHT_ZONE_CLUSTER does not fire when highlighted-dialogue scenes are distributed across thirds', async () => {
      const recs698cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs698cn[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs698cn[4] = makeSharedRecord(4, { dialogueHighlights: ['line-b'] });
      recs698cn[7] = makeSharedRecord(7, { dialogueHighlights: ['line-c'] });
      const res = await runBF698(recs698cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_HIGHLIGHT_ZONE_CLUSTER'), 'BELIEF_HIGHLIGHT_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 684 — beliefPass: belief character moment zone cluster, belief curiosity drought run, belief suspense peak uncaused', async () => {
    const runBF684 = async (records: ScreenplaySceneRecord[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // BELIEF_CHARACTER_MOMENT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; character-moment scenes at 0,1,2 → 100% opening third
    it('BELIEF_CHARACTER_MOMENT_ZONE_CLUSTER fires when >75% of character-moment scenes cluster in one third', async () => {
      const recs684a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs684a[0] = makeSharedRecord(0, { purpose: 'character_moment' });
      recs684a[1] = makeSharedRecord(1, { purpose: 'character_moment' });
      recs684a[2] = makeSharedRecord(2, { purpose: 'character_moment' });
      const res = await runBF684(recs684a);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_CHARACTER_MOMENT_ZONE_CLUSTER'), 'BELIEF_CHARACTER_MOMENT_ZONE_CLUSTER should fire');
    });

    // BELIEF_CHARACTER_MOMENT_ZONE_CLUSTER no-fire:
    // character-moment scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('BELIEF_CHARACTER_MOMENT_ZONE_CLUSTER does not fire when character-moment scenes are distributed across thirds', async () => {
      const recs684an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs684an[0] = makeSharedRecord(0, { purpose: 'character_moment' });
      recs684an[4] = makeSharedRecord(4, { purpose: 'character_moment' });
      recs684an[7] = makeSharedRecord(7, { purpose: 'character_moment' });
      const res = await runBF684(recs684an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_CHARACTER_MOMENT_ZONE_CLUSTER'), 'BELIEF_CHARACTER_MOMENT_ZONE_CLUSTER should not fire');
    });

    // BELIEF_CURIOSITY_DROUGHT_RUN fire:
    // 10 scenes; curiosity spikes at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('BELIEF_CURIOSITY_DROUGHT_RUN fires when the longest no-curiosity-spike run is ≥6', async () => {
      const recs684b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs684b[0] = makeSharedRecord(0, { curiosityDelta: 2 });
      recs684b[1] = makeSharedRecord(1, { curiosityDelta: 1 });
      recs684b[2] = makeSharedRecord(2, { curiosityDelta: 1 });
      recs684b[9] = makeSharedRecord(9, { curiosityDelta: 2 });
      const res = await runBF684(recs684b);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_CURIOSITY_DROUGHT_RUN'), 'BELIEF_CURIOSITY_DROUGHT_RUN should fire');
    });

    // BELIEF_CURIOSITY_DROUGHT_RUN no-fire:
    // curiosity spikes at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('BELIEF_CURIOSITY_DROUGHT_RUN does not fire when curiosity spikes are distributed without a long drought', async () => {
      const recs684bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs684bn[0] = makeSharedRecord(0, { curiosityDelta: 2 });
      recs684bn[4] = makeSharedRecord(4, { curiosityDelta: 1 });
      recs684bn[9] = makeSharedRecord(9, { curiosityDelta: 2 });
      const res = await runBF684(recs684bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_CURIOSITY_DROUGHT_RUN'), 'BELIEF_CURIOSITY_DROUGHT_RUN should not fire');
    });

    // BELIEF_SUSPENSE_PEAK_UNCAUSED fire:
    // 8 scenes; suspense at 2 (delta 1) and 6 (delta 5, the peak); no dramaticTurn or revelation
    // at 6, 5, or 4
    it('BELIEF_SUSPENSE_PEAK_UNCAUSED fires when the peak suspense-spike scene has no dramatic turn or revelation nearby', async () => {
      const recs684c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs684c[2] = makeSharedRecord(2, { suspenseDelta: 1 });
      recs684c[6] = makeSharedRecord(6, { suspenseDelta: 5 });
      const res = await runBF684(recs684c);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_SUSPENSE_PEAK_UNCAUSED'), 'BELIEF_SUSPENSE_PEAK_UNCAUSED should fire');
    });

    // BELIEF_SUSPENSE_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('BELIEF_SUSPENSE_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs684cn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs684cn[2] = makeSharedRecord(2, { suspenseDelta: 1 });
      recs684cn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs684cn[6] = makeSharedRecord(6, { suspenseDelta: 5 });
      const res = await runBF684(recs684cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_SUSPENSE_PEAK_UNCAUSED'), 'BELIEF_SUSPENSE_PEAK_UNCAUSED should not fire');
    });
  });

  describe('Wave 670 — beliefPass: belief highlight peak uncaused, belief relationship drought run, belief turn zone cluster', async () => {
    const runBF670 = async (records: ScreenplaySceneRecord[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // BELIEF_HIGHLIGHT_PEAK_UNCAUSED fire:
    // 8 scenes; highlights at 2 (1 line) and 6 (5 lines, the peak); no dramaticTurn or revelation
    // at 6, 5, or 4
    it('BELIEF_HIGHLIGHT_PEAK_UNCAUSED fires when the peak highlighted-dialogue scene has no dramatic turn or revelation nearby', async () => {
      const recs670a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs670a[2] = makeSharedRecord(2, { dialogueHighlights: ['line-a'] });
      recs670a[6] = makeSharedRecord(6, { dialogueHighlights: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runBF670(recs670a);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_HIGHLIGHT_PEAK_UNCAUSED'), 'BELIEF_HIGHLIGHT_PEAK_UNCAUSED should fire');
    });

    // BELIEF_HIGHLIGHT_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('BELIEF_HIGHLIGHT_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs670an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs670an[2] = makeSharedRecord(2, { dialogueHighlights: ['line-a'] });
      recs670an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs670an[6] = makeSharedRecord(6, { dialogueHighlights: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runBF670(recs670an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_HIGHLIGHT_PEAK_UNCAUSED'), 'BELIEF_HIGHLIGHT_PEAK_UNCAUSED should not fire');
    });

    // BELIEF_RELATIONSHIP_DROUGHT_RUN fire:
    // 10 scenes; shifts at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('BELIEF_RELATIONSHIP_DROUGHT_RUN fires when the longest no-shift run is ≥6', async () => {
      const recs670b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs670b[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs670b[1] = makeSharedRecord(1, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs670b[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs670b[9] = makeSharedRecord(9, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      const res = await runBF670(recs670b);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_RELATIONSHIP_DROUGHT_RUN'), 'BELIEF_RELATIONSHIP_DROUGHT_RUN should fire');
    });

    // BELIEF_RELATIONSHIP_DROUGHT_RUN no-fire:
    // shifts at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('BELIEF_RELATIONSHIP_DROUGHT_RUN does not fire when shifts are distributed without a long drought', async () => {
      const recs670bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs670bn[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs670bn[4] = makeSharedRecord(4, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs670bn[9] = makeSharedRecord(9, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      const res = await runBF670(recs670bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_RELATIONSHIP_DROUGHT_RUN'), 'BELIEF_RELATIONSHIP_DROUGHT_RUN should not fire');
    });

    // BELIEF_TURN_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; dramatic-turn scenes at 0,1,2 → 100% opening third
    it('BELIEF_TURN_ZONE_CLUSTER fires when >75% of dramatic-turn scenes cluster in one third', async () => {
      const recs670c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs670c[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs670c[1] = makeSharedRecord(1, { dramaticTurn: 'reversal' });
      recs670c[2] = makeSharedRecord(2, { dramaticTurn: 'reversal' });
      const res = await runBF670(recs670c);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_TURN_ZONE_CLUSTER'), 'BELIEF_TURN_ZONE_CLUSTER should fire');
    });

    // BELIEF_TURN_ZONE_CLUSTER no-fire:
    // dramatic-turn scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('BELIEF_TURN_ZONE_CLUSTER does not fire when dramatic-turn scenes are distributed across thirds', async () => {
      const recs670cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs670cn[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs670cn[4] = makeSharedRecord(4, { dramaticTurn: 'reversal' });
      recs670cn[7] = makeSharedRecord(7, { dramaticTurn: 'reversal' });
      const res = await runBF670(recs670cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_TURN_ZONE_CLUSTER'), 'BELIEF_TURN_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 656 — beliefPass: belief payoff peak uncaused, belief clock drought run, belief seed zone cluster', async () => {
    const runBF656 = async (records: ScreenplaySceneRecord[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // BELIEF_PAYOFF_PEAK_UNCAUSED fire:
    // 8 scenes; payoffs at 2 (1 thread) and 6 (5 threads, the peak); no dramaticTurn or revelation
    // at 6, 5, or 4
    it('BELIEF_PAYOFF_PEAK_UNCAUSED fires when the peak payoff scene has no dramatic turn or revelation nearby', async () => {
      const recs656a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs656a[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-a'] });
      recs656a[6] = makeSharedRecord(6, { payoffSetupIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runBF656(recs656a);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_PAYOFF_PEAK_UNCAUSED'), 'BELIEF_PAYOFF_PEAK_UNCAUSED should fire');
    });

    // BELIEF_PAYOFF_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('BELIEF_PAYOFF_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs656an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs656an[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-a'] });
      recs656an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs656an[6] = makeSharedRecord(6, { payoffSetupIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runBF656(recs656an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_PAYOFF_PEAK_UNCAUSED'), 'BELIEF_PAYOFF_PEAK_UNCAUSED should not fire');
    });

    // BELIEF_CLOCK_DROUGHT_RUN fire:
    // 10 scenes; clock raised at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('BELIEF_CLOCK_DROUGHT_RUN fires when the longest no-clock run is ≥6', async () => {
      const recs656b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs656b[0] = makeSharedRecord(0, { clockRaised: true });
      recs656b[1] = makeSharedRecord(1, { clockRaised: true });
      recs656b[2] = makeSharedRecord(2, { clockRaised: true });
      recs656b[9] = makeSharedRecord(9, { clockRaised: true });
      const res = await runBF656(recs656b);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_CLOCK_DROUGHT_RUN'), 'BELIEF_CLOCK_DROUGHT_RUN should fire');
    });

    // BELIEF_CLOCK_DROUGHT_RUN no-fire:
    // clock raised at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('BELIEF_CLOCK_DROUGHT_RUN does not fire when clock raises are distributed without a long drought', async () => {
      const recs656bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs656bn[0] = makeSharedRecord(0, { clockRaised: true });
      recs656bn[4] = makeSharedRecord(4, { clockRaised: true });
      recs656bn[9] = makeSharedRecord(9, { clockRaised: true });
      const res = await runBF656(recs656bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_CLOCK_DROUGHT_RUN'), 'BELIEF_CLOCK_DROUGHT_RUN should not fire');
    });

    // BELIEF_SEED_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; seed scenes at 0,1,2 → 100% opening third
    it('BELIEF_SEED_ZONE_CLUSTER fires when >75% of seed scenes cluster in one third', async () => {
      const recs656c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs656c[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs656c[1] = makeSharedRecord(1, { seededClueIds: ['clue-b'] });
      recs656c[2] = makeSharedRecord(2, { seededClueIds: ['clue-c'] });
      const res = await runBF656(recs656c);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_SEED_ZONE_CLUSTER'), 'BELIEF_SEED_ZONE_CLUSTER should fire');
    });

    // BELIEF_SEED_ZONE_CLUSTER no-fire:
    // seed scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('BELIEF_SEED_ZONE_CLUSTER does not fire when seed scenes are distributed across thirds', async () => {
      const recs656cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs656cn[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs656cn[4] = makeSharedRecord(4, { seededClueIds: ['clue-b'] });
      recs656cn[7] = makeSharedRecord(7, { seededClueIds: ['clue-c'] });
      const res = await runBF656(recs656cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_SEED_ZONE_CLUSTER'), 'BELIEF_SEED_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 642 — beliefPass: belief open thread drought run, belief staging zone cluster, belief seed curiosity decoupled', async () => {
    const runBF642 = async (records: ScreenplaySceneRecord[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // BELIEF_OPEN_THREAD_DROUGHT_RUN fire:
    // 10 scenes; debt at 0,8,9; drought run 1-7 = 7 consecutive scenes ≥ 6
    it('BELIEF_OPEN_THREAD_DROUGHT_RUN fires when the longest no-debt run is ≥6', async () => {
      const recs642a = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs642a[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs642a[8] = makeSharedRecord(8, { unresolvedClues: ['b'] });
      recs642a[9] = makeSharedRecord(9, { unresolvedClues: ['c'] });
      const res = await runBF642(recs642a);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_OPEN_THREAD_DROUGHT_RUN'), 'BELIEF_OPEN_THREAD_DROUGHT_RUN should fire');
    });

    // BELIEF_OPEN_THREAD_DROUGHT_RUN no-fire:
    // debt at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('BELIEF_OPEN_THREAD_DROUGHT_RUN does not fire when debt is distributed without a long drought', async () => {
      const recs642an = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs642an[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs642an[4] = makeSharedRecord(4, { unresolvedClues: ['b'] });
      recs642an[9] = makeSharedRecord(9, { unresolvedClues: ['c'] });
      const res = await runBF642(recs642an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_OPEN_THREAD_DROUGHT_RUN'), 'BELIEF_OPEN_THREAD_DROUGHT_RUN should not fire');
    });

    // BELIEF_STAGING_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; visually dense scenes (visualBeats≥2) at 0,1,2 → 100% opening third
    it('BELIEF_STAGING_ZONE_CLUSTER fires when >75% of visually dense scenes cluster in one third', async () => {
      const recs642b = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs642b[0] = makeSharedRecord(0, { visualBeats: ['a', 'b'] });
      recs642b[1] = makeSharedRecord(1, { visualBeats: ['a', 'b'] });
      recs642b[2] = makeSharedRecord(2, { visualBeats: ['a', 'b'] });
      const res = await runBF642(recs642b);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_STAGING_ZONE_CLUSTER'), 'BELIEF_STAGING_ZONE_CLUSTER should fire');
    });

    // BELIEF_STAGING_ZONE_CLUSTER no-fire:
    // visually dense scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('BELIEF_STAGING_ZONE_CLUSTER does not fire when visually dense scenes are distributed across thirds', async () => {
      const recs642bn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs642bn[0] = makeSharedRecord(0, { visualBeats: ['a', 'b'] });
      recs642bn[4] = makeSharedRecord(4, { visualBeats: ['a', 'b'] });
      recs642bn[7] = makeSharedRecord(7, { visualBeats: ['a', 'b'] });
      const res = await runBF642(recs642bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_STAGING_ZONE_CLUSTER'), 'BELIEF_STAGING_ZONE_CLUSTER should not fire');
    });

    // BELIEF_SEED_CURIOSITY_DECOUPLED fire:
    // n=6; seeds at 0,1 (no curiosity); curiosity at 4,5 (no seed) → zero overlap → fires
    it('BELIEF_SEED_CURIOSITY_DECOUPLED fires when seed scenes and curiosity-spike scenes never overlap', async () => {
      const recs642c = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs642c[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs642c[1] = makeSharedRecord(1, { seededClueIds: ['clue-b'] });
      recs642c[4] = makeSharedRecord(4, { curiosityDelta: 1 });
      recs642c[5] = makeSharedRecord(5, { curiosityDelta: 1 });
      const res = await runBF642(recs642c);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_SEED_CURIOSITY_DECOUPLED'), 'BELIEF_SEED_CURIOSITY_DECOUPLED should fire');
    });

    // BELIEF_SEED_CURIOSITY_DECOUPLED no-fire:
    // scene 0 carries BOTH a seed and a curiosity spike → overlap exists
    it('BELIEF_SEED_CURIOSITY_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs642cn = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs642cn[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'], curiosityDelta: 1 });
      recs642cn[1] = makeSharedRecord(1, { seededClueIds: ['clue-b'] });
      recs642cn[5] = makeSharedRecord(5, { curiosityDelta: 1 });
      const res = await runBF642(recs642cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_SEED_CURIOSITY_DECOUPLED'), 'BELIEF_SEED_CURIOSITY_DECOUPLED should not fire');
    });
  });

  describe('Wave 628 — beliefPass: belief payoff seed decoupled, clock delta peak uncaused, belief character moment zone imbalance', async () => {
    const runBF628 = async (records: ScreenplaySceneRecord[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // BELIEF_PAYOFF_SEED_DECOUPLED fire:
    // n=6; payoffs at 0,1 (no seed); seeds at 4,5 (no payoff) → zero overlap → fires
    it('BELIEF_PAYOFF_SEED_DECOUPLED fires when payoff scenes and seed scenes never overlap', async () => {
      const recs628a = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs628a[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs628a[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs628a[4] = makeSharedRecord(4, { seededClueIds: ['clue-a'] });
      recs628a[5] = makeSharedRecord(5, { seededClueIds: ['clue-b'] });
      const res = await runBF628(recs628a);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_PAYOFF_SEED_DECOUPLED'), 'BELIEF_PAYOFF_SEED_DECOUPLED should fire');
    });

    // BELIEF_PAYOFF_SEED_DECOUPLED no-fire:
    // scene 0 carries BOTH a payoff and a seed → overlap exists
    it('BELIEF_PAYOFF_SEED_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs628an = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs628an[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'], seededClueIds: ['clue-a'] });
      recs628an[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs628an[5] = makeSharedRecord(5, { seededClueIds: ['clue-b'] });
      const res = await runBF628(recs628an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_PAYOFF_SEED_DECOUPLED'), 'BELIEF_PAYOFF_SEED_DECOUPLED should not fire');
    });

    // CLOCK_DELTA_PEAK_UNCAUSED fire:
    // 8 scenes; clockDelta>0 at 2 (val=1) and 6 (val=5, the peak); no dramaticTurn or revelation
    // at 6, 5, or 4
    it('CLOCK_DELTA_PEAK_UNCAUSED fires when the peak clockDelta scene has no dramatic turn or revelation nearby', async () => {
      const recs628b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs628b[2] = makeSharedRecord(2, { clockDelta: 1 });
      recs628b[6] = makeSharedRecord(6, { clockDelta: 5 });
      const res = await runBF628(recs628b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_DELTA_PEAK_UNCAUSED'), 'CLOCK_DELTA_PEAK_UNCAUSED should fire');
    });

    // CLOCK_DELTA_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('CLOCK_DELTA_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs628bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs628bn[2] = makeSharedRecord(2, { clockDelta: 1 });
      recs628bn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs628bn[6] = makeSharedRecord(6, { clockDelta: 5 });
      const res = await runBF628(recs628bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_DELTA_PEAK_UNCAUSED'), 'CLOCK_DELTA_PEAK_UNCAUSED should not fire');
    });

    // BELIEF_CHARACTER_MOMENT_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); character-moment scenes at 6,7,8,9; zone 2 (6-8)=3,
    // zone 3 (9)=1, total=4; zones 0,1 empty; bloatZoneIdx=zone2, 3/4=75% ≥ 50% → fires
    it('BELIEF_CHARACTER_MOMENT_ZONE_IMBALANCE fires when one zone is empty of character-moment scenes while another is bloated', async () => {
      const recs628c = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i, {
        purpose: (i === 6 || i === 7 || i === 8 || i === 9) ? 'character_moment' : 'complicate',
      }));
      const res = await runBF628(recs628c);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_CHARACTER_MOMENT_ZONE_IMBALANCE'), 'BELIEF_CHARACTER_MOMENT_ZONE_IMBALANCE should fire');
    });

    // BELIEF_CHARACTER_MOMENT_ZONE_IMBALANCE no-fire:
    // one character-moment scene per zone (1,4,7,10) → no zone is empty
    it('BELIEF_CHARACTER_MOMENT_ZONE_IMBALANCE does not fire when every zone has a character-moment scene', async () => {
      const recs628cn = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i, {
        purpose: (i === 1 || i === 4 || i === 7 || i === 10) ? 'character_moment' : 'complicate',
      }));
      const res = await runBF628(recs628cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_CHARACTER_MOMENT_ZONE_IMBALANCE'), 'BELIEF_CHARACTER_MOMENT_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 614 — beliefPass: belief staging zone imbalance, clock signal flatline, visual beat belief decoupled', async () => {
    const runBF614 = async (records: ScreenplaySceneRecord[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // BELIEF_STAGING_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); visually dense scenes (visualBeats≥2) at 6,9,10,11;
    // zones 0 (0-2) and 1 (3-5) are empty; zone 3 (9-11) holds 3/4 = 75% ≥ 50% → fires
    it('BELIEF_STAGING_ZONE_IMBALANCE fires when one zone is empty of visually dense scenes while another is bloated', async () => {
      const recs614a = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs614a[6] = makeSharedRecord(6, { visualBeats: ['pockets the note', 'hides the key'] });
      recs614a[9] = makeSharedRecord(9, { visualBeats: ['pockets the note', 'hides the key'] });
      recs614a[10] = makeSharedRecord(10, { visualBeats: ['pockets the note', 'hides the key'] });
      recs614a[11] = makeSharedRecord(11, { visualBeats: ['pockets the note', 'hides the key'] });
      const res = await runBF614(recs614a);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_STAGING_ZONE_IMBALANCE'), 'BELIEF_STAGING_ZONE_IMBALANCE should fire');
    });

    // BELIEF_STAGING_ZONE_IMBALANCE no-fire:
    // one visually dense scene per zone (1,4,7,10) → no zone is empty
    it('BELIEF_STAGING_ZONE_IMBALANCE does not fire when every zone has a visually dense scene', async () => {
      const recs614an = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs614an[1] = makeSharedRecord(1, { visualBeats: ['pockets the note', 'hides the key'] });
      recs614an[4] = makeSharedRecord(4, { visualBeats: ['pockets the note', 'hides the key'] });
      recs614an[7] = makeSharedRecord(7, { visualBeats: ['pockets the note', 'hides the key'] });
      recs614an[10] = makeSharedRecord(10, { visualBeats: ['pockets the note', 'hides the key'] });
      const res = await runBF614(recs614an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_STAGING_ZONE_IMBALANCE'), 'BELIEF_STAGING_ZONE_IMBALANCE should not fire');
    });

    // CLOCK_SIGNAL_FLATLINE fire:
    // 8 scenes, every clockDelta identical (1.0) — zero deviation from the average
    it('CLOCK_SIGNAL_FLATLINE fires when clockDelta barely varies across scenes', async () => {
      const recs614b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i, { clockDelta: 1.0 }));
      const res = await runBF614(recs614b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_SIGNAL_FLATLINE'), 'CLOCK_SIGNAL_FLATLINE should fire');
    });

    // CLOCK_SIGNAL_FLATLINE no-fire:
    // alternating 0.2/2.5 — wide deviation from the average
    it('CLOCK_SIGNAL_FLATLINE does not fire when clockDelta varies widely across scenes', async () => {
      const recs614bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i, { clockDelta: i % 2 === 0 ? 0.2 : 2.5 }));
      const res = await runBF614(recs614bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_SIGNAL_FLATLINE'), 'CLOCK_SIGNAL_FLATLINE should not fire');
    });

    // VISUAL_BEAT_BELIEF_DECOUPLED fire:
    // n=6; staged at 0,1 (no belief assertion); assertions at 4,5 (no staging) → zero overlap → fires
    it('VISUAL_BEAT_BELIEF_DECOUPLED fires when visually-staged scenes and belief-assertion scenes never overlap', async () => {
      const recs614c = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs614c[0] = makeSharedRecord(0, { visualBeats: ['pockets the note', 'hides the key'] });
      recs614c[1] = makeSharedRecord(1, { visualBeats: ['pockets the note', 'hides the key'] });
      recs614c[4] = makeSharedRecord(4, { dialogueHighlights: ['alice: believes X'] });
      recs614c[5] = makeSharedRecord(5, { dialogueHighlights: ['bob: believes Y'] });
      const res = await runBF614(recs614c);
      assert.ok(res.issues.some((i: any) => i.rule === 'VISUAL_BEAT_BELIEF_DECOUPLED'), 'VISUAL_BEAT_BELIEF_DECOUPLED should fire');
    });

    // VISUAL_BEAT_BELIEF_DECOUPLED no-fire:
    // scene 0 carries BOTH staging and a belief assertion → overlap exists
    it('VISUAL_BEAT_BELIEF_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs614cn = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs614cn[0] = makeSharedRecord(0, { visualBeats: ['pockets the note', 'hides the key'], dialogueHighlights: ['alice: believes X'] });
      recs614cn[1] = makeSharedRecord(1, { visualBeats: ['pockets the note', 'hides the key'] });
      recs614cn[4] = makeSharedRecord(4, { dialogueHighlights: ['bob: believes Y'] });
      const res = await runBF614(recs614cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VISUAL_BEAT_BELIEF_DECOUPLED'), 'VISUAL_BEAT_BELIEF_DECOUPLED should not fire');
    });
  });

  describe('Wave 600 — beliefPass: clue debt belief decoupled, clue debt clock aftermath void, clue debt zone imbalance', async () => {
    const runBF600 = async (records: ScreenplaySceneRecord[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CLUE_DEBT_BELIEF_DECOUPLED fires when no clue-debt scene coincides with a belief assertion', async () => {
      // 6 scenes; debt at 0,1; belief assertions at 4,5 — zero overlap
      const recs600a = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs600a[0] = makeSharedRecord(0, { unresolvedClues: ['clue-a'] });
      recs600a[1] = makeSharedRecord(1, { unresolvedClues: ['clue-b'] });
      recs600a[4] = makeSharedRecord(4, { dialogueHighlights: ['alice: believes X'] });
      recs600a[5] = makeSharedRecord(5, { dialogueHighlights: ['bob: believes Y'] });
      const res = await runBF600(recs600a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLUE_DEBT_BELIEF_DECOUPLED'), 'CLUE_DEBT_BELIEF_DECOUPLED should fire');
    });

    it('CLUE_DEBT_BELIEF_DECOUPLED does not fire when a clue-debt scene also carries a belief assertion', async () => {
      const recs600a = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs600a[0] = makeSharedRecord(0, { unresolvedClues: ['clue-a'], dialogueHighlights: ['alice: believes X'] });
      recs600a[1] = makeSharedRecord(1, { unresolvedClues: ['clue-b'] });
      recs600a[4] = makeSharedRecord(4, { dialogueHighlights: ['bob: believes Y'] });
      const res = await runBF600(recs600a);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLUE_DEBT_BELIEF_DECOUPLED'), 'CLUE_DEBT_BELIEF_DECOUPLED should not fire');
    });

    it('CLUE_DEBT_CLOCK_AFTERMATH_VOID fires when no clue-debt scene is followed by a clock raise within 2 scenes', async () => {
      // 9 scenes; debt at 0,1,2 (windows reach at most scene 4); clock raises at 7,8 (outside every window)
      const recs600b = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs600b[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs600b[1] = makeSharedRecord(1, { unresolvedClues: ['b'] });
      recs600b[2] = makeSharedRecord(2, { unresolvedClues: ['c'] });
      recs600b[7] = makeSharedRecord(7, { clockRaised: true });
      recs600b[8] = makeSharedRecord(8, { clockRaised: true });
      const res = await runBF600(recs600b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLUE_DEBT_CLOCK_AFTERMATH_VOID'), 'CLUE_DEBT_CLOCK_AFTERMATH_VOID should fire');
    });

    it('CLUE_DEBT_CLOCK_AFTERMATH_VOID does not fire when a clue-debt scene is followed by a clock raise within 2 scenes', async () => {
      const recs600bnr = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs600bnr[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs600bnr[1] = makeSharedRecord(1, { unresolvedClues: ['b'] });
      recs600bnr[2] = makeSharedRecord(2, { unresolvedClues: ['c'], clockRaised: true });
      recs600bnr[7] = makeSharedRecord(7, { clockRaised: true });
      const res = await runBF600(recs600bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLUE_DEBT_CLOCK_AFTERMATH_VOID'), 'CLUE_DEBT_CLOCK_AFTERMATH_VOID should not fire');
    });

    it('CLUE_DEBT_ZONE_IMBALANCE fires when one zone has zero clue-debt scenes and another has ≥50%', async () => {
      // 12 scenes, 4 zones of 3: debt at 6,7,8 (zone 2) plus 9 (zone 3) to meet minCount=4
      const recs600c = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs600c[6] = makeSharedRecord(6, { unresolvedClues: ['a'] });
      recs600c[7] = makeSharedRecord(7, { unresolvedClues: ['b'] });
      recs600c[8] = makeSharedRecord(8, { unresolvedClues: ['c'] });
      recs600c[9] = makeSharedRecord(9, { unresolvedClues: ['d'] });
      const res = await runBF600(recs600c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLUE_DEBT_ZONE_IMBALANCE'), 'CLUE_DEBT_ZONE_IMBALANCE should fire');
    });

    it('CLUE_DEBT_ZONE_IMBALANCE does not fire when clue-debt scenes are spread across all zones', async () => {
      const recs600cnr = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs600cnr[1] = makeSharedRecord(1, { unresolvedClues: ['a'] });
      recs600cnr[4] = makeSharedRecord(4, { unresolvedClues: ['b'] });
      recs600cnr[7] = makeSharedRecord(7, { unresolvedClues: ['c'] });
      recs600cnr[10] = makeSharedRecord(10, { unresolvedClues: ['d'] });
      const res = await runBF600(recs600cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLUE_DEBT_ZONE_IMBALANCE'), 'CLUE_DEBT_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 586 — beliefPass: revelation dramatic-turn aftermath void, assertion relationship aftermath void, revelation payoff aftermath void', async () => {
    const makeRec586 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const ASSERT586 = ['ALICE: the belief stands firm'];
    const runBF586 = async (records: any[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // REVELATION_DRAMATIC_TURN_AFTERMATH_VOID fire:
    // 10 scenes; revelations at 0,3 (pos<8); dramatic turns at 7,9 (not at 1,2,4,5) → fires
    it('REVELATION_DRAMATIC_TURN_AFTERMATH_VOID fires when no revelation is followed by a dramatic turn within 2 scenes', async () => {
      const recs586a = Array.from({ length: 10 }, (_, i) =>
        makeRec586(i, {
          revelation: i === 0 || i === 3 ? 'the secret is out' : null,
          dramaticTurn: i === 7 || i === 9 ? 'reversal' : 'nothing',
        })
      );
      const res = await runBF586(recs586a);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'REVELATION_DRAMATIC_TURN_AFTERMATH_VOID'), 'REVELATION_DRAMATIC_TURN_AFTERMATH_VOID should fire');
    });

    // REVELATION_DRAMATIC_TURN_AFTERMATH_VOID no-fire:
    // dramatic turn at 1 (within 2 of revelation at 0) → does not fire
    it('REVELATION_DRAMATIC_TURN_AFTERMATH_VOID does not fire when a revelation is followed by a dramatic turn within 2 scenes', async () => {
      const recs586an = Array.from({ length: 10 }, (_, i) =>
        makeRec586(i, {
          revelation: i === 0 || i === 3 ? 'the secret is out' : null,
          dramaticTurn: i === 1 || i === 8 ? 'reversal' : 'nothing',
        })
      );
      const res = await runBF586(recs586an);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'REVELATION_DRAMATIC_TURN_AFTERMATH_VOID'), 'REVELATION_DRAMATIC_TURN_AFTERMATH_VOID should not fire');
    });

    // ASSERTION_RELATIONSHIP_AFTERMATH_VOID fire:
    // 10 scenes; assertions at 0,3 (pos<9); relationship shifts at 6,8 (not at 1,4) → fires
    it('ASSERTION_RELATIONSHIP_AFTERMATH_VOID fires when no assertion is followed by a relationship shift', async () => {
      const recs586b = Array.from({ length: 10 }, (_, i) =>
        makeRec586(i, {
          dialogueHighlights: i === 0 || i === 3 ? ASSERT586 : [],
          relationshipShifts: i === 6 || i === 8 ? [{ characters: ['ALICE', 'BOB'], direction: 'strained' }] : [],
        })
      );
      const res = await runBF586(recs586b);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'ASSERTION_RELATIONSHIP_AFTERMATH_VOID'), 'ASSERTION_RELATIONSHIP_AFTERMATH_VOID should fire');
    });

    // ASSERTION_RELATIONSHIP_AFTERMATH_VOID no-fire:
    // relationship shift at 1 (aftermath of assertion at 0) → does not fire
    it('ASSERTION_RELATIONSHIP_AFTERMATH_VOID does not fire when an assertion is followed by a relationship shift', async () => {
      const recs586bn = Array.from({ length: 10 }, (_, i) =>
        makeRec586(i, {
          dialogueHighlights: i === 0 || i === 3 ? ASSERT586 : [],
          relationshipShifts: i === 1 || i === 7 ? [{ characters: ['ALICE', 'BOB'], direction: 'strained' }] : [],
        })
      );
      const res = await runBF586(recs586bn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'ASSERTION_RELATIONSHIP_AFTERMATH_VOID'), 'ASSERTION_RELATIONSHIP_AFTERMATH_VOID should not fire');
    });

    // REVELATION_PAYOFF_AFTERMATH_VOID fire:
    // 10 scenes; revelations at 0,3 (pos<9); payoffs at 6,8 (not at 1,4) → fires
    it('REVELATION_PAYOFF_AFTERMATH_VOID fires when no revelation is followed by a payoff', async () => {
      const recs586c = Array.from({ length: 10 }, (_, i) =>
        makeRec586(i, {
          revelation: i === 0 || i === 3 ? 'truth uncovered' : null,
          payoffSetupIds: i === 6 || i === 8 ? ['thread-A'] : [],
        })
      );
      const res = await runBF586(recs586c);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'REVELATION_PAYOFF_AFTERMATH_VOID'), 'REVELATION_PAYOFF_AFTERMATH_VOID should fire');
    });

    // REVELATION_PAYOFF_AFTERMATH_VOID no-fire:
    // payoff at 1 (aftermath of revelation at 0) → does not fire
    it('REVELATION_PAYOFF_AFTERMATH_VOID does not fire when a revelation is followed by a payoff', async () => {
      const recs586cn = Array.from({ length: 10 }, (_, i) =>
        makeRec586(i, {
          revelation: i === 0 || i === 3 ? 'truth uncovered' : null,
          payoffSetupIds: i === 1 || i === 7 ? ['thread-A'] : [],
        })
      );
      const res = await runBF586(recs586cn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'REVELATION_PAYOFF_AFTERMATH_VOID'), 'REVELATION_PAYOFF_AFTERMATH_VOID should not fire');
    });
  });


  describe('Wave 572 — beliefPass: assertion clock aftermath void, assertion seed aftermath void, assertion payoff aftermath void', async () => {
    const makeRec572 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const ASSERT572 = ['ALICE: the truth is out now'];
    const runB572 = async (records: any[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // ASSERTION_CLOCK_AFTERMATH_VOID fire:
    // 10 scenes; assertions at 0,3 (pos<9); clocks at 6,7 (≥2, not at aftermath positions 1,4) → fires
    it('ASSERTION_CLOCK_AFTERMATH_VOID fires when no assertion is followed by a raised clock', async () => {
      const recs572a = Array.from({ length: 10 }, (_, i) =>
        makeRec572(i, {
          dialogueHighlights: [0, 3].includes(i) ? ASSERT572 : [],
          clockRaised: [6, 7].includes(i),
        }),
      );
      const res = await runB572(recs572a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ASSERTION_CLOCK_AFTERMATH_VOID'), 'ASSERTION_CLOCK_AFTERMATH_VOID should fire');
    });

    // ASSERTION_CLOCK_AFTERMATH_VOID no-fire:
    // assertions at 0,3; clock at 1 (aftermath of assertion@0) and 7 → assertion followed by clock → no fire
    it('ASSERTION_CLOCK_AFTERMATH_VOID does not fire when an assertion is followed by a raised clock', async () => {
      const recs572an = Array.from({ length: 10 }, (_, i) =>
        makeRec572(i, {
          dialogueHighlights: [0, 3].includes(i) ? ASSERT572 : [],
          clockRaised: [1, 7].includes(i),
        }),
      );
      const res = await runB572(recs572an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ASSERTION_CLOCK_AFTERMATH_VOID'), 'ASSERTION_CLOCK_AFTERMATH_VOID should not fire');
    });

    // ASSERTION_SEED_AFTERMATH_VOID fire:
    // assertions at 0,3; seeds at 6,7 (not at aftermath positions 1,4) → fires
    it('ASSERTION_SEED_AFTERMATH_VOID fires when no assertion is followed by a seeded clue', async () => {
      const recs572b = Array.from({ length: 10 }, (_, i) =>
        makeRec572(i, {
          dialogueHighlights: [0, 3].includes(i) ? ASSERT572 : [],
          seededClueIds: [6, 7].includes(i) ? ['c1'] : [],
        }),
      );
      const res = await runB572(recs572b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ASSERTION_SEED_AFTERMATH_VOID'), 'ASSERTION_SEED_AFTERMATH_VOID should fire');
    });

    // ASSERTION_SEED_AFTERMATH_VOID no-fire:
    // seed at 1 (aftermath of assertion@0) and 7 → assertion followed by seed → no fire
    it('ASSERTION_SEED_AFTERMATH_VOID does not fire when an assertion is followed by a seeded clue', async () => {
      const recs572bn = Array.from({ length: 10 }, (_, i) =>
        makeRec572(i, {
          dialogueHighlights: [0, 3].includes(i) ? ASSERT572 : [],
          seededClueIds: [1, 7].includes(i) ? ['c1'] : [],
        }),
      );
      const res = await runB572(recs572bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ASSERTION_SEED_AFTERMATH_VOID'), 'ASSERTION_SEED_AFTERMATH_VOID should not fire');
    });

    // ASSERTION_PAYOFF_AFTERMATH_VOID fire:
    // assertions at 0,3; payoffs at 6,7 (not at aftermath positions 1,4) → fires
    it('ASSERTION_PAYOFF_AFTERMATH_VOID fires when no assertion is followed by a payoff', async () => {
      const recs572c = Array.from({ length: 10 }, (_, i) =>
        makeRec572(i, {
          dialogueHighlights: [0, 3].includes(i) ? ASSERT572 : [],
          payoffSetupIds: [6, 7].includes(i) ? ['p1'] : [],
        }),
      );
      const res = await runB572(recs572c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ASSERTION_PAYOFF_AFTERMATH_VOID'), 'ASSERTION_PAYOFF_AFTERMATH_VOID should fire');
    });

    // ASSERTION_PAYOFF_AFTERMATH_VOID no-fire:
    // payoff at 1 (aftermath of assertion@0) and 7 → assertion followed by payoff → no fire
    it('ASSERTION_PAYOFF_AFTERMATH_VOID does not fire when an assertion is followed by a payoff', async () => {
      const recs572cn = Array.from({ length: 10 }, (_, i) =>
        makeRec572(i, {
          dialogueHighlights: [0, 3].includes(i) ? ASSERT572 : [],
          payoffSetupIds: [1, 7].includes(i) ? ['p1'] : [],
        }),
      );
      const res = await runB572(recs572cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ASSERTION_PAYOFF_AFTERMATH_VOID'), 'ASSERTION_PAYOFF_AFTERMATH_VOID should not fire');
    });
  });


  describe('Wave 558 — beliefPass: assertion emotional aftermath flat, revelation curiosity peak early, seed temporal cluster', async () => {
    const makeRec558 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const runB558 = async (records: any[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // ASSERTION_EMOTIONAL_AFTERMATH_FLAT fire:
    // 10 scenes; assertions at positions 0,3,6 (all pos<9); scenes at 1,4,7 all neutral →
    // 3 qualifying assertions, all followed by neutral → fires
    it('ASSERTION_EMOTIONAL_AFTERMATH_FLAT fires when all assertion aftermaths are emotionally neutral', async () => {
      const recs558a = Array.from({ length: 10 }, (_, i) =>
        makeRec558(i, {
          dialogueHighlights: [0, 3, 6].includes(i) ? ['ALICE: something is happening here'] : [],
          emotionalShift: [0, 1, 3, 4, 6, 7].includes(i) ? 'neutral' : 'neutral',
        }),
      );
      const res = await runB558(recs558a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ASSERTION_EMOTIONAL_AFTERMATH_FLAT'), 'ASSERTION_EMOTIONAL_AFTERMATH_FLAT should fire');
    });

    // ASSERTION_EMOTIONAL_AFTERMATH_FLAT no-fire:
    // 10 scenes; assertions at 0,3,6; scene at position 4 (after assertion at 3) is 'positive' →
    // not all neutral → no fire
    it('ASSERTION_EMOTIONAL_AFTERMATH_FLAT does not fire when at least one assertion aftermath is non-neutral', async () => {
      const recs558anr = Array.from({ length: 10 }, (_, i) =>
        makeRec558(i, {
          dialogueHighlights: [0, 3, 6].includes(i) ? ['BOB: the truth must emerge now'] : [],
          emotionalShift: i === 4 ? 'positive' : 'neutral',
        }),
      );
      const res = await runB558(recs558anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ASSERTION_EMOTIONAL_AFTERMATH_FLAT'), 'ASSERTION_EMOTIONAL_AFTERMATH_FLAT should not fire');
    });

    // REVELATION_CURIOSITY_PEAK_EARLY fire:
    // 10 scenes; revelation with curiosityDelta at pos 0 (delta=5), 5 (delta=2), 7 (delta=1);
    // earlyThreshold=floor(10*0.25)=2; peak at pos 0 < 2, 2 later rev-with-curiosity → fires
    it('REVELATION_CURIOSITY_PEAK_EARLY fires when the highest-curiosity revelation is in the first 25%', async () => {
      const recs558b = Array.from({ length: 10 }, (_, i) =>
        makeRec558(i, {
          revelation: [0, 5, 7].includes(i) ? 'a truth is revealed' : null,
          curiosityDelta: i === 0 ? 5 : i === 5 ? 2 : i === 7 ? 1 : 0,
        }),
      );
      const res = await runB558(recs558b);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_CURIOSITY_PEAK_EARLY'), 'REVELATION_CURIOSITY_PEAK_EARLY should fire');
    });

    // REVELATION_CURIOSITY_PEAK_EARLY no-fire:
    // 10 scenes; revelation with curiosityDelta at pos 3 (delta=5), 6 (delta=3), 8 (delta=1);
    // earlyThreshold=2; peak at pos 3 is NOT < 2 → no fire
    it('REVELATION_CURIOSITY_PEAK_EARLY does not fire when the peak-curiosity revelation is past the first 25%', async () => {
      const recs558bnr = Array.from({ length: 10 }, (_, i) =>
        makeRec558(i, {
          revelation: [3, 6, 8].includes(i) ? 'a truth is revealed' : null,
          curiosityDelta: i === 3 ? 5 : i === 6 ? 3 : i === 8 ? 1 : 0,
        }),
      );
      const res = await runB558(recs558bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_CURIOSITY_PEAK_EARLY'), 'REVELATION_CURIOSITY_PEAK_EARLY should not fire');
    });

    // SEED_TEMPORAL_CLUSTER fire:
    // 12 scenes; seeded at positions 0,1,2 (all in first third=floor(12/3)=4 → positions 0-3);
    // firstZone=3/3=100% > 75% → fires
    it('SEED_TEMPORAL_CLUSTER fires when 3+ seed scenes are concentrated in one structural third', async () => {
      const recs558c = Array.from({ length: 12 }, (_, i) =>
        makeRec558(i, {
          seededClueIds: [0, 1, 2].includes(i) ? ['clue-A'] : [],
        }),
      );
      const res = await runB558(recs558c);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_TEMPORAL_CLUSTER'), 'SEED_TEMPORAL_CLUSTER should fire');
    });

    // SEED_TEMPORAL_CLUSTER no-fire:
    // 12 scenes; seeded at 0, 4, 8 (one per third); maxZone=1/3≈33% ≤ 75% → no fire
    it('SEED_TEMPORAL_CLUSTER does not fire when seed scenes are distributed across thirds', async () => {
      const recs558cnr = Array.from({ length: 12 }, (_, i) =>
        makeRec558(i, {
          seededClueIds: [0, 4, 8].includes(i) ? ['clue-A'] : [],
        }),
      );
      const res = await runB558(recs558cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_TEMPORAL_CLUSTER'), 'SEED_TEMPORAL_CLUSTER should not fire');
    });
  });


  describe('Wave 544 — beliefPass: revelation closing quarter absent, assertion drought, turn revelation aftermath void', async () => {
    const makeRec544 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const runB544 = async (records: any[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // REVELATION_CLOSING_QUARTER_ABSENT fire:
    // n=10; closingStart=7; revelations at i=1,3,5 (all<7); closing quarter i=7,8,9 has none → fires
    it('REVELATION_CLOSING_QUARTER_ABSENT fires when all revelations occur before the closing quarter', async () => {
      const recs544a = Array.from({ length: 10 }, (_, i) =>
        makeRec544(i, { revelation: [1, 3, 5].includes(i) ? 'a truth is exposed here' : null }),
      );
      const res = await runB544(recs544a);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_CLOSING_QUARTER_ABSENT'), 'REVELATION_CLOSING_QUARTER_ABSENT should fire');
    });

    // REVELATION_CLOSING_QUARTER_ABSENT no-fire:
    // n=10; revelations at i=1,3,7 — one in closing quarter (i=7≥7) → no fire
    it('REVELATION_CLOSING_QUARTER_ABSENT does not fire when a revelation exists in the closing quarter', async () => {
      const recs544anr = Array.from({ length: 10 }, (_, i) =>
        makeRec544(i, { revelation: [1, 3, 7].includes(i) ? 'a truth is exposed here' : null }),
      );
      const res = await runB544(recs544anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_CLOSING_QUARTER_ABSENT'), 'REVELATION_CLOSING_QUARTER_ABSENT should not fire');
    });

    // ASSERTION_DROUGHT fire:
    // n=10; assertions (dialogueHighlights with colon) at i=0,1,9; gap between 1 and 9 = 7 scenes (2-8)
    // assertionSceneIdxSet={0,1,9} size=3≥3; maxGap=7≥7 → fires
    it('ASSERTION_DROUGHT fires when 7+ consecutive scenes contain no character assertion', async () => {
      const recs544b = Array.from({ length: 10 }, (_, i) =>
        makeRec544(i, {
          dialogueHighlights: [0, 1, 9].includes(i) ? ['ALICE: this is what I believe to be true'] : [],
        }),
      );
      const res = await runB544(recs544b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ASSERTION_DROUGHT'), 'ASSERTION_DROUGHT should fire');
    });

    // ASSERTION_DROUGHT no-fire:
    // n=10; assertions at i=0,4,9; gaps = 3 (1-3) and 4 (5-8) → maxGap=4 < 7 → no fire
    it('ASSERTION_DROUGHT does not fire when no assertion gap reaches 7 consecutive scenes', async () => {
      const recs544bnr = Array.from({ length: 10 }, (_, i) =>
        makeRec544(i, {
          dialogueHighlights: [0, 4, 9].includes(i) ? ['ALICE: this is what I believe to be true'] : [],
        }),
      );
      const res = await runB544(recs544bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ASSERTION_DROUGHT'), 'ASSERTION_DROUGHT should not fire');
    });

    // TURN_REVELATION_AFTERMATH_VOID fire:
    // n=10; turns at i=2,5 (both pos<8); revelations at i=0,9;
    // turn 2→next 3,4 no rev; turn 5→next 6,7 no rev → anyFollowed=false → fires
    it('TURN_REVELATION_AFTERMATH_VOID fires when no dramatic turn is followed by a revelation within 2 scenes', async () => {
      const recs544c = Array.from({ length: 10 }, (_, i) =>
        makeRec544(i, {
          dramaticTurn: [2, 5].includes(i) ? 'reversal' : 'nothing',
          revelation: [0, 9].includes(i) ? 'something disclosed' : null,
        }),
      );
      const res = await runB544(recs544c);
      assert.ok(res.issues.some((i: any) => i.rule === 'TURN_REVELATION_AFTERMATH_VOID'), 'TURN_REVELATION_AFTERMATH_VOID should fire');
    });

    // TURN_REVELATION_AFTERMATH_VOID no-fire:
    // turns at i=2,5; revelations at i=0,4; turn at 2 → next2=records[4] has revelation → has aftermath → no fire
    it('TURN_REVELATION_AFTERMATH_VOID does not fire when a turn is followed by a revelation within 2 scenes', async () => {
      const recs544cnr = Array.from({ length: 10 }, (_, i) =>
        makeRec544(i, {
          dramaticTurn: [2, 5].includes(i) ? 'reversal' : 'nothing',
          revelation: [0, 4].includes(i) ? 'something disclosed' : null,
        }),
      );
      const res = await runB544(recs544cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TURN_REVELATION_AFTERMATH_VOID'), 'TURN_REVELATION_AFTERMATH_VOID should not fire');
    });
  });


  describe('Wave 530 — beliefPass: assertion positive decoupled, positive scene revelation void, assertion turn aftermath void', async () => {
    const makeRec530 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      seededClueIds: [], payoffSetupIds: [], revelation: null,
      dialogueHighlights: [], relationshipShifts: [], dramaticTurn: 'nothing',
      purpose: 'development', unresolvedClues: [],
      ...overrides,
    });
    const runB530 = async (records: any[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // ASSERTION_POSITIVE_DECOUPLED fire: n=10; assertions (dialogueHighlights) at 1,4;
    // positive emotion at 6,8; no overlap → fires
    it('ASSERTION_POSITIVE_DECOUPLED fires when assertion scenes and positive-emotion scenes never coincide', async () => {
      const recs530a = Array.from({ length: 10 }, (_, i) =>
        makeRec530(i, {
          dialogueHighlights: [1, 4].includes(i) ? ['ALICE: The truth matters.'] : [],
          emotionalShift: [6, 8].includes(i) ? 'positive' : 'neutral',
        }),
      );
      const res = await runB530(recs530a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ASSERTION_POSITIVE_DECOUPLED'), 'ASSERTION_POSITIVE_DECOUPLED should fire');
    });

    // ASSERTION_POSITIVE_DECOUPLED no-fire: assertion at 4, positive emotion also at 4 → overlap → no fire
    it('ASSERTION_POSITIVE_DECOUPLED does not fire when at least one assertion scene is also positively emotional', async () => {
      const recs530anr = Array.from({ length: 10 }, (_, i) =>
        makeRec530(i, {
          dialogueHighlights: [1, 4].includes(i) ? ['ALICE: The truth matters.'] : [],
          emotionalShift: [4, 8].includes(i) ? 'positive' : 'neutral',
        }),
      );
      const res = await runB530(recs530anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ASSERTION_POSITIVE_DECOUPLED'), 'ASSERTION_POSITIVE_DECOUPLED should not fire');
    });

    // POSITIVE_SCENE_REVELATION_VOID fire: n=10; revelations at 2,5; positive emotion at 7,9; no overlap → fires
    it('POSITIVE_SCENE_REVELATION_VOID fires when no positive-emotion scene carries a revelation', async () => {
      const recs530b = Array.from({ length: 10 }, (_, i) =>
        makeRec530(i, {
          revelation: [2, 5].includes(i) ? 'Secret revealed.' : null,
          emotionalShift: [7, 9].includes(i) ? 'positive' : 'neutral',
        }),
      );
      const res = await runB530(recs530b);
      assert.ok(res.issues.some((i: any) => i.rule === 'POSITIVE_SCENE_REVELATION_VOID'), 'POSITIVE_SCENE_REVELATION_VOID should fire');
    });

    // POSITIVE_SCENE_REVELATION_VOID no-fire: positive scene at 5 has revelation → overlap → no fire
    it('POSITIVE_SCENE_REVELATION_VOID does not fire when at least one positive-emotion scene has a revelation', async () => {
      const recs530bnr = Array.from({ length: 10 }, (_, i) =>
        makeRec530(i, {
          revelation: [2, 5].includes(i) ? 'Secret revealed.' : null,
          emotionalShift: [5, 9].includes(i) ? 'positive' : 'neutral',
        }),
      );
      const res = await runB530(recs530bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'POSITIVE_SCENE_REVELATION_VOID'), 'POSITIVE_SCENE_REVELATION_VOID should not fire');
    });

    // ASSERTION_TURN_AFTERMATH_VOID fire: n=10; assertions at 0,2; turns at 6,8 (>2 scenes away from any assertion) → fires
    it('ASSERTION_TURN_AFTERMATH_VOID fires when no assertion is followed by a dramatic turn within 2 scenes', async () => {
      const recs530c = Array.from({ length: 10 }, (_, i) =>
        makeRec530(i, {
          dialogueHighlights: [0, 2].includes(i) ? ['ALICE: The truth matters.'] : [],
          dramaticTurn: [6, 8].includes(i) ? 'reversal' : 'nothing',
        }),
      );
      const res = await runB530(recs530c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ASSERTION_TURN_AFTERMATH_VOID'), 'ASSERTION_TURN_AFTERMATH_VOID should fire');
    });

    // ASSERTION_TURN_AFTERMATH_VOID no-fire: assertion at 2, turn at 4 (2 scenes later) → in window → no fire
    it('ASSERTION_TURN_AFTERMATH_VOID does not fire when an assertion is followed by a dramatic turn within 2 scenes', async () => {
      const recs530cnr = Array.from({ length: 10 }, (_, i) =>
        makeRec530(i, {
          dialogueHighlights: [0, 2].includes(i) ? ['ALICE: The truth matters.'] : [],
          dramaticTurn: [4, 8].includes(i) ? 'reversal' : 'nothing',
        }),
      );
      const res = await runB530(recs530cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ASSERTION_TURN_AFTERMATH_VOID'), 'ASSERTION_TURN_AFTERMATH_VOID should not fire');
    });
  });


  describe('Wave 516 — beliefPass: revelation relationship aftermath void, revelation clock aftermath void, revelation seed aftermath void', async () => {
    const makeRec516 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      seededClueIds: [], payoffSetupIds: [], revelation: null,
      dialogueHighlights: [], relationshipShifts: [], dramaticTurn: 'nothing',
      purpose: 'development', unresolvedClues: [],
      ...overrides,
    });
    const runB516 = async (records: any[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('REVELATION_RELATIONSHIP_AFTERMATH_VOID fires when no revelation is followed by a relationship shift', async () => {
      // 9 scenes: revelations at 2 and 5; relShifts at 0 and 7 (not at positions 3 or 6, immediately after revelations) → fires
      const recs516a = Array.from({ length: 9 }, (_, i) =>
        makeRec516(i, {
          revelation: [2, 5].includes(i) ? 'Truth is revealed.' : null,
          relationshipShifts: [0, 7].includes(i) ? [{ from: 'A', to: 'B', delta: 1 }] : [],
        }),
      );
      const res = await runB516(recs516a);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_RELATIONSHIP_AFTERMATH_VOID'), 'REVELATION_RELATIONSHIP_AFTERMATH_VOID should fire');
    });

    it('REVELATION_RELATIONSHIP_AFTERMATH_VOID does not fire when a revelation is followed by a relationship shift', async () => {
      // 9 scenes: revelations at 2 and 5; relShift at 3 (immediately after revelation 2) → aftermath exists → no fire
      const recs516anr = Array.from({ length: 9 }, (_, i) =>
        makeRec516(i, {
          revelation: [2, 5].includes(i) ? 'Truth is revealed.' : null,
          relationshipShifts: [3, 7].includes(i) ? [{ from: 'A', to: 'B', delta: 1 }] : [],
        }),
      );
      const res = await runB516(recs516anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_RELATIONSHIP_AFTERMATH_VOID'), 'REVELATION_RELATIONSHIP_AFTERMATH_VOID should not fire');
    });

    it('REVELATION_CLOCK_AFTERMATH_VOID fires when no revelation is followed by a raised clock', async () => {
      // 9 scenes: revelations at 2 and 5; clockRaised at 0 and 7 (not at positions 3 or 6) → fires
      const recs516b = Array.from({ length: 9 }, (_, i) =>
        makeRec516(i, {
          revelation: [2, 5].includes(i) ? 'Truth is revealed.' : null,
          clockRaised: [0, 7].includes(i),
        }),
      );
      const res = await runB516(recs516b);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_CLOCK_AFTERMATH_VOID'), 'REVELATION_CLOCK_AFTERMATH_VOID should fire');
    });

    it('REVELATION_CLOCK_AFTERMATH_VOID does not fire when a revelation is followed by a raised clock', async () => {
      // 9 scenes: revelations at 2 and 5; clockRaised at 3 (immediately after revelation 2) → aftermath exists → no fire
      const recs516bnr = Array.from({ length: 9 }, (_, i) =>
        makeRec516(i, {
          revelation: [2, 5].includes(i) ? 'Truth is revealed.' : null,
          clockRaised: [3, 7].includes(i),
        }),
      );
      const res = await runB516(recs516bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_CLOCK_AFTERMATH_VOID'), 'REVELATION_CLOCK_AFTERMATH_VOID should not fire');
    });

    it('REVELATION_SEED_AFTERMATH_VOID fires when no revelation is followed by a seeded clue', async () => {
      // 9 scenes: revelations at 2 and 5; seeds at 0 and 7 (not at positions 3 or 6) → fires
      const recs516c = Array.from({ length: 9 }, (_, i) =>
        makeRec516(i, {
          revelation: [2, 5].includes(i) ? 'Truth is revealed.' : null,
          seededClueIds: [0, 7].includes(i) ? ['clue-A'] : [],
        }),
      );
      const res = await runB516(recs516c);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_SEED_AFTERMATH_VOID'), 'REVELATION_SEED_AFTERMATH_VOID should fire');
    });

    it('REVELATION_SEED_AFTERMATH_VOID does not fire when a revelation is followed by a seeded clue', async () => {
      // 9 scenes: revelations at 2 and 5; seed at 3 (immediately after revelation 2) → aftermath exists → no fire
      const recs516cnr = Array.from({ length: 9 }, (_, i) =>
        makeRec516(i, {
          revelation: [2, 5].includes(i) ? 'Truth is revealed.' : null,
          seededClueIds: [3, 7].includes(i) ? ['clue-B'] : [],
        }),
      );
      const res = await runB516(recs516cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_SEED_AFTERMATH_VOID'), 'REVELATION_SEED_AFTERMATH_VOID should not fire');
    });
  });


  describe('Wave 502 — beliefPass: revelation-seed decoupled, revelation curiosity aftermath void, assertion consecutive flood', async () => {
    const makeRec502 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      seededClueIds: [], payoffSetupIds: [], revelation: null,
      dialogueHighlights: [], relationshipShifts: [], dramaticTurn: 'nothing',
      purpose: 'development', unresolvedClues: [],
      ...overrides,
    });
    const runB502 = async (records: any[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('REVELATION_SEED_DECOUPLED fires when revelation and seed scenes never overlap', async () => {
      // n=10; revelations at pos 2,6 (no seeds); seeds at pos 4,7 (no revelation)
      // revScenes=2 >= 2, seedScenes=2 >= 2, anyCoOccur=false → fire
      const recs502a = Array.from({ length: 10 }, (_, i) =>
        makeRec502(i, {
          revelation: [2, 6].includes(i) ? 'A truth is revealed.' : null,
          seededClueIds: [4, 7].includes(i) ? ['clue-x'] : [],
        }),
      );
      const res = await runB502(recs502a);
      assert.ok(res.issues.some((is: any) => is.rule === 'REVELATION_SEED_DECOUPLED'), 'REVELATION_SEED_DECOUPLED should fire');
    });

    it('REVELATION_SEED_DECOUPLED does not fire when a revelation and seed co-occur in the same scene', async () => {
      // n=10; scene 4 has both revelation and seededClueIds → anyCoOccur=true → no fire
      const recs502anr = Array.from({ length: 10 }, (_, i) =>
        makeRec502(i, {
          revelation: [2, 4, 6].includes(i) ? 'Truth surfaces.' : null,
          seededClueIds: [4, 7].includes(i) ? ['clue-A'] : [],
        }),
      );
      const res = await runB502(recs502anr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'REVELATION_SEED_DECOUPLED'), 'REVELATION_SEED_DECOUPLED should not fire');
    });

    it('REVELATION_CURIOSITY_AFTERMATH_VOID fires when post-revelation curiosity average is <= 0', async () => {
      // n=10; revelations at pos 1,3,5; next scenes (2,4,6) all curiosityDelta=0 → avg=0 <= 0 → fire
      const recs502b = Array.from({ length: 10 }, (_, i) =>
        makeRec502(i, {
          revelation: [1, 3, 5].includes(i) ? 'A secret comes out.' : null,
          curiosityDelta: 0,
        }),
      );
      const res = await runB502(recs502b);
      assert.ok(res.issues.some((is: any) => is.rule === 'REVELATION_CURIOSITY_AFTERMATH_VOID'), 'REVELATION_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('REVELATION_CURIOSITY_AFTERMATH_VOID does not fire when post-revelation curiosity average is > 0', async () => {
      // n=10; revelations at pos 1,3,5; scene 2 has curiosityDelta=3 (others 0) → avg=1 > 0 → no fire
      const recs502bnr = Array.from({ length: 10 }, (_, i) =>
        makeRec502(i, {
          revelation: [1, 3, 5].includes(i) ? 'Hidden truth.' : null,
          curiosityDelta: i === 2 ? 3 : 0,
        }),
      );
      const res = await runB502(recs502bnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'REVELATION_CURIOSITY_AFTERMATH_VOID'), 'REVELATION_CURIOSITY_AFTERMATH_VOID should not fire');
    });

    it('ASSERTION_CONSECUTIVE_FLOOD fires when three or more consecutive assertion scenes exist', async () => {
      // n=10; assertions (dialogueHighlights) at pos 2,3,4,7 → run of 3 at 2-4, maxRun=3 >= 3 → fire
      const recs502c = Array.from({ length: 10 }, (_, i) =>
        makeRec502(i, {
          dialogueHighlights: [2, 3, 4, 7].includes(i) ? ['HERO: Truth is inescapable.'] : [],
        }),
      );
      const res = await runB502(recs502c);
      assert.ok(res.issues.some((is: any) => is.rule === 'ASSERTION_CONSECUTIVE_FLOOD'), 'ASSERTION_CONSECUTIVE_FLOOD should fire');
    });

    it('ASSERTION_CONSECUTIVE_FLOOD does not fire when assertion scenes are all separated', async () => {
      // n=10; assertions at pos 2,4,6,8 → each isolated, maxRun=1 < 3 → no fire
      const recs502cnr = Array.from({ length: 10 }, (_, i) =>
        makeRec502(i, {
          dialogueHighlights: [2, 4, 6, 8].includes(i) ? ['HERO: Beliefs matter.'] : [],
        }),
      );
      const res = await runB502(recs502cnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'ASSERTION_CONSECUTIVE_FLOOD'), 'ASSERTION_CONSECUTIVE_FLOOD should not fire');
    });
  });


  describe('Wave 488 — beliefPass: revelation temporal cluster, revelation relationship peak absent, assertion negative decoupled', async () => {
    const makeRec488 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      seededClueIds: [], payoffSetupIds: [], revelation: null,
      dialogueHighlights: [], relationshipShifts: [], dramaticTurn: 'nothing',
      purpose: 'development', unresolvedClues: [],
      ...overrides,
    });
    const mkShift488 = (amount: number) => [{ pairKey: 'A|B', dimension: 'trust', amount }];
    const runB488 = async (records: any[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('REVELATION_TEMPORAL_CLUSTER fires when >75% of revelations fall in one structural third', async () => {
      // n=9, third=3; revelations at pos 0,1,2 (all zone1) → 3/3=100% > 75% → fire
      const recs488a = Array.from({ length: 9 }, (_, i) =>
        makeRec488(i, {
          revelation: [0, 1, 2].includes(i) ? 'Something is revealed here.' : null,
        }),
      );
      const res = await runB488(recs488a);
      assert.ok(res.issues.some((is: any) => is.rule === 'REVELATION_TEMPORAL_CLUSTER'), 'REVELATION_TEMPORAL_CLUSTER should fire');
    });

    it('REVELATION_TEMPORAL_CLUSTER does not fire when revelations are distributed across thirds', async () => {
      // n=9, third=3; revelations at pos 0 (zone1), 3 (zone2), 6 (zone3) → 1/1/1 = 33% each < 75%
      const recs488anr = Array.from({ length: 9 }, (_, i) =>
        makeRec488(i, {
          revelation: [0, 3, 6].includes(i) ? 'Something is revealed.' : null,
        }),
      );
      const res = await runB488(recs488anr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'REVELATION_TEMPORAL_CLUSTER'), 'REVELATION_TEMPORAL_CLUSTER should not fire');
    });

    it('REVELATION_RELATIONSHIP_PEAK_ABSENT fires when peak-relationship scene has no revelation while others do', async () => {
      // n=8; pos 0: large relationship shift (2.0), no revelation
      // pos 3: small relationship shift (0.5) + revelation; pos 5: revelation only
      // maxRelMag=2.0 at pos 0 (no rev); revCount=2; relShiftCount=2; otherRelWithRev=true → fire
      const recs488b = Array.from({ length: 8 }, (_, i) =>
        makeRec488(i, {
          relationshipShifts: i === 0 ? mkShift488(2.0) : i === 3 ? mkShift488(0.5) : [],
          revelation: i === 3 ? 'She knew all along.' : i === 5 ? 'He was never there.' : null,
        }),
      );
      const res = await runB488(recs488b);
      assert.ok(res.issues.some((is: any) => is.rule === 'REVELATION_RELATIONSHIP_PEAK_ABSENT'), 'REVELATION_RELATIONSHIP_PEAK_ABSENT should fire');
    });

    it('REVELATION_RELATIONSHIP_PEAK_ABSENT does not fire when peak-relationship scene has a revelation', async () => {
      // Same but pos 0 now also has a revelation → peakHasRev=true → no fire
      const recs488bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec488(i, {
          relationshipShifts: i === 0 ? mkShift488(2.0) : i === 3 ? mkShift488(0.5) : [],
          revelation: [0, 3, 5].includes(i) ? 'Truth emerges.' : null,
        }),
      );
      const res = await runB488(recs488bnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'REVELATION_RELATIONSHIP_PEAK_ABSENT'), 'REVELATION_RELATIONSHIP_PEAK_ABSENT should not fire');
    });

    it('ASSERTION_NEGATIVE_DECOUPLED fires when no assertion scene coincides with a negative emotional shift', async () => {
      // n=8; assertions at pos 0 (neutral) and 3 (positive); negative scenes at pos 1 and 5
      // no assertion is negative → fire
      const recs488c = Array.from({ length: 8 }, (_, i) =>
        makeRec488(i, {
          emotionalShift: i === 3 ? 'positive' : [1, 5].includes(i) ? 'negative' : 'neutral',
          dialogueHighlights: [0, 3].includes(i) ? ['CHAR: She claims the plan will work.'] : [],
        }),
      );
      const res = await runB488(recs488c);
      assert.ok(res.issues.some((is: any) => is.rule === 'ASSERTION_NEGATIVE_DECOUPLED'), 'ASSERTION_NEGATIVE_DECOUPLED should fire');
    });

    it('ASSERTION_NEGATIVE_DECOUPLED does not fire when an assertion lands in a negative-emotion scene', async () => {
      // n=8; assertion at pos 0 (negative emotional shift) → anyNegAssertion=true → no fire
      const recs488cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec488(i, {
          emotionalShift: [0, 5].includes(i) ? 'negative' : 'neutral',
          dialogueHighlights: [0, 3].includes(i) ? ['CHAR: She claims the plan will work.'] : [],
        }),
      );
      const res = await runB488(recs488cnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'ASSERTION_NEGATIVE_DECOUPLED'), 'ASSERTION_NEGATIVE_DECOUPLED should not fire');
    });
  });


  describe('Wave 474 — beliefPass: assertion temporal cluster, revelation emotional aftermath flat, assertion curiosity aftermath void', async () => {
    const makeRec474 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      seededClueIds: [], payoffSetupIds: [], revelation: null,
      dialogueHighlights: [], relationshipShifts: [], dramaticTurn: 'nothing',
      purpose: 'development', unresolvedClues: [],
      ...overrides,
    });
    const runB474 = async (records: any[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ASSERTION_TEMPORAL_CLUSTER fires when >75% of assertion scenes fall in a single third', async () => {
      // n=12; assertions at positions 0,1,2,3 (all in first third, floor(12/3)=4 → positions 0-3)
      // 4/4 = 100% > 75% → fires
      const recs474a = Array.from({ length: 12 }, (_, i) =>
        makeRec474(i, {
          dialogueHighlights: [0, 1, 2, 3].includes(i) ? [`CHAR: She claims the mission is doomed.`] : [],
        }),
      );
      const res = await runB474(recs474a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ASSERTION_TEMPORAL_CLUSTER'), 'ASSERTION_TEMPORAL_CLUSTER should fire');
    });

    it('ASSERTION_TEMPORAL_CLUSTER does not fire when assertion scenes are spread across all thirds', async () => {
      // n=12; assertions at positions 0,4,8,11 → first zone: 1, mid: 1, last: 2 → max=2/4=50% ≤ 75%
      const recs474anr = Array.from({ length: 12 }, (_, i) =>
        makeRec474(i, {
          dialogueHighlights: [0, 4, 8, 11].includes(i) ? [`CHAR: She claims the mission is doomed.`] : [],
        }),
      );
      const res = await runB474(recs474anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ASSERTION_TEMPORAL_CLUSTER'), 'ASSERTION_TEMPORAL_CLUSTER should not fire');
    });

    it('REVELATION_EMOTIONAL_AFTERMATH_FLAT fires when all post-revelation scenes are emotionally neutral', async () => {
      // n=8; revelations at positions 1,3,5 (emotionalShift='positive' so REVELATION_DRAMA_VACUUM won't fire)
      // Aftermath scenes 2,4,6: emotionalShift='neutral' → all flat → fires
      const recs474b = Array.from({ length: 8 }, (_, i) =>
        makeRec474(i, {
          revelation: [1, 3, 5].includes(i) ? `Truth at scene ${i}` : null,
          emotionalShift: [1, 3, 5].includes(i) ? 'positive' : 'neutral',
          dialogueHighlights: i === 0 ? ['CHAR: She insists the map is real.'] : [],
        }),
      );
      const res = await runB474(recs474b);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_EMOTIONAL_AFTERMATH_FLAT'), 'REVELATION_EMOTIONAL_AFTERMATH_FLAT should fire');
    });

    it('REVELATION_EMOTIONAL_AFTERMATH_FLAT does not fire when at least one aftermath is emotionally charged', async () => {
      // n=8; revelations at 1,3,5; aftermath scenes: 2=neutral, 4=neutral, 6=positive → not all flat
      const recs474bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec474(i, {
          revelation: [1, 3, 5].includes(i) ? `Truth at scene ${i}` : null,
          emotionalShift: [1, 3, 5].includes(i) ? 'positive' : i === 6 ? 'positive' : 'neutral',
          dialogueHighlights: i === 0 ? ['CHAR: She insists the map is real.'] : [],
        }),
      );
      const res = await runB474(recs474bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_EMOTIONAL_AFTERMATH_FLAT'), 'REVELATION_EMOTIONAL_AFTERMATH_FLAT should not fire');
    });

    it('ASSERTION_CURIOSITY_AFTERMATH_VOID fires when avg post-assertion curiosityDelta ≤ 0', async () => {
      // n=8; assertions at positions 1,3,5 (not at 7); aftermaths at 2,4,6 with curiosityDelta=-1,-1,0
      // avg=(-1-1+0)/3=-0.67 ≤ 0 → fires
      const recs474c = Array.from({ length: 8 }, (_, i) =>
        makeRec474(i, {
          dialogueHighlights: [1, 3, 5].includes(i) ? [`CHAR: She claims he lied about the money.`] : [],
          curiosityDelta: i === 2 ? -1 : i === 4 ? -1 : 0,
        }),
      );
      const res = await runB474(recs474c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ASSERTION_CURIOSITY_AFTERMATH_VOID'), 'ASSERTION_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('ASSERTION_CURIOSITY_AFTERMATH_VOID does not fire when avg post-assertion curiosityDelta > 0', async () => {
      // n=8; assertions at 1,3,5; aftermaths at 2,4,6 with curiosityDelta=2,1,1 → avg=4/3 > 0
      const recs474cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec474(i, {
          dialogueHighlights: [1, 3, 5].includes(i) ? [`CHAR: She claims he lied about the money.`] : [],
          curiosityDelta: i === 2 ? 2 : i === 4 ? 1 : i === 6 ? 1 : 0,
        }),
      );
      const res = await runB474(recs474cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ASSERTION_CURIOSITY_AFTERMATH_VOID'), 'ASSERTION_CURIOSITY_AFTERMATH_VOID should not fire');
    });
  });


  describe('Wave 460 — beliefPass: assertion causal vacuum, revelation suspense deflation, assertion payoff decoupled', async () => {
    const makeRec460 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      seededClueIds: [], payoffSetupIds: [], revelation: null,
      dialogueHighlights: [], relationshipShifts: [], dramaticTurn: 'nothing',
      purpose: 'development', unresolvedClues: [],
      ...overrides,
    });
    const runB460 = async (records: any[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ASSERTION_CAUSAL_VACUUM fires when every assertion has no narrative trigger in prior 2 scenes', async () => {
      // n=10; revelation at scene 0 (satisfies witnessedBeliefs≥1); assertions at 5,7,9
      // Prior 2 scenes before each assertion have no revelation/turn/suspenseDelta>1 → all vacuous
      const recs460a = Array.from({ length: 10 }, (_, i) =>
        makeRec460(i, {
          revelation: i === 0 ? 'The letter was forged.' : null,
          dialogueHighlights: [5, 7, 9].includes(i) ? [`CHAR: She claims it was not her.`] : [],
        }),
      );
      const res = await runB460(recs460a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ASSERTION_CAUSAL_VACUUM'), 'ASSERTION_CAUSAL_VACUUM should fire');
    });

    it('ASSERTION_CAUSAL_VACUUM does NOT fire when at least one assertion follows a narrative trigger', async () => {
      // n=10; revelation at 0; assertions at 5,7,9; scene 4 has dramaticTurn='reversal'
      // Checking assertion at 5: records[4].dramaticTurn='reversal'≠'nothing' → not vacuous → no fire
      const recs460anr = Array.from({ length: 10 }, (_, i) =>
        makeRec460(i, {
          revelation: i === 0 ? 'The letter was forged.' : null,
          dramaticTurn: i === 4 ? 'reversal' : 'nothing',
          dialogueHighlights: [5, 7, 9].includes(i) ? [`CHAR: She claims it was not her.`] : [],
        }),
      );
      const res = await runB460(recs460anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ASSERTION_CAUSAL_VACUUM'), 'ASSERTION_CAUSAL_VACUUM should not fire');
    });

    it('REVELATION_SUSPENSE_DEFLATION fires when aftermath of revelations averages negative suspenseDelta', async () => {
      // n=8; revelations at scenes 1,3,5 (pos 1,3,5 < 7); next scenes 2,4,6 have suspenseDelta=-1,-1,-2
      // avg = (-1 + -1 + -2)/3 = -4/3 < 0 → fires
      const recs460b = Array.from({ length: 8 }, (_, i) =>
        makeRec460(i, {
          revelation: [1, 3, 5].includes(i) ? `Truth ${i}` : null,
          suspenseDelta: [2, 4, 6].includes(i) ? (i === 6 ? -2 : -1) : 0,
          dialogueHighlights: i === 0 ? ['CHAR: He insists she is innocent.'] : [],
        }),
      );
      const res = await runB460(recs460b);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_SUSPENSE_DEFLATION'), 'REVELATION_SUSPENSE_DEFLATION should fire');
    });

    it('REVELATION_SUSPENSE_DEFLATION does NOT fire when aftermath average is non-negative', async () => {
      // n=8; revelations at 1,3,5; scene 2 → -1, scene 4 → -1, scene 6 → +3
      // avg = (-1 + -1 + 3)/3 = 1/3 ≥ 0 → no fire
      const recs460bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec460(i, {
          revelation: [1, 3, 5].includes(i) ? `Truth ${i}` : null,
          suspenseDelta: i === 2 ? -1 : i === 4 ? -1 : i === 6 ? 3 : 0,
          dialogueHighlights: i === 0 ? ['CHAR: He insists she is innocent.'] : [],
        }),
      );
      const res = await runB460(recs460bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_SUSPENSE_DEFLATION'), 'REVELATION_SUSPENSE_DEFLATION should not fire');
    });

    it('ASSERTION_PAYOFF_DECOUPLED fires when assertion scenes and payoff scenes never overlap', async () => {
      // n=8; assertions at 1,3 (dialogueHighlights); payoffs at 5,7 (payoffSetupIds); no overlap → fires
      const recs460c = Array.from({ length: 8 }, (_, i) =>
        makeRec460(i, {
          dialogueHighlights: [1, 3].includes(i) ? ['CHAR: She claims the map is false.'] : [],
          payoffSetupIds: [5, 7].includes(i) ? ['setup-001'] : [],
        }),
      );
      const res = await runB460(recs460c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ASSERTION_PAYOFF_DECOUPLED'), 'ASSERTION_PAYOFF_DECOUPLED should fire');
    });

    it('ASSERTION_PAYOFF_DECOUPLED does NOT fire when an assertion scene coincides with a payoff', async () => {
      // n=8; assertions at 1,3; payoffs at 3,7 — scene 3 has both assertion AND payoff → no fire
      const recs460cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec460(i, {
          dialogueHighlights: [1, 3].includes(i) ? ['CHAR: She claims the map is false.'] : [],
          payoffSetupIds: [3, 7].includes(i) ? ['setup-001'] : [],
        }),
      );
      const res = await runB460(recs460cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ASSERTION_PAYOFF_DECOUPLED'), 'ASSERTION_PAYOFF_DECOUPLED should not fire');
    });
  });


  describe('Wave 446 — beliefPass: revelation drought, assertion reactive void, negative scene revelation void', async () => {
    const makeRec446 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      seededClueIds: [], payoffSetupIds: [], revelation: null,
      dialogueHighlights: [], relationshipShifts: [], dramaticTurn: 'nothing',
      purpose: 'development', unresolvedClues: [],
      ...overrides,
    });
    const runB446 = async (records: any[], fountain = '') => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('REVELATION_DROUGHT fires when revelations leave a run of ≥6 consecutive silent scenes', async () => {
      // n=10; revelations at 0 and 9; scenes 1–8 silent → run=8 ≥ 6 → fires
      const recs446a = Array.from({ length: 10 }, (_, i) =>
        makeRec446(i, {
          revelation: [0, 9].includes(i) ? `Truth at scene ${i}` : null,
        }),
      );
      const res = await runB446(recs446a);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_DROUGHT'), 'REVELATION_DROUGHT should fire');
    });

    it('REVELATION_DROUGHT does NOT fire when revelations are spread with gaps under 6', async () => {
      // n=10; revelations at 0,4,8 → longest silent run = 3 < 6 → no fire
      const recs446anr = Array.from({ length: 10 }, (_, i) =>
        makeRec446(i, {
          revelation: [0, 4, 8].includes(i) ? `Truth at scene ${i}` : null,
        }),
      );
      const res = await runB446(recs446anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_DROUGHT'), 'REVELATION_DROUGHT should not fire');
    });

    it('ASSERTION_REACTIVE_VOID fires when no assertion appears within 2 scenes of any revelation', async () => {
      // n=10; revelations at 2,6; assertions at 0,9 (outside both revelation aftermath windows)
      // Aftermath of rev@2: records[3,4] → sceneIdx 3,4 ∉ {0,9} → quiet
      // Aftermath of rev@6: records[7,8] → sceneIdx 7,8 ∉ {0,9} → quiet → fires
      const recs446b = Array.from({ length: 10 }, (_, i) =>
        makeRec446(i, {
          revelation: [2, 6].includes(i) ? `Revelation at scene ${i}` : null,
          dialogueHighlights: [0, 9].includes(i) ? ['CHAR: She claims it was never there.'] : [],
        }),
      );
      const res = await runB446(recs446b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ASSERTION_REACTIVE_VOID'), 'ASSERTION_REACTIVE_VOID should fire');
    });

    it('ASSERTION_REACTIVE_VOID does NOT fire when an assertion follows a revelation within 2 scenes', async () => {
      // n=10; revelations at 2,6; assertions at 3,7 (1 scene after each revelation)
      // Aftermath of rev@2: records[3] has assertion → returns false → allQuiet=false → no fire
      const recs446bnr = Array.from({ length: 10 }, (_, i) =>
        makeRec446(i, {
          revelation: [2, 6].includes(i) ? `Revelation at scene ${i}` : null,
          dialogueHighlights: [3, 7].includes(i) ? ['CHAR: She now believes the key was taken.'] : [],
        }),
      );
      const res = await runB446(recs446bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ASSERTION_REACTIVE_VOID'), 'ASSERTION_REACTIVE_VOID should not fire');
    });

    it('NEGATIVE_SCENE_REVELATION_VOID fires when no negative-emotional scene coincides with a revelation', async () => {
      // n=8; negative scenes at 0,2,4 (no revelation); revelations at 1 (neutral) and 5 (neutral)
      // negScenes=[0,2,4] (3 ≥ 3); revSet={1,5}; hasRevInNeg=false → fires
      const recs446c = Array.from({ length: 8 }, (_, i) =>
        makeRec446(i, {
          emotionalShift: [0, 2, 4].includes(i) ? 'negative' : 'neutral',
          revelation: [1, 5].includes(i) ? `Truth at scene ${i}` : null,
          dialogueHighlights: i === 0 ? ['CHAR: She insists nothing happened.'] : [],
        }),
      );
      const res = await runB446(recs446c);
      assert.ok(res.issues.some((i: any) => i.rule === 'NEGATIVE_SCENE_REVELATION_VOID'), 'NEGATIVE_SCENE_REVELATION_VOID should fire');
    });

    it('NEGATIVE_SCENE_REVELATION_VOID does NOT fire when at least one negative scene carries a revelation', async () => {
      // n=8; negative scenes at 0,2,4; revelation at 0 (negative) and 5 (neutral)
      // negScenes=[0,2,4]; revSet={0,5}; hasRevInNeg = 0 ∈ revSet = true → no fire
      const recs446cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec446(i, {
          emotionalShift: [0, 2, 4].includes(i) ? 'negative' : 'neutral',
          revelation: [0, 5].includes(i) ? `Truth at scene ${i}` : null,
          dialogueHighlights: i === 1 ? ['CHAR: She insists nothing happened.'] : [],
        }),
      );
      const res = await runB446(recs446cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'NEGATIVE_SCENE_REVELATION_VOID'), 'NEGATIVE_SCENE_REVELATION_VOID should not fire');
    });
  });


  describe('Wave 432 — beliefPass: revelation emotional monotone, revelation unprepared climax, assertion singleton run', async () => {
    const makeRec432 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      seededClueIds: [], payoffSetupIds: [], revelation: null,
      dialogueHighlights: [], relationshipShifts: [], dramaticTurn: 'nothing',
      purpose: 'development', unresolvedClues: [],
      ...overrides,
    });
    const runB432 = async (records: any[], fountain = '') => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('REVELATION_EMOTIONAL_MONOTONE fires when all charged revelation scenes share the same negative polarity', async () => {
      // n=8; revelations at 2,4,6 all with emotionalShift='negative' → allNeg=true → fires
      const recs432a = Array.from({ length: 8 }, (_, i) =>
        makeRec432(i, {
          revelation: [2, 4, 6].includes(i) ? `Truth revealed at scene ${i}` : null,
          emotionalShift: [2, 4, 6].includes(i) ? 'negative' : 'neutral',
        }),
      );
      const res = await runB432(recs432a);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_EMOTIONAL_MONOTONE'), 'REVELATION_EMOTIONAL_MONOTONE should fire');
    });

    it('REVELATION_EMOTIONAL_MONOTONE does not fire when revelations carry mixed emotional polarities', async () => {
      // n=8; revelations at 2,4,6 — scenes 2,4 negative, scene 6 positive → mixed → no fire
      const recs432anr = Array.from({ length: 8 }, (_, i) =>
        makeRec432(i, {
          revelation: [2, 4, 6].includes(i) ? `Truth revealed at scene ${i}` : null,
          emotionalShift: [2, 4].includes(i) ? 'negative' : i === 6 ? 'positive' : 'neutral',
        }),
      );
      const res = await runB432(recs432anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_EMOTIONAL_MONOTONE'), 'REVELATION_EMOTIONAL_MONOTONE should not fire');
    });

    it('REVELATION_UNPREPARED_CLIMAX fires when the final revelation has no prior assertion in the 3 preceding scenes', async () => {
      // n=10; revelations at 2 and 8; scenes 5,6,7 (the 3 prior to scene 8) have no assertions → fires
      const recs432b = Array.from({ length: 10 }, (_, i) =>
        makeRec432(i, {
          revelation: [2, 8].includes(i) ? `Disclosure at scene ${i}` : null,
          // assertion only at scene 1, far from the final revelation at 8
          dialogueHighlights: i === 1 ? ['CHAR: She claims he was never there.'] : [],
        }),
      );
      const res = await runB432(recs432b);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_UNPREPARED_CLIMAX'), 'REVELATION_UNPREPARED_CLIMAX should fire');
    });

    it('REVELATION_UNPREPARED_CLIMAX does not fire when an assertion appears within 3 scenes of the final revelation', async () => {
      // n=10; revelations at 2 and 8; scene 7 has an assertion (1 scene before the final) → no fire
      const recs432bnr = Array.from({ length: 10 }, (_, i) =>
        makeRec432(i, {
          revelation: [2, 8].includes(i) ? `Disclosure at scene ${i}` : null,
          dialogueHighlights: i === 7 ? ['CHAR: She insists the key was hidden before the storm.'] : [],
        }),
      );
      const res = await runB432(recs432bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_UNPREPARED_CLIMAX'), 'REVELATION_UNPREPARED_CLIMAX should not fire');
    });

    it('ASSERTION_SINGLETON_RUN fires when no two assertion scenes appear consecutively', async () => {
      // n=10; 4 assertions at scenes 0,3,6,9 (none consecutive) → maxRun=1 ≤ 1 → fires
      const recs432c = Array.from({ length: 10 }, (_, i) =>
        makeRec432(i, {
          dialogueHighlights: [0, 3, 6, 9].includes(i) ? ['CHAR: She claims it was never there.'] : [],
        }),
      );
      const res = await runB432(recs432c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ASSERTION_SINGLETON_RUN'), 'ASSERTION_SINGLETON_RUN should fire');
    });

    it('ASSERTION_SINGLETON_RUN does not fire when two consecutive assertion scenes exist', async () => {
      // n=10; assertions at 0,1,5,8 — scenes 0 and 1 are consecutive → maxRun=2 > 1 → no fire
      const recs432cnr = Array.from({ length: 10 }, (_, i) =>
        makeRec432(i, {
          dialogueHighlights: [0, 1, 5, 8].includes(i) ? ['CHAR: She claims it was never there.'] : [],
        }),
      );
      const res = await runB432(recs432cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ASSERTION_SINGLETON_RUN'), 'ASSERTION_SINGLETON_RUN should not fire');
    });
  });


  describe('Wave 418 — beliefPass: revelation consecutive flood, assertion Act 2a void, assertion aftermath void', async () => {
    const makeRec418 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      seededClueIds: [], payoffSetupIds: [], revelation: null,
      dialogueHighlights: [], relationshipShifts: [], dramaticTurn: 'nothing',
      purpose: 'development', unresolvedClues: [],
      ...overrides,
    });
    const runB418 = async (records: any[], fountain = '') => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('REVELATION_CONSECUTIVE_FLOOD fires when 3+ revelation scenes appear consecutively', async () => {
      // n=10, revelations at 3,4,5,6 → consecutive run=4 ≥3 → fires
      const recs418a = Array.from({ length: 10 }, (_, i) =>
        makeRec418(i, {
          revelation: [3, 4, 5, 6].includes(i) ? `Truth revealed at scene ${i}` : null,
          dialogueHighlights: [3, 4, 5, 6].includes(i) ? [`truth at scene ${i}`] : [],
        }),
      );
      const res = await runB418(recs418a);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_CONSECUTIVE_FLOOD'), 'REVELATION_CONSECUTIVE_FLOOD should fire');
    });

    it('REVELATION_CONSECUTIVE_FLOOD does not fire when revelations are separated by non-revelation scenes', async () => {
      // n=10, revelations at 2,4,6,8 → all isolated (max run=1) → no fire
      const recs418anr = Array.from({ length: 10 }, (_, i) =>
        makeRec418(i, {
          revelation: [2, 4, 6, 8].includes(i) ? `Truth revealed at scene ${i}` : null,
          dialogueHighlights: [2, 4, 6, 8].includes(i) ? [`truth at scene ${i}`] : [],
        }),
      );
      const res = await runB418(recs418anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_CONSECUTIVE_FLOOD'), 'REVELATION_CONSECUTIVE_FLOOD should not fire');
    });

    it('ASSERTION_ACT2A_VOID fires when no assertion lands in the 25%–50% zone while others exist', async () => {
      // n=12, act2a=[3..5]; assertions at 0,1,10 (3 toldBeliefs) → none in [3..5] → fires
      const recs418b = Array.from({ length: 12 }, (_, i) =>
        makeRec418(i, {
          dialogueHighlights: [0, 1, 10].includes(i) ? ['CHAR: He claims the evidence was planted.'] : [],
        }),
      );
      const res = await runB418(recs418b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ASSERTION_ACT2A_VOID'), 'ASSERTION_ACT2A_VOID should fire');
    });

    it('ASSERTION_ACT2A_VOID does not fire when an assertion lands in the Act 2a zone', async () => {
      // n=12, act2a=[3..5]; assertion at 4 (inside zone) → no fire
      const recs418bnr = Array.from({ length: 12 }, (_, i) =>
        makeRec418(i, {
          dialogueHighlights: [0, 4, 10].includes(i) ? ['CHAR: He claims the evidence was planted.'] : [],
        }),
      );
      const res = await runB418(recs418bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ASSERTION_ACT2A_VOID'), 'ASSERTION_ACT2A_VOID should not fire');
    });

    it('ASSERTION_AFTERMATH_VOID fires when every assertion is followed by two flat scenes', async () => {
      // n=10, assertions at 0,3,6; all subsequent scenes have suspense=0, no rel-shifts, no revelations → fires
      const recs418c = Array.from({ length: 10 }, (_, i) =>
        makeRec418(i, {
          dialogueHighlights: [0, 3, 6].includes(i) ? ['CHAR: She insists she was never there.'] : [],
        }),
      );
      const res = await runB418(recs418c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ASSERTION_AFTERMATH_VOID'), 'ASSERTION_AFTERMATH_VOID should fire');
    });

    it('ASSERTION_AFTERMATH_VOID does not fire when an assertion is followed by a suspense rise', async () => {
      // n=10, assertions at 0,3,6; scene 1 has suspenseDelta=2 (aftermath of 0 is not flat) → no fire
      const recs418cnr = Array.from({ length: 10 }, (_, i) =>
        makeRec418(i, {
          dialogueHighlights: [0, 3, 6].includes(i) ? ['CHAR: She insists she was never there.'] : [],
          suspenseDelta: i === 1 ? 2 : 0,
        }),
      );
      const res = await runB418(recs418cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ASSERTION_AFTERMATH_VOID'), 'ASSERTION_AFTERMATH_VOID should not fire');
    });
  });


  describe('Wave 404 — beliefPass: revelation payoff decoupled, told belief seed decoupled, assertion Act 1 only', async () => {
    const makeRec404 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      seededClueIds: [], payoffSetupIds: [], revelation: null,
      dialogueHighlights: [], relationshipShifts: [], dramaticTurn: 'nothing',
      purpose: 'establish', unresolvedClues: [],
      ...overrides,
    });
    const runB404 = async (records: any[], fountain = '') => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('REVELATION_PAYOFF_DECOUPLED fires when revelation and payoff scenes never share a scene', async () => {
      const recs404a = [
        makeRec404(0), makeRec404(1), makeRec404(2),
        makeRec404(3, { revelation: 'The killer was never caught.' }),
        makeRec404(4),
        makeRec404(5, { revelation: 'She knew all along.' }),
        makeRec404(6, { payoffSetupIds: ['setup-A'] }),
        makeRec404(7, { payoffSetupIds: ['setup-B'] }),
        makeRec404(8),
      ];
      const res = await runB404(recs404a);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_PAYOFF_DECOUPLED'), 'REVELATION_PAYOFF_DECOUPLED should fire');
    });

    it('REVELATION_PAYOFF_DECOUPLED does NOT fire when a revelation shares a scene with a payoff', async () => {
      const recs404aNF = [
        makeRec404(0), makeRec404(1), makeRec404(2),
        makeRec404(3, { revelation: 'He was lying the whole time.', payoffSetupIds: ['setup-X'] }),
        makeRec404(4),
        makeRec404(5, { revelation: 'The letter was forged.' }),
        makeRec404(6, { payoffSetupIds: ['setup-Y'] }),
        makeRec404(7),
        makeRec404(8),
      ];
      const res = await runB404(recs404aNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_PAYOFF_DECOUPLED'), 'REVELATION_PAYOFF_DECOUPLED should not fire');
    });

    it('TOLD_BELIEF_SEED_DECOUPLED fires when assertion and seed scenes never share a scene', async () => {
      const recs404b = [
        makeRec404(0, { dialogueHighlights: ['CARL: The vault was never opened.'] }),
        makeRec404(1),
        makeRec404(2, { dialogueHighlights: ['ANA: He never left the country.'] }),
        makeRec404(3, { seededClueIds: ['clue-1'] }),
        makeRec404(4),
        makeRec404(5, { seededClueIds: ['clue-2'] }),
        makeRec404(6),
        makeRec404(7),
        makeRec404(8),
      ];
      const res = await runB404(recs404b);
      assert.ok(res.issues.some((i: any) => i.rule === 'TOLD_BELIEF_SEED_DECOUPLED'), 'TOLD_BELIEF_SEED_DECOUPLED should fire');
    });

    it('TOLD_BELIEF_SEED_DECOUPLED does NOT fire when an assertion scene also plants a clue', async () => {
      const recs404bNF = [
        makeRec404(0, { dialogueHighlights: ['CARL: The vault was never opened.'], seededClueIds: ['clue-1'] }),
        makeRec404(1),
        makeRec404(2, { dialogueHighlights: ['ANA: He never left the country.'] }),
        makeRec404(3, { seededClueIds: ['clue-2'] }),
        makeRec404(4),
        makeRec404(5),
        makeRec404(6),
        makeRec404(7),
        makeRec404(8),
      ];
      const res = await runB404(recs404bNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TOLD_BELIEF_SEED_DECOUPLED'), 'TOLD_BELIEF_SEED_DECOUPLED should not fire');
    });

    it('ASSERTION_ACT1_ONLY fires when all assertions are in the first 25% of scenes', async () => {
      // 12 scenes → act1End = floor(12*0.25) = 3 → scenes 0-2 are Act 1
      const recs404c = Array.from({ length: 12 }, (_, i) => makeRec404(i));
      recs404c[0] = makeRec404(0, { dialogueHighlights: ['LEE: The bridge was sabotaged.'] });
      recs404c[1] = makeRec404(1, { dialogueHighlights: ['MAY: No one survived that night.'] });
      recs404c[2] = makeRec404(2, { dialogueHighlights: ['LEE: The file was never declassified.'] });
      const res = await runB404(recs404c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ASSERTION_ACT1_ONLY'), 'ASSERTION_ACT1_ONLY should fire');
    });

    it('ASSERTION_ACT1_ONLY does NOT fire when assertions span beyond the first 25%', async () => {
      const recs404cNF = Array.from({ length: 10 }, (_, i) => makeRec404(i));
      recs404cNF[0] = makeRec404(0, { dialogueHighlights: ['LEE: The bridge was sabotaged.'] });
      recs404cNF[1] = makeRec404(1, { dialogueHighlights: ['MAY: No one survived that night.'] });
      recs404cNF[5] = makeRec404(5, { dialogueHighlights: ['LEE: The file was never declassified.'] });
      const res = await runB404(recs404cNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ASSERTION_ACT1_ONLY'), 'ASSERTION_ACT1_ONLY should not fire');
    });
  });


  describe('Wave 390 — beliefPass: revelation dramatic turn decoupled, told belief suspense peak absent, told belief curiosity peak absent', async () => {
    const makeRec390 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runB390 = async (records: any[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('REVELATION_DRAMATIC_TURN_DECOUPLED fires when revelations and turns never share a scene', async () => {
      // revelations at 2,4; turns at 1,3,5 — no overlap
      const recs390rt = Array.from({ length: 8 }, (_, i) =>
        makeRec390(i, {
          revelation: [2, 4].includes(i) ? 'the hidden truth' : null,
          dramaticTurn: [1, 3, 5].includes(i) ? 'reversal' : 'nothing',
        }),
      );
      const res = await runB390(recs390rt);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_DRAMATIC_TURN_DECOUPLED'), 'REVELATION_DRAMATIC_TURN_DECOUPLED should fire');
    });

    it('REVELATION_DRAMATIC_TURN_DECOUPLED does not fire when a revelation coincides with a turn', async () => {
      // scene 3 is both a revelation and a turn
      const recs390rtn = Array.from({ length: 8 }, (_, i) =>
        makeRec390(i, {
          revelation: [2, 3].includes(i) ? 'the hidden truth' : null,
          dramaticTurn: [1, 3, 5].includes(i) ? 'reversal' : 'nothing',
        }),
      );
      const res = await runB390(recs390rtn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_DRAMATIC_TURN_DECOUPLED'), 'REVELATION_DRAMATIC_TURN_DECOUPLED should not fire');
    });

    it('TOLD_BELIEF_SUSPENSE_PEAK_ABSENT fires when the peak-suspense scene has no assertion', async () => {
      // assertions at 1,4 with suspense>0; scene 6 has peak suspense (2.0), no assertion
      const recs390sp = Array.from({ length: 8 }, (_, i) =>
        makeRec390(i, {
          dialogueHighlights: [1, 4].includes(i) ? ['ALICE: the plan will hold'] : [],
          suspenseDelta: i === 6 ? 2.0 : [1, 4].includes(i) ? 0.8 : 0,
        }),
      );
      const res = await runB390(recs390sp);
      assert.ok(res.issues.some((i: any) => i.rule === 'TOLD_BELIEF_SUSPENSE_PEAK_ABSENT'), 'TOLD_BELIEF_SUSPENSE_PEAK_ABSENT should fire');
    });

    it('TOLD_BELIEF_SUSPENSE_PEAK_ABSENT does not fire when the peak-suspense scene carries an assertion', async () => {
      const recs390spn = Array.from({ length: 8 }, (_, i) =>
        makeRec390(i, {
          dialogueHighlights: [1, 4, 6].includes(i) ? ['ALICE: the plan will hold'] : [],
          suspenseDelta: i === 6 ? 2.0 : [1, 4].includes(i) ? 0.8 : 0,
        }),
      );
      const res = await runB390(recs390spn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TOLD_BELIEF_SUSPENSE_PEAK_ABSENT'), 'TOLD_BELIEF_SUSPENSE_PEAK_ABSENT should not fire');
    });

    it('TOLD_BELIEF_CURIOSITY_PEAK_ABSENT fires when the peak-curiosity scene has no assertion', async () => {
      const recs390cp = Array.from({ length: 8 }, (_, i) =>
        makeRec390(i, {
          dialogueHighlights: [1, 4].includes(i) ? ['ALICE: she is innocent'] : [],
          curiosityDelta: i === 6 ? 2.0 : [1, 4].includes(i) ? 0.8 : 0,
        }),
      );
      const res = await runB390(recs390cp);
      assert.ok(res.issues.some((i: any) => i.rule === 'TOLD_BELIEF_CURIOSITY_PEAK_ABSENT'), 'TOLD_BELIEF_CURIOSITY_PEAK_ABSENT should fire');
    });

    it('TOLD_BELIEF_CURIOSITY_PEAK_ABSENT does not fire when the peak-curiosity scene carries an assertion', async () => {
      const recs390cpn = Array.from({ length: 8 }, (_, i) =>
        makeRec390(i, {
          dialogueHighlights: [1, 4, 6].includes(i) ? ['ALICE: she is innocent'] : [],
          curiosityDelta: i === 6 ? 2.0 : [1, 4].includes(i) ? 0.8 : 0,
        }),
      );
      const res = await runB390(recs390cpn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TOLD_BELIEF_CURIOSITY_PEAK_ABSENT'), 'TOLD_BELIEF_CURIOSITY_PEAK_ABSENT should not fire');
    });
  });


  describe('Wave 376 — beliefPass: revelation suspense peak absent, told belief clock decoupled, assertion midpoint void', async () => {
    const makeRec376 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runB376 = async (records: any[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('REVELATION_SUSPENSE_PEAK_ABSENT fires when the peak-suspense scene has no revelation while 2+ suspense-positive scenes do', async () => {
      // scenes 1,4 have suspense + revelation; scene 6 has peak suspense (2.0), no revelation
      const recs376sp = Array.from({ length: 8 }, (_, i) =>
        makeRec376(i, {
          suspenseDelta: i === 6 ? 2.0 : i === 1 || i === 4 ? 0.8 : 0,
          revelation: [1, 4].includes(i) ? 'the hidden truth' : null,
        }),
      );
      const res = await runB376(recs376sp);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_SUSPENSE_PEAK_ABSENT'), 'REVELATION_SUSPENSE_PEAK_ABSENT should fire');
    });

    it('REVELATION_SUSPENSE_PEAK_ABSENT does not fire when the peak-suspense scene carries a revelation', async () => {
      const recs376spn = Array.from({ length: 8 }, (_, i) =>
        makeRec376(i, {
          suspenseDelta: i === 6 ? 2.0 : i === 1 || i === 4 ? 0.8 : 0,
          revelation: [1, 4, 6].includes(i) ? 'the hidden truth' : null,
        }),
      );
      const res = await runB376(recs376spn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_SUSPENSE_PEAK_ABSENT'), 'REVELATION_SUSPENSE_PEAK_ABSENT should not fire');
    });

    it('TOLD_BELIEF_CLOCK_DECOUPLED fires when no assertion scene raises a clock', async () => {
      // assertions at 1,3,5; clocks at 2,6 — no overlap
      const recs376cd = Array.from({ length: 8 }, (_, i) =>
        makeRec376(i, {
          dialogueHighlights: [1, 3, 5].includes(i) ? ['ALICE: the plan will work'] : [],
          clockRaised: [2, 6].includes(i),
        }),
      );
      const res = await runB376(recs376cd);
      assert.ok(res.issues.some((i: any) => i.rule === 'TOLD_BELIEF_CLOCK_DECOUPLED'), 'TOLD_BELIEF_CLOCK_DECOUPLED should fire');
    });

    it('TOLD_BELIEF_CLOCK_DECOUPLED does not fire when an assertion scene raises a clock', async () => {
      // scene 3 is both an assertion and a clock scene
      const recs376cdn = Array.from({ length: 8 }, (_, i) =>
        makeRec376(i, {
          dialogueHighlights: [1, 3, 5].includes(i) ? ['ALICE: the plan will work'] : [],
          clockRaised: [3, 6].includes(i),
        }),
      );
      const res = await runB376(recs376cdn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TOLD_BELIEF_CLOCK_DECOUPLED'), 'TOLD_BELIEF_CLOCK_DECOUPLED should not fire');
    });

    it('ASSERTION_MIDPOINT_VOID fires when the 40-60% zone has no assertion but assertions exist on both sides', async () => {
      // n=10 → mid zone [4,6); assertions at 1 (before) and 8 (after), none at 4 or 5
      const recs376mv = Array.from({ length: 10 }, (_, i) =>
        makeRec376(i, { dialogueHighlights: [1, 8].includes(i) ? ['ALICE: she is lying'] : [] }),
      );
      const res = await runB376(recs376mv);
      assert.ok(res.issues.some((i: any) => i.rule === 'ASSERTION_MIDPOINT_VOID'), 'ASSERTION_MIDPOINT_VOID should fire');
    });

    it('ASSERTION_MIDPOINT_VOID does not fire when an assertion lands in the midpoint zone', async () => {
      // assertion at scene 5 (within [4,6))
      const recs376mvn = Array.from({ length: 10 }, (_, i) =>
        makeRec376(i, { dialogueHighlights: [1, 5, 8].includes(i) ? ['ALICE: she is lying'] : [] }),
      );
      const res = await runB376(recs376mvn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ASSERTION_MIDPOINT_VOID'), 'ASSERTION_MIDPOINT_VOID should not fire');
    });
  });


  describe('Wave 362 — beliefPass: revelation clock decoupled, told belief Act 3 absent, revelation curiosity peak absent', async () => {
    const makeRec362 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runB362 = async (records: any[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('REVELATION_CLOCK_DECOUPLED fires when no revelation lands in a clock-raised scene', async () => {
      // revelations at 2,5; clockRaised at 3,6 — no overlap
      const recs362rcd = Array.from({ length: 8 }, (_, i) =>
        makeRec362(i, {
          revelation: [2, 5].includes(i) ? 'the truth about the contract' : null,
          clockRaised: [3, 6].includes(i),
        }),
      );
      const res = await runB362(recs362rcd);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_CLOCK_DECOUPLED'), 'REVELATION_CLOCK_DECOUPLED should fire');
    });

    it('REVELATION_CLOCK_DECOUPLED does not fire when a revelation lands in a clock-raised scene', async () => {
      // scene 3 has both revelation AND clockRaised
      const recs362rcdni = Array.from({ length: 8 }, (_, i) =>
        makeRec362(i, {
          revelation: [2, 3].includes(i) ? 'the truth about the contract' : null,
          clockRaised: [3, 6].includes(i),
        }),
      );
      const res = await runB362(recs362rcdni);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_CLOCK_DECOUPLED'), 'REVELATION_CLOCK_DECOUPLED should not fire');
    });

    it('TOLD_BELIEF_ACT3_ABSENT fires when assertions exist in Acts 1-2 but not in Act 3', async () => {
      // 12 scenes; Act 3 = 9-11; assertions at 1,3,5 only
      const recs362tba = Array.from({ length: 12 }, (_, i) =>
        makeRec362(i, {
          dialogueHighlights: [1, 3, 5].includes(i) ? ['ALICE: the plan will work'] : [],
        }),
      );
      const res = await runB362(recs362tba);
      assert.ok(res.issues.some((i: any) => i.rule === 'TOLD_BELIEF_ACT3_ABSENT'), 'TOLD_BELIEF_ACT3_ABSENT should fire');
    });

    it('TOLD_BELIEF_ACT3_ABSENT does not fire when Act 3 contains an assertion', async () => {
      // assertion at scene 10 (Act 3)
      const recs362tbani = Array.from({ length: 12 }, (_, i) =>
        makeRec362(i, {
          dialogueHighlights: [1, 3, 5, 10].includes(i) ? ['ALICE: the plan will work'] : [],
        }),
      );
      const res = await runB362(recs362tbani);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TOLD_BELIEF_ACT3_ABSENT'), 'TOLD_BELIEF_ACT3_ABSENT should not fire');
    });

    it('REVELATION_CURIOSITY_PEAK_ABSENT fires when peak-curiosity scene has no revelation while 2+ others do', async () => {
      // scenes 1 (curiosityDelta=0.8, revelation) and 4 (curiosityDelta=0.6, revelation)
      // scene 6 has peak curiosityDelta=2.0 but no revelation
      const recs362rcpa = Array.from({ length: 8 }, (_, i) =>
        makeRec362(i, {
          curiosityDelta: i === 6 ? 2.0 : i === 1 ? 0.8 : i === 4 ? 0.6 : 0,
          revelation: [1, 4].includes(i) ? 'the hidden truth' : null,
        }),
      );
      const res = await runB362(recs362rcpa);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_CURIOSITY_PEAK_ABSENT'), 'REVELATION_CURIOSITY_PEAK_ABSENT should fire');
    });

    it('REVELATION_CURIOSITY_PEAK_ABSENT does not fire when peak-curiosity scene carries a revelation', async () => {
      // scene 6 now also has a revelation
      const recs362rcpani = Array.from({ length: 8 }, (_, i) =>
        makeRec362(i, {
          curiosityDelta: i === 6 ? 2.0 : i === 1 ? 0.8 : i === 4 ? 0.6 : 0,
          revelation: [1, 4, 6].includes(i) ? 'the hidden truth' : null,
        }),
      );
      const res = await runB362(recs362rcpani);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_CURIOSITY_PEAK_ABSENT'), 'REVELATION_CURIOSITY_PEAK_ABSENT should not fire');
    });
  });


  describe('Wave 348 — beliefPass: revelation/assertion disconnect, revelation midpoint void, told belief dramatic turn decoupled', async () => {
    const makeRec348 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 1,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runB348 = async (records: any[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('REVELATION_ASSERTION_DISCONNECT fires when no revelation follows a prior assertion', async () => {
      // assertions at scenes 0,1; revelations at scenes 7,8 — none within 2 scenes of an assertion
      const recs348ad = Array.from({ length: 10 }, (_, i) =>
        makeRec348(i, {
          dialogueHighlights: [0, 1].includes(i) ? ['ALICE: the bridge will hold'] : [],
          revelation: [7, 8].includes(i) ? 'The bridge was rigged to collapse' : null,
        })
      );
      const res = await runB348(recs348ad);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_ASSERTION_DISCONNECT'), 'REVELATION_ASSERTION_DISCONNECT should fire');
    });

    it('REVELATION_ASSERTION_DISCONNECT does not fire when a revelation follows an assertion', async () => {
      // assertion at scene 6; revelation at scene 7 (within 2 scenes) — engine engaged
      const recs348adn = Array.from({ length: 10 }, (_, i) =>
        makeRec348(i, {
          dialogueHighlights: [0, 6].includes(i) ? ['ALICE: the bridge will hold'] : [],
          revelation: [7, 8].includes(i) ? 'The bridge was rigged to collapse' : null,
        })
      );
      const res = await runB348(recs348adn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_ASSERTION_DISCONNECT'), 'REVELATION_ASSERTION_DISCONNECT should not fire');
    });

    it('REVELATION_MIDPOINT_VOID fires when the midpoint carries no revelation', async () => {
      // n=10 → midpoint = scenes 4,5; revelations at scenes 1,8 only
      const recs348mv = Array.from({ length: 10 }, (_, i) =>
        makeRec348(i, { revelation: [1, 8].includes(i) ? 'A secret surfaces' : null })
      );
      const res = await runB348(recs348mv);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_MIDPOINT_VOID'), 'REVELATION_MIDPOINT_VOID should fire');
    });

    it('REVELATION_MIDPOINT_VOID does not fire when a revelation lands at the midpoint', async () => {
      const recs348mvn = Array.from({ length: 10 }, (_, i) =>
        makeRec348(i, { revelation: [4, 8].includes(i) ? 'A secret surfaces' : null })
      );
      const res = await runB348(recs348mvn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_MIDPOINT_VOID'), 'REVELATION_MIDPOINT_VOID should not fire');
    });

    it('TOLD_BELIEF_DRAMATIC_TURN_DECOUPLED fires when no assertion scene carries a dramatic turn', async () => {
      const recs348dt = Array.from({ length: 10 }, (_, i) =>
        makeRec348(i, {
          dialogueHighlights: [1, 3, 5].includes(i) ? ['ALICE: we can still win this'] : [],
          dramaticTurn: 'nothing',
        })
      );
      const res = await runB348(recs348dt);
      assert.ok(res.issues.some((i: any) => i.rule === 'TOLD_BELIEF_DRAMATIC_TURN_DECOUPLED'), 'TOLD_BELIEF_DRAMATIC_TURN_DECOUPLED should fire');
    });

    it('TOLD_BELIEF_DRAMATIC_TURN_DECOUPLED does not fire when an assertion scene carries a turn', async () => {
      const recs348dtn = Array.from({ length: 10 }, (_, i) =>
        makeRec348(i, {
          dialogueHighlights: [1, 3, 5].includes(i) ? ['ALICE: we can still win this'] : [],
          dramaticTurn: i === 3 ? 'reversal' : 'nothing',
        })
      );
      const res = await runB348(recs348dtn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TOLD_BELIEF_DRAMATIC_TURN_DECOUPLED'), 'TOLD_BELIEF_DRAMATIC_TURN_DECOUPLED should not fire');
    });
  });


  describe('Wave 334 — beliefPass: told belief suspense decoupled, told belief emotional flatline, revelation relationship decoupled', async () => {
    const makeRec334 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 1,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runB334 = async (records: any[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('TOLD_BELIEF_SUSPENSE_DECOUPLED fires when assertion scenes have avg suspenseDelta ≤ 0', async () => {
      const recs334sd = Array.from({ length: 8 }, (_, i) =>
        makeRec334(i, {
          dialogueHighlights: [1, 3, 5].includes(i) ? ['ALICE: the truth will come out'] : [],
          suspenseDelta: 0,
          curiosityDelta: 2,
        })
      );
      const res = await runB334(recs334sd);
      assert.ok(res.issues.some((i: any) => i.rule === 'TOLD_BELIEF_SUSPENSE_DECOUPLED'), 'TOLD_BELIEF_SUSPENSE_DECOUPLED should fire');
    });

    it('TOLD_BELIEF_SUSPENSE_DECOUPLED does not fire when assertion scenes raise suspense', async () => {
      const recs334nsd = Array.from({ length: 8 }, (_, i) =>
        makeRec334(i, {
          dialogueHighlights: [1, 3, 5].includes(i) ? ['ALICE: the truth will come out'] : [],
          suspenseDelta: [1, 3, 5].includes(i) ? 1.5 : 0,
          curiosityDelta: 2,
        })
      );
      const res = await runB334(recs334nsd);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TOLD_BELIEF_SUSPENSE_DECOUPLED'), 'TOLD_BELIEF_SUSPENSE_DECOUPLED should not fire');
    });

    it('TOLD_BELIEF_EMOTIONAL_FLATLINE fires when all assertion scenes are emotionally neutral', async () => {
      const recs334ef = Array.from({ length: 8 }, (_, i) =>
        makeRec334(i, {
          dialogueHighlights: [1, 3, 5].includes(i) ? ['ALICE: the truth will come out'] : [],
          emotionalShift: 'neutral',
          suspenseDelta: 1.5,
          curiosityDelta: 2,
        })
      );
      const res = await runB334(recs334ef);
      assert.ok(res.issues.some((i: any) => i.rule === 'TOLD_BELIEF_EMOTIONAL_FLATLINE'), 'TOLD_BELIEF_EMOTIONAL_FLATLINE should fire');
    });

    it('TOLD_BELIEF_EMOTIONAL_FLATLINE does not fire when an assertion scene carries emotional charge', async () => {
      const recs334nef = Array.from({ length: 8 }, (_, i) =>
        makeRec334(i, {
          dialogueHighlights: [1, 3, 5].includes(i) ? ['ALICE: the truth will come out'] : [],
          emotionalShift: i === 3 ? 'positive' : 'neutral',
          suspenseDelta: 1.5,
          curiosityDelta: 2,
        })
      );
      const res = await runB334(recs334nef);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TOLD_BELIEF_EMOTIONAL_FLATLINE'), 'TOLD_BELIEF_EMOTIONAL_FLATLINE should not fire');
    });

    it('REVELATION_RELATIONSHIP_DECOUPLED fires when no revelation scene moves a bond', async () => {
      const recs334rr = Array.from({ length: 8 }, (_, i) =>
        makeRec334(i, {
          revelation: [2, 5].includes(i) ? `disclosure ${i}` : null,
          suspenseDelta: 1.5,
          curiosityDelta: 2,
          relationshipShifts: [],
        })
      );
      const res = await runB334(recs334rr);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_RELATIONSHIP_DECOUPLED'), 'REVELATION_RELATIONSHIP_DECOUPLED should fire');
    });

    it('REVELATION_RELATIONSHIP_DECOUPLED does not fire when a revelation scene moves a bond', async () => {
      const recs334nrr = Array.from({ length: 8 }, (_, i) =>
        makeRec334(i, {
          revelation: [2, 5].includes(i) ? `disclosure ${i}` : null,
          suspenseDelta: 1.5,
          curiosityDelta: 2,
          relationshipShifts: i === 2 ? [{ pairKey: 'A|B', dimension: 'trust', amount: -1.5 }] : [],
        })
      );
      const res = await runB334(recs334nrr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_RELATIONSHIP_DECOUPLED'), 'REVELATION_RELATIONSHIP_DECOUPLED should not fire');
    });
  });


  describe('Wave 323 — beliefPass: revelation curiosity decoupled, told belief curiosity flat, told belief relationship decoupled', async () => {
    const makeRec323 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runB323 = async (records: any[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('REVELATION_CURIOSITY_DECOUPLED fires when revelation scenes have avg curiosityDelta ≤ 0', async () => {
      const recs323rc = Array.from({ length: 8 }, (_, i) =>
        makeRec323(i, {
          revelation: [2, 4, 6].includes(i) ? `disclosure ${i}` : null,
          curiosityDelta: 0,
        })
      );
      const res = await runB323(recs323rc);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_CURIOSITY_DECOUPLED'), 'REVELATION_CURIOSITY_DECOUPLED should fire');
    });

    it('REVELATION_CURIOSITY_DECOUPLED does not fire when revelations raise curiosity', async () => {
      const recs323nrc = Array.from({ length: 8 }, (_, i) =>
        makeRec323(i, {
          revelation: [2, 4, 6].includes(i) ? `disclosure ${i}` : null,
          curiosityDelta: [2, 4, 6].includes(i) ? 2 : 0,
        })
      );
      const res = await runB323(recs323nrc);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_CURIOSITY_DECOUPLED'), 'REVELATION_CURIOSITY_DECOUPLED should not fire');
    });

    it('TOLD_BELIEF_CURIOSITY_FLAT fires when assertion scenes have avg curiosityDelta ≤ 0', async () => {
      const recs323tc = Array.from({ length: 8 }, (_, i) =>
        makeRec323(i, {
          dialogueHighlights: [1, 3, 5].includes(i) ? [`ALICE: she lied to me`] : [],
          curiosityDelta: 0,
        })
      );
      const res = await runB323(recs323tc);
      assert.ok(res.issues.some((i: any) => i.rule === 'TOLD_BELIEF_CURIOSITY_FLAT'), 'TOLD_BELIEF_CURIOSITY_FLAT should fire');
    });

    it('TOLD_BELIEF_CURIOSITY_FLAT does not fire when assertions raise curiosity', async () => {
      const recs323ntc = Array.from({ length: 8 }, (_, i) =>
        makeRec323(i, {
          dialogueHighlights: [1, 3, 5].includes(i) ? [`ALICE: she lied to me`] : [],
          curiosityDelta: [1, 3, 5].includes(i) ? 2 : 0,
        })
      );
      const res = await runB323(recs323ntc);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TOLD_BELIEF_CURIOSITY_FLAT'), 'TOLD_BELIEF_CURIOSITY_FLAT should not fire');
    });

    it('TOLD_BELIEF_RELATIONSHIP_DECOUPLED fires when no assertion scene moves a bond', async () => {
      const recs323rd = Array.from({ length: 8 }, (_, i) =>
        makeRec323(i, {
          dialogueHighlights: [1, 3, 5].includes(i) ? [`ALICE: she lied to me`] : [],
          curiosityDelta: 2,
          relationshipShifts: [],
        })
      );
      const res = await runB323(recs323rd);
      assert.ok(res.issues.some((i: any) => i.rule === 'TOLD_BELIEF_RELATIONSHIP_DECOUPLED'), 'TOLD_BELIEF_RELATIONSHIP_DECOUPLED should fire');
    });

    it('TOLD_BELIEF_RELATIONSHIP_DECOUPLED does not fire when an assertion scene shifts a relationship', async () => {
      const recs323nrd = Array.from({ length: 8 }, (_, i) =>
        makeRec323(i, {
          dialogueHighlights: [1, 3, 5].includes(i) ? [`ALICE: she lied to me`] : [],
          curiosityDelta: 2,
          relationshipShifts: i === 3 ? [{ pairKey: 'A|B', dimension: 'trust', amount: -0.5 }] : [],
        })
      );
      const res = await runB323(recs323nrd);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TOLD_BELIEF_RELATIONSHIP_DECOUPLED'), 'TOLD_BELIEF_RELATIONSHIP_DECOUPLED should not fire');
    });
  });


  describe('Wave 295 — beliefPass: revelation suspense decoupled, revelation density drop, belief opening inert', async () => {
    const makeRec295 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runB295 = async (records: any[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('REVELATION_SUSPENSE_DECOUPLED fires when 3+ revelation scenes avg suspenseDelta ≤ 0', async () => {
      const recs295rsd = Array.from({ length: 10 }, (_, i) =>
        makeRec295(i, {
          revelation: i >= 4 && i <= 6 ? `reveal-${i}` : null,
          suspenseDelta: i >= 4 && i <= 6 ? -0.5 : 1,
        })
      );
      const res = await runB295(recs295rsd);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_SUSPENSE_DECOUPLED'), 'REVELATION_SUSPENSE_DECOUPLED should fire');
    });

    it('REVELATION_SUSPENSE_DECOUPLED does not fire when revelation scenes have positive avg suspenseDelta', async () => {
      const recs295nrsd = Array.from({ length: 10 }, (_, i) =>
        makeRec295(i, {
          revelation: i >= 4 && i <= 6 ? `reveal-${i}` : null,
          suspenseDelta: 1.5,
        })
      );
      const res = await runB295(recs295nrsd);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_SUSPENSE_DECOUPLED'), 'REVELATION_SUSPENSE_DECOUPLED should not fire');
    });

    it('REVELATION_DENSITY_DROP fires when first half has >2× more revelations than second half', async () => {
      // 10 scenes: revelations at 0,1,2 (first half has 3), revelation at 9 (second half has 1)
      // 3 > 1 * 2 → 1 < 3 * 0.5 = 1.5 → 1 < 1.5 ✓
      const recs295rdd = Array.from({ length: 10 }, (_, i) =>
        makeRec295(i, { revelation: i <= 2 || i === 9 ? `reveal-${i}` : null })
      );
      const res = await runB295(recs295rdd);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_DENSITY_DROP'), 'REVELATION_DENSITY_DROP should fire');
    });

    it('REVELATION_DENSITY_DROP does not fire when second half has comparable revelations', async () => {
      // revelations spread evenly: 1,3 in first half; 7,9 in second half
      const recs295nrdd = Array.from({ length: 10 }, (_, i) =>
        makeRec295(i, { revelation: [1, 3, 7, 9].includes(i) ? `reveal-${i}` : null })
      );
      const res = await runB295(recs295nrdd);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_DENSITY_DROP'), 'REVELATION_DENSITY_DROP should not fire');
    });

    it('BELIEF_OPENING_INERT fires when opening 25% has no belief content but rest does', async () => {
      // 8 scenes: opening (0-1) has nothing; scene 4 has a revelation
      const recs295boi = Array.from({ length: 8 }, (_, i) =>
        makeRec295(i, { revelation: i === 4 ? 'the truth emerges' : null })
      );
      const res = await runB295(recs295boi);
      assert.ok(res.issues.some((i: any) => i.rule === 'BELIEF_OPENING_INERT'), 'BELIEF_OPENING_INERT should fire');
    });

    it('BELIEF_OPENING_INERT does not fire when opening has belief content', async () => {
      // scene 0 has a dialogueHighlight (told belief) — opening is not inert
      const recs295nboi = Array.from({ length: 8 }, (_, i) =>
        makeRec295(i, {
          dialogueHighlights: i === 0 ? ['ALICE: I know the truth about this'] : [],
          revelation: i === 5 ? 'truth confirmed' : null,
        })
      );
      const res = await runB295(recs295nboi);
      assert.ok(!res.issues.some((i: any) => i.rule === 'BELIEF_OPENING_INERT'), 'BELIEF_OPENING_INERT should not fire');
    });
  });


  describe('Wave 281 — beliefPass: revelation drama vacuum, Act 2b void, told belief final scene', async () => {
    const makeRec281 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runB281 = async (records: any[]) => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      return beliefPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('REVELATION_DRAMA_VACUUM fires when all revelations are in emotionally flat scenes', async () => {
      const recs281a = [
        makeRec281(0, { dialogueHighlights: ['alice: something happened here'] }),
        makeRec281(1, { revelation: 'the key was hidden in the drawer' }), // flat: neutral, suspense=0
        makeRec281(2),
        makeRec281(3),
        makeRec281(4, { revelation: 'the letter was never sent' }), // flat: neutral, suspense=0
        makeRec281(5),
        makeRec281(6),
        makeRec281(7),
      ];
      const result281a = await runB281(recs281a);
      const fired281a = result281a.issues.filter((i: any) => i.rule === 'REVELATION_DRAMA_VACUUM');
      assert.strictEqual(fired281a.length, 1, 'Should fire REVELATION_DRAMA_VACUUM when all revelations are in flat scenes');
    });

    it('REVELATION_DRAMA_VACUUM does NOT fire when a revelation is in a high-suspense scene', async () => {
      const recs281b = [
        makeRec281(0, { dialogueHighlights: ['alice: something happened here'] }),
        makeRec281(1, { revelation: 'the key was hidden', suspenseDelta: 2 }), // high suspense
        makeRec281(2),
        makeRec281(3),
        makeRec281(4, { revelation: 'the letter was never sent' }), // flat
        makeRec281(5),
        makeRec281(6),
        makeRec281(7),
      ];
      const result281b = await runB281(recs281b);
      const fired281b = result281b.issues.filter((i: any) => i.rule === 'REVELATION_DRAMA_VACUUM');
      assert.strictEqual(fired281b.length, 0, 'Should NOT fire REVELATION_DRAMA_VACUUM when a revelation is in a dramatic scene');
    });

    it('BELIEF_ACT2B_VOID fires when Act 2b has no told beliefs or revelations', async () => {
      // n=8: Act 2b = scenes[4..5] (floor(8*0.5)=4, floor(8*0.75)=6)
      const recs281c = [
        makeRec281(0, { dialogueHighlights: ['alice: trust is everything'] }), // Act 1 belief
        makeRec281(1, { revelation: 'alice lied' }),                            // Act 1 revelation
        makeRec281(2, { dialogueHighlights: ['bob: she deceived us all'] }),    // Act 2a belief
        makeRec281(3, { revelation: 'the plan was fake' }),                     // Act 2a revelation
        makeRec281(4),  // Act 2b — empty
        makeRec281(5),  // Act 2b — empty
        makeRec281(6, { dialogueHighlights: ['carol: we have to go'] }),        // Act 3 belief
        makeRec281(7, { revelation: 'the exit was clear' }),                    // Act 3 revelation
      ];
      const result281c = await runB281(recs281c);
      const fired281c = result281c.issues.filter((i: any) => i.rule === 'BELIEF_ACT2B_VOID');
      assert.strictEqual(fired281c.length, 1, 'Should fire BELIEF_ACT2B_VOID when Act 2b is informationally inert');
    });

    it('BELIEF_ACT2B_VOID does NOT fire when Act 2b contains a revelation', async () => {
      // n=8: Act 2b = scenes[4..5]
      const recs281d = [
        makeRec281(0, { dialogueHighlights: ['alice: trust is everything'] }),
        makeRec281(1, { revelation: 'alice lied' }),
        makeRec281(2, { dialogueHighlights: ['bob: she deceived us all'] }),
        makeRec281(3),
        makeRec281(4),
        makeRec281(5, { revelation: 'the plan was revealed in Act 2b' }), // Act 2b revelation
        makeRec281(6, { dialogueHighlights: ['carol: we have to go'] }),
        makeRec281(7),
      ];
      const result281d = await runB281(recs281d);
      const fired281d = result281d.issues.filter((i: any) => i.rule === 'BELIEF_ACT2B_VOID');
      assert.strictEqual(fired281d.length, 0, 'Should NOT fire BELIEF_ACT2B_VOID when Act 2b has a revelation');
    });

    it('TOLD_BELIEF_FINAL_SCENE fires when final scene has an unresolved told belief', async () => {
      const recs281e = [
        makeRec281(0, { revelation: 'the door was unlocked' }),
        makeRec281(1, { dialogueHighlights: ['alice: we were never safe'] }),
        makeRec281(2),
        makeRec281(3),
        makeRec281(4, { dialogueHighlights: ['bob: everything will be fine now'] }), // final scene: told belief, no revelation
      ];
      const result281e = await runB281(recs281e);
      const fired281e = result281e.issues.filter((i: any) => i.rule === 'TOLD_BELIEF_FINAL_SCENE');
      assert.strictEqual(fired281e.length, 1, 'Should fire TOLD_BELIEF_FINAL_SCENE when the last scene ends on an assertion');
    });

    it('TOLD_BELIEF_FINAL_SCENE does NOT fire when final scene also has a revelation', async () => {
      const recs281f = [
        makeRec281(0, { revelation: 'the door was unlocked' }),
        makeRec281(1, { dialogueHighlights: ['alice: we were never safe'] }),
        makeRec281(2),
        makeRec281(3),
        makeRec281(4, {
          dialogueHighlights: ['bob: everything will be fine now'],
          revelation: 'they escaped at last', // revelation closes the scene
        }),
      ];
      const result281f = await runB281(recs281f);
      const fired281f = result281f.issues.filter((i: any) => i.rule === 'TOLD_BELIEF_FINAL_SCENE');
      assert.strictEqual(fired281f.length, 0, 'Should NOT fire TOLD_BELIEF_FINAL_SCENE when the final scene has a revelation');
    });
  });


  describe('Wave 267 — beliefPass: belief front loaded, revelation final act only, told belief clustering', async () => {
    const makeRec267 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput267 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: '...',
      records: records as any, structure: {} as any,
      storyContext: {} as any, annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('BELIEF_FRONT_LOADED fires when all told beliefs cluster in the first half only', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 8 scenes; midpoint = 4; 4 told beliefs only in scenes 0-3, none in 4-7
      const records267a = [
        makeRec267(0, { dialogueHighlights: ['alice: the vault was looted before the heist began'] }),
        makeRec267(1, { dialogueHighlights: ['bob: marcus planned the theft from the very beginning'] }),
        makeRec267(2, { dialogueHighlights: ['carol: the police were bribed to ignore all the alarms'] }),
        makeRec267(3, { dialogueHighlights: ['dave: the documents were forged several months earlier'] }),
        makeRec267(4), makeRec267(5), makeRec267(6), makeRec267(7),
      ];
      const result267a = await beliefPass(makeInput267(records267a));
      const fl = result267a.issues.filter((i: any) => i.rule === 'BELIEF_FRONT_LOADED');
      assert.ok(fl.length >= 1, `Should detect BELIEF_FRONT_LOADED, got: ${JSON.stringify(result267a.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(fl[0].severity, 'minor');
    });

    it('BELIEF_FRONT_LOADED does NOT fire when a told belief appears in the second half', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 8 scenes; told beliefs at scenes 0, 1, 2, 5 — scene 5 is in the second half (>=4)
      const records267b = [
        makeRec267(0, { dialogueHighlights: ['alice: the vault was looted before the heist began'] }),
        makeRec267(1, { dialogueHighlights: ['bob: marcus planned the theft from the very beginning'] }),
        makeRec267(2, { dialogueHighlights: ['carol: the police were bribed to ignore all the alarms'] }),
        makeRec267(3), makeRec267(4),
        makeRec267(5, { dialogueHighlights: ['dave: the documents were forged several months earlier'] }),
        makeRec267(6), makeRec267(7),
      ];
      const result267b = await beliefPass(makeInput267(records267b));
      const fl = result267b.issues.filter((i: any) => i.rule === 'BELIEF_FRONT_LOADED');
      assert.strictEqual(fl.length, 0, 'Should NOT fire when a told belief appears in the second half');
    });

    it('REVELATION_FINAL_ACT_ONLY fires when all revelations are confined to the final quarter', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 8 scenes; finalActStart = floor(8*0.75)=6; revelations only at scenes 6 and 7
      const records267c = [
        makeRec267(0), makeRec267(1), makeRec267(2), makeRec267(3),
        makeRec267(4), makeRec267(5),
        makeRec267(6, { revelation: 'the witness had been lying about the alibi all along' }),
        makeRec267(7, { revelation: 'the detective was the actual suspect from the start' }),
      ];
      const result267c = await beliefPass(makeInput267(records267c));
      const rfo = result267c.issues.filter((i: any) => i.rule === 'REVELATION_FINAL_ACT_ONLY');
      assert.ok(rfo.length >= 1, `Should detect REVELATION_FINAL_ACT_ONLY, got: ${JSON.stringify(result267c.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(rfo[0].severity, 'minor');
    });

    it('REVELATION_FINAL_ACT_ONLY does NOT fire when a revelation appears before the final quarter', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 8 scenes; revelations at scenes 3 and 7 — scene 3 is before finalActStart (6)
      const records267d = [
        makeRec267(0), makeRec267(1), makeRec267(2),
        makeRec267(3, { revelation: 'the witness had been lying about the alibi all along' }),
        makeRec267(4), makeRec267(5), makeRec267(6),
        makeRec267(7, { revelation: 'the detective was the actual suspect from the start' }),
      ];
      const result267d = await beliefPass(makeInput267(records267d));
      const rfo = result267d.issues.filter((i: any) => i.rule === 'REVELATION_FINAL_ACT_ONLY');
      assert.strictEqual(rfo.length, 0, 'Should NOT fire when a revelation appears before the final quarter');
    });

    it('TOLD_BELIEF_CLUSTERING fires when a single scene contains 3 told beliefs', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 6 scenes; scene 2 has 3 told beliefs — triggers the 3-assertion cluster
      const records267e = [
        makeRec267(0), makeRec267(1),
        makeRec267(2, { dialogueHighlights: [
          'alice: the safe was completely empty when we arrived',
          'bob: the guard had been paid to look the other way',
          'carol: the documents were forged before the initial meeting',
        ]}),
        makeRec267(3), makeRec267(4), makeRec267(5),
      ];
      const result267e = await beliefPass(makeInput267(records267e));
      const tbc = result267e.issues.filter((i: any) => i.rule === 'TOLD_BELIEF_CLUSTERING');
      assert.ok(tbc.length >= 1, `Should detect TOLD_BELIEF_CLUSTERING, got: ${JSON.stringify(result267e.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(tbc[0].severity, 'minor');
    });

    it('TOLD_BELIEF_CLUSTERING does NOT fire when no scene has 3+ told beliefs', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 6 scenes; told beliefs spread one per scene across scenes 0-3
      const records267f = [
        makeRec267(0, { dialogueHighlights: ['alice: the safe was completely empty when we arrived'] }),
        makeRec267(1, { dialogueHighlights: ['bob: the guard had been paid to look the other way'] }),
        makeRec267(2, { dialogueHighlights: ['carol: the documents were forged before the initial meeting'] }),
        makeRec267(3, { dialogueHighlights: ['dave: the alibi was planted by the detective himself'] }),
        makeRec267(4), makeRec267(5),
      ];
      const result267f = await beliefPass(makeInput267(records267f));
      const tbc = result267f.issues.filter((i: any) => i.rule === 'TOLD_BELIEF_CLUSTERING');
      assert.strictEqual(tbc.length, 0, 'Should NOT fire when no scene has 3+ told beliefs');
    });
  });


  describe('Wave 253 — beliefPass: revelation Act 2a desert, belief echo chamber, adjacent deception payoff', async () => {
    const makeRec253 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput253 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: '...',
      records: records as any, structure: {} as any,
      storyContext: {} as any, annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('REVELATION_ACT2A_DESERT fires when no revelation lands in Act 2a despite 3+ revelations overall', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 12 scenes; act2a = floor(12*0.25)=3 .. floor(12*0.5)=6 (scenes 3,4,5)
      // revelations at scenes 1, 2, 9 — none in 3..5 → fires
      const records253a = [
        makeRec253(0), makeRec253(1, { revelation: 'the vault was already empty that morning' }),
        makeRec253(2, { revelation: 'the guard had been paid to look away' }),
        makeRec253(3), makeRec253(4), makeRec253(5), makeRec253(6), makeRec253(7), makeRec253(8),
        makeRec253(9, { revelation: 'the manager planned the whole robbery himself' }),
        makeRec253(10), makeRec253(11),
      ];
      const result253a = await beliefPass(makeInput253(records253a));
      const desert = result253a.issues.filter((i: any) => i.rule === 'REVELATION_ACT2A_DESERT');
      assert.ok(desert.length >= 1, `Should detect REVELATION_ACT2A_DESERT, got: ${JSON.stringify(result253a.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(desert[0].severity, 'minor');
    });

    it('REVELATION_ACT2A_DESERT does NOT fire when a revelation lands in Act 2a', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 12 scenes; revelations at 1, 4, 9 — scene 4 is in act2a (3..5) → no fire
      const records253b = [
        makeRec253(0), makeRec253(1, { revelation: 'the vault was already empty that morning' }),
        makeRec253(2), makeRec253(3),
        makeRec253(4, { revelation: 'the guard had been paid to look away' }),
        makeRec253(5), makeRec253(6), makeRec253(7), makeRec253(8),
        makeRec253(9, { revelation: 'the manager planned the whole robbery himself' }),
        makeRec253(10), makeRec253(11),
      ];
      const result253b = await beliefPass(makeInput253(records253b));
      const desert = result253b.issues.filter((i: any) => i.rule === 'REVELATION_ACT2A_DESERT');
      assert.strictEqual(desert.length, 0, 'Should NOT fire when a revelation lands in Act 2a');
    });

    it('BELIEF_ECHO_CHAMBER fires when the same unverified proposition is asserted across 3+ scenes', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 6 scenes; same proposition ("vault robbery night") asserted at 0, 2, 4; never witnessed
      const records253c = [
        makeRec253(0, { dialogueHighlights: ['alice: vault robbery happened that night clearly'] }),
        makeRec253(1),
        makeRec253(2, { dialogueHighlights: ['bob: vault robbery occurred late that night'] }),
        makeRec253(3),
        makeRec253(4, { dialogueHighlights: ['carol: vault robbery took place that night again'] }),
        makeRec253(5),
      ];
      const result253c = await beliefPass(makeInput253(records253c));
      const echo = result253c.issues.filter((i: any) => i.rule === 'BELIEF_ECHO_CHAMBER');
      assert.ok(echo.length >= 1, `Should detect BELIEF_ECHO_CHAMBER, got: ${JSON.stringify(result253c.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(echo[0].severity, 'minor');
    });

    it('BELIEF_ECHO_CHAMBER does NOT fire when assertions carry distinct vocabulary', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 6 scenes; 3 told beliefs but each distinct — no cluster of 3 sharing 2+ words
      const records253d = [
        makeRec253(0, { dialogueHighlights: ['alice: chamber stood entirely empty beforehand'] }),
        makeRec253(1),
        makeRec253(2, { dialogueHighlights: ['bob: guard departed station before midnight'] }),
        makeRec253(3),
        makeRec253(4, { dialogueHighlights: ['carol: manager understood scheme thoroughly already'] }),
        makeRec253(5),
      ];
      const result253d = await beliefPass(makeInput253(records253d));
      const echo = result253d.issues.filter((i: any) => i.rule === 'BELIEF_ECHO_CHAMBER');
      assert.strictEqual(echo.length, 0, 'Should NOT fire when assertions carry distinct vocabulary');
    });

    it('ADJACENT_DECEPTION_PAYOFF fires when a told belief is contradicted in the very next scene', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 6 scenes; told at scene 2, contradicting revelation at scene 3 (gap 1)
      const records253e = [
        makeRec253(0), makeRec253(1),
        makeRec253(2, { dialogueHighlights: ['alice: the witness fabricated entire alibi story'] }),
        makeRec253(3, { revelation: 'witness fabricated alibi to protect real killer' }),
        makeRec253(4), makeRec253(5),
      ];
      const result253e = await beliefPass(makeInput253(records253e));
      const adj = result253e.issues.filter((i: any) => i.rule === 'ADJACENT_DECEPTION_PAYOFF');
      assert.ok(adj.length >= 1, `Should detect ADJACENT_DECEPTION_PAYOFF, got: ${JSON.stringify(result253e.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(adj[0].severity, 'minor');
    });

    it('ADJACENT_DECEPTION_PAYOFF does NOT fire when setup and revelation are spaced apart', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 6 scenes; told at scene 1, contradicting revelation at scene 4 (gap 3) → not adjacent
      const records253f = [
        makeRec253(0),
        makeRec253(1, { dialogueHighlights: ['alice: the witness fabricated entire alibi story'] }),
        makeRec253(2), makeRec253(3),
        makeRec253(4, { revelation: 'witness fabricated alibi to protect real killer' }),
        makeRec253(5),
      ];
      const result253f = await beliefPass(makeInput253(records253f));
      const adj = result253f.issues.filter((i: any) => i.rule === 'ADJACENT_DECEPTION_PAYOFF');
      assert.strictEqual(adj.length, 0, 'Should NOT fire when setup and revelation are spaced apart');
    });
  });


  describe('Wave 239 — beliefPass: told-belief Act 3 surge, revelation-belief propagation absent, sole asserter', async () => {
    const makeRec239 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput239 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: '...',
      records: records as any, structure: {} as any,
      storyContext: {} as any, annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('TOLD_BELIEF_ACT3_SURGE fires when 3+ told beliefs land in Act 3 and exceed 40% of total', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 12 scenes; act3Start = floor(12*0.75)=9; told beliefs: 2 early + 4 in Act 3 (scenes 9,10,11,9)
      // act3 count = 4, total = 6 → 66% > 40% and count >= 3 → fires
      const records239a = [
        makeRec239(0, { dialogueHighlights: ['alice: the witness lied about everything here'] }),
        makeRec239(1),
        makeRec239(2, { dialogueHighlights: ['bob: evidence points away from real suspect'] }),
        makeRec239(3), makeRec239(4), makeRec239(5), makeRec239(6), makeRec239(7), makeRec239(8),
        makeRec239(9, { dialogueHighlights: ['alice: detective knows about hidden documents now'] }),
        makeRec239(10, { dialogueHighlights: ['bob: the judge was bribed before trial began'] }),
        makeRec239(11, { dialogueHighlights: ['alice: informant turned sides against everyone involved', 'carol: money trail leads back to prosecutor office'] }),
      ];
      const result239a = await beliefPass(makeInput239(records239a));
      const surge = result239a.issues.filter(i => i.rule === 'TOLD_BELIEF_ACT3_SURGE');
      assert.ok(surge.length >= 1, 'Should detect TOLD_BELIEF_ACT3_SURGE when Act 3 holds 40%+ of all told beliefs');
      assert.strictEqual(surge[0].severity, 'minor');
    });

    it('TOLD_BELIEF_ACT3_SURGE does NOT fire when told beliefs are distributed evenly', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 12 scenes; told beliefs in scenes 0,2,4,6,8,10 → act3 (≥9): scene 10 only → 1/6 = 16% < 40%
      const records239b = [
        makeRec239(0, { dialogueHighlights: ['alice: vault was empty before robbery night'] }),
        makeRec239(1),
        makeRec239(2, { dialogueHighlights: ['bob: guard left post early that evening'] }),
        makeRec239(3),
        makeRec239(4, { dialogueHighlights: ['alice: insider had access codes already'] }),
        makeRec239(5),
        makeRec239(6, { dialogueHighlights: ['carol: alarm was disabled remotely overnight'] }),
        makeRec239(7),
        makeRec239(8, { dialogueHighlights: ['bob: security tapes were wiped before morning'] }),
        makeRec239(9),
        makeRec239(10, { dialogueHighlights: ['alice: manager knew about plan all along'] }),
        makeRec239(11),
      ];
      const result239b = await beliefPass(makeInput239(records239b));
      const surge = result239b.issues.filter(i => i.rule === 'TOLD_BELIEF_ACT3_SURGE');
      assert.strictEqual(surge.length, 0, 'Should NOT fire when told beliefs are distributed across all acts');
    });

    it('REVELATION_BELIEF_PROPAGATION_ABSENT fires when no revelation triggers subsequent told beliefs', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 10 scenes; revelations at scenes 3,6 about "vault money"; told beliefs at scenes 0,1
      // about "shadow motive" — no shared vocabulary between revelations and subsequent told beliefs
      const records239c = [
        makeRec239(0, { dialogueHighlights: ['alice: shadow motive drives entire conspiracy here'] }),
        makeRec239(1, { dialogueHighlights: ['bob: shadow funding comes from offshore accounts'] }),
        makeRec239(2),
        makeRec239(3, { revelation: 'vault was raided by outside crew overnight' }),
        makeRec239(4, { dialogueHighlights: ['carol: leadership believes shadow stays hidden forever'] }),
        makeRec239(5),
        makeRec239(6, { revelation: 'guard left door unlocked for outside crew intentionally' }),
        makeRec239(7, { dialogueHighlights: ['alice: shadow network extends into government deeply'] }),
        makeRec239(8), makeRec239(9),
      ];
      const result239c = await beliefPass(makeInput239(records239c));
      const prop = result239c.issues.filter(i => i.rule === 'REVELATION_BELIEF_PROPAGATION_ABSENT');
      assert.ok(prop.length >= 1, 'Should detect REVELATION_BELIEF_PROPAGATION_ABSENT when revelations do not propagate into told beliefs');
      assert.strictEqual(prop[0].severity, 'minor');
    });

    it('REVELATION_BELIEF_PROPAGATION_ABSENT does NOT fire when a revelation propagates into a told belief', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // Revelation at scene 3 about "vault crew"; told belief at scene 5 mentions "vault crew" → propagates
      const records239d = [
        makeRec239(0, { dialogueHighlights: ['alice: guard left post before shift ended'] }),
        makeRec239(1, { dialogueHighlights: ['bob: manager knew about plan already'] }),
        makeRec239(2),
        makeRec239(3, { revelation: 'vault crew planned raid weeks before robbery night' }),
        makeRec239(4),
        makeRec239(5, { dialogueHighlights: ['carol: vault crew must have had inside help clearly'] }),
        makeRec239(6),
        makeRec239(7, { revelation: 'insider disabled alarm for vault crew that evening' }),
        makeRec239(8), makeRec239(9),
      ];
      const result239d = await beliefPass(makeInput239(records239d));
      const prop = result239d.issues.filter(i => i.rule === 'REVELATION_BELIEF_PROPAGATION_ABSENT');
      assert.strictEqual(prop.length, 0, 'Should NOT fire when a revelation shares vocabulary with a subsequent told belief');
    });

    it('SOLE_ASSERTER fires when only one character makes told-belief assertions', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 8 scenes; all dialogueHighlights prefixed with "alice:" only
      const records239e = [
        makeRec239(0, { dialogueHighlights: ['alice: vault door was open before arrival time'] }),
        makeRec239(1, { dialogueHighlights: ['alice: guard never checked credentials that morning'] }),
        makeRec239(2),
        makeRec239(3, { dialogueHighlights: ['alice: manager left keys inside the office overnight'] }),
        makeRec239(4, { dialogueHighlights: ['alice: alarm code was written on desk calendar'] }),
        makeRec239(5),
        makeRec239(6),
        makeRec239(7),
      ];
      const result239e = await beliefPass(makeInput239(records239e));
      const sole = result239e.issues.filter(i => i.rule === 'SOLE_ASSERTER');
      assert.ok(sole.length >= 1, 'Should detect SOLE_ASSERTER when only one character appears in dialogueHighlights');
      assert.strictEqual(sole[0].severity, 'minor');
    });

    it('SOLE_ASSERTER does NOT fire when multiple characters make assertions', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 8 scenes; beliefs from both alice and bob
      const records239f = [
        makeRec239(0, { dialogueHighlights: ['alice: vault door was open before arrival time'] }),
        makeRec239(1, { dialogueHighlights: ['bob: guard never checked credentials that morning'] }),
        makeRec239(2),
        makeRec239(3, { dialogueHighlights: ['alice: manager left keys inside the office overnight'] }),
        makeRec239(4, { dialogueHighlights: ['bob: alarm code was written on desk calendar clearly'] }),
        makeRec239(5),
        makeRec239(6),
        makeRec239(7),
      ];
      const result239f = await beliefPass(makeInput239(records239f));
      const sole = result239f.issues.filter(i => i.rule === 'SOLE_ASSERTER');
      assert.strictEqual(sole.length, 0, 'Should NOT fire when multiple characters make belief assertions');
    });
  });


  describe('Wave 211 — beliefPass: revelation act3 void, late deception plant, belief resolution absent', async () => {
    const makeRec211 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 1,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput211 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nA.\n', original: 'INT. SC - DAY\nA.\n',
      records: records as any, structure: {} as any,
      storyContext: {} as any, annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('REVELATION_ACT3_VOID fires when act 3 carries no witnessed revelations despite 3+ in act 1/2', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // n=10: act3RevStart=floor(10*0.75)=7; revelations at scenes 0,3,6 — none in scenes 7-9
      const records = [
        makeRec211(0, { revelation: 'murder weapon discovered hidden near bridge' }),
        makeRec211(1, { dialogueHighlights: ['alice: murder weapon was hidden near bridge there'] }),
        makeRec211(2),
        makeRec211(3, { revelation: 'detective found second clue about suspect location' }),
        makeRec211(4, { dialogueHighlights: ['bob: detective found evidence about location earlier'] }),
        makeRec211(5),
        makeRec211(6, {
          revelation: 'third truth about betrayal between partners discovered',
          dialogueHighlights: ['carol: detective found evidence location about matter'],
        }),
        makeRec211(7),
        makeRec211(8),
        makeRec211(9),
      ];
      const result = await beliefPass(makeInput211(records));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'REVELATION_ACT3_VOID'),
        'Should fire when 3 revelations land before act 3 and none reach the final 25%',
      );
    });

    it('REVELATION_ACT3_VOID does not fire when at least one revelation lands in act 3', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // Add revelation at scene 7 (act3 starts at 7 for n=10) — inAct3Rev becomes 1
      const records = [
        makeRec211(0, { revelation: 'murder weapon discovered hidden near bridge' }),
        makeRec211(1, { dialogueHighlights: ['alice: murder weapon was hidden near bridge there'] }),
        makeRec211(2),
        makeRec211(3, { revelation: 'detective found second clue about suspect location' }),
        makeRec211(4, { dialogueHighlights: ['bob: detective found evidence about location earlier'] }),
        makeRec211(5),
        makeRec211(6, {
          revelation: 'third truth about betrayal between partners discovered',
          dialogueHighlights: ['carol: detective found evidence location about matter'],
        }),
        makeRec211(7, { revelation: 'fourth truth discovered about relationship betrayal' }),
        makeRec211(8),
        makeRec211(9),
      ];
      const result = await beliefPass(makeInput211(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'REVELATION_ACT3_VOID'),
        'Should NOT fire when at least one revelation lands in the final 25%',
      );
    });

    it('LATE_DECEPTION_PLANT fires when a false belief is planted and exposed within the same act', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // n=10, lateCutoff=floor(10*0.6)=6; told@6 shares 4 words with witnessed@8
      // DECEPTION_WITHOUT_CONSEQUENCE exempt: contradiction.sceneIdx(8) >= records.length-2(8)
      const records = [
        makeRec211(0, { dialogueHighlights: ['bob: evidence clearly shows the robbery happened'] }),
        makeRec211(1),
        makeRec211(2),
        makeRec211(3),
        makeRec211(4, { revelation: 'trust found between loyal partners established' }),
        makeRec211(5, { dialogueHighlights: ['carol: trust found partners clear'] }),
        makeRec211(6, { dialogueHighlights: ['alice: trust always present between loyal partners friends'] }),
        makeRec211(7),
        makeRec211(8, {
          revelation: 'trust broken deceit between loyal partners betrayed',
          dialogueHighlights: ['bob: trust broken between partners betrayed indeed'],
        }),
        makeRec211(9),
      ];
      const result = await beliefPass(makeInput211(records));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'LATE_DECEPTION_PLANT'),
        'Should fire when a told belief planted at 60%+ through the story is overturned by a revelation in the same act',
      );
    });

    it('LATE_DECEPTION_PLANT does not fire when no told belief in the final 40% is contradicted', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // Remove told belief at scene 6 — lateToldBeliefs is now empty (told@8 has no later revelation)
      const records = [
        makeRec211(0, { dialogueHighlights: ['bob: evidence clearly shows the robbery happened'] }),
        makeRec211(1),
        makeRec211(2),
        makeRec211(3),
        makeRec211(4, { revelation: 'trust found between loyal partners established' }),
        makeRec211(5, { dialogueHighlights: ['carol: trust found partners clear'] }),
        makeRec211(6),
        makeRec211(7),
        makeRec211(8, {
          revelation: 'trust broken deceit between loyal partners betrayed',
          dialogueHighlights: ['bob: trust broken between partners betrayed indeed'],
        }),
        makeRec211(9),
      ];
      const result = await beliefPass(makeInput211(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'LATE_DECEPTION_PLANT'),
        'Should NOT fire when no told belief planted in the final 40% is overturned by a later revelation',
      );
    });

    it('BELIEF_RESOLUTION_ABSENT fires when no revelation lands in the final 20% of the story', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // n=8, finalZoneStart=floor(8*0.8)=6; 2 revelations at scenes 1,4 — none in scenes 6-7
      // Only 2 witnessed beliefs keeps REVELATION_ACT3_VOID (requires >=3) from co-firing
      const records = [
        makeRec211(0, { dialogueHighlights: ['alice: power corrupts those who show weakness always'] }),
        makeRec211(1, { revelation: 'truth found between loyal friends confirmed matter' }),
        makeRec211(2, { dialogueHighlights: ['bob: truth found between loyal friends matter always'] }),
        makeRec211(3),
        makeRec211(4, { revelation: 'second truth about matter discovered between friends' }),
        makeRec211(5, { dialogueHighlights: ['carol: matter discovered truth about between friends'], suspenseDelta: 2 }),
        makeRec211(6),
        makeRec211(7),
      ];
      const result = await beliefPass(makeInput211(records));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'BELIEF_RESOLUTION_ABSENT'),
        'Should fire when 2+ revelations exist but none land in the final 20% of the story',
      );
    });

    it('BELIEF_RESOLUTION_ABSENT does not fire when a revelation lands in the final 20%', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // Add revelation at scene 6 (finalZoneStart=6 for n=8) using unrelated vocabulary
      // to prevent LATE_DECEPTION_PLANT cross-fire with told@5
      const records = [
        makeRec211(0, { dialogueHighlights: ['alice: power corrupts those who show weakness always'] }),
        makeRec211(1, { revelation: 'truth found between loyal friends confirmed matter' }),
        makeRec211(2, { dialogueHighlights: ['bob: truth found between loyal friends matter always'] }),
        makeRec211(3),
        makeRec211(4, { revelation: 'second truth about matter discovered between friends' }),
        makeRec211(5, { dialogueHighlights: ['carol: matter discovered truth about between friends'], suspenseDelta: 2 }),
        makeRec211(6, { revelation: 'courage under pressure reveals character strength shown' }),
        makeRec211(7),
      ];
      const result = await beliefPass(makeInput211(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'BELIEF_RESOLUTION_ABSENT'),
        'Should NOT fire when at least one revelation lands in the final 20% of the story',
      );
    });
  });


  describe('Wave 199 — beliefPass: midpoint void, single revelation, revelation delayed', async () => {
    const makeRec199 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput199 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nA.\n', original: 'INT. SC - DAY\nA.\n',
      records: records as any, structure: {} as any,
      storyContext: {} as any, annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('BELIEF_MIDPOINT_VOID fires when the midpoint zone has no beliefs or revelations', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 10 records: belief in record 0 and revelation in records 2 and 9; midpoint [4-5] empty
      const records = [
        makeRec199(0, { dialogueHighlights: ['alice: trust defines loyalty'] }),
        makeRec199(1),
        makeRec199(2, { revelation: 'early fact' }),
        makeRec199(3),
        makeRec199(4),
        makeRec199(5),
        makeRec199(6),
        makeRec199(7),
        makeRec199(8),
        makeRec199(9, { revelation: 'final fact' }),
      ];
      const result = await beliefPass(makeInput199(records));
      assert.ok(result.issues.some((i: any) => i.rule === 'BELIEF_MIDPOINT_VOID'),
        'Should fire when midpoint zone carries no told beliefs or revelations');
    });

    it('BELIEF_MIDPOINT_VOID does not fire when midpoint zone carries a belief', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // Record 4 (in midpoint) has a told belief
      const records = [
        makeRec199(0, { dialogueHighlights: ['alice: trust defines loyalty'] }),
        makeRec199(1),
        makeRec199(2, { revelation: 'early fact' }),
        makeRec199(3),
        makeRec199(4, { dialogueHighlights: ['bob: things are not as they seem'] }),
        makeRec199(5),
        makeRec199(6),
        makeRec199(7),
        makeRec199(8),
        makeRec199(9, { revelation: 'final fact' }),
      ];
      const result = await beliefPass(makeInput199(records));
      assert.ok(!result.issues.some((i: any) => i.rule === 'BELIEF_MIDPOINT_VOID'),
        'Should NOT fire when midpoint zone contains a told belief');
    });

    it('SINGLE_REVELATION_STORY fires when the story has exactly one witnessed revelation', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 8 records: one revelation total, two told beliefs
      const records = [
        makeRec199(0, { dialogueHighlights: ['alice: loyalty matters'] }),
        makeRec199(1),
        makeRec199(2, { dialogueHighlights: ['bob: trust was never there'] }),
        makeRec199(3),
        makeRec199(4, { revelation: 'only one truth witnessed' }),
        makeRec199(5),
        makeRec199(6),
        makeRec199(7),
      ];
      const result = await beliefPass(makeInput199(records));
      assert.ok(result.issues.some((i: any) => i.rule === 'SINGLE_REVELATION_STORY'),
        'Should fire when story has exactly one witnessed revelation across 8+ scenes');
    });

    it('SINGLE_REVELATION_STORY does not fire when story has two or more revelations', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 8 records: two revelations
      const records = [
        makeRec199(0, { dialogueHighlights: ['alice: loyalty matters'] }),
        makeRec199(1),
        makeRec199(2, { revelation: 'first truth' }),
        makeRec199(3),
        makeRec199(4),
        makeRec199(5),
        makeRec199(6, { revelation: 'second truth' }),
        makeRec199(7),
      ];
      const result = await beliefPass(makeInput199(records));
      assert.ok(!result.issues.some((i: any) => i.rule === 'SINGLE_REVELATION_STORY'),
        'Should NOT fire when story has two or more witnessed revelations');
    });

    it('REVELATION_DELAYED fires when the first revelation arrives after the midpoint', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 6 records: told beliefs at 0 and 1, first revelation at record 4 (67% in)
      const records = [
        makeRec199(0, { dialogueHighlights: ['alice: the key exists here'] }),
        makeRec199(1, { dialogueHighlights: ['bob: we know the truth already'] }),
        makeRec199(2),
        makeRec199(3),
        makeRec199(4, { revelation: 'delayed discovery' }),
        makeRec199(5),
      ];
      const result = await beliefPass(makeInput199(records));
      assert.ok(result.issues.some((i: any) => i.rule === 'REVELATION_DELAYED'),
        'Should fire when first revelation occurs past the story midpoint');
    });

    it('REVELATION_DELAYED does not fire when the first revelation arrives before the midpoint', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // First revelation at record 2 (33% in, before midpoint at 50%)
      const records = [
        makeRec199(0, { dialogueHighlights: ['alice: the key exists here'] }),
        makeRec199(1, { dialogueHighlights: ['bob: we know the truth already'] }),
        makeRec199(2, { revelation: 'early discovery' }),
        makeRec199(3),
        makeRec199(4),
        makeRec199(5),
      ];
      const result = await beliefPass(makeInput199(records));
      assert.ok(!result.issues.some((i: any) => i.rule === 'REVELATION_DELAYED'),
        'Should NOT fire when first revelation arrives before the midpoint');
    });
  });


  describe('Wave 159 — beliefPass: revelation isolated, told domination, belief asymmetry', async () => {
    const makeRec = (idx: number, override: Partial<any> = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'dialogue', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
      ...override,
    });
    const noAnnotations = (n: number) => Array.from({ length: n }, () => ({ revelation: false } as any));
    const blankFountain = (n: number) =>
      Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join('');

    it('beliefPass detects REVELATION_ISOLATED when revelation has no adjacent dialogue', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // Scene 2 has a revelation, scenes 1 and 3 have no dialogue either
      const records = [
        makeRec(0, { dialogueHighlights: ['alice: something is wrong'] }),
        makeRec(1), // no dialogue
        makeRec(2, { revelation: 'the safe was empty all along' }), // no dialogue in scene
        makeRec(3), // no dialogue
        makeRec(4, { dialogueHighlights: ['bob: we need to leave'] }),
      ];
      const result = await beliefPass({
        fountain: blankFountain(5), original: blankFountain(5),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(5), approvedSpans: [],
      });
      const isolated = result.issues.filter(i => i.rule === 'REVELATION_ISOLATED');
      assert.ok(isolated.length >= 1, `Should detect REVELATION_ISOLATED; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(isolated[0].severity === 'major');
    });

    it('beliefPass does NOT fire REVELATION_ISOLATED when adjacent scene has dialogue', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      const records = [
        makeRec(0),
        makeRec(1),
        makeRec(2, { revelation: 'the safe was empty all along' }),
        makeRec(3, { dialogueHighlights: ['alice: I knew it, I knew it all along'] }), // reaction after
        makeRec(4),
      ];
      const result = await beliefPass({
        fountain: blankFountain(5), original: blankFountain(5),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(5), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'REVELATION_ISOLATED'),
        'Should NOT fire when the following scene has character dialogue',
      );
    });

    it('beliefPass detects TOLD_BELIEF_DOMINATION when >70% are told-only scenes', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 7 belief scenes: 6 told-only, 1 revelation = 86% told ratio
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, {
          dialogueHighlights: i < 6 ? [`alice: asserts fact ${i}`] : [],
          revelation: i === 6 ? 'the truth' : null,
        }),
      );
      const result = await beliefPass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(8), approvedSpans: [],
      });
      const domination = result.issues.filter(i => i.rule === 'TOLD_BELIEF_DOMINATION');
      assert.ok(domination.length >= 1, `Should detect TOLD_BELIEF_DOMINATION; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(domination[0].severity === 'major');
    });

    it('beliefPass does NOT fire TOLD_BELIEF_DOMINATION when revelations are well-distributed', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // 6 records: 3 told, 3 revelations = 50% told ratio
      const records = Array.from({ length: 6 }, (_, i) =>
        makeRec(i, {
          dialogueHighlights: i % 2 === 0 ? [`alice: claims ${i}`] : [],
          revelation: i % 2 === 1 ? `truth ${i}` : null,
        }),
      );
      const result = await beliefPass({
        fountain: blankFountain(6), original: blankFountain(6),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(6), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'TOLD_BELIEF_DOMINATION'),
        'Should NOT fire when told and witnessed beliefs are balanced',
      );
    });

    it('beliefPass detects BELIEF_ASYMMETRY when one character dominates dialogue 3:1', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // alice: 6 appearances, bob: 2 appearances = 3:1 ratio
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, {
          dialogueHighlights: i < 6
            ? ['alice: knows the secret']
            : i === 6
            ? ['bob: suspects something']
            : ['bob: not sure'],
        }),
      );
      const result = await beliefPass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(8), approvedSpans: [],
      });
      const asymmetry = result.issues.filter(i => i.rule === 'BELIEF_ASYMMETRY');
      assert.ok(asymmetry.length >= 1, `Should detect BELIEF_ASYMMETRY; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(asymmetry[0].severity === 'minor');
    });

    it('beliefPass does NOT fire BELIEF_ASYMMETRY when characters share belief space', async () => {
      const { beliefPass } = await import('../../server/nvm/revision/passes/belief.ts');
      // alice: 3, bob: 3 — balanced
      const records = Array.from({ length: 6 }, (_, i) =>
        makeRec(i, {
          dialogueHighlights: [i % 2 === 0 ? 'alice: has a theory' : 'bob: disagrees with alice'],
        }),
      );
      const result = await beliefPass({
        fountain: blankFountain(6), original: blankFountain(6),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(6), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'BELIEF_ASYMMETRY'),
        'Should NOT fire when characters share belief appearances equally',
      );
    });
  });