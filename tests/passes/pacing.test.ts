// Extracted from the former monolithic test.ts (audit M2.1 — split for maintainability).
// pacingPass revision-rule tests. Shared imports/helpers below are duplicated verbatim across every split
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
// Aliased: this file already has its own local makeSceneRecord (line ~522, a pre-existing
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


  describe('Wave 172 — pacingPass: plateau, opening bloat, suspense/length decoupling', async () => {
    const makeRec = (idx: number, override: Partial<any> = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'dialogue', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
      ...override,
    });
    const noAnnotations = (n: number) => Array.from({ length: n }, () => ({ revelation: false } as any));
    function makeFountainWithLengths(sceneLinesArray: number[]): string {
      return sceneLinesArray.map((len, i) => {
        const body = Array.from({ length: len }, (_, j) => `Scene ${i} action line ${j + 1}.`).join('\n');
        return `INT. SC${i} - DAY\n\n${body}\n`;
      }).join('\n');
    }

    // ── PACING_PLATEAU ────────────────────────────────────────────────────────
    it('pacingPass detects PACING_PLATEAU when 4 consecutive scenes match in length', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // Scenes 0-3 all 10 lines (plateau); rest varied so global variance stays high
      const sceneLens = [10, 10, 10, 10, 2, 25, 3, 22, 4];
      const records = Array.from({ length: 9 }, (_, i) => makeRec(i));
      const result = await pacingPass({
        fountain: makeFountainWithLengths(sceneLens),
        original: '', records: records as any, structure: {} as any,
        annotations: noAnnotations(9), approvedSpans: [],
      });
      const plateau = result.issues.filter(i => i.rule === 'PACING_PLATEAU');
      assert.ok(plateau.length >= 1, `Should detect PACING_PLATEAU; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(plateau[0].severity === 'minor');
    });

    it('pacingPass does NOT fire PACING_PLATEAU when no 4-scene run is uniform', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      const sceneLens = [2, 10, 3, 15, 4, 12, 5, 20, 6];
      const records = Array.from({ length: 9 }, (_, i) => makeRec(i));
      const result = await pacingPass({
        fountain: makeFountainWithLengths(sceneLens),
        original: '', records: records as any, structure: {} as any,
        annotations: noAnnotations(9), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'PACING_PLATEAU'),
        'Should NOT fire when scene lengths vary across every 4-scene window',
      );
    });

    // ── OPENING_SCENE_BLOAT ───────────────────────────────────────────────────
    it('pacingPass detects OPENING_SCENE_BLOAT when scene 0 is >2x average', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // avg = (17 + 5*5)/6 = 7; scene 0 = 17 > 14 (2x) and < 17.5 (2.5x, below OVERLONG)
      const sceneLens = [17, 5, 5, 5, 5, 5];
      const records = Array.from({ length: 6 }, (_, i) => makeRec(i));
      const result = await pacingPass({
        fountain: makeFountainWithLengths(sceneLens),
        original: '', records: records as any, structure: {} as any,
        annotations: noAnnotations(6), approvedSpans: [],
      });
      const bloat = result.issues.filter(i => i.rule === 'OPENING_SCENE_BLOAT');
      assert.ok(bloat.length >= 1, `Should detect OPENING_SCENE_BLOAT; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(bloat[0].severity === 'minor');
    });

    it('pacingPass does NOT fire OPENING_SCENE_BLOAT when opening is proportionate', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      const sceneLens = [8, 7, 6, 9, 5, 7];
      const records = Array.from({ length: 6 }, (_, i) => makeRec(i));
      const result = await pacingPass({
        fountain: makeFountainWithLengths(sceneLens),
        original: '', records: records as any, structure: {} as any,
        annotations: noAnnotations(6), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'OPENING_SCENE_BLOAT'),
        'Should NOT fire when the opening scene is close to average length',
      );
    });

    // ── SUSPENSE_LENGTH_DECOUPLING ────────────────────────────────────────────
    it('pacingPass detects SUSPENSE_LENGTH_DECOUPLING when page space is inverse to tension', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // Low-tension scenes are long, high-tension scenes are short
      const sceneLens = [18, 18, 4, 4, 16, 16, 4, 4];
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, { suspenseDelta: (i === 2 || i === 3 || i === 6 || i === 7) ? 3 : 0.5 }),
      );
      const result = await pacingPass({
        fountain: makeFountainWithLengths(sceneLens),
        original: '', records: records as any, structure: {} as any,
        annotations: noAnnotations(8), approvedSpans: [],
      });
      const decoupling = result.issues.filter(i => i.rule === 'SUSPENSE_LENGTH_DECOUPLING');
      assert.ok(decoupling.length >= 1, `Should detect SUSPENSE_LENGTH_DECOUPLING; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(decoupling[0].severity === 'major');
    });

    it('pacingPass does NOT fire SUSPENSE_LENGTH_DECOUPLING when high-tension scenes get more space', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // High-tension scenes are long, low-tension scenes are short (proper allocation)
      const sceneLens = [4, 4, 18, 18, 5, 5, 16, 16];
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, { suspenseDelta: (i === 2 || i === 3 || i === 6 || i === 7) ? 3 : 0.5 }),
      );
      const result = await pacingPass({
        fountain: makeFountainWithLengths(sceneLens),
        original: '', records: records as any, structure: {} as any,
        annotations: noAnnotations(8), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'SUSPENSE_LENGTH_DECOUPLING'),
        'Should NOT fire when high-tension scenes are allocated more page space',
      );
    });
  });


  describe('Wave 189 — pacingPass: velocity drop, climax runway, resolution bloat', async () => {
    const makeRec = (idx: number, override: Partial<any> = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'dialogue', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
      ...override,
    });
    const noAnnotations = (n: number) => Array.from({ length: n }, () => ({ revelation: false } as any));
    function makeFountainWithLengths(sceneLinesArray: number[]): string {
      return sceneLinesArray.map((len, i) => {
        const body = Array.from({ length: len }, (_, j) => `Scene ${i} action line ${j + 1}.`).join('\n');
        return `INT. SC${i} - DAY\n\n${body}\n`;
      }).join('\n');
    }

    // ── SCENE_VELOCITY_DROP ────────────────────────────────────────────────────
    it('pacingPass detects SCENE_VELOCITY_DROP when second half scenes are much longer', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // avgFirst=(3+7+3+7)/4=5; avgSecond=(9+11+4+4)/4=7; 7>5*1.3=6.5 → fires
      const sceneLens = [3, 7, 3, 7, 9, 11, 4, 4];
      const records = Array.from({ length: 8 }, (_, i) => makeRec(i));
      const result = await pacingPass({
        fountain: makeFountainWithLengths(sceneLens),
        original: '', records: records as any, structure: {} as any,
        annotations: noAnnotations(8), approvedSpans: [],
      });
      const drop = result.issues.filter(i => i.rule === 'SCENE_VELOCITY_DROP');
      assert.ok(drop.length >= 1, `Should detect SCENE_VELOCITY_DROP; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(drop[0].severity === 'minor');
    });

    it('pacingPass does NOT fire SCENE_VELOCITY_DROP when first half is longer', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // avgFirst=(12+14+12+14)/4=13; avgSecond=(6+8+6+8)/4=7; 7>13*1.3=16.9? No
      const sceneLens = [12, 14, 12, 14, 6, 8, 6, 8];
      const records = Array.from({ length: 8 }, (_, i) => makeRec(i));
      const result = await pacingPass({
        fountain: makeFountainWithLengths(sceneLens),
        original: '', records: records as any, structure: {} as any,
        annotations: noAnnotations(8), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'SCENE_VELOCITY_DROP'),
        'Should NOT fire when first-half scenes are longer than second-half',
      );
    });

    // ── CLIMAX_RUNWAY_OVERLONG ─────────────────────────────────────────────────
    it('pacingPass detects CLIMAX_RUNWAY_OVERLONG when 3 pre-climax scenes exceed average length', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // avg=(4+6+5+7+16+16+16+5)/8=9.375; scenes 4,5,6 are all 16>avg; peak at scene 7
      const sceneLens = [4, 6, 5, 7, 16, 16, 16, 5];
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, { suspenseDelta: i === 7 ? 5 : 1 }),
      );
      const result = await pacingPass({
        fountain: makeFountainWithLengths(sceneLens),
        original: '', records: records as any, structure: {} as any,
        annotations: noAnnotations(8), approvedSpans: [],
      });
      const runway = result.issues.filter(i => i.rule === 'CLIMAX_RUNWAY_OVERLONG');
      assert.ok(runway.length >= 1, `Should detect CLIMAX_RUNWAY_OVERLONG; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(runway[0].severity === 'minor');
    });

    it('pacingPass does NOT fire CLIMAX_RUNWAY_OVERLONG when a runway scene is short', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // avg=(4+6+5+7+3+16+16+5)/8=7.75; scene4=3<avg → runway not all above avg
      const sceneLens = [4, 6, 5, 7, 3, 16, 16, 5];
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, { suspenseDelta: i === 7 ? 5 : 1 }),
      );
      const result = await pacingPass({
        fountain: makeFountainWithLengths(sceneLens),
        original: '', records: records as any, structure: {} as any,
        annotations: noAnnotations(8), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'CLIMAX_RUNWAY_OVERLONG'),
        'Should NOT fire when one runway scene is below average length',
      );
    });

    // ── RESOLUTION_SCENE_BLOAT ─────────────────────────────────────────────────
    it('pacingPass detects RESOLUTION_SCENE_BLOAT when final two scenes are overlong and flat', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // avg=(5+7+6+8+12+12)/6=8.33; scenes 4,5 both=12>avg, suspense=1<1.5 → fires
      const sceneLens = [5, 7, 6, 8, 12, 12];
      const records = Array.from({ length: 6 }, (_, i) => makeRec(i));
      const result = await pacingPass({
        fountain: makeFountainWithLengths(sceneLens),
        original: '', records: records as any, structure: {} as any,
        annotations: noAnnotations(6), approvedSpans: [],
      });
      const bloat = result.issues.filter(i => i.rule === 'RESOLUTION_SCENE_BLOAT');
      assert.ok(bloat.length >= 1, `Should detect RESOLUTION_SCENE_BLOAT; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(bloat[0].severity === 'minor');
    });

    it('pacingPass does NOT fire RESOLUTION_SCENE_BLOAT when the final scene is short', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // avg=(8+9+8+9+12+5)/6=8.5; last scene=5<avg → not both above avg
      const sceneLens = [8, 9, 8, 9, 12, 5];
      const records = Array.from({ length: 6 }, (_, i) => makeRec(i));
      const result = await pacingPass({
        fountain: makeFountainWithLengths(sceneLens),
        original: '', records: records as any, structure: {} as any,
        annotations: noAnnotations(6), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'RESOLUTION_SCENE_BLOAT'),
        'Should NOT fire when the final scene is shorter than average',
      );
    });
  });


  describe('Wave 232 — pacingPass: pacing spike scene, peak length misplaced, act-transition jolt', async () => {
    const makeRec232 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 1, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, dialogueHighlights: [],
      revelation: null, purpose: 'development', dramaticTurn: '',
      seededClueIds: [], payoffSetupIds: [], relationshipShifts: [],
      ...overrides,
    });

    it('PACING_SPIKE_SCENE fires when one scene is ≥2.5× the average length', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // 6 scenes: first 5 are ~3 lines each, scene 2 has 20 action lines → spike
      const normalScene = (i: number) =>
        `INT. SC${i} - DAY\nAction line one.\nALICE\nBrief dialogue.\n`;
      const spikeScene =
        `INT. SC2 - DAY\n` + Array.from({ length: 20 }, (_, k) => `Action line ${k+1}.`).join('\n') + '\n';
      const fountain232a = [
        normalScene(0), normalScene(1), spikeScene, normalScene(3), normalScene(4), normalScene(5),
      ].join('\n');
      const records232a = Array.from({ length: 6 }, (_, i) => makeRec232(i, { suspenseDelta: 1 + i * 0.2 }));
      const result = await pacingPass({
        fountain: fountain232a, original: fountain232a,
        records: records232a,
        structure: { escalating: true, avgSuspensePerScene: 1.5, reversalDensity: 0, openClues: 0, completionPercent: 70, approachingClimax: false } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'PACING_SPIKE_SCENE');
      assert.ok(match.length >= 1, `Expected PACING_SPIKE_SCENE, got: ${JSON.stringify(result.issues.map((i:any)=>i.rule))}`);
    });

    it('PACING_SPIKE_SCENE does NOT fire when all scenes have comparable lengths', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      const evenScene = (i: number) =>
        `INT. SC${i} - DAY\nAction line one.\nAction line two.\nALICE\nDialogue here.\n`;
      const fountain232b = Array.from({ length: 6 }, (_, i) => evenScene(i)).join('\n');
      const records232b = Array.from({ length: 6 }, (_, i) => makeRec232(i));
      const result = await pacingPass({
        fountain: fountain232b, original: fountain232b,
        records: records232b,
        structure: { escalating: true, avgSuspensePerScene: 1, reversalDensity: 0, openClues: 0, completionPercent: 70, approachingClimax: false } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'PACING_SPIKE_SCENE');
      assert.strictEqual(match.length, 0, 'Should NOT fire when all scenes have similar lengths');
    });

    it('PEAK_LENGTH_MISPLACED fires when the longest scene is in Act 1', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // 8 scenes: scene 0 (Act 1) is very long, rest are short
      const longScene =
        `INT. SC0 - DAY\n` + Array.from({ length: 20 }, (_, k) => `Opening action ${k+1}.`).join('\n') + '\n';
      const shortScene = (i: number) => `INT. SC${i} - DAY\nAction.\nALICE\nLine.\n`;
      const fountain232c = [longScene, ...Array.from({ length: 7 }, (_, i) => shortScene(i + 1))].join('\n');
      const records232c = Array.from({ length: 8 }, (_, i) => makeRec232(i));
      const result = await pacingPass({
        fountain: fountain232c, original: fountain232c,
        records: records232c,
        structure: { escalating: true, avgSuspensePerScene: 1, reversalDensity: 0, openClues: 0, completionPercent: 80, approachingClimax: true } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'PEAK_LENGTH_MISPLACED');
      assert.ok(match.length >= 1, `Expected PEAK_LENGTH_MISPLACED, got: ${JSON.stringify(result.issues.map((i:any)=>i.rule))}`);
    });

    it('PEAK_LENGTH_MISPLACED does NOT fire when the longest scene is in Act 3', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // 8 scenes: scene 7 (Act 3) is very long, Act 1 scenes are short
      const shortScene = (i: number) => `INT. SC${i} - DAY\nAction.\nALICE\nLine.\n`;
      const climaxScene =
        `INT. SC7 - DAY\n` + Array.from({ length: 20 }, (_, k) => `Climax action ${k+1}.`).join('\n') + '\n';
      const fountain232d = [...Array.from({ length: 7 }, (_, i) => shortScene(i)), climaxScene].join('\n');
      const records232d = Array.from({ length: 8 }, (_, i) => makeRec232(i, {
        purpose: i === 7 ? 'climax' : 'development',
        suspenseDelta: i === 7 ? 5 : 1,
      }));
      const result = await pacingPass({
        fountain: fountain232d, original: fountain232d,
        records: records232d,
        structure: { escalating: true, avgSuspensePerScene: 2, reversalDensity: 1, openClues: 0, completionPercent: 90, approachingClimax: true } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'PEAK_LENGTH_MISPLACED');
      assert.strictEqual(match.length, 0, 'Should NOT fire when the longest scene is in Act 3');
    });

    it('ACT_TRANSITION_JOLT fires when scene length jumps dramatically at an act boundary', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // 8 scenes: scene 1 (last of Act1) is short, scene 2 (first of Act2 at 25%) is very long
      // Act1/Act2 boundary at floor(8*0.25)=2. Scene 1 is short, scene 2 is very long.
      const shortSc = (i: number) => `INT. SC${i} - DAY\nAction.\nALICE\nLine.\n`;
      const longSc = (i: number) =>
        `INT. SC${i} - DAY\n` + Array.from({ length: 18 }, (_, k) => `Long action ${k+1}.`).join('\n') + '\n';
      const fountain232e = [
        shortSc(0), shortSc(1), longSc(2), shortSc(3),
        shortSc(4), shortSc(5), shortSc(6), shortSc(7),
      ].join('\n');
      const records232e = Array.from({ length: 8 }, (_, i) => makeRec232(i));
      const result = await pacingPass({
        fountain: fountain232e, original: fountain232e,
        records: records232e,
        structure: { escalating: true, avgSuspensePerScene: 1, reversalDensity: 0, openClues: 0, completionPercent: 80, approachingClimax: false } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'ACT_TRANSITION_JOLT');
      assert.ok(match.length >= 1, `Expected ACT_TRANSITION_JOLT, got: ${JSON.stringify(result.issues.map((i:any)=>i.rule))}`);
    });

    it('ACT_TRANSITION_JOLT does NOT fire when act boundary lengths are gradual', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // 8 scenes: all roughly the same length → no jolt at any boundary
      const evenSc = (i: number) =>
        `INT. SC${i} - DAY\nAction one.\nAction two.\nALICE\nDialogue.\n`;
      const fountain232f = Array.from({ length: 8 }, (_, i) => evenSc(i)).join('\n');
      const records232f = Array.from({ length: 8 }, (_, i) => makeRec232(i));
      const result = await pacingPass({
        fountain: fountain232f, original: fountain232f,
        records: records232f,
        structure: { escalating: true, avgSuspensePerScene: 1, reversalDensity: 0, openClues: 0, completionPercent: 80, approachingClimax: false } as any,
        annotations: [], approvedSpans: [],
      });
      const match = result.issues.filter((i: any) => i.rule === 'ACT_TRANSITION_JOLT');
      assert.strictEqual(match.length, 0, 'Should NOT fire when act boundary pacing is gradual');
    });
  });


  describe('Wave 677 — pacingPass: pacing clock delta peak uncaused, pacing turn drought run, pacing stakes zone cluster', async () => {
    const runP677 = async (records: ScreenplaySceneRecord[]) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      return pacingPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // PACING_CLOCK_DELTA_PEAK_UNCAUSED fire:
    // 8 scenes; clockDelta at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('PACING_CLOCK_DELTA_PEAK_UNCAUSED fires when the peak clockDelta scene has no dramatic turn or revelation nearby', async () => {
      const recs677a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs677a[2] = makeSharedRecord(2, { clockDelta: 1 });
      recs677a[6] = makeSharedRecord(6, { clockDelta: 5 });
      const res = await runP677(recs677a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PACING_CLOCK_DELTA_PEAK_UNCAUSED'), 'PACING_CLOCK_DELTA_PEAK_UNCAUSED should fire');
    });

    // PACING_CLOCK_DELTA_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('PACING_CLOCK_DELTA_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs677an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs677an[2] = makeSharedRecord(2, { clockDelta: 1 });
      recs677an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs677an[6] = makeSharedRecord(6, { clockDelta: 5 });
      const res = await runP677(recs677an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PACING_CLOCK_DELTA_PEAK_UNCAUSED'), 'PACING_CLOCK_DELTA_PEAK_UNCAUSED should not fire');
    });

    // PACING_TURN_DROUGHT_RUN fire:
    // 10 scenes; dramatic turns at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('PACING_TURN_DROUGHT_RUN fires when the longest no-turn run is ≥6', async () => {
      const recs677b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs677b[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs677b[1] = makeSharedRecord(1, { dramaticTurn: 'reversal' });
      recs677b[2] = makeSharedRecord(2, { dramaticTurn: 'reversal' });
      recs677b[9] = makeSharedRecord(9, { dramaticTurn: 'reversal' });
      const res = await runP677(recs677b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PACING_TURN_DROUGHT_RUN'), 'PACING_TURN_DROUGHT_RUN should fire');
    });

    // PACING_TURN_DROUGHT_RUN no-fire:
    // dramatic turns at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('PACING_TURN_DROUGHT_RUN does not fire when dramatic turns are distributed without a long drought', async () => {
      const recs677bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs677bn[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs677bn[4] = makeSharedRecord(4, { dramaticTurn: 'reversal' });
      recs677bn[9] = makeSharedRecord(9, { dramaticTurn: 'reversal' });
      const res = await runP677(recs677bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PACING_TURN_DROUGHT_RUN'), 'PACING_TURN_DROUGHT_RUN should not fire');
    });

    // PACING_STAKES_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; stakes-raising scenes at 0,1,2 → 100% opening third
    it('PACING_STAKES_ZONE_CLUSTER fires when >75% of stakes-raising scenes cluster in one third', async () => {
      const recs677c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs677c[0] = makeSharedRecord(0, { purpose: 'raise_stakes' });
      recs677c[1] = makeSharedRecord(1, { purpose: 'raise_stakes' });
      recs677c[2] = makeSharedRecord(2, { purpose: 'raise_stakes' });
      const res = await runP677(recs677c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PACING_STAKES_ZONE_CLUSTER'), 'PACING_STAKES_ZONE_CLUSTER should fire');
    });

    // PACING_STAKES_ZONE_CLUSTER no-fire:
    // stakes-raising scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('PACING_STAKES_ZONE_CLUSTER does not fire when stakes-raising scenes are distributed across thirds', async () => {
      const recs677cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs677cn[0] = makeSharedRecord(0, { purpose: 'raise_stakes' });
      recs677cn[4] = makeSharedRecord(4, { purpose: 'raise_stakes' });
      recs677cn[7] = makeSharedRecord(7, { purpose: 'raise_stakes' });
      const res = await runP677(recs677cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PACING_STAKES_ZONE_CLUSTER'), 'PACING_STAKES_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 663 — pacingPass: pacing relationship peak uncaused, pacing seed drought run, pacing payoff zone cluster', async () => {
    const runP663 = async (records: ScreenplaySceneRecord[]) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      return pacingPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // PACING_RELATIONSHIP_PEAK_UNCAUSED fire:
    // 8 scenes; shifts at 2 (1 shift) and 6 (5 shifts, the peak); no dramaticTurn or revelation at
    // 6, 5, or 4
    it('PACING_RELATIONSHIP_PEAK_UNCAUSED fires when the peak relationship-shift scene has no dramatic turn or revelation nearby', async () => {
      const recs663a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs663a[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs663a[6] = makeSharedRecord(6, { relationshipShifts: [0, 1, 2, 3, 4].map(n => ({ pairKey: `a|${n}`, dimension: 'trust', amount: 0.2 })) });
      const res = await runP663(recs663a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PACING_RELATIONSHIP_PEAK_UNCAUSED'), 'PACING_RELATIONSHIP_PEAK_UNCAUSED should fire');
    });

    // PACING_RELATIONSHIP_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('PACING_RELATIONSHIP_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs663an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs663an[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs663an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs663an[6] = makeSharedRecord(6, { relationshipShifts: [0, 1, 2, 3, 4].map(n => ({ pairKey: `a|${n}`, dimension: 'trust', amount: 0.2 })) });
      const res = await runP663(recs663an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PACING_RELATIONSHIP_PEAK_UNCAUSED'), 'PACING_RELATIONSHIP_PEAK_UNCAUSED should not fire');
    });

    // PACING_SEED_DROUGHT_RUN fire:
    // 10 scenes; seeded at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('PACING_SEED_DROUGHT_RUN fires when the longest no-seed run is ≥6', async () => {
      const recs663b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs663b[0] = makeSharedRecord(0, { seededClueIds: ['clue-x'] });
      recs663b[1] = makeSharedRecord(1, { seededClueIds: ['clue-x'] });
      recs663b[2] = makeSharedRecord(2, { seededClueIds: ['clue-x'] });
      recs663b[9] = makeSharedRecord(9, { seededClueIds: ['clue-x'] });
      const res = await runP663(recs663b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PACING_SEED_DROUGHT_RUN'), 'PACING_SEED_DROUGHT_RUN should fire');
    });

    // PACING_SEED_DROUGHT_RUN no-fire:
    // seeded at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('PACING_SEED_DROUGHT_RUN does not fire when seeding is distributed without a long drought', async () => {
      const recs663bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs663bn[0] = makeSharedRecord(0, { seededClueIds: ['clue-x'] });
      recs663bn[4] = makeSharedRecord(4, { seededClueIds: ['clue-x'] });
      recs663bn[9] = makeSharedRecord(9, { seededClueIds: ['clue-x'] });
      const res = await runP663(recs663bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PACING_SEED_DROUGHT_RUN'), 'PACING_SEED_DROUGHT_RUN should not fire');
    });

    // PACING_PAYOFF_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; payoff scenes at 0,1,2 → 100% opening third
    it('PACING_PAYOFF_ZONE_CLUSTER fires when >75% of payoff scenes cluster in one third', async () => {
      const recs663c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs663c[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs663c[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs663c[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-c'] });
      const res = await runP663(recs663c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PACING_PAYOFF_ZONE_CLUSTER'), 'PACING_PAYOFF_ZONE_CLUSTER should fire');
    });

    // PACING_PAYOFF_ZONE_CLUSTER no-fire:
    // payoff scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('PACING_PAYOFF_ZONE_CLUSTER does not fire when payoff scenes are distributed across thirds', async () => {
      const recs663cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs663cn[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs663cn[4] = makeSharedRecord(4, { payoffSetupIds: ['thread-b'] });
      recs663cn[7] = makeSharedRecord(7, { payoffSetupIds: ['thread-c'] });
      const res = await runP663(recs663cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PACING_PAYOFF_ZONE_CLUSTER'), 'PACING_PAYOFF_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 649 — pacingPass: pacing staging peak uncaused, pacing open thread drought run, pacing highlight zone cluster', async () => {
    const runP649 = async (records: ScreenplaySceneRecord[]) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      return pacingPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // PACING_STAGING_PEAK_UNCAUSED fire:
    // 8 scenes; staging at 2 (1 beat) and 6 (5 beats, the peak); no dramaticTurn or revelation at
    // 6, 5, or 4
    it('PACING_STAGING_PEAK_UNCAUSED fires when the peak physical-staging scene has no dramatic turn or revelation nearby', async () => {
      const recs649a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs649a[2] = makeSharedRecord(2, { visualBeats: ['glances at the clock'] });
      recs649a[6] = makeSharedRecord(6, { visualBeats: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runP649(recs649a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PACING_STAGING_PEAK_UNCAUSED'), 'PACING_STAGING_PEAK_UNCAUSED should fire');
    });

    // PACING_STAGING_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('PACING_STAGING_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs649an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs649an[2] = makeSharedRecord(2, { visualBeats: ['glances at the clock'] });
      recs649an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs649an[6] = makeSharedRecord(6, { visualBeats: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runP649(recs649an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PACING_STAGING_PEAK_UNCAUSED'), 'PACING_STAGING_PEAK_UNCAUSED should not fire');
    });

    // PACING_OPEN_THREAD_DROUGHT_RUN fire:
    // 10 scenes; debt at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('PACING_OPEN_THREAD_DROUGHT_RUN fires when the longest no-debt run is ≥6', async () => {
      const recs649b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs649b[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs649b[1] = makeSharedRecord(1, { unresolvedClues: ['b'] });
      recs649b[2] = makeSharedRecord(2, { unresolvedClues: ['c'] });
      recs649b[9] = makeSharedRecord(9, { unresolvedClues: ['d'] });
      const res = await runP649(recs649b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PACING_OPEN_THREAD_DROUGHT_RUN'), 'PACING_OPEN_THREAD_DROUGHT_RUN should fire');
    });

    // PACING_OPEN_THREAD_DROUGHT_RUN no-fire:
    // debt at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('PACING_OPEN_THREAD_DROUGHT_RUN does not fire when debt is distributed without a long drought', async () => {
      const recs649bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs649bn[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs649bn[4] = makeSharedRecord(4, { unresolvedClues: ['b'] });
      recs649bn[9] = makeSharedRecord(9, { unresolvedClues: ['c'] });
      const res = await runP649(recs649bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PACING_OPEN_THREAD_DROUGHT_RUN'), 'PACING_OPEN_THREAD_DROUGHT_RUN should not fire');
    });

    // PACING_HIGHLIGHT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; highlighted-dialogue scenes at 0,1,2 → 100% opening third
    it('PACING_HIGHLIGHT_ZONE_CLUSTER fires when >75% of highlighted-dialogue scenes cluster in one third', async () => {
      const recs649c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs649c[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs649c[1] = makeSharedRecord(1, { dialogueHighlights: ['line-b'] });
      recs649c[2] = makeSharedRecord(2, { dialogueHighlights: ['line-c'] });
      const res = await runP649(recs649c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PACING_HIGHLIGHT_ZONE_CLUSTER'), 'PACING_HIGHLIGHT_ZONE_CLUSTER should fire');
    });

    // PACING_HIGHLIGHT_ZONE_CLUSTER no-fire:
    // highlighted-dialogue scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('PACING_HIGHLIGHT_ZONE_CLUSTER does not fire when highlighted-dialogue scenes are distributed across thirds', async () => {
      const recs649cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs649cn[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs649cn[4] = makeSharedRecord(4, { dialogueHighlights: ['line-b'] });
      recs649cn[7] = makeSharedRecord(7, { dialogueHighlights: ['line-c'] });
      const res = await runP649(recs649cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PACING_HIGHLIGHT_ZONE_CLUSTER'), 'PACING_HIGHLIGHT_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 635 — pacingPass: pacing open thread staging decoupled, pacing seed staging aftermath void, pacing open thread zone imbalance', async () => {
    const runP635 = async (records: ScreenplaySceneRecord[]) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      return pacingPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // PACING_OPEN_THREAD_STAGING_DECOUPLED fire:
    // n=6; debt at 0,1 (no staging); staged at 4,5 (no debt) → zero overlap → fires
    it('PACING_OPEN_THREAD_STAGING_DECOUPLED fires when open-thread scenes and visually-staged scenes never overlap', async () => {
      const recs635a = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs635a[0] = makeSharedRecord(0, { unresolvedClues: ['unpaid-clue'] });
      recs635a[1] = makeSharedRecord(1, { unresolvedClues: ['unpaid-clue'] });
      recs635a[4] = makeSharedRecord(4, { visualBeats: ['checks the mailbox', 'reads the postmark'] });
      recs635a[5] = makeSharedRecord(5, { visualBeats: ['checks the mailbox', 'reads the postmark'] });
      const res = await runP635(recs635a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PACING_OPEN_THREAD_STAGING_DECOUPLED'), 'PACING_OPEN_THREAD_STAGING_DECOUPLED should fire');
    });

    // PACING_OPEN_THREAD_STAGING_DECOUPLED no-fire:
    // scene 0 carries BOTH open debt and visual staging → overlap exists
    it('PACING_OPEN_THREAD_STAGING_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs635an = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs635an[0] = makeSharedRecord(0, { unresolvedClues: ['unpaid-clue'], visualBeats: ['checks the mailbox', 'reads the postmark'] });
      recs635an[1] = makeSharedRecord(1, { unresolvedClues: ['unpaid-clue'] });
      recs635an[5] = makeSharedRecord(5, { visualBeats: ['checks the mailbox', 'reads the postmark'] });
      const res = await runP635(recs635an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PACING_OPEN_THREAD_STAGING_DECOUPLED'), 'PACING_OPEN_THREAD_STAGING_DECOUPLED should not fire');
    });

    // PACING_SEED_STAGING_AFTERMATH_VOID fire:
    // n=8, window=2; seed triggers at 0,1; their windows {1,2} and {2,3} carry no visually
    // dense scene; staged scenes exist elsewhere at 5,6,7 → fires
    it('PACING_SEED_STAGING_AFTERMATH_VOID fires when no seed is followed by a visually dense scene within 2 scenes', async () => {
      const recs635b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs635b[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs635b[1] = makeSharedRecord(1, { seededClueIds: ['clue-b'] });
      recs635b[5] = makeSharedRecord(5, { visualBeats: ['checks the mailbox', 'reads the postmark'] });
      recs635b[6] = makeSharedRecord(6, { visualBeats: ['checks the mailbox', 'reads the postmark'] });
      recs635b[7] = makeSharedRecord(7, { visualBeats: ['checks the mailbox', 'reads the postmark'] });
      const res = await runP635(recs635b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PACING_SEED_STAGING_AFTERMATH_VOID'), 'PACING_SEED_STAGING_AFTERMATH_VOID should fire');
    });

    // PACING_SEED_STAGING_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries staging → that trigger's aftermath
    // is no longer void
    it('PACING_SEED_STAGING_AFTERMATH_VOID does not fire when a trigger window contains a visually dense scene', async () => {
      const recs635bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs635bn[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs635bn[1] = makeSharedRecord(1, { seededClueIds: ['clue-b'] });
      recs635bn[3] = makeSharedRecord(3, { visualBeats: ['checks the mailbox', 'reads the postmark'] });
      recs635bn[5] = makeSharedRecord(5, { visualBeats: ['checks the mailbox', 'reads the postmark'] });
      recs635bn[6] = makeSharedRecord(6, { visualBeats: ['checks the mailbox', 'reads the postmark'] });
      recs635bn[7] = makeSharedRecord(7, { visualBeats: ['checks the mailbox', 'reads the postmark'] });
      const res = await runP635(recs635bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PACING_SEED_STAGING_AFTERMATH_VOID'), 'PACING_SEED_STAGING_AFTERMATH_VOID should not fire');
    });

    // PACING_OPEN_THREAD_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); debt at 6,7,8,9; zone 2 (6-8)=3, zone 3 (9)=1, total=4;
    // zones 0,1 empty; bloatZoneIdx=zone2, 3/4=75% ≥ 50% → fires
    it('PACING_OPEN_THREAD_ZONE_IMBALANCE fires when one zone is empty of open-thread scenes while another is bloated', async () => {
      const recs635c = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs635c[6] = makeSharedRecord(6, { unresolvedClues: ['a'] });
      recs635c[7] = makeSharedRecord(7, { unresolvedClues: ['b'] });
      recs635c[8] = makeSharedRecord(8, { unresolvedClues: ['c'] });
      recs635c[9] = makeSharedRecord(9, { unresolvedClues: ['d'] });
      const res = await runP635(recs635c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PACING_OPEN_THREAD_ZONE_IMBALANCE'), 'PACING_OPEN_THREAD_ZONE_IMBALANCE should fire');
    });

    // PACING_OPEN_THREAD_ZONE_IMBALANCE no-fire:
    // one open-thread scene per zone (1,4,7,10) → no zone is empty
    it('PACING_OPEN_THREAD_ZONE_IMBALANCE does not fire when open-thread scenes are spread across all zones', async () => {
      const recs635cn = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs635cn[1] = makeSharedRecord(1, { unresolvedClues: ['a'] });
      recs635cn[4] = makeSharedRecord(4, { unresolvedClues: ['b'] });
      recs635cn[7] = makeSharedRecord(7, { unresolvedClues: ['c'] });
      recs635cn[10] = makeSharedRecord(10, { unresolvedClues: ['d'] });
      const res = await runP635(recs635cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PACING_OPEN_THREAD_ZONE_IMBALANCE'), 'PACING_OPEN_THREAD_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 621 — pacingPass: pacing dialogue highlight zone imbalance, pacing payoff staging decoupled, revelation aftermath staging flat', async () => {
    const runP621 = async (records: ScreenplaySceneRecord[]) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      return pacingPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // PACING_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); highlights at 6,7,8,9; zone 2 (6-8)=3, zone 3 (9)=1, total=4;
    // zones 0,1 empty; bloatZoneIdx=zone2, 3/4=75% ≥ 50% → fires
    it('PACING_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE fires when one zone is empty of dialogue highlights while another is bloated', async () => {
      const recs621a = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs621a[6] = makeSharedRecord(6, { dialogueHighlights: ['line-a'] });
      recs621a[7] = makeSharedRecord(7, { dialogueHighlights: ['line-b'] });
      recs621a[8] = makeSharedRecord(8, { dialogueHighlights: ['line-c'] });
      recs621a[9] = makeSharedRecord(9, { dialogueHighlights: ['line-d'] });
      const res = await runP621(recs621a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PACING_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE'), 'PACING_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE should fire');
    });

    // PACING_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE no-fire:
    // one highlight per zone (1,4,7,10) → no zone is empty
    it('PACING_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE does not fire when highlights are spread across all zones', async () => {
      const recs621an = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs621an[1] = makeSharedRecord(1, { dialogueHighlights: ['line-a'] });
      recs621an[4] = makeSharedRecord(4, { dialogueHighlights: ['line-b'] });
      recs621an[7] = makeSharedRecord(7, { dialogueHighlights: ['line-c'] });
      recs621an[10] = makeSharedRecord(10, { dialogueHighlights: ['line-d'] });
      const res = await runP621(recs621an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PACING_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE'), 'PACING_DIALOGUE_HIGHLIGHT_ZONE_IMBALANCE should not fire');
    });

    // PACING_PAYOFF_STAGING_DECOUPLED fire:
    // n=6; payoffs at 0,1 (no staging); staged at 4,5 (no payoff) → zero overlap → fires
    it('PACING_PAYOFF_STAGING_DECOUPLED fires when payoff scenes and visually-staged scenes never overlap', async () => {
      const recs621b = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs621b[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs621b[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs621b[4] = makeSharedRecord(4, { visualBeats: ['unlocks the drawer', 'reads the letter'] });
      recs621b[5] = makeSharedRecord(5, { visualBeats: ['unlocks the drawer', 'reads the letter'] });
      const res = await runP621(recs621b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PACING_PAYOFF_STAGING_DECOUPLED'), 'PACING_PAYOFF_STAGING_DECOUPLED should fire');
    });

    // PACING_PAYOFF_STAGING_DECOUPLED no-fire:
    // scene 0 carries BOTH a payoff and visual staging → overlap exists
    it('PACING_PAYOFF_STAGING_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs621bn = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs621bn[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'], visualBeats: ['unlocks the drawer', 'reads the letter'] });
      recs621bn[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs621bn[5] = makeSharedRecord(5, { visualBeats: ['unlocks the drawer', 'reads the letter'] });
      const res = await runP621(recs621bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PACING_PAYOFF_STAGING_DECOUPLED'), 'PACING_PAYOFF_STAGING_DECOUPLED should not fire');
    });

    // REVELATION_AFTERMATH_STAGING_FLAT fire:
    // n=8, window=2; revelation triggers at 0,1; their windows {1,2} and {2,3} carry no visually
    // dense scene; staged scenes exist elsewhere at 5,6,7 → fires
    it('REVELATION_AFTERMATH_STAGING_FLAT fires when no revelation is followed by a visually dense scene within 2 scenes', async () => {
      const recs621c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs621c[0] = makeSharedRecord(0, { revelation: 'The truth comes out' });
      recs621c[1] = makeSharedRecord(1, { revelation: 'Another truth' });
      recs621c[5] = makeSharedRecord(5, { visualBeats: ['unlocks the drawer', 'reads the letter'] });
      recs621c[6] = makeSharedRecord(6, { visualBeats: ['unlocks the drawer', 'reads the letter'] });
      recs621c[7] = makeSharedRecord(7, { visualBeats: ['unlocks the drawer', 'reads the letter'] });
      const res = await runP621(recs621c);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_AFTERMATH_STAGING_FLAT'), 'REVELATION_AFTERMATH_STAGING_FLAT should fire');
    });

    // REVELATION_AFTERMATH_STAGING_FLAT no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries staging → that trigger's aftermath
    // is no longer void
    it('REVELATION_AFTERMATH_STAGING_FLAT does not fire when a trigger window contains a visually dense scene', async () => {
      const recs621cn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs621cn[0] = makeSharedRecord(0, { revelation: 'The truth comes out' });
      recs621cn[1] = makeSharedRecord(1, { revelation: 'Another truth' });
      recs621cn[3] = makeSharedRecord(3, { visualBeats: ['unlocks the drawer', 'reads the letter'] });
      recs621cn[5] = makeSharedRecord(5, { visualBeats: ['unlocks the drawer', 'reads the letter'] });
      recs621cn[6] = makeSharedRecord(6, { visualBeats: ['unlocks the drawer', 'reads the letter'] });
      recs621cn[7] = makeSharedRecord(7, { visualBeats: ['unlocks the drawer', 'reads the letter'] });
      const res = await runP621(recs621cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_AFTERMATH_STAGING_FLAT'), 'REVELATION_AFTERMATH_STAGING_FLAT should not fire');
    });
  });

  describe('Wave 607 — pacingPass: open thread aftermath suspense flat, open thread aftermath curiosity flat, open thread aftermath emotion flat', async () => {
    const runP607 = async (records: ScreenplaySceneRecord[]) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      return pacingPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    it('OPEN_THREAD_AFTERMATH_SUSPENSE_FLAT fires when no heavy clue-debt scene is followed by a suspense rise', async () => {
      // 8 scenes; heavy-debt triggers at 0,1 (windows reach at most scene 3); suspense rises at
      // 5,6,7 (well outside every trigger's 2-scene window)
      const recs607a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs607a[0] = makeSharedRecord(0, { unresolvedClues: ['c1', 'c2', 'c3'] });
      recs607a[1] = makeSharedRecord(1, { unresolvedClues: ['c1', 'c2', 'c3'] });
      recs607a[5] = makeSharedRecord(5, { suspenseDelta: 1 });
      recs607a[6] = makeSharedRecord(6, { suspenseDelta: 1 });
      const res = await runP607(recs607a);
      assert.ok(res.issues.some((i: any) => i.rule === 'OPEN_THREAD_AFTERMATH_SUSPENSE_FLAT'), 'OPEN_THREAD_AFTERMATH_SUSPENSE_FLAT should fire');
    });

    it('OPEN_THREAD_AFTERMATH_SUSPENSE_FLAT does not fire when a heavy clue-debt scene is followed by a suspense rise within 2 scenes', async () => {
      const recs607a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs607a[0] = makeSharedRecord(0, { unresolvedClues: ['c1', 'c2', 'c3'] });
      recs607a[1] = makeSharedRecord(1, { suspenseDelta: 1 });
      recs607a[2] = makeSharedRecord(2, { unresolvedClues: ['c1', 'c2', 'c3'] });
      recs607a[5] = makeSharedRecord(5, { suspenseDelta: 1 });
      const res = await runP607(recs607a);
      assert.ok(!res.issues.some((i: any) => i.rule === 'OPEN_THREAD_AFTERMATH_SUSPENSE_FLAT'), 'OPEN_THREAD_AFTERMATH_SUSPENSE_FLAT should not fire');
    });

    it('OPEN_THREAD_AFTERMATH_CURIOSITY_FLAT fires when no heavy clue-debt scene is followed by a curiosity rise', async () => {
      const recs607b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs607b[0] = makeSharedRecord(0, { unresolvedClues: ['c1', 'c2', 'c3'] });
      recs607b[1] = makeSharedRecord(1, { unresolvedClues: ['c1', 'c2', 'c3'] });
      recs607b[5] = makeSharedRecord(5, { curiosityDelta: 1 });
      recs607b[6] = makeSharedRecord(6, { curiosityDelta: 1 });
      const res = await runP607(recs607b);
      assert.ok(res.issues.some((i: any) => i.rule === 'OPEN_THREAD_AFTERMATH_CURIOSITY_FLAT'), 'OPEN_THREAD_AFTERMATH_CURIOSITY_FLAT should fire');
    });

    it('OPEN_THREAD_AFTERMATH_CURIOSITY_FLAT does not fire when a heavy clue-debt scene is followed by a curiosity rise within 2 scenes', async () => {
      const recs607b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs607b[0] = makeSharedRecord(0, { unresolvedClues: ['c1', 'c2', 'c3'] });
      recs607b[1] = makeSharedRecord(1, { curiosityDelta: 1 });
      recs607b[2] = makeSharedRecord(2, { unresolvedClues: ['c1', 'c2', 'c3'] });
      recs607b[5] = makeSharedRecord(5, { curiosityDelta: 1 });
      const res = await runP607(recs607b);
      assert.ok(!res.issues.some((i: any) => i.rule === 'OPEN_THREAD_AFTERMATH_CURIOSITY_FLAT'), 'OPEN_THREAD_AFTERMATH_CURIOSITY_FLAT should not fire');
    });

    it('OPEN_THREAD_AFTERMATH_EMOTION_FLAT fires when no heavy clue-debt scene is followed by a non-neutral emotional shift', async () => {
      const recs607c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs607c[0] = makeSharedRecord(0, { unresolvedClues: ['c1', 'c2', 'c3'] });
      recs607c[1] = makeSharedRecord(1, { unresolvedClues: ['c1', 'c2', 'c3'] });
      recs607c[5] = makeSharedRecord(5, { emotionalShift: 'negative' });
      recs607c[6] = makeSharedRecord(6, { emotionalShift: 'positive' });
      const res = await runP607(recs607c);
      assert.ok(res.issues.some((i: any) => i.rule === 'OPEN_THREAD_AFTERMATH_EMOTION_FLAT'), 'OPEN_THREAD_AFTERMATH_EMOTION_FLAT should fire');
    });

    it('OPEN_THREAD_AFTERMATH_EMOTION_FLAT does not fire when a heavy clue-debt scene is followed by a non-neutral emotional shift within 2 scenes', async () => {
      const recs607c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs607c[0] = makeSharedRecord(0, { unresolvedClues: ['c1', 'c2', 'c3'] });
      recs607c[1] = makeSharedRecord(1, { emotionalShift: 'negative' });
      recs607c[2] = makeSharedRecord(2, { unresolvedClues: ['c1', 'c2', 'c3'] });
      recs607c[5] = makeSharedRecord(5, { emotionalShift: 'positive' });
      const res = await runP607(recs607c);
      assert.ok(!res.issues.some((i: any) => i.rule === 'OPEN_THREAD_AFTERMATH_EMOTION_FLAT'), 'OPEN_THREAD_AFTERMATH_EMOTION_FLAT should not fire');
    });
  });


  describe('Wave 593 — pacingPass: stakes aftermath suspense flat, stakes aftermath curiosity flat, stakes aftermath emotion flat', async () => {
    // Uses the shared tests/passes/helpers.ts factories (audit M2.2) instead of a local
    // makeRecNNN clone — makeSharedRecord() defaults purpose to the real 'complicate'
    // ScenePurpose enum value, and 'raise_stakes' below is a real member of that enum too.
    const runP593 = async (records: ScreenplaySceneRecord[]) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      return pacingPass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    it('STAKES_AFTERMATH_SUSPENSE_FLAT fires when no stakes-raise is followed by a suspense rise', async () => {
      // 9 scenes; stakes-raises at 0,1,2 (windows reach at most scene 4); suspense rises at 7,8
      // (well outside every trigger's 2-scene window)
      const recs593a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs593a[0] = makeSharedRecord(0, { purpose: 'raise_stakes' });
      recs593a[1] = makeSharedRecord(1, { purpose: 'raise_stakes' });
      recs593a[2] = makeSharedRecord(2, { purpose: 'raise_stakes' });
      recs593a[7] = makeSharedRecord(7, { suspenseDelta: 1 });
      recs593a[8] = makeSharedRecord(8, { suspenseDelta: 1 });
      const res = await runP593(recs593a);
      assert.ok(res.issues.some((i: any) => i.rule === 'STAKES_AFTERMATH_SUSPENSE_FLAT'), 'STAKES_AFTERMATH_SUSPENSE_FLAT should fire');
    });

    it('STAKES_AFTERMATH_SUSPENSE_FLAT does not fire when a stakes-raise is followed by a suspense rise within 2 scenes', async () => {
      const recs593a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs593a[1] = makeSharedRecord(1, { purpose: 'raise_stakes' });
      recs593a[2] = makeSharedRecord(2, { suspenseDelta: 1 });
      recs593a[3] = makeSharedRecord(3, { purpose: 'raise_stakes' });
      recs593a[5] = makeSharedRecord(5, { purpose: 'raise_stakes' });
      recs593a[7] = makeSharedRecord(7, { suspenseDelta: 1 });
      const res = await runP593(recs593a);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STAKES_AFTERMATH_SUSPENSE_FLAT'), 'STAKES_AFTERMATH_SUSPENSE_FLAT should not fire');
    });

    it('STAKES_AFTERMATH_CURIOSITY_FLAT fires when no stakes-raise is followed by a curiosity rise', async () => {
      // 9 scenes; stakes-raises at 0,1,2 (windows reach at most scene 4); curiosity rises at 7,8
      const recs593b = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs593b[0] = makeSharedRecord(0, { purpose: 'raise_stakes' });
      recs593b[1] = makeSharedRecord(1, { purpose: 'raise_stakes' });
      recs593b[2] = makeSharedRecord(2, { purpose: 'raise_stakes' });
      recs593b[7] = makeSharedRecord(7, { curiosityDelta: 1 });
      recs593b[8] = makeSharedRecord(8, { curiosityDelta: 1 });
      const res = await runP593(recs593b);
      assert.ok(res.issues.some((i: any) => i.rule === 'STAKES_AFTERMATH_CURIOSITY_FLAT'), 'STAKES_AFTERMATH_CURIOSITY_FLAT should fire');
    });

    it('STAKES_AFTERMATH_CURIOSITY_FLAT does not fire when a stakes-raise is followed by a curiosity rise within 2 scenes', async () => {
      const recs593b = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs593b[1] = makeSharedRecord(1, { purpose: 'raise_stakes' });
      recs593b[2] = makeSharedRecord(2, { curiosityDelta: 1 });
      recs593b[3] = makeSharedRecord(3, { purpose: 'raise_stakes' });
      recs593b[5] = makeSharedRecord(5, { purpose: 'raise_stakes' });
      recs593b[7] = makeSharedRecord(7, { curiosityDelta: 1 });
      const res = await runP593(recs593b);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STAKES_AFTERMATH_CURIOSITY_FLAT'), 'STAKES_AFTERMATH_CURIOSITY_FLAT should not fire');
    });

    it('STAKES_AFTERMATH_EMOTION_FLAT fires when no stakes-raise is followed by a non-neutral emotional shift', async () => {
      // 9 scenes; stakes-raises at 0,1,2 (windows reach at most scene 4); emotional shifts at 7,8
      const recs593c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs593c[0] = makeSharedRecord(0, { purpose: 'raise_stakes' });
      recs593c[1] = makeSharedRecord(1, { purpose: 'raise_stakes' });
      recs593c[2] = makeSharedRecord(2, { purpose: 'raise_stakes' });
      recs593c[7] = makeSharedRecord(7, { emotionalShift: 'negative' });
      recs593c[8] = makeSharedRecord(8, { emotionalShift: 'positive' });
      const res = await runP593(recs593c);
      assert.ok(res.issues.some((i: any) => i.rule === 'STAKES_AFTERMATH_EMOTION_FLAT'), 'STAKES_AFTERMATH_EMOTION_FLAT should fire');
    });

    it('STAKES_AFTERMATH_EMOTION_FLAT does not fire when a stakes-raise is followed by a non-neutral emotional shift within 2 scenes', async () => {
      const recs593c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs593c[1] = makeSharedRecord(1, { purpose: 'raise_stakes' });
      recs593c[2] = makeSharedRecord(2, { emotionalShift: 'negative' });
      recs593c[3] = makeSharedRecord(3, { purpose: 'raise_stakes' });
      recs593c[5] = makeSharedRecord(5, { purpose: 'raise_stakes' });
      recs593c[7] = makeSharedRecord(7, { emotionalShift: 'positive' });
      const res = await runP593(recs593c);
      assert.ok(!res.issues.some((i: any) => i.rule === 'STAKES_AFTERMATH_EMOTION_FLAT'), 'STAKES_AFTERMATH_EMOTION_FLAT should not fire');
    });
  });

  describe('Wave 579 — pacingPass: payoff peak uncaused, suspense closing zone absent, clock zone cluster', async () => {
    const makeRec579 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: false,
      dialogueHighlights: [], relationshipShifts: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeFountain579 = (n: number) =>
      Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\n\nAction line for scene ${i}.`).join('\n\n');
    const runP579 = async (records: any[]) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      return pacingPass({
        fountain: makeFountain579(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // PAYOFF_PEAK_UNCAUSED fire: n=10; peak payoff at idx 4 (3 setups), other payoff at idx 8 (1 setup);
    // no revelation/turn/clock in idx 2,3,4 → hasCause=false → fires
    it('PAYOFF_PEAK_UNCAUSED fires when the densest payoff scene has no causal event in prior 2 scenes', async () => {
      const recs579a = Array.from({ length: 10 }, (_, i) =>
        makeRec579(i, {
          payoffSetupIds: i === 4 ? ['a', 'b', 'c'] : i === 8 ? ['x'] : [],
        }),
      );
      const res = await runP579(recs579a);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_PEAK_UNCAUSED'), 'PAYOFF_PEAK_UNCAUSED should fire');
    });

    // PAYOFF_PEAK_UNCAUSED no-fire: same setup but idx 3 has revelation=true → prior scene has cause → no fire
    it('PAYOFF_PEAK_UNCAUSED does not fire when a prior scene provides a causal event for the payoff peak', async () => {
      const recs579anr = Array.from({ length: 10 }, (_, i) =>
        makeRec579(i, {
          payoffSetupIds: i === 4 ? ['a', 'b', 'c'] : i === 8 ? ['x'] : [],
          revelation: i === 3,
        }),
      );
      const res = await runP579(recs579anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_PEAK_UNCAUSED'), 'PAYOFF_PEAK_UNCAUSED should not fire');
    });

    // SUSPENSE_CLOSING_ZONE_ABSENT fire: n=9; suspenseDelta>0 at idx 0-5 only; closing third (idx 6-8) all flat
    it('SUSPENSE_CLOSING_ZONE_ABSENT fires when suspense scenes are all absent from the final third', async () => {
      const recs579b = Array.from({ length: 9 }, (_, i) =>
        makeRec579(i, { suspenseDelta: i < 6 ? 1 : 0 }),
      );
      const res = await runP579(recs579b);
      assert.ok(res.issues.some((i: any) => i.rule === 'SUSPENSE_CLOSING_ZONE_ABSENT'), 'SUSPENSE_CLOSING_ZONE_ABSENT should fire');
    });

    // SUSPENSE_CLOSING_ZONE_ABSENT no-fire: idx 8 (closing third) has suspenseDelta=1
    it('SUSPENSE_CLOSING_ZONE_ABSENT does not fire when at least one suspense scene falls in the closing third', async () => {
      const recs579bnr = Array.from({ length: 9 }, (_, i) =>
        makeRec579(i, { suspenseDelta: i === 8 ? 1 : i < 5 ? 1 : 0 }),
      );
      const res = await runP579(recs579bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SUSPENSE_CLOSING_ZONE_ABSENT'), 'SUSPENSE_CLOSING_ZONE_ABSENT should not fire');
    });

    // CLOCK_ZONE_CLUSTER fire: n=9; all 3 clockRaised scenes at idx 0,1,2 (opening third) → 3/3=100% > 75%
    it('CLOCK_ZONE_CLUSTER fires when >75% of clock scenes are concentrated in one structural third', async () => {
      const recs579c = Array.from({ length: 9 }, (_, i) =>
        makeRec579(i, { clockRaised: i < 3 }),
      );
      const res = await runP579(recs579c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_ZONE_CLUSTER'), 'CLOCK_ZONE_CLUSTER should fire');
    });

    // CLOCK_ZONE_CLUSTER no-fire: 4 clock scenes spread: idx 0 (z1), idx 3,4 (z2), idx 7 (z3) → max 2/4=50% ≤ 75%
    it('CLOCK_ZONE_CLUSTER does not fire when clock scenes are spread across structural thirds', async () => {
      const recs579cnr = Array.from({ length: 9 }, (_, i) =>
        makeRec579(i, { clockRaised: [0, 3, 4, 7].includes(i) }),
      );
      const res = await runP579(recs579cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_ZONE_CLUSTER'), 'CLOCK_ZONE_CLUSTER should not fire');
    });
  });


  describe('Wave 565 — pacingPass: seed aftermath suspense flat, seed aftermath curiosity flat, seed aftermath emotion flat', async () => {
    const makeRec565 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeFountain565 = (n: number) =>
      Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\n\nAction line for scene ${i}.`).join('\n\n');
    const runP565 = async (records: any[]) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      return pacingPass({
        fountain: makeFountain565(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // SEED_AFTERMATH_SUSPENSE_FLAT fire:
    // n=8; seeds at idx 1,3,5 (all < n-2=6); next scenes (2,4,6) suspenseDelta=0 → avg=0 ≤ 0 → fires
    it('SEED_AFTERMATH_SUSPENSE_FLAT fires when all seeds have avg next-scene suspenseDelta ≤ 0', async () => {
      const recs565a = Array.from({ length: 8 }, (_, i) =>
        makeRec565(i, { seededClueIds: [1, 3, 5].includes(i) ? ['clue1'] : [], suspenseDelta: 0 }),
      );
      const res = await runP565(recs565a);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_AFTERMATH_SUSPENSE_FLAT'), 'SEED_AFTERMATH_SUSPENSE_FLAT should fire');
    });

    // SEED_AFTERMATH_SUSPENSE_FLAT no-fire:
    // n=8; seeds at 1,3,5; scene 4 (next after seed at 3) suspenseDelta=2 → avg > 0 → no fire
    it('SEED_AFTERMATH_SUSPENSE_FLAT does not fire when a seed is followed by positive suspenseDelta', async () => {
      const recs565an = Array.from({ length: 8 }, (_, i) =>
        makeRec565(i, { seededClueIds: [1, 3, 5].includes(i) ? ['clue1'] : [], suspenseDelta: i === 4 ? 2 : 0 }),
      );
      const res = await runP565(recs565an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_AFTERMATH_SUSPENSE_FLAT'), 'SEED_AFTERMATH_SUSPENSE_FLAT should not fire');
    });

    // SEED_AFTERMATH_CURIOSITY_FLAT fire:
    // n=8; seeds at 1,3,5; all 2-scene windows have curiosityDelta=0 → all flat → fires
    it('SEED_AFTERMATH_CURIOSITY_FLAT fires when all seeds are followed by 2 scenes with curiosityDelta ≤ 0', async () => {
      const recs565b = Array.from({ length: 8 }, (_, i) =>
        makeRec565(i, { seededClueIds: [1, 3, 5].includes(i) ? ['clue1'] : [], curiosityDelta: 0 }),
      );
      const res = await runP565(recs565b);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_AFTERMATH_CURIOSITY_FLAT'), 'SEED_AFTERMATH_CURIOSITY_FLAT should fire');
    });

    // SEED_AFTERMATH_CURIOSITY_FLAT no-fire:
    // n=8; seeds at 1,3,5; scene 4 (aftermath of seed at 3) curiosityDelta=1 → not all flat → no fire
    it('SEED_AFTERMATH_CURIOSITY_FLAT does not fire when a seed aftermath has curiosityDelta > 0', async () => {
      const recs565bn = Array.from({ length: 8 }, (_, i) =>
        makeRec565(i, { seededClueIds: [1, 3, 5].includes(i) ? ['clue1'] : [], curiosityDelta: i === 4 ? 1 : 0 }),
      );
      const res = await runP565(recs565bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_AFTERMATH_CURIOSITY_FLAT'), 'SEED_AFTERMATH_CURIOSITY_FLAT should not fire');
    });

    // SEED_AFTERMATH_EMOTION_FLAT fire:
    // n=8; seeds at 1,3,5; all aftermath scenes emotionally neutral → fires
    it('SEED_AFTERMATH_EMOTION_FLAT fires when all seeds are followed by 2 neutral-emotion scenes', async () => {
      const recs565c = Array.from({ length: 8 }, (_, i) =>
        makeRec565(i, { seededClueIds: [1, 3, 5].includes(i) ? ['clue1'] : [], emotionalShift: 'neutral' }),
      );
      const res = await runP565(recs565c);
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_AFTERMATH_EMOTION_FLAT'), 'SEED_AFTERMATH_EMOTION_FLAT should fire');
    });

    // SEED_AFTERMATH_EMOTION_FLAT no-fire:
    // n=8; seeds at 1,3,5; scene 4 (aftermath of seed at 3) emotionalShift='negative' → not all neutral → no fire
    it('SEED_AFTERMATH_EMOTION_FLAT does not fire when a seed aftermath carries emotion', async () => {
      const recs565cn = Array.from({ length: 8 }, (_, i) =>
        makeRec565(i, { seededClueIds: [1, 3, 5].includes(i) ? ['clue1'] : [], emotionalShift: i === 4 ? 'negative' : 'neutral' }),
      );
      const res = await runP565(recs565cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_AFTERMATH_EMOTION_FLAT'), 'SEED_AFTERMATH_EMOTION_FLAT should not fire');
    });
  });


  describe('Wave 551 — pacingPass: turn aftermath suspense flat, turn aftermath curiosity flat, turn aftermath emotion flat', async () => {
    const makeRec551 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeFountain551 = (n: number) =>
      Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\n\nAction line for scene ${i}.`).join('\n\n');
    const runP551 = async (records: any[]) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      return pacingPass({
        fountain: makeFountain551(records.length), original: '', records,
        structure: { escalating: true, avgSuspensePerScene: 0, completionPercent: 50,
          approachingClimax: false, revelationCount: 0, actBreaks: [] } as any,
        annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    it('TURN_AFTERMATH_SUSPENSE_FLAT fires when all turns have avg next-scene suspenseDelta ≤ 0', async () => {
      // n=8; turns at idx 1,3,5 (all ≠ last 2 positions [6,7]); next scenes all have suspenseDelta=0 → avg=0 ≤ 0 → fires.
      const recs551a = Array.from({ length: 8 }, (_, i) =>
        makeRec551(i, {
          dramaticTurn: [1, 3, 5].includes(i) ? 'reversal' : 'nothing',
          suspenseDelta: 0,
        }),
      );
      const res = await runP551(recs551a);
      assert.ok(res.issues.some((i: any) => i.rule === 'TURN_AFTERMATH_SUSPENSE_FLAT'), 'TURN_AFTERMATH_SUSPENSE_FLAT should fire');
    });

    it('TURN_AFTERMATH_SUSPENSE_FLAT does not fire when turns are followed by positive suspenseDelta', async () => {
      // n=8; turns at idx 1,3,5; next scene after idx 3 (=idx 4) has suspenseDelta=2 → avg > 0 → no fire.
      const recs551an = Array.from({ length: 8 }, (_, i) =>
        makeRec551(i, {
          dramaticTurn: [1, 3, 5].includes(i) ? 'reversal' : 'nothing',
          suspenseDelta: i === 4 ? 2 : 0,
        }),
      );
      const res = await runP551(recs551an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TURN_AFTERMATH_SUSPENSE_FLAT'), 'TURN_AFTERMATH_SUSPENSE_FLAT should not fire');
    });

    it('TURN_AFTERMATH_CURIOSITY_FLAT fires when all turns are followed by 2 scenes with curiosityDelta ≤ 0', async () => {
      // n=8; turns at 1,3,5; all windows (scenes 2-3, 4-5, 6-7) have curiosityDelta=0 → all flat → fires.
      const recs551b = Array.from({ length: 8 }, (_, i) =>
        makeRec551(i, {
          dramaticTurn: [1, 3, 5].includes(i) ? 'recognition' : 'nothing',
          curiosityDelta: 0,
        }),
      );
      const res = await runP551(recs551b);
      assert.ok(res.issues.some((i: any) => i.rule === 'TURN_AFTERMATH_CURIOSITY_FLAT'), 'TURN_AFTERMATH_CURIOSITY_FLAT should fire');
    });

    it('TURN_AFTERMATH_CURIOSITY_FLAT does not fire when a turn aftermath has curiosityDelta > 0', async () => {
      // n=8; turns at 1,3,5; scene 4 (aftermath of turn at 3) has curiosityDelta=1 → not all flat → no fire.
      const recs551bn = Array.from({ length: 8 }, (_, i) =>
        makeRec551(i, {
          dramaticTurn: [1, 3, 5].includes(i) ? 'recognition' : 'nothing',
          curiosityDelta: i === 4 ? 1 : 0,
        }),
      );
      const res = await runP551(recs551bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TURN_AFTERMATH_CURIOSITY_FLAT'), 'TURN_AFTERMATH_CURIOSITY_FLAT should not fire');
    });

    it('TURN_AFTERMATH_EMOTION_FLAT fires when all turns are followed by 2 neutral-emotion scenes', async () => {
      // n=8; turns at 1,3,5; all aftermath scenes neutral → fires.
      const recs551c = Array.from({ length: 8 }, (_, i) =>
        makeRec551(i, {
          dramaticTurn: [1, 3, 5].includes(i) ? 'twist' : 'nothing',
          emotionalShift: 'neutral',
        }),
      );
      const res = await runP551(recs551c);
      assert.ok(res.issues.some((i: any) => i.rule === 'TURN_AFTERMATH_EMOTION_FLAT'), 'TURN_AFTERMATH_EMOTION_FLAT should fire');
    });

    it('TURN_AFTERMATH_EMOTION_FLAT does not fire when a turn aftermath has non-neutral emotion', async () => {
      // n=8; turns at 1,3,5; scene 2 (aftermath of turn at 1) has emotionalShift='positive' → not all neutral → no fire.
      const recs551cn = Array.from({ length: 8 }, (_, i) =>
        makeRec551(i, {
          dramaticTurn: [1, 3, 5].includes(i) ? 'twist' : 'nothing',
          emotionalShift: i === 2 ? 'positive' : 'neutral',
        }),
      );
      const res = await runP551(recs551cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'TURN_AFTERMATH_EMOTION_FLAT'), 'TURN_AFTERMATH_EMOTION_FLAT should not fire');
    });
  });


  describe('Wave 537 — pacingPass: revelation curiosity aftermath flat, payoff opening zone absent, revelation middle zone absent', async () => {
    const makeRec537 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeFountain537 = (n: number) =>
      Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\n\nAction line for scene ${i}.`).join('\n\n');
    const runPA537 = async (records: any[]) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      return pacingPass({
        fountain: makeFountain537(records.length), original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
      });
    };

    it('REVELATION_CURIOSITY_AFTERMATH_FLAT fires when all revelations are followed by curiosity-flat scenes', async () => {
      // 10 scenes: revelations at pos 1,3,5 (not in last 2); following 2 scenes all have curiosityDelta=0 → fires
      const recs537a = Array.from({ length: 10 }, (_, i) =>
        makeRec537(i, { revelation: [1, 3, 5].includes(i) ? 'The truth.' : null })
      );
      const res = await runPA537(recs537a);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_CURIOSITY_AFTERMATH_FLAT'), 'REVELATION_CURIOSITY_AFTERMATH_FLAT should fire');
    });

    it('REVELATION_CURIOSITY_AFTERMATH_FLAT does not fire when a revelation is followed by a curiosity rise', async () => {
      // Same but scene 2 (after revelation at 1) has curiosityDelta=1 → anyRevNoCurAftermath=false → no fire
      const recs537anr = Array.from({ length: 10 }, (_, i) =>
        makeRec537(i, {
          revelation: [1, 3, 5].includes(i) ? 'The truth.' : null,
          curiosityDelta: i === 2 ? 1 : 0,
        })
      );
      const res = await runPA537(recs537anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_CURIOSITY_AFTERMATH_FLAT'), 'REVELATION_CURIOSITY_AFTERMATH_FLAT should not fire');
    });

    it('PAYOFF_OPENING_ZONE_ABSENT fires when no payoff scenes are in the opening third', async () => {
      // 9 scenes (third=3); payoffs at pos 3,5,7 (all in middle/closing thirds) → none in opening → fires
      const recs537b = Array.from({ length: 9 }, (_, i) =>
        makeRec537(i, { payoffSetupIds: [3, 5, 7].includes(i) ? ['setup-A'] : [] })
      );
      const res = await runPA537(recs537b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_OPENING_ZONE_ABSENT'), 'PAYOFF_OPENING_ZONE_ABSENT should fire');
    });

    it('PAYOFF_OPENING_ZONE_ABSENT does not fire when a payoff is in the opening third', async () => {
      // 9 scenes (third=3); payoff at pos 1 (opening third) + pos 5,7 → anyInOpening=true → no fire
      const recs537bnr = Array.from({ length: 9 }, (_, i) =>
        makeRec537(i, { payoffSetupIds: [1, 5, 7].includes(i) ? ['setup-A'] : [] })
      );
      const res = await runPA537(recs537bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_OPENING_ZONE_ABSENT'), 'PAYOFF_OPENING_ZONE_ABSENT should not fire');
    });

    it('REVELATION_MIDDLE_ZONE_ABSENT fires when no revelation scenes are in the middle third', async () => {
      // 9 scenes (third=3): middle third = pos 3,4,5; revelations at pos 0,1,7 → none in middle → fires
      const recs537c = Array.from({ length: 9 }, (_, i) =>
        makeRec537(i, { revelation: [0, 1, 7].includes(i) ? 'Truth.' : null })
      );
      const res = await runPA537(recs537c);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_MIDDLE_ZONE_ABSENT'), 'REVELATION_MIDDLE_ZONE_ABSENT should fire');
    });

    it('REVELATION_MIDDLE_ZONE_ABSENT does not fire when a revelation is in the middle third', async () => {
      // 9 scenes (third=3): revelation at pos 4 (middle third) + pos 0,7 → anyInMiddle=true → no fire
      const recs537cnr = Array.from({ length: 9 }, (_, i) =>
        makeRec537(i, { revelation: [0, 4, 7].includes(i) ? 'Truth.' : null })
      );
      const res = await runPA537(recs537cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_MIDDLE_ZONE_ABSENT'), 'REVELATION_MIDDLE_ZONE_ABSENT should not fire');
    });
  });


  describe('Wave 523 — pacingPass: clock aftermath emotion flat, payoff aftermath emotion flat, payoff aftermath suspense flat', async () => {
    const makeRec523 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, revelation: null,
      dialogueHighlights: [], relationshipShifts: [],
      seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeFountain523 = (n: number) =>
      Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\n\nAction line for scene ${i}.`).join('\n\n');
    const runPA523 = async (records: any[]) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      return pacingPass({
        fountain: makeFountain523(records.length), original: '', records,
        structure: {} as any, annotations: [], approvedSpans: [],
      });
    };

    it('CLOCK_AFTERMATH_EMOTION_FLAT fires when all clock scenes are followed by emotional silence', async () => {
      // 10 scenes: clockRaised at 1,3,5 (not last 2); next scenes all emotionally neutral
      const recs523a = Array.from({ length: 10 }, (_, i) =>
        makeRec523(i, { clockRaised: [1, 3, 5].includes(i) }),
      );
      const res = await runPA523(recs523a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_AFTERMATH_EMOTION_FLAT'), 'CLOCK_AFTERMATH_EMOTION_FLAT should fire');
    });

    it('CLOCK_AFTERMATH_EMOTION_FLAT does not fire when a clock scene is followed by emotion', async () => {
      // 10 scenes: clockRaised at 1,3,5; scene 2 (after scene 1) has positive emotionalShift
      const recs523an = Array.from({ length: 10 }, (_, i) =>
        makeRec523(i, {
          clockRaised: [1, 3, 5].includes(i),
          emotionalShift: i === 2 ? 'positive' : 'neutral',
        }),
      );
      const res = await runPA523(recs523an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_AFTERMATH_EMOTION_FLAT'), 'CLOCK_AFTERMATH_EMOTION_FLAT should not fire');
    });

    it('PAYOFF_AFTERMATH_EMOTION_FLAT fires when all payoff scenes are followed by emotional silence', async () => {
      // 10 scenes: payoffs at 1,3,5 (not last 2); all following scenes emotionally neutral
      const recs523b = Array.from({ length: 10 }, (_, i) =>
        makeRec523(i, { payoffSetupIds: [1, 3, 5].includes(i) ? ['s1'] : [] }),
      );
      const res = await runPA523(recs523b);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_AFTERMATH_EMOTION_FLAT'), 'PAYOFF_AFTERMATH_EMOTION_FLAT should fire');
    });

    it('PAYOFF_AFTERMATH_EMOTION_FLAT does not fire when a payoff is followed by an emotional scene', async () => {
      // 10 scenes: payoffs at 1,3,5; scene 2 (after scene 1) has negative emotionalShift
      const recs523bn = Array.from({ length: 10 }, (_, i) =>
        makeRec523(i, {
          payoffSetupIds: [1, 3, 5].includes(i) ? ['s1'] : [],
          emotionalShift: i === 2 ? 'negative' : 'neutral',
        }),
      );
      const res = await runPA523(recs523bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_AFTERMATH_EMOTION_FLAT'), 'PAYOFF_AFTERMATH_EMOTION_FLAT should not fire');
    });

    it('PAYOFF_AFTERMATH_SUSPENSE_FLAT fires when avg next-scene suspenseDelta after payoffs ≤ 0', async () => {
      // 10 scenes: payoffs at 1,3,5; following scenes at 2,4,6 all have suspenseDelta = 0
      const recs523c = Array.from({ length: 10 }, (_, i) =>
        makeRec523(i, {
          payoffSetupIds: [1, 3, 5].includes(i) ? ['s1'] : [],
          suspenseDelta: 0,
        }),
      );
      const res = await runPA523(recs523c);
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_AFTERMATH_SUSPENSE_FLAT'), 'PAYOFF_AFTERMATH_SUSPENSE_FLAT should fire');
    });

    it('PAYOFF_AFTERMATH_SUSPENSE_FLAT does not fire when avg next-scene suspenseDelta after payoffs > 0', async () => {
      // 10 scenes: payoffs at 1,3,5; next scenes 2,4,6 each have suspenseDelta = 1 (avg > 0)
      const recs523cn = Array.from({ length: 10 }, (_, i) =>
        makeRec523(i, {
          payoffSetupIds: [1, 3, 5].includes(i) ? ['s1'] : [],
          suspenseDelta: [2, 4, 6].includes(i) ? 1 : 0,
        }),
      );
      const res = await runPA523(recs523cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_AFTERMATH_SUSPENSE_FLAT'), 'PAYOFF_AFTERMATH_SUSPENSE_FLAT should not fire');
    });
  });


  describe('Wave 509 — pacingPass: suspense flatline run, payoff suspense decoupled, payoff aftermath curiosity flat', async () => {
    const makeRec509 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeFountain509 = (n: number) =>
      Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\n\nAction line for scene ${i}.`).join('\n\n');
    const runP509 = async (records: any[]) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      return pacingPass({ fountain: makeFountain509(records.length), original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // SUSPENSE_FLATLINE_RUN fire: n=8; scenes 0-4 flat (suspenseDelta=0), scenes 5-7 positive
    // → 5 consecutive flat scenes, 3 positive scenes elsewhere → fires
    it('SUSPENSE_FLATLINE_RUN fires when 5+ consecutive scenes have no suspense rise', async () => {
      const recs509a: any[] = Array.from({ length: 8 }, (_, i) => makeRec509(i, {
        suspenseDelta: i >= 5 ? 2 : 0,
      }));
      const res = await runP509(recs509a);
      assert.ok(res.issues.some((x: any) => x.rule === 'SUSPENSE_FLATLINE_RUN'), 'SUSPENSE_FLATLINE_RUN should fire');
    });

    // SUSPENSE_FLATLINE_RUN no-fire: n=8; scenes 0,1,2,7 positive, scenes 3-6 flat
    // → max flat run = 4 < 5 → no fire
    it('SUSPENSE_FLATLINE_RUN does not fire when the longest flat run is only 4', async () => {
      const recs509anr: any[] = Array.from({ length: 8 }, (_, i) => makeRec509(i, {
        suspenseDelta: [0, 1, 2, 7].includes(i) ? 2 : 0,
      }));
      const res = await runP509(recs509anr);
      assert.ok(!res.issues.some((x: any) => x.rule === 'SUSPENSE_FLATLINE_RUN'), 'SUSPENSE_FLATLINE_RUN should not fire');
    });

    // PAYOFF_SUSPENSE_DECOUPLED fire: n=8; payoffs at 0,1,2 (suspenseDelta=0); high-suspense at 5,6,7 (no payoff)
    // → no overlap → fires
    it('PAYOFF_SUSPENSE_DECOUPLED fires when payoff scenes and high-suspense scenes never coincide', async () => {
      const recs509b: any[] = Array.from({ length: 8 }, (_, i) => makeRec509(i, {
        payoffSetupIds: [0, 1, 2].includes(i) ? ['A'] : [],
        suspenseDelta: [5, 6, 7].includes(i) ? 2 : 0,
      }));
      const res = await runP509(recs509b);
      assert.ok(res.issues.some((x: any) => x.rule === 'PAYOFF_SUSPENSE_DECOUPLED'), 'PAYOFF_SUSPENSE_DECOUPLED should fire');
    });

    // PAYOFF_SUSPENSE_DECOUPLED no-fire: scene 2 is both a payoff AND high-suspense → overlap → no fire
    it('PAYOFF_SUSPENSE_DECOUPLED does not fire when at least one scene is both a payoff and high-suspense', async () => {
      const recs509bnr: any[] = Array.from({ length: 8 }, (_, i) => makeRec509(i, {
        payoffSetupIds: [0, 1, 2].includes(i) ? ['A'] : [],
        suspenseDelta: [2, 5, 6, 7].includes(i) ? 2 : 0,
      }));
      const res = await runP509(recs509bnr);
      assert.ok(!res.issues.some((x: any) => x.rule === 'PAYOFF_SUSPENSE_DECOUPLED'), 'PAYOFF_SUSPENSE_DECOUPLED should not fire');
    });

    // PAYOFF_AFTERMATH_CURIOSITY_FLAT fire: n=8; payoffs at 0,1,2; all curiosityDelta=0 → no curiosity aftermath → fires
    it('PAYOFF_AFTERMATH_CURIOSITY_FLAT fires when payoff scenes are never followed by a curiosity rise', async () => {
      const recs509c: any[] = Array.from({ length: 8 }, (_, i) => makeRec509(i, {
        payoffSetupIds: [0, 1, 2].includes(i) ? ['B'] : [],
        curiosityDelta: 0,
      }));
      const res = await runP509(recs509c);
      assert.ok(res.issues.some((x: any) => x.rule === 'PAYOFF_AFTERMATH_CURIOSITY_FLAT'), 'PAYOFF_AFTERMATH_CURIOSITY_FLAT should fire');
    });

    // PAYOFF_AFTERMATH_CURIOSITY_FLAT no-fire: scene 3 (aftermath of payoff at 2) has curiosityDelta=1 → no fire
    it('PAYOFF_AFTERMATH_CURIOSITY_FLAT does not fire when at least one payoff is followed by a curiosity rise', async () => {
      const recs509cnr: any[] = Array.from({ length: 8 }, (_, i) => makeRec509(i, {
        payoffSetupIds: [0, 1, 2].includes(i) ? ['B'] : [],
        curiosityDelta: i === 3 ? 1 : 0,
      }));
      const res = await runP509(recs509cnr);
      assert.ok(!res.issues.some((x: any) => x.rule === 'PAYOFF_AFTERMATH_CURIOSITY_FLAT'), 'PAYOFF_AFTERMATH_CURIOSITY_FLAT should not fire');
    });
  });


  describe('Wave 495 — pacingPass: clock aftermath curiosity flat, revelation emotional aftermath flat, curiosity peak uncaused', async () => {
    const makeRec495 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeFountain495 = (n: number) =>
      Array.from({ length: n }, (_, i) => `INT. SC${i} - DAY\n\nAction line for scene ${i}.`).join('\n\n');
    const runP495 = async (records: any[]) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      return pacingPass({ fountain: makeFountain495(records.length), original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // CLOCK_AFTERMATH_CURIOSITY_FLAT fire: n=10; clocks at 1,3,5; curiosity only at 0,9 (not after clocks)
    it('CLOCK_AFTERMATH_CURIOSITY_FLAT fires when clock scenes are never followed by curiosity rise', async () => {
      const recs495a: any[] = Array.from({ length: 10 }, (_, i) => makeRec495(i, {
        clockRaised: [1, 3, 5].includes(i),
        curiosityDelta: [0, 9].includes(i) ? 1 : 0,
      }));
      const res = await runP495(recs495a);
      assert.ok(res.issues.some((x: any) => x.rule === 'CLOCK_AFTERMATH_CURIOSITY_FLAT'), 'CLOCK_AFTERMATH_CURIOSITY_FLAT should fire');
    });

    // CLOCK_AFTERMATH_CURIOSITY_FLAT no-fire: curiosity at scene 4 (aftermath of clock at 3)
    it('CLOCK_AFTERMATH_CURIOSITY_FLAT does not fire when at least one clock is followed by curiosity rise', async () => {
      const recs495an: any[] = Array.from({ length: 10 }, (_, i) => makeRec495(i, {
        clockRaised: [1, 3, 5].includes(i),
        curiosityDelta: i === 4 ? 1 : 0,
      }));
      const res = await runP495(recs495an);
      assert.ok(!res.issues.some((x: any) => x.rule === 'CLOCK_AFTERMATH_CURIOSITY_FLAT'), 'CLOCK_AFTERMATH_CURIOSITY_FLAT should not fire');
    });

    // REVELATION_EMOTIONAL_AFTERMATH_FLAT fire: n=10; revelations at 1,3,5; all aftermaths neutral
    it('REVELATION_EMOTIONAL_AFTERMATH_FLAT fires when revelation scenes are never followed by emotional shift', async () => {
      const recs495b: any[] = Array.from({ length: 10 }, (_, i) => makeRec495(i, {
        revelation: [1, 3, 5].includes(i) ? 'something revealed' : null,
      }));
      const res = await runP495(recs495b);
      assert.ok(res.issues.some((x: any) => x.rule === 'REVELATION_EMOTIONAL_AFTERMATH_FLAT'), 'REVELATION_EMOTIONAL_AFTERMATH_FLAT should fire');
    });

    // REVELATION_EMOTIONAL_AFTERMATH_FLAT no-fire: scene 4 (after revelation at 3) is 'negative'
    it('REVELATION_EMOTIONAL_AFTERMATH_FLAT does not fire when at least one revelation is followed by emotional shift', async () => {
      const recs495bn: any[] = Array.from({ length: 10 }, (_, i) => makeRec495(i, {
        revelation: [1, 3, 5].includes(i) ? 'something revealed' : null,
        emotionalShift: i === 4 ? 'negative' : 'neutral',
      }));
      const res = await runP495(recs495bn);
      assert.ok(!res.issues.some((x: any) => x.rule === 'REVELATION_EMOTIONAL_AFTERMATH_FLAT'), 'REVELATION_EMOTIONAL_AFTERMATH_FLAT should not fire');
    });

    // CURIOSITY_PEAK_UNCAUSED fire: n=8; peak curiosityDelta=3 at pos 5; no turn/rev/clock in 3,4,5
    it('CURIOSITY_PEAK_UNCAUSED fires when the highest-curiosity scene has no upstream cause', async () => {
      const recs495c: any[] = Array.from({ length: 8 }, (_, i) => makeRec495(i, {
        curiosityDelta: i === 5 ? 3 : 0,
        clockRaised: i === 0,
      }));
      const res = await runP495(recs495c);
      assert.ok(res.issues.some((x: any) => x.rule === 'CURIOSITY_PEAK_UNCAUSED'), 'CURIOSITY_PEAK_UNCAUSED should fire');
    });

    // CURIOSITY_PEAK_UNCAUSED no-fire: revelation at scene 4 (one before peak at 5) provides cause
    it('CURIOSITY_PEAK_UNCAUSED does not fire when the highest-curiosity scene has an upstream cause', async () => {
      const recs495cn: any[] = Array.from({ length: 8 }, (_, i) => makeRec495(i, {
        curiosityDelta: i === 5 ? 3 : 0,
        revelation: i === 4 ? 'a clue surfaces' : null,
      }));
      const res = await runP495(recs495cn);
      assert.ok(!res.issues.some((x: any) => x.rule === 'CURIOSITY_PEAK_UNCAUSED'), 'CURIOSITY_PEAK_UNCAUSED should not fire');
    });
  });


  describe('Wave 481 — pacingPass: clock aftermath suspense flat, suspense peak uncaused, emotional peak uncaused', async () => {
    const makeRec481 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeFountain481 = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        `INT. SC${i} - DAY\n\nAction line for scene ${i}.`
      ).join('\n\n');
    const runP481 = async (records: any[]) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      const fountain = makeFountain481(records.length);
      return pacingPass({ fountain, original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CLOCK_AFTERMATH_SUSPENSE_FLAT fires when no clock scene is followed by a suspense rise within 2 scenes', async () => {
      // n=10; clock scenes at 2,5,8; aftermath 3-4, 6-7, 9 all have suspenseDelta ≤ 0 → fires
      const recs481a = Array.from({ length: 10 }, (_, i) => makeRec481(i));
      recs481a[2] = makeRec481(2, { clockRaised: true });
      recs481a[5] = makeRec481(5, { clockDelta: 1 });
      recs481a[8] = makeRec481(8, { clockRaised: true });
      const res = await runP481(recs481a);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_AFTERMATH_SUSPENSE_FLAT'), 'CLOCK_AFTERMATH_SUSPENSE_FLAT should fire');
    });

    it('CLOCK_AFTERMATH_SUSPENSE_FLAT does not fire when a clock scene is followed by a suspense rise', async () => {
      // n=10; clock at 2; scene 3 has suspenseDelta=1 (within 1 of clock) → no fire
      const recs481anr = Array.from({ length: 10 }, (_, i) => makeRec481(i));
      recs481anr[2] = makeRec481(2, { clockRaised: true });
      recs481anr[3] = makeRec481(3, { suspenseDelta: 1 });
      recs481anr[5] = makeRec481(5, { clockDelta: 1 });
      recs481anr[8] = makeRec481(8, { clockRaised: true });
      const res = await runP481(recs481anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_AFTERMATH_SUSPENSE_FLAT'), 'CLOCK_AFTERMATH_SUSPENSE_FLAT should not fire');
    });

    it('SUSPENSE_PEAK_UNCAUSED fires when the highest-suspense scene has no cause in prior 2 scenes', async () => {
      // n=10; peak suspense at scene 7 (suspenseDelta=5); scenes 5,6,7 have no clock/turn/revelation → fires
      const recs481b = Array.from({ length: 10 }, (_, i) => makeRec481(i));
      recs481b[7] = makeRec481(7, { suspenseDelta: 5 });
      const res = await runP481(recs481b);
      assert.ok(res.issues.some((i: any) => i.rule === 'SUSPENSE_PEAK_UNCAUSED'), 'SUSPENSE_PEAK_UNCAUSED should fire');
    });

    it('SUSPENSE_PEAK_UNCAUSED does not fire when the highest-suspense scene has a dramatic turn in a prior scene', async () => {
      // n=10; peak at scene 7; scene 6 has dramaticTurn → cause present → no fire
      const recs481bnr = Array.from({ length: 10 }, (_, i) => makeRec481(i));
      recs481bnr[6] = makeRec481(6, { dramaticTurn: 'reversal' });
      recs481bnr[7] = makeRec481(7, { suspenseDelta: 5 });
      const res = await runP481(recs481bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SUSPENSE_PEAK_UNCAUSED'), 'SUSPENSE_PEAK_UNCAUSED should not fire');
    });

    it('EMOTIONAL_PEAK_UNCAUSED fires when the highest-suspense emotional scene has no cause in prior 2 scenes', async () => {
      // n=10; emotional peak at scene 6 (negative, suspenseDelta=3); scenes 4,5,6 have no clock/turn/revelation → fires
      const recs481c = Array.from({ length: 10 }, (_, i) => makeRec481(i));
      recs481c[6] = makeRec481(6, { emotionalShift: 'negative', suspenseDelta: 3 });
      const res = await runP481(recs481c);
      assert.ok(res.issues.some((i: any) => i.rule === 'EMOTIONAL_PEAK_UNCAUSED'), 'EMOTIONAL_PEAK_UNCAUSED should fire');
    });

    it('EMOTIONAL_PEAK_UNCAUSED does not fire when the emotional peak has a revelation in the same scene', async () => {
      // n=10; emotional peak at scene 6 — scene 6 itself has revelation → cause present → no fire
      const recs481cnr = Array.from({ length: 10 }, (_, i) => makeRec481(i));
      recs481cnr[6] = makeRec481(6, { emotionalShift: 'negative', suspenseDelta: 3, revelation: 'the truth' });
      const res = await runP481(recs481cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'EMOTIONAL_PEAK_UNCAUSED'), 'EMOTIONAL_PEAK_UNCAUSED should not fire');
    });
  });


  describe('Wave 467 — pacingPass: revelation suspense aftermath flat, clock pressure run, emotional curiosity decoupled', async () => {
    const makeRec467 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeFountain467 = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        `INT. SC${i} - DAY\n\nAction line for scene ${i}.`
      ).join('\n\n');
    const runP467 = async (records: any[]) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      const fountain = makeFountain467(records.length);
      return pacingPass({ fountain, original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('REVELATION_SUSPENSE_AFTERMATH_FLAT fires when no revelation is followed by a suspense rise within 2 scenes', async () => {
      // n=10; revelations at scenes 2 and 6; aftermath scenes 3-4 and 7-8 all have suspenseDelta ≤ 0 → fires
      const recs467a = Array.from({ length: 10 }, (_, i) => makeRec467(i));
      recs467a[2] = makeRec467(2, { revelation: 'the truth' });
      recs467a[6] = makeRec467(6, { revelation: 'another truth' });
      const res = await runP467(recs467a);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_SUSPENSE_AFTERMATH_FLAT'), 'REVELATION_SUSPENSE_AFTERMATH_FLAT should fire');
    });

    it('REVELATION_SUSPENSE_AFTERMATH_FLAT does not fire when a revelation is followed by suspense within 2 scenes', async () => {
      // n=10; revelation at scene 2; scene 3 has suspenseDelta=2 → no fire
      const recs467anr = Array.from({ length: 10 }, (_, i) => makeRec467(i));
      recs467anr[2] = makeRec467(2, { revelation: 'the truth' });
      recs467anr[3] = makeRec467(3, { suspenseDelta: 2 });
      recs467anr[6] = makeRec467(6, { revelation: 'another truth' });
      const res = await runP467(recs467anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_SUSPENSE_AFTERMATH_FLAT'), 'REVELATION_SUSPENSE_AFTERMATH_FLAT should not fire');
    });

    it('CLOCK_PRESSURE_RUN fires when ≥4 consecutive scenes all have clock pressure', async () => {
      // n=12; scenes 0,1 no clock; scenes 2-6 all clockRaised=true (run=5); scenes 7-11 no clock → fires
      const recs467b = Array.from({ length: 12 }, (_, i) => makeRec467(i));
      for (let i = 2; i <= 6; i++) recs467b[i] = makeRec467(i, { clockRaised: true });
      const res = await runP467(recs467b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_PRESSURE_RUN'), 'CLOCK_PRESSURE_RUN should fire');
    });

    it('CLOCK_PRESSURE_RUN does not fire when clock scenes are broken up', async () => {
      // n=12; clock scenes at 2,3 then gap at 4, then clock at 5,6 — max run=2 → no fire
      const recs467bnr = Array.from({ length: 12 }, (_, i) => makeRec467(i));
      recs467bnr[2] = makeRec467(2, { clockRaised: true });
      recs467bnr[3] = makeRec467(3, { clockRaised: true });
      recs467bnr[5] = makeRec467(5, { clockRaised: true });
      recs467bnr[6] = makeRec467(6, { clockRaised: true });
      const res = await runP467(recs467bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_PRESSURE_RUN'), 'CLOCK_PRESSURE_RUN should not fire');
    });

    it('EMOTIONAL_CURIOSITY_DECOUPLED fires when emotional scenes and curiosity scenes never coincide', async () => {
      // n=12; scenes 1,3,5 are emotional (positive) but curiosityDelta=0; scenes 7,9,11 have curiosityDelta=1 but neutral → fires
      const recs467c = Array.from({ length: 12 }, (_, i) => makeRec467(i));
      recs467c[1] = makeRec467(1, { emotionalShift: 'positive', curiosityDelta: 0 });
      recs467c[3] = makeRec467(3, { emotionalShift: 'negative', curiosityDelta: 0 });
      recs467c[5] = makeRec467(5, { emotionalShift: 'positive', curiosityDelta: 0 });
      recs467c[7] = makeRec467(7, { emotionalShift: 'neutral', curiosityDelta: 1 });
      recs467c[9] = makeRec467(9, { emotionalShift: 'neutral', curiosityDelta: 2 });
      recs467c[11] = makeRec467(11, { emotionalShift: 'neutral', curiosityDelta: 1 });
      const res = await runP467(recs467c);
      assert.ok(res.issues.some((i: any) => i.rule === 'EMOTIONAL_CURIOSITY_DECOUPLED'), 'EMOTIONAL_CURIOSITY_DECOUPLED should fire');
    });

    it('EMOTIONAL_CURIOSITY_DECOUPLED does not fire when at least one scene is both emotional and curiosity-positive', async () => {
      // n=12; scene 5 has both emotionalShift='positive' and curiosityDelta=2 → no fire
      const recs467cnr = Array.from({ length: 12 }, (_, i) => makeRec467(i));
      recs467cnr[1] = makeRec467(1, { emotionalShift: 'positive', curiosityDelta: 0 });
      recs467cnr[3] = makeRec467(3, { emotionalShift: 'negative', curiosityDelta: 0 });
      recs467cnr[5] = makeRec467(5, { emotionalShift: 'positive', curiosityDelta: 2 });
      recs467cnr[7] = makeRec467(7, { emotionalShift: 'neutral', curiosityDelta: 1 });
      recs467cnr[9] = makeRec467(9, { emotionalShift: 'neutral', curiosityDelta: 2 });
      recs467cnr[11] = makeRec467(11, { emotionalShift: 'neutral', curiosityDelta: 1 });
      const res = await runP467(recs467cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'EMOTIONAL_CURIOSITY_DECOUPLED'), 'EMOTIONAL_CURIOSITY_DECOUPLED should not fire');
    });
  });


  describe('Wave 453 — pacingPass: emotional flatline run, suspense emotional aftermath flat, suspense emotion decoupled', async () => {
    const makeRec453 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeFountain453 = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        `INT. SC${i} - DAY\n\nAction line for scene ${i}.`
      ).join('\n\n');
    const runP453 = async (records: any[]) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      const fountain = makeFountain453(records.length);
      return pacingPass({ fountain, original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('EMOTIONAL_FLATLINE_RUN fires when ≥5 consecutive neutral scenes exist while ≥3 emotional scenes are present', async () => {
      // 10 scenes: scenes 0,1,2 are emotional; scenes 3-7 are neutral run (5); scenes 8,9 neutral too
      // max neutral run = 7 (scenes 3-9), emotional scenes = 3 → should fire
      const recs453a = Array.from({ length: 10 }, (_, i) =>
        makeRec453(i, { emotionalShift: i < 3 ? 'positive' : 'neutral' }),
      );
      const res = await runP453(recs453a);
      assert.ok(res.issues.some((is: any) => is.rule === 'EMOTIONAL_FLATLINE_RUN'), 'EMOTIONAL_FLATLINE_RUN should fire');
    });

    it('EMOTIONAL_FLATLINE_RUN does not fire when neutral run is shorter than 5', async () => {
      // 10 scenes: 4 neutral in a row, rest emotional — max run = 4, should not fire
      const recs453anr = Array.from({ length: 10 }, (_, i) =>
        makeRec453(i, { emotionalShift: i >= 3 && i <= 6 ? 'neutral' : 'negative' }),
      );
      const res = await runP453(recs453anr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'EMOTIONAL_FLATLINE_RUN'), 'EMOTIONAL_FLATLINE_RUN should not fire');
    });

    it('SUSPENSE_EMOTIONAL_AFTERMATH_FLAT fires when no high-suspense scene is followed by emotional aftermath', async () => {
      // 8 scenes: scenes 1 and 4 have high suspense (suspenseDelta=2), all other scenes neutral-emotion
      const recs453b = Array.from({ length: 8 }, (_, i) =>
        makeRec453(i, { suspenseDelta: [1, 4].includes(i) ? 2 : 0, emotionalShift: 'neutral' }),
      );
      const res = await runP453(recs453b);
      assert.ok(res.issues.some((is: any) => is.rule === 'SUSPENSE_EMOTIONAL_AFTERMATH_FLAT'), 'SUSPENSE_EMOTIONAL_AFTERMATH_FLAT should fire');
    });

    it('SUSPENSE_EMOTIONAL_AFTERMATH_FLAT does not fire when at least one high-suspense scene has emotional aftermath', async () => {
      // 8 scenes: scene 1 = high suspense; scene 2 = positive emotional → aftermath exists → no fire
      const recs453bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec453(i, {
          suspenseDelta: i === 1 ? 2 : 0,
          emotionalShift: i === 2 ? 'positive' : 'neutral',
        }),
      );
      const res = await runP453(recs453bnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'SUSPENSE_EMOTIONAL_AFTERMATH_FLAT'), 'SUSPENSE_EMOTIONAL_AFTERMATH_FLAT should not fire');
    });

    it('SUSPENSE_EMOTION_DECOUPLED fires when ≥3 high-suspense and ≥3 emotional scenes never coincide', async () => {
      // 10 scenes: 0,2,4 have high suspense + neutral emotion; 6,7,8 have emotion + no suspense → decoupled
      const recs453c = Array.from({ length: 10 }, (_, i) =>
        makeRec453(i, {
          suspenseDelta: [0, 2, 4].includes(i) ? 2 : 0,
          emotionalShift: [6, 7, 8].includes(i) ? 'positive' : 'neutral',
        }),
      );
      const res = await runP453(recs453c);
      assert.ok(res.issues.some((is: any) => is.rule === 'SUSPENSE_EMOTION_DECOUPLED'), 'SUSPENSE_EMOTION_DECOUPLED should fire');
    });

    it('SUSPENSE_EMOTION_DECOUPLED does not fire when at least one high-suspense scene also has emotional texture', async () => {
      // 10 scenes: scene 0 has high suspense AND positive emotion → overlap exists → no fire
      const recs453cnr = Array.from({ length: 10 }, (_, i) =>
        makeRec453(i, {
          suspenseDelta: [0, 2, 4].includes(i) ? 2 : 0,
          emotionalShift: [0, 6, 7].includes(i) ? 'positive' : 'neutral',
        }),
      );
      const res = await runP453(recs453cnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'SUSPENSE_EMOTION_DECOUPLED'), 'SUSPENSE_EMOTION_DECOUPLED should not fire');
    });
  });


  describe('Wave 439 — pacingPass: suspense curiosity decoupled, curiosity flatline run, curiosity aftermath flat', async () => {
    const makeRec439 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeFountain439 = (n: number) =>
      Array.from({ length: n }, (_, i) =>
        `INT. SC${i} - DAY\n\nAction line for scene ${i}.`
      ).join('\n\n');
    const runP439 = async (records: any[]) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      const fountain = makeFountain439(records.length);
      return pacingPass({ fountain, original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('SUSPENSE_CURIOSITY_DECOUPLED fires when high-suspense and high-curiosity scenes never coincide', async () => {
      // n=10; scenes 0,1,2 have suspenseDelta=2 (high-suspense); scenes 5,6,7 have curiosityDelta=1 (high-curiosity); no overlap → fires
      const recs439a = Array.from({ length: 10 }, (_, i) => makeRec439(i));
      recs439a[0] = makeRec439(0, { suspenseDelta: 2 });
      recs439a[1] = makeRec439(1, { suspenseDelta: 2 });
      recs439a[2] = makeRec439(2, { suspenseDelta: 2 });
      recs439a[5] = makeRec439(5, { curiosityDelta: 1 });
      recs439a[6] = makeRec439(6, { curiosityDelta: 1 });
      recs439a[7] = makeRec439(7, { curiosityDelta: 1 });
      const res = await runP439(recs439a);
      assert.ok(res.issues.some((i: any) => i.rule === 'SUSPENSE_CURIOSITY_DECOUPLED'), 'SUSPENSE_CURIOSITY_DECOUPLED should fire');
    });

    it('SUSPENSE_CURIOSITY_DECOUPLED does not fire when one scene carries both signals', async () => {
      // n=10; scene 2 has both suspenseDelta=2 and curiosityDelta=1 → no fire
      const recs439anr = Array.from({ length: 10 }, (_, i) => makeRec439(i));
      recs439anr[0] = makeRec439(0, { suspenseDelta: 2 });
      recs439anr[2] = makeRec439(2, { suspenseDelta: 2, curiosityDelta: 1 });
      recs439anr[4] = makeRec439(4, { suspenseDelta: 2 });
      recs439anr[6] = makeRec439(6, { curiosityDelta: 1 });
      recs439anr[7] = makeRec439(7, { curiosityDelta: 1 });
      const res = await runP439(recs439anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'SUSPENSE_CURIOSITY_DECOUPLED'), 'SUSPENSE_CURIOSITY_DECOUPLED should not fire');
    });

    it('CURIOSITY_FLATLINE_RUN fires when 5+ consecutive scenes have curiosityDelta ≤ 0', async () => {
      // n=10; positive-curiosity at 0 and 9 (3 total would be needed... wait we need ≥3);
      // scenes 0,1,2 have curiosityDelta=1 (3 positive), scenes 3-7 = 5 consecutive flatline → fires
      const recs439b = Array.from({ length: 10 }, (_, i) => makeRec439(i));
      recs439b[0] = makeRec439(0, { curiosityDelta: 1 });
      recs439b[1] = makeRec439(1, { curiosityDelta: 1 });
      recs439b[2] = makeRec439(2, { curiosityDelta: 1 });
      // scenes 3-7: curiosityDelta=0 (5 consecutive flatline)
      recs439b[8] = makeRec439(8, { curiosityDelta: 1 });
      const res = await runP439(recs439b);
      assert.ok(res.issues.some((i: any) => i.rule === 'CURIOSITY_FLATLINE_RUN'), 'CURIOSITY_FLATLINE_RUN should fire');
    });

    it('CURIOSITY_FLATLINE_RUN does not fire when flatline run is only 4 scenes', async () => {
      // n=10; positive-curiosity at 0,1,2 then scenes 3-6 = 4 consecutive flat then 7,8,9 positive → no fire
      const recs439bnr = Array.from({ length: 10 }, (_, i) => makeRec439(i));
      recs439bnr[0] = makeRec439(0, { curiosityDelta: 1 });
      recs439bnr[1] = makeRec439(1, { curiosityDelta: 1 });
      recs439bnr[2] = makeRec439(2, { curiosityDelta: 1 });
      // scenes 3-6: flat (4 consecutive)
      recs439bnr[7] = makeRec439(7, { curiosityDelta: 1 });
      recs439bnr[8] = makeRec439(8, { curiosityDelta: 1 });
      recs439bnr[9] = makeRec439(9, { curiosityDelta: 1 });
      const res = await runP439(recs439bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CURIOSITY_FLATLINE_RUN'), 'CURIOSITY_FLATLINE_RUN should not fire');
    });

    it('CURIOSITY_AFTERMATH_FLAT fires when no high-suspense scene is followed by a curiosity rise', async () => {
      // n=8; high-suspense at 1 and 4; scenes 2,3 (after 1) and 5,6 (after 4) have curiosityDelta=0 → fires
      const recs439c = Array.from({ length: 8 }, (_, i) => makeRec439(i));
      recs439c[1] = makeRec439(1, { suspenseDelta: 2 });
      recs439c[4] = makeRec439(4, { suspenseDelta: 2 });
      const res = await runP439(recs439c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CURIOSITY_AFTERMATH_FLAT'), 'CURIOSITY_AFTERMATH_FLAT should fire');
    });

    it('CURIOSITY_AFTERMATH_FLAT does not fire when a suspense peak is followed by a curiosity rise', async () => {
      // n=8; high-suspense at 1 and 4; scene 2 (after scene 1) has curiosityDelta=1 → no fire
      const recs439cnr = Array.from({ length: 8 }, (_, i) => makeRec439(i));
      recs439cnr[1] = makeRec439(1, { suspenseDelta: 2 });
      recs439cnr[2] = makeRec439(2, { curiosityDelta: 1 });
      recs439cnr[4] = makeRec439(4, { suspenseDelta: 2 });
      const res = await runP439(recs439cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CURIOSITY_AFTERMATH_FLAT'), 'CURIOSITY_AFTERMATH_FLAT should not fire');
    });
  });


  describe('Wave 425 — pacingPass: scene expansion run, suspense midpoint trough, curiosity frontload', async () => {
    const makeRec425 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeFountain425 = (lineCounts: number[]) =>
      lineCounts.map((n, i) =>
        `INT. SC${i} - DAY\n\n${Array.from({ length: n }, (_, j) => `Action line ${j + 1} for scene ${i}.`).join('\n\n')}`
      ).join('\n\n');
    const runP425 = async (records: any[], fountain: string) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      return pacingPass({ fountain, original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('SCENE_EXPANSION_RUN fires when 5 consecutive scenes each run strictly longer than the prior', async () => {
      // Scenes 2-6: lengths 5,6,7,8,9 → each strictly > prior → fires
      // avg = (5+3+5+6+7+8+9+5)/8 = 48/8 = 6
      const lc425a = [5, 3, 5, 6, 7, 8, 9, 5];
      const recs425a = Array.from({ length: 8 }, (_, i) => makeRec425(i));
      const res = await runP425(recs425a, makeFountain425(lc425a));
      assert.ok(res.issues.some((i: any) => i.rule === 'SCENE_EXPANSION_RUN'), 'SCENE_EXPANSION_RUN should fire');
    });

    it('SCENE_EXPANSION_RUN does NOT fire when no 5-consecutive expansion run exists', async () => {
      // Lengths alternate up/down — no run of 5 consecutive growing scenes
      const lc425anr = [5, 6, 7, 5, 6, 7, 5, 6];
      const recs425anr = Array.from({ length: 8 }, (_, i) => makeRec425(i));
      const res = await runP425(recs425anr, makeFountain425(lc425anr));
      assert.ok(!res.issues.some((i: any) => i.rule === 'SCENE_EXPANSION_RUN'), 'SCENE_EXPANSION_RUN should not fire');
    });

    it('SUSPENSE_MIDPOINT_TROUGH fires when midpoint suspense is below both halves while both halves are positive', async () => {
      // n=10, midIdx=5, suspenseDelta: scenes 0-4 all 2, scene 5 = 0, scenes 6-9 all 2
      // firstHalfAvg=2 > 0, secondHalfAvg=2 > 0, midSusp=0 < 2 → fires
      const recs425b = Array.from({ length: 10 }, (_, i) =>
        makeRec425(i, { suspenseDelta: i === 5 ? 0 : 2 })
      );
      const lc425b = Array.from({ length: 10 }, () => 5);
      const res = await runP425(recs425b, makeFountain425(lc425b));
      assert.ok(res.issues.some((i: any) => i.rule === 'SUSPENSE_MIDPOINT_TROUGH'), 'SUSPENSE_MIDPOINT_TROUGH should fire');
    });

    it('SUSPENSE_MIDPOINT_TROUGH does NOT fire when midpoint suspense matches surrounding energy', async () => {
      // n=10, all scenes suspenseDelta=2 — midpoint is not below either half
      const recs425bnr = Array.from({ length: 10 }, (_, i) => makeRec425(i, { suspenseDelta: 2 }));
      const lc425bnr = Array.from({ length: 10 }, () => 5);
      const res = await runP425(recs425bnr, makeFountain425(lc425bnr));
      assert.ok(!res.issues.some((i: any) => i.rule === 'SUSPENSE_MIDPOINT_TROUGH'), 'SUSPENSE_MIDPOINT_TROUGH should not fire');
    });

    it('CURIOSITY_FRONTLOAD fires when more than 65% of positive-curiosity scenes are in the first half', async () => {
      // n=10, half=5; scenes 0,1,2,3,4 have curiosityDelta=1 (5 in first half),
      // scene 7 has curiosityDelta=1 (1 in second half) → total=6, ratio=5/6≈0.833 > 0.65 → fires
      const recs425c = Array.from({ length: 10 }, (_, i) =>
        makeRec425(i, { curiosityDelta: [0, 1, 2, 3, 4, 7].includes(i) ? 1 : 0 })
      );
      const lc425c = Array.from({ length: 10 }, () => 5);
      const res = await runP425(recs425c, makeFountain425(lc425c));
      assert.ok(res.issues.some((i: any) => i.rule === 'CURIOSITY_FRONTLOAD'), 'CURIOSITY_FRONTLOAD should fire');
    });

    it('CURIOSITY_FRONTLOAD does NOT fire when positive-curiosity scenes are distributed across both halves', async () => {
      // n=10, half=5; scenes 0,1,2 in first half (curiosityDelta=1), scenes 5,6,7 in second half (curiosityDelta=1)
      // total=6, in first half=3, ratio=3/6=0.5 < 0.65 → no fire
      const recs425cnr = Array.from({ length: 10 }, (_, i) =>
        makeRec425(i, { curiosityDelta: [0, 1, 2, 5, 6, 7].includes(i) ? 1 : 0 })
      );
      const lc425cnr = Array.from({ length: 10 }, () => 5);
      const res = await runP425(recs425cnr, makeFountain425(lc425cnr));
      assert.ok(!res.issues.some((i: any) => i.rule === 'CURIOSITY_FRONTLOAD'), 'CURIOSITY_FRONTLOAD should not fire');
    });
  });


  describe('Wave 411 — pacingPass: suspense peak scene bloat, resolution bloat, opening scene underweight', async () => {
    const makeRec411 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeFountain411 = (lineCounts: number[]) =>
      lineCounts.map((n, i) =>
        `INT. SC${i} - DAY\n\n${Array.from({ length: n }, (_, j) => `Action line ${j + 1} for scene ${i}.`).join('\n\n')}`
      ).join('\n\n');
    const runP411 = async (records: any[], fountain: string) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      return pacingPass({ fountain, original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('SUSPENSE_PEAK_SCENE_BLOAT fires when the highest-suspense scene runs above 1.5× overall', async () => {
      // Scene 4 is the suspense peak (3) and longest (20); avg ~ (5*7+20)/8 = 6.875; 20 > 10.3 → fires
      const lc411a = [5, 5, 5, 5, 20, 5, 5, 5];
      const recs411a = Array.from({ length: 8 }, (_, i) => makeRec411(i, { suspenseDelta: i === 4 ? 3 : 0.5 }));
      const res = await runP411(recs411a, makeFountain411(lc411a));
      assert.ok(res.issues.some((i: any) => i.rule === 'SUSPENSE_PEAK_SCENE_BLOAT'), 'SUSPENSE_PEAK_SCENE_BLOAT should fire');
    });

    it('SUSPENSE_PEAK_SCENE_BLOAT does NOT fire when the peak scene is proportional', async () => {
      // Scene 4 is peak (3) but length 7 like the rest; avg 7; 7 not > 10.5 → no fire
      const lc411anr = [7, 7, 7, 7, 7, 7, 7, 7];
      const recs411anr = Array.from({ length: 8 }, (_, i) => makeRec411(i, { suspenseDelta: i === 4 ? 3 : 0.5 }));
      const res = await runP411(recs411anr, makeFountain411(lc411anr));
      assert.ok(!res.issues.some((i: any) => i.rule === 'SUSPENSE_PEAK_SCENE_BLOAT'), 'SUSPENSE_PEAK_SCENE_BLOAT should not fire');
    });

    it('RESOLUTION_BLOAT fires when the final resolution scene runs above 2× overall', async () => {
      // Final scene (idx5) is resolution, length 30; avg ~ (5*5+30)/6 = 9.17; 30 > 18.3 → fires
      const lc411b = [5, 5, 5, 5, 5, 30];
      const recs411b = Array.from({ length: 6 }, (_, i) => makeRec411(i, i === 5 ? { purpose: 'resolution', suspenseDelta: -1 } : {}));
      const res = await runP411(recs411b, makeFountain411(lc411b));
      assert.ok(res.issues.some((i: any) => i.rule === 'RESOLUTION_BLOAT'), 'RESOLUTION_BLOAT should fire');
    });

    it('RESOLUTION_BLOAT does NOT fire when the final scene is proportional', async () => {
      // Final scene (idx5) is resolution, length 9; avg ~ (5*5+9)/6 = 5.67; 9 < 11.3 → no fire
      const lc411bnr = [5, 5, 5, 5, 5, 9];
      const recs411bnr = Array.from({ length: 6 }, (_, i) => makeRec411(i, i === 5 ? { purpose: 'resolution', suspenseDelta: -1 } : {}));
      const res = await runP411(recs411bnr, makeFountain411(lc411bnr));
      assert.ok(!res.issues.some((i: any) => i.rule === 'RESOLUTION_BLOAT'), 'RESOLUTION_BLOAT should not fire');
    });

    it('OPENING_SCENE_UNDERWEIGHT fires when the first scene runs below 50% overall', async () => {
      // Scene 0 length 2, rest length 12; avg ~ (2+12*5)/6 = 10.33; 2 < 5.17 → fires
      const lc411c = [2, 12, 12, 12, 12, 12];
      const recs411c = Array.from({ length: 6 }, (_, i) => makeRec411(i));
      const res = await runP411(recs411c, makeFountain411(lc411c));
      assert.ok(res.issues.some((i: any) => i.rule === 'OPENING_SCENE_UNDERWEIGHT'), 'OPENING_SCENE_UNDERWEIGHT should fire');
    });

    it('OPENING_SCENE_UNDERWEIGHT does NOT fire when the opening is adequately long', async () => {
      // Scene 0 length 9, rest length 10; avg ~ (9+10*5)/6 = 9.83; 9 > 4.9 → no fire
      const lc411cnr = [9, 10, 10, 10, 10, 10];
      const recs411cnr = Array.from({ length: 6 }, (_, i) => makeRec411(i));
      const res = await runP411(recs411cnr, makeFountain411(lc411cnr));
      assert.ok(!res.issues.some((i: any) => i.rule === 'OPENING_SCENE_UNDERWEIGHT'), 'OPENING_SCENE_UNDERWEIGHT should not fire');
    });
  });


  describe('Wave 397 — pacingPass: seed scene underweight, stakes scene bloat, curiosity peak scene bloat', async () => {
    const makeRec397 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeFountain397 = (lineCounts: number[]) =>
      lineCounts.map((n, i) =>
        `INT. SC${i} - DAY\n\n${Array.from({ length: n }, (_, j) => `Action line ${j + 1} for scene ${i}.`).join('\n\n')}`
      ).join('\n\n');
    const runP397 = async (records: any[], fountain: string) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      return pacingPass({ fountain, original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('SEED_SCENE_UNDERWEIGHT fires when clue-seeding scenes average below 60% of overall length', async () => {
      // Scenes 3,6 seed clues (length 2), rest are length 10 → avg seeding 2, overall avg ~(10*6+2*2)/8 = 64/8 = 8; 2 < 8*0.6=4.8 → fires
      const lc397a = [10, 10, 10, 2, 10, 10, 2, 10];
      const recs397a = Array.from({ length: 8 }, (_, i) =>
        makeRec397(i, { seededClueIds: [3, 6].includes(i) ? ['clue1'] : [] })
      );
      const res = await runP397(recs397a, makeFountain397(lc397a));
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_SCENE_UNDERWEIGHT'), 'SEED_SCENE_UNDERWEIGHT should fire');
    });

    it('SEED_SCENE_UNDERWEIGHT does not fire when clue-seeding scenes are adequately long', async () => {
      // Scenes 3,6 seed clues (length 8), rest are length 10 → avg seeding 8, overall avg ~9.5; 8 > 9.5*0.6=5.7 → no fire
      const lc397anr = [10, 10, 10, 8, 10, 10, 8, 10];
      const recs397anr = Array.from({ length: 8 }, (_, i) =>
        makeRec397(i, { seededClueIds: [3, 6].includes(i) ? ['clue1'] : [] })
      );
      const res = await runP397(recs397anr, makeFountain397(lc397anr));
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_SCENE_UNDERWEIGHT'), 'SEED_SCENE_UNDERWEIGHT should not fire');
    });

    it('STAKES_SCENE_BLOAT fires when raise_stakes scenes average above 1.5× overall length', async () => {
      // Scenes 2,5 are raise_stakes (length 20), rest length 5 → avg stakes 20, overall ~(5*6+20*2)/8=70/8=8.75; 20 > 8.75*1.5=13.1 → fires
      const lc397b = [5, 5, 20, 5, 5, 20, 5, 5];
      const recs397b = Array.from({ length: 8 }, (_, i) =>
        makeRec397(i, { purpose: [2, 5].includes(i) ? 'raise_stakes' : 'development' })
      );
      const res = await runP397(recs397b, makeFountain397(lc397b));
      assert.ok(res.issues.some((i: any) => i.rule === 'STAKES_SCENE_BLOAT'), 'STAKES_SCENE_BLOAT should fire');
    });

    it('STAKES_SCENE_BLOAT does not fire when raise_stakes scenes are proportional', async () => {
      // Scenes 2,5 are raise_stakes (length 9), rest length 7 → avg stakes 9, overall ~(7*6+9*2)/8=60/8=7.5; 9 < 7.5*1.5=11.25 → no fire
      const lc397bnr = [7, 7, 9, 7, 7, 9, 7, 7];
      const recs397bnr = Array.from({ length: 8 }, (_, i) =>
        makeRec397(i, { purpose: [2, 5].includes(i) ? 'raise_stakes' : 'development' })
      );
      const res = await runP397(recs397bnr, makeFountain397(lc397bnr));
      assert.ok(!res.issues.some((i: any) => i.rule === 'STAKES_SCENE_BLOAT'), 'STAKES_SCENE_BLOAT should not fire');
    });

    it('CURIOSITY_PEAK_SCENE_BLOAT fires when high-curiosity scenes average above 1.5× overall length', async () => {
      // Scenes 1,4 have curiosityDelta=2 (length 20), rest length 5 → avg curiosity 20, overall ~(5*6+20*2)/8=8.75; 20 > 8.75*1.5=13.1 → fires
      const lc397c = [5, 20, 5, 5, 20, 5, 5, 5];
      const recs397c = Array.from({ length: 8 }, (_, i) =>
        makeRec397(i, { curiosityDelta: [1, 4].includes(i) ? 2 : 0 })
      );
      const res = await runP397(recs397c, makeFountain397(lc397c));
      assert.ok(res.issues.some((i: any) => i.rule === 'CURIOSITY_PEAK_SCENE_BLOAT'), 'CURIOSITY_PEAK_SCENE_BLOAT should fire');
    });

    it('CURIOSITY_PEAK_SCENE_BLOAT does not fire when high-curiosity scenes are proportional', async () => {
      // Scenes 1,4 have curiosityDelta=2 (length 9), rest length 7 → avg curiosity 9, overall 7.5; 9 < 7.5*1.5=11.25 → no fire
      const lc397cnr = [7, 9, 7, 7, 9, 7, 7, 7];
      const recs397cnr = Array.from({ length: 8 }, (_, i) =>
        makeRec397(i, { curiosityDelta: [1, 4].includes(i) ? 2 : 0 })
      );
      const res = await runP397(recs397cnr, makeFountain397(lc397cnr));
      assert.ok(!res.issues.some((i: any) => i.rule === 'CURIOSITY_PEAK_SCENE_BLOAT'), 'CURIOSITY_PEAK_SCENE_BLOAT should not fire');
    });
  });


  describe('Wave 302 — pacingPass: ending on peak, post-release dead air, net tension deficit', async () => {
    const makeRec302 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0.5,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeFountain302 = (n: number) =>
      Array.from({ length: n }, (_, i) => `INT. SCENE ${i} - DAY\n\nScene ${i} action line.`).join('\n\n');
    const runP302 = async (records: any[]) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      return pacingPass({ fountain: makeFountain302(records.length), original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ENDING_ON_PEAK fires when the final scene carries the story suspense maximum', async () => {
      const recs302ep = Array.from({ length: 8 }, (_, i) =>
        makeRec302(i, { suspenseDelta: i === 7 ? 3 : 0.5 })
      );
      const res = await runP302(recs302ep);
      assert.ok(res.issues.some((i: any) => i.rule === 'ENDING_ON_PEAK'), 'ENDING_ON_PEAK should fire');
    });

    it('ENDING_ON_PEAK does not fire when the peak occurs before the finale', async () => {
      const recs302nep = Array.from({ length: 8 }, (_, i) =>
        makeRec302(i, { suspenseDelta: i === 5 ? 3 : 0.5 })
      );
      const res = await runP302(recs302nep);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ENDING_ON_PEAK'), 'ENDING_ON_PEAK should not fire');
    });

    it('POST_RELEASE_DEAD_AIR fires when 3 flat scenes follow the biggest release', async () => {
      const deltas302 = [1, 1, 1, 1, -2, 0, 0, 0, 1, 1];
      const recs302da = Array.from({ length: 10 }, (_, i) =>
        makeRec302(i, { suspenseDelta: deltas302[i] })
      );
      const res = await runP302(recs302da);
      assert.ok(res.issues.some((i: any) => i.rule === 'POST_RELEASE_DEAD_AIR'), 'POST_RELEASE_DEAD_AIR should fire');
    });

    it('POST_RELEASE_DEAD_AIR does not fire when tension rebuilds after the release', async () => {
      const deltas302n = [1, 1, 1, 1, -2, 2, 0, 0, 1, 1];
      const recs302nda = Array.from({ length: 10 }, (_, i) =>
        makeRec302(i, { suspenseDelta: deltas302n[i] })
      );
      const res = await runP302(recs302nda);
      assert.ok(!res.issues.some((i: any) => i.rule === 'POST_RELEASE_DEAD_AIR'), 'POST_RELEASE_DEAD_AIR should not fire');
    });

    it('NET_TENSION_DEFICIT fires when cumulative suspenseDelta is negative', async () => {
      const recs302td = Array.from({ length: 8 }, (_, i) =>
        makeRec302(i, { suspenseDelta: i === 0 ? 1 : -0.5 })
      );
      const res = await runP302(recs302td);
      assert.ok(res.issues.some((i: any) => i.rule === 'NET_TENSION_DEFICIT'), 'NET_TENSION_DEFICIT should fire');
    });

    it('NET_TENSION_DEFICIT does not fire when the suspense ledger is net positive', async () => {
      const recs302ntd = Array.from({ length: 8 }, (_, i) =>
        makeRec302(i, { suspenseDelta: 0.5 })
      );
      const res = await runP302(recs302ntd);
      assert.ok(!res.issues.some((i: any) => i.rule === 'NET_TENSION_DEFICIT'), 'NET_TENSION_DEFICIT should not fire');
    });
  });


  describe('Wave 383 — pacingPass: conflict scene bloat, dramatic-turn scene bloat, emotional-peak scene bloat', async () => {
    const makeRec383 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeFountain383 = (lineCounts: number[]) =>
      lineCounts.map((n, i) =>
        `INT. SC${i} - DAY\n\n${Array.from({ length: n }, (_, j) => `Action line ${j + 1} for scene ${i}.`).join('\n\n')}`
      ).join('\n\n');
    const runP383 = async (records: any[], fountain: string) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      return pacingPass({ fountain, original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };
    const negShift383 = [{ pairKey: 'A|B', amount: -0.5, dimension: 'trust' }];

    it('CONFLICT_SCENE_BLOAT fires when conflict scenes run far above average length', async () => {
      const lc383c = [4, 4, 20, 4, 4, 20, 4, 4];
      const recs383c = Array.from({ length: 8 }, (_, i) =>
        makeRec383(i, { relationshipShifts: [2, 5].includes(i) ? negShift383 : [] })
      );
      const res = await runP383(recs383c, makeFountain383(lc383c));
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_SCENE_BLOAT'), 'CONFLICT_SCENE_BLOAT should fire');
    });

    it('CONFLICT_SCENE_BLOAT does not fire when conflict scenes are average length', async () => {
      const lc383cn = [10, 10, 10, 10, 10, 10, 10, 10];
      const recs383cn = Array.from({ length: 8 }, (_, i) =>
        makeRec383(i, { relationshipShifts: [2, 5].includes(i) ? negShift383 : [] })
      );
      const res = await runP383(recs383cn, makeFountain383(lc383cn));
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_SCENE_BLOAT'), 'CONFLICT_SCENE_BLOAT should not fire');
    });

    it('DRAMATIC_TURN_SCENE_BLOAT fires when turn scenes run far above average length', async () => {
      const lc383t = [4, 4, 20, 4, 4, 20, 4, 4];
      const recs383t = Array.from({ length: 8 }, (_, i) =>
        makeRec383(i, { dramaticTurn: [2, 5].includes(i) ? 'reversal' : 'nothing' })
      );
      const res = await runP383(recs383t, makeFountain383(lc383t));
      assert.ok(res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_SCENE_BLOAT'), 'DRAMATIC_TURN_SCENE_BLOAT should fire');
    });

    it('DRAMATIC_TURN_SCENE_BLOAT does not fire when turn scenes are average length', async () => {
      const lc383tn = [10, 10, 10, 10, 10, 10, 10, 10];
      const recs383tn = Array.from({ length: 8 }, (_, i) =>
        makeRec383(i, { dramaticTurn: [2, 5].includes(i) ? 'reversal' : 'nothing' })
      );
      const res = await runP383(recs383tn, makeFountain383(lc383tn));
      assert.ok(!res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_SCENE_BLOAT'), 'DRAMATIC_TURN_SCENE_BLOAT should not fire');
    });

    it('EMOTIONAL_PEAK_SCENE_BLOAT fires when charged scenes run far above average length', async () => {
      const lc383e = [4, 4, 20, 4, 4, 20, 4, 4];
      const recs383e = Array.from({ length: 8 }, (_, i) =>
        makeRec383(i, { emotionalShift: [2, 5].includes(i) ? 'negative' : 'neutral' })
      );
      const res = await runP383(recs383e, makeFountain383(lc383e));
      assert.ok(res.issues.some((i: any) => i.rule === 'EMOTIONAL_PEAK_SCENE_BLOAT'), 'EMOTIONAL_PEAK_SCENE_BLOAT should fire');
    });

    it('EMOTIONAL_PEAK_SCENE_BLOAT does not fire when charged scenes are average length', async () => {
      const lc383en = [10, 10, 10, 10, 10, 10, 10, 10];
      const recs383en = Array.from({ length: 8 }, (_, i) =>
        makeRec383(i, { emotionalShift: [2, 5].includes(i) ? 'negative' : 'neutral' })
      );
      const res = await runP383(recs383en, makeFountain383(lc383en));
      assert.ok(!res.issues.some((i: any) => i.rule === 'EMOTIONAL_PEAK_SCENE_BLOAT'), 'EMOTIONAL_PEAK_SCENE_BLOAT should not fire');
    });
  });


  describe('Wave 369 — pacingPass: clock scene underweight, revelation scene bloat, payoff scene bloat', async () => {
    const makeRec369 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeFountain369 = (lineCounts: number[]) =>
      lineCounts.map((n, i) =>
        `INT. SC${i} - DAY\n\n${Array.from({ length: n }, (_, j) => `Action line ${j + 1} for scene ${i}.`).join('\n\n')}`
      ).join('\n\n');
    const runP369 = async (records: any[], fountain: string) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      return pacingPass({ fountain, original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('CLOCK_SCENE_UNDERWEIGHT fires when clock-raise scenes run far below average length', async () => {
      const lc369c = [10, 10, 2, 10, 10, 2, 10, 10];
      const recs369c = Array.from({ length: 8 }, (_, i) => makeRec369(i, { clockRaised: [2, 5].includes(i) }));
      const res = await runP369(recs369c, makeFountain369(lc369c));
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_SCENE_UNDERWEIGHT'), 'CLOCK_SCENE_UNDERWEIGHT should fire');
    });

    it('CLOCK_SCENE_UNDERWEIGHT does not fire when clock-raise scenes are average length', async () => {
      const lc369cn = [10, 10, 10, 10, 10, 10, 10, 10];
      const recs369cn = Array.from({ length: 8 }, (_, i) => makeRec369(i, { clockRaised: [2, 5].includes(i) }));
      const res = await runP369(recs369cn, makeFountain369(lc369cn));
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_SCENE_UNDERWEIGHT'), 'CLOCK_SCENE_UNDERWEIGHT should not fire');
    });

    it('REVELATION_SCENE_BLOAT fires when revelation scenes run far above average length', async () => {
      const lc369r = [4, 4, 20, 4, 4, 20, 4, 4];
      const recs369r = Array.from({ length: 8 }, (_, i) => makeRec369(i, { revelation: [2, 5].includes(i) ? 'the hidden truth' : null }));
      const res = await runP369(recs369r, makeFountain369(lc369r));
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_SCENE_BLOAT'), 'REVELATION_SCENE_BLOAT should fire');
    });

    it('REVELATION_SCENE_BLOAT does not fire when revelation scenes are average length', async () => {
      const lc369rn = [10, 10, 10, 10, 10, 10, 10, 10];
      const recs369rn = Array.from({ length: 8 }, (_, i) => makeRec369(i, { revelation: [2, 5].includes(i) ? 'the hidden truth' : null }));
      const res = await runP369(recs369rn, makeFountain369(lc369rn));
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_SCENE_BLOAT'), 'REVELATION_SCENE_BLOAT should not fire');
    });

    it('PAYOFF_SCENE_BLOAT fires when payoff scenes run far above average length', async () => {
      const lc369p = [4, 4, 20, 4, 4, 20, 4, 4];
      const recs369p = Array.from({ length: 8 }, (_, i) => makeRec369(i, { payoffSetupIds: [2, 5].includes(i) ? [`setup${i}`] : [] }));
      const res = await runP369(recs369p, makeFountain369(lc369p));
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_SCENE_BLOAT'), 'PAYOFF_SCENE_BLOAT should fire');
    });

    it('PAYOFF_SCENE_BLOAT does not fire when payoff scenes are average length', async () => {
      const lc369pn = [10, 10, 10, 10, 10, 10, 10, 10];
      const recs369pn = Array.from({ length: 8 }, (_, i) => makeRec369(i, { payoffSetupIds: [2, 5].includes(i) ? [`setup${i}`] : [] }));
      const res = await runP369(recs369pn, makeFountain369(lc369pn));
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_SCENE_BLOAT'), 'PAYOFF_SCENE_BLOAT should not fire');
    });
  });


  describe('Wave 355 — pacingPass: suspense peak scene underweight, seed scene bloat, stakes scene underweight', async () => {
    const makeRec355 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeFountain355 = (lineCounts: number[]) =>
      lineCounts.map((n, i) =>
        `INT. SC${i} - DAY\n\n${Array.from({ length: n }, (_, j) => `Action line ${j + 1} for scene ${i}.`).join('\n\n')}`
      ).join('\n\n');
    const runP355 = async (records: any[], fountain: string) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      return pacingPass({ fountain, original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('SUSPENSE_PEAK_SCENE_UNDERWEIGHT fires when the peak-suspense scene is far below average length', async () => {
      const lc355s = [10, 10, 2, 10, 10, 10, 10, 10];
      const recs355s = Array.from({ length: 8 }, (_, i) => makeRec355(i, { suspenseDelta: i === 2 ? 5 : 0.5 }));
      const res = await runP355(recs355s, makeFountain355(lc355s));
      assert.ok(res.issues.some((i: any) => i.rule === 'SUSPENSE_PEAK_SCENE_UNDERWEIGHT'), 'SUSPENSE_PEAK_SCENE_UNDERWEIGHT should fire');
    });

    it('SUSPENSE_PEAK_SCENE_UNDERWEIGHT does not fire when the peak-suspense scene is average length', async () => {
      const lc355sn = [10, 10, 10, 10, 10, 10, 10, 10];
      const recs355sn = Array.from({ length: 8 }, (_, i) => makeRec355(i, { suspenseDelta: i === 2 ? 5 : 0.5 }));
      const res = await runP355(recs355sn, makeFountain355(lc355sn));
      assert.ok(!res.issues.some((i: any) => i.rule === 'SUSPENSE_PEAK_SCENE_UNDERWEIGHT'), 'SUSPENSE_PEAK_SCENE_UNDERWEIGHT should not fire');
    });

    it('SEED_SCENE_BLOAT fires when clue-seeding scenes run far above average length', async () => {
      const lc355b = [4, 4, 20, 4, 4, 20, 4, 4];
      const recs355b = Array.from({ length: 8 }, (_, i) => makeRec355(i, { seededClueIds: [2, 5].includes(i) ? [`clue${i}`] : [] }));
      const res = await runP355(recs355b, makeFountain355(lc355b));
      assert.ok(res.issues.some((i: any) => i.rule === 'SEED_SCENE_BLOAT'), 'SEED_SCENE_BLOAT should fire');
    });

    it('SEED_SCENE_BLOAT does not fire when clue-seeding scenes are average length', async () => {
      const lc355bn = [10, 10, 10, 10, 10, 10, 10, 10];
      const recs355bn = Array.from({ length: 8 }, (_, i) => makeRec355(i, { seededClueIds: [2, 5].includes(i) ? [`clue${i}`] : [] }));
      const res = await runP355(recs355bn, makeFountain355(lc355bn));
      assert.ok(!res.issues.some((i: any) => i.rule === 'SEED_SCENE_BLOAT'), 'SEED_SCENE_BLOAT should not fire');
    });

    it('STAKES_SCENE_UNDERWEIGHT fires when raise_stakes scenes run far below average length', async () => {
      const lc355k = [10, 10, 2, 10, 10, 2, 10, 10];
      const recs355k = Array.from({ length: 8 }, (_, i) => makeRec355(i, { purpose: [2, 5].includes(i) ? 'raise_stakes' : 'development' }));
      const res = await runP355(recs355k, makeFountain355(lc355k));
      assert.ok(res.issues.some((i: any) => i.rule === 'STAKES_SCENE_UNDERWEIGHT'), 'STAKES_SCENE_UNDERWEIGHT should fire');
    });

    it('STAKES_SCENE_UNDERWEIGHT does not fire when raise_stakes scenes are average length', async () => {
      const lc355kn = [10, 10, 10, 10, 10, 10, 10, 10];
      const recs355kn = Array.from({ length: 8 }, (_, i) => makeRec355(i, { purpose: [2, 5].includes(i) ? 'raise_stakes' : 'development' }));
      const res = await runP355(recs355kn, makeFountain355(lc355kn));
      assert.ok(!res.issues.some((i: any) => i.rule === 'STAKES_SCENE_UNDERWEIGHT'), 'STAKES_SCENE_UNDERWEIGHT should not fire');
    });
  });


  describe('Wave 341 — pacingPass: conflict scene underweight, curiosity peak scene underweight, quiet scene bloat', async () => {
    const makeRec341 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeFountain341 = (lineCounts: number[]) =>
      lineCounts.map((n, i) =>
        `INT. SC${i} - DAY\n\n${Array.from({ length: n }, (_, j) => `Action line ${j + 1} for scene ${i}.`).join('\n\n')}`
      ).join('\n\n');
    const runP341 = async (records: any[], fountain: string) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      return pacingPass({ fountain, original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };
    const negShift341 = [{ pairs: ['A', 'B'], amount: -0.5, dimension: 'trust' }];

    it('CONFLICT_SCENE_UNDERWEIGHT fires when conflict scenes run far below average length', async () => {
      const lc341c = [10, 10, 2, 10, 10, 2, 10, 10];
      const recs341c = Array.from({ length: 8 }, (_, i) =>
        makeRec341(i, { relationshipShifts: [2, 5].includes(i) ? negShift341 : [] })
      );
      const res = await runP341(recs341c, makeFountain341(lc341c));
      assert.ok(res.issues.some((i: any) => i.rule === 'CONFLICT_SCENE_UNDERWEIGHT'), 'CONFLICT_SCENE_UNDERWEIGHT should fire');
    });

    it('CONFLICT_SCENE_UNDERWEIGHT does not fire when conflict scenes are average length', async () => {
      const lc341cn = [10, 10, 10, 10, 10, 10, 10, 10];
      const recs341cn = Array.from({ length: 8 }, (_, i) =>
        makeRec341(i, { relationshipShifts: [2, 5].includes(i) ? negShift341 : [] })
      );
      const res = await runP341(recs341cn, makeFountain341(lc341cn));
      assert.ok(!res.issues.some((i: any) => i.rule === 'CONFLICT_SCENE_UNDERWEIGHT'), 'CONFLICT_SCENE_UNDERWEIGHT should not fire');
    });

    it('CURIOSITY_PEAK_SCENE_UNDERWEIGHT fires when high-curiosity scenes run far below average length', async () => {
      const lc341q = [10, 10, 2, 10, 10, 2, 10, 10];
      const recs341q = Array.from({ length: 8 }, (_, i) =>
        makeRec341(i, { curiosityDelta: [2, 5].includes(i) ? 2 : 0 })
      );
      const res = await runP341(recs341q, makeFountain341(lc341q));
      assert.ok(res.issues.some((i: any) => i.rule === 'CURIOSITY_PEAK_SCENE_UNDERWEIGHT'), 'CURIOSITY_PEAK_SCENE_UNDERWEIGHT should fire');
    });

    it('CURIOSITY_PEAK_SCENE_UNDERWEIGHT does not fire when high-curiosity scenes are average length', async () => {
      const lc341qn = [10, 10, 10, 10, 10, 10, 10, 10];
      const recs341qn = Array.from({ length: 8 }, (_, i) =>
        makeRec341(i, { curiosityDelta: [2, 5].includes(i) ? 2 : 0 })
      );
      const res = await runP341(recs341qn, makeFountain341(lc341qn));
      assert.ok(!res.issues.some((i: any) => i.rule === 'CURIOSITY_PEAK_SCENE_UNDERWEIGHT'), 'CURIOSITY_PEAK_SCENE_UNDERWEIGHT should not fire');
    });

    it('QUIET_SCENE_BLOAT fires when inert scenes run far above average length', async () => {
      const lc341z = [20, 20, 20, 4, 4, 4, 4, 4];
      // scenes 0,1,2 are quiet (default) and long; scenes 3-7 are charged and short
      const recs341z = Array.from({ length: 8 }, (_, i) =>
        makeRec341(i, [3, 4, 5, 6, 7].includes(i) ? { emotionalShift: 'positive', dramaticTurn: 'reversal' } : {})
      );
      const res = await runP341(recs341z, makeFountain341(lc341z));
      assert.ok(res.issues.some((i: any) => i.rule === 'QUIET_SCENE_BLOAT'), 'QUIET_SCENE_BLOAT should fire');
    });

    it('QUIET_SCENE_BLOAT does not fire when inert scenes are average length', async () => {
      const lc341zn = [10, 10, 10, 10, 10, 10, 10, 10];
      const recs341zn = Array.from({ length: 8 }, (_, i) =>
        makeRec341(i, [3, 4, 5, 6, 7].includes(i) ? { emotionalShift: 'positive', dramaticTurn: 'reversal' } : {})
      );
      const res = await runP341(recs341zn, makeFountain341(lc341zn));
      assert.ok(!res.issues.some((i: any) => i.rule === 'QUIET_SCENE_BLOAT'), 'QUIET_SCENE_BLOAT should not fire');
    });
  });


  describe('Wave 327 — pacingPass: dramatic-turn scene underweight, payoff scene underweight, emotional peak scene underweight', async () => {
    const makeRec327 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeFountain327 = (lineCounts: number[]) =>
      lineCounts.map((n, i) =>
        `INT. SC${i} - DAY\n\n${Array.from({ length: n }, (_, j) => `Action line ${j + 1} for scene ${i}.`).join('\n\n')}`
      ).join('\n\n');
    const runP327 = async (records: any[], fountain: string) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      return pacingPass({ fountain, original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DRAMATIC_TURN_SCENE_UNDERWEIGHT fires when turn scenes run far below average length', async () => {
      const lc327t = [10, 10, 2, 10, 10, 2, 10, 10];
      const recs327t = Array.from({ length: 8 }, (_, i) =>
        makeRec327(i, { dramaticTurn: [2, 5].includes(i) ? 'reversal' : 'nothing' })
      );
      const res = await runP327(recs327t, makeFountain327(lc327t));
      assert.ok(res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_SCENE_UNDERWEIGHT'), 'DRAMATIC_TURN_SCENE_UNDERWEIGHT should fire');
    });

    it('DRAMATIC_TURN_SCENE_UNDERWEIGHT does not fire when turn scenes are average length', async () => {
      const lc327nt = [10, 10, 10, 10, 10, 10, 10, 10];
      const recs327nt = Array.from({ length: 8 }, (_, i) =>
        makeRec327(i, { dramaticTurn: [2, 5].includes(i) ? 'reversal' : 'nothing' })
      );
      const res = await runP327(recs327nt, makeFountain327(lc327nt));
      assert.ok(!res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_SCENE_UNDERWEIGHT'), 'DRAMATIC_TURN_SCENE_UNDERWEIGHT should not fire');
    });

    it('PAYOFF_SCENE_UNDERWEIGHT fires when payoff scenes run far below average length', async () => {
      const lc327p = [10, 10, 2, 10, 10, 2, 10, 10];
      const recs327p = Array.from({ length: 8 }, (_, i) =>
        makeRec327(i, { payoffSetupIds: [2, 5].includes(i) ? [`clue${i}`] : [] })
      );
      const res = await runP327(recs327p, makeFountain327(lc327p));
      assert.ok(res.issues.some((i: any) => i.rule === 'PAYOFF_SCENE_UNDERWEIGHT'), 'PAYOFF_SCENE_UNDERWEIGHT should fire');
    });

    it('PAYOFF_SCENE_UNDERWEIGHT does not fire when payoff scenes are average length', async () => {
      const lc327np = [10, 10, 10, 10, 10, 10, 10, 10];
      const recs327np = Array.from({ length: 8 }, (_, i) =>
        makeRec327(i, { payoffSetupIds: [2, 5].includes(i) ? [`clue${i}`] : [] })
      );
      const res = await runP327(recs327np, makeFountain327(lc327np));
      assert.ok(!res.issues.some((i: any) => i.rule === 'PAYOFF_SCENE_UNDERWEIGHT'), 'PAYOFF_SCENE_UNDERWEIGHT should not fire');
    });

    it('EMOTIONAL_PEAK_SCENE_UNDERWEIGHT fires when charged scenes run far below average length', async () => {
      const lc327e = [10, 10, 2, 10, 2, 10, 2, 10];
      const recs327e = Array.from({ length: 8 }, (_, i) =>
        makeRec327(i, { emotionalShift: [2, 4, 6].includes(i) ? 'positive' : 'neutral' })
      );
      const res = await runP327(recs327e, makeFountain327(lc327e));
      assert.ok(res.issues.some((i: any) => i.rule === 'EMOTIONAL_PEAK_SCENE_UNDERWEIGHT'), 'EMOTIONAL_PEAK_SCENE_UNDERWEIGHT should fire');
    });

    it('EMOTIONAL_PEAK_SCENE_UNDERWEIGHT does not fire when charged scenes are average length', async () => {
      const lc327ne = [10, 10, 10, 10, 10, 10, 10, 10];
      const recs327ne = Array.from({ length: 8 }, (_, i) =>
        makeRec327(i, { emotionalShift: [2, 4, 6].includes(i) ? 'positive' : 'neutral' })
      );
      const res = await runP327(recs327ne, makeFountain327(lc327ne));
      assert.ok(!res.issues.some((i: any) => i.rule === 'EMOTIONAL_PEAK_SCENE_UNDERWEIGHT'), 'EMOTIONAL_PEAK_SCENE_UNDERWEIGHT should not fire');
    });
  });


  describe('Wave 316 — pacingPass: revelation scene underweight, curiosity midzone gap, clock scene pacing mismatch', async () => {
    const makeRec316 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeFountain316 = (lineCounts: number[]) =>
      lineCounts.map((n, i) =>
        `INT. SC${i} - DAY\n\n${Array.from({ length: n }, (_, j) => `Action line ${j + 1} for scene ${i}.`).join('\n\n')}`
      ).join('\n\n');
    const runP316 = async (records: any[], fountain: string) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      return pacingPass({ fountain, original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('REVELATION_SCENE_UNDERWEIGHT fires when revelation scenes avg below 60% of overall avg', async () => {
      const lineCounts316r = [10, 10, 2, 10, 10, 10, 2, 10];
      const recs316r = Array.from({ length: 8 }, (_, i) =>
        makeRec316(i, { revelation: [2, 6].includes(i) ? `Disclosure at scene ${i}.` : null })
      );
      const res = await runP316(recs316r, makeFountain316(lineCounts316r));
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_SCENE_UNDERWEIGHT'), 'REVELATION_SCENE_UNDERWEIGHT should fire');
    });

    it('REVELATION_SCENE_UNDERWEIGHT does not fire when revelation scenes are average length', async () => {
      const lineCounts316nr = [10, 10, 10, 10, 10, 10, 10, 10];
      const recs316nr = Array.from({ length: 8 }, (_, i) =>
        makeRec316(i, { revelation: [2, 6].includes(i) ? `Disclosure at scene ${i}.` : null })
      );
      const res = await runP316(recs316nr, makeFountain316(lineCounts316nr));
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_SCENE_UNDERWEIGHT'), 'REVELATION_SCENE_UNDERWEIGHT should not fire');
    });

    it('PACING_CURIOSITY_MIDZONE_GAP fires when midzone curiosity stalls after a positive opening', async () => {
      const recs316mg = Array.from({ length: 10 }, (_, i) =>
        makeRec316(i, { curiosityDelta: i < 2 ? 2 : 0 })
      );
      const res = await runP316(recs316mg, makeFountain316(Array(10).fill(3)));
      assert.ok(res.issues.some((i: any) => i.rule === 'PACING_CURIOSITY_MIDZONE_GAP'), 'PACING_CURIOSITY_MIDZONE_GAP should fire');
    });

    it('PACING_CURIOSITY_MIDZONE_GAP does not fire when midzone sustains curiosity', async () => {
      const recs316nmg = Array.from({ length: 10 }, (_, i) =>
        makeRec316(i, { curiosityDelta: i < 2 ? 2 : 1 })
      );
      const res = await runP316(recs316nmg, makeFountain316(Array(10).fill(3)));
      assert.ok(!res.issues.some((i: any) => i.rule === 'PACING_CURIOSITY_MIDZONE_GAP'), 'PACING_CURIOSITY_MIDZONE_GAP should not fire');
    });

    it('CLOCK_SCENE_PACING_MISMATCH fires when clock-raising scenes are far above average length', async () => {
      const lineCounts316c = [3, 3, 20, 3, 3, 20, 3, 3];
      const recs316c = Array.from({ length: 8 }, (_, i) =>
        makeRec316(i, { clockRaised: [2, 5].includes(i) })
      );
      const res = await runP316(recs316c, makeFountain316(lineCounts316c));
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_SCENE_PACING_MISMATCH'), 'CLOCK_SCENE_PACING_MISMATCH should fire');
    });

    it('CLOCK_SCENE_PACING_MISMATCH does not fire when clock scenes match overall average length', async () => {
      const lineCounts316nc = [5, 5, 5, 5, 5, 5, 5, 5];
      const recs316nc = Array.from({ length: 8 }, (_, i) =>
        makeRec316(i, { clockRaised: [2, 5].includes(i) })
      );
      const res = await runP316(recs316nc, makeFountain316(lineCounts316nc));
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_SCENE_PACING_MISMATCH'), 'CLOCK_SCENE_PACING_MISMATCH should not fire');
    });
  });


  describe('Wave 288 — pacingPass: suspense early peak, curiosity final drop, scene count imbalance', async () => {
    const makeRec288 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0.5, curiosityDelta: 0.5,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeFountain288 = (n: number) =>
      Array.from({ length: n }, (_, i) => `INT. SCENE ${i} - DAY\n\nScene ${i} action line.`).join('\n\n');
    const runP288 = async (records: any[]) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      return pacingPass({ fountain: makeFountain288(records.length), original: '', records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('PACING_SUSPENSE_EARLY_PEAK fires when Act 1 avg suspense > Act 3 avg and Act 3 avg ≤ 0', async () => {
      // 12 scenes: Act 1 (0-2) high suspense, Act 3 (9-11) negative suspense
      const recs288sep = Array.from({ length: 12 }, (_, i) =>
        makeRec288(i, { suspenseDelta: i < 3 ? 3.0 : i >= 9 ? -0.5 : 0.5 })
      );
      const res = await runP288(recs288sep);
      assert.ok(res.issues.some((i: any) => i.rule === 'PACING_SUSPENSE_EARLY_PEAK'), 'PACING_SUSPENSE_EARLY_PEAK should fire');
    });

    it('PACING_SUSPENSE_EARLY_PEAK does not fire when Act 3 avg suspense is positive', async () => {
      const recs288nsep = Array.from({ length: 12 }, (_, i) =>
        makeRec288(i, { suspenseDelta: i < 3 ? 1.0 : i >= 9 ? 2.0 : 0.5 })
      );
      const res = await runP288(recs288nsep);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PACING_SUSPENSE_EARLY_PEAK'), 'PACING_SUSPENSE_EARLY_PEAK should not fire');
    });

    it('PACING_CURIOSITY_FINAL_DROP fires when overall curiosity is positive but final quarter drops to ≤ 0', async () => {
      // 12 scenes: overall positive (0.5 avg) but final 3 scenes have curiosityDelta = -1
      const recs288cfd = Array.from({ length: 12 }, (_, i) =>
        makeRec288(i, { curiosityDelta: i >= 9 ? -1 : 1 })
      );
      const res = await runP288(recs288cfd);
      assert.ok(res.issues.some((i: any) => i.rule === 'PACING_CURIOSITY_FINAL_DROP'), 'PACING_CURIOSITY_FINAL_DROP should fire');
    });

    it('PACING_CURIOSITY_FINAL_DROP does not fire when final quarter maintains positive curiosity', async () => {
      const recs288ncfd = Array.from({ length: 12 }, (_, i) =>
        makeRec288(i, { curiosityDelta: 1 })
      );
      const res = await runP288(recs288ncfd);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PACING_CURIOSITY_FINAL_DROP'), 'PACING_CURIOSITY_FINAL_DROP should not fire');
    });

    it('PACING_CURIOSITY_OPENING_FLATLINE fires when opening avg curiosityDelta is ≤ 0', async () => {
      // 12 scenes: opening (0-2) all have curiosityDelta = -1; overall still positive elsewhere
      const recs288cof = Array.from({ length: 12 }, (_, i) =>
        makeRec288(i, { curiosityDelta: i < 3 ? -1 : 1 })
      );
      const res = await runP288(recs288cof);
      assert.ok(res.issues.some((i: any) => i.rule === 'PACING_CURIOSITY_OPENING_FLATLINE'), 'PACING_CURIOSITY_OPENING_FLATLINE should fire');
    });

    it('PACING_CURIOSITY_OPENING_FLATLINE does not fire when opening has positive curiosityDelta', async () => {
      const recs288ncof = Array.from({ length: 12 }, (_, i) =>
        makeRec288(i, { curiosityDelta: 1 })
      );
      const res = await runP288(recs288ncof);
      assert.ok(!res.issues.some((i: any) => i.rule === 'PACING_CURIOSITY_OPENING_FLATLINE'), 'PACING_CURIOSITY_OPENING_FLATLINE should not fire');
    });
  });


  describe('Wave 274 — pacingPass: Act 3 page overrun, long-scene flood, Act 2 page weight', async () => {
    const makeRec274 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 1, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeScene274 = (idx: number, linesN: number) =>
      `INT. SC${idx} - DAY\n` + Array.from({ length: linesN }, (_, k) => `Action line ${k + 1}.`).join('\n') + '\n';
    const run274 = async (fountain: string, count: number) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      const records = Array.from({ length: count }, (_, i) => makeRec274(i));
      return pacingPass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ACT3_PAGE_OVERRUN fires when Act 3 consumes more than 35% of total pages', async () => {
      // 8 scenes; act3=scenes 6-7; 6 short (3 lines) + 2 very long (25 lines)
      // act3 = 50/(18+50)=74% > 35%
      const f274a = [
        ...Array.from({ length: 6 }, (_, i) => makeScene274(i, 3)),
        makeScene274(6, 25), makeScene274(7, 25),
      ].join('\n');
      const result274a = await run274(f274a, 8);
      const overrun = result274a.issues.filter((i: any) => i.rule === 'ACT3_PAGE_OVERRUN');
      assert.ok(overrun.length >= 1, `Should detect ACT3_PAGE_OVERRUN, got: ${JSON.stringify(result274a.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(overrun[0].severity, 'minor');
    });

    it('ACT3_PAGE_OVERRUN does NOT fire when Act 3 is proportionally sized', async () => {
      // 8 equal scenes of 10 lines → act3 = 20/80 = 25% < 35%
      const f274b = Array.from({ length: 8 }, (_, i) => makeScene274(i, 10)).join('\n');
      const result274b = await run274(f274b, 8);
      const overrun = result274b.issues.filter((i: any) => i.rule === 'ACT3_PAGE_OVERRUN');
      assert.strictEqual(overrun.length, 0, 'Should NOT fire when Act 3 is proportionally sized');
    });

    it('LONG_SCENE_FLOOD fires when more than 50% of scenes are above 1.5x average length', async () => {
      // 8 scenes: 5 at 30 lines, 3 at 3 lines → avg≈19.9, 1.5x≈29.8; 5 > 29.8 → 62.5% > 50%
      const f274c = [
        ...Array.from({ length: 5 }, (_, i) => makeScene274(i, 30)),
        ...Array.from({ length: 3 }, (_, i) => makeScene274(i + 5, 3)),
      ].join('\n');
      const result274c = await run274(f274c, 8);
      const flood = result274c.issues.filter((i: any) => i.rule === 'LONG_SCENE_FLOOD');
      assert.ok(flood.length >= 1, `Should detect LONG_SCENE_FLOOD, got: ${JSON.stringify(result274c.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(flood[0].severity, 'minor');
    });

    it('LONG_SCENE_FLOOD does NOT fire when fewer than half the scenes are above 1.5x average', async () => {
      // 8 scenes: 3 at 20 lines, 5 at 5 lines → avg≈10.6, 1.5x≈15.9; 3 > 15.9 → 37.5% < 50%
      const f274d = [
        ...Array.from({ length: 3 }, (_, i) => makeScene274(i, 20)),
        ...Array.from({ length: 5 }, (_, i) => makeScene274(i + 3, 5)),
      ].join('\n');
      const result274d = await run274(f274d, 8);
      const flood = result274d.issues.filter((i: any) => i.rule === 'LONG_SCENE_FLOOD');
      assert.strictEqual(flood.length, 0, 'Should NOT fire when fewer than half the scenes are above 1.5x average');
    });

    it('ACT2_PAGE_WEIGHT fires when Act 2 consumes less than 40% of total pages', async () => {
      // 10 scenes; act2=scenes 2-7; acts 1&3 heavy (25 lines), act2 thin (3 lines)
      // act2=18/(50+18+50)=15% < 40%
      const f274e = [
        makeScene274(0, 25), makeScene274(1, 25),
        ...Array.from({ length: 6 }, (_, i) => makeScene274(i + 2, 3)),
        makeScene274(8, 25), makeScene274(9, 25),
      ].join('\n');
      const result274e = await run274(f274e, 10);
      const aw = result274e.issues.filter((i: any) => i.rule === 'ACT2_PAGE_WEIGHT');
      assert.ok(aw.length >= 1, `Should detect ACT2_PAGE_WEIGHT, got: ${JSON.stringify(result274e.issues.map((i: any) => i.rule))}`);
      assert.strictEqual(aw[0].severity, 'minor');
    });

    it('ACT2_PAGE_WEIGHT does NOT fire when Act 2 is properly weighted', async () => {
      // 10 equal scenes of 10 lines → act2 (scenes 2-7) = 60/100 = 60% > 40%
      const f274f = Array.from({ length: 10 }, (_, i) => makeScene274(i, 10)).join('\n');
      const result274f = await run274(f274f, 10);
      const aw = result274f.issues.filter((i: any) => i.rule === 'ACT2_PAGE_WEIGHT');
      assert.strictEqual(aw.length, 0, 'Should NOT fire when Act 2 is properly weighted');
    });
  });


  describe('Wave 260 — pacingPass: opening scene bloat, Act 1 overextended, short-scene flood', async () => {
    const makeRec260 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 1, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeScene260 = (idx: number, linesN: number) =>
      `INT. SC${idx} - DAY\n` + Array.from({ length: linesN }, (_, k) => `Action line ${k + 1}.`).join('\n') + '\n';
    const run260 = async (fountain: string, count: number) => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      const records = Array.from({ length: count }, (_, i) => makeRec260(i));
      return pacingPass({ fountain, original: fountain, records, structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('OPENING_SCENE_BLOAT fires when the first scene is >=2.5x average length', async () => {
      // 10 scenes; scene 0 = 30 lines, rest = 5 lines → avg ≈ 7.5, scene0 = 4x avg
      const f260a = [makeScene260(0, 30), ...Array.from({ length: 9 }, (_, i) => makeScene260(i + 1, 5))].join('\n');
      const result260a = await run260(f260a, 10);
      assert.ok(result260a.issues.some((i: any) => i.rule === 'OPENING_SCENE_BLOAT'), `Expected OPENING_SCENE_BLOAT, got: ${JSON.stringify(result260a.issues.map((i: any) => i.rule))}`);
    });

    it('OPENING_SCENE_BLOAT does NOT fire when the first scene is normal length', async () => {
      const f260b = Array.from({ length: 10 }, (_, i) => makeScene260(i, 8)).join('\n');
      const result260b = await run260(f260b, 10);
      assert.ok(!result260b.issues.some((i: any) => i.rule === 'OPENING_SCENE_BLOAT'), 'Should NOT fire when the first scene is normal length');
    });

    it('ACT1_OVEREXTENDED fires when Act 1 consumes >40% of total lines', async () => {
      // 12 scenes; act1 = scenes 0,1,2 (floor(12*0.25)=3); scenes 0-2 = 30 lines each, rest = 3 lines
      // act1 = 90 lines, rest = 9*3 = 27, total = 117 → act1 = 77% > 40%
      const f260c = [
        makeScene260(0, 30), makeScene260(1, 30), makeScene260(2, 30),
        ...Array.from({ length: 9 }, (_, i) => makeScene260(i + 3, 3)),
      ].join('\n');
      const result260c = await run260(f260c, 12);
      assert.ok(result260c.issues.some((i: any) => i.rule === 'ACT1_OVEREXTENDED'), `Expected ACT1_OVEREXTENDED, got: ${JSON.stringify(result260c.issues.map((i: any) => i.rule))}`);
    });

    it('ACT1_OVEREXTENDED does NOT fire when page budget is balanced', async () => {
      const f260d = Array.from({ length: 12 }, (_, i) => makeScene260(i, 8)).join('\n');
      const result260d = await run260(f260d, 12);
      assert.ok(!result260d.issues.some((i: any) => i.rule === 'ACT1_OVEREXTENDED'), 'Should NOT fire when page budget is balanced');
    });

    it('SHORT_SCENE_FLOOD fires when >60% of scenes are undersized', async () => {
      // 10 scenes; 8 scenes = 2 lines, 2 scenes = 30 lines → avg ≈ 7.6; short threshold ≈ 4.6; 8/10 = 80% short
      const f260e = [
        ...Array.from({ length: 8 }, (_, i) => makeScene260(i, 2)),
        makeScene260(8, 30), makeScene260(9, 30),
      ].join('\n');
      const result260e = await run260(f260e, 10);
      assert.ok(result260e.issues.some((i: any) => i.rule === 'SHORT_SCENE_FLOOD'), `Expected SHORT_SCENE_FLOOD, got: ${JSON.stringify(result260e.issues.map((i: any) => i.rule))}`);
    });

    it('SHORT_SCENE_FLOOD does NOT fire when scene lengths are uniform', async () => {
      const f260f = Array.from({ length: 10 }, (_, i) => makeScene260(i, 8)).join('\n');
      const result260f = await run260(f260f, 10);
      assert.ok(!result260f.issues.some((i: any) => i.rule === 'SHORT_SCENE_FLOOD'), 'Should NOT fire when scene lengths are uniform');
    });
  });


  describe('Wave 246 — pacingPass: Act 2 pacing valley, climax scene undersized, midpoint bloat', async () => {
    const makeRec246 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 1, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
      ...overrides,
    });
    const makeScene246 = (idx: number, lines: number) =>
      `INT. SC${idx} - DAY\n` + Array.from({ length: lines }, (_, k) => `Action line ${k + 1}.`).join('\n') + '\n';

    it('ACT2_PACING_VALLEY fires when 3+ consecutive Act 2 scenes are each below 60% of average length', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // 10 scenes; Act2 = scenes 2-6; scenes 2,3,4 each have 2 lines (valley below 60% of avg≈8)
      const f246a = [
        makeScene246(0,10), makeScene246(1,10),
        makeScene246(2,2), makeScene246(3,2), makeScene246(4,2),
        makeScene246(5,10), makeScene246(6,10),
        makeScene246(7,10), makeScene246(8,10), makeScene246(9,10),
      ].join('\n');
      const records246a = Array.from({ length: 10 }, (_, i) => makeRec246(i));
      const result = await pacingPass({ fountain: f246a, original: f246a, records: records246a, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(result.issues.some((i: any) => i.rule === 'ACT2_PACING_VALLEY'), `Expected ACT2_PACING_VALLEY, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('ACT2_PACING_VALLEY does NOT fire when Act 2 scene lengths are uniform', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      const f246b = Array.from({ length: 10 }, (_, i) => makeScene246(i, 8)).join('\n');
      const records246b = Array.from({ length: 10 }, (_, i) => makeRec246(i));
      const result = await pacingPass({ fountain: f246b, original: f246b, records: records246b, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(!result.issues.some((i: any) => i.rule === 'ACT2_PACING_VALLEY'), 'Should NOT fire when Act 2 scenes have uniform length');
    });

    it('CLIMAX_SCENE_UNDERSIZED fires when the peak suspense scene is among the shortest', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // 8 scenes; scene 5 has peak suspense but only 2 lines; others have 8
      const f246c = Array.from({ length: 8 }, (_, i) => makeScene246(i, i === 5 ? 2 : 8)).join('\n');
      const records246c = Array.from({ length: 8 }, (_, i) => makeRec246(i, { suspenseDelta: i === 5 ? 5 : 1 }));
      const result = await pacingPass({ fountain: f246c, original: f246c, records: records246c, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(result.issues.some((i: any) => i.rule === 'CLIMAX_SCENE_UNDERSIZED'), `Expected CLIMAX_SCENE_UNDERSIZED, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('CLIMAX_SCENE_UNDERSIZED does NOT fire when the peak suspense scene is the longest', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // Scene 5 has peak suspense AND is the longest (20 lines)
      const f246d = Array.from({ length: 8 }, (_, i) => makeScene246(i, i === 5 ? 20 : 8)).join('\n');
      const records246d = Array.from({ length: 8 }, (_, i) => makeRec246(i, { suspenseDelta: i === 5 ? 5 : 1 }));
      const result = await pacingPass({ fountain: f246d, original: f246d, records: records246d, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(!result.issues.some((i: any) => i.rule === 'CLIMAX_SCENE_UNDERSIZED'), 'Should NOT fire when peak suspense scene is among the longest');
    });

    it('MIDPOINT_BLOAT fires when the midpoint scene is ≥2.5× the average length', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // 8 scenes; midpoint = scene 4 (floor(8*0.5)=4); scene 4 has 20 lines; others 4
      const f246e = Array.from({ length: 8 }, (_, i) => makeScene246(i, i === 4 ? 20 : 4)).join('\n');
      const records246e = Array.from({ length: 8 }, (_, i) => makeRec246(i));
      const result = await pacingPass({ fountain: f246e, original: f246e, records: records246e, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(result.issues.some((i: any) => i.rule === 'MIDPOINT_BLOAT'), `Expected MIDPOINT_BLOAT, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('MIDPOINT_BLOAT does NOT fire when the midpoint scene is a normal length', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      const f246f = Array.from({ length: 8 }, (_, i) => makeScene246(i, 8)).join('\n');
      const records246f = Array.from({ length: 8 }, (_, i) => makeRec246(i));
      const result = await pacingPass({ fountain: f246f, original: f246f, records: records246f, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(!result.issues.some((i: any) => i.rule === 'MIDPOINT_BLOAT'), 'Should NOT fire when midpoint scene has normal length');
    });
  });


  describe('Wave 218 — pacingPass: deceleration trend, page-space inequality, rhythmic alternation absent (pacing signal-processing)', async () => {
    // Build a fountain where scene i has lens[i] action lines (each weighted +1).
    const buildPacingFountain218 = (lens: number[]) =>
      lens.map((L, i) =>
        `INT. SC${i} - DAY\n` + Array.from({ length: L }, () => 'The room stays quiet and still.').join('\n'),
      ).join('\n\n') + '\n';
    const makeRec218 = (idx: number): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 1, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
    });
    const makeInput218 = (lens: number[]) => {
      const fountain = buildPacingFountain218(lens);
      const records = lens.map((_, i) => makeRec218(i));
      return {
        fountain, original: fountain,
        records: records as any, structure: {} as any,
        storyContext: {} as any, annotations: records.map(() => null) as any,
        approvedSpans: [],
      };
    };

    it('PACE_DECELERATION_TREND fires when scene lengths trend upward across the story', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // Monotonically lengthening scenes → strong positive slope
      const result = await pacingPass(makeInput218([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'PACE_DECELERATION_TREND'),
        'Should fire when normalised length slope exceeds 6% of average per scene',
      );
    });

    it('PACE_DECELERATION_TREND does not fire when scene lengths quicken toward the climax', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // Monotonically shortening scenes → negative slope
      const result = await pacingPass(makeInput218([11, 10, 9, 8, 7, 6, 5, 4, 3, 2]));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'PACE_DECELERATION_TREND'),
        'Should NOT fire when the pace accelerates (scenes get shorter) toward the end',
      );
    });

    it('PAGE_SPACE_INEQUALITY fires when a few scenes hoard the page space', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // Nine tiny scenes and one enormous one → high Gini
      const result = await pacingPass(makeInput218([1, 1, 1, 1, 1, 1, 1, 1, 1, 50]));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'PAGE_SPACE_INEQUALITY'),
        'Should fire when the Gini coefficient of scene lengths exceeds 0.5',
      );
    });

    it('PAGE_SPACE_INEQUALITY does not fire when page space is evenly distributed', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      const result = await pacingPass(makeInput218([5, 6, 5, 7, 6, 5, 6, 7, 5, 6]));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'PAGE_SPACE_INEQUALITY'),
        'Should NOT fire when scene lengths are roughly even',
      );
    });

    it('RHYTHMIC_ALTERNATION_ABSENT fires when long and short scenes are grouped, not alternated', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // A block of long scenes then a block of short scenes → single mean-crossing
      const result = await pacingPass(makeInput218([10, 10, 10, 10, 10, 2, 2, 2, 2, 2]));
      assert.ok(
        result.issues.some((i: any) => i.rule === 'RHYTHMIC_ALTERNATION_ABSENT'),
        'Should fire when scene lengths rarely cross their mean despite large swings',
      );
    });

    it('RHYTHMIC_ALTERNATION_ABSENT does not fire when scene lengths alternate around the mean', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // Long/short alternation → frequent mean-crossings
      const result = await pacingPass(makeInput218([9, 2, 9, 2, 9, 2, 9, 2, 9, 2]));
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'RHYTHMIC_ALTERNATION_ABSENT'),
        'Should NOT fire when long and short scenes alternate frequently',
      );
    });
  });


  describe('Wave 200 — pacingPass: compression spiral, act2 dead weight, late expansion', async () => {
    function makeFountainLens200(lens: number[]): string {
      return lens.map((len, i) => {
        const body = Array.from({ length: len }, (_, j) => `Line ${j + 1} of scene ${i}.`).join('\n');
        return `INT. SC${i} - DAY\n\n${body}\n`;
      }).join('\n');
    }
    const makeRec200 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 1,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });
    const noAnn200 = (n: number) => Array.from({ length: n }, () => ({ revelation: false } as any));

    // ── SCENE_COMPRESSION_SPIRAL ──────────────────────────────────────────────
    it('pacingPass detects SCENE_COMPRESSION_SPIRAL for 5 consecutive shrinking scenes', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // scenes 0-4 = 20,15,14,11,8 each < previous → spiral fires at i=0
      const lens = [20, 15, 14, 11, 8, 5, 8, 10, 12];
      const records = Array.from({ length: 9 }, (_, i) => makeRec200(i));
      const result = await pacingPass({
        fountain: makeFountainLens200(lens), original: '',
        records: records as any, structure: {} as any,
        annotations: noAnn200(9), approvedSpans: [],
      });
      const spiral = result.issues.filter(i => i.rule === 'SCENE_COMPRESSION_SPIRAL');
      assert.ok(spiral.length >= 1, `Should detect SCENE_COMPRESSION_SPIRAL; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(spiral[0].severity === 'major');
    });

    it('pacingPass does NOT fire SCENE_COMPRESSION_SPIRAL when spiral is broken mid-run', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // scene 4=12 > scene 3=9 → spiral breaks; longest run is 4 not 5
      const lens = [20, 15, 14, 9, 12, 5, 8, 10, 12];
      const records = Array.from({ length: 9 }, (_, i) => makeRec200(i));
      const result = await pacingPass({
        fountain: makeFountainLens200(lens), original: '',
        records: records as any, structure: {} as any,
        annotations: noAnn200(9), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'SCENE_COMPRESSION_SPIRAL'),
        'Should NOT fire when no 5-scene window is strictly decreasing',
      );
    });

    // ── ACT2_DEAD_WEIGHT ──────────────────────────────────────────────────────
    it('pacingPass detects ACT2_DEAD_WEIGHT for 3+ empty act-2 scenes', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // n=8, act2=[2,6); scenes 2,3,4 are short+empty; scene 5 has suspenseDelta=1
      // avg=(3+14+3+3+5+4+6+5)/8=5.375; scene1 sd=2 prevents OVERLONG_LOW_TENSION
      const lens = [3, 14, 3, 3, 5, 4, 6, 5];
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec200(i, {
          suspenseDelta: i === 1 ? 2 : i <= 4 ? 0 : 1,
        }),
      );
      const result = await pacingPass({
        fountain: makeFountainLens200(lens), original: '',
        records: records as any, structure: {} as any,
        annotations: noAnn200(8), approvedSpans: [],
      });
      const dw = result.issues.filter(i => i.rule === 'ACT2_DEAD_WEIGHT');
      assert.ok(dw.length >= 1, `Should detect ACT2_DEAD_WEIGHT; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(dw[0].severity === 'major');
    });

    it('pacingPass does NOT fire ACT2_DEAD_WEIGHT when act-2 scenes have dramatic events', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // same lengths but scenes 2+3 get clockRaised/revelation → only 1 empty scene
      const lens = [3, 14, 3, 3, 5, 4, 6, 5];
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec200(i, {
          suspenseDelta: i === 1 ? 2 : i <= 4 ? 0 : 1,
          clockRaised: i === 2,
          revelation: i === 3 ? 'plot point' : null,
        }),
      );
      const result = await pacingPass({
        fountain: makeFountainLens200(lens), original: '',
        records: records as any, structure: {} as any,
        annotations: noAnn200(8), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'ACT2_DEAD_WEIGHT'),
        'Should NOT fire when most act-2 scenes contain a dramatic event',
      );
    });

    // ── LATE_EXPANSION ────────────────────────────────────────────────────────
    it('pacingPass detects LATE_EXPANSION when act 3 scenes are much longer than act 2', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // n=8, act2=[2,6)=4,5,3,4 avg=4; act3=[6,8)=12,12 avg=12; 12>4*1.15=4.6 → fires
      // records 4,6,7 sd=2 to prevent MIDPOINT_COLLAPSE & RESOLUTION_SCENE_BLOAT
      const lens = [9, 10, 4, 5, 3, 4, 12, 12];
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec200(i, { suspenseDelta: [4, 6].includes(i) ? 2 : i === 7 ? 2 : 1 }),
      );
      const result = await pacingPass({
        fountain: makeFountainLens200(lens), original: '',
        records: records as any, structure: {} as any,
        annotations: noAnn200(8), approvedSpans: [],
      });
      const late = result.issues.filter(i => i.rule === 'LATE_EXPANSION');
      assert.ok(late.length >= 1, `Should detect LATE_EXPANSION; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(late[0].severity === 'minor');
    });

    it('pacingPass does NOT fire LATE_EXPANSION when act 3 is not disproportionately longer', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // n=8, act2=[2,6)=8,6,6,7 avg=6.75; act3=[6,8)=8,6 avg=7; 7>6.75*1.15=7.76? No
      const lens = [4, 18, 8, 6, 6, 7, 8, 6];
      const records = Array.from({ length: 8 }, (_, i) => makeRec200(i));
      const result = await pacingPass({
        fountain: makeFountainLens200(lens), original: '',
        records: records as any, structure: {} as any,
        annotations: noAnn200(8), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'LATE_EXPANSION'),
        'Should NOT fire when act-3 average is within 15% of act-2 average',
      );
    });
  });


  describe('Wave 157 — pacingPass: climax underweight, midpoint collapse, resolution brevity', async () => {
    const makeRec = (idx: number, override: Partial<any> = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'dialogue', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
      ...override,
    });
    const noAnnotations = (n: number) => Array.from({ length: n }, () => ({ revelation: false } as any));

    // Build fountain with per-scene action-line counts (each action line = 1 weighted unit)
    function makeFountainWithLengths(sceneLinesArray: number[]): string {
      return sceneLinesArray.map((len, i) => {
        const body = Array.from({ length: len }, (_, j) => `Scene ${i} action line ${j + 1}.`).join('\n');
        return `INT. SC${i} - DAY\n\n${body}\n`;
      }).join('\n');
    }

    it('pacingPass detects CLIMAX_SCENE_UNDERWEIGHT when climax scene is too short', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // 8 scenes: all 5 lines except scene 6 (climax zone starts at 5) gets 1 line
      // avgLength ≈ (6*5 + 1 + 4) / 8 = 35/8 ≈ 4.4; climaxLines=1 < 4.4*0.7=3.1 → fires
      const sceneLens = [5, 5, 5, 5, 5, 4, 1, 4];
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, { suspenseDelta: i === 6 ? 3 : 1 }), // scene 6 is climax
      );
      const result = await pacingPass({
        fountain: makeFountainWithLengths(sceneLens),
        original: '', records: records as any, structure: {} as any,
        annotations: noAnnotations(8), approvedSpans: [],
      });
      const underweight = result.issues.filter(i => i.rule === 'CLIMAX_SCENE_UNDERWEIGHT');
      assert.ok(underweight.length >= 1, `Should detect CLIMAX_SCENE_UNDERWEIGHT; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(underweight[0].severity === 'major');
    });

    it('pacingPass does NOT fire CLIMAX_SCENE_UNDERWEIGHT when climax scene is well-sized', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      const sceneLens = [5, 5, 5, 5, 5, 4, 6, 4]; // scene 6 is climax, 6 lines > average
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, { suspenseDelta: i === 6 ? 3 : 1 }),
      );
      const result = await pacingPass({
        fountain: makeFountainWithLengths(sceneLens),
        original: '', records: records as any, structure: {} as any,
        annotations: noAnnotations(8), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'CLIMAX_SCENE_UNDERWEIGHT'),
        'Should NOT fire when climax scene has adequate length',
      );
    });

    it('pacingPass detects MIDPOINT_COLLAPSE when midpoint is too short and flat', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // 8 scenes: midIdx = 4. All 5 lines except scene 4 = 1 line.
      // avgLength = (7*5 + 1) / 8 = 4.5; midLines=1 < 4.5*0.5=2.25 → fires
      const sceneLens = [5, 5, 5, 5, 1, 5, 5, 5];
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, { suspenseDelta: i === 4 ? 0.5 : 1 }), // midpoint flat
      );
      const result = await pacingPass({
        fountain: makeFountainWithLengths(sceneLens),
        original: '', records: records as any, structure: {} as any,
        annotations: noAnnotations(8), approvedSpans: [],
      });
      const collapse = result.issues.filter(i => i.rule === 'MIDPOINT_COLLAPSE');
      assert.ok(collapse.length >= 1, `Should detect MIDPOINT_COLLAPSE; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(collapse[0].severity === 'major');
    });

    it('pacingPass does NOT fire MIDPOINT_COLLAPSE when midpoint has adequate length', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      const sceneLens = [5, 5, 5, 5, 5, 5, 5, 5]; // all equal, midpoint is same size
      const records = Array.from({ length: 8 }, (_, i) =>
        makeRec(i, { suspenseDelta: i === 4 ? 0.5 : 1 }),
      );
      const result = await pacingPass({
        fountain: makeFountainWithLengths(sceneLens),
        original: '', records: records as any, structure: {} as any,
        annotations: noAnnotations(8), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'MIDPOINT_COLLAPSE'),
        'Should NOT fire when midpoint scene has adequate length',
      );
    });

    it('pacingPass detects RESOLUTION_TOO_BRIEF when final scene is too short', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      // 6 scenes: all 5 lines except scene 5 (final) = 1 line. purpose='resolution'
      // avgLength = (5*5 + 1)/6 ≈ 4.3; lastLines=1 < 4.3*0.5=2.15 → fires
      const sceneLens = [5, 5, 5, 5, 5, 1];
      const records = Array.from({ length: 6 }, (_, i) =>
        makeRec(i, { purpose: i === 5 ? 'resolution' : 'dialogue', suspenseDelta: i === 5 ? -1 : 1 }),
      );
      const result = await pacingPass({
        fountain: makeFountainWithLengths(sceneLens),
        original: '', records: records as any, structure: {} as any,
        annotations: noAnnotations(6), approvedSpans: [],
      });
      const brief = result.issues.filter(i => i.rule === 'RESOLUTION_TOO_BRIEF');
      assert.ok(brief.length >= 1, `Should detect RESOLUTION_TOO_BRIEF; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(brief[0].severity === 'major');
    });

    it('pacingPass does NOT fire RESOLUTION_TOO_BRIEF when final scene has adequate length', async () => {
      const { pacingPass } = await import('../../server/nvm/revision/passes/pacing.ts');
      const sceneLens = [5, 5, 5, 5, 5, 5]; // final scene same size as all others
      const records = Array.from({ length: 6 }, (_, i) =>
        makeRec(i, { purpose: i === 5 ? 'resolution' : 'dialogue', suspenseDelta: i === 5 ? -1 : 1 }),
      );
      const result = await pacingPass({
        fountain: makeFountainWithLengths(sceneLens),
        original: '', records: records as any, structure: {} as any,
        annotations: noAnnotations(6), approvedSpans: [],
      });
      assert.ok(
        !result.issues.some(i => i.rule === 'RESOLUTION_TOO_BRIEF'),
        'Should NOT fire when final scene has adequate length',
      );
    });
  });