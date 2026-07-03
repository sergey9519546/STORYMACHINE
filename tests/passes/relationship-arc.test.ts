// Extracted from the former monolithic test.ts (audit M2.1 — split for maintainability).
// relationship-arcPass revision-rule tests. Shared imports/helpers below are duplicated verbatim across every split
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
import { makeSceneRecord as makeSharedRecord, buildPlainFountain } from './helpers.ts';

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


  // ── Wave 147: Relationship-arc pass enhancements ──────────────────────────
  describe('Wave 147 — relationshipArcPass: climax timing, earned reversals, power dynamics', async () => {
    it('relationshipArcPass detects RELATIONSHIP_CLIMAX_TIMING when major shift happens before climax', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const makeRec = (idx: number, relShifts: any[] = []): any => ({
        commitId: `c${idx}`, sceneIdx: idx, slug: `SC${idx}`, purpose: 'dialogue',
        dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
        emotionalShift: 'neutral', suspenseDelta: 1,
        dialogueHighlights: [],
        unresolvedClues: [], seededClueIds: [], payoffSetupIds: [],
        visualBeats: [],
        relationshipShifts: relShifts,
      });

      const records = [
        makeRec(0, []),
        makeRec(1, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.5 }]),
        makeRec(2, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 2.0 }]), // Major shift early
        makeRec(3, []),
        makeRec(4, []),
        makeRec(5, []),
        makeRec(6, []),
        makeRec(7, []),
        makeRec(8, []),
        makeRec(9, []),
      ];

      const result = await relationshipArcPass({
        fountain: Array.from({ length: 10 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
        original: Array.from({ length: 10 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
        records: records as unknown as Parameters<typeof relationshipArcPass>[0]['records'],
        structure: {} as any,
        annotations: [],
        approvedSpans: [],
      });
      const timing = result.issues.filter(i => i.rule === 'RELATIONSHIP_CLIMAX_TIMING');
      assert.ok(timing.length >= 1, 'Should detect RELATIONSHIP_CLIMAX_TIMING when major shift happens before climax');
      assert.ok(timing[0].severity === 'major');
    });

    it('relationshipArcPass does NOT fire RELATIONSHIP_CLIMAX_TIMING when major shift near climax', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const makeRec = (idx: number, relShifts: any[] = []): any => ({
        commitId: `c${idx}`, sceneIdx: idx, slug: `SC${idx}`, purpose: 'dialogue',
        dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
        emotionalShift: 'neutral', suspenseDelta: 1,
        dialogueHighlights: [],
        unresolvedClues: [], seededClueIds: [], payoffSetupIds: [],
        visualBeats: [],
        relationshipShifts: relShifts,
      });

      const records = [
        makeRec(0, []),
        makeRec(1, []),
        makeRec(2, []),
        makeRec(3, []),
        makeRec(4, []),
        makeRec(5, []),
        makeRec(6, []),
        makeRec(7, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 2.0 }]), // Major shift near climax
        makeRec(8, []),
        makeRec(9, []),
      ];

      const result = await relationshipArcPass({
        fountain: Array.from({ length: 10 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
        original: Array.from({ length: 10 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
        records: records as unknown as Parameters<typeof relationshipArcPass>[0]['records'],
        structure: {} as any,
        annotations: [],
        approvedSpans: [],
      });
      const timing = result.issues.filter(i => i.rule === 'RELATIONSHIP_CLIMAX_TIMING');
      assert.ok(timing.length === 0, 'Should NOT fire when major shift is near climax');
    });

    it('relationshipArcPass detects RELATIONSHIP_UNEARNED_REVERSAL when reversal lacks setup', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const makeRec = (idx: number, relShifts: any[] = []): any => ({
        commitId: `c${idx}`, sceneIdx: idx, slug: `SC${idx}`, purpose: 'dialogue',
        dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
        emotionalShift: 'neutral', suspenseDelta: 0.5,
        dialogueHighlights: [],
        unresolvedClues: [], seededClueIds: [], payoffSetupIds: [],
        visualBeats: [],
        relationshipShifts: relShifts,
      });

      const records = [
        makeRec(0, []),
        makeRec(1, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 1.5 }]), // Warming
        makeRec(2, []), // No setup
        makeRec(3, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -2.0 }]), // Sudden reversal
        makeRec(4, []),
      ];

      const result = await relationshipArcPass({
        fountain: Array.from({ length: 5 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
        original: Array.from({ length: 5 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
        records: records as unknown as Parameters<typeof relationshipArcPass>[0]['records'],
        structure: {} as any,
        annotations: [],
        approvedSpans: [],
      });
      const reversal = result.issues.filter(i => i.rule === 'RELATIONSHIP_UNEARNED_REVERSAL');
      assert.ok(reversal.length >= 1, 'Should detect RELATIONSHIP_UNEARNED_REVERSAL when reversal lacks setup');
      assert.ok(reversal[0].severity === 'major');
    });

    it('relationshipArcPass does NOT fire RELATIONSHIP_UNEARNED_REVERSAL when reversal has setup', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const makeRec = (idx: number, relShifts: any[] = [], suspense: number = 0.5, clues: string[] = []): any => ({
        commitId: `c${idx}`, sceneIdx: idx, slug: `SC${idx}`, purpose: 'dialogue',
        dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
        emotionalShift: 'neutral', suspenseDelta: suspense,
        dialogueHighlights: [],
        unresolvedClues: [], seededClueIds: clues, payoffSetupIds: [],
        visualBeats: [],
        relationshipShifts: relShifts,
      });

      const records = [
        makeRec(0, []),
        makeRec(1, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 1.5 }]), // Warming
        makeRec(2, [], 2.0, ['clue_1']), // Setup: high suspense + clue
        makeRec(3, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -2.0 }]), // Reversal justified
        makeRec(4, []),
      ];

      const result = await relationshipArcPass({
        fountain: Array.from({ length: 5 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
        original: Array.from({ length: 5 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
        records: records as unknown as Parameters<typeof relationshipArcPass>[0]['records'],
        structure: {} as any,
        annotations: [],
        approvedSpans: [],
      });
      const reversal = result.issues.filter(i => i.rule === 'RELATIONSHIP_UNEARNED_REVERSAL');
      assert.ok(reversal.length === 0, 'Should NOT fire when reversal has prior setup');
    });

    it('relationshipArcPass detects POWER_DYNAMIC_UNCHANGED when only affinity shifts', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const makeRec = (idx: number, relShifts: any[] = []): any => ({
        commitId: `c${idx}`, sceneIdx: idx, slug: `SC${idx}`, purpose: 'dialogue',
        dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
        emotionalShift: 'neutral', suspenseDelta: 1,
        dialogueHighlights: [],
        unresolvedClues: [], seededClueIds: [], payoffSetupIds: [],
        visualBeats: [],
        relationshipShifts: relShifts,
      });

      const records = [
        makeRec(0, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.5 }]),
        makeRec(1, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.8 }]),
        makeRec(2, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -1.0 }]),
      ];

      const result = await relationshipArcPass({
        fountain: Array.from({ length: 3 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
        original: Array.from({ length: 3 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
        records: records as unknown as Parameters<typeof relationshipArcPass>[0]['records'],
        structure: {} as any,
        annotations: [],
        approvedSpans: [],
      });
      const power = result.issues.filter(i => i.rule === 'POWER_DYNAMIC_UNCHANGED');
      assert.ok(power.length >= 1, 'Should detect POWER_DYNAMIC_UNCHANGED when only affinity shifts');
      assert.ok(power[0].severity === 'minor');
    });
  });


  describe('Wave 177 — relationshipArcPass: whiplash, uniform direction, unresolved rupture', async () => {
    const makeRec = (idx: number, relShifts: any[] = []): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`, purpose: 'dialogue',
      dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
      emotionalShift: 'neutral', suspenseDelta: 1, dialogueHighlights: [],
      unresolvedClues: [], seededClueIds: [], payoffSetupIds: [], visualBeats: [],
      relationshipShifts: relShifts,
    });
    const relInput = (records: any[], n: number) => ({
      fountain: Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
      original: Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
      records: records as any, structure: {} as any, annotations: [], approvedSpans: [],
    });

    // ── RELATIONSHIP_WHIPLASH ─────────────────────────────────────────────────
    it('relationshipArcPass detects RELATIONSHIP_WHIPLASH when a pair flips direction 3+ times', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const records = [
        makeRec(0),
        makeRec(1, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.5 }]),
        makeRec(2, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -0.5 }]),
        makeRec(3, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.5 }]),
        makeRec(4, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -0.5 }]),
        makeRec(5),
      ];
      const result = await relationshipArcPass(relInput(records, 6));
      const whip = result.issues.filter(i => i.rule === 'RELATIONSHIP_WHIPLASH');
      assert.ok(whip.length >= 1, `Should detect RELATIONSHIP_WHIPLASH; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(whip[0].severity === 'minor');
    });

    it('relationshipArcPass does NOT fire RELATIONSHIP_WHIPLASH when a pair has a clear arc', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const records = [
        makeRec(0),
        makeRec(1, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.5 }]),
        makeRec(2, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.5 }]),
        makeRec(3, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.5 }]),
        makeRec(4, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -0.5 }]),
        makeRec(5),
      ];
      const result = await relationshipArcPass(relInput(records, 6));
      assert.ok(
        !result.issues.some(i => i.rule === 'RELATIONSHIP_WHIPLASH'),
        'Should NOT fire when a pair reverses at most once',
      );
    });

    // ── ALL_PAIRS_SAME_DIRECTION ──────────────────────────────────────────────
    it('relationshipArcPass detects ALL_PAIRS_SAME_DIRECTION when every bond drifts the same way', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const records = [
        makeRec(0),
        makeRec(1, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.5 }]),
        makeRec(2, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.5 }]),
        makeRec(3, [{ pairKey: 'carol|dan', dimension: 'affinity', amount: 0.4 }]),
        makeRec(4, [{ pairKey: 'carol|dan', dimension: 'affinity', amount: 0.4 }]),
        makeRec(5),
      ];
      const result = await relationshipArcPass(relInput(records, 6));
      const allSame = result.issues.filter(i => i.rule === 'ALL_PAIRS_SAME_DIRECTION');
      assert.ok(allSame.length >= 1, `Should detect ALL_PAIRS_SAME_DIRECTION; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(allSame[0].severity === 'minor');
    });

    it('relationshipArcPass does NOT fire ALL_PAIRS_SAME_DIRECTION when bonds counterpoint each other', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const records = [
        makeRec(0),
        makeRec(1, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.5 }]),
        makeRec(2, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.5 }]),
        makeRec(3, [{ pairKey: 'carol|dan', dimension: 'affinity', amount: -0.4 }]),
        makeRec(4, [{ pairKey: 'carol|dan', dimension: 'affinity', amount: -0.4 }]),
        makeRec(5),
      ];
      const result = await relationshipArcPass(relInput(records, 6));
      assert.ok(
        !result.issues.some(i => i.rule === 'ALL_PAIRS_SAME_DIRECTION'),
        'Should NOT fire when one bond warms while another sours',
      );
    });

    // ── UNRESOLVED_RELATIONSHIP_RUPTURE ───────────────────────────────────────
    it('relationshipArcPass detects UNRESOLVED_RELATIONSHIP_RUPTURE when a break is never revisited', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const records = Array.from({ length: 8 }, (_, i) =>
        i === 2
          ? makeRec(i, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -0.6 }])
          : makeRec(i),
      );
      const result = await relationshipArcPass(relInput(records, 8));
      const rupture = result.issues.filter(i => i.rule === 'UNRESOLVED_RELATIONSHIP_RUPTURE');
      assert.ok(rupture.length >= 1, `Should detect UNRESOLVED_RELATIONSHIP_RUPTURE; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(rupture[0].severity === 'major');
    });

    it('relationshipArcPass does NOT fire UNRESOLVED_RELATIONSHIP_RUPTURE when the break is later addressed', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const records = Array.from({ length: 8 }, (_, i) =>
        i === 2
          ? makeRec(i, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -0.6 }])
          : i === 5
          ? makeRec(i, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.5 }])
          : makeRec(i),
      );
      const result = await relationshipArcPass(relInput(records, 8));
      assert.ok(
        !result.issues.some(i => i.rule === 'UNRESOLVED_RELATIONSHIP_RUPTURE'),
        'Should NOT fire when a later beat addresses the rupture',
      );
    });
  });


  describe('Wave 192 — relationshipArcPass: protagonist freeze, Act 1 void, cluster spike', async () => {
    const makeRec = (idx: number, relShifts: any[] = []): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`, purpose: 'dialogue',
      dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
      emotionalShift: 'neutral', suspenseDelta: 1, dialogueHighlights: [],
      unresolvedClues: [], seededClueIds: [], payoffSetupIds: [], visualBeats: [],
      relationshipShifts: relShifts,
    });
    const relInput = (records: any[], n: number) => ({
      fountain: Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
      original: Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join(''),
      records: records as any, structure: {} as any, annotations: [], approvedSpans: [],
    });

    // ── PROTAGONIST_RELATIONSHIP_FREEZE ───────────────────────────────────────
    it('relationshipArcPass detects PROTAGONIST_RELATIONSHIP_FREEZE when protagonist bonds cancel out', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      // alice is in 3 pairs (protagonist); her net=0.1; bob|carol net=0.6
      const records = [
        makeRec(0),
        makeRec(1, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.5 }]),
        makeRec(2, [{ pairKey: 'alice|carol', dimension: 'affinity', amount: 0.3 }]),
        makeRec(3, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -0.4 }]),
        makeRec(4, [{ pairKey: 'bob|carol', dimension: 'affinity', amount: 0.6 }]),
        makeRec(5, [{ pairKey: 'alice|carol', dimension: 'affinity', amount: -0.3 }]),
        makeRec(6, [{ pairKey: 'alice|dan', dimension: 'affinity', amount: -0.2 }]),
        makeRec(7, [{ pairKey: 'alice|dan', dimension: 'affinity', amount: 0.2 }]),
      ];
      const result = await relationshipArcPass(relInput(records, 8));
      const freeze = result.issues.filter(i => i.rule === 'PROTAGONIST_RELATIONSHIP_FREEZE');
      assert.ok(freeze.length >= 1, `Should detect PROTAGONIST_RELATIONSHIP_FREEZE; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(freeze[0].severity === 'major');
    });

    it('relationshipArcPass does NOT fire PROTAGONIST_RELATIONSHIP_FREEZE when protagonist has a clear arc', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      // alice|bob net=1.2 (strong positive arc); carol|dan net=-0.9 (counterpoint)
      const records = [
        makeRec(0),
        makeRec(1, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.5 }]),
        makeRec(2, [{ pairKey: 'carol|dan', dimension: 'affinity', amount: -0.6 }]),
        makeRec(3, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.4 }]),
        makeRec(4, [{ pairKey: 'carol|dan', dimension: 'affinity', amount: -0.3 }]),
        makeRec(5, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.3 }]),
        makeRec(6),
        makeRec(7),
      ];
      const result = await relationshipArcPass(relInput(records, 8));
      assert.ok(
        !result.issues.some(i => i.rule === 'PROTAGONIST_RELATIONSHIP_FREEZE'),
        'Should NOT fire when the protagonist has a strong net relational arc',
      );
    });

    // ── RELATIONSHIP_ACT1_VOID ────────────────────────────────────────────────
    it('relationshipArcPass detects RELATIONSHIP_ACT1_VOID when no shifts occur in Act 1', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      // act1End=2; records[0,1] have no shifts; shifts begin at record[2]
      const records = [
        makeRec(0),
        makeRec(1),
        makeRec(2, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.5 }]),
        makeRec(3, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.3 }]),
        makeRec(4, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -0.4 }]),
        makeRec(5),
        makeRec(6, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: -0.3 }]),
        makeRec(7),
      ];
      const result = await relationshipArcPass(relInput(records, 8));
      const void1 = result.issues.filter(i => i.rule === 'RELATIONSHIP_ACT1_VOID');
      assert.ok(void1.length >= 1, `Should detect RELATIONSHIP_ACT1_VOID; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(void1[0].severity === 'minor');
    });

    it('relationshipArcPass does NOT fire RELATIONSHIP_ACT1_VOID when Act 1 has a shift', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      // records[1] has a shift inside Act 1 → act1HasShift=true
      const records = [
        makeRec(0),
        makeRec(1, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.3 }]),
        makeRec(2, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.5 }]),
        makeRec(3, [{ pairKey: 'carol|dan', dimension: 'affinity', amount: -0.4 }]),
        makeRec(4),
        makeRec(5, [{ pairKey: 'carol|dan', dimension: 'affinity', amount: -0.3 }]),
        makeRec(6),
        makeRec(7),
      ];
      const result = await relationshipArcPass(relInput(records, 8));
      assert.ok(
        !result.issues.some(i => i.rule === 'RELATIONSHIP_ACT1_VOID'),
        'Should NOT fire when at least one relationship shift occurs in Act 1',
      );
    });

    // ── CLUSTER_SHIFT_SCENE ───────────────────────────────────────────────────
    it('relationshipArcPass detects CLUSTER_SHIFT_SCENE when one scene shifts 3+ pairs at once', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      // records[2] shifts 3 different pairs simultaneously
      const records = [
        makeRec(0),
        makeRec(1, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.5 }]),
        makeRec(2, [
          { pairKey: 'alice|bob', dimension: 'affinity', amount: -0.3 },
          { pairKey: 'bob|carol', dimension: 'trust', amount: -0.4 },
          { pairKey: 'alice|carol', dimension: 'affinity', amount: 0.2 },
        ]),
        makeRec(3),
        makeRec(4, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.3 }]),
        makeRec(5),
      ];
      const result = await relationshipArcPass(relInput(records, 6));
      const cluster = result.issues.filter(i => i.rule === 'CLUSTER_SHIFT_SCENE');
      assert.ok(cluster.length >= 1, `Should detect CLUSTER_SHIFT_SCENE; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(cluster[0].severity === 'minor');
    });

    it('relationshipArcPass does NOT fire CLUSTER_SHIFT_SCENE when no scene shifts more than 2 pairs', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      // max 2 pairs per scene — never 3
      const records = [
        makeRec(0),
        makeRec(1, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.5 }]),
        makeRec(2, [
          { pairKey: 'alice|bob', dimension: 'affinity', amount: -0.3 },
          { pairKey: 'bob|carol', dimension: 'trust', amount: 0.4 },
        ]),
        makeRec(3, [{ pairKey: 'alice|carol', dimension: 'affinity', amount: 0.3 }]),
        makeRec(4, [{ pairKey: 'alice|bob', dimension: 'affinity', amount: 0.2 }]),
        makeRec(5),
      ];
      const result = await relationshipArcPass(relInput(records, 6));
      assert.ok(
        !result.issues.some(i => i.rule === 'CLUSTER_SHIFT_SCENE'),
        'Should NOT fire when no single scene shifts more than two pairs at once',
      );
    });
  });


  describe('Wave 234 — relationshipArcPass: pair dimension monotone, first-impression contradiction, resolution void', async () => {
    const makeRec234 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, dialogueHighlights: [],
      revelation: null, purpose: 'development', dramaticTurn: '',
      seededClueIds: [], payoffSetupIds: [], relationshipShifts: [],
      ...overrides,
    });
    const rs234 = (pair: string, dim: string, amount: number) =>
      ({ pairKey: pair, dimension: dim, amount });

    it('PAIR_DIMENSION_MONOTONE fires when a pair has 4+ shifts all on the same dimension', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const records234a = [
        makeRec234(0, { relationshipShifts: [rs234('alice|bob', 'trust', 0.3)] }),
        makeRec234(1, { relationshipShifts: [rs234('alice|bob', 'trust', -0.4)] }),
        makeRec234(2, { relationshipShifts: [rs234('alice|bob', 'trust', 0.2)] }),
        makeRec234(3, { relationshipShifts: [rs234('alice|bob', 'trust', -0.1)] }),
        makeRec234(4, { emotionalShift: 'positive' }),
        makeRec234(5),
        makeRec234(6),
        makeRec234(7),
      ];
      const fountain234a = records234a.map(r => `INT. SC${r.sceneIdx} - DAY\nALICE\nLine.\nBOB\nReply.`).join('\n');
      const result = await relationshipArcPass({
        fountain: fountain234a, original: fountain234a,
        records: records234a,
        structure: { completionPercent: 80 } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'PAIR_DIMENSION_MONOTONE');
      assert.ok(match.length >= 1, `Expected PAIR_DIMENSION_MONOTONE, got: ${JSON.stringify(result.issues.map((i:any)=>i.rule))}`);
    });

    it('PAIR_DIMENSION_MONOTONE does NOT fire when a pair uses multiple dimensions', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const records234b = [
        makeRec234(0, { relationshipShifts: [rs234('alice|bob', 'trust', 0.3)] }),
        makeRec234(1, { relationshipShifts: [rs234('alice|bob', 'power', -0.4)] }),
        makeRec234(2, { emotionalShift: 'negative' }),
        makeRec234(3, { relationshipShifts: [rs234('alice|bob', 'loyalty', 0.2)] }),
        makeRec234(4, { emotionalShift: 'positive' }),
        makeRec234(5), makeRec234(6), makeRec234(7),
      ];
      const fountain234b = records234b.map(r => `INT. SC${r.sceneIdx} - DAY\nALICE\nLine.\nBOB\nReply.`).join('\n');
      const result = await relationshipArcPass({
        fountain: fountain234b, original: fountain234b,
        records: records234b,
        structure: { completionPercent: 80 } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'PAIR_DIMENSION_MONOTONE');
      assert.strictEqual(match.length, 0, 'Should NOT fire when pair uses multiple relationship dimensions');
    });

    it('RELATIONSHIP_FIRST_IMPRESSION_CONTRADICTION fires when first shift is positive but net is negative', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      // 4 shifts: +0.5, -0.4, -0.5, -0.3 → net = -0.7
      const records234c = [
        makeRec234(0, { relationshipShifts: [rs234('alice|bob', 'trust', 0.5)] }),
        makeRec234(1, { emotionalShift: 'negative' }),
        makeRec234(2, { relationshipShifts: [rs234('alice|bob', 'trust', -0.4)] }),
        makeRec234(3, { emotionalShift: 'negative' }),
        makeRec234(4, { relationshipShifts: [rs234('alice|bob', 'trust', -0.5)] }),
        makeRec234(5),
        makeRec234(6, { relationshipShifts: [rs234('alice|bob', 'trust', -0.3)] }),
        makeRec234(7),
      ];
      const fountain234c = records234c.map(r => `INT. SC${r.sceneIdx} - DAY\nALICE\nLine.\nBOB\nReply.`).join('\n');
      const result = await relationshipArcPass({
        fountain: fountain234c, original: fountain234c,
        records: records234c,
        structure: { completionPercent: 85 } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'RELATIONSHIP_FIRST_IMPRESSION_CONTRADICTION');
      assert.ok(match.length >= 1, `Expected RELATIONSHIP_FIRST_IMPRESSION_CONTRADICTION, got: ${JSON.stringify(result.issues.map((i:any)=>i.rule))}`);
    });

    it('RELATIONSHIP_FIRST_IMPRESSION_CONTRADICTION does NOT fire when first shift is weak', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      // first shift is 0.2 (below 0.4 threshold)
      const records234d = [
        makeRec234(0, { relationshipShifts: [rs234('alice|bob', 'trust', 0.2)] }),
        makeRec234(1, { emotionalShift: 'negative' }),
        makeRec234(2, { relationshipShifts: [rs234('alice|bob', 'trust', -0.4)] }),
        makeRec234(3),
        makeRec234(4, { relationshipShifts: [rs234('alice|bob', 'trust', -0.5)] }),
        makeRec234(5),
        makeRec234(6, { relationshipShifts: [rs234('alice|bob', 'trust', -0.3)] }),
        makeRec234(7),
      ];
      const fountain234d = records234d.map(r => `INT. SC${r.sceneIdx} - DAY\nALICE\nLine.\nBOB\nReply.`).join('\n');
      const result = await relationshipArcPass({
        fountain: fountain234d, original: fountain234d,
        records: records234d,
        structure: { completionPercent: 85 } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'RELATIONSHIP_FIRST_IMPRESSION_CONTRADICTION');
      assert.strictEqual(match.length, 0, 'Should NOT fire when first shift is below the threshold');
    });

    it('RELATIONSHIP_RESOLUTION_VOID fires when Act 3 has shifts but none are positive', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      // 8 scenes; Act3 = 6-7; scene 6 has negative shift, no positive shifts in Act3
      const records234e = [
        makeRec234(0, { relationshipShifts: [rs234('alice|bob', 'trust', 0.3)] }),
        makeRec234(1, { emotionalShift: 'negative' }),
        makeRec234(2, { relationshipShifts: [rs234('alice|carol', 'power', 0.2)] }),
        makeRec234(3, { emotionalShift: 'positive' }),
        makeRec234(4, { relationshipShifts: [rs234('alice|bob', 'trust', 0.4)] }),
        makeRec234(5),
        makeRec234(6, { relationshipShifts: [rs234('alice|bob', 'trust', -0.6)] }),  // Act3 negative
        makeRec234(7, { emotionalShift: 'negative' }),
      ];
      const fountain234e = records234e.map(r => `INT. SC${r.sceneIdx} - DAY\nALICE\nLine.\nBOB\nReply.\nCAROL\nAlso.`).join('\n');
      const result = await relationshipArcPass({
        fountain: fountain234e, original: fountain234e,
        records: records234e,
        structure: { completionPercent: 90 } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'RELATIONSHIP_RESOLUTION_VOID');
      assert.ok(match.length >= 1, `Expected RELATIONSHIP_RESOLUTION_VOID, got: ${JSON.stringify(result.issues.map((i:any)=>i.rule))}`);
    });

    it('RELATIONSHIP_RESOLUTION_VOID does NOT fire when Act 3 has a positive shift', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const records234f = [
        makeRec234(0, { relationshipShifts: [rs234('alice|bob', 'trust', 0.3)] }),
        makeRec234(1, { emotionalShift: 'negative' }),
        makeRec234(2, { relationshipShifts: [rs234('alice|carol', 'power', 0.2)] }),
        makeRec234(3, { emotionalShift: 'negative' }),
        makeRec234(4, { relationshipShifts: [rs234('alice|bob', 'trust', -0.5)] }),
        makeRec234(5),
        makeRec234(6, { relationshipShifts: [rs234('alice|bob', 'trust', -0.4)] }),
        makeRec234(7, { relationshipShifts: [rs234('alice|bob', 'trust', 0.6)] }),  // positive resolution
      ];
      const fountain234f = records234f.map(r => `INT. SC${r.sceneIdx} - DAY\nALICE\nLine.\nBOB\nReply.\nCAROL\nAlso.`).join('\n');
      const result = await relationshipArcPass({
        fountain: fountain234f, original: fountain234f,
        records: records234f,
        structure: { completionPercent: 90 } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'RELATIONSHIP_RESOLUTION_VOID');
      assert.strictEqual(match.length, 0, 'Should NOT fire when Act 3 has a positive relationship shift');
    });
  });


  describe('Wave 553 — relationshipArcPass: relationship emotion decoupled, pair dimension monopoly, pair thirds concentrated', async () => {
    const mkShift553 = (pairKey: string, amount: number, dimension = 'trust') =>
      [{ pairKey, dimension, amount }];
    const makeRec553 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runRA553 = async (records: any[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    it('RELATIONSHIP_EMOTION_DECOUPLED fires when >70% of shift scenes are emotionally neutral', async () => {
      // 8 scenes: shifts at 0,2,4,6 (4 shift scenes), all neutral emotionalShift → 100% neutral → fire.
      const recs553a = Array.from({ length: 8 }, (_, i) =>
        makeRec553(i, {
          relationshipShifts: [0, 2, 4, 6].includes(i)
            ? mkShift553('A|B', i % 2 === 0 ? 0.3 : -0.3)
            : [],
          emotionalShift: 'neutral',
        }),
      );
      const res = await runRA553(recs553a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_EMOTION_DECOUPLED'), 'RELATIONSHIP_EMOTION_DECOUPLED should fire');
    });

    it('RELATIONSHIP_EMOTION_DECOUPLED does not fire when ≥30% of shift scenes have non-neutral emotion', async () => {
      // 8 scenes: shifts at 0,2,4,6; sc0 and sc2 positive emotion (2 of 4 = 50% non-neutral) → no fire.
      const recs553an = Array.from({ length: 8 }, (_, i) =>
        makeRec553(i, {
          relationshipShifts: [0, 2, 4, 6].includes(i)
            ? mkShift553('A|B', i % 2 === 0 ? 0.3 : -0.3)
            : [],
          emotionalShift: [0, 2].includes(i) ? 'positive' : 'neutral',
        }),
      );
      const res = await runRA553(recs553an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_EMOTION_DECOUPLED'), 'RELATIONSHIP_EMOTION_DECOUPLED should not fire');
    });

    it('PAIR_DIMENSION_MONOPOLY fires when a pair with 4+ shifts uses only one relationship dimension while 2+ dimensions exist globally', async () => {
      // 9 scenes: pair A|B has 4 shifts all in 'trust'; pair C|D has 1 shift in 'closeness' → 2 global dims.
      // A|B's netByDimension.size === 1 while globalDims.size === 2 → fire.
      const recs553b = Array.from({ length: 9 }, (_, i) =>
        makeRec553(i, {
          emotionalShift: 'positive',
          relationshipShifts: [0, 2, 4, 6].includes(i)
            ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.3 }]
            : i === 8
              ? [{ pairKey: 'C|D', dimension: 'closeness', amount: 0.2 }]
              : [],
        }),
      );
      const res = await runRA553(recs553b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAIR_DIMENSION_MONOPOLY'), 'PAIR_DIMENSION_MONOPOLY should fire');
    });

    it('PAIR_DIMENSION_MONOPOLY does not fire when a pair uses 2+ dimensions', async () => {
      // 9 scenes: pair A|B has 4 shifts — 2 in 'trust', 2 in 'closeness' → netByDimension.size === 2 → no fire.
      const recs553bn = Array.from({ length: 9 }, (_, i) =>
        makeRec553(i, {
          emotionalShift: 'positive',
          relationshipShifts: [0, 2].includes(i)
            ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.3 }]
            : [3, 5].includes(i)
              ? [{ pairKey: 'A|B', dimension: 'closeness', amount: 0.3 }]
              : i === 8
                ? [{ pairKey: 'C|D', dimension: 'power', amount: 0.2 }]
                : [],
        }),
      );
      const res = await runRA553(recs553bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAIR_DIMENSION_MONOPOLY'), 'PAIR_DIMENSION_MONOPOLY should not fire');
    });

    it('PAIR_THIRDS_CONCENTRATED fires when a pair has >75% of 4+ shifts in one structural third', async () => {
      // 9 scenes (third=3): pair A|B has shifts at 0,1,2,7 (4 shifts); 3 in first third (0,1,2) = 75%.
      // Need >75% so use 4 shifts in first third (0,1,2) out of 4 total = 100% → fire.
      // Use 4 shifts at positions 0,1,2,2 — wait, same scene. Use 0,1,2,3 but third = floor(9/3)=3, so first third is positions 0-2, second is 3-5, third is 6-8.
      // Shifts at 0,1,2,8: 3 in first third + 1 in third third → 3/4=75%, not >75%. Use 0,1,2 with one more in first third — but positions 0-2 give 3 and we need 4 total → let's use 4 shifts all in first third (0,0,1,2) — can't repeat. Let's use 9 scenes, shifts at 0,1,2,3(=second third starts here).
      // Actually with 9 scenes, third = 3: first third = [0,1,2], second = [3,4,5], third = [6,7,8].
      // 4 shifts all in first third: 0,1,2 is only 3 positions. Use pair shifts in a single scene multiple times via different dimensions? No, pairStats aggregates all shifts.
      // Use 5 scenes with shifts at first third positions 0,1,2 and one more...
      // Better: use more shifts. Shifts at 0,1,2,2 won't work (only one shift per scene per pair).
      // Use n=12 scenes: third=4. Shifts at 0,1,2,3,8 → 4 in first third, 1 in third third = 4/5=80% > 75% → fire!
      const recs553c = Array.from({ length: 12 }, (_, i) =>
        makeRec553(i, {
          emotionalShift: 'positive',
          relationshipShifts: [0, 1, 2, 3, 8].includes(i)
            ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.3 }]
            : [],
        }),
      );
      const res = await runRA553(recs553c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAIR_THIRDS_CONCENTRATED'), 'PAIR_THIRDS_CONCENTRATED should fire');
    });

    it('PAIR_THIRDS_CONCENTRATED does not fire when pair shifts are spread across thirds', async () => {
      // 12 scenes: pair A|B shifts at 0,4,8,11 — one in each third (4 shifts spread across thirds) → no fire.
      // third=4: first [0-3], second [4-7], third [8-11]. One in each → max 1/4 = 25% → no fire.
      const recs553cn = Array.from({ length: 12 }, (_, i) =>
        makeRec553(i, {
          emotionalShift: 'positive',
          relationshipShifts: [0, 4, 8, 11].includes(i)
            ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.3 }]
            : [],
        }),
      );
      const res = await runRA553(recs553cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAIR_THIRDS_CONCENTRATED'), 'PAIR_THIRDS_CONCENTRATED should not fire');
    });
  });


  describe('Wave 539 — relationshipArcPass: pair seed flat, pair payoff flat, pair shift run', async () => {
    const mkShift539 = (pairKey: string, amount: number) => [{ pairKey, dimension: 'trust', amount }];
    const makeRec539 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runRA539 = async (records: any[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    it('PAIR_SEED_FLAT fires when a pair\'s shifts never overlap with seed scenes', async () => {
      // 8 scenes: A|B shifts at 0,1,2; C|D shift at 5 (with seed); seeds at 3,5,6
      // A|B has 3 shifts, none in seed positions {3,5,6} → fires for A|B
      // C|D shift at 5 overlaps seed → RELATIONSHIP_SEED_DECOUPLED won't fire
      const recs539a = Array.from({ length: 8 }, (_, i) =>
        makeRec539(i, {
          relationshipShifts: [0, 1, 2].includes(i) ? mkShift539('A|B', 0.3) :
                              i === 5 ? mkShift539('C|D', 0.3) : [],
          seededClueIds: [3, 5, 6].includes(i) ? ['c1'] : [],
        }),
      );
      const res = await runRA539(recs539a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAIR_SEED_FLAT'), 'PAIR_SEED_FLAT should fire');
    });

    it('PAIR_SEED_FLAT does not fire when a pair shift overlaps a seed scene', async () => {
      // 8 scenes: A|B shifts at 0,1,2; seeds at 1,5,6 — seed at 1 overlaps A|B shift at 1 → no fire
      const recs539an = Array.from({ length: 8 }, (_, i) =>
        makeRec539(i, {
          relationshipShifts: [0, 1, 2].includes(i) ? mkShift539('A|B', 0.3) : [],
          seededClueIds: [1, 5, 6].includes(i) ? ['c1'] : [],
        }),
      );
      const res = await runRA539(recs539an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAIR_SEED_FLAT'), 'PAIR_SEED_FLAT should not fire');
    });

    it('PAIR_PAYOFF_FLAT fires when a pair\'s shifts never overlap with payoff scenes', async () => {
      // 8 scenes: A|B shifts at 0,1,2; C|D shift at 5 (with payoff); payoffs at 3,5,6
      // A|B has 3 shifts, none in payoff positions {3,5,6} → fires for A|B
      const recs539b = Array.from({ length: 8 }, (_, i) =>
        makeRec539(i, {
          relationshipShifts: [0, 1, 2].includes(i) ? mkShift539('A|B', 0.3) :
                              i === 5 ? mkShift539('C|D', 0.3) : [],
          payoffSetupIds: [3, 5, 6].includes(i) ? ['s1'] : [],
        }),
      );
      const res = await runRA539(recs539b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAIR_PAYOFF_FLAT'), 'PAIR_PAYOFF_FLAT should fire');
    });

    it('PAIR_PAYOFF_FLAT does not fire when a pair shift overlaps a payoff scene', async () => {
      // 8 scenes: A|B shifts at 0,1,2; payoffs at 1,5,6 — payoff at 1 overlaps A|B shift → no fire
      const recs539bn = Array.from({ length: 8 }, (_, i) =>
        makeRec539(i, {
          relationshipShifts: [0, 1, 2].includes(i) ? mkShift539('A|B', 0.3) : [],
          payoffSetupIds: [1, 5, 6].includes(i) ? ['s1'] : [],
        }),
      );
      const res = await runRA539(recs539bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAIR_PAYOFF_FLAT'), 'PAIR_PAYOFF_FLAT should not fire');
    });

    it('PAIR_SHIFT_RUN fires when 4+ consecutive shift scenes all involve one pair', async () => {
      // 8 scenes: A|B shifts at 0,1,2,3 (4 consecutive); C|D shifts at 5,6 (≥2 pairs with ≥2 shifts)
      const recs539c = Array.from({ length: 8 }, (_, i) =>
        makeRec539(i, {
          relationshipShifts: [0, 1, 2, 3].includes(i) ? mkShift539('A|B', 0.2) :
                              [5, 6].includes(i) ? mkShift539('C|D', 0.2) : [],
        }),
      );
      const res = await runRA539(recs539c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAIR_SHIFT_RUN'), 'PAIR_SHIFT_RUN should fire');
    });

    it('PAIR_SHIFT_RUN does not fire when a second pair breaks the run', async () => {
      // 8 scenes: A|B at 0,1,3,4; C|D at 2,6 — C|D at 2 breaks A|B run (max run = 2)
      const recs539cn = Array.from({ length: 8 }, (_, i) =>
        makeRec539(i, {
          relationshipShifts: [0, 1, 3, 4].includes(i) ? mkShift539('A|B', 0.2) :
                              [2, 6].includes(i) ? mkShift539('C|D', 0.2) : [],
        }),
      );
      const res = await runRA539(recs539cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAIR_SHIFT_RUN'), 'PAIR_SHIFT_RUN should not fire');
    });
  });


  describe('Wave 889 — relationshipArcPass: relational climax zone imbalance, relational establish world zone imbalance, relational resolution zone imbalance', async () => {
    const runRA889 = async (records: ScreenplaySceneRecord[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RELATIONAL_CLIMAX_ZONE_IMBALANCE fire:
    // n=10, 4 zones (Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}); climax at 0,1,2,8,9 →
    // Z0 has 3/5=60% (bloat, >=50%), Z1 and Z2 are empty.
    it('RELATIONAL_CLIMAX_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of climax-purposed scenes', async () => {
      const recs889a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runRA889(recs889a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_CLIMAX_ZONE_IMBALANCE'), 'RELATIONAL_CLIMAX_ZONE_IMBALANCE should fire');
    });

    it('RELATIONAL_CLIMAX_ZONE_IMBALANCE does not fire when climax-purposed scenes touch every zone', async () => {
      const recs889an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runRA889(recs889an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_CLIMAX_ZONE_IMBALANCE'), 'RELATIONAL_CLIMAX_ZONE_IMBALANCE should not fire');
    });

    // RELATIONAL_ESTABLISH_WORLD_ZONE_IMBALANCE fire: same zone geometry as above.
    it('RELATIONAL_ESTABLISH_WORLD_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of world-establishing scenes', async () => {
      const recs889b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runRA889(recs889b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_ESTABLISH_WORLD_ZONE_IMBALANCE'), 'RELATIONAL_ESTABLISH_WORLD_ZONE_IMBALANCE should fire');
    });

    it('RELATIONAL_ESTABLISH_WORLD_ZONE_IMBALANCE does not fire when world-establishing scenes touch every zone', async () => {
      const recs889bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runRA889(recs889bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_ESTABLISH_WORLD_ZONE_IMBALANCE'), 'RELATIONAL_ESTABLISH_WORLD_ZONE_IMBALANCE should not fire');
    });

    // RELATIONAL_RESOLUTION_ZONE_IMBALANCE fire: same zone geometry as above.
    it('RELATIONAL_RESOLUTION_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of resolution-purposed scenes', async () => {
      const recs889c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'resolution' : 'complicate' }),
      );
      const res = await runRA889(recs889c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_RESOLUTION_ZONE_IMBALANCE'), 'RELATIONAL_RESOLUTION_ZONE_IMBALANCE should fire');
    });

    it('RELATIONAL_RESOLUTION_ZONE_IMBALANCE does not fire when resolution-purposed scenes touch every zone', async () => {
      const recs889cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'resolution' : 'complicate' }),
      );
      const res = await runRA889(recs889cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_RESOLUTION_ZONE_IMBALANCE'), 'RELATIONAL_RESOLUTION_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 875 — relationshipArcPass: relational resolution drought run, relational complicate zone cluster, relational complicate drought run', async () => {
    const runRA875 = async (records: ScreenplaySceneRecord[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RELATIONAL_RESOLUTION_DROUGHT_RUN fire:
    // n=10; resolution at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('RELATIONAL_RESOLUTION_DROUGHT_RUN fires when a long run has no resolution-purposed scene', async () => {
      const recs875a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'resolution' : 'establish_world' }),
      );
      const res = await runRA875(recs875a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_RESOLUTION_DROUGHT_RUN'), 'RELATIONAL_RESOLUTION_DROUGHT_RUN should fire');
    });

    it('RELATIONAL_RESOLUTION_DROUGHT_RUN does not fire when resolution-purposed scenes are evenly spread', async () => {
      const recs875an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'resolution' : 'establish_world' }),
      );
      const res = await runRA875(recs875an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_RESOLUTION_DROUGHT_RUN'), 'RELATIONAL_RESOLUTION_DROUGHT_RUN should not fire');
    });

    // RELATIONAL_COMPLICATE_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; complicate scenes at 0,1,2 → 100% opening third
    it('RELATIONAL_COMPLICATE_ZONE_CLUSTER fires when >75% of complicating scenes cluster in one third', async () => {
      const recs875b = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'complicate' : 'establish_world' }),
      );
      const res = await runRA875(recs875b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_COMPLICATE_ZONE_CLUSTER'), 'RELATIONAL_COMPLICATE_ZONE_CLUSTER should fire');
    });

    it('RELATIONAL_COMPLICATE_ZONE_CLUSTER does not fire when complicating scenes spread across thirds', async () => {
      const recs875bn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'complicate' : 'establish_world' }),
      );
      const res = await runRA875(recs875bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_COMPLICATE_ZONE_CLUSTER'), 'RELATIONAL_COMPLICATE_ZONE_CLUSTER should not fire');
    });

    // RELATIONAL_COMPLICATE_DROUGHT_RUN fire:
    // n=10; complicate at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('RELATIONAL_COMPLICATE_DROUGHT_RUN fires when a long run has no complicating scene', async () => {
      const recs875c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'complicate' : 'establish_world' }),
      );
      const res = await runRA875(recs875c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_COMPLICATE_DROUGHT_RUN'), 'RELATIONAL_COMPLICATE_DROUGHT_RUN should fire');
    });

    it('RELATIONAL_COMPLICATE_DROUGHT_RUN does not fire when complicating scenes are evenly spread', async () => {
      const recs875cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'complicate' : 'establish_world' }),
      );
      const res = await runRA875(recs875cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_COMPLICATE_DROUGHT_RUN'), 'RELATIONAL_COMPLICATE_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 861 — relationshipArcPass: relational climax drought run, relational establish world drought run, relational resolution zone cluster', async () => {
    const runRA861 = async (records: ScreenplaySceneRecord[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RELATIONAL_CLIMAX_DROUGHT_RUN fire:
    // n=10; climax at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('RELATIONAL_CLIMAX_DROUGHT_RUN fires when a long run has no climax-purposed scene', async () => {
      const recs861a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runRA861(recs861a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_CLIMAX_DROUGHT_RUN'), 'RELATIONAL_CLIMAX_DROUGHT_RUN should fire');
    });

    it('RELATIONAL_CLIMAX_DROUGHT_RUN does not fire when climax-purposed scenes are evenly spread', async () => {
      const recs861an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runRA861(recs861an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_CLIMAX_DROUGHT_RUN'), 'RELATIONAL_CLIMAX_DROUGHT_RUN should not fire');
    });

    // RELATIONAL_ESTABLISH_WORLD_DROUGHT_RUN fire:
    // n=10; establish_world at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('RELATIONAL_ESTABLISH_WORLD_DROUGHT_RUN fires when a long run has no world-establishing scene', async () => {
      const recs861b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runRA861(recs861b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_ESTABLISH_WORLD_DROUGHT_RUN'), 'RELATIONAL_ESTABLISH_WORLD_DROUGHT_RUN should fire');
    });

    it('RELATIONAL_ESTABLISH_WORLD_DROUGHT_RUN does not fire when world-establishing scenes are evenly spread', async () => {
      const recs861bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runRA861(recs861bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_ESTABLISH_WORLD_DROUGHT_RUN'), 'RELATIONAL_ESTABLISH_WORLD_DROUGHT_RUN should not fire');
    });

    // RELATIONAL_RESOLUTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; resolution scenes at 0,1,2 → 100% opening third
    it('RELATIONAL_RESOLUTION_ZONE_CLUSTER fires when >75% of resolution-purposed scenes cluster in one third', async () => {
      const recs861c = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'resolution' : 'complicate' }),
      );
      const res = await runRA861(recs861c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_RESOLUTION_ZONE_CLUSTER'), 'RELATIONAL_RESOLUTION_ZONE_CLUSTER should fire');
    });

    it('RELATIONAL_RESOLUTION_ZONE_CLUSTER does not fire when resolution-purposed scenes spread across thirds', async () => {
      const recs861cn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'resolution' : 'complicate' }),
      );
      const res = await runRA861(recs861cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_RESOLUTION_ZONE_CLUSTER'), 'RELATIONAL_RESOLUTION_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 847 — relationshipArcPass: relational positive emotion drought run, relational establish world zone cluster, relational climax zone cluster', async () => {
    const runRA847 = async (records: ScreenplaySceneRecord[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RELATIONAL_POSITIVE_EMOTION_DROUGHT_RUN fire:
    // n=10; positive-emotion at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('RELATIONAL_POSITIVE_EMOTION_DROUGHT_RUN fires when a long run has no positive-emotion charge', async () => {
      const recs847a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runRA847(recs847a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_POSITIVE_EMOTION_DROUGHT_RUN'), 'RELATIONAL_POSITIVE_EMOTION_DROUGHT_RUN should fire');
    });

    it('RELATIONAL_POSITIVE_EMOTION_DROUGHT_RUN does not fire when positive-emotion scenes are evenly spread', async () => {
      const recs847an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 3, 6, 9].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runRA847(recs847an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_POSITIVE_EMOTION_DROUGHT_RUN'), 'RELATIONAL_POSITIVE_EMOTION_DROUGHT_RUN should not fire');
    });

    // RELATIONAL_ESTABLISH_WORLD_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; establish_world scenes at 0,1,2 → 100% opening third
    it('RELATIONAL_ESTABLISH_WORLD_ZONE_CLUSTER fires when >75% of world-establishing scenes cluster in one third', async () => {
      const recs847b = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runRA847(recs847b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_ESTABLISH_WORLD_ZONE_CLUSTER'), 'RELATIONAL_ESTABLISH_WORLD_ZONE_CLUSTER should fire');
    });

    it('RELATIONAL_ESTABLISH_WORLD_ZONE_CLUSTER does not fire when world-establishing scenes spread across thirds', async () => {
      const recs847bn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runRA847(recs847bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_ESTABLISH_WORLD_ZONE_CLUSTER'), 'RELATIONAL_ESTABLISH_WORLD_ZONE_CLUSTER should not fire');
    });

    // RELATIONAL_CLIMAX_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; climax scenes at 0,1,2 → 100% opening third
    it('RELATIONAL_CLIMAX_ZONE_CLUSTER fires when >75% of climax-purposed scenes cluster in one third', async () => {
      const recs847c = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runRA847(recs847c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_CLIMAX_ZONE_CLUSTER'), 'RELATIONAL_CLIMAX_ZONE_CLUSTER should fire');
    });

    it('RELATIONAL_CLIMAX_ZONE_CLUSTER does not fire when climax-purposed scenes spread across thirds', async () => {
      const recs847cn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runRA847(recs847cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_CLIMAX_ZONE_CLUSTER'), 'RELATIONAL_CLIMAX_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 833 — relationshipArcPass: relational introduce conflict zone cluster, relational introduce conflict drought run, relational positive emotion zone cluster', async () => {
    const runRA833 = async (records: ScreenplaySceneRecord[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RELATIONAL_INTRODUCE_CONFLICT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; introduce_conflict scenes at 0,1,2 → 100% opening third
    it('RELATIONAL_INTRODUCE_CONFLICT_ZONE_CLUSTER fires when >75% of conflict-introducing scenes cluster in one third', async () => {
      const recs833a = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'introduce_conflict' : 'complicate' }),
      );
      const res = await runRA833(recs833a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_INTRODUCE_CONFLICT_ZONE_CLUSTER'), 'RELATIONAL_INTRODUCE_CONFLICT_ZONE_CLUSTER should fire');
    });

    it('RELATIONAL_INTRODUCE_CONFLICT_ZONE_CLUSTER does not fire when conflict-introducing scenes spread across thirds', async () => {
      const recs833an = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'introduce_conflict' : 'complicate' }),
      );
      const res = await runRA833(recs833an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_INTRODUCE_CONFLICT_ZONE_CLUSTER'), 'RELATIONAL_INTRODUCE_CONFLICT_ZONE_CLUSTER should not fire');
    });

    // RELATIONAL_INTRODUCE_CONFLICT_DROUGHT_RUN fire:
    // n=10; introduce_conflict at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('RELATIONAL_INTRODUCE_CONFLICT_DROUGHT_RUN fires when a long run has no new conflict', async () => {
      const recs833b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'introduce_conflict' : 'complicate' }),
      );
      const res = await runRA833(recs833b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_INTRODUCE_CONFLICT_DROUGHT_RUN'), 'RELATIONAL_INTRODUCE_CONFLICT_DROUGHT_RUN should fire');
    });

    it('RELATIONAL_INTRODUCE_CONFLICT_DROUGHT_RUN does not fire when conflict-introducing scenes are evenly spread', async () => {
      const recs833bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'introduce_conflict' : 'complicate' }),
      );
      const res = await runRA833(recs833bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_INTRODUCE_CONFLICT_DROUGHT_RUN'), 'RELATIONAL_INTRODUCE_CONFLICT_DROUGHT_RUN should not fire');
    });

    // RELATIONAL_POSITIVE_EMOTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; positive-emotion scenes at 0,1,2 → 100% opening third
    it('RELATIONAL_POSITIVE_EMOTION_ZONE_CLUSTER fires when >75% of positive-emotion scenes cluster in one third', async () => {
      const recs833c = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runRA833(recs833c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_POSITIVE_EMOTION_ZONE_CLUSTER'), 'RELATIONAL_POSITIVE_EMOTION_ZONE_CLUSTER should fire');
    });

    it('RELATIONAL_POSITIVE_EMOTION_ZONE_CLUSTER does not fire when positive-emotion scenes spread across thirds', async () => {
      const recs833cn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 4, 8].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runRA833(recs833cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_POSITIVE_EMOTION_ZONE_CLUSTER'), 'RELATIONAL_POSITIVE_EMOTION_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 819 — relationshipArcPass: relational character moment drought run, relational turning point zone cluster, relational turning point drought run', async () => {
    const runRA819 = async (records: ScreenplaySceneRecord[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RELATIONAL_CHARACTER_MOMENT_DROUGHT_RUN fire:
    // n=10; character_moment at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('RELATIONAL_CHARACTER_MOMENT_DROUGHT_RUN fires when a long run has no character moment', async () => {
      const recs819a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'character_moment' : 'complicate' }),
      );
      const res = await runRA819(recs819a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_CHARACTER_MOMENT_DROUGHT_RUN'), 'RELATIONAL_CHARACTER_MOMENT_DROUGHT_RUN should fire');
    });

    it('RELATIONAL_CHARACTER_MOMENT_DROUGHT_RUN does not fire when character moments are evenly spread', async () => {
      const recs819an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'character_moment' : 'complicate' }),
      );
      const res = await runRA819(recs819an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_CHARACTER_MOMENT_DROUGHT_RUN'), 'RELATIONAL_CHARACTER_MOMENT_DROUGHT_RUN should not fire');
    });

    // RELATIONAL_TURNING_POINT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; turning_point scenes at 0,1,2 → 100% opening third
    it('RELATIONAL_TURNING_POINT_ZONE_CLUSTER fires when >75% of turning-point scenes cluster in one third', async () => {
      const recs819b = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'turning_point' : 'complicate' }),
      );
      const res = await runRA819(recs819b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_TURNING_POINT_ZONE_CLUSTER'), 'RELATIONAL_TURNING_POINT_ZONE_CLUSTER should fire');
    });

    it('RELATIONAL_TURNING_POINT_ZONE_CLUSTER does not fire when turning-point scenes spread across thirds', async () => {
      const recs819bn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'turning_point' : 'complicate' }),
      );
      const res = await runRA819(recs819bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_TURNING_POINT_ZONE_CLUSTER'), 'RELATIONAL_TURNING_POINT_ZONE_CLUSTER should not fire');
    });

    // RELATIONAL_TURNING_POINT_DROUGHT_RUN fire:
    // n=10; turning_point at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('RELATIONAL_TURNING_POINT_DROUGHT_RUN fires when a long run has no turning point', async () => {
      const recs819c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'turning_point' : 'complicate' }),
      );
      const res = await runRA819(recs819c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_TURNING_POINT_DROUGHT_RUN'), 'RELATIONAL_TURNING_POINT_DROUGHT_RUN should fire');
    });

    it('RELATIONAL_TURNING_POINT_DROUGHT_RUN does not fire when turning points are evenly spread', async () => {
      const recs819cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'turning_point' : 'complicate' }),
      );
      const res = await runRA819(recs819cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_TURNING_POINT_DROUGHT_RUN'), 'RELATIONAL_TURNING_POINT_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 805 — relationshipArcPass: relational negative emotion zone cluster, relational negative emotion drought run, relational character moment zone cluster', async () => {
    const runRA805 = async (records: ScreenplaySceneRecord[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RELATIONAL_NEGATIVE_EMOTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; negative-emotion scenes at 0,1,2 → 100% opening third
    it('RELATIONAL_NEGATIVE_EMOTION_ZONE_CLUSTER fires when >75% of negative-emotion scenes cluster in one third', async () => {
      const recs805a = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runRA805(recs805a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_NEGATIVE_EMOTION_ZONE_CLUSTER'), 'RELATIONAL_NEGATIVE_EMOTION_ZONE_CLUSTER should fire');
    });

    it('RELATIONAL_NEGATIVE_EMOTION_ZONE_CLUSTER does not fire when negative-emotion scenes spread across thirds', async () => {
      const recs805an = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 4, 8].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runRA805(recs805an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_NEGATIVE_EMOTION_ZONE_CLUSTER'), 'RELATIONAL_NEGATIVE_EMOTION_ZONE_CLUSTER should not fire');
    });

    // RELATIONAL_NEGATIVE_EMOTION_DROUGHT_RUN fire:
    // n=10; negative-emotion at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('RELATIONAL_NEGATIVE_EMOTION_DROUGHT_RUN fires when a long run has no negative-emotion charge', async () => {
      const recs805b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runRA805(recs805b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_NEGATIVE_EMOTION_DROUGHT_RUN'), 'RELATIONAL_NEGATIVE_EMOTION_DROUGHT_RUN should fire');
    });

    it('RELATIONAL_NEGATIVE_EMOTION_DROUGHT_RUN does not fire when negative-emotion scenes are evenly spread', async () => {
      const recs805bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 3, 6, 9].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runRA805(recs805bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_NEGATIVE_EMOTION_DROUGHT_RUN'), 'RELATIONAL_NEGATIVE_EMOTION_DROUGHT_RUN should not fire');
    });

    // RELATIONAL_CHARACTER_MOMENT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; character_moment scenes at 0,1,2 → 100% opening third
    it('RELATIONAL_CHARACTER_MOMENT_ZONE_CLUSTER fires when >75% of character-moment scenes cluster in one third', async () => {
      const recs805c = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'character_moment' : 'complicate' }),
      );
      const res = await runRA805(recs805c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_CHARACTER_MOMENT_ZONE_CLUSTER'), 'RELATIONAL_CHARACTER_MOMENT_ZONE_CLUSTER should fire');
    });

    it('RELATIONAL_CHARACTER_MOMENT_ZONE_CLUSTER does not fire when character-moment scenes spread across thirds', async () => {
      const recs805cn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'character_moment' : 'complicate' }),
      );
      const res = await runRA805(recs805cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_CHARACTER_MOMENT_ZONE_CLUSTER'), 'RELATIONAL_CHARACTER_MOMENT_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 791 — relationshipArcPass: relational suspense drought run, relational curiosity peak uncaused, relational revelation peak uncaused', async () => {
    const runRA791 = async (records: ScreenplaySceneRecord[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RELATIONAL_SUSPENSE_DROUGHT_RUN fire:
    // n=10; suspenseDelta>0 at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('RELATIONAL_SUSPENSE_DROUGHT_RUN fires when a long run has no rising suspense', async () => {
      const recs791a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { suspenseDelta: [0, 1, 2].includes(i) ? 2 : 0 }),
      );
      const res = await runRA791(recs791a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_SUSPENSE_DROUGHT_RUN'), 'RELATIONAL_SUSPENSE_DROUGHT_RUN should fire');
    });

    it('RELATIONAL_SUSPENSE_DROUGHT_RUN does not fire when suspense rises are evenly spread', async () => {
      const recs791an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { suspenseDelta: [0, 3, 6, 9].includes(i) ? 2 : 0 }),
      );
      const res = await runRA791(recs791an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_SUSPENSE_DROUGHT_RUN'), 'RELATIONAL_SUSPENSE_DROUGHT_RUN should not fire');
    });

    // RELATIONAL_CURIOSITY_PEAK_UNCAUSED fire:
    // 8 scenes; curiosityDelta qualifying (>0) at 2 and 5; peak resolves to the first (idx 2, tie
    // on magnitude 3); no dramaticTurn/revelation at indices 0 or 1 (2-scene lookback).
    it('RELATIONAL_CURIOSITY_PEAK_UNCAUSED fires when the peak curiosity scene has no preparing cause nearby', async () => {
      const recs791b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs791b[2] = makeSharedRecord(2, { curiosityDelta: 3 });
      recs791b[5] = makeSharedRecord(5, { curiosityDelta: 3 });
      const res = await runRA791(recs791b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_CURIOSITY_PEAK_UNCAUSED'), 'RELATIONAL_CURIOSITY_PEAK_UNCAUSED should fire');
    });

    it('RELATIONAL_CURIOSITY_PEAK_UNCAUSED does not fire when a preparing cause precedes the peak curiosity scene', async () => {
      const recs791bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs791bn[2] = makeSharedRecord(2, { curiosityDelta: 3 });
      recs791bn[5] = makeSharedRecord(5, { curiosityDelta: 3 });
      recs791bn[1] = makeSharedRecord(1, { dramaticTurn: 'reversal' });
      const res = await runRA791(recs791bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_CURIOSITY_PEAK_UNCAUSED'), 'RELATIONAL_CURIOSITY_PEAK_UNCAUSED should not fire');
    });

    // RELATIONAL_REVELATION_PEAK_UNCAUSED fire:
    // 8 scenes; revelation-qualifying (magnitude 1) at 2 and 5; peak resolves to the first (idx 2);
    // no dramaticTurn at 0, 1, or 2 itself (2-scene lookback + the peak scene itself).
    it('RELATIONAL_REVELATION_PEAK_UNCAUSED fires when the revelation scene has no dramatic turn nearby', async () => {
      const recs791c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs791c[2] = makeSharedRecord(2, { revelation: 'truth revealed' });
      recs791c[5] = makeSharedRecord(5, { revelation: 'truth revealed' });
      const res = await runRA791(recs791c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_REVELATION_PEAK_UNCAUSED'), 'RELATIONAL_REVELATION_PEAK_UNCAUSED should fire');
    });

    it('RELATIONAL_REVELATION_PEAK_UNCAUSED does not fire when a dramatic turn precedes the revelation scene', async () => {
      const recs791cn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs791cn[2] = makeSharedRecord(2, { revelation: 'truth revealed' });
      recs791cn[5] = makeSharedRecord(5, { revelation: 'truth revealed' });
      recs791cn[1] = makeSharedRecord(1, { dramaticTurn: 'reversal' });
      const res = await runRA791(recs791cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_REVELATION_PEAK_UNCAUSED'), 'RELATIONAL_REVELATION_PEAK_UNCAUSED should not fire');
    });
  });

  describe('Wave 777 — relationshipArcPass: relational suspense peak uncaused, relational curiosity zone cluster, relational revelation drought run', async () => {
    const runRA777 = async (records: ScreenplaySceneRecord[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RELATIONAL_SUSPENSE_PEAK_UNCAUSED fire:
    // 8 scenes; suspenseDelta qualifying (>0) at 2 and 5; peak resolves to the first (idx 2, tie
    // on magnitude 3); no dramaticTurn/revelation at indices 0 or 1 (2-scene lookback).
    it('RELATIONAL_SUSPENSE_PEAK_UNCAUSED fires when the peak suspense scene has no preparing cause nearby', async () => {
      const recs777a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs777a[2] = makeSharedRecord(2, { suspenseDelta: 3 });
      recs777a[5] = makeSharedRecord(5, { suspenseDelta: 3 });
      const res = await runRA777(recs777a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_SUSPENSE_PEAK_UNCAUSED'), 'RELATIONAL_SUSPENSE_PEAK_UNCAUSED should fire');
    });

    it('RELATIONAL_SUSPENSE_PEAK_UNCAUSED does not fire when a preparing cause precedes the peak suspense scene', async () => {
      const recs777an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs777an[2] = makeSharedRecord(2, { suspenseDelta: 3 });
      recs777an[5] = makeSharedRecord(5, { suspenseDelta: 3 });
      recs777an[1] = makeSharedRecord(1, { dramaticTurn: 'reversal' });
      const res = await runRA777(recs777an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_SUSPENSE_PEAK_UNCAUSED'), 'RELATIONAL_SUSPENSE_PEAK_UNCAUSED should not fire');
    });

    // RELATIONAL_CURIOSITY_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; curiosity-positive scenes at 0,1,2 → 100% opening third
    it('RELATIONAL_CURIOSITY_ZONE_CLUSTER fires when >75% of curiosity-positive scenes cluster in one third', async () => {
      const recs777b = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 1, 2].includes(i) ? 2 : 0 }),
      );
      const res = await runRA777(recs777b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_CURIOSITY_ZONE_CLUSTER'), 'RELATIONAL_CURIOSITY_ZONE_CLUSTER should fire');
    });

    it('RELATIONAL_CURIOSITY_ZONE_CLUSTER does not fire when curiosity-positive scenes spread across thirds', async () => {
      const recs777bn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 4, 8].includes(i) ? 2 : 0 }),
      );
      const res = await runRA777(recs777bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_CURIOSITY_ZONE_CLUSTER'), 'RELATIONAL_CURIOSITY_ZONE_CLUSTER should not fire');
    });

    // RELATIONAL_REVELATION_DROUGHT_RUN fire:
    // n=10; revelation present at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('RELATIONAL_REVELATION_DROUGHT_RUN fires when a long run has no revelation', async () => {
      const recs777c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { revelation: [0, 1, 2].includes(i) ? 'truth revealed' : null }),
      );
      const res = await runRA777(recs777c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_REVELATION_DROUGHT_RUN'), 'RELATIONAL_REVELATION_DROUGHT_RUN should fire');
    });

    it('RELATIONAL_REVELATION_DROUGHT_RUN does not fire when revelations are evenly spread', async () => {
      const recs777cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { revelation: [0, 3, 6, 9].includes(i) ? 'truth revealed' : null }),
      );
      const res = await runRA777(recs777cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_REVELATION_DROUGHT_RUN'), 'RELATIONAL_REVELATION_DROUGHT_RUN should not fire');
    });
  });


  describe('Wave 763 — relationshipArcPass: relational suspense zone cluster, relational curiosity drought run, relational revelation zone cluster', async () => {
    const runRA763 = async (records: ScreenplaySceneRecord[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RELATIONAL_SUSPENSE_ZONE_CLUSTER fire:
    // 9 scenes; suspenseDelta > 0 at 0, 1, 2 (all in opening third) — 3 of 3 (100%) cluster in opening.
    it('RELATIONAL_SUSPENSE_ZONE_CLUSTER fires when suspense-positive scenes cluster in one third', async () => {
      const recs763a = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { suspenseDelta: [0, 1, 2].includes(i) ? 2 : 0 }),
      );
      const res = await runRA763(recs763a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_SUSPENSE_ZONE_CLUSTER'), 'RELATIONAL_SUSPENSE_ZONE_CLUSTER should fire');
    });

    it('RELATIONAL_SUSPENSE_ZONE_CLUSTER does not fire when suspense-positive scenes spread across thirds', async () => {
      const recs763an = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { suspenseDelta: [0, 4, 8].includes(i) ? 2 : 0 }),
      );
      const res = await runRA763(recs763an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_SUSPENSE_ZONE_CLUSTER'), 'RELATIONAL_SUSPENSE_ZONE_CLUSTER should not fire');
    });

    // RELATIONAL_CURIOSITY_DROUGHT_RUN fire:
    // 10 scenes; curiosityDelta > 0 at 0, 1, 2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('RELATIONAL_CURIOSITY_DROUGHT_RUN fires when a long run has no rising curiosity', async () => {
      const recs763b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 1, 2].includes(i) ? 2 : 0 }),
      );
      const res = await runRA763(recs763b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_CURIOSITY_DROUGHT_RUN'), 'RELATIONAL_CURIOSITY_DROUGHT_RUN should fire');
    });

    it('RELATIONAL_CURIOSITY_DROUGHT_RUN does not fire when curiosity rises are evenly spread', async () => {
      const recs763bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 3, 6, 9].includes(i) ? 2 : 0 }),
      );
      const res = await runRA763(recs763bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_CURIOSITY_DROUGHT_RUN'), 'RELATIONAL_CURIOSITY_DROUGHT_RUN should not fire');
    });

    // RELATIONAL_REVELATION_ZONE_CLUSTER fire:
    // 9 scenes; revelation set at 0, 1, 2 (all in opening third) — 3 of 3 (100%) cluster in opening.
    it('RELATIONAL_REVELATION_ZONE_CLUSTER fires when revelation scenes cluster in one third', async () => {
      const recs763c = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { revelation: [0, 1, 2].includes(i) ? 'truth revealed' : null }),
      );
      const res = await runRA763(recs763c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_REVELATION_ZONE_CLUSTER'), 'RELATIONAL_REVELATION_ZONE_CLUSTER should fire');
    });

    it('RELATIONAL_REVELATION_ZONE_CLUSTER does not fire when revelation scenes spread across thirds', async () => {
      const recs763cn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { revelation: [0, 4, 8].includes(i) ? 'truth revealed' : null }),
      );
      const res = await runRA763(recs763cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_REVELATION_ZONE_CLUSTER'), 'RELATIONAL_REVELATION_ZONE_CLUSTER should not fire');
    });
  });


  describe('Wave 749 — relationshipArcPass: relational open thread peak uncaused, relational clock delta zone cluster, relational turn drought run', async () => {
    const runRA749 = async (records: ScreenplaySceneRecord[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RELATIONAL_OPEN_THREAD_PEAK_UNCAUSED fire:
    // 8 scenes; open threads at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('RELATIONAL_OPEN_THREAD_PEAK_UNCAUSED fires when the peak open-thread scene has no dramatic turn or revelation nearby', async () => {
      const recs749a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs749a[2] = makeSharedRecord(2, { unresolvedClues: ['clue-a'] });
      recs749a[6] = makeSharedRecord(6, { unresolvedClues: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runRA749(recs749a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_OPEN_THREAD_PEAK_UNCAUSED'), 'RELATIONAL_OPEN_THREAD_PEAK_UNCAUSED should fire');
    });

    // RELATIONAL_OPEN_THREAD_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('RELATIONAL_OPEN_THREAD_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs749an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs749an[2] = makeSharedRecord(2, { unresolvedClues: ['clue-a'] });
      recs749an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs749an[6] = makeSharedRecord(6, { unresolvedClues: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runRA749(recs749an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_OPEN_THREAD_PEAK_UNCAUSED'), 'RELATIONAL_OPEN_THREAD_PEAK_UNCAUSED should not fire');
    });

    // RELATIONAL_CLOCK_DELTA_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; clock-shifting scenes at 0,1,2 → 100% opening third
    it('RELATIONAL_CLOCK_DELTA_ZONE_CLUSTER fires when >75% of clock-shifting scenes cluster in one third', async () => {
      const recs749b = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs749b[0] = makeSharedRecord(0, { clockDelta: 1 });
      recs749b[1] = makeSharedRecord(1, { clockDelta: -1 });
      recs749b[2] = makeSharedRecord(2, { clockDelta: 1 });
      const res = await runRA749(recs749b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_CLOCK_DELTA_ZONE_CLUSTER'), 'RELATIONAL_CLOCK_DELTA_ZONE_CLUSTER should fire');
    });

    // RELATIONAL_CLOCK_DELTA_ZONE_CLUSTER no-fire:
    // clock-shifting scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('RELATIONAL_CLOCK_DELTA_ZONE_CLUSTER does not fire when clock movement is distributed across thirds', async () => {
      const recs749bn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs749bn[0] = makeSharedRecord(0, { clockDelta: 1 });
      recs749bn[4] = makeSharedRecord(4, { clockDelta: -1 });
      recs749bn[7] = makeSharedRecord(7, { clockDelta: 1 });
      const res = await runRA749(recs749bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_CLOCK_DELTA_ZONE_CLUSTER'), 'RELATIONAL_CLOCK_DELTA_ZONE_CLUSTER should not fire');
    });

    // RELATIONAL_TURN_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 carry a dramatic turn (>=3 present overall); scenes 3-9 (7 scenes) have none
    it('RELATIONAL_TURN_DROUGHT_RUN fires when the longest no-dramatic-turn run reaches 6', async () => {
      const recs749c = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs749c[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs749c[1] = makeSharedRecord(1, { dramaticTurn: 'reversal' });
      recs749c[2] = makeSharedRecord(2, { dramaticTurn: 'reversal' });
      const res = await runRA749(recs749c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_TURN_DROUGHT_RUN'), 'RELATIONAL_TURN_DROUGHT_RUN should fire');
    });

    // RELATIONAL_TURN_DROUGHT_RUN no-fire:
    // dramatic-turn scenes spread out so no gap reaches 6 consecutive scenes
    it('RELATIONAL_TURN_DROUGHT_RUN does not fire when dramatic turns are spread through the story', async () => {
      const recs749cn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs749cn[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs749cn[3] = makeSharedRecord(3, { dramaticTurn: 'reversal' });
      recs749cn[6] = makeSharedRecord(6, { dramaticTurn: 'reversal' });
      recs749cn[9] = makeSharedRecord(9, { dramaticTurn: 'reversal' });
      const res = await runRA749(recs749cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_TURN_DROUGHT_RUN'), 'RELATIONAL_TURN_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 735 — relationshipArcPass: relational payoff zone cluster, relational clock delta drought run, relational open thread zone cluster', async () => {
    const runRA735 = async (records: ScreenplaySceneRecord[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RELATIONAL_PAYOFF_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; payoff scenes at 0,1,2 → 100% opening third
    it('RELATIONAL_PAYOFF_ZONE_CLUSTER fires when >75% of payoff scenes cluster in one third', async () => {
      const recs735a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs735a[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs735a[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs735a[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-c'] });
      const res = await runRA735(recs735a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_PAYOFF_ZONE_CLUSTER'), 'RELATIONAL_PAYOFF_ZONE_CLUSTER should fire');
    });

    // RELATIONAL_PAYOFF_ZONE_CLUSTER no-fire:
    // payoff scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('RELATIONAL_PAYOFF_ZONE_CLUSTER does not fire when payoff scenes are distributed across thirds', async () => {
      const recs735an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs735an[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs735an[4] = makeSharedRecord(4, { payoffSetupIds: ['thread-b'] });
      recs735an[7] = makeSharedRecord(7, { payoffSetupIds: ['thread-c'] });
      const res = await runRA735(recs735an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_PAYOFF_ZONE_CLUSTER'), 'RELATIONAL_PAYOFF_ZONE_CLUSTER should not fire');
    });

    // RELATIONAL_CLOCK_DELTA_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 shift the clock (>=3 present overall); scenes 3-9 (7 scenes) have none
    it('RELATIONAL_CLOCK_DELTA_DROUGHT_RUN fires when the longest no-clock-movement run reaches 6', async () => {
      const recs735b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs735b[0] = makeSharedRecord(0, { clockDelta: 1 });
      recs735b[1] = makeSharedRecord(1, { clockDelta: -1 });
      recs735b[2] = makeSharedRecord(2, { clockDelta: 1 });
      const res = await runRA735(recs735b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_CLOCK_DELTA_DROUGHT_RUN'), 'RELATIONAL_CLOCK_DELTA_DROUGHT_RUN should fire');
    });

    // RELATIONAL_CLOCK_DELTA_DROUGHT_RUN no-fire:
    // clock-shifting scenes spread out so no gap reaches 6 consecutive scenes
    it('RELATIONAL_CLOCK_DELTA_DROUGHT_RUN does not fire when clock movement is spread through the story', async () => {
      const recs735bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs735bn[0] = makeSharedRecord(0, { clockDelta: 1 });
      recs735bn[3] = makeSharedRecord(3, { clockDelta: -1 });
      recs735bn[6] = makeSharedRecord(6, { clockDelta: 1 });
      recs735bn[9] = makeSharedRecord(9, { clockDelta: -1 });
      const res = await runRA735(recs735bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_CLOCK_DELTA_DROUGHT_RUN'), 'RELATIONAL_CLOCK_DELTA_DROUGHT_RUN should not fire');
    });

    // RELATIONAL_OPEN_THREAD_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; open-thread scenes at 0,1,2 → 100% opening third
    it('RELATIONAL_OPEN_THREAD_ZONE_CLUSTER fires when >75% of open-thread scenes cluster in one third', async () => {
      const recs735c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs735c[0] = makeSharedRecord(0, { unresolvedClues: ['clue-a'] });
      recs735c[1] = makeSharedRecord(1, { unresolvedClues: ['clue-b'] });
      recs735c[2] = makeSharedRecord(2, { unresolvedClues: ['clue-c'] });
      const res = await runRA735(recs735c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_OPEN_THREAD_ZONE_CLUSTER'), 'RELATIONAL_OPEN_THREAD_ZONE_CLUSTER should fire');
    });

    // RELATIONAL_OPEN_THREAD_ZONE_CLUSTER no-fire:
    // open-thread scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('RELATIONAL_OPEN_THREAD_ZONE_CLUSTER does not fire when open-thread scenes are distributed across thirds', async () => {
      const recs735cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs735cn[0] = makeSharedRecord(0, { unresolvedClues: ['clue-a'] });
      recs735cn[4] = makeSharedRecord(4, { unresolvedClues: ['clue-b'] });
      recs735cn[7] = makeSharedRecord(7, { unresolvedClues: ['clue-c'] });
      const res = await runRA735(recs735cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_OPEN_THREAD_ZONE_CLUSTER'), 'RELATIONAL_OPEN_THREAD_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 721 — relationshipArcPass: relational highlight zone cluster, relational payoff drought run, relational stakes zone cluster', async () => {
    const runRA721 = async (records: ScreenplaySceneRecord[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RELATIONAL_HIGHLIGHT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; highlighted-dialogue scenes at 0,1,2 → 100% opening third
    it('RELATIONAL_HIGHLIGHT_ZONE_CLUSTER fires when >75% of highlighted-dialogue scenes cluster in one third', async () => {
      const recs721a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs721a[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs721a[1] = makeSharedRecord(1, { dialogueHighlights: ['line-b'] });
      recs721a[2] = makeSharedRecord(2, { dialogueHighlights: ['line-c'] });
      const res = await runRA721(recs721a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_HIGHLIGHT_ZONE_CLUSTER'), 'RELATIONAL_HIGHLIGHT_ZONE_CLUSTER should fire');
    });

    // RELATIONAL_HIGHLIGHT_ZONE_CLUSTER no-fire:
    // highlighted-dialogue scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('RELATIONAL_HIGHLIGHT_ZONE_CLUSTER does not fire when highlighted-dialogue scenes are distributed across thirds', async () => {
      const recs721an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs721an[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs721an[4] = makeSharedRecord(4, { dialogueHighlights: ['line-b'] });
      recs721an[7] = makeSharedRecord(7, { dialogueHighlights: ['line-c'] });
      const res = await runRA721(recs721an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_HIGHLIGHT_ZONE_CLUSTER'), 'RELATIONAL_HIGHLIGHT_ZONE_CLUSTER should not fire');
    });

    // RELATIONAL_PAYOFF_DROUGHT_RUN fire:
    // 10 scenes; payoffs at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('RELATIONAL_PAYOFF_DROUGHT_RUN fires when the longest no-payoff run is ≥6', async () => {
      const recs721b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs721b[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs721b[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs721b[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-c'] });
      recs721b[9] = makeSharedRecord(9, { payoffSetupIds: ['thread-d'] });
      const res = await runRA721(recs721b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_PAYOFF_DROUGHT_RUN'), 'RELATIONAL_PAYOFF_DROUGHT_RUN should fire');
    });

    // RELATIONAL_PAYOFF_DROUGHT_RUN no-fire:
    // payoffs at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('RELATIONAL_PAYOFF_DROUGHT_RUN does not fire when payoffs are distributed without a long drought', async () => {
      const recs721bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs721bn[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs721bn[4] = makeSharedRecord(4, { payoffSetupIds: ['thread-b'] });
      recs721bn[9] = makeSharedRecord(9, { payoffSetupIds: ['thread-c'] });
      const res = await runRA721(recs721bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_PAYOFF_DROUGHT_RUN'), 'RELATIONAL_PAYOFF_DROUGHT_RUN should not fire');
    });

    // RELATIONAL_STAKES_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; stakes-raising scenes at 0,1,2 → 100% opening third
    it('RELATIONAL_STAKES_ZONE_CLUSTER fires when >75% of stakes-raising scenes cluster in one third', async () => {
      const recs721c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs721c[0] = makeSharedRecord(0, { purpose: 'raise_stakes' });
      recs721c[1] = makeSharedRecord(1, { purpose: 'raise_stakes' });
      recs721c[2] = makeSharedRecord(2, { purpose: 'raise_stakes' });
      const res = await runRA721(recs721c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_STAKES_ZONE_CLUSTER'), 'RELATIONAL_STAKES_ZONE_CLUSTER should fire');
    });

    // RELATIONAL_STAKES_ZONE_CLUSTER no-fire:
    // stakes-raising scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('RELATIONAL_STAKES_ZONE_CLUSTER does not fire when stakes-raising scenes are distributed across thirds', async () => {
      const recs721cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs721cn[0] = makeSharedRecord(0, { purpose: 'raise_stakes' });
      recs721cn[4] = makeSharedRecord(4, { purpose: 'raise_stakes' });
      recs721cn[7] = makeSharedRecord(7, { purpose: 'raise_stakes' });
      const res = await runRA721(recs721cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_STAKES_ZONE_CLUSTER'), 'RELATIONAL_STAKES_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 707 — relationshipArcPass: relational staging peak uncaused, relational seed peak uncaused, relational highlight drought run', async () => {
    const runRA707 = async (records: ScreenplaySceneRecord[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RELATIONAL_STAGING_PEAK_UNCAUSED fire:
    // 8 scenes; visual beats at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('RELATIONAL_STAGING_PEAK_UNCAUSED fires when the peak physical-staging scene has no dramatic turn or revelation nearby', async () => {
      const recs707a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs707a[2] = makeSharedRecord(2, { visualBeats: ['a beat'] });
      recs707a[6] = makeSharedRecord(6, { visualBeats: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runRA707(recs707a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_STAGING_PEAK_UNCAUSED'), 'RELATIONAL_STAGING_PEAK_UNCAUSED should fire');
    });

    // RELATIONAL_STAGING_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('RELATIONAL_STAGING_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs707an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs707an[2] = makeSharedRecord(2, { visualBeats: ['a beat'] });
      recs707an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs707an[6] = makeSharedRecord(6, { visualBeats: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runRA707(recs707an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_STAGING_PEAK_UNCAUSED'), 'RELATIONAL_STAGING_PEAK_UNCAUSED should not fire');
    });

    // RELATIONAL_SEED_PEAK_UNCAUSED fire:
    // 8 scenes; seeds at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('RELATIONAL_SEED_PEAK_UNCAUSED fires when the peak seed scene has no dramatic turn or revelation nearby', async () => {
      const recs707b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs707b[2] = makeSharedRecord(2, { seededClueIds: ['clue-a'] });
      recs707b[6] = makeSharedRecord(6, { seededClueIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runRA707(recs707b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_SEED_PEAK_UNCAUSED'), 'RELATIONAL_SEED_PEAK_UNCAUSED should fire');
    });

    // RELATIONAL_SEED_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('RELATIONAL_SEED_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs707bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs707bn[2] = makeSharedRecord(2, { seededClueIds: ['clue-a'] });
      recs707bn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs707bn[6] = makeSharedRecord(6, { seededClueIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runRA707(recs707bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_SEED_PEAK_UNCAUSED'), 'RELATIONAL_SEED_PEAK_UNCAUSED should not fire');
    });

    // RELATIONAL_HIGHLIGHT_DROUGHT_RUN fire:
    // 10 scenes; highlights at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('RELATIONAL_HIGHLIGHT_DROUGHT_RUN fires when the longest no-highlighted-dialogue run is ≥6', async () => {
      const recs707c = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs707c[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs707c[1] = makeSharedRecord(1, { dialogueHighlights: ['line-b'] });
      recs707c[2] = makeSharedRecord(2, { dialogueHighlights: ['line-c'] });
      recs707c[9] = makeSharedRecord(9, { dialogueHighlights: ['line-d'] });
      const res = await runRA707(recs707c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_HIGHLIGHT_DROUGHT_RUN'), 'RELATIONAL_HIGHLIGHT_DROUGHT_RUN should fire');
    });

    // RELATIONAL_HIGHLIGHT_DROUGHT_RUN no-fire:
    // highlights at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('RELATIONAL_HIGHLIGHT_DROUGHT_RUN does not fire when highlighted dialogue is distributed without a long drought', async () => {
      const recs707cn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs707cn[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs707cn[4] = makeSharedRecord(4, { dialogueHighlights: ['line-b'] });
      recs707cn[9] = makeSharedRecord(9, { dialogueHighlights: ['line-c'] });
      const res = await runRA707(recs707cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_HIGHLIGHT_DROUGHT_RUN'), 'RELATIONAL_HIGHLIGHT_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 693 — relationshipArcPass: relational staging drought run, relational seed zone cluster, relational clock drought run', async () => {
    const runRA693 = async (records: ScreenplaySceneRecord[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RELATIONAL_STAGING_DROUGHT_RUN fire:
    // 10 scenes; visual beats at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('RELATIONAL_STAGING_DROUGHT_RUN fires when the longest no-visual-beat run is ≥6', async () => {
      const recs693a = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs693a[0] = makeSharedRecord(0, { visualBeats: ['a beat'] });
      recs693a[1] = makeSharedRecord(1, { visualBeats: ['a beat'] });
      recs693a[2] = makeSharedRecord(2, { visualBeats: ['a beat'] });
      recs693a[9] = makeSharedRecord(9, { visualBeats: ['a beat'] });
      const res = await runRA693(recs693a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_STAGING_DROUGHT_RUN'), 'RELATIONAL_STAGING_DROUGHT_RUN should fire');
    });

    // RELATIONAL_STAGING_DROUGHT_RUN no-fire:
    // visual beats at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('RELATIONAL_STAGING_DROUGHT_RUN does not fire when visual beats are distributed without a long drought', async () => {
      const recs693an = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs693an[0] = makeSharedRecord(0, { visualBeats: ['a beat'] });
      recs693an[4] = makeSharedRecord(4, { visualBeats: ['a beat'] });
      recs693an[9] = makeSharedRecord(9, { visualBeats: ['a beat'] });
      const res = await runRA693(recs693an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_STAGING_DROUGHT_RUN'), 'RELATIONAL_STAGING_DROUGHT_RUN should not fire');
    });

    // RELATIONAL_SEED_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; seed scenes at 0,1,2 → 100% opening third
    it('RELATIONAL_SEED_ZONE_CLUSTER fires when >75% of seed scenes cluster in one third', async () => {
      const recs693b = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs693b[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs693b[1] = makeSharedRecord(1, { seededClueIds: ['clue-b'] });
      recs693b[2] = makeSharedRecord(2, { seededClueIds: ['clue-c'] });
      const res = await runRA693(recs693b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_SEED_ZONE_CLUSTER'), 'RELATIONAL_SEED_ZONE_CLUSTER should fire');
    });

    // RELATIONAL_SEED_ZONE_CLUSTER no-fire:
    // seed scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('RELATIONAL_SEED_ZONE_CLUSTER does not fire when seed scenes are distributed across thirds', async () => {
      const recs693bn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs693bn[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs693bn[4] = makeSharedRecord(4, { seededClueIds: ['clue-b'] });
      recs693bn[7] = makeSharedRecord(7, { seededClueIds: ['clue-c'] });
      const res = await runRA693(recs693bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_SEED_ZONE_CLUSTER'), 'RELATIONAL_SEED_ZONE_CLUSTER should not fire');
    });

    // RELATIONAL_CLOCK_DROUGHT_RUN fire:
    // 10 scenes; clock raised at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('RELATIONAL_CLOCK_DROUGHT_RUN fires when the longest no-clock run is ≥6', async () => {
      const recs693c = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs693c[0] = makeSharedRecord(0, { clockRaised: true });
      recs693c[1] = makeSharedRecord(1, { clockRaised: true });
      recs693c[2] = makeSharedRecord(2, { clockRaised: true });
      recs693c[9] = makeSharedRecord(9, { clockRaised: true });
      const res = await runRA693(recs693c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_CLOCK_DROUGHT_RUN'), 'RELATIONAL_CLOCK_DROUGHT_RUN should fire');
    });

    // RELATIONAL_CLOCK_DROUGHT_RUN no-fire:
    // clock raised at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('RELATIONAL_CLOCK_DROUGHT_RUN does not fire when clock raises are distributed without a long drought', async () => {
      const recs693cn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs693cn[0] = makeSharedRecord(0, { clockRaised: true });
      recs693cn[4] = makeSharedRecord(4, { clockRaised: true });
      recs693cn[9] = makeSharedRecord(9, { clockRaised: true });
      const res = await runRA693(recs693cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_CLOCK_DROUGHT_RUN'), 'RELATIONAL_CLOCK_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 679 — relationshipArcPass: relational clock delta peak uncaused, relational stakes drought run, relational turn zone cluster', async () => {
    const runRA679 = async (records: ScreenplaySceneRecord[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RELATIONAL_CLOCK_DELTA_PEAK_UNCAUSED fire:
    // 8 scenes; clockDelta at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('RELATIONAL_CLOCK_DELTA_PEAK_UNCAUSED fires when the peak clockDelta scene has no dramatic turn or revelation nearby', async () => {
      const recs679a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs679a[2] = makeSharedRecord(2, { clockDelta: 1 });
      recs679a[6] = makeSharedRecord(6, { clockDelta: 5 });
      const res = await runRA679(recs679a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_CLOCK_DELTA_PEAK_UNCAUSED'), 'RELATIONAL_CLOCK_DELTA_PEAK_UNCAUSED should fire');
    });

    // RELATIONAL_CLOCK_DELTA_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('RELATIONAL_CLOCK_DELTA_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs679an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs679an[2] = makeSharedRecord(2, { clockDelta: 1 });
      recs679an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs679an[6] = makeSharedRecord(6, { clockDelta: 5 });
      const res = await runRA679(recs679an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_CLOCK_DELTA_PEAK_UNCAUSED'), 'RELATIONAL_CLOCK_DELTA_PEAK_UNCAUSED should not fire');
    });

    // RELATIONAL_STAKES_DROUGHT_RUN fire:
    // 10 scenes; stakes-raising at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('RELATIONAL_STAKES_DROUGHT_RUN fires when the longest no-stakes-raising run is ≥6', async () => {
      const recs679b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs679b[0] = makeSharedRecord(0, { purpose: 'raise_stakes' });
      recs679b[1] = makeSharedRecord(1, { purpose: 'raise_stakes' });
      recs679b[2] = makeSharedRecord(2, { purpose: 'raise_stakes' });
      recs679b[9] = makeSharedRecord(9, { purpose: 'raise_stakes' });
      const res = await runRA679(recs679b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_STAKES_DROUGHT_RUN'), 'RELATIONAL_STAKES_DROUGHT_RUN should fire');
    });

    // RELATIONAL_STAKES_DROUGHT_RUN no-fire:
    // stakes-raising at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('RELATIONAL_STAKES_DROUGHT_RUN does not fire when stakes-raising scenes are distributed without a long drought', async () => {
      const recs679bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs679bn[0] = makeSharedRecord(0, { purpose: 'raise_stakes' });
      recs679bn[4] = makeSharedRecord(4, { purpose: 'raise_stakes' });
      recs679bn[9] = makeSharedRecord(9, { purpose: 'raise_stakes' });
      const res = await runRA679(recs679bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_STAKES_DROUGHT_RUN'), 'RELATIONAL_STAKES_DROUGHT_RUN should not fire');
    });

    // RELATIONAL_TURN_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; dramatic-turn scenes at 0,1,2 → 100% opening third
    it('RELATIONAL_TURN_ZONE_CLUSTER fires when >75% of dramatic-turn scenes cluster in one third', async () => {
      const recs679c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs679c[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs679c[1] = makeSharedRecord(1, { dramaticTurn: 'reversal' });
      recs679c[2] = makeSharedRecord(2, { dramaticTurn: 'reversal' });
      const res = await runRA679(recs679c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_TURN_ZONE_CLUSTER'), 'RELATIONAL_TURN_ZONE_CLUSTER should fire');
    });

    // RELATIONAL_TURN_ZONE_CLUSTER no-fire:
    // dramatic-turn scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('RELATIONAL_TURN_ZONE_CLUSTER does not fire when dramatic-turn scenes are distributed across thirds', async () => {
      const recs679cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs679cn[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs679cn[4] = makeSharedRecord(4, { dramaticTurn: 'reversal' });
      recs679cn[7] = makeSharedRecord(7, { dramaticTurn: 'reversal' });
      const res = await runRA679(recs679cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_TURN_ZONE_CLUSTER'), 'RELATIONAL_TURN_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 665 — relationshipArcPass: relational payoff peak uncaused, relational seed drought run, relational clock zone cluster', async () => {
    const runRA665 = async (records: ScreenplaySceneRecord[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RELATIONAL_PAYOFF_PEAK_UNCAUSED fire:
    // 8 scenes; payoffs at 2 (1 thread) and 6 (5 threads, the peak); no dramaticTurn or revelation
    // at 6, 5, or 4
    it('RELATIONAL_PAYOFF_PEAK_UNCAUSED fires when the peak payoff scene has no dramatic turn or revelation nearby', async () => {
      const recs665a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs665a[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-a'] });
      recs665a[6] = makeSharedRecord(6, { payoffSetupIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runRA665(recs665a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_PAYOFF_PEAK_UNCAUSED'), 'RELATIONAL_PAYOFF_PEAK_UNCAUSED should fire');
    });

    // RELATIONAL_PAYOFF_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('RELATIONAL_PAYOFF_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs665an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs665an[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-a'] });
      recs665an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs665an[6] = makeSharedRecord(6, { payoffSetupIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runRA665(recs665an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_PAYOFF_PEAK_UNCAUSED'), 'RELATIONAL_PAYOFF_PEAK_UNCAUSED should not fire');
    });

    // RELATIONAL_SEED_DROUGHT_RUN fire:
    // 10 scenes; seeded at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('RELATIONAL_SEED_DROUGHT_RUN fires when the longest no-seed run is ≥6', async () => {
      const recs665b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs665b[0] = makeSharedRecord(0, { seededClueIds: ['clue-x'] });
      recs665b[1] = makeSharedRecord(1, { seededClueIds: ['clue-x'] });
      recs665b[2] = makeSharedRecord(2, { seededClueIds: ['clue-x'] });
      recs665b[9] = makeSharedRecord(9, { seededClueIds: ['clue-x'] });
      const res = await runRA665(recs665b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_SEED_DROUGHT_RUN'), 'RELATIONAL_SEED_DROUGHT_RUN should fire');
    });

    // RELATIONAL_SEED_DROUGHT_RUN no-fire:
    // seeded at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('RELATIONAL_SEED_DROUGHT_RUN does not fire when seeding is distributed without a long drought', async () => {
      const recs665bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs665bn[0] = makeSharedRecord(0, { seededClueIds: ['clue-x'] });
      recs665bn[4] = makeSharedRecord(4, { seededClueIds: ['clue-x'] });
      recs665bn[9] = makeSharedRecord(9, { seededClueIds: ['clue-x'] });
      const res = await runRA665(recs665bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_SEED_DROUGHT_RUN'), 'RELATIONAL_SEED_DROUGHT_RUN should not fire');
    });

    // RELATIONAL_CLOCK_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; clock-raised scenes at 0,1,2 → 100% opening third
    it('RELATIONAL_CLOCK_ZONE_CLUSTER fires when >75% of clock-raised scenes cluster in one third', async () => {
      const recs665c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs665c[0] = makeSharedRecord(0, { clockRaised: true });
      recs665c[1] = makeSharedRecord(1, { clockRaised: true });
      recs665c[2] = makeSharedRecord(2, { clockRaised: true });
      const res = await runRA665(recs665c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_CLOCK_ZONE_CLUSTER'), 'RELATIONAL_CLOCK_ZONE_CLUSTER should fire');
    });

    // RELATIONAL_CLOCK_ZONE_CLUSTER no-fire:
    // clock-raised scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('RELATIONAL_CLOCK_ZONE_CLUSTER does not fire when clock-raised scenes are distributed across thirds', async () => {
      const recs665cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs665cn[0] = makeSharedRecord(0, { clockRaised: true });
      recs665cn[4] = makeSharedRecord(4, { clockRaised: true });
      recs665cn[7] = makeSharedRecord(7, { clockRaised: true });
      const res = await runRA665(recs665cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_CLOCK_ZONE_CLUSTER'), 'RELATIONAL_CLOCK_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 651 — relationshipArcPass: relational highlight peak uncaused, relational open thread drought run, relational staging zone cluster', async () => {
    const runRA651 = async (records: ScreenplaySceneRecord[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RELATIONAL_HIGHLIGHT_PEAK_UNCAUSED fire:
    // 8 scenes; highlights at 2 (1 line) and 6 (5 lines, the peak); no dramaticTurn or revelation
    // at 6, 5, or 4
    it('RELATIONAL_HIGHLIGHT_PEAK_UNCAUSED fires when the peak highlighted-dialogue scene has no dramatic turn or revelation nearby', async () => {
      const recs651a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs651a[2] = makeSharedRecord(2, { dialogueHighlights: ['line-a'] });
      recs651a[6] = makeSharedRecord(6, { dialogueHighlights: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runRA651(recs651a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_HIGHLIGHT_PEAK_UNCAUSED'), 'RELATIONAL_HIGHLIGHT_PEAK_UNCAUSED should fire');
    });

    // RELATIONAL_HIGHLIGHT_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('RELATIONAL_HIGHLIGHT_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs651an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs651an[2] = makeSharedRecord(2, { dialogueHighlights: ['line-a'] });
      recs651an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs651an[6] = makeSharedRecord(6, { dialogueHighlights: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runRA651(recs651an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_HIGHLIGHT_PEAK_UNCAUSED'), 'RELATIONAL_HIGHLIGHT_PEAK_UNCAUSED should not fire');
    });

    // RELATIONAL_OPEN_THREAD_DROUGHT_RUN fire:
    // 10 scenes; debt at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('RELATIONAL_OPEN_THREAD_DROUGHT_RUN fires when the longest no-debt run is ≥6', async () => {
      const recs651b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs651b[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs651b[1] = makeSharedRecord(1, { unresolvedClues: ['b'] });
      recs651b[2] = makeSharedRecord(2, { unresolvedClues: ['c'] });
      recs651b[9] = makeSharedRecord(9, { unresolvedClues: ['d'] });
      const res = await runRA651(recs651b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_OPEN_THREAD_DROUGHT_RUN'), 'RELATIONAL_OPEN_THREAD_DROUGHT_RUN should fire');
    });

    // RELATIONAL_OPEN_THREAD_DROUGHT_RUN no-fire:
    // debt at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('RELATIONAL_OPEN_THREAD_DROUGHT_RUN does not fire when debt is distributed without a long drought', async () => {
      const recs651bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs651bn[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs651bn[4] = makeSharedRecord(4, { unresolvedClues: ['b'] });
      recs651bn[9] = makeSharedRecord(9, { unresolvedClues: ['c'] });
      const res = await runRA651(recs651bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_OPEN_THREAD_DROUGHT_RUN'), 'RELATIONAL_OPEN_THREAD_DROUGHT_RUN should not fire');
    });

    // RELATIONAL_STAGING_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; visually dense scenes (visualBeats≥2) at 0,1,2 → 100% opening
    // third
    it('RELATIONAL_STAGING_ZONE_CLUSTER fires when >75% of visually dense scenes cluster in one third', async () => {
      const recs651c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs651c[0] = makeSharedRecord(0, { visualBeats: ['a', 'b'] });
      recs651c[1] = makeSharedRecord(1, { visualBeats: ['a', 'b'] });
      recs651c[2] = makeSharedRecord(2, { visualBeats: ['a', 'b'] });
      const res = await runRA651(recs651c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_STAGING_ZONE_CLUSTER'), 'RELATIONAL_STAGING_ZONE_CLUSTER should fire');
    });

    // RELATIONAL_STAGING_ZONE_CLUSTER no-fire:
    // visually dense scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('RELATIONAL_STAGING_ZONE_CLUSTER does not fire when visually dense scenes are distributed across thirds', async () => {
      const recs651cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs651cn[0] = makeSharedRecord(0, { visualBeats: ['a', 'b'] });
      recs651cn[4] = makeSharedRecord(4, { visualBeats: ['a', 'b'] });
      recs651cn[7] = makeSharedRecord(7, { visualBeats: ['a', 'b'] });
      const res = await runRA651(recs651cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_STAGING_ZONE_CLUSTER'), 'RELATIONAL_STAGING_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 637 — relationshipArcPass: relational highlight open thread decoupled, relational open thread staging aftermath void, relational open thread zone imbalance', async () => {
    const runRA637 = async (records: ScreenplaySceneRecord[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RELATIONAL_HIGHLIGHT_OPEN_THREAD_DECOUPLED fire:
    // n=6; highlights at 0,1 (no debt); debt at 4,5 (no highlight) → zero overlap → fires
    it('RELATIONAL_HIGHLIGHT_OPEN_THREAD_DECOUPLED fires when dialogue-highlight scenes and open-thread scenes never overlap', async () => {
      const recs637a = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs637a[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs637a[1] = makeSharedRecord(1, { dialogueHighlights: ['line-b'] });
      recs637a[4] = makeSharedRecord(4, { unresolvedClues: ['unpaid-clue'] });
      recs637a[5] = makeSharedRecord(5, { unresolvedClues: ['unpaid-clue'] });
      const res = await runRA637(recs637a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_HIGHLIGHT_OPEN_THREAD_DECOUPLED'), 'RELATIONAL_HIGHLIGHT_OPEN_THREAD_DECOUPLED should fire');
    });

    // RELATIONAL_HIGHLIGHT_OPEN_THREAD_DECOUPLED no-fire:
    // scene 0 carries BOTH a highlight and open debt → overlap exists
    it('RELATIONAL_HIGHLIGHT_OPEN_THREAD_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs637an = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs637an[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'], unresolvedClues: ['unpaid-clue'] });
      recs637an[1] = makeSharedRecord(1, { dialogueHighlights: ['line-b'] });
      recs637an[5] = makeSharedRecord(5, { unresolvedClues: ['unpaid-clue'] });
      const res = await runRA637(recs637an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_HIGHLIGHT_OPEN_THREAD_DECOUPLED'), 'RELATIONAL_HIGHLIGHT_OPEN_THREAD_DECOUPLED should not fire');
    });

    // RELATIONAL_OPEN_THREAD_STAGING_AFTERMATH_VOID fire:
    // n=8, window=2; heavy clue-debt triggers at 0,1; their windows {1,2} and {2,3} carry no
    // visually dense scene; staged scenes exist elsewhere at 5,6,7 → fires
    it('RELATIONAL_OPEN_THREAD_STAGING_AFTERMATH_VOID fires when heavy clue-debt scenes are never followed by a visually dense scene', async () => {
      const recs637b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs637b[0] = makeSharedRecord(0, { unresolvedClues: ['c1', 'c2', 'c3'] });
      recs637b[1] = makeSharedRecord(1, { unresolvedClues: ['c1', 'c2', 'c3'] });
      recs637b[5] = makeSharedRecord(5, { visualBeats: ['reaches for her hand', 'pulls back'] });
      recs637b[6] = makeSharedRecord(6, { visualBeats: ['reaches for her hand', 'pulls back'] });
      recs637b[7] = makeSharedRecord(7, { visualBeats: ['reaches for her hand', 'pulls back'] });
      const res = await runRA637(recs637b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_OPEN_THREAD_STAGING_AFTERMATH_VOID'), 'RELATIONAL_OPEN_THREAD_STAGING_AFTERMATH_VOID should fire');
    });

    // RELATIONAL_OPEN_THREAD_STAGING_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries staging → that trigger's aftermath
    // is no longer void
    it('RELATIONAL_OPEN_THREAD_STAGING_AFTERMATH_VOID does not fire when a trigger window contains a visually dense scene', async () => {
      const recs637bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs637bn[0] = makeSharedRecord(0, { unresolvedClues: ['c1', 'c2', 'c3'] });
      recs637bn[1] = makeSharedRecord(1, { unresolvedClues: ['c1', 'c2', 'c3'] });
      recs637bn[3] = makeSharedRecord(3, { visualBeats: ['reaches for her hand', 'pulls back'] });
      recs637bn[5] = makeSharedRecord(5, { visualBeats: ['reaches for her hand', 'pulls back'] });
      recs637bn[6] = makeSharedRecord(6, { visualBeats: ['reaches for her hand', 'pulls back'] });
      recs637bn[7] = makeSharedRecord(7, { visualBeats: ['reaches for her hand', 'pulls back'] });
      const res = await runRA637(recs637bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_OPEN_THREAD_STAGING_AFTERMATH_VOID'), 'RELATIONAL_OPEN_THREAD_STAGING_AFTERMATH_VOID should not fire');
    });

    // RELATIONAL_OPEN_THREAD_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); debt at 6,7,8,9; zone 2 (6-8)=3, zone 3 (9)=1, total=4;
    // zones 0,1 empty; bloatZoneIdx=zone2, 3/4=75% ≥ 50% → fires
    it('RELATIONAL_OPEN_THREAD_ZONE_IMBALANCE fires when one zone is empty of open-thread scenes while another is bloated', async () => {
      const recs637c = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs637c[6] = makeSharedRecord(6, { unresolvedClues: ['a'] });
      recs637c[7] = makeSharedRecord(7, { unresolvedClues: ['b'] });
      recs637c[8] = makeSharedRecord(8, { unresolvedClues: ['c'] });
      recs637c[9] = makeSharedRecord(9, { unresolvedClues: ['d'] });
      const res = await runRA637(recs637c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_OPEN_THREAD_ZONE_IMBALANCE'), 'RELATIONAL_OPEN_THREAD_ZONE_IMBALANCE should fire');
    });

    // RELATIONAL_OPEN_THREAD_ZONE_IMBALANCE no-fire:
    // one open-thread scene per zone (1,4,7,10) → no zone is empty
    it('RELATIONAL_OPEN_THREAD_ZONE_IMBALANCE does not fire when open-thread scenes are spread across all zones', async () => {
      const recs637cn = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs637cn[1] = makeSharedRecord(1, { unresolvedClues: ['a'] });
      recs637cn[4] = makeSharedRecord(4, { unresolvedClues: ['b'] });
      recs637cn[7] = makeSharedRecord(7, { unresolvedClues: ['c'] });
      recs637cn[10] = makeSharedRecord(10, { unresolvedClues: ['d'] });
      const res = await runRA637(recs637cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_OPEN_THREAD_ZONE_IMBALANCE'), 'RELATIONAL_OPEN_THREAD_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 623 — relationshipArcPass: relational payoff staging decoupled, relational seed staging aftermath void, relational dialogue highlight zone imbalance', async () => {
    const runRA623 = async (records: ScreenplaySceneRecord[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RELATIONAL_PAYOFF_STAGING_DECOUPLED fire:
    // n=6; payoffs at 0,1 (no staging); staged at 4,5 (no payoff) → zero overlap → fires
    it('RELATIONAL_PAYOFF_STAGING_DECOUPLED fires when payoff scenes and visually-staged scenes never overlap', async () => {
      const recs623a = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs623a[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs623a[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs623a[4] = makeSharedRecord(4, { visualBeats: ['clasps her hand', 'looks away'] });
      recs623a[5] = makeSharedRecord(5, { visualBeats: ['clasps her hand', 'looks away'] });
      const res = await runRA623(recs623a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_PAYOFF_STAGING_DECOUPLED'), 'RELATIONAL_PAYOFF_STAGING_DECOUPLED should fire');
    });

    // RELATIONAL_PAYOFF_STAGING_DECOUPLED no-fire:
    // scene 0 carries BOTH a payoff and visual staging → overlap exists
    it('RELATIONAL_PAYOFF_STAGING_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs623an = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs623an[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'], visualBeats: ['clasps her hand', 'looks away'] });
      recs623an[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs623an[5] = makeSharedRecord(5, { visualBeats: ['clasps her hand', 'looks away'] });
      const res = await runRA623(recs623an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_PAYOFF_STAGING_DECOUPLED'), 'RELATIONAL_PAYOFF_STAGING_DECOUPLED should not fire');
    });

    // RELATIONAL_SEED_STAGING_AFTERMATH_VOID fire:
    // n=8, window=2; seed triggers at 0,1; their windows {1,2} and {2,3} carry no visually dense
    // scene; staged scenes exist elsewhere at 5,6,7 → fires
    it('RELATIONAL_SEED_STAGING_AFTERMATH_VOID fires when no seed is followed by a visually dense scene within 2 scenes', async () => {
      const recs623b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs623b[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs623b[1] = makeSharedRecord(1, { seededClueIds: ['clue-b'] });
      recs623b[5] = makeSharedRecord(5, { visualBeats: ['clasps her hand', 'looks away'] });
      recs623b[6] = makeSharedRecord(6, { visualBeats: ['clasps her hand', 'looks away'] });
      recs623b[7] = makeSharedRecord(7, { visualBeats: ['clasps her hand', 'looks away'] });
      const res = await runRA623(recs623b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_SEED_STAGING_AFTERMATH_VOID'), 'RELATIONAL_SEED_STAGING_AFTERMATH_VOID should fire');
    });

    // RELATIONAL_SEED_STAGING_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries staging → that trigger's aftermath
    // is no longer void
    it('RELATIONAL_SEED_STAGING_AFTERMATH_VOID does not fire when a trigger window contains a visually dense scene', async () => {
      const recs623bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs623bn[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs623bn[1] = makeSharedRecord(1, { seededClueIds: ['clue-b'] });
      recs623bn[3] = makeSharedRecord(3, { visualBeats: ['clasps her hand', 'looks away'] });
      recs623bn[5] = makeSharedRecord(5, { visualBeats: ['clasps her hand', 'looks away'] });
      recs623bn[6] = makeSharedRecord(6, { visualBeats: ['clasps her hand', 'looks away'] });
      recs623bn[7] = makeSharedRecord(7, { visualBeats: ['clasps her hand', 'looks away'] });
      const res = await runRA623(recs623bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_SEED_STAGING_AFTERMATH_VOID'), 'RELATIONAL_SEED_STAGING_AFTERMATH_VOID should not fire');
    });

    // RELATIONAL_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); highlights at 6,7,8,9; zone 2 (6-8)=3, zone 3 (9)=1, total=4;
    // zones 0,1 empty; bloatZoneIdx=zone2, 3/4=75% ≥ 50% → fires
    it('RELATIONAL_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE fires when one zone is empty of dialogue highlights while another is bloated', async () => {
      const recs623c = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs623c[6] = makeSharedRecord(6, { dialogueHighlights: ['line-a'] });
      recs623c[7] = makeSharedRecord(7, { dialogueHighlights: ['line-b'] });
      recs623c[8] = makeSharedRecord(8, { dialogueHighlights: ['line-c'] });
      recs623c[9] = makeSharedRecord(9, { dialogueHighlights: ['line-d'] });
      const res = await runRA623(recs623c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE'), 'RELATIONAL_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE should fire');
    });

    // RELATIONAL_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE no-fire:
    // one highlight per zone (1,4,7,10) → no zone is empty
    it('RELATIONAL_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE does not fire when highlights are spread across all zones', async () => {
      const recs623cn = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs623cn[1] = makeSharedRecord(1, { dialogueHighlights: ['line-a'] });
      recs623cn[4] = makeSharedRecord(4, { dialogueHighlights: ['line-b'] });
      recs623cn[7] = makeSharedRecord(7, { dialogueHighlights: ['line-c'] });
      recs623cn[10] = makeSharedRecord(10, { dialogueHighlights: ['line-d'] });
      const res = await runRA623(recs623cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE'), 'RELATIONAL_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 609 — relationshipArcPass: open thread relationship shift decoupled, physical presence zone imbalance, relationship shift dialogue highlight aftermath void', async () => {
    const runRA609 = async (records: ScreenplaySceneRecord[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // OPEN_THREAD_RELATIONSHIP_SHIFT_DECOUPLED fire:
    // n=8; open threads at 0,1 (no shift); shifts at 2,3 (no open thread) → zero overlap → fires
    it('OPEN_THREAD_RELATIONSHIP_SHIFT_DECOUPLED fires when open-thread scenes and shift scenes never overlap', async () => {
      const recs609a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs609a[0] = makeSharedRecord(0, { unresolvedClues: ['unpaid-clue'] });
      recs609a[1] = makeSharedRecord(1, { unresolvedClues: ['unpaid-clue'] });
      recs609a[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.5 }] });
      recs609a[3] = makeSharedRecord(3, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: -0.4 }] });
      const res = await runRA609(recs609a);
      assert.ok(res.issues.some((i: any) => i.rule === 'OPEN_THREAD_RELATIONSHIP_SHIFT_DECOUPLED'), 'OPEN_THREAD_RELATIONSHIP_SHIFT_DECOUPLED should fire');
    });

    // OPEN_THREAD_RELATIONSHIP_SHIFT_DECOUPLED no-fire:
    // scene 2 carries BOTH an open thread and a shift → overlap exists
    it('OPEN_THREAD_RELATIONSHIP_SHIFT_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs609an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs609an[0] = makeSharedRecord(0, { unresolvedClues: ['unpaid-clue'] });
      recs609an[1] = makeSharedRecord(1, { unresolvedClues: ['unpaid-clue'] });
      recs609an[2] = makeSharedRecord(2, { unresolvedClues: ['unpaid-clue'], relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.5 }] });
      recs609an[3] = makeSharedRecord(3, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: -0.4 }] });
      const res = await runRA609(recs609an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'OPEN_THREAD_RELATIONSHIP_SHIFT_DECOUPLED'), 'OPEN_THREAD_RELATIONSHIP_SHIFT_DECOUPLED should not fire');
    });

    // PHYSICAL_PRESENCE_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); visually dense scenes (visualBeats≥2) at 6,9,10,11;
    // zones 0 (0-2) and 1 (3-5) are empty; zone 3 (9-11) holds 3/4 = 75% ≥ 50% → fires
    it('PHYSICAL_PRESENCE_ZONE_IMBALANCE fires when one zone is empty of visually dense scenes while another is bloated', async () => {
      const recs609b = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs609b[6] = makeSharedRecord(6, { visualBeats: ['grips the letter', 'stares at the photo'] });
      recs609b[9] = makeSharedRecord(9, { visualBeats: ['grips the letter', 'stares at the photo'] });
      recs609b[10] = makeSharedRecord(10, { visualBeats: ['grips the letter', 'stares at the photo'] });
      recs609b[11] = makeSharedRecord(11, { visualBeats: ['grips the letter', 'stares at the photo'] });
      const res = await runRA609(recs609b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PHYSICAL_PRESENCE_ZONE_IMBALANCE'), 'PHYSICAL_PRESENCE_ZONE_IMBALANCE should fire');
    });

    // PHYSICAL_PRESENCE_ZONE_IMBALANCE no-fire:
    // one visually dense scene per zone (1,4,7,10) → no zone is empty
    it('PHYSICAL_PRESENCE_ZONE_IMBALANCE does not fire when every zone has a visually dense scene', async () => {
      const recs609bn = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs609bn[1] = makeSharedRecord(1, { visualBeats: ['grips the letter', 'stares at the photo'] });
      recs609bn[4] = makeSharedRecord(4, { visualBeats: ['grips the letter', 'stares at the photo'] });
      recs609bn[7] = makeSharedRecord(7, { visualBeats: ['grips the letter', 'stares at the photo'] });
      recs609bn[10] = makeSharedRecord(10, { visualBeats: ['grips the letter', 'stares at the photo'] });
      const res = await runRA609(recs609bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PHYSICAL_PRESENCE_ZONE_IMBALANCE'), 'PHYSICAL_PRESENCE_ZONE_IMBALANCE should not fire');
    });

    // RELATIONSHIP_SHIFT_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fire:
    // n=8, window=2; shift triggers (|amount|>=0.3) at 0,1; their windows {1,2} and {2,3} carry
    // no dialogue highlight; highlights exist elsewhere at 5,6,7 → fires
    it('RELATIONSHIP_SHIFT_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when no shift is followed by a dialogue highlight within 2 scenes', async () => {
      const recs609c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs609c[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.5 }] });
      recs609c[1] = makeSharedRecord(1, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: -0.4 }] });
      recs609c[5] = makeSharedRecord(5, { dialogueHighlights: ['line-a'] });
      recs609c[6] = makeSharedRecord(6, { dialogueHighlights: ['line-b'] });
      recs609c[7] = makeSharedRecord(7, { dialogueHighlights: ['line-c'] });
      const res = await runRA609(recs609c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SHIFT_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'RELATIONSHIP_SHIFT_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    // RELATIONSHIP_SHIFT_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries a highlight → that trigger's
    // aftermath is no longer void
    it('RELATIONSHIP_SHIFT_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a trigger window contains a dialogue highlight', async () => {
      const recs609cn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs609cn[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.5 }] });
      recs609cn[1] = makeSharedRecord(1, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: -0.4 }] });
      recs609cn[3] = makeSharedRecord(3, { dialogueHighlights: ['line-a'] });
      recs609cn[5] = makeSharedRecord(5, { dialogueHighlights: ['line-b'] });
      recs609cn[6] = makeSharedRecord(6, { dialogueHighlights: ['line-c'] });
      recs609cn[7] = makeSharedRecord(7, { dialogueHighlights: ['line-d'] });
      const res = await runRA609(recs609cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SHIFT_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'RELATIONSHIP_SHIFT_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });
  });


  describe('Wave 595 — relationshipArcPass: relationship shift purpose monotone, relationship shift zone imbalance, relationship shift stakes decoupled', async () => {
    const runRA595 = async (records: ScreenplaySceneRecord[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    it('RELATIONSHIP_SHIFT_PURPOSE_MONOTONE fires when >70% of shift scenes share the same purpose', async () => {
      // 8 scenes; meaningful shifts (|amount|>=0.3) at 0,1,2,4 — 3 of them 'complicate' = 75% > 70%
      const recs595a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs595a[0] = makeSharedRecord(0, { purpose: 'complicate', relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.5 }] });
      recs595a[1] = makeSharedRecord(1, { purpose: 'complicate', relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.4 }] });
      recs595a[2] = makeSharedRecord(2, { purpose: 'complicate', relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: -0.6 }] });
      recs595a[4] = makeSharedRecord(4, { purpose: 'raise_stakes', relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.3 }] });
      const res = await runRA595(recs595a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SHIFT_PURPOSE_MONOTONE'), 'RELATIONSHIP_SHIFT_PURPOSE_MONOTONE should fire');
    });

    it('RELATIONSHIP_SHIFT_PURPOSE_MONOTONE does not fire when shift scenes are spread across purposes', async () => {
      const recs595a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs595a[0] = makeSharedRecord(0, { purpose: 'complicate', relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.5 }] });
      recs595a[1] = makeSharedRecord(1, { purpose: 'raise_stakes', relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.4 }] });
      recs595a[2] = makeSharedRecord(2, { purpose: 'establish_world', relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: -0.6 }] });
      recs595a[4] = makeSharedRecord(4, { purpose: 'character_moment', relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.3 }] });
      const res = await runRA595(recs595a);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SHIFT_PURPOSE_MONOTONE'), 'RELATIONSHIP_SHIFT_PURPOSE_MONOTONE should not fire');
    });

    it('RELATIONSHIP_SHIFT_ZONE_IMBALANCE fires when one zone has zero shifts and another has ≥50%', async () => {
      // 12 scenes, 4 zones of 3: meaningful shifts at 6,7,8 (zone 2) plus one at 9 (zone 3) to meet minCount=4
      const recs595b = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs595b[6] = makeSharedRecord(6, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.5 }] });
      recs595b[7] = makeSharedRecord(7, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.4 }] });
      recs595b[8] = makeSharedRecord(8, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: -0.6 }] });
      recs595b[9] = makeSharedRecord(9, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.3 }] });
      const res = await runRA595(recs595b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SHIFT_ZONE_IMBALANCE'), 'RELATIONSHIP_SHIFT_ZONE_IMBALANCE should fire');
    });

    it('RELATIONSHIP_SHIFT_ZONE_IMBALANCE does not fire when shifts are spread across all zones', async () => {
      const recs595b = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs595b[1] = makeSharedRecord(1, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.5 }] });
      recs595b[4] = makeSharedRecord(4, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.4 }] });
      recs595b[7] = makeSharedRecord(7, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: -0.6 }] });
      recs595b[10] = makeSharedRecord(10, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.3 }] });
      const res = await runRA595(recs595b);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SHIFT_ZONE_IMBALANCE'), 'RELATIONSHIP_SHIFT_ZONE_IMBALANCE should not fire');
    });

    it('RELATIONSHIP_SHIFT_STAKES_DECOUPLED fires when no relationship shift coincides with a stakes-raise scene', async () => {
      // 8 scenes; shifts at 0,2,4 (purpose 'complicate'); stakes-raises at 5,6 (no shift there)
      const recs595c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs595c[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.5 }] });
      recs595c[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.4 }] });
      recs595c[4] = makeSharedRecord(4, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: -0.6 }] });
      recs595c[5] = makeSharedRecord(5, { purpose: 'raise_stakes' });
      recs595c[6] = makeSharedRecord(6, { purpose: 'raise_stakes' });
      const res = await runRA595(recs595c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SHIFT_STAKES_DECOUPLED'), 'RELATIONSHIP_SHIFT_STAKES_DECOUPLED should fire');
    });

    it('RELATIONSHIP_SHIFT_STAKES_DECOUPLED does not fire when a relationship shift coincides with a stakes-raise scene', async () => {
      const recs595c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs595c[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.5 }] });
      recs595c[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.4 }] });
      recs595c[4] = makeSharedRecord(4, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: -0.6 }] });
      recs595c[5] = makeSharedRecord(5, {
        purpose: 'raise_stakes',
        relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.7 }],
      });
      recs595c[6] = makeSharedRecord(6, { purpose: 'raise_stakes' });
      const res = await runRA595(recs595c);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SHIFT_STAKES_DECOUPLED'), 'RELATIONSHIP_SHIFT_STAKES_DECOUPLED should not fire');
    });
  });

  describe('Wave 581 — relationshipArcPass: relationship peak uncaused, pair amplitude decay, relationship clock valence uniform', async () => {
    const mkSh581 = (amount: number, pair = 'A|B') => [{ pairKey: pair, dimension: 'trust', amount }];
    const makeRec581 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runRA581 = async (records: any[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // RELATIONSHIP_PEAK_UNCAUSED fire: n=8; peak shift at idx 3 (|0.8|); idx 1,2,3 have no
    // revelation/turn/suspense → hasCause=false → fires
    it('RELATIONSHIP_PEAK_UNCAUSED fires when the peak shift has no causal event in prior 2 scenes', async () => {
      const recs581a = Array.from({ length: 8 }, (_, i) =>
        makeRec581(i, {
          relationshipShifts: i === 0 ? mkSh581(0.3) : i === 3 ? mkSh581(0.8) : [],
        }),
      );
      const res = await runRA581(recs581a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_PEAK_UNCAUSED'), 'RELATIONSHIP_PEAK_UNCAUSED should fire');
    });

    // RELATIONSHIP_PEAK_UNCAUSED no-fire: idx 2 has suspenseDelta=2 (prior scene has cause) → no fire
    it('RELATIONSHIP_PEAK_UNCAUSED does not fire when a prior scene provides a causal event for the peak', async () => {
      const recs581anr = Array.from({ length: 8 }, (_, i) =>
        makeRec581(i, {
          relationshipShifts: i === 0 ? mkSh581(0.3) : i === 3 ? mkSh581(0.8) : [],
          suspenseDelta: i === 2 ? 2 : 0,
        }),
      );
      const res = await runRA581(recs581anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_PEAK_UNCAUSED'), 'RELATIONSHIP_PEAK_UNCAUSED should not fire');
    });

    // PAIR_AMPLITUDE_DECAY fire: pair A|B has 4 shifts at idx 1,2,5,6 with mag 0.8,0.7,0.1,0.1;
    // earlyMean=0.75, lateMean=0.1 < 0.5*0.75=0.375 → fires
    it('PAIR_AMPLITUDE_DECAY fires when a pair\'s late-half mean magnitude is <50% of its early-half mean', async () => {
      const recs581b = Array.from({ length: 8 }, (_, i) =>
        makeRec581(i, {
          relationshipShifts:
            i === 1 ? mkSh581(0.8) :
            i === 2 ? mkSh581(0.7) :
            i === 5 ? mkSh581(0.1) :
            i === 6 ? mkSh581(0.1) : [],
        }),
      );
      const res = await runRA581(recs581b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAIR_AMPLITUDE_DECAY'), 'PAIR_AMPLITUDE_DECAY should fire');
    });

    // PAIR_AMPLITUDE_DECAY no-fire: late-half mean (0.3) is NOT < 0.5*early-half mean (0.2) → no fire
    it('PAIR_AMPLITUDE_DECAY does not fire when the amplitude decline is within the 50% threshold', async () => {
      const recs581bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec581(i, {
          relationshipShifts:
            i === 1 ? mkSh581(0.4) :
            i === 2 ? mkSh581(0.4) :
            i === 5 ? mkSh581(0.3) :
            i === 6 ? mkSh581(0.3) : [],
        }),
      );
      const res = await runRA581(recs581bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAIR_AMPLITUDE_DECAY'), 'PAIR_AMPLITUDE_DECAY should not fire');
    });

    // RELATIONSHIP_CLOCK_VALENCE_UNIFORM fire: n=8; 3 clock+shift scenes all with positive shifts → fires
    it('RELATIONSHIP_CLOCK_VALENCE_UNIFORM fires when all clock-raised shift scenes move bonds in one direction', async () => {
      const recs581c = Array.from({ length: 8 }, (_, i) =>
        makeRec581(i, {
          clockRaised: [1, 3, 5].includes(i),
          relationshipShifts: [1, 3, 5].includes(i) ? mkSh581(0.5) : [],
        }),
      );
      const res = await runRA581(recs581c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_CLOCK_VALENCE_UNIFORM'), 'RELATIONSHIP_CLOCK_VALENCE_UNIFORM should fire');
    });

    // RELATIONSHIP_CLOCK_VALENCE_UNIFORM no-fire: idx 5 has negative shift → mixed valence → no fire
    it('RELATIONSHIP_CLOCK_VALENCE_UNIFORM does not fire when clock-raised shift scenes have mixed valences', async () => {
      const recs581cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec581(i, {
          clockRaised: [1, 3, 5].includes(i),
          relationshipShifts: [1, 3].includes(i) ? mkSh581(0.5) : i === 5 ? mkSh581(-0.4) : [],
        }),
      );
      const res = await runRA581(recs581cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_CLOCK_VALENCE_UNIFORM'), 'RELATIONSHIP_CLOCK_VALENCE_UNIFORM should not fire');
    });
  });


  describe('Wave 567 — relationshipArcPass: peak revelation absent, peak dramatic-turn absent, peak clock absent', async () => {
    const mkShift567 = (amount: number) => [{ pairKey: 'A|B', dimension: 'trust', amount }];
    const makeRec567 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runRA567 = async (records: any[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    // RELATIONSHIP_PEAK_REVELATION_ABSENT fire:
    // n=8; peak shift at scene 2 (|0.9|, no revelation); scenes 4,6 carry shift + revelation → fires
    it('RELATIONSHIP_PEAK_REVELATION_ABSENT fires when the largest shift carries no revelation while others do', async () => {
      const recs567a = Array.from({ length: 8 }, (_, i) =>
        makeRec567(i, {
          relationshipShifts: i === 2 ? mkShift567(0.9) : [4, 6].includes(i) ? mkShift567(0.4) : [],
          revelation: [4, 6].includes(i) ? 'truth surfaced' : null,
        }),
      );
      const res = await runRA567(recs567a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_PEAK_REVELATION_ABSENT'), 'RELATIONSHIP_PEAK_REVELATION_ABSENT should fire');
    });

    // RELATIONSHIP_PEAK_REVELATION_ABSENT no-fire:
    // peak shift scene 2 DOES carry a revelation → no fire
    it('RELATIONSHIP_PEAK_REVELATION_ABSENT does not fire when the peak shift coincides with a revelation', async () => {
      const recs567an = Array.from({ length: 8 }, (_, i) =>
        makeRec567(i, {
          relationshipShifts: i === 2 ? mkShift567(0.9) : [4, 6].includes(i) ? mkShift567(0.4) : [],
          revelation: [2, 4, 6].includes(i) ? 'truth surfaced' : null,
        }),
      );
      const res = await runRA567(recs567an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_PEAK_REVELATION_ABSENT'), 'RELATIONSHIP_PEAK_REVELATION_ABSENT should not fire');
    });

    // RELATIONSHIP_PEAK_DRAMATIC_TURN_ABSENT fire:
    // n=8; peak shift scene 2 (no turn); scenes 4,6 carry shift + dramaticTurn → fires
    it('RELATIONSHIP_PEAK_DRAMATIC_TURN_ABSENT fires when the largest shift carries no dramatic turn while others do', async () => {
      const recs567b = Array.from({ length: 8 }, (_, i) =>
        makeRec567(i, {
          relationshipShifts: i === 2 ? mkShift567(0.9) : [4, 6].includes(i) ? mkShift567(0.4) : [],
          dramaticTurn: [4, 6].includes(i) ? 'reversal' : 'nothing',
        }),
      );
      const res = await runRA567(recs567b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_PEAK_DRAMATIC_TURN_ABSENT'), 'RELATIONSHIP_PEAK_DRAMATIC_TURN_ABSENT should fire');
    });

    // RELATIONSHIP_PEAK_DRAMATIC_TURN_ABSENT no-fire:
    // peak shift scene 2 DOES carry a dramatic turn → no fire
    it('RELATIONSHIP_PEAK_DRAMATIC_TURN_ABSENT does not fire when the peak shift coincides with a dramatic turn', async () => {
      const recs567bn = Array.from({ length: 8 }, (_, i) =>
        makeRec567(i, {
          relationshipShifts: i === 2 ? mkShift567(0.9) : [4, 6].includes(i) ? mkShift567(0.4) : [],
          dramaticTurn: [2, 4, 6].includes(i) ? 'reversal' : 'nothing',
        }),
      );
      const res = await runRA567(recs567bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_PEAK_DRAMATIC_TURN_ABSENT'), 'RELATIONSHIP_PEAK_DRAMATIC_TURN_ABSENT should not fire');
    });

    // RELATIONSHIP_PEAK_CLOCK_ABSENT fire:
    // n=8; peak shift scene 2 (no clock); scenes 4,6 carry shift + clockRaised → fires
    it('RELATIONSHIP_PEAK_CLOCK_ABSENT fires when the largest shift raises no clock while others do', async () => {
      const recs567c = Array.from({ length: 8 }, (_, i) =>
        makeRec567(i, {
          relationshipShifts: i === 2 ? mkShift567(0.9) : [4, 6].includes(i) ? mkShift567(0.4) : [],
          clockRaised: [4, 6].includes(i),
        }),
      );
      const res = await runRA567(recs567c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_PEAK_CLOCK_ABSENT'), 'RELATIONSHIP_PEAK_CLOCK_ABSENT should fire');
    });

    // RELATIONSHIP_PEAK_CLOCK_ABSENT no-fire:
    // peak shift scene 2 DOES raise a clock → no fire
    it('RELATIONSHIP_PEAK_CLOCK_ABSENT does not fire when the peak shift raises a clock', async () => {
      const recs567cn = Array.from({ length: 8 }, (_, i) =>
        makeRec567(i, {
          relationshipShifts: i === 2 ? mkShift567(0.9) : [4, 6].includes(i) ? mkShift567(0.4) : [],
          clockRaised: [2, 4, 6].includes(i),
        }),
      );
      const res = await runRA567(recs567cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_PEAK_CLOCK_ABSENT'), 'RELATIONSHIP_PEAK_CLOCK_ABSENT should not fire');
    });
  });


  describe('Wave 525 — relationshipArcPass: shift seed aftermath void, shift payoff aftermath void, seed decoupled', async () => {
    const mkShift525 = (amount: number) => [{ pairKey: 'A|B', dimension: 'trust', amount }];
    const makeRec525 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runRA525 = async (records: any[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({
        fountain: '', original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 1, actBreaks: [] } as any,
        annotations: [], approvedSpans: [],
      });
    };

    it('RELATIONSHIP_SHIFT_SEED_AFTERMATH_VOID fires when all shifts have no seed in their aftermath', async () => {
      // 10 scenes: shifts at 0,2,4 (not last 2); seeds at 7,9 — no seed in aftermath windows 1-2, 3-4, 5-6
      const recs525a = Array.from({ length: 10 }, (_, i) =>
        makeRec525(i, {
          relationshipShifts: [0, 2, 4].includes(i) ? mkShift525(0.4) : [],
          seededClueIds: [7, 9].includes(i) ? ['c1'] : [],
        }),
      );
      const res = await runRA525(recs525a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SHIFT_SEED_AFTERMATH_VOID'), 'RELATIONSHIP_SHIFT_SEED_AFTERMATH_VOID should fire');
    });

    it('RELATIONSHIP_SHIFT_SEED_AFTERMATH_VOID does not fire when a shift is followed by a seed', async () => {
      // 10 scenes: shifts at 0,2,4; seed at 1 (directly after shift 0) — in aftermath
      const recs525an = Array.from({ length: 10 }, (_, i) =>
        makeRec525(i, {
          relationshipShifts: [0, 2, 4].includes(i) ? mkShift525(0.4) : [],
          seededClueIds: [1, 9].includes(i) ? ['c1'] : [],
        }),
      );
      const res = await runRA525(recs525an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SHIFT_SEED_AFTERMATH_VOID'), 'RELATIONSHIP_SHIFT_SEED_AFTERMATH_VOID should not fire');
    });

    it('RELATIONSHIP_SHIFT_PAYOFF_AFTERMATH_VOID fires when all shifts have no payoff in their aftermath', async () => {
      // 10 scenes: shifts at 0,2,4; payoffs at 7,9 — no payoff in aftermath windows 1-2, 3-4, 5-6
      const recs525b = Array.from({ length: 10 }, (_, i) =>
        makeRec525(i, {
          relationshipShifts: [0, 2, 4].includes(i) ? mkShift525(0.4) : [],
          payoffSetupIds: [7, 9].includes(i) ? ['s1'] : [],
        }),
      );
      const res = await runRA525(recs525b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SHIFT_PAYOFF_AFTERMATH_VOID'), 'RELATIONSHIP_SHIFT_PAYOFF_AFTERMATH_VOID should fire');
    });

    it('RELATIONSHIP_SHIFT_PAYOFF_AFTERMATH_VOID does not fire when a shift is followed by a payoff', async () => {
      // 10 scenes: shifts at 0,2,4; payoff at 3 (after shift 2) — in aftermath window
      const recs525bn = Array.from({ length: 10 }, (_, i) =>
        makeRec525(i, {
          relationshipShifts: [0, 2, 4].includes(i) ? mkShift525(0.4) : [],
          payoffSetupIds: [3, 9].includes(i) ? ['s1'] : [],
        }),
      );
      const res = await runRA525(recs525bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SHIFT_PAYOFF_AFTERMATH_VOID'), 'RELATIONSHIP_SHIFT_PAYOFF_AFTERMATH_VOID should not fire');
    });

    it('RELATIONSHIP_SEED_DECOUPLED fires when shift scenes and seed scenes never overlap', async () => {
      // 10 scenes: shifts at 0,1,2; seeds at 5,6,7 — no overlap
      const recs525c = Array.from({ length: 10 }, (_, i) =>
        makeRec525(i, {
          relationshipShifts: [0, 1, 2].includes(i) ? mkShift525(0.4) : [],
          seededClueIds: [5, 6, 7].includes(i) ? ['c1'] : [],
        }),
      );
      const res = await runRA525(recs525c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SEED_DECOUPLED'), 'RELATIONSHIP_SEED_DECOUPLED should fire');
    });

    it('RELATIONSHIP_SEED_DECOUPLED does not fire when at least one scene has both shift and seed', async () => {
      // 10 scenes: shift AND seed at scene 1; shifts at 2,3; seeds at 5,6
      const recs525cn = Array.from({ length: 10 }, (_, i) =>
        makeRec525(i, {
          relationshipShifts: [1, 2, 3].includes(i) ? mkShift525(0.4) : [],
          seededClueIds: [1, 5, 6].includes(i) ? ['c1'] : [],
        }),
      );
      const res = await runRA525(recs525cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SEED_DECOUPLED'), 'RELATIONSHIP_SEED_DECOUPLED should not fire');
    });
  });


  describe('Wave 511 — relationshipArcPass: shift dramatic turn aftermath void, rupture thirds cluster, relationship payoff decoupled', async () => {
    const mkShift511 = (amount: number) => [{ pairKey: 'A|B', dimension: 'trust', amount }];
    const makeRec511 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const runRA511 = async (records: any[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // RELATIONSHIP_SHIFT_DRAMATIC_TURN_AFTERMATH_VOID fire:
    // n=10; shifts at 1,3; turns at 7,9 (not within 2 of any shift)
    it('RELATIONSHIP_SHIFT_DRAMATIC_TURN_AFTERMATH_VOID fires when no shift is followed by a turn within 2 scenes', async () => {
      const recs511a: any[] = Array.from({ length: 10 }, (_, i) => makeRec511(i, {
        relationshipShifts: [1, 3].includes(i) ? mkShift511(-0.5) : [],
        dramaticTurn: [7, 9].includes(i) ? 'reversal' : 'nothing',
      }));
      const res = await runRA511(recs511a);
      assert.ok(res.issues.some((x: any) => x.rule === 'RELATIONSHIP_SHIFT_DRAMATIC_TURN_AFTERMATH_VOID'), 'RELATIONSHIP_SHIFT_DRAMATIC_TURN_AFTERMATH_VOID should fire');
    });

    // RELATIONSHIP_SHIFT_DRAMATIC_TURN_AFTERMATH_VOID no-fire:
    // turn at scene 4 (within 2 of shift at 3) → anyTurnAfterShift=true → no fire
    it('RELATIONSHIP_SHIFT_DRAMATIC_TURN_AFTERMATH_VOID does not fire when at least one shift is followed by a turn', async () => {
      const recs511an: any[] = Array.from({ length: 10 }, (_, i) => makeRec511(i, {
        relationshipShifts: [1, 3].includes(i) ? mkShift511(-0.5) : [],
        dramaticTurn: [4, 7].includes(i) ? 'reversal' : 'nothing',
      }));
      const res = await runRA511(recs511an);
      assert.ok(!res.issues.some((x: any) => x.rule === 'RELATIONSHIP_SHIFT_DRAMATIC_TURN_AFTERMATH_VOID'), 'RELATIONSHIP_SHIFT_DRAMATIC_TURN_AFTERMATH_VOID should not fire');
    });

    // RUPTURE_THIRDS_CLUSTER fire:
    // n=12; third=4; ruptures (≤-0.3) at 0,1,2,3 all in zone1 → 4/4=100% > 75%
    it('RUPTURE_THIRDS_CLUSTER fires when >75% of rupture scenes cluster in one structural third', async () => {
      const recs511b: any[] = Array.from({ length: 12 }, (_, i) => makeRec511(i, {
        relationshipShifts: [0, 1, 2, 3].includes(i) ? mkShift511(-0.5) : [],
      }));
      const res = await runRA511(recs511b);
      assert.ok(res.issues.some((x: any) => x.rule === 'RUPTURE_THIRDS_CLUSTER'), 'RUPTURE_THIRDS_CLUSTER should fire');
    });

    // RUPTURE_THIRDS_CLUSTER no-fire:
    // n=12; third=4; ruptures at 0,4,8,11 → zone1=1,zone2=1,zone3=2 → max=2/4=50% → no fire
    it('RUPTURE_THIRDS_CLUSTER does not fire when ruptures are distributed across thirds', async () => {
      const recs511bn: any[] = Array.from({ length: 12 }, (_, i) => makeRec511(i, {
        relationshipShifts: [0, 4, 8, 11].includes(i) ? mkShift511(-0.5) : [],
      }));
      const res = await runRA511(recs511bn);
      assert.ok(!res.issues.some((x: any) => x.rule === 'RUPTURE_THIRDS_CLUSTER'), 'RUPTURE_THIRDS_CLUSTER should not fire');
    });

    // RELATIONSHIP_PAYOFF_DECOUPLED fire:
    // n=8; shifts at 0,1,2 (no payoffs); payoffs at 5,6,7 (no shifts) → no overlap → fires
    it('RELATIONSHIP_PAYOFF_DECOUPLED fires when shift scenes and payoff scenes never coincide', async () => {
      const recs511c: any[] = Array.from({ length: 8 }, (_, i) => makeRec511(i, {
        relationshipShifts: [0, 1, 2].includes(i) ? mkShift511(-0.4) : [],
        payoffSetupIds: [5, 6, 7].includes(i) ? ['P1'] : [],
      }));
      const res = await runRA511(recs511c);
      assert.ok(res.issues.some((x: any) => x.rule === 'RELATIONSHIP_PAYOFF_DECOUPLED'), 'RELATIONSHIP_PAYOFF_DECOUPLED should fire');
    });

    // RELATIONSHIP_PAYOFF_DECOUPLED no-fire:
    // scene 2 has both shift and payoff → overlap → no fire
    it('RELATIONSHIP_PAYOFF_DECOUPLED does not fire when at least one scene has both a shift and a payoff', async () => {
      const recs511cn: any[] = Array.from({ length: 8 }, (_, i) => makeRec511(i, {
        relationshipShifts: [0, 1, 2].includes(i) ? mkShift511(-0.4) : [],
        payoffSetupIds: [2, 5, 6].includes(i) ? ['P1'] : [],
      }));
      const res = await runRA511(recs511cn);
      assert.ok(!res.issues.some((x: any) => x.rule === 'RELATIONSHIP_PAYOFF_DECOUPLED'), 'RELATIONSHIP_PAYOFF_DECOUPLED should not fire');
    });
  });


  describe('Wave 497 — relationshipArcPass: shift clock aftermath void, warmth cluster, dimension run', async () => {
    const mkShift497 = (dim: string, amount: number) => [{ pairKey: 'A|B', dimension: dim, amount }];
    const makeRec497 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const runRA497 = async (records: any[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // RELATIONSHIP_SHIFT_CLOCK_AFTERMATH_VOID fire:
    // n=10; shifts at 1,3; clocks at 8,9 (not within 2 of shifts)
    it('RELATIONSHIP_SHIFT_CLOCK_AFTERMATH_VOID fires when no shift is followed by a clock raise within 2 scenes', async () => {
      const recs497a: any[] = Array.from({ length: 10 }, (_, i) => makeRec497(i, {
        relationshipShifts: [1, 3].includes(i) ? mkShift497('trust', -0.5) : [],
        clockRaised: [8, 9].includes(i),
      }));
      const res = await runRA497(recs497a);
      assert.ok(res.issues.some((x: any) => x.rule === 'RELATIONSHIP_SHIFT_CLOCK_AFTERMATH_VOID'), 'RELATIONSHIP_SHIFT_CLOCK_AFTERMATH_VOID should fire');
    });

    // RELATIONSHIP_SHIFT_CLOCK_AFTERMATH_VOID no-fire: clock at scene 4 follows shift at scene 3
    it('RELATIONSHIP_SHIFT_CLOCK_AFTERMATH_VOID does not fire when at least one shift is followed by a clock raise', async () => {
      const recs497an: any[] = Array.from({ length: 10 }, (_, i) => makeRec497(i, {
        relationshipShifts: [1, 3].includes(i) ? mkShift497('trust', -0.5) : [],
        clockRaised: [4, 8].includes(i),
      }));
      const res = await runRA497(recs497an);
      assert.ok(!res.issues.some((x: any) => x.rule === 'RELATIONSHIP_SHIFT_CLOCK_AFTERMATH_VOID'), 'RELATIONSHIP_SHIFT_CLOCK_AFTERMATH_VOID should not fire');
    });

    // RELATIONSHIP_WARMTH_CLUSTER fire:
    // n=12; third=4; positive shifts at 0,1,2,3 all in zone1 → 4/4=100% > 75%
    it('RELATIONSHIP_WARMTH_CLUSTER fires when >75% of positive shifts are in one structural third', async () => {
      const recs497b: any[] = Array.from({ length: 12 }, (_, i) => makeRec497(i, {
        relationshipShifts: [0, 1, 2, 3].includes(i) ? mkShift497('trust', 0.5) : [],
      }));
      const res = await runRA497(recs497b);
      assert.ok(res.issues.some((x: any) => x.rule === 'RELATIONSHIP_WARMTH_CLUSTER'), 'RELATIONSHIP_WARMTH_CLUSTER should fire');
    });

    // RELATIONSHIP_WARMTH_CLUSTER no-fire: 4 positive shifts spread across thirds
    it('RELATIONSHIP_WARMTH_CLUSTER does not fire when positive shifts are distributed across thirds', async () => {
      // n=12; third=4; positive shifts at 1,5,9,11 → zone1=1,zone2=2,zone3=1; max=2/4=50% → no fire
      const recs497bn: any[] = Array.from({ length: 12 }, (_, i) => makeRec497(i, {
        relationshipShifts: [1, 5, 9, 11].includes(i) ? mkShift497('trust', 0.5) : [],
      }));
      const res = await runRA497(recs497bn);
      assert.ok(!res.issues.some((x: any) => x.rule === 'RELATIONSHIP_WARMTH_CLUSTER'), 'RELATIONSHIP_WARMTH_CLUSTER should not fire');
    });

    // RELATIONSHIP_DIMENSION_RUN fire:
    // n=10; shifts at scenes 0,2,4,6,8 (all single-dimension "trust") while scene 1 has "respect"
    // → globalDims={'trust','respect'} (≥2), consecutive trust shift scenes: 0,2,4,6,8 → run of 5
    it('RELATIONSHIP_DIMENSION_RUN fires when 4+ consecutive shift scenes all use one dimension', async () => {
      const recs497c: any[] = Array.from({ length: 10 }, (_, i) => makeRec497(i, {
        relationshipShifts: i === 1
          ? [{ pairKey: 'A|C', dimension: 'respect', amount: 0.3 }]
          : [0, 2, 4, 6, 8].includes(i) ? mkShift497('trust', -0.4) : [],
      }));
      const res = await runRA497(recs497c);
      assert.ok(res.issues.some((x: any) => x.rule === 'RELATIONSHIP_DIMENSION_RUN'), 'RELATIONSHIP_DIMENSION_RUN should fire');
    });

    // RELATIONSHIP_DIMENSION_RUN no-fire: run is only 3 consecutive trust-only shift scenes
    it('RELATIONSHIP_DIMENSION_RUN does not fire when no run of 4 consecutive single-dimension shift scenes exists', async () => {
      // shift scenes: 0(trust), 1(trust+respect breaks run), 2(trust), 3(trust), 4(trust) → max run=3
      const recs497cn: any[] = Array.from({ length: 10 }, (_, i) => makeRec497(i, {
        relationshipShifts: i === 1
          ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.3 }, { pairKey: 'A|C', dimension: 'respect', amount: 0.2 }]
          : [0, 2, 3, 4].includes(i) ? mkShift497('trust', -0.4) : [],
      }));
      const res = await runRA497(recs497cn);
      assert.ok(!res.issues.some((x: any) => x.rule === 'RELATIONSHIP_DIMENSION_RUN'), 'RELATIONSHIP_DIMENSION_RUN should not fire');
    });
  });


  describe('Wave 483 — relationshipArcPass: shift revelation aftermath void, shift thirds cluster, Act 2a void', async () => {
    const mkShift483 = (pairKey: string, amount: number) => [{ pairKey, dimension: 'trust', amount }];
    const makeRec483 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const makeFountain483 = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        `INT. SC${i} - DAY\n\nAction line for scene ${i}.`
      ).join('\n\n');
    const runR483 = async (records: any[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const fountain = makeFountain483(records.length);
      return relationshipArcPass({ fountain, original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('RELATIONSHIP_SHIFT_REVELATION_AFTERMATH_VOID fires when no shift is followed by a revelation within 2 scenes', async () => {
      // n=10; shifts at 2 and 6; aftermath 3-4 and 7-8 all have revelation=null → fires
      const recs483a = Array.from({ length: 10 }, (_, i) => makeRec483(i));
      recs483a[2] = makeRec483(2, { relationshipShifts: mkShift483('A|B', 0.4) });
      recs483a[6] = makeRec483(6, { relationshipShifts: mkShift483('A|B', -0.4) });
      const res = await runR483(recs483a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SHIFT_REVELATION_AFTERMATH_VOID'), 'RELATIONSHIP_SHIFT_REVELATION_AFTERMATH_VOID should fire');
    });

    it('RELATIONSHIP_SHIFT_REVELATION_AFTERMATH_VOID does not fire when a shift is followed by a revelation within 2 scenes', async () => {
      // n=10; shift at 2; scene 3 has revelation → no fire
      const recs483anr = Array.from({ length: 10 }, (_, i) => makeRec483(i));
      recs483anr[2] = makeRec483(2, { relationshipShifts: mkShift483('A|B', 0.4) });
      recs483anr[3] = makeRec483(3, { revelation: 'the truth' });
      recs483anr[6] = makeRec483(6, { relationshipShifts: mkShift483('A|B', -0.4) });
      const res = await runR483(recs483anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SHIFT_REVELATION_AFTERMATH_VOID'), 'RELATIONSHIP_SHIFT_REVELATION_AFTERMATH_VOID should not fire');
    });

    it('RELATIONSHIP_SHIFT_THIRDS_CLUSTER fires when >75% of shifts are in one structural third', async () => {
      // n=12 (third=4); 4 shifts at scenes 0,1,2,3 (all in first third=100%) → fires
      const recs483b = Array.from({ length: 12 }, (_, i) => makeRec483(i));
      recs483b[0] = makeRec483(0, { relationshipShifts: mkShift483('A|B', 0.3) });
      recs483b[1] = makeRec483(1, { relationshipShifts: mkShift483('A|B', -0.3) });
      recs483b[2] = makeRec483(2, { relationshipShifts: mkShift483('C|D', 0.4) });
      recs483b[3] = makeRec483(3, { relationshipShifts: mkShift483('C|D', -0.4) });
      const res = await runR483(recs483b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SHIFT_THIRDS_CLUSTER'), 'RELATIONSHIP_SHIFT_THIRDS_CLUSTER should fire');
    });

    it('RELATIONSHIP_SHIFT_THIRDS_CLUSTER does not fire when shifts are distributed across thirds', async () => {
      // n=12 (third=4); 4 shifts at scenes 1,5,8,11 — one in each third → no fire
      const recs483bnr = Array.from({ length: 12 }, (_, i) => makeRec483(i));
      recs483bnr[1] = makeRec483(1, { relationshipShifts: mkShift483('A|B', 0.3) });
      recs483bnr[5] = makeRec483(5, { relationshipShifts: mkShift483('A|B', -0.3) });
      recs483bnr[8] = makeRec483(8, { relationshipShifts: mkShift483('C|D', 0.4) });
      recs483bnr[11] = makeRec483(11, { relationshipShifts: mkShift483('C|D', -0.4) });
      const res = await runR483(recs483bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SHIFT_THIRDS_CLUSTER'), 'RELATIONSHIP_SHIFT_THIRDS_CLUSTER should not fire');
    });

    it('RELATIONSHIP_ACT2A_VOID fires when no shift falls in the 25%-50% zone but 3+ exist elsewhere', async () => {
      // n=12 (act2a=3-6); 4 shifts at scenes 0,1,8,10 — none in scenes 3-6 → fires
      const recs483c = Array.from({ length: 12 }, (_, i) => makeRec483(i));
      recs483c[0] = makeRec483(0, { relationshipShifts: mkShift483('A|B', 0.3) });
      recs483c[1] = makeRec483(1, { relationshipShifts: mkShift483('A|B', -0.3) });
      recs483c[8] = makeRec483(8, { relationshipShifts: mkShift483('C|D', 0.4) });
      recs483c[10] = makeRec483(10, { relationshipShifts: mkShift483('C|D', -0.4) });
      const res = await runR483(recs483c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_ACT2A_VOID'), 'RELATIONSHIP_ACT2A_VOID should fire');
    });

    it('RELATIONSHIP_ACT2A_VOID does not fire when a shift falls in the 25%-50% zone', async () => {
      // n=12 (act2a=3-6); shift at scene 4 (in Act 2a) → no fire
      const recs483cnr = Array.from({ length: 12 }, (_, i) => makeRec483(i));
      recs483cnr[0] = makeRec483(0, { relationshipShifts: mkShift483('A|B', 0.3) });
      recs483cnr[4] = makeRec483(4, { relationshipShifts: mkShift483('A|B', -0.3) });
      recs483cnr[8] = makeRec483(8, { relationshipShifts: mkShift483('C|D', 0.4) });
      recs483cnr[10] = makeRec483(10, { relationshipShifts: mkShift483('C|D', -0.4) });
      const res = await runR483(recs483cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_ACT2A_VOID'), 'RELATIONSHIP_ACT2A_VOID should not fire');
    });
  });


  describe('Wave 469 — relationshipArcPass: shift suspense aftermath void, shift emotional aftermath void, Act 1 void', async () => {
    const mkShift469 = (pairKey: string, amount: number) => [{ pairKey, dimension: 'trust', amount }];
    const makeRec469 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const makeFountain469 = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        `INT. SC${i} - DAY\n\nAction line for scene ${i}.`
      ).join('\n\n');
    const runR469 = async (records: any[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const fountain = makeFountain469(records.length);
      return relationshipArcPass({ fountain, original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('RELATIONSHIP_SHIFT_SUSPENSE_AFTERMATH_VOID fires when no shift is followed by suspense within 2 scenes', async () => {
      // n=10; shifts at scenes 2 and 6; aftermath 3-4 and 7-8 all have suspenseDelta=0 → fires
      const recs469a = Array.from({ length: 10 }, (_, i) => makeRec469(i));
      recs469a[2] = makeRec469(2, { relationshipShifts: mkShift469('A|B', 0.4) });
      recs469a[6] = makeRec469(6, { relationshipShifts: mkShift469('A|B', -0.4) });
      const res = await runR469(recs469a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SHIFT_SUSPENSE_AFTERMATH_VOID'), 'RELATIONSHIP_SHIFT_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('RELATIONSHIP_SHIFT_SUSPENSE_AFTERMATH_VOID does not fire when a shift is followed by suspense', async () => {
      // n=10; shift at 2; scene 3 has suspenseDelta=2 → no fire
      const recs469anr = Array.from({ length: 10 }, (_, i) => makeRec469(i));
      recs469anr[2] = makeRec469(2, { relationshipShifts: mkShift469('A|B', 0.4) });
      recs469anr[3] = makeRec469(3, { suspenseDelta: 2 });
      recs469anr[6] = makeRec469(6, { relationshipShifts: mkShift469('A|B', -0.4) });
      const res = await runR469(recs469anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SHIFT_SUSPENSE_AFTERMATH_VOID'), 'RELATIONSHIP_SHIFT_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    it('RELATIONSHIP_SHIFT_EMOTIONAL_AFTERMATH_VOID fires when no shift is followed by emotional shift within 2 scenes', async () => {
      // n=10; shifts at 2 and 6; aftermath scenes all neutral → fires
      const recs469b = Array.from({ length: 10 }, (_, i) => makeRec469(i));
      recs469b[2] = makeRec469(2, { relationshipShifts: mkShift469('A|B', 0.4) });
      recs469b[6] = makeRec469(6, { relationshipShifts: mkShift469('A|B', -0.4) });
      const res = await runR469(recs469b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SHIFT_EMOTIONAL_AFTERMATH_VOID'), 'RELATIONSHIP_SHIFT_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('RELATIONSHIP_SHIFT_EMOTIONAL_AFTERMATH_VOID does not fire when a shift is followed by an emotional shift', async () => {
      // n=10; shift at 2; scene 4 has emotionalShift='negative' → no fire
      const recs469bnr = Array.from({ length: 10 }, (_, i) => makeRec469(i));
      recs469bnr[2] = makeRec469(2, { relationshipShifts: mkShift469('A|B', 0.4) });
      recs469bnr[4] = makeRec469(4, { emotionalShift: 'negative' });
      recs469bnr[6] = makeRec469(6, { relationshipShifts: mkShift469('A|B', -0.4) });
      const res = await runR469(recs469bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SHIFT_EMOTIONAL_AFTERMATH_VOID'), 'RELATIONSHIP_SHIFT_EMOTIONAL_AFTERMATH_VOID should not fire');
    });

    it('RELATIONSHIP_ACT1_VOID fires when no shift occurs in the first 25% while ≥3 shifts exist later', async () => {
      // n=12 (Act 1 = scenes 0-2); shifts at 4, 7, 10 (all in 25%+) → fires
      const recs469c = Array.from({ length: 12 }, (_, i) => makeRec469(i));
      recs469c[4] = makeRec469(4, { relationshipShifts: mkShift469('A|B', 0.4) });
      recs469c[7] = makeRec469(7, { relationshipShifts: mkShift469('A|B', -0.4) });
      recs469c[10] = makeRec469(10, { relationshipShifts: mkShift469('A|B', 0.5) });
      const res = await runR469(recs469c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_ACT1_VOID'), 'RELATIONSHIP_ACT1_VOID should fire');
    });

    it('RELATIONSHIP_ACT1_VOID does not fire when a shift occurs in Act 1', async () => {
      // n=12; shift at scene 1 (in Act 1) → no fire
      const recs469cnr = Array.from({ length: 12 }, (_, i) => makeRec469(i));
      recs469cnr[1] = makeRec469(1, { relationshipShifts: mkShift469('A|B', 0.3) });
      recs469cnr[4] = makeRec469(4, { relationshipShifts: mkShift469('A|B', 0.4) });
      recs469cnr[7] = makeRec469(7, { relationshipShifts: mkShift469('A|B', -0.4) });
      recs469cnr[10] = makeRec469(10, { relationshipShifts: mkShift469('A|B', 0.5) });
      const res = await runR469(recs469cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_ACT1_VOID'), 'RELATIONSHIP_ACT1_VOID should not fire');
    });
  });


  describe('Wave 455 — relationshipArcPass: pair rupture unmotivated, relationship shift curiosity void, relationship warmth run', async () => {
    const mkShift455 = (pairKey: string, amount: number) => [{ pairKey, dimension: 'trust', amount }];
    const makeRec455 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const makeFountain455 = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        `INT. SC${i} - DAY\n\nAction line for scene ${i}.`
      ).join('\n\n');
    const runR455 = async (records: any[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const fountain = makeFountain455(records.length);
      return relationshipArcPass({ fountain, original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('PAIR_RUPTURE_UNMOTIVATED fires when all negative shifts lack upstream warmth/revelation/turn', async () => {
      // 10 scenes: A|B has 3 shifts (positive at 1, negative at 5 and 8); but no preceding warmth/turn/revelation
      // before scene 5: no positive shift for A|B in scenes 2-4, no revelation, no dramaticTurn
      // before scene 8: no positive shift for A|B in scenes 5-7 (only the negative at 5, not ≥0.3), no revelation
      // positive shift at 1, but it's more than 3 scenes before scene 5 → no motivation
      const recs455a = Array.from({ length: 10 }, (_, i) =>
        makeRec455(i, {
          relationshipShifts: i === 1 ? mkShift455('A|B', 0.4)
            : i === 5 ? mkShift455('A|B', -0.4)
            : i === 8 ? mkShift455('A|B', -0.4)
            : [],
        }),
      );
      const res = await runR455(recs455a);
      assert.ok(res.issues.some((is: any) => is.rule === 'PAIR_RUPTURE_UNMOTIVATED'), 'PAIR_RUPTURE_UNMOTIVATED should fire');
    });

    it('PAIR_RUPTURE_UNMOTIVATED does not fire when a negative shift is preceded by a revelation', async () => {
      // 10 scenes: A|B has 3 shifts (positive at 1, negative at 5 and 8); scene 4 has revelation=true → motivates rupture at 5
      const recs455anr = Array.from({ length: 10 }, (_, i) =>
        makeRec455(i, {
          relationshipShifts: i === 1 ? mkShift455('A|B', 0.4)
            : i === 5 ? mkShift455('A|B', -0.4)
            : i === 8 ? mkShift455('A|B', -0.4)
            : [],
          revelation: i === 4 ? true : null,
        }),
      );
      const res = await runR455(recs455anr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'PAIR_RUPTURE_UNMOTIVATED'), 'PAIR_RUPTURE_UNMOTIVATED should not fire');
    });

    it('RELATIONSHIP_SHIFT_CURIOSITY_VOID fires when no shift is followed by curiosity in next 2 scenes', async () => {
      // 8 scenes: shifts at scenes 2 and 5; no curiosityDelta > 0 in scenes 3,4,6,7
      const recs455b = Array.from({ length: 8 }, (_, i) =>
        makeRec455(i, {
          relationshipShifts: [2, 5].includes(i) ? mkShift455('A|B', 0.4) : [],
          curiosityDelta: 0,
        }),
      );
      const res = await runR455(recs455b);
      assert.ok(res.issues.some((is: any) => is.rule === 'RELATIONSHIP_SHIFT_CURIOSITY_VOID'), 'RELATIONSHIP_SHIFT_CURIOSITY_VOID should fire');
    });

    it('RELATIONSHIP_SHIFT_CURIOSITY_VOID does not fire when a shift is followed by a curiosity rise', async () => {
      // 8 scenes: shift at 2, curiosityDelta=1 at scene 3 (aftermath) → curiosity void resolved
      const recs455bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec455(i, {
          relationshipShifts: [2, 5].includes(i) ? mkShift455('A|B', 0.4) : [],
          curiosityDelta: i === 3 ? 1 : 0,
        }),
      );
      const res = await runR455(recs455bnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'RELATIONSHIP_SHIFT_CURIOSITY_VOID'), 'RELATIONSHIP_SHIFT_CURIOSITY_VOID should not fire');
    });

    it('RELATIONSHIP_WARMTH_RUN fires when 3+ consecutive scenes each carry a major positive shift', async () => {
      // 8 scenes with 2 active pairs; scenes 3,4,5 each have a positive shift ≥0.3 → warmth run of 3
      const recs455c = Array.from({ length: 8 }, (_, i) =>
        makeRec455(i, {
          relationshipShifts: [3, 4, 5].includes(i) ? mkShift455('A|B', 0.4)
            : i === 0 ? mkShift455('C|D', -0.3)
            : i === 7 ? mkShift455('C|D', -0.3)
            : [],
        }),
      );
      const res = await runR455(recs455c);
      assert.ok(res.issues.some((is: any) => is.rule === 'RELATIONSHIP_WARMTH_RUN'), 'RELATIONSHIP_WARMTH_RUN should fire');
    });

    it('RELATIONSHIP_WARMTH_RUN does not fire when max consecutive positive-shift run is only 2', async () => {
      // 8 scenes: warmth at 3,4 (run=2), then 7 (run=1) — max = 2, should not fire
      const recs455cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec455(i, {
          relationshipShifts: [3, 4].includes(i) ? mkShift455('A|B', 0.4)
            : i === 7 ? mkShift455('A|B', 0.4)
            : i === 0 ? mkShift455('C|D', -0.3)
            : i === 2 ? mkShift455('C|D', -0.3)
            : [],
        }),
      );
      const res = await runR455(recs455cnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'RELATIONSHIP_WARMTH_RUN'), 'RELATIONSHIP_WARMTH_RUN should not fire');
    });
  });


  describe('Wave 441 — relationshipArcPass: pair ensemble solo, pair rupture run, relationship climax void', async () => {
    const mkShift441 = (pairKey: string, amount: number) => [{ pairKey, dimension: 'trust', amount }];
    const makeRec441 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runRA441 = async (records: any[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('PAIR_ENSEMBLE_SOLO fires when 3+ active pairs never shift in the same scene', async () => {
      // n=10; pair A|B shifts at 1 and 3; pair C|D shifts at 5 and 7; pair E|F shifts at 2 and 8
      // 3 active pairs, but no scene has 2+ pairs shifting simultaneously → fires
      const recs441a = Array.from({ length: 10 }, (_, i) => makeRec441(i));
      recs441a[1] = makeRec441(1, { relationshipShifts: mkShift441('A|B', -0.5) });
      recs441a[2] = makeRec441(2, { relationshipShifts: mkShift441('E|F', 0.4) });
      recs441a[3] = makeRec441(3, { relationshipShifts: mkShift441('A|B', 0.3) });
      recs441a[5] = makeRec441(5, { relationshipShifts: mkShift441('C|D', -0.4) });
      recs441a[7] = makeRec441(7, { relationshipShifts: mkShift441('C|D', 0.3) });
      recs441a[8] = makeRec441(8, { relationshipShifts: mkShift441('E|F', -0.5) });
      const res = await runRA441(recs441a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAIR_ENSEMBLE_SOLO'), 'PAIR_ENSEMBLE_SOLO should fire');
    });

    it('PAIR_ENSEMBLE_SOLO does not fire when two pairs shift in the same scene', async () => {
      // n=10; scene 3 has both A|B and C|D shifting → compound beat → no fire
      const recs441anr = Array.from({ length: 10 }, (_, i) => makeRec441(i));
      recs441anr[1] = makeRec441(1, { relationshipShifts: mkShift441('A|B', -0.5) });
      recs441anr[3] = makeRec441(3, {
        relationshipShifts: [
          { pairKey: 'A|B', dimension: 'trust', amount: 0.3 },
          { pairKey: 'C|D', dimension: 'trust', amount: -0.4 },
        ],
      });
      recs441anr[5] = makeRec441(5, { relationshipShifts: mkShift441('C|D', 0.3) });
      recs441anr[7] = makeRec441(7, { relationshipShifts: mkShift441('E|F', -0.5) });
      recs441anr[8] = makeRec441(8, { relationshipShifts: mkShift441('E|F', 0.3) });
      const res = await runRA441(recs441anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAIR_ENSEMBLE_SOLO'), 'PAIR_ENSEMBLE_SOLO should not fire');
    });

    it('PAIR_RUPTURE_RUN fires when 3+ consecutive scenes each have a major rupture', async () => {
      // n=8; scenes 2,3,4 each have a rupture ≤ -0.3 → maxRupRun=3 → fires
      const recs441b = Array.from({ length: 8 }, (_, i) => makeRec441(i));
      recs441b[2] = makeRec441(2, { relationshipShifts: mkShift441('A|B', -0.5) });
      recs441b[3] = makeRec441(3, { relationshipShifts: mkShift441('C|D', -0.4) });
      recs441b[4] = makeRec441(4, { relationshipShifts: mkShift441('A|B', -0.3) });
      const res = await runRA441(recs441b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAIR_RUPTURE_RUN'), 'PAIR_RUPTURE_RUN should fire');
    });

    it('PAIR_RUPTURE_RUN does not fire when ruptures are separated by non-rupture scenes', async () => {
      // n=8; ruptures at 2 and 4 (scene 3 has no rupture) → max run=1 → no fire
      const recs441bnr = Array.from({ length: 8 }, (_, i) => makeRec441(i));
      recs441bnr[2] = makeRec441(2, { relationshipShifts: mkShift441('A|B', -0.5) });
      recs441bnr[4] = makeRec441(4, { relationshipShifts: mkShift441('A|B', -0.4) });
      const res = await runRA441(recs441bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAIR_RUPTURE_RUN'), 'PAIR_RUPTURE_RUN should not fire');
    });

    it('RELATIONSHIP_CLIMAX_VOID fires when the final 15% has no relationship shifts', async () => {
      // n=10; climaxStart=Math.floor(10*0.85)=8; shifts at 1(A|B),2(A|B),4(C|D),6(C|D) (4 shifts, 2 pairs before climax)
      // scenes 8,9 (climax zone) have no shifts → fires
      const recs441c = Array.from({ length: 10 }, (_, i) => makeRec441(i));
      recs441c[1] = makeRec441(1, { relationshipShifts: mkShift441('A|B', -0.5) });
      recs441c[2] = makeRec441(2, { relationshipShifts: mkShift441('A|B', 0.4) });
      recs441c[4] = makeRec441(4, { relationshipShifts: mkShift441('C|D', -0.3) });
      recs441c[6] = makeRec441(6, { relationshipShifts: mkShift441('C|D', 0.3) });
      const res = await runRA441(recs441c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_CLIMAX_VOID'), 'RELATIONSHIP_CLIMAX_VOID should fire');
    });

    it('RELATIONSHIP_CLIMAX_VOID does not fire when a shift occurs in the final 15%', async () => {
      // n=10; climaxStart=8; scene 9 has a shift → no fire
      const recs441cnr = Array.from({ length: 10 }, (_, i) => makeRec441(i));
      recs441cnr[1] = makeRec441(1, { relationshipShifts: mkShift441('A|B', -0.5) });
      recs441cnr[2] = makeRec441(2, { relationshipShifts: mkShift441('A|B', 0.4) });
      recs441cnr[4] = makeRec441(4, { relationshipShifts: mkShift441('C|D', -0.3) });
      recs441cnr[9] = makeRec441(9, { relationshipShifts: mkShift441('A|B', 0.5) });
      const res = await runRA441(recs441cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_CLIMAX_VOID'), 'RELATIONSHIP_CLIMAX_VOID should not fire');
    });
  });


  describe('Wave 427 — relationshipArcPass: relationship shift aftermath void, pair amplitude growth, pair repair unmotivated', async () => {
    const makeRec427 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const shift427 = (amount: number, pair = 'A|B') => [{ pairKey: pair, dimension: 'trust', amount }];
    const runR427 = async (records: any[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('RELATIONSHIP_SHIFT_AFTERMATH_VOID fires when every shift scene is followed by 2 silent scenes', async () => {
      // n=10; shifts at 2 and 5; scenes 3,4,6,7 default (no shifts) → both aftermath silent → fires
      const recs427a = Array.from({ length: 10 }, (_, i) =>
        makeRec427(i, { relationshipShifts: [2, 5].includes(i) ? shift427(-0.4) : [] })
      );
      const res = await runR427(recs427a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SHIFT_AFTERMATH_VOID'), 'RELATIONSHIP_SHIFT_AFTERMATH_VOID should fire');
    });

    it('RELATIONSHIP_SHIFT_AFTERMATH_VOID does NOT fire when a shift sparks relational activity in its aftermath', async () => {
      // n=10; shifts at 2 and 3 → scene 2 aftermath includes scene 3 which has a shift → not silent → no fire
      const recs427aNF = Array.from({ length: 10 }, (_, i) =>
        makeRec427(i, { relationshipShifts: [2, 3].includes(i) ? shift427(-0.4) : [] })
      );
      const res = await runR427(recs427aNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SHIFT_AFTERMATH_VOID'), 'RELATIONSHIP_SHIFT_AFTERMATH_VOID should not fire');
    });

    it('PAIR_AMPLITUDE_GROWTH fires when a pair\'s late-half magnitude exceeds 1.5× the early-half', async () => {
      // 4 shifts: magnitudes 0.1, 0.2 (early half avg=0.15), 0.4, 0.5 (late half avg=0.45)
      // 0.45 > 0.15*1.5=0.225 → fires
      const recs427b = Array.from({ length: 10 }, (_, i) => {
        const shiftMap: Record<number, number> = { 1: -0.1, 3: -0.2, 6: -0.4, 8: -0.5 };
        return makeRec427(i, { relationshipShifts: shiftMap[i] !== undefined ? shift427(shiftMap[i]) : [] });
      });
      const res = await runR427(recs427b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAIR_AMPLITUDE_GROWTH'), 'PAIR_AMPLITUDE_GROWTH should fire');
    });

    it('PAIR_AMPLITUDE_GROWTH does NOT fire when a pair\'s magnitude stays uniform', async () => {
      // 4 shifts all magnitude 0.3 → early avg=0.3, late avg=0.3; 0.3 > 0.3*1.5=0.45 → false → no fire
      const recs427bNF = Array.from({ length: 10 }, (_, i) =>
        makeRec427(i, { relationshipShifts: [1, 3, 6, 8].includes(i) ? shift427(-0.3) : [] })
      );
      const res = await runR427(recs427bNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAIR_AMPLITUDE_GROWTH'), 'PAIR_AMPLITUDE_GROWTH should not fire');
    });

    it('PAIR_REPAIR_UNMOTIVATED fires when a pair\'s positive shifts have no backward cause', async () => {
      // n=10; pair A|B: positive shifts at 4 and 7; no prior negative for this pair; no catalyst in those scenes
      const recs427c = Array.from({ length: 10 }, (_, i) =>
        makeRec427(i, { relationshipShifts: [4, 7].includes(i) ? shift427(0.4) : [] })
      );
      // Add a third shift (negative) AFTER all positives to meet ≥3 shifts requirement
      recs427c[9] = makeRec427(9, { relationshipShifts: shift427(-0.4) });
      const res = await runR427(recs427c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAIR_REPAIR_UNMOTIVATED'), 'PAIR_REPAIR_UNMOTIVATED should fire');
    });

    it('PAIR_REPAIR_UNMOTIVATED does NOT fire when a positive shift follows a prior pair conflict', async () => {
      // n=10; pair A|B: negative at scene 2, positive at scene 5 (within 3 scenes) → motivated → no fire
      const recs427cNF = Array.from({ length: 10 }, (_, i) => {
        const shiftMap: Record<number, number> = { 2: -0.4, 5: 0.4, 8: -0.4 };
        return makeRec427(i, { relationshipShifts: shiftMap[i] !== undefined ? shift427(shiftMap[i]) : [] });
      });
      const res = await runR427(recs427cNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAIR_REPAIR_UNMOTIVATED'), 'PAIR_REPAIR_UNMOTIVATED should not fire');
    });
  });


  describe('Wave 413 — relationshipArcPass: pair clock flat, pair dramatic-turn flat, pair revelation flat', async () => {
    const makeRec413 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const shift413 = (amount: number) => [{ pairKey: 'A|B', dimension: 'trust', amount }];
    const runR413 = async (records: any[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('PAIR_CLOCK_FLAT fires when a pair shifts 3+ times all in clock-free scenes while a clock exists', async () => {
      const recs413a = Array.from({ length: 8 }, (_, i) => makeRec413(i, {
        relationshipShifts: [1, 3, 5].includes(i) ? shift413(-0.4) : [],
        clockRaised: i === 7,
      }));
      const res = await runR413(recs413a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAIR_CLOCK_FLAT'), 'PAIR_CLOCK_FLAT should fire');
    });

    it('PAIR_CLOCK_FLAT does NOT fire when one of the pair\'s shift scenes raises a clock', async () => {
      const recs413aNF = Array.from({ length: 8 }, (_, i) => makeRec413(i, {
        relationshipShifts: [1, 3, 5].includes(i) ? shift413(-0.4) : [],
        clockRaised: i === 3,
      }));
      const res = await runR413(recs413aNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAIR_CLOCK_FLAT'), 'PAIR_CLOCK_FLAT should not fire');
    });

    it('PAIR_DRAMATIC_TURN_FLAT fires when a pair shifts 3+ times none coinciding with a turn', async () => {
      const recs413b = Array.from({ length: 8 }, (_, i) => makeRec413(i, {
        relationshipShifts: [1, 3, 5].includes(i) ? shift413(-0.4) : [],
        dramaticTurn: i === 7 ? 'reversal' : 'nothing',
      }));
      const res = await runR413(recs413b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAIR_DRAMATIC_TURN_FLAT'), 'PAIR_DRAMATIC_TURN_FLAT should fire');
    });

    it('PAIR_DRAMATIC_TURN_FLAT does NOT fire when one of the pair\'s shift scenes is a turn', async () => {
      const recs413bNF = Array.from({ length: 8 }, (_, i) => makeRec413(i, {
        relationshipShifts: [1, 3, 5].includes(i) ? shift413(-0.4) : [],
        dramaticTurn: i === 3 ? 'reversal' : 'nothing',
      }));
      const res = await runR413(recs413bNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAIR_DRAMATIC_TURN_FLAT'), 'PAIR_DRAMATIC_TURN_FLAT should not fire');
    });

    it('PAIR_REVELATION_FLAT fires when a pair shifts 3+ times none coinciding with a revelation', async () => {
      const recs413c = Array.from({ length: 8 }, (_, i) => makeRec413(i, {
        relationshipShifts: [1, 3, 5].includes(i) ? shift413(-0.4) : [],
        revelation: i === 7 ? true : null,
      }));
      const res = await runR413(recs413c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAIR_REVELATION_FLAT'), 'PAIR_REVELATION_FLAT should fire');
    });

    it('PAIR_REVELATION_FLAT does NOT fire when one of the pair\'s shift scenes is a revelation', async () => {
      const recs413cNF = Array.from({ length: 8 }, (_, i) => makeRec413(i, {
        relationshipShifts: [1, 3, 5].includes(i) ? shift413(-0.4) : [],
        revelation: i === 3 ? true : null,
      }));
      const res = await runR413(recs413cNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAIR_REVELATION_FLAT'), 'PAIR_REVELATION_FLAT should not fire');
    });
  });


  describe('Wave 399 — relationshipArcPass: pair suspense flat, pair curiosity flat, revelation emotion decoupled', async () => {
    const makeRec399 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const shift399 = (amount: number) => [{ pairKey: 'A|B', dimension: 'trust', amount }];
    const runR399 = async (records: any[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('PAIR_SUSPENSE_FLAT fires when a pair shifts 3+ times all in suspense-free scenes while overall suspense exists', async () => {
      // A|B shifts at scenes 1,3,5 (all suspenseDelta=0); scene 7 has suspenseDelta=2 → fires
      const recs399a = Array.from({ length: 8 }, (_, i) => makeRec399(i, {
        relationshipShifts: [1, 3, 5].includes(i) ? shift399(-0.4) : [],
        suspenseDelta: i === 7 ? 2 : 0,
      }));
      const res = await runR399(recs399a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAIR_SUSPENSE_FLAT'), 'PAIR_SUSPENSE_FLAT should fire');
    });

    it('PAIR_SUSPENSE_FLAT does not fire when one of the pair\'s shift scenes has positive suspense', async () => {
      // A|B shifts at scenes 1,3,5; scene 3 has suspenseDelta=1.5 → no fire
      const recs399anr = Array.from({ length: 8 }, (_, i) => makeRec399(i, {
        relationshipShifts: [1, 3, 5].includes(i) ? shift399(-0.4) : [],
        suspenseDelta: i === 3 ? 1.5 : 0,
      }));
      const res = await runR399(recs399anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAIR_SUSPENSE_FLAT'), 'PAIR_SUSPENSE_FLAT should not fire');
    });

    it('PAIR_CURIOSITY_FLAT fires when a pair shifts 3+ times all in curiosity-free scenes while overall curiosity exists', async () => {
      // A|B shifts at scenes 1,3,5 (all curiosityDelta=0); scene 7 has curiosityDelta=2 → fires
      const recs399b = Array.from({ length: 8 }, (_, i) => makeRec399(i, {
        relationshipShifts: [1, 3, 5].includes(i) ? shift399(0.4) : [],
        curiosityDelta: i === 7 ? 2 : 0,
      }));
      const res = await runR399(recs399b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAIR_CURIOSITY_FLAT'), 'PAIR_CURIOSITY_FLAT should fire');
    });

    it('PAIR_CURIOSITY_FLAT does not fire when one of the pair\'s shift scenes has positive curiosity', async () => {
      // A|B shifts at scenes 1,3,5; scene 3 has curiosityDelta=1 → no fire
      const recs399bnr = Array.from({ length: 8 }, (_, i) => makeRec399(i, {
        relationshipShifts: [1, 3, 5].includes(i) ? shift399(0.4) : [],
        curiosityDelta: i === 3 ? 1 : 0,
      }));
      const res = await runR399(recs399bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAIR_CURIOSITY_FLAT'), 'PAIR_CURIOSITY_FLAT should not fire');
    });

    it('RELATIONSHIP_REVELATION_EMOTION_DECOUPLED fires when all revelation+shift scenes are emotionally neutral', async () => {
      // Scenes 3,5 have revelation=true AND A|B shift AND emotionalShift='neutral' → fires
      const recs399c = Array.from({ length: 8 }, (_, i) => makeRec399(i, {
        revelation: [3, 5].includes(i) ? true : null,
        relationshipShifts: [3, 5].includes(i) ? shift399(-0.3) : [],
        emotionalShift: 'neutral',
      }));
      const res = await runR399(recs399c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_REVELATION_EMOTION_DECOUPLED'), 'RELATIONSHIP_REVELATION_EMOTION_DECOUPLED should fire');
    });

    it('RELATIONSHIP_REVELATION_EMOTION_DECOUPLED does not fire when a revelation+shift scene carries emotion', async () => {
      // Scene 3 has revelation+shift+emotionalShift='negative' → no fire
      const recs399cnr = Array.from({ length: 8 }, (_, i) => makeRec399(i, {
        revelation: [3, 5].includes(i) ? true : null,
        relationshipShifts: [3, 5].includes(i) ? shift399(-0.3) : [],
        emotionalShift: i === 3 ? 'negative' : 'neutral',
      }));
      const res = await runR399(recs399cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_REVELATION_EMOTION_DECOUPLED'), 'RELATIONSHIP_REVELATION_EMOTION_DECOUPLED should not fire');
    });
  });


  describe('Wave 304 — relationshipArcPass: shift magnitude uniformity, warmth unfelt, dimension one-way', async () => {
    const makeRec304 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runRA304 = async (records: any[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('SHIFT_MAGNITUDE_UNIFORMITY fires when all shifts share one magnitude', async () => {
      const recs304mu = Array.from({ length: 8 }, (_, i) =>
        makeRec304(i, {
          relationshipShifts: i < 5 ? [{ pairKey: 'A|B', dimension: 'affinity', amount: i % 2 === 0 ? -0.5 : 0.5 }] : [],
        })
      );
      const res = await runRA304(recs304mu);
      assert.ok(res.issues.some((i: any) => i.rule === 'SHIFT_MAGNITUDE_UNIFORMITY'), 'SHIFT_MAGNITUDE_UNIFORMITY should fire');
    });

    it('SHIFT_MAGNITUDE_UNIFORMITY does not fire when magnitudes vary', async () => {
      const amounts304 = [-0.5, 0.3, -0.7, 0.5, -0.2];
      const recs304nmu = Array.from({ length: 8 }, (_, i) =>
        makeRec304(i, {
          relationshipShifts: i < 5 ? [{ pairKey: 'A|B', dimension: 'affinity', amount: amounts304[i] }] : [],
        })
      );
      const res = await runRA304(recs304nmu);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SHIFT_MAGNITUDE_UNIFORMITY'), 'SHIFT_MAGNITUDE_UNIFORMITY should not fire');
    });

    it('WARMTH_UNFELT fires when strong positive shifts all land in neutral scenes', async () => {
      const recs304wu = Array.from({ length: 8 }, (_, i) =>
        makeRec304(i, {
          relationshipShifts: [1, 3, 5].includes(i) ? [{ pairKey: 'A|B', dimension: 'affinity', amount: 0.5 }] : [],
        })
      );
      const res = await runRA304(recs304wu);
      assert.ok(res.issues.some((i: any) => i.rule === 'WARMTH_UNFELT'), 'WARMTH_UNFELT should fire');
    });

    it('WARMTH_UNFELT does not fire when a warming scene moves someone emotionally', async () => {
      const recs304nwu = Array.from({ length: 8 }, (_, i) =>
        makeRec304(i, {
          relationshipShifts: [1, 3, 5].includes(i) ? [{ pairKey: 'A|B', dimension: 'affinity', amount: 0.5 }] : [],
          emotionalShift: i === 3 ? 'positive' : 'neutral',
        })
      );
      const res = await runRA304(recs304nwu);
      assert.ok(!res.issues.some((i: any) => i.rule === 'WARMTH_UNFELT'), 'WARMTH_UNFELT should not fire');
    });

    it('DIMENSION_ONE_WAY fires when a dimension only ever moves one direction', async () => {
      // trust falls 4 times across two pairs; affinity moves both ways
      const recs304ow = Array.from({ length: 8 }, (_, i) =>
        makeRec304(i, {
          relationshipShifts:
            i < 4 ? [{ pairKey: i % 2 === 0 ? 'A|B' : 'C|D', dimension: 'trust', amount: -0.3 }]
            : i === 5 ? [{ pairKey: 'A|B', dimension: 'affinity', amount: 0.4 }]
            : i === 6 ? [{ pairKey: 'A|B', dimension: 'affinity', amount: -0.4 }]
            : [],
        })
      );
      const res = await runRA304(recs304ow);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIMENSION_ONE_WAY'), 'DIMENSION_ONE_WAY should fire');
    });

    it('DIMENSION_ONE_WAY does not fire when the dimension reverses at least once', async () => {
      const recs304now = Array.from({ length: 8 }, (_, i) =>
        makeRec304(i, {
          relationshipShifts:
            i < 3 ? [{ pairKey: i % 2 === 0 ? 'A|B' : 'C|D', dimension: 'trust', amount: -0.3 }]
            : i === 4 ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.4 }]
            : i === 5 ? [{ pairKey: 'A|B', dimension: 'affinity', amount: 0.4 }]
            : i === 6 ? [{ pairKey: 'A|B', dimension: 'affinity', amount: -0.4 }]
            : [],
        })
      );
      const res = await runRA304(recs304now);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIMENSION_ONE_WAY'), 'DIMENSION_ONE_WAY should not fire');
    });
  });


  describe('Wave 385 — relationshipArcPass: peak emotion flat, pair midpoint void, pair emotion flat', async () => {
    const makeRec385 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const shift385 = (pairKey: string, amount: number) => ({ pairKey, dimension: 'trust', amount });
    const runRA385 = async (records: any[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('RELATIONSHIP_PEAK_EMOTION_FLAT fires when the largest-magnitude shift scene is neutral while 2+ other shift scenes carry emotion', async () => {
      // scene 6 has the biggest shift (0.9) but is neutral; scenes 2,4 have smaller shifts + emotion
      const recs385pe = Array.from({ length: 8 }, (_, i) =>
        makeRec385(i, {
          relationshipShifts: i === 6 ? [shift385('A|B', 0.9)] : [2, 4].includes(i) ? [shift385('C|D', 0.4)] : [],
          emotionalShift: [2, 4].includes(i) ? 'positive' : 'neutral',
        }),
      );
      const res = await runRA385(recs385pe);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_PEAK_EMOTION_FLAT'), 'RELATIONSHIP_PEAK_EMOTION_FLAT should fire');
    });

    it('RELATIONSHIP_PEAK_EMOTION_FLAT does not fire when the largest-magnitude shift scene carries emotion', async () => {
      const recs385pen = Array.from({ length: 8 }, (_, i) =>
        makeRec385(i, {
          relationshipShifts: i === 6 ? [shift385('A|B', 0.9)] : [2, 4].includes(i) ? [shift385('C|D', 0.4)] : [],
          emotionalShift: [2, 4, 6].includes(i) ? 'positive' : 'neutral',
        }),
      );
      const res = await runRA385(recs385pen);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_PEAK_EMOTION_FLAT'), 'RELATIONSHIP_PEAK_EMOTION_FLAT should not fire');
    });

    it('PAIR_MIDPOINT_VOID fires when a pair shifts before and after the 40-60% window but not within it', async () => {
      // n=10 → mid zone [4,6); A|B shifts at 1 (before) and 8 (after), none at 4 or 5
      const recs385mv = Array.from({ length: 10 }, (_, i) =>
        makeRec385(i, { relationshipShifts: [1, 8].includes(i) ? [shift385('A|B', 0.5)] : [] }),
      );
      const res = await runRA385(recs385mv);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAIR_MIDPOINT_VOID'), 'PAIR_MIDPOINT_VOID should fire');
    });

    it('PAIR_MIDPOINT_VOID does not fire when the pair shifts within the midpoint zone', async () => {
      // A|B shifts at 1, 5 (within [4,6)), and 8
      const recs385mvn = Array.from({ length: 10 }, (_, i) =>
        makeRec385(i, { relationshipShifts: [1, 5, 8].includes(i) ? [shift385('A|B', 0.5)] : [] }),
      );
      const res = await runRA385(recs385mvn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAIR_MIDPOINT_VOID'), 'PAIR_MIDPOINT_VOID should not fire');
    });

    it('PAIR_EMOTION_FLAT fires when a pair has 3+ shifts all in emotionally neutral scenes', async () => {
      // A|B shifts at 2,4,6 all neutral; another pair C|D shifts at 1 with emotion (so not whole-story flat)
      const recs385ef = Array.from({ length: 8 }, (_, i) =>
        makeRec385(i, {
          relationshipShifts: [2, 4, 6].includes(i) ? [shift385('A|B', 0.5)] : i === 1 ? [shift385('C|D', 0.4)] : [],
          emotionalShift: i === 1 ? 'positive' : 'neutral',
        }),
      );
      const res = await runRA385(recs385ef);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAIR_EMOTION_FLAT'), 'PAIR_EMOTION_FLAT should fire');
    });

    it('PAIR_EMOTION_FLAT does not fire when one of the pair\'s shift scenes carries emotion', async () => {
      // A|B shifts at 2,4,6 but scene 4 carries emotion
      const recs385efn = Array.from({ length: 8 }, (_, i) =>
        makeRec385(i, {
          relationshipShifts: [2, 4, 6].includes(i) ? [shift385('A|B', 0.5)] : [],
          emotionalShift: i === 4 ? 'positive' : 'neutral',
        }),
      );
      const res = await runRA385(recs385efn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAIR_EMOTION_FLAT'), 'PAIR_EMOTION_FLAT should not fire');
    });
  });


  describe('Wave 371 — relationshipArcPass: suspense peak absent, clock decoupled, pair first-half void', async () => {
    const makeRec371 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const shift371 = (pairKey: string, amount: number) => ({ pairKey, dimension: 'trust', amount });
    const runRA371 = async (records: any[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('RELATIONSHIP_SUSPENSE_PEAK_ABSENT fires when the peak-suspense scene has no shift but 2+ other suspense-positive scenes do', async () => {
      // scene 3 peak suspenseDelta=2.0 (no shift); scenes 1,5 suspense-positive WITH shifts
      const recs371sp = Array.from({ length: 8 }, (_, i) =>
        makeRec371(i, {
          suspenseDelta: i === 3 ? 2.0 : i === 1 || i === 5 ? 0.8 : 0,
          relationshipShifts: i === 1 || i === 5 ? [shift371('A|B', 0.4)] : [],
        }),
      );
      const res = await runRA371(recs371sp);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SUSPENSE_PEAK_ABSENT'), 'RELATIONSHIP_SUSPENSE_PEAK_ABSENT should fire');
    });

    it('RELATIONSHIP_SUSPENSE_PEAK_ABSENT does not fire when the peak-suspense scene carries a shift', async () => {
      const recs371spn = Array.from({ length: 8 }, (_, i) =>
        makeRec371(i, {
          suspenseDelta: i === 3 ? 2.0 : i === 1 || i === 5 ? 0.8 : 0,
          relationshipShifts: [1, 3, 5].includes(i) ? [shift371('A|B', 0.4)] : [],
        }),
      );
      const res = await runRA371(recs371spn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SUSPENSE_PEAK_ABSENT'), 'RELATIONSHIP_SUSPENSE_PEAK_ABSENT should not fire');
    });

    it('RELATIONSHIP_CLOCK_DECOUPLED fires when no shift lands in a clock-raised scene', async () => {
      // shifts at 2,4,6; clockRaised at 1,7 — no overlap
      const recs371cd = Array.from({ length: 8 }, (_, i) =>
        makeRec371(i, {
          relationshipShifts: [2, 4, 6].includes(i) ? [shift371('A|B', 0.5)] : [],
          clockRaised: [1, 7].includes(i),
        }),
      );
      const res = await runRA371(recs371cd);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_CLOCK_DECOUPLED'), 'RELATIONSHIP_CLOCK_DECOUPLED should fire');
    });

    it('RELATIONSHIP_CLOCK_DECOUPLED does not fire when a shift lands in a clock-raised scene', async () => {
      // scene 4 has both a shift and clockRaised
      const recs371cdn = Array.from({ length: 8 }, (_, i) =>
        makeRec371(i, {
          relationshipShifts: [2, 4, 6].includes(i) ? [shift371('A|B', 0.5)] : [],
          clockRaised: [1, 4].includes(i),
        }),
      );
      const res = await runRA371(recs371cdn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_CLOCK_DECOUPLED'), 'RELATIONSHIP_CLOCK_DECOUPLED should not fire');
    });

    it('PAIR_FIRST_HALF_VOID fires when a pair has 3+ second-half shifts and 0 first-half shifts', async () => {
      // n=10; A|B shifts at 6,7,8 (second half), none in first half; C|D shifts at 2 to avoid trivial cases
      const recs371fv = Array.from({ length: 10 }, (_, i) =>
        makeRec371(i, {
          relationshipShifts: [6, 7, 8].includes(i)
            ? [shift371('A|B', 0.5)]
            : i === 2 ? [shift371('C|D', 0.4)] : [],
        }),
      );
      const res = await runRA371(recs371fv);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAIR_FIRST_HALF_VOID'), 'PAIR_FIRST_HALF_VOID should fire');
    });

    it('PAIR_FIRST_HALF_VOID does not fire when the same pair also shifts in the first half', async () => {
      // A|B shifts at 2 (first half) AND 6,7,8
      const recs371fvn = Array.from({ length: 10 }, (_, i) =>
        makeRec371(i, {
          relationshipShifts: [2, 6, 7, 8].includes(i)
            ? [shift371('A|B', 0.5)]
            : i === 3 ? [shift371('C|D', 0.4)] : [],
        }),
      );
      const res = await runRA371(recs371fvn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAIR_FIRST_HALF_VOID'), 'PAIR_FIRST_HALF_VOID should not fire');
    });
  });


  describe('Wave 357 — relationshipArcPass: curiosity peak absent, pair second-half void, dramatic turn decoupled', async () => {
    const makeRec357 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const shift357 = (pairKey: string, amount: number) => ({ pairKey, dimension: 'trust', amount });
    const runRA357 = async (records: any[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('RELATIONSHIP_CURIOSITY_PEAK_ABSENT fires when peak-curiosity scene has no relationship shift but 2+ other curiosity-positive scenes do', async () => {
      // 8 scenes; scene 3 has highest curiosityDelta (2.0) but no shift;
      // scenes 1 and 5 have curiosityDelta > 0 AND carry shifts — 2 qualifying
      const recs357cpa = Array.from({ length: 8 }, (_, i) =>
        makeRec357(i, {
          curiosityDelta: i === 3 ? 2.0 : i === 1 || i === 5 ? 0.8 : 0,
          relationshipShifts: i === 1 || i === 5 ? [shift357('A|B', 0.4)] : [],
        }),
      );
      const res = await runRA357(recs357cpa);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_CURIOSITY_PEAK_ABSENT'), 'RELATIONSHIP_CURIOSITY_PEAK_ABSENT should fire');
    });

    it('RELATIONSHIP_CURIOSITY_PEAK_ABSENT does not fire when peak-curiosity scene carries a relationship shift', async () => {
      // scene 3 is still the peak (2.0) but now also has a shift
      const recs357cpani = Array.from({ length: 8 }, (_, i) =>
        makeRec357(i, {
          curiosityDelta: i === 3 ? 2.0 : i === 1 || i === 5 ? 0.8 : 0,
          relationshipShifts: [1, 3, 5].includes(i) ? [shift357('A|B', 0.4)] : [],
        }),
      );
      const res = await runRA357(recs357cpani);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_CURIOSITY_PEAK_ABSENT'), 'RELATIONSHIP_CURIOSITY_PEAK_ABSENT should not fire');
    });

    it('PAIR_SECOND_HALF_VOID fires when one pair has 3+ first-half shifts and 0 second-half shifts', async () => {
      // 10 scenes; A|B shifts at 0,1,2 (all in first half [0-4]) with nothing in [5-9]
      // A second pair C|D shifts at 6 to avoid RELATIONSHIP_VELOCITY_COLLAPSE
      const recs357psv = Array.from({ length: 10 }, (_, i) =>
        makeRec357(i, {
          relationshipShifts: [0, 1, 2].includes(i)
            ? [shift357('A|B', 0.5)]
            : i === 6 ? [shift357('C|D', 0.4)] : [],
        }),
      );
      const res = await runRA357(recs357psv);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAIR_SECOND_HALF_VOID'), 'PAIR_SECOND_HALF_VOID should fire');
    });

    it('PAIR_SECOND_HALF_VOID does not fire when the same pair also shifts in the second half', async () => {
      // A|B shifts at 0,1,2 AND also at 7 — second half present
      const recs357psvni = Array.from({ length: 10 }, (_, i) =>
        makeRec357(i, {
          relationshipShifts: [0, 1, 2, 7].includes(i)
            ? [shift357('A|B', 0.5)]
            : i === 6 ? [shift357('C|D', 0.4)] : [],
        }),
      );
      const res = await runRA357(recs357psvni);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAIR_SECOND_HALF_VOID'), 'PAIR_SECOND_HALF_VOID should not fire');
    });

    it('RELATIONSHIP_DRAMATIC_TURN_DECOUPLED fires when 3+ dramatic-turn scenes and 3+ shift scenes share no overlap', async () => {
      // 8 scenes; turns at 0,1,2 (no shifts); shifts at 4,5,6 (no turns)
      const recs357dtd = Array.from({ length: 8 }, (_, i) =>
        makeRec357(i, {
          dramaticTurn: [0, 1, 2].includes(i) ? 'reversal' : 'nothing',
          relationshipShifts: [4, 5, 6].includes(i) ? [shift357('A|B', 0.5)] : [],
        }),
      );
      const res = await runRA357(recs357dtd);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_DRAMATIC_TURN_DECOUPLED'), 'RELATIONSHIP_DRAMATIC_TURN_DECOUPLED should fire');
    });

    it('RELATIONSHIP_DRAMATIC_TURN_DECOUPLED does not fire when at least one dramatic-turn scene also shifts a bond', async () => {
      // scene 2 has both a turn and a shift
      const recs357dtdni = Array.from({ length: 8 }, (_, i) =>
        makeRec357(i, {
          dramaticTurn: [0, 1, 2].includes(i) ? 'reversal' : 'nothing',
          relationshipShifts: [2, 4, 5, 6].includes(i) ? [shift357('A|B', 0.5)] : [],
        }),
      );
      const res = await runRA357(recs357dtdni);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_DRAMATIC_TURN_DECOUPLED'), 'RELATIONSHIP_DRAMATIC_TURN_DECOUPLED should not fire');
    });
  });


  describe('Wave 343 — relationshipArcPass: rupture emotion flat, global amplitude frontload, shift drought', async () => {
    const makeRec343 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const shift343 = (pairKey: string, amount: number) => ({ pairKey, dimension: 'trust', amount });
    const runRA343 = async (records: any[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('RELATIONSHIP_RUPTURE_EMOTION_FLAT fires when every negative-shift scene is emotionally neutral', async () => {
      const recs343re = Array.from({ length: 8 }, (_, i) =>
        makeRec343(i, { relationshipShifts: [1, 3, 5].includes(i) ? [shift343('A|B', -0.5)] : [] })
      );
      const res = await runRA343(recs343re);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_RUPTURE_EMOTION_FLAT'), 'RELATIONSHIP_RUPTURE_EMOTION_FLAT should fire');
    });

    it('RELATIONSHIP_RUPTURE_EMOTION_FLAT does not fire when a rupture scene carries emotion', async () => {
      const recs343ren = Array.from({ length: 8 }, (_, i) =>
        makeRec343(i, {
          relationshipShifts: [1, 3, 5].includes(i) ? [shift343('A|B', -0.5)] : [],
          emotionalShift: i === 3 ? 'negative' : 'neutral',
        })
      );
      const res = await runRA343(recs343ren);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_RUPTURE_EMOTION_FLAT'), 'RELATIONSHIP_RUPTURE_EMOTION_FLAT should not fire');
    });

    it('RELATIONSHIP_GLOBAL_AMPLITUDE_FRONTLOAD fires when first-half shifts dwarf second-half shifts', async () => {
      const recs343af = Array.from({ length: 10 }, (_, i) =>
        makeRec343(i, {
          relationshipShifts:
            i === 1 ? [shift343('A|B', 4)] :
            i === 2 ? [shift343('A|B', 4)] :
            i === 6 ? [shift343('C|D', 1)] :
            i === 7 ? [shift343('C|D', 1)] : [],
        })
      );
      const res = await runRA343(recs343af);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_GLOBAL_AMPLITUDE_FRONTLOAD'), 'RELATIONSHIP_GLOBAL_AMPLITUDE_FRONTLOAD should fire');
    });

    it('RELATIONSHIP_GLOBAL_AMPLITUDE_FRONTLOAD does not fire when magnitudes are even across halves', async () => {
      const recs343afn = Array.from({ length: 10 }, (_, i) =>
        makeRec343(i, {
          relationshipShifts:
            i === 1 ? [shift343('A|B', 2)] :
            i === 2 ? [shift343('A|B', 2)] :
            i === 6 ? [shift343('C|D', 2)] :
            i === 7 ? [shift343('C|D', 2)] : [],
        })
      );
      const res = await runRA343(recs343afn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_GLOBAL_AMPLITUDE_FRONTLOAD'), 'RELATIONSHIP_GLOBAL_AMPLITUDE_FRONTLOAD should not fire');
    });

    it('RELATIONSHIP_SHIFT_DROUGHT fires when the longest no-shift run spans ≥40% of the story', async () => {
      const recs343dr = Array.from({ length: 10 }, (_, i) =>
        makeRec343(i, { relationshipShifts: [0, 1, 8, 9].includes(i) ? [shift343('A|B', 0.5)] : [] })
      );
      // scenes 2-7 (6 consecutive) carry no shift — 60% of the story
      const res = await runRA343(recs343dr);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SHIFT_DROUGHT'), 'RELATIONSHIP_SHIFT_DROUGHT should fire');
    });

    it('RELATIONSHIP_SHIFT_DROUGHT does not fire when shifts are evenly distributed', async () => {
      const recs343drn = Array.from({ length: 10 }, (_, i) =>
        makeRec343(i, { relationshipShifts: [0, 3, 6, 9].includes(i) ? [shift343('A|B', 0.5)] : [] })
      );
      // longest no-shift run is 2 scenes
      const res = await runRA343(recs343drn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SHIFT_DROUGHT'), 'RELATIONSHIP_SHIFT_DROUGHT should not fire');
    });
  });


  describe('Wave 329 — relationshipArcPass: revelation silent, pair early-peak majority, suspense decoupled', async () => {
    const makeRec329 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const shift329 = (pairKey: string, amount: number) => ({ pairKey, dimension: 'trust', amount });
    const runRA329 = async (records: any[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('RELATIONSHIP_REVELATION_SILENT fires when no revelation scene contains a bond shift', async () => {
      const recs329rs = Array.from({ length: 8 }, (_, i) =>
        makeRec329(i, {
          revelation: [3, 6].includes(i) ? 'A secret is revealed' : null,
          relationshipShifts: [1, 4].includes(i) ? [shift329('A|B', 0.5)] : [],
        })
      );
      const res = await runRA329(recs329rs);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_REVELATION_SILENT'), 'RELATIONSHIP_REVELATION_SILENT should fire');
    });

    it('RELATIONSHIP_REVELATION_SILENT does not fire when a revelation scene has a bond shift', async () => {
      const recs329nrs = Array.from({ length: 8 }, (_, i) =>
        makeRec329(i, {
          revelation: [3, 6].includes(i) ? 'A secret is revealed' : null,
          relationshipShifts: [3, 5].includes(i) ? [shift329('A|B', 0.5)] : [],
        })
      );
      const res = await runRA329(recs329nrs);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_REVELATION_SILENT'), 'RELATIONSHIP_REVELATION_SILENT should not fire');
    });

    it('PAIR_EARLY_PEAK_MAJORITY fires when >60% of pairs peak in the first 30% of scenes', async () => {
      // 10 scenes: 3 pairs each have their biggest shift in scene 1 (first 30%), 1 pair peaks at scene 8
      const recs329ep = Array.from({ length: 10 }, (_, i) =>
        makeRec329(i, {
          relationshipShifts: i === 1
            ? [shift329('A|B', 5), shift329('C|D', 4), shift329('E|F', 3)]
            : i === 3 ? [shift329('A|B', 1), shift329('C|D', 1), shift329('E|F', 1)]
            : i === 8 ? [shift329('G|H', 6)]
            : [],
        })
      );
      const res = await runRA329(recs329ep);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAIR_EARLY_PEAK_MAJORITY'), 'PAIR_EARLY_PEAK_MAJORITY should fire');
    });

    it('PAIR_EARLY_PEAK_MAJORITY does not fire when most pairs peak after the first 30%', async () => {
      // 10 scenes: all 4 pairs have their biggest shift late (scene 7+)
      const recs329nep = Array.from({ length: 10 }, (_, i) =>
        makeRec329(i, {
          relationshipShifts: i === 1
            ? [shift329('A|B', 1), shift329('C|D', 1), shift329('E|F', 1), shift329('G|H', 1)]
            : i === 7
            ? [shift329('A|B', 5), shift329('C|D', 4), shift329('E|F', 3), shift329('G|H', 6)]
            : [],
        })
      );
      const res = await runRA329(recs329nep);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAIR_EARLY_PEAK_MAJORITY'), 'PAIR_EARLY_PEAK_MAJORITY should not fire');
    });

    it('RELATIONSHIP_SUSPENSE_DECOUPLED fires when shift scenes have avg suspenseDelta ≤ 0', async () => {
      const recs329sd = Array.from({ length: 8 }, (_, i) =>
        makeRec329(i, {
          relationshipShifts: [2, 4, 6].includes(i) ? [shift329('A|B', 0.5)] : [],
          suspenseDelta: 0,
        })
      );
      const res = await runRA329(recs329sd);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SUSPENSE_DECOUPLED'), 'RELATIONSHIP_SUSPENSE_DECOUPLED should fire');
    });

    it('RELATIONSHIP_SUSPENSE_DECOUPLED does not fire when shift scenes raise suspense', async () => {
      const recs329nsd = Array.from({ length: 8 }, (_, i) =>
        makeRec329(i, {
          relationshipShifts: [2, 4, 6].includes(i) ? [shift329('A|B', 0.5)] : [],
          suspenseDelta: [2, 4, 6].includes(i) ? 1.5 : 0,
        })
      );
      const res = await runRA329(recs329nsd);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_SUSPENSE_DECOUPLED'), 'RELATIONSHIP_SUSPENSE_DECOUPLED should not fire');
    });
  });


  describe('Wave 318 — relationshipArcPass: curiosity decoupled, positive-only pair majority, Act 2b desert', async () => {
    const makeRec318 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const shift318 = (pairKey: string, amount: number) => ({ pairKey, dimension: 'trust', amount });
    const runRA318 = async (records: any[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('RELATIONSHIP_CURIOSITY_DECOUPLED fires when shift scenes have avg curiosityDelta ≤ 0', async () => {
      const recs318cd = Array.from({ length: 8 }, (_, i) =>
        makeRec318(i, {
          relationshipShifts: [2, 3, 4, 5].includes(i) ? [shift318('A|B', 0.5)] : [],
          curiosityDelta: 0,
        })
      );
      const res = await runRA318(recs318cd);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_CURIOSITY_DECOUPLED'), 'RELATIONSHIP_CURIOSITY_DECOUPLED should fire');
    });

    it('RELATIONSHIP_CURIOSITY_DECOUPLED does not fire when shift scenes raise curiosity', async () => {
      const recs318ncd = Array.from({ length: 8 }, (_, i) =>
        makeRec318(i, {
          relationshipShifts: [2, 3, 4, 5].includes(i) ? [shift318('A|B', 0.5)] : [],
          curiosityDelta: [2, 3, 4, 5].includes(i) ? 2 : 0,
        })
      );
      const res = await runRA318(recs318ncd);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_CURIOSITY_DECOUPLED'), 'RELATIONSHIP_CURIOSITY_DECOUPLED should not fire');
    });

    it('POSITIVE_ONLY_PAIR_MAJORITY fires when >60% of pairs have exclusively positive shifts', async () => {
      const recs318pp = Array.from({ length: 8 }, (_, i) =>
        makeRec318(i, {
          relationshipShifts: i === 2 ? [shift318('A|B', 0.5), shift318('C|D', 0.4), shift318('E|F', 0.3), shift318('G|H', 0.6)] : [],
        })
      );
      const res = await runRA318(recs318pp);
      assert.ok(res.issues.some((i: any) => i.rule === 'POSITIVE_ONLY_PAIR_MAJORITY'), 'POSITIVE_ONLY_PAIR_MAJORITY should fire');
    });

    it('POSITIVE_ONLY_PAIR_MAJORITY does not fire when most pairs include negative shifts', async () => {
      const recs318npp = Array.from({ length: 8 }, (_, i) =>
        makeRec318(i, {
          relationshipShifts: i === 2
            ? [shift318('A|B', 0.5), shift318('C|D', -0.4), shift318('E|F', -0.3), shift318('G|H', -0.6)]
            : [],
        })
      );
      const res = await runRA318(recs318npp);
      assert.ok(!res.issues.some((i: any) => i.rule === 'POSITIVE_ONLY_PAIR_MAJORITY'), 'POSITIVE_ONLY_PAIR_MAJORITY should not fire');
    });

    it('RELATIONSHIP_ACT2B_DESERT fires when no shifts occur in the 50%-75% zone', async () => {
      // 10 records: shifts only in scenes 0-4 (Act 1/2a) and scene 9, none in 5-7 (Act 2b)
      const recs318a2b = Array.from({ length: 10 }, (_, i) =>
        makeRec318(i, {
          relationshipShifts: [2, 3, 9].includes(i) ? [shift318('A|B', 0.5), shift318('C|D', -0.3)] : [],
        })
      );
      const res = await runRA318(recs318a2b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_ACT2B_DESERT'), 'RELATIONSHIP_ACT2B_DESERT should fire');
    });

    it('RELATIONSHIP_ACT2B_DESERT does not fire when a shift occurs in the 50%-75% zone', async () => {
      const recs318na2b = Array.from({ length: 10 }, (_, i) =>
        makeRec318(i, {
          relationshipShifts: [2, 6, 9].includes(i) ? [shift318('A|B', 0.5), shift318('C|D', -0.3)] : [],
        })
      );
      const res = await runRA318(recs318na2b);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_ACT2B_DESERT'), 'RELATIONSHIP_ACT2B_DESERT should not fire');
    });
  });


  describe('Wave 290 — relationshipArcPass: opening burst, negative-only majority, shift dimension concentration', async () => {
    const makeRec290 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runRA290 = async (records: any[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('RELATIONSHIP_OPENING_BURST fires when all shifts are in the first 25%', async () => {
      // 12 scenes: all 4 shifts at sceneIdx 0,1,2 (first 25% = scenes 0-2)
      const recs290rob = Array.from({ length: 12 }, (_, i) =>
        makeRec290(i, {
          relationshipShifts: i < 3 ? [
            { pairKey: `A|B`, dimension: 'affinity', amount: -0.5 },
            { pairKey: `C|D`, dimension: 'affinity', amount: 0.5 },
          ] : [],
        })
      );
      const res = await runRA290(recs290rob);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONSHIP_OPENING_BURST'), 'RELATIONSHIP_OPENING_BURST should fire');
    });

    it('RELATIONSHIP_OPENING_BURST does not fire when shifts are spread across the story', async () => {
      const recs290nrob = Array.from({ length: 12 }, (_, i) =>
        makeRec290(i, {
          relationshipShifts: [1, 4, 7, 10].includes(i) ? [{ pairKey: 'A|B', dimension: 'affinity', amount: -0.3 }] : [],
        })
      );
      const res = await runRA290(recs290nrob);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONSHIP_OPENING_BURST'), 'RELATIONSHIP_OPENING_BURST should not fire');
    });

    it('NEGATIVE_ONLY_PAIR_MAJORITY fires when >60% of pairs have exclusively negative shifts', async () => {
      // 3 pairs: A|B, C|D, E|F — all negative
      const recs290nom = Array.from({ length: 10 }, (_, i) =>
        makeRec290(i, {
          relationshipShifts: i < 3 ? [
            { pairKey: 'A|B', dimension: 'affinity', amount: -0.5 },
            { pairKey: 'C|D', dimension: 'affinity', amount: -0.3 },
            { pairKey: 'E|F', dimension: 'affinity', amount: -0.4 },
          ] : [],
        })
      );
      const res = await runRA290(recs290nom);
      assert.ok(res.issues.some((i: any) => i.rule === 'NEGATIVE_ONLY_PAIR_MAJORITY'), 'NEGATIVE_ONLY_PAIR_MAJORITY should fire');
    });

    it('NEGATIVE_ONLY_PAIR_MAJORITY does not fire when some pairs have positive shifts', async () => {
      // 3 pairs: A|B negative, C|D positive, E|F mixed → only 1/3 = 33% negative-only
      const recs290nnom = Array.from({ length: 10 }, (_, i) =>
        makeRec290(i, {
          relationshipShifts: i < 3 ? [
            { pairKey: 'A|B', dimension: 'affinity', amount: -0.5 },
            { pairKey: 'C|D', dimension: 'affinity', amount: 0.5 },
            { pairKey: 'E|F', dimension: 'affinity', amount: i === 0 ? -0.3 : 0.3 },
          ] : [],
        })
      );
      const res = await runRA290(recs290nnom);
      assert.ok(!res.issues.some((i: any) => i.rule === 'NEGATIVE_ONLY_PAIR_MAJORITY'), 'NEGATIVE_ONLY_PAIR_MAJORITY should not fire');
    });

    it('SHIFT_DIMENSION_CONCENTRATION fires when all shifts use a single dimension', async () => {
      // 10 shifts across 2 pairs, all on 'affinity'
      const recs290sdc = Array.from({ length: 10 }, (_, i) =>
        makeRec290(i, {
          relationshipShifts: i < 5 ? [
            { pairKey: 'A|B', dimension: 'affinity', amount: -0.3 },
            { pairKey: 'C|D', dimension: 'affinity', amount: 0.3 },
          ] : [],
        })
      );
      const res = await runRA290(recs290sdc);
      assert.ok(res.issues.some((i: any) => i.rule === 'SHIFT_DIMENSION_CONCENTRATION'), 'SHIFT_DIMENSION_CONCENTRATION should fire');
    });

    it('SHIFT_DIMENSION_CONCENTRATION does not fire when shifts use multiple dimensions', async () => {
      const recs290nsdc = Array.from({ length: 10 }, (_, i) =>
        makeRec290(i, {
          relationshipShifts: i < 5 ? [
            { pairKey: 'A|B', dimension: i % 2 === 0 ? 'affinity' : 'trust', amount: -0.3 },
            { pairKey: 'C|D', dimension: 'power', amount: 0.3 },
          ] : [],
        })
      );
      const res = await runRA290(recs290nsdc);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SHIFT_DIMENSION_CONCENTRATION'), 'SHIFT_DIMENSION_CONCENTRATION should not fire');
    });
  });


  describe('Wave 276 — relationshipArcPass: midpoint freeze, net-zero majority, depth gap', async () => {
    const makeRec276 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 1, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runRA276 = async (records: any[]) => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      return relationshipArcPass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('RELATIONSHIP_MIDPOINT_FREEZE fires when no shifts occur in the middle 50% zone', async () => {
      // n=10; shifts at scenes 0,1 (Act 1) and 7,8 (Act 3); none in [2,6] (middle 50%)
      const recs276a = Array.from({ length: 10 }, (_, i) => makeRec276(i, {
        ...(i === 0 ? { relationshipShifts: [{ pairKey: 'A|B', dimension: 'trust', amount: 0.5 }] } : {}),
        ...(i === 1 ? { relationshipShifts: [{ pairKey: 'A|B', dimension: 'trust', amount: 0.4 }] } : {}),
        ...(i === 7 ? { relationshipShifts: [{ pairKey: 'C|D', dimension: 'trust', amount: -0.3 }] } : {}),
        ...(i === 8 ? { relationshipShifts: [{ pairKey: 'C|D', dimension: 'trust', amount: -0.4 }] } : {}),
      }));
      const result276a = await runRA276(recs276a);
      const freeze276a = result276a.issues.filter((i: any) => i.rule === 'RELATIONSHIP_MIDPOINT_FREEZE');
      assert.ok(freeze276a.length >= 1, `Should detect RELATIONSHIP_MIDPOINT_FREEZE, got: ${JSON.stringify(result276a.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(freeze276a[0].severity, 'minor');
    });

    it('RELATIONSHIP_MIDPOINT_FREEZE does NOT fire when a shift occurs in the middle zone', async () => {
      // n=10; same as fire test but scene 4 (in middle zone [2,6]) also has a shift
      const recs276b = Array.from({ length: 10 }, (_, i) => makeRec276(i, {
        ...(i === 0 ? { relationshipShifts: [{ pairKey: 'A|B', dimension: 'trust', amount: 0.5 }] } : {}),
        ...(i === 1 ? { relationshipShifts: [{ pairKey: 'A|B', dimension: 'trust', amount: 0.4 }] } : {}),
        ...(i === 4 ? { relationshipShifts: [{ pairKey: 'A|B', dimension: 'trust', amount: 0.2 }] } : {}),
        ...(i === 7 ? { relationshipShifts: [{ pairKey: 'C|D', dimension: 'trust', amount: -0.3 }] } : {}),
      }));
      const result276b = await runRA276(recs276b);
      const freeze276b = result276b.issues.filter((i: any) => i.rule === 'RELATIONSHIP_MIDPOINT_FREEZE');
      assert.strictEqual(freeze276b.length, 0, 'Should NOT fire RELATIONSHIP_MIDPOINT_FREEZE when a middle-zone shift exists');
    });

    it('PAIR_NET_ZERO_MAJORITY fires when more than 60% of pairs have near-zero net', async () => {
      // n=8; 3 pairs each with perfectly cancelling shifts → all net=0 → 3/3=100% > 60%
      const recs276c = Array.from({ length: 8 }, (_, i) => makeRec276(i, {
        ...(i === 1 ? { relationshipShifts: [{ pairKey: 'P|Q', dimension: 'trust', amount: 0.3 }] } : {}),
        ...(i === 2 ? { relationshipShifts: [{ pairKey: 'P|Q', dimension: 'trust', amount: -0.3 }] } : {}),
        ...(i === 3 ? { relationshipShifts: [{ pairKey: 'R|S', dimension: 'trust', amount: 0.2 }] } : {}),
        ...(i === 4 ? { relationshipShifts: [{ pairKey: 'R|S', dimension: 'trust', amount: -0.2 }] } : {}),
        ...(i === 5 ? { relationshipShifts: [{ pairKey: 'T|U', dimension: 'trust', amount: -0.4 }] } : {}),
        ...(i === 6 ? { relationshipShifts: [{ pairKey: 'T|U', dimension: 'trust', amount: 0.4 }] } : {}),
      }));
      const result276c = await runRA276(recs276c);
      const nzm276c = result276c.issues.filter((i: any) => i.rule === 'PAIR_NET_ZERO_MAJORITY');
      assert.ok(nzm276c.length >= 1, `Should detect PAIR_NET_ZERO_MAJORITY, got: ${JSON.stringify(result276c.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(nzm276c[0].severity, 'minor');
    });

    it('PAIR_NET_ZERO_MAJORITY does NOT fire when most pairs have a clear directional arc', async () => {
      // n=8; 3 pairs: P|Q net=+0.9, R|S net=-0.6, T|U net=0 → only 1/3=33% net-zero
      const recs276d = Array.from({ length: 8 }, (_, i) => makeRec276(i, {
        ...(i === 1 ? { relationshipShifts: [{ pairKey: 'P|Q', dimension: 'trust', amount: 0.5 }] } : {}),
        ...(i === 2 ? { relationshipShifts: [{ pairKey: 'P|Q', dimension: 'trust', amount: 0.4 }] } : {}),
        ...(i === 3 ? { relationshipShifts: [{ pairKey: 'R|S', dimension: 'trust', amount: -0.6 }] } : {}),
        ...(i === 5 ? { relationshipShifts: [{ pairKey: 'T|U', dimension: 'trust', amount: 0.1 }] } : {}),
        ...(i === 6 ? { relationshipShifts: [{ pairKey: 'T|U', dimension: 'trust', amount: -0.1 }] } : {}),
      }));
      const result276d = await runRA276(recs276d);
      const nzm276d = result276d.issues.filter((i: any) => i.rule === 'PAIR_NET_ZERO_MAJORITY');
      assert.strictEqual(nzm276d.length, 0, 'Should NOT fire PAIR_NET_ZERO_MAJORITY when ≤60% of pairs are net-zero');
    });

    it('RELATIONSHIP_DEPTH_GAP fires when one pair has 3× or more shifts than the second pair', async () => {
      // n=8; M|N: 6 shifts, X|Y: 2 shifts → 6 >= 3×2 → fires
      const recs276e = Array.from({ length: 8 }, (_, i) => makeRec276(i, {
        ...(i === 0 ? { relationshipShifts: [{ pairKey: 'M|N', dimension: 'trust', amount: 0.4 }] } : {}),
        ...(i === 1 ? { relationshipShifts: [{ pairKey: 'M|N', dimension: 'trust', amount: 0.3 }] } : {}),
        ...(i === 2 ? { relationshipShifts: [{ pairKey: 'M|N', dimension: 'trust', amount: -0.3 }] } : {}),
        ...(i === 3 ? { relationshipShifts: [{ pairKey: 'X|Y', dimension: 'trust', amount: 0.3 }] } : {}),
        ...(i === 4 ? { relationshipShifts: [{ pairKey: 'M|N', dimension: 'trust', amount: 0.5 }] } : {}),
        ...(i === 5 ? { relationshipShifts: [{ pairKey: 'M|N', dimension: 'trust', amount: -0.2 }] } : {}),
        ...(i === 6 ? { relationshipShifts: [{ pairKey: 'M|N', dimension: 'trust', amount: 0.4 }] } : {}),
        ...(i === 7 ? { relationshipShifts: [{ pairKey: 'X|Y', dimension: 'trust', amount: -0.3 }] } : {}),
      }));
      const result276e = await runRA276(recs276e);
      const dg276e = result276e.issues.filter((i: any) => i.rule === 'RELATIONSHIP_DEPTH_GAP');
      assert.ok(dg276e.length >= 1, `Should detect RELATIONSHIP_DEPTH_GAP, got: ${JSON.stringify(result276e.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(dg276e[0].severity, 'minor');
    });

    it('RELATIONSHIP_DEPTH_GAP does NOT fire when pairs are comparably developed', async () => {
      // n=8; M|N: 4 shifts, X|Y: 3 shifts → 4/3 < 3 → no fire
      const recs276f = Array.from({ length: 8 }, (_, i) => makeRec276(i, {
        ...(i === 0 ? { relationshipShifts: [{ pairKey: 'M|N', dimension: 'trust', amount: 0.4 }] } : {}),
        ...(i === 1 ? { relationshipShifts: [{ pairKey: 'M|N', dimension: 'trust', amount: 0.3 }] } : {}),
        ...(i === 2 ? { relationshipShifts: [{ pairKey: 'X|Y', dimension: 'trust', amount: 0.3 }] } : {}),
        ...(i === 4 ? { relationshipShifts: [{ pairKey: 'M|N', dimension: 'trust', amount: -0.3 }] } : {}),
        ...(i === 5 ? { relationshipShifts: [{ pairKey: 'X|Y', dimension: 'trust', amount: -0.4 }] } : {}),
        ...(i === 6 ? { relationshipShifts: [{ pairKey: 'M|N', dimension: 'trust', amount: 0.2 }] } : {}),
        ...(i === 7 ? { relationshipShifts: [{ pairKey: 'X|Y', dimension: 'trust', amount: 0.2 }] } : {}),
      }));
      const result276f = await runRA276(recs276f);
      const dg276f = result276f.issues.filter((i: any) => i.rule === 'RELATIONSHIP_DEPTH_GAP');
      assert.strictEqual(dg276f.length, 0, 'Should NOT fire RELATIONSHIP_DEPTH_GAP when pairs are comparably developed');
    });
  });


  describe('Wave 262 — relationshipArcPass: pair oscillation, single-scene arc, weak-shift dominance', async () => {
    const makeRec262 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput262 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: '...',
      records: records as any, structure: {} as any,
      storyContext: {} as any,
      annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('PAIR_OSCILLATION fires when a pair sign flips ≥3 times across ≥4 shifts', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const records262a = [
        makeRec262(0),
        makeRec262(1, { relationshipShifts: [{ pairKey: 'ALICE|BOB', dimension: 'trust', amount: 0.4 }] }),
        makeRec262(2, { relationshipShifts: [{ pairKey: 'ALICE|BOB', dimension: 'trust', amount: -0.4 }] }),
        makeRec262(3, { relationshipShifts: [{ pairKey: 'ALICE|BOB', dimension: 'trust', amount: 0.3 }] }),
        makeRec262(4, { relationshipShifts: [{ pairKey: 'ALICE|BOB', dimension: 'trust', amount: -0.5 }] }),
        makeRec262(5),
      ];
      const result262a = await relationshipArcPass(makeInput262(records262a));
      assert.ok(result262a.issues.some((i: any) => i.rule === 'PAIR_OSCILLATION'), `Expected PAIR_OSCILLATION, got: ${JSON.stringify(result262a.issues.map((i: any) => i.rule))}`);
    });

    it('PAIR_OSCILLATION does NOT fire when sign flips are fewer than 3', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const records262b = [
        makeRec262(0),
        makeRec262(1, { relationshipShifts: [{ pairKey: 'ALICE|BOB', dimension: 'trust', amount: 0.4 }] }),
        makeRec262(2, { relationshipShifts: [{ pairKey: 'ALICE|BOB', dimension: 'trust', amount: 0.3 }] }),
        makeRec262(3, { relationshipShifts: [{ pairKey: 'ALICE|BOB', dimension: 'trust', amount: -0.4 }] }),
        makeRec262(4, { relationshipShifts: [{ pairKey: 'ALICE|BOB', dimension: 'trust', amount: 0.2 }] }),
        makeRec262(5),
      ];
      const result262b = await relationshipArcPass(makeInput262(records262b));
      assert.ok(!result262b.issues.some((i: any) => i.rule === 'PAIR_OSCILLATION'), 'Should NOT fire when sign flips are only 2');
    });

    it('PAIR_SINGLE_SCENE_ARC fires when all ≥3 shifts for a pair occur in the same scene', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const records262c = [
        makeRec262(0),
        makeRec262(1, { relationshipShifts: [
          { pairKey: 'CAROL|DAN', dimension: 'trust', amount: 0.3 },
          { pairKey: 'CAROL|DAN', dimension: 'power', amount: -0.4 },
          { pairKey: 'CAROL|DAN', dimension: 'affinity', amount: 0.2 },
        ]}),
        makeRec262(2), makeRec262(3), makeRec262(4), makeRec262(5),
      ];
      const result262c = await relationshipArcPass(makeInput262(records262c));
      assert.ok(result262c.issues.some((i: any) => i.rule === 'PAIR_SINGLE_SCENE_ARC'), `Expected PAIR_SINGLE_SCENE_ARC, got: ${JSON.stringify(result262c.issues.map((i: any) => i.rule))}`);
    });

    it('PAIR_SINGLE_SCENE_ARC does NOT fire when shifts are distributed across scenes', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const records262d = [
        makeRec262(0, { relationshipShifts: [{ pairKey: 'CAROL|DAN', dimension: 'trust', amount: 0.3 }] }),
        makeRec262(1, { relationshipShifts: [{ pairKey: 'CAROL|DAN', dimension: 'power', amount: -0.4 }] }),
        makeRec262(2, { relationshipShifts: [{ pairKey: 'CAROL|DAN', dimension: 'affinity', amount: 0.2 }] }),
        makeRec262(3), makeRec262(4), makeRec262(5),
      ];
      const result262d = await relationshipArcPass(makeInput262(records262d));
      assert.ok(!result262d.issues.some((i: any) => i.rule === 'PAIR_SINGLE_SCENE_ARC'), 'Should NOT fire when shifts span multiple scenes');
    });

    it('PAIR_WEAK_SHIFT_DOMINANCE fires when ≥4 shifts all have |amount| < 0.2', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const records262e = [
        makeRec262(0),
        makeRec262(1, { relationshipShifts: [{ pairKey: 'EVE|FRANK', dimension: 'trust', amount: 0.1 }] }),
        makeRec262(2, { relationshipShifts: [{ pairKey: 'EVE|FRANK', dimension: 'trust', amount: -0.05 }] }),
        makeRec262(3, { relationshipShifts: [{ pairKey: 'EVE|FRANK', dimension: 'trust', amount: 0.15 }] }),
        makeRec262(4, { relationshipShifts: [{ pairKey: 'EVE|FRANK', dimension: 'trust', amount: -0.1 }] }),
        makeRec262(5),
      ];
      const result262e = await relationshipArcPass(makeInput262(records262e));
      assert.ok(result262e.issues.some((i: any) => i.rule === 'PAIR_WEAK_SHIFT_DOMINANCE'), `Expected PAIR_WEAK_SHIFT_DOMINANCE, got: ${JSON.stringify(result262e.issues.map((i: any) => i.rule))}`);
    });

    it('PAIR_WEAK_SHIFT_DOMINANCE does NOT fire when at least one shift has |amount| ≥ 0.2', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const records262f = [
        makeRec262(0),
        makeRec262(1, { relationshipShifts: [{ pairKey: 'EVE|FRANK', dimension: 'trust', amount: 0.1 }] }),
        makeRec262(2, { relationshipShifts: [{ pairKey: 'EVE|FRANK', dimension: 'trust', amount: -0.05 }] }),
        makeRec262(3, { relationshipShifts: [{ pairKey: 'EVE|FRANK', dimension: 'trust', amount: 0.5 }] }),
        makeRec262(4, { relationshipShifts: [{ pairKey: 'EVE|FRANK', dimension: 'trust', amount: -0.1 }] }),
        makeRec262(5),
      ];
      const result262f = await relationshipArcPass(makeInput262(records262f));
      assert.ok(!result262f.issues.some((i: any) => i.rule === 'PAIR_WEAK_SHIFT_DOMINANCE'), 'Should NOT fire when at least one shift has magnitude ≥ 0.2');
    });
  });


  describe('Wave 248 — relationshipArcPass: pair velocity spike, Act 1 relational desert, multi-pair climax convergence', async () => {
    const makeRec248 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput248 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: '...',
      records: records as any, structure: {} as any,
      storyContext: {} as any,
      annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('PAIR_VELOCITY_SPIKE fires when a pair accumulates ≥3 shifts within a 3-scene window', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const records248a = [
        makeRec248(0), makeRec248(1),
        makeRec248(2, { relationshipShifts: [{ pairKey: 'ALICE|BOB', dimension: 'trust', amount: 0.3 }] }),
        makeRec248(3, { relationshipShifts: [{ pairKey: 'ALICE|BOB', dimension: 'trust', amount: -0.4 }] }),
        makeRec248(4, { relationshipShifts: [{ pairKey: 'ALICE|BOB', dimension: 'trust', amount: 0.2 }] }),
        makeRec248(5), makeRec248(6), makeRec248(7),
      ];
      const result = await relationshipArcPass(makeInput248(records248a));
      assert.ok(result.issues.some((i: any) => i.rule === 'PAIR_VELOCITY_SPIKE'), `Expected PAIR_VELOCITY_SPIKE, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('PAIR_VELOCITY_SPIKE does NOT fire when shifts are spread out', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const records248b = [
        makeRec248(0),
        makeRec248(1, { relationshipShifts: [{ pairKey: 'ALICE|BOB', dimension: 'trust', amount: 0.3 }] }),
        makeRec248(2), makeRec248(3),
        makeRec248(4, { relationshipShifts: [{ pairKey: 'ALICE|BOB', dimension: 'trust', amount: -0.4 }] }),
        makeRec248(5), makeRec248(6),
        makeRec248(7, { relationshipShifts: [{ pairKey: 'ALICE|BOB', dimension: 'trust', amount: 0.2 }] }),
      ];
      const result = await relationshipArcPass(makeInput248(records248b));
      assert.ok(!result.issues.some((i: any) => i.rule === 'PAIR_VELOCITY_SPIKE'), 'Should NOT fire when shifts are spaced across scenes');
    });

    it('RELATIONSHIP_ACT1_DESERT fires when no pair has a shift in the first 25% of scenes', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const records248c = [
        makeRec248(0), makeRec248(1),
        makeRec248(2, { relationshipShifts: [{ pairKey: 'ALICE|BOB', dimension: 'trust', amount: 0.3 }] }),
        makeRec248(3, { relationshipShifts: [{ pairKey: 'CAROL|DAN', dimension: 'power', amount: -0.2 }] }),
        makeRec248(4), makeRec248(5), makeRec248(6), makeRec248(7), makeRec248(8), makeRec248(9),
      ];
      const result = await relationshipArcPass(makeInput248(records248c));
      assert.ok(result.issues.some((i: any) => i.rule === 'RELATIONSHIP_ACT1_DESERT'), `Expected RELATIONSHIP_ACT1_DESERT, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('RELATIONSHIP_ACT1_DESERT does NOT fire when Act 1 has a relationship shift', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const records248d = [
        makeRec248(0, { relationshipShifts: [{ pairKey: 'ALICE|BOB', dimension: 'trust', amount: 0.3 }] }),
        makeRec248(1),
        makeRec248(2, { relationshipShifts: [{ pairKey: 'CAROL|DAN', dimension: 'power', amount: -0.2 }] }),
        makeRec248(3), makeRec248(4), makeRec248(5), makeRec248(6), makeRec248(7), makeRec248(8), makeRec248(9),
      ];
      const result = await relationshipArcPass(makeInput248(records248d));
      assert.ok(!result.issues.some((i: any) => i.rule === 'RELATIONSHIP_ACT1_DESERT'), 'Should NOT fire when Act 1 has a relational event');
    });

    it('MULTI_PAIR_CLIMAX_CONVERGENCE fires when 3+ pairs all resolve in the same Act 3 window', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const records248e = [
        makeRec248(0),
        makeRec248(1, { relationshipShifts: [{ pairKey: 'ALICE|BOB', dimension: 'trust', amount: 0.3 }] }),
        makeRec248(2, { relationshipShifts: [{ pairKey: 'CAROL|DAN', dimension: 'power', amount: -0.2 }] }),
        makeRec248(3, { relationshipShifts: [{ pairKey: 'EVE|FRANK', dimension: 'affinity', amount: 0.1 }] }),
        makeRec248(4), makeRec248(5),
        makeRec248(6, { relationshipShifts: [
          { pairKey: 'ALICE|BOB', dimension: 'trust', amount: -0.5 },
          { pairKey: 'CAROL|DAN', dimension: 'power', amount: 0.3 },
          { pairKey: 'EVE|FRANK', dimension: 'affinity', amount: -0.4 },
        ]}),
        makeRec248(7),
      ];
      const result = await relationshipArcPass(makeInput248(records248e));
      assert.ok(result.issues.some((i: any) => i.rule === 'MULTI_PAIR_CLIMAX_CONVERGENCE'), `Expected MULTI_PAIR_CLIMAX_CONVERGENCE, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('MULTI_PAIR_CLIMAX_CONVERGENCE does NOT fire when pair final shifts are spread across Act 3', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const records248f = [
        makeRec248(0), makeRec248(1), makeRec248(2),
        makeRec248(3, { relationshipShifts: [{ pairKey: 'ALICE|BOB', dimension: 'trust', amount: -0.5 }] }),
        makeRec248(4), makeRec248(5),
        makeRec248(6, { relationshipShifts: [{ pairKey: 'CAROL|DAN', dimension: 'power', amount: 0.3 }] }),
        makeRec248(7, { relationshipShifts: [{ pairKey: 'EVE|FRANK', dimension: 'affinity', amount: -0.2 }] }),
        makeRec248(8), makeRec248(9),
        makeRec248(10, { relationshipShifts: [{ pairKey: 'ALICE|BOB', dimension: 'trust', amount: 0.2 }] }),
      ];
      const result = await relationshipArcPass(makeInput248(records248f));
      assert.ok(!result.issues.some((i: any) => i.rule === 'MULTI_PAIR_CLIMAX_CONVERGENCE'), 'Should NOT fire when pair final shifts are staggered');
    });
  });


  describe('Wave 220 — relationshipArcPass: star topology, amplitude decay, threads siloed (relational network physics)', async () => {
    const makeRec220 = (idx: number, shifts: any[] = []): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 1, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: shifts, seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
    });
    const makeInput220 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: 'INT. SC - DAY\nAction line.\n',
      records: records as any, structure: {} as any,
      storyContext: {} as any, annotations: records.map(() => null) as any,
      approvedSpans: [],
    });
    const sh = (pairKey: string, amount: number, dimension = 'trust') => ({ pairKey, dimension, amount });

    it('RELATIONSHIP_STAR_TOPOLOGY fires when every pair routes through one hub character', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      // alice is in all three pairs; bob, carol, dave have no lateral bonds
      const records = [
        makeRec220(0, [sh('alice|bob', 0.5)]),
        makeRec220(1, [sh('alice|carol', 0.5)]),
        makeRec220(2, [sh('alice|dave', 0.5)]),
        makeRec220(3),
        makeRec220(4),
        makeRec220(5),
      ];
      const result = await relationshipArcPass(makeInput220(records));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'RELATIONSHIP_STAR_TOPOLOGY'),
        'Should fire when all shifting pairs share a single common node',
      );
    });

    it('RELATIONSHIP_STAR_TOPOLOGY does not fire when the cast has lateral bonds', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      // A triangle: alice|bob, alice|carol, bob|carol → no universal hub
      const records = [
        makeRec220(0, [sh('alice|bob', 0.5)]),
        makeRec220(1, [sh('alice|carol', 0.5)]),
        makeRec220(2, [sh('bob|carol', 0.5)]),
        makeRec220(3),
        makeRec220(4),
        makeRec220(5),
      ];
      const result = await relationshipArcPass(makeInput220(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'RELATIONSHIP_STAR_TOPOLOGY'),
        'Should NOT fire when secondary characters relate to each other, not only the hub',
      );
    });

    it('RELATIONSHIP_AMPLITUDE_DECAY fires when a pair swings hard early then barely moves', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      // alice|bob magnitudes: 0.8, 0.7 (early) then 0.2, 0.1 (late) → late avg < half early
      const records = [
        makeRec220(0, [sh('alice|bob', 0.8)]),
        makeRec220(1, [sh('alice|bob', 0.7)]),
        makeRec220(2, [sh('alice|bob', 0.2)]),
        makeRec220(3, [sh('alice|bob', 0.1)]),
        makeRec220(4),
        makeRec220(5),
        makeRec220(6),
        makeRec220(7),
      ];
      const result = await relationshipArcPass(makeInput220(records));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'RELATIONSHIP_AMPLITUDE_DECAY'),
        'Should fire when a pair\'s later shift magnitudes are below half its early ones',
      );
    });

    it('RELATIONSHIP_AMPLITUDE_DECAY does not fire when shift magnitudes hold steady', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const records = [
        makeRec220(0, [sh('alice|bob', 0.5)]),
        makeRec220(1, [sh('alice|bob', 0.5)]),
        makeRec220(2, [sh('alice|bob', 0.5)]),
        makeRec220(3, [sh('alice|bob', 0.5)]),
        makeRec220(4),
        makeRec220(5),
        makeRec220(6),
        makeRec220(7),
      ];
      const result = await relationshipArcPass(makeInput220(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'RELATIONSHIP_AMPLITUDE_DECAY'),
        'Should NOT fire when a pair sustains its shift magnitude across the story',
      );
    });

    it('RELATIONSHIP_THREADS_SILOED fires when no scene advances two pairs at once', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      // alice|bob moves in scenes 0,2; alice|carol in scenes 4,6 — never together
      const records = [
        makeRec220(0, [sh('alice|bob', 0.5)]),
        makeRec220(1),
        makeRec220(2, [sh('alice|bob', -0.4)]),
        makeRec220(3),
        makeRec220(4, [sh('alice|carol', 0.5)]),
        makeRec220(5),
        makeRec220(6, [sh('alice|carol', -0.4)]),
        makeRec220(7),
      ];
      const result = await relationshipArcPass(makeInput220(records));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'RELATIONSHIP_THREADS_SILOED'),
        'Should fire when two relationships never shift in the same scene',
      );
    });

    it('RELATIONSHIP_THREADS_SILOED does not fire when two pairs shift in the same scene', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      // Scene 0 advances both pairs together → threads intersect
      const records = [
        makeRec220(0, [sh('alice|bob', 0.5), sh('alice|carol', -0.5)]),
        makeRec220(1),
        makeRec220(2, [sh('alice|bob', -0.4)]),
        makeRec220(3),
        makeRec220(4, [sh('alice|carol', 0.5)]),
        makeRec220(5),
        makeRec220(6),
        makeRec220(7),
      ];
      const result = await relationshipArcPass(makeInput220(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'RELATIONSHIP_THREADS_SILOED'),
        'Should NOT fire when at least one scene advances two relationships together',
      );
    });
  });


  describe('Wave 203 — relationshipArcPass: third-act escalation absent, rapid reconciliation, payoff abandoned', async () => {
    const makeRec203 = (idx: number, overrides: any = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'establish_world', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0,
      emotionalShift: 'neutral', suspenseDelta: 0,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
      ...overrides,
    });
    const relInput203 = (recs: any[]) => ({
      fountain: 'INT. SC0 - DAY\n\nOpening scene.\n',
      original: 'INT. SC0 - DAY\n\nOpening scene.\n',
      records: recs as any,
      structure: {} as any, annotations: [], approvedSpans: [],
    });

    // ── RELATIONSHIP_THIRD_ACT_ESCALATION_ABSENT ─────────────────────────────
    it('relationshipArcPass detects RELATIONSHIP_THIRD_ACT_ESCALATION_ABSENT when no shifts in Act 3', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      // n=8, shifts at scenes 0(+0.5), 2(-0.3), 4(+0.6); act3=[6,7] empty
      const recs = Array.from({ length: 8 }, (_, i) => makeRec203(i));
      recs[0] = makeRec203(0, { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'power', amount: 0.5 }] });
      recs[1] = makeRec203(1, { suspenseDelta: 2 }); // prevent UNEARNED_REVERSAL at scene 2
      recs[2] = makeRec203(2, { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'power', amount: -0.3 }] });
      recs[4] = makeRec203(4, { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'power', amount: 0.6 }] });
      const result = await relationshipArcPass(relInput203(recs));
      const issues = result.issues.filter(i => i.rule === 'RELATIONSHIP_THIRD_ACT_ESCALATION_ABSENT');
      assert.ok(issues.length >= 1, `Should detect RELATIONSHIP_THIRD_ACT_ESCALATION_ABSENT; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(issues[0].severity === 'major');
    });

    it('relationshipArcPass does NOT fire RELATIONSHIP_THIRD_ACT_ESCALATION_ABSENT when Act 3 has a shift', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      // n=8, same as above but add shift at scene 6 (in act3)
      const recs = Array.from({ length: 8 }, (_, i) => makeRec203(i));
      recs[0] = makeRec203(0, { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'power', amount: 0.5 }] });
      recs[1] = makeRec203(1, { suspenseDelta: 2 });
      recs[2] = makeRec203(2, { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'power', amount: -0.3 }] });
      recs[4] = makeRec203(4, { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'power', amount: 0.6 }] });
      recs[6] = makeRec203(6, { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'power', amount: 0.2 }] });
      const result = await relationshipArcPass(relInput203(recs));
      assert.ok(
        !result.issues.some(i => i.rule === 'RELATIONSHIP_THIRD_ACT_ESCALATION_ABSENT'),
        'Should NOT fire when Act 3 contains a relationship shift',
      );
    });

    // ── RAPID_RECONCILIATION ─────────────────────────────────────────────────
    it('relationshipArcPass detects RAPID_RECONCILIATION when a pair heals within 2 scenes with no tension', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      // n=6, rupture at scene 1 (-0.6), recovery at scene 2 (+0.8), dist=1, no intermediate tension
      const recs = Array.from({ length: 6 }, (_, i) => makeRec203(i));
      recs[1] = makeRec203(1, { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'power', amount: -0.6 }] });
      recs[2] = makeRec203(2, { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'power', amount: 0.8 }] });
      const result = await relationshipArcPass(relInput203(recs));
      const issues = result.issues.filter(i => i.rule === 'RAPID_RECONCILIATION');
      assert.ok(issues.length >= 1, `Should detect RAPID_RECONCILIATION; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(issues[0].severity === 'minor');
    });

    it('relationshipArcPass does NOT fire RAPID_RECONCILIATION when recovery is spaced 4 scenes away', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      // n=6, rupture at scene 1 (-0.6), recovery at scene 5 (+0.8), dist=4 > 2
      const recs = Array.from({ length: 6 }, (_, i) => makeRec203(i));
      recs[1] = makeRec203(1, { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'power', amount: -0.6 }] });
      recs[4] = makeRec203(4, { suspenseDelta: 2 }); // prevent UNEARNED_REVERSAL
      recs[5] = makeRec203(5, { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'power', amount: 0.8 }] });
      const result = await relationshipArcPass(relInput203(recs));
      assert.ok(
        !result.issues.some(i => i.rule === 'RAPID_RECONCILIATION'),
        'Should NOT fire when recovery is 4 scenes after rupture',
      );
    });

    // ── RELATIONSHIP_PAYOFF_ABANDONED ─────────────────────────────────────────
    it('relationshipArcPass detects RELATIONSHIP_PAYOFF_ABANDONED when strong early arc vanishes in final 40%', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      // n=10, shifts at scenes 0(+0.5),1(-0.2),3(+0.6) → net=0.9>=0.8 in first 60%; none in scenes 6-9
      const recs = Array.from({ length: 10 }, (_, i) => makeRec203(i));
      recs[0] = makeRec203(0, { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'power', amount: 0.5 }] });
      recs[1] = makeRec203(1, { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'power', amount: -0.2 }] });
      recs[3] = makeRec203(3, { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'power', amount: 0.6 }] });
      const result = await relationshipArcPass(relInput203(recs));
      const issues = result.issues.filter(i => i.rule === 'RELATIONSHIP_PAYOFF_ABANDONED');
      assert.ok(issues.length >= 1, `Should detect RELATIONSHIP_PAYOFF_ABANDONED; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(issues[0].severity === 'major');
    });

    it('relationshipArcPass does NOT fire RELATIONSHIP_PAYOFF_ABANDONED when arc continues into final act', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      // n=10, same early shifts plus one at scene 7 (in final 40% = scenes 6-9)
      const recs = Array.from({ length: 10 }, (_, i) => makeRec203(i));
      recs[0] = makeRec203(0, { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'power', amount: 0.5 }] });
      recs[1] = makeRec203(1, { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'power', amount: -0.2 }] });
      recs[3] = makeRec203(3, { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'power', amount: 0.6 }] });
      recs[7] = makeRec203(7, { relationshipShifts: [{ pairKey: 'Alice|Bob', dimension: 'power', amount: 0.2 }] });
      const result = await relationshipArcPass(relInput203(recs));
      assert.ok(
        !result.issues.some(i => i.rule === 'RELATIONSHIP_PAYOFF_ABANDONED'),
        'Should NOT fire when arc has a shift in the final 40%',
      );
    });
  });


  describe('Wave 161 — relationshipArcPass: single pair, late introduction, velocity collapse', async () => {
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

    it('relationshipArcPass detects SINGLE_PAIR_RELATIONSHIP when all shifts involve same pair', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      // 7 records, 5+ shifts all between alice|bob
      const records = Array.from({ length: 7 }, (_, i) =>
        makeRec(i, {
          relationshipShifts: i < 5
            ? [{ pairKey: 'alice|bob', dimension: 'trust', amount: i % 2 === 0 ? 0.3 : -0.3 }]
            : [],
        }),
      );
      const result = await relationshipArcPass({
        fountain: blankFountain(7), original: blankFountain(7),
        records: records as any, structure: {} as any,
        annotations: [], approvedSpans: [],
      });
      const single = result.issues.filter(i => i.rule === 'SINGLE_PAIR_RELATIONSHIP');
      assert.ok(single.length >= 1, `Should detect SINGLE_PAIR_RELATIONSHIP; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(single[0].severity === 'minor');
    });

    it('relationshipArcPass does NOT fire SINGLE_PAIR_RELATIONSHIP when multiple pairs shift', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      const records = Array.from({ length: 7 }, (_, i) =>
        makeRec(i, {
          relationshipShifts: i < 4
            ? [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.3 }]
            : i < 6
            ? [{ pairKey: 'alice|carol', dimension: 'trust', amount: -0.4 }] // second pair
            : [],
        }),
      );
      const result = await relationshipArcPass({
        fountain: blankFountain(7), original: blankFountain(7),
        records: records as any, structure: {} as any,
        annotations: [], approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'SINGLE_PAIR_RELATIONSHIP'),
        'Should NOT fire when multiple pairs have shifts',
      );
    });

    it('relationshipArcPass detects LATE_RELATIONSHIP_INTRODUCTION when pair first shifts after midpoint', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      // 10 records, midpoint=5, alice|bob first appears at scene 6
      const records = Array.from({ length: 10 }, (_, i) =>
        makeRec(i, {
          relationshipShifts: i >= 6 && i <= 8
            ? [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.4 }]
            : [],
        }),
      );
      const result = await relationshipArcPass({
        fountain: blankFountain(10), original: blankFountain(10),
        records: records as any, structure: {} as any,
        annotations: [], approvedSpans: [],
      });
      const late = result.issues.filter(i => i.rule === 'LATE_RELATIONSHIP_INTRODUCTION');
      assert.ok(late.length >= 1, `Should detect LATE_RELATIONSHIP_INTRODUCTION; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(late[0].severity === 'major');
    });

    it('relationshipArcPass does NOT fire LATE_RELATIONSHIP_INTRODUCTION when pair starts early', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      // pair starts at scene 2 (before midpoint=5)
      const records = Array.from({ length: 10 }, (_, i) =>
        makeRec(i, {
          relationshipShifts: i >= 2 && i <= 4
            ? [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.4 }]
            : [],
        }),
      );
      const result = await relationshipArcPass({
        fountain: blankFountain(10), original: blankFountain(10),
        records: records as any, structure: {} as any,
        annotations: [], approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'LATE_RELATIONSHIP_INTRODUCTION'),
        'Should NOT fire when pair relationship begins before the midpoint',
      );
    });

    it('relationshipArcPass detects RELATIONSHIP_VELOCITY_COLLAPSE when second half has no shifts', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      // 10 records, midpoint=5. Shifts only in scenes 0-3 (first half), none in 5-9.
      const records = Array.from({ length: 10 }, (_, i) =>
        makeRec(i, {
          relationshipShifts: i < 4
            ? [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.3 }]
            : [],
        }),
      );
      const result = await relationshipArcPass({
        fountain: blankFountain(10), original: blankFountain(10),
        records: records as any, structure: {} as any,
        annotations: [], approvedSpans: [],
      });
      const collapse = result.issues.filter(i => i.rule === 'RELATIONSHIP_VELOCITY_COLLAPSE');
      assert.ok(collapse.length >= 1, `Should detect RELATIONSHIP_VELOCITY_COLLAPSE; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(collapse[0].severity === 'major');
    });

    it('relationshipArcPass does NOT fire RELATIONSHIP_VELOCITY_COLLAPSE when second half has shifts', async () => {
      const { relationshipArcPass } = await import('../../server/nvm/revision/passes/relationship-arc.ts');
      // Shifts in both halves
      const records = Array.from({ length: 10 }, (_, i) =>
        makeRec(i, {
          relationshipShifts: (i < 4 || i === 7)
            ? [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.3 }]
            : [],
        }),
      );
      const result = await relationshipArcPass({
        fountain: blankFountain(10), original: blankFountain(10),
        records: records as any, structure: {} as any,
        annotations: [], approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'RELATIONSHIP_VELOCITY_COLLAPSE'),
        'Should NOT fire when second half contains relationship shifts',
      );
    });
  });


describe('Wave 134 — Relationship Arc Pass', () => {

  it('flags NO_RELATIONSHIP_MOVEMENT when a 5+ scene story has zero shifts', async () => {
    const records: ScreenplaySceneRecord[] = Array.from({ length: 6 }, (_, i) =>
      makeSceneRecord({ sceneIdx: i, slug: `INT. ROOM ${i}`, relationshipShifts: [] }));
    const result = await relationshipArcPass(makeMinimalInput({ records }));
    assert.ok(
      result.issues.some(i => i.rule === 'NO_RELATIONSHIP_MOVEMENT'),
      'static multi-scene story should flag idle emotional engine',
    );
  });

  it('flags MONOTONE_RELATIONSHIP when a pair only ever warms', async () => {
    const records: ScreenplaySceneRecord[] = Array.from({ length: 4 }, (_, i) =>
      makeSceneRecord({
        sceneIdx: i, slug: `INT. ROOM ${i}`,
        relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.2 }],
      }));
    const result = await relationshipArcPass(makeMinimalInput({ records }));
    assert.ok(
      result.issues.some(i => i.rule === 'MONOTONE_RELATIONSHIP'),
      'one-directional bond should flag monotone',
    );
  });

  it('does NOT flag monotone when a pair has a reversal', async () => {
    const records: ScreenplaySceneRecord[] = [
      makeSceneRecord({ sceneIdx: 0, relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.3 }] }),
      makeSceneRecord({ sceneIdx: 1, relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.3 }] }),
      makeSceneRecord({ sceneIdx: 2, relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: -0.4 }] }),
    ];
    const result = await relationshipArcPass(makeMinimalInput({ records }));
    assert.ok(
      !result.issues.some(i => i.rule === 'MONOTONE_RELATIONSHIP'),
      'bond with a reversal should not be flagged monotone',
    );
  });

  it('flags STATIC_RELATIONSHIP when shifts cancel to zero net', async () => {
    const records: ScreenplaySceneRecord[] = [
      makeSceneRecord({ sceneIdx: 0, relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.3 }] }),
      makeSceneRecord({ sceneIdx: 1, relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: -0.3 }] }),
      makeSceneRecord({ sceneIdx: 2, relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.0 }] }),
    ];
    const result = await relationshipArcPass(makeMinimalInput({ records }));
    // net trust = 0 across 3 shifts → static (runs in place)
    assert.ok(
      result.issues.some(i => i.rule === 'STATIC_RELATIONSHIP'),
      'net-zero recurring relationship should flag static',
    );
  });

  it('passes a healthy relationship with net movement and a reversal', async () => {
    const records: ScreenplaySceneRecord[] = [
      makeSceneRecord({ sceneIdx: 0, relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.4 }] }),
      makeSceneRecord({ sceneIdx: 1, relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: -0.2 }] }),
      makeSceneRecord({ sceneIdx: 2, relationshipShifts: [{ pairKey: 'alice|bob', dimension: 'trust', amount: 0.5 }] }),
    ];
    const result = await relationshipArcPass(makeMinimalInput({ records }));
    // has reversal (not monotone) AND net +0.7 (not static)
    assert.equal(result.issues.length, 0, 'healthy evolving bond should pass clean');
  });

  it('memory builder populates relationshipShifts from SHIFT_RELATIONSHIP ops', () => {
    const commits = [makeScreenplayCommit(0, [
      { op: 'SHIFT_RELATIONSHIP', pair: ['bob', 'alice'], delta: { dimension: 'trust', amount: -0.5, reason: 'betrayal' } },
    ])];
    const records = buildScreenplayMemory(commits);
    assert.equal(records[0].relationshipShifts?.length, 1);
    // pair key is sorted alphabetically
    assert.equal(records[0].relationshipShifts?.[0].pairKey, 'alice|bob');
    assert.equal(records[0].relationshipShifts?.[0].amount, -0.5);
  });

});