// Extracted from the former monolithic test.ts (audit M2.1 — split for maintainability).
// themePass revision-rule tests. Shared imports/helpers below are duplicated verbatim across every split
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


  // ── Wave 148: Theme pass enhancements ─────────────────────────────────────
  describe('Wave 148 — themePass: heavy-handedness, dialectic, front-loading', async () => {
    const makeFountain = (n: number) =>
      Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\nA scene.\n`).join('\n');
    const makeRec = (idx: number, override: Partial<any> = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'dialogue', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral',
      suspenseDelta: 1, dialogueHighlights: [],
      unresolvedClues: [], seededClueIds: [], payoffSetupIds: [],
      visualBeats: [], relationshipShifts: [],
      ...override,
    });

    it('themePass detects THEME_HEAVY_HANDED when one scene repeats theme words 3x avg', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // Scene 1 is heavy-handed: "betrayal" repeated many times across fountain text + dialogue
      const heavyFountainBlock = `INT. SC1 - DAY
betrayal betrayal betrayal betrayal betrayal betrayal betrayal betrayal betrayal betrayal
`;
      const normalScene = (i: number) => `INT. SC${i} - DAY\nA scene.\n`;
      const fountain = normalScene(0) + '\n' + heavyFountainBlock + '\n' +
        Array.from({ length: 4 }, (_, i) => normalScene(i + 2)).join('\n');
      const records = [
        makeRec(0),
        // dialogue highlights also repeat the keyword so total > 6 and > 3x avg
        makeRec(1, { dialogueHighlights: ['alice: betrayal betrayal betrayal betrayal betrayal'] }),
        makeRec(2), makeRec(3), makeRec(4), makeRec(5),
      ];
      const result = await themePass({
        fountain, original: fountain,
        records: records as any, structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'betrayal destroys trust' },
      });
      const heavy = result.issues.filter(i => i.rule === 'THEME_HEAVY_HANDED');
      assert.ok(heavy.length >= 1, 'Should detect THEME_HEAVY_HANDED when scene repeats theme words far above average');
      assert.ok(heavy[0].severity === 'major');
    });

    it('themePass detects THEME_NO_DIALECTIC when all resonant scenes are positive', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // All resonant scenes are emotionally neutral/positive — theme is never challenged
      const fountain = Array.from({ length: 6 }, (_, i) => `INT. SC${i} - DAY\ntruth honesty trust\n`).join('\n');
      const records = [
        makeRec(0, { emotionalShift: 'positive', suspenseDelta: 1.5, dialogueHighlights: ['alice: truth matters'] }),
        makeRec(1, { emotionalShift: 'positive', suspenseDelta: 1.0, dialogueHighlights: ['bob: honesty wins'] }),
        makeRec(2, { emotionalShift: 'neutral',  suspenseDelta: 0.5, dialogueHighlights: ['charlie: trust each other'] }),
        makeRec(3, { emotionalShift: 'positive', suspenseDelta: 1.5, dialogueHighlights: ['alice: truth sets free'] }),
        makeRec(4, { emotionalShift: 'positive', suspenseDelta: 1.0, dialogueHighlights: ['bob: honest always'] }),
        makeRec(5, { emotionalShift: 'neutral',  suspenseDelta: 0.5, dialogueHighlights: ['charlie: trust builds'] }),
      ];
      const result = await themePass({
        fountain, original: fountain,
        records: records as any, structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'truth sets you free' },
      });
      const dialectic = result.issues.filter(i => i.rule === 'THEME_NO_DIALECTIC');
      assert.ok(dialectic.length >= 1, 'Should detect THEME_NO_DIALECTIC when theme is never challenged');
      assert.ok(dialectic[0].severity === 'major');
    });

    it('themePass does NOT fire THEME_NO_DIALECTIC when a resonant scene has negative shift', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      const fountain = Array.from({ length: 6 }, (_, i) => `INT. SC${i} - DAY\ntruth honesty\n`).join('\n');
      const records = [
        makeRec(0, { emotionalShift: 'positive',  suspenseDelta: 1.5, dialogueHighlights: ['alice: truth matters'] }),
        makeRec(1, { emotionalShift: 'positive',  suspenseDelta: 1.0, dialogueHighlights: ['bob: honesty wins'] }),
        makeRec(2, { emotionalShift: 'negative',  suspenseDelta: -2.0, dialogueHighlights: ['charlie: truth costs everything'] }), // challenge
        makeRec(3, { emotionalShift: 'positive',  suspenseDelta: 1.5, dialogueHighlights: ['alice: truth sets free'] }),
        makeRec(4, { emotionalShift: 'positive',  suspenseDelta: 1.0, dialogueHighlights: ['bob: honest always'] }),
        makeRec(5, { emotionalShift: 'neutral',   suspenseDelta: 0.5, dialogueHighlights: ['charlie: trust builds'] }),
      ];
      const result = await themePass({
        fountain, original: fountain,
        records: records as any, structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'truth sets you free' },
      });
      const dialectic = result.issues.filter(i => i.rule === 'THEME_NO_DIALECTIC');
      assert.ok(dialectic.length === 0, 'Should NOT fire when theme has a challenging negative scene');
    });

    it('themePass detects THEME_FRONT_LOADED when theme fades after opening third', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // Opening: dense theme language. Rest: completely absent.
      const denseOpen = Array.from({ length: 2 }, (_, i) =>
        `INT. SC${i} - DAY\npower corruption power corrupts powerful corrupt corruption\n`,
      ).join('\n');
      const silentRest = Array.from({ length: 4 }, (_, i) =>
        `INT. SC${i + 2} - DAY\nA scene.\n`,
      ).join('\n');
      const fountain = denseOpen + '\n' + silentRest;
      const records = [
        makeRec(0, { dialogueHighlights: ['alice: power corrupts corrupt powerful corruption'] }),
        makeRec(1, { dialogueHighlights: ['bob: corrupt powerful power corruption corrupted'] }),
        makeRec(2), makeRec(3), makeRec(4), makeRec(5),
      ];
      const result = await themePass({
        fountain, original: fountain,
        records: records as any, structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'power corrupts absolutely' },
      });
      const frontLoaded = result.issues.filter(i => i.rule === 'THEME_FRONT_LOADED');
      assert.ok(frontLoaded.length >= 1, 'Should detect THEME_FRONT_LOADED when theme fades after opening');
      assert.ok(frontLoaded[0].severity === 'major');
    });

    it('themePass does NOT fire THEME_FRONT_LOADED when theme is distributed evenly', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // Theme language spread across all scenes
      const fountain = Array.from({ length: 6 }, (_, i) =>
        `INT. SC${i} - DAY\npower corruption\n`,
      ).join('\n');
      const records = Array.from({ length: 6 }, (_, i) =>
        makeRec(i, { dialogueHighlights: [`char: power corrupts`] }),
      );
      const result = await themePass({
        fountain, original: fountain,
        records: records as any, structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'power corrupts absolutely' },
      });
      const frontLoaded = result.issues.filter(i => i.rule === 'THEME_FRONT_LOADED');
      assert.ok(frontLoaded.length === 0, 'Should NOT fire when theme is evenly distributed');
    });
  });


  describe('Wave 174 — themePass: opening silence, single-keyword reliance, climax silence', async () => {
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
    const themeCtx = { theme: 'loyalty and betrayal define us', genre: 'drama' };
    const themeInput = (records: any[], n: number) => ({
      fountain: blankFountain(n), original: blankFountain(n),
      records: records as any, structure: {} as any, storyContext: themeCtx,
      annotations: [], approvedSpans: [],
    });

    // ── THEME_OPENING_SILENT ──────────────────────────────────────────────────
    it('themePass detects THEME_OPENING_SILENT when the first scenes lack theme language', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // 8 scenes: scenes 0-2 silent, scenes 3-7 carry the theme
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, { dialogueHighlights: i >= 3 ? ['alice: loyalty matters here'] : [] }),
      );
      const result = await themePass(themeInput(records, 8));
      const opening = result.issues.filter(i => i.rule === 'THEME_OPENING_SILENT');
      assert.ok(opening.length >= 1, `Should detect THEME_OPENING_SILENT; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(opening[0].severity === 'major');
    });

    it('themePass does NOT fire THEME_OPENING_SILENT when the opening plants the theme', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, { dialogueHighlights: ['alice: loyalty matters here'] }),
      );
      const result = await themePass(themeInput(records, 8));
      assert.ok(
        !result.issues.some(i => i.rule === 'THEME_OPENING_SILENT'),
        'Should NOT fire when the opening scenes carry the theme',
      );
    });

    // ── THEME_SINGLE_KEYWORD_RELIANCE ─────────────────────────────────────────
    it('themePass detects THEME_SINGLE_KEYWORD_RELIANCE when one keyword dominates', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // Only "betrayal" ever appears; "loyalty" and "define" never dramatized
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, { dialogueHighlights: i < 6 ? ['alice: betrayal again'] : [] }),
      );
      const result = await themePass(themeInput(records, 8));
      const reliance = result.issues.filter(i => i.rule === 'THEME_SINGLE_KEYWORD_RELIANCE');
      assert.ok(reliance.length >= 1, `Should detect THEME_SINGLE_KEYWORD_RELIANCE; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(reliance[0].severity === 'minor');
    });

    it('themePass does NOT fire THEME_SINGLE_KEYWORD_RELIANCE when keywords are balanced', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // Both "loyalty" and "betrayal" appear in roughly equal measure
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, {
          dialogueHighlights: i < 3 ? ['alice: loyalty matters']
            : i < 6 ? ['bob: betrayal stings'] : [],
        }),
      );
      const result = await themePass(themeInput(records, 8));
      assert.ok(
        !result.issues.some(i => i.rule === 'THEME_SINGLE_KEYWORD_RELIANCE'),
        'Should NOT fire when multiple theme keywords are dramatized',
      );
    });

    // ── THEME_CLIMAX_SCENE_SILENT ─────────────────────────────────────────────
    it('themePass detects THEME_CLIMAX_SCENE_SILENT when the peak scene lacks theme language', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // 8 scenes: 0-6 carry the theme; scene 7 is the peak (suspense 3) but silent
      const records = Array.from({ length: 8 }, (_, i) =>
        i === 7
          ? makeRec(i, { suspenseDelta: 3, dialogueHighlights: [] })
          : makeRec(i, { dialogueHighlights: ['alice: loyalty above all'] }),
      );
      const result = await themePass(themeInput(records, 8));
      const climax = result.issues.filter(i => i.rule === 'THEME_CLIMAX_SCENE_SILENT');
      assert.ok(climax.length >= 1, `Should detect THEME_CLIMAX_SCENE_SILENT; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(climax[0].severity === 'major');
    });

    it('themePass does NOT fire THEME_CLIMAX_SCENE_SILENT when the climax carries the theme', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      const records = Array.from({ length: 8 }, (_, i) =>
        i === 7
          ? makeRec(i, { suspenseDelta: 3, dialogueHighlights: ['alice: loyalty wins'] })
          : makeRec(i, { dialogueHighlights: ['alice: loyalty above all'] }),
      );
      const result = await themePass(themeInput(records, 8));
      assert.ok(
        !result.issues.some(i => i.rule === 'THEME_CLIMAX_SCENE_SILENT'),
        'Should NOT fire when the peak-suspense scene carries thematic language',
      );
    });
  });


  describe('Wave 223 — themePass: silent stretch, poles never costaged, resonance emotionally inert', async () => {
    const makeRec223 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput223 = (records: any[], fountain: string) => ({
      fountain, original: fountain,
      records: records as any, structure: {} as any,
      storyContext: { theme: 'trust and betrayal' } as any,
      annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('themePass detects THEME_SILENT_STRETCH when a long consecutive run of theme-silent scenes exceeds the threshold', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // Scenes 0-1 resonant (trust), scenes 2-8 silent (7-scene run), scenes 9-11 resonant
      // threshold = max(4, floor(12*0.25)) = 4; maxRun = 7 > 4 → fires
      const resonantText = (i: number) => `INT. SC${i} - DAY\ntrust holds the alliance.\n`;
      const silentText   = (i: number) => `INT. SC${i} - DAY\nA quiet morning. Nothing unusual.\n`;
      const fountain223a = [
        resonantText(0), resonantText(1),
        silentText(2), silentText(3), silentText(4), silentText(5), silentText(6), silentText(7), silentText(8),
        resonantText(9), resonantText(10), resonantText(11),
      ].join('\n');
      const records223a = [
        makeRec223(0, { emotionalShift: 'positive', suspenseDelta: 1 }),
        makeRec223(1, { emotionalShift: 'negative', suspenseDelta: -2 }),
        ...Array.from({ length: 7 }, (_, k) => makeRec223(k + 2)),
        makeRec223(9,  { emotionalShift: 'positive' }),
        makeRec223(10, { emotionalShift: 'neutral' }),
        makeRec223(11, { emotionalShift: 'neutral' }),
      ];
      const result223a = await themePass(makeInput223(records223a, fountain223a));
      const stretch = result223a.issues.filter(i => i.rule === 'THEME_SILENT_STRETCH');
      assert.ok(stretch.length >= 1, 'Should detect THEME_SILENT_STRETCH with a 7-scene theme-silent run in a 12-scene story');
      assert.strictEqual(stretch[0].severity, 'major');
    });

    it('themePass does NOT fire THEME_SILENT_STRETCH when theme-silent scenes are evenly distributed', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // Alternating resonant/silent: max run = 1 ≤ threshold(4) → no fire
      const makeScene223 = (i: number, resonant: boolean) =>
        `INT. SC${i} - DAY\n${resonant ? 'trust holds.' : 'A quiet day.'}\n`;
      const fountain223b = Array.from({ length: 12 }, (_, i) => makeScene223(i, i % 2 === 0)).join('\n');
      const records223b = Array.from({ length: 12 }, (_, i) =>
        makeRec223(i, i % 2 === 0 ? { emotionalShift: 'positive', suspenseDelta: 1 } : {}),
      );
      // ensure one negative resonant scene to suppress THEME_NO_DIALECTIC
      records223b[2] = makeRec223(2, { emotionalShift: 'negative', suspenseDelta: -2 });
      const result223b = await themePass(makeInput223(records223b, fountain223b));
      const stretch = result223b.issues.filter(i => i.rule === 'THEME_SILENT_STRETCH');
      assert.strictEqual(stretch.length, 0, 'Should NOT fire THEME_SILENT_STRETCH when silent runs are only 1 scene long');
    });

    it('themePass detects THEME_POLES_NEVER_COSTAGED when no scene contains both thematic poles simultaneously', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // 6 scenes: odd scenes have 'trust', even scenes have 'betrayal' — no co-occurrence
      const makeScene223p = (i: number) =>
        `INT. SC${i} - DAY\n${i % 2 === 0 ? 'trust in each other.' : 'betrayal complete.'}\n`;
      const fountain223c = Array.from({ length: 6 }, (_, i) => makeScene223p(i)).join('\n');
      const records223c = [
        makeRec223(0, { emotionalShift: 'positive', suspenseDelta: 1 }),
        makeRec223(1, { emotionalShift: 'negative', suspenseDelta: -2 }),
        makeRec223(2, { emotionalShift: 'neutral' }),
        makeRec223(3, { emotionalShift: 'neutral' }),
        makeRec223(4, { emotionalShift: 'positive' }),
        makeRec223(5, { emotionalShift: 'neutral' }),
      ];
      const result223c = await themePass(makeInput223(records223c, fountain223c));
      const poles = result223c.issues.filter(i => i.rule === 'THEME_POLES_NEVER_COSTAGED');
      assert.ok(poles.length >= 1, 'Should detect THEME_POLES_NEVER_COSTAGED when poles never share a scene');
      assert.strictEqual(poles[0].severity, 'minor');
    });

    it('themePass does NOT fire THEME_POLES_NEVER_COSTAGED when at least one scene contains both thematic poles', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // Scene 0 has both 'trust' and 'betrayal' — poles costaged
      const makeScene223q = (i: number) =>
        i === 0
          ? `INT. SC${i} - DAY\ntrust shatters under betrayal.\n`
          : `INT. SC${i} - DAY\n${i % 2 === 0 ? 'trust endures.' : 'betrayal resurfaces.'}\n`;
      const fountain223d = Array.from({ length: 6 }, (_, i) => makeScene223q(i)).join('\n');
      const records223d = [
        makeRec223(0, { emotionalShift: 'negative', suspenseDelta: -2 }),
        makeRec223(1, { emotionalShift: 'positive' }),
        makeRec223(2, { emotionalShift: 'neutral' }),
        makeRec223(3, { emotionalShift: 'neutral' }),
        makeRec223(4, { emotionalShift: 'positive' }),
        makeRec223(5, { emotionalShift: 'neutral' }),
      ];
      const result223d = await themePass(makeInput223(records223d, fountain223d));
      const poles = result223d.issues.filter(i => i.rule === 'THEME_POLES_NEVER_COSTAGED');
      assert.strictEqual(poles.length, 0, 'Should NOT fire THEME_POLES_NEVER_COSTAGED when a scene stages both poles');
    });

    it('themePass detects THEME_RESONANCE_EMOTIONALLY_INERT when all resonant scenes carry flat emotional charge', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // 5 resonant scenes all emotionally flat (neutral shift, zero suspense)
      const fountain223e = Array.from({ length: 5 }, (_, i) => `INT. SC${i} - DAY\ntrust endures.\n`).join('\n');
      const records223e = Array.from({ length: 5 }, (_, i) =>
        makeRec223(i, { emotionalShift: 'neutral', suspenseDelta: 0 }),
      );
      const result223e = await themePass(makeInput223(records223e, fountain223e));
      const inert = result223e.issues.filter(i => i.rule === 'THEME_RESONANCE_EMOTIONALLY_INERT');
      assert.ok(inert.length >= 1, 'Should detect THEME_RESONANCE_EMOTIONALLY_INERT when all resonant scenes are emotionally flat');
      assert.strictEqual(inert[0].severity, 'minor');
    });

    it('themePass does NOT fire THEME_RESONANCE_EMOTIONALLY_INERT when at least one resonant scene carries emotional stakes', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // Scene 2 has suspenseDelta=2 — theme coincides with rising tension
      const fountain223f = Array.from({ length: 5 }, (_, i) => `INT. SC${i} - DAY\ntrust endures.\n`).join('\n');
      const records223f = [
        makeRec223(0, { emotionalShift: 'neutral', suspenseDelta: 0 }),
        makeRec223(1, { emotionalShift: 'neutral', suspenseDelta: 0 }),
        makeRec223(2, { emotionalShift: 'neutral', suspenseDelta: 2 }), // stakes here
        makeRec223(3, { emotionalShift: 'neutral', suspenseDelta: 0 }),
        makeRec223(4, { emotionalShift: 'negative', suspenseDelta: -2 }),
      ];
      const result223f = await themePass(makeInput223(records223f, fountain223f));
      const inert = result223f.issues.filter(i => i.rule === 'THEME_RESONANCE_EMOTIONALLY_INERT');
      assert.strictEqual(inert.length, 0, 'Should NOT fire THEME_RESONANCE_EMOTIONALLY_INERT when a resonant scene has rising tension');
    });
  });


  describe('Wave 1102 — themePass: theme staging-repeat aftermath void, theme payoff-curiosity aftermath void, theme clock-suspense aftermath void', async () => {
    const runT1102 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('THEME_STAGING_REPEAT_AFTERMATH_VOID fires when every heavily-staged scene is followed by two scenes with no further heavily-staged scene', async () => {
      const recs1102a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { visualBeats: ['beat one', 'beat two'] });
        if (i === 8 || i === 9) return makeSharedRecord(i, { visualBeats: ['beat three', 'beat four'] });
        return makeSharedRecord(i);
      });
      const res = await runT1102(recs1102a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_STAGING_REPEAT_AFTERMATH_VOID'), 'THEME_STAGING_REPEAT_AFTERMATH_VOID should fire');
    });

    it('THEME_STAGING_REPEAT_AFTERMATH_VOID does not fire when a heavily-staged scene is followed by another heavily-staged scene within its window', async () => {
      const recs1102an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { visualBeats: ['beat one', 'beat two'] });
        if (i === 1 || i === 9) return makeSharedRecord(i, { visualBeats: ['beat three', 'beat four'] });
        return makeSharedRecord(i);
      });
      const res = await runT1102(recs1102an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_STAGING_REPEAT_AFTERMATH_VOID'), 'THEME_STAGING_REPEAT_AFTERMATH_VOID should not fire');
    });

    it('THEME_PAYOFF_CURIOSITY_AFTERMATH_VOID fires when every payoff is followed by two scenes with no curiosity rise', async () => {
      const recs1102b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { payoffSetupIds: ['p1'] });
        if (i === 8 || i === 9) return makeSharedRecord(i, { curiosityDelta: 1 });
        return makeSharedRecord(i);
      });
      const res = await runT1102(recs1102b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_PAYOFF_CURIOSITY_AFTERMATH_VOID'), 'THEME_PAYOFF_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('THEME_PAYOFF_CURIOSITY_AFTERMATH_VOID does not fire when a payoff is followed by a curiosity rise within its window', async () => {
      const recs1102bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { payoffSetupIds: ['p1'] });
        if (i === 1 || i === 9) return makeSharedRecord(i, { curiosityDelta: 1 });
        return makeSharedRecord(i);
      });
      const res = await runT1102(recs1102bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_PAYOFF_CURIOSITY_AFTERMATH_VOID'), 'THEME_PAYOFF_CURIOSITY_AFTERMATH_VOID should not fire');
    });

    it('THEME_CLOCK_SUSPENSE_AFTERMATH_VOID fires when every clock-raise is followed by two scenes with no suspense rise', async () => {
      const recs1102c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { clockRaised: true });
        if (i === 8 || i === 9) return makeSharedRecord(i, { suspenseDelta: 1 });
        return makeSharedRecord(i);
      });
      const res = await runT1102(recs1102c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_CLOCK_SUSPENSE_AFTERMATH_VOID'), 'THEME_CLOCK_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('THEME_CLOCK_SUSPENSE_AFTERMATH_VOID does not fire when a clock-raise is followed by a suspense rise within its window', async () => {
      const recs1102cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { clockRaised: true });
        if (i === 1 || i === 9) return makeSharedRecord(i, { suspenseDelta: 1 });
        return makeSharedRecord(i);
      });
      const res = await runT1102(recs1102cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_CLOCK_SUSPENSE_AFTERMATH_VOID'), 'THEME_CLOCK_SUSPENSE_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1088 — themePass: theme open-thread-staging aftermath void, theme staged-dialogue-highlight aftermath void, theme staged-relational aftermath void', async () => {
    const runT1088 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('THEME_OPEN_THREAD_STAGING_AFTERMATH_VOID fires when every open-thread scene is followed by two scenes with no heavily-staged scene', async () => {
      const recs1088a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { unresolvedClues: ['c1'] });
        if (i === 8 || i === 9) return makeSharedRecord(i, { visualBeats: ['beat one', 'beat two'] });
        return makeSharedRecord(i);
      });
      const res = await runT1088(recs1088a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_OPEN_THREAD_STAGING_AFTERMATH_VOID'), 'THEME_OPEN_THREAD_STAGING_AFTERMATH_VOID should fire');
    });

    it('THEME_OPEN_THREAD_STAGING_AFTERMATH_VOID does not fire when an open-thread scene is followed by a heavily-staged scene within its window', async () => {
      const recs1088an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { unresolvedClues: ['c1'] });
        if (i === 1 || i === 9) return makeSharedRecord(i, { visualBeats: ['beat one', 'beat two'] });
        return makeSharedRecord(i);
      });
      const res = await runT1088(recs1088an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_OPEN_THREAD_STAGING_AFTERMATH_VOID'), 'THEME_OPEN_THREAD_STAGING_AFTERMATH_VOID should not fire');
    });

    it('THEME_STAGED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when every heavily-staged scene is followed by two scenes with no highlighted dialogue', async () => {
      const recs1088b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { visualBeats: ['beat one', 'beat two'] });
        if (i === 8 || i === 9) return makeSharedRecord(i, { dialogueHighlights: ['a memorable line'] });
        return makeSharedRecord(i);
      });
      const res = await runT1088(recs1088b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_STAGED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'THEME_STAGED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    it('THEME_STAGED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a heavily-staged scene is followed by highlighted dialogue within its window', async () => {
      const recs1088bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { visualBeats: ['beat one', 'beat two'] });
        if (i === 1 || i === 9) return makeSharedRecord(i, { dialogueHighlights: ['a memorable line'] });
        return makeSharedRecord(i);
      });
      const res = await runT1088(recs1088bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_STAGED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'THEME_STAGED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });

    it('THEME_STAGED_RELATIONAL_AFTERMATH_VOID fires when every heavily-staged scene is followed by two scenes with no relationship shift', async () => {
      const recs1088c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { visualBeats: ['beat one', 'beat two'] });
        if (i === 8 || i === 9) return makeSharedRecord(i, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
        return makeSharedRecord(i);
      });
      const res = await runT1088(recs1088c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_STAGED_RELATIONAL_AFTERMATH_VOID'), 'THEME_STAGED_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('THEME_STAGED_RELATIONAL_AFTERMATH_VOID does not fire when a heavily-staged scene is followed by a relationship shift within its window', async () => {
      const recs1088cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { visualBeats: ['beat one', 'beat two'] });
        if (i === 1 || i === 9) return makeSharedRecord(i, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
        return makeSharedRecord(i);
      });
      const res = await runT1088(recs1088cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_STAGED_RELATIONAL_AFTERMATH_VOID'), 'THEME_STAGED_RELATIONAL_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1074 — themePass: theme stakes-staging aftermath void, theme seed-staging aftermath void, theme open-thread-dialogue-highlight aftermath void', async () => {
    const runT1074 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('THEME_STAKES_STAGING_AFTERMATH_VOID fires when every stakes-raise is followed by two scenes with no visually dense scene', async () => {
      const recs1074a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { purpose: 'raise_stakes' });
        if (i === 8 || i === 9) return makeSharedRecord(i, { visualBeats: ['beat one', 'beat two'] });
        return makeSharedRecord(i);
      });
      const res = await runT1074(recs1074a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_STAKES_STAGING_AFTERMATH_VOID'), 'THEME_STAKES_STAGING_AFTERMATH_VOID should fire');
    });

    it('THEME_STAKES_STAGING_AFTERMATH_VOID does not fire when a stakes-raise is followed by a visually dense scene within its window', async () => {
      const recs1074an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { purpose: 'raise_stakes' });
        if (i === 1 || i === 9) return makeSharedRecord(i, { visualBeats: ['beat one', 'beat two'] });
        return makeSharedRecord(i);
      });
      const res = await runT1074(recs1074an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_STAKES_STAGING_AFTERMATH_VOID'), 'THEME_STAKES_STAGING_AFTERMATH_VOID should not fire');
    });

    it('THEME_SEED_STAGING_AFTERMATH_VOID fires when every seed is followed by two scenes with no visually dense scene', async () => {
      const recs1074b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { seededClueIds: ['c1'] });
        if (i === 8 || i === 9) return makeSharedRecord(i, { visualBeats: ['beat one', 'beat two'] });
        return makeSharedRecord(i);
      });
      const res = await runT1074(recs1074b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_SEED_STAGING_AFTERMATH_VOID'), 'THEME_SEED_STAGING_AFTERMATH_VOID should fire');
    });

    it('THEME_SEED_STAGING_AFTERMATH_VOID does not fire when a seed is followed by a visually dense scene within its window', async () => {
      const recs1074bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { seededClueIds: ['c1'] });
        if (i === 1 || i === 9) return makeSharedRecord(i, { visualBeats: ['beat one', 'beat two'] });
        return makeSharedRecord(i);
      });
      const res = await runT1074(recs1074bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_SEED_STAGING_AFTERMATH_VOID'), 'THEME_SEED_STAGING_AFTERMATH_VOID should not fire');
    });

    it('THEME_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when every open-thread scene is followed by two scenes with no highlighted dialogue', async () => {
      const recs1074c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { unresolvedClues: ['c1'] });
        if (i === 8 || i === 9) return makeSharedRecord(i, { dialogueHighlights: ['a memorable line'] });
        return makeSharedRecord(i);
      });
      const res = await runT1074(recs1074c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'THEME_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    it('THEME_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when an open-thread scene is followed by highlighted dialogue within its window', async () => {
      const recs1074cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { unresolvedClues: ['c1'] });
        if (i === 1 || i === 9) return makeSharedRecord(i, { dialogueHighlights: ['a memorable line'] });
        return makeSharedRecord(i);
      });
      const res = await runT1074(recs1074cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'THEME_OPEN_THREAD_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1060 — themePass: theme seed-suspense aftermath void, theme stakes-dialogue-highlight aftermath void, theme staging-suspense aftermath void', async () => {
    const runT1060 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('THEME_SEED_SUSPENSE_AFTERMATH_VOID fires when every seed is followed by two scenes with no suspense rise', async () => {
      const recs1060a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { seededClueIds: ['c1'] });
        if (i === 8 || i === 9) return makeSharedRecord(i, { suspenseDelta: 1 });
        return makeSharedRecord(i);
      });
      const res = await runT1060(recs1060a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_SEED_SUSPENSE_AFTERMATH_VOID'), 'THEME_SEED_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('THEME_SEED_SUSPENSE_AFTERMATH_VOID does not fire when a seed is followed by a suspense rise within its window', async () => {
      const recs1060an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { seededClueIds: ['c1'] });
        if (i === 1 || i === 9) return makeSharedRecord(i, { suspenseDelta: 1 });
        return makeSharedRecord(i);
      });
      const res = await runT1060(recs1060an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_SEED_SUSPENSE_AFTERMATH_VOID'), 'THEME_SEED_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    it('THEME_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when every stakes-raise is followed by two scenes with no highlighted dialogue', async () => {
      const recs1060b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { purpose: 'raise_stakes' });
        if (i === 8 || i === 9) return makeSharedRecord(i, { dialogueHighlights: ['a memorable line'] });
        return makeSharedRecord(i);
      });
      const res = await runT1060(recs1060b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'THEME_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    it('THEME_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a stakes-raise is followed by highlighted dialogue within its window', async () => {
      const recs1060bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { purpose: 'raise_stakes' });
        if (i === 1 || i === 9) return makeSharedRecord(i, { dialogueHighlights: ['a memorable line'] });
        return makeSharedRecord(i);
      });
      const res = await runT1060(recs1060bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'THEME_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });

    it('THEME_STAGING_SUSPENSE_AFTERMATH_VOID fires when every staged scene is followed by two scenes with no suspense rise', async () => {
      const recs1060c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { visualBeats: ['beat one', 'beat two'] });
        if (i === 8 || i === 9) return makeSharedRecord(i, { suspenseDelta: 1 });
        return makeSharedRecord(i);
      });
      const res = await runT1060(recs1060c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_STAGING_SUSPENSE_AFTERMATH_VOID'), 'THEME_STAGING_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('THEME_STAGING_SUSPENSE_AFTERMATH_VOID does not fire when a staged scene is followed by a suspense rise within its window', async () => {
      const recs1060cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { visualBeats: ['beat one', 'beat two'] });
        if (i === 1 || i === 9) return makeSharedRecord(i, { suspenseDelta: 1 });
        return makeSharedRecord(i);
      });
      const res = await runT1060(recs1060cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_STAGING_SUSPENSE_AFTERMATH_VOID'), 'THEME_STAGING_SUSPENSE_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1046 — themePass: theme open-thread-suspense aftermath void, theme open-thread-relational aftermath void, theme staging-emotional aftermath void', async () => {
    const runT1046 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('THEME_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID fires when every open-thread scene is followed by two scenes with no suspense rise', async () => {
      const recs1046a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { unresolvedClues: ['c1'] });
        if (i === 8 || i === 9) return makeSharedRecord(i, { suspenseDelta: 1 });
        return makeSharedRecord(i);
      });
      const res = await runT1046(recs1046a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID'), 'THEME_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('THEME_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID does not fire when an open-thread scene is followed by a suspense rise within its window', async () => {
      const recs1046an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { unresolvedClues: ['c1'] });
        if (i === 1 || i === 9) return makeSharedRecord(i, { suspenseDelta: 1 });
        return makeSharedRecord(i);
      });
      const res = await runT1046(recs1046an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID'), 'THEME_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    it('THEME_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID fires when every open-thread scene is followed by two scenes with no relationship shift', async () => {
      const recs1046b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { unresolvedClues: ['c1'] });
        if (i === 8 || i === 9) return makeSharedRecord(i, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
        return makeSharedRecord(i);
      });
      const res = await runT1046(recs1046b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID'), 'THEME_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('THEME_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID does not fire when an open-thread scene is followed by a relationship shift within its window', async () => {
      const recs1046bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { unresolvedClues: ['c1'] });
        if (i === 1 || i === 9) return makeSharedRecord(i, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
        return makeSharedRecord(i);
      });
      const res = await runT1046(recs1046bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID'), 'THEME_OPEN_THREAD_RELATIONAL_AFTERMATH_VOID should not fire');
    });

    it('THEME_STAGING_EMOTIONAL_AFTERMATH_VOID fires when every heavily-staged scene is followed by two scenes with no emotional shift', async () => {
      const recs1046c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { visualBeats: ['beat1', 'beat2'] });
        if (i === 8 || i === 9) return makeSharedRecord(i, { emotionalShift: 'positive' });
        return makeSharedRecord(i);
      });
      const res = await runT1046(recs1046c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_STAGING_EMOTIONAL_AFTERMATH_VOID'), 'THEME_STAGING_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('THEME_STAGING_EMOTIONAL_AFTERMATH_VOID does not fire when a heavily-staged scene is followed by an emotional shift within its window', async () => {
      const recs1046cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { visualBeats: ['beat1', 'beat2'] });
        if (i === 1 || i === 9) return makeSharedRecord(i, { emotionalShift: 'positive' });
        return makeSharedRecord(i);
      });
      const res = await runT1046(recs1046cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_STAGING_EMOTIONAL_AFTERMATH_VOID'), 'THEME_STAGING_EMOTIONAL_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1032 — themePass: theme stakes-relational aftermath void, theme seed-emotional aftermath void, theme open-thread-curiosity aftermath void', async () => {
    const runT1032 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('THEME_STAKES_RELATIONAL_AFTERMATH_VOID fires when every stakes-raise is followed by two scenes with no relationship shift', async () => {
      const recs1032a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { purpose: 'raise_stakes' });
        if (i === 8 || i === 9) return makeSharedRecord(i, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
        return makeSharedRecord(i);
      });
      const res = await runT1032(recs1032a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_STAKES_RELATIONAL_AFTERMATH_VOID'), 'THEME_STAKES_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('THEME_STAKES_RELATIONAL_AFTERMATH_VOID does not fire when a stakes-raise is followed by a relationship shift within its window', async () => {
      const recs1032an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { purpose: 'raise_stakes' });
        if (i === 1 || i === 9) return makeSharedRecord(i, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
        return makeSharedRecord(i);
      });
      const res = await runT1032(recs1032an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_STAKES_RELATIONAL_AFTERMATH_VOID'), 'THEME_STAKES_RELATIONAL_AFTERMATH_VOID should not fire');
    });

    it('THEME_SEED_EMOTIONAL_AFTERMATH_VOID fires when every seed is followed by two scenes with no emotional shift', async () => {
      const recs1032b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { seededClueIds: ['c1'] });
        if (i === 8 || i === 9) return makeSharedRecord(i, { emotionalShift: 'positive' });
        return makeSharedRecord(i);
      });
      const res = await runT1032(recs1032b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_SEED_EMOTIONAL_AFTERMATH_VOID'), 'THEME_SEED_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('THEME_SEED_EMOTIONAL_AFTERMATH_VOID does not fire when a seed is followed by an emotional shift within its window', async () => {
      const recs1032bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { seededClueIds: ['c1'] });
        if (i === 1 || i === 9) return makeSharedRecord(i, { emotionalShift: 'positive' });
        return makeSharedRecord(i);
      });
      const res = await runT1032(recs1032bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_SEED_EMOTIONAL_AFTERMATH_VOID'), 'THEME_SEED_EMOTIONAL_AFTERMATH_VOID should not fire');
    });

    it('THEME_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID fires when every open-thread scene is followed by two scenes with no curiosity rise', async () => {
      const recs1032c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { unresolvedClues: ['c1'] });
        if (i === 8 || i === 9) return makeSharedRecord(i, { curiosityDelta: 1 });
        return makeSharedRecord(i);
      });
      const res = await runT1032(recs1032c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID'), 'THEME_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('THEME_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID does not fire when an open-thread scene is followed by a curiosity rise within its window', async () => {
      const recs1032cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { unresolvedClues: ['c1'] });
        if (i === 1 || i === 9) return makeSharedRecord(i, { curiosityDelta: 1 });
        return makeSharedRecord(i);
      });
      const res = await runT1032(recs1032cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID'), 'THEME_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1018 — themePass: theme stakes-emotional aftermath void, theme seed-relational aftermath void, theme staging-curiosity aftermath void', async () => {
    const runT1018 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('THEME_STAKES_EMOTIONAL_AFTERMATH_VOID fires when every stakes-raise is followed by two scenes with no emotional shift', async () => {
      const recs1018a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { purpose: 'raise_stakes' });
        if (i === 8 || i === 9) return makeSharedRecord(i, { emotionalShift: 'positive' });
        return makeSharedRecord(i);
      });
      const res = await runT1018(recs1018a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_STAKES_EMOTIONAL_AFTERMATH_VOID'), 'THEME_STAKES_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('THEME_STAKES_EMOTIONAL_AFTERMATH_VOID does not fire when a stakes-raise is followed by an emotional shift within its window', async () => {
      const recs1018an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { purpose: 'raise_stakes' });
        if (i === 1 || i === 9) return makeSharedRecord(i, { emotionalShift: 'positive' });
        return makeSharedRecord(i);
      });
      const res = await runT1018(recs1018an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_STAKES_EMOTIONAL_AFTERMATH_VOID'), 'THEME_STAKES_EMOTIONAL_AFTERMATH_VOID should not fire');
    });

    it('THEME_SEED_RELATIONAL_AFTERMATH_VOID fires when every seed is followed by two scenes with no relationship shift', async () => {
      const recs1018b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { seededClueIds: ['c1'] });
        if (i === 8 || i === 9) return makeSharedRecord(i, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
        return makeSharedRecord(i);
      });
      const res = await runT1018(recs1018b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_SEED_RELATIONAL_AFTERMATH_VOID'), 'THEME_SEED_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('THEME_SEED_RELATIONAL_AFTERMATH_VOID does not fire when a seed is followed by a relationship shift within its window', async () => {
      const recs1018bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { seededClueIds: ['c1'] });
        if (i === 1 || i === 9) return makeSharedRecord(i, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
        return makeSharedRecord(i);
      });
      const res = await runT1018(recs1018bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_SEED_RELATIONAL_AFTERMATH_VOID'), 'THEME_SEED_RELATIONAL_AFTERMATH_VOID should not fire');
    });

    it('THEME_STAGING_CURIOSITY_AFTERMATH_VOID fires when every visually-dense scene is followed by two scenes with no new curiosity', async () => {
      const recs1018c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { visualBeats: ['beat1', 'beat2'] });
        if (i === 8 || i === 9) return makeSharedRecord(i, { curiosityDelta: 1 });
        return makeSharedRecord(i);
      });
      const res = await runT1018(recs1018c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_STAGING_CURIOSITY_AFTERMATH_VOID'), 'THEME_STAGING_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('THEME_STAGING_CURIOSITY_AFTERMATH_VOID does not fire when a visually-dense scene is followed by new curiosity within its window', async () => {
      const recs1018cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { visualBeats: ['beat1', 'beat2'] });
        if (i === 1 || i === 9) return makeSharedRecord(i, { curiosityDelta: 1 });
        return makeSharedRecord(i);
      });
      const res = await runT1018(recs1018cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_STAGING_CURIOSITY_AFTERMATH_VOID'), 'THEME_STAGING_CURIOSITY_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1004 — themePass: theme stakes-suspense aftermath void, theme seed-curiosity aftermath void, theme open-thread-emotional aftermath void', async () => {
    const runT1004 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: aftermath signal placed only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: aftermath at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('THEME_STAKES_SUSPENSE_AFTERMATH_VOID fires when every stakes-raise is followed by two scenes with no rise in suspense', async () => {
      const recs1004a = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { purpose: 'raise_stakes' });
        if (i === 8 || i === 9) return makeSharedRecord(i, { suspenseDelta: 1 });
        return makeSharedRecord(i);
      });
      const res = await runT1004(recs1004a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_STAKES_SUSPENSE_AFTERMATH_VOID'), 'THEME_STAKES_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('THEME_STAKES_SUSPENSE_AFTERMATH_VOID does not fire when a stakes-raise is followed by rising suspense within its window', async () => {
      const recs1004an = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { purpose: 'raise_stakes' });
        if (i === 1 || i === 9) return makeSharedRecord(i, { suspenseDelta: 1 });
        return makeSharedRecord(i);
      });
      const res = await runT1004(recs1004an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_STAKES_SUSPENSE_AFTERMATH_VOID'), 'THEME_STAKES_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    it('THEME_SEED_CURIOSITY_AFTERMATH_VOID fires when every seed is followed by two scenes with no new curiosity', async () => {
      const recs1004b = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { seededClueIds: ['c1'] });
        if (i === 8 || i === 9) return makeSharedRecord(i, { curiosityDelta: 1 });
        return makeSharedRecord(i);
      });
      const res = await runT1004(recs1004b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_SEED_CURIOSITY_AFTERMATH_VOID'), 'THEME_SEED_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('THEME_SEED_CURIOSITY_AFTERMATH_VOID does not fire when a seed is followed by new curiosity within its window', async () => {
      const recs1004bn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { seededClueIds: ['c1'] });
        if (i === 1 || i === 9) return makeSharedRecord(i, { curiosityDelta: 1 });
        return makeSharedRecord(i);
      });
      const res = await runT1004(recs1004bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_SEED_CURIOSITY_AFTERMATH_VOID'), 'THEME_SEED_CURIOSITY_AFTERMATH_VOID should not fire');
    });

    it('THEME_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID fires when every open-thread scene is followed by two scenes with no emotional shift', async () => {
      const recs1004c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { unresolvedClues: ['c1'] });
        if (i === 8 || i === 9) return makeSharedRecord(i, { emotionalShift: 'positive' });
        return makeSharedRecord(i);
      });
      const res = await runT1004(recs1004c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID'), 'THEME_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('THEME_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID does not fire when an open-thread scene is followed by an emotional shift within its window', async () => {
      const recs1004cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { unresolvedClues: ['c1'] });
        if (i === 1 || i === 9) return makeSharedRecord(i, { emotionalShift: 'positive' });
        return makeSharedRecord(i);
      });
      const res = await runT1004(recs1004cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID'), 'THEME_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 990 — themePass: theme highlight zone imbalance, theme open thread zone imbalance, theme stakes-curiosity aftermath void', async () => {
    const runT990 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched → no-fire.
    it('THEME_HIGHLIGHT_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of highlighted-dialogue scenes', async () => {
      const recs990a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { dialogueHighlights: [0, 1, 2, 8, 9].includes(i) ? ['line'] : [] }));
      const res = await runT990(recs990a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_HIGHLIGHT_ZONE_IMBALANCE'), 'THEME_HIGHLIGHT_ZONE_IMBALANCE should fire');
    });

    it('THEME_HIGHLIGHT_ZONE_IMBALANCE does not fire when highlighted-dialogue scenes touch every zone', async () => {
      const recs990an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { dialogueHighlights: [0, 3, 5, 8].includes(i) ? ['line'] : [] }));
      const res = await runT990(recs990an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_HIGHLIGHT_ZONE_IMBALANCE'), 'THEME_HIGHLIGHT_ZONE_IMBALANCE should not fire');
    });

    it('THEME_OPEN_THREAD_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of open-thread scenes', async () => {
      const recs990b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { unresolvedClues: [0, 1, 2, 8, 9].includes(i) ? ['c1'] : [] }));
      const res = await runT990(recs990b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_OPEN_THREAD_ZONE_IMBALANCE'), 'THEME_OPEN_THREAD_ZONE_IMBALANCE should fire');
    });

    it('THEME_OPEN_THREAD_ZONE_IMBALANCE does not fire when open-thread scenes touch every zone', async () => {
      const recs990bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { unresolvedClues: [0, 3, 5, 8].includes(i) ? ['c1'] : [] }));
      const res = await runT990(recs990bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_OPEN_THREAD_ZONE_IMBALANCE'), 'THEME_OPEN_THREAD_ZONE_IMBALANCE should not fire');
    });

    // Aftermath geometry n=10, window=2: triggers at {0,3} (both have a full 2-scene lookahead).
    // FIRE: curiosity raised only at {8,9} — outside both trigger windows {1,2} and {4,5}.
    // NO-FIRE: curiosity raised at {1,9} — index 1 falls inside trigger 0's window, breaking voidness.
    it('THEME_STAKES_CURIOSITY_AFTERMATH_VOID fires when every stakes-raise is followed by two scenes with no new curiosity', async () => {
      const recs990c = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { purpose: 'raise_stakes' });
        if (i === 8 || i === 9) return makeSharedRecord(i, { curiosityDelta: 1 });
        return makeSharedRecord(i);
      });
      const res = await runT990(recs990c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_STAKES_CURIOSITY_AFTERMATH_VOID'), 'THEME_STAKES_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('THEME_STAKES_CURIOSITY_AFTERMATH_VOID does not fire when a stakes-raise is followed by new curiosity within its window', async () => {
      const recs990cn = Array.from({ length: 10 }, (_, i) => {
        if (i === 0 || i === 3) return makeSharedRecord(i, { purpose: 'raise_stakes' });
        if (i === 1 || i === 9) return makeSharedRecord(i, { curiosityDelta: 1 });
        return makeSharedRecord(i);
      });
      const res = await runT990(recs990cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_STAKES_CURIOSITY_AFTERMATH_VOID'), 'THEME_STAKES_CURIOSITY_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 976 — themePass: theme clock zone imbalance, theme clock delta zone imbalance, theme turn zone imbalance', async () => {
    const runT976 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched → no-fire.
    it('THEME_CLOCK_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of clock-raising scenes', async () => {
      const recs976a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { clockRaised: [0, 1, 2, 8, 9].includes(i) }));
      const res = await runT976(recs976a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_CLOCK_ZONE_IMBALANCE'), 'THEME_CLOCK_ZONE_IMBALANCE should fire');
    });

    it('THEME_CLOCK_ZONE_IMBALANCE does not fire when clock-raising scenes touch every zone', async () => {
      const recs976an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { clockRaised: [0, 3, 5, 8].includes(i) }));
      const res = await runT976(recs976an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_CLOCK_ZONE_IMBALANCE'), 'THEME_CLOCK_ZONE_IMBALANCE should not fire');
    });

    it('THEME_CLOCK_DELTA_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of clock-moving scenes', async () => {
      const recs976b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { clockDelta: [0, 1, 2, 8, 9].includes(i) ? 1 : 0 }));
      const res = await runT976(recs976b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_CLOCK_DELTA_ZONE_IMBALANCE'), 'THEME_CLOCK_DELTA_ZONE_IMBALANCE should fire');
    });

    it('THEME_CLOCK_DELTA_ZONE_IMBALANCE does not fire when clock-moving scenes touch every zone', async () => {
      const recs976bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { clockDelta: [0, 3, 5, 8].includes(i) ? 1 : 0 }));
      const res = await runT976(recs976bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_CLOCK_DELTA_ZONE_IMBALANCE'), 'THEME_CLOCK_DELTA_ZONE_IMBALANCE should not fire');
    });

    it('THEME_TURN_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of dramatic-turn scenes', async () => {
      const recs976c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { dramaticTurn: [0, 1, 2, 8, 9].includes(i) ? 'reversal' : 'nothing' }));
      const res = await runT976(recs976c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_TURN_ZONE_IMBALANCE'), 'THEME_TURN_ZONE_IMBALANCE should fire');
    });

    it('THEME_TURN_ZONE_IMBALANCE does not fire when dramatic-turn scenes touch every zone', async () => {
      const recs976cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { dramaticTurn: [0, 3, 5, 8].includes(i) ? 'reversal' : 'nothing' }));
      const res = await runT976(recs976cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_TURN_ZONE_IMBALANCE'), 'THEME_TURN_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 962 — themePass: theme curiosity zone imbalance, theme revelation zone imbalance, theme relationship zone imbalance', async () => {
    const runT962 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched → no-fire.
    it('THEME_CURIOSITY_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of curiosity-raising scenes', async () => {
      const recs962a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 1, 2, 8, 9].includes(i) ? 1 : 0 }));
      const res = await runT962(recs962a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_CURIOSITY_ZONE_IMBALANCE'), 'THEME_CURIOSITY_ZONE_IMBALANCE should fire');
    });

    it('THEME_CURIOSITY_ZONE_IMBALANCE does not fire when curiosity-raising scenes touch every zone', async () => {
      const recs962an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 3, 5, 8].includes(i) ? 1 : 0 }));
      const res = await runT962(recs962an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_CURIOSITY_ZONE_IMBALANCE'), 'THEME_CURIOSITY_ZONE_IMBALANCE should not fire');
    });

    it('THEME_REVELATION_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of revelation scenes', async () => {
      const recs962b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { revelation: [0, 1, 2, 8, 9].includes(i) ? 'a hidden truth surfaces' : null }));
      const res = await runT962(recs962b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_REVELATION_ZONE_IMBALANCE'), 'THEME_REVELATION_ZONE_IMBALANCE should fire');
    });

    it('THEME_REVELATION_ZONE_IMBALANCE does not fire when revelation scenes touch every zone', async () => {
      const recs962bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { revelation: [0, 3, 5, 8].includes(i) ? 'a hidden truth surfaces' : null }));
      const res = await runT962(recs962bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_REVELATION_ZONE_IMBALANCE'), 'THEME_REVELATION_ZONE_IMBALANCE should not fire');
    });

    it('THEME_RELATIONSHIP_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of relationship-shift scenes', async () => {
      const recs962c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { relationshipShifts: [0, 1, 2, 8, 9].includes(i) ? [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] : [] }));
      const res = await runT962(recs962c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_RELATIONSHIP_ZONE_IMBALANCE'), 'THEME_RELATIONSHIP_ZONE_IMBALANCE should fire');
    });

    it('THEME_RELATIONSHIP_ZONE_IMBALANCE does not fire when relationship-shift scenes touch every zone', async () => {
      const recs962cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { relationshipShifts: [0, 3, 5, 8].includes(i) ? [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] : [] }));
      const res = await runT962(recs962cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_RELATIONSHIP_ZONE_IMBALANCE'), 'THEME_RELATIONSHIP_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 948 — themePass: theme positive emotion zone imbalance, theme suspense zone imbalance, theme seed zone imbalance', async () => {
    const runT948 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched → no-fire.
    it('THEME_POSITIVE_EMOTION_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of positive-shift scenes', async () => {
      const recs948a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2, 8, 9].includes(i) ? 'positive' : 'neutral' }));
      const res = await runT948(recs948a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_POSITIVE_EMOTION_ZONE_IMBALANCE'), 'THEME_POSITIVE_EMOTION_ZONE_IMBALANCE should fire');
    });

    it('THEME_POSITIVE_EMOTION_ZONE_IMBALANCE does not fire when positive-shift scenes touch every zone', async () => {
      const recs948an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 3, 5, 8].includes(i) ? 'positive' : 'neutral' }));
      const res = await runT948(recs948an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_POSITIVE_EMOTION_ZONE_IMBALANCE'), 'THEME_POSITIVE_EMOTION_ZONE_IMBALANCE should not fire');
    });

    it('THEME_SUSPENSE_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of suspense-raising scenes', async () => {
      const recs948b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { suspenseDelta: [0, 1, 2, 8, 9].includes(i) ? 1 : 0 }));
      const res = await runT948(recs948b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_SUSPENSE_ZONE_IMBALANCE'), 'THEME_SUSPENSE_ZONE_IMBALANCE should fire');
    });

    it('THEME_SUSPENSE_ZONE_IMBALANCE does not fire when suspense-raising scenes touch every zone', async () => {
      const recs948bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { suspenseDelta: [0, 3, 5, 8].includes(i) ? 1 : 0 }));
      const res = await runT948(recs948bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_SUSPENSE_ZONE_IMBALANCE'), 'THEME_SUSPENSE_ZONE_IMBALANCE should not fire');
    });

    it('THEME_SEED_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of seeding scenes', async () => {
      const recs948c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { seededClueIds: [0, 1, 2, 8, 9].includes(i) ? ['c1'] : [] }));
      const res = await runT948(recs948c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_SEED_ZONE_IMBALANCE'), 'THEME_SEED_ZONE_IMBALANCE should fire');
    });

    it('THEME_SEED_ZONE_IMBALANCE does not fire when seeding scenes touch every zone', async () => {
      const recs948cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { seededClueIds: [0, 3, 5, 8].includes(i) ? ['c1'] : [] }));
      const res = await runT948(recs948cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_SEED_ZONE_IMBALANCE'), 'THEME_SEED_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 934 — themePass: theme stakes zone imbalance, theme revelation purpose zone imbalance, theme negative emotion zone imbalance', async () => {
    const runT934 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched → no-fire.
    it('THEME_STAKES_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of stakes-raising scenes', async () => {
      const recs934a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'raise_stakes' : 'establish_world' }));
      const res = await runT934(recs934a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_STAKES_ZONE_IMBALANCE'), 'THEME_STAKES_ZONE_IMBALANCE should fire');
    });

    it('THEME_STAKES_ZONE_IMBALANCE does not fire when stakes-raising scenes touch every zone', async () => {
      const recs934an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'raise_stakes' : 'establish_world' }));
      const res = await runT934(recs934an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_STAKES_ZONE_IMBALANCE'), 'THEME_STAKES_ZONE_IMBALANCE should not fire');
    });

    it('THEME_REVELATION_PURPOSE_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of revelation-purposed scenes', async () => {
      const recs934b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'revelation' : 'establish_world' }));
      const res = await runT934(recs934b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_REVELATION_PURPOSE_ZONE_IMBALANCE'), 'THEME_REVELATION_PURPOSE_ZONE_IMBALANCE should fire');
    });

    it('THEME_REVELATION_PURPOSE_ZONE_IMBALANCE does not fire when revelation-purposed scenes touch every zone', async () => {
      const recs934bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'revelation' : 'establish_world' }));
      const res = await runT934(recs934bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_REVELATION_PURPOSE_ZONE_IMBALANCE'), 'THEME_REVELATION_PURPOSE_ZONE_IMBALANCE should not fire');
    });

    it('THEME_NEGATIVE_EMOTION_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of negative-shift scenes', async () => {
      const recs934c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2, 8, 9].includes(i) ? 'negative' : 'neutral' }));
      const res = await runT934(recs934c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_NEGATIVE_EMOTION_ZONE_IMBALANCE'), 'THEME_NEGATIVE_EMOTION_ZONE_IMBALANCE should fire');
    });

    it('THEME_NEGATIVE_EMOTION_ZONE_IMBALANCE does not fire when negative-shift scenes touch every zone', async () => {
      const recs934cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 3, 5, 8].includes(i) ? 'negative' : 'neutral' }));
      const res = await runT934(recs934cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_NEGATIVE_EMOTION_ZONE_IMBALANCE'), 'THEME_NEGATIVE_EMOTION_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 920 — themePass: theme revelation purpose zone cluster, theme revelation purpose drought run, theme character moment zone imbalance', async () => {
    const runT920 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // THEME_REVELATION_PURPOSE_ZONE_CLUSTER fire: n=9, 3 thirds; revelation-purposed scenes at
    // 0,1,2 (opening third) → 3/3 = 100% > 75%. Filler 'establish_world'.
    it('THEME_REVELATION_PURPOSE_ZONE_CLUSTER fires when >75% of revelation-purposed scenes cluster in one third', async () => {
      const recs920a = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'revelation' : 'establish_world' }));
      const res = await runT920(recs920a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_REVELATION_PURPOSE_ZONE_CLUSTER'), 'THEME_REVELATION_PURPOSE_ZONE_CLUSTER should fire');
    });

    it('THEME_REVELATION_PURPOSE_ZONE_CLUSTER does not fire when revelation-purposed scenes spread across thirds', async () => {
      const recs920an = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'revelation' : 'establish_world' }));
      const res = await runT920(recs920an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_REVELATION_PURPOSE_ZONE_CLUSTER'), 'THEME_REVELATION_PURPOSE_ZONE_CLUSTER should not fire');
    });

    // THEME_REVELATION_PURPOSE_DROUGHT_RUN fire: n=10, revelation-purposed scenes at 0, 8, 9
    // (minPresentCount 3), leaving a 7-scene gap (indices 1-7) — run of 7 >= threshold 6.
    it('THEME_REVELATION_PURPOSE_DROUGHT_RUN fires when a long run has no revelation-purposed scene', async () => {
      const recs920b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 8, 9].includes(i) ? 'revelation' : 'establish_world' }));
      const res = await runT920(recs920b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_REVELATION_PURPOSE_DROUGHT_RUN'), 'THEME_REVELATION_PURPOSE_DROUGHT_RUN should fire');
    });

    it('THEME_REVELATION_PURPOSE_DROUGHT_RUN does not fire when revelation-purposed scenes are evenly spread', async () => {
      const recs920bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'revelation' : 'establish_world' }));
      const res = await runT920(recs920bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_REVELATION_PURPOSE_DROUGHT_RUN'), 'THEME_REVELATION_PURPOSE_DROUGHT_RUN should not fire');
    });

    // THEME_CHARACTER_MOMENT_ZONE_IMBALANCE fire: n=10, Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9};
    // character_moment at 0,1,2,8,9 → Z0 3/5=60% (bloat), Z1 and Z2 empty.
    it('THEME_CHARACTER_MOMENT_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of character-moment scenes', async () => {
      const recs920c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'character_moment' : 'establish_world' }));
      const res = await runT920(recs920c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_CHARACTER_MOMENT_ZONE_IMBALANCE'), 'THEME_CHARACTER_MOMENT_ZONE_IMBALANCE should fire');
    });

    it('THEME_CHARACTER_MOMENT_ZONE_IMBALANCE does not fire when character-moment scenes touch every zone', async () => {
      const recs920cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'character_moment' : 'establish_world' }));
      const res = await runT920(recs920cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_CHARACTER_MOMENT_ZONE_IMBALANCE'), 'THEME_CHARACTER_MOMENT_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 906 — themePass: theme turning point zone imbalance, theme introduce conflict zone imbalance, theme complicate zone imbalance', async () => {
    const runT906 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched →
    // no-fire. Filler is 'establish_world' (not one of the tested purpose values).
    it('THEME_TURNING_POINT_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of turning-point scenes', async () => {
      const recs906a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'turning_point' : 'establish_world' }),
      );
      const res = await runT906(recs906a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_TURNING_POINT_ZONE_IMBALANCE'), 'THEME_TURNING_POINT_ZONE_IMBALANCE should fire');
    });

    it('THEME_TURNING_POINT_ZONE_IMBALANCE does not fire when turning-point scenes touch every zone', async () => {
      const recs906an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'turning_point' : 'establish_world' }),
      );
      const res = await runT906(recs906an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_TURNING_POINT_ZONE_IMBALANCE'), 'THEME_TURNING_POINT_ZONE_IMBALANCE should not fire');
    });

    it('THEME_INTRODUCE_CONFLICT_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of conflict-introducing scenes', async () => {
      const recs906b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'introduce_conflict' : 'establish_world' }),
      );
      const res = await runT906(recs906b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_INTRODUCE_CONFLICT_ZONE_IMBALANCE'), 'THEME_INTRODUCE_CONFLICT_ZONE_IMBALANCE should fire');
    });

    it('THEME_INTRODUCE_CONFLICT_ZONE_IMBALANCE does not fire when conflict-introducing scenes touch every zone', async () => {
      const recs906bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'introduce_conflict' : 'establish_world' }),
      );
      const res = await runT906(recs906bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_INTRODUCE_CONFLICT_ZONE_IMBALANCE'), 'THEME_INTRODUCE_CONFLICT_ZONE_IMBALANCE should not fire');
    });

    it('THEME_COMPLICATE_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of complicating scenes', async () => {
      const recs906c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'complicate' : 'establish_world' }),
      );
      const res = await runT906(recs906c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_COMPLICATE_ZONE_IMBALANCE'), 'THEME_COMPLICATE_ZONE_IMBALANCE should fire');
    });

    it('THEME_COMPLICATE_ZONE_IMBALANCE does not fire when complicating scenes touch every zone', async () => {
      const recs906cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'complicate' : 'establish_world' }),
      );
      const res = await runT906(recs906cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_COMPLICATE_ZONE_IMBALANCE'), 'THEME_COMPLICATE_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 892 — themePass: theme climax zone imbalance, theme establish world zone imbalance, theme resolution zone imbalance', async () => {
    const runT892 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // THEME_CLIMAX_ZONE_IMBALANCE fire:
    // n=10, 4 zones (Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}); climax at 0,1,2,8,9 →
    // Z0 has 3/5=60% (bloat, >=50%), Z1 and Z2 are empty.
    it('THEME_CLIMAX_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of climax-purposed scenes', async () => {
      const recs892a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runT892(recs892a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_CLIMAX_ZONE_IMBALANCE'), 'THEME_CLIMAX_ZONE_IMBALANCE should fire');
    });

    it('THEME_CLIMAX_ZONE_IMBALANCE does not fire when climax-purposed scenes touch every zone', async () => {
      const recs892an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runT892(recs892an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_CLIMAX_ZONE_IMBALANCE'), 'THEME_CLIMAX_ZONE_IMBALANCE should not fire');
    });

    // THEME_ESTABLISH_WORLD_ZONE_IMBALANCE fire: same zone geometry as above.
    it('THEME_ESTABLISH_WORLD_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of world-establishing scenes', async () => {
      const recs892b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runT892(recs892b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_ESTABLISH_WORLD_ZONE_IMBALANCE'), 'THEME_ESTABLISH_WORLD_ZONE_IMBALANCE should fire');
    });

    it('THEME_ESTABLISH_WORLD_ZONE_IMBALANCE does not fire when world-establishing scenes touch every zone', async () => {
      const recs892bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runT892(recs892bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_ESTABLISH_WORLD_ZONE_IMBALANCE'), 'THEME_ESTABLISH_WORLD_ZONE_IMBALANCE should not fire');
    });

    // THEME_RESOLUTION_ZONE_IMBALANCE fire: same zone geometry as above.
    it('THEME_RESOLUTION_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of resolution-purposed scenes', async () => {
      const recs892c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'resolution' : 'complicate' }),
      );
      const res = await runT892(recs892c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_RESOLUTION_ZONE_IMBALANCE'), 'THEME_RESOLUTION_ZONE_IMBALANCE should fire');
    });

    it('THEME_RESOLUTION_ZONE_IMBALANCE does not fire when resolution-purposed scenes touch every zone', async () => {
      const recs892cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'resolution' : 'complicate' }),
      );
      const res = await runT892(recs892cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_RESOLUTION_ZONE_IMBALANCE'), 'THEME_RESOLUTION_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 878 — themePass: theme resolution drought run, theme complicate zone cluster, theme complicate drought run', async () => {
    const runT878 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // THEME_RESOLUTION_DROUGHT_RUN fire:
    // n=10; resolution at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('THEME_RESOLUTION_DROUGHT_RUN fires when a long run has no resolution-purposed scene', async () => {
      const recs878a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'resolution' : 'establish_world' }),
      );
      const res = await runT878(recs878a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_RESOLUTION_DROUGHT_RUN'), 'THEME_RESOLUTION_DROUGHT_RUN should fire');
    });

    it('THEME_RESOLUTION_DROUGHT_RUN does not fire when resolution-purposed scenes are evenly spread', async () => {
      const recs878an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'resolution' : 'establish_world' }),
      );
      const res = await runT878(recs878an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_RESOLUTION_DROUGHT_RUN'), 'THEME_RESOLUTION_DROUGHT_RUN should not fire');
    });

    // THEME_COMPLICATE_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; complicate scenes at 0,1,2 → 100% opening third
    it('THEME_COMPLICATE_ZONE_CLUSTER fires when >75% of complicating scenes cluster in one third', async () => {
      const recs878b = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'complicate' : 'establish_world' }),
      );
      const res = await runT878(recs878b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_COMPLICATE_ZONE_CLUSTER'), 'THEME_COMPLICATE_ZONE_CLUSTER should fire');
    });

    it('THEME_COMPLICATE_ZONE_CLUSTER does not fire when complicating scenes spread across thirds', async () => {
      const recs878bn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'complicate' : 'establish_world' }),
      );
      const res = await runT878(recs878bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_COMPLICATE_ZONE_CLUSTER'), 'THEME_COMPLICATE_ZONE_CLUSTER should not fire');
    });

    // THEME_COMPLICATE_DROUGHT_RUN fire:
    // n=10; complicate at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('THEME_COMPLICATE_DROUGHT_RUN fires when a long run has no complicating scene', async () => {
      const recs878c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'complicate' : 'establish_world' }),
      );
      const res = await runT878(recs878c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_COMPLICATE_DROUGHT_RUN'), 'THEME_COMPLICATE_DROUGHT_RUN should fire');
    });

    it('THEME_COMPLICATE_DROUGHT_RUN does not fire when complicating scenes are evenly spread', async () => {
      const recs878cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'complicate' : 'establish_world' }),
      );
      const res = await runT878(recs878cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_COMPLICATE_DROUGHT_RUN'), 'THEME_COMPLICATE_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 864 — themePass: theme climax drought run, theme establish world drought run, theme resolution zone cluster', async () => {
    const runT864 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // THEME_CLIMAX_DROUGHT_RUN fire:
    // n=10; climax at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('THEME_CLIMAX_DROUGHT_RUN fires when a long run has no climax-purposed scene', async () => {
      const recs864a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runT864(recs864a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_CLIMAX_DROUGHT_RUN'), 'THEME_CLIMAX_DROUGHT_RUN should fire');
    });

    it('THEME_CLIMAX_DROUGHT_RUN does not fire when climax-purposed scenes are evenly spread', async () => {
      const recs864an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runT864(recs864an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_CLIMAX_DROUGHT_RUN'), 'THEME_CLIMAX_DROUGHT_RUN should not fire');
    });

    // THEME_ESTABLISH_WORLD_DROUGHT_RUN fire:
    // n=10; establish_world at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('THEME_ESTABLISH_WORLD_DROUGHT_RUN fires when a long run has no world-establishing scene', async () => {
      const recs864b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runT864(recs864b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_ESTABLISH_WORLD_DROUGHT_RUN'), 'THEME_ESTABLISH_WORLD_DROUGHT_RUN should fire');
    });

    it('THEME_ESTABLISH_WORLD_DROUGHT_RUN does not fire when world-establishing scenes are evenly spread', async () => {
      const recs864bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runT864(recs864bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_ESTABLISH_WORLD_DROUGHT_RUN'), 'THEME_ESTABLISH_WORLD_DROUGHT_RUN should not fire');
    });

    // THEME_RESOLUTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; resolution scenes at 0,1,2 → 100% opening third
    it('THEME_RESOLUTION_ZONE_CLUSTER fires when >75% of resolution-purposed scenes cluster in one third', async () => {
      const recs864c = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'resolution' : 'complicate' }),
      );
      const res = await runT864(recs864c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_RESOLUTION_ZONE_CLUSTER'), 'THEME_RESOLUTION_ZONE_CLUSTER should fire');
    });

    it('THEME_RESOLUTION_ZONE_CLUSTER does not fire when resolution-purposed scenes spread across thirds', async () => {
      const recs864cn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'resolution' : 'complicate' }),
      );
      const res = await runT864(recs864cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_RESOLUTION_ZONE_CLUSTER'), 'THEME_RESOLUTION_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 850 — themePass: theme positive emotion drought run, theme establish world zone cluster, theme climax zone cluster', async () => {
    const runT850 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // THEME_POSITIVE_EMOTION_DROUGHT_RUN fire:
    // n=10; positive-emotion at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('THEME_POSITIVE_EMOTION_DROUGHT_RUN fires when a long run has no positive-emotion charge', async () => {
      const recs850a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runT850(recs850a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_POSITIVE_EMOTION_DROUGHT_RUN'), 'THEME_POSITIVE_EMOTION_DROUGHT_RUN should fire');
    });

    it('THEME_POSITIVE_EMOTION_DROUGHT_RUN does not fire when positive-emotion scenes are evenly spread', async () => {
      const recs850an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 3, 6, 9].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runT850(recs850an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_POSITIVE_EMOTION_DROUGHT_RUN'), 'THEME_POSITIVE_EMOTION_DROUGHT_RUN should not fire');
    });

    // THEME_ESTABLISH_WORLD_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; establish_world scenes at 0,1,2 → 100% opening third
    it('THEME_ESTABLISH_WORLD_ZONE_CLUSTER fires when >75% of world-establishing scenes cluster in one third', async () => {
      const recs850b = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runT850(recs850b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_ESTABLISH_WORLD_ZONE_CLUSTER'), 'THEME_ESTABLISH_WORLD_ZONE_CLUSTER should fire');
    });

    it('THEME_ESTABLISH_WORLD_ZONE_CLUSTER does not fire when world-establishing scenes spread across thirds', async () => {
      const recs850bn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runT850(recs850bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_ESTABLISH_WORLD_ZONE_CLUSTER'), 'THEME_ESTABLISH_WORLD_ZONE_CLUSTER should not fire');
    });

    // THEME_CLIMAX_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; climax scenes at 0,1,2 → 100% opening third
    it('THEME_CLIMAX_ZONE_CLUSTER fires when >75% of climax-purposed scenes cluster in one third', async () => {
      const recs850c = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runT850(recs850c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_CLIMAX_ZONE_CLUSTER'), 'THEME_CLIMAX_ZONE_CLUSTER should fire');
    });

    it('THEME_CLIMAX_ZONE_CLUSTER does not fire when climax-purposed scenes spread across thirds', async () => {
      const recs850cn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runT850(recs850cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_CLIMAX_ZONE_CLUSTER'), 'THEME_CLIMAX_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 836 — themePass: theme turning point drought run, theme introduce conflict drought run, theme positive emotion zone cluster', async () => {
    const runT836 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // THEME_TURNING_POINT_DROUGHT_RUN fire:
    // n=10; turning_point present at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('THEME_TURNING_POINT_DROUGHT_RUN fires when a long run has no turning point', async () => {
      const recs836a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'turning_point' : 'complicate' }),
      );
      const res = await runT836(recs836a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_TURNING_POINT_DROUGHT_RUN'), 'THEME_TURNING_POINT_DROUGHT_RUN should fire');
    });

    it('THEME_TURNING_POINT_DROUGHT_RUN does not fire when turning points are evenly spread', async () => {
      const recs836an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'turning_point' : 'complicate' }),
      );
      const res = await runT836(recs836an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_TURNING_POINT_DROUGHT_RUN'), 'THEME_TURNING_POINT_DROUGHT_RUN should not fire');
    });

    // THEME_INTRODUCE_CONFLICT_DROUGHT_RUN fire:
    // n=10; introduce_conflict present at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('THEME_INTRODUCE_CONFLICT_DROUGHT_RUN fires when a long run has no new conflict', async () => {
      const recs836b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'introduce_conflict' : 'complicate' }),
      );
      const res = await runT836(recs836b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_INTRODUCE_CONFLICT_DROUGHT_RUN'), 'THEME_INTRODUCE_CONFLICT_DROUGHT_RUN should fire');
    });

    it('THEME_INTRODUCE_CONFLICT_DROUGHT_RUN does not fire when conflict-introducing scenes are evenly spread', async () => {
      const recs836bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'introduce_conflict' : 'complicate' }),
      );
      const res = await runT836(recs836bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_INTRODUCE_CONFLICT_DROUGHT_RUN'), 'THEME_INTRODUCE_CONFLICT_DROUGHT_RUN should not fire');
    });

    // THEME_POSITIVE_EMOTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; positive-emotion scenes at 0,1,2 → 100% opening third
    it('THEME_POSITIVE_EMOTION_ZONE_CLUSTER fires when >75% of positive-emotion scenes cluster in one third', async () => {
      const recs836c = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runT836(recs836c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_POSITIVE_EMOTION_ZONE_CLUSTER'), 'THEME_POSITIVE_EMOTION_ZONE_CLUSTER should fire');
    });

    it('THEME_POSITIVE_EMOTION_ZONE_CLUSTER does not fire when positive-emotion scenes spread across thirds', async () => {
      const recs836cn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 4, 8].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runT836(recs836cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_POSITIVE_EMOTION_ZONE_CLUSTER'), 'THEME_POSITIVE_EMOTION_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 822 — themePass: theme stakes drought run, theme turning point zone cluster, theme introduce conflict zone cluster', async () => {
    const runT822 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // THEME_STAKES_DROUGHT_RUN fire:
    // n=10; raise_stakes present at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('THEME_STAKES_DROUGHT_RUN fires when a long run has no stakes-raising purpose', async () => {
      const recs822a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'raise_stakes' : 'complicate' }),
      );
      const res = await runT822(recs822a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_STAKES_DROUGHT_RUN'), 'THEME_STAKES_DROUGHT_RUN should fire');
    });

    it('THEME_STAKES_DROUGHT_RUN does not fire when stakes-raising scenes are evenly spread', async () => {
      const recs822an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'raise_stakes' : 'complicate' }),
      );
      const res = await runT822(recs822an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_STAKES_DROUGHT_RUN'), 'THEME_STAKES_DROUGHT_RUN should not fire');
    });

    // THEME_TURNING_POINT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; turning_point scenes at 0,1,2 → 100% opening third
    it('THEME_TURNING_POINT_ZONE_CLUSTER fires when >75% of turning-point scenes cluster in one third', async () => {
      const recs822b = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'turning_point' : 'complicate' }),
      );
      const res = await runT822(recs822b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_TURNING_POINT_ZONE_CLUSTER'), 'THEME_TURNING_POINT_ZONE_CLUSTER should fire');
    });

    it('THEME_TURNING_POINT_ZONE_CLUSTER does not fire when turning-point scenes spread across thirds', async () => {
      const recs822bn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'turning_point' : 'complicate' }),
      );
      const res = await runT822(recs822bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_TURNING_POINT_ZONE_CLUSTER'), 'THEME_TURNING_POINT_ZONE_CLUSTER should not fire');
    });

    // THEME_INTRODUCE_CONFLICT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; introduce_conflict scenes at 0,1,2 → 100% opening third
    it('THEME_INTRODUCE_CONFLICT_ZONE_CLUSTER fires when >75% of conflict-introducing scenes cluster in one third', async () => {
      const recs822c = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'introduce_conflict' : 'complicate' }),
      );
      const res = await runT822(recs822c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_INTRODUCE_CONFLICT_ZONE_CLUSTER'), 'THEME_INTRODUCE_CONFLICT_ZONE_CLUSTER should fire');
    });

    it('THEME_INTRODUCE_CONFLICT_ZONE_CLUSTER does not fire when conflict-introducing scenes spread across thirds', async () => {
      const recs822cn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'introduce_conflict' : 'complicate' }),
      );
      const res = await runT822(recs822cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_INTRODUCE_CONFLICT_ZONE_CLUSTER'), 'THEME_INTRODUCE_CONFLICT_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 808 — themePass: theme revelation peak uncaused, theme negative emotion drought run, theme stakes zone cluster', async () => {
    const runT808 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // THEME_REVELATION_PEAK_UNCAUSED fire:
    // 8 scenes; revelation-qualifying (magnitude 1) at 2 and 5; peak resolves to the first (idx 2);
    // no dramaticTurn at 0, 1, or 2 itself (2-scene lookback + the peak scene itself).
    it('THEME_REVELATION_PEAK_UNCAUSED fires when the revelation scene has no dramatic turn nearby', async () => {
      const recs808a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs808a[2] = makeSharedRecord(2, { revelation: 'truth revealed' });
      recs808a[5] = makeSharedRecord(5, { revelation: 'truth revealed' });
      const res = await runT808(recs808a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_REVELATION_PEAK_UNCAUSED'), 'THEME_REVELATION_PEAK_UNCAUSED should fire');
    });

    it('THEME_REVELATION_PEAK_UNCAUSED does not fire when a dramatic turn precedes the revelation scene', async () => {
      const recs808an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs808an[2] = makeSharedRecord(2, { revelation: 'truth revealed' });
      recs808an[5] = makeSharedRecord(5, { revelation: 'truth revealed' });
      recs808an[1] = makeSharedRecord(1, { dramaticTurn: 'reversal' });
      const res = await runT808(recs808an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_REVELATION_PEAK_UNCAUSED'), 'THEME_REVELATION_PEAK_UNCAUSED should not fire');
    });

    // THEME_NEGATIVE_EMOTION_DROUGHT_RUN fire:
    // n=10; negative-emotion at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('THEME_NEGATIVE_EMOTION_DROUGHT_RUN fires when a long run has no negative-emotion charge', async () => {
      const recs808b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runT808(recs808b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_NEGATIVE_EMOTION_DROUGHT_RUN'), 'THEME_NEGATIVE_EMOTION_DROUGHT_RUN should fire');
    });

    it('THEME_NEGATIVE_EMOTION_DROUGHT_RUN does not fire when negative-emotion scenes are evenly spread', async () => {
      const recs808bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 3, 6, 9].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runT808(recs808bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_NEGATIVE_EMOTION_DROUGHT_RUN'), 'THEME_NEGATIVE_EMOTION_DROUGHT_RUN should not fire');
    });

    // THEME_STAKES_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; raise_stakes scenes at 0,1,2 → 100% opening third
    it('THEME_STAKES_ZONE_CLUSTER fires when >75% of stakes-raising scenes cluster in one third', async () => {
      const recs808c = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'raise_stakes' : 'complicate' }),
      );
      const res = await runT808(recs808c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_STAKES_ZONE_CLUSTER'), 'THEME_STAKES_ZONE_CLUSTER should fire');
    });

    it('THEME_STAKES_ZONE_CLUSTER does not fire when stakes-raising scenes spread across thirds', async () => {
      const recs808cn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'raise_stakes' : 'complicate' }),
      );
      const res = await runT808(recs808cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_STAKES_ZONE_CLUSTER'), 'THEME_STAKES_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 794 — themePass: theme revelation zone cluster, theme revelation drought run, theme negative emotion zone cluster', async () => {
    const runT794 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // THEME_REVELATION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; revelation scenes at 0,1,2 → 100% opening third
    it('THEME_REVELATION_ZONE_CLUSTER fires when >75% of revelation scenes cluster in one third', async () => {
      const recs794a = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { revelation: [0, 1, 2].includes(i) ? 'truth revealed' : null }),
      );
      const res = await runT794(recs794a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_REVELATION_ZONE_CLUSTER'), 'THEME_REVELATION_ZONE_CLUSTER should fire');
    });

    it('THEME_REVELATION_ZONE_CLUSTER does not fire when revelation scenes spread across thirds', async () => {
      const recs794an = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { revelation: [0, 4, 8].includes(i) ? 'truth revealed' : null }),
      );
      const res = await runT794(recs794an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_REVELATION_ZONE_CLUSTER'), 'THEME_REVELATION_ZONE_CLUSTER should not fire');
    });

    // THEME_REVELATION_DROUGHT_RUN fire:
    // n=10; revelation present at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('THEME_REVELATION_DROUGHT_RUN fires when a long run has no revelation', async () => {
      const recs794b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { revelation: [0, 1, 2].includes(i) ? 'truth revealed' : null }),
      );
      const res = await runT794(recs794b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_REVELATION_DROUGHT_RUN'), 'THEME_REVELATION_DROUGHT_RUN should fire');
    });

    it('THEME_REVELATION_DROUGHT_RUN does not fire when revelations are evenly spread', async () => {
      const recs794bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { revelation: [0, 3, 6, 9].includes(i) ? 'truth revealed' : null }),
      );
      const res = await runT794(recs794bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_REVELATION_DROUGHT_RUN'), 'THEME_REVELATION_DROUGHT_RUN should not fire');
    });

    // THEME_NEGATIVE_EMOTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; negative-emotion scenes at 0,1,2 → 100% opening third
    it('THEME_NEGATIVE_EMOTION_ZONE_CLUSTER fires when >75% of negative-emotion scenes cluster in one third', async () => {
      const recs794c = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runT794(recs794c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_NEGATIVE_EMOTION_ZONE_CLUSTER'), 'THEME_NEGATIVE_EMOTION_ZONE_CLUSTER should fire');
    });

    it('THEME_NEGATIVE_EMOTION_ZONE_CLUSTER does not fire when negative-emotion scenes spread across thirds', async () => {
      const recs794cn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 4, 8].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runT794(recs794cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_NEGATIVE_EMOTION_ZONE_CLUSTER'), 'THEME_NEGATIVE_EMOTION_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 780 — themePass: theme suspense drought run, theme curiosity drought run, theme curiosity peak uncaused', async () => {
    const runT780 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // THEME_SUSPENSE_DROUGHT_RUN fire:
    // n=10; suspenseDelta>0 at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('THEME_SUSPENSE_DROUGHT_RUN fires when a long run has no rising suspense', async () => {
      const recs780a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { suspenseDelta: [0, 1, 2].includes(i) ? 2 : 0 }),
      );
      const res = await runT780(recs780a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_SUSPENSE_DROUGHT_RUN'), 'THEME_SUSPENSE_DROUGHT_RUN should fire');
    });

    it('THEME_SUSPENSE_DROUGHT_RUN does not fire when suspense rises are evenly spread', async () => {
      const recs780an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { suspenseDelta: [0, 3, 6, 9].includes(i) ? 2 : 0 }),
      );
      const res = await runT780(recs780an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_SUSPENSE_DROUGHT_RUN'), 'THEME_SUSPENSE_DROUGHT_RUN should not fire');
    });

    // THEME_CURIOSITY_DROUGHT_RUN fire:
    // n=10; curiosityDelta>0 at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('THEME_CURIOSITY_DROUGHT_RUN fires when a long run has no rising curiosity', async () => {
      const recs780b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 1, 2].includes(i) ? 2 : 0 }),
      );
      const res = await runT780(recs780b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_CURIOSITY_DROUGHT_RUN'), 'THEME_CURIOSITY_DROUGHT_RUN should fire');
    });

    it('THEME_CURIOSITY_DROUGHT_RUN does not fire when curiosity rises are evenly spread', async () => {
      const recs780bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 3, 6, 9].includes(i) ? 2 : 0 }),
      );
      const res = await runT780(recs780bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_CURIOSITY_DROUGHT_RUN'), 'THEME_CURIOSITY_DROUGHT_RUN should not fire');
    });

    // THEME_CURIOSITY_PEAK_UNCAUSED fire:
    // 8 scenes; curiosityDelta qualifying (>0) at 2 and 5; peak resolves to the first (idx 2, tie
    // on magnitude 3); no dramaticTurn/revelation at indices 0 or 1 (2-scene lookback).
    it('THEME_CURIOSITY_PEAK_UNCAUSED fires when the peak curiosity scene has no preparing cause nearby', async () => {
      const recs780c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs780c[2] = makeSharedRecord(2, { curiosityDelta: 3 });
      recs780c[5] = makeSharedRecord(5, { curiosityDelta: 3 });
      const res = await runT780(recs780c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_CURIOSITY_PEAK_UNCAUSED'), 'THEME_CURIOSITY_PEAK_UNCAUSED should fire');
    });

    it('THEME_CURIOSITY_PEAK_UNCAUSED does not fire when a preparing cause precedes the peak curiosity scene', async () => {
      const recs780cn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs780cn[2] = makeSharedRecord(2, { curiosityDelta: 3 });
      recs780cn[5] = makeSharedRecord(5, { curiosityDelta: 3 });
      recs780cn[1] = makeSharedRecord(1, { dramaticTurn: 'reversal' });
      const res = await runT780(recs780cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_CURIOSITY_PEAK_UNCAUSED'), 'THEME_CURIOSITY_PEAK_UNCAUSED should not fire');
    });
  });


  describe('Wave 766 — themePass: theme suspense zone cluster, theme curiosity zone cluster, theme suspense peak uncaused', async () => {
    const runT766 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // THEME_SUSPENSE_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; suspenseDelta>0 scenes at 0,1,2 → 100% opening third
    it('THEME_SUSPENSE_ZONE_CLUSTER fires when >75% of suspense-positive scenes cluster in one third', async () => {
      const recs766a = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { suspenseDelta: [0, 1, 2].includes(i) ? 2 : 0 }),
      );
      const res = await runT766(recs766a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_SUSPENSE_ZONE_CLUSTER'), 'THEME_SUSPENSE_ZONE_CLUSTER should fire');
    });

    it('THEME_SUSPENSE_ZONE_CLUSTER does not fire when suspense-positive scenes spread across thirds', async () => {
      const recs766an = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { suspenseDelta: [0, 4, 8].includes(i) ? 2 : 0 }),
      );
      const res = await runT766(recs766an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_SUSPENSE_ZONE_CLUSTER'), 'THEME_SUSPENSE_ZONE_CLUSTER should not fire');
    });

    // THEME_CURIOSITY_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; curiosityDelta>0 scenes at 0,1,2 → 100% opening third
    it('THEME_CURIOSITY_ZONE_CLUSTER fires when >75% of curiosity-positive scenes cluster in one third', async () => {
      const recs766b = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 1, 2].includes(i) ? 2 : 0 }),
      );
      const res = await runT766(recs766b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_CURIOSITY_ZONE_CLUSTER'), 'THEME_CURIOSITY_ZONE_CLUSTER should fire');
    });

    it('THEME_CURIOSITY_ZONE_CLUSTER does not fire when curiosity-positive scenes spread across thirds', async () => {
      const recs766bn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 4, 8].includes(i) ? 2 : 0 }),
      );
      const res = await runT766(recs766bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_CURIOSITY_ZONE_CLUSTER'), 'THEME_CURIOSITY_ZONE_CLUSTER should not fire');
    });

    // THEME_SUSPENSE_PEAK_UNCAUSED fire:
    // 8 scenes; suspenseDelta qualifying (>0) at 2 and 5; peak resolves to the first (idx 2, tie
    // on magnitude 3); no dramaticTurn/revelation at indices 0 or 1 (2-scene lookback).
    it('THEME_SUSPENSE_PEAK_UNCAUSED fires when the peak suspense scene has no preparing cause nearby', async () => {
      const recs766c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs766c[2] = makeSharedRecord(2, { suspenseDelta: 3 });
      recs766c[5] = makeSharedRecord(5, { suspenseDelta: 3 });
      const res = await runT766(recs766c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_SUSPENSE_PEAK_UNCAUSED'), 'THEME_SUSPENSE_PEAK_UNCAUSED should fire');
    });

    it('THEME_SUSPENSE_PEAK_UNCAUSED does not fire when a preparing cause precedes the peak suspense scene', async () => {
      const recs766cn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs766cn[2] = makeSharedRecord(2, { suspenseDelta: 3 });
      recs766cn[5] = makeSharedRecord(5, { suspenseDelta: 3 });
      recs766cn[1] = makeSharedRecord(1, { dramaticTurn: 'reversal' });
      const res = await runT766(recs766cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_SUSPENSE_PEAK_UNCAUSED'), 'THEME_SUSPENSE_PEAK_UNCAUSED should not fire');
    });
  });


  describe('Wave 752 — themePass: theme clock delta zone cluster, theme turn drought run, theme character moment drought run', async () => {
    const runT752 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // THEME_CLOCK_DELTA_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; clock-shifting scenes at 0,1,2 → 100% opening third
    it('THEME_CLOCK_DELTA_ZONE_CLUSTER fires when >75% of clock-shifting scenes cluster in one third', async () => {
      const recs752a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs752a[0] = makeSharedRecord(0, { clockDelta: 1 });
      recs752a[1] = makeSharedRecord(1, { clockDelta: -1 });
      recs752a[2] = makeSharedRecord(2, { clockDelta: 1 });
      const res = await runT752(recs752a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_CLOCK_DELTA_ZONE_CLUSTER'), 'THEME_CLOCK_DELTA_ZONE_CLUSTER should fire');
    });

    // THEME_CLOCK_DELTA_ZONE_CLUSTER no-fire:
    // clock-shifting scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('THEME_CLOCK_DELTA_ZONE_CLUSTER does not fire when clock movement is distributed across thirds', async () => {
      const recs752an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs752an[0] = makeSharedRecord(0, { clockDelta: 1 });
      recs752an[4] = makeSharedRecord(4, { clockDelta: -1 });
      recs752an[7] = makeSharedRecord(7, { clockDelta: 1 });
      const res = await runT752(recs752an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_CLOCK_DELTA_ZONE_CLUSTER'), 'THEME_CLOCK_DELTA_ZONE_CLUSTER should not fire');
    });

    // THEME_TURN_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 carry a dramatic turn (>=3 present overall); scenes 3-9 (7 scenes) have none
    it('THEME_TURN_DROUGHT_RUN fires when the longest no-dramatic-turn run reaches 6', async () => {
      const recs752b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs752b[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs752b[1] = makeSharedRecord(1, { dramaticTurn: 'reversal' });
      recs752b[2] = makeSharedRecord(2, { dramaticTurn: 'reversal' });
      const res = await runT752(recs752b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_TURN_DROUGHT_RUN'), 'THEME_TURN_DROUGHT_RUN should fire');
    });

    // THEME_TURN_DROUGHT_RUN no-fire:
    // dramatic-turn scenes spread out so no gap reaches 6 consecutive scenes
    it('THEME_TURN_DROUGHT_RUN does not fire when dramatic turns are spread through the story', async () => {
      const recs752bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs752bn[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs752bn[3] = makeSharedRecord(3, { dramaticTurn: 'reversal' });
      recs752bn[6] = makeSharedRecord(6, { dramaticTurn: 'reversal' });
      recs752bn[9] = makeSharedRecord(9, { dramaticTurn: 'reversal' });
      const res = await runT752(recs752bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_TURN_DROUGHT_RUN'), 'THEME_TURN_DROUGHT_RUN should not fire');
    });

    // THEME_CHARACTER_MOMENT_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 purposed as character moments (>=3 present overall); scenes 3-9 (7 scenes) purposed otherwise
    it('THEME_CHARACTER_MOMENT_DROUGHT_RUN fires when the longest no-character-moment run reaches 6', async () => {
      const recs752c = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs752c[0] = makeSharedRecord(0, { purpose: 'character_moment' });
      recs752c[1] = makeSharedRecord(1, { purpose: 'character_moment' });
      recs752c[2] = makeSharedRecord(2, { purpose: 'character_moment' });
      const res = await runT752(recs752c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_CHARACTER_MOMENT_DROUGHT_RUN'), 'THEME_CHARACTER_MOMENT_DROUGHT_RUN should fire');
    });

    // THEME_CHARACTER_MOMENT_DROUGHT_RUN no-fire:
    // character-moment scenes spread out so no gap reaches 6 consecutive scenes
    it('THEME_CHARACTER_MOMENT_DROUGHT_RUN does not fire when character moments are spread through the story', async () => {
      const recs752cn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs752cn[0] = makeSharedRecord(0, { purpose: 'character_moment' });
      recs752cn[3] = makeSharedRecord(3, { purpose: 'character_moment' });
      recs752cn[6] = makeSharedRecord(6, { purpose: 'character_moment' });
      recs752cn[9] = makeSharedRecord(9, { purpose: 'character_moment' });
      const res = await runT752(recs752cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_CHARACTER_MOMENT_DROUGHT_RUN'), 'THEME_CHARACTER_MOMENT_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 738 — themePass: theme highlight zone cluster, theme relationship zone cluster, theme clock delta drought run', async () => {
    const runT738 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // THEME_HIGHLIGHT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; highlighted-dialogue scenes at 0,1,2 → 100% opening third
    it('THEME_HIGHLIGHT_ZONE_CLUSTER fires when >75% of highlighted-dialogue scenes cluster in one third', async () => {
      const recs738a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs738a[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs738a[1] = makeSharedRecord(1, { dialogueHighlights: ['line-b'] });
      recs738a[2] = makeSharedRecord(2, { dialogueHighlights: ['line-c'] });
      const res = await runT738(recs738a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_HIGHLIGHT_ZONE_CLUSTER'), 'THEME_HIGHLIGHT_ZONE_CLUSTER should fire');
    });

    // THEME_HIGHLIGHT_ZONE_CLUSTER no-fire:
    // highlighted-dialogue scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('THEME_HIGHLIGHT_ZONE_CLUSTER does not fire when highlighted dialogue is distributed across thirds', async () => {
      const recs738an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs738an[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs738an[4] = makeSharedRecord(4, { dialogueHighlights: ['line-b'] });
      recs738an[7] = makeSharedRecord(7, { dialogueHighlights: ['line-c'] });
      const res = await runT738(recs738an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_HIGHLIGHT_ZONE_CLUSTER'), 'THEME_HIGHLIGHT_ZONE_CLUSTER should not fire');
    });

    // THEME_RELATIONSHIP_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; relationship-shift scenes at 0,1,2 → 100% opening third
    it('THEME_RELATIONSHIP_ZONE_CLUSTER fires when >75% of relationship-shift scenes cluster in one third', async () => {
      const recs738b = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs738b[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      recs738b[1] = makeSharedRecord(1, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      recs738b[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      const res = await runT738(recs738b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_RELATIONSHIP_ZONE_CLUSTER'), 'THEME_RELATIONSHIP_ZONE_CLUSTER should fire');
    });

    // THEME_RELATIONSHIP_ZONE_CLUSTER no-fire:
    // relationship-shift scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('THEME_RELATIONSHIP_ZONE_CLUSTER does not fire when relationship-shift scenes are distributed across thirds', async () => {
      const recs738bn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs738bn[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      recs738bn[4] = makeSharedRecord(4, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      recs738bn[7] = makeSharedRecord(7, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      const res = await runT738(recs738bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_RELATIONSHIP_ZONE_CLUSTER'), 'THEME_RELATIONSHIP_ZONE_CLUSTER should not fire');
    });

    // THEME_CLOCK_DELTA_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 shift the clock (>=3 present overall); scenes 3-9 (7 scenes) have none
    it('THEME_CLOCK_DELTA_DROUGHT_RUN fires when the longest no-clock-movement run reaches 6', async () => {
      const recs738c = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs738c[0] = makeSharedRecord(0, { clockDelta: 1 });
      recs738c[1] = makeSharedRecord(1, { clockDelta: -1 });
      recs738c[2] = makeSharedRecord(2, { clockDelta: 1 });
      const res = await runT738(recs738c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_CLOCK_DELTA_DROUGHT_RUN'), 'THEME_CLOCK_DELTA_DROUGHT_RUN should fire');
    });

    // THEME_CLOCK_DELTA_DROUGHT_RUN no-fire:
    // clock-shifting scenes spread out so no gap reaches 6 consecutive scenes
    it('THEME_CLOCK_DELTA_DROUGHT_RUN does not fire when clock movement is spread through the story', async () => {
      const recs738cn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs738cn[0] = makeSharedRecord(0, { clockDelta: 1 });
      recs738cn[3] = makeSharedRecord(3, { clockDelta: -1 });
      recs738cn[6] = makeSharedRecord(6, { clockDelta: 1 });
      recs738cn[9] = makeSharedRecord(9, { clockDelta: -1 });
      const res = await runT738(recs738cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_CLOCK_DELTA_DROUGHT_RUN'), 'THEME_CLOCK_DELTA_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 724 — themePass: theme open thread zone cluster, theme highlight peak uncaused, theme relationship drought run', async () => {
    const runT724 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // THEME_OPEN_THREAD_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; open-thread scenes at 0,1,2 → 100% opening third
    it('THEME_OPEN_THREAD_ZONE_CLUSTER fires when >75% of open-thread scenes cluster in one third', async () => {
      const recs724a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs724a[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs724a[1] = makeSharedRecord(1, { unresolvedClues: ['b'] });
      recs724a[2] = makeSharedRecord(2, { unresolvedClues: ['c'] });
      const res = await runT724(recs724a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_OPEN_THREAD_ZONE_CLUSTER'), 'THEME_OPEN_THREAD_ZONE_CLUSTER should fire');
    });

    // THEME_OPEN_THREAD_ZONE_CLUSTER no-fire:
    // open-thread scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('THEME_OPEN_THREAD_ZONE_CLUSTER does not fire when open-thread scenes are distributed across thirds', async () => {
      const recs724an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs724an[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs724an[4] = makeSharedRecord(4, { unresolvedClues: ['b'] });
      recs724an[7] = makeSharedRecord(7, { unresolvedClues: ['c'] });
      const res = await runT724(recs724an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_OPEN_THREAD_ZONE_CLUSTER'), 'THEME_OPEN_THREAD_ZONE_CLUSTER should not fire');
    });

    // THEME_HIGHLIGHT_PEAK_UNCAUSED fire:
    // 8 scenes; highlights at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('THEME_HIGHLIGHT_PEAK_UNCAUSED fires when the peak highlighted-dialogue scene has no dramatic turn or revelation nearby', async () => {
      const recs724b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs724b[2] = makeSharedRecord(2, { dialogueHighlights: ['line-a'] });
      recs724b[6] = makeSharedRecord(6, { dialogueHighlights: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runT724(recs724b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_HIGHLIGHT_PEAK_UNCAUSED'), 'THEME_HIGHLIGHT_PEAK_UNCAUSED should fire');
    });

    // THEME_HIGHLIGHT_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('THEME_HIGHLIGHT_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs724bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs724bn[2] = makeSharedRecord(2, { dialogueHighlights: ['line-a'] });
      recs724bn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs724bn[6] = makeSharedRecord(6, { dialogueHighlights: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runT724(recs724bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_HIGHLIGHT_PEAK_UNCAUSED'), 'THEME_HIGHLIGHT_PEAK_UNCAUSED should not fire');
    });

    // THEME_RELATIONSHIP_DROUGHT_RUN fire:
    // 10 scenes; shifts at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('THEME_RELATIONSHIP_DROUGHT_RUN fires when the longest no-shift run is ≥6', async () => {
      const recs724c = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs724c[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs724c[1] = makeSharedRecord(1, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs724c[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs724c[9] = makeSharedRecord(9, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      const res = await runT724(recs724c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_RELATIONSHIP_DROUGHT_RUN'), 'THEME_RELATIONSHIP_DROUGHT_RUN should fire');
    });

    // THEME_RELATIONSHIP_DROUGHT_RUN no-fire:
    // shifts at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('THEME_RELATIONSHIP_DROUGHT_RUN does not fire when shifts are distributed without a long drought', async () => {
      const recs724cn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs724cn[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs724cn[4] = makeSharedRecord(4, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs724cn[9] = makeSharedRecord(9, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      const res = await runT724(recs724cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_RELATIONSHIP_DROUGHT_RUN'), 'THEME_RELATIONSHIP_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 710 — themePass: theme clock zone cluster, theme open thread drought run, theme seed peak uncaused', async () => {
    const runT710 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // THEME_CLOCK_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; clock-raised scenes at 0,1,2 → 100% opening third
    it('THEME_CLOCK_ZONE_CLUSTER fires when >75% of clock-raised scenes cluster in one third', async () => {
      const recs710a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs710a[0] = makeSharedRecord(0, { clockRaised: true });
      recs710a[1] = makeSharedRecord(1, { clockRaised: true });
      recs710a[2] = makeSharedRecord(2, { clockRaised: true });
      const res = await runT710(recs710a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_CLOCK_ZONE_CLUSTER'), 'THEME_CLOCK_ZONE_CLUSTER should fire');
    });

    // THEME_CLOCK_ZONE_CLUSTER no-fire:
    // clock-raised scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('THEME_CLOCK_ZONE_CLUSTER does not fire when clock-raised scenes are distributed across thirds', async () => {
      const recs710an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs710an[0] = makeSharedRecord(0, { clockRaised: true });
      recs710an[4] = makeSharedRecord(4, { clockRaised: true });
      recs710an[7] = makeSharedRecord(7, { clockRaised: true });
      const res = await runT710(recs710an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_CLOCK_ZONE_CLUSTER'), 'THEME_CLOCK_ZONE_CLUSTER should not fire');
    });

    // THEME_OPEN_THREAD_DROUGHT_RUN fire:
    // 10 scenes; open threads at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('THEME_OPEN_THREAD_DROUGHT_RUN fires when the longest no-open-thread run is ≥6', async () => {
      const recs710b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs710b[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs710b[1] = makeSharedRecord(1, { unresolvedClues: ['b'] });
      recs710b[2] = makeSharedRecord(2, { unresolvedClues: ['c'] });
      recs710b[9] = makeSharedRecord(9, { unresolvedClues: ['d'] });
      const res = await runT710(recs710b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_OPEN_THREAD_DROUGHT_RUN'), 'THEME_OPEN_THREAD_DROUGHT_RUN should fire');
    });

    // THEME_OPEN_THREAD_DROUGHT_RUN no-fire:
    // open threads at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('THEME_OPEN_THREAD_DROUGHT_RUN does not fire when open threads are distributed without a long drought', async () => {
      const recs710bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs710bn[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs710bn[4] = makeSharedRecord(4, { unresolvedClues: ['b'] });
      recs710bn[9] = makeSharedRecord(9, { unresolvedClues: ['c'] });
      const res = await runT710(recs710bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_OPEN_THREAD_DROUGHT_RUN'), 'THEME_OPEN_THREAD_DROUGHT_RUN should not fire');
    });

    // THEME_SEED_PEAK_UNCAUSED fire:
    // 8 scenes; seeds at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('THEME_SEED_PEAK_UNCAUSED fires when the peak seed scene has no dramatic turn or revelation nearby', async () => {
      const recs710c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs710c[2] = makeSharedRecord(2, { seededClueIds: ['clue-a'] });
      recs710c[6] = makeSharedRecord(6, { seededClueIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runT710(recs710c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_SEED_PEAK_UNCAUSED'), 'THEME_SEED_PEAK_UNCAUSED should fire');
    });

    // THEME_SEED_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('THEME_SEED_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs710cn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs710cn[2] = makeSharedRecord(2, { seededClueIds: ['clue-a'] });
      recs710cn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs710cn[6] = makeSharedRecord(6, { seededClueIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runT710(recs710cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_SEED_PEAK_UNCAUSED'), 'THEME_SEED_PEAK_UNCAUSED should not fire');
    });
  });

  describe('Wave 696 — themePass: theme staging zone cluster, theme payoff peak uncaused, theme seed drought run', async () => {
    const runT696 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // THEME_STAGING_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; visually dense scenes at 0,1,2 → 100% opening third
    it('THEME_STAGING_ZONE_CLUSTER fires when >75% of visually dense scenes cluster in one third', async () => {
      const recs696a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs696a[0] = makeSharedRecord(0, { visualBeats: ['a', 'b'] });
      recs696a[1] = makeSharedRecord(1, { visualBeats: ['a', 'b'] });
      recs696a[2] = makeSharedRecord(2, { visualBeats: ['a', 'b'] });
      const res = await runT696(recs696a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_STAGING_ZONE_CLUSTER'), 'THEME_STAGING_ZONE_CLUSTER should fire');
    });

    // THEME_STAGING_ZONE_CLUSTER no-fire:
    // visually dense scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('THEME_STAGING_ZONE_CLUSTER does not fire when visually dense scenes are distributed across thirds', async () => {
      const recs696an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs696an[0] = makeSharedRecord(0, { visualBeats: ['a', 'b'] });
      recs696an[4] = makeSharedRecord(4, { visualBeats: ['a', 'b'] });
      recs696an[7] = makeSharedRecord(7, { visualBeats: ['a', 'b'] });
      const res = await runT696(recs696an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_STAGING_ZONE_CLUSTER'), 'THEME_STAGING_ZONE_CLUSTER should not fire');
    });

    // THEME_PAYOFF_PEAK_UNCAUSED fire:
    // 8 scenes; payoffs at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('THEME_PAYOFF_PEAK_UNCAUSED fires when the peak payoff scene has no dramatic turn or revelation nearby', async () => {
      const recs696b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs696b[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-a'] });
      recs696b[6] = makeSharedRecord(6, { payoffSetupIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runT696(recs696b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_PAYOFF_PEAK_UNCAUSED'), 'THEME_PAYOFF_PEAK_UNCAUSED should fire');
    });

    // THEME_PAYOFF_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('THEME_PAYOFF_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs696bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs696bn[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-a'] });
      recs696bn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs696bn[6] = makeSharedRecord(6, { payoffSetupIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runT696(recs696bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_PAYOFF_PEAK_UNCAUSED'), 'THEME_PAYOFF_PEAK_UNCAUSED should not fire');
    });

    // THEME_SEED_DROUGHT_RUN fire:
    // 10 scenes; seeds at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('THEME_SEED_DROUGHT_RUN fires when the longest no-seed run is ≥6', async () => {
      const recs696c = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs696c[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs696c[1] = makeSharedRecord(1, { seededClueIds: ['clue-b'] });
      recs696c[2] = makeSharedRecord(2, { seededClueIds: ['clue-c'] });
      recs696c[9] = makeSharedRecord(9, { seededClueIds: ['clue-d'] });
      const res = await runT696(recs696c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_SEED_DROUGHT_RUN'), 'THEME_SEED_DROUGHT_RUN should fire');
    });

    // THEME_SEED_DROUGHT_RUN no-fire:
    // seeds at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('THEME_SEED_DROUGHT_RUN does not fire when seeds are distributed without a long drought', async () => {
      const recs696cn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs696cn[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs696cn[4] = makeSharedRecord(4, { seededClueIds: ['clue-b'] });
      recs696cn[9] = makeSharedRecord(9, { seededClueIds: ['clue-c'] });
      const res = await runT696(recs696cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_SEED_DROUGHT_RUN'), 'THEME_SEED_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 682 — themePass: theme clock delta peak uncaused, theme staging drought run, theme character moment zone cluster', async () => {
    const runT682 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // THEME_CLOCK_DELTA_PEAK_UNCAUSED fire:
    // 8 scenes; clockDelta at 2 (delta 1) and 6 (delta 5, the peak); no dramaticTurn or revelation
    // at 6, 5, or 4
    it('THEME_CLOCK_DELTA_PEAK_UNCAUSED fires when the peak clock-delta scene has no dramatic turn or revelation nearby', async () => {
      const recs682a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs682a[2] = makeSharedRecord(2, { clockDelta: 1 });
      recs682a[6] = makeSharedRecord(6, { clockDelta: 5 });
      const res = await runT682(recs682a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_CLOCK_DELTA_PEAK_UNCAUSED'), 'THEME_CLOCK_DELTA_PEAK_UNCAUSED should fire');
    });

    // THEME_CLOCK_DELTA_PEAK_UNCAUSED no-fire:
    // revelation at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('THEME_CLOCK_DELTA_PEAK_UNCAUSED does not fire when a revelation precedes the peak within the lookback', async () => {
      const recs682an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs682an[2] = makeSharedRecord(2, { clockDelta: 1 });
      recs682an[5] = makeSharedRecord(5, { revelation: 'the deadline was moved up' });
      recs682an[6] = makeSharedRecord(6, { clockDelta: 5 });
      const res = await runT682(recs682an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_CLOCK_DELTA_PEAK_UNCAUSED'), 'THEME_CLOCK_DELTA_PEAK_UNCAUSED should not fire');
    });

    // THEME_STAGING_DROUGHT_RUN fire:
    // 10 scenes; visual beats at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('THEME_STAGING_DROUGHT_RUN fires when the longest no-visual-beat run is ≥6', async () => {
      const recs682b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs682b[0] = makeSharedRecord(0, { visualBeats: ['rain streaks the window'] });
      recs682b[1] = makeSharedRecord(1, { visualBeats: ['a photo turned face-down'] });
      recs682b[2] = makeSharedRecord(2, { visualBeats: ['the clock stopped at noon'] });
      recs682b[9] = makeSharedRecord(9, { visualBeats: ['the door swings open'] });
      const res = await runT682(recs682b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_STAGING_DROUGHT_RUN'), 'THEME_STAGING_DROUGHT_RUN should fire');
    });

    // THEME_STAGING_DROUGHT_RUN no-fire:
    // visual beats at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('THEME_STAGING_DROUGHT_RUN does not fire when visual beats are distributed without a long drought', async () => {
      const recs682bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs682bn[0] = makeSharedRecord(0, { visualBeats: ['rain streaks the window'] });
      recs682bn[4] = makeSharedRecord(4, { visualBeats: ['a photo turned face-down'] });
      recs682bn[9] = makeSharedRecord(9, { visualBeats: ['the door swings open'] });
      const res = await runT682(recs682bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_STAGING_DROUGHT_RUN'), 'THEME_STAGING_DROUGHT_RUN should not fire');
    });

    // THEME_CHARACTER_MOMENT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; character-moment scenes at 0,1,2 → 100% opening third
    it('THEME_CHARACTER_MOMENT_ZONE_CLUSTER fires when >75% of character-moment scenes cluster in one third', async () => {
      const recs682c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs682c[0] = makeSharedRecord(0, { purpose: 'character_moment' });
      recs682c[1] = makeSharedRecord(1, { purpose: 'character_moment' });
      recs682c[2] = makeSharedRecord(2, { purpose: 'character_moment' });
      const res = await runT682(recs682c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_CHARACTER_MOMENT_ZONE_CLUSTER'), 'THEME_CHARACTER_MOMENT_ZONE_CLUSTER should fire');
    });

    // THEME_CHARACTER_MOMENT_ZONE_CLUSTER no-fire:
    // character-moment scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('THEME_CHARACTER_MOMENT_ZONE_CLUSTER does not fire when character-moment scenes are distributed across thirds', async () => {
      const recs682cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs682cn[0] = makeSharedRecord(0, { purpose: 'character_moment' });
      recs682cn[4] = makeSharedRecord(4, { purpose: 'character_moment' });
      recs682cn[7] = makeSharedRecord(7, { purpose: 'character_moment' });
      const res = await runT682(recs682cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_CHARACTER_MOMENT_ZONE_CLUSTER'), 'THEME_CHARACTER_MOMENT_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 668 — themePass: theme relationship peak uncaused, theme payoff drought run, theme turn zone cluster', async () => {
    const runT668 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // THEME_RELATIONSHIP_PEAK_UNCAUSED fire:
    // 8 scenes; shifts at 2 (1 shift) and 6 (5 shifts, the peak); no dramaticTurn or revelation at
    // 6, 5, or 4
    it('THEME_RELATIONSHIP_PEAK_UNCAUSED fires when the peak relationship-shift scene has no dramatic turn or revelation nearby', async () => {
      const recs668a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs668a[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs668a[6] = makeSharedRecord(6, { relationshipShifts: [0, 1, 2, 3, 4].map(n => ({ pairKey: `a|${n}`, dimension: 'trust', amount: 0.2 })) });
      const res = await runT668(recs668a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_RELATIONSHIP_PEAK_UNCAUSED'), 'THEME_RELATIONSHIP_PEAK_UNCAUSED should fire');
    });

    // THEME_RELATIONSHIP_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('THEME_RELATIONSHIP_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs668an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs668an[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs668an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs668an[6] = makeSharedRecord(6, { relationshipShifts: [0, 1, 2, 3, 4].map(n => ({ pairKey: `a|${n}`, dimension: 'trust', amount: 0.2 })) });
      const res = await runT668(recs668an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_RELATIONSHIP_PEAK_UNCAUSED'), 'THEME_RELATIONSHIP_PEAK_UNCAUSED should not fire');
    });

    // THEME_PAYOFF_DROUGHT_RUN fire:
    // 10 scenes; payoffs at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('THEME_PAYOFF_DROUGHT_RUN fires when the longest no-payoff run is ≥6', async () => {
      const recs668b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs668b[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs668b[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs668b[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-c'] });
      recs668b[9] = makeSharedRecord(9, { payoffSetupIds: ['thread-d'] });
      const res = await runT668(recs668b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_PAYOFF_DROUGHT_RUN'), 'THEME_PAYOFF_DROUGHT_RUN should fire');
    });

    // THEME_PAYOFF_DROUGHT_RUN no-fire:
    // payoffs at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('THEME_PAYOFF_DROUGHT_RUN does not fire when payoffs are distributed without a long drought', async () => {
      const recs668bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs668bn[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs668bn[4] = makeSharedRecord(4, { payoffSetupIds: ['thread-b'] });
      recs668bn[9] = makeSharedRecord(9, { payoffSetupIds: ['thread-c'] });
      const res = await runT668(recs668bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_PAYOFF_DROUGHT_RUN'), 'THEME_PAYOFF_DROUGHT_RUN should not fire');
    });

    // THEME_TURN_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; dramatic-turn scenes at 0,1,2 → 100% opening third
    it('THEME_TURN_ZONE_CLUSTER fires when >75% of dramatic-turn scenes cluster in one third', async () => {
      const recs668c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs668c[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs668c[1] = makeSharedRecord(1, { dramaticTurn: 'reversal' });
      recs668c[2] = makeSharedRecord(2, { dramaticTurn: 'reversal' });
      const res = await runT668(recs668c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_TURN_ZONE_CLUSTER'), 'THEME_TURN_ZONE_CLUSTER should fire');
    });

    // THEME_TURN_ZONE_CLUSTER no-fire:
    // dramatic-turn scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('THEME_TURN_ZONE_CLUSTER does not fire when dramatic-turn scenes are distributed across thirds', async () => {
      const recs668cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs668cn[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs668cn[4] = makeSharedRecord(4, { dramaticTurn: 'reversal' });
      recs668cn[7] = makeSharedRecord(7, { dramaticTurn: 'reversal' });
      const res = await runT668(recs668cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_TURN_ZONE_CLUSTER'), 'THEME_TURN_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 654 — themePass: theme open thread peak uncaused, theme highlight drought run, theme seed zone cluster', async () => {
    const runT654 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // THEME_OPEN_THREAD_PEAK_UNCAUSED fire:
    // 8 scenes; open threads at 2 (1 clue) and 6 (5 clues, the peak); no dramaticTurn or
    // revelation at 6, 5, or 4
    it('THEME_OPEN_THREAD_PEAK_UNCAUSED fires when the peak open-thread scene has no dramatic turn or revelation nearby', async () => {
      const recs654a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs654a[2] = makeSharedRecord(2, { unresolvedClues: ['a'] });
      recs654a[6] = makeSharedRecord(6, { unresolvedClues: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runT654(recs654a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_OPEN_THREAD_PEAK_UNCAUSED'), 'THEME_OPEN_THREAD_PEAK_UNCAUSED should fire');
    });

    // THEME_OPEN_THREAD_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('THEME_OPEN_THREAD_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs654an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs654an[2] = makeSharedRecord(2, { unresolvedClues: ['a'] });
      recs654an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs654an[6] = makeSharedRecord(6, { unresolvedClues: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runT654(recs654an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_OPEN_THREAD_PEAK_UNCAUSED'), 'THEME_OPEN_THREAD_PEAK_UNCAUSED should not fire');
    });

    // THEME_HIGHLIGHT_DROUGHT_RUN fire:
    // 10 scenes; highlights at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('THEME_HIGHLIGHT_DROUGHT_RUN fires when the longest no-highlighted-dialogue run is ≥6', async () => {
      const recs654b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs654b[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs654b[1] = makeSharedRecord(1, { dialogueHighlights: ['line-b'] });
      recs654b[2] = makeSharedRecord(2, { dialogueHighlights: ['line-c'] });
      recs654b[9] = makeSharedRecord(9, { dialogueHighlights: ['line-d'] });
      const res = await runT654(recs654b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_HIGHLIGHT_DROUGHT_RUN'), 'THEME_HIGHLIGHT_DROUGHT_RUN should fire');
    });

    // THEME_HIGHLIGHT_DROUGHT_RUN no-fire:
    // highlights at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('THEME_HIGHLIGHT_DROUGHT_RUN does not fire when highlighted dialogue is distributed without a long drought', async () => {
      const recs654bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs654bn[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs654bn[4] = makeSharedRecord(4, { dialogueHighlights: ['line-b'] });
      recs654bn[9] = makeSharedRecord(9, { dialogueHighlights: ['line-c'] });
      const res = await runT654(recs654bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_HIGHLIGHT_DROUGHT_RUN'), 'THEME_HIGHLIGHT_DROUGHT_RUN should not fire');
    });

    // THEME_SEED_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; seed scenes at 0,1,2 → 100% opening third
    it('THEME_SEED_ZONE_CLUSTER fires when >75% of seed scenes cluster in one third', async () => {
      const recs654c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs654c[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs654c[1] = makeSharedRecord(1, { seededClueIds: ['clue-b'] });
      recs654c[2] = makeSharedRecord(2, { seededClueIds: ['clue-c'] });
      const res = await runT654(recs654c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_SEED_ZONE_CLUSTER'), 'THEME_SEED_ZONE_CLUSTER should fire');
    });

    // THEME_SEED_ZONE_CLUSTER no-fire:
    // seed scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('THEME_SEED_ZONE_CLUSTER does not fire when seed scenes are distributed across thirds', async () => {
      const recs654cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs654cn[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs654cn[4] = makeSharedRecord(4, { seededClueIds: ['clue-b'] });
      recs654cn[7] = makeSharedRecord(7, { seededClueIds: ['clue-c'] });
      const res = await runT654(recs654cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_SEED_ZONE_CLUSTER'), 'THEME_SEED_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 640 — themePass: theme clock drought run, theme staging peak uncaused, theme payoff zone cluster', async () => {
    const runT640 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // THEME_CLOCK_DROUGHT_RUN fire:
    // 10 scenes; clockRaised at 0,8,9; drought run 1-7 = 7 consecutive scenes ≥ 6
    it('THEME_CLOCK_DROUGHT_RUN fires when the longest no-clock run is ≥6', async () => {
      const recs640a = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs640a[0] = makeSharedRecord(0, { clockRaised: true });
      recs640a[8] = makeSharedRecord(8, { clockRaised: true });
      recs640a[9] = makeSharedRecord(9, { clockRaised: true });
      const res = await runT640(recs640a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_CLOCK_DROUGHT_RUN'), 'THEME_CLOCK_DROUGHT_RUN should fire');
    });

    // THEME_CLOCK_DROUGHT_RUN no-fire:
    // clockRaised at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('THEME_CLOCK_DROUGHT_RUN does not fire when clock raises are distributed without a long drought', async () => {
      const recs640an = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs640an[0] = makeSharedRecord(0, { clockRaised: true });
      recs640an[4] = makeSharedRecord(4, { clockRaised: true });
      recs640an[9] = makeSharedRecord(9, { clockRaised: true });
      const res = await runT640(recs640an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_CLOCK_DROUGHT_RUN'), 'THEME_CLOCK_DROUGHT_RUN should not fire');
    });

    // THEME_STAGING_PEAK_UNCAUSED fire:
    // 8 scenes; visualBeats present at 2 (1 beat) and 6 (5 beats, the peak); no revelation or
    // dramaticTurn at 6, 5, or 4
    it('THEME_STAGING_PEAK_UNCAUSED fires when the peak physical-staging scene has no revelation or dramatic turn nearby', async () => {
      const recs640b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs640b[2] = makeSharedRecord(2, { visualBeats: ['glances at the photo'] });
      recs640b[6] = makeSharedRecord(6, { visualBeats: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runT640(recs640b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_STAGING_PEAK_UNCAUSED'), 'THEME_STAGING_PEAK_UNCAUSED should fire');
    });

    // THEME_STAGING_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('THEME_STAGING_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs640bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs640bn[2] = makeSharedRecord(2, { visualBeats: ['glances at the photo'] });
      recs640bn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs640bn[6] = makeSharedRecord(6, { visualBeats: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runT640(recs640bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_STAGING_PEAK_UNCAUSED'), 'THEME_STAGING_PEAK_UNCAUSED should not fire');
    });

    // THEME_PAYOFF_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; payoffs at 0,1,2 → 100% in opening third
    it('THEME_PAYOFF_ZONE_CLUSTER fires when >75% of payoff scenes cluster in one third', async () => {
      const recs640c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs640c[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs640c[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs640c[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-c'] });
      const res = await runT640(recs640c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_PAYOFF_ZONE_CLUSTER'), 'THEME_PAYOFF_ZONE_CLUSTER should fire');
    });

    // THEME_PAYOFF_ZONE_CLUSTER no-fire:
    // payoffs at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('THEME_PAYOFF_ZONE_CLUSTER does not fire when payoff scenes are distributed across thirds', async () => {
      const recs640cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs640cn[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs640cn[4] = makeSharedRecord(4, { payoffSetupIds: ['thread-b'] });
      recs640cn[7] = makeSharedRecord(7, { payoffSetupIds: ['thread-c'] });
      const res = await runT640(recs640cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_PAYOFF_ZONE_CLUSTER'), 'THEME_PAYOFF_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 626 — themePass: theme payoff staging decoupled, theme seed dialogue highlight aftermath void, theme payoff zone imbalance', async () => {
    const runT626 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'redemption courage hope' },
      });
    };

    // THEME_PAYOFF_STAGING_DECOUPLED fire:
    // n=6; payoffs at 0,1 (no staging); staged at 4,5 (no payoff) → zero overlap → fires
    it('THEME_PAYOFF_STAGING_DECOUPLED fires when payoff scenes and visually-staged scenes never overlap', async () => {
      const recs626a = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs626a[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs626a[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs626a[4] = makeSharedRecord(4, { visualBeats: ['returns the ring', 'closes the box'] });
      recs626a[5] = makeSharedRecord(5, { visualBeats: ['returns the ring', 'closes the box'] });
      const res = await runT626(recs626a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_PAYOFF_STAGING_DECOUPLED'), 'THEME_PAYOFF_STAGING_DECOUPLED should fire');
    });

    // THEME_PAYOFF_STAGING_DECOUPLED no-fire:
    // scene 0 carries BOTH a payoff and visual staging → overlap exists
    it('THEME_PAYOFF_STAGING_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs626an = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs626an[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'], visualBeats: ['returns the ring', 'closes the box'] });
      recs626an[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs626an[5] = makeSharedRecord(5, { visualBeats: ['returns the ring', 'closes the box'] });
      const res = await runT626(recs626an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_PAYOFF_STAGING_DECOUPLED'), 'THEME_PAYOFF_STAGING_DECOUPLED should not fire');
    });

    // THEME_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fire:
    // n=8, window=2; seed triggers at 0,1; their windows {1,2} and {2,3} carry no dialogue
    // highlight; highlights exist elsewhere at 5,6,7 → fires
    it('THEME_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when no seed is followed by a dialogue highlight within 2 scenes', async () => {
      const recs626b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs626b[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs626b[1] = makeSharedRecord(1, { seededClueIds: ['clue-b'] });
      recs626b[5] = makeSharedRecord(5, { dialogueHighlights: ['line-a'] });
      recs626b[6] = makeSharedRecord(6, { dialogueHighlights: ['line-b'] });
      recs626b[7] = makeSharedRecord(7, { dialogueHighlights: ['line-c'] });
      const res = await runT626(recs626b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'THEME_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    // THEME_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries a highlight → that trigger's
    // aftermath is no longer void
    it('THEME_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a trigger window contains a dialogue highlight', async () => {
      const recs626bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs626bn[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs626bn[1] = makeSharedRecord(1, { seededClueIds: ['clue-b'] });
      recs626bn[3] = makeSharedRecord(3, { dialogueHighlights: ['line-a'] });
      recs626bn[5] = makeSharedRecord(5, { dialogueHighlights: ['line-b'] });
      recs626bn[6] = makeSharedRecord(6, { dialogueHighlights: ['line-c'] });
      recs626bn[7] = makeSharedRecord(7, { dialogueHighlights: ['line-d'] });
      const res = await runT626(recs626bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'THEME_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });

    // THEME_PAYOFF_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); payoffs at 6,7,8,9; zone 2 (6-8)=3, zone 3 (9)=1, total=4;
    // zones 0,1 empty; bloatZoneIdx=zone2, 3/4=75% ≥ 50% → fires
    it('THEME_PAYOFF_ZONE_IMBALANCE fires when one zone is empty of payoffs while another is bloated', async () => {
      const recs626c = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs626c[6] = makeSharedRecord(6, { payoffSetupIds: ['thread'] });
      recs626c[7] = makeSharedRecord(7, { payoffSetupIds: ['thread'] });
      recs626c[8] = makeSharedRecord(8, { payoffSetupIds: ['thread'] });
      recs626c[9] = makeSharedRecord(9, { payoffSetupIds: ['thread'] });
      const res = await runT626(recs626c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_PAYOFF_ZONE_IMBALANCE'), 'THEME_PAYOFF_ZONE_IMBALANCE should fire');
    });

    // THEME_PAYOFF_ZONE_IMBALANCE no-fire:
    // one payoff per zone (1,4,7,10) → no zone is empty
    it('THEME_PAYOFF_ZONE_IMBALANCE does not fire when payoffs are spread across all zones', async () => {
      const recs626cn = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs626cn[1] = makeSharedRecord(1, { payoffSetupIds: ['thread'] });
      recs626cn[4] = makeSharedRecord(4, { payoffSetupIds: ['thread'] });
      recs626cn[7] = makeSharedRecord(7, { payoffSetupIds: ['thread'] });
      recs626cn[10] = makeSharedRecord(10, { payoffSetupIds: ['thread'] });
      const res = await runT626(recs626cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_PAYOFF_ZONE_IMBALANCE'), 'THEME_PAYOFF_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 612 — themePass: visual beat decoupled, visual beat zone imbalance, visual beat aftermath silent', async () => {
    const THEME612 = 'redemption courage hope';
    const themed612 = ['act of redemption'];
    const staged612 = ['examines the photograph', 'grips the railing'];
    const runT612 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: THEME612 },
      });
    };

    it('THEME_VISUAL_BEAT_DECOUPLED fires when no visually-staged scene is thematically resonant', async () => {
      // 6 scenes; staged at 0,1 (visualBeats≥2); resonant at 4,5 — zero overlap
      const recs612a = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs612a[0] = makeSharedRecord(0, { visualBeats: staged612 });
      recs612a[1] = makeSharedRecord(1, { visualBeats: staged612 });
      recs612a[4] = makeSharedRecord(4, { dialogueHighlights: themed612 });
      recs612a[5] = makeSharedRecord(5, { dialogueHighlights: themed612 });
      const res = await runT612(recs612a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_VISUAL_BEAT_DECOUPLED'), 'THEME_VISUAL_BEAT_DECOUPLED should fire');
    });

    it('THEME_VISUAL_BEAT_DECOUPLED does not fire when a visually-staged scene is also resonant', async () => {
      const recs612a = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs612a[0] = makeSharedRecord(0, { visualBeats: staged612, dialogueHighlights: themed612 });
      recs612a[1] = makeSharedRecord(1, { visualBeats: staged612 });
      recs612a[4] = makeSharedRecord(4, { dialogueHighlights: themed612 });
      const res = await runT612(recs612a);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_VISUAL_BEAT_DECOUPLED'), 'THEME_VISUAL_BEAT_DECOUPLED should not fire');
    });

    it('THEME_VISUAL_BEAT_ZONE_IMBALANCE fires when one zone has zero visually-staged scenes and another has ≥50%', async () => {
      // 12 scenes, 4 zones of 3: staged at 6,7,8 (zone 2) plus 9 (zone 3) to meet minCount=4
      const recs612b = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs612b[6] = makeSharedRecord(6, { visualBeats: staged612 });
      recs612b[7] = makeSharedRecord(7, { visualBeats: staged612 });
      recs612b[8] = makeSharedRecord(8, { visualBeats: staged612 });
      recs612b[9] = makeSharedRecord(9, { visualBeats: staged612 });
      const res = await runT612(recs612b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_VISUAL_BEAT_ZONE_IMBALANCE'), 'THEME_VISUAL_BEAT_ZONE_IMBALANCE should fire');
    });

    it('THEME_VISUAL_BEAT_ZONE_IMBALANCE does not fire when visually-staged scenes are spread across all zones', async () => {
      const recs612b = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs612b[1] = makeSharedRecord(1, { visualBeats: staged612 });
      recs612b[4] = makeSharedRecord(4, { visualBeats: staged612 });
      recs612b[7] = makeSharedRecord(7, { visualBeats: staged612 });
      recs612b[10] = makeSharedRecord(10, { visualBeats: staged612 });
      const res = await runT612(recs612b);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_VISUAL_BEAT_ZONE_IMBALANCE'), 'THEME_VISUAL_BEAT_ZONE_IMBALANCE should not fire');
    });

    it('THEME_VISUAL_BEAT_AFTERMATH_SILENT fires when no visually-staged scene is followed by a resonant scene within 2', async () => {
      // 9 scenes; staged at 0,1,2 (windows reach at most scene 4); resonant at 7,8 (outside every window)
      const recs612c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs612c[0] = makeSharedRecord(0, { visualBeats: staged612 });
      recs612c[1] = makeSharedRecord(1, { visualBeats: staged612 });
      recs612c[2] = makeSharedRecord(2, { visualBeats: staged612 });
      recs612c[7] = makeSharedRecord(7, { dialogueHighlights: themed612 });
      recs612c[8] = makeSharedRecord(8, { dialogueHighlights: themed612 });
      const res = await runT612(recs612c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_VISUAL_BEAT_AFTERMATH_SILENT'), 'THEME_VISUAL_BEAT_AFTERMATH_SILENT should fire');
    });

    it('THEME_VISUAL_BEAT_AFTERMATH_SILENT does not fire when a visually-staged scene is followed by a resonant scene within 2', async () => {
      // staged at 0,1,2; scene 2 is ALSO resonant — within trigger@0's window (off=2) and
      // trigger@1's window (off=1), breaking void for both regardless of trigger@2
      const recs612cnr = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs612cnr[0] = makeSharedRecord(0, { visualBeats: staged612 });
      recs612cnr[1] = makeSharedRecord(1, { visualBeats: staged612 });
      recs612cnr[2] = makeSharedRecord(2, { visualBeats: staged612, dialogueHighlights: themed612 });
      recs612cnr[7] = makeSharedRecord(7, { dialogueHighlights: themed612 });
      const res = await runT612(recs612cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_VISUAL_BEAT_AFTERMATH_SILENT'), 'THEME_VISUAL_BEAT_AFTERMATH_SILENT should not fire');
    });
  });

  describe('Wave 598 — themePass: unresolved clue decoupled, unresolved clue zone imbalance, unresolved clue aftermath silent', async () => {
    const THEME598 = 'redemption courage hope';
    const themed598 = ['act of redemption'];
    const runT598 = async (records: ScreenplaySceneRecord[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: THEME598 },
      });
    };

    it('THEME_UNRESOLVED_CLUE_DECOUPLED fires when no debt-carrying scene is thematically resonant', async () => {
      // 6 scenes; debt at 0,1 (unresolvedClues non-empty); resonant at 4,5 — zero overlap
      const recs598a = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs598a[0] = makeSharedRecord(0, { unresolvedClues: ['clue-a'] });
      recs598a[1] = makeSharedRecord(1, { unresolvedClues: ['clue-b'] });
      recs598a[4] = makeSharedRecord(4, { dialogueHighlights: themed598 });
      recs598a[5] = makeSharedRecord(5, { dialogueHighlights: themed598 });
      const res = await runT598(recs598a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_UNRESOLVED_CLUE_DECOUPLED'), 'THEME_UNRESOLVED_CLUE_DECOUPLED should fire');
    });

    it('THEME_UNRESOLVED_CLUE_DECOUPLED does not fire when a debt-carrying scene is also resonant', async () => {
      const recs598a = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs598a[0] = makeSharedRecord(0, { unresolvedClues: ['clue-a'], dialogueHighlights: themed598 });
      recs598a[1] = makeSharedRecord(1, { unresolvedClues: ['clue-b'] });
      recs598a[4] = makeSharedRecord(4, { dialogueHighlights: themed598 });
      const res = await runT598(recs598a);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_UNRESOLVED_CLUE_DECOUPLED'), 'THEME_UNRESOLVED_CLUE_DECOUPLED should not fire');
    });

    it('THEME_UNRESOLVED_CLUE_ZONE_IMBALANCE fires when one zone has zero debt-carrying scenes and another has ≥50%', async () => {
      // 12 scenes, 4 zones of 3: debt at 6,7,8 (zone 2) plus 9 (zone 3) to meet minCount=4
      const recs598b = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs598b[6] = makeSharedRecord(6, { unresolvedClues: ['a'] });
      recs598b[7] = makeSharedRecord(7, { unresolvedClues: ['b'] });
      recs598b[8] = makeSharedRecord(8, { unresolvedClues: ['c'] });
      recs598b[9] = makeSharedRecord(9, { unresolvedClues: ['d'] });
      const res = await runT598(recs598b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_UNRESOLVED_CLUE_ZONE_IMBALANCE'), 'THEME_UNRESOLVED_CLUE_ZONE_IMBALANCE should fire');
    });

    it('THEME_UNRESOLVED_CLUE_ZONE_IMBALANCE does not fire when debt-carrying scenes are spread across all zones', async () => {
      const recs598b = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs598b[1] = makeSharedRecord(1, { unresolvedClues: ['a'] });
      recs598b[4] = makeSharedRecord(4, { unresolvedClues: ['b'] });
      recs598b[7] = makeSharedRecord(7, { unresolvedClues: ['c'] });
      recs598b[10] = makeSharedRecord(10, { unresolvedClues: ['d'] });
      const res = await runT598(recs598b);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_UNRESOLVED_CLUE_ZONE_IMBALANCE'), 'THEME_UNRESOLVED_CLUE_ZONE_IMBALANCE should not fire');
    });

    it('THEME_UNRESOLVED_CLUE_AFTERMATH_SILENT fires when no debt-carrying scene is followed by a resonant scene within 2', async () => {
      // 9 scenes; debt at 0,1,2 (windows reach at most scene 4); resonant at 7,8 (outside every window)
      const recs598c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs598c[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs598c[1] = makeSharedRecord(1, { unresolvedClues: ['b'] });
      recs598c[2] = makeSharedRecord(2, { unresolvedClues: ['c'] });
      recs598c[7] = makeSharedRecord(7, { dialogueHighlights: themed598 });
      recs598c[8] = makeSharedRecord(8, { dialogueHighlights: themed598 });
      const res = await runT598(recs598c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_UNRESOLVED_CLUE_AFTERMATH_SILENT'), 'THEME_UNRESOLVED_CLUE_AFTERMATH_SILENT should fire');
    });

    it('THEME_UNRESOLVED_CLUE_AFTERMATH_SILENT does not fire when a debt-carrying scene is followed by a resonant scene within 2', async () => {
      // debt at 0,1,2; scene 2 is ALSO resonant — within trigger@0's window (off=2) and
      // trigger@1's window (off=1), breaking void for both regardless of trigger@2
      const recs598cnr = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs598cnr[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs598cnr[1] = makeSharedRecord(1, { unresolvedClues: ['b'] });
      recs598cnr[2] = makeSharedRecord(2, { unresolvedClues: ['c'], dialogueHighlights: themed598 });
      recs598cnr[7] = makeSharedRecord(7, { dialogueHighlights: themed598 });
      const res = await runT598(recs598cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_UNRESOLVED_CLUE_AFTERMATH_SILENT'), 'THEME_UNRESOLVED_CLUE_AFTERMATH_SILENT should not fire');
    });
  });

  describe('Wave 584 — themePass: resonant aftermath turn void, resonant emotion flat, resonant clock flat', async () => {
    const makeRec584 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const THEME584 = 'redemption courage hope';
    const themed584 = ['act of redemption'];
    const runT584 = async (records: any[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: THEME584 },
      });
    };

    // THEME_RESONANT_AFTERMATH_TURN_VOID fire:
    // 10 scenes; resonant at 0,4 (pos<8); turns at 7,8 (not in aftermath windows [1,2] or [5,6]) → fires
    it('THEME_RESONANT_AFTERMATH_TURN_VOID fires when no resonant scene is followed by a turn within 2', async () => {
      const recs584a = Array.from({ length: 10 }, (_, i) => makeRec584(i, {
        dialogueHighlights: [0, 4].includes(i) ? themed584 : [],
        dramaticTurn: [7, 8].includes(i) ? 'reversal' : 'nothing',
      }));
      const res = await runT584(recs584a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_RESONANT_AFTERMATH_TURN_VOID'), 'THEME_RESONANT_AFTERMATH_TURN_VOID should fire');
    });

    // THEME_RESONANT_AFTERMATH_TURN_VOID no-fire:
    // same setup but turn at 1 (aftermath of resonant@0=[1,2]) → overlaps → no fire
    it('THEME_RESONANT_AFTERMATH_TURN_VOID does not fire when a turn follows a resonant scene within 2', async () => {
      const recs584anr = Array.from({ length: 10 }, (_, i) => makeRec584(i, {
        dialogueHighlights: [0, 4].includes(i) ? themed584 : [],
        dramaticTurn: [1, 7].includes(i) ? 'reversal' : 'nothing',
      }));
      const res = await runT584(recs584anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_RESONANT_AFTERMATH_TURN_VOID'), 'THEME_RESONANT_AFTERMATH_TURN_VOID should not fire');
    });

    // THEME_RESONANT_EMOTION_FLAT fire:
    // 8 scenes; resonant at 0,1,2,3 (all neutral); emotional at 5,6 (negative) → fires
    it('THEME_RESONANT_EMOTION_FLAT fires when all resonant scenes are emotionally neutral', async () => {
      const recs584b = Array.from({ length: 8 }, (_, i) => makeRec584(i, {
        dialogueHighlights: [0, 1, 2, 3].includes(i) ? themed584 : [],
        emotionalShift: [5, 6].includes(i) ? 'negative' : 'neutral',
      }));
      const res = await runT584(recs584b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_RESONANT_EMOTION_FLAT'), 'THEME_RESONANT_EMOTION_FLAT should fire');
    });

    // THEME_RESONANT_EMOTION_FLAT no-fire:
    // resonant at 0,1,2,3; scene 2 has emotionalShift='negative' → not all neutral → no fire
    it('THEME_RESONANT_EMOTION_FLAT does not fire when a resonant scene carries emotion', async () => {
      const recs584bnr = Array.from({ length: 8 }, (_, i) => makeRec584(i, {
        dialogueHighlights: [0, 1, 2, 3].includes(i) ? themed584 : [],
        emotionalShift: [2, 5].includes(i) ? 'negative' : 'neutral',
      }));
      const res = await runT584(recs584bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_RESONANT_EMOTION_FLAT'), 'THEME_RESONANT_EMOTION_FLAT should not fire');
    });

    // THEME_RESONANT_CLOCK_FLAT fire:
    // 8 scenes; resonant at 0,2,4 (all clockRaised=false); clock at 6,7 → fires
    it('THEME_RESONANT_CLOCK_FLAT fires when all resonant scenes have no clock raised', async () => {
      const recs584c = Array.from({ length: 8 }, (_, i) => makeRec584(i, {
        dialogueHighlights: [0, 2, 4].includes(i) ? themed584 : [],
        clockRaised: [6, 7].includes(i),
      }));
      const res = await runT584(recs584c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_RESONANT_CLOCK_FLAT'), 'THEME_RESONANT_CLOCK_FLAT should fire');
    });

    // THEME_RESONANT_CLOCK_FLAT no-fire:
    // resonant at 0,2,4; scene 2 also has clockRaised=true → not all clock-free → no fire
    it('THEME_RESONANT_CLOCK_FLAT does not fire when a resonant scene has a clock raised', async () => {
      const recs584cnr = Array.from({ length: 8 }, (_, i) => makeRec584(i, {
        dialogueHighlights: [0, 2, 4].includes(i) ? themed584 : [],
        clockRaised: [2, 6].includes(i),
      }));
      const res = await runT584(recs584cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_RESONANT_CLOCK_FLAT'), 'THEME_RESONANT_CLOCK_FLAT should not fire');
    });
  });


  describe('Wave 570 — themePass: resonant aftermath emotion void, resonant aftermath relationship void, resonant aftermath clock void', async () => {
    const makeRec570 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const THEME570 = 'redemption forgiveness courage';
    const themed570 = ['act of redemption'];
    const mkRel570 = () => [{ pairKey: 'A|B', dimension: 'trust', amount: 0.3 }];
    const runT570 = async (records: any[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: THEME570 },
      });
    };

    // THEME_RESONANT_AFTERMATH_EMOTION_VOID fire:
    // 10 scenes: resonant at 0,5 (pos<8); emotion at 8,9 (≥2, outside aftermath windows [1,2],[6,7]) → fire
    it('THEME_RESONANT_AFTERMATH_EMOTION_VOID fires when no resonant scene is followed by an emotional shift within 2', async () => {
      const recs570a = Array.from({ length: 10 }, (_, i) =>
        makeRec570(i, {
          dialogueHighlights: [0, 5].includes(i) ? themed570 : [],
          emotionalShift: [8, 9].includes(i) ? 'negative' : 'neutral',
        }),
      );
      const res = await runT570(recs570a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_RESONANT_AFTERMATH_EMOTION_VOID'), 'THEME_RESONANT_AFTERMATH_EMOTION_VOID should fire');
    });

    // THEME_RESONANT_AFTERMATH_EMOTION_VOID no-fire:
    // emotion at 1 (aftermath of resonant@0) and 8 → resonant@0 followed by emotion → no fire
    it('THEME_RESONANT_AFTERMATH_EMOTION_VOID does not fire when a resonant aftermath carries emotion', async () => {
      const recs570an = Array.from({ length: 10 }, (_, i) =>
        makeRec570(i, {
          dialogueHighlights: [0, 5].includes(i) ? themed570 : [],
          emotionalShift: [1, 8].includes(i) ? 'negative' : 'neutral',
        }),
      );
      const res = await runT570(recs570an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_RESONANT_AFTERMATH_EMOTION_VOID'), 'THEME_RESONANT_AFTERMATH_EMOTION_VOID should not fire');
    });

    // THEME_RESONANT_AFTERMATH_RELATIONSHIP_VOID fire:
    // resonant at 0,5; relationship shifts at 8,9 (outside aftermath windows) → fire
    it('THEME_RESONANT_AFTERMATH_RELATIONSHIP_VOID fires when no resonant scene is followed by a relationship shift within 2', async () => {
      const recs570b = Array.from({ length: 10 }, (_, i) =>
        makeRec570(i, {
          dialogueHighlights: [0, 5].includes(i) ? themed570 : [],
          relationshipShifts: [8, 9].includes(i) ? mkRel570() : [],
        }),
      );
      const res = await runT570(recs570b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_RESONANT_AFTERMATH_RELATIONSHIP_VOID'), 'THEME_RESONANT_AFTERMATH_RELATIONSHIP_VOID should fire');
    });

    // THEME_RESONANT_AFTERMATH_RELATIONSHIP_VOID no-fire:
    // relationship shift at 1 (aftermath of resonant@0) and 8 → no fire
    it('THEME_RESONANT_AFTERMATH_RELATIONSHIP_VOID does not fire when a resonant aftermath moves a bond', async () => {
      const recs570bn = Array.from({ length: 10 }, (_, i) =>
        makeRec570(i, {
          dialogueHighlights: [0, 5].includes(i) ? themed570 : [],
          relationshipShifts: [1, 8].includes(i) ? mkRel570() : [],
        }),
      );
      const res = await runT570(recs570bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_RESONANT_AFTERMATH_RELATIONSHIP_VOID'), 'THEME_RESONANT_AFTERMATH_RELATIONSHIP_VOID should not fire');
    });

    // THEME_RESONANT_AFTERMATH_CLOCK_VOID fire:
    // resonant at 0,5; clocks at 8,9 (outside aftermath windows) → fire
    it('THEME_RESONANT_AFTERMATH_CLOCK_VOID fires when no resonant scene is followed by a clock within 2', async () => {
      const recs570c = Array.from({ length: 10 }, (_, i) =>
        makeRec570(i, {
          dialogueHighlights: [0, 5].includes(i) ? themed570 : [],
          clockRaised: [8, 9].includes(i),
        }),
      );
      const res = await runT570(recs570c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_RESONANT_AFTERMATH_CLOCK_VOID'), 'THEME_RESONANT_AFTERMATH_CLOCK_VOID should fire');
    });

    // THEME_RESONANT_AFTERMATH_CLOCK_VOID no-fire:
    // clock at 1 (aftermath of resonant@0) and 8 → no fire
    it('THEME_RESONANT_AFTERMATH_CLOCK_VOID does not fire when a resonant aftermath raises a clock', async () => {
      const recs570cn = Array.from({ length: 10 }, (_, i) =>
        makeRec570(i, {
          dialogueHighlights: [0, 5].includes(i) ? themed570 : [],
          clockRaised: [1, 8].includes(i),
        }),
      );
      const res = await runT570(recs570cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_RESONANT_AFTERMATH_CLOCK_VOID'), 'THEME_RESONANT_AFTERMATH_CLOCK_VOID should not fire');
    });
  });


  describe('Wave 556 — themePass: resonant aftermath suspense void, resonant curiosity flat, dialogue highlight decoupled', async () => {
    const makeRec556 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const THEME556 = 'redemption forgiveness courage';
    const themed556 = ['act of redemption'];
    const unthemed556 = ['hello world today'];
    const runT556 = async (records: any[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: THEME556 },
      });
    };

    it('THEME_RESONANT_AFTERMATH_SUSPENSE_VOID fires when no resonant scene is followed by a suspense spike within 2', async () => {
      // 10 scenes: resonant at 0,5 (pos<8, qualResonant=2); suspense at 8,9 — outside aftermath windows [1-2],[6-7] → fire
      const recs556a = Array.from({ length: 10 }, (_, i) =>
        makeRec556(i, {
          dialogueHighlights: [0, 5].includes(i) ? themed556 : [],
          suspenseDelta: [8, 9].includes(i) ? 1 : 0,
        }),
      );
      const res = await runT556(recs556a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_RESONANT_AFTERMATH_SUSPENSE_VOID'), 'THEME_RESONANT_AFTERMATH_SUSPENSE_VOID should fire');
    });

    it('THEME_RESONANT_AFTERMATH_SUSPENSE_VOID does not fire when a resonant scene is followed by a suspense spike', async () => {
      // 10 scenes: resonant at 0,5; suspense at 1 (within aftermath of resonant at 0) → no fire
      const recs556an = Array.from({ length: 10 }, (_, i) =>
        makeRec556(i, {
          dialogueHighlights: [0, 5].includes(i) ? themed556 : [],
          suspenseDelta: [1, 8].includes(i) ? 1 : 0,
        }),
      );
      const res = await runT556(recs556an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_RESONANT_AFTERMATH_SUSPENSE_VOID'), 'THEME_RESONANT_AFTERMATH_SUSPENSE_VOID should not fire');
    });

    it('THEME_RESONANT_CURIOSITY_FLAT fires when all resonant scenes have curiosityDelta ≤ 0 while curiosity spikes exist', async () => {
      // 10 scenes: resonant at 0,3,7 (dialogueHighlights=themed); curiosityDelta=0 on all resonant scenes;
      // curiosity spikes at 5,8 (curiosityDelta=1) → ≥2 curiosity scenes; all resonant flat → fire
      const recs556b = Array.from({ length: 10 }, (_, i) =>
        makeRec556(i, {
          dialogueHighlights: [0, 3, 7].includes(i) ? themed556 : [],
          curiosityDelta: [5, 8].includes(i) ? 1 : 0,
        }),
      );
      const res = await runT556(recs556b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_RESONANT_CURIOSITY_FLAT'), 'THEME_RESONANT_CURIOSITY_FLAT should fire');
    });

    it('THEME_RESONANT_CURIOSITY_FLAT does not fire when at least one resonant scene has curiosityDelta > 0', async () => {
      // 10 scenes: resonant at 0,3,7; resonant at 7 also has curiosityDelta=1 → one resonant has curiosity → no fire
      const recs556bn = Array.from({ length: 10 }, (_, i) =>
        makeRec556(i, {
          dialogueHighlights: [0, 3, 7].includes(i) ? themed556 : [],
          curiosityDelta: [5, 7, 8].includes(i) ? 1 : 0,
        }),
      );
      const res = await runT556(recs556bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_RESONANT_CURIOSITY_FLAT'), 'THEME_RESONANT_CURIOSITY_FLAT should not fire');
    });

    it('THEME_DIALOGUE_HIGHLIGHT_DECOUPLED fires when all 3+ dialogue-highlight scenes are thematically silent', async () => {
      // 10 scenes: dialogue highlights at 0,2,4 all unthemed (silent);
      // scene 7 has revelation with theme text → resonant (ensures silentScenes.length < n so gate opens);
      // dlgHighScenes=3, all silent → fire
      const recs556c = Array.from({ length: 10 }, (_, i) =>
        makeRec556(i, {
          dialogueHighlights: [0, 2, 4].includes(i) ? unthemed556 : [],
          revelation: i === 7 ? 'act of redemption' : null,
        }),
      );
      const res = await runT556(recs556c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_DIALOGUE_HIGHLIGHT_DECOUPLED'), 'THEME_DIALOGUE_HIGHLIGHT_DECOUPLED should fire');
    });

    it('THEME_DIALOGUE_HIGHLIGHT_DECOUPLED does not fire when at least one dialogue-highlight scene carries theme', async () => {
      // 10 scenes: dialogue highlights at 0 (unthemed), 2 (unthemed), 4 (themed) → one resonant → no fire
      const recs556cn = Array.from({ length: 10 }, (_, i) =>
        makeRec556(i, {
          dialogueHighlights: i === 4 ? themed556 : [0, 2].includes(i) ? unthemed556 : [],
        }),
      );
      const res = await runT556(recs556cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_DIALOGUE_HIGHLIGHT_DECOUPLED'), 'THEME_DIALOGUE_HIGHLIGHT_DECOUPLED should not fire');
    });
  });


  describe('Wave 542 — themePass: resonant suspense flat, Act 2b resonant causeless, resonant aftermath curiosity void', async () => {
    const makeRec542 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const THEME542 = 'redemption forgiveness courage';
    const themed542 = ['act of redemption'];
    const runT542 = async (records: any[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: THEME542 },
      });
    };

    // THEME_RESONANT_SUSPENSE_FLAT fire:
    // 10 scenes; resonant (dialogueHighlights) at 0,5 both with suspenseDelta=0;
    // suspense scenes at 2,7 (suspenseDelta=1) → ≥2 suspense; all resonant flat → fires
    it('THEME_RESONANT_SUSPENSE_FLAT fires when all resonant scenes have flat suspense while suspense scenes exist', async () => {
      const recs542a = Array.from({ length: 10 }, (_, i) =>
        makeRec542(i, {
          dialogueHighlights: [0, 5].includes(i) ? themed542 : [],
          suspenseDelta: [2, 7].includes(i) ? 1 : 0,
        }),
      );
      const res = await runT542(recs542a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_RESONANT_SUSPENSE_FLAT'), 'THEME_RESONANT_SUSPENSE_FLAT should fire');
    });

    // THEME_RESONANT_SUSPENSE_FLAT no-fire:
    // resonant at 0 (suspenseDelta=0) and 5 (suspenseDelta=1) → one resonant has positive suspense → no fire
    it('THEME_RESONANT_SUSPENSE_FLAT does not fire when at least one resonant scene has positive suspense', async () => {
      const recs542anr = Array.from({ length: 10 }, (_, i) =>
        makeRec542(i, {
          dialogueHighlights: [0, 5].includes(i) ? themed542 : [],
          suspenseDelta: [2, 5, 7].includes(i) ? 1 : 0,
        }),
      );
      const res = await runT542(recs542anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_RESONANT_SUSPENSE_FLAT'), 'THEME_RESONANT_SUSPENSE_FLAT should not fire');
    });

    // THEME_ACT2B_RESONANT_CAUSELESS fire:
    // n=10; Act 2b = [5,7); resonant at 5 (in zone); prior scenes 3,4 fully neutral (no catalysts);
    // global catalysts at 0,9 (suspenseDelta=1) → globalCatalystCount=2; firstAct2bRes=5≥2; !hasCause → fires
    it('THEME_ACT2B_RESONANT_CAUSELESS fires when first Act 2b resonant scene has no catalyst in prior 2 scenes', async () => {
      const recs542b = Array.from({ length: 10 }, (_, i) =>
        makeRec542(i, {
          dialogueHighlights: i === 5 ? themed542 : [],
          suspenseDelta: [0, 9].includes(i) ? 1 : 0,
        }),
      );
      const res = await runT542(recs542b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_ACT2B_RESONANT_CAUSELESS'), 'THEME_ACT2B_RESONANT_CAUSELESS should fire');
    });

    // THEME_ACT2B_RESONANT_CAUSELESS no-fire:
    // n=10; resonant at 5; prior scene 4 has suspenseDelta=1 (a catalyst) → hasCause=true → no fire
    it('THEME_ACT2B_RESONANT_CAUSELESS does not fire when prior scene carries a catalyst', async () => {
      const recs542bnr = Array.from({ length: 10 }, (_, i) =>
        makeRec542(i, {
          dialogueHighlights: i === 5 ? themed542 : [],
          suspenseDelta: [0, 4, 9].includes(i) ? 1 : 0,
        }),
      );
      const res = await runT542(recs542bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_ACT2B_RESONANT_CAUSELESS'), 'THEME_ACT2B_RESONANT_CAUSELESS should not fire');
    });

    // THEME_RESONANT_AFTERMATH_CURIOSITY_VOID fire:
    // 10 scenes; resonant at 0 and 5 (both pos < 8 = n-2); curiosity at 8,9 (outside aftermath
    // windows [1,2] and [6,7]); qualResonant=2, curiosityScenes=2; allResNoCuriosity=true → fires
    it('THEME_RESONANT_AFTERMATH_CURIOSITY_VOID fires when no resonant scene is followed by a curiosity spike', async () => {
      const recs542c = Array.from({ length: 10 }, (_, i) =>
        makeRec542(i, {
          dialogueHighlights: [0, 5].includes(i) ? themed542 : [],
          curiosityDelta: [8, 9].includes(i) ? 1 : 0,
        }),
      );
      const res = await runT542(recs542c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_RESONANT_AFTERMATH_CURIOSITY_VOID'), 'THEME_RESONANT_AFTERMATH_CURIOSITY_VOID should fire');
    });

    // THEME_RESONANT_AFTERMATH_CURIOSITY_VOID no-fire:
    // resonant at 0 and 5; curiosity at 1 (in aftermath window of resonant 0) → not all flat → no fire
    it('THEME_RESONANT_AFTERMATH_CURIOSITY_VOID does not fire when a resonant scene is followed by a curiosity spike', async () => {
      const recs542cnr = Array.from({ length: 10 }, (_, i) =>
        makeRec542(i, {
          dialogueHighlights: [0, 5].includes(i) ? themed542 : [],
          curiosityDelta: [1, 8].includes(i) ? 1 : 0,
        }),
      );
      const res = await runT542(recs542cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_RESONANT_AFTERMATH_CURIOSITY_VOID'), 'THEME_RESONANT_AFTERMATH_CURIOSITY_VOID should not fire');
    });
  });


  describe('Wave 528 — themePass: relationship shift aftermath silent, midpoint resonant causeless, back heavy', async () => {
    const makeRec528 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const THEME528 = 'redemption forgiveness courage';
    const themed528 = ['act of redemption'];
    const runT528 = async (records: any[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: THEME528 },
      });
    };

    // THEME_RELATIONSHIP_SHIFT_AFTERMATH_SILENT fire:
    // 9 scenes; relationship shifts at 1 and 4; themed at 0 and 7 (not positions 2 or 5) → fires
    it('THEME_RELATIONSHIP_SHIFT_AFTERMATH_SILENT fires when no relationship shift is followed by a resonant scene', async () => {
      const recs528a = Array.from({ length: 9 }, (_, i) =>
        makeRec528(i, {
          relationshipShifts: [1, 4].includes(i) ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.5 }] : [],
          dialogueHighlights: [0, 7].includes(i) ? themed528 : [],
        }),
      );
      const res = await runT528(recs528a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_RELATIONSHIP_SHIFT_AFTERMATH_SILENT'), 'THEME_RELATIONSHIP_SHIFT_AFTERMATH_SILENT should fire');
    });

    // THEME_RELATIONSHIP_SHIFT_AFTERMATH_SILENT no-fire:
    // shifts at 1 and 4; scene 2 (after shift 1) is themed → aftermath resonance exists → no fire
    it('THEME_RELATIONSHIP_SHIFT_AFTERMATH_SILENT does not fire when a relationship shift is followed by a resonant scene', async () => {
      const recs528anr = Array.from({ length: 9 }, (_, i) =>
        makeRec528(i, {
          relationshipShifts: [1, 4].includes(i) ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.5 }] : [],
          dialogueHighlights: [2, 7].includes(i) ? themed528 : [],
        }),
      );
      const res = await runT528(recs528anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_RELATIONSHIP_SHIFT_AFTERMATH_SILENT'), 'THEME_RELATIONSHIP_SHIFT_AFTERMATH_SILENT should not fire');
    });

    // THEME_MIDPOINT_RESONANT_CAUSELESS fire:
    // n=10; midpoint zone (40%-60%) = pos 4,5,6; resonant at 4; prior scenes (2,3) have no catalysts;
    // global catalysts at 0,9 (suspense) → globalCatalystCount≥2; firstMidRes=4≥2; !hasCause → fires
    it('THEME_MIDPOINT_RESONANT_CAUSELESS fires when the midpoint resonant scene has no structural catalyst in prior 2 scenes', async () => {
      const recs528b = Array.from({ length: 10 }, (_, i) =>
        makeRec528(i, {
          suspenseDelta: [0, 9].includes(i) ? 2 : 0,
          dialogueHighlights: i === 4 ? themed528 : [],
        }),
      );
      const res = await runT528(recs528b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_MIDPOINT_RESONANT_CAUSELESS'), 'THEME_MIDPOINT_RESONANT_CAUSELESS should fire');
    });

    // THEME_MIDPOINT_RESONANT_CAUSELESS no-fire:
    // same setup but scene 3 (prior to midpoint resonant scene 4) has suspense → hasCause → no fire
    it('THEME_MIDPOINT_RESONANT_CAUSELESS does not fire when the midpoint resonant scene has a catalyst in prior 2 scenes', async () => {
      const recs528bnr = Array.from({ length: 10 }, (_, i) =>
        makeRec528(i, {
          suspenseDelta: [0, 3, 9].includes(i) ? 2 : 0,
          dialogueHighlights: i === 4 ? themed528 : [],
        }),
      );
      const res = await runT528(recs528bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_MIDPOINT_RESONANT_CAUSELESS'), 'THEME_MIDPOINT_RESONANT_CAUSELESS should not fire');
    });

    // THEME_BACK_HEAVY fire:
    // n=10; halfIdx=5; resonant at 1,6,7,8,9 → first half: 1, second half: 4, total: 5 → 80% > 65% → fires
    it('THEME_BACK_HEAVY fires when more than 65% of resonant scenes fall in the second half', async () => {
      const recs528c = Array.from({ length: 10 }, (_, i) =>
        makeRec528(i, {
          dialogueHighlights: [1, 6, 7, 8, 9].includes(i) ? themed528 : [],
        }),
      );
      const res = await runT528(recs528c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_BACK_HEAVY'), 'THEME_BACK_HEAVY should fire');
    });

    // THEME_BACK_HEAVY no-fire:
    // resonant at 1,2,6,7,8 → first half: 2, second half: 3, total: 5 → 60% ≤ 65% → no fire
    it('THEME_BACK_HEAVY does not fire when resonant scenes are distributed across both halves', async () => {
      const recs528cnr = Array.from({ length: 10 }, (_, i) =>
        makeRec528(i, {
          dialogueHighlights: [1, 2, 6, 7, 8].includes(i) ? themed528 : [],
        }),
      );
      const res = await runT528(recs528cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_BACK_HEAVY'), 'THEME_BACK_HEAVY should not fire');
    });
  });


  describe('Wave 514 — themePass: seed aftermath silent, high-suspense aftermath silent, curiosity aftermath silent', async () => {
    const makeRec514 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const THEME514 = 'redemption forgiveness courage';
    const themed514 = ['act of redemption'];
    const runT514 = async (records: any[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: THEME514 },
      });
    };

    it('THEME_SEED_AFTERMATH_SILENT fires when no seed scene is followed by a resonant scene', async () => {
      // 9 scenes: seeds at 1 and 4; themed at 0 and 7 (not at positions 2 or 5, the scenes after seeds) → fires
      const recs514a = Array.from({ length: 9 }, (_, i) =>
        makeRec514(i, {
          seededClueIds: [1, 4].includes(i) ? ['clue-A'] : [],
          dialogueHighlights: [0, 7].includes(i) ? themed514 : [],
        }),
      );
      const res = await runT514(recs514a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_SEED_AFTERMATH_SILENT'), 'THEME_SEED_AFTERMATH_SILENT should fire');
    });

    it('THEME_SEED_AFTERMATH_SILENT does not fire when a seed scene is followed by a resonant scene', async () => {
      // 9 scenes: seeds at 1 and 4; scene 2 (immediately after seed 1) is themed → aftermath resonance exists → no fire
      const recs514anr = Array.from({ length: 9 }, (_, i) =>
        makeRec514(i, {
          seededClueIds: [1, 4].includes(i) ? ['clue-A'] : [],
          dialogueHighlights: [2, 7].includes(i) ? themed514 : [],
        }),
      );
      const res = await runT514(recs514anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_SEED_AFTERMATH_SILENT'), 'THEME_SEED_AFTERMATH_SILENT should not fire');
    });

    it('THEME_HIGH_SUSPENSE_AFTERMATH_SILENT fires when no high-suspense scene is followed by a resonant scene', async () => {
      // 9 scenes: high suspense (>1) at 1 and 4; themed at 0 and 7 (not at positions 2 or 5) → fires
      const recs514b = Array.from({ length: 9 }, (_, i) =>
        makeRec514(i, {
          suspenseDelta: [1, 4].includes(i) ? 2 : 0,
          dialogueHighlights: [0, 7].includes(i) ? themed514 : [],
        }),
      );
      const res = await runT514(recs514b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_HIGH_SUSPENSE_AFTERMATH_SILENT'), 'THEME_HIGH_SUSPENSE_AFTERMATH_SILENT should fire');
    });

    it('THEME_HIGH_SUSPENSE_AFTERMATH_SILENT does not fire when a high-suspense scene is followed by a resonant scene', async () => {
      // 9 scenes: high suspense at 1 and 4; scene 2 (immediately after high-suspense 1) is themed → no fire
      const recs514bnr = Array.from({ length: 9 }, (_, i) =>
        makeRec514(i, {
          suspenseDelta: [1, 4].includes(i) ? 2 : 0,
          dialogueHighlights: [2, 7].includes(i) ? themed514 : [],
        }),
      );
      const res = await runT514(recs514bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_HIGH_SUSPENSE_AFTERMATH_SILENT'), 'THEME_HIGH_SUSPENSE_AFTERMATH_SILENT should not fire');
    });

    it('THEME_CURIOSITY_AFTERMATH_SILENT fires when no curiosity-spike scene is followed by a resonant scene', async () => {
      // 9 scenes: curiosity spikes (>0) at 1 and 4; themed at 0 and 7 (not at positions 2 or 5) → fires
      const recs514c = Array.from({ length: 9 }, (_, i) =>
        makeRec514(i, {
          curiosityDelta: [1, 4].includes(i) ? 1 : 0,
          dialogueHighlights: [0, 7].includes(i) ? themed514 : [],
        }),
      );
      const res = await runT514(recs514c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_CURIOSITY_AFTERMATH_SILENT'), 'THEME_CURIOSITY_AFTERMATH_SILENT should fire');
    });

    it('THEME_CURIOSITY_AFTERMATH_SILENT does not fire when a curiosity scene is followed by a resonant scene', async () => {
      // 9 scenes: curiosity spikes at 1 and 4; scene 2 (immediately after curiosity 1) is themed → no fire
      const recs514cnr = Array.from({ length: 9 }, (_, i) =>
        makeRec514(i, {
          curiosityDelta: [1, 4].includes(i) ? 1 : 0,
          dialogueHighlights: [2, 7].includes(i) ? themed514 : [],
        }),
      );
      const res = await runT514(recs514cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_CURIOSITY_AFTERMATH_SILENT'), 'THEME_CURIOSITY_AFTERMATH_SILENT should not fire');
    });
  });


  describe('Wave 500 — themePass: negative emotion aftermath silent, last resonant causeless, payoff aftermath silent', async () => {
    const makeRec500 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const THEME500 = 'redemption forgiveness courage';
    const themed500 = ['act of redemption'];
    const runT500 = async (records: any[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: THEME500 },
      });
    };

    it('THEME_NEGATIVE_EMOTION_AFTERMATH_SILENT fires when no negative-shift scene is followed by a resonant scene', async () => {
      // 9 scenes: negative at 1 and 4; themed at 0 and 7 (neither immediately after neg scenes 1 or 4) → fires
      const recs500a = Array.from({ length: 9 }, (_, i) =>
        makeRec500(i, {
          emotionalShift: [1, 4].includes(i) ? 'negative' : 'neutral',
          dialogueHighlights: [0, 7].includes(i) ? themed500 : [],
        }),
      );
      const res = await runT500(recs500a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_NEGATIVE_EMOTION_AFTERMATH_SILENT'), 'THEME_NEGATIVE_EMOTION_AFTERMATH_SILENT should fire');
    });

    it('THEME_NEGATIVE_EMOTION_AFTERMATH_SILENT does not fire when a negative scene is followed by a resonant scene', async () => {
      // 9 scenes: negative at 1 and 4; scene 2 (after neg 1) is themed → aftermath resonance → no fire
      const recs500anr = Array.from({ length: 9 }, (_, i) =>
        makeRec500(i, {
          emotionalShift: [1, 4].includes(i) ? 'negative' : 'neutral',
          dialogueHighlights: [2, 7].includes(i) ? themed500 : [],
        }),
      );
      const res = await runT500(recs500anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_NEGATIVE_EMOTION_AFTERMATH_SILENT'), 'THEME_NEGATIVE_EMOTION_AFTERMATH_SILENT should not fire');
    });

    it('THEME_LAST_RESONANT_CAUSELESS fires when the last resonant scene at idx≥2 has no cause in prior 2 scenes', async () => {
      // 8 scenes: only scene 5 is themed; scenes 3,4 (prior 2) are flat with no structural cause → fires
      const recs500b = Array.from({ length: 8 }, (_, i) =>
        makeRec500(i, {
          dialogueHighlights: i === 5 ? themed500 : [],
        }),
      );
      const res = await runT500(recs500b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_LAST_RESONANT_CAUSELESS'), 'THEME_LAST_RESONANT_CAUSELESS should fire');
    });

    it('THEME_LAST_RESONANT_CAUSELESS does not fire when the prior scene has a structural cause', async () => {
      // 8 scenes: last resonant at scene 5; scene 4 has suspenseDelta>0 (cause) → no fire
      const recs500bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec500(i, {
          dialogueHighlights: i === 5 ? themed500 : [],
          suspenseDelta: i === 4 ? 2 : 0,
        }),
      );
      const res = await runT500(recs500bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_LAST_RESONANT_CAUSELESS'), 'THEME_LAST_RESONANT_CAUSELESS should not fire');
    });

    it('THEME_PAYOFF_AFTERMATH_SILENT fires when no payoff scene is followed by a resonant scene', async () => {
      // 9 scenes: payoffs at 1 and 4; themed at 0 and 7 (neither immediately after payoff scenes 1 or 4) → fires
      const recs500c = Array.from({ length: 9 }, (_, i) =>
        makeRec500(i, {
          payoffSetupIds: [1, 4].includes(i) ? ['setup-A'] : [],
          dialogueHighlights: [0, 7].includes(i) ? themed500 : [],
        }),
      );
      const res = await runT500(recs500c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_PAYOFF_AFTERMATH_SILENT'), 'THEME_PAYOFF_AFTERMATH_SILENT should fire');
    });

    it('THEME_PAYOFF_AFTERMATH_SILENT does not fire when a payoff scene is followed by a resonant scene', async () => {
      // 9 scenes: payoffs at 1 and 4; scene 2 (after payoff 1) is themed → aftermath resonance → no fire
      const recs500cnr = Array.from({ length: 9 }, (_, i) =>
        makeRec500(i, {
          payoffSetupIds: [1, 4].includes(i) ? ['setup-A'] : [],
          dialogueHighlights: [2, 7].includes(i) ? themed500 : [],
        }),
      );
      const res = await runT500(recs500cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_PAYOFF_AFTERMATH_SILENT'), 'THEME_PAYOFF_AFTERMATH_SILENT should not fire');
    });
  });


  describe('Wave 486 — themePass: positive emotion aftermath silent, first resonant causeless, resonance thirds cluster', async () => {
    const makeRec486 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const THEME486 = 'redemption forgiveness courage';
    const themed486 = ['act of redemption'];
    const runT486 = async (records: any[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: THEME486 },
      });
    };

    it('THEME_POSITIVE_EMOTION_AFTERMATH_SILENT fires when no positive-shift scene is followed by a resonant scene', async () => {
      // 9 scenes: positive at 1 and 4; themed at 0 and 7 (no positive shifts, not adjacent to pos shifts)
      // pos scene 1 → next is scene 2 (not themed); pos scene 4 → next is scene 5 (not themed) → fire
      const recs486a = Array.from({ length: 9 }, (_, i) =>
        makeRec486(i, {
          emotionalShift: [1, 4].includes(i) ? 'positive' : 'neutral',
          dialogueHighlights: [0, 7].includes(i) ? themed486 : [],
        }),
      );
      const res = await runT486(recs486a);
      assert.ok(res.issues.some((is: any) => is.rule === 'THEME_POSITIVE_EMOTION_AFTERMATH_SILENT'), 'THEME_POSITIVE_EMOTION_AFTERMATH_SILENT should fire');
    });

    it('THEME_POSITIVE_EMOTION_AFTERMATH_SILENT does not fire when at least one positive scene is followed by a resonant scene', async () => {
      // 9 scenes: positive at 1 and 4; scene 2 (after pos 1) is themed → aftermath resonance exists → no fire
      const recs486anr = Array.from({ length: 9 }, (_, i) =>
        makeRec486(i, {
          emotionalShift: [1, 4].includes(i) ? 'positive' : 'neutral',
          dialogueHighlights: [2, 7].includes(i) ? themed486 : [],
        }),
      );
      const res = await runT486(recs486anr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'THEME_POSITIVE_EMOTION_AFTERMATH_SILENT'), 'THEME_POSITIVE_EMOTION_AFTERMATH_SILENT should not fire');
    });

    it('THEME_FIRST_RESONANT_CAUSELESS fires when the first resonant scene at pos≥2 has no cause in prior 2 scenes', async () => {
      // 8 scenes: first resonant scene is at index 3; scenes 1 and 2 are neutral/flat (no cause) → fire
      const recs486b = Array.from({ length: 8 }, (_, i) =>
        makeRec486(i, {
          dialogueHighlights: i === 3 ? themed486 : [],
          // scenes 1,2 have no revelation, no turn, no suspense, no emotion, no clock
        }),
      );
      const res = await runT486(recs486b);
      assert.ok(res.issues.some((is: any) => is.rule === 'THEME_FIRST_RESONANT_CAUSELESS'), 'THEME_FIRST_RESONANT_CAUSELESS should fire');
    });

    it('THEME_FIRST_RESONANT_CAUSELESS does not fire when prior scene has a structural cause', async () => {
      // 8 scenes: first resonant at index 3; scene 2 has suspenseDelta>0 (cause) → no fire
      const recs486bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec486(i, {
          dialogueHighlights: i === 3 ? themed486 : [],
          suspenseDelta: i === 2 ? 1 : 0,
        }),
      );
      const res = await runT486(recs486bnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'THEME_FIRST_RESONANT_CAUSELESS'), 'THEME_FIRST_RESONANT_CAUSELESS should not fire');
    });

    it('THEME_RESONANCE_THIRDS_CLUSTER fires when >75% of resonant scenes are in one structural third', async () => {
      // 9 scenes: thirds at [0-2],[3-5],[6-8]; themed at 0,1,2 (all in first third) + one at 7
      // first-third: 3 resonant; second-third: 0; final-third: 1 → total 4; 3/4 = 75% not >75%
      // Let's use 4 in first third, 1 elsewhere: 4/5 = 80% > 75% → fire
      // 9 scenes, thirds at [0-2],[3-5],[6-8]. themed at 0,1,2,3 in first+start-of-second, 1 at 8
      // Actually use 10 scenes: thirds [0-3],[4-6],[7-9]; themed at 0,1,2,3 (first third) + 1 at 8
      // 4/5 = 80% > 75%. Let me use 9 scenes: third=3; themed at 0,1,2 (first third=3 scenes)
      // plus 1 more in first third (0,1,2) won't work with only 3 slots — use themed at 0,1,2,3
      // But index 3 is start of second third. Redesign: 12 scenes, third=4; themed at 0,1,2,3 = first third
      // plus one more at index 10 (third third). 4 in first, 0 in second, 1 in third → 4/5 = 80% → fire
      const recs486c = Array.from({ length: 12 }, (_, i) =>
        makeRec486(i, {
          dialogueHighlights: [0, 1, 2, 3, 10].includes(i) ? themed486 : [],
        }),
      );
      const res = await runT486(recs486c);
      assert.ok(res.issues.some((is: any) => is.rule === 'THEME_RESONANCE_THIRDS_CLUSTER'), 'THEME_RESONANCE_THIRDS_CLUSTER should fire');
    });

    it('THEME_RESONANCE_THIRDS_CLUSTER does not fire when resonant scenes are distributed across thirds', async () => {
      // 12 scenes, third=4; themed at 1 (first), 5 (second), 9 (third) → 1/1/1 → 33% each < 75% → no fire
      const recs486cnr = Array.from({ length: 12 }, (_, i) =>
        makeRec486(i, {
          dialogueHighlights: [1, 5, 9].includes(i) ? themed486 : [],
        }),
      );
      const res = await runT486(recs486cnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'THEME_RESONANCE_THIRDS_CLUSTER'), 'THEME_RESONANCE_THIRDS_CLUSTER should not fire');
    });
  });


  describe('Wave 472 — themePass: positive emotion decoupled, resonant valence uniform, dialogue peak silent', async () => {
    const makeRec472 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const THEME472 = 'redemption forgiveness courage';
    const themed472 = ['act of redemption'];
    const runT472 = async (records: any[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: THEME472 },
      });
    };

    it('THEME_POSITIVE_EMOTION_DECOUPLED fires when all positive-shift scenes are thematically silent', async () => {
      // 8 scenes: positive at 2,5 (no theme); theme at 0,7 (neutral) → positive scenes all mute → fire
      const recs472a = Array.from({ length: 8 }, (_, i) =>
        makeRec472(i, {
          emotionalShift: [2, 5].includes(i) ? 'positive' : 'neutral',
          dialogueHighlights: [0, 7].includes(i) ? themed472 : [],
        }),
      );
      const res = await runT472(recs472a);
      assert.ok(res.issues.some((is: any) => is.rule === 'THEME_POSITIVE_EMOTION_DECOUPLED'), 'THEME_POSITIVE_EMOTION_DECOUPLED should fire');
    });

    it('THEME_POSITIVE_EMOTION_DECOUPLED does not fire when a positive scene carries the theme', async () => {
      // 8 scenes: scene 2 is positive AND themed → overlap → no fire
      const recs472anr = Array.from({ length: 8 }, (_, i) =>
        makeRec472(i, {
          emotionalShift: [2, 5].includes(i) ? 'positive' : 'neutral',
          dialogueHighlights: [2, 7].includes(i) ? themed472 : [],
        }),
      );
      const res = await runT472(recs472anr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'THEME_POSITIVE_EMOTION_DECOUPLED'), 'THEME_POSITIVE_EMOTION_DECOUPLED should not fire');
    });

    it('THEME_RESONANT_VALENCE_UNIFORM fires when >80% of resonant scenes share the same emotional register', async () => {
      // 8 scenes: resonant at 3,4,5,6 — all neutral, scene 4 has suspenseDelta=2 (avoids QUIET/INERT)
      // 4/4 = 100% neutral > 80% → fire; no positive/negative scenes → LOPSIDED guard fails
      const recs472b = Array.from({ length: 8 }, (_, i) =>
        makeRec472(i, {
          dialogueHighlights: [3, 4, 5, 6].includes(i) ? themed472 : [],
          suspenseDelta: i === 4 ? 2 : 0,
        }),
      );
      const res = await runT472(recs472b);
      assert.ok(res.issues.some((is: any) => is.rule === 'THEME_RESONANT_VALENCE_UNIFORM'), 'THEME_RESONANT_VALENCE_UNIFORM should fire');
    });

    it('THEME_RESONANT_VALENCE_UNIFORM does not fire when resonant scenes span multiple emotional registers', async () => {
      // 8 scenes: resonant at 3(neutral),4(positive),5(negative),6(neutral) → 2 neutral, 1 pos, 1 neg → 50% max < 80%
      const recs472bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec472(i, {
          dialogueHighlights: [3, 4, 5, 6].includes(i) ? themed472 : [],
          emotionalShift: i === 4 ? 'positive' : i === 5 ? 'negative' : 'neutral',
        }),
      );
      const res = await runT472(recs472bnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'THEME_RESONANT_VALENCE_UNIFORM'), 'THEME_RESONANT_VALENCE_UNIFORM should not fire');
    });

    it('THEME_DIALOGUE_PEAK_SILENT fires when the most dialogue-rich scene (>2 highlights) is thematically mute', async () => {
      // 8 scenes: scene 3 has 3 dialogue highlights (peak) but no theme; scenes 5,6 are themed
      const recs472c = Array.from({ length: 8 }, (_, i) =>
        makeRec472(i, {
          dialogueHighlights: i === 3 ? ['a plain line', 'another line', 'a third line'] :
            [5, 6].includes(i) ? themed472 : [],
        }),
      );
      const res = await runT472(recs472c);
      assert.ok(res.issues.some((is: any) => is.rule === 'THEME_DIALOGUE_PEAK_SILENT'), 'THEME_DIALOGUE_PEAK_SILENT should fire');
    });

    it('THEME_DIALOGUE_PEAK_SILENT does not fire when the most dialogue-rich scene carries the theme', async () => {
      // 8 scenes: scene 3 has 3 dialogue highlights including theme text → peak is resonant → no fire
      const recs472cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec472(i, {
          dialogueHighlights: i === 3 ? ['a plain line', 'act of redemption', 'a third line'] :
            [5, 6].includes(i) ? themed472 : [],
        }),
      );
      const res = await runT472(recs472cnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'THEME_DIALOGUE_PEAK_SILENT'), 'THEME_DIALOGUE_PEAK_SILENT should not fire');
    });
  });


  describe('Wave 458 — themePass: relationship decoupled, clock aftermath silent, all resonance causeless', async () => {
    const makeRec458 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const THEME458 = 'redemption forgiveness courage';
    const themed458 = ['act of redemption'];
    const mkShift458 = (pk: string) => [{ pairKey: pk, dimension: 'trust', amount: -0.4 }];
    const runT458 = async (records: any[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: THEME458 },
      });
    };

    it('THEME_RELATIONSHIP_DECOUPLED fires when all relationship-shift scenes are thematically silent', async () => {
      // 8 scenes: relationship shifts at 1 and 4 (no theme); theme at 6 and 7 (no relationship shifts)
      const recs458a = Array.from({ length: 8 }, (_, i) =>
        makeRec458(i, {
          relationshipShifts: [1, 4].includes(i) ? mkShift458('A|B') : [],
          dialogueHighlights: [6, 7].includes(i) ? themed458 : [],
        }),
      );
      const res = await runT458(recs458a);
      assert.ok(res.issues.some((is: any) => is.rule === 'THEME_RELATIONSHIP_DECOUPLED'), 'THEME_RELATIONSHIP_DECOUPLED should fire');
    });

    it('THEME_RELATIONSHIP_DECOUPLED does not fire when at least one relationship-shift scene carries the theme', async () => {
      // 8 scenes: scene 4 has both relationship shift AND themed dialogue → overlap → no fire
      const recs458anr = Array.from({ length: 8 }, (_, i) =>
        makeRec458(i, {
          relationshipShifts: [1, 4].includes(i) ? mkShift458('A|B') : [],
          dialogueHighlights: [4, 7].includes(i) ? themed458 : [],
        }),
      );
      const res = await runT458(recs458anr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'THEME_RELATIONSHIP_DECOUPLED'), 'THEME_RELATIONSHIP_DECOUPLED should not fire');
    });

    it('THEME_CLOCK_AFTERMATH_SILENT fires when no clock scene is followed by a resonant scene', async () => {
      // 8 scenes: clock raised at 2 and 5; scene 3 and 6 (their aftermaths) are silent; theme at 0,1
      const recs458b = Array.from({ length: 8 }, (_, i) =>
        makeRec458(i, {
          clockRaised: [2, 5].includes(i) ? true : false,
          dialogueHighlights: [0, 1].includes(i) ? themed458 : [],
        }),
      );
      const res = await runT458(recs458b);
      assert.ok(res.issues.some((is: any) => is.rule === 'THEME_CLOCK_AFTERMATH_SILENT'), 'THEME_CLOCK_AFTERMATH_SILENT should fire');
    });

    it('THEME_CLOCK_AFTERMATH_SILENT does not fire when at least one clock aftermath is resonant', async () => {
      // 8 scenes: clock at 2; scene 3 has themed dialogue (aftermath is resonant) → no fire
      const recs458bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec458(i, {
          clockRaised: [2, 5].includes(i) ? true : false,
          dialogueHighlights: [0, 3].includes(i) ? themed458 : [],
        }),
      );
      const res = await runT458(recs458bnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'THEME_CLOCK_AFTERMATH_SILENT'), 'THEME_CLOCK_AFTERMATH_SILENT should not fire');
    });

    it('THEME_ALL_RESONANCE_CAUSELESS fires when all resonant scenes lack upstream revelation/turn/suspense', async () => {
      // 8 scenes: themed at 3, 5, 7; no revelation/turn/high-suspense in prior 2 scenes of each
      const recs458c = Array.from({ length: 8 }, (_, i) =>
        makeRec458(i, {
          dialogueHighlights: [3, 5, 7].includes(i) ? themed458 : [],
        }),
      );
      const res = await runT458(recs458c);
      assert.ok(res.issues.some((is: any) => is.rule === 'THEME_ALL_RESONANCE_CAUSELESS'), 'THEME_ALL_RESONANCE_CAUSELESS should fire');
    });

    it('THEME_ALL_RESONANCE_CAUSELESS does not fire when at least one resonant scene has an upstream dramatic turn', async () => {
      // 8 scenes: scene 2 has dramaticTurn='reversal'; scene 3 is themed → upstream cause → no fire
      const recs458cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec458(i, {
          dialogueHighlights: [3, 5, 7].includes(i) ? themed458 : [],
          dramaticTurn: i === 2 ? 'reversal' : 'nothing',
        }),
      );
      const res = await runT458(recs458cnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'THEME_ALL_RESONANCE_CAUSELESS'), 'THEME_ALL_RESONANCE_CAUSELESS should not fire');
    });
  });


  describe('Wave 444 — themePass: resonant cluster flood, long silent stretch, revelation aftermath silent', async () => {
    const makeRec444 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const THEME444 = 'redemption forgiveness courage';
    const runT444 = async (records: any[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: THEME444 },
      });
    };
    const themed444 = ['act of redemption'];

    it('THEME_RESONANT_CLUSTER_FLOOD fires when 4+ consecutive scenes all carry the theme', async () => {
      // n=10, resonant at 0,1,2,3,4 (5-scene consecutive run); silent at 5,6,7,8,9
      const recs444a = Array.from({ length: 10 }, (_, i) =>
        makeRec444(i, { dialogueHighlights: i < 5 ? themed444 : [] }),
      );
      const res = await runT444(recs444a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_RESONANT_CLUSTER_FLOOD'), 'THEME_RESONANT_CLUSTER_FLOOD should fire');
    });

    it('THEME_RESONANT_CLUSTER_FLOOD does NOT fire when resonant scenes alternate with silent ones', async () => {
      // n=10, resonant at 0,2,4,6,8 — alternating, max consecutive run = 1 < 4
      const recs444aNF = Array.from({ length: 10 }, (_, i) =>
        makeRec444(i, { dialogueHighlights: i % 2 === 0 ? themed444 : [] }),
      );
      const res = await runT444(recs444aNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_RESONANT_CLUSTER_FLOOD'), 'THEME_RESONANT_CLUSTER_FLOOD should not fire');
    });

    it('THEME_LONG_SILENT_STRETCH fires when the longest gap between resonant scenes is ≥5', async () => {
      // n=12, resonant only at 0 and 11 — gap = 10 consecutive silent scenes between them
      const recs444b = Array.from({ length: 12 }, (_, i) =>
        makeRec444(i, { dialogueHighlights: (i === 0 || i === 11) ? themed444 : [] }),
      );
      const res = await runT444(recs444b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_LONG_SILENT_STRETCH'), 'THEME_LONG_SILENT_STRETCH should fire');
    });

    it('THEME_LONG_SILENT_STRETCH does NOT fire when the maximum gap between resonant scenes is ≤4', async () => {
      // n=12, resonant at 0,3,6,9 (every 3rd scene) — max gap = 2 consecutive silent scenes
      const recs444bNF = Array.from({ length: 12 }, (_, i) =>
        makeRec444(i, { dialogueHighlights: i % 3 === 0 ? themed444 : [] }),
      );
      const res = await runT444(recs444bNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_LONG_SILENT_STRETCH'), 'THEME_LONG_SILENT_STRETCH should not fire');
    });

    it('THEME_REVELATION_AFTERMATH_SILENT fires when every post-revelation scene is thematically silent', async () => {
      // n=10, revelations at 1 and 4; resonant at 0 and 3 (aftertmaths 2 and 5 are silent)
      const recs444c = Array.from({ length: 10 }, (_, i) =>
        makeRec444(i, {
          dialogueHighlights: [0, 3].includes(i) ? themed444 : [],
          revelation: [1, 4].includes(i) ? 'A truth is disclosed here.' : null,
        }),
      );
      const res = await runT444(recs444c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_REVELATION_AFTERMATH_SILENT'), 'THEME_REVELATION_AFTERMATH_SILENT should fire');
    });

    it('THEME_REVELATION_AFTERMATH_SILENT does NOT fire when at least one post-revelation scene carries the theme', async () => {
      // n=10, revelations at 1 and 4; resonant at 0, 2 (aftermath of 1), and 3 → aftermath 2 resonates
      const recs444cNF = Array.from({ length: 10 }, (_, i) =>
        makeRec444(i, {
          dialogueHighlights: [0, 2, 3].includes(i) ? themed444 : [],
          revelation: [1, 4].includes(i) ? 'A truth is disclosed here.' : null,
        }),
      );
      const res = await runT444(recs444cNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_REVELATION_AFTERMATH_SILENT'), 'THEME_REVELATION_AFTERMATH_SILENT should not fire');
    });
  });


  describe('Wave 430 — themePass: dramatic turn aftermath silent, peak unmotivated, resonance emotionally lopsided', async () => {
    const makeRec430 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const THEME430 = 'redemption forgiveness courage';
    const runT430 = async (records: any[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: THEME430 },
      });
    };
    const themed430 = ['act of redemption'];

    it('THEME_DRAMATIC_TURN_AFTERMATH_SILENT fires when every post-turn scene is thematically silent', async () => {
      // n=10, turns at 2 and 5; resonant at 0 and 1; post-turn scenes 3 and 6 are silent → fires
      const recs430a = Array.from({ length: 10 }, (_, i) =>
        makeRec430(i, {
          dialogueHighlights: [0, 1].includes(i) ? themed430 : [],
          dramaticTurn: [2, 5].includes(i) ? 'reversal' : 'nothing',
        }),
      );
      const res = await runT430(recs430a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_DRAMATIC_TURN_AFTERMATH_SILENT'), 'THEME_DRAMATIC_TURN_AFTERMATH_SILENT should fire');
    });

    it('THEME_DRAMATIC_TURN_AFTERMATH_SILENT does not fire when at least one post-turn scene carries the theme', async () => {
      // n=10, turns at 2 and 5; resonant at 0, 1, and 3 (scene 3 is aftermath of turn at 2) → no fire
      const recs430anr = Array.from({ length: 10 }, (_, i) =>
        makeRec430(i, {
          dialogueHighlights: [0, 1, 3].includes(i) ? themed430 : [],
          dramaticTurn: [2, 5].includes(i) ? 'reversal' : 'nothing',
        }),
      );
      const res = await runT430(recs430anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_DRAMATIC_TURN_AFTERMATH_SILENT'), 'THEME_DRAMATIC_TURN_AFTERMATH_SILENT should not fire');
    });

    it('THEME_PEAK_UNMOTIVATED fires when the thematic peak has no catalyst in the two prior scenes', async () => {
      // n=10; totalHits=7 (scenes 0,1,2 have 1 hit each; scene 5 has 4 hits → peak)
      // scenes 3 and 4 (2 prior to peak) are non-catalytic → fires
      const recs430b = Array.from({ length: 10 }, (_, i) =>
        makeRec430(i, {
          dialogueHighlights: [0, 1, 2].includes(i)
            ? ['forgiveness']
            : i === 5
              ? ['redemption', 'redemption', 'redemption', 'redemption']
              : [],
        }),
      );
      const res = await runT430(recs430b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_PEAK_UNMOTIVATED'), 'THEME_PEAK_UNMOTIVATED should fire');
    });

    it('THEME_PEAK_UNMOTIVATED does not fire when the scene before the thematic peak contains a catalyst', async () => {
      // Same as above but scene 4 (one before peak at 5) has a revelation → catalyst found → no fire
      const recs430bnr = Array.from({ length: 10 }, (_, i) =>
        makeRec430(i, {
          dialogueHighlights: [0, 1, 2].includes(i)
            ? ['forgiveness']
            : i === 5
              ? ['redemption', 'redemption', 'redemption', 'redemption']
              : [],
          revelation: i === 4 ? 'a hidden truth emerges' : null,
        }),
      );
      const res = await runT430(recs430bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_PEAK_UNMOTIVATED'), 'THEME_PEAK_UNMOTIVATED should not fire');
    });

    it('THEME_RESONANCE_EMOTIONALLY_LOPSIDED fires when all 4 charged resonant scenes share the same negative polarity', async () => {
      // n=8; resonant at 0,1,2,3,4; scenes 0,1,2,3 are emotionally negative → chargedResonant=4, all neg → fires
      const recs430c = Array.from({ length: 8 }, (_, i) =>
        makeRec430(i, {
          dialogueHighlights: [0, 1, 2, 3, 4].includes(i) ? themed430 : [],
          emotionalShift: [0, 1, 2, 3].includes(i) ? 'negative' : 'neutral',
        }),
      );
      const res = await runT430(recs430c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_RESONANCE_EMOTIONALLY_LOPSIDED'), 'THEME_RESONANCE_EMOTIONALLY_LOPSIDED should fire');
    });

    it('THEME_RESONANCE_EMOTIONALLY_LOPSIDED does not fire when charged resonant scenes are evenly split', async () => {
      // n=8; resonant at 0,1,2,3,4; scenes 0,1 positive + scenes 2,3 negative → 2:2 ratio → no fire
      const recs430cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec430(i, {
          dialogueHighlights: [0, 1, 2, 3, 4].includes(i) ? themed430 : [],
          emotionalShift: [0, 1].includes(i) ? 'positive' : [2, 3].includes(i) ? 'negative' : 'neutral',
        }),
      );
      const res = await runT430(recs430cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_RESONANCE_EMOTIONALLY_LOPSIDED'), 'THEME_RESONANCE_EMOTIONALLY_LOPSIDED should not fire');
    });
  });


  describe('Wave 416 — themePass: resonant singleton run, peak suspense aftermath silent, dual rise decoupled', async () => {
    const makeRec416 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const THEME416 = 'redemption forgiveness courage';
    const runT416 = async (records: any[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: THEME416 },
      });
    };
    const themed416 = ['act of redemption'];

    it('THEME_RESONANT_SINGLETON_RUN fires when every resonant scene is isolated by silent scenes', async () => {
      // n=10, resonant at 0,2,4,6 (all separated by silent scenes 1,3,5,7,8,9 → max run=1) → fires
      const recs416a = Array.from({ length: 10 }, (_, i) =>
        makeRec416(i, { dialogueHighlights: [0, 2, 4, 6].includes(i) ? themed416 : [] }),
      );
      const res = await runT416(recs416a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_RESONANT_SINGLETON_RUN'), 'THEME_RESONANT_SINGLETON_RUN should fire');
    });

    it('THEME_RESONANT_SINGLETON_RUN does not fire when at least two consecutive resonant scenes exist', async () => {
      // n=10, resonant at 0,1,4,6 (scenes 0 and 1 are consecutive → max run=2) → no fire
      const recs416anr = Array.from({ length: 10 }, (_, i) =>
        makeRec416(i, { dialogueHighlights: [0, 1, 4, 6].includes(i) ? themed416 : [] }),
      );
      const res = await runT416(recs416anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_RESONANT_SINGLETON_RUN'), 'THEME_RESONANT_SINGLETON_RUN should not fire');
    });

    it('THEME_PEAK_SUSPENSE_AFTERMATH_SILENT fires when the scene after the peak-suspense scene is thematically silent', async () => {
      // n=8, resonant at 0,1; peak suspense at scene 3 (delta=4); scene 4 is silent → fires
      const recs416b = Array.from({ length: 8 }, (_, i) =>
        makeRec416(i, {
          dialogueHighlights: [0, 1].includes(i) ? themed416 : [],
          suspenseDelta: i === 3 ? 4 : 0,
        }),
      );
      const res = await runT416(recs416b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_PEAK_SUSPENSE_AFTERMATH_SILENT'), 'THEME_PEAK_SUSPENSE_AFTERMATH_SILENT should fire');
    });

    it('THEME_PEAK_SUSPENSE_AFTERMATH_SILENT does not fire when the aftermath of the peak-suspense scene carries theme', async () => {
      // n=8, resonant at 0,1,4; peak suspense at scene 3 (delta=4); scene 4 is resonant → no fire
      const recs416bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec416(i, {
          dialogueHighlights: [0, 1, 4].includes(i) ? themed416 : [],
          suspenseDelta: i === 3 ? 4 : 0,
        }),
      );
      const res = await runT416(recs416bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_PEAK_SUSPENSE_AFTERMATH_SILENT'), 'THEME_PEAK_SUSPENSE_AFTERMATH_SILENT should not fire');
    });

    it('THEME_DUAL_RISE_DECOUPLED fires when every dual-rise scene is thematically silent', async () => {
      // n=8, resonant at 0,1; dual-rise at 4 (s=2,c=1) and 5 (s=1,c=2); 4 and 5 are not resonant → fires
      const recs416c = Array.from({ length: 8 }, (_, i) =>
        makeRec416(i, {
          dialogueHighlights: [0, 1].includes(i) ? themed416 : [],
          suspenseDelta: i === 4 ? 2 : i === 5 ? 1 : 0,
          curiosityDelta: i === 4 ? 1 : i === 5 ? 2 : 0,
        }),
      );
      const res = await runT416(recs416c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_DUAL_RISE_DECOUPLED'), 'THEME_DUAL_RISE_DECOUPLED should fire');
    });

    it('THEME_DUAL_RISE_DECOUPLED does not fire when at least one dual-rise scene carries the theme', async () => {
      // n=8, resonant at 0,1,4; scene 4 has suspenseDelta=2 AND curiosityDelta=1 AND is resonant → no fire
      const recs416cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec416(i, {
          dialogueHighlights: [0, 1, 4].includes(i) ? themed416 : [],
          suspenseDelta: i === 4 ? 2 : i === 5 ? 1 : 0,
          curiosityDelta: i === 4 ? 1 : i === 5 ? 2 : 0,
        }),
      );
      const res = await runT416(recs416cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_DUAL_RISE_DECOUPLED'), 'THEME_DUAL_RISE_DECOUPLED should not fire');
    });
  });


  describe('Wave 402 — themePass: Act 2a density drop, seed peak absent, payoff peak absent', async () => {
    const makeRec402 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const THEME402 = 'trust betrayal courage';
    const runT402 = async (records: any[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: THEME402 },
      });
    };
    const themed402 = ['the courage to trust'];

    it('THEME_ACT2A_DENSITY_DROP fires when Act 2a is less than half as resonant as overall', async () => {
      // n=12, Act 2a = scenes 3-5; resonance at 0,1,2,8,9,10 (none in 3-5) → overall 50%, Act 2a 0% → fires
      const recs402a = Array.from({ length: 12 }, (_, i) =>
        makeRec402(i, { dialogueHighlights: [0, 1, 2, 8, 9, 10].includes(i) ? themed402 : [] }),
      );
      const res = await runT402(recs402a);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_ACT2A_DENSITY_DROP'), 'THEME_ACT2A_DENSITY_DROP should fire');
    });

    it('THEME_ACT2A_DENSITY_DROP does not fire when Act 2a is proportionately resonant', async () => {
      // n=12, Act 2a = scenes 3-5; resonance at 0,3,4,8 → Act 2a 67%, overall 33%; 0.67 > 0.33*0.5 → no fire
      const recs402anr = Array.from({ length: 12 }, (_, i) =>
        makeRec402(i, { dialogueHighlights: [0, 3, 4, 8].includes(i) ? themed402 : [] }),
      );
      const res = await runT402(recs402anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_ACT2A_DENSITY_DROP'), 'THEME_ACT2A_DENSITY_DROP should not fire');
    });

    it('THEME_SEED_PEAK_ABSENT fires when the peak seed scene is silent while other seed scenes carry theme', async () => {
      // Seeds: scene 2 plants 1 clue (resonant), scene 5 plants 3 clues (silent = peak is silent) → fires
      const recs402b = Array.from({ length: 10 }, (_, i) =>
        makeRec402(i, {
          seededClueIds: i === 2 ? ['c1'] : i === 5 ? ['c2', 'c3', 'c4'] : [],
          dialogueHighlights: [0, 1, 2, 7, 8, 9].includes(i) ? themed402 : [], // scene 2 themed, scene 5 not
        }),
      );
      const res = await runT402(recs402b);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_SEED_PEAK_ABSENT'), 'THEME_SEED_PEAK_ABSENT should fire');
    });

    it('THEME_SEED_PEAK_ABSENT does not fire when the peak seed scene carries theme', async () => {
      // Seeds: scene 2 (1 clue), scene 5 (3 clues = peak) AND scene 5 carries theme → no fire
      const recs402bnr = Array.from({ length: 10 }, (_, i) =>
        makeRec402(i, {
          seededClueIds: i === 2 ? ['c1'] : i === 5 ? ['c2', 'c3', 'c4'] : [],
          dialogueHighlights: [0, 1, 2, 5, 7].includes(i) ? themed402 : [],
        }),
      );
      const res = await runT402(recs402bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_SEED_PEAK_ABSENT'), 'THEME_SEED_PEAK_ABSENT should not fire');
    });

    it('THEME_PAYOFF_PEAK_ABSENT fires when the peak payoff scene is silent while other payoff scenes carry theme', async () => {
      // Payoffs: scene 3 resolves 1 setup (resonant), scene 7 resolves 3 setups (silent = peak) → fires
      const recs402c = Array.from({ length: 10 }, (_, i) =>
        makeRec402(i, {
          payoffSetupIds: i === 3 ? ['s1'] : i === 7 ? ['s2', 's3', 's4'] : [],
          dialogueHighlights: [0, 1, 3, 8, 9].includes(i) ? themed402 : [], // scene 3 themed, scene 7 not
        }),
      );
      const res = await runT402(recs402c);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_PAYOFF_PEAK_ABSENT'), 'THEME_PAYOFF_PEAK_ABSENT should fire');
    });

    it('THEME_PAYOFF_PEAK_ABSENT does not fire when the peak payoff scene carries theme', async () => {
      // Payoffs: scene 3 (1 setup), scene 7 (3 setups = peak) AND scene 7 carries theme → no fire
      const recs402cnr = Array.from({ length: 10 }, (_, i) =>
        makeRec402(i, {
          payoffSetupIds: i === 3 ? ['s1'] : i === 7 ? ['s2', 's3', 's4'] : [],
          dialogueHighlights: [0, 1, 3, 7, 9].includes(i) ? themed402 : [],
        }),
      );
      const res = await runT402(recs402cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_PAYOFF_PEAK_ABSENT'), 'THEME_PAYOFF_PEAK_ABSENT should not fire');
    });
  });


  describe('Wave 307 — themePass: shallow resonance, quiet scenes only, resonance burst', async () => {
    const makeRec307 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const THEME307 = 'trust betrayal courage';
    const runT307 = async (records: any[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: THEME307 },
      });
    };

    it('THEME_SHALLOW_RESONANCE fires when no resonant scene matches 2+ distinct keywords', async () => {
      const recs307sr = Array.from({ length: 8 }, (_, i) =>
        makeRec307(i, { dialogueHighlights: [0, 1, 2].includes(i) ? ['the trust matters here'] : [] })
      );
      const res = await runT307(recs307sr);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_SHALLOW_RESONANCE'), 'THEME_SHALLOW_RESONANCE should fire');
    });

    it('THEME_SHALLOW_RESONANCE does not fire when a scene holds two facets at once', async () => {
      const recs307nsr = Array.from({ length: 8 }, (_, i) =>
        makeRec307(i, {
          dialogueHighlights:
            i === 0 ? ['trust and betrayal collide here']
            : [1, 2].includes(i) ? ['the trust matters here']
            : [],
        })
      );
      const res = await runT307(recs307nsr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_SHALLOW_RESONANCE'), 'THEME_SHALLOW_RESONANCE should not fire');
    });

    it('THEME_QUIET_SCENES_ONLY fires when all resonant scenes are neutral and low-suspense', async () => {
      const recs307qs = Array.from({ length: 8 }, (_, i) =>
        makeRec307(i, {
          dialogueHighlights: [0, 1, 2].includes(i) ? ['the trust matters here'] : [],
          suspenseDelta: 0.5,
        })
      );
      const res = await runT307(recs307qs);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_QUIET_SCENES_ONLY'), 'THEME_QUIET_SCENES_ONLY should fire');
    });

    it('THEME_QUIET_SCENES_ONLY does not fire when a resonant scene is charged', async () => {
      const recs307nqs = Array.from({ length: 8 }, (_, i) =>
        makeRec307(i, {
          dialogueHighlights: [0, 1, 2].includes(i) ? ['the trust matters here'] : [],
          suspenseDelta: i === 0 ? 2 : 0.5,
        })
      );
      const res = await runT307(recs307nqs);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_QUIET_SCENES_ONLY'), 'THEME_QUIET_SCENES_ONLY should not fire');
    });

    it('THEME_RESONANCE_BURST fires when one scene holds >50% of theme keyword hits', async () => {
      const recs307rb = Array.from({ length: 8 }, (_, i) =>
        makeRec307(i, {
          dialogueHighlights:
            i === 0 ? ['trust trust trust betrayal']
            : i === 1 ? ['courage']
            : [],
        })
      );
      const res = await runT307(recs307rb);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_RESONANCE_BURST'), 'THEME_RESONANCE_BURST should fire');
    });

    it('THEME_RESONANCE_BURST does not fire when keyword hits are spread evenly', async () => {
      const recs307nrb = Array.from({ length: 8 }, (_, i) =>
        makeRec307(i, {
          dialogueHighlights:
            i === 0 ? ['trust and betrayal']
            : i === 1 ? ['courage and trust']
            : [],
        })
      );
      const res = await runT307(recs307nrb);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_RESONANCE_BURST'), 'THEME_RESONANCE_BURST should not fire');
    });
  });


  describe('Wave 388 — themePass: midpoint density drop, opening image silent, proactive decoupled', async () => {
    const makeRec388 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const THEME388 = 'trust betrayal courage';
    const runT388 = async (records: any[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: THEME388 },
      });
    };
    const themed = ['the courage to trust'];

    it('THEME_MIDPOINT_DENSITY_DROP fires when the 40-60% zone is less than half as resonant as overall', async () => {
      // n=12; mid zone scenes 4,5,6 (none resonant); resonance at 0,1,2,8,9,10
      const recs388md = Array.from({ length: 12 }, (_, i) =>
        makeRec388(i, { dialogueHighlights: [0, 1, 2, 8, 9, 10].includes(i) ? themed : [] }),
      );
      const res = await runT388(recs388md);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_MIDPOINT_DENSITY_DROP'), 'THEME_MIDPOINT_DENSITY_DROP should fire');
    });

    it('THEME_MIDPOINT_DENSITY_DROP does not fire when the midpoint carries proportionate theme', async () => {
      const recs388mdn = Array.from({ length: 12 }, (_, i) =>
        makeRec388(i, { dialogueHighlights: [0, 1, 2, 5, 8, 9, 10].includes(i) ? themed : [] }),
      );
      const res = await runT388(recs388mdn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_MIDPOINT_DENSITY_DROP'), 'THEME_MIDPOINT_DENSITY_DROP should not fire');
    });

    it('THEME_OPENING_IMAGE_SILENT fires when the first scene carries no theme but it appears later', async () => {
      const recs388oi = Array.from({ length: 8 }, (_, i) =>
        makeRec388(i, { dialogueHighlights: [3, 5].includes(i) ? themed : [] }),
      );
      const res = await runT388(recs388oi);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_OPENING_IMAGE_SILENT'), 'THEME_OPENING_IMAGE_SILENT should fire');
    });

    it('THEME_OPENING_IMAGE_SILENT does not fire when the first scene carries theme', async () => {
      const recs388oin = Array.from({ length: 8 }, (_, i) =>
        makeRec388(i, { dialogueHighlights: [0, 3, 5].includes(i) ? themed : [] }),
      );
      const res = await runT388(recs388oin);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_OPENING_IMAGE_SILENT'), 'THEME_OPENING_IMAGE_SILENT should not fire');
    });

    it('THEME_PROACTIVE_DECOUPLED fires when every clock/clue-planting scene is thematically silent', async () => {
      // proactive at 1,3,5 (seeded clues, no theme); theme present at scene 6
      const recs388pd = Array.from({ length: 8 }, (_, i) =>
        makeRec388(i, {
          seededClueIds: [1, 3, 5].includes(i) ? ['c'] : [],
          dialogueHighlights: i === 6 ? themed : [],
        }),
      );
      const res = await runT388(recs388pd);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_PROACTIVE_DECOUPLED'), 'THEME_PROACTIVE_DECOUPLED should fire');
    });

    it('THEME_PROACTIVE_DECOUPLED does not fire when a proactive scene carries theme', async () => {
      // scene 3 is proactive AND themed
      const recs388pdn = Array.from({ length: 8 }, (_, i) =>
        makeRec388(i, {
          seededClueIds: [1, 3, 5].includes(i) ? ['c'] : [],
          dialogueHighlights: [3, 6].includes(i) ? themed : [],
        }),
      );
      const res = await runT388(recs388pdn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_PROACTIVE_DECOUPLED'), 'THEME_PROACTIVE_DECOUPLED should not fire');
    });
  });


  describe('Wave 374 — themePass: Act 1 density drop, clock peak absent, charged scene silent', async () => {
    const makeRec374 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const THEME374 = 'trust betrayal courage';
    const runT374 = async (records: any[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: THEME374 },
      });
    };

    it('THEME_ACT1_DENSITY_DROP fires when Act 1 resonance is less than half the rest of the story', async () => {
      // n=12; Act 1 = scenes 0-2 (none resonant); rest 3-11 with 4,5,6 resonant
      const recs374a1 = Array.from({ length: 12 }, (_, i) =>
        makeRec374(i, { dialogueHighlights: [4, 5, 6].includes(i) ? ['the courage to trust'] : [] }),
      );
      const res = await runT374(recs374a1);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_ACT1_DENSITY_DROP'), 'THEME_ACT1_DENSITY_DROP should fire');
    });

    it('THEME_ACT1_DENSITY_DROP does not fire when Act 1 carries theme proportionate to the body', async () => {
      const recs374a1n = Array.from({ length: 12 }, (_, i) =>
        makeRec374(i, { dialogueHighlights: [1, 4, 5, 6].includes(i) ? ['the courage to trust'] : [] }),
      );
      const res = await runT374(recs374a1n);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_ACT1_DENSITY_DROP'), 'THEME_ACT1_DENSITY_DROP should not fire');
    });

    it('THEME_CLOCK_PEAK_ABSENT fires when the largest-clockDelta scene is thematically silent', async () => {
      // scene 1 resonant (so block runs); clocks at 2 (delta 1) and 5 (delta 3, peak), neither resonant
      const recs374ck = Array.from({ length: 8 }, (_, i) =>
        makeRec374(i, {
          dialogueHighlights: i === 1 ? ['a moment of courage'] : [],
          clockRaised: [2, 5].includes(i),
          clockDelta: i === 2 ? 1 : i === 5 ? 3 : 0,
        }),
      );
      const res = await runT374(recs374ck);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_CLOCK_PEAK_ABSENT'), 'THEME_CLOCK_PEAK_ABSENT should fire');
    });

    it('THEME_CLOCK_PEAK_ABSENT does not fire when the peak deadline carries theme', async () => {
      const recs374ckn = Array.from({ length: 8 }, (_, i) =>
        makeRec374(i, {
          dialogueHighlights: i === 1 ? ['a moment of courage'] : i === 5 ? ['the courage to act'] : [],
          clockRaised: [2, 5].includes(i),
          clockDelta: i === 2 ? 1 : i === 5 ? 3 : 0,
        }),
      );
      const res = await runT374(recs374ckn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_CLOCK_PEAK_ABSENT'), 'THEME_CLOCK_PEAK_ABSENT should not fire');
    });

    it('THEME_CHARGED_SCENE_SILENT fires when no non-neutral scene carries theme', async () => {
      // scene 1 neutral + resonant (block runs); charged scenes 2,4,6 carry no theme
      const recs374cs = Array.from({ length: 8 }, (_, i) =>
        makeRec374(i, {
          dialogueHighlights: i === 1 ? ['a moment of courage'] : [],
          emotionalShift: i === 2 || i === 6 ? 'negative' : i === 4 ? 'positive' : 'neutral',
        }),
      );
      const res = await runT374(recs374cs);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_CHARGED_SCENE_SILENT'), 'THEME_CHARGED_SCENE_SILENT should fire');
    });

    it('THEME_CHARGED_SCENE_SILENT does not fire when a charged scene carries theme', async () => {
      const recs374csn = Array.from({ length: 8 }, (_, i) =>
        makeRec374(i, {
          dialogueHighlights: i === 1 ? ['a moment of courage'] : i === 4 ? ['the courage to stay'] : [],
          emotionalShift: i === 2 || i === 6 ? 'negative' : i === 4 ? 'positive' : 'neutral',
        }),
      );
      const res = await runT374(recs374csn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_CHARGED_SCENE_SILENT'), 'THEME_CHARGED_SCENE_SILENT should not fire');
    });
  });


  describe('Wave 360 — themePass: Act 3 density drop, relationship peak absent, dual peak absent', async () => {
    const makeRec360 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const THEME360 = 'trust betrayal courage';
    const runT360 = async (records: any[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: THEME360 },
      });
    };

    it('THEME_ACT3_DENSITY_DROP fires when Act 3 resonance is less than half of Act 2 resonance', async () => {
      // 12 scenes; Act 2 = 3-8 (all 6 resonant), Act 3 = 9-11 (only scene 9 resonant)
      // Act 2 density = 6/6 = 100%; Act 3 density = 1/3 = 33%. 33% < 50%.
      const recs360a3 = Array.from({ length: 12 }, (_, i) =>
        makeRec360(i, {
          dialogueHighlights: (i >= 3 && i <= 8) || i === 9 ? ['the courage to trust'] : [],
        }),
      );
      const res = await runT360(recs360a3);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_ACT3_DENSITY_DROP'), 'THEME_ACT3_DENSITY_DROP should fire');
    });

    it('THEME_ACT3_DENSITY_DROP does not fire when Act 3 density matches Act 2', async () => {
      // 12 scenes; Act 2 = 3-8 (3 resonant out of 6 = 50%), Act 3 = 9-11 (3/3 = 100%)
      // Act 3 density ≥ 50% of Act 2 density: does not fire
      const recs360a3ni = Array.from({ length: 12 }, (_, i) =>
        makeRec360(i, {
          dialogueHighlights: [3, 5, 7, 9, 10, 11].includes(i) ? ['the courage to trust'] : [],
        }),
      );
      const res = await runT360(recs360a3ni);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_ACT3_DENSITY_DROP'), 'THEME_ACT3_DENSITY_DROP should not fire');
    });

    it('THEME_RELATIONSHIP_PEAK_ABSENT fires when the largest-shift scene lacks theme while 2+ others carry it', async () => {
      // scenes 2 (shift 0.5 + theme) and 4 (shift 0.4 + theme); scene 6 (shift 1.0, no theme)
      const recs360rp = Array.from({ length: 8 }, (_, i) =>
        makeRec360(i, {
          dialogueHighlights: [2, 4].includes(i) ? ['courage to trust'] : [],
          relationshipShifts: i === 2
            ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.5 }]
            : i === 4 ? [{ pairKey: 'C|D', dimension: 'trust', amount: 0.4 }]
            : i === 6 ? [{ pairKey: 'A|B', dimension: 'trust', amount: 1.0 }]
            : [],
        }),
      );
      const res = await runT360(recs360rp);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_RELATIONSHIP_PEAK_ABSENT'), 'THEME_RELATIONSHIP_PEAK_ABSENT should fire');
    });

    it('THEME_RELATIONSHIP_PEAK_ABSENT does not fire when the largest-shift scene carries theme', async () => {
      // scene 6 now also carries theme
      const recs360rpni = Array.from({ length: 8 }, (_, i) =>
        makeRec360(i, {
          dialogueHighlights: [2, 4, 6].includes(i) ? ['courage to trust'] : [],
          relationshipShifts: i === 2
            ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.5 }]
            : i === 4 ? [{ pairKey: 'C|D', dimension: 'trust', amount: 0.4 }]
            : i === 6 ? [{ pairKey: 'A|B', dimension: 'trust', amount: 1.0 }]
            : [],
        }),
      );
      const res = await runT360(recs360rpni);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_RELATIONSHIP_PEAK_ABSENT'), 'THEME_RELATIONSHIP_PEAK_ABSENT should not fire');
    });

    it('THEME_DUAL_PEAK_ABSENT fires when the scene with max suspenseDelta+curiosityDelta lacks theme', async () => {
      // scenes 0,1,2 carry theme; scene 5 has suspenseDelta=2 + curiosityDelta=2 = peak but no theme
      const recs360dp = Array.from({ length: 8 }, (_, i) =>
        makeRec360(i, {
          dialogueHighlights: [0, 1, 2].includes(i) ? ['the courage to trust'] : [],
          suspenseDelta: i === 5 ? 2 : 0,
          curiosityDelta: i === 5 ? 2 : 0,
        }),
      );
      const res = await runT360(recs360dp);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_DUAL_PEAK_ABSENT'), 'THEME_DUAL_PEAK_ABSENT should fire');
    });

    it('THEME_DUAL_PEAK_ABSENT does not fire when the dual-peak scene carries theme', async () => {
      // scene 5 now also carries theme
      const recs360dpni = Array.from({ length: 8 }, (_, i) =>
        makeRec360(i, {
          dialogueHighlights: [0, 1, 2, 5].includes(i) ? ['the courage to trust'] : [],
          suspenseDelta: i === 5 ? 2 : 0,
          curiosityDelta: i === 5 ? 2 : 0,
        }),
      );
      const res = await runT360(recs360dpni);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_DUAL_PEAK_ABSENT'), 'THEME_DUAL_PEAK_ABSENT should not fire');
    });
  });


  describe('Wave 346 — themePass: suspense peak absent, late debut, closing quarter silent', async () => {
    const makeRec346 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const THEME346 = 'trust betrayal courage';
    const runT346 = async (records: any[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: THEME346 },
      });
    };

    it('THEME_SUSPENSE_PEAK_ABSENT fires when the highest-suspense scene lacks theme', async () => {
      // scenes 0,1,2 carry theme; scene 3 has peak suspenseDelta=5 but no theme
      const recs346sp = Array.from({ length: 8 }, (_, i) =>
        makeRec346(i, {
          dialogueHighlights: [0, 1, 2].includes(i) ? ['a moment of courage'] : [],
          suspenseDelta: i === 3 ? 5 : 0.5,
        })
      );
      const res = await runT346(recs346sp);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_SUSPENSE_PEAK_ABSENT'), 'THEME_SUSPENSE_PEAK_ABSENT should fire');
    });

    it('THEME_SUSPENSE_PEAK_ABSENT does not fire when the peak-suspense scene carries theme', async () => {
      const recs346spn = Array.from({ length: 8 }, (_, i) =>
        makeRec346(i, {
          dialogueHighlights: [0, 1, 2, 3].includes(i) ? ['a moment of courage'] : [],
          suspenseDelta: i === 3 ? 5 : 0.5,
        })
      );
      const res = await runT346(recs346spn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_SUSPENSE_PEAK_ABSENT'), 'THEME_SUSPENSE_PEAK_ABSENT should not fire');
    });

    it('THEME_LATE_DEBUT fires when the first resonant scene falls past the midpoint', async () => {
      // n=10 → midpoint=5; theme only in scenes 6,7,8
      const recs346ld = Array.from({ length: 10 }, (_, i) =>
        makeRec346(i, { dialogueHighlights: [6, 7, 8].includes(i) ? ['the courage to trust'] : [] })
      );
      const res = await runT346(recs346ld);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_LATE_DEBUT'), 'THEME_LATE_DEBUT should fire');
    });

    it('THEME_LATE_DEBUT does not fire when the theme appears in the first half', async () => {
      const recs346ldn = Array.from({ length: 10 }, (_, i) =>
        makeRec346(i, { dialogueHighlights: [1, 6, 7].includes(i) ? ['the courage to trust'] : [] })
      );
      const res = await runT346(recs346ldn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_LATE_DEBUT'), 'THEME_LATE_DEBUT should not fire');
    });

    it('THEME_CLOSING_QUARTER_SILENT fires when the final 25% carries no theme', async () => {
      // n=12 → finalStart=9; theme in scenes 0,1,2 only, none in 9,10,11
      const recs346cq = Array.from({ length: 12 }, (_, i) =>
        makeRec346(i, { dialogueHighlights: [0, 1, 2].includes(i) ? ['a moment of courage'] : [] })
      );
      const res = await runT346(recs346cq);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_CLOSING_QUARTER_SILENT'), 'THEME_CLOSING_QUARTER_SILENT should fire');
    });

    it('THEME_CLOSING_QUARTER_SILENT does not fire when the closing quarter carries theme', async () => {
      const recs346cqn = Array.from({ length: 12 }, (_, i) =>
        makeRec346(i, { dialogueHighlights: [0, 1, 2, 10].includes(i) ? ['a moment of courage'] : [] })
      );
      const res = await runT346(recs346cqn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_CLOSING_QUARTER_SILENT'), 'THEME_CLOSING_QUARTER_SILENT should not fire');
    });
  });


  describe('Wave 332 — themePass: development scene desert, curiosity peak absent, Act 2b density drop', async () => {
    const makeRec332 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const THEME332 = 'trust betrayal courage';
    const runT332 = async (records: any[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: THEME332 },
      });
    };

    it('THEME_DEVELOPMENT_SCENE_DESERT fires when no development scene carries theme', async () => {
      // 10 records: 0,1 are exposition with theme; 2-9 are development with no theme
      const recs332dd = Array.from({ length: 10 }, (_, i) =>
        makeRec332(i, {
          purpose: i < 2 ? 'exposition' : 'development',
          dialogueHighlights: i < 2 ? ['the trust holds'] : [],
        })
      );
      const res = await runT332(recs332dd);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_DEVELOPMENT_SCENE_DESERT'), 'THEME_DEVELOPMENT_SCENE_DESERT should fire');
    });

    it('THEME_DEVELOPMENT_SCENE_DESERT does not fire when a development scene carries theme', async () => {
      const recs332ndd = Array.from({ length: 10 }, (_, i) =>
        makeRec332(i, {
          purpose: i < 2 ? 'exposition' : 'development',
          dialogueHighlights: [0, 1, 5].includes(i) ? ['the trust holds'] : [],
        })
      );
      const res = await runT332(recs332ndd);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_DEVELOPMENT_SCENE_DESERT'), 'THEME_DEVELOPMENT_SCENE_DESERT should not fire');
    });

    it('THEME_CURIOSITY_PEAK_ABSENT fires when the highest-curiosity scene lacks theme', async () => {
      // 8 records: scenes 0,1,2 have theme; scene 3 has peak curiosityDelta=5 but no theme
      const recs332cp = Array.from({ length: 8 }, (_, i) =>
        makeRec332(i, {
          dialogueHighlights: [0, 1, 2].includes(i) ? ['a moment of courage'] : [],
          curiosityDelta: i === 3 ? 5 : 0,
        })
      );
      const res = await runT332(recs332cp);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_CURIOSITY_PEAK_ABSENT'), 'THEME_CURIOSITY_PEAK_ABSENT should fire');
    });

    it('THEME_CURIOSITY_PEAK_ABSENT does not fire when the peak curiosity scene carries theme', async () => {
      const recs332ncp = Array.from({ length: 8 }, (_, i) =>
        makeRec332(i, {
          dialogueHighlights: [0, 1, 2, 3].includes(i) ? ['a moment of courage'] : [],
          curiosityDelta: i === 3 ? 5 : 0,
        })
      );
      const res = await runT332(recs332ncp);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_CURIOSITY_PEAK_ABSENT'), 'THEME_CURIOSITY_PEAK_ABSENT should not fire');
    });

    it('THEME_ACT2B_DENSITY_DROP fires when theme density falls sharply from Act 2a to Act 2b', async () => {
      // n=12 → act2a=scenes 3-5, act2b=scenes 6-8; act2a all resonant, act2b none
      const recs332ad = Array.from({ length: 12 }, (_, i) =>
        makeRec332(i, {
          dialogueHighlights: (i >= 3 && i < 6) ? ['the courage to trust'] : [],
        })
      );
      const res = await runT332(recs332ad);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_ACT2B_DENSITY_DROP'), 'THEME_ACT2B_DENSITY_DROP should fire');
    });

    it('THEME_ACT2B_DENSITY_DROP does not fire when theme density holds from Act 2a to Act 2b', async () => {
      const recs332nad = Array.from({ length: 12 }, (_, i) =>
        makeRec332(i, {
          dialogueHighlights: (i >= 3 && i < 9) ? ['the courage to trust'] : [],
        })
      );
      const res = await runT332(recs332nad);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_ACT2B_DENSITY_DROP'), 'THEME_ACT2B_DENSITY_DROP should not fire');
    });
  });


  describe('Wave 321 — themePass: peak before midpoint, raise-stakes silent, suspense-release silent', async () => {
    const makeRec321 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const THEME321 = 'trust betrayal courage';
    const runT321 = async (records: any[]) => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      return themePass({
        fountain: '', original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: THEME321 },
      });
    };

    it('THEME_PEAK_BEFORE_MIDPOINT fires when the densest theme scene is in the first half', async () => {
      const recs321pk = Array.from({ length: 8 }, (_, i) =>
        makeRec321(i, {
          dialogueHighlights:
            i === 1 ? ['trust trust betrayal here']
            : [5, 6].includes(i) ? ['a moment of courage']
            : [],
        })
      );
      const res = await runT321(recs321pk);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_PEAK_BEFORE_MIDPOINT'), 'THEME_PEAK_BEFORE_MIDPOINT should fire');
    });

    it('THEME_PEAK_BEFORE_MIDPOINT does not fire when the peak is in the second half', async () => {
      const recs321npk = Array.from({ length: 8 }, (_, i) =>
        makeRec321(i, {
          dialogueHighlights:
            i === 6 ? ['trust trust betrayal here']
            : [0, 1].includes(i) ? ['a moment of courage']
            : [],
        })
      );
      const res = await runT321(recs321npk);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_PEAK_BEFORE_MIDPOINT'), 'THEME_PEAK_BEFORE_MIDPOINT should not fire');
    });

    it('THEME_RAISE_STAKES_SILENT fires when all stake-raising scenes are thematically empty', async () => {
      const recs321rs = Array.from({ length: 8 }, (_, i) =>
        makeRec321(i, {
          dialogueHighlights: [0, 1].includes(i) ? ['the trust holds'] : [],
          purpose: [3, 5].includes(i) ? 'raise_stakes' : 'development',
        })
      );
      const res = await runT321(recs321rs);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_RAISE_STAKES_SILENT'), 'THEME_RAISE_STAKES_SILENT should fire');
    });

    it('THEME_RAISE_STAKES_SILENT does not fire when a stake-raising scene carries theme', async () => {
      const recs321nrs = Array.from({ length: 8 }, (_, i) =>
        makeRec321(i, {
          dialogueHighlights:
            [0, 1].includes(i) ? ['the trust holds']
            : i === 3 ? ['their courage is tested']
            : [],
          purpose: [3, 5].includes(i) ? 'raise_stakes' : 'development',
        })
      );
      const res = await runT321(recs321nrs);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_RAISE_STAKES_SILENT'), 'THEME_RAISE_STAKES_SILENT should not fire');
    });

    it('THEME_SUSPENSE_RELEASE_SILENT fires when all tension-release scenes are thematically empty', async () => {
      const recs321sr = Array.from({ length: 8 }, (_, i) =>
        makeRec321(i, {
          dialogueHighlights: [0, 1].includes(i) ? ['the trust holds'] : [],
          clockDelta: [4, 6].includes(i) ? -1 : 0,
        })
      );
      const res = await runT321(recs321sr);
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_SUSPENSE_RELEASE_SILENT'), 'THEME_SUSPENSE_RELEASE_SILENT should fire');
    });

    it('THEME_SUSPENSE_RELEASE_SILENT does not fire when a release scene carries theme', async () => {
      const recs321nsr = Array.from({ length: 8 }, (_, i) =>
        makeRec321(i, {
          dialogueHighlights:
            [0, 1].includes(i) ? ['the trust holds']
            : i === 4 ? ['a quiet act of courage']
            : [],
          clockDelta: [4, 6].includes(i) ? -1 : 0,
        })
      );
      const res = await runT321(recs321nsr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_SUSPENSE_RELEASE_SILENT'), 'THEME_SUSPENSE_RELEASE_SILENT should not fire');
    });
  });


  describe('Wave 293 — themePass: revelation silent, clock scene silent, payoff silent', async () => {
    const makeRec293 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const THEME293 = 'trust and betrayal among friends';
    // Scene 0 has the theme word so silentScenes.length < records.length (inner block runs)
    const fountain293 = `INT. SC0 - DAY\nTrust is fragile here.\n\nINT. SC1 - DAY\nAction.\n`;
    const makeInput293 = (records: any[]) => ({
      fountain: fountain293, original: fountain293, records,
      structure: {} as any, annotations: [], approvedSpans: [],
      storyContext: { theme: THEME293 },
    });

    it('THEME_REVELATION_SILENT fires when ≥2 revelation scenes have no theme', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      const recs293rs = [
        makeRec293(0, { dialogueHighlights: ['trust matters here'] }), // resonant anchor
        makeRec293(1, { revelation: 'the killer is revealed' }),
        makeRec293(2, { revelation: 'the motive is exposed' }),
        makeRec293(3), makeRec293(4), makeRec293(5), makeRec293(6), makeRec293(7),
      ];
      const res = await themePass(makeInput293(recs293rs));
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_REVELATION_SILENT'), 'THEME_REVELATION_SILENT should fire');
    });

    it('THEME_REVELATION_SILENT does not fire when a revelation scene carries the theme', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // scene 1 has revelation AND is scene 1 in fountain (which has "trust" from the fountain text assigned to scene 0)
      // Actually fountain293 only has SC0 and SC1. sceneTexts is built from fountain sluglines.
      // SC0 = "Trust is fragile here." SC1 = "Action."
      // Scene 0 record is resonant (trust in text), scene 1 revelation = "trust is the killer's motive"
      // But sceneHasResonance checks the fountain text for that scene idx.
      // We need the fountain to have "trust" for revelation scene's sceneIdx.
      // Override: build a fountain with trust in scene 1 as well.
      const fountain293nr = `INT. SC0 - DAY\nTrust is fragile here.\n\nINT. SC1 - DAY\nBetrayal of trust is revealed.\n`;
      const recs293nrs = [
        makeRec293(0, { dialogueHighlights: ['trust matters here'] }),
        makeRec293(1, { revelation: 'a betrayal of trust' }),
        makeRec293(2, { revelation: 'another revelation' }),
        makeRec293(3), makeRec293(4), makeRec293(5), makeRec293(6), makeRec293(7),
      ];
      const res = await themePass({ ...makeInput293(recs293nrs), fountain: fountain293nr, original: fountain293nr });
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_REVELATION_SILENT'), 'THEME_REVELATION_SILENT should not fire');
    });

    it('THEME_CLOCK_SCENE_SILENT fires when ≥2 clockRaised scenes have no theme', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      const recs293cks = [
        makeRec293(0, { dialogueHighlights: ['trust matters here'] }), // resonant anchor
        makeRec293(1, { clockRaised: true }),
        makeRec293(2, { clockRaised: true }),
        makeRec293(3), makeRec293(4), makeRec293(5), makeRec293(6), makeRec293(7),
      ];
      const res = await themePass(makeInput293(recs293cks));
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_CLOCK_SCENE_SILENT'), 'THEME_CLOCK_SCENE_SILENT should fire');
    });

    it('THEME_CLOCK_SCENE_SILENT does not fire when a clock scene carries the theme', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      const fountain293nck = `INT. SC0 - DAY\nTrust is fragile here.\n\nINT. SC1 - DAY\nBetrayal of trust ticks down.\n`;
      const recs293ncks = [
        makeRec293(0, { dialogueHighlights: ['trust matters here'] }),
        makeRec293(1, { clockRaised: true }), // fountain SC1 has "trust"
        makeRec293(2, { clockRaised: true }),
        makeRec293(3), makeRec293(4), makeRec293(5), makeRec293(6), makeRec293(7),
      ];
      const res = await themePass({ ...makeInput293(recs293ncks), fountain: fountain293nck, original: fountain293nck });
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_CLOCK_SCENE_SILENT'), 'THEME_CLOCK_SCENE_SILENT should not fire');
    });

    it('THEME_PAYOFF_SILENT fires when ≥2 payoff scenes have no theme', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      const recs293ps = [
        makeRec293(0, { dialogueHighlights: ['trust matters here'] }), // resonant anchor
        makeRec293(1, { payoffSetupIds: ['setup-a'] }),
        makeRec293(2, { payoffSetupIds: ['setup-b'] }),
        makeRec293(3), makeRec293(4), makeRec293(5), makeRec293(6), makeRec293(7),
      ];
      const res = await themePass(makeInput293(recs293ps));
      assert.ok(res.issues.some((i: any) => i.rule === 'THEME_PAYOFF_SILENT'), 'THEME_PAYOFF_SILENT should fire');
    });

    it('THEME_PAYOFF_SILENT does not fire when a payoff scene carries the theme', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      const fountain293np = `INT. SC0 - DAY\nTrust is fragile here.\n\nINT. SC1 - DAY\nBetrayal of trust finally resolved.\n`;
      const recs293nps = [
        makeRec293(0, { dialogueHighlights: ['trust matters here'] }),
        makeRec293(1, { payoffSetupIds: ['setup-a'] }), // fountain SC1 has "trust"
        makeRec293(2, { payoffSetupIds: ['setup-b'] }),
        makeRec293(3), makeRec293(4), makeRec293(5), makeRec293(6), makeRec293(7),
      ];
      const res = await themePass({ ...makeInput293(recs293nps), fountain: fountain293np, original: fountain293np });
      assert.ok(!res.issues.some((i: any) => i.rule === 'THEME_PAYOFF_SILENT'), 'THEME_PAYOFF_SILENT should not fire');
    });
  });


  describe('Wave 279 — themePass: dramatic-turn decoupled, negative-shift silent, suspense cluster silent', async () => {
    const makeRec279 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const THEME279 = 'loyalty and trust among allies';
    // fountain has the theme word in scene 0 so resonance exists for the if-block to run
    const fountain279 = `INT. SC0 - DAY\nLoyalty matters.\n\nINT. SC1 - DAY\nAction.\n`;
    const makeInput279 = (records: any[]) => ({
      fountain: fountain279, original: fountain279, records,
      structure: {} as any, annotations: [], approvedSpans: [],
      storyContext: { theme: THEME279 },
    });

    it('THEME_DRAMATIC_TURN_DECOUPLED fires when ≥2 dramatic-turn scenes carry no theme', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      const recs279a = [
        makeRec279(0, { dialogueHighlights: ['loyalty matters here'] }), // resonant anchor
        makeRec279(1, { dramaticTurn: 'reversal' }),
        makeRec279(2, { dramaticTurn: 'revelation' }),
        makeRec279(3), makeRec279(4), makeRec279(5), makeRec279(6), makeRec279(7),
      ];
      const result279a = await themePass(makeInput279(recs279a));
      const fired279a = result279a.issues.filter(i => i.rule === 'THEME_DRAMATIC_TURN_DECOUPLED');
      assert.strictEqual(fired279a.length, 1, 'Should fire THEME_DRAMATIC_TURN_DECOUPLED when all turn-scenes have no theme');
    });

    it('THEME_DRAMATIC_TURN_DECOUPLED does NOT fire when a dramatic-turn scene carries the theme', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      const recs279b = [
        makeRec279(0, { dialogueHighlights: ['loyalty matters here'] }),
        makeRec279(1, { dramaticTurn: 'reversal', dialogueHighlights: ['a test of loyalty'] }), // resonant turn
        makeRec279(2, { dramaticTurn: 'revelation' }),
        makeRec279(3), makeRec279(4), makeRec279(5), makeRec279(6), makeRec279(7),
      ];
      const result279b = await themePass(makeInput279(recs279b));
      const fired279b = result279b.issues.filter(i => i.rule === 'THEME_DRAMATIC_TURN_DECOUPLED');
      assert.strictEqual(fired279b.length, 0, 'Should NOT fire THEME_DRAMATIC_TURN_DECOUPLED when a turn-scene carries theme');
    });

    it('THEME_NEGATIVE_SHIFT_SILENT fires when ≥2 negative-shift scenes carry no theme', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      const recs279c = [
        makeRec279(0, { dialogueHighlights: ['loyalty matters here'] }),
        makeRec279(1, { emotionalShift: 'negative' }),
        makeRec279(2, { emotionalShift: 'negative' }),
        makeRec279(3), makeRec279(4), makeRec279(5), makeRec279(6), makeRec279(7),
      ];
      const result279c = await themePass(makeInput279(recs279c));
      const fired279c = result279c.issues.filter(i => i.rule === 'THEME_NEGATIVE_SHIFT_SILENT');
      assert.strictEqual(fired279c.length, 1, 'Should fire THEME_NEGATIVE_SHIFT_SILENT when negative-shift scenes have no theme');
    });

    it('THEME_NEGATIVE_SHIFT_SILENT does NOT fire when a negative-shift scene carries the theme', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      const recs279d = [
        makeRec279(0, { dialogueHighlights: ['loyalty matters here'] }),
        makeRec279(1, { emotionalShift: 'negative', dialogueHighlights: ['loyalty betrayed'] }), // resonant
        makeRec279(2, { emotionalShift: 'negative' }),
        makeRec279(3), makeRec279(4), makeRec279(5), makeRec279(6), makeRec279(7),
      ];
      const result279d = await themePass(makeInput279(recs279d));
      const fired279d = result279d.issues.filter(i => i.rule === 'THEME_NEGATIVE_SHIFT_SILENT');
      assert.strictEqual(fired279d.length, 0, 'Should NOT fire THEME_NEGATIVE_SHIFT_SILENT when a negative-shift scene has theme');
    });

    it('THEME_SUSPENSE_CLUSTER_SILENT fires when ≥3 high-suspense scenes carry no theme', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      const recs279e = [
        makeRec279(0, { dialogueHighlights: ['loyalty matters here'] }),
        makeRec279(1, { suspenseDelta: 2 }),
        makeRec279(2, { suspenseDelta: 3 }),
        makeRec279(3, { suspenseDelta: 1.5 }),
        makeRec279(4), makeRec279(5), makeRec279(6), makeRec279(7),
      ];
      const result279e = await themePass(makeInput279(recs279e));
      const fired279e = result279e.issues.filter(i => i.rule === 'THEME_SUSPENSE_CLUSTER_SILENT');
      assert.strictEqual(fired279e.length, 1, 'Should fire THEME_SUSPENSE_CLUSTER_SILENT when all high-suspense scenes lack theme');
    });

    it('THEME_SUSPENSE_CLUSTER_SILENT does NOT fire when a high-suspense scene carries the theme', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      const recs279f = [
        makeRec279(0, { dialogueHighlights: ['loyalty matters here'] }),
        makeRec279(1, { suspenseDelta: 2, dialogueHighlights: ['loyalty under pressure'] }), // resonant
        makeRec279(2, { suspenseDelta: 3 }),
        makeRec279(3, { suspenseDelta: 1.5 }),
        makeRec279(4), makeRec279(5), makeRec279(6), makeRec279(7),
      ];
      const result279f = await themePass(makeInput279(recs279f));
      const fired279f = result279f.issues.filter(i => i.rule === 'THEME_SUSPENSE_CLUSTER_SILENT');
      assert.strictEqual(fired279f.length, 0, 'Should NOT fire THEME_SUSPENSE_CLUSTER_SILENT when a high-suspense scene has theme');
    });
  });


  describe('Wave 265 — themePass: clue decoupled, curiosity decoupled, payoff decoupled', async () => {
    const makeRec265 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput265 = (records: any[], fountain: string) => ({
      fountain, original: fountain,
      records: records as any, structure: {} as any,
      storyContext: { theme: 'trust and betrayal' } as any,
      annotations: records.map(() => null) as any,
      approvedSpans: [],
    });
    const res265 = (i: number) => `INT. SC${i} - DAY\nThe trust between them holds.\n`;
    const sil265 = (i: number) => `INT. SC${i} - DAY\nThey proceed carefully.\n`;

    it('THEME_CLUE_DECOUPLED fires when all clue-planting scenes are thematically silent', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      const f265a = [res265(0), sil265(1), res265(2), sil265(3), res265(4), res265(5)].join('\n');
      const records265a = [
        makeRec265(0), makeRec265(1, { seededClueIds: ['clue-a'] }),
        makeRec265(2), makeRec265(3, { seededClueIds: ['clue-b'] }),
        makeRec265(4), makeRec265(5),
      ];
      const result265a = await themePass(makeInput265(records265a, f265a));
      assert.ok(result265a.issues.some((i: any) => i.rule === 'THEME_CLUE_DECOUPLED'), `Expected THEME_CLUE_DECOUPLED, got: ${JSON.stringify(result265a.issues.map((i: any) => i.rule))}`);
    });

    it('THEME_CLUE_DECOUPLED does NOT fire when at least one clue scene carries thematic language', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      const f265b = [res265(0), res265(1), res265(2), sil265(3), res265(4), res265(5)].join('\n');
      const records265b = [
        makeRec265(0), makeRec265(1, { seededClueIds: ['clue-a'] }),
        makeRec265(2), makeRec265(3, { seededClueIds: ['clue-b'] }),
        makeRec265(4), makeRec265(5),
      ];
      const result265b = await themePass(makeInput265(records265b, f265b));
      assert.ok(!result265b.issues.some((i: any) => i.rule === 'THEME_CLUE_DECOUPLED'), 'Should NOT fire when a clue scene resonates with the theme');
    });

    it('THEME_CURIOSITY_DECOUPLED fires when all high-curiosity scenes are thematically silent', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      const f265c = [
        res265(0), sil265(1), res265(2), res265(3),
        sil265(4), res265(5), res265(6), sil265(7),
      ].join('\n');
      const records265c = [
        makeRec265(0), makeRec265(1, { curiosityDelta: 2 }),
        makeRec265(2), makeRec265(3),
        makeRec265(4, { curiosityDelta: 2 }), makeRec265(5),
        makeRec265(6), makeRec265(7),
      ];
      const result265c = await themePass(makeInput265(records265c, f265c));
      assert.ok(result265c.issues.some((i: any) => i.rule === 'THEME_CURIOSITY_DECOUPLED'), `Expected THEME_CURIOSITY_DECOUPLED, got: ${JSON.stringify(result265c.issues.map((i: any) => i.rule))}`);
    });

    it('THEME_CURIOSITY_DECOUPLED does NOT fire when a curiosity spike carries thematic language', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      const f265d = [
        res265(0), res265(1), res265(2), res265(3),
        sil265(4), res265(5), res265(6), sil265(7),
      ].join('\n');
      const records265d = [
        makeRec265(0), makeRec265(1, { curiosityDelta: 2 }),
        makeRec265(2), makeRec265(3),
        makeRec265(4, { curiosityDelta: 2 }), makeRec265(5),
        makeRec265(6), makeRec265(7),
      ];
      const result265d = await themePass(makeInput265(records265d, f265d));
      assert.ok(!result265d.issues.some((i: any) => i.rule === 'THEME_CURIOSITY_DECOUPLED'), 'Should NOT fire when a curiosity spike is in a resonant scene');
    });

    it('THEME_PAYOFF_DECOUPLED fires when all payoff scenes are thematically silent', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      const f265e = [
        res265(0), sil265(1), res265(2), res265(3),
        sil265(4), res265(5), res265(6), res265(7),
      ].join('\n');
      const records265e = [
        makeRec265(0), makeRec265(1, { payoffSetupIds: ['setup-a'] }),
        makeRec265(2), makeRec265(3),
        makeRec265(4, { payoffSetupIds: ['setup-b'] }), makeRec265(5),
        makeRec265(6), makeRec265(7),
      ];
      const result265e = await themePass(makeInput265(records265e, f265e));
      assert.ok(result265e.issues.some((i: any) => i.rule === 'THEME_PAYOFF_DECOUPLED'), `Expected THEME_PAYOFF_DECOUPLED, got: ${JSON.stringify(result265e.issues.map((i: any) => i.rule))}`);
    });

    it('THEME_PAYOFF_DECOUPLED does NOT fire when at least one payoff scene carries thematic language', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      const f265f = [
        res265(0), res265(1), res265(2), res265(3),
        sil265(4), res265(5), res265(6), res265(7),
      ].join('\n');
      const records265f = [
        makeRec265(0), makeRec265(1, { payoffSetupIds: ['setup-a'] }),
        makeRec265(2), makeRec265(3),
        makeRec265(4, { payoffSetupIds: ['setup-b'] }), makeRec265(5),
        makeRec265(6), makeRec265(7),
      ];
      const result265f = await themePass(makeInput265(records265f, f265f));
      assert.ok(!result265f.issues.some((i: any) => i.rule === 'THEME_PAYOFF_DECOUPLED'), 'Should NOT fire when a payoff scene resonates with the theme');
    });
  });


  describe('Wave 251 — themePass: final scene silent, positive shift silent, resonance clustering', async () => {
    const makeRec251 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput251 = (records: any[], fountain: string) => ({
      fountain, original: fountain,
      records: records as any, structure: {} as any,
      storyContext: { theme: 'trust and betrayal' } as any,
      annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('THEME_FINAL_SCENE_SILENT fires when the final scene contains no thematic language', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      const resonant = (i: number) => `INT. SC${i} - DAY\nThe trust between them holds firm.\n`;
      const silent   = (i: number) => `INT. SC${i} - DAY\nThe contract is signed. Nothing more.\n`;
      const fountain251a = [resonant(0), resonant(1), resonant(2), resonant(3), resonant(4), silent(5)].join('\n');
      const records251a = Array.from({ length: 6 }, (_, i) => makeRec251(i));
      const result = await themePass(makeInput251(records251a, fountain251a));
      assert.ok(result.issues.some((i: any) => i.rule === 'THEME_FINAL_SCENE_SILENT'), `Expected THEME_FINAL_SCENE_SILENT, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('THEME_FINAL_SCENE_SILENT does NOT fire when the final scene contains thematic language', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      const resonant = (i: number) => `INT. SC${i} - DAY\nThe trust between them holds firm.\n`;
      const fountain251b = Array.from({ length: 6 }, (_, i) => resonant(i)).join('\n');
      const records251b = Array.from({ length: 6 }, (_, i) => makeRec251(i));
      const result = await themePass(makeInput251(records251b, fountain251b));
      assert.ok(!result.issues.some((i: any) => i.rule === 'THEME_FINAL_SCENE_SILENT'), 'Should NOT fire when final scene has thematic language');
    });

    it('THEME_POSITIVE_SHIFT_SILENT fires when all positive-shift scenes lack thematic language', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // Scene 0 resonant+neutral; scenes 2,3 silent+positive; scenes 4,5 resonant+neutral
      const makeScene = (i: number, resonant: boolean) =>
        `INT. SC${i} - DAY\n${resonant ? 'trust endures here.' : 'The meeting goes well.'}\n`;
      const fountain251c = [makeScene(0,true), makeScene(1,true), makeScene(2,false), makeScene(3,false), makeScene(4,true), makeScene(5,true)].join('\n');
      const records251c = [
        makeRec251(0), makeRec251(1),
        makeRec251(2, { emotionalShift: 'positive' }),
        makeRec251(3, { emotionalShift: 'positive' }),
        makeRec251(4), makeRec251(5),
      ];
      const result = await themePass(makeInput251(records251c, fountain251c));
      assert.ok(result.issues.some((i: any) => i.rule === 'THEME_POSITIVE_SHIFT_SILENT'), `Expected THEME_POSITIVE_SHIFT_SILENT, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('THEME_POSITIVE_SHIFT_SILENT does NOT fire when at least one positive-shift scene is thematically resonant', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      const makeScene = (i: number, resonant: boolean) =>
        `INT. SC${i} - DAY\n${resonant ? 'trust is restored between them.' : 'The meeting proceeds.'}\n`;
      // Scene 2 is positive AND resonant
      const fountain251d = [makeScene(0,true), makeScene(1,true), makeScene(2,true), makeScene(3,false), makeScene(4,true), makeScene(5,true)].join('\n');
      const records251d = [
        makeRec251(0), makeRec251(1),
        makeRec251(2, { emotionalShift: 'positive' }),
        makeRec251(3, { emotionalShift: 'positive' }),
        makeRec251(4), makeRec251(5),
      ];
      const result = await themePass(makeInput251(records251d, fountain251d));
      assert.ok(!result.issues.some((i: any) => i.rule === 'THEME_POSITIVE_SHIFT_SILENT'), 'Should NOT fire when a positive-shift scene is thematically resonant');
    });

    it('THEME_RESONANCE_CLUSTERING fires when 65%+ of resonant scenes cluster in one act zone', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // 8 records; scenes 2,3,4,5 resonant (Act 2: sceneIdx 2-5 = 4/5 resonant = 80%)
      const makeScene251e = (i: number, resonant: boolean) =>
        `INT. SC${i} - DAY\n${resonant ? 'trust shapes every decision here.' : 'A quiet day. Nothing unusual.'}\n`;
      const fountain251e = Array.from({ length: 8 }, (_, i) => makeScene251e(i, i >= 2 && i <= 6)).join('\n');
      const records251e = Array.from({ length: 8 }, (_, i) => makeRec251(i));
      const result = await themePass(makeInput251(records251e, fountain251e));
      assert.ok(result.issues.some((i: any) => i.rule === 'THEME_RESONANCE_CLUSTERING'), `Expected THEME_RESONANCE_CLUSTERING, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('THEME_RESONANCE_CLUSTERING does NOT fire when resonant scenes are distributed across acts', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // 8 records; resonant at 0,2,5,7 — spread across Act1, Act2, Act3
      const makeScene251f = (i: number) =>
        `INT. SC${i} - DAY\n${[0,2,5,7].includes(i) ? 'trust shapes every decision.' : 'A quiet scene.'}\n`;
      const fountain251f = Array.from({ length: 8 }, (_, i) => makeScene251f(i)).join('\n');
      const records251f = Array.from({ length: 8 }, (_, i) => makeRec251(i));
      const result = await themePass(makeInput251(records251f, fountain251f));
      assert.ok(!result.issues.some((i: any) => i.rule === 'THEME_RESONANCE_CLUSTERING'), 'Should NOT fire when resonant scenes are spread across acts');
    });
  });


  describe('Wave 237 — themePass: revelation decoupled, clock resonance absent, relationship-shift decoupled', async () => {
    const makeRec237 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 1.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput237 = (records: any[]) => ({
      fountain: records.map((r: any) => `${r.slug}\nAction line.\n`).join('\n'),
      original: records.map((r: any) => `${r.slug}\nAction line.\n`).join('\n'),
      records: records as any, structure: {} as any,
      storyContext: { theme: 'betrayal destroys trust' },
      annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('THEME_REVELATION_DECOUPLED fires when all revelation scenes lack thematic language', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // Scenes 0,1 resonant (theme word in dialogue); scenes 2,3,4 have revelations but no theme words
      const records237a = [
        makeRec237(0, { dialogueHighlights: ['the betrayal runs deep'], emotionalShift: 'negative' }),
        makeRec237(1, { dialogueHighlights: ['trust was broken long ago'] }),
        makeRec237(2, { revelation: 'A secret location is found.' }),
        makeRec237(3, { revelation: 'The safe is empty.' }),
        makeRec237(4, { revelation: 'Someone left early that night.', emotionalShift: 'negative', suspenseDelta: 2 }),
        makeRec237(5, { dialogueHighlights: ['betrayal scars everyone'] }),
      ];
      const result = await themePass(makeInput237(records237a));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'THEME_REVELATION_DECOUPLED'),
        `Expected THEME_REVELATION_DECOUPLED, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`,
      );
    });

    it('THEME_REVELATION_DECOUPLED does NOT fire when at least one revelation carries thematic language', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // Scene 2 revelation contains 'betrayal' → resonant
      const records237b = [
        makeRec237(0, { dialogueHighlights: ['trust was everything'], emotionalShift: 'negative' }),
        makeRec237(1, { dialogueHighlights: ['betrayal is the wound'] }),
        makeRec237(2, { revelation: 'The betrayal had been planned from the start.' }),
        makeRec237(3, { revelation: 'The safe is empty.' }),
        makeRec237(4, { revelation: 'Someone left early.', suspenseDelta: 2 }),
        makeRec237(5, { dialogueHighlights: ['trust rebuilt slowly'] }),
      ];
      const result = await themePass(makeInput237(records237b));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'THEME_REVELATION_DECOUPLED'),
        'Should NOT fire when at least one revelation carries thematic language',
      );
    });

    it('THEME_CLOCK_RESONANCE_ABSENT fires when clock scenes all lack thematic language', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // Scenes 0,1 resonant; scenes 2,3 have clockRaised but no theme words
      const records237c = [
        makeRec237(0, { dialogueHighlights: ['the betrayal cost everything'], emotionalShift: 'negative' }),
        makeRec237(1, { dialogueHighlights: ['trust is the real casualty'] }),
        makeRec237(2, { clockRaised: true }),
        makeRec237(3, { clockRaised: true, suspenseDelta: 2 }),
        makeRec237(4, {}),
        makeRec237(5, { dialogueHighlights: ['betrayal echoes forward'] }),
      ];
      const result = await themePass(makeInput237(records237c));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'THEME_CLOCK_RESONANCE_ABSENT'),
        `Expected THEME_CLOCK_RESONANCE_ABSENT, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`,
      );
    });

    it('THEME_CLOCK_RESONANCE_ABSENT does NOT fire when at least one clock scene carries thematic language', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // Scene 2 has clockRaised AND theme word in dialogue
      const records237d = [
        makeRec237(0, { dialogueHighlights: ['the betrayal cost everything'], emotionalShift: 'negative' }),
        makeRec237(1, { dialogueHighlights: ['trust was the first casualty'] }),
        makeRec237(2, { clockRaised: true, dialogueHighlights: ['the betrayal cannot be undone in time'] }),
        makeRec237(3, { clockRaised: true, suspenseDelta: 2 }),
        makeRec237(4, {}),
        makeRec237(5, { dialogueHighlights: ['trust rebuilt', 'betrayal fades'] }),
      ];
      const result = await themePass(makeInput237(records237d));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'THEME_CLOCK_RESONANCE_ABSENT'),
        'Should NOT fire when at least one clock scene carries thematic language',
      );
    });

    it('THEME_RELATIONSHIP_SHIFT_DECOUPLED fires when all relationship-shift scenes lack thematic language', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      const rs237 = (pair: string, amt: number) => ({ pairKey: pair, dimension: 'power', amount: amt });
      // Scenes 0,1 resonant; scenes 2,3,4 have relationship shifts but no theme words
      const records237e = [
        makeRec237(0, { dialogueHighlights: ['betrayal is the wound that never heals'], emotionalShift: 'negative' }),
        makeRec237(1, { dialogueHighlights: ['trust collapses slowly'] }),
        makeRec237(2, { relationshipShifts: [rs237('alice|bob', -0.5)] }),
        makeRec237(3, { relationshipShifts: [rs237('alice|bob', 0.3)], suspenseDelta: 2 }),
        makeRec237(4, { relationshipShifts: [rs237('bob|carol', -0.4)] }),
        makeRec237(5, { dialogueHighlights: ['betrayal scars the bond'] }),
      ];
      const result = await themePass(makeInput237(records237e));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'THEME_RELATIONSHIP_SHIFT_DECOUPLED'),
        `Expected THEME_RELATIONSHIP_SHIFT_DECOUPLED, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`,
      );
    });

    it('THEME_RELATIONSHIP_SHIFT_DECOUPLED does NOT fire when at least one relationship-shift scene carries thematic language', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      const rs237 = (pair: string, amt: number) => ({ pairKey: pair, dimension: 'power', amount: amt });
      // Scene 2 has both relationship shift AND theme word
      const records237f = [
        makeRec237(0, { dialogueHighlights: ['betrayal is the wound'], emotionalShift: 'negative' }),
        makeRec237(1, { dialogueHighlights: ['trust runs thin'] }),
        makeRec237(2, { relationshipShifts: [rs237('alice|bob', -0.5)], dialogueHighlights: ['betrayal cracks the bond'] }),
        makeRec237(3, { relationshipShifts: [rs237('alice|bob', 0.3)], suspenseDelta: 2 }),
        makeRec237(4, { relationshipShifts: [rs237('bob|carol', -0.4)] }),
        makeRec237(5, { dialogueHighlights: ['trust returns to those who stayed'] }),
      ];
      const result = await themePass(makeInput237(records237f));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'THEME_RELATIONSHIP_SHIFT_DECOUPLED'),
        'Should NOT fire when at least one relationship-shift scene carries thematic language',
      );
    });
  });


  describe('Wave 208 — themePass: consecutive resonant surfeit, first-act resolution, subplot isolation', async () => {
    const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');

    const makeRec208 = (idx: number, extra: Partial<any> = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'action', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
      seededClueIds: [], payoffSetupIds: [], dialogueHighlights: [],
      relationshipShifts: [], unresolvedClues: [],
      ...extra,
    });

    const minFountain208 = 'INT. SCENE - DAY\n\nAction.\n';

    it('THEME_CONSECUTIVE_RESONANT_SURFEIT fires when 5+ consecutive scenes all carry the theme', async () => {
      // 10 records; resonant at indices 2–7 (run of 6), plus 9. Max run = 6 ≥ 5.
      const records208a = [
        makeRec208(0),
        makeRec208(1),
        makeRec208(2, { dialogueHighlights: ['loyalty above all'] }),
        makeRec208(3, { dialogueHighlights: ['loyalty is tested'] }),
        makeRec208(4, { dialogueHighlights: ['loyalty matters'] }),
        makeRec208(5, { dialogueHighlights: ['loyalty questioned'], emotionalShift: 'negative', suspenseDelta: -2 }),
        makeRec208(6, { dialogueHighlights: ['loyalty regained'] }),
        makeRec208(7, { dialogueHighlights: ['loyalty proven'], emotionalShift: 'negative', suspenseDelta: 3 }),
        makeRec208(8),
        makeRec208(9, { dialogueHighlights: ['loyalty endures'], emotionalShift: 'positive' }),
      ];
      const result208a = await themePass({
        fountain: minFountain208, original: minFountain208,
        records: records208a, structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'loyalty' },
      });
      assert.ok(
        result208a.issues.some(i => i.rule === 'THEME_CONSECUTIVE_RESONANT_SURFEIT'),
        'Should fire THEME_CONSECUTIVE_RESONANT_SURFEIT when 6 consecutive scenes all carry the theme',
      );
    });

    it('THEME_CONSECUTIVE_RESONANT_SURFEIT does NOT fire when the longest resonant run is under 5', async () => {
      // 10 records; resonant at 0–3 (run of 4), silent at 4–5, resonant at 6–9 (run of 4). Max run = 4.
      const records208b = [
        makeRec208(0, { dialogueHighlights: ['loyalty opens'] }),
        makeRec208(1, { dialogueHighlights: ['loyalty builds'] }),
        makeRec208(2, { dialogueHighlights: ['loyalty challenged'], emotionalShift: 'negative' }),
        makeRec208(3, { dialogueHighlights: ['loyalty holds'] }),
        makeRec208(4),
        makeRec208(5),
        makeRec208(6, { dialogueHighlights: ['loyalty returns'] }),
        makeRec208(7, { dialogueHighlights: ['loyalty climax'], emotionalShift: 'negative', suspenseDelta: 3 }),
        makeRec208(8, { dialogueHighlights: ['loyalty settled'] }),
        makeRec208(9, { dialogueHighlights: ['loyalty endures'], emotionalShift: 'positive' }),
      ];
      const result208b = await themePass({
        fountain: minFountain208, original: minFountain208,
        records: records208b, structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'loyalty' },
      });
      assert.ok(
        !result208b.issues.some(i => i.rule === 'THEME_CONSECUTIVE_RESONANT_SURFEIT'),
        'Should NOT fire when the longest consecutive run of resonant scenes is exactly 4',
      );
    });

    it('THEME_FIRST_ACT_RESOLUTION fires when Act 1 answers the theme before testing it', async () => {
      // 8 records; Act 1 = indices 0–1. Scene 1 resonant with positive, no clock, suspenseDelta≥0.
      // No act1 scene with negative shift → fires.
      const records208c = [
        makeRec208(0),
        makeRec208(1, { dialogueHighlights: ['loyalty prevails'], emotionalShift: 'positive', suspenseDelta: 0 }),
        makeRec208(2, { dialogueHighlights: ['loyalty tested'] }),
        makeRec208(3, { dialogueHighlights: ['loyalty broken'], emotionalShift: 'negative' }),
        makeRec208(4),
        makeRec208(5, { dialogueHighlights: ['loyalty costs'] }),
        makeRec208(6, { dialogueHighlights: ['loyalty earned'], emotionalShift: 'negative', suspenseDelta: 3 }),
        makeRec208(7, { dialogueHighlights: ['loyalty wins'], emotionalShift: 'positive' }),
      ];
      const result208c = await themePass({
        fountain: minFountain208, original: minFountain208,
        records: records208c, structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'loyalty' },
      });
      assert.ok(
        result208c.issues.some(i => i.rule === 'THEME_FIRST_ACT_RESOLUTION'),
        'Should fire THEME_FIRST_ACT_RESOLUTION when Act 1 has a positive, unthreatened thematic scene with no challenge',
      );
    });

    it('THEME_FIRST_ACT_RESOLUTION does NOT fire when the Act 1 thematic scene is neutral rather than resolved', async () => {
      // Same structure but scene 1 has emotionalShift='neutral' — no easy answer.
      const records208d = [
        makeRec208(0),
        makeRec208(1, { dialogueHighlights: ['loyalty questioned'], emotionalShift: 'neutral', suspenseDelta: 0 }),
        makeRec208(2, { dialogueHighlights: ['loyalty tested'] }),
        makeRec208(3, { dialogueHighlights: ['loyalty broken'], emotionalShift: 'negative' }),
        makeRec208(4),
        makeRec208(5, { dialogueHighlights: ['loyalty costs'] }),
        makeRec208(6, { dialogueHighlights: ['loyalty earned'], emotionalShift: 'negative', suspenseDelta: 3 }),
        makeRec208(7, { dialogueHighlights: ['loyalty wins'], emotionalShift: 'positive' }),
      ];
      const result208d = await themePass({
        fountain: minFountain208, original: minFountain208,
        records: records208d, structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'loyalty' },
      });
      assert.ok(
        !result208d.issues.some(i => i.rule === 'THEME_FIRST_ACT_RESOLUTION'),
        'Should NOT fire when the Act 1 thematic scene is emotionally neutral rather than positively resolved',
      );
    });

    it('THEME_SUBPLOT_ISOLATION fires when theme only appears in revelation/exposition scenes', async () => {
      // 8 records; all 5 resonant scenes have revelation set; 2 action scenes (dramaticTurn!='nothing') are silent.
      const records208e = [
        makeRec208(0, { revelation: 'loyalty above all', emotionalShift: 'neutral' }),
        makeRec208(1, { dramaticTurn: 'reversal' }),  // action, silent
        makeRec208(2, { revelation: 'loyalty is tested' }),
        makeRec208(3, { dramaticTurn: 'decision' }),  // action, silent
        makeRec208(4, { revelation: 'loyalty costs', emotionalShift: 'negative' }),
        makeRec208(5),
        makeRec208(6, { revelation: 'loyalty earned', emotionalShift: 'negative', suspenseDelta: 3 }),
        makeRec208(7, { revelation: 'loyalty wins', emotionalShift: 'positive' }),
      ];
      const result208e = await themePass({
        fountain: minFountain208, original: minFountain208,
        records: records208e, structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'loyalty' },
      });
      assert.ok(
        result208e.issues.some(i => i.rule === 'THEME_SUBPLOT_ISOLATION'),
        'Should fire THEME_SUBPLOT_ISOLATION when every resonant scene is a revelation/exposition scene',
      );
    });

    it('THEME_SUBPLOT_ISOLATION does NOT fire when at least one action scene carries the theme', async () => {
      // Same setup but scene 2 carries theme via dialogueHighlights (revelation=null).
      const records208f = [
        makeRec208(0, { revelation: 'loyalty above all', emotionalShift: 'neutral' }),
        makeRec208(1, { dramaticTurn: 'reversal' }),
        makeRec208(2, { dialogueHighlights: ['loyalty matters'], revelation: null }),
        makeRec208(3, { dramaticTurn: 'decision' }),
        makeRec208(4, { revelation: 'loyalty costs', emotionalShift: 'negative' }),
        makeRec208(5),
        makeRec208(6, { revelation: 'loyalty earned', emotionalShift: 'negative', suspenseDelta: 3 }),
        makeRec208(7, { revelation: 'loyalty wins', emotionalShift: 'positive' }),
      ];
      const result208f = await themePass({
        fountain: minFountain208, original: minFountain208,
        records: records208f, structure: {} as any, annotations: [], approvedSpans: [],
        storyContext: { theme: 'loyalty' },
      });
      assert.ok(
        !result208f.issues.some(i => i.rule === 'THEME_SUBPLOT_ISOLATION'),
        'Should NOT fire when at least one resonant scene has revelation=null (action scene carries theme)',
      );
    });
  });


  describe('Wave 194 — themePass: act2 desert, resolution silent, density inversion', async () => {
    const blankFountain194 = (n: number) =>
      Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join('');
    const themeCtx194 = { theme: 'loyalty and betrayal define us', genre: 'drama' };
    const makeRec194 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      dialogueHighlights: [], revelation: null,
      emotionalShift: 'neutral', suspenseDelta: 0,
      relationshipShifts: [], clockRaised: false, clockDelta: 0,
      purpose: 'dialogue', dramaticTurn: 'nothing',
      seededClueIds: [], payoffSetupIds: [],
      ...overrides,
    });

    it('THEME_ACT2_DESERT fires when act2 has fewer than 30% resonant scenes', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // 8 records: only record 0 and 7 have theme; act2 (records 2-5) is barren
      const records = [
        makeRec194(0, { dialogueHighlights: ['loyalty above everything'] }),
        makeRec194(1), makeRec194(2), makeRec194(3),
        makeRec194(4), makeRec194(5), makeRec194(6),
        makeRec194(7, { dialogueHighlights: ['loyalty endures'] }),
      ];
      const result = await themePass({
        fountain: blankFountain194(8), original: blankFountain194(8),
        records: records as any, structure: {} as any, storyContext: themeCtx194,
        annotations: [], approvedSpans: [],
      });
      assert.ok(result.issues.some((i: any) => i.rule === 'THEME_ACT2_DESERT'),
        'Should fire when act2 has 0% resonant scenes');
    });

    it('THEME_ACT2_DESERT does not fire when act2 has sufficient resonance', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // 8 records: all scenes carry theme
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec194(i, { dialogueHighlights: ['loyalty defines everything'] }),
      );
      const result = await themePass({
        fountain: blankFountain194(8), original: blankFountain194(8),
        records: records as any, structure: {} as any, storyContext: themeCtx194,
        annotations: [], approvedSpans: [],
      });
      assert.ok(!result.issues.some((i: any) => i.rule === 'THEME_ACT2_DESERT'),
        'Should NOT fire when all act2 scenes resonate');
    });

    it('THEME_RESOLUTION_SILENT fires when the final scene has no thematic language', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // 4 records: records 0-2 carry theme, record 3 (final) is silent
      const records = [
        makeRec194(0, { dialogueHighlights: ['loyalty above everything'] }),
        makeRec194(1, { dialogueHighlights: ['betrayal cuts deep'] }),
        makeRec194(2, { dialogueHighlights: ['loyalty endures'] }),
        makeRec194(3),
      ];
      const result = await themePass({
        fountain: blankFountain194(4), original: blankFountain194(4),
        records: records as any, structure: {} as any, storyContext: themeCtx194,
        annotations: [], approvedSpans: [],
      });
      assert.ok(result.issues.some((i: any) => i.rule === 'THEME_RESOLUTION_SILENT'),
        'Should fire when final scene carries no thematic language');
    });

    it('THEME_RESOLUTION_SILENT does not fire when the final scene carries the theme', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // 4 records: all carry theme, including the final scene
      const records = [
        makeRec194(0, { dialogueHighlights: ['loyalty above everything'] }),
        makeRec194(1, { dialogueHighlights: ['betrayal cuts deep'] }),
        makeRec194(2, { dialogueHighlights: ['loyalty endures'] }),
        makeRec194(3, { dialogueHighlights: ['loyalty is all we have'] }),
      ];
      const result = await themePass({
        fountain: blankFountain194(4), original: blankFountain194(4),
        records: records as any, structure: {} as any, storyContext: themeCtx194,
        annotations: [], approvedSpans: [],
      });
      assert.ok(!result.issues.some((i: any) => i.rule === 'THEME_RESOLUTION_SILENT'),
        'Should NOT fire when final scene is thematically resonant');
    });

    it('THEME_DENSITY_INVERSION fires when first half has more resonant scenes than second', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // 8 records: first half (0-3) all resonant, second half (4-7) all silent
      const records = [
        makeRec194(0, { dialogueHighlights: ['loyalty above everything'] }),
        makeRec194(1, { dialogueHighlights: ['betrayal is real'] }),
        makeRec194(2, { dialogueHighlights: ['loyalty endures'] }),
        makeRec194(3, { dialogueHighlights: ['betrayal costs us'] }),
        makeRec194(4), makeRec194(5), makeRec194(6), makeRec194(7),
      ];
      const result = await themePass({
        fountain: blankFountain194(8), original: blankFountain194(8),
        records: records as any, structure: {} as any, storyContext: themeCtx194,
        annotations: [], approvedSpans: [],
      });
      assert.ok(result.issues.some((i: any) => i.rule === 'THEME_DENSITY_INVERSION'),
        'Should fire when first-half resonance density exceeds second-half');
    });

    it('THEME_DENSITY_INVERSION does not fire when second half has more resonant scenes', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // 8 records: first half (0-3) all silent, second half (4-7) all resonant
      const records = [
        makeRec194(0), makeRec194(1), makeRec194(2), makeRec194(3),
        makeRec194(4, { dialogueHighlights: ['loyalty above everything'] }),
        makeRec194(5, { dialogueHighlights: ['betrayal is real'] }),
        makeRec194(6, { dialogueHighlights: ['loyalty endures'] }),
        makeRec194(7, { dialogueHighlights: ['betrayal costs us'] }),
      ];
      const result = await themePass({
        fountain: blankFountain194(8), original: blankFountain194(8),
        records: records as any, structure: {} as any, storyContext: themeCtx194,
        annotations: [], approvedSpans: [],
      });
      assert.ok(!result.issues.some((i: any) => i.rule === 'THEME_DENSITY_INVERSION'),
        'Should NOT fire when second half carries more thematic scenes');
    });
  });


  describe('Wave 162 — themePass: midpoint silent, accelerating density absent, act3 dialectic', async () => {
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
    const themeCtx = { theme: 'loyalty and betrayal define us', genre: 'drama' };

    it('themePass detects THEME_MIDPOINT_SILENT when midpoint zone lacks thematic language', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // 8 scenes: theme in 0,1,6,7 — midpoint zone (3,4,5) has no theme keywords
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, {
          dialogueHighlights: (i === 0 || i === 1)
            ? [`alice: loyalty above everything`]
            : (i === 6 || i === 7)
            ? [`bob: betrayal changes everything`]
            : [],
        }),
      );
      const result = await themePass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: {} as any, storyContext: themeCtx,
        annotations: [], approvedSpans: [],
      });
      const midSilent = result.issues.filter(i => i.rule === 'THEME_MIDPOINT_SILENT');
      assert.ok(midSilent.length >= 1, `Should detect THEME_MIDPOINT_SILENT; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(midSilent[0].severity === 'major');
    });

    it('themePass does NOT fire THEME_MIDPOINT_SILENT when midpoint has theme language', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // midpoint scene 4 has loyalty keyword
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, {
          dialogueHighlights: (i === 0 || i === 4 || i === 7)
            ? ['alice: loyalty is everything']
            : [],
        }),
      );
      const result = await themePass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: {} as any, storyContext: themeCtx,
        annotations: [], approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'THEME_MIDPOINT_SILENT'),
        'Should NOT fire when midpoint scene carries theme language',
      );
    });

    it('themePass detects THEME_ACCELERATING_DENSITY_ABSENT when theme fades toward climax', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // 9 scenes (third=3): first third (0-2) very dense with theme, last third (6-8) sparse but present
      const records = Array.from({ length: 9 }, (_, i) =>
        makeRec(i, {
          dialogueHighlights: i < 3
            ? ['alice: loyalty loyalty loyalty loyalty loyalty loyalty betrayal betrayal betrayal']
            : i >= 6
            ? ['bob: loyalty'] // sparse — only 1 hit vs 9+ in first third
            : ['carol: loyalty betrayal again'], // middle: moderate
          emotionalShift: 'neutral', suspenseDelta: 1,
        }),
      );
      const result = await themePass({
        fountain: blankFountain(9), original: blankFountain(9),
        records: records as any, structure: {} as any, storyContext: themeCtx,
        annotations: [], approvedSpans: [],
      });
      const fading = result.issues.filter(i => i.rule === 'THEME_ACCELERATING_DENSITY_ABSENT');
      assert.ok(fading.length >= 1, `Should detect THEME_ACCELERATING_DENSITY_ABSENT; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(fading[0].severity === 'major');
    });

    it('themePass detects THEME_DIALECTIC_IN_ACT3_ABSENT when Act 3 only affirms theme', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      // 8 scenes: act2 has a resonant scene with negative emotional shift (challenge),
      // act3 (scenes 6-7) has resonant scenes but both neutral — no challenge in Act 3
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, {
          dialogueHighlights: ['alice: loyalty prevails betrayal fails'],
          emotionalShift: i === 3 ? 'negative' : 'neutral', // act2 challenge at scene 3
          suspenseDelta: 1,
        }),
      );
      const result = await themePass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: {} as any, storyContext: themeCtx,
        annotations: [], approvedSpans: [],
      });
      const noAct3Dialectic = result.issues.filter(i => i.rule === 'THEME_DIALECTIC_IN_ACT3_ABSENT');
      assert.ok(noAct3Dialectic.length >= 1, `Should detect THEME_DIALECTIC_IN_ACT3_ABSENT; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(noAct3Dialectic[0].severity === 'major');
    });

    it('themePass does NOT fire THEME_DIALECTIC_IN_ACT3_ABSENT when Act 3 also challenges theme', async () => {
      const { themePass } = await import('../../server/nvm/revision/passes/theme.ts');
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, {
          dialogueHighlights: ['alice: loyalty and betrayal'],
          emotionalShift: (i === 3 || i === 6) ? 'negative' : 'neutral', // challenge in both act2 and act3
          suspenseDelta: 1,
        }),
      );
      const result = await themePass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: {} as any, storyContext: themeCtx,
        annotations: [], approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'THEME_DIALECTIC_IN_ACT3_ABSENT'),
        'Should NOT fire when Act 3 also has a thematic challenge',
      );
    });
  });