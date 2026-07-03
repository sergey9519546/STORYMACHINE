// Extracted from the former monolithic test.ts (audit M2.1 — split for maintainability).
// voicePass revision-rule tests. Shared imports/helpers below are duplicated verbatim across every split
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


  // ── showrunner Gate 1b ─────────────────────────────────────────────────────

  // ── Wave 146: Voice pass enhancements ──────────────────────────────────────
  describe('Wave 146 — voicePass: clichés and subtext', async () => {
    it('voicePass detects CLICHE_DENSITY when screenplay overuses generic phrases', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // Create a fountain with many clichés
      const clicheScenes = Array.from({ length: 5 }, (_, i) => `INT. SC${i} - DAY
The room falls silent. A long pause. Awkward silence. They stare at each other. Suddenly...
`).join('\n');

      const makeRec = (idx: number): any => ({
        commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`, purpose: 'dialogue',
        dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
        emotionalShift: 'neutral', suspenseDelta: 1,
        dialogueHighlights: ['alice: hello'],
        unresolvedClues: [], seededClueIds: [], payoffSetupIds: [],
        visualBeats: [],
        relationshipShifts: [],
      });

      const records = Array.from({ length: 5 }, (_, i) => makeRec(i));

      const result = await voicePass({
        fountain: clicheScenes,
        original: clicheScenes,
        records: records as unknown as Parameters<typeof voicePass>[0]['records'],
        structure: {} as any,
        annotations: [],
        approvedSpans: [],
      });
      const cliche = result.issues.filter(i => i.rule === 'CLICHE_DENSITY');
      assert.ok(cliche.length >= 1, 'Should detect CLICHE_DENSITY for overuse of generic phrases');
      assert.ok(cliche[0].severity === 'minor');
    });

    it('voicePass does NOT fire CLICHE_DENSITY when screenplay uses original language', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // Create a fountain with original, specific action
      const originalScenes = Array.from({ length: 5 }, (_, i) => `INT. SC${i} - DAY
Alice fidgets with her coffee cup, watching the steam rise. She doesn't blink.
`).join('\n');

      const makeRec = (idx: number): any => ({
        commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`, purpose: 'dialogue',
        dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
        emotionalShift: 'neutral', suspenseDelta: 1,
        dialogueHighlights: ['alice: hello'],
        unresolvedClues: [], seededClueIds: [], payoffSetupIds: [],
        visualBeats: [],
        relationshipShifts: [],
      });

      const records = Array.from({ length: 5 }, (_, i) => makeRec(i));

      const result = await voicePass({
        fountain: originalScenes,
        original: originalScenes,
        records: records as unknown as Parameters<typeof voicePass>[0]['records'],
        structure: {} as any,
        annotations: [],
        approvedSpans: [],
      });
      const cliche = result.issues.filter(i => i.rule === 'CLICHE_DENSITY');
      assert.ok(cliche.length === 0, 'Should NOT fire for original, specific language');
    });

    it('voicePass detects SUBTEXT_ABSENCE when characters state emotions directly', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      const makeRec = (idx: number): any => ({
        commitId: `c${idx}`, sceneIdx: idx, slug: `SC${idx}`, purpose: 'dialogue',
        dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
        emotionalShift: 'negative', suspenseDelta: 2,
        dialogueHighlights: [
          'alice: i\'m angry right now',
          'bob: i think we have a problem',
          'alice: i believe you\'re wrong',
          'bob: i\'m scared',
        ],
        unresolvedClues: [], seededClueIds: [], payoffSetupIds: [],
        visualBeats: [],
        relationshipShifts: [],
      });

      const records = Array.from({ length: 10 }, (_, i) => makeRec(i));

      const fountainText = Array.from({ length: 10 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join('');

      const result = await voicePass({
        fountain: fountainText,
        original: fountainText,
        records: records as unknown as Parameters<typeof voicePass>[0]['records'],
        structure: {} as any,
        annotations: [],
        approvedSpans: [],
      });
      const subtext = result.issues.filter(i => i.rule === 'SUBTEXT_ABSENCE');
      assert.ok(subtext.length >= 1, 'Should detect SUBTEXT_ABSENCE for direct emotional statements');
      assert.ok(subtext[0].severity === 'major');
    });

    it('voicePass does NOT fire SUBTEXT_ABSENCE when dialogue is minimal', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      const makeRec = (idx: number): any => ({
        commitId: `c${idx}`, sceneIdx: idx, slug: `SC${idx}`, purpose: 'dialogue',
        dramaticTurn: 'nothing', revelation: null, clockRaised: false, clockDelta: 0,
        emotionalShift: 'neutral', suspenseDelta: 1,
        dialogueHighlights: [
          'alice: i\'m angry right now',
        ],
        unresolvedClues: [], seededClueIds: [], payoffSetupIds: [],
        visualBeats: [],
        relationshipShifts: [],
      });

      const records = Array.from({ length: 10 }, (_, i) => makeRec(i));

      const fountainText = Array.from({ length: 10 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join('');

      const result = await voicePass({
        fountain: fountainText,
        original: fountainText,
        records: records as unknown as Parameters<typeof voicePass>[0]['records'],
        structure: {} as any,
        annotations: [],
        approvedSpans: [],
      });
      const subtext = result.issues.filter(i => i.rule === 'SUBTEXT_ABSENCE');
      assert.ok(subtext.length === 0, 'Should NOT fire SUBTEXT_ABSENCE for minimal dialogue');
    });
  });


  describe('Wave 173 — voicePass: adverb crutch, filter words, exclamation overuse', async () => {
    const makeRec = (idx: number, override: Partial<any> = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'dialogue', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
      ...override,
    });
    const voiceInput = (fountain: string, n: number) => ({
      fountain, original: fountain,
      records: Array.from({ length: n }, (_, i) => makeRec(i)) as any,
      structure: {} as any, annotations: [], approvedSpans: [],
    });

    // ── ADVERB_CRUTCH ─────────────────────────────────────────────────────────
    it('voicePass detects ADVERB_CRUTCH when >30% of action lines use -ly adverbs', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      const actions = [
        'He walks slowly to the desk.', 'She turns quickly toward the door.',
        'He speaks softly into the phone.', 'The desk is cluttered.',
        'A lamp burns.', 'The window frames the street.',
        'Papers cover the floor.', 'A clock ticks.',
      ];
      const fountain = `INT. OFFICE - DAY\n\n${actions.join('\n')}\n`;
      const result = await voicePass(voiceInput(fountain, 1));
      const adverb = result.issues.filter(i => i.rule === 'ADVERB_CRUTCH');
      assert.ok(adverb.length >= 1, `Should detect ADVERB_CRUTCH; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(adverb[0].severity === 'minor');
    });

    it('voicePass does NOT fire ADVERB_CRUTCH when action verbs are strong and specific', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      const actions = [
        'He shuffles to the desk.', 'She wheels toward the door.',
        'He murmurs into the phone.', 'The desk is cluttered.',
        'A lamp burns.', 'The window frames the street.',
        'Papers cover the floor.', 'A clock ticks.',
      ];
      const fountain = `INT. OFFICE - DAY\n\n${actions.join('\n')}\n`;
      const result = await voicePass(voiceInput(fountain, 1));
      assert.ok(
        !result.issues.some(i => i.rule === 'ADVERB_CRUTCH'),
        'Should NOT fire when action lines use strong verbs without -ly adverbs',
      );
    });

    // ── FILTER_WORD_OVERLOAD ──────────────────────────────────────────────────
    it('voicePass detects FILTER_WORD_OVERLOAD when >25% of action lines route through perception', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      const actions = [
        'She sees the door swing open.', 'He watches her cross the room.',
        'They notice the smoke curling up.', 'She stares at the photograph.',
        'The rain streaks the glass.', 'A car idles outside.',
        'The kettle steams.', 'Wind rattles the frame.',
        'Dust settles on the sill.', 'The floor creaks.',
      ];
      const fountain = `INT. ROOM - DAY\n\n${actions.join('\n')}\n`;
      const result = await voicePass(voiceInput(fountain, 1));
      const filter = result.issues.filter(i => i.rule === 'FILTER_WORD_OVERLOAD');
      assert.ok(filter.length >= 1, `Should detect FILTER_WORD_OVERLOAD; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(filter[0].severity === 'minor');
    });

    it('voicePass does NOT fire FILTER_WORD_OVERLOAD when images are presented directly', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      const actions = [
        'The door swings open.', 'She crosses the room.',
        'Smoke curls up from the grate.', 'The photograph lies face-down.',
        'The rain streaks the glass.', 'A car idles outside.',
        'The kettle steams.', 'Wind rattles the frame.',
        'Dust settles on the sill.', 'The floor creaks.',
      ];
      const fountain = `INT. ROOM - DAY\n\n${actions.join('\n')}\n`;
      const result = await voicePass(voiceInput(fountain, 1));
      assert.ok(
        !result.issues.some(i => i.rule === 'FILTER_WORD_OVERLOAD'),
        'Should NOT fire when images are presented without perception filters',
      );
    });

    // ── EXCLAMATION_OVERUSE ───────────────────────────────────────────────────
    it('voicePass detects EXCLAMATION_OVERUSE when >35% of dialogue lines shout', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // 10 dialogue lines, 5 with exclamation marks (50% > 35%)
      const lines = [
        'ALICE', 'Get out of here!', 'BOB', 'I will not leave!',
        'ALICE', 'You always do this!', 'BOB', 'Maybe I do.',
        'ALICE', 'That is enough!', 'BOB', 'Fine.',
        'ALICE', 'Listen to me now!', 'BOB', 'I am listening.',
        'ALICE', 'We need a plan.', 'BOB', 'Then make one.',
      ];
      const fountain = `INT. ROOM - DAY\n\n${lines.join('\n')}\n`;
      const result = await voicePass(voiceInput(fountain, 1));
      const excl = result.issues.filter(i => i.rule === 'EXCLAMATION_OVERUSE');
      assert.ok(excl.length >= 1, `Should detect EXCLAMATION_OVERUSE; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(excl[0].severity === 'minor');
    });

    it('voicePass does NOT fire EXCLAMATION_OVERUSE when dialogue uses restrained punctuation', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      const lines = [
        'ALICE', 'Get out of here.', 'BOB', 'I will not leave.',
        'ALICE', 'You always do this.', 'BOB', 'Maybe I do.',
        'ALICE', 'That is enough.', 'BOB', 'Fine.',
        'ALICE', 'Listen to me now!', 'BOB', 'I am listening.',
        'ALICE', 'We need a plan.', 'BOB', 'Then make one.',
      ];
      const fountain = `INT. ROOM - DAY\n\n${lines.join('\n')}\n`;
      const result = await voicePass(voiceInput(fountain, 1));
      assert.ok(
        !result.issues.some(i => i.rule === 'EXCLAMATION_OVERUSE'),
        'Should NOT fire when only a small fraction of dialogue lines use exclamations',
      );
    });
  });


  describe('Wave 193 — voicePass: pronoun opener excess, Act 2 tonal collapse, parenthetical excess', async () => {
    const makeRec = (idx: number, override: Partial<any> = {}): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: 'dialogue', dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
      ...override,
    });
    const voiceInput = (fountain: string, n: number) => ({
      fountain, original: fountain,
      records: Array.from({ length: n }, (_, i) => makeRec(i)) as any,
      structure: {} as any, annotations: [], approvedSpans: [],
    });

    // ── PRONOUN_OPENER_EXCESS ─────────────────────────────────────────────────
    it('voicePass detects PRONOUN_OPENER_EXCESS when >40% of action lines start with He/She/They/It', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // 5 of 10 lines start with a pronoun (50% > 40%)
      const actions = [
        'He opens the door.', 'She crosses to the window.',
        'The rain falls outside.', 'They sit across from each other.',
        'A chair scrapes the floor.', 'It lands on the table.',
        'Dust settles on the sill.', 'She picks up the envelope.',
        'A clock ticks.', 'He stares at the floor.',
      ];
      const fountain = `INT. ROOM - DAY\n\n${actions.join('\n')}\n`;
      const result = await voicePass(voiceInput(fountain, 1));
      const pronoun = result.issues.filter(i => i.rule === 'PRONOUN_OPENER_EXCESS');
      assert.ok(pronoun.length >= 1, `Should detect PRONOUN_OPENER_EXCESS; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(pronoun[0].severity === 'minor');
    });

    it('voicePass does NOT fire PRONOUN_OPENER_EXCESS when sentence openings are varied', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // Only 2 of 10 start with pronouns (20% < 40%)
      const actions = [
        'The door swings open.', 'Light cuts across the floor.',
        'Maria crosses to the window.', 'She pauses.',
        'Rain streaks the glass.', 'A clock ticks on the wall.',
        'The envelope lies on the table.', 'Dust settles on the sill.',
        'He picks it up.', 'Footsteps approach from the hall.',
      ];
      const fountain = `INT. ROOM - DAY\n\n${actions.join('\n')}\n`;
      const result = await voicePass(voiceInput(fountain, 1));
      assert.ok(
        !result.issues.some(i => i.rule === 'PRONOUN_OPENER_EXCESS'),
        'Should NOT fire when action lines open with varied subjects',
      );
    });

    // ── TONAL_REGISTER_COLLAPSE_ACT2 ──────────────────────────────────────────
    it('voicePass detects TONAL_REGISTER_COLLAPSE_ACT2 when all Act 2 scenes share one register', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // act2=[2..5]; all negative; act1=[0,1] positive; act3=[6,7] positive
      const fountain = Array.from({ length: 8 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join('');
      const records = Array.from({ length: 8 }, (_, i) => makeRec(i, {
        emotionalShift: (i >= 2 && i <= 5) ? 'negative' : 'positive',
      }));
      const result = await voicePass({ fountain, original: fountain, records: records as any, structure: {} as any, annotations: [], approvedSpans: [] });
      const collapse = result.issues.filter(i => i.rule === 'TONAL_REGISTER_COLLAPSE_ACT2');
      assert.ok(collapse.length >= 1, `Should detect TONAL_REGISTER_COLLAPSE_ACT2; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(collapse[0].severity === 'minor');
    });

    it('voicePass does NOT fire TONAL_REGISTER_COLLAPSE_ACT2 when Act 2 has tonal variety', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // act2=[2..5]: alternating positive/negative
      const fountain = Array.from({ length: 8 }, (_, i) => `INT. SC${i} - DAY\nA.\n`).join('');
      const records = Array.from({ length: 8 }, (_, i) => makeRec(i, {
        emotionalShift: i % 2 === 0 ? 'positive' : 'negative',
      }));
      const result = await voicePass({ fountain, original: fountain, records: records as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(
        !result.issues.some(i => i.rule === 'TONAL_REGISTER_COLLAPSE_ACT2'),
        'Should NOT fire when Act 2 scenes alternate between different emotional registers',
      );
    });

    // ── PARENTHETICAL_EXCESS ──────────────────────────────────────────────────
    it('voicePass detects PARENTHETICAL_EXCESS when >30% of dialogue cues have parentheticals', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // 10 character cues, 5 with parentheticals (50% > 30%)
      const fountain = `INT. ROOM - DAY

ALICE
(bitterly)
I never said that.

BOB
(suspicious)
Then who did?

ALICE
(quietly)
No one you know.

BOB
Enough.

ALICE
(angry)
Don't walk away.

BOB
Fine.

ALICE
Fine.

BOB
(sighing)
This is pointless.

ALICE
Completely.

BOB
Goodnight.
`;
      const result = await voicePass(voiceInput(fountain, 1));
      const paren = result.issues.filter(i => i.rule === 'PARENTHETICAL_EXCESS');
      assert.ok(paren.length >= 1, `Should detect PARENTHETICAL_EXCESS; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(paren[0].severity === 'minor');
    });

    it('voicePass does NOT fire PARENTHETICAL_EXCESS when parentheticals are rare', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // 10 character cues, 1 parenthetical (10% < 30%)
      const fountain = `INT. ROOM - DAY

ALICE
I never said that.

BOB
Then who did?

ALICE
No one you know.

BOB
Enough.

ALICE
Don't walk away.

BOB
Fine.

ALICE
Fine.

BOB
(sighing)
This is pointless.

ALICE
Completely.

BOB
Goodnight.
`;
      const result = await voicePass(voiceInput(fountain, 1));
      assert.ok(
        !result.issues.some(i => i.rule === 'PARENTHETICAL_EXCESS'),
        'Should NOT fire when parentheticals are used sparingly',
      );
    });
  });


  describe('Wave 224 — voicePass: sentence fragment starvation, scene opener cadence lock, dialogue cadence monoculture', async () => {
    // Builds a fountain with `n` scenes; each scene has one action line per entry in `sceneActionLines`.
    // Character dialogue is added in every scene to give characters lines, but kept minimal to avoid
    // triggering EXCLAMATION_OVERUSE, QUESTION_MARK_OVERLOAD, etc.
    const buildVoiceFountain224 = (sceneData: Array<{ action: string; char?: string; dialogue?: string }>) =>
      sceneData.map((s, i) =>
        `INT. SC${i} - DAY\n${s.action}\n${s.char ? `${s.char}\n${s.dialogue ?? 'A line.'}\n` : ''}`,
      ).join('\n');

    const makeRec224 = (idx: number, overrides: any = {}): any => ({
      sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0, dialogueHighlights: [],
      revelation: null, relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'dialogue', dramaticTurn: 'nothing',
      ...overrides,
    });

    it('voicePass detects SENTENCE_FRAGMENT_STARVATION when no action lines are short declarative fragments', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // 14 action lines, all 6+ words — zero fragments (≤ 4 words)
      const lines224a = [
        'The detective crosses the rain-slicked street carefully.',
        'A figure moves through the shadows of the alley.',
        'She picks up the phone and dials the number slowly.',
        'He opens the briefcase and examines its contents.',
        'The crowd disperses quickly into the evening darkness.',
        'She reads the letter twice before setting it down.',
        'The clock on the wall ticks loudly in the silence.',
        'He adjusts his collar and walks toward the exit door.',
        'A car passes through the intersection without stopping.',
        'She pours another drink and stares out the window.',
        'The rain begins to fall across the empty parking lot.',
        'He closes the folder and slides it across the table.',
        'The camera pans slowly across the abandoned warehouse.',
        'She steps outside into the cold morning air at last.',
      ];
      const fountain224a = `INT. SC0 - DAY\n${lines224a.join('\n')}\n`;
      const records224a = [makeRec224(0)];
      const result224a = await voicePass({
        fountain: fountain224a, original: fountain224a,
        records: records224a as any, structure: {} as any,
        annotations: [null] as any, approvedSpans: [],
      });
      const frag = result224a.issues.filter(i => i.rule === 'SENTENCE_FRAGMENT_STARVATION');
      assert.ok(frag.length >= 1, 'Should detect SENTENCE_FRAGMENT_STARVATION when no action lines are fragments');
      assert.strictEqual(frag[0].severity, 'minor');
    });

    it('voicePass does NOT fire SENTENCE_FRAGMENT_STARVATION when fragment lines exceed the threshold', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // 14 action lines with 2 fragments (≥ 4% threshold satisfied)
      const lines224b = [
        'The detective crosses the rain-slicked street.',
        'Nothing moves.',                                  // fragment ≤ 4 words
        'She picks up the phone and dials slowly.',
        'He opens the briefcase and examines it.',
        'The crowd disperses into the evening dark.',
        'Silence.',                                        // fragment ≤ 4 words
        'The clock ticks loudly in the silence.',
        'He adjusts his collar and approaches.',
        'A car passes through the intersection.',
        'She pours another drink quietly.',
        'The rain begins to fall across the lot.',
        'He closes the folder and slides it over.',
        'The camera pans across the warehouse.',
        'She steps outside into the cold air.',
      ];
      const fountain224b = `INT. SC0 - DAY\n${lines224b.join('\n')}\n`;
      const records224b = [makeRec224(0)];
      const result224b = await voicePass({
        fountain: fountain224b, original: fountain224b,
        records: records224b as any, structure: {} as any,
        annotations: [null] as any, approvedSpans: [],
      });
      const frag = result224b.issues.filter(i => i.rule === 'SENTENCE_FRAGMENT_STARVATION');
      assert.strictEqual(frag.length, 0, 'Should NOT fire when enough fragment lines are present');
    });

    it('voicePass detects SCENE_OPENER_CADENCE_LOCK when all scenes open with an article', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // 10 scenes, each first action line starts with "The ..." (>60% article openers)
      const sceneData224c = Array.from({ length: 10 }, (_, i) => ({
        action: `The ${['room fills with smoke', 'door swings open', 'phone rings again', 'window reflects moonlight', 'hallway stretches ahead', 'camera pans slowly', 'crowd surges forward', 'light flickers once', 'figure turns around', 'silence returns now'][i]}.`,
      }));
      const fountain224c = sceneData224c.map((s, i) => `INT. SC${i} - DAY\n${s.action}\n`).join('\n');
      const records224c = Array.from({ length: 10 }, (_, i) => makeRec224(i));
      const result224c = await voicePass({
        fountain: fountain224c, original: fountain224c,
        records: records224c as any, structure: {} as any,
        annotations: records224c.map(() => null) as any, approvedSpans: [],
      });
      const openerLock = result224c.issues.filter(i => i.rule === 'SCENE_OPENER_CADENCE_LOCK');
      assert.ok(openerLock.length >= 1, 'Should detect SCENE_OPENER_CADENCE_LOCK when all scenes open with articles');
      assert.strictEqual(openerLock[0].severity, 'minor');
    });

    it('voicePass does NOT fire SCENE_OPENER_CADENCE_LOCK when scene openers are varied', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // 10 scenes, mixed openers: articles, verbs, names, pronouns
      const openers224d = [
        'The room fills with smoke.',
        'Rain hammers the window.',
        'ALICE drops her bag.',
        'Darkness swallows everything.',
        'The phone rings once.',
        'Footsteps echo down the hall.',
        'She turns to face him.',
        'Wind rattles the shutters.',
        'A figure moves in the shadows.',
        'Silence returns at last.',
      ];
      const fountain224d = openers224d.map((a, i) => `INT. SC${i} - DAY\n${a}\n`).join('\n');
      const records224d = Array.from({ length: 10 }, (_, i) => makeRec224(i));
      const result224d = await voicePass({
        fountain: fountain224d, original: fountain224d,
        records: records224d as any, structure: {} as any,
        annotations: records224d.map(() => null) as any, approvedSpans: [],
      });
      const openerLock = result224d.issues.filter(i => i.rule === 'SCENE_OPENER_CADENCE_LOCK');
      assert.strictEqual(openerLock.length, 0, 'Should NOT fire when scene openers vary in syntactic type');
    });

    it('voicePass detects DIALOGUE_CADENCE_MONOCULTURE when all major characters speak at the same cadence', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // 3 characters, each with ~8-word lines — means: ~7.8, ~8.0, ~8.2 → range ≤ 2.5, center ~8
      // Use 12 lines per character, each exactly 8 words, with 12+ unique vocab words per character
      const aliceLines224e = [
        'I walked across the bridge last Tuesday morning.',   // 8
        'The meeting felt strange but nobody spoke aloud.',   // 8
        'Perhaps we should consider leaving before nightfall.',// 7 - close enough
        'She handed over the documents without looking back.', // 8
        'Every decision carries weight you cannot anticipate.', // 8
        'I understand the risk but we have no choice.',       // 9 - slight variance
        'The garden looked different under afternoon light.',  // 8 - wait, 7 words
        'Trust nobody until they have proven themselves worthy.', // 8
        'I packed my things and moved before the dawn.',      // 9
        'The answer arrived three days later by post.',       // 8
        'We agreed to meet at the fountain near noon.',       // 9
        'I still believe the outcome could have changed things.',// 9
      ];
      const bobLines224e = [
        'That plan sounds risky but I will consider it.',    // 9
        'Nobody told me about the meeting until today.',     // 8
        'I checked the records twice and found nothing odd.',// 9
        'Her explanation made sense given what happened.',   // 7
        'I stayed late reviewing documents from the archive.',// 8
        'The problem appears deeper than anyone first thought.',// 8
        'I asked twice but received no clear answer.',       // 8
        'We should report this finding before the review.',  // 8
        'The analysis revealed patterns nobody had noticed.',// 7
        'I confirmed the data matches all our prior records.',// 9
        'Nobody from the committee responded to my letter.', // 8
        'I remain convinced this decision will prove costly.',// 8
      ];
      const carolLines224e = [
        'I believe the situation requires immediate attention.',// 8
        'The report contains errors nobody has corrected.',  // 8
        'I worked through the night reviewing every detail.', // 8
        'That approach ignores the context we established.', // 8
        'I read the transcript and found several mistakes.',  // 8
        'The evidence points toward a different conclusion.', // 8
        'I checked every source before filing this report.', // 8
        'Our assumptions were flawed from the very beginning.',// 8
        'I cannot accept that answer without further proof.', // 8
        'The committee overlooked several critical findings.', // 8
        'I raised this concern three times without response.', // 8
        'The outcome confirms what I suspected from the start.',// 9
      ];
      // Build fountain with full character blocks for ALICE, BOB, CAROL
      const buildCharBlock = (name: string, lines: string[]) =>
        lines.map(l => `${name}\n${l}\n`).join('\n');
      const fountain224e = `INT. SC0 - DAY\nAn office.\n${buildCharBlock('ALICE', aliceLines224e)}\n` +
        `INT. SC1 - DAY\nA hallway.\n${buildCharBlock('BOB', bobLines224e)}\n` +
        `INT. SC2 - DAY\nA boardroom.\n${buildCharBlock('CAROL', carolLines224e)}\n`;
      const records224e = [makeRec224(0), makeRec224(1), makeRec224(2)];
      const result224e = await voicePass({
        fountain: fountain224e, original: fountain224e,
        records: records224e as any, structure: {} as any,
        annotations: records224e.map(() => null) as any, approvedSpans: [],
      });
      const monoculture = result224e.issues.filter(i => i.rule === 'DIALOGUE_CADENCE_MONOCULTURE');
      assert.ok(monoculture.length >= 1, 'Should detect DIALOGUE_CADENCE_MONOCULTURE when all major characters have identical cadence');
      assert.strictEqual(monoculture[0].severity, 'minor');
    });

    it('voicePass does NOT fire DIALOGUE_CADENCE_MONOCULTURE when characters have distinct cadence ranges', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // ALICE: short punchy ~3-word lines; BOB: long rambling ~14-word lines; CAROL: medium ~8
      // range = 14 - 3 = 11 > 2.5 → should NOT fire
      const buildCharBlock2 = (name: string, lines: string[]) =>
        lines.map(l => `${name}\n${l}\n`).join('\n');
      const aliceShort = Array.from({ length: 12 }, (_, i) =>
        ['Wrong.', 'Get out.', 'Not now.', 'Stop it.', 'Tell me.', 'Trust nobody.', 'Run now.', 'Wait here.', 'Leave fast.', 'Forget this.', 'No chance.', 'Move along.'][i],
      );
      const bobLong = Array.from({ length: 12 }, (_, i) =>
        [
          'I have been reviewing these documents for the past three weeks and I find the results deeply troubling.',
          'The situation as I understand it requires a more thorough examination before we can draw any firm conclusions.',
          'We should consider every possible angle here before making a decision that could affect all of us permanently.',
          'The evidence I have gathered suggests a pattern of behavior that goes back much further than anyone suspected.',
          'I think the most important thing right now is to maintain our composure and proceed with extreme caution here.',
          'Every piece of information we have received so far points toward a conclusion that nobody wants to acknowledge.',
          'We need to take the time to understand exactly what happened before we rush into any kind of response.',
          'The analysis I conducted over the weekend revealed several inconsistencies that I believe warrant further investigation.',
          'I want everyone in this room to understand that the stakes here are higher than they may initially appear.',
          'Before we make any final decisions I think we owe it to ourselves to consider all available alternatives carefully.',
          'The report contains numerous errors and omissions that suggest whoever wrote it was not fully informed of the facts.',
          'I have spoken to several witnesses and their accounts differ significantly from the official version of these events.',
        ][i],
      );
      const carolMed = Array.from({ length: 12 }, (_, i) =>
        ['I reviewed the records and found several problems worth addressing carefully.',
          'The timeline does not match what we were told by the original investigators.',
          'I believe we need more information before drawing any firm conclusions here.',
          'The evidence suggests something happened that nobody has fully explained yet.',
          'I want to understand the full context before making any recommendation.',
          'We should proceed carefully and document every step of this investigation.',
          'I checked the dates and they confirm the sequence we discussed earlier.',
          'The discrepancy is significant enough to warrant a more thorough review.',
          'I raised this issue three weeks ago and received no satisfactory response.',
          'The pattern I see here is consistent with what we found in the prior case.',
          'I would like more time to review these materials before the next meeting.',
          'The conclusion seems premature given how much we still do not understand.',
        ][i],
      );
      const fountain224f = `INT. SC0 - DAY\nAn office.\n${buildCharBlock2('ALICE', aliceShort)}\n` +
        `INT. SC1 - DAY\nA hallway.\n${buildCharBlock2('BOB', bobLong)}\n` +
        `INT. SC2 - DAY\nA boardroom.\n${buildCharBlock2('CAROL', carolMed)}\n`;
      const records224f = [makeRec224(0), makeRec224(1), makeRec224(2)];
      const result224f = await voicePass({
        fountain: fountain224f, original: fountain224f,
        records: records224f as any, structure: {} as any,
        annotations: records224f.map(() => null) as any, approvedSpans: [],
      });
      const monoculture = result224f.issues.filter(i => i.rule === 'DIALOGUE_CADENCE_MONOCULTURE');
      assert.strictEqual(monoculture.length, 0, 'Should NOT fire when characters have clearly distinct cadence ranges');
    });
  });


  describe('Wave 308 — voicePass: dialogue length uniformity, dash interruption flood, shout caps', async () => {
    const runV308 = async (fountain: string) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DIALOGUE_LENGTH_UNIFORMITY fires when >70% of dialogue lines share a length band', async () => {
      // 12 dialogue lines all 4 words long
      const fountain308lu = `INT. ROOM - DAY

ALICE
We should leave now.

BOB
I am not leaving.

ALICE
You have no choice.

BOB
There is always choice.

ALICE
Not this time around.

BOB
We can still try.

ALICE
It is too late.

BOB
Nothing is ever late.

ALICE
You never understood me.

BOB
I understood too well.

ALICE
Then you should leave.

BOB
Maybe I will then.`;
      const res = await runV308(fountain308lu);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_LENGTH_UNIFORMITY'), 'DIALOGUE_LENGTH_UNIFORMITY should fire');
    });

    it('DIALOGUE_LENGTH_UNIFORMITY does not fire when speech lengths vary widely', async () => {
      const fountain308nlu = `INT. ROOM - DAY

ALICE
No.

BOB
I have been thinking about everything you said to me last night and I cannot stop turning it over.

ALICE
Why.

BOB
Because it matters more than you could possibly know right now.

ALICE
Stop.

BOB
You always do this, you shut down the second a conversation gets anywhere near the truth of things.

ALICE
That is not fair and you know it.

BOB
Fair.

ALICE
I am leaving now before one of us says something we cannot take back ever again.

BOB
Fine.

BOB
Go then, walk out like you always do when it gets hard.`;
      const res = await runV308(fountain308nlu);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_LENGTH_UNIFORMITY'), 'DIALOGUE_LENGTH_UNIFORMITY should not fire');
    });

    it('DIALOGUE_DASH_INTERRUPTION_FLOOD fires when >30% of dialogue lines contain a dash', async () => {
      const fountain308df = `INT. ROOM - DAY

ALICE
I just wanted to—

BOB
Don't—don't say it.

ALICE
But you have to listen—

BOB
I already know what—

ALICE
You never let me finish a—

BOB
Fine.

ALICE
Thank you.

BOB
Go on then.

ALICE
It does not matter now.

BOB
It clearly does.`;
      const res = await runV308(fountain308df);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_DASH_INTERRUPTION_FLOOD'), 'DIALOGUE_DASH_INTERRUPTION_FLOOD should fire');
    });

    it('DIALOGUE_DASH_INTERRUPTION_FLOOD does not fire when dashes are sparse', async () => {
      const fountain308ndf = `INT. ROOM - DAY

ALICE
I just wanted to talk.

BOB
Then talk to me.

ALICE
But you have to listen first.

BOB
I am listening now.

ALICE
You never let me finish anything.

BOB
That is not true at all.

ALICE
Thank you for nothing.

BOB
Go on then, say it.

ALICE
It does not matter now—

BOB
It clearly does to you.`;
      const res = await runV308(fountain308ndf);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_DASH_INTERRUPTION_FLOOD'), 'DIALOGUE_DASH_INTERRUPTION_FLOOD should not fire');
    });

    it('DIALOGUE_SHOUT_CAPS fires when 3+ dialogue lines contain a shouted caps word', async () => {
      const fountain308sc = `INT. ROOM - DAY

ALICE
Get OUT of here right now.

BOB
I said STOP doing that.

ALICE
You NEVER listen to me.

BOB
Fine, I am leaving.

ALICE
Good riddance to you.`;
      const res = await runV308(fountain308sc);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_SHOUT_CAPS'), 'DIALOGUE_SHOUT_CAPS should fire');
    });

    it('DIALOGUE_SHOUT_CAPS does not fire when dialogue avoids caps shouting', async () => {
      const fountain308nsc = `INT. ROOM - DAY

ALICE
Get out of here right now.

BOB
I said stop doing that.

ALICE
You never listen to me.

BOB
Fine, I am leaving.

ALICE
Good riddance to you.`;
      const res = await runV308(fountain308nsc);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_SHOUT_CAPS'), 'DIALOGUE_SHOUT_CAPS should not fire');
    });
  });


  describe('Wave 739 — voicePass: voice open thread zone cluster, voice highlight zone cluster, voice relationship drought run', async () => {
    const runV739 = async (records: ScreenplaySceneRecord[]) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // VOICE_OPEN_THREAD_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; open-thread scenes at 0,1,2 → 100% opening third
    it('VOICE_OPEN_THREAD_ZONE_CLUSTER fires when >75% of open-thread scenes cluster in one third', async () => {
      const recs739a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs739a[0] = makeSharedRecord(0, { unresolvedClues: ['clue-a'] });
      recs739a[1] = makeSharedRecord(1, { unresolvedClues: ['clue-b'] });
      recs739a[2] = makeSharedRecord(2, { unresolvedClues: ['clue-c'] });
      const res = await runV739(recs739a);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_OPEN_THREAD_ZONE_CLUSTER'), 'VOICE_OPEN_THREAD_ZONE_CLUSTER should fire');
    });

    // VOICE_OPEN_THREAD_ZONE_CLUSTER no-fire:
    // open-thread scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('VOICE_OPEN_THREAD_ZONE_CLUSTER does not fire when open-thread scenes are distributed across thirds', async () => {
      const recs739an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs739an[0] = makeSharedRecord(0, { unresolvedClues: ['clue-a'] });
      recs739an[4] = makeSharedRecord(4, { unresolvedClues: ['clue-b'] });
      recs739an[7] = makeSharedRecord(7, { unresolvedClues: ['clue-c'] });
      const res = await runV739(recs739an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_OPEN_THREAD_ZONE_CLUSTER'), 'VOICE_OPEN_THREAD_ZONE_CLUSTER should not fire');
    });

    // VOICE_HIGHLIGHT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; highlighted-dialogue scenes at 0,1,2 → 100% opening third
    it('VOICE_HIGHLIGHT_ZONE_CLUSTER fires when >75% of highlighted-dialogue scenes cluster in one third', async () => {
      const recs739b = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs739b[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs739b[1] = makeSharedRecord(1, { dialogueHighlights: ['line-b'] });
      recs739b[2] = makeSharedRecord(2, { dialogueHighlights: ['line-c'] });
      const res = await runV739(recs739b);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_HIGHLIGHT_ZONE_CLUSTER'), 'VOICE_HIGHLIGHT_ZONE_CLUSTER should fire');
    });

    // VOICE_HIGHLIGHT_ZONE_CLUSTER no-fire:
    // highlighted-dialogue scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('VOICE_HIGHLIGHT_ZONE_CLUSTER does not fire when highlighted dialogue is distributed across thirds', async () => {
      const recs739bn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs739bn[0] = makeSharedRecord(0, { dialogueHighlights: ['line-a'] });
      recs739bn[4] = makeSharedRecord(4, { dialogueHighlights: ['line-b'] });
      recs739bn[7] = makeSharedRecord(7, { dialogueHighlights: ['line-c'] });
      const res = await runV739(recs739bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_HIGHLIGHT_ZONE_CLUSTER'), 'VOICE_HIGHLIGHT_ZONE_CLUSTER should not fire');
    });

    // VOICE_RELATIONSHIP_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 carry a relationship shift (>=3 present overall); scenes 3-9 (7 scenes) have none
    it('VOICE_RELATIONSHIP_DROUGHT_RUN fires when the longest no-relationship-shift run reaches 6', async () => {
      const recs739c = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs739c[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      recs739c[1] = makeSharedRecord(1, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      recs739c[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      const res = await runV739(recs739c);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_RELATIONSHIP_DROUGHT_RUN'), 'VOICE_RELATIONSHIP_DROUGHT_RUN should fire');
    });

    // VOICE_RELATIONSHIP_DROUGHT_RUN no-fire:
    // relationship-shift scenes spread out so no gap reaches 6 consecutive scenes
    it('VOICE_RELATIONSHIP_DROUGHT_RUN does not fire when relationship shifts are spread through the story', async () => {
      const recs739cn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs739cn[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      recs739cn[3] = makeSharedRecord(3, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      recs739cn[6] = makeSharedRecord(6, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      recs739cn[9] = makeSharedRecord(9, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      const res = await runV739(recs739cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_RELATIONSHIP_DROUGHT_RUN'), 'VOICE_RELATIONSHIP_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 725 — voicePass: voice highlight drought run, voice relationship peak uncaused, voice open thread drought run', async () => {
    const runV725 = async (records: ScreenplaySceneRecord[]) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // VOICE_HIGHLIGHT_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 carry highlighted dialogue (>=3 present overall); scenes 3-9 (7 scenes) have none
    it('VOICE_HIGHLIGHT_DROUGHT_RUN fires when the longest no-highlighted-dialogue run reaches 6', async () => {
      const recs725a = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs725a[0] = makeSharedRecord(0, { dialogueHighlights: ['line a'] });
      recs725a[1] = makeSharedRecord(1, { dialogueHighlights: ['line b'] });
      recs725a[2] = makeSharedRecord(2, { dialogueHighlights: ['line c'] });
      const res = await runV725(recs725a);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_HIGHLIGHT_DROUGHT_RUN'), 'VOICE_HIGHLIGHT_DROUGHT_RUN should fire');
    });

    // VOICE_HIGHLIGHT_DROUGHT_RUN no-fire:
    // highlighted-dialogue scenes spread out so no gap reaches 6 consecutive scenes
    it('VOICE_HIGHLIGHT_DROUGHT_RUN does not fire when highlighted dialogue is spread through the story', async () => {
      const recs725an = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs725an[0] = makeSharedRecord(0, { dialogueHighlights: ['line a'] });
      recs725an[3] = makeSharedRecord(3, { dialogueHighlights: ['line b'] });
      recs725an[6] = makeSharedRecord(6, { dialogueHighlights: ['line c'] });
      recs725an[9] = makeSharedRecord(9, { dialogueHighlights: ['line d'] });
      const res = await runV725(recs725an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_HIGHLIGHT_DROUGHT_RUN'), 'VOICE_HIGHLIGHT_DROUGHT_RUN should not fire');
    });

    // VOICE_RELATIONSHIP_PEAK_UNCAUSED fire:
    // 8 scenes; relationship shifts at 2 (1 shift) and 6 (5 shifts, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('VOICE_RELATIONSHIP_PEAK_UNCAUSED fires when the peak relationship-shift scene has no dramatic turn or revelation nearby', async () => {
      const recs725b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs725b[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      recs725b[6] = makeSharedRecord(6, {
        relationshipShifts: [
          { pairKey: 'a|b', dimension: 'trust', amount: 1 },
          { pairKey: 'a|c', dimension: 'trust', amount: 1 },
          { pairKey: 'a|d', dimension: 'trust', amount: 1 },
          { pairKey: 'a|e', dimension: 'trust', amount: 1 },
          { pairKey: 'a|f', dimension: 'trust', amount: 1 },
        ],
      });
      const res = await runV725(recs725b);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_RELATIONSHIP_PEAK_UNCAUSED'), 'VOICE_RELATIONSHIP_PEAK_UNCAUSED should fire');
    });

    // VOICE_RELATIONSHIP_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('VOICE_RELATIONSHIP_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs725bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs725bn[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 1 }] });
      recs725bn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs725bn[6] = makeSharedRecord(6, {
        relationshipShifts: [
          { pairKey: 'a|b', dimension: 'trust', amount: 1 },
          { pairKey: 'a|c', dimension: 'trust', amount: 1 },
          { pairKey: 'a|d', dimension: 'trust', amount: 1 },
          { pairKey: 'a|e', dimension: 'trust', amount: 1 },
          { pairKey: 'a|f', dimension: 'trust', amount: 1 },
        ],
      });
      const res = await runV725(recs725bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_RELATIONSHIP_PEAK_UNCAUSED'), 'VOICE_RELATIONSHIP_PEAK_UNCAUSED should not fire');
    });

    // VOICE_OPEN_THREAD_DROUGHT_RUN fire:
    // n=10; scenes 0,1,2 carry unresolved clues (>=3 present overall); scenes 3-9 (7 scenes) have none
    it('VOICE_OPEN_THREAD_DROUGHT_RUN fires when the longest no-outstanding-clue run reaches 6', async () => {
      const recs725c = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs725c[0] = makeSharedRecord(0, { unresolvedClues: ['clue a'] });
      recs725c[1] = makeSharedRecord(1, { unresolvedClues: ['clue b'] });
      recs725c[2] = makeSharedRecord(2, { unresolvedClues: ['clue c'] });
      const res = await runV725(recs725c);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_OPEN_THREAD_DROUGHT_RUN'), 'VOICE_OPEN_THREAD_DROUGHT_RUN should fire');
    });

    // VOICE_OPEN_THREAD_DROUGHT_RUN no-fire:
    // unresolved-clue scenes spread out so no gap reaches 6 consecutive scenes
    it('VOICE_OPEN_THREAD_DROUGHT_RUN does not fire when open threads are spread through the story', async () => {
      const recs725cn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs725cn[0] = makeSharedRecord(0, { unresolvedClues: ['clue a'] });
      recs725cn[3] = makeSharedRecord(3, { unresolvedClues: ['clue b'] });
      recs725cn[6] = makeSharedRecord(6, { unresolvedClues: ['clue c'] });
      recs725cn[9] = makeSharedRecord(9, { unresolvedClues: ['clue d'] });
      const res = await runV725(recs725cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_OPEN_THREAD_DROUGHT_RUN'), 'VOICE_OPEN_THREAD_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 711 — voicePass: voice staging zone cluster, voice seed peak uncaused, voice payoff zone cluster', async () => {
    const runV711 = async (records: ScreenplaySceneRecord[]) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // VOICE_STAGING_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; visually dense scenes at 0,1,2 → 100% opening third
    it('VOICE_STAGING_ZONE_CLUSTER fires when >75% of visually dense scenes cluster in one third', async () => {
      const recs711a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs711a[0] = makeSharedRecord(0, { visualBeats: ['a', 'b'] });
      recs711a[1] = makeSharedRecord(1, { visualBeats: ['a', 'b'] });
      recs711a[2] = makeSharedRecord(2, { visualBeats: ['a', 'b'] });
      const res = await runV711(recs711a);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_STAGING_ZONE_CLUSTER'), 'VOICE_STAGING_ZONE_CLUSTER should fire');
    });

    // VOICE_STAGING_ZONE_CLUSTER no-fire:
    // visually dense scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('VOICE_STAGING_ZONE_CLUSTER does not fire when visually dense scenes are distributed across thirds', async () => {
      const recs711an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs711an[0] = makeSharedRecord(0, { visualBeats: ['a', 'b'] });
      recs711an[4] = makeSharedRecord(4, { visualBeats: ['a', 'b'] });
      recs711an[7] = makeSharedRecord(7, { visualBeats: ['a', 'b'] });
      const res = await runV711(recs711an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_STAGING_ZONE_CLUSTER'), 'VOICE_STAGING_ZONE_CLUSTER should not fire');
    });

    // VOICE_SEED_PEAK_UNCAUSED fire:
    // 8 scenes; seeds at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('VOICE_SEED_PEAK_UNCAUSED fires when the peak seed scene has no dramatic turn or revelation nearby', async () => {
      const recs711b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs711b[2] = makeSharedRecord(2, { seededClueIds: ['clue-a'] });
      recs711b[6] = makeSharedRecord(6, { seededClueIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runV711(recs711b);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_SEED_PEAK_UNCAUSED'), 'VOICE_SEED_PEAK_UNCAUSED should fire');
    });

    // VOICE_SEED_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('VOICE_SEED_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs711bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs711bn[2] = makeSharedRecord(2, { seededClueIds: ['clue-a'] });
      recs711bn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs711bn[6] = makeSharedRecord(6, { seededClueIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runV711(recs711bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_SEED_PEAK_UNCAUSED'), 'VOICE_SEED_PEAK_UNCAUSED should not fire');
    });

    // VOICE_PAYOFF_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; payoff scenes at 0,1,2 → 100% opening third
    it('VOICE_PAYOFF_ZONE_CLUSTER fires when >75% of payoff scenes cluster in one third', async () => {
      const recs711c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs711c[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs711c[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs711c[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-c'] });
      const res = await runV711(recs711c);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_PAYOFF_ZONE_CLUSTER'), 'VOICE_PAYOFF_ZONE_CLUSTER should fire');
    });

    // VOICE_PAYOFF_ZONE_CLUSTER no-fire:
    // payoff scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('VOICE_PAYOFF_ZONE_CLUSTER does not fire when payoff scenes are distributed across thirds', async () => {
      const recs711cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs711cn[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs711cn[4] = makeSharedRecord(4, { payoffSetupIds: ['thread-b'] });
      recs711cn[7] = makeSharedRecord(7, { payoffSetupIds: ['thread-c'] });
      const res = await runV711(recs711cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_PAYOFF_ZONE_CLUSTER'), 'VOICE_PAYOFF_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 697 — voicePass: voice seed zone cluster, voice payoff peak uncaused, voice staging drought run', async () => {
    const runV697 = async (records: ScreenplaySceneRecord[]) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // VOICE_SEED_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; seed scenes at 0,1,2 → 100% opening third
    it('VOICE_SEED_ZONE_CLUSTER fires when >75% of seed scenes cluster in one third', async () => {
      const recs697a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs697a[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs697a[1] = makeSharedRecord(1, { seededClueIds: ['clue-b'] });
      recs697a[2] = makeSharedRecord(2, { seededClueIds: ['clue-c'] });
      const res = await runV697(recs697a);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_SEED_ZONE_CLUSTER'), 'VOICE_SEED_ZONE_CLUSTER should fire');
    });

    // VOICE_SEED_ZONE_CLUSTER no-fire:
    // seed scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('VOICE_SEED_ZONE_CLUSTER does not fire when seed scenes are distributed across thirds', async () => {
      const recs697an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs697an[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs697an[4] = makeSharedRecord(4, { seededClueIds: ['clue-b'] });
      recs697an[7] = makeSharedRecord(7, { seededClueIds: ['clue-c'] });
      const res = await runV697(recs697an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_SEED_ZONE_CLUSTER'), 'VOICE_SEED_ZONE_CLUSTER should not fire');
    });

    // VOICE_PAYOFF_PEAK_UNCAUSED fire:
    // 8 scenes; payoffs at 2 (1) and 6 (5, the peak); no dramaticTurn or revelation at 6, 5, or 4
    it('VOICE_PAYOFF_PEAK_UNCAUSED fires when the peak payoff scene has no dramatic turn or revelation nearby', async () => {
      const recs697b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs697b[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-a'] });
      recs697b[6] = makeSharedRecord(6, { payoffSetupIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runV697(recs697b);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_PAYOFF_PEAK_UNCAUSED'), 'VOICE_PAYOFF_PEAK_UNCAUSED should fire');
    });

    // VOICE_PAYOFF_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('VOICE_PAYOFF_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs697bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs697bn[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-a'] });
      recs697bn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs697bn[6] = makeSharedRecord(6, { payoffSetupIds: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runV697(recs697bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_PAYOFF_PEAK_UNCAUSED'), 'VOICE_PAYOFF_PEAK_UNCAUSED should not fire');
    });

    // VOICE_STAGING_DROUGHT_RUN fire:
    // 10 scenes; visual beats at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('VOICE_STAGING_DROUGHT_RUN fires when the longest no-visual-beat run is ≥6', async () => {
      const recs697c = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs697c[0] = makeSharedRecord(0, { visualBeats: ['a beat'] });
      recs697c[1] = makeSharedRecord(1, { visualBeats: ['a beat'] });
      recs697c[2] = makeSharedRecord(2, { visualBeats: ['a beat'] });
      recs697c[9] = makeSharedRecord(9, { visualBeats: ['a beat'] });
      const res = await runV697(recs697c);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_STAGING_DROUGHT_RUN'), 'VOICE_STAGING_DROUGHT_RUN should fire');
    });

    // VOICE_STAGING_DROUGHT_RUN no-fire:
    // visual beats at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('VOICE_STAGING_DROUGHT_RUN does not fire when visual beats are distributed without a long drought', async () => {
      const recs697cn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs697cn[0] = makeSharedRecord(0, { visualBeats: ['a beat'] });
      recs697cn[4] = makeSharedRecord(4, { visualBeats: ['a beat'] });
      recs697cn[9] = makeSharedRecord(9, { visualBeats: ['a beat'] });
      const res = await runV697(recs697cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_STAGING_DROUGHT_RUN'), 'VOICE_STAGING_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 683 — voicePass: voice open thread peak uncaused, voice curiosity drought run, voice suspense zone cluster', async () => {
    const runV683 = async (records: ScreenplaySceneRecord[]) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // VOICE_OPEN_THREAD_PEAK_UNCAUSED fire:
    // 8 scenes; open threads at 2 (1 clue) and 6 (5 clues, the peak); no dramaticTurn or revelation
    // at 6, 5, or 4
    it('VOICE_OPEN_THREAD_PEAK_UNCAUSED fires when the peak open-thread scene has no dramatic turn or revelation nearby', async () => {
      const recs683a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs683a[2] = makeSharedRecord(2, { unresolvedClues: ['a'] });
      recs683a[6] = makeSharedRecord(6, { unresolvedClues: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runV683(recs683a);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_OPEN_THREAD_PEAK_UNCAUSED'), 'VOICE_OPEN_THREAD_PEAK_UNCAUSED should fire');
    });

    // VOICE_OPEN_THREAD_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('VOICE_OPEN_THREAD_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs683an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs683an[2] = makeSharedRecord(2, { unresolvedClues: ['a'] });
      recs683an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs683an[6] = makeSharedRecord(6, { unresolvedClues: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runV683(recs683an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_OPEN_THREAD_PEAK_UNCAUSED'), 'VOICE_OPEN_THREAD_PEAK_UNCAUSED should not fire');
    });

    // VOICE_CURIOSITY_DROUGHT_RUN fire:
    // 10 scenes; curiosity spikes at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('VOICE_CURIOSITY_DROUGHT_RUN fires when the longest no-curiosity-spike run is ≥6', async () => {
      const recs683b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs683b[0] = makeSharedRecord(0, { curiosityDelta: 2 });
      recs683b[1] = makeSharedRecord(1, { curiosityDelta: 1 });
      recs683b[2] = makeSharedRecord(2, { curiosityDelta: 1 });
      recs683b[9] = makeSharedRecord(9, { curiosityDelta: 2 });
      const res = await runV683(recs683b);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_CURIOSITY_DROUGHT_RUN'), 'VOICE_CURIOSITY_DROUGHT_RUN should fire');
    });

    // VOICE_CURIOSITY_DROUGHT_RUN no-fire:
    // curiosity spikes at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('VOICE_CURIOSITY_DROUGHT_RUN does not fire when curiosity spikes are distributed without a long drought', async () => {
      const recs683bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs683bn[0] = makeSharedRecord(0, { curiosityDelta: 2 });
      recs683bn[4] = makeSharedRecord(4, { curiosityDelta: 1 });
      recs683bn[9] = makeSharedRecord(9, { curiosityDelta: 2 });
      const res = await runV683(recs683bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_CURIOSITY_DROUGHT_RUN'), 'VOICE_CURIOSITY_DROUGHT_RUN should not fire');
    });

    // VOICE_SUSPENSE_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; rising-suspense scenes at 0,1,2 → 100% opening third
    it('VOICE_SUSPENSE_ZONE_CLUSTER fires when >75% of rising-suspense scenes cluster in one third', async () => {
      const recs683c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs683c[0] = makeSharedRecord(0, { suspenseDelta: 2 });
      recs683c[1] = makeSharedRecord(1, { suspenseDelta: 1 });
      recs683c[2] = makeSharedRecord(2, { suspenseDelta: 3 });
      const res = await runV683(recs683c);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_SUSPENSE_ZONE_CLUSTER'), 'VOICE_SUSPENSE_ZONE_CLUSTER should fire');
    });

    // VOICE_SUSPENSE_ZONE_CLUSTER no-fire:
    // rising-suspense scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('VOICE_SUSPENSE_ZONE_CLUSTER does not fire when rising-suspense scenes are distributed across thirds', async () => {
      const recs683cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs683cn[0] = makeSharedRecord(0, { suspenseDelta: 2 });
      recs683cn[4] = makeSharedRecord(4, { suspenseDelta: 1 });
      recs683cn[7] = makeSharedRecord(7, { suspenseDelta: 3 });
      const res = await runV683(recs683cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_SUSPENSE_ZONE_CLUSTER'), 'VOICE_SUSPENSE_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 669 — voicePass: voice highlight peak uncaused, voice payoff drought run, voice relationship zone cluster', async () => {
    const runV669 = async (records: ScreenplaySceneRecord[]) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // VOICE_HIGHLIGHT_PEAK_UNCAUSED fire:
    // 8 scenes; highlights at 2 (1 line) and 6 (5 lines, the peak); no dramaticTurn or revelation
    // at 6, 5, or 4
    it('VOICE_HIGHLIGHT_PEAK_UNCAUSED fires when the peak highlighted-dialogue scene has no dramatic turn or revelation nearby', async () => {
      const recs669a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs669a[2] = makeSharedRecord(2, { dialogueHighlights: ['line-a'] });
      recs669a[6] = makeSharedRecord(6, { dialogueHighlights: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runV669(recs669a);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_HIGHLIGHT_PEAK_UNCAUSED'), 'VOICE_HIGHLIGHT_PEAK_UNCAUSED should fire');
    });

    // VOICE_HIGHLIGHT_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('VOICE_HIGHLIGHT_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs669an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs669an[2] = makeSharedRecord(2, { dialogueHighlights: ['line-a'] });
      recs669an[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs669an[6] = makeSharedRecord(6, { dialogueHighlights: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runV669(recs669an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_HIGHLIGHT_PEAK_UNCAUSED'), 'VOICE_HIGHLIGHT_PEAK_UNCAUSED should not fire');
    });

    // VOICE_PAYOFF_DROUGHT_RUN fire:
    // 10 scenes; payoffs at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('VOICE_PAYOFF_DROUGHT_RUN fires when the longest no-payoff run is ≥6', async () => {
      const recs669b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs669b[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs669b[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs669b[2] = makeSharedRecord(2, { payoffSetupIds: ['thread-c'] });
      recs669b[9] = makeSharedRecord(9, { payoffSetupIds: ['thread-d'] });
      const res = await runV669(recs669b);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_PAYOFF_DROUGHT_RUN'), 'VOICE_PAYOFF_DROUGHT_RUN should fire');
    });

    // VOICE_PAYOFF_DROUGHT_RUN no-fire:
    // payoffs at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('VOICE_PAYOFF_DROUGHT_RUN does not fire when payoffs are distributed without a long drought', async () => {
      const recs669bn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs669bn[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs669bn[4] = makeSharedRecord(4, { payoffSetupIds: ['thread-b'] });
      recs669bn[9] = makeSharedRecord(9, { payoffSetupIds: ['thread-c'] });
      const res = await runV669(recs669bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_PAYOFF_DROUGHT_RUN'), 'VOICE_PAYOFF_DROUGHT_RUN should not fire');
    });

    // VOICE_RELATIONSHIP_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; relationship-shift scenes at 0,1,2 → 100% opening third
    it('VOICE_RELATIONSHIP_ZONE_CLUSTER fires when >75% of relationship-shift scenes cluster in one third', async () => {
      const recs669c = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs669c[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs669c[1] = makeSharedRecord(1, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs669c[2] = makeSharedRecord(2, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      const res = await runV669(recs669c);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_RELATIONSHIP_ZONE_CLUSTER'), 'VOICE_RELATIONSHIP_ZONE_CLUSTER should fire');
    });

    // VOICE_RELATIONSHIP_ZONE_CLUSTER no-fire:
    // relationship-shift scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('VOICE_RELATIONSHIP_ZONE_CLUSTER does not fire when relationship-shift scenes are distributed across thirds', async () => {
      const recs669cn = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs669cn[0] = makeSharedRecord(0, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs669cn[4] = makeSharedRecord(4, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      recs669cn[7] = makeSharedRecord(7, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.2 }] });
      const res = await runV669(recs669cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_RELATIONSHIP_ZONE_CLUSTER'), 'VOICE_RELATIONSHIP_ZONE_CLUSTER should not fire');
    });
  });

  describe('Wave 655 — voicePass: voice character moment zone cluster, voice staging peak uncaused, voice seed drought run', async () => {
    const runV655 = async (records: ScreenplaySceneRecord[]) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // VOICE_CHARACTER_MOMENT_ZONE_CLUSTER fire:
    // n=9; thirds=[0-2],[3-5],[6-8]; character-moment scenes at 0,1,2 → 100% opening third
    it('VOICE_CHARACTER_MOMENT_ZONE_CLUSTER fires when >75% of character-moment scenes cluster in one third', async () => {
      const recs655a = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs655a[0] = makeSharedRecord(0, { purpose: 'character_moment' });
      recs655a[1] = makeSharedRecord(1, { purpose: 'character_moment' });
      recs655a[2] = makeSharedRecord(2, { purpose: 'character_moment' });
      const res = await runV655(recs655a);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_CHARACTER_MOMENT_ZONE_CLUSTER'), 'VOICE_CHARACTER_MOMENT_ZONE_CLUSTER should fire');
    });

    // VOICE_CHARACTER_MOMENT_ZONE_CLUSTER no-fire:
    // character-moment scenes at 0, 4, 7 (one per third) → maxZone/total = 1/3
    it('VOICE_CHARACTER_MOMENT_ZONE_CLUSTER does not fire when character-moment scenes are distributed across thirds', async () => {
      const recs655an = Array.from({ length: 9 }, (_, i) => makeSharedRecord(i));
      recs655an[0] = makeSharedRecord(0, { purpose: 'character_moment' });
      recs655an[4] = makeSharedRecord(4, { purpose: 'character_moment' });
      recs655an[7] = makeSharedRecord(7, { purpose: 'character_moment' });
      const res = await runV655(recs655an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_CHARACTER_MOMENT_ZONE_CLUSTER'), 'VOICE_CHARACTER_MOMENT_ZONE_CLUSTER should not fire');
    });

    // VOICE_STAGING_PEAK_UNCAUSED fire:
    // 8 scenes; staging at 2 (1 beat) and 6 (5 beats, the peak); no dramaticTurn or revelation at
    // 6, 5, or 4
    it('VOICE_STAGING_PEAK_UNCAUSED fires when the peak physical-staging scene has no dramatic turn or revelation nearby', async () => {
      const recs655b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs655b[2] = makeSharedRecord(2, { visualBeats: ['glances at the clock'] });
      recs655b[6] = makeSharedRecord(6, { visualBeats: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runV655(recs655b);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_STAGING_PEAK_UNCAUSED'), 'VOICE_STAGING_PEAK_UNCAUSED should fire');
    });

    // VOICE_STAGING_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('VOICE_STAGING_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs655bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs655bn[2] = makeSharedRecord(2, { visualBeats: ['glances at the clock'] });
      recs655bn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs655bn[6] = makeSharedRecord(6, { visualBeats: ['a', 'b', 'c', 'd', 'e'] });
      const res = await runV655(recs655bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_STAGING_PEAK_UNCAUSED'), 'VOICE_STAGING_PEAK_UNCAUSED should not fire');
    });

    // VOICE_SEED_DROUGHT_RUN fire:
    // 10 scenes; seeded at 0,1,2,9; drought run 3-8 = 6 consecutive ≥ 6
    it('VOICE_SEED_DROUGHT_RUN fires when the longest no-seed run is ≥6', async () => {
      const recs655c = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs655c[0] = makeSharedRecord(0, { seededClueIds: ['clue-x'] });
      recs655c[1] = makeSharedRecord(1, { seededClueIds: ['clue-x'] });
      recs655c[2] = makeSharedRecord(2, { seededClueIds: ['clue-x'] });
      recs655c[9] = makeSharedRecord(9, { seededClueIds: ['clue-x'] });
      const res = await runV655(recs655c);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_SEED_DROUGHT_RUN'), 'VOICE_SEED_DROUGHT_RUN should fire');
    });

    // VOICE_SEED_DROUGHT_RUN no-fire:
    // seeded at 0,4,9 → longest drought run = 4 (scenes 5-8) < 6
    it('VOICE_SEED_DROUGHT_RUN does not fire when seeding is distributed without a long drought', async () => {
      const recs655cn = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs655cn[0] = makeSharedRecord(0, { seededClueIds: ['clue-x'] });
      recs655cn[4] = makeSharedRecord(4, { seededClueIds: ['clue-x'] });
      recs655cn[9] = makeSharedRecord(9, { seededClueIds: ['clue-x'] });
      const res = await runV655(recs655cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_SEED_DROUGHT_RUN'), 'VOICE_SEED_DROUGHT_RUN should not fire');
    });
  });

  describe('Wave 641 — voicePass: voice suspense flatline, voice curiosity zone imbalance, voice clock delta peak uncaused', async () => {
    const runV641 = async (records: ScreenplaySceneRecord[]) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // VOICE_SUSPENSE_FLATLINE fire:
    // 8 scenes, every suspenseDelta identical (1.0) — zero deviation from the average
    it('VOICE_SUSPENSE_FLATLINE fires when suspenseDelta barely varies across scenes', async () => {
      const recs641a = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i, { suspenseDelta: 1.0 }));
      const res = await runV641(recs641a);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_SUSPENSE_FLATLINE'), 'VOICE_SUSPENSE_FLATLINE should fire');
    });

    // VOICE_SUSPENSE_FLATLINE no-fire:
    // alternating 0.2/2.5 — wide deviation from the average
    it('VOICE_SUSPENSE_FLATLINE does not fire when suspenseDelta varies widely across scenes', async () => {
      const recs641an = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i, { suspenseDelta: i % 2 === 0 ? 0.2 : 2.5 }));
      const res = await runV641(recs641an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_SUSPENSE_FLATLINE'), 'VOICE_SUSPENSE_FLATLINE should not fire');
    });

    // VOICE_CURIOSITY_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); curiosity-positive scenes at 6,7,8,9; zone 2 (6-8)=3,
    // zone 3 (9)=1, total=4; zones 0,1 empty; bloatZoneIdx=zone2, 3/4=75% ≥ 50% → fires
    it('VOICE_CURIOSITY_ZONE_IMBALANCE fires when one zone is empty of curiosity-spike scenes while another is bloated', async () => {
      const recs641b = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs641b[6] = makeSharedRecord(6, { curiosityDelta: 1 });
      recs641b[7] = makeSharedRecord(7, { curiosityDelta: 1 });
      recs641b[8] = makeSharedRecord(8, { curiosityDelta: 1 });
      recs641b[9] = makeSharedRecord(9, { curiosityDelta: 1 });
      const res = await runV641(recs641b);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_CURIOSITY_ZONE_IMBALANCE'), 'VOICE_CURIOSITY_ZONE_IMBALANCE should fire');
    });

    // VOICE_CURIOSITY_ZONE_IMBALANCE no-fire:
    // one curiosity-spike scene per zone (1,4,7,10) → no zone is empty
    it('VOICE_CURIOSITY_ZONE_IMBALANCE does not fire when curiosity spikes are spread across all zones', async () => {
      const recs641bn = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs641bn[1] = makeSharedRecord(1, { curiosityDelta: 1 });
      recs641bn[4] = makeSharedRecord(4, { curiosityDelta: 1 });
      recs641bn[7] = makeSharedRecord(7, { curiosityDelta: 1 });
      recs641bn[10] = makeSharedRecord(10, { curiosityDelta: 1 });
      const res = await runV641(recs641bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_CURIOSITY_ZONE_IMBALANCE'), 'VOICE_CURIOSITY_ZONE_IMBALANCE should not fire');
    });

    // VOICE_CLOCK_DELTA_PEAK_UNCAUSED fire:
    // 8 scenes; clockDelta>0 at 2 (val=1) and 6 (val=5, the peak); no dramaticTurn or revelation
    // at 6, 5, or 4
    it('VOICE_CLOCK_DELTA_PEAK_UNCAUSED fires when the peak clockDelta scene has no dramatic turn or revelation nearby', async () => {
      const recs641c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs641c[2] = makeSharedRecord(2, { clockDelta: 1 });
      recs641c[6] = makeSharedRecord(6, { clockDelta: 5 });
      const res = await runV641(recs641c);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_CLOCK_DELTA_PEAK_UNCAUSED'), 'VOICE_CLOCK_DELTA_PEAK_UNCAUSED should fire');
    });

    // VOICE_CLOCK_DELTA_PEAK_UNCAUSED no-fire:
    // dramatic turn at scene 5, within the peak's 2-scene lookback (6-1=5)
    it('VOICE_CLOCK_DELTA_PEAK_UNCAUSED does not fire when a dramatic turn precedes the peak within the lookback', async () => {
      const recs641cn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs641cn[2] = makeSharedRecord(2, { clockDelta: 1 });
      recs641cn[5] = makeSharedRecord(5, { dramaticTurn: 'reversal' });
      recs641cn[6] = makeSharedRecord(6, { clockDelta: 5 });
      const res = await runV641(recs641cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_CLOCK_DELTA_PEAK_UNCAUSED'), 'VOICE_CLOCK_DELTA_PEAK_UNCAUSED should not fire');
    });
  });

  describe('Wave 627 — voicePass: voice payoff staging decoupled, voice seed dialogue highlight aftermath void, voice relationship shift zone imbalance', async () => {
    const runV627 = async (records: ScreenplaySceneRecord[]) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // VOICE_PAYOFF_STAGING_DECOUPLED fire:
    // n=6; payoffs at 0,1 (no staging); staged at 4,5 (no payoff) → zero overlap → fires
    it('VOICE_PAYOFF_STAGING_DECOUPLED fires when payoff scenes and visually-staged scenes never overlap', async () => {
      const recs627a = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs627a[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'] });
      recs627a[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs627a[4] = makeSharedRecord(4, { visualBeats: ['pockets the letter', 'locks the drawer'] });
      recs627a[5] = makeSharedRecord(5, { visualBeats: ['pockets the letter', 'locks the drawer'] });
      const res = await runV627(recs627a);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_PAYOFF_STAGING_DECOUPLED'), 'VOICE_PAYOFF_STAGING_DECOUPLED should fire');
    });

    // VOICE_PAYOFF_STAGING_DECOUPLED no-fire:
    // scene 0 carries BOTH a payoff and visual staging → overlap exists
    it('VOICE_PAYOFF_STAGING_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs627an = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs627an[0] = makeSharedRecord(0, { payoffSetupIds: ['thread-a'], visualBeats: ['pockets the letter', 'locks the drawer'] });
      recs627an[1] = makeSharedRecord(1, { payoffSetupIds: ['thread-b'] });
      recs627an[5] = makeSharedRecord(5, { visualBeats: ['pockets the letter', 'locks the drawer'] });
      const res = await runV627(recs627an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_PAYOFF_STAGING_DECOUPLED'), 'VOICE_PAYOFF_STAGING_DECOUPLED should not fire');
    });

    // VOICE_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fire:
    // n=8, window=2; seed triggers at 0,1; their windows {1,2} and {2,3} carry no dialogue
    // highlight; highlights exist elsewhere at 5,6,7 → fires
    it('VOICE_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when no seed is followed by a dialogue highlight within 2 scenes', async () => {
      const recs627b = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs627b[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs627b[1] = makeSharedRecord(1, { seededClueIds: ['clue-b'] });
      recs627b[5] = makeSharedRecord(5, { dialogueHighlights: ['line-a'] });
      recs627b[6] = makeSharedRecord(6, { dialogueHighlights: ['line-b'] });
      recs627b[7] = makeSharedRecord(7, { dialogueHighlights: ['line-c'] });
      const res = await runV627(recs627b);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'VOICE_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    // VOICE_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries a highlight → that trigger's
    // aftermath is no longer void
    it('VOICE_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a trigger window contains a dialogue highlight', async () => {
      const recs627bn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs627bn[0] = makeSharedRecord(0, { seededClueIds: ['clue-a'] });
      recs627bn[1] = makeSharedRecord(1, { seededClueIds: ['clue-b'] });
      recs627bn[3] = makeSharedRecord(3, { dialogueHighlights: ['line-a'] });
      recs627bn[5] = makeSharedRecord(5, { dialogueHighlights: ['line-b'] });
      recs627bn[6] = makeSharedRecord(6, { dialogueHighlights: ['line-c'] });
      recs627bn[7] = makeSharedRecord(7, { dialogueHighlights: ['line-d'] });
      const res = await runV627(recs627bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'VOICE_SEED_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });

    // VOICE_RELATIONSHIP_SHIFT_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); shifts at 6,7,8,9; zone 2 (6-8)=3, zone 3 (9)=1, total=4;
    // zones 0,1 empty; bloatZoneIdx=zone2, 3/4=75% ≥ 50% → fires
    it('VOICE_RELATIONSHIP_SHIFT_ZONE_IMBALANCE fires when one zone is empty of relationship shifts while another is bloated', async () => {
      const recs627c = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs627c[6] = makeSharedRecord(6, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.5 }] });
      recs627c[7] = makeSharedRecord(7, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.4 }] });
      recs627c[8] = makeSharedRecord(8, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: -0.6 }] });
      recs627c[9] = makeSharedRecord(9, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.3 }] });
      const res = await runV627(recs627c);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_RELATIONSHIP_SHIFT_ZONE_IMBALANCE'), 'VOICE_RELATIONSHIP_SHIFT_ZONE_IMBALANCE should fire');
    });

    // VOICE_RELATIONSHIP_SHIFT_ZONE_IMBALANCE no-fire:
    // one shift per zone (1,4,7,10) → no zone is empty
    it('VOICE_RELATIONSHIP_SHIFT_ZONE_IMBALANCE does not fire when shifts are spread across all zones', async () => {
      const recs627cn = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs627cn[1] = makeSharedRecord(1, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.5 }] });
      recs627cn[4] = makeSharedRecord(4, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.4 }] });
      recs627cn[7] = makeSharedRecord(7, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: -0.6 }] });
      recs627cn[10] = makeSharedRecord(10, { relationshipShifts: [{ pairKey: 'a|b', dimension: 'trust', amount: 0.3 }] });
      const res = await runV627(recs627cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_RELATIONSHIP_SHIFT_ZONE_IMBALANCE'), 'VOICE_RELATIONSHIP_SHIFT_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 613 — voicePass: dramatic turn dialogue highlight decoupled, voice staging zone imbalance, clock dialogue highlight aftermath void', async () => {
    const runV613 = async (records: ScreenplaySceneRecord[]) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    // DRAMATIC_TURN_DIALOGUE_HIGHLIGHT_DECOUPLED fire:
    // n=6; turns at 0,1 (no highlight); highlights at 4,5 (no turn) → zero overlap → fires
    it('DRAMATIC_TURN_DIALOGUE_HIGHLIGHT_DECOUPLED fires when dramatic-turn scenes and dialogue highlights never overlap', async () => {
      const recs613a = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs613a[0] = makeSharedRecord(0, { dramaticTurn: 'reversal' });
      recs613a[1] = makeSharedRecord(1, { dramaticTurn: 'revelation' });
      recs613a[4] = makeSharedRecord(4, { dialogueHighlights: ['alice: believes X'] });
      recs613a[5] = makeSharedRecord(5, { dialogueHighlights: ['bob: believes Y'] });
      const res = await runV613(recs613a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_DIALOGUE_HIGHLIGHT_DECOUPLED'), 'DRAMATIC_TURN_DIALOGUE_HIGHLIGHT_DECOUPLED should fire');
    });

    // DRAMATIC_TURN_DIALOGUE_HIGHLIGHT_DECOUPLED no-fire:
    // scene 0 carries BOTH a dramatic turn and a dialogue highlight → overlap exists
    it('DRAMATIC_TURN_DIALOGUE_HIGHLIGHT_DECOUPLED does not fire when a scene carries both signals', async () => {
      const recs613an = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs613an[0] = makeSharedRecord(0, { dramaticTurn: 'reversal', dialogueHighlights: ['alice: believes X'] });
      recs613an[1] = makeSharedRecord(1, { dramaticTurn: 'revelation' });
      recs613an[4] = makeSharedRecord(4, { dialogueHighlights: ['bob: believes Y'] });
      const res = await runV613(recs613an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DRAMATIC_TURN_DIALOGUE_HIGHLIGHT_DECOUPLED'), 'DRAMATIC_TURN_DIALOGUE_HIGHLIGHT_DECOUPLED should not fire');
    });

    // VOICE_STAGING_ZONE_IMBALANCE fire:
    // n=12 (three scenes per zone); visually dense scenes (visualBeats≥2) at 6,9,10,11;
    // zones 0 (0-2) and 1 (3-5) are empty; zone 3 (9-11) holds 3/4 = 75% ≥ 50% → fires
    it('VOICE_STAGING_ZONE_IMBALANCE fires when one zone is empty of visually dense scenes while another is bloated', async () => {
      const recs613b = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs613b[6] = makeSharedRecord(6, { visualBeats: ['grips the phone', 'checks the door'] });
      recs613b[9] = makeSharedRecord(9, { visualBeats: ['grips the phone', 'checks the door'] });
      recs613b[10] = makeSharedRecord(10, { visualBeats: ['grips the phone', 'checks the door'] });
      recs613b[11] = makeSharedRecord(11, { visualBeats: ['grips the phone', 'checks the door'] });
      const res = await runV613(recs613b);
      assert.ok(res.issues.some((i: any) => i.rule === 'VOICE_STAGING_ZONE_IMBALANCE'), 'VOICE_STAGING_ZONE_IMBALANCE should fire');
    });

    // VOICE_STAGING_ZONE_IMBALANCE no-fire:
    // one visually dense scene per zone (1,4,7,10) → no zone is empty
    it('VOICE_STAGING_ZONE_IMBALANCE does not fire when every zone has a visually dense scene', async () => {
      const recs613bn = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs613bn[1] = makeSharedRecord(1, { visualBeats: ['grips the phone', 'checks the door'] });
      recs613bn[4] = makeSharedRecord(4, { visualBeats: ['grips the phone', 'checks the door'] });
      recs613bn[7] = makeSharedRecord(7, { visualBeats: ['grips the phone', 'checks the door'] });
      recs613bn[10] = makeSharedRecord(10, { visualBeats: ['grips the phone', 'checks the door'] });
      const res = await runV613(recs613bn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'VOICE_STAGING_ZONE_IMBALANCE'), 'VOICE_STAGING_ZONE_IMBALANCE should not fire');
    });

    // CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fire:
    // n=8, window=2; clock triggers at 0,1; their windows {1,2} and {2,3} carry no dialogue
    // highlight; highlights exist elsewhere at 5,6,7 → fires
    it('CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID fires when no clock-raising scene is followed by a dialogue highlight within 2 scenes', async () => {
      const recs613c = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs613c[0] = makeSharedRecord(0, { clockRaised: true });
      recs613c[1] = makeSharedRecord(1, { clockRaised: true });
      recs613c[5] = makeSharedRecord(5, { dialogueHighlights: ['line-a'] });
      recs613c[6] = makeSharedRecord(6, { dialogueHighlights: ['line-b'] });
      recs613c[7] = makeSharedRecord(7, { dialogueHighlights: ['line-c'] });
      const res = await runV613(recs613c);
      assert.ok(res.issues.some((i: any) => i.rule === 'CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should fire');
    });

    // CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID no-fire:
    // scene 3 (inside trigger 1's window {2,3}) now carries a highlight → that trigger's
    // aftermath is no longer void
    it('CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID does not fire when a trigger window contains a dialogue highlight', async () => {
      const recs613cn = Array.from({ length: 8 }, (_, i) => makeSharedRecord(i));
      recs613cn[0] = makeSharedRecord(0, { clockRaised: true });
      recs613cn[1] = makeSharedRecord(1, { clockRaised: true });
      recs613cn[3] = makeSharedRecord(3, { dialogueHighlights: ['line-a'] });
      recs613cn[5] = makeSharedRecord(5, { dialogueHighlights: ['line-b'] });
      recs613cn[6] = makeSharedRecord(6, { dialogueHighlights: ['line-c'] });
      recs613cn[7] = makeSharedRecord(7, { dialogueHighlights: ['line-d'] });
      const res = await runV613(recs613cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID'), 'CLOCK_DIALOGUE_HIGHLIGHT_AFTERMATH_VOID should not fire');
    });
  });

  describe('Wave 599 — voicePass: dialogue highlight revelation decoupled, unresolved clue drought run, revelation zone imbalance', async () => {
    const runV599 = async (records: ScreenplaySceneRecord[]) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({
        fountain: buildPlainFountain(records.length), original: '', records,
        structure: {} as any, annotations: Array.from({ length: records.length }, () => ({} as any)),
        approvedSpans: [],
      });
    };

    it('DIALOGUE_HIGHLIGHT_REVELATION_DECOUPLED fires when no highlight scene coincides with a revelation', async () => {
      // 6 scenes; highlights at 0,1; revelations at 4,5 — zero overlap
      const recs599a = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs599a[0] = makeSharedRecord(0, { dialogueHighlights: ['alice: believes X'] });
      recs599a[1] = makeSharedRecord(1, { dialogueHighlights: ['bob: believes Y'] });
      recs599a[4] = makeSharedRecord(4, { revelation: 'She was lying.' });
      recs599a[5] = makeSharedRecord(5, { revelation: 'He knew all along.' });
      const res = await runV599(recs599a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_HIGHLIGHT_REVELATION_DECOUPLED'), 'DIALOGUE_HIGHLIGHT_REVELATION_DECOUPLED should fire');
    });

    it('DIALOGUE_HIGHLIGHT_REVELATION_DECOUPLED does not fire when a highlight scene coincides with a revelation', async () => {
      const recs599a = Array.from({ length: 6 }, (_, i) => makeSharedRecord(i));
      recs599a[0] = makeSharedRecord(0, { dialogueHighlights: ['alice: believes X'], revelation: 'She was lying.' });
      recs599a[1] = makeSharedRecord(1, { dialogueHighlights: ['bob: believes Y'] });
      recs599a[4] = makeSharedRecord(4, { revelation: 'He knew all along.' });
      const res = await runV599(recs599a);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_HIGHLIGHT_REVELATION_DECOUPLED'), 'DIALOGUE_HIGHLIGHT_REVELATION_DECOUPLED should not fire');
    });

    it('UNRESOLVED_CLUE_DROUGHT_RUN fires when ≥6 consecutive scenes carry no outstanding clue-debt', async () => {
      // 10 scenes; debt at 0,1,2 (3 total); scenes 3-9 (7 in a row) have none
      const recs599b = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs599b[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs599b[1] = makeSharedRecord(1, { unresolvedClues: ['b'] });
      recs599b[2] = makeSharedRecord(2, { unresolvedClues: ['c'] });
      const res = await runV599(recs599b);
      assert.ok(res.issues.some((i: any) => i.rule === 'UNRESOLVED_CLUE_DROUGHT_RUN'), 'UNRESOLVED_CLUE_DROUGHT_RUN should fire');
    });

    it('UNRESOLVED_CLUE_DROUGHT_RUN does not fire when debt-carrying scenes are spread with no long gap', async () => {
      // debt at 0,3,6,9 — max gap = 2 scenes, well under the 6-scene threshold
      const recs599bnr = Array.from({ length: 10 }, (_, i) => makeSharedRecord(i));
      recs599bnr[0] = makeSharedRecord(0, { unresolvedClues: ['a'] });
      recs599bnr[3] = makeSharedRecord(3, { unresolvedClues: ['b'] });
      recs599bnr[6] = makeSharedRecord(6, { unresolvedClues: ['c'] });
      recs599bnr[9] = makeSharedRecord(9, { unresolvedClues: ['d'] });
      const res = await runV599(recs599bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'UNRESOLVED_CLUE_DROUGHT_RUN'), 'UNRESOLVED_CLUE_DROUGHT_RUN should not fire');
    });

    it('REVELATION_ZONE_IMBALANCE fires when one zone has zero revelations and another has ≥50%', async () => {
      // 12 scenes, 4 zones of 3: revelations at 6,7,8 (zone 2) plus 9 (zone 3) to meet minCount=4
      const recs599c = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs599c[6] = makeSharedRecord(6, { revelation: 'a' });
      recs599c[7] = makeSharedRecord(7, { revelation: 'b' });
      recs599c[8] = makeSharedRecord(8, { revelation: 'c' });
      recs599c[9] = makeSharedRecord(9, { revelation: 'd' });
      const res = await runV599(recs599c);
      assert.ok(res.issues.some((i: any) => i.rule === 'REVELATION_ZONE_IMBALANCE'), 'REVELATION_ZONE_IMBALANCE should fire');
    });

    it('REVELATION_ZONE_IMBALANCE does not fire when revelations are spread across all zones', async () => {
      const recs599cnr = Array.from({ length: 12 }, (_, i) => makeSharedRecord(i));
      recs599cnr[1] = makeSharedRecord(1, { revelation: 'a' });
      recs599cnr[4] = makeSharedRecord(4, { revelation: 'b' });
      recs599cnr[7] = makeSharedRecord(7, { revelation: 'c' });
      recs599cnr[10] = makeSharedRecord(10, { revelation: 'd' });
      const res = await runV599(recs599cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'REVELATION_ZONE_IMBALANCE'), 'REVELATION_ZONE_IMBALANCE should not fire');
    });
  });

  describe('Wave 585 — voicePass: affirmation zone cluster, exclamation aftermath terse, hedged exclamation flood', async () => {
    const runV585 = async (fountain: string) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // DIALOGUE_AFFIRMATION_ZONE_CLUSTER fire:
    // 12 dialogue lines; third=4; affirmation at lines 0,1,2 (first third, positions 0-3) → 3/3=100%>75%
    it('DIALOGUE_AFFIRMATION_ZONE_CLUSTER fires when >75% of affirmation lines fall in one third', async () => {
      const f585a = [
        'INT. ROOM - DAY', '',
        'ALICE', 'Yes, of course I agree.', '',      // AFF — line 0
        'BOB', 'Right, exactly what I thought.', '', // AFF — line 1
        'ALICE', 'Absolutely, we are aligned.', '',  // AFF — line 2
        'BOB', 'We should head out soon.', '',       // line 3
        'ALICE', 'The meeting starts at noon.', '',  // line 4
        'BOB', 'Let us get moving already.', '',     // line 5
        'ALICE', 'I will see you there then.', '',   // line 6
        'BOB', 'Everything looks good to me.', '',   // line 7
        'ALICE', 'We need to check the plan.', '',   // line 8
        'BOB', 'Let me call ahead first.', '',       // line 9
        'ALICE', 'The door is already open.', '',    // line 10
        'BOB', 'See you in ten minutes.', '',        // line 11
      ].join('\n');
      const res = await runV585(f585a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_AFFIRMATION_ZONE_CLUSTER'), 'DIALOGUE_AFFIRMATION_ZONE_CLUSTER should fire');
    });

    // DIALOGUE_AFFIRMATION_ZONE_CLUSTER no-fire:
    // 12 lines; third=4; AFF at 0 (first), 5 (middle), 10 (last) → 1/1/1 → max=1/3=33%≤75%
    it('DIALOGUE_AFFIRMATION_ZONE_CLUSTER does not fire when affirmation lines are spread across thirds', async () => {
      const f585anr = [
        'INT. ROOM - DAY', '',
        'ALICE', 'Yes, I think so.', '',             // AFF — line 0 (first third 0-3)
        'BOB', 'We should leave now.', '',           // line 1
        'ALICE', 'The plan is clear enough.', '',    // line 2
        'BOB', 'Let us check the map.', '',          // line 3
        'ALICE', 'Right, that makes sense.', '',     // AFF — line 4 (middle third 4-7)
        'BOB', 'Where do we go next?', '',           // line 5
        'ALICE', 'I need to think first.', '',       // line 6
        'BOB', 'What time does it start?', '',       // line 7
        'ALICE', 'Absolutely, let us go.', '',       // AFF — line 8 (last third 8-11)
        'BOB', 'Good, I am ready now.', '',          // line 9
        'ALICE', 'We need to move fast.', '',        // line 10
        'BOB', 'The door is open.', '',              // line 11
      ].join('\n');
      const res = await runV585(f585anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_AFFIRMATION_ZONE_CLUSTER'), 'DIALOGUE_AFFIRMATION_ZONE_CLUSTER should not fire');
    });

    // DIALOGUE_EXCLAMATION_AFTERMATH_TERSE fire:
    // 8 dialogue lines; 2 !-ending lines at 0,2; lines 1,3 are ≤2-word responses → fires
    it('DIALOGUE_EXCLAMATION_AFTERMATH_TERSE fires when all exclamation lines are followed by ≤2-word responses', async () => {
      const f585b = [
        'INT. ROOM - DAY', '',
        'ALICE', 'That is absolutely outrageous!', '',
        'BOB', 'Yes.', '',
        'ALICE', 'I cannot believe you did this!', '',
        'BOB', 'Sorry.', '',
        'ALICE', 'What should we do now then?', '',
        'BOB', 'Let me think about it.', '',
        'ALICE', 'We need to talk about this more.', '',
        'BOB', 'Agreed, let us sit down.', '',
      ].join('\n');
      const res = await runV585(f585b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_EXCLAMATION_AFTERMATH_TERSE'), 'DIALOGUE_EXCLAMATION_AFTERMATH_TERSE should fire');
    });

    // DIALOGUE_EXCLAMATION_AFTERMATH_TERSE no-fire:
    // 8 lines; !-ending at line 0 followed by a 5-word response → no fire
    it('DIALOGUE_EXCLAMATION_AFTERMATH_TERSE does not fire when an exclamation is followed by a longer response', async () => {
      const f585bnr = [
        'INT. ROOM - DAY', '',
        'ALICE', 'That is absolutely outrageous!', '',
        'BOB', 'I know and I am sorry.', '',    // 6 words → not terse
        'ALICE', 'I cannot believe this happened!', '',
        'BOB', 'Look, it was a mistake.', '',   // 5 words → not terse
        'ALICE', 'What do we do now?', '',
        'BOB', 'We need to talk later.', '',
        'ALICE', 'Fine, meet me at six.', '',
        'BOB', 'Okay.', '',
      ].join('\n');
      const res = await runV585(f585bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_EXCLAMATION_AFTERMATH_TERSE'), 'DIALOGUE_EXCLAMATION_AFTERMATH_TERSE should not fire');
    });

    // DIALOGUE_HEDGED_EXCLAMATION_FLOOD fire:
    // 10 dialogue lines; 2 contain both hesitation AND "!"; 2/10=20% > 15% → fires
    it('DIALOGUE_HEDGED_EXCLAMATION_FLOOD fires when >15% of lines have both hesitation and "!"', async () => {
      const f585c = [
        'INT. ROOM - DAY', '',
        'ALICE', 'Um, that is amazing!', '',
        'BOB', 'Uh, I cannot believe this!', '',
        'ALICE', 'We should go now.', '',
        'BOB', 'Let me check the map.', '',
        'ALICE', 'It looks clear outside.', '',
        'BOB', 'What time is it?', '',
        'ALICE', 'Almost seven I think.', '',
        'BOB', 'We need to hurry.', '',
        'ALICE', 'Right, let us leave.', '',
        'BOB', 'I will get the keys.', '',
      ].join('\n');
      const res = await runV585(f585c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_HEDGED_EXCLAMATION_FLOOD'), 'DIALOGUE_HEDGED_EXCLAMATION_FLOOD should fire');
    });

    // DIALOGUE_HEDGED_EXCLAMATION_FLOOD no-fire:
    // 10 dialogue lines; only 1 hesitation+! line → 1/10=10% ≤ 15% → no fire
    it('DIALOGUE_HEDGED_EXCLAMATION_FLOOD does not fire when only one line has hesitation and "!"', async () => {
      const f585cnr = [
        'INT. ROOM - DAY', '',
        'ALICE', 'Um, that is amazing!', '',    // only one hedged-!
        'BOB', 'Wow, that is great news.', '',
        'ALICE', 'We should go now.', '',
        'BOB', 'Let me check the map.', '',
        'ALICE', 'It looks clear outside.', '',
        'BOB', 'What time is it?', '',
        'ALICE', 'Almost seven I think.', '',
        'BOB', 'We need to hurry.', '',
        'ALICE', 'Right, let us leave.', '',
        'BOB', 'I will get the keys.', '',
      ].join('\n');
      const res = await runV585(f585cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_HEDGED_EXCLAMATION_FLOOD'), 'DIALOGUE_HEDGED_EXCLAMATION_FLOOD should not fire');
    });
  });


  describe('Wave 571 — voicePass: negation zone cluster, hedged negation flood, opening zone question absent', async () => {
    const runV571 = async (fountain: string) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // DIALOGUE_NEGATION_ZONE_CLUSTER fire:
    // 12 dialogue lines; third=4; negation at speeches 0,1,2 (all first third) → 3/3=100% > 75% → fires
    it('DIALOGUE_NEGATION_ZONE_CLUSTER fires when >75% of negation lines fall in one third', async () => {
      const f571a = [
        'INT. ROOM - DAY', '',
        'ALICE', 'No, I will not go.', '',
        'BOB', "I can't accept this.", '',
        'ALICE', "Never, I won't agree.", '',
        'BOB', 'We should leave before dawn.', '',
        'ALICE', 'The papers are ready today.', '',
        'BOB', 'Send them over to me.', '',
        'ALICE', 'I will write the report.', '',
        'BOB', 'The meeting starts at noon.', '',
        'ALICE', 'I have the files here.', '',
        'BOB', 'Let us begin the work.', '',
        'ALICE', 'The deadline is tomorrow.', '',
        'BOB', 'I will start immediately.',
      ].join('\n');
      const res = await runV571(f571a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_NEGATION_ZONE_CLUSTER'), 'DIALOGUE_NEGATION_ZONE_CLUSTER should fire');
    });

    // DIALOGUE_NEGATION_ZONE_CLUSTER no-fire:
    // negation at speeches 0,5,9 → one per third → max 1/3=33% ≤ 75% → no fire
    it('DIALOGUE_NEGATION_ZONE_CLUSTER does not fire when negation lines are spread across thirds', async () => {
      const f571anr = [
        'INT. ROOM - DAY', '',
        'ALICE', 'No, I will not go.', '',
        'BOB', 'We should leave before dawn.', '',
        'ALICE', 'The papers are ready today.', '',
        'BOB', 'Send them over to me.', '',
        'ALICE', 'I will write the report.', '',
        'BOB', "I can't accept this plan.", '',
        'ALICE', 'The meeting starts at noon.', '',
        'BOB', 'I have the files here.', '',
        'ALICE', 'Let us begin the work.', '',
        'BOB', "Never, I won't agree to it.", '',
        'ALICE', 'The deadline is tomorrow.', '',
        'BOB', 'I will start immediately.',
      ].join('\n');
      const res = await runV571(f571anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_NEGATION_ZONE_CLUSTER'), 'DIALOGUE_NEGATION_ZONE_CLUSTER should not fire');
    });

    // DIALOGUE_HEDGED_NEGATION_FLOOD fire:
    // 12 dialogue lines; 4 contain BOTH hesitation (um/uh/er/hmm) AND negation → 4/12 ≈ 33% > 15% → fires
    it('DIALOGUE_HEDGED_NEGATION_FLOOD fires when >15% of lines contain both hesitation and negation', async () => {
      const f571b = [
        'INT. ROOM - DAY', '',
        'ALICE', "Um, no, I don't think so.", '',
        'BOB', "Uh, I can't, never.", '',
        'ALICE', 'I will write the report today.', '',
        'BOB', 'Er, not really, no.', '',
        'ALICE', 'The papers are ready today.', '',
        'BOB', "Hmm, I won't, not now.", '',
        'ALICE', 'Send the files over please.', '',
        'BOB', 'The meeting starts at noon.', '',
        'ALICE', 'I have the documents here.', '',
        'BOB', 'Let us begin the work now.', '',
        'ALICE', 'The deadline is tomorrow morning.', '',
        'BOB', 'I will start the task soon.',
      ].join('\n');
      const res = await runV571(f571b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_HEDGED_NEGATION_FLOOD'), 'DIALOGUE_HEDGED_NEGATION_FLOOD should fire');
    });

    // DIALOGUE_HEDGED_NEGATION_FLOOD no-fire:
    // hesitation lines carry no negation → 0 lines with BOTH → 0% ≤ 15%
    it('DIALOGUE_HEDGED_NEGATION_FLOOD does not fire when hesitation lines lack negation', async () => {
      const f571bnr = [
        'INT. ROOM - DAY', '',
        'ALICE', 'Um, I think that works well.', '',
        'BOB', 'Uh, let me consider that more.', '',
        'ALICE', 'The situation seems complex today.', '',
        'BOB', 'Er, we need more time here.', '',
        'ALICE', 'What do you have for me?', '',
        'BOB', 'I have the files from before.', '',
        'ALICE', 'The report is ready to send.', '',
        'BOB', 'I will need more time today.', '',
        'ALICE', 'When can we meet to talk?', '',
        'BOB', 'I am free on Thursday morning.', '',
        'ALICE', 'That works for me then.', '',
        'BOB', 'I will send the agenda over.',
      ].join('\n');
      const res = await runV571(f571bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_HEDGED_NEGATION_FLOOD'), 'DIALOGUE_HEDGED_NEGATION_FLOOD should not fire');
    });

    // DIALOGUE_OPENING_ZONE_QUESTION_ABSENT fire:
    // 12 dialogue lines; openEnd=3; questions at 5,6,7,8 (none in opening 0-2) → openQ=0, restQ=4 → fires
    it('DIALOGUE_OPENING_ZONE_QUESTION_ABSENT fires when the opening quarter has no question while questions exist later', async () => {
      const f571c = [
        'INT. ROOM - DAY', '',
        'ALICE', 'I will write the report.', '',
        'BOB', 'The papers are ready today.', '',
        'ALICE', 'We should leave before dawn.', '',
        'BOB', 'I have the files here now.', '',
        'ALICE', 'Let us begin the work.', '',
        'BOB', 'What do you need from me?', '',
        'ALICE', 'Where did you put the keys?', '',
        'BOB', 'When will the meeting start?', '',
        'ALICE', 'Who is coming to the office?', '',
        'BOB', 'The deadline is tomorrow.', '',
        'ALICE', 'I will start immediately.', '',
        'BOB', 'Send them over to me.',
      ].join('\n');
      const res = await runV571(f571c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_OPENING_ZONE_QUESTION_ABSENT'), 'DIALOGUE_OPENING_ZONE_QUESTION_ABSENT should fire');
    });

    // DIALOGUE_OPENING_ZONE_QUESTION_ABSENT no-fire:
    // a question at speech 1 (inside the opening quarter) → openQ ≥ 1 → no fire
    it('DIALOGUE_OPENING_ZONE_QUESTION_ABSENT does not fire when the opening quarter contains a question', async () => {
      const f571cnr = [
        'INT. ROOM - DAY', '',
        'ALICE', 'I will write the report.', '',
        'BOB', 'What do you need from me?', '',
        'ALICE', 'We should leave before dawn.', '',
        'BOB', 'I have the files here now.', '',
        'ALICE', 'Let us begin the work.', '',
        'BOB', 'Where did you put the keys?', '',
        'ALICE', 'When will the meeting start?', '',
        'BOB', 'Who is coming to the office?', '',
        'ALICE', 'The deadline is tomorrow.', '',
        'BOB', 'I will start immediately.', '',
        'ALICE', 'Send them over to me.', '',
        'BOB', 'The work is almost done.',
      ].join('\n');
      const res = await runV571(f571cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_OPENING_ZONE_QUESTION_ABSENT'), 'DIALOGUE_OPENING_ZONE_QUESTION_ABSENT should not fire');
    });
  });


  describe('Wave 557 — voicePass: hedged affirmation flood, long speech zone cluster, negation self-feeding', async () => {
    const runV557 = async (fountain: string) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // DIALOGUE_HEDGED_AFFIRMATION_FLOOD fire:
    // 12 dialogue lines; 4 lines contain BOTH hesitation (um/uh/er/hmm) AND affirmation
    // (yes/right/exactly/absolutely) → 4/12 ≈ 33% > 15% → fires
    it('DIALOGUE_HEDGED_AFFIRMATION_FLOOD fires when >15% of lines contain both hesitation and affirmation', async () => {
      const f557a = [
        'INT. ROOM - DAY', '',
        'ALICE', 'Um, yes, I think so.', '',
        'BOB', 'Uh, right, I agree with that.', '',
        'ALICE', 'I want to check the documents now.', '',
        'BOB', 'Er, exactly, that makes sense here.', '',
        'ALICE', 'The deadline is tomorrow morning.', '',
        'BOB', 'Hmm, absolutely, we should move faster.', '',
        'ALICE', 'I will write the report today.', '',
        'BOB', 'Good plan, let us do it.', '',
        'ALICE', 'I will start now immediately.', '',
        'BOB', 'That sounds reasonable enough.', '',
        'ALICE', 'The papers are ready and waiting.', '',
        'BOB', 'Send them over to me please.',
      ].join('\n');
      const res = await runV557(f557a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_HEDGED_AFFIRMATION_FLOOD'), 'DIALOGUE_HEDGED_AFFIRMATION_FLOOD should fire');
    });

    // DIALOGUE_HEDGED_AFFIRMATION_FLOOD no-fire:
    // 12 dialogue lines; 4 lines with hesitation but NO affirmation → 0 lines with BOTH → 0% ≤ 15%
    it('DIALOGUE_HEDGED_AFFIRMATION_FLOOD does not fire when hesitation lines lack affirmation', async () => {
      const f557anr = [
        'INT. ROOM - DAY', '',
        'ALICE', 'Um, I am not sure about this plan.', '',
        'BOB', 'Uh, let me think about that more.', '',
        'ALICE', 'The situation seems complicated to me.', '',
        'BOB', 'Er, we need more time to decide here.', '',
        'ALICE', 'What do you need from me now?', '',
        'BOB', 'I have the files from last week.', '',
        'ALICE', 'The report is not finished yet.', '',
        'BOB', 'I will need more time for this task.', '',
        'ALICE', 'When can we meet to discuss it?', '',
        'BOB', 'I am available on Thursday morning.', '',
        'ALICE', 'That works for me then.', '',
        'BOB', 'I will send the agenda over.',
      ].join('\n');
      const res = await runV557(f557anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_HEDGED_AFFIRMATION_FLOOD'), 'DIALOGUE_HEDGED_AFFIRMATION_FLOOD should not fire');
    });

    // DIALOGUE_LONG_SPEECH_ZONE_CLUSTER fire:
    // 12 dialogue lines; third=4; long speeches (≥10 words) at i=0,1,2,3 (all in first third);
    // firstZone=4, 4/4=100% > 75% → fires
    it('DIALOGUE_LONG_SPEECH_ZONE_CLUSTER fires when 3+ long speeches cluster in one third', async () => {
      const f557b = [
        'INT. ROOM - DAY', '',
        'ALICE', 'She walks across the room and stops at the door looking out into the night.', '',
        'BOB', 'He follows her slowly and they stand together at the window watching the rain fall.', '',
        'ALICE', 'The rain comes down harder now and the street below is flooding with dark water.', '',
        'BOB', 'She turns to him and says nothing but her eyes are wet from more than rain.', '',
        'ALICE', 'Okay.', '',
        'BOB', 'Fine.', '',
        'ALICE', 'I see.', '',
        'BOB', 'Right.', '',
        'ALICE', 'Come in.', '',
        'BOB', 'Stay here.', '',
        'ALICE', 'Move on.', '',
        'BOB', 'End it.',
      ].join('\n');
      const res = await runV557(f557b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_LONG_SPEECH_ZONE_CLUSTER'), 'DIALOGUE_LONG_SPEECH_ZONE_CLUSTER should fire');
    });

    // DIALOGUE_LONG_SPEECH_ZONE_CLUSTER no-fire:
    // 12 dialogue lines; long speeches at i=0 (first), i=5 (middle), i=10 (last) →
    // firstZone=1, midZone=1, lastZone=1; maxZone=1, 1/3≈33% ≤ 75% → no fire
    it('DIALOGUE_LONG_SPEECH_ZONE_CLUSTER does not fire when long speeches are distributed across thirds', async () => {
      const f557bnr = [
        'INT. ROOM - DAY', '',
        'ALICE', 'She walks across the room and stops at the door looking out into the night.', '',
        'BOB', 'Fine.', '',
        'ALICE', 'Okay.', '',
        'BOB', 'I see.', '',
        'ALICE', 'Right.', '',
        'BOB', 'He follows her slowly and they stand together at the window watching the rain.', '',
        'ALICE', 'Come in.', '',
        'BOB', 'Stay here.', '',
        'ALICE', 'Move on.', '',
        'BOB', 'End it.', '',
        'ALICE', 'The rain comes down harder now and the street below is completely flooding dark.', '',
        'BOB', 'Sure.',
      ].join('\n');
      const res = await runV557(f557bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_LONG_SPEECH_ZONE_CLUSTER'), 'DIALOGUE_LONG_SPEECH_ZONE_CLUSTER should not fire');
    });

    // DIALOGUE_NEGATION_SELF_FEEDING fire:
    // 8 dialogue lines; negation at i=0,1,2,3; negIdxs=[1,2,3] (i>0 with negation);
    // each preceded by negation (i=0,1,2 all have negation) → fires
    it('DIALOGUE_NEGATION_SELF_FEEDING fires when all negation lines at i>0 are preceded by negation', async () => {
      const f557c = [
        'INT. ROOM - DAY', '',
        'ALICE', "I don't know what to do next.", '', // i=0 negation
        'BOB', "I can't decide either way.", '', // i=1 negation, prev negation ✓
        'ALICE', "Nobody knows the answer to this.", '', // i=2 negation, prev negation ✓
        'BOB', "Nothing makes sense here at all.", '', // i=3 negation, prev negation ✓
        'ALICE', 'What should we try next then?', '', // i=4 no negation
        'BOB', 'Let us look at the map again.', '', // i=5 no negation
        'ALICE', 'Maybe the road ahead is clear.', '', // i=6 no negation
        'BOB', 'That could work well for us.', // i=7 no negation
      ].join('\n');
      const res = await runV557(f557c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_NEGATION_SELF_FEEDING'), 'DIALOGUE_NEGATION_SELF_FEEDING should fire');
    });

    // DIALOGUE_NEGATION_SELF_FEEDING no-fire:
    // 8 dialogue lines; negation at i=1,3,4 (i>0); i=1 preceded by non-negation at i=0 →
    // not all preceded by negation → no fire
    it('DIALOGUE_NEGATION_SELF_FEEDING does not fire when a negation line is preceded by a non-negation line', async () => {
      const f557cnr = [
        'INT. ROOM - DAY', '',
        'ALICE', 'I will check the documents first.', '', // i=0 no negation
        'BOB', "I don't have time today at all.", '', // i=1 negation, prev no negation → breaks
        'ALICE', 'We can try another way instead.', '', // i=2 no negation
        'BOB', "Nothing is certain yet about this.", '', // i=3 negation, prev no negation
        'ALICE', "I won't give up on this plan.", '', // i=4 negation, prev no negation
        'BOB', 'Let us keep going forward together.', '', // i=5 no negation
        'ALICE', 'The answer will come eventually.', '', // i=6 no negation
        'BOB', 'We will figure it out soon.', // i=7 no negation
      ].join('\n');
      const res = await runV557(f557cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_NEGATION_SELF_FEEDING'), 'DIALOGUE_NEGATION_SELF_FEEDING should not fire');
    });
  });


  describe('Wave 543 — voicePass: action passive run, dialogue affirmation flood, exclamation backward causeless', async () => {
    const runV543 = async (fountain: string) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    // ACTION_PASSIVE_RUN fire:
    // 10 action lines; first 5 are passive (is heard / can be seen / is found / can be felt / is heard);
    // passiveTotal=5≥3; maxPassRun=5≥4 → fires
    it('ACTION_PASSIVE_RUN fires when 4+ consecutive action lines use passive constructions', async () => {
      const f543a = [
        'INT. ROOM - DAY', '',
        'A sound is heard from outside.',
        'A figure can be seen through the glass.',
        'A letter is found on the table.',
        'The shadow can be felt before it arrives.',
        'A noise is heard again.',
        'John picks up the letter.',
        'Mary walks to the door.',
        'She looks outside.',
        'He follows her.',
        'They stop.',
      ].join('\n');
      const res = await runV543(f543a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_PASSIVE_RUN'), 'ACTION_PASSIVE_RUN should fire');
    });

    // ACTION_PASSIVE_RUN no-fire:
    // 10 action lines; passive at positions 0,3,7,8 — runs of 1,1,2 → maxPassRun=2<4 → no fire
    it('ACTION_PASSIVE_RUN does not fire when passive lines are not in a consecutive run of 4', async () => {
      const f543anr = [
        'INT. ROOM - DAY', '',
        'A sound is heard from outside.',
        'John picks up the letter.',
        'Mary walks to the door.',
        'A figure can be seen through the glass.',
        'She looks outside.',
        'He follows her.',
        'They stop.',
        'A letter is found on the table.',
        'The shadow can be felt before it arrives.',
        'Someone opens the door.',
      ].join('\n');
      const res = await runV543(f543anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_PASSIVE_RUN'), 'ACTION_PASSIVE_RUN should not fire');
    });

    // DIALOGUE_AFFIRMATION_FLOOD fire:
    // 10 dialogue lines; 5 contain yes/absolutely/right/yes/exactly → 50%>30% → fires
    it('DIALOGUE_AFFIRMATION_FLOOD fires when more than 30% of dialogue lines carry explicit affirmation', async () => {
      const f543b = [
        'INT. ROOM - DAY', '',
        'ALICE', 'Yes, that is what I thought.', '',
        'BOB', 'Absolutely, I agree.', '',
        'ALICE', 'Right, let us proceed.', '',
        'BOB', 'Yes, we should.', '',
        'ALICE', 'I will handle the paperwork.', '',
        'BOB', 'Exactly, good thinking.', '',
        'ALICE', 'Let me start today.', '',
        'BOB', 'Take care.', '',
        'ALICE', 'I will be in touch.', '',
        'BOB', 'Sounds fine to me.',
      ].join('\n');
      const res = await runV543(f543b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_AFFIRMATION_FLOOD'), 'DIALOGUE_AFFIRMATION_FLOOD should fire');
    });

    // DIALOGUE_AFFIRMATION_FLOOD no-fire:
    // 10 dialogue lines; 0 contain affirmation words → 0%≤30% → no fire
    it('DIALOGUE_AFFIRMATION_FLOOD does not fire when fewer than 30% of dialogue lines contain affirmation', async () => {
      const f543bnr = [
        'INT. ROOM - DAY', '',
        'ALICE', 'I am uncertain about this plan.', '',
        'BOB', 'We need to check the numbers.', '',
        'ALICE', 'There might be complications.', '',
        'BOB', 'Let me look into it further.', '',
        'ALICE', 'What do you need from me?', '',
        'BOB', 'I have the files from last week.', '',
        'ALICE', 'The report is not finished.', '',
        'BOB', 'I will need more time for this.', '',
        'ALICE', 'When can we meet to discuss?', '',
        'BOB', 'I am available on Thursday.',
      ].join('\n');
      const res = await runV543(f543bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_AFFIRMATION_FLOOD'), 'DIALOGUE_AFFIRMATION_FLOOD should not fire');
    });

    // DIALOGUE_EXCLAMATION_BACKWARD_CAUSELESS fire:
    // 8 dialogue lines; "!" at i=2 (prev=".") and i=5 (prev=".") → both causeless → fires
    it('DIALOGUE_EXCLAMATION_BACKWARD_CAUSELESS fires when all exclamation lines are preceded by non-? non-! lines', async () => {
      const f543c = [
        'INT. ROOM - DAY', '',
        'ALICE', 'I think we should leave now.', '',
        'BOB', 'The car is outside waiting.', '',
        'ALICE', 'We have to go immediately!', '',
        'BOB', 'The keys are on the table.', '',
        'ALICE', 'I cannot believe this situation.', '',
        'BOB', 'We need to hurry up!', '',
        'ALICE', 'The bags are packed already.', '',
        'BOB', 'Let us move then.',
      ].join('\n');
      const res = await runV543(f543c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_EXCLAMATION_BACKWARD_CAUSELESS'), 'DIALOGUE_EXCLAMATION_BACKWARD_CAUSELESS should fire');
    });

    // DIALOGUE_EXCLAMATION_BACKWARD_CAUSELESS no-fire:
    // 8 dialogue lines; "!" at i=1 (prev="?" at i=0) → has cause → no fire
    it('DIALOGUE_EXCLAMATION_BACKWARD_CAUSELESS does not fire when an exclamation line is preceded by a question', async () => {
      const f543cnr = [
        'INT. ROOM - DAY', '',
        'ALICE', 'Are you ready to leave now?', '',
        'BOB', 'We have to go right this moment!', '',
        'ALICE', 'Where are the car keys?', '',
        'BOB', 'I cannot find them anywhere!', '',
        'ALICE', 'The car is outside.', '',
        'BOB', 'We should hurry.', '',
        'ALICE', 'The bags are already packed.', '',
        'BOB', 'Let us go then.',
      ].join('\n');
      const res = await runV543(f543cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_EXCLAMATION_BACKWARD_CAUSELESS'), 'DIALOGUE_EXCLAMATION_BACKWARD_CAUSELESS should not fire');
    });
  });


  describe('Wave 529 — voicePass: question zone middle absent, hesitation run, question aftermath long', async () => {
    const runV529 = async (fountain: string) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DIALOGUE_QUESTION_ZONE_MIDDLE_ABSENT fires when middle 50% has no question but outer zones do', async () => {
      // 12 dialogue lines; midStart=3, midEnd=9; questions at idx 0,1,10,11 (outer zones only) → 4 questions, 0 in middle → fires
      const f529a = [
        'INT. ROOM - DAY', '',
        'ALICE', 'Line zero outer query?', '',
        'BOB', 'Line one outer query?', '',
        'ALICE', 'Line two no question.', '',
        'BOB', 'Line three no question.', '',
        'ALICE', 'Line four no question.', '',
        'BOB', 'Line five no question.', '',
        'ALICE', 'Line six no question.', '',
        'BOB', 'Line seven no question.', '',
        'ALICE', 'Line eight no question.', '',
        'BOB', 'Line nine no question.', '',
        'ALICE', 'Line ten outer query?', '',
        'BOB', 'Line eleven outer query?',
      ].join('\n');
      const res = await runV529(f529a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_QUESTION_ZONE_MIDDLE_ABSENT'), 'DIALOGUE_QUESTION_ZONE_MIDDLE_ABSENT should fire');
    });

    it('DIALOGUE_QUESTION_ZONE_MIDDLE_ABSENT does not fire when the middle zone has at least one question', async () => {
      // Same 12 lines; questions at 0,1,10,11 (outer) AND at 5 (middle) → midQCount>0 → no fire
      const f529anr = [
        'INT. ROOM - DAY', '',
        'ALICE', 'Line zero outer query?', '',
        'BOB', 'Line one outer query?', '',
        'ALICE', 'Line two no question.', '',
        'BOB', 'Line three no question.', '',
        'ALICE', 'Line four no question.', '',
        'BOB', 'Line five middle query?', '',
        'ALICE', 'Line six no question.', '',
        'BOB', 'Line seven no question.', '',
        'ALICE', 'Line eight no question.', '',
        'BOB', 'Line nine no question.', '',
        'ALICE', 'Line ten outer query?', '',
        'BOB', 'Line eleven outer query?',
      ].join('\n');
      const res = await runV529(f529anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_QUESTION_ZONE_MIDDLE_ABSENT'), 'DIALOGUE_QUESTION_ZONE_MIDDLE_ABSENT should not fire');
    });

    it('DIALOGUE_HESITATION_RUN fires when 4+ consecutive dialogue lines each contain a hesitation sound', async () => {
      // 8 dialogue lines; hesitation at idx 1,2,3,4 (run of 4) → maxHesRun=4 → fires
      const f529b = [
        'INT. ROOM - DAY', '',
        'ALICE', 'Well I think this is right.', '',
        'BOB', 'Um this is not what I expected.', '',
        'ALICE', 'Uh I do not know what to say.', '',
        'BOB', 'Er I am not sure about this.', '',
        'ALICE', 'Hmm I need to think more here.', '',
        'BOB', 'Okay that is fine enough.', '',
        'ALICE', 'I suppose that is acceptable.', '',
        'BOB', 'Let us proceed with the plan.',
      ].join('\n');
      const res = await runV529(f529b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_HESITATION_RUN'), 'DIALOGUE_HESITATION_RUN should fire');
    });

    it('DIALOGUE_HESITATION_RUN does not fire when no hesitation run reaches 4 consecutive lines', async () => {
      // 8 dialogue lines; hesitation at idx 1,2 then non-hesitation at 3, then hesitation at 4 → max run=2 → no fire
      const f529bnr = [
        'INT. ROOM - DAY', '',
        'ALICE', 'Well I think this is right.', '',
        'BOB', 'Um this is not expected.', '',
        'ALICE', 'Uh I do not know here.', '',
        'BOB', 'This is fine and clear.', '',
        'ALICE', 'Hmm I need more time.', '',
        'BOB', 'Okay that is all right.', '',
        'ALICE', 'I suppose that works.', '',
        'BOB', 'Let us proceed now.',
      ].join('\n');
      const res = await runV529(f529bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_HESITATION_RUN'), 'DIALOGUE_HESITATION_RUN should not fire');
    });

    it('DIALOGUE_QUESTION_AFTERMATH_LONG fires when all questions are followed by responses of ≥10 words', async () => {
      // 8 dialogue lines; questions at idx 0 and 2 (not last); responses at 1 and 3 each ≥10 words → fires
      const f529c = [
        'INT. ROOM - DAY', '',
        'ALICE', 'Do you know what really happened here?', '',
        'BOB', 'Well I think the situation was quite complex and has multiple contributing factors.', '',
        'ALICE', 'Why exactly did you make that particular choice back then?', '',
        'BOB', 'That choice was the result of careful deliberation over a very long period of time.', '',
        'ALICE', 'Simple statement here now.', '',
        'BOB', 'Regular reply here now.', '',
        'ALICE', 'Another line here now.', '',
        'BOB', 'Final line here.',
      ].join('\n');
      const res = await runV529(f529c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_QUESTION_AFTERMATH_LONG'), 'DIALOGUE_QUESTION_AFTERMATH_LONG should fire');
    });

    it('DIALOGUE_QUESTION_AFTERMATH_LONG does not fire when at least one question is followed by a short response', async () => {
      // Same setup but response at idx 1 is short (< 10 words) → allLong = false → no fire
      const f529cnr = [
        'INT. ROOM - DAY', '',
        'ALICE', 'Do you know what really happened here?', '',
        'BOB', 'I do not know.', '',
        'ALICE', 'Why exactly did you make that particular choice back then?', '',
        'BOB', 'That choice was the result of careful deliberation over a very long period of time.', '',
        'ALICE', 'Simple statement here now.', '',
        'BOB', 'Regular reply here now.', '',
        'ALICE', 'Another line here now.', '',
        'BOB', 'Final line here.',
      ].join('\n');
      const res = await runV529(f529cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_QUESTION_AFTERMATH_LONG'), 'DIALOGUE_QUESTION_AFTERMATH_LONG should not fire');
    });
  });


  describe('Wave 515 — voicePass: dialogue exclamation run, closing zone long absent, negation run', async () => {
    const runV515 = async (fountain: string) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DIALOGUE_EXCLAMATION_RUN fires when ≥4 consecutive dialogue lines end with "!"', async () => {
      // 10 dialogue lines; !-run at idx 3,4,5,6 (length 4); total exclamations = 4 ≥ 3 → fires
      const f515a = [
        'INT. ROOM - DAY', '',
        'He enters.', '',
        'ALICE', 'First plain statement here.', '',
        'BOB', 'Regular reply back.', '',
        'ALICE', 'Another normal line there.', '',
        'BOB', 'What excitement this is!', '',
        'ALICE', 'This is incredible!', '',
        'BOB', 'Amazing absolutely amazing!', '',
        'ALICE', 'Extraordinary beyond belief!', '',
        'BOB', 'Final normal statement.', '',
        'ALICE', 'Closing line here.', '',
        'BOB', 'One more line added.',
      ].join('\n');
      const res = await runV515(f515a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_EXCLAMATION_RUN'), 'DIALOGUE_EXCLAMATION_RUN should fire');
    });

    it('DIALOGUE_EXCLAMATION_RUN does not fire when the max consecutive exclamation run is < 4', async () => {
      // 10 dialogue lines; !-lines scattered at idx 1,3,5 (no consecutive run ≥ 4) → no fire
      const f515anr = [
        'INT. ROOM - DAY', '',
        'He enters.', '',
        'ALICE', 'First plain statement here.', '',
        'BOB', 'What a start this is!', '',
        'ALICE', 'Normal middle line.', '',
        'BOB', 'How exciting!', '',
        'ALICE', 'Normal line after that.', '',
        'BOB', 'Indeed remarkable!', '',
        'ALICE', 'Final normal statement.', '',
        'BOB', 'Closing line here.', '',
        'ALICE', 'One more line.', '',
        'BOB', 'Last line added.',
      ].join('\n');
      const res = await runV515(f515anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_EXCLAMATION_RUN'), 'DIALOGUE_EXCLAMATION_RUN should not fire');
    });

    it('DIALOGUE_CLOSING_ZONE_LONG_ABSENT fires when all ≥3 long speeches (≥10w) are in the opening/middle', async () => {
      // 12 dialogue lines; closeStart=9; 3 long speeches at idx 0,2,4; closing zone (9-11) all terse → fires
      const f515b = [
        'INT. ROOM - DAY', '',
        'He enters the room.', '',
        'ALICE', 'This is a very long speech delivering important information with many words here.', '',
        'BOB', 'Short reply.', '',
        'ALICE', 'Another long speech with plenty of words covering many important points indeed now.', '',
        'BOB', 'Brief reply.', '',
        'ALICE', 'Yet another long speech exceeding ten words providing more detailed explanation here.', '',
        'BOB', 'Terse answer.', '',
        'ALICE', 'Middle section line.', '',
        'BOB', 'Continued line.', '',
        'ALICE', 'Short close.', '',
        'BOB', 'Brief end.', '',
        'ALICE', 'Final words.', '',
        'BOB', 'Done.',
      ].join('\n');
      const res = await runV515(f515b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_CLOSING_ZONE_LONG_ABSENT'), 'DIALOGUE_CLOSING_ZONE_LONG_ABSENT should fire');
    });

    it('DIALOGUE_CLOSING_ZONE_LONG_ABSENT does not fire when a long speech exists in the closing 25%', async () => {
      // Same structure but closing zone (idx 10) has a long speech ≥10 words → no fire
      const f515bnr = [
        'INT. ROOM - DAY', '',
        'He enters the room.', '',
        'ALICE', 'This is a very long speech delivering important information with many words here.', '',
        'BOB', 'Short reply.', '',
        'ALICE', 'Another long speech with plenty of words covering many important points indeed now.', '',
        'BOB', 'Brief reply.', '',
        'ALICE', 'Yet another long speech exceeding ten words providing more detailed explanation here.', '',
        'BOB', 'Terse answer.', '',
        'ALICE', 'Middle section line.', '',
        'BOB', 'Continued line.', '',
        'ALICE', 'Short close.', '',
        'BOB', 'A substantive long speech near the end of the scene about the resolution here.', '',
        'ALICE', 'Final words.', '',
        'BOB', 'Done.',
      ].join('\n');
      const res = await runV515(f515bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_CLOSING_ZONE_LONG_ABSENT'), 'DIALOGUE_CLOSING_ZONE_LONG_ABSENT should not fire');
    });

    it('DIALOGUE_NEGATION_RUN fires when ≥4 consecutive dialogue lines contain a negation', async () => {
      // 8 dialogue lines; negation run at idx 2,3,4,5 (won't, not, can't, nobody) → maxNegRun=4 → fires
      const f515c = [
        'INT. ROOM - DAY', '',
        'He enters.', '',
        'ALICE', 'A normal opening statement here.', '',
        'BOB', 'Reply here today.', '',
        'ALICE', "She won't do that.", '',
        'BOB', "It's not right here.", '',
        'ALICE', "She can't accept.", '',
        'BOB', 'Nobody will know.', '',
        'ALICE', 'Normal middle line.', '',
        'BOB', 'Final line here.',
      ].join('\n');
      const res = await runV515(f515c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_NEGATION_RUN'), 'DIALOGUE_NEGATION_RUN should fire');
    });

    it('DIALOGUE_NEGATION_RUN does not fire when negations are scattered with no consecutive run ≥ 4', async () => {
      // 8 dialogue lines; negations at idx 1,3,5 scattered (max run = 1) → no fire
      const f515cnr = [
        'INT. ROOM - DAY', '',
        'He enters.', '',
        'ALICE', 'A normal opening statement here.', '',
        'BOB', "She won't do that.", '',
        'ALICE', 'I think it is alright.', '',
        'BOB', "It's not right here.", '',
        'ALICE', 'Normal line here.', '',
        'BOB', "She can't accept.", '',
        'ALICE', 'Normal middle line.', '',
        'BOB', 'Final line here.',
      ].join('\n');
      const res = await runV515(f515cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_NEGATION_RUN'), 'DIALOGUE_NEGATION_RUN should not fire');
    });
  });


  describe('Wave 501 — voicePass: dialogue question aftermath terse, opening zone exclamation absent, peak long early', async () => {
    const runV501 = async (fountain: string) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DIALOGUE_QUESTION_AFTERMATH_TERSE fires when all question lines are followed by ≤2-word responses', async () => {
      // 8 dialogue lines; questions at idx 0 and 2, both followed by ≤2-word responses → fires
      const f501a = [
        'INT. ROOM - DAY', '',
        'He enters the room.', '',
        'ALICE', 'What happened last night?', '',
        'BOB', 'Nothing.', '',
        'ALICE', 'Are you sure about that?', '',
        'BOB', 'Yes.', '',
        'ALICE', 'A longer statement without any question here.', '',
        'BOB', 'Indeed.', '',
        'ALICE', 'Another plain declaration of obvious fact.', '',
        'BOB', 'Fine.',
      ].join('\n');
      const res = await runV501(f501a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_QUESTION_AFTERMATH_TERSE'), 'DIALOGUE_QUESTION_AFTERMATH_TERSE should fire');
    });

    it('DIALOGUE_QUESTION_AFTERMATH_TERSE does not fire when a question gets a substantive response', async () => {
      // Same but question at idx 2 gets a 7-word response → not all terse → no fire
      const f501anr = [
        'INT. ROOM - DAY', '',
        'He enters the room.', '',
        'ALICE', 'What happened last night?', '',
        'BOB', 'Nothing.', '',
        'ALICE', 'Are you sure about that?', '',
        'BOB', 'I am completely certain about that now.', '',
        'ALICE', 'A longer statement without any question here.', '',
        'BOB', 'Indeed.', '',
        'ALICE', 'Another plain declaration of obvious fact.', '',
        'BOB', 'Fine.',
      ].join('\n');
      const res = await runV501(f501anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_QUESTION_AFTERMATH_TERSE'), 'DIALOGUE_QUESTION_AFTERMATH_TERSE should not fire');
    });

    it('DIALOGUE_OPENING_ZONE_EXCLAMATION_ABSENT fires when ≥4 exclamations exist but none in opening 25%', async () => {
      // 12 dialogue lines; openEnd=3; 4 exclamations all at idx 3,4,6,9 (≥openEnd) → fires
      const f501b = [
        'INT. ROOM - DAY', '',
        'He enters.', '',
        'ALICE', 'Regular opening line.', '',
        'BOB', 'Another regular line.', '',
        'ALICE', 'Plain start here.', '',
        'BOB', 'Now things heat up indeed!', '',
        'ALICE', 'What a revelation there!', '',
        'BOB', 'Normal middle statement.', '',
        'ALICE', 'Incredible result achieved!', '',
        'BOB', 'Ordinary remark here.', '',
        'ALICE', 'Normal line again.', '',
        'BOB', 'What an outcome!', '',
        'ALICE', 'Final plain remark.', '',
        'BOB', 'Last line here.',
      ].join('\n');
      const res = await runV501(f501b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_OPENING_ZONE_EXCLAMATION_ABSENT'), 'DIALOGUE_OPENING_ZONE_EXCLAMATION_ABSENT should fire');
    });

    it('DIALOGUE_OPENING_ZONE_EXCLAMATION_ABSENT does not fire when an exclamation exists in the opening 25%', async () => {
      // Same but idx 2 ends with '!' (in opening zone, < openEnd=3) → openingExcl=1 > 0 → no fire
      const f501bnr = [
        'INT. ROOM - DAY', '',
        'He enters.', '',
        'ALICE', 'Regular opening line.', '',
        'BOB', 'Another regular line.', '',
        'ALICE', 'What a start this is!', '',
        'BOB', 'Now things heat up indeed!', '',
        'ALICE', 'What a revelation there!', '',
        'BOB', 'Normal middle statement.', '',
        'ALICE', 'Incredible result achieved!', '',
        'BOB', 'Ordinary remark here.', '',
        'ALICE', 'Normal line again.', '',
        'BOB', 'What an outcome!', '',
        'ALICE', 'Final plain remark.', '',
        'BOB', 'Last line here.',
      ].join('\n');
      const res = await runV501(f501bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_OPENING_ZONE_EXCLAMATION_ABSENT'), 'DIALOGUE_OPENING_ZONE_EXCLAMATION_ABSENT should not fire');
    });

    it('DIALOGUE_PEAK_LONG_EARLY fires when the longest speech (≥10 words) is in the opening 25% while ≥3 long speeches exist later', async () => {
      // 8 dialogue lines; openEnd=2; idx 0 has 17 words (peak, in opening); idx 2,4,6 each ≥10 words → fires
      const f501c = [
        'INT. ROOM - DAY', '',
        'He enters the room.', '',
        'ALICE', 'This is a very long elaborate speech that Alice delivers at the very opening here.', '',
        'BOB', 'Short reply.', '',
        'ALICE', 'This is a long middle speech covering several important points here.', '',
        'BOB', 'Brief response.', '',
        'ALICE', 'Another long speech going into detail about everything that has happened so far.', '',
        'BOB', 'Short answer.', '',
        'ALICE', 'Also elaborating about the final resolution of all the issues presented here.', '',
        'BOB', 'Ok.',
      ].join('\n');
      const res = await runV501(f501c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_PEAK_LONG_EARLY'), 'DIALOGUE_PEAK_LONG_EARLY should fire');
    });

    it('DIALOGUE_PEAK_LONG_EARLY does not fire when the longest speech is outside the opening 25%', async () => {
      // 8 dialogue lines; openEnd=2; idx 4 has the longest speech (at idx 4 ≥ openEnd=2) → no fire
      const f501cnr = [
        'INT. ROOM - DAY', '',
        'He enters the room.', '',
        'ALICE', 'Short opening here.', '',
        'BOB', 'Brief reply.', '',
        'ALICE', 'This is a long middle speech covering several important points here.', '',
        'BOB', 'Brief response.', '',
        'ALICE', 'This is the very longest elaborate speech Alice delivers now at this dramatic juncture.', '',
        'BOB', 'Short answer.', '',
        'ALICE', 'Also elaborating about the final resolution of all the issues presented here.', '',
        'BOB', 'Ok.',
      ].join('\n');
      const res = await runV501(f501cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_PEAK_LONG_EARLY'), 'DIALOGUE_PEAK_LONG_EARLY should not fire');
    });
  });


  describe('Wave 487 — voicePass: dialogue monologue aftermath terse, dialogue exclamation zone cluster, dialogue closing zone question absent', async () => {
    const runV487 = async (fountain: string) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DIALOGUE_MONOLOGUE_AFTERMATH_TERSE fires when all long speeches are followed by ≤2-word responses', async () => {
      // 8 dialogue lines; long speeches at idx 0 and 2 (both ≥10 words, not last);
      // both followed by ≤2-word responses ("Yes." and "Fine.") → fire
      const f487a = [
        'INT. ROOM - DAY', '',
        'He enters the room.', '',
        'ALICE', 'This is a very long speech that goes on for quite a while and covers important matters at length.', '',
        'BOB', 'Yes.', '',
        'ALICE', 'Another extremely long speech where Alice elaborates at great length about the situation unfolding here.', '',
        'BOB', 'Fine.', '',
        'ALICE', 'Brief speech.', '',
        'BOB', 'Brief answer.', '',
        'ALICE', 'Another brief.', '',
        'BOB', 'Short reply.',
      ].join('\n');
      const res = await runV487(f487a);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_MONOLOGUE_AFTERMATH_TERSE'), 'DIALOGUE_MONOLOGUE_AFTERMATH_TERSE should fire');
    });

    it('DIALOGUE_MONOLOGUE_AFTERMATH_TERSE does not fire when a long speech gets a substantive response', async () => {
      // idx 2 long speech followed by a 9-word response → not all terse → no fire
      const f487anr = [
        'INT. ROOM - DAY', '',
        'He enters the room.', '',
        'ALICE', 'This is a very long speech that goes on for quite a while and covers important matters at length.', '',
        'BOB', 'Yes.', '',
        'ALICE', 'Another extremely long speech where Alice elaborates at great length about the situation unfolding here.', '',
        'BOB', 'That is a genuinely good point worth considering here.', '',
        'ALICE', 'Brief speech.', '',
        'BOB', 'Brief answer.', '',
        'ALICE', 'Another brief.', '',
        'BOB', 'Short reply.',
      ].join('\n');
      const res = await runV487(f487anr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_MONOLOGUE_AFTERMATH_TERSE'), 'DIALOGUE_MONOLOGUE_AFTERMATH_TERSE should not fire');
    });

    it('DIALOGUE_EXCLAMATION_ZONE_CLUSTER fires when >75% of exclamation lines fall in one third', async () => {
      // 12 dialogue lines; third=4; 4 exclamations all at zone1 (idx 0-3) → 4/4=100% > 75% → fire
      const f487b = [
        'INT. ROOM - DAY', '',
        'He enters.', '',
        'ALICE', 'Incredible result!', '',
        'BOB', 'Amazing news!', '',
        'ALICE', 'What a day!', '',
        'BOB', 'Truly remarkable!', '',
        'ALICE', 'Regular line here.', '',
        'BOB', 'Plain response.', '',
        'ALICE', 'Another regular line.', '',
        'BOB', 'Simple answer.', '',
        'ALICE', 'Normal statement.', '',
        'BOB', 'Ordinary remark.', '',
        'ALICE', 'Common dialogue.', '',
        'BOB', 'Standard reply.',
      ].join('\n');
      const res = await runV487(f487b);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_EXCLAMATION_ZONE_CLUSTER'), 'DIALOGUE_EXCLAMATION_ZONE_CLUSTER should fire');
    });

    it('DIALOGUE_EXCLAMATION_ZONE_CLUSTER does not fire when exclamation lines are distributed across thirds', async () => {
      // 12 dialogue lines; 4 exclamations: zone1=1 (idx 1), zone2=1 (idx 5), zone3=2 (idx 8, 11) → max=2/4=50% < 75%
      const f487bnr = [
        'INT. ROOM - DAY', '',
        'He enters.', '',
        'ALICE', 'Regular line.', '',
        'BOB', 'Amazing news!', '',
        'ALICE', 'Normal line.', '',
        'BOB', 'Another normal.', '',
        'ALICE', 'Regular again.', '',
        'BOB', 'What a moment!', '',
        'ALICE', 'Plain line here.', '',
        'BOB', 'Simple statement.', '',
        'ALICE', 'Truly remarkable!', '',
        'BOB', 'Normal remark.', '',
        'ALICE', 'Common line.', '',
        'BOB', 'Great outcome!',
      ].join('\n');
      const res = await runV487(f487bnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_EXCLAMATION_ZONE_CLUSTER'), 'DIALOGUE_EXCLAMATION_ZONE_CLUSTER should not fire');
    });

    it('DIALOGUE_CLOSING_ZONE_QUESTION_ABSENT fires when no questions appear in the final 25% of dialogue', async () => {
      // 12 dialogue lines; questions at idx 2, 5, 8 — closingStart=9; final zone (9-11) has 0 questions → fire
      const f487c = [
        'INT. ROOM - DAY', '',
        'He enters.', '',
        'ALICE', 'Regular line.', '',
        'BOB', 'Regular line.', '',
        'ALICE', 'What are you thinking?', '',
        'BOB', 'Regular line.', '',
        'ALICE', 'Regular line.', '',
        'BOB', 'Can you explain that?', '',
        'ALICE', 'Regular line.', '',
        'BOB', 'Regular line.', '',
        'ALICE', 'Did you see that before?', '',
        'BOB', 'Regular line.', '',
        'ALICE', 'Regular closing.', '',
        'BOB', 'Final statement here.',
      ].join('\n');
      const res = await runV487(f487c);
      assert.ok(res.issues.some((is: any) => is.rule === 'DIALOGUE_CLOSING_ZONE_QUESTION_ABSENT'), 'DIALOGUE_CLOSING_ZONE_QUESTION_ABSENT should fire');
    });

    it('DIALOGUE_CLOSING_ZONE_QUESTION_ABSENT does not fire when a question exists in the final 25%', async () => {
      // Same layout but idx 10 is a question → closingQuestions=1 > 0 → no fire
      const f487cnr = [
        'INT. ROOM - DAY', '',
        'He enters.', '',
        'ALICE', 'Regular line.', '',
        'BOB', 'Regular line.', '',
        'ALICE', 'What are you thinking?', '',
        'BOB', 'Regular line.', '',
        'ALICE', 'Regular line.', '',
        'BOB', 'Can you explain that?', '',
        'ALICE', 'Regular line.', '',
        'BOB', 'Regular line.', '',
        'ALICE', 'Did you see that before?', '',
        'BOB', 'Regular line.', '',
        'ALICE', 'Are we done here?', '',
        'BOB', 'Final statement here.',
      ].join('\n');
      const res = await runV487(f487cnr);
      assert.ok(!res.issues.some((is: any) => is.rule === 'DIALOGUE_CLOSING_ZONE_QUESTION_ABSENT'), 'DIALOGUE_CLOSING_ZONE_QUESTION_ABSENT should not fire');
    });
  });


  describe('Wave 473 — voicePass: dialogue question zone cluster, dialogue opening zone long absent, dialogue per-character length skew', async () => {
    const runV473 = async (fountain: string) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DIALOGUE_QUESTION_ZONE_CLUSTER fires when >75% of questions fall in a single zone', async () => {
      // 12 dialogue lines; first zone (indices 0-3): 4 questions = 100% → fires
      const f473a = [
        'INT. ROOM - DAY',
        '',
        'He enters the room.',
        '',
        'ALICE',
        'Are you coming today?',
        '',
        'BOB',
        'Did you hear the news?',
        '',
        'ALICE',
        'Have you seen the report?',
        '',
        'BOB',
        'Is everything in order now?',
        '',
        'ALICE',
        'We move tonight on schedule.',
        '',
        'BOB',
        'The plan is fully ready.',
        '',
        'ALICE',
        'Everything has been arranged carefully.',
        '',
        'BOB',
        'We have confirmed all details.',
        '',
        'ALICE',
        'The signal comes at midnight sharp.',
        '',
        'BOB',
        'We depart before the morning light.',
        '',
        'ALICE',
        'Nothing can stop this mission now.',
        '',
        'BOB',
        'All preparations are complete today.',
      ].join('\n');
      const res = await runV473(f473a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_QUESTION_ZONE_CLUSTER'), 'DIALOGUE_QUESTION_ZONE_CLUSTER should fire');
    });

    it('DIALOGUE_QUESTION_ZONE_CLUSTER does not fire when questions are distributed across zones', async () => {
      // 12 dialogue lines; questions at indices 0, 4, 8 → spread across all three zones
      const f473anr = [
        'INT. OFFICE - DAY',
        '',
        'She sits.',
        '',
        'ALICE',
        'Are you ready now?',
        '',
        'BOB',
        'Yes I am definitely ready.',
        '',
        'ALICE',
        'Good. We proceed at dawn.',
        '',
        'BOB',
        'The plan is all set.',
        '',
        'ALICE',
        'Did you check the supplies?',
        '',
        'BOB',
        'Everything is ready and packed.',
        '',
        'ALICE',
        'The team is assembled here.',
        '',
        'BOB',
        'We can depart when ready.',
        '',
        'ALICE',
        'Will you lead the way?',
        '',
        'BOB',
        'I know exactly what to do.',
        '',
        'ALICE',
        'Then let us begin the mission.',
        '',
        'BOB',
        'Nothing will go wrong now.',
      ].join('\n');
      const res = await runV473(f473anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_QUESTION_ZONE_CLUSTER'), 'DIALOGUE_QUESTION_ZONE_CLUSTER should not fire');
    });

    it('DIALOGUE_OPENING_ZONE_LONG_ABSENT fires when first 25% is all short and later has ≥3 long speeches', async () => {
      // 12 dialogue lines; first 3 (25%) are all short; lines 3-11 include 4 long speeches ≥10 words
      const f473b = [
        'INT. STUDY - DAY',
        '',
        'He thinks.',
        '',
        'ALICE',
        'Yes.',
        '',
        'BOB',
        'No.',
        '',
        'ALICE',
        'Okay.',
        '',
        'BOB',
        'I have been thinking about this situation for a long time now.',
        '',
        'ALICE',
        'The matter is far more complicated than any of us originally anticipated.',
        '',
        'BOB',
        'We need to consider all the different possible options available to us.',
        '',
        'ALICE',
        'There are serious consequences to every action we take in this situation.',
        '',
        'BOB',
        'Good.',
        '',
        'ALICE',
        'Fine.',
        '',
        'BOB',
        'Agreed.',
        '',
        'ALICE',
        'Right.',
        '',
        'BOB',
        'Sure.',
      ].join('\n');
      const res = await runV473(f473b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_OPENING_ZONE_LONG_ABSENT'), 'DIALOGUE_OPENING_ZONE_LONG_ABSENT should fire');
    });

    it('DIALOGUE_OPENING_ZONE_LONG_ABSENT does not fire when the opening zone includes a long speech', async () => {
      // 12 dialogue lines; line 0 (first zone) is ≥10 words → condition not met
      const f473bnr = [
        'INT. STUDY - DAY',
        '',
        'She reads.',
        '',
        'ALICE',
        'I have been thinking about this for quite some time now.',
        '',
        'BOB',
        'Yes.',
        '',
        'ALICE',
        'Okay.',
        '',
        'BOB',
        'I have been thinking about this situation for a long time.',
        '',
        'ALICE',
        'The matter is far more complicated than we anticipated today.',
        '',
        'BOB',
        'We need all options on the table before we can proceed.',
        '',
        'ALICE',
        'There are consequences to every action we take in this case.',
        '',
        'BOB',
        'Good.',
        '',
        'ALICE',
        'Fine.',
        '',
        'BOB',
        'Agreed.',
        '',
        'ALICE',
        'Right.',
        '',
        'BOB',
        'Sure.',
      ].join('\n');
      const res = await runV473(f473bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_OPENING_ZONE_LONG_ABSENT'), 'DIALOGUE_OPENING_ZONE_LONG_ABSENT should not fire');
    });

    it('DIALOGUE_PER_CHARACTER_LENGTH_SKEW fires when max/min per-character avg speech length ≥ 3.0', async () => {
      // ALICE: 3 lines ~15 words each; BOB: 3 lines ~14 words each; CAROL: 3 lines ~1 word each
      // ratio ≈ 15/1 = 15 ≥ 3 → fires
      const f473c = [
        'INT. HALL - DAY',
        '',
        'They gather.',
        '',
        'ALICE',
        'I have been thinking carefully about this complicated situation for a very long time.',
        '',
        'BOB',
        'The matter at hand requires careful consideration of all possible outcomes and approaches.',
        '',
        'CAROL',
        'Yes.',
        '',
        'ALICE',
        'We need to evaluate every possible path forward before making any final decisions here.',
        '',
        'BOB',
        'Moving forward requires a complete understanding of the full picture and all consequences.',
        '',
        'CAROL',
        'No.',
        '',
        'ALICE',
        'The situation demands that we take our time and consider every single option available.',
        '',
        'BOB',
        'I agree completely that a thorough analysis is required before we take any action.',
        '',
        'CAROL',
        'Okay.',
      ].join('\n');
      const res = await runV473(f473c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_PER_CHARACTER_LENGTH_SKEW'), 'DIALOGUE_PER_CHARACTER_LENGTH_SKEW should fire');
    });

    it('DIALOGUE_PER_CHARACTER_LENGTH_SKEW does not fire when per-character avg lengths are within 3× of each other', async () => {
      // ALICE, BOB, CAROL all have similar avg lengths ~5-7 words; ratio < 3
      const f473cnr = [
        'INT. HALL - DAY',
        '',
        'They sit.',
        '',
        'ALICE',
        'We should go to the market.',
        '',
        'BOB',
        'I agree with that plan today.',
        '',
        'CAROL',
        'Sure, sounds good enough to me.',
        '',
        'ALICE',
        'The timing works well for all.',
        '',
        'BOB',
        'Let us leave at noon then.',
        '',
        'CAROL',
        'Fine, I will be there soon.',
        '',
        'ALICE',
        'Great, see you all at noon.',
        '',
        'BOB',
        'Perfect, we have a solid plan.',
        '',
        'CAROL',
        'Good, I look forward to it.',
      ].join('\n');
      const res = await runV473(f473cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_PER_CHARACTER_LENGTH_SKEW'), 'DIALOGUE_PER_CHARACTER_LENGTH_SKEW should not fire');
    });
  });


  describe('Wave 459 — voicePass: dialogue assertion run, dialogue single char domination, dialogue monologue unprompted', async () => {
    const runV459 = async (fountain: string) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DIALOGUE_ASSERTION_RUN fires when 5+ consecutive dialogue lines all end declaratively', async () => {
      // 7 consecutive dialogue lines, none ending in '?' or '!' → max declarative run = 7 ≥ 5
      const f459a = [
        'INT. ROOM - DAY',
        '',
        'He sits down.',
        '',
        'ALICE',
        'I think we should go tonight.',
        '',
        'BOB',
        'The plan is ready and waiting.',
        '',
        'ALICE',
        'We need to move before dawn.',
        '',
        'BOB',
        'The timing works in our favor.',
        '',
        'ALICE',
        'Everything has been arranged carefully.',
        '',
        'BOB',
        'We have no reason to delay.',
        '',
        'ALICE',
        'This is the only real option.',
        '',
        'BOB',
        'Are you ready then?',
        '',
        'ALICE',
        'Yes.',
        '',
        'BOB',
        'Good.',
      ].join('\n');
      const res = await runV459(f459a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_ASSERTION_RUN'), 'DIALOGUE_ASSERTION_RUN should fire');
    });

    it('DIALOGUE_ASSERTION_RUN does not fire when max declarative run is only 4', async () => {
      // Run of 4 declaratives, then a question, then more declaratives → max = 4 < 5
      const f459anr = [
        'INT. ROOM - DAY',
        '',
        'She enters.',
        '',
        'ALICE',
        'I think we should go tonight.',
        '',
        'BOB',
        'The plan is ready and waiting.',
        '',
        'ALICE',
        'We need to move before dawn.',
        '',
        'BOB',
        'The timing works in our favor.',
        '',
        'ALICE',
        'Are you sure about this?',
        '',
        'BOB',
        'Everything has been arranged.',
        '',
        'ALICE',
        'We have no reason to delay.',
        '',
        'BOB',
        'This is our only option.',
        '',
        'ALICE',
        'Then we move at midnight.',
      ].join('\n');
      const res = await runV459(f459anr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_ASSERTION_RUN'), 'DIALOGUE_ASSERTION_RUN should not fire');
    });

    it('DIALOGUE_SINGLE_CHAR_DOMINATION fires when one character has >70% of dialogue lines', async () => {
      // ALICE has 8 lines, BOB 1, CAROL 1, DAN 1 → 8/11 ≈ 73% > 70%, 4 speakers ≥ 3
      const f459b = [
        'INT. ROOM - DAY',
        '',
        'She speaks.',
        '',
        'ALICE',
        'Line one from Alice.',
        '',
        'ALICE',
        'Line two from Alice.',
        '',
        'ALICE',
        'Line three from Alice.',
        '',
        'ALICE',
        'Line four from Alice.',
        '',
        'ALICE',
        'Line five from Alice.',
        '',
        'ALICE',
        'Line six from Alice.',
        '',
        'ALICE',
        'Line seven from Alice.',
        '',
        'ALICE',
        'Line eight from Alice.',
        '',
        'BOB',
        'Bob speaks once.',
        '',
        'CAROL',
        'Carol speaks once.',
        '',
        'DAN',
        'Dan speaks once.',
      ].join('\n');
      const res = await runV459(f459b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_SINGLE_CHAR_DOMINATION'), 'DIALOGUE_SINGLE_CHAR_DOMINATION should fire');
    });

    it('DIALOGUE_SINGLE_CHAR_DOMINATION does not fire when no character exceeds 70%', async () => {
      // ALICE 6, BOB 2, CAROL 2 → 6/10 = 60% < 70% → no fire
      const f459bnr = [
        'INT. ROOM - DAY',
        '',
        'They talk.',
        '',
        'ALICE',
        'Line one.',
        '',
        'ALICE',
        'Line two.',
        '',
        'ALICE',
        'Line three.',
        '',
        'ALICE',
        'Line four.',
        '',
        'ALICE',
        'Line five.',
        '',
        'ALICE',
        'Line six.',
        '',
        'BOB',
        'Bob speaks.',
        '',
        'BOB',
        'Bob again.',
        '',
        'CAROL',
        'Carol speaks.',
        '',
        'CAROL',
        'Carol again.',
      ].join('\n');
      const res = await runV459(f459bnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_SINGLE_CHAR_DOMINATION'), 'DIALOGUE_SINGLE_CHAR_DOMINATION should not fire');
    });

    it('DIALOGUE_MONOLOGUE_UNPROMPTED fires when no long speech is preceded by a question', async () => {
      // 3 long speeches (≥10w), none preceded within 2 lines by a '?' line
      const f459c = [
        'INT. ROOM - DAY',
        '',
        'He stands.',
        '',
        'ALICE',
        'Yes.',
        '',
        'BOB',
        'I have been waiting for this moment for a very long time.',
        '',
        'ALICE',
        'Understood.',
        '',
        'BOB',
        'The situation demands that we act with great care and deliberation.',
        '',
        'ALICE',
        'Agreed.',
        '',
        'BOB',
        'We will proceed according to the plan we established at the beginning.',
        '',
        'ALICE',
        'Fine.',
        '',
        'BOB',
        'Good.',
      ].join('\n');
      const res = await runV459(f459c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_MONOLOGUE_UNPROMPTED'), 'DIALOGUE_MONOLOGUE_UNPROMPTED should fire');
    });

    it('DIALOGUE_MONOLOGUE_UNPROMPTED does not fire when at least one long speech follows a question', async () => {
      // Second long speech is immediately preceded by a question from Alice → upstream cause
      const f459cnr = [
        'INT. ROOM - DAY',
        '',
        'She waits.',
        '',
        'ALICE',
        'Yes.',
        '',
        'BOB',
        'I have been waiting for this moment for a very long time.',
        '',
        'ALICE',
        'What exactly do you mean by that?',
        '',
        'BOB',
        'The situation demands that we act with great care and deliberation.',
        '',
        'ALICE',
        'Agreed.',
        '',
        'BOB',
        'We will proceed according to the plan we established at the beginning.',
        '',
        'ALICE',
        'Fine.',
        '',
        'BOB',
        'Good.',
      ].join('\n');
      const res = await runV459(f459cnr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_MONOLOGUE_UNPROMPTED'), 'DIALOGUE_MONOLOGUE_UNPROMPTED should not fire');
    });
  });


  describe('Wave 445 — voicePass: dialogue question run, action scene intro heavy, dialogue declarative aftermath question', async () => {
    const runV445 = async (fountain: string) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };
    const dlgLine445 = (text: string) => `ALEX\n${text}`;
    const dlgFountain445 = (lines: string[]) =>
      `INT. ROOM - DAY\n\n${lines.map(dlgLine445).join('\n\n')}\n`;

    it('DIALOGUE_QUESTION_RUN fires when ≥4 consecutive dialogue lines end with "?"', async () => {
      // 10 dialogue lines; lines 2–5 each end with "?" → run of 4 ≥ 4 → fires
      const lines445a = [
        'We need to leave now.',
        'Where are you going?',
        'Why do you ask that?',
        'What does it matter here?',
        'Do you even care at all?',
        'She crosses to the window.',
        'He picks up the phone.',
        'Tell me what you saw.',
        'She closes the door.',
        'He sits down quietly.',
      ];
      const res = await runV445(dlgFountain445(lines445a));
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_QUESTION_RUN'), 'DIALOGUE_QUESTION_RUN should fire');
    });

    it('DIALOGUE_QUESTION_RUN does NOT fire when question-ending lines never reach four in a row', async () => {
      // Questions at positions 1,2,3 then non-question, then 5,6 then non-question — max run = 3
      const lines445aNF = [
        'We need to leave now.',
        'Where are you going?',
        'Why do you ask?',
        'What does it matter?',
        'She crosses to the window.',
        'Do you even care?',
        'Are you serious about this?',
        'Tell me what you saw.',
        'She closes the door.',
        'He sits down quietly.',
      ];
      const res = await runV445(dlgFountain445(lines445aNF));
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_QUESTION_RUN'), 'DIALOGUE_QUESTION_RUN should not fire');
    });

    it('ACTION_SCENE_INTRO_HEAVY fires when first action line per scene averages >2× subsequent action lines', async () => {
      // 6 scenes: each with a long intro (~14w) and one short body line (~2w)
      const introLine = 'She steps carefully through the doorway and surveys the room with practiced calm.';
      const sceneF = (i: number) =>
        `INT. SCENE${i} - DAY\n\n${introLine}\n\nHe nods.`;
      const f445b = Array.from({ length: 6 }, (_, i) => sceneF(i)).join('\n\n');
      const res = await runV445(f445b);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_SCENE_INTRO_HEAVY'), 'ACTION_SCENE_INTRO_HEAVY should fire');
    });

    it('ACTION_SCENE_INTRO_HEAVY does NOT fire when scene intro and body action lines are similar lengths', async () => {
      // 6 scenes: intro ~5w, body ~5w — ratio ≈ 1 < 2
      const f445bNF = Array.from({ length: 6 }, (_, i) =>
        `INT. SCENE${i} - DAY\n\nShe enters the room.\n\nHe follows her inside.`
      ).join('\n\n');
      const res = await runV445(f445bNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_SCENE_INTRO_HEAVY'), 'ACTION_SCENE_INTRO_HEAVY should not fire');
    });

    it('DIALOGUE_DECLARATIVE_AFTERMATH_QUESTION fires when every declarative is immediately followed by a question', async () => {
      // 10 lines alternating: declarative at 0,2,4,6,8 each followed by question at 1,3,5,7,9
      // qualDecl=[0,2,4,6,8] (5 >= 3), every dlg[qi+1] ends in '?'
      // maxRun=1 (no two consecutive questions) so DIALOGUE_QUESTION_RUN does NOT co-fire
      const lines445c = [
        'She crosses to the window.',  // 0: declarative → dlg[1] ends '?'
        'Where are you going?',        // 1: question
        'I need some air.',            // 2: declarative → dlg[3] ends '?'
        'Why do you need air?',        // 3: question
        'He picks up the phone.',      // 4: declarative → dlg[5] ends '?'
        'Who are you calling?',        // 5: question
        'She closes the door.',        // 6: declarative → dlg[7] ends '?'
        'Why did you do that?',        // 7: question
        'Tell me what happened.',      // 8: declarative → dlg[9] ends '?'
        'What do you mean exactly?',   // 9: question (last line — not checked as index)
      ];
      const res = await runV445(dlgFountain445(lines445c));
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_DECLARATIVE_AFTERMATH_QUESTION'), 'DIALOGUE_DECLARATIVE_AFTERMATH_QUESTION should fire');
    });

    it('DIALOGUE_DECLARATIVE_AFTERMATH_QUESTION does NOT fire when a declarative is followed by another declarative', async () => {
      // dlg[0]='She crosses to the window.' (declarative) → dlg[1]='I need some air.' (not '?') → every() fails
      const lines445cNF = [
        'She crosses to the window.',  // 0: declarative → dlg[1]='I need some air.' — not '?' → no fire
        'I need some air.',            // 1: declarative
        'He picks up the phone.',      // 2: declarative → dlg[3]='Why do you need air?' ✓
        'Why do you need air?',        // 3: question
        'She closes the door.',        // 4: declarative → dlg[5]='Who are you calling?' ✓
        'Who are you calling?',        // 5: question
        'Tell me what happened.',      // 6: declarative → dlg[7]='Why did you do that?' ✓
        'Why did you do that?',        // 7: question
        'He looks at her.',            // 8: declarative → dlg[9]='I understand now.' — not '?' → fails
        'I understand now.',           // 9: declarative
      ];
      const res = await runV445(dlgFountain445(lines445cNF));
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_DECLARATIVE_AFTERMATH_QUESTION'), 'DIALOGUE_DECLARATIVE_AFTERMATH_QUESTION should not fire');
    });
  });


  describe('Wave 431 — voicePass: dialogue I-opener run, dialogue length outlier, dialogue hedged-question flood', async () => {
    const runV431 = async (fountain: string) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };
    // Build a dialogue-only fountain: each line preceded by its own character cue.
    const dlgFountain431 = (lines: string[], chr = 'ALEX', slug = 'INT. ROOM - DAY') =>
      `${slug}\n\n${lines.map(l => `${chr}\n${l}`).join('\n\n')}\n`;

    it('DIALOGUE_I_OPENER_RUN fires when four or more consecutive dialogue lines begin with "I"', async () => {
      // 8 lines; lines 2–5 each begin with "I"/"I'm" → run of 4 ≥ 4 → fires
      const lines431a = [
        'We need to talk about this.',
        'I want to leave right now.',
        'I can\'t stay in this house.',
        'I never agreed to any of it.',
        'I\'m done waiting for an answer.',
        'You should go before it starts.',
        'She left without saying goodbye.',
        'Tell me everything you saw tonight.',
      ];
      const res = await runV431(dlgFountain431(lines431a));
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_I_OPENER_RUN'), 'DIALOGUE_I_OPENER_RUN should fire');
    });

    it('DIALOGUE_I_OPENER_RUN does NOT fire when "I" openers never reach four in a row', async () => {
      // 8 lines; longest consecutive "I" run is 3 (lines 1–3), broken by line 4 → no fire
      const lines431aNF = [
        'I want to leave right now.',
        'I can\'t stay in this house.',
        'I never agreed to this plan.',
        'You should go before it starts.',
        'I\'m done waiting for an answer.',
        'We can talk about it later.',
        'She left without saying goodbye.',
        'Tell me everything you saw tonight.',
      ];
      const res = await runV431(dlgFountain431(lines431aNF));
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_I_OPENER_RUN'), 'DIALOGUE_I_OPENER_RUN should not fire');
    });

    it('DIALOGUE_LENGTH_OUTLIER fires when one dialogue line towers over the rest (≥30 words and ≥4× mean)', async () => {
      // 11 three-word lines + one 38-word line → mean ≈ 5.9, max 38 ≥ 30 and ≥ 4× mean → fires
      const lines431b = [
        'Stop the car.',
        'Hand it over.',
        'Get down now.',
        'Watch the door.',
        'Hold the line.',
        'Check the back.',
        'Find the key.',
        'Cut the wire.',
        'Take the stairs.',
        'Block the exit.',
        'Call for backup.',
        'Listen to me very carefully because we only get one shot at this and if anyone moves too early the whole plan collapses and every single one of us ends up either captured or dead before sunrise tomorrow.',
      ];
      const res = await runV431(dlgFountain431(lines431b));
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_LENGTH_OUTLIER'), 'DIALOGUE_LENGTH_OUTLIER should fire');
    });

    it('DIALOGUE_LENGTH_OUTLIER does NOT fire when dialogue lengths are moderate with no extreme outlier', async () => {
      // 12 lines each ~9–13 words; max well under 30 and under 4× mean → no fire
      const lines431bNF = [
        'We should leave before the storm finally reaches the coast.',
        'She told me the whole story over dinner last night.',
        'He kept the letters hidden in the attic for years.',
        'They never found out who left the door wide open.',
        'I keep wondering what he meant by that strange remark.',
        'The car broke down twice on the way to town.',
        'Nobody answered the phone when she called the second time.',
        'We met at the harbor when the tide was low.',
        'He smiled like he already knew how it would end.',
        'The letter said far more than she ever said aloud.',
        'We should have stayed when we still had the chance.',
        'I painted the whole back fence before the rain came.',
      ];
      const res = await runV431(dlgFountain431(lines431bNF));
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_LENGTH_OUTLIER'), 'DIALOGUE_LENGTH_OUTLIER should not fire');
    });

    it('DIALOGUE_HEDGED_QUESTION_FLOOD fires when >20% of lines both hedge and end in a question', async () => {
      // 4 of 12 lines hedge AND end in "?" → 33% > 20% → fires
      const lines431c = [
        'Maybe we should go now?',
        'I think it\'s the right one?',
        'Kind of strange, isn\'t it?',
        'Perhaps she already knew the truth?',
        'We leave at dawn.',
        'Hand me the map.',
        'The door is locked.',
        'She never called back.',
        'Get the car ready.',
        'He left an hour ago.',
        'Lock everything down.',
        'Find the other exit.',
      ];
      const res = await runV431(dlgFountain431(lines431c));
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_HEDGED_QUESTION_FLOOD'), 'DIALOGUE_HEDGED_QUESTION_FLOOD should fire');
    });

    it('DIALOGUE_HEDGED_QUESTION_FLOOD does NOT fire when hedges and questions rarely co-occur', async () => {
      // Only 2 of 12 lines are hedged questions (a confident question and a hedge-without-? are excluded) → 17% ≤ 20% → no fire
      const lines431cNF = [
        'Maybe we should go now?',
        'I think it\'s the right one?',
        'Is this the way out?',
        'Maybe we wait here a while.',
        'We leave at dawn.',
        'Hand me the map.',
        'The door is locked.',
        'She never called back.',
        'Get the car ready.',
        'He left an hour ago.',
        'Lock everything down.',
        'Find the other exit.',
      ];
      const res = await runV431(dlgFountain431(lines431cNF));
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_HEDGED_QUESTION_FLOOD'), 'DIALOGUE_HEDGED_QUESTION_FLOOD should not fire');
    });
  });


  describe('Wave 417 — voicePass: action line length uniformity, dialogue monosyllabic flood, dialogue negation flood', async () => {
    const runV417 = async (fountain: string) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ACTION_LINE_LENGTH_UNIFORMITY fires when every action line is the same length (low CV)', async () => {
      // 12 action lines, each exactly 9 words → CV = 0 < 0.30, mean = 9 ≥ 6 → fires
      const lines417a = [
        'A cold wind moves across the empty parking lot.',
        'The lights flicker once and then settle into place.',
        'Rain streaks the glass in long diagonal grey lines.',
        'A clock ticks somewhere behind the far office wall.',
        'Dust hangs in the slanted light near the door.',
        'Papers cover the desk in a chaotic loose pile.',
        'A phone buzzes against the wood and goes quiet.',
        'Shadows stretch long across the cracked tile kitchen floor.',
        'Steam rises slowly from a mug on the counter.',
        'A door swings shut at the far hallway end.',
        'Snow gathers on the sill outside the bedroom window.',
        'A faint hum comes from the old refrigerator unit.',
      ];
      const fountain417a = `INT. OFFICE - DAY\n\n${lines417a.join('\n\n')}\n`;
      const res = await runV417(fountain417a);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_LINE_LENGTH_UNIFORMITY'), 'ACTION_LINE_LENGTH_UNIFORMITY should fire');
    });

    it('ACTION_LINE_LENGTH_UNIFORMITY does NOT fire when action line lengths vary widely (high CV)', async () => {
      // 6 lines of 3 words + 6 lines of 15 words → mean 9, stddev 6, CV 0.67 ≥ 0.30 → no fire
      const lines417aNF = [
        'Thunder cracks overhead.',
        'The old detective limps slowly across the flooded warehouse floor toward the broken steel door.',
        'Glass shatters somewhere.',
        'A young woman crouches behind the rusted crates and watches the men move through shadows.',
        'Footsteps echo close.',
        'The guard sweeps his flashlight beam across the cavernous space and finds nothing but dust.',
        'Smoke fills everything.',
        'She pulls the heavy tarp aside to reveal a stack of unmarked wooden shipping crates.',
        'A whistle blows.',
        'A truck engine rumbles to life outside and headlights sweep through the high dirty windows.',
        'Lights flicker twice.',
        'He freezes mid-step as a low voice drifts from somewhere deep within the dark interior.',
      ];
      const fountain417aNF = `INT. WAREHOUSE - NIGHT\n\n${lines417aNF.join('\n\n')}\n`;
      const res = await runV417(fountain417aNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_LINE_LENGTH_UNIFORMITY'), 'ACTION_LINE_LENGTH_UNIFORMITY should not fire');
    });

    it('DIALOGUE_MONOSYLLABIC_FLOOD fires when >35% of dialogue lines are two words or fewer', async () => {
      // 7 of 12 lines ≤2 words → 58% > 35% → fires
      const lines417b = [
        'Yes.', 'No.', 'Why?', 'Stop.', 'Maybe.', 'Go.', 'Now.',
        'I don\'t think that\'s true.',
        'We should leave before dark.',
        'She never came back home.',
        'Tell me what you saw.',
        'Nothing about this feels right.',
      ];
      const chr417b = 'INTERROGATOR';
      const dlg417b = lines417b.map(l => `${chr417b}\n${l}`).join('\n\n');
      const fountain417b = `INT. CELL - DAY\n\n${dlg417b}\n`;
      const res = await runV417(fountain417b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_MONOSYLLABIC_FLOOD'), 'DIALOGUE_MONOSYLLABIC_FLOOD should fire');
    });

    it('DIALOGUE_MONOSYLLABIC_FLOOD does NOT fire when dialogue develops into full sentences', async () => {
      // 2 of 12 lines ≤2 words → 17% ≤ 35% → no fire
      const lines417bNF = [
        'Yes.', 'No.',
        'I keep thinking about what you told me last night.',
        'She walked out before either of us could explain.',
        'There has to be a reason he kept it hidden.',
        'We met at the harbor when the tide was low.',
        'I want to understand why everything fell apart so fast.',
        'He smiled like he already knew how it would end.',
        'The letter said more than she ever said aloud.',
        'Tell me everything you remember about that summer.',
        'We should have stayed when we still had the chance.',
        'I painted the whole fence before the rain came.',
      ];
      const chr417bNF = 'NARRATOR';
      const dlg417bNF = lines417bNF.map(l => `${chr417bNF}\n${l}`).join('\n\n');
      const fountain417bNF = `INT. PORCH - DUSK\n\n${dlg417bNF}\n`;
      const res = await runV417(fountain417bNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_MONOSYLLABIC_FLOOD'), 'DIALOGUE_MONOSYLLABIC_FLOOD should not fire');
    });

    it('DIALOGUE_NEGATION_FLOOD fires when >40% of dialogue lines carry a negation', async () => {
      // 8 of 12 lines negated → 67% > 40% → fires
      const lines417c = [
        'I can\'t do this anymore.',
        'There\'s nothing left to say.',
        'No one ever listens to me.',
        'I won\'t go back there.',
        'She never told me the truth.',
        'It doesn\'t matter now.',
        'Nobody knows what happened.',
        'I don\'t believe you.',
        'Maybe we should try again.',
        'I saw the whole thing.',
        'Tell me everything you remember.',
        'She left at dawn.',
      ];
      const chr417c = 'WIDOW';
      const dlg417c = lines417c.map(l => `${chr417c}\n${l}`).join('\n\n');
      const fountain417c = `INT. KITCHEN - NIGHT\n\n${dlg417c}\n`;
      const res = await runV417(fountain417c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_NEGATION_FLOOD'), 'DIALOGUE_NEGATION_FLOOD should fire');
    });

    it('DIALOGUE_NEGATION_FLOOD does NOT fire when dialogue is mostly assertive', async () => {
      // 3 of 12 lines negated → 25% ≤ 40% → no fire
      const lines417cNF = [
        'I can\'t stay long.',
        'Nothing surprises me anymore.',
        'She never wrote back.',
        'We met by the river yesterday.',
        'I want to understand this.',
        'Tell me about your sister.',
        'The house felt warm inside.',
        'He smiled when he saw me.',
        'Let\'s walk to the harbor.',
        'I remember that summer well.',
        'She painted the whole fence blue.',
        'Everyone gathered in the yard.',
      ];
      const chr417cNF = 'FRIEND';
      const dlg417cNF = lines417cNF.map(l => `${chr417cNF}\n${l}`).join('\n\n');
      const fountain417cNF = `INT. GARDEN - DAY\n\n${dlg417cNF}\n`;
      const res = await runV417(fountain417cNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_NEGATION_FLOOD'), 'DIALOGUE_NEGATION_FLOOD should not fire');
    });
  });


  describe('Wave 403 — voicePass: dialogue passive flood, dialogue imperative flood, action motion verb monotone', async () => {
    const runV403 = async (fountain: string) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DIALOGUE_PASSIVE_FLOOD fires when >25% of dialogue lines use passive constructions', async () => {
      const lines403a = [
        'He was told to leave immediately.',
        'She was fired by the committee.',
        'The plan was rejected before we arrived.',
        'He was found guilty of everything.',
        'It has been done before, many times.',
        'She was never consulted on the matter.',
        'The orders were given without question.',
        'He was betrayed by his own people.',
        'The truth was hidden for years.',
        'She has been waiting for this moment.',
        'He was warned not to come here.',
        'The contract was signed without her.',
        'Nothing was ever explained to us.',
        'She was chosen for her silence.',
        'He was replaced before dawn.',
        'The records were destroyed on purpose.',
        'She was left behind by everyone.',
        'He was promoted despite it all.',
        'The vote was rigged from the start.',
        'She was abandoned in the end.',
      ];
      const chr403a = 'DETECTIVE';
      const dlgBlock403a = lines403a.map(l => `${chr403a}\n${l}`).join('\n\n');
      const fountain403a = `INT. PRECINCT - DAY\n\n${dlgBlock403a}\n`;
      const res = await runV403(fountain403a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_PASSIVE_FLOOD'), 'DIALOGUE_PASSIVE_FLOOD should fire');
    });

    it('DIALOGUE_PASSIVE_FLOOD does NOT fire when dialogue uses active voice', async () => {
      const lines403aNF = [
        'She told him to leave.',
        'The committee fired her.',
        'He decided to reject the plan.',
        'The jury found him guilty.',
        'We did this once before.',
        'Nobody consulted her on anything.',
        'Someone gave those orders.',
        'His own people betrayed him.',
        'They hid the truth for years.',
        'She has been sitting here all morning.',
        'He warned us not to come.',
        'She signed the contract alone.',
        'Nobody explained anything to us.',
        'They chose her for her silence.',
        'He replaced her before dawn.',
        'Someone destroyed those records.',
        'Everyone left her behind.',
        'They promoted him despite it.',
        'Someone rigged the vote.',
        'He abandoned her in the end.',
      ];
      const chr403aNF = 'WITNESS';
      const dlgNF403a = lines403aNF.map(l => `${chr403aNF}\n${l}`).join('\n\n');
      const fountain403aNF = `INT. ROOM - DAY\n\n${dlgNF403a}\n`;
      const res = await runV403(fountain403aNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_PASSIVE_FLOOD'), 'DIALOGUE_PASSIVE_FLOOD should not fire');
    });

    it('DIALOGUE_IMPERATIVE_FLOOD fires when >30% of dialogue lines are commands', async () => {
      const lines403b = [
        'Go now, before they find us.',
        'Tell me what happened last night.',
        'Stop pretending you don\'t know.',
        'Get out of this house.',
        'Listen to what I\'m saying.',
        'Give me the key.',
        'Look at me when I speak to you.',
        'Run before they come back.',
        'Stay where you are.',
        'Find the folder and bring it here.',
        'Call him right now.',
        'Move away from the window.',
        'Put the gun down slowly.',
        'Keep your voice low.',
        'Hold on, I hear something.',
        'I don\'t know what to tell you.',
        'She left before I could explain.',
        'We never had a chance.',
        'Maybe things will change.',
        'He didn\'t mean what he said.',
      ];
      const chr403b = 'HANDLER';
      const dlgBlock403b = lines403b.map(l => `${chr403b}\n${l}`).join('\n\n');
      const fountain403b = `INT. SAFEHOUSE - NIGHT\n\n${dlgBlock403b}\n`;
      const res = await runV403(fountain403b);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_IMPERATIVE_FLOOD'), 'DIALOGUE_IMPERATIVE_FLOOD should fire');
    });

    it('DIALOGUE_IMPERATIVE_FLOOD does NOT fire when dialogue avoids command dominance', async () => {
      const lines403bNF = [
        'I don\'t know what to do anymore.',
        'She looked at me like I was a stranger.',
        'Maybe this is how it ends.',
        'I was thinking about what you said.',
        'The light here is wrong somehow.',
        'I can\'t sleep at all these days.',
        'Something feels different tonight.',
        'We should have left when we had the chance.',
        'I keep thinking about that moment.',
        'She never said a word to me.',
        'I don\'t believe any of this.',
        'It was different before all of this.',
        'I wonder what he actually meant.',
        'None of this makes sense to me.',
        'I felt it before I saw it.',
        'You were right about everything.',
        'I never wanted any of this.',
        'She was kind before she changed.',
        'I thought I understood the rules.',
        'Something broke that day and stayed broken.',
      ];
      const chr403bNF = 'ALEX';
      const dlgNF403b = lines403bNF.map(l => `${chr403bNF}\n${l}`).join('\n\n');
      const fountain403bNF = `INT. APARTMENT - NIGHT\n\n${dlgNF403b}\n`;
      const res = await runV403(fountain403bNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_IMPERATIVE_FLOOD'), 'DIALOGUE_IMPERATIVE_FLOOD should not fire');
    });

    it('ACTION_MOTION_VERB_MONOTONE fires when >50% of action lines use generic displacement verbs', async () => {
      const fountain403c = `INT. CORRIDOR - NIGHT

The figure walks toward the exit.

Marcus moves through the shadows.

She enters the room without a sound.

He crosses to the window and pauses.

The guard turns at the far end.

She heads toward the stairwell.

The man approaches the door slowly.

He exits the corridor in silence.

She reaches the landing above.

He comes to a stop by the pillar.

Marcus goes back the way he came.

She walks in a wide arc around it.
`;
      const res = await runV403(fountain403c);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_MOTION_VERB_MONOTONE'), 'ACTION_MOTION_VERB_MONOTONE should fire');
    });

    it('ACTION_MOTION_VERB_MONOTONE does NOT fire when action lines use varied specific verbs', async () => {
      const fountain403cNF = `INT. WAREHOUSE - NIGHT

Marcus seizes the ledger and shoves it inside his coat.

She jams the door with her shoulder, teeth clenched.

The lamp flickers, throwing shadows across the ceiling.

He tears the pages out one by one, jaw tight.

The dog lunges at the chain link and snarls.

She presses herself flat against the beam.

Marcus wrenches the panel free and drops it.

The water drips from a rusted pipe above.

She stares at the name circled in red ink.

He crushes the phone and lets it fall.

The silence settles over the space like dust.

The bulb swings, then dies.
`;
      const res = await runV403(fountain403cNF);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_MOTION_VERB_MONOTONE'), 'ACTION_MOTION_VERB_MONOTONE should not fire');
    });
  });


  describe('Wave 389 — voicePass: action expletive opener, dialogue interrogative-opener flood, dialogue comparative flood', async () => {
    const runV389 = async (fountain: string) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('ACTION_EXPLETIVE_OPENER fires when >25% of action lines begin with There is / It was', async () => {
      const f389e = `INT. ROOM - DAY

There is a man at the window.

It was cold in the hall.

There are papers on the floor.

It is too quiet here.

She crosses to the desk.

He opens the drawer.

The lamp flickers once.

Footsteps sound below.

A door slams shut.

Dust drifts in the light.`;
      const res = await runV389(f389e);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_EXPLETIVE_OPENER'), 'ACTION_EXPLETIVE_OPENER should fire');
    });

    it('ACTION_EXPLETIVE_OPENER does not fire when action leads with real subjects', async () => {
      const f389en = `INT. ROOM - DAY

A man waits at the window.

Cold air fills the hall.

Papers litter the floor.

Silence presses in.

She crosses to the desk.

He opens the drawer.

The lamp flickers once.

Footsteps sound below.

A door slams shut.

Dust drifts in the light.`;
      const res = await runV389(f389en);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_EXPLETIVE_OPENER'), 'ACTION_EXPLETIVE_OPENER should not fire');
    });

    it('DIALOGUE_INTERROGATIVE_OPENER_FLOOD fires when >30% of dialogue lines begin with a wh-word', async () => {
      const f389q = `INT. OFFICE - DAY

ANNA
What did you tell them?

MARK
Nothing important.

ANNA
Why were you there at all?

MARK
I had a meeting.

ANNA
How long have you known?

MARK
A while now.

ANNA
Where does that leave us?

MARK
I don't know yet.

ANNA
I need an answer.

MARK
Give me time.`;
      const res = await runV389(f389q);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_INTERROGATIVE_OPENER_FLOOD'), 'DIALOGUE_INTERROGATIVE_OPENER_FLOOD should fire');
    });

    it('DIALOGUE_INTERROGATIVE_OPENER_FLOOD does not fire when dialogue mostly asserts', async () => {
      const f389qn = `INT. OFFICE - DAY

ANNA
You told them everything.

MARK
Nothing important.

ANNA
You were there all night.

MARK
I had a meeting.

ANNA
You've known for months.

MARK
A while now.

ANNA
This changes everything.

MARK
I don't know yet.

ANNA
I need an answer.

MARK
Give me time.`;
      const res = await runV389(f389qn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_INTERROGATIVE_OPENER_FLOOD'), 'DIALOGUE_INTERROGATIVE_OPENER_FLOOD should not fire');
    });

    it('DIALOGUE_COMPARATIVE_FLOOD fires when >25% of dialogue lines carry a comparative', async () => {
      const f389c = `INT. BAR - NIGHT

SAM
You're stronger than he ever was.

RAY
Maybe.

SAM
This deal is better than the last one.

RAY
We'll see.

SAM
She's as sharp as anyone here.

RAY
True enough.

SAM
It costs more than we agreed.

RAY
That's a problem.

SAM
Let's settle it now.

RAY
Fine by me.`;
      const res = await runV389(f389c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_COMPARATIVE_FLOOD'), 'DIALOGUE_COMPARATIVE_FLOOD should fire');
    });

    it('DIALOGUE_COMPARATIVE_FLOOD does not fire when dialogue avoids comparatives', async () => {
      const f389cn = `INT. BAR - NIGHT

SAM
You're strong. He never was.

RAY
Maybe.

SAM
This deal works for us.

RAY
We'll see.

SAM
She's sharp. Everyone knows it.

RAY
True enough.

SAM
It costs too much.

RAY
That's a problem.

SAM
Let's settle it now.

RAY
Fine by me.`;
      const res = await runV389(f389cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_COMPARATIVE_FLOOD'), 'DIALOGUE_COMPARATIVE_FLOOD should not fire');
    });
  });


  describe('Wave 375 — voicePass: ellipsis-opener flood, triadic flood, emphatic-punctuation flood', async () => {
    const runV375 = async (fountain: string) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DIALOGUE_ELLIPSIS_OPENER_FLOOD fires when >20% of dialogue lines begin with an ellipsis', async () => {
      const f375e = `INT. ROOM - DAY

ANNA
...you knew the whole time.

MARK
I did.

ANNA
...and you said nothing.

MARK
What was I supposed to say?

ANNA
...I trusted you.

MARK
I know.

ANNA
So where does that leave us now.

MARK
I'm not sure anymore.

ANNA
Neither am I.

MARK
We should decide soon.`;
      const res = await runV375(f375e);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_ELLIPSIS_OPENER_FLOOD'), 'DIALOGUE_ELLIPSIS_OPENER_FLOOD should fire');
    });

    it('DIALOGUE_ELLIPSIS_OPENER_FLOOD does not fire when lines begin cleanly', async () => {
      const f375en = `INT. ROOM - DAY

ANNA
You knew the whole time.

MARK
I did.

ANNA
And you said nothing.

MARK
What was I supposed to say?

ANNA
I trusted you.

MARK
I know.

ANNA
So where does that leave us now.

MARK
I'm not sure anymore.

ANNA
Neither am I.

MARK
We should decide soon.`;
      const res = await runV375(f375en);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_ELLIPSIS_OPENER_FLOOD'), 'DIALOGUE_ELLIPSIS_OPENER_FLOOD should not fire');
    });

    it('DIALOGUE_TRIADIC_FLOOD fires when 3+ dialogue lines use a rule-of-three enumeration', async () => {
      const f375t = `INT. BAR - NIGHT

SAM
I'm tired, I'm broke, and I'm done with this.

RAY
You always say that.

SAM
She lied, she stole, and she left without a word.

RAY
So what now?

SAM
We find her, we corner her, and we get the truth.

RAY
That simple, huh.

SAM
Nothing about this is simple.

RAY
Then let's go.

SAM
We can't wait any longer.

RAY
I'm with you.`;
      const res = await runV375(f375t);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_TRIADIC_FLOOD'), 'DIALOGUE_TRIADIC_FLOOD should fire');
    });

    it('DIALOGUE_TRIADIC_FLOOD does not fire when dialogue avoids triadic lists', async () => {
      const f375tn = `INT. BAR - NIGHT

SAM
I'm done with this.

RAY
You always say that.

SAM
She lied to me.

RAY
So what now?

SAM
We find her and get the truth.

RAY
That simple, huh.

SAM
Nothing about this is simple.

RAY
Then let's go.

SAM
We can't wait any longer.

RAY
I'm with you.`;
      const res = await runV375(f375tn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_TRIADIC_FLOOD'), 'DIALOGUE_TRIADIC_FLOOD should not fire');
    });

    it('DIALOGUE_EMPHATIC_PUNCTUATION_FLOOD fires when >20% of dialogue lines use stacked marks', async () => {
      const f375p = `INT. KITCHEN - DAY

LIA
You did what?!

JON
Calm down.

LIA
Don't tell me to calm down!!

JON
It's not a big deal.

LIA
Not a big deal?!

JON
I can explain.

LIA
Then explain it.

JON
I forgot, okay.

LIA
You forgot.

JON
I'm sorry.`;
      const res = await runV375(f375p);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_EMPHATIC_PUNCTUATION_FLOOD'), 'DIALOGUE_EMPHATIC_PUNCTUATION_FLOOD should fire');
    });

    it('DIALOGUE_EMPHATIC_PUNCTUATION_FLOOD does not fire when dialogue uses single terminal marks', async () => {
      const f375pn = `INT. KITCHEN - DAY

LIA
You did what?

JON
Calm down.

LIA
Don't tell me to calm down.

JON
It's not a big deal.

LIA
Not a big deal?

JON
I can explain.

LIA
Then explain it.

JON
I forgot, okay.

LIA
You forgot.

JON
I'm sorry.`;
      const res = await runV375(f375pn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_EMPHATIC_PUNCTUATION_FLOOD'), 'DIALOGUE_EMPHATIC_PUNCTUATION_FLOOD should not fire');
    });
  });


  describe('Wave 361 — voicePass: conditional flood, apology overuse, hesitation flood', async () => {
    const runV361 = async (fountain: string) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DIALOGUE_CONDITIONAL_FLOOD fires when >30% of dialogue lines begin with a conditional', async () => {
      const f361c = `INT. LIVING ROOM - DAY

ANNA
If you leave now, there's no coming back.

MARK
Unless you change your mind before morning.

ANNA
What if I told you the truth right now?

MARK
If that's how you feel.

ANNA
I've been thinking about it.

MARK
Suppose we tried something different.

ANNA
What if things were just simpler?

MARK
If only that were possible.

ANNA
I know. I really do.

MARK
We'll figure it out.`;
      const res = await runV361(f361c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_CONDITIONAL_FLOOD'), 'DIALOGUE_CONDITIONAL_FLOOD should fire');
    });

    it('DIALOGUE_CONDITIONAL_FLOOD does not fire when dialogue is mostly declarative', async () => {
      const f361cn = `INT. LIVING ROOM - DAY

ANNA
You need to make a decision today.

MARK
I already made it last night.

ANNA
Then why are you still here?

MARK
Because I have something to say.

ANNA
Say it.

MARK
I'm staying.

ANNA
Good.

MARK
Good.

ANNA
Now we can move forward.

MARK
That's all I wanted.`;
      const res = await runV361(f361cn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_CONDITIONAL_FLOOD'), 'DIALOGUE_CONDITIONAL_FLOOD should not fire');
    });

    it('DIALOGUE_APOLOGY_OVERUSE fires when 3+ dialogue lines are apologies', async () => {
      const f361a = `INT. OFFICE - DAY

CLAIRE
I'm sorry about what happened yesterday.

TOM
It's fine.

CLAIRE
I apologize for raising my voice.

TOM
You don't need to do this.

CLAIRE
Forgive me. I really didn't mean any of it.

TOM
Claire, stop.

CLAIRE
I just want you to know I'm aware.

TOM
I know you are.`;
      const res = await runV361(f361a);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_APOLOGY_OVERUSE'), 'DIALOGUE_APOLOGY_OVERUSE should fire');
    });

    it('DIALOGUE_APOLOGY_OVERUSE does not fire when dialogue has fewer than 3 apologies', async () => {
      const f361an = `INT. OFFICE - DAY

CLAIRE
I'm sorry about yesterday.

TOM
Forget it.

CLAIRE
No, it mattered.

TOM
Then let's talk about it properly.

CLAIRE
I made a mistake.

TOM
We both did.

CLAIRE
So where does that leave us?

TOM
I don't know yet.`;
      const res = await runV361(f361an);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_APOLOGY_OVERUSE'), 'DIALOGUE_APOLOGY_OVERUSE should not fire');
    });

    it('DIALOGUE_HESITATION_FLOOD fires when >25% of dialogue lines contain hesitation sounds', async () => {
      const f361h = `INT. KITCHEN - DAY

BEN
Um, I wasn't sure you'd be home.

SARA
Well, I am.

BEN
Uh, can we talk?

SARA
About what?

BEN
Er, about what happened.

SARA
Just say it.

BEN
Hmm, I don't know where to start.

SARA
The beginning.

BEN
Right. Um, it started a long time ago.

SARA
I'm listening.`;
      const res = await runV361(f361h);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_HESITATION_FLOOD'), 'DIALOGUE_HESITATION_FLOOD should fire');
    });

    it('DIALOGUE_HESITATION_FLOOD does not fire when dialogue speaks without hesitation', async () => {
      const f361hn = `INT. KITCHEN - DAY

BEN
I wasn't sure you'd be home.

SARA
Well, I am.

BEN
Can we talk?

SARA
About what?

BEN
About what happened.

SARA
Just say it.

BEN
It started a long time ago.

SARA
I know.

BEN
You know?

SARA
I've known for months.`;
      const res = await runV361(f361hn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_HESITATION_FLOOD'), 'DIALOGUE_HESITATION_FLOOD should not fire');
    });
  });


  describe('Wave 347 — voicePass: discourse-marker opener, vocative address flood, greeting filler flood', async () => {
    const runV347 = async (fountain: string) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DIALOGUE_DISCOURSE_MARKER_OPENER fires when >25% of lines open with a discourse marker', async () => {
      const f347dm = `INT. ROOM - DAY

ALICE
Okay, we should leave now.
Alright, I will get the car.
Right, you take the bags.
Anyway, it does not matter much.
Anyhow, we are out of time here.
We need to move quickly now.
The road will be busy tonight.
I packed everything we own.
The keys are on the table there.
Lock the door behind you please.
Check the windows before we go.
Do not forget the documents.`;
      const res = await runV347(f347dm);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_DISCOURSE_MARKER_OPENER'), 'DIALOGUE_DISCOURSE_MARKER_OPENER should fire');
    });

    it('DIALOGUE_DISCOURSE_MARKER_OPENER does not fire when markers are rare', async () => {
      const f347dmn = `INT. ROOM - DAY

ALICE
Okay, we should leave now.
Alright, I will get the car.
We need to move quickly now.
The road will be busy tonight.
I packed everything we own.
The keys are on the table there.
Lock the door behind you please.
Check the windows before we go.
Do not forget the documents.
The train departs at midnight.
We can sleep on the journey.
Nothing else matters tonight.`;
      const res = await runV347(f347dmn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_DISCOURSE_MARKER_OPENER'), 'DIALOGUE_DISCOURSE_MARKER_OPENER should not fire');
    });

    it('DIALOGUE_VOCATIVE_ADDRESS_FLOOD fires when >25% of lines carry a vocative address', async () => {
      const f347va = `INT. ROOM - DAY

ALICE
I know you are tired, honey.
Come over here, sweetheart.
You did great today, buddy.
We can fix this together, sir.
We should go now, man.
The car is parked outside.
I packed all of our things.
The road is going to be long.
We can rest when we arrive.
Everything will be fine soon.
Trust me on this one thing.
We leave in five minutes.`;
      const res = await runV347(f347va);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_VOCATIVE_ADDRESS_FLOOD'), 'DIALOGUE_VOCATIVE_ADDRESS_FLOOD should fire');
    });

    it('DIALOGUE_VOCATIVE_ADDRESS_FLOOD does not fire when vocatives are rare', async () => {
      const f347van = `INT. ROOM - DAY

ALICE
I know you are tired, honey.
Come over here, sweetheart.
The car is parked outside.
I packed all of our things.
The road is going to be long.
We can rest when we arrive.
Everything will be fine soon.
Trust me on this one thing.
We leave in five minutes.
The plan is already set now.
Nothing can stop us tonight.
We have waited long enough.`;
      const res = await runV347(f347van);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_VOCATIVE_ADDRESS_FLOOD'), 'DIALOGUE_VOCATIVE_ADDRESS_FLOOD should not fire');
    });

    it('DIALOGUE_GREETING_FILLER_FLOOD fires when 3+ lines are greetings or farewells', async () => {
      const f347gf = `INT. ROOM - DAY

ALICE
Hello, it is good to see you.
Good morning to everyone here.
Goodbye, I will miss this place.
We should talk about the plan.
The meeting starts at noon today.
I reviewed all of the documents.
The numbers look correct to me.
Let us proceed with the vote.`;
      const res = await runV347(f347gf);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_GREETING_FILLER_FLOOD'), 'DIALOGUE_GREETING_FILLER_FLOOD should fire');
    });

    it('DIALOGUE_GREETING_FILLER_FLOOD does not fire when greetings are rare', async () => {
      const f347gfn = `INT. ROOM - DAY

ALICE
Hello, it is good to see you.
We should talk about the plan.
The meeting starts at noon today.
I reviewed all of the documents.
The numbers look correct to me.
Let us proceed with the vote.
The budget needs another review.
We adjourn until tomorrow morning.`;
      const res = await runV347(f347gfn);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_GREETING_FILLER_FLOOD'), 'DIALOGUE_GREETING_FILLER_FLOOD should not fire');
    });
  });


  describe('Wave 333 — voicePass: name opener flood, retrospective opener, word stutter', async () => {
    const runV333 = async (fountain: string) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DIALOGUE_NAME_OPENER_FLOOD fires when >30% of dialogue lines begin with direct name address', async () => {
      const f333nof = `INT. OFFICE - DAY

ALICE
John, I need to talk to you right now.

BOB
That's not what I meant at all.

ALICE
Mary, please just listen for a moment.

BOB
I don't know what you want from me.

ALICE
Sarah, where have you been all week?

BOB
I tried calling but nobody answered.

ALICE
I'm not sure what to do about this situation.

BOB
Kate, you need to be honest with everyone.

ALICE
She never came back to the meeting room.

BOB
This whole thing is getting out of control.`;
      const res = await runV333(f333nof);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_NAME_OPENER_FLOOD'), 'DIALOGUE_NAME_OPENER_FLOOD should fire');
    });

    it('DIALOGUE_NAME_OPENER_FLOOD does not fire when name-address openers are sparse', async () => {
      const f333nnof = `INT. OFFICE - DAY

ALICE
I need to talk to you right now.

BOB
That's not what I meant at all.

ALICE
Please just listen for a moment.

BOB
I don't know what you want from me.

ALICE
Where have you been all week long?

BOB
I tried calling but nobody answered.

ALICE
I'm not sure what to do about this.

BOB
You need to be honest with everyone.

ALICE
John, she never came back after that.

BOB
This whole thing is getting out of control.`;
      const res = await runV333(f333nnof);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_NAME_OPENER_FLOOD'), 'DIALOGUE_NAME_OPENER_FLOOD should not fire');
    });

    it('DIALOGUE_RETROSPECTIVE_OPENER fires when ≥4 dialogue lines open with retrospective phrases', async () => {
      const f333ro = `INT. KITCHEN - EVENING

ALICE
I remember when you still cared about anything.

BOB
Nothing happened the way you said.

ALICE
Back when we were happy this would never occur.

BOB
That was years ago and things have changed now.

ALICE
I used to think you were different from the others.

BOB
Stop bringing up the past every single time.

ALICE
Years ago you promised me this would not happen.

BOB
What do you want me to say at this point?

ALICE
Do you remember what you told me that morning?

BOB
I was wrong. Is that what you need to hear?

ALICE
I want you to understand what you did back then.

BOB
Then let me explain without interruption this time.`;
      const res = await runV333(f333ro);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_RETROSPECTIVE_OPENER'), 'DIALOGUE_RETROSPECTIVE_OPENER should fire');
    });

    it('DIALOGUE_RETROSPECTIVE_OPENER does not fire when dialogue stays in the present', async () => {
      const f333nro = `INT. KITCHEN - EVENING

ALICE
You don't care about anything anymore.

BOB
That's not fair and you know it perfectly.

ALICE
I'm tired of having this same argument again.

BOB
Then stop starting it every single time.

ALICE
I need you to listen to me right now.

BOB
I am listening. What do you want from me?

ALICE
Something has to change between us today.

BOB
I agree. But what exactly are you proposing?

ALICE
We need to have an honest conversation tonight.

BOB
Fine. Let's start from the beginning then.`;
      const res = await runV333(f333nro);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_RETROSPECTIVE_OPENER'), 'DIALOGUE_RETROSPECTIVE_OPENER should not fire');
    });

    it('DIALOGUE_WORD_STUTTER fires when ≥3 dialogue lines contain immediate word repetition', async () => {
      const f333ws = `INT. HOSPITAL - NIGHT

ALICE
No no, this can't be happening to us now.

BOB
I understand what you're saying completely.

ALICE
Please please just tell me what is going on.

BOB
The doctor said he needs more time to decide.

ALICE
Stop stop, you are not listening at all now.

BOB
Sit down and let me get you some water.

ALICE
But they told us everything would be fine here.

BOB
They did. I don't know what changed exactly.

ALICE
We have to do something about this immediately.

BOB
We will. I promise we'll figure this out.`;
      const res = await runV333(f333ws);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_WORD_STUTTER'), 'DIALOGUE_WORD_STUTTER should fire');
    });

    it('DIALOGUE_WORD_STUTTER does not fire when dialogue has no immediate word repetition', async () => {
      const f333nws = `INT. HOSPITAL - NIGHT

ALICE
This can't be happening to us right now.

BOB
I understand what you're feeling completely.

ALICE
Please just tell me what is really going on.

BOB
The doctor said he needs more time today.

ALICE
I can't breathe properly thinking about this.

BOB
Sit down and let me get you some water now.

ALICE
They told us everything would be fine here.

BOB
They did. I don't know what went wrong exactly.

ALICE
We have to do something about this immediately.

BOB
We will. I promise we'll figure this out together.`;
      const res = await runV333(f333nws);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_WORD_STUTTER'), 'DIALOGUE_WORD_STUTTER should not fire');
    });
  });


  describe('Wave 322 — voicePass: trailing ellipsis flood, repeated opener word, conjunction opener', async () => {
    const runV322 = async (fountain: string) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DIALOGUE_TRAILING_ELLIPSIS_FLOOD fires when >25% of dialogue lines trail off', async () => {
      const fountain322e = `INT. ROOM - DAY

ALICE
I don't know...

BOB
We should go now.

ALICE
Maybe later...

BOB
The door is locked.

ALICE
If only we...

BOB
Nothing makes sense here.

ALICE
I thought that...

BOB
You always do this.

ALICE
Let me explain myself.

BOB
Just tell me already.`;
      const res = await runV322(fountain322e);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_TRAILING_ELLIPSIS_FLOOD'), 'DIALOGUE_TRAILING_ELLIPSIS_FLOOD should fire');
    });

    it('DIALOGUE_TRAILING_ELLIPSIS_FLOOD does not fire when few lines trail off', async () => {
      const fountain322ne = `INT. ROOM - DAY

ALICE
I don't know...

BOB
We should go now.

ALICE
Maybe we can leave.

BOB
The door is locked.

ALICE
If only we tried harder.

BOB
Nothing makes sense here.

ALICE
I thought that you knew.

BOB
You always do this.

ALICE
Let me explain myself.

BOB
Just tell me already.`;
      const res = await runV322(fountain322ne);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_TRAILING_ELLIPSIS_FLOOD'), 'DIALOGUE_TRAILING_ELLIPSIS_FLOOD should not fire');
    });

    it('DIALOGUE_REPEATED_OPENER_WORD fires when a single word begins >40% of dialogue lines', async () => {
      const fountain322r = `INT. ROOM - DAY

ALICE
You should leave now.

BOB
I am staying here.

ALICE
You never listen anymore.

BOB
That is not true.

ALICE
You always say that.

BOB
We can talk later.

ALICE
You broke the promise.

BOB
The promise was unfair.

ALICE
You owe me answers.

BOB
Nothing is owed here.

ALICE
You will regret this.

BOB
Time will tell then.`;
      const res = await runV322(fountain322r);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_REPEATED_OPENER_WORD'), 'DIALOGUE_REPEATED_OPENER_WORD should fire');
    });

    it('DIALOGUE_REPEATED_OPENER_WORD does not fire when openers vary', async () => {
      const fountain322nr = `INT. ROOM - DAY

ALICE
We should leave now.

BOB
I am staying here.

ALICE
Time is running out.

BOB
That is not true.

ALICE
Nobody asked for this.

BOB
We can talk later.

ALICE
Promises mean nothing now.

BOB
The promise was unfair.

ALICE
Answers are all I want.

BOB
Nothing is owed here.

ALICE
Regret comes for everyone.

BOB
Time will tell then.`;
      const res = await runV322(fountain322nr);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_REPEATED_OPENER_WORD'), 'DIALOGUE_REPEATED_OPENER_WORD should not fire');
    });

    it('DIALOGUE_CONJUNCTION_OPENER fires when >30% of dialogue lines begin with a conjunction', async () => {
      const fountain322c = `INT. ROOM - DAY

ALICE
And then she left.

BOB
I stayed behind alone.

ALICE
But you promised me.

BOB
Things change quickly here.

ALICE
So what now happens?

BOB
We figure it out.

ALICE
Because nothing is certain.

BOB
Everything feels wrong now.

ALICE
We should rest now.

BOB
Sleep sounds good tonight.`;
      const res = await runV322(fountain322c);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_CONJUNCTION_OPENER'), 'DIALOGUE_CONJUNCTION_OPENER should fire');
    });

    it('DIALOGUE_CONJUNCTION_OPENER does not fire when few lines begin with a conjunction', async () => {
      const fountain322nc = `INT. ROOM - DAY

ALICE
And then she left.

BOB
I stayed behind alone.

ALICE
But you promised me.

BOB
Things change quickly here.

ALICE
We should rest now.

BOB
Sleep sounds good tonight.

ALICE
Morning comes early here.

BOB
The road is long.

ALICE
Let us move on.

BOB
Time to go now.`;
      const res = await runV322(fountain322nc);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_CONJUNCTION_OPENER'), 'DIALOGUE_CONJUNCTION_OPENER should not fire');
    });
  });


  describe('Wave 294 — voicePass: dialogue interrogative saturation, action adverb flood, character name monotony', async () => {
    const runV294 = async (fountain: string) => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      return voicePass({ fountain, original: fountain, records: [], structure: {} as any, annotations: [], approvedSpans: [] });
    };

    it('DIALOGUE_INTERROGATIVE_SATURATION fires when >30% of 10+ dialogue lines end with ?', async () => {
      const fountain294dis = `INT. ROOM - DAY

ALICE
What do you want?

BOB
Why are you here?

ALICE
Did you tell him?

BOB
What happened exactly?

ALICE
Can you explain this?

BOB
Are you sure about that?

ALICE
Who told you that?

BOB
I had no choice.

ALICE
Why does it matter.

BOB
It does not.`;
      const res = await runV294(fountain294dis);
      assert.ok(res.issues.some((i: any) => i.rule === 'DIALOGUE_INTERROGATIVE_SATURATION'), 'DIALOGUE_INTERROGATIVE_SATURATION should fire');
    });

    it('DIALOGUE_INTERROGATIVE_SATURATION does not fire when questions are sparse', async () => {
      const fountain294ndis = `INT. ROOM - DAY

ALICE
Get out of here now.

BOB
I am not leaving.

ALICE
You have no right to be here.

BOB
I have every right.

ALICE
This is my house.

BOB
Not any more it is not.

ALICE
What do you mean?

BOB
Read the papers.

ALICE
You cannot be serious.

BOB
I am completely serious.`;
      const res = await runV294(fountain294ndis);
      assert.ok(!res.issues.some((i: any) => i.rule === 'DIALOGUE_INTERROGATIVE_SATURATION'), 'DIALOGUE_INTERROGATIVE_SATURATION should not fire');
    });

    it('ACTION_ADVERB_FLOOD fires when >25% of 8+ action lines contain manner adverbs', async () => {
      const fountain294aaf = `INT. OFFICE - DAY

She slowly crosses to the window.

He quietly closes the door behind him.

She carefully picks up the envelope.

He suddenly turns to face her.

She gently places it on the desk.

He nervously adjusts his tie.

She softly closes her eyes.

He angrily slams the folder shut.

She breathes.`;
      const res = await runV294(fountain294aaf);
      assert.ok(res.issues.some((i: any) => i.rule === 'ACTION_ADVERB_FLOOD'), 'ACTION_ADVERB_FLOOD should fire');
    });

    it('ACTION_ADVERB_FLOOD does not fire when adverbs are sparse', async () => {
      const fountain294naaf = `INT. OFFICE - DAY

She crosses to the window.

He closes the door.

She picks up the envelope.

He turns to face her.

She sets it on the desk.

He straightens his tie.

She exhales.

He slams the folder shut.

She stares at the window.`;
      const res = await runV294(fountain294naaf);
      assert.ok(!res.issues.some((i: any) => i.rule === 'ACTION_ADVERB_FLOOD'), 'ACTION_ADVERB_FLOOD should not fire');
    });

    it('CHARACTER_NAME_MONOTONY fires when single name opens >50% of 12+ action lines', async () => {
      const fountain294cnm = `INT. ROOM - DAY

Alice crosses the room.

Alice opens the window.

Alice looks outside.

Alice turns around.

Alice picks up the phone.

Alice dials the number.

Alice waits.

Alice hangs up.

Alice sits down on the floor.

Alice buries her face.

Alice does not move.

Bob enters.`;
      const res = await runV294(fountain294cnm);
      assert.ok(res.issues.some((i: any) => i.rule === 'CHARACTER_NAME_MONOTONY'), 'CHARACTER_NAME_MONOTONY should fire');
    });

    it('CHARACTER_NAME_MONOTONY does not fire when action subjects are varied', async () => {
      const fountain294ncnm = `INT. ROOM - DAY

Alice crosses the room.

The door slams behind her.

Bob follows close behind.

The phone rings on the desk.

Alice picks it up.

Silence on the other end.

Bob moves to the window.

The curtains flutter in the breeze.

Alice sets the phone down.

Bob turns to face her.

The light shifts as clouds pass.

Both of them wait.`;
      const res = await runV294(fountain294ncnm);
      assert.ok(!res.issues.some((i: any) => i.rule === 'CHARACTER_NAME_MONOTONY'), 'CHARACTER_NAME_MONOTONY should not fire');
    });
  });


  describe('Wave 280 — voicePass: intensifier flood, monochrome verbs, scene heading repetition', async () => {
    const makeRec280 = (idx: number, slug = `INT. OFFICE - DAY`): any => ({
      sceneIdx: idx, slug,
      emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0,
      clockRaised: false, clockDelta: 0,
      dialogueHighlights: [], revelation: null,
      relationshipShifts: [], seededClueIds: [], payoffSetupIds: [],
      unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing',
    });

    it('INTENSIFIER_FLOOD fires when >30% of dialogue lines contain intensifiers', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      const f280a = [
        'INT. ROOM - DAY', '',
        'ALICE', 'This is really important to me.',
        'BOB', 'The situation is serious.',
        'ALICE', 'I am absolutely certain we must go.',
        'BOB', 'We have no time left.',
        'ALICE', 'It is extremely dangerous out there.',
        'BOB', 'I know the risks.',
        'ALICE', 'We literally have no choice.',
        'BOB', 'Fine. We go.',
        'ALICE', 'The plan remains unchanged.',
        'BOB', 'Understood.',
      ].join('\n');
      const recs280a = Array.from({ length: 2 }, (_, i) => makeRec280(i));
      const result280a = await voicePass({ fountain: f280a, original: f280a, records: recs280a as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(result280a.issues.some((i: any) => i.rule === 'INTENSIFIER_FLOOD'), `Expected INTENSIFIER_FLOOD, got: ${JSON.stringify(result280a.issues.map((i: any) => i.rule))}`);
    });

    it('INTENSIFIER_FLOOD does NOT fire when ≤30% of dialogue lines contain intensifiers', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      const f280b = [
        'INT. ROOM - DAY', '',
        'ALICE', 'This matters to me.',
        'BOB', 'The situation is serious.',
        'ALICE', 'I am certain we must go.',
        'BOB', 'We have no time.',
        'ALICE', 'It is dangerous out there.',
        'BOB', 'I know the risks.',
        'ALICE', 'We have no choice.',
        'BOB', 'Fine.',
        'ALICE', 'Really, we must leave now.',
        'BOB', 'Understood.',
      ].join('\n');
      const recs280b = Array.from({ length: 2 }, (_, i) => makeRec280(i));
      const result280b = await voicePass({ fountain: f280b, original: f280b, records: recs280b as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(!result280b.issues.some((i: any) => i.rule === 'INTENSIFIER_FLOOD'), 'Should NOT fire when ≤30% of dialogue lines have intensifiers');
    });

    it('MONOCHROME_VERBS fires when a single verb appears in >25% of action lines', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // 12 action lines, 4 with "walks" = 33% > 25%
      const f280c = [
        'INT. PARK - DAY', '',
        'He walks to the bench.',
        'She sits down beside him.',
        'He walks toward the fountain.',
        'A bird flies past.',
        'He walks along the path.',
        'She checks her phone.',
        'He walks back slowly.',
        'The sun is low.',
        'She rises from the bench.',
        'He stops at the gate.',
        'She follows behind him.',
        'The park empties out.',
      ].join('\n');
      const recs280c = Array.from({ length: 2 }, (_, i) => makeRec280(i, `INT. PARK - DAY`));
      const result280c = await voicePass({ fountain: f280c, original: f280c, records: recs280c as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(result280c.issues.some((i: any) => i.rule === 'MONOCHROME_VERBS'), `Expected MONOCHROME_VERBS, got: ${JSON.stringify(result280c.issues.map((i: any) => i.rule))}`);
    });

    it('MONOCHROME_VERBS does NOT fire when no single verb exceeds 25% of action lines', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // 12 action lines, each with a different verb - "walks" only once = 8%
      const f280d = [
        'INT. PARK - DAY', '',
        'He walks to the bench.',
        'She sprints toward the gate.',
        'A dog charges across the grass.',
        'The bird circles overhead.',
        'She ducks behind a tree.',
        'He vaults over the railing.',
        'The crowd scatters in panic.',
        'She shoves through the turnstile.',
        'He rolls under the bench.',
        'The siren wails across the park.',
        'She scrambles to her feet.',
        'He bolts for the exit.',
      ].join('\n');
      const recs280d = Array.from({ length: 2 }, (_, i) => makeRec280(i, `INT. PARK - DAY`));
      const result280d = await voicePass({ fountain: f280d, original: f280d, records: recs280d as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(!result280d.issues.some((i: any) => i.rule === 'MONOCHROME_VERBS'), 'Should NOT fire when verb distribution is varied');
    });

    it('SCENE_HEADING_REPETITION fires when >60% of scenes share the same location', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // 8 records, 6 in OFFICE (75% > 60%), 2 elsewhere
      const recs280e = [
        makeRec280(0, 'INT. OFFICE - DAY'),
        makeRec280(1, 'INT. OFFICE - DAY'),
        makeRec280(2, 'INT. OFFICE - DAY'),
        makeRec280(3, 'EXT. STREET - NIGHT'),
        makeRec280(4, 'INT. OFFICE - DAY'),
        makeRec280(5, 'INT. OFFICE - DAY'),
        makeRec280(6, 'INT. HALLWAY - DAY'),
        makeRec280(7, 'INT. OFFICE - DAY'),
      ];
      const result280e = await voicePass({ fountain: '', original: '', records: recs280e as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(result280e.issues.some((i: any) => i.rule === 'SCENE_HEADING_REPETITION'), `Expected SCENE_HEADING_REPETITION, got: ${JSON.stringify(result280e.issues.map((i: any) => i.rule))}`);
    });

    it('SCENE_HEADING_REPETITION does NOT fire when no location exceeds 60% of scenes', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // 8 records, OFFICE 4/8 = 50% ≤ 60%
      const recs280f = [
        makeRec280(0, 'INT. OFFICE - DAY'),
        makeRec280(1, 'INT. OFFICE - DAY'),
        makeRec280(2, 'EXT. STREET - NIGHT'),
        makeRec280(3, 'INT. WAREHOUSE - NIGHT'),
        makeRec280(4, 'INT. OFFICE - DAY'),
        makeRec280(5, 'EXT. ROOFTOP - DAY'),
        makeRec280(6, 'INT. OFFICE - DAY'),
        makeRec280(7, 'INT. HALLWAY - DAY'),
      ];
      const result280f = await voicePass({ fountain: '', original: '', records: recs280f as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(!result280f.issues.some((i: any) => i.rule === 'SCENE_HEADING_REPETITION'), 'Should NOT fire when no location exceeds 60% of scenes');
    });
  });


  describe('Wave 266 — voicePass: stative verb overload, dialogue hedging opener, abstract subject opening', async () => {
    it('STATIVE_VERB_OVERLOAD fires when >35% of action lines begin with a stative verb', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      const f266a = [
        'INT. SCENE - DAY', '',
        'Stands alone at the window.',
        'Was found in the alley nearby.',
        'Lies on the floor, arms spread.',
        'Remains locked from the outside.',
        'She picks up the envelope.',
        'He crosses the room quickly.',
        'The phone rings twice.',
        'She opens the door.',
      ].join('\n');
      const result266a = await voicePass({ fountain: f266a, original: f266a, records: Array.from({ length: 4 }, (_, i) => ({ sceneIdx: i, slug: `SC${i}`, emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0, dialogueHighlights: [], revelation: null, relationshipShifts: [], seededClueIds: [], payoffSetupIds: [], unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing' })) as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(result266a.issues.some((i: any) => i.rule === 'STATIVE_VERB_OVERLOAD'), `Expected STATIVE_VERB_OVERLOAD, got: ${JSON.stringify(result266a.issues.map((i: any) => i.rule))}`);
    });

    it('STATIVE_VERB_OVERLOAD does NOT fire when fewer than 35% of action lines begin with a stative verb', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      const f266b = [
        'INT. SCENE - DAY', '',
        'She picks up the envelope.',
        'He crosses the room quickly.',
        'The phone rings twice.',
        'She opens the door.',
        'Stands alone at the window.',
        'He nods and turns away.',
        'She moves toward the exit.',
        'He checks the drawer.',
      ].join('\n');
      const result266b = await voicePass({ fountain: f266b, original: f266b, records: Array.from({ length: 4 }, (_, i) => ({ sceneIdx: i, slug: `SC${i}`, emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0, dialogueHighlights: [], revelation: null, relationshipShifts: [], seededClueIds: [], payoffSetupIds: [], unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing' })) as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(!result266b.issues.some((i: any) => i.rule === 'STATIVE_VERB_OVERLOAD'), 'Should NOT fire when fewer than 35% of action lines have stative openers');
    });

    it('DIALOGUE_HEDGING_OPENER fires when >25% of dialogue lines begin with a hedge', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      const f266c = [
        'INT. OFFICE - DAY', '', 'Action line.', '',
        'ALICE', 'Well, I do not know what to say.',
        'BOB', 'The situation is serious.',
        'ALICE', 'Actually, I think we should go.',
        'BOB', 'We have no time left.',
        'ALICE', 'I mean, this changes nothing.',
        'BOB', 'What do you suggest then?',
        'ALICE', 'The plan remains unchanged.',
        'BOB', 'Good.',
        'ALICE', 'We leave at dawn.',
        'BOB', 'Understood.',
      ].join('\n');
      const result266c = await voicePass({ fountain: f266c, original: f266c, records: Array.from({ length: 2 }, (_, i) => ({ sceneIdx: i, slug: `SC${i}`, emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0, dialogueHighlights: [], revelation: null, relationshipShifts: [], seededClueIds: [], payoffSetupIds: [], unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing' })) as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(result266c.issues.some((i: any) => i.rule === 'DIALOGUE_HEDGING_OPENER'), `Expected DIALOGUE_HEDGING_OPENER, got: ${JSON.stringify(result266c.issues.map((i: any) => i.rule))}`);
    });

    it('DIALOGUE_HEDGING_OPENER does NOT fire when fewer than 25% of dialogue lines hedge', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      const f266d = [
        'INT. OFFICE - DAY', '', 'Action line.', '',
        'ALICE', 'The situation is serious.',
        'BOB', 'We have no time left.',
        'ALICE', 'I think we should go.',
        'BOB', 'What do you suggest?',
        'ALICE', 'Well, leave at dawn.',
        'BOB', 'Understood.',
        'ALICE', 'The plan remains.',
        'BOB', 'Good.',
        'ALICE', 'No delays.',
        'BOB', 'Agreed.',
      ].join('\n');
      const result266d = await voicePass({ fountain: f266d, original: f266d, records: Array.from({ length: 2 }, (_, i) => ({ sceneIdx: i, slug: `SC${i}`, emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0, dialogueHighlights: [], revelation: null, relationshipShifts: [], seededClueIds: [], payoffSetupIds: [], unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing' })) as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(!result266d.issues.some((i: any) => i.rule === 'DIALOGUE_HEDGING_OPENER'), 'Should NOT fire when fewer than 25% of dialogue lines have hedging openers');
    });

    it('ABSTRACT_SUBJECT_OPENING fires when >30% of action lines begin with an abstract noun', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      const f266e = [
        'INT. ROOM - DAY', '',
        'Silence fills the space between them.',
        'Fear grips them both.',
        'Tension hangs over the table.',
        'She walks to the door.',
        'He picks up the letter.',
        'The clock reads three.',
        'She hesitates.',
        'He sits at the desk.',
      ].join('\n');
      const result266e = await voicePass({ fountain: f266e, original: f266e, records: Array.from({ length: 4 }, (_, i) => ({ sceneIdx: i, slug: `SC${i}`, emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0, dialogueHighlights: [], revelation: null, relationshipShifts: [], seededClueIds: [], payoffSetupIds: [], unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing' })) as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(result266e.issues.some((i: any) => i.rule === 'ABSTRACT_SUBJECT_OPENING'), `Expected ABSTRACT_SUBJECT_OPENING, got: ${JSON.stringify(result266e.issues.map((i: any) => i.rule))}`);
    });

    it('ABSTRACT_SUBJECT_OPENING does NOT fire when fewer than 30% of action lines begin with abstract subjects', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      const f266f = [
        'INT. ROOM - DAY', '',
        'She walks to the door.',
        'He picks up the letter.',
        'The clock reads three.',
        'Silence fills the room.',
        'She opens the window.',
        'He nods and turns away.',
        'The phone rings.',
        'She crosses to the chair.',
      ].join('\n');
      const result266f = await voicePass({ fountain: f266f, original: f266f, records: Array.from({ length: 4 }, (_, i) => ({ sceneIdx: i, slug: `SC${i}`, emotionalShift: 'neutral', suspenseDelta: 0, curiosityDelta: 0, clockRaised: false, clockDelta: 0, dialogueHighlights: [], revelation: null, relationshipShifts: [], seededClueIds: [], payoffSetupIds: [], unresolvedClues: [], purpose: 'development', dramaticTurn: 'nothing' })) as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(!result266f.issues.some((i: any) => i.rule === 'ABSTRACT_SUBJECT_OPENING'), 'Should NOT fire when fewer than 30% of action lines have abstract subjects');
    });
  });


  describe('Wave 252 — voicePass: present progressive overuse, action pronoun flood, dialogue monosyllable dominance', async () => {
    it('PRESENT_PROGRESSIVE_OVERUSE fires when >40% of action lines use progressive form', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      const f252a = [
        'INT. OFFICE - DAY', '',
        'She is walking to the door.',
        'He is looking out the window.',
        'She is talking on the phone.',
        'He is moving slowly across the room.',
        'She is watching him leave.',
        'He is running toward the exit.',
        'They are standing in silence.',
        'The clock ticks on the wall.',
      ].join('\n');
      const result = await voicePass({ fountain: f252a, original: f252a, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(result.issues.some((i: any) => i.rule === 'PRESENT_PROGRESSIVE_OVERUSE'), `Expected PRESENT_PROGRESSIVE_OVERUSE, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('PRESENT_PROGRESSIVE_OVERUSE does NOT fire when ≤40% of action lines are progressive', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      const f252b = [
        'INT. OFFICE - DAY', '',
        'She walks to the door.',
        'He looks out the window.',
        'She is talking on the phone.',
        'He moves quickly forward.',
        'She watches him leave.',
        'He runs to the exit.',
        'They stand in silence.',
        'The clock ticks.',
      ].join('\n');
      const result = await voicePass({ fountain: f252b, original: f252b, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(!result.issues.some((i: any) => i.rule === 'PRESENT_PROGRESSIVE_OVERUSE'), 'Should NOT fire when ≤40% progressive');
    });

    it('ACTION_PRONOUN_FLOOD fires when >55% of action lines start with a pronoun', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      const f252c = [
        'INT. ROOM - DAY', '',
        'He opens the door.',
        'She sits down across from him.',
        'They look at each other.',
        'He reaches for the phone.',
        'She turns away from the window.',
        'He checks the back exit.',
        'They leave together.',
        'It falls to the floor.',
      ].join('\n');
      const result = await voicePass({ fountain: f252c, original: f252c, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(result.issues.some((i: any) => i.rule === 'ACTION_PRONOUN_FLOOD'), `Expected ACTION_PRONOUN_FLOOD, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('ACTION_PRONOUN_FLOOD does NOT fire when ≤55% of action lines start with a pronoun', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      const f252d = [
        'INT. ROOM - DAY', '',
        'MARTINEZ opens the door.',
        'The phone rings twice.',
        'SARAH sits at the table.',
        'He checks the window.',
        'A clock ticks on the wall.',
        'JONES crosses the room.',
        'Morning light fills the space.',
        'DAVIS enters from the hallway.',
      ].join('\n');
      const result = await voicePass({ fountain: f252d, original: f252d, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(!result.issues.some((i: any) => i.rule === 'ACTION_PRONOUN_FLOOD'), 'Should NOT fire when ≤55% pronoun starters');
    });

    it('DIALOGUE_MONOSYLLABLE_DOMINANCE fires when >65% of dialogue words are monosyllabic', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      const f252e = [
        'INT. ROOM - DAY', '',
        'BOB', 'Go now. Do it.',
        'AMY', 'No, not yet.',
        'BOB', 'Why not? Go on.',
        'AMY', 'I can not go.',
        'BOB', 'Yes you can. Try.',
        'AMY', 'It is too bad.',
        'BOB', 'No way. Go.',
        'AMY', 'But why not?',
        'BOB', 'Run now. Go.',
        'AMY', 'OK. I go now.',
      ].join('\n');
      const result = await voicePass({ fountain: f252e, original: f252e, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(result.issues.some((i: any) => i.rule === 'DIALOGUE_MONOSYLLABLE_DOMINANCE'), `Expected DIALOGUE_MONOSYLLABLE_DOMINANCE, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`);
    });

    it('DIALOGUE_MONOSYLLABLE_DOMINANCE does NOT fire when dialogue has polysyllabic variety', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      const f252f = [
        'INT. ROOM - DAY', '',
        'ALICE', 'The investigation has revealed something extraordinary about the situation.',
        'BOB', 'Extraordinary is an understatement given the implications.',
        'ALICE', 'The photographs demonstrate the perpetrator was absolutely here.',
        'BOB', 'Completely unprecedented in my professional experience.',
        'ALICE', 'Understand the magnitude of what we have discovered together.',
        'BOB', 'Remarkable. The consequences will be catastrophic and permanent.',
        'ALICE', 'Precisely. We must proceed cautiously and methodically.',
        'BOB', 'Absolutely. The investigation continues regardless.',
        'ALICE', 'Authorization has been granted by the superintendent.',
        'BOB', 'Outstanding. We will proceed immediately with the examination.',
      ].join('\n');
      const result = await voicePass({ fountain: f252f, original: f252f, records: [] as any, structure: {} as any, annotations: [], approvedSpans: [] });
      assert.ok(!result.issues.some((i: any) => i.rule === 'DIALOGUE_MONOSYLLABLE_DOMINANCE'), 'Should NOT fire when dialogue has polysyllabic variety');
    });
  });


  describe('Wave 238 — voicePass: negation saturation, conditional overload, dialogue flat punctuation', async () => {
    it('NEGATION_SATURATION fires when >40% of dialogue lines contain negation words', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // 12 dialogue lines, 10 with negation words → 83%
      const f238a = [
        'INT. ROOM - DAY', '',
        'ALICE', "No, I won't do it.",
        'BOB', "You can't stop me.",
        'ALICE', "I don't think that's right.",
        'BOB', "It isn't even possible.",
        'ALICE', 'Nothing will change. Not tonight.',
        'BOB', "She can't be trusted. Nobody can.",
        'ALICE', "That isn't what I said.",
        'BOB', 'I wasn\'t there when it happened.',
        'ALICE', "It's not my fault.",
        'BOB', "Don't be absurd. Never.",
        'ALICE', "I'll be fine.",
        'BOB', 'Of course it matters.',
      ].join('\n');
      const result = await voicePass({
        fountain: f238a, original: f238a,
        records: [] as any, structure: {} as any,
        annotations: [], approvedSpans: [],
      });
      assert.ok(
        result.issues.some((i: any) => i.rule === 'NEGATION_SATURATION'),
        `Expected NEGATION_SATURATION, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`,
      );
    });

    it('NEGATION_SATURATION does NOT fire when ≤40% of dialogue lines have negation words', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // 10 dialogue lines, only 1 with negation → 10%
      const f238b = [
        'INT. ROOM - DAY', '',
        'ALICE', 'Tell me everything you know.',
        'BOB', 'It happened yesterday at noon.',
        'ALICE', 'Who was there with you.',
        'BOB', 'Just me and the others.',
        'ALICE', 'What did you see.',
        'BOB', 'I saw the whole thing clearly.',
        'ALICE', 'Good. Let us keep moving forward.',
        'BOB', "No, I can't do that.",
        'ALICE', 'Interesting. Go on.',
        'BOB', 'Right. As I was saying.',
      ].join('\n');
      const result = await voicePass({
        fountain: f238b, original: f238b,
        records: [] as any, structure: {} as any,
        annotations: [], approvedSpans: [],
      });
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'NEGATION_SATURATION'),
        'Should NOT fire when ≤40% of dialogue lines have negation words',
      );
    });

    it('CONDITIONAL_OVERLOAD fires when >30% of action lines contain conditionals', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // 10 action lines, 5 with conditional constructions → 50%
      const f238c = [
        'INT. ROOM - DAY', '',
        'If she moves, he will know.',
        'Alice waits by the door.',
        'If the signal drops, they lose contact.',
        'He checks the window latch.',
        'Unless she speaks now, it passes.',
        'The clock ticks.',
        'In case anyone calls, he was out.',
        'She reaches for the handle.',
        'If the lights cut, they are trapped.',
        'The floor creaks.',
      ].join('\n');
      const result = await voicePass({
        fountain: f238c, original: f238c,
        records: [] as any, structure: {} as any,
        annotations: [], approvedSpans: [],
      });
      assert.ok(
        result.issues.some((i: any) => i.rule === 'CONDITIONAL_OVERLOAD'),
        `Expected CONDITIONAL_OVERLOAD, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`,
      );
    });

    it('CONDITIONAL_OVERLOAD does NOT fire when ≤30% of action lines contain conditionals', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // 10 action lines, only 1 with conditional → 10%
      const f238d = [
        'INT. ROOM - DAY', '',
        'Alice stands by the window.',
        'The clock on the wall shows noon.',
        'She crosses to the table and sits.',
        'Bob enters from the hallway.',
        'If she moves, he notices.',
        'Alice checks the drawer.',
        'He takes a seat opposite her.',
        'The room is silent.',
        'She sets the folder down carefully.',
        'Bob opens his notebook.',
      ].join('\n');
      const result = await voicePass({
        fountain: f238d, original: f238d,
        records: [] as any, structure: {} as any,
        annotations: [], approvedSpans: [],
      });
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'CONDITIONAL_OVERLOAD'),
        'Should NOT fire when ≤30% of action lines have conditionals',
      );
    });

    it('DIALOGUE_FLAT_PUNCTUATION fires when >85% of dialogue lines end with a period and <5% are ? or !', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // 12 dialogue lines, all ending with period, none with ? or !
      const f238e = [
        'INT. ROOM - DAY', '',
        'ALICE', 'Tell me what happened.',
        'BOB', 'It started three days ago.',
        'ALICE', 'I see. Go on.',
        'BOB', 'We met at the warehouse.',
        'ALICE', 'That makes sense.',
        'BOB', 'He was already there.',
        'ALICE', 'Interesting. What next.',
        'BOB', 'We made the exchange.',
        'ALICE', 'Good. And then.',
        'BOB', 'He left immediately after.',
        'ALICE', 'Right. We know the rest.',
        'BOB', 'I think so.',
      ].join('\n');
      const result = await voicePass({
        fountain: f238e, original: f238e,
        records: [] as any, structure: {} as any,
        annotations: [], approvedSpans: [],
      });
      assert.ok(
        result.issues.some((i: any) => i.rule === 'DIALOGUE_FLAT_PUNCTUATION'),
        `Expected DIALOGUE_FLAT_PUNCTUATION, got: ${JSON.stringify(result.issues.map((i: any) => i.rule))}`,
      );
    });

    it('DIALOGUE_FLAT_PUNCTUATION does NOT fire when dialogue has question marks', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // 12 dialogue lines, 2 ending with ? → 16.7% question rate > 5%
      const f238f = [
        'INT. ROOM - DAY', '',
        'ALICE', 'Tell me what happened.',
        'BOB', 'It started three days ago.',
        'ALICE', 'What exactly did you see?',
        'BOB', 'We met at the warehouse.',
        'ALICE', 'And who was there?',
        'BOB', 'He was already there.',
        'ALICE', 'Good. And what then.',
        'BOB', 'We made the exchange.',
        'ALICE', 'Right. Understood.',
        'BOB', 'He left afterward.',
        'ALICE', 'Clear enough.',
        'BOB', 'I think so.',
      ].join('\n');
      const result = await voicePass({
        fountain: f238f, original: f238f,
        records: [] as any, structure: {} as any,
        annotations: [], approvedSpans: [],
      });
      assert.ok(
        !result.issues.some((i: any) => i.rule === 'DIALOGUE_FLAT_PUNCTUATION'),
        'Should NOT fire when dialogue includes question marks',
      );
    });
  });


  describe('Wave 202 — voicePass: question overload, speech tag inflation, mono-speaker dominance', async () => {
    const makeRec202 = (idx: number): any => ({
      commitId: `c${idx}`, sceneIdx: idx, slug: `INT. SC${idx} - DAY`,
      purpose: ['establish_world', 'introduce_conflict'][idx % 2],
      dramaticTurn: 'nothing', revelation: null,
      clockRaised: false, clockDelta: 0,
      emotionalShift: idx % 2 === 0 ? 'positive' : 'negative', suspenseDelta: 1,
      dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
      payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
    });
    const voiceInput202 = (fountain: string, n: number) => ({
      fountain, original: fountain,
      records: Array.from({ length: n }, (_, i) => makeRec202(i)) as any,
      structure: {} as any, annotations: [], approvedSpans: [],
    });

    // ── QUESTION_MARK_OVERLOAD ────────────────────────────────────────────────
    it('voicePass detects QUESTION_MARK_OVERLOAD when >35% of dialogue lines end with "?"', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // 12 dialogue lines, 6 questions (50% > 35%)
      const fountain = `INT. ROOM - DAY\n\nShe sits.\n\nALICE\nWhere have you been?\n\nBOB\nAround.\n\nALICE\nWhy didn't you call?\n\nBOB\nI was busy.\n\nALICE\nBusy with what?\n\nBOB\nWork.\n\nALICE\nAll night?\n\nBOB\nYes.\n\nALICE\nDo you think I'm stupid?\n\nBOB\nNo.\n\nALICE\nThen why are you lying?\n\nBOB\nI don't know what you want.\n`;
      const result = await voicePass(voiceInput202(fountain, 2));
      const qOverload = result.issues.filter(i => i.rule === 'QUESTION_MARK_OVERLOAD');
      assert.ok(qOverload.length >= 1, `Should detect QUESTION_MARK_OVERLOAD; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(qOverload[0].severity === 'minor');
    });

    it('voicePass does NOT fire QUESTION_MARK_OVERLOAD when questions are infrequent', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // 12 dialogue lines, 2 questions (17% < 35%)
      const fountain = `INT. ROOM - DAY\n\nShe sits.\n\nALICE\nWhere have you been?\n\nBOB\nI've been working late.\n\nALICE\nYou look tired.\n\nBOB\nI'm fine.\n\nALICE\nAre you sure?\n\nBOB\nYes. I'm positive.\n\nALICE\nOkay. I believe you.\n\nBOB\nThank you. I appreciate that.\n\nALICE\nLet's have dinner.\n\nBOB\nThat sounds good.\n\nALICE\nWe can talk then.\n\nBOB\nI'd like that.\n`;
      const result = await voicePass(voiceInput202(fountain, 2));
      assert.ok(
        !result.issues.some(i => i.rule === 'QUESTION_MARK_OVERLOAD'),
        'Should NOT fire when fewer than 35% of dialogue lines end with "?"',
      );
    });

    // ── SPEECH_TAG_INFLATION ──────────────────────────────────────────────────
    it('voicePass detects SPEECH_TAG_INFLATION when >20% of action lines contain speech-quality verbs', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // 12 action lines, 3 with speech tags (25% > 20%)
      const actions = [
        'The wall is cold and smooth.',
        'He growled something under his breath.',
        'Nothing moves in the corridor.',
        'She whispered his name into the dark.',
        'The door was stuck.',
        'He pulled hard on the handle.',
        'She hissed a warning from the doorway.',
        'A sound from below — footsteps.',
        'The stairwell was empty.',
        'Footsteps on the stairs.',
        'A hand on his arm.',
        'The door swings open.',
      ];
      const fountain = `INT. CORRIDOR - NIGHT\n\n${actions.join('\n')}\n`;
      const result = await voicePass(voiceInput202(fountain, 2));
      const tags = result.issues.filter(i => i.rule === 'SPEECH_TAG_INFLATION');
      assert.ok(tags.length >= 1, `Should detect SPEECH_TAG_INFLATION; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(tags[0].severity === 'minor');
    });

    it('voicePass does NOT fire SPEECH_TAG_INFLATION when action lines use physical verbs', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // 12 action lines, 0 speech tags
      const actions = [
        'The wall is cold and smooth.',
        'He checked the lock on the door.',
        'Nothing moves in the corridor.',
        'She moved to the far end.',
        'The door was stuck.',
        'He pulled hard on the handle.',
        'She held up one hand.',
        'A sound from below — footsteps.',
        'The stairwell was empty.',
        'Footsteps on the stairs.',
        'A hand on his arm.',
        'The door swings open.',
      ];
      const fountain = `INT. CORRIDOR - NIGHT\n\n${actions.join('\n')}\n`;
      const result = await voicePass(voiceInput202(fountain, 2));
      assert.ok(
        !result.issues.some(i => i.rule === 'SPEECH_TAG_INFLATION'),
        'Should NOT fire when action lines describe physical behavior rather than voice quality',
      );
    });

    // ── MONO_SPEAKER_DOMINANCE ────────────────────────────────────────────────
    it('voicePass detects MONO_SPEAKER_DOMINANCE when one character delivers >50% of all dialogue', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // MARCUS=12 lines, JENNY=2, TOM=3 → MARCUS=70.6% > 50%
      const fountain = [
        'INT. BOARDROOM - DAY\n\nThey gather.\n',
        'MARCUS\nWe need to address this situation now.\n\nMARCUS\nThe company has been losing money.\n',
        'MARCUS\nI have a plan to fix this.\n\nJENNY\nWhat kind of plan?\n',
        'MARCUS\nWe cut department budgets by thirty percent.\n\nMARCUS\nThen we restructure the senior team.\n',
        'MARCUS\nI spoke to the lawyers already.\n\nJENNY\nThat seems drastic.\n',
        'MARCUS\nIt is drastic. That is the point.\n\nMARCUS\nSometimes you must break things.\n',
        'MARCUS\nI have done this before.\n\nTOM\nIs this legal?\n',
        'MARCUS\nOf course it is legal.\n\nTOM\nAnd the staff?\n',
        'MARCUS\nThat is handled.\n\nTOM\nOkay.\n',
        'MARCUS\nGood. We move forward now.\n\nMARCUS\nI will send the plan tonight.\n',
      ].join('\n');
      const result = await voicePass(voiceInput202(fountain, 2));
      const mono = result.issues.filter(i => i.rule === 'MONO_SPEAKER_DOMINANCE');
      assert.ok(mono.length >= 1, `Should detect MONO_SPEAKER_DOMINANCE; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(mono[0].severity === 'minor');
    });

    it('voicePass does NOT fire MONO_SPEAKER_DOMINANCE when dialogue is distributed among speakers', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // ALICE=6, BOB=6, CAROL=5 → max=35% < 50%
      const fountain = [
        'INT. OFFICE - DAY\n\nThey sit.\n',
        'ALICE\nWe have a problem.\n\nBOB\nI know. I have seen the numbers.\n\nCAROL\nWhat are we going to do?\n',
        'ALICE\nWe need to meet with the client.\n\nBOB\nCan we do that by Friday?\n\nCAROL\nI can set it up.\n',
        'ALICE\nGood. Let me know when confirmed.\n\nBOB\nI will send the invites today.\n\nCAROL\nShould we bring the report?\n',
        'ALICE\nYes. All of it.\n\nBOB\nUnderstood.\n\nCAROL\nI will have everything ready.\n',
        'ALICE\nThank you both.\n\nBOB\nOf course.\n\nCAROL\nNo problem.\n',
        'ALICE\nLet us reconvene tomorrow.\n\nBOB\nDone.\n',
      ].join('\n');
      const result = await voicePass(voiceInput202(fountain, 2));
      assert.ok(
        !result.issues.some(i => i.rule === 'MONO_SPEAKER_DOMINANCE'),
        'Should NOT fire when no single character exceeds 50% of dialogue lines',
      );
    });
  });


  describe('Wave 160 — voicePass: passive action voice, interior monologue leak, qualifier overload', async () => {
    function makePassInput(fountain: string) {
      const records = Array.from({ length: 3 }, (_, i) => ({
        commitId: `c${i}`, sceneIdx: i, slug: `INT. SC${i} - DAY`,
        purpose: 'dialogue', dramaticTurn: 'nothing', revelation: null,
        clockRaised: false, clockDelta: 0, emotionalShift: 'neutral', suspenseDelta: 1,
        dialogueHighlights: [], unresolvedClues: [], seededClueIds: [],
        payoffSetupIds: [], visualBeats: [], relationshipShifts: [],
      }));
      return {
        fountain, original: fountain, records: records as any,
        structure: {} as any, annotations: [] as any, approvedSpans: [],
      };
    }

    it('voicePass detects PASSIVE_ACTION_VOICE when many action lines use passive constructions', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // 12 action lines, 3 use passive voice → 25% > 15% threshold
      const passiveLines = [
        'A sound is heard in the distance.',
        'The figure can be seen through the window.',
        'The weapon was found under the seat.',
      ].join('\n');
      const normalLines = Array.from({ length: 9 }, (_, i) => `She walks to the door ${i}.`).join('\n');
      const fountain = `INT. OFFICE - DAY\n\n${passiveLines}\n${normalLines}\n\nALICE\nHello.\n`;
      const result = await voicePass(makePassInput(fountain));
      const passive = result.issues.filter(i => i.rule === 'PASSIVE_ACTION_VOICE');
      assert.ok(passive.length >= 1, `Should detect PASSIVE_ACTION_VOICE; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(passive[0].severity === 'major');
    });

    it('voicePass does NOT fire PASSIVE_ACTION_VOICE when passive rate is below threshold', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      const activeLines = Array.from({ length: 12 }, (_, i) => `She crosses to the window ${i}.`).join('\n');
      const fountain = `INT. OFFICE - DAY\n\n${activeLines}\n\nALICE\nHello.\n`;
      const result = await voicePass(makePassInput(fountain));
      assert.ok(
        !result.issues.some(i => i.rule === 'PASSIVE_ACTION_VOICE'),
        'Should NOT fire when action lines use active voice',
      );
    });

    it('voicePass detects INTERIOR_MONOLOGUE_LEAK when action lines describe character thoughts', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      const fountain = [
        'INT. HALLWAY - DAY\n\n',
        'She wonders if this is the right choice.\n',
        'He realizes he has no way out.\n',
        'She remembers the last time they spoke.\n',
        'He walks to the door.\n',
        'She crosses to the window.\n',
        '\n',
        'ALICE\nHello.\n',
      ].join('');
      const result = await voicePass(makePassInput(fountain));
      const leak = result.issues.filter(i => i.rule === 'INTERIOR_MONOLOGUE_LEAK');
      assert.ok(leak.length >= 1, `Should detect INTERIOR_MONOLOGUE_LEAK; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(leak[0].severity === 'major');
    });

    it('voicePass does NOT fire INTERIOR_MONOLOGUE_LEAK when action lines describe behavior', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      const fountain = [
        'INT. HALLWAY - DAY\n\n',
        'She pauses at the door.\n',
        'He grips the railing.\n',
        'She stares at the window.\n',
        'He turns slowly.\n',
        'She crosses to the table.\n',
      ].join('');
      const result = await voicePass(makePassInput(fountain));
      assert.ok(
        !result.issues.some(i => i.rule === 'INTERIOR_MONOLOGUE_LEAK'),
        'Should NOT fire when action lines describe visible behavior',
      );
    });

    it('voicePass detects QUALIFIER_OVERLOAD when >25% of action lines use hedging qualifiers', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      // 10 action lines, 3 use qualifiers → 30% > 25% threshold
      const qualifiedLines = [
        'She seems nervous about the meeting.',
        'He appears to be uncomfortable.',
        'Perhaps she should leave.',
      ].join('\n');
      const normalLines = Array.from({ length: 7 }, (_, i) => `She steps into the room ${i}.`).join('\n');
      const fountain = `INT. OFFICE - DAY\n\n${qualifiedLines}\n${normalLines}\n\nALICE\nHello.\n`;
      const result = await voicePass(makePassInput(fountain));
      const qualifier = result.issues.filter(i => i.rule === 'QUALIFIER_OVERLOAD');
      assert.ok(qualifier.length >= 1, `Should detect QUALIFIER_OVERLOAD; got: ${result.issues.map(i => i.rule).join(', ')}`);
      assert.ok(qualifier[0].severity === 'minor');
    });

    it('voicePass does NOT fire QUALIFIER_OVERLOAD when action lines are declarative', async () => {
      const { voicePass } = await import('../../server/nvm/revision/passes/voice.ts');
      const declarativeLines = Array.from({ length: 10 }, (_, i) => `She walks directly to position ${i}.`).join('\n');
      const fountain = `INT. OFFICE - DAY\n\n${declarativeLines}\n\nALICE\nHello.\n`;
      const result = await voicePass(makePassInput(fountain));
      assert.ok(
        !result.issues.some(i => i.rule === 'QUALIFIER_OVERLOAD'),
        'Should NOT fire when action lines are declarative',
      );
    });
  });


describe('Wave 123 — voicePass: bidirectional TONE_REGISTER_MISMATCH', () => {
  it('fires for grim prose in a positive-shift scene', async () => {
    const fountain = `INT. BRIGHT MORNING - DAY

Blood and death everywhere. The brutal murder was savage and grim. Bleak corpse dying in agony.

ALICE
Good morning!

INT. SECOND SCENE - DAY

Normal action lines here.

BOB
Hello there.

INT. THIRD SCENE - DAY

More action here to pad out the scene.

CAROL
Hi.
`;
    const records: import('../../server/nvm/screenplay/memory.ts').ScreenplaySceneRecord[] = [
      {
        commitId: 'c0', sceneIdx: 0, slug: 'INT. BRIGHT MORNING - DAY',
        purpose: 'establish_world', dramaticTurn: 'intro', revelation: null,
        emotionalShift: 'positive', visualBeats: [], dialogueHighlights: [],
        unresolvedClues: [], seededClueIds: [], payoffSetupIds: [],
        clockRaised: false, clockDelta: 0, suspenseDelta: 1, curiosityDelta: 0, createdAt: 0,
      },
      {
        commitId: 'c1', sceneIdx: 1, slug: 'INT. SECOND SCENE - DAY',
        purpose: 'establish_world', dramaticTurn: 'mid', revelation: null,
        emotionalShift: 'neutral', visualBeats: [], dialogueHighlights: [],
        unresolvedClues: [], seededClueIds: [], payoffSetupIds: [],
        clockRaised: false, clockDelta: 0, suspenseDelta: 0, curiosityDelta: 0, createdAt: 0,
      },
      {
        commitId: 'c2', sceneIdx: 2, slug: 'INT. THIRD SCENE - DAY',
        purpose: 'establish_world', dramaticTurn: 'end', revelation: null,
        emotionalShift: 'neutral', visualBeats: [], dialogueHighlights: [],
        unresolvedClues: [], seededClueIds: [], payoffSetupIds: [],
        clockRaised: false, clockDelta: 0, suspenseDelta: 0, curiosityDelta: 0, createdAt: 0,
      },
    ];
    const result = await voicePass({ ...makePassInput(fountain), records, structure: makeStructureForRevision() });
    const mismatch = result.issues.find(i => i.rule === 'TONE_REGISTER_MISMATCH');
    assert.ok(mismatch, 'TONE_REGISTER_MISMATCH fires for grim prose in a positive-shift scene');
  });
});


// ── Wave 138: voice distinctiveness + character arc relational stasis ──────────

describe('Wave 138 — voicePass: UNDIFFERENTIATED_CHARACTER_VOICES', () => {
  it('UNDIFFERENTIATED_CHARACTER_VOICES fires when two major characters share >75% vocabulary', async () => {
    // Both ALICE and BOB use nearly identical vocabulary across many scenes
    const aliceLines = Array.from({ length: 6 }, () =>
      'ALICE\nRight well basically situation problem understand trust honestly concern really explain perspective.\n'
    ).join('\n\n');
    const bobLines = Array.from({ length: 6 }, () =>
      'BOB\nRight well basically situation problem understand trust honestly concern really explain perspective.\n'
    ).join('\n\n');
    const fountain = `INT. ROOM - DAY\n\nScene.\n\n${aliceLines}\n\n${bobLines}`;
    const result = await voicePass(makePassInput(fountain));
    assert.ok(
      result.issues.some(i => i.rule === 'UNDIFFERENTIATED_CHARACTER_VOICES'),
      `UNDIFFERENTIATED_CHARACTER_VOICES should fire; got: ${result.issues.map(i => i.rule).join(', ')}`,
    );
  });

  it('UNDIFFERENTIATED_CHARACTER_VOICES does NOT fire when characters have distinct vocabularies', async () => {
    const aliceLines = Array.from({ length: 6 }, () =>
      'ALICE\nStatistically probability coefficient deviation analysis quantitative systematic empirical baseline.\n'
    ).join('\n\n');
    const bobLines = Array.from({ length: 6 }, () =>
      'BOB\nKill run grab smash punch door gun knife blood fight sprint push crash break.\n'
    ).join('\n\n');
    const fountain = `INT. LAB - DAY\n\nScene starts.\n\n${aliceLines}\n\n${bobLines}`;
    const result = await voicePass(makePassInput(fountain));
    assert.ok(
      !result.issues.some(i => i.rule === 'UNDIFFERENTIATED_CHARACTER_VOICES'),
      `should not fire for characters with distinct vocabularies`,
    );
  });
});


describe('Wave 138 — voicePass: VOICE_MONOTONE_CHARACTER', () => {
  it('VOICE_MONOTONE_CHARACTER fires when a character speaks in uniformly-sized lines', async () => {
    // ALICE uses varied vocabulary but consistent line length (8-9 words each) — CV near 0
    const varied = [
      'ALICE\nRight then perhaps should probably check this carefully.\n',
      'ALICE\nWait there maybe something wrong could happen today.\n',
      'ALICE\nListen carefully because situation matters quite seriously right.\n',
      'ALICE\nThink about whether problem requires immediate urgent attention.\n',
      'ALICE\nSomething strange happened before which seemed quite important.\n',
      'ALICE\nDoor opened slowly revealing something inside quite unexpected.\n',
      'ALICE\nAlways remember what happened last time carefully always.\n',
      'ALICE\nNothing strange about feeling worried concerned hesitant today.\n',
      'ALICE\nMaybe later things better seem become clearer eventually.\n',
      'ALICE\nDone finished completed absolutely positively completely finally.\n',
      'ALICE\nKind gentle person would surely handle carefully gently.\n',
      'ALICE\nNever ever forget remember always constantly ceaselessly forever.\n',
    ].join('\n\n');
    const fountain = `INT. ROOM - DAY\n\nSomething happens.\n\n${varied}`;
    const result = await voicePass(makePassInput(fountain));
    assert.ok(
      result.issues.some(i => i.rule === 'VOICE_MONOTONE_CHARACTER'),
      `VOICE_MONOTONE_CHARACTER should fire; got: ${result.issues.map(i => i.rule).join(', ')}`,
    );
  });

  it('VOICE_MONOTONE_CHARACTER does NOT fire when a character varies their sentence lengths', async () => {
    const varied = [
      'ALICE\nNo.\n',
      'ALICE\nI told you already.\n',
      'ALICE\nAbsolutely not and if you ask me one more time I am walking out that door forever.\n',
      'ALICE\nWait.\n',
      'ALICE\nListen to me carefully because I will only say this once and I need you to understand.\n',
      'ALICE\nStop.\n',
      'ALICE\nYou have no idea what this costs.\n',
      'ALICE\nFine.\n',
      'ALICE\nThen we are done here and there is nothing left to discuss on any level whatsoever.\n',
      'ALICE\nGo.\n',
      'ALICE\nI mean it.\n',
      'ALICE\nThere is still time to fix everything if we act right now before the whole thing falls apart.\n',
    ].join('\n\n');
    const fountain = `INT. OFFICE - DAY\n\nSomething happens.\n\n${varied}`;
    const result = await voicePass(makePassInput(fountain));
    assert.ok(
      !result.issues.some(i => i.rule === 'VOICE_MONOTONE_CHARACTER'),
      `varied line lengths should not trigger monotone rule`,
    );
  });
});