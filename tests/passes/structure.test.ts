// Extracted from the former monolithic test.ts (audit M2.1 — split for maintainability).
// structurePass revision-rule tests. Shared imports/helpers below are duplicated verbatim across every split
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


  // ── Wave 152: Structure pass enhancements ─────────────────────────────────
  describe('Wave 152 — structurePass: revelation drought, false climax, act symmetry', async () => {
    const baseStructure = {
      actPosition: 'act2a' as const, completionPercent: 50, totalClockPressure: 5,
      midpointPressure: 2, reversalCount: 1, tightestScene: 6, avgSuspensePerScene: 1.5,
      escalating: true, reversalDensity: 0.1, approachingClimax: false,
      openClues: 1, revelationCount: 1,
    };
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

    it('structurePass detects REVELATION_DROUGHT for 4 consecutive no-info scenes', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      const records = [
        makeRec(0, { seededClueIds: ['c1'] }),  // has info
        makeRec(1),  // drought start
        makeRec(2),
        makeRec(3),
        makeRec(4),  // drought = 4
        makeRec(5, { seededClueIds: ['c2'] }),  // back to info
        makeRec(6), makeRec(7), makeRec(8),
      ];
      const result = await structurePass({
        fountain: blankFountain(9), original: blankFountain(9),
        records: records as any, structure: baseStructure as any, annotations: [], approvedSpans: [],
      });
      const drought = result.issues.filter(i => i.rule === 'REVELATION_DROUGHT');
      assert.ok(drought.length >= 1, 'Should detect REVELATION_DROUGHT for 4 consecutive info-less scenes');
      assert.ok(drought[0].severity === 'major');
    });

    it('structurePass does NOT fire REVELATION_DROUGHT when scenes have ongoing info delivery', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      const records = Array.from({ length: 9 }, (_, i) =>
        makeRec(i, i % 2 === 0 ? { seededClueIds: [`c${i}`] } : {}),
      );
      const result = await structurePass({
        fountain: blankFountain(9), original: blankFountain(9),
        records: records as any, structure: baseStructure as any, annotations: [], approvedSpans: [],
      });
      const drought = result.issues.filter(i => i.rule === 'REVELATION_DROUGHT');
      assert.ok(drought.length === 0, 'Should NOT fire when clues are seeded every other scene');
    });

    it('structurePass detects FALSE_CLIMAX when peak suspense is mid-story', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      const records = [
        makeRec(0, { suspenseDelta: 1 }),
        makeRec(1, { suspenseDelta: 1 }),
        makeRec(2, { suspenseDelta: 4 }), // peak — mid-story (25% through 8-scene story)
        makeRec(3, { suspenseDelta: 1 }),
        makeRec(4, { suspenseDelta: 1 }),
        makeRec(5, { suspenseDelta: 1 }),
        makeRec(6, { suspenseDelta: 1.5 }),
        makeRec(7, { suspenseDelta: 2 }),
      ];
      const result = await structurePass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: baseStructure as any, annotations: [], approvedSpans: [],
      });
      const falseclimax = result.issues.filter(i => i.rule === 'FALSE_CLIMAX');
      assert.ok(falseclimax.length >= 1, 'Should detect FALSE_CLIMAX when peak suspense is before climax zone');
      assert.ok(falseclimax[0].severity === 'major');
    });

    it('structurePass detects SETUP_RESOLUTION_IMBALANCE when setup far outnumbers payoff', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // 8 setup/character scenes, only 1 resolution → 8:1 imbalance
      const records = [
        ...Array.from({ length: 8 }, (_, i) => makeRec(i, { purpose: i % 2 === 0 ? 'establish_world' : 'character_moment' })),
        makeRec(8, { purpose: 'resolution' }),
      ];
      const result = await structurePass({
        fountain: blankFountain(9), original: blankFountain(9),
        records: records as any,
        structure: { ...baseStructure, actPosition: 'act3' as const } as any,
        annotations: [], approvedSpans: [],
      });
      const imbalance = result.issues.filter(i => i.rule === 'SETUP_RESOLUTION_IMBALANCE');
      assert.ok(imbalance.length >= 1, 'Should detect SETUP_RESOLUTION_IMBALANCE for 8:1 setup-to-payoff ratio');
      assert.ok(imbalance[0].severity === 'minor');
    });
  });


  // ── Wave 165: Structure pass enhancements ─────────────────────────────────
  describe('Wave 165 — structurePass: protagonist passivity at climax, dark night absent, act2 dead zone', async () => {
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
      midpointPressure: 2, tightestScene: 7, reversalCount: 2,
    };

    // ── PROTAGONIST_PASSIVITY_CLIMAX ─────────────────────────────────────────
    it('structurePass detects PROTAGONIST_PASSIVITY_CLIMAX when climax peak has no engagement', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // 8 scenes; climaxZoneStart = floor(8*0.7) = 5
      // Scene 6 has highest suspense in zone (3) but is entirely passive
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, {
          suspenseDelta: i === 6 ? 3 : 1,
          emotionalShift: 'neutral',
          clockRaised: false,
          seededClueIds: [],
        }),
      );
      const result = await structurePass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: baseStructure as any,
        annotations: [], approvedSpans: [],
      });
      const passivity = result.issues.filter(i => i.rule === 'PROTAGONIST_PASSIVITY_CLIMAX');
      assert.ok(passivity.length >= 1, `Expected PROTAGONIST_PASSIVITY_CLIMAX; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(passivity[0].severity === 'critical');
    });

    it('structurePass does NOT fire PROTAGONIST_PASSIVITY_CLIMAX when climax peak has positive shift', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, {
          suspenseDelta: i === 6 ? 3 : 1,
          emotionalShift: i === 6 ? 'positive' : 'neutral',
          clockRaised: false,
          seededClueIds: [],
        }),
      );
      const result = await structurePass({
        fountain: blankFountain(8), original: blankFountain(8),
        records: records as any, structure: baseStructure as any,
        annotations: [], approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'PROTAGONIST_PASSIVITY_CLIMAX'),
        'Should NOT fire when climax peak has a positive emotional shift',
      );
    });

    // ── DARK_NIGHT_ABSENT ────────────────────────────────────────────────────
    it('structurePass detects DARK_NIGHT_ABSENT when pre-climax zone has no negative-shift scene', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // 10 scenes; dark night zone = floor(10*0.65)=6 to floor(10*0.85)=8
      // All scenes in zone are emotionally neutral
      const records = Array.from({ length: 10 }, (_, i) =>
        makeRec(i, { emotionalShift: 'neutral', suspenseDelta: i >= 8 ? 3 : 1.5 }),
      );
      const result = await structurePass({
        fountain: blankFountain(10), original: blankFountain(10),
        records: records as any, structure: baseStructure as any,
        annotations: [], approvedSpans: [],
      });
      const darkNight = result.issues.filter(i => i.rule === 'DARK_NIGHT_ABSENT');
      assert.ok(darkNight.length >= 1, `Expected DARK_NIGHT_ABSENT; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(darkNight[0].severity === 'major');
    });

    it('structurePass does NOT fire DARK_NIGHT_ABSENT when a low-point scene exists in pre-climax zone', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // 10 scenes; scene 7 is in dark night zone (65%-85% = scenes 6-8) and is negative
      const records = Array.from({ length: 10 }, (_, i) =>
        makeRec(i, {
          emotionalShift: i === 7 ? 'negative' : 'neutral',
          suspenseDelta: i === 7 ? 2 : 1.5,
        }),
      );
      const result = await structurePass({
        fountain: blankFountain(10), original: blankFountain(10),
        records: records as any, structure: baseStructure as any,
        annotations: [], approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'DARK_NIGHT_ABSENT'),
        'Should NOT fire when a negative-shift scene exists in the pre-climax zone',
      );
    });

    // ── ACT2_DEAD_ZONE ───────────────────────────────────────────────────────
    it('structurePass detects ACT2_DEAD_ZONE when mid-Act-2 suspense sags below flanking sections', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // 10 scenes; act2Start=2, midStart=4, midEnd=6, act2End=7
      // earlyAct2=[2,3] suspense=3; midAct2=[4,5] suspense=1; lateAct2=[6] suspense=3
      // mid (1) < early*0.7 (2.1) AND mid (1) < late*0.7 (2.1) → fires
      const records = Array.from({ length: 10 }, (_, i) => {
        let suspenseDelta = 1.5;
        if (i === 2 || i === 3) suspenseDelta = 3;  // early act2
        if (i === 4 || i === 5) suspenseDelta = 1;  // mid act2 dead zone
        if (i === 6) suspenseDelta = 3;              // late act2
        return makeRec(i, { suspenseDelta });
      });
      const result = await structurePass({
        fountain: blankFountain(10), original: blankFountain(10),
        records: records as any, structure: baseStructure as any,
        annotations: [], approvedSpans: [],
      });
      const deadZone = result.issues.filter(i => i.rule === 'ACT2_DEAD_ZONE');
      assert.ok(deadZone.length >= 1, `Expected ACT2_DEAD_ZONE; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(deadZone[0].severity === 'major');
    });

    it('structurePass does NOT fire ACT2_DEAD_ZONE when mid-Act-2 suspense matches flanking sections', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // All sections have similar suspense — no dead zone
      const records = Array.from({ length: 10 }, (_, i) =>
        makeRec(i, { suspenseDelta: 2 }),
      );
      const result = await structurePass({
        fountain: blankFountain(10), original: blankFountain(10),
        records: records as any, structure: baseStructure as any,
        annotations: [], approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'ACT2_DEAD_ZONE'),
        'Should NOT fire when mid-Act-2 suspense is comparable to flanking sections',
      );
    });
  });


  describe('Wave 179 — structurePass: escalation reversed, climax plateau, unresolved ending', async () => {
    const baseStructure = {
      actPosition: 'act2a' as const, completionPercent: 50, totalClockPressure: 5,
      midpointPressure: 2, reversalCount: 1, tightestScene: 6, avgSuspensePerScene: 1.5,
      escalating: true, reversalDensity: 0.1, approachingClimax: false,
      openClues: 1, revelationCount: 1,
    };
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
    const structInput = (records: any[], n: number) => ({
      fountain: blankFountain(n), original: blankFountain(n),
      records: records as any, structure: baseStructure as any, annotations: [], approvedSpans: [],
    });

    // ── ESCALATION_REVERSED ───────────────────────────────────────────────────
    it('structurePass detects ESCALATION_REVERSED when the final third loses energy', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // 6 scenes: first third (0,1) high suspense, last third (4,5) low
      const records = Array.from({ length: 6 }, (_, i) =>
        makeRec(i, { suspenseDelta: i <= 1 ? 3 : 1 }),
      );
      const result = await structurePass(structInput(records, 6));
      const esc = result.issues.filter(i => i.rule === 'ESCALATION_REVERSED');
      assert.ok(esc.length >= 1, `Should detect ESCALATION_REVERSED; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(esc[0].severity === 'major');
    });

    it('structurePass does NOT fire ESCALATION_REVERSED when the story builds toward the end', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      const records = Array.from({ length: 6 }, (_, i) =>
        makeRec(i, { suspenseDelta: i >= 4 ? 3 : 1 }),
      );
      const result = await structurePass(structInput(records, 6));
      assert.ok(
        !result.issues.some(i => i.rule === 'ESCALATION_REVERSED'),
        'Should NOT fire when suspense rises toward the final third',
      );
    });

    // ── CLIMAX_PLATEAU ────────────────────────────────────────────────────────
    it('structurePass detects CLIMAX_PLATEAU when no single scene peaks above the rest', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      const records = Array.from({ length: 8 }, (_, i) => makeRec(i, { suspenseDelta: 3 }));
      const result = await structurePass(structInput(records, 8));
      const plateau = result.issues.filter(i => i.rule === 'CLIMAX_PLATEAU');
      assert.ok(plateau.length >= 1, `Should detect CLIMAX_PLATEAU; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(plateau[0].severity === 'major');
    });

    it('structurePass does NOT fire CLIMAX_PLATEAU when one scene clearly peaks', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, { suspenseDelta: i === 6 ? 3 : 1 }),
      );
      const result = await structurePass(structInput(records, 8));
      assert.ok(
        !result.issues.some(i => i.rule === 'CLIMAX_PLATEAU'),
        'Should NOT fire when a single scene holds the peak',
      );
    });

    // ── UNRESOLVED_ENDING ─────────────────────────────────────────────────────
    it('structurePass detects UNRESOLVED_ENDING when the final scene is still escalating', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      const records = Array.from({ length: 6 }, (_, i) =>
        makeRec(i, { suspenseDelta: i === 5 ? 3 : 1 }),
      );
      const result = await structurePass(structInput(records, 6));
      const unresolved = result.issues.filter(i => i.rule === 'UNRESOLVED_ENDING');
      assert.ok(unresolved.length >= 1, `Should detect UNRESOLVED_ENDING; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(unresolved[0].severity === 'major');
    });

    it('structurePass does NOT fire UNRESOLVED_ENDING when the final scene resolves', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      const records = Array.from({ length: 6 }, (_, i) =>
        i === 5
          ? makeRec(i, { suspenseDelta: 3, purpose: 'resolution' })
          : makeRec(i, { suspenseDelta: 1 }),
      );
      const result = await structurePass(structInput(records, 6));
      assert.ok(
        !result.issues.some(i => i.rule === 'UNRESOLVED_ENDING'),
        'Should NOT fire when the final scene is a resolution beat',
      );
    });
  });


  describe('Wave 186 — structurePass: Act 2 inversion, midpoint reversal absent, late inciting incident', async () => {
    const baseStructure = {
      actPosition: 'act2a' as const, completionPercent: 50, totalClockPressure: 5,
      midpointPressure: 2, reversalCount: 1, tightestScene: 6, avgSuspensePerScene: 1.5,
      escalating: true, reversalDensity: 0.1, approachingClimax: false,
      openClues: 0, revelationCount: 1,
    };
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
    const structInput = (records: any[], n: number) => ({
      fountain: blankFountain(n), original: blankFountain(n),
      records: records as any, structure: baseStructure as any, annotations: [], approvedSpans: [],
    });

    // SECOND_ACT_INVERSION — fires
    it('SECOND_ACT_INVERSION fires when Act 2b suspense drops below Act 2a', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // n=12: act2a=[3,4,5] suspense=2.0; act2b=[6,7,8] suspense=0.5
      const records = Array.from({ length: 12 }, (_, i) => makeRec(i, {
        suspenseDelta: (i >= 3 && i < 6) ? 2.0 : (i >= 6 && i < 9) ? 0.5 : 1.0,
      }));
      const result = await structurePass(structInput(records, 12));
      assert.ok(
        result.issues.some(i => i.rule === 'SECOND_ACT_INVERSION'),
        `Expected SECOND_ACT_INVERSION, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // SECOND_ACT_INVERSION — no-fire
    it('SECOND_ACT_INVERSION does not fire when Act 2b maintains or increases suspense', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      const records = Array.from({ length: 12 }, (_, i) => makeRec(i, {
        suspenseDelta: (i >= 3 && i < 6) ? 2.0 : (i >= 6 && i < 9) ? 2.5 : 1.0,
      }));
      const result = await structurePass(structInput(records, 12));
      assert.ok(
        !result.issues.some(i => i.rule === 'SECOND_ACT_INVERSION'),
        `Expected no SECOND_ACT_INVERSION, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // MIDPOINT_REVERSAL_ABSENT — fires
    it('MIDPOINT_REVERSAL_ABSENT fires when midpoint zone has no reversal or revelation', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // n=10: midStart=4, midEnd=6; records 4,5 are default (suspense=1, no revelation)
      const records = Array.from({ length: 10 }, (_, i) => makeRec(i));
      const result = await structurePass(structInput(records, 10));
      assert.ok(
        result.issues.some(i => i.rule === 'MIDPOINT_REVERSAL_ABSENT'),
        `Expected MIDPOINT_REVERSAL_ABSENT, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // MIDPOINT_REVERSAL_ABSENT — no-fire
    it('MIDPOINT_REVERSAL_ABSENT does not fire when midpoint has a revelation', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      const records = Array.from({ length: 10 }, (_, i) => makeRec(i, {
        revelation: i === 5 ? 'The killer was here all along.' : null,
      }));
      const result = await structurePass(structInput(records, 10));
      assert.ok(
        !result.issues.some(i => i.rule === 'MIDPOINT_REVERSAL_ABSENT'),
        `Expected no MIDPOINT_REVERSAL_ABSENT, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // INCITING_INCIDENT_TOO_LATE — fires
    it('INCITING_INCIDENT_TOO_LATE fires when first dramatic event occurs after 40%', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // n=10: cutoff=4; first reversal at index 5 (50%) → 5 > 4 → fires
      const records = Array.from({ length: 10 }, (_, i) => makeRec(i, {
        suspenseDelta: i === 5 ? -2 : 1,
      }));
      const result = await structurePass(structInput(records, 10));
      assert.ok(
        result.issues.some(i => i.rule === 'INCITING_INCIDENT_TOO_LATE'),
        `Expected INCITING_INCIDENT_TOO_LATE, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });

    // INCITING_INCIDENT_TOO_LATE — no-fire
    it('INCITING_INCIDENT_TOO_LATE does not fire when first dramatic event is early', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // n=10: cutoff=4; first reversal at index 2 (20%) → 2 > 4 is false → no fire
      const records = Array.from({ length: 10 }, (_, i) => makeRec(i, {
        suspenseDelta: i === 2 ? -2 : 1,
      }));
      const result = await structurePass(structInput(records, 10));
      assert.ok(
        !result.issues.some(i => i.rule === 'INCITING_INCIDENT_TOO_LATE'),
        `Expected no INCITING_INCIDENT_TOO_LATE, got: ${result.issues.map(i => i.rule).join(', ')}`,
      );
    });
  });


  describe('Wave 905 — structurePass: structure turning point zone imbalance, structure complicate zone imbalance, structure introduce conflict zone imbalance', async () => {
    const runST905 = async (records: ScreenplaySceneRecord[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // Zone geometry n=10: Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}. Target at 0,1,2,8,9 →
    // Z0 3/5=60% (bloat), Z1 and Z2 empty → fires. Target at 0,3,5,8 → every zone touched →
    // no-fire. Filler is 'establish_world' (not one of the tested purpose values).
    it('STRUCTURE_TURNING_POINT_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of turning-point scenes', async () => {
      const recs905a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'turning_point' : 'establish_world' }),
      );
      const res = await runST905(recs905a);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_TURNING_POINT_ZONE_IMBALANCE'), 'STRUCTURE_TURNING_POINT_ZONE_IMBALANCE should fire');
    });

    it('STRUCTURE_TURNING_POINT_ZONE_IMBALANCE does not fire when turning-point scenes touch every zone', async () => {
      const recs905an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'turning_point' : 'establish_world' }),
      );
      const res = await runST905(recs905an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_TURNING_POINT_ZONE_IMBALANCE'), 'STRUCTURE_TURNING_POINT_ZONE_IMBALANCE should not fire');
    });

    it('STRUCTURE_COMPLICATE_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of complicating scenes', async () => {
      const recs905b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'complicate' : 'establish_world' }),
      );
      const res = await runST905(recs905b);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_COMPLICATE_ZONE_IMBALANCE'), 'STRUCTURE_COMPLICATE_ZONE_IMBALANCE should fire');
    });

    it('STRUCTURE_COMPLICATE_ZONE_IMBALANCE does not fire when complicating scenes touch every zone', async () => {
      const recs905bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'complicate' : 'establish_world' }),
      );
      const res = await runST905(recs905bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_COMPLICATE_ZONE_IMBALANCE'), 'STRUCTURE_COMPLICATE_ZONE_IMBALANCE should not fire');
    });

    it('STRUCTURE_INTRODUCE_CONFLICT_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of conflict-introducing scenes', async () => {
      const recs905c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'introduce_conflict' : 'establish_world' }),
      );
      const res = await runST905(recs905c);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_INTRODUCE_CONFLICT_ZONE_IMBALANCE'), 'STRUCTURE_INTRODUCE_CONFLICT_ZONE_IMBALANCE should fire');
    });

    it('STRUCTURE_INTRODUCE_CONFLICT_ZONE_IMBALANCE does not fire when conflict-introducing scenes touch every zone', async () => {
      const recs905cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'introduce_conflict' : 'establish_world' }),
      );
      const res = await runST905(recs905cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_INTRODUCE_CONFLICT_ZONE_IMBALANCE'), 'STRUCTURE_INTRODUCE_CONFLICT_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 891 — structurePass: structure climax zone imbalance, structure establish world zone imbalance, structure resolution zone imbalance', async () => {
    const runST891 = async (records: ScreenplaySceneRecord[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // STRUCTURE_CLIMAX_ZONE_IMBALANCE fire:
    // n=10, 4 zones (Z0={0,1,2}, Z1={3,4}, Z2={5,6,7}, Z3={8,9}); climax at 0,1,2,8,9 →
    // Z0 has 3/5=60% (bloat, >=50%), Z1 and Z2 are empty.
    it('STRUCTURE_CLIMAX_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of climax-purposed scenes', async () => {
      const recs891a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runST891(recs891a);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_CLIMAX_ZONE_IMBALANCE'), 'STRUCTURE_CLIMAX_ZONE_IMBALANCE should fire');
    });

    it('STRUCTURE_CLIMAX_ZONE_IMBALANCE does not fire when climax-purposed scenes touch every zone', async () => {
      const recs891an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runST891(recs891an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_CLIMAX_ZONE_IMBALANCE'), 'STRUCTURE_CLIMAX_ZONE_IMBALANCE should not fire');
    });

    // STRUCTURE_ESTABLISH_WORLD_ZONE_IMBALANCE fire: same zone geometry as above.
    it('STRUCTURE_ESTABLISH_WORLD_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of world-establishing scenes', async () => {
      const recs891b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runST891(recs891b);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_ESTABLISH_WORLD_ZONE_IMBALANCE'), 'STRUCTURE_ESTABLISH_WORLD_ZONE_IMBALANCE should fire');
    });

    it('STRUCTURE_ESTABLISH_WORLD_ZONE_IMBALANCE does not fire when world-establishing scenes touch every zone', async () => {
      const recs891bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runST891(recs891bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_ESTABLISH_WORLD_ZONE_IMBALANCE'), 'STRUCTURE_ESTABLISH_WORLD_ZONE_IMBALANCE should not fire');
    });

    // STRUCTURE_RESOLUTION_ZONE_IMBALANCE fire: same zone geometry as above.
    it('STRUCTURE_RESOLUTION_ZONE_IMBALANCE fires when one zone is empty while another holds >=50% of resolution-purposed scenes', async () => {
      const recs891c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2, 8, 9].includes(i) ? 'resolution' : 'complicate' }),
      );
      const res = await runST891(recs891c);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_RESOLUTION_ZONE_IMBALANCE'), 'STRUCTURE_RESOLUTION_ZONE_IMBALANCE should fire');
    });

    it('STRUCTURE_RESOLUTION_ZONE_IMBALANCE does not fire when resolution-purposed scenes touch every zone', async () => {
      const recs891cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 5, 8].includes(i) ? 'resolution' : 'complicate' }),
      );
      const res = await runST891(recs891cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_RESOLUTION_ZONE_IMBALANCE'), 'STRUCTURE_RESOLUTION_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 877 — structurePass: structure resolution drought run, structure complicate zone cluster, structure complicate drought run', async () => {
    const runST877 = async (records: ScreenplaySceneRecord[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // STRUCTURE_RESOLUTION_DROUGHT_RUN fire:
    // n=10; resolution at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('STRUCTURE_RESOLUTION_DROUGHT_RUN fires when a long run has no resolution-purposed scene', async () => {
      const recs877a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'resolution' : 'establish_world' }),
      );
      const res = await runST877(recs877a);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_RESOLUTION_DROUGHT_RUN'), 'STRUCTURE_RESOLUTION_DROUGHT_RUN should fire');
    });

    it('STRUCTURE_RESOLUTION_DROUGHT_RUN does not fire when resolution-purposed scenes are evenly spread', async () => {
      const recs877an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'resolution' : 'establish_world' }),
      );
      const res = await runST877(recs877an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_RESOLUTION_DROUGHT_RUN'), 'STRUCTURE_RESOLUTION_DROUGHT_RUN should not fire');
    });

    // STRUCTURE_COMPLICATE_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; complicate scenes at 0,1,2 → 100% opening third
    it('STRUCTURE_COMPLICATE_ZONE_CLUSTER fires when >75% of complicating scenes cluster in one third', async () => {
      const recs877b = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'complicate' : 'establish_world' }),
      );
      const res = await runST877(recs877b);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_COMPLICATE_ZONE_CLUSTER'), 'STRUCTURE_COMPLICATE_ZONE_CLUSTER should fire');
    });

    it('STRUCTURE_COMPLICATE_ZONE_CLUSTER does not fire when complicating scenes spread across thirds', async () => {
      const recs877bn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'complicate' : 'establish_world' }),
      );
      const res = await runST877(recs877bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_COMPLICATE_ZONE_CLUSTER'), 'STRUCTURE_COMPLICATE_ZONE_CLUSTER should not fire');
    });

    // STRUCTURE_COMPLICATE_DROUGHT_RUN fire:
    // n=10; complicate at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('STRUCTURE_COMPLICATE_DROUGHT_RUN fires when a long run has no complicating scene', async () => {
      const recs877c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'complicate' : 'establish_world' }),
      );
      const res = await runST877(recs877c);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_COMPLICATE_DROUGHT_RUN'), 'STRUCTURE_COMPLICATE_DROUGHT_RUN should fire');
    });

    it('STRUCTURE_COMPLICATE_DROUGHT_RUN does not fire when complicating scenes are evenly spread', async () => {
      const recs877cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'complicate' : 'establish_world' }),
      );
      const res = await runST877(recs877cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_COMPLICATE_DROUGHT_RUN'), 'STRUCTURE_COMPLICATE_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 863 — structurePass: structure climax drought run, structure establish world drought run, structure resolution zone cluster', async () => {
    const runST863 = async (records: ScreenplaySceneRecord[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // STRUCTURE_CLIMAX_DROUGHT_RUN fire:
    // n=10; climax at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('STRUCTURE_CLIMAX_DROUGHT_RUN fires when a long run has no climax-purposed scene', async () => {
      const recs863a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runST863(recs863a);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_CLIMAX_DROUGHT_RUN'), 'STRUCTURE_CLIMAX_DROUGHT_RUN should fire');
    });

    it('STRUCTURE_CLIMAX_DROUGHT_RUN does not fire when climax-purposed scenes are evenly spread', async () => {
      const recs863an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runST863(recs863an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_CLIMAX_DROUGHT_RUN'), 'STRUCTURE_CLIMAX_DROUGHT_RUN should not fire');
    });

    // STRUCTURE_ESTABLISH_WORLD_DROUGHT_RUN fire:
    // n=10; establish_world at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('STRUCTURE_ESTABLISH_WORLD_DROUGHT_RUN fires when a long run has no world-establishing scene', async () => {
      const recs863b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runST863(recs863b);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_ESTABLISH_WORLD_DROUGHT_RUN'), 'STRUCTURE_ESTABLISH_WORLD_DROUGHT_RUN should fire');
    });

    it('STRUCTURE_ESTABLISH_WORLD_DROUGHT_RUN does not fire when world-establishing scenes are evenly spread', async () => {
      const recs863bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runST863(recs863bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_ESTABLISH_WORLD_DROUGHT_RUN'), 'STRUCTURE_ESTABLISH_WORLD_DROUGHT_RUN should not fire');
    });

    // STRUCTURE_RESOLUTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; resolution scenes at 0,1,2 → 100% opening third
    it('STRUCTURE_RESOLUTION_ZONE_CLUSTER fires when >75% of resolution-purposed scenes cluster in one third', async () => {
      const recs863c = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'resolution' : 'complicate' }),
      );
      const res = await runST863(recs863c);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_RESOLUTION_ZONE_CLUSTER'), 'STRUCTURE_RESOLUTION_ZONE_CLUSTER should fire');
    });

    it('STRUCTURE_RESOLUTION_ZONE_CLUSTER does not fire when resolution-purposed scenes spread across thirds', async () => {
      const recs863cn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'resolution' : 'complicate' }),
      );
      const res = await runST863(recs863cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_RESOLUTION_ZONE_CLUSTER'), 'STRUCTURE_RESOLUTION_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 849 — structurePass: structure positive emotion drought run, structure establish world zone cluster, structure climax zone cluster', async () => {
    const runST849 = async (records: ScreenplaySceneRecord[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // STRUCTURE_POSITIVE_EMOTION_DROUGHT_RUN fire:
    // n=10; positive-emotion at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('STRUCTURE_POSITIVE_EMOTION_DROUGHT_RUN fires when a long run has no positive-emotion charge', async () => {
      const recs849a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runST849(recs849a);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_POSITIVE_EMOTION_DROUGHT_RUN'), 'STRUCTURE_POSITIVE_EMOTION_DROUGHT_RUN should fire');
    });

    it('STRUCTURE_POSITIVE_EMOTION_DROUGHT_RUN does not fire when positive-emotion scenes are evenly spread', async () => {
      const recs849an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 3, 6, 9].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runST849(recs849an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_POSITIVE_EMOTION_DROUGHT_RUN'), 'STRUCTURE_POSITIVE_EMOTION_DROUGHT_RUN should not fire');
    });

    // STRUCTURE_ESTABLISH_WORLD_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; establish_world scenes at 0,1,2 → 100% opening third
    it('STRUCTURE_ESTABLISH_WORLD_ZONE_CLUSTER fires when >75% of world-establishing scenes cluster in one third', async () => {
      const recs849b = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runST849(recs849b);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_ESTABLISH_WORLD_ZONE_CLUSTER'), 'STRUCTURE_ESTABLISH_WORLD_ZONE_CLUSTER should fire');
    });

    it('STRUCTURE_ESTABLISH_WORLD_ZONE_CLUSTER does not fire when world-establishing scenes spread across thirds', async () => {
      const recs849bn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'establish_world' : 'complicate' }),
      );
      const res = await runST849(recs849bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_ESTABLISH_WORLD_ZONE_CLUSTER'), 'STRUCTURE_ESTABLISH_WORLD_ZONE_CLUSTER should not fire');
    });

    // STRUCTURE_CLIMAX_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; climax scenes at 0,1,2 → 100% opening third
    it('STRUCTURE_CLIMAX_ZONE_CLUSTER fires when >75% of climax-purposed scenes cluster in one third', async () => {
      const recs849c = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runST849(recs849c);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_CLIMAX_ZONE_CLUSTER'), 'STRUCTURE_CLIMAX_ZONE_CLUSTER should fire');
    });

    it('STRUCTURE_CLIMAX_ZONE_CLUSTER does not fire when climax-purposed scenes spread across thirds', async () => {
      const recs849cn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'climax' : 'complicate' }),
      );
      const res = await runST849(recs849cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_CLIMAX_ZONE_CLUSTER'), 'STRUCTURE_CLIMAX_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 835 — structurePass: structure introduce conflict zone cluster, structure introduce conflict drought run, structure positive emotion zone cluster', async () => {
    const runST835 = async (records: ScreenplaySceneRecord[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // STRUCTURE_INTRODUCE_CONFLICT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; introduce_conflict scenes at 0,1,2 → 100% opening third
    it('STRUCTURE_INTRODUCE_CONFLICT_ZONE_CLUSTER fires when >75% of conflict-introducing scenes cluster in one third', async () => {
      const recs835a = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'introduce_conflict' : 'complicate' }),
      );
      const res = await runST835(recs835a);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_INTRODUCE_CONFLICT_ZONE_CLUSTER'), 'STRUCTURE_INTRODUCE_CONFLICT_ZONE_CLUSTER should fire');
    });

    it('STRUCTURE_INTRODUCE_CONFLICT_ZONE_CLUSTER does not fire when conflict-introducing scenes spread across thirds', async () => {
      const recs835an = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'introduce_conflict' : 'complicate' }),
      );
      const res = await runST835(recs835an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_INTRODUCE_CONFLICT_ZONE_CLUSTER'), 'STRUCTURE_INTRODUCE_CONFLICT_ZONE_CLUSTER should not fire');
    });

    // STRUCTURE_INTRODUCE_CONFLICT_DROUGHT_RUN fire:
    // n=10; introduce_conflict at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('STRUCTURE_INTRODUCE_CONFLICT_DROUGHT_RUN fires when a long run has no new conflict', async () => {
      const recs835b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'introduce_conflict' : 'complicate' }),
      );
      const res = await runST835(recs835b);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_INTRODUCE_CONFLICT_DROUGHT_RUN'), 'STRUCTURE_INTRODUCE_CONFLICT_DROUGHT_RUN should fire');
    });

    it('STRUCTURE_INTRODUCE_CONFLICT_DROUGHT_RUN does not fire when conflict-introducing scenes are evenly spread', async () => {
      const recs835bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'introduce_conflict' : 'complicate' }),
      );
      const res = await runST835(recs835bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_INTRODUCE_CONFLICT_DROUGHT_RUN'), 'STRUCTURE_INTRODUCE_CONFLICT_DROUGHT_RUN should not fire');
    });

    // STRUCTURE_POSITIVE_EMOTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; positive-emotion scenes at 0,1,2 → 100% opening third
    it('STRUCTURE_POSITIVE_EMOTION_ZONE_CLUSTER fires when >75% of positive-emotion scenes cluster in one third', async () => {
      const recs835c = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runST835(recs835c);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_POSITIVE_EMOTION_ZONE_CLUSTER'), 'STRUCTURE_POSITIVE_EMOTION_ZONE_CLUSTER should fire');
    });

    it('STRUCTURE_POSITIVE_EMOTION_ZONE_CLUSTER does not fire when positive-emotion scenes spread across thirds', async () => {
      const recs835cn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 4, 8].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runST835(recs835cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_POSITIVE_EMOTION_ZONE_CLUSTER'), 'STRUCTURE_POSITIVE_EMOTION_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 821 — structurePass: structure character moment drought run, structure turning point zone cluster, structure turning point drought run', async () => {
    const runST821 = async (records: ScreenplaySceneRecord[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // STRUCTURE_CHARACTER_MOMENT_DROUGHT_RUN fire:
    // n=10; character_moment at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('STRUCTURE_CHARACTER_MOMENT_DROUGHT_RUN fires when a long run has no character moment', async () => {
      const recs821a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'character_moment' : 'complicate' }),
      );
      const res = await runST821(recs821a);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_CHARACTER_MOMENT_DROUGHT_RUN'), 'STRUCTURE_CHARACTER_MOMENT_DROUGHT_RUN should fire');
    });

    it('STRUCTURE_CHARACTER_MOMENT_DROUGHT_RUN does not fire when character moments are evenly spread', async () => {
      const recs821an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'character_moment' : 'complicate' }),
      );
      const res = await runST821(recs821an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_CHARACTER_MOMENT_DROUGHT_RUN'), 'STRUCTURE_CHARACTER_MOMENT_DROUGHT_RUN should not fire');
    });

    // STRUCTURE_TURNING_POINT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; turning_point scenes at 0,1,2 → 100% opening third
    it('STRUCTURE_TURNING_POINT_ZONE_CLUSTER fires when >75% of turning-point scenes cluster in one third', async () => {
      const recs821b = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'turning_point' : 'complicate' }),
      );
      const res = await runST821(recs821b);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_TURNING_POINT_ZONE_CLUSTER'), 'STRUCTURE_TURNING_POINT_ZONE_CLUSTER should fire');
    });

    it('STRUCTURE_TURNING_POINT_ZONE_CLUSTER does not fire when turning-point scenes spread across thirds', async () => {
      const recs821bn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'turning_point' : 'complicate' }),
      );
      const res = await runST821(recs821bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_TURNING_POINT_ZONE_CLUSTER'), 'STRUCTURE_TURNING_POINT_ZONE_CLUSTER should not fire');
    });

    // STRUCTURE_TURNING_POINT_DROUGHT_RUN fire:
    // n=10; turning_point at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('STRUCTURE_TURNING_POINT_DROUGHT_RUN fires when a long run has no turning point', async () => {
      const recs821c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'turning_point' : 'complicate' }),
      );
      const res = await runST821(recs821c);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_TURNING_POINT_DROUGHT_RUN'), 'STRUCTURE_TURNING_POINT_DROUGHT_RUN should fire');
    });

    it('STRUCTURE_TURNING_POINT_DROUGHT_RUN does not fire when turning points are evenly spread', async () => {
      const recs821cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 3, 6, 9].includes(i) ? 'turning_point' : 'complicate' }),
      );
      const res = await runST821(recs821cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_TURNING_POINT_DROUGHT_RUN'), 'STRUCTURE_TURNING_POINT_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 807 — structurePass: structure negative emotion drought run, structure revelation peak uncaused, structure character moment zone cluster', async () => {
    const runST807 = async (records: ScreenplaySceneRecord[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // STRUCTURE_NEGATIVE_EMOTION_DROUGHT_RUN fire:
    // n=10; negative-emotion at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('STRUCTURE_NEGATIVE_EMOTION_DROUGHT_RUN fires when a long run has no negative-emotion charge', async () => {
      const recs807a = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runST807(recs807a);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_NEGATIVE_EMOTION_DROUGHT_RUN'), 'STRUCTURE_NEGATIVE_EMOTION_DROUGHT_RUN should fire');
    });

    it('STRUCTURE_NEGATIVE_EMOTION_DROUGHT_RUN does not fire when negative-emotion scenes are evenly spread', async () => {
      const recs807an = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 3, 6, 9].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runST807(recs807an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_NEGATIVE_EMOTION_DROUGHT_RUN'), 'STRUCTURE_NEGATIVE_EMOTION_DROUGHT_RUN should not fire');
    });

    // STRUCTURE_REVELATION_PEAK_UNCAUSED fire:
    // 8 scenes; revelation-qualifying (magnitude 1) at 2 and 5; peak resolves to the first (idx 2);
    // no dramaticTurn at 0, 1, or 2 itself (2-scene lookback + the peak scene itself).
    it('STRUCTURE_REVELATION_PEAK_UNCAUSED fires when the revelation scene has no dramatic turn nearby', async () => {
      const recs807b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs807b[2] = makeSharedRecord(2, { revelation: 'truth revealed' });
      recs807b[5] = makeSharedRecord(5, { revelation: 'truth revealed' });
      const res = await runST807(recs807b);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_REVELATION_PEAK_UNCAUSED'), 'STRUCTURE_REVELATION_PEAK_UNCAUSED should fire');
    });

    it('STRUCTURE_REVELATION_PEAK_UNCAUSED does not fire when a dramatic turn precedes the revelation scene', async () => {
      const recs807bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs807bn[2] = makeSharedRecord(2, { revelation: 'truth revealed' });
      recs807bn[5] = makeSharedRecord(5, { revelation: 'truth revealed' });
      recs807bn[1] = makeSharedRecord(1, { dramaticTurn: 'reversal' });
      const res = await runST807(recs807bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_REVELATION_PEAK_UNCAUSED'), 'STRUCTURE_REVELATION_PEAK_UNCAUSED should not fire');
    });

    // STRUCTURE_CHARACTER_MOMENT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; character_moment scenes at 0,1,2 → 100% opening third
    it('STRUCTURE_CHARACTER_MOMENT_ZONE_CLUSTER fires when >75% of character-moment scenes cluster in one third', async () => {
      const recs807c = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 1, 2].includes(i) ? 'character_moment' : 'complicate' }),
      );
      const res = await runST807(recs807c);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_CHARACTER_MOMENT_ZONE_CLUSTER'), 'STRUCTURE_CHARACTER_MOMENT_ZONE_CLUSTER should fire');
    });

    it('STRUCTURE_CHARACTER_MOMENT_ZONE_CLUSTER does not fire when character-moment scenes spread across thirds', async () => {
      const recs807cn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { purpose: [0, 4, 8].includes(i) ? 'character_moment' : 'complicate' }),
      );
      const res = await runST807(recs807cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_CHARACTER_MOMENT_ZONE_CLUSTER'), 'STRUCTURE_CHARACTER_MOMENT_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 793 — structurePass: structure negative emotion zone cluster, structure revelation zone cluster, structure revelation drought run', async () => {
    const runST793 = async (records: ScreenplaySceneRecord[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // STRUCTURE_NEGATIVE_EMOTION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; negative-emotion scenes at 0,1,2 → 100% opening third
    it('STRUCTURE_NEGATIVE_EMOTION_ZONE_CLUSTER fires when >75% of negative-emotion scenes cluster in one third', async () => {
      const recs793a = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 1, 2].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runST793(recs793a);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_NEGATIVE_EMOTION_ZONE_CLUSTER'), 'STRUCTURE_NEGATIVE_EMOTION_ZONE_CLUSTER should fire');
    });

    it('STRUCTURE_NEGATIVE_EMOTION_ZONE_CLUSTER does not fire when negative-emotion scenes spread across thirds', async () => {
      const recs793an = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { emotionalShift: [0, 4, 8].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runST793(recs793an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_NEGATIVE_EMOTION_ZONE_CLUSTER'), 'STRUCTURE_NEGATIVE_EMOTION_ZONE_CLUSTER should not fire');
    });

    // STRUCTURE_REVELATION_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; revelation scenes at 0,1,2 → 100% opening third
    it('STRUCTURE_REVELATION_ZONE_CLUSTER fires when >75% of revelation scenes cluster in one third', async () => {
      const recs793b = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { revelation: [0, 1, 2].includes(i) ? 'truth revealed' : null }),
      );
      const res = await runST793(recs793b);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_REVELATION_ZONE_CLUSTER'), 'STRUCTURE_REVELATION_ZONE_CLUSTER should fire');
    });

    it('STRUCTURE_REVELATION_ZONE_CLUSTER does not fire when revelation scenes spread across thirds', async () => {
      const recs793bn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { revelation: [0, 4, 8].includes(i) ? 'truth revealed' : null }),
      );
      const res = await runST793(recs793bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_REVELATION_ZONE_CLUSTER'), 'STRUCTURE_REVELATION_ZONE_CLUSTER should not fire');
    });

    // STRUCTURE_REVELATION_DROUGHT_RUN fire:
    // n=10; revelation present at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('STRUCTURE_REVELATION_DROUGHT_RUN fires when a long run has no revelation', async () => {
      const recs793c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { revelation: [0, 1, 2].includes(i) ? 'truth revealed' : null }),
      );
      const res = await runST793(recs793c);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_REVELATION_DROUGHT_RUN'), 'STRUCTURE_REVELATION_DROUGHT_RUN should fire');
    });

    it('STRUCTURE_REVELATION_DROUGHT_RUN does not fire when revelations are evenly spread', async () => {
      const recs793cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { revelation: [0, 3, 6, 9].includes(i) ? 'truth revealed' : null }),
      );
      const res = await runST793(recs793cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_REVELATION_DROUGHT_RUN'), 'STRUCTURE_REVELATION_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 779 — structurePass: structure turn zone cluster, structure suspense drought run, structure curiosity drought run', async () => {
    const runST779 = async (records: ScreenplaySceneRecord[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // STRUCTURE_TURN_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; turn scenes at 0,1,2 → 100% opening third
    it('STRUCTURE_TURN_ZONE_CLUSTER fires when >75% of turn scenes cluster in one third', async () => {
      const recs779a = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { dramaticTurn: [0, 1, 2].includes(i) ? 'reversal' : 'nothing' }),
      );
      const res = await runST779(recs779a);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_TURN_ZONE_CLUSTER'), 'STRUCTURE_TURN_ZONE_CLUSTER should fire');
    });

    it('STRUCTURE_TURN_ZONE_CLUSTER does not fire when turn scenes spread across thirds', async () => {
      const recs779an = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { dramaticTurn: [0, 4, 8].includes(i) ? 'reversal' : 'nothing' }),
      );
      const res = await runST779(recs779an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_TURN_ZONE_CLUSTER'), 'STRUCTURE_TURN_ZONE_CLUSTER should not fire');
    });

    // STRUCTURE_SUSPENSE_DROUGHT_RUN fire:
    // n=10; suspenseDelta>0 at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('STRUCTURE_SUSPENSE_DROUGHT_RUN fires when a long run has no rising suspense', async () => {
      const recs779b = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { suspenseDelta: [0, 1, 2].includes(i) ? 2 : 0 }),
      );
      const res = await runST779(recs779b);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_SUSPENSE_DROUGHT_RUN'), 'STRUCTURE_SUSPENSE_DROUGHT_RUN should fire');
    });

    it('STRUCTURE_SUSPENSE_DROUGHT_RUN does not fire when suspense rises are evenly spread', async () => {
      const recs779bn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { suspenseDelta: [0, 3, 6, 9].includes(i) ? 2 : 0 }),
      );
      const res = await runST779(recs779bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_SUSPENSE_DROUGHT_RUN'), 'STRUCTURE_SUSPENSE_DROUGHT_RUN should not fire');
    });

    // STRUCTURE_CURIOSITY_DROUGHT_RUN fire:
    // n=10; curiosityDelta>0 at 0,1,2 only, then a run of 7 consecutive scenes (3-9) with none.
    it('STRUCTURE_CURIOSITY_DROUGHT_RUN fires when a long run has no rising curiosity', async () => {
      const recs779c = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 1, 2].includes(i) ? 2 : 0 }),
      );
      const res = await runST779(recs779c);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_CURIOSITY_DROUGHT_RUN'), 'STRUCTURE_CURIOSITY_DROUGHT_RUN should fire');
    });

    it('STRUCTURE_CURIOSITY_DROUGHT_RUN does not fire when curiosity rises are evenly spread', async () => {
      const recs779cn = Array.from({ length: 10 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 3, 6, 9].includes(i) ? 2 : 0 }),
      );
      const res = await runST779(recs779cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_CURIOSITY_DROUGHT_RUN'), 'STRUCTURE_CURIOSITY_DROUGHT_RUN should not fire');
    });
  });


  describe('Wave 765 — structurePass: structure suspense zone cluster, structure curiosity zone cluster, structure curiosity peak uncaused', async () => {
    const runST765 = async (records: ScreenplaySceneRecord[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // STRUCTURE_SUSPENSE_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; suspenseDelta>0 scenes at 0,1,2 → 100% opening third
    it('STRUCTURE_SUSPENSE_ZONE_CLUSTER fires when >75% of suspense-positive scenes cluster in one third', async () => {
      const recs765a = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { suspenseDelta: [0, 1, 2].includes(i) ? 2 : 0 }),
      );
      const res = await runST765(recs765a);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_SUSPENSE_ZONE_CLUSTER'), 'STRUCTURE_SUSPENSE_ZONE_CLUSTER should fire');
    });

    it('STRUCTURE_SUSPENSE_ZONE_CLUSTER does not fire when suspense-positive scenes spread across thirds', async () => {
      const recs765an = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { suspenseDelta: [0, 4, 8].includes(i) ? 2 : 0 }),
      );
      const res = await runST765(recs765an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_SUSPENSE_ZONE_CLUSTER'), 'STRUCTURE_SUSPENSE_ZONE_CLUSTER should not fire');
    });

    // STRUCTURE_CURIOSITY_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; curiosityDelta>0 scenes at 0,1,2 → 100% opening third
    it('STRUCTURE_CURIOSITY_ZONE_CLUSTER fires when >75% of curiosity-positive scenes cluster in one third', async () => {
      const recs765b = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 1, 2].includes(i) ? 2 : 0 }),
      );
      const res = await runST765(recs765b);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_CURIOSITY_ZONE_CLUSTER'), 'STRUCTURE_CURIOSITY_ZONE_CLUSTER should fire');
    });

    it('STRUCTURE_CURIOSITY_ZONE_CLUSTER does not fire when curiosity-positive scenes spread across thirds', async () => {
      const recs765bn = Array.from({ length: 9 }, (_, i) =>
        makeSharedRecord(i, { curiosityDelta: [0, 4, 8].includes(i) ? 2 : 0 }),
      );
      const res = await runST765(recs765bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_CURIOSITY_ZONE_CLUSTER'), 'STRUCTURE_CURIOSITY_ZONE_CLUSTER should not fire');
    });

    // STRUCTURE_CURIOSITY_PEAK_UNCAUSED fire:
    // 8 scenes; curiosityDelta qualifying (>0) at 2 and 5; peak resolves to the first (idx 2, tie
    // on magnitude 3); no dramaticTurn/revelation/clockRaised at indices 0 or 1 (2-scene lookback).
    it('STRUCTURE_CURIOSITY_PEAK_UNCAUSED fires when the peak curiosity scene has no preparing cause nearby', async () => {
      const recs765c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs765c[2] = makeSharedRecord(2, { curiosityDelta: 3 });
      recs765c[5] = makeSharedRecord(5, { curiosityDelta: 3 });
      const res = await runST765(recs765c);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_CURIOSITY_PEAK_UNCAUSED'), 'STRUCTURE_CURIOSITY_PEAK_UNCAUSED should fire');
    });

    it('STRUCTURE_CURIOSITY_PEAK_UNCAUSED does not fire when a preparing cause precedes the peak curiosity scene', async () => {
      const recs765cn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs765cn[2] = makeSharedRecord(2, { curiosityDelta: 3 });
      recs765cn[5] = makeSharedRecord(5, { curiosityDelta: 3 });
      recs765cn[1] = makeSharedRecord(1, { dramaticTurn: 'reversal' });
      const res = await runST765(recs765cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_CURIOSITY_PEAK_UNCAUSED'), 'STRUCTURE_CURIOSITY_PEAK_UNCAUSED should not fire');
    });
  });


  describe('Wave 751 — structurePass: structure clock delta zone cluster, structure turn drought run, structure stakes drought run', async () => {
    const runST751 = async (records: ScreenplaySceneRecord[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // STRUCTURE_CLOCK_DELTA_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; clock-shifting scenes at 0,1,2 → 100% opening third
    it('STRUCTURE_CLOCK_DELTA_ZONE_CLUSTER fires when >75% of clock-shifting scenes cluster in one third', async () => {
      const recs751a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs751a[0] = makeSharedRecord(0, { clockDelta: 1 });
      recs751a[1] = makeSharedRecord(1, { clockDelta: -1 });
      recs751a[2] = makeSharedRecord(2, { clockDelta: 1 });
      const res = await runST751(recs751a);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_CLOCK_DELTA_ZONE_CLUSTER'), 'STRUCTURE_CLOCK_DELTA_ZONE_CLUSTER should fire');
    });

    // STRUCTURE_CLOCK_DELTA_ZONE_CLUSTER no-fire:
    // clock-shifting scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('STRUCTURE_CLOCK_DELTA_ZONE_CLUSTER does not fire when clock movement is distributed across thirds', async () => {
      const recs751an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs751an[0] = makeSharedRecord(0, { clockDelta: 1 });
      recs751an[4] = makeSharedRecord(4, { clockDelta: -1 });
      recs751an[7] = makeSharedRecord(7, { clockDelta: 1 });
      const res = await runST751(recs751an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_CLOCK_DELTA_ZONE_CLUSTER'), 'STRUCTURE_CLOCK_DELTA_ZONE_CLUSTER should not fire');
    });

    // STRUCTURE_TURN_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 carry a dramatic turn (>=3 present overall); scenes 3-9 (7 scenes) have none
    it('STRUCTURE_TURN_DROUGHT_RUN fires when the longest no-dramatic-turn run reaches 6', async () => {
      const recs751b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs751b[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs751b[1] = makeSharedRecord(1, { dramaticTurn: 'reversal' });
      recs751b[2] = makeSharedRecord(2, { dramaticTurn: 'reversal' });
      const res = await runST751(recs751b);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_TURN_DROUGHT_RUN'), 'STRUCTURE_TURN_DROUGHT_RUN should fire');
    });

    // STRUCTURE_TURN_DROUGHT_RUN no-fire:
    // dramatic-turn scenes spread out so no gap reaches 6 consecutive scenes
    it('STRUCTURE_TURN_DROUGHT_RUN does not fire when dramatic turns are spread through the story', async () => {
      const recs751bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs751bn[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs751bn[3] = makeSharedRecord(3, { dramaticTurn: 'reversal' });
      recs751bn[6] = makeSharedRecord(6, { dramaticTurn: 'reversal' });
      recs751bn[9] = makeSharedRecord(9, { dramaticTurn: 'reversal' });
      const res = await runST751(recs751bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_TURN_DROUGHT_RUN'), 'STRUCTURE_TURN_DROUGHT_RUN should not fire');
    });

    // STRUCTURE_STAKES_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 purposed to raise stakes (>=3 present overall); scenes 3-9 (7 scenes) purposed otherwise
    it('STRUCTURE_STAKES_DROUGHT_RUN fires when the longest no-stakes-raise run reaches 6', async () => {
      const recs751c = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs751c[0] = makeSharedRecord(0, { purpose: 'raise_stakes' });
      recs751c[1] = makeSharedRecord(1, { purpose: 'raise_stakes' });
      recs751c[2] = makeSharedRecord(2, { purpose: 'raise_stakes' });
      const res = await runST751(recs751c);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_STAKES_DROUGHT_RUN'), 'STRUCTURE_STAKES_DROUGHT_RUN should fire');
    });

    // STRUCTURE_STAKES_DROUGHT_RUN no-fire:
    // stakes-raising scenes spread out so no gap reaches 6 consecutive scenes
    it('STRUCTURE_STAKES_DROUGHT_RUN does not fire when stakes-raising scenes are spread through the story', async () => {
      const recs751cn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs751cn[0] = makeSharedRecord(0, { purpose: 'raise_stakes' });
      recs751cn[3] = makeSharedRecord(3, { purpose: 'raise_stakes' });
      recs751cn[6] = makeSharedRecord(6, { purpose: 'raise_stakes' });
      recs751cn[9] = makeSharedRecord(9, { purpose: 'raise_stakes' });
      const res = await runST751(recs751cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_STAKES_DROUGHT_RUN'), 'STRUCTURE_STAKES_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 737 — structurePass: structure payoff drought run, structure relationship peak uncaused, structure clock delta drought run', async () => {
    const runST737 = async (records: ScreenplaySceneRecord[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // STRUCTURE_PAYOFF_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 carry a payoff (>=3 present overall); scenes 3-9 (7 scenes) have none
    it('STRUCTURE_PAYOFF_DROUGHT_RUN fires when the longest no-payoff run reaches 6', async () => {
      const recs737a = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs737a[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs737a[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs737a[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-c'] });
      const res = await runST737(recs737a);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_PAYOFF_DROUGHT_RUN'), 'STRUCTURE_PAYOFF_DROUGHT_RUN should fire');
    });

    // STRUCTURE_PAYOFF_DROUGHT_RUN no-fire:
    // payoff scenes spread out so no gap reaches 6 consecutive scenes
    it('STRUCTURE_PAYOFF_DROUGHT_RUN does not fire when payoffs are spread through the story', async () => {
      const recs737an = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs737an[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs737an[3] = makeSharedRecord(3, { payoffSetupIds: ['thread-b'] });
      recs737an[6] = makeSharedRecord(6, { payoffSetupIds: ['thread-c'] });
      recs737an[9] = makeSharedRecord(9, { payoffSetupIds: ['thread-d'] });
      const res = await runST737(recs737an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_PAYOFF_DROUGHT_RUN'), 'STRUCTURE_PAYOFF_DROUGHT_RUN should not fire');
    });

    // STRUCTURE_RELATIONSHIP_PEAK_UNCAUSED fire:
    // 8 scenes; relationship shifts at 2 (1 shift) and 6 (5 shifts, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('STRUCTURE_RELATIONSHIP_PEAK_UNCAUSED fires when the peak relationship-shift scene has no dramatic turn or revelation nearby', async () => {
      const recs737b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs737b[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      recs737b[6] = makeSharedRecord(6, {
        relationshipShifts: [
          { pairKey: 'a|b', dimension: 'trust', amount: 1 },
          { pairKey: 'a|c', dimension: 'trust', amount: 1 },
          { pairKey: 'a|d', dimension: 'trust', amount: 1 },
          { pairKey: 'a|e', dimension: 'trust', amount: 1 },
          { pairKey: 'a|f', dimension: 'trust', amount: 1 },
        ],
      });
      const res = await runST737(recs737b);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_RELATIONSHIP_PEAK_UNCAUSED'), 'STRUCTURE_RELATIONSHIP_PEAK_UNCAUSED should fire');
    });

    // STRUCTURE_RELATIONSHIP_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('STRUCTURE_RELATIONSHIP_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs737bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs737bn[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      recs737bn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs737bn[6] = makeSharedRecord(6, {
        relationshipShifts: [
          { pairKey: 'a|b', dimension: 'trust', amount: 1 },
          { pairKey: 'a|c', dimension: 'trust', amount: 1 },
          { pairKey: 'a|d', dimension: 'trust', amount: 1 },
          { pairKey: 'a|e', dimension: 'trust', amount: 1 },
          { pairKey: 'a|f', dimension: 'trust', amount: 1 },
        ],
      });
      const res = await runST737(recs737bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_RELATIONSHIP_PEAK_UNCAUSED'), 'STRUCTURE_RELATIONSHIP_PEAK_UNCAUSED should not fire');
    });

    // STRUCTURE_CLOCK_DELTA_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 shift the clock (>=3 present overall); scenes 3-9 (7 scenes) have none
    it('STRUCTURE_CLOCK_DELTA_DROUGHT_RUN fires when the longest no-clock-movement run reaches 6', async () => {
      const recs737c = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs737c[0] = makeSharedRecord(0, { clockDelta: 1 });
      recs737c[1] = makeSharedRecord(1, { clockDelta: -1 });
      recs737c[2] = makeSharedRecord(2, { clockDelta: 1 });
      const res = await runST737(recs737c);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_CLOCK_DELTA_DROUGHT_RUN'), 'STRUCTURE_CLOCK_DELTA_DROUGHT_RUN should fire');
    });

    // STRUCTURE_CLOCK_DELTA_DROUGHT_RUN no-fire:
    // clock-shifting scenes spread out so no gap reaches 6 consecutive scenes
    it('STRUCTURE_CLOCK_DELTA_DROUGHT_RUN does not fire when clock movement is spread through the story', async () => {
      const recs737cn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs737cn[0] = makeSharedRecord(0, { clockDelta: 1 });
      recs737cn[3] = makeSharedRecord(3, { clockDelta: -1 });
      recs737cn[6] = makeSharedRecord(6, { clockDelta: 1 });
      recs737cn[9] = makeSharedRecord(9, { clockDelta: -1 });
      const res = await runST737(recs737cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_CLOCK_DELTA_DROUGHT_RUN'), 'STRUCTURE_CLOCK_DELTA_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 723 — structurePass: structure payoff zone cluster, structure relationship zone cluster, structure clock drought run', async () => {
    const runST723 = async (records: ScreenplaySceneRecord[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // STRUCTURE_PAYOFF_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; payoff scenes at 0,1,2 → 100% opening third
    it('STRUCTURE_PAYOFF_ZONE_CLUSTER fires when >75% of payoff scenes cluster in one third', async () => {
      const recs723a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs723a[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs723a[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs723a[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-c'] });
      const res = await runST723(recs723a);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_PAYOFF_ZONE_CLUSTER'), 'STRUCTURE_PAYOFF_ZONE_CLUSTER should fire');
    });

    // STRUCTURE_PAYOFF_ZONE_CLUSTER no-fire:
    // payoff scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('STRUCTURE_PAYOFF_ZONE_CLUSTER does not fire when payoff scenes are distributed across thirds', async () => {
      const recs723an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs723an[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs723an[4] = makeSharedRecord(4, { payoffSetupIds: ['thread-b'] });
      recs723an[7] = makeSharedRecord(7, { payoffSetupIds: ['thread-c'] });
      const res = await runST723(recs723an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_PAYOFF_ZONE_CLUSTER'), 'STRUCTURE_PAYOFF_ZONE_CLUSTER should not fire');
    });

    // STRUCTURE_RELATIONSHIP_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; relationship-shift scenes at 0,1,2 → 100% opening third
    it('STRUCTURE_RELATIONSHIP_ZONE_CLUSTER fires when >75% of relationship-shift scenes cluster in one third', async () => {
      const recs723b = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs723b[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs723b[1] = makeSharedRecord(1, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs723b[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      const res = await runST723(recs723b);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_RELATIONSHIP_ZONE_CLUSTER'), 'STRUCTURE_RELATIONSHIP_ZONE_CLUSTER should fire');
    });

    // STRUCTURE_RELATIONSHIP_ZONE_CLUSTER no-fire:
    // relationship-shift scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('STRUCTURE_RELATIONSHIP_ZONE_CLUSTER does not fire when relationship-shift scenes are distributed across thirds', async () => {
      const recs723bn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs723bn[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs723bn[4] = makeSharedRecord(4, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs723bn[7] = makeSharedRecord(7, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      const res = await runST723(recs723bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_RELATIONSHIP_ZONE_CLUSTER'), 'STRUCTURE_RELATIONSHIP_ZONE_CLUSTER should not fire');
    });

    // STRUCTURE_CLOCK_DROUGHT_RUN fire:
    // 10 scenes; clock raised at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('STRUCTURE_CLOCK_DROUGHT_RUN fires when the longest no-clock run is ≥6', async () => {
      const recs723c = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs723c[0] = makeSharedRecord(0, { clockRaised: true });
      recs723c[1] = makeSharedRecord(1, { clockRaised: true });
      recs723c[2] = makeSharedRecord(2, { clockRaised: true });
      recs723c[9] = makeSharedRecord(9, { clockRaised: true });
      const res = await runST723(recs723c);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_CLOCK_DROUGHT_RUN'), 'STRUCTURE_CLOCK_DROUGHT_RUN should fire');
    });

    // STRUCTURE_CLOCK_DROUGHT_RUN no-fire:
    // clock raised at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('STRUCTURE_CLOCK_DROUGHT_RUN does not fire when clock raises are distributed without a long drought', async () => {
      const recs723cn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs723cn[0] = makeSharedRecord(0, { clockRaised: true });
      recs723cn[4] = makeSharedRecord(4, { clockRaised: true });
      recs723cn[9] = makeSharedRecord(9, { clockRaised: true });
      const res = await runST723(recs723cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_CLOCK_DROUGHT_RUN'), 'STRUCTURE_CLOCK_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 709 — structurePass: structure highlight drought run, structure open thread zone cluster, structure seed peak uncaused', async () => {
    const runST709 = async (records: ScreenplaySceneRecord[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // STRUCTURE_HIGHLIGHT_DROUGHT_RUN fire:
    // 10 scenes; highlights at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('STRUCTURE_HIGHLIGHT_DROUGHT_RUN fires when the longest no-highlighted-dialogue run is ≥6', async () => {
      const recs709a = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs709a[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs709a[1] = makeSharedRecord(1, { dialogueHighlights: ['line-b'] });
      recs709a[2] = makeSharedRecord(2, { dialogueHighlights: ['line-c'] });
      recs709a[9] = makeSharedRecord(9, { dialogueHighlights: ['line-d'] });
      const res = await runST709(recs709a);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_HIGHLIGHT_DROUGHT_RUN'), 'STRUCTURE_HIGHLIGHT_DROUGHT_RUN should fire');
    });

    // STRUCTURE_HIGHLIGHT_DROUGHT_RUN no-fire:
    // highlights at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('STRUCTURE_HIGHLIGHT_DROUGHT_RUN does not fire when highlighted dialogue is distributed without a long drought', async () => {
      const recs709an = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs709an[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs709an[4] = makeSharedRecord(4, { dialogueHighlights: ['line-b'] });
      recs709an[9] = makeSharedRecord(9, { dialogueHighlights: ['line-c'] });
      const res = await runST709(recs709an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_HIGHLIGHT_DROUGHT_RUN'), 'STRUCTURE_HIGHLIGHT_DROUGHT_RUN should not fire');
    });

    // STRUCTURE_OPEN_THREAD_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; open-thread scenes at 0,1,2 → 100% opening third
    it('STRUCTURE_OPEN_THREAD_ZONE_CLUSTER fires when >75% of open-thread scenes cluster in one third', async () => {
      const recs709b = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs709b[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs709b[1] = makeSharedRecord(1, { unresolvedClues: ['b'] });
      recs709b[2] = makeSharedRecord(2, { unresolvedClues: ['c'] });
      const res = await runST709(recs709b);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_OPEN_THREAD_ZONE_CLUSTER'), 'STRUCTURE_OPEN_THREAD_ZONE_CLUSTER should fire');
    });

    // STRUCTURE_OPEN_THREAD_ZONE_CLUSTER no-fire:
    // open-thread scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('STRUCTURE_OPEN_THREAD_ZONE_CLUSTER does not fire when open-thread scenes are distributed across thirds', async () => {
      const recs709bn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs709bn[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs709bn[4] = makeSharedRecord(4, { unresolvedClues: ['b'] });
      recs709bn[7] = makeSharedRecord(7, { unresolvedClues: ['c'] });
      const res = await runST709(recs709bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_OPEN_THREAD_ZONE_CLUSTER'), 'STRUCTURE_OPEN_THREAD_ZONE_CLUSTER should not fire');
    });

    // STRUCTURE_SEED_PEAK_UNCAUSED fire:
    // 8 scenes; seeds at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('STRUCTURE_SEED_PEAK_UNCAUSED fires when the peak seed scene has no dramatic turn or revelation nearby', async () => {
      const recs709c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs709c[2] = makeSharedRecord(2, { seededClueIds: ['clue-a'] });
      recs709c[6] = makeSharedRecord(6, { seededClueIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runST709(recs709c);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_SEED_PEAK_UNCAUSED'), 'STRUCTURE_SEED_PEAK_UNCAUSED should fire');
    });

    // STRUCTURE_SEED_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('STRUCTURE_SEED_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs709cn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs709cn[2] = makeSharedRecord(2, { seededClueIds: ['clue-a'] });
      recs709cn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs709cn[6] = makeSharedRecord(6, { seededClueIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runST709(recs709cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_SEED_PEAK_UNCAUSED'), 'STRUCTURE_SEED_PEAK_UNCAUSED should not fire');
    });
  });

  describe('Wave 695 — structurePass: structure open thread peak uncaused, structure seed drought run, structure staging zone cluster', async () => {
    const runST695 = async (records: ScreenplaySceneRecord[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // STRUCTURE_OPEN_THREAD_PEAK_UNCAUSED fire:
    // 8 scenes; open threads at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('STRUCTURE_OPEN_THREAD_PEAK_UNCAUSED fires when the peak open-thread scene has no dramatic turn or revelation nearby', async () => {
      const recs695a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs695a[2] = makeSharedRecord(2, { unresolvedClues: ['a'] });
      recs695a[6] = makeSharedRecord(6, { unresolvedClues: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runST695(recs695a);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_OPEN_THREAD_PEAK_UNCAUSED'), 'STRUCTURE_OPEN_THREAD_PEAK_UNCAUSED should fire');
    });

    // STRUCTURE_OPEN_THREAD_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('STRUCTURE_OPEN_THREAD_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs695an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs695an[2] = makeSharedRecord(2, { unresolvedClues: ['a'] });
      recs695an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs695an[6] = makeSharedRecord(6, { unresolvedClues: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runST695(recs695an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_OPEN_THREAD_PEAK_UNCAUSED'), 'STRUCTURE_OPEN_THREAD_PEAK_UNCAUSED should not fire');
    });

    // STRUCTURE_SEED_DROUGHT_RUN fire:
    // 10 scenes; seeds at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('STRUCTURE_SEED_DROUGHT_RUN fires when the longest no-seed run is ≥6', async () => {
      const recs695b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs695b[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs695b[1] = makeSharedRecord(1, { seededClueIds: ['clue-b'] });
      recs695b[2] = makeSharedRecord(2, { seededClueIds: ['clue-c'] });
      recs695b[9] = makeSharedRecord(9, { seededClueIds: ['clue-d'] });
      const res = await runST695(recs695b);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_SEED_DROUGHT_RUN'), 'STRUCTURE_SEED_DROUGHT_RUN should fire');
    });

    // STRUCTURE_SEED_DROUGHT_RUN no-fire:
    // seeds at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('STRUCTURE_SEED_DROUGHT_RUN does not fire when seeds are distributed without a long drought', async () => {
      const recs695bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs695bn[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs695bn[4] = makeSharedRecord(4, { seededClueIds: ['clue-b'] });
      recs695bn[9] = makeSharedRecord(9, { seededClueIds: ['clue-c'] });
      const res = await runST695(recs695bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_SEED_DROUGHT_RUN'), 'STRUCTURE_SEED_DROUGHT_RUN should not fire');
    });

    // STRUCTURE_STAGING_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; visually dense scenes at 0,1,2 → 100% opening third
    it('STRUCTURE_STAGING_ZONE_CLUSTER fires when >75% of visually dense scenes cluster in one third', async () => {
      const recs695c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs695c[0] = makeSharedRecord(0, { visualBeats: ['a', 'b'] });
      recs695c[1] = makeSharedRecord(1, { visualBeats: ['a', 'b'] });
      recs695c[2] = makeSharedRecord(2, { visualBeats: ['a', 'b'] });
      const res = await runST695(recs695c);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_STAGING_ZONE_CLUSTER'), 'STRUCTURE_STAGING_ZONE_CLUSTER should fire');
    });

    // STRUCTURE_STAGING_ZONE_CLUSTER no-fire:
    // visually dense scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('STRUCTURE_STAGING_ZONE_CLUSTER does not fire when visually dense scenes are distributed across thirds', async () => {
      const recs695cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs695cn[0] = makeSharedRecord(0, { visualBeats: ['a', 'b'] });
      recs695cn[4] = makeSharedRecord(4, { visualBeats: ['a', 'b'] });
      recs695cn[7] = makeSharedRecord(7, { visualBeats: ['a', 'b'] });
      const res = await runST695(recs695cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_STAGING_ZONE_CLUSTER'), 'STRUCTURE_STAGING_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 681 — structurePass: structure clock delta peak uncaused, structure staging drought run, structure stakes zone cluster', async () => {
    const runST681 = async (records: ScreenplaySceneRecord[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // STRUCTURE_CLOCK_DELTA_PEAK_UNCAUSED fire:
    // 8 scenes; clockDelta at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('STRUCTURE_CLOCK_DELTA_PEAK_UNCAUSED fires when the peak clockDelta scene has no dramatic turn or revelation nearby', async () => {
      const recs681a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs681a[2] = makeSharedRecord(2, { clockDelta: 1 });
      recs681a[6] = makeSharedRecord(6, { clockDelta: 5 });
      const res = await runST681(recs681a);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_CLOCK_DELTA_PEAK_UNCAUSED'), 'STRUCTURE_CLOCK_DELTA_PEAK_UNCAUSED should fire');
    });

    // STRUCTURE_CLOCK_DELTA_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('STRUCTURE_CLOCK_DELTA_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs681an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs681an[2] = makeSharedRecord(2, { clockDelta: 1 });
      recs681an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs681an[6] = makeSharedRecord(6, { clockDelta: 5 });
      const res = await runST681(recs681an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_CLOCK_DELTA_PEAK_UNCAUSED'), 'STRUCTURE_CLOCK_DELTA_PEAK_UNCAUSED should not fire');
    });

    // STRUCTURE_STAGING_DROUGHT_RUN fire:
    // 10 scenes; staged at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('STRUCTURE_STAGING_DROUGHT_RUN fires when the longest no-staging run is ≥6', async () => {
      const recs681b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs681b[0] = makeSharedRecord(0, { visualBeats: ['a'] });
      recs681b[1] = makeSharedRecord(1, { visualBeats: ['b'] });
      recs681b[2] = makeSharedRecord(2, { visualBeats: ['c'] });
      recs681b[9] = makeSharedRecord(9, { visualBeats: ['d'] });
      const res = await runST681(recs681b);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_STAGING_DROUGHT_RUN'), 'STRUCTURE_STAGING_DROUGHT_RUN should fire');
    });

    // STRUCTURE_STAGING_DROUGHT_RUN no-fire:
    // staged at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('STRUCTURE_STAGING_DROUGHT_RUN does not fire when staging is distributed without a long drought', async () => {
      const recs681bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs681bn[0] = makeSharedRecord(0, { visualBeats: ['a'] });
      recs681bn[4] = makeSharedRecord(4, { visualBeats: ['b'] });
      recs681bn[9] = makeSharedRecord(9, { visualBeats: ['c'] });
      const res = await runST681(recs681bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_STAGING_DROUGHT_RUN'), 'STRUCTURE_STAGING_DROUGHT_RUN should not fire');
    });

    // STRUCTURE_STAKES_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; stakes-raising scenes at 0,1,2 → 100% opening third
    it('STRUCTURE_STAKES_ZONE_CLUSTER fires when >75% of stakes-raising scenes cluster in one third', async () => {
      const recs681c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs681c[0] = makeSharedRecord(0, { purpose: 'raise_stakes' });
      recs681c[1] = makeSharedRecord(1, { purpose: 'raise_stakes' });
      recs681c[2] = makeSharedRecord(2, { purpose: 'raise_stakes' });
      const res = await runST681(recs681c);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_STAKES_ZONE_CLUSTER'), 'STRUCTURE_STAKES_ZONE_CLUSTER should fire');
    });

    // STRUCTURE_STAKES_ZONE_CLUSTER no-fire:
    // stakes-raising scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('STRUCTURE_STAKES_ZONE_CLUSTER does not fire when stakes-raising scenes are distributed across thirds', async () => {
      const recs681cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs681cn[0] = makeSharedRecord(0, { purpose: 'raise_stakes' });
      recs681cn[4] = makeSharedRecord(4, { purpose: 'raise_stakes' });
      recs681cn[7] = makeSharedRecord(7, { purpose: 'raise_stakes' });
      const res = await runST681(recs681cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_STAKES_ZONE_CLUSTER'), 'STRUCTURE_STAKES_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 667 — structurePass: structure payoff peak uncaused, structure relationship drought run, structure clock zone cluster', async () => {
    const runST667 = async (records: ScreenplaySceneRecord[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // STRUCTURE_PAYOFF_PEAK_UNCAUSED fire:
    // 8 scenes; payoffs at 2 (1 thread) and 6 (5 threads, the peak); no dramaticTurn or revelation
    // at 6, 5, or 4
    it('STRUCTURE_PAYOFF_PEAK_UNCAUSED fires when the peak payoff scene has no dramatic turn or revelation nearby', async () => {
      const recs667a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs667a[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-a'] });
      recs667a[6] = makeSharedRecord(6, { payoffSetupIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runST667(recs667a);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_PAYOFF_PEAK_UNCAUSED'), 'STRUCTURE_PAYOFF_PEAK_UNCAUSED should fire');
    });

    // STRUCTURE_PAYOFF_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('STRUCTURE_PAYOFF_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs667an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs667an[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-a'] });
      recs667an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs667an[6] = makeSharedRecord(6, { payoffSetupIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runST667(recs667an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_PAYOFF_PEAK_UNCAUSED'), 'STRUCTURE_PAYOFF_PEAK_UNCAUSED should not fire');
    });

    // STRUCTURE_RELATIONSHIP_DROUGHT_RUN fire:
    // 10 scenes; shifts at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('STRUCTURE_RELATIONSHIP_DROUGHT_RUN fires when the longest no-shift run is ≥6', async () => {
      const recs667b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs667b[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs667b[1] = makeSharedRecord(1, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs667b[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs667b[9] = makeSharedRecord(9, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      const res = await runST667(recs667b);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_RELATIONSHIP_DROUGHT_RUN'), 'STRUCTURE_RELATIONSHIP_DROUGHT_RUN should fire');
    });

    // STRUCTURE_RELATIONSHIP_DROUGHT_RUN no-fire:
    // shifts at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('STRUCTURE_RELATIONSHIP_DROUGHT_RUN does not fire when shifts are distributed without a long drought', async () => {
      const recs667bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs667bn[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs667bn[4] = makeSharedRecord(4, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs667bn[9] = makeSharedRecord(9, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      const res = await runST667(recs667bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_RELATIONSHIP_DROUGHT_RUN'), 'STRUCTURE_RELATIONSHIP_DROUGHT_RUN should not fire');
    });

    // STRUCTURE_CLOCK_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; clock-raised scenes at 0,1,2 → 100% opening third
    it('STRUCTURE_CLOCK_ZONE_CLUSTER fires when >75% of clock-raised scenes cluster in one third', async () => {
      const recs667c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs667c[0] = makeSharedRecord(0, { clockRaised: true });
      recs667c[1] = makeSharedRecord(1, { clockRaised: true });
      recs667c[2] = makeSharedRecord(2, { clockRaised: true });
      const res = await runST667(recs667c);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_CLOCK_ZONE_CLUSTER'), 'STRUCTURE_CLOCK_ZONE_CLUSTER should fire');
    });

    // STRUCTURE_CLOCK_ZONE_CLUSTER no-fire:
    // clock-raised scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('STRUCTURE_CLOCK_ZONE_CLUSTER does not fire when clock-raised scenes are distributed across thirds', async () => {
      const recs667cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs667cn[0] = makeSharedRecord(0, { clockRaised: true });
      recs667cn[4] = makeSharedRecord(4, { clockRaised: true });
      recs667cn[7] = makeSharedRecord(7, { clockRaised: true });
      const res = await runST667(recs667cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_CLOCK_ZONE_CLUSTER'), 'STRUCTURE_CLOCK_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 653 — structurePass: structure highlight peak uncaused, structure open thread drought run, structure seed zone cluster', async () => {
    const runST653 = async (records: ScreenplaySceneRecord[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // STRUCTURE_HIGHLIGHT_PEAK_UNCAUSED fire:
    // 8 scenes; highlights at 2 (1 line) and 6 (5 lines, the peak); no dramaticTurn or revelation
    // at 6, 5, or 4
    it('STRUCTURE_HIGHLIGHT_PEAK_UNCAUSED fires when the peak highlighted-dialogue scene has no dramatic turn or revelation nearby', async () => {
      const recs653a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs653a[2] = makeSharedRecord(2, { dialogueHighlights: ['line-a'] });
      recs653a[6] = makeSharedRecord(6, { dialogueHighlights: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runST653(recs653a);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_HIGHLIGHT_PEAK_UNCAUSED'), 'STRUCTURE_HIGHLIGHT_PEAK_UNCAUSED should fire');
    });

    // STRUCTURE_HIGHLIGHT_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('STRUCTURE_HIGHLIGHT_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs653an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs653an[2] = makeSharedRecord(2, { dialogueHighlights: ['line-a'] });
      recs653an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs653an[6] = makeSharedRecord(6, { dialogueHighlights: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runST653(recs653an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_HIGHLIGHT_PEAK_UNCAUSED'), 'STRUCTURE_HIGHLIGHT_PEAK_UNCAUSED should not fire');
    });

    // STRUCTURE_OPEN_THREAD_DROUGHT_RUN fire:
    // 10 scenes; debt at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('STRUCTURE_OPEN_THREAD_DROUGHT_RUN fires when the longest no-debt run is ≥6', async () => {
      const recs653b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs653b[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs653b[1] = makeSharedRecord(1, { unresolvedClues: ['b'] });
      recs653b[2] = makeSharedRecord(2, { unresolvedClues: ['c'] });
      recs653b[9] = makeSharedRecord(9, { unresolvedClues: ['d'] });
      const res = await runST653(recs653b);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_OPEN_THREAD_DROUGHT_RUN'), 'STRUCTURE_OPEN_THREAD_DROUGHT_RUN should fire');
    });

    // STRUCTURE_OPEN_THREAD_DROUGHT_RUN no-fire:
    // debt at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('STRUCTURE_OPEN_THREAD_DROUGHT_RUN does not fire when debt is distributed without a long drought', async () => {
      const recs653bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs653bn[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs653bn[4] = makeSharedRecord(4, { unresolvedClues: ['b'] });
      recs653bn[9] = makeSharedRecord(9, { unresolvedClues: ['c'] });
      const res = await runST653(recs653bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_OPEN_THREAD_DROUGHT_RUN'), 'STRUCTURE_OPEN_THREAD_DROUGHT_RUN should not fire');
    });

    // STRUCTURE_SEED_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; seed scenes at 0,1,2 → 100% opening third
    it('STRUCTURE_SEED_ZONE_CLUSTER fires when >75% of seed scenes cluster in one third', async () => {
      const recs653c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs653c[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs653c[1] = makeSharedRecord(1, { seededClueIds: ['clue-b'] });
      recs653c[2] = makeSharedRecord(2, { seededClueIds: ['clue-c'] });
      const res = await runST653(recs653c);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_SEED_ZONE_CLUSTER'), 'STRUCTURE_SEED_ZONE_CLUSTER should fire');
    });

    // STRUCTURE_SEED_ZONE_CLUSTER no-fire:
    // seed scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('STRUCTURE_SEED_ZONE_CLUSTER does not fire when seed scenes are distributed across thirds', async () => {
      const recs653cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs653cn[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs653cn[4] = makeSharedRecord(4, { seededClueIds: ['clue-b'] });
      recs653cn[7] = makeSharedRecord(7, { seededClueIds: ['clue-c'] });
      const res = await runST653(recs653cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_SEED_ZONE_CLUSTER'), 'STRUCTURE_SEED_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 639 — structurePass: structure dialogue highlight zone cluster, structure highlight open thread decoupled, structure open thread highlight aftermath void', async () => {
    const runST639 = async (records: ScreenplaySceneRecord[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // STRUCTURE_DIALOGUE_HIGHLIGHT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; highlights at 0,1,2 → 100% in opening third
    it('STRUCTURE_DIALOGUE_HIGHLIGHT_ZONE_CLUSTER fires when >75% of dialogue-highlight scenes cluster in one third', async () => {
      const recs639a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs639a[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs639a[1] = makeSharedRecord(1, { dialogueHighlights: ['line-b'] });
      recs639a[2] = makeSharedRecord(2, { dialogueHighlights: ['line-c'] });
      const res = await runST639(recs639a);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_DIALOGUE_HIGHLIGHT_ZONE_CLUSTER'), 'STRUCTURE_DIALOGUE_HIGHLIGHT_ZONE_CLUSTER should fire');
    });

    // STRUCTURE_DIALOGUE_HIGHLIGHT_ZONE_CLUSTER no-fire:
    // highlights at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('STRUCTURE_DIALOGUE_HIGHLIGHT_ZONE_CLUSTER does not fire when dialogue highlights are distributed across thirds', async () => {
      const recs639an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs639an[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs639an[4] = makeSharedRecord(4, { dialogueHighlights: ['line-b'] });
      recs639an[7] = makeSharedRecord(7, { dialogueHighlights: ['line-c'] });
      const res = await runST639(recs639an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_DIALOGUE_HIGHLIGHT_ZONE_CLUSTER'), 'STRUCTURE_DIALOGUE_HIGHLIGHT_ZONE_CLUSTER should not fire');
    });

    // STRUCTURE_HIGHLIGHT_OPEN_THREAD_DECOUPLED fire:
    // n=6; highlights at 0,1 (no debt); debt at 4,5 (no highlight) → zero overlap → fires
    it('STRUCTURE_HIGHLIGHT_OPEN_THREAD_DECOUPLED fires when dialogue-highlight scenes and open-thread scenes never overlap', async () => {
      const recs639b = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs639b[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs639b[1] = makeSharedRecord(1, { dialogueHighlights: ['line-b'] });
      recs639b[4] = makeSharedRecord(4, { unresolvedClues: ['unpaid-clue'] });
      recs639b[5] = makeSharedRecord(5, { unresolvedClues: ['unpaid-clue'] });
      const res = await runST639(recs639b);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_HIGHLIGHT_OPEN_THREAD_DECOUPLED'), 'STRUCTURE_HIGHLIGHT_OPEN_THREAD_DECOUPLED should fire');
    });

    // STRUCTURE_HIGHLIGHT_OPEN_THREAD_DECOUPLED no-fire:
    // scene 0 carries BOTH a highlight and open debt → overlap exists
    it('STRUCTURE_HIGHLIGHT_OPEN_THREAD_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs639bn = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs639bn[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'], unresolvedClues: ['unpaid-clue'] });
      recs639bn[1] = makeSharedRecord(1, { dialogueHighlights: ['line-b'] });
      recs639bn[5] = makeSharedRecord(5, { unresolvedClues: ['unpaid-clue'] });
      const res = await runST639(recs639bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_HIGHLIGHT_OPEN_THREAD_DECOUPLED'), 'STRUCTURE_HIGHLIGHT_OPEN_THREAD_DECOUPLED should not fire');
    });

    // STRUCTURE_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID fire:
    // n=8, window=2; heavy clue-debt triggers at 0,1; their windows {1,2} and {2,3} carry no
    // dialogue highlight; highlights exist elsewhere at 5,6,7 → fires
    it('STRUCTURE_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID fires when heavy clue-debt scenes are never followed by a dialogue highlight', async () => {
      const recs639c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs639c[0] = makeSharedRecord(0, { unresolvedClues: ['c1', 'c2', 'c3'] });
      recs639c[1] = makeSharedRecord(1, { unresolvedClues: ['c1', 'c2', 'c3'] });
      recs639c[5] = makeSharedRecord(5, { dialogueHighlights: ['line-a'] });
      recs639c[6] = makeSharedRecord(6, { dialogueHighlights: ['line-b'] });
      recs639c[7] = makeSharedRecord(7, { dialogueHighlights: ['line-c'] });
      const res = await runST639(recs639c);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURE_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID'), 'STRUCTURE_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    // STRUCTURE_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries a highlight → that trigger's
    // aftermath is no longer void
    it('STRUCTURE_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID does not fire when a trigger window contains a dialogue highlight', async () => {
      const recs639cn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs639cn[0] = makeSharedRecord(0, { unresolvedClues: ['c1', 'c2', 'c3'] });
      recs639cn[1] = makeSharedRecord(1, { unresolvedClues: ['c1', 'c2', 'c3'] });
      recs639cn[3] = makeSharedRecord(3, { dialogueHighlights: ['line-a'] });
      recs639cn[5] = makeSharedRecord(5, { dialogueHighlights: ['line-b'] });
      recs639cn[6] = makeSharedRecord(6, { dialogueHighlights: ['line-c'] });
      recs639cn[7] = makeSharedRecord(7, { dialogueHighlights: ['line-d'] });
      const res = await runST639(recs639cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURE_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID'), 'STRUCTURE_OPEN_THREAD_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 625 — structurePass: structural staging open thread decoupled, dramatic turn staging aftermath void, structural staging peak uncaused', async () => {
    const runST625 = async (records: ScreenplaySceneRecord[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // STRUCTURAL_STAGING_OPEN_THREAD_DECOUPLED fire:
    // n=6; staged at 0,1 (no debt); debt at 4,5 (no staging) → zero overlap → fires
    it('STRUCTURAL_STAGING_OPEN_THREAD_DECOUPLED fires when visually-staged scenes and open-thread scenes never overlap', async () => {
      const recs625a = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs625a[0] = makeSharedRecord(0, { visualBeats: ['flips through the ledger', 'circles a name'] });
      recs625a[1] = makeSharedRecord(1, { visualBeats: ['flips through the ledger', 'circles a name'] });
      recs625a[4] = makeSharedRecord(4, { unresolvedClues: ['unpaid-clue'] });
      recs625a[5] = makeSharedRecord(5, { unresolvedClues: ['unpaid-clue'] });
      const res = await runST625(recs625a);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURAL_STAGING_OPEN_THREAD_DECOUPLED'), 'STRUCTURAL_STAGING_OPEN_THREAD_DECOUPLED should fire');
    });

    // STRUCTURAL_STAGING_OPEN_THREAD_DECOUPLED no-fire:
    // scene 0 carries BOTH staging and open debt → overlap exists
    it('STRUCTURAL_STAGING_OPEN_THREAD_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs625an = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs625an[0] = makeSharedRecord(0, { visualBeats: ['flips through the ledger', 'circles a name'], unresolvedClues: ['unpaid-clue'] });
      recs625an[1] = makeSharedRecord(1, { visualBeats: ['flips through the ledger', 'circles a name'] });
      recs625an[5] = makeSharedRecord(5, { unresolvedClues: ['unpaid-clue'] });
      const res = await runST625(recs625an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURAL_STAGING_OPEN_THREAD_DECOUPLED'), 'STRUCTURAL_STAGING_OPEN_THREAD_DECOUPLED should not fire');
    });

    // DRAMATIC_TURN_STAGING_AFTERMATH_VOID fire:
    // n=8, window=2; turn triggers at 0,1; their windows {1,2} and {2,3} carry no visually
    // dense scene; staged scenes exist elsewhere at 5,6,7 → fires
    it('DRAMATIC_TURN_STAGING_AFTERMATH_VOID fires when no dramatic turn is followed by a visually dense scene within 2 scenes', async () => {
      const recs625b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs625b[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs625b[1] = makeSharedRecord(1, { dramaticTurn: 'revelation' });
      recs625b[5] = makeSharedRecord(5, { visualBeats: ['flips through the ledger', 'circles a name'] });
      recs625b[6] = makeSharedRecord(6, { visualBeats: ['flips through the ledger', 'circles a name'] });
      recs625b[7] = makeSharedRecord(7, { visualBeats: ['flips through the ledger', 'circles a name'] });
      const res = await runST625(recs625b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_STAGING_AFTERMATH_VOID'), 'DRAMATIC_TURN_STAGING_AFTERMATH_VOID should fire');
    });

    // DRAMATIC_TURN_STAGING_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries staging → that trigger's aftermath
    // is no longer void
    it('DRAMATIC_TURN_STAGING_AFTERMATH_VOID does not fire when a trigger window contains a visually dense scene', async () => {
      const recs625bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs625bn[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs625bn[1] = makeSharedRecord(1, { dramaticTurn: 'revelation' });
      recs625bn[3] = makeSharedRecord(3, { visualBeats: ['flips through the ledger', 'circles a name'] });
      recs625bn[5] = makeSharedRecord(5, { visualBeats: ['flips through the ledger', 'circles a name'] });
      recs625bn[6] = makeSharedRecord(6, { visualBeats: ['flips through the ledger', 'circles a name'] });
      recs625bn[7] = makeSharedRecord(7, { visualBeats: ['flips through the ledger', 'circles a name'] });
      const res = await runST625(recs625bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_STAGING_AFTERMATH_VOID'), 'DRAMATIC_TURN_STAGING_AFTERMATH_VOID should not fire');
    });

    // STRUCTURAL_STAGING_PEAK_UNCAUSED fire:
    // 8 scenes; visualBeats present at 2 (1 beat) and 6 (5 beats, the peak); no revelation or
    // dramaticTurn at 6, 5, or 4
    it('STRUCTURAL_STAGING_PEAK_UNCAUSED fires when the peak physical-staging scene has no revelation or dramatic turn nearby', async () => {
      const recs625c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs625c[2] = makeSharedRecord(2, { visualBeats: ['glances at the clock'] });
      recs625c[6] = makeSharedRecord(6, { visualBeats: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runST625(recs625c);
      assert.ok(res.issues.some((i: any) => i.rule === 'STRUCTURAL_STAGING_PEAK_UNCAUSED'), 'STRUCTURAL_STAGING_PEAK_UNCAUSED should fire');
    });

    // STRUCTURAL_STAGING_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('STRUCTURAL_STAGING_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs625cn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs625cn[2] = makeSharedRecord(2, { visualBeats: ['glances at the clock'] });
      recs625cn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs625cn[6] = makeSharedRecord(6, { visualBeats: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runST625(recs625cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STRUCTURAL_STAGING_PEAK_UNCAUSED'), 'STRUCTURAL_STAGING_PEAK_UNCAUSED should not fire');
    });
  });

  describe('Wave 611 — structurePass: visual beat structural imbalance, payoff scene turn decoupled, payoff dialogue highlight aftermath void', async () => {
    const runST611 = async (records: ScreenplaySceneRecord[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // VISUAL_BEAT_STRUCTURAL_IMBALANCE fire:
    // n=12 (three scenes per zone); visually dense scenes (visualBeats≥2) at 6,9,10,11;
    // zones 0 (0-2) and 1 (3-5) are empty; zone 3 (9-11) holds 3/4 = 75% ≥ 50% → fires
    it('VISUAL_BEAT_STRUCTURAL_IMBALANCE fires when one zone is empty of visually dense scenes while another is bloated', async () => {
      const recs611a = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs611a[6] = makeSharedRecord(6, { visualBeats: ['unlocks the box', 'lifts the lid'] });
      recs611a[9] = makeSharedRecord(9, { visualBeats: ['unlocks the box', 'lifts the lid'] });
      recs611a[10] = makeSharedRecord(10, { visualBeats: ['unlocks the box', 'lifts the lid'] });
      recs611a[11] = makeSharedRecord(11, { visualBeats: ['unlocks the box', 'lifts the lid'] });
      const res = await runST611(recs611a);
      assert.ok(res.issues.some((i: any) => i.rule === 'VISUAL_BEAT_STRUCTURAL_IMBALANCE'), 'VISUAL_BEAT_STRUCTURAL_IMBALANCE should fire');
    });

    // VISUAL_BEAT_STRUCTURAL_IMBALANCE no-fire:
    // one visually dense scene per zone (1,4,7,10) → no zone is empty
    it('VISUAL_BEAT_STRUCTURAL_IMBALANCE does not fire when every zone has a visually dense scene', async () => {
      const recs611an = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs611an[1] = makeSharedRecord(1, { visualBeats: ['unlocks the box', 'lifts the lid'] });
      recs611an[4] = makeSharedRecord(4, { visualBeats: ['unlocks the box', 'lifts the lid'] });
      recs611an[7] = makeSharedRecord(7, { visualBeats: ['unlocks the box', 'lifts the lid'] });
      recs611an[10] = makeSharedRecord(10, { visualBeats: ['unlocks the box', 'lifts the lid'] });
      const res = await runST611(recs611an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VISUAL_BEAT_STRUCTURAL_IMBALANCE'), 'VISUAL_BEAT_STRUCTURAL_IMBALANCE should not fire');
    });

    // PAYOFF_SCENE_TURN_DECOUPLED fire:
    // n=8; payoffs at 0,1 (no turn); turns at 2,3 (no payoff) → zero overlap → fires
    it('PAYOFF_SCENE_TURN_DECOUPLED fires when payoff scenes and dramatic-turn scenes never overlap', async () => {
      const recs611b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs611b[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs611b[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs611b[2] = makeSharedRecord(2, { dramaticTurn: 'reversal' });
      recs611b[3] = makeSharedRecord(3, { dramaticTurn: 'revelation' });
      const res = await runST611(recs611b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_SCENE_TURN_DECOUPLED'), 'PAYOFF_SCENE_TURN_DECOUPLED should fire');
    });

    // PAYOFF_SCENE_TURN_DECOUPLED no-fire:
    // scene 1 carries BOTH a payoff and a dramatic turn → overlap exists
    it('PAYOFF_SCENE_TURN_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs611bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs611bn[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs611bn[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'], dramaticTurn: 'reversal' });
      recs611bn[3] = makeSharedRecord(3, { dramaticTurn: 'revelation' });
      const res = await runST611(recs611bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_SCENE_TURN_DECOUPLED'), 'PAYOFF_SCENE_TURN_DECOUPLED should not fire');
    });

    // PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fire:
    // n=8, window=2; payoff triggers at 0,1; their windows {1,2} and {2,3} carry no dialogue
    // highlight; highlights exist elsewhere at 5,6,7 → fires
    it('PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when no payoff is followed by a dialogue highlight within 2 scenes', async () => {
      const recs611c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs611c[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs611c[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs611c[5] = makeSharedRecord(5, { dialogueHighlights: ['line-a'] });
      recs611c[6] = makeSharedRecord(6, { dialogueHighlights: ['line-b'] });
      recs611c[7] = makeSharedRecord(7, { dialogueHighlights: ['line-c'] });
      const res = await runST611(recs611c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    // PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries a highlight → that trigger's
    // aftermath is no longer void
    it('PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a trigger window contains a dialogue highlight', async () => {
      const recs611cn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs611cn[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs611cn[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs611cn[3] = makeSharedRecord(3, { dialogueHighlights: ['line-a'] });
      recs611cn[5] = makeSharedRecord(5, { dialogueHighlights: ['line-b'] });
      recs611cn[6] = makeSharedRecord(6, { dialogueHighlights: ['line-c'] });
      recs611cn[7] = makeSharedRecord(7, { dialogueHighlights: ['line-d'] });
      const res = await runST611(recs611cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'PAYOFF_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 597 — structurePass: unresolved clue debt escalation absent, dialogue highlight drought run, dialogue highlight zone imbalance', async () => {
    const runST597 = async (records: ScreenplaySceneRecord[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    it('UNRESOLVED_CLUE_DEBT_ESCALATION_ABSENT fires when second-half debt is not lower than first-half debt', async () => {
      // 10 scenes; first half debt [0,0,1,0,1]=2 (avg .4), second half [1,1,1,1,1]=5 (avg 1.0) — debt rises
      const debts597a = [0, 0, 1, 0, 1, 1, 1, 1, 1, 1];
      const recs597a = debts597a.map((d, i) => makeSharedRecord(i, { unresolvedClues: Array.from({ length: d }, (_, k) => `clue${k}`) }));
      const res = await runST597(recs597a);
      assert.ok(res.issues.some((i: any) => i.rule === 'UNRESOLVED_CLUE_DEBT_ESCALATION_ABSENT'), 'UNRESOLVED_CLUE_DEBT_ESCALATION_ABSENT should fire');
    });

    it('UNRESOLVED_CLUE_DEBT_ESCALATION_ABSENT does not fire when second-half debt is lower than first-half debt', async () => {
      // first half [2,2,2,2,2]=10 (avg 2.0), second half [0,0,0,0,0]=0 (avg 0) — debt pays down
      const debts597anr = [2, 2, 2, 2, 2, 0, 0, 0, 0, 0];
      const recs597anr = debts597anr.map((d, i) => makeSharedRecord(i, { unresolvedClues: Array.from({ length: d }, (_, k) => `clue${k}`) }));
      const res = await runST597(recs597anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'UNRESOLVED_CLUE_DEBT_ESCALATION_ABSENT'), 'UNRESOLVED_CLUE_DEBT_ESCALATION_ABSENT should not fire');
    });

    it('DIALOGUE_HIGHLIGHT_DROUGHT_RUN fires when ≥6 consecutive scenes have no dialogue highlights', async () => {
      // 10 scenes; highlights at 0,1,2 (3 total); scenes 3-9 (7 in a row) have none
      const recs597b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs597b[0] = makeSharedRecord(0, { dialogueHighlights: ['alice: believes X'] });
      recs597b[1] = makeSharedRecord(1, { dialogueHighlights: ['bob: believes Y'] });
      recs597b[2] = makeSharedRecord(2, { dialogueHighlights: ['alice: believes Z'] });
      const res = await runST597(recs597b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_HIGHLIGHT_DROUGHT_RUN'), 'DIALOGUE_HIGHLIGHT_DROUGHT_RUN should fire');
    });

    it('DIALOGUE_HIGHLIGHT_DROUGHT_RUN does not fire when highlights are spread with no long gap', async () => {
      // highlights at 0,3,6,9 — max gap = 2 scenes, well under the 6-scene threshold
      const recs597bnr = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs597bnr[0] = makeSharedRecord(0, { dialogueHighlights: ['alice: believes X'] });
      recs597bnr[3] = makeSharedRecord(3, { dialogueHighlights: ['bob: believes Y'] });
      recs597bnr[6] = makeSharedRecord(6, { dialogueHighlights: ['alice: believes Z'] });
      recs597bnr[9] = makeSharedRecord(9, { dialogueHighlights: ['bob: believes W'] });
      const res = await runST597(recs597bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_HIGHLIGHT_DROUGHT_RUN'), 'DIALOGUE_HIGHLIGHT_DROUGHT_RUN should not fire');
    });

    it('DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE fires when one zone has zero highlights and another has ≥50%', async () => {
      // 12 scenes, 4 zones of 3: highlights at 6,7,8 (zone 2) plus 9 (zone 3) to meet minCount=4
      const recs597c = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs597c[6] = makeSharedRecord(6, { dialogueHighlights: ['a: x'] });
      recs597c[7] = makeSharedRecord(7, { dialogueHighlights: ['b: y'] });
      recs597c[8] = makeSharedRecord(8, { dialogueHighlights: ['a: z'] });
      recs597c[9] = makeSharedRecord(9, { dialogueHighlights: ['b: w'] });
      const res = await runST597(recs597c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE'), 'DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE should fire');
    });

    it('DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE does not fire when highlights are spread across all zones', async () => {
      const recs597cnr = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs597cnr[1] = makeSharedRecord(1, { dialogueHighlights: ['a: x'] });
      recs597cnr[4] = makeSharedRecord(4, { dialogueHighlights: ['b: y'] });
      recs597cnr[7] = makeSharedRecord(7, { dialogueHighlights: ['a: z'] });
      recs597cnr[10] = makeSharedRecord(10, { dialogueHighlights: ['b: w'] });
      const res = await runST597(recs597cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE'), 'DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 583 — structurePass: turn suspense decoupled, clock aftermath emotion void, peak suspense curiosity void', async () => {
    const makeRec583 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const runST583 = async (records: any[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // TURN_SUSPENSE_DECOUPLED fire:
    // 8 scenes; turns at 1,3; suspense at 5,7; no scene carries both → fires
    it('TURN_SUSPENSE_DECOUPLED fires when turn scenes and suspense scenes never overlap', async () => {
      const recs583a = Array.from({ length: 8 }, (_, i) => makeRec583(i, {
        dramaticTurn: [1, 3].includes(i) ? 'reversal' : 'nothing',
        suspenseDelta: [5, 7].includes(i) ? 2 : 0,
      }));
      const res = await runST583(recs583a);
      assert.ok(res.issues.some((i: any) => i.rule === 'TURN_SUSPENSE_DECOUPLED'), 'TURN_SUSPENSE_DECOUPLED should fire');
    });

    // TURN_SUSPENSE_DECOUPLED no-fire:
    // 8 scenes; scene 2 has both dramaticTurn='reversal' and suspenseDelta=2 → overlap → no fire
    it('TURN_SUSPENSE_DECOUPLED does not fire when a turn scene also has suspense', async () => {
      const recs583anr = Array.from({ length: 8 }, (_, i) => makeRec583(i, {
        dramaticTurn: [2, 4].includes(i) ? 'reversal' : 'nothing',
        suspenseDelta: [2, 6].includes(i) ? 2 : 0,
      }));
      const res = await runST583(recs583anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TURN_SUSPENSE_DECOUPLED'), 'TURN_SUSPENSE_DECOUPLED should not fire');
    });

    // CLOCK_AFTERMATH_EMOTION_VOID fire:
    // 8 scenes; 3 clocks at 0,1,2; emotions at 6,7; aftermath of each clock is neutral → fires
    it('CLOCK_AFTERMATH_EMOTION_VOID fires when no emotional scene follows any clock raise', async () => {
      const recs583b = Array.from({ length: 8 }, (_, i) => makeRec583(i, {
        clockRaised: [0, 1, 2].includes(i),
        emotionalShift: [6, 7].includes(i) ? 'negative' : 'neutral',
      }));
      const res = await runST583(recs583b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_AFTERMATH_EMOTION_VOID'), 'CLOCK_AFTERMATH_EMOTION_VOID should fire');
    });

    // CLOCK_AFTERMATH_EMOTION_VOID no-fire:
    // 8 scenes; 3 clocks at 0,2,4; scene 1 (aftermath of clock 0) is emotional → no fire
    it('CLOCK_AFTERMATH_EMOTION_VOID does not fire when an emotional scene follows a clock raise', async () => {
      const recs583bnr = Array.from({ length: 8 }, (_, i) => makeRec583(i, {
        clockRaised: [0, 2, 4].includes(i),
        emotionalShift: [1, 6].includes(i) ? 'negative' : 'neutral',
      }));
      const res = await runST583(recs583bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_AFTERMATH_EMOTION_VOID'), 'CLOCK_AFTERMATH_EMOTION_VOID should not fire');
    });

    // PEAK_SUSPENSE_CURIOSITY_VOID fire:
    // 8 scenes; peak suspense at 3 (suspenseDelta=5, curiosityDelta=0); curiosity at 1,5 → fires
    it('PEAK_SUSPENSE_CURIOSITY_VOID fires when peak suspense scene has no curiosity', async () => {
      const recs583c = Array.from({ length: 8 }, (_, i) => makeRec583(i, {
        suspenseDelta: i === 3 ? 5 : 0,
        curiosityDelta: [1, 5].includes(i) ? 2 : 0,
      }));
      const res = await runST583(recs583c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PEAK_SUSPENSE_CURIOSITY_VOID'), 'PEAK_SUSPENSE_CURIOSITY_VOID should fire');
    });

    // PEAK_SUSPENSE_CURIOSITY_VOID no-fire:
    // 8 scenes; peak suspense at 3 (suspenseDelta=5, curiosityDelta=2) → peak has curiosity → no fire
    it('PEAK_SUSPENSE_CURIOSITY_VOID does not fire when peak suspense scene also has curiosity', async () => {
      const recs583cnr = Array.from({ length: 8 }, (_, i) => makeRec583(i, {
        suspenseDelta: i === 3 ? 5 : 0,
        curiosityDelta: [1, 3, 5].includes(i) ? 2 : 0,
      }));
      const res = await runST583(recs583cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PEAK_SUSPENSE_CURIOSITY_VOID'), 'PEAK_SUSPENSE_CURIOSITY_VOID should not fire');
    });
  });


  describe('Wave 569 — structurePass: turn aftermath clock void, turn curiosity decoupled, midpoint clock void', async () => {
    const makeRec569 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const runST569 = async (records: any[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // TURN_AFTERMATH_CLOCK_VOID fire:
    // n=10; turns at 1,3,5 (pos<8); clocks at 0,9 (≥2, outside aftermath windows {2,3},{4,5},{6,7}) → all void → fires
    it('TURN_AFTERMATH_CLOCK_VOID fires when no dramatic turn is followed by a clock within 2 scenes', async () => {
      const recs569a = Array.from({ length: 10 }, (_, i) =>
        makeRec569(i, {
          dramaticTurn: [1, 3, 5].includes(i) ? 'reversal' : 'nothing',
          clockRaised: [0, 9].includes(i),
        }),
      );
      const res = await runST569(recs569a);
      assert.ok(res.issues.some((i: any) => i.rule === 'TURN_AFTERMATH_CLOCK_VOID'), 'TURN_AFTERMATH_CLOCK_VOID should fire');
    });

    // TURN_AFTERMATH_CLOCK_VOID no-fire:
    // n=10; turns at 1,3,5; clock at 2 (aftermath of turn@1) and 9 → turn@1 followed by clock → no fire
    it('TURN_AFTERMATH_CLOCK_VOID does not fire when a turn aftermath raises a clock', async () => {
      const recs569an = Array.from({ length: 10 }, (_, i) =>
        makeRec569(i, {
          dramaticTurn: [1, 3, 5].includes(i) ? 'reversal' : 'nothing',
          clockRaised: [2, 9].includes(i),
        }),
      );
      const res = await runST569(recs569an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TURN_AFTERMATH_CLOCK_VOID'), 'TURN_AFTERMATH_CLOCK_VOID should not fire');
    });

    // TURN_CURIOSITY_DECOUPLED fire:
    // n=8; turns at 1,3; curiosity at 5,6 — no turn scene carries curiosity → fires
    it('TURN_CURIOSITY_DECOUPLED fires when turn scenes and curiosity scenes never overlap', async () => {
      const recs569b = Array.from({ length: 8 }, (_, i) =>
        makeRec569(i, {
          dramaticTurn: [1, 3].includes(i) ? 'recognition' : 'nothing',
          curiosityDelta: [5, 6].includes(i) ? 2 : 0,
        }),
      );
      const res = await runST569(recs569b);
      assert.ok(res.issues.some((i: any) => i.rule === 'TURN_CURIOSITY_DECOUPLED'), 'TURN_CURIOSITY_DECOUPLED should fire');
    });

    // TURN_CURIOSITY_DECOUPLED no-fire:
    // n=8; turns at 1,3; curiosity at 3,6 — turn@3 also carries curiosity → overlap → no fire
    it('TURN_CURIOSITY_DECOUPLED does not fire when a turn scene also raises curiosity', async () => {
      const recs569bn = Array.from({ length: 8 }, (_, i) =>
        makeRec569(i, {
          dramaticTurn: [1, 3].includes(i) ? 'recognition' : 'nothing',
          curiosityDelta: [3, 6].includes(i) ? 2 : 0,
        }),
      );
      const res = await runST569(recs569bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TURN_CURIOSITY_DECOUPLED'), 'TURN_CURIOSITY_DECOUPLED should not fire');
    });

    // MIDPOINT_CLOCK_VOID fire:
    // n=10; midpoint window = scenes 4,5; clocks at 0,9 (≥2, none in midpoint) → fires
    it('MIDPOINT_CLOCK_VOID fires when the 40%-60% midpoint window has no clock while clocks exist elsewhere', async () => {
      const recs569c = Array.from({ length: 10 }, (_, i) =>
        makeRec569(i, { clockRaised: [0, 9].includes(i) }),
      );
      const res = await runST569(recs569c);
      assert.ok(res.issues.some((i: any) => i.rule === 'MIDPOINT_CLOCK_VOID'), 'MIDPOINT_CLOCK_VOID should fire');
    });

    // MIDPOINT_CLOCK_VOID no-fire:
    // n=10; clock at 4 (inside the midpoint window 4-5) and 9 → midpoint has a clock → no fire
    it('MIDPOINT_CLOCK_VOID does not fire when a clock is raised in the midpoint window', async () => {
      const recs569cn = Array.from({ length: 10 }, (_, i) =>
        makeRec569(i, { clockRaised: [4, 9].includes(i) }),
      );
      const res = await runST569(recs569cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'MIDPOINT_CLOCK_VOID'), 'MIDPOINT_CLOCK_VOID should not fire');
    });
  });


  describe('Wave 555 — structurePass: clock suspense decoupled, revelation causeless, turn aftermath emotion void', async () => {
    const makeRec555 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const runST555 = async (records: any[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CLOCK_SUSPENSE_DECOUPLED fires when clock scenes and suspense scenes never overlap', async () => {
      // 10 scenes: clock at 0,1; suspense at 8,9 — zero scenes with both → fire
      const recs555a = Array.from({ length: 10 }, (_, i) =>
        makeRec555(i, {
          clockRaised: [0, 1].includes(i),
          suspenseDelta: [8, 9].includes(i) ? 1 : 0,
        }),
      );
      const res = await runST555(recs555a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_SUSPENSE_DECOUPLED'), 'CLOCK_SUSPENSE_DECOUPLED should fire');
    });

    it('CLOCK_SUSPENSE_DECOUPLED does not fire when at least one scene has both clock and suspense', async () => {
      // 10 scenes: clock at 0,1,5; suspense at 5,8 — scene 5 has both → overlap → no fire
      const recs555an = Array.from({ length: 10 }, (_, i) =>
        makeRec555(i, {
          clockRaised: [0, 1, 5].includes(i),
          suspenseDelta: [5, 8].includes(i) ? 1 : 0,
        }),
      );
      const res = await runST555(recs555an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_SUSPENSE_DECOUPLED'), 'CLOCK_SUSPENSE_DECOUPLED should not fire');
    });

    it('REVELATION_CAUSELESS fires when all revelations at pos≥3 lack prior build-up', async () => {
      // 10 scenes: revelations at 3,5,7; prior 3 of each are all neutral (no suspense/clock/turn) → fire
      const recs555b = Array.from({ length: 10 }, (_, i) =>
        makeRec555(i, {
          revelation: [3, 5, 7].includes(i) ? 'truth revealed' : null,
        }),
      );
      const res = await runST555(recs555b);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_CAUSELESS'), 'REVELATION_CAUSELESS should fire');
    });

    it('REVELATION_CAUSELESS does not fire when at least one revelation is preceded by a suspense spike', async () => {
      // 10 scenes: revelations at 3,5,7; scene 2 has suspenseDelta=1 — prior 3 of revelation at 3 includes a suspense spike → caused → no fire
      const recs555bn = Array.from({ length: 10 }, (_, i) =>
        makeRec555(i, {
          revelation: [3, 5, 7].includes(i) ? 'truth revealed' : null,
          suspenseDelta: i === 2 ? 1 : 0,
        }),
      );
      const res = await runST555(recs555bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_CAUSELESS'), 'REVELATION_CAUSELESS should not fire');
    });

    it('TURN_AFTERMATH_EMOTION_VOID fires when no dramatic turn is followed by emotional shift within 2 scenes', async () => {
      // 10 scenes: turns at 0,2,4 (pos<8); emotional scenes at 8,9 — all outside aftermath windows [1-2],[3-4],[5-6] → fire
      const recs555c = Array.from({ length: 10 }, (_, i) =>
        makeRec555(i, {
          dramaticTurn: [0, 2, 4].includes(i) ? 'reversal' : 'nothing',
          emotionalShift: [8, 9].includes(i) ? 'positive' : 'neutral',
        }),
      );
      const res = await runST555(recs555c);
      assert.ok(res.issues.some((i: any) => i.rule === 'TURN_AFTERMATH_EMOTION_VOID'), 'TURN_AFTERMATH_EMOTION_VOID should fire');
    });

    it('TURN_AFTERMATH_EMOTION_VOID does not fire when a turn is followed by emotional shift within 2 scenes', async () => {
      // 10 scenes: turns at 0,2,4; emotional shift at 1 (within aftermath window of turn at 0) → no fire
      const recs555cn = Array.from({ length: 10 }, (_, i) =>
        makeRec555(i, {
          dramaticTurn: [0, 2, 4].includes(i) ? 'reversal' : 'nothing',
          emotionalShift: i === 1 ? 'positive' : [8, 9].includes(i) ? 'negative' : 'neutral',
        }),
      );
      const res = await runST555(recs555cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TURN_AFTERMATH_EMOTION_VOID'), 'TURN_AFTERMATH_EMOTION_VOID should not fire');
    });
  });


  describe('Wave 541 — structurePass: revelation aftermath suspense void, turn aftermath curiosity void, emotional neutral run', async () => {
    const makeRec541 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const runST541 = async (records: any[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('REVELATION_AFTERMATH_SUSPENSE_VOID fires when no revelation is followed by a suspense spike', async () => {
      // 9 scenes: revelations at 0,2,4 (pos<7); suspense at 7,8 — all outside aftermath windows [1-2],[3-4],[5-6]
      const recs541a = Array.from({ length: 9 }, (_, i) =>
        makeRec541(i, {
          revelation: [0, 2, 4].includes(i) ? 'truth revealed' : null,
          suspenseDelta: [7, 8].includes(i) ? 1 : 0,
        }),
      );
      const res = await runST541(recs541a);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_AFTERMATH_SUSPENSE_VOID'), 'REVELATION_AFTERMATH_SUSPENSE_VOID should fire');
    });

    it('REVELATION_AFTERMATH_SUSPENSE_VOID does not fire when a revelation is followed by a suspense spike', async () => {
      // 9 scenes: revelations at 0,2,4; suspense at 5 (within aftermath window of rev at 4)
      const recs541an = Array.from({ length: 9 }, (_, i) =>
        makeRec541(i, {
          revelation: [0, 2, 4].includes(i) ? 'truth revealed' : null,
          suspenseDelta: [5, 8].includes(i) ? 1 : 0,
        }),
      );
      const res = await runST541(recs541an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_AFTERMATH_SUSPENSE_VOID'), 'REVELATION_AFTERMATH_SUSPENSE_VOID should not fire');
    });

    it('TURN_AFTERMATH_CURIOSITY_VOID fires when no dramatic turn is followed by a curiosity spike', async () => {
      // 9 scenes: turns at 0,2,4 (pos<7); curiosity at 7,8 — outside aftermath windows [1-2],[3-4],[5-6]
      const recs541b = Array.from({ length: 9 }, (_, i) =>
        makeRec541(i, {
          dramaticTurn: [0, 2, 4].includes(i) ? 'reversal' : 'nothing',
          curiosityDelta: [7, 8].includes(i) ? 1 : 0,
        }),
      );
      const res = await runST541(recs541b);
      assert.ok(res.issues.some((i: any) => i.rule === 'TURN_AFTERMATH_CURIOSITY_VOID'), 'TURN_AFTERMATH_CURIOSITY_VOID should fire');
    });

    it('TURN_AFTERMATH_CURIOSITY_VOID does not fire when a turn is followed by a curiosity spike', async () => {
      // 9 scenes: turns at 0,2,4; curiosity at 5 (within aftermath window of turn at 4)
      const recs541bn = Array.from({ length: 9 }, (_, i) =>
        makeRec541(i, {
          dramaticTurn: [0, 2, 4].includes(i) ? 'reversal' : 'nothing',
          curiosityDelta: [5, 8].includes(i) ? 1 : 0,
        }),
      );
      const res = await runST541(recs541bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TURN_AFTERMATH_CURIOSITY_VOID'), 'TURN_AFTERMATH_CURIOSITY_VOID should not fire');
    });

    it('EMOTIONAL_NEUTRAL_RUN fires when 6+ consecutive scenes are all emotionally neutral', async () => {
      // 10 scenes: emotional at 0,1,8,9 (4 charged); neutral run at 2-7 (6 consecutive)
      const recs541c = Array.from({ length: 10 }, (_, i) =>
        makeRec541(i, {
          emotionalShift: [0, 1, 8, 9].includes(i) ? 'positive' : 'neutral',
        }),
      );
      const res = await runST541(recs541c);
      assert.ok(res.issues.some((i: any) => i.rule === 'EMOTIONAL_NEUTRAL_RUN'), 'EMOTIONAL_NEUTRAL_RUN should fire');
    });

    it('EMOTIONAL_NEUTRAL_RUN does not fire when the neutral run is shorter than 6', async () => {
      // 10 scenes: emotional at 0,1,7,8,9 (5 charged); neutral run at 2-6 (5 consecutive)
      const recs541cn = Array.from({ length: 10 }, (_, i) =>
        makeRec541(i, {
          emotionalShift: [0, 1, 7, 8, 9].includes(i) ? 'negative' : 'neutral',
        }),
      );
      const res = await runST541(recs541cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'EMOTIONAL_NEUTRAL_RUN'), 'EMOTIONAL_NEUTRAL_RUN should not fire');
    });
  });


  describe('Wave 527 — structurePass: clock run, turn emotion decoupled, revelation aftermath emotion void', async () => {
    const makeRec527 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const runST527 = async (records: any[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // CLOCK_RUN fire: n=10; clockRaised at 2,3,4,5,6 (5 consecutive) → maxRun=5 → fires
    it('CLOCK_RUN fires when 5+ consecutive scenes all have clockRaised', async () => {
      const recs527a = Array.from({ length: 10 }, (_, i) => makeRec527(i, {
        clockRaised: i >= 2 && i <= 6,
      }));
      const res = await runST527(recs527a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_RUN'), 'CLOCK_RUN should fire');
    });

    // CLOCK_RUN no-fire: clockRaised at 1,3,5,7 (alternating) → maxRun=1 → no fire
    it('CLOCK_RUN does not fire when no 5 consecutive clock scenes exist', async () => {
      const recs527anr = Array.from({ length: 10 }, (_, i) => makeRec527(i, {
        clockRaised: [1, 3, 5, 7].includes(i),
      }));
      const res = await runST527(recs527anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_RUN'), 'CLOCK_RUN should not fire');
    });

    // TURN_EMOTION_DECOUPLED fire: n=10; turns at 1,4; emotional at 7,9 → no overlap → fires
    it('TURN_EMOTION_DECOUPLED fires when dramatic turns and emotional scenes never coincide', async () => {
      const recs527b = Array.from({ length: 10 }, (_, i) => makeRec527(i, {
        dramaticTurn: [1, 4].includes(i) ? 'reversal' : 'nothing',
        emotionalShift: [7, 9].includes(i) ? 'positive' : 'neutral',
      }));
      const res = await runST527(recs527b);
      assert.ok(res.issues.some((i: any) => i.rule === 'TURN_EMOTION_DECOUPLED'), 'TURN_EMOTION_DECOUPLED should fire');
    });

    // TURN_EMOTION_DECOUPLED no-fire: scene 4 has both turn AND emotional → co-occurrence → no fire
    it('TURN_EMOTION_DECOUPLED does not fire when at least one turn scene is also emotionally charged', async () => {
      const recs527bnr = Array.from({ length: 10 }, (_, i) => makeRec527(i, {
        dramaticTurn: [1, 4].includes(i) ? 'reversal' : 'nothing',
        emotionalShift: [4, 7].includes(i) ? 'negative' : 'neutral',
      }));
      const res = await runST527(recs527bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TURN_EMOTION_DECOUPLED'), 'TURN_EMOTION_DECOUPLED should not fire');
    });

    // REVELATION_AFTERMATH_EMOTION_VOID fire: n=10; revelations at 1,3,5; emotional at 8,9 (outside all 2-scene windows)
    it('REVELATION_AFTERMATH_EMOTION_VOID fires when no revelation is followed by emotional charge within 2 scenes', async () => {
      const recs527c = Array.from({ length: 10 }, (_, i) => makeRec527(i, {
        revelation: [1, 3, 5].includes(i) ? 'truth revealed' : null,
        emotionalShift: [8, 9].includes(i) ? 'positive' : 'neutral',
      }));
      const res = await runST527(recs527c);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_AFTERMATH_EMOTION_VOID'), 'REVELATION_AFTERMATH_EMOTION_VOID should fire');
    });

    // REVELATION_AFTERMATH_EMOTION_VOID no-fire: revelation at 1, emotional at 2 → scene 2 is in the window → no fire
    it('REVELATION_AFTERMATH_EMOTION_VOID does not fire when at least one revelation is followed by emotional charge', async () => {
      const recs527cnr = Array.from({ length: 10 }, (_, i) => makeRec527(i, {
        revelation: [1, 3, 5].includes(i) ? 'truth revealed' : null,
        emotionalShift: [2, 9].includes(i) ? 'negative' : 'neutral',
      }));
      const res = await runST527(recs527cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_AFTERMATH_EMOTION_VOID'), 'REVELATION_AFTERMATH_EMOTION_VOID should not fire');
    });
  });


  describe('Wave 513 — structurePass: clock turn decoupled, curiosity run, turn aftermath suspense void', async () => {
    const makeRec513 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const runST513 = async (records: any[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // CLOCK_TURN_DECOUPLED fire: n=10; clocks at 3,7; turns at 1,5 → no co-occurrence → fires
    it('CLOCK_TURN_DECOUPLED fires when clock scenes and dramatic-turn scenes never coincide', async () => {
      const recs513a = Array.from({ length: 10 }, (_, i) => makeRec513(i, {
        clockRaised: [3, 7].includes(i),
        dramaticTurn: [1, 5].includes(i) ? 'reversal' : 'nothing',
      }));
      const res = await runST513(recs513a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_TURN_DECOUPLED'), 'CLOCK_TURN_DECOUPLED should fire');
    });

    // CLOCK_TURN_DECOUPLED no-fire: scene 3 has both clockRaised AND dramaticTurn → co-occurrence → no fire
    it('CLOCK_TURN_DECOUPLED does not fire when at least one scene has both a clock event and a turn', async () => {
      const recs513anr = Array.from({ length: 10 }, (_, i) => makeRec513(i, {
        clockRaised: [3, 7].includes(i),
        dramaticTurn: [3, 5].includes(i) ? 'reversal' : 'nothing',
      }));
      const res = await runST513(recs513anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_TURN_DECOUPLED'), 'CLOCK_TURN_DECOUPLED should not fire');
    });

    // CURIOSITY_RUN fire: n=10; curiosity at 3,4,5,6,7 (run of 5) → totalCuriosity=5≥4, maxRun=5 → fires
    it('CURIOSITY_RUN fires when 5 or more consecutive scenes all spike curiosity', async () => {
      const recs513b = Array.from({ length: 10 }, (_, i) => makeRec513(i, {
        curiosityDelta: i >= 3 && i <= 7 ? 2 : 0,
      }));
      const res = await runST513(recs513b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CURIOSITY_RUN'), 'CURIOSITY_RUN should fire');
    });

    // CURIOSITY_RUN no-fire: curiosity at 2,4,6,8 (alternating) → max run=1 → no fire
    it('CURIOSITY_RUN does not fire when curiosity scenes are non-consecutive', async () => {
      const recs513bnr = Array.from({ length: 10 }, (_, i) => makeRec513(i, {
        curiosityDelta: [2, 4, 6, 8].includes(i) ? 2 : 0,
      }));
      const res = await runST513(recs513bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CURIOSITY_RUN'), 'CURIOSITY_RUN should not fire');
    });

    // TURN_AFTERMATH_SUSPENSE_VOID fire: n=10; turns at 1,3; suspense at 7,8,9 (beyond 2-scene window)
    it('TURN_AFTERMATH_SUSPENSE_VOID fires when no dramatic turn is followed by a suspense spike', async () => {
      const recs513c = Array.from({ length: 10 }, (_, i) => makeRec513(i, {
        dramaticTurn: [1, 3].includes(i) ? 'reversal' : 'nothing',
        suspenseDelta: [7, 8, 9].includes(i) ? 2 : 0,
      }));
      const res = await runST513(recs513c);
      assert.ok(res.issues.some((i: any) => i.rule === 'TURN_AFTERMATH_SUSPENSE_VOID'), 'TURN_AFTERMATH_SUSPENSE_VOID should fire');
    });

    // TURN_AFTERMATH_SUSPENSE_VOID no-fire: suspense at 4 (within 2 of turn at 3) → no fire
    it('TURN_AFTERMATH_SUSPENSE_VOID does not fire when at least one turn is followed by a suspense spike', async () => {
      const recs513cnr = Array.from({ length: 10 }, (_, i) => makeRec513(i, {
        dramaticTurn: [1, 3].includes(i) ? 'reversal' : 'nothing',
        suspenseDelta: [4, 7, 8].includes(i) ? 2 : 0,
      }));
      const res = await runST513(recs513cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TURN_AFTERMATH_SUSPENSE_VOID'), 'TURN_AFTERMATH_SUSPENSE_VOID should not fire');
    });
  });


  describe('Wave 499 — structurePass: clock curiosity decoupled, revelation aftermath clock void, suspense run', async () => {
    const makeRec499 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const runST499 = async (records: any[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CLOCK_CURIOSITY_DECOUPLED fires when clock scenes and curiosity scenes never coincide', async () => {
      // 12 scenes: clock at 3,7 (no curiosity); curiosity at 5,9 (no clock) → no co-occurrence → fires
      const recs499a = Array.from({ length: 12 }, (_, i) => makeRec499(i, {
        clockRaised: [3, 7].includes(i),
        curiosityDelta: [5, 9].includes(i) ? 2 : 0,
      }));
      const res = await runST499(recs499a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_CURIOSITY_DECOUPLED'), 'CLOCK_CURIOSITY_DECOUPLED should fire');
    });

    it('CLOCK_CURIOSITY_DECOUPLED does not fire when a clock scene also spikes curiosity', async () => {
      // 12 scenes: scene 5 has clockRaised AND curiosityDelta > 0 → co-occurrence → no fire
      const recs499anr = Array.from({ length: 12 }, (_, i) => makeRec499(i, {
        clockRaised: [3, 5].includes(i),
        curiosityDelta: [5, 9].includes(i) ? 2 : 0,
      }));
      const res = await runST499(recs499anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_CURIOSITY_DECOUPLED'), 'CLOCK_CURIOSITY_DECOUPLED should not fire');
    });

    it('REVELATION_AFTERMATH_CLOCK_VOID fires when no revelation is followed by a clock raise in the next 2 scenes', async () => {
      // 10 scenes: revelations at 1,3,5 (all pos < 8=n-2); clock at 8,9 (beyond the 2-scene window of any revelation) → fires
      const recs499b = Array.from({ length: 10 }, (_, i) => makeRec499(i, {
        revelation: [1, 3, 5].includes(i) ? 'a disclosure' : null,
        clockRaised: [8, 9].includes(i),
      }));
      const res = await runST499(recs499b);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_AFTERMATH_CLOCK_VOID'), 'REVELATION_AFTERMATH_CLOCK_VOID should fire');
    });

    it('REVELATION_AFTERMATH_CLOCK_VOID does not fire when a revelation is followed by a clock raise within 2 scenes', async () => {
      // 10 scenes: revelations at 1,3,5; clock at 7 (pos 5+2=7, within window of revelation at 5) and 9 → no fire
      const recs499bnr = Array.from({ length: 10 }, (_, i) => makeRec499(i, {
        revelation: [1, 3, 5].includes(i) ? 'a disclosure' : null,
        clockRaised: [7, 9].includes(i),
      }));
      const res = await runST499(recs499bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_AFTERMATH_CLOCK_VOID'), 'REVELATION_AFTERMATH_CLOCK_VOID should not fire');
    });

    it('SUSPENSE_RUN fires when 5 or more consecutive scenes all spike suspense', async () => {
      // 10 scenes: scenes 3-7 all have suspenseDelta > 0 (run of 5) → fires
      const recs499c = Array.from({ length: 10 }, (_, i) => makeRec499(i, {
        suspenseDelta: i >= 3 && i <= 7 ? 2 : 0,
      }));
      const res = await runST499(recs499c);
      assert.ok(res.issues.some((i: any) => i.rule === 'SUSPENSE_RUN'), 'SUSPENSE_RUN should fire');
    });

    it('SUSPENSE_RUN does not fire when suspense scenes are non-consecutive', async () => {
      // 10 scenes: suspenseDelta > 0 at 2,4,6,8 (alternating, max run = 1) → no fire
      const recs499cnr = Array.from({ length: 10 }, (_, i) => makeRec499(i, {
        suspenseDelta: [2, 4, 6, 8].includes(i) ? 2 : 0,
      }));
      const res = await runST499(recs499cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SUSPENSE_RUN'), 'SUSPENSE_RUN should not fire');
    });
  });


  describe('Wave 485 — structurePass: negative scene run, revelation clock decoupled, climax aftermath flat', async () => {
    const makeRec485 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const runST485 = async (records: any[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('NEGATIVE_SCENE_RUN fires when 5 or more consecutive scenes are emotionally negative', async () => {
      // 10 scenes: scenes 3-7 all negative (5 consecutive) → fires
      const recs485a = Array.from({ length: 10 }, (_, i) =>
        makeRec485(i, { emotionalShift: i >= 3 && i <= 7 ? 'negative' : 'neutral' }),
      );
      const res = await runST485(recs485a);
      assert.ok(res.issues.some((i: any) => i.rule === 'NEGATIVE_SCENE_RUN'), 'NEGATIVE_SCENE_RUN should fire');
    });

    it('NEGATIVE_SCENE_RUN does not fire when negative scenes are not consecutive', async () => {
      // 10 scenes: negative at 2,4,6,8 — none consecutive → max run = 1 → no fire
      const recs485anr = Array.from({ length: 10 }, (_, i) =>
        makeRec485(i, { emotionalShift: [2, 4, 6, 8].includes(i) ? 'negative' : 'neutral' }),
      );
      const res = await runST485(recs485anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'NEGATIVE_SCENE_RUN'), 'NEGATIVE_SCENE_RUN should not fire');
    });

    it('REVELATION_CLOCK_DECOUPLED fires when revelations and clock scenes never coincide', async () => {
      // 12 scenes: revelations at 3,7 (no clock); clock at 5,9 (no revelation) → fires
      const recs485b = Array.from({ length: 12 }, (_, i) => makeRec485(i));
      recs485b[3] = makeRec485(3, { revelation: 'the truth' });
      recs485b[5] = makeRec485(5, { clockRaised: true });
      recs485b[7] = makeRec485(7, { revelation: 'another truth' });
      recs485b[9] = makeRec485(9, { clockDelta: 1 });
      const res = await runST485(recs485b);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_CLOCK_DECOUPLED'), 'REVELATION_CLOCK_DECOUPLED should fire');
    });

    it('REVELATION_CLOCK_DECOUPLED does not fire when a revelation coincides with a clock event', async () => {
      // 12 scenes: scene 5 has both revelation and clockRaised → co-occurrence → no fire
      const recs485bnr = Array.from({ length: 12 }, (_, i) => makeRec485(i));
      recs485bnr[3] = makeRec485(3, { revelation: 'truth A' });
      recs485bnr[5] = makeRec485(5, { revelation: 'truth B', clockRaised: true });
      recs485bnr[9] = makeRec485(9, { clockDelta: 1 });
      const res = await runST485(recs485bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_CLOCK_DECOUPLED'), 'REVELATION_CLOCK_DECOUPLED should not fire');
    });

    it('CLIMAX_AFTERMATH_FLAT fires when the finale peak is followed by 2 emotionally/relationally flat scenes', async () => {
      // 10 scenes: peak at scene 7 (suspenseDelta=5, in final 30% = scene 7-9); scenes 8,9 both neutral/no shifts → fires
      const recs485c = Array.from({ length: 10 }, (_, i) => makeRec485(i));
      recs485c[7] = makeRec485(7, { suspenseDelta: 5 });
      // scenes 8,9 stay neutral (default) → no aftermath → fires
      const res = await runST485(recs485c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLIMAX_AFTERMATH_FLAT'), 'CLIMAX_AFTERMATH_FLAT should fire');
    });

    it('CLIMAX_AFTERMATH_FLAT does not fire when the finale peak is followed by an emotional shift', async () => {
      // 10 scenes: peak at scene 7; scene 8 has emotionalShift='negative' → aftermath present → no fire
      const recs485cnr = Array.from({ length: 10 }, (_, i) => makeRec485(i));
      recs485cnr[7] = makeRec485(7, { suspenseDelta: 5 });
      recs485cnr[8] = makeRec485(8, { emotionalShift: 'negative' });
      const res = await runST485(recs485cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLIMAX_AFTERMATH_FLAT'), 'CLIMAX_AFTERMATH_FLAT should not fire');
    });
  });


  describe('Wave 471 — structurePass: curiosity peak emotional void, positive scene run, revelation turn decoupled', async () => {
    const makeRec471 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const runST471 = async (records: any[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CURIOSITY_PEAK_EMOTIONAL_VOID fires when peak curiosityDelta scene is emotionally neutral', async () => {
      // 8 scenes: scene 3 has max curiosityDelta=4 but emotionalShift='neutral'; scenes 1,6 are non-neutral
      const recs471a = Array.from({ length: 8 }, (_, i) =>
        makeRec471(i, {
          curiosityDelta: i === 3 ? 4 : 0,
          emotionalShift: i === 1 ? 'positive' : i === 6 ? 'negative' : 'neutral',
        }),
      );
      const res = await runST471(recs471a);
      assert.ok(res.issues.some((is: any) => is.rule === 'CURIOSITY_PEAK_EMOTIONAL_VOID'), 'CURIOSITY_PEAK_EMOTIONAL_VOID should fire');
    });

    it('CURIOSITY_PEAK_EMOTIONAL_VOID does not fire when peak curiosity scene has emotional charge', async () => {
      // 8 scenes: scene 3 has max curiosityDelta=4 AND emotionalShift='positive' → no fire
      const recs471anr = Array.from({ length: 8 }, (_, i) =>
        makeRec471(i, {
          curiosityDelta: i === 3 ? 4 : 0,
          emotionalShift: i === 3 ? 'positive' : i === 6 ? 'negative' : 'neutral',
        }),
      );
      const res = await runST471(recs471anr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'CURIOSITY_PEAK_EMOTIONAL_VOID'), 'CURIOSITY_PEAK_EMOTIONAL_VOID should not fire');
    });

    it('POSITIVE_SCENE_RUN fires when 5+ consecutive scenes are emotionally positive', async () => {
      // 8 scenes: scenes 1-5 all positive (run of 5), scene 0 neutral, scenes 6-7 neutral → fire
      const recs471b = Array.from({ length: 8 }, (_, i) =>
        makeRec471(i, { emotionalShift: [1, 2, 3, 4, 5].includes(i) ? 'positive' : 'neutral' }),
      );
      const res = await runST471(recs471b);
      assert.ok(res.issues.some((is: any) => is.rule === 'POSITIVE_SCENE_RUN'), 'POSITIVE_SCENE_RUN should fire');
    });

    it('POSITIVE_SCENE_RUN does not fire when max consecutive positive run is only 4', async () => {
      // 8 scenes: scenes 0-3 positive (run 4), scene 4 negative, scenes 5-7 positive (run 3)
      const recs471bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec471(i, { emotionalShift: i === 4 ? 'negative' : 'positive' }),
      );
      const res = await runST471(recs471bnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'POSITIVE_SCENE_RUN'), 'POSITIVE_SCENE_RUN should not fire');
    });

    it('REVELATION_TURN_DECOUPLED fires when no scene carries both revelation and a dramatic turn', async () => {
      // 10 scenes: revelations at 1,3; turns at 5,7; never in the same scene → fire
      const recs471c = Array.from({ length: 10 }, (_, i) =>
        makeRec471(i, {
          revelation: [1, 3].includes(i) ? true : null,
          dramaticTurn: [5, 7].includes(i) ? 'reversal' : 'nothing',
        }),
      );
      const res = await runST471(recs471c);
      assert.ok(res.issues.some((is: any) => is.rule === 'REVELATION_TURN_DECOUPLED'), 'REVELATION_TURN_DECOUPLED should fire');
    });

    it('REVELATION_TURN_DECOUPLED does not fire when at least one scene carries both revelation and dramatic turn', async () => {
      // 10 scenes: scene 3 has both revelation and turn → co-occurring → no fire
      const recs471cnr = Array.from({ length: 10 }, (_, i) =>
        makeRec471(i, {
          revelation: [1, 3].includes(i) ? true : null,
          dramaticTurn: [3, 7].includes(i) ? 'reversal' : 'nothing',
        }),
      );
      const res = await runST471(recs471cnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'REVELATION_TURN_DECOUPLED'), 'REVELATION_TURN_DECOUPLED should not fire');
    });
  });


  describe('Wave 457 — structurePass: revelation suspense decoupled, negative scene drought, dramatic turn causeless', async () => {
    const makeRec457 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null, dramaticTurn: 'nothing',
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development',
      ...overrides,
    });
    const makeFountain457 = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        `INT. SC${i} - DAY\n\nAction line for scene ${i}.`
      ).join('\n\n');
    const runST457 = async (records: any[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      const fountain = makeFountain457(records.length);
      return structurePass({ fountain, original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('REVELATION_SUSPENSE_DECOUPLED fires when all revelation scenes have suspenseDelta ≤ 0', async () => {
      // 8 scenes: revelations at 2 and 5 (both suspenseDelta=0) → all revelations suspense-flat
      const recs457a = Array.from({ length: 8 }, (_, i) =>
        makeRec457(i, {
          revelation: [2, 5].includes(i) ? true : null,
          suspenseDelta: 0,
        }),
      );
      const res = await runST457(recs457a);
      assert.ok(res.issues.some((is: any) => is.rule === 'REVELATION_SUSPENSE_DECOUPLED'), 'REVELATION_SUSPENSE_DECOUPLED should fire');
    });

    it('REVELATION_SUSPENSE_DECOUPLED does not fire when at least one revelation has suspenseDelta > 0', async () => {
      // 8 scenes: revelation at 2 (suspenseDelta=0) and 5 (suspenseDelta=2) → one is tensioned → no fire
      const recs457anr = Array.from({ length: 8 }, (_, i) =>
        makeRec457(i, {
          revelation: [2, 5].includes(i) ? true : null,
          suspenseDelta: i === 5 ? 2 : 0,
        }),
      );
      const res = await runST457(recs457anr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'REVELATION_SUSPENSE_DECOUPLED'), 'REVELATION_SUSPENSE_DECOUPLED should not fire');
    });

    it('NEGATIVE_SCENE_DROUGHT fires when <15% of scenes are negative while ≥3 are positive', async () => {
      // 10 scenes: 4 positive, 0 negative → negativeRatio=0% < 15%, positiveCount≥3 → fires
      const recs457b = Array.from({ length: 10 }, (_, i) =>
        makeRec457(i, {
          emotionalShift: [1, 3, 5, 7].includes(i) ? 'positive' : 'neutral',
        }),
      );
      const res = await runST457(recs457b);
      assert.ok(res.issues.some((is: any) => is.rule === 'NEGATIVE_SCENE_DROUGHT'), 'NEGATIVE_SCENE_DROUGHT should fire');
    });

    it('NEGATIVE_SCENE_DROUGHT does not fire when ≥15% of scenes are negative', async () => {
      // 10 scenes: 3 positive, 2 negative → negativeRatio=20% ≥ 15% → no fire
      const recs457bnr = Array.from({ length: 10 }, (_, i) =>
        makeRec457(i, {
          emotionalShift: [1, 3, 5].includes(i) ? 'positive' : [7, 9].includes(i) ? 'negative' : 'neutral',
        }),
      );
      const res = await runST457(recs457bnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'NEGATIVE_SCENE_DROUGHT'), 'NEGATIVE_SCENE_DROUGHT should not fire');
    });

    it('DRAMATIC_TURN_CAUSELESS fires when all turns lack upstream revelation/suspense/clock', async () => {
      // 8 scenes: turns at 4 and 6; prior 3 scenes (1-3 and 3-5) have no revelation/suspense/clock
      const recs457c = Array.from({ length: 8 }, (_, i) =>
        makeRec457(i, {
          dramaticTurn: [4, 6].includes(i) ? 'reversal' : 'nothing',
        }),
      );
      const res = await runST457(recs457c);
      assert.ok(res.issues.some((is: any) => is.rule === 'DRAMATIC_TURN_CAUSELESS'), 'DRAMATIC_TURN_CAUSELESS should fire');
    });

    it('DRAMATIC_TURN_CAUSELESS does not fire when at least one turn has a revelation in prior 3 scenes', async () => {
      // 8 scenes: turn at 4; scene 3 has revelation=true → upstream cause → no fire
      const recs457cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec457(i, {
          dramaticTurn: [4, 6].includes(i) ? 'reversal' : 'nothing',
          revelation: i === 3 ? true : null,
        }),
      );
      const res = await runST457(recs457cnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DRAMATIC_TURN_CAUSELESS'), 'DRAMATIC_TURN_CAUSELESS should not fire');
    });
  });


  describe('Wave 443 — structurePass: revelation-curiosity decoupled, peak suspense emotional vacuum, positive scene drought', async () => {
    const makeRec443 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null, dramaticTurn: null,
      purpose: 'development', relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      ...overrides,
    });
    const runS443 = async (recs: any[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({ fountain: '', original: '', records: recs, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('REVELATION_CURIOSITY_DECOUPLED fires when no revelation scene has curiosityDelta > 0', async () => {
      // 10 scenes: 3 revelations (curiosityDelta=0), 3 curiosity spikes (no revelation), never co-occurring
      const recs443a = Array.from({ length: 10 }, (_, i) => makeRec443(i));
      recs443a[1] = makeRec443(1, { revelation: 'The killer is revealed.', curiosityDelta: 0 });
      recs443a[3] = makeRec443(3, { revelation: 'The motive is disclosed.', curiosityDelta: 0 });
      recs443a[5] = makeRec443(5, { revelation: 'The secret is out.', curiosityDelta: 0 });
      recs443a[2] = makeRec443(2, { curiosityDelta: 1.5 });
      recs443a[6] = makeRec443(6, { curiosityDelta: 2.0 });
      recs443a[8] = makeRec443(8, { curiosityDelta: 1.0 });
      const res = await runS443(recs443a);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_CURIOSITY_DECOUPLED'), 'REVELATION_CURIOSITY_DECOUPLED should fire');
    });

    it('REVELATION_CURIOSITY_DECOUPLED does NOT fire when at least one revelation scene has curiosityDelta > 0', async () => {
      const recs443aNF = Array.from({ length: 10 }, (_, i) => makeRec443(i));
      recs443aNF[1] = makeRec443(1, { revelation: 'The killer is revealed.', curiosityDelta: 1.5 }); // co-occurs!
      recs443aNF[3] = makeRec443(3, { revelation: 'The motive is disclosed.', curiosityDelta: 0 });
      recs443aNF[5] = makeRec443(5, { curiosityDelta: 2.0 });
      recs443aNF[7] = makeRec443(7, { curiosityDelta: 1.0 });
      const res = await runS443(recs443aNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_CURIOSITY_DECOUPLED'), 'REVELATION_CURIOSITY_DECOUPLED should not fire');
    });

    it('PEAK_SUSPENSE_EMOTIONAL_VACUUM fires when the single highest-suspense scene is emotionally neutral', async () => {
      // 8 scenes: peak suspense at idx 5 (suspenseDelta=3.5, neutral), 2 emotional scenes elsewhere
      const recs443b = Array.from({ length: 8 }, (_, i) => makeRec443(i));
      recs443b[2] = makeRec443(2, { emotionalShift: 'positive' });
      recs443b[4] = makeRec443(4, { emotionalShift: 'negative' });
      recs443b[5] = makeRec443(5, { suspenseDelta: 3.5, emotionalShift: 'neutral' }); // peak, but neutral
      recs443b[6] = makeRec443(6, { suspenseDelta: 1.2 });
      const res = await runS443(recs443b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PEAK_SUSPENSE_EMOTIONAL_VACUUM'), 'PEAK_SUSPENSE_EMOTIONAL_VACUUM should fire');
    });

    it('PEAK_SUSPENSE_EMOTIONAL_VACUUM does NOT fire when the peak suspense scene carries an emotional charge', async () => {
      // Peak suspense scene has emotionalShift = 'negative'
      const recs443bNF = Array.from({ length: 8 }, (_, i) => makeRec443(i));
      recs443bNF[2] = makeRec443(2, { emotionalShift: 'positive' });
      recs443bNF[4] = makeRec443(4, { emotionalShift: 'negative' });
      recs443bNF[5] = makeRec443(5, { suspenseDelta: 3.5, emotionalShift: 'negative' }); // peak with charge
      const res = await runS443(recs443bNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PEAK_SUSPENSE_EMOTIONAL_VACUUM'), 'PEAK_SUSPENSE_EMOTIONAL_VACUUM should not fire');
    });

    it('POSITIVE_SCENE_DROUGHT fires when <15% of scenes are positive while ≥3 are negative', async () => {
      // 12 scenes: 1 positive (8%), 4 negative — below 15% threshold
      const recs443c = Array.from({ length: 12 }, (_, i) => makeRec443(i));
      recs443c[0] = makeRec443(0, { emotionalShift: 'positive' }); // only positive scene
      recs443c[2] = makeRec443(2, { emotionalShift: 'negative' });
      recs443c[4] = makeRec443(4, { emotionalShift: 'negative' });
      recs443c[7] = makeRec443(7, { emotionalShift: 'negative' });
      recs443c[9] = makeRec443(9, { emotionalShift: 'negative' });
      const res = await runS443(recs443c);
      assert.ok(res.issues.some((i: any) => i.rule === 'POSITIVE_SCENE_DROUGHT'), 'POSITIVE_SCENE_DROUGHT should fire');
    });

    it('POSITIVE_SCENE_DROUGHT does NOT fire when positive scenes reach ≥15% of total', async () => {
      // 10 scenes: 2 positive (20%) — above 15% threshold
      const recs443cNF = Array.from({ length: 10 }, (_, i) => makeRec443(i));
      recs443cNF[1] = makeRec443(1, { emotionalShift: 'positive' });
      recs443cNF[4] = makeRec443(4, { emotionalShift: 'positive' });
      recs443cNF[6] = makeRec443(6, { emotionalShift: 'negative' });
      recs443cNF[8] = makeRec443(8, { emotionalShift: 'negative' });
      recs443cNF[9] = makeRec443(9, { emotionalShift: 'negative' });
      const res = await runS443(recs443cNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'POSITIVE_SCENE_DROUGHT'), 'POSITIVE_SCENE_DROUGHT should not fire');
    });
  });


  describe('Wave 429 — structurePass: inciting aftermath stall, climax unprepared, purpose monotone run', async () => {
    const makeRec429 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runST429 = async (records: any[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({ fountain: '', original: '', records, structure: { completionPercent: 100, actPosition: 'act3' } as any, annotations: [], approvedSpans: [] });
    };

    it('INCITING_AFTERMATH_STALL fires when the first early catalyst is followed by two flat scenes', async () => {
      // n=10; catalyst (revelation) at scene 1; scenes 2,3 flat (default) → fires
      const recs429a = Array.from({ length: 10 }, (_, i) => makeRec429(i, i === 1 ? { revelation: 'a truth' } : {}));
      const res = await runST429(recs429a);
      assert.ok(res.issues.some((i: any) => i.rule === 'INCITING_AFTERMATH_STALL'), 'INCITING_AFTERMATH_STALL should fire');
    });

    it('INCITING_AFTERMATH_STALL does NOT fire when the catalyst sparks curiosity in its aftermath', async () => {
      // n=10; catalyst at scene 1; scene 2 raises curiosity → aftermath not flat → no fire
      const recs429aNF = Array.from({ length: 10 }, (_, i) => {
        if (i === 1) return makeRec429(i, { revelation: 'a truth' });
        if (i === 2) return makeRec429(i, { curiosityDelta: 2 });
        return makeRec429(i);
      });
      const res = await runST429(recs429aNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'INCITING_AFTERMATH_STALL'), 'INCITING_AFTERMATH_STALL should not fire');
    });

    it('CLIMAX_UNPREPARED fires when the climax run-up carries no revelation or turn while devices exist elsewhere', async () => {
      // n=10; climax peak (suspense 3) at scene 8; run-up scenes 6,7,8 have no device;
      // revelation at scene 1 + turn at scene 3 → deviceScenes=2 → fires
      const recs429b = Array.from({ length: 10 }, (_, i) => {
        if (i === 8) return makeRec429(i, { suspenseDelta: 3 });
        if (i === 1) return makeRec429(i, { revelation: 'a truth' });
        if (i === 3) return makeRec429(i, { dramaticTurn: 'reversal' });
        return makeRec429(i);
      });
      const res = await runST429(recs429b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLIMAX_UNPREPARED'), 'CLIMAX_UNPREPARED should fire');
    });

    it('CLIMAX_UNPREPARED does NOT fire when a dramatic turn lands in the climax run-up', async () => {
      // n=10; climax peak at scene 8; turn at scene 7 (in run-up window 6-8); revelation at scene 1 → no fire
      const recs429bNF = Array.from({ length: 10 }, (_, i) => {
        if (i === 8) return makeRec429(i, { suspenseDelta: 3 });
        if (i === 7) return makeRec429(i, { dramaticTurn: 'reversal' });
        if (i === 1) return makeRec429(i, { revelation: 'a truth' });
        return makeRec429(i);
      });
      const res = await runST429(recs429bNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLIMAX_UNPREPARED'), 'CLIMAX_UNPREPARED should not fire');
    });

    it('PURPOSE_MONOTONE_RUN fires when 5+ consecutive scenes share one purpose', async () => {
      // n=10; scenes 2-7 (6 in a row) all 'investigation', rest 'development' → run=6 → fires
      const recs429c = Array.from({ length: 10 }, (_, i) =>
        makeRec429(i, { purpose: i >= 2 && i <= 7 ? 'investigation' : 'development' })
      );
      const res = await runST429(recs429c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PURPOSE_MONOTONE_RUN'), 'PURPOSE_MONOTONE_RUN should fire');
    });

    it('PURPOSE_MONOTONE_RUN does NOT fire when purposes alternate without a run of 5', async () => {
      // n=10; purpose alternates every scene → max run = 1 → no fire
      const recs429cNF = Array.from({ length: 10 }, (_, i) =>
        makeRec429(i, { purpose: i % 2 === 0 ? 'development' : 'investigation' })
      );
      const res = await runST429(recs429cNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PURPOSE_MONOTONE_RUN'), 'PURPOSE_MONOTONE_RUN should not fire');
    });
  });


  describe('Wave 415 — structurePass: Act 1 suspense void, Act 2a dramatic turn void, Act 2b dramatic turn void', async () => {
    const makeRec415 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runST415 = async (records: any[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({ fountain: '', original: '', records, structure: { completionPercent: 100, actPosition: 'act3' } as any, annotations: [], approvedSpans: [] });
    };

    it('ACT1_SUSPENSE_VOID fires when Act 1 has no suspense spike while the story spikes elsewhere', async () => {
      // n=12, Act1 = scenes 0-2 (all flat); scene 6 spikes suspense → fires
      const recs415a = Array.from({ length: 12 }, (_, i) => makeRec415(i, { suspenseDelta: i === 6 ? 2 : 0 }));
      const res = await runST415(recs415a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACT1_SUSPENSE_VOID'), 'ACT1_SUSPENSE_VOID should fire');
    });

    it('ACT1_SUSPENSE_VOID does NOT fire when Act 1 carries a suspense spike', async () => {
      // Scene 1 (Act 1) spikes suspense → no fire
      const recs415aNF = Array.from({ length: 12 }, (_, i) => makeRec415(i, { suspenseDelta: [1, 6].includes(i) ? 2 : 0 }));
      const res = await runST415(recs415aNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACT1_SUSPENSE_VOID'), 'ACT1_SUSPENSE_VOID should not fire');
    });

    it('ACT2A_DRAMATIC_TURN_VOID fires when Act 2a has no turn while turns land elsewhere', async () => {
      // n=12, Act2a = scenes 3-5 (no turn); turns at scenes 1,8 → fires
      const recs415b = Array.from({ length: 12 }, (_, i) => makeRec415(i, { dramaticTurn: [1, 8].includes(i) ? 'reversal' : 'nothing' }));
      const res = await runST415(recs415b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACT2A_DRAMATIC_TURN_VOID'), 'ACT2A_DRAMATIC_TURN_VOID should fire');
    });

    it('ACT2A_DRAMATIC_TURN_VOID does NOT fire when Act 2a carries a turn', async () => {
      // Turn inside Act 2a (scene 4); turns also at 1,8 → no fire
      const recs415bNF = Array.from({ length: 12 }, (_, i) => makeRec415(i, { dramaticTurn: [1, 4, 8].includes(i) ? 'reversal' : 'nothing' }));
      const res = await runST415(recs415bNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACT2A_DRAMATIC_TURN_VOID'), 'ACT2A_DRAMATIC_TURN_VOID should not fire');
    });

    it('ACT2B_DRAMATIC_TURN_VOID fires when Act 2b has no turn while turns land elsewhere', async () => {
      // n=12, Act2b = scenes 6-8 (no turn); turns at scenes 1,10 → fires
      const recs415c = Array.from({ length: 12 }, (_, i) => makeRec415(i, { dramaticTurn: [1, 10].includes(i) ? 'reversal' : 'nothing' }));
      const res = await runST415(recs415c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACT2B_DRAMATIC_TURN_VOID'), 'ACT2B_DRAMATIC_TURN_VOID should fire');
    });

    it('ACT2B_DRAMATIC_TURN_VOID does NOT fire when Act 2b carries a turn', async () => {
      // Turn inside Act 2b (scene 7); turns also at 1,10 → no fire
      const recs415cNF = Array.from({ length: 12 }, (_, i) => makeRec415(i, { dramaticTurn: [1, 7, 10].includes(i) ? 'reversal' : 'nothing' }));
      const res = await runST415(recs415cNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACT2B_DRAMATIC_TURN_VOID'), 'ACT2B_DRAMATIC_TURN_VOID should not fire');
    });
  });


  describe('Wave 401 — structurePass: Act 2b curiosity void, midpoint dramatic turn void, Act 3 suspense void', async () => {
    const makeRec401 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runST401 = async (records: any[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({ fountain: '', original: '', records, structure: { completionPercent: 100, actPosition: 'act3' } as any, annotations: [], approvedSpans: [] });
    };

    it('ACT2B_CURIOSITY_VOID fires when Act 2b has no curiosity while story otherwise curious', async () => {
      // n=12, Act 2b = scenes 6-8; curiosity only at scenes 1,4 (Act 2a) → fires
      const recs401a = Array.from({ length: 12 }, (_, i) => makeRec401(i, {
        curiosityDelta: [1, 4].includes(i) ? 1.5 : 0,
      }));
      const res = await runST401(recs401a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACT2B_CURIOSITY_VOID'), 'ACT2B_CURIOSITY_VOID should fire');
    });

    it('ACT2B_CURIOSITY_VOID does not fire when Act 2b has a curiosity-raising scene', async () => {
      // n=12, Act 2b = scenes 6-8; curiosity at scene 7 (Act 2b) → no fire
      const recs401anr = Array.from({ length: 12 }, (_, i) => makeRec401(i, {
        curiosityDelta: [1, 7].includes(i) ? 1.5 : 0,
      }));
      const res = await runST401(recs401anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACT2B_CURIOSITY_VOID'), 'ACT2B_CURIOSITY_VOID should not fire');
    });

    it('MIDPOINT_DRAMATIC_TURN_VOID fires when no turn in midpoint zone while 2+ turns exist elsewhere', async () => {
      // n=10, midzone=scenes 4-5; turns at scenes 1,8 (outside midzone) → fires
      const recs401b = Array.from({ length: 10 }, (_, i) => makeRec401(i, {
        dramaticTurn: [1, 8].includes(i) ? 'reversal' : 'nothing',
      }));
      const res = await runST401(recs401b);
      assert.ok(res.issues.some((i: any) => i.rule === 'MIDPOINT_DRAMATIC_TURN_VOID'), 'MIDPOINT_DRAMATIC_TURN_VOID should fire');
    });

    it('MIDPOINT_DRAMATIC_TURN_VOID does not fire when a turn lands in the midpoint zone', async () => {
      // n=10, midzone=scenes 4-5; turn at scene 5 (in midzone) + scene 1 → no fire
      const recs401bnr = Array.from({ length: 10 }, (_, i) => makeRec401(i, {
        dramaticTurn: [1, 5].includes(i) ? 'reversal' : 'nothing',
      }));
      const res = await runST401(recs401bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'MIDPOINT_DRAMATIC_TURN_VOID'), 'MIDPOINT_DRAMATIC_TURN_VOID should not fire');
    });

    it('ACT3_SUSPENSE_VOID fires when Act 3 has no suspense spike while story has suspense elsewhere', async () => {
      // n=12, Act 3 = scenes 9-11; suspense only at scenes 2,5 (Acts 1/2) → fires
      const recs401c = Array.from({ length: 12 }, (_, i) => makeRec401(i, {
        suspenseDelta: [2, 5].includes(i) ? 2 : 0,
      }));
      const res = await runST401(recs401c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACT3_SUSPENSE_VOID'), 'ACT3_SUSPENSE_VOID should fire');
    });

    it('ACT3_SUSPENSE_VOID does not fire when Act 3 has a suspense spike', async () => {
      // n=12, Act 3 = scenes 9-11; suspense at scene 10 (Act 3) → no fire
      const recs401cnr = Array.from({ length: 12 }, (_, i) => makeRec401(i, {
        suspenseDelta: [2, 10].includes(i) ? 2 : 0,
      }));
      const res = await runST401(recs401cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACT3_SUSPENSE_VOID'), 'ACT3_SUSPENSE_VOID should not fire');
    });
  });


  describe('Wave 306 — structurePass: midpoint emotional flatline, final image weak, act balance extreme', async () => {
    const makeRec306 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runST306 = async (records: any[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('MIDPOINT_EMOTIONAL_FLATLINE fires when the midpoint scene is neutral with no suspense', async () => {
      // 8 scenes: midpoint = idx 4; make it neutral + suspenseDelta 0, others charged
      const recs306mf = Array.from({ length: 8 }, (_, i) =>
        makeRec306(i, {
          suspenseDelta: i === 4 ? 0 : 1.5,
          emotionalShift: i === 4 ? 'neutral' : 'negative',
        })
      );
      const res = await runST306(recs306mf);
      assert.ok(res.issues.some((i: any) => i.rule === 'MIDPOINT_EMOTIONAL_FLATLINE'), 'MIDPOINT_EMOTIONAL_FLATLINE should fire');
    });

    it('MIDPOINT_EMOTIONAL_FLATLINE does not fire when the midpoint carries charge', async () => {
      const recs306nmf = Array.from({ length: 8 }, (_, i) =>
        makeRec306(i, {
          suspenseDelta: i === 4 ? 2 : 0.5,
          emotionalShift: i === 4 ? 'negative' : 'neutral',
        })
      );
      const res = await runST306(recs306nmf);
      assert.ok(!res.issues.some((i: any) => i.rule === 'MIDPOINT_EMOTIONAL_FLATLINE'), 'MIDPOINT_EMOTIONAL_FLATLINE should not fire');
    });

    it('FINAL_IMAGE_WEAK fires when the last scene has no charge on any channel', async () => {
      const recs306fw = Array.from({ length: 8 }, (_, i) =>
        makeRec306(i, {
          suspenseDelta: i === 7 ? 0 : 1.5,
          emotionalShift: i === 7 ? 'neutral' : 'negative',
        })
      );
      const res = await runST306(recs306fw);
      assert.ok(res.issues.some((i: any) => i.rule === 'FINAL_IMAGE_WEAK'), 'FINAL_IMAGE_WEAK should fire');
    });

    it('FINAL_IMAGE_WEAK does not fire when the last scene carries an emotional charge', async () => {
      const recs306nfw = Array.from({ length: 8 }, (_, i) =>
        makeRec306(i, {
          emotionalShift: i === 7 ? 'positive' : 'neutral',
          suspenseDelta: 0,
        })
      );
      const res = await runST306(recs306nfw);
      assert.ok(!res.issues.some((i: any) => i.rule === 'FINAL_IMAGE_WEAK'), 'FINAL_IMAGE_WEAK should not fire');
    });

    it('ACT_BALANCE_EXTREME fires when one act holds >55% of all scenes', async () => {
      // 12 scenes but make Act 3 dominant: sceneIdx values concentrated in 75-100% zone
      // n=12 → act3 = sceneIdx >= 9. Put 7 of 12 scenes at idx >= 9 by overriding sceneIdx.
      const recs306ab = [
        makeRec306(0), makeRec306(1), makeRec306(2),
        makeRec306(9), makeRec306(9), makeRec306(10), makeRec306(10),
        makeRec306(11), makeRec306(11), makeRec306(11), makeRec306(11), makeRec306(11),
      ];
      const res = await runST306(recs306ab);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACT_BALANCE_EXTREME'), 'ACT_BALANCE_EXTREME should fire');
    });

    it('ACT_BALANCE_EXTREME does not fire for a balanced three-act distribution', async () => {
      // 12 scenes evenly spread so Act 2 (~50%) is largest but not >55%
      const recs306nab = Array.from({ length: 12 }, (_, i) => makeRec306(i));
      const res = await runST306(recs306nab);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACT_BALANCE_EXTREME'), 'ACT_BALANCE_EXTREME should not fire');
    });
  });


  describe('Wave 387 — structurePass: Act 1 emotional flatline, Act 2a curiosity void, Act 2 dramatic turn absent', async () => {
    const makeRec387 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runST387 = async (records: any[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ACT1_EMOTIONAL_FLATLINE fires when the whole first 25% is neutral while emotion exists elsewhere', async () => {
      // n=12 → Act 1 = scenes 0-2 (all neutral); scene 6 charged
      const recs387ef = Array.from({ length: 12 }, (_, i) =>
        makeRec387(i, { emotionalShift: i === 6 ? 'positive' : 'neutral' }),
      );
      const res = await runST387(recs387ef);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACT1_EMOTIONAL_FLATLINE'), 'ACT1_EMOTIONAL_FLATLINE should fire');
    });

    it('ACT1_EMOTIONAL_FLATLINE does not fire when an Act 1 scene carries emotion', async () => {
      const recs387efn = Array.from({ length: 12 }, (_, i) =>
        makeRec387(i, { emotionalShift: i === 1 ? 'negative' : 'neutral' }),
      );
      const res = await runST387(recs387efn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACT1_EMOTIONAL_FLATLINE'), 'ACT1_EMOTIONAL_FLATLINE should not fire');
    });

    it('ACT2A_CURIOSITY_VOID fires when the 25-50% zone averages curiosityDelta ≤ 0 while story is curious', async () => {
      // n=12 → Act 2a = scenes 3-5 (curiosityDelta 0); spike at scene 8
      const recs387cv = Array.from({ length: 12 }, (_, i) =>
        makeRec387(i, { curiosityDelta: i === 8 ? 2 : 0 }),
      );
      const res = await runST387(recs387cv);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACT2A_CURIOSITY_VOID'), 'ACT2A_CURIOSITY_VOID should fire');
    });

    it('ACT2A_CURIOSITY_VOID does not fire when Act 2a has positive average curiosity', async () => {
      const recs387cvn = Array.from({ length: 12 }, (_, i) =>
        makeRec387(i, { curiosityDelta: (i >= 3 && i <= 5) ? 1 : i === 8 ? 2 : 0 }),
      );
      const res = await runST387(recs387cvn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACT2A_CURIOSITY_VOID'), 'ACT2A_CURIOSITY_VOID should not fire');
    });

    it('ACT2_DRAMATIC_TURN_ABSENT fires when Act 2 has no turn but 2+ turns land outside it', async () => {
      // n=12 → Act 2 = scenes 3-8; turns at 1 and 10 only
      const recs387dt = Array.from({ length: 12 }, (_, i) =>
        makeRec387(i, { dramaticTurn: [1, 10].includes(i) ? 'reversal' : 'nothing' }),
      );
      const res = await runST387(recs387dt);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACT2_DRAMATIC_TURN_ABSENT'), 'ACT2_DRAMATIC_TURN_ABSENT should fire');
    });

    it('ACT2_DRAMATIC_TURN_ABSENT does not fire when Act 2 contains a dramatic turn', async () => {
      const recs387dtn = Array.from({ length: 12 }, (_, i) =>
        makeRec387(i, { dramaticTurn: [1, 5, 10].includes(i) ? 'reversal' : 'nothing' }),
      );
      const res = await runST387(recs387dtn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACT2_DRAMATIC_TURN_ABSENT'), 'ACT2_DRAMATIC_TURN_ABSENT should not fire');
    });
  });


  describe('Wave 373 — structurePass: midpoint suspense void, Act 2 purpose single, Act 2b emotional flatline', async () => {
    const makeRec373 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runST373 = async (records: any[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('MIDPOINT_SUSPENSE_VOID fires when the 40-60% zone has no suspense spike while the story spikes elsewhere', async () => {
      // n=12 → midpoint zone scenes 4,5,6; spike only at scene 1
      const recs373ms = Array.from({ length: 12 }, (_, i) =>
        makeRec373(i, { suspenseDelta: i === 1 ? 2 : 0 }),
      );
      const res = await runST373(recs373ms);
      assert.ok(res.issues.some((i: any) => i.rule === 'MIDPOINT_SUSPENSE_VOID'), 'MIDPOINT_SUSPENSE_VOID should fire');
    });

    it('MIDPOINT_SUSPENSE_VOID does not fire when the midpoint zone contains a suspense spike', async () => {
      const recs373msn = Array.from({ length: 12 }, (_, i) =>
        makeRec373(i, { suspenseDelta: i === 1 || i === 5 ? 2 : 0 }),
      );
      const res = await runST373(recs373msn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'MIDPOINT_SUSPENSE_VOID'), 'MIDPOINT_SUSPENSE_VOID should not fire');
    });

    it('ACT2_PURPOSE_SINGLE fires when all Act 2 scenes share one purpose', async () => {
      // n=12 → Act 2 = scenes 3-8, all 'development'
      const recs373ps = Array.from({ length: 12 }, (_, i) => makeRec373(i));
      const res = await runST373(recs373ps);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACT2_PURPOSE_SINGLE'), 'ACT2_PURPOSE_SINGLE should fire');
    });

    it('ACT2_PURPOSE_SINGLE does not fire when Act 2 has varied purposes', async () => {
      const recs373psn = Array.from({ length: 12 }, (_, i) =>
        makeRec373(i, { purpose: i === 4 ? 'climax' : 'development' }),
      );
      const res = await runST373(recs373psn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACT2_PURPOSE_SINGLE'), 'ACT2_PURPOSE_SINGLE should not fire');
    });

    it('ACT2B_EMOTIONAL_FLATLINE fires when the 50-75% zone is all neutral', async () => {
      // n=12 → Act 2b = scenes 6,7,8, all neutral; charge elsewhere
      const recs373ef = Array.from({ length: 12 }, (_, i) =>
        makeRec373(i, { emotionalShift: i === 1 ? 'positive' : 'neutral' }),
      );
      const res = await runST373(recs373ef);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACT2B_EMOTIONAL_FLATLINE'), 'ACT2B_EMOTIONAL_FLATLINE should fire');
    });

    it('ACT2B_EMOTIONAL_FLATLINE does not fire when an Act 2b scene carries emotion', async () => {
      const recs373efn = Array.from({ length: 12 }, (_, i) =>
        makeRec373(i, { emotionalShift: i === 7 ? 'positive' : 'neutral' }),
      );
      const res = await runST373(recs373efn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACT2B_EMOTIONAL_FLATLINE'), 'ACT2B_EMOTIONAL_FLATLINE should not fire');
    });
  });


  describe('Wave 359 — structurePass: opening curiosity flatline, Act 3 dramatic turn absent, Act 1 relationship void', async () => {
    const makeRec359 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runST359 = async (records: any[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('OPENING_CURIOSITY_FLATLINE fires when Act 1 averages curiosityDelta ≤ 0 while story has 2+ curious scenes later', async () => {
      // 12 scenes; Act 1 = scenes 0-2 (first 25% of 12 = 3 scenes)
      // Act 1 curiosityDelta: -0.3, -0.2, 0 → avg = -0.167 ≤ 0
      // Scenes 6 and 9 have curiosityDelta 1.5 > 0.8 → 2 spikes elsewhere
      const recs359ocf = Array.from({ length: 12 }, (_, i) =>
        makeRec359(i, {
          curiosityDelta: i === 0 ? -0.3 : i === 1 ? -0.2 : i === 2 ? 0 : i === 6 || i === 9 ? 1.5 : 0,
        }),
      );
      const res = await runST359(recs359ocf);
      assert.ok(res.issues.some((i: any) => i.rule === 'OPENING_CURIOSITY_FLATLINE'), 'OPENING_CURIOSITY_FLATLINE should fire');
    });

    it('OPENING_CURIOSITY_FLATLINE does not fire when Act 1 has positive average curiosityDelta', async () => {
      // scenes 0,1,2 have curiosityDelta 0.4 → avg positive
      const recs359ocfni = Array.from({ length: 12 }, (_, i) =>
        makeRec359(i, {
          curiosityDelta: i < 3 ? 0.4 : i === 6 || i === 9 ? 1.5 : 0,
        }),
      );
      const res = await runST359(recs359ocfni);
      assert.ok(!res.issues.some((i: any) => i.rule === 'OPENING_CURIOSITY_FLATLINE'), 'OPENING_CURIOSITY_FLATLINE should not fire');
    });

    it('ACT3_DRAMATIC_TURN_ABSENT fires when Act 3 has no turns but Acts 1-2 have 3+', async () => {
      // 12 scenes; Act 3 = scenes 9-11 (final 25% of 12 = 3 scenes)
      // Turns at scenes 1, 3, 6 (in Acts 1-2); none in 9-11
      const recs359ata = Array.from({ length: 12 }, (_, i) =>
        makeRec359(i, {
          dramaticTurn: [1, 3, 6].includes(i) ? 'reversal' : 'nothing',
        }),
      );
      const res = await runST359(recs359ata);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACT3_DRAMATIC_TURN_ABSENT'), 'ACT3_DRAMATIC_TURN_ABSENT should fire');
    });

    it('ACT3_DRAMATIC_TURN_ABSENT does not fire when Act 3 contains a dramatic turn', async () => {
      // turn at scene 10 (Act 3)
      const recs359atani = Array.from({ length: 12 }, (_, i) =>
        makeRec359(i, {
          dramaticTurn: [1, 3, 6, 10].includes(i) ? 'reversal' : 'nothing',
        }),
      );
      const res = await runST359(recs359atani);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACT3_DRAMATIC_TURN_ABSENT'), 'ACT3_DRAMATIC_TURN_ABSENT should not fire');
    });

    it('ACT1_RELATIONSHIP_VOID fires when Act 1 has no shifts while story has 3+', async () => {
      // 12 scenes; Act 1 = 0-2 (no shifts); shifts at 4, 6, 8
      const recs359arv = Array.from({ length: 12 }, (_, i) =>
        makeRec359(i, {
          relationshipShifts: [4, 6, 8].includes(i) ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.5 }] : [],
        }),
      );
      const res = await runST359(recs359arv);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACT1_RELATIONSHIP_VOID'), 'ACT1_RELATIONSHIP_VOID should fire');
    });

    it('ACT1_RELATIONSHIP_VOID does not fire when Act 1 contains a relationship shift', async () => {
      // shift at scene 1 (Act 1) in addition to later shifts
      const recs359arvni = Array.from({ length: 12 }, (_, i) =>
        makeRec359(i, {
          relationshipShifts: [1, 4, 6, 8].includes(i) ? [{ pairKey: 'A|B', dimension: 'trust', amount: 0.5 }] : [],
        }),
      );
      const res = await runST359(recs359arvni);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACT1_RELATIONSHIP_VOID'), 'ACT1_RELATIONSHIP_VOID should not fire');
    });
  });


  describe('Wave 345 — structurePass: Act 2b suspense void, Act 2a emotional flatline, midpoint curiosity void', async () => {
    const makeRec345 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'negative', suspenseDelta: 0.5, curiosityDelta: 1,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runST345 = async (records: any[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ACT2B_SUSPENSE_VOID fires when Act 2b (scenes 5–6) has no suspense spike', async () => {
      // n=10 → act2b = slice(5,7) = scenes 5,6; flat there, spikes elsewhere
      const recs345sv = Array.from({ length: 10 }, (_, i) =>
        makeRec345(i, { suspenseDelta: [5, 6].includes(i) ? 0.5 : 2 })
      );
      const res = await runST345(recs345sv);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACT2B_SUSPENSE_VOID'), 'ACT2B_SUSPENSE_VOID should fire');
    });

    it('ACT2B_SUSPENSE_VOID does not fire when Act 2b carries a suspense spike', async () => {
      const recs345svn = Array.from({ length: 10 }, (_, i) =>
        makeRec345(i, { suspenseDelta: i === 5 ? 2 : 0.5 })
      );
      const res = await runST345(recs345svn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACT2B_SUSPENSE_VOID'), 'ACT2B_SUSPENSE_VOID should not fire');
    });

    it('ACT2A_EMOTIONAL_FLATLINE fires when all Act 2a (scenes 2–4) scenes are neutral', async () => {
      // n=10 → act2a = slice(2,5) = scenes 2,3,4
      const recs345ef = Array.from({ length: 10 }, (_, i) =>
        makeRec345(i, { emotionalShift: [2, 3, 4].includes(i) ? 'neutral' : 'negative' })
      );
      const res = await runST345(recs345ef);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACT2A_EMOTIONAL_FLATLINE'), 'ACT2A_EMOTIONAL_FLATLINE should fire');
    });

    it('ACT2A_EMOTIONAL_FLATLINE does not fire when an Act 2a scene carries emotion', async () => {
      const recs345efn = Array.from({ length: 10 }, (_, i) =>
        makeRec345(i, { emotionalShift: [2, 4].includes(i) ? 'neutral' : 'negative' })
      );
      const res = await runST345(recs345efn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACT2A_EMOTIONAL_FLATLINE'), 'ACT2A_EMOTIONAL_FLATLINE should not fire');
    });

    it('MIDPOINT_CURIOSITY_VOID fires when the midpoint (scenes 4–5) averages curiosityDelta ≤ 0', async () => {
      // n=10 → midpoint = slice(4,6) = scenes 4,5; flat there, curious elsewhere
      const recs345cv = Array.from({ length: 10 }, (_, i) =>
        makeRec345(i, { curiosityDelta: [4, 5].includes(i) ? 0 : 2 })
      );
      const res = await runST345(recs345cv);
      assert.ok(res.issues.some((i: any) => i.rule === 'MIDPOINT_CURIOSITY_VOID'), 'MIDPOINT_CURIOSITY_VOID should fire');
    });

    it('MIDPOINT_CURIOSITY_VOID does not fire when the midpoint raises curiosity', async () => {
      const recs345cvn = Array.from({ length: 10 }, (_, i) =>
        makeRec345(i, { curiosityDelta: 2 })
      );
      const res = await runST345(recs345cvn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'MIDPOINT_CURIOSITY_VOID'), 'MIDPOINT_CURIOSITY_VOID should not fire');
    });
  });


  describe('Wave 331 — structurePass: Act 3 emotional flatline, Act 1 warmth absent, dramatic turn opening absent', async () => {
    const makeRec331 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'negative', suspenseDelta: 1.0, curiosityDelta: 1,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'reversal',
      ...overrides,
    });
    const runST331 = async (records: any[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ACT3_EMOTIONAL_FLATLINE fires when all Act 3 scenes are emotionally neutral', async () => {
      // n=10 → act3Start=7; scenes 7,8,9 all neutral
      const recs331ef = Array.from({ length: 10 }, (_, i) =>
        makeRec331(i, { emotionalShift: i >= 7 ? 'neutral' : 'negative' })
      );
      const res = await runST331(recs331ef);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACT3_EMOTIONAL_FLATLINE'), 'ACT3_EMOTIONAL_FLATLINE should fire');
    });

    it('ACT3_EMOTIONAL_FLATLINE does not fire when an Act 3 scene carries emotional charge', async () => {
      const recs331nef = Array.from({ length: 10 }, (_, i) =>
        makeRec331(i, { emotionalShift: i === 8 ? 'positive' : 'neutral' })
      );
      const res = await runST331(recs331nef);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACT3_EMOTIONAL_FLATLINE'), 'ACT3_EMOTIONAL_FLATLINE should not fire');
    });

    it('ACT1_WARMTH_ABSENT fires when no Act 1 scene has a positive emotional shift', async () => {
      // n=8 → act1End=2; scenes 0,1 both neutral or negative — no positive
      const recs331wa = Array.from({ length: 8 }, (_, i) =>
        makeRec331(i, { emotionalShift: i < 2 ? 'neutral' : 'negative' })
      );
      const res = await runST331(recs331wa);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACT1_WARMTH_ABSENT'), 'ACT1_WARMTH_ABSENT should fire');
    });

    it('ACT1_WARMTH_ABSENT does not fire when an Act 1 scene is emotionally positive', async () => {
      const recs331nwa = Array.from({ length: 8 }, (_, i) =>
        makeRec331(i, { emotionalShift: i === 1 ? 'positive' : 'neutral' })
      );
      const res = await runST331(recs331nwa);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACT1_WARMTH_ABSENT'), 'ACT1_WARMTH_ABSENT should not fire');
    });

    it('DRAMATIC_TURN_OPENING_ABSENT fires when no scene in the first 30% has a dramatic turn', async () => {
      // n=10 → openingEnd=3; scenes 0,1,2 have dramaticTurn='nothing'
      const recs331dt = Array.from({ length: 10 }, (_, i) =>
        makeRec331(i, { dramaticTurn: i < 3 ? 'nothing' : 'reversal' })
      );
      const res = await runST331(recs331dt);
      assert.ok(res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_OPENING_ABSENT'), 'DRAMATIC_TURN_OPENING_ABSENT should fire');
    });

    it('DRAMATIC_TURN_OPENING_ABSENT does not fire when the opening contains a dramatic turn', async () => {
      const recs331ndt = Array.from({ length: 10 }, (_, i) =>
        makeRec331(i, { dramaticTurn: i === 2 ? 'revelation' : 'nothing' })
      );
      const res = await runST331(recs331ndt);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_OPENING_ABSENT'), 'DRAMATIC_TURN_OPENING_ABSENT should not fire');
    });
  });


  describe('Wave 320 — structurePass: climax revelation absent, Act 2 curiosity valley, emotional opening neutral', async () => {
    const makeRec320 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'negative', suspenseDelta: 1.0, curiosityDelta: 1,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runST320 = async (records: any[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CLIMAX_REVELATION_ABSENT fires when 2+ revelations exist but none in Act 3', async () => {
      // n=8 → act3Start=6; put revelations at scenes 2 and 4 (both before Act 3)
      const recs320cr = Array.from({ length: 8 }, (_, i) =>
        makeRec320(i, { revelation: [2, 4].includes(i) ? `Disclosure ${i}` : null })
      );
      const res = await runST320(recs320cr);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLIMAX_REVELATION_ABSENT'), 'CLIMAX_REVELATION_ABSENT should fire');
    });

    it('CLIMAX_REVELATION_ABSENT does not fire when a revelation lands in Act 3', async () => {
      const recs320ncr = Array.from({ length: 8 }, (_, i) =>
        makeRec320(i, { revelation: [2, 4, 7].includes(i) ? `Disclosure ${i}` : null })
      );
      const res = await runST320(recs320ncr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLIMAX_REVELATION_ABSENT'), 'CLIMAX_REVELATION_ABSENT should not fire');
    });

    it('ACT2_CURIOSITY_VALLEY fires when Act 2 curiosity is below both bookend acts', async () => {
      // n=12 → Act1 0-2, Act2 3-8, Act3 9-11
      const recs320cv = Array.from({ length: 12 }, (_, i) =>
        makeRec320(i, { curiosityDelta: (i >= 3 && i < 9) ? 0 : 2 })
      );
      const res = await runST320(recs320cv);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACT2_CURIOSITY_VALLEY'), 'ACT2_CURIOSITY_VALLEY should fire');
    });

    it('ACT2_CURIOSITY_VALLEY does not fire when Act 2 sustains curiosity', async () => {
      const recs320ncv = Array.from({ length: 12 }, (_, i) =>
        makeRec320(i, { curiosityDelta: (i >= 3 && i < 9) ? 2 : 1 })
      );
      const res = await runST320(recs320ncv);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACT2_CURIOSITY_VALLEY'), 'ACT2_CURIOSITY_VALLEY should not fire');
    });

    it('EMOTIONAL_OPENING_NEUTRAL fires when the first three scenes are all neutral', async () => {
      const recs320eo = Array.from({ length: 8 }, (_, i) =>
        makeRec320(i, { emotionalShift: i < 3 ? 'neutral' : 'positive' })
      );
      const res = await runST320(recs320eo);
      assert.ok(res.issues.some((i: any) => i.rule === 'EMOTIONAL_OPENING_NEUTRAL'), 'EMOTIONAL_OPENING_NEUTRAL should fire');
    });

    it('EMOTIONAL_OPENING_NEUTRAL does not fire when an early scene carries emotional charge', async () => {
      const recs320neo = Array.from({ length: 8 }, (_, i) =>
        makeRec320(i, { emotionalShift: i === 1 ? 'positive' : 'neutral' })
      );
      const res = await runST320(recs320neo);
      assert.ok(!res.issues.some((i: any) => i.rule === 'EMOTIONAL_OPENING_NEUTRAL'), 'EMOTIONAL_OPENING_NEUTRAL should not fire');
    });
  });


  describe('Wave 292 — structurePass: Act 3 curiosity spike absent, clock pressure finale absent, opening suspense flatline', async () => {
    const makeRec292 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runST292 = async (records: any[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ACT3_CURIOSITY_SPIKE_ABSENT fires when pre-final quarter has curiosity spike but final quarter does not', async () => {
      // 12 scenes: curiosityDelta > 1 at scene 3 (pre-final), none in final quarter (9-11)
      const recs292acsa = Array.from({ length: 12 }, (_, i) =>
        makeRec292(i, { curiosityDelta: i === 3 ? 2 : 0 })
      );
      const res = await runST292(recs292acsa);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACT3_CURIOSITY_SPIKE_ABSENT'), 'ACT3_CURIOSITY_SPIKE_ABSENT should fire');
    });

    it('ACT3_CURIOSITY_SPIKE_ABSENT does not fire when final quarter has a curiosity spike', async () => {
      const recs292nacsa = Array.from({ length: 12 }, (_, i) =>
        makeRec292(i, { curiosityDelta: i === 3 || i === 10 ? 2 : 0 })
      );
      const res = await runST292(recs292nacsa);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACT3_CURIOSITY_SPIKE_ABSENT'), 'ACT3_CURIOSITY_SPIKE_ABSENT should not fire');
    });

    it('CLOCK_PRESSURE_FINALE_ABSENT fires when 2+ early clocks but none in final quarter', async () => {
      // 10 scenes: clockRaised at 1,2 (pre-final); final quarter (8-9) has none
      const recs292cpfa = Array.from({ length: 10 }, (_, i) =>
        makeRec292(i, { clockRaised: i === 1 || i === 2 })
      );
      const res = await runST292(recs292cpfa);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_PRESSURE_FINALE_ABSENT'), 'CLOCK_PRESSURE_FINALE_ABSENT should fire');
    });

    it('CLOCK_PRESSURE_FINALE_ABSENT does not fire when final quarter has a clock event', async () => {
      const recs292ncpfa = Array.from({ length: 10 }, (_, i) =>
        makeRec292(i, { clockRaised: i === 1 || i === 2 || i === 9 })
      );
      const res = await runST292(recs292ncpfa);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_PRESSURE_FINALE_ABSENT'), 'CLOCK_PRESSURE_FINALE_ABSENT should not fire');
    });

    it('OPENING_SUSPENSE_FLATLINE fires when first 3 scenes all have suspenseDelta ≤ 0', async () => {
      const recs292osf = Array.from({ length: 8 }, (_, i) =>
        makeRec292(i, { suspenseDelta: i < 3 ? -0.5 : 1.0 })
      );
      const res = await runST292(recs292osf);
      assert.ok(res.issues.some((i: any) => i.rule === 'OPENING_SUSPENSE_FLATLINE'), 'OPENING_SUSPENSE_FLATLINE should fire');
    });

    it('OPENING_SUSPENSE_FLATLINE does not fire when opening scenes have positive suspenseDelta', async () => {
      const recs292nosf = Array.from({ length: 8 }, (_, i) =>
        makeRec292(i, { suspenseDelta: 1.0 })
      );
      const res = await runST292(recs292nosf);
      assert.ok(!res.issues.some((i: any) => i.rule === 'OPENING_SUSPENSE_FLATLINE'), 'OPENING_SUSPENSE_FLATLINE should not fire');
    });
  });


  describe('Wave 278 — structurePass: Act 2a suspense void, climax purpose absent, emotional arc uniform', async () => {
    const makeRecS278 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 1, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const runS278 = async (records: any[]) => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      return structurePass({ fountain: '', original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ACT2A_SUSPENSE_VOID fires when no Act 2a scene reaches suspenseDelta above 1', async () => {
      // n=10, act2a=scenes 2-4; all have suspenseDelta=0.5 (≤1)
      const recs278a = Array.from({ length: 10 }, (_, i) => makeRecS278(i, {
        suspenseDelta: (i >= 2 && i <= 4) ? 0.5 : 2,
        ...(i === 0 ? { seededClueIds: ['seed-a'] } : {}),
      }));
      const result278a = await runS278(recs278a);
      const void278a = result278a.issues.filter((i: any) => i.rule === 'ACT2A_SUSPENSE_VOID');
      assert.ok(void278a.length >= 1, `Should detect ACT2A_SUSPENSE_VOID, got: ${JSON.stringify(result278a.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(void278a[0].severity, 'minor');
    });

    it('ACT2A_SUSPENSE_VOID does NOT fire when an Act 2a scene has suspenseDelta above 1', async () => {
      // n=10, scene 3 (in act2a [2,4]) has suspenseDelta=1.5 > 1
      const recs278b = Array.from({ length: 10 }, (_, i) => makeRecS278(i, {
        suspenseDelta: (i === 3) ? 1.5 : 0.5,
      }));
      const result278b = await runS278(recs278b);
      const void278b = result278b.issues.filter((i: any) => i.rule === 'ACT2A_SUSPENSE_VOID');
      assert.strictEqual(void278b.length, 0, 'Should NOT fire ACT2A_SUSPENSE_VOID when Act 2a has tension');
    });

    it('PURPOSE_CLIMAX_ABSENT fires when no scene carries purpose "climax"', async () => {
      // n=8, all scenes have purpose='development'
      const recs278c = Array.from({ length: 8 }, (_, i) => makeRecS278(i));
      const result278c = await runS278(recs278c);
      const pca278c = result278c.issues.filter((i: any) => i.rule === 'PURPOSE_CLIMAX_ABSENT');
      assert.ok(pca278c.length >= 1, `Should detect PURPOSE_CLIMAX_ABSENT, got: ${JSON.stringify(result278c.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(pca278c[0].severity, 'major');
    });

    it('PURPOSE_CLIMAX_ABSENT does NOT fire when at least one scene carries purpose "climax"', async () => {
      // n=8, scene 6 has purpose='climax'
      const recs278d = Array.from({ length: 8 }, (_, i) => makeRecS278(i, {
        ...(i === 6 ? { purpose: 'climax' } : {}),
      }));
      const result278d = await runS278(recs278d);
      const pca278d = result278d.issues.filter((i: any) => i.rule === 'PURPOSE_CLIMAX_ABSENT');
      assert.strictEqual(pca278d.length, 0, 'Should NOT fire PURPOSE_CLIMAX_ABSENT when a climax scene exists');
    });

    it('EMOTIONAL_ARC_UNIFORM fires when more than 70% of scenes share the same emotional register', async () => {
      // n=8, all 8 scenes have emotionalShift='neutral' → 100% > 70%
      const recs278e = Array.from({ length: 8 }, (_, i) => makeRecS278(i));
      const result278e = await runS278(recs278e);
      const eau278e = result278e.issues.filter((i: any) => i.rule === 'EMOTIONAL_ARC_UNIFORM');
      assert.ok(eau278e.length >= 1, `Should detect EMOTIONAL_ARC_UNIFORM, got: ${JSON.stringify(result278e.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(eau278e[0].severity, 'minor');
    });

    it('EMOTIONAL_ARC_UNIFORM does NOT fire when no single register dominates above 70%', async () => {
      // n=8: 4 neutral, 2 positive, 2 negative → 4/8=50% ≤ 70%
      const recs278f = Array.from({ length: 8 }, (_, i) => makeRecS278(i, {
        emotionalShift: i < 4 ? 'neutral' : (i < 6 ? 'positive' : 'negative'),
      }));
      const result278f = await runS278(recs278f);
      const eau278f = result278f.issues.filter((i: any) => i.rule === 'EMOTIONAL_ARC_UNIFORM');
      assert.strictEqual(eau278f.length, 0, 'Should NOT fire EMOTIONAL_ARC_UNIFORM when emotional variety exists');
    });
  });


  describe('Wave 264 — structurePass: revelation clustered, Act 1 curiosity absent, Act 1 purpose single', async () => {
    const makeRec264 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 1, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput264 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: '...',
      records: records as any, structure: {} as any,
      storyContext: {} as any,
      annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('REVELATION_CLUSTERED fires when ≥3 revelations occur within a 4-scene window', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      const records264a = [
        makeRec264(0), makeRec264(1),
        makeRec264(2, { revelation: 'truth about killer' }),
        makeRec264(3, { revelation: 'motive revealed' }),
        makeRec264(4, { revelation: 'identity exposed' }),
        makeRec264(5), makeRec264(6), makeRec264(7),
      ];
      const result264a = await structurePass(makeInput264(records264a));
      assert.ok(result264a.issues.some((i: any) => i.rule === 'REVELATION_CLUSTERED'), `Expected REVELATION_CLUSTERED, got: ${JSON.stringify(result264a.issues.map((i: any) => i.rule))}`);
    });

    it('REVELATION_CLUSTERED does NOT fire when revelations are spread across more than 4 scenes', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      const records264b = [
        makeRec264(0), makeRec264(1, { revelation: 'truth about killer' }),
        makeRec264(2), makeRec264(3),
        makeRec264(4, { revelation: 'motive revealed' }),
        makeRec264(5), makeRec264(6),
        makeRec264(7, { revelation: 'identity exposed' }),
      ];
      const result264b = await structurePass(makeInput264(records264b));
      assert.ok(!result264b.issues.some((i: any) => i.rule === 'REVELATION_CLUSTERED'), 'Should NOT fire when revelations span more than 4 scenes');
    });

    it('ACT1_CURIOSITY_ABSENT fires when Act 1 has no curiosity spike but story has ≥2 elsewhere', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // n=12: Act1 = scenes 0-2 (floor(12*0.25)=3)
      const records264c = Array.from({ length: 12 }, (_, i) =>
        makeRec264(i, { curiosityDelta: (i === 5 || i === 9) ? 1.5 : 0 }),
      );
      const result264c = await structurePass(makeInput264(records264c));
      assert.ok(result264c.issues.some((i: any) => i.rule === 'ACT1_CURIOSITY_ABSENT'), `Expected ACT1_CURIOSITY_ABSENT, got: ${JSON.stringify(result264c.issues.map((i: any) => i.rule))}`);
    });

    it('ACT1_CURIOSITY_ABSENT does NOT fire when Act 1 contains a curiosity spike', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      const records264d = Array.from({ length: 12 }, (_, i) =>
        makeRec264(i, { curiosityDelta: (i === 1 || i === 5 || i === 9) ? 1.5 : 0 }),
      );
      const result264d = await structurePass(makeInput264(records264d));
      assert.ok(!result264d.issues.some((i: any) => i.rule === 'ACT1_CURIOSITY_ABSENT'), 'Should NOT fire when Act 1 has a curiosity spike');
    });

    it('ACT1_PURPOSE_SINGLE fires when all Act 1 scenes share the same purpose', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // n=12: Act1 = scenes 0-2 (floor(12*0.25)=3), all 'establish_world'
      const records264e = Array.from({ length: 12 }, (_, i) =>
        makeRec264(i, { purpose: i < 3 ? 'establish_world' : (i % 2 === 0 ? 'development' : 'confrontation') }),
      );
      const result264e = await structurePass(makeInput264(records264e));
      assert.ok(result264e.issues.some((i: any) => i.rule === 'ACT1_PURPOSE_SINGLE'), `Expected ACT1_PURPOSE_SINGLE, got: ${JSON.stringify(result264e.issues.map((i: any) => i.rule))}`);
    });

    it('ACT1_PURPOSE_SINGLE does NOT fire when Act 1 scenes have varied purposes', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      const purposes264f = ['establish_world', 'character_moment', 'inciting_event'];
      const records264f = Array.from({ length: 12 }, (_, i) =>
        makeRec264(i, { purpose: i < 3 ? purposes264f[i] : 'development' }),
      );
      const result264f = await structurePass(makeInput264(records264f));
      assert.ok(!result264f.issues.some((i: any) => i.rule === 'ACT1_PURPOSE_SINGLE'), 'Should NOT fire when Act 1 has varied purposes');
    });
  });


  describe('Wave 250 — structurePass: curiosity void, Act 3 purpose monotone, Act 2b suspense decay', async () => {
    const makeRec250 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 1, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput250 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: '...',
      records: records as any, structure: {} as any,
      storyContext: {} as any,
      annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('STRUCTURE_CURIOSITY_VOID fires when no scene raises curiosityDelta above 1', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      const records250a = Array.from({ length: 8 }, (_, i) => makeRec250(i, { curiosityDelta: 0 }));
      const result = await structurePass(makeInput250(records250a));
      assert.ok(result.issues.some((i: any) => i.rule === 'STRUCTURE_CURIOSITY_VOID'), `Expected STRUCTURE_CURIOSITY_VOID, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(result.issues.find((i: any) => i.rule === 'STRUCTURE_CURIOSITY_VOID')?.severity, 'minor');
    });

    it('STRUCTURE_CURIOSITY_VOID does NOT fire when at least one scene has curiosityDelta > 1', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      const records250b = Array.from({ length: 8 }, (_, i) => makeRec250(i, { curiosityDelta: i === 3 ? 2 : 0 }));
      const result = await structurePass(makeInput250(records250b));
      assert.ok(!result.issues.some((i: any) => i.rule === 'STRUCTURE_CURIOSITY_VOID'), 'Should NOT fire when a scene has curiosityDelta > 1');
    });

    it('ACT3_PURPOSE_MONOTONE fires when all Act 3 scenes share the same purpose', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // 12 records; Act3 = scenes 9-11 (floor(12*0.75)=9); all 'confrontation'
      const records250c = Array.from({ length: 12 }, (_, i) =>
        makeRec250(i, { purpose: i >= 9 ? 'confrontation' : (i % 2 === 0 ? 'development' : 'revelation') }),
      );
      const result = await structurePass(makeInput250(records250c));
      assert.ok(result.issues.some((i: any) => i.rule === 'ACT3_PURPOSE_MONOTONE'), `Expected ACT3_PURPOSE_MONOTONE, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('ACT3_PURPOSE_MONOTONE does NOT fire when Act 3 scenes have varied purposes', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      const act3Purposes = ['confrontation', 'revelation', 'resolution'];
      const records250d = Array.from({ length: 12 }, (_, i) =>
        makeRec250(i, { purpose: i >= 9 ? act3Purposes[i - 9] : 'development' }),
      );
      const result = await structurePass(makeInput250(records250d));
      assert.ok(!result.issues.some((i: any) => i.rule === 'ACT3_PURPOSE_MONOTONE'), 'Should NOT fire when Act 3 has varied purposes');
    });

    it('ACT2B_SUSPENSE_DECAY fires when Act 2b average suspense is lower than Act 2a', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // 10 records; act2a(2-4) suspense=3.0; act2b(5-6) suspense=1.0 → decay > 0.5
      const records250e = Array.from({ length: 10 }, (_, i) => {
        let sd = 1;
        if (i >= 2 && i < 5) sd = 3;
        else if (i >= 5 && i < 7) sd = 1;
        return makeRec250(i, { suspenseDelta: sd });
      });
      const result = await structurePass(makeInput250(records250e));
      assert.ok(result.issues.some((i: any) => i.rule === 'ACT2B_SUSPENSE_DECAY'), `Expected ACT2B_SUSPENSE_DECAY, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('ACT2B_SUSPENSE_DECAY does NOT fire when Act 2b suspense matches or exceeds Act 2a', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // act2a(2-4) suspense=2.0; act2b(5-6) suspense=2.5 → no decay
      const records250f = Array.from({ length: 10 }, (_, i) => {
        let sd = 1;
        if (i >= 2 && i < 5) sd = 2;
        else if (i >= 5 && i < 7) sd = 2.5;
        return makeRec250(i, { suspenseDelta: sd });
      });
      const result = await structurePass(makeInput250(records250f));
      assert.ok(!result.issues.some((i: any) => i.rule === 'ACT2B_SUSPENSE_DECAY'), 'Should NOT fire when Act 2b suspense does not decay below Act 2a');
    });
  });


  describe('Wave 236 — structurePass: purpose monoculture, clock raised late, Act 2 revelation absent', async () => {
    const makeRec236 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput236 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: 'INT. SC - DAY\nAction line.\n',
      records: records as any, structure: {} as any,
      storyContext: {} as any, annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('PURPOSE_MONOCULTURE fires when >70% of scenes share the same purpose', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // 8 scenes: 7 x 'dialogue', 1 x 'climax' → 87.5% dominant
      const records236a = Array.from({ length: 8 }, (_, i) =>
        makeRec236(i, { purpose: i < 7 ? 'dialogue' : 'climax' }),
      );
      const result = await structurePass(makeInput236(records236a));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'PURPOSE_MONOCULTURE'),
        'Should fire when one purpose exceeds 70% of scenes',
      );
    });

    it('PURPOSE_MONOCULTURE does NOT fire when purposes are varied', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // 8 scenes with 4 different purposes, max 2/8 = 25% per purpose
      const purposes = ['dialogue', 'dialogue', 'development', 'development', 'climax', 'character_moment', 'turning_point', 'resolution'];
      const records236b = Array.from({ length: 8 }, (_, i) => makeRec236(i, { purpose: purposes[i] }));
      const result = await structurePass(makeInput236(records236b));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'PURPOSE_MONOCULTURE'),
        'Should NOT fire when no single purpose exceeds 70%',
      );
    });

    it('CLOCK_RAISED_LATE fires when first clock appears after 50% of scenes', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // 8 scenes, clock only at index 5 (62.5%) → after 50% threshold (index 4)
      const records236c = Array.from({ length: 8 }, (_, i) =>
        makeRec236(i, i === 5 ? { clockRaised: true } : {}),
      );
      const result = await structurePass(makeInput236(records236c));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'CLOCK_RAISED_LATE'),
        'Should fire when first clock appears past the halfway point',
      );
    });

    it('CLOCK_RAISED_LATE does NOT fire when first clock appears before 50%', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // 8 scenes, clock at index 2 (25%) → before 50% threshold
      const records236d = Array.from({ length: 8 }, (_, i) =>
        makeRec236(i, i === 2 ? { clockRaised: true } : {}),
      );
      const result = await structurePass(makeInput236(records236d));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'CLOCK_RAISED_LATE'),
        'Should NOT fire when clock appears before the midpoint',
      );
    });

    it('ACT2_REVELATION_ABSENT fires when Act 2 has no revelations but 2+ exist elsewhere', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // 10 scenes; revelations only at 0 and 9 (Act 1 and Act 3 tails)
      // Act 2 = scenes 2-6 (floor(10*0.25)=2 to floor(10*0.75)=7, exclusive)
      const records236e = Array.from({ length: 10 }, (_, i) =>
        makeRec236(i, (i === 0 || i === 9) ? { revelation: 'a truth surfaces' } : {}),
      );
      const result = await structurePass(makeInput236(records236e));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'ACT2_REVELATION_ABSENT'),
        'Should fire when Act 2 has no revelations despite 2+ existing elsewhere',
      );
    });

    it('ACT2_REVELATION_ABSENT does NOT fire when at least one revelation lands in Act 2', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // 10 scenes; revelation at index 4 (in Act 2) and index 9
      const records236f = Array.from({ length: 10 }, (_, i) =>
        makeRec236(i, (i === 4 || i === 9) ? { revelation: 'a truth surfaces' } : {}),
      );
      const result = await structurePass(makeInput236(records236f));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'ACT2_REVELATION_ABSENT'),
        'Should NOT fire when at least one revelation is in Act 2',
      );
    });
  });


  describe('Wave 222 — structurePass: dramatic vacuum stretch, tension frontloaded COM, try-fail rhythm absent (structural physics)', async () => {
    const makeRec222 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeInput222 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nAction line.\n', original: 'INT. SC - DAY\nAction line.\n',
      records: records as any, structure: {} as any,
      storyContext: {} as any, annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('DRAMATIC_VACUUM_STRETCH fires when a long run of scenes has no dramatic event', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // n=12; events only at scenes 0 and 11 → 10-scene vacuum in between
      const records = Array.from({ length: 12 }, (_, i) =>
        makeRec222(i, (i === 0 || i === 11) ? { revelation: 'a truth surfaces' } : {}),
      );
      const result = await structurePass(makeInput222(records));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'DRAMATIC_VACUUM_STRETCH'),
        'Should fire when the longest event-free run exceeds a quarter of the story',
      );
    });

    it('DRAMATIC_VACUUM_STRETCH does not fire when dramatic events are distributed', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // Events every ~3 scenes → no gap exceeds the threshold
      const eventScenes = new Set([0, 3, 6, 9, 11]);
      const records = Array.from({ length: 12 }, (_, i) =>
        makeRec222(i, eventScenes.has(i) ? { revelation: 'a truth surfaces' } : {}),
      );
      const result = await structurePass(makeInput222(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'DRAMATIC_VACUUM_STRETCH'),
        'Should NOT fire when dramatic events recur often enough to break up the gaps',
      );
    });

    it('TENSION_FRONTLOADED_COM fires when suspense mass is concentrated early', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // Suspense at scenes 0-3, none later → centre of mass in the front
      const records = Array.from({ length: 10 }, (_, i) =>
        makeRec222(i, { suspenseDelta: i <= 3 ? 5 : 0 }),
      );
      const result = await structurePass(makeInput222(records));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'TENSION_FRONTLOADED_COM'),
        'Should fire when the suspense centre of mass sits before 45% of the runtime',
      );
    });

    it('TENSION_FRONTLOADED_COM does not fire when suspense builds toward the climax', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // Suspense at scenes 6-9 → centre of mass in the back
      const records = Array.from({ length: 10 }, (_, i) =>
        makeRec222(i, { suspenseDelta: i >= 6 ? 5 : 0 }),
      );
      const result = await structurePass(makeInput222(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'TENSION_FRONTLOADED_COM'),
        'Should NOT fire when suspense mass accumulates toward the back half',
      );
    });

    it('TRY_FAIL_RHYTHM_ABSENT fires when the suspense curve is a single hump', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // One bump at scene 6, flat elsewhere → a single peak
      const records = Array.from({ length: 12 }, (_, i) =>
        makeRec222(i, { suspenseDelta: i === 6 ? 4 : 0 }),
      );
      const result = await structurePass(makeInput222(records));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'TRY_FAIL_RHYTHM_ABSENT'),
        'Should fire when the suspense curve has at most one prominent peak',
      );
    });

    it('TRY_FAIL_RHYTHM_ABSENT does not fire when suspense oscillates across multiple cycles', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // Peaks at scenes 2, 5, 8 → three try/fail cycles
      const profile = [0, 1, 3, 1, 0, 3, 1, 0, 3, 1, 0, 0];
      const records = Array.from({ length: 12 }, (_, i) => makeRec222(i, { suspenseDelta: profile[i] }));
      const result = await structurePass(makeInput222(records));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'TRY_FAIL_RHYTHM_ABSENT'),
        'Should NOT fire when the suspense curve has multiple prominent peaks',
      );
    });
  });


  describe('Wave 209 — structurePass: cold open inert, denouement overlong, pre-climax lull', async () => {
    const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');

    const baseStructure209 = {
      actPosition: 'act3' as const, completionPercent: 95, totalClockPressure: 8,
      midpointPressure: 2, reversalCount: 2, tightestScene: null,
      avgSuspensePerScene: 2, escalating: true, reversalDensity: 0.2,
      approachingClimax: true, openClues: 0, revelationCount: 3,
    };
    const makeRec209 = (idx: number, extra: Partial<any> = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'action', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 2,
      seededClueIds: [], payoffSetupIds: [], dialogueHighlights: [],
      relationshipShifts: [], unresolvedClues: [],
      ...extra,
    });
    const blankFountain209 = (n: number) =>
      Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join('');

    it('COLD_OPEN_INERT fires when the first scene has no hook and low suspense', async () => {
      // Scene 0 is entirely inert; scene 1 provides the inciting event (clockRaised) so
      // MISSING_INCITING_INCIDENT does not also fire.
      const records209a = [
        makeRec209(0, { suspenseDelta: 0.5 }),  // inert — no clue, no clock, no relShift, no revelation
        makeRec209(1, { clockRaised: true, suspenseDelta: 2 }),
        makeRec209(2, { revelation: 'discovery', suspenseDelta: 2 }),
        makeRec209(3, { suspenseDelta: 2 }),
        makeRec209(4, { suspenseDelta: 2 }),
        makeRec209(5, { seededClueIds: ['c1'], suspenseDelta: 3 }),
        makeRec209(6, { clockRaised: true, suspenseDelta: 4 }),
        makeRec209(7, { purpose: 'resolution', suspenseDelta: 1, emotionalShift: 'positive' }),
      ];
      const result209a = await structurePass({
        fountain: blankFountain209(8), original: blankFountain209(8),
        records: records209a as any, structure: baseStructure209 as any, annotations: [], approvedSpans: [],
      });
      assert.ok(
        result209a.issues.some(i => i.rule === 'COLD_OPEN_INERT'),
        'Should fire COLD_OPEN_INERT when scene 0 has no revelation, clue, clock, relationship shift, or meaningful suspense',
      );
    });

    it('COLD_OPEN_INERT does NOT fire when the first scene plants a clue', async () => {
      const records209b = [
        makeRec209(0, { seededClueIds: ['hook'], suspenseDelta: 0.5 }),  // has a clue — not inert
        makeRec209(1, { clockRaised: true, suspenseDelta: 2 }),
        makeRec209(2, { revelation: 'discovery', suspenseDelta: 2 }),
        makeRec209(3, { suspenseDelta: 2 }),
        makeRec209(4, { suspenseDelta: 2 }),
        makeRec209(5, { seededClueIds: ['c1'], suspenseDelta: 3 }),
        makeRec209(6, { clockRaised: true, suspenseDelta: 4 }),
        makeRec209(7, { purpose: 'resolution', suspenseDelta: 1, emotionalShift: 'positive' }),
      ];
      const result209b = await structurePass({
        fountain: blankFountain209(8), original: blankFountain209(8),
        records: records209b as any, structure: baseStructure209 as any, annotations: [], approvedSpans: [],
      });
      assert.ok(
        !result209b.issues.some(i => i.rule === 'COLD_OPEN_INERT'),
        'Should NOT fire when the first scene plants a clue (seededClueIds.length > 0)',
      );
    });

    it('DENOUEMENT_OVERLONG fires when 3+ scenes follow the climax peak', async () => {
      // 12 records; climax peak at index 8 (first scene in climax zone at floor(12*0.7)=8).
      // Scenes 9, 10, 11 follow — 3 post-climax scenes triggers the check.
      const records209c = [
        makeRec209(0,  { clockRaised: true }),
        makeRec209(1,  { revelation: 'opening discovery', seededClueIds: ['c1'] }),
        makeRec209(2,  {}),
        makeRec209(3,  { revelation: 'act1 turn', suspenseDelta: 1.5 }),
        makeRec209(4,  { revelation: 'midpoint discovery', suspenseDelta: 1.5 }),
        makeRec209(5,  { seededClueIds: ['c2'] }),
        makeRec209(6,  { suspenseDelta: 2 }),
        makeRec209(7,  { emotionalShift: 'negative', suspenseDelta: 2.5, seededClueIds: ['c3'] }),
        makeRec209(8,  { clockRaised: true, suspenseDelta: 4 }),  // climax peak — 3 scenes follow
        makeRec209(9,  { emotionalShift: 'negative', clockRaised: true, revelation: 'consequence', suspenseDelta: 1.5 }),
        makeRec209(10, { revelation: 'aftermath', suspenseDelta: 1 }),
        makeRec209(11, { purpose: 'resolution', suspenseDelta: 0.5 }),
      ];
      const result209c = await structurePass({
        fountain: blankFountain209(12), original: blankFountain209(12),
        records: records209c as any, structure: baseStructure209 as any, annotations: [], approvedSpans: [],
      });
      assert.ok(
        result209c.issues.some(i => i.rule === 'DENOUEMENT_OVERLONG'),
        'Should fire DENOUEMENT_OVERLONG when 3 scenes follow the climax peak (n=12, peak at index 8)',
      );
    });

    it('DENOUEMENT_OVERLONG does NOT fire when the climax peak is near the end', async () => {
      // Same 12-scene setup but climax peak moves to index 9 — only 2 scenes follow.
      const records209d = [
        makeRec209(0,  { clockRaised: true }),
        makeRec209(1,  { revelation: 'opening discovery', seededClueIds: ['c1'] }),
        makeRec209(2,  {}),
        makeRec209(3,  { revelation: 'act1 turn', suspenseDelta: 1.5 }),
        makeRec209(4,  { revelation: 'midpoint discovery', suspenseDelta: 1.5 }),
        makeRec209(5,  { seededClueIds: ['c2'] }),
        makeRec209(6,  { suspenseDelta: 2 }),
        makeRec209(7,  { emotionalShift: 'negative', suspenseDelta: 2.5, seededClueIds: ['c3'] }),
        makeRec209(8,  { clockRaised: true, suspenseDelta: 3 }),
        makeRec209(9,  { emotionalShift: 'negative', clockRaised: true, revelation: 'consequence', suspenseDelta: 4 }),  // peak at 9 — only 2 follow
        makeRec209(10, { revelation: 'aftermath', suspenseDelta: 1 }),
        makeRec209(11, { purpose: 'resolution', suspenseDelta: 0.5 }),
      ];
      const result209d = await structurePass({
        fountain: blankFountain209(12), original: blankFountain209(12),
        records: records209d as any, structure: baseStructure209 as any, annotations: [], approvedSpans: [],
      });
      assert.ok(
        !result209d.issues.some(i => i.rule === 'DENOUEMENT_OVERLONG'),
        'Should NOT fire when only 2 scenes follow the climax peak (n-1-peakScene = 2 < 3)',
      );
    });

    it('PRE_CLIMAX_LULL fires when both pre-climax scenes have low suspense', async () => {
      // 12 records; climax zone starts at floor(12*0.7)=8; pre-climax scenes are 6 and 7.
      // Both set to suspenseDelta=0.5 — flat approach into the climax.
      const records209e = [
        makeRec209(0,  { clockRaised: true }),
        makeRec209(1,  { revelation: 'opening', seededClueIds: ['c1'] }),
        makeRec209(2,  {}),
        makeRec209(3,  { revelation: 'act1 boundary', suspenseDelta: 1.5 }),
        makeRec209(4,  { revelation: 'midpoint discovery', suspenseDelta: 1.5 }),
        makeRec209(5,  { seededClueIds: ['c2'] }),
        makeRec209(6,  { suspenseDelta: 0.5 }),  // PRE_CLIMAX_LULL sceneA — flat
        makeRec209(7,  { suspenseDelta: 0.5 }),  // PRE_CLIMAX_LULL sceneB — flat
        makeRec209(8,  { clockRaised: true, suspenseDelta: 3 }),
        makeRec209(9,  { emotionalShift: 'negative', clockRaised: true, revelation: 'consequence', suspenseDelta: 4 }),
        makeRec209(10, { revelation: 'aftermath', suspenseDelta: 1 }),
        makeRec209(11, { purpose: 'resolution', suspenseDelta: 0.5 }),
      ];
      const result209e = await structurePass({
        fountain: blankFountain209(12), original: blankFountain209(12),
        records: records209e as any, structure: baseStructure209 as any, annotations: [], approvedSpans: [],
      });
      assert.ok(
        result209e.issues.some(i => i.rule === 'PRE_CLIMAX_LULL'),
        'Should fire PRE_CLIMAX_LULL when both scenes before the climax zone have suspenseDelta < 1',
      );
    });

    it('PRE_CLIMAX_LULL does NOT fire when the second pre-climax scene has meaningful suspense', async () => {
      // Same setup but scene 7 has suspenseDelta=1.5 — only one scene is flat.
      const records209f = [
        makeRec209(0,  { clockRaised: true }),
        makeRec209(1,  { revelation: 'opening', seededClueIds: ['c1'] }),
        makeRec209(2,  {}),
        makeRec209(3,  { revelation: 'act1 boundary', suspenseDelta: 1.5 }),
        makeRec209(4,  { revelation: 'midpoint discovery', suspenseDelta: 1.5 }),
        makeRec209(5,  { seededClueIds: ['c2'] }),
        makeRec209(6,  { suspenseDelta: 0.5 }),  // flat
        makeRec209(7,  { suspenseDelta: 1.5 }),  // building — NOT flat
        makeRec209(8,  { clockRaised: true, suspenseDelta: 3 }),
        makeRec209(9,  { emotionalShift: 'negative', clockRaised: true, revelation: 'consequence', suspenseDelta: 4 }),
        makeRec209(10, { revelation: 'aftermath', suspenseDelta: 1 }),
        makeRec209(11, { purpose: 'resolution', suspenseDelta: 0.5 }),
      ];
      const result209f = await structurePass({
        fountain: blankFountain209(12), original: blankFountain209(12),
        records: records209f as any, structure: baseStructure209 as any, annotations: [], approvedSpans: [],
      });
      assert.ok(
        !result209f.issues.some(i => i.rule === 'PRE_CLIMAX_LULL'),
        'Should NOT fire when the second pre-climax scene has suspenseDelta >= 1 (only one flat scene)',
      );
    });
  });


  describe('Wave 198 — structurePass: act3 scene excess, tension drop abrupt, act1 revelation absent', async () => {
    const makeRec198 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const baseStr198 = {
      escalating: true, completionPercent: 80, actPosition: 'act3',
      midpointPressure: 2, tightestScene: null, reversalCount: 1,
      revelationCount: 3, avgSuspensePerScene: 1, approachingClimax: false,
    };
    const makeInput198 = (records: any[]) => ({
      fountain: 'INT. SC - DAY\nA.\n', original: 'INT. SC - DAY\nA.\n',
      records: records as any, structure: baseStr198 as any,
      storyContext: {} as any, annotations: records.map(() => null) as any,
      approvedSpans: [],
    });

    it('ACT3_SCENE_EXCESS fires when act3 has more scenes than act1', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // 9 records: act1 = records 0-1 (2 scenes), act3 = records 6-8 (3 scenes)
      const records = [
        makeRec198(0, { seededClueIds: ['c1'] }),
        makeRec198(1),
        makeRec198(2, { suspenseDelta: 2 }),
        makeRec198(3, { revelation: 'x' }),
        makeRec198(4),
        makeRec198(5, { emotionalShift: 'negative', suspenseDelta: 2 }),
        makeRec198(6, { suspenseDelta: 2, clockRaised: true }),
        makeRec198(7),
        makeRec198(8, { revelation: 'y' }),
      ];
      const result = await structurePass(makeInput198(records));
      assert.ok(result.issues.some((i: any) => i.rule === 'ACT3_SCENE_EXCESS'),
        'Should fire when act3 has more scenes than act1');
    });

    it('ACT3_SCENE_EXCESS does not fire when act1 and act3 have equal scene counts', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // 8 records: act1 = records 0-1 (2 scenes), act3 = records 6-7 (2 scenes)
      const records = [
        makeRec198(0, { seededClueIds: ['c1'] }),
        makeRec198(1),
        makeRec198(2, { suspenseDelta: 2 }),
        makeRec198(3, { revelation: 'x' }),
        makeRec198(4),
        makeRec198(5, { emotionalShift: 'negative', suspenseDelta: 2 }),
        makeRec198(6, { suspenseDelta: 2, clockRaised: true }),
        makeRec198(7, { revelation: 'y' }),
      ];
      const result = await structurePass(makeInput198(records));
      assert.ok(!result.issues.some((i: any) => i.rule === 'ACT3_SCENE_EXCESS'),
        'Should NOT fire when act3 scene count equals act1 scene count');
    });

    it('TENSION_DROP_ABRUPT fires when climax peak is immediately followed by a flat non-resolution scene', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // 6 records: peak at record 4 (suspense 3), abrupt drop to 0 at record 5 (dialogue)
      const records = [
        makeRec198(0, { clockRaised: true }),
        makeRec198(1, { suspenseDelta: 2 }),
        makeRec198(2),
        makeRec198(3),
        makeRec198(4, { suspenseDelta: 3 }),
        makeRec198(5, { suspenseDelta: 0, purpose: 'dialogue' }),
      ];
      const result = await structurePass(makeInput198(records));
      assert.ok(result.issues.some((i: any) => i.rule === 'TENSION_DROP_ABRUPT'),
        'Should fire when climax peak drops abruptly to flat non-resolution scene');
    });

    it('TENSION_DROP_ABRUPT does not fire when the scene after the peak is a resolution beat', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // Same setup but final scene is marked as resolution — expected landing
      const records = [
        makeRec198(0, { clockRaised: true }),
        makeRec198(1, { suspenseDelta: 2 }),
        makeRec198(2),
        makeRec198(3),
        makeRec198(4, { suspenseDelta: 3 }),
        makeRec198(5, { suspenseDelta: 0, purpose: 'resolution' }),
      ];
      const result = await structurePass(makeInput198(records));
      assert.ok(!result.issues.some((i: any) => i.rule === 'TENSION_DROP_ABRUPT'),
        'Should NOT fire when the scene after the peak is a resolution beat');
    });

    it('ACT1_REVELATION_ABSENT fires when story has 3+ revelations but none in act1', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // 8 records: revelations at records 3, 5, 7; none in act1 (records 0-1)
      const records = [
        makeRec198(0, { clockRaised: true }),
        makeRec198(1),
        makeRec198(2, { suspenseDelta: 2 }),
        makeRec198(3, { revelation: 'midpoint truth' }),
        makeRec198(4),
        makeRec198(5, { revelation: 'late act2 reveal', emotionalShift: 'negative', suspenseDelta: 2 }),
        makeRec198(6, { suspenseDelta: 2, clockRaised: true }),
        makeRec198(7, { revelation: 'climax reveal' }),
      ];
      const result = await structurePass(makeInput198(records));
      assert.ok(result.issues.some((i: any) => i.rule === 'ACT1_REVELATION_ABSENT'),
        'Should fire when 3+ revelations exist but none land in act1');
    });

    it('ACT1_REVELATION_ABSENT does not fire when act1 contains a revelation', async () => {
      const { structurePass } = await import('../../server/nvm/revision/passes/structure.ts');
      // Same setup but record 0 also has a revelation
      const records = [
        makeRec198(0, { clockRaised: true, revelation: 'opening reveal' }),
        makeRec198(1),
        makeRec198(2, { suspenseDelta: 2 }),
        makeRec198(3, { revelation: 'midpoint truth' }),
        makeRec198(4),
        makeRec198(5, { revelation: 'late act2 reveal', emotionalShift: 'negative', suspenseDelta: 2 }),
        makeRec198(6, { suspenseDelta: 2, clockRaised: true }),
        makeRec198(7, { revelation: 'climax reveal' }),
      ];
      const result = await structurePass(makeInput198(records));
      assert.ok(!result.issues.some((i: any) => i.rule === 'ACT1_REVELATION_ABSENT'),
        'Should NOT fire when act1 contains a revelation');
    });
  });


describe('Wave 139 — structurePass: Act boundaries + inciting incident', () => {
  // Build a minimal PassInput with 6 scenes: Act 1 (0-1), Act 2a (2-3), Act 2b (4), Act 3 (5)
  function makeStructInput(seedCluesInAct1 = false, highSuspenseAtAct1End = false, highSuspenseAtAct2End = false) {
    const commits = [
      // Act 1, Scene 0: optional clue seed
      makeScreenplayCommit(0, [
        { op: 'UPDATE_READER_STATE', delta: { suspense: 1 } } as StoryOp,
        ...(seedCluesInAct1 ? [{ op: 'SEED_CLUE' as const, clueId: 'c1', carrier: 'object' as const } as StoryOp] : []),
      ]),
      // Act 1, Scene 1 (Act 1 boundary): optionally high suspense
      makeScreenplayCommit(1, [
        { op: 'UPDATE_READER_STATE', delta: { suspense: highSuspenseAtAct1End ? 2 : 0.5 } } as StoryOp,
      ]),
      // Act 2a, Scene 2
      makeScreenplayCommit(2, [{ op: 'UPDATE_READER_STATE', delta: { suspense: 1.5 } } as StoryOp]),
      // Act 2a, Scene 3
      makeScreenplayCommit(3, [{ op: 'UPDATE_READER_STATE', delta: { suspense: 1 } } as StoryOp]),
      // Act 2b, Scene 4 (Act 2 boundary): optionally high suspense
      makeScreenplayCommit(4, [
        { op: 'UPDATE_READER_STATE', delta: { suspense: highSuspenseAtAct2End ? 2.5 : 0.8 } } as StoryOp,
      ]),
      // Act 3, Scene 5
      makeScreenplayCommit(5, [{ op: 'UPDATE_READER_STATE', delta: { suspense: 1 } } as StoryOp]),
    ];
    const records = buildScreenplayMemory(commits);
    const structure = analyzeStructure(records, commits);
    return { fountain: 'INT. A - DAY\n\n', original: '', annotations: [], structure, records, approvedSpans: [] };
  }

  it('MISSING_INCITING_INCIDENT fires when Act 1 has no clues, shifts, or clock raises', async () => {
    const input = makeStructInput(false, false, false);
    const result = await structurePass(input);
    assert.ok(
      result.issues.some(i => i.rule === 'MISSING_INCITING_INCIDENT'),
      `should detect missing inciting incident; got: ${result.issues.map(i => i.rule).join(', ')}`,
    );
  });

  it('MISSING_INCITING_INCIDENT does NOT fire when Act 1 seeds a clue', async () => {
    const input = makeStructInput(true, false, false);
    const result = await structurePass(input);
    assert.ok(
      !result.issues.some(i => i.rule === 'MISSING_INCITING_INCIDENT'),
      `should not fire when Act 1 has a clue seed`,
    );
  });

  it('ACT1_BOUNDARY_WEAK fires when Act 1 ending has low suspense delta', async () => {
    const input = makeStructInput(true, false, false);
    const result = await structurePass(input);
    assert.ok(
      result.issues.some(i => i.rule === 'ACT1_BOUNDARY_WEAK'),
      `should detect weak Act 1 boundary; got: ${result.issues.map(i => i.rule).join(', ')}`,
    );
  });

  it('ACT1_BOUNDARY_WEAK does NOT fire when Act 1 ending has high suspense delta', async () => {
    const input = makeStructInput(true, true, false);
    const result = await structurePass(input);
    assert.ok(
      !result.issues.some(i => i.rule === 'ACT1_BOUNDARY_WEAK'),
      `should not fire when Act 1 boundary has high suspense`,
    );
  });

  it('ACT2_BOUNDARY_WEAK fires when Act 2 ending has low suspense delta', async () => {
    const input = makeStructInput(true, true, false);
    const result = await structurePass(input);
    assert.ok(
      result.issues.some(i => i.rule === 'ACT2_BOUNDARY_WEAK'),
      `should detect weak Act 2 boundary; got: ${result.issues.map(i => i.rule).join(', ')}`,
    );
  });

  it('ACT2_BOUNDARY_WEAK does NOT fire when Act 2 ending has high suspense delta', async () => {
    const input = makeStructInput(true, true, true);
    const result = await structurePass(input);
    assert.ok(
      !result.issues.some(i => i.rule === 'ACT2_BOUNDARY_WEAK'),
      `should not fire when Act 2 boundary has high suspense`,
    );
  });
});