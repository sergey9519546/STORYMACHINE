// Extracted from the former monolithic test.ts (audit M2.1 — split for maintainability).
// causalityPass revision-rule tests. Shared imports/helpers below are duplicated verbatim across every split
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


  // ── Wave 155: Causality pass enhancements ─────────────────────────────────
  describe('Wave 155 — causalityPass: deus ex machina, suspense spike, goal opposition', async () => {
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

    it('causalityPass detects DEUS_EX_MACHINA for unseeded late resolution', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // 10 scenes, climax zone starts scene 8. No clue ever seeded. Scene 9 resolves via revelation.
      const records = Array.from({ length: 10 }, (_, i) =>
        i === 9
          ? makeRec(i, { revelation: 'the killer was the butler', purpose: 'resolution', suspenseDelta: -3 })
          : makeRec(i),
      );
      const result = await causalityPass({
        fountain: blankFountain(10), original: blankFountain(10),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(10), approvedSpans: [],
      });
      const deus = result.issues.filter(i => i.rule === 'DEUS_EX_MACHINA');
      assert.ok(deus.length >= 1, 'Should detect DEUS_EX_MACHINA for unseeded late resolution');
      assert.ok(deus[0].severity === 'critical');
    });

    it('causalityPass does NOT fire DEUS_EX_MACHINA when resolution was seeded early', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const records = Array.from({ length: 10 }, (_, i) => {
        if (i === 1) return makeRec(i, { seededClueIds: ['butler_clue'] }); // early seed
        if (i === 9) return makeRec(i, { revelation: 'the killer was the butler', purpose: 'resolution', suspenseDelta: -3 });
        return makeRec(i);
      });
      const result = await causalityPass({
        fountain: blankFountain(10), original: blankFountain(10),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(10), approvedSpans: [],
      });
      const deus = result.issues.filter(i => i.rule === 'DEUS_EX_MACHINA');
      assert.ok(deus.length === 0, 'Should NOT fire when resolution was seeded in Act 1');
    });

    it('causalityPass detects SUSPENSE_SPIKE_NO_CAUSE for sudden danger without buildup', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const records = [
        makeRec(0, { suspenseDelta: 0.5 }),
        makeRec(1, { suspenseDelta: 0.5 }),
        makeRec(2, { suspenseDelta: 0.5 }),
        makeRec(3, { suspenseDelta: 4 }), // spike after flat scenes, no setup
        makeRec(4, { suspenseDelta: 1 }),
      ];
      const result = await causalityPass({
        fountain: blankFountain(5), original: blankFountain(5),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(5), approvedSpans: [],
      });
      const spike = result.issues.filter(i => i.rule === 'SUSPENSE_SPIKE_NO_CAUSE');
      assert.ok(spike.length >= 1, 'Should detect SUSPENSE_SPIKE_NO_CAUSE for sudden unbuilt danger');
      assert.ok(spike[0].severity === 'major');
    });

    it('causalityPass detects GOAL_WITHOUT_OPPOSITION when no resistance exists', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // Goal planted, but every scene is positive/flat — no opposition
      const records = [
        makeRec(0, { seededClueIds: ['goal1'] }),
        makeRec(1, { suspenseDelta: 1, emotionalShift: 'positive' }),
        makeRec(2, { suspenseDelta: 1.5, emotionalShift: 'positive' }),
        makeRec(3, { suspenseDelta: 1, emotionalShift: 'neutral' }),
        makeRec(4, { suspenseDelta: 1.5, emotionalShift: 'positive' }),
        makeRec(5, { suspenseDelta: 1, emotionalShift: 'positive' }),
      ];
      const result = await causalityPass({
        fountain: blankFountain(6), original: blankFountain(6),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(6), approvedSpans: [],
      });
      const opposition = result.issues.filter(i => i.rule === 'GOAL_WITHOUT_OPPOSITION');
      assert.ok(opposition.length >= 1, 'Should detect GOAL_WITHOUT_OPPOSITION when goal meets no resistance');
      assert.ok(opposition[0].severity === 'major');
    });

    it('causalityPass does NOT fire GOAL_WITHOUT_OPPOSITION when reversal opposes goal', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const records = [
        makeRec(0, { seededClueIds: ['goal1'] }),
        makeRec(1, { suspenseDelta: 1 }),
        makeRec(2, { suspenseDelta: -2 }), // reversal = opposition
        makeRec(3, { suspenseDelta: 1 }),
        makeRec(4, { suspenseDelta: 1.5 }),
        makeRec(5, { suspenseDelta: 1 }),
      ];
      const result = await causalityPass({
        fountain: blankFountain(6), original: blankFountain(6),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(6), approvedSpans: [],
      });
      const opposition = result.issues.filter(i => i.rule === 'GOAL_WITHOUT_OPPOSITION');
      assert.ok(opposition.length === 0, 'Should NOT fire when a reversal opposes the goal');
    });
  });


  // ── Wave 166: Causality pass enhancements ─────────────────────────────────
  describe("Wave 166 — causalityPass: Chekhov's gun, consequence delay, revelation front-loading", async () => {
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

    // ── CHEKHOV_GUN_UNFIRED ──────────────────────────────────────────────────
    it("causalityPass detects CHEKHOV_GUN_UNFIRED when 2+ early clues have no payoff", async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // 6 scenes; midpoint=3; records[1] seeds 'gun' and 'letter'; no payoffs anywhere
      const records = [
        makeRec(0),
        makeRec(1, { seededClueIds: ['gun', 'letter'] }),
        makeRec(2),
        makeRec(3),
        makeRec(4),
        makeRec(5),
      ];
      const result = await causalityPass({
        fountain: blankFountain(6), original: blankFountain(6),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(6), approvedSpans: [],
      });
      const unfired = result.issues.filter(i => i.rule === 'CHEKHOV_GUN_UNFIRED');
      assert.ok(unfired.length >= 1, `Expected CHEKHOV_GUN_UNFIRED; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(unfired[0].severity === 'major');
    });

    it("causalityPass does NOT fire CHEKHOV_GUN_UNFIRED when all early clues are paid off", async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const records = [
        makeRec(0),
        makeRec(1, { seededClueIds: ['gun', 'letter'] }),
        makeRec(2),
        makeRec(3),
        makeRec(4),
        makeRec(5, { payoffSetupIds: ['gun', 'letter'] }),
      ];
      const result = await causalityPass({
        fountain: blankFountain(6), original: blankFountain(6),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(6), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'CHEKHOV_GUN_UNFIRED'),
        'Should NOT fire when all seeded clues have corresponding payoffs',
      );
    });

    // ── CONSEQUENCE_DELAY_EXCESSIVE ──────────────────────────────────────────
    it('causalityPass detects CONSEQUENCE_DELAY_EXCESSIVE when cause-effect gap is 5+ scenes', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // 10 scenes; scene 0 raises clock; scenes 1-4 all neutral with no shifts;
      // scene 5 has first relationship shift — 5-scene gap triggers the check
      const records = Array.from({ length: 10 }, (_, i) =>
        makeRec(i, {
          clockRaised: i === 0,
          emotionalShift: 'neutral',
          suspenseDelta: 1,
          relationshipShifts: i === 5 ? [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -0.6 }] : [],
        }),
      );
      const result = await causalityPass({
        fountain: blankFountain(10), original: blankFountain(10),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(10), approvedSpans: [],
      });
      const delay = result.issues.filter(i => i.rule === 'CONSEQUENCE_DELAY_EXCESSIVE');
      assert.ok(delay.length >= 1, `Expected CONSEQUENCE_DELAY_EXCESSIVE; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(delay[0].severity === 'minor');
    });

    it('causalityPass does NOT fire CONSEQUENCE_DELAY_EXCESSIVE when consequence arrives quickly', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // scene 0 raises clock; scene 1 has immediate relationship shift — 1-scene gap
      const records = Array.from({ length: 10 }, (_, i) =>
        makeRec(i, {
          clockRaised: i === 0,
          emotionalShift: 'neutral',
          suspenseDelta: 1,
          relationshipShifts: i === 1 ? [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -0.6 }] : [],
        }),
      );
      const result = await causalityPass({
        fountain: blankFountain(10), original: blankFountain(10),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(10), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'CONSEQUENCE_DELAY_EXCESSIVE'),
        'Should NOT fire when consequence arrives within 4 scenes of cause',
      );
    });

    // ── REVELATION_FRONT_LOADING ─────────────────────────────────────────────
    it('causalityPass detects REVELATION_FRONT_LOADING when 3+ revelations cluster in first half', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // 8 scenes; midpoint=4; scenes 0,1,2 all have revelations (3 of 3 in first half)
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, {
          revelation: i < 3 ? `truth about scene ${i}` : null,
        }),
      );
      const result = await causalityPass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(8), approvedSpans: [],
      });
      const frontLoaded = result.issues.filter(i => i.rule === 'REVELATION_FRONT_LOADING');
      assert.ok(frontLoaded.length >= 1, `Expected REVELATION_FRONT_LOADING; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(frontLoaded[0].severity === 'major');
    });

    it('causalityPass does NOT fire REVELATION_FRONT_LOADING when revelations are distributed across the story', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // 8 scenes; midpoint=4; revelations at scenes 2, 5, 7 (1 in first half, 2 in second)
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, {
          revelation: (i === 2 || i === 5 || i === 7) ? `truth ${i}` : null,
        }),
      );
      const result = await causalityPass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: {} as any,
        annotations: noAnnotations(8), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'REVELATION_FRONT_LOADING'),
        'Should NOT fire when revelations are distributed across both halves',
      );
    });
  });


  describe('Wave 180 — causalityPass: revelation without reaction, reaction without cause, clock without payoff', async () => {
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
    const causeInput = (records: any[], n: number) => ({
      fountain: blankFountain(n), original: blankFountain(n),
      records: records as any, structure: {} as any, annotations: noAnnotations(n), approvedSpans: [],
    });

    // ── REVELATION_WITHOUT_REACTION ───────────────────────────────────────────
    it('causalityPass detects REVELATION_WITHOUT_REACTION when a revelation lands flat', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // Scene 2 reveals; scene 3 shows no causal ripple
      const records = Array.from({ length: 6 }, (_, i) =>
        i === 2 ? makeRec(i, { revelation: 'the letter was forged' }) : makeRec(i),
      );
      const result = await causalityPass(causeInput(records, 6));
      const rev = result.issues.filter(i => i.rule === 'REVELATION_WITHOUT_REACTION');
      assert.ok(rev.length >= 1, `Should detect REVELATION_WITHOUT_REACTION; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(rev[0].severity === 'minor');
    });

    it('causalityPass does NOT fire REVELATION_WITHOUT_REACTION when the next scene responds', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const records = Array.from({ length: 6 }, (_, i) =>
        i === 2
          ? makeRec(i, { revelation: 'the letter was forged' })
          : i === 3
          ? makeRec(i, { emotionalShift: 'negative' })
          : makeRec(i),
      );
      const result = await causalityPass(causeInput(records, 6));
      assert.ok(
        !result.issues.some(i => i.rule === 'REVELATION_WITHOUT_REACTION'),
        'Should NOT fire when the scene after a revelation shows a reaction',
      );
    });

    // ── REACTION_WITHOUT_CAUSE ────────────────────────────────────────────────
    it('causalityPass detects REACTION_WITHOUT_CAUSE when a downturn has no trigger', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // Scene 3 turns negative; scenes 1,2 and scene 3 itself carry no cause
      const records = Array.from({ length: 6 }, (_, i) =>
        makeRec(i, { emotionalShift: i === 3 ? 'negative' : 'neutral' }),
      );
      const result = await causalityPass(causeInput(records, 6));
      const reaction = result.issues.filter(i => i.rule === 'REACTION_WITHOUT_CAUSE');
      assert.ok(reaction.length >= 1, `Should detect REACTION_WITHOUT_CAUSE; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(reaction[0].severity === 'minor');
    });

    it('causalityPass does NOT fire REACTION_WITHOUT_CAUSE when a prior scene sets up the downturn', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const records = Array.from({ length: 6 }, (_, i) =>
        i === 2
          ? makeRec(i, { suspenseDelta: 2 })
          : makeRec(i, { emotionalShift: i === 3 ? 'negative' : 'neutral' }),
      );
      const result = await causalityPass(causeInput(records, 6));
      assert.ok(
        !result.issues.some(i => i.rule === 'REACTION_WITHOUT_CAUSE'),
        'Should NOT fire when a preceding scene raises suspense before the downturn',
      );
    });

    // ── CLOCK_RAISED_WITHOUT_PAYOFF ───────────────────────────────────────────
    it('causalityPass detects CLOCK_RAISED_WITHOUT_PAYOFF when the deadline never discharges', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const records = Array.from({ length: 6 }, (_, i) =>
        makeRec(i, { clockRaised: i === 1 }),
      );
      const result = await causalityPass(causeInput(records, 6));
      const clock = result.issues.filter(i => i.rule === 'CLOCK_RAISED_WITHOUT_PAYOFF');
      assert.ok(clock.length >= 1, `Should detect CLOCK_RAISED_WITHOUT_PAYOFF; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(clock[0].severity === 'major');
    });

    it('causalityPass does NOT fire CLOCK_RAISED_WITHOUT_PAYOFF when a later scene discharges it', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const records = Array.from({ length: 6 }, (_, i) =>
        i === 4
          ? makeRec(i, { suspenseDelta: 3 })
          : makeRec(i, { clockRaised: i === 1 }),
      );
      const result = await causalityPass(causeInput(records, 6));
      assert.ok(
        !result.issues.some(i => i.rule === 'CLOCK_RAISED_WITHOUT_PAYOFF'),
        'Should NOT fire when a later scene pays off the raised clock',
      );
    });
  });


  describe('Wave 187 — causalityPass: consequence chain break, clock ghost, positive shift orphan', async () => {
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
    const causalInput = (records: any[]) => ({
      fountain: blankFountain(records.length), original: blankFountain(records.length),
      records: records as any, structure: {} as any, annotations: [], approvedSpans: [],
    });

    // CONSEQUENCE_CHAIN_BREAK — fires
    it('CONSEQUENCE_CHAIN_BREAK fires when high-suspense peak is followed by two flat scenes', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const records = [
        makeRec(0), makeRec(1),
        makeRec(2, { suspenseDelta: 2.5 }), // high-action peak
        makeRec(3), // flat aftermath
        makeRec(4), // flat aftermath
        makeRec(5),
      ];
      const result = await causalityPass(causalInput(records));
      assert.ok(
        result.issues.some(i => i.rule === 'CONSEQUENCE_CHAIN_BREAK'),
        `Expected CONSEQUENCE_CHAIN_BREAK, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // CONSEQUENCE_CHAIN_BREAK — no-fire
    it('CONSEQUENCE_CHAIN_BREAK does not fire when high-suspense peak triggers an emotional reaction', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const records = [
        makeRec(0), makeRec(1),
        makeRec(2, { suspenseDelta: 2.5 }), // high-action peak
        makeRec(3, { emotionalShift: 'negative' }), // reaction — not flat
        makeRec(4),
        makeRec(5),
      ];
      const result = await causalityPass(causalInput(records));
      assert.ok(
        !result.issues.some(i => i.rule === 'CONSEQUENCE_CHAIN_BREAK'),
        `Expected no CONSEQUENCE_CHAIN_BREAK, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // CLOCK_GHOST — fires
    it('CLOCK_GHOST fires when clock raise is followed by three suspense-dead scenes', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const records = [
        makeRec(0),
        makeRec(1, { clockRaised: true }), // clock raised
        makeRec(2), // no urgency
        makeRec(3), // no urgency
        makeRec(4), // no urgency
        makeRec(5),
      ];
      const result = await causalityPass(causalInput(records));
      assert.ok(
        result.issues.some(i => i.rule === 'CLOCK_GHOST'),
        `Expected CLOCK_GHOST, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // CLOCK_GHOST — no-fire
    it('CLOCK_GHOST does not fire when clock raise is followed by a suspense build', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const records = [
        makeRec(0),
        makeRec(1, { clockRaised: true }), // clock raised
        makeRec(2, { suspenseDelta: 2.5 }), // urgency registers
        makeRec(3),
        makeRec(4),
        makeRec(5),
      ];
      const result = await causalityPass(causalInput(records));
      assert.ok(
        !result.issues.some(i => i.rule === 'CLOCK_GHOST'),
        `Expected no CLOCK_GHOST, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // POSITIVE_SHIFT_ORPHAN — fires
    it('POSITIVE_SHIFT_ORPHAN fires when two positive shifts have no causal consequence', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // n=8: positive shifts at idx 1 and 5, both with flat following scenes
      const records = Array.from({ length: 8 }, (_, i) => makeRec(i, {
        relationshipShifts: (i === 1 || i === 5)
          ? [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.5 }]
          : [],
      }));
      const result = await causalityPass(causalInput(records));
      assert.ok(
        result.issues.some(i => i.rule === 'POSITIVE_SHIFT_ORPHAN'),
        `Expected POSITIVE_SHIFT_ORPHAN, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // POSITIVE_SHIFT_ORPHAN — no-fire
    it('POSITIVE_SHIFT_ORPHAN does not fire when a positive shift triggers a consequence', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // shift at idx 1 → idx 2 has revelation (consequence) → not an orphan; only 1 orphan → no fire
      const records = Array.from({ length: 8 }, (_, i) => makeRec(i, {
        relationshipShifts: (i === 1 || i === 5)
          ? [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.5 }]
          : [],
        revelation: i === 2 ? 'Alice tells Bob the truth.' : null,
      }));
      const result = await causalityPass(causalInput(records));
      assert.ok(
        !result.issues.some(i => i.rule === 'POSITIVE_SHIFT_ORPHAN'),
        `Expected no POSITIVE_SHIFT_ORPHAN, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });
  });


  describe('Wave 226 — causalityPass: causal density inversion, escalation plateau, antagonist second-half silent', async () => {
    const makeRec226 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput226 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: '...',
      records: records as any, structure: {} as any,
      storyContext: {} as any,
      annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('causalityPass detects CAUSAL_DENSITY_INVERSION when first half has ≥3× the causal events of second half', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // 12 scenes: first half (0-5) has 4 causal events; second half (6-11) has 1
      const records226a = [
        makeRec226(0, { seededClueIds: ['clue-a'] }),               // causal
        makeRec226(1, { clockRaised: true }),                        // causal
        makeRec226(2, { revelation: 'the suspect was here early' }), // causal
        makeRec226(3, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: -0.4 }] }), // causal
        makeRec226(4),
        makeRec226(5),
        makeRec226(6),
        makeRec226(7),
        makeRec226(8, { seededClueIds: ['clue-b'] }),                // only causal in second half
        makeRec226(9),
        makeRec226(10),
        makeRec226(11),
      ];
      const result226a = await causalityPass(makeInput226(records226a));
      const densityInv = result226a.issues.filter(i => i.rule === 'CAUSAL_DENSITY_INVERSION');
      assert.ok(densityInv.length >= 1, 'Should detect CAUSAL_DENSITY_INVERSION when first half has 4× the causal events');
      assert.strictEqual(densityInv[0].severity, 'major');
    });

    it('causalityPass does NOT fire CAUSAL_DENSITY_INVERSION when causal events are balanced across halves', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // 12 scenes: 3 causal events in first half, 3 in second half
      const records226b = [
        makeRec226(0, { seededClueIds: ['clue-a'] }),
        makeRec226(1, { clockRaised: true }),
        makeRec226(2, { revelation: 'something discovered' }),
        makeRec226(3), makeRec226(4), makeRec226(5),
        makeRec226(6, { seededClueIds: ['clue-b'] }),
        makeRec226(7, { clockRaised: true }),
        makeRec226(8, { revelation: 'another discovery' }),
        makeRec226(9), makeRec226(10), makeRec226(11),
      ];
      const result226b = await causalityPass(makeInput226(records226b));
      const densityInv = result226b.issues.filter(i => i.rule === 'CAUSAL_DENSITY_INVERSION');
      assert.strictEqual(densityInv.length, 0, 'Should NOT fire CAUSAL_DENSITY_INVERSION when both halves have equal causal events');
    });

    it('causalityPass detects ESCALATION_PLATEAU when suspense peaks do not increase over the story arc', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // 3 peaks: 3.0, 2.5, 2.0 — last peak (2.0) ≤ first peak (3.0) → fires
      const records226c = [
        makeRec226(0), makeRec226(1),
        makeRec226(2, { suspenseDelta: 3.0 }),   // first peak
        makeRec226(3), makeRec226(4),
        makeRec226(5, { suspenseDelta: 2.5 }),   // second peak
        makeRec226(6), makeRec226(7),
        makeRec226(8, { suspenseDelta: 2.0 }),   // final peak — same as first, no escalation
        makeRec226(9),
      ];
      const result226c = await causalityPass(makeInput226(records226c));
      const plateau = result226c.issues.filter(i => i.rule === 'ESCALATION_PLATEAU');
      assert.ok(plateau.length >= 1, 'Should detect ESCALATION_PLATEAU when peaks plateau or decline across the arc');
      assert.strictEqual(plateau[0].severity, 'major');
    });

    it('causalityPass does NOT fire ESCALATION_PLATEAU when peaks escalate across the arc', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // 3 peaks: 2.0, 2.5, 3.5 — last peak (3.5) > first peak (2.0) → no fire
      const records226d = [
        makeRec226(0), makeRec226(1),
        makeRec226(2, { suspenseDelta: 2.0 }),   // first peak
        makeRec226(3), makeRec226(4),
        makeRec226(5, { suspenseDelta: 2.5 }),   // growing
        makeRec226(6), makeRec226(7),
        makeRec226(8, { suspenseDelta: 3.5 }),   // climax peak — highest
        makeRec226(9),
      ];
      const result226d = await causalityPass(makeInput226(records226d));
      const plateau = result226d.issues.filter(i => i.rule === 'ESCALATION_PLATEAU');
      assert.strictEqual(plateau.length, 0, 'Should NOT fire ESCALATION_PLATEAU when peaks escalate to a climax high');
    });

    it('causalityPass detects ANTAGONIST_SECOND_HALF_SILENT when antagonist disappears after Act 1', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // 10 scenes: antagonistic pressure (≤-0.4) at scene 1 (first 40%); none in scenes 4-9
      const records226e = [
        makeRec226(0),
        makeRec226(1, { relationshipShifts: [{ pairKey: 'hero|villain', dimension: 'trust', amount: -0.5 }] }),
        makeRec226(2),
        makeRec226(3),
        // scenes 4-9: no antagonistic pressure (act1End226 = floor(10*0.4) = 4, so slice starts here)
        makeRec226(4), makeRec226(5), makeRec226(6), makeRec226(7), makeRec226(8), makeRec226(9),
      ];
      const result226e = await causalityPass(makeInput226(records226e));
      const antagonistSilent = result226e.issues.filter(i => i.rule === 'ANTAGONIST_SECOND_HALF_SILENT');
      assert.ok(antagonistSilent.length >= 1, 'Should detect ANTAGONIST_SECOND_HALF_SILENT when antagonist drops out after Act 1');
      assert.strictEqual(antagonistSilent[0].severity, 'minor');
    });

    it('causalityPass does NOT fire ANTAGONIST_SECOND_HALF_SILENT when antagonist is active in the second half', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // Antagonist at scene 1 (Act 1) AND scene 7 (second half, >40%) → no fire
      const records226f = [
        makeRec226(0),
        makeRec226(1, { relationshipShifts: [{ pairKey: 'hero|villain', dimension: 'trust', amount: -0.5 }] }),
        makeRec226(2), makeRec226(3), makeRec226(4), makeRec226(5), makeRec226(6),
        makeRec226(7, { relationshipShifts: [{ pairKey: 'hero|villain', dimension: 'trust', amount: -0.6 }] }),
        makeRec226(8), makeRec226(9),
      ];
      const result226f = await causalityPass(makeInput226(records226f));
      const antagonistSilent = result226f.issues.filter(i => i.rule === 'ANTAGONIST_SECOND_HALF_SILENT');
      assert.strictEqual(antagonistSilent.length, 0, 'Should NOT fire when antagonist remains active in the second half');
    });
  });


  describe('Wave 310 — causalityPass: emotion without driver run, clock relief unexplained, dramatic turn cluster', async () => {
    const makeRec310 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runC310 = async (records: any[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('EMOTION_WITHOUT_DRIVER_RUN fires when 3+ consecutive emotional scenes have no driver', async () => {
      // scenes 3,4,5 non-neutral with suspenseDelta 0 and no other driver
      const recs310ed = Array.from({ length: 8 }, (_, i) =>
        makeRec310(i, {
          emotionalShift: [3, 4, 5].includes(i) ? 'negative' : 'neutral',
          suspenseDelta: [3, 4, 5].includes(i) ? 0 : 0.5,
        })
      );
      const res = await runC310(recs310ed);
      assert.ok(res.issues.some((i: any) => i.rule === 'EMOTION_WITHOUT_DRIVER_RUN'), 'EMOTION_WITHOUT_DRIVER_RUN should fire');
    });

    it('EMOTION_WITHOUT_DRIVER_RUN does not fire when emotional scenes have drivers', async () => {
      const recs310ned = Array.from({ length: 8 }, (_, i) =>
        makeRec310(i, {
          emotionalShift: [3, 4, 5].includes(i) ? 'negative' : 'neutral',
          suspenseDelta: [3, 4, 5].includes(i) ? 2 : 0.5,
        })
      );
      const res = await runC310(recs310ned);
      assert.ok(!res.issues.some((i: any) => i.rule === 'EMOTION_WITHOUT_DRIVER_RUN'), 'EMOTION_WITHOUT_DRIVER_RUN should not fire');
    });

    it('CLOCK_RELIEF_UNEXPLAINED fires when clock pressure drops with no revelation or payoff', async () => {
      const recs310cr = Array.from({ length: 8 }, (_, i) =>
        makeRec310(i, { clockDelta: i === 4 ? -2 : 0 })
      );
      const res = await runC310(recs310cr);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_RELIEF_UNEXPLAINED'), 'CLOCK_RELIEF_UNEXPLAINED should fire');
    });

    it('CLOCK_RELIEF_UNEXPLAINED does not fire when the clock relief is caused by a payoff', async () => {
      const recs310ncr = Array.from({ length: 8 }, (_, i) =>
        makeRec310(i, {
          clockDelta: i === 4 ? -2 : 0,
          payoffSetupIds: i === 4 ? ['clue-a'] : [],
        })
      );
      const res = await runC310(recs310ncr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_RELIEF_UNEXPLAINED'), 'CLOCK_RELIEF_UNEXPLAINED should not fire');
    });

    it('DRAMATIC_TURN_CLUSTER fires when 3+ dramatic turns fall in a three-scene window', async () => {
      const recs310dt = Array.from({ length: 8 }, (_, i) =>
        makeRec310(i, { dramaticTurn: [2, 3, 4].includes(i) ? 'reversal' : 'nothing' })
      );
      const res = await runC310(recs310dt);
      assert.ok(res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_CLUSTER'), 'DRAMATIC_TURN_CLUSTER should fire');
    });

    it('DRAMATIC_TURN_CLUSTER does not fire when dramatic turns are spaced out', async () => {
      const recs310ndt = Array.from({ length: 8 }, (_, i) =>
        makeRec310(i, { dramaticTurn: [1, 4, 7].includes(i) ? 'reversal' : 'nothing' })
      );
      const res = await runC310(recs310ndt);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_CLUSTER'), 'DRAMATIC_TURN_CLUSTER should not fire');
    });
  });


  describe('Wave 1175 — causalityPass: causality revelation-suspense aftermath void, causality revelation-staging aftermath void, causality suspense-relational aftermath void', async () => {
    const runCA1175 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('CAUSALITY_REVELATION_SUSPENSE_AFTERMATH_VOID fires when every revelation has no suspense rise within 2 scenes', async () => {
      const recs1175a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { revelation: 'a hidden truth surfaces' } : ([8, 9].includes(i) ? { suspenseDelta: 1 } : {})));
      const res = await runCA1175(recs1175a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_REVELATION_SUSPENSE_AFTERMATH_VOID'), 'CAUSALITY_REVELATION_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_REVELATION_SUSPENSE_AFTERMATH_VOID does not fire when a revelation is followed by a suspense rise within 2 scenes', async () => {
      const recs1175an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { revelation: 'a hidden truth surfaces' } : ([1, 9].includes(i) ? { suspenseDelta: 1 } : {})));
      const res = await runCA1175(recs1175an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_REVELATION_SUSPENSE_AFTERMATH_VOID'), 'CAUSALITY_REVELATION_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_REVELATION_STAGING_AFTERMATH_VOID fires when every revelation has no heavily-staged scene within 2 scenes', async () => {
      const recs1175b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { revelation: 'a hidden truth surfaces' } : ([8, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runCA1175(recs1175b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_REVELATION_STAGING_AFTERMATH_VOID'), 'CAUSALITY_REVELATION_STAGING_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_REVELATION_STAGING_AFTERMATH_VOID does not fire when a revelation is followed by a heavily-staged scene within 2 scenes', async () => {
      const recs1175bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { revelation: 'a hidden truth surfaces' } : ([1, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runCA1175(recs1175bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_REVELATION_STAGING_AFTERMATH_VOID'), 'CAUSALITY_REVELATION_STAGING_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_SUSPENSE_RELATIONAL_AFTERMATH_VOID fires when every suspense-spike has no relationship shift within 2 scenes', async () => {
      const recs1175c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { suspenseDelta: 1 } : ([8, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runCA1175(recs1175c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_SUSPENSE_RELATIONAL_AFTERMATH_VOID'), 'CAUSALITY_SUSPENSE_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_SUSPENSE_RELATIONAL_AFTERMATH_VOID does not fire when a suspense-spike is followed by a relationship shift within 2 scenes', async () => {
      const recs1175cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { suspenseDelta: 1 } : ([1, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runCA1175(recs1175cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_SUSPENSE_RELATIONAL_AFTERMATH_VOID'), 'CAUSALITY_SUSPENSE_RELATIONAL_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1161 — causalityPass: causality revelation-emotional aftermath void, causality revelation-relational aftermath void, causality suspense-curiosity aftermath void', async () => {
    const runCA1161 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('CAUSALITY_REVELATION_EMOTIONAL_AFTERMATH_VOID fires when every revelation has no emotional shift within 2 scenes', async () => {
      const recs1161a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { revelation: 'a hidden truth surfaces' } : ([8, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runCA1161(recs1161a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_REVELATION_EMOTIONAL_AFTERMATH_VOID'), 'CAUSALITY_REVELATION_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_REVELATION_EMOTIONAL_AFTERMATH_VOID does not fire when a revelation is followed by an emotional shift within 2 scenes', async () => {
      const recs1161an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { revelation: 'a hidden truth surfaces' } : ([1, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runCA1161(recs1161an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_REVELATION_EMOTIONAL_AFTERMATH_VOID'), 'CAUSALITY_REVELATION_EMOTIONAL_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_REVELATION_RELATIONAL_AFTERMATH_VOID fires when every revelation has no relationship shift within 2 scenes', async () => {
      const recs1161b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { revelation: 'a hidden truth surfaces' } : ([8, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runCA1161(recs1161b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_REVELATION_RELATIONAL_AFTERMATH_VOID'), 'CAUSALITY_REVELATION_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_REVELATION_RELATIONAL_AFTERMATH_VOID does not fire when a revelation is followed by a relationship shift within 2 scenes', async () => {
      const recs1161bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { revelation: 'a hidden truth surfaces' } : ([1, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runCA1161(recs1161bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_REVELATION_RELATIONAL_AFTERMATH_VOID'), 'CAUSALITY_REVELATION_RELATIONAL_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_SUSPENSE_CURIOSITY_AFTERMATH_VOID fires when every suspense-rise has no curiosity rise within 2 scenes', async () => {
      const recs1161c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { suspenseDelta: 1 } : ([8, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runCA1161(recs1161c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_SUSPENSE_CURIOSITY_AFTERMATH_VOID'), 'CAUSALITY_SUSPENSE_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_SUSPENSE_CURIOSITY_AFTERMATH_VOID does not fire when a suspense-rise is followed by a curiosity rise within 2 scenes', async () => {
      const recs1161cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { suspenseDelta: 1 } : ([1, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runCA1161(recs1161cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_SUSPENSE_CURIOSITY_AFTERMATH_VOID'), 'CAUSALITY_SUSPENSE_CURIOSITY_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1147 — causalityPass: causality turn-dialogue-highlight aftermath void, causality revelation-curiosity aftermath void, causality suspense-emotional aftermath void', async () => {
    const runCA1147 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('CAUSALITY_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when every dramatic turn has no highlighted dialogue within 2 scenes', async () => {
      const recs1147a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { dramaticTurn: 'reversal' } : ([8, 9].includes(i) ? { dialogueHighlights: ['a memorable line'] } : {})));
      const res = await runCA1147(recs1147a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'CAUSALITY_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a dramatic turn is followed by highlighted dialogue within 2 scenes', async () => {
      const recs1147an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { dramaticTurn: 'reversal' } : ([1, 9].includes(i) ? { dialogueHighlights: ['a memorable line'] } : {})));
      const res = await runCA1147(recs1147an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'CAUSALITY_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_REVELATION_CURIOSITY_AFTERMATH_VOID fires when every revelation has no curiosity rise within 2 scenes', async () => {
      const recs1147b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { revelation: 'a hidden truth surfaces' } : ([8, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runCA1147(recs1147b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_REVELATION_CURIOSITY_AFTERMATH_VOID'), 'CAUSALITY_REVELATION_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_REVELATION_CURIOSITY_AFTERMATH_VOID does not fire when a revelation is followed by a curiosity rise within 2 scenes', async () => {
      const recs1147bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { revelation: 'a hidden truth surfaces' } : ([1, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runCA1147(recs1147bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_REVELATION_CURIOSITY_AFTERMATH_VOID'), 'CAUSALITY_REVELATION_CURIOSITY_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_SUSPENSE_EMOTIONAL_AFTERMATH_VOID fires when every suspense-rise has no emotional shift within 2 scenes', async () => {
      const recs1147c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { suspenseDelta: 1 } : ([8, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runCA1147(recs1147c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_SUSPENSE_EMOTIONAL_AFTERMATH_VOID'), 'CAUSALITY_SUSPENSE_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_SUSPENSE_EMOTIONAL_AFTERMATH_VOID does not fire when a suspense-rise is followed by an emotional shift within 2 scenes', async () => {
      const recs1147cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { suspenseDelta: 1 } : ([1, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runCA1147(recs1147cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_SUSPENSE_EMOTIONAL_AFTERMATH_VOID'), 'CAUSALITY_SUSPENSE_EMOTIONAL_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1133 — causalityPass: causality clock-staging aftermath void, causality turn-relational aftermath void, causality turn-staging aftermath void', async () => {
    const runCA1133 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('CAUSALITY_CLOCK_STAGING_AFTERMATH_VOID fires when every clock-raise has no heavily-staged scene within 2 scenes', async () => {
      const recs1133a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { clockRaised: true } : ([8, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runCA1133(recs1133a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_CLOCK_STAGING_AFTERMATH_VOID'), 'CAUSALITY_CLOCK_STAGING_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_CLOCK_STAGING_AFTERMATH_VOID does not fire when a clock-raise is followed by a heavily-staged scene within 2 scenes', async () => {
      const recs1133an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { clockRaised: true } : ([1, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runCA1133(recs1133an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_CLOCK_STAGING_AFTERMATH_VOID'), 'CAUSALITY_CLOCK_STAGING_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_TURN_RELATIONAL_AFTERMATH_VOID fires when every dramatic turn has no relationship shift within 2 scenes', async () => {
      const recs1133b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { dramaticTurn: 'reversal' } : ([8, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runCA1133(recs1133b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_TURN_RELATIONAL_AFTERMATH_VOID'), 'CAUSALITY_TURN_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_TURN_RELATIONAL_AFTERMATH_VOID does not fire when a dramatic turn is followed by a relationship shift within 2 scenes', async () => {
      const recs1133bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { dramaticTurn: 'reversal' } : ([1, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runCA1133(recs1133bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_TURN_RELATIONAL_AFTERMATH_VOID'), 'CAUSALITY_TURN_RELATIONAL_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_TURN_STAGING_AFTERMATH_VOID fires when every dramatic turn has no heavily-staged scene within 2 scenes', async () => {
      const recs1133c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { dramaticTurn: 'reversal' } : ([8, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runCA1133(recs1133c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_TURN_STAGING_AFTERMATH_VOID'), 'CAUSALITY_TURN_STAGING_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_TURN_STAGING_AFTERMATH_VOID does not fire when a dramatic turn is followed by a heavily-staged scene within 2 scenes', async () => {
      const recs1133cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { dramaticTurn: 'reversal' } : ([1, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runCA1133(recs1133cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_TURN_STAGING_AFTERMATH_VOID'), 'CAUSALITY_TURN_STAGING_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1119 — causalityPass: causality clock-suspense aftermath void, causality clock-dialogue-highlight aftermath void, causality turn-emotional aftermath void', async () => {
    const runCA1119 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('CAUSALITY_CLOCK_SUSPENSE_AFTERMATH_VOID fires when every clock-raise has no suspense rise within 2 scenes', async () => {
      const recs1119a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { clockRaised: true } : ([8, 9].includes(i) ? { suspenseDelta: 1 } : {})));
      const res = await runCA1119(recs1119a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_CLOCK_SUSPENSE_AFTERMATH_VOID'), 'CAUSALITY_CLOCK_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_CLOCK_SUSPENSE_AFTERMATH_VOID does not fire when a clock-raise is followed by a suspense rise within 2 scenes', async () => {
      const recs1119an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { clockRaised: true } : ([1, 9].includes(i) ? { suspenseDelta: 1 } : {})));
      const res = await runCA1119(recs1119an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_CLOCK_SUSPENSE_AFTERMATH_VOID'), 'CAUSALITY_CLOCK_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when every clock-raise has no highlighted dialogue within 2 scenes', async () => {
      const recs1119b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { clockRaised: true } : ([8, 9].includes(i) ? { dialogueHighlights: ['a memorable line'] } : {})));
      const res = await runCA1119(recs1119b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'CAUSALITY_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a clock-raise is followed by highlighted dialogue within 2 scenes', async () => {
      const recs1119bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { clockRaised: true } : ([1, 9].includes(i) ? { dialogueHighlights: ['a memorable line'] } : {})));
      const res = await runCA1119(recs1119bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'CAUSALITY_CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_TURN_EMOTIONAL_AFTERMATH_VOID fires when every dramatic turn has no emotional shift within 2 scenes', async () => {
      const recs1119c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { dramaticTurn: 'reversal' } : ([8, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runCA1119(recs1119c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_TURN_EMOTIONAL_AFTERMATH_VOID'), 'CAUSALITY_TURN_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_TURN_EMOTIONAL_AFTERMATH_VOID does not fire when a dramatic turn is followed by an emotional shift within 2 scenes', async () => {
      const recs1119cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { dramaticTurn: 'reversal' } : ([1, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runCA1119(recs1119cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_TURN_EMOTIONAL_AFTERMATH_VOID'), 'CAUSALITY_TURN_EMOTIONAL_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1105 — causalityPass: causality clock-emotional aftermath void, causality clock-relational aftermath void, causality turn-curiosity aftermath void', async () => {
    const runCA1105 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('CAUSALITY_CLOCK_EMOTIONAL_AFTERMATH_VOID fires when every clock-raise has no emotional shift within 2 scenes', async () => {
      const recs1105a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { clockRaised: true } : ([8, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runCA1105(recs1105a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_CLOCK_EMOTIONAL_AFTERMATH_VOID'), 'CAUSALITY_CLOCK_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_CLOCK_EMOTIONAL_AFTERMATH_VOID does not fire when a clock-raise is followed by an emotional shift within 2 scenes', async () => {
      const recs1105an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { clockRaised: true } : ([1, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runCA1105(recs1105an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_CLOCK_EMOTIONAL_AFTERMATH_VOID'), 'CAUSALITY_CLOCK_EMOTIONAL_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_CLOCK_RELATIONAL_AFTERMATH_VOID fires when every clock-raise has no relationship shift within 2 scenes', async () => {
      const recs1105b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { clockRaised: true } : ([8, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runCA1105(recs1105b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_CLOCK_RELATIONAL_AFTERMATH_VOID'), 'CAUSALITY_CLOCK_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_CLOCK_RELATIONAL_AFTERMATH_VOID does not fire when a clock-raise is followed by a relationship shift within 2 scenes', async () => {
      const recs1105bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { clockRaised: true } : ([1, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runCA1105(recs1105bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_CLOCK_RELATIONAL_AFTERMATH_VOID'), 'CAUSALITY_CLOCK_RELATIONAL_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_TURN_CURIOSITY_AFTERMATH_VOID fires when every dramatic turn has no curiosity rise within 2 scenes', async () => {
      const recs1105c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { dramaticTurn: 'reversal' } : ([8, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runCA1105(recs1105c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_TURN_CURIOSITY_AFTERMATH_VOID'), 'CAUSALITY_TURN_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_TURN_CURIOSITY_AFTERMATH_VOID does not fire when a dramatic turn is followed by a curiosity rise within 2 scenes', async () => {
      const recs1105cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { dramaticTurn: 'reversal' } : ([1, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runCA1105(recs1105cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_TURN_CURIOSITY_AFTERMATH_VOID'), 'CAUSALITY_TURN_CURIOSITY_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1091 — causalityPass: causality payoff-staging aftermath void, causality clock-curiosity aftermath void, causality turn-suspense aftermath void', async () => {
    const runCA1091 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('CAUSALITY_PAYOFF_STAGING_AFTERMATH_VOID fires when every payoff has no heavily-staged scene within 2 scenes', async () => {
      const recs1091a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { payoffSetupIds: ['p1'] } : ([8, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runCA1091(recs1091a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_PAYOFF_STAGING_AFTERMATH_VOID'), 'CAUSALITY_PAYOFF_STAGING_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_PAYOFF_STAGING_AFTERMATH_VOID does not fire when a payoff is followed by a heavily-staged scene within 2 scenes', async () => {
      const recs1091an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { payoffSetupIds: ['p1'] } : ([1, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runCA1091(recs1091an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_PAYOFF_STAGING_AFTERMATH_VOID'), 'CAUSALITY_PAYOFF_STAGING_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_CLOCK_CURIOSITY_AFTERMATH_VOID fires when every clock-raise has no curiosity rise within 2 scenes', async () => {
      const recs1091b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { clockRaised: true } : ([8, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runCA1091(recs1091b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_CLOCK_CURIOSITY_AFTERMATH_VOID'), 'CAUSALITY_CLOCK_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_CLOCK_CURIOSITY_AFTERMATH_VOID does not fire when a clock-raise is followed by a curiosity rise within 2 scenes', async () => {
      const recs1091bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { clockRaised: true } : ([1, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runCA1091(recs1091bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_CLOCK_CURIOSITY_AFTERMATH_VOID'), 'CAUSALITY_CLOCK_CURIOSITY_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_TURN_SUSPENSE_AFTERMATH_VOID fires when every dramatic turn has no suspense rise within 2 scenes', async () => {
      const recs1091c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { dramaticTurn: 'reversal' } : ([8, 9].includes(i) ? { suspenseDelta: 1 } : {})));
      const res = await runCA1091(recs1091c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_TURN_SUSPENSE_AFTERMATH_VOID'), 'CAUSALITY_TURN_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_TURN_SUSPENSE_AFTERMATH_VOID does not fire when a dramatic turn is followed by a suspense rise within 2 scenes', async () => {
      const recs1091cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { dramaticTurn: 'reversal' } : ([1, 9].includes(i) ? { suspenseDelta: 1 } : {})));
      const res = await runCA1091(recs1091cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_TURN_SUSPENSE_AFTERMATH_VOID'), 'CAUSALITY_TURN_SUSPENSE_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1077 — causalityPass: causality seed-staging aftermath void, causality open-thread-staging aftermath void, causality payoff-dialogue-highlight aftermath void', async () => {
    const runCA1077 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('CAUSALITY_SEED_STAGING_AFTERMATH_VOID fires when every seed has no visually dense scene within 2 scenes', async () => {
      const recs1077a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { seededClueIds: ['c1'] } : ([8, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runCA1077(recs1077a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_SEED_STAGING_AFTERMATH_VOID'), 'CAUSALITY_SEED_STAGING_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_SEED_STAGING_AFTERMATH_VOID does not fire when a seed is followed by a visually dense scene within 2 scenes', async () => {
      const recs1077an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { seededClueIds: ['c1'] } : ([1, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runCA1077(recs1077an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_SEED_STAGING_AFTERMATH_VOID'), 'CAUSALITY_SEED_STAGING_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_OPEN_THREAD_STAGING_AFTERMATH_VOID fires when every open-thread scene has no visually dense scene within 2 scenes', async () => {
      const recs1077b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { unresolvedClues: ['c1'] } : ([8, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runCA1077(recs1077b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_OPEN_THREAD_STAGING_AFTERMATH_VOID'), 'CAUSALITY_OPEN_THREAD_STAGING_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_OPEN_THREAD_STAGING_AFTERMATH_VOID does not fire when an open-thread scene is followed by a visually dense scene within 2 scenes', async () => {
      const recs1077bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { unresolvedClues: ['c1'] } : ([1, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runCA1077(recs1077bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_OPEN_THREAD_STAGING_AFTERMATH_VOID'), 'CAUSALITY_OPEN_THREAD_STAGING_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when every payoff has no highlighted dialogue within 2 scenes', async () => {
      const recs1077c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { payoffSetupIds: ['p1'] } : ([8, 9].includes(i) ? { dialogueHighlights: ['a memorable line'] } : {})));
      const res = await runCA1077(recs1077c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'CAUSALITY_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a payoff is followed by highlighted dialogue within 2 scenes', async () => {
      const recs1077cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { payoffSetupIds: ['p1'] } : ([1, 9].includes(i) ? { dialogueHighlights: ['a memorable line'] } : {})));
      const res = await runCA1077(recs1077cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'CAUSALITY_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1063 — causalityPass: causality stakes-staging aftermath void, causality seed-dialogue-highlight aftermath void, causality open-thread-dialogue-highlight aftermath void', async () => {
    const runCA1063 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('CAUSALITY_STAKES_STAGING_AFTERMATH_VOID fires when every stakes-raise has no visually dense scene within 2 scenes', async () => {
      const recs1063a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { purpose: 'raise_stakes' } : ([8, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runCA1063(recs1063a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_STAKES_STAGING_AFTERMATH_VOID'), 'CAUSALITY_STAKES_STAGING_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_STAKES_STAGING_AFTERMATH_VOID does not fire when a stakes-raise is followed by a visually dense scene within 2 scenes', async () => {
      const recs1063an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { purpose: 'raise_stakes' } : ([1, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runCA1063(recs1063an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_STAKES_STAGING_AFTERMATH_VOID'), 'CAUSALITY_STAKES_STAGING_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when every seed has no highlighted dialogue within 2 scenes', async () => {
      const recs1063b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { seededClueIds: ['c1'] } : ([8, 9].includes(i) ? { dialogueHighlights: ['a memorable line'] } : {})));
      const res = await runCA1063(recs1063b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'CAUSALITY_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a seed is followed by highlighted dialogue within 2 scenes', async () => {
      const recs1063bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { seededClueIds: ['c1'] } : ([1, 9].includes(i) ? { dialogueHighlights: ['a memorable line'] } : {})));
      const res = await runCA1063(recs1063bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'CAUSALITY_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when every open-thread scene has no highlighted dialogue within 2 scenes', async () => {
      const recs1063c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { unresolvedClues: ['c1'] } : ([8, 9].includes(i) ? { dialogueHighlights: ['a memorable line'] } : {})));
      const res = await runCA1063(recs1063c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'CAUSALITY_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when an open-thread scene is followed by highlighted dialogue within 2 scenes', async () => {
      const recs1063cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { unresolvedClues: ['c1'] } : ([1, 9].includes(i) ? { dialogueHighlights: ['a memorable line'] } : {})));
      const res = await runCA1063(recs1063cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'CAUSALITY_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1049 — causalityPass: causality seed-relational aftermath void, causality open-thread-curiosity aftermath void, causality stakes-dialogue-highlight aftermath void', async () => {
    const runCA1049 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('CAUSALITY_SEED_RELATIONAL_AFTERMATH_VOID fires when every seed has no relationship shift within 2 scenes', async () => {
      const recs1049a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { seededClueIds: ['c1'] } : ([8, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runCA1049(recs1049a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_SEED_RELATIONAL_AFTERMATH_VOID'), 'CAUSALITY_SEED_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_SEED_RELATIONAL_AFTERMATH_VOID does not fire when a seed is followed by a relationship shift within 2 scenes', async () => {
      const recs1049an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { seededClueIds: ['c1'] } : ([1, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runCA1049(recs1049an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_SEED_RELATIONAL_AFTERMATH_VOID'), 'CAUSALITY_SEED_RELATIONAL_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID fires when every open-thread scene has no curiosity rise within 2 scenes', async () => {
      const recs1049b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { unresolvedClues: ['c1'] } : ([8, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runCA1049(recs1049b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID'), 'CAUSALITY_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID does not fire when an open-thread scene is followed by a curiosity rise within 2 scenes', async () => {
      const recs1049bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { unresolvedClues: ['c1'] } : ([1, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runCA1049(recs1049bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID'), 'CAUSALITY_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when every stakes-raise has no highlighted dialogue within 2 scenes', async () => {
      const recs1049c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { purpose: 'raise_stakes' } : ([8, 9].includes(i) ? { dialogueHighlights: ['a memorable line'] } : {})));
      const res = await runCA1049(recs1049c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'CAUSALITY_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a stakes-raise is followed by highlighted dialogue within 2 scenes', async () => {
      const recs1049cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { purpose: 'raise_stakes' } : ([1, 9].includes(i) ? { dialogueHighlights: ['a memorable line'] } : {})));
      const res = await runCA1049(recs1049cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'CAUSALITY_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1035 — causalityPass: causality seed-suspense aftermath void, causality payoff-curiosity aftermath void, causality open-thread-relational aftermath void', async () => {
    const runCA1035 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('CAUSALITY_SEED_SUSPENSE_AFTERMATH_VOID fires when every seed has no rise in suspense within 2 scenes', async () => {
      const recs1035a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { seededClueIds: ['c1'] } : ([8, 9].includes(i) ? { suspenseDelta: 1 } : {})));
      const res = await runCA1035(recs1035a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_SEED_SUSPENSE_AFTERMATH_VOID'), 'CAUSALITY_SEED_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_SEED_SUSPENSE_AFTERMATH_VOID does not fire when a seed is followed by rising suspense within 2 scenes', async () => {
      const recs1035an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { seededClueIds: ['c1'] } : ([1, 9].includes(i) ? { suspenseDelta: 1 } : {})));
      const res = await runCA1035(recs1035an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_SEED_SUSPENSE_AFTERMATH_VOID'), 'CAUSALITY_SEED_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_PAYOFF_CURIOSITY_AFTERMATH_VOID fires when every payoff has no curiosity rise within 2 scenes', async () => {
      const recs1035b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { payoffSetupIds: ['p1'] } : ([8, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runCA1035(recs1035b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_PAYOFF_CURIOSITY_AFTERMATH_VOID'), 'CAUSALITY_PAYOFF_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_PAYOFF_CURIOSITY_AFTERMATH_VOID does not fire when a payoff is followed by a curiosity rise within 2 scenes', async () => {
      const recs1035bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { payoffSetupIds: ['p1'] } : ([1, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runCA1035(recs1035bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_PAYOFF_CURIOSITY_AFTERMATH_VOID'), 'CAUSALITY_PAYOFF_CURIOSITY_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID fires when every open-thread scene has no relationship shift within 2 scenes', async () => {
      const recs1035c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { unresolvedClues: ['c1'] } : ([8, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runCA1035(recs1035c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID'), 'CAUSALITY_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID does not fire when an open-thread scene is followed by a relationship shift within 2 scenes', async () => {
      const recs1035cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { unresolvedClues: ['c1'] } : ([1, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runCA1035(recs1035cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID'), 'CAUSALITY_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1021 — causalityPass: causality stakes-relational aftermath void, causality payoff-suspense aftermath void, causality open-thread-emotional aftermath void', async () => {
    const runCA1021 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('CAUSALITY_STAKES_RELATIONAL_AFTERMATH_VOID fires when every stakes-raise has no relationship shift within 2 scenes', async () => {
      const recs1021a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { purpose: 'raise_stakes' } : ([8, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runCA1021(recs1021a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_STAKES_RELATIONAL_AFTERMATH_VOID'), 'CAUSALITY_STAKES_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_STAKES_RELATIONAL_AFTERMATH_VOID does not fire when a stakes-raise is followed by a relationship shift within 2 scenes', async () => {
      const recs1021an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { purpose: 'raise_stakes' } : ([1, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runCA1021(recs1021an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_STAKES_RELATIONAL_AFTERMATH_VOID'), 'CAUSALITY_STAKES_RELATIONAL_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_PAYOFF_SUSPENSE_AFTERMATH_VOID fires when every payoff has no rise in suspense within 2 scenes', async () => {
      const recs1021b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { payoffSetupIds: ['p1'] } : ([8, 9].includes(i) ? { suspenseDelta: 1 } : {})));
      const res = await runCA1021(recs1021b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_PAYOFF_SUSPENSE_AFTERMATH_VOID'), 'CAUSALITY_PAYOFF_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_PAYOFF_SUSPENSE_AFTERMATH_VOID does not fire when a payoff is followed by rising suspense within 2 scenes', async () => {
      const recs1021bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { payoffSetupIds: ['p1'] } : ([1, 9].includes(i) ? { suspenseDelta: 1 } : {})));
      const res = await runCA1021(recs1021bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_PAYOFF_SUSPENSE_AFTERMATH_VOID'), 'CAUSALITY_PAYOFF_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID fires when every open-thread scene has no emotional shift within 2 scenes', async () => {
      const recs1021c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { unresolvedClues: ['c1'] } : ([8, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runCA1021(recs1021c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID'), 'CAUSALITY_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID does not fire when an open-thread scene is followed by an emotional shift within 2 scenes', async () => {
      const recs1021cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { unresolvedClues: ['c1'] } : ([1, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runCA1021(recs1021cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID'), 'CAUSALITY_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1007 — causalityPass: causality stakes-suspense aftermath void, causality seed-emotional aftermath void, causality payoff-relational aftermath void', async () => {
    const runCA1007 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('CAUSALITY_STAKES_SUSPENSE_AFTERMATH_VOID fires when every stakes-raise has no rise in suspense within 2 scenes', async () => {
      const recs1007a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { purpose: 'raise_stakes' } : ([8, 9].includes(i) ? { suspenseDelta: 1 } : {})));
      const res = await runCA1007(recs1007a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_STAKES_SUSPENSE_AFTERMATH_VOID'), 'CAUSALITY_STAKES_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_STAKES_SUSPENSE_AFTERMATH_VOID does not fire when a stakes-raise is followed by rising suspense within 2 scenes', async () => {
      const recs1007an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { purpose: 'raise_stakes' } : ([1, 9].includes(i) ? { suspenseDelta: 1 } : {})));
      const res = await runCA1007(recs1007an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_STAKES_SUSPENSE_AFTERMATH_VOID'), 'CAUSALITY_STAKES_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_SEED_EMOTIONAL_AFTERMATH_VOID fires when every seed has no emotional shift within 2 scenes', async () => {
      const recs1007b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { seededClueIds: ['c1'] } : ([8, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runCA1007(recs1007b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_SEED_EMOTIONAL_AFTERMATH_VOID'), 'CAUSALITY_SEED_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_SEED_EMOTIONAL_AFTERMATH_VOID does not fire when a seed is followed by an emotional shift within 2 scenes', async () => {
      const recs1007bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { seededClueIds: ['c1'] } : ([1, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runCA1007(recs1007bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_SEED_EMOTIONAL_AFTERMATH_VOID'), 'CAUSALITY_SEED_EMOTIONAL_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_PAYOFF_RELATIONAL_AFTERMATH_VOID fires when every payoff has no relationship shift within 2 scenes', async () => {
      const recs1007c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { payoffSetupIds: ['s1'] } : ([8, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runCA1007(recs1007c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_PAYOFF_RELATIONAL_AFTERMATH_VOID'), 'CAUSALITY_PAYOFF_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_PAYOFF_RELATIONAL_AFTERMATH_VOID does not fire when a payoff is followed by a relationship shift within 2 scenes', async () => {
      const recs1007cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { payoffSetupIds: ['s1'] } : ([1, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runCA1007(recs1007cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_PAYOFF_RELATIONAL_AFTERMATH_VOID'), 'CAUSALITY_PAYOFF_RELATIONAL_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 993 — causalityPass: causality clock zone imbalance, causality stakes curiosity aftermath void, causality payoff emotional aftermath void', async () => {
    const runCA993 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched → no-fire.
    it('CAUSALITY_CLOCK_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of clock-raising scenes', async () => {
      const recs993a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { clockRaised: [0, 1, 2, 8, 9].includes(i) }));
      const res = await runCA993(recs993a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_CLOCK_ZONE_IMBALANCE'), 'CAUSALITY_CLOCK_ZONE_IMBALANCE should fire');
    });

    it('CAUSALITY_CLOCK_ZONE_IMBALANCE does not fire when clock-raising scenes touch every zone', async () => {
      const recs993an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { clockRaised: [0, 3, 5, 8].includes(i) }));
      const res = await runCA993(recs993an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_CLOCK_ZONE_IMBALANCE'), 'CAUSALITY_CLOCK_ZONE_IMBALANCE should not fire');
    });

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('CAUSALITY_STAKES_CURIOSITY_AFTERMATH_VOID fires when every stakes-raise has no curiosity raised within 2 scenes', async () => {
      const recs993b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { purpose: 'raise_stakes' } : ([8, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runCA993(recs993b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_STAKES_CURIOSITY_AFTERMATH_VOID'), 'CAUSALITY_STAKES_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_STAKES_CURIOSITY_AFTERMATH_VOID does not fire when a stakes-raise is followed by new curiosity within 2 scenes', async () => {
      const recs993bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { purpose: 'raise_stakes' } : ([1, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runCA993(recs993bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_STAKES_CURIOSITY_AFTERMATH_VOID'), 'CAUSALITY_STAKES_CURIOSITY_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_PAYOFF_EMOTIONAL_AFTERMATH_VOID fires when every payoff has no emotional shift within 2 scenes', async () => {
      const recs993c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { payoffSetupIds: ['s1'] } : ([8, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runCA993(recs993c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_PAYOFF_EMOTIONAL_AFTERMATH_VOID'), 'CAUSALITY_PAYOFF_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_PAYOFF_EMOTIONAL_AFTERMATH_VOID does not fire when a payoff is followed by an emotional shift within 2 scenes', async () => {
      const recs993cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { payoffSetupIds: ['s1'] } : ([1, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runCA993(recs993cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_PAYOFF_EMOTIONAL_AFTERMATH_VOID'), 'CAUSALITY_PAYOFF_EMOTIONAL_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 979 — causalityPass: causality stakes emotional aftermath void, causality seed curiosity aftermath void, causality open thread suspense aftermath void', async () => {
    const runCA979 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('CAUSALITY_STAKES_EMOTIONAL_AFTERMATH_VOID fires when every stakes-raise has no emotional shift within 2 scenes', async () => {
      const recs979a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { purpose: 'raise_stakes' } : ([8, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runCA979(recs979a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_STAKES_EMOTIONAL_AFTERMATH_VOID'), 'CAUSALITY_STAKES_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_STAKES_EMOTIONAL_AFTERMATH_VOID does not fire when a stakes-raise is followed by an emotional shift within 2 scenes', async () => {
      const recs979an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { purpose: 'raise_stakes' } : ([1, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runCA979(recs979an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_STAKES_EMOTIONAL_AFTERMATH_VOID'), 'CAUSALITY_STAKES_EMOTIONAL_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_SEED_CURIOSITY_AFTERMATH_VOID fires when every seed has no curiosity raised within 2 scenes', async () => {
      const recs979b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { seededClueIds: ['c1'] } : ([8, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runCA979(recs979b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_SEED_CURIOSITY_AFTERMATH_VOID'), 'CAUSALITY_SEED_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_SEED_CURIOSITY_AFTERMATH_VOID does not fire when a seed is followed by curiosity within 2 scenes', async () => {
      const recs979bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { seededClueIds: ['c1'] } : ([1, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runCA979(recs979bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_SEED_CURIOSITY_AFTERMATH_VOID'), 'CAUSALITY_SEED_CURIOSITY_AFTERMATH_VOID should not fire');
    });

    it('CAUSALITY_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID fires when every open thread has no suspense rise within 2 scenes', async () => {
      const recs979c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { unresolvedClues: ['q1'] } : ([8, 9].includes(i) ? { suspenseDelta: 1 } : {})));
      const res = await runCA979(recs979c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID'), 'CAUSALITY_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('CAUSALITY_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID does not fire when an open thread is followed by a suspense rise within 2 scenes', async () => {
      const recs979cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { unresolvedClues: ['q1'] } : ([1, 9].includes(i) ? { suspenseDelta: 1 } : {})));
      const res = await runCA979(recs979cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID'), 'CAUSALITY_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 965 — causalityPass: causality revelation zone imbalance, causality relationship zone imbalance, causality turn zone imbalance', async () => {
    const runCA965 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched → no-fire.
    it('CAUSALITY_REVELATION_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of revelation scenes', async () => {
      const recs965a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { revelation: [0, 1, 2, 8, 9].includes(i) ? 'a hidden truth surfaces' : null }));
      const res = await runCA965(recs965a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_REVELATION_ZONE_IMBALANCE'), 'CAUSALITY_REVELATION_ZONE_IMBALANCE should fire');
    });

    it('CAUSALITY_REVELATION_ZONE_IMBALANCE does not fire when revelation scenes touch every zone', async () => {
      const recs965an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { revelation: [0, 3, 5, 8].includes(i) ? 'a hidden truth surfaces' : null }));
      const res = await runCA965(recs965an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_REVELATION_ZONE_IMBALANCE'), 'CAUSALITY_REVELATION_ZONE_IMBALANCE should not fire');
    });

    it('CAUSALITY_RELATIONSHIP_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of relationship-shift scenes', async () => {
      const recs965b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { relationshipShifts: [0, 1, 2, 8, 9].includes(i) ? [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] : [] }));
      const res = await runCA965(recs965b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_RELATIONSHIP_ZONE_IMBALANCE'), 'CAUSALITY_RELATIONSHIP_ZONE_IMBALANCE should fire');
    });

    it('CAUSALITY_RELATIONSHIP_ZONE_IMBALANCE does not fire when relationship-shift scenes touch every zone', async () => {
      const recs965bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { relationshipShifts: [0, 3, 5, 8].includes(i) ? [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] : [] }));
      const res = await runCA965(recs965bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_RELATIONSHIP_ZONE_IMBALANCE'), 'CAUSALITY_RELATIONSHIP_ZONE_IMBALANCE should not fire');
    });

    it('CAUSALITY_TURN_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of dramatic-turn scenes', async () => {
      const recs965c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { dramaticTurn: [0, 1, 2, 8, 9].includes(i) ? 'reversal' : 'nothing' }));
      const res = await runCA965(recs965c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_TURN_ZONE_IMBALANCE'), 'CAUSALITY_TURN_ZONE_IMBALANCE should fire');
    });

    it('CAUSALITY_TURN_ZONE_IMBALANCE does not fire when dramatic-turn scenes touch every zone', async () => {
      const recs965cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { dramaticTurn: [0, 3, 5, 8].includes(i) ? 'reversal' : 'nothing' }));
      const res = await runCA965(recs965cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_TURN_ZONE_IMBALANCE'), 'CAUSALITY_TURN_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 951 — causalityPass: causality clock delta zone imbalance, causality payoff zone imbalance, causality seed zone imbalance', async () => {
    const runCA951 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched → no-fire.
    it('CAUSALITY_CLOCK_DELTA_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of clock-moving scenes', async () => {
      const recs951a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { clockDelta: [0, 1, 2, 8, 9].includes(i) ? 1 : 0 }));
      const res = await runCA951(recs951a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_CLOCK_DELTA_ZONE_IMBALANCE'), 'CAUSALITY_CLOCK_DELTA_ZONE_IMBALANCE should fire');
    });

    it('CAUSALITY_CLOCK_DELTA_ZONE_IMBALANCE does not fire when clock-moving scenes touch every zone', async () => {
      const recs951an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { clockDelta: [0, 3, 5, 8].includes(i) ? 1 : 0 }));
      const res = await runCA951(recs951an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_CLOCK_DELTA_ZONE_IMBALANCE'), 'CAUSALITY_CLOCK_DELTA_ZONE_IMBALANCE should not fire');
    });

    it('CAUSALITY_PAYOFF_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of payoff scenes', async () => {
      const recs951b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { payoffSetupIds: [0, 1, 2, 8, 9].includes(i) ? ['s1'] : [] }));
      const res = await runCA951(recs951b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_PAYOFF_ZONE_IMBALANCE'), 'CAUSALITY_PAYOFF_ZONE_IMBALANCE should fire');
    });

    it('CAUSALITY_PAYOFF_ZONE_IMBALANCE does not fire when payoff scenes touch every zone', async () => {
      const recs951bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { payoffSetupIds: [0, 3, 5, 8].includes(i) ? ['s1'] : [] }));
      const res = await runCA951(recs951bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_PAYOFF_ZONE_IMBALANCE'), 'CAUSALITY_PAYOFF_ZONE_IMBALANCE should not fire');
    });

    it('CAUSALITY_SEED_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of seeding scenes', async () => {
      const recs951c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { seededClueIds: [0, 1, 2, 8, 9].includes(i) ? ['c1'] : [] }));
      const res = await runCA951(recs951c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_SEED_ZONE_IMBALANCE'), 'CAUSALITY_SEED_ZONE_IMBALANCE should fire');
    });

    it('CAUSALITY_SEED_ZONE_IMBALANCE does not fire when seeding scenes touch every zone', async () => {
      const recs951cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { seededClueIds: [0, 3, 5, 8].includes(i) ? ['c1'] : [] }));
      const res = await runCA951(recs951cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_SEED_ZONE_IMBALANCE'), 'CAUSALITY_SEED_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 937 — causalityPass: causality revelation purpose zone imbalance, causality positive emotion zone imbalance, causality curiosity zone imbalance', async () => {
    const runCA937 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched → no-fire.
    it('CAUSALITY_REVELATION_PURPOSE_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of revelation-purposed scenes', async () => {
      const recs937a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'revelation' : 'establish_world' }));
      const res = await runCA937(recs937a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_REVELATION_PURPOSE_ZONE_IMBALANCE'), 'CAUSALITY_REVELATION_PURPOSE_ZONE_IMBALANCE should fire');
    });

    it('CAUSALITY_REVELATION_PURPOSE_ZONE_IMBALANCE does not fire when revelation-purposed scenes touch every zone', async () => {
      const recs937an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'revelation' : 'establish_world' }));
      const res = await runCA937(recs937an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_REVELATION_PURPOSE_ZONE_IMBALANCE'), 'CAUSALITY_REVELATION_PURPOSE_ZONE_IMBALANCE should not fire');
    });

    it('CAUSALITY_POSITIVE_EMOTION_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of positive-shift scenes', async () => {
      const recs937b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2, 8, 9].includes(i) ? 'positive' : 'neutral' }));
      const res = await runCA937(recs937b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_POSITIVE_EMOTION_ZONE_IMBALANCE'), 'CAUSALITY_POSITIVE_EMOTION_ZONE_IMBALANCE should fire');
    });

    it('CAUSALITY_POSITIVE_EMOTION_ZONE_IMBALANCE does not fire when positive-shift scenes touch every zone', async () => {
      const recs937bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 3, 5, 8].includes(i) ? 'positive' : 'neutral' }));
      const res = await runCA937(recs937bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_POSITIVE_EMOTION_ZONE_IMBALANCE'), 'CAUSALITY_POSITIVE_EMOTION_ZONE_IMBALANCE should not fire');
    });

    it('CAUSALITY_CURIOSITY_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of curiosity-raising scenes', async () => {
      const recs937c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 1, 2, 8, 9].includes(i) ? 2 : 0 }));
      const res = await runCA937(recs937c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_CURIOSITY_ZONE_IMBALANCE'), 'CAUSALITY_CURIOSITY_ZONE_IMBALANCE should fire');
    });

    it('CAUSALITY_CURIOSITY_ZONE_IMBALANCE does not fire when curiosity-raising scenes touch every zone', async () => {
      const recs937cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 3, 5, 8].includes(i) ? 2 : 0 }));
      const res = await runCA937(recs937cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_CURIOSITY_ZONE_IMBALANCE'), 'CAUSALITY_CURIOSITY_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 923 — causalityPass: causality revelation purpose zone cluster, causality revelation purpose drought run, causality negative emotion zone imbalance', async () => {
    const runCA923 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // CAUSALITY_REVELATION_PURPOSE_ZONE_CLUSTER fire: n=9, 3 thirds; revelation-purposed scenes at
    // 0,1,2 (opening third) → 3/3 = 100% > 75%. Filler 'establish_world'.
    it('CAUSALITY_REVELATION_PURPOSE_ZONE_CLUSTER fires when >75% of revelation-purposed scenes cluster in one third', async () => {
      const recs923a = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'revelation' : 'establish_world' }));
      const res = await runCA923(recs923a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_REVELATION_PURPOSE_ZONE_CLUSTER'), 'CAUSALITY_REVELATION_PURPOSE_ZONE_CLUSTER should fire');
    });

    it('CAUSALITY_REVELATION_PURPOSE_ZONE_CLUSTER does not fire when revelation-purposed scenes spread across thirds', async () => {
      const recs923an = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'revelation' : 'establish_world' }));
      const res = await runCA923(recs923an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_REVELATION_PURPOSE_ZONE_CLUSTER'), 'CAUSALITY_REVELATION_PURPOSE_ZONE_CLUSTER should not fire');
    });

    // CAUSALITY_REVELATION_PURPOSE_DROUGHT_RUN fire: n=10, revelation-purposed scenes at 0, 8, 9
    // (minPresentCount 3), leaving a 7-scene gap (indices 1-7) — run of 7 >= threshold 6.
    it('CAUSALITY_REVELATION_PURPOSE_DROUGHT_RUN fires when a long run has no revelation-purposed scene', async () => {
      const recs923b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 8, 9].includes(i) ? 'revelation' : 'establish_world' }));
      const res = await runCA923(recs923b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_REVELATION_PURPOSE_DROUGHT_RUN'), 'CAUSALITY_REVELATION_PURPOSE_DROUGHT_RUN should fire');
    });

    it('CAUSALITY_REVELATION_PURPOSE_DROUGHT_RUN does not fire when revelation-purposed scenes are evenly spread', async () => {
      const recs923bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'revelation' : 'establish_world' }));
      const res = await runCA923(recs923bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_REVELATION_PURPOSE_DROUGHT_RUN'), 'CAUSALITY_REVELATION_PURPOSE_DROUGHT_RUN should not fire');
    });

    // CAUSALITY_NEGATIVE_EMOTION_ZONE_IMBALANCE fire: n=10, Z0={0,1,2}, Z1={3,4}, Z2={5,6,7},
    // Z3={8,9}; negative at 0,1,2,8,9 → Z0 3/5=60% (bloat), Z1 and Z2 empty. Filler 'neutral'.
    it('CAUSALITY_NEGATIVE_EMOTION_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of negative-shift scenes', async () => {
      const recs923c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2, 8, 9].includes(i) ? 'negative' : 'neutral' }));
      const res = await runCA923(recs923c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_NEGATIVE_EMOTION_ZONE_IMBALANCE'), 'CAUSALITY_NEGATIVE_EMOTION_ZONE_IMBALANCE should fire');
    });

    it('CAUSALITY_NEGATIVE_EMOTION_ZONE_IMBALANCE does not fire when negative-shift scenes touch every zone', async () => {
      const recs923cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 3, 5, 8].includes(i) ? 'negative' : 'neutral' }));
      const res = await runCA923(recs923cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_NEGATIVE_EMOTION_ZONE_IMBALANCE'), 'CAUSALITY_NEGATIVE_EMOTION_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 909 — causalityPass: causality introduce conflict zone imbalance, causality character moment zone imbalance, causality stakes zone imbalance', async () => {
    const runCA909 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched →
    // no-fire. Filler is 'establish_world' (not one of the tested purpose values).
    it('CAUSALITY_INTRODUCE_CONFLICT_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of conflict-introducing scenes', async () => {
      const recs909a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'introduce_conflict' : 'establish_world' }),
      );
      const res = await runCA909(recs909a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_INTRODUCE_CONFLICT_ZONE_IMBALANCE'), 'CAUSALITY_INTRODUCE_CONFLICT_ZONE_IMBALANCE should fire');
    });

    it('CAUSALITY_INTRODUCE_CONFLICT_ZONE_IMBALANCE does not fire when conflict-introducing scenes touch every zone', async () => {
      const recs909an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'introduce_conflict' : 'establish_world' }),
      );
      const res = await runCA909(recs909an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_INTRODUCE_CONFLICT_ZONE_IMBALANCE'), 'CAUSALITY_INTRODUCE_CONFLICT_ZONE_IMBALANCE should not fire');
    });

    it('CAUSALITY_CHARACTER_MOMENT_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of character-moment scenes', async () => {
      const recs909b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'character_moment' : 'establish_world' }),
      );
      const res = await runCA909(recs909b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_CHARACTER_MOMENT_ZONE_IMBALANCE'), 'CAUSALITY_CHARACTER_MOMENT_ZONE_IMBALANCE should fire');
    });

    it('CAUSALITY_CHARACTER_MOMENT_ZONE_IMBALANCE does not fire when character-moment scenes touch every zone', async () => {
      const recs909bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'character_moment' : 'establish_world' }),
      );
      const res = await runCA909(recs909bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_CHARACTER_MOMENT_ZONE_IMBALANCE'), 'CAUSALITY_CHARACTER_MOMENT_ZONE_IMBALANCE should not fire');
    });

    it('CAUSALITY_STAKES_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of stakes-raising scenes', async () => {
      const recs909c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'raise_stakes' : 'establish_world' }),
      );
      const res = await runCA909(recs909c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_STAKES_ZONE_IMBALANCE'), 'CAUSALITY_STAKES_ZONE_IMBALANCE should fire');
    });

    it('CAUSALITY_STAKES_ZONE_IMBALANCE does not fire when stakes-raising scenes touch every zone', async () => {
      const recs909cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'raise_stakes' : 'establish_world' }),
      );
      const res = await runCA909(recs909cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_STAKES_ZONE_IMBALANCE'), 'CAUSALITY_STAKES_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 895 — causalityPass: causality resolution zone imbalance, causality complicate zone imbalance, causality turning point zone imbalance', async () => {
    const runCA895 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // CAUSALITY_RESOLUTION_ZONE_IMBALANCE fire:
    // n=10, 4 zones (Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}); resolution at 0,1,2,8,9 →
    // Z0 has 3/5=60% (bloat, >=50%), Z1 and Z2 are empty.
    it('CAUSALITY_RESOLUTION_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of resolution-purposed scenes', async () => {
      const recs895a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'resolution' : 'establish_world' }),
      );
      const res = await runCA895(recs895a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_RESOLUTION_ZONE_IMBALANCE'), 'CAUSALITY_RESOLUTION_ZONE_IMBALANCE should fire');
    });

    it('CAUSALITY_RESOLUTION_ZONE_IMBALANCE does not fire when resolution-purposed scenes touch every zone', async () => {
      const recs895an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'resolution' : 'establish_world' }),
      );
      const res = await runCA895(recs895an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_RESOLUTION_ZONE_IMBALANCE'), 'CAUSALITY_RESOLUTION_ZONE_IMBALANCE should not fire');
    });

    // CAUSALITY_COMPLICATE_ZONE_IMBALANCE fire: same zone geometry as above.
    it('CAUSALITY_COMPLICATE_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of complicating scenes', async () => {
      const recs895b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'complicate' : 'establish_world' }),
      );
      const res = await runCA895(recs895b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_COMPLICATE_ZONE_IMBALANCE'), 'CAUSALITY_COMPLICATE_ZONE_IMBALANCE should fire');
    });

    it('CAUSALITY_COMPLICATE_ZONE_IMBALANCE does not fire when complicating scenes touch every zone', async () => {
      const recs895bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'complicate' : 'establish_world' }),
      );
      const res = await runCA895(recs895bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_COMPLICATE_ZONE_IMBALANCE'), 'CAUSALITY_COMPLICATE_ZONE_IMBALANCE should not fire');
    });

    // CAUSALITY_TURNING_POINT_ZONE_IMBALANCE fire: same zone geometry as above.
    it('CAUSALITY_TURNING_POINT_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of turning-point scenes', async () => {
      const recs895c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'turning_point' : 'establish_world' }),
      );
      const res = await runCA895(recs895c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_TURNING_POINT_ZONE_IMBALANCE'), 'CAUSALITY_TURNING_POINT_ZONE_IMBALANCE should fire');
    });

    it('CAUSALITY_TURNING_POINT_ZONE_IMBALANCE does not fire when turning-point scenes touch every zone', async () => {
      const recs895cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'turning_point' : 'establish_world' }),
      );
      const res = await runCA895(recs895cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_TURNING_POINT_ZONE_IMBALANCE'), 'CAUSALITY_TURNING_POINT_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 881 — causalityPass: causality complicate drought run, causality climax zone imbalance, causality establish world zone imbalance', async () => {
    const runCA881 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // CAUSALITY_COMPLICATE_DROUGHT_RUN fire:
    // n=10; complicate at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('CAUSALITY_COMPLICATE_DROUGHT_RUN fires when a long run has no complicating scene', async () => {
      const recs881a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'complicate' : 'establish_world' }),
      );
      const res = await runCA881(recs881a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_COMPLICATE_DROUGHT_RUN'), 'CAUSALITY_COMPLICATE_DROUGHT_RUN should fire');
    });

    it('CAUSALITY_COMPLICATE_DROUGHT_RUN does not fire when complicating scenes are evenly spread', async () => {
      const recs881an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'complicate' : 'establish_world' }),
      );
      const res = await runCA881(recs881an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_COMPLICATE_DROUGHT_RUN'), 'CAUSALITY_COMPLICATE_DROUGHT_RUN should not fire');
    });

    // CAUSALITY_CLIMAX_ZONE_IMBALANCE fire:
    // n=10, 4 zones (Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}); climax at 0,1,2,8,9 →
    // Z0 has 3/5=60% (bloat, >=50%), Z1 and Z2 are empty.
    it('CAUSALITY_CLIMAX_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of climax-purposed scenes', async () => {
      const recs881b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runCA881(recs881b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_CLIMAX_ZONE_IMBALANCE'), 'CAUSALITY_CLIMAX_ZONE_IMBALANCE should fire');
    });

    it('CAUSALITY_CLIMAX_ZONE_IMBALANCE does not fire when climax-purposed scenes touch every zone', async () => {
      const recs881bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runCA881(recs881bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_CLIMAX_ZONE_IMBALANCE'), 'CAUSALITY_CLIMAX_ZONE_IMBALANCE should not fire');
    });

    // CAUSALITY_ESTABLISH_WORLD_ZONE_IMBALANCE fire: same zone geometry as above.
    it('CAUSALITY_ESTABLISH_WORLD_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of world-establishing scenes', async () => {
      const recs881c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runCA881(recs881c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_ESTABLISH_WORLD_ZONE_IMBALANCE'), 'CAUSALITY_ESTABLISH_WORLD_ZONE_IMBALANCE should fire');
    });

    it('CAUSALITY_ESTABLISH_WORLD_ZONE_IMBALANCE does not fire when world-establishing scenes touch every zone', async () => {
      const recs881cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runCA881(recs881cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_ESTABLISH_WORLD_ZONE_IMBALANCE'), 'CAUSALITY_ESTABLISH_WORLD_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 867 — causalityPass: causality complicate zone cluster, causality turn zone cluster, causality curiosity zone cluster', async () => {
    const runCA867 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // CAUSALITY_COMPLICATE_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; complicate scenes at 0,1,2 → 100% opening third
    it('CAUSALITY_COMPLICATE_ZONE_CLUSTER fires when >75% of complicating scenes cluster in one third', async () => {
      const recs867a = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'complicate' : 'establish_world' }),
      );
      const res = await runCA867(recs867a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_COMPLICATE_ZONE_CLUSTER'), 'CAUSALITY_COMPLICATE_ZONE_CLUSTER should fire');
    });

    it('CAUSALITY_COMPLICATE_ZONE_CLUSTER does not fire when complicating scenes spread across thirds', async () => {
      const recs867an = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'complicate' : 'establish_world' }),
      );
      const res = await runCA867(recs867an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_COMPLICATE_ZONE_CLUSTER'), 'CAUSALITY_COMPLICATE_ZONE_CLUSTER should not fire');
    });

    // CAUSALITY_TURN_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; dramaticTurn present at 0,1,2 → 100% opening third
    it('CAUSALITY_TURN_ZONE_CLUSTER fires when >75% of dramatic-turn scenes cluster in one third', async () => {
      const recs867b = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { dramaticTurn: [0, 1, 2].includes(i) ? 'a shift occurs' : 'nothing' }),
      );
      const res = await runCA867(recs867b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_TURN_ZONE_CLUSTER'), 'CAUSALITY_TURN_ZONE_CLUSTER should fire');
    });

    it('CAUSALITY_TURN_ZONE_CLUSTER does not fire when dramatic-turn scenes spread across thirds', async () => {
      const recs867bn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { dramaticTurn: [0, 4, 8].includes(i) ? 'a shift occurs' : 'nothing' }),
      );
      const res = await runCA867(recs867bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_TURN_ZONE_CLUSTER'), 'CAUSALITY_TURN_ZONE_CLUSTER should not fire');
    });

    // CAUSALITY_CURIOSITY_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; curiosityDelta>0 at 0,1,2 → 100% opening third
    it('CAUSALITY_CURIOSITY_ZONE_CLUSTER fires when >75% of curiosity-raising scenes cluster in one third', async () => {
      const recs867c = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 1, 2].includes(i) ? 2 : 0 }),
      );
      const res = await runCA867(recs867c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_CURIOSITY_ZONE_CLUSTER'), 'CAUSALITY_CURIOSITY_ZONE_CLUSTER should fire');
    });

    it('CAUSALITY_CURIOSITY_ZONE_CLUSTER does not fire when curiosity-raising scenes spread across thirds', async () => {
      const recs867cn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 4, 8].includes(i) ? 2 : 0 }),
      );
      const res = await runCA867(recs867cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_CURIOSITY_ZONE_CLUSTER'), 'CAUSALITY_CURIOSITY_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 853 — causalityPass: causality climax drought run, causality resolution drought run, causality establish world drought run', async () => {
    const runCA853 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // CAUSALITY_CLIMAX_DROUGHT_RUN fire:
    // n=10; climax present at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('CAUSALITY_CLIMAX_DROUGHT_RUN fires when a long run has no climax-purposed scene', async () => {
      const recs853a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runCA853(recs853a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_CLIMAX_DROUGHT_RUN'), 'CAUSALITY_CLIMAX_DROUGHT_RUN should fire');
    });

    it('CAUSALITY_CLIMAX_DROUGHT_RUN does not fire when climax-purposed scenes are evenly spread', async () => {
      const recs853an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runCA853(recs853an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_CLIMAX_DROUGHT_RUN'), 'CAUSALITY_CLIMAX_DROUGHT_RUN should not fire');
    });

    // CAUSALITY_RESOLUTION_DROUGHT_RUN fire:
    // n=10; resolution present at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('CAUSALITY_RESOLUTION_DROUGHT_RUN fires when a long run has no resolution-purposed scene', async () => {
      const recs853b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'resolution' : 'complicate' }),
      );
      const res = await runCA853(recs853b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_RESOLUTION_DROUGHT_RUN'), 'CAUSALITY_RESOLUTION_DROUGHT_RUN should fire');
    });

    it('CAUSALITY_RESOLUTION_DROUGHT_RUN does not fire when resolution-purposed scenes are evenly spread', async () => {
      const recs853bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'resolution' : 'complicate' }),
      );
      const res = await runCA853(recs853bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_RESOLUTION_DROUGHT_RUN'), 'CAUSALITY_RESOLUTION_DROUGHT_RUN should not fire');
    });

    // CAUSALITY_ESTABLISH_WORLD_DROUGHT_RUN fire:
    // n=10; establish_world present at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('CAUSALITY_ESTABLISH_WORLD_DROUGHT_RUN fires when a long run has no world-building', async () => {
      const recs853c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runCA853(recs853c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_ESTABLISH_WORLD_DROUGHT_RUN'), 'CAUSALITY_ESTABLISH_WORLD_DROUGHT_RUN should fire');
    });

    it('CAUSALITY_ESTABLISH_WORLD_DROUGHT_RUN does not fire when world-establishing scenes are evenly spread', async () => {
      const recs853cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runCA853(recs853cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_ESTABLISH_WORLD_DROUGHT_RUN'), 'CAUSALITY_ESTABLISH_WORLD_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 839 — causalityPass: causality climax zone cluster, causality resolution zone cluster, causality establish world zone cluster', async () => {
    const runCA839 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // CAUSALITY_CLIMAX_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; climax scenes at 0,1,2 → 100% opening third
    it('CAUSALITY_CLIMAX_ZONE_CLUSTER fires when >75% of climax-purposed scenes cluster in one third', async () => {
      const recs839a = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runCA839(recs839a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_CLIMAX_ZONE_CLUSTER'), 'CAUSALITY_CLIMAX_ZONE_CLUSTER should fire');
    });

    it('CAUSALITY_CLIMAX_ZONE_CLUSTER does not fire when climax-purposed scenes spread across thirds', async () => {
      const recs839an = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runCA839(recs839an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_CLIMAX_ZONE_CLUSTER'), 'CAUSALITY_CLIMAX_ZONE_CLUSTER should not fire');
    });

    // CAUSALITY_RESOLUTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; resolution scenes at 0,1,2 → 100% opening third
    it('CAUSALITY_RESOLUTION_ZONE_CLUSTER fires when >75% of resolution-purposed scenes cluster in one third', async () => {
      const recs839b = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'resolution' : 'complicate' }),
      );
      const res = await runCA839(recs839b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_RESOLUTION_ZONE_CLUSTER'), 'CAUSALITY_RESOLUTION_ZONE_CLUSTER should fire');
    });

    it('CAUSALITY_RESOLUTION_ZONE_CLUSTER does not fire when resolution-purposed scenes spread across thirds', async () => {
      const recs839bn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'resolution' : 'complicate' }),
      );
      const res = await runCA839(recs839bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_RESOLUTION_ZONE_CLUSTER'), 'CAUSALITY_RESOLUTION_ZONE_CLUSTER should not fire');
    });

    // CAUSALITY_ESTABLISH_WORLD_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; establish_world scenes at 0,1,2 → 100% opening third
    it('CAUSALITY_ESTABLISH_WORLD_ZONE_CLUSTER fires when >75% of world-establishing scenes cluster in one third', async () => {
      const recs839c = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runCA839(recs839c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_ESTABLISH_WORLD_ZONE_CLUSTER'), 'CAUSALITY_ESTABLISH_WORLD_ZONE_CLUSTER should fire');
    });

    it('CAUSALITY_ESTABLISH_WORLD_ZONE_CLUSTER does not fire when world-establishing scenes spread across thirds', async () => {
      const recs839cn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runCA839(recs839cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_ESTABLISH_WORLD_ZONE_CLUSTER'), 'CAUSALITY_ESTABLISH_WORLD_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 825 — causalityPass: causality introduce conflict drought run, causality positive emotion zone cluster, causality positive emotion drought run', async () => {
    const runCA825 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // CAUSALITY_INTRODUCE_CONFLICT_DROUGHT_RUN fire:
    // n=10; introduce_conflict present at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('CAUSALITY_INTRODUCE_CONFLICT_DROUGHT_RUN fires when a long run has no new conflict', async () => {
      const recs825a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'introduce_conflict' : 'complicate' }),
      );
      const res = await runCA825(recs825a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_INTRODUCE_CONFLICT_DROUGHT_RUN'), 'CAUSALITY_INTRODUCE_CONFLICT_DROUGHT_RUN should fire');
    });

    it('CAUSALITY_INTRODUCE_CONFLICT_DROUGHT_RUN does not fire when conflict-introducing scenes are evenly spread', async () => {
      const recs825an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'introduce_conflict' : 'complicate' }),
      );
      const res = await runCA825(recs825an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_INTRODUCE_CONFLICT_DROUGHT_RUN'), 'CAUSALITY_INTRODUCE_CONFLICT_DROUGHT_RUN should not fire');
    });

    // CAUSALITY_POSITIVE_EMOTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; positive-emotion scenes at 0,1,2 → 100% opening third
    it('CAUSALITY_POSITIVE_EMOTION_ZONE_CLUSTER fires when >75% of positive-emotion scenes cluster in one third', async () => {
      const recs825b = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runCA825(recs825b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_POSITIVE_EMOTION_ZONE_CLUSTER'), 'CAUSALITY_POSITIVE_EMOTION_ZONE_CLUSTER should fire');
    });

    it('CAUSALITY_POSITIVE_EMOTION_ZONE_CLUSTER does not fire when positive-emotion scenes spread across thirds', async () => {
      const recs825bn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 4, 8].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runCA825(recs825bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_POSITIVE_EMOTION_ZONE_CLUSTER'), 'CAUSALITY_POSITIVE_EMOTION_ZONE_CLUSTER should not fire');
    });

    // CAUSALITY_POSITIVE_EMOTION_DROUGHT_RUN fire:
    // n=10; positive-emotion at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('CAUSALITY_POSITIVE_EMOTION_DROUGHT_RUN fires when a long run has no positive-emotion charge', async () => {
      const recs825c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runCA825(recs825c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_POSITIVE_EMOTION_DROUGHT_RUN'), 'CAUSALITY_POSITIVE_EMOTION_DROUGHT_RUN should fire');
    });

    it('CAUSALITY_POSITIVE_EMOTION_DROUGHT_RUN does not fire when positive-emotion scenes are evenly spread', async () => {
      const recs825cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 3, 6, 9].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runCA825(recs825cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_POSITIVE_EMOTION_DROUGHT_RUN'), 'CAUSALITY_POSITIVE_EMOTION_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 811 — causalityPass: causality turning point zone cluster, causality turning point drought run, causality introduce conflict zone cluster', async () => {
    const runCA811 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // CAUSALITY_TURNING_POINT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; turning_point scenes at 0,1,2 → 100% opening third
    it('CAUSALITY_TURNING_POINT_ZONE_CLUSTER fires when >75% of turning-point scenes cluster in one third', async () => {
      const recs811a = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'turning_point' : 'complicate' }),
      );
      const res = await runCA811(recs811a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_TURNING_POINT_ZONE_CLUSTER'), 'CAUSALITY_TURNING_POINT_ZONE_CLUSTER should fire');
    });

    it('CAUSALITY_TURNING_POINT_ZONE_CLUSTER does not fire when turning-point scenes spread across thirds', async () => {
      const recs811an = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'turning_point' : 'complicate' }),
      );
      const res = await runCA811(recs811an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_TURNING_POINT_ZONE_CLUSTER'), 'CAUSALITY_TURNING_POINT_ZONE_CLUSTER should not fire');
    });

    // CAUSALITY_TURNING_POINT_DROUGHT_RUN fire:
    // n=10; turning_point at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('CAUSALITY_TURNING_POINT_DROUGHT_RUN fires when a long run has no turning point', async () => {
      const recs811b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'turning_point' : 'complicate' }),
      );
      const res = await runCA811(recs811b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_TURNING_POINT_DROUGHT_RUN'), 'CAUSALITY_TURNING_POINT_DROUGHT_RUN should fire');
    });

    it('CAUSALITY_TURNING_POINT_DROUGHT_RUN does not fire when turning points are evenly spread', async () => {
      const recs811bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'turning_point' : 'complicate' }),
      );
      const res = await runCA811(recs811bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_TURNING_POINT_DROUGHT_RUN'), 'CAUSALITY_TURNING_POINT_DROUGHT_RUN should not fire');
    });

    // CAUSALITY_INTRODUCE_CONFLICT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; introduce_conflict scenes at 0,1,2 → 100% opening third
    it('CAUSALITY_INTRODUCE_CONFLICT_ZONE_CLUSTER fires when >75% of conflict-introducing scenes cluster in one third', async () => {
      const recs811c = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'introduce_conflict' : 'complicate' }),
      );
      const res = await runCA811(recs811c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_INTRODUCE_CONFLICT_ZONE_CLUSTER'), 'CAUSALITY_INTRODUCE_CONFLICT_ZONE_CLUSTER should fire');
    });

    it('CAUSALITY_INTRODUCE_CONFLICT_ZONE_CLUSTER does not fire when conflict-introducing scenes spread across thirds', async () => {
      const recs811cn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'introduce_conflict' : 'complicate' }),
      );
      const res = await runCA811(recs811cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_INTRODUCE_CONFLICT_ZONE_CLUSTER'), 'CAUSALITY_INTRODUCE_CONFLICT_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 797 — causalityPass: causality character moment drought run, causality negative emotion zone cluster, causality negative emotion drought run', async () => {
    const runCA797 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // CAUSALITY_CHARACTER_MOMENT_DROUGHT_RUN fire:
    // n=10; character_moment purpose at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('CAUSALITY_CHARACTER_MOMENT_DROUGHT_RUN fires when a long run has no character moment', async () => {
      const recs797a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'character_moment' : 'complicate' }),
      );
      const res = await runCA797(recs797a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_CHARACTER_MOMENT_DROUGHT_RUN'), 'CAUSALITY_CHARACTER_MOMENT_DROUGHT_RUN should fire');
    });

    it('CAUSALITY_CHARACTER_MOMENT_DROUGHT_RUN does not fire when character moments are evenly spread', async () => {
      const recs797an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'character_moment' : 'complicate' }),
      );
      const res = await runCA797(recs797an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_CHARACTER_MOMENT_DROUGHT_RUN'), 'CAUSALITY_CHARACTER_MOMENT_DROUGHT_RUN should not fire');
    });

    // CAUSALITY_NEGATIVE_EMOTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; negative-emotion scenes at 0,1,2 → 100% opening third
    it('CAUSALITY_NEGATIVE_EMOTION_ZONE_CLUSTER fires when >75% of negative-emotion scenes cluster in one third', async () => {
      const recs797b = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runCA797(recs797b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_NEGATIVE_EMOTION_ZONE_CLUSTER'), 'CAUSALITY_NEGATIVE_EMOTION_ZONE_CLUSTER should fire');
    });

    it('CAUSALITY_NEGATIVE_EMOTION_ZONE_CLUSTER does not fire when negative-emotion scenes spread across thirds', async () => {
      const recs797bn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 4, 8].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runCA797(recs797bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_NEGATIVE_EMOTION_ZONE_CLUSTER'), 'CAUSALITY_NEGATIVE_EMOTION_ZONE_CLUSTER should not fire');
    });

    // CAUSALITY_NEGATIVE_EMOTION_DROUGHT_RUN fire:
    // n=10; negative-emotion at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('CAUSALITY_NEGATIVE_EMOTION_DROUGHT_RUN fires when a long run has no negative-emotion charge', async () => {
      const recs797c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runCA797(recs797c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_NEGATIVE_EMOTION_DROUGHT_RUN'), 'CAUSALITY_NEGATIVE_EMOTION_DROUGHT_RUN should fire');
    });

    it('CAUSALITY_NEGATIVE_EMOTION_DROUGHT_RUN does not fire when negative-emotion scenes are evenly spread', async () => {
      const recs797cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 3, 6, 9].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runCA797(recs797cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_NEGATIVE_EMOTION_DROUGHT_RUN'), 'CAUSALITY_NEGATIVE_EMOTION_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 783 — causalityPass: causality revelation drought run, causality curiosity drought run, causality character moment zone cluster', async () => {
    const runCA783 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // CAUSALITY_REVELATION_DROUGHT_RUN fire:
    // n=10; revelation present at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('CAUSALITY_REVELATION_DROUGHT_RUN fires when a long run has no revelation', async () => {
      const recs783a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { revelation: [0, 1, 2].includes(i) ? 'truth revealed' : null }),
      );
      const res = await runCA783(recs783a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_REVELATION_DROUGHT_RUN'), 'CAUSALITY_REVELATION_DROUGHT_RUN should fire');
    });

    it('CAUSALITY_REVELATION_DROUGHT_RUN does not fire when revelations are evenly spread', async () => {
      const recs783an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { revelation: [0, 3, 6, 9].includes(i) ? 'truth revealed' : null }),
      );
      const res = await runCA783(recs783an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_REVELATION_DROUGHT_RUN'), 'CAUSALITY_REVELATION_DROUGHT_RUN should not fire');
    });

    // CAUSALITY_CURIOSITY_DROUGHT_RUN fire:
    // n=10; curiosityDelta>0 at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('CAUSALITY_CURIOSITY_DROUGHT_RUN fires when a long run has no rising curiosity', async () => {
      const recs783b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 1, 2].includes(i) ? 2 : 0 }),
      );
      const res = await runCA783(recs783b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_CURIOSITY_DROUGHT_RUN'), 'CAUSALITY_CURIOSITY_DROUGHT_RUN should fire');
    });

    it('CAUSALITY_CURIOSITY_DROUGHT_RUN does not fire when curiosity rises are evenly spread', async () => {
      const recs783bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 3, 6, 9].includes(i) ? 2 : 0 }),
      );
      const res = await runCA783(recs783bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_CURIOSITY_DROUGHT_RUN'), 'CAUSALITY_CURIOSITY_DROUGHT_RUN should not fire');
    });

    // CAUSALITY_CHARACTER_MOMENT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; character-moment scenes at 0,1,2 → 100% opening third
    it('CAUSALITY_CHARACTER_MOMENT_ZONE_CLUSTER fires when >75% of character-moment scenes cluster in one third', async () => {
      const recs783c = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'character_moment' : 'complicate' }),
      );
      const res = await runCA783(recs783c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_CHARACTER_MOMENT_ZONE_CLUSTER'), 'CAUSALITY_CHARACTER_MOMENT_ZONE_CLUSTER should fire');
    });

    it('CAUSALITY_CHARACTER_MOMENT_ZONE_CLUSTER does not fire when character-moment scenes spread across thirds', async () => {
      const recs783cn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'character_moment' : 'complicate' }),
      );
      const res = await runCA783(recs783cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_CHARACTER_MOMENT_ZONE_CLUSTER'), 'CAUSALITY_CHARACTER_MOMENT_ZONE_CLUSTER should not fire');
    });
  });


  describe('Wave 769 — causalityPass: causality turn drought run, causality revelation zone cluster, causality revelation peak uncaused', async () => {
    const runCA769 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // CAUSALITY_TURN_DROUGHT_RUN fire:
    // n=10; dramaticTurn present at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('CAUSALITY_TURN_DROUGHT_RUN fires when a long run has no dramatic turn', async () => {
      const recs769a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { dramaticTurn: [0, 1, 2].includes(i) ? 'reversal' : 'nothing' }),
      );
      const res = await runCA769(recs769a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_TURN_DROUGHT_RUN'), 'CAUSALITY_TURN_DROUGHT_RUN should fire');
    });

    it('CAUSALITY_TURN_DROUGHT_RUN does not fire when dramatic turns are evenly spread', async () => {
      const recs769an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { dramaticTurn: [0, 3, 6, 9].includes(i) ? 'reversal' : 'nothing' }),
      );
      const res = await runCA769(recs769an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_TURN_DROUGHT_RUN'), 'CAUSALITY_TURN_DROUGHT_RUN should not fire');
    });

    // CAUSALITY_REVELATION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; revelation scenes at 0,1,2 → 100% opening third
    it('CAUSALITY_REVELATION_ZONE_CLUSTER fires when >75% of revelation scenes cluster in one third', async () => {
      const recs769b = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { revelation: [0, 1, 2].includes(i) ? 'truth revealed' : null }),
      );
      const res = await runCA769(recs769b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_REVELATION_ZONE_CLUSTER'), 'CAUSALITY_REVELATION_ZONE_CLUSTER should fire');
    });

    it('CAUSALITY_REVELATION_ZONE_CLUSTER does not fire when revelation scenes spread across thirds', async () => {
      const recs769bn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { revelation: [0, 4, 8].includes(i) ? 'truth revealed' : null }),
      );
      const res = await runCA769(recs769bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_REVELATION_ZONE_CLUSTER'), 'CAUSALITY_REVELATION_ZONE_CLUSTER should not fire');
    });

    // CAUSALITY_REVELATION_PEAK_UNCAUSED fire:
    // 8 scenes; revelations at 2 (peak, earliest) and 5; no dramaticTurn at 0 or 1 (2-scene
    // lookback of the peak at index 2).
    it('CAUSALITY_REVELATION_PEAK_UNCAUSED fires when the peak revelation scene has no dramatic turn nearby', async () => {
      const recs769c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs769c[2] = makeSharedRecord(2, { revelation: 'truth revealed' });
      recs769c[5] = makeSharedRecord(5, { revelation: 'second truth revealed' });
      const res = await runCA769(recs769c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_REVELATION_PEAK_UNCAUSED'), 'CAUSALITY_REVELATION_PEAK_UNCAUSED should fire');
    });

    it('CAUSALITY_REVELATION_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak revelation', async () => {
      const recs769cn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs769cn[2] = makeSharedRecord(2, { revelation: 'truth revealed' });
      recs769cn[5] = makeSharedRecord(5, { revelation: 'second truth revealed' });
      recs769cn[1] = makeSharedRecord(1, { dramaticTurn: 'reversal' });
      const res = await runCA769(recs769cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_REVELATION_PEAK_UNCAUSED'), 'CAUSALITY_REVELATION_PEAK_UNCAUSED should not fire');
    });
  });


  describe('Wave 755 — causalityPass: causality payoff zone cluster, causality clock drought run, causality suspense drought run', async () => {
    const runCA755 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // CAUSALITY_PAYOFF_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; payoff scenes at 0,1,2 → 100% opening third
    it('CAUSALITY_PAYOFF_ZONE_CLUSTER fires when >75% of payoff scenes cluster in one third', async () => {
      const recs755a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs755a[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs755a[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs755a[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-c'] });
      const res = await runCA755(recs755a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_PAYOFF_ZONE_CLUSTER'), 'CAUSALITY_PAYOFF_ZONE_CLUSTER should fire');
    });

    // CAUSALITY_PAYOFF_ZONE_CLUSTER no-fire:
    // payoff scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('CAUSALITY_PAYOFF_ZONE_CLUSTER does not fire when payoff scenes are distributed across thirds', async () => {
      const recs755an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs755an[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs755an[4] = makeSharedRecord(4, { payoffSetupIds: ['thread-b'] });
      recs755an[7] = makeSharedRecord(7, { payoffSetupIds: ['thread-c'] });
      const res = await runCA755(recs755an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_PAYOFF_ZONE_CLUSTER'), 'CAUSALITY_PAYOFF_ZONE_CLUSTER should not fire');
    });

    // CAUSALITY_CLOCK_DROUGHT_RUN fire:
    // n=10; clockRaised at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('CAUSALITY_CLOCK_DROUGHT_RUN fires when the longest no-clock-raised run is ≥6', async () => {
      const recs755b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs755b[0] = makeSharedRecord(0, { clockRaised: true });
      recs755b[1] = makeSharedRecord(1, { clockRaised: true });
      recs755b[2] = makeSharedRecord(2, { clockRaised: true });
      recs755b[9] = makeSharedRecord(9, { clockRaised: true });
      const res = await runCA755(recs755b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_CLOCK_DROUGHT_RUN'), 'CAUSALITY_CLOCK_DROUGHT_RUN should fire');
    });

    // CAUSALITY_CLOCK_DROUGHT_RUN no-fire:
    // clockRaised at 0, 4, 9 → longest drought run = 4 (scenes 5-8) < 6
    it('CAUSALITY_CLOCK_DROUGHT_RUN does not fire when clock raises are distributed without a long drought', async () => {
      const recs755bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs755bn[0] = makeSharedRecord(0, { clockRaised: true });
      recs755bn[4] = makeSharedRecord(4, { clockRaised: true });
      recs755bn[9] = makeSharedRecord(9, { clockRaised: true });
      const res = await runCA755(recs755bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_CLOCK_DROUGHT_RUN'), 'CAUSALITY_CLOCK_DROUGHT_RUN should not fire');
    });

    // CAUSALITY_SUSPENSE_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 have rising suspense (>=3 present overall); scenes 3-9 (7 scenes) have none
    it('CAUSALITY_SUSPENSE_DROUGHT_RUN fires when the longest no-rising-suspense run reaches 6', async () => {
      const recs755c = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs755c[0] = makeSharedRecord(0, { suspenseDelta: 1 });
      recs755c[1] = makeSharedRecord(1, { suspenseDelta: 1 });
      recs755c[2] = makeSharedRecord(2, { suspenseDelta: 1 });
      const res = await runCA755(recs755c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_SUSPENSE_DROUGHT_RUN'), 'CAUSALITY_SUSPENSE_DROUGHT_RUN should fire');
    });

    // CAUSALITY_SUSPENSE_DROUGHT_RUN no-fire:
    // rising-suspense scenes spread out so no gap reaches 6 consecutive scenes
    it('CAUSALITY_SUSPENSE_DROUGHT_RUN does not fire when rising suspense is spread through the story', async () => {
      const recs755cn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs755cn[0] = makeSharedRecord(0, { suspenseDelta: 1 });
      recs755cn[3] = makeSharedRecord(3, { suspenseDelta: 1 });
      recs755cn[6] = makeSharedRecord(6, { suspenseDelta: 1 });
      recs755cn[9] = makeSharedRecord(9, { suspenseDelta: 1 });
      const res = await runCA755(recs755cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_SUSPENSE_DROUGHT_RUN'), 'CAUSALITY_SUSPENSE_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 741 — causalityPass: causality clock delta zone cluster, causality relationship zone cluster, causality payoff peak uncaused', async () => {
    const runCA741 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // CAUSALITY_CLOCK_DELTA_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; clock-shifting scenes at 0,1,2 → 100% opening third
    it('CAUSALITY_CLOCK_DELTA_ZONE_CLUSTER fires when >75% of clock-shifting scenes cluster in one third', async () => {
      const recs741a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs741a[0] = makeSharedRecord(0, { clockDelta: 1 });
      recs741a[1] = makeSharedRecord(1, { clockDelta: -1 });
      recs741a[2] = makeSharedRecord(2, { clockDelta: 1 });
      const res = await runCA741(recs741a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_CLOCK_DELTA_ZONE_CLUSTER'), 'CAUSALITY_CLOCK_DELTA_ZONE_CLUSTER should fire');
    });

    // CAUSALITY_CLOCK_DELTA_ZONE_CLUSTER no-fire:
    // clock-shifting scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('CAUSALITY_CLOCK_DELTA_ZONE_CLUSTER does not fire when clock movement is distributed across thirds', async () => {
      const recs741an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs741an[0] = makeSharedRecord(0, { clockDelta: 1 });
      recs741an[4] = makeSharedRecord(4, { clockDelta: -1 });
      recs741an[7] = makeSharedRecord(7, { clockDelta: 1 });
      const res = await runCA741(recs741an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_CLOCK_DELTA_ZONE_CLUSTER'), 'CAUSALITY_CLOCK_DELTA_ZONE_CLUSTER should not fire');
    });

    // CAUSALITY_RELATIONSHIP_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; relationship-shift scenes at 0,1,2 → 100% opening third
    it('CAUSALITY_RELATIONSHIP_ZONE_CLUSTER fires when >75% of relationship-shift scenes cluster in one third', async () => {
      const recs741b = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs741b[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      recs741b[1] = makeSharedRecord(1, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      recs741b[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      const res = await runCA741(recs741b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_RELATIONSHIP_ZONE_CLUSTER'), 'CAUSALITY_RELATIONSHIP_ZONE_CLUSTER should fire');
    });

    // CAUSALITY_RELATIONSHIP_ZONE_CLUSTER no-fire:
    // relationship-shift scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('CAUSALITY_RELATIONSHIP_ZONE_CLUSTER does not fire when relationship-shift scenes are distributed across thirds', async () => {
      const recs741bn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs741bn[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      recs741bn[4] = makeSharedRecord(4, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      recs741bn[7] = makeSharedRecord(7, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      const res = await runCA741(recs741bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_RELATIONSHIP_ZONE_CLUSTER'), 'CAUSALITY_RELATIONSHIP_ZONE_CLUSTER should not fire');
    });

    // CAUSALITY_PAYOFF_PEAK_UNCAUSED fire:
    // 8 scenes; payoffs at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('CAUSALITY_PAYOFF_PEAK_UNCAUSED fires when the peak payoff scene has no dramatic turn or revelation nearby', async () => {
      const recs741c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs741c[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-a'] });
      recs741c[6] = makeSharedRecord(6, { payoffSetupIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runCA741(recs741c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_PAYOFF_PEAK_UNCAUSED'), 'CAUSALITY_PAYOFF_PEAK_UNCAUSED should fire');
    });

    // CAUSALITY_PAYOFF_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('CAUSALITY_PAYOFF_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs741cn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs741cn[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-a'] });
      recs741cn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs741cn[6] = makeSharedRecord(6, { payoffSetupIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runCA741(recs741cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_PAYOFF_PEAK_UNCAUSED'), 'CAUSALITY_PAYOFF_PEAK_UNCAUSED should not fire');
    });
  });

  describe('Wave 727 — causalityPass: causality clock delta drought run, causality relationship peak uncaused, causality seed drought run', async () => {
    const runCA727 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // CAUSALITY_CLOCK_DELTA_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 shift the clock (>=3 present overall); scenes 3-9 (7 scenes) have none
    it('CAUSALITY_CLOCK_DELTA_DROUGHT_RUN fires when the longest no-clock-movement run reaches 6', async () => {
      const recs727a = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs727a[0] = makeSharedRecord(0, { clockDelta: 1 });
      recs727a[1] = makeSharedRecord(1, { clockDelta: -1 });
      recs727a[2] = makeSharedRecord(2, { clockDelta: 1 });
      const res = await runCA727(recs727a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_CLOCK_DELTA_DROUGHT_RUN'), 'CAUSALITY_CLOCK_DELTA_DROUGHT_RUN should fire');
    });

    // CAUSALITY_CLOCK_DELTA_DROUGHT_RUN no-fire:
    // clock-shifting scenes spread out so no gap reaches 6 consecutive scenes
    it('CAUSALITY_CLOCK_DELTA_DROUGHT_RUN does not fire when clock movement is spread through the story', async () => {
      const recs727an = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs727an[0] = makeSharedRecord(0, { clockDelta: 1 });
      recs727an[3] = makeSharedRecord(3, { clockDelta: -1 });
      recs727an[6] = makeSharedRecord(6, { clockDelta: 1 });
      recs727an[9] = makeSharedRecord(9, { clockDelta: -1 });
      const res = await runCA727(recs727an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_CLOCK_DELTA_DROUGHT_RUN'), 'CAUSALITY_CLOCK_DELTA_DROUGHT_RUN should not fire');
    });

    // CAUSALITY_RELATIONSHIP_PEAK_UNCAUSED fire:
    // 8 scenes; relationship shifts at 2 (1 shift) and 6 (5 shifts, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('CAUSALITY_RELATIONSHIP_PEAK_UNCAUSED fires when the peak relationship-shift scene has no dramatic turn or revelation nearby', async () => {
      const recs727b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs727b[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      recs727b[6] = makeSharedRecord(6, {
        relationshipShifts: [
          { pairKey: 'a|b', dimension: 'trust', amount: 1 },
          { pairKey: 'a|c', dimension: 'trust', amount: 1 },
          { pairKey: 'a|d', dimension: 'trust', amount: 1 },
          { pairKey: 'a|e', dimension: 'trust', amount: 1 },
          { pairKey: 'a|f', dimension: 'trust', amount: 1 },
        ],
      });
      const res = await runCA727(recs727b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_RELATIONSHIP_PEAK_UNCAUSED'), 'CAUSALITY_RELATIONSHIP_PEAK_UNCAUSED should fire');
    });

    // CAUSALITY_RELATIONSHIP_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('CAUSALITY_RELATIONSHIP_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs727bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs727bn[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      recs727bn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs727bn[6] = makeSharedRecord(6, {
        relationshipShifts: [
          { pairKey: 'a|b', dimension: 'trust', amount: 1 },
          { pairKey: 'a|c', dimension: 'trust', amount: 1 },
          { pairKey: 'a|d', dimension: 'trust', amount: 1 },
          { pairKey: 'a|e', dimension: 'trust', amount: 1 },
          { pairKey: 'a|f', dimension: 'trust', amount: 1 },
        ],
      });
      const res = await runCA727(recs727bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_RELATIONSHIP_PEAK_UNCAUSED'), 'CAUSALITY_RELATIONSHIP_PEAK_UNCAUSED should not fire');
    });

    // CAUSALITY_SEED_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 plant new clues (>=3 present overall); scenes 3-9 (7 scenes) have none
    it('CAUSALITY_SEED_DROUGHT_RUN fires when the longest no-new-clues run reaches 6', async () => {
      const recs727c = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs727c[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs727c[1] = makeSharedRecord(1, { seededClueIds: ['clue-b'] });
      recs727c[2] = makeSharedRecord(2, { seededClueIds: ['clue-c'] });
      const res = await runCA727(recs727c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_SEED_DROUGHT_RUN'), 'CAUSALITY_SEED_DROUGHT_RUN should fire');
    });

    // CAUSALITY_SEED_DROUGHT_RUN no-fire:
    // seed scenes spread out so no gap reaches 6 consecutive scenes
    it('CAUSALITY_SEED_DROUGHT_RUN does not fire when new clues are seeded throughout the story', async () => {
      const recs727cn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs727cn[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs727cn[3] = makeSharedRecord(3, { seededClueIds: ['clue-b'] });
      recs727cn[6] = makeSharedRecord(6, { seededClueIds: ['clue-c'] });
      recs727cn[9] = makeSharedRecord(9, { seededClueIds: ['clue-d'] });
      const res = await runCA727(recs727cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_SEED_DROUGHT_RUN'), 'CAUSALITY_SEED_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 713 — causalityPass: causality open thread zone cluster, causality stakes drought run, causality seed peak uncaused', async () => {
    const runCA713 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // CAUSALITY_OPEN_THREAD_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; open-thread scenes at 0,1,2 → 100% opening third
    it('CAUSALITY_OPEN_THREAD_ZONE_CLUSTER fires when >75% of open-thread scenes cluster in one third', async () => {
      const recs713a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs713a[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs713a[1] = makeSharedRecord(1, { unresolvedClues: ['b'] });
      recs713a[2] = makeSharedRecord(2, { unresolvedClues: ['c'] });
      const res = await runCA713(recs713a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_OPEN_THREAD_ZONE_CLUSTER'), 'CAUSALITY_OPEN_THREAD_ZONE_CLUSTER should fire');
    });

    // CAUSALITY_OPEN_THREAD_ZONE_CLUSTER no-fire:
    // open-thread scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('CAUSALITY_OPEN_THREAD_ZONE_CLUSTER does not fire when open-thread scenes are distributed across thirds', async () => {
      const recs713an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs713an[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs713an[4] = makeSharedRecord(4, { unresolvedClues: ['b'] });
      recs713an[7] = makeSharedRecord(7, { unresolvedClues: ['c'] });
      const res = await runCA713(recs713an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_OPEN_THREAD_ZONE_CLUSTER'), 'CAUSALITY_OPEN_THREAD_ZONE_CLUSTER should not fire');
    });

    // CAUSALITY_STAKES_DROUGHT_RUN fire:
    // 10 scenes; stakes-raising at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('CAUSALITY_STAKES_DROUGHT_RUN fires when the longest no-stakes-raising run is ≥6', async () => {
      const recs713b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs713b[0] = makeSharedRecord(0, { purpose: 'raise_stakes' });
      recs713b[1] = makeSharedRecord(1, { purpose: 'raise_stakes' });
      recs713b[2] = makeSharedRecord(2, { purpose: 'raise_stakes' });
      recs713b[9] = makeSharedRecord(9, { purpose: 'raise_stakes' });
      const res = await runCA713(recs713b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_STAKES_DROUGHT_RUN'), 'CAUSALITY_STAKES_DROUGHT_RUN should fire');
    });

    // CAUSALITY_STAKES_DROUGHT_RUN no-fire:
    // stakes-raising at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('CAUSALITY_STAKES_DROUGHT_RUN does not fire when stakes-raising scenes are distributed without a long drought', async () => {
      const recs713bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs713bn[0] = makeSharedRecord(0, { purpose: 'raise_stakes' });
      recs713bn[4] = makeSharedRecord(4, { purpose: 'raise_stakes' });
      recs713bn[9] = makeSharedRecord(9, { purpose: 'raise_stakes' });
      const res = await runCA713(recs713bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_STAKES_DROUGHT_RUN'), 'CAUSALITY_STAKES_DROUGHT_RUN should not fire');
    });

    // CAUSALITY_SEED_PEAK_UNCAUSED fire:
    // 8 scenes; seeds at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('CAUSALITY_SEED_PEAK_UNCAUSED fires when the peak seed scene has no dramatic turn or revelation nearby', async () => {
      const recs713c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs713c[2] = makeSharedRecord(2, { seededClueIds: ['clue-a'] });
      recs713c[6] = makeSharedRecord(6, { seededClueIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runCA713(recs713c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_SEED_PEAK_UNCAUSED'), 'CAUSALITY_SEED_PEAK_UNCAUSED should fire');
    });

    // CAUSALITY_SEED_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('CAUSALITY_SEED_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs713cn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs713cn[2] = makeSharedRecord(2, { seededClueIds: ['clue-a'] });
      recs713cn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs713cn[6] = makeSharedRecord(6, { seededClueIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runCA713(recs713cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_SEED_PEAK_UNCAUSED'), 'CAUSALITY_SEED_PEAK_UNCAUSED should not fire');
    });
  });

  describe('Wave 699 — causalityPass: causality clock zone cluster, causality relationship drought run, causality suspense peak uncaused', async () => {
    const runCA699 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // CAUSALITY_CLOCK_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; clock-raised scenes at 0,1,2 → 100% opening third
    it('CAUSALITY_CLOCK_ZONE_CLUSTER fires when >75% of clock-raised scenes cluster in one third', async () => {
      const recs699a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs699a[0] = makeSharedRecord(0, { clockRaised: true });
      recs699a[1] = makeSharedRecord(1, { clockRaised: true });
      recs699a[2] = makeSharedRecord(2, { clockRaised: true });
      const res = await runCA699(recs699a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_CLOCK_ZONE_CLUSTER'), 'CAUSALITY_CLOCK_ZONE_CLUSTER should fire');
    });

    // CAUSALITY_CLOCK_ZONE_CLUSTER no-fire:
    // clock-raised scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('CAUSALITY_CLOCK_ZONE_CLUSTER does not fire when clock-raised scenes are distributed across thirds', async () => {
      const recs699an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs699an[0] = makeSharedRecord(0, { clockRaised: true });
      recs699an[4] = makeSharedRecord(4, { clockRaised: true });
      recs699an[7] = makeSharedRecord(7, { clockRaised: true });
      const res = await runCA699(recs699an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_CLOCK_ZONE_CLUSTER'), 'CAUSALITY_CLOCK_ZONE_CLUSTER should not fire');
    });

    // CAUSALITY_RELATIONSHIP_DROUGHT_RUN fire:
    // 10 scenes; shifts at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('CAUSALITY_RELATIONSHIP_DROUGHT_RUN fires when the longest no-shift run is ≥6', async () => {
      const recs699b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs699b[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs699b[1] = makeSharedRecord(1, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs699b[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs699b[9] = makeSharedRecord(9, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      const res = await runCA699(recs699b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_RELATIONSHIP_DROUGHT_RUN'), 'CAUSALITY_RELATIONSHIP_DROUGHT_RUN should fire');
    });

    // CAUSALITY_RELATIONSHIP_DROUGHT_RUN no-fire:
    // shifts at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('CAUSALITY_RELATIONSHIP_DROUGHT_RUN does not fire when shifts are distributed without a long drought', async () => {
      const recs699bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs699bn[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs699bn[4] = makeSharedRecord(4, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs699bn[9] = makeSharedRecord(9, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      const res = await runCA699(recs699bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_RELATIONSHIP_DROUGHT_RUN'), 'CAUSALITY_RELATIONSHIP_DROUGHT_RUN should not fire');
    });

    // CAUSALITY_SUSPENSE_PEAK_UNCAUSED fire:
    // 8 scenes; suspense at 2 (delta 1) and 6 (delta 5, the peak); no dramaticTurn or revelation
    // at 6, 5, or 4
    it('CAUSALITY_SUSPENSE_PEAK_UNCAUSED fires when the peak suspense-spike scene has no dramatic turn or revelation nearby', async () => {
      const recs699c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs699c[2] = makeSharedRecord(2, { suspenseDelta: 1 });
      recs699c[6] = makeSharedRecord(6, { suspenseDelta: 5 });
      const res = await runCA699(recs699c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_SUSPENSE_PEAK_UNCAUSED'), 'CAUSALITY_SUSPENSE_PEAK_UNCAUSED should fire');
    });

    // CAUSALITY_SUSPENSE_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('CAUSALITY_SUSPENSE_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs699cn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs699cn[2] = makeSharedRecord(2, { suspenseDelta: 1 });
      recs699cn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs699cn[6] = makeSharedRecord(6, { suspenseDelta: 5 });
      const res = await runCA699(recs699cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_SUSPENSE_PEAK_UNCAUSED'), 'CAUSALITY_SUSPENSE_PEAK_UNCAUSED should not fire');
    });
  });

  describe('Wave 685 — causalityPass: causality clock delta peak uncaused, causality payoff drought run, causality seed zone cluster', async () => {
    const runCA685 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // CAUSALITY_CLOCK_DELTA_PEAK_UNCAUSED fire:
    // 8 scenes; clockDelta at 2 (delta 1) and 6 (delta 5, the peak); no dramaticTurn or revelation
    // at 6, 5, or 4
    it('CAUSALITY_CLOCK_DELTA_PEAK_UNCAUSED fires when the peak clock-delta scene has no dramatic turn or revelation nearby', async () => {
      const recs685a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs685a[2] = makeSharedRecord(2, { clockDelta: 1 });
      recs685a[6] = makeSharedRecord(6, { clockDelta: 5 });
      const res = await runCA685(recs685a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_CLOCK_DELTA_PEAK_UNCAUSED'), 'CAUSALITY_CLOCK_DELTA_PEAK_UNCAUSED should fire');
    });

    // CAUSALITY_CLOCK_DELTA_PEAK_UNCAUSED no-fire:
    // revelation at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('CAUSALITY_CLOCK_DELTA_PEAK_UNCAUSED does not fire when a revelation precedes the peak within the lookback', async () => {
      const recs685an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs685an[2] = makeSharedRecord(2, { clockDelta: 1 });
      recs685an[5] = makeSharedRecord(5, { revelation: 'the deadline was moved up' });
      recs685an[6] = makeSharedRecord(6, { clockDelta: 5 });
      const res = await runCA685(recs685an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_CLOCK_DELTA_PEAK_UNCAUSED'), 'CAUSALITY_CLOCK_DELTA_PEAK_UNCAUSED should not fire');
    });

    // CAUSALITY_PAYOFF_DROUGHT_RUN fire:
    // 10 scenes; payoffs at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('CAUSALITY_PAYOFF_DROUGHT_RUN fires when the longest no-payoff run is ≥6', async () => {
      const recs685b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs685b[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs685b[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs685b[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-c'] });
      recs685b[9] = makeSharedRecord(9, { payoffSetupIds: ['thread-d'] });
      const res = await runCA685(recs685b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_PAYOFF_DROUGHT_RUN'), 'CAUSALITY_PAYOFF_DROUGHT_RUN should fire');
    });

    // CAUSALITY_PAYOFF_DROUGHT_RUN no-fire:
    // payoffs at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('CAUSALITY_PAYOFF_DROUGHT_RUN does not fire when payoffs are distributed without a long drought', async () => {
      const recs685bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs685bn[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs685bn[4] = makeSharedRecord(4, { payoffSetupIds: ['thread-b'] });
      recs685bn[9] = makeSharedRecord(9, { payoffSetupIds: ['thread-c'] });
      const res = await runCA685(recs685bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_PAYOFF_DROUGHT_RUN'), 'CAUSALITY_PAYOFF_DROUGHT_RUN should not fire');
    });

    // CAUSALITY_SEED_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; seed scenes at 0,1,2 → 100% opening third
    it('CAUSALITY_SEED_ZONE_CLUSTER fires when >75% of seed scenes cluster in one third', async () => {
      const recs685c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs685c[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs685c[1] = makeSharedRecord(1, { seededClueIds: ['clue-b'] });
      recs685c[2] = makeSharedRecord(2, { seededClueIds: ['clue-c'] });
      const res = await runCA685(recs685c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_SEED_ZONE_CLUSTER'), 'CAUSALITY_SEED_ZONE_CLUSTER should fire');
    });

    // CAUSALITY_SEED_ZONE_CLUSTER no-fire:
    // seed scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('CAUSALITY_SEED_ZONE_CLUSTER does not fire when seed scenes are distributed across thirds', async () => {
      const recs685cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs685cn[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs685cn[4] = makeSharedRecord(4, { seededClueIds: ['clue-b'] });
      recs685cn[7] = makeSharedRecord(7, { seededClueIds: ['clue-c'] });
      const res = await runCA685(recs685cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_SEED_ZONE_CLUSTER'), 'CAUSALITY_SEED_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 671 — causalityPass: causality highlight drought run, causality open thread peak uncaused, causality stakes zone cluster', async () => {
    const runCA671 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // CAUSALITY_HIGHLIGHT_DROUGHT_RUN fire:
    // 10 scenes; highlights at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('CAUSALITY_HIGHLIGHT_DROUGHT_RUN fires when the longest no-highlighted-dialogue run is ≥6', async () => {
      const recs671a = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs671a[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs671a[1] = makeSharedRecord(1, { dialogueHighlights: ['line-b'] });
      recs671a[2] = makeSharedRecord(2, { dialogueHighlights: ['line-c'] });
      recs671a[9] = makeSharedRecord(9, { dialogueHighlights: ['line-d'] });
      const res = await runCA671(recs671a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_HIGHLIGHT_DROUGHT_RUN'), 'CAUSALITY_HIGHLIGHT_DROUGHT_RUN should fire');
    });

    // CAUSALITY_HIGHLIGHT_DROUGHT_RUN no-fire:
    // highlights at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('CAUSALITY_HIGHLIGHT_DROUGHT_RUN does not fire when highlighted dialogue is distributed without a long drought', async () => {
      const recs671an = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs671an[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs671an[4] = makeSharedRecord(4, { dialogueHighlights: ['line-b'] });
      recs671an[9] = makeSharedRecord(9, { dialogueHighlights: ['line-c'] });
      const res = await runCA671(recs671an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_HIGHLIGHT_DROUGHT_RUN'), 'CAUSALITY_HIGHLIGHT_DROUGHT_RUN should not fire');
    });

    // CAUSALITY_OPEN_THREAD_PEAK_UNCAUSED fire:
    // 8 scenes; open threads at 2 (1 clue) and 6 (5 clues, the peak); no dramaticTurn or
    // revelation at 6, 5, or 4
    it('CAUSALITY_OPEN_THREAD_PEAK_UNCAUSED fires when the peak open-thread scene has no dramatic turn or revelation nearby', async () => {
      const recs671b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs671b[2] = makeSharedRecord(2, { unresolvedClues: ['a'] });
      recs671b[6] = makeSharedRecord(6, { unresolvedClues: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runCA671(recs671b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_OPEN_THREAD_PEAK_UNCAUSED'), 'CAUSALITY_OPEN_THREAD_PEAK_UNCAUSED should fire');
    });

    // CAUSALITY_OPEN_THREAD_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('CAUSALITY_OPEN_THREAD_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs671bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs671bn[2] = makeSharedRecord(2, { unresolvedClues: ['a'] });
      recs671bn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs671bn[6] = makeSharedRecord(6, { unresolvedClues: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runCA671(recs671bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_OPEN_THREAD_PEAK_UNCAUSED'), 'CAUSALITY_OPEN_THREAD_PEAK_UNCAUSED should not fire');
    });

    // CAUSALITY_STAKES_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; stakes-raising scenes at 0,1,2 → 100% opening third
    it('CAUSALITY_STAKES_ZONE_CLUSTER fires when >75% of stakes-raising scenes cluster in one third', async () => {
      const recs671c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs671c[0] = makeSharedRecord(0, { purpose: 'raise_stakes' });
      recs671c[1] = makeSharedRecord(1, { purpose: 'raise_stakes' });
      recs671c[2] = makeSharedRecord(2, { purpose: 'raise_stakes' });
      const res = await runCA671(recs671c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_STAKES_ZONE_CLUSTER'), 'CAUSALITY_STAKES_ZONE_CLUSTER should fire');
    });

    // CAUSALITY_STAKES_ZONE_CLUSTER no-fire:
    // stakes-raising scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('CAUSALITY_STAKES_ZONE_CLUSTER does not fire when stakes-raising scenes are distributed across thirds', async () => {
      const recs671cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs671cn[0] = makeSharedRecord(0, { purpose: 'raise_stakes' });
      recs671cn[4] = makeSharedRecord(4, { purpose: 'raise_stakes' });
      recs671cn[7] = makeSharedRecord(7, { purpose: 'raise_stakes' });
      const res = await runCA671(recs671cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_STAKES_ZONE_CLUSTER'), 'CAUSALITY_STAKES_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 657 — causalityPass: causality highlight peak uncaused, causality open thread drought run, causal staging zone cluster', async () => {
    const runCA657 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // CAUSALITY_HIGHLIGHT_PEAK_UNCAUSED fire:
    // 8 scenes; highlights at 2 (1 line) and 6 (5 lines, the peak); no dramaticTurn or revelation
    // at 6, 5, or 4
    it('CAUSALITY_HIGHLIGHT_PEAK_UNCAUSED fires when the peak highlighted-dialogue scene has no dramatic turn or revelation nearby', async () => {
      const recs657a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs657a[2] = makeSharedRecord(2, { dialogueHighlights: ['line-a'] });
      recs657a[6] = makeSharedRecord(6, { dialogueHighlights: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runCA657(recs657a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_HIGHLIGHT_PEAK_UNCAUSED'), 'CAUSALITY_HIGHLIGHT_PEAK_UNCAUSED should fire');
    });

    // CAUSALITY_HIGHLIGHT_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('CAUSALITY_HIGHLIGHT_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs657an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs657an[2] = makeSharedRecord(2, { dialogueHighlights: ['line-a'] });
      recs657an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs657an[6] = makeSharedRecord(6, { dialogueHighlights: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runCA657(recs657an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_HIGHLIGHT_PEAK_UNCAUSED'), 'CAUSALITY_HIGHLIGHT_PEAK_UNCAUSED should not fire');
    });

    // CAUSALITY_OPEN_THREAD_DROUGHT_RUN fire:
    // 10 scenes; debt at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('CAUSALITY_OPEN_THREAD_DROUGHT_RUN fires when the longest no-debt run is ≥6', async () => {
      const recs657b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs657b[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs657b[1] = makeSharedRecord(1, { unresolvedClues: ['b'] });
      recs657b[2] = makeSharedRecord(2, { unresolvedClues: ['c'] });
      recs657b[9] = makeSharedRecord(9, { unresolvedClues: ['d'] });
      const res = await runCA657(recs657b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_OPEN_THREAD_DROUGHT_RUN'), 'CAUSALITY_OPEN_THREAD_DROUGHT_RUN should fire');
    });

    // CAUSALITY_OPEN_THREAD_DROUGHT_RUN no-fire:
    // debt at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('CAUSALITY_OPEN_THREAD_DROUGHT_RUN does not fire when debt is distributed without a long drought', async () => {
      const recs657bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs657bn[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs657bn[4] = makeSharedRecord(4, { unresolvedClues: ['b'] });
      recs657bn[9] = makeSharedRecord(9, { unresolvedClues: ['c'] });
      const res = await runCA657(recs657bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_OPEN_THREAD_DROUGHT_RUN'), 'CAUSALITY_OPEN_THREAD_DROUGHT_RUN should not fire');
    });

    // CAUSAL_STAGING_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; visually dense scenes (visualBeats≥2) at 0,1,2 → 100% opening
    // third
    it('CAUSAL_STAGING_ZONE_CLUSTER fires when >75% of visually dense scenes cluster in one third', async () => {
      const recs657c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs657c[0] = makeSharedRecord(0, { visualBeats: ['a', 'b'] });
      recs657c[1] = makeSharedRecord(1, { visualBeats: ['a', 'b'] });
      recs657c[2] = makeSharedRecord(2, { visualBeats: ['a', 'b'] });
      const res = await runCA657(recs657c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSAL_STAGING_ZONE_CLUSTER'), 'CAUSAL_STAGING_ZONE_CLUSTER should fire');
    });

    // CAUSAL_STAGING_ZONE_CLUSTER no-fire:
    // visually dense scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('CAUSAL_STAGING_ZONE_CLUSTER does not fire when visually dense scenes are distributed across thirds', async () => {
      const recs657cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs657cn[0] = makeSharedRecord(0, { visualBeats: ['a', 'b'] });
      recs657cn[4] = makeSharedRecord(4, { visualBeats: ['a', 'b'] });
      recs657cn[7] = makeSharedRecord(7, { visualBeats: ['a', 'b'] });
      const res = await runCA657(recs657cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSAL_STAGING_ZONE_CLUSTER'), 'CAUSAL_STAGING_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 643 — causalityPass: causality visual beat drought run, causal highlight zone cluster, causality open thread curiosity decoupled', async () => {
    const runCA643 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // CAUSALITY_VISUAL_BEAT_DROUGHT_RUN fire:
    // 10 scenes; staged at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('CAUSALITY_VISUAL_BEAT_DROUGHT_RUN fires when the longest no-staging run is ≥6', async () => {
      const recs643a = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs643a[0] = makeSharedRecord(0, { visualBeats: ['a'] });
      recs643a[1] = makeSharedRecord(1, { visualBeats: ['b'] });
      recs643a[2] = makeSharedRecord(2, { visualBeats: ['c'] });
      recs643a[9] = makeSharedRecord(9, { visualBeats: ['d'] });
      const res = await runCA643(recs643a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_VISUAL_BEAT_DROUGHT_RUN'), 'CAUSALITY_VISUAL_BEAT_DROUGHT_RUN should fire');
    });

    // CAUSALITY_VISUAL_BEAT_DROUGHT_RUN no-fire:
    // staged at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('CAUSALITY_VISUAL_BEAT_DROUGHT_RUN does not fire when staging is distributed without a long drought', async () => {
      const recs643an = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs643an[0] = makeSharedRecord(0, { visualBeats: ['a'] });
      recs643an[4] = makeSharedRecord(4, { visualBeats: ['b'] });
      recs643an[9] = makeSharedRecord(9, { visualBeats: ['c'] });
      const res = await runCA643(recs643an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_VISUAL_BEAT_DROUGHT_RUN'), 'CAUSALITY_VISUAL_BEAT_DROUGHT_RUN should not fire');
    });

    // CAUSAL_HIGHLIGHT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; highlighted-dialogue scenes at 0,1,2 → 100% opening third
    it('CAUSAL_HIGHLIGHT_ZONE_CLUSTER fires when >75% of highlighted-dialogue scenes cluster in one third', async () => {
      const recs643b = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs643b[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs643b[1] = makeSharedRecord(1, { dialogueHighlights: ['line-b'] });
      recs643b[2] = makeSharedRecord(2, { dialogueHighlights: ['line-c'] });
      const res = await runCA643(recs643b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSAL_HIGHLIGHT_ZONE_CLUSTER'), 'CAUSAL_HIGHLIGHT_ZONE_CLUSTER should fire');
    });

    // CAUSAL_HIGHLIGHT_ZONE_CLUSTER no-fire:
    // highlighted-dialogue scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('CAUSAL_HIGHLIGHT_ZONE_CLUSTER does not fire when highlighted-dialogue scenes are distributed across thirds', async () => {
      const recs643bn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs643bn[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs643bn[4] = makeSharedRecord(4, { dialogueHighlights: ['line-b'] });
      recs643bn[7] = makeSharedRecord(7, { dialogueHighlights: ['line-c'] });
      const res = await runCA643(recs643bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSAL_HIGHLIGHT_ZONE_CLUSTER'), 'CAUSAL_HIGHLIGHT_ZONE_CLUSTER should not fire');
    });

    // CAUSALITY_OPEN_THREAD_CURIOSITY_DECOUPLED fire:
    // n=6; open threads at 0,1 (no curiosity rise); curiosity rises at 4,5 (no open thread) → zero overlap → fires
    it('CAUSALITY_OPEN_THREAD_CURIOSITY_DECOUPLED fires when open-thread scenes and rising-curiosity scenes never overlap', async () => {
      const recs643c = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs643c[0] = makeSharedRecord(0, { unresolvedClues: ['unpaid-clue'] });
      recs643c[1] = makeSharedRecord(1, { unresolvedClues: ['unpaid-clue'] });
      recs643c[4] = makeSharedRecord(4, { curiosityDelta: 1 });
      recs643c[5] = makeSharedRecord(5, { curiosityDelta: 1 });
      const res = await runCA643(recs643c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_OPEN_THREAD_CURIOSITY_DECOUPLED'), 'CAUSALITY_OPEN_THREAD_CURIOSITY_DECOUPLED should fire');
    });

    // CAUSALITY_OPEN_THREAD_CURIOSITY_DECOUPLED no-fire:
    // scene 0 carries BOTH an open thread and a curiosity rise → overlap exists
    it('CAUSALITY_OPEN_THREAD_CURIOSITY_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs643cn = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs643cn[0] = makeSharedRecord(0, { unresolvedClues: ['unpaid-clue'], curiosityDelta: 1 });
      recs643cn[1] = makeSharedRecord(1, { unresolvedClues: ['unpaid-clue'] });
      recs643cn[5] = makeSharedRecord(5, { curiosityDelta: 1 });
      const res = await runCA643(recs643cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_OPEN_THREAD_CURIOSITY_DECOUPLED'), 'CAUSALITY_OPEN_THREAD_CURIOSITY_DECOUPLED should not fire');
    });
  });

  describe('Wave 629 — causalityPass: causal highlight open thread decoupled, visual beat dialogue highlight aftermath void, causality open thread zone imbalance', async () => {
    const runCA629 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // CAUSAL_HIGHLIGHT_OPEN_THREAD_DECOUPLED fire:
    // n=6; highlights at 0,1 (no debt); debt at 4,5 (no highlight) → zero overlap → fires
    it('CAUSAL_HIGHLIGHT_OPEN_THREAD_DECOUPLED fires when dialogue-highlight scenes and open-thread scenes never overlap', async () => {
      const recs629a = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs629a[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs629a[1] = makeSharedRecord(1, { dialogueHighlights: ['line-b'] });
      recs629a[4] = makeSharedRecord(4, { unresolvedClues: ['unpaid-clue'] });
      recs629a[5] = makeSharedRecord(5, { unresolvedClues: ['unpaid-clue'] });
      const res = await runCA629(recs629a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSAL_HIGHLIGHT_OPEN_THREAD_DECOUPLED'), 'CAUSAL_HIGHLIGHT_OPEN_THREAD_DECOUPLED should fire');
    });

    // CAUSAL_HIGHLIGHT_OPEN_THREAD_DECOUPLED no-fire:
    // scene 0 carries BOTH a highlight and open debt → overlap exists
    it('CAUSAL_HIGHLIGHT_OPEN_THREAD_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs629an = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs629an[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'], unresolvedClues: ['unpaid-clue'] });
      recs629an[1] = makeSharedRecord(1, { dialogueHighlights: ['line-b'] });
      recs629an[5] = makeSharedRecord(5, { unresolvedClues: ['unpaid-clue'] });
      const res = await runCA629(recs629an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSAL_HIGHLIGHT_OPEN_THREAD_DECOUPLED'), 'CAUSAL_HIGHLIGHT_OPEN_THREAD_DECOUPLED should not fire');
    });

    // VISUAL_BEAT_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fire:
    // n=8, window=2; staged triggers at 0,1; their windows {1,2} and {2,3} carry no dialogue
    // highlight; highlights exist elsewhere at 5,6,7 → fires
    it('VISUAL_BEAT_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when no visually-staged scene is followed by a dialogue highlight within 2 scenes', async () => {
      const recs629b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs629b[0] = makeSharedRecord(0, { visualBeats: ['grabs the phone', 'checks the screen'] });
      recs629b[1] = makeSharedRecord(1, { visualBeats: ['grabs the phone', 'checks the screen'] });
      recs629b[5] = makeSharedRecord(5, { dialogueHighlights: ['line-a'] });
      recs629b[6] = makeSharedRecord(6, { dialogueHighlights: ['line-b'] });
      recs629b[7] = makeSharedRecord(7, { dialogueHighlights: ['line-c'] });
      const res = await runCA629(recs629b);
      assert.ok(res.issues.some((i: any) => i.rule === 'VISUAL_BEAT_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'VISUAL_BEAT_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    // VISUAL_BEAT_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries a highlight → that trigger's
    // aftermath is no longer void
    it('VISUAL_BEAT_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a trigger window contains a dialogue highlight', async () => {
      const recs629bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs629bn[0] = makeSharedRecord(0, { visualBeats: ['grabs the phone', 'checks the screen'] });
      recs629bn[1] = makeSharedRecord(1, { visualBeats: ['grabs the phone', 'checks the screen'] });
      recs629bn[3] = makeSharedRecord(3, { dialogueHighlights: ['line-a'] });
      recs629bn[5] = makeSharedRecord(5, { dialogueHighlights: ['line-b'] });
      recs629bn[6] = makeSharedRecord(6, { dialogueHighlights: ['line-c'] });
      recs629bn[7] = makeSharedRecord(7, { dialogueHighlights: ['line-d'] });
      const res = await runCA629(recs629bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VISUAL_BEAT_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'VISUAL_BEAT_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });

    // CAUSALITY_OPEN_THREAD_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); debt at 6,7,8,9; zone 2 (6-8)=3, zone 3 (9)=1, total=4;
    // zones 0,1 empty; bloatZoneIdx=zone2, 3/4=75% ≥ 50% → fires
    it('CAUSALITY_OPEN_THREAD_ZONE_IMBALANCE fires when one zone is empty of open-thread scenes while another is bloated', async () => {
      const recs629c = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs629c[6] = makeSharedRecord(6, { unresolvedClues: ['a'] });
      recs629c[7] = makeSharedRecord(7, { unresolvedClues: ['b'] });
      recs629c[8] = makeSharedRecord(8, { unresolvedClues: ['c'] });
      recs629c[9] = makeSharedRecord(9, { unresolvedClues: ['d'] });
      const res = await runCA629(recs629c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CAUSALITY_OPEN_THREAD_ZONE_IMBALANCE'), 'CAUSALITY_OPEN_THREAD_ZONE_IMBALANCE should fire');
    });

    // CAUSALITY_OPEN_THREAD_ZONE_IMBALANCE no-fire:
    // one open-thread scene per zone (1,4,7,10) → no zone is empty
    it('CAUSALITY_OPEN_THREAD_ZONE_IMBALANCE does not fire when open-thread scenes are spread across all zones', async () => {
      const recs629cn = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs629cn[1] = makeSharedRecord(1, { unresolvedClues: ['a'] });
      recs629cn[4] = makeSharedRecord(4, { unresolvedClues: ['b'] });
      recs629cn[7] = makeSharedRecord(7, { unresolvedClues: ['c'] });
      recs629cn[10] = makeSharedRecord(10, { unresolvedClues: ['d'] });
      const res = await runCA629(recs629cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CAUSALITY_OPEN_THREAD_ZONE_IMBALANCE'), 'CAUSALITY_OPEN_THREAD_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 615 — causalityPass: visual beat causality zone imbalance, open thread dramatic turn decoupled, visual beat peak uncaused', async () => {
    const runCA615 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // VISUAL_BEAT_CAUSALITY_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); visually dense scenes (visualBeats≥2) at 6,9,10,11;
    // zones 0 (0-2) and 1 (3-5) are empty; zone 3 (9-11) holds 3/4 = 75% ≥ 50% → fires
    it('VISUAL_BEAT_CAUSALITY_ZONE_IMBALANCE fires when one zone is empty of visually dense scenes while another is bloated', async () => {
      const recs615a = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs615a[6] = makeSharedRecord(6, { visualBeats: ['tears the letter', 'lights the match'] });
      recs615a[9] = makeSharedRecord(9, { visualBeats: ['tears the letter', 'lights the match'] });
      recs615a[10] = makeSharedRecord(10, { visualBeats: ['tears the letter', 'lights the match'] });
      recs615a[11] = makeSharedRecord(11, { visualBeats: ['tears the letter', 'lights the match'] });
      const res = await runCA615(recs615a);
      assert.ok(res.issues.some((i: any) => i.rule === 'VISUAL_BEAT_CAUSALITY_ZONE_IMBALANCE'), 'VISUAL_BEAT_CAUSALITY_ZONE_IMBALANCE should fire');
    });

    // VISUAL_BEAT_CAUSALITY_ZONE_IMBALANCE no-fire:
    // one visually dense scene per zone (1,4,7,10) → no zone is empty
    it('VISUAL_BEAT_CAUSALITY_ZONE_IMBALANCE does not fire when every zone has a visually dense scene', async () => {
      const recs615an = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs615an[1] = makeSharedRecord(1, { visualBeats: ['tears the letter', 'lights the match'] });
      recs615an[4] = makeSharedRecord(4, { visualBeats: ['tears the letter', 'lights the match'] });
      recs615an[7] = makeSharedRecord(7, { visualBeats: ['tears the letter', 'lights the match'] });
      recs615an[10] = makeSharedRecord(10, { visualBeats: ['tears the letter', 'lights the match'] });
      const res = await runCA615(recs615an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VISUAL_BEAT_CAUSALITY_ZONE_IMBALANCE'), 'VISUAL_BEAT_CAUSALITY_ZONE_IMBALANCE should not fire');
    });

    // OPEN_THREAD_DRAMATIC_TURN_DECOUPLED fire:
    // n=8; open threads at 0,1 (no turn); turns at 2,3 (no open thread) → zero overlap → fires
    it('OPEN_THREAD_DRAMATIC_TURN_DECOUPLED fires when open-thread scenes and dramatic-turn scenes never overlap', async () => {
      const recs615b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs615b[0] = makeSharedRecord(0, { unresolvedClues: ['unpaid-clue'] });
      recs615b[1] = makeSharedRecord(1, { unresolvedClues: ['unpaid-clue'] });
      recs615b[2] = makeSharedRecord(2, { dramaticTurn: 'reversal' });
      recs615b[3] = makeSharedRecord(3, { dramaticTurn: 'revelation' });
      const res = await runCA615(recs615b);
      assert.ok(res.issues.some((i: any) => i.rule === 'OPEN_THREAD_DRAMATIC_TURN_DECOUPLED'), 'OPEN_THREAD_DRAMATIC_TURN_DECOUPLED should fire');
    });

    // OPEN_THREAD_DRAMATIC_TURN_DECOUPLED no-fire:
    // scene 2 carries BOTH an open thread and a dramatic turn → overlap exists
    it('OPEN_THREAD_DRAMATIC_TURN_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs615bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs615bn[0] = makeSharedRecord(0, { unresolvedClues: ['unpaid-clue'] });
      recs615bn[1] = makeSharedRecord(1, { unresolvedClues: ['unpaid-clue'] });
      recs615bn[2] = makeSharedRecord(2, { unresolvedClues: ['unpaid-clue'], dramaticTurn: 'reversal' });
      recs615bn[3] = makeSharedRecord(3, { dramaticTurn: 'revelation' });
      const res = await runCA615(recs615bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'OPEN_THREAD_DRAMATIC_TURN_DECOUPLED'), 'OPEN_THREAD_DRAMATIC_TURN_DECOUPLED should not fire');
    });

    // VISUAL_BEAT_PEAK_UNCAUSED fire:
    // 8 scenes; visualBeats present at 2 (1 beat) and 6 (5 beats, the peak); no dramaticTurn or
    // revelation at 6, 5, or 4
    it('VISUAL_BEAT_PEAK_UNCAUSED fires when the peak physical-staging scene has no dramatic turn or revelation nearby', async () => {
      const recs615c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs615c[2] = makeSharedRecord(2, { visualBeats: ['glances at the clock'] });
      recs615c[6] = makeSharedRecord(6, { visualBeats: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runCA615(recs615c);
      assert.ok(res.issues.some((i: any) => i.rule === 'VISUAL_BEAT_PEAK_UNCAUSED'), 'VISUAL_BEAT_PEAK_UNCAUSED should fire');
    });

    // VISUAL_BEAT_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('VISUAL_BEAT_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs615cn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs615cn[2] = makeSharedRecord(2, { visualBeats: ['glances at the clock'] });
      recs615cn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs615cn[6] = makeSharedRecord(6, { visualBeats: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runCA615(recs615cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VISUAL_BEAT_PEAK_UNCAUSED'), 'VISUAL_BEAT_PEAK_UNCAUSED should not fire');
    });
  });

  describe('Wave 601 — causalityPass: stated belief revelation decoupled, stated belief dramatic-turn aftermath void, stated belief zone imbalance', async () => {
    const runCA601 = async (records: ScreenplaySceneRecord[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('STATED_BELIEF_REVELATION_DECOUPLED fires when no belief-assertion scene coincides with a revelation', async () => {
      // 6 scenes; belief assertions at 0,1; revelations at 4,5 — zero overlap
      const recs601a = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs601a[0] = makeSharedRecord(0, { dialogueHighlights: ['alice: believes X'] });
      recs601a[1] = makeSharedRecord(1, { dialogueHighlights: ['bob: believes Y'] });
      recs601a[4] = makeSharedRecord(4, { revelation: 'She was lying.' });
      recs601a[5] = makeSharedRecord(5, { revelation: 'He knew all along.' });
      const res = await runCA601(recs601a);
      assert.ok(res.issues.some((i: any) => i.rule === 'STATED_BELIEF_REVELATION_DECOUPLED'), 'STATED_BELIEF_REVELATION_DECOUPLED should fire');
    });

    it('STATED_BELIEF_REVELATION_DECOUPLED does not fire when a belief-assertion scene also carries a revelation', async () => {
      const recs601a = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs601a[0] = makeSharedRecord(0, { dialogueHighlights: ['alice: believes X'], revelation: 'She was lying.' });
      recs601a[1] = makeSharedRecord(1, { dialogueHighlights: ['bob: believes Y'] });
      recs601a[4] = makeSharedRecord(4, { revelation: 'He knew all along.' });
      const res = await runCA601(recs601a);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STATED_BELIEF_REVELATION_DECOUPLED'), 'STATED_BELIEF_REVELATION_DECOUPLED should not fire');
    });

    it('STATED_BELIEF_DRAMATIC_TURN_AFTERMATH_VOID fires when no belief-assertion scene is followed by a dramatic turn within 2 scenes', async () => {
      // 9 scenes; belief assertions at 0,1,2 (windows reach at most scene 4); turns at 7,8 (outside every window)
      const recs601b = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs601b[0] = makeSharedRecord(0, { dialogueHighlights: ['a'] });
      recs601b[1] = makeSharedRecord(1, { dialogueHighlights: ['b'] });
      recs601b[2] = makeSharedRecord(2, { dialogueHighlights: ['c'] });
      recs601b[7] = makeSharedRecord(7, { dramaticTurn: 'reversal' });
      recs601b[8] = makeSharedRecord(8, { dramaticTurn: 'revelation' });
      const res = await runCA601(recs601b);
      assert.ok(res.issues.some((i: any) => i.rule === 'STATED_BELIEF_DRAMATIC_TURN_AFTERMATH_VOID'), 'STATED_BELIEF_DRAMATIC_TURN_AFTERMATH_VOID should fire');
    });

    it('STATED_BELIEF_DRAMATIC_TURN_AFTERMATH_VOID does not fire when a belief-assertion scene is followed by a dramatic turn within 2 scenes', async () => {
      const recs601bnr = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs601bnr[0] = makeSharedRecord(0, { dialogueHighlights: ['a'] });
      recs601bnr[1] = makeSharedRecord(1, { dialogueHighlights: ['b'] });
      recs601bnr[2] = makeSharedRecord(2, { dialogueHighlights: ['c'], dramaticTurn: 'reversal' });
      recs601bnr[7] = makeSharedRecord(7, { dramaticTurn: 'revelation' });
      const res = await runCA601(recs601bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STATED_BELIEF_DRAMATIC_TURN_AFTERMATH_VOID'), 'STATED_BELIEF_DRAMATIC_TURN_AFTERMATH_VOID should not fire');
    });

    it('STATED_BELIEF_ZONE_IMBALANCE fires when one zone has zero belief-assertion scenes and another has ≥50%', async () => {
      // 12 scenes, 4 zones of 3: belief assertions at 6,7,8 (zone 2) plus 9 (zone 3) to meet minCount=4
      const recs601c = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs601c[6] = makeSharedRecord(6, { dialogueHighlights: ['a'] });
      recs601c[7] = makeSharedRecord(7, { dialogueHighlights: ['b'] });
      recs601c[8] = makeSharedRecord(8, { dialogueHighlights: ['c'] });
      recs601c[9] = makeSharedRecord(9, { dialogueHighlights: ['d'] });
      const res = await runCA601(recs601c);
      assert.ok(res.issues.some((i: any) => i.rule === 'STATED_BELIEF_ZONE_IMBALANCE'), 'STATED_BELIEF_ZONE_IMBALANCE should fire');
    });

    it('STATED_BELIEF_ZONE_IMBALANCE does not fire when belief-assertion scenes are spread across all zones', async () => {
      const recs601cnr = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs601cnr[1] = makeSharedRecord(1, { dialogueHighlights: ['a'] });
      recs601cnr[4] = makeSharedRecord(4, { dialogueHighlights: ['b'] });
      recs601cnr[7] = makeSharedRecord(7, { dialogueHighlights: ['c'] });
      recs601cnr[10] = makeSharedRecord(10, { dialogueHighlights: ['d'] });
      const res = await runCA601(recs601cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STATED_BELIEF_ZONE_IMBALANCE'), 'STATED_BELIEF_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 587 — causalityPass: dramatic-turn suspense aftermath void, clock curiosity aftermath void, payoff closing-third absent', async () => {
    const makeRec587 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const runCA587 = async (records: any[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // DRAMATIC_TURN_SUSPENSE_AFTERMATH_VOID fire:
    // 10 scenes; dramatic turns at 0,3 (pos<9); suspense rises at 6,8 (not at 1,4) → fires
    it('DRAMATIC_TURN_SUSPENSE_AFTERMATH_VOID fires when no dramatic turn is followed by a suspense rise', async () => {
      const recs587a = Array.from({ length: 10 }, (_, i) =>
        makeRec587(i, {
          dramaticTurn: i === 0 || i === 3 ? 'reversal' : 'nothing',
          suspenseDelta: i === 6 || i === 8 ? 1 : 0,
        })
      );
      const res = await runCA587(recs587a);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'DRAMATIC_TURN_SUSPENSE_AFTERMATH_VOID'), 'DRAMATIC_TURN_SUSPENSE_AFTERMATH_VOID should fire');
    });

    // DRAMATIC_TURN_SUSPENSE_AFTERMATH_VOID no-fire:
    // suspense rise at 1 (aftermath of dramatic turn at 0) → does not fire
    it('DRAMATIC_TURN_SUSPENSE_AFTERMATH_VOID does not fire when a dramatic turn is followed by a suspense rise', async () => {
      const recs587an = Array.from({ length: 10 }, (_, i) =>
        makeRec587(i, {
          dramaticTurn: i === 0 || i === 3 ? 'reversal' : 'nothing',
          suspenseDelta: i === 1 || i === 7 ? 1 : 0,
        })
      );
      const res = await runCA587(recs587an);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'DRAMATIC_TURN_SUSPENSE_AFTERMATH_VOID'), 'DRAMATIC_TURN_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    // CLOCK_CURIOSITY_AFTERMATH_VOID fire:
    // 10 scenes; clocks raised at 0,3 (pos<9); curiosity spikes at 6,8 (not at 1,4) → fires
    it('CLOCK_CURIOSITY_AFTERMATH_VOID fires when no clock raise is followed by a curiosity spike', async () => {
      const recs587b = Array.from({ length: 10 }, (_, i) =>
        makeRec587(i, {
          clockRaised: i === 0 || i === 3,
          curiosityDelta: i === 6 || i === 8 ? 1 : 0,
        })
      );
      const res = await runCA587(recs587b);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'CLOCK_CURIOSITY_AFTERMATH_VOID'), 'CLOCK_CURIOSITY_AFTERMATH_VOID should fire');
    });

    // CLOCK_CURIOSITY_AFTERMATH_VOID no-fire:
    // curiosity spike at 1 (aftermath of clock at 0) → does not fire
    it('CLOCK_CURIOSITY_AFTERMATH_VOID does not fire when a clock raise is followed by a curiosity spike', async () => {
      const recs587bn = Array.from({ length: 10 }, (_, i) =>
        makeRec587(i, {
          clockRaised: i === 0 || i === 3,
          curiosityDelta: i === 1 || i === 7 ? 1 : 0,
        })
      );
      const res = await runCA587(recs587bn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'CLOCK_CURIOSITY_AFTERMATH_VOID'), 'CLOCK_CURIOSITY_AFTERMATH_VOID should not fire');
    });

    // PAYOFF_CLOSING_THIRD_ABSENT fire:
    // 9 scenes; payoffs at 0,2,4 (all in opening/middle thirds, none at pos≥6) → fires
    it('PAYOFF_CLOSING_THIRD_ABSENT fires when payoffs exist but none are in the closing third', async () => {
      const recs587c = Array.from({ length: 9 }, (_, i) =>
        makeRec587(i, { payoffSetupIds: i === 0 || i === 2 || i === 4 ? ['t-A'] : [] })
      );
      const res = await runCA587(recs587c);
      assert.ok(res.issues.some((iss: any) => iss.rule === 'PAYOFF_CLOSING_THIRD_ABSENT'), 'PAYOFF_CLOSING_THIRD_ABSENT should fire');
    });

    // PAYOFF_CLOSING_THIRD_ABSENT no-fire:
    // payoff at 7 (closing third: pos≥6 in 9 scenes) → does not fire
    it('PAYOFF_CLOSING_THIRD_ABSENT does not fire when a payoff appears in the closing third', async () => {
      const recs587cn = Array.from({ length: 9 }, (_, i) =>
        makeRec587(i, { payoffSetupIds: i === 0 || i === 2 || i === 7 ? ['t-A'] : [] })
      );
      const res = await runCA587(recs587cn);
      assert.ok(!res.issues.some((iss: any) => iss.rule === 'PAYOFF_CLOSING_THIRD_ABSENT'), 'PAYOFF_CLOSING_THIRD_ABSENT should not fire');
    });
  });


  describe('Wave 573 — causalityPass: relationship opening third absent, suspense temporal cluster, curiosity temporal cluster', async () => {
    const makeRec573 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const mkShift573 = (amount: number) => [{ pairKey: 'A-B', dimension: 'trust', amount }];
    const runCaus573 = async (records: any[]) => causalityPass({
      fountain: Array.from({ length: records.length }, (_, i) => `INT. SC${i} - DAY\n\nAction.`).join('\n\n'),
      original: '', records, structure: {
        escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
        approachingClimax: false, revelationCount: 0, actBreaks: [],
      } as any,
      annotations: Array.from({ length: records.length }, () => ({} as any)),
      approvedSpans: [],
    });

    it('RELATIONSHIP_OPENING_THIRD_ABSENT fires when ≥3 relShift scenes all outside the opening third', async () => {
      // 9 scenes: opening third = scenes 0–2; all shifts at scenes 3,5,7
      const recs573a = Array.from({ length: 9 }, (_, i) => makeRec573(i));
      recs573a[3] = makeRec573(3, { relationshipShifts: mkShift573(0.5) });
      recs573a[5] = makeRec573(5, { relationshipShifts: mkShift573(0.4) });
      recs573a[7] = makeRec573(7, { relationshipShifts: mkShift573(0.6) });
      const res = await runCaus573(recs573a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_OPENING_THIRD_ABSENT'), 'RELATIONSHIP_OPENING_THIRD_ABSENT should fire');
    });

    it('RELATIONSHIP_OPENING_THIRD_ABSENT does not fire when a relShift exists in the opening third', async () => {
      // shift at scene 1 (in opening third 0–2) → condition unsatisfied
      const recs573a = Array.from({ length: 9 }, (_, i) => makeRec573(i));
      recs573a[1] = makeRec573(1, { relationshipShifts: mkShift573(0.5) });
      recs573a[5] = makeRec573(5, { relationshipShifts: mkShift573(0.4) });
      recs573a[7] = makeRec573(7, { relationshipShifts: mkShift573(0.6) });
      const res = await runCaus573(recs573a);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_OPENING_THIRD_ABSENT'), 'RELATIONSHIP_OPENING_THIRD_ABSENT should not fire');
    });

    it('SUSPENSE_TEMPORAL_CLUSTER fires when >75% of suspense scenes cluster in one third', async () => {
      // 9 scenes, third=3; all 3 suspense-rise scenes in opening third (0,1,2) → 100% > 75%
      const recs573b = Array.from({ length: 9 }, (_, i) => makeRec573(i));
      recs573b[0] = makeRec573(0, { suspenseDelta: 1 });
      recs573b[1] = makeRec573(1, { suspenseDelta: 1 });
      recs573b[2] = makeRec573(2, { suspenseDelta: 1 });
      const res = await runCaus573(recs573b);
      assert.ok(res.issues.some((i: any) => i.rule === 'SUSPENSE_TEMPORAL_CLUSTER'), 'SUSPENSE_TEMPORAL_CLUSTER should fire');
    });

    it('SUSPENSE_TEMPORAL_CLUSTER does not fire when suspense is distributed across thirds', async () => {
      // one suspense scene per third (0, 3, 7) → maxZ/total = 1/3 = 33%
      const recs573b = Array.from({ length: 9 }, (_, i) => makeRec573(i));
      recs573b[0] = makeRec573(0, { suspenseDelta: 1 });
      recs573b[3] = makeRec573(3, { suspenseDelta: 1 });
      recs573b[7] = makeRec573(7, { suspenseDelta: 1 });
      const res = await runCaus573(recs573b);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SUSPENSE_TEMPORAL_CLUSTER'), 'SUSPENSE_TEMPORAL_CLUSTER should not fire');
    });

    it('CURIOSITY_TEMPORAL_CLUSTER fires when >75% of curiosity scenes cluster in one third', async () => {
      // 9 scenes; all 3 curiosity-rise scenes in closing third (6,7,8) → 100% > 75%
      const recs573c = Array.from({ length: 9 }, (_, i) => makeRec573(i));
      recs573c[6] = makeRec573(6, { curiosityDelta: 1 });
      recs573c[7] = makeRec573(7, { curiosityDelta: 1 });
      recs573c[8] = makeRec573(8, { curiosityDelta: 1 });
      const res = await runCaus573(recs573c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CURIOSITY_TEMPORAL_CLUSTER'), 'CURIOSITY_TEMPORAL_CLUSTER should fire');
    });

    it('CURIOSITY_TEMPORAL_CLUSTER does not fire when curiosity is distributed across thirds', async () => {
      // one curiosity scene per third (1, 4, 7) → maxZ/total = 1/3 = 33%
      const recs573c = Array.from({ length: 9 }, (_, i) => makeRec573(i));
      recs573c[1] = makeRec573(1, { curiosityDelta: 1 });
      recs573c[4] = makeRec573(4, { curiosityDelta: 1 });
      recs573c[7] = makeRec573(7, { curiosityDelta: 1 });
      const res = await runCaus573(recs573c);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CURIOSITY_TEMPORAL_CLUSTER'), 'CURIOSITY_TEMPORAL_CLUSTER should not fire');
    });
  });


  describe('Wave 559 — causalityPass: relationship shift uncaused, relationship closing third absent, payoff relationship aftermath void', async () => {
    const makeRec559 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const runC559 = async (records: any[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: records.map(() => ({} as any)), approvedSpans: [] });
    };

    // RELATIONSHIP_SHIFT_UNCAUSED fire:
    // 8 scenes; relationship shifts at pos 2,4,6 (all ≥2); prior 2 scenes of each have no
    // suspense/revelation/turn → all uncaused → fires
    it('RELATIONSHIP_SHIFT_UNCAUSED fires when all relationship shifts lack causal drivers in prior 2 scenes', async () => {
      const recs559a = Array.from({ length: 8 }, (_, i) =>
        makeRec559(i, {
          relationshipShifts: [2, 4, 6].includes(i) ? [{ pairKey: 'A-B', dimension: 'trust', amount: 1 }] : [],
          suspenseDelta: 0,
          revelation: null,
          dramaticTurn: 'nothing',
        }),
      );
      const res = await runC559(recs559a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SHIFT_UNCAUSED'), 'RELATIONSHIP_SHIFT_UNCAUSED should fire');
    });

    // RELATIONSHIP_SHIFT_UNCAUSED no-fire:
    // 8 scenes; relationship shift at pos 3; scene at pos 2 has suspenseDelta>0 → caused → no fire
    it('RELATIONSHIP_SHIFT_UNCAUSED does not fire when a relationship shift is preceded by a suspense driver', async () => {
      const recs559anr = Array.from({ length: 8 }, (_, i) =>
        makeRec559(i, {
          relationshipShifts: [3, 5, 7].includes(i) ? [{ pairKey: 'A-B', dimension: 'trust', amount: 1 }] : [],
          suspenseDelta: i === 2 ? 2 : 0, // scene 2 causes shift at scene 3
        }),
      );
      const res = await runC559(recs559anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SHIFT_UNCAUSED'), 'RELATIONSHIP_SHIFT_UNCAUSED should not fire');
    });

    // RELATIONSHIP_CLOSING_THIRD_ABSENT fire:
    // 9 scenes; relationship shifts at pos 0,1,2; closingStart=ceil(9*2/3)=6; none at pos≥6 → fires
    it('RELATIONSHIP_CLOSING_THIRD_ABSENT fires when no relationship shifts occur in the final third', async () => {
      const recs559b = Array.from({ length: 9 }, (_, i) =>
        makeRec559(i, {
          relationshipShifts: [0, 1, 2].includes(i) ? [{ pairKey: 'A-B', dimension: 'trust', amount: 1 }] : [],
        }),
      );
      const res = await runC559(recs559b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_CLOSING_THIRD_ABSENT'), 'RELATIONSHIP_CLOSING_THIRD_ABSENT should fire');
    });

    // RELATIONSHIP_CLOSING_THIRD_ABSENT no-fire:
    // 9 scenes; relationship shifts at pos 0,1,7; closingStart=6; pos 7 ≥ 6 → inFinal=true → no fire
    it('RELATIONSHIP_CLOSING_THIRD_ABSENT does not fire when a relationship shift exists in the final third', async () => {
      const recs559bnr = Array.from({ length: 9 }, (_, i) =>
        makeRec559(i, {
          relationshipShifts: [0, 1, 7].includes(i) ? [{ pairKey: 'A-B', dimension: 'trust', amount: 1 }] : [],
        }),
      );
      const res = await runC559(recs559bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_CLOSING_THIRD_ABSENT'), 'RELATIONSHIP_CLOSING_THIRD_ABSENT should not fire');
    });

    // PAYOFF_RELATIONSHIP_AFTERMATH_VOID fire:
    // 8 scenes; payoffs at pos 0,2,4 (all<7); scenes at 1,3,5 have empty relationshipShifts →
    // 3 qualifying, all followed by no relationship shift → fires
    it('PAYOFF_RELATIONSHIP_AFTERMATH_VOID fires when all payoff scenes are followed by no relationship shift', async () => {
      const recs559c = Array.from({ length: 8 }, (_, i) =>
        makeRec559(i, {
          payoffSetupIds: [0, 2, 4].includes(i) ? ['setup-A'] : [],
          relationshipShifts: [],
        }),
      );
      const res = await runC559(recs559c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_RELATIONSHIP_AFTERMATH_VOID'), 'PAYOFF_RELATIONSHIP_AFTERMATH_VOID should fire');
    });

    // PAYOFF_RELATIONSHIP_AFTERMATH_VOID no-fire:
    // 8 scenes; payoffs at pos 0,2,4; scene at pos 1 has relationshipShifts non-empty →
    // not all void → no fire
    it('PAYOFF_RELATIONSHIP_AFTERMATH_VOID does not fire when a payoff aftermath carries a relationship shift', async () => {
      const recs559cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec559(i, {
          payoffSetupIds: [0, 2, 4].includes(i) ? ['setup-A'] : [],
          relationshipShifts: i === 1 ? [{ pairKey: 'A-B', dimension: 'trust', amount: 1 }] : [],
        }),
      );
      const res = await runC559(recs559cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_RELATIONSHIP_AFTERMATH_VOID'), 'PAYOFF_RELATIONSHIP_AFTERMATH_VOID should not fire');
    });
  });


  describe('Wave 545 — causalityPass: payoff aftermath curiosity void, emotional opening third absent, seed stasis run', async () => {
    const makeRec545 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const runCA545 = async (records: any[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // PAYOFF_AFTERMATH_CURIOSITY_VOID fire:
    // n=10; payoffs at i=2,4,6 (pos<9); following scenes 3,5,7 all have curiosityDelta=0
    // avgCurAftermath=(0+0+0)/3=0≤0 → fires
    it('PAYOFF_AFTERMATH_CURIOSITY_VOID fires when post-payoff scenes average zero curiosityDelta', async () => {
      const recs545a = Array.from({ length: 10 }, (_, i) =>
        makeRec545(i, {
          payoffSetupIds: [2, 4, 6].includes(i) ? ['setup-1'] : [],
          curiosityDelta: 0,
        }),
      );
      const res = await runCA545(recs545a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_AFTERMATH_CURIOSITY_VOID'), 'PAYOFF_AFTERMATH_CURIOSITY_VOID should fire');
    });

    // PAYOFF_AFTERMATH_CURIOSITY_VOID no-fire:
    // payoffs at i=2,4,6; scene 3 (follows payoff 2) has curiosityDelta=1 → avg=(1+0+0)/3>0 → no fire
    it('PAYOFF_AFTERMATH_CURIOSITY_VOID does not fire when at least one post-payoff scene has positive curiosityDelta', async () => {
      const recs545anr = Array.from({ length: 10 }, (_, i) =>
        makeRec545(i, {
          payoffSetupIds: [2, 4, 6].includes(i) ? ['setup-1'] : [],
          curiosityDelta: i === 3 ? 1 : 0,
        }),
      );
      const res = await runCA545(recs545anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_AFTERMATH_CURIOSITY_VOID'), 'PAYOFF_AFTERMATH_CURIOSITY_VOID should not fire');
    });

    // EMOTIONAL_OPENING_THIRD_ABSENT fire:
    // n=9; thirdEnd=3; charged scenes at i=4,6,8 (all≥3); opening third 0-2 has none → fires
    it('EMOTIONAL_OPENING_THIRD_ABSENT fires when opening third contains no emotionally charged scenes', async () => {
      const recs545b = Array.from({ length: 9 }, (_, i) =>
        makeRec545(i, {
          emotionalShift: [4, 6, 8].includes(i) ? 'positive' : 'neutral',
        }),
      );
      const res = await runCA545(recs545b);
      assert.ok(res.issues.some((i: any) => i.rule === 'EMOTIONAL_OPENING_THIRD_ABSENT'), 'EMOTIONAL_OPENING_THIRD_ABSENT should fire');
    });

    // EMOTIONAL_OPENING_THIRD_ABSENT no-fire:
    // n=9; charged scenes at i=1,4,6 — i=1 is in opening third (1<3) → not empty → no fire
    it('EMOTIONAL_OPENING_THIRD_ABSENT does not fire when the opening third has at least one charged scene', async () => {
      const recs545bnr = Array.from({ length: 9 }, (_, i) =>
        makeRec545(i, {
          emotionalShift: [1, 4, 6].includes(i) ? 'positive' : 'neutral',
        }),
      );
      const res = await runCA545(recs545bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'EMOTIONAL_OPENING_THIRD_ABSENT'), 'EMOTIONAL_OPENING_THIRD_ABSENT should not fire');
    });

    // SEED_STASIS_RUN fire:
    // n=10; seeds at i=0,1,9; gap between i=1 and i=9 = 7 scenes (2-8); maxGap=7≥7 → fires
    it('SEED_STASIS_RUN fires when 7+ consecutive scenes contain no planted clue', async () => {
      const recs545c = Array.from({ length: 10 }, (_, i) =>
        makeRec545(i, {
          seededClueIds: [0, 1, 9].includes(i) ? ['clue-x'] : [],
        }),
      );
      const res = await runCA545(recs545c);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_STASIS_RUN'), 'SEED_STASIS_RUN should fire');
    });

    // SEED_STASIS_RUN no-fire:
    // seeds at i=0,4,9; gaps = 3 (1-3) and 4 (5-8) → maxGap=4<7 → no fire
    it('SEED_STASIS_RUN does not fire when no seed gap reaches 7 consecutive scenes', async () => {
      const recs545cnr = Array.from({ length: 10 }, (_, i) =>
        makeRec545(i, {
          seededClueIds: [0, 4, 9].includes(i) ? ['clue-x'] : [],
        }),
      );
      const res = await runCA545(recs545cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_STASIS_RUN'), 'SEED_STASIS_RUN should not fire');
    });
  });


  describe('Wave 531 — causalityPass: suspense spike relationship void, clock temporal cluster, seed aftermath suspense void', async () => {
    const makeRec531 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      seededClueIds: [], payoffSetupIds: [], revelation: null,
      dialogueHighlights: [], relationshipShifts: [], dramaticTurn: 'nothing',
      purpose: 'development', unresolvedClues: [],
      ...overrides,
    });
    const runC531 = async (records: any[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('SUSPENSE_SPIKE_RELATIONSHIP_VOID fires when all high-suspense scenes lack relationship shifts', async () => {
      // 8 scenes: suspense spikes (suspenseDelta=2) at positions 1,3 (no relShifts);
      // rel shifts at positions 5,7; zero overlap → fires.
      // amount:0.1 (<0.4) keeps MOTIVATION_REVERSAL_UNCAUSED from processing these shifts.
      const recs531a = Array.from({ length: 8 }, (_, i) =>
        makeRec531(i, {
          suspenseDelta: [1, 3].includes(i) ? 2 : 0,
          relationshipShifts: [5, 7].includes(i) ? [{ from: 'A', to: 'B', nature: 'closer', amount: 0.1, pairKey: 'A-B' }] : [],
        })
      );
      const res = await runC531(recs531a);
      assert.ok(res.issues.some((i: any) => i.rule === 'SUSPENSE_SPIKE_RELATIONSHIP_VOID'), 'SUSPENSE_SPIKE_RELATIONSHIP_VOID should fire');
    });

    it('SUSPENSE_SPIKE_RELATIONSHIP_VOID does not fire when a high-suspense scene has a relationship shift', async () => {
      // 8 scenes: suspense spikes at 1,3; rel shifts at 1,5 — position 1 has BOTH → overlap → no fire
      // amount:0.1 (<0.4) keeps MOTIVATION_REVERSAL_UNCAUSED from processing these shifts.
      const recs531ano = Array.from({ length: 8 }, (_, i) =>
        makeRec531(i, {
          suspenseDelta: [1, 3].includes(i) ? 2 : 0,
          relationshipShifts: [1, 5].includes(i) ? [{ from: 'A', to: 'B', nature: 'closer', amount: 0.1, pairKey: 'A-B' }] : [],
        })
      );
      const res = await runC531(recs531ano);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SUSPENSE_SPIKE_RELATIONSHIP_VOID'), 'SUSPENSE_SPIKE_RELATIONSHIP_VOID should not fire');
    });

    it('CLOCK_TEMPORAL_CLUSTER fires when >75% of clock-raised scenes are in one structural third', async () => {
      // 9 scenes (third=3): clockRaised at positions 0,1,2 — all in opening third;
      // zone1=3, zone2=0, zone3=0; 3/3 = 100% > 75% → fires
      const recs531b = Array.from({ length: 9 }, (_, i) =>
        makeRec531(i, { clockRaised: [0, 1, 2].includes(i) })
      );
      const res = await runC531(recs531b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_TEMPORAL_CLUSTER'), 'CLOCK_TEMPORAL_CLUSTER should fire');
    });

    it('CLOCK_TEMPORAL_CLUSTER does not fire when clock scenes are spread across thirds', async () => {
      // 9 scenes (third=3): clockRaised at positions 0,1,5 — zone1=2, zone2=1, zone3=0;
      // 2/3 ≈ 0.67 ≤ 0.75 → no fire
      const recs531bno = Array.from({ length: 9 }, (_, i) =>
        makeRec531(i, { clockRaised: [0, 1, 5].includes(i) })
      );
      const res = await runC531(recs531bno);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_TEMPORAL_CLUSTER'), 'CLOCK_TEMPORAL_CLUSTER should not fire');
    });

    it('SEED_AFTERMATH_SUSPENSE_VOID fires when avg next-scene suspenseDelta after seeds ≤ 0', async () => {
      // 9 scenes: seeds at positions 0,2,4 (not at last pos 8);
      // next scenes (1,3,5) have suspenseDelta -1,0,0; avg = (-1+0+0)/3 = -0.33 ≤ 0 → fires
      const recs531c = Array.from({ length: 9 }, (_, i) =>
        makeRec531(i, {
          seededClueIds: [0, 2, 4].includes(i) ? ['clue-X'] : [],
          suspenseDelta: i === 1 ? -1 : 0,
        })
      );
      const res = await runC531(recs531c);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_AFTERMATH_SUSPENSE_VOID'), 'SEED_AFTERMATH_SUSPENSE_VOID should fire');
    });

    it('SEED_AFTERMATH_SUSPENSE_VOID does not fire when avg next-scene suspenseDelta after seeds > 0', async () => {
      // 9 scenes: seeds at positions 0,2,4; next scenes (1,3,5) have suspenseDelta 1,1,-1;
      // avg = (1+1-1)/3 = 0.33 > 0 → no fire
      const recs531cno = Array.from({ length: 9 }, (_, i) =>
        makeRec531(i, {
          seededClueIds: [0, 2, 4].includes(i) ? ['clue-X'] : [],
          suspenseDelta: i === 1 ? 1 : i === 3 ? 1 : i === 5 ? -1 : 0,
        })
      );
      const res = await runC531(recs531cno);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_AFTERMATH_SUSPENSE_VOID'), 'SEED_AFTERMATH_SUSPENSE_VOID should not fire');
    });
  });


  describe('Wave 517 — causalityPass: payoff aftermath suspense void, negative emotion unbroken run, emotional closing third absent', async () => {
    const makeRec517 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      seededClueIds: [], payoffSetupIds: [], revelation: null,
      dialogueHighlights: [], relationshipShifts: [], dramaticTurn: 'nothing',
      purpose: 'development', unresolvedClues: [],
      ...overrides,
    });
    const runC517 = async (records: any[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('PAYOFF_AFTERMATH_SUSPENSE_VOID fires when avg post-payoff suspenseDelta ≤ 0', async () => {
      // 9 scenes: payoffs at 1,3,5 (not at last pos 8); next scenes (2,4,6) have suspenseDelta 0,-1,0
      // avg = (0 + -1 + 0) / 3 = -0.33 ≤ 0 → fires
      const recs517a = Array.from({ length: 9 }, (_, i) =>
        makeRec517(i, {
          payoffSetupIds: [1, 3, 5].includes(i) ? ['setup-A'] : [],
          suspenseDelta: i === 4 ? -1 : 0,
        }),
      );
      const res = await runC517(recs517a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_AFTERMATH_SUSPENSE_VOID'), 'PAYOFF_AFTERMATH_SUSPENSE_VOID should fire');
    });

    it('PAYOFF_AFTERMATH_SUSPENSE_VOID does not fire when avg post-payoff suspenseDelta > 0', async () => {
      // 9 scenes: payoffs at 1,3,5; scene 4 (after payoff at 3) has suspenseDelta=2 → avg > 0 → no fire
      const recs517anr = Array.from({ length: 9 }, (_, i) =>
        makeRec517(i, {
          payoffSetupIds: [1, 3, 5].includes(i) ? ['setup-A'] : [],
          suspenseDelta: i === 4 ? 2 : 0,
        }),
      );
      const res = await runC517(recs517anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_AFTERMATH_SUSPENSE_VOID'), 'PAYOFF_AFTERMATH_SUSPENSE_VOID should not fire');
    });

    it('NEGATIVE_EMOTION_UNBROKEN_RUN fires when ≥4 consecutive negative-emotion scenes exist', async () => {
      // 9 scenes: negative at 2,3,4,5 (run=4 ≥ 4), total negScenes=4 ≥ 3 → fires
      const recs517b = Array.from({ length: 9 }, (_, i) =>
        makeRec517(i, {
          emotionalShift: [2, 3, 4, 5].includes(i) ? 'negative' : 'neutral',
        }),
      );
      const res = await runC517(recs517b);
      assert.ok(res.issues.some((i: any) => i.rule === 'NEGATIVE_EMOTION_UNBROKEN_RUN'), 'NEGATIVE_EMOTION_UNBROKEN_RUN should fire');
    });

    it('NEGATIVE_EMOTION_UNBROKEN_RUN does not fire when max consecutive negative run < 4', async () => {
      // 9 scenes: negative at 2,4,6 (scattered, maxRun=1), total=3 ≥ 3 → no fire
      const recs517bnr = Array.from({ length: 9 }, (_, i) =>
        makeRec517(i, {
          emotionalShift: [2, 4, 6].includes(i) ? 'negative' : 'neutral',
        }),
      );
      const res = await runC517(recs517bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'NEGATIVE_EMOTION_UNBROKEN_RUN'), 'NEGATIVE_EMOTION_UNBROKEN_RUN should not fire');
    });

    it('EMOTIONAL_CLOSING_THIRD_ABSENT fires when all emotionally charged scenes are outside the final third', async () => {
      // 9 scenes: third=3, final third=idx 6,7,8; charged (positive/negative) at 1,3,5 → none in final → fires
      const recs517c = Array.from({ length: 9 }, (_, i) =>
        makeRec517(i, {
          emotionalShift: [1, 3, 5].includes(i) ? 'positive' : 'neutral',
        }),
      );
      const res = await runC517(recs517c);
      assert.ok(res.issues.some((i: any) => i.rule === 'EMOTIONAL_CLOSING_THIRD_ABSENT'), 'EMOTIONAL_CLOSING_THIRD_ABSENT should fire');
    });

    it('EMOTIONAL_CLOSING_THIRD_ABSENT does not fire when a charged scene exists in the final third', async () => {
      // 9 scenes: charged at 1,3,5 plus 7 (in final third idx 6-8) → inFinal=true → no fire
      const recs517cnr = Array.from({ length: 9 }, (_, i) =>
        makeRec517(i, {
          emotionalShift: [1, 3, 5, 7].includes(i) ? 'positive' : 'neutral',
        }),
      );
      const res = await runC517(recs517cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'EMOTIONAL_CLOSING_THIRD_ABSENT'), 'EMOTIONAL_CLOSING_THIRD_ABSENT should not fire');
    });
  });


  describe('Wave 503 — causalityPass: revelation aftermath suspense void, clock final third absent, positive emotion unbroken run', async () => {
    const makeRec503 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      seededClueIds: [], payoffSetupIds: [], revelation: null,
      dialogueHighlights: [], relationshipShifts: [], dramaticTurn: 'nothing',
      purpose: 'development', unresolvedClues: [],
      ...overrides,
    });
    const runC503 = async (records: any[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: records.map(() => ({} as any)), approvedSpans: [] });
    };

    it('REVELATION_AFTERMATH_SUSPENSE_VOID fires when post-revelation suspense average is <= 0', async () => {
      // n=10; revelations at pos 1,3,5; next scenes (2,4,6) all suspenseDelta=0 → avg=0 <= 0 → fire
      const recs503a = Array.from({ length: 10 }, (_, i) =>
        makeRec503(i, {
          revelation: [1, 3, 5].includes(i) ? 'A secret is revealed.' : null,
          suspenseDelta: 0,
        }),
      );
      const res = await runC503(recs503a);
      assert.ok(res.issues.some((is: any) => is.rule === 'REVELATION_AFTERMATH_SUSPENSE_VOID'), 'REVELATION_AFTERMATH_SUSPENSE_VOID should fire');
    });

    it('REVELATION_AFTERMATH_SUSPENSE_VOID does not fire when post-revelation suspense average is > 0', async () => {
      // n=10; revelations at pos 1,3,5; scene 2 has suspenseDelta=3 (others 0) → avg=1 > 0 → no fire
      const recs503anr = Array.from({ length: 10 }, (_, i) =>
        makeRec503(i, {
          revelation: [1, 3, 5].includes(i) ? 'Hidden truth.' : null,
          suspenseDelta: i === 2 ? 3 : 0,
        }),
      );
      const res = await runC503(recs503anr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'REVELATION_AFTERMATH_SUSPENSE_VOID'), 'REVELATION_AFTERMATH_SUSPENSE_VOID should not fire');
    });

    it('CLOCK_FINAL_THIRD_ABSENT fires when no clock scene falls in the final structural third', async () => {
      // n=9; third=3; clocks at pos 0,2 (zone1 and zone1) — none at pos 6,7,8 → fire
      const recs503b = Array.from({ length: 9 }, (_, i) =>
        makeRec503(i, { clockRaised: [0, 2].includes(i) }),
      );
      const res = await runC503(recs503b);
      assert.ok(res.issues.some((is: any) => is.rule === 'CLOCK_FINAL_THIRD_ABSENT'), 'CLOCK_FINAL_THIRD_ABSENT should fire');
    });

    it('CLOCK_FINAL_THIRD_ABSENT does not fire when a clock scene exists in the final third', async () => {
      // n=9; third=3; clocks at pos 0,7 (zone1 and zone3) → inFinal=true → no fire
      const recs503bnr = Array.from({ length: 9 }, (_, i) =>
        makeRec503(i, { clockRaised: [0, 7].includes(i) }),
      );
      const res = await runC503(recs503bnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'CLOCK_FINAL_THIRD_ABSENT'), 'CLOCK_FINAL_THIRD_ABSENT should not fire');
    });

    it('POSITIVE_EMOTION_UNBROKEN_RUN fires when 4+ consecutive positive-emotion scenes exist', async () => {
      // n=10; positive at pos 2,3,4,5 (run=4); also pos 8 (total=5 >= 3) → maxRun=4 >= 4 → fire
      const recs503c = Array.from({ length: 10 }, (_, i) =>
        makeRec503(i, { emotionalShift: [2, 3, 4, 5, 8].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runC503(recs503c);
      assert.ok(res.issues.some((is: any) => is.rule === 'POSITIVE_EMOTION_UNBROKEN_RUN'), 'POSITIVE_EMOTION_UNBROKEN_RUN should fire');
    });

    it('POSITIVE_EMOTION_UNBROKEN_RUN does not fire when no positive run reaches 4 consecutive scenes', async () => {
      // n=10; positive at pos 2,3,6,7 (two runs of 2) — maxRun=2 < 4 → no fire
      const recs503cnr = Array.from({ length: 10 }, (_, i) =>
        makeRec503(i, { emotionalShift: [2, 3, 6, 7].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runC503(recs503cnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'POSITIVE_EMOTION_UNBROKEN_RUN'), 'POSITIVE_EMOTION_UNBROKEN_RUN should not fire');
    });
  });


  describe('Wave 489 — causalityPass: dramatic turn temporal cluster, clock peak uncaused, seed aftermath curiosity void', async () => {
    const makeRec489 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      seededClueIds: [], payoffSetupIds: [], revelation: null,
      dialogueHighlights: [], relationshipShifts: [], dramaticTurn: 'nothing',
      purpose: 'development', unresolvedClues: [],
      ...overrides,
    });
    const runC489 = async (records: any[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DRAMATIC_TURN_TEMPORAL_CLUSTER fires when >75% of dramatic-turn scenes fall in one third', async () => {
      // n=12; turns at positions 0,1,2,3 (all in first third, floor(12/3)=4 → zone1=0-3)
      // 4/4=100% > 75% → fire
      const recs489a = Array.from({ length: 12 }, (_, i) =>
        makeRec489(i, { dramaticTurn: [0, 1, 2, 3].includes(i) ? 'reversal' : 'nothing' }),
      );
      const res = await runC489(recs489a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DRAMATIC_TURN_TEMPORAL_CLUSTER'), 'DRAMATIC_TURN_TEMPORAL_CLUSTER should fire');
    });

    it('DRAMATIC_TURN_TEMPORAL_CLUSTER does not fire when turns are spread across all thirds', async () => {
      // n=12; turns at positions 0 (zone1), 4 (zone2), 8 (zone3), 11 (zone3) → max=2/4=50% ≤ 75%
      const recs489anr = Array.from({ length: 12 }, (_, i) =>
        makeRec489(i, { dramaticTurn: [0, 4, 8, 11].includes(i) ? 'reversal' : 'nothing' }),
      );
      const res = await runC489(recs489anr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DRAMATIC_TURN_TEMPORAL_CLUSTER'), 'DRAMATIC_TURN_TEMPORAL_CLUSTER should not fire');
    });

    it('CLOCK_PEAK_UNCAUSED fires when the highest-clockDelta scene has no causal driver in prior 2 scenes', async () => {
      // n=8; peak clockDelta=5 at pos 4; scenes 2 and 3 are flat (no drivers) → fire
      const recs489b = Array.from({ length: 8 }, (_, i) =>
        makeRec489(i, { clockDelta: i === 4 ? 5 : 0 }),
      );
      const res = await runC489(recs489b);
      assert.ok(res.issues.some((is: any) => is.rule === 'CLOCK_PEAK_UNCAUSED'), 'CLOCK_PEAK_UNCAUSED should fire');
    });

    it('CLOCK_PEAK_UNCAUSED does not fire when prior scene has a structural driver', async () => {
      // Same but scene 3 has suspenseDelta>0 (cause) → hasCause=true → no fire
      const recs489bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec489(i, {
          clockDelta: i === 4 ? 5 : 0,
          suspenseDelta: i === 3 ? 1 : 0,
        }),
      );
      const res = await runC489(recs489bnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'CLOCK_PEAK_UNCAUSED'), 'CLOCK_PEAK_UNCAUSED should not fire');
    });

    it('SEED_AFTERMATH_CURIOSITY_VOID fires when avg curiosityDelta after seed scenes is ≤0', async () => {
      // n=8; seed scenes at pos 0,2,4 (each with seededClueIds); pos 1,3,5 (aftermath) curiosityDelta=0
      // avg=0 ≤ 0 → fire
      const recs489c = Array.from({ length: 8 }, (_, i) =>
        makeRec489(i, {
          seededClueIds: [0, 2, 4].includes(i) ? ['clue-1'] : [],
          curiosityDelta: 0,
        }),
      );
      const res = await runC489(recs489c);
      assert.ok(res.issues.some((is: any) => is.rule === 'SEED_AFTERMATH_CURIOSITY_VOID'), 'SEED_AFTERMATH_CURIOSITY_VOID should fire');
    });

    it('SEED_AFTERMATH_CURIOSITY_VOID does not fire when at least one seed aftermath has positive curiosityDelta', async () => {
      // Same but pos 1 (aftermath of seed at pos 0) has curiosityDelta=2 → avg > 0 → no fire
      const recs489cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec489(i, {
          seededClueIds: [0, 2, 4].includes(i) ? ['clue-1'] : [],
          curiosityDelta: i === 1 ? 2 : 0,
        }),
      );
      const res = await runC489(recs489cnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'SEED_AFTERMATH_CURIOSITY_VOID'), 'SEED_AFTERMATH_CURIOSITY_VOID should not fire');
    });
  });


  describe('Wave 475 — causalityPass: emotional zone cluster, seed temporal cluster, payoff zone cluster', async () => {
    const makeRec475 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      seededClueIds: [], payoffSetupIds: [], revelation: null,
      dialogueHighlights: [], relationshipShifts: [], dramaticTurn: 'nothing',
      purpose: 'development', unresolvedClues: [],
      ...overrides,
    });
    const runC475 = async (records: any[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('EMOTIONAL_ZONE_CLUSTER fires when >75% of charged scenes fall in one third', async () => {
      // n=12; negative scenes at positions 0,1,2,3 (all in first third, floor(12/3)=4 → 0-3)
      // 4/4=100% > 75% → fires
      const recs475a = Array.from({ length: 12 }, (_, i) =>
        makeRec475(i, { emotionalShift: [0, 1, 2, 3].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runC475(recs475a);
      assert.ok(res.issues.some((i: any) => i.rule === 'EMOTIONAL_ZONE_CLUSTER'), 'EMOTIONAL_ZONE_CLUSTER should fire');
    });

    it('EMOTIONAL_ZONE_CLUSTER does not fire when charged scenes spread across thirds', async () => {
      // n=12; charged scenes at 0,4,8,11 → first:1, mid:1, last:2 → max=2/4=50% ≤ 75%
      const recs475anr = Array.from({ length: 12 }, (_, i) =>
        makeRec475(i, { emotionalShift: [0, 4, 8, 11].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runC475(recs475anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'EMOTIONAL_ZONE_CLUSTER'), 'EMOTIONAL_ZONE_CLUSTER should not fire');
    });

    it('SEED_TEMPORAL_CLUSTER fires when >75% of seed scenes fall in one third', async () => {
      // n=12; seeds at positions 0,1,2,3 (all in first third) → 4/4=100% > 75% → fires
      const recs475b = Array.from({ length: 12 }, (_, i) =>
        makeRec475(i, { seededClueIds: [0, 1, 2, 3].includes(i) ? ['clue-x'] : [] }),
      );
      const res = await runC475(recs475b);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_TEMPORAL_CLUSTER'), 'SEED_TEMPORAL_CLUSTER should fire');
    });

    it('SEED_TEMPORAL_CLUSTER does not fire when seed scenes spread across thirds', async () => {
      // n=12; seeds at 0,4,8,11 → first:1, mid:1, last:2 → max=2/4=50% ≤ 75%
      const recs475bnr = Array.from({ length: 12 }, (_, i) =>
        makeRec475(i, { seededClueIds: [0, 4, 8, 11].includes(i) ? ['clue-x'] : [] }),
      );
      const res = await runC475(recs475bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_TEMPORAL_CLUSTER'), 'SEED_TEMPORAL_CLUSTER should not fire');
    });

    it('PAYOFF_ZONE_CLUSTER fires when >75% of payoff scenes fall in one third', async () => {
      // n=12; payoffs at positions 0,1,2,3 (all in first third) → 4/4=100% > 75% → fires
      const recs475c = Array.from({ length: 12 }, (_, i) =>
        makeRec475(i, { payoffSetupIds: [0, 1, 2, 3].includes(i) ? ['setup-x'] : [] }),
      );
      const res = await runC475(recs475c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_ZONE_CLUSTER'), 'PAYOFF_ZONE_CLUSTER should fire');
    });

    it('PAYOFF_ZONE_CLUSTER does not fire when payoff scenes spread across thirds', async () => {
      // n=12; payoffs at 0,4,8,11 → first:1, mid:1, last:2 → max=2/4=50% ≤ 75%
      const recs475cnr = Array.from({ length: 12 }, (_, i) =>
        makeRec475(i, { payoffSetupIds: [0, 4, 8, 11].includes(i) ? ['setup-x'] : [] }),
      );
      const res = await runC475(recs475cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_ZONE_CLUSTER'), 'PAYOFF_ZONE_CLUSTER should not fire');
    });
  });


  describe('Wave 461 — causalityPass: payoff relationship void, seed scene emotion void, relationship stasis run', async () => {
    const makeRec461 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      seededClueIds: [], payoffSetupIds: [], revelation: null,
      dialogueHighlights: [], relationshipShifts: [], dramaticTurn: 'nothing',
      purpose: 'development', unresolvedClues: [],
      ...overrides,
    });
    const runC461 = async (records: any[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('PAYOFF_RELATIONSHIP_VOID fires when every payoff scene carries no relationship shift', async () => {
      // n=8; payoffs at 3,6, neither has a relationship shift → fires
      const recs461a = Array.from({ length: 8 }, (_, i) =>
        makeRec461(i, { payoffSetupIds: [3, 6].includes(i) ? ['setup-1'] : [] }),
      );
      const res = await runC461(recs461a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_RELATIONSHIP_VOID'), 'PAYOFF_RELATIONSHIP_VOID should fire');
    });

    it('PAYOFF_RELATIONSHIP_VOID does NOT fire when a payoff scene also moves a relationship', async () => {
      // n=8; payoffs at 3,6; scene 3 carries a relationship shift → not all void → no fire
      const recs461anr = Array.from({ length: 8 }, (_, i) =>
        makeRec461(i, {
          payoffSetupIds: [3, 6].includes(i) ? ['setup-1'] : [],
          relationshipShifts: i === 3 ? [{ pair: 'A-B', delta: 1 }] : [],
        }),
      );
      const res = await runC461(recs461anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_RELATIONSHIP_VOID'), 'PAYOFF_RELATIONSHIP_VOID should not fire');
    });

    it('SEED_SCENE_EMOTION_VOID fires when every clue-planting scene is emotionally neutral', async () => {
      // n=8; seeds at 1,3,5, all emotionally neutral → fires
      const recs461b = Array.from({ length: 8 }, (_, i) =>
        makeRec461(i, { seededClueIds: [1, 3, 5].includes(i) ? ['clue-1'] : [] }),
      );
      const res = await runC461(recs461b);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_SCENE_EMOTION_VOID'), 'SEED_SCENE_EMOTION_VOID should fire');
    });

    it('SEED_SCENE_EMOTION_VOID does NOT fire when a seed scene carries an emotional charge', async () => {
      // n=8; seeds at 1,3,5; scene 3 is emotionally positive → not all neutral → no fire
      const recs461bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec461(i, {
          seededClueIds: [1, 3, 5].includes(i) ? ['clue-1'] : [],
          emotionalShift: i === 3 ? 'positive' : 'neutral',
        }),
      );
      const res = await runC461(recs461bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_SCENE_EMOTION_VOID'), 'SEED_SCENE_EMOTION_VOID should not fire');
    });

    it('RELATIONSHIP_STASIS_RUN fires when 6+ consecutive scenes carry no relationship shift', async () => {
      // n=10; relationship shifts at 0 and 9; scenes 1–8 silent → run=8 ≥ 6; total rel scenes=2 → fires
      const recs461c = Array.from({ length: 10 }, (_, i) =>
        makeRec461(i, { relationshipShifts: [0, 9].includes(i) ? [{ pair: 'A-B', delta: 1 }] : [] }),
      );
      const res = await runC461(recs461c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_STASIS_RUN'), 'RELATIONSHIP_STASIS_RUN should fire');
    });

    it('RELATIONSHIP_STASIS_RUN does NOT fire when relationship shifts keep the silent run under 6', async () => {
      // n=10; shifts at 0,4,8 → longest silent run = 3 < 6 → no fire
      const recs461cnr = Array.from({ length: 10 }, (_, i) =>
        makeRec461(i, { relationshipShifts: [0, 4, 8].includes(i) ? [{ pair: 'A-B', delta: 1 }] : [] }),
      );
      const res = await runC461(recs461cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_STASIS_RUN'), 'RELATIONSHIP_STASIS_RUN should not fire');
    });
  });


  describe('Wave 447 — causalityPass: suspense decline run, dramatic turn relationship void, curiosity peak no followthrough', async () => {
    const makeRec447 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      seededClueIds: [], payoffSetupIds: [], revelation: null,
      dialogueHighlights: [], relationshipShifts: [], dramaticTurn: 'nothing',
      purpose: 'development', unresolvedClues: [],
      ...overrides,
    });
    const runC447 = async (records: any[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('SUSPENSE_DECLINE_RUN fires when 4+ consecutive scenes all lower suspense', async () => {
      // n=10; suspenseDelta at 3,4,5,6 = -1 → run=4 ≥ 4 → fires
      const recs447a = Array.from({ length: 10 }, (_, i) =>
        makeRec447(i, { suspenseDelta: [3, 4, 5, 6].includes(i) ? -1 : 0 }),
      );
      const res = await runC447(recs447a);
      assert.ok(res.issues.some((i: any) => i.rule === 'SUSPENSE_DECLINE_RUN'), 'SUSPENSE_DECLINE_RUN should fire');
    });

    it('SUSPENSE_DECLINE_RUN does NOT fire when the suspense-decline run stays under 4', async () => {
      // n=10; suspenseDelta at 3,4,5 = -1 (run=3 < 4); scene 6 = 0.5 breaks it
      const recs447anr = Array.from({ length: 10 }, (_, i) =>
        makeRec447(i, { suspenseDelta: [3, 4, 5].includes(i) ? -1 : i === 6 ? 0.5 : 0 }),
      );
      const res = await runC447(recs447anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SUSPENSE_DECLINE_RUN'), 'SUSPENSE_DECLINE_RUN should not fire');
    });

    it('DRAMATIC_TURN_RELATIONSHIP_VOID fires when all dramatic-turn scenes carry no relationship shift', async () => {
      // n=8; turns at idx 2 (reversal) and 5 (recognition); both with relationshipShifts=[] → fires
      const recs447b = Array.from({ length: 8 }, (_, i) =>
        makeRec447(i, {
          dramaticTurn: i === 2 ? 'reversal' : i === 5 ? 'recognition' : 'nothing',
          suspenseDelta: i === 1 ? 1.5 : i === 4 ? 1.5 : 0,
        }),
      );
      const res = await runC447(recs447b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_RELATIONSHIP_VOID'), 'DRAMATIC_TURN_RELATIONSHIP_VOID should fire');
    });

    it('DRAMATIC_TURN_RELATIONSHIP_VOID does NOT fire when a dramatic-turn scene carries a relationship shift', async () => {
      // n=8; turns at idx 2 and 5; scene 2 has a relationship shift → every() fails → no fire
      const recs447bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec447(i, {
          dramaticTurn: i === 2 ? 'reversal' : i === 5 ? 'recognition' : 'nothing',
          relationshipShifts: i === 2 ? [{ charA: 'Alex', charB: 'Sam', direction: 'strained' }] : [],
          suspenseDelta: i === 1 ? 1.5 : i === 4 ? 1.5 : 0,
        }),
      );
      const res = await runC447(recs447bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_RELATIONSHIP_VOID'), 'DRAMATIC_TURN_RELATIONSHIP_VOID should not fire');
    });

    it('CURIOSITY_PEAK_NO_FOLLOWTHROUGH fires when the curiosity-peak scene has no revelation in the next 2 scenes', async () => {
      // n=8; scene 2 has curiosityDelta=3.0 (global peak ≥ 1.5, pos=2 ≤ 8-3=5);
      // scenes 3,4 have revelation=null → hasRevFollowthrough=false → fires
      const recs447c = Array.from({ length: 8 }, (_, i) =>
        makeRec447(i, { curiosityDelta: i === 2 ? 3.0 : 0 }),
      );
      const res = await runC447(recs447c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CURIOSITY_PEAK_NO_FOLLOWTHROUGH'), 'CURIOSITY_PEAK_NO_FOLLOWTHROUGH should fire');
    });

    it('CURIOSITY_PEAK_NO_FOLLOWTHROUGH does NOT fire when a revelation follows the curiosity peak within 2 scenes', async () => {
      // n=8; scene 2 has curiosityDelta=3.0 (peak); scene 3 has a revelation → hasRevFollowthrough=true → no fire
      const recs447cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec447(i, {
          curiosityDelta: i === 2 ? 3.0 : 0,
          revelation: i === 3 ? 'The key was hidden in the basement all along.' : null,
        }),
      );
      const res = await runC447(recs447cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CURIOSITY_PEAK_NO_FOLLOWTHROUGH'), 'CURIOSITY_PEAK_NO_FOLLOWTHROUGH should not fire');
    });
  });


  describe('Wave 433 — causalityPass: suspense peak uncaused, curiosity decline run, payoff peak inert', async () => {
    const makeRec433 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runC433 = async (records: any[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('SUSPENSE_PEAK_UNCAUSED fires when the global suspense peak has no driver in the two prior scenes', async () => {
      // n=8; peak at scene 5 (suspenseDelta=4); scenes 3,4 flat (no rise, clock, revelation, or turn) → fires
      const recs433a = Array.from({ length: 8 }, (_, i) =>
        makeRec433(i, { suspenseDelta: i === 5 ? 4 : 0 }),
      );
      const res = await runC433(recs433a);
      assert.ok(res.issues.some((i: any) => i.rule === 'SUSPENSE_PEAK_UNCAUSED'), 'SUSPENSE_PEAK_UNCAUSED should fire');
    });

    it('SUSPENSE_PEAK_UNCAUSED does not fire when a rising gradient leads into the peak', async () => {
      // n=8; peak at scene 5 (suspenseDelta=4); scene 4 has suspenseDelta=2 (a driver) → no fire
      const recs433anr = Array.from({ length: 8 }, (_, i) =>
        makeRec433(i, { suspenseDelta: i === 5 ? 4 : i === 4 ? 2 : 0 }),
      );
      const res = await runC433(recs433anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SUSPENSE_PEAK_UNCAUSED'), 'SUSPENSE_PEAK_UNCAUSED should not fire');
    });

    it('CURIOSITY_DECLINE_RUN fires when four or more consecutive scenes lower curiosity', async () => {
      // n=10; scenes 3,4,5,6 each curiosityDelta=-1 → run of 4 ≥4 → fires
      const recs433b = Array.from({ length: 10 }, (_, i) =>
        makeRec433(i, { curiosityDelta: [3, 4, 5, 6].includes(i) ? -1 : 0 }),
      );
      const res = await runC433(recs433b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CURIOSITY_DECLINE_RUN'), 'CURIOSITY_DECLINE_RUN should fire');
    });

    it('CURIOSITY_DECLINE_RUN does not fire when the negative-curiosity run is broken before reaching four', async () => {
      // n=10; scenes 3,4,5 = -1 (run 3), scene 6 = 0 break, scene 7 = -1 → max run 3 <4 → no fire
      const recs433bnr = Array.from({ length: 10 }, (_, i) =>
        makeRec433(i, { curiosityDelta: [3, 4, 5, 7].includes(i) ? -1 : 0 }),
      );
      const res = await runC433(recs433bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CURIOSITY_DECLINE_RUN'), 'CURIOSITY_DECLINE_RUN should not fire');
    });

    it('PAYOFF_PEAK_INERT fires when the densest payoff scene is inert across every channel', async () => {
      // n=8; scene 2 resolves 2 setups (the peak), scene 5 resolves 1; scene 2 is fully inert → fires
      const recs433c = Array.from({ length: 8 }, (_, i) =>
        makeRec433(i, {
          payoffSetupIds: i === 2 ? ['s1', 's2'] : i === 5 ? ['s3'] : [],
        }),
      );
      const res = await runC433(recs433c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_PEAK_INERT'), 'PAYOFF_PEAK_INERT should fire');
    });

    it('PAYOFF_PEAK_INERT does not fire when the densest payoff scene carries a consequence', async () => {
      // n=8; peak payoff at scene 2 (2 setups) has suspenseDelta=2 → not inert → no fire
      const recs433cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec433(i, {
          payoffSetupIds: i === 2 ? ['s1', 's2'] : i === 5 ? ['s3'] : [],
          suspenseDelta: i === 2 ? 2 : 0,
        }),
      );
      const res = await runC433(recs433cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_PEAK_INERT'), 'PAYOFF_PEAK_INERT should not fire');
    });
  });


  describe('Wave 419 — causalityPass: revelation relationship void, payoff suspense void, clock raise relationship void', async () => {
    const makeRec419 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runC419 = async (records: any[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('REVELATION_RELATIONSHIP_VOID fires when every revelation scene has no relationship shift', async () => {
      // n=8, revelations at 2 and 5, no relationship shifts in either → fires
      const recs419a = Array.from({ length: 8 }, (_, i) =>
        makeRec419(i, { revelation: [2, 5].includes(i) ? `Truth at scene ${i}` : null }),
      );
      const res = await runC419(recs419a);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_RELATIONSHIP_VOID'), 'REVELATION_RELATIONSHIP_VOID should fire');
    });

    it('REVELATION_RELATIONSHIP_VOID does not fire when a revelation scene has a relationship shift', async () => {
      // n=8, revelations at 2 and 5, scene 5 has a relationship shift → no fire
      const recs419anr = Array.from({ length: 8 }, (_, i) =>
        makeRec419(i, {
          revelation: [2, 5].includes(i) ? `Truth at scene ${i}` : null,
          relationshipShifts: i === 5 ? [{ charA: 'A', charB: 'B', amount: 1 }] : [],
        }),
      );
      const res = await runC419(recs419anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_RELATIONSHIP_VOID'), 'REVELATION_RELATIONSHIP_VOID should not fire');
    });

    it('PAYOFF_SUSPENSE_VOID fires when every payoff scene has suspenseDelta ≤ 0', async () => {
      // n=8, payoffs at 3 and 6, both suspenseDelta=0 → fires
      const recs419b = Array.from({ length: 8 }, (_, i) =>
        makeRec419(i, { payoffSetupIds: [3, 6].includes(i) ? ['setup-1'] : [] }),
      );
      const res = await runC419(recs419b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_SUSPENSE_VOID'), 'PAYOFF_SUSPENSE_VOID should fire');
    });

    it('PAYOFF_SUSPENSE_VOID does not fire when a payoff scene raises suspense', async () => {
      // n=8, payoffs at 3 and 6, scene 6 has suspenseDelta=2 → no fire
      const recs419bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec419(i, {
          payoffSetupIds: [3, 6].includes(i) ? ['setup-1'] : [],
          suspenseDelta: i === 6 ? 2 : 0,
        }),
      );
      const res = await runC419(recs419bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_SUSPENSE_VOID'), 'PAYOFF_SUSPENSE_VOID should not fire');
    });

    it('CLOCK_RAISE_RELATIONSHIP_VOID fires when every clock-raise scene has no relationship shift', async () => {
      // n=8, clocks raised at 1 and 4, neither has a relationship shift → fires
      const recs419c = Array.from({ length: 8 }, (_, i) =>
        makeRec419(i, { clockRaised: [1, 4].includes(i) }),
      );
      const res = await runC419(recs419c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_RAISE_RELATIONSHIP_VOID'), 'CLOCK_RAISE_RELATIONSHIP_VOID should fire');
    });

    it('CLOCK_RAISE_RELATIONSHIP_VOID does not fire when a clock-raise scene has a relationship shift', async () => {
      // n=8, clocks raised at 1 and 4, scene 4 has a relationship shift → no fire
      const recs419cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec419(i, {
          clockRaised: [1, 4].includes(i),
          relationshipShifts: i === 4 ? [{ charA: 'A', charB: 'B', amount: -1 }] : [],
        }),
      );
      const res = await runC419(recs419cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_RAISE_RELATIONSHIP_VOID'), 'CLOCK_RAISE_RELATIONSHIP_VOID should not fire');
    });
  });


  describe('Wave 405 — causalityPass: positive reaction without cause, curiosity spike without cause, dramatic turn without cause', async () => {
    const makeRec405 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runC405 = async (records: any[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('POSITIVE_REACTION_WITHOUT_CAUSE fires when a positive shift has no on-page cause', async () => {
      const recs405p = Array.from({ length: 6 }, (_, i) => makeRec405(i));
      recs405p[4] = makeRec405(4, { emotionalShift: 'positive' });
      const res = await runC405(recs405p);
      assert.ok(res.issues.some((i: any) => i.rule === 'POSITIVE_REACTION_WITHOUT_CAUSE'), 'POSITIVE_REACTION_WITHOUT_CAUSE should fire');
    });

    it('POSITIVE_REACTION_WITHOUT_CAUSE does NOT fire when the positive shift has a cause', async () => {
      const recs405pNF = Array.from({ length: 6 }, (_, i) => makeRec405(i));
      recs405pNF[4] = makeRec405(4, { emotionalShift: 'positive', payoffSetupIds: ['pay-1'] });
      const res = await runC405(recs405pNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'POSITIVE_REACTION_WITHOUT_CAUSE'), 'POSITIVE_REACTION_WITHOUT_CAUSE should not fire');
    });

    it('CURIOSITY_SPIKE_WITHOUT_CAUSE fires when a curiosity spike has no upstream driver', async () => {
      const recs405c = Array.from({ length: 6 }, (_, i) => makeRec405(i));
      recs405c[4] = makeRec405(4, { curiosityDelta: 2 });
      const res = await runC405(recs405c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CURIOSITY_SPIKE_WITHOUT_CAUSE'), 'CURIOSITY_SPIKE_WITHOUT_CAUSE should fire');
    });

    it('CURIOSITY_SPIKE_WITHOUT_CAUSE does NOT fire when a driver precedes the spike', async () => {
      const recs405cNF = Array.from({ length: 6 }, (_, i) => makeRec405(i));
      recs405cNF[3] = makeRec405(3, { seededClueIds: ['clue-1'] });
      recs405cNF[4] = makeRec405(4, { curiosityDelta: 2 });
      const res = await runC405(recs405cNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CURIOSITY_SPIKE_WITHOUT_CAUSE'), 'CURIOSITY_SPIKE_WITHOUT_CAUSE should not fire');
    });

    it('DRAMATIC_TURN_WITHOUT_CAUSE fires when every dramatic turn lacks an upstream cause', async () => {
      const recs405t = Array.from({ length: 8 }, (_, i) => makeRec405(i));
      recs405t[3] = makeRec405(3, { dramaticTurn: 'reversal' });
      recs405t[6] = makeRec405(6, { dramaticTurn: 'reversal' });
      const res = await runC405(recs405t);
      assert.ok(res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_WITHOUT_CAUSE'), 'DRAMATIC_TURN_WITHOUT_CAUSE should fire');
    });

    it('DRAMATIC_TURN_WITHOUT_CAUSE does NOT fire when a turn has an upstream cause', async () => {
      const recs405tNF = Array.from({ length: 8 }, (_, i) => makeRec405(i));
      recs405tNF[3] = makeRec405(3, { dramaticTurn: 'reversal', revelation: 'The truth comes out.' });
      recs405tNF[6] = makeRec405(6, { dramaticTurn: 'reversal' });
      const res = await runC405(recs405tNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_WITHOUT_CAUSE'), 'DRAMATIC_TURN_WITHOUT_CAUSE should not fire');
    });
  });


  describe('Wave 391 — causalityPass: suspense spike no emotion, clock raise no fallout, curiosity spike no fallout', async () => {
    const makeRec391 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runC391 = async (records: any[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('SUSPENSE_SPIKE_NO_EMOTION fires when every high-suspense scene is emotionally neutral', async () => {
      const recs391se = Array.from({ length: 8 }, (_, i) =>
        makeRec391(i, { suspenseDelta: [2, 5].includes(i) ? 2 : 0, emotionalShift: 'neutral' }),
      );
      const res = await runC391(recs391se);
      assert.ok(res.issues.some((i: any) => i.rule === 'SUSPENSE_SPIKE_NO_EMOTION'), 'SUSPENSE_SPIKE_NO_EMOTION should fire');
    });

    it('SUSPENSE_SPIKE_NO_EMOTION does not fire when a spike scene carries emotion', async () => {
      const recs391sen = Array.from({ length: 8 }, (_, i) =>
        makeRec391(i, { suspenseDelta: [2, 5].includes(i) ? 2 : 0, emotionalShift: i === 2 ? 'negative' : 'neutral' }),
      );
      const res = await runC391(recs391sen);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SUSPENSE_SPIKE_NO_EMOTION'), 'SUSPENSE_SPIKE_NO_EMOTION should not fire');
    });

    it('CLOCK_RAISE_NO_FALLOUT fires when clock raises produce no consequence within two scenes', async () => {
      // clocks at 2,5; all other scenes neutral/no consequence
      const recs391cf = Array.from({ length: 9 }, (_, i) => makeRec391(i, { clockRaised: [2, 5].includes(i) }));
      const res = await runC391(recs391cf);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_RAISE_NO_FALLOUT'), 'CLOCK_RAISE_NO_FALLOUT should fire');
    });

    it('CLOCK_RAISE_NO_FALLOUT does not fire when a clock raise is followed by a consequence', async () => {
      // clock at 2, scene 3 carries an emotional shift (fallout)
      const recs391cfn = Array.from({ length: 9 }, (_, i) =>
        makeRec391(i, { clockRaised: [2, 5].includes(i), emotionalShift: i === 3 ? 'negative' : 'neutral' }),
      );
      const res = await runC391(recs391cfn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_RAISE_NO_FALLOUT'), 'CLOCK_RAISE_NO_FALLOUT should not fire');
    });

    it('CURIOSITY_SPIKE_NO_FALLOUT fires when curiosity spikes produce no consequence within two scenes', async () => {
      const recs391qf = Array.from({ length: 9 }, (_, i) => makeRec391(i, { curiosityDelta: [2, 5].includes(i) ? 2 : 0 }));
      const res = await runC391(recs391qf);
      assert.ok(res.issues.some((i: any) => i.rule === 'CURIOSITY_SPIKE_NO_FALLOUT'), 'CURIOSITY_SPIKE_NO_FALLOUT should fire');
    });

    it('CURIOSITY_SPIKE_NO_FALLOUT does not fire when a curiosity spike is followed by a revelation', async () => {
      const recs391qfn = Array.from({ length: 9 }, (_, i) =>
        makeRec391(i, { curiosityDelta: [2, 5].includes(i) ? 2 : 0, revelation: i === 3 ? 'a truth' : null }),
      );
      const res = await runC391(recs391qfn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CURIOSITY_SPIKE_NO_FALLOUT'), 'CURIOSITY_SPIKE_NO_FALLOUT should not fire');
    });
  });


  describe('Wave 377 — causalityPass: dramatic turn no emotion, clock raise no suspense, suspense spike no curiosity', async () => {
    const makeRec377 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runC377 = async (records: any[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DRAMATIC_TURN_NO_EMOTION fires when every dramatic-turn scene is emotionally neutral', async () => {
      const recs377te = Array.from({ length: 8 }, (_, i) =>
        makeRec377(i, {
          dramaticTurn: [1, 3, 5].includes(i) ? 'reversal' : 'nothing',
          emotionalShift: 'neutral',
        }),
      );
      const res = await runC377(recs377te);
      assert.ok(res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_NO_EMOTION'), 'DRAMATIC_TURN_NO_EMOTION should fire');
    });

    it('DRAMATIC_TURN_NO_EMOTION does not fire when a dramatic-turn scene carries emotion', async () => {
      const recs377teni = Array.from({ length: 8 }, (_, i) =>
        makeRec377(i, {
          dramaticTurn: [1, 3, 5].includes(i) ? 'reversal' : 'nothing',
          emotionalShift: i === 3 ? 'negative' : 'neutral',
        }),
      );
      const res = await runC377(recs377teni);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_NO_EMOTION'), 'DRAMATIC_TURN_NO_EMOTION should not fire');
    });

    it('CLOCK_RAISE_NO_SUSPENSE fires when clock-raise scenes average suspenseDelta ≤ 0', async () => {
      const recs377cs = Array.from({ length: 8 }, (_, i) =>
        makeRec377(i, {
          clockRaised: [2, 4].includes(i),
          suspenseDelta: i === 2 ? -0.5 : i === 4 ? 0 : 0,
        }),
      );
      const res = await runC377(recs377cs);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_RAISE_NO_SUSPENSE'), 'CLOCK_RAISE_NO_SUSPENSE should fire');
    });

    it('CLOCK_RAISE_NO_SUSPENSE does not fire when clock-raise scenes carry positive suspense', async () => {
      const recs377csni = Array.from({ length: 8 }, (_, i) =>
        makeRec377(i, {
          clockRaised: [2, 4].includes(i),
          suspenseDelta: i === 2 ? 1.2 : i === 4 ? 0.8 : 0,
        }),
      );
      const res = await runC377(recs377csni);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_RAISE_NO_SUSPENSE'), 'CLOCK_RAISE_NO_SUSPENSE should not fire');
    });

    it('SUSPENSE_SPIKE_NO_CURIOSITY fires when high-suspense scenes average curiosityDelta ≤ 0', async () => {
      const recs377sc = Array.from({ length: 8 }, (_, i) =>
        makeRec377(i, {
          suspenseDelta: [2, 5].includes(i) ? 2 : 0,
          curiosityDelta: i === 2 ? -0.3 : i === 5 ? 0 : 0,
        }),
      );
      const res = await runC377(recs377sc);
      assert.ok(res.issues.some((i: any) => i.rule === 'SUSPENSE_SPIKE_NO_CURIOSITY'), 'SUSPENSE_SPIKE_NO_CURIOSITY should fire');
    });

    it('SUSPENSE_SPIKE_NO_CURIOSITY does not fire when high-suspense scenes carry positive curiosity', async () => {
      const recs377scni = Array.from({ length: 8 }, (_, i) =>
        makeRec377(i, {
          suspenseDelta: [2, 5].includes(i) ? 2 : 0,
          curiosityDelta: i === 2 ? 0.8 : i === 5 ? 0.6 : 0,
        }),
      );
      const res = await runC377(recs377scni);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SUSPENSE_SPIKE_NO_CURIOSITY'), 'SUSPENSE_SPIKE_NO_CURIOSITY should not fire');
    });
  });


  describe('Wave 363 — causalityPass: payoff no emotion, seed scene curiosity void, clock raise curiosity void', async () => {
    const makeRec363 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runC363 = async (records: any[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('PAYOFF_NO_EMOTION fires when every payoff scene is emotionally neutral', async () => {
      const recs363pne = Array.from({ length: 8 }, (_, i) =>
        makeRec363(i, {
          emotionalShift: 'neutral',
          payoffSetupIds: [2, 4, 6].includes(i) ? ['thread1'] : [],
        }),
      );
      const res = await runC363(recs363pne);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_NO_EMOTION'), 'PAYOFF_NO_EMOTION should fire');
    });

    it('PAYOFF_NO_EMOTION does not fire when at least one payoff scene has emotional charge', async () => {
      const recs363pneni = Array.from({ length: 8 }, (_, i) =>
        makeRec363(i, {
          emotionalShift: i === 4 ? 'negative' : 'neutral',
          payoffSetupIds: [2, 4, 6].includes(i) ? ['thread1'] : [],
        }),
      );
      const res = await runC363(recs363pneni);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_NO_EMOTION'), 'PAYOFF_NO_EMOTION should not fire');
    });

    it('SEED_SCENE_CURIOSITY_VOID fires when seed scenes average curiosityDelta ≤ 0', async () => {
      // 3 seed scenes with curiosityDelta -0.3, 0, -0.2 → avg -0.167 ≤ 0
      const recs363scv = Array.from({ length: 8 }, (_, i) =>
        makeRec363(i, {
          seededClueIds: [1, 3, 5].includes(i) ? ['clue_x'] : [],
          curiosityDelta: i === 1 ? -0.3 : i === 3 ? 0 : i === 5 ? -0.2 : 0,
        }),
      );
      const res = await runC363(recs363scv);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_SCENE_CURIOSITY_VOID'), 'SEED_SCENE_CURIOSITY_VOID should fire');
    });

    it('SEED_SCENE_CURIOSITY_VOID does not fire when seed scenes have positive average curiosityDelta', async () => {
      // seed scenes with curiosityDelta 0.8, 0.5, 0.6 → avg positive
      const recs363scvni = Array.from({ length: 8 }, (_, i) =>
        makeRec363(i, {
          seededClueIds: [1, 3, 5].includes(i) ? ['clue_x'] : [],
          curiosityDelta: i === 1 ? 0.8 : i === 3 ? 0.5 : i === 5 ? 0.6 : 0,
        }),
      );
      const res = await runC363(recs363scvni);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_SCENE_CURIOSITY_VOID'), 'SEED_SCENE_CURIOSITY_VOID should not fire');
    });

    it('CLOCK_RAISE_CURIOSITY_VOID fires when clock-raise scenes average curiosityDelta ≤ 0', async () => {
      // clock scenes at 2 (curiosityDelta -0.5) and 4 (curiosityDelta 0) → avg -0.25 ≤ 0
      const recs363crcv = Array.from({ length: 8 }, (_, i) =>
        makeRec363(i, {
          clockRaised: [2, 4].includes(i),
          curiosityDelta: i === 2 ? -0.5 : i === 4 ? 0 : 0,
        }),
      );
      const res = await runC363(recs363crcv);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_RAISE_CURIOSITY_VOID'), 'CLOCK_RAISE_CURIOSITY_VOID should fire');
    });

    it('CLOCK_RAISE_CURIOSITY_VOID does not fire when clock-raise scenes have positive average curiosityDelta', async () => {
      // clock scenes at 2 (curiosityDelta 0.8) and 4 (curiosityDelta 0.6) → avg positive
      const recs363crcvni = Array.from({ length: 8 }, (_, i) =>
        makeRec363(i, {
          clockRaised: [2, 4].includes(i),
          curiosityDelta: i === 2 ? 0.8 : i === 4 ? 0.6 : 0,
        }),
      );
      const res = await runC363(recs363crcvni);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_RAISE_CURIOSITY_VOID'), 'CLOCK_RAISE_CURIOSITY_VOID should not fire');
    });
  });


  describe('Wave 349 — causalityPass: clock raised no emotion, dramatic turn no suspense, suspense spike no fallout', async () => {
    const makeRec349 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.3, curiosityDelta: 0.5,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runC349 = async (records: any[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CLOCK_RAISED_NO_EMOTION fires when every clock-raise scene is emotionally neutral', async () => {
      const recs349ce = [
        ...Array.from({ length: 5 }, (_, i) => makeRec349(i)),
        makeRec349(5, { clockRaised: true, clockDelta: 1, emotionalShift: 'neutral' }),
        makeRec349(6, { clockRaised: true, clockDelta: 1, emotionalShift: 'neutral' }),
        makeRec349(7, { clockRaised: true, clockDelta: 1, emotionalShift: 'neutral' }),
      ];
      const res = await runC349(recs349ce);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_RAISED_NO_EMOTION'), 'CLOCK_RAISED_NO_EMOTION should fire');
    });

    it('CLOCK_RAISED_NO_EMOTION does not fire when a clock-raise scene carries emotion', async () => {
      const recs349cen = [
        ...Array.from({ length: 5 }, (_, i) => makeRec349(i)),
        makeRec349(5, { clockRaised: true, clockDelta: 1, emotionalShift: 'negative' }),
        makeRec349(6, { clockRaised: true, clockDelta: 1, emotionalShift: 'neutral' }),
        makeRec349(7, { clockRaised: true, clockDelta: 1, emotionalShift: 'neutral' }),
      ];
      const res = await runC349(recs349cen);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_RAISED_NO_EMOTION'), 'CLOCK_RAISED_NO_EMOTION should not fire');
    });

    it('DRAMATIC_TURN_NO_SUSPENSE fires when dramatic-turn scenes avg suspenseDelta ≤ 0', async () => {
      const recs349ds = [
        ...Array.from({ length: 7 }, (_, i) => makeRec349(i)),
        makeRec349(7, { dramaticTurn: 'reversal', suspenseDelta: -0.3 }),
        makeRec349(8, { dramaticTurn: 'recognition', suspenseDelta: 0 }),
        makeRec349(9, { dramaticTurn: 'reversal', suspenseDelta: -0.1 }),
      ];
      const res = await runC349(recs349ds);
      assert.ok(res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_NO_SUSPENSE'), 'DRAMATIC_TURN_NO_SUSPENSE should fire');
    });

    it('DRAMATIC_TURN_NO_SUSPENSE does not fire when dramatic-turn scenes raise suspense', async () => {
      const recs349dsn = [
        ...Array.from({ length: 7 }, (_, i) => makeRec349(i)),
        makeRec349(7, { dramaticTurn: 'reversal', suspenseDelta: 1.5 }),
        makeRec349(8, { dramaticTurn: 'recognition', suspenseDelta: 1.2 }),
        makeRec349(9, { dramaticTurn: 'reversal', suspenseDelta: 0.8 }),
      ];
      const res = await runC349(recs349dsn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_NO_SUSPENSE'), 'DRAMATIC_TURN_NO_SUSPENSE should not fire');
    });

    it('SUSPENSE_SPIKE_NO_FALLOUT fires when suspense spikes produce no downstream consequence', async () => {
      // spikes at scenes 0 and 5; all scenes neutral with no shifts/revelations/turns
      const recs349sf = Array.from({ length: 10 }, (_, i) =>
        makeRec349(i, { suspenseDelta: [0, 5].includes(i) ? 2 : 0.3 })
      );
      const res = await runC349(recs349sf);
      assert.ok(res.issues.some((i: any) => i.rule === 'SUSPENSE_SPIKE_NO_FALLOUT'), 'SUSPENSE_SPIKE_NO_FALLOUT should fire');
    });

    it('SUSPENSE_SPIKE_NO_FALLOUT does not fire when a spike is followed by consequence', async () => {
      // spike at 0 followed by an emotional shift at scene 1 (fallout); spike at 5
      const recs349sfn = Array.from({ length: 10 }, (_, i) =>
        makeRec349(i, {
          suspenseDelta: [0, 5].includes(i) ? 2 : 0.3,
          emotionalShift: i === 1 ? 'negative' : 'neutral',
        })
      );
      const res = await runC349(recs349sfn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SUSPENSE_SPIKE_NO_FALLOUT'), 'SUSPENSE_SPIKE_NO_FALLOUT should not fire');
    });
  });


  describe('Wave 335 — causalityPass: payoff curiosity decoupled, dramatic turn curiosity void, clue seed suspense void', async () => {
    const makeRec335 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'negative', suspenseDelta: 0.3, curiosityDelta: 0.5,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runC335 = async (records: any[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('PAYOFF_CURIOSITY_DECOUPLED fires when payoff scenes avg curiosityDelta ≤ 0', async () => {
      const recs335pd = [
        ...Array.from({ length: 5 }, (_, i) => makeRec335(i)),
        makeRec335(5, { payoffSetupIds: ['A'], curiosityDelta: -0.5 }),
        makeRec335(6, { payoffSetupIds: ['B'], curiosityDelta: 0 }),
        makeRec335(7, { payoffSetupIds: ['C'], curiosityDelta: -0.2 }),
      ];
      const res = await runC335(recs335pd);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_CURIOSITY_DECOUPLED'), 'PAYOFF_CURIOSITY_DECOUPLED should fire');
    });

    it('PAYOFF_CURIOSITY_DECOUPLED does not fire when payoff scenes avg curiosityDelta > 0', async () => {
      const recs335pdnw = [
        ...Array.from({ length: 5 }, (_, i) => makeRec335(i)),
        makeRec335(5, { payoffSetupIds: ['A'], curiosityDelta: 1.0 }),
        makeRec335(6, { payoffSetupIds: ['B'], curiosityDelta: 0.8 }),
        makeRec335(7, { payoffSetupIds: ['C'], curiosityDelta: 0.5 }),
      ];
      const res = await runC335(recs335pdnw);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_CURIOSITY_DECOUPLED'), 'PAYOFF_CURIOSITY_DECOUPLED should not fire');
    });

    it('DRAMATIC_TURN_CURIOSITY_VOID fires when dramatic turn scenes avg curiosityDelta ≤ 0', async () => {
      const recs335dt = [
        ...Array.from({ length: 7 }, (_, i) => makeRec335(i)),
        makeRec335(7, { dramaticTurn: 'reversal', curiosityDelta: -0.3 }),
        makeRec335(8, { dramaticTurn: 'recognition', curiosityDelta: 0 }),
        makeRec335(9, { dramaticTurn: 'reversal', curiosityDelta: -0.1 }),
      ];
      const res = await runC335(recs335dt);
      assert.ok(res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_CURIOSITY_VOID'), 'DRAMATIC_TURN_CURIOSITY_VOID should fire');
    });

    it('DRAMATIC_TURN_CURIOSITY_VOID does not fire when dramatic turn scenes generate curiosity', async () => {
      const recs335dtnw = [
        ...Array.from({ length: 7 }, (_, i) => makeRec335(i)),
        makeRec335(7, { dramaticTurn: 'reversal', curiosityDelta: 1.2 }),
        makeRec335(8, { dramaticTurn: 'recognition', curiosityDelta: 0.9 }),
        makeRec335(9, { dramaticTurn: 'reversal', curiosityDelta: 0.7 }),
      ];
      const res = await runC335(recs335dtnw);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_CURIOSITY_VOID'), 'DRAMATIC_TURN_CURIOSITY_VOID should not fire');
    });

    it('CLUE_SEED_SUSPENSE_VOID fires when clue-seeding scenes avg suspenseDelta ≤ 0', async () => {
      const recs335cs = [
        ...Array.from({ length: 5 }, (_, i) => makeRec335(i)),
        makeRec335(5, { seededClueIds: ['clue-A'], suspenseDelta: -0.4 }),
        makeRec335(6, { seededClueIds: ['clue-B'], suspenseDelta: 0 }),
        makeRec335(7, { seededClueIds: ['clue-C'], suspenseDelta: -0.2 }),
      ];
      const res = await runC335(recs335cs);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLUE_SEED_SUSPENSE_VOID'), 'CLUE_SEED_SUSPENSE_VOID should fire');
    });

    it('CLUE_SEED_SUSPENSE_VOID does not fire when clue-seeding scenes carry foreboding', async () => {
      const recs335csnw = [
        ...Array.from({ length: 5 }, (_, i) => makeRec335(i)),
        makeRec335(5, { seededClueIds: ['clue-A'], suspenseDelta: 0.8 }),
        makeRec335(6, { seededClueIds: ['clue-B'], suspenseDelta: 0.6 }),
        makeRec335(7, { seededClueIds: ['clue-C'], suspenseDelta: 0.4 }),
      ];
      const res = await runC335(recs335csnw);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLUE_SEED_SUSPENSE_VOID'), 'CLUE_SEED_SUSPENSE_VOID should not fire');
    });
  });


  describe('Wave 324 — causalityPass: suspense unreleased run, clock raised no delta, emotional neutral run', async () => {
    const makeRec324 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'positive', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runC324 = async (records: any[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('SUSPENSE_UNRELEASED_RUN fires when 6+ consecutive scenes all raise tension', async () => {
      const recs324sr = Array.from({ length: 8 }, (_, i) => makeRec324(i, { suspenseDelta: 1 }));
      const res = await runC324(recs324sr);
      assert.ok(res.issues.some((i: any) => i.rule === 'SUSPENSE_UNRELEASED_RUN'), 'SUSPENSE_UNRELEASED_RUN should fire');
    });

    it('SUSPENSE_UNRELEASED_RUN does not fire when release valleys break the run', async () => {
      const recs324nsr = Array.from({ length: 8 }, (_, i) =>
        makeRec324(i, { suspenseDelta: [0, 5].includes(i) ? 0 : 1 })
      );
      const res = await runC324(recs324nsr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SUSPENSE_UNRELEASED_RUN'), 'SUSPENSE_UNRELEASED_RUN should not fire');
    });

    it('CLOCK_RAISED_NO_DELTA fires when 2+ clock raises carry no delta', async () => {
      const recs324cd = Array.from({ length: 8 }, (_, i) =>
        makeRec324(i, { clockRaised: [2, 4].includes(i), clockDelta: 0 })
      );
      const res = await runC324(recs324cd);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_RAISED_NO_DELTA'), 'CLOCK_RAISED_NO_DELTA should fire');
    });

    it('CLOCK_RAISED_NO_DELTA does not fire when clock raises carry a delta', async () => {
      const recs324ncd = Array.from({ length: 8 }, (_, i) =>
        makeRec324(i, { clockRaised: [2, 4].includes(i), clockDelta: [2, 4].includes(i) ? 1 : 0 })
      );
      const res = await runC324(recs324ncd);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_RAISED_NO_DELTA'), 'CLOCK_RAISED_NO_DELTA should not fire');
    });

    it('EMOTIONAL_NEUTRAL_RUN fires when 6+ consecutive scenes are emotionally neutral', async () => {
      const recs324en = Array.from({ length: 10 }, (_, i) =>
        makeRec324(i, { emotionalShift: i < 6 ? 'neutral' : 'positive' })
      );
      const res = await runC324(recs324en);
      assert.ok(res.issues.some((i: any) => i.rule === 'EMOTIONAL_NEUTRAL_RUN'), 'EMOTIONAL_NEUTRAL_RUN should fire');
    });

    it('EMOTIONAL_NEUTRAL_RUN does not fire when the neutral run stays under six', async () => {
      const recs324nen = Array.from({ length: 10 }, (_, i) =>
        makeRec324(i, { emotionalShift: i < 5 ? 'neutral' : 'positive' })
      );
      const res = await runC324(recs324nen);
      assert.ok(!res.issues.some((i: any) => i.rule === 'EMOTIONAL_NEUTRAL_RUN'), 'EMOTIONAL_NEUTRAL_RUN should not fire');
    });
  });


  describe('Wave 296 — causalityPass: clock delta without raise, suspense sawtooth, dramatic turn aftermath void', async () => {
    const makeRec296 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runC296 = async (records: any[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CLOCK_DELTA_WITHOUT_RAISE fires when clockDelta > 1 appears before any clock is raised', async () => {
      const recs296cd = Array.from({ length: 8 }, (_, i) =>
        makeRec296(i, {
          clockDelta: i === 2 ? 2 : 0,
          clockRaised: i === 5,
        })
      );
      const res = await runC296(recs296cd);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_DELTA_WITHOUT_RAISE'), 'CLOCK_DELTA_WITHOUT_RAISE should fire');
    });

    it('CLOCK_DELTA_WITHOUT_RAISE does not fire when a clock is raised before the delta', async () => {
      const recs296ncd = Array.from({ length: 8 }, (_, i) =>
        makeRec296(i, {
          clockRaised: i === 1,
          clockDelta: i === 3 ? 2 : 0,
        })
      );
      const res = await runC296(recs296ncd);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_DELTA_WITHOUT_RAISE'), 'CLOCK_DELTA_WITHOUT_RAISE should not fire');
    });

    it('SUSPENSE_SAWTOOTH fires when suspenseDelta strictly alternates sign for 6+ scenes', async () => {
      const recs296ss = Array.from({ length: 8 }, (_, i) =>
        makeRec296(i, { suspenseDelta: i % 2 === 0 ? 2 : -2 })
      );
      const res = await runC296(recs296ss);
      assert.ok(res.issues.some((i: any) => i.rule === 'SUSPENSE_SAWTOOTH'), 'SUSPENSE_SAWTOOTH should fire');
    });

    it('SUSPENSE_SAWTOOTH does not fire when tension accumulates over consecutive scenes', async () => {
      const recs296nss = Array.from({ length: 8 }, (_, i) =>
        makeRec296(i, { suspenseDelta: i < 6 ? 1 : -1 })
      );
      const res = await runC296(recs296nss);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SUSPENSE_SAWTOOTH'), 'SUSPENSE_SAWTOOTH should not fire');
    });

    it('DRAMATIC_TURN_AFTERMATH_VOID fires when a turn is followed by two inert scenes', async () => {
      const recs296dt = Array.from({ length: 8 }, (_, i) =>
        makeRec296(i, {
          dramaticTurn: i === 2 ? 'reversal' : 'nothing',
          suspenseDelta: i === 3 || i === 4 ? 0 : 1,
        })
      );
      const res = await runC296(recs296dt);
      assert.ok(res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_AFTERMATH_VOID'), 'DRAMATIC_TURN_AFTERMATH_VOID should fire');
    });

    it('DRAMATIC_TURN_AFTERMATH_VOID does not fire when the turn produces a ripple', async () => {
      const recs296ndt = Array.from({ length: 8 }, (_, i) =>
        makeRec296(i, {
          dramaticTurn: i === 2 ? 'reversal' : 'nothing',
          emotionalShift: i === 3 ? 'negative' : 'neutral',
          suspenseDelta: 1,
        })
      );
      const res = await runC296(recs296ndt);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_AFTERMATH_VOID'), 'DRAMATIC_TURN_AFTERMATH_VOID should not fire');
    });
  });


  describe('Wave 282 — causalityPass: clock clustering, revelation cascade, emotional positive desert', async () => {
    const makeRec282 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runC282 = async (records: any[]) => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      return causalityPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CLOCK_CLUSTERING fires when all ≥3 clocks appear in the first 40% of the story', async () => {
      // n=8, cutoff=floor(8*0.4)=3 → first 40% = scenes 0,1,2
      const recs282a = [
        makeRec282(0, { clockRaised: true }),
        makeRec282(1, { clockRaised: true }),
        makeRec282(2, { clockRaised: true }),
        makeRec282(3), makeRec282(4), makeRec282(5), makeRec282(6), makeRec282(7),
      ];
      const result282a = await runC282(recs282a);
      const fired282a = result282a.issues.filter((i: any) => i.rule === 'CLOCK_CLUSTERING');
      assert.strictEqual(fired282a.length, 1, 'Should fire CLOCK_CLUSTERING when all clocks are in the first 40%');
    });

    it('CLOCK_CLUSTERING does NOT fire when a clock is raised after the 40% mark', async () => {
      // n=8, cutoff=3; scene 5 >= 3 → not all early
      const recs282b = [
        makeRec282(0, { clockRaised: true }),
        makeRec282(1, { clockRaised: true }),
        makeRec282(2),
        makeRec282(3),
        makeRec282(4),
        makeRec282(5, { clockRaised: true }), // after cutoff
        makeRec282(6), makeRec282(7),
      ];
      const result282b = await runC282(recs282b);
      const fired282b = result282b.issues.filter((i: any) => i.rule === 'CLOCK_CLUSTERING');
      assert.strictEqual(fired282b.length, 0, 'Should NOT fire CLOCK_CLUSTERING when a clock is raised in the second half');
    });

    it('REVELATION_CASCADE fires when >35% of scenes contain a revelation', async () => {
      // n=8, 4 revelations = 50% > 35%
      const recs282c = [
        makeRec282(0, { revelation: 'truth one' }),
        makeRec282(1),
        makeRec282(2, { revelation: 'truth two' }),
        makeRec282(3),
        makeRec282(4, { revelation: 'truth three' }),
        makeRec282(5, { revelation: 'truth four' }),
        makeRec282(6), makeRec282(7),
      ];
      const result282c = await runC282(recs282c);
      const fired282c = result282c.issues.filter((i: any) => i.rule === 'REVELATION_CASCADE');
      assert.strictEqual(fired282c.length, 1, 'Should fire REVELATION_CASCADE when >35% of scenes have a revelation');
    });

    it('REVELATION_CASCADE does NOT fire when ≤35% of scenes contain a revelation', async () => {
      // n=8, 2 revelations = 25% ≤ 35%
      const recs282d = [
        makeRec282(0, { revelation: 'truth one' }),
        makeRec282(1),
        makeRec282(2),
        makeRec282(3),
        makeRec282(4, { revelation: 'truth two' }),
        makeRec282(5), makeRec282(6), makeRec282(7),
      ];
      const result282d = await runC282(recs282d);
      const fired282d = result282d.issues.filter((i: any) => i.rule === 'REVELATION_CASCADE');
      assert.strictEqual(fired282d.length, 0, 'Should NOT fire REVELATION_CASCADE when ≤35% of scenes have a revelation');
    });

    it('EMOTIONAL_POSITIVE_DESERT fires when Act 2 has negative but never positive while positive exists elsewhere', async () => {
      // n=10: Act 2 = records.slice(2,7) = indices 2-6
      const recs282e = [
        makeRec282(0, { emotionalShift: 'positive' }),  // positive outside Act 2
        makeRec282(1, { emotionalShift: 'neutral' }),
        makeRec282(2, { emotionalShift: 'negative' }),  // Act 2 negative
        makeRec282(3, { emotionalShift: 'neutral' }),
        makeRec282(4, { emotionalShift: 'negative' }),  // Act 2 negative
        makeRec282(5, { emotionalShift: 'neutral' }),
        makeRec282(6, { emotionalShift: 'neutral' }),   // Act 2 end (no positive in Act 2)
        makeRec282(7, { emotionalShift: 'neutral' }),
        makeRec282(8, { emotionalShift: 'neutral' }),
        makeRec282(9, { emotionalShift: 'neutral' }),
      ];
      const result282e = await runC282(recs282e);
      const fired282e = result282e.issues.filter((i: any) => i.rule === 'EMOTIONAL_POSITIVE_DESERT');
      assert.strictEqual(fired282e.length, 1, 'Should fire EMOTIONAL_POSITIVE_DESERT when Act 2 has no positive shift');
    });

    it('EMOTIONAL_POSITIVE_DESERT does NOT fire when Act 2 contains a positive shift', async () => {
      // n=10: record at array index 4 is in Act 2, give it positive
      const recs282f = [
        makeRec282(0, { emotionalShift: 'positive' }),
        makeRec282(1, { emotionalShift: 'neutral' }),
        makeRec282(2, { emotionalShift: 'negative' }),
        makeRec282(3, { emotionalShift: 'neutral' }),
        makeRec282(4, { emotionalShift: 'positive' }),  // positive in Act 2 → no fire
        makeRec282(5, { emotionalShift: 'negative' }),
        makeRec282(6, { emotionalShift: 'neutral' }),
        makeRec282(7, { emotionalShift: 'neutral' }),
        makeRec282(8, { emotionalShift: 'neutral' }),
        makeRec282(9, { emotionalShift: 'neutral' }),
      ];
      const result282f = await runC282(recs282f);
      const fired282f = result282f.issues.filter((i: any) => i.rule === 'EMOTIONAL_POSITIVE_DESERT');
      assert.strictEqual(fired282f.length, 0, 'Should NOT fire EMOTIONAL_POSITIVE_DESERT when Act 2 has a positive shift');
    });
  });


  describe('Wave 268 — causalityPass: curiosity front loaded, payoff back loaded, clock single scene', async () => {
    const makeRec268 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput268 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: '...',
      records: records as any, structure: {} as any,
      storyContext: {} as any, annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('CURIOSITY_FRONT_LOADED fires when all curiosity spikes are in the first half', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // 8 scenes; midpoint=4; curiosity spikes at scenes 0, 1, 2 (all < 4), none in 4-7
      const records268a = [
        makeRec268(0, { curiosityDelta: 2 }),
        makeRec268(1, { curiosityDelta: 2.5 }),
        makeRec268(2, { curiosityDelta: 1.8 }),
        makeRec268(3), makeRec268(4), makeRec268(5), makeRec268(6), makeRec268(7),
      ];
      const result268a = await causalityPass(makeInput268(records268a));
      const cfl = result268a.issues.filter((i: any) => i.rule === 'CURIOSITY_FRONT_LOADED');
      assert.ok(cfl.length >= 1, `Should detect CURIOSITY_FRONT_LOADED, got: ${JSON.stringify(result268a.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(cfl[0].severity, 'minor');
    });

    it('CURIOSITY_FRONT_LOADED does NOT fire when a curiosity spike appears in the second half', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // 8 scenes; curiosity spikes at 1, 3, 5 — scene 5 is in second half (>=4)
      const records268b = [
        makeRec268(0),
        makeRec268(1, { curiosityDelta: 2 }),
        makeRec268(2),
        makeRec268(3, { curiosityDelta: 1.8 }),
        makeRec268(4),
        makeRec268(5, { curiosityDelta: 2.2 }),
        makeRec268(6), makeRec268(7),
      ];
      const result268b = await causalityPass(makeInput268(records268b));
      const cfl = result268b.issues.filter((i: any) => i.rule === 'CURIOSITY_FRONT_LOADED');
      assert.strictEqual(cfl.length, 0, 'Should NOT fire when a curiosity spike appears in the second half');
    });

    it('PAYOFF_BACK_LOADED fires when all payoff scenes are in the second half', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // 8 scenes; midpoint=4; payoffs only at scenes 5 and 7 (both >= 4)
      const records268c = [
        makeRec268(0, { seededClueIds: ['clue-a'] }),
        makeRec268(1, { seededClueIds: ['clue-b'] }),
        makeRec268(2), makeRec268(3), makeRec268(4),
        makeRec268(5, { payoffSetupIds: ['clue-a'] }),
        makeRec268(6),
        makeRec268(7, { payoffSetupIds: ['clue-b'] }),
      ];
      const result268c = await causalityPass(makeInput268(records268c));
      const pbl = result268c.issues.filter((i: any) => i.rule === 'PAYOFF_BACK_LOADED');
      assert.ok(pbl.length >= 1, `Should detect PAYOFF_BACK_LOADED, got: ${JSON.stringify(result268c.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(pbl[0].severity, 'minor');
    });

    it('PAYOFF_BACK_LOADED does NOT fire when a payoff scene appears in the first half', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // 8 scenes; payoffs at scenes 2 and 6 — scene 2 is in the first half (<4)
      const records268d = [
        makeRec268(0, { seededClueIds: ['clue-a'] }),
        makeRec268(1),
        makeRec268(2, { payoffSetupIds: ['clue-a'] }),
        makeRec268(3, { seededClueIds: ['clue-b'] }),
        makeRec268(4), makeRec268(5),
        makeRec268(6, { payoffSetupIds: ['clue-b'] }),
        makeRec268(7),
      ];
      const result268d = await causalityPass(makeInput268(records268d));
      const pbl = result268d.issues.filter((i: any) => i.rule === 'PAYOFF_BACK_LOADED');
      assert.strictEqual(pbl.length, 0, 'Should NOT fire when a payoff scene appears in the first half');
    });

    it('CLOCK_SINGLE_SCENE fires when only one scene raises a clock in a long story', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // 8 scenes; exactly one scene (scene 3) raises a clock
      const records268e = [
        makeRec268(0), makeRec268(1), makeRec268(2),
        makeRec268(3, { clockRaised: true }),
        makeRec268(4), makeRec268(5), makeRec268(6), makeRec268(7),
      ];
      const result268e = await causalityPass(makeInput268(records268e));
      const css = result268e.issues.filter((i: any) => i.rule === 'CLOCK_SINGLE_SCENE');
      assert.ok(css.length >= 1, `Should detect CLOCK_SINGLE_SCENE, got: ${JSON.stringify(result268e.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(css[0].severity, 'minor');
    });

    it('CLOCK_SINGLE_SCENE does NOT fire when two or more scenes raise clocks', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // 8 scenes; two scenes (2 and 5) raise clocks
      const records268f = [
        makeRec268(0), makeRec268(1),
        makeRec268(2, { clockRaised: true }),
        makeRec268(3), makeRec268(4),
        makeRec268(5, { clockRaised: true }),
        makeRec268(6), makeRec268(7),
      ];
      const result268f = await causalityPass(makeInput268(records268f));
      const css = result268f.issues.filter((i: any) => i.rule === 'CLOCK_SINGLE_SCENE');
      assert.strictEqual(css.length, 0, 'Should NOT fire when two or more scenes raise clocks');
    });
  });


  describe('Wave 254 — causalityPass: clue-seed cluster, payoff without setup, suspense plateau flatline', async () => {
    const makeRec254 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput254 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: '...',
      records: records as any, structure: {} as any,
      storyContext: {} as any, annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('CLUE_SEED_CLUSTER fires when one scene plants 3+ clues', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const records254a = [
        makeRec254(0),
        makeRec254(1, { seededClueIds: ['clueA', 'clueB', 'clueC'] }),
        makeRec254(2), makeRec254(3),
      ];
      const result254a = await causalityPass(makeInput254(records254a));
      const cluster = result254a.issues.filter((i: any) => i.rule === 'CLUE_SEED_CLUSTER');
      assert.ok(cluster.length >= 1, `Should detect CLUE_SEED_CLUSTER, got: ${JSON.stringify(result254a.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(cluster[0].severity, 'minor');
    });

    it('CLUE_SEED_CLUSTER does NOT fire when clues are spread across scenes', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const records254b = [
        makeRec254(0, { seededClueIds: ['clueA'] }),
        makeRec254(1, { seededClueIds: ['clueB'] }),
        makeRec254(2, { seededClueIds: ['clueC'] }),
        makeRec254(3),
      ];
      const result254b = await causalityPass(makeInput254(records254b));
      const cluster = result254b.issues.filter((i: any) => i.rule === 'CLUE_SEED_CLUSTER');
      assert.strictEqual(cluster.length, 0, 'Should NOT fire when clues are spread one-per-scene');
    });

    it('PAYOFF_WITHOUT_SETUP fires when a payoff references an unseeded thread', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // payoff "ghost" at scene 2 was never seeded earlier
      const records254c = [
        makeRec254(0, { seededClueIds: ['realThread'] }),
        makeRec254(1),
        makeRec254(2, { payoffSetupIds: ['ghost'] }),
        makeRec254(3),
      ];
      const result254c = await causalityPass(makeInput254(records254c));
      const orphan = result254c.issues.filter((i: any) => i.rule === 'PAYOFF_WITHOUT_SETUP');
      assert.ok(orphan.length >= 1, `Should detect PAYOFF_WITHOUT_SETUP, got: ${JSON.stringify(result254c.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(orphan[0].severity, 'major');
    });

    it('PAYOFF_WITHOUT_SETUP does NOT fire when the payoff thread was seeded earlier', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const records254d = [
        makeRec254(0, { seededClueIds: ['realThread'] }),
        makeRec254(1),
        makeRec254(2, { payoffSetupIds: ['realThread'] }),
        makeRec254(3),
      ];
      const result254d = await causalityPass(makeInput254(records254d));
      const orphan = result254d.issues.filter((i: any) => i.rule === 'PAYOFF_WITHOUT_SETUP');
      assert.strictEqual(orphan.length, 0, 'Should NOT fire when the payoff thread was seeded in an earlier scene');
    });

    it('SUSPENSE_PLATEAU_FLATLINE fires when 4+ consecutive scenes hold flat suspense', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // 8 scenes; scenes 2-5 all flat (delta 0); rest have movement
      const records254e = [
        makeRec254(0, { suspenseDelta: 2 }),
        makeRec254(1, { suspenseDelta: 2 }),
        makeRec254(2, { suspenseDelta: 0 }),
        makeRec254(3, { suspenseDelta: 0.3 }),
        makeRec254(4, { suspenseDelta: -0.2 }),
        makeRec254(5, { suspenseDelta: 0 }),
        makeRec254(6, { suspenseDelta: 2 }),
        makeRec254(7, { suspenseDelta: 2 }),
      ];
      const result254e = await causalityPass(makeInput254(records254e));
      const flat = result254e.issues.filter((i: any) => i.rule === 'SUSPENSE_PLATEAU_FLATLINE');
      assert.ok(flat.length >= 1, `Should detect SUSPENSE_PLATEAU_FLATLINE, got: ${JSON.stringify(result254e.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(flat[0].severity, 'minor');
    });

    it('SUSPENSE_PLATEAU_FLATLINE does NOT fire when suspense moves regularly', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // 8 scenes; no run of 4 flat scenes — movement at least every 3rd scene
      const records254f = [
        makeRec254(0, { suspenseDelta: 2 }),
        makeRec254(1, { suspenseDelta: 0 }),
        makeRec254(2, { suspenseDelta: 0 }),
        makeRec254(3, { suspenseDelta: 2 }),
        makeRec254(4, { suspenseDelta: 0 }),
        makeRec254(5, { suspenseDelta: 0 }),
        makeRec254(6, { suspenseDelta: 2 }),
        makeRec254(7, { suspenseDelta: 0 }),
      ];
      const result254f = await causalityPass(makeInput254(records254f));
      const flat = result254f.issues.filter((i: any) => i.rule === 'SUSPENSE_PLATEAU_FLATLINE');
      assert.strictEqual(flat.length, 0, 'Should NOT fire when no run of 4 flat scenes exists');
    });
  });


  describe('Wave 240 — causalityPass: curiosity open loop, revelation without curiosity, emotional whiplash', async () => {
    const makeRec240 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput240 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: '...',
      records: records as any, structure: {} as any,
      storyContext: {} as any,
      annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('CURIOSITY_OPEN_LOOP fires when curiosity spikes have no downstream revelation', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // 8 scenes; curiosity spikes (curiosityDelta>=2) at scenes 1 and 3; no revelation anywhere
      const records240a = [
        makeRec240(0),
        makeRec240(1, { curiosityDelta: 3 }),
        makeRec240(2),
        makeRec240(3, { curiosityDelta: 2 }),
        makeRec240(4), makeRec240(5), makeRec240(6), makeRec240(7),
      ];
      const result240a = await causalityPass(makeInput240(records240a));
      const openLoop = result240a.issues.filter(i => i.rule === 'CURIOSITY_OPEN_LOOP');
      assert.ok(openLoop.length >= 1, 'Should detect CURIOSITY_OPEN_LOOP when curiosity spikes are never paid off by a revelation');
      assert.strictEqual(openLoop[0].severity, 'major');
    });

    it('CURIOSITY_OPEN_LOOP does NOT fire when a revelation follows the first curiosity spike', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // curiosity spikes at scenes 1 and 3; revelation at scene 5 (after first spike) closes the loop
      const records240b = [
        makeRec240(0),
        makeRec240(1, { curiosityDelta: 3 }),
        makeRec240(2),
        makeRec240(3, { curiosityDelta: 2 }),
        makeRec240(4),
        makeRec240(5, { revelation: 'the missing money was hidden in the vault all along' }),
        makeRec240(6), makeRec240(7),
      ];
      const result240b = await causalityPass(makeInput240(records240b));
      const openLoop = result240b.issues.filter(i => i.rule === 'CURIOSITY_OPEN_LOOP');
      assert.strictEqual(openLoop.length, 0, 'Should NOT fire when a revelation follows the first curiosity spike');
    });

    it('REVELATION_WITHOUT_CURIOSITY fires when revelations land but no scene ever raises curiosity', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // 8 scenes; 2 revelations (scenes 3,6); suspense active (scene 2); curiosity never raised
      const records240c = [
        makeRec240(0),
        makeRec240(1),
        makeRec240(2, { suspenseDelta: 2 }),
        makeRec240(3, { revelation: 'the will named a second beneficiary nobody knew' }),
        makeRec240(4),
        makeRec240(5),
        makeRec240(6, { revelation: 'the lawyer forged the original signature pages' }),
        makeRec240(7),
      ];
      const result240c = await causalityPass(makeInput240(records240c));
      const noCuriosity = result240c.issues.filter(i => i.rule === 'REVELATION_WITHOUT_CURIOSITY');
      assert.ok(noCuriosity.length >= 1, 'Should detect REVELATION_WITHOUT_CURIOSITY when revelations land with no curiosity build');
      assert.strictEqual(noCuriosity[0].severity, 'minor');
    });

    it('REVELATION_WITHOUT_CURIOSITY does NOT fire when curiosity is raised somewhere', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // 2 revelations, suspense active, AND curiosity raised at scene 1 (below spike threshold to avoid open-loop)
      const records240d = [
        makeRec240(0),
        makeRec240(1, { curiosityDelta: 1 }),
        makeRec240(2, { suspenseDelta: 2 }),
        makeRec240(3, { revelation: 'the will named a second beneficiary nobody knew' }),
        makeRec240(4),
        makeRec240(5),
        makeRec240(6, { revelation: 'the lawyer forged the original signature pages' }),
        makeRec240(7),
      ];
      const result240d = await causalityPass(makeInput240(records240d));
      const noCuriosity = result240d.issues.filter(i => i.rule === 'REVELATION_WITHOUT_CURIOSITY');
      assert.strictEqual(noCuriosity.length, 0, 'Should NOT fire when at least one scene raises curiosity');
    });

    it('EMOTIONAL_WHIPLASH fires when emotional polarity oscillates with no causal pivot', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // 6 scenes; scenes 1-3 oscillate positive→negative→positive; pivots (2,3) have no causal event
      const records240e = [
        makeRec240(0),
        makeRec240(1, { emotionalShift: 'positive' }),
        makeRec240(2, { emotionalShift: 'negative' }),
        makeRec240(3, { emotionalShift: 'positive' }),
        makeRec240(4),
        makeRec240(5),
      ];
      const result240e = await causalityPass(makeInput240(records240e));
      const whiplash = result240e.issues.filter(i => i.rule === 'EMOTIONAL_WHIPLASH');
      assert.ok(whiplash.length >= 1, 'Should detect EMOTIONAL_WHIPLASH when mood oscillates without a causal pivot');
      assert.strictEqual(whiplash[0].severity, 'minor');
    });

    it('EMOTIONAL_WHIPLASH does NOT fire when the oscillation is motivated by a causal event', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // Same oscillation but scene 2 (the down-pivot) carries a revelation → motivated → no fire
      const records240f = [
        makeRec240(0),
        makeRec240(1, { emotionalShift: 'positive' }),
        makeRec240(2, { emotionalShift: 'negative', revelation: 'the partner had been lying about the alibi' }),
        makeRec240(3, { emotionalShift: 'positive' }),
        makeRec240(4),
        makeRec240(5),
      ];
      const result240f = await causalityPass(makeInput240(records240f));
      const whiplash = result240f.issues.filter(i => i.rule === 'EMOTIONAL_WHIPLASH');
      assert.strictEqual(whiplash.length, 0, 'Should NOT fire when a causal event motivates the emotional reversal');
    });
  });


  describe('Wave 212 — causalityPass: setup-payoff imbalance, act2 causal desert, causal midpoint void', async () => {
    const makeRec212 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 1,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput212 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nA.\n', original: 'INT. SC - DAY\nA.\n',
      records: records as any, structure: {} as any,
      storyContext: {} as any, annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('SETUP_PAYOFF_IMBALANCE fires when 5+ seeds exist but only 1 payoff closes them', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // n=10: seed in act1 scene0; 4 seeds in act2/act3 scenes 5-8; 1 payoff at scene7
      // CHEKHOV_GUN_UNFIRED: only 1 unfired early seed ('setup-a1' is paid off) → <2 → won't fire
      const records = [
        makeRec212(0, { seededClueIds: ['setup-a1'] }),
        makeRec212(1),
        makeRec212(2),
        makeRec212(3),
        makeRec212(4),
        makeRec212(5, { seededClueIds: ['seed-b'] }),
        makeRec212(6, { seededClueIds: ['seed-c'] }),
        makeRec212(7, { seededClueIds: ['seed-d'], payoffSetupIds: ['setup-a1'] }),
        makeRec212(8, { seededClueIds: ['seed-e'] }),
        makeRec212(9),
      ];
      const result = await causalityPass(makeInput212(records));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'SETUP_PAYOFF_IMBALANCE'),
        'Should fire when 5+ clues are seeded but only 1 payoff closes them',
      );
    });

    it('SETUP_PAYOFF_IMBALANCE does not fire when payoffs close enough threads', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // Add second payoff at scene8 → totalPayoffs=2 > 1 → won't fire
      const records = [
        makeRec212(0, { seededClueIds: ['setup-a1'] }),
        makeRec212(1),
        makeRec212(2),
        makeRec212(3),
        makeRec212(4),
        makeRec212(5, { seededClueIds: ['seed-b'] }),
        makeRec212(6, { seededClueIds: ['seed-c'] }),
        makeRec212(7, { seededClueIds: ['seed-d'], payoffSetupIds: ['setup-a1'] }),
        makeRec212(8, { seededClueIds: ['seed-e'], payoffSetupIds: ['seed-b'] }),
        makeRec212(9),
      ];
      const result = await causalityPass(makeInput212(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'SETUP_PAYOFF_IMBALANCE'),
        'Should NOT fire when 2 or more payoffs close the seeded threads',
      );
    });

    it('ACT2_CAUSAL_DESERT fires when the entire act 2 contains no causal event', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // n=10: seed in act1 (scene0), payoff in act3 (scene7); act2 scenes 2-6 all neutral
      // CAUSAL_MIDPOINT_VOID won't fire: act2 is entirely empty (guard: act2HasContent=false)
      const records = [
        makeRec212(0, { seededClueIds: ['causal-seed'] }),
        makeRec212(1),
        makeRec212(2),
        makeRec212(3),
        makeRec212(4),
        makeRec212(5),
        makeRec212(6),
        makeRec212(7, { payoffSetupIds: ['causal-seed'] }),
        makeRec212(8),
        makeRec212(9),
      ];
      const result = await causalityPass(makeInput212(records));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'ACT2_CAUSAL_DESERT'),
        'Should fire when the entire act 2 (25%–75%) has no revelation, seed, payoff, clock, or rel shift',
      );
    });

    it('ACT2_CAUSAL_DESERT does not fire when act 2 contains a seed', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // Add a seed at scene4 (act2 midpoint) → act2 has content
      const records = [
        makeRec212(0, { seededClueIds: ['causal-seed'] }),
        makeRec212(1),
        makeRec212(2),
        makeRec212(3),
        makeRec212(4, { seededClueIds: ['act2-seed'] }),
        makeRec212(5),
        makeRec212(6),
        makeRec212(7, { payoffSetupIds: ['causal-seed'] }),
        makeRec212(8),
        makeRec212(9),
      ];
      const result = await causalityPass(makeInput212(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'ACT2_CAUSAL_DESERT'),
        'Should NOT fire when act 2 contains at least one causal event',
      );
    });

    it('CAUSAL_MIDPOINT_VOID fires when the midpoint zone has no causal event but act 2 does', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // n=10: act2 has revelation@2 and payoff@6; midpoint [4,5] empty; act3 has revelation@7
      // Rel shift (amount=0.3) at scenes 3 and 8 satisfy REVELATION_WITHOUT_REACTION
      const records = [
        makeRec212(0, { seededClueIds: ['clue-x'] }),
        makeRec212(1),
        makeRec212(2, { revelation: 'early truth discovered here' }),
        makeRec212(3, { relationshipShifts: [{ pairKey: 'alice-bob', dimension: 'trust', amount: 0.3 }] }),
        makeRec212(4),
        makeRec212(5),
        makeRec212(6, { payoffSetupIds: ['clue-x'] }),
        makeRec212(7, { revelation: 'final act truth revealed now' }),
        makeRec212(8, { relationshipShifts: [{ pairKey: 'alice-bob', dimension: 'trust', amount: 0.3 }] }),
        makeRec212(9),
      ];
      const result = await causalityPass(makeInput212(records));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'CAUSAL_MIDPOINT_VOID'),
        'Should fire when midpoint zone (40%–60%) is causally empty while act 2 has content elsewhere',
      );
    });

    it('CAUSAL_MIDPOINT_VOID does not fire when the midpoint zone contains a causal event', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // Add seed at scene4 (in midpoint zone [4,5]) → hasMidCausal=true
      const records = [
        makeRec212(0, { seededClueIds: ['clue-x'] }),
        makeRec212(1),
        makeRec212(2, { revelation: 'early truth discovered here' }),
        makeRec212(3, { relationshipShifts: [{ pairKey: 'alice-bob', dimension: 'trust', amount: 0.3 }] }),
        makeRec212(4, { seededClueIds: ['mid-seed'] }),
        makeRec212(5),
        makeRec212(6, { payoffSetupIds: ['clue-x'] }),
        makeRec212(7, { revelation: 'final act truth revealed now' }),
        makeRec212(8, { relationshipShifts: [{ pairKey: 'alice-bob', dimension: 'trust', amount: 0.3 }] }),
        makeRec212(9),
      ];
      const result = await causalityPass(makeInput212(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'CAUSAL_MIDPOINT_VOID'),
        'Should NOT fire when the midpoint zone contains at least one causal event',
      );
    });
  });


  describe('Wave 197 — causalityPass: causal act1 void, act3 discharge absent, motivation reversal', async () => {
    const makeRec197 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput197 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nA.\n', original: 'INT. SC - DAY\nA.\n',
      records: records as any, structure: {} as any,
      storyContext: {} as any, annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('CAUSAL_ACT1_VOID fires when act1 has no clues, clock, or relationship signals', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // 8 records: none in act1 (records 0-1) plant any causal thread
      const records = Array.from({ length: 8 }, (_, i) => makeRec197(i));
      const result = await causalityPass(makeInput197(records));
      assert.ok(result.issues.some((i: any) => i.rule === 'CAUSAL_ACT1_VOID'),
        'Should fire when act1 has no clues, clock, or relationship shifts');
    });

    it('CAUSAL_ACT1_VOID does not fire when act1 contains a causal signal', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // records[0] raises a clock — act1 is causally active
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec197(i, i === 0 ? { clockRaised: true } : {}),
      );
      const result = await causalityPass(makeInput197(records));
      assert.ok(!result.issues.some((i: any) => i.rule === 'CAUSAL_ACT1_VOID'),
        'Should NOT fire when act1 contains a clock raise');
    });

    it('ACT3_DISCHARGE_ABSENT fires when seeds exist but act3 has no payoffs or revelations', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // Seeds in record 0, payoff in record 4 (act2), act3 (records 6-7) has nothing
      const records = [
        makeRec197(0, { seededClueIds: ['clue1'] }),
        makeRec197(1),
        makeRec197(2),
        makeRec197(3, { suspenseDelta: -2 }),
        makeRec197(4, { payoffSetupIds: ['clue1'] }),
        makeRec197(5),
        makeRec197(6),
        makeRec197(7),
      ];
      const result = await causalityPass(makeInput197(records));
      assert.ok(result.issues.some((i: any) => i.rule === 'ACT3_DISCHARGE_ABSENT'),
        'Should fire when seeds exist but act3 has no payoffs or revelations');
    });

    it('ACT3_DISCHARGE_ABSENT does not fire when act3 contains a revelation', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // Same setup but final scene has a revelation
      const records = [
        makeRec197(0, { seededClueIds: ['clue1'] }),
        makeRec197(1),
        makeRec197(2),
        makeRec197(3, { suspenseDelta: -2 }),
        makeRec197(4, { payoffSetupIds: ['clue1'] }),
        makeRec197(5),
        makeRec197(6),
        makeRec197(7, { revelation: 'the truth emerges' }),
      ];
      const result = await causalityPass(makeInput197(records));
      assert.ok(!result.issues.some((i: any) => i.rule === 'ACT3_DISCHARGE_ABSENT'),
        'Should NOT fire when act3 contains a revelation');
    });

    it('MOTIVATION_REVERSAL_UNCAUSED fires when same-pair positive then negative shift has no cause', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // record 1: alice|bob +0.6; record 2: nothing; record 3: alice|bob -0.6
      const records = [
        makeRec197(0),
        makeRec197(1, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.6 }] }),
        makeRec197(2),
        makeRec197(3, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: -0.6 }] }),
        makeRec197(4),
        makeRec197(5),
      ];
      const result = await causalityPass(makeInput197(records));
      assert.ok(result.issues.some((i: any) => i.rule === 'MOTIVATION_REVERSAL_UNCAUSED'),
        'Should fire when a positive then negative same-pair shift has no triggering event');
    });

    it('MOTIVATION_REVERSAL_UNCAUSED does not fire when a clock raise explains the reversal', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      // Same flip but record 2 has clockRaised — an intervening cause exists
      const records = [
        makeRec197(0),
        makeRec197(1, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.6 }] }),
        makeRec197(2, { clockRaised: true }),
        makeRec197(3, { relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: -0.6 }] }),
        makeRec197(4),
        makeRec197(5),
      ];
      const result = await causalityPass(makeInput197(records));
      assert.ok(!result.issues.some((i: any) => i.rule === 'MOTIVATION_REVERSAL_UNCAUSED'),
        'Should NOT fire when a clock raise intervenes between the positive and negative shift');
    });
  });


describe('Wave 130 — Causality pass REVELATION_WITHOUT_SETUP fix', () => {

  it('does NOT fire REVELATION_WITHOUT_SETUP when prev scene has unrelated clue', async () => {
    // Pre-fix: would fail because prev.unresolvedClues.length > 0 blocked the outer check
    // Post-fix: checks ALL prior records for seededClueIds
    const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
    const records: ScreenplaySceneRecord[] = [
      makeSceneRecord({
        sceneIdx: 0, slug: 'INT. ROOM - DAY',
        unresolvedClues: ['unrelated-clue'], seededClueIds: ['unrelated-clue'],
      }),
      makeSceneRecord({
        sceneIdx: 1, slug: 'INT. HALL - NIGHT', purpose: 'revelation', dramaticTurn: 'revelation',
        revelation: 'the killer was the butler', emotionalShift: 'negative', suspenseDelta: 5,
      }),
    ];
    const annotations = [
      { slug: 'INT. ROOM - DAY', revelation: null },
      { slug: 'INT. HALL - NIGHT', revelation: 'the killer was the butler' },
    ];
    const input = makeMinimalInput({ records, annotations: annotations as never });
    const result = await causalityPass(input);
    // Scene 1 has a revelation but scene 0 DOES have a seeded clue (unrelated-clue)
    // — should NOT flag REVELATION_WITHOUT_SETUP since anyCluesBefore = true
    assert.ok(
      !result.issues.some(i => i.rule === 'REVELATION_WITHOUT_SETUP'),
      'should not flag when prior scenes have seeded clues',
    );
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// Wave 1191 — Sin Check detector pack: PLOT_ARMOR, COINCIDENCE_RESOLUTION,
// UNMOTIVATED_BETRAYAL, PROTAGONIST_UNTESTED.
// ─────────────────────────────────────────────────────────────────────────────

describe('Wave 1191 — causalityPass: Sin Check detector pack', () => {
  function makeRec1191(idx: number, slug: string, override: Partial<any> = {}): any {
    return {
      commitId: `c${idx}`, sceneIdx: idx, slug,
      purpose: 'complicate', dramaticTurn: 'nothing', revelation: null,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      visualBeats: [], dialogueHighlights: [], unresolvedClues: [],
      seededClueIds: [], payoffSetupIds: [], clockRaised: false, clockDelta: 0,
      relationshipShifts: [], createdAt: 0,
      ...override,
    };
  }

  function makeInput1191(records: any[], fountain: string, storyContext: any = {}): any {
    return {
      fountain, original: fountain,
      annotations: records.map(() => ({ revelation: null })),
      structure: {} as any, records, approvedSpans: [], storyContext,
    };
  }

  // ── PLOT_ARMOR ─────────────────────────────────────────────────────────────
  describe('PLOT_ARMOR', () => {
    // 6 scenes; JAKE is the only speaker (protagonist); scenes 1, 3, 5 are danger
    // scenes (danger vocab + suspenseDelta>2, JAKE present); zero cost anywhere.
    const dangerFountain = `INT. WAREHOUSE - DAY

JAKE
We need to move now.

INT. ROOFTOP - NIGHT

Gunfire erupts as JAKE dives behind the vent, bullets sparking off metal.

JAKE
That was close.

INT. OFFICE - DAY

JAKE
Let's regroup.

INT. BRIDGE - NIGHT

An explosion rips through the bridge as JAKE leaps clear of the flames.

JAKE
Nobody move.

INT. LAB - DAY

JAKE
Almost there.

INT. DOCKS - NIGHT

JAKE dodges as a knife-wielding attacker lunges, gunfire ringing out behind him.

JAKE
Not today.
`;
    const dangerSlugs = ['INT. WAREHOUSE - DAY', 'INT. ROOFTOP - NIGHT', 'INT. OFFICE - DAY', 'INT. BRIDGE - NIGHT', 'INT. LAB - DAY', 'INT. DOCKS - NIGHT'];
    function dangerRecords(overrides: Record<number, Partial<any>> = {}) {
      const base = [
        makeRec1191(0, dangerSlugs[0]),
        makeRec1191(1, dangerSlugs[1], { suspenseDelta: 3 }),
        makeRec1191(2, dangerSlugs[2]),
        makeRec1191(3, dangerSlugs[3], { suspenseDelta: 3 }),
        makeRec1191(4, dangerSlugs[4]),
        makeRec1191(5, dangerSlugs[5], { suspenseDelta: 3 }),
      ];
      for (const [idx, over] of Object.entries(overrides)) Object.assign(base[Number(idx)], over);
      return base;
    }

    it('fires when the protagonist survives 3+ danger scenes with zero cost', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const result = await causalityPass(makeInput1191(dangerRecords(), dangerFountain));
      const fired = result.issues.filter(i => i.rule === 'PLOT_ARMOR');
      assert.ok(fired.length >= 1, `should fire PLOT_ARMOR; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.strictEqual(fired[0].severity, 'major');
    });

    it('does NOT fire when one danger scene carries an injury cost', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const records = dangerRecords({ 3: { visualBeats: ['JAKE stumbles away bleeding from a gash on his arm.'] } });
      const result = await causalityPass(makeInput1191(records, dangerFountain));
      assert.ok(!result.issues.some(i => i.rule === 'PLOT_ARMOR'), 'a single injury signal should suppress the fire');
    });

    it('does NOT fire for a comedy-coded genre with only 3 danger scenes (threshold bumps to 4)', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const result = await causalityPass(makeInput1191(dangerRecords(), dangerFountain, { genre: 'action-comedy' }));
      assert.ok(!result.issues.some(i => i.rule === 'PLOT_ARMOR'), 'comedy-coded genre requires 4 danger scenes, not 3');
    });

    it('does NOT fire with only 2 qualifying danger scenes', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const records = dangerRecords({ 5: { suspenseDelta: 0 } });
      const fountainNoDocksDanger = dangerFountain.replace(
        'JAKE dodges as a knife-wielding attacker lunges, gunfire ringing out behind him.',
        'JAKE walks along the pier.',
      );
      const result = await causalityPass(makeInput1191(records, fountainNoDocksDanger));
      assert.ok(!result.issues.some(i => i.rule === 'PLOT_ARMOR'), 'fewer than 3 danger scenes should not fire');
    });
  });

  // ── COINCIDENCE_RESOLUTION ───────────────────────────────────────────────────
  describe('COINCIDENCE_RESOLUTION', () => {
    const plainFountain6 = Array.from({ length: 6 }, (_, i) => `INT. SC${i} - DAY\n\nSomething happens.`).join('\n\n');

    it('fires when a payoff scene uses lucky-arrival phrasing to introduce a brand-new noun', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const records = [
        makeRec1191(0, 'INT. SC0 - DAY'),
        makeRec1191(1, 'INT. SC1 - DAY'),
        makeRec1191(2, 'INT. SC2 - DAY'),
        makeRec1191(3, 'INT. SC3 - DAY'),
        makeRec1191(4, 'INT. SC4 - DAY'),
        makeRec1191(5, 'INT. SC5 - DAY', {
          payoffSetupIds: ['case_solved'],
          visualBeats: ['A stranger named Ferguson suddenly appears with the missing files.'],
        }),
      ];
      const result = await causalityPass(makeInput1191(records, plainFountain6));
      const fired = result.issues.filter(i => i.rule === 'COINCIDENCE_RESOLUTION');
      assert.ok(fired.length >= 1, `should fire COINCIDENCE_RESOLUTION; got: ${result.issues.map(i => i.rule).join(', ')}`);
    });

    it('does NOT fire when the resolving noun already appeared in an earlier scene', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const records = [
        makeRec1191(0, 'INT. SC0 - DAY'),
        makeRec1191(1, 'INT. SC1 - DAY', { visualBeats: ['Ferguson watches quietly from across the street.'] }),
        makeRec1191(2, 'INT. SC2 - DAY'),
        makeRec1191(3, 'INT. SC3 - DAY'),
        makeRec1191(4, 'INT. SC4 - DAY'),
        makeRec1191(5, 'INT. SC5 - DAY', {
          payoffSetupIds: ['case_solved'],
          visualBeats: ['A stranger named Ferguson suddenly appears with the missing files.'],
        }),
      ];
      const result = await causalityPass(makeInput1191(records, plainFountain6));
      assert.ok(!result.issues.some(i => i.rule === 'COINCIDENCE_RESOLUTION'), 'a previously-mentioned resolver should not fire');
    });

    it('does NOT fire when the payoff traces to an earlier seeded clue', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const records = [
        makeRec1191(0, 'INT. SC0 - DAY'),
        makeRec1191(1, 'INT. SC1 - DAY'),
        makeRec1191(2, 'INT. SC2 - DAY', { seededClueIds: ['case_solved'] }),
        makeRec1191(3, 'INT. SC3 - DAY'),
        makeRec1191(4, 'INT. SC4 - DAY'),
        makeRec1191(5, 'INT. SC5 - DAY', {
          payoffSetupIds: ['case_solved'],
          visualBeats: ['A stranger named Ferguson suddenly appears with the missing files.'],
        }),
      ];
      const result = await causalityPass(makeInput1191(records, plainFountain6));
      assert.ok(!result.issues.some(i => i.rule === 'COINCIDENCE_RESOLUTION'), 'a payoff tracing to a seeded clue should not fire');
    });
  });

  // ── UNMOTIVATED_BETRAYAL ──────────────────────────────────────────────────────
  describe('UNMOTIVATED_BETRAYAL', () => {
    const plainFountain6 = Array.from({ length: 6 }, (_, i) => `INT. SC${i} - DAY\n\nSomething happens.`).join('\n\n');

    it('fires when an ally bond flips to hostile with zero prior strain, vocab, or revelation', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const records = [
        makeRec1191(0, 'INT. SC0 - DAY'),
        makeRec1191(1, 'INT. SC1 - DAY', { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'trust', amount: 0.6 }] }),
        makeRec1191(2, 'INT. SC2 - DAY'),
        makeRec1191(3, 'INT. SC3 - DAY'),
        makeRec1191(4, 'INT. SC4 - DAY'),
        makeRec1191(5, 'INT. SC5 - DAY', { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'trust', amount: -0.8 }] }),
      ];
      const result = await causalityPass(makeInput1191(records, plainFountain6));
      const fired = result.issues.filter(i => i.rule === 'UNMOTIVATED_BETRAYAL');
      assert.ok(fired.length >= 1, `should fire UNMOTIVATED_BETRAYAL; got: ${result.issues.map(i => i.rule).join(', ')}`);
    });

    it('does NOT fire when a negative shift for the pair appears before the hostile flip', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const records = [
        makeRec1191(0, 'INT. SC0 - DAY'),
        makeRec1191(1, 'INT. SC1 - DAY', { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'trust', amount: 0.6 }] }),
        makeRec1191(2, 'INT. SC2 - DAY'),
        makeRec1191(3, 'INT. SC3 - DAY', { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'trust', amount: -0.2 }] }),
        makeRec1191(4, 'INT. SC4 - DAY'),
        makeRec1191(5, 'INT. SC5 - DAY', { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'trust', amount: -0.8 }] }),
      ];
      const result = await causalityPass(makeInput1191(records, plainFountain6));
      assert.ok(!result.issues.some(i => i.rule === 'UNMOTIVATED_BETRAYAL'), 'prior strain should suppress the fire');
    });

    it('does NOT fire when suspicion/deception vocabulary appears in the run-up', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const records = [
        makeRec1191(0, 'INT. SC0 - DAY'),
        makeRec1191(1, 'INT. SC1 - DAY', { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'trust', amount: 0.6 }] }),
        makeRec1191(2, 'INT. SC2 - DAY', { dialogueHighlights: ['Something about him feels suspicious.'] }),
        makeRec1191(3, 'INT. SC3 - DAY'),
        makeRec1191(4, 'INT. SC4 - DAY'),
        makeRec1191(5, 'INT. SC5 - DAY', { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'trust', amount: -0.8 }] }),
      ];
      const result = await causalityPass(makeInput1191(records, plainFountain6));
      assert.ok(!result.issues.some(i => i.rule === 'UNMOTIVATED_BETRAYAL'), 'suspicion vocabulary should suppress the fire');
    });

    it('does NOT fire when an earlier revelation names either character', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const records = [
        makeRec1191(0, 'INT. SC0 - DAY'),
        makeRec1191(1, 'INT. SC1 - DAY', { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'trust', amount: 0.6 }] }),
        makeRec1191(2, 'INT. SC2 - DAY', { revelation: 'Bob has been planning this for weeks' }),
        makeRec1191(3, 'INT. SC3 - DAY'),
        makeRec1191(4, 'INT. SC4 - DAY'),
        makeRec1191(5, 'INT. SC5 - DAY', { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'trust', amount: -0.8 }] }),
      ];
      const result = await causalityPass(makeInput1191(records, plainFountain6));
      assert.ok(!result.issues.some(i => i.rule === 'UNMOTIVATED_BETRAYAL'), 'an earlier revelation naming the betrayer should suppress the fire');
    });
  });

  // ── PROTAGONIST_UNTESTED ──────────────────────────────────────────────────────
  describe('PROTAGONIST_UNTESTED', () => {
    const untestedSlugs = ['INT. ONE - DAY', 'INT. TWO - DAY', 'INT. THREE - DAY', 'INT. FOUR - DAY', 'INT. FIVE - DAY', 'INT. SIX - NIGHT'];
    function untestedFountain(sceneSixBody: string) {
      return `INT. ONE - DAY

JAKE
Good morning.

INT. TWO - DAY

JAKE
Let's get to work.

INT. THREE - DAY

JAKE
Making progress.

INT. FOUR - DAY

JAKE
Almost there.

INT. FIVE - DAY

JAKE
We did it.

INT. SIX - NIGHT

${sceneSixBody}
`;
    }
    function untestedRecords(sceneSixOverride: Partial<any>) {
      return [
        makeRec1191(0, untestedSlugs[0]),
        makeRec1191(1, untestedSlugs[1]),
        makeRec1191(2, untestedSlugs[2]),
        makeRec1191(3, untestedSlugs[3]),
        makeRec1191(4, untestedSlugs[4]),
        makeRec1191(5, untestedSlugs[5], sceneSixOverride),
      ];
    }

    it('fires when the protagonist never takes a setback while the story shows negativity elsewhere', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const fountain = untestedFountain('MARA\nI failed to stop them. Everything is lost.');
      const records = untestedRecords({ emotionalShift: 'negative' });
      const result = await causalityPass(makeInput1191(records, fountain));
      const fired = result.issues.filter(i => i.rule === 'PROTAGONIST_UNTESTED');
      assert.ok(fired.length >= 1, `should fire PROTAGONIST_UNTESTED; got: ${result.issues.map(i => i.rule).join(', ')}`);
    });

    it('does NOT fire when the protagonist takes a setback', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const fountain = untestedFountain('MARA\nI failed to stop them. Everything is lost.');
      const records = untestedRecords({ emotionalShift: 'negative' });
      records[2] = { ...records[2], emotionalShift: 'negative' };
      const result = await causalityPass(makeInput1191(records, fountain));
      assert.ok(!result.issues.some(i => i.rule === 'PROTAGONIST_UNTESTED'), 'a protagonist setback should suppress the fire');
    });

    it('does NOT fire when the story shows no negativity anywhere (flat draft, not Mary Sue)', async () => {
      const { causalityPass } = await import('../../server/nvm/revision/passes/causality.ts');
      const fountain = untestedFountain('MARA\nQuite a day.');
      const records = untestedRecords({ emotionalShift: 'neutral' });
      const result = await causalityPass(makeInput1191(records, fountain));
      assert.ok(!result.issues.some(i => i.rule === 'PROTAGONIST_UNTESTED'), 'no negativity anywhere means the absence is not meaningful');
    });
  });
});