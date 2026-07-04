// Extracted from the former monolithic test.ts (audit M2.1 — split for maintainability).
// rhythmPass revision-rule tests. Shared imports/helpers below are duplicated verbatim across every split
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


  // ── Wave 151: Rhythm pass enhancements ────────────────────────────────────
  describe('Wave 151 — rhythmPass: camera direction, adverb clustering, over-description', async () => {
    const blankRec = (idx: number): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'dialogue', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [], payoffSetupIds: [],
      visualBeats: [], relationshipShifts: [],
    });

    it('rhythmPass detects CAMERA_DIRECTION_OVERREACH for 2+ camera direction uses', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      const fountain = `INT. STREET - DAY
We see Alice walking toward the building.

She hesitates.

The camera pulls back to reveal the entire block is on fire.

We follow her as she runs to safety.

We see smoke rising above the rooftops.

She stops.
`;
      const result = await rhythmPass({
        fountain, original: fountain,
        records: [blankRec(0)] as any, structure: {} as any, annotations: [], approvedSpans: [],
      });
      const cam = result.issues.filter(i => i.rule === 'CAMERA_DIRECTION_OVERREACH');
      assert.ok(cam.length >= 1, 'Should detect CAMERA_DIRECTION_OVERREACH for multiple "we see/camera" uses');
      assert.ok(cam[0].severity === 'minor');
    });

    it('rhythmPass does NOT fire CAMERA_DIRECTION_OVERREACH when no camera directions present', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      const fountain = `INT. STREET - DAY
Alice walks toward the building.

She hesitates at the entrance.

Smoke rises above the rooftops across the street.

She turns and runs.
`;
      const result = await rhythmPass({
        fountain, original: fountain,
        records: [blankRec(0)] as any, structure: {} as any, annotations: [], approvedSpans: [],
      });
      const cam = result.issues.filter(i => i.rule === 'CAMERA_DIRECTION_OVERREACH');
      assert.ok(cam.length === 0, 'Should NOT fire when no camera directions present');
    });

    it('rhythmPass detects ADVERB_CLUSTERING for line with 3+ adverbs', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      const fountain = `INT. ROOM - DAY
She moves slowly, carefully, deliberately across the room, quietly closing the door.

He watches her intently.

She nods.

He sighs.

She leaves.

He sits.

He waits.

He breathes.
`;
      const result = await rhythmPass({
        fountain, original: fountain,
        records: [blankRec(0)] as any, structure: {} as any, annotations: [], approvedSpans: [],
      });
      const adv = result.issues.filter(i => i.rule === 'ADVERB_CLUSTERING');
      assert.ok(adv.length >= 1, 'Should detect ADVERB_CLUSTERING for 3+ adverbs in one line');
      assert.ok(adv[0].severity === 'minor');
    });

    it('rhythmPass detects OVER_DESCRIPTION for character with 4+ physical adjectives', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      // Needs 4+ action lines to pass the early-exit guard
      const fountain = `INT. PRECINCT - DAY
DETECTIVE COLE enters. He is a tall, lean, weathered, scarred, tired man with sharp angular features.

The room is quiet.

Papers cover the desk.

A phone sits on the corner.

He sits down in the chair.
`;
      const result = await rhythmPass({
        fountain, original: fountain,
        records: [blankRec(0)] as any, structure: {} as any, annotations: [], approvedSpans: [],
      });
      const desc = result.issues.filter(i => i.rule === 'OVER_DESCRIPTION');
      assert.ok(desc.length >= 1, 'Should detect OVER_DESCRIPTION for 4+ physical adjectives');
      assert.ok(desc[0].severity === 'minor');
    });
  });


  // ── Wave 170: Rhythm pass enhancements ────────────────────────────────────
  describe('Wave 170 — rhythmPass: opening-word repetition, sensory imbalance, near-word repeat', async () => {
    // ── OPENING_WORD_REPETITION ───────────────────────────────────────────────
    it('rhythmPass detects OPENING_WORD_REPETITION when >40% of action lines start with same word', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      // 10 action lines; 5 start with "He" (50% > 40%)
      const lines = [
        'He walks to the window.', 'He turns around slowly.', 'He looks at his watch.',
        'He picks up the phone.', 'He pauses by the door.',
        'Alice crosses the room.', 'The light flickers once.', 'She opens the drawer.',
        'Rain hits the glass.', 'Footsteps echo outside.',
      ];
      const fountain = `INT. OFFICE - DAY\n\n${lines.join('\n')}\n`;
      const { issues } = await rhythmPass({
        fountain, records: [] as any, approvedSpans: [],
        storyContext: undefined as any, priorPassResults: [],
      } as any);
      assert.ok(
        issues.some(i => i.rule === 'OPENING_WORD_REPETITION'),
        `Expected OPENING_WORD_REPETITION; got: ${issues.map(i => i.rule).join(', ')}`,
      );
    });

    it('rhythmPass does NOT fire OPENING_WORD_REPETITION when first words are varied', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      const lines = [
        'He walks to the window.', 'She turns around slowly.', 'Alice looks at her watch.',
        'The phone rings twice.', 'Outside rain hammers the glass.',
        'Bob crosses the room quickly.', 'Sunlight cuts through the blinds.',
        'Footsteps echo in the hall.', 'The door swings open.',  'Carol freezes.',
      ];
      const fountain = `INT. OFFICE - DAY\n\n${lines.join('\n')}\n`;
      const { issues } = await rhythmPass({
        fountain, records: [] as any, approvedSpans: [],
        storyContext: undefined as any, priorPassResults: [],
      } as any);
      assert.ok(
        !issues.some(i => i.rule === 'OPENING_WORD_REPETITION'),
        'Should NOT fire when action line openings are varied',
      );
    });

    // ── SENSORY_IMBALANCE ─────────────────────────────────────────────────────
    it('rhythmPass detects SENSORY_IMBALANCE when 10+ action lines have no sound descriptors', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      // 10 purely visual action lines — no sound words
      const lines = Array.from({ length: 10 }, (_, i) =>
        `She moves across the room to position number ${i + 1}.`,
      );
      const fountain = `INT. OFFICE - DAY\n\n${lines.join('\n')}\n`;
      const { issues } = await rhythmPass({
        fountain, records: [] as any, approvedSpans: [],
        storyContext: undefined as any, priorPassResults: [],
      } as any);
      assert.ok(
        issues.some(i => i.rule === 'SENSORY_IMBALANCE'),
        `Expected SENSORY_IMBALANCE; got: ${issues.map(i => i.rule).join(', ')}`,
      );
    });

    it('rhythmPass does NOT fire SENSORY_IMBALANCE when action lines include sound descriptors', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      const lines = [
        ...Array.from({ length: 9 }, (_, i) => `She moves to position ${i + 1}.`),
        'A sharp click breaks the silence.',  // sound word present
      ];
      const fountain = `INT. OFFICE - DAY\n\n${lines.join('\n')}\n`;
      const { issues } = await rhythmPass({
        fountain, records: [] as any, approvedSpans: [],
        storyContext: undefined as any, priorPassResults: [],
      } as any);
      assert.ok(
        !issues.some(i => i.rule === 'SENSORY_IMBALANCE'),
        'Should NOT fire when at least one action line contains a sound descriptor',
      );
    });

    // ── NEAR_WORD_REPEAT ─────────────────────────────────────────────────────
    it('rhythmPass detects NEAR_WORD_REPEAT when a content word appears 4+ times in 5-line window', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      // "window" appears 4 times in the first 5 action lines
      const lines = [
        'He walks to the window.',
        'She looks through the window.',
        'The window reflects the street below.',
        'He opens the window slowly.',
        'Something moves past the window.',
        'She steps back into the room.',
        'The clock on the wall ticks.',
        'He sits at the desk again.',
      ];
      const fountain = `INT. OFFICE - DAY\n\n${lines.join('\n')}\n`;
      const { issues } = await rhythmPass({
        fountain, records: [] as any, approvedSpans: [],
        storyContext: undefined as any, priorPassResults: [],
      } as any);
      assert.ok(
        issues.some(i => i.rule === 'NEAR_WORD_REPEAT'),
        `Expected NEAR_WORD_REPEAT; got: ${issues.map(i => i.rule).join(', ')}`,
      );
    });

    it('rhythmPass does NOT fire NEAR_WORD_REPEAT when content words are varied across lines', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      const lines = [
        'He crosses to the window.',
        'She examines the photograph.',
        'The clock reads midnight exactly.',
        'He reaches for his jacket.',
        'She unlocks the cabinet carefully.',
        'He reads through the contract.',
        'She places the folder down.',
        'He picks up the briefcase.',
      ];
      const fountain = `INT. OFFICE - DAY\n\n${lines.join('\n')}\n`;
      const { issues } = await rhythmPass({
        fountain, records: [] as any, approvedSpans: [],
        storyContext: undefined as any, priorPassResults: [],
      } as any);
      assert.ok(
        !issues.some(i => i.rule === 'NEAR_WORD_REPEAT'),
        'Should NOT fire when content words are varied across the action lines',
      );
    });
  });


  describe('Wave 184 — rhythmPass: abstract noun overload, filler gestures, gerund fragments', async () => {
    const blankRec = (idx: number): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'dialogue', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [], payoffSetupIds: [],
      visualBeats: [], relationshipShifts: [],
    });

    // ABSTRACT_NOUN_OVERLOAD — fires
    it('ABSTRACT_NOUN_OVERLOAD fires when >30% of action lines name psychological states', async () => {
      const fountain = `INT. OFFICE - DAY
Her feeling of grief is overwhelming.

She stares at the wall.

The longing in her eyes is unmistakable.

She sits down.

His anxiety fills the room.

He straightens his tie.

Her despair builds as the silence continues.

She looks away.

He fidgets with his pen.

She opens the window.
`;
      const result = await rhythmPass({ fountain, original: fountain, records: [blankRec(0)], structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(
        result.issues.some(i => i.rule === 'ABSTRACT_NOUN_OVERLOAD'),
        `Expected ABSTRACT_NOUN_OVERLOAD, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // ABSTRACT_NOUN_OVERLOAD — no-fire
    it('ABSTRACT_NOUN_OVERLOAD does not fire when action lines are concrete', async () => {
      const fountain = `INT. OFFICE - DAY
She grips the pen until her knuckles whiten.

He crosses to the window and pushes it open.

She tears the letter in half.

He stacks the files into a neat tower.

The tower collapses.

She sweeps it off the desk.

He watches from the doorway.

She leaves without looking back.
`;
      const result = await rhythmPass({ fountain, original: fountain, records: [blankRec(0)], structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(
        !result.issues.some(i => i.rule === 'ABSTRACT_NOUN_OVERLOAD'),
        `Expected no ABSTRACT_NOUN_OVERLOAD, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // FILLER_GESTURE_EXCESS — fires
    it('FILLER_GESTURE_EXCESS fires when filler gestures exceed threshold', async () => {
      const fountain = `INT. KITCHEN - DAY
Alice nods.

She sighs and looks away.

He shrugs.

She nods again.

He fidgets with his keys.

She sighs once more.

He shrugs and steps back.

She pours a glass of water.
`;
      const result = await rhythmPass({ fountain, original: fountain, records: [blankRec(0)], structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(
        result.issues.some(i => i.rule === 'FILLER_GESTURE_EXCESS'),
        `Expected FILLER_GESTURE_EXCESS, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // FILLER_GESTURE_EXCESS — no-fire
    it('FILLER_GESTURE_EXCESS does not fire when gestures are rare', async () => {
      const fountain = `INT. KITCHEN - DAY
Alice pours coffee into a cracked mug.

She sets it down without drinking.

He pulls a chair out and sits.

She opens the refrigerator, stares inside, closes it.

He nods.

She slides the envelope across the table.

He picks it up and reads.

She leaves.
`;
      const result = await rhythmPass({ fountain, original: fountain, records: [blankRec(0)], structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(
        !result.issues.some(i => i.rule === 'FILLER_GESTURE_EXCESS'),
        `Expected no FILLER_GESTURE_EXCESS, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // GERUND_FRAGMENT_CHAIN — fires
    it('GERUND_FRAGMENT_CHAIN fires when >30% of action lines start with gerunds', async () => {
      const fountain = `INT. CORRIDOR - NIGHT
Walking toward the exit.

Pushing the door open.

Running down the stairs.

Reaching for her phone.

She dials a number.

Waiting for an answer.

Pressing herself against the wall.

She holds her breath.

Looking back over her shoulder.

She keeps moving.
`;
      const result = await rhythmPass({ fountain, original: fountain, records: [blankRec(0)], structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(
        result.issues.some(i => i.rule === 'GERUND_FRAGMENT_CHAIN'),
        `Expected GERUND_FRAGMENT_CHAIN, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // GERUND_FRAGMENT_CHAIN — no-fire
    it('GERUND_FRAGMENT_CHAIN does not fire when gerund fragments are rare', async () => {
      const fountain = `INT. CORRIDOR - NIGHT
She walks toward the exit.

He pushes the door open.

She runs down the stairs.

He reaches for his phone.

She dials a number.

He waits for an answer.

She presses herself against the wall.

Running now, she turns the corner.
`;
      const result = await rhythmPass({ fountain, original: fountain, records: [blankRec(0)], structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(
        !result.issues.some(i => i.rule === 'GERUND_FRAGMENT_CHAIN'),
        `Expected no GERUND_FRAGMENT_CHAIN, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });
  });


  describe('Wave 235 — rhythmPass: declarative pile, simultaneous-action absent, motion-verb overload', async () => {
    const makeFountain235 = (lines: string[]) =>
      'INT. ROOM - DAY\n\n' + lines.join('\n') + '\n';

    it('DECLARATIVE_PILE fires when >70% of action lines are flat declaratives', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      // All 10 lines: no comma, no dash, no subordinating conjunction → 100% flat
      const lines235a = [
        'Alice checks the door handle.',
        'Bob reads the label on the canister.',
        'She grips the metal rail.',
        'The old clock ticks on the shelf.',
        'He stacks the folders.',
        'The overhead light dims.',
        'She scans the countertop.',
        'He opens the wide drawer.',
        'The snap of the latch rings out.',
        'She faces the window.',
      ];
      const f235a = makeFountain235(lines235a);
      const result = await rhythmPass({
        fountain: f235a, original: f235a,
        records: [] as any, structure: {} as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'DECLARATIVE_PILE');
      assert.ok(match.length >= 1, `Expected DECLARATIVE_PILE, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('DECLARATIVE_PILE does NOT fire when many lines have subordinating clauses or punctuation', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      // 4 of 10 lines are flat declaratives → 40% < 70%
      const lines235b = [
        'When she opens the door, light floods in.',
        'Bob reads the final paragraph before he speaks.',
        'She grips the metal railing, steadying herself.',
        'The old clock ticks.',
        'He stacks the folders.',
        'Although the room seems quiet, unease settles.',
        'She turns while he watches from the corner.',
        'He opens the lower drawer.',
        'The bolt snaps.',
        'After she checks it, she steps aside.',
      ];
      const f235b = makeFountain235(lines235b);
      const result = await rhythmPass({
        fountain: f235b, original: f235b,
        records: [] as any, structure: {} as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'DECLARATIVE_PILE');
      assert.strictEqual(match.length, 0, 'Should NOT fire when many lines have subordinating clauses');
    });

    it('SIMULTANEOUS_ACTION_ABSENT fires when 12+ action lines lack simultaneous markers', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      // 12 lines, no "while", "even as", or "at the same time"
      const lines235c = [
        'Alice checks the door.',
        'Bob reads the lengthy crime report.',
        'She grips.',
        'The old lock snaps open.',
        'He steps into the hallway.',
        'She drops the envelope on the counter.',
        'Bob stares at his watch.',
        'He crosses to the window on the far side.',
        'She reaches.',
        'Alice looks at the stain on the floor.',
        'He backs toward the door.',
        'She closes her eyes.',
      ];
      const f235c = makeFountain235(lines235c);
      const result = await rhythmPass({
        fountain: f235c, original: f235c,
        records: [] as any, structure: {} as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'SIMULTANEOUS_ACTION_ABSENT');
      assert.ok(match.length >= 1, `Expected SIMULTANEOUS_ACTION_ABSENT, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('SIMULTANEOUS_ACTION_ABSENT does NOT fire when at least one line uses "while"', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      // 12 lines, first line has "while" → simultaneous marker present
      const lines235d = [
        'Alice checks the door while Bob watches.',
        'She reads the report before she speaks.',
        'He grips the railing.',
        'The old lock snaps open.',
        'Bob crosses the hallway.',
        'She drops the letter on the counter.',
        'He stares at the window.',
        'Alice takes a step back.',
        'She reaches for the latch.',
        'He turns to face the room.',
        'She closes the folder.',
        'Bob checks the schedule.',
      ];
      const f235d = makeFountain235(lines235d);
      const result = await rhythmPass({
        fountain: f235d, original: f235d,
        records: [] as any, structure: {} as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'SIMULTANEOUS_ACTION_ABSENT');
      assert.strictEqual(match.length, 0, 'Should NOT fire when a line uses "while"');
    });

    it('MOTION_VERB_OVERLOAD fires when >50% of action lines contain locomotion verbs', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      // 9 lines, 8 contain locomotion verbs → ~89%
      const lines235e = [
        'Alice walks to the far end.',
        'Bob crosses the long empty hallway.',
        'She enters the back storeroom alone.',
        'He runs toward the emergency exit.',
        'She turns and moves toward the far door.',
        'Bob approaches the counter with caution.',
        'He leaves.',
        'She follows the narrow gravel path down to the cliff edge.',
        'A crow screams in the sudden silence.',
      ];
      const f235e = makeFountain235(lines235e);
      const result = await rhythmPass({
        fountain: f235e, original: f235e,
        records: [] as any, structure: {} as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'MOTION_VERB_OVERLOAD');
      assert.ok(match.length >= 1, `Expected MOTION_VERB_OVERLOAD, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('MOTION_VERB_OVERLOAD does NOT fire when ≤50% of action lines contain locomotion verbs', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      // 8 lines, only 1 has a locomotion verb → 12.5%
      const lines235f = [
        'The desk holds a battered old leather ledger.',
        'She reads.',
        'Afternoon light catches the dust on the wide wooden shelves.',
        'He opens the bottom drawer.',
        'Alice walks past.',
        'The old clock on the mantle shows half past three.',
        'He stares.',
        'Bob checks the handwritten schedule on the corkboard.',
      ];
      const f235f = makeFountain235(lines235f);
      const result = await rhythmPass({
        fountain: f235f, original: f235f,
        records: [] as any, structure: {} as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'MOTION_VERB_OVERLOAD');
      assert.strictEqual(match.length, 0, 'Should NOT fire when ≤50% of lines have locomotion verbs');
    });
  });


  describe('Wave 1128 — rhythmPass: rhythm open-thread-suspense aftermath void, rhythm open-thread-emotional aftermath void, rhythm clock-curiosity aftermath void', async () => {
    const runR1128 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('RHYTHM_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID fires when every open-thread scene has no suspense rise within 2 scenes', async () => {
      const recs1128a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { unresolvedClues: ['c1'] } : ([8, 9].includes(i) ? { suspenseDelta: 1 } : {})));
      const res = await runR1128(recs1128a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID'), 'RHYTHM_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID does not fire when an open-thread scene is followed by a suspense rise within 2 scenes', async () => {
      const recs1128an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { unresolvedClues: ['c1'] } : ([1, 9].includes(i) ? { suspenseDelta: 1 } : {})));
      const res = await runR1128(recs1128an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID'), 'RHYTHM_OPEN_THREAD_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    it('RHYTHM_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID fires when every open-thread scene has no emotional shift within 2 scenes', async () => {
      const recs1128b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { unresolvedClues: ['c1'] } : ([8, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runR1128(recs1128b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID'), 'RHYTHM_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID does not fire when an open-thread scene is followed by an emotional shift within 2 scenes', async () => {
      const recs1128bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { unresolvedClues: ['c1'] } : ([1, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runR1128(recs1128bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID'), 'RHYTHM_OPEN_THREAD_EMOTIONAL_AFTERMATH_VOID should not fire');
    });

    it('RHYTHM_CLOCK_CURIOSITY_AFTERMATH_VOID fires when every clock-raise has no curiosity rise within 2 scenes', async () => {
      const recs1128c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { clockRaised: true } : ([8, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runR1128(recs1128c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_CLOCK_CURIOSITY_AFTERMATH_VOID'), 'RHYTHM_CLOCK_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_CLOCK_CURIOSITY_AFTERMATH_VOID does not fire when a clock-raise is followed by a curiosity rise within 2 scenes', async () => {
      const recs1128cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { clockRaised: true } : ([1, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runR1128(recs1128cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_CLOCK_CURIOSITY_AFTERMATH_VOID'), 'RHYTHM_CLOCK_CURIOSITY_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1114 — rhythmPass: rhythm seed-dialogue-highlight aftermath void, rhythm seed-staging aftermath void, rhythm open-thread-curiosity aftermath void', async () => {
    const runR1114 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('RHYTHM_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when every seed has no highlighted dialogue within 2 scenes', async () => {
      const recs1114a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { seededClueIds: ['c1'] } : ([8, 9].includes(i) ? { dialogueHighlights: ['a memorable line'] } : {})));
      const res = await runR1114(recs1114a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'RHYTHM_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a seed is followed by highlighted dialogue within 2 scenes', async () => {
      const recs1114an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { seededClueIds: ['c1'] } : ([1, 9].includes(i) ? { dialogueHighlights: ['a memorable line'] } : {})));
      const res = await runR1114(recs1114an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'RHYTHM_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });

    it('RHYTHM_SEED_STAGING_AFTERMATH_VOID fires when every seed has no visually dense scene within 2 scenes', async () => {
      const recs1114b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { seededClueIds: ['c1'] } : ([8, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runR1114(recs1114b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_SEED_STAGING_AFTERMATH_VOID'), 'RHYTHM_SEED_STAGING_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_SEED_STAGING_AFTERMATH_VOID does not fire when a seed is followed by a visually dense scene within 2 scenes', async () => {
      const recs1114bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { seededClueIds: ['c1'] } : ([1, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runR1114(recs1114bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_SEED_STAGING_AFTERMATH_VOID'), 'RHYTHM_SEED_STAGING_AFTERMATH_VOID should not fire');
    });

    it('RHYTHM_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID fires when every open-thread scene has no curiosity rise within 2 scenes', async () => {
      const recs1114c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { unresolvedClues: ['c1'] } : ([8, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runR1114(recs1114c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID'), 'RHYTHM_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID does not fire when an open-thread scene is followed by a curiosity rise within 2 scenes', async () => {
      const recs1114cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { unresolvedClues: ['c1'] } : ([1, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runR1114(recs1114cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID'), 'RHYTHM_OPEN_THREAD_CURIOSITY_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1100 — rhythmPass: rhythm seed-emotional aftermath void, rhythm seed-suspense aftermath void, rhythm seed-relational aftermath void', async () => {
    const runR1100 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('RHYTHM_SEED_EMOTIONAL_AFTERMATH_VOID fires when every seed has no emotional shift within 2 scenes', async () => {
      const recs1100a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { seededClueIds: ['c1'] } : ([8, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runR1100(recs1100a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_SEED_EMOTIONAL_AFTERMATH_VOID'), 'RHYTHM_SEED_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_SEED_EMOTIONAL_AFTERMATH_VOID does not fire when a seed is followed by an emotional shift within 2 scenes', async () => {
      const recs1100an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { seededClueIds: ['c1'] } : ([1, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runR1100(recs1100an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_SEED_EMOTIONAL_AFTERMATH_VOID'), 'RHYTHM_SEED_EMOTIONAL_AFTERMATH_VOID should not fire');
    });

    it('RHYTHM_SEED_SUSPENSE_AFTERMATH_VOID fires when every seed has no suspense rise within 2 scenes', async () => {
      const recs1100b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { seededClueIds: ['c1'] } : ([8, 9].includes(i) ? { suspenseDelta: 1 } : {})));
      const res = await runR1100(recs1100b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_SEED_SUSPENSE_AFTERMATH_VOID'), 'RHYTHM_SEED_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_SEED_SUSPENSE_AFTERMATH_VOID does not fire when a seed is followed by a suspense rise within 2 scenes', async () => {
      const recs1100bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { seededClueIds: ['c1'] } : ([1, 9].includes(i) ? { suspenseDelta: 1 } : {})));
      const res = await runR1100(recs1100bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_SEED_SUSPENSE_AFTERMATH_VOID'), 'RHYTHM_SEED_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    it('RHYTHM_SEED_RELATIONAL_AFTERMATH_VOID fires when every seed has no relationship shift within 2 scenes', async () => {
      const recs1100c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { seededClueIds: ['c1'] } : ([8, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runR1100(recs1100c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_SEED_RELATIONAL_AFTERMATH_VOID'), 'RHYTHM_SEED_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_SEED_RELATIONAL_AFTERMATH_VOID does not fire when a seed is followed by a relationship shift within 2 scenes', async () => {
      const recs1100cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { seededClueIds: ['c1'] } : ([1, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runR1100(recs1100cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_SEED_RELATIONAL_AFTERMATH_VOID'), 'RHYTHM_SEED_RELATIONAL_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1086 — rhythmPass: rhythm turn-staging aftermath void, rhythm stakes-staging aftermath void, rhythm seed-curiosity aftermath void', async () => {
    const runR1086 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('RHYTHM_TURN_STAGING_AFTERMATH_VOID fires when every dramatic turn has no visually dense scene within 2 scenes', async () => {
      const recs1086a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { dramaticTurn: 'reversal' } : ([8, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runR1086(recs1086a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_TURN_STAGING_AFTERMATH_VOID'), 'RHYTHM_TURN_STAGING_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_TURN_STAGING_AFTERMATH_VOID does not fire when a dramatic turn is followed by a visually dense scene within 2 scenes', async () => {
      const recs1086an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { dramaticTurn: 'reversal' } : ([1, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runR1086(recs1086an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_TURN_STAGING_AFTERMATH_VOID'), 'RHYTHM_TURN_STAGING_AFTERMATH_VOID should not fire');
    });

    it('RHYTHM_STAKES_STAGING_AFTERMATH_VOID fires when every stakes-raise has no visually dense scene within 2 scenes', async () => {
      const recs1086b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { purpose: 'raise_stakes' } : ([8, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runR1086(recs1086b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_STAKES_STAGING_AFTERMATH_VOID'), 'RHYTHM_STAKES_STAGING_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_STAKES_STAGING_AFTERMATH_VOID does not fire when a stakes-raise is followed by a visually dense scene within 2 scenes', async () => {
      const recs1086bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { purpose: 'raise_stakes' } : ([1, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runR1086(recs1086bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_STAKES_STAGING_AFTERMATH_VOID'), 'RHYTHM_STAKES_STAGING_AFTERMATH_VOID should not fire');
    });

    it('RHYTHM_SEED_CURIOSITY_AFTERMATH_VOID fires when every seed has no curiosity rise within 2 scenes', async () => {
      const recs1086c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { seededClueIds: ['c1'] } : ([8, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runR1086(recs1086c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_SEED_CURIOSITY_AFTERMATH_VOID'), 'RHYTHM_SEED_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_SEED_CURIOSITY_AFTERMATH_VOID does not fire when a seed is followed by a curiosity rise within 2 scenes', async () => {
      const recs1086cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { seededClueIds: ['c1'] } : ([1, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runR1086(recs1086cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_SEED_CURIOSITY_AFTERMATH_VOID'), 'RHYTHM_SEED_CURIOSITY_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1072 — rhythmPass: rhythm payoff-staging aftermath void, rhythm turn-dialogue-highlight aftermath void, rhythm stakes-dialogue-highlight aftermath void', async () => {
    const runR1072 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('RHYTHM_PAYOFF_STAGING_AFTERMATH_VOID fires when every payoff has no visually dense scene within 2 scenes', async () => {
      const recs1072a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { payoffSetupIds: ['p1'] } : ([8, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runR1072(recs1072a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_PAYOFF_STAGING_AFTERMATH_VOID'), 'RHYTHM_PAYOFF_STAGING_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_PAYOFF_STAGING_AFTERMATH_VOID does not fire when a payoff is followed by a visually dense scene within 2 scenes', async () => {
      const recs1072an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { payoffSetupIds: ['p1'] } : ([1, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runR1072(recs1072an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_PAYOFF_STAGING_AFTERMATH_VOID'), 'RHYTHM_PAYOFF_STAGING_AFTERMATH_VOID should not fire');
    });

    it('RHYTHM_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when every dramatic turn has no highlighted dialogue within 2 scenes', async () => {
      const recs1072b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { dramaticTurn: 'reversal' } : ([8, 9].includes(i) ? { dialogueHighlights: ['a memorable line'] } : {})));
      const res = await runR1072(recs1072b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'RHYTHM_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a dramatic turn is followed by highlighted dialogue within 2 scenes', async () => {
      const recs1072bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { dramaticTurn: 'reversal' } : ([1, 9].includes(i) ? { dialogueHighlights: ['a memorable line'] } : {})));
      const res = await runR1072(recs1072bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'RHYTHM_TURN_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });

    it('RHYTHM_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when every stakes-raise has no highlighted dialogue within 2 scenes', async () => {
      const recs1072c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { purpose: 'raise_stakes' } : ([8, 9].includes(i) ? { dialogueHighlights: ['a memorable line'] } : {})));
      const res = await runR1072(recs1072c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'RHYTHM_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a stakes-raise is followed by highlighted dialogue within 2 scenes', async () => {
      const recs1072cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { purpose: 'raise_stakes' } : ([1, 9].includes(i) ? { dialogueHighlights: ['a memorable line'] } : {})));
      const res = await runR1072(recs1072cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'RHYTHM_STAKES_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1058 — rhythmPass: rhythm revelation-staging aftermath void, rhythm turn-suspense aftermath void, rhythm payoff-dialogue-highlight aftermath void', async () => {
    const runR1058 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('RHYTHM_REVELATION_STAGING_AFTERMATH_VOID fires when every revelation has no visually dense scene within 2 scenes', async () => {
      const recs1058a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { revelation: 'a hidden truth surfaces' } : ([8, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runR1058(recs1058a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_REVELATION_STAGING_AFTERMATH_VOID'), 'RHYTHM_REVELATION_STAGING_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_REVELATION_STAGING_AFTERMATH_VOID does not fire when a revelation is followed by a visually dense scene within 2 scenes', async () => {
      const recs1058an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { revelation: 'a hidden truth surfaces' } : ([1, 9].includes(i) ? { visualBeats: ['beat one', 'beat two'] } : {})));
      const res = await runR1058(recs1058an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_REVELATION_STAGING_AFTERMATH_VOID'), 'RHYTHM_REVELATION_STAGING_AFTERMATH_VOID should not fire');
    });

    it('RHYTHM_TURN_SUSPENSE_AFTERMATH_VOID fires when every dramatic turn has no suspense rise within 2 scenes', async () => {
      const recs1058b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { dramaticTurn: 'reversal' } : ([8, 9].includes(i) ? { suspenseDelta: 1 } : {})));
      const res = await runR1058(recs1058b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_TURN_SUSPENSE_AFTERMATH_VOID'), 'RHYTHM_TURN_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_TURN_SUSPENSE_AFTERMATH_VOID does not fire when a dramatic turn is followed by a suspense rise within 2 scenes', async () => {
      const recs1058bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { dramaticTurn: 'reversal' } : ([1, 9].includes(i) ? { suspenseDelta: 1 } : {})));
      const res = await runR1058(recs1058bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_TURN_SUSPENSE_AFTERMATH_VOID'), 'RHYTHM_TURN_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    it('RHYTHM_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when every payoff has no highlighted dialogue within 2 scenes', async () => {
      const recs1058c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { payoffSetupIds: ['p1'] } : ([8, 9].includes(i) ? { dialogueHighlights: ['a memorable line'] } : {})));
      const res = await runR1058(recs1058c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'RHYTHM_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a payoff is followed by highlighted dialogue within 2 scenes', async () => {
      const recs1058cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { payoffSetupIds: ['p1'] } : ([1, 9].includes(i) ? { dialogueHighlights: ['a memorable line'] } : {})));
      const res = await runR1058(recs1058cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'RHYTHM_PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1044 — rhythmPass: rhythm turn-curiosity aftermath void, rhythm payoff-relational aftermath void, rhythm revelation-dialogue-highlight aftermath void', async () => {
    const runR1044 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('RHYTHM_TURN_CURIOSITY_AFTERMATH_VOID fires when every dramatic turn has no curiosity raised within 2 scenes', async () => {
      const recs1044a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { dramaticTurn: 'reversal' } : ([8, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runR1044(recs1044a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_TURN_CURIOSITY_AFTERMATH_VOID'), 'RHYTHM_TURN_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_TURN_CURIOSITY_AFTERMATH_VOID does not fire when a dramatic turn is followed by new curiosity within 2 scenes', async () => {
      const recs1044an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { dramaticTurn: 'reversal' } : ([1, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runR1044(recs1044an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_TURN_CURIOSITY_AFTERMATH_VOID'), 'RHYTHM_TURN_CURIOSITY_AFTERMATH_VOID should not fire');
    });

    it('RHYTHM_PAYOFF_RELATIONAL_AFTERMATH_VOID fires when every payoff has no relationship shift within 2 scenes', async () => {
      const recs1044b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { payoffSetupIds: ['p1'] } : ([8, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runR1044(recs1044b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_PAYOFF_RELATIONAL_AFTERMATH_VOID'), 'RHYTHM_PAYOFF_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_PAYOFF_RELATIONAL_AFTERMATH_VOID does not fire when a payoff is followed by a relationship shift within 2 scenes', async () => {
      const recs1044bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { payoffSetupIds: ['p1'] } : ([1, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runR1044(recs1044bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_PAYOFF_RELATIONAL_AFTERMATH_VOID'), 'RHYTHM_PAYOFF_RELATIONAL_AFTERMATH_VOID should not fire');
    });

    it('RHYTHM_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when every revelation has no highlighted dialogue within 2 scenes', async () => {
      const recs1044c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { revelation: 'a hidden truth surfaces' } : ([8, 9].includes(i) ? { dialogueHighlights: ['a memorable line'] } : {})));
      const res = await runR1044(recs1044c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'RHYTHM_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a revelation is followed by highlighted dialogue within 2 scenes', async () => {
      const recs1044cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { revelation: 'a hidden truth surfaces' } : ([1, 9].includes(i) ? { dialogueHighlights: ['a memorable line'] } : {})));
      const res = await runR1044(recs1044cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'RHYTHM_REVELATION_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1030 — rhythmPass: rhythm stakes-emotional aftermath void, rhythm payoff-suspense aftermath void, rhythm revelation-suspense aftermath void', async () => {
    const runR1030 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('RHYTHM_STAKES_EMOTIONAL_AFTERMATH_VOID fires when every stakes-raise has no emotional shift within 2 scenes', async () => {
      const recs1030a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { purpose: 'raise_stakes' } : ([8, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runR1030(recs1030a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_STAKES_EMOTIONAL_AFTERMATH_VOID'), 'RHYTHM_STAKES_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_STAKES_EMOTIONAL_AFTERMATH_VOID does not fire when a stakes-raise is followed by an emotional shift within 2 scenes', async () => {
      const recs1030an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { purpose: 'raise_stakes' } : ([1, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runR1030(recs1030an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_STAKES_EMOTIONAL_AFTERMATH_VOID'), 'RHYTHM_STAKES_EMOTIONAL_AFTERMATH_VOID should not fire');
    });

    it('RHYTHM_PAYOFF_SUSPENSE_AFTERMATH_VOID fires when every payoff has no rise in suspense within 2 scenes', async () => {
      const recs1030b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { payoffSetupIds: ['p1'] } : ([8, 9].includes(i) ? { suspenseDelta: 1 } : {})));
      const res = await runR1030(recs1030b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_PAYOFF_SUSPENSE_AFTERMATH_VOID'), 'RHYTHM_PAYOFF_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_PAYOFF_SUSPENSE_AFTERMATH_VOID does not fire when a payoff is followed by rising suspense within 2 scenes', async () => {
      const recs1030bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { payoffSetupIds: ['p1'] } : ([1, 9].includes(i) ? { suspenseDelta: 1 } : {})));
      const res = await runR1030(recs1030bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_PAYOFF_SUSPENSE_AFTERMATH_VOID'), 'RHYTHM_PAYOFF_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    it('RHYTHM_REVELATION_SUSPENSE_AFTERMATH_VOID fires when every revelation has no rise in suspense within 2 scenes', async () => {
      const recs1030c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { revelation: 'a hidden truth surfaces' } : ([8, 9].includes(i) ? { suspenseDelta: 1 } : {})));
      const res = await runR1030(recs1030c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_REVELATION_SUSPENSE_AFTERMATH_VOID'), 'RHYTHM_REVELATION_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_REVELATION_SUSPENSE_AFTERMATH_VOID does not fire when a revelation is followed by rising suspense within 2 scenes', async () => {
      const recs1030cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { revelation: 'a hidden truth surfaces' } : ([1, 9].includes(i) ? { suspenseDelta: 1 } : {})));
      const res = await runR1030(recs1030cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_REVELATION_SUSPENSE_AFTERMATH_VOID'), 'RHYTHM_REVELATION_SUSPENSE_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1016 — rhythmPass: rhythm revelation-curiosity aftermath void, rhythm turn-emotional aftermath void, rhythm stakes-relational aftermath void', async () => {
    const runR1016 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('RHYTHM_REVELATION_CURIOSITY_AFTERMATH_VOID fires when every revelation has no curiosity raised within 2 scenes', async () => {
      const recs1016a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { revelation: 'a hidden truth surfaces' } : ([8, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runR1016(recs1016a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_REVELATION_CURIOSITY_AFTERMATH_VOID'), 'RHYTHM_REVELATION_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_REVELATION_CURIOSITY_AFTERMATH_VOID does not fire when a revelation is followed by new curiosity within 2 scenes', async () => {
      const recs1016an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { revelation: 'a hidden truth surfaces' } : ([1, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runR1016(recs1016an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_REVELATION_CURIOSITY_AFTERMATH_VOID'), 'RHYTHM_REVELATION_CURIOSITY_AFTERMATH_VOID should not fire');
    });

    it('RHYTHM_TURN_EMOTIONAL_AFTERMATH_VOID fires when every dramatic turn has no emotional shift within 2 scenes', async () => {
      const recs1016b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { dramaticTurn: 'reversal' } : ([8, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runR1016(recs1016b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_TURN_EMOTIONAL_AFTERMATH_VOID'), 'RHYTHM_TURN_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_TURN_EMOTIONAL_AFTERMATH_VOID does not fire when a dramatic turn is followed by an emotional shift within 2 scenes', async () => {
      const recs1016bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { dramaticTurn: 'reversal' } : ([1, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runR1016(recs1016bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_TURN_EMOTIONAL_AFTERMATH_VOID'), 'RHYTHM_TURN_EMOTIONAL_AFTERMATH_VOID should not fire');
    });

    it('RHYTHM_STAKES_RELATIONAL_AFTERMATH_VOID fires when every stakes-raise has no relationship shift within 2 scenes', async () => {
      const recs1016c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { purpose: 'raise_stakes' } : ([8, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runR1016(recs1016c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_STAKES_RELATIONAL_AFTERMATH_VOID'), 'RHYTHM_STAKES_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_STAKES_RELATIONAL_AFTERMATH_VOID does not fire when a stakes-raise is followed by a relationship shift within 2 scenes', async () => {
      const recs1016cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { purpose: 'raise_stakes' } : ([1, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runR1016(recs1016cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_STAKES_RELATIONAL_AFTERMATH_VOID'), 'RHYTHM_STAKES_RELATIONAL_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 1002 — rhythmPass: rhythm stakes-suspense aftermath void, rhythm revelation-relational aftermath void, rhythm payoff-curiosity aftermath void', async () => {
    const runR1002 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('RHYTHM_STAKES_SUSPENSE_AFTERMATH_VOID fires when every stakes-raise has no rise in suspense within 2 scenes', async () => {
      const recs1002a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { purpose: 'raise_stakes' } : ([8, 9].includes(i) ? { suspenseDelta: 1 } : {})));
      const res = await runR1002(recs1002a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_STAKES_SUSPENSE_AFTERMATH_VOID'), 'RHYTHM_STAKES_SUSPENSE_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_STAKES_SUSPENSE_AFTERMATH_VOID does not fire when a stakes-raise is followed by rising suspense within 2 scenes', async () => {
      const recs1002an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { purpose: 'raise_stakes' } : ([1, 9].includes(i) ? { suspenseDelta: 1 } : {})));
      const res = await runR1002(recs1002an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_STAKES_SUSPENSE_AFTERMATH_VOID'), 'RHYTHM_STAKES_SUSPENSE_AFTERMATH_VOID should not fire');
    });

    it('RHYTHM_REVELATION_RELATIONAL_AFTERMATH_VOID fires when every revelation has no relationship shift within 2 scenes', async () => {
      const recs1002b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { revelation: 'a hidden truth surfaces' } : ([8, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runR1002(recs1002b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_REVELATION_RELATIONAL_AFTERMATH_VOID'), 'RHYTHM_REVELATION_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_REVELATION_RELATIONAL_AFTERMATH_VOID does not fire when a revelation is followed by a relationship shift within 2 scenes', async () => {
      const recs1002bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { revelation: 'a hidden truth surfaces' } : ([1, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runR1002(recs1002bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_REVELATION_RELATIONAL_AFTERMATH_VOID'), 'RHYTHM_REVELATION_RELATIONAL_AFTERMATH_VOID should not fire');
    });

    it('RHYTHM_PAYOFF_CURIOSITY_AFTERMATH_VOID fires when every payoff has no curiosity raised within 2 scenes', async () => {
      const recs1002c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { payoffSetupIds: ['s1'] } : ([8, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runR1002(recs1002c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_PAYOFF_CURIOSITY_AFTERMATH_VOID'), 'RHYTHM_PAYOFF_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_PAYOFF_CURIOSITY_AFTERMATH_VOID does not fire when a payoff is followed by new curiosity within 2 scenes', async () => {
      const recs1002cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { payoffSetupIds: ['s1'] } : ([1, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runR1002(recs1002cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_PAYOFF_CURIOSITY_AFTERMATH_VOID'), 'RHYTHM_PAYOFF_CURIOSITY_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 988 — rhythmPass: dialogue signal zone imbalance, payoff signal zone imbalance, relational signal zone imbalance', async () => {
    const runR988 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched → no-fire.
    it('DIALOGUE_SIGNAL_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of highlighted-dialogue scenes', async () => {
      const recs988a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { dialogueHighlights: [0, 1, 2, 8, 9].includes(i) ? ['line'] : [] }));
      const res = await runR988(recs988a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_SIGNAL_ZONE_IMBALANCE'), 'DIALOGUE_SIGNAL_ZONE_IMBALANCE should fire');
    });

    it('DIALOGUE_SIGNAL_ZONE_IMBALANCE does not fire when highlighted-dialogue scenes touch every zone', async () => {
      const recs988an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { dialogueHighlights: [0, 3, 5, 8].includes(i) ? ['line'] : [] }));
      const res = await runR988(recs988an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_SIGNAL_ZONE_IMBALANCE'), 'DIALOGUE_SIGNAL_ZONE_IMBALANCE should not fire');
    });

    it('PAYOFF_SIGNAL_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of payoff scenes', async () => {
      const recs988b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { payoffSetupIds: [0, 1, 2, 8, 9].includes(i) ? ['setup1'] : [] }));
      const res = await runR988(recs988b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_SIGNAL_ZONE_IMBALANCE'), 'PAYOFF_SIGNAL_ZONE_IMBALANCE should fire');
    });

    it('PAYOFF_SIGNAL_ZONE_IMBALANCE does not fire when payoff scenes touch every zone', async () => {
      const recs988bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { payoffSetupIds: [0, 3, 5, 8].includes(i) ? ['setup1'] : [] }));
      const res = await runR988(recs988bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_SIGNAL_ZONE_IMBALANCE'), 'PAYOFF_SIGNAL_ZONE_IMBALANCE should not fire');
    });

    it('RELATIONAL_SIGNAL_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of relationship-shift scenes', async () => {
      const recs988c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { relationshipShifts: [0, 1, 2, 8, 9].includes(i) ? [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] : [] }));
      const res = await runR988(recs988c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_SIGNAL_ZONE_IMBALANCE'), 'RELATIONAL_SIGNAL_ZONE_IMBALANCE should fire');
    });

    it('RELATIONAL_SIGNAL_ZONE_IMBALANCE does not fire when relationship-shift scenes touch every zone', async () => {
      const recs988cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { relationshipShifts: [0, 3, 5, 8].includes(i) ? [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] : [] }));
      const res = await runR988(recs988cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_SIGNAL_ZONE_IMBALANCE'), 'RELATIONAL_SIGNAL_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 974 — rhythmPass: rhythm turn relational aftermath void, rhythm payoff emotional aftermath void, rhythm stakes curiosity aftermath void', async () => {
    const runR974 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Aftermath-void geometry n=10, window=2: triggers at 0 and 3 (both have a full 2-scene lookahead).
    // FIRE: aftermath signal only at 8,9 — outside both trigger windows {1,2} and {4,5} → every trigger
    // void → fires. NO-FIRE: aftermath at 1 (inside trigger 0's window) and 9 → trigger 0 not void → no fire.
    it('RHYTHM_TURN_RELATIONAL_AFTERMATH_VOID fires when every dramatic turn has no relationship shift within 2 scenes', async () => {
      const recs974a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { dramaticTurn: 'reversal' } : ([8, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runR974(recs974a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_TURN_RELATIONAL_AFTERMATH_VOID'), 'RHYTHM_TURN_RELATIONAL_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_TURN_RELATIONAL_AFTERMATH_VOID does not fire when a dramatic turn is followed by a relationship shift within 2 scenes', async () => {
      const recs974an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { dramaticTurn: 'reversal' } : ([1, 9].includes(i) ? { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] } : {})));
      const res = await runR974(recs974an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_TURN_RELATIONAL_AFTERMATH_VOID'), 'RHYTHM_TURN_RELATIONAL_AFTERMATH_VOID should not fire');
    });

    // Payoff variant requires minAftermathCount 3, so aftermath needs 3 scenes elsewhere (8,9 plus one
    // more) for the fire case; keep 8,9 outside both windows and add scene 6 (also outside both windows).
    it('RHYTHM_PAYOFF_EMOTIONAL_AFTERMATH_VOID fires when every payoff has no emotional shift within 2 scenes', async () => {
      const recs974b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { payoffSetupIds: ['s1'] } : ([6, 8, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runR974(recs974b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_PAYOFF_EMOTIONAL_AFTERMATH_VOID'), 'RHYTHM_PAYOFF_EMOTIONAL_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_PAYOFF_EMOTIONAL_AFTERMATH_VOID does not fire when a payoff is followed by an emotional shift within 2 scenes', async () => {
      const recs974bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { payoffSetupIds: ['s1'] } : ([1, 6, 9].includes(i) ? { emotionalShift: 'positive' } : {})));
      const res = await runR974(recs974bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_PAYOFF_EMOTIONAL_AFTERMATH_VOID'), 'RHYTHM_PAYOFF_EMOTIONAL_AFTERMATH_VOID should not fire');
    });

    it('RHYTHM_STAKES_CURIOSITY_AFTERMATH_VOID fires when every stakes-raise has no curiosity raised within 2 scenes', async () => {
      const recs974c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { purpose: 'raise_stakes' } : ([8, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runR974(recs974c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_STAKES_CURIOSITY_AFTERMATH_VOID'), 'RHYTHM_STAKES_CURIOSITY_AFTERMATH_VOID should fire');
    });

    it('RHYTHM_STAKES_CURIOSITY_AFTERMATH_VOID does not fire when a stakes-raise is followed by curiosity within 2 scenes', async () => {
      const recs974cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, [0, 3].includes(i) ? { purpose: 'raise_stakes' } : ([1, 9].includes(i) ? { curiosityDelta: 1 } : {})));
      const res = await runR974(recs974cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_STAKES_CURIOSITY_AFTERMATH_VOID'), 'RHYTHM_STAKES_CURIOSITY_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 960 — rhythmPass: rhythm curiosity zone imbalance, rhythm revelation zone imbalance, rhythm revelation purpose zone imbalance', async () => {
    const runR960 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched → no-fire.
    it('RHYTHM_CURIOSITY_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of curiosity-raising scenes', async () => {
      const recs960a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 1, 2, 8, 9].includes(i) ? 1 : 0 }));
      const res = await runR960(recs960a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_CURIOSITY_ZONE_IMBALANCE'), 'RHYTHM_CURIOSITY_ZONE_IMBALANCE should fire');
    });

    it('RHYTHM_CURIOSITY_ZONE_IMBALANCE does not fire when curiosity-raising scenes touch every zone', async () => {
      const recs960an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 3, 5, 8].includes(i) ? 1 : 0 }));
      const res = await runR960(recs960an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_CURIOSITY_ZONE_IMBALANCE'), 'RHYTHM_CURIOSITY_ZONE_IMBALANCE should not fire');
    });

    it('RHYTHM_REVELATION_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of revelation scenes', async () => {
      const recs960b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { revelation: [0, 1, 2, 8, 9].includes(i) ? 'a hidden truth surfaces' : null }));
      const res = await runR960(recs960b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_REVELATION_ZONE_IMBALANCE'), 'RHYTHM_REVELATION_ZONE_IMBALANCE should fire');
    });

    it('RHYTHM_REVELATION_ZONE_IMBALANCE does not fire when revelation scenes touch every zone', async () => {
      const recs960bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { revelation: [0, 3, 5, 8].includes(i) ? 'a hidden truth surfaces' : null }));
      const res = await runR960(recs960bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_REVELATION_ZONE_IMBALANCE'), 'RHYTHM_REVELATION_ZONE_IMBALANCE should not fire');
    });

    it('RHYTHM_REVELATION_PURPOSE_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of revelation-purposed scenes', async () => {
      const recs960c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'revelation' : 'establish_world' }));
      const res = await runR960(recs960c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_REVELATION_PURPOSE_ZONE_IMBALANCE'), 'RHYTHM_REVELATION_PURPOSE_ZONE_IMBALANCE should fire');
    });

    it('RHYTHM_REVELATION_PURPOSE_ZONE_IMBALANCE does not fire when revelation-purposed scenes touch every zone', async () => {
      const recs960cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'revelation' : 'establish_world' }));
      const res = await runR960(recs960cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_REVELATION_PURPOSE_ZONE_IMBALANCE'), 'RHYTHM_REVELATION_PURPOSE_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 946 — rhythmPass: rhythm stakes zone imbalance, rhythm positive emotion zone imbalance, rhythm suspense zone imbalance', async () => {
    const runR946 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched → no-fire.
    it('RHYTHM_STAKES_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of stakes-raising scenes', async () => {
      const recs946a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'raise_stakes' : 'establish_world' }));
      const res = await runR946(recs946a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_STAKES_ZONE_IMBALANCE'), 'RHYTHM_STAKES_ZONE_IMBALANCE should fire');
    });

    it('RHYTHM_STAKES_ZONE_IMBALANCE does not fire when stakes-raising scenes touch every zone', async () => {
      const recs946an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'raise_stakes' : 'establish_world' }));
      const res = await runR946(recs946an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_STAKES_ZONE_IMBALANCE'), 'RHYTHM_STAKES_ZONE_IMBALANCE should not fire');
    });

    it('RHYTHM_POSITIVE_EMOTION_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of positive-shift scenes', async () => {
      const recs946b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2, 8, 9].includes(i) ? 'positive' : 'neutral' }));
      const res = await runR946(recs946b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_POSITIVE_EMOTION_ZONE_IMBALANCE'), 'RHYTHM_POSITIVE_EMOTION_ZONE_IMBALANCE should fire');
    });

    it('RHYTHM_POSITIVE_EMOTION_ZONE_IMBALANCE does not fire when positive-shift scenes touch every zone', async () => {
      const recs946bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 3, 5, 8].includes(i) ? 'positive' : 'neutral' }));
      const res = await runR946(recs946bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_POSITIVE_EMOTION_ZONE_IMBALANCE'), 'RHYTHM_POSITIVE_EMOTION_ZONE_IMBALANCE should not fire');
    });

    it('RHYTHM_SUSPENSE_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of suspense-raising scenes', async () => {
      const recs946c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { suspenseDelta: [0, 1, 2, 8, 9].includes(i) ? 1 : 0 }));
      const res = await runR946(recs946c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_SUSPENSE_ZONE_IMBALANCE'), 'RHYTHM_SUSPENSE_ZONE_IMBALANCE should fire');
    });

    it('RHYTHM_SUSPENSE_ZONE_IMBALANCE does not fire when suspense-raising scenes touch every zone', async () => {
      const recs946cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { suspenseDelta: [0, 3, 5, 8].includes(i) ? 1 : 0 }));
      const res = await runR946(recs946cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_SUSPENSE_ZONE_IMBALANCE'), 'RHYTHM_SUSPENSE_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 932 — rhythmPass: rhythm revelation purpose zone cluster, rhythm revelation purpose drought run, rhythm complicate zone imbalance', async () => {
    const runR932 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RHYTHM_REVELATION_PURPOSE_ZONE_CLUSTER fire: n=9, 3 thirds; revelation-purposed scenes at
    // 0,1,2 (opening third) → 3/3 = 100% > 75%. Filler 'establish_world'.
    it('RHYTHM_REVELATION_PURPOSE_ZONE_CLUSTER fires when >75% of revelation-purposed scenes cluster in one third', async () => {
      const recs932a = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'revelation' : 'establish_world' }));
      const res = await runR932(recs932a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_REVELATION_PURPOSE_ZONE_CLUSTER'), 'RHYTHM_REVELATION_PURPOSE_ZONE_CLUSTER should fire');
    });

    it('RHYTHM_REVELATION_PURPOSE_ZONE_CLUSTER does not fire when revelation-purposed scenes spread across thirds', async () => {
      const recs932an = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'revelation' : 'establish_world' }));
      const res = await runR932(recs932an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_REVELATION_PURPOSE_ZONE_CLUSTER'), 'RHYTHM_REVELATION_PURPOSE_ZONE_CLUSTER should not fire');
    });

    // RHYTHM_REVELATION_PURPOSE_DROUGHT_RUN fire: n=10, revelation-purposed scenes at 0, 8, 9
    // (minPresentCount 3), leaving a 7-scene gap (indices 1-7) — run of 7 >= threshold 6.
    it('RHYTHM_REVELATION_PURPOSE_DROUGHT_RUN fires when a long run has no revelation-purposed scene', async () => {
      const recs932b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 8, 9].includes(i) ? 'revelation' : 'establish_world' }));
      const res = await runR932(recs932b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_REVELATION_PURPOSE_DROUGHT_RUN'), 'RHYTHM_REVELATION_PURPOSE_DROUGHT_RUN should fire');
    });

    it('RHYTHM_REVELATION_PURPOSE_DROUGHT_RUN does not fire when revelation-purposed scenes are evenly spread', async () => {
      const recs932bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'revelation' : 'establish_world' }));
      const res = await runR932(recs932bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_REVELATION_PURPOSE_DROUGHT_RUN'), 'RHYTHM_REVELATION_PURPOSE_DROUGHT_RUN should not fire');
    });

    // RHYTHM_COMPLICATE_ZONE_IMBALANCE fire: n=10, Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9};
    // complicate at 0,1,2,8,9 → Z0 3/5=60% (bloat), Z1 and Z2 empty.
    it('RHYTHM_COMPLICATE_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of complicating scenes', async () => {
      const recs932c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'complicate' : 'establish_world' }));
      const res = await runR932(recs932c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_COMPLICATE_ZONE_IMBALANCE'), 'RHYTHM_COMPLICATE_ZONE_IMBALANCE should fire');
    });

    it('RHYTHM_COMPLICATE_ZONE_IMBALANCE does not fire when complicating scenes touch every zone', async () => {
      const recs932cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'complicate' : 'establish_world' }));
      const res = await runR932(recs932cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_COMPLICATE_ZONE_IMBALANCE'), 'RHYTHM_COMPLICATE_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 918 — rhythmPass: rhythm complicate zone cluster, rhythm complicate drought run, rhythm negative emotion zone imbalance', async () => {
    const runR918 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RHYTHM_COMPLICATE_ZONE_CLUSTER fire: n=9, 3 thirds; complicate at 0,1,2 (opening third) →
    // 3/3 = 100% > 75%. Filler 'establish_world'.
    it('RHYTHM_COMPLICATE_ZONE_CLUSTER fires when >75% of complicating scenes cluster in one third', async () => {
      const recs918a = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'complicate' : 'establish_world' }));
      const res = await runR918(recs918a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_COMPLICATE_ZONE_CLUSTER'), 'RHYTHM_COMPLICATE_ZONE_CLUSTER should fire');
    });

    it('RHYTHM_COMPLICATE_ZONE_CLUSTER does not fire when complicating scenes spread across thirds', async () => {
      const recs918an = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'complicate' : 'establish_world' }));
      const res = await runR918(recs918an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_COMPLICATE_ZONE_CLUSTER'), 'RHYTHM_COMPLICATE_ZONE_CLUSTER should not fire');
    });

    // RHYTHM_COMPLICATE_DROUGHT_RUN fire: n=10; complicate at 0,1,2 only, then a run of 7
    // consecutive scenes (3-9) with none.
    it('RHYTHM_COMPLICATE_DROUGHT_RUN fires when a long run has no complicating scene', async () => {
      const recs918b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'complicate' : 'establish_world' }));
      const res = await runR918(recs918b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_COMPLICATE_DROUGHT_RUN'), 'RHYTHM_COMPLICATE_DROUGHT_RUN should fire');
    });

    it('RHYTHM_COMPLICATE_DROUGHT_RUN does not fire when complicating scenes are evenly spread', async () => {
      const recs918bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'complicate' : 'establish_world' }));
      const res = await runR918(recs918bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_COMPLICATE_DROUGHT_RUN'), 'RHYTHM_COMPLICATE_DROUGHT_RUN should not fire');
    });

    // RHYTHM_NEGATIVE_EMOTION_ZONE_IMBALANCE fire: n=10, Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9};
    // negative at 0,1,2,8,9 → Z0 3/5=60% (bloat), Z1 and Z2 empty. Filler 'neutral'.
    it('RHYTHM_NEGATIVE_EMOTION_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of negative-shift scenes', async () => {
      const recs918c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2, 8, 9].includes(i) ? 'negative' : 'neutral' }));
      const res = await runR918(recs918c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_NEGATIVE_EMOTION_ZONE_IMBALANCE'), 'RHYTHM_NEGATIVE_EMOTION_ZONE_IMBALANCE should fire');
    });

    it('RHYTHM_NEGATIVE_EMOTION_ZONE_IMBALANCE does not fire when negative-shift scenes touch every zone', async () => {
      const recs918cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 3, 5, 8].includes(i) ? 'negative' : 'neutral' }));
      const res = await runR918(recs918cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_NEGATIVE_EMOTION_ZONE_IMBALANCE'), 'RHYTHM_NEGATIVE_EMOTION_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 904 — rhythmPass: rhythm turning point zone imbalance, rhythm introduce conflict zone imbalance, rhythm character moment zone imbalance', async () => {
    const runR904 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched →
    // no-fire. Filler is 'establish_world' (not one of the tested purpose values).
    it('RHYTHM_TURNING_POINT_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of turning-point scenes', async () => {
      const recs904a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'turning_point' : 'establish_world' }),
      );
      const res = await runR904(recs904a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_TURNING_POINT_ZONE_IMBALANCE'), 'RHYTHM_TURNING_POINT_ZONE_IMBALANCE should fire');
    });

    it('RHYTHM_TURNING_POINT_ZONE_IMBALANCE does not fire when turning-point scenes touch every zone', async () => {
      const recs904an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'turning_point' : 'establish_world' }),
      );
      const res = await runR904(recs904an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_TURNING_POINT_ZONE_IMBALANCE'), 'RHYTHM_TURNING_POINT_ZONE_IMBALANCE should not fire');
    });

    it('RHYTHM_INTRODUCE_CONFLICT_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of conflict-introducing scenes', async () => {
      const recs904b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'introduce_conflict' : 'establish_world' }),
      );
      const res = await runR904(recs904b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_INTRODUCE_CONFLICT_ZONE_IMBALANCE'), 'RHYTHM_INTRODUCE_CONFLICT_ZONE_IMBALANCE should fire');
    });

    it('RHYTHM_INTRODUCE_CONFLICT_ZONE_IMBALANCE does not fire when conflict-introducing scenes touch every zone', async () => {
      const recs904bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'introduce_conflict' : 'establish_world' }),
      );
      const res = await runR904(recs904bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_INTRODUCE_CONFLICT_ZONE_IMBALANCE'), 'RHYTHM_INTRODUCE_CONFLICT_ZONE_IMBALANCE should not fire');
    });

    it('RHYTHM_CHARACTER_MOMENT_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of character-moment scenes', async () => {
      const recs904c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'character_moment' : 'establish_world' }),
      );
      const res = await runR904(recs904c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_CHARACTER_MOMENT_ZONE_IMBALANCE'), 'RHYTHM_CHARACTER_MOMENT_ZONE_IMBALANCE should fire');
    });

    it('RHYTHM_CHARACTER_MOMENT_ZONE_IMBALANCE does not fire when character-moment scenes touch every zone', async () => {
      const recs904cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'character_moment' : 'establish_world' }),
      );
      const res = await runR904(recs904cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_CHARACTER_MOMENT_ZONE_IMBALANCE'), 'RHYTHM_CHARACTER_MOMENT_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 890 — rhythmPass: rhythm climax zone imbalance, rhythm establish world zone imbalance, rhythm resolution zone imbalance', async () => {
    const runR890 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RHYTHM_CLIMAX_ZONE_IMBALANCE fire:
    // n=10, 4 zones (Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}); climax at 0,1,2,8,9 →
    // Z0 has 3/5=60% (bloat, >=50%), Z1 and Z2 are empty.
    it('RHYTHM_CLIMAX_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of climax-purposed scenes', async () => {
      const recs890a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runR890(recs890a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_CLIMAX_ZONE_IMBALANCE'), 'RHYTHM_CLIMAX_ZONE_IMBALANCE should fire');
    });

    it('RHYTHM_CLIMAX_ZONE_IMBALANCE does not fire when climax-purposed scenes touch every zone', async () => {
      const recs890an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runR890(recs890an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_CLIMAX_ZONE_IMBALANCE'), 'RHYTHM_CLIMAX_ZONE_IMBALANCE should not fire');
    });

    // RHYTHM_ESTABLISH_WORLD_ZONE_IMBALANCE fire: same zone geometry as above.
    it('RHYTHM_ESTABLISH_WORLD_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of world-establishing scenes', async () => {
      const recs890b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runR890(recs890b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_ESTABLISH_WORLD_ZONE_IMBALANCE'), 'RHYTHM_ESTABLISH_WORLD_ZONE_IMBALANCE should fire');
    });

    it('RHYTHM_ESTABLISH_WORLD_ZONE_IMBALANCE does not fire when world-establishing scenes touch every zone', async () => {
      const recs890bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runR890(recs890bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_ESTABLISH_WORLD_ZONE_IMBALANCE'), 'RHYTHM_ESTABLISH_WORLD_ZONE_IMBALANCE should not fire');
    });

    // RHYTHM_RESOLUTION_ZONE_IMBALANCE fire: same zone geometry as above.
    it('RHYTHM_RESOLUTION_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of resolution-purposed scenes', async () => {
      const recs890c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'resolution' : 'complicate' }),
      );
      const res = await runR890(recs890c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_RESOLUTION_ZONE_IMBALANCE'), 'RHYTHM_RESOLUTION_ZONE_IMBALANCE should fire');
    });

    it('RHYTHM_RESOLUTION_ZONE_IMBALANCE does not fire when resolution-purposed scenes touch every zone', async () => {
      const recs890cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'resolution' : 'complicate' }),
      );
      const res = await runR890(recs890cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_RESOLUTION_ZONE_IMBALANCE'), 'RHYTHM_RESOLUTION_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 876 — rhythmPass: rhythm climax drought run, rhythm establish world drought run, rhythm resolution drought run', async () => {
    const runR876 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RHYTHM_CLIMAX_DROUGHT_RUN fire:
    // n=10; climax at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('RHYTHM_CLIMAX_DROUGHT_RUN fires when a long run has no climax-purposed scene', async () => {
      const recs876a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runR876(recs876a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_CLIMAX_DROUGHT_RUN'), 'RHYTHM_CLIMAX_DROUGHT_RUN should fire');
    });

    it('RHYTHM_CLIMAX_DROUGHT_RUN does not fire when climax-purposed scenes are evenly spread', async () => {
      const recs876an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runR876(recs876an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_CLIMAX_DROUGHT_RUN'), 'RHYTHM_CLIMAX_DROUGHT_RUN should not fire');
    });

    // RHYTHM_ESTABLISH_WORLD_DROUGHT_RUN fire:
    // n=10; establish_world at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('RHYTHM_ESTABLISH_WORLD_DROUGHT_RUN fires when a long run has no world-establishing scene', async () => {
      const recs876b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runR876(recs876b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_ESTABLISH_WORLD_DROUGHT_RUN'), 'RHYTHM_ESTABLISH_WORLD_DROUGHT_RUN should fire');
    });

    it('RHYTHM_ESTABLISH_WORLD_DROUGHT_RUN does not fire when world-establishing scenes are evenly spread', async () => {
      const recs876bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runR876(recs876bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_ESTABLISH_WORLD_DROUGHT_RUN'), 'RHYTHM_ESTABLISH_WORLD_DROUGHT_RUN should not fire');
    });

    // RHYTHM_RESOLUTION_DROUGHT_RUN fire:
    // n=10; resolution at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('RHYTHM_RESOLUTION_DROUGHT_RUN fires when a long run has no resolution-purposed scene', async () => {
      const recs876c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'resolution' : 'complicate' }),
      );
      const res = await runR876(recs876c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_RESOLUTION_DROUGHT_RUN'), 'RHYTHM_RESOLUTION_DROUGHT_RUN should fire');
    });

    it('RHYTHM_RESOLUTION_DROUGHT_RUN does not fire when resolution-purposed scenes are evenly spread', async () => {
      const recs876cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'resolution' : 'complicate' }),
      );
      const res = await runR876(recs876cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_RESOLUTION_DROUGHT_RUN'), 'RHYTHM_RESOLUTION_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 862 — rhythmPass: rhythm establish world zone cluster, rhythm climax zone cluster, rhythm resolution zone cluster', async () => {
    const runR862 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RHYTHM_ESTABLISH_WORLD_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; establish_world scenes at 0,1,2 → 100% opening third
    it('RHYTHM_ESTABLISH_WORLD_ZONE_CLUSTER fires when >75% of world-establishing scenes cluster in one third', async () => {
      const recs862a = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runR862(recs862a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_ESTABLISH_WORLD_ZONE_CLUSTER'), 'RHYTHM_ESTABLISH_WORLD_ZONE_CLUSTER should fire');
    });

    it('RHYTHM_ESTABLISH_WORLD_ZONE_CLUSTER does not fire when world-establishing scenes spread across thirds', async () => {
      const recs862an = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runR862(recs862an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_ESTABLISH_WORLD_ZONE_CLUSTER'), 'RHYTHM_ESTABLISH_WORLD_ZONE_CLUSTER should not fire');
    });

    // RHYTHM_CLIMAX_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; climax scenes at 0,1,2 → 100% opening third
    it('RHYTHM_CLIMAX_ZONE_CLUSTER fires when >75% of climax-purposed scenes cluster in one third', async () => {
      const recs862b = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runR862(recs862b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_CLIMAX_ZONE_CLUSTER'), 'RHYTHM_CLIMAX_ZONE_CLUSTER should fire');
    });

    it('RHYTHM_CLIMAX_ZONE_CLUSTER does not fire when climax-purposed scenes spread across thirds', async () => {
      const recs862bn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runR862(recs862bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_CLIMAX_ZONE_CLUSTER'), 'RHYTHM_CLIMAX_ZONE_CLUSTER should not fire');
    });

    // RHYTHM_RESOLUTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; resolution scenes at 0,1,2 → 100% opening third
    it('RHYTHM_RESOLUTION_ZONE_CLUSTER fires when >75% of resolution-purposed scenes cluster in one third', async () => {
      const recs862c = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'resolution' : 'complicate' }),
      );
      const res = await runR862(recs862c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_RESOLUTION_ZONE_CLUSTER'), 'RHYTHM_RESOLUTION_ZONE_CLUSTER should fire');
    });

    it('RHYTHM_RESOLUTION_ZONE_CLUSTER does not fire when resolution-purposed scenes spread across thirds', async () => {
      const recs862cn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'resolution' : 'complicate' }),
      );
      const res = await runR862(recs862cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_RESOLUTION_ZONE_CLUSTER'), 'RHYTHM_RESOLUTION_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 848 — rhythmPass: rhythm stakes drought run, rhythm introduce conflict drought run, rhythm positive emotion drought run', async () => {
    const runR848 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RHYTHM_STAKES_DROUGHT_RUN fire:
    // n=10; raise_stakes at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('RHYTHM_STAKES_DROUGHT_RUN fires when a long run has no stakes-raising purpose', async () => {
      const recs848a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'raise_stakes' : 'complicate' }),
      );
      const res = await runR848(recs848a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_STAKES_DROUGHT_RUN'), 'RHYTHM_STAKES_DROUGHT_RUN should fire');
    });

    it('RHYTHM_STAKES_DROUGHT_RUN does not fire when stakes-raising scenes are evenly spread', async () => {
      const recs848an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'raise_stakes' : 'complicate' }),
      );
      const res = await runR848(recs848an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_STAKES_DROUGHT_RUN'), 'RHYTHM_STAKES_DROUGHT_RUN should not fire');
    });

    // RHYTHM_INTRODUCE_CONFLICT_DROUGHT_RUN fire:
    // n=10; introduce_conflict at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('RHYTHM_INTRODUCE_CONFLICT_DROUGHT_RUN fires when a long run has no new conflict', async () => {
      const recs848b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'introduce_conflict' : 'complicate' }),
      );
      const res = await runR848(recs848b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_INTRODUCE_CONFLICT_DROUGHT_RUN'), 'RHYTHM_INTRODUCE_CONFLICT_DROUGHT_RUN should fire');
    });

    it('RHYTHM_INTRODUCE_CONFLICT_DROUGHT_RUN does not fire when conflict-introducing scenes are evenly spread', async () => {
      const recs848bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'introduce_conflict' : 'complicate' }),
      );
      const res = await runR848(recs848bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_INTRODUCE_CONFLICT_DROUGHT_RUN'), 'RHYTHM_INTRODUCE_CONFLICT_DROUGHT_RUN should not fire');
    });

    // RHYTHM_POSITIVE_EMOTION_DROUGHT_RUN fire:
    // n=10; positive-emotion at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('RHYTHM_POSITIVE_EMOTION_DROUGHT_RUN fires when a long run has no positive-emotion charge', async () => {
      const recs848c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runR848(recs848c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_POSITIVE_EMOTION_DROUGHT_RUN'), 'RHYTHM_POSITIVE_EMOTION_DROUGHT_RUN should fire');
    });

    it('RHYTHM_POSITIVE_EMOTION_DROUGHT_RUN does not fire when positive-emotion scenes are evenly spread', async () => {
      const recs848cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 3, 6, 9].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runR848(recs848cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_POSITIVE_EMOTION_DROUGHT_RUN'), 'RHYTHM_POSITIVE_EMOTION_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 834 — rhythmPass: rhythm stakes zone cluster, rhythm introduce conflict zone cluster, rhythm positive emotion zone cluster', async () => {
    const runR834 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RHYTHM_STAKES_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; raise_stakes scenes at 0,1,2 → 100% opening third
    it('RHYTHM_STAKES_ZONE_CLUSTER fires when >75% of stakes-raising scenes cluster in one third', async () => {
      const recs834a = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'raise_stakes' : 'complicate' }),
      );
      const res = await runR834(recs834a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_STAKES_ZONE_CLUSTER'), 'RHYTHM_STAKES_ZONE_CLUSTER should fire');
    });

    it('RHYTHM_STAKES_ZONE_CLUSTER does not fire when stakes-raising scenes spread across thirds', async () => {
      const recs834an = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'raise_stakes' : 'complicate' }),
      );
      const res = await runR834(recs834an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_STAKES_ZONE_CLUSTER'), 'RHYTHM_STAKES_ZONE_CLUSTER should not fire');
    });

    // RHYTHM_INTRODUCE_CONFLICT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; introduce_conflict scenes at 0,1,2 → 100% opening third
    it('RHYTHM_INTRODUCE_CONFLICT_ZONE_CLUSTER fires when >75% of conflict-introducing scenes cluster in one third', async () => {
      const recs834b = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'introduce_conflict' : 'complicate' }),
      );
      const res = await runR834(recs834b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_INTRODUCE_CONFLICT_ZONE_CLUSTER'), 'RHYTHM_INTRODUCE_CONFLICT_ZONE_CLUSTER should fire');
    });

    it('RHYTHM_INTRODUCE_CONFLICT_ZONE_CLUSTER does not fire when conflict-introducing scenes spread across thirds', async () => {
      const recs834bn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'introduce_conflict' : 'complicate' }),
      );
      const res = await runR834(recs834bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_INTRODUCE_CONFLICT_ZONE_CLUSTER'), 'RHYTHM_INTRODUCE_CONFLICT_ZONE_CLUSTER should not fire');
    });

    // RHYTHM_POSITIVE_EMOTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; positive-emotion scenes at 0,1,2 → 100% opening third
    it('RHYTHM_POSITIVE_EMOTION_ZONE_CLUSTER fires when >75% of positive-emotion scenes cluster in one third', async () => {
      const recs834c = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runR834(recs834c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_POSITIVE_EMOTION_ZONE_CLUSTER'), 'RHYTHM_POSITIVE_EMOTION_ZONE_CLUSTER should fire');
    });

    it('RHYTHM_POSITIVE_EMOTION_ZONE_CLUSTER does not fire when positive-emotion scenes spread across thirds', async () => {
      const recs834cn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 4, 8].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runR834(recs834cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_POSITIVE_EMOTION_ZONE_CLUSTER'), 'RHYTHM_POSITIVE_EMOTION_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 820 — rhythmPass: rhythm character moment drought run, rhythm turning point zone cluster, rhythm turning point drought run', async () => {
    const runR820 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RHYTHM_CHARACTER_MOMENT_DROUGHT_RUN fire:
    // n=10; character_moment at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('RHYTHM_CHARACTER_MOMENT_DROUGHT_RUN fires when a long run has no character moment', async () => {
      const recs820a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'character_moment' : 'complicate' }),
      );
      const res = await runR820(recs820a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_CHARACTER_MOMENT_DROUGHT_RUN'), 'RHYTHM_CHARACTER_MOMENT_DROUGHT_RUN should fire');
    });

    it('RHYTHM_CHARACTER_MOMENT_DROUGHT_RUN does not fire when character moments are evenly spread', async () => {
      const recs820an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'character_moment' : 'complicate' }),
      );
      const res = await runR820(recs820an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_CHARACTER_MOMENT_DROUGHT_RUN'), 'RHYTHM_CHARACTER_MOMENT_DROUGHT_RUN should not fire');
    });

    // RHYTHM_TURNING_POINT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; turning_point scenes at 0,1,2 → 100% opening third
    it('RHYTHM_TURNING_POINT_ZONE_CLUSTER fires when >75% of turning-point scenes cluster in one third', async () => {
      const recs820b = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'turning_point' : 'complicate' }),
      );
      const res = await runR820(recs820b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_TURNING_POINT_ZONE_CLUSTER'), 'RHYTHM_TURNING_POINT_ZONE_CLUSTER should fire');
    });

    it('RHYTHM_TURNING_POINT_ZONE_CLUSTER does not fire when turning-point scenes spread across thirds', async () => {
      const recs820bn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'turning_point' : 'complicate' }),
      );
      const res = await runR820(recs820bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_TURNING_POINT_ZONE_CLUSTER'), 'RHYTHM_TURNING_POINT_ZONE_CLUSTER should not fire');
    });

    // RHYTHM_TURNING_POINT_DROUGHT_RUN fire:
    // n=10; turning_point at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('RHYTHM_TURNING_POINT_DROUGHT_RUN fires when a long run has no turning point', async () => {
      const recs820c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'turning_point' : 'complicate' }),
      );
      const res = await runR820(recs820c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_TURNING_POINT_DROUGHT_RUN'), 'RHYTHM_TURNING_POINT_DROUGHT_RUN should fire');
    });

    it('RHYTHM_TURNING_POINT_DROUGHT_RUN does not fire when turning points are evenly spread', async () => {
      const recs820cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'turning_point' : 'complicate' }),
      );
      const res = await runR820(recs820cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_TURNING_POINT_DROUGHT_RUN'), 'RHYTHM_TURNING_POINT_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 806 — rhythmPass: rhythm negative emotion zone cluster, rhythm negative emotion drought run, rhythm character moment zone cluster', async () => {
    const runR806 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RHYTHM_NEGATIVE_EMOTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; negative-emotion scenes at 0,1,2 → 100% opening third
    it('RHYTHM_NEGATIVE_EMOTION_ZONE_CLUSTER fires when >75% of negative-emotion scenes cluster in one third', async () => {
      const recs806a = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runR806(recs806a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_NEGATIVE_EMOTION_ZONE_CLUSTER'), 'RHYTHM_NEGATIVE_EMOTION_ZONE_CLUSTER should fire');
    });

    it('RHYTHM_NEGATIVE_EMOTION_ZONE_CLUSTER does not fire when negative-emotion scenes spread across thirds', async () => {
      const recs806an = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 4, 8].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runR806(recs806an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_NEGATIVE_EMOTION_ZONE_CLUSTER'), 'RHYTHM_NEGATIVE_EMOTION_ZONE_CLUSTER should not fire');
    });

    // RHYTHM_NEGATIVE_EMOTION_DROUGHT_RUN fire:
    // n=10; negative-emotion at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('RHYTHM_NEGATIVE_EMOTION_DROUGHT_RUN fires when a long run has no negative-emotion charge', async () => {
      const recs806b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runR806(recs806b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_NEGATIVE_EMOTION_DROUGHT_RUN'), 'RHYTHM_NEGATIVE_EMOTION_DROUGHT_RUN should fire');
    });

    it('RHYTHM_NEGATIVE_EMOTION_DROUGHT_RUN does not fire when negative-emotion scenes are evenly spread', async () => {
      const recs806bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 3, 6, 9].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runR806(recs806bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_NEGATIVE_EMOTION_DROUGHT_RUN'), 'RHYTHM_NEGATIVE_EMOTION_DROUGHT_RUN should not fire');
    });

    // RHYTHM_CHARACTER_MOMENT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; character_moment scenes at 0,1,2 → 100% opening third
    it('RHYTHM_CHARACTER_MOMENT_ZONE_CLUSTER fires when >75% of character-moment scenes cluster in one third', async () => {
      const recs806c = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'character_moment' : 'complicate' }),
      );
      const res = await runR806(recs806c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_CHARACTER_MOMENT_ZONE_CLUSTER'), 'RHYTHM_CHARACTER_MOMENT_ZONE_CLUSTER should fire');
    });

    it('RHYTHM_CHARACTER_MOMENT_ZONE_CLUSTER does not fire when character-moment scenes spread across thirds', async () => {
      const recs806cn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'character_moment' : 'complicate' }),
      );
      const res = await runR806(recs806cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_CHARACTER_MOMENT_ZONE_CLUSTER'), 'RHYTHM_CHARACTER_MOMENT_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 792 — rhythmPass: rhythm suspense peak uncaused, rhythm curiosity peak uncaused, rhythm revelation zone cluster', async () => {
    const runR792 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RHYTHM_SUSPENSE_PEAK_UNCAUSED fire:
    // 8 scenes; suspenseDelta qualifying (>0) at 2 and 5; peak resolves to the first (idx 2, tie
    // on magnitude 3); no dramaticTurn/revelation at indices 0 or 1 (2-scene lookback).
    it('RHYTHM_SUSPENSE_PEAK_UNCAUSED fires when the peak suspense scene has no preparing cause nearby', async () => {
      const recs792a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs792a[2] = makeSharedRecord(2, { suspenseDelta: 3 });
      recs792a[5] = makeSharedRecord(5, { suspenseDelta: 3 });
      const res = await runR792(recs792a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_SUSPENSE_PEAK_UNCAUSED'), 'RHYTHM_SUSPENSE_PEAK_UNCAUSED should fire');
    });

    it('RHYTHM_SUSPENSE_PEAK_UNCAUSED does not fire when a preparing cause precedes the peak suspense scene', async () => {
      const recs792an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs792an[2] = makeSharedRecord(2, { suspenseDelta: 3 });
      recs792an[5] = makeSharedRecord(5, { suspenseDelta: 3 });
      recs792an[1] = makeSharedRecord(1, { dramaticTurn: 'reversal' });
      const res = await runR792(recs792an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_SUSPENSE_PEAK_UNCAUSED'), 'RHYTHM_SUSPENSE_PEAK_UNCAUSED should not fire');
    });

    // RHYTHM_CURIOSITY_PEAK_UNCAUSED fire:
    // 8 scenes; curiosityDelta qualifying (>0) at 2 and 5; peak resolves to the first (idx 2, tie
    // on magnitude 3); no dramaticTurn/revelation at indices 0 or 1 (2-scene lookback).
    it('RHYTHM_CURIOSITY_PEAK_UNCAUSED fires when the peak curiosity scene has no preparing cause nearby', async () => {
      const recs792b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs792b[2] = makeSharedRecord(2, { curiosityDelta: 3 });
      recs792b[5] = makeSharedRecord(5, { curiosityDelta: 3 });
      const res = await runR792(recs792b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_CURIOSITY_PEAK_UNCAUSED'), 'RHYTHM_CURIOSITY_PEAK_UNCAUSED should fire');
    });

    it('RHYTHM_CURIOSITY_PEAK_UNCAUSED does not fire when a preparing cause precedes the peak curiosity scene', async () => {
      const recs792bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs792bn[2] = makeSharedRecord(2, { curiosityDelta: 3 });
      recs792bn[5] = makeSharedRecord(5, { curiosityDelta: 3 });
      recs792bn[1] = makeSharedRecord(1, { dramaticTurn: 'reversal' });
      const res = await runR792(recs792bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_CURIOSITY_PEAK_UNCAUSED'), 'RHYTHM_CURIOSITY_PEAK_UNCAUSED should not fire');
    });

    // RHYTHM_REVELATION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; revelation scenes at 0,1,2 → 100% opening third
    it('RHYTHM_REVELATION_ZONE_CLUSTER fires when >75% of revelation scenes cluster in one third', async () => {
      const recs792c = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { revelation: [0, 1, 2].includes(i) ? 'truth revealed' : null }),
      );
      const res = await runR792(recs792c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_REVELATION_ZONE_CLUSTER'), 'RHYTHM_REVELATION_ZONE_CLUSTER should fire');
    });

    it('RHYTHM_REVELATION_ZONE_CLUSTER does not fire when revelation scenes spread across thirds', async () => {
      const recs792cn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { revelation: [0, 4, 8].includes(i) ? 'truth revealed' : null }),
      );
      const res = await runR792(recs792cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_REVELATION_ZONE_CLUSTER'), 'RHYTHM_REVELATION_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 778 — rhythmPass: rhythm suspense drought run, rhythm curiosity zone cluster, rhythm revelation drought run', async () => {
    const runR778 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RHYTHM_SUSPENSE_DROUGHT_RUN fire:
    // n=10; suspenseDelta>0 at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('RHYTHM_SUSPENSE_DROUGHT_RUN fires when a long run has no rising suspense', async () => {
      const recs778a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { suspenseDelta: [0, 1, 2].includes(i) ? 2 : 0 }),
      );
      const res = await runR778(recs778a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_SUSPENSE_DROUGHT_RUN'), 'RHYTHM_SUSPENSE_DROUGHT_RUN should fire');
    });

    it('RHYTHM_SUSPENSE_DROUGHT_RUN does not fire when suspense rises are evenly spread', async () => {
      const recs778an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { suspenseDelta: [0, 3, 6, 9].includes(i) ? 2 : 0 }),
      );
      const res = await runR778(recs778an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_SUSPENSE_DROUGHT_RUN'), 'RHYTHM_SUSPENSE_DROUGHT_RUN should not fire');
    });

    // RHYTHM_CURIOSITY_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; curiosity-positive scenes at 0,1,2 → 100% opening third
    it('RHYTHM_CURIOSITY_ZONE_CLUSTER fires when >75% of curiosity-positive scenes cluster in one third', async () => {
      const recs778b = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 1, 2].includes(i) ? 2 : 0 }),
      );
      const res = await runR778(recs778b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_CURIOSITY_ZONE_CLUSTER'), 'RHYTHM_CURIOSITY_ZONE_CLUSTER should fire');
    });

    it('RHYTHM_CURIOSITY_ZONE_CLUSTER does not fire when curiosity-positive scenes spread across thirds', async () => {
      const recs778bn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 4, 8].includes(i) ? 2 : 0 }),
      );
      const res = await runR778(recs778bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_CURIOSITY_ZONE_CLUSTER'), 'RHYTHM_CURIOSITY_ZONE_CLUSTER should not fire');
    });

    // RHYTHM_REVELATION_DROUGHT_RUN fire:
    // n=10; revelation present at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('RHYTHM_REVELATION_DROUGHT_RUN fires when a long run has no revelation', async () => {
      const recs778c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { revelation: [0, 1, 2].includes(i) ? 'truth revealed' : null }),
      );
      const res = await runR778(recs778c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_REVELATION_DROUGHT_RUN'), 'RHYTHM_REVELATION_DROUGHT_RUN should fire');
    });

    it('RHYTHM_REVELATION_DROUGHT_RUN does not fire when revelations are evenly spread', async () => {
      const recs778cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { revelation: [0, 3, 6, 9].includes(i) ? 'truth revealed' : null }),
      );
      const res = await runR778(recs778cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_REVELATION_DROUGHT_RUN'), 'RHYTHM_REVELATION_DROUGHT_RUN should not fire');
    });
  });


  describe('Wave 764 — rhythmPass: rhythm suspense zone cluster, rhythm curiosity drought run, rhythm revelation peak uncaused', async () => {
    const runR764 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RHYTHM_SUSPENSE_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; suspenseDelta>0 scenes at 0,1,2 → 100% opening third
    it('RHYTHM_SUSPENSE_ZONE_CLUSTER fires when >75% of suspense-positive scenes cluster in one third', async () => {
      const recs764a = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { suspenseDelta: [0, 1, 2].includes(i) ? 2 : 0 }),
      );
      const res = await runR764(recs764a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_SUSPENSE_ZONE_CLUSTER'), 'RHYTHM_SUSPENSE_ZONE_CLUSTER should fire');
    });

    it('RHYTHM_SUSPENSE_ZONE_CLUSTER does not fire when suspense-positive scenes spread across thirds', async () => {
      const recs764an = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { suspenseDelta: [0, 4, 8].includes(i) ? 2 : 0 }),
      );
      const res = await runR764(recs764an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_SUSPENSE_ZONE_CLUSTER'), 'RHYTHM_SUSPENSE_ZONE_CLUSTER should not fire');
    });

    // RHYTHM_CURIOSITY_DROUGHT_RUN fire:
    // n=10; curiosityDelta>0 at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('RHYTHM_CURIOSITY_DROUGHT_RUN fires when a long run has no rising curiosity', async () => {
      const recs764b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 1, 2].includes(i) ? 2 : 0 }),
      );
      const res = await runR764(recs764b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_CURIOSITY_DROUGHT_RUN'), 'RHYTHM_CURIOSITY_DROUGHT_RUN should fire');
    });

    it('RHYTHM_CURIOSITY_DROUGHT_RUN does not fire when curiosity rises are evenly spread', async () => {
      const recs764bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 3, 6, 9].includes(i) ? 2 : 0 }),
      );
      const res = await runR764(recs764bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_CURIOSITY_DROUGHT_RUN'), 'RHYTHM_CURIOSITY_DROUGHT_RUN should not fire');
    });

    // RHYTHM_REVELATION_PEAK_UNCAUSED fire:
    // 8 scenes; revelations at 2 (peak, earliest) and 5; no dramaticTurn at 0 or 1 (the 2 scenes
    // before the peak at index 2).
    it('RHYTHM_REVELATION_PEAK_UNCAUSED fires when the peak revelation scene has no dramatic turn nearby', async () => {
      const recs764c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs764c[2] = makeSharedRecord(2, { revelation: 'truth revealed' });
      recs764c[5] = makeSharedRecord(5, { revelation: 'second truth revealed' });
      const res = await runR764(recs764c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_REVELATION_PEAK_UNCAUSED'), 'RHYTHM_REVELATION_PEAK_UNCAUSED should fire');
    });

    it('RHYTHM_REVELATION_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak revelation', async () => {
      const recs764cn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs764cn[2] = makeSharedRecord(2, { revelation: 'truth revealed' });
      recs764cn[5] = makeSharedRecord(5, { revelation: 'second truth revealed' });
      recs764cn[1] = makeSharedRecord(1, { dramaticTurn: 'reversal' });
      const res = await runR764(recs764cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_REVELATION_PEAK_UNCAUSED'), 'RHYTHM_REVELATION_PEAK_UNCAUSED should not fire');
    });
  });


  describe('Wave 750 — rhythmPass: rhythm clock zone cluster, rhythm emotion drought run, rhythm turn drought run', async () => {
    const runR750 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RHYTHM_CLOCK_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; clockRaised scenes at 0,1,2 → 100% opening third
    it('RHYTHM_CLOCK_ZONE_CLUSTER fires when >75% of clockRaised scenes cluster in one third', async () => {
      const recs750a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs750a[0] = makeSharedRecord(0, { clockRaised: true });
      recs750a[1] = makeSharedRecord(1, { clockRaised: true });
      recs750a[2] = makeSharedRecord(2, { clockRaised: true });
      const res = await runR750(recs750a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_CLOCK_ZONE_CLUSTER'), 'RHYTHM_CLOCK_ZONE_CLUSTER should fire');
    });

    // RHYTHM_CLOCK_ZONE_CLUSTER no-fire:
    // clockRaised scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('RHYTHM_CLOCK_ZONE_CLUSTER does not fire when clockRaised scenes are distributed across thirds', async () => {
      const recs750an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs750an[0] = makeSharedRecord(0, { clockRaised: true });
      recs750an[4] = makeSharedRecord(4, { clockRaised: true });
      recs750an[7] = makeSharedRecord(7, { clockRaised: true });
      const res = await runR750(recs750an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_CLOCK_ZONE_CLUSTER'), 'RHYTHM_CLOCK_ZONE_CLUSTER should not fire');
    });

    // RHYTHM_EMOTION_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 carry a positive emotional shift (>=3 present overall); scenes 3-9 (7 scenes) have none
    it('RHYTHM_EMOTION_DROUGHT_RUN fires when the longest no-positive-emotion run reaches 6', async () => {
      const recs750b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs750b[0] = makeSharedRecord(0, { emotionalShift: 'positive' });
      recs750b[1] = makeSharedRecord(1, { emotionalShift: 'positive' });
      recs750b[2] = makeSharedRecord(2, { emotionalShift: 'positive' });
      const res = await runR750(recs750b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_EMOTION_DROUGHT_RUN'), 'RHYTHM_EMOTION_DROUGHT_RUN should fire');
    });

    // RHYTHM_EMOTION_DROUGHT_RUN no-fire:
    // positive-emotion scenes spread out so no gap reaches 6 consecutive scenes
    it('RHYTHM_EMOTION_DROUGHT_RUN does not fire when positive emotion is spread through the story', async () => {
      const recs750bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs750bn[0] = makeSharedRecord(0, { emotionalShift: 'positive' });
      recs750bn[3] = makeSharedRecord(3, { emotionalShift: 'positive' });
      recs750bn[6] = makeSharedRecord(6, { emotionalShift: 'positive' });
      recs750bn[9] = makeSharedRecord(9, { emotionalShift: 'positive' });
      const res = await runR750(recs750bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_EMOTION_DROUGHT_RUN'), 'RHYTHM_EMOTION_DROUGHT_RUN should not fire');
    });

    // RHYTHM_TURN_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 carry a dramatic turn (>=3 present overall); scenes 3-9 (7 scenes) have none
    it('RHYTHM_TURN_DROUGHT_RUN fires when the longest no-dramatic-turn run reaches 6', async () => {
      const recs750c = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs750c[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs750c[1] = makeSharedRecord(1, { dramaticTurn: 'reversal' });
      recs750c[2] = makeSharedRecord(2, { dramaticTurn: 'reversal' });
      const res = await runR750(recs750c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_TURN_DROUGHT_RUN'), 'RHYTHM_TURN_DROUGHT_RUN should fire');
    });

    // RHYTHM_TURN_DROUGHT_RUN no-fire:
    // dramatic-turn scenes spread out so no gap reaches 6 consecutive scenes
    it('RHYTHM_TURN_DROUGHT_RUN does not fire when dramatic turns are spread through the story', async () => {
      const recs750cn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs750cn[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs750cn[3] = makeSharedRecord(3, { dramaticTurn: 'reversal' });
      recs750cn[6] = makeSharedRecord(6, { dramaticTurn: 'reversal' });
      recs750cn[9] = makeSharedRecord(9, { dramaticTurn: 'reversal' });
      const res = await runR750(recs750cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_TURN_DROUGHT_RUN'), 'RHYTHM_TURN_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 736 — rhythmPass: rhythm clock delta drought run, rhythm staging zone cluster, rhythm open thread zone cluster', async () => {
    const runR736 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RHYTHM_CLOCK_DELTA_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 shift the clock (>=3 present overall); scenes 3-9 (7 scenes) have none
    it('RHYTHM_CLOCK_DELTA_DROUGHT_RUN fires when the longest no-clock-movement run reaches 6', async () => {
      const recs736a = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs736a[0] = makeSharedRecord(0, { clockDelta: 1 });
      recs736a[1] = makeSharedRecord(1, { clockDelta: -1 });
      recs736a[2] = makeSharedRecord(2, { clockDelta: 1 });
      const res = await runR736(recs736a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_CLOCK_DELTA_DROUGHT_RUN'), 'RHYTHM_CLOCK_DELTA_DROUGHT_RUN should fire');
    });

    // RHYTHM_CLOCK_DELTA_DROUGHT_RUN no-fire:
    // clock-shifting scenes spread out so no gap reaches 6 consecutive scenes
    it('RHYTHM_CLOCK_DELTA_DROUGHT_RUN does not fire when clock movement is spread through the story', async () => {
      const recs736an = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs736an[0] = makeSharedRecord(0, { clockDelta: 1 });
      recs736an[3] = makeSharedRecord(3, { clockDelta: -1 });
      recs736an[6] = makeSharedRecord(6, { clockDelta: 1 });
      recs736an[9] = makeSharedRecord(9, { clockDelta: -1 });
      const res = await runR736(recs736an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_CLOCK_DELTA_DROUGHT_RUN'), 'RHYTHM_CLOCK_DELTA_DROUGHT_RUN should not fire');
    });

    // RHYTHM_STAGING_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; visually dense scenes at 0,1,2 → 100% opening third
    it('RHYTHM_STAGING_ZONE_CLUSTER fires when >75% of visually dense scenes cluster in one third', async () => {
      const recs736b = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs736b[0] = makeSharedRecord(0, { visualBeats: ['a', 'b'] });
      recs736b[1] = makeSharedRecord(1, { visualBeats: ['a', 'b'] });
      recs736b[2] = makeSharedRecord(2, { visualBeats: ['a', 'b'] });
      const res = await runR736(recs736b);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_STAGING_ZONE_CLUSTER'), 'RHYTHM_STAGING_ZONE_CLUSTER should fire');
    });

    // RHYTHM_STAGING_ZONE_CLUSTER no-fire:
    // visually dense scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('RHYTHM_STAGING_ZONE_CLUSTER does not fire when visually dense scenes are distributed across thirds', async () => {
      const recs736bn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs736bn[0] = makeSharedRecord(0, { visualBeats: ['a', 'b'] });
      recs736bn[4] = makeSharedRecord(4, { visualBeats: ['a', 'b'] });
      recs736bn[7] = makeSharedRecord(7, { visualBeats: ['a', 'b'] });
      const res = await runR736(recs736bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_STAGING_ZONE_CLUSTER'), 'RHYTHM_STAGING_ZONE_CLUSTER should not fire');
    });

    // RHYTHM_OPEN_THREAD_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; open-thread scenes at 0,1,2 → 100% opening third
    it('RHYTHM_OPEN_THREAD_ZONE_CLUSTER fires when >75% of open-thread scenes cluster in one third', async () => {
      const recs736c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs736c[0] = makeSharedRecord(0, { unresolvedClues: ['clue-a'] });
      recs736c[1] = makeSharedRecord(1, { unresolvedClues: ['clue-b'] });
      recs736c[2] = makeSharedRecord(2, { unresolvedClues: ['clue-c'] });
      const res = await runR736(recs736c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RHYTHM_OPEN_THREAD_ZONE_CLUSTER'), 'RHYTHM_OPEN_THREAD_ZONE_CLUSTER should fire');
    });

    // RHYTHM_OPEN_THREAD_ZONE_CLUSTER no-fire:
    // open-thread scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('RHYTHM_OPEN_THREAD_ZONE_CLUSTER does not fire when open-thread scenes are distributed across thirds', async () => {
      const recs736cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs736cn[0] = makeSharedRecord(0, { unresolvedClues: ['clue-a'] });
      recs736cn[4] = makeSharedRecord(4, { unresolvedClues: ['clue-b'] });
      recs736cn[7] = makeSharedRecord(7, { unresolvedClues: ['clue-c'] });
      const res = await runR736(recs736cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RHYTHM_OPEN_THREAD_ZONE_CLUSTER'), 'RHYTHM_OPEN_THREAD_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 722 — rhythmPass: clock signal zone cluster, unresolved signal peak uncaused, staging signal peak uncaused', async () => {
    const runR722 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // CLOCK_SIGNAL_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; clock-advancing scenes at 0,1,2 → 100% opening third
    it('CLOCK_SIGNAL_ZONE_CLUSTER fires when >75% of clock-advancing scenes cluster in one third', async () => {
      const recs722a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs722a[0] = makeSharedRecord(0, { clockDelta: 1 });
      recs722a[1] = makeSharedRecord(1, { clockDelta: 1 });
      recs722a[2] = makeSharedRecord(2, { clockDelta: 1 });
      const res = await runR722(recs722a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_SIGNAL_ZONE_CLUSTER'), 'CLOCK_SIGNAL_ZONE_CLUSTER should fire');
    });

    // CLOCK_SIGNAL_ZONE_CLUSTER no-fire:
    // clock-advancing scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('CLOCK_SIGNAL_ZONE_CLUSTER does not fire when clock-advancing scenes are distributed across thirds', async () => {
      const recs722an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs722an[0] = makeSharedRecord(0, { clockDelta: 1 });
      recs722an[4] = makeSharedRecord(4, { clockDelta: 1 });
      recs722an[7] = makeSharedRecord(7, { clockDelta: 1 });
      const res = await runR722(recs722an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_SIGNAL_ZONE_CLUSTER'), 'CLOCK_SIGNAL_ZONE_CLUSTER should not fire');
    });

    // UNRESOLVED_SIGNAL_PEAK_UNCAUSED fire:
    // 8 scenes; open threads at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('UNRESOLVED_SIGNAL_PEAK_UNCAUSED fires when the peak open-thread scene has no dramatic turn or revelation nearby', async () => {
      const recs722b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs722b[2] = makeSharedRecord(2, { unresolvedClues: ['a'] });
      recs722b[6] = makeSharedRecord(6, { unresolvedClues: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runR722(recs722b);
      assert.ok(res.issues.some((i: any) => i.rule === 'UNRESOLVED_SIGNAL_PEAK_UNCAUSED'), 'UNRESOLVED_SIGNAL_PEAK_UNCAUSED should fire');
    });

    // UNRESOLVED_SIGNAL_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('UNRESOLVED_SIGNAL_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs722bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs722bn[2] = makeSharedRecord(2, { unresolvedClues: ['a'] });
      recs722bn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs722bn[6] = makeSharedRecord(6, { unresolvedClues: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runR722(recs722bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'UNRESOLVED_SIGNAL_PEAK_UNCAUSED'), 'UNRESOLVED_SIGNAL_PEAK_UNCAUSED should not fire');
    });

    // STAGING_SIGNAL_PEAK_UNCAUSED fire:
    // 8 scenes; visual beats at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('STAGING_SIGNAL_PEAK_UNCAUSED fires when the peak physical-staging scene has no dramatic turn or revelation nearby', async () => {
      const recs722c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs722c[2] = makeSharedRecord(2, { visualBeats: ['a beat'] });
      recs722c[6] = makeSharedRecord(6, { visualBeats: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runR722(recs722c);
      assert.ok(res.issues.some((i: any) => i.rule === 'STAGING_SIGNAL_PEAK_UNCAUSED'), 'STAGING_SIGNAL_PEAK_UNCAUSED should fire');
    });

    // STAGING_SIGNAL_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('STAGING_SIGNAL_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs722cn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs722cn[2] = makeSharedRecord(2, { visualBeats: ['a beat'] });
      recs722cn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs722cn[6] = makeSharedRecord(6, { visualBeats: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runR722(recs722cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STAGING_SIGNAL_PEAK_UNCAUSED'), 'STAGING_SIGNAL_PEAK_UNCAUSED should not fire');
    });
  });

  describe('Wave 708 — rhythmPass: dialogue signal zone cluster, seed signal peak uncaused, payoff signal drought run', async () => {
    const runR708 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // DIALOGUE_SIGNAL_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; highlighted-dialogue scenes at 0,1,2 → 100% opening third
    it('DIALOGUE_SIGNAL_ZONE_CLUSTER fires when >75% of highlighted-dialogue scenes cluster in one third', async () => {
      const recs708a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs708a[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs708a[1] = makeSharedRecord(1, { dialogueHighlights: ['line-b'] });
      recs708a[2] = makeSharedRecord(2, { dialogueHighlights: ['line-c'] });
      const res = await runR708(recs708a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_SIGNAL_ZONE_CLUSTER'), 'DIALOGUE_SIGNAL_ZONE_CLUSTER should fire');
    });

    // DIALOGUE_SIGNAL_ZONE_CLUSTER no-fire:
    // highlighted-dialogue scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('DIALOGUE_SIGNAL_ZONE_CLUSTER does not fire when highlighted-dialogue scenes are distributed across thirds', async () => {
      const recs708an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs708an[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs708an[4] = makeSharedRecord(4, { dialogueHighlights: ['line-b'] });
      recs708an[7] = makeSharedRecord(7, { dialogueHighlights: ['line-c'] });
      const res = await runR708(recs708an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_SIGNAL_ZONE_CLUSTER'), 'DIALOGUE_SIGNAL_ZONE_CLUSTER should not fire');
    });

    // SEED_SIGNAL_PEAK_UNCAUSED fire:
    // 8 scenes; seeds at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('SEED_SIGNAL_PEAK_UNCAUSED fires when the peak seed scene has no dramatic turn or revelation nearby', async () => {
      const recs708b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs708b[2] = makeSharedRecord(2, { seededClueIds: ['clue-a'] });
      recs708b[6] = makeSharedRecord(6, { seededClueIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runR708(recs708b);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_SIGNAL_PEAK_UNCAUSED'), 'SEED_SIGNAL_PEAK_UNCAUSED should fire');
    });

    // SEED_SIGNAL_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('SEED_SIGNAL_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs708bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs708bn[2] = makeSharedRecord(2, { seededClueIds: ['clue-a'] });
      recs708bn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs708bn[6] = makeSharedRecord(6, { seededClueIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runR708(recs708bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_SIGNAL_PEAK_UNCAUSED'), 'SEED_SIGNAL_PEAK_UNCAUSED should not fire');
    });

    // PAYOFF_SIGNAL_DROUGHT_RUN fire:
    // 10 scenes; payoffs at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('PAYOFF_SIGNAL_DROUGHT_RUN fires when the longest no-payoff run is ≥6', async () => {
      const recs708c = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs708c[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs708c[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs708c[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-c'] });
      recs708c[9] = makeSharedRecord(9, { payoffSetupIds: ['thread-d'] });
      const res = await runR708(recs708c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_SIGNAL_DROUGHT_RUN'), 'PAYOFF_SIGNAL_DROUGHT_RUN should fire');
    });

    // PAYOFF_SIGNAL_DROUGHT_RUN no-fire:
    // payoffs at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('PAYOFF_SIGNAL_DROUGHT_RUN does not fire when payoffs are distributed without a long drought', async () => {
      const recs708cn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs708cn[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs708cn[4] = makeSharedRecord(4, { payoffSetupIds: ['thread-b'] });
      recs708cn[9] = makeSharedRecord(9, { payoffSetupIds: ['thread-c'] });
      const res = await runR708(recs708cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_SIGNAL_DROUGHT_RUN'), 'PAYOFF_SIGNAL_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 694 — rhythmPass: relational signal peak uncaused, seed signal zone cluster, dialogue signal drought run', async () => {
    const runR694 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RELATIONAL_SIGNAL_PEAK_UNCAUSED fire:
    // 8 scenes; shifts at 2 (1 shift) and 6 (5 shifts, the peak); no dramaticTurn or revelation at
    // 6, 5, or 4
    it('RELATIONAL_SIGNAL_PEAK_UNCAUSED fires when the peak relationship-shift scene has no dramatic turn or revelation nearby', async () => {
      const recs694a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs694a[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs694a[6] = makeSharedRecord(6, { relationshipShifts: [0, 1, 2, 3, 4].map(n => ({ pairKey: `a|${n}`, dimension: 'trust', amount: 0.2 })) });
      const res = await runR694(recs694a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_SIGNAL_PEAK_UNCAUSED'), 'RELATIONAL_SIGNAL_PEAK_UNCAUSED should fire');
    });

    // RELATIONAL_SIGNAL_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('RELATIONAL_SIGNAL_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs694an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs694an[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs694an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs694an[6] = makeSharedRecord(6, { relationshipShifts: [0, 1, 2, 3, 4].map(n => ({ pairKey: `a|${n}`, dimension: 'trust', amount: 0.2 })) });
      const res = await runR694(recs694an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_SIGNAL_PEAK_UNCAUSED'), 'RELATIONAL_SIGNAL_PEAK_UNCAUSED should not fire');
    });

    // SEED_SIGNAL_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; seed scenes at 0,1,2 → 100% opening third
    it('SEED_SIGNAL_ZONE_CLUSTER fires when >75% of seed scenes cluster in one third', async () => {
      const recs694b = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs694b[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs694b[1] = makeSharedRecord(1, { seededClueIds: ['clue-b'] });
      recs694b[2] = makeSharedRecord(2, { seededClueIds: ['clue-c'] });
      const res = await runR694(recs694b);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_SIGNAL_ZONE_CLUSTER'), 'SEED_SIGNAL_ZONE_CLUSTER should fire');
    });

    // SEED_SIGNAL_ZONE_CLUSTER no-fire:
    // seed scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('SEED_SIGNAL_ZONE_CLUSTER does not fire when seed scenes are distributed across thirds', async () => {
      const recs694bn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs694bn[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs694bn[4] = makeSharedRecord(4, { seededClueIds: ['clue-b'] });
      recs694bn[7] = makeSharedRecord(7, { seededClueIds: ['clue-c'] });
      const res = await runR694(recs694bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_SIGNAL_ZONE_CLUSTER'), 'SEED_SIGNAL_ZONE_CLUSTER should not fire');
    });

    // DIALOGUE_SIGNAL_DROUGHT_RUN fire:
    // 10 scenes; highlights at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('DIALOGUE_SIGNAL_DROUGHT_RUN fires when the longest no-highlighted-dialogue run is ≥6', async () => {
      const recs694c = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs694c[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs694c[1] = makeSharedRecord(1, { dialogueHighlights: ['line-b'] });
      recs694c[2] = makeSharedRecord(2, { dialogueHighlights: ['line-c'] });
      recs694c[9] = makeSharedRecord(9, { dialogueHighlights: ['line-d'] });
      const res = await runR694(recs694c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_SIGNAL_DROUGHT_RUN'), 'DIALOGUE_SIGNAL_DROUGHT_RUN should fire');
    });

    // DIALOGUE_SIGNAL_DROUGHT_RUN no-fire:
    // highlights at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('DIALOGUE_SIGNAL_DROUGHT_RUN does not fire when highlighted dialogue is distributed without a long drought', async () => {
      const recs694cn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs694cn[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs694cn[4] = makeSharedRecord(4, { dialogueHighlights: ['line-b'] });
      recs694cn[9] = makeSharedRecord(9, { dialogueHighlights: ['line-c'] });
      const res = await runR694(recs694cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_SIGNAL_DROUGHT_RUN'), 'DIALOGUE_SIGNAL_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 680 — rhythmPass: payoff signal peak uncaused, open thread signal drought run, relational signal zone cluster', async () => {
    const runR680 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // PAYOFF_SIGNAL_PEAK_UNCAUSED fire:
    // 8 scenes; payoffs at 2 (1 thread) and 6 (5 threads, the peak); no dramaticTurn or revelation
    // at 6, 5, or 4
    it('PAYOFF_SIGNAL_PEAK_UNCAUSED fires when the peak payoff scene has no dramatic turn or revelation nearby', async () => {
      const recs680a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs680a[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-a'] });
      recs680a[6] = makeSharedRecord(6, { payoffSetupIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runR680(recs680a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_SIGNAL_PEAK_UNCAUSED'), 'PAYOFF_SIGNAL_PEAK_UNCAUSED should fire');
    });

    // PAYOFF_SIGNAL_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('PAYOFF_SIGNAL_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs680an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs680an[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-a'] });
      recs680an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs680an[6] = makeSharedRecord(6, { payoffSetupIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runR680(recs680an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_SIGNAL_PEAK_UNCAUSED'), 'PAYOFF_SIGNAL_PEAK_UNCAUSED should not fire');
    });

    // OPEN_THREAD_SIGNAL_DROUGHT_RUN fire:
    // 10 scenes; debt at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('OPEN_THREAD_SIGNAL_DROUGHT_RUN fires when the longest no-debt run is ≥6', async () => {
      const recs680b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs680b[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs680b[1] = makeSharedRecord(1, { unresolvedClues: ['b'] });
      recs680b[2] = makeSharedRecord(2, { unresolvedClues: ['c'] });
      recs680b[9] = makeSharedRecord(9, { unresolvedClues: ['d'] });
      const res = await runR680(recs680b);
      assert.ok(res.issues.some((i: any) => i.rule === 'OPEN_THREAD_SIGNAL_DROUGHT_RUN'), 'OPEN_THREAD_SIGNAL_DROUGHT_RUN should fire');
    });

    // OPEN_THREAD_SIGNAL_DROUGHT_RUN no-fire:
    // debt at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('OPEN_THREAD_SIGNAL_DROUGHT_RUN does not fire when debt is distributed without a long drought', async () => {
      const recs680bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs680bn[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs680bn[4] = makeSharedRecord(4, { unresolvedClues: ['b'] });
      recs680bn[9] = makeSharedRecord(9, { unresolvedClues: ['c'] });
      const res = await runR680(recs680bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'OPEN_THREAD_SIGNAL_DROUGHT_RUN'), 'OPEN_THREAD_SIGNAL_DROUGHT_RUN should not fire');
    });

    // RELATIONAL_SIGNAL_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; relationship-shift scenes at 0,1,2 → 100% opening third
    it('RELATIONAL_SIGNAL_ZONE_CLUSTER fires when >75% of relationship-shift scenes cluster in one third', async () => {
      const recs680c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs680c[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs680c[1] = makeSharedRecord(1, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs680c[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      const res = await runR680(recs680c);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_SIGNAL_ZONE_CLUSTER'), 'RELATIONAL_SIGNAL_ZONE_CLUSTER should fire');
    });

    // RELATIONAL_SIGNAL_ZONE_CLUSTER no-fire:
    // relationship-shift scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('RELATIONAL_SIGNAL_ZONE_CLUSTER does not fire when relationship-shift scenes are distributed across thirds', async () => {
      const recs680cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs680cn[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs680cn[4] = makeSharedRecord(4, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs680cn[7] = makeSharedRecord(7, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      const res = await runR680(recs680cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_SIGNAL_ZONE_CLUSTER'), 'RELATIONAL_SIGNAL_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 666 — rhythmPass: dialogue signal peak uncaused, seed signal drought run, turn signal zone cluster', async () => {
    const runR666 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // DIALOGUE_SIGNAL_PEAK_UNCAUSED fire:
    // 8 scenes; highlights at 2 (1 line) and 6 (5 lines, the peak); no dramaticTurn or revelation
    // at 6, 5, or 4
    it('DIALOGUE_SIGNAL_PEAK_UNCAUSED fires when the peak highlighted-dialogue scene has no dramatic turn or revelation nearby', async () => {
      const recs666a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs666a[2] = makeSharedRecord(2, { dialogueHighlights: ['line-a'] });
      recs666a[6] = makeSharedRecord(6, { dialogueHighlights: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runR666(recs666a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_SIGNAL_PEAK_UNCAUSED'), 'DIALOGUE_SIGNAL_PEAK_UNCAUSED should fire');
    });

    // DIALOGUE_SIGNAL_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('DIALOGUE_SIGNAL_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs666an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs666an[2] = makeSharedRecord(2, { dialogueHighlights: ['line-a'] });
      recs666an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs666an[6] = makeSharedRecord(6, { dialogueHighlights: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runR666(recs666an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_SIGNAL_PEAK_UNCAUSED'), 'DIALOGUE_SIGNAL_PEAK_UNCAUSED should not fire');
    });

    // SEED_SIGNAL_DROUGHT_RUN fire:
    // 10 scenes; seeded at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('SEED_SIGNAL_DROUGHT_RUN fires when the longest no-seed run is ≥6', async () => {
      const recs666b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs666b[0] = makeSharedRecord(0, { seededClueIds: ['clue-x'] });
      recs666b[1] = makeSharedRecord(1, { seededClueIds: ['clue-x'] });
      recs666b[2] = makeSharedRecord(2, { seededClueIds: ['clue-x'] });
      recs666b[9] = makeSharedRecord(9, { seededClueIds: ['clue-x'] });
      const res = await runR666(recs666b);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_SIGNAL_DROUGHT_RUN'), 'SEED_SIGNAL_DROUGHT_RUN should fire');
    });

    // SEED_SIGNAL_DROUGHT_RUN no-fire:
    // seeded at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('SEED_SIGNAL_DROUGHT_RUN does not fire when seeding is distributed without a long drought', async () => {
      const recs666bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs666bn[0] = makeSharedRecord(0, { seededClueIds: ['clue-x'] });
      recs666bn[4] = makeSharedRecord(4, { seededClueIds: ['clue-x'] });
      recs666bn[9] = makeSharedRecord(9, { seededClueIds: ['clue-x'] });
      const res = await runR666(recs666bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_SIGNAL_DROUGHT_RUN'), 'SEED_SIGNAL_DROUGHT_RUN should not fire');
    });

    // TURN_SIGNAL_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; dramatic-turn scenes at 0,1,2 → 100% opening third
    it('TURN_SIGNAL_ZONE_CLUSTER fires when >75% of dramatic-turn scenes cluster in one third', async () => {
      const recs666c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs666c[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs666c[1] = makeSharedRecord(1, { dramaticTurn: 'reversal' });
      recs666c[2] = makeSharedRecord(2, { dramaticTurn: 'reversal' });
      const res = await runR666(recs666c);
      assert.ok(res.issues.some((i: any) => i.rule === 'TURN_SIGNAL_ZONE_CLUSTER'), 'TURN_SIGNAL_ZONE_CLUSTER should fire');
    });

    // TURN_SIGNAL_ZONE_CLUSTER no-fire:
    // dramatic-turn scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('TURN_SIGNAL_ZONE_CLUSTER does not fire when dramatic-turn scenes are distributed across thirds', async () => {
      const recs666cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs666cn[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs666cn[4] = makeSharedRecord(4, { dramaticTurn: 'reversal' });
      recs666cn[7] = makeSharedRecord(7, { dramaticTurn: 'reversal' });
      const res = await runR666(recs666cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TURN_SIGNAL_ZONE_CLUSTER'), 'TURN_SIGNAL_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 652 — rhythmPass: emotional signal zone cluster, staging signal drought run, open thread curiosity signal decoupled', async () => {
    const runR652 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // EMOTIONAL_SIGNAL_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; positive-emotion scenes at 0,1,2 → 100% in opening third
    it('EMOTIONAL_SIGNAL_ZONE_CLUSTER fires when >75% of positive-emotion scenes cluster in one third', async () => {
      const recs652a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs652a[0] = makeSharedRecord(0, { emotionalShift: 'positive' });
      recs652a[1] = makeSharedRecord(1, { emotionalShift: 'positive' });
      recs652a[2] = makeSharedRecord(2, { emotionalShift: 'positive' });
      const res = await runR652(recs652a);
      assert.ok(res.issues.some((i: any) => i.rule === 'EMOTIONAL_SIGNAL_ZONE_CLUSTER'), 'EMOTIONAL_SIGNAL_ZONE_CLUSTER should fire');
    });

    // EMOTIONAL_SIGNAL_ZONE_CLUSTER no-fire:
    // positive-emotion scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('EMOTIONAL_SIGNAL_ZONE_CLUSTER does not fire when positive-emotion scenes are distributed across thirds', async () => {
      const recs652an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs652an[0] = makeSharedRecord(0, { emotionalShift: 'positive' });
      recs652an[4] = makeSharedRecord(4, { emotionalShift: 'positive' });
      recs652an[7] = makeSharedRecord(7, { emotionalShift: 'positive' });
      const res = await runR652(recs652an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'EMOTIONAL_SIGNAL_ZONE_CLUSTER'), 'EMOTIONAL_SIGNAL_ZONE_CLUSTER should not fire');
    });

    // STAGING_SIGNAL_DROUGHT_RUN fire:
    // 10 scenes; staged at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('STAGING_SIGNAL_DROUGHT_RUN fires when the longest no-staging run is ≥6', async () => {
      const recs652b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs652b[0] = makeSharedRecord(0, { visualBeats: ['a'] });
      recs652b[1] = makeSharedRecord(1, { visualBeats: ['b'] });
      recs652b[2] = makeSharedRecord(2, { visualBeats: ['c'] });
      recs652b[9] = makeSharedRecord(9, { visualBeats: ['d'] });
      const res = await runR652(recs652b);
      assert.ok(res.issues.some((i: any) => i.rule === 'STAGING_SIGNAL_DROUGHT_RUN'), 'STAGING_SIGNAL_DROUGHT_RUN should fire');
    });

    // STAGING_SIGNAL_DROUGHT_RUN no-fire:
    // staged at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('STAGING_SIGNAL_DROUGHT_RUN does not fire when staging is distributed without a long drought', async () => {
      const recs652bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs652bn[0] = makeSharedRecord(0, { visualBeats: ['a'] });
      recs652bn[4] = makeSharedRecord(4, { visualBeats: ['b'] });
      recs652bn[9] = makeSharedRecord(9, { visualBeats: ['c'] });
      const res = await runR652(recs652bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STAGING_SIGNAL_DROUGHT_RUN'), 'STAGING_SIGNAL_DROUGHT_RUN should not fire');
    });

    // OPEN_THREAD_CURIOSITY_SIGNAL_DECOUPLED fire:
    // n=6; open threads at 0,1 (no curiosity rise); curiosity rises at 4,5 (no open thread) →
    // zero overlap → fires
    it('OPEN_THREAD_CURIOSITY_SIGNAL_DECOUPLED fires when open-thread scenes and rising-curiosity scenes never overlap', async () => {
      const recs652c = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs652c[0] = makeSharedRecord(0, { unresolvedClues: ['unpaid-clue'] });
      recs652c[1] = makeSharedRecord(1, { unresolvedClues: ['unpaid-clue'] });
      recs652c[4] = makeSharedRecord(4, { curiosityDelta: 1 });
      recs652c[5] = makeSharedRecord(5, { curiosityDelta: 1 });
      const res = await runR652(recs652c);
      assert.ok(res.issues.some((i: any) => i.rule === 'OPEN_THREAD_CURIOSITY_SIGNAL_DECOUPLED'), 'OPEN_THREAD_CURIOSITY_SIGNAL_DECOUPLED should fire');
    });

    // OPEN_THREAD_CURIOSITY_SIGNAL_DECOUPLED no-fire:
    // scene 0 carries BOTH an open thread and a curiosity rise → overlap exists
    it('OPEN_THREAD_CURIOSITY_SIGNAL_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs652cn = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs652cn[0] = makeSharedRecord(0, { unresolvedClues: ['unpaid-clue'], curiosityDelta: 1 });
      recs652cn[1] = makeSharedRecord(1, { unresolvedClues: ['unpaid-clue'] });
      recs652cn[5] = makeSharedRecord(5, { curiosityDelta: 1 });
      const res = await runR652(recs652cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'OPEN_THREAD_CURIOSITY_SIGNAL_DECOUPLED'), 'OPEN_THREAD_CURIOSITY_SIGNAL_DECOUPLED should not fire');
    });
  });

  describe('Wave 638 — rhythmPass: payoff signal zone cluster, open thread signal decoupled, dramatic turn payoff aftermath void', async () => {
    const runR638 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // PAYOFF_SIGNAL_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; payoffs at 0,1,2 → 100% in opening third
    it('PAYOFF_SIGNAL_ZONE_CLUSTER fires when >75% of payoff scenes cluster in one third', async () => {
      const recs638a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs638a[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs638a[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs638a[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-c'] });
      const res = await runR638(recs638a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_SIGNAL_ZONE_CLUSTER'), 'PAYOFF_SIGNAL_ZONE_CLUSTER should fire');
    });

    // PAYOFF_SIGNAL_ZONE_CLUSTER no-fire:
    // payoffs at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('PAYOFF_SIGNAL_ZONE_CLUSTER does not fire when payoff scenes are distributed across thirds', async () => {
      const recs638an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs638an[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs638an[4] = makeSharedRecord(4, { payoffSetupIds: ['thread-b'] });
      recs638an[7] = makeSharedRecord(7, { payoffSetupIds: ['thread-c'] });
      const res = await runR638(recs638an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_SIGNAL_ZONE_CLUSTER'), 'PAYOFF_SIGNAL_ZONE_CLUSTER should not fire');
    });

    // OPEN_THREAD_SIGNAL_DECOUPLED fire:
    // n=6; debt at 0,1 (no highlight); highlights at 4,5 (no debt) → zero overlap → fires
    it('OPEN_THREAD_SIGNAL_DECOUPLED fires when open-thread scenes and dialogue highlights never overlap', async () => {
      const recs638b = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs638b[0] = makeSharedRecord(0, { unresolvedClues: ['unpaid-clue'] });
      recs638b[1] = makeSharedRecord(1, { unresolvedClues: ['unpaid-clue'] });
      recs638b[4] = makeSharedRecord(4, { dialogueHighlights: ['line-a'] });
      recs638b[5] = makeSharedRecord(5, { dialogueHighlights: ['line-b'] });
      const res = await runR638(recs638b);
      assert.ok(res.issues.some((i: any) => i.rule === 'OPEN_THREAD_SIGNAL_DECOUPLED'), 'OPEN_THREAD_SIGNAL_DECOUPLED should fire');
    });

    // OPEN_THREAD_SIGNAL_DECOUPLED no-fire:
    // scene 0 carries BOTH open debt and a highlight → overlap exists
    it('OPEN_THREAD_SIGNAL_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs638bn = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs638bn[0] = makeSharedRecord(0, { unresolvedClues: ['unpaid-clue'], dialogueHighlights: ['line-a'] });
      recs638bn[1] = makeSharedRecord(1, { unresolvedClues: ['unpaid-clue'] });
      recs638bn[5] = makeSharedRecord(5, { dialogueHighlights: ['line-b'] });
      const res = await runR638(recs638bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'OPEN_THREAD_SIGNAL_DECOUPLED'), 'OPEN_THREAD_SIGNAL_DECOUPLED should not fire');
    });

    // DRAMATIC_TURN_PAYOFF_AFTERMATH_VOID fire:
    // n=8, window=2; turn triggers at 0,1; their windows {1,2} and {2,3} carry no payoff;
    // payoffs exist elsewhere at 5,6,7 → fires
    it('DRAMATIC_TURN_PAYOFF_AFTERMATH_VOID fires when no dramatic turn is followed by a payoff within 2 scenes', async () => {
      const recs638c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs638c[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs638c[1] = makeSharedRecord(1, { dramaticTurn: 'revelation' });
      recs638c[5] = makeSharedRecord(5, { payoffSetupIds: ['thread-a'] });
      recs638c[6] = makeSharedRecord(6, { payoffSetupIds: ['thread-b'] });
      recs638c[7] = makeSharedRecord(7, { payoffSetupIds: ['thread-c'] });
      const res = await runR638(recs638c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_PAYOFF_AFTERMATH_VOID'), 'DRAMATIC_TURN_PAYOFF_AFTERMATH_VOID should fire');
    });

    // DRAMATIC_TURN_PAYOFF_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries a payoff → that trigger's aftermath
    // is no longer void
    it('DRAMATIC_TURN_PAYOFF_AFTERMATH_VOID does not fire when a trigger window contains a payoff', async () => {
      const recs638cn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs638cn[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs638cn[1] = makeSharedRecord(1, { dramaticTurn: 'revelation' });
      recs638cn[3] = makeSharedRecord(3, { payoffSetupIds: ['thread-a'] });
      recs638cn[5] = makeSharedRecord(5, { payoffSetupIds: ['thread-b'] });
      recs638cn[6] = makeSharedRecord(6, { payoffSetupIds: ['thread-c'] });
      recs638cn[7] = makeSharedRecord(7, { payoffSetupIds: ['thread-d'] });
      const res = await runR638(recs638cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_PAYOFF_AFTERMATH_VOID'), 'DRAMATIC_TURN_PAYOFF_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 624 — rhythmPass: verbal staging signal decoupled, seed signal zone imbalance, clock signal drought run', async () => {
    const runR624 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // VERBAL_STAGING_SIGNAL_DECOUPLED fire:
    // n=6; highlights at 0,1 (no staging); staged at 4,5 (no highlight) → zero overlap → fires
    it('VERBAL_STAGING_SIGNAL_DECOUPLED fires when dialogue highlights and visually-staged scenes never overlap', async () => {
      const recs624a = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs624a[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs624a[1] = makeSharedRecord(1, { dialogueHighlights: ['line-b'] });
      recs624a[4] = makeSharedRecord(4, { visualBeats: ['slams the door', 'kicks the chair'] });
      recs624a[5] = makeSharedRecord(5, { visualBeats: ['slams the door', 'kicks the chair'] });
      const res = await runR624(recs624a);
      assert.ok(res.issues.some((i: any) => i.rule === 'VERBAL_STAGING_SIGNAL_DECOUPLED'), 'VERBAL_STAGING_SIGNAL_DECOUPLED should fire');
    });

    // VERBAL_STAGING_SIGNAL_DECOUPLED no-fire:
    // scene 0 carries BOTH a highlight and visual staging → overlap exists
    it('VERBAL_STAGING_SIGNAL_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs624an = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs624an[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'], visualBeats: ['slams the door', 'kicks the chair'] });
      recs624an[1] = makeSharedRecord(1, { dialogueHighlights: ['line-b'] });
      recs624an[5] = makeSharedRecord(5, { visualBeats: ['slams the door', 'kicks the chair'] });
      const res = await runR624(recs624an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VERBAL_STAGING_SIGNAL_DECOUPLED'), 'VERBAL_STAGING_SIGNAL_DECOUPLED should not fire');
    });

    // SEED_SIGNAL_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); seeds at 6,7,8,9; zone 2 (6-8)=3, zone 3 (9)=1, total=4;
    // zones 0,1 empty; bloatZoneIdx=zone2, 3/4=75% ≥ 50% → fires
    it('SEED_SIGNAL_ZONE_IMBALANCE fires when one zone is empty of seed scenes while another is bloated', async () => {
      const recs624b = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs624b[6] = makeSharedRecord(6, { seededClueIds: ['a'] });
      recs624b[7] = makeSharedRecord(7, { seededClueIds: ['b'] });
      recs624b[8] = makeSharedRecord(8, { seededClueIds: ['c'] });
      recs624b[9] = makeSharedRecord(9, { seededClueIds: ['d'] });
      const res = await runR624(recs624b);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_SIGNAL_ZONE_IMBALANCE'), 'SEED_SIGNAL_ZONE_IMBALANCE should fire');
    });

    // SEED_SIGNAL_ZONE_IMBALANCE no-fire:
    // one seed per zone (1,4,7,10) → no zone is empty
    it('SEED_SIGNAL_ZONE_IMBALANCE does not fire when seeds are spread across all zones', async () => {
      const recs624bn = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs624bn[1] = makeSharedRecord(1, { seededClueIds: ['a'] });
      recs624bn[4] = makeSharedRecord(4, { seededClueIds: ['b'] });
      recs624bn[7] = makeSharedRecord(7, { seededClueIds: ['c'] });
      recs624bn[10] = makeSharedRecord(10, { seededClueIds: ['d'] });
      const res = await runR624(recs624bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_SIGNAL_ZONE_IMBALANCE'), 'SEED_SIGNAL_ZONE_IMBALANCE should not fire');
    });

    // CLOCK_SIGNAL_DROUGHT_RUN fire:
    // 10 scenes; clockRaised at 0,8,9; drought run 1-7 = 7 consecutive scenes ≥ 6
    it('CLOCK_SIGNAL_DROUGHT_RUN fires when the longest no-clock run is ≥6', async () => {
      const recs624c = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs624c[0] = makeSharedRecord(0, { clockRaised: true });
      recs624c[8] = makeSharedRecord(8, { clockRaised: true });
      recs624c[9] = makeSharedRecord(9, { clockRaised: true });
      const res = await runR624(recs624c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_SIGNAL_DROUGHT_RUN'), 'CLOCK_SIGNAL_DROUGHT_RUN should fire');
    });

    // CLOCK_SIGNAL_DROUGHT_RUN no-fire:
    // clockRaised at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('CLOCK_SIGNAL_DROUGHT_RUN does not fire when clock raises are distributed without a long drought', async () => {
      const recs624cn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs624cn[0] = makeSharedRecord(0, { clockRaised: true });
      recs624cn[4] = makeSharedRecord(4, { clockRaised: true });
      recs624cn[9] = makeSharedRecord(9, { clockRaised: true });
      const res = await runR624(recs624cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_SIGNAL_DROUGHT_RUN'), 'CLOCK_SIGNAL_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 610 — rhythmPass: relational signal drought run, clock signal peak uncaused, revelation signal aftermath flat', async () => {
    const runR610 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // RELATIONAL_SIGNAL_DROUGHT_RUN fire:
    // 10 scenes; shifts at 0,8,9; drought run 1-7 = 7 consecutive scenes ≥ 6
    it('RELATIONAL_SIGNAL_DROUGHT_RUN fires when the longest no-shift run is ≥6', async () => {
      const recs610a = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs610a[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.5 }] });
      recs610a[8] = makeSharedRecord(8, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: -0.4 }] });
      recs610a[9] = makeSharedRecord(9, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.3 }] });
      const res = await runR610(recs610a);
      assert.ok(res.issues.some((i: any) => i.rule === 'RELATIONAL_SIGNAL_DROUGHT_RUN'), 'RELATIONAL_SIGNAL_DROUGHT_RUN should fire');
    });

    // RELATIONAL_SIGNAL_DROUGHT_RUN no-fire:
    // shifts at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('RELATIONAL_SIGNAL_DROUGHT_RUN does not fire when shifts are distributed without a long drought', async () => {
      const recs610an = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs610an[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.5 }] });
      recs610an[4] = makeSharedRecord(4, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: -0.4 }] });
      recs610an[9] = makeSharedRecord(9, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.3 }] });
      const res = await runR610(recs610an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'RELATIONAL_SIGNAL_DROUGHT_RUN'), 'RELATIONAL_SIGNAL_DROUGHT_RUN should not fire');
    });

    // CLOCK_SIGNAL_PEAK_UNCAUSED fire:
    // 8 scenes; clockDelta>0 at 2 (val=1) and 6 (val=5, the peak); no dramaticTurn at 6, 5, or 4
    it('CLOCK_SIGNAL_PEAK_UNCAUSED fires when the peak clockDelta scene has no dramatic turn nearby', async () => {
      const recs610b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs610b[2] = makeSharedRecord(2, { clockDelta: 1 });
      recs610b[6] = makeSharedRecord(6, { clockDelta: 5 });
      const res = await runR610(recs610b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_SIGNAL_PEAK_UNCAUSED'), 'CLOCK_SIGNAL_PEAK_UNCAUSED should fire');
    });

    // CLOCK_SIGNAL_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('CLOCK_SIGNAL_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs610bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs610bn[2] = makeSharedRecord(2, { clockDelta: 1 });
      recs610bn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs610bn[6] = makeSharedRecord(6, { clockDelta: 5 });
      const res = await runR610(recs610bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_SIGNAL_PEAK_UNCAUSED'), 'CLOCK_SIGNAL_PEAK_UNCAUSED should not fire');
    });

    // REVELATION_SIGNAL_AFTERMATH_FLAT fire:
    // 8 scenes; revelations at 0,1 (windows reach at most scene 3); emotional shifts at 5,6,7
    it('REVELATION_SIGNAL_AFTERMATH_FLAT fires when no revelation is followed by an emotional shift within 2 scenes', async () => {
      const recs610c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs610c[0] = makeSharedRecord(0, { revelation: 'The truth comes out' });
      recs610c[1] = makeSharedRecord(1, { revelation: 'Another truth' });
      recs610c[5] = makeSharedRecord(5, { emotionalShift: 'negative' });
      recs610c[6] = makeSharedRecord(6, { emotionalShift: 'positive' });
      recs610c[7] = makeSharedRecord(7, { emotionalShift: 'negative' });
      const res = await runR610(recs610c);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_SIGNAL_AFTERMATH_FLAT'), 'REVELATION_SIGNAL_AFTERMATH_FLAT should fire');
    });

    // REVELATION_SIGNAL_AFTERMATH_FLAT no-fire:
    // scene 2 (inside trigger 0's window {1,2}) now carries an emotional shift
    it('REVELATION_SIGNAL_AFTERMATH_FLAT does not fire when a trigger window contains an emotional shift', async () => {
      const recs610cn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs610cn[0] = makeSharedRecord(0, { revelation: 'The truth comes out' });
      recs610cn[1] = makeSharedRecord(1, { revelation: 'Another truth' });
      recs610cn[2] = makeSharedRecord(2, { emotionalShift: 'positive' });
      recs610cn[5] = makeSharedRecord(5, { emotionalShift: 'negative' });
      recs610cn[6] = makeSharedRecord(6, { emotionalShift: 'positive' });
      recs610cn[7] = makeSharedRecord(7, { emotionalShift: 'negative' });
      const res = await runR610(recs610cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_SIGNAL_AFTERMATH_FLAT'), 'REVELATION_SIGNAL_AFTERMATH_FLAT should not fire');
    });
  });

  describe('Wave 596 — rhythmPass: suspense signal flatline, curiosity signal flatline, stakes zone imbalance', async () => {
    const runR596 = async (records: ScreenplaySceneRecord[]) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    it('SUSPENSE_SIGNAL_FLATLINE fires when suspenseDelta barely varies across scenes', async () => {
      // 8 scenes, every suspenseDelta identical (1.0) — zero deviation from the average
      const recs596a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i, { suspenseDelta: 1.0 }));
      const res = await runR596(recs596a);
      assert.ok(res.issues.some((i: any) => i.rule === 'SUSPENSE_SIGNAL_FLATLINE'), 'SUSPENSE_SIGNAL_FLATLINE should fire');
    });

    it('SUSPENSE_SIGNAL_FLATLINE does not fire when suspenseDelta varies widely across scenes', async () => {
      const recs596a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i, { suspenseDelta: i % 2 === 0 ? 0.2 : 2.5 }));
      const res = await runR596(recs596a);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SUSPENSE_SIGNAL_FLATLINE'), 'SUSPENSE_SIGNAL_FLATLINE should not fire');
    });

    it('CURIOSITY_SIGNAL_FLATLINE fires when curiosityDelta barely varies across scenes', async () => {
      const recs596b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i, { curiosityDelta: 1.0 }));
      const res = await runR596(recs596b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CURIOSITY_SIGNAL_FLATLINE'), 'CURIOSITY_SIGNAL_FLATLINE should fire');
    });

    it('CURIOSITY_SIGNAL_FLATLINE does not fire when curiosityDelta varies widely across scenes', async () => {
      const recs596b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i, { curiosityDelta: i % 2 === 0 ? 0.2 : 2.5 }));
      const res = await runR596(recs596b);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CURIOSITY_SIGNAL_FLATLINE'), 'CURIOSITY_SIGNAL_FLATLINE should not fire');
    });

    it('STAKES_ZONE_IMBALANCE fires when one zone has zero stakes-raises and another has ≥50%', async () => {
      // 12 scenes, 4 zones of 3: stakes-raises at 6,7,8 (zone 2) plus one at 9 (zone 3) to meet minCount=4
      const recs596c = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs596c[6] = makeSharedRecord(6, { purpose: 'raise_stakes' });
      recs596c[7] = makeSharedRecord(7, { purpose: 'raise_stakes' });
      recs596c[8] = makeSharedRecord(8, { purpose: 'raise_stakes' });
      recs596c[9] = makeSharedRecord(9, { purpose: 'raise_stakes' });
      const res = await runR596(recs596c);
      assert.ok(res.issues.some((i: any) => i.rule === 'STAKES_ZONE_IMBALANCE'), 'STAKES_ZONE_IMBALANCE should fire');
    });

    it('STAKES_ZONE_IMBALANCE does not fire when stakes-raises are spread across all zones', async () => {
      const recs596c = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs596c[1] = makeSharedRecord(1, { purpose: 'raise_stakes' });
      recs596c[4] = makeSharedRecord(4, { purpose: 'raise_stakes' });
      recs596c[7] = makeSharedRecord(7, { purpose: 'raise_stakes' });
      recs596c[10] = makeSharedRecord(10, { purpose: 'raise_stakes' });
      const res = await runR596(recs596c);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STAKES_ZONE_IMBALANCE'), 'STAKES_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 582 — rhythmPass: long single sentence, shortest outlier, medium opening absent', async () => {
    const runR582 = async (fountain: string) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };
    // Helper: create fountain with action lines of given word counts (single sentence each)
    const makeF582 = (wcs: number[]) =>
      wcs.map((n, i) => `INT. SC${i} - DAY\n\n${Array(n).fill('word').join(' ')}.`).join('\n\n');
    // Helper: action line with n words split across s sentences
    const makeMSLine582 = (n: number, s: number): string => {
      const perSent = Math.floor(n / s);
      const parts: string[] = [];
      for (let j = 0; j < s; j++) {
        const count = j === s - 1 ? n - perSent * j : perSent;
        parts.push(Array(count).fill('word').join(' '));
      }
      return parts.join('. ') + '.';
    };

    // ACTION_LONG_SINGLE_SENTENCE fire:
    // 8 action lines: 5 long (12w, 1 sentence each) + 3 short (5w)
    // 5/5 long lines are single-sentence → 100% > 70% → fires
    it('ACTION_LONG_SINGLE_SENTENCE fires when >70% of long lines are single-sentence', async () => {
      const f582a = makeF582([12, 12, 12, 5, 12, 12, 5, 5]);
      const res = await runR582(f582a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_LONG_SINGLE_SENTENCE'), 'ACTION_LONG_SINGLE_SENTENCE should fire');
    });

    // ACTION_LONG_SINGLE_SENTENCE no-fire:
    // 8 action lines: 5 long (12w); 4 of the 5 long lines have 2 sentences → 1/5 = 20% ≤ 70%
    it('ACTION_LONG_SINGLE_SENTENCE does not fire when most long lines have multiple sentences', async () => {
      const msScene582 = `INT. SC_MS - DAY\n\n${makeMSLine582(12, 2)}`;
      const f582anr = [
        msScene582, msScene582, msScene582, msScene582,
        `INT. SC4 - DAY\n\n${Array(12).fill('word').join(' ')}.`,
        `INT. SC5 - DAY\n\n${Array(5).fill('word').join(' ')}.`,
        `INT. SC6 - DAY\n\n${Array(5).fill('word').join(' ')}.`,
        `INT. SC7 - DAY\n\n${Array(5).fill('word').join(' ')}.`,
      ].join('\n\n');
      const res = await runR582(f582anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_LONG_SINGLE_SENTENCE'), 'ACTION_LONG_SINGLE_SENTENCE should not fire');
    });

    // ACTION_SHORTEST_OUTLIER fire:
    // 8 lines: 7 at 10 words, 1 at 2 words; avg = (70+2)/8 = 9; 2 ≤ 9*0.25=2.25 → fires
    it('ACTION_SHORTEST_OUTLIER fires when shortest action line is ≤2 words and ≤25% of average', async () => {
      const f582b = makeF582([10, 10, 10, 10, 10, 10, 10, 2]);
      const res = await runR582(f582b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_SHORTEST_OUTLIER'), 'ACTION_SHORTEST_OUTLIER should fire');
    });

    // ACTION_SHORTEST_OUTLIER no-fire:
    // 8 lines: 7 at 10 words, 1 at 4 words; avg=9w; 4 > 9*0.25=2.25 → no fire
    it('ACTION_SHORTEST_OUTLIER does not fire when shortest line exceeds the 25% threshold', async () => {
      const f582bnr = makeF582([10, 10, 10, 10, 10, 10, 10, 4]);
      const res = await runR582(f582bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_SHORTEST_OUTLIER'), 'ACTION_SHORTEST_OUTLIER should not fire');
    });

    // ACTION_MEDIUM_OPENING_ABSENT fire:
    // 12 action lines; opening = first floor(12/4)=3 lines: wcs 3,15,3 → none 5-11
    // rest (9 lines): 7,7,7,7,10,5,8,13,6 → 7,7,7,7,10,5,8,6 = 8 medium ≥4 → fires
    it('ACTION_MEDIUM_OPENING_ABSENT fires when opening 25% has no medium-length lines', async () => {
      const f582c = makeF582([3, 15, 3, 7, 7, 7, 7, 10, 5, 8, 13, 6]);
      const res = await runR582(f582c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_MEDIUM_OPENING_ABSENT'), 'ACTION_MEDIUM_OPENING_ABSENT should fire');
    });

    // ACTION_MEDIUM_OPENING_ABSENT no-fire:
    // 12 action lines; opening = first 3: wcs 3,7,3 → wc=7 is medium → has medium → no fire
    it('ACTION_MEDIUM_OPENING_ABSENT does not fire when opening contains a medium-length line', async () => {
      const f582cnr = makeF582([3, 7, 3, 7, 7, 7, 7, 10, 5, 8, 13, 6]);
      const res = await runR582(f582cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_MEDIUM_OPENING_ABSENT'), 'ACTION_MEDIUM_OPENING_ABSENT should not fire');
    });
  });


  describe('Wave 568 — rhythmPass: long thirds cluster, short thirds cluster, alternation run', async () => {
    const runR568 = async (fountain: string) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };
    // One action line per scene with the given word count (simple words, no commas)
    const makeF568Wc = (wcs: number[]) =>
      wcs.map((n, i) => `INT. SC${i} - DAY\n\n${Array(n).fill('word').join(' ')}.`).join('\n\n');

    // ACTION_LONG_THIRDS_CLUSTER fire:
    // 12 lines; third=4; long (≥12w) at positions 4,5,6,7 (all middle third) → 4/4=100% > 75% → fires
    it('ACTION_LONG_THIRDS_CLUSTER fires when >75% of long lines fall in a single structural third', async () => {
      const f568a = makeF568Wc([7, 7, 7, 7, 12, 12, 12, 12, 7, 7, 7, 7]);
      const res = await runR568(f568a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_LONG_THIRDS_CLUSTER'), 'ACTION_LONG_THIRDS_CLUSTER should fire');
    });

    // ACTION_LONG_THIRDS_CLUSTER no-fire:
    // 12 lines; long at 0,4,8,11 → first 1 / mid 1 / last 2 → max 2/4=50% ≤ 75% → no fire
    it('ACTION_LONG_THIRDS_CLUSTER does not fire when long lines are spread across thirds', async () => {
      const f568anr = makeF568Wc([12, 7, 7, 7, 12, 7, 7, 7, 12, 7, 7, 12]);
      const res = await runR568(f568anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_LONG_THIRDS_CLUSTER'), 'ACTION_LONG_THIRDS_CLUSTER should not fire');
    });

    // ACTION_SHORT_THIRDS_CLUSTER fire:
    // 12 lines; third=4; short (≤4w) at positions 0,1,2,3 (all opening third) → 4/4=100% > 75% → fires
    it('ACTION_SHORT_THIRDS_CLUSTER fires when >75% of short lines fall in a single structural third', async () => {
      const f568b = makeF568Wc([3, 3, 3, 3, 7, 7, 7, 7, 7, 7, 7, 7]);
      const res = await runR568(f568b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_SHORT_THIRDS_CLUSTER'), 'ACTION_SHORT_THIRDS_CLUSTER should fire');
    });

    // ACTION_SHORT_THIRDS_CLUSTER no-fire:
    // 12 lines; short at 0,4,8,11 → first 1 / mid 1 / last 2 → max 2/4=50% ≤ 75% → no fire
    it('ACTION_SHORT_THIRDS_CLUSTER does not fire when short lines are spread across thirds', async () => {
      const f568bnr = makeF568Wc([3, 7, 7, 7, 3, 7, 7, 7, 3, 7, 7, 3]);
      const res = await runR568(f568bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_SHORT_THIRDS_CLUSTER'), 'ACTION_SHORT_THIRDS_CLUSTER should not fire');
    });

    // ACTION_ALTERNATION_RUN fire:
    // 12 lines; positions 0-5 strictly alternate short(3)/long(12) → run of 6 ≥ 6 → fires
    it('ACTION_ALTERNATION_RUN fires when 6+ consecutive lines strictly alternate short/long', async () => {
      const f568c = makeF568Wc([3, 12, 3, 12, 3, 12, 7, 7, 7, 7, 7, 7]);
      const res = await runR568(f568c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_ALTERNATION_RUN'), 'ACTION_ALTERNATION_RUN should fire');
    });

    // ACTION_ALTERNATION_RUN no-fire:
    // 12 lines; a medium (7w) at position 3 breaks the alternation → longest alternation run is 3 < 6 → no fire
    it('ACTION_ALTERNATION_RUN does not fire when a medium line breaks the alternation', async () => {
      const f568cnr = makeF568Wc([3, 12, 3, 7, 12, 3, 12, 7, 7, 7, 7, 7]);
      const res = await runR568(f568cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_ALTERNATION_RUN'), 'ACTION_ALTERNATION_RUN should not fire');
    });
  });


  describe('Wave 554 — rhythmPass: long beat uncaused, sentence burst run, punctuation desert', async () => {
    const runR554 = async (fountain: string) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };
    // Builds fountain with one action line per scene of given word counts (all simple words, no commas)
    const makeF554Wc = (wcs: number[]) =>
      wcs.map((n, i) => `INT. SC${i} - DAY\n\n${Array(n).fill('word').join(' ')}.`).join('\n\n');
    // Builds fountain where each scene has one action line with ns sentences each "She acts."
    const makeF554Sent = (sentCounts: number[]) =>
      sentCounts.map((ns, i) => `INT. SC${i} - DAY\n\n${Array(ns).fill('She acts.').join(' ')}`).join('\n\n');

    it('ACTION_LONG_BEAT_UNCAUSED fires when all long ≥12w lines have no short ≤4w predecessor within 2', async () => {
      // 10 lines: [8,9,12,7,8,12,9,7,12,8] — long at pos 2,5,8; prior-2 of each: [8,9],[7,8],[9,7] — no short ≤4w → fire
      const f554a = makeF554Wc([8, 9, 12, 7, 8, 12, 9, 7, 12, 8]);
      const res = await runR554(f554a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_LONG_BEAT_UNCAUSED'), 'ACTION_LONG_BEAT_UNCAUSED should fire');
    });

    it('ACTION_LONG_BEAT_UNCAUSED does not fire when at least one long line is preceded by a short', async () => {
      // 10 lines: [8,4,12,7,8,12,9,7,12,8] — long at pos 2; prior of pos 2: [8,4] — 4w ≤ 4w → caused → no fire
      const f554an = makeF554Wc([8, 4, 12, 7, 8, 12, 9, 7, 12, 8]);
      const res = await runR554(f554an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_LONG_BEAT_UNCAUSED'), 'ACTION_LONG_BEAT_UNCAUSED should not fire');
    });

    it('ACTION_SENTENCE_BURST_RUN fires when 4+ consecutive action lines each have ≥2 sentences', async () => {
      // 8 lines: [1,1,2,2,2,2,1,1] sentences — run of 4 consecutive ≥2-sentence lines at pos 2-5 → fire
      const f554b = makeF554Sent([1, 1, 2, 2, 2, 2, 1, 1]);
      const res = await runR554(f554b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_SENTENCE_BURST_RUN'), 'ACTION_SENTENCE_BURST_RUN should fire');
    });

    it('ACTION_SENTENCE_BURST_RUN does not fire when max consecutive ≥2-sentence run is only 3', async () => {
      // 8 lines: [1,1,2,2,2,1,1,1] sentences — run of 3 consecutive ≥2-sentence lines → no fire
      const f554bn = makeF554Sent([1, 1, 2, 2, 2, 1, 1, 1]);
      const res = await runR554(f554bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_SENTENCE_BURST_RUN'), 'ACTION_SENTENCE_BURST_RUN should not fire');
    });

    it('ACTION_PUNCTUATION_DESERT fires when <15% of ≥10 action lines contain a comma', async () => {
      // 10 action lines: only line at index 0 has a comma (1/10 = 10% < 15%) → fire
      const lines554c = Array.from({ length: 10 }, (_, i) => {
        const action = i === 0 ? 'She stops, listens.' : 'word word word word word word.';
        return `INT. SC${i} - DAY\n\n${action}`;
      }).join('\n\n');
      const res = await runR554(lines554c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_PUNCTUATION_DESERT'), 'ACTION_PUNCTUATION_DESERT should fire');
    });

    it('ACTION_PUNCTUATION_DESERT does not fire when ≥15% of action lines contain a comma', async () => {
      // 10 action lines: lines 0 and 1 have commas (2/10 = 20% ≥ 15%) → no fire
      const lines554cn = Array.from({ length: 10 }, (_, i) => {
        const action = i < 2 ? 'She stops, listens.' : 'word word word word word word.';
        return `INT. SC${i} - DAY\n\n${action}`;
      }).join('\n\n');
      const res = await runR554(lines554cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_PUNCTUATION_DESERT'), 'ACTION_PUNCTUATION_DESERT should not fire');
    });
  });


  describe('Wave 540 — rhythmPass: consecutive medium run, short expansion absent, word-count modal lock', async () => {
    const runR540 = async (fountain: string) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };
    const makeF540 = (wcs: number[]) => {
      const lines = wcs.map((n, i) => `INT. SC${i} - DAY\n\n${Array(n).fill('word').join(' ')}.`);
      return lines.join('\n\n');
    };

    it('ACTION_CONSECUTIVE_MEDIUM_RUN fires when 6+ consecutive lines are all 5–11 words', async () => {
      // 10 lines: 3(short), 7,7,7,7,7,7(6 medium), 14(long), 4, 8
      // hasShortsGlobal=true(3,4), hasLongsGlobal=true(14), medRun=6 ≥ 6 → fires
      const f540a = makeF540([3, 7, 7, 7, 7, 7, 7, 14, 4, 8]);
      const res = await runR540(f540a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_CONSECUTIVE_MEDIUM_RUN'), 'ACTION_CONSECUTIVE_MEDIUM_RUN should fire');
    });

    it('ACTION_CONSECUTIVE_MEDIUM_RUN does not fire when the medium run is shorter than 6', async () => {
      // 10 lines: 3, 7,7,7,7(run of 4), 14, 5,6,7,3 — max medium run = 4 < 6
      const f540anr = makeF540([3, 7, 7, 7, 7, 14, 5, 6, 7, 3]);
      const res = await runR540(f540anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_CONSECUTIVE_MEDIUM_RUN'), 'ACTION_CONSECUTIVE_MEDIUM_RUN should not fire');
    });

    it('ACTION_SHORT_EXPANSION_ABSENT fires when no short line is followed by a long line within 2', async () => {
      // 10 lines: 3,5,7,3,6,8,9,5,7,9 — short at 0,3; long(≥9) at 6,9
      // short at 0: aftermath 1(5w),2(7w) — no long; short at 3: aftermath 4(6w),5(8w) — no long → fires
      const f540b = makeF540([3, 5, 7, 3, 6, 8, 9, 5, 7, 9]);
      const res = await runR540(f540b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_SHORT_EXPANSION_ABSENT'), 'ACTION_SHORT_EXPANSION_ABSENT should fire');
    });

    it('ACTION_SHORT_EXPANSION_ABSENT does not fire when a short line is followed by a long line', async () => {
      // 10 lines: 3,9,7,3,6,8,9,5,7,9 — short at 0; aftermath at 1 = 9w (≥9) → expansion found
      const f540bnr = makeF540([3, 9, 7, 3, 6, 8, 9, 5, 7, 9]);
      const res = await runR540(f540bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_SHORT_EXPANSION_ABSENT'), 'ACTION_SHORT_EXPANSION_ABSENT should not fire');
    });

    it('ACTION_WORD_COUNT_MODAL_LOCK fires when >40% of ≥10 lines share the same word count', async () => {
      // 10 lines: 5 lines of 7w (50% > 40%) + 5 varied lines
      const f540c = makeF540([7, 7, 7, 7, 7, 5, 6, 8, 9, 3]);
      const res = await runR540(f540c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_WORD_COUNT_MODAL_LOCK'), 'ACTION_WORD_COUNT_MODAL_LOCK should fire');
    });

    it('ACTION_WORD_COUNT_MODAL_LOCK does not fire when ≤40% of lines share the same word count', async () => {
      // 10 lines: 4 lines of 7w (40% = not strictly > 40%) + 6 varied lines
      const f540cnr = makeF540([7, 7, 7, 7, 5, 6, 8, 9, 3, 4]);
      const res = await runR540(f540cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_WORD_COUNT_MODAL_LOCK'), 'ACTION_WORD_COUNT_MODAL_LOCK should not fire');
    });
  });


  describe('Wave 526 — rhythmPass: word-count ascent run, finale long absent, comma dense flood', async () => {
    const runR526 = async (fountain: string) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };
    // Helper: build fountain with N action lines of given word counts
    const makeF526 = (wordCountsArr: number[]) => {
      const lines = wordCountsArr.map((n, i) => `INT. SC${i} - DAY\n\n${Array(n).fill('word').join(' ')}.`);
      return lines.join('\n\n');
    };

    it('ACTION_WORD_COUNT_ASCENT_RUN fires when 5+ consecutive action lines each strictly longer than prior', async () => {
      // 10 action lines: first 5 are 3,5,7,9,11,13 words (ascending run of 6), then 2,4,6,8 words
      const f526a = makeF526([3, 5, 7, 9, 11, 13, 2, 4, 6, 8]);
      const res = await runR526(f526a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_WORD_COUNT_ASCENT_RUN'), 'ACTION_WORD_COUNT_ASCENT_RUN should fire');
    });

    it('ACTION_WORD_COUNT_ASCENT_RUN does not fire when no ascending run reaches 5', async () => {
      // 10 action lines: 3,5,7,2,4,6,3,5,7,4 — longest ascending run = 3 (3,5,7)
      const f526anr = makeF526([3, 5, 7, 2, 4, 6, 3, 5, 7, 4]);
      const res = await runR526(f526anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_WORD_COUNT_ASCENT_RUN'), 'ACTION_WORD_COUNT_ASCENT_RUN should not fire');
    });

    it('ACTION_FINALE_LONG_ABSENT fires when finale 25% has no line ≥12w but ≥3 exist in first 75%', async () => {
      // 12 action lines: first 9 include 3 long lines (14w each), last 3 all ≤8w
      const f526b = makeF526([14, 5, 14, 6, 14, 7, 5, 6, 7, 5, 6, 7]);
      const res = await runR526(f526b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_FINALE_LONG_ABSENT'), 'ACTION_FINALE_LONG_ABSENT should fire');
    });

    it('ACTION_FINALE_LONG_ABSENT does not fire when finale 25% has at least one long line ≥12w', async () => {
      // 12 action lines: first 9 have 3 long lines, last 3 have 1 long line (14w)
      const f526bnr = makeF526([14, 5, 14, 6, 14, 7, 5, 6, 7, 5, 6, 14]);
      const res = await runR526(f526bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_FINALE_LONG_ABSENT'), 'ACTION_FINALE_LONG_ABSENT should not fire');
    });

    it('ACTION_COMMA_DENSE_FLOOD fires when >30% of ≥8 action lines have ≥3 commas', async () => {
      // 10 action lines: 4 lines with 3+ commas (40% > 30%)
      const lines526c = [
        'INT. ROOM - DAY',
        '',
        'He opens the drawer, takes the letter, reads it, then folds it.',
        '',
        'She turns, smiles, nods, and waits.',
        '',
        'The window, the door, the phone, the clock.',
        '',
        'He stands, looks at her, sighs, and sits back down.',
        '',
        'Short line.',
        '',
        'Another short one.',
        '',
        'One more line here.',
        '',
        'Final line now.',
        '',
        'End line.',
        '',
        'Last line.',
      ];
      const f526c = lines526c.join('\n');
      const res = await runR526(f526c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_COMMA_DENSE_FLOOD'), 'ACTION_COMMA_DENSE_FLOOD should fire');
    });

    it('ACTION_COMMA_DENSE_FLOOD does not fire when ≤30% of action lines have ≥3 commas', async () => {
      // 10 action lines: only 1 line with 3+ commas (10% ≤ 30%)
      const lines526cnr = [
        'INT. ROOM - DAY',
        '',
        'He opens the drawer, takes the letter, reads it, then folds it.',
        '',
        'She turns and smiles.',
        '',
        'The window is open.',
        '',
        'He stands and looks at her.',
        '',
        'Short line.',
        '',
        'Another short one.',
        '',
        'One more line here.',
        '',
        'Final line now.',
        '',
        'End line.',
        '',
        'Last line.',
      ];
      const f526cnr = lines526cnr.join('\n');
      const res = await runR526(f526cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_COMMA_DENSE_FLOOD'), 'ACTION_COMMA_DENSE_FLOOD should not fire');
    });
  });


  describe('Wave 512 — rhythmPass: middle short absent, word-count descent run, certainty adverb flood', async () => {
    const runR512 = async (fountain: string) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // ACTION_MIDDLE_SHORT_ABSENT fire:
    // 10 action lines; midStart=2, midEnd=7; outer short lines at 0,1,7,8,9; middle (2-6) all >4w
    it('ACTION_MIDDLE_SHORT_ABSENT fires when the middle 50% has no short line but ≥2 exist in outer zones', async () => {
      const f512a = [
        'INT. ROOM - DAY',
        '',
        'He turns.',
        '',
        'She waits.',
        '',
        'The afternoon sun slants through the window and catches the dust motes rising.',
        '',
        'A car passes slowly in the street outside the window.',
        '',
        'Papers scatter across the desk in a thin uneven layer.',
        '',
        'The phone on the table begins to ring with a persistent low tone.',
        '',
        'Both of them stare at it without moving to answer it.',
        '',
        'Silence.',
        '',
        'Wait.',
        '',
        'Then: a knock.',
      ].join('\n');
      const res = await runR512(f512a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_MIDDLE_SHORT_ABSENT'), 'ACTION_MIDDLE_SHORT_ABSENT should fire');
    });

    // ACTION_MIDDLE_SHORT_ABSENT no-fire: short line "Papers." in the middle zone → midShortCount=1 → no fire
    it('ACTION_MIDDLE_SHORT_ABSENT does not fire when a short line exists in the middle zone', async () => {
      const f512anr = [
        'INT. ROOM - DAY',
        '',
        'He turns.',
        '',
        'She waits.',
        '',
        'The afternoon sun slants through the window and catches the dust motes rising.',
        '',
        'A car passes slowly in the street outside the window.',
        '',
        'Papers.',
        '',
        'The phone on the table begins to ring with a persistent low tone.',
        '',
        'Both of them stare at it without moving to answer it.',
        '',
        'Silence.',
        '',
        'Wait.',
        '',
        'Then: a knock.',
      ].join('\n');
      const res = await runR512(f512anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_MIDDLE_SHORT_ABSENT'), 'ACTION_MIDDLE_SHORT_ABSENT should not fire');
    });

    // ACTION_WORD_COUNT_DESCENT_RUN fire:
    // 8 action lines; first 6 are strictly decreasing (11, 7, 6, 3, 2, 1) → maxDescentRun=6 ≥ 5 → fires
    it('ACTION_WORD_COUNT_DESCENT_RUN fires when 5+ consecutive action lines are each strictly shorter', async () => {
      const f512b = [
        'INT. ROOM - DAY',
        '',
        'She crosses the room with careful deliberate steps toward the door.',
        '',
        'She pauses in the doorway looking back at him.',
        '',
        'He watches from across the room.',
        '',
        'Nobody speaks now.',
        '',
        'Both frozen.',
        '',
        'Still.',
        '',
        'She turns.',
        '',
        'And leaves.',
      ].join('\n');
      const res = await runR512(f512b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_WORD_COUNT_DESCENT_RUN'), 'ACTION_WORD_COUNT_DESCENT_RUN should fire');
    });

    // ACTION_WORD_COUNT_DESCENT_RUN no-fire: max descent run is 4 (breaks at "She turns." = 2w = "Both frozen." 2w)
    it('ACTION_WORD_COUNT_DESCENT_RUN does not fire when the longest descent run is only 4', async () => {
      const f512bnr = [
        'INT. ROOM - DAY',
        '',
        'She crosses the room with careful deliberate steps toward the door.',
        '',
        'She pauses in the doorway looking back.',
        '',
        'He watches from across the room.',
        '',
        'Nobody speaks.',
        '',
        'She turns.',
        '',
        'And walks away from him.',
        '',
        'He watches her go.',
        '',
        'Alone again now.',
      ].join('\n');
      const res = await runR512(f512bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_WORD_COUNT_DESCENT_RUN'), 'ACTION_WORD_COUNT_DESCENT_RUN should not fire');
    });

    // ACTION_CERTAINTY_ADVERB_FLOOD fire:
    // 8 action lines, 3 contain certainty adverbs (clearly, Obviously, Naturally) → 37.5% > 20% → fires
    it('ACTION_CERTAINTY_ADVERB_FLOOD fires when >20% of action lines contain certainty adverbs', async () => {
      const f512c = [
        'INT. ROOM - DAY',
        '',
        'She clearly does not expect this.',
        '',
        'He looks up from his work.',
        '',
        'Obviously this changes everything between them.',
        '',
        'The file sits open on the desk.',
        '',
        'He opens it slowly and reads.',
        '',
        'Naturally she reaches for the folder first.',
        '',
        'He backs away from the table.',
        '',
        'The door remains closed.',
      ].join('\n');
      const res = await runR512(f512c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_CERTAINTY_ADVERB_FLOOD'), 'ACTION_CERTAINTY_ADVERB_FLOOD should fire');
    });

    // ACTION_CERTAINTY_ADVERB_FLOOD no-fire: 8 action lines, only 1 contains "clearly" → 12.5% ≤ 20% → no fire
    it('ACTION_CERTAINTY_ADVERB_FLOOD does not fire when only 1 of 8 action lines has a certainty adverb', async () => {
      const f512cnr = [
        'INT. ROOM - DAY',
        '',
        'She clearly does not expect this.',
        '',
        'He looks up from his work.',
        '',
        'The room is quiet and tense.',
        '',
        'A file sits open on the desk.',
        '',
        'He opens it slowly and reads.',
        '',
        'She reaches for the folder first.',
        '',
        'He backs away from the table.',
        '',
        'The door remains closed.',
      ].join('\n');
      const res = await runR512(f512cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_CERTAINTY_ADVERB_FLOOD'), 'ACTION_CERTAINTY_ADVERB_FLOOD should not fire');
    });
  });


  describe('Wave 498 — rhythmPass: opening long absent, density peak late, short multiclausal', async () => {
    const runR498 = async (fountain: string) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ACTION_OPENING_LONG_ABSENT fires when first 25% of action lines has no long line but ≥3 exist later', async () => {
      // 10 action lines: positions 0-1 short (≤11w), positions 2-4 each ≥12 words
      // openEnd = floor(10*0.25) = 2 → openLongCount = 0, restLongCount = 3 → fires
      const f498a = [
        'INT. ROOM - DAY',
        '',
        'She enters.',
        '',
        'He looks.',
        '',
        'The old wooden clock on the far wall ticks with a measured mechanical rhythm.',
        '',
        'Outside the smudged window a yellow cab idles at the curb while the driver checks his phone.',
        '',
        'A pigeon settles on the narrow ledge and pecks at something invisible in the cracked gray mortar.',
        '',
        'Footsteps in the hall.',
        '',
        'A key in the lock.',
        '',
        'The door swings open.',
        '',
        'Light floods in.',
        '',
        'He turns.',
      ].join('\n');
      const res = await runR498(f498a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_OPENING_LONG_ABSENT'), 'ACTION_OPENING_LONG_ABSENT should fire');
    });

    it('ACTION_OPENING_LONG_ABSENT does not fire when a long line exists in the opening 25%', async () => {
      // 10 action lines: position 0 has 16 words (≥12, in first 2 = opening 25%) → openLongCount = 1 → no fire
      const f498anr = [
        'INT. ROOM - DAY',
        '',
        'The morning light falls through the dusty venetian blinds and stripes the floor in pale gold.',
        '',
        'He looks.',
        '',
        'The clock ticks.',
        '',
        'A key in the lock.',
        '',
        'The door swings open.',
        '',
        'Light floods in.',
        '',
        'She moves to the window.',
        '',
        'He turns around.',
        '',
        'Footsteps fade.',
        '',
        'Silence returns.',
      ].join('\n');
      const res = await runR498(f498anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_OPENING_LONG_ABSENT'), 'ACTION_OPENING_LONG_ABSENT should not fire');
    });

    it('ACTION_DENSITY_PEAK_LATE fires when longest action line (≥15 words) falls in the final 25%', async () => {
      // 10 action lines: positions 0,2,4 have 12 words (long, first 7); position 9 has 16 words (peak)
      // finaleStart = floor(10*0.75) = 7; peakWC=16≥15, peakPos=9≥7, restLongCount=3 → fires
      const f498b = [
        'INT. OFFICE - DAY',
        '',
        'The old desk sits beneath the window where the light is brightest.',
        '',
        'He pauses.',
        '',
        'Stacks of papers cover every surface and have spilled onto the floor.',
        '',
        'She steps back.',
        '',
        'She reaches across the crowded desk and retrieves a single yellow envelope.',
        '',
        'He waits.',
        '',
        'She opens it.',
        '',
        'He looks away.',
        '',
        'Stillness.',
        '',
        "The building's entire south facade collapses into the street below with a single deep percussive boom.",
      ].join('\n');
      const res = await runR498(f498b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_DENSITY_PEAK_LATE'), 'ACTION_DENSITY_PEAK_LATE should fire');
    });

    it('ACTION_DENSITY_PEAK_LATE does not fire when the longest action line falls in the first 75%', async () => {
      // 10 action lines: position 0 has 16 words (longest, peakPos=0 < finaleStart=7) → no fire
      const f498bnr = [
        'INT. OFFICE - DAY',
        '',
        "The building's entire south facade collapses into the street below with a single deep percussive boom.",
        '',
        'He pauses.',
        '',
        'Stacks of papers cover every surface and have spilled onto the floor.',
        '',
        'She steps back.',
        '',
        'She reaches across the desk and retrieves the yellow envelope from the stack.',
        '',
        'He waits.',
        '',
        'She opens it.',
        '',
        'He looks away.',
        '',
        'Stillness.',
        '',
        'He leaves.',
      ].join('\n');
      const res = await runR498(f498bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_DENSITY_PEAK_LATE'), 'ACTION_DENSITY_PEAK_LATE should not fire');
    });

    it('ACTION_SHORT_MULTICLAUSAL fires when ≥4 action lines are ≤5 words with ≥2 sentence-end marks', async () => {
      // 8 action lines: 4 lines are ≤5 words AND have ≥2 sentence-end punctuation marks → fires
      const f498c = [
        'INT. HALLWAY - NIGHT',
        '',
        'She stops. Looks.',
        '',
        'He grabs. Pulls.',
        '',
        'Door slams. Silence.',
        '',
        'Light dies. Gone.',
        '',
        'The long corridor stretches ahead into darkness.',
        '',
        'Nothing moves.',
        '',
        'Then something shifts in the shadows near the end.',
        '',
        'She waits.',
      ].join('\n');
      const res = await runR498(f498c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_SHORT_MULTICLAUSAL'), 'ACTION_SHORT_MULTICLAUSAL should fire');
    });

    it('ACTION_SHORT_MULTICLAUSAL does not fire when fewer than 4 lines meet the short-multiclausal condition', async () => {
      // 8 action lines: only 3 with ≤5 words AND ≥2 sentence-end marks (4th short line has 1 end) → no fire
      const f498cnr = [
        'INT. HALLWAY - NIGHT',
        '',
        'She stops. Looks.',
        '',
        'He grabs. Pulls.',
        '',
        'Door slams. Silence.',
        '',
        'Light fades slowly away.',
        '',
        'The long corridor stretches ahead into darkness.',
        '',
        'Nothing moves.',
        '',
        'Then something shifts in the shadows near the end.',
        '',
        'She waits.',
      ].join('\n');
      const res = await runR498(f498cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_SHORT_MULTICLAUSAL'), 'ACTION_SHORT_MULTICLAUSAL should not fire');
    });
  });


  describe('Wave 484 — rhythmPass: consecutive short run, finale short absent, sentence average high', async () => {
    const runR484 = async (fountain: string) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CONSECUTIVE_SHORT_RUN fires when 5 or more consecutive action lines are ≤4 words', async () => {
      // 9 action lines: first 4 normal-length, then 5 consecutive ≤4-word lines → fires
      const f484a = [
        'INT. ROOM - DAY',
        '',
        'She walks to the window and peers through the blinds at the empty street below.',
        '',
        'He lifts the phone from the desk and checks the screen for the third time this minute.',
        '',
        'The clock on the wall reads midnight.',
        '',
        'She turns.',
        '',
        'He stands.',
        '',
        'Door opens.',
        '',
        'Light shifts.',
        '',
        'Silence.',
      ].join('\n');
      const res = await runR484(f484a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONSECUTIVE_SHORT_RUN'), 'CONSECUTIVE_SHORT_RUN should fire');
    });

    it('CONSECUTIVE_SHORT_RUN does not fire when short lines are interspersed with longer ones', async () => {
      // 9 action lines alternating long and short — max run = 1 → no fire
      const f484anr = [
        'INT. ROOM - DAY',
        '',
        'She walks to the window and peers through the blinds at the empty street below.',
        '',
        'He turns.',
        '',
        'She lifts the phone from the desk and checks the screen for the third time.',
        '',
        'Door opens.',
        '',
        'A figure steps into the doorway, silhouetted against the bright hallway light.',
        '',
        'He stands.',
        '',
        'She crosses to the desk and picks up the envelope sitting on the blotter.',
        '',
        'Light shifts.',
      ].join('\n');
      const res = await runR484(f484anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONSECUTIVE_SHORT_RUN'), 'CONSECUTIVE_SHORT_RUN should not fire');
    });

    it('ACTION_FINALE_SHORT_ABSENT fires when the final 25% has no short line but earlier sections do', async () => {
      // 12 action lines: short lines at positions 0,1 (first 25%), none in positions 9-11 (last 25%) → fires
      const f484b = [
        'INT. ROOM - DAY',
        '',
        'She turns.',
        '',
        'He stops.',
        '',
        'She crosses slowly to the window and stands looking out at the rain-soaked street below.',
        '',
        'He lifts the phone and checks the screen again, waiting for a message that has not arrived.',
        '',
        'The clock on the wall ticks steadily, each second marking time toward the moment they both dread.',
        '',
        'She turns from the window and walks back toward the center of the room, hands clasped in front.',
        '',
        'He sets the phone face-down on the desk and looks up at her for the first time all night.',
        '',
        'The lamp between them casts two separate pools of light that do not quite overlap.',
        '',
        'She studies his face carefully, reading the lines around his eyes for something she can use.',
        '',
        'He opens his mouth to speak, then closes it again, reconsidering each word before it arrives.',
      ].join('\n');
      const res = await runR484(f484b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_FINALE_SHORT_ABSENT'), 'ACTION_FINALE_SHORT_ABSENT should fire');
    });

    it('ACTION_FINALE_SHORT_ABSENT does not fire when the final 25% has a short line', async () => {
      // 12 action lines: short line at position 10 (in last 25%) → no fire
      const f484bnr = [
        'INT. ROOM - DAY',
        '',
        'She turns.',
        '',
        'He stops.',
        '',
        'She crosses slowly to the window and stands looking out at the rain-soaked street below.',
        '',
        'He lifts the phone and checks the screen again, waiting for a message that has not arrived.',
        '',
        'The clock on the wall ticks steadily, each second marking time toward the moment they both dread.',
        '',
        'She turns from the window and walks back toward the center of the room, hands clasped in front.',
        '',
        'He sets the phone face-down on the desk and looks up at her for the first time all night.',
        '',
        'The lamp between them casts two separate pools of light that do not quite overlap.',
        '',
        'She studies his face carefully, reading the lines around his eyes for something she can use.',
        '',
        'He fires.',
      ].join('\n');
      const res = await runR484(f484bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_FINALE_SHORT_ABSENT'), 'ACTION_FINALE_SHORT_ABSENT should not fire');
    });

    it('ACTION_SENTENCE_AVERAGE_HIGH fires when action lines average more than 3 sentences each', async () => {
      // 8 action lines each with 4 sentences → avg = 4 > 3 → fires
      const f484c = [
        'INT. ROOM - DAY',
        '',
        'She opens the door. The room is dark. A shape moves. Glass breaks.',
        '',
        'He crosses to the window. The blinds rattle. Wind enters. Cold air fills the room.',
        '',
        'She lifts the phone. The screen glows blue. She reads the message. Her hand shakes.',
        '',
        'He reaches for the lamp. His fingers find the switch. Light floods the room. Nothing there.',
        '',
        'She moves to the desk. Papers everywhere. She sorts through them. One catches her eye.',
        '',
        'He opens the drawer. A gun inside. He stares at it. He closes the drawer.',
        '',
        'She steps back. He steps forward. The space between them shrinks. Neither speaks.',
        '',
        'He turns away. She watches. The clock ticks. Time passes.',
      ].join('\n');
      const res = await runR484(f484c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_SENTENCE_AVERAGE_HIGH'), 'ACTION_SENTENCE_AVERAGE_HIGH should fire');
    });

    it('ACTION_SENTENCE_AVERAGE_HIGH does not fire when action lines average 3 or fewer sentences', async () => {
      // 8 action lines each with 1-2 sentences → avg ≤ 2 → no fire
      const f484cnr = [
        'INT. ROOM - DAY',
        '',
        'She opens the door and steps inside.',
        '',
        'The room is dark.',
        '',
        'He stands by the window, watching the street.',
        '',
        'She crosses to him.',
        '',
        'The lamp flickers once and goes out.',
        '',
        'He turns.',
        '',
        'She reaches for the phone on the desk.',
        '',
        'He stops her with a look.',
      ].join('\n');
      const res = await runR484(f484cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_SENTENCE_AVERAGE_HIGH'), 'ACTION_SENTENCE_AVERAGE_HIGH should not fire');
    });
  });


  describe('Wave 470 — rhythmPass: middle long absent, impact beat uncaused, density peak early', async () => {
    const runR470 = async (fountain: string) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ACTION_MIDDLE_LONG_ABSENT fires when middle 50% has no long line (≥12w) but outer zones have ≥2', async () => {
      // 12 action lines: first 3 long (≥12w), middle 6 all short, last 3 long (≥12w)
      // openEnd=3, midEnd=9; outerLong = lines[0-2]+lines[9-11] = 6 long; midLong = 0 → fire
      const f470a = [
        'INT. ROOM - DAY',
        '',
        'He walks slowly across the polished marble floor toward the tall window at the far end.',
        '',
        'She stands in the doorway with her coat still on, holding a worn leather briefcase tightly.',
        '',
        'The overhead lights flicker once and then stabilise, casting a cold flat glow across everything.',
        '',
        'He turns.',
        '',
        'She waits.',
        '',
        'He nods.',
        '',
        'She steps.',
        '',
        'He stops.',
        '',
        'She looks.',
        '',
        'He walks back to the window and stands there with his hands clasped behind him tightly.',
        '',
        'She sets down the briefcase and crosses the room to stand beside him at the glass.',
        '',
        'The city below them moves in its usual indifferent rhythm, unaware of what is happening here.',
      ].join('\n');
      const res = await runR470(f470a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_MIDDLE_LONG_ABSENT'), 'ACTION_MIDDLE_LONG_ABSENT should fire');
    });

    it('ACTION_MIDDLE_LONG_ABSENT does not fire when middle 50% contains a long line (≥12w)', async () => {
      // 12 action lines: first 3 long, one long in middle, last 3 long → midLong ≥ 1 → no fire
      const f470anr = [
        'INT. ROOM - DAY',
        '',
        'He walks slowly across the polished marble floor toward the tall window at the far end.',
        '',
        'She stands in the doorway with her coat still on, holding a worn leather briefcase tightly.',
        '',
        'The overhead lights flicker once and then stabilise, casting a cold flat glow across everything.',
        '',
        'He turns.',
        '',
        'She waits.',
        '',
        'He crosses to the far side of the room and opens the cabinet beside the bookcase.',
        '',
        'She steps.',
        '',
        'He stops.',
        '',
        'She looks.',
        '',
        'He walks back to the window and stands there with his hands clasped behind him tightly.',
        '',
        'She sets down the briefcase and crosses the room to stand beside him at the glass.',
        '',
        'The city below them moves in its usual indifferent rhythm, unaware of what is happening here.',
      ].join('\n');
      const res = await runR470(f470anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_MIDDLE_LONG_ABSENT'), 'ACTION_MIDDLE_LONG_ABSENT should not fire');
    });

    it('ACTION_IMPACT_BEAT_UNCAUSED fires when ≥2 short lines (≤4w) lack a ≥9w antecedent within 2 lines', async () => {
      // 8 action lines, all ≤4 words → qualifyingShort = lines[2..7] = 6, none preceded by ≥9w → fire
      const f470b = [
        'INT. HALL - DAY',
        '',
        'He stops.',
        '',
        'She turns.',
        '',
        'A beat.',
        '',
        'He waits.',
        '',
        'She leaves.',
        '',
        'He follows.',
        '',
        'Gone.',
        '',
        'Silence.',
      ].join('\n');
      const res = await runR470(f470b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_IMPACT_BEAT_UNCAUSED'), 'ACTION_IMPACT_BEAT_UNCAUSED should fire');
    });

    it('ACTION_IMPACT_BEAT_UNCAUSED does not fire when a short line is preceded by a long (≥9w) line within 2', async () => {
      // 8 action lines: [long(≥9w), long, long, short(≤4w), long, short, short, short]
      // index 3 (short) has prev1=index2=long(≥9w) → anyBuiltUp=true → no fire
      const f470bnr = [
        'INT. HALL - DAY',
        '',
        'He walks slowly toward the door at the far end of the hallway.',
        '',
        'She stands by the window watching him cross the room without speaking.',
        '',
        'He reaches into his coat pocket and takes out a worn folded letter.',
        '',
        'He stops.',
        '',
        'She crosses to him and takes the letter from his outstretched hand.',
        '',
        'She reads.',
        '',
        'A beat.',
        '',
        'She nods.',
      ].join('\n');
      const res = await runR470(f470bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_IMPACT_BEAT_UNCAUSED'), 'ACTION_IMPACT_BEAT_UNCAUSED should not fire');
    });

    it('ACTION_DENSITY_PEAK_EARLY fires when the longest action line (≥15w) is in the first 25%', async () => {
      // 10 action lines: first line has 17 words, rest have ≤8 words each
      // openingEnd = floor(10*0.25) = 2; maxIdx = 0 < 2 AND maxWc=17 ≥ 15 → fire
      const f470c = [
        'INT. WAREHOUSE - NIGHT',
        '',
        'The old detective reaches into his long coat and pulls out a battered leather notebook stamped with gold initials.',
        '',
        'He stops.',
        '',
        'She turns.',
        '',
        'He nods.',
        '',
        'A beat.',
        '',
        'She steps back.',
        '',
        'He waits.',
        '',
        'She leaves.',
        '',
        'He follows.',
        '',
        'Gone.',
      ].join('\n');
      const res = await runR470(f470c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_DENSITY_PEAK_EARLY'), 'ACTION_DENSITY_PEAK_EARLY should fire');
    });

    it('ACTION_DENSITY_PEAK_EARLY does not fire when the longest action line (≥15w) is after the first 25%', async () => {
      // 10 action lines: line at index 6 has 17 words; openingEnd=2; maxIdx=6 ≥ 2 → no fire
      const f470cnr = [
        'INT. WAREHOUSE - NIGHT',
        '',
        'He stops.',
        '',
        'She turns.',
        '',
        'He nods.',
        '',
        'A beat.',
        '',
        'She steps back.',
        '',
        'He waits.',
        '',
        'The old detective reaches into his long coat and pulls out a battered leather notebook stamped with gold initials.',
        '',
        'She leaves.',
        '',
        'He follows.',
        '',
        'Gone.',
      ].join('\n');
      const res = await runR470(f470cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_DENSITY_PEAK_EARLY'), 'ACTION_DENSITY_PEAK_EARLY should not fire');
    });
  });


  describe('Wave 456 — rhythmPass: consecutive long run, opening short absent, sentence count peak', async () => {
    const runR456 = async (fountain: string) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ACTION_CONSECUTIVE_LONG_RUN fires when 5+ consecutive action lines are each ≥9 words', async () => {
      // 5 long lines (≥9w each) followed by 3 shorter lines → run of 5 triggers the check
      const f456a = [
        'INT. ROOM - DAY',
        '',
        'He opens the front door and steps quietly into the hallway.',
        '',
        'She stares at the phone resting on the table by the window.',
        '',
        'The curtain stirs gently in the breeze coming from the street.',
        '',
        'He reaches into his pocket and pulls out a small folded note.',
        '',
        'A long moment passes while neither of them says anything at all.',
        '',
        'He stops.',
        '',
        'She turns.',
        '',
        'Silence.',
      ].join('\n');
      const res = await runR456(f456a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_CONSECUTIVE_LONG_RUN'), 'ACTION_CONSECUTIVE_LONG_RUN should fire');
    });

    it('ACTION_CONSECUTIVE_LONG_RUN does not fire when max consecutive long-line run is only 4', async () => {
      // 4 long lines, then a short one, then 3 more long lines → max run = 4, no fire
      const f456anr = [
        'INT. ROOM - DAY',
        '',
        'He opens the front door and steps quietly into the hallway.',
        '',
        'She stares at the phone resting on the table by the window.',
        '',
        'The curtain stirs gently in the breeze coming from the street.',
        '',
        'He reaches into his pocket and pulls out a small folded note.',
        '',
        'She stops.',
        '',
        'He walks back across the room to stand beside the old desk.',
        '',
        'She watches him without speaking a single word to break the silence.',
        '',
        'The light from the window slowly shifts as the afternoon passes.',
      ].join('\n');
      const res = await runR456(f456anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_CONSECUTIVE_LONG_RUN'), 'ACTION_CONSECUTIVE_LONG_RUN should not fire');
    });

    it('ACTION_OPENING_SHORT_ABSENT fires when no short line (≤4w) is in the first 25% while short lines appear later', async () => {
      // 12 action lines: first 3 are all ≥9 words; lines 4-12 include short ones (≤4w)
      const f456b = [
        'INT. OFFICE - DAY',
        '',
        'He walks over to the desk and sits down in the chair slowly.',
        '',
        'She stands by the window looking out at the street below her.',
        '',
        'The phone rings loudly from across the room near the door.',
        '',
        'He picks up.',
        '',
        'She turns.',
        '',
        'He waits.',
        '',
        'She crosses the room and closes the door behind her carefully.',
        '',
        'He sets down the receiver and opens the drawer beside the desk.',
        '',
        'A beat.',
        '',
        'She steps back.',
        '',
        'He stares at the window on the far side of the empty room.',
        '',
        'She leaves.',
      ].join('\n');
      const res = await runR456(f456b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_OPENING_SHORT_ABSENT'), 'ACTION_OPENING_SHORT_ABSENT should fire');
    });

    it('ACTION_OPENING_SHORT_ABSENT does not fire when a short line appears in the opening 25%', async () => {
      // 12 action lines: first 3 include "He stops." (2 words ≤4w) → short in opening → no fire
      const f456bnr = [
        'INT. OFFICE - DAY',
        '',
        'He walks over to the desk and sits down in the chair slowly.',
        '',
        'He stops.',
        '',
        'She stands by the window looking out at the street below her.',
        '',
        'He picks up.',
        '',
        'She turns.',
        '',
        'He waits.',
        '',
        'She crosses the room and closes the door behind her carefully.',
        '',
        'He sets down the receiver and opens the drawer beside the desk.',
        '',
        'A beat.',
        '',
        'She steps back.',
        '',
        'He stares at the window on the far side of the empty room.',
        '',
        'She leaves.',
      ].join('\n');
      const res = await runR456(f456bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_OPENING_SHORT_ABSENT'), 'ACTION_OPENING_SHORT_ABSENT should not fire');
    });

    it('ACTION_SENTENCE_COUNT_PEAK fires when one action line has ≥5 sentences and ≥3× the avg', async () => {
      // 8 action lines: 7 with 1 sentence each + 1 with 5 sentences → avg=(5+7)/8=1.5, peak=5, ratio≈3.3 ≥3
      const f456c = [
        'INT. HALL - DAY',
        '',
        'She looks up.',
        '',
        'He steps back.',
        '',
        'The door opens.',
        '',
        'She waits.',
        '',
        'He turns.',
        '',
        'She moves away.',
        '',
        'He follows.',
        '',
        'She drops the key. He picks it up. She looks away. He pockets it. A pause.',
      ].join('\n');
      const res = await runR456(f456c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_SENTENCE_COUNT_PEAK'), 'ACTION_SENTENCE_COUNT_PEAK should fire');
    });

    it('ACTION_SENTENCE_COUNT_PEAK does not fire when max sentence count is only 3 (< 3× avg)', async () => {
      // 8 action lines: 7 with 1 sentence each + 1 with 3 sentences → avg=(3+7)/8=1.25, ratio=2.4 <3 → no fire
      const f456cnr = [
        'INT. HALL - DAY',
        '',
        'She looks up.',
        '',
        'He steps back.',
        '',
        'The door opens.',
        '',
        'She waits.',
        '',
        'He turns.',
        '',
        'She moves away.',
        '',
        'He follows.',
        '',
        'She drops the key. He picks it up. A pause.',
      ].join('\n');
      const res = await runR456(f456cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_SENTENCE_COUNT_PEAK'), 'ACTION_SENTENCE_COUNT_PEAK should not fire');
    });
  });


  describe('Wave 442 — rhythmPass: short-long segregated, long recovery absent, wordcount flatline', async () => {
    const runR442 = async (fountain: string) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ACTION_SHORTLONG_SEGREGATED fires when short (≤4w) and long (≥12w) action lines never appear in same 5-line window', async () => {
      // 3 short (≤4w) + 5 spacers (6–8w) + 3 long (≥12w): gap of 5 spacers prevents any window spanning both
      const shortOnes442a = ['She runs.', 'He falls.', 'Door slams.'];
      const spacers442a = [
        'He walks over to the front door.',
        'The steady rain starts falling outside now.',
        'She checks the time on her phone.',
        'He lights his cigarette by the window.',
        'She stares at the clock on the wall.',
      ];
      const longOnes442a = [
        'She crosses slowly to the window and peers through the gap in the curtains outside.',
        'He lifts the phone receiver and holds it to his ear without speaking a word.',
        'The room fills with the pale light of morning as the clock on the wall ticks.',
      ];
      const f442a = `INT. ROOM - DAY\n\n${shortOnes442a.join('\n\n')}\n\n${spacers442a.join('\n\n')}\n\nINT. OFFICE - NIGHT\n\n${longOnes442a.join('\n\n')}`;
      const res = await runR442(f442a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_SHORTLONG_SEGREGATED'), 'ACTION_SHORTLONG_SEGREGATED should fire');
    });

    it('ACTION_SHORTLONG_SEGREGATED does NOT fire when short and long lines interleave within 5-line windows', async () => {
      // Short and long lines alternate — every 5-line window contains both
      const f442aNF = `INT. ROOM - DAY\n\n` +
        `She runs.\n\n` +
        `She crosses slowly to the window and peers through the gap in the curtains outside.\n\n` +
        `He falls.\n\n` +
        `He lifts the phone receiver and holds it to his ear without speaking a word.\n\n` +
        `Door slams.\n\n` +
        `The room fills with the pale light of morning as the clock on the wall ticks.\n\n` +
        `Rain falls.\n\n` +
        `She places the envelope on the table and steps back to consider what she has done.\n\n` +
        `She stops.\n\n` +
        `He watches from the doorway as the scene before him shifts into something new entirely.`;
      const res = await runR442(f442aNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_SHORTLONG_SEGREGATED'), 'ACTION_SHORTLONG_SEGREGATED should not fire');
    });

    it('ACTION_LONG_RECOVERY_ABSENT fires when no long action line (≥14w) is followed by a short beat (≤7w) within 2 lines', async () => {
      // 8 lines: 2 qualifying long lines (idx 0, idx 3), each followed only by lines ≥13 words
      const lines442b = [
        'She crosses to the window and stands there looking out at the grey afternoon light spread thin.',
        'He picks up the telephone and dials a number he does not want to dial at all.',
        'The room settles into silence as the call connects and no one speaks or moves first.',
        'She opens the envelope slowly and reads the letter inside without changing her expression at all.',
        'He watches her read and waits for the moment when her face will finally show something.',
        'The clock on the wall marks the seconds while nothing else in the room moves now.',
        'She folds the letter and sets it carefully back inside the envelope without saying a word.',
        'He crosses to the door and stands in the frame looking back at her one last time.',
      ];
      const f442b = `INT. ROOM - DAY\n\n${lines442b.join('\n\n')}`;
      const res = await runR442(f442b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_LONG_RECOVERY_ABSENT'), 'ACTION_LONG_RECOVERY_ABSENT should fire');
    });

    it('ACTION_LONG_RECOVERY_ABSENT does NOT fire when a long line is followed by a short recovery beat within 2 lines', async () => {
      // Long lines followed immediately by ≤7-word recovery beats
      const lines442bNF = [
        'She crosses to the window and stands there looking out at the grey afternoon light spread thin.',
        'She stops.',
        'He picks up the telephone and dials a number he does not want to dial today.',
        'A long beat.',
        'The room settles into silence.',
        'She opens the envelope slowly.',
        'He watches her read and waits.',
        'The clock ticks.',
      ];
      const f442bNF = `INT. ROOM - DAY\n\n${lines442bNF.join('\n\n')}`;
      const res = await runR442(f442bNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_LONG_RECOVERY_ABSENT'), 'ACTION_LONG_RECOVERY_ABSENT should not fire');
    });

    it('ACTION_WORDCOUNT_FLATLINE fires when action line word counts have stdDev < 2.5 (avg > 4)', async () => {
      // 8 lines all exactly 5 words — variance = 0, stdDev = 0 < 2.5, avg = 5 > 4
      const lines442c = [
        'She opens the door slowly.',
        'He crosses the empty room.',
        'The phone begins to ring.',
        'She picks it up quickly.',
        'He waits by the window.',
        'Rain streaks the cold glass.',
        'She hangs up the phone.',
        'He steps into the light.',
      ];
      const f442c = `INT. ROOM - DAY\n\n${lines442c.join('\n\n')}`;
      const res = await runR442(f442c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_WORDCOUNT_FLATLINE'), 'ACTION_WORDCOUNT_FLATLINE should fire');
    });

    it('ACTION_WORDCOUNT_FLATLINE does NOT fire when action lines vary widely in word count', async () => {
      // Alternating 2-word and 17-word lines — high variance, stdDev >> 2.5
      const lines442cNF = [
        'She runs.',
        'He follows her through the corridor and down the stairs and out into the wet morning air.',
        'Door slams.',
        'She stops and turns and looks back at the building from across the empty street ahead.',
        'Gone.',
        'He emerges through the door and scans the street in both directions before he sees her.',
        'Rain.',
        'She holds her ground and waits as he makes his way across the puddled pavement slowly.',
      ];
      const f442cNF = `INT. ROOM - DAY\n\n${lines442cNF.join('\n\n')}`;
      const res = await runR442(f442cNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_WORDCOUNT_FLATLINE'), 'ACTION_WORDCOUNT_FLATLINE should not fire');
    });
  });


  describe('Wave 428 — rhythmPass: consecutive opener run, action finale bloat, longest action outlier', async () => {
    const runR428 = async (fountain: string) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CONSECUTIVE_OPENER_RUN fires when 5+ consecutive action lines begin with the same word', async () => {
      // 5 consecutive "She" openers + 3 others = 8 action lines total
      const f428a = `INT. ROOM - DAY\n\n` +
        `She crosses to the window.\n\nShe picks up the phone.\n\nShe dials a number.\n\nShe waits.\n\nShe hangs up.\n\n` +
        `He enters.\n\nRain falls.\n\nThe door opens.`;
      const res = await runR428(f428a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONSECUTIVE_OPENER_RUN'), 'CONSECUTIVE_OPENER_RUN should fire');
    });

    it('CONSECUTIVE_OPENER_RUN does NOT fire when openers alternate without a run of 5', async () => {
      // Alternating She/He — max run = 1
      const f428aNF = `INT. ROOM - DAY\n\n` +
        `She crosses.\n\nHe stops.\n\nShe turns.\n\nHe picks it up.\n\nShe smiles.\n\nHe opens the door.\n\nShe speaks.\n\nHe nods.`;
      const res = await runR428(f428aNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONSECUTIVE_OPENER_RUN'), 'CONSECUTIVE_OPENER_RUN should not fire');
    });

    it('ACTION_FINALE_BLOAT fires when last 25% of action lines average >1.4× the first 75%', async () => {
      // 12 short lines ("Line N." = 2 words) then 4 long lines (~13 words) placed in the last 25%
      const shortLines = Array.from({ length: 12 }, (_, i) => `Line ${i + 1}.`);
      const longLines = [
        'The character moves slowly through the elaborate and meticulously described room.',
        'She examines each object with tremendous care noting every detail of the decor.',
        'He reaches the far wall where portraits of unknown ancestors stare blankly down.',
        'They stand together in silence letting the weight of the moment settle completely.',
      ];
      const f428b = `INT. ROOM - DAY\n\n${shortLines.join('\n\n')}\n\nINT. OFFICE - DAY\n\n${longLines.join('\n\n')}`;
      const res = await runR428(f428b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_FINALE_BLOAT'), 'ACTION_FINALE_BLOAT should fire');
    });

    it('ACTION_FINALE_BLOAT does NOT fire when action line density is uniform throughout', async () => {
      // 16 lines of uniform length (~6 words each) in one scene
      const uniformLines = Array.from({ length: 16 }, () => 'She opens the door and steps.');
      const f428bNF = `INT. ROOM - DAY\n\n${uniformLines.join('\n\n')}`;
      const res = await runR428(f428bNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_FINALE_BLOAT'), 'ACTION_FINALE_BLOAT should not fire');
    });

    it('LONGEST_ACTION_OUTLIER fires when the single longest line is ≥25 words and ≥4× average', async () => {
      // 7 short lines (2 words) + 1 line of 35 words → avg=(7×2+35)/8=6.125; 35≥4×6.125=24.5 and ≥25 → fires
      const shortOnes = ['Line one.', 'Line two.', 'Line three.', 'Line four.', 'Line five.', 'Line six.', 'Line seven.'];
      const longOne = 'She steps into the room and crosses to the window where the light falls grey and thin across the floor spreading slowly toward the chairs that nobody sits in anymore.';
      const f428c = `INT. ROOM - DAY\n\n${[...shortOnes, longOne].join('\n\n')}`;
      const res = await runR428(f428c);
      assert.ok(res.issues.some((i: any) => i.rule === 'LONGEST_ACTION_OUTLIER'), 'LONGEST_ACTION_OUTLIER should fire');
    });

    it('LONGEST_ACTION_OUTLIER does NOT fire when all action lines are proportionally sized', async () => {
      // 8 lines all ~8 words → max=8, avg≈8; 8 < 25 and 8 < 4×8=32 → no fire
      const evenLines = Array.from({ length: 8 }, () => 'She opens the door and steps inside.');
      const f428cNF = `INT. ROOM - DAY\n\n${evenLines.join('\n\n')}`;
      const res = await runR428(f428cNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'LONGEST_ACTION_OUTLIER'), 'LONGEST_ACTION_OUTLIER should not fire');
    });
  });


  describe('Wave 414 — rhythmPass: vague-quantifier overload, atmosphere-abstraction overload, color-description overload', async () => {
    const runR414 = async (fountain: string) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };
    const makeScene414 = (lines: string[]) => `INT. ROOM - DAY\n\n${lines.join('\n\n')}`;

    it('VAGUE_QUANTIFIER_OVERLOAD fires when >25% of action lines lean on vague quantities', async () => {
      const f414a = makeScene414([
        'Some people gather near the gate.',
        'A few cars pass on the street.',
        'Several dogs bark in the yard.',
        'She opens the door.',
        'He lights a cigarette.',
        'The kettle boils over.',
        'Rain streaks the window.',
        'A train rumbles past.',
      ]);
      const res = await runR414(f414a);
      assert.ok(res.issues.some((i: any) => i.rule === 'VAGUE_QUANTIFIER_OVERLOAD'), 'VAGUE_QUANTIFIER_OVERLOAD should fire');
    });

    it('VAGUE_QUANTIFIER_OVERLOAD does NOT fire when action lines commit to specifics', async () => {
      const f414aNF = makeScene414([
        'Some people gather near the gate.',
        'Two cars pass on the street.',
        'Three dogs bark in the yard.',
        'She opens the door.',
        'He lights a cigarette.',
        'The kettle boils over.',
        'Rain streaks the window.',
        'A train rumbles past.',
      ]);
      const res = await runR414(f414aNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VAGUE_QUANTIFIER_OVERLOAD'), 'VAGUE_QUANTIFIER_OVERLOAD should not fire');
    });

    it('ATMOSPHERE_ABSTRACTION_OVERLOAD fires when >25% of action lines name an abstract mood', async () => {
      const f414b = makeScene414([
        'Tension fills the room.',
        'An air of menace hangs over them.',
        'A sense of dread creeps in.',
        'She opens the window.',
        'He counts the coins.',
        'The kettle boils.',
        'A dog crosses the yard.',
        'She ties her shoes.',
      ]);
      const res = await runR414(f414b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ATMOSPHERE_ABSTRACTION_OVERLOAD'), 'ATMOSPHERE_ABSTRACTION_OVERLOAD should fire');
    });

    it('ATMOSPHERE_ABSTRACTION_OVERLOAD does NOT fire when action lines render concrete images', async () => {
      const f414bNF = makeScene414([
        'Tension fills the room.',
        'Nobody picks up a fork.',
        'He cleans the knife slowly.',
        'She opens the window.',
        'He counts the coins.',
        'The kettle boils.',
        'A dog crosses the yard.',
        'She ties her shoes.',
      ]);
      const res = await runR414(f414bNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ATMOSPHERE_ABSTRACTION_OVERLOAD'), 'ATMOSPHERE_ABSTRACTION_OVERLOAD should not fire');
    });

    it('COLOR_DESCRIPTION_OVERLOAD fires when >30% of action lines carry a color word', async () => {
      const f414c = makeScene414([
        'The red door slams shut.',
        'A blue car idles outside.',
        'Green light floods the hall.',
        'She wears a yellow coat.',
        'She opens the window.',
        'He counts the coins.',
        'The kettle boils.',
        'A dog crosses the yard.',
        'She ties her shoes.',
        'He reads the letter.',
      ]);
      const res = await runR414(f414c);
      assert.ok(res.issues.some((i: any) => i.rule === 'COLOR_DESCRIPTION_OVERLOAD'), 'COLOR_DESCRIPTION_OVERLOAD should fire');
    });

    it('COLOR_DESCRIPTION_OVERLOAD does NOT fire when color is used sparingly', async () => {
      const f414cNF = makeScene414([
        'The red door slams shut.',
        'A blue car idles outside.',
        'Light floods the hall.',
        'She wears a heavy coat.',
        'She opens the window.',
        'He counts the coins.',
        'The kettle boils.',
        'A dog crosses the yard.',
        'She ties her shoes.',
        'He reads the letter.',
      ]);
      const res = await runR414(f414cNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'COLOR_DESCRIPTION_OVERLOAD'), 'COLOR_DESCRIPTION_OVERLOAD should not fire');
    });
  });


  describe('Wave 400 — rhythmPass: long-line flood, line-ending repetition, progressive-verb overuse', async () => {
    const runR400 = async (fountain: string) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };
    const makeScene400 = (lines: string[]) =>
      `INT. ROOM - DAY\n\n${lines.join('\n\n')}`;

    it('LONG_LINE_FLOOD fires when more than 60% of action lines are 12+ words', async () => {
      // 10 action lines, 8 are ≥12 words (80%) → fires
      const longLine400 = 'She walks across the room and picks up the glass sitting on the table.';
      const shortLine400 = 'She stops.';
      const f400a = makeScene400([
        longLine400, longLine400, longLine400, longLine400, longLine400,
        longLine400, longLine400, longLine400, shortLine400, shortLine400,
      ]);
      const res = await runR400(f400a);
      assert.ok(res.issues.some((i: any) => i.rule === 'LONG_LINE_FLOOD'), 'LONG_LINE_FLOOD should fire');
    });

    it('LONG_LINE_FLOOD does not fire when fewer than 60% of action lines are 12+ words', async () => {
      // 10 lines, 4 long (40%) → no fire
      const longLine400nr = 'She walks across the room and picks up the glass sitting on the table.';
      const shortLine400nr = 'She stops and looks.';
      const f400anr = makeScene400([
        longLine400nr, longLine400nr, longLine400nr, longLine400nr,
        shortLine400nr, shortLine400nr, shortLine400nr, shortLine400nr, shortLine400nr, shortLine400nr,
      ]);
      const res = await runR400(f400anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'LONG_LINE_FLOOD'), 'LONG_LINE_FLOOD should not fire');
    });

    it('LINE_ENDING_REPETITION fires when 4+ action lines end with the same non-trivial word', async () => {
      // 10 action lines, 4 end with "door" → fires
      const f400b = makeScene400([
        'She walks through the door.',
        'He stands in the hallway.',
        'She glances back at the door.',
        'Something flickers beneath the door.',
        'Nobody locks the door.',
        'Rain falls outside.',
        'The dog barks.',
        'She shivers.',
        'He waits.',
        'Dawn breaks.',
      ]);
      const res = await runR400(f400b);
      assert.ok(res.issues.some((i: any) => i.rule === 'LINE_ENDING_REPETITION'), 'LINE_ENDING_REPETITION should fire');
    });

    it('LINE_ENDING_REPETITION does not fire when line endings are varied', async () => {
      // 10 action lines all ending with different words → no fire
      const f400bnr = makeScene400([
        'She walks through the door.',
        'He stands in the hallway.',
        'She glances at the ceiling.',
        'Something flickers overhead.',
        'Nobody speaks.',
        'Rain falls outside.',
        'The dog barks suddenly.',
        'She shivers from cold.',
        'He waits impatiently.',
        'Dawn breaks early.',
      ]);
      const res = await runR400(f400bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'LINE_ENDING_REPETITION'), 'LINE_ENDING_REPETITION should not fire');
    });

    it('PROGRESSIVE_VERB_OVERUSE fires when more than 25% of action lines use is/are + -ing', async () => {
      // 10 action lines, 4 use "is/are + -ing" (40%) → fires
      const f400c = makeScene400([
        'She is running toward the exit.',
        'He is watching from the corner.',
        'They are fighting in the alley.',
        'She is looking for her keys.',
        'The guard stands at the gate.',
        'He checks his watch.',
        'She opens the car door.',
        'He steps back.',
        'They exchange a glance.',
        'Rain begins.',
      ]);
      const res = await runR400(f400c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PROGRESSIVE_VERB_OVERUSE'), 'PROGRESSIVE_VERB_OVERUSE should fire');
    });

    it('PROGRESSIVE_VERB_OVERUSE does not fire when progressive verbs are rare', async () => {
      // 10 action lines, 1 uses "is + -ing" (10%) → no fire
      const f400cnr = makeScene400([
        'She runs toward the exit.',
        'He watches from the corner.',
        'They fight in the alley.',
        'She looks for her keys.',
        'The guard stands at the gate.',
        'He is checking his watch.',
        'She opens the car door.',
        'He steps back.',
        'They exchange a glance.',
        'Rain begins.',
      ]);
      const res = await runR400(f400cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PROGRESSIVE_VERB_OVERUSE'), 'PROGRESSIVE_VERB_OVERUSE should not fire');
    });
  });


  describe('Wave 305 — rhythmPass: dash chain, negation action flood, action parenthesis aside', async () => {
    const runRH305 = async (fountain: string) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DASH_CHAIN fires when 3+ action lines trail off with an em-dash', async () => {
      const fountain305dc = `INT. ROOM - DAY

She reaches for the door—

He steps in from the hall—

The lamp flickers and—

She turns to face him slowly.

He says nothing at first.

The clock ticks on the wall—

She finally exhales.

He crosses to the window.`;
      const res = await runRH305(fountain305dc);
      assert.ok(res.issues.some((i: any) => i.rule === 'DASH_CHAIN'), 'DASH_CHAIN should fire');
    });

    it('DASH_CHAIN does not fire when action lines complete their descriptions', async () => {
      const fountain305ndc = `INT. ROOM - DAY

She reaches for the door and stops.

He steps in from the hall.

The lamp flickers twice.

She turns to face him slowly.

He says nothing at first.

The clock ticks on the wall.

She finally exhales.

He crosses to the window.`;
      const res = await runRH305(fountain305ndc);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DASH_CHAIN'), 'DASH_CHAIN should not fire');
    });

    it('NEGATION_ACTION_FLOOD fires when >25% of action lines describe what does not happen', async () => {
      const fountain305nf = `INT. ROOM - DAY

He doesn't move from the chair.

Nothing happens for a long moment.

Nobody answers the knock.

She never looks up from the page.

He crosses to the window.

She pours a glass of water.

The radio plays softly.

He checks his watch.`;
      const res = await runRH305(fountain305nf);
      assert.ok(res.issues.some((i: any) => i.rule === 'NEGATION_ACTION_FLOOD'), 'NEGATION_ACTION_FLOOD should fire');
    });

    it('NEGATION_ACTION_FLOOD does not fire when action is mostly positive description', async () => {
      const fountain305nnf = `INT. ROOM - DAY

He rises from the chair.

The clock chimes once.

She crosses to answer the knock.

She reads the page twice.

He crosses to the window.

She pours a glass of water.

The radio plays softly.

He doesn't check his watch.`;
      const res = await runRH305(fountain305nnf);
      assert.ok(!res.issues.some((i: any) => i.rule === 'NEGATION_ACTION_FLOOD'), 'NEGATION_ACTION_FLOOD should not fire');
    });

    it('ACTION_PARENTHESIS_ASIDE fires when 3+ action lines contain parenthetical asides', async () => {
      const fountain305pa = `INT. ROOM - DAY

She picks up the gun (her father's old revolver).

He reads the letter (the one she hid).

The dog barks (as it always does).

She crosses to the window.

He pours a drink.

The clock ticks loudly.

She finally speaks.

He looks away.`;
      const res = await runRH305(fountain305pa);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_PARENTHESIS_ASIDE'), 'ACTION_PARENTHESIS_ASIDE should fire');
    });

    it('ACTION_PARENTHESIS_ASIDE does not fire when action prose has no parenthetical asides', async () => {
      const fountain305npa = `INT. ROOM - DAY

She picks up her father's old revolver.

He reads the letter she hid.

The dog barks at the door.

She crosses to the window.

He pours a drink.

The clock ticks loudly.

She finally speaks.

He looks away.`;
      const res = await runRH305(fountain305npa);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_PARENTHESIS_ASIDE'), 'ACTION_PARENTHESIS_ASIDE should not fire');
    });
  });


  describe('Wave 386 — rhythmPass: comma-splice overuse, article-opener dominance, connective-opener overuse', async () => {
    const runR386 = async (fountain: string) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('COMMA_SPLICE_OVERUSE fires when 3+ action lines splice two pronoun-subject clauses', async () => {
      const f386c = `INT. HALL - NIGHT

He turns, she follows close behind.

She stops, he keeps walking.

They wait, it never comes.

A clock ticks on the wall.

The floor creaks underfoot.

She grips the railing hard.

He checks the door again.

The light flickers once.`;
      const res = await runR386(f386c);
      assert.ok(res.issues.some((i: any) => i.rule === 'COMMA_SPLICE_OVERUSE'), 'COMMA_SPLICE_OVERUSE should fire');
    });

    it('COMMA_SPLICE_OVERUSE does not fire when clauses are properly separated', async () => {
      const f386cn = `INT. HALL - NIGHT

He turns. She follows close behind.

She stops. He keeps walking.

They wait. It never comes.

A clock ticks on the wall.

The floor creaks underfoot.

She grips the railing hard.

He checks the door again.

The light flickers once.`;
      const res = await runR386(f386cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'COMMA_SPLICE_OVERUSE'), 'COMMA_SPLICE_OVERUSE should not fire');
    });

    it('ARTICLE_OPENER_DOMINANCE fires when >40% of action lines begin with an article', async () => {
      const f386a = `INT. ROOM - DAY

The door swings open.

A man steps inside.

The floor is wet.

An alarm rings somewhere.

The window is broken.

She freezes in place.

He reaches for the light.

Footsteps echo below.

Something moves outside.

Silence falls again.`;
      const res = await runR386(f386a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ARTICLE_OPENER_DOMINANCE'), 'ARTICLE_OPENER_DOMINANCE should fire');
    });

    it('ARTICLE_OPENER_DOMINANCE does not fire when openings are varied', async () => {
      const f386an = `INT. ROOM - DAY

She opens the door.

A man steps inside.

Water pools on the floor.

Somewhere an alarm rings.

Glass litters the sill.

She freezes in place.

He reaches for the light.

Footsteps echo below.

Something moves outside.

Silence falls again.`;
      const res = await runR386(f386an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ARTICLE_OPENER_DOMINANCE'), 'ARTICLE_OPENER_DOMINANCE should not fire');
    });

    it('CONNECTIVE_OPENER_OVERUSE fires when 3+ action lines begin with a formal connective', async () => {
      const f386o = `INT. OFFICE - DAY

However, she stays at her desk.

Therefore, he leaves without a word.

Nonetheless, the meeting continues.

A phone rings in the corner.

She signs the document.

He gathers his coat.

The clock reads five.

They part in silence.`;
      const res = await runR386(f386o);
      assert.ok(res.issues.some((i: any) => i.rule === 'CONNECTIVE_OPENER_OVERUSE'), 'CONNECTIVE_OPENER_OVERUSE should fire');
    });

    it('CONNECTIVE_OPENER_OVERUSE does not fire without formal connective openers', async () => {
      const f386on = `INT. OFFICE - DAY

She stays at her desk.

He leaves without a word.

The meeting continues.

A phone rings in the corner.

She signs the document.

He gathers his coat.

The clock reads five.

They part in silence.`;
      const res = await runR386(f386on);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONNECTIVE_OPENER_OVERUSE'), 'CONNECTIVE_OPENER_OVERUSE should not fire');
    });
  });


  describe('Wave 372 — rhythmPass: triadic list overload, mid-line em-dash overuse, temporal opener overuse', async () => {
    const runR372 = async (fountain: string) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('TRIADIC_LIST_OVERLOAD fires when 3+ action lines use a rule-of-three enumeration', async () => {
      const f372t = `INT. APARTMENT - DAY

He grabs his coat, his keys, and his nerve.

She checks the stove, the lock, and the window.

They pack the maps, the rope, and the flares.

A dog barks outside.

The kettle whistles.

She sits down.

He looks away.

The clock ticks.`;
      const res = await runR372(f372t);
      assert.ok(res.issues.some((i: any) => i.rule === 'TRIADIC_LIST_OVERLOAD'), 'TRIADIC_LIST_OVERLOAD should fire');
    });

    it('TRIADIC_LIST_OVERLOAD does not fire when action lines avoid triadic lists', async () => {
      const f372tn = `INT. APARTMENT - DAY

He grabs his coat.

She checks the stove.

They pack the maps.

A dog barks outside.

The kettle whistles.

She sits down.

He looks away.

The clock ticks.`;
      const res = await runR372(f372tn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TRIADIC_LIST_OVERLOAD'), 'TRIADIC_LIST_OVERLOAD should not fire');
    });

    it('MID_LINE_EM_DASH_OVERUSE fires when 3+ action lines use a mid-sentence em-dash', async () => {
      const f372d = `INT. HALL - NIGHT

She reaches for the door—then stops.

He turns around—too late.

The light flickers—and dies.

A floorboard creaks.

She holds her breath.

The shadow moves.

He steps back.

The phone rings.`;
      const res = await runR372(f372d);
      assert.ok(res.issues.some((i: any) => i.rule === 'MID_LINE_EM_DASH_OVERUSE'), 'MID_LINE_EM_DASH_OVERUSE should fire');
    });

    it('MID_LINE_EM_DASH_OVERUSE does not fire when action lines avoid mid-line dashes', async () => {
      const f372dn = `INT. HALL - NIGHT

She reaches for the door. Then stops.

He turns around. Too late.

The light flickers and dies.

A floorboard creaks.

She holds her breath.

The shadow moves.

He steps back.

The phone rings.`;
      const res = await runR372(f372dn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'MID_LINE_EM_DASH_OVERUSE'), 'MID_LINE_EM_DASH_OVERUSE should not fire');
    });

    it('TEMPORAL_OPENER_OVERUSE fires when >25% of action lines begin with a temporal adverb', async () => {
      const f372o = `EXT. FIELD - DAY

Now she runs across the grass.

Soon the others follow her.

Later the rain begins to fall.

Finally they reach the treeline.

A bird scatters from a branch.

The wind picks up.

She wipes her face.

He checks the map.

The path narrows.

They press on.`;
      const res = await runR372(f372o);
      assert.ok(res.issues.some((i: any) => i.rule === 'TEMPORAL_OPENER_OVERUSE'), 'TEMPORAL_OPENER_OVERUSE should fire');
    });

    it('TEMPORAL_OPENER_OVERUSE does not fire when action lines open without temporal adverbs', async () => {
      const f372on = `EXT. FIELD - DAY

She runs across the grass.

The others follow her.

The rain begins to fall.

They reach the treeline.

A bird scatters from a branch.

The wind picks up.

She wipes her face.

He checks the map.

The path narrows.

They press on.`;
      const res = await runR372(f372on);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TEMPORAL_OPENER_OVERUSE'), 'TEMPORAL_OPENER_OVERUSE should not fire');
    });
  });


  describe('Wave 358 — rhythmPass: colon in action, sound description overload, intensifier flood', async () => {
    const runR358 = async (fountain: string) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('COLON_IN_ACTION fires when 3+ action lines use a colon as a reveal device', async () => {
      const f358c = `INT. STUDY - NIGHT

She opens the box: a letter inside.

He turns: MARCUS stands in the doorway.

The safe hangs open: empty.

A chair rests by the fireplace.

Papers cover the desk.

She lifts a single page.

He crosses to the window.

The clock reads midnight.`;
      const res = await runR358(f358c);
      assert.ok(res.issues.some((i: any) => i.rule === 'COLON_IN_ACTION'), 'COLON_IN_ACTION should fire');
    });

    it('COLON_IN_ACTION does not fire when action lines use periods instead of colons', async () => {
      const f358cn = `INT. STUDY - NIGHT

She opens the box. A letter is inside.

He turns. Marcus stands in the doorway.

The safe hangs open. It is empty.

A chair rests by the fireplace.

Papers cover the desk.

She lifts a single page.

He crosses to the window.

The clock reads midnight.`;
      const res = await runR358(f358cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'COLON_IN_ACTION'), 'COLON_IN_ACTION should not fire');
    });

    it('SOUND_DESCRIPTION_OVERLOAD fires when >30% of action lines contain sound vocabulary', async () => {
      const f358s = `EXT. ALLEY - NIGHT

A bang echoes off the walls.

The crash of glass follows close behind.

A roar builds in the distance.

Footsteps clatter across the wet stone.

She presses against the wall.

He checks his watch.

They wait in silence.

A door opens slowly down the block.

Light spills onto the pavement.

She exhales.`;
      const res = await runR358(f358s);
      assert.ok(res.issues.some((i: any) => i.rule === 'SOUND_DESCRIPTION_OVERLOAD'), 'SOUND_DESCRIPTION_OVERLOAD should fire');
    });

    it('SOUND_DESCRIPTION_OVERLOAD does not fire when action lines avoid sound vocabulary', async () => {
      const f358sn = `EXT. ALLEY - NIGHT

She rounds the corner at speed.

He is already waiting near the wall.

A door swings open at the far end.

She presses against the brick.

He checks his watch.

They wait.

A figure appears in the doorway.

Light falls across the pavement.

She exhales slowly.

He nods once.`;
      const res = await runR358(f358sn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SOUND_DESCRIPTION_OVERLOAD'), 'SOUND_DESCRIPTION_OVERLOAD should not fire');
    });

    it('INTENSIFIER_FLOOD fires when >30% of action lines contain filler intensifiers', async () => {
      const f358i = `INT. KITCHEN - DAY

She is very scared of what she might find.

He moves extremely carefully through the wreckage.

The room is utterly silent now.

She steps quite deliberately toward the door.

A chair has been knocked over.

Papers cover the floor.

He kneels beside the table.

She checks the back room quickly.

The windows are shut.

Dust covers everything.`;
      const res = await runR358(f358i);
      assert.ok(res.issues.some((i: any) => i.rule === 'INTENSIFIER_FLOOD'), 'INTENSIFIER_FLOOD should fire');
    });

    it('INTENSIFIER_FLOOD does not fire when action lines use precise words without filler', async () => {
      const f358in = `INT. KITCHEN - DAY

She freezes at the threshold.

He picks through the wreckage with care.

The room is silent.

She moves to the door.

A chair lies on its side.

Papers fan across the floor.

He kneels beside the table.

She opens the back door.

The windows are shut.

Dust coats every surface.`;
      const res = await runR358(f358in);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INTENSIFIER_FLOOD'), 'INTENSIFIER_FLOOD should not fire');
    });
  });


  describe('Wave 344 — rhythmPass: polysyndeton overload, semicolon in action, weather description overload', async () => {
    const runR344 = async (fountain: string) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('POLYSYNDETON_OVERLOAD fires when 3+ action lines pile up 3+ "and" coordinators', async () => {
      const f344p = `INT. WAREHOUSE - NIGHT

He grabs the bag and runs and slams the door and bolts.

She turns the corner and stumbles and recovers and keeps going.

The alarm blares and the lights flash and the gates drop and seal.

A guard shouts after them.

The truck idles at the dock.

She climbs in.

He follows close behind.

The engine catches.`;
      const res = await runR344(f344p);
      assert.ok(res.issues.some((i: any) => i.rule === 'POLYSYNDETON_OVERLOAD'), 'POLYSYNDETON_OVERLOAD should fire');
    });

    it('POLYSYNDETON_OVERLOAD does not fire when action lines use measured coordination', async () => {
      const f344pn = `INT. WAREHOUSE - NIGHT

He grabs the bag and runs.

She turns the corner. She stumbles, then recovers.

The alarm blares. The lights flash.

A guard shouts after them.

The truck idles at the dock.

She climbs in.

He follows close behind.

The engine catches.`;
      const res = await runR344(f344pn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'POLYSYNDETON_OVERLOAD'), 'POLYSYNDETON_OVERLOAD should not fire');
    });

    it('SEMICOLON_IN_ACTION fires when 3+ action lines use a semicolon', async () => {
      const f344s = `INT. STUDY - DAY

She opens the ledger; the figures do not add up.

He paces the room; his jaw tightens with each turn.

The clock ticks; nothing else moves.

A drawer hangs open.

Papers cover the desk.

She lifts a single page.

The ink is smudged.

He stops at the window.`;
      const res = await runR344(f344s);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEMICOLON_IN_ACTION'), 'SEMICOLON_IN_ACTION should fire');
    });

    it('SEMICOLON_IN_ACTION does not fire when action lines use periods', async () => {
      const f344sn = `INT. STUDY - DAY

She opens the ledger. The figures do not add up.

He paces the room. His jaw tightens with each turn.

The clock ticks. Nothing else moves.

A drawer hangs open.

Papers cover the desk.

She lifts a single page.

The ink is smudged.

He stops at the window.`;
      const res = await runR344(f344sn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEMICOLON_IN_ACTION'), 'SEMICOLON_IN_ACTION should not fire');
    });

    it('WEATHER_DESCRIPTION_OVERLOAD fires when >30% of action lines describe weather', async () => {
      const f344w = `EXT. RIDGE - DAY

Rain lashes the ridge in grey sheets.

The wind tears at her coat.

Fog rolls down from the peaks.

She climbs the narrow path.

Thunder rumbles across the valley.

He reaches the summit.

Snow begins to fall in heavy flakes.

The storm closes in around them.

They huddle behind a rock.

She tightens her grip on the rope.`;
      const res = await runR344(f344w);
      assert.ok(res.issues.some((i: any) => i.rule === 'WEATHER_DESCRIPTION_OVERLOAD'), 'WEATHER_DESCRIPTION_OVERLOAD should fire');
    });

    it('WEATHER_DESCRIPTION_OVERLOAD does not fire when weather is incidental', async () => {
      const f344wn = `EXT. RIDGE - DAY

Rain lashes the ridge in grey sheets.

She climbs the narrow path.

He reaches the summit.

They huddle behind a rock.

She checks the map.

He points to the trail below.

She nods and shoulders the pack.

They start down the slope.

A bird wheels overhead.

She tightens her grip on the rope.`;
      const res = await runR344(f344wn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'WEATHER_DESCRIPTION_OVERLOAD'), 'WEATHER_DESCRIPTION_OVERLOAD should not fire');
    });
  });


  describe('Wave 330 — rhythmPass: we-see flood, light description overload, set dressing dominance', async () => {
    const runR330 = async (fountain: string) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('WE_SEE_FLOOD fires when >25% of action lines begin with "We see/hear/find/watch/notice"', async () => {
      const f330ws = `INT. ARCHIVE ROOM - DAY

We see a row of filing cabinets against the wall.

A woman enters through the side door.

We hear footsteps echo on the stone floor.

She pauses and scans the room.

We notice a drawer left slightly open.

Her hand moves toward it carefully.

We find a photograph inside the drawer.

She turns it over slowly.

The ink on the back is faded.

She sets the photograph down.`;
      const res = await runR330(f330ws);
      assert.ok(res.issues.some((i: any) => i.rule === 'WE_SEE_FLOOD'), 'WE_SEE_FLOOD should fire');
    });

    it('WE_SEE_FLOOD does not fire when action lines avoid "We see" constructions', async () => {
      const f330nws = `INT. ARCHIVE ROOM - DAY

A row of filing cabinets lines the wall.

A woman enters through the side door.

Footsteps echo on the stone floor.

She pauses and scans the room.

A drawer sits slightly open.

Her hand moves toward it carefully.

A photograph rests inside the drawer.

She turns it over slowly.

The ink on the back is faded.

She sets the photograph down.`;
      const res = await runR330(f330nws);
      assert.ok(!res.issues.some((i: any) => i.rule === 'WE_SEE_FLOOD'), 'WE_SEE_FLOOD should not fire');
    });

    it('LIGHT_DESCRIPTION_OVERLOAD fires when >30% of action lines contain lighting vocabulary', async () => {
      const f330ld = `INT. ABANDONED THEATRE - NIGHT

Shadows pool in the corners of the empty stage.

A single spotlight cuts through the darkness above.

Marcus steps into the beam of light.

The glow catches the side of his face.

He looks out at the rows of empty seats.

A flicker from the overhead lamp startles him.

He steadies himself on the nearest chair.

The darkness seems to press in from all sides.

A shaft of moonlight falls through the broken skylight.

He reaches for the wall switch.`;
      const res = await runR330(f330ld);
      assert.ok(res.issues.some((i: any) => i.rule === 'LIGHT_DESCRIPTION_OVERLOAD'), 'LIGHT_DESCRIPTION_OVERLOAD should fire');
    });

    it('LIGHT_DESCRIPTION_OVERLOAD does not fire when lighting references are sparse', async () => {
      const f330nld = `INT. ABANDONED THEATRE - NIGHT

The stage is empty, the curtain pulled to one side.

Marcus enters from the wings, coat still on.

He crosses to the front of the stage.

The seats stretch back into the distance.

He crouches and opens his bag on the floor.

Tools inside — pliers, wire, a small torch.

He works quickly, hands sure.

A pigeon startles in the rafters.

He freezes, listens.

Nothing. He goes back to work.`;
      const res = await runR330(f330nld);
      assert.ok(!res.issues.some((i: any) => i.rule === 'LIGHT_DESCRIPTION_OVERLOAD'), 'LIGHT_DESCRIPTION_OVERLOAD should not fire');
    });

    it('SET_DRESSING_DOMINANCE fires when >35% of action lines mention static furniture or architecture', async () => {
      const f330sd = `INT. APARTMENT - MORNING

The desk is covered in papers and empty mugs.

Elena sits at the table near the window.

A bookcase runs floor to ceiling on the far wall.

Her laptop rests on the counter to her left.

She picks up her coffee.

The door to the bedroom is still closed.

An overflowing shelf of files sits behind her.

She turns to face the wardrobe mirror.

Boots by the door, coat on the hook.

Her phone buzzes on the table.`;
      const res = await runR330(f330sd);
      assert.ok(res.issues.some((i: any) => i.rule === 'SET_DRESSING_DOMINANCE'), 'SET_DRESSING_DOMINANCE should fire');
    });

    it('SET_DRESSING_DOMINANCE does not fire when action lines focus on character behavior', async () => {
      const f330nsd = `INT. APARTMENT - MORNING

Elena sorts through her mail, discarding most of it unopened.

She makes coffee without watching what her hands do.

A news broadcast plays in the next room.

She leans against the counter, listening.

The presenter is talking about the ferry crash.

Elena goes still.

Her coffee goes cold.

Finally she picks up her phone and dials.

No answer. She dials again.

She closes her eyes and waits.`;
      const res = await runR330(f330nsd);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SET_DRESSING_DOMINANCE'), 'SET_DRESSING_DOMINANCE should not fire');
    });
  });


  describe('Wave 319 — rhythmPass: suddenly overuse, pronoun opener dominance, physical interiority leak', async () => {
    const runR319 = async (fountain: string) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('SUDDENLY_OVERUSE fires when >20% of action lines contain urgency adverbs', async () => {
      const fountain319s = `INT. STUDIO APARTMENT - DAY

The room is sparse. A single chair faces the window.

Suddenly the phone rings.

Alice crosses to the table.

She picks it up without thinking.

The voice on the other end is distorted.

She abruptly steps back from the window.

A shadow moves on the wall.

Without warning, the power cuts out.

Alice fumbles for her lighter.

The flame trembles in her hand.

Immediately she presses herself to the wall.

Silence.`;
      const res = await runR319(fountain319s);
      assert.ok(res.issues.some((i: any) => i.rule === 'SUDDENLY_OVERUSE'), 'SUDDENLY_OVERUSE should fire');
    });

    it('SUDDENLY_OVERUSE does not fire when action lines avoid urgency adverbs', async () => {
      const fountain319ns = `INT. STUDIO APARTMENT - DAY

The room is sparse. A single chair faces the window.

The phone rings.

Alice crosses to the table.

She picks it up without thinking.

The voice on the other end is distorted.

She steps back from the window.

A shadow moves on the wall.

The power cuts out.

Alice fumbles for her lighter.

The flame trembles in her hand.

She presses herself to the wall.

Silence.`;
      const res = await runR319(fountain319ns);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SUDDENLY_OVERUSE'), 'SUDDENLY_OVERUSE should not fire');
    });

    it('PRONOUN_OPENER_DOMINANCE fires when >45% of action lines begin with personal pronouns', async () => {
      const fountain319p = `INT. CONFERENCE ROOM - DAY

He enters and places his briefcase on the table.

She watches him from across the room.

They exchange a look — loaded, brief.

He pulls out a folder.

The documents slide onto the table.

She reaches for them.

He doesn't look up.

Their silence speaks.

The clock on the wall ticks loudly.

They both hear it.

She finally speaks first.

He shrugs.`;
      const res = await runR319(fountain319p);
      assert.ok(res.issues.some((i: any) => i.rule === 'PRONOUN_OPENER_DOMINANCE'), 'PRONOUN_OPENER_DOMINANCE should fire');
    });

    it('PRONOUN_OPENER_DOMINANCE does not fire when action lines use varied subject openers', async () => {
      const fountain319np = `INT. CONFERENCE ROOM - DAY

The briefcase lands on the table with a thud.

Papers slide across the polished surface.

Two chairs scrape back in unison.

Across the room, a window catches the afternoon light.

Documents fan out on the table.

One sheet catches the draft from the vent.

The clock on the wall ticks loudly.

On the far wall, a whiteboard is covered in notes.

A folder snaps shut.

The lights flicker once.

Silence.

Both sides of the table grow still.`;
      const res = await runR319(fountain319np);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PRONOUN_OPENER_DOMINANCE'), 'PRONOUN_OPENER_DOMINANCE should not fire');
    });

    it('PHYSICAL_INTERIORITY_LEAK fires when >25% of action lines describe internal body sensations', async () => {
      const fountain319i = `INT. HOSPITAL CORRIDOR - NIGHT

Alice walks down the empty corridor.

The fluorescent lights buzz overhead.

Her stomach tightens as she approaches the door.

She presses her hand to the glass.

Inside, the machines blink steadily.

His heart races as he waits for the verdict.

The doctor turns from the chart.

She sets down the clipboard.

Alice's breath catches before the first word.

A trolley wheels past in the distance.

His knees go weak at the news.

He grabs the railing to steady himself.`;
      const res = await runR319(fountain319i);
      assert.ok(res.issues.some((i: any) => i.rule === 'PHYSICAL_INTERIORITY_LEAK'), 'PHYSICAL_INTERIORITY_LEAK should fire');
    });

    it('PHYSICAL_INTERIORITY_LEAK does not fire when action lines describe external observable behaviour', async () => {
      const fountain319ni = `INT. HOSPITAL CORRIDOR - NIGHT

Alice walks down the empty corridor.

The fluorescent lights buzz overhead.

She slows as she approaches the door.

She presses her hand to the glass.

Inside, the machines blink steadily.

He paces the waiting area for the third time.

The doctor turns from the chart.

She sets down the clipboard.

Alice looks away before the first word lands.

A trolley wheels past in the distance.

He grips the railing with both hands.

He stares at the floor.`;
      const res = await runR319(fountain319ni);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PHYSICAL_INTERIORITY_LEAK'), 'PHYSICAL_INTERIORITY_LEAK should not fire');
    });
  });


  describe('Wave 291 — rhythmPass: number word flood, prepositional opening dominance, action line word floor', async () => {
    const runRH291 = async (fountain: string) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('NUMBER_WORD_FLOOD fires when >35% of 8+ action lines contain number words', async () => {
      const fountain291nwf = `INT. ROOM - DAY

Two guards stand at the door.

Three chairs are arranged in a row.

One phone sits on the table.

Four paintings hang on the wall.

She looks at them.

He nods.

Five seconds pass.

Two more guards enter.

He picks up the phone.`;
      const res = await runRH291(fountain291nwf);
      assert.ok(res.issues.some((i: any) => i.rule === 'NUMBER_WORD_FLOOD'), 'NUMBER_WORD_FLOOD should fire');
    });

    it('NUMBER_WORD_FLOOD does not fire when number words are sparse', async () => {
      const fountain291nnwf = `INT. ROOM - DAY

Guards stand at the door.

Chairs are arranged in a row.

A phone sits on the table.

Paintings hang on the wall.

She looks at them.

He nods and crosses the room.

She picks up the receiver.

He turns to the window.

Two seconds pass.

She speaks first.`;
      const res = await runRH291(fountain291nnwf);
      assert.ok(!res.issues.some((i: any) => i.rule === 'NUMBER_WORD_FLOOD'), 'NUMBER_WORD_FLOOD should not fire');
    });

    it('PREPOSITIONAL_OPENING_DOMINANCE fires when >35% of 8+ action lines start with prepositions', async () => {
      const fountain291pod = `INT. OFFICE - DAY

In the corner, she waits.

At the table, he reads the file.

Across the room, the door opens.

By the window, a phone rings.

She picks it up.

Through the glass, a figure approaches.

On the desk, papers scatter.

Along the wall, shadows lengthen.

He closes the file.

She hangs up the phone.`;
      const res = await runRH291(fountain291pod);
      assert.ok(res.issues.some((i: any) => i.rule === 'PREPOSITIONAL_OPENING_DOMINANCE'), 'PREPOSITIONAL_OPENING_DOMINANCE should fire');
    });

    it('PREPOSITIONAL_OPENING_DOMINANCE does not fire when openers are varied', async () => {
      const fountain291npod = `INT. OFFICE - DAY

She crosses to the window.

He opens the file on the desk.

The phone rings once.

She picks it up without looking.

In the corner, a clock ticks.

He closes the folder.

She nods and hands it back.

He takes it without a word.

The door opens slowly.

Both of them turn.`;
      const res = await runRH291(fountain291npod);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PREPOSITIONAL_OPENING_DOMINANCE'), 'PREPOSITIONAL_OPENING_DOMINANCE should not fire');
    });

    it('ACTION_LINE_WORD_FLOOR fires when all 8+ action lines are ≤5 words', async () => {
      const fountain291alf = `INT. ROOM - DAY

She runs.

Door slams.

Glass breaks.

He falls.

Silence.

She stops.

He rises.

She turns away.`;
      const res = await runRH291(fountain291alf);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_LINE_WORD_FLOOR'), 'ACTION_LINE_WORD_FLOOR should fire');
    });

    it('ACTION_LINE_WORD_FLOOR does not fire when some action lines exceed 5 words', async () => {
      const fountain291nalf = `INT. ROOM - DAY

She runs toward the far end of the corridor.

Door slams behind her with a crack.

Glass breaks somewhere below.

He falls back against the wall clutching his arm.

Silence settles over the room like a held breath.

She stops and looks back at where he stood.

He rises slowly with difficulty from the floor.

She turns away from the wreckage they made together.`;
      const res = await runRH291(fountain291nalf);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_LINE_WORD_FLOOR'), 'ACTION_LINE_WORD_FLOOR should not fire');
    });
  });


  describe('Wave 277 — rhythmPass: body-part overload, single-sentence flood, ellipsis chain', async () => {
    const rInput277 = (fountain: string) => ({
      fountain, original: fountain, records: [] as any, structure: {} as any,
      annotations: [], approvedSpans: [],
    });
    const runR277 = async (fountain: string) => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      return rhythmPass(rInput277(fountain));
    };

    it('BODY_PART_OVERLOAD fires when more than 40% of action lines reference isolated body parts', async () => {
      // 8 action lines; 5 reference body parts (62.5% > 40%)
      const f277a = [
        'INT. OFFICE - DAY', '',
        'Her hands trembled on the desk beside him.',
        'He reached for the doorknob slowly across the room.',
        'His eyes narrowed in deep suspicion at the figure.',
        'She folded her arms tightly across her chest.',
        'His jaw tightened as he read the report.',
        'She moved toward the window across the office.',
        'His fingers moved slowly to the button on the wall.',
        'She turned quickly away from him and the light.',
      ].join('\n');
      const result277a = await runR277(f277a);
      const bpo277a = result277a.issues.filter((i: any) => i.rule === 'BODY_PART_OVERLOAD');
      assert.ok(bpo277a.length >= 1, `Should detect BODY_PART_OVERLOAD, got: ${JSON.stringify(result277a.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(bpo277a[0].severity, 'minor');
    });

    it('BODY_PART_OVERLOAD does NOT fire when body-part lines are 40% or fewer', async () => {
      // 8 action lines; only 2 reference body parts (25% ≤ 40%)
      const f277b = [
        'INT. OFFICE - DAY', '',
        'She walks to the window and opens it.',
        'He picks up the coffee and takes a sip.',
        'The room fills with early morning sunlight.',
        'Outside the traffic noise rises steadily.',
        'She checks the time and picks up her bag.',
        'His jaw tightened as he read the first line.',
        'The stack of papers sits in the corner.',
        'Neither of them speaks for a long moment.',
      ].join('\n');
      const result277b = await runR277(f277b);
      const bpo277b = result277b.issues.filter((i: any) => i.rule === 'BODY_PART_OVERLOAD');
      assert.strictEqual(bpo277b.length, 0, 'Should NOT fire BODY_PART_OVERLOAD when body-part lines are ≤40%');
    });

    it('SINGLE_SENTENCE_FLOOD fires when all 12+ action lines are exactly one sentence', async () => {
      // 12 action lines, each ending with a single '.', avgWords ≈ 9
      const f277c = [
        'INT. WAREHOUSE - NIGHT', '',
        'Alice walks through the dark warehouse completely alone.',
        'The overhead lights flicker and then go dark.',
        'She stops near the central storage rack now.',
        'A strange sound echoes from somewhere in the distance.',
        'She pulls her phone out slowly from her pocket.',
        'The screen casts a pale blue light ahead.',
        'She turns slowly around and scans the whole room.',
        'Her breath fogs in the cold and damp air.',
        'The exit sign glows red at the very far end.',
        'She decides to walk toward the distant exit sign.',
        'A shadow passes quickly behind the storage racks there.',
        'She freezes completely still near the center of room.',
      ].join('\n');
      const result277c = await runR277(f277c);
      const ssf277c = result277c.issues.filter((i: any) => i.rule === 'SINGLE_SENTENCE_FLOOD');
      assert.ok(ssf277c.length >= 1, `Should detect SINGLE_SENTENCE_FLOOD, got: ${JSON.stringify(result277c.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(ssf277c[0].severity, 'minor');
    });

    it('SINGLE_SENTENCE_FLOOD does NOT fire when at least one action line has multiple sentences', async () => {
      // Same 12 lines but one has two sentences → not a complete flood
      const f277d = [
        'INT. WAREHOUSE - NIGHT', '',
        'Alice walks through the dark warehouse completely alone.',
        'The overhead lights flicker and then go dark.',
        'She stops near the central storage rack now.',
        'A strange sound echoes from somewhere in the distance.',
        'She pulls her phone out. She checks the screen.',
        'The screen casts a pale blue light ahead.',
        'She turns slowly around and scans the whole room.',
        'Her breath fogs in the cold and damp air.',
        'The exit sign glows red at the very far end.',
        'She decides to walk toward the distant exit sign.',
        'A shadow passes quickly behind the storage racks there.',
        'She freezes completely still near the center of room.',
      ].join('\n');
      const result277d = await runR277(f277d);
      const ssf277d = result277d.issues.filter((i: any) => i.rule === 'SINGLE_SENTENCE_FLOOD');
      assert.strictEqual(ssf277d.length, 0, 'Should NOT fire SINGLE_SENTENCE_FLOOD when at least one multi-sentence line exists');
    });

    it('ELLIPSIS_CHAIN fires when 3 or more action lines trail off with ellipses', async () => {
      // 8 action lines; 3 end with '...'
      const f277e = [
        'INT. HALLWAY - DAY', '',
        'She pauses outside the door without entering.',
        'He reaches slowly for the handle there...',
        'She hesitates, not sure whether to enter...',
        'There was something in the way he looked at her...',
        'He finally steps back from the door frame.',
        'She opens the door slowly and walks inside.',
        'The room beyond is completely empty tonight.',
        'The echo hangs quietly in the still cold air.',
      ].join('\n');
      const result277e = await runR277(f277e);
      const ec277e = result277e.issues.filter((i: any) => i.rule === 'ELLIPSIS_CHAIN');
      assert.ok(ec277e.length >= 1, `Should detect ELLIPSIS_CHAIN, got: ${JSON.stringify(result277e.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(ec277e[0].severity, 'minor');
    });

    it('ELLIPSIS_CHAIN does NOT fire when fewer than 3 action lines end with ellipses', async () => {
      // 8 action lines; only 1 ends with '...'
      const f277f = [
        'INT. HALLWAY - DAY', '',
        'She pauses outside the door without entering.',
        'He reaches slowly for the handle...',
        'She opens the door and steps inside.',
        'The door is made of old dark polished wood.',
        'He finally steps back from the doorway.',
        'She enters and looks around the small room.',
        'The room beyond is completely empty tonight.',
        'The echo hangs quietly in the cold air.',
      ].join('\n');
      const result277f = await runR277(f277f);
      const ec277f = result277f.issues.filter((i: any) => i.rule === 'ELLIPSIS_CHAIN');
      assert.strictEqual(ec277f.length, 0, 'Should NOT fire ELLIPSIS_CHAIN when fewer than 3 lines end with ellipses');
    });
  });


  describe('Wave 263 — rhythmPass: question in action, simile excess, color absence', async () => {
    it('QUESTION_IN_ACTION fires when ≥2 action lines end with "?"', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      const f263a = [
        'INT. OFFICE - DAY', '',
        'She enters the empty room.',
        'What happened here?',
        'The chairs are overturned.',
        'Papers scatter across the floor.',
        'He follows her inside.',
        'The lights flicker above them.',
        'Who did this?',
        'She shakes her head slowly.',
      ].join('\n');
      const result263a = await rhythmPass({ fountain: f263a, original: f263a, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(result263a.issues.some((i: any) => i.rule === 'QUESTION_IN_ACTION'), `Expected QUESTION_IN_ACTION, got: ${JSON.stringify(result263a.issues.map((i: any) => i.rule))}`);
    });

    it('QUESTION_IN_ACTION does NOT fire when fewer than 2 action lines end with "?"', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      const f263b = [
        'INT. OFFICE - DAY', '',
        'She enters the empty room.',
        'The chairs are overturned.',
        'Papers scatter across the floor.',
        'He follows her inside.',
        'The lights flicker above them.',
        'She shakes her head slowly.',
        'He moves toward the window.',
        'She looks at the closed door.',
      ].join('\n');
      const result263b = await rhythmPass({ fountain: f263b, original: f263b, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(!result263b.issues.some((i: any) => i.rule === 'QUESTION_IN_ACTION'), 'Should NOT fire when fewer than 2 action lines end with "?"');
    });

    it('SIMILE_EXCESS fires when ≥3 action lines contain simile markers', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      const f263c = [
        'INT. WAREHOUSE - NIGHT', '',
        'He moves like a shadow through the space.',
        'She watches from the doorway.',
        'The stacked crates rise high.',
        'He stops near the center.',
        'She calls to him quietly.',
        'The echo rings as if from another world.',
        'He turns slowly to face her.',
        'She approaches with caution.',
        'As though startled, he raises his hands.',
        'She holds her ground.',
      ].join('\n');
      const result263c = await rhythmPass({ fountain: f263c, original: f263c, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(result263c.issues.some((i: any) => i.rule === 'SIMILE_EXCESS'), `Expected SIMILE_EXCESS, got: ${JSON.stringify(result263c.issues.map((i: any) => i.rule))}`);
    });

    it('SIMILE_EXCESS does NOT fire when fewer than 3 action lines have simile markers', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      const f263d = [
        'INT. WAREHOUSE - NIGHT', '',
        'He moves like a shadow through the space.',
        'She watches from the doorway.',
        'The stacked crates rise high.',
        'He stops near the center.',
        'She calls to him quietly.',
        'The echo rings across the room.',
        'He turns slowly to face her.',
        'She approaches with caution.',
        'He lowers his hands.',
        'She steps back.',
      ].join('\n');
      const result263d = await rhythmPass({ fountain: f263d, original: f263d, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(!result263d.issues.some((i: any) => i.rule === 'SIMILE_EXCESS'), 'Should NOT fire when fewer than 3 simile markers');
    });

    it('COLOR_ABSENCE fires when ≥12 action lines contain no color word', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      const lines263e = [
        'She enters the room and closes the door.',
        'He stands near the window.',
        'The desk sits in the corner.',
        'Papers cover every surface.',
        'He picks up a folder.',
        'She watches him carefully.',
        'The clock ticks on the wall.',
        'He sets the folder down.',
        'She moves toward the exit.',
        'He blocks her path.',
        'They face each other.',
        'Neither speaks.',
      ];
      const f263e = ['INT. OFFICE - DAY', '', ...lines263e].join('\n');
      const result263e = await rhythmPass({ fountain: f263e, original: f263e, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(result263e.issues.some((i: any) => i.rule === 'COLOR_ABSENCE'), `Expected COLOR_ABSENCE, got: ${JSON.stringify(result263e.issues.map((i: any) => i.rule))}`);
    });

    it('COLOR_ABSENCE does NOT fire when at least one action line contains a color word', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      const lines263f = [
        'She enters the room and closes the door.',
        'He stands near the window.',
        'The red exit sign glows above the door.',
        'Papers cover every surface.',
        'He picks up a folder.',
        'She watches him carefully.',
        'The clock ticks on the wall.',
        'He sets the folder down.',
        'She moves toward the exit.',
        'He blocks her path.',
        'They face each other.',
        'Neither speaks.',
      ];
      const f263f = ['INT. OFFICE - DAY', '', ...lines263f].join('\n');
      const result263f = await rhythmPass({ fountain: f263f, original: f263f, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(!result263f.issues.some((i: any) => i.rule === 'COLOR_ABSENCE'), 'Should NOT fire when a color word is present');
    });
  });


  describe('Wave 249 — rhythmPass: short line poverty, visual texture absent, spatial anchor absent', async () => {
    it('SHORT_LINE_POVERTY fires when no action line has ≤3 words across ≥12 action lines', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      const lines249a = Array.from({ length: 12 }, (_, i) => `She crosses to the window and looks out at the street.`);
      const f249a = ['INT. OFFICE - DAY', '', ...lines249a].join('\n');
      const result = await rhythmPass({ fountain: f249a, original: f249a, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(result.issues.some((i: any) => i.rule === 'SHORT_LINE_POVERTY'), `Expected SHORT_LINE_POVERTY, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('SHORT_LINE_POVERTY does NOT fire when at least one action line has ≤3 words', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      const f249b = [
        'INT. OFFICE - DAY', '',
        'She crosses to the window and looks out at the street.',
        'He stands near the door.',
        'She opens the drawer.',
        'He checks the files on the shelf.',
        'She walks toward the exit.',
        'He closes the blinds.',
        'She picks up the phone.',
        'He sets it down.',
        'She turns away.',
        'He sighs deeply.',
        'She stops.',
        'Dead silence.',
      ].join('\n');
      const result = await rhythmPass({ fountain: f249b, original: f249b, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(!result.issues.some((i: any) => i.rule === 'SHORT_LINE_POVERTY'), 'Should NOT fire when a ≤3-word action line exists');
    });

    it('VISUAL_TEXTURE_ABSENT fires when no action line contains a texture descriptor', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      const f249c = [
        'INT. OFFICE - DAY', '',
        'The desk sits by the window.',
        'A lamp stands in the corner.',
        'Papers are stacked near the edge.',
        'The door stands open.',
        'A chair faces the desk.',
        'Files are arranged on the shelf.',
        'A calendar hangs on the wall.',
        'The carpet covers the floor.',
        'A plant grows near the window.',
        'The clock ticks on the wall.',
      ].join('\n');
      const result = await rhythmPass({ fountain: f249c, original: f249c, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(result.issues.some((i: any) => i.rule === 'VISUAL_TEXTURE_ABSENT'), `Expected VISUAL_TEXTURE_ABSENT, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('VISUAL_TEXTURE_ABSENT does NOT fire when at least one action line has a texture word', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      const f249d = [
        'INT. OFFICE - DAY', '',
        'The worn desk sits by the window.',
        'A lamp stands in the corner.',
        'Papers are stacked near the edge.',
        'The door stands open.',
        'A chair faces the desk.',
        'Files are arranged on the shelf.',
        'A calendar hangs on the wall.',
        'The carpet covers the floor.',
        'A plant grows near the window.',
        'The clock ticks on the wall.',
      ].join('\n');
      const result = await rhythmPass({ fountain: f249d, original: f249d, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(!result.issues.some((i: any) => i.rule === 'VISUAL_TEXTURE_ABSENT'), 'Should NOT fire when texture word is present');
    });

    it('SPATIAL_ANCHOR_ABSENT fires when no action line contains a spatial anchor phrase', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      const f249e = [
        'INT. ROOM - DAY', '',
        'Alice enters the room.',
        'She moves toward Bob.',
        'Bob turns and sees her.',
        'She picks up the folder.',
        'Bob watches her carefully.',
        'She hands him the documents.',
        'Bob reads the first page.',
        'Alice waits in silence.',
      ].join('\n');
      const result = await rhythmPass({ fountain: f249e, original: f249e, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(result.issues.some((i: any) => i.rule === 'SPATIAL_ANCHOR_ABSENT'), `Expected SPATIAL_ANCHOR_ABSENT, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('SPATIAL_ANCHOR_ABSENT does NOT fire when at least one action line has a spatial anchor', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      const f249f = [
        'INT. ROOM - DAY', '',
        'Alice enters the room.',
        'She moves to Bob who stands by the window.',
        'Bob turns and sees her.',
        'She picks up the folder.',
        'Bob watches her carefully.',
        'She hands him the documents.',
        'Bob reads the first page.',
        'Alice waits in silence.',
      ].join('\n');
      const result = await rhythmPass({ fountain: f249f, original: f249f, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(!result.issues.some((i: any) => i.rule === 'SPATIAL_ANCHOR_ABSENT'), 'Should NOT fire when spatial anchor phrase is present');
    });
  });


  describe('Wave 221 — rhythmPass: prose rhythm blocking, prose length ramp, intra-clause cadence absent (prose-cadence signal-processing)', async () => {
    // Distinct words so action lines don't trip word-repetition rules.
    const POOL221 = ['amber', 'breeze', 'candle', 'dapple', 'ember', 'fathom', 'glisten', 'harbor', 'ivory', 'jangle', 'kindle', 'lantern', 'marble', 'nestle', 'opal', 'pewter', 'quiver', 'ripple', 'saffron', 'thistle'];
    const wline221 = (n: number, offset = 0) =>
      Array.from({ length: n }, (_, k) => POOL221[(offset + k) % POOL221.length]).join(' ') + '.';
    const wlineComma221 = (n: number, offset = 0) => {
      const words = Array.from({ length: n }, (_, k) => POOL221[(offset + k) % POOL221.length]);
      const half = Math.floor(n / 2);
      return words.slice(0, half).join(' ') + ', ' + words.slice(half).join(' ') + '.';
    };
    const makeTextInput221 = (actionLines: string[]) => {
      const fountain = 'INT. ROOM - DAY\n\n' + actionLines.join('\n') + '\n';
      return {
        fountain, original: fountain,
        records: [] as any, structure: {} as any,
        storyContext: {} as any, annotations: [] as any,
        approvedSpans: [],
      };
    };

    it('PROSE_RHYTHM_BLOCKING fires when long and short lines are grouped into blocks', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      // 5 long lines (12 words) then 5 short lines (3 words) → high variance, single crossing
      const lines = [
        ...Array.from({ length: 5 }, (_, i) => wline221(12, i)),
        ...Array.from({ length: 5 }, (_, i) => wline221(3, i + 5)),
      ];
      const result = await rhythmPass(makeTextInput221(lines));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'PROSE_RHYTHM_BLOCKING'),
        'Should fire when high-variance line lengths rarely cross their mean',
      );
    });

    it('PROSE_RHYTHM_BLOCKING does not fire when long and short lines alternate', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      const lines = Array.from({ length: 10 }, (_, i) => wline221(i % 2 === 0 ? 12 : 3, i));
      const result = await rhythmPass(makeTextInput221(lines));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'PROSE_RHYTHM_BLOCKING'),
        'Should NOT fire when line lengths alternate frequently around the mean',
      );
    });

    it('PROSE_LENGTH_RAMP fires when action lines grow steadily longer', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      const lines = Array.from({ length: 10 }, (_, i) => wline221(i + 2, i));
      const result = await rhythmPass(makeTextInput221(lines));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'PROSE_LENGTH_RAMP'),
        'Should fire when action-line length trends upward across the script',
      );
    });

    it('PROSE_LENGTH_RAMP does not fire when action lines shorten or hold steady', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      const lines = Array.from({ length: 10 }, (_, i) => wline221(11 - i, i));
      const result = await rhythmPass(makeTextInput221(lines));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'PROSE_LENGTH_RAMP'),
        'Should NOT fire when the prose tightens (lines get shorter) toward the end',
      );
    });

    it('INTRACLAUSE_CADENCE_ABSENT fires when long lines have no internal punctuation', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      // 10 lines of 11 words each, no commas/dashes
      const lines = Array.from({ length: 10 }, (_, i) => wline221(11, i));
      const result = await rhythmPass(makeTextInput221(lines));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'INTRACLAUSE_CADENCE_ABSENT'),
        'Should fire when long action lines never use internal punctuation',
      );
    });

    it('INTRACLAUSE_CADENCE_ABSENT does not fire when lines use commas for cadence', async () => {
      const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');
      const lines = Array.from({ length: 10 }, (_, i) => wlineComma221(11, i));
      const result = await rhythmPass(makeTextInput221(lines));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'INTRACLAUSE_CADENCE_ABSENT'),
        'Should NOT fire when action lines shape breath with internal punctuation',
      );
    });
  });


  describe('Wave 207 — rhythmPass: conjunction opener excess, then-chain, exclamation in action', async () => {
    const { rhythmPass } = await import('../../server/nvm/revision/passes/rhythm.ts');

    it('CONJUNCTION_OPENER_EXCESS fires when >30% of action lines open with a conjunction', async () => {
      const fountain207a = `
INT. ALLEY - NIGHT

But she reaches the corner first.
The guard swings around with his flashlight cutting hard arcs through the dark.
And she presses into the shadows, arms flat against the cold brick.
He calls out, then stops.
But the darkness holds her still and quiet.
She counts to ten in her head, each second stretched tight.
And she moves again toward the fire exit.
The wind clicks a loose chain against the fence somewhere above her.
Or she imagines it does and keeps moving anyway.
He rounds the corner and disappears into the other end of the alley.
`;
      const result207a = await rhythmPass({ fountain: fountain207a, original: fountain207a, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(
        result207a.issues.some(i => i.rule === 'CONJUNCTION_OPENER_EXCESS'),
        'Should fire CONJUNCTION_OPENER_EXCESS when 5/10 action lines begin with And/But/Or/So/Yet',
      );
    });

    it('CONJUNCTION_OPENER_EXCESS does NOT fire when conjunction openers are within tolerance', async () => {
      const fountain207b = `
INT. OFFICE - DAY

She sets the folder on the desk.
He leans back in his chair and looks at her.
But she stays standing near the door.
She slides the folder toward him with one finger.
He doesn't open it.
She watches him for a moment then looks away.
He finally reaches for the folder.
She folds her arms.
He opens it and reads the first page.
She waits.
`;
      const result207b = await rhythmPass({ fountain: fountain207b, original: fountain207b, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(
        !result207b.issues.some(i => i.rule === 'CONJUNCTION_OPENER_EXCESS'),
        'Should NOT fire when only 1/10 action lines begin with a conjunction (10%)',
      );
    });

    it('THEN_CHAIN fires when >25% of action lines begin with "Then" or "And then"', async () => {
      const fountain207c = `
INT. KITCHEN - MORNING

She opens the cabinet and takes out two cups.
He sets the kettle on the stove with a quiet click.
She fills the cups with water.
Then he turns and looks at her directly for the first time.
She puts down the cups and waits.
He crosses to the window and stays there.
Then she picks up her keys from the counter.
He doesn't move or speak.
She takes her coat from the hook.
Then she leaves without saying anything at all.
`;
      const result207c = await rhythmPass({ fountain: fountain207c, original: fountain207c, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(
        result207c.issues.some(i => i.rule === 'THEN_CHAIN'),
        'Should fire THEN_CHAIN when 3/10 action lines begin with "Then" (30%)',
      );
    });

    it('THEN_CHAIN does NOT fire when "Then" openers are within tolerance', async () => {
      const fountain207d = `
INT. LIBRARY - AFTERNOON

He pulls the book from the shelf.
She watches from the reading table.
He carries it to the table and sits down.
She slides a bookmark across to him without looking up.
He opens the book to the marked page and reads silently.
She goes back to her own notes.
Then he closes the book.
She glances up.
He sets the book aside.
She turns back to her work.
`;
      const result207d = await rhythmPass({ fountain: fountain207d, original: fountain207d, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(
        !result207d.issues.some(i => i.rule === 'THEN_CHAIN'),
        'Should NOT fire when only 1/10 action lines begin with "Then" (10%)',
      );
    });

    it('EXCLAMATION_IN_ACTION fires when 3 or more action lines end with "!"', async () => {
      const fountain207e = `
INT. STADIUM - DAY

He catches the pass!
She breaks through the line!
The crowd roars.
He dives for the end zone!
The referee throws the flag.
She raises both arms.
He slams the ball against the turf hard.
The score is tied with two seconds left on the clock.
`;
      const result207e = await rhythmPass({ fountain: fountain207e, original: fountain207e, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(
        result207e.issues.some(i => i.rule === 'EXCLAMATION_IN_ACTION'),
        'Should fire EXCLAMATION_IN_ACTION when 3 action lines end with "!"',
      );
    });

    it('EXCLAMATION_IN_ACTION does NOT fire when fewer than 3 action lines end with "!"', async () => {
      const fountain207f = `
INT. BOXING GYM - NIGHT

He wraps his hands slowly, knuckle by knuckle.
She stands across the ring and watches.
He steps through the ropes and settles into his stance.
She shakes her head.
He throws a left jab at the heavy bag!
The bag swings back and he catches it.
She picks up her gloves from the bench.
He pauses and looks at her.
`;
      const result207f = await rhythmPass({ fountain: fountain207f, original: fountain207f, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(
        !result207f.issues.some(i => i.rule === 'EXCLAMATION_IN_ACTION'),
        'Should NOT fire when only 1 action line ends with "!" (fewer than 3)',
      );
    });
  });


// ── Wave 137: Show-don't-tell — passive voice + emotion naming ─────────────────

describe('Wave 137 — rhythmPass: PASSIVE_VOICE_OVERUSE + WEAK_VERB_CHAIN', () => {

  it('PASSIVE_VOICE_OVERUSE fires when ≥3 action lines use passive constructions', async () => {
    const fountain = `INT. WAREHOUSE - NIGHT

The door was opened from inside.

The box was found near the window.

A gun was taken from the shelf.

DETECTIVE
What happened here?

The body was carried out by the officers.
`;
    const result = await rhythmPass(makePassInput(fountain));
    assert.ok(
      result.issues.some(i => i.rule === 'PASSIVE_VOICE_OVERUSE'),
      'PASSIVE_VOICE_OVERUSE should fire when ≥3 action lines use passive constructions',
    );
  });

  it('PASSIVE_VOICE_OVERUSE does NOT fire with fewer than 3 passive lines', async () => {
    const fountain = `INT. OFFICE - DAY

The folder was left on the desk.

Alice opens the window.

Bob hands her the documents.

ALICE
Let's begin.
`;
    const result = await rhythmPass(makePassInput(fountain));
    assert.ok(
      !result.issues.some(i => i.rule === 'PASSIVE_VOICE_OVERUSE'),
      'PASSIVE_VOICE_OVERUSE should not fire with fewer than 3 passive lines',
    );
  });

  it('WEAK_VERB_CHAIN fires when ≥2 action lines use "started to / began to"', async () => {
    const fountain = `INT. HALLWAY - NIGHT

Alice started to run toward the exit.

Bob began to speak but stopped himself.

The crowd started to disperse slowly.

A door creaks open at the end of the corridor.

CAROL
We need to move.
`;
    const result = await rhythmPass(makePassInput(fountain));
    assert.ok(
      result.issues.some(i => i.rule === 'WEAK_VERB_CHAIN'),
      'WEAK_VERB_CHAIN should fire when ≥2 action lines use auxiliary verb chains',
    );
  });

  it('active-voice screenplay passes both rules cleanly', async () => {
    const fountain = `INT. POLICE STATION - DAY

Alice slams the folder on the desk.

Bob crosses the room and grabs the phone.

The officer hands over the evidence bag.

ALICE
Tell me what you saw.

BOB
I saw everything.
`;
    const result = await rhythmPass(makePassInput(fountain));
    assert.ok(
      !result.issues.some(i => i.rule === 'PASSIVE_VOICE_OVERUSE' || i.rule === 'WEAK_VERB_CHAIN'),
      'active-voice screenplay should not trigger passive or weak-chain rules',
    );
  });
});